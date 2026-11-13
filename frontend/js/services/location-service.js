/**
 * Canevyn Phone GPS Location Service
 * Uses the browser Geolocation API directly with high-accuracy settings.
 * Tracks sharing preference, browser permission, active watch, and coordinate freshness separately.
 * Never fabricates fallback coordinates or treats stale fixes as live.
 */

export const LOCATION_STATUS = Object.freeze({
  PERMISSION_REQUIRED: 'Permission Required',
  PERMISSION_GRANTED: 'Location Permission Granted',
  READY_TO_RESUME: 'Ready to Resume',
  SEARCHING: 'Searching for GPS',
  ACTIVE: 'Live Location Active',
  PAUSED: 'Location Sharing Paused',
  SIGNAL_UNAVAILABLE: 'GPS Signal Unavailable',
  PERMISSION_DENIED: 'Location Permission Denied',
  NETWORK_OFFLINE: 'Network Offline'
});

const GEO_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000
});

const UPLOAD_INTERVAL_MS = 5000;
const FAST_MOVE_COOLDOWN_MS = 2000;
const FAST_MOVE_METERS = 10;
const STATIONARY_MOVE_THRESHOLD_METERS = 1.5;
const HEARTBEAT_INTERVAL_MS = 30000;
const STALE_OFFLINE_MAX_AGE_MS = 15000;
const SIGNAL_STALE_MS = 60000;   // 60 seconds -> GPS Signal Lost / Stale Location
const SIGNAL_EXPIRED_MS = 300000; // 5 minutes -> Live Location: Not Available

export class CanevynLocationService {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.listeners = {};
    this.watchId = null;
    this.watchdogTimer = null;
    this.permissionStatus = null;
    this.isSharing = false;
    this.isStarting = false;
    this.savedSharingEnabled = false; // Persisted preference from SQLite users.location_sharing_enabled
    this.permissionState = 'prompt'; // 'prompt' | 'granted' | 'denied' | 'unsupported'
    this.status = LOCATION_STATUS.PERMISSION_REQUIRED;
    this.errorMessage = '';
    this.latestFix = null;
    this.pendingOfflineFix = null;
    this.lastUploadedFix = null;
    this.lastUploadAtMs = 0;
    this.isUploading = false;
    this.isStaleSignal = false;
    this.hasAnnouncedSignalLoss = false;

    this._onOnline = this._handleOnline.bind(this);
    this._onOffline = this._handleOffline.bind(this);
    window.addEventListener('online', this._onOnline);
    window.addEventListener('offline', this._onOffline);
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  _emit(event, payload) {
    (this.listeners[event] || []).forEach(cb => cb(payload));
  }

  getSnapshot() {
    const nowMs = Date.now();
    const hasCoords = Boolean(
      this.latestFix &&
      Number.isFinite(this.latestFix.latitude) &&
      Number.isFinite(this.latestFix.longitude)
    );
    const fixAgeMs = hasCoords ? Math.max(0, nowMs - this.latestFix.receivedAtMs) : null;
    const isFresh = Boolean(hasCoords && fixAgeMs <= SIGNAL_STALE_MS);
    const isExpired = Boolean(hasCoords && fixAgeMs > SIGNAL_EXPIRED_MS);
    const visibleHasFix = hasCoords && !isExpired;
    const isWatchRunning = this.watchId !== null;
    const needsResume = Boolean(
      this.savedSharingEnabled &&
      !this.isSharing &&
      this.permissionState !== 'denied' &&
      this.permissionState !== 'unsupported'
    );

    return {
      isSharing: this.isSharing,
      savedSharingEnabled: this.savedSharingEnabled,
      isWatchRunning,
      needsResume,
      hasFreshFix: isFresh,
      isStaleSignal: this.isStaleSignal || Boolean(hasCoords && fixAgeMs > SIGNAL_STALE_MS),
      status: this.status,
      permissionState: this.permissionState,
      errorMessage: this.errorMessage,
      isOnline: navigator.onLine !== false,
      isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
      isSecureContext: typeof window !== 'undefined' ? Boolean(window.isSecureContext) : true,
      hasFix: visibleHasFix,
      isLiveActive: this.isSharing && this.status === LOCATION_STATUS.ACTIVE && visibleHasFix && !this.isStaleSignal,
      latitude: visibleHasFix ? this.latestFix.latitude : null,
      longitude: visibleHasFix ? this.latestFix.longitude : null,
      accuracy: visibleHasFix ? this.latestFix.accuracy : null,
      heading: visibleHasFix ? this.latestFix.heading : null,
      speed: visibleHasFix ? this.latestFix.speed : null,
      timestamp: visibleHasFix ? this.latestFix.timestamp : null,
      lastUploadAt: this.lastUploadAtMs ? new Date(this.lastUploadAtMs).toISOString() : null,
      isApproximate: visibleHasFix && this.latestFix.accuracy > 100
    };
  }

  _setStatus(status, errorMessage = '') {
    this.status = status;
    this.errorMessage = errorMessage;
    this._emit('statusChange', this.getSnapshot());
  }

  /**
   * Synchronizes the persisted backend location_sharing_enabled preference after page refresh.
   * Distinguishes saved preference from active GPS watch and never marks Live Location Active
   * until a fresh GPS coordinate is actually received.
   */
  syncSavedPreference(savedEnabled) {
    this.savedSharingEnabled = Boolean(savedEnabled);
    if (this.isSharing) return this.getSnapshot();

    if (this.permissionState === 'denied') {
      this._setStatus(
        LOCATION_STATUS.PERMISSION_DENIED,
        'Location permission was denied in browser settings. Re-enable location access for Canevyn and try again.'
      );
      return this.getSnapshot();
    }

    if (this.savedSharingEnabled) {
      if (this.permissionState === 'granted') {
        this._setStatus(
          LOCATION_STATUS.READY_TO_RESUME,
          'Location sharing was active before this page loaded. Tap Resume Live Location to restart GPS tracking.'
        );
      } else {
        this._setStatus(
          LOCATION_STATUS.PERMISSION_REQUIRED,
          'Location sharing is enabled on your account. Tap Enable Live Location to allow browser GPS access.'
        );
      }
    } else if (this.permissionState === 'granted') {
      this._setStatus(LOCATION_STATUS.PERMISSION_GRANTED, '');
    } else {
      this._setStatus(LOCATION_STATUS.PERMISSION_REQUIRED, '');
    }

    return this.getSnapshot();
  }

  /**
   * Passive check only — never prompts the browser geolocation permission popup.
   */
  async checkPermissionStatus() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.permissionState = 'unsupported';
      this._setStatus(
        LOCATION_STATUS.SIGNAL_UNAVAILABLE,
        'This browser does not support GPS geolocation.'
      );
      return this.permissionState;
    }

    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        this.permissionStatus = perm;
        this._syncPermissionState(perm.state, false);
        perm.onchange = () => {
          this._syncPermissionState(perm.state, true);
        };
      } catch (e) {
        this.permissionState = 'prompt';
      }
    }
    return this.permissionState;
  }

  _syncPermissionState(state, fromChangeEvent) {
    this.permissionState = state;
    if (state === 'denied') {
      const wasSharing = this.isSharing || this.watchId !== null;
      this._clearWatchOnly();
      this._stopWatchdog();
      this.isSharing = false;
      this.latestFix = null;
      this._setStatus(
        LOCATION_STATUS.PERMISSION_DENIED,
        'Location permission was denied in browser settings. Re-enable location access for Canevyn and try again.'
      );
      if (wasSharing || fromChangeEvent) {
        this.savedSharingEnabled = false;
        this._notifyBackendStopped();
      }
      return;
    }

    if (!this.isSharing) {
      this.syncSavedPreference(this.savedSharingEnabled);
    }
  }

  /**
   * Requests browser location permission from an explicit user action or granted resume,
   * and starts continuous watchPosition tracking.
   */
  requestAndStartSharing() {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.permissionState = 'unsupported';
      this._setStatus(
        LOCATION_STATUS.SIGNAL_UNAVAILABLE,
        'Your device browser does not expose the Geolocation API.'
      );
      this._emit('error', { code: 'UNSUPPORTED', snapshot: this.getSnapshot() });
      return false;
    }

    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (typeof window !== 'undefined' && !window.isSecureContext && !isLocalHost) {
      this._setStatus(
        LOCATION_STATUS.SIGNAL_UNAVAILABLE,
        'Real phone GPS requires HTTPS or localhost. Open Canevyn over HTTPS on your phone to enable GPS.'
      );
      this._emit('error', { code: 'INSECURE_CONTEXT', snapshot: this.getSnapshot() });
      return false;
    }

    // Prevent creating multiple concurrent watchPosition instances
    if (this.isSharing && (this.watchId !== null || this.isStarting)) {
      return true;
    }

    this._clearWatchOnly();
    this.isSharing = true;
    this.isStarting = true;
    this.isStaleSignal = false;
    this.hasAnnouncedSignalLoss = false;
    this._startWatchdog();

    this._setStatus(
      navigator.onLine === false ? LOCATION_STATUS.NETWORK_OFFLINE : LOCATION_STATUS.SEARCHING,
      navigator.onLine === false ? 'Network Offline – Location Update Paused' : ''
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isStarting = false;
        if (!this.isSharing) return;
        this.permissionState = 'granted';
        this.savedSharingEnabled = true;
        this._handlePosition(position, true);
        this._startWatch();
      },
      (error) => {
        this.isStarting = false;
        this._handleGeoError(error, true);
      },
      GEO_OPTIONS
    );
    return true;
  }

  _startWatch() {
    if (!this.isSharing || !('geolocation' in navigator)) return;
    if (this.watchId !== null) return; // Guarantee only one active GPS watch exists

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!this.isSharing) return;
        this.permissionState = 'granted';
        this._handlePosition(position, false);
      },
      (error) => {
        this._handleGeoError(error, false);
      },
      GEO_OPTIONS
    );
  }

  _clearWatchOnly() {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  _startWatchdog() {
    this._stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (!this.isSharing || !this.latestFix) return;
      const ageMs = Date.now() - this.latestFix.receivedAtMs;

      if (ageMs > SIGNAL_EXPIRED_MS) {
        this.isStaleSignal = true;
        this.latestFix = null;
        this._setStatus(
          LOCATION_STATUS.SIGNAL_UNAVAILABLE,
          'Live Location: Not Available — no GPS updates received for over 5 minutes.'
        );
        if (!this.hasAnnouncedSignalLoss) {
          this.hasAnnouncedSignalLoss = true;
          this._emit('error', { code: 'SIGNAL_LOST', snapshot: this.getSnapshot() });
        }
      } else if (ageMs > SIGNAL_STALE_MS && !this.isStaleSignal) {
        this.isStaleSignal = true;
        this._setStatus(
          LOCATION_STATUS.SIGNAL_UNAVAILABLE,
          'GPS Signal Lost — stale location (no new coordinates for over 60 seconds).'
        );
        if (!this.hasAnnouncedSignalLoss) {
          this.hasAnnouncedSignalLoss = true;
          this._emit('error', { code: 'SIGNAL_LOST', snapshot: this.getSnapshot() });
        }
      }
    }, 10000);
  }

  _stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  async stopSharing({ notifyBackend = true } = {}) {
    this._clearWatchOnly();
    this._stopWatchdog();
    this.isSharing = false;
    this.isStarting = false;
    this.savedSharingEnabled = false;
    this.latestFix = null;
    this.pendingOfflineFix = null;
    this.lastUploadedFix = null;
    this.isStaleSignal = false;
    this.hasAnnouncedSignalLoss = false;

    if (this.permissionState === 'denied') {
      this._setStatus(
        LOCATION_STATUS.PERMISSION_DENIED,
        'Location permission is denied in browser settings.'
      );
    } else {
      this._setStatus(LOCATION_STATUS.PAUSED, '');
    }

    if (notifyBackend) {
      await this._notifyBackendStopped();
    }
  }

  async _notifyBackendStopped() {
    if (!this.apiClient || !this.apiClient.token) return;
    try {
      await this.apiClient.stopPhoneLocation();
    } catch (e) {
      console.warn('Could not notify backend of location stop:', e.message);
    }
  }

  _normalizePosition(position) {
    if (!position || !position.coords) return null;
    const { latitude, longitude, accuracy, heading, speed } = position.coords;

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180
    ) {
      return null;
    }

    const safeAccuracy = Number.isFinite(accuracy) && accuracy >= 0 ? Number(accuracy) : null;
    if (safeAccuracy === null) return null;

    const safeHeading = (Number.isFinite(heading) && heading >= 0 && heading <= 360)
      ? Number(heading)
      : null;

    const safeSpeed = (Number.isFinite(speed) && speed >= 0)
      ? Number(speed)
      : null;

    const tsMs = Number.isFinite(position.timestamp) ? position.timestamp : Date.now();
    const timestamp = new Date(tsMs).toISOString();

    return {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: safeAccuracy,
      heading: safeHeading,
      speed: safeSpeed,
      timestamp,
      receivedAtMs: Date.now()
    };
  }

  _handlePosition(position, isInitialFix) {
    const fix = this._normalizePosition(position);
    if (!fix) {
      this._setStatus(
        LOCATION_STATUS.SIGNAL_UNAVAILABLE,
        'Received incomplete GPS coordinates. Waiting for a valid GPS fix.'
      );
      return;
    }

    this.latestFix = fix;
    this.isStaleSignal = false;
    this.hasAnnouncedSignalLoss = false;
    this._emit('locationUpdate', this.getSnapshot());

    if (navigator.onLine === false) {
      // Keep only the single latest fix temporarily in memory; never buffer a backlog.
      this.pendingOfflineFix = fix;
      this._setStatus(
        LOCATION_STATUS.NETWORK_OFFLINE,
        'Network Offline – Location Update Paused'
      );
      return;
    }

    this.pendingOfflineFix = null;
    this._setStatus(LOCATION_STATUS.ACTIVE, '');
    this._maybeUploadFix(fix, isInitialFix);
  }

  _handleGeoError(error, isInitialFix) {
    if (!error) return;

    if (error.code === 1) {
      this.permissionState = 'denied';
      this.savedSharingEnabled = false;
      this._clearWatchOnly();
      this._stopWatchdog();
      this.isSharing = false;
      this.latestFix = null;
      this._setStatus(
        LOCATION_STATUS.PERMISSION_DENIED,
        'Location permission denied. Enable location access in your browser site settings and tap Enable Live Location again.'
      );
      this._notifyBackendStopped();
      this._emit('error', { code: 'PERMISSION_DENIED', snapshot: this.getSnapshot() });
      return;
    }

    if (error.code === 2) {
      if (isInitialFix) {
        this.isSharing = false;
        this._clearWatchOnly();
        this._stopWatchdog();
      }
      this._setStatus(
        LOCATION_STATUS.SIGNAL_UNAVAILABLE,
        'GPS signal is currently unavailable. Check that phone Location Services (GPS) are turned on and try near an open sky.'
      );
      this._emit('error', { code: 'POSITION_UNAVAILABLE', snapshot: this.getSnapshot() });
      return;
    }

    if (error.code === 3) {
      if (isInitialFix) {
        this.isSharing = false;
        this._clearWatchOnly();
        this._stopWatchdog();
      }
      this._setStatus(
        LOCATION_STATUS.SIGNAL_UNAVAILABLE,
        'Timed out waiting for a high-accuracy GPS fix. Move toward a window or outdoors and try again.'
      );
      this._emit('error', { code: 'TIMEOUT', snapshot: this.getSnapshot() });
    }
  }

  async _maybeUploadFix(fix, forceInitial = false) {
    if (!this.isSharing || !this.apiClient || !this.apiClient.token || this.isUploading) return;
    if (navigator.onLine === false) return;

    const now = Date.now();
    const elapsed = now - this.lastUploadAtMs;
    let shouldSend = forceInitial || !this.lastUploadedFix;

    if (!shouldSend && this.lastUploadedFix) {
      const movedMeters = this._haversineMeters(
        this.lastUploadedFix.latitude,
        this.lastUploadedFix.longitude,
        fix.latitude,
        fix.longitude
      );
      const accuracyChanged = Math.abs(fix.accuracy - this.lastUploadedFix.accuracy) >= 5;

      if (movedMeters > FAST_MOVE_METERS && elapsed >= FAST_MOVE_COOLDOWN_MS) {
        shouldSend = true;
      } else if ((movedMeters >= STATIONARY_MOVE_THRESHOLD_METERS || accuracyChanged) && elapsed >= UPLOAD_INTERVAL_MS) {
        shouldSend = true;
      } else if (elapsed >= HEARTBEAT_INTERVAL_MS) {
        shouldSend = true;
      }
    }

    if (!shouldSend) return;

    this.isUploading = true;
    try {
      await this.apiClient.updatePhoneLocation({
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy_meters: fix.accuracy,
        heading_deg: fix.heading,
        speed_mps: fix.speed,
        recorded_at: fix.timestamp
      });
      this.savedSharingEnabled = true;
      this.lastUploadedFix = fix;
      this.lastUploadAtMs = Date.now();
      this._setStatus(LOCATION_STATUS.ACTIVE, '');
      this._emit('uploadSuccess', this.getSnapshot());
    } catch (err) {
      const isNetworkErr = navigator.onLine === false || (err && (err.name === 'TypeError' || String(err.message || '').includes('Unable to connect')));
      if (isNetworkErr) {
        this.pendingOfflineFix = fix;
        this._setStatus(
          LOCATION_STATUS.NETWORK_OFFLINE,
          'Network Offline – Location Update Paused'
        );
        this._emit('error', { code: 'NETWORK_OFFLINE', snapshot: this.getSnapshot() });
      } else {
        console.warn('Phone GPS upload error:', err.message);
        this._emit('error', { code: 'UPLOAD_FAILED', snapshot: this.getSnapshot() });
      }
    } finally {
      this.isUploading = false;
    }
  }

  _handleOnline() {
    if (!this.isSharing) return;
    const latest = this.pendingOfflineFix || this.latestFix;
    this.pendingOfflineFix = null;

    if (latest && (Date.now() - latest.receivedAtMs) <= STALE_OFFLINE_MAX_AGE_MS) {
      this._setStatus(LOCATION_STATUS.ACTIVE, '');
      this._maybeUploadFix(latest, true);
    } else {
      // Request one fresh coordinate instead of uploading stale offline data
      this._setStatus(LOCATION_STATUS.SEARCHING, 'Reconnected — acquiring fresh GPS coordinate.');
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (this.isSharing) this._handlePosition(pos, true);
          },
          () => {
            if (this.isSharing) this._startWatch();
          },
          GEO_OPTIONS
        );
      }
    }
  }

  _handleOffline() {
    if (this.isSharing) {
      this._setStatus(
        LOCATION_STATUS.NETWORK_OFFLINE,
        'Network Offline – Location Update Paused'
      );
    }
  }

  _haversineMeters(lat1, lon1, lat2, lon2) {
    const toRad = deg => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  destroy() {
    this._clearWatchOnly();
    this._stopWatchdog();
    window.removeEventListener('online', this._onOnline);
    window.removeEventListener('offline', this._onOffline);
  }
}
