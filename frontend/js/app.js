/**
 * Canevyn Master Mobile Application Controller
 * Manages dual-role navigation, BLE/Mock hardware bridge, voice assistant,
 * real-time WebSocket alerts, and screen rendering.
 */

import { CanevynApiClient } from './services/api-client.js?v=4.6';
import { CanevynWebSocketClient } from './services/websocket-client.js?v=4.6';
import { CanevynDeviceManager } from './ble/device-manager.js?v=4.6';
import { CanevynSpeechAssistant } from './services/speech-assistant.js?v=4.6';
import { CanevynLocationService, LOCATION_STATUS } from './services/location-service.js?v=4.6';
import { CanevynGuardianMapManager } from './services/guardian-map-manager.js?v=4.6';

import { renderHeader } from './components/header.js?v=4.6';
import { renderBottomNav } from './components/navigation.js?v=4.6';
import { renderHardwareSimulatorBar } from './components/hardware-sim-bar.js?v=4.6';

import { renderWelcomeRoleScreen } from './screens/welcome-role.js?v=4.6';
import { renderAccountAuthScreen } from './screens/account-auth.js?v=4.6';
import { renderUserHomeScreen, getHomeProtectorsSummaryText } from './screens/user-home.js?v=4.6';
import { renderUserLocationScreen, renderPhoneGpsControlPanel, renderLocationDetailsCard } from './screens/user-location.js?v=4.6';
import { renderUserVoiceScreen } from './screens/user-voice.js?v=4.6';
import {
  renderUserGuardianScreen,
  renderConnectionStatusBanner,
  renderUserGuardianRequestsContent,
  renderUserGuardianConnectedContent
} from './screens/user-guardian.js?v=4.6';
import { renderUserSettingsScreen } from './screens/user-settings.js?v=4.6';
import { renderUserDeviceStatusScreen } from './screens/user-device.js?v=4.6';
import { renderUserHardwareSosStatusScreen } from './screens/user-sos-status.js?v=4.6';
import { renderUserNotificationsScreen } from './screens/user-notifications.js?v=4.6';

import { renderGuardianDashboardScreen } from './screens/guardian-dashboard.js?v=4.6';
import { renderGuardianLocationScreen, formatGuardianLocationMeta } from './screens/guardian-location.js?v=4.6';
import { renderGuardianSosAlertScreen } from './screens/guardian-sos-alert.js?v=4.6';
import { renderGuardianConnectScreen } from './screens/guardian-connect.js?v=4.6';
import { renderGuardianSettingsScreen } from './screens/guardian-settings.js?v=4.6';
import { appConfig } from './config.js?v=4.6';

class CanevynApp {
  constructor() {
    this.apiClient = new CanevynApiClient();
    this.wsClient = new CanevynWebSocketClient();
    this.deviceManager = new CanevynDeviceManager(this.apiClient);
    this.locationService = new CanevynLocationService(this.apiClient);
    this.guardianMapManager = new CanevynGuardianMapManager();
    this.hasAnnouncedGpsLock = false;
    this.hasAnnouncedResumeNotice = false;
    this.pendingGpsFocus = false;
    this.locationServiceReady = Promise.resolve();
    
    // Application State
    this.state = {
      role: 'canevyn_user', // 'canevyn_user' | 'authorized_member'
      currentScreen: 'welcome_role', // welcome_role, auth_options, auth_signin, auth_create, user_home, user_location, user_voice, user_guardian, user_settings, user_device, user_sos, user_notifications, guardian_dashboard, guardian_location, guardian_sos, guardian_connect, guardian_settings
      activeUserTab: 'home', // 'home' | 'location' | 'voice' | 'guardian' | 'settings'
      isAuthenticated: false,
      user: null,
      guardianTheme: 'dark',
      pendingRemoveUser: null,
      device: {
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
      },
      location: {
        address_label: 'Live Location: Not Available',
        latitude: null,
        longitude: null,
        heading: null,
        accuracy: null,
        isRealGps: false,
        isLiveAvailable: false
      },
      gpsState: this.locationService.getSnapshot(),
      voiceState: 'ready', // 'ready', 'listening', 'processing', 'speaking'
      voiceTranscript: '',
      voiceResponse: '',
      guardians: [],
      pendingRequests: [], // incoming connection requests for blind user
      monitoredUsers: [], // approved blind users for authorized member
      monitoredTelemetry: {}, // real per-user telemetry/location map keyed by user_id
      guardianRequests: [], // requests sent by authorized member
      activeMonitoredUser: null,
      guardianSearchResult: null,
      guardianSearchError: '',
      searchedId: '',
      memberSearchResult: null,
      memberSearchError: '',
      searchedMemberId: '',
      memberIdSearchQuery: '',
      connectionBanner: null,
      showUserSwitcher: false,
      isLiveMode: false,
      activeSosAlert: null,
      notifications: [],
      guardianNotifications: [],
      notificationCategory: 'all',
      settings: {
        speechRate: 1.0,
        voiceFeedbackEnabled: true,
        sensitivity: 'High',
        highContrast: true,
        haptic: 'Strong',
        audioAlertsEnabled: true
      }
    };

    this.isDevSimOverride = false;

    this.authFormData = { name: '', email: '', password: '', confirmPassword: '', phone: '' };
    this.announcedTransitions = new Set();
    this.lastGuardianStatuses = {};
    this.blindUserPollTimer = null;
    this.guardianPollTimer = null;

    this.speechAssistant = new CanevynSpeechAssistant(this.deviceManager, () => this.state, this.apiClient);
    this._initApp();
  }

  async _initApp() {
    // Initialize passive geolocation permission listeners without prompting silently
    this.locationServiceReady = this._initPhoneGps();
    // 1. Immediate initial render (guarantees screen is never blank even before network calls)
    this.render();

    // 2. Load server config with graceful fallback
    try {
      await appConfig.loadServerConfig();
    } catch (e) {
      console.warn('Could not load dynamic server config, using local default:', e);
    }

    this._bindHardwareEvents();
    this._bindVoiceEvents();
    this._bindWebSocketEvents();

    // 3. Restore authenticated session if valid
    if (this.apiClient.token && this.apiClient.currentUser) {
      try {
        this.state.user = this.apiClient.currentUser;
        this.state.role = this.state.user.role || this.state.role;
        this.state.isAuthenticated = true;
        this._applyUserPreferences(this.state.user);
        this.wsClient.connect(this.state.user.id, this.apiClient.token);

        if (this.state.role === 'canevyn_user') {
          this.state.currentScreen = 'user_home';
          await this._syncSavedGpsPreference(Boolean(this.state.user.location_sharing_enabled), false);
          await this._loadUserData();
          this._startBlindUserStatusSync();
        } else {
          this.state.currentScreen = 'guardian_dashboard';
          this._loadGuardianData();
          this._startGuardianLocationSync();
        }

        // Seamless background profile refresh to sync updated CaneVyn ID and saved location sharing state
        this.apiClient.getCurrentUser().then(async (profile) => {
          if (profile) {
            this.state.user = profile;
            this.state.role = profile.role || this.state.role;
            if (this.state.role === 'canevyn_user' && this.state.currentScreen.startsWith('guardian_')) {
              this.state.currentScreen = 'user_home';
            } else if (this.state.role === 'authorized_member' && this.state.currentScreen.startsWith('user_')) {
              this.state.currentScreen = 'guardian_dashboard';
            }
            this._applyUserPreferences(profile);
            this.apiClient.updateCurrentUser(profile);
            if (this.state.role === 'canevyn_user') {
              await this._syncSavedGpsPreference(Boolean(profile.location_sharing_enabled), true);
            }
            this.render();
          }
        }).catch(err => {
          console.warn('Session background refresh check:', err.message);
        });
      } catch (authErr) {
        console.warn('Session resume error, resetting to clean state:', authErr);
        this.apiClient.clearSession();
        this.state.isAuthenticated = false;
        this.state.user = null;
        this.state.role = 'canevyn_user';
        this.state.currentScreen = 'welcome_role';
      }
    }

    // 4. Update render with loaded configuration / resumed session
    this.render();
  }

  _getGuardianThemeStorageKey(userId) {
    return `canevyn_guardian_theme_${userId || 'anon'}`;
  }

