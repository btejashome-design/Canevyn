# Canevyn Smart Assistive Blind Stick System

**Canevyn** is an assistive mobility hardware and software ecosystem designed to provide autonomous, dignified mobility for visually impaired individuals while keeping authorized guardians informed of real-time safety, location, and hardware telemetry.

---

## 1. System Invariants & Rules

* **Hardware-Only SOS Trigger:** The **physical Canevyn stick is the ONLY source that triggers SOS**. There is no software SOS button in the Canevyn User mobile app, nor any voice command that originates SOS. The flow is:
  $$\text{Physical Stick Latch} \xrightarrow{\text{BLE GATT}} \text{User Phone} \xrightarrow{\text{HTTPS/WSS}} \text{Backend} \xrightarrow{\text{WSS/Push}} \text{Authorized Member}$$
* **Authoritative 5-Tab Navigation:**
  $$\text{Home} \quad|\quad \text{Location} \quad|\quad \text{Voice} \quad|\quad \text{Guardian} \quad|\quad \text{Settings}$$
  *(Device diagnostics and battery telemetry are accessible through Home and Settings cards, NOT as an extraneous 6th bottom tab).*
* **Official Canevyn Logo:** The application natively bundles and uses the official circular Canevyn emblem.
* **Neutral Emergency Services:** Displays "Call Emergency Services" with configurable regional emergency numbers instead of hardcoded numbers like 911.
* **Accessibility First:** Atkinson Hyperlegible Next typography, WCAG AAA dark contrast, 56px–72px minimum touch targets, tactile borders, Web Speech API (STT & TTS), and haptic vibrations.
* **Strict Privacy & Security:** Argon2id password hashing, environment-driven JWT secret management, token expiration enforcement, device ownership verification, and scoped telemetry/SOS channels with zero global leakage.

---

## 2. Environment Architecture: Development Web vs Production Mobile

| Characteristic | Phase 1 Development & Testing | Phase 2+ Production Mobile Target |
| :--- | :--- | :--- |
| **Runtime Environment** | Desktop/Mobile Chromium Web Browser | Cross-platform Native Shell (Capacitor / React Native / Flutter) |
| **BLE Protocol** | Web Bluetooth API (`navigator.bluetooth`) | Native CoreBluetooth (iOS) & Android BLE Services |
| **Hardware Simulator** | Interactive on-screen simulation toolbar | **Strictly disabled / DOM removed** (`appConfig.enableSimulator = false`) |
| **Background Execution** | Active browser tab only (W3C constraint) | Native Foreground Service with persistent notification daemon |
| **Locked Screen Behavior** | Throttled / suspended by OS | Continuous background BLE listener & high-accuracy GPS relay |
| **Notifications** | In-app audio / speech synthesis | Native OS Push Notifications (FCM / APNs) & emergency ringers |
| **Accessibility** | ARIA attributes & Web Speech API | Native TalkBack (Android) & VoiceOver (iOS) integration |

### Frontend Hardware Abstraction Layer
The frontend UI code **never** communicates directly with raw Web Bluetooth or simulator APIs:
1. **UI Screens** invoke the unified `DeviceManager` interface (`connect()`, `disconnect()`, `pingBuzzer()`).
2. **DeviceManager** dynamically binds to `BLEClient` (Web Bluetooth), `MockStickDevice` (development simulator), or a native bridge.
3. Swapping to native mobile BLE requires zero modifications to UI screen components or business logic.

---

## 3. Project Directory Structure

