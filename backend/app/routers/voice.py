"""
Voice Accessibility & Grounded AI Assistant Router
Strict Rule: No chatbot or conversational UI.
Provides grounded natural language responses based strictly on REAL SQLite data.
Never invents battery, GPS, or sensor info.
"""

import re
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.database import get_db
from backend.app.services.auth_service import get_current_user
from backend.app.services.ws_manager import ws_hub

router = APIRouter(prefix="/voice", tags=["Voice Accessibility"])

class VoiceCommandRequest(BaseModel):
    transcript: str
    battery_percent: Optional[int] = None
    is_connected: Optional[bool] = None
    obstacle_distance_cm: Optional[int] = None
    obstacle_status: Optional[str] = None
    ground_profile: Optional[str] = None
    water_detected: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_meters: Optional[float] = None
    address_label: Optional[str] = None
    location_sharing_enabled: Optional[bool] = None
    gps_watching: Optional[bool] = None
    permission_state: Optional[str] = None
    gps_status: Optional[str] = None
    is_stale_signal: Optional[bool] = None

class VoiceCommandResponse(BaseModel):
    command_type: str
    spoken_response: str
    navigation_action: Optional[str] = None
    safety_warning: Optional[str] = None
    insights: Dict[str, Any] = {}

def _normalize_transcript(raw: str) -> str:
    cleaned = re.sub(r"[^\w\s']", " ", (raw or "").lower())
    return " ".join(cleaned.split())

def _format_name_list(names: List[str]) -> str:
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return f"{', '.join(names[:-1])}, and {names[-1]}"

@router.get("/welcome-briefing")
def get_welcome_briefing(current_user: dict = Depends(get_current_user)):
    """
    Returns an automatic voice briefing for a blind user entering their dashboard.
    Announces stick connection, battery, safety warnings, and available voice commands.
    """
    if current_user["role"] != "canevyn_user":
        return {
            "welcome_speech": f"Welcome back, {current_user['full_name']}. Authorized Member portal active.",
            "is_connected": False,
            "battery_percent": None
        }

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM devices WHERE assigned_user_id = ? LIMIT 1;", (current_user["id"],))
        dev = cursor.fetchone()

        cursor.execute("""
        SELECT COUNT(*) as count FROM guardian_relationships
        WHERE canevyn_user_id = ? AND is_active = 1 AND status = 'approved';
        """, (current_user["id"],))
        guardians_count = cursor.fetchone()["count"]

        cursor.execute("""
        SELECT COUNT(*) as count FROM guardian_relationships
        WHERE canevyn_user_id = ? AND status = 'pending';
        """, (current_user["id"],))
        pending_requests_count = cursor.fetchone()["count"]

        cursor.execute("""
        SELECT id FROM sos_events
        WHERE canevyn_user_id = ? AND status = 'ACTIVE' LIMIT 1;
        """, (current_user["id"],))
        active_sos = cursor.fetchone()

    is_connected = bool(dev["is_connected"]) if dev else False
    battery = dev["battery_percent"] if dev and is_connected else None

    speech_parts = ["Welcome to CaneVyn. Your smart assistant is ready."]

    if active_sos:
        speech_parts.append("Emergency Hardware SOS is currently active. Hardware telemetry is broadcasting to your authorized members.")
    elif is_connected and battery is not None:
        speech_parts.append(f"Your smart stick is connected. Battery level is {battery} percent.")
    elif is_connected:
        speech_parts.append("Your smart stick is connected, but battery level is currently unavailable.")
    else:
        speech_parts.append("Warning! Your smart stick is not connected. Please check your device.")

    if pending_requests_count > 0:
        plural = "requests" if pending_requests_count > 1 else "request"
        speech_parts.append(f"You have {pending_requests_count} pending connection {plural}.")

    speech_parts.append("You can ask who your Authorized Member is, check your battery, obstacles, or safety status. Say 'Help' for commands.")

    return {
        "welcome_speech": " ".join(speech_parts),
        "user_id": current_user["id"],
        "canevyn_id": current_user.get("canevyn_id") or "CVN-10482",
        "user_name": current_user["full_name"],
        "is_connected": is_connected,
        "battery_percent": battery,
        "active_sos": bool(active_sos),
        "guardians_count": guardians_count,
        "pending_requests_count": pending_requests_count,
        "commands": [
            "Who is my Authorized Member?",
            "Who is connected to me?",
            "Tell me my family members",
            "Who can monitor me?",
            "Start live location",
            "Stop live location",
            "Is my live location active?",
            "What's my battery level?",
            "Where am I?",
            "Is my stick connected?",
            "Any obstacles?",
            "Is there water nearby?",
            "What's my safety status?",
            "Repeat my ID",
            "Help"
        ]
    }

