/**
 * Canevyn Authorized Member Dashboard Screen
 * Simplified layout structured around live family monitoring and future ESP32 hardware integration:
 * 1. Header (rendered globally by renderHeader)
 * 2. Connected Blind User (name, CVN-ID, connection status, multi-user selector)
 * 3. Live Location (map, coordinates, accuracy, last updated, status, single Full Map button)
 * 4. Device Status (genuine hardware status or clean "Hardware Not Connected" placeholder)
 * 5. Emergency Alerts (real SOS events & notifications from backend/ESP32)
 * 6. Quick Actions (Refresh Location + hardware-gated Ring Cane)
 * 7. Connection Management (Member ID, pending requests, Connect User, Remove Connection)
 */

import { formatGuardianLocationMeta, renderRemoveConnectionModal } from './guardian-location.js?v=4.6';

function _formatAlertTime(isoStr) {
  if (!isoStr) return '';
  try {
    const raw = (!isoStr.endsWith('Z') && !isoStr.includes('+') && !isoStr.includes('-', 10)) ? `${isoStr}Z` : isoStr;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

export function renderDeviceStatusCard(device = {}) {
  const dev = device || {};
  const hasHardware = Boolean(
    dev.is_hardware_integrated ||
    dev.is_connected
  );
  const isConnected = hasHardware && Boolean(dev.is_connected);

  if (!hasHardware) {
    return `
      <section id="guardianDeviceStatusSection" class="bg-surface-container rounded-2xl p-4 shadow-md border border-surface-container-high space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="material-symbols-outlined text-on-surface-variant text-[20px]">sensors_off</span>
            <h2 class="font-headline-md text-headline-md text-on-surface font-bold">Device Status</h2>
          </div>
          <span id="guardianDeviceStatusBadge" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-[11px] font-bold shrink-0">
            <span class="w-2 h-2 rounded-full bg-outline"></span>
            Hardware Not Connected
          </span>
        </div>
        <p class="font-body-md text-xs text-on-surface-variant leading-relaxed">
          No ESP32 smart stick hardware is paired with this user yet. Battery level, obstacle sensors, water alerts, and SOS latch telemetry will appear automatically once connected.
        </p>
      </section>
    `;
  }

  const realMetrics = [];
  if (dev.battery_percent !== null && dev.battery_percent !== undefined) {
    realMetrics.push({ icon: 'battery_std', label: 'Battery Level', value: `${dev.battery_percent}%` });
  }
  if (dev.connectivity_mode || dev.wifi_rssi !== undefined || dev.ble_rssi !== undefined) {
    const linkLabel = dev.connectivity_mode || (dev.is_connected ? 'BLE / Wi-Fi Online' : 'Offline');
    realMetrics.push({ icon: 'bluetooth_connected', label: 'Connectivity', value: linkLabel });
  }
  if (dev.obstacle_distance_cm !== null && dev.obstacle_distance_cm !== undefined) {
    realMetrics.push({
      icon: 'radar',
      label: 'Ultrasonic / ToF',
      value: `${dev.obstacle_distance_cm} cm${dev.obstacle_status ? ` (${dev.obstacle_status})` : ''}`
    });
  }
  if (dev.water_detected !== null && dev.water_detected !== undefined) {
    realMetrics.push({
      icon: 'water_drop',
      label: 'Water Sensor',
      value: dev.water_detected ? 'Water Detected' : 'Dry'
    });
  }
  if (dev.mpu6050_status || dev.fall_detected !== undefined) {
    realMetrics.push({
      icon: 'directions_walk',
      label: 'MPU6050 Motion',
      value: dev.fall_detected ? 'Fall / Impact Alert' : (dev.mpu6050_status || 'Normal')
    });
  }
  if (dev.sos_latch_state !== null && dev.sos_latch_state !== undefined) {
    realMetrics.push({
      icon: 'sos',
      label: 'Physical SOS Latch',
      value: String(dev.sos_latch_state)
    });
  }
  if (dev.vibration_active !== null && dev.vibration_active !== undefined) {
    realMetrics.push({
      icon: 'vibration',
      label: 'Vibration Motor',
      value: dev.vibration_active ? 'Active' : 'Standby'
    });
  }

  return `
    <section id="guardianDeviceStatusSection" class="bg-surface-container rounded-2xl p-4 shadow-md border border-surface-container-high space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="material-symbols-outlined ${isConnected ? 'text-secondary' : 'text-on-surface-variant'} text-[20px]">sensors</span>
          <div class="min-w-0">
            <h2 class="font-headline-md text-headline-md text-on-surface font-bold">Device Status</h2>
            ${dev.model ? `<p class="font-body-md text-[11px] text-on-surface-variant truncate">${dev.model}</p>` : ''}
          </div>
        </div>
        <span id="guardianDeviceStatusBadge" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isConnected ? 'bg-secondary/15 text-secondary border border-secondary/30' : 'bg-surface-container-high text-on-surface-variant'} font-label-md text-[11px] font-bold shrink-0">
          <span class="w-2 h-2 rounded-full ${isConnected ? 'bg-secondary' : 'bg-outline'}"></span>
          ${isConnected ? 'Hardware Connected' : 'Hardware Offline'}
        </span>
      </div>

      ${realMetrics.length > 0 ? `
        <div class="grid grid-cols-2 gap-2.5 text-xs">
          ${realMetrics.map(m => `
            <div class="bg-surface-container-low rounded-xl p-2.5 border border-surface-container-high flex items-start gap-2">
              <span class="material-symbols-outlined text-secondary text-[16px] shrink-0 mt-0.5">${m.icon}</span>
              <div class="min-w-0">
                <span class="block text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">${m.label}</span>
                <strong class="block text-on-surface text-xs truncate">${m.value}</strong>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <p class="font-body-md text-xs text-on-surface-variant">
          ${isConnected ? 'Hardware linked. Waiting for sensor packet telemetry.' : 'Smart stick is currently offline. Last recorded state is preserved.'}
        </p>
      `}
    </section>
  `;
}

function renderMemberShareIdCard(currentMemberId, currentUserName) {
  return `
    <div class="bg-surface-container-low rounded-xl p-3.5 border border-surface-container-high flex items-center justify-between gap-2">
      <div class="min-w-0">
        <span class="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">badge</span> Your Member ID (${currentUserName})
        </span>
        <div class="flex items-center gap-2 mt-1">
          <span id="guardianMemberIdValue" class="font-mono font-bold text-sm text-on-surface tracking-wide">${currentMemberId || 'Assigning...'}</span>
        </div>
        <p class="text-[11px] text-on-surface-variant mt-0.5">Share this ID so Blind Users can send a connection request.</p>
      </div>
      ${currentMemberId ? `
        <button id="btnCopyMemberId" data-id="${currentMemberId}" class="shrink-0 text-xs font-bold px-3 py-2 rounded-lg bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25 flex items-center gap-1" title="Copy Member ID">
          <span class="material-symbols-outlined text-[16px]">content_copy</span>
          <span>Copy</span>
        </button>
      ` : ''}
    </div>
  `;
}

function renderConnectionRequestsLists(incomingRequests = []) {
  const pendingIncoming = (incomingRequests || []).filter(r => r.status === 'pending');

  if (pendingIncoming.length === 0) {
    return `
      <div class="bg-surface-container-low rounded-xl p-3.5 border border-surface-container-high text-center">
        <p class="text-xs text-on-surface-variant">No pending incoming connection requests.</p>
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div class="bg-surface-container-low rounded-xl p-3.5 space-y-2.5 border border-secondary/35">
        <span class="font-label-md text-xs font-bold text-secondary flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">person_add</span>
          Incoming Connection Requests (${pendingIncoming.length})
        </span>
        <div class="space-y-2">
          ${pendingIncoming.map(r => `
            <div class="p-3 bg-surface-container rounded-xl border border-surface-container-high space-y-2">
              <div class="flex justify-between items-start gap-2">
                <div class="min-w-0">
                  <p class="text-xs font-bold text-on-surface truncate">${r.blind_user_name || r.user_name || 'CaneVyn Traveler'}</p>
                  <p class="text-[11px] text-on-surface-variant font-mono">${r.blind_user_canevyn_id || r.user_canevyn_id || ''} · ${r.relationship_label || 'Family / Caregiver'}</p>
                </div>
                <span class="text-[10px] font-bold text-secondary px-2 py-0.5 rounded bg-secondary/10">Pending</span>
              </div>
              <div class="flex gap-2">
                <button data-rel-id="${r.relationship_id}" data-action="approve" data-user-name="${r.blind_user_name || r.user_name || 'Traveler'}" class="btn-member-respond flex-1 py-2 px-3 rounded-lg bg-secondary text-surface font-bold text-xs flex items-center justify-center gap-1 hover:brightness-110">
                  <span class="material-symbols-outlined text-[16px]">check_circle</span>
                  Accept
                </button>
                <button data-rel-id="${r.relationship_id}" data-action="reject" data-user-name="${r.blind_user_name || r.user_name || 'Traveler'}" class="btn-member-respond py-2 px-3 rounded-lg bg-error-container text-on-error-container border border-error/40 font-bold text-xs flex items-center justify-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">close</span>
                  Decline
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderEmergencyAlertsSection(activeSosAlert = null, guardianNotifications = []) {
  const alerts = (guardianNotifications || []).slice(0, 5);
  const hasAny = Boolean(activeSosAlert) || alerts.length > 0;

  return `
    <section id="guardianEmergencyAlertsSection" class="bg-surface-container rounded-2xl p-4 shadow-md border border-surface-container-high space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="material-symbols-outlined ${activeSosAlert ? 'text-error' : 'text-secondary'} text-[20px]">notifications_active</span>
          <h2 class="font-headline-md text-headline-md text-on-surface font-bold">Emergency Alerts</h2>
        </div>
        ${alerts.length > 0 ? `
          <span class="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-bold">
            ${alerts.length} recent
          </span>
        ` : ''}
      </div>

      ${activeSosAlert ? `
        <div class="rounded-xl p-3.5 bg-error-container text-on-error-container border border-error/50 flex items-center justify-between gap-3">
          <div class="flex items-start gap-2.5 min-w-0">
            <span class="material-symbols-outlined text-error text-[24px] shrink-0 mt-0.5">warning</span>
            <div class="min-w-0">
              <p class="font-bold text-sm truncate">Active Emergency SOS: ${activeSosAlert.user_name || 'Connected User'}</p>
              <p class="text-xs opacity-90 truncate">${activeSosAlert.sos_type || 'Hardware SOS Triggered'}${activeSosAlert.triggered_at ? ` · ${_formatAlertTime(activeSosAlert.triggered_at)}` : ''}</p>
            </div>
          </div>
          <button id="btnViewActiveSos" type="button" class="px-3 py-1.5 rounded-lg bg-error text-on-error font-bold text-xs shrink-0 hover:opacity-95">
            Inspect
          </button>
        </div>
      ` : ''}

      ${hasAny ? (
        alerts.length > 0 ? `
          <div class="space-y-2" id="guardianAlertsList">
            ${alerts.map(n => {
              const isEmergency = n.type === 'emergency' || n.type === 'sos' || (n.title || '').toLowerCase().includes('sos') || (n.title || '').toLowerCase().includes('emergency');
              const timeStr = _formatAlertTime(n.created_at);
              return `
                <div class="p-3 rounded-xl border ${isEmergency ? 'bg-error-container/40 border-error/40' : 'bg-surface-container-low border-surface-container-high'} flex items-start justify-between gap-2">
                  <div class="flex items-start gap-2.5 min-w-0">
                    <span class="material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${isEmergency ? 'text-error' : 'text-secondary'}">
                      ${isEmergency ? 'e911_emergency' : 'info'}
                    </span>
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-on-surface">${n.title || 'Alert'}</p>
                      ${n.body ? `<p class="text-[11px] text-on-surface-variant mt-0.5 leading-snug">${n.body}</p>` : ''}
                      ${timeStr ? `<span class="block text-[10px] text-on-surface-variant mt-1">${timeStr}</span>` : ''}
                    </div>
                  </div>
                  ${!n.is_read ? `<span class="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-[10px] font-bold shrink-0">New</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''
      ) : `
        <div class="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high flex items-center gap-2.5 text-on-surface-variant">
          <span class="material-symbols-outlined text-[20px] text-secondary shrink-0">verified_user</span>
          <p class="text-xs">No emergency alerts or hardware notifications right now.</p>
        </div>
      `}
    </section>
  `;
}

function renderEmptyGuardianView({ incomingRequests = [], currentMemberId = '', currentUserName = 'Caregiver', guardianNotifications = [] }) {
  return `
    <div class="flex-1 flex flex-col relative w-full pt-24 pb-16 bg-surface min-h-screen">
      <div class="flex flex-col w-full px-4 space-y-5 max-w-lg mx-auto">

        <!-- Empty State Connected User Card -->
        <section class="glass-panel rounded-2xl p-6 text-center space-y-4 shadow-lg mt-1">
          <div class="w-14 h-14 mx-auto rounded-full bg-secondary/15 text-secondary flex items-center justify-center border border-secondary/30">
            <span class="material-symbols-outlined text-[30px]">diversity_3</span>
          </div>
          <div class="space-y-1.5">
            <h2 class="font-headline-md text-lg text-on-surface font-bold">No Blind Users Connected</h2>
            <p class="font-body-md text-xs text-on-surface-variant leading-relaxed">
              Share your unique <strong class="text-secondary font-mono">CVM-</strong> ID with a CaneVyn Blind User. When they send a connection request, you can review and accept it under Incoming Connection Requests below.
            </p>
          </div>
        </section>

        ${renderEmergencyAlertsSection(null, guardianNotifications)}

        <!-- 7. Connection Management -->
        <section id="guardianConnectionManagementSection" class="bg-surface-container rounded-2xl p-4 shadow-md border border-surface-container-high space-y-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary text-[20px]">manage_accounts</span>
            <h2 class="font-headline-md text-headline-md text-on-surface font-bold">Connection Management</h2>
          </div>
          ${renderMemberShareIdCard(currentMemberId, currentUserName)}
          ${renderConnectionRequestsLists(incomingRequests)}
        </section>

      </div>
    </div>
  `;
}

export function renderGuardianDashboardScreen({
  monitoredUser = null,
  monitoredUsers = [],
  latestTelemetry = null,
  requests = [],
  incomingRequests = [],
  currentMemberId = '',
  currentUserName = 'Caregiver',
  showSwitcher = false,
  pendingRemoveUser = null,
  guardianNotifications = [],
  activeSosAlert = null
}) {
  if (!monitoredUser) {
    return renderEmptyGuardianView({ requests, incomingRequests, currentMemberId, currentUserName, guardianNotifications });
  }

  const user = monitoredUser;
  const activeId = user.user_id || user.id || user.canevyn_user_id;
  const tel = latestTelemetry || {};
  const loc = tel.location || {};
  const device = {
    ...(user.is_hardware_integrated || user.is_connected
      ? { id: user.device_id, model: user.device_model, battery_percent: user.battery_percent, is_connected: user.is_connected, is_hardware_integrated: true }
      : {}),
    ...(tel.device || {})
  };
  const hasHardware = Boolean(device.is_hardware_integrated || device.is_connected);
  const isHardwareConnected = hasHardware && Boolean(device.is_connected);
  const canRingCane = isHardwareConnected && Boolean(device.supports_remote_ring);
  const meta = formatGuardianLocationMeta(loc);
  const travelerName = user.user_name || user.full_name || 'Connected User';

  return `
    <div class="flex-1 flex flex-col relative w-full pt-24 pb-16 bg-surface min-h-screen">
      <div class="flex flex-col w-full px-4 space-y-5 max-w-lg mx-auto">

        <!-- 2. Connected Blind User -->
        <section id="guardianConnectedUserSection" class="bg-surface-container rounded-2xl p-4 shadow-md border border-surface-container-high space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-12 h-12 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center border border-secondary/30 shrink-0">
                <span class="material-symbols-outlined text-[26px]">person</span>
              </div>
              <div class="min-w-0">
                <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Connected Blind User</span>
                <div class="flex items-center gap-2 flex-wrap">
                  <h1 class="font-headline-md text-headline-md text-on-surface font-bold truncate">${travelerName}</h1>
                  <span class="text-xs font-mono font-bold text-secondary px-2 py-0.5 rounded bg-secondary/10 border border-secondary/20">${user.canevyn_user_id || 'CVN-USER'}</span>
                </div>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <span class="inline-flex items-center gap-1 text-[11px] font-bold text-secondary">
                    <span class="w-2 h-2 rounded-full bg-secondary"></span>
                    Connected
                  </span>
                  <span class="text-[11px] text-on-surface-variant">· ${user.relationship_label || 'Authorized Caregiver'}</span>
                </div>
              </div>
            </div>

            ${monitoredUsers.length > 1 ? `
              <button id="guardianSwitchProfileBtn" type="button" class="shrink-0 min-h-[42px] px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs font-bold text-on-surface border border-surface-container-highest flex items-center gap-1" title="Switch Blind User">
                <span class="material-symbols-outlined text-[18px] text-secondary">swap_horiz</span>
                <span>Switch (${monitoredUsers.length})</span>
              </button>
            ` : ''}
          </div>

          ${showSwitcher && monitoredUsers.length > 1 ? `
            <div class="bg-surface-container-low rounded-xl p-2.5 space-y-1.5 border border-surface-container-highest">
              <p class="text-[11px] font-bold text-on-surface-variant px-1.5 uppercase tracking-wider">Select Connected User</p>
              ${monitoredUsers.map(u => {
                const uid = u.user_id || u.id || u.canevyn_user_id;
                const isSelected = uid === activeId;
                return `
                  <button data-switch-user-id="${uid}" class="btn-switch-monitored w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${isSelected ? 'bg-secondary/15 text-secondary font-bold border border-secondary/30' : 'text-on-surface hover:bg-surface-container-high'}">
                    <div class="min-w-0">
                      <span class="block text-xs truncate">${u.user_name || u.full_name}</span>
                      <span class="block text-[10px] font-mono opacity-80">${u.canevyn_user_id} · ${u.relationship_label || 'Connected'}</span>
                    </div>
                    ${isSelected ? '<span class="material-symbols-outlined text-[18px]">check_circle</span>' : '<span class="text-[11px] text-on-surface-variant">Select</span>'}
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}
        </section>

        <!-- 3. Live Location -->
        <section id="guardianLiveLocationSection" class="bg-surface-container rounded-2xl overflow-hidden shadow-md border border-surface-container-high">
          <div class="p-4 flex items-center justify-between gap-2 border-b border-surface-container-high">
            <div class="flex items-center gap-2 min-w-0">
              <span class="material-symbols-outlined text-secondary text-[20px]">location_on</span>
              <h2 class="font-headline-md text-headline-md text-on-surface font-bold">Live Location</h2>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span id="guardianDashGpsBadge" class="inline-flex items-center gap-1.5 font-label-md text-[11px] px-2.5 py-1 rounded-full bg-surface-container-high ${meta.isLive ? (meta.isStale ? 'text-primary' : 'text-secondary') : 'text-on-surface-variant'}">
                <span class="w-2 h-2 rounded-full ${meta.isLive ? (meta.isStale ? 'bg-primary-container' : 'bg-secondary animate-ping') : 'bg-outline'}"></span>
                <span>${meta.badgeText}</span>
              </span>
              <button id="guardianOpenLiveTrackingBtn" class="min-h-[38px] px-3 py-1.5 rounded-lg bg-secondary/15 text-secondary border border-secondary/30 font-bold text-xs flex items-center gap-1 hover:bg-secondary/25">
                <span>Full Map</span>
                <span class="material-symbols-outlined text-[15px]">open_in_full</span>
              </button>
            </div>
          </div>

          <!-- Interactive Live Map Preview -->
          <div class="relative w-full h-56 bg-surface-container-lowest">
            <div id="guardianDashboardMap" class="w-full h-full z-10"></div>
            <div id="guardianDashNoLocOverlay" class="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4 bg-surface-container-lowest/90 ${meta.isLive ? 'hidden' : ''}">
              <span class="material-symbols-outlined text-on-surface-variant text-[34px] mb-1">location_off</span>
              <span class="font-headline-md text-sm text-on-surface font-bold">Live Location Not Available</span>
              <span id="guardianDashOverlaySub" class="font-body-md text-xs text-on-surface-variant mt-0.5 max-w-xs">${meta.subReason}</span>
            </div>
          </div>

          <!-- Actual GPS Readout -->
          <div class="p-3.5 bg-surface-container-low border-t border-surface-container-high grid grid-cols-2 gap-2.5 text-xs">
            <div class="bg-surface-container rounded-lg p-2.5 border border-surface-container-high">
              <span class="text-[10px] text-on-surface-variant uppercase font-bold block">Coordinates</span>
              <strong id="guardianDashCoords" class="font-mono ${meta.isLive ? 'text-secondary' : 'text-on-surface-variant'}">${meta.coordsText}</strong>
            </div>
            <div class="bg-surface-container rounded-lg p-2.5 border border-surface-container-high">
              <span class="text-[10px] text-on-surface-variant uppercase font-bold block">GPS Accuracy</span>
              <strong id="guardianDashAccuracy" class="${meta.isApproximate ? 'text-primary' : 'text-on-surface'}">${meta.accuracyText}</strong>
            </div>
            <div class="bg-surface-container rounded-lg p-2.5 border border-surface-container-high">
              <span class="text-[10px] text-on-surface-variant uppercase font-bold block">Last Updated</span>
              <strong id="guardianDashUpdated" class="text-on-surface">${meta.updatedText}</strong>
            </div>
            <div class="bg-surface-container rounded-lg p-2.5 border border-surface-container-high">
              <span class="text-[10px] text-on-surface-variant uppercase font-bold block">Sharing Status</span>
              <strong id="guardianDashSharingStatus" class="${meta.isStale ? 'text-primary font-bold' : 'text-on-surface-variant'}">${meta.sharingText}</strong>
            </div>
          </div>
        </section>

        <!-- 4. Device Status (Real ESP32 telemetry only, clean placeholder otherwise) -->
        ${renderDeviceStatusCard(device)}

        <!-- 5. Emergency Alerts -->
        ${renderEmergencyAlertsSection(activeSosAlert, guardianNotifications)}

        <!-- 6. Quick Actions -->
        <section id="guardianQuickActionsSection" class="bg-surface-container rounded-2xl p-4 shadow-md border border-surface-container-high space-y-3">
          <h2 class="font-headline-md text-headline-md text-on-surface font-bold">Quick Actions</h2>
          <div class="grid grid-cols-2 gap-3">
            <button id="guardianDashRefreshBtn" type="button" class="min-h-[56px] px-3 py-2.5 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high flex flex-col items-center justify-center gap-1 hover:bg-surface-container-high active:scale-[0.98] transition-all">
              <span class="material-symbols-outlined text-secondary text-[22px]">refresh</span>
              <span class="font-label-md text-xs font-bold">Refresh Location</span>
            </button>

            <button
              id="audioLocatorBtn"
              type="button"
              ${canRingCane ? '' : 'disabled aria-disabled="true"'}
              title="${canRingCane ? 'Ring Cane audible locator' : (isHardwareConnected ? 'Unavailable (ESP32 Ring Command Pending Integration)' : 'Unavailable (Hardware Not Connected)')}"
              class="min-h-[56px] px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col items-center justify-center gap-0.5 transition-all ${canRingCane ? 'text-on-surface hover:bg-surface-container-high active:scale-[0.98]' : 'text-on-surface-variant opacity-60 cursor-not-allowed'}"
            >
              <span class="material-symbols-outlined text-[22px] ${canRingCane ? 'text-secondary' : 'text-on-surface-variant'}">sensors</span>
              <span class="font-label-md text-xs font-bold">Ring Cane</span>
              <span class="text-[10px] leading-tight ${canRingCane ? 'text-secondary' : 'text-on-surface-variant'}">${canRingCane ? 'Audible Beacon' : (isHardwareConnected ? 'Command Not Integrated' : 'Hardware Not Connected')}</span>
            </button>
          </div>
        </section>

        <!-- 7. Connection Management -->
        <section id="guardianConnectionManagementSection" class="bg-surface-container rounded-2xl p-4 shadow-md border border-surface-container-high space-y-3.5">
          <div class="flex items-center gap-2 min-w-0">
            <span class="material-symbols-outlined text-secondary text-[20px]">manage_accounts</span>
            <h2 class="font-headline-md text-headline-md text-on-surface font-bold">Connection Management</h2>
          </div>

          ${renderMemberShareIdCard(currentMemberId, currentUserName)}
          ${renderConnectionRequestsLists(incomingRequests)}

          <div class="pt-1 border-t border-surface-container-high space-y-2">
            <div class="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
              <span>Managing access for <strong class="text-on-surface">${travelerName}</strong></span>
              <span class="font-mono text-secondary">${user.canevyn_user_id || ''}</span>
            </div>
            <button
              id="btnRemoveConnection"
              data-rel-id="${user.relationship_id || ''}"
              data-user-name="${travelerName}"
              data-user-canevyn-id="${user.canevyn_user_id || ''}"
              type="button"
              class="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-error-container text-on-error-container border border-error/40 flex items-center justify-center gap-2 font-bold text-sm hover:brightness-95 active:scale-[0.98] transition-all"
            >
              <span class="material-symbols-outlined text-[20px]">link_off</span>
              <span>Remove Connection</span>
            </button>
          </div>
        </section>

      </div>

      ${renderRemoveConnectionModal(pendingRemoveUser)}

      <!-- Action Feedback Toast -->
      <div id="actionToast" class="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-50 bg-surface-container-highest text-on-surface px-4 py-3 rounded-xl shadow-2xl border border-secondary/40 flex items-center gap-3 transition-all duration-300 opacity-0 pointer-events-none translate-y-24">
        <span class="material-symbols-outlined text-secondary text-[22px] shrink-0">check_circle</span>
        <span class="font-body-md text-xs flex-1" id="toastMessage">Updated.</span>
        <button id="dismissToast" class="text-on-surface-variant hover:text-on-surface"><span class="material-symbols-outlined text-[18px]">close</span></button>
      </div>
    </div>
  `;
}
