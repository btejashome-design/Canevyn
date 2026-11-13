/**
 * Canevyn Blind User Settings & Accessibility Screen
 * Displays strictly authenticated profile data, real SQLite Authorized Members,
 * functional voice/accessibility controls, honest ESP32 preference placeholders,
 * and genuine smart stick connection status without fabricated data.
 */

const SENSITIVITY_RANGE_LABELS = {
  Low: '1.5m',
  Medium: '2.5m',
  High: '4.0m'
};

export function renderUserSettingsScreen({
  user = null,
  device = null,
  guardians = [],
  gpsState = {},
  speechRate = 1.0,
  voiceFeedbackEnabled = true,
  sensitivity = 'High',
  vibrationIntensity = 'Strong',
  audioAlertsEnabled = true
}) {
  const profileName = (user && user.full_name) ? user.full_name : 'CaneVyn User';
  const profileId = (user && (user.canevyn_id || user.id)) ? (user.canevyn_id || user.id) : 'Assigning ID...';
  const rangeLabel = SENSITIVITY_RANGE_LABELS[sensitivity] || '4.0m';

  // Strict filtering: ONLY approved AND active relationships count as connected Authorized Members
  const activeMembers = (guardians || []).filter(g => g.status === 'approved' && Boolean(g.is_active));
  const pendingMembers = (guardians || []).filter(g => g.status === 'pending');

  // Strict hardware presence check: never display hardcoded or unverified stick details
  const dev = device || {};
  const hasHardware = Boolean(dev.isHardwareIntegrated || dev.is_hardware_integrated || dev.isConnected || dev.is_connected);
  const isHardwareConnected = hasHardware && Boolean(dev.isConnected || dev.is_connected);
  const deviceName = dev.model || null;
  const deviceSerial = dev.serialNumber || dev.serial_number || null;
  const deviceFirmware = dev.firmware || dev.firmware_version || null;
  const rawBattery = (dev.batteryPercent !== null && dev.batteryPercent !== undefined)
    ? dev.batteryPercent
    : ((dev.battery_percent !== null && dev.battery_percent !== undefined) ? dev.battery_percent : null);
  const batteryText = hasHardware && rawBattery !== null ? `${rawBattery}%` : null;

  // Real phone GPS sharing status summary
  const isGpsLive = Boolean(gpsState && gpsState.isLiveActive);
  const gpsPermDenied = Boolean(gpsState && gpsState.permissionState === 'denied');
  let locationSummaryText = 'Location Sharing: Turned Off';
  let locationBadgeText = 'Off';
  let locationBadgeClass = 'bg-surface-container-highest text-on-surface-variant';
  if (gpsPermDenied) {
    locationSummaryText = 'Browser location permission denied';
    locationBadgeText = 'Blocked';
    locationBadgeClass = 'bg-error-container text-on-error-container';
  } else if (isGpsLive) {
    locationSummaryText = (gpsState.latitude !== null && gpsState.longitude !== null)
      ? `Active (${gpsState.latitude.toFixed(4)}, ${gpsState.longitude.toFixed(4)})`
      : 'Live GPS active';
    locationBadgeText = 'Active';
    locationBadgeClass = 'bg-secondary/20 text-secondary border border-secondary/30';
  } else if (gpsState && gpsState.isSharing) {
    locationSummaryText = gpsState.status || 'Searching for GPS fix...';
    locationBadgeText = 'Searching';
    locationBadgeClass = 'bg-primary-container/20 text-primary';
  }

  return `
    <main class="flex-1 flex flex-col relative w-full pt-20 pb-28 bg-surface">
      <div class="flex flex-col w-full px-4 space-y-6 max-w-lg mx-auto">

        <!-- 1. User Profile & Preferences -->
        <section aria-labelledby="settings-heading" class="bg-surface-container-low rounded-xl p-5 shadow-lg relative overflow-hidden border border-surface-container-high">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-md">
              <span class="material-symbols-outlined text-[36px]" style="font-variation-settings: 'FILL' 1;">account_circle</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-label-md text-label-md text-primary tracking-wider uppercase">User Profile & Preferences</p>
              <h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface truncate font-bold" id="settings-heading">${profileName}</h1>
              <div class="flex items-center gap-2 mt-1">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-highest text-secondary font-label-md text-label-md font-bold text-[12px]">
                  <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                  Voice-First Assisted Mode
                </span>
              </div>
            </div>
          </div>

          <!-- Actual CaneVyn User ID Display Card -->
          <div class="mt-3 p-3 rounded-xl bg-surface-container flex items-center justify-between border border-secondary/30">
            <div class="min-w-0">
              <span class="text-xs uppercase font-bold text-secondary flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px]">badge</span>
                <span>CaneVyn User ID</span>
              </span>
              <span id="settingsUserIdText" class="font-mono text-base text-on-surface font-bold select-all">${profileId}</span>
            </div>
            <button id="btnCopySettingsId" type="button" class="min-h-[40px] px-3.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs font-bold text-on-surface flex items-center gap-1 transition-colors shrink-0">
              <span class="material-symbols-outlined text-[16px]">content_copy</span>
              <span>Copy ID</span>
            </button>
          </div>

          <!-- Read Overview Aloud -->
          <div class="mt-4 bg-surface-container rounded-lg p-3.5 flex items-center justify-between gap-3 border border-surface-container-high">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="material-symbols-outlined text-primary-container text-[24px]">hearing</span>
              <p class="font-body-md text-body-md text-on-surface truncate">Read Settings Summary</p>
            </div>
            <button aria-label="Read settings summary out loud" class="min-h-[48px] px-4 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1.5 active:scale-95 transition-transform shrink-0 font-bold" id="narrateSettingsBtn" type="button">
              <span class="material-symbols-outlined text-[20px]">volume_up</span>
              <span>Listen</span>
            </button>
          </div>
        </section>

        <!-- 2. Accessibility & Voice -->
        <section aria-labelledby="sec1-title" class="space-y-3">
          <div class="flex items-center gap-2 px-1">
            <span class="material-symbols-outlined text-primary-container text-[26px]">record_voice_over</span>
            <h2 class="font-headline-md text-headline-md text-on-surface font-bold" id="sec1-title">Accessibility & Voice</h2>
          </div>

          <div class="bg-surface-container-low rounded-xl p-2 space-y-2 shadow-sm border border-surface-container-high">
            <!-- Voice Feedback Toggle -->
            <div class="bg-surface-container p-4 rounded-lg min-h-[72px] flex items-center justify-between gap-3 border border-surface-container-high">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[26px]">${voiceFeedbackEnabled ? 'volume_up' : 'volume_off'}</span>
                </div>
                <div class="min-w-0">
                  <p class="font-headline-md text-headline-md text-on-surface font-bold text-[17px]">Voice Feedback</p>
                  <p class="font-body-md text-body-md text-on-surface-variant text-[14px]">${voiceFeedbackEnabled ? 'Spoken guidance active' : 'Voice responses muted'}</p>
                </div>
              </div>
              <button
                id="toggleVoiceFeedbackBtn"
                type="button"
                role="switch"
                aria-checked="${voiceFeedbackEnabled ? 'true' : 'false'}"
                aria-label="Toggle voice feedback"
                class="relative w-16 h-10 rounded-full ${voiceFeedbackEnabled ? 'bg-secondary-container' : 'bg-surface-container-highest'} transition-colors duration-200 shrink-0 focus:outline-none p-1 flex items-center"
              >
                <span class="${voiceFeedbackEnabled ? 'translate-x-6 bg-on-secondary' : 'translate-x-0 bg-on-surface-variant'} w-8 h-8 rounded-full shadow-md block transition-transform duration-200"></span>
              </button>
            </div>

            <!-- Speech Speed Adjustment + Reset -->
            <div class="bg-surface-container p-4 rounded-lg min-h-[72px] flex flex-col justify-center space-y-3 border border-surface-container-high">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[26px]">speed</span>
                  </div>
                  <div>
                    <p class="font-headline-md text-headline-md text-on-surface font-bold text-[17px]">Speech Speed</p>
                    <p class="font-body-md text-body-md text-on-surface-variant text-[14px]">Voice assistant playback rate</p>
                  </div>
                </div>
                <span class="font-telemetry-num text-telemetry-num text-primary-container px-2 font-extrabold text-[24px]" id="rateDisplay">${speechRate.toFixed(1)}x</span>
              </div>
              <div class="flex items-center gap-2 pt-1">
                <button aria-label="Decrease voice speed" class="min-h-[52px] flex-1 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest active:bg-surface-bright flex items-center justify-center gap-1 font-label-lg text-label-lg font-bold" id="rateDecreaseBtn" type="button">
                  <span class="material-symbols-outlined text-[22px]">remove</span>
                  <span>Slower</span>
                </button>
                <button aria-label="Reset voice speed to normal 1.0" class="min-h-[52px] px-5 rounded-lg bg-surface-container-highest text-primary font-label-md text-label-md font-bold active:scale-95" id="rateResetBtn" type="button">
                  Reset
                </button>
                <button aria-label="Increase voice speed" class="min-h-[52px] flex-1 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest active:bg-surface-bright flex items-center justify-center gap-1 font-label-lg text-label-lg font-bold" id="rateIncreaseBtn" type="button">
                  <span class="material-symbols-outlined text-[22px]">add</span>
                  <span>Faster</span>
                </button>
              </div>
            </div>

            <!-- Voice Guidance & Tutorial -->
            <button id="btnVoiceGuidanceTutorial" type="button" class="w-full bg-surface-container p-4 rounded-lg min-h-[68px] flex items-center justify-between gap-3 border border-surface-container-high hover:bg-surface-container-high transition-colors text-left">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[26px]">assistant</span>
                </div>
                <div class="min-w-0">
                  <p class="font-headline-md text-headline-md text-on-surface font-bold text-[17px]">Voice Guidance Tutorial</p>
                  <p class="font-body-md text-body-md text-on-surface-variant text-[14px]">Hear available CaneVyn voice commands</p>
                </div>
              </div>
              <span class="material-symbols-outlined text-secondary text-[24px] shrink-0">play_circle</span>
            </button>
          </div>
        </section>

        <!-- 3. Obstacle Detection (Saved Preferences for Future ESP32) -->
        <section aria-labelledby="sec-obstacle-title" class="space-y-3">
          <div class="flex items-center justify-between gap-2 px-1">
            <div class="flex items-center gap-2 min-w-0">
              <span class="material-symbols-outlined text-secondary text-[26px]">radar</span>
              <h2 class="font-headline-md text-headline-md text-on-surface font-bold" id="sec-obstacle-title">Obstacle Detection</h2>
            </div>
            <span class="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-bold shrink-0">ESP32 Pending</span>
          </div>

          <div class="bg-surface-container-low rounded-xl p-2 space-y-2 shadow-sm border border-surface-container-high">
            <div class="bg-surface-container p-4 rounded-lg flex flex-col justify-between space-y-3 border border-surface-container-high">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-headline-md text-headline-md text-on-surface font-bold text-[17px]">Obstacle Sensitivity & Range</p>
                  <p class="font-body-md text-body-md text-on-surface-variant text-[13px]">Preferred warning threshold for ESP32 sensors</p>
                </div>
                <span id="sensitivityRangeBadge" class="px-3 py-1 rounded-full bg-surface-container-highest text-secondary font-label-md text-label-md shrink-0 font-bold">${sensitivity} (${rangeLabel})</span>
              </div>

              <div aria-label="Obstacle Warning Range" class="grid grid-cols-3 gap-2" role="radiogroup">
                <button aria-checked="${sensitivity === 'Low' ? 'true' : 'false'}" class="opt-sens-btn min-h-[52px] rounded-lg ${sensitivity === 'Low' ? 'bg-primary-container text-on-primary font-bold shadow-md' : 'bg-surface-container-high text-on-surface-variant'} font-label-md text-label-md flex flex-col items-center justify-center" data-val="Low" role="radio" type="button">
                  <span>Low</span>
                  <span class="text-[12px] opacity-80">1.5m</span>
                </button>
                <button aria-checked="${sensitivity === 'Medium' ? 'true' : 'false'}" class="opt-sens-btn min-h-[52px] rounded-lg ${sensitivity === 'Medium' ? 'bg-primary-container text-on-primary font-bold shadow-md' : 'bg-surface-container-high text-on-surface-variant'} font-label-md text-label-md flex flex-col items-center justify-center" data-val="Medium" role="radio" type="button">
                  <span>Medium</span>
                  <span class="text-[12px] opacity-80">2.5m</span>
                </button>
                <button aria-checked="${sensitivity === 'High' ? 'true' : 'false'}" class="opt-sens-btn min-h-[52px] rounded-lg ${sensitivity === 'High' ? 'bg-primary-container text-on-primary font-bold shadow-md' : 'bg-surface-container-high text-on-surface-variant'} font-label-md text-label-md flex flex-col items-center justify-center" data-val="High" role="radio" type="button">
                  <span>High</span>
                  <span class="text-[12px] opacity-80">4.0m</span>
                </button>
              </div>

              <p class="text-[11px] text-on-surface-variant leading-relaxed">
                Saved preference only. Will sync with physical ultrasonic and ToF sensors once ESP32 hardware is integrated.
              </p>
            </div>
          </div>
        </section>

        <!-- 4. Vibration & Alert Settings -->
        <section aria-labelledby="sec-alerts-title" class="space-y-3">
          <div class="flex items-center justify-between gap-2 px-1">
            <div class="flex items-center gap-2 min-w-0">
              <span class="material-symbols-outlined text-secondary text-[26px]">vibration</span>
              <h2 class="font-headline-md text-headline-md text-on-surface font-bold" id="sec-alerts-title">Vibration & Alert Settings</h2>
            </div>
            <span class="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-bold shrink-0">Saved Preference</span>
          </div>

          <div class="bg-surface-container-low rounded-xl p-2 space-y-2 shadow-sm border border-surface-container-high">
            <!-- Vibration Intensity -->
            <div class="bg-surface-container p-4 rounded-lg space-y-3 border border-surface-container-high">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-headline-md text-headline-md text-on-surface font-bold text-[17px]">Vibration Intensity</p>
                  <p class="font-body-md text-body-md text-on-surface-variant text-[13px]">Preference for ESP32 handle motor alerts</p>
                </div>
                <span id="vibrationActiveBadge" class="px-3 py-1 rounded-full bg-surface-container-highest text-secondary font-label-md text-xs font-bold shrink-0">${vibrationIntensity}</span>
              </div>
              <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vibration intensity preference">
                ${['Off', 'Gentle', 'Strong'].map(level => `
                  <button
                    type="button"
                    role="radio"
                    aria-checked="${vibrationIntensity === level ? 'true' : 'false'}"
                    data-val="${level}"
                    class="opt-vibe-btn min-h-[48px] rounded-lg text-xs font-bold transition-colors ${
                      vibrationIntensity === level
                        ? 'bg-secondary text-surface shadow-md'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                    }"
                  >
                    ${level}
                  </button>
                `).join('')}
              </div>
              <p class="text-[11px] text-on-surface-variant">
                Saved as your preferred profile setting. Stick motor output requires connected ESP32 hardware.
              </p>
            </div>

            <!-- Audio Alert Preferences -->
            <div class="bg-surface-container p-4 rounded-lg min-h-[72px] flex items-center justify-between gap-3 border border-surface-container-high">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[26px]">notifications_active</span>
                </div>
                <div class="min-w-0">
                  <p class="font-headline-md text-headline-md text-on-surface font-bold text-[17px]">Audio Alert Cues</p>
                  <p class="font-body-md text-body-md text-on-surface-variant text-[13px]">${audioAlertsEnabled ? 'Spoken & chime safety alerts enabled' : 'Audio alert cues muted'}</p>
                </div>
              </div>
              <button
                id="toggleAudioAlertsBtn"
                type="button"
                role="switch"
                aria-checked="${audioAlertsEnabled ? 'true' : 'false'}"
                aria-label="Toggle audio alert cues"
                class="relative w-16 h-10 rounded-full ${audioAlertsEnabled ? 'bg-secondary-container' : 'bg-surface-container-highest'} transition-colors duration-200 shrink-0 focus:outline-none p-1 flex items-center"
              >
                <span class="${audioAlertsEnabled ? 'translate-x-6 bg-on-secondary' : 'translate-x-0 bg-on-surface-variant'} w-8 h-8 rounded-full shadow-md block transition-transform duration-200"></span>
              </button>
            </div>
          </div>
        </section>

        <!-- 5. CaneVyn Smart Stick -->
        <section aria-labelledby="sec2-title" class="space-y-3">
          <div class="flex items-center gap-2 px-1">
            <span class="material-symbols-outlined text-primary-container text-[26px]">hardware</span>
            <h2 class="font-headline-md text-headline-md text-on-surface font-bold" id="sec2-title">CaneVyn Smart Stick</h2>
          </div>

          <div class="bg-surface-container-low rounded-xl p-2 space-y-2 shadow-sm border border-surface-container-high">
            ${hasHardware ? `
              <div class="bg-surface-container p-4 rounded-lg space-y-3 border border-surface-container-high">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-12 h-12 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-[26px]">accessibility_new</span>
                    </div>
                    <div class="min-w-0">
                      <p class="font-headline-md text-headline-md text-on-surface truncate font-bold text-[17px]">${deviceName || 'Paired Smart Stick'}</p>
                      <span class="inline-flex items-center gap-1.5 text-xs font-bold ${isHardwareConnected ? 'text-secondary' : 'text-on-surface-variant'}">
                        <span class="w-2 h-2 rounded-full ${isHardwareConnected ? 'bg-secondary' : 'bg-outline'}"></span>
                        ${isHardwareConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                  <button id="openDeviceStatusBtn" aria-label="View hardware diagnostics" class="min-h-[48px] min-w-[48px] rounded-lg bg-surface-container-high text-primary flex items-center justify-center hover:bg-surface-container-highest shrink-0 border border-surface-container-highest" type="button">
                    <span class="material-symbols-outlined text-[22px]">tune</span>
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-surface-container-high">
                  ${deviceSerial ? `
                    <div class="bg-surface-container-low rounded-lg p-2.5">
                      <span class="text-[10px] uppercase font-bold text-on-surface-variant block">Serial Number</span>
                      <strong class="font-mono text-on-surface">${deviceSerial}</strong>
                    </div>
                  ` : ''}
                  ${batteryText ? `
                    <div class="bg-surface-container-low rounded-lg p-2.5">
                      <span class="text-[10px] uppercase font-bold text-on-surface-variant block">Battery Level</span>
                      <strong class="text-secondary">${batteryText}</strong>
                    </div>
                  ` : ''}
                  ${deviceFirmware ? `
                    <div class="bg-surface-container-low rounded-lg p-2.5 col-span-2">
                      <span class="text-[10px] uppercase font-bold text-on-surface-variant block">Firmware Version</span>
                      <strong class="font-mono text-on-surface">${deviceFirmware}</strong>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : `
              <div id="settingsNoHardwareCard" class="bg-surface-container p-4 rounded-lg space-y-2 border border-surface-container-high">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="material-symbols-outlined text-on-surface-variant text-[22px]">sensors_off</span>
                    <p class="font-headline-md text-base text-on-surface font-bold">Stick Hardware Status</p>
                  </div>
                  <span id="settingsStickStatusBadge" class="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-bold shrink-0">
                    Hardware Not Connected
                  </span>
                </div>
                <p class="font-body-md text-xs text-on-surface-variant leading-relaxed">
                  No CaneVyn smart stick is paired or connected yet. Paired device name, serial number, connection status, real battery level, and firmware version will appear here automatically once hardware connects.
                </p>
              </div>
            `}
          </div>
        </section>

        <!-- 6. Privacy & Family Connections -->
        <section aria-labelledby="sec3-title" class="space-y-3">
          <div class="flex items-center gap-2 px-1">
            <span class="material-symbols-outlined text-primary-container text-[26px]">shield_person</span>
            <h2 class="font-headline-md text-headline-md text-on-surface font-bold" id="sec3-title">Privacy & Family Connections</h2>
          </div>

          <div class="bg-surface-container-low rounded-xl p-2 space-y-2 shadow-sm border border-surface-container-high">
            <!-- Connected Authorized Members (Live from SQLite) -->
            <div class="bg-surface-container p-4 rounded-lg space-y-3 border border-surface-container-high" id="settingsAuthorizedMembersCard">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-12 h-12 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[26px]">group</span>
                  </div>
                  <div class="min-w-0">
                    <p class="font-headline-md text-headline-md text-on-surface font-bold text-[17px]">Connected Authorized Members</p>
                    <p id="settingsActiveGuardiansSummary" class="font-body-md text-body-md text-on-surface-variant text-[13px]">
                      ${activeMembers.length === 0
                        ? 'No Authorized Members connected yet.'
                        : (activeMembers.length === 1
                          ? '1 Authorized Member has approved access.'
                          : `${activeMembers.length} Authorized Members have approved access.`)}
                    </p>
                  </div>
                </div>
                <span id="settingsActiveGuardiansCount" class="px-2.5 py-1 rounded-full ${activeMembers.length > 0 ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'} font-label-md text-xs font-bold shrink-0">
                  ${activeMembers.length} Active
                </span>
              </div>

              ${activeMembers.length > 0 ? `
                <div class="space-y-2 pt-1" id="settingsActiveGuardiansList">
                  ${activeMembers.map(m => `
                    <div class="p-3 rounded-lg bg-surface-container-high flex items-center justify-between gap-2 border border-surface-container-highest">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="material-symbols-outlined text-secondary text-[20px] shrink-0">person</span>
                        <div class="min-w-0">
                          <p class="text-sm font-bold text-on-surface truncate">${m.guardian_name}</p>
                          <p class="text-[11px] text-on-surface-variant truncate">
                            ${m.guardian_canevyn_id ? `<span class="font-mono text-secondary font-bold">${m.guardian_canevyn_id}</span> · ` : ''}${m.relationship_label || 'Family / Caregiver'} · <span class="text-secondary font-semibold">Connected</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        data-rel-id="${m.id}"
                        data-guardian-name="${m.guardian_name}"
                        class="btn-settings-revoke-guardian min-h-[38px] px-3 rounded-lg bg-error-container text-on-error-container border border-error/40 text-xs font-bold shrink-0 hover:brightness-95"
                      >
                        Revoke
                      </button>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="p-3 rounded-lg bg-surface-container-low border border-surface-container-high text-xs text-on-surface-variant flex items-center gap-2">
                  <span class="material-symbols-outlined text-[18px]">group_off</span>
                  <span>No Authorized Members connected yet.</span>
                </div>
              `}

              ${pendingMembers.length > 0 ? `
                <div class="pt-2 border-t border-surface-container-high space-y-1.5" id="settingsPendingGuardiansList">
                  <p class="text-[11px] font-bold uppercase tracking-wider text-primary">Pending Requests (${pendingMembers.length} · Not Active)</p>
                  ${pendingMembers.map(p => `
                    <div class="p-2.5 rounded-lg bg-surface-container-low border border-primary/30 flex items-center justify-between gap-2 text-xs">
                      <div class="min-w-0">
                        <span class="font-bold text-on-surface truncate block">${p.guardian_name}</span>
                        ${p.guardian_canevyn_id ? `<span class="font-mono text-[11px] text-on-surface-variant">${p.guardian_canevyn_id}</span>` : ''}
                      </div>
                      <span class="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-bold shrink-0">Pending</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <button id="btnSettingsManageGuardians" type="button" class="w-full min-h-[46px] px-4 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary font-bold text-xs flex items-center justify-center gap-1.5 border border-secondary/30 transition-colors">
                <span class="material-symbols-outlined text-[18px]">manage_accounts</span>
                <span>Manage Family Connections</span>
              </button>
            </div>

            <!-- Phone GPS Location-Sharing Status -->
            <div class="bg-surface-container p-4 rounded-lg flex items-center justify-between gap-3 border border-surface-container-high">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[24px]">my_location</span>
                </div>
                <div class="min-w-0">
                  <p class="font-headline-md text-headline-md text-on-surface font-bold text-[16px]">Live Location Sharing</p>
                  <p class="font-body-md text-body-md text-on-surface-variant text-xs truncate">${locationSummaryText}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${locationBadgeClass}">${locationBadgeText}</span>
                <button id="btnSettingsOpenLocation" type="button" class="min-h-[40px] px-3 rounded-lg bg-surface-container-high text-on-surface text-xs font-bold hover:bg-surface-container-highest">
                  Manage
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- 7. Help & Support -->
        <section aria-labelledby="sec4-title" class="space-y-3">
          <div class="flex items-center gap-2 px-1">
            <span class="material-symbols-outlined text-primary-container text-[26px]">contact_support</span>
            <h2 class="font-headline-md text-headline-md text-on-surface font-bold" id="sec4-title">Help & Support</h2>
          </div>

          <div class="bg-surface-container-low rounded-xl p-2 space-y-2 shadow-sm border border-surface-container-high">
            <!-- Voice Command Tutorial -->
            <button id="btn-voice-tour" type="button" class="w-full bg-surface-container p-4 rounded-lg min-h-[68px] flex items-center justify-between gap-3 border border-surface-container-high hover:bg-surface-container-high transition-colors text-left">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[26px]">school</span>
                </div>
                <div class="min-w-0">
                  <p class="font-headline-md text-headline-md text-on-surface font-bold text-[17px]">Voice Command Tutorial</p>
                  <p class="font-body-md text-body-md text-on-surface-variant text-[14px]">Hear supported spoken commands and tips</p>
                </div>
              </div>
              <span class="material-symbols-outlined text-on-surface-variant text-[26px] shrink-0">chevron_right</span>
            </button>

            <!-- App Information -->
            <div class="bg-surface-container p-4 rounded-lg min-h-[68px] flex items-center justify-between gap-3 border border-surface-container-high">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[26px]">info</span>
                </div>
                <div class="min-w-0">
                  <p class="font-headline-md text-headline-md text-on-surface font-bold text-[17px]">About CaneVyn</p>
                  <p class="font-body-md text-body-md text-on-surface-variant text-[13px]">Voice-first assistive mobility & caregiver platform</p>
                </div>
              </div>
              <span class="px-2.5 py-1 rounded bg-surface-container-highest text-primary font-label-md text-label-md shrink-0 font-bold">v4.6</span>
            </div>

            <!-- Sign Out & Switch Role -->
            <div class="pt-1">
              <button aria-label="Sign out account" class="w-full min-h-[60px] rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-tertiary-fixed-dim font-headline-md text-headline-md flex items-center justify-center gap-2 active:scale-98 transition-transform font-bold border border-surface-container-highest" id="settingsLogoutBtn" type="button">
                <span class="material-symbols-outlined text-[24px]">logout</span>
                <span>Sign Out & Switch Role</span>
              </button>
            </div>
          </div>
        </section>

      </div>
    </main>
  `;
}
