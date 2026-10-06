# 🏍️ Bajaj Platina 110 BS6 — Smart Bike IoT System
## Master Project Overview · September 2026

> **Target Vehicle:** Bajaj Platina 110 BS6 (Analog Instrument Console, Mechanical Odometer Cable)  
> **Core Architecture:** ESP32 Central Controller → Local BLE/Wi-Fi Stream → React Native Mobile App  
> **Project Status:** 🟡 Active Development — Core foundations built, advanced features in progress

---

## 📋 Table of Contents
1. [What We Are Building](#1-what-we-are-building)
2. [The Vision & Why](#2-the-vision--why)
3. [Hardware Resources](#3-hardware-resources)
4. [Software Resources & Tech Stack](#4-software-resources--tech-stack)
5. [Full Feature Matrix (20 Features)](#5-full-feature-matrix-20-features)
6. [System Architecture](#6-system-architecture)
7. [Plans Made So Far](#7-plans-made-so-far)
8. [What Has Been Achieved](#8-what-has-been-achieved)
9. [What Remains To Be Done](#9-what-remains-to-be-done)
10. [Known Challenges & Mitigations](#10-known-challenges--mitigations)

---

## 1. What We Are Building

We are building a **complete end-to-end Smart Bike IoT System** for a Bajaj Platina 110 BS6 motorcycle. The system transforms a basic analog commuter bike into a smart, data-rich connected vehicle using custom hardware installed on the bike and a companion React Native mobile app.

The system has **three interconnected layers:**

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 3 — MOBILE APP (React Native + Expo)             │
│  Ride HUD · Fuel Analytics · Navigation · Security      │
└───────────────────────┬─────────────────────────────────┘
                        │  BLE 5.0 / Wi-Fi HTTP
┌───────────────────────▼─────────────────────────────────┐
│  LAYER 2 — ESP32-S3 FIRMWARE (Arduino / C++)            │
│  Fuel ADC · Trip Meters · Offline Logging · BLE Server  │
└───────────────────────┬─────────────────────────────────┘
                        │  Physical Wiring
┌───────────────────────▼─────────────────────────────────┐
│  LAYER 1 — BIKE HARDWARE                                │
│  Fuel Float Sensor · LM2596 Buck Converter · GPS NEO-6M │
└─────────────────────────────────────────────────────────┘
```

---

## 2. The Vision & Why

The Bajaj Platina 110 BS6 is a mass-market commuter bike with **zero smart features** out of the box:
- Mechanical analog odometer with no digital readout
- Imprecise factory fuel needle gauge
- No GPS, no anti-theft, no ride data logging
- No way to track mileage, service intervals, or fuel efficiency

This project retrofits the bike with **20 smart features** across GPS tracking, fuel intelligence, and combined sensor analytics — all without modifying the factory wiring loom.

**End Goal:** A handlebar-mounted smartphone running a premium dark-mode dashboard app that shows live speed, fuel level, range-to-empty, navigation, and trip history — powered by an ESP32 hidden under the seat.

---

## 3. Hardware Resources

### Bill of Materials

| Component | Purpose | Specification |
|:---|:---|:---|
| **ESP32-S3 SuperMini** | The micro-brain. Collects analog fuel data, reads GPS serial, acts as BLE 5.0 GATT Server and Wi-Fi HTTP server | Dual-core, BLE 5.0, ADC1 on GPIO1 |
| **NEO-6M GPS Module** | Receives satellite telemetry — coordinates, speed vectors, timestamps | 3V–5V, UART serial, external ceramic patch antenna |
| **10kΩ Resistor (R₁)** | Upper layer of voltage divider to attenuate raw battery spikes | 1/4W, Carbon Film, ±5% tolerance |
| **2.2kΩ Resistor (R₂)** | Lower branch of divider tied to ground — limits voltage to ESP32's 3.3V safe range | 1/4W, Carbon Film, ±5% tolerance |
| **100µF Electrolytic Capacitor** | Hardware low-pass filter wired parallel to fuel ADC pin — smooths fuel-slosh spikes | Rated 25V–50V DC |
| **LM2596 DC-DC Buck Converter** | Steps down Platina's 12V ignition line to clean 5.0V for ESP32 | Adjustable, supports up to 40V input |
| **Inline Fuse Holder + 2A Fuse** | Safety barrier spliced at 12V ignition source to protect factory wiring | Waterproof blade fuse holder, 2A |
| **ABS Plastic Enclosure** | Weatherproof housing for the complete circuit assembly | ~80 × 50 × 20 mm, rain-resistant |
| **Automotive T-Tap Connectors** | Clean splice into Platina's factory fuel sender wire (White/Blue) without cutting | Dual-run self-stripping connectors |
| **22 AWG Hookup Wire** | Routing from circuit box to chassis grounds and sensor inputs | Multi-strand, PVC insulated, automotive-rated |

### Voltage Divider Circuit (Fuel Sensor Interface)
The Platina's factory 2-wire fuel float resistance signal (varies from ~10Ω to ~180Ω) is buffered through the R₁/R₂ voltage divider and the 100µF capacitor to produce a clean 0–3.3V analog signal safe for the ESP32's ADC1 pin.

$$V_{ADC} = V_{sensor} \times \frac{R_2}{R_1 + R_2} = V_{sensor} \times \frac{2200}{12200} \approx 0.18 \cdot V_{sensor}$$

---

## 4. Software Resources & Tech Stack

### Mobile App
| Technology | Role |
|:---|:---|
| **React Native 0.81** | Cross-platform mobile framework (Android primary target) |
| **Expo SDK 54** | Development toolchain, OTA updates, native module wrappers |
| **TypeScript 5** | Type-safe development across the entire app |
| **React Navigation 6** | Bottom tab navigator + native stack navigator |
| **Zustand 5** | Global state management for telemetry and navigation state |
| **react-native-ble-plx 3** | BLE client — connects to ESP32 GATT server, requests MTU 512 |
| **expo-location** | Device GPS for navigation and live coordinate tracking |
| **expo-linear-gradient** | Gradient backgrounds, speedometer arcs, fuel bars |
| **expo-speech** | Voice turn-by-turn navigation guidance |
| **react-native-webview** | Map rendering using OpenStreetMap / Leaflet.js tiles |
| **AsyncStorage** | Lightweight persistent key-value storage (fuel logs, settings) |

### Firmware
| Technology | Role |
|:---|:---|
| **Arduino C++ (ESP32)** | Main firmware runtime |
| **BLE GATT Server** | BLE 5.0 broadcast of telemetry JSON at 5 Hz (200ms) |
| **Wi-Fi HTTP Server** | Local HTTP endpoint for development/testing without BLE |
| **LittleFS** | On-chip file system storing `/logs.json` and `/odometer.json` |
| **Exponential Moving Average (EMA)** | DSP filter (α=0.10) on raw ADC reads to suppress noise |
| **Store & Forward Protocol** | Event-based offline log system with BLE chunk sync |

### Key Calibration Constants (Platina 110)
```
Tank Capacity:        8.5 Liters
Baseline Efficiency:  65.0 km/L  (highway sweet spot)
EMA Filter Alpha:     0.10
BLE Broadcast Rate:   200ms (5 Hz)
Offline Log Interval: 5 minutes (fallback during rides)
Odometer Auto-Save:   Every 10 seconds during active ride
BLE Service UUID:     4fa869d1-1736-43c4-a393-b00e5a5a4309
Device Name:          Platina_Telematics
```

---

## 5. Full Feature Matrix (20 Features)

### 🛡️ GPS-Only Features (8 Features)
*Rely strictly on coordinate/speed/timing data — bypass the mechanical odometer cable entirely*

| # | Feature | Description |
|:--|:---|:---|
| 1 | **Virtual Geofence Guard** | Define a GPS boundary (e.g., 100m radius home zone). App fires push alert if bike exits without authorization |
| 2 | **Tamper & Motion Detection** | If GPS shows movement while bike is flagged "Parked", system detects push/tow and fires theft alarm |
| 3 | **High-Frequency Recovery Mode** | Emergency toggle forces ESP32 to increase ping rate to every 3–5 seconds for live theft tracing |
| 4 | **Zero-Touch Digital Odometer** | OTA distance via GPS coordinate steps — parallel to the physical mechanical odometer |
| 5 | **Automated Service Trigger Engine** | Maps digital odo logs to Bajaj Platina factory workshop schedules (oil change, spark plug, air filter) |
| 6 | **Automated Trip Timeline** | Packages daily location streams into interactive travel cards with route, duration, and peak speeds |
| 7 | **Time-in-Traffic Idle Tracker** | Isolates timestamps where speed = 0 km/h to calculate exact traffic idle time per commute |
| 8 | **Riding Behavior Scorecard** | Monitors speed limits and deceleration vectors → outputs weekly Safe Commuter Score |

### ⛽ Fuel Sensor-Only Features (6 Features)
*Rely on reading factory 2-wire tank float resistance signal via the hardware conditioning circuit*

| # | Feature | Description |
|:--|:---|:---|
| 9 | **Smart Refuel Auto-Logger** | Detects sudden sustained tank volume increases → auto-creates fuel expense log with timestamp |
| 10 | **Petrol Pump Dispenser Audit** | Validates pump calibration by testing tank capacity spikes against pump receipt claim |
| 11 | **Fuel Siphoning & Leak Alert** | Monitors parked fuel levels overnight; rapid drop without ignition fires theft/leak alert |
| 12 | **Custom Digital Low-Fuel Ring** | User-defined digital warning threshold (e.g., exactly 2.5L remaining) bypassing slow factory needle |
| 13 | **Evaporative Loss Tracker** | Monitors slow fuel drops during long storage periods |
| 14 | **Monthly Expense Forecasting** | Analyzes historical fueling data to project next-month petrol spend |

### ⚡ Combined Sensor Synergy Features (6 Features)
*GPS + Fuel sensors cross-referenced simultaneously for advanced live calculations*

| # | Feature | Description |
|:--|:---|:---|
| 15 | **Real-Time Mileage Indicator** | Live kmpl = Δ GPS Distance (km) / Δ Fuel Consumed (L) over filtered windows |
| 16 | **Real-Time Range-to-Empty (DTE)** | Dynamic countdown: DTE (km) = Current Fuel (L) × Historical Avg Mileage |
| 17 | **Route-Based Fuel Efficiency Heatmap** | Overlays fuel drops on map — red (stop-and-go) vs green (highway sweet spot at 65–70 kmpl) |
| 18 | **Smart Petrol Pump Router** | When fuel critical, auto-maps nearest petrol stations and plots optimal route |
| 19 | **Weather-Linked Chain Maintenance Alerts** | If GPS tracks >50 km of rain riding (via weather API), alerts user to clean/lube drive chain |
| 20 | **Verified Lifetime Mileage Ledger** | Cryptographically backed PDF maintenance log of actual efficiency for resale value proof |

---

## 6. System Architecture

### App Screen Layout
```
App.tsx (NavigationContainer + Bottom Tab Navigator)
│
├── ⚡  DashboardScreen.tsx         — Live telemetry HUD, fuel card, ride controls
├── 🗺️  TripScreen.tsx              — Trip history, timeline cards, idle time stats
├── ⛽  FuelAnalyticsScreen.tsx     — Deep fuel metrics, refuel logs, expense forecasting
├── 🛡️  SecurityScreen.tsx          — Geofence controls, motion detection, recovery mode
└── 🔧  MaintenanceScreen.tsx       — Service countdowns, digital odometer, odo logs
```

### Component Architecture
```
src/components/
├── RideCockpitOverlay.tsx         — Full-screen 70% Map + 30% Speedometer HUD (Ride Mode ON)
├── ActiveRideBanner.tsx           — Floating top banner when ride is minimized
├── MotorcycleCockpitCluster.tsx   — Semi-circular speedometer arc (Cyan → Amber → Red)
├── NativeMapView.tsx              — High-contrast vector map renderer (native)
├── NativeMapView.web.tsx          — Web-compatible Leaflet.js map (via WebView)
├── NavigationMapView.tsx          — Navigation-specific map with route polylines
├── NavigationOverlayHUD.tsx       — Turn-by-turn instruction overlay on map
├── ActiveNavigationHUD.tsx        — Active navigation status panel
├── NavigationSearchBar.tsx        — Geocoding search bar for destination input
├── RoutePlannerModal.tsx          — Full route planner with fuel feasibility check
├── BleConnectionBanner.tsx        — ESP32 BLE connection status indicator
├── OfflineSyncStatusBanner.tsx    — BLE data sync progress display
├── PotentiometerFuelWidget.tsx    — Raw ADC debug widget for hardware calibration
├── AddFuelEntryModal.tsx          — Manual refuel expense entry
└── TripCompletedModal.tsx         — Post-trip summary card
```

### Services Layer
```
src/services/
├── routingService.ts              — OSRM/Valhalla routing API, turn instructions, ETA
├── tripMeterService.ts            — Digital odometer, Trip A/B, idle time, ride metrics
├── fuelStorageService.ts          — Fuel log CRUD with AsyncStorage persistence
├── offlineStorageService.ts       — Local database for ESP32 offline log sync records
├── syncProtocolService.ts         — BLE Store & Forward chunked sync handshake
├── dataProcessingService.ts       — Mileage calc, DTE calc, fuel theft alert logic
├── fuelHeatmapService.ts          — GPS+Fuel data fusion for efficiency heatmap overlay
├── deviationDetector.ts           — Off-route detection during active navigation
├── offlineTileCache.ts            — Map tile pre-caching for offline riding
└── voiceGuidanceService.ts        — expo-speech TTS turn-by-turn voice guidance
```

### State Management
```
src/stores/
├── useNavigationStore.ts          — Zustand: route, maneuvers, active step, ETA
└── useTelemetryStore.ts           — Zustand: live fuel %, DTE, speed, BLE status

src/hooks/
├── useBleTelemetry.ts             — BLE scan → connect → MTU negotiate → parse JSON
├── useDeviceLocation.ts           — expo-location hook with permission handling
├── useMockTelemetry.ts            — Dev-only fake telemetry (no hardware needed)
├── useOfflineSync.ts              — BLE sync orchestration (request → chunk → ack)
└── useTripMeter.ts                — Live trip distance accumulator via GPS steps
```

### Firmware Architecture (ESP32-S3 SuperMini)
```
Firmware/FuelMonitor.ino  (551 lines)
├── BLE GATT Server
│   ├── Telemetry Characteristic   — Notify: JSON string at 5 Hz (200ms intervals)
│   └── Command Characteristic     — Write: REQ_SYNC, ACK_SYNC, TIME_SYNC, RESET_TRIP
├── Wi-Fi HTTP Server              — GET /data → JSON (dev/testing fallback)
├── LittleFS Storage
│   ├── /logs.json                 — Event-based offline ride logs (Store & Forward)
│   └── /odometer.json             — Persistent digital odometer + Trip A + Trip B
├── ADC Signal Pipeline            — GPIO1 → 12-sample avg → EMA(α=0.10) → liters
└── Trip Meter Engine              — Dual Trip A/B + lifetime odo + idle tracker
```

---

## 7. Plans Made So Far

### Plan A — Feature Blueprint (`Vehicle.md`)
Defined all 20 features across three sensor categories. Established the complete hardware BOM and calibration constants specific to the Platina 110 BS6. This is the master feature specification document.

### Plan B — UI Redesign Architecture (`PLAN.md`)
Full UI/UX split-mode design plan for the smartphone dashboard:
- **Ride Mode (Active):** 70% top = Map, 30% bottom = Instrument Cluster HUD
- **Normal Mode (Parked):** Map-off companion app — Hero Fuel Card, Setup Ride, Quick Tiles
- **Minimized Ride State:** Persistent floating banner → `🟢 Ride Active · 42 km/h · ⚡ Resume HUD`

Defined exact component file targets: `RideCockpitOverlay.tsx` (new), `ActiveRideBanner.tsx` (new), `DashboardScreen.tsx` (modify).

### Plan C — Offline Data Logging & BLE Sync Architecture (`offline monitor.md`)
Full "Store and Forward" data architecture for disconnected operation:
- **ESP32 Logging Strategy:** Event triggers (Ignition ON/OFF, Fuel Drop >2%, 5-min fallback)
- **JSON Schema:** Each log entry contains `id`, `timestamp`, `event_type`, `fuel_pct`, `fuel_liters`, `odo_km`, `lat`, `lng`
- **BLE Sync Handshake (5 steps):** Time Sync → `REQ_SYNC:<last_id>` → ESP32 chunks response → App reassembles → `ACK_SYNC:<highest_id>` → ESP32 cleanup
- **MTU Negotiation:** App requests MTU 512 to avoid 23-byte default timeout issues
- **3-Phase Dev Roadmap:** Firmware → App → Integration testing

### Firmware Plan (`Firmware/FuelMonitor.ino`)
Complete Arduino C++ firmware implementation plan with all five subsystems:
1. BLE 5.0 GATT Server + Wi-Fi HTTP dual-mode telemetry streaming
2. Event-based LittleFS JSON logging with Store & Forward protocol
3. Dual Trip Meters (A/B) + Lifetime Digital Odometer with 10s auto-save
4. Time-in-Traffic Idle Tracker + Active Ride Statistics
5. ADC signal conditioning pipeline (EMA filter + 12-sample averaging)

---

## 8. What Has Been Achieved

### ✅ Firmware (ESP32) — Largely Complete

- [x] **BLE 5.0 GATT Server** — Telemetry characteristic (Notify @ 5Hz) + Command characteristic (Write)
- [x] **Wi-Fi HTTP Server** — `GET /data` JSON endpoint for dev-mode without BLE
- [x] **ADC Pipeline** — GPIO1 → 12-sample average → EMA(α=0.10) → calibrated to liters (8.5L tank)
- [x] **LittleFS Storage** — `/logs.json` (offline events) + `/odometer.json` (persistent odo state)
- [x] **Event-Based Logging** — Triggers: Ignition ON/OFF, Fuel Drop >2%, 5-min fallback interval
- [x] **Dual Trip Meters** — Trip A and Trip B with independent `RESET_TRIP_A` / `RESET_TRIP_B` BLE commands
- [x] **Lifetime Digital Odometer** — Auto-saves to flash every 10 seconds while riding
- [x] **Idle Tracker** — Isolates time-at-zero-speed during active rides
- [x] **BLE Sync Protocol** — `REQ_SYNC`, `ACK_SYNC`, `TIME_SYNC`, chunked JSON transfer
- [x] **Clock Synchronization** — Phone sends Unix timestamp over BLE on connect

### ✅ Mobile App Screens — All 5 Built

- [x] **DashboardScreen** (~41KB) — Live telemetry hub, fuel card, DTE, BLE status, ride controls, hardware diagnostics drawer, Quick Ride button
- [x] **FuelAnalyticsScreen** (~42KB) — Deep fuel metrics, refuel log, expense tracking, efficiency trends, DTE history
- [x] **TripScreen** (~25KB) — Trip timeline cards, detailed stats, idle time, riding behavior data
- [x] **SecurityScreen** (~21KB) — Geofence toggle, motion detection controls, recovery mode switch
- [x] **MaintenanceScreen** (~20KB) — Service countdown timers (oil/plug/filter/chain), digital odometer display, maintenance log history
- [x] **NavigationScreen** (~12KB) — Standalone full-screen navigation map view

### ✅ UI Components — 15 Built

- [x] `RideCockpitOverlay.tsx` (23KB) — Full-screen 70% Map + 30% Speedometer ride HUD
- [x] `ActiveRideBanner.tsx` (5KB) — Minimized ride floating banner with resume button
- [x] `MotorcycleCockpitCluster.tsx` (32KB) — Semi-circular speedometer arc (Cyan → Amber → Red thresholds)
- [x] `NativeMapView.tsx` (13KB) + `NativeMapView.web.tsx` (10KB) — Cross-platform map renderer
- [x] `NavigationMapView.tsx` (10KB) + `NavigationOverlayHUD.tsx` (14KB) — Navigation route + turn overlay
- [x] `ActiveNavigationHUD.tsx` (16KB) — Active turn-by-turn status panel
- [x] `NavigationSearchBar.tsx` (7KB) — Place search input with geocoding
- [x] `RoutePlannerModal.tsx` (44KB) — Full route planner with fuel feasibility validation
- [x] `BleConnectionBanner.tsx` (7KB) — Live ESP32 connection indicator
- [x] `OfflineSyncStatusBanner.tsx` (9KB) — BLE sync progress display
- [x] `PotentiometerFuelWidget.tsx` (11KB) — Raw ADC debug widget for hardware calibration
- [x] `AddFuelEntryModal.tsx` (21KB) — Manual refuel expense entry
- [x] `TripCompletedModal.tsx` (9KB) — Post-trip summary card

### ✅ Services — 10 Implemented

- [x] `routingService.ts` (18KB) — OSRM routing API, turn instructions, ETA calculation
- [x] `tripMeterService.ts` (17KB) — Odometer engine, trip A/B, idle time, ride stats
- [x] `fuelStorageService.ts` (5KB) — Fuel log CRUD, AsyncStorage persistence
- [x] `offlineStorageService.ts` (6KB) — Local database for ESP32 offline log records
- [x] `syncProtocolService.ts` (9KB) — BLE Store & Forward handshake implementation
- [x] `dataProcessingService.ts` (6KB) — Mileage/DTE/theft alert calculation engine
- [x] `fuelHeatmapService.ts` (7KB) — GPS+fuel data fusion for efficiency heatmap
- [x] `deviationDetector.ts` (6KB) — Off-route detection during navigation
- [x] `offlineTileCache.ts` (10KB) — Map tile pre-caching for offline riding
- [x] `voiceGuidanceService.ts` (9KB) — expo-speech TTS turn-by-turn voice guidance

### ✅ State Management & Hooks — 7 Implemented

- [x] `useNavigationStore.ts` (24KB) — Full navigation state: route, maneuvers, active step, ETA
- [x] `useTelemetryStore.ts` (5KB) — Live fuel %, DTE, speed, BLE connection status
- [x] `useBleTelemetry.ts` (24KB) — BLE scan → connect → MTU negotiate → subscribe → parse JSON
- [x] `useDeviceLocation.ts` (9KB) — expo-location wrapper with background permission flow
- [x] `useMockTelemetry.ts` (8KB) — Fake telemetry emitter for development without hardware
- [x] `useOfflineSync.ts` (12KB) — Full BLE sync orchestration (request → chunk → ack)
- [x] `useTripMeter.ts` (7KB) — Live trip distance accumulator using GPS coordinate steps

### ✅ Infrastructure & Config

- [x] **TypeScript types** — `navigation.ts`, `telemetry.ts`, `offlineSync.ts`, `tripMeter.ts`
- [x] **Theme system** — `src/constants/theme.ts` with Colors, Typography, Spacing, Radius design tokens
- [x] **Base64 utility** — `src/utils/base64.ts` for BLE binary data encoding/decoding
- [x] **Permissions config** — `src/config/permissions.ts` for location + BLE Android permission flows
- [x] **Expo + EAS setup** — `app.json`, `eas.json`, `app.config.js` configured for Android build pipeline
- [x] **Path aliases** — `@/` aliased to `src/` via Babel module resolver in `babel.config.js`

---

## 9. What Remains To Be Done

### 🔴 High Priority

| Task | Description |
|:---|:---|
| **Real Hardware Testing** | Flash firmware to actual ESP32-S3 SuperMini; test BLE end-to-end with the app |
| **Fuel Sensor Calibration** | Map raw ADC values (0–4095) to actual liters using Platina's factory float resistance curve |
| **GPS Module Integration** | Wire NEO-6M to ESP32 UART2; integrate NMEA sentence parsing into firmware (currently simulated) |
| **BLE MTU Negotiation Testing** | Verify MTU 512 request succeeds with react-native-ble-plx on Android hardware |
| **Offline Sync Stress Test** | Test BLE chunked transfer with 50+ log entries; verify memory cleanup after `ACK_SYNC` |

### 🟡 Medium Priority

| Task | Description |
|:---|:---|
| **Geofence Backend Logic** | Implement coordinate boundary math and local push notification trigger in the app |
| **Motion Tamper Detection** | Connect GPS speed-change detection to "Parked" state flag and in-app alert system |
| **Fuel Heatmap Rendering** | Integrate `fuelHeatmapService` data into the map tile overlay on `NavigationMapView` |
| **Route vs Fuel Feasibility** | Complete `RoutePlannerModal` fuel check — verify remaining DTE covers planned route distance |
| **Offline Map Tile Download UI** | UI for pre-downloading map tiles for a specific route before riding |
| **Riding Behavior Score UI** | Weekly scorecard display card on DashboardScreen |
| **Expense Forecasting UI** | Monthly spend projection display in `FuelAnalyticsScreen` |
| **Maintenance Auto-Trigger** | Connect digital odometer milestones to Bajaj Platina service intervals; fire notifications |

### 🟢 Lower Priority

| Task | Description |
|:---|:---|
| **Petrol Pump Router** | When DTE is critical, auto-search + route to nearest petrol pump via OSM API |
| **Weather API Integration** | Rain detection hook → chain maintenance alert trigger (>50 km wet riding) |
| **Verified Mileage Ledger** | PDF export of ride + fuel history with cryptographic signature for resale proof |
| **Evaporative Loss Tracker** | Long-term parked fuel monitoring logic for storage detection |
| **iOS Build & Testing** | Currently Android-primary; iOS requires additional native permission configuration |
| **EAS Production Build** | Configure EAS for production APK generation and OTA update channel |

---

## 10. Known Challenges & Mitigations

| Challenge | Severity | Mitigation |
|:---|:---:|:---|
| **BLE MTU Limit (23 bytes default)** | 🔴 High | App requests MTU 512 via `bleManager.requestMTU()` on connect; firmware accepts the negotiation |
| **ESP32 Flash Write Endurance (~10k–100k cycles)** | 🟡 Med | Event-based logging (only 5–10 writes/ride) ensures years of flash lifespan |
| **No RTC Battery on ESP32-S3** | 🟡 Med | BLE `TIME_SYNC` handshake sends phone Unix timestamp to ESP32 on every connection |
| **Fuel Sensor ADC Noise (Fuel Sloshing)** | 🟡 Med | 12-sample hardware average + EMA(α=0.10) software filter + 100µF capacitor hardware LPF |
| **Motorcycle 12V Voltage Spikes (Alternator)** | 🔴 High | LM2596 buck converter + inline 2A fuse protect ESP32 from electrical transients |
| **BLE Disconnects When App Minimized** | 🟡 Med | Android foreground service needed to keep BLE socket alive in background |
| **OSRM Routing Requires Internet** | 🟡 Med | Offline tile cache + last-known route stored locally; graceful degradation to GPS-only mode |
| **GPS Cold Start Delay (~30 seconds)** | 🟢 Low | Show "Acquiring GPS..." spinner; use last known position as interim coordinate display |

---

## 📁 Complete Repository File Map

```
Vehicle-Monitor/
├── App.tsx                          — Root: NavigationContainer + Bottom Tab Navigator
├── Firmware/
│   └── FuelMonitor.ino              — Complete ESP32-S3 firmware (551 lines)
├── src/
│   ├── screens/
│   │   ├── DashboardScreen.tsx      — Live telemetry dashboard (41KB)
│   │   ├── FuelAnalyticsScreen.tsx  — Deep fuel metrics & logs (42KB)
│   │   ├── TripScreen.tsx           — Trip history timeline (25KB)
│   │   ├── SecurityScreen.tsx       — Geofence & anti-theft controls (21KB)
│   │   ├── MaintenanceScreen.tsx    — Service countdown & odometer (20KB)
│   │   └── NavigationScreen.tsx     — Full-screen navigation (12KB)
│   ├── components/                  — 15 UI components (see Section 8)
│   ├── services/                    — 10 business logic services (see Section 8)
│   ├── stores/
│   │   ├── useNavigationStore.ts    — Zustand navigation state (24KB)
│   │   └── useTelemetryStore.ts     — Zustand telemetry state (5KB)
│   ├── hooks/                       — 5 React hooks (see Section 8)
│   ├── types/                       — 4 TypeScript type definition files
│   ├── constants/
│   │   └── theme.ts                 — Design system tokens (Colors, Spacing, etc.)
│   ├── config/
│   │   └── permissions.ts           — BLE & location permission handlers
│   └── utils/
│       └── base64.ts                — BLE binary data encoding utility
├── PLAN.md                          — UI Redesign Architecture Plan
├── Vehicle.md                       — Feature Blueprint & Hardware BOM
├── offline monitor.md               — Offline Logging & BLE Sync Architecture
├── PROJECT_OVERVIEW.md              — This file (Master Project Overview)
├── package.json                     — npm dependencies & scripts
├── app.json / app.config.js         — Expo app configuration
├── eas.json                         — EAS Build profiles (dev / preview / production)
├── tsconfig.json                    — TypeScript compiler config with @/ path alias
└── .env.example                     — Environment variable template
```

---

*Last updated: September 23, 2026 · Project by Yash*
