/**
 * Canevyn User Location & Wayfinding Screen
 * Visual source of truth: user_location_wayfinding + Stage 1 Real Phone GPS controls.
 * Enforces strict accuracy: Never fabricates GPS coordinates or displays simulated addresses.
 */

function getStatusVisuals(status) {
  switch (status) {
    case 'Live Location Active':
      return {
        badgeClass: 'bg-secondary/20 text-secondary border-secondary/40',
        dotClass: 'bg-secondary animate-pulse',
        icon: 'my_location',
        iconClass: 'bg-secondary text-on-secondary'
      };
    case 'Searching for GPS':
      return {
        badgeClass: 'bg-primary-container/20 text-primary border-primary/40',
        dotClass: 'bg-primary animate-ping',
        icon: 'satellite_alt',
        iconClass: 'bg-primary-container text-on-primary'
      };
    case 'Location Permission Denied':
    case 'GPS Signal Unavailable':
      return {
        badgeClass: 'bg-error-container/60 text-error border-error/40',
        dotClass: 'bg-error',
        icon: 'location_disabled',
        iconClass: 'bg-error-container text-on-error-container'
      };
    case 'Network Offline':
      return {
        badgeClass: 'bg-primary-container/20 text-primary border-primary/40',
        dotClass: 'bg-primary',
        icon: 'wifi_off',
        iconClass: 'bg-surface-container-highest text-primary'
      };
    case 'Location Permission Granted':
      return {
        badgeClass: 'bg-secondary/15 text-secondary border-secondary/30',
        dotClass: 'bg-secondary',
        icon: 'verified_user',
        iconClass: 'bg-surface-container-highest text-secondary'
      };
    case 'Ready to Resume':
      return {
        badgeClass: 'bg-primary-container/25 text-primary border-primary/40',
        dotClass: 'bg-primary',
        icon: 'play_circle',
        iconClass: 'bg-primary-container text-on-primary'
      };
    case 'Location Sharing Paused':
      return {
        badgeClass: 'bg-surface-container-highest text-on-surface-variant border-outline-variant',
        dotClass: 'bg-outline',
        icon: 'pause_circle',
        iconClass: 'bg-surface-container-highest text-on-surface-variant'
      };
    default: // Permission Required
      return {
        badgeClass: 'bg-surface-container-highest text-primary border-primary/30',
        dotClass: 'bg-primary',
        icon: 'location_searching',
        iconClass: 'bg-surface-container-highest text-primary'
      };
  }
}

