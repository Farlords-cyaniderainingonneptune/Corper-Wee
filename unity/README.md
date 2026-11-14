# Corper Wee — Unity Mobile Project (Android / iOS)

## Overview
**Corper Wee** is a 3D Life Simulation / Social RPG set in the NYSC (National Youth Service Corps) Orientation Camp at Iseyin, Oyo State, Nigeria.

This repository directory contains the complete Unity C# mobile client architecture, configured specifically for mid-range Android devices with iOS compatibility.

---

## Architecture & Scene Hierarchy

### 1. Reusable Scene Management (`CorperWee.Core.SceneLoadingManager`)
All scene transitions are asynchronous with animated loading indicators and background asset pre-warming.
- **Scene 1: Authentication (`Assets/Scenes/Authentication.unity`)**
  - Google Sign-In verification & NYSC State Code input (`^[A-Z]{2}\/\d{2}[A-C]\/\d{4}$`).
  - Idempotent Superadmin fast-login shortcut for `farlodunolusege@gmail.com` (`OY/26C/5439`).
- **Scene 2: Character Creation (`Assets/Scenes/CharacterCreation.unity`)**
  - Real-time 3D rotating avatar preview.
  - Gender (`MALE`/`FEMALE`), skin tone, hairstyle, hair color, and uniform selection (`KHAKI_FULL` 7/7 or `WHITE_PT`).
- **Scene 3: Camp Environment (`Assets/Scenes/CampEnvironment.unity`)**
  - Open camp exploration: hostels, parade grounds, borehole water taps, canteen, and Mami Market.
  - Proximity trigger system for entering minigames.
  - Hydration meter depletion tick (dehydration penalty lowers sprint speed).
- **Scene 4: Parade Ground (`Assets/Scenes/ParadeGround.unity`)**
  - Rhythm QTE drill minigame with drill sergeant voice commands, timing bars, and authoritative server scoring.
- **Scene 5: Canteen Obstacle Course (`Assets/Scenes/CanteenObstacle.unity`)**
  - Fast-paced obstacle rush dodging mud puddles and bench barricades before canteen doors close.
- **Scene 6: Mami Market (`Assets/Scenes/MamiMarket.unity`)**
  - Vendor commerce (Mama Put jollof rice, cold pure water sachets) and ATM conversion (CP to Virtual Naira ₦).

---

## Mobile Input System (`CorperWee.Input`)
- **`FloatingJoystick.cs`**: Dual-axis dynamic floating virtual joystick that automatically centers on initial touch down in the left quadrant of the touch screen.
- **`TouchActionButton.cs`**: Dedicated mobile touch buttons for Sprint, Jump, Attention Salute, and Proximity Interaction.
- **`MobileTouchInput.cs`**: Unified input provider bridging mobile touch inputs and desktop keyboard shortcuts (WASD, Space, Shift, E, F) for rapid editor testing.

---

## Third-Person Orbit Camera (`CorperWee.CameraSystem`)
- **`ThirdPersonOrbitCamera.cs`**: Smooth damped follow camera with right-screen swipe orbit navigation, pitch clamping (-20° to 65°), and automatic spherecast collision avoidance preventing walls from clipping into the view.

---

## Authoritative Backend Integration (`CorperWee.Network.ApiClient`)
- Communicates directly with the Node.js/Express REST API on Port 3000 (`/api/v1`).
- Implements JWT access token handling (15m expiry) and automatic refresh token rotation (`/api/v1/auth/refresh`) with token family reuse detection.
- Employs client-side idempotency keys for currency transactions and product purchases.

---

## Android Mid-Range Optimization Profile
- **Target Frame Rate:** 60 FPS locked (`Application.targetFrameRate = 60`).
- **Target Architecture:** ARM64 (`IL2CPP` scripting backend).
- **Graphics API:** Vulkan primary, OpenGL ES 3.2 fallback.
- **Texture Compression:** ASTC 6x6 / 8x8.
- **Draw Call Budget:** $\le 120$ draw calls per frame using static/dynamic batching and GPU instancing.
- **Shadows:** Directional cascaded shadow distance capped at 35 meters.
