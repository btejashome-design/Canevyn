/**
 * Canevyn Authorized Members Screen (Blind User Side)
 * Visual source of truth: user_authorized_members
 * Features:
 * - Shows Blind User's unique CaneVyn User ID with copy/speak actions
 * - Live accessible notification banner when request is Accepted or Rejected
 * - "Connect with Family or Caregiver" search by Authorized Member ID (CVM-XXXXX)
 * - Shows real-time SQLite statuses: Pending ("Waiting for Authorized Member's response."), Accepted, Rejected
 * - Allows re-sending a connection request if previously rejected
 * - Lists connected Authorized Members with one-click "Revoke Connection"
 */

export function renderConnectionStatusBanner(banner = null) {
  if (!banner || !banner.message) return '';
  const isAccepted = banner.status === 'approved' || banner.status === 'Accepted';
  const isRemoved = banner.status === 'removed' || banner.status === 'Removed';
  const badgeHeading = isAccepted
    ? 'Request Accepted'
    : (isRemoved ? 'Connection Removed' : 'Request Rejected');
  const iconName = isAccepted
    ? 'check_circle'
    : (isRemoved ? 'person_remove' : 'cancel');

  return `
    <div
      role="status"
      aria-live="assertive"
      class="p-4 rounded-2xl shadow-lg border-2 flex items-start justify-between gap-3 ${
        isAccepted
          ? 'bg-secondary/15 border-secondary text-on-surface'
          : 'bg-error-container border-error text-on-error-container'
      }"
    >
      <div class="flex items-start gap-3 min-w-0">
        <span class="material-symbols-outlined text-[24px] shrink-0 ${isAccepted ? 'text-secondary' : 'text-error'}">
          ${iconName}
        </span>
        <div class="min-w-0">
          <span class="block text-xs uppercase tracking-wider font-bold ${isAccepted ? 'text-secondary' : 'text-error'}">
            ${badgeHeading}
          </span>
          <p class="text-sm font-bold leading-snug mt-0.5">${banner.message}</p>
        </div>
      </div>
      <button
        type="button"
        id="btnDismissConnectionBanner"
        aria-label="Dismiss notification"
        class="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center hover:bg-surface/20 shrink-0"
      >
        <span class="material-symbols-outlined text-[20px]">close</span>
      </button>
    </div>
  `;
}

