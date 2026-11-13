/**
 * Canevyn Device Status & Diagnostics Screen
 * Visual source of truth: user_canevyn_device_status
 * Note: Accessed via Home or Settings, NOT a bottom navigation item.
 */

export function renderUserDeviceStatusScreen({ device, onBack, onRunSelfTest, onChirpPing }) {
  const battery = device ? device.batteryPercent : 82;
  const isConnected = device ? device.isConnected : true;
  const obstacleDistance = device && device.obstacleDistanceCm != null ? (device.obstacleDistanceCm / 100).toFixed(1) : '4.0';

  return `
    <div class="flex-1 flex flex-col relative w-full pt-20 pb-28 bg-surface">
      <div class="flex flex-col w-full px-4 py-2 space-y-5 max-w-lg mx-auto">

        <!-- Top Navigation Bar -->
        <div class="flex items-center justify-between">
          <button id="deviceBackBtn" aria-label="Go back" class="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors">
            <span class="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-secondary animate-pulse' : 'bg-error'}"></span>
            <span class="font-headline-md text-headline-md text-on-surface font-bold text-[18px]">Device Status</span>
          </div>
          <button id="deviceChirpPingBtn" aria-label="Test cane chirp tone" class="min-h-[44px] px-3.5 rounded-lg bg-secondary-container text-on-secondary-container font-label-md text-label-md font-bold">
            Chirp
          </button>
        </div>

        <!-- Status Banner / Announcement Anchor -->
        <div aria-live="polite" class="w-full p-4 rounded-xl bg-surface-container-high shadow-md flex items-center justify-between gap-3" role="status">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-secondary text-[28px]" style="font-variation-settings: 'FILL' 1;">${isConnected ? 'verified' : 'link_off'}</span>
            <div>
              <div class="font-headline-md text-headline-md text-on-surface">${isConnected ? 'Cane Synced' : 'Cane Offline'}</div>
              <p class="font-body-md text-body-md text-on-surface-variant">${isConnected ? 'All hardware nodes nominal' : 'Searching for BLE peripheral...'}</p>
            </div>
          </div>
          <span class="px-3 py-1.5 rounded-full ${isConnected ? 'bg-surface-container text-secondary' : 'bg-surface-container text-error'} font-label-md text-label-md">${isConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>

        <!-- Device Title & Serial Meta Card -->
        <div class="w-full p-5 rounded-xl bg-surface-container shadow-md flex flex-col gap-2">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <span class="font-label-md text-label-md text-primary-container tracking-wider uppercase">Assistive Hardware Unit</span>
            <span class="px-2.5 py-1 rounded-full bg-surface-container-highest text-on-surface font-label-md text-label-md">Model CS-300</span>
          </div>
          <h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-extrabold tracking-tight">Canevyn Smart Stick</h1>
          <div class="flex items-center gap-2 text-on-surface-variant pt-1">
            <span class="material-symbols-outlined text-[20px]">fingerprint</span>
            <span class="font-body-md text-body-md font-mono">SN: CNV-9942-BTA-DEMO</span>
          </div>
        </div>

        <!-- Primary Battery Card (Tactile High-Contrast) -->
        <section aria-labelledby="battery-heading" class="w-full p-6 rounded-xl bg-surface-container shadow-lg flex flex-col gap-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary text-[26px]">battery_charging_full</span>
              <h2 class="font-headline-md text-headline-md text-on-surface" id="battery-heading">Power & Cell Health</h2>
            </div>
            <span class="px-3 py-1 rounded-full bg-surface-container-highest text-secondary font-label-md text-label-md">Optimal</span>
          </div>

          <!-- Radial Progress Meter & Large Value -->
          <div class="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest">
            <div class="flex flex-col">
              <span class="font-telemetry-num text-telemetry-num text-secondary font-extrabold">${battery}%</span>
              <span class="font-label-lg text-label-lg text-on-surface font-bold">Approx. 14 hrs remaining</span>
              <span class="font-body-md text-body-md text-on-surface-variant">Active guidance mode</span>
            </div>
            <!-- High-contrast SVG battery dial -->
            <div class="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
              <svg aria-hidden="true" class="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle class="text-surface-container-highest" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" stroke-width="10"></circle>
                <circle class="text-secondary" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" stroke-dasharray="251.32" stroke-dashoffset="${251.32 * (1 - battery / 100)}" stroke-linecap="round" stroke-width="10"></circle>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="material-symbols-outlined text-secondary text-[32px]">bolt</span>
              </div>
            </div>
          </div>

          <!-- Battery Detail Points -->
          <div class="space-y-3 pt-1">
            <div class="flex items-start gap-3 p-3.5 rounded-lg bg-surface-container-high">
              <span class="material-symbols-outlined text-on-surface-variant text-[24px] mt-0.5">power_off</span>
              <div class="flex flex-col">
                <span class="font-label-lg text-label-lg text-on-surface">Charging Status: Disconnected</span>
                <span class="font-body-md text-body-md text-on-surface-variant">Last charged 3h ago via magnetic dock</span>
              </div>
            </div>
            <div class="flex items-start gap-3 p-3.5 rounded-lg bg-surface-container-high">
              <span class="material-symbols-outlined text-secondary text-[24px] mt-0.5" style="font-variation-settings: 'FILL' 1;">health_and_safety</span>
              <div class="flex flex-col">
                <span class="font-label-lg text-label-lg text-on-surface">Battery Cell Health: Excellent</span>
                <span class="font-body-md text-body-md text-on-surface-variant">98% design capacity (Minimal thermal wear)</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Connectivity & Sensor Array Card -->
        <section aria-labelledby="sensors-heading" class="w-full p-6 rounded-xl bg-surface-container shadow-lg flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[26px]">sensors</span>
            <h2 class="font-headline-md text-headline-md text-on-surface" id="sensors-heading">Telemetry & Sensors</h2>
          </div>

          <div class="space-y-3">
            <!-- BLE -->
            <div class="p-4 rounded-xl bg-surface-container-high flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-secondary text-[22px]">bluetooth</span>
                  <span class="font-label-lg text-label-lg text-on-surface font-bold">Bluetooth Low Energy</span>
                </div>
                <span class="font-label-md text-label-md text-secondary font-bold">${isConnected ? 'Strong' : 'Disconnected'}</span>
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant pl-8">Connected to Phone (Signal: -54 dBm)</p>
            </div>

            <!-- Cellular Link -->
            <div class="p-4 rounded-xl bg-surface-container-high flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-secondary text-[22px]">cell_tower</span>
                  <span class="font-label-lg text-label-lg text-on-surface font-bold">4G LTE Cellular Link</span>
                </div>
                <span class="font-label-md text-label-md text-secondary font-bold">Connected</span>
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant pl-8">Direct carrier emergency backup channel active</p>
            </div>

            <!-- Ultrasonic Sonar Detector -->
            <div class="p-4 rounded-xl bg-surface-container-high flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-secondary text-[22px]">radar</span>
                  <span class="font-label-lg text-label-lg text-on-surface font-bold">Ultrasonic Sonar Detector</span>
                </div>
                <span class="font-label-md text-label-md text-secondary font-bold">Active</span>
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant pl-8">Sweep angle 60°, obstacle range ${obstacleDistance}m</p>
            </div>

            <!-- Ground Surface LiDAR -->
            <div class="p-4 rounded-xl bg-surface-container-high flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-secondary text-[22px]">stairs</span>
                  <span class="font-label-lg text-label-lg text-on-surface font-bold">Ground LiDAR / Step Detector</span>
                </div>
                <span class="font-label-md text-label-md text-secondary font-bold">Active</span>
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant pl-8">Detecting curbs, potholes, and sudden elevation drops</p>
            </div>

            <!-- Physical SOS Latch -->
            <div class="p-4 rounded-xl bg-surface-container-highest flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-primary-container text-[24px]" style="font-variation-settings: 'FILL' 1;">emergency</span>
                  <span class="font-label-lg text-label-lg text-on-surface font-bold">Physical SOS Latch</span>
                </div>
                <span class="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold">ARMED</span>
              </div>
              <p class="font-body-md text-body-md text-on-surface-variant pl-8">Safety trigger located under cane handle grip. Ready for emergency dispatch.</p>
            </div>
          </div>
        </section>

        <!-- Large Interactive Device Actions (56px-72px High Reach Targets) -->
        <section aria-labelledby="actions-heading" class="w-full flex flex-col gap-4 pt-1">
          <h2 class="font-headline-md text-headline-md text-on-surface" id="actions-heading">Tactile Cane Controls</h2>

          <!-- Sound Chirp Primary Action Button (72px height for accessibility) -->
          <button class="w-full min-h-[72px] px-6 py-4 rounded-xl bg-primary-container text-on-primary shadow-lg flex items-center justify-between active:scale-[0.98] transition-transform" id="chirpBtn" type="button">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-[32px] text-on-primary">campaign</span>
              <div class="flex flex-col text-left">
                <span class="font-label-lg text-label-lg font-extrabold text-on-primary">Sound Stick Locator Chirp</span>
                <span class="font-body-md text-body-md text-on-primary-container">Emit loud acoustic alert on hardware</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-[28px] text-on-primary">play_arrow</span>
          </button>

          <!-- Test Haptics Secondary Action Button (64px target) -->
          <button class="w-full min-h-[64px] px-6 py-3.5 rounded-xl bg-surface-container-high text-on-surface shadow-md flex items-center justify-between active:scale-[0.98] transition-transform" id="hapticBtn" type="button">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-[28px]">vibration</span>
              <div class="flex flex-col text-left">
                <span class="font-label-lg text-label-lg text-on-surface font-bold">Test Haptic Vibrations</span>
                <span class="font-body-md text-body-md text-on-surface-variant">Send triple-pulse pulse to cane grip</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant text-[24px]">send</span>
          </button>

          <!-- Hardware Diagnostics Self-Test -->
          <button id="runDiagnosticsSelfTestBtn" class="w-full min-h-[56px] px-6 py-3.5 rounded-xl bg-surface-container-high text-on-surface shadow-md flex items-center justify-between active:scale-[0.98] transition-transform" type="button">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-secondary text-[26px]">troubleshoot</span>
              <div class="flex flex-col text-left">
                <span class="font-label-lg text-label-lg text-on-surface font-bold">Hardware Diagnostic Test</span>
                <span class="font-body-md text-body-md text-on-surface-variant">Verify IMU, Sonar, LiDAR, and BLE channels</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant text-[24px]">play_arrow</span>
          </button>

          <!-- Firmware Meta Tile -->
          <div class="w-full p-4 rounded-xl bg-surface-container flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-secondary text-[24px]">system_update_alt</span>
              <div class="flex flex-col">
                <span class="font-label-lg text-label-lg text-on-surface font-bold">Firmware v2.4.1</span>
                <span class="font-body-md text-body-md text-on-surface-variant">OTA sync complete • Up to date</span>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-surface-container-highest text-secondary font-label-md text-label-md">Current</span>
          </div>
        </section>

        <!-- Audio / Visual Feedback Alert Box -->
        <div class="hidden w-full p-4 rounded-xl bg-surface-container-highest text-on-surface shadow-md flex items-center gap-3" id="actionFeedback" role="alert">
          <span class="material-symbols-outlined text-secondary text-[24px]">check_circle</span>
          <span class="font-body-md text-body-md text-on-surface" id="feedbackText">Command transmitted to Canevyn Stick.</span>
        </div>

        <!-- Telemetry Clarification Note -->
        <footer class="w-full p-4 rounded-xl bg-surface-container-lowest text-center space-y-1">
          <p class="font-body-md text-body-md text-on-surface-variant">
            All values shown are synchronized cane telemetry.
          </p>
          <p class="font-label-md text-label-md text-outline">
            Hardware polling frequency: 1000ms via BLE 5.2
          </p>
        </footer>

      </div>
    </div>
  `;
}
