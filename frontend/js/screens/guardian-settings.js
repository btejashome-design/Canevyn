/**
 * Canevyn Authorized Member Settings Screen
 * Provides Light Mode / Dark Mode appearance controls exclusively for Authorized Members,
 * preserving the Blind User dashboard theme and CaneVyn branding intact.
 */

import { renderRemoveConnectionModal } from './guardian-location.js?v=4.6';

export function renderGuardianSettingsScreen({ user, guardianTheme = 'dark', monitoredUsers = [], pendingRemoveUser = null }) {
  const isLight = guardianTheme === 'light';
  const memberName = (user && user.full_name) ? user.full_name : 'Authorized Member';
  const memberEmail = (user && user.email) ? user.email : '';
  const memberId = (user && user.canevyn_id) ? user.canevyn_id : '';
  const connectedList = monitoredUsers || [];

  return `
    <div class="flex-1 flex flex-col relative w-full pt-20 pb-16 bg-surface min-h-screen" id="guardianSettingsScreen" data-guardian-theme="${isLight ? 'light' : 'dark'}">
      <div class="flex flex-col w-full px-4 space-y-5 max-w-lg mx-auto">

        <!-- Header Bar -->
        <div class="flex items-center justify-between gap-3 py-1">
          <button
            type="button"
            id="btnGuardianSettingsBack"
            aria-label="Back to Authorized Member dashboard"
            class="min-h-[48px] px-3.5 rounded-xl bg-surface-container-high text-on-surface border border-surface-container-highest flex items-center gap-2 font-bold text-sm hover:bg-surface-container-highest transition-colors focus:outline-none"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>Dashboard</span>
          </button>

          <div class="flex items-center gap-2">
            <img src="/static/assets/images/canevyn-logo.png" alt="Canevyn Official Logo" class="w-9 h-9 rounded-full object-contain shadow-sm" />
            <span class="font-headline-md text-headline-md tracking-tight text-on-surface font-bold">CaneVyn</span>
          </div>
        </div>

        <!-- Title Card -->
        <section class="glass-panel rounded-2xl p-5 shadow-lg space-y-2">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center border border-secondary/30 shrink-0">
              <span class="material-symbols-outlined text-[26px]">tune</span>
            </div>
            <div class="min-w-0">
              <h1 class="font-headline-md text-xl text-on-surface font-bold leading-tight">Authorized Member Settings</h1>
              <p class="font-body-md text-sm text-on-surface-variant">Appearance and account preferences</p>
            </div>
          </div>
        </section>

        <!-- Theme Appearance Card -->
        <section class="bg-surface-container rounded-2xl p-5 shadow-md border border-surface-container-high space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="font-headline-md text-base text-on-surface font-bold flex items-center gap-2">
                <span class="material-symbols-outlined text-secondary text-[22px]">contrast</span>
                <span>Dashboard Theme</span>
              </h2>
              <p class="font-body-md text-xs text-on-surface-variant mt-1 leading-relaxed">
                Applies across your Authorized Member dashboard, maps, telemetry cards, notifications, and connection screens. Blind User dashboards remain voice-optimized.
              </p>
            </div>
            <span id="guardianThemeActiveBadge" class="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary/15 text-secondary border border-secondary/30 shrink-0">
              ${isLight ? 'Light Mode' : 'Dark Mode'}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3" role="group" aria-label="Authorized Member theme mode">
            <!-- Dark Mode Option -->
            <button
              type="button"
              id="guardianThemeDarkBtn"
              aria-pressed="${!isLight ? 'true' : 'false'}"
              data-theme-option="dark"
              class="p-4 rounded-xl border-2 text-left transition-all focus:outline-none ${
                !isLight
                  ? 'border-secondary bg-surface-container-high shadow-md'
                  : 'border-surface-container-highest bg-surface-container-low hover:bg-surface-container-high'
              }"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="material-symbols-outlined text-[24px] ${!isLight ? 'text-secondary' : 'text-on-surface-variant'}">dark_mode</span>
                ${!isLight ? '<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary text-surface">Active</span>' : ''}
              </div>
              <span class="block font-bold text-sm text-on-surface">Dark Mode</span>
              <span class="block text-xs text-on-surface-variant mt-0.5">Low-glare navy sentinel</span>
            </button>

            <!-- Light Mode Option -->
            <button
              type="button"
              id="guardianThemeLightBtn"
              aria-pressed="${isLight ? 'true' : 'false'}"
              data-theme-option="light"
              class="p-4 rounded-xl border-2 text-left transition-all focus:outline-none ${
                isLight
                  ? 'border-secondary bg-surface-container-high shadow-md'
                  : 'border-surface-container-highest bg-surface-container-low hover:bg-surface-container-high'
              }"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="material-symbols-outlined text-[24px] ${isLight ? 'text-secondary' : 'text-on-surface-variant'}">light_mode</span>
                ${isLight ? '<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary text-surface">Active</span>' : ''}
              </div>
              <span class="block font-bold text-sm text-on-surface">Light Mode</span>
              <span class="block text-xs text-on-surface-variant mt-0.5">Crisp daylight contrast</span>
            </button>
          </div>

          <p id="guardianThemeSaveHint" class="text-xs text-on-surface-variant flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px] text-secondary">cloud_done</span>
            <span>Your theme preference is saved automatically for refreshes and future sign-ins.</span>
          </p>
        </section>

        <!-- Account Summary Card -->
        <section class="bg-surface-container rounded-2xl p-5 shadow-md border border-surface-container-high space-y-3">
          <h2 class="font-headline-md text-base text-on-surface font-bold flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary text-[22px]">badge</span>
            <span>Authorized Member Profile</span>
          </h2>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between py-1.5 border-b border-surface-container-high">
              <span class="text-on-surface-variant">Name</span>
              <strong class="text-on-surface">${memberName}</strong>
            </div>
            ${memberEmail ? `
              <div class="flex items-center justify-between py-1.5 border-b border-surface-container-high">
                <span class="text-on-surface-variant">Email</span>
                <strong class="text-on-surface truncate max-w-[65%]">${memberEmail}</strong>
              </div>
            ` : ''}
            ${memberId ? `
              <div class="flex items-center justify-between py-1.5">
                <span class="text-on-surface-variant">Member ID</span>
                <strong class="font-mono text-secondary font-bold">${memberId}</strong>
              </div>
            ` : ''}
          </div>
        </section>

        <!-- Connection Management Card -->
        <section class="bg-surface-container rounded-2xl p-5 shadow-md border border-surface-container-high space-y-3">
          <h2 class="font-headline-md text-base text-on-surface font-bold flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary text-[22px]">manage_accounts</span>
            <span>Connection Management</span>
          </h2>
          ${connectedList.length > 0 ? `
            <div class="space-y-2">
              ${connectedList.map(u => {
                const name = u.user_name || u.full_name || 'Connected User';
                return `
                  <div class="p-3 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-sm font-bold text-on-surface truncate">${name}</p>
                      <p class="text-xs font-mono text-secondary">${u.canevyn_user_id || ''} <span class="font-sans text-on-surface-variant">· ${u.relationship_label || 'Connected'}</span></p>
                    </div>
                    <button
                      type="button"
                      class="btn-manage-remove-connection shrink-0 px-3 py-1.5 rounded-lg bg-error-container text-on-error-container border border-error/40 text-xs font-bold flex items-center gap-1 hover:brightness-95"
                      data-rel-id="${u.relationship_id || ''}"
                      data-user-id="${u.user_id || u.id || ''}"
                      data-user-name="${name}"
                      data-user-canevyn-id="${u.canevyn_user_id || ''}"
                    >
                      <span class="material-symbols-outlined text-[15px]">link_off</span>
                      <span>Remove</span>
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <p class="text-xs text-on-surface-variant">No Blind Users are currently connected to this account.</p>
          `}
        </section>

        <!-- Sign Out Action -->
        <section class="pt-1">
          <button
            type="button"
            id="guardianSettingsSignOutBtn"
            class="w-full min-h-[54px] px-4 rounded-xl bg-error-container text-on-error-container border border-error/40 font-bold text-sm flex items-center justify-center gap-2 hover:brightness-95 active:scale-[0.98] transition-all focus:outline-none"
          >
            <span class="material-symbols-outlined text-[20px]">logout</span>
            <span>Sign Out of Authorized Member Account</span>
          </button>
        </section>

      </div>

      ${renderRemoveConnectionModal(pendingRemoveUser)}
    </div>
  `;
}
