"""
Guardian and Authorized Member Relationship Router
Allows Canevyn blind users to view, approve, and manage connections.
Allows Authorized Members to search unique CaneVyn User IDs and request connections.
Enforces strict privacy: Unapproved/pending requests CANNOT access location, battery, or alerts.
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Optional
import uuid
from backend.app.database import get_db
from backend.app.services.ws_manager import ws_hub
from backend.app.models.schemas import (
    GuardianRelationshipResponse,
    UserSearchRequest,
    UserSearchResponse,
    ConnectionRequestCreate,
    ConnectionRequestResponse,
    ConnectionActionRequest,
    ConnectionCancelRequest,
    MemberSearchRequest,
    MemberSearchResponse,
    SendRequestToMemberCreate,
    MemberIncomingRequestResponse,
    RevokeConnectionRequest
)
from backend.app.services.auth_service import get_current_user

router = APIRouter(prefix="/guardians", tags=["Guardians & Authorized Members"])

@router.post("/search-user", response_model=UserSearchResponse)
def search_canevyn_user_by_id(
    payload: UserSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Deprecated: Authorized Members cannot initiate connection requests to Blind Users.
    In CaneVyn, connection requests are initiated strictly by Blind Users using the Authorized Member's CVM- ID.
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Authorized Members cannot search for Blind Users to initiate connections. In CaneVyn, connection requests must be initiated by Blind Users using the Authorized Member's CVM- ID."
    )

@router.post("/request-connection")
def request_user_connection(
    payload: ConnectionRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Deprecated: Authorized Members cannot initiate connection requests to Blind Users.
    In CaneVyn, connection requests are initiated strictly by Blind Users using the Authorized Member's CVM- ID.
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Authorized Members cannot initiate connection requests. In CaneVyn, connection requests must be initiated by Blind Users using the Authorized Member's CVM- ID."
    )

@router.post("/cancel-request")
def cancel_connection_request(
    payload: ConnectionCancelRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Deprecated: Authorized Members cannot initiate or cancel outgoing requests.
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Authorized Members cannot cancel requests because connection requests cannot be initiated by Authorized Members."
    )

@router.get("/my-requests", response_model=List[ConnectionRequestResponse])
def get_authorized_member_requests(current_user: dict = Depends(get_current_user)):
    """
    Returns an empty list for legacy callers; Authorized Members review incoming requests via /member-incoming-requests.
    """
    if current_user["role"] != "authorized_member":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Authorized Members can query member requests."
        )
    return []

@router.get("/pending-requests", response_model=List[ConnectionRequestResponse])
def get_blind_user_pending_requests(current_user: dict = Depends(get_current_user)):
    """
    Returns an empty list for legacy callers; Blind Users view connections via /guardians/list.
    """
    if current_user["role"] != "canevyn_user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only CaneVyn Users can review connections."
        )
    return []

@router.post("/respond-request")
def respond_to_connection_request(
    payload: ConnectionActionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Deprecated: Blind Users do not respond to connection requests.
    In CaneVyn, connection requests are initiated by Blind Users and responded to by Authorized Members via /member-respond-request.
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Blind Users cannot respond to connection requests. In CaneVyn, connection requests are initiated by Blind Users and accepted or rejected by Authorized Members via /guardians/member-respond-request."
    )

@router.get("/list", response_model=List[GuardianRelationshipResponse])
def get_user_guardians(active_only: bool = False, current_user: dict = Depends(get_current_user)):
    """
    Returns authorized members / guardian connections belonging to the currently signed-in Canevyn User
    directly from SQLite. Verifies target accounts exist with role = 'authorized_member'.
    When active_only=True, strictly filters status = 'approved' AND is_active = 1.
    """
    if current_user["role"] != "canevyn_user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only CaneVyn Users can view their guardian list."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        active_clause = "AND r.status = 'approved' AND r.is_active = 1" if active_only else ""
        cursor.execute(f"""
        SELECT r.*, u.full_name as guardian_name, u.phone_number as guardian_phone,
               u.canevyn_id as guardian_canevyn_id
        FROM guardian_relationships r
        JOIN users u ON r.guardian_user_id = u.id
        WHERE r.canevyn_user_id = ?
          AND u.role = 'authorized_member'
          {active_clause}
        ORDER BY (r.status = 'pending') DESC, (r.status = 'approved') DESC, r.created_at DESC;
        """, (current_user["id"],))
        rows = cursor.fetchall()
        return [
            GuardianRelationshipResponse(
                id=r["id"],
                canevyn_user_id=r["canevyn_user_id"],
                guardian_user_id=r["guardian_user_id"],
                guardian_canevyn_id=r["guardian_canevyn_id"],
                guardian_name=r["guardian_name"],
                guardian_phone=r["guardian_phone"],
                relationship_label=r["relationship_label"],
                is_primary=bool(r["is_primary"]),
                can_receive_sos=bool(r["can_receive_sos"]),
                can_view_live_location=bool(r["can_view_live_location"]),
                can_view_telemetry=bool(r["can_view_telemetry"]),
                is_active=bool(r["is_active"]),
                status=r["status"] if "status" in r.keys() else "approved",
                created_at=str(r["created_at"]) if "created_at" in r.keys() else None
            )
            for r in rows
        ]

@router.get("/monitored-users")
def get_monitored_users_for_guardian(current_user: dict = Depends(get_current_user)):
    """
    Called by an Authorized Member to get the list of Canevyn users they are permitted to monitor.
    STRICT PRIVACY ENFORCEMENT:
    - ONLY returns users where relationship status is 'approved' AND is_active is 1.
    - Never auto-exposes unapproved blind users.
    - If none approved, returns an empty list ([]).
    """
    if current_user["role"] != "authorized_member":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Authorized Members can view monitored users."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT r.id as relationship_id, r.canevyn_user_id as internal_user_id,
               COALESCE(u.canevyn_id, u.id) as canevyn_user_id,
               u.id as user_id,
               r.relationship_label, r.is_primary,
               r.can_receive_sos, r.can_view_live_location, r.can_view_telemetry, r.status,
               u.full_name as user_name, u.full_name, u.phone_number as user_phone, u.avatar_url,
               u.location_sharing_enabled, u.last_location_at,
               CASE WHEN COALESCE(d.is_connected, 0) = 1 THEN d.battery_percent ELSE NULL END as battery_percent,
               COALESCE(d.is_connected, 0) as is_connected,
               CASE WHEN COALESCE(d.is_connected, 0) = 1 THEN 1 ELSE 0 END as is_hardware_integrated,
               d.model as device_model, d.id as device_id
        FROM guardian_relationships r
        JOIN users u ON r.canevyn_user_id = u.id
        LEFT JOIN devices d ON u.id = d.assigned_user_id
        WHERE r.guardian_user_id = ? AND r.is_active = 1 AND r.status = 'approved';
        """, (current_user["id"],))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

