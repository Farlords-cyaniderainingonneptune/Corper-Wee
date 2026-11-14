# Corper Wee — Gameplay Design Document

## 1. World Map & Camp Zones (Iseyin Orientation Camp)

Players spawn in the central camp courtyard overlooking key orientation landmarks, navigated via the **Interactive Minimap** (clickable fast-travel & compass waypoints) and proximity action banners:

| Zone | Coords `(X, Z)` | Gameplay Function |
| :--- | :--- | :--- |
| **Parade Ground** | `(0, -35)` | Parade Drill Rhythm QTE & Daily Morning Drill / Evening Parade duties |
| **Camp Canteen** | `(-50, 10)` | Canteen Rush 3D obstacle sprint |
| **Mami Market** | `(45, -45)` | Vendor commerce & Corper Points -> Virtual Naira ATM exchange |
| **Water Borehole** | `(30, 35)` | Free hydration refill station |
| **Lecture Pavilion** | `(-40, -50)` | Camp orientations, SAED sessions & bugle calls |
| **Male & Female Hostels** | `(-65, 65)` / `(65, 65)` | Rest quarters & patrol evasion perimeter |
| **Admin HQ** | `(0, 95)` | Commandant oversight building & Admin Portal shortcut |

---

## 2. Controls & Mobile Ergonomics

- **Desktop:** `WASD` / Arrow keys to move, `Shift` to sprint, `Space` to jump, `F` for attention salute, mouse drag to orbit third-person camera.
- **Mobile / Android:** Left-side dynamic `TouchJoystick` + fallback compact D-pad, plus thumb-reachable action buttons (`JUMP`, `Sprint` toggle, `SALUTE!`, `Wave`, `Drink`).
- **Adaptive Graphics Profiles (`DevicePerformance`):**
  - `LOW` (Budget Android, `<= 2 GB` RAM / `360×640`): `1.0x` DPR, shadows disabled, `280m` far clip, `30 FPS` cap.
  - `MID` (Mid-range Android `390×844` / Tablet `800×1280`): `1.5x` DPR, `1024px` shadow map, `60 FPS`.
  - `HIGH` (Flagship / Desktop): `2.0x` DPR, `2048px` soft shadows, `60 FPS`.

---

## 3. Core Loops & Mini-Games

### 3.1 Parade Drill (`ParadeMinigame`)
- **Difficulties:** `EASY` (`8` commands, `2200ms` beat, `1.0x`), `NORMAL` (`12` commands, `1650ms` beat, `1.5x`), `HARD` (`16` commands, `1250ms` beat, `2.2x`).
- **Mechanics:** Sergeant issues audio + visual drill commands (`ATTEN-TION`, `RIGHT TURN`, `LEFT TURN`, `ABOUT TURN`, `QUICK MARCH`, `EYES RIGHT`, `STAND AT EASE`, `PLATOON HALT`). Player taps matching button or hotkey inside the sweet-spot timing bar.
- **Scoring:** Server validates response times & accuracy, assigning rank `S`–`F`, awarding CP to both personal wallet and Platoon championship score, and boosting Charisma at `>= 85%`.

### 3.2 Daily Morning Drill & Evening Parade Tasks (`DailyTaskService`)
- **Morning Drill (`06:00 – 11:00 WAT`):** `+50 CP`, `+30 XP`, `+50 Platoon Score`.
- **Evening Parade (`16:30 – 19:30 WAT`):** `+60 CP`, `+40 XP`, `+60 Platoon Score`.
- **Alerts & Unlocks:** Entering camp or cycling camp Time-of-Day (`MORNING` / `DAY` / `NIGHT`) plays a bugle chime, surfaces a HUD duty banner, and posts to the Camp Feed. Completing the Parade Drill (`>= 60%` accuracy) during an active duty automatically unlocks the daily bonus.

### 3.3 Canteen Rush (`CanteenRushMinigame`)
- **Mechanics:** Sprint down the camp canteen track before meal doors shut, jumping bench barricades and dodging mud puddles.
- **Rewards & Tradeoff:** Earns obstacle + speed bonus CP minus puddle penalties; drains hydration (`15%` default) upon completion.

### 3.4 Soldier Patrol Evasion (`SoldierPatrolAI`)
- **Mechanics:** Patrol NPCs scan camp corridors with forward vision cones (`PATROL` -> `SUSPICIOUS` -> `CHASE` -> `CAPTURED`).
- **Consequences:** Escaping awards survival CP (`+2 CP/s`, capped); capture triggers comedic drill penalty narrative and deducts `-15 CP` (clamped at `0`).

---

## 4. Hydration, Weather, Economy & Soundscape

- **Hydration (`waterLevel`):** Slowly depletes over time (accelerated while sprinting). Refilled via Borehole or Mami Market water items (`Chilled Pure Water`, `Swan Bottle`, `Zobo`).
- **Dynamic Weather System (`WeatherSystem`):** Periodically cycles through **Sunny** (`+65%` hydration drain, warm high-intensity sun), **Cloudy** (`1.0x` normal drain, soft overcast sky & mist), and **Light Rain** (`-40%` hydration drain, `0.94x` damp-ground movement pace, GPU-budgeted `THREE.Points` rainfall curtain, and synthesized light rain audio drizzle).
- **Dual Currency:** `Corper Points (CP)` earned via drills/courses/events convert at live admin rate (`default 10 CP = ₦100`) into `Virtual Naira (₦)` to purchase drinks, food (`Indomie`, `Suya`), and charisma-boosting gear (`Crested Cap`, `Waist Bag`).
- **Zone-Reactive Soundscape (`AudioSynthesizer`):** Synthesizes multi-layer ambient audio varying by zone, Time-of-Day (`MORNING` bugle & dawn birds, `DAY` market hustle & chatter, `NIGHT` crickets & quiet breeze), and active Weather (`LIGHT_RAIN` filtered drizzle wash), ducked cleanly during active mini-games.
