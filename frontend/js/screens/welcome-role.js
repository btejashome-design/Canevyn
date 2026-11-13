/**
 * Canevyn Welcome & Role Selection Screen
 * Clean, balanced, modern dark aesthetic with teal/cyan accents.
 * Preserves Canevyn logo, branding, and dual-role architecture.
 */

export function renderWelcomeRoleScreen(selectedRole = 'canevyn_user') {
  const isUser = selectedRole === 'canevyn_user';

  return `
    <main class="flex-1 flex flex-col justify-center items-center relative w-full pt-safe pb-safe min-h-screen px-4 py-8 overflow-y-auto">
      <div class="flex flex-col w-full max-w-md mx-auto space-y-6">
        
        <!-- Header: Centered Official Logo, Title & Tagline -->
        <header class="flex flex-col items-center justify-center text-center pt-2">
          <div class="relative p-1 rounded-full border border-secondary/30 shadow-xl bg-surface-container/60">
            <img 
              src="/static/assets/images/canevyn-logo.png" 
              alt="Canevyn Official Logo" 
              class="w-16 h-16 rounded-full object-contain" 
            />
          </div>
          <h1 class="font-headline-lg text-[32px] font-bold text-on-surface tracking-tight mt-3">
            Canevyn
          </h1>
          <p class="font-body-md text-[15px] text-on-surface-variant text-center max-w-sm mt-1 px-3 leading-relaxed">
            Smart assistive mobility system for visually impaired travelers & guardians.
          </p>
        </header>

        <!-- Role Selection Cards Stack -->
        <div aria-label="Select your role" class="flex flex-col space-y-4 w-full" role="group">
          
          <!-- Card 1: CaneVyn User -->
          <div 
            id="roleUserCard" 
            role="button" 
            tabindex="0" 
            aria-label="Canevyn User: Primary User. Voice-first guidance, obstacle alerts and accessible navigation."
            class="group w-full glass-panel-interactive rounded-2xl p-5 cursor-pointer relative flex flex-col justify-between border ${isUser ? 'border-secondary shadow-lg shadow-secondary/10' : 'border-secondary/20'}"
          >
            <!-- Top Row: Icon + Label Badge -->
            <div class="flex items-center justify-between">
              <div class="w-12 h-12 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center border border-secondary/30 shrink-0">
                <span class="material-symbols-outlined text-[28px]">accessibility_new</span>
              </div>
              <span class="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container/20 text-secondary font-label-md text-xs font-bold border border-secondary/30">
                Primary User
              </span>
            </div>

            <!-- Middle: Title & Description -->
            <div class="mt-3">
              <h2 class="font-headline-md text-[22px] font-bold text-on-surface tracking-tight group-hover:text-secondary transition-colors">
                Canevyn User
              </h2>
              <p class="font-body-md text-[15px] text-on-surface-variant mt-1 leading-snug">
                Voice-first guidance, obstacle alerts and accessible navigation.
              </p>
            </div>

            <!-- Bottom Row: Compact Contrast Feature + Right Arrow -->
            <div class="mt-4 pt-3 border-t border-surface-container-high/60 flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 text-xs text-secondary/90 font-medium">
                <span class="material-symbols-outlined text-[16px] text-secondary">contrast</span>
                High-Contrast Mode
              </span>
              <div class="w-10 h-10 rounded-full bg-surface-container-high/80 text-secondary flex items-center justify-center border border-secondary/30 group-hover:bg-secondary group-hover:text-on-secondary transition-all">
                <span class="material-symbols-outlined text-[22px]">arrow_forward</span>
              </div>
            </div>
          </div>

          <!-- Card 2: Authorized Member -->
          <div 
            id="roleGuardianCard" 
            role="button" 
            tabindex="0" 
            aria-label="Authorized Member: Family and Caregiver. Monitor shared location, battery status, device connectivity and emergency alerts."
            class="group w-full glass-panel-interactive rounded-2xl p-5 cursor-pointer relative flex flex-col justify-between border ${!isUser ? 'border-secondary shadow-lg shadow-secondary/10' : 'border-secondary/20'}"
          >
            <!-- Top Row: Icon + Label Badge -->
            <div class="flex items-center justify-between">
              <div class="w-12 h-12 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center border border-secondary/30 shrink-0">
                <span class="material-symbols-outlined text-[28px]">shield_person</span>
              </div>
              <span class="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container/20 text-secondary font-label-md text-xs font-bold border border-secondary/30">
                Family & Caregiver
              </span>
            </div>

            <!-- Middle: Title & Description -->
            <div class="mt-3">
              <h2 class="font-headline-md text-[22px] font-bold text-on-surface tracking-tight group-hover:text-secondary transition-colors">
                Authorized Member
              </h2>
              <p class="font-body-md text-[15px] text-on-surface-variant mt-1 leading-snug">
                Monitor shared location, battery status, device connectivity and emergency alerts.
              </p>
            </div>

            <!-- Bottom Row: Compact Telemetry Feature + Right Arrow -->
            <div class="mt-4 pt-3 border-t border-surface-container-high/60 flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 text-xs text-secondary/90 font-medium">
                <span class="material-symbols-outlined text-[16px] text-secondary">monitor_heart</span>
                Live Telemetry & Alerts
              </span>
              <div class="w-10 h-10 rounded-full bg-surface-container-high/80 text-secondary flex items-center justify-center border border-secondary/30 group-hover:bg-secondary group-hover:text-on-secondary transition-all">
                <span class="material-symbols-outlined text-[22px]">arrow_forward</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Compact Bottom Assurance -->
        <footer class="w-full glass-panel rounded-xl p-3 flex items-center gap-2.5 border border-secondary/20 text-on-surface-variant text-xs">
          <span class="material-symbols-outlined text-secondary text-[20px] shrink-0">verified_user</span>
          <p class="leading-tight">
            <strong class="text-on-surface font-semibold">Hardware Emergency Latch:</strong> Physical Canevyn stick is the sole trigger for emergency alerts.
          </p>
        </footer>

      </div>
    </main>
  `;
}