# ============================================================================
# NEW INVERTED WORKFLOW: Blind User Initiates -> Authorized Member Responds
# ============================================================================

@router.post("/search-member", response_model=MemberSearchResponse)
def search_authorized_member_by_id(
    payload: MemberSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Called by a CaneVyn Blind User to search for an Authorized Member by their CVM-XXXXX ID.
    CRITICAL PRIVACY RULE:
    - Never returns a list or autocomplete suggestions.
    - Only returns the member's name if the exact ID matches a registered Authorized Member.
    - Never exposes personal details before approval.
    """
    if current_user["role"] != "canevyn_user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only CaneVyn Users can search for Authorized Members."
        )

    search_id = payload.member_id.strip()
    if not search_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an Authorized Member ID (e.g. CVM-12345)."
        )

    if search_id.upper().startswith("CVN-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID: CVN IDs belong to Blind Users. Please enter an Authorized Member ID starting with CVM- (e.g. CVM-12345)."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, full_name, role, canevyn_id FROM users
        WHERE UPPER(COALESCE(canevyn_id, '')) = UPPER(?) OR id = ?;
        """, (search_id, search_id))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No Authorized Member found. Please check the ID."
            )

        if row["role"] != "authorized_member" or not (row["canevyn_id"] or "").upper().startswith("CVM-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The provided ID belongs to a CaneVyn Blind User (CVN), not an Authorized Member. Authorized Member IDs start with CVM-."
            )

        # Check existing connection status between this blind traveler and this guardian
        cursor.execute("""
        SELECT status FROM guardian_relationships
        WHERE canevyn_user_id = ? AND guardian_user_id = ?;
        """, (current_user["id"], row["id"]))
        rel = cursor.fetchone()
        conn_status = rel["status"] if rel else None

        return MemberSearchResponse(
            member_id=row["canevyn_id"] or row["id"],
            full_name=row["full_name"],
            connection_status=conn_status
        )

@router.post("/send-request-to-member")
def send_request_to_authorized_member(
    payload: SendRequestToMemberCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Called by a CaneVyn Blind User to send a connection request to an Authorized Member.
    State starts as 'pending'. The Authorized Member must accept before any data is accessible.
    """
    if current_user["role"] != "canevyn_user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only CaneVyn Users can initiate requests to Authorized Members."
        )

    target_query = payload.member_id.strip()
    if not target_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an Authorized Member ID."
        )

    if target_query.upper().startswith("CVN-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID: CVN IDs belong to Blind Users. Connection requests can only be sent to Authorized Members with a CVM- ID."
        )

    with get_db() as conn:
        cursor = conn.cursor()

        # Verify target user exists and is an Authorized Member with a CVM- ID
        cursor.execute("""
        SELECT id, full_name, role, canevyn_id FROM users
        WHERE UPPER(COALESCE(canevyn_id, '')) = UPPER(?) OR id = ?;
        """, (target_query, target_query))
        member = cursor.fetchone()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No Authorized Member found. Please check the ID."
            )

        if member["role"] != "authorized_member" or not (member["canevyn_id"] or "").upper().startswith("CVM-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The requested ID belongs to a Blind User, not an Authorized Member. Connection requests must target an Authorized Member with a CVM- ID."
            )

        member_id = member["id"]

        if current_user["id"] == member_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot send a connection request to your own account."
            )

        # Prevent duplicate requests
        cursor.execute("""
        SELECT id, status FROM guardian_relationships
        WHERE canevyn_user_id = ? AND guardian_user_id = ?;
        """, (current_user["id"], member_id))
        existing = cursor.fetchone()

        if existing:
            if existing["status"] == "pending":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"A connection request is already pending for {member['full_name']}."
                )
            elif existing["status"] == "approved":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You are already connected with {member['full_name']}."
                )
            else:
                # Re-request if previously rejected
                cursor.execute("""
                UPDATE guardian_relationships
                SET status = 'pending', is_active = 0, relationship_label = ?,
                    can_receive_sos = 0, can_view_live_location = 0, can_view_telemetry = 0,
                    created_at = CURRENT_TIMESTAMP
                WHERE id = ?;
                """, (payload.relationship_label or "Family / Caregiver", existing["id"]))
                rel_id = existing["id"]
        else:
            rel_id = f"rel-{uuid.uuid4().hex[:10]}"
            cursor.execute("""
            INSERT INTO guardian_relationships (
                id, canevyn_user_id, guardian_user_id, relationship_label,
                is_primary, can_receive_sos, can_view_live_location, can_view_telemetry,
                is_active, status
            ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 'pending');
            """, (
                rel_id,
                current_user["id"],
                member_id,
                payload.relationship_label or "Family / Caregiver"
            ))

        # Notify the Authorized Member
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        blind_cid = current_user.get("canevyn_id") or "CaneVyn Traveler"
        cursor.execute("""
        INSERT INTO notifications (
            id, user_id, category, title, subtitle, body, spoken_narration, badge_text, is_read
        ) VALUES (?, ?, 'guardian', 'New Connection Request',
            ?,
            ?,
            ?,
            'Request', 0);
        """, (
            notif_id,
            member_id,
            f"{current_user['full_name']} ({blind_cid}) sent a connection request",
            f"{current_user['full_name']} wants to link with you as their Authorized Member. Accept to monitor safety and location.",
            f"You received a connection request from {current_user['full_name']}. Review in Connection Requests."
        ))

    return {
        "status": "success",
        "relationship_id": rel_id,
        "member_name": member["full_name"],
        "message": f"Connection request sent to {member['full_name']}. Awaiting their approval."
    }

@router.get("/member-incoming-requests", response_model=List[MemberIncomingRequestResponse])
def get_member_incoming_requests(current_user: dict = Depends(get_current_user)):
    """
    Called by an Authorized Member to view all pending connection requests sent by CaneVyn Blind Users.
    """
    if current_user["role"] != "authorized_member":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Authorized Members can review incoming requests."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT r.id as relationship_id, r.canevyn_user_id, u.full_name as blind_user_name,
               COALESCE(u.canevyn_id, u.id) as blind_user_canevyn_id,
               r.relationship_label, r.status, r.created_at
        FROM guardian_relationships r
        JOIN users u ON r.canevyn_user_id = u.id
        WHERE r.guardian_user_id = ? AND r.status = 'pending'
        ORDER BY r.created_at DESC;
        """, (current_user["id"],))
        rows = cursor.fetchall()
        return [
            MemberIncomingRequestResponse(
                relationship_id=r["relationship_id"],
                blind_user_id=r["canevyn_user_id"],
                blind_user_name=r["blind_user_name"],
                blind_user_canevyn_id=r["blind_user_canevyn_id"],
                relationship_label=r["relationship_label"],
                status=r["status"],
                created_at=str(r["created_at"])
            )
            for r in rows
        ]

@router.post("/member-respond-request")
def member_respond_to_request(
    payload: ConnectionActionRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Called by an Authorized Member to Accept or Reject an incoming connection request from a Blind User.
    Accepting enables permissions (live location, battery, alerts, telemetry).
    Creates a SQLite notification and pushes a live WebSocket event to the Blind User.
    """
    if current_user["role"] != "authorized_member":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Authorized Members can respond to connection requests."
        )

    if payload.action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be either 'approve' or 'reject'."
        )

    with get_db() as conn:
        cursor = conn.cursor()

        # Check if the relationship exists
        cursor.execute("""
        SELECT r.*, u.full_name as blind_user_name, u.canevyn_id as blind_user_cid
        FROM guardian_relationships r
        JOIN users u ON r.canevyn_user_id = u.id
        WHERE r.id = ?;
        """, (payload.relationship_id,))
        rel = cursor.fetchone()

        if not rel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection request not found."
            )

        # Enforce that only the intended Authorized Member can respond
        if rel["guardian_user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are not authorized to respond to another user's connection request."
            )

        if rel["status"] != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot respond: connection request is already {rel['status']}."
            )

        new_status = "approved" if payload.action == "approve" else "rejected"
        is_active = 1 if payload.action == "approve" else 0
        perms = 1 if payload.action == "approve" else 0

        cursor.execute("""
        UPDATE guardian_relationships
        SET status = ?, is_active = ?, can_receive_sos = ?, can_view_live_location = ?, can_view_telemetry = ?
        WHERE id = ?;
        """, (new_status, is_active, perms, perms, perms, payload.relationship_id))

        # Notify the Blind User with exact status message stored in SQLite
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        member_name = current_user["full_name"]
        title = "Connection Accepted" if payload.action == "approve" else "Connection Rejected"
        status_label = "Accepted" if payload.action == "approve" else "Rejected"
        spoken = (
            f"Your connection request has been accepted by {member_name}."
            if payload.action == "approve" else
            f"Your connection request was rejected by {member_name}."
        )
        cursor.execute("""
        INSERT INTO notifications (
            id, user_id, category, title, subtitle, body, spoken_narration, badge_text, is_read
        ) VALUES (?, ?, 'guardian', ?, ?, ?, ?, ?, 0);
        """, (
            notif_id,
            rel["canevyn_user_id"],
            title,
            f"Response from {member_name}",
            spoken,
            spoken,
            status_label
        ))

    # Push live status update to the Blind User's active WebSocket session
    background_tasks.add_task(
        ws_hub.send_to_user,
        rel["canevyn_user_id"],
        {
            "type": "CONNECTION_STATUS_UPDATE",
            "data": {
                "notification_id": notif_id,
                "relationship_id": payload.relationship_id,
                "guardian_user_id": current_user["id"],
                "guardian_name": member_name,
                "guardian_canevyn_id": current_user.get("canevyn_id"),
                "status": new_status,
                "status_label": status_label,
                "message": spoken
            }
        }
    )

    return {
        "status": "success",
        "action": payload.action,
        "new_status": new_status,
        "notification_id": notif_id,
        "blind_user_name": rel["blind_user_name"],
        "message": f"Connection request {new_status} successfully."
    }

@router.post("/revoke-connection")
def revoke_guardian_connection(
    payload: RevokeConnectionRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Called by a CaneVyn Blind User to revoke an approved or pending connection with an Authorized Member.
    Revokes location, battery, alerts, and telemetry permissions immediately and notifies active caregiver sessions.
    """
    if current_user["role"] != "canevyn_user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only CaneVyn Users can revoke connections."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT r.*, g.full_name as guardian_name
        FROM guardian_relationships r
        JOIN users g ON r.guardian_user_id = g.id
        WHERE r.id = ? AND r.canevyn_user_id = ?;
        """, (payload.relationship_id, current_user["id"]))
        rel = cursor.fetchone()

        if not rel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection record not found."
            )

        guardian_name = rel["guardian_name"]
        guardian_id = rel["guardian_user_id"]

        # Revoke relationship
        cursor.execute("""
        UPDATE guardian_relationships
        SET status = 'rejected', is_active = 0, can_receive_sos = 0, can_view_live_location = 0, can_view_telemetry = 0
        WHERE id = ?;
        """, (payload.relationship_id,))

        # Notify the guardian that access was revoked
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        cursor.execute("""
        INSERT INTO notifications (
            id, user_id, category, title, subtitle, body, spoken_narration, badge_text
        ) VALUES (?, ?, 'guardian', 'Connection Revoked',
            ?,
            ?,
            ?,
            'Revoked');
        """, (
            notif_id,
            guardian_id,
            f"Access revoked by {current_user['full_name']}",
            f"{current_user['full_name']} has revoked connection access.",
            f"{current_user['full_name']} has revoked connection access.",
        ))

    # Push real-time revocation so open Authorized Member dashboard immediately removes user and clears map
    background_tasks.add_task(
        ws_hub.send_to_user,
        guardian_id,
        {
            "type": "CONNECTION_REVOKED",
            "data": {
                "relationship_id": payload.relationship_id,
                "canevyn_user_id": current_user["id"],
                "canevyn_user_canevyn_id": current_user.get("canevyn_id"),
                "canevyn_user_name": current_user["full_name"],
                "message": f"{current_user['full_name']} has revoked connection access."
            }
        }
    )

    return {
        "status": "success",
        "message": f"Connection with {guardian_name} has been revoked."
    }


@router.post("/remove-connection")
def remove_guardian_connection(
    payload: RevokeConnectionRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Called by an Authorized Member to remove their connection with a Blind User.
    Deactivates permissions immediately without deleting the Blind User account, CVN- ID,
    or personal history, and creates a persistent + real-time notification for that Blind User.
    """
    if current_user["role"] != "authorized_member":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Authorized Members can remove connections from this screen."
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT r.*, u.full_name as blind_user_name, u.canevyn_id as blind_user_canevyn_id
        FROM guardian_relationships r
        JOIN users u ON r.canevyn_user_id = u.id
        WHERE r.id = ? AND r.guardian_user_id = ?;
        """, (payload.relationship_id, current_user["id"]))
        rel = cursor.fetchone()

        if not rel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection record not found."
            )

        blind_user_id = rel["canevyn_user_id"]
        blind_user_name = rel["blind_user_name"]
        member_name = current_user["full_name"]
        spoken_msg = (
            f"Your connection with {member_name} has been removed. "
            "They can no longer access your live location."
        )

        cursor.execute("""
        UPDATE guardian_relationships
        SET status = 'rejected', is_active = 0, can_receive_sos = 0, can_view_live_location = 0, can_view_telemetry = 0
        WHERE id = ? AND guardian_user_id = ?;
        """, (payload.relationship_id, current_user["id"]))

        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        cursor.execute("""
        INSERT INTO notifications (
            id, user_id, category, title, subtitle, body, spoken_narration, badge_text, is_read
        ) VALUES (?, ?, 'guardian', 'Connection Removed', ?, ?, ?, 'Connection Removed', 0);
        """, (
            notif_id,
            blind_user_id,
            f"Removed by {member_name}",
            spoken_msg,
            spoken_msg,
        ))

    background_tasks.add_task(
        ws_hub.send_to_user,
        blind_user_id,
        {
            "type": "CONNECTION_REMOVED_BY_MEMBER",
            "data": {
                "notification_id": notif_id,
                "relationship_id": payload.relationship_id,
                "guardian_user_id": current_user["id"],
                "guardian_name": member_name,
                "guardian_canevyn_id": current_user.get("canevyn_id"),
                "canevyn_user_id": blind_user_id,
                "message": spoken_msg
            }
        }
    )

    return {
        "status": "success",
        "message": f"Connection with {blind_user_name} has been removed.",
        "relationship_id": payload.relationship_id,
        "blind_user_id": blind_user_id,
        "notification_id": notif_id
    }
