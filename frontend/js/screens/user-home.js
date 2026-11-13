import { renderConnectionStatusBanner } from './user-guardian.js?v=4.3';
import { renderPhoneGpsControlPanel } from './user-location.js?v=4.3';

export function getHomeProtectorsSummaryText(guardians = []) {
  const active = guardians.filter(g => g.status === 'approved' && Boolean(g.is_active));
  const pending = guardians.filter(g => g.status === 'pending');
  const rejected = guardians.filter(g => g.status === 'rejected');

  if (active.length > 0) {
    const names = active.map(g => g.guardian_name).join(', ');
    return `${active.length} Active • ${names}`;
  }
  if (pending.length > 0) {
    return `${pending.length} Pending • Waiting for response`;
  }
  if (rejected.length > 0) {
    return `${rejected.length} Rejected • Tap to view or resend`;
  }
  return 'Connect with Family or Caregiver';
}

export function renderUserHomeScreen({ user, device, location, guardians = [], connectionBanner = null, gpsState = {} }) {
  const userName = user ? user.full_name : 'User';
  const firstName = userName.split(' ')[0];
  const battery = (device && device.isConnected && device.batteryPercent !== null && device.batteryPercent !== undefined)
    ? device.batteryPercent
    : null;
  const isConnected = Boolean(device && device.isConnected);
  const obstacleDistance = (device && isConnected && device.obstacleDistanceCm != null) ? (device.obstacleDistanceCm / 100).toFixed(1) : '--';
  const obstacleStatus = (device && isConnected && device.obstacleStatus) ? device.obstacleStatus : 'Hardware Not Connected';
  const isLiveLocation = Boolean(gpsState && gpsState.isLiveActive && gpsState.latitude !== null && gpsState.longitude !== null);
  const address = isLiveLocation
    ? `GPS: ${gpsState.latitude.toFixed(4)}, ${gpsState.longitude.toFixed(4)} (±${Math.round(gpsState.accuracy)}m)`
    : (gpsState && gpsState.status && gpsState.status !== 'Permission Required' ? gpsState.status : 'Live Location: Not Available');
  const protectorsSummary = getHomeProtectorsSummaryText(guardians);

  return `
    <main class="flex-1 flex flex-col relative w-full pt-16 pb-28">
      <div class="flex flex-col w-full px-4 py-3 space-y-4 max-w-lg mx-auto">

        <!-- Connection Request Status Notification Slot -->
        <div id="userHomeBannerSlot">
          ${renderConnectionStatusBanner(connectionBanner)}
        </div>

        <!-- Stage 1 Real Phone GPS Sharing Controls -->
        <div id="userHomeGpsSlot">
          ${renderPhoneGpsControlPanel(gpsState)}
        </div>

        <!-- Top Greeting & Live Status Header Strip -->
        <header aria-label="Welcome Overview" class="w-full glass-panel rounded-2xl p-4 shadow-xl border border-secondary/30 flex items-center justify-between">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-md text-[13px] font-bold border border-secondary/30">
                <span class="h-2 w-2 rounded-full ${isConnected ? 'bg-secondary animate-pulse' : 'bg-error'}"></span>
                ${isConnected ? 'Connected' : 'Disconnected'}
              </span>
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-container/20 text-primary font-label-md text-[13px] font-bold border border-primary/30">
                <span class="material-symbols-outlined text-[15px]">battery_charging_full</span>
                ${battery !== null ? `${battery}%` : 'N/A'}
              </span>
            </div>
            <h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold tracking-tight" id="greeting-text">
              Welcome, ${firstName}
            </h1>
            <span class="text-xs text-on-surface-variant font-mono mt-0.5">
              CaneVyn ID: <strong class="text-secondary select-all">${(user && (user.canevyn_id || user.id)) || 'CVN-10482'}</strong>
            </span>
          </div>

          <button id="ttsReadOverviewBtn" aria-label="Listen to screen overview aloud" class="min-w-[56px] min-h-[56px] h-14 w-14 rounded-xl bg-surface-container-high text-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform border border-primary/30 shrink-0">
            <span class="material-symbols-outlined text-[30px]">volume_up</span>
          </button>
        </header>

        <!-- Primary Voice Assistant Control Card -->
        <section id="touchVoiceCard" aria-label="Voice Assistant Primary Control" class="w-full glass-panel rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center cursor-pointer border-2 border-primary-container/40 hover:border-primary-container transition-all">
          <span class="font-label-md text-label-md text-primary tracking-wide mb-1 font-bold uppercase">Touch Anywhere to Speak</span>
          <h2 class="font-headline-md text-headline-md text-on-surface mb-3 font-bold">How can Canevyn help you?</h2>
          
          <!-- Pulsing Voice Button -->
          <div class="relative my-2 flex items-center justify-center">
            <div class="absolute h-24 w-24 rounded-full bg-primary-container/25 animate-ping pointer-events-none" id="mic-pulse-ring"></div>
            <button id="mainVoiceMicBtn" aria-label="Activate voice assistant" class="relative min-w-[80px] min-h-[80px] h-20 w-20 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-2xl active:scale-90 transition-transform">
              <span class="material-symbols-outlined text-[44px]" id="mic-icon">mic</span>
            </button>
          </div>

          <!-- Spoken Command Tips -->
          <div class="bg-surface-container/80 rounded-xl p-3 w-full mt-3 border border-surface-container-high/60">
            <p class="font-label-md text-[14px] text-primary font-bold mb-0.5">Try Saying:</p>
            <p class="font-body-md text-body-md text-on-surface-variant font-medium">
              “Where am I?” • “Check battery” • “Check path”
            </p>
          </div>
        </section>

        <!-- 3 Primary Tactile Action Cards (72px Min Targets, Generous Spacing) -->
        <section aria-label="Main Navigation Features" class="w-full space-y-3">
          
          <!-- Card 1: Location & Navigation -->
          <button id="cardLocationNavBtn" aria-label="Location and Wayfinding: Current location ${address}" class="w-full min-h-[72px] glass-panel-interactive rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg text-left">
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="h-12 w-12 rounded-xl bg-surface-container-high text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <span class="material-symbols-outlined text-[30px]">explore</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-headline-md text-headline-md text-on-surface truncate font-bold">Location & Wayfinding</span>
                <span id="homeLocationSummary" class="font-body-md text-body-md text-on-surface-variant truncate font-medium">${address}</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant text-[28px] shrink-0">chevron_right</span>
          </button>

          <!-- Card 2: Protectors / Family Status -->
          <button id="cardProtectorsBtn" aria-label="Family and Protectors status: ${protectorsSummary}" class="w-full min-h-[72px] glass-panel-interactive rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg text-left">
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="h-12 w-12 rounded-xl bg-surface-container-high text-secondary flex items-center justify-center shrink-0 border border-secondary/20">
                <span class="material-symbols-outlined text-[30px]">group</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-headline-md text-headline-md text-on-surface truncate font-bold">Family & Protectors</span>
                <span id="homeProtectorsSummary" class="font-body-md text-body-md text-secondary font-semibold truncate">${protectorsSummary}</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant text-[28px] shrink-0">chevron_right</span>
          </button>

          <!-- Card 3: Stick Diagnostics & Sonar -->
          <button id="cardSonarBtn" aria-label="Stick diagnostics: Obstacle radar active, ${obstacleDistance} meters scanning, ${obstacleStatus}" class="w-full min-h-[72px] glass-panel-interactive rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg text-left">
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="h-12 w-12 rounded-xl bg-surface-container-high text-secondary flex items-center justify-center shrink-0 border border-secondary/20">
                <span class="material-symbols-outlined text-[30px]">radar</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-headline-md text-headline-md text-on-surface truncate font-bold">Stick Diagnostics & Sonar</span>
                <span class="font-body-md text-body-md text-on-surface-variant font-medium">Scanning ${obstacleDistance}m ahead • ${obstacleStatus}</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant text-[28px] shrink-0">chevron_right</span>
          </button>

        </section>

        <!-- Hardware SOS Status Banner -->
        <section aria-label="Hardware Emergency Safety Status" class="w-full glass-panel rounded-2xl p-4 border border-secondary/30 flex items-center justify-between shadow-md">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-secondary text-[28px]">shield</span>
            <div class="flex flex-col">
              <span class="font-label-lg text-label-lg text-on-surface font-bold">SOS Status: Safe & Nominal</span>
              <span class="font-body-md text-[13px] text-on-surface-variant">Physical Cane Stick Latch Armed</span>
            </div>
          </div>
          <button id="cardReadDiagnosticsBtn" aria-label="Read hardware status aloud" class="min-w-[48px] min-h-[48px] rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-surface-bright transition-colors border border-surface-container-high">
            <span class="material-symbols-outlined text-[24px]">record_voice_over</span>
          </button>
        </section>

      </div>
    </main>
  `;
}

