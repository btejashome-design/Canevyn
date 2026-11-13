/**
 * Authorized Member Hardware SOS Alert Received Screen
 * Visual source of truth: authorized_member_hardware_sos_alert_received
 * STRICT ENFORCEMENT:
 * - Clear notice: Physical Canevyn Stick SOS Switch was activated.
 * - Does NOT imply User phone originated SOS.
 * - Strict no-direct-calling policy: No direct call buttons or tel: links.
 */

export function renderGuardianSosAlertScreen({ alertData, onResolveAlert, onBack }) {
  const alert = alertData || {
    user_name: 'Arthur Vance',
    user_phone: '4155550188',
    device_model: 'Cane Model CX-7',
    tilt_degrees: 84,
    battery_percent: 82,
    audible_beacon_db: 95,
    latitude: 37.7879,
    longitude: -122.4034,
    address_label: '742 Market St, San Francisco, CA'
  };

  return `
    <div class="flex-1 flex flex-col relative w-full pt-20 pb-safe bg-surface min-h-screen">
      <!-- Top Navigation Header -->
      <header class="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.3)]">
        <div class="h-20 px-4 flex items-center justify-between gap-2 max-w-xl mx-auto">
          <div class="flex items-center gap-2">
            <button id="guardianSosBackBtn" aria-label="Go back" class="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors">
              <span class="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <img alt="Canevyn Logo" class="w-8 h-8 rounded-full object-cover shrink-0" src="/static/assets/images/canevyn-logo.png">
            <h1 class="font-headline-md text-headline-md text-on-surface font-bold tracking-tight truncate max-w-[140px]">Hardware SOS Receiver</h1>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-secondary">
              <span class="material-symbols-outlined text-[16px]">bluetooth_connected</span>
              <span class="font-label-md text-label-md font-bold">${alert.battery_percent}%</span>
            </div>
            <button aria-label="Audio Announcement Toggle" class="w-11 h-11 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest">
              <span class="material-symbols-outlined text-[22px]">volume_up</span>
            </button>
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      <div class="flex flex-col w-full px-4 py-4 space-y-4 max-w-xl mx-auto pb-12">
        <!-- Telemetry Status Indicator -->
        <div class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px] text-primary-container">shield_with_heart</span>
            <span class="font-label-md text-label-md tracking-wider uppercase text-[12px]">EMERGENCY BROADCAST · CANEVYN HARDWARE PACKET</span>
          </div>
          <span class="font-label-md text-label-md text-secondary text-[12px] flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            LIVE LINK
          </span>
        </div>

        <!-- Critical Emergency Alert Banner -->
        <section aria-live="assertive" class="rounded-xl p-4 bg-error-container text-on-error-container shadow-xl flex flex-col gap-3 relative overflow-hidden" role="alert">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-lg bg-error text-on-error flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[32px] animate-pulse">crisis_alert</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-label-lg text-label-lg tracking-wider text-error uppercase text-[13px]">CRITICAL EMERGENCY ALERT RECEIVED</span>
              <h2 class="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-error-container leading-tight mt-0.5">Physical Canevyn SOS Switch Activated</h2>
              <p class="font-body-md text-body-md text-on-error-container/90 mt-1">Initiated by <strong class="text-white font-bold">${alert.user_name}</strong> via physical emergency cane latch.</p>
            </div>
          </div>
          <!-- Active Timer Strip -->
          <div class="flex items-center justify-between px-3.5 py-2 rounded-lg bg-surface-container-lowest/80 text-on-surface text-sm">
            <div class="flex items-center gap-2 min-w-0">
              <span class="material-symbols-outlined text-error text-[20px]">timer</span>
              <span class="font-body-md text-body-md truncate">Emergency Broadcast Active</span>
            </div>
            <span class="font-label-md text-label-md text-error px-2 py-0.5 rounded bg-error-container/40 whitespace-nowrap" id="sos-live-stopwatch">Active: 02m 14s</span>
          </div>
        </section>

        <!-- Incident Overview & Live Map Card -->
        <section class="rounded-xl bg-surface-container p-4 space-y-4 shadow-md">
          <!-- User Profile Header in incident -->
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="relative w-14 h-14 rounded-full overflow-hidden shrink-0 bg-surface-container-highest flex items-center justify-center text-primary-container">
                <span class="material-symbols-outlined text-[36px]" style="font-variation-settings: 'FILL' 1;">elderly</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-label-md text-label-md text-on-surface-variant text-[13px]">PRIMARY HARDWARE CARRIER</span>
                <h3 class="font-headline-md text-headline-md text-on-surface font-bold truncate">${alert.user_name}</h3>
                <span class="font-body-md text-body-md text-primary font-medium text-[15px]">${alert.device_model || 'Hardware Emergency Alert'}</span>
              </div>
            </div>
          </div>

          <!-- Map & GPS Coordinates Container -->
          <div class="space-y-2">
            <div class="relative w-full h-52 rounded-xl overflow-hidden bg-surface-container-lowest">
              <!-- Dark Map Base with Impact Marker -->
              <svg class="w-full h-full" viewBox="0 0 320 208" xmlns="http://www.w3.org/2000/svg">
                <rect width="320" height="208" fill="#08122d"></rect>
                <rect x="20" y="20" width="120" height="60" fill="#151e3a" stroke="#243254"></rect>
                <rect x="160" y="20" width="140" height="60" fill="#151e3a" stroke="#243254"></rect>
                <rect x="20" y="100" width="120" height="80" fill="#151e3a" stroke="#243254"></rect>
                <rect x="160" y="100" width="140" height="80" fill="#151e3a" stroke="#243254"></rect>
                <path d="M 40 180 L 160 104 L 280 40" stroke="#ffb703" stroke-width="8" stroke-linecap="round"></path>
                <!-- Distressed Beacon Marker Overlay -->
                <g transform="translate(160, 104)">
                  <circle cx="0" cy="0" r="28" fill="#93000a" fill-opacity="0.4">
                    <animate attributeName="r" values="16;36;16" dur="1.5s" repeatCount="indefinite"></animate>
                  </circle>
                  <circle cx="0" cy="0" r="14" fill="#ffb4ab"></circle>
                  <circle cx="0" cy="0" r="6" fill="#690005"></circle>
                </g>
              </svg>
              <div class="absolute inset-0 bg-surface-dim/30 pointer-events-none"></div>

              <!-- Impact Site Pill -->
              <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none pt-10">
                <span class="px-2.5 py-1 rounded bg-surface-container-lowest/95 text-error font-label-md text-label-md text-[12px] tracking-wide shadow-md whitespace-nowrap">
                  IMPACT SITE
                </span>
              </div>
              <div class="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest/90 backdrop-blur text-on-surface flex items-center justify-between text-xs">
                <span class="font-body-md text-body-md text-[13px] truncate">Accuracy: ±2.1 meters (Dual-band GPS)</span>
                <span class="font-label-md text-label-md text-secondary shrink-0 font-bold">FIX LOCKED</span>
              </div>
            </div>

            <!-- Address Breakdown -->
            <div class="p-3 rounded-lg bg-surface-container-high flex items-start gap-2.5">
              <span class="material-symbols-outlined text-primary-container text-[24px] shrink-0 mt-0.5">location_on</span>
              <div class="flex flex-col min-w-0">
                <span class="font-label-md text-label-md text-on-surface font-bold">${alert.address_label || '742 Market St, San Francisco, CA'}</span>
                <span class="font-body-md text-body-md text-on-surface-variant text-[14px]">Lat: ${alert.latitude || '37.7879'}° N, Long: ${alert.longitude || '-122.4034'}° W</span>
              </div>
            </div>
          </div>

          <!-- Live Cane Telemetry Cluster -->
          <div class="space-y-2 pt-1">
            <h4 class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-[13px] flex items-center gap-1.5 font-bold">
              <span class="material-symbols-outlined text-[16px]">sensors</span>
              Cane Hardware Telemetry (Active SOS)
            </h4>
            <div class="grid grid-cols-1 gap-2.5">
              <!-- Telemetry 1: Battery & Audible Beacon -->
              <div class="p-3.5 rounded-lg bg-surface-container-low flex items-center justify-between">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[24px]">battery_charging_80</span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="font-label-lg text-label-lg text-on-surface font-bold">Stick Battery: ${alert.battery_percent}%</span>
                    <span class="font-body-md text-body-md text-secondary text-[14px] truncate">Audible distress beacon pulsing on stick (95dB)</span>
                  </div>
                </div>
                <span class="material-symbols-outlined text-secondary text-[20px] animate-pulse">volume_up</span>
              </div>

              <!-- Telemetry 2: Motion / Fall Detection -->
              <div class="p-3.5 rounded-lg bg-surface-container-low flex items-center justify-between">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-lg bg-surface-container-high text-primary-container flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[24px]">screen_rotation</span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="font-label-lg text-label-lg text-on-surface font-bold">Stick Motion: Stationary on ground</span>
                    <span class="font-body-md text-body-md text-error text-[14px] truncate">Dropped angle detected (${alert.tilt_degrees}° tilt)</span>
                  </div>
                </div>
                <span class="material-symbols-outlined text-error text-[20px]">warning</span>
              </div>

              <!-- Telemetry 3: Cellular Connectivity -->
              <div class="p-3.5 rounded-lg bg-surface-container-low flex items-center justify-between">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[24px]">cell_tower</span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="font-label-lg text-label-lg text-on-surface font-bold">Connectivity: 4G LTE Emergency Priority</span>
                    <span class="font-body-md text-body-md text-on-surface-variant text-[14px] truncate">Canevyn Mesh Relay & Band 12 Active</span>
                  </div>
                </div>
                <span class="material-symbols-outlined text-secondary text-[20px]">wifi_channel</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Guardian Response Coordination -->
        <section class="rounded-xl bg-surface-container p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-[13px] flex items-center gap-1.5 font-bold">
              <span class="material-symbols-outlined text-[16px]">group</span>
              Guardian Response Network
            </h4>
            <span class="font-label-md text-label-md text-secondary text-xs font-bold">2 NOTIFIED</span>
          </div>
          <div class="p-3 rounded-lg bg-surface-container-high flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-surface-container-highest flex items-center justify-center text-primary-container">
                <span class="material-symbols-outlined text-[24px]">medical_services</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-label-lg text-label-lg text-on-surface truncate font-bold">Dr. Elena Rostova</span>
                <span class="font-body-md text-body-md text-secondary text-[14px] flex items-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">visibility</span>
                  Viewing alert right now
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Emergency Response Actions (No direct calling buttons) -->
        <section class="space-y-3 pt-1">
          <!-- Navigate to Coordinates Action -->
          <a class="w-full min-h-[64px] h-[64px] px-5 rounded-xl bg-surface-container text-on-surface flex items-center justify-between hover:bg-surface-container-high transition-colors" href="https://maps.google.com/?q=${alert.latitude},${alert.longitude}" rel="noopener noreferrer" target="_blank" id="guardianNavigateCoordinatesBtn">
            <div class="flex items-center gap-3 min-w-0">
              <span class="material-symbols-outlined text-secondary text-[28px] shrink-0">directions</span>
              <div class="flex flex-col text-left min-w-0">
                <span class="font-label-lg text-label-lg font-bold truncate">Navigate to Reported Location</span>
                <span class="font-body-md text-body-md text-on-surface-variant text-[14px]">Opens Turn-by-Turn GPS Navigation</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-[24px] text-on-surface-variant shrink-0">open_in_new</span>
          </a>
        </section>

        <!-- Incident Status / Hardware Reset Requirement Banner -->
        <footer class="p-4 rounded-xl bg-surface-container-lowest text-on-surface-variant flex flex-col gap-3 mt-2">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-primary-container text-[24px] shrink-0 mt-0.5">info</span>
            <p class="font-body-md text-body-md text-[14px] leading-relaxed">
              <strong class="text-on-surface font-semibold">Incident State:</strong> Emergency protocol remains active until physically reset by Arthur on the Canevyn hardware safety latch, or formally marked resolved by a primary verified guardian below.
            </p>
          </div>
          <button id="guardianResolveSosBtn" class="w-full min-h-[52px] rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-secondary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 border border-surface-container-highest transition-colors">
            <span class="material-symbols-outlined text-[20px]">check_circle</span>
            <span>Mark Incident Handled & Resolved</span>
          </button>
        </footer>
      </div>
    </div>
  `;
}
