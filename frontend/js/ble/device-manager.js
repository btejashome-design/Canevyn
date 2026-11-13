

import { CanevynBLEClient } from './ble-client.js';
import { MockCanevynStick } from './mock-stick-device.js';
import { appConfig } from '../config.js';

export class CanevynDeviceManager {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.mode = 'mock'; 
    this.bleClient = new CanevynBLEClient();
    this.mockStick = new MockCanevynStick();
    
    this.activeDevice = {
      id: null,
      model: null,
      serialNumber: null,
      firmware: null,
      batteryPercent: null,
      isConnected: false,
      isHardwareIntegrated: false,
      obstacleDistanceCm: null,
      obstacleStatus: null,
      isSosActive: false,
      activeSosId: null
    };

    this.listeners = {
      deviceUpdate: [],
      sosEvent: [],
      telemetryUpdate: []
    };

    this._setupHandlers();
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

  _setupHandlers() {
    // 1. Mock Hardware handlers
    this.mockStick.on('sos', async (packet) => {
      if (this.mode === 'mock') {
        await this._handleHardwareSosPacket(packet);
      }
    });

    this.mockStick.on('telemetry', async (telemetry) => {
      if (this.mode === 'mock') {
        this.activeDevice.batteryPercent = telemetry.batteryPercent;
        this.activeDevice.obstacleDistanceCm = telemetry.obstacleDistanceCm;
        this.activeDevice.obstacleStatus = telemetry.obstacleStatus;
        this.emit('telemetryUpdate', telemetry);
        this.emit('deviceUpdate', this.activeDevice);
        // Relay telemetry to backend if user is authenticated
        if (this.apiClient && this.apiClient.token) {
          try {
            await this.apiClient.ingestTelemetry({
              device_id: this.activeDevice.id,
              battery_percent: telemetry.batteryPercent,
              obstacle_distance_cm: telemetry.obstacleDistanceCm,
              obstacle_status: telemetry.obstacleStatus
            });
          } catch (e) {
            // Silently ignore telemetry sync errors when offline
          }
        }
      }
    });

    this.mockStick.on('connection', (state) => {
      if (this.mode === 'mock') {
        this.activeDevice.isConnected = state.connected;
        this.emit('deviceUpdate', this.activeDevice);
      }
    });

    // 2. Real BLE handlers
    this.bleClient.on('sos', async (packet) => {
      if (this.mode === 'real_ble') {
        await this._handleHardwareSosPacket(packet);
      }
    });

    this.bleClient.on('telemetry', (data) => {
      if (this.mode === 'real_ble') {
        this.activeDevice.obstacleDistanceCm = data.obstacleDistanceCm;
        this.emit('telemetryUpdate', data);
        this.emit('deviceUpdate', this.activeDevice);
      }
    });

    this.bleClient.on('battery', (data) => {
      if (this.mode === 'real_ble') {
        this.activeDevice.batteryPercent = data.level;
        this.emit('deviceUpdate', this.activeDevice);
      }
    });

    this.bleClient.on('connection', (state) => {
      if (this.mode === 'real_ble') {
        this.activeDevice.isConnected = state.connected;
        this.emit('deviceUpdate', this.activeDevice);
      }
    });
  }

  async _handleHardwareSosPacket(packet) {
    if (packet.status === 'ACTIVE') {
      this.activeDevice.isSosActive = true;
      // Pipeline: Canevyn Stick -> BLE -> Canevyn User Phone -> Backend -> Authorized Member
      if (this.apiClient && this.apiClient.token) {
        try {
          const sosResp = await this.apiClient.reportHardwareSos({
            device_id: this.activeDevice.id,
            canevyn_user_id: this.apiClient.currentUser ? this.apiClient.currentUser.id : 'usr-arthur-vance',
            trigger_origin: 'PHYSICAL_HARDWARE_LATCH',
            latitude: packet.latitude || 37.7879,
            longitude: packet.longitude || -122.4034,
            tilt_degrees: packet.tiltDegrees || 84,
            battery_percent: this.activeDevice.batteryPercent,
            audible_beacon_db: 95
          });
          this.activeDevice.activeSosId = sosResp.id;
        } catch (err) {
          console.error('Failed to relay hardware SOS to Canevyn Backend:', err);
        }
      }
      this.emit('sosEvent', {
        status: 'ACTIVE',
        packet: packet,
        device: this.activeDevice
      });
    } else if (packet.status === 'RESOLVED') {
      this.activeDevice.isSosActive = false;
      if (this.activeDevice.activeSosId && this.apiClient && this.apiClient.token) {
        try {
          await this.apiClient.resolveHardwareSos({
            sos_id: this.activeDevice.activeSosId,
            resolution_source: packet.resolutionSource || 'LATCH_PRESS',
            resolved_by_user_id: this.apiClient.currentUser ? this.apiClient.currentUser.id : 'usr-arthur-vance'
          });
        } catch (err) {
          console.error('Failed to notify backend of SOS resolution:', err);
        }
      }
      this.activeDevice.activeSosId = null;
      this.emit('sosEvent', {
        status: 'RESOLVED',
        device: this.activeDevice
      });
    }
  }

  async switchToRealBLE() {
    this.mockStick.stopSimulation();
    this.mode = 'real_ble';
    return await this.bleClient.connect();
  }

  switchToMock() {
    this.bleClient.disconnect();
    this.mode = 'mock';
    this.mockStick.startSimulation();
    this.activeDevice.isConnected = true;
    this.emit('deviceUpdate', this.activeDevice);
  }

  /**
   * Helper for development hardware simulation controls
   * STRICT BOUNDARY: Never callable in production.
   */
  simulateHardwareLatchPull() {
    if (appConfig.isProduction) {
      throw new Error('Hardware simulation is strictly prohibited in production builds.');
    }
    return this.mockStick.triggerPhysicalHardwareSOS();
  }

  simulateHardwareLatchReset() {
    if (appConfig.isProduction) {
      throw new Error('Hardware simulation is strictly prohibited in production builds.');
    }
    return this.mockStick.resolvePhysicalHardwareSOS();
  }

  async resolveActiveSosFromUserApp() {
    this.activeDevice.isSosActive = false;
    if (this.activeDevice.activeSosId && this.apiClient) {
      await this.apiClient.resolveHardwareSos({
        sos_id: this.activeDevice.activeSosId,
        resolution_source: 'APP_HOLD_3S',
        resolved_by_user_id: this.apiClient.currentUser ? this.apiClient.currentUser.id : 'usr-arthur-vance',
        notes: 'User held 3-second accessible button to resolve hardware alert.'
      });
      this.activeDevice.activeSosId = null;
    }
    this.emit('sosEvent', { status: 'RESOLVED', device: this.activeDevice });
  }
}
