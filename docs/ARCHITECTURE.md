# Canevyn Smart Assistive Stick — System Architecture

## 1. Executive Summary

Canevyn is an assistive mobility ecosystem engineered for visually impaired individuals and their authorized guardians. The system combines:
1. **Physical Canevyn Smart Stick Hardware**: Ultrasonic/LiDAR obstacle radar, 6-axis IMU, tip audio beeper, and a dedicated **physical latch emergency mechanism**.
2. **Canevyn User Mobile Application**: Voice-first companion providing real-time obstacle radar guidance, tactile navigation, battery telemetry, and automated hardware emergency relaying.
3. **Canevyn Cloud/Edge Backend**: FastAPI REST services, authenticated WebSocket channels, Argon2id security, and relationally-scoped emergency dispatch.
4. **Authorized Member Application**: Live guardian safety dashboard, real-time GPS tracking, hardware SOS receipt, and emergency call routing.

---

## 2. Core Architectural Pipeline

```
┌────────────────────────────────────────────────────────┐
│             Physical Canevyn Smart Stick               │
│  - Mechanical Hardware SOS Latch Mechanism             │
│  - LiDAR / Ultrasonic Obstacle Radar Sensor            │
│  - 6-Axis IMU (Drop / Tip-Angle Detection)             │
│  - 95dB Tip Locator Buzzer                             │
└───────────────────────────┬────────────────────────────┘
                            │ Bluetooth Low Energy (BLE GATT)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Canevyn User Mobile Application            │
│  - BLE Device Manager (Unified Hardware Abstraction)   │
│  - Spoken Voice Assistant (STT & TTS)                  │
│  - Safe Transit Corridor & Tactile Map                 │
│  - Autonomous Telemetry & Hardware SOS Relay           │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS REST & Authenticated WSS
                            ▼
┌────────────────────────────────────────────────────────┐
│                Canevyn Backend Infrastructure          │
│  - FastAPI REST API & Argon2id Security Core           │
│  - Authenticated WebSocket Dispatcher (No Global Leak) │
│  - Scoped Privacy Layer (Role & Guardian Authorization)│
│  - Persistent SQLite3 Storage with State Invariants    │
└───────────────────────────┬────────────────────────────┘
                            │ Authenticated WSS / Push Notification
                            ▼
┌────────────────────────────────────────────────────────┐
│              Authorized Member Dashboard               │
│  - Live Safety & Battery Telemetry Hub                 │
│  - Scoped Real-time GPS Tracker & Corridor View        │
│  - Hardware SOS Incident Receiver & Resolution Status  │
│  - Neutral Regional "Call Emergency Services" Action   │
└────────────────────────────────────────────────────────┘
```

---

## 3. Strict System Invariants

### Invariant 1: Physical Hardware-Only SOS Trigger Rule
* **The physical Canevyn stick is the ONLY source that triggers SOS.**
* There is **NO software SOS button** in the Canevyn User mobile application.
* There is **NO voice command** that triggers SOS.
* The Canevyn User smartphone acts strictly as an intelligent relay station and reassuring status terminal:
  1. The physical cane latch is released by the traveler.
  2. The stick broadcasts an emergency packet via BLE GATT Characteristic `00000002-0001-...`.
  3. The phone's background service receives the packet, captures high-accuracy GPS, and sends a prioritized payload to `/api/v1/sos/hardware-trigger`.
  4. The phone provides continuous spoken auditory reassurance ("Canevyn has alerted your guardians...") and displays the emergency status screen with active telemetry.
  5. The backend dispatches targeted alerts strictly to authorized guardians (`can_receive_sos = 1`).
* **Resolution/Deactivation** can only occur via:
  - Physical reset/double-click of the stick's mechanical latch over BLE.
  - A deliberate 3-second hold on the accessible "Resolve Hardware Alert" button in the User app.
  - Verification and clearance by an Authorized Member.

### Invariant 2: Authoritative 5-Tab Navigation Structure
* The Canevyn User application strictly maintains a 5-item bottom navigation:
  $$\text{Home} \quad|\quad \text{Location} \quad|\quad \text{Voice} \quad|\quad \text{Guardian} \quad|\quad \text{Settings}$$
* Cane device functionality (battery health, obstacle sensor distance, firmware version, tip buzzer chirp) is accessible via interactive cards on the **Home** and **Settings** tabs. It is **never** presented as an extraneous 6th bottom navigation item.

