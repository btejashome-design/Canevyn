

import { CANEVYN_GATT } from './gatt-specs.js';

export class CanevynBLEClient {
  constructor() {
    this.device = null;
    this.server = null;
    this.isConnected = false;
    this.listeners = {
      sos: [],
      telemetry: [],
      battery: [],
      connection: []
    };
  }

  isSupported() {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  async connect() {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser or context.');
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [CANEVYN_GATT.SERVICES.PRIMARY] },
          { namePrefix: 'Canevyn' }
        ],
        optionalServices: [
          CANEVYN_GATT.SERVICES.BATTERY,
          CANEVYN_GATT.SERVICES.LOCATION,
          CANEVYN_GATT.SERVICES.INFO
        ]
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.isConnected = false;
        this.emit('connection', { connected: false, deviceName: this.device.name });
      });

      this.server = await this.device.gatt.connect();
      this.isConnected = true;
      this.emit('connection', { connected: true, deviceName: this.device.name });

      
      const primaryService = await this.server.getPrimaryService(CANEVYN_GATT.SERVICES.PRIMARY);

      
      const sosChar = await primaryService.getCharacteristic(CANEVYN_GATT.CHARACTERISTICS.SOS_EVENT);
      await sosChar.startNotifications();
      sosChar.addEventListener('characteristicvaluechanged', (e) => this._handleSosPacket(e.target.value));

     
      const telemetryChar = await primaryService.getCharacteristic(CANEVYN_GATT.CHARACTERISTICS.TELEMETRY_STREAM);
      await telemetryChar.startNotifications();
      telemetryChar.addEventListener('characteristicvaluechanged', (e) => this._handleTelemetryPacket(e.target.value));

     
      try {
        const batteryService = await this.server.getPrimaryService(CANEVYN_GATT.SERVICES.BATTERY);
        const battChar = await batteryService.getCharacteristic(CANEVYN_GATT.CHARACTERISTICS.BATTERY_LEVEL);
        await battChar.startNotifications();
        battChar.addEventListener('characteristicvaluechanged', (e) => {
          const level = e.target.value.getUint8(0);
          this.emit('battery', { level });
        });
      } catch (err) {
        console.warn('Battery service optional subscribe error:', err);
      }

      return { connected: true, deviceName: this.device.name };
    } catch (error) {
      this.isConnected = false;
      this.emit('connection', { connected: false, error: error.message });
      throw error;
    }
  }

  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.isConnected = false;
  }

  _handleSosPacket(dataView) {
   
    const status = dataView.getUint8(0);
    const tilt = dataView.byteLength > 5 ? dataView.getUint8(5) : 84;
    
    if (status !== CANEVYN_GATT.SOS_FLAGS.NOMINAL) {
      this.emit('sos', {
        triggerOrigin: 'PHYSICAL_HARDWARE_LATCH',
        status: 'ACTIVE',
        tiltDegrees: tilt,
        timestamp: Date.now()
      });
    }
  }

  _handleTelemetryPacket(dataView) {
    const obstacleCm = dataView.getUint16(0, true);
    const beamAngle = dataView.getInt8(2);
    const profile = dataView.getUint8(3);
    this.emit('telemetry', {
      obstacleDistanceCm: obstacleCm,
      obstacleAngleDeg: beamAngle,
      groundProfileId: profile
    });
  }
}
