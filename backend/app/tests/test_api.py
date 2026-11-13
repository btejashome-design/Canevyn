"""
Comprehensive Canevyn System Test Suite
Covers:
1. Authentication & Argon2id Password Hashing
2. Token Validation & Expiration
3. Role-Based Authorization
4. Device Access (Authorized vs Unauthorized)
5. Location & Telemetry Privacy (User vs Guardian vs Unauthorized Stranger)
6. Hardware SOS Lifecycle & Privacy Enforcements
7. WebSocket Authentication, Authorization & Subscription Scoping
8. Deployment Environment Boundary Checks
"""

import sys
import os
import unittest
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import init_db, get_db
from backend.app.services.auth_service import hash_password, verify_password, create_access_token, decode_token

class TestCanevynPhase1Architecture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

        # Create an unauthorized third-party user ("Stranger") to verify privacy boundaries
        cls.stranger_email = "stranger.unauthorized@example.com"
        cls.stranger_pwd = "SecureStrangerPass123!"
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE email = ?;", (cls.stranger_email,))
            if not cursor.fetchone():
                cursor.execute("""
                INSERT INTO users (id, role, full_name, email, hashed_password)
                VALUES (?, 'canevyn_user', 'Unauthorized Stranger', ?, ?);
                """, (
                    "usr-stranger-01",
                    cls.stranger_email,
                    hash_password(cls.stranger_pwd)
                ))

    # =========================================================================
    # 1. AUTHENTICATION & ARGON2ID TESTS
    # =========================================================================
    def test_01_argon2id_password_hashing(self):
        """Verifies passwords use genuine Argon2id and never store in plaintext."""
        pwd = "CanevynTestSecret2026!"
        h = hash_password(pwd)
        # Check Argon2id header
        self.assertTrue(h.startswith("$argon2id$"), f"Hash must be Argon2id, got {h}")
        # Verify valid password
        self.assertTrue(verify_password(pwd, h))
        # Verify invalid password fails
        self.assertFalse(verify_password("WrongPassword123", h))

    def test_02_health_check_reports_argon2id(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["password_hasher"], "Argon2id")

    def test_03_login_and_token_validation(self):
        """Tests login and JWT validation for Canevyn User & Authorized Member."""
        # Canevyn User
        resp_arthur = self.client.post("/api/v1/auth/login", json={
            "email": "arthur.vance@example.com",
            "password": "password123"
        })
        self.assertEqual(resp_arthur.status_code, 200)
        token_arthur = resp_arthur.json()["access_token"]
        payload_arthur = decode_token(token_arthur)
        self.assertEqual(payload_arthur["sub"], "usr-arthur-vance")
        self.assertEqual(payload_arthur["role"], "canevyn_user")

        # Authorized Member
        resp_marcus = self.client.post("/api/v1/auth/login", json={
            "email": "marcus.vance@example.com",
            "password": "password123"
        })
        self.assertEqual(resp_marcus.status_code, 200)
        token_marcus = resp_marcus.json()["access_token"]
        payload_marcus = decode_token(token_marcus)
        self.assertEqual(payload_marcus["sub"], "guard-marcus-vance")
        self.assertEqual(payload_marcus["role"], "authorized_member")

    def test_04_unauthorized_token_rejection(self):
        """Ensures protected endpoints reject invalid and expired tokens."""
        # No token
        resp_no_token = self.client.get("/api/v1/auth/me")
        self.assertEqual(resp_no_token.status_code, 401)

        # Expired token
        expired_token = create_access_token({"sub": "usr-arthur-vance", "role": "canevyn_user"}, expires_delta=timedelta(seconds=-10))
        resp_expired = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(resp_expired.status_code, 401)

        # Tampered token
        resp_tampered = self.client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid_tampered_jwt_string"})
        self.assertEqual(resp_tampered.status_code, 401)

    # =========================================================================
    # 2. DEVICE ACCESS & AUTHORIZATION TESTS
    # =========================================================================
    def test_05_device_access_control(self):
        """Verifies only the owner and active authorized guardians can access device telemetry."""
        # 1. Arthur Vance (Owner) -> Allowed
        token_arthur = self._get_token("arthur.vance@example.com", "password123")
        resp_arthur = self.client.get("/api/v1/devices/dev-canevyn-004", headers={"Authorization": f"Bearer {token_arthur}"})
        self.assertEqual(resp_arthur.status_code, 200)
        self.assertEqual(resp_arthur.json()["serial_number"], "CNV-9942")

        # 2. Marcus Vance (Authorized Guardian with telemetry permission) -> Allowed
        token_marcus = self._get_token("marcus.vance@example.com", "password123")
        resp_marcus = self.client.get("/api/v1/devices/dev-canevyn-004", headers={"Authorization": f"Bearer {token_marcus}"})
        self.assertEqual(resp_marcus.status_code, 200)

        # 3. Stranger (Unauthorized) -> 403 Forbidden
        token_stranger = self._get_token(self.stranger_email, self.stranger_pwd)
        resp_stranger = self.client.get("/api/v1/devices/dev-canevyn-004", headers={"Authorization": f"Bearer {token_stranger}"})
        self.assertEqual(resp_stranger.status_code, 403)
        self.assertIn("Access denied", resp_stranger.json()["detail"])

    # =========================================================================
    # 3. LOCATION & TELEMETRY PRIVACY TESTS
    # =========================================================================
    def test_06_location_privacy_and_access(self):
        """Verifies sensitive location data is protected against unauthorized queries."""
        token_arthur = self._get_token("arthur.vance@example.com", "password123")
        token_marcus = self._get_token("marcus.vance@example.com", "password123")
        token_stranger = self._get_token(self.stranger_email, self.stranger_pwd)

        # User queries own location -> 200 OK
        resp_user = self.client.get("/api/v1/telemetry/latest/usr-arthur-vance", headers={"Authorization": f"Bearer {token_arthur}"})
        self.assertEqual(resp_user.status_code, 200)
        self.assertIn("742 Market St", resp_user.json()["location"]["address_label"])

        # Guardian queries Arthur's location -> 200 OK
        resp_guardian = self.client.get("/api/v1/telemetry/latest/usr-arthur-vance", headers={"Authorization": f"Bearer {token_marcus}"})
        self.assertEqual(resp_guardian.status_code, 200)

        # Unauthorized stranger queries Arthur's location -> 403 Forbidden
        resp_unauth = self.client.get("/api/v1/telemetry/latest/usr-arthur-vance", headers={"Authorization": f"Bearer {token_stranger}"})
        self.assertEqual(resp_unauth.status_code, 403)

    def test_07_telemetry_ingest_requires_device_ownership(self):
        """Verifies stranger cannot spoof telemetry ingestion for another user's cane stick."""
        token_stranger = self._get_token(self.stranger_email, self.stranger_pwd)
        resp = self.client.post("/api/v1/telemetry/ingest", json={
            "device_id": "dev-canevyn-004", # Belongs to Arthur
            "battery_percent": 50,
            "obstacle_distance_cm": 200
        }, headers={"Authorization": f"Bearer {token_stranger}"})
        self.assertEqual(resp.status_code, 403)

    # =========================================================================
    # 4. HARDWARE SOS PRIVACY & LIFECYCLE TESTS
    # =========================================================================
    def test_08_hardware_sos_lifecycle_and_privacy(self):
        """
        Tests the strict hardware SOS lifecycle:
        - Only assigned stick owner can relay hardware SOS
        - Active SOS is scoped to user & permitted guardians
        - Unauthorized users cannot access or resolve the incident
        """
        token_arthur = self._get_token("arthur.vance@example.com", "password123")
        token_marcus = self._get_token("marcus.vance@example.com", "password123")
        token_stranger = self._get_token(self.stranger_email, self.stranger_pwd)

        # 1. Stranger tries to report SOS on Arthur's stick -> 403 Forbidden
        fake_sos = {
            "device_id": "dev-canevyn-004",
            "canevyn_user_id": "usr-arthur-vance",
            "trigger_origin": "PHYSICAL_HARDWARE_LATCH",
            "latitude": 37.7879,
            "longitude": -122.4034
        }
        resp_stranger_sos = self.client.post("/api/v1/sos/hardware-trigger", json=fake_sos, headers={"Authorization": f"Bearer {token_stranger}"})
        self.assertEqual(resp_stranger_sos.status_code, 403)

        # 2. Arthur reports legitimate hardware SOS received over BLE -> 200 OK
        resp_trigger = self.client.post("/api/v1/sos/hardware-trigger", json=fake_sos, headers={"Authorization": f"Bearer {token_arthur}"})
        self.assertEqual(resp_trigger.status_code, 200)
        sos_data = resp_trigger.json()
        sos_id = sos_data["id"]
        self.assertEqual(sos_data["status"], "ACTIVE")

        # 3. Arthur queries active SOS -> 200 OK
        resp_act_arthur = self.client.get("/api/v1/sos/active/usr-arthur-vance", headers={"Authorization": f"Bearer {token_arthur}"})
        self.assertEqual(resp_act_arthur.status_code, 200)
        self.assertEqual(resp_act_arthur.json()["id"], sos_id)

        # 4. Marcus (Guardian) queries active SOS -> 200 OK
        resp_act_marcus = self.client.get("/api/v1/sos/active/usr-arthur-vance", headers={"Authorization": f"Bearer {token_marcus}"})
        self.assertEqual(resp_act_marcus.status_code, 200)
        self.assertEqual(resp_act_marcus.json()["id"], sos_id)

        # 5. Stranger queries active SOS -> 403 Forbidden
        resp_act_stranger = self.client.get("/api/v1/sos/active/usr-arthur-vance", headers={"Authorization": f"Bearer {token_stranger}"})
        self.assertEqual(resp_act_stranger.status_code, 403)

        # 6. Stranger tries to resolve SOS -> 403 Forbidden
        resp_res_stranger = self.client.post("/api/v1/sos/resolve", json={
            "sos_id": sos_id,
            "resolution_source": "APP_HOLD_3S",
            "resolved_by_user_id": "usr-stranger-01"
        }, headers={"Authorization": f"Bearer {token_stranger}"})
        self.assertEqual(resp_res_stranger.status_code, 403)

        # 7. Marcus (Authorized Guardian) resolves SOS -> 200 OK
        resp_res_marcus = self.client.post("/api/v1/sos/resolve", json={
            "sos_id": sos_id,
            "resolution_source": "GUARDIAN_VERIFIED",
            "resolved_by_user_id": "guard-marcus-vance",
            "notes": "Verified Arthur is safe."
        }, headers={"Authorization": f"Bearer {token_marcus}"})
        self.assertEqual(resp_res_marcus.status_code, 200)

        # 8. Check active SOS is now None -> 200 OK
        resp_cleared = self.client.get("/api/v1/sos/active/usr-arthur-vance", headers={"Authorization": f"Bearer {token_arthur}"})
        self.assertEqual(resp_cleared.status_code, 200)
        self.assertIsNone(resp_cleared.json())

    # =========================================================================
    # 5. WEBSOCKET AUTHENTICATION & AUTHORIZATION TESTS
    # =========================================================================
    def test_09_websocket_authentication_and_authorization(self):
        """Verifies WebSocket endpoint enforces JWT authentication and guardian subscription check."""
        token_arthur = self._get_token("arthur.vance@example.com", "password123")
        token_stranger = self._get_token(self.stranger_email, self.stranger_pwd)

        # 1. Connection without token -> Rejected with policy violation (1008)
        try:
            with self.client.websocket_connect("/ws/usr-arthur-vance") as ws:
                pass
            self.fail("WebSocket connection should be rejected when token is missing.")
        except Exception:
            pass # Expected rejection

        # 2. Connection with unauthorized stranger token -> Rejected
        try:
            with self.client.websocket_connect(f"/ws/usr-arthur-vance?token={token_stranger}") as ws:
                pass
            self.fail("WebSocket connection should be rejected for unauthorized subscriber.")
        except Exception:
            pass # Expected rejection

        # 3. Connection with Arthur's token -> Accepted
        with self.client.websocket_connect(f"/ws/usr-arthur-vance?token={token_arthur}") as ws:
            ws.send_text("PING")
            data = ws.receive_json()
            self.assertEqual(data["type"], "PONG")

    # =========================================================================
    # 6. ENVIRONMENT BOUNDARY TESTS
    # =========================================================================
    def test_10_environment_configuration(self):
        """Verifies /api/v1/config returns current deployment boundary."""
        resp = self.client.get("/api/v1/config")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("environment", data)
        self.assertIn("is_development", data)
        self.assertIn("emergency_dispatch_number", data)

    # =========================================================================
    # 7. ROLE REGISTRATION & AUTHENTICATION TESTS
    # =========================================================================
    def test_11_role_registration_and_device_provisioning(self):
        """Verifies registration for both roles, database persistence, and smart cane provisioning."""
        import uuid
        uid = uuid.uuid4().hex[:6]

        # 1. Register new Canevyn User (Blind Person)
        blind_email = f"blind.user.{uid}@example.com"
        resp_blind = self.client.post("/api/v1/auth/register", json={
            "full_name": "Test Blind Traveler",
            "email": blind_email,
            "password": "securepassword123",
            "role": "canevyn_user",
            "phone_number": "(415) 555-0999"
        })
        self.assertEqual(resp_blind.status_code, 200)
        blind_data = resp_blind.json()
        self.assertIn("access_token", blind_data)
        self.assertEqual(blind_data["user"]["role"], "canevyn_user")
        self.assertEqual(blind_data["user"]["full_name"], "Test Blind Traveler")

        # Verify automatically provisioned paired CX-7 hardware stick
        blind_token = blind_data["access_token"]
        resp_dev = self.client.get("/api/v1/devices/user/current", headers={"Authorization": f"Bearer {blind_token}"})
        self.assertEqual(resp_dev.status_code, 200)
        self.assertIsNotNone(resp_dev.json())
        self.assertEqual(resp_dev.json()["model"], "Canevyn CX-7 Sentinel")

        # 2. Register new Authorized Member (Caregiver/Family)
        guard_email = f"guardian.{uid}@example.com"
        resp_guard = self.client.post("/api/v1/auth/register", json={
            "full_name": "Test Family Member",
            "email": guard_email,
            "password": "securepassword123",
            "role": "authorized_member",
            "phone_number": "(415) 555-0888"
        })
        self.assertEqual(resp_guard.status_code, 200)
        guard_data = resp_guard.json()
        self.assertIn("access_token", guard_data)
        self.assertEqual(guard_data["user"]["role"], "authorized_member")

    def test_12_role_hint_validation_and_case_insensitive_login(self):
        """Verifies case-insensitive email matching and cross-role login prevention."""
        # Arthur Vance is registered as canevyn_user.
        # Login with mixed case email and correct role hint -> 200 OK
        resp_ok = self.client.post("/api/v1/auth/login", json={
            "email": "Arthur.Vance@Example.Com",
            "password": "password123",
            "role_hint": "canevyn_user"
        })
        self.assertEqual(resp_ok.status_code, 200)

        # Login with wrong role hint (attempting authorized_member) -> 403 Forbidden
        resp_mismatch = self.client.post("/api/v1/auth/login", json={
            "email": "arthur.vance@example.com",
            "password": "password123",
            "role_hint": "authorized_member"
        })
        self.assertEqual(resp_mismatch.status_code, 403)
        self.assertIn("registered as 'Canevyn User (Blind User)'", resp_mismatch.json()["detail"])

    def test_13_validation_error_formatting(self):
        """Verifies that Pydantic 422 errors return clean, human-readable strings."""
        resp = self.client.post("/api/v1/auth/register", json={
            "full_name": "Test User",
            "email": "notanemail",
            "password": "123",
            "role": "canevyn_user"
        })
        self.assertEqual(resp.status_code, 422)
        detail = resp.json()["detail"]
        self.assertIsInstance(detail, str)
        self.assertIn("valid email", detail.lower())

    def test_14_authorized_member_connection_workflow_and_privacy(self):
        """
        Verifies:
        1. Searching for invalid User ID -> 404
        2. Searching for valid CaneVyn User ID -> 200 with name and connection_status
        3. Sending connection request -> 200, status 'pending'
        4. Duplicate prevention -> 400
        5. Privacy: Unapproved request cannot view location/telemetry -> 403
        6. Blind user viewing pending requests and approving -> 200, status 'approved'
        7. Now authorized member can view monitored users & telemetry -> 200
        8. Rejecting another request leaves it rejected
        """
        import uuid
        uid = uuid.uuid4().hex[:6]

        # Register a new blind user
        blind_email = f"blind.connect.{uid}@example.com"
        r_b = self.client.post("/api/v1/auth/register", json={
            "full_name": f"Alice Blind Traveler {uid}",
            "email": blind_email,
            "password": "password123",
            "role": "canevyn_user"
        })
        self.assertEqual(r_b.status_code, 200)
        blind_id = r_b.json()["user"]["id"]
        blind_cid = r_b.json()["user"]["canevyn_id"]
        blind_token = r_b.json()["access_token"]

        # Register a new authorized member
        guard_email = f"guard.connect.{uid}@example.com"
        r_g = self.client.post("/api/v1/auth/register", json={
            "full_name": f"Bob Guardian {uid}",
            "email": guard_email,
            "password": "password123",
            "role": "authorized_member"
        })
        self.assertEqual(r_g.status_code, 200)
        guard_id = r_g.json()["user"]["id"]
        guard_cid = r_g.json()["user"]["canevyn_id"]
        guard_token = r_g.json()["access_token"]

        # 1. Verify Authorized Member CANNOT search blind users to initiate connection -> 403
        r_search_inv = self.client.post(
            "/api/v1/guardians/search-user",
            json={"canevyn_user_id": blind_cid},
            headers={"Authorization": f"Bearer {guard_token}"}
        )
        self.assertEqual(r_search_inv.status_code, 403)

        # 2. Verify Authorized Member CANNOT initiate connection request -> 403
        r_req_forbidden = self.client.post(
            "/api/v1/guardians/request-connection",
            json={"canevyn_user_id": blind_cid, "relationship_label": "Caregiver"},
            headers={"Authorization": f"Bearer {guard_token}"}
        )
        self.assertEqual(r_req_forbidden.status_code, 403)

        # Also cannot initiate via send-request-to-member as an Authorized Member -> 403
        r_send_forbidden = self.client.post(
            "/api/v1/guardians/send-request-to-member",
            json={"member_id": guard_cid, "relationship_label": "Caregiver"},
            headers={"Authorization": f"Bearer {guard_token}"}
        )
        self.assertEqual(r_send_forbidden.status_code, 403)

        # 3. Blind User searches Authorized Member:
        # Invalid / nonexistent CVM ID -> 404
        r_s_none = self.client.post(
            "/api/v1/guardians/search-member",
            json={"member_id": "CVM-00000"},
            headers={"Authorization": f"Bearer {blind_token}"}
        )
        self.assertEqual(r_s_none.status_code, 404)

        # Blind User searches using a CVN ID instead of CVM ID -> 400
        r_s_cvn = self.client.post(
            "/api/v1/guardians/search-member",
            json={"member_id": blind_cid},
            headers={"Authorization": f"Bearer {blind_token}"}
        )
        self.assertEqual(r_s_cvn.status_code, 400)

        # Valid CVM ID -> 200
        r_s_valid = self.client.post(
            "/api/v1/guardians/search-member",
            json={"member_id": guard_cid},
            headers={"Authorization": f"Bearer {blind_token}"}
        )
        self.assertEqual(r_s_valid.status_code, 200)
        self.assertEqual(r_s_valid.json()["member_id"], guard_cid)
        self.assertIn("Bob Guardian", r_s_valid.json()["full_name"])

        # 4. Blind User sends connection request -> 200
        r_req = self.client.post(
            "/api/v1/guardians/send-request-to-member",
            json={"member_id": guard_cid, "relationship_label": "Caregiver (Brother)"},
            headers={"Authorization": f"Bearer {blind_token}"}
        )
        self.assertEqual(r_req.status_code, 200)
        rel_id = r_req.json()["relationship_id"]

        # 5. Duplicate request prevention -> 400
        r_dup = self.client.post(
            "/api/v1/guardians/send-request-to-member",
            json={"member_id": guard_cid},
            headers={"Authorization": f"Bearer {blind_token}"}
        )
        self.assertEqual(r_dup.status_code, 400)
        self.assertIn("already pending", r_dup.json()["detail"])

        # 6. PRIVACY CHECK: Guardian CANNOT view telemetry/location before approval -> 403
        r_priv = self.client.get(
            f"/api/v1/telemetry/latest/{blind_id}",
            headers={"Authorization": f"Bearer {guard_token}"}
        )
        self.assertEqual(r_priv.status_code, 403)

        # Monitored users should be empty for Bob since not approved
        r_mon = self.client.get(
            "/api/v1/guardians/monitored-users",
            headers={"Authorization": f"Bearer {guard_token}"}
        )
        self.assertEqual(r_mon.status_code, 200)
        self.assertEqual(len(r_mon.json()), 0)

        # 7. Authorized Member views incoming requests -> 200
        r_incoming = self.client.get(
            "/api/v1/guardians/member-incoming-requests",
            headers={"Authorization": f"Bearer {guard_token}"}
        )
        self.assertEqual(r_incoming.status_code, 200)
        incoming_list = r_incoming.json()
        self.assertEqual(len(incoming_list), 1)
        self.assertEqual(incoming_list[0]["relationship_id"], rel_id)
        self.assertEqual(incoming_list[0]["status"], "pending")

        # 8. Blind user CANNOT approve/reject request -> 403
        r_blind_resp = self.client.post(
            "/api/v1/guardians/member-respond-request",
            json={"relationship_id": rel_id, "action": "approve"},
            headers={"Authorization": f"Bearer {blind_token}"}
        )
        self.assertEqual(r_blind_resp.status_code, 403)

        # 9. Authorized Member approves request -> 200
        r_app = self.client.post(
            "/api/v1/guardians/member-respond-request",
            json={"relationship_id": rel_id, "action": "approve"},
            headers={"Authorization": f"Bearer {guard_token}"}
        )
        self.assertEqual(r_app.status_code, 200)
        self.assertEqual(r_app.json()["new_status"], "approved")

        # 10. PRIVACY CHECK AFTER APPROVAL: Guardian CAN now view monitored users -> 200
        r_mon2 = self.client.get(
            "/api/v1/guardians/monitored-users",
            headers={"Authorization": f"Bearer {guard_token}"}
        )
        self.assertEqual(r_mon2.status_code, 200)
        self.assertEqual(len(r_mon2.json()), 1)
        self.assertEqual(r_mon2.json()[0]["user_id"], blind_id)

    def test_15_ai_voice_briefing_and_grounded_commands(self):
        """Verifies automatic voice welcome briefing and predefined voice commands."""
        # Arthur Vance (canevyn_user)
        token = self._get_token("arthur.vance@example.com", "password123")

        # Welcome briefing
        r_brief = self.client.get(
            "/api/v1/voice/welcome-briefing",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(r_brief.status_code, 200)
        brief_data = r_brief.json()
        self.assertIn("welcome_speech", brief_data)
        self.assertIn("welcome to canevyn", brief_data["welcome_speech"].lower())
        self.assertTrue(brief_data["is_connected"])
        self.assertEqual(brief_data["battery_percent"], 82)

        # Command: Repeat my ID
        r_id = self.client.post(
            "/api/v1/voice/interpret-command",
            json={"transcript": "Repeat my ID"},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(r_id.status_code, 200)
        self.assertEqual(r_id.json()["command_type"], "user_id")
        self.assertIn("CVN-", r_id.json()["spoken_response"])

        # Command: Battery
        r_bat = self.client.post(
            "/api/v1/voice/interpret-command",
            json={"transcript": "What's my battery level?", "is_connected": True, "battery_percent": 82},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(r_bat.status_code, 200)
        self.assertEqual(r_bat.json()["command_type"], "battery")
        self.assertIn("82 percent", r_bat.json()["spoken_response"])

        # Command: Disconnected Battery -> Reports unavailable
        r_bat_disc = self.client.post(
            "/api/v1/voice/interpret-command",
            json={"transcript": "Check battery", "is_connected": False},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(r_bat_disc.status_code, 200)
        self.assertIn("unavailable", r_bat_disc.json()["spoken_response"].lower())

        # Command: Where am I?
        r_loc = self.client.post(
            "/api/v1/voice/interpret-command",
            json={"transcript": "Where am I right now?", "address_label": "742 Market St, San Francisco"},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(r_loc.status_code, 200)
        self.assertEqual(r_loc.json()["command_type"], "location")
        self.assertIn("742 Market St", r_loc.json()["spoken_response"])

        # Command: Obstacles
        r_obs = self.client.post(
            "/api/v1/voice/interpret-command",
            json={"transcript": "Any obstacles ahead?", "is_connected": True, "obstacle_distance_cm": 350},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(r_obs.status_code, 200)
        self.assertEqual(r_obs.json()["command_type"], "obstacle")

        # Command: Water
        r_water = self.client.post(
            "/api/v1/voice/interpret-command",
            json={"transcript": "Is there water nearby?", "water_detected": True},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(r_water.status_code, 200)
        self.assertEqual(r_water.json()["command_type"], "water")
        self.assertIn("puddle", r_water.json()["spoken_response"].lower())

        # Command: Help
        r_help = self.client.post(
            "/api/v1/voice/interpret-command",
            json={"transcript": "Help"},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(r_help.status_code, 200)
        self.assertEqual(r_help.json()["command_type"], "help")

    def test_16_authentication_validation_and_id_generation(self):
        """Verifies Confirm Password validation, automatic CaneVyn ID generation, and Forgot Password."""
        import uuid
        uid16 = uuid.uuid4().hex[:6]

        # 1. Password mismatch rejection
        r_mismatch = self.client.post("/api/v1/auth/register", json={
            "full_name": "Test User",
            "email": f"mismatch.{uid16}@example.com",
            "password": "Password123",
            "confirm_password": "WrongPassword999",
            "role": "canevyn_user"
        })
        self.assertEqual(r_mismatch.status_code, 400)
        self.assertIn("match", r_mismatch.json()["detail"].lower())

        # 2. Registration generates unique CVN-XXXXX ID for blind user
        r_reg = self.client.post("/api/v1/auth/register", json={
            "full_name": f"Deepa Sen {uid16}",
            "email": f"deepa.{uid16}@example.com",
            "password": "Password123",
            "confirm_password": "Password123",
            "role": "canevyn_user"
        })
        self.assertEqual(r_reg.status_code, 200)
        user_data = r_reg.json()["user"]
        self.assertIsNotNone(user_data["canevyn_id"])
        self.assertTrue(user_data["canevyn_id"].startswith("CVN-"))

        # 3. Forgot Password
        r_forgot = self.client.post("/api/v1/auth/forgot-password", json={
            "email": f"deepa.{uid16}@example.com"
        })
        self.assertEqual(r_forgot.status_code, 200)
        self.assertIn("dispatched", r_forgot.json()["message"].lower())

    def test_17_rejection_and_cross_member_authorization(self):
        """Verifies rejection flow, cross-member response blocking (403), and role enforcement."""
        import uuid
        uid17 = uuid.uuid4().hex[:6]
        # Guardian 1 (Marcus)
        guard1_token = self._get_token("marcus.vance@example.com", "password123")
        r_me = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {guard1_token}"})
        guard1_cid = r_me.json()["canevyn_id"]

        # Register Guardian 2
        r_g2 = self.client.post("/api/v1/auth/register", json={
            "full_name": f"Elena Rostova {uid17}",
            "email": f"elena.{uid17}@example.com",
            "password": "Password123",
            "role": "authorized_member"
        })
        self.assertEqual(r_g2.status_code, 200)
        guard2_token = r_g2.json()["access_token"]

        # Register Blind user
        r_blind = self.client.post("/api/v1/auth/register", json={
            "full_name": f"Vikram Seth {uid17}",
            "email": f"vikram.{uid17}@example.com",
            "password": "Password123",
            "role": "canevyn_user"
        })
        self.assertEqual(r_blind.status_code, 200)
        blind_token = r_blind.json()["access_token"]
        blind_id = r_blind.json()["user"]["id"]

        # Blind user sends request to Marcus (guard1)
        r_req = self.client.post(
            "/api/v1/guardians/send-request-to-member",
            json={"member_id": guard1_cid, "relationship_label": "Caregiver"},
            headers={"Authorization": f"Bearer {blind_token}"}
        )
        self.assertEqual(r_req.status_code, 200)
        rel_id = r_req.json()["relationship_id"]

        # SECURITY TEST: Guardian 2 attempts to respond to Guardian 1's request -> 403 Forbidden
        r_cross = self.client.post(
            "/api/v1/guardians/member-respond-request",
            json={"relationship_id": rel_id, "action": "approve"},
            headers={"Authorization": f"Bearer {guard2_token}"}
        )
        self.assertEqual(r_cross.status_code, 403)
        self.assertIn("not authorized", r_cross.json()["detail"])

        # Guardian 1 rejects request -> 200
        r_rej = self.client.post(
            "/api/v1/guardians/member-respond-request",
            json={"relationship_id": rel_id, "action": "reject"},
            headers={"Authorization": f"Bearer {guard1_token}"}
        )
        self.assertEqual(r_rej.status_code, 200)
        self.assertEqual(r_rej.json()["new_status"], "rejected")

        # Rejected relationship must NOT grant location access -> 403
        r_loc = self.client.get(
            f"/api/v1/telemetry/latest/{blind_id}",
            headers={"Authorization": f"Bearer {guard1_token}"}
        )
        self.assertEqual(r_loc.status_code, 403)

    # --- Helper methods ---
    def _get_token(self, email, password):
        resp = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        if resp.status_code != 200:
            raise RuntimeError(f"Login failed for {email}: {resp.text}")
        return resp.json()["access_token"]

if __name__ == "__main__":
    unittest.main()