### Invariant 3: Official Canevyn Logo & Design System
* The official Canevyn circular emblem is bundled natively and used across all splash, header, and alert screens.
* Design tokens adhere strictly to the Canevyn Sentinel specifications:
  - Deep OLED black background (`#0B0F17`) and slate cards (`#111827`).
  - High-contrast emergency amber (`#F59E0B`) and alert red (`#EF4444`).
  - WCAG AAA minimum contrast ratio ($\ge 7:1$).
  - Atkinson Hyperlegible Next typography engineered for low-vision legibility.
  - Minimum touch targets of 56px to 72px with distinct 2px tactile borders.

### Invariant 4: Neutral Regional Emergency Dispatch
* No hardcoded regional emergency numbers (e.g., 911). All emergency dispatch controls display the neutral wording **"Call Emergency Services"** and route to configurable emergency numbers via platform dialer URIs (`tel:911`, `tel:112`, `tel:999`, etc.) dictated by regional settings.

---

## 4. Production Mobile Architecture vs Development Web Environment

### Why Web Bluetooth Exists in Phase 1
During Phase 1 foundation development, the user application and hardware simulator are deployed as a web application running in modern desktop/mobile Chromium browsers. Web Bluetooth (`navigator.bluetooth`) was selected for Phase 1 to enable:
1. **Immediate Cross-Platform Prototyping**: Iterating on GATT service communication protocols without requiring platform-specific mobile toolchains.
2. **Deterministic Hardware Simulation**: Running a high-fidelity virtual Canevyn stick directly in browser memory to stress-test radar obstacle streams, drop detection, and latch release events.
3. **Frictionless Pair Programming & Verification**: Instant unit and integration verification in a standard runtime environment.

### Why Web Bluetooth Cannot Be the Production Mobile Architecture
Web Bluetooth is constrained by browser security models that make it unsuitable as the sole production architecture for an assistive safety stick:
* **No Background Execution**: When the browser tab is minimized or the user switches apps, Web Bluetooth GATT notifications are throttled or terminated by the OS.
* **No Screen-Off / Locked-Device Operation**: If the traveler puts their phone in a pocket with the screen turned off, the browser process is suspended, breaking BLE telemetry ingestion and SOS packet relaying.
* **No Background Geolocation**: Browsers cannot reliably poll high-accuracy GPS in the background during transit.
* **Lack of Deep OS Accessibility Integration**: TalkBack (Android) and VoiceOver (iOS) require native accessibility semantics and custom actions that browser DOM wrappers cannot fully replicate.
* **Lack of Native Push Notification daemons**: Receiving urgent alerts while backgrounded requires native APNs (Apple Push Notification service) or FCM (Firebase Cloud Messaging).

### Recommended Production Mobile Deployment Target
The production Canevyn mobile application will be deployed as a native mobile application using a cross-platform mobile runtime:
* **Runtime Options**:
  - **Capacitor / Ionic Shell**: Packages the existing accessible web interface with `@capacitor-community/bluetooth-le`, `@capacitor/geolocation`, and native background services.
  - **React Native Shell**: Implements `react-native-ble-plx` and headless background tasks for uninterrupted BLE stick connectivity.
  - **Flutter Shell**: Uses `flutter_reactive_ble` with native background Android Services and iOS CoreBluetooth background execution modes (`bluetooth-central`).
* **Production Mobile Capabilities**:
  - **Foreground Service with Persistent Notification**: Keeps the Canevyn BLE daemon alive continuously, even when the device is locked or memory is constrained.
  - **CoreBluetooth Background Processing**: Enables background GATT characteristic notifications for latch release events.
  - **Native Lock Screen Widget & Haptics**: Allows the traveler to feel vibration cues and hear audio confirmations without unlocking the device.

---

## 5. Frontend BLE Hardware Abstraction Architecture

To ensure zero friction when transitioning from the Phase 1 web environment to the production native mobile shell, the Canevyn frontend enforces a strict **Three-Tier Hardware Abstraction Layer**:

```
┌────────────────────────────────────────────────────────┐
│                   UI Presentation Layer                │
│ (user-home.js, user-device.js, user-sos-status.js)     │
└───────────────────────────┬────────────────────────────┘
                            │ Calls unified events & methods
                            ▼
┌────────────────────────────────────────────────────────┐
│            Unified Hardware Facade Layer               │
│                  (device-manager.js)                   │
│  - connect() / disconnect() / pingBuzzer()             │
│  - subscribeToTelemetry() / on('sos_latched')          │
│  - Encapsulates reconnection, smoothing & dispatch    │
└───────────────────────────┬────────────────────────────┘
                            │ Delegates based on environment
             ┌──────────────┴──────────────┐
             ▼                             ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│  Phase 1 / Dev Drivers  │   │  Production Mobile Shell │
│ - ble-client.js (Web)   │   │ - native-ble-bridge.js   │
│ - mock-stick-device.js  │   │   (Capacitor / RN / Nat) │
└─────────────────────────┘   └──────────────────────────┘
             │                             │
             ▼                             ▼
┌────────────────────────────────────────────────────────┐
│         Canevyn Physical Hardware (GATT Protocol)      │
└────────────────────────────────────────────────────────┘
```

