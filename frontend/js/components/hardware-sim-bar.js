
import { appConfig } from '../config.js';

export function renderHardwareSimulatorBar(deviceManager) {
 
  if (!appConfig.isDevelopment) {
    return '';
  }

  const isSos = deviceManager.activeDevice.isSosActive;
  const isMock = deviceManager.mode === 'mock';
  const battery = deviceManager.activeDevice.batteryPercent;

  return `
    <div id="devHardwareSimDrawer" class="w-full bg-surface-container-lowest border-b-2 border-primary/30 p-2.5 text-xs text-on-surface-variant flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 font-bold text-primary">
          <span class="material-symbols-outlined text-[18px]">developer_board</span>
          <span>HARDWARE SIMULATOR [DEV ONLY]</span>
          <span class="px-2 py-0.5 rounded bg-surface-container-high text-[11px] text-secondary">${isMock ? 'Mock Hardware Layer' : 'Real Web BLE Client'}</span>
        </div>
        <button id="toggleSimControlsBtn" class="min-h-[32px] px-2 rounded bg-surface-container-high text-on-surface text-[11px] hover:bg-surface-container-highest">
          Toggle Controls
        </button>
      </div>

      <div id="simControlsPanel" class="flex flex-wrap items-center gap-2 pt-1 border-t border-surface-container-high">
        <!-- Physical Latch Pull Action -->
        <button id="simPullLatchBtn" class="min-h-[44px] px-3 rounded-lg ${isSos ? 'bg-error text-on-error animate-pulse font-bold' : 'bg-surface-container-high text-error hover:bg-surface-container-highest'} flex items-center gap-1.5 font-label-md text-label-md text-[13px]">
          <span class="material-symbols-outlined text-[18px]">emergency</span>
          <span>${isSos ? 'Latch Pulled (SOS Active)' : 'Pull Physical Cane Latch'}</span>
        </button>

        ${isSos ? `
          <button id="simResetLatchBtn" class="min-h-[44px] px-3 rounded-lg bg-secondary-container text-on-secondary-container font-label-md text-label-md text-[13px] flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[18px]">restart_alt</span>
            <span>Reset Physical Latch</span>
          </button>
        ` : ''}

        <!-- Toggle Connection -->
        <button id="simToggleConnBtn" class="min-h-[44px] px-3 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest flex items-center gap-1.5 text-[13px]">
          <span class="material-symbols-outlined text-[18px]">bluetooth</span>
          <span>Toggle Stick Link</span>
        </button>

        <!-- Battery Simulator -->
        <div class="flex items-center gap-1.5 bg-surface-container-high px-2.5 py-1.5 rounded-lg text-[13px]">
          <span class="material-symbols-outlined text-[18px] text-secondary">battery_charging_80</span>
          <span>Battery:</span>
          <button id="simBattLow" class="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-bright text-[11px]">18%</button>
          <button id="simBattNominal" class="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-bright text-[11px]">82%</button>
          <button id="simBattFull" class="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-bright text-[11px]">100%</button>
        </div>

        <!-- Mode Switcher -->
        <button id="simSwitchBleModeBtn" class="min-h-[44px] px-3 rounded-lg bg-surface-container-highest text-primary hover:bg-surface-bright flex items-center gap-1.5 text-[13px]">
          <span class="material-symbols-outlined text-[18px]">settings_bluetooth</span>
          <span>Switch to ${isMock ? 'Real Web Bluetooth' : 'Mock Simulator'}</span>
        </button>
      </div>
    </div>
  `;
}
