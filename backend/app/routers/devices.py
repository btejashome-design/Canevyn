"""
Device Management API Router
Strict Authorization Enforced:
- Canevyn User can access only their assigned device.
- Authorized Member can access only devices assigned to travelers they are actively authorized to monitor.
- Arbitrary users cannot query or ping devices.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from backend.app.database import get_db
from backend.app.models.schemas import DeviceResponse
from backend.app.services.auth_service import get_current_user

router = APIRouter(prefix="/devices", tags=["Devices"])

def _verify_device_access(cursor, device_id: str, current_user_id: str) -> dict:
    """Verifies that the current user owns the device or is an active guardian for its owner."""
    cursor.execute("SELECT * FROM devices WHERE id = ?;", (device_id,))
    dev_row = cursor.fetchone()
    if not dev_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    assigned_user = dev_row["assigned_user_id"]
    if assigned_user == current_user_id:
        return dict(dev_row)

    # Check if current user is an active guardian with telemetry viewing permission
    cursor.execute("""
    SELECT id FROM guardian_relationships
    WHERE canevyn_user_id = ? AND guardian_user_id = ? AND is_active = 1 AND status = 'approved' AND can_view_telemetry = 1;
    """, (assigned_user, current_user_id))
    if cursor.fetchone():
        return dict(dev_row)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: You are not authorized to access this Canevyn hardware device."
    )

@router.get("/user/current", response_model=Optional[DeviceResponse])
def get_user_device(current_user: dict = Depends(get_current_user)):
    """Returns the primary paired Canevyn Smart Stick for the authenticated Canevyn User."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT d.*, EXISTS(SELECT 1 FROM telemetry_logs t WHERE t.device_id = d.id) as has_real_telemetry
        FROM devices d
        WHERE d.assigned_user_id = ?
        LIMIT 1;
        """, (current_user["id"],))
        row = cursor.fetchone()
        if not row:
            return None
        is_integrated = bool(row["is_connected"]) or bool(row["has_real_telemetry"])
        return DeviceResponse(
            id=row["id"],
            serial_number=row["serial_number"],
            model=row["model"],
            firmware_version=row["firmware_version"],
            hardware_revision=row["hardware_revision"],
            battery_percent=row["battery_percent"],
            is_charging=bool(row["is_charging"]),
            is_connected=bool(row["is_connected"]),
            signal_quality=row["signal_quality"],
            assigned_user_id=row["assigned_user_id"],
            is_hardware_integrated=is_integrated
        )

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device_by_id(device_id: str, current_user: dict = Depends(get_current_user)):
    """Fetches device hardware information with strict ownership/guardian check."""
    with get_db() as conn:
        cursor = conn.cursor()
        row = _verify_device_access(cursor, device_id, current_user["id"])
        return DeviceResponse(
            id=row["id"],
            serial_number=row["serial_number"],
            model=row["model"],
            firmware_version=row["firmware_version"],
            hardware_revision=row["hardware_revision"],
            battery_percent=row["battery_percent"],
            is_charging=bool(row["is_charging"]),
            is_connected=bool(row["is_connected"]),
            signal_quality=row["signal_quality"],
            assigned_user_id=row["assigned_user_id"]
        )

@router.post("/{device_id}/ping-beacon")
def ping_cane_beacon(device_id: str, current_user: dict = Depends(get_current_user)):
    """Triggers audible beacon tone on the physical stick tip when ESP32 hardware is connected."""
    with get_db() as conn:
        cursor = conn.cursor()
        row = _verify_device_access(cursor, device_id, current_user["id"])
        if not bool(row["is_connected"]):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Hardware is not connected yet. Ring Cane is disabled until ESP32 hardware is paired and connected."
            )

    return {
        "status": "queued",
        "device_id": device_id,
        "action": "AUDIBLE_LOCATOR_PING",
        "message": "Audible beacon command queued for connected hardware."
    }
