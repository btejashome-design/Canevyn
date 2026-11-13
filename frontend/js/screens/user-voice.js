/**
 * Canevyn Voice Assistant Experience Screen
 * Visual source of truth: user_voice_assistant_experience
 * Strict rule: Voice commands MUST NOT trigger hardware SOS.
 */

export function renderUserVoiceScreen({ voiceState = 'ready', transcript = '', response = '', device = null, location = null }) {
  const isListening = voiceState === 'listening';
  const isProcessing = voiceState === 'processing';
  const isSpeaking = voiceState === 'speaking';
  const isReady = voiceState === 'ready';

  const userQuery = transcript || '“Who is my Authorized Member?”';
  const assistantReply = response || 'Tap a quick command below or press Hold or Tap to Speak to ask about your connected Authorized Members, smart stick battery, obstacles, or CaneVyn ID.';
  const isLiveLocation = Boolean(location && location.isLiveAvailable && location.latitude !== null && location.longitude !== null);
  const locBadgeText = isLiveLocation ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Live Location: Not Available';
  const batteryText = device ? `${device.isConnected ? `Stick ${device.batteryPercent}% Active` : 'Stick Disconnected'}` : 'Telemetry Ready';

  // State styling helper for the 4 demo tabs
  const getTabClass = (tabState) => {
    return voiceState === tabState
      ? 'bg-primary-container text-on-primary-container shadow-md'
      : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest';
  };

  return `
    <main class="flex-1 flex flex-col relative w-full pt-20 pb-28 bg-surface">
      <div class="flex flex-col w-full px-4 space-y-5 pb-6 max-w-lg mx-auto">

        <!-- Voice Header & Status Bar -->
        <div class="w-full flex items-center justify-between rounded-xl bg-surface-container-high px-4 py-3 shadow-md border border-surface-container-highest">
          <button aria-label="Dismiss Voice Assistant" class="min-h-[56px] min-w-[56px] flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-highest text-on-surface focus:outline-none" id="closeAssistantBtn">
            <span class="material-symbols-outlined text-[28px]">arrow_back</span>
          </button>
          <div class="flex flex-col items-center text-center">
            <span class="font-headline-md text-headline-md text-primary font-bold">Voice Assistant</span>
            <span class="font-label-md text-label-md text-secondary flex items-center gap-1.5 text-[13px]">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
              Spatial Audio Enabled
            </span>
          </div>
          <div aria-label="Speech Output Level 85%" class="min-h-[56px] px-3.5 flex items-center gap-1.5 rounded-lg bg-surface-container text-primary-container border border-surface-container-high">
            <span class="material-symbols-outlined text-[24px]">volume_up</span>
            <span class="font-label-md text-label-md font-bold text-on-surface">85%</span>
          </div>
        </div>

        <!-- State Simulation / Control Selector -->
        <div class="w-full flex flex-col space-y-2 rounded-xl bg-surface-container-low p-3 shadow-sm border border-surface-container-high">
          <label class="font-label-md text-label-md text-on-surface-variant flex items-center gap-2 text-[13px]">
            <span class="material-symbols-outlined text-[20px] text-primary">touch_app</span>
            Voice Engine Stages:
          </label>
          <div class="grid grid-cols-2 gap-2" role="tablist">
            <button class="state-btn min-h-[56px] rounded-lg px-3 py-2 text-left font-label-md text-label-md font-bold transition-colors focus:outline-none ${getTabClass('ready')}" id="btnStateReady" data-state="ready">
              1. Ready to Listen
            </button>
            <button class="state-btn min-h-[56px] rounded-lg px-3 py-2 text-left font-label-md text-label-md font-bold transition-colors focus:outline-none ${getTabClass('listening')}" id="btnStateListening" data-state="listening">
              2. Listening...
            </button>
            <button class="state-btn min-h-[56px] rounded-lg px-3 py-2 text-left font-label-md text-label-md font-bold transition-colors focus:outline-none ${getTabClass('processing')}" id="btnStateProcessing" data-state="processing">
              3. Processing
            </button>
            <button class="state-btn min-h-[56px] rounded-lg px-3 py-2 text-left font-label-md text-label-md font-bold transition-colors focus:outline-none ${getTabClass('speaking')}" id="btnStateSpeaking" data-state="speaking">
              4. Speaking Response
            </button>
          </div>
        </div>

        <!-- Dynamic Voice Orb & Audio Waveform Visualizer -->
        <div class="w-full relative flex flex-col items-center justify-center p-8 rounded-xl bg-surface-container-lowest overflow-hidden shadow-inner min-h-[260px] border border-surface-container-high">
          <!-- Ambient back-glow ripples -->
          <div class="absolute w-56 h-56 rounded-full bg-primary-container/10 blur-xl transition-transform duration-700 ${isListening || isSpeaking ? 'scale-125' : 'scale-100'}" id="orbRingOuter"></div>
          <div class="absolute w-44 h-44 rounded-full bg-secondary/15 blur-lg transition-transform duration-500 ${isListening || isSpeaking ? 'scale-110' : 'scale-95'}" id="orbRingMid"></div>
          
          <!-- Central SVG Pulsing Orb & Dynamic Waveform (Tap to Listen/Stop) -->
          <div id="voiceOrbMicBtn" role="button" tabindex="0" aria-label="${isListening ? 'Listening. Tap to stop microphone' : 'Tap microphone orb to speak a voice command'}" class="relative z-10 flex flex-col items-center justify-center cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-primary-container active:scale-95 transition-transform">
            <svg aria-hidden="true" class="w-36 h-36" fill="none" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
              <circle class="text-primary/20" cx="80" cy="80" id="orbWaveBase" r="70" stroke="currentColor" stroke-dasharray="6 6" stroke-width="3"></circle>
              <circle class="text-surface-container-highest transition-colors duration-300" cx="80" cy="80" fill="currentColor" id="orbCoreGlow" r="50"></circle>
              
              <!-- Frequency bars / acoustic signature -->
              <g class="transform -translate-y-1" id="waveBars">
                <line class="text-secondary" stroke="currentColor" stroke-linecap="round" stroke-width="4" x1="50" x2="50" y1="${isSpeaking || isListening ? 45 : 70}" y2="${isSpeaking || isListening ? 115 : 90}"></line>
                <line class="text-primary" stroke="currentColor" stroke-linecap="round" stroke-width="4" x1="62" x2="62" y1="${isSpeaking || isListening ? 55 : 68}" y2="${isSpeaking || isListening ? 105 : 92}"></line>
                <line class="text-primary-container" stroke="currentColor" stroke-linecap="round" stroke-width="5" x1="74" x2="74" y1="${isSpeaking || isListening ? 40 : 65}" y2="${isSpeaking || isListening ? 120 : 95}"></line>
                <line class="text-secondary" stroke="currentColor" stroke-linecap="round" stroke-width="5" x1="86" x2="86" y1="${isSpeaking || isListening ? 42 : 65}" y2="${isSpeaking || isListening ? 118 : 95}"></line>
                <line class="text-primary" stroke="currentColor" stroke-linecap="round" stroke-width="4" x1="98" x2="98" y1="${isSpeaking || isListening ? 52 : 68}" y2="${isSpeaking || isListening ? 108 : 92}"></line>
                <line class="text-secondary" stroke="currentColor" stroke-linecap="round" stroke-width="4" x1="110" x2="110" y1="${isSpeaking || isListening ? 58 : 70}" y2="${isSpeaking || isListening ? 102 : 90}"></line>
              </g>
              <circle class="text-surface-container-high" cx="80" cy="80" fill="currentColor" r="28"></circle>
            </svg>
            <span class="material-symbols-outlined absolute text-[32px] text-primary select-none pointer-events-none" id="centerIcon">
              ${isListening ? 'graphic_eq' : isProcessing ? 'sync' : isSpeaking ? 'volume_up' : 'mic'}
            </span>
          </div>

          <!-- Live Status Pill Label -->
          <div class="relative z-10 mt-5 px-4 py-2 rounded-full bg-surface-container-high text-primary font-label-md text-label-md flex items-center gap-2 border border-surface-container-highest" id="orbStateBadge">
            <span class="w-2.5 h-2.5 rounded-full ${isListening ? 'bg-error animate-ping' : isProcessing ? 'bg-secondary animate-spin' : isSpeaking ? 'bg-secondary animate-pulse' : 'bg-primary-container'}" id="orbStateDot"></span>
            <span id="orbStateText">
              ${isListening ? 'Listening to voice...' : isProcessing ? 'Processing request...' : isSpeaking ? 'Assistant Speaking Feedback' : 'Ready to Listen'}
            </span>
          </div>
        </div>

        <!-- Live Transcribed Dialogue Cards -->
        <div class="space-y-4">
          <!-- User Speech Card -->
          <div class="w-full rounded-xl bg-surface-container p-4 shadow-sm border border-surface-container-high" id="userSpeechBubble">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center text-on-surface">
                <span class="material-symbols-outlined text-[18px]">record_voice_over</span>
              </span>
              <span class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-[13px]">You Asked</span>
            </div>
            <p class="font-body-lg text-body-lg text-on-surface font-semibold pl-10" id="userTranscriptText">
              ${userQuery}
            </p>
          </div>

          <!-- Canevyn Spoken Response Card -->
          <div class="w-full rounded-xl bg-surface-container-high p-4 space-y-4 shadow-md border-l-4 border-primary-container border-y border-r border-surface-container-highest" id="canevynResponseCard">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold">
                  <span class="material-symbols-outlined text-[20px]">smart_toy</span>
                </div>
                <span class="font-headline-md text-headline-md text-primary font-bold">Canevyn Audio</span>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-surface-container text-secondary font-label-md text-label-md flex items-center gap-1 font-bold">
                <span class="material-symbols-outlined text-[16px]">sensors</span>
                Nominal
              </span>
            </div>
            <!-- Spoken response narrative -->
            <div class="rounded-lg bg-surface-container-lowest p-3.5 border border-surface-container-high">
              <p class="font-body-xl text-body-xl text-on-background font-normal leading-relaxed" id="canevynSpokenText">
                ${assistantReply}
              </p>
            </div>
            <!-- Key Insights Summary Badges -->
            <div class="grid grid-cols-2 gap-2 pt-1">
              <div class="rounded-lg bg-surface-container p-3 flex items-center gap-2 border border-surface-container-high">
                <span class="material-symbols-outlined ${isLiveLocation ? 'text-secondary' : 'text-outline'} text-[24px]">${isLiveLocation ? 'pin_drop' : 'location_off'}</span>
                <div class="min-w-0">
                  <p class="font-label-md text-label-md text-on-surface-variant text-xs truncate">Location</p>
                  <p class="font-body-md text-body-md text-on-surface font-bold truncate" id="voiceLocationBadgeText">${locBadgeText}</p>
                </div>
              </div>
              <div class="rounded-lg bg-surface-container p-3 flex items-center gap-2 border border-surface-container-high">
                <span class="material-symbols-outlined text-secondary text-[24px]">battery_charging_80</span>
                <div class="min-w-0">
                  <p class="font-label-md text-label-md text-on-surface-variant text-xs truncate">Telemetry</p>
                  <p class="font-body-md text-body-md text-on-surface font-bold truncate">${batteryText}</p>
                </div>
              </div>
            </div>
            <!-- High Contrast Accessible Audio Replay Button -->
            <button aria-label="Replay current voice response in clear audio" class="w-full min-h-[64px] rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface flex items-center justify-center gap-3 px-4 shadow focus:outline-none transition-colors" id="replaySpeechBtn">
              <span class="material-symbols-outlined text-[28px] text-primary-container">replay</span>
              <span class="font-label-lg text-label-lg font-bold">Re-play Voice Response</span>
            </button>
          </div>
        </div>

        <!-- Quick Verbal Prompt Chips -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <h3 class="font-label-lg text-label-lg text-on-surface-variant font-bold">Quick Verbal Prompts</h3>
            <span class="font-label-md text-label-md text-secondary">Tap or Speak</span>
          </div>
          <div class="flex flex-col space-y-2">
            <button class="voice-chip-btn w-full min-h-[56px] text-left px-4 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-between shadow-sm border border-surface-container-highest transition-colors" data-cmd="Who is my Authorized Member?">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-[24px] text-secondary">shield_person</span>
                <span class="font-label-lg text-label-lg font-bold">“Who is my Authorized Member?”</span>
              </div>
              <span class="material-symbols-outlined text-[22px] text-on-surface-variant">arrow_forward</span>
            </button>
            <button class="voice-chip-btn w-full min-h-[56px] text-left px-4 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-between shadow-sm border border-surface-container-highest transition-colors" data-cmd="Repeat my ID">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-[24px] text-primary">badge</span>
                <span class="font-label-lg text-label-lg font-bold">“Repeat my ID”</span>
              </div>
              <span class="material-symbols-outlined text-[22px] text-on-surface-variant">arrow_forward</span>
            </button>
            <button class="voice-chip-btn w-full min-h-[56px] text-left px-4 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-between shadow-sm border border-surface-container-highest transition-colors" data-cmd="Where am I?">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-[24px] text-primary">my_location</span>
                <span class="font-label-lg text-label-lg font-bold">“Where am I?”</span>
              </div>
              <span class="material-symbols-outlined text-[22px] text-on-surface-variant">arrow_forward</span>
            </button>
            <button class="voice-chip-btn w-full min-h-[56px] text-left px-4 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-between shadow-sm border border-surface-container-highest transition-colors" data-cmd="What's my battery level?">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-[24px] text-secondary">battery_full</span>
                <span class="font-label-lg text-label-lg font-bold">“What's my battery level?”</span>
              </div>
              <span class="material-symbols-outlined text-[22px] text-on-surface-variant">arrow_forward</span>
            </button>
            <button class="voice-chip-btn w-full min-h-[56px] text-left px-4 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-between shadow-sm border border-surface-container-highest transition-colors" data-cmd="Is my stick connected?">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-[24px] text-primary-container">bluetooth</span>
                <span class="font-label-lg text-label-lg font-bold">“Is my stick connected?”</span>
              </div>
              <span class="material-symbols-outlined text-[22px] text-on-surface-variant">arrow_forward</span>
            </button>
            <button class="voice-chip-btn w-full min-h-[56px] text-left px-4 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-between shadow-sm border border-surface-container-highest transition-colors" data-cmd="Any obstacles?">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-[24px] text-secondary">radar</span>
                <span class="font-label-lg text-label-lg font-bold">“Any obstacles?”</span>
              </div>
              <span class="material-symbols-outlined text-[22px] text-on-surface-variant">arrow_forward</span>
            </button>
          </div>
        </div>

        <!-- Fallback / Soft retry alert banner -->
        <div class="w-full rounded-xl bg-surface-container-low p-4 flex items-center gap-3.5 shadow-sm border border-surface-container-high">
          <div class="w-10 h-10 rounded-full bg-surface-container-highest text-primary-container flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[24px]">info</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-label-md text-label-md text-on-surface font-bold">Didn't catch that?</p>
            <p class="font-body-md text-body-md text-on-surface-variant text-[14px]">Tap once below or hold the Canevyn grip button to speak clearly.</p>
          </div>
        </div>

        <!-- Primary Voice Interaction Trigger Button (72px Accessible) -->
        <div class="w-full pt-1">
          <button aria-label="Hold or tap to speak instructions to Canevyn" class="w-full min-h-[72px] rounded-xl bg-primary-container hover:bg-primary-fixed text-on-primary-container flex items-center justify-between px-6 shadow-xl transition-transform active:scale-[0.98] focus:outline-none" id="primaryPushToTalk">
            <div class="flex items-center gap-4">
              <span class="material-symbols-outlined text-[34px]">${isListening ? 'stop_circle' : 'mic'}</span>
              <div class="text-left">
                <span class="font-headline-md text-headline-md font-bold block leading-tight">
                  ${isListening ? 'Listening... Tap to Stop' : 'Hold or Tap to Speak'}
                </span>
                <span class="font-label-md text-label-md opacity-90 block">Or trigger via cane grip button</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-[32px]">arrow_forward</span>
          </button>
        </div>

      </div>
    </main>
  `;
}
