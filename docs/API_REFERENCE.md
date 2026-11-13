# Canevyn REST & WebSocket API Reference

Base URL: `http://localhost:8000/api/v1`

## Security & Authorization Conventions
* **Authentication**: All protected endpoints require a Bearer token in the `Authorization` header:
  `Authorization: Bearer <access_token>`
* **Hashing Algorithm**: Argon2id (`time_cost=3, memory_cost=64MiB, parallelism=4`).
* **Error Status Codes**:
  * `401 Unauthorized`: Missing, malformed, or expired JWT token.
  * `403 Forbidden`: Authenticated user lacks permission (e.g. stranger querying location, unauthorized SOS relay).
  * `404 Not Found`: Resource does not exist.
  * `422 Unprocessable Entity`: Schema validation error.

---

## 1. Authentication
* `POST /auth/register`
  * Body: `{ email, password, full_name, role: "canevyn_user" | "authorized_member", phone_number }`
  * Returns: `{ access_token, token_type: "bearer", user }`
* `POST /auth/login`
  * Body: `{ email, password }`
  * Returns: `{ access_token, token_type: "bearer", user }`
* `GET /auth/me`
  * Header: `Authorization: Bearer <token>`
  * Returns: Current authenticated user profile

---

## 2. Hardware Devices
* `GET /devices/user/current`
  * Header: `Authorization: Bearer <token>`
  * Access: Authenticated Canevyn User who owns the device.
  * Returns: Canevyn Smart Stick hardware information, battery %, connection status, firmware version.
* `POST /devices/{device_id}/ping-beacon`
  * Header: `Authorization: Bearer <token>`
  * Access: Authenticated Canevyn User who owns the device.
  * Returns: `{ status: "success", message: "Buzzer ping command dispatched" }`

---

## 3. Telemetry & Location
* `POST /telemetry/ingest`
  * Header: `Authorization: Bearer <token>`
  * Access: Authenticated Canevyn User.
  * Body: `{ device_id, battery_percent, obstacle_distance_cm, obstacle_status, latitude, longitude, safe_corridor_active }`
  * Broadcasts: Real-time update to authorized guardians via WebSocket.
  * Returns: `{ status: "recorded", telemetry_id }`
* `GET /telemetry/latest/{user_id}`
  * Header: `Authorization: Bearer <token>`
  * Access: The user themselves OR an authorized guardian with `can_view_live_location = 1`.
  * Returns: Latest coordinates, safe transit corridor, obstacle status, and battery percentage.
  * Error: `403 Forbidden` if caller is not authorized.

---

## 4. Hardware SOS (Strict Physical Trigger Invariant)
* `POST /sos/hardware-trigger`
  * Header: `Authorization: Bearer <token>`
  * Access: Authenticated owner of the Canevyn device.
  * Body: `{ device_id, canevyn_user_id, trigger_origin: "PHYSICAL_HARDWARE_LATCH", latitude, longitude, tilt_degrees: 84, battery_percent }`
  * Broadcasts: Immediate high-priority `HARDWARE_SOS_ALERT` to all authorized guardians with `can_receive_sos = 1`.
  * Returns: `{ status: "emergency_broadcast_active", sos_id, timestamp }`
* `POST /sos/resolve`
  * Header: `Authorization: Bearer <token>`
  * Access: The victim OR an authorized guardian with `can_receive_sos = 1`.
  * Body: `{ sos_id, resolution_source: "LATCH_PRESS" | "APP_HOLD_3S" | "GUARDIAN_VERIFIED", notes }`
  * Broadcasts: `HARDWARE_SOS_RESOLVED` event to victim and guardians.
  * Returns: `{ status: "resolved", sos_id }`
* `GET /sos/active/{user_id}`
  * Header: `Authorization: Bearer <token>`
  * Access: The user themselves OR an authorized guardian with `can_receive_sos = 1`.
  * Returns: Active emergency incident or `{ active: false }`.

---

## 5. Guardians & Authorized Members
* `GET /guardians/list`
  * Header: `Authorization: Bearer <token>`
  * Access: Authenticated Canevyn User.
  * Returns: List of all authorized members, relationship type, and granular permissions (`can_view_live_location`, `can_receive_sos`).
* `GET /guardians/monitored-users`
  * Header: `Authorization: Bearer <token>`
  * Access: Authenticated Authorized Member.
  * Returns: List of Canevyn travelers this guardian is permitted to monitor.

---

## 6. Real-time Authenticated WebSocket
* `WS /ws/{user_id}?token=<jwt_token>`
  * Query Parameter: `token` (Required valid Bearer JWT).
  * Access Control: Connection is permitted if `jwt.sub == user_id` OR if `jwt.sub` is an authorized guardian of `user_id`.
  * Rejection: WebSocket closes with code `1008 Policy Violation` if token is invalid or caller is unauthorized.
  * Event Types Received:
    * `HARDWARE_SOS_ALERT`: High-priority alert triggered by physical stick latch.
    * `HARDWARE_SOS_RESOLVED`: Incident resolved.
    * `TELEMETRY_UPDATE`: Periodic obstacle distance, battery, and GPS coordinates.
    * `BEACON_PING`: Stick locator chirp command.
    * `PONG`: Heartbeat response to keepalive `PING`.
