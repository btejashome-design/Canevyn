---
name: Canevyn Sentinel
colors:
  surface: '#08122d'
  surface-dim: '#08122d'
  surface-bright: '#2f3855'
  surface-container-lowest: '#030c28'
  surface-container-low: '#111a36'
  surface-container: '#151e3a'
  surface-container-high: '#202945'
  surface-container-highest: '#2b3450'
  on-surface: '#dbe1ff'
  on-surface-variant: '#d5c4ac'
  inverse-surface: '#dbe1ff'
  inverse-on-surface: '#262f4c'
  outline: '#9e8f78'
  outline-variant: '#514532'
  surface-tint: '#ffba27'
  primary: '#ffdba0'
  on-primary: '#422c00'
  primary-container: '#ffb703'
  on-primary-container: '#6b4b00'
  inverse-primary: '#7d5800'
  secondary: '#40efb7'
  on-secondary: '#003827'
  secondary-container: '#00d29c'
  on-secondary-container: '#00543d'
  tertiary: '#ffd6da'
  on-tertiary: '#670023'
  tertiary-container: '#ffaeb9'
  on-tertiary-container: '#a3003c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdea9'
  primary-fixed-dim: '#ffba27'
  on-primary-fixed: '#271900'
  on-primary-fixed-variant: '#5e4100'
  secondary-fixed: '#54fdc4'
  secondary-fixed-dim: '#27e0a9'
  on-secondary-fixed: '#002116'
  on-secondary-fixed-variant: '#00513b'
  tertiary-fixed: '#ffd9dd'
  tertiary-fixed-dim: '#ffb2bc'
  on-tertiary-fixed: '#400013'
  on-tertiary-fixed-variant: '#910034'
  background: '#08122d'
  on-background: '#dbe1ff'
  surface-variant: '#2b3450'
typography:
  headline-xl:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg-mobile:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-xl:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 22px
    fontWeight: '400'
    lineHeight: 32px
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  label-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: 0.04em
  telemetry-num:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  margin: 1.25rem
  margin-tablet: 2rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 1.75rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is engineered specifically for mission-critical assistive hardware interaction and secondary guardian monitoring. The core brand ethos centers on absolute dependability, dignity through independent mobility, and calm vigilance.

### Audience Personas & Dual Mode
1. **Primary Mobility User (Visually Impaired / Low Vision):** Operates the interface via voice narration, screen-magnifiers, tactile audio feedback, and direct single-hand interactions. This experience demands ultra-high contrast, generous hitboxes (56px–72px minimum), distinct structural perimeters, and minimal cognitive noise.
2. **Guardian & Caregiver:** Demands immediate, telemetry-dense oversight. Focuses on real-time hardware status, live geospatial positioning, battery decay graphs, physical SOS incident alerts, and permission delegation.

### Aesthetic Paradigm
The design merges **High-Contrast Utilitarianism** with **Tactile Modernism**:
- Deep navy slate foundations eliminate glare, minimize optical fatigue, and provide a deep void against which status indicators glow with unmistakable clarity.
- Crisp, non-diffuse surfaces paired with tactile solid borders (never relying on blurred ambient shadows alone for edge detection).
- High visual priority anchors: Warm Safety Amber alerts the eye to actionable hardware changes without inducing panic; Vivid Alert Coral signals verified emergency states triggered exclusively by physical hardware.
- Zero ephemeral decorative motion or low-contrast micro-interactions. Every UI element conveys explicit state.

## Colors

The color palette is built around WCAG AAA compliance standards on dark surfaces, prioritizing retinal clarity, low optical aberration, and zero visual ambiguity.

