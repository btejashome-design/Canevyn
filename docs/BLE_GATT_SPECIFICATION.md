# Canevyn BLE GATT Hardware Specification

## 1. Overview
The Canevyn Smart Blind Stick interacts with the traveler's mobile phone via Bluetooth Low Energy (BLE) using standard and custom GATT Services.

## 2. Services & Characteristic UUIDs

### 2.1 Canevyn Primary Assistive Service
* **Service UUID:** `0000c001-0000-1000-8000-00805f9b34fb`

#### Characteristics:

1. **Hardware SOS Event**
   * **UUID:** `0000c002-0000-1000-8000-00805f9b34fb`
   * **Properties:** `READ`, `NOTIFY`, `INDICATE`, `WRITE`
   * **Binary Format (6 bytes):**
     * `[0]` Status byte: `0x00` (Nominal), `0x01` (Active Hardware Latch), `0x02` (Fall Impact)
     * `[1-4]` Timestamp Epoch Seconds (uint32 Little Endian)
     * `[5]` Tilt Degrees: 0–180° (e.g. 84° indicates cane dropped on ground)
   * **Resolution Write:** Writing `0x00` from phone clears the active alert on the stick.

2. **Stick Telemetry Stream**
   * **UUID:** `0000c003-0000-1000-8000-00805f9b34fb`
   * **Properties:** `READ`, `NOTIFY`
   * **Binary Format (12 bytes):**
     * `[0-1]` Obstacle Distance in cm (uint16 Little Endian, e.g. 350cm = 3.5m)
     * `[2]` Obstacle Beam Angle (-45° to +45°)
     * `[3]` Ground Profile: `0` (Smooth), `1` (Paved), `2` (Tactile Pavers), `3` (Curb/Step)
     * `[4-6]` IMU Pitch, Roll, Yaw
     * `[7]` Tip Impact Sensor Triggered (`0` or `1`)
     * `[8]` Audible Tip Beeper Active (`0` or `1`)

3. **Device System Status**
   * **UUID:** `0000c004-0000-1000-8000-00805f9b34fb`
   * **Properties:** `READ`, `NOTIFY`
   * **Binary Format (8 bytes):**
     * System health, 4G LTE cellular signal bars (0–5), satellite lock quality, internal temperature.

4. **Haptic & Audio Actuator Control**
   * **UUID:** `0000c005-0000-1000-8000-00805f9b34fb`
   * **Properties:** `WRITE`, `WRITE_WITHOUT_RESPONSE`
   * **Commands:**
     * `0x01`: Lost Cane Locator Beeper Chirp (95dB)
     * `0x02`: Haptic Handle Vibration Pulse (Gentle, Moderate, Strong)

### 2.2 Standard Bluetooth Battery Service
* **Service UUID:** `0000180f-0000-1000-8000-00805f9b34fb`
* **Battery Level Characteristic UUID:** `00002a19-0000-1000-8000-00805f9b34fb`
* **Format:** uint8 (0–100%)

### 2.3 Device Information Service
* **Service UUID:** `0000180a-0000-1000-8000-00805f9b34fb`
* Manufacturer: `Canevyn Technologies`
* Model: `CX-7 Sentinel`
* Serial Number: `CNV-9942`
* Firmware: `v4.1.0`

## 3. Real BLE Client vs Mock Hardware Simulator

* **Production BLE Client (`frontend/js/ble/ble-client.js`):**
  Uses the standard Web Bluetooth API (`navigator.bluetooth`) with request filters and characteristic notification listeners. Ready for physical hardware pairing without architectural rewrites.

* **Mock Hardware Layer (`frontend/js/ble/mock-stick-device.js`):**
  Clearly separated module used strictly for development, unit testing, and interactive evaluation. Emulates physical latch pulls, dropped tilt angles, battery drain, and obstacle sweeps.