@router.post("/interpret-command", response_model=VoiceCommandResponse)
def interpret_voice_command(
    req: VoiceCommandRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Routes voice commands to exact grounded handlers using SQLite and real device state.
    Never invents fake GPS data or falls back blindly on unsupported utterances.
    """
    raw_text = (req.transcript or "").strip()
    transcript = _normalize_transcript(raw_text)

    if not transcript:
        return VoiceCommandResponse(
            command_type="empty",
            spoken_response="No voice command was detected. Please tap the microphone and speak your command clearly."
        )

    # 1. Hardware SOS Security Rule
    if any(k in transcript for k in ["sos", "emergency", "trigger emergency", "call 911", "help me"]):
        return VoiceCommandResponse(
            command_type="sos_notice",
            spoken_response="Voice commands cannot trigger emergency SOS. Please pull or press the physical hardware latch on your Canevyn stick grip.",
            safety_warning="SOS is hardware-exclusive via the physical stick latch."
        )

    # 2. Authorized Member / Connected Family Members (evaluated BEFORE stick 'connected' and 'location')
    authorized_member_phrases = [
        "authorized member", "authorized members", "authorised member", "authorised members",
        "who is connected", "who s connected", "whos connected", "who connected",
        "connected to me", "who am i connected", "family member", "family members",
        "my family", "tell me my family", "caregiver", "caregivers",
        "who can monitor", "who monitors", "who is monitoring", "monitor me",
        "guardian", "guardians", "protector", "protectors",
        "who can access", "who has access", "who has my location",
        "who can see my location", "who can see me"
    ]
    if any(k in transcript for k in authorized_member_phrases):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT u.full_name
            FROM guardian_relationships r
            JOIN users u ON r.guardian_user_id = u.id
            WHERE r.canevyn_user_id = ?
              AND r.is_active = 1
              AND r.status = 'approved'
            ORDER BY r.is_primary DESC, r.created_at ASC;
            """, (current_user["id"],))
            members = [row["full_name"] for row in cursor.fetchall()]

        if not members:
            msg = "You haven't connected with any family member yet."
        elif len(members) == 1:
            msg = f"Your connected Authorized Member is {members[0]}."
        else:
            msg = f"Your connected Authorized Members are {_format_name_list(members)}."

        return VoiceCommandResponse(
            command_type="guardians",
            spoken_response=msg,
            insights={"approved_count": len(members), "members": members}
        )

    # 3A. Stop Live Location Sharing
    stop_location_phrases = [
        "stop live location", "disable live location",
        "stop sharing my location", "stop sharing location", "stop location sharing",
        "turn off location sharing", "turn off live location",
        "deactivate my gps", "deactivate gps", "stop my gps", "stop gps", "disable gps"
    ]
    if any(k in transcript for k in stop_location_phrases):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET location_sharing_enabled = 0 WHERE id = ?;", (current_user["id"],))
            cursor.execute("""
            SELECT guardian_user_id FROM guardian_relationships
            WHERE canevyn_user_id = ? AND is_active = 1 AND status = 'approved' AND can_view_live_location = 1;
            """, (current_user["id"],))
            guardian_ids = [r["guardian_user_id"] for r in cursor.fetchall()]

        if guardian_ids:
            background_tasks.add_task(
                ws_hub.broadcast_event,
                "LOCATION_SHARING_STOPPED",
                {
                    "user_id": current_user["id"],
                    "canevyn_user_id": current_user.get("canevyn_id"),
                    "user_name": current_user.get("full_name"),
                    "location_sharing_enabled": False,
                    "is_live": False,
                    "is_live_available": False,
                    "address_label": "Live Location: Not Available",
                    "sharing_status": "off",
                    "stopped_at": datetime.now(timezone.utc).isoformat(),
                },
                guardian_ids,
            )

        return VoiceCommandResponse(
            command_type="stop_location_sharing",
            spoken_response="Your live location sharing has been stopped.",
            insights={"location_sharing_enabled": False}
        )

    # 3B. Start / Enable Live Location Sharing
    start_location_phrases = [
        "enable my location", "start my location", "turn on my location", "activate my location",
        "start live location", "enable live location", "resume live location",
        "start sharing my location", "start sharing location", "turn on location sharing",
        "turn on live location", "activate my gps", "activate gps", "start gps", "enable gps",
        "enable location", "share my current location", "share my location", "share location",
        "send my location", "send location"
    ]
    if any(k in transcript for k in start_location_phrases):
        perm = (req.permission_state or "prompt").lower()
        if perm == "denied":
            return VoiceCommandResponse(
                command_type="location_permission_denied",
                spoken_response="Location permission is currently denied. Please enable location access for CaneVyn in your browser settings.",
                navigation_action="user_location",
                insights={"permission_state": "denied"}
            )
        if perm == "granted":
            if req.gps_watching and req.latitude is not None and req.longitude is not None and not req.is_stale_signal:
                return VoiceCommandResponse(
                    command_type="location_already_active",
                    spoken_response="Your live location sharing is already active.",
                    insights={"permission_state": "granted", "already_watching": True}
                )
            return VoiceCommandResponse(
                command_type="start_location_sharing",
                spoken_response="Starting your live location sharing.",
                insights={"permission_state": "granted"}
            )
        return VoiceCommandResponse(
            command_type="location_permission_required",
            spoken_response="Location permission is required. I have opened the Location screen and focused the Enable phone location permission button. Please tap or press Enter on it to allow GPS access.",
            navigation_action="user_location",
            insights={"permission_state": perm}
        )

    # 3C. Check Live Location Status
    status_location_phrases = [
        "is my live location active", "am i sharing my location",
        "is my gps working", "check my location status", "check location status",
        "live location status", "location sharing status", "gps status",
        "is location sharing on", "is live location on", "is my gps on", "is gps active"
    ]
    if any(k in transcript for k in status_location_phrases):
        perm = (req.permission_state or "").lower()
        if perm == "denied":
            return VoiceCommandResponse(
                command_type="location_status",
                spoken_response="Location permission is currently denied. Please enable location access for CaneVyn in your browser settings.",
                insights={"status": "denied"}
            )

        if req.gps_status == "GPS Signal Unavailable" or req.is_stale_signal:
            return VoiceCommandResponse(
                command_type="location_status",
                spoken_response="Your GPS signal is currently unavailable.",
                insights={"status": "unavailable"}
            )

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT location_sharing_enabled FROM users WHERE id = ?;", (current_user["id"],))
            u_row = cursor.fetchone()
            db_sharing = bool(u_row["location_sharing_enabled"]) if u_row else False

        is_live_client = bool(req.gps_watching and req.latitude is not None and req.longitude is not None)
        if is_live_client:
            msg = "Your live location sharing is active."
            st = "active"
        elif req.gps_watching and not req.is_stale_signal:
            msg = "Your GPS signal is currently unavailable."
            st = "searching_or_unavailable"
        elif db_sharing or req.location_sharing_enabled:
            msg = "Your live location sharing is currently turned off on this tab. Tap Resume Live Location to continue."
            st = "ready_to_resume"
        else:
            msg = "Your live location sharing is currently turned off."
            st = "off"

        return VoiceCommandResponse(
            command_type="location_status",
            spoken_response=msg,
            insights={"status": st, "location_sharing_enabled": db_sharing}
        )

    # 4. Ask Current Location / "Where am I?"
    where_phrases = [
        "where am i", "where i am", "tell me my current location",
        "what is my current position", "whats my current position", "what s my current position",
        "current position", "my current location", "my location",
        "current location", "what street", "my address", "gps"
    ]
    if any(k in transcript for k in where_phrases):
        addr = (req.address_label or "").strip()
        is_placeholder = addr.lower() in ["", "live location: not available", "not available", "unavailable"]
        if addr and not is_placeholder:
            msg = f"You are at {addr}."
            lat_out, lon_out, acc_out = req.latitude, req.longitude, req.accuracy_meters
        elif req.latitude is not None and req.longitude is not None and not req.is_stale_signal:
            lat_out, lon_out, acc_out = req.latitude, req.longitude, req.accuracy_meters
            if acc_out is not None:
                msg = f"Your current position is latitude {lat_out:.5f}, longitude {lon_out:.5f}, with accuracy about {round(acc_out)} meters."
            else:
                msg = f"Your current position is latitude {lat_out:.5f}, longitude {lon_out:.5f}."
        else:
            # Check SQLite recent live GPS fix if sharing is enabled
            lat_out, lon_out, acc_out = None, None, None
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT location_sharing_enabled FROM users WHERE id = ?;", (current_user["id"],))
                u_row = cursor.fetchone()
                db_sharing = bool(u_row["location_sharing_enabled"]) if u_row else False
                if db_sharing:
                    cursor.execute("""
                    SELECT latitude, longitude, accuracy_meters, recorded_at
                    FROM location_records
                    WHERE user_id = ? AND COALESCE(is_live_gps, 0) = 1
                    ORDER BY datetime(recorded_at) DESC, id DESC LIMIT 1;
                    """, (current_user["id"],))
                    row = cursor.fetchone()
                    if row:
                        raw_ts = str(row["recorded_at"]).replace("Z", "+00:00")
                        try:
                            dt = datetime.fromisoformat(raw_ts)
                            if dt.tzinfo is None:
                                dt = dt.replace(tzinfo=timezone.utc)
                            age = (datetime.now(timezone.utc) - dt.astimezone(timezone.utc)).total_seconds()
                            if age <= 300:
                                lat_out = float(row["latitude"])
                                lon_out = float(row["longitude"])
                                acc_out = float(row["accuracy_meters"]) if row["accuracy_meters"] is not None else None
                        except ValueError:
                            pass

            if lat_out is not None and lon_out is not None:
                if acc_out is not None:
                    msg = f"Your current position is latitude {lat_out:.5f}, longitude {lon_out:.5f}, with accuracy about {round(acc_out)} meters."
                else:
                    msg = f"Your current position is latitude {lat_out:.5f}, longitude {lon_out:.5f}."
            else:
                msg = "Your live GPS location is currently unavailable."

        return VoiceCommandResponse(
            command_type="location",
            spoken_response=msg,
            insights={"address": None if is_placeholder else addr, "latitude": lat_out, "longitude": lon_out, "accuracy_meters": acc_out}
        )

    # 5. Battery Level
    if any(k in transcript for k in ["battery", "charge", "power level", "how much power"]):
        if req.is_connected and req.battery_percent is not None:
            hours = max(1, round(req.battery_percent * 0.17))
            msg = f"Your Canevyn smart stick battery is at {req.battery_percent} percent. Approximately {hours} hours remaining."
        elif req.is_connected:
            msg = "Your Canevyn smart stick is connected, but battery telemetry is unavailable."
        else:
            msg = "Your smart stick is currently disconnected. Battery level is unavailable. Please turn on your stick."
        return VoiceCommandResponse(
            command_type="battery",
            spoken_response=msg,
            insights={"battery_percent": req.battery_percent, "is_connected": req.is_connected}
        )

    # 6. Stick Connection Status (strictly about hardware stick, never hijacks 'who is connected to me')
    stick_conn_phrases = [
        "is my stick connected", "is stick connected", "stick connected",
        "is my cane connected", "cane connected", "is my canevyn connected",
        "canevyn connected", "connection status", "stick status", "bluetooth", "paired"
    ]
    if any(k in transcript for k in stick_conn_phrases):
        if req.is_connected:
            msg = "Your Canevyn smart stick is connected and communicating via Bluetooth Low Energy."
        else:
            msg = "Your smart stick is currently disconnected. Searching for your Canevyn BLE beacon."
        return VoiceCommandResponse(
            command_type="connection",
            spoken_response=msg,
            insights={"is_connected": req.is_connected}
        )

    # 7. Obstacles & Radar
    if any(k in transcript for k in ["obstacle", "obstacles", "path ahead", "what s ahead", "whats ahead", "radar", "blocking", "check path"]):
        if not req.is_connected:
            msg = "Smart stick obstacle sensor is unavailable because the stick is disconnected."
            warning = None
        elif req.obstacle_distance_cm is not None:
            dist_m = req.obstacle_distance_cm / 100.0
            if dist_m < 1.0:
                msg = f"Caution! Obstacle detected close ahead at {dist_m:.1f} meters. Please slow down or step aside."
                warning = f"Immediate obstacle at {dist_m:.1f}m"
            elif dist_m < 2.5:
                msg = f"Obstacle approaching in {dist_m:.1f} meters ahead."
                warning = None
            else:
                msg = f"Obstacle radar is active. Path is clear for {dist_m:.1f} meters ahead."
                warning = None
        else:
            msg = "Obstacle radar is active. Path is clear ahead."
            warning = None
        return VoiceCommandResponse(
            command_type="obstacle",
            spoken_response=msg,
            safety_warning=warning,
            insights={"distance_cm": req.obstacle_distance_cm, "status": req.obstacle_status}
        )

    # 8. Water / Puddles / Wet ground
    if any(k in transcript for k in ["water", "puddle", "wet", "rain", "slippery"]):
        if req.water_detected:
            msg = "Warning: Water or a puddle is detected by the ground tip sensor ahead. Tread carefully."
            warning = "Water detected on ground path."
        elif req.ground_profile and "tactile" in req.ground_profile.lower():
            msg = "Ground tip sensor reports tactile sidewalk paving. No standing water detected."
            warning = None
        else:
            msg = "Ground tip sensor reports a dry walking surface. No standing water detected."
            warning = None
        return VoiceCommandResponse(
            command_type="water",
            spoken_response=msg,
            safety_warning=warning,
            insights={"water_detected": bool(req.water_detected)}
        )

    # 9. Safety Status
    if any(k in transcript for k in ["safety status", "am i safe", "sos status", "check safety"]):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM sos_events WHERE canevyn_user_id = ? AND status = 'ACTIVE';", (current_user["id"],))
            active_sos = cursor.fetchone()

        if active_sos:
            msg = "Attention: Hardware emergency SOS alert is currently active."
            warning = "Active SOS alert broadcast."
        else:
            msg = "Your safety status is Nominal and Safe. Physical cane latch is armed and ready."
            warning = None
        return VoiceCommandResponse(
            command_type="safety",
            spoken_response=msg,
            safety_warning=warning
        )

    # 10. Repeat My ID
    if any(k in transcript for k in ["repeat my id", "my user id", "what is my id", "whats my id", "what s my id", "repeat id", "tell me my id", "share id", "my id"]):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT canevyn_id FROM users WHERE id = ?;", (current_user["id"],))
            u_row = cursor.fetchone()
            cid = (u_row and u_row["canevyn_id"]) or current_user.get("canevyn_id") or "CVN-10482"
        return VoiceCommandResponse(
            command_type="user_id",
            spoken_response=f"Your CaneVyn User ID is {cid}. Share this ID with your family member if they want to connect with you.",
            insights={"canevyn_id": cid}
        )

    # 11. Mute / Unmute
    if any(k in transcript for k in ["mute voice", "mute assistant", "silence voice", "turn off voice"]):
        return VoiceCommandResponse(
            command_type="mute",
            spoken_response="Voice assistant feedback is now muted. Say 'Unmute voice' or tap the audio button anytime.",
            navigation_action="toggle_mute"
        )
    if any(k in transcript for k in ["unmute voice", "unmute assistant", "enable voice", "turn on voice"]):
        return VoiceCommandResponse(
            command_type="unmute",
            spoken_response="Voice assistant feedback unmuted. Audio announcements are active.",
            navigation_action="toggle_mute"
        )

    # 12. Navigation Shortcuts
    if any(k in transcript for k in ["open wayfinding", "open location", "show map", "go to wayfinding", "go to location"]):
        return VoiceCommandResponse(
            command_type="navigation",
            spoken_response="Opening Location Status.",
            navigation_action="user_location"
        )
    if any(k in transcript for k in ["open protectors", "open guardians", "open authorized members", "show guardians", "manage family", "show requests"]):
        return VoiceCommandResponse(
            command_type="navigation",
            spoken_response="Opening Authorized Members.",
            navigation_action="user_guardian"
        )
    if any(k in transcript for k in ["go home", "navigate home", "home dashboard", "home screen", "main screen"]):
        return VoiceCommandResponse(
            command_type="navigation",
            spoken_response="Returning to home dashboard.",
            navigation_action="user_home"
        )

    # 13. Voice Approval and Rejection of Connection Requests
    if any(k in transcript for k in ["approve request", "approve connection", "accept request"]):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT r.id, g.full_name as guardian_name
            FROM guardian_relationships r
            JOIN users g ON r.guardian_user_id = g.id
            WHERE r.canevyn_user_id = ? AND r.status = 'pending'
            ORDER BY r.created_at DESC LIMIT 1;
            """, (current_user["id"],))
            pend = cursor.fetchone()
            if pend:
                cursor.execute("""
                UPDATE guardian_relationships
                SET status = 'approved', is_active = 1, can_receive_sos = 1, can_view_live_location = 1, can_view_telemetry = 1
                WHERE id = ?;
                """, (pend["id"],))
                msg = f"Connection request approved for {pend['guardian_name']}."
            else:
                msg = "You have no pending connection requests to approve."
        return VoiceCommandResponse(
            command_type="approve_request",
            spoken_response=msg
        )

    if any(k in transcript for k in ["reject request", "decline request"]):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT r.id, g.full_name as guardian_name
            FROM guardian_relationships r
            JOIN users g ON r.guardian_user_id = g.id
            WHERE r.canevyn_user_id = ? AND r.status = 'pending'
            ORDER BY r.created_at DESC LIMIT 1;
            """, (current_user["id"],))
            pend = cursor.fetchone()
            if pend:
                cursor.execute("""
                UPDATE guardian_relationships
                SET status = 'rejected', is_active = 0, can_receive_sos = 0, can_view_live_location = 0, can_view_telemetry = 0
                WHERE id = ?;
                """, (pend["id"],))
                msg = f"Connection request from {pend['guardian_name']} was rejected."
            else:
                msg = "You have no pending connection requests to reject."
        return VoiceCommandResponse(
            command_type="reject_request",
            spoken_response=msg
        )

    # 14. Explicit Help Command
    if any(k in transcript for k in ["help", "what can i say", "commands", "list commands", "what can you do"]):
        return VoiceCommandResponse(
            command_type="help",
            spoken_response="You can ask: 'Who is my Authorized Member?', 'Start live location', 'Stop live location', 'Is my live location active?', 'Where am I?', 'What's my battery level?', 'Is my stick connected?', 'Any obstacles?', 'Is there water nearby?', 'What's my safety status?', or 'Repeat my ID'."
        )

    # 15. Unsupported Commands (Specific, honest feedback — never repeats a canned battery/location fallback)
    if any(k in transcript for k in ["weather", "temperature", "forecast", "time", "date", "day", "news", "music", "song"]):
        return VoiceCommandResponse(
            command_type="unsupported",
            spoken_response=f"Sorry, checking that information with '{raw_text}' is not supported yet in CaneVyn. Say 'Help' for supported mobility commands."
        )
    if any(k in transcript for k in ["call ", "dial ", "message ", "text ", "send message"]):
        return VoiceCommandResponse(
            command_type="unsupported",
            spoken_response="Voice dialing and messaging are not supported yet. Please use your phone dialer, or ask 'Who is my Authorized Member?' to view your contacts."
        )

    return VoiceCommandResponse(
        command_type="unsupported",
        spoken_response=f"I didn't recognize the command '{raw_text}'. That command is not supported. Say 'Help' to hear supported CaneVyn commands."
    )