```
Canevyn/
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI server, static file host & authenticated WebSocket hub
│   │   ├── config.py                 # Environment configuration, Argon2id & emergency routing
│   │   ├── database.py               # SQLite3 persistence, constraints & seed data
│   │   ├── models/schemas.py         # Pydantic data schemas
│   │   ├── routers/                  # Modular scoped API endpoints
│   │   │   ├── auth.py               # Sign In / Create Account with Argon2id
│   │   │   ├── devices.py            # Device ownership verification & beacon ping
│   │   │   ├── telemetry.py          # Scoped telemetry & GPS ingestion
│   │   │   ├── sos.py                # Hardware SOS reporting & scoped resolution
│   │   │   ├── guardians.py          # Authorized member relationships & permissions
│   │   │   └── notifications.py      # Spoken and high-contrast alert feed
│   │   ├── services/
│   │   │   ├── auth_service.py       # Argon2id password hashing & JWT validation
│   │   │   └── ws_manager.py         # Authenticated WebSocket hub (no global broadcast)
│   │   └── tests/
│   │       └── test_api.py           # Comprehensive 10-test verification suite
│   ├── requirements.txt              # Production dependencies (including argon2-cffi)
│   └── run_backend.py                # Server runner
├── frontend/
│   ├── index.html                    # Mobile web host (Atkinson font, Canevyn design tokens)
│   ├── assets/
│   │   ├── images/canevyn-logo.png   # Official Canevyn circular logo
│   │   └── css/canevyn-sentinel.css  # Canevyn Sentinel design tokens (WCAG AAA)
│   └── js/
│       ├── config.js                 # Environment configuration & simulator toggles
│       ├── app.js                    # Core App Router, State & Event lifecycle
│       ├── ble/                      # Bluetooth Low Energy abstraction layer
│       │   ├── gatt-specs.js         # Formal GATT service & characteristic UUIDs
│       │   ├── ble-client.js         # Web Bluetooth API client
│       │   ├── mock-stick-device.js  # Separated mock/simulator hardware layer
│       │   └── device-manager.js     # Unified hardware facade & safety guards
│       ├── services/
│       │   ├── api-client.js         # Authenticated REST API fetch client
│       │   ├── websocket-client.js   # Authenticated live WebSocket listener
│       │   └── speech-assistant.js   # Modular Voice Assistant (STT & TTS)
│       ├── components/               # Accessible UI components
│       │   ├── header.js             # Top bar (Logo, BLE/battery chip, TTS toggle)
│       │   ├── navigation.js         # 5-tab user bottom navigation
│       │   └── hardware-sim-bar.js   # Development simulator toolbar (hidden in prod)
│       └── screens/                  # Authoritative screen modules
│           ├── welcome-role.js       # Role Selection (User vs Authorized Member)
│           ├── account-auth.js       # Sign In / Create Account
│           ├── user-home.js          # User Voice-First Dashboard
│           ├── user-location.js      # Tactile Map & Wayfinding Corridor
│           ├── user-voice.js         # Voice Assistant Orb & Waveform
│           ├── user-guardian.js      # Authorized Members management
│           ├── user-settings.js      # Settings & Accessibility
│           ├── user-device.js        # Cane Diagnostics (Battery & Sensors)
│           ├── user-sos-status.js    # Hardware SOS Status (Hold 3s to cancel)
│           ├── user-notifications.js # Alert feeds with "Speak Alert" TTS
│           ├── guardian-dashboard.js # Guardian Safety Hub
│           ├── guardian-location.js  # Live Location Tracking map
│           └── guardian-sos-alert.js # Hardware SOS Alert Receiver
├── shared/
│   └── gatt_definitions.json         # Formal JSON GATT specs
├── docs/
│   ├── ARCHITECTURE.md               # Detailed system architecture & invariant analysis
│   ├── BLE_GATT_SPECIFICATION.md     # Complete GATT UUID, payload & notification specs
│   ├── DATABASE_SCHEMA.md            # Relational database schema & integrity constraints
│   └── API_REFERENCE.md              # REST & WebSocket API specification
└── README.md
```

---

## 4. Quickstart & Execution

### Prerequisites
* Python 3.10+ (Verified with Python 3.14)
* Installed packages: `fastapi`, `uvicorn`, `pydantic`, `python-jose`, `argon2-cffi`, `websockets`, `python-multipart`, `email-validator`, `httpx`

### 1. Run Backend Server
```powershell
python backend/run_backend.py
```
The server will start at `http://localhost:8000`.
* **API Documentation:** `http://localhost:8000/docs`
* **Mobile Web Application:** `http://localhost:8000/`
* **Health Endpoint:** `http://localhost:8000/health`
* **Environment Configuration:** `http://localhost:8000/api/v1/config`

### 2. Run Test Suite
```powershell
python backend/app/tests/test_api.py
```
Expected output:
```text
Ran 10 tests in 2.0s
OK
```

---

## 5. Preloaded Demo Accounts

The database is automatically preloaded with canonical seed profiles matching the UI/UX reference:

| Role | Name | Email | Password | Paired Hardware |
| :--- | :--- | :--- | :--- | :--- |
| **Canevyn User** | Arthur Vance | `arthur.vance@example.com` | `password123` | CX-7 Sentinel (`CNV-9942`) |
| **Authorized Member** | Marcus Vance (Son) | `marcus.vance@example.com` | `password123` | Guardian to Arthur |
| **Authorized Member** | Dr. Elena Rostova | `dr.rostova@example.com` | `password123` | Guardian to Arthur |

*(Quick-fill buttons are provided on the Sign In screen for instant testing).*

---

## 6. Testing the Hardware SOS Emergency Flow

1. Open two browser windows:
   * **Window 1 (User):** Sign in as **Arthur Vance** (or click "Arthur Vance (User)" quick-fill).
   * **Window 2 (Guardian):** Sign in as **Marcus Vance** (or click "Marcus Vance (Guardian)" quick-fill).
2. In Window 1, use the top **HARDWARE SIMULATOR** toolbar and click **"Pull Physical Cane Latch"**.
3. **Observation:**
   * **Window 1 (User Phone):** Instantly displays the **Hardware SOS Status Screen** ("SOS Activated from Canevyn Stick"), plays spoken guidance ("Canevyn has alerted your guardians..."), and shows active telemetry (95dB tip beacon, battery reserve).
   * **Window 2 (Guardian):** Instantly receives the scoped real-time WebSocket broadcast and opens the **Hardware SOS Alert Received Screen** ("Physical Canevyn SOS Switch Activated - Initiated by Arthur Vance via physical emergency cane latch") with impact coordinates and neutral **"Call Emergency Services"** action.
4. **Resolution:**
   * In Window 1, hold the **"Resolve Hardware Alert"** button for 3 seconds (or click "Reset Physical Latch" in the simulator bar). Both screens immediately clear and return to nominal safety state.
