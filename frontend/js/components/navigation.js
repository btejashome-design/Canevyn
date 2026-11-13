

export function renderBottomNav(activeTab = 'home') {
  const getTabClasses = (tabName) => {
    return activeTab === tabName
      ? 'text-primary-container font-bold'
      : 'text-on-surface-variant hover:text-on-surface focus:text-primary-container';
  };

  return `
    <nav aria-label="Primary Canevyn navigation" class="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-low/95 backdrop-blur-xl shadow-[0_-2px_16px_rgba(0,0,0,0.4)]">
      <div class="h-20 flex items-center justify-around px-1 max-w-lg mx-auto">
        <!-- 1. Home Tab -->
        <button data-tab="home" class="nav-tab-btn min-h-[56px] min-w-[56px] flex flex-col items-center justify-center gap-0.5 focus:outline-none ${getTabClasses('home')}">
          <span class="material-symbols-outlined text-[28px]">home</span>
          <span class="font-label-md text-label-md">Home</span>
        </button>

        <!-- 2. Location Tab -->
        <button data-tab="location" class="nav-tab-btn min-h-[56px] min-w-[56px] flex flex-col items-center justify-center gap-0.5 focus:outline-none ${getTabClasses('location')}">
          <span class="material-symbols-outlined text-[28px]">near_me</span>
          <span class="font-label-md text-label-md">Location</span>
        </button>

        <!-- 3. Central Voice CTA Tab (Elevated Circle) -->
        <div class="flex flex-col items-center -mt-5">
          <button data-tab="voice" aria-label="Activate Voice Assistant" class="nav-tab-btn h-16 w-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-[0_4px_16px_rgba(255,183,3,0.35)] active:scale-90 transition-transform focus:outline-none">
            <span class="material-symbols-outlined text-[34px]">mic</span>
          </button>
          <span class="font-label-md text-label-md font-bold text-primary-container mt-1">Voice</span>
        </div>

        <!-- 4. Guardian Tab -->
        <button data-tab="guardian" class="nav-tab-btn min-h-[56px] min-w-[56px] flex flex-col items-center justify-center gap-0.5 focus:outline-none ${getTabClasses('guardian')}">
          <span class="material-symbols-outlined text-[28px]">shield_person</span>
          <span class="font-label-md text-label-md">Guardian</span>
        </button>

        <!-- 5. Settings Tab -->
        <button data-tab="settings" class="nav-tab-btn min-h-[56px] min-w-[56px] flex flex-col items-center justify-center gap-0.5 focus:outline-none ${getTabClasses('settings')}">
          <span class="material-symbols-outlined text-[28px]">settings</span>
          <span class="font-label-md text-label-md">Settings</span>
        </button>
      </div>
    </nav>
  `;
}
