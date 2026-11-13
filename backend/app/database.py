"""
Canevyn System Database Manager
Handles SQLite database connection, schema migration, constraints, and initial seed fixtures.
"""

import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime

DATABASE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "canevyn.db")

@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_FILE, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initializes tables and seeds test baseline data if empty."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Users table (Supports Canevyn User and Authorized Member roles)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            role TEXT NOT NULL CHECK(role IN ('canevyn_user', 'authorized_member', 'admin')),
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            phone_number TEXT,
            avatar_url TEXT,
            emergency_contact_phone TEXT,
            canevyn_id TEXT UNIQUE,
            settings_json TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Migration check: Ensure 'canevyn_id' column exists in users
        cursor.execute("PRAGMA table_info(users);")
        user_cols = [c[1] for c in cursor.fetchall()]
        if "canevyn_id" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN canevyn_id TEXT;")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_canevyn_id ON users(canevyn_id);")

        # Backfill or repair role-prefixed unique IDs cleanly:
        # Blind User (canevyn_user) -> CVN-XXXXX
        # Authorized Member (authorized_member) -> CVM-XXXXX
        import random
        cursor.execute("""
        SELECT id, role, canevyn_id FROM users
        WHERE canevyn_id IS NULL
           OR (role = 'canevyn_user' AND UPPER(canevyn_id) NOT LIKE 'CVN-%')
           OR (role = 'authorized_member' AND UPPER(canevyn_id) NOT LIKE 'CVM-%');
        """)
        invalid_id_rows = cursor.fetchall()
        for u in invalid_id_rows:
            if u["role"] == "canevyn_user":
                prefix = "CVN"
            elif u["role"] == "authorized_member":
                prefix = "CVM"
            else:
                continue
            new_cid = None
            for _ in range(200):
                candidate = f"{prefix}-{random.randint(10000, 99999)}"
                cursor.execute("SELECT id FROM users WHERE canevyn_id = ?;", (candidate,))
                if not cursor.fetchone():
                    new_cid = candidate
                    break
            if new_cid:
                cursor.execute("UPDATE users SET canevyn_id = ? WHERE id = ?;", (new_cid, u["id"]))

        # 2. Canevyn Hardware Devices
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            serial_number TEXT UNIQUE NOT NULL,
            model TEXT NOT NULL DEFAULT 'CX-7 Sentinel',
            firmware_version TEXT NOT NULL DEFAULT 'v4.1.0',
            hardware_revision TEXT NOT NULL DEFAULT 'CS-300-REV-B',
            ble_uuid TEXT NOT NULL DEFAULT '0000c001-0000-1000-8000-00805f9b34fb',
            ble_mac_address TEXT,
            assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            battery_percent INTEGER DEFAULT 82 CHECK(battery_percent BETWEEN 0 AND 100),
            is_charging INTEGER DEFAULT 0,
            is_connected INTEGER DEFAULT 1,
            signal_quality TEXT DEFAULT 'Strong',
            last_telemetry_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Safe column migrations for devices (battery voltage, water sensor, status timestamp, pairing)
        cursor.execute("PRAGMA table_info(devices);")
        device_cols = [col[1] for col in cursor.fetchall()]
        if "battery_voltage_mv" not in device_cols:
            cursor.execute("ALTER TABLE devices ADD COLUMN battery_voltage_mv INTEGER;")
        if "sensor_status" not in device_cols:
            cursor.execute("ALTER TABLE devices ADD COLUMN sensor_status TEXT;")
        if "water_detected" not in device_cols:
            cursor.execute("ALTER TABLE devices ADD COLUMN water_detected INTEGER;")
        if "device_timestamp" not in device_cols:
            cursor.execute("ALTER TABLE devices ADD COLUMN device_timestamp TEXT;")
        if "paired_at" not in device_cols:
            cursor.execute("ALTER TABLE devices ADD COLUMN paired_at TIMESTAMP;")

        # 3. Authorized Member / Guardian Relationships
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS guardian_relationships (
            id TEXT PRIMARY KEY,
            canevyn_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            guardian_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            relationship_label TEXT NOT NULL, -- e.g. "Primary Guardian (Son)", "Physician"
            is_primary INTEGER DEFAULT 0,
            can_receive_sos INTEGER DEFAULT 1,
            can_view_live_location INTEGER DEFAULT 1,
            can_view_telemetry INTEGER DEFAULT 1,
            is_active INTEGER DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'approved' CHECK(status IN ('pending', 'approved', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(canevyn_user_id, guardian_user_id)
        );
        """)

        # Migration check: Ensure 'status' column exists in guardian_relationships
        cursor.execute("PRAGMA table_info(guardian_relationships);")
        guardian_cols = [c[1] for c in cursor.fetchall()]
        if "status" not in guardian_cols:
            cursor.execute("ALTER TABLE guardian_relationships ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';")

        # 4. Location Records
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS location_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            altitude_meters REAL DEFAULT 15.0,
            accuracy_meters REAL DEFAULT 2.1,
            heading_degrees REAL DEFAULT 45.0,
            speed_mps REAL DEFAULT 1.2,
            address_label TEXT DEFAULT '742 Market St, San Francisco, CA',
            rtk_differential_locked INTEGER DEFAULT 1,
            transit_corridor_name TEXT DEFAULT 'Market Way Corridor',
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        cursor.execute("PRAGMA table_info(users)")
        user_columns = [col[1] for col in cursor.fetchall()]
        if "location_sharing_enabled" not in user_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN location_sharing_enabled INTEGER DEFAULT 0")
        if "last_location_at" not in user_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN last_location_at TIMESTAMP")

        cursor.execute("PRAGMA table_info(location_records)")
        location_columns = [col[1] for col in cursor.fetchall()]
        if "is_live_gps" not in location_columns:
            cursor.execute("ALTER TABLE location_records ADD COLUMN is_live_gps INTEGER DEFAULT 0")

        # 5. Hardware SOS Events (Mandatory Rule: Originated ONLY from physical cane stick)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sos_events (
            id TEXT PRIMARY KEY,
            canevyn_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            device_id TEXT NOT NULL REFERENCES devices(id),
            trigger_origin TEXT NOT NULL DEFAULT 'PHYSICAL_HARDWARE_LATCH' CHECK(trigger_origin IN ('PHYSICAL_HARDWARE_LATCH', 'STICK_DROP_IMPACT')),
            status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'RESOLVED_BY_LATCH', 'RESOLVED_BY_USER_APP', 'RESOLVED_BY_GUARDIAN')),
            trigger_latitude REAL,
            trigger_longitude REAL,
            tilt_degrees INTEGER,
            battery_percent_at_trigger INTEGER,
            audible_beacon_db INTEGER DEFAULT 95,
            emergency_contact_dialed TEXT,
            resolution_notes TEXT,
            triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP,
            resolved_by_user_id TEXT REFERENCES users(id),
            event_id TEXT UNIQUE,
            gps_accuracy_meters REAL,
            gps_recorded_at TEXT,
            gps_is_stale INTEGER DEFAULT 0,
            address_label TEXT,
            nearest_landmark TEXT,
            stick_is_connected INTEGER DEFAULT 0,
            device_timestamp TEXT
        );
        """)

        # Safe non-destructive migration for existing sos_events table (nullable coords/battery + idempotency & context cols)
        cursor.execute("PRAGMA table_info(sos_events);")
        sos_table_info = cursor.fetchall()
        sos_col_names = [col[1] for col in sos_table_info]
        lat_notnull = any(col[1] == "trigger_latitude" and col[3] == 1 for col in sos_table_info)
        if lat_notnull or "event_id" not in sos_col_names:
            cursor.execute("PRAGMA foreign_keys = OFF;")
            cursor.execute("""
            CREATE TABLE sos_events_migrated (
                id TEXT PRIMARY KEY,
                canevyn_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                device_id TEXT NOT NULL REFERENCES devices(id),
                trigger_origin TEXT NOT NULL DEFAULT 'PHYSICAL_HARDWARE_LATCH' CHECK(trigger_origin IN ('PHYSICAL_HARDWARE_LATCH', 'STICK_DROP_IMPACT')),
                status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'RESOLVED_BY_LATCH', 'RESOLVED_BY_USER_APP', 'RESOLVED_BY_GUARDIAN')),
                trigger_latitude REAL,
                trigger_longitude REAL,
                tilt_degrees INTEGER,
                battery_percent_at_trigger INTEGER,
                audible_beacon_db INTEGER DEFAULT 95,
                emergency_contact_dialed TEXT,
                resolution_notes TEXT,
                triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                resolved_by_user_id TEXT REFERENCES users(id),
                event_id TEXT UNIQUE,
                gps_accuracy_meters REAL,
                gps_recorded_at TEXT,
                gps_is_stale INTEGER DEFAULT 0,
                address_label TEXT,
                nearest_landmark TEXT,
                stick_is_connected INTEGER DEFAULT 0,
                device_timestamp TEXT
            );
            """)
            cursor.execute("""
            INSERT INTO sos_events_migrated (
                id, canevyn_user_id, device_id, trigger_origin, status,
                trigger_latitude, trigger_longitude, tilt_degrees,
                battery_percent_at_trigger, audible_beacon_db,
                emergency_contact_dialed, resolution_notes,
                triggered_at, resolved_at, resolved_by_user_id
            )
            SELECT
                id, canevyn_user_id, device_id, trigger_origin, status,
                trigger_latitude, trigger_longitude, tilt_degrees,
                battery_percent_at_trigger, audible_beacon_db,
                emergency_contact_dialed, resolution_notes,
                triggered_at, resolved_at, resolved_by_user_id
            FROM sos_events;
            """)
            cursor.execute("DROP TABLE sos_events;")
            cursor.execute("ALTER TABLE sos_events_migrated RENAME TO sos_events;")
            cursor.execute("PRAGMA foreign_keys = ON;")

        # 6. User and Guardian Notifications
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category TEXT NOT NULL CHECK(category IN ('all', 'emergency', 'hardware', 'guardian')),
            title TEXT NOT NULL,
            subtitle TEXT NOT NULL,
            body TEXT NOT NULL,
            spoken_narration TEXT NOT NULL,
            badge_text TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 7. Device Sensor Telemetry History (LiDAR, ground, IMU, water, battery)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS telemetry_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
            obstacle_distance_cm INTEGER DEFAULT 350,
            obstacle_angle_deg INTEGER DEFAULT 0,
            obstacle_status TEXT DEFAULT 'Clear Path',
            ground_tactile_profile TEXT DEFAULT 'Approaching tactile sidewalk pavers before 3rd St',
            cellular_bars INTEGER DEFAULT 4,
            cellular_band TEXT DEFAULT '4G LTE Band 12 (Emergency Priority)',
            battery_percent INTEGER,
            water_detected INTEGER,
            battery_voltage_mv INTEGER,
            sensor_status TEXT,
            device_timestamp TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        cursor.execute("PRAGMA table_info(telemetry_logs);")
        tel_cols = [col[1] for col in cursor.fetchall()]
        if "water_detected" not in tel_cols:
            cursor.execute("ALTER TABLE telemetry_logs ADD COLUMN water_detected INTEGER;")
        if "battery_voltage_mv" not in tel_cols:
            cursor.execute("ALTER TABLE telemetry_logs ADD COLUMN battery_voltage_mv INTEGER;")
        if "sensor_status" not in tel_cols:
            cursor.execute("ALTER TABLE telemetry_logs ADD COLUMN sensor_status TEXT;")
        if "device_timestamp" not in tel_cols:
            cursor.execute("ALTER TABLE telemetry_logs ADD COLUMN device_timestamp TEXT;")

        # 8. Reverse Geocode Coordinate Cache (Nominatim rate-limit & privacy protection)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS geocode_cache (
            coord_key TEXT PRIMARY KEY,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            nearest_landmark TEXT,
            road TEXT,
            chowk_or_junction TEXT,
            locality TEXT,
            city TEXT,
            district TEXT,
            state TEXT,
            display_address TEXT NOT NULL,
            raw_json TEXT,
            cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Upgrade any legacy hashes to Argon2id
        argon2_demo_hash = "$argon2id$v=19$m=65536,t=3,p=4$ifE3yfmaENHDSscW7tpMYQ$+jY34A/SZ8Qlnyewfybea9cbuuEynvV8XcnXbcaKH/Q"
        cursor.execute("UPDATE users SET hashed_password = ? WHERE hashed_password LIKE 'pbkdf2:%';", (argon2_demo_hash,))

        # Ensure canonical demo blind user Arthur Vance has CaneVyn User ID CVN-10482
        cursor.execute("UPDATE users SET canevyn_id = 'CVN-10482' WHERE id = 'usr-arthur-vance';")

        # Seed initial canonical demo profiles matching UI/UX design truth
        _seed_demo_data(cursor)

def _seed_demo_data(cursor):
    """Populates Arthur Vance (Canevyn User), Marcus & Elena (Guardians), and CX-7 stick."""
    cursor.execute("SELECT COUNT(*) FROM users;")
    if cursor.fetchone()[0] > 0:
        return

    argon2_demo_hash = "$argon2id$v=19$m=65536,t=3,p=4$ifE3yfmaENHDSscW7tpMYQ$+jY34A/SZ8Qlnyewfybea9cbuuEynvV8XcnXbcaKH/Q"

    # Canevyn User: Arthur Vance
    cursor.execute("""
    INSERT INTO users (id, role, full_name, email, hashed_password, phone_number, emergency_contact_phone, settings_json, canevyn_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        "usr-arthur-vance",
        "canevyn_user",
        "Arthur Vance",
        "arthur.vance@example.com",
        argon2_demo_hash,
        "(415) 555-0188",
        "sos",
        '{"voice_feedback_rate": 1.0, "obstacle_sensitivity": "High", "haptic_strength": "Strong", "high_contrast": true, "latch_delay": "Instant (0s)"}',
        "CVN-10482"
    ))

    # Authorized Member 1: Marcus Vance (Son)
    cursor.execute("""
    INSERT INTO users (id, role, full_name, email, hashed_password, phone_number, emergency_contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    """, (
        "guard-marcus-vance",
        "authorized_member",
        "Marcus Vance",
        "marcus.vance@example.com",
        argon2_demo_hash,
        "(415) 555-0192",
        "(415) 555-0188"
    ))

    # Authorized Member 2: Dr. Elena Rostova (Physician)
    cursor.execute("""
    INSERT INTO users (id, role, full_name, email, hashed_password, phone_number, emergency_contact_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?);
    """, (
        "guard-elena-rostova",
        "authorized_member",
        "Dr. Elena Rostova",
        "dr.rostova@example.com",
        argon2_demo_hash,
        "(415) 555-0199",
        "(415) 555-0188"
    ))

    # Canevyn Smart Stick hardware device
    cursor.execute("""
    INSERT INTO devices (id, serial_number, model, firmware_version, hardware_revision, ble_mac_address, assigned_user_id, battery_percent, is_charging, is_connected)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        "dev-canevyn-004",
        "CNV-9942",
        "Canevyn CX-7 Sentinel",
        "v4.1.0",
        "CS-300-REV-B",
        "E4:5F:01:23:45:67",
        "usr-arthur-vance",
        82,
        0,
        1
    ))

    # Guardian Links
    cursor.execute("""
    INSERT INTO guardian_relationships (id, canevyn_user_id, guardian_user_id, relationship_label, is_primary, can_receive_sos, can_view_live_location, can_view_telemetry, is_active, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        "rel-1",
        "usr-arthur-vance",
        "guard-marcus-vance",
        "Primary Guardian (Son)",
        1, 1, 1, 1, 1, 'approved'
    ))
    cursor.execute("""
    INSERT INTO guardian_relationships (id, canevyn_user_id, guardian_user_id, relationship_label, is_primary, can_receive_sos, can_view_live_location, can_view_telemetry, is_active, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        "rel-2",
        "usr-arthur-vance",
        "guard-elena-rostova",
        "Personal Physician",
        0, 1, 1, 1, 1, 'approved'
    ))

    # Current Location Seed
    cursor.execute("""
    INSERT INTO location_records (user_id, device_id, latitude, longitude, altitude_meters, accuracy_meters, heading_degrees, speed_mps, address_label, rtk_differential_locked, transit_corridor_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        "usr-arthur-vance",
        "dev-canevyn-004",
        37.7879,
        -122.4034,
        14.2,
        2.1,
        45.0,
        1.1,
        "742 Market St, San Francisco, CA",
        1,
        "Market Way Corridor"
    ))

    # Telemetry Log
    cursor.execute("""
    INSERT INTO telemetry_logs (device_id, obstacle_distance_cm, obstacle_angle_deg, obstacle_status, ground_tactile_profile, cellular_bars, cellular_band, battery_percent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        "dev-canevyn-004",
        350,
        0,
        "Obstacle Radar: Active - Scanning 3.5m ahead",
        "Approaching tactile sidewalk pavers before 3rd St intersection",
        4,
        "4G LTE Band 12 (Emergency Priority)",
        82
    ))

    # Baseline Notifications matching UI/UX reference
    notifications = [
        ("notif-1", "usr-arthur-vance", "emergency", "Hardware SOS Cancelled", "Physical latch pressed to cancel emergency broadcast.", "Automated confirmation dispatched to Marcus & Dr. Elena. Cane status safe.", "Canevyn has alerted your guardians that emergency broadcast is cancelled.", "Verified by Latch"),
        ("notif-2", "usr-arthur-vance", "hardware", "Stick Battery at 18%", "Below 20% safety threshold for haptic navigation.", "Remember to dock the Canevyn Smart Stick onto the magnetic bedside charging cradle.", "Warning: Cane stick battery is below twenty percent. Please dock to charge.", "Dock Needed"),
        ("notif-3", "usr-arthur-vance", "guardian", "Safe Transit Corridor Active", "Marcus Vance confirmed corridor waypoint link.", "You are tracking nominal on the designated Market Way Corridor with RTK Differential Lock.", "Transit corridor active with guardian link confirmed.", "Safe Corridor"),
        ("notif-4", "usr-arthur-vance", "hardware", "Firmware v4.1 Synced", "All LiDAR & IMU sensors calibrated successfully.", "Sensor array diagnostics test passed with optimal 98% battery cell health.", "Stick diagnostics nominal. All obstacle radars calibrated.", "Nominal")
    ]
    for nid, uid, cat, title, sub, body, spoken, badge in notifications:
        cursor.execute("""
        INSERT INTO notifications (id, user_id, category, title, subtitle, body, spoken_narration, badge_text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (nid, uid, cat, title, sub, body, spoken, badge))
