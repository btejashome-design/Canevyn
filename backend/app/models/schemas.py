"""
Pydantic Schemas for Canevyn API validation and serialization.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import math

class UserBase(BaseModel):
    email: str
    full_name: str
    phone_number: Optional[str] = None
    role: str = Field(..., description="'canevyn_user' or 'authorized_member'")
    emergency_contact_phone: Optional[str] = "sos"

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("Email address is required.")
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Please enter a valid email address (e.g. name@example.com).")
        return v

    @field_validator("full_name", mode="before")
    @classmethod
    def clean_name(cls, v):
        if not v or not isinstance(v, str) or not v.strip():
            raise ValueError("Full Name is required.")
        return v.strip()

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    confirm_password: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if not v or len(v) < 6:
            raise ValueError("Password must be at least 6 characters long.")
        return v

class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("Email address is required.")
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Please enter a valid email address.")
        return v

class UserLogin(BaseModel):
    email: str
    password: str
    role_hint: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def clean_email(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("Email address is required.")
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Please enter a valid email address (e.g. name@example.com).")
        return v

class UserResponse(UserBase):
    id: str
    canevyn_id: Optional[str] = None
    avatar_url: Optional[str] = None
    settings_json: Optional[str] = "{}"
    location_sharing_enabled: bool = False
    last_location_at: Optional[str] = None
    created_at: Optional[str] = None

    @field_validator("location_sharing_enabled", mode="before")
    @classmethod
    def coerce_sharing_bool(cls, v):
        if v is None:
            return False
        return bool(v)

    @field_validator("last_location_at", mode="before")
    @classmethod
    def coerce_last_loc_str(cls, v):
        return str(v) if v is not None else None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Device and BLE models
class DeviceResponse(BaseModel):
    id: str
    serial_number: str
    model: str
    firmware_version: str
    hardware_revision: str
    battery_percent: int
    is_charging: bool
    is_connected: bool
    signal_quality: str
    assigned_user_id: Optional[str] = None
    is_hardware_integrated: Optional[bool] = None

class TelemetryIngest(BaseModel):
    device_id: str
    battery_percent: int = Field(..., ge=0, le=100)
    obstacle_distance_cm: int = Field(350, description="Obstacle distance detected by LiDAR/sonar in cm")
    obstacle_angle_deg: int = Field(0, description="Beam angle")
    obstacle_status: str = "Clear Path"
    ground_tactile_profile: str = "Tactile sidewalk pavers"
    cellular_bars: int = 4
    cellular_band: str = "4G LTE Band 12 (Emergency Priority)"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    heading_deg: Optional[float] = None
    accuracy_meters: Optional[float] = None
    rtk_differential_locked: bool = False

class PhoneLocationUpdate(BaseModel):
    user_id: Optional[str] = Field(None, description="Optional check; server always derives identity from JWT")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    accuracy_meters: float = Field(..., ge=0.0)
    heading_deg: Optional[float] = Field(None, ge=0.0, le=360.0)
    speed_mps: Optional[float] = Field(None, ge=0.0)
    recorded_at: str = Field(..., min_length=1)

    @field_validator("latitude", "longitude", "accuracy_meters", "heading_deg", "speed_mps", mode="after")
    @classmethod
    def check_finite_numbers(cls, v):
        if v is not None and not math.isfinite(v):
            raise ValueError("Location numeric fields must be finite numbers.")
        return v

    @field_validator("recorded_at", mode="before")
    @classmethod
    def validate_recorded_at(cls, v):
        if not v or not isinstance(v, str) or not v.strip():
            raise ValueError("recorded_at ISO timestamp is required.")
        raw = v.strip()
        try:
            normalized = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
            parsed = datetime.fromisoformat(normalized)
        except ValueError:
            raise ValueError("recorded_at must be a valid ISO-8601 timestamp.")
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.isoformat()

class HardwareSOSEventCreate(BaseModel):
    device_id: str
    canevyn_user_id: str
    trigger_origin: str = Field("PHYSICAL_HARDWARE_LATCH", description="Strict rule: originates from cane stick")
    latitude: float
    longitude: float
    tilt_degrees: int = 84
    battery_percent: int = 82
    audible_beacon_db: int = 95
    notes: Optional[str] = "Initiated via physical emergency cane latch."

class HardwareSOSResolve(BaseModel):
    sos_id: str
    resolution_source: str = Field(..., description="'LATCH_PRESS', 'APP_HOLD_3S', 'GUARDIAN_VERIFIED'")
    resolved_by_user_id: str
    notes: Optional[str] = "Emergency latch deactivated or resolved."

class SOSEventResponse(BaseModel):
    id: str
    canevyn_user_id: str
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    device_id: str
    device_model: Optional[str] = "Canevyn CX-7 Sentinel"
    trigger_origin: str
    status: str
    trigger_latitude: float
    trigger_longitude: float
    tilt_degrees: int
    battery_percent_at_trigger: int
    audible_beacon_db: int
    emergency_contact_dialed: Optional[str]
    triggered_at: str
    resolved_at: Optional[str] = None
    resolved_by_user_id: Optional[str] = None

class GuardianRelationshipResponse(BaseModel):
    id: str
    canevyn_user_id: str
    guardian_user_id: str
    guardian_canevyn_id: Optional[str] = None
    guardian_name: str
    guardian_phone: Optional[str] = None
    relationship_label: str
    is_primary: bool
    can_receive_sos: bool
    can_view_live_location: bool
    can_view_telemetry: bool
    is_active: bool
    status: str = "approved"
    created_at: Optional[str] = None

class UserSearchRequest(BaseModel):
    canevyn_user_id: str

class UserSearchResponse(BaseModel):
    canevyn_user_id: str
    full_name: str
    connection_status: Optional[str] = None  # None, "pending", "approved", "rejected"

class MemberSearchRequest(BaseModel):
    member_id: str

class MemberSearchResponse(BaseModel):
    member_id: str
    full_name: str
    connection_status: Optional[str] = None

class SendRequestToMemberCreate(BaseModel):
    member_id: str
    relationship_label: Optional[str] = "Family / Caregiver"

class MemberIncomingRequestResponse(BaseModel):
    relationship_id: str
    blind_user_id: str
    blind_user_name: str
    blind_user_canevyn_id: str
    relationship_label: str
    status: str
    created_at: str

class RevokeConnectionRequest(BaseModel):
    relationship_id: str

class ConnectionRequestCreate(BaseModel):
    canevyn_user_id: str
    relationship_label: Optional[str] = "Family / Caregiver"

class ConnectionRequestResponse(BaseModel):
    id: str
    canevyn_user_id: str
    canevyn_user_name: str
    guardian_user_id: str
    guardian_user_name: str
    guardian_phone: Optional[str] = None
    relationship_label: str
    status: str
    created_at: str

class ConnectionActionRequest(BaseModel):
    relationship_id: str
    action: str  # "approve" | "reject"

class ConnectionCancelRequest(BaseModel):
    relationship_id: str

class NotificationResponse(BaseModel):
    id: str
    category: str
    title: str
    subtitle: str
    body: str
    spoken_narration: str
    badge_text: Optional[str]
    is_read: bool = False
    created_at: str


class UserSettingsUpdate(BaseModel):
    guardian_theme: Optional[str] = None
    speech_rate: Optional[float] = Field(None, ge=0.7, le=1.8)
    voice_feedback_enabled: Optional[bool] = None
    obstacle_sensitivity: Optional[str] = None
    vibration_intensity: Optional[str] = None
    audio_alerts_enabled: Optional[bool] = None

    @field_validator("guardian_theme")
    @classmethod
    def validate_guardian_theme(cls, v):
        if v is None:
            return v
        cleaned = v.strip().lower()
        if cleaned not in ("dark", "light"):
            raise ValueError("guardian_theme must be 'dark' or 'light'.")
        return cleaned

    @field_validator("obstacle_sensitivity")
    @classmethod
    def validate_obstacle_sensitivity(cls, v):
        if v is None:
            return v
        cleaned = v.strip().capitalize()
        if cleaned not in ("Low", "Medium", "High"):
            raise ValueError("obstacle_sensitivity must be 'Low', 'Medium', or 'High'.")
        return cleaned

    @field_validator("vibration_intensity")
    @classmethod
    def validate_vibration_intensity(cls, v):
        if v is None:
            return v
        cleaned = v.strip().capitalize()
        if cleaned not in ("Off", "Gentle", "Strong"):
            raise ValueError("vibration_intensity must be 'Off', 'Gentle', or 'Strong'.")
        return cleaned
