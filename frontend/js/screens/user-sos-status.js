/**
 * Canevyn Hardware SOS Status Screen (User Side)
 * Visual source of truth: user_canevyn_hardware_sos_status
 * STRICT ENFORCEMENT:
 * - NO software SOS trigger button.
 * - Displayed ONLY when emergency packet originated from physical stick hardware.
 * - Neutral "Call Emergency Services" action.
 * - 3-second hold to resolve hardware alert.
 */

export function renderUserHardwareSosStatusScreen({ device, onResolveAlert, onCallEmergencyServices, onBack }) {
  const battery = device ? device.batteryPercent : 82;
  const isConnected = device ? device.isConnected : true;

  return `
    <div class="flex-1 flex flex-col relative w-full pt-20 pb-safe bg-surface min-h-screen">
      <!-- Top Navigation Header -->
      <header class="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.3)]">
        <div class="h-20 px-4 flex items-center justify-between gap-2 max-w-lg mx-auto">
          <div class="flex items-center gap-2">
            <button id="sosBackBtn" aria-label="Go back" class="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors">
              <span class="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <img alt="Canevyn Logo" class="w-8 h-8 rounded-full object-cover flex-shrink-0" src="/static/assets/images/canevyn-logo.png">
            <h1 class="font-headline-md text-headline-md text-on-surface font-bold tracking-tight truncate max-w-[140px]">Hardware SOS Status</h1>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-secondary">
              <span class="material-symbols-outlined text-[16px]">bluetooth_connected</span>
              <span class="font-label-md text-label-md font-bold">${battery}%</span>
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

      <div class="flex flex-col w-full px-4 py-4 space-y-4 max-w-lg mx-auto pb-12">

        <!-- Emergency Incident Alert Hero Card -->
        <section class="w-full rounded-xl bg-error-container text-on-error-container p-5 shadow-xl relative overflow-hidden">
          <div class="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-error/20 blur-2xl pointer-events-none"></div>
          <div class="flex items-start gap-3.5">
            <div class="w-14 h-14 rounded-xl bg-error flex items-center justify-center text-on-error flex-shrink-0 animate-pulse">
              <span class="material-symbols-outlined text-[34px]" style="font-variation-settings: 'FILL' 1;">warning</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-on-error text-error font-label-md text-label-md uppercase tracking-wider mb-1">
                <span class="w-2 h-2 rounded-full bg-error animate-ping"></span>
                PHYSICAL HARDWARE SWITCH TRIGGERED
              </div>
              <h2 class="font-headline-lg-mobile text-headline-lg-mobile font-extrabold text-on-error-container leading-tight">
                SOS Activated from Canevyn Stick
              </h2>
              <p class="font-body-md text-body-md text-on-error-container/80 mt-1 font-medium">
                This emergency alert was triggered using the physical SOS switch on the Canevyn smart cane. Your mobile app is broadcasting live telemetry and coordinating assistance.
              </p>
            </div>
          </div>
          <div class="mt-4 pt-4 border-t-0 bg-on-error-container/10 rounded-lg p-3 space-y-1.5">
            <div class="flex items-center gap-2 text-on-error-container">
              <span class="material-symbols-outlined text-[20px]">touch_app</span>
              <p class="font-label-md text-label-md font-bold">
                Activated via Canevyn Stick Physical Latch • <span class="opacity-80 font-normal">Active Broadcast</span>
              </p>
            </div>
            <div class="flex items-center gap-2 text-on-error-container">
              <span class="material-symbols-outlined text-[20px]">sensors</span>
              <p class="font-body-md text-body-md font-medium">
                Live Telemetry Transmitting
              </p>
            </div>
          </div>
        </section>

        <!-- Live Spoken Guidance Banner (Accessibility first) -->
        <section class="w-full rounded-xl bg-primary-container text-on-primary-container p-4 shadow-md flex items-start gap-3.5">
          <div class="w-10 h-10 rounded-full bg-on-primary-container/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-[24px]">record_voice_over</span>
          </div>
          <div class="flex-1">
            <p class="font-label-md text-label-md uppercase tracking-wider font-bold mb-0.5 text-on-primary-container/80">Spoken Status Narration</p>
            <p class="font-body-lg text-body-lg font-bold leading-snug">“Canevyn has alerted your guardians. Stay calm and remain where you are if safe. Hardware telemetry is broadcasting.”</p>
          </div>
        </section>

        <!-- Emergency Origin Pipeline -->
        <section class="w-full rounded-xl bg-surface-container p-3.5 shadow-sm border-t-0">
          <p class="font-label-md text-label-md uppercase tracking-wider font-bold text-on-surface-variant mb-2 px-0.5">Emergency Origin Pipeline</p>
          <div class="flex items-center justify-between gap-1 text-[16px] text-on-surface bg-surface-container-high rounded-lg p-2.5">
            <div class="flex items-center gap-1 min-w-0 font-bold text-primary truncate">
              <span class="material-symbols-outlined text-[18px]">emergency</span>
              <span class="truncate">Stick Switch</span>
            </div>
            <span class="material-symbols-outlined text-outline text-[16px] flex-shrink-0">arrow_forward</span>
            <div class="flex items-center gap-1 min-w-0 font-medium text-secondary truncate">
              <span class="material-symbols-outlined text-[18px]">bluetooth</span>
              <span class="truncate">BLE</span>
            </div>
            <span class="material-symbols-outlined text-outline text-[16px] flex-shrink-0">arrow_forward</span>
            <div class="flex items-center gap-1 min-w-0 font-medium text-on-surface truncate">
              <span class="material-symbols-outlined text-[18px]">cell_tower</span>
              <span class="truncate">Phone Broadcast</span>
            </div>
            <span class="material-symbols-outlined text-outline text-[16px] flex-shrink-0">arrow_forward</span>
            <div class="flex items-center gap-1 min-w-0 font-medium text-on-surface truncate">
              <span class="material-symbols-outlined text-[18px]">cloud_done</span>
              <span class="truncate">Guardians</span>
            </div>
          </div>
        </section>

        <!-- Physical Stick Telemetry & Actions Stream -->
        <section class="w-full space-y-3">
          <h3 class="font-label-lg text-label-lg font-bold text-on-surface px-1 flex items-center justify-between">
            <span>Active Emergency Broadcast Details</span>
            <span class="font-label-md text-label-md text-secondary flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
              Broadcasting
            </span>
          </h3>

          <!-- Audio Beacon Tile -->
          <div class="w-full rounded-xl bg-surface-container-high p-4 flex items-start gap-3.5 shadow-sm">
            <div class="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary-fixed-dim flex-shrink-0">
              <span class="material-symbols-outlined text-[28px]">volume_up</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <p class="font-label-lg text-label-lg font-bold text-on-surface">Stick Audio Beacon</p>
                <span class="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-md text-label-md font-bold">95 dB Pulse</span>
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant mt-1">Emitting audible pulse from physical cane tip for nearby pedestrian assistance and orientation.</p>
            </div>
          </div>

          <!-- Contacts Dispatched Tile -->
          <div class="w-full rounded-xl bg-surface-container-high p-4 flex items-start gap-3.5 shadow-sm">
            <div class="w-12 h-12 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1;">contacts_product</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <p class="font-label-lg text-label-lg font-bold text-on-surface">Guardians Contacted</p>
                <span class="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-label-md text-label-md font-bold">SMS + Voice</span>
              </div>
              <p class="font-body-md text-body-md text-on-surface mt-1 font-semibold">
                Marcus Vance (Son) • Dr. Elena Rostova
              </p>
              <p class="font-body-md text-body-md text-on-surface-variant mt-0.5">
                Automated notification dispatched with synthetic voice relay and location coordinates.
              </p>
            </div>
          </div>

          <!-- Live GPS Beacon Card -->
          <div class="w-full rounded-xl bg-surface-container-high p-4 space-y-3 shadow-sm">
            <div class="flex items-start gap-3.5">
              <div class="w-12 h-12 rounded-xl bg-surface-bright text-secondary flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-[28px]">fmd_good</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <p class="font-label-lg text-label-lg font-bold text-on-surface">Locked GPS Location</p>
                  <span class="font-label-md text-label-md text-secondary font-bold">2.1m Precision</span>
                </div>
                <p class="font-body-lg text-body-lg text-on-surface font-bold mt-1">742 Market St, San Francisco, CA</p>
                <p class="font-body-md text-body-md text-on-surface-variant">Dual-band GNSS + LiDAR differential positioning locked.</p>
              </div>
            </div>
            <!-- Visual Map Canvas Pill -->
            <div class="w-full h-32 rounded-lg bg-surface-container-lowest border border-surface-container-highest overflow-hidden relative shadow-inner flex items-end p-3">
              <div class="w-full rounded-lg bg-surface-dim/85 backdrop-blur-md px-3 py-2 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-error animate-ping"></span>
                  <span class="font-label-md text-label-md font-bold text-on-surface">Transmitting coordinates...</span>
                </div>
                <span class="font-label-md text-label-md text-primary font-bold">37.7879° N, 122.4034° W</span>
              </div>
            </div>
          </div>

          <!-- Stick Battery Reserve -->
          <div class="w-full rounded-xl bg-surface-container-high p-4 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-xl bg-surface-container-highest text-secondary flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-[28px]">battery_charging_full</span>
              </div>
              <div>
                <p class="font-label-lg text-label-lg font-bold text-on-surface">Stick Battery Reserve</p>
                <p class="font-body-md text-body-md text-on-surface-variant">Estimated 18 hrs remaining in beacon mode</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-telemetry-num text-telemetry-num text-secondary">${battery}%</p>
            </div>
          </div>

          <!-- Cane Link Status -->
          <div class="w-full rounded-xl bg-surface-container-high p-4 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-xl bg-surface-container-highest text-secondary flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-[28px]">hub</span>
              </div>
              <div>
                <p class="font-label-lg text-label-lg font-bold text-on-surface">Cane Link Status</p>
                <p class="font-body-md text-body-md text-on-surface-variant">Active BLE & Cellular Telemetry</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/15 text-secondary font-label-md text-label-md font-bold">
              <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              ${isConnected ? 'Connected' : 'Reconnecting'}
            </div>
          </div>
        </section>

        <!-- Deactivation & Resolution Zone -->
        <section class="w-full pt-2 space-y-3">
          <!-- Notice Card -->
          <div class="w-full rounded-xl bg-surface-container p-3.5 flex items-start gap-3">
            <span class="material-symbols-outlined text-[22px] text-primary mt-0.5 flex-shrink-0">info</span>
            <p class="font-body-md text-body-md text-on-surface-variant">
              <strong class="text-on-surface font-bold">Accidental trigger?</strong> Hold the resolution button below for 3 seconds, or double-press the Canevyn physical safety latch to immediately cancel alerts.
            </p>
          </div>

          <!-- Hold-to-Cancel Button (Minimum 76px Accessible Height) -->
          <div class="w-full relative select-none">
            <button aria-label="Hold for 3 seconds to resolve or cancel emergency alert" class="w-full min-h-[76px] rounded-xl bg-surface-container-highest text-on-surface flex items-center justify-between px-6 active:scale-[0.99] transition-all relative overflow-hidden shadow-lg border-2 border-surface-container-high" id="resolveAlertBtn">
              <!-- Dynamic Progress Fill Bar -->
              <div class="absolute left-0 top-0 bottom-0 bg-primary/40 w-0 transition-all duration-75 pointer-events-none" id="holdProgressBar"></div>
              <div class="flex items-center gap-3 relative z-10">
                <div class="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center text-primary-fixed">
                  <span class="material-symbols-outlined text-[26px]">check_circle</span>
                </div>
                <div class="text-left">
                  <span class="block font-headline-md text-headline-md font-bold text-on-surface" id="btn-title">Resolve Hardware Alert</span>
                  <span class="block font-body-md text-body-md text-on-surface-variant text-[13px]" id="btn-subtitle">Clears active emergency broadcast. Hold for 3s.</span>
                </div>
              </div>
              <div class="relative z-10 text-right">
                <span class="font-telemetry-num text-telemetry-num text-primary" id="countdownLabel">3s</span>
              </div>
            </button>
          </div>

          <!-- Neutral Call Emergency Services Link -->
          <div class="w-full flex items-center justify-center pt-2">
            <a id="callEmergencyServicesBtn" class="w-full min-h-[56px] px-6 py-3 rounded-xl bg-surface-container-high text-error hover:bg-surface-container-highest font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 border border-error/30 transition-colors" href="tel:sos" aria-label="Call Emergency Services">
              <span class="material-symbols-outlined text-[22px]">phone_forwarded</span>
              <span>Call Emergency Services</span>
            </a>
          </div>
        </section>

      </div>
    </div>
  `;
}
