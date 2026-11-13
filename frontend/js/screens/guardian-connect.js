/**
 * Connect with a CaneVyn User Screen
 * Strict Privacy Requirement:
 * - Never shows registered users list or auto-suggestions.
 * - Authorized Member must manually enter the CaneVyn User ID.
 * - Shows pending, approved, and rejected statuses.
 */

export function renderGuardianConnectScreen({ searchResult = null, searchError = '', requests = [], searchedId = '' }) {
  return `
    <main class="flex-1 flex flex-col relative w-full pt- safe pb-28 min-h-screen">
      <div class="flex flex-col w-full px-4 py-4 space-y-5 max-w-lg mx-auto">

        <!-- Top Header Navigation -->
        <header class="flex items-center justify-between py-1">
          <button id="btnBackToGuardianDash" aria-label="Return to Dashboard" class="flex items-center justify-center min-w-[56px] min-h-[56px] rounded-xl bg-surface-container text-on-surface active:bg-surface-container-high transition-colors focus:outline-none">
            <span class="material-symbols-outlined text-[28px]">arrow_back</span>
          </button>
          <div class="flex items-center gap-2">
            <img src="/static/assets/images/canevyn-logo.png" alt="Canevyn Official Logo" class="w-10 h-10 rounded-full object-contain shadow-sm" />
            <span class="font-headline-md text-headline-md tracking-tight text-on-surface font-bold">Canevyn</span>
          </div>
          <div class="w-10"></div>
        </header>

        <!-- Main Title & Instructions -->
        <div class="mt-1">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary font-label-md text-xs font-bold border border-secondary/20">
              Family & Caregiver Safety Mode
            </span>
          </div>
          <h1 class="font-headline-xl-mobile text-headline-xl-mobile text-on-surface font-bold tracking-tight">
            Connect with a CaneVyn User
          </h1>
          <p class="font-body-md text-body-md text-on-surface-variant mt-1.5 leading-relaxed">
            Enter the unique CaneVyn User ID provided by the visually impaired user you wish to support. For privacy and safety, IDs must be entered manually.
          </p>
        </div>

        <!-- Search Input Card -->
        <section aria-label="Search CaneVyn User" class="w-full glass-panel rounded-2xl p-4 sm:p-5 shadow-lg border border-secondary/30 space-y-4">
          <div>
            <label for="connectUserIdInput" class="block font-label-md text-label-md text-on-surface mb-2 font-bold">
              CaneVyn User ID
            </label>
            <div class="flex flex-col sm:flex-row gap-2.5">
              <input
                id="connectUserIdInput"
                type="text"
                placeholder="Enter CaneVyn User ID"
                value="${searchedId}"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                class="flex-1 min-h-[58px] px-4 rounded-xl bg-surface-container-low border border-secondary/40 text-on-surface text-[17px] focus:border-secondary focus:outline-none shadow-sm"
              />
              <button
                type="button"
                id="btnSearchUserId"
                class="min-h-[58px] px-6 rounded-xl bg-secondary text-on-secondary font-headline-md text-base font-bold flex items-center justify-center gap-2 hover:bg-secondary-fixed active:scale-[0.98] transition-transform shadow-md shrink-0"
              >
                <span class="material-symbols-outlined text-[24px]">search</span>
                <span>Search</span>
              </button>
            </div>
            <p class="text-xs text-on-surface-variant mt-2 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-secondary">info</span>
              <span>Example: <strong class="text-on-surface font-mono">CVN-10482</strong></span>
            </p>
          </div>

          <!-- Error Message Display -->
          <div id="searchErrorBanner" class="${searchError ? '' : 'hidden'} p-3.5 rounded-xl bg-error-container text-on-error-container text-sm font-semibold border border-error flex items-start gap-2.5">
            <span class="material-symbols-outlined text-[22px] shrink-0 text-error">error</span>
            <span id="searchErrorText" class="leading-snug">${searchError || 'No CaneVyn user found. Please check the ID.'}</span>
          </div>

          <!-- User ID Verification Result Card -->
          <div id="searchResultCard" class="${searchResult ? '' : 'hidden'} p-4 rounded-xl bg-surface-container-high border border-secondary/40 space-y-3.5">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-secondary/20 text-secondary flex items-center justify-center shrink-0 border border-secondary/30">
                <span class="material-symbols-outlined text-[28px]">blind</span>
              </div>
              <div class="min-w-0 flex-1">
                <span class="text-xs uppercase tracking-wider text-secondary font-bold block">User Verified</span>
                <h3 id="foundUserName" class="text-lg text-on-surface font-bold truncate">
                  ${searchResult ? searchResult.full_name : ''}
                </h3>
                <span id="foundUserId" class="text-xs text-on-surface-variant font-mono">
                  ${searchResult ? searchResult.canevyn_user_id : ''}
                </span>
              </div>
            </div>

            ${searchResult && searchResult.connection_status === 'approved' ? `
              <div class="p-3 rounded-lg bg-secondary/15 text-secondary text-sm font-semibold flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px]">check_circle</span>
                <span>You are already connected with this user!</span>
              </div>
            ` : searchResult && searchResult.connection_status === 'pending' ? `
              <div class="p-3 rounded-lg bg-primary-container/20 text-primary text-sm font-semibold flex items-center gap-2 border border-primary/30">
                <span class="material-symbols-outlined text-[20px]">hourglass_top</span>
                <span>Connection request is already pending their approval.</span>
              </div>
            ` : `
              <div>
                <label for="relationshipLabelInput" class="block text-xs font-bold text-on-surface-variant mb-1">
                  Your Relationship to Traveler
                </label>
                <select id="relationshipLabelInput" class="w-full min-h-[46px] px-3 rounded-lg bg-surface-container text-on-surface text-sm border border-secondary/30 focus:outline-none focus:border-secondary">
                  <option value="Primary Guardian (Son)">Primary Guardian (Son)</option>
                  <option value="Family Member (Daughter)">Family Member (Daughter)</option>
                  <option value="Family Member (Spouse)">Family Member (Spouse)</option>
                  <option value="Family Member / Relative">Family Member / Relative</option>
                  <option value="Caregiver / Specialist">Caregiver / Specialist</option>
                  <option value="Personal Physician">Personal Physician</option>
                </select>
              </div>

              <button
                type="button"
                id="btnSendConnectRequest"
                class="w-full min-h-[56px] rounded-xl bg-secondary-container text-on-secondary-container hover:bg-secondary font-headline-md text-base font-bold flex items-center justify-between px-5 shadow-lg active:scale-[0.99] transition-all"
              >
                <span>Send Connection Request</span>
                <span class="material-symbols-outlined text-[26px]">send</span>
              </button>
            `}
          </div>

        </section>

        <!-- Privacy & Protection Guarantee Banner -->
        <section class="p-4 rounded-xl bg-surface-container-low border border-surface-container-high flex items-start gap-3">
          <span class="material-symbols-outlined text-secondary text-[24px] mt-0.5 shrink-0" style="font-variation-settings: 'FILL' 1;">shield</span>
          <div class="text-xs text-on-surface-variant leading-relaxed">
            <strong class="text-on-surface font-semibold block text-sm mb-0.5">Privacy First Policy:</strong>
            The blind traveler must approve your request in their CaneVyn app before any live GPS, stick battery telemetry, or emergency alerts are shared with you.
          </div>
        </section>

        <!-- My Connection Requests (Pending, Approved, Rejected) -->
        <section aria-label="My Connection Requests" class="space-y-3 pt-1">
          <div class="flex items-center justify-between px-1">
            <h2 class="font-headline-md text-lg text-on-surface font-bold">
              My Sent Connection Requests
            </h2>
            <span class="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-md text-xs font-bold">
              ${requests.length} Total
            </span>
          </div>

          ${requests.length === 0 ? `
            <div class="p-6 rounded-2xl bg-surface-container text-center space-y-2 border border-surface-container-high">
              <span class="material-symbols-outlined text-[36px] text-on-surface-variant">person_search</span>
              <p class="font-label-md text-sm text-on-surface font-semibold">No connection requests yet</p>
              <p class="text-xs text-on-surface-variant max-w-xs mx-auto">
                Search for a CaneVyn User ID above to send your first connection request.
              </p>
            </div>
          ` : `
            <div class="space-y-2.5">
              ${requests.map(r => {
                const isApproved = r.status === 'approved';
                const isPending = r.status === 'pending';
                const isRejected = r.status === 'rejected';

                const statusColor = isApproved
                  ? 'bg-secondary/15 text-secondary border-secondary/30'
                  : isPending
                  ? 'bg-primary-container/20 text-primary border-primary/30'
                  : 'bg-error-container/40 text-error border-error/30';

                const statusIcon = isApproved ? 'check_circle' : isPending ? 'hourglass_top' : 'cancel';
                const statusLabel = isApproved ? 'Approved' : isPending ? 'Pending Approval' : 'Declined';

                return `
                  <div class="p-3.5 rounded-xl bg-surface-container border border-surface-container-high flex flex-col space-y-2.5 shadow-sm">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <h3 class="font-bold text-on-surface text-base truncate">${r.canevyn_user_name}</h3>
                          <span class="px-2 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${statusColor}">
                            <span class="material-symbols-outlined text-[14px]">${statusIcon}</span>
                            ${statusLabel}
                          </span>
                        </div>
                        <p class="text-xs text-on-surface-variant mt-0.5 font-mono">${r.canevyn_user_id}</p>
                      </div>
                      ${isApproved ? `
                        <button
                          data-user-id="${r.canevyn_user_id}"
                          class="btn-switch-monitored min-h-[38px] px-3 rounded-lg bg-secondary text-on-secondary text-xs font-bold hover:bg-secondary-fixed transition-colors shrink-0"
                        >
                          View Live Safety
                        </button>
                      ` : isPending ? `
                        <button
                          data-rel-id="${r.id}"
                          class="btn-cancel-sent-request min-h-[36px] px-2.5 rounded-lg bg-surface-container-high hover:bg-error-container/30 text-on-surface-variant hover:text-error text-xs font-bold border border-surface-container-high transition-colors shrink-0 flex items-center gap-1"
                        >
                          <span class="material-symbols-outlined text-[15px]">close</span>
                          <span>Cancel</span>
                        </button>
                      ` : ''}
                    </div>

                    <div class="flex items-center justify-between text-xs text-on-surface-variant border-t border-surface-container-high/60 pt-2">
                      <span>Role: ${r.relationship_label}</span>
                      <span>${r.created_at ? r.created_at.split('T')[0] : ''}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </section>

      </div>
    </main>
  `;
}
