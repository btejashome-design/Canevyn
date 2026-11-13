# Canevyn Database Schema Specification

## 1. Overview
The Canevyn persistence layer is built on SQLite3 with foreign keys enabled, complete relational integrity, and strict constraints reflecting real hardware-assistive protocols.

## 2. Entity Relational Design

```
 users (id PK)
   ├── devices (assigned_user_id FK)
   ├── guardian_relationships (canevyn_user_id FK, guardian_user_id FK)
   ├── location_records (user_id FK, device_id FK)
   ├── sos_events (canevyn_user_id FK, device_id FK, resolved_by_user_id FK)
   ├── notifications (user_id FK)
   └── telemetry_logs (device_id FK)
```

## 3. Tables Detail

### `users`
* `id` (TEXT, PK): Unique identifier (`usr-...`, `guard-...`)
* `role` (TEXT, NOT NULL): `'canevyn_user'` or `'authorized_member'`
* `full_name` (TEXT, NOT NULL)
* `email` (TEXT, UNIQUE, NOT NULL)
* `hashed_password` (TEXT, NOT NULL)
* `phone_number` (TEXT)
* `emergency_contact_phone` (TEXT, DEFAULT `'sos'`)
* `settings_json` (TEXT)
* `created_at`, `updated_at` (TIMESTAMP)

### `devices`
* `id` (TEXT, PK): Hardware identifier (`dev-canevyn-004`)
* `serial_number` (TEXT, UNIQUE): E.g. `CNV-9942`
* `model` (TEXT): `Canevyn CX-7 Sentinel`
* `firmware_version` (TEXT): `v4.1.0`
* `hardware_revision` (TEXT): `CS-300-REV-B`
* `ble_mac_address` (TEXT)
* `assigned_user_id` (TEXT, FK -> users.id)
* `battery_percent` (INTEGER, 0–100)
* `is_connected` (INTEGER, 0 or 1)
* `is_charging` (INTEGER, 0 or 1)
* `last_telemetry_at` (TIMESTAMP)

### `guardian_relationships`
* `id` (TEXT, PK)
* `canevyn_user_id` (TEXT, FK -> users.id)
* `guardian_user_id` (TEXT, FK -> users.id)
* `relationship_label` (TEXT): E.g. `'Primary Guardian (Son)'`, `'Personal Physician'`
* `is_primary` (INTEGER, 0 or 1)
* `can_receive_sos` (INTEGER, 1)
* `can_view_live_location` (INTEGER, 1)
* `can_view_telemetry` (INTEGER, 1)
* `is_active` (INTEGER, 1)

### `sos_events`
* `id` (TEXT, PK)
* `canevyn_user_id` (TEXT, FK -> users.id)
* `device_id` (TEXT, FK -> devices.id)
* `trigger_origin` (TEXT, CHECK): `'PHYSICAL_HARDWARE_LATCH'`, `'STICK_DROP_IMPACT'`
* `status` (TEXT, CHECK): `'ACTIVE'`, `'RESOLVED_BY_LATCH'`, `'RESOLVED_BY_USER_APP'`, `'RESOLVED_BY_GUARDIAN'`
* `trigger_latitude` (REAL, NOT NULL)
* `trigger_longitude` (REAL, NOT NULL)
* `tilt_degrees` (INTEGER, DEFAULT 84)
* `battery_percent_at_trigger` (INTEGER, DEFAULT 82)
* `audible_beacon_db` (INTEGER, DEFAULT 95)
* `emergency_contact_dialed` (TEXT)
* `triggered_at`, `resolved_at` (TIMESTAMP)
* `resolved_by_user_id` (TEXT, FK -> users.id)

### `location_records`
* `id` (INTEGER, PK AUTOINCREMENT)
* `user_id` (TEXT, FK -> users.id)
* `device_id` (TEXT, FK -> devices.id)
* `latitude`, `longitude` (REAL, NOT NULL)
* `altitude_meters`, `accuracy_meters`, `heading_degrees`, `speed_mps` (REAL)
* `address_label` (TEXT)
* `rtk_differential_locked` (INTEGER, 0 or 1)
* `transit_corridor_name` (TEXT)
* `recorded_at` (TIMESTAMP)

### `telemetry_logs`
* `id` (INTEGER, PK AUTOINCREMENT)
* `device_id` (TEXT, FK -> devices.id)
* `obstacle_distance_cm` (INTEGER)
* `obstacle_angle_deg` (INTEGER)
* `obstacle_status` (TEXT)
* `ground_tactile_profile` (TEXT)
* `cellular_bars` (INTEGER)
* `cellular_band` (TEXT)
* `battery_percent` (INTEGER)
* `created_at` (TIMESTAMP)

### `notifications`
* `id` (TEXT, PK)
* `user_id` (TEXT, FK -> users.id)
* `category` (TEXT, CHECK): `'all'`, `'emergency'`, `'hardware'`, `'guardian'`
* `title`, `subtitle`, `body`, `spoken_narration` (TEXT)
* `badge_text` (TEXT)
* `is_read` (INTEGER, 0 or 1)
* `created_at` (TIMESTAMP)
