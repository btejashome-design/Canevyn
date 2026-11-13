/**
 * Canevyn Notifications & Alerts Screen
 * Visual source of truth: user_notifications_alerts
 */

export function renderUserNotificationsScreen({ notifications = [], currentCategory = 'all', onSelectCategory, onSpeakNotification, onReadAll }) {
  // Default notifications matching the authoritative Stitch mock if empty
  const defaultList = [
    {
      id: '1',
      category: 'emergency',
      badge_text: 'EMERGENCY RESOLVED',
      timestamp: 'Today, 2:44 PM',
      title: 'Hardware SOS Cancelled',
      subtitle: 'Physical latch pressed to cancel emergency broadcast.',
      body: 'Automated confirmation dispatched to Marcus & Dr. Elena. Cane status safe.',
      meta_pill: 'Verified by Latch'
    },
    {
      id: '2',
      category: 'hardware',
      badge_text: 'HARDWARE WARNING',
      timestamp: 'Yesterday, 8:15 PM',
      title: 'Stick Battery at 18%',
      subtitle: 'Below 20% safety threshold for haptic navigation.',
      body: 'Remember to dock the Canevyn Smart Stick onto the magnetic bedside charging cradle.',
      meta_pill: 'Dock Needed'
    },
    {
      id: '3',
      category: 'hardware',
      badge_text: 'SYSTEM STATUS',
      timestamp: 'Yesterday, 3:20 PM',
      title: 'Canevyn Stick 04 Connected',
      subtitle: 'Telemetry handshake restored via Bluetooth LE.',
      body: 'LiDAR ground radar and inertial sensors calibrated successfully for outdoor navigation.',
      meta_pill: 'Sync Normal'
    },
    {
      id: '4',
      category: 'guardian',
      badge_text: 'GUARDIAN ACTIVITY',
      timestamp: 'Yesterday, 1:05 PM',
      title: 'Arrival Check Confirmed',
      subtitle: 'Guardian Marcus reviewed safe transit ping.',
      body: 'Destination reached safely at 742 Market St. Geofence radius marked as secure.',
      meta_pill: 'Family Loop'
    }
  ];

  const items = notifications && notifications.length > 0 ? notifications : defaultList;

  return `
    <div class="flex-1 flex flex-col relative w-full pt-20 pb-28 bg-surface">
      <div class="flex flex-col w-full px-4 py-2 space-y-5 max-w-lg mx-auto">

        <!-- Top Accessibility Header Announcement & Audio Trigger -->
        <div class="w-full bg-surface-container-high rounded-xl p-4 flex flex-col gap-3 shadow-md">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary-container text-[28px]" style="font-variation-settings: 'FILL' 1;">notifications_active</span>
              <h1 class="font-headline-md text-headline-md text-on-surface">Alerts Center</h1>
            </div>
            <span class="px-3 py-1 bg-surface-container-highest text-secondary font-label-md text-label-md rounded-full">${items.length} New</span>
          </div>
          <p class="font-body-md text-body-md text-on-surface-variant">
            High-contrast auditory log. Tap any alert card or voice button to hear full telemetry details.
          </p>
          <!-- Large Voice Action Button (72px min-height compliant) -->
          <button class="w-full min-h-[72px] bg-primary-container text-on-primary-container font-label-lg text-label-lg rounded-xl flex items-center justify-between px-5 shadow-lg active:scale-[0.98] transition-transform" id="btn-read-all">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-on-primary-container/15 flex items-center justify-center">
                <span class="material-symbols-outlined text-on-primary-container text-[30px]" id="audio-icon">volume_up</span>
              </div>
              <span class="font-bold text-left" id="read-all-label">Read All Notifications</span>
            </div>
            <span class="material-symbols-outlined text-[28px]">play_circle</span>
          </button>
        </div>

        <!-- Horizontal Scroll Filter / Status Tabs (56px targets) -->
        <div aria-label="Filter alerts by category" class="w-full flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none" role="tablist">
          <button aria-selected="${currentCategory === 'all' ? 'true' : 'false'}" class="filter-tab min-h-[56px] px-5 rounded-xl font-label-md text-label-md ${currentCategory === 'all' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface'} whitespace-nowrap shadow-sm active:scale-95 transition-all" data-category="all" role="tab">
            All Alerts (${items.length})
          </button>
          <button aria-selected="${currentCategory === 'emergency' ? 'true' : 'false'}" class="filter-tab min-h-[56px] px-5 rounded-xl font-label-md text-label-md ${currentCategory === 'emergency' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface'} whitespace-nowrap active:scale-95 transition-all" data-category="emergency" role="tab">
            Emergency Events
          </button>
          <button aria-selected="${currentCategory === 'hardware' ? 'true' : 'false'}" class="filter-tab min-h-[56px] px-5 rounded-xl font-label-md text-label-md ${currentCategory === 'hardware' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface'} whitespace-nowrap active:scale-95 transition-all" data-category="hardware" role="tab">
            Stick Status
          </button>
          <button aria-selected="${currentCategory === 'guardian' ? 'true' : 'false'}" class="filter-tab min-h-[56px] px-5 rounded-xl font-label-md text-label-md ${currentCategory === 'guardian' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface'} whitespace-nowrap active:scale-95 transition-all" data-category="guardian" role="tab">
            Guardian Updates
          </button>
        </div>

        <!-- Notification Cards Feed -->
        <div class="flex flex-col space-y-4" id="alert-feed">
          ${items.map((n, idx) => {
            const isEmerg = n.category === 'emergency';
            const isHw = n.category === 'hardware';
            const isGuard = n.category === 'guardian';
            const isRemoved = n.title === 'Connection Removed' || n.badge_text === 'Connection Removed';
            const displayTime = n.timestamp || (n.created_at ? new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Today');
            const speechText = n.spoken_narration || `${n.title}. ${n.subtitle || ''}. ${n.body || ''}`;

            let badgeClass = 'bg-surface-container-highest text-secondary';
            let iconName = 'info';
            if (isRemoved) {
              badgeClass = 'bg-error-container text-error';
              iconName = 'person_remove';
            } else if (isEmerg) {
              badgeClass = 'bg-secondary-container text-on-secondary-container';
              iconName = 'check_circle';
            } else if (isHw && n.title.includes('Battery')) {
              badgeClass = 'bg-primary-container text-on-primary-container';
              iconName = 'battery_alert';
            } else if (isHw) {
              badgeClass = 'bg-surface-container-highest text-secondary';
              iconName = 'bluetooth_connected';
            } else if (isGuard) {
              badgeClass = 'bg-surface-container-highest text-tertiary';
              iconName = 'person_check';
            }

            return `
              <article class="notification-card w-full bg-surface-container rounded-xl p-4 flex flex-col gap-3 shadow-md focus-within:ring-2 focus-within:ring-secondary transition-all" data-category="${n.category}">
                <div class="flex items-center justify-between flex-wrap gap-2">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${badgeClass} font-label-md text-label-md font-bold">
                    <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">${iconName}</span>
                    ${n.badge_text || (n.category || '').toUpperCase()}
                  </span>
                  <span class="font-label-md text-label-md text-on-surface-variant">${displayTime}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <h2 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">${n.title}</h2>
                  <p class="font-body-lg text-body-lg ${isRemoved ? 'text-error' : (isEmerg || (isHw && n.title.includes('Battery')) ? 'text-primary' : 'text-on-surface')} font-bold">${n.subtitle || ''}</p>
                  <p class="font-body-md text-body-md text-on-surface-variant">${n.body || ''}</p>
                </div>
                <!-- Action Row (56px touch target minimum) -->
                <div class="pt-2 flex items-center justify-between gap-3">
                  <button aria-label="Listen to ${n.title} announcement" class="voice-card-btn min-h-[56px] px-4 rounded-xl bg-surface-container-highest text-secondary flex items-center gap-2 font-label-md text-label-md font-bold active:scale-95 transition-transform" data-idx="${idx}" data-speech="${speechText}">
                    <span class="material-symbols-outlined text-[24px]">volume_up</span>
                    <span>Speak Alert</span>
                  </button>
                  <span class="px-2.5 py-1 text-on-surface-variant text-label-md font-label-md bg-surface-container-high rounded">${n.is_read ? 'Read' : (n.meta_pill || 'Unread')}</span>
                </div>
              </article>
            `;
          }).join('')}
        </div>

        <!-- Visual Delight & Tactile Reassurance Card -->
        <div class="w-full rounded-xl bg-surface-container-low p-4 flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-secondary/15 flex-shrink-0 flex items-center justify-center text-secondary">
            <span class="material-symbols-outlined text-[26px]">hearing</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-lg text-label-lg text-on-surface font-bold">Audio Accessibility Active</span>
            <span class="font-body-md text-body-md text-on-surface-variant">All tactile taps generate soft acoustic clicks on Canevyn audio headphones.</span>
          </div>
        </div>

        <!-- Large Clear Notifications Action Button (min-h 64px) -->
        <div class="w-full pt-2">
          <button class="w-full min-h-[64px] rounded-xl bg-surface-container-high text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-transform" id="btn-clear-non-critical">
            <span class="material-symbols-outlined text-[26px] text-on-surface-variant">clear_all</span>
            <span>Clear Non-Critical Notifications</span>
          </button>
        </div>

      </div>
    </div>
  `;
}
