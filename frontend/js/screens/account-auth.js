/**
 * Canevyn Account Sign In / Create Account Screen
 * Visual source of truth: canevyn_account_sign_in_or_create_account
 * Invariant: Uses "Create Account", never "Create ID".
 * Features:
 * - Role-specific authentication for Canevyn User and Authorized Member
 * - Full Name, Email, Password, Confirm Password, Phone Number
 * - Show/Hide password toggle on all password fields
 * - Password and email validation with persistent form fields
 * - Forgot Password reset workflow
 * - Strict production layout (No demo auto-fill bypass)
 */

export function renderAccountAuthScreen({ role = 'canevyn_user', mode = 'options', formData = {} }) {
  const isUser = role === 'canevyn_user';
  const roleTitle = isUser ? 'Canevyn User' : 'Authorized Member';
  const roleSubtitle = isUser ? 'Primary Assisted Mobility Mode' : 'Family & Caregiver Safety Mode';

  // Forgot Password Mode
  if (mode === 'forgot') {
    const emailVal = formData.email || '';
    return `
      <main class="flex-1 flex flex-col justify-start items-center relative w-full pt-safe pb-safe min-h-screen px-4 py-6 overflow-y-auto">
        <div class="flex flex-col w-full px-2 sm:px-4 py-2 space-y-4 max-w-lg mx-auto pb-12">
          
          <!-- Top Header Navigation -->
          <header class="flex items-center justify-between py-1">
            <button id="authBackBtn" aria-label="Return to Sign In" class="flex items-center justify-center min-w-[56px] min-h-[56px] rounded-xl bg-surface-container text-on-surface active:bg-surface-container-high transition-colors focus:outline-none">
              <span class="material-symbols-outlined text-[28px]">arrow_back</span>
            </button>
            <div class="flex items-center gap-2">
              <img src="/static/assets/images/canevyn-logo.png" alt="Canevyn Official Logo" class="w-10 h-10 rounded-full object-contain shadow-sm" />
              <span class="font-headline-md text-headline-md tracking-tight text-on-surface font-bold">Canevyn</span>
            </div>
            <div aria-label="Audio Guidance Available" class="flex items-center justify-center min-w-[56px] min-h-[56px] rounded-xl bg-surface-container text-secondary">
              <span class="material-symbols-outlined text-[26px]">record_voice_over</span>
            </div>
          </header>

          <!-- Main Headline -->
          <div class="mt-2">
            <h1 class="font-headline-xl-mobile text-headline-xl-mobile text-on-surface font-bold">
              Forgot Password
            </h1>
            <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">
              Enter your registered email address and we'll dispatch password recovery instructions.
            </p>
          </div>

          <!-- Forgot Password Form -->
          <form id="forgotForm" class="space-y-4 mt-2">
            <div>
              <label for="forgotEmailInput" class="block font-label-md text-label-md text-on-surface mb-1.5 font-bold">Email Address</label>
              <input id="forgotEmailInput" type="email" required placeholder="name@example.com" value="${emailVal}" class="w-full min-h-[58px] px-4 rounded-xl glass-panel border border-secondary/30 text-on-surface text-[17px] focus:border-secondary focus:outline-none shadow-sm" />
            </div>

            <!-- Error Banner -->
            <div id="forgotErrorMsg" class="hidden p-3.5 rounded-xl bg-error-container text-on-error-container text-sm font-semibold border border-error flex items-start gap-2">
              <span class="material-symbols-outlined text-[20px] shrink-0 text-error">error</span>
              <span id="forgotErrorText" class="leading-snug"></span>
            </div>

            <!-- Success Banner -->
            <div id="forgotSuccessMsg" class="hidden p-3.5 rounded-xl bg-secondary/15 text-secondary text-sm font-semibold border border-secondary flex items-start gap-2">
              <span class="material-symbols-outlined text-[20px] shrink-0 text-secondary">check_circle</span>
              <span id="forgotSuccessText" class="leading-snug"></span>
            </div>

            <!-- Submit Button -->
            <button type="submit" id="forgotSubmitBtn" class="w-full min-h-[64px] bg-secondary-container text-on-secondary-container hover:bg-secondary active:scale-[0.99] font-headline-md text-headline-md rounded-xl flex items-center justify-between px-5 font-bold shadow-lg shadow-secondary/15 transition-all">
              <span id="forgotSubmitText">Send Reset Link</span>
              <span id="forgotSubmitIcon" class="material-symbols-outlined text-[30px]">mail</span>
            </button>

            <div class="text-center pt-2">
              <button type="button" id="returnToSigninBtn" class="text-sm text-secondary hover:underline font-bold">
                Return to Sign In
              </button>
            </div>
          </form>

        </div>
      </main>
    `;
  }

  // Sign In or Create Account Mode
  if (mode === 'signin' || mode === 'create') {
    const isCreate = mode === 'create';
    const nameVal = formData.name || '';
    const emailVal = formData.email || '';
    const pwdVal = formData.password || '';
    const confirmPwdVal = formData.confirmPassword || '';
    const phoneVal = formData.phone || '';

    return `
      <main class="flex-1 flex flex-col justify-start items-center relative w-full pt-safe pb-safe min-h-screen px-4 py-6 overflow-y-auto">
        <div class="flex flex-col w-full px-2 sm:px-4 py-2 space-y-4 max-w-lg mx-auto pb-12">
          
          <!-- Top Header Navigation -->
          <header class="flex items-center justify-between py-1">
            <button id="authBackBtn" aria-label="Return to Options" class="flex items-center justify-center min-w-[56px] min-h-[56px] rounded-xl bg-surface-container text-on-surface active:bg-surface-container-high transition-colors focus:outline-none">
              <span class="material-symbols-outlined text-[28px]">arrow_back</span>
            </button>
            <div class="flex items-center gap-2">
              <img src="/static/assets/images/canevyn-logo.png" alt="Canevyn Official Logo" class="w-10 h-10 rounded-full object-contain shadow-sm" />
              <span class="font-headline-md text-headline-md tracking-tight text-on-surface font-bold">Canevyn</span>
            </div>
            <div aria-label="Audio Guidance Available" class="flex items-center justify-center min-w-[56px] min-h-[56px] rounded-xl bg-surface-container text-secondary">
              <span class="material-symbols-outlined text-[26px]">record_voice_over</span>
            </div>
          </header>

          <!-- Role Selection Tabs (Choose between Blind User and Authorized Member) -->
          <div class="w-full space-y-2">
            <div class="flex items-center justify-between px-1">
              <span class="font-label-md text-xs uppercase tracking-wider text-on-surface font-bold">
                Account Type <span class="text-secondary">*</span>
              </span>
              <span class="text-xs text-secondary font-bold">
                ${isUser ? 'Primary User' : 'Family / Caregiver'}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-surface-container-high/90 border border-secondary/30 shadow-sm" role="radiogroup" aria-label="Choose Account Role">
              <button
                type="button"
                id="selectRoleUserBtn"
                role="radio"
                aria-checked="${isUser ? 'true' : 'false'}"
                class="min-h-[50px] py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-label-md text-sm font-bold transition-all ${
                  isUser
                    ? 'bg-secondary text-surface shadow-md shadow-secondary/25'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                }"
              >
                <span class="material-symbols-outlined text-[22px]">accessibility_new</span>
                <span>Blind User</span>
              </button>
              <button
                type="button"
                id="selectRoleGuardianBtn"
                role="radio"
                aria-checked="${!isUser ? 'true' : 'false'}"
                class="min-h-[50px] py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-label-md text-sm font-bold transition-all ${
                  !isUser
                    ? 'bg-secondary text-surface shadow-md shadow-secondary/25'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60'
                }"
              >
                <span class="material-symbols-outlined text-[22px]">shield_person</span>
                <span>Authorized Member</span>
              </button>
            </div>
            <p class="text-xs text-on-surface-variant px-1 leading-snug">
              ${isUser
                ? 'Voice-first assistive navigation with smart stick telemetry.'
                : 'Monitor a blind traveler\'s live location, battery, and safety status.'}
            </p>
          </div>

          <!-- Main Headline -->
          <div class="mt-2">
            <h1 class="font-headline-xl-mobile text-headline-xl-mobile text-on-surface font-bold">
              ${isCreate ? 'Create Account' : 'Sign In'}
            </h1>
            <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">
              ${isCreate ? 'Set up your credentials to link your hardware stick & cloud profile.' : 'Access your existing profile, paired cane stick, and settings.'}
            </p>
          </div>

          <!-- Authentication Form -->
          <form id="authForm" class="space-y-4 mt-2">
            ${isCreate ? `
              <div>
                <label for="authNameInput" class="block font-label-md text-label-md text-on-surface mb-1.5 font-bold">Full Name</label>
                <input id="authNameInput" type="text" required placeholder="${isUser ? 'e.g. Arthur Vance' : 'e.g. Sarah Vance'}" value="${nameVal}" class="w-full min-h-[58px] px-4 rounded-xl glass-panel border border-secondary/30 text-on-surface text-[17px] focus:border-secondary focus:outline-none shadow-sm" />
              </div>
            ` : ''}

            <div>
              <label for="authEmailInput" class="block font-label-md text-label-md text-on-surface mb-1.5 font-bold">Email Address</label>
              <input id="authEmailInput" type="email" required placeholder="name@example.com" value="${emailVal}" class="w-full min-h-[58px] px-4 rounded-xl glass-panel border border-secondary/30 text-on-surface text-[17px] focus:border-secondary focus:outline-none shadow-sm" />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="authPasswordInput" class="font-label-md text-label-md text-on-surface font-bold">Password ${isCreate ? '<span class="text-secondary">*</span>' : ''}</label>
                ${!isCreate ? `
                  <button type="button" id="btnForgotPassword" class="text-xs text-secondary hover:underline font-bold focus:outline-none">
                    Forgot Password?
                  </button>
                ` : ''}
              </div>
              <div class="relative flex items-center">
                <input id="authPasswordInput" type="password" required minlength="6" placeholder="Enter password (min 6 characters)" value="${pwdVal}" class="w-full min-h-[58px] pl-4 pr-12 rounded-xl glass-panel border border-secondary/30 text-on-surface text-[17px] focus:border-secondary focus:outline-none shadow-sm transition-colors" />
                <button type="button" id="togglePasswordVisibilityBtn" aria-label="Toggle password visibility" class="absolute right-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant hover:text-secondary focus:outline-none">
                  <span class="material-symbols-outlined text-[22px]" id="passwordVisibilityIcon">visibility</span>
                </button>
              </div>
              ${isCreate ? '<p class="text-xs text-on-surface-variant mt-1">Must be at least 6 characters.</p>' : ''}
            </div>

            ${isCreate ? `
              <div class="p-3.5 rounded-xl bg-surface-container/60 border border-secondary/25">
                <label for="authConfirmPasswordInput" class="block font-label-md text-label-md text-on-surface mb-1.5 font-bold">Confirm Password <span class="text-secondary">*</span></label>
                <div class="relative flex items-center">
                  <input id="authConfirmPasswordInput" type="password" required minlength="6" placeholder="Re-enter your password" value="${confirmPwdVal}" class="w-full min-h-[58px] pl-4 pr-12 rounded-xl glass-panel border border-secondary/40 text-on-surface text-[17px] focus:border-secondary focus:outline-none shadow-sm transition-colors" />
                  <button type="button" id="toggleConfirmPasswordVisibilityBtn" aria-label="Toggle confirm password visibility" class="absolute right-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant hover:text-secondary focus:outline-none">
                    <span class="material-symbols-outlined text-[22px]" id="confirmPasswordVisibilityIcon">visibility</span>
                  </button>
                </div>
                <div id="passwordMatchIndicator" class="text-xs mt-1.5 flex items-center gap-1.5 text-on-surface-variant">
                  <span class="material-symbols-outlined text-[16px] text-secondary">info</span>
                  <span id="passwordMatchText">Re-type your password to confirm it matches.</span>
                </div>
              </div>

              <div>
                <label for="authPhoneInput" class="block font-label-md text-label-md text-on-surface mb-1.5 font-bold">Phone Number (Optional)</label>
                <input id="authPhoneInput" type="tel" placeholder="(415) 555-0100" value="${phoneVal}" class="w-full min-h-[58px] px-4 rounded-xl glass-panel border border-secondary/30 text-on-surface text-[17px] focus:border-secondary focus:outline-none shadow-sm" />
              </div>
            ` : ''}

            <!-- Error Banner -->
            <div id="authErrorMsg" class="hidden p-3.5 rounded-xl bg-error-container text-on-error-container text-sm font-semibold border border-error flex items-start gap-2">
              <span class="material-symbols-outlined text-[20px] shrink-0 text-error">error</span>
              <span id="authErrorText" class="leading-snug"></span>
            </div>

            <!-- Success Banner -->
            <div id="authSuccessMsg" class="hidden p-3.5 rounded-xl bg-secondary/15 text-secondary text-sm font-semibold border border-secondary flex items-start gap-2">
              <span class="material-symbols-outlined text-[20px] shrink-0 text-secondary">check_circle</span>
              <span id="authSuccessText" class="leading-snug"></span>
            </div>

            <!-- Submit Button (64px min height) -->
            <button type="submit" id="authSubmitBtn" class="w-full min-h-[64px] bg-secondary-container text-on-secondary-container hover:bg-secondary active:scale-[0.99] font-headline-md text-headline-md rounded-xl flex items-center justify-between px-5 font-bold shadow-lg shadow-secondary/15 transition-all">
              <span id="authSubmitText">${isCreate ? 'Create Account & Continue' : 'Sign In to Canevyn'}</span>
              <span id="authSubmitIcon" class="material-symbols-outlined text-[30px]">arrow_forward</span>
            </button>

            <!-- Mode Switch Links -->
            <div class="text-center pt-2">
              ${isCreate ? `
                <p class="text-sm text-on-surface-variant">
                  Already have an account?
                  <button type="button" id="linkToSignin" class="text-secondary hover:underline font-bold ml-1 focus:outline-none">
                    Sign In
                  </button>
                </p>
              ` : `
                <p class="text-sm text-on-surface-variant">
                  Don't have an account?
                  <button type="button" id="linkToCreate" class="text-secondary hover:underline font-bold ml-1 focus:outline-none">
                    Create Account
                  </button>
                </p>
              `}
            </div>
          </form>

        </div>
      </main>
    `;
  }

  // Options View: Sign In or Create Account
  return `
    <main class="flex-1 flex flex-col justify-center relative w-full pt-safe pb-safe min-h-screen px-4 py-6 overflow-y-auto">
      <div class="flex flex-col w-full max-w-md mx-auto space-y-5">

        <!-- Top Navigation & Role Bar -->
        <header class="flex items-center justify-between py-1">
          <button aria-label="Return to Role Selection" class="flex items-center justify-center min-w-[56px] min-h-[56px] rounded-xl glass-panel text-on-surface active:bg-surface-container-high transition-colors focus:outline-none" id="btn-back-role" type="button">
            <span class="material-symbols-outlined text-[28px]">arrow_back</span>
          </button>
          <div class="flex items-center gap-2">
            <img src="/static/assets/images/canevyn-logo.png" alt="Canevyn Official Logo" class="w-10 h-10 rounded-full object-contain shadow-md" />
            <span class="font-headline-md text-headline-md tracking-tight text-on-surface font-bold">Canevyn</span>
          </div>
          <div aria-label="Audio Guidance Available" class="flex items-center justify-center min-w-[56px] min-h-[56px] rounded-xl glass-panel text-secondary">
            <span class="material-symbols-outlined text-[26px]">record_voice_over</span>
          </div>
        </header>

        <!-- Role Context Summary Pill -->
        <div class="w-full glass-panel rounded-xl p-3 flex items-center justify-between border border-secondary/30">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="material-symbols-outlined text-secondary text-[24px] shrink-0">verified_user</span>
            <div class="flex flex-col min-w-0">
              <span class="font-label-md text-xs text-on-surface font-bold truncate">Role: ${roleTitle}</span>
              <span class="font-body-md text-xs text-on-surface-variant leading-tight">${roleSubtitle}</span>
            </div>
          </div>
          <button class="min-h-[44px] px-3 rounded-lg bg-surface-container-high/80 text-secondary font-label-md text-xs hover:bg-surface-container-highest transition-colors shrink-0 font-bold border border-secondary/20" id="btn-change-role" type="button">
            Change
          </button>
        </div>

        <!-- Main Headline & Purpose -->
        <div class="mt-1">
          <h1 class="font-headline-lg text-[28px] text-on-surface font-bold tracking-tight">
            Welcome to Canevyn
          </h1>
          <p class="font-body-md text-[15px] text-on-surface-variant mt-1 leading-snug">
            Sign in to access your assistive navigation profile, or create a new Canevyn account in minutes.
          </p>
        </div>

        <!-- Account Action Options Stack -->
        <section aria-label="Account Access Options" class="flex flex-col space-y-3.5 w-full">
          
          <!-- Option A: Sign In -->
          <div class="w-full glass-panel-interactive rounded-2xl p-4 flex flex-col justify-between border border-secondary/20">
            <div class="flex items-start gap-3">
              <div class="w-11 h-11 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0 border border-secondary/30">
                <span class="material-symbols-outlined text-[24px]">lock_open</span>
              </div>
              <div class="flex flex-col min-w-0">
                <h2 class="font-headline-md text-lg text-on-surface font-bold">Sign In</h2>
                <p class="font-body-md text-xs text-on-surface-variant mt-0.5 leading-snug">
                  Access your existing profile, paired cane stick, and settings.
                </p>
              </div>
            </div>
            <button class="mt-3 w-full min-h-[56px] rounded-xl bg-surface-container-high/80 text-on-surface font-label-md text-sm font-bold flex items-center justify-between px-4 hover:bg-surface-bright transition-colors focus:outline-none border border-secondary/20" id="btn-action-signin" type="button">
              <span class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px] text-secondary">login</span>
                <span>Sign In to Canevyn</span>
              </span>
              <span class="material-symbols-outlined text-[20px] text-secondary">arrow_forward</span>
            </button>
          </div>

          <!-- Option B: Create Account (Refined Teal/Cyan Accent) -->
          <div class="w-full glass-panel-interactive rounded-2xl p-4 flex flex-col justify-between border border-secondary/30">
            <div class="flex items-start gap-3">
              <div class="w-11 h-11 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center shrink-0 border border-secondary/30">
                <span class="material-symbols-outlined text-[24px]">person_add</span>
              </div>
              <div class="flex flex-col min-w-0">
                <h2 class="font-headline-md text-lg text-on-surface font-bold">Create Account</h2>
                <p class="font-body-md text-xs text-on-surface-variant mt-0.5 leading-snug">
                  New to Canevyn? Set up your account and pair your physical hardware.
                </p>
              </div>
            </div>
            <button class="mt-3 w-full min-h-[64px] rounded-xl bg-secondary-container text-on-secondary-container font-label-lg text-base font-bold flex items-center justify-between px-4 hover:bg-secondary active:scale-[0.99] transition-all focus:outline-none shadow-md shadow-secondary/15" id="btn-action-create" type="button">
              <span class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[24px]">app_registration</span>
                <span>Create Account</span>
              </span>
              <span class="material-symbols-outlined text-[24px]">arrow_forward</span>
            </button>
          </div>

        </section>

        <!-- Compact Bottom Assurance -->
        <footer class="w-full glass-panel rounded-xl p-3 flex items-center gap-2.5 border border-secondary/20 text-on-surface-variant text-xs">
          <span class="material-symbols-outlined text-secondary text-[20px] shrink-0">security</span>
          <p class="leading-tight">
            <strong class="text-on-surface font-semibold">Secure Canevyn Cloud & BLE:</strong> Encrypted link with your Canevyn smart cane hardware.
          </p>
        </footer>

      </div>
    </main>
  `;
}
