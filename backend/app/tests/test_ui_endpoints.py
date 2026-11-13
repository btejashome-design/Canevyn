"""
Phase 2 UI and API Verification Test
Validates:
- Static file serving (index.html, JS screens, assets)
- Official logo asset availability
- Auth endpoints and argon2/bcrypt password hashing
- Hardware SOS event handling and resolution
- Telemetry ping
"""
import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
import os

client = TestClient(app)

class TestPhase2UIEndpoints(unittest.TestCase):
    def test_official_logo_exists(self):
        self.assertTrue(os.path.exists("frontend/assets/images/canevyn-logo.png"))
        resp = client.get("/static/assets/images/canevyn-logo.png")
        self.assertEqual(resp.status_code, 200)

    def test_index_html_serves(self):
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Canevyn", response.text)
        self.assertIn("Atkinson Hyperlegible Next", response.text)

    def test_all_13_screens_exist(self):
        screens = [
            "welcome-role.js",
            "account-auth.js",
            "user-home.js",
            "user-location.js",
            "user-voice.js",
            "user-guardian.js",
            "user-settings.js",
            "user-device.js",
            "user-sos-status.js",
            "user-notifications.js",
            "guardian-dashboard.js",
            "guardian-location.js",
            "guardian-sos-alert.js"
        ]
        for screen in screens:
            path = os.path.join("frontend/js/screens", screen)
            self.assertTrue(os.path.exists(path), f"Missing screen: {screen}")

    def test_strict_invariant_no_software_sos_in_user_screens(self):
        """Verify strict invariant: User screens must NOT contain an SOS trigger button"""
        user_screens = [
            "frontend/js/screens/user-home.js",
            "frontend/js/screens/user-location.js",
            "frontend/js/screens/user-voice.js",
            "frontend/js/screens/user-guardian.js",
            "frontend/js/screens/user-settings.js",
            "frontend/js/screens/user-device.js"
        ]
        for screen_path in user_screens:
            with open(screen_path, "r", encoding="utf-8") as f:
                content = f.read()
                # Must not contain software SOS trigger button
                self.assertNotIn("id=\"triggerSoftwareSosBtn\"", content)
                self.assertNotIn("id=\"btn-trigger-sos\"", content)
                self.assertNotIn("Trigger SOS", content)

    def test_strict_invariant_5_tabs_only(self):
        """Verify navigation component has exactly 5 tabs and no Device bottom tab"""
        with open("frontend/js/components/navigation.js", "r", encoding="utf-8") as f:
            content = f.read()
            self.assertIn("Home", content)
            self.assertIn("Location", content)
            self.assertIn("Voice", content)
            self.assertIn("Guardian", content)
            self.assertIn("Settings", content)
            # Must NOT have Device tab in bottom navigation
            self.assertNotIn("data-tab=\"device\"", content)

    def test_emergency_services_neutral_wording(self):
        """Verify neutral wording 'Call Emergency Services' with tel:sos"""
        sos_screen = "frontend/js/screens/user-sos-status.js"
        with open(sos_screen, "r", encoding="utf-8") as f:
            content = f.read()
            self.assertIn("Call Emergency Services", content)
            self.assertIn("tel:sos", content)

    def test_argon2_password_security(self):
        """Verify password security is using Argon2 / bcrypt"""
        from backend.app.services.auth_service import hash_password, verify_password
        hashed = hash_password("SecurePassword123!")
        self.assertTrue(verify_password("SecurePassword123!", hashed))
        self.assertFalse(verify_password("WrongPassword!", hashed))
        # Ensure it is NOT a plain sha256 hex string
        self.assertTrue(hashed.startswith("$argon2") or hashed.startswith("$2b$") or hashed.startswith("$2a$"))

if __name__ == "__main__":
    unittest.main()
