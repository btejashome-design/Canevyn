/**
 * Real-time WebSocket Client for Canevyn Telemetry & Emergency Alerts
 * Enforces token authentication on connection query string.
 */

export class CanevynWebSocketClient {
  constructor() {
    this.ws = null;
    this.userId = null;
    this.token = null;
    this.reconnectTimer = null;
    this.listeners = {
      sos: [],
      telemetry: [],
      status: [],
      connectionStatus: [],
      locationUpdate: [],
      locationStopped: [],
      connectionRevoked: [],
      connectionRemovedByMember: []
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

  connect(userId, token = null) {
    this.userId = userId;
    if (token) this.token = token;

    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }

    const protocol = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? 'wss:' : 'ws:';
    let host = (typeof window !== 'undefined' && window.location.host) || 'localhost:8000';
    if (typeof window !== 'undefined') {
      if (window.location.protocol === 'file:' || !window.location.host || window.location.host === 'null') {
        host = 'localhost:8000';
      } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        if (window.location.port !== '8000') {
          host = `${window.location.hostname}:8000`;
        }
      }
    }
    const query = this.token ? `?token=${encodeURIComponent(this.token)}` : '';
    const url = `${protocol}//${host}/ws/${userId}${query}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('Authenticated WebSocket link connected for Canevyn user:', userId);
        this.emit('status', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'HARDWARE_SOS_ALERT') {
            this.emit('sos', msg.data);
          } else if (msg.type === 'TELEMETRY_UPDATE') {
            this.emit('telemetry', msg.data);
          } else if (msg.type === 'CONNECTION_STATUS_UPDATE') {
            this.emit('connectionStatus', msg.data);
          } else if (msg.type === 'LOCATION_UPDATE') {
            this.emit('locationUpdate', msg.data);
          } else if (msg.type === 'LOCATION_SHARING_STOPPED') {
            this.emit('locationStopped', msg.data);
          } else if (msg.type === 'CONNECTION_REVOKED') {
            this.emit('connectionRevoked', msg.data);
          } else if (msg.type === 'CONNECTION_REMOVED_BY_MEMBER') {
            this.emit('connectionRemovedByMember', msg.data);
          }
        } catch (e) {
          console.error('Failed to parse incoming WS message:', e);
        }
      };

      this.ws.onclose = (event) => {
        this.emit('status', { connected: false });
        if (event.code === 1008) {
          console.warn('WebSocket connection rejected by server: Unauthorized/Policy violation.');
          return; // Do not reconnect if unauthorized
        }
        this._scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };
    } catch (err) {
      console.warn('Could not initialize WebSocket:', err);
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.userId && this.token) {
        this.connect(this.userId, this.token);
      }
    }, 4000);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.userId = null;
    this.token = null;
  }
}
