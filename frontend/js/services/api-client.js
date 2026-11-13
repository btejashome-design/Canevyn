/**
 * Canevyn API Client
 * Manages REST API communication, JWT authorization headers, and error handling.
 */

export class CanevynApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = this._resolveBaseUrl(baseUrl);
    // Prioritize tab-scoped sessionStorage so two open browser tabs (e.g. Blind User + Authorized Member)
    // do not clobber each other on reload, while preserving localStorage fallback for new tabs.
    const tabToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('canevyn_token') : null;
    const tabUser = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('canevyn_user') : null;
    this.token = tabToken || localStorage.getItem('canevyn_token') || null;
    try {
      this.currentUser = JSON.parse(tabUser || localStorage.getItem('canevyn_user') || 'null');
      if (this.token && this.currentUser && typeof sessionStorage !== 'undefined' && !tabToken) {
        sessionStorage.setItem('canevyn_token', this.token);
        sessionStorage.setItem('canevyn_user', JSON.stringify(this.currentUser));
      }
    } catch (e) {
      this.currentUser = null;
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('canevyn_user');
      localStorage.removeItem('canevyn_user');
    }
  }

  _resolveBaseUrl(customBase = '') {
    if (customBase) return customBase.replace(/\/+$/, '');
    if (typeof window === 'undefined' || !window.location) {
      return 'http://localhost:8000';
    }
    const { protocol, hostname, port, origin } = window.location;
    // When opened directly via file:// or origin is 'null'
    if (protocol === 'file:' || !origin || origin === 'null') {
      return 'http://localhost:8000';
    }
    // When served by FastAPI server on port 8000
    if (port === '8000') {
      return origin;
    }
    // When served via a dev server (e.g. Live Server on 5500, Vite on 5173, etc.)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:8000`;
    }
    return origin;
  }

  setSession(token, user) {
    this.token = token;
    this.currentUser = user;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('canevyn_token', token);
      sessionStorage.setItem('canevyn_user', JSON.stringify(user));
    }
    localStorage.setItem('canevyn_token', token);
    localStorage.setItem('canevyn_user', JSON.stringify(user));
  }

  updateCurrentUser(user) {
    this.currentUser = user;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('canevyn_user', JSON.stringify(user));
    }
    localStorage.setItem('canevyn_user', JSON.stringify(user));
  }

  clearSession() {
    this.token = null;
    this.currentUser = null;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('canevyn_token');
      sessionStorage.removeItem('canevyn_user');
    }
    localStorage.removeItem('canevyn_token');
    localStorage.removeItem('canevyn_user');
  }

  _extractErrorMessage(err, statusText = '') {
    if (!err) return statusText || 'API request failed';
    if (typeof err.detail === 'string') return err.detail;
    if (Array.isArray(err.detail)) {
      return err.detail.map(d => {
        const field = d.loc ? d.loc[d.loc.length - 1] : '';
        const prefix = field && field !== 'body' ? `${field.charAt(0).toUpperCase() + field.slice(1)}: ` : '';
        return `${prefix}${d.msg || JSON.stringify(d)}`;
      }).join('. ');
    }
    if (typeof err.message === 'string') return err.message;
    return statusText || 'API request failed';
  }

  async _fetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
        ...options,
        headers
      });
    } catch (networkErr) {
      console.error(`Network fetch failed for ${endpoint}:`, networkErr);
      throw new Error(
        `Unable to connect to Canevyn backend server at ${this.baseUrl}. Please verify the server is running on port 8000.`
      );
    }

    if (response.status === 401) {
      const err = await response.json().catch(() => ({ detail: 'Incorrect email or password.' }));
      if (endpoint !== '/auth/login') {
        this.clearSession();
        window.dispatchEvent(new CustomEvent('canevyn:unauthorized'));
        throw new Error(this._extractErrorMessage(err, 'Session expired or unauthorized'));
      }
      throw new Error(this._extractErrorMessage(err, 'Incorrect email or password.'));
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(this._extractErrorMessage(err, response.statusText));
    }

    return await response.json();
  }

  async login(email, password, roleHint = null) {
    const body = { email, password };
    if (roleHint) {
      body.role_hint = roleHint;
    }
    const res = await this._fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    this.setSession(res.access_token, res.user);
    return res;
  }

  async register(userData) {
    const res = await this._fetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    this.setSession(res.access_token, res.user);
    return res;
  }

  async getCurrentUser() {
    return await this._fetch('/auth/me');
  }

  async getUserDevice() {
    return await this._fetch('/devices/user/current');
  }

  async pingBeacon(deviceId) {
    return await this._fetch(`/devices/${deviceId}/ping-beacon`, { method: 'POST' });
  }

  async ingestTelemetry(telemetryData) {
    return await this._fetch('/telemetry/ingest', {
      method: 'POST',
      body: JSON.stringify(telemetryData)
    });
  }

  async getLatestTelemetry(userId) {
    return await this._fetch(`/telemetry/latest/${userId}`);
  }

  async reportHardwareSos(sosData) {
    return await this._fetch('/sos/hardware-trigger', {
      method: 'POST',
      body: JSON.stringify(sosData)
    });
  }

  async resolveHardwareSos(resolveData) {
    return await this._fetch('/sos/resolve', {
      method: 'POST',
      body: JSON.stringify(resolveData)
    });
  }

  async getActiveSos(userId) {
    return await this._fetch(`/sos/active/${userId}`);
  }

  async getGuardians() {
    return await this._fetch('/guardians/list');
  }

  async getMonitoredUsers() {
    return await this._fetch('/guardians/monitored-users');
  }

  async getNotifications(category = 'all') {
    return await this._fetch(`/notifications?category=${category}`);
  }

  async markNotificationRead(notificationId) {
    return await this._fetch(`/notifications/${notificationId}/mark-read`, { method: 'POST' });
  }

  // Guardian Connection Workflow Methods
  async searchCanevynUser(canevyn_user_id) {
    return await this._fetch('/guardians/search-user', {
      method: 'POST',
      body: JSON.stringify({ canevyn_user_id })
    });
  }

  async requestConnection(canevyn_user_id, relationship_label = 'Family / Caregiver') {
    return await this._fetch('/guardians/request-connection', {
      method: 'POST',
      body: JSON.stringify({ canevyn_user_id, relationship_label })
    });
  }

  async getMyGuardianRequests() {
    return await this._fetch('/guardians/my-requests');
  }

  async getPendingRequests() {
    return await this._fetch('/guardians/pending-requests');
  }

  async respondConnectionRequest(relationship_id, action) {
    return await this._fetch('/guardians/respond-request', {
      method: 'POST',
      body: JSON.stringify({ relationship_id, action })
    });
  }

  async cancelConnectionRequest(relationship_id) {
    return await this._fetch('/guardians/cancel-request', {
      method: 'POST',
      body: JSON.stringify({ relationship_id })
    });
  }

  // NEW INVERTED WORKFLOW: Blind User Initiates -> Authorized Member Accepts
  async searchAuthorizedMember(member_id) {
    return await this._fetch('/guardians/search-member', {
      method: 'POST',
      body: JSON.stringify({ member_id })
    });
  }

  async sendRequestToMember(member_id, relationship_label = 'Family / Caregiver') {
    return await this._fetch('/guardians/send-request-to-member', {
      method: 'POST',
      body: JSON.stringify({ member_id, relationship_label })
    });
  }

  async getMemberIncomingRequests() {
    return await this._fetch('/guardians/member-incoming-requests');
  }

  async memberRespondRequest(relationship_id, action) {
    return await this._fetch('/guardians/member-respond-request', {
      method: 'POST',
      body: JSON.stringify({ relationship_id, action })
    });
  }

  async revokeConnection(relationship_id) {
    return await this._fetch('/guardians/revoke-connection', {
      method: 'POST',
      body: JSON.stringify({ relationship_id })
    });
  }

  async removeConnection(relationship_id) {
    return await this._fetch('/guardians/remove-connection', {
      method: 'POST',
      body: JSON.stringify({ relationship_id })
    });
  }

  async getUserSettings() {
    return await this._fetch('/auth/settings');
  }

  async updateUserSettings(payload) {
    return await this._fetch('/auth/settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async forgotPassword(email) {
    return await this._fetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Voice Briefing & Command Interpretation
  async getVoiceWelcomeBriefing() {
    return await this._fetch('/voice/welcome-briefing');
  }

  async interpretVoiceCommand(payload) {
    return await this._fetch('/voice/interpret-command', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Real Phone GPS Telemetry
  async getLocationStatus() {
    return await this._fetch('/telemetry/location/status');
  }

  async updatePhoneLocation(payload) {
    return await this._fetch('/telemetry/location', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async stopPhoneLocation() {
    return await this._fetch('/telemetry/location/stop', {
      method: 'POST'
    });
  }
}
