/**
 * Clearly Separated Mock/Simulation Hardware Layer
 * DO NOT CONFUSE WITH REAL BLE CLIENT.
 * Used for development testing, CI/CD, and simulated cane hardware events
 * (latch pull, drop angle, battery wear, obstacle radar).
 */

export class MockCanevynStick {
  constructor() {
    this.name = 'Canevyn CX-7 Sentinel (Simulated)';
    this.serialNumber = 'CNV-9942-SIM';
    this.isConnected = true;
    this.batteryPercent = 82;
    this.obstacleDistanceCm = 350;
    this.tiltDegrees = 12; 
    this.sosActive = false;
    this.timer = null;

    this.listeners = {
      sos: [],
      telemetry: [],
      battery: [],
      connection: []
    };
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

  startSimulation() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (!this.isConnected) return;

      
      if (!this.sosActive) {
        this.obstacleDistanceCm = Math.floor(330 + Math.random() * 40);
        this.emit('telemetry', {
          obstacleDistanceCm: this.obstacleDistanceCm,
          obstacleAngleDeg: 0,
          obstacleStatus: this.obstacleDistanceCm < 150 ? 'Warning: Obstacle Ahead' : 'Clear Path',
          groundProfile: 'Approaching tactile sidewalk pavers before 3rd St',
          cellularBars: 4,
          cellularBand: '4G LTE Band 12 (Emergency Priority)',
          batteryPercent: this.batteryPercent
        });
      }
    }, 3000);
  }

  stopSimulation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

 
  triggerPhysicalHardwareSOS(options = {}) {
    this.sosActive = true;
    this.tiltDegrees = options.tiltDegrees || 84; // Cane dropped on pavement
    const packet = {
      triggerOrigin: 'PHYSICAL_HARDWARE_LATCH',
      status: 'ACTIVE',
      tiltDegrees: this.tiltDegrees,
      batteryPercent: this.batteryPercent,
      audibleBeaconDb: 95,
      latitude: options.latitude || 37.7879,
      longitude: options.longitude || -122.4034,
      timestamp: Date.now()
    };
    this.emit('sos', packet);
    return packet;
  }

  
  resolvePhysicalHardwareSOS() {
    this.sosActive = false;
    this.tiltDegrees = 15;
    this.emit('sos', {
      triggerOrigin: 'PHYSICAL_HARDWARE_LATCH',
      status: 'RESOLVED',
      resolutionSource: 'LATCH_PRESS',
      timestamp: Date.now()
    });
  }

  setBattery(percent) {
    this.batteryPercent = Math.max(0, Math.min(100, percent));
    this.emit('battery', { level: this.batteryPercent });
  }

  toggleConnection() {
    this.isConnected = !this.isConnected;
    this.emit('connection', { connected: this.isConnected, deviceName: this.name });
    return this.isConnected;
  }
}
