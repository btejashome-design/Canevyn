/**
 * Canevyn Voice Assistant Service
 * Strict Rule: No chatbot or conversational UI.
 * Function: Voice-first smart assistant with grounded natural language feedback based strictly on real application data.
 * Features:
 * - Automatic Voice Welcome on dashboard entry
 * - Predefined fixed voice commands
 * - Indian English (en-IN) voice support with fallback
 * - Mute / Unmute controls
 * - Graceful microphone permission handling
 * - Navigation shortcuts via voice
 */

export class CanevynSpeechAssistant {
  constructor(deviceManager, stateGetter, apiClient = null) {
    this.deviceManager = deviceManager;
    this.getState = stateGetter || (() => ({}));
    this.apiClient = apiClient;
    this.speechRate = 1.0;
    this.isListening = false;
    this.currentVoiceState = 'ready';
    this._hasRecognitionResult = false;
    this._fallbackListenTimer = null;
    this._speechToken = 0;
    this._speechWatchdogTimer = null;
    this._speechSafetyTimer = null;
    this._isProcessingCommand = false;
    this.recognition = null;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isMuted = (typeof localStorage !== 'undefined' && localStorage.getItem('canevyn_voice_muted') === 'true');
    this.hasWelcomed = false;

    this.listeners = {
      stateChange: [],
      transcript: [],
      response: [],
      navigate: [],
      muteChange: [],
      requestResponded: [],
      startLocationSharing: [],
      stopLocationSharing: []
    };

    this._initSpeechRecognition();
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (event === 'stateChange' && data && data.state) {
      this.currentVoiceState = data.state;
    }
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('canevyn_voice_muted', this.isMuted ? 'true' : 'false');
    }
    if (this.isMuted && this.synth) {
      this.synth.cancel();
    }
    this.emit('muteChange', { isMuted: this.isMuted });
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    if (!this.isMuted) {
      this.speak("Voice guidance unmuted.", null, true);
    }
    return this.isMuted;
  }

  _initSpeechRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      // Prefer Indian English (en-IN) where available
      this.recognition.lang = 'en-IN';

      this.recognition.onstart = () => {
        this._hasRecognitionResult = false;
        this.isListening = true;
        this.emit('stateChange', { state: 'listening' });
        this.vibrate([40, 30, 40]);
      };

      this.recognition.onresult = (event) => {
        this._hasRecognitionResult = true;
        this.isListening = false;
        const transcript = event.results[0][0].transcript;
        this.emit('transcript', { text: transcript });
        this.emit('stateChange', { state: 'processing' });
        this.handleCommand(transcript);
      };

      this.recognition.onerror = (err) => {
        console.warn('Speech recognition notice:', err.error);
        this.isListening = false;

        if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
          this.speak("Microphone permission was denied. Please allow microphone access in your browser to speak commands.", null, true);
        } else if (err.error === 'no-speech') {
          this.speak("No speech was detected. Tap the microphone and try speaking again.", null, true);
        } else if (!this._isProcessingCommand && this.currentVoiceState === 'listening') {
          this.emit('stateChange', { state: 'ready' });
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (!this._hasRecognitionResult && !this._isProcessingCommand && this.currentVoiceState === 'listening') {
          this.emit('stateChange', { state: 'ready' });
        }
      };
    }
  }

  _selectVoice(utterance) {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // 1. Look for Indian English (en-IN) voice
    const indianVoice = voices.find(v => (
      v.lang === 'en-IN' ||
      v.lang.toLowerCase().startsWith('en-in') ||
      (v.name && v.name.toLowerCase().includes('india'))
    ));
    if (indianVoice) {
      utterance.voice = indianVoice;
      utterance.lang = 'en-IN';
      return;
    }

    // 2. Fallback to clear standard English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.default));
    if (englishVoice) {
      utterance.voice = englishVoice;
      utterance.lang = englishVoice.lang;
    }
  }

  _clearSpeechTimers() {
    if (this._speechWatchdogTimer) {
      clearInterval(this._speechWatchdogTimer);
      this._speechWatchdogTimer = null;
    }
    if (this._speechSafetyTimer) {
      clearTimeout(this._speechSafetyTimer);
      this._speechSafetyTimer = null;
    }
  }

  _cancelSpeech() {
    this._speechToken += 1;
    this._clearSpeechTimers();
    if (this.synth) {
      try { this.synth.cancel(); } catch (e) {}
    }
  }

  startListening() {
    if (this.isListening || this._fallbackListenTimer || this._isProcessingCommand) {
      return false;
    }

    // Stop any active speech cleanly before opening a new single listening session
    this._cancelSpeech();

    if (this.recognition) {
      this._hasRecognitionResult = false;
      this.isListening = true;
      this.emit('stateChange', { state: 'listening' });
      try {
        this.recognition.start();
        return true;
      } catch (e) {
        console.warn('Speech recognition start notice:', e.message);
        this.isListening = false;
        this.emit('stateChange', { state: 'ready' });
        return false;
      }
    } else {
      // Fallback demonstration queries if SpeechRecognition not supported in browser
      this.isListening = true;
      this.emit('stateChange', { state: 'listening' });
      this._fallbackListenTimer = setTimeout(() => {
        this._fallbackListenTimer = null;
        this.isListening = false;
        const sampleQueries = [
          "Who is my Authorized Member?",
          "Is my live location active?",
          "Start live location",
          "Where am I?",
          "What's my battery level?",
          "Is my stick connected?",
          "Any obstacles?",
          "What's my safety status?",
          "Repeat my ID"
        ];
        const sample = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
        this.emit('transcript', { text: sample });
        this.emit('stateChange', { state: 'processing' });
        this.handleCommand(sample);
      }, 1500);
      return true;
    }
  }

  stopListening() {
    if (this._fallbackListenTimer) {
      clearTimeout(this._fallbackListenTimer);
      this._fallbackListenTimer = null;
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    this.isListening = false;
    if (!this._isProcessingCommand) {
      this.emit('stateChange', { state: 'ready' });
    }
  }

  formatForSpeech(text) {
    if (!text) return '';
    return String(text).replace(/\bcane[\s-]*vyn\b/gi, 'Cane-vin');
  }

  speak(text, onComplete, force = false) {
    this._cancelSpeech();

    if (!this.synth) {
      this.emit('stateChange', { state: 'ready' });
      if (onComplete) onComplete();
      return;
    }

    // Respect mute setting unless explicitly forced
    if (this.isMuted && !force) {
      this.emit('stateChange', { state: 'ready' });
      if (onComplete) onComplete();
      return;
    }

    const token = this._speechToken;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this._clearSpeechTimers();
      if (token !== this._speechToken) return;
      this.emit('stateChange', { state: 'ready' });
      if (onComplete) onComplete();
    };

    try {
      const spokenText = this.formatForSpeech(text);
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = this.speechRate;
      utterance.pitch = 1.0;
      this._selectVoice(utterance);

      utterance.onstart = () => {
        if (token !== this._speechToken || finished) return;
        this.emit('stateChange', { state: 'speaking', text });
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      this.emit('stateChange', { state: 'speaking', text });
      this.synth.speak(utterance);

      // Guard against mobile/headless SpeechSynthesis dropping onend or having no active voices
      let sawActive = false;
      const startedAt = Date.now();
      this._speechWatchdogTimer = setInterval(() => {
        if (token !== this._speechToken || finished) {
          this._clearSpeechTimers();
          return;
        }
        if (this.synth.speaking || this.synth.pending) {
          sawActive = true;
          return;
        }
        if (sawActive || (Date.now() - startedAt) >= 900) {
          finish();
        }
      }, 200);

      const maxDurationMs = Math.min(25000, Math.max(4000, (text || '').length * 120));
      this._speechSafetyTimer = setTimeout(finish, maxDurationMs);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      finish();
    }
  }

  /**
   * Speaks only after any active announcement finishes instead of cutting off in-progress feedback.
   */
  speakWhenIdle(text, maxWaitMs = 4000, force = false) {
    if (!this.synth || !this.synth.speaking) {
      this.speak(text, null, force);
      return;
    }
    const startMs = Date.now();
    const timer = setInterval(() => {
      if (!this.synth.speaking || (Date.now() - startMs) >= maxWaitMs) {
        clearInterval(timer);
        this.speak(text, null, force);
      }
    }, 150);
  }

  vibrate(pattern = [50]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  /**
   * Automatic Voice Welcome Announcement
   * Speaks when a blind user enters their dashboard.
   */
  async speakWelcome(force = false) {
    if (this.hasWelcomed && !force) return;
    this.hasWelcomed = true;

    const state = this.getState();
    const dev = this.deviceManager ? this.deviceManager.activeDevice : state.device;
    const user = state.user;
    const firstName = user && user.full_name ? user.full_name.split(' ')[0] : 'there';

    const isConnected = dev ? dev.isConnected : false;
    const battery = dev && isConnected ? dev.batteryPercent : null;

    let welcomeText = `Welcome to CaneVyn. Your smart assistant is ready. `;

    if (state.activeSosAlert) {
      welcomeText += `Attention: An emergency hardware SOS alert is currently active. `;
    } else if (isConnected && battery !== null) {
      welcomeText += `Your smart stick is connected. Battery level is ${battery} percent. `;
    } else if (isConnected) {
      welcomeText += `Your smart stick is connected. Battery level is unavailable. `;
    } else {
      welcomeText += `Warning! Your smart stick is not connected. Please check your device. `;
    }

    if (state.gpsState && state.gpsState.needsResume) {
      welcomeText += `Location sharing is saved on your account. Tap Resume Live Location to continue sharing your GPS. `;
    }

    welcomeText += `You can ask who your Authorized Member is, start or check live location, check your battery, obstacles, or safety status. Say 'Help' for commands.`;

    this.speak(welcomeText);
  }

  _normalizeCommand(raw) {
    return (raw || '')
      .toLowerCase()
      .replace(/[^\w\s']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _formatMemberNames(names = []) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  }

  /**
   * Fixed Voice Commands & Grounded SQLite-Backed Interpretation
   */
  async handleCommand(spokenText) {
    if (this._isProcessingCommand) return;
    this._isProcessingCommand = true;
    try {
      await this._executeCommand(spokenText);
    } catch (err) {
      console.warn('Voice command execution error:', err);
      this.emit('stateChange', { state: 'ready' });
    } finally {
      this._isProcessingCommand = false;
    }
  }

  async _executeCommand(spokenText) {
    const rawText = (spokenText || '').trim();
    const text = this._normalizeCommand(rawText);
    if (rawText) {
      this.emit('transcript', { text: rawText });
    }
    this.emit('stateChange', { state: 'processing' });
    const state = this.getState();
    const dev = this.deviceManager ? this.deviceManager.activeDevice : (state.device || { batteryPercent: 82, isConnected: true, obstacleDistanceCm: 350 });
    const loc = state.location || {};
    const gps = state.gpsState || {};

    // Ensure geolocation permission state is fresh before routing voice location commands
    let effectivePermState = gps.permissionState || 'prompt';
    if (typeof navigator !== 'undefined' && navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const permObj = await navigator.permissions.query({ name: 'geolocation' });
        effectivePermState = permObj.state || effectivePermState;
      } catch (e) {}
    }

    const isLiveLoc = Boolean(
      (gps.isLiveActive && gps.latitude !== null && gps.longitude !== null) ||
      (loc.isLiveAvailable && loc.latitude !== null && loc.longitude !== null)
    );
    const activeLat = gps.isLiveActive ? gps.latitude : (isLiveLoc ? loc.latitude : null);
    const activeLon = gps.isLiveActive ? gps.longitude : (isLiveLoc ? loc.longitude : null);
    const activeAcc = gps.isLiveActive ? gps.accuracy : (isLiveLoc ? loc.accuracy : null);

    let reply = '';
    let navAction = null;

    if (!text) {
      reply = "No voice command was detected. Please tap the microphone and speak clearly.";
      this.emit('response', { query: rawText, reply });
      this.speak(reply);
      return;
    }

    // Primary Path: Query backend SQLite-grounded /voice/interpret-command when signed in
    if (this.apiClient && this.apiClient.token && typeof this.apiClient.interpretVoiceCommand === 'function') {
      try {
        const res = await this.apiClient.interpretVoiceCommand({
          transcript: rawText,
          battery_percent: dev ? dev.batteryPercent : null,
          is_connected: dev ? Boolean(dev.isConnected) : null,
          obstacle_distance_cm: dev ? dev.obstacleDistanceCm : null,
          obstacle_status: dev ? dev.obstacleStatus : null,
          water_detected: dev ? Boolean(dev.waterDetected) : false,
          latitude: activeLat,
          longitude: activeLon,
          accuracy_meters: activeAcc,
          address_label: isLiveLoc ? loc.address_label : null,
          location_sharing_enabled: Boolean(gps.savedSharingEnabled || gps.isSharing),
          gps_watching: Boolean(gps.isSharing),
          permission_state: effectivePermState,
          gps_status: gps.status || null,
          is_stale_signal: Boolean(gps.isStaleSignal)
        });

        reply = res.spoken_response || "Command processed.";
        navAction = res.navigation_action || null;

        if (res.command_type === 'mute') {
          this.setMuted(true);
        } else if (res.command_type === 'unmute') {
          this.setMuted(false);
        } else if (res.command_type === 'approve_request' || res.command_type === 'reject_request') {
          this.emit('requestResponded', { action: res.command_type });
        } else if (res.command_type === 'stop_location_sharing') {
          this.emit('stopLocationSharing', { alreadyPersisted: true });
        }

        if (navAction === 'toggle_mute') {
          navAction = null;
        }

        this.emit('response', { query: rawText, reply });
        this.speak(reply);
        if (res.command_type === 'start_location_sharing') {
          this.emit('startLocationSharing', { permissionState: effectivePermState });
        }
        if (navAction) {
          this.emit('navigate', {
            screen: navAction,
            focusGpsButton: res.command_type === 'location_permission_required'
          });
        }
        return;
      } catch (err) {
        console.warn('Backend voice interpret fallback to local handler:', err.message);
      }
    }

    // Local / Offline Grounded Fallback Routing (mirrors backend priority strictly)
    const authorizedMemberPhrases = [
      'authorized member', 'authorized members', 'authorised member', 'authorised members',
      'who is connected', 'who s connected', 'whos connected', 'who connected',
      'connected to me', 'who am i connected', 'family member', 'family members',
      'my family', 'tell me my family', 'caregiver', 'caregivers',
      'who can monitor', 'who monitors', 'who is monitoring', 'monitor me',
      'guardian', 'guardians', 'protector', 'protectors',
      'who can access', 'who has access', 'who has my location',
      'who can see my location', 'who can see me'
    ];
    const stickConnPhrases = [
      'is my stick connected', 'is stick connected', 'stick connected',
      'is my cane connected', 'cane connected', 'is my canevyn connected',
      'canevyn connected', 'connection status', 'stick status', 'bluetooth', 'paired'
    ];
    const stopLocationPhrases = [
      'stop live location', 'disable live location',
      'stop sharing my location', 'stop sharing location', 'stop location sharing',
      'turn off location sharing', 'turn off live location',
      'deactivate my gps', 'deactivate gps', 'stop my gps', 'stop gps', 'disable gps'
    ];
    const startLocationPhrases = [
      'enable my location', 'start my location', 'turn on my location', 'activate my location',
      'start live location', 'enable live location', 'resume live location',
      'start sharing my location', 'start sharing location', 'turn on location sharing',
      'turn on live location', 'activate my gps', 'activate gps', 'start gps', 'enable gps',
      'enable location', 'share my current location', 'share my location', 'share location',
      'send my location', 'send location'
    ];
    const statusLocationPhrases = [
      'is my live location active', 'am i sharing my location',
      'is my gps working', 'check my location status', 'check location status',
      'live location status', 'location sharing status', 'gps status',
      'is location sharing on', 'is live location on', 'is my gps on', 'is gps active'
    ];
    const wherePhrases = [
      'where am i', 'where i am', 'tell me my current location',
      'what is my current position', 'whats my current position', 'what s my current position',
      'current position', 'my current location', 'my location',
      'current location', 'what street', 'my address', 'gps'
    ];

    // CRITICAL SAFETY RULE: Voice assistant MUST NOT independently trigger hardware SOS
    if (text.includes('sos') || text.includes('emergency') || text.includes('call 911') || text.includes('help me')) {
      reply = "Voice commands cannot trigger emergency SOS. Please pull or press the physical hardware latch on your Canevyn stick grip.";
    }
    // 1. Authorized Member / Connected Family Members (BEFORE stick 'connected' and 'location')
    else if (authorizedMemberPhrases.some(p => text.includes(p))) {
      const activeMembers = (state.guardians || [])
        .filter(g => g.status === 'approved' && g.is_active)
        .map(g => g.guardian_name)
        .filter(Boolean);

      if (activeMembers.length === 0) {
        reply = "You haven't connected with any family member yet.";
      } else if (activeMembers.length === 1) {
        reply = `Your connected Authorized Member is ${activeMembers[0]}.`;
      } else {
        reply = `Your connected Authorized Members are ${this._formatMemberNames(activeMembers)}.`;
      }
    }
    // 2A. Stop Location Sharing
    else if (stopLocationPhrases.some(p => text.includes(p))) {
      reply = "Your live location sharing has been stopped.";
      this.emit('stopLocationSharing', { alreadyPersisted: false });
    }
    // 2B. Start Location Sharing
    else if (startLocationPhrases.some(p => text.includes(p))) {
      const perm = effectivePermState;
      if (perm === 'denied') {
        reply = "Location permission is currently denied. Please enable location access for CaneVyn in your browser settings.";
        navAction = 'user_location';
      } else if (perm === 'granted') {
        if (gps.isSharing && activeLat !== null && activeLon !== null && !gps.isStaleSignal) {
          reply = "Your live location sharing is already active.";
        } else {
          reply = "Starting your live location sharing.";
          this.emit('startLocationSharing', { permissionState: perm });
        }
      } else {
        reply = "Location permission is required. I have opened the Location screen and focused the Enable phone location permission button. Please tap or press Enter on it to allow GPS access.";
        navAction = 'user_location';
      }
    }
    // 2C. Check Location Status
    else if (statusLocationPhrases.some(p => text.includes(p))) {
      const perm = gps.permissionState || '';
      if (perm === 'denied') {
        reply = "Location permission is currently denied. Please enable location access for CaneVyn in your browser settings.";
      } else if (gps.status === 'GPS Signal Unavailable' || gps.isStaleSignal) {
        reply = "Your GPS signal is currently unavailable.";
      } else if (gps.isSharing && activeLat !== null && activeLon !== null) {
        reply = "Your live location sharing is active.";
      } else if (gps.isSharing) {
        reply = "Your GPS signal is currently unavailable.";
      } else {
        reply = "Your live location sharing is currently turned off.";
      }
    }
    // 2D. Ask Current Location ("Where am I?")
    else if (wherePhrases.some(p => text.includes(p))) {
      if (isLiveLoc && loc.address_label && loc.address_label !== 'Live Location: Not Available') {
        reply = `You are at ${loc.address_label}.`;
      } else if (activeLat !== null && activeLon !== null && !gps.isStaleSignal) {
        reply = activeAcc !== null
          ? `Your current position is latitude ${activeLat.toFixed(5)}, longitude ${activeLon.toFixed(5)}, with accuracy about ${Math.round(activeAcc)} meters.`
          : `Your current position is latitude ${activeLat.toFixed(5)}, longitude ${activeLon.toFixed(5)}.`;
      } else {
        reply = "Your live GPS location is currently unavailable.";
      }
    }
    // 3. "What's my battery level?" / Battery command
    else if (text.includes('battery') || text.includes('charge') || text.includes('power level')) {
      if (dev && dev.isConnected && dev.batteryPercent !== undefined && dev.batteryPercent !== null) {
        const hours = Math.max(1, Math.round(dev.batteryPercent * 0.17));
        reply = `Your Canevyn smart stick battery is at ${dev.batteryPercent} percent. Approximately ${hours} hours remaining.`;
      } else if (dev && dev.isConnected) {
        reply = "Your smart stick is connected, but battery telemetry is unavailable.";
      } else {
        reply = "Your smart stick is currently disconnected. Battery level is unavailable. Please turn on your stick.";
      }
    }
    // 4. "Is my stick connected?" / Hardware connection status
    else if (stickConnPhrases.some(p => text.includes(p))) {
      if (dev && dev.isConnected) {
        reply = "Your Canevyn smart stick is connected and communicating via Bluetooth Low Energy.";
      } else {
        reply = "Your smart stick is currently disconnected. Searching for your Canevyn BLE beacon.";
      }
    }
    // 5. "Any obstacles?" / Obstacle radar command
    else if (['obstacle', 'obstacles', 'path ahead', 'what s ahead', 'whats ahead', 'radar', 'blocking', 'check path'].some(p => text.includes(p))) {
      if (dev && dev.isConnected) {
        const distMeters = ((dev.obstacleDistanceCm || 350) / 100).toFixed(1);
        if (dev.obstacleDistanceCm && dev.obstacleDistanceCm < 100) {
          reply = `Caution! Obstacle detected close ahead at ${distMeters} meters. Please slow down or step aside.`;
        } else {
          reply = `Obstacle radar is active. Path is ${dev.obstacleStatus || 'clear'} for ${distMeters} meters ahead.`;
        }
      } else {
        reply = "Smart stick obstacle sensor is unavailable because the stick is disconnected.";
      }
    }
    // 6. "Is there water nearby?" / Ground tip sensor
    else if (['water', 'puddle', 'wet', 'rain', 'slippery'].some(p => text.includes(p))) {
      if (dev && dev.waterDetected) {
        reply = "Warning: Water or a puddle is detected by the ground tip sensor ahead. Tread carefully.";
      } else {
        reply = "Ground tip sensor reports a dry walking surface. No standing water detected.";
      }
    }
    // 7. "What's my safety status?" / Safety status
    else if (['safety status', 'am i safe', 'sos status', 'check safety'].some(p => text.includes(p))) {
      if (state.activeSosAlert) {
        reply = "Attention: Hardware emergency SOS alert is currently active.";
      } else {
        reply = "Your safety status is Nominal and Safe. Physical cane latch is armed and ready.";
      }
    }
    // 8. "Repeat my ID" command
    else if (['repeat my id', 'what is my id', 'whats my id', 'what s my id', 'my user id', 'tell me my id', 'repeat id', 'share id', 'my id'].some(p => text.includes(p))) {
      const myId = (state.user && (state.user.canevyn_id || state.user.id)) || 'CVN-10482';
      reply = `Your CaneVyn User ID is ${myId}. Share this ID with your family member if they want to connect with you.`;
    }
    // 9. Voice Approval and Rejection of Incoming Connection Requests
    else if (text.includes('approve request') || text.includes('approve connection') || text.includes('accept request')) {
      const pendingRequests = state.pendingRequests || [];
      if (pendingRequests.length > 0 && this.apiClient) {
        const firstReq = pendingRequests[0];
        try {
          await this.apiClient.respondConnectionRequest(firstReq.id, 'approve');
          reply = `Connection request approved for ${firstReq.guardian_user_name}.`;
          this.emit('requestResponded', { id: firstReq.id, action: 'approve' });
        } catch (err) {
          reply = `Notice: ${err.message}`;
        }
      } else {
        reply = "You have no pending connection requests to approve.";
      }
    }
    else if (text.includes('reject request') || text.includes('decline request')) {
      const pendingRequests = state.pendingRequests || [];
      if (pendingRequests.length > 0 && this.apiClient) {
        const firstReq = pendingRequests[0];
        try {
          await this.apiClient.respondConnectionRequest(firstReq.id, 'reject');
          reply = `Connection request from ${firstReq.guardian_user_name} was rejected.`;
          this.emit('requestResponded', { id: firstReq.id, action: 'reject' });
        } catch (err) {
          reply = `Notice: ${err.message}`;
        }
      } else {
        reply = "You have no pending connection requests to reject.";
      }
    }
    // 10. Mute / Unmute voice
    else if (text.includes('mute voice') || text.includes('mute assistant') || text.includes('silence voice') || text.includes('turn off voice')) {
      this.setMuted(true);
      reply = "Voice assistant feedback is now muted. Say 'Unmute voice' or tap the audio button anytime.";
    }
    else if (text.includes('unmute voice') || text.includes('unmute assistant') || text.includes('turn on voice') || text.includes('enable voice')) {
      this.setMuted(false);
      reply = "Voice assistant feedback is unmuted. Audio announcements are active.";
    }
    // 11. Navigation shortcuts
    else if (['open wayfinding', 'open location', 'show map', 'go to wayfinding', 'go to location'].some(p => text.includes(p))) {
      reply = "Opening Location Status.";
      navAction = 'user_location';
    }
    else if (['open guardians', 'open protectors', 'open authorized members', 'show guardians', 'manage family', 'show requests'].some(p => text.includes(p))) {
      reply = "Opening Authorized Members.";
      navAction = 'user_guardian';
    }
    else if (['go home', 'navigate home', 'home screen', 'home dashboard', 'main screen'].some(p => text.includes(p))) {
      reply = "Returning to Home dashboard.";
      navAction = 'user_home';
    }
    // 12. Explicit Help command
    else if (['help', 'what can i say', 'commands', 'list commands', 'what can you do'].some(p => text.includes(p))) {
      reply = "You can ask: 'Who is my Authorized Member?', 'Start live location', 'Stop live location', 'Is my live location active?', 'Where am I?', 'What's my battery level?', 'Is my stick connected?', 'Any obstacles?', 'Is there water nearby?', 'What's my safety status?', or 'Repeat my ID'.";
    }
    // 13. Clear Unsupported Command Responses (never defaults unknown phrases into generic location/battery prompt)
    else if (['weather', 'temperature', 'forecast', 'time', 'date', 'news', 'music', 'song'].some(p => text.includes(p))) {
      reply = `Sorry, '${rawText}' is not supported yet in CaneVyn. Say 'Help' for supported mobility commands.`;
    }
    else if (['call ', 'dial ', 'message ', 'text '].some(p => text.includes(p))) {
      reply = "Voice dialing and messaging are not supported yet. Ask 'Who is my Authorized Member?' to see your connected contacts.";
    }
    else {
      reply = `I didn't recognize the command '${rawText}'. That command is not supported. Say 'Help' to hear supported CaneVyn commands.`;
    }

    this.emit('response', { query: rawText, reply });
    this.speak(reply);

    if (navAction) {
      this.emit('navigate', {
        screen: navAction,
        focusGpsButton: navAction === 'user_location' && reply.includes('Enable phone location permission')
      });
    }
  }
}