### Color Roles & Hierarchy
- **Canvas Base (`#0B132B`):** Deepest slate obsidian for background grounding; maximizes power efficiency and reduces screen glare.
- **Surface Elevation (`#101B37` / `#1C2541`):** Structural container surfaces that distinctly elevate cards, interactive zones, and telemetry modules.
- **Interactive Border Surface (`#243254`):** Deliberate tactile framing for buttons, cards, and input fields to guarantee boundary legibility for low-vision users.
- **Primary Accent — Safety Amber (`#FFB703`):** High-luminance visual anchor. Used for primary non-emergency interactive controls, focus rings, selected states, and warning-level notifications.
- **Secondary Accent — Telemetry Mint (`#06D6A0`):** System vitality color. Signifies active cane Bluetooth Low Energy (BLE) tethering, valid satellite locks, and safe status indicators.
- **Tertiary Accent — Alert Coral (`#EF476F`):** Dedicated exclusively to emergency broadcast indicators, physical cane drop detection, geofence breaches, and incoming hardware-triggered SOS warnings.
- **Text & Content Layers:**
  - `Text-Primary` (`#FFFFFF`): 100% white for absolute maximum contrast ratio (>13:1 on surface layers).
  - `Text-Secondary` (`#CBD5E1`): High-legibility slate-tinted silver for secondary metrics, timestamps, and descriptive labels (>7:1 contrast ratio).
  - `Text-Inverse` (`#0B132B`): Used strictly inside solid accent-filled elements like amber badges and active primary buttons.

## Typography

The typography system is powered by **Atkinson Hyperlegible Next**, designed specifically for low-vision character differentiation (e.g., unambiguous glyph distinctions between `I`, `1`, `l`, and `|`, and open counters on `e`, `c`, and `o`).

### Rules & Formatting
- **Absolute Floor of 18px Base Body:** The default readable paragraph text never drops below 18px (`body-md`), preserving immediate readability without requiring native OS text zoom to remain functional.
- **Labels & Microcopy Floor:** The absolute minimum font size across the entire application is 16px (`label-md`), restricted strictly to metadata, sensor units, and status badge indicators.
- **Numbers & Telemetry:** Sensor statistics (speed, battery percentage, obstacle distance, signal strength) render using `telemetry-num` (36px, 800 weight) with tabular figures where applicable to prevent layout shift during live feeds.
- **Leading & Whitespace:** Generous line heights (minimum 1.4x to 1.5x font size) prevent line crowding, helping users with scotomas or peripheral vision constraints navigate lines effortlessly.

## Layout & Spacing

The layout model adapts to provide extreme reachability on mobile touch screens while maintaining modular data density for caregivers monitoring on tablets or foldables.

### Layout Philosophy
- **Fluid Single Column for Mobility Mode:** Visually impaired interactions use a single-column layout with zero horizontal panning or confusing nested columns. Content flows vertically with standardized full-width interactive cards.
- **Multi-Module Grid for Caregiver Mode:** When operating as guardian, screens reflow into 2-column dashboard grids on screens > 600px, isolating the interactive map module on the top or left half and telemetry readouts on the right.
- **Touch Target Integrity:** Every clickable element maintains an absolute minimum physical hit area of **56px × 56px**, with critical primary navigation actions stepping up to **72px height**. Spacing gaps between interactive targets are locked at no less than `space-md` (20px / 1.25rem) to completely eradicate accidental mis-taps.
- **Safe Area Insets:** Screen bottoms maintain a permanent elevated safety margin of `space-xl` (40px) above standard OS navigation bars to eliminate accidental swipes or system navigation interruptions.

## Elevation & Depth

This design system rejects fuzzy, low-contrast drop shadows. Impaired vision renders diffuse shadows muddy and indistinct. Instead, visual hierarchy and structural isolation are achieved through **tactile borders and tonal surface layering**.

### Elevation Scale
- **Level 0 (Base Canvas):** Solid `#0B132B`. The underlying canvas of the viewport.
- **Level 1 (Card & Module Layer):** Solid `#101B37` bounded by a crisp 2px perimeter border of `#1C2541`. Used for list groupings, guardian telemetry panels, and static info boxes.
- **Level 2 (Interactive Elements & Selectable Tiles):** Solid `#1C2541` encased with a 2px high-contrast border of `#243254`. When focused or tapped, the border immediately switches to a 3px solid `#FFB703` ring with an internal 2px black inset.
- **Level 3 (Modals, Action Sheets & Alerts):** Solid `#101B37` resting on a 70% black overlay. The container perimeter is defined by a 3px solid stroke: `#EF476F` for hardware SOS events, or `#FFB703` for system configuration alerts.