export function renderPhoneGpsControlPanel(gpsState = {}) {
  const status = gpsState.status || 'Permission Required';
  const isSharing = Boolean(gpsState.isSharing);
  const savedSharing = Boolean(gpsState.savedSharingEnabled);
  const needsResume = Boolean(gpsState.needsResume && !isSharing);
  const canStop = isSharing || savedSharing;
  const hasFix = Boolean(gpsState.hasFix && gpsState.latitude !== null && gpsState.longitude !== null);
  const visuals = getStatusVisuals(status);
  const formattedTime = gpsState.timestamp
    ? new Date(gpsState.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;
  const accuracyLabel = hasFix && Number.isFinite(gpsState.accuracy)
    ? `±${Math.round(gpsState.accuracy)} m`
    : 'Not available';
  const isApproximate = Boolean(gpsState.isApproximate);
  const enableBtnLabel = isSharing
    ? 'Live Sharing On'
    : (needsResume ? 'Resume Live Location' : 'Enable Live Location');
  const isErrorAlert = ['Location Permission Denied', 'GPS Signal Unavailable', 'Network Offline'].includes(status);

  return `
    <section aria-label="Live Phone GPS Controls" class="w-full glass-panel rounded-2xl p-4 shadow-xl border border-secondary/30 space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="h-11 w-11 rounded-xl ${visuals.iconClass} flex items-center justify-center shrink-0 shadow">
            <span class="material-symbols-outlined text-[24px]">${visuals.icon}</span>
          </div>
          <div class="min-w-0">
            <span class="font-label-md text-[12px] text-primary font-bold uppercase tracking-wider">Phone GPS Status</span>
            <h2 class="font-headline-md text-lg text-on-surface font-bold leading-snug">Live Location Sharing</h2>
          </div>
        </div>
        <span id="gpsStatusBadge" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${visuals.badgeClass} shrink-0">
          <span class="w-2 h-2 rounded-full ${visuals.dotClass}"></span>
          <span>${status}</span>
        </span>
      </div>

      ${gpsState.errorMessage ? `
        <div id="gpsNoticeBox" role="${isErrorAlert ? 'alert' : 'status'}" class="rounded-xl ${isErrorAlert ? 'bg-error-container/40 border border-error/40 text-on-error-container' : 'bg-primary-container/15 border border-primary/40 text-on-surface'} px-3.5 py-2.5 text-xs font-medium leading-relaxed">
          <p>${gpsState.errorMessage}</p>
          ${status === 'Location Permission Denied' ? `
            <p class="mt-1.5 text-[11px] opacity-90">
              How to allow: Open your browser's lock/site icon next to the address bar → Permissions → Set Location to Allow, then reload or tap Enable Live Location.
            </p>
          ` : ''}
        </div>
      ` : ''}

      ${hasFix && isSharing ? `
        <div id="gpsCoordReadout" class="bg-surface-container-lowest/80 rounded-xl p-3 border border-secondary/30 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-on-surface-variant block">Coordinates</span>
            <strong class="text-secondary font-mono">${gpsState.latitude.toFixed(5)}, ${gpsState.longitude.toFixed(5)}</strong>
          </div>
          <div>
            <span class="text-on-surface-variant block">Accuracy</span>
            <strong class="${isApproximate ? 'text-primary' : 'text-on-surface'}">${accuracyLabel}${isApproximate ? ' (Approximate)' : ''}</strong>
          </div>
          ${isApproximate ? `
            <div class="col-span-2 text-[11px] text-primary bg-primary-container/10 rounded-lg px-2.5 py-1.5 border border-primary/30">
              Approximate indoor/network location (±${Math.round(gpsState.accuracy)}m) — shared for general family awareness only.
            </div>
          ` : ''}
          <div class="col-span-2 flex items-center justify-between pt-1 border-t border-surface-container-high/60 text-[11px] text-on-surface-variant">
            <span>Last GPS Fix: <strong class="text-on-surface">${formattedTime || 'Just now'}</strong></span>
            <span>Real Browser GPS</span>
          </div>
        </div>
      ` : `
        <div class="bg-surface-container/70 rounded-xl px-3.5 py-2.5 border border-surface-container-high text-xs text-on-surface-variant leading-relaxed">
          ${status === 'Searching for GPS'
            ? 'Waiting for your device GPS fix. Stay still briefly near an open sky or window...'
            : (needsResume
              ? 'Sharing preference is ON. Tap Resume Live Location to reactivate GPS watch on this tab, or Stop Sharing to turn it off.'
              : 'Canevyn sends your real phone GPS coordinates only while sharing is active. No coordinates are stored when off.')}
        </div>
      `}

      <div id="gpsAccessibilityLiveRegion" class="sr-only" aria-live="polite" role="status">
        Status: ${status}. ${gpsState.errorMessage || ''}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
        <button id="btnEnableLiveLocation"
          type="button"
          aria-label="${isSharing ? 'Live location sharing active' : 'Enable phone location permission'}"
          aria-pressed="${isSharing ? 'true' : 'false'}"
          ${isSharing && status === 'Searching for GPS' ? 'disabled' : ''}
          class="min-h-[56px] px-4 rounded-xl ${isSharing ? 'bg-secondary/20 text-secondary border border-secondary/40' : 'bg-secondary text-on-secondary shadow-lg hover:brightness-110'} font-label-md font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70">
          <span class="material-symbols-outlined text-[22px]">${needsResume && !isSharing ? 'play_arrow' : 'my_location'}</span>
          <span>${enableBtnLabel}</span>
        </button>

        <button id="btnStopLiveLocation"
          type="button"
          aria-label="Stop sharing live phone location"
          ${!canStop ? 'disabled' : ''}
          class="min-h-[56px] px-4 rounded-xl ${canStop ? 'bg-error-container text-on-error-container border border-error/50 shadow-md hover:brightness-110' : 'bg-surface-container-high text-on-surface-variant border border-surface-container-highest opacity-60 cursor-not-allowed'} font-label-md font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
          <span class="material-symbols-outlined text-[22px]">location_off</span>
          <span>Stop Sharing</span>
        </button>
      </div>
    </section>
  `;
}

export function renderLocationDetailsCard(gpsState = {}) {
  const status = gpsState.status || 'Permission Required';
  const isLiveActive = Boolean(
    gpsState.isLiveActive &&
    gpsState.latitude !== null &&
    gpsState.longitude !== null
  );
  const headline = isLiveActive
    ? `${gpsState.latitude.toFixed(5)}, ${gpsState.longitude.toFixed(5)}`
    : 'Live Location: Not Available';
  const subLabel = isLiveActive
    ? `Accuracy ±${Math.round(gpsState.accuracy)} meters${gpsState.isApproximate ? ' (Approximate network fix)' : ' (GPS fix)'}`
    : (status === 'Searching for GPS'
      ? 'Searching for real phone GPS signal...'
      : 'Turn on Enable Live Location above to share your real phone GPS.');

  const speedLabel = isLiveActive && Number.isFinite(gpsState.speed)
    ? `${gpsState.speed.toFixed(1)} m/s`
    : 'Not reported';
  const headingLabel = isLiveActive && Number.isFinite(gpsState.heading)
    ? `${Math.round(gpsState.heading)}°`
    : 'Not reported';

  return `
    <div class="bg-surface-container rounded-xl p-5 shadow-md flex flex-col space-y-4 border border-surface-container-high">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-full ${isLiveActive ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-primary'} flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[24px]">${isLiveActive ? 'my_location' : 'location_off'}</span>
          </div>
          <div>
            <span class="font-label-md text-label-md ${isLiveActive ? 'text-secondary' : 'text-primary'} font-bold">LOCATION STATUS</span>
            <p class="font-headline-md text-headline-md text-on-surface font-bold leading-tight mt-0.5">${headline}</p>
            <p class="font-body-md text-body-md text-on-surface-variant">${subLabel}</p>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded-full ${isLiveActive ? 'bg-secondary/15 text-secondary' : 'bg-surface-container-highest text-on-surface-variant'} font-label-md text-label-md font-bold text-center whitespace-nowrap">
          ${status}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-2.5 text-xs bg-surface-container-highest/50 rounded-xl p-3 border border-surface-container-highest">
        <div>
          <span class="text-on-surface-variant block">Heading</span>
          <strong class="text-on-surface">${headingLabel}</strong>
        </div>
        <div>
          <span class="text-on-surface-variant block">Speed</span>
          <strong class="text-on-surface">${speedLabel}</strong>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-2 pt-1">
        <button id="locRepeatAudioBtn" class="min-h-[56px] rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center gap-2 font-label-md text-label-md font-bold border border-surface-container-highest">
          <span class="material-symbols-outlined text-[22px] text-primary">volume_up</span>
          <span>Speak Status</span>
        </button>
        <button id="locShareToGuardianBtn" class="min-h-[56px] rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center gap-2 font-label-md text-label-md font-bold border border-surface-container-highest">
          <span class="material-symbols-outlined text-[22px] text-secondary">share_location</span>
          <span>Location Info</span>
        </button>
      </div>
    </div>
  `;
}

export function renderUserLocationScreen({ location, device, gpsState = {} }) {
  return `
    <main class="flex-1 flex flex-col relative w-full pt-20 pb-28 bg-surface">
      <div class="flex flex-col w-full px-4 space-y-5 pb-6 max-w-lg mx-auto">

        <!-- Top Header Title & Audible Narration Toggle -->
        <div class="flex items-center justify-between gap-3 bg-surface-container-high rounded-xl p-4 shadow-sm border border-surface-container-highest">
          <div class="flex flex-col min-w-0">
            <span class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Mobility Wayfinding</span>
            <h1 class="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold truncate">My Location Status</h1>
          </div>
          <button id="locAudibleToggleBtn" aria-pressed="true" class="shrink-0 min-h-[56px] px-3.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-md focus:outline-none">
            <span class="material-symbols-outlined text-[26px]" style="font-variation-settings: 'FILL' 1;">volume_up</span>
            <span class="font-bold">Read Status</span>
          </button>
        </div>

        <!-- Stage 1 Real Phone GPS Control Card -->
        <div id="userLocationGpsSlot">
          ${renderPhoneGpsControlPanel(gpsState)}
        </div>

        <!-- Live Phone Telemetry Details Card -->
        <div id="userLocationDetailsSlot">
          ${renderLocationDetailsCard(gpsState)}
        </div>

      </div>
    </main>
  `;
}
