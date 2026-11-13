

export function renderHeader({
  title = 'Canevyn',
  battery = null,
  isConnected = false,
  isHardwareIntegrated = undefined,
  isMuted = false,
  showBack = false,
  isGuardian = false,
  unreadCount = 0
}) {
  const hasRealBattery = battery !== null && battery !== undefined;
  const hardwareAvailable = isHardwareIntegrated === true || (isHardwareIntegrated === undefined && (isConnected || hasRealBattery));

  return `
    <header class="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(0,0,0,0.3)]">
      <div class="h-20 px-4 flex items-center justify-between gap-2 max-w-lg mx-auto">
        <div class="flex items-center gap-2 min-w-0">
          ${showBack ? `
            <button aria-label="Go back" id="headerBackBtn" class="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest">
              <span class="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          ` : ''}
          <img src="/static/assets/images/canevyn-logo.png" alt="Canevyn Official Logo" class="h-9 w-9 rounded-full object-contain shrink-0 shadow-sm" />
          <span class="font-headline-md text-headline-md text-primary tracking-tight font-bold truncate">${title}</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          ${isGuardian ? `
            ${hardwareAvailable ? `
              <div id="headerDeviceStatusBtn" aria-label="Hardware status: ${isConnected ? 'Connected' : 'Disconnected'}${hasRealBattery ? `, Battery ${battery} percent` : ''}" class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-secondary">
                <span class="material-symbols-outlined text-[16px]">${isConnected ? 'bluetooth_connected' : 'bluetooth_disabled'}</span>
                <span class="font-label-md text-label-md font-bold">${hasRealBattery ? `${battery}%` : (isConnected ? 'Stick Ready' : 'Offline')}</span>
              </div>
            ` : `
              <div id="headerDeviceStatusBtn" aria-label="Hardware Not Connected" class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant" title="Hardware Not Connected">
                <span class="material-symbols-outlined text-[15px]">sensors_off</span>
                <span class="font-label-md text-[11px] font-semibold">No Hardware</span>
              </div>
            `}
            <button id="headerNotificationsBtn" aria-label="Emergency Alerts and Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}" title="Notifications" class="relative w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors">
              <span class="material-symbols-outlined text-[20px]">notifications</span>
              ${unreadCount > 0 ? `<span class="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-error"></span>` : ''}
            </button>
            <button id="btnGuardianSettings" aria-label="Authorized Member Settings" title="Settings" class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors">
              <span class="material-symbols-outlined text-[20px]">settings</span>
            </button>
            <button id="headerProfileBtn" aria-label="Authorized Member Profile and Settings" title="Profile & Settings" class="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span class="material-symbols-outlined text-[20px]">person</span>
            </button>
          ` : `
            <button id="headerDeviceStatusBtn" aria-label="Stick status: ${isConnected ? 'Connected' : 'Disconnected'}${hasRealBattery ? `, Battery ${battery} percent` : ''}" class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-secondary hover:bg-surface-container-highest transition-colors">
              <span class="material-symbols-outlined text-[16px]">${isConnected ? 'bluetooth_connected' : 'bluetooth_disabled'}</span>
              <span class="font-label-md text-label-md font-bold">${hasRealBattery ? `${battery}%` : 'N/A'}</span>
            </button>
            <button id="headerAudioToggleBtn" aria-label="${isMuted ? 'Voice Muted - Tap to unmute' : 'Voice Active - Tap to mute'}" title="${isMuted ? 'Unmute Voice' : 'Mute Voice'}" class="w-11 h-11 flex items-center justify-center rounded-full ${isMuted ? 'bg-surface-container text-on-surface-variant' : 'bg-surface-container-high text-secondary'} hover:bg-surface-container-highest transition-colors">
              <span class="material-symbols-outlined text-[22px]">${isMuted ? 'volume_off' : 'volume_up'}</span>
            </button>
            <button id="headerProfileBtn" aria-label="User Profile and Role Switcher" class="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span class="material-symbols-outlined text-[20px]">person</span>
            </button>
          `}
        </div>
      </div>
    </header>
  `;
}