export function renderUserGuardianRequestsContent(guardians = []) {
  const pendingItems = guardians.filter(g => g.status === 'pending');
  const rejectedItems = guardians.filter(g => g.status === 'rejected');

  if (pendingItems.length === 0 && rejectedItems.length === 0) {
    return '';
  }

  return `
    <div class="space-y-4">
      ${pendingItems.length > 0 ? `
        <div class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <h2 class="font-headline-md text-base text-primary font-bold">Pending Sent Requests</h2>
              <span class="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary font-label-md text-xs font-bold">
                ${pendingItems.length} Pending
              </span>
            </div>
          </div>

          <div class="space-y-2.5">
            ${pendingItems.map(r => `
              <div class="p-3.5 rounded-xl bg-surface-container border border-primary/30 flex items-center justify-between gap-3 shadow-sm">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                    <span class="material-symbols-outlined text-[20px]">hourglass_top</span>
                  </div>
                  <div class="min-w-0">
                    <span class="font-bold text-on-surface text-sm truncate block">${r.guardian_name}</span>
                    ${r.guardian_canevyn_id ? `<span class="text-[11px] font-mono text-secondary font-bold block">${r.guardian_canevyn_id}</span>` : ''}
                    <span class="text-xs text-primary font-medium block mt-0.5">Waiting for Authorized Member's response.</span>
                  </div>
                </div>
                <span class="px-2.5 py-1 rounded-full bg-primary-container/20 text-primary text-xs font-bold shrink-0">
                  Pending
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${rejectedItems.length > 0 ? `
        <div class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <h2 class="font-headline-md text-base text-error font-bold">Rejected Requests</h2>
              <span class="px-2 py-0.5 rounded-full bg-error-container text-error font-label-md text-xs font-bold">
                ${rejectedItems.length} Rejected
              </span>
            </div>
          </div>

          <div class="space-y-2.5">
            ${rejectedItems.map(r => `
              <div class="p-3.5 rounded-xl bg-surface-container border border-error/40 flex flex-col space-y-2.5 shadow-sm">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-lg bg-error-container/60 flex items-center justify-center text-error shrink-0">
                      <span class="material-symbols-outlined text-[20px]">person_off</span>
                    </div>
                    <div class="min-w-0">
                      <span class="font-bold text-on-surface text-sm truncate block">${r.guardian_name}</span>
                      ${r.guardian_canevyn_id ? `<span class="text-[11px] font-mono text-on-surface-variant block">${r.guardian_canevyn_id}</span>` : ''}
                      <span class="text-xs text-error font-medium block mt-0.5">Your connection request was rejected by ${r.guardian_name}.</span>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full bg-error-container text-error text-xs font-bold shrink-0">
                    Rejected
                  </span>
                </div>
                ${r.guardian_canevyn_id ? `
                  <div class="flex justify-end pt-1">
                    <button
                      type="button"
                      class="btn-rerequest-member min-h-[40px] px-3.5 rounded-lg bg-secondary/15 text-secondary hover:bg-secondary/25 border border-secondary/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      data-member-id="${r.guardian_canevyn_id}"
                      data-member-name="${r.guardian_name}"
                      data-rel-label="${r.relationship_label || 'Family / Caregiver'}"
                    >
                      <span class="material-symbols-outlined text-[16px]">refresh</span>
                      <span>Send New Request</span>
                    </button>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

export function renderUserGuardianConnectedContent(guardians = []) {
  const activeMembers = guardians.filter(g => g.status === 'approved' && Boolean(g.is_active));

  return `
    <div class="flex flex-col space-y-3">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <h2 class="font-headline-md text-base text-on-surface font-bold">Connected Family & Caregivers</h2>
          <span class="px-2.5 py-0.5 rounded-full bg-surface-container-high text-secondary font-label-md text-xs font-bold">${activeMembers.length}</span>
        </div>
        <span class="font-label-md text-xs text-secondary flex items-center gap-1 font-bold">
          <span class="material-symbols-outlined text-[16px]">check_circle</span> Live Link Active
        </span>
      </div>

      ${activeMembers.length === 0 ? `
        <div class="p-6 rounded-2xl bg-surface-container text-center space-y-2 border border-surface-container-high">
          <span class="material-symbols-outlined text-[36px] text-on-surface-variant">group_off</span>
          <p class="font-label-md text-sm text-on-surface font-semibold">No active caregivers connected yet</p>
          <p class="text-xs text-on-surface-variant max-w-xs mx-auto">
            Enter your family member's Authorized Member ID above to send them a connection request.
          </p>
        </div>
      ` : `
        <div class="space-y-3">
          ${activeMembers.map(m => `
            <article class="p-4 rounded-xl bg-surface-container flex flex-col space-y-3.5 shadow-sm border border-secondary/30">
              <div class="flex items-start gap-3.5">
                <div class="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-surface-container-highest flex items-center justify-center text-primary">
                  <span class="material-symbols-outlined text-[28px]">shield_person</span>
                  <span class="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-secondary"></span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1">
                    <h3 class="font-bold text-on-surface text-base truncate">${m.guardian_name}</h3>
                    <span class="px-2 py-0.5 rounded-md bg-secondary/15 text-secondary font-label-md text-xs shrink-0 font-bold">
                      Accepted
                    </span>
                  </div>
                  ${m.guardian_canevyn_id ? `
                    <span class="inline-block mt-0.5 font-mono text-xs text-secondary font-bold">
                      ${m.guardian_canevyn_id}
                    </span>
                  ` : ''}
                  <span class="inline-block ml-1 mt-0.5 font-label-md text-xs text-primary font-bold">
                    • ${m.relationship_label || 'Family / Caregiver'}
                  </span>
                  ${m.guardian_phone ? `
                    <p class="font-body-md text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                      <span class="material-symbols-outlined text-[15px] text-secondary">phone</span>
                      <span>${m.guardian_phone}</span>
                    </p>
                  ` : ''}
                </div>
              </div>

              <!-- Permitted Access Notice -->
              <div class="p-2.5 rounded-lg bg-surface-container-low flex items-center gap-2 border border-surface-container-high text-xs text-on-surface-variant">
                <span class="material-symbols-outlined text-secondary text-[18px]">verified</span>
                <span>Can view live location, battery, and receive hardware SOS alerts.</span>
              </div>

              <!-- Revoke Connection Button -->
              <div class="pt-1 flex justify-end">
                <button
                  type="button"
                  data-rel-id="${m.id}"
                  data-guardian-name="${m.guardian_name}"
                  class="btn-revoke-guardian min-h-[44px] px-3.5 rounded-lg bg-surface-container-highest text-error font-bold text-xs flex items-center gap-1.5 hover:bg-error-container hover:text-on-error-container transition-colors border border-error/30"
                >
                  <span class="material-symbols-outlined text-[16px]">person_remove</span>
                  <span>Revoke Connection</span>
                </button>
              </div>
            </article>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

export function renderUserGuardianScreen({
  guardians = [],
  pendingRequests = [],
  currentUserId = 'CVN-10482',
  searchResult = null,
  searchError = '',
  searchedMemberId = '',
  connectionBanner = null
}) {
  return `
    <main class="flex-1 flex flex-col relative w-full pt-20 pb-28 bg-surface overflow-y-auto">
      <div class="flex flex-col w-full px-4 py-3 space-y-5 max-w-lg mx-auto">

        <!-- Live Connection Request Status Notification Container -->
        <div id="userGuardianBannerSlot">
          ${renderConnectionStatusBanner(connectionBanner)}
        </div>

        <!-- Screen Identity & Accessible Voice Header -->
        <header class="flex flex-col space-y-3">
          <div class="flex items-center justify-between">
            <h1 class="font-headline-xl-mobile text-headline-xl-mobile text-on-surface font-bold">Authorized Members</h1>
            <button aria-label="Read page summary out loud" class="min-w-[56px] min-h-[56px] rounded-xl bg-surface-container-high text-primary flex items-center justify-center active:scale-95 transition-transform hover:bg-surface-bright" id="voice-read-page">
              <span class="material-symbols-outlined text-[30px]">volume_up</span>
            </button>
          </div>

          <!-- My CaneVyn User ID Shareable Card -->
          <div class="p-4 rounded-xl bg-surface-container-high border-2 border-secondary/40 flex flex-col space-y-2 shadow-md">
            <div class="flex items-center justify-between">
              <span class="font-label-md text-xs uppercase tracking-wider text-secondary font-bold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px]">badge</span>
                <span>Your CaneVyn User ID</span>
              </span>
              <span class="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-xs font-bold">Voice-Enabled</span>
            </div>
            <div class="flex items-center justify-between bg-surface-container-lowest p-3 rounded-lg border border-surface-container-high">
              <span id="userMyIdText" class="font-mono text-base text-on-surface font-bold select-all">${currentUserId}</span>
              <div class="flex items-center gap-1">
                <button id="btnCopyUserId" title="Copy User ID" class="min-h-[40px] px-2.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs font-bold text-on-surface flex items-center gap-1 transition-colors">
                  <span class="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>Copy</span>
                </button>
                <button id="btnSpeakUserId" title="Speak User ID" class="min-h-[40px] px-2.5 rounded-lg bg-secondary/15 text-secondary hover:bg-secondary/25 text-xs font-bold flex items-center gap-1 transition-colors">
                  <span class="material-symbols-outlined text-[16px]">volume_up</span>
                  <span>Speak</span>
                </button>
              </div>
            </div>
            <p class="text-xs text-on-surface-variant leading-tight">
              Say <em>"Repeat my ID"</em> anytime to hear this code.
            </p>
          </div>
        </header>

        <!-- SECTION 1: Connect with Family or Caregiver (Blind User Initiates Request) -->
        <section aria-label="Connect with Family or Caregiver" class="p-4 rounded-2xl bg-surface-container border-2 border-secondary/30 shadow-lg space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-11 h-11 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0 border border-secondary/30">
              <span class="material-symbols-outlined text-[24px]">person_add</span>
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="font-headline-md text-lg text-on-surface font-bold">Connect with Family or Caregiver</h2>
              <p class="font-body-md text-xs text-on-surface-variant mt-0.5 leading-snug">
                Ask your family member for their <strong>Authorized Member ID</strong> (e.g. CVM-12345) to link them to your cane.
              </p>
            </div>
          </div>

          <!-- Search Form (No public list of members displayed) -->
          <form id="memberSearchForm" class="space-y-3">
            <div>
              <label for="memberIdSearchInput" class="block font-label-md text-xs uppercase tracking-wider text-on-surface mb-1.5 font-bold">
                Authorized Member ID
              </label>
              <div class="relative flex items-center">
                <input
                  id="memberIdSearchInput"
                  type="text"
                  required
                  placeholder="e.g. CVM-12345"
                  value="${searchedMemberId || ''}"
                  autocomplete="off"
                  autocapitalize="characters"
                  spellcheck="false"
                  class="w-full min-h-[56px] pl-4 pr-12 rounded-xl glass-panel border border-secondary/30 text-on-surface text-[17px] font-mono uppercase focus:border-secondary focus:outline-none shadow-sm"
                />
                <button
                  type="submit"
                  id="btnSearchMember"
                  aria-label="Search Authorized Member ID"
                  class="absolute right-1.5 min-w-[46px] min-h-[46px] rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center hover:bg-secondary transition-all"
                >
                  <span class="material-symbols-outlined text-[22px]">search</span>
                </button>
              </div>
            </div>

            <!-- Error Banner -->
            ${searchError ? `
              <div id="memberSearchErrorBanner" class="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-semibold border border-error flex items-start gap-2">
                <span class="material-symbols-outlined text-[18px] shrink-0 text-error">error</span>
                <span>${searchError}</span>
              </div>
            ` : ''}

            <!-- Search Result Card -->
            ${searchResult ? `
              <div class="p-4 rounded-xl bg-surface-container-high border-2 border-secondary flex flex-col space-y-3 shadow-md">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold">
                      <span class="material-symbols-outlined text-[22px]">shield_person</span>
                    </div>
                    <div>
                      <h3 class="font-bold text-on-surface text-base">${searchResult.full_name}</h3>
                      <span class="text-xs text-on-surface-variant font-mono">ID: ${searchResult.member_id}</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold ${
                    searchResult.connection_status === 'approved' ? 'bg-secondary/20 text-secondary' :
                    searchResult.connection_status === 'pending' ? 'bg-primary-container/20 text-primary' :
                    searchResult.connection_status === 'rejected' ? 'bg-error-container text-error' :
                    'bg-surface-container text-on-surface'
                  }">
                    ${searchResult.connection_status === 'approved' ? 'Accepted' :
                      searchResult.connection_status === 'pending' ? 'Pending' :
                      searchResult.connection_status === 'rejected' ? 'Rejected' : 'Verified Member'}
                  </span>
                </div>

                ${searchResult.connection_status === 'approved' ? `
                  <p class="text-xs text-secondary font-medium flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px]">check_circle</span>
                    You are already connected with ${searchResult.full_name}.
                  </p>
                ` : searchResult.connection_status === 'pending' ? `
                  <div class="p-2.5 rounded-lg bg-primary-container/15 text-primary text-xs flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">hourglass_top</span>
                    <span>Waiting for Authorized Member's response.</span>
                  </div>
                ` : `
                  ${searchResult.connection_status === 'rejected' ? `
                    <p class="text-xs text-error font-medium">
                      Your previous request was rejected by ${searchResult.full_name}. You can send a new request below.
                    </p>
                  ` : ''}
                  <button
                    type="button"
                    id="btnSendRequestToMember"
                    data-member-id="${searchResult.member_id}"
                    data-member-name="${searchResult.full_name}"
                    class="w-full min-h-[54px] rounded-xl bg-secondary-container text-on-secondary-container hover:bg-secondary font-headline-md text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-all shadow-md"
                  >
                    <span class="material-symbols-outlined text-[20px]">send</span>
                    <span>${searchResult.connection_status === 'rejected' ? `Send New Request to ${searchResult.full_name}` : `Send Connection Request to ${searchResult.full_name}`}</span>
                  </button>
                `}
              </div>
            ` : ''}
          </form>
        </section>

        <!-- SECTION 2: Pending & Rejected Connection Requests (Targeted Update Container) -->
        <section id="userGuardianRequestsSection" aria-label="Connection Request Statuses">
          ${renderUserGuardianRequestsContent(guardians)}
        </section>

        <!-- SECTION 3: Active Approved Members (Targeted Update Container) -->
        <section id="userGuardianConnectedSection" aria-label="Active Authorized Members">
          ${renderUserGuardianConnectedContent(guardians)}
        </section>

        <!-- End-to-End Privacy Reassurance Card -->
        <footer class="p-4 rounded-xl bg-surface-container-low flex items-start gap-3.5 border border-surface-container-high" role="contentinfo">
          <div class="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-secondary shrink-0">
            <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">lock</span>
          </div>
          <div class="flex flex-col space-y-0.5">
            <h3 class="font-bold text-on-surface text-sm">Privacy & Access Control</h3>
            <p class="text-xs text-on-surface-variant leading-relaxed">
              You maintain full authority over who monitors your smart stick. No location or battery data is shared until you send a request and the member accepts it. You can revoke access at any time.
            </p>
          </div>
        </footer>

      </div>
    </main>
  `;
}