### Abstraction Guarantees
1. **Zero Raw BLE in UI**: No UI component or screen module ever references `navigator.bluetooth`, Web Bluetooth GATT objects, or raw array buffers.
2. **Interface Parity**: Both `BLEClient` and `MockStickDevice` implement identical signatures (`connect()`, `disconnect()`, `writeCharacteristic()`, event emitters).
3. **Pluggable Bridge**: When deploying to Capacitor or React Native, only a new driver adapter implementing the `IDeviceDriver` interface is added. All UI screens, voice guidance, and backend relay routines remain completely untouched.

---

## 6. Hardware Simulator Isolation Boundary

The Hardware Simulator Toolbar (`frontend/js/components/hardware-sim-bar.js`) is strictly categorized as a **Development & Hardware Testing Tool**. It is completely decoupled from the production application lifecycle.

### Isolation Implementation
* **Central Environment Configuration (`frontend/js/config.js`)**:
  ```javascript
  const appConfig = {
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    enableSimulator: window.CANEVYN_SIMULATOR_ENABLED ?? true,
    // ...
  };
  ```
* **DOM Pruning in Production**:
  When `appConfig.isDevelopment === false` or `appConfig.enableSimulator === false`:
  - `HardwareSimBar.render()` returns an empty string `""`.
  - The simulator toolbar element is never inserted into the DOM.
* **Hardware SOS Simulation Guard (`device-manager.js`)**:
  ```javascript
  simulateLatchTrigger() {
    if (!appConfig.isDevelopment) {
      console.warn("Simulator actions are strictly disabled in production mode.");
      return;
    }
    // Execute simulated latch release...
  }
  ```
  This ensures that simulated trigger routines cannot be invoked programmatically or maliciously in production.

---

## 7. Security & Privacy Baseline

### 1. Password Hashing (Argon2id)
All user credentials are encrypted using **Argon2id** via `argon2-cffi`, complying with OWASP guidelines:
* **Time Cost**: 3 iterations
* **Memory Cost**: 64 MiB ($65,536\text{ KiB}$)
* **Parallelism**: 4 threads
* **Hash & Salt Length**: 32 bytes hash, 16 bytes salt
* Legacy password hashes are automatically verified and upgraded upon sign-in.

### 2. Cryptographic Secret Management & Token Expiration
* **Environment Variable**: `CANEVYN_SECRET_KEY` is loaded from OS environment variables.
* **Production Enforcement**: If `CANEVYN_ENV=production` and the secret key is missing or set to the development fallback, the server raises a fatal `RuntimeError` on startup and terminates.
* **Token Expiration**: Bearer JWT tokens expire after 480 minutes (8 hours) by default, enforced by standard claims (`exp`, `sub`, `role`). Expired tokens return `401 Unauthorized` with `Token has expired`.

### 3. Role-Based Scoping & Privacy Access Control
* **Device Ownership**: Endpoints `/api/v1/devices/user/current` and `/api/v1/devices/{device_id}/ping-beacon` verify that the target device is assigned to the authenticated caller (`assigned_user_id == current_user["id"]`). Stranger access returns `403 Forbidden`.
* **Location Privacy**: Telemetry records and GPS coordinates (`/api/v1/telemetry/latest/{user_id}`) can only be viewed by the user themselves or an authorized guardian with active permission `can_view_live_location = 1`. Unapproved users receive `403 Forbidden: Not authorized to view live location`.
* **Hardware SOS Scoping**:
  - Only the device owner can relay hardware emergency packets to `/api/v1/sos/hardware-trigger`.
  - Only the victim or guardians with `can_receive_sos = 1` can query `/api/v1/sos/active/{user_id}` or resolve an active incident via `/api/v1/sos/resolve`.

### 4. Authenticated WebSockets & Private Broadcaster
* **Token Handshake**: WebSockets connect via `/ws/{user_id}?token=<jwt_token>`.
* **Authorization Verification**: The connection is rejected with close code `1008 (Policy Violation)` if:
  1. The token is expired or invalid.
  2. The connected client ID does not match the token's subject AND is not an authorized guardian of the target user.
* **Zero Global Leakage**: Emergency broadcasts are routed exclusively to the connected sockets of the victim and authorized guardians (`ws_manager.broadcast_to_user_and_guardians`). No unscoped broadcast methods exist.