## Shapes

The design system adopts a **Rounded Level 2** framework (`0.5rem` base, `1rem` on cards/containers, `1.5rem` on floating sheets), balancing friendly organic ergonomics with structural rectilinearity.

### Shape Guidelines
- **Buttons & Large Touch Panels:** Border-radius of `0.75rem` to `1rem` creates approachable, pillow-like interactive targets that feel substantial under touch.
- **Status Badges & Chips:** Compact containers use a fixed `0.5rem` radius or full pill curvature (`9999px`) for state indicators, differentiating them immediately from actionable structural buttons.
- **Focus Rings:** Non-rounded, sharp exterior boundaries on active keyboard/voice cursor navigation states guarantee maximum geometrical distinction against rounded button edges.

## Components

### 1. Buttons
- **Strict Constraint:** There is **NO** software SOS emergency trigger button anywhere in this application. SOS alerts originate exclusively from the physical cane's emergency latch mechanism.
- **Primary Action Button:** 72px minimum height. Background is solid `#FFB703` with `#0B132B` bold 20px typography. Accompanied by a left-aligned 28px icon and unambiguous right-aligned label. 
- **Secondary Action Button:** 64px height. Background `#1C2541` with a 2px `#243254` solid perimeter and pure white (`#FFFFFF`) text.
- **Voice Control Bar (Mobility Mode):** A permanent 76px bottom-docked control zone with a high-contrast microphone waveform indicator, providing one-tap audio confirmation of cane sync, battery status, and ambient guidance.

### 2. Physical SOS Alert Banner & Modal (Caregiver View)
- Triggered solely by incoming telemetry packet from physical hardware.
- Renders with a 4px pulsating solid border of Alert Coral (`#EF476F`), flashing high-contrast alert status ("HARDWARE SOS RECEIVED - CANE DROP DETECTED"), displaying accurate timestamp, exact GPS coordinates, battery level at time of impact, and one-tap direct dispatch / phone dialer integrations.

### 3. Telemetry & Sensor Cards
- Built on Surface Level 1 (`#101B37`).
- Features a prominent 24px icon + text header pairing. 
- High-priority readout: displays big numerical values (`telemetry-num` 36px) alongside unit metrics.
- Uses Telemetry Mint (`#06D6A0`) to indicate nominal states (e.g., "BLE Connected", "LiDAR Active", "Obstacle Radar 98%").

### 4. Chips & State Badges
- Minimum height 40px for tap targets; 32px for passive status chips.
- Composed of an icon, text label, and high-contrast tinted background.
- Warning state: `#FFB703` background at 15% opacity with solid 1.5px `#FFB703` outline and white text.
- Emergency hardware state: `#EF476F` solid background with `#FFFFFF` bold text.

### 5. Lists & Settings Rows
- Minimum row height of 68px. Separated by distinct 2px dividers (`#1C2541`).
- Contains a bold leading icon (28px) framed in an elevated rounded tile, a primary title (20px Atkinson Hyperlegible), an optional status sublabel, and a high-contrast chevron indicator or tactile toggle switch.

### 6. Inputs & Search Fields
- 60px minimum height. Solid `#0B132B` internal fill with a prominent 2px `#243254` border that transitions to a 3px `#FFB703` outline on focus.
- 20px input text with high-contrast `#CBD5E1` placeholder styling. Clear buttons are oversized (44px target) with crisp cross iconography.

### 7. Checkboxes & Radio Controls
- Minimum box size of 32px × 32px centered within a 60px touch boundary.
- Unchecked: `#101B37` background with 2.5px `#CBD5E1` border.
- Checked: `#FFB703` solid fill with high-contrast black checkmark icon (stroke width 3px) for effortless optical verification.