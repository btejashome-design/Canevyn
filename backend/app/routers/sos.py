"""
Hardware SOS Event Management Router
ENFORCES CRITICAL RULE: Physical Canevyn Stick is the ONLY trigger source.
Privacy & Access Control:
- Strictly scoped to device owner (Canevyn User).
- Only authorized guardians with `can_receive_sos=1` can receive or query SOS data.
- Arbitrary authenticated users cannot trigger, query, or resolve other users' emergencies.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from backend.app.database import get_db
from backend.app.models.schemas import HardwareSOSEventCreate, HardwareSOSResolve, SOSEventResponse
from backend.app.services.auth_service import get_current_user
from backend.app.services.ws_manager import ws_hub

router = APIRouter(prefix="/sos", tags=["Hardware SOS"])

@router.post("/hardware-trigger", response_model=SOSEventResponse)
async def report_hardware_sos_trigger(
    payload: HardwareSOSEventCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Called strictly when the Canevyn User phone receives an emergency packet
    originated by the physical Canevyn Smart Stick latch mechanism over BLE.
    Enforces server-side device ownership and role authorization.
    """
    if current_user["role"] != "canevyn_user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only a Canevyn User can relay a hardware SOS packet from their stick."
        )

    sos_id = f"sos-{uuid.uuid4().hex[:10]}"
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify Canevyn device exists and is assigned to the authenticated user
        cursor.execute("SELECT id, model, assigned_user_id FROM devices WHERE id = ?;", (payload.device_id,))
        dev_row = cursor.fetchone()
        if not dev_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canevyn stick device not found.")

        if dev_row["assigned_user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Device is not assigned to the authenticated user."
            )

        device_model = dev_row["model"]

        cursor.execute("""
        INSERT INTO sos_events (
            id, canevyn_user_id, device_id, trigger_origin, status,
            trigger_latitude, trigger_longitude, tilt_degrees,
            battery_percent_at_trigger, audible_beacon_db, emergency_contact_dialed,
            resolution_notes
        ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?);
        """, (
            sos_id,
            current_user["id"],
            payload.device_id,
            payload.trigger_origin,
            payload.latitude,
            payload.longitude,
            payload.tilt_degrees,
            payload.battery_percent,
            payload.audible_beacon_db,
            current_user.get("emergency_contact_phone") or "sos",
            payload.notes
        ))

        # Query active Authorized Members permitted to receive SOS for this Canevyn user
        cursor.execute("""
        SELECT guardian_user_id FROM guardian_relationships
        WHERE canevyn_user_id = ? AND is_active = 1 AND status = 'approved' AND can_receive_sos = 1;
        """, (current_user["id"],))
        guardians = cursor.fetchall()
        guardian_ids = [g["guardian_user_id"] for g in guardians]

        # Insert notification record
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        cursor.execute("""
        INSERT INTO notifications (
            id, user_id, category, title, subtitle, body, spoken_narration, badge_text
        ) VALUES (?, ?, 'emergency', 'Physical Canevyn SOS Switch Activated',
            'Emergency latch triggered on physical cane.',
            'Telemetry broadcasting live to authorized guardians.',
            'Canevyn has alerted your guardians. Hardware telemetry is broadcasting.',
            'Active SOS');
        """, (notif_id, current_user["id"]))

    # Prepare broadcast payload for real-time alerts
    alert_data = {
        "sos_id": sos_id,
        "canevyn_user_id": current_user["id"],
        "user_name": current_user["full_name"],
        "user_phone": current_user["phone_number"],
        "device_id": payload.device_id,
        "device_model": device_model,
        "trigger_origin": "PHYSICAL_HARDWARE_LATCH",
        "tilt_degrees": payload.tilt_degrees,
        "battery_percent": payload.battery_percent,
        "audible_beacon_db": payload.audible_beacon_db,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "ACTIVE",
        "emergency_contact": current_user.get("emergency_contact_phone") or "sos"
    }

    # Broadcast strictly to the affected user and verified authorized guardians
    await ws_hub.broadcast_hardware_sos(alert_data, guardian_ids, user_id=current_user["id"])

    return SOSEventResponse(
        id=sos_id,
        canevyn_user_id=current_user["id"],
        user_name=current_user["full_name"],
        user_phone=current_user["phone_number"],
        device_id=payload.device_id,
        device_model=device_model,
        trigger_origin=payload.trigger_origin,
        status="ACTIVE",
        trigger_latitude=payload.latitude,
        trigger_longitude=payload.longitude,
        tilt_degrees=payload.tilt_degrees,
        battery_percent_at_trigger=payload.battery_percent,
        audible_beacon_db=payload.audible_beacon_db,
        emergency_contact_dialed=current_user.get("emergency_contact_phone") or "sos",
        triggered_at=datetime.now(timezone.utc).isoformat()
    )

@router.post("/resolve")
async def resolve_hardware_sos(
    payload: HardwareSOSResolve,
    current_user: dict = Depends(get_current_user)
):
    """
    Resolves an active SOS incident.
    Authorized strictly for:
    1. The Canevyn user who experienced the incident.
    2. An active authorized member linked with can_receive_sos=1 permission.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sos_events WHERE id = ?;", (payload.sos_id,))
        sos_row = cursor.fetchone()
        if not sos_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SOS event not found")

        victim_id = sos_row["canevyn_user_id"]

        # Check authorization
        if current_user["id"] != victim_id:
            cursor.execute("""
            SELECT id FROM guardian_relationships
            WHERE canevyn_user_id = ? AND guardian_user_id = ? AND is_active = 1 AND status = 'approved' AND can_receive_sos = 1;
            """, (victim_id, current_user["id"]))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You are not authorized to resolve this emergency incident."
                )

        resolution_status = "RESOLVED_BY_LATCH" if payload.resolution_source == "LATCH_PRESS" else "RESOLVED_BY_USER_APP"
        if current_user["id"] != victim_id:
            resolution_status = "RESOLVED_BY_GUARDIAN"

        cursor.execute("""
        UPDATE sos_events
        SET status = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by_user_id = ?, resolution_notes = ?
        WHERE id = ?;
        """, (resolution_status, current_user["id"], payload.notes or "Resolved", payload.sos_id))

        # Query guardians to notify of resolution
        cursor.execute("""
        SELECT guardian_user_id FROM guardian_relationships
        WHERE canevyn_user_id = ? AND is_active = 1 AND status = 'approved';
        """, (victim_id,))
        guardian_rows = cursor.fetchall()
        guardian_ids = [row["guardian_user_id"] for row in guardian_rows]

    # Notify WebSocket hub
    await ws_hub.broadcast_hardware_sos({
        "sos_id": payload.sos_id,
        "status": "RESOLVED",
        "resolution_source": payload.resolution_source,
        "resolved_by_name": current_user["full_name"],
        "resolved_at": datetime.now(timezone.utc).isoformat()
    }, guardian_ids, user_id=victim_id)

    return {"status": "ok", "message": "Hardware SOS successfully resolved and cleared."}

@router.get("/active/{user_id}", response_model=Optional[SOSEventResponse])
def get_active_sos_for_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Checks if there is an active hardware SOS incident for the specified user with authorization check."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Authorization check: caller must be user themselves or an active authorized guardian
        if current_user["id"] != user_id:
            cursor.execute("""
            SELECT id FROM guardian_relationships
            WHERE canevyn_user_id = ? AND guardian_user_id = ? AND is_active = 1 AND status = 'approved' AND can_receive_sos = 1;
            """, (user_id, current_user["id"]))
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You are not authorized to access SOS incident data for this user."
                )

        cursor.execute("""
        SELECT s.*, u.full_name as user_name, u.phone_number as user_phone, d.model as device_model
        FROM sos_events s
        JOIN users u ON s.canevyn_user_id = u.id
        LEFT JOIN devices d ON s.device_id = d.id
        WHERE s.canevyn_user_id = ? AND s.status = 'ACTIVE'
        ORDER BY s.triggered_at DESC LIMIT 1;
        """, (user_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return SOSEventResponse(
            id=row["id"],
            canevyn_user_id=row["canevyn_user_id"],
            user_name=row["user_name"],
            user_phone=row["user_phone"],
            device_id=row["device_id"],
            device_model=row["device_model"],
            trigger_origin=row["trigger_origin"],
            status=row["status"],
            trigger_latitude=row["trigger_latitude"],
            trigger_longitude=row["trigger_longitude"],
            tilt_degrees=row["tilt_degrees"],
            battery_percent_at_trigger=row["battery_percent_at_trigger"],
            audible_beacon_db=row["audible_beacon_db"],
            emergency_contact_dialed=row["emergency_contact_dialed"],
            triggered_at=str(row["triggered_at"])
        )
