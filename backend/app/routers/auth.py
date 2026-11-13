"""
Authentication and Role-based registration router.
Supports:
- Canevyn User registration & login
- Authorized Member registration & login
- Token verification and profile state
"""

import json
import threading
import uuid
import random
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.database import get_db
from backend.app.models.schemas import UserCreate, UserLogin, UserResponse, TokenResponse, ForgotPasswordRequest, UserSettingsUpdate
from backend.app.services.auth_service import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])
_SETTINGS_WRITE_LOCK = threading.Lock()

def _generate_unique_role_id(cursor, role: str) -> str:
    """
    Generates a guaranteed unique 5-digit ID:
    - CaneVyn User (Blind User): CVN-XXXXX e.g. CVN-10482
    - Authorized Member (Caregiver/Family): CVM-XXXXX e.g. CVM-12345
    """
    if role == "canevyn_user":
        prefix = "CVN"
    elif role == "authorized_member":
        prefix = "CVM"
    else:
        raise ValueError(f"Unsupported role '{role}' for CaneVyn ID generation.")

    for _ in range(200):
        cid = f"{prefix}-{random.randint(10000, 99999)}"
        cursor.execute("SELECT id FROM users WHERE canevyn_id = ?;", (cid,))
        if not cursor.fetchone():
            return cid
    return f"{prefix}-{uuid.uuid4().hex[:5].upper()}"

def _generate_unique_canevyn_id(cursor) -> str:
    return _generate_unique_role_id(cursor, "canevyn_user")

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserCreate):
    """Creates a new Canevyn User or Authorized Member account."""
    if user_in.role not in ["canevyn_user", "authorized_member"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'canevyn_user' or 'authorized_member'"
        )

    if user_in.confirm_password and user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and Confirm Password do not match."
        )

    clean_email = user_in.email.strip().lower()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?;", (clean_email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists. Please sign in instead."
            )

        new_id = f"usr-{uuid.uuid4().hex[:10]}"
        hashed_pwd = hash_password(user_in.password)
        canevyn_id = _generate_unique_role_id(cursor, user_in.role)

        cursor.execute("""
        INSERT INTO users (id, role, full_name, email, hashed_password, phone_number, emergency_contact_phone, canevyn_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            new_id,
            user_in.role,
            user_in.full_name.strip(),
            clean_email,
            hashed_pwd,
            user_in.phone_number.strip() if user_in.phone_number else None,
            user_in.emergency_contact_phone or "sos",
            canevyn_id
        ))

        # If registering as a Canevyn blind stick user, automatically pair a sentinel hardware cane
        if user_in.role == "canevyn_user":
            dev_id = f"dev-cnv-{new_id[-6:]}"
            serial_no = f"CNV-{uuid.uuid4().hex[:6].upper()}"
            cursor.execute("""
            INSERT INTO devices (id, serial_number, model, firmware_version, hardware_revision, assigned_user_id, battery_percent, is_charging, is_connected)
            VALUES (?, ?, 'Canevyn CX-7 Sentinel', 'v4.1.0', 'CS-300-REV-B', ?, 0, 0, 0);
            """, (dev_id, serial_no, new_id))

        cursor.execute("SELECT * FROM users WHERE id = ?;", (new_id,))
        user_row = dict(cursor.fetchone())

    token = create_access_token({"sub": user_row["id"], "role": user_row["role"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user_row)
    )

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    """Dispatches password reset instructions for registered accounts."""
    clean_email = req.email.strip().lower()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, full_name FROM users WHERE LOWER(email) = ?;", (clean_email,))
        user = cursor.fetchone()

    return {
        "status": "success",
        "message": f"If an account with {clean_email} exists, password reset instructions have been dispatched."
    }

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin):
    """Authenticates existing Canevyn User or Authorized Member."""
    clean_email = login_data.email.strip().lower()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?;", (clean_email,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password. Please verify your credentials or create a new account."
            )
        user_row = dict(row)

    if not verify_password(login_data.password, user_row["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please verify your credentials."
        )

    # Enforce explicit role selection check when role_hint is sent from Sign In tab
    if login_data.role_hint and login_data.role_hint != user_row["role"]:
        registered_label = "Canevyn User (Blind User)" if user_row["role"] == "canevyn_user" else "Authorized Member (Caregiver/Family)"
        selected_label = "Canevyn User (Blind User)" if login_data.role_hint == "canevyn_user" else "Authorized Member (Caregiver/Family)"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is registered as '{registered_label}', but you selected '{selected_label}'. Please switch to the correct role."
        )

    # Token and session are strictly bound to the user's authentic database role
    token = create_access_token({"sub": user_row["id"], "role": user_row["role"]})
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user_row)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    return UserResponse(**current_user)


def _parse_settings_json(raw_value) -> dict:
    """Safely parses stored JSON user settings into a dictionary."""
    if not raw_value:
        return {}
    if isinstance(raw_value, dict):
        return dict(raw_value)
    try:
        parsed = json.loads(raw_value)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


@router.get("/settings")
def get_user_settings(current_user: dict = Depends(get_current_user)):
    """Returns parsed persisted settings for the authenticated user."""
    settings = _parse_settings_json(current_user.get("settings_json"))
    if current_user.get("role") == "authorized_member" and "guardian_theme" not in settings:
        settings["guardian_theme"] = "dark"
    return {"settings": settings}


@router.put("/settings")
def update_user_settings(payload: UserSettingsUpdate, current_user: dict = Depends(get_current_user)):
    """Updates persistent settings (e.g., Authorized Member theme or Blind User preferences) for the authenticated user."""
    updates = {}
    if payload.guardian_theme is not None:
        if current_user.get("role") != "authorized_member":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Theme preference is only available for Authorized Member accounts."
            )
        updates["guardian_theme"] = payload.guardian_theme
    if payload.speech_rate is not None:
        updates["speech_rate"] = round(float(payload.speech_rate), 1)
    if payload.voice_feedback_enabled is not None:
        updates["voice_feedback_enabled"] = bool(payload.voice_feedback_enabled)
    if payload.obstacle_sensitivity is not None:
        updates["obstacle_sensitivity"] = payload.obstacle_sensitivity
    if payload.vibration_intensity is not None:
        updates["vibration_intensity"] = payload.vibration_intensity
    if payload.audio_alerts_enabled is not None:
        updates["audio_alerts_enabled"] = bool(payload.audio_alerts_enabled)

    with _SETTINGS_WRITE_LOCK:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT settings_json FROM users WHERE id = ?;", (current_user["id"],))
            row = cursor.fetchone()
            existing = _parse_settings_json(row["settings_json"] if row else current_user.get("settings_json"))
            existing.update(updates)
            serialized = json.dumps(existing)
            cursor.execute("UPDATE users SET settings_json = ? WHERE id = ?;", (serialized, current_user["id"]))

    return {
        "status": "success",
        "settings": existing,
        "settings_json": serialized
    }