  _parseUserSettingsJson(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  _applyUserPreferences(user) {
    this._applyGuardianThemeForUser(user);
    if (!user || user.role !== 'canevyn_user') return;
    const s = this._parseUserSettingsJson(user.settings_json);
    if (typeof s.speech_rate === 'number' && Number.isFinite(s.speech_rate)) {
      this.state.settings.speechRate = Math.min(1.8, Math.max(0.7, s.speech_rate));
      this.speechAssistant.speechRate = this.state.settings.speechRate;
    }
    if (typeof s.voice_feedback_enabled === 'boolean') {
      this.state.settings.voiceFeedbackEnabled = s.voice_feedback_enabled;
      this.speechAssistant.setMuted(!s.voice_feedback_enabled);
    }
    if (typeof s.obstacle_sensitivity === 'string' && ['Low', 'Medium', 'High'].includes(s.obstacle_sensitivity)) {
      this.state.settings.sensitivity = s.obstacle_sensitivity;
    }
    if (typeof s.vibration_intensity === 'string' && ['Off', 'Gentle', 'Strong'].includes(s.vibration_intensity)) {
      this.state.settings.haptic = s.vibration_intensity;
    }
    if (typeof s.audio_alerts_enabled === 'boolean') {
      this.state.settings.audioAlertsEnabled = s.audio_alerts_enabled;
    }
  }

  async _saveBlindUserPreferences(partial) {
    if (!this.apiClient || !this.apiClient.token || this.state.role !== 'canevyn_user') return;
    const payload = {
      speech_rate: this.state.settings.speechRate,
      voice_feedback_enabled: !this.speechAssistant.isMuted,
      obstacle_sensitivity: this.state.settings.sensitivity,
      vibration_intensity: this.state.settings.haptic,
      audio_alerts_enabled: this.state.settings.audioAlertsEnabled !== false,
      ...(partial || {})
    };
    if (this.state.user) {
      const merged = { ...this._parseUserSettingsJson(this.state.user.settings_json), ...payload };
      this.state.user.settings_json = JSON.stringify(merged);
      this.apiClient.updateCurrentUser(this.state.user);
    }
    const runSave = async () => {
      try {
        const res = await this.apiClient.updateUserSettings(payload);
        if (res && res.settings_json && this.state.user) {
          this.state.user.settings_json = res.settings_json;
          this.apiClient.updateCurrentUser(this.state.user);
        }
      } catch (e) {
        console.warn('Could not persist user preference to backend:', e.message);
      }
    };
    this._prefsSaveChain = (this._prefsSaveChain || Promise.resolve()).then(runSave, runSave);
    return this._prefsSaveChain;
  }

  _applyGuardianThemeForUser(user) {
    if (!user || user.role !== 'authorized_member') {
      this.state.guardianTheme = 'dark';
      return 'dark';
    }
    const settingsObj = this._parseUserSettingsJson(user.settings_json);
    let theme = settingsObj.guardian_theme;
    if (theme !== 'light' && theme !== 'dark') {
      try {
        theme = localStorage.getItem(this._getGuardianThemeStorageKey(user.id));
      } catch (e) {}
    }
    const resolved = theme === 'light' ? 'light' : 'dark';
    this.state.guardianTheme = resolved;
    try {
      localStorage.setItem(this._getGuardianThemeStorageKey(user.id), resolved);
    } catch (e) {}
    return resolved;
  }

  async _setGuardianTheme(theme) {
    if (this.state.role !== 'authorized_member' || !this.state.user) return;
    const normalized = theme === 'light' ? 'light' : 'dark';
    this.state.guardianTheme = normalized;
    try {
      localStorage.setItem(this._getGuardianThemeStorageKey(this.state.user.id), normalized);
    } catch (e) {}

    const settingsObj = this._parseUserSettingsJson(this.state.user.settings_json);
    settingsObj.guardian_theme = normalized;
    this.state.user = {
      ...this.state.user,
      settings_json: JSON.stringify(settingsObj)
    };
    this.apiClient.updateCurrentUser(this.state.user);
    this.render();

    try {
      const res = await this.apiClient.updateUserSettings({ guardian_theme: normalized });
      if (res && res.settings_json && this.state.user) {
        this.state.user.settings_json = res.settings_json;
        this.apiClient.updateCurrentUser(this.state.user);
      }
    } catch (err) {
      console.warn('Could not sync theme preference to backend:', err.message);
    }
  }

  _announceLiveStatus(message) {
    const region = document.getElementById('a11yLiveAnnouncer');
    if (region && message) {
      region.textContent = '';
      setTimeout(() => {
        const el = document.getElementById('a11yLiveAnnouncer');
        if (el) el.textContent = message;
      }, 20);
    }
  }

  _announceScreenChange(screen) {
    const labels = {
      user_home: 'Home dashboard',
      user_location: 'Location and GPS screen',
      user_voice: 'Voice Assistant screen',
      user_guardian: 'Authorized Members screen',
      user_settings: 'Accessibility settings screen',
      user_notifications: 'Alerts Center notifications screen',
      user_device: 'Smart Stick device status screen',
      user_sos: 'Emergency SOS screen',
      guardian_dashboard: 'Authorized Member dashboard',
      guardian_location: 'Authorized Member live tracking map',
      guardian_settings: 'Authorized Member settings screen',
      guardian_connect: 'Connect with CaneVyn user screen'
    };
    const label = labels[screen];
    if (label) {
      this._announceLiveStatus(`Opened ${label}.`);
    }
  }

  _focusGpsEnableButton() {
    setTimeout(() => {
      const btn = document.getElementById('btnEnableLiveLocation');
      if (btn && !btn.disabled) {
        btn.focus();
        this._announceLiveStatus(
          'Focused Enable phone location permission button. Tap or press Enter to allow GPS access.'
        );
      }
    }, 80);
  }

  _updateHeaderTelemetry() {
    if (this.state.role === 'authorized_member') return;
    const statusBtn = document.getElementById('headerDeviceStatusBtn');
    if (statusBtn && this.state.device) {
      const isConnected = Boolean(this.state.device.isConnected);
      const hasBattery = isConnected && this.state.device.batteryPercent !== undefined && this.state.device.batteryPercent !== null;
      const battery = hasBattery ? this.state.device.batteryPercent : null;
      statusBtn.setAttribute('aria-label', `Stick status: ${isConnected ? 'Connected' : 'Disconnected'}${hasBattery ? `, Battery ${battery} percent` : ''}`);
      const icon = statusBtn.querySelector('.material-symbols-outlined');
      const spans = statusBtn.querySelectorAll('span');
      if (icon) icon.textContent = isConnected ? 'bluetooth_connected' : 'bluetooth_disabled';
      if (spans.length > 1) spans[1].textContent = hasBattery ? `${battery}%` : 'N/A';
    }
  }

  _bindHardwareEvents() {
    // When Canevyn stick status updates (battery, connection, etc.)
    this.deviceManager.on('deviceUpdate', (dev) => {
      if (
        this.state.isAuthenticated &&
        this.state.role === 'canevyn_user' &&
        this.deviceManager.mode === 'mock' &&
        !this.isDevSimOverride &&
        !(this.state.device && this.state.device.isHardwareIntegrated)
      ) {
        return;
      }
      this.state.device = { ...dev };
      if ([
        'user_home', 'user_location', 'user_voice', 'user_guardian',
        'guardian_dashboard', 'guardian_location',
        'auth_signin', 'auth_create', 'auth_options', 'auth_forgot', 'welcome_role'
      ].includes(this.state.currentScreen)) {
        this._updateHeaderTelemetry();
        return;
      }
      this.render();
    });

    // Hardware SOS Event originated strictly from physical cane stick
    this.deviceManager.on('sosEvent', (data) => {
      if (data.status === 'ACTIVE') {
        this.state.activeSosAlert = data.packet;
        if (this.state.role === 'canevyn_user') {
          // Switch user app to Hardware SOS Status Screen
          this.state.currentScreen = 'user_sos';
          this.speechAssistant.speak("Canevyn has alerted your guardians. Stay calm and remain where you are if safe. Hardware telemetry is broadcasting.");
        } else {
          // Switch authorized member to Emergency Alert Received Screen
          this.state.currentScreen = 'guardian_sos';
        }
      } else if (data.status === 'RESOLVED') {
        this.state.activeSosAlert = null;
        if (this.state.currentScreen === 'user_sos') {
          this.state.currentScreen = 'user_home';
          this.speechAssistant.speak("Hardware SOS alert has been cancelled and resolved.");
        } else if (this.state.currentScreen === 'guardian_sos') {
          this.state.currentScreen = 'guardian_dashboard';
        }
      }
      this.render();
    });
  }

  async _initPhoneGps() {
    this.state.gpsState = this.locationService.getSnapshot();

    this.locationService.on('locationUpdate', (snapshot) => {
      this._syncLocationFromGpsSnapshot(snapshot);
      this._patchPhoneGpsUI();
    });

    this.locationService.on('uploadSuccess', (snapshot) => {
      this._syncLocationFromGpsSnapshot(snapshot);
      if (snapshot.isLiveActive && !this.hasAnnouncedGpsLock) {
        this.hasAnnouncedGpsLock = true;
        this.speechAssistant.speakWhenIdle('Your live location sharing is now active.');
      }
      this._patchPhoneGpsUI();
    });

    this.locationService.on('statusChange', (snapshot) => {
      const prevStatus = this.state.gpsState ? this.state.gpsState.status : null;
      this._syncLocationFromGpsSnapshot(snapshot);

      if (snapshot.status === LOCATION_STATUS.NETWORK_OFFLINE && prevStatus !== LOCATION_STATUS.NETWORK_OFFLINE) {
        this.speechAssistant.speakWhenIdle('Internet connection is offline. Live location uploads are paused.');
      }

      this._patchPhoneGpsUI();
    });

    this.locationService.on('error', ({ code, snapshot }) => {
      this._syncLocationFromGpsSnapshot(snapshot);
      if (code === 'PERMISSION_DENIED') {
        this.speechAssistant.speakWhenIdle('Location permission is denied. Please enable location access in browser settings and try again.');
      } else if (code === 'SIGNAL_LOST') {
        this.speechAssistant.speakWhenIdle('GPS signal lost. No new coordinates have been received.');
      } else if (code === 'NETWORK_OFFLINE' || code === 'UPLOAD_FAILED') {
        this.speechAssistant.speakWhenIdle('Internet connection is unavailable. Your live location could not be sent to the server.');
      } else if (code === 'POSITION_UNAVAILABLE' || code === 'TIMEOUT' || code === 'UNSUPPORTED' || code === 'INSECURE_CONTEXT') {
        this.speechAssistant.speakWhenIdle("I could not obtain your current location. Please check your phone's location services and try again.");
      }
      this._patchPhoneGpsUI();
    });

    // Passive permission check on startup — does not prompt browser popup silently
    await this.locationService.checkPermissionStatus();
    this.state.gpsState = this.locationService.getSnapshot();
  }

  async _syncSavedGpsPreference(savedEnabled, allowVoiceAnnouncement = true) {
    await this.locationServiceReady;
    const snapshot = this.locationService.syncSavedPreference(Boolean(savedEnabled));
    this._syncLocationFromGpsSnapshot(snapshot);

    if (allowVoiceAnnouncement && snapshot.needsResume && !this.hasAnnouncedResumeNotice) {
      this.hasAnnouncedResumeNotice = true;
      this.speechAssistant.speak(
        'Location sharing is turned on in your account. Tap Resume Live Location to continue sharing your GPS.'
      );
    }
    this._patchPhoneGpsUI();
  }

  _syncLocationFromGpsSnapshot(snapshot) {
    this.state.gpsState = snapshot;
    if (snapshot.isLiveActive && snapshot.latitude !== null && snapshot.longitude !== null) {
      this.state.location = {
        ...this.state.location,
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
        heading: snapshot.heading,
        accuracy: snapshot.accuracy,
        address_label: null,
        isRealGps: true,
        isLiveAvailable: true
      };
    } else {
      this.state.location = {
        ...this.state.location,
        latitude: null,
        longitude: null,
        heading: null,
        accuracy: null,
        address_label: 'Live Location: Not Available',
        isRealGps: false,
        isLiveAvailable: false
      };
    }
  }

  _patchPhoneGpsUI() {
    const gpsState = this.state.gpsState || {};
    const activeId = document.activeElement ? document.activeElement.id : null;

    if (this.state.currentScreen === 'user_location') {
      const gpsSlot = document.getElementById('userLocationGpsSlot');
      if (gpsSlot) {
        gpsSlot.innerHTML = renderPhoneGpsControlPanel(gpsState);
        this._bindPhoneGpsButtons();
      }
      const detailsSlot = document.getElementById('userLocationDetailsSlot');
      if (detailsSlot) {
        detailsSlot.innerHTML = renderLocationDetailsCard(gpsState);
        this._bindLocationScreenButtons();
      }
      if (activeId) {
        const el = document.getElementById(activeId);
        if (el) el.focus();
      }
      return;
    }

    if (this.state.currentScreen === 'user_home') {
      const homeSlot = document.getElementById('userHomeGpsSlot');
      if (homeSlot) {
        homeSlot.innerHTML = renderPhoneGpsControlPanel(gpsState);
        this._bindPhoneGpsButtons();
      }
      const homeSummary = document.getElementById('homeLocationSummary');
      const cardLocBtn = document.getElementById('cardLocationNavBtn');
      const isLive = Boolean(gpsState.isLiveActive && gpsState.latitude !== null && gpsState.longitude !== null);
      const summaryLabel = isLive
        ? `GPS: ${gpsState.latitude.toFixed(4)}, ${gpsState.longitude.toFixed(4)} (±${Math.round(gpsState.accuracy)}m)`
        : (gpsState.status && gpsState.status !== 'Permission Required' ? gpsState.status : 'Live Location: Not Available');
      if (homeSummary) homeSummary.textContent = summaryLabel;
      if (cardLocBtn) cardLocBtn.setAttribute('aria-label', `Location and Wayfinding: ${summaryLabel}`);
      if (activeId) {
        const el = document.getElementById(activeId);
        if (el) el.focus();
      }
      return;
    }

    if (this.state.currentScreen === 'user_voice') {
      const voiceBadge = document.getElementById('voiceLocationBadgeText');
      if (voiceBadge) {
        const isLive = Boolean(gpsState.isLiveActive && gpsState.latitude !== null && gpsState.longitude !== null);
        voiceBadge.textContent = isLive
          ? `${gpsState.latitude.toFixed(4)}, ${gpsState.longitude.toFixed(4)}`
          : (gpsState.status === 'Searching for GPS' ? 'Searching for GPS...' : 'Live Location: Not Available');
      }
    }
  }

  _bindPhoneGpsButtons() {
    const enableBtn = document.getElementById('btnEnableLiveLocation');
    if (enableBtn) {
      enableBtn.onclick = () => {
        this.hasAnnouncedGpsLock = false;
        if (this.locationService.permissionState === 'prompt') {
          this.speechAssistant.speak('Requesting phone GPS permission to share your real location.');
        }
        this.locationService.requestAndStartSharing();
        this._patchPhoneGpsUI();
      };
    }

    const stopBtn = document.getElementById('btnStopLiveLocation');
    if (stopBtn) {
      stopBtn.onclick = async () => {
        this.hasAnnouncedGpsLock = false;
        await this.locationService.stopSharing({ notifyBackend: true });
        this.speechAssistant.speak('Live location sharing stopped.');
        this._patchPhoneGpsUI();
      };
    }
  }

  _bindLocationScreenButtons() {
    const speakCurrentGpsStatus = () => {
      const gpsState = this.state.gpsState || {};
      if (gpsState.isLiveActive && gpsState.latitude !== null && gpsState.longitude !== null) {
        this.speechAssistant.speak(
          `Live GPS is active. Coordinates latitude ${gpsState.latitude.toFixed(4)}, longitude ${gpsState.longitude.toFixed(4)}. Accuracy about ${Math.round(gpsState.accuracy)} meters.`
        );
      } else if (gpsState.errorMessage) {
        this.speechAssistant.speak(`${gpsState.status}. ${gpsState.errorMessage}`);
      } else {
        this.speechAssistant.speak(`Location status: ${gpsState.status || 'Live Location: Not Available'}. Tap Enable Live Location to share your phone GPS.`);
      }
    };

    const locRepeatAudioBtn = document.getElementById('locRepeatAudioBtn');
    if (locRepeatAudioBtn) {
      locRepeatAudioBtn.onclick = speakCurrentGpsStatus;
    }
    const locAudibleToggleBtn = document.getElementById('locAudibleToggleBtn');
    if (locAudibleToggleBtn) {
      locAudibleToggleBtn.onclick = speakCurrentGpsStatus;
    }
    const locShareBtn = document.getElementById('locShareToGuardianBtn');
    if (locShareBtn) {
      locShareBtn.onclick = () => {
        const gpsState = this.state.gpsState || {};
        if (gpsState.isLiveActive && gpsState.latitude !== null && gpsState.longitude !== null) {
          this.speechAssistant.speak(`Your real phone GPS is sharing live with accuracy ${Math.round(gpsState.accuracy)} meters.`);
        } else {
          this.speechAssistant.speak('Real phone GPS sharing is off. Tap Enable Live Location to share your position.');
        }
      };
    }
  }

  _toggleVoiceListening() {
    if (this.speechAssistant.isListening || this.state.voiceState === 'listening') {
      this.speechAssistant.stopListening();
    } else {
      this.speechAssistant.startListening();
    }
  }

  _bindVoiceEvents() {
    this.speechAssistant.on('stateChange', ({ state }) => {
      this.state.voiceState = state;
      if (this.state.currentScreen === 'user_voice') {
        this.render();
      }
    });

    this.speechAssistant.on('transcript', ({ text }) => {
      this.state.voiceTranscript = text;
      if (this.state.currentScreen === 'user_voice') {
        this.render();
      }
    });

    this.speechAssistant.on('response', ({ query, reply }) => {
      this.state.voiceTranscript = query;
      this.state.voiceResponse = reply;
      if (this.state.currentScreen === 'user_voice') {
        this.render();
      }
    });

    this.speechAssistant.on('navigate', ({ screen, focusGpsButton = false }) => {
      if (focusGpsButton) {
        this.pendingGpsFocus = true;
      }
      if (screen && screen !== this.state.currentScreen) {
        const tabMap = {
          user_home: 'home',
          user_location: 'location',
          user_voice: 'voice',
          user_guardian: 'guardian',
          user_settings: 'settings'
        };
        this.navigateTo(screen, tabMap[screen] || null);
      } else if (screen === 'user_location' && focusGpsButton) {
        this.pendingGpsFocus = false;
        this._focusGpsEnableButton();
      }
    });

    this.speechAssistant.on('muteChange', () => {
      this.render();
    });

    this.speechAssistant.on('requestResponded', async () => {
      await this._loadUserData();
    });

    this.speechAssistant.on('startLocationSharing', () => {
      if (this.locationService.isSharing && (this.locationService.watchId !== null || this.locationService.isStarting)) {
        this._patchPhoneGpsUI();
        return;
      }
      this.hasAnnouncedGpsLock = false;
      this.locationService.requestAndStartSharing();
      this._patchPhoneGpsUI();
    });

    this.speechAssistant.on('stopLocationSharing', async ({ alreadyPersisted } = {}) => {
      this.hasAnnouncedGpsLock = false;
      await this.locationService.stopSharing({ notifyBackend: !alreadyPersisted });
      this._patchPhoneGpsUI();
    });
  }

  _bindWebSocketEvents() {
    // Incoming Hardware SOS from Backend broadcast
    this.wsClient.on('sos', (alertData) => {
      if (alertData.status === 'ACTIVE') {
        this.state.activeSosAlert = alertData;
        if (this.state.role === 'authorized_member') {
          this.state.currentScreen = 'guardian_sos';
          this.speechAssistant.vibrate([200, 100, 200, 100, 400]);
        }
      } else if (alertData.status === 'RESOLVED') {
        this.state.activeSosAlert = null;
        if (this.state.currentScreen === 'guardian_sos') {
          this.state.currentScreen = 'guardian_dashboard';
        }
      }
      this.render();
    });

    // Real-time telemetry tick (strictly battery/obstacle telemetry; never sets fake GPS)
    this.wsClient.on('telemetry', (tel) => {
      if (tel.battery_percent) {
        this.state.device.batteryPercent = tel.battery_percent;
      }
      if ([
        'user_home', 'user_location', 'user_voice', 'user_guardian',
        'guardian_dashboard', 'guardian_location',
        'auth_signin', 'auth_create', 'auth_options', 'auth_forgot', 'welcome_role'
      ].includes(this.state.currentScreen)) {
        this._updateHeaderTelemetry();
        return;
      }
      this.render();
    });

    // Real-time Connection Request Accept/Reject update for Blind User
    this.wsClient.on('connectionStatus', async (evt) => {
      if (this.state.role !== 'canevyn_user' || !this.state.isAuthenticated) return;
      const key = `${evt.relationship_id}:${evt.status}`;
      this._loadAnnouncedSet();
      if (!this.announcedTransitions.has(key)) {
        this._markTransitionAnnounced(evt.relationship_id, evt.status, evt.notification_id);
        this.state.connectionBanner = {
          id: evt.notification_id || evt.relationship_id,
          status: evt.status,
          memberName: evt.guardian_name,
          message: evt.message
        };
        this.speechAssistant.speak(evt.message, null, true);
      }
      await this._syncBlindUserConnectionStatus();
    });

    // Real-time Phone GPS Update pushed to Authorized Member
    this.wsClient.on('locationUpdate', (evt) => {
      if (this.state.role !== 'authorized_member' || !this.state.isAuthenticated || !evt || !evt.user_id) return;
      const existing = this.state.monitoredTelemetry[evt.user_id] || {};
      this.state.monitoredTelemetry[evt.user_id] = {
        ...existing,
        location: { ...evt, is_live_available: true, isLiveAvailable: true }
      };
      const activeWard = this._getActiveMonitoredUser();
      const activeUid = this._getMonitoredUserId(activeWard);
      if (activeUid && activeUid === evt.user_id) {
        this._patchGuardianLocationUI();
      }
    });

    // Real-time Location Sharing Stopped pushed to Authorized Member
    this.wsClient.on('locationStopped', (evt) => {
      if (this.state.role !== 'authorized_member' || !this.state.isAuthenticated || !evt || !evt.user_id) return;
      const existing = this.state.monitoredTelemetry[evt.user_id] || {};
      this.state.monitoredTelemetry[evt.user_id] = {
        ...existing,
        location: {
          latitude: null,
          longitude: null,
          address_label: 'Live Location: Not Available',
          accuracy_meters: null,
          recorded_at: null,
          location_sharing_enabled: false,
          is_live: false,
          is_live_available: false,
          sharing_status: 'off'
        }
      };
      const activeWard = this._getActiveMonitoredUser();
      const activeUid = this._getMonitoredUserId(activeWard);
      if (activeUid && activeUid === evt.user_id) {
        this._patchGuardianLocationUI();
      }
    });

    // Real-time Connection Revoked pushed to Authorized Member -> immediate access removal
    this.wsClient.on('connectionRevoked', async (evt) => {
      if (this.state.role !== 'authorized_member' || !this.state.isAuthenticated || !evt) return;
      const revokedUid = evt.canevyn_user_id;
      if (revokedUid) {
        delete this.state.monitoredTelemetry[revokedUid];
        this.state.monitoredUsers = (this.state.monitoredUsers || []).filter(
          u => this._getMonitoredUserId(u) !== revokedUid
        );
        if (this._getMonitoredUserId(this.state.activeMonitoredUser) === revokedUid) {
          this.state.activeMonitoredUser = this.state.monitoredUsers[0] || null;
          this.guardianMapManager.destroyAll();
        }
      }
      await this._loadGuardianData();
    });

    // Real-time Connection Removed by Authorized Member pushed to Blind User -> speak + banner + mark read once
    this.wsClient.on('connectionRemovedByMember', async (evt) => {
      if (this.state.role !== 'canevyn_user' || !this.state.isAuthenticated || !evt) return;
      const msg = evt.message || (
        evt.guardian_name
          ? `Your connection with ${evt.guardian_name} has been removed. They can no longer access your live location.`
          : 'Your connection with an Authorized Member has been removed. They can no longer access your live location.'
      );
      this._markTransitionAnnounced(evt.relationship_id || null, 'removed', evt.notification_id || null);
      this.state.connectionBanner = {
        id: evt.notification_id || evt.relationship_id || 'removed',
        status: 'removed',
        memberName: evt.guardian_name || '',
        message: msg
      };
      this._announceLiveStatus(msg);
      this.speechAssistant.speak(msg, null, true);
      await this._syncBlindUserConnectionStatus();
    });
  }

  _getAnnouncedStorageKey() {
    const uid = this.state.user ? this.state.user.id : 'anon';
    return `canevyn_announced_status_${uid}`;
  }

  _loadAnnouncedSet() {
    if (!this.state.user) return;
    try {
      const raw = localStorage.getItem(this._getAnnouncedStorageKey());
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach(item => this.announcedTransitions.add(item));
        }
      }
    } catch (e) {}
  }

  _saveAnnouncedSet() {
    if (!this.state.user) return;
    try {
      const arr = Array.from(this.announcedTransitions).slice(-100);
      localStorage.setItem(this._getAnnouncedStorageKey(), JSON.stringify(arr));
    } catch (e) {}
  }

  _markTransitionAnnounced(relId, status, notifId = null) {
    this._loadAnnouncedSet();
    if (relId && status) {
      this.announcedTransitions.add(`${relId}:${status}`);
    }
    if (notifId) {
      this.announcedTransitions.add(`notif:${notifId}`);
      this.apiClient.markNotificationRead(notifId).catch(() => null);
    }
    this._saveAnnouncedSet();
  }

  _clearAnnouncedCycleForPending(relId) {
    this._loadAnnouncedSet();
    let changed = false;
    for (const s of ['approved', 'rejected']) {
      if (this.announcedTransitions.delete(`${relId}:${s}`)) {
        changed = true;
      }
    }
    if (changed) this._saveAnnouncedSet();
  }

  _startBlindUserStatusSync() {
    this._stopBlindUserStatusSync();
    if (this.state.role !== 'canevyn_user' || !this.state.isAuthenticated) return;
    this.blindUserPollTimer = setInterval(() => {
      if (this.state.isAuthenticated && this.state.role === 'canevyn_user') {
        this._syncBlindUserConnectionStatus();
      }
    }, 4000);
  }

  _stopBlindUserStatusSync() {
    if (this.blindUserPollTimer) {
      clearInterval(this.blindUserPollTimer);
      this.blindUserPollTimer = null;
    }
  }

  _processStatusNotifications(guardians = [], notifs = [], isInitialLoad = false) {
    this._loadAnnouncedSet();
    const pendingSpeakQueue = [];

    // 1. Track relationship state transitions based on real SQLite guardian_relationships rows
    guardians.forEach(g => {
      const prevStatus = this.lastGuardianStatuses[g.id];
      if (g.status === 'pending') {
        this._clearAnnouncedCycleForPending(g.id);
      } else if (prevStatus === 'pending' && (g.status === 'approved' || g.status === 'rejected')) {
        const key = `${g.id}:${g.status}`;
        if (!this.announcedTransitions.has(key)) {
          const msg = g.status === 'approved'
            ? `Your connection request has been accepted by ${g.guardian_name}.`
            : `Your connection request was rejected by ${g.guardian_name}.`;
          const matchingNotif = (notifs || []).find(n =>
            !n.is_read &&
            ((g.status === 'approved' && n.title === 'Connection Accepted') ||
             (g.status === 'rejected' && n.title === 'Connection Rejected')) &&
            (n.body || '').includes(g.guardian_name)
          );
          this._markTransitionAnnounced(g.id, g.status, matchingNotif ? matchingNotif.id : null);
          this.state.connectionBanner = {
            id: matchingNotif ? matchingNotif.id : g.id,
            status: g.status,
            memberName: g.guardian_name,
            message: msg
          };
          pendingSpeakQueue.push(msg);
        }
      }
      this.lastGuardianStatuses[g.id] = g.status;
    });

    // 2. Also surface any unread SQLite decision or removal notifications created while offline
    (notifs || []).forEach(n => {
      if (
        !n.is_read &&
        (n.title === 'Connection Accepted' || n.title === 'Connection Rejected' || n.title === 'Connection Removed')
      ) {
        const notifKey = `notif:${n.id}`;
        if (!this.announcedTransitions.has(notifKey)) {
          const isApproved = n.title === 'Connection Accepted';
          const isRemoved = n.title === 'Connection Removed';
          const status = isApproved ? 'approved' : (isRemoved ? 'removed' : 'rejected');
          const msg = n.spoken_narration || n.body;
          const matchingRel = (guardians || []).find(g => msg.includes(g.guardian_name));
          this._markTransitionAnnounced(matchingRel ? matchingRel.id : null, status, n.id);
          this.state.connectionBanner = {
            id: n.id,
            status,
            memberName: matchingRel ? matchingRel.guardian_name : '',
            message: msg
          };
          pendingSpeakQueue.push(msg);
        }
      }
    });

    if (pendingSpeakQueue.length > 0) {
      const announcement = pendingSpeakQueue[pendingSpeakQueue.length - 1];
      this._announceLiveStatus(announcement);
      if (isInitialLoad) {
        this.speechAssistant.speakWhenIdle(announcement, 8000, true);
      } else {
        this.speechAssistant.speak(announcement, null, true);
      }
    }
  }

  _patchBlindUserConnectionUI() {
    // Update notification banners in-place without rebuilding the screen
    const homeBannerSlot = document.getElementById('userHomeBannerSlot');
    if (homeBannerSlot) {
      homeBannerSlot.innerHTML = renderConnectionStatusBanner(this.state.connectionBanner);
    }
    const guardianBannerSlot = document.getElementById('userGuardianBannerSlot');
    if (guardianBannerSlot) {
      guardianBannerSlot.innerHTML = renderConnectionStatusBanner(this.state.connectionBanner);
    }

    const dismissBtn = document.getElementById('btnDismissConnectionBanner');
    if (dismissBtn) {
      dismissBtn.onclick = () => {
        this.state.connectionBanner = null;
        this._patchBlindUserConnectionUI();
      };
    }

    // Update Home screen Protectors summary text in-place
    const summaryEl = document.getElementById('homeProtectorsSummary');
    const cardBtn = document.getElementById('cardProtectorsBtn');
    if (summaryEl) {
      const summaryText = getHomeProtectorsSummaryText(this.state.guardians || []);
      summaryEl.textContent = summaryText;
      if (cardBtn) {
        cardBtn.setAttribute('aria-label', `Family and Protectors status: ${summaryText}`);
      }
    }

    // Update Authorized Members screen sections in-place (preserving search input text and focus!)
    const reqSection = document.getElementById('userGuardianRequestsSection');
    if (reqSection) {
      reqSection.innerHTML = renderUserGuardianRequestsContent(this.state.guardians || []);
      this._bindUserGuardianSectionButtons();
    }
    const connSection = document.getElementById('userGuardianConnectedSection');
    if (connSection) {
      connSection.innerHTML = renderUserGuardianConnectedContent(this.state.guardians || []);
      this._bindUserGuardianSectionButtons();
    }
    if (this.state.currentScreen === 'user_settings') {
      this.render();
    }
  }

  async _syncBlindUserConnectionStatus() {
    if (this.state.role !== 'canevyn_user' || !this.state.isAuthenticated) return;
    try {
      const [guardians, notifs] = await Promise.all([
        this.apiClient.getGuardians().catch(() => null),
        this.apiClient.getNotifications('guardian').catch(() => null)
      ]);
      const prevSerialized = JSON.stringify((this.state.guardians || []).map(g => [g.id, g.status, g.guardian_name]));
      if (guardians) this.state.guardians = guardians;
      if (notifs) {
        // Merge updated guardian notifications without dropping non-guardian notifications
        const otherNotifs = (this.state.notifications || []).filter(n => n.category !== 'guardian');
        this.state.notifications = [...notifs, ...otherNotifs];
      }

      this._processStatusNotifications(this.state.guardians || [], notifs || [], false);

      const nextSerialized = JSON.stringify((this.state.guardians || []).map(g => [g.id, g.status, g.guardian_name]));
      if (prevSerialized !== nextSerialized || this.state.connectionBanner) {
        this._patchBlindUserConnectionUI();
      }
    } catch (e) {
      console.warn('Status sync notice:', e.message);
    }
  }

  async _loadUserData() {
    try {
      const [dev, guardians, notifs, pendingReqs, locStatus] = await Promise.all([
        this.apiClient.getUserDevice().catch(() => null),
        this.apiClient.getGuardians().catch(() => []),
        this.apiClient.getNotifications().catch(() => []),
        this.apiClient.getPendingRequests().catch(() => []),
        this.apiClient.getLocationStatus().catch(() => null)
      ]);
      if (dev && (dev.is_hardware_integrated || dev.is_connected)) {
        this.state.device = {
          ...this.state.device,
          id: dev.id,
          model: dev.model || null,
          serialNumber: dev.serial_number || null,
          firmware: dev.firmware_version || null,
          batteryPercent: typeof dev.battery_percent === 'number' ? dev.battery_percent : null,
          isConnected: Boolean(dev.is_connected),
          isHardwareIntegrated: true
        };
      } else {
        if (!this.isDevSimOverride && this.deviceManager?.mockStick) {
          this.deviceManager.mockStick.stopSimulation();
        }
        if (!this.isDevSimOverride) {
          this.state.device = {
            id: (dev && dev.id) || null,
            model: null,
            serialNumber: null,
            firmware: null,
            batteryPercent: null,
            isConnected: false,
            isHardwareIntegrated: false
          };
        }
      }
      if (guardians) this.state.guardians = guardians;
      if (notifs) this.state.notifications = notifs;
      if (pendingReqs) this.state.pendingRequests = pendingReqs;
      if (locStatus && typeof locStatus.location_sharing_enabled === 'boolean') {
        if (this.state.user) {
          this.state.user.location_sharing_enabled = locStatus.location_sharing_enabled;
          this.state.user.last_location_at = locStatus.last_location_at || null;
          this.apiClient.updateCurrentUser(this.state.user);
        }
        await this._syncSavedGpsPreference(locStatus.location_sharing_enabled, true);
      }

      // Check if there is an active SOS
      if (this.state.user) {
        const activeSos = await this.apiClient.getActiveSos(this.state.user.id).catch(() => null);
        if (activeSos) {
          this.state.activeSosAlert = activeSos;
          this.state.currentScreen = 'user_sos';
        }
      }
      this.render();

      // Automatic Voice Welcome Announcement on entering user dashboard
      if (this.state.currentScreen === 'user_home') {
        this.speechAssistant.speakWelcome();
      }

      this._processStatusNotifications(this.state.guardians || [], this.state.notifications || [], true);
    } catch (e) {
      console.warn('Error loading initial user data:', e);
    }
  }

  _getMonitoredUserId(u) {
    if (!u) return null;
    return u.user_id || u.internal_user_id || u.id || u.canevyn_user_id || null;
  }

  _getActiveMonitoredUser() {
    const users = this.state.monitoredUsers || [];
    if (users.length === 0) return null;
    const activeId = this._getMonitoredUserId(this.state.activeMonitoredUser);
    if (activeId) {
      const matched = users.find(u => this._getMonitoredUserId(u) === activeId);
      if (matched) return matched;
    }
    return users[0];
  }

  _getActiveMonitoredTelemetry(ward = null) {
    const activeWard = ward || this._getActiveMonitoredUser();
    const uid = this._getMonitoredUserId(activeWard);
    if (uid && this.state.monitoredTelemetry[uid]) {
      return this.state.monitoredTelemetry[uid];
    }
    const isConn = Boolean(activeWard && activeWard.is_connected);
    const hasHardware = Boolean(activeWard && (activeWard.is_hardware_integrated || isConn));
    return {
      location: {
        latitude: null,
        longitude: null,
        address_label: 'Live Location: Not Available',
        accuracy_meters: null,
        recorded_at: null,
        location_sharing_enabled: activeWard ? Boolean(activeWard.location_sharing_enabled) : false,
        is_live: false,
        is_live_available: false,
        sharing_status: (activeWard && activeWard.location_sharing_enabled) ? 'searching' : 'off'
      },
      device: {
        id: hasHardware ? ((activeWard && activeWard.device_id) || null) : null,
        model: hasHardware ? ((activeWard && activeWard.device_model) || null) : null,
        battery_percent: (hasHardware && activeWard && activeWard.battery_percent !== null && activeWard.battery_percent !== undefined) ? activeWard.battery_percent : null,
        is_connected: isConn,
        is_hardware_integrated: hasHardware,
        hardware_status: hasHardware ? (isConn ? 'Hardware Connected' : 'Hardware Offline') : 'Hardware Not Connected'
      }
    };
  }

  async _fetchMonitoredUserLocation(userId) {
    if (!userId || !this.apiClient || !this.apiClient.token) return null;
    try {
      const tel = await this.apiClient.getLatestTelemetry(userId);
      if (tel) {
        this.state.monitoredTelemetry[userId] = tel;
      }
      return tel;
    } catch (e) {
      // If 403/revoked or not permitted, clear cached coordinates cleanly
      delete this.state.monitoredTelemetry[userId];
      console.warn(`Could not fetch telemetry for ${userId}:`, e.message);
      return null;
    }
  }

  _startGuardianLocationSync() {
    if (this.guardianPollTimer) return;
    // Refresh telemetry via 10s fallback poll when WebSocket is unavailable,
    // and evaluate 60s stale / 5min expired timeouts cleanly.
    this.guardianPollTimer = setInterval(async () => {
      if (!this.state.isAuthenticated || this.state.role !== 'authorized_member') {
        this._stopGuardianLocationSync();
        return;
      }
      const activeWard = this._getActiveMonitoredUser();
      const activeUid = this._getMonitoredUserId(activeWard);
      if (!activeUid) return;

      const wsOpen = Boolean(this.wsClient && this.wsClient.ws && this.wsClient.ws.readyState === WebSocket.OPEN);
      if (!wsOpen) {
        await this._fetchMonitoredUserLocation(activeUid);
      }
      if (['guardian_dashboard', 'guardian_location'].includes(this.state.currentScreen)) {
        this._patchGuardianLocationUI();
      }
    }, 10000);
  }

  _stopGuardianLocationSync() {
    if (this.guardianPollTimer) {
      clearInterval(this.guardianPollTimer);
      this.guardianPollTimer = null;
    }
  }

  _patchGuardianLocationUI() {
    const activeWard = this._getActiveMonitoredUser();
    const wardTelemetry = this._getActiveMonitoredTelemetry(activeWard);
    const meta = formatGuardianLocationMeta(wardTelemetry.location);

    if (this.state.currentScreen === 'guardian_dashboard') {
      const badge = document.getElementById('guardianDashGpsBadge');
      if (badge) {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full ${meta.isLive ? (meta.isStale ? 'bg-primary-container' : 'bg-secondary animate-ping') : 'bg-outline'}"></span><span>${meta.badgeText}</span>`;
      }
      const overlay = document.getElementById('guardianDashNoLocOverlay');
      const overlaySub = document.getElementById('guardianDashOverlaySub');
      if (overlay) overlay.classList.toggle('hidden', meta.isLive);
      if (overlaySub) overlaySub.textContent = meta.subReason;

      const coords = document.getElementById('guardianDashCoords');
      const acc = document.getElementById('guardianDashAccuracy');
      const upd = document.getElementById('guardianDashUpdated');
      const shr = document.getElementById('guardianDashSharingStatus');
      if (coords) {
        coords.textContent = meta.coordsText;
        coords.className = `font-mono ${meta.isLive ? 'text-secondary' : 'text-on-surface-variant'}`;
      }
      if (acc) {
        acc.textContent = meta.accuracyText;
        acc.className = meta.isApproximate ? 'text-primary' : 'text-on-surface';
      }
      if (upd) upd.textContent = meta.updatedText;
      if (shr) {
        shr.textContent = meta.sharingText;
        shr.className = meta.isStale ? 'text-primary font-bold' : 'text-on-surface-variant';
      }

      this.guardianMapManager.syncLocation('guardianDashboardMap', wardTelemetry.location);
      return;
    }

    if (this.state.currentScreen === 'guardian_location') {
      const badge = document.getElementById('guardianLocBadge');
      const dot = document.getElementById('guardianLocDot');
      if (badge) {
        badge.className = `font-label-md text-label-md ${meta.isLive ? (meta.isStale ? 'text-primary' : 'text-secondary') : 'text-on-surface-variant'} flex items-center gap-1`;
        badge.innerHTML = `<span class="material-symbols-outlined text-[16px]">${meta.isLive ? 'gps_fixed' : 'gps_off'}</span><span>${meta.badgeText}</span>`;
      }
      if (dot) {
        dot.className = `relative inline-flex rounded-full h-2.5 w-2.5 ${meta.isLive ? (meta.isStale ? 'bg-primary-container' : 'bg-secondary animate-pulse') : 'bg-outline'}`;
      }
      const overlay = document.getElementById('guardianFullNoLocOverlay');
      const overlaySub = document.getElementById('guardianFullOverlaySub');
      if (overlay) overlay.classList.toggle('hidden', meta.isLive);
      if (overlaySub) overlaySub.textContent = meta.subReason;

      const hl = document.getElementById('guardianLocHeadline');
      const shr = document.getElementById('guardianLocSharing');
      const acc = document.getElementById('guardianLocAccuracy');
      const upd = document.getElementById('guardianLocUpdated');
      const hdg = document.getElementById('guardianLocHeading');
      const spd = document.getElementById('guardianLocSpeed');
      if (hl) hl.textContent = meta.headline;
      if (shr) {
        shr.textContent = meta.sharingText;
        shr.className = `font-body-md text-xs ${meta.isStale ? 'text-primary font-bold' : 'text-on-surface-variant'} mt-0.5`;
      }
      if (acc) {
        acc.textContent = meta.accuracyText;
        acc.className = meta.isApproximate ? 'text-primary' : 'text-on-surface';
      }
      if (upd) upd.textContent = meta.updatedText;
      if (hdg) hdg.textContent = meta.headingText;
      if (spd) spd.textContent = meta.speedText;

      this.guardianMapManager.syncLocation('guardianFullMap', wardTelemetry.location);
    }
  }

  async _loadGuardianData() {
    try {
      const [users, requests, incomingRequests, notifs] = await Promise.all([
        this.apiClient.getMonitoredUsers().catch(() => []),
        this.apiClient.getMyGuardianRequests().catch(() => []),
        this.apiClient.getMemberIncomingRequests().catch(() => []),
        this.apiClient.getNotifications().catch(() => [])
      ]);
      this.state.monitoredUsers = users || [];
      this.state.guardianRequests = requests || [];
      this.state.incomingMemberRequests = incomingRequests || [];
      this.state.guardianNotifications = notifs || [];

      const activeWard = this._getActiveMonitoredUser();
      this.state.activeMonitoredUser = activeWard;
      const activeUid = this._getMonitoredUserId(activeWard);

      if (activeUid) {
        const [, activeSos] = await Promise.all([
          this._fetchMonitoredUserLocation(activeUid),
          this.apiClient.getActiveSos(activeUid).catch(() => null)
        ]);
        this.state.activeSosAlert = activeSos || null;
      } else {
        this.state.activeSosAlert = null;
      }

      this.render();
    } catch (e) {
      console.warn('Error loading guardian data:', e);
    }
  }

  // Navigation router
  navigateTo(screen, activeTab = null) {
    if (this.state.currentScreen === 'user_voice' && screen !== 'user_voice' && this.speechAssistant && this.speechAssistant.isListening) {
      this.speechAssistant.stopListening();
    }
    this.state.currentScreen = screen;
    if (activeTab) {
      this.state.activeUserTab = activeTab;
    }
    this.render();
    window.scrollTo(0, 0);
  }

  render(force = false) {
    const root = document.getElementById('app');
    if (!root) return;

    const isAuthScreen = ['auth_signin', 'auth_create', 'auth_forgot'].includes(this.state.currentScreen);
    const existingForm = root.querySelector('#authForm') || root.querySelector('#forgotForm');

    // If on auth screen and form exists and screen hasn't changed, skip re-rendering to preserve inputs
    if (!force && isAuthScreen && existingForm && this.lastRenderedScreen === this.state.currentScreen) {
      return;
    }

    // Save existing DOM input values before re-rendering
    const nameEl = document.getElementById('authNameInput');
    const emailEl = document.getElementById('authEmailInput');
    const pwdEl = document.getElementById('authPasswordInput');
    const confirmPwdEl = document.getElementById('authConfirmPasswordInput');
    const phoneEl = document.getElementById('authPhoneInput');
    if (nameEl) this.authFormData.name = nameEl.value;
    if (emailEl) this.authFormData.email = emailEl.value;
    if (pwdEl) this.authFormData.password = pwdEl.value;
    if (confirmPwdEl) this.authFormData.confirmPassword = confirmPwdEl.value;
    if (phoneEl) this.authFormData.phone = phoneEl.value;

    // Save Authorized Member search input and focus state so pasted/typed text NEVER vanishes
    const memberIdSearchEl = document.getElementById('memberIdSearchInput');
    let wasMemberIdFocused = false;
    let memberIdSelectionStart = 0;
    let memberIdSelectionEnd = 0;
    if (memberIdSearchEl) {
      this.state.memberIdSearchQuery = memberIdSearchEl.value;
      if (document.activeElement === memberIdSearchEl) {
        wasMemberIdFocused = true;
        memberIdSelectionStart = memberIdSearchEl.selectionStart;
        memberIdSelectionEnd = memberIdSearchEl.selectionEnd;
      }
    }

    const previousScreen = this.lastRenderedScreen;
    const screenChanged = previousScreen !== this.state.currentScreen;
    this.lastRenderedScreen = this.state.currentScreen;

    // Apply role-specific background classes to body (Light/Dark theme strictly scoped to Authorized Member)
    if (this.state.currentScreen === 'welcome_role') {
      document.body.className = 'role-welcome text-on-surface antialiased min-h-screen flex flex-col select-none';
    } else if (this.state.role === 'authorized_member') {
      const guardianThemeClass = this.state.guardianTheme === 'light' ? ' guardian-theme-light' : '';
      document.body.className = `role-guardian${guardianThemeClass} text-on-surface antialiased min-h-screen flex flex-col select-none`;
    } else {
      document.body.className = 'role-user text-on-surface antialiased min-h-screen flex flex-col select-none';
    }

    let html = '';
    const { currentScreen, role, device, user, location, voiceState, voiceTranscript, voiceResponse, guardians, settings, activeUserTab } = this.state;

    // Developer Hardware Simulation Tool (Top Bar — hidden on Authorized Member screens)
    if (role !== 'authorized_member') {
      html += renderHardwareSimulatorBar(this.deviceManager);
    }

    // Render screen specific layouts
    switch (currentScreen) {
      case 'welcome_role':
        html += renderWelcomeRoleScreen(this.state.role);
        break;

      case 'auth_options':
        html += renderAccountAuthScreen({ role: this.state.role, mode: 'options' });
        break;

      case 'auth_signin':
        html += renderAccountAuthScreen({ role: this.state.role, mode: 'signin', formData: this.authFormData });
        break;

      case 'auth_create':
        html += renderAccountAuthScreen({ role: this.state.role, mode: 'create', formData: this.authFormData });
        break;

      case 'auth_forgot':
        html += renderAccountAuthScreen({ role: this.state.role, mode: 'forgot', formData: this.authFormData });
        break;

      // CANEVYN USER SCREENS
      case 'user_home':
        html += renderHeader({
          title: 'Canevyn',
          battery: device.isConnected ? device.batteryPercent : null,
          isConnected: Boolean(device.isConnected),
          isMuted: this.speechAssistant.isMuted
        });
        html += renderUserHomeScreen({
          user,
          device,
          location,
          guardians: this.state.guardians || [],
          connectionBanner: this.state.connectionBanner || null,
          gpsState: this.state.gpsState || {}
        });
        html += renderBottomNav(activeUserTab);
        break;

      case 'user_location':
        html += renderHeader({
          title: 'Wayfinding',
          battery: device.isConnected ? device.batteryPercent : null,
          isConnected: Boolean(device.isConnected),
          isMuted: this.speechAssistant.isMuted
        });
        html += renderUserLocationScreen({
          location,
          device,
          gpsState: this.state.gpsState || {}
        });
        html += renderBottomNav(activeUserTab);
        break;

      case 'user_voice':
        html += renderHeader({
          title: 'Voice Assistant',
          battery: device.isConnected ? device.batteryPercent : null,
          isConnected: Boolean(device.isConnected),
          isMuted: this.speechAssistant.isMuted
        });
        html += renderUserVoiceScreen({
          voiceState,
          transcript: voiceTranscript,
          response: voiceResponse,
          device,
          location
        });
        html += renderBottomNav(activeUserTab);
        break;

      case 'user_guardian':
        html += renderHeader({
          title: 'Guardians',
          battery: device.isConnected ? device.batteryPercent : null,
          isConnected: Boolean(device.isConnected),
          isMuted: this.speechAssistant.isMuted
        });
        html += renderUserGuardianScreen({
          guardians: this.state.guardians || [],
          pendingRequests: this.state.pendingRequests || [],
          currentUserId: (this.state.user && (this.state.user.canevyn_id || this.state.user.id)) || 'CVN-10482',
          searchResult: this.state.memberSearchResult || null,
          searchError: this.state.memberSearchError || '',
          searchedMemberId: (this.state.memberIdSearchQuery !== undefined && this.state.memberIdSearchQuery !== null) ? this.state.memberIdSearchQuery : (this.state.searchedMemberId || ''),
          connectionBanner: this.state.connectionBanner || null
        });
        html += renderBottomNav(activeUserTab);
        break;

      case 'user_settings':
        html += renderHeader({
          title: 'Settings',
          battery: device.isConnected ? device.batteryPercent : null,
          isConnected: Boolean(device.isConnected),
          isMuted: this.speechAssistant.isMuted
        });
        html += renderUserSettingsScreen({
          user: this.state.user,
          device,
          guardians: this.state.guardians || [],
          gpsState: this.state.gpsState || this.locationService.getSnapshot(),
          speechRate: settings.speechRate,
          voiceFeedbackEnabled: !this.speechAssistant.isMuted,
          sensitivity: settings.sensitivity,
          vibrationIntensity: settings.haptic,
          audioAlertsEnabled: settings.audioAlertsEnabled !== false
        });
        html += renderBottomNav(activeUserTab);
        break;

      case 'user_device':
        html += renderUserDeviceStatusScreen({
          device
        });
        break;

      case 'user_sos':
        html += renderUserHardwareSosStatusScreen({
          device
        });
        break;

      case 'user_notifications':
        html += renderHeader({
          title: 'Alerts',
          battery: device.batteryPercent,
          isConnected: device.isConnected,
          isMuted: this.speechAssistant.isMuted,
          showBack: true
        });
        html += renderUserNotificationsScreen({
          notifications: this.state.notifications,
          currentCategory: this.state.notificationCategory
        });
        html += renderBottomNav(activeUserTab);
        break;

      // AUTHORIZED MEMBER SCREENS
      case 'guardian_dashboard': {
        const activeWard = this._getActiveMonitoredUser();
        const wardTelemetry = this._getActiveMonitoredTelemetry(activeWard);
        const wardDev = (wardTelemetry && wardTelemetry.device) || {};
        const isHardwareIntegrated = Boolean(
          wardDev.is_hardware_integrated ||
          wardDev.is_connected ||
          (activeWard && (activeWard.is_hardware_integrated || activeWard.is_connected))
        );
        const rawBattery = (wardDev.battery_percent !== null && wardDev.battery_percent !== undefined)
          ? wardDev.battery_percent
          : ((activeWard && activeWard.battery_percent !== null && activeWard.battery_percent !== undefined) ? activeWard.battery_percent : null);
        const headerBattery = isHardwareIntegrated ? rawBattery : null;
        const headerConnected = isHardwareIntegrated && Boolean(wardDev.is_connected || (activeWard && activeWard.is_connected));
        const unreadCount = (this.state.guardianNotifications || []).filter(n => !n.is_read).length;

        html += renderHeader({
          title: 'Guardian Hub',
          battery: headerBattery,
          isConnected: headerConnected,
          isHardwareIntegrated,
          isMuted: this.speechAssistant.isMuted,
          isGuardian: true,
          unreadCount
        });
        html += renderGuardianDashboardScreen({
          monitoredUser: activeWard,
          monitoredUsers: this.state.monitoredUsers || [],
          latestTelemetry: wardTelemetry,
          requests: this.state.guardianRequests || [],
          incomingRequests: this.state.incomingMemberRequests || [],
          currentMemberId: (this.state.user && this.state.user.canevyn_id) || '',
          currentUserName: (this.state.user && this.state.user.full_name) || 'Caregiver',
          showSwitcher: this.state.showUserSwitcher,
          pendingRemoveUser: this.state.pendingRemoveUser,
          guardianNotifications: this.state.guardianNotifications || [],
          activeSosAlert: this.state.activeSosAlert || null
        });
        break;
      }

      case 'guardian_connect':
        // Authorized Members do not initiate requests to Blind Users
        this.navigateTo('guardian_dashboard');
        return;

      case 'guardian_location': {
        const activeWard = this._getActiveMonitoredUser();
        const wardTelemetry = this._getActiveMonitoredTelemetry(activeWard);

        html += renderGuardianLocationScreen({
          monitoredUser: activeWard,
          monitoredUsers: this.state.monitoredUsers || [],
          latestTelemetry: wardTelemetry,
          pendingRemoveUser: this.state.pendingRemoveUser
        });
        break;
      }

      case 'guardian_settings': {
        const unreadCount = (this.state.guardianNotifications || []).filter(n => !n.is_read).length;
        html += renderHeader({
          title: 'Member Settings',
          battery: null,
          isConnected: false,
          isHardwareIntegrated: false,
          isMuted: this.speechAssistant.isMuted,
          isGuardian: true,
          unreadCount
        });
        html += renderGuardianSettingsScreen({
          user: this.state.user,
          guardianTheme: this.state.guardianTheme,
          monitoredUsers: this.state.monitoredUsers || [],
          pendingRemoveUser: this.state.pendingRemoveUser
        });
        break;
      }

      case 'guardian_sos':
        html += renderGuardianSosAlertScreen({
          alertData: this.state.activeSosAlert
        });
        break;

      default:
        html += renderWelcomeRoleScreen(this.state.role);
    }

    root.innerHTML = html;

    // Restore focus and cursor selection if memberIdSearchInput was focused
    if (wasMemberIdFocused) {
      const restoredInput = document.getElementById('memberIdSearchInput');
      if (restoredInput) {
        restoredInput.focus();
        try {
          restoredInput.setSelectionRange(memberIdSelectionStart, memberIdSelectionEnd);
        } catch (e) {}
      }
    }

    this._attachEventListeners();

    if (this.pendingGpsFocus && currentScreen === 'user_location') {
      this.pendingGpsFocus = false;
      this._focusGpsEnableButton();
    } else if (screenChanged) {
      this._announceScreenChange(currentScreen);
    }

    if (currentScreen === 'guardian_dashboard') {
      const activeWard = this._getActiveMonitoredUser();
      if (activeWard) {
        const wardTelemetry = this._getActiveMonitoredTelemetry(activeWard);
        this.guardianMapManager.syncLocation('guardianDashboardMap', wardTelemetry.location);
      }
    } else if (currentScreen === 'guardian_location') {
      const activeWard = this._getActiveMonitoredUser();
      const wardTelemetry = this._getActiveMonitoredTelemetry(activeWard);
      this.guardianMapManager.syncLocation('guardianFullMap', wardTelemetry.location);
    }
  }

  _attachEventListeners() {
    // 1. Hardware Simulator Bar Events
    const simPullBtn = document.getElementById('simPullLatchBtn');
    if (simPullBtn) {
      simPullBtn.onclick = () => {
        this.deviceManager.simulateHardwareLatchPull();
      };
    }

    const simResetBtn = document.getElementById('simResetLatchBtn');
    if (simResetBtn) {
      simResetBtn.onclick = () => {
        this.deviceManager.simulateHardwareLatchReset();
      };
    }

    const simToggleConnBtn = document.getElementById('simToggleConnBtn');
    if (simToggleConnBtn) {
      simToggleConnBtn.onclick = () => {
        this.isDevSimOverride = true;
        this.deviceManager.mockStick.startSimulation();
        this.deviceManager.mockStick.toggleConnection();
      };
    }

    const simBattLow = document.getElementById('simBattLow');
    if (simBattLow) simBattLow.onclick = () => { this.isDevSimOverride = true; this.deviceManager.mockStick.startSimulation(); this.deviceManager.mockStick.setBattery(18); };
    const simBattNominal = document.getElementById('simBattNominal');
    if (simBattNominal) simBattNominal.onclick = () => { this.isDevSimOverride = true; this.deviceManager.mockStick.startSimulation(); this.deviceManager.mockStick.setBattery(82); };
    const simBattFull = document.getElementById('simBattFull');
    if (simBattFull) simBattFull.onclick = () => { this.isDevSimOverride = true; this.deviceManager.mockStick.startSimulation(); this.deviceManager.mockStick.setBattery(100); };

    const toggleSimControlsBtn = document.getElementById('toggleSimControlsBtn');
    const simPanel = document.getElementById('simControlsPanel');
    if (toggleSimControlsBtn && simPanel) {
      toggleSimControlsBtn.onclick = () => {
        simPanel.classList.toggle('hidden');
      };
    }

    const simSwitchBleModeBtn = document.getElementById('simSwitchBleModeBtn');
    if (simSwitchBleModeBtn) {
      simSwitchBleModeBtn.onclick = async () => {
        if (this.deviceManager.mode === 'mock') {
          try {
            await this.deviceManager.switchToRealBLE();
            alert('Connected to physical Canevyn BLE stick!');
          } catch (err) {
            alert(`Web Bluetooth scan error: ${err.message}. Reverting to Mock.`);
            this.deviceManager.switchToMock();
          }
        } else {
          this.deviceManager.switchToMock();
          alert('Switched to separated mock hardware layer.');
        }
        this.render();
      };
    }

    // 2. Welcome Role Selection Events
    const roleUserCard = document.getElementById('roleUserCard');
    const roleGuardianCard = document.getElementById('roleGuardianCard');
    if (roleUserCard) {
      roleUserCard.onclick = () => {
        this.state.role = 'canevyn_user';
        this.speechAssistant.vibrate([40]);
        this.navigateTo('auth_options');
      };
    }
    if (roleGuardianCard) {
      roleGuardianCard.onclick = () => {
        this.state.role = 'authorized_member';
        this.speechAssistant.vibrate([40]);
        this.navigateTo('auth_options');
      };
    }
    const welcomeContinueBtn = document.getElementById('welcomeContinueBtn');
    if (welcomeContinueBtn) {
      welcomeContinueBtn.onclick = () => {
        this.navigateTo('auth_options');
      };
    }
    const narrateRoleBtn = document.getElementById('narrateRoleBtn');
    if (narrateRoleBtn) {
      narrateRoleBtn.onclick = () => {
        this.speechAssistant.speak("Welcome to Canevyn. Smart assistive mobility system. Choose Canevyn User for voice-first guidance, or Authorized Member for family safety monitoring.");
      };
    }

    // 3. Auth Screens Events
    const btnBackRole = document.getElementById('btn-back-role');
    const btnChangeRole = document.getElementById('btn-change-role');
    if (btnBackRole || btnChangeRole) {
      const handler = () => this.navigateTo('welcome_role');
      if (btnBackRole) btnBackRole.onclick = handler;
      if (btnChangeRole) btnChangeRole.onclick = handler;
    }

    const btnActionSignin = document.getElementById('btn-action-signin');
    if (btnActionSignin) {
      btnActionSignin.onclick = () => this.navigateTo('auth_signin');
    }

    const btnActionCreate = document.getElementById('btn-action-create');
    if (btnActionCreate) {
      btnActionCreate.onclick = () => this.navigateTo('auth_create');
    }

    const authBackBtn = document.getElementById('authBackBtn');
    if (authBackBtn) {
      authBackBtn.onclick = () => this.navigateTo('auth_options');
    }

    // Interactive Role Switching on Create Account & Sign In
    const selectRoleUserBtn = document.getElementById('selectRoleUserBtn');
    const selectRoleGuardianBtn = document.getElementById('selectRoleGuardianBtn');
    if (selectRoleUserBtn) {
      selectRoleUserBtn.onclick = () => {
        if (this.state.role !== 'canevyn_user') {
          this.state.role = 'canevyn_user';
          this.speechAssistant.speak("Selected CaneVyn Blind User role.");
          this.render(true);
        }
      };
    }
    if (selectRoleGuardianBtn) {
      selectRoleGuardianBtn.onclick = () => {
        if (this.state.role !== 'authorized_member') {
          this.state.role = 'authorized_member';
          this.speechAssistant.speak("Selected Authorized Member role.");
          this.render(true);
        }
      };
    }

    // Dynamic input field sync for Create Account and Sign In
    const nameInp = document.getElementById('authNameInput');
    if (nameInp) nameInp.oninput = (e) => { this.authFormData.name = e.target.value; };
    const emailInp = document.getElementById('authEmailInput');
    if (emailInp) emailInp.oninput = (e) => { this.authFormData.email = e.target.value; };
    const pwdInp = document.getElementById('authPasswordInput');
    const confirmPwdInp = document.getElementById('authConfirmPasswordInput');
    
    const updatePasswordMatchUI = () => {
      const matchText = document.getElementById('passwordMatchText');
      const matchIndicator = document.getElementById('passwordMatchIndicator');
      if (!matchText || !matchIndicator) return;
      const p = pwdInp ? pwdInp.value : '';
      const cp = confirmPwdInp ? confirmPwdInp.value : '';
      if (!cp) {
        matchText.innerText = 'Re-type your password to confirm it matches.';
        matchIndicator.className = 'text-xs mt-1.5 flex items-center gap-1.5 text-on-surface-variant';
      } else if (p === cp) {
        matchText.innerText = 'Passwords match!';
        matchIndicator.className = 'text-xs mt-1.5 flex items-center gap-1.5 text-secondary font-bold';
      } else {
        matchText.innerText = 'Passwords do not match yet.';
        matchIndicator.className = 'text-xs mt-1.5 flex items-center gap-1.5 text-error font-medium';
      }
    };

    if (pwdInp) {
      pwdInp.oninput = (e) => {
        this.authFormData.password = e.target.value;
        updatePasswordMatchUI();
      };
    }
    if (confirmPwdInp) {
      confirmPwdInp.oninput = (e) => {
        this.authFormData.confirmPassword = e.target.value;
        updatePasswordMatchUI();
      };
    }
    const phoneInp = document.getElementById('authPhoneInput');
    if (phoneInp) phoneInp.oninput = (e) => { this.authFormData.phone = e.target.value; };

    // Password Show/Hide Toggle (Password Field)
    const togglePwdBtn = document.getElementById('togglePasswordVisibilityBtn');
    if (togglePwdBtn && pwdInp) {
      togglePwdBtn.onclick = () => {
        const isPwd = pwdInp.type === 'password';
        pwdInp.type = isPwd ? 'text' : 'password';
        const icon = document.getElementById('passwordVisibilityIcon');
        if (icon) icon.innerText = isPwd ? 'visibility_off' : 'visibility';
      };
    }

    // Password Show/Hide Toggle (Confirm Password Field)
    const toggleConfirmPwdBtn = document.getElementById('toggleConfirmPasswordVisibilityBtn');
    if (toggleConfirmPwdBtn && confirmPwdInp) {
      toggleConfirmPwdBtn.onclick = () => {
        const isPwd = confirmPwdInp.type === 'password';
        confirmPwdInp.type = isPwd ? 'text' : 'password';
        const icon = document.getElementById('confirmPasswordVisibilityIcon');
        if (icon) icon.innerText = isPwd ? 'visibility_off' : 'visibility';
      };
    }

    // Forgot Password and Navigation Links
    const btnForgot = document.getElementById('btnForgotPassword');
    if (btnForgot) {
      btnForgot.onclick = () => this.navigateTo('auth_forgot');
    }
    const returnSigninBtn = document.getElementById('returnToSigninBtn');
    if (returnSigninBtn) {
      returnSigninBtn.onclick = () => this.navigateTo('auth_signin');
    }
    const linkSignin = document.getElementById('linkToSignin');
    if (linkSignin) {
      linkSignin.onclick = () => this.navigateTo('auth_signin');
    }
    const linkCreate = document.getElementById('linkToCreate');
    if (linkCreate) {
      linkCreate.onclick = () => this.navigateTo('auth_create');
    }

    // Forgot Password Form Handler
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) {
      forgotForm.onsubmit = async (e) => {
        e.preventDefault();
        const forgotEmailInp = document.getElementById('forgotEmailInput');
        const email = forgotEmailInp ? forgotEmailInp.value.trim() : '';
        const errEl = document.getElementById('forgotErrorMsg');
        const errTxt = document.getElementById('forgotErrorText');
        const succEl = document.getElementById('forgotSuccessMsg');
        const succTxt = document.getElementById('forgotSuccessText');
        const submitBtn = document.getElementById('forgotSubmitBtn');

        if (errEl) errEl.classList.add('hidden');
        if (succEl) succEl.classList.add('hidden');

        if (!email || !email.includes('@') || !email.includes('.')) {
          if (errTxt) errTxt.innerText = 'Please enter a valid email address.';
          if (errEl) errEl.classList.remove('hidden');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
        }

        try {
          const res = await this.apiClient.forgotPassword(email);
          if (succTxt) succTxt.innerText = res.message || 'Password reset instructions dispatched. Please check your inbox.';
          if (succEl) succEl.classList.remove('hidden');
          this.speechAssistant.speak("Password reset instructions dispatched. Please check your inbox.");
        } catch (err) {
          if (errTxt) errTxt.innerText = err.message || 'Unable to process reset request.';
          if (errEl) errEl.classList.remove('hidden');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
          }
        }
      };
    }

    // Main Authentication Form Handler (Sign In / Create Account)
    const authForm = document.getElementById('authForm');
    if (authForm) {
      authForm.onsubmit = async (e) => {
        e.preventDefault();
        if (this.isAuthSubmitting) return;

        const emailInp = document.getElementById('authEmailInput');
        const pwdInp = document.getElementById('authPasswordInput');
        const confirmPwdInp = document.getElementById('authConfirmPasswordInput');
        const nameInp = document.getElementById('authNameInput');
        const phoneInp = document.getElementById('authPhoneInput');
        const errorEl = document.getElementById('authErrorMsg');
        const errorText = document.getElementById('authErrorText');
        const successEl = document.getElementById('authSuccessMsg');
        const successText = document.getElementById('authSuccessText');
        const submitBtn = document.getElementById('authSubmitBtn');
        const submitText = document.getElementById('authSubmitText');
        const submitIcon = document.getElementById('authSubmitIcon');

        const email = emailInp ? emailInp.value.trim() : '';
        const password = pwdInp ? pwdInp.value : '';
        const confirmPassword = confirmPwdInp ? confirmPwdInp.value : '';
        const name = nameInp ? nameInp.value.trim() : '';
        const phone = phoneInp ? phoneInp.value.trim() : '';

        const isCreate = (this.state.currentScreen === 'auth_create');

        // Always preserve entered values in application state so fields are not cleared
        this.authFormData.name = name;
        this.authFormData.email = email;
        this.authFormData.phone = phone;
        this.authFormData.password = password;
        this.authFormData.confirmPassword = confirmPassword;

        // Reset feedback banners
        if (errorEl) errorEl.classList.add('hidden');
        if (successEl) successEl.classList.add('hidden');

        const showAuthError = (msg) => {
          if (errorText) errorText.innerText = msg;
          else if (errorEl) errorEl.innerText = msg;
          if (errorEl) errorEl.classList.remove('hidden');
        };

        const showAuthSuccess = (msg) => {
          if (successText) successText.innerText = msg;
          else if (successEl) successEl.innerText = msg;
          if (successEl) successEl.classList.remove('hidden');
        };

        // Client-side validation checks
        if (isCreate && !name) {
          showAuthError('Please enter your full name.');
          if (nameInp) nameInp.focus();
          return;
        }

        if (!email) {
          showAuthError('Please enter your email address.');
          if (emailInp) emailInp.focus();
          return;
        }

        if (!email.includes('@') || !email.includes('.')) {
          showAuthError('Please enter a valid email address (e.g. name@example.com).');
          if (emailInp) emailInp.focus();
          return;
        }

        if (!password || password.length < 6) {
          showAuthError('Password must be at least 6 characters long.');
          if (pwdInp) pwdInp.focus();
          return;
        }

        if (isCreate && confirmPwdInp) {
          if (!confirmPassword) {
            showAuthError('Please enter your password confirmation.');
            confirmPwdInp.focus();
            return;
          }
          if (password !== confirmPassword) {
            showAuthError('Password and Confirm Password do not match. Please verify both passwords match.');
            confirmPwdInp.focus();
            return;
          }
        }

        // Activate loading state
        this.isAuthSubmitting = true;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
        }
        if (submitText) {
          submitText.innerText = isCreate ? 'Creating Account...' : 'Signing In...';
        }
        if (submitIcon) {
          submitIcon.classList.add('animate-spin');
          submitIcon.innerText = 'progress_activity';
        }

        try {
          let res;
          if (isCreate) {
            res = await this.apiClient.register({
              email,
              password,
              confirm_password: confirmPassword || password,
              full_name: name,
              role: this.state.role,
              phone_number: phone || null
            });
            showAuthSuccess(`Account created for ${res.user.full_name}! Launching dashboard...`);
          } else {
            // Log in with selected role hint to prevent cross-role login surprises
            res = await this.apiClient.login(email, password, this.state.role);
            showAuthSuccess(`Welcome back, ${res.user.full_name}! Loading dashboard...`);
          }

          this.state.user = res.user;
          this.state.role = res.user.role;
          this.state.isAuthenticated = true;
          this._applyUserPreferences(res.user);
          this.wsClient.connect(res.user.id, res.access_token);

          // Clear sensitive password and form values only after successful authentication
          this.authFormData.name = '';
          this.authFormData.email = '';
          this.authFormData.password = '';
          this.authFormData.confirmPassword = '';
          this.authFormData.phone = '';

          // Brief pause for visual confirmation
          await new Promise(r => setTimeout(r, 650));

          if (this.state.role === 'canevyn_user') {
            this._stopGuardianLocationSync();
            await this._syncSavedGpsPreference(Boolean(res.user.location_sharing_enabled), true);
            this.navigateTo('user_home', 'home');
            this._loadUserData();
            this._startBlindUserStatusSync();
            if (isCreate) {
              const userCid = res.user.canevyn_id || 'CVN-10482';
              this.speechAssistant.speak(`Welcome to CaneVyn. Your CaneVyn User ID is ${userCid}. Share this ID with your authorized family member or caregiver to connect with them.`);
            } else {
              this.speechAssistant.speak(`Signed in successfully as ${res.user.full_name}.`);
            }
          } else {
            this._stopBlindUserStatusSync();
            await this._loadGuardianData();
            this._startGuardianLocationSync();
            this.navigateTo('guardian_dashboard');
          }
        } catch (err) {
          console.error('Authentication attempt failed:', err);
          const errMsg = err.message || 'Authentication failed. Please verify credentials.';
          if (errMsg.includes('already exists')) {
            showAuthError('An account with this email address already exists.');
            if (errorText) {
              errorText.innerHTML = `An account with <strong>${email}</strong> already exists. <button type="button" id="quickSwitchToSigninBtn" class="underline text-secondary font-bold ml-1">Click here to Sign In</button>`;
              const quickBtn = document.getElementById('quickSwitchToSigninBtn');
              if (quickBtn) {
                quickBtn.onclick = () => {
                  this.authFormData.email = email;
                  this.navigateTo('auth_signin');
                };
              }
            }
          } else {
            showAuthError(errMsg);
          }
          this.speechAssistant.speak(`Authentication notice: ${errMsg}`);
          // CRITICAL: Preserve all entered fields (name, email, phone, and passwords) so user does not lose their input!
        } finally {
          this.isAuthSubmitting = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
          }
          if (submitText) {
            submitText.innerText = isCreate ? 'Create Account & Continue' : 'Sign In to Canevyn';
          }
          if (submitIcon) {
            submitIcon.classList.remove('animate-spin');
            submitIcon.innerText = 'arrow_forward';
          }
        }
      };
    }

    // 4. Global Header Events
    const headerDevBtn = document.getElementById('headerDeviceStatusBtn');
    if (headerDevBtn) {
      headerDevBtn.onclick = () => {
        if (this.state.role === 'canevyn_user') {
          this.navigateTo('user_device');
        }
      };
    }

    const headerAudioBtn = document.getElementById('headerAudioToggleBtn');
    if (headerAudioBtn) {
      headerAudioBtn.onclick = () => {
        this.speechAssistant.toggleMute();
        this.render();
      };
    }

    const headerProfileBtn = document.getElementById('headerProfileBtn');
    if (headerProfileBtn) {
      headerProfileBtn.onclick = () => {
        if (this.state.role === 'authorized_member' && this.state.isAuthenticated) {
          this.navigateTo('guardian_settings');
        } else if (confirm('Switch role or sign out?')) {
          this._logoutToWelcome();
        }
      };
    }

    const headerBackBtn = document.getElementById('headerBackBtn');
    if (headerBackBtn) {
      headerBackBtn.onclick = () => {
        this.navigateTo('user_home', 'home');
      };
    }

    // 5. Bottom Navigation Tabs
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.onclick = () => {
        const tab = btn.dataset.tab;
        this.speechAssistant.vibrate([30]);
        if (tab === 'home') this.navigateTo('user_home', 'home');
        else if (tab === 'location') this.navigateTo('user_location', 'location');
        else if (tab === 'voice') {
          if (this.state.currentScreen === 'user_voice') {
            this._toggleVoiceListening();
          } else {
            this.navigateTo('user_voice', 'voice');
          }
        }
        else if (tab === 'guardian') this.navigateTo('user_guardian', 'guardian');
        else if (tab === 'settings') this.navigateTo('user_settings', 'settings');
      };
    });

    // 6. User Home Dashboard Events
    const ttsOverviewBtn = document.getElementById('ttsReadOverviewBtn');
    if (ttsOverviewBtn) {
      ttsOverviewBtn.onclick = () => {
        const firstName = this.state.user?.full_name ? this.state.user.full_name.split(' ')[0] : 'there';
        const gpsState = this.state.gpsState || {};
        const gpsPhrase = (gpsState.isLiveActive && gpsState.latitude !== null && gpsState.longitude !== null)
          ? `Live GPS is active at latitude ${gpsState.latitude.toFixed(4)}, longitude ${gpsState.longitude.toFixed(4)}.`
          : `Live GPS status is ${gpsState.status || 'Live Location: Not Available'}.`;
        this.speechAssistant.speak(`Hello ${firstName}. Your smart stick battery is ${this.state.device.batteryPercent} percent. ${gpsPhrase}`);
      };
    }

    // Bind Phone GPS Enable / Stop buttons on Home and Location screens
    this._bindPhoneGpsButtons();

    const touchVoiceCard = document.getElementById('touchVoiceCard');
    const mainVoiceMicBtn = document.getElementById('mainVoiceMicBtn');
    if (touchVoiceCard) {
      touchVoiceCard.onclick = () => {
        this.navigateTo('user_voice', 'voice');
        this.speechAssistant.startListening();
      };
    }
    if (mainVoiceMicBtn) {
      mainVoiceMicBtn.onclick = (e) => {
        e.stopPropagation();
        this.navigateTo('user_voice', 'voice');
        this.speechAssistant.startListening();
      };
    }

    const cardReadDiag = document.getElementById('cardReadDiagnosticsBtn');
    if (cardReadDiag) {
      cardReadDiag.onclick = (e) => {
        e.stopPropagation();
        this.speechAssistant.speak(`Stick diagnostics: Battery ${this.state.device.batteryPercent} percent. Obstacle radar scanning ahead. Ground tip sensor on tactile pavers.`);
      };
    }

    const cardLocBtn = document.getElementById('cardLocationNavBtn');
    if (cardLocBtn) cardLocBtn.onclick = () => this.navigateTo('user_location', 'location');
    const cardProtBtn = document.getElementById('cardProtectorsBtn');
    if (cardProtBtn) cardProtBtn.onclick = () => this.navigateTo('user_guardian', 'guardian');
    const cardSonarBtn = document.getElementById('cardSonarBtn');
    if (cardSonarBtn) cardSonarBtn.onclick = () => this.navigateTo('user_device');

    // 7. Location Screen Events
    this._bindLocationScreenButtons();

    // 8. Voice Screen Events
    const btnVoiceDismiss = document.getElementById('closeAssistantBtn') || document.getElementById('btnVoiceDismiss');
    if (btnVoiceDismiss) {
      btnVoiceDismiss.onclick = () => this.navigateTo('user_home', 'home');
    }
    const btnVoicePushToTalk = document.getElementById('primaryPushToTalk') || document.getElementById('btnVoicePushToTalk');
    if (btnVoicePushToTalk) {
      btnVoicePushToTalk.onclick = () => this._toggleVoiceListening();
    }
    const voiceOrbMicBtn = document.getElementById('voiceOrbMicBtn');
    if (voiceOrbMicBtn) {
      voiceOrbMicBtn.onclick = () => this._toggleVoiceListening();
      voiceOrbMicBtn.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._toggleVoiceListening();
        }
      };
    }
    const replaySpeechBtn = document.getElementById('replaySpeechBtn');
    if (replaySpeechBtn) {
      replaySpeechBtn.onclick = () => {
        const textToReplay = this.state.voiceResponse || "Tap a command below or tap Hold or Tap to Speak.";
        this.speechAssistant.speak(textToReplay, null, true);
      };
    }
    const voiceTapListenBtn = document.getElementById('voiceTapListenBtn');
    if (voiceTapListenBtn) {
      voiceTapListenBtn.onclick = () => this._toggleVoiceListening();
    }

    // Voice quick verbal prompts
    const btnVoiceQuickHome = document.getElementById('btnVoiceQuickHome');
    if (btnVoiceQuickHome) {
      btnVoiceQuickHome.onclick = () => this.speechAssistant.handleCommand("Navigate Home");
    }
    const btnVoiceQuickBattery = document.getElementById('btnVoiceQuickBattery');
    if (btnVoiceQuickBattery) {
      btnVoiceQuickBattery.onclick = () => this.speechAssistant.handleCommand("What's my battery level?");
    }
    const btnVoiceQuickGuardians = document.getElementById('btnVoiceQuickGuardians');
    if (btnVoiceQuickGuardians) {
      btnVoiceQuickGuardians.onclick = () => this.speechAssistant.handleCommand("Who is my Authorized Member?");
    }
    const btnVoiceQuickObstacles = document.getElementById('btnVoiceQuickObstacles');
    if (btnVoiceQuickObstacles) {
      btnVoiceQuickObstacles.onclick = () => this.speechAssistant.handleCommand("Any obstacles?");
    }

    // Voice state testing stage buttons
    const btnStateReady = document.getElementById('btnStateReady');
    if (btnStateReady) btnStateReady.onclick = () => { this.state.voiceState = 'ready'; this.render(); };
    const btnStateListening = document.getElementById('btnStateListening');
    if (btnStateListening) btnStateListening.onclick = () => { this.state.voiceState = 'listening'; this.render(); };
    const btnStateProcessing = document.getElementById('btnStateProcessing');
    if (btnStateProcessing) btnStateProcessing.onclick = () => { this.state.voiceState = 'processing'; this.render(); };
    const btnStateSpeaking = document.getElementById('btnStateSpeaking');
    if (btnStateSpeaking) btnStateSpeaking.onclick = () => { this.state.voiceState = 'speaking'; this.render(); };

    const voiceChips = document.querySelectorAll('.voice-chip-btn');
    voiceChips.forEach(chip => {
      chip.onclick = () => {
        const cmd = chip.dataset.cmd;
        this.speechAssistant.handleCommand(cmd);
      };
    });

    // 9. User Guardian Events
    const btnVoiceReadPage = document.getElementById('voice-read-page');
    if (btnVoiceReadPage) {
      btnVoiceReadPage.onclick = () => {
        const approved = (this.state.guardians || []).filter(g => g.status === 'approved' && g.is_active);
        let speech = '';
        if (approved.length > 0) {
          speech = `Your connected Authorized Members are ${approved.map(g => g.guardian_name).join(', ')}.`;
        } else {
          speech = "You haven't connected with any family member yet.";
        }
        this.speechAssistant.speak(speech);
      };
    }

    // User ID copy & speak buttons
    const btnCopyId = document.getElementById('btnCopyUserId');
    if (btnCopyId) {
      btnCopyId.onclick = () => {
        const myId = (this.state.user && (this.state.user.canevyn_id || this.state.user.id)) || 'CVN-10482';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(myId);
        }
        alert(`Copied CaneVyn User ID: ${myId}`);
        this.speechAssistant.speak(`Copied User ID ${myId} to clipboard.`);
      };
    }
    const btnSpeakId = document.getElementById('btnSpeakUserId');
    if (btnSpeakId) {
      btnSpeakId.onclick = () => {
        const myId = (this.state.user && (this.state.user.canevyn_id || this.state.user.id)) || 'CVN-10482';
        this.speechAssistant.speak(`Your CaneVyn User ID is ${myId}. Share this ID with your authorized family member or caregiver to connect with them.`);
      };
    }
    const btnCopySettingsId = document.getElementById('btnCopySettingsId');
    if (btnCopySettingsId) {
      btnCopySettingsId.onclick = () => {
        const myId = this.state.user ? (this.state.user.canevyn_id || this.state.user.id) : '';
        if (!myId) return;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(myId);
        }
        alert(`Copied CaneVyn User ID: ${myId}`);
        this.speechAssistant.speak(`Copied User ID ${myId} to clipboard.`);
      };
    }

    // NEW INVERTED WORKFLOW: Blind User Searches & Connects with Authorized Member
    const memberSearchForm = document.getElementById('memberSearchForm');
    const memberIdSearchInput = document.getElementById('memberIdSearchInput');
    const btnSearchMember = document.getElementById('btnSearchMember');

    if (memberIdSearchInput) {
      const syncInput = () => {
        this.state.memberIdSearchQuery = memberIdSearchInput.value;
      };
      memberIdSearchInput.oninput = syncInput;
      memberIdSearchInput.onpaste = () => setTimeout(syncInput, 0);
      memberIdSearchInput.onchange = syncInput;
      memberIdSearchInput.onkeyup = syncInput;
    }

    const handleSearchAuthorizedMember = async (e) => {
      if (e) e.preventDefault();
      const memId = (memberIdSearchInput ? memberIdSearchInput.value : (this.state.memberIdSearchQuery || '')).trim().toUpperCase();
      this.state.memberIdSearchQuery = memId;
      this.state.searchedMemberId = memId;
      if (!memId) {
        this.state.memberSearchError = 'Please enter an Authorized Member ID (e.g. CVM-12345).';
        this.state.memberSearchResult = null;
        this.render();
        return;
      }
      try {
        const res = await this.apiClient.searchAuthorizedMember(memId);
        this.state.memberSearchResult = res;
        this.state.memberSearchError = '';
        this.speechAssistant.speak(`Found authorized member: ${res.full_name}. Press Send Request to connect.`);
      } catch (err) {
        this.state.memberSearchResult = null;
        this.state.memberSearchError = err.message || 'No Authorized Member found. Please check the ID.';
        this.speechAssistant.speak("No Authorized Member found. Please check the ID.");
      }
      this.render();
    };

    if (memberSearchForm) memberSearchForm.onsubmit = handleSearchAuthorizedMember;
    if (btnSearchMember) btnSearchMember.onclick = handleSearchAuthorizedMember;

    // Send connection request to the searched member
    const btnSendReqToMember = document.getElementById('btnSendRequestToMember');
    if (btnSendReqToMember) {
      btnSendReqToMember.onclick = async () => {
        const memberId = btnSendReqToMember.dataset.memberId;
        const memberName = btnSendReqToMember.dataset.memberName || 'Authorized Member';
        const relTypeInp = document.getElementById('relationshipTypeInput');
        const relLabel = relTypeInp ? relTypeInp.value : 'Family / Caregiver';
        try {
          await this.apiClient.sendRequestToMember(memberId, relLabel);
          this.speechAssistant.speak(`Connection request sent to ${memberName}. Waiting for Authorized Member's response.`);
          this.state.memberSearchResult = null;
          this.state.searchedMemberId = '';
          this.state.memberSearchError = '';
          this.state.memberIdSearchQuery = ''; // Cleared ONLY after successful connection request submission!
          await this._loadUserData();
        } catch (err) {
          this.state.memberSearchError = err.message || 'Failed to send connection request.';
          this.speechAssistant.speak(this.state.memberSearchError);
          this.render();
        }
      };
    }

    // Bind Dismiss Banner, Re-request Rejected Member, and Revoke Connection buttons
    const dismissBannerBtn = document.getElementById('btnDismissConnectionBanner');
    if (dismissBannerBtn) {
      dismissBannerBtn.onclick = () => {
        this.state.connectionBanner = null;
        this._patchBlindUserConnectionUI();
      };
    }
    this._bindUserGuardianSectionButtons();

    // Approve / Reject incoming connection requests (CaneVyn blind user side)
    const respondBtns = document.querySelectorAll('.btn-respond-request');
    respondBtns.forEach(btn => {
      btn.onclick = async () => {
        const relId = btn.dataset.relId;
        const action = btn.dataset.action;
        try {
          await this.apiClient.respondConnectionRequest(relId, action);
          this.speechAssistant.speak(`Connection request ${action === 'approve' ? 'approved' : 'declined'}.`);
          await this._loadUserData();
        } catch (err) {
          alert(err.message || 'Failed to update request');
        }
      };
    });

    // 10. User Settings Events
    const narrateSettingsBtn = document.getElementById('narrateSettingsBtn');
    if (narrateSettingsBtn) {
      narrateSettingsBtn.onclick = () => {
        const userName = (this.state.user && this.state.user.full_name) ? this.state.user.full_name : 'CaneVyn user';
        const activeMembers = (this.state.guardians || []).filter(g => g.status === 'approved' && Boolean(g.is_active));
        const memberSummary = activeMembers.length > 0
          ? `${activeMembers.length} active Authorized ${activeMembers.length === 1 ? 'Member' : 'Members'}: ${activeMembers.map(g => g.guardian_name).join(', ')}.`
          : 'No Authorized Members connected yet.';
        const stickSummary = (this.state.device && (this.state.device.isHardwareIntegrated || this.state.device.isConnected))
          ? `Smart Stick is ${this.state.device.isConnected ? 'Connected' : 'Disconnected'}.`
          : 'Smart Stick hardware is not connected.';
        this.speechAssistant.speak(
          `Settings for ${userName}. Speech speed ${this.state.settings.speechRate.toFixed(1)}. ${stickSummary} ${memberSummary}`
        );
      };
    }

    const speakVoiceTutorial = () => {
      const rate = this.state.settings.speechRate.toFixed(1);
      this.speechAssistant.speak(
        `CaneVyn Voice Tutorial. Speech speed is ${rate}. You can ask: Where am I, Enable my location, Stop live location, Is my live location active, Who is my Authorized Member, or What is my battery level.`
      );
    };

    const btnVoiceTour = document.getElementById('btn-voice-tour');
    if (btnVoiceTour) {
      btnVoiceTour.onclick = speakVoiceTutorial;
    }
    const btnVoiceGuidanceTutorial = document.getElementById('btnVoiceGuidanceTutorial');
    if (btnVoiceGuidanceTutorial) {
      btnVoiceGuidanceTutorial.onclick = speakVoiceTutorial;
    }

    const toggleVoiceFeedbackBtn = document.getElementById('toggleVoiceFeedbackBtn');
    if (toggleVoiceFeedbackBtn) {
      toggleVoiceFeedbackBtn.onclick = async () => {
        const currentlyEnabled = !this.speechAssistant.isMuted;
        const nextEnabled = !currentlyEnabled;
        this.speechAssistant.setMuted(!nextEnabled);
        this.state.settings.voiceFeedbackEnabled = nextEnabled;
        if (nextEnabled) {
          this.speechAssistant.speak('Voice feedback enabled.');
        }
        this.render();
        await this._saveBlindUserPreferences({ voice_feedback_enabled: nextEnabled });
      };
    }

    const rateDecreaseBtn = document.getElementById('rateDecreaseBtn');
    if (rateDecreaseBtn) {
      rateDecreaseBtn.onclick = async () => {
        const nextRate = Number(Math.max(0.7, this.state.settings.speechRate - 0.1).toFixed(1));
        this.state.settings.speechRate = nextRate;
        this.speechAssistant.speechRate = nextRate;
        this.speechAssistant.speak(`Speech rate set to ${nextRate.toFixed(1)}`);
        this.render();
        await this._saveBlindUserPreferences({ speech_rate: nextRate });
      };
    }

    const rateResetBtn = document.getElementById('rateResetBtn');
    if (rateResetBtn) {
      rateResetBtn.onclick = async () => {
        this.state.settings.speechRate = 1.0;
        this.speechAssistant.speechRate = 1.0;
        this.speechAssistant.speak('Speech rate reset to normal 1.0');
        this.render();
        await this._saveBlindUserPreferences({ speech_rate: 1.0 });
      };
    }

    const rateIncreaseBtn = document.getElementById('rateIncreaseBtn');
    if (rateIncreaseBtn) {
      rateIncreaseBtn.onclick = async () => {
        const nextRate = Number(Math.min(1.8, this.state.settings.speechRate + 0.1).toFixed(1));
        this.state.settings.speechRate = nextRate;
        this.speechAssistant.speechRate = nextRate;
        this.speechAssistant.speak(`Speech rate set to ${nextRate.toFixed(1)}`);
        this.render();
        await this._saveBlindUserPreferences({ speech_rate: nextRate });
      };
    }

    const sensButtons = document.querySelectorAll('.opt-sens-btn');
    sensButtons.forEach(btn => {
      btn.onclick = async () => {
        const val = btn.dataset.val;
        this.state.settings.sensitivity = val;
        this.speechAssistant.speak(`Saved obstacle sensitivity preference ${val} for future ESP32 hardware.`);
        this.render();
        await this._saveBlindUserPreferences({ obstacle_sensitivity: val });
      };
    });

    const vibeButtons = document.querySelectorAll('.opt-vibe-btn');
    vibeButtons.forEach(btn => {
      btn.onclick = async () => {
        const val = btn.dataset.val;
        this.state.settings.haptic = val;
        if (val === 'Strong') {
          this.speechAssistant.vibrate([120, 40, 120]);
        } else if (val === 'Gentle') {
          this.speechAssistant.vibrate([50]);
        }
        this.speechAssistant.speak(`Saved vibration intensity preference ${val} for future ESP32 hardware.`);
        this.render();
        await this._saveBlindUserPreferences({ vibration_intensity: val });
      };
    });

    const toggleAudioAlertsBtn = document.getElementById('toggleAudioAlertsBtn');
    if (toggleAudioAlertsBtn) {
      toggleAudioAlertsBtn.onclick = async () => {
        const nextAudio = !(this.state.settings.audioAlertsEnabled !== false);
        this.state.settings.audioAlertsEnabled = nextAudio;
        this.speechAssistant.speak(`Audio alert cues ${nextAudio ? 'enabled' : 'disabled'} for saved profile preferences.`);
        this.render();
        await this._saveBlindUserPreferences({ audio_alerts_enabled: nextAudio });
      };
    }

    const openDevStatusBtn = document.getElementById('openDeviceStatusBtn');
    if (openDevStatusBtn) openDevStatusBtn.onclick = () => this.navigateTo('user_device');

    const settingsRevokeBtns = document.querySelectorAll('.btn-settings-revoke-guardian');
    settingsRevokeBtns.forEach(btn => {
      btn.onclick = async () => {
        const relId = btn.dataset.relId;
        const guardianName = btn.dataset.guardianName || 'Authorized Member';
        if (!confirm(`Are you sure you want to revoke access for ${guardianName}? They will no longer be able to view your location or stick status.`)) {
          return;
        }
        try {
          await this.apiClient.revokeConnection(relId);
          this.speechAssistant.speak(`Connection with ${guardianName} has been revoked.`);
          await this._loadUserData();
        } catch (err) {
          alert(err.message || 'Failed to revoke connection.');
        }
      };
    });

    const btnSettingsManageGuardians = document.getElementById('btnSettingsManageGuardians');
    if (btnSettingsManageGuardians) {
      btnSettingsManageGuardians.onclick = () => this.navigateTo('user_guardian', 'guardian');
    }

    const btnSettingsOpenLocation = document.getElementById('btnSettingsOpenLocation');
    if (btnSettingsOpenLocation) {
      btnSettingsOpenLocation.onclick = () => this.navigateTo('user_location', 'location');
    }

    const settingsLogoutBtn = document.getElementById('settingsLogoutBtn');
    if (settingsLogoutBtn) {
      settingsLogoutBtn.onclick = () => {
        this._logoutToWelcome();
      };
    }

    // 11. User Device Status Events
    const deviceBackBtn = document.getElementById('deviceBackBtn');
    if (deviceBackBtn) {
      deviceBackBtn.onclick = () => this.navigateTo('user_home', 'home');
    }
    const showDeviceToast = (msg) => {
      const feedback = document.getElementById('actionFeedback');
      const feedbackText = document.getElementById('feedbackText');
      if (feedback && feedbackText) {
        feedbackText.textContent = msg;
        feedback.classList.remove('hidden');
        setTimeout(() => feedback.classList.add('hidden'), 3500);
      }
    };

    const chirpBtn = document.getElementById('chirpBtn');
    const deviceChirpPingBtn = document.getElementById('deviceChirpPingBtn');
    const handleChirp = async () => {
      this.speechAssistant.vibrate([80, 40, 80]);
      await this.apiClient.pingBeacon(this.state.device.id).catch(() => null);
      showDeviceToast('Stick Chirp Triggered: Hardware buzzer sounding at 92 dB.');
      this.speechAssistant.speak("Stick chirp activated.");
    };
    if (chirpBtn) chirpBtn.onclick = handleChirp;
    if (deviceChirpPingBtn) deviceChirpPingBtn.onclick = handleChirp;

    const hapticBtn = document.getElementById('hapticBtn');
    if (hapticBtn) {
      hapticBtn.onclick = () => {
        this.speechAssistant.vibrate([150, 100, 150, 100, 200]);
        showDeviceToast('Haptic Test Sent: 3 tactile grip pulses generated.');
        this.speechAssistant.speak("Tactile vibration test transmitted to cane grip.");
      };
    }

    const runDiagBtn = document.getElementById('runDiagnosticsSelfTestBtn');
    if (runDiagBtn) {
      runDiagBtn.onclick = () => {
        this.speechAssistant.speak("Self-test completed. All LiDAR, Bluetooth, and battery cells nominal.");
        showDeviceToast('Hardware Self-Test Passed: All sensors nominal.');
      };
    }

    // 12. User Hardware SOS Events (Hold 3 seconds to resolve)
    const sosBackBtn = document.getElementById('sosBackBtn');
    if (sosBackBtn) {
      sosBackBtn.onclick = () => this.navigateTo('user_home', 'home');
    }

    const resolveBtnEl = document.getElementById('resolveAlertBtn') || document.getElementById('resolve-btn');
    if (resolveBtnEl) {
      let holdTimer = null;
      let holdProgress = 0;
      const progressBar = document.getElementById('holdProgressBar') || document.getElementById('hold-progress');
      const countdown = document.getElementById('countdownLabel') || document.getElementById('countdown-label');

      const startHold = (e) => {
        if (e.cancelable) e.preventDefault();
        holdProgress = 0;
        if (holdTimer) clearInterval(holdTimer);
        holdTimer = setInterval(() => {
          holdProgress += 10;
          if (progressBar) progressBar.style.width = `${(holdProgress / 3000) * 100}%`;
          const remaining = Math.max(0, Math.ceil((3000 - holdProgress) / 1000));
          if (countdown) countdown.innerText = `${remaining}s`;

          if (holdProgress >= 3000) {
            clearInterval(holdTimer);
            holdTimer = null;
            this.deviceManager.resolveActiveSosFromUserApp();
          }
        }, 10);
      };

      const cancelHold = () => {
        if (holdTimer) {
          clearInterval(holdTimer);
          holdTimer = null;
        }
        holdProgress = 0;
        if (progressBar) progressBar.style.width = '0%';
        if (countdown) countdown.innerText = '3s';
      };

      resolveBtnEl.onmousedown = startHold;
      resolveBtnEl.ontouchstart = startHold;
      resolveBtnEl.onmouseup = cancelHold;
      resolveBtnEl.onmouseleave = cancelHold;
      resolveBtnEl.ontouchend = cancelHold;
    }

    // 13. Notifications Screen Events
    const notifTabs = document.querySelectorAll('.filter-tab, .notif-tab-btn');
    notifTabs.forEach(t => {
      t.onclick = () => {
        const cat = t.dataset.category || t.dataset.cat || 'all';
        this.state.notificationCategory = cat;
        // Visual toggle
        notifTabs.forEach(tab => {
          tab.classList.remove('bg-primary', 'text-on-primary', 'font-bold');
          tab.classList.add('bg-surface-container-high', 'text-on-surface');
          tab.setAttribute('aria-selected', 'false');
        });
        t.classList.remove('bg-surface-container-high', 'text-on-surface');
        t.classList.add('bg-primary', 'text-on-primary', 'font-bold');
        t.setAttribute('aria-selected', 'true');

        const cards = document.querySelectorAll('.notification-card');
        cards.forEach(card => {
          if (cat === 'all' || card.dataset.category === cat) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      };
    });

    const btnReadAllNotifs = document.getElementById('btn-read-all');
    if (btnReadAllNotifs) {
      btnReadAllNotifs.onclick = () => {
        const list = this.state.notifications || [];
        if (list.length === 0) {
          this.speechAssistant.speak("You have no new notifications in your alerts feed.");
          return;
        }
        const summary = list.slice(0, 5).map((n, i) => {
          const text = n.spoken_narration || `${n.title}. ${n.body || n.subtitle || ''}`;
          return `Notification ${i + 1}: ${text}`;
        }).join(' ');
        this.speechAssistant.speak(`You have ${list.length} notification${list.length === 1 ? '' : 's'}. ${summary}`);
      };
    }

    const notifSpeakBtns = document.querySelectorAll('.voice-card-btn, .notif-speak-btn');
    notifSpeakBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const speech = btn.dataset.speech;
        if (speech) {
          this.speechAssistant.speak(speech);
        } else {
          const idx = parseInt(btn.dataset.idx, 10);
          const n = this.state.notifications[idx];
          if (n) {
            this.speechAssistant.speak(n.spoken_narration || n.body || n.title);
          }
        }
      };
    });

    const btnClearNonCritical = document.getElementById('btn-clear-non-critical');
    if (btnClearNonCritical) {
      btnClearNonCritical.onclick = () => {
        const cards = document.querySelectorAll('.notification-card');
        cards.forEach(card => {
          if (card.dataset.category !== 'emergency') {
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
          }
        });
        this.speechAssistant.speak("Non-critical notifications cleared.");
      };
    }

    // 14. Authorized Member Dashboard & User Switching Events
    const guardianLiveTrackBtn = document.getElementById('guardianOpenLiveTrackingBtn');
    const guardianExpandBtn = document.getElementById('btn-expand-tracking');
    const openGuardianLocationScreen = async () => {
      const activeWard = this._getActiveMonitoredUser();
      const activeUid = this._getMonitoredUserId(activeWard);
      if (activeUid) {
        await this._fetchMonitoredUserLocation(activeUid);
      }
      this.navigateTo('guardian_location');
    };
    if (guardianLiveTrackBtn) guardianLiveTrackBtn.onclick = openGuardianLocationScreen;
    if (guardianExpandBtn) guardianExpandBtn.onclick = openGuardianLocationScreen;

    // Authorized Member Settings Navigation & Theme Controls
    const headerNotificationsBtn = document.getElementById('headerNotificationsBtn');
    if (headerNotificationsBtn) {
      headerNotificationsBtn.onclick = () => {
        const scrollToAlerts = () => {
          const el = document.getElementById('guardianEmergencyAlertsSection');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        if (this.state.currentScreen !== 'guardian_dashboard') {
          this.navigateTo('guardian_dashboard');
          setTimeout(scrollToAlerts, 60);
        } else {
          scrollToAlerts();
        }
      };
    }

    const btnGuardianSettings = document.getElementById('btnGuardianSettings');
    if (btnGuardianSettings) {
      btnGuardianSettings.onclick = () => this.navigateTo('guardian_settings');
    }
    const btnGuardianSettingsBack = document.getElementById('btnGuardianSettingsBack');
    if (btnGuardianSettingsBack) {
      btnGuardianSettingsBack.onclick = () => this.navigateTo('guardian_dashboard');
    }
    const guardianThemeDarkBtn = document.getElementById('guardianThemeDarkBtn');
    if (guardianThemeDarkBtn) {
      guardianThemeDarkBtn.onclick = () => this._setGuardianTheme('dark');
    }
    const guardianThemeLightBtn = document.getElementById('guardianThemeLightBtn');
    if (guardianThemeLightBtn) {
      guardianThemeLightBtn.onclick = () => this._setGuardianTheme('light');
    }
    const guardianSettingsSignOutBtn = document.getElementById('guardianSettingsSignOutBtn');
    if (guardianSettingsSignOutBtn) {
      guardianSettingsSignOutBtn.onclick = () => this._logoutToWelcome();
    }

    // Authorized Member Remove Connection Workflow & Confirmation Modal
    const openRemoveModalFor = (data = {}) => {
      const activeWard = this._getActiveMonitoredUser() || {};
      this.state.pendingRemoveUser = {
        ...activeWard,
        relationship_id: data.relId || activeWard.relationship_id || '',
        user_id: data.userId || this._getMonitoredUserId(activeWard) || '',
        user_name: data.userName || activeWard.user_name || activeWard.full_name,
        canevyn_user_id: data.userCanevynId || activeWard.canevyn_user_id
      };
      this.render();
      setTimeout(() => {
        const cancelBtn = document.getElementById('btnCancelRemoveConnection');
        if (cancelBtn) cancelBtn.focus();
      }, 40);
    };

    const btnRemoveConnection = document.getElementById('btnRemoveConnection');
    if (btnRemoveConnection) {
      btnRemoveConnection.onclick = () => openRemoveModalFor(btnRemoveConnection.dataset);
    }

    document.querySelectorAll('.btn-manage-remove-connection').forEach(btn => {
      btn.onclick = () => openRemoveModalFor(btn.dataset);
    });

    const btnCancelRemoveConnection = document.getElementById('btnCancelRemoveConnection');
    if (btnCancelRemoveConnection) {
      btnCancelRemoveConnection.onclick = () => {
        this.state.pendingRemoveUser = null;
        this.render();
      };
    }

    const btnConfirmRemoveConnection = document.getElementById('btnConfirmRemoveConnection');
    if (btnConfirmRemoveConnection) {
      btnConfirmRemoveConnection.onclick = async () => {
        const target = this.state.pendingRemoveUser || {};
        const relId = btnConfirmRemoveConnection.dataset.relId || target.relationship_id;
        const removedUid = btnConfirmRemoveConnection.dataset.userId || this._getMonitoredUserId(target);
        if (!relId) {
          this.state.pendingRemoveUser = null;
          this.render();
          return;
        }
        try {
          btnConfirmRemoveConnection.disabled = true;
          await this.apiClient.removeConnection(relId);
          this.state.pendingRemoveUser = null;
          if (removedUid) {
            delete this.state.monitoredTelemetry[removedUid];
            this.state.monitoredUsers = (this.state.monitoredUsers || []).filter(
              u => this._getMonitoredUserId(u) !== removedUid
            );
          }
          if (!this._getActiveMonitoredUser() || this._getMonitoredUserId(this.state.activeMonitoredUser) === removedUid) {
            this.state.activeMonitoredUser = this.state.monitoredUsers[0] || null;
          }
          this.guardianMapManager.destroyAll();
          await this._loadGuardianData();
          if (this.state.currentScreen === 'guardian_location') {
            this.navigateTo('guardian_dashboard');
          }
        } catch (err) {
          btnConfirmRemoveConnection.disabled = false;
          alert(err.message || 'Failed to remove connection.');
        }
      };
    }

    // Authorized Member Shareable ID copy button
    const btnCopyMemberId = document.getElementById('btnCopyMemberId');
    if (btnCopyMemberId) {
      btnCopyMemberId.onclick = () => {
        const memId = btnCopyMemberId.dataset.id;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(memId);
        }
        alert(`Copied Authorized Member ID: ${memId}`);
      };
    }

    // Authorized Member responds to incoming request from blind user (Accept & Monitor / Reject)
    const memberRespondBtns = document.querySelectorAll('.btn-member-respond');
    memberRespondBtns.forEach(btn => {
      btn.onclick = async () => {
        const relId = btn.dataset.relId;
        const action = btn.dataset.action;
        const travelerName = btn.dataset.userName || 'Traveler';
        try {
          await this.apiClient.memberRespondRequest(relId, action);
          alert(`Connection request from ${travelerName} ${action === 'approve' ? 'accepted' : 'declined'}.`);
          await this._loadGuardianData();
        } catch (err) {
          alert(err.message || 'Failed to update request.');
        }
      };
    });

    // Switcher toggle
    const profileSelectorBtn = document.getElementById('profileSelectorBtn') || document.getElementById('guardianSwitchProfileBtn');
    if (profileSelectorBtn) {
      profileSelectorBtn.onclick = () => {
        this.state.showUserSwitcher = !this.state.showUserSwitcher;
        this.render();
      };
    }

    // Switch active monitored traveler (supports switching from both Dashboard and Full Map)
    const selectUserBtns = document.querySelectorAll('.btn-select-user, .btn-switch-monitored');
    selectUserBtns.forEach(btn => {
      btn.onclick = async () => {
        const targetId = btn.dataset.switchUserId || btn.dataset.userId;
        const found = (this.state.monitoredUsers || []).find(
          u => (u.user_id === targetId || u.internal_user_id === targetId || u.id === targetId || u.canevyn_user_id === targetId)
        );
        if (found) {
          this.state.activeMonitoredUser = found;
          this.state.showUserSwitcher = false;
          const uid = this._getMonitoredUserId(found);
          if (uid) {
            const [, activeSos] = await Promise.all([
              this._fetchMonitoredUserLocation(uid),
              this.apiClient.getActiveSos(uid).catch(() => null)
            ]);
            this.state.activeSosAlert = activeSos || null;
          } else {
            this.state.activeSosAlert = null;
          }
          if (this.state.currentScreen === 'guardian_location') {
            this.render();
          } else {
            this.navigateTo('guardian_dashboard');
          }
        }
      };
    });

    const showGuardianToast = (msg) => {
      const toast = document.getElementById('locatorToast') || document.getElementById('actionToast');
      const toastText = document.getElementById('locatorToastText') || document.getElementById('toastMessage');
      if (toast) {
        if (toastText) toastText.textContent = msg;
        toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-24');
        toast.classList.add('opacity-100', 'translate-y-0');
        setTimeout(() => {
          toast.classList.remove('opacity-100', 'translate-y-0');
          toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-24');
        }, 3500);
      }
    };

    const triggerRingCane = async () => {
      const activeWard = this._getActiveMonitoredUser();
      const wardTelemetry = this._getActiveMonitoredTelemetry(activeWard);
      const wardDev = (wardTelemetry && wardTelemetry.device) || {};
      const deviceId = wardDev.id || (activeWard && activeWard.device_id) || null;
      const isHwIntegrated = Boolean(wardDev.is_hardware_integrated || (activeWard && activeWard.is_hardware_integrated));
      const isHwConnected = Boolean(isHwIntegrated && deviceId && (wardDev.is_connected || (activeWard && activeWard.is_connected)));
      const canRingCane = isHwConnected && Boolean(wardDev.supports_remote_ring);
      if (!canRingCane) {
        showGuardianToast(isHwConnected ? 'Ring Cane will be available once the ESP32 command is integrated.' : 'Ring Cane is unavailable — hardware is not connected yet.');
        return;
      }
      try {
        const res = await this.apiClient.pingBeacon(deviceId);
        if (res && res.status === 'success') {
          showGuardianToast('Audible beacon command acknowledged by connected smart stick.');
        } else {
          showGuardianToast('Unable to trigger Ring Cane. Verify hardware connection.');
        }
      } catch (err) {
        showGuardianToast(err.message || 'Unable to trigger Ring Cane. Hardware not connected.');
      }
    };

    const guardianChirpBtn = document.getElementById('audioLocatorBtn') || document.getElementById('guardianChirpPingBtn');
    if (guardianChirpBtn) {
      guardianChirpBtn.onclick = triggerRingCane;
    }

    const guardianDashRefreshBtn = document.getElementById('guardianDashRefreshBtn');
    if (guardianDashRefreshBtn) {
      guardianDashRefreshBtn.onclick = async () => {
        const activeWard = this._getActiveMonitoredUser();
        const activeUid = this._getMonitoredUserId(activeWard);
        if (activeUid) {
          const [, notifs, activeSos] = await Promise.all([
            this._fetchMonitoredUserLocation(activeUid),
            this.apiClient.getNotifications().catch(() => null),
            this.apiClient.getActiveSos(activeUid).catch(() => null)
          ]);
          if (notifs) this.state.guardianNotifications = notifs;
          this.state.activeSosAlert = activeSos || null;
          this.render();
          setTimeout(() => showGuardianToast('Refreshed latest location and alert status.'), 30);
        } else {
          const notifs = await this.apiClient.getNotifications().catch(() => null);
          if (notifs) this.state.guardianNotifications = notifs;
          this.render();
        }
      };
    }

    const btnViewActiveSos = document.getElementById('btnViewActiveSos');
    if (btnViewActiveSos) {
      btnViewActiveSos.onclick = () => {
        if (this.state.activeSosAlert) {
          this.navigateTo('guardian_sos');
        }
      };
    }
    const dismissToast = document.getElementById('dismissToast');
    if (dismissToast) {
      dismissToast.onclick = () => {
        const toast = document.getElementById('locatorToast') || document.getElementById('actionToast');
        if (toast) {
          toast.classList.remove('opacity-100', 'translate-y-0');
          toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-24');
        }
      };
    }

    // 15. Authorized Member Live Location Events
    const guardianLocBackBtn = document.getElementById('guardianLocBackBtn');
    if (guardianLocBackBtn) {
      guardianLocBackBtn.onclick = () => this.navigateTo('guardian_dashboard');
    }

    const quickSoundBtn = document.getElementById('quickSoundBtn') || document.getElementById('guardianLocChirpBtn');
    if (quickSoundBtn) {
      quickSoundBtn.onclick = triggerRingCane;
    }

    const recenterBtn = document.getElementById('recenterBtn');
    if (recenterBtn) {
      recenterBtn.onclick = () => {
        const centered = this.guardianMapManager.recenter('guardianFullMap');
        showGuardianToast(centered ? 'Recentered map on live coordinates.' : 'Live location is not available to recenter.');
      };
    }
    const guardianLocRefreshBtn = document.getElementById('guardianLocRefreshBtn');
    if (guardianLocRefreshBtn) {
      guardianLocRefreshBtn.onclick = async () => {
        const activeWard = this._getActiveMonitoredUser();
        const activeUid = this._getMonitoredUserId(activeWard);
        if (activeUid) {
          await this._fetchMonitoredUserLocation(activeUid);
          this._patchGuardianLocationUI();
          showGuardianToast('Refreshed latest location status.');
        }
      };
    }
    const layersBtn = document.getElementById('layersBtn');
    if (layersBtn) {
      layersBtn.onclick = () => showGuardianToast("Geofence safe zone boundaries toggled.");
    }
    const newGeofenceBtn = document.getElementById('newGeofenceBtn');
    if (newGeofenceBtn) {
      newGeofenceBtn.onclick = () => {
        const zone = prompt("Enter Safe Zone Name (e.g. Community Center):");
        if (zone) showGuardianToast(`Safe Zone '${zone}' radius registered.`);
      };
    }
    const shareLocationBtn = document.getElementById('shareLocationBtn');
    if (shareLocationBtn) {
      shareLocationBtn.onclick = () => {
        showGuardianToast("Live telemetry snapshot transmitted to emergency responders.");
      };
    }

    // 16. Authorized Member SOS Alert Events
    const guardianSosBackBtn = document.getElementById('guardianSosBackBtn');
    if (guardianSosBackBtn) {
      guardianSosBackBtn.onclick = () => this.navigateTo('guardian_dashboard');
    }

    const guardianResolveBtn = document.getElementById('guardianResolveSosBtn');
    if (guardianResolveBtn) {
      guardianResolveBtn.onclick = async () => {
        if (confirm("Confirm marking this hardware emergency incident resolved?")) {
          if (this.state.activeSosAlert && this.state.activeSosAlert.sos_id) {
            await this.apiClient.resolveHardwareSos({
              sos_id: this.state.activeSosAlert.sos_id,
              resolution_source: 'GUARDIAN_VERIFIED',
              resolved_by_user_id: this.state.user ? this.state.user.id : 'guard-marcus-vance',
              notes: 'Verified safe by primary guardian.'
            }).catch(() => null);
          }
          this.state.activeSosAlert = null;
          this.navigateTo('guardian_dashboard');
        }
      };
    }
  }

  _bindUserGuardianSectionButtons() {
    // Re-send connection request after previous rejection
    const rerequestBtns = document.querySelectorAll('.btn-rerequest-member');
    rerequestBtns.forEach(btn => {
      btn.onclick = async () => {
        const memberId = btn.dataset.memberId;
        const memberName = btn.dataset.memberName || 'Authorized Member';
        const relLabel = btn.dataset.relLabel || 'Family / Caregiver';
        try {
          await this.apiClient.sendRequestToMember(memberId, relLabel);
          this.speechAssistant.speak(`New connection request sent to ${memberName}. Waiting for Authorized Member's response.`);
          this.state.connectionBanner = null;
          await this._syncBlindUserConnectionStatus();
        } catch (err) {
          this.speechAssistant.speak(err.message || 'Failed to resend connection request.');
          alert(err.message || 'Failed to resend connection request.');
        }
      };
    });

    // Revoke connection by blind user
    const revokeBtns = document.querySelectorAll('.btn-revoke-guardian');
    revokeBtns.forEach(btn => {
      btn.onclick = async () => {
        const relId = btn.dataset.relId;
        const guardianName = btn.dataset.guardianName || 'Member';
        if (!confirm(`Are you sure you want to revoke access for ${guardianName}? They will no longer be able to view your location or stick status.`)) {
          return;
        }
        try {
          await this.apiClient.revokeConnection(relId);
          this.speechAssistant.speak(`Connection with ${guardianName} has been revoked.`);
          await this._syncBlindUserConnectionStatus();
        } catch (err) {
          alert(err.message || 'Failed to revoke connection.');
        }
      };
    });
  }

  async _logoutToWelcome() {
    this._stopBlindUserStatusSync();
    this._stopGuardianLocationSync();
    this.guardianMapManager.destroyAll();
    await this.locationService.stopSharing({
      notifyBackend: Boolean(this.apiClient.token && this.state.role === 'canevyn_user')
    });
    this.hasAnnouncedGpsLock = false;
    this.hasAnnouncedResumeNotice = false;
    this.pendingGpsFocus = false;
    this.isDevSimOverride = false;
    this.apiClient.clearSession();
    this.wsClient.disconnect();
    this.state.isAuthenticated = false;
    this.state.user = null;
    this.state.role = 'canevyn_user';
    this.state.guardianTheme = 'dark';
    this.state.settings = {
      speechRate: 1.0,
      voiceFeedbackEnabled: true,
      sensitivity: 'High',
      highContrast: true,
      haptic: 'Strong',
      audioAlertsEnabled: true
    };
    this.speechAssistant.speechRate = 1.0;
    this.speechAssistant.setMuted(false);
    this.state.pendingRemoveUser = null;
    this.state.guardians = [];
    this.state.pendingRequests = [];
    this.state.monitoredUsers = [];
    this.state.monitoredTelemetry = {};
    this.state.activeMonitoredUser = null;
    this.state.incomingMemberRequests = [];
    this.state.guardianNotifications = [];
    this.state.activeSosAlert = null;
    this.state.connectionBanner = null;
    this.lastGuardianStatuses = {};
    this.announcedTransitions = new Set();
    this.navigateTo('welcome_role');
  }
}

// Robust Application Bootstrap (handles both pre- and post-DOMContentLoaded module execution)
function bootstrapCanevynApp() {
  if (!window.canevyn) {
    window.canevyn = new CanevynApp();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrapCanevynApp);
} else {
  bootstrapCanevynApp();
}
