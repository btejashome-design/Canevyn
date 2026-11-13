/**
 * Authorized Member Location Tracking Screen
 * Renders interactive Leaflet + OpenStreetMap map with real live GPS marker updates.
 * Strictly displays "Live Location: Not Available" when sharing is OFF, revoked, or expired (>5 min).
 */

export function formatGuardianLocationMeta(rawLoc = {}) {
  const loc = rawLoc || {};
  const recordedAt = loc.recorded_at || null;
  let ageSeconds = typeof loc.age_seconds === 'number' ? loc.age_seconds : null;

  if (recordedAt && ageSeconds === null) {
    const parsedMs = Date.parse(recordedAt);
    if (Number.isFinite(parsedMs)) {
      ageSeconds = Math.max(0, Math.round((Date.now() - parsedMs) / 1000));
    }
  }

  const sharingEnabled = Boolean(loc.location_sharing_enabled);
  const hasRawCoords =
    loc.latitude !== null &&
    loc.latitude !== undefined &&
    loc.longitude !== null &&
    loc.longitude !== undefined &&
    Number.isFinite(Number(loc.latitude)) &&
    Number.isFinite(Number(loc.longitude));

  const expiredByAge = ageSeconds !== null && ageSeconds > 300;
  const explicitlyUnavailable =
    loc.is_live_available === false ||
    loc.isLiveAvailable === false ||
    loc.sharing_status === 'off' ||
    loc.sharing_status === 'expired';

  const isLive = Boolean(
    hasRawCoords &&
    sharingEnabled &&
    !expiredByAge &&
    !explicitlyUnavailable
  );

  if (!isLive) {
    let badgeText = 'Sharing Off';
    let subReason = 'Live location sharing is turned off by this traveler.';
    if (sharingEnabled && (expiredByAge || loc.sharing_status === 'expired')) {
      badgeText = 'Signal Expired';
      subReason = 'No GPS updates received for over 5 minutes.';
    } else if (sharingEnabled && loc.sharing_status === 'searching') {
      badgeText = 'Searching GPS';
      subReason = 'Location sharing enabled — waiting for traveler phone GPS fix.';
    }
    return {
      isLive: false,
      isStale: false,
      isApproximate: false,
      latitude: null,
      longitude: null,
      accuracy: null,
      badgeText,
      headline: 'Live Location: Not Available',
      coordsText: 'Live Location: Not Available',
      accuracyText: 'Not available',
      updatedText: 'No live update',
      sharingText: sharingEnabled ? 'Waiting / Signal Unavailable' : 'Sharing Turned Off',
      subReason,
      headingText: 'Not reported',
      speedText: 'Not reported'
    };
  }

  const lat = Number(loc.latitude);
  const lon = Number(loc.longitude);
  const acc = Number.isFinite(Number(loc.accuracy_meters)) ? Number(loc.accuracy_meters) : null;
  const isStale = Boolean(loc.is_stale || (ageSeconds !== null && ageSeconds > 60));
  const isApproximate = acc !== null && acc > 100;

  let badgeText = 'Live GPS Active';
  if (isStale) badgeText = 'GPS Signal Lost';
  else if (isApproximate) badgeText = 'Approximate GPS';

  const formattedTime = recordedAt
    ? new Date(recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return {
    isLive: true,
    isStale,
    isApproximate,
    latitude: lat,
    longitude: lon,
    accuracy: acc,
    badgeText,
    headline: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    coordsText: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    accuracyText: acc !== null
      ? `±${Math.round(acc)} m${isApproximate ? ' (Approximate)' : ''}`
      : 'Accuracy unavailable',
    updatedText: isStale && ageSeconds !== null
      ? `${formattedTime} (${Math.floor(ageSeconds / 60)}m ${ageSeconds % 60}s ago)`
      : formattedTime,
    sharingText: isStale
      ? 'GPS Signal Lost / Stale Location (>60s)'
      : (isApproximate ? 'Live Sharing On (Approximate Signal)' : 'Live Sharing Active'),
    subReason: isStale
      ? 'Waiting for a newer GPS coordinate from traveler phone.'
      : 'Real phone GPS coordinates updated via CaneVyn.',
    headingText: Number.isFinite(Number(loc.heading_degrees)) ? `${Math.round(Number(loc.heading_degrees))}°` : 'Not reported',
    speedText: Number.isFinite(Number(loc.speed_mps)) ? `${Number(loc.speed_mps).toFixed(1)} m/s` : 'Not reported'
  };
}

export function renderRemoveConnectionModal(pendingRemoveUser = null) {
  if (!pendingRemoveUser) return '';
  const name = pendingRemoveUser.user_name || pendingRemoveUser.full_name || 'this CaneVyn user';
  const cvnId = pendingRemoveUser.canevyn_user_id || pendingRemoveUser.user_id || pendingRemoveUser.id || '';

  return `
    <div
      id="removeConnectionModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="removeConnectionModalTitle"
      aria-describedby="removeConnectionModalDesc"
      class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="w-full max-w-md rounded-2xl bg-surface-container border-2 border-error/50 shadow-2xl p-5 space-y-4">
        <div class="flex items-start gap-3">
          <div class="w-11 h-11 rounded-xl bg-error-container text-error flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[24px]">person_remove</span>
          </div>
          <div class="min-w-0">
            <h2 id="removeConnectionModalTitle" class="font-headline-md text-lg text-on-surface font-bold">
              Remove Connection with ${name}?
            </h2>
            ${cvnId ? `<span class="text-xs font-mono text-secondary font-bold">${cvnId}</span>` : ''}
          </div>
        </div>

        <p id="removeConnectionModalDesc" class="font-body-md text-sm text-on-surface-variant leading-relaxed">
          If you confirm, you will immediately lose access to <strong class="text-on-surface">${name}</strong>'s live location, smart stick battery, and telemetry updates, and they will be notified of this removal. Their CaneVyn account, ID, and personal records will stay intact so they can still connect with other Authorized Members.
        </p>

        <div class="flex items-center gap-3 pt-2">
          <button
            type="button"
            id="btnCancelRemoveConnection"
            class="flex-1 min-h-[48px] px-4 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm hover:bg-surface-container-highest transition-colors border border-surface-container-highest"
          >
            Keep Connection
          </button>
          <button
            type="button"
            id="btnConfirmRemoveConnection"
            data-rel-id="${pendingRemoveUser.relationship_id || ''}"
            data-user-id="${pendingRemoveUser.user_id || pendingRemoveUser.id || ''}"
            data-user-name="${name}"
            class="flex-1 min-h-[48px] px-4 rounded-xl bg-error-container text-on-error-container border border-error/50 font-bold text-sm hover:brightness-95 transition-all"
          >
            Confirm Remove
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderGuardianLocationScreen({ monitoredUser, monitoredUsers = [], latestTelemetry, pendingRemoveUser = null }) {
  const user = monitoredUser || { full_name: 'Connected Traveler', user_name: 'Connected Traveler', phone: '' };
  const activeId = user.user_id || user.id || user.canevyn_user_id;
  const tel = latestTelemetry || {};
  const rawDevice = tel.device || {};
  const hasHardware = Boolean(
    rawDevice.is_hardware_integrated ||
    rawDevice.is_connected ||
    (user && (user.is_hardware_integrated || user.is_connected))
  );
  const isHardwareConnected = hasHardware && Boolean(
    rawDevice.is_connected ||
    (user && user.is_connected)
  );
  const canRingCane = isHardwareConnected && Boolean(rawDevice.supports_remote_ring);
  const rawBattery = (rawDevice.battery_percent !== null && rawDevice.battery_percent !== undefined)
    ? rawDevice.battery_percent
    : (user && user.battery_percent !== null && user.battery_percent !== undefined ? user.battery_percent : null);
  const battery = hasHardware ? rawBattery : null;
  const meta = formatGuardianLocationMeta(tel.location);
  const travelerName = user.user_name || user.full_name || 'Connected Traveler';

  return `
    <div class="flex-1 flex flex-col relative w-full pt-20 pb-safe bg-surface min-h-screen">
      <!-- Top Navigation Header -->
      <header class="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.3)]">
        <div class="h-20 px-4 flex items-center justify-between gap-2 max-w-lg mx-auto">
          <div class="flex items-center gap-2 min-w-0">
            <button id="guardianLocBackBtn" aria-label="Go back" class="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors shrink-0">
              <span class="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <img alt="Canevyn Logo" class="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm" src="/static/assets/images/canevyn-logo.png">
            <h1 class="font-headline-md text-headline-md text-on-surface font-bold tracking-tight truncate">Live Tracking</h1>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button id="recenterBtn" aria-label="Recenter map" class="min-h-[44px] px-3 rounded-lg bg-surface-container-high text-secondary hover:bg-surface-bright text-xs font-bold flex items-center gap-1 border border-secondary/30">
              <span class="material-symbols-outlined text-[18px]">my_location</span>
              <span>Recenter</span>
            </button>
            ${hasHardware ? `
              <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-secondary">
                <span class="material-symbols-outlined text-[16px]">${isHardwareConnected ? 'bluetooth_connected' : 'bluetooth_disabled'}</span>
                <span class="font-label-md text-label-md font-bold">${battery !== null ? `${battery}%` : (isHardwareConnected ? 'Online' : 'Offline')}</span>
              </div>
            ` : `
              <div class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant" title="Hardware Not Connected">
                <span class="material-symbols-outlined text-[15px]">sensors_off</span>
                <span class="font-label-md text-[11px] font-semibold">No Hardware</span>
              </div>
            `}
          </div>
        </div>
      </header>

      <div class="flex flex-col w-full pb-10 max-w-lg mx-auto">
        ${monitoredUsers.length > 1 ? `
          <div class="px-4 py-2 bg-surface-container-low border-b border-surface-container-high flex items-center gap-2 overflow-x-auto">
            <span class="text-[11px] uppercase font-bold text-on-surface-variant shrink-0">Traveler:</span>
            ${monitoredUsers.map(u => {
              const uid = u.user_id || u.id || u.canevyn_user_id;
              const selected = uid === activeId;
              return `
                <button
                  type="button"
                  data-switch-user-id="${uid}"
                  class="btn-select-user shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${selected ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'}"
                >
                  ${u.user_name || u.full_name}
                </button>
              `;
            }).join('')}
          </div>
        ` : ''}

        <!-- Top Telemetry Status Bar -->
        <section class="px-4 py-3 bg-surface-container-high shadow-md">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="relative flex items-center justify-center w-4 h-4 shrink-0">
                <span id="guardianLocDot" class="relative inline-flex rounded-full h-2.5 w-2.5 ${meta.isLive ? (meta.isStale ? 'bg-primary-container' : 'bg-secondary animate-pulse') : 'bg-outline'}"></span>
              </div>
              <div class="min-w-0">
                <h2 class="font-headline-md text-headline-md text-on-surface truncate">${travelerName}'s Location</h2>
                <div class="flex items-center gap-2 flex-wrap">
                  <span id="guardianLocBadge" class="font-label-md text-label-md ${meta.isLive ? (meta.isStale ? 'text-primary' : 'text-secondary') : 'text-on-surface-variant'} flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">${meta.isLive ? 'gps_fixed' : 'gps_off'}</span>
                    <span>${meta.badgeText}</span>
                  </span>
                </div>
              </div>
            </div>
            <button
              aria-label="${canRingCane ? 'Ring Cane Audible Locator' : 'Ring Cane unavailable - Hardware Not Connected'}"
              title="${canRingCane ? 'Ring Cane' : 'Unavailable (Hardware Not Connected)'}"
              class="min-h-[48px] px-3.5 rounded-xl bg-surface-container-highest ${canRingCane ? 'text-primary transition-transform active:scale-95' : 'text-on-surface-variant opacity-55 cursor-not-allowed'} flex items-center gap-1.5 shrink-0"
              id="quickSoundBtn"
              ${canRingCane ? '' : 'disabled aria-disabled="true"'}
            >
              <span class="material-symbols-outlined text-[22px]">contactless</span>
              <span class="font-label-md text-label-md hidden sm:inline">${canRingCane ? 'Ring Cane' : 'Offline'}</span>
            </button>
          </div>
        </section>

        <!-- Interactive Leaflet OpenStreetMap Canvas -->
        <section class="relative w-full h-80 overflow-hidden bg-surface-container-lowest shadow-lg border-b border-surface-container-high">
          <div id="guardianFullMap" class="w-full h-full z-0"></div>
          <div id="guardianFullNoLocOverlay" class="${meta.isLive ? 'hidden' : ''} absolute inset-0 z-10 bg-surface-container-lowest/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-2.5">
            <div class="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-outline border border-surface-container-highest">
              <span class="material-symbols-outlined text-[36px]">location_off</span>
            </div>
            <p id="guardianFullOverlayTitle" class="font-headline-md text-lg text-on-surface font-bold">Live Location: Not Available</p>
            <p id="guardianFullOverlaySub" class="text-xs text-on-surface-variant max-w-xs leading-relaxed">${meta.subReason}</p>
          </div>
        </section>

        <!-- Real GPS Telemetry Details Sheet -->
        <section class="px-4 pt-4 flex flex-col gap-3">
          <div class="p-4 rounded-2xl bg-surface-container shadow-md space-y-3 border border-surface-container-high">
            <div class="flex items-start gap-3.5">
              <div class="w-12 h-12 rounded-xl bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[28px]">${meta.isLive ? 'pin_drop' : 'location_off'}</span>
              </div>
              <div class="min-w-0 flex-1">
                <span class="font-label-md text-label-md text-primary font-bold tracking-wider uppercase text-xs">Real-Time Coordinates</span>
                <p id="guardianLocHeadline" class="font-headline-md text-lg text-on-surface font-bold font-mono truncate">${meta.headline}</p>
                <p id="guardianLocSharing" class="font-body-md text-xs ${meta.isStale ? 'text-primary font-bold' : 'text-on-surface-variant'} mt-0.5">${meta.sharingText}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5 text-xs bg-surface-container-highest/50 rounded-xl p-3 border border-surface-container-highest">
              <div>
                <span class="text-on-surface-variant block">GPS Accuracy</span>
                <strong id="guardianLocAccuracy" class="${meta.isApproximate ? 'text-primary' : 'text-on-surface'}">${meta.accuracyText}</strong>
              </div>
              <div>
                <span class="text-on-surface-variant block">Last Updated</span>
                <strong id="guardianLocUpdated" class="text-on-surface">${meta.updatedText}</strong>
              </div>
              <div>
                <span class="text-on-surface-variant block">Heading</span>
                <strong id="guardianLocHeading" class="text-on-surface">${meta.headingText}</strong>
              </div>
              <div>
                <span class="text-on-surface-variant block">Speed</span>
                <strong id="guardianLocSpeed" class="text-on-surface">${meta.speedText}</strong>
              </div>
            </div>
          </div>

          <!-- Action Controls for Caregiver -->
          <div class="mt-1 flex flex-col gap-3">
            <h3 class="font-headline-md text-headline-md text-on-surface px-1">Guardian Actions</h3>
            <div class="grid grid-cols-1 gap-3">
              <button class="min-h-[56px] px-4 rounded-xl bg-surface-container text-on-surface flex items-center justify-center gap-2.5 shadow hover:bg-surface-container-high transition border border-surface-container-high" id="guardianLocRefreshBtn">
                <span class="material-symbols-outlined text-secondary text-[22px]">refresh</span>
                <span class="font-label-lg text-label-lg font-bold">Refresh Location</span>
              </button>
            </div>

            <button
              type="button"
              id="btnRemoveConnection"
              data-rel-id="${user.relationship_id || ''}"
              data-user-id="${activeId || ''}"
              data-user-name="${travelerName}"
              data-user-canevyn-id="${user.canevyn_user_id || ''}"
              class="w-full min-h-[52px] px-4 rounded-xl bg-error-container text-on-error-container border border-error/40 flex items-center justify-center gap-2 shadow-sm hover:brightness-95 transition"
            >
              <span class="material-symbols-outlined text-[20px]">person_remove</span>
              <span class="font-label-lg text-label-lg font-bold">Remove Connection</span>
            </button>
          </div>
        </section>

        ${renderRemoveConnectionModal(pendingRemoveUser)}

        <!-- Interactive Feedback Toast -->
        <div class="fixed bottom-6 left-4 right-4 max-w-md mx-auto p-4 rounded-2xl bg-surface-container-highest text-on-surface shadow-2xl flex items-center gap-3 transition-opacity duration-300 opacity-0 pointer-events-none z-50" id="actionToast">
          <span class="material-symbols-outlined text-secondary text-[26px]" id="toastIcon">info</span>
          <div class="min-w-0 flex-1">
            <p class="font-body-md text-body-md font-bold truncate" id="toastMessage">Notice</p>
          </div>
        </div>

      </div>
    </div>
  `;
}
