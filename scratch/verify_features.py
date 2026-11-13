"""
End-to-End Verification Script for CaneVyn Authentication, User Connection, and AI Voice Accessibility
"""

import sys
import os
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import init_db

def run_e2e_verification():
    init_db()
    client = TestClient(app)

    print("==================================================")
    print("CANEVYN AUTHENTICATION & AI VOICE E2E VERIFICATION")
    print("==================================================")

    uid = uuid.uuid4().hex[:6]

    # Test 1: Password mismatch validation rejection
    r_mismatch = client.post("/api/v1/auth/register", json={
        "full_name": f"Priya Sharma {uid}",
        "email": f"blind.{uid}@example.com",
        "password": "Password123",
        "confirm_password": "WrongPassword999",
        "role": "canevyn_user"
    })
    assert r_mismatch.status_code == 400
    assert "match" in r_mismatch.json()["detail"].lower()
    print("[OK] Step 1: Password mismatch correctly rejected with 400 error")

    # Test 2: Register Blind User 1 with matching confirm_password -> generates unique CVN-XXXXX
    blind_email = f"blind.{uid}@example.com"
    r = client.post("/api/v1/auth/register", json={
        "full_name": f"Priya Sharma {uid}",
        "email": blind_email,
        "password": "password123",
        "confirm_password": "password123",
        "role": "canevyn_user",
        "phone_number": "(415) 555-0911"
    })
    assert r.status_code == 200, f"Blind register failed: {r.text}"
    blind1_id = r.json()["user"]["id"]
    blind1_cid = r.json()["user"]["canevyn_id"]
    blind1_token = r.json()["access_token"]
    assert blind1_cid is not None and blind1_cid.startswith("CVN-")
    print(f"[OK] Step 2: Registered Blind User 1 -> {r.json()['user']['full_name']} (CaneVyn ID: {blind1_cid})")

    # Test 3: Register Blind User 2
    blind2_email = f"blind2.{uid}@example.com"
    r = client.post("/api/v1/auth/register", json={
        "full_name": f"Rohan Patel {uid}",
        "email": blind2_email,
        "password": "password123",
        "confirm_password": "password123",
        "role": "canevyn_user",
        "phone_number": "(415) 555-0922"
    })
    assert r.status_code == 200, f"Blind 2 register failed: {r.text}"
    blind2_id = r.json()["user"]["id"]
    blind2_cid = r.json()["user"]["canevyn_id"]
    blind2_token = r.json()["access_token"]
    assert blind2_cid.startswith("CVN-")
    print(f"[OK] Step 3: Registered Blind User 2 -> {r.json()['user']['full_name']} (CaneVyn ID: {blind2_cid})")

    # Test 4: Register Authorized Member
    guard_email = f"guardian.{uid}@example.com"
    r = client.post("/api/v1/auth/register", json={
        "full_name": f"Anjali Patel {uid}",
        "email": guard_email,
        "password": "password123",
        "confirm_password": "password123",
        "role": "authorized_member",
        "phone_number": "(415) 555-0988"
    })
    assert r.status_code == 200, f"Guardian register failed: {r.text}"
    guard_id = r.json()["user"]["id"]
    guard_token = r.json()["access_token"]
    print(f"[OK] Step 4: Registered Authorized Member -> {r.json()['user']['full_name']} (ID: {guard_id})")

    # Test 5: Search Invalid CaneVyn User ID
    r = client.post(
        "/api/v1/guardians/search-user",
        json={"canevyn_user_id": "CVN-99999"},
        headers={"Authorization": f"Bearer {guard_token}"}
    )
    assert r.status_code == 404
    assert "No CaneVyn user found. Please check the ID." in r.json()["detail"]
    print("[OK] Step 5: Search invalid ID correctly returned 404: 'No CaneVyn user found. Please check the ID.'")

    # Test 6: Search Valid CaneVyn User ID (by exact CVN-XXXXX format)
    r = client.post(
        "/api/v1/guardians/search-user",
        json={"canevyn_user_id": blind1_cid},
        headers={"Authorization": f"Bearer {guard_token}"}
    )
    assert r.status_code == 200
    assert r.json()["full_name"] == f"Priya Sharma {uid}"
    assert r.json()["canevyn_user_id"] == blind1_cid
    assert r.json()["connection_status"] is None
    print(f"[OK] Step 6: Search valid CaneVyn ID {blind1_cid} correctly verified: {r.json()['full_name']} (No automatic suggestions, exact ID only)")

    # Test 7: Request Connection using CaneVyn ID
    r = client.post(
        "/api/v1/guardians/request-connection",
        json={"canevyn_user_id": blind1_cid, "relationship_label": "Sister / Caregiver"},
        headers={"Authorization": f"Bearer {guard_token}"}
    )
    assert r.status_code == 200
    rel1_id = r.json()["relationship_id"]
    print("[OK] Step 7: Connection request sent with status 'pending'")

    # Test 8: Duplicate Request Prevention
    r = client.post(
        "/api/v1/guardians/request-connection",
        json={"canevyn_user_id": blind1_cid},
        headers={"Authorization": f"Bearer {guard_token}"}
    )
    assert r.status_code == 400
    assert "already pending" in r.json()["detail"]
    print("[OK] Step 8: Duplicate connection request correctly rejected with 400")

    # Test 9: Cancel Connection Request
    r_cancel = client.post(
        "/api/v1/guardians/cancel-request",
        json={"relationship_id": rel1_id},
        headers={"Authorization": f"Bearer {guard_token}"}
    )
    assert r_cancel.status_code == 200
    print("[OK] Step 9: Authorized Member successfully cancelled pending request")

    # Re-send connection request for approval testing
    r_resend = client.post(
        "/api/v1/guardians/request-connection",
        json={"canevyn_user_id": blind1_cid, "relationship_label": "Sister / Caregiver"},
        headers={"Authorization": f"Bearer {guard_token}"}
    )
    assert r_resend.status_code == 200
    rel1_new_id = r_resend.json()["relationship_id"]

    # Test 10: Privacy Enforcement (Unapproved member CANNOT access telemetry or location)
    r = client.get(
        f"/api/v1/telemetry/latest/{blind1_id}",
        headers={"Authorization": f"Bearer {guard_token}"}
    )
    assert r.status_code == 403
    print("[OK] Step 10: Privacy enforced: Unapproved member blocked from viewing location/telemetry (403 Forbidden)")

    # Test 11: Blind User 1 checks incoming pending requests
    r = client.get(
        "/api/v1/guardians/pending-requests",
        headers={"Authorization": f"Bearer {blind1_token}"}
    )
    assert r.status_code == 200
    assert len(r.json()) >= 1
    print("[OK] Step 11: Blind user can view incoming pending request")

    # Test 12: Blind User 1 Approves Connection
    r = client.post(
        "/api/v1/guardians/respond-request",
        json={"relationship_id": rel1_new_id, "action": "approve"},
        headers={"Authorization": f"Bearer {blind1_token}"}
    )
    assert r.status_code == 200
    assert r.json()["new_status"] == "approved"
    print("[OK] Step 12: Blind user approved connection request -> status is 'approved'")

    # Test 13: Authorized Member now sees Blind User 1 in monitored users
    r = client.get(
        "/api/v1/guardians/monitored-users",
        headers={"Authorization": f"Bearer {guard_token}"}
    )
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["user_id"] == blind1_id
    print("[OK] Step 13: Authorized Member dashboard displays approved traveler")

    # Test 14: Multi-user Connection: Connect with Blind User 2
    r = client.post(
        "/api/v1/guardians/request-connection",
        json={"canevyn_user_id": blind2_cid, "relationship_label": "Aunt"},
        headers={"Authorization": f"Bearer {guard_token}"}
    )
    assert r.status_code == 200
    rel2_id = r.json()["relationship_id"]

    # Blind User 2 Approves Connection
    r = client.post(
        "/api/v1/guardians/respond-request",
        json={"relationship_id": rel2_id, "action": "approve"},
        headers={"Authorization": f"Bearer {blind2_token}"}
    )
    assert r.status_code == 200

    # Authorized Member now has 2 monitored users and can switch between them
    r = client.get(
        "/api/v1/guardians/monitored-users",
        headers={"Authorization": f"Bearer {guard_token}"}
    )
    assert r.status_code == 200
    assert len(r.json()) == 2
    print(f"[OK] Step 14: Multi-user support verified! Guardian is connected to {len(r.json())} blind users: {[u['user_name'] for u in r.json()]}")

    # Test 15: Voice Welcome Briefing
    r = client.get(
        "/api/v1/voice/welcome-briefing",
        headers={"Authorization": f"Bearer {blind1_token}"}
    )
    assert r.status_code == 200
    speech = r.json()["welcome_speech"]
    assert "Welcome to CaneVyn" in speech or "welcome to canevyn" in speech.lower()
    assert "smart assistant is ready" in speech
    print(f"[OK] Step 15: Automatic Voice Welcome Briefing verified -> '{speech}'")

    # Test 16: Voice command: Repeat my ID
    r_id = client.post(
        "/api/v1/voice/interpret-command",
        json={"transcript": "Repeat my ID"},
        headers={"Authorization": f"Bearer {blind1_token}"}
    )
    assert r_id.status_code == 200
    assert r_id.json()["command_type"] == "user_id"
    assert blind1_cid in r_id.json()["spoken_response"]
    print(f"[OK] Step 16: Voice command 'Repeat my ID' -> Spoken: '{r_id.json()['spoken_response']}'")

    # Test 17: Predefined Voice Commands
    test_commands = [
        ("What's my battery level?", "battery"),
        ("Where am I?", "location"),
        ("Is my stick connected?", "connection"),
        ("Any obstacles?", "obstacle"),
        ("Is there water nearby?", "water"),
        ("What's my safety status?", "safety"),
        ("Who can access my location?", "guardians"),
        ("Help", "help")
    ]
    for phrase, cmd_type in test_commands:
        r = client.post(
            "/api/v1/voice/interpret-command",
            json={
                "transcript": phrase,
                "is_connected": True,
                "battery_percent": 88,
                "obstacle_distance_cm": 250,
                "water_detected": False,
                "address_label": "742 Market St, San Francisco"
            },
            headers={"Authorization": f"Bearer {blind1_token}"}
        )
        assert r.status_code == 200
        assert r.json()["command_type"] == cmd_type, f"Expected {cmd_type}, got {r.json()['command_type']}"
        print(f"[OK] Step 17: Voice command '{phrase}' -> Interpreted as '{cmd_type}' -> Spoken: '{r.json()['spoken_response']}'")

    # Test 18: Forgot Password Endpoint
    r_forgot = client.post("/api/v1/auth/forgot-password", json={"email": blind_email})
    assert r_forgot.status_code == 200
    assert "dispatched" in r_forgot.json()["message"].lower()
    print("[OK] Step 18: Forgot Password dispatched instructions correctly")

    print("\n==================================================")
    print("ALL 18 END-TO-END VERIFICATION CHECKS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_e2e_verification()
