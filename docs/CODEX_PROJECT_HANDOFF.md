# Smart Bike Ride Computer — Codex Handoff

Date: 23 September 2026  
Owner: Yash  
Target bike: Bajaj Platina 110 BS6, as described in PROJECT_OVERVIEW.md  
Purpose: Preserve the requirements and decisions from the project discussion so development can continue in Codex.

## 1. Read this first

This is a personal electronics and software learning project. The owner wants to build something cool and useful for his own bike. There is no plan to sell, scale, or commercialize it. Do not optimize for market demand, subscriptions, multi-user infrastructure, or product sales.

The main problem is the lack of riding records: trip history, fuel economy, and useful ride statistics. The three essential features are:

1. Fuel meter.
2. Maps and navigation inside the app.
3. Average mileage meter, both per ride and across use of the system.

This handoff captures the owner's clarified intent. The original PROJECT_OVERVIEW.md is supporting architectural background, not a fully approved specification. The owner explicitly said he had not read that overview and could not identify which of its proposed features were his priorities.

Where scope differs, follow the explicit requirements here. Recommendations below are labelled separately from confirmed requirements. Actual implementation status must be established by inspecting the repository: only the overview was reviewed in this conversation, not source code or hardware tests.

## 2. Confirmed equipment, constraints, and current stage

| Item | Confirmed information |
| --- | --- |
| Controller | ESP32-S3 SuperMini with BLE and Wi-Fi |
| Fuel input now | Potentiometer, used to simulate fuel |
| Dedicated GPS | Not owned yet |
| Prototype location source | Phone GPS acting as the temporary replacement for the future GPS module |
| Phone | Realme Narzo 70 Turbo |
| OS | Android 16, as reported by owner |
| Bike power converter | Still needs to be purchased |
| Next hardware budget | ₹2,000 total for next purchases, including the power converter |
| Existing code | A project exists; owner has installed Codex for it |
| BLE testing | Board supports BLE; successful app-to-board telemetry has not been confirmed in this discussion |
| Bike installation | Actual fuel-sender wiring, power installation, and on-bike tests have not been confirmed |

Do not assume any GPS model in the old BOM is already purchased. Do not prescribe a replacement board. Existing parts other than those confirmed above should be checked before proposing purchases.

## 3. Owner's intended daily workflow

1. Owner turns on the bike.
2. ESP32 powers up and automatically connects to the phone app when available.
3. The phone displays a notification that the ESP32 is connected.
4. When the bike starts moving, the system automatically starts recording a ride.
5. The app records distance, route, relevant ride statistics, and available fuel information.
6. When the bike is switched off, the app asks whether the ride has ended.
7. If the owner confirms the end, finalize and retain the ride in the database.
8. If the owner says it has not ended, preserve the same ride and resume it when the bike starts again.
9. The owner can also manually end the ride.

The original phrase that the ESP should connect to the bike was interpreted in discussion as connecting to the phone app. The system should aim to work without requiring the app to remain visibly open; screen-locked/background operation needs validation on the owner's phone.

### Unanswered end-of-ride prompt

The owner delegated this choice. The selected default is:

- Persist the ride immediately as paused; do not wait for a response to save data.
- Keep it recoverable until the owner decides to resume or finish.
- Offer resume/finish on reconnection.
- Do not silently discard the ride or invent an arbitrary auto-finalization timeout.

### Important implementation distinctions

These are engineering requirements derived from the workflow, not confirmed working hardware capabilities:

- BLE disconnection is not proof that the ignition is off.
- A traffic stop is not automatically the end of a ride.
- Reconnection must not create a duplicate ride.
- Connection alone should not create a ride before movement.
- Save progressively, not only on the final End Ride action.
- Exact movement thresholds, stop debounce, and reconnect timing remain implementation choices to validate.
- How ignition-off is detected is unresolved. Power loss may prevent a final ESP32 message. Design for this instead of assuming a shutdown message always arrives.

## 4. Fuel and mileage requirements

### Confirmed

- Display current fuel level.
- Show average fuel economy for each ride.
- Show overall fuel economy since the system is installed.
- Accept manual refuelling entries during the prototype stage.
- Eventually record fuel usage and refuelling when the phone is absent, and sync later.
- Historical fuel economy before installation is not required.

### Measurement honesty

The potentiometer provides simulated fuel input. It can validate telemetry, screens, calibration workflows, and event logic, but it cannot measure actual fuel used by the engine.

The agreed prototype interpretation is:

| Output | Prototype treatment |
| --- | --- |
| Potentiometer fuel level | Clearly labelled simulated/test data |
| Actual overall mileage | Use valid manual full-to-full refill intervals |
| Per-ride mileage | Estimated when using an assumed or historical fuel economy; show its source |
| Measured per-ride mileage | Future capability, dependent on validated fuel measurement resolution |
| Missing measurement | Display unavailable, not fabricated zero or precise-looking data |

A baseline mileage value from the old overview is an assumption, not a measured result. Do not display it as the owner's actual mileage.

### Suggested calculation rules — implementation guidance

- For a completed full-to-full interval: km/L = distance since the prior full fill / litres added over that interval, including intermediate partial fills.
- The first full fill establishes a baseline; it does not produce a measured mileage result by itself.
- Overall mileage across valid intervals should be total eligible distance divided by total corresponding fuel, not an unweighted average of individual km/L values.
- Partial or incomplete intervals must not be presented as complete full-to-full measurements.
- Estimated ride fuel can be distance divided by historical km/L. This is a model, not an independent measurement of that ride's efficiency.
- Keep simulated fuel events separate from real manual refill history.
- Do not claim that smoothing a sender reading establishes accurate short-window consumption.

Suggested manual refill fields: date/time, litres added, full-tank flag, distance/odometer reference, optional cost and notes. Exact schema is not yet approved; adapt to existing code.

## 5. Navigation requirements

The owner wants a full in-app map experience resembling the essential navigation functions of Google Maps, using reliable open-source libraries/APIs where practical. Simply launching another navigation app does not satisfy the intended final experience.

Internet use is acceptable and preferred for navigation. Fully offline navigation is not a first-stage requirement. Internet permission does not itself guarantee better positioning accuracy.

The working interpretation discussed is:

- Destination/place search.
- Current location and follow mode.
- Route preview and route selection where supported.
- Start/stop navigation.
- Route line on the map.
- Turn-by-turn instructions.
- Voice guidance.
- ETA and remaining distance.
- Off-route detection and automatic rerouting.

Live traffic, Street View, satellite imagery, and a feature-for-feature Google Maps replacement are not part of the initial scope. These exclusions were proposed to bound the work, not separately requested by the owner.

Provider/library selection remains open. Inspect the current implementation before changing it. Map rendering, tiles, geocoding, routing, and voice guidance are separate capabilities. Verify current official documentation, compatibility, attribution, API terms, quotas, and costs before selecting services. Open-source software does not imply unlimited free hosted infrastructure. No current API/provider research was done during this discussion.

On network loss, recording should remain resilient and the app should explain which navigation functions are unavailable. Offline map downloads and offline route computation are separate future decisions.

## 6. Recording without the phone

### Final desired behavior

The bike should independently record distance travelled and available fuel usage/refuelling events. When the phone reconnects, historical data should update in the phone without duplication.

### Prototype limitation

With phone GPS as the only location/distance source, the ESP32 cannot independently measure travelled distance when that phone is absent or its GPS data is unavailable. This is a known limitation, not a feature to fake.

The ESP32 can prototype locally storing simulated fuel events while powered. Independent distance/route recording requires a future bike-mounted GPS or another suitable distance sensor. A wheel sensor would support distance but would not replace GPS route coordinates.

### Suggested sync design

- Durable records with stable IDs and clear device/source identity.
- Track timestamp validity and handle operation before time synchronization.
- Resume interrupted transfers.
- Commit records on the phone before acknowledging them.
- Deduplicate repeated transfers.
- Delete acknowledged device records only after durable phone storage.
- Preserve gaps and data provenance instead of silently filling them.
- Define bounded storage and behavior when full.

These are implementation recommendations, not verified properties of the current sync code.

## 7. Data storage and ownership

The owner explicitly wants completed rides stored in a database and later accessible on the phone. A particular database engine has not been selected in this discussion. The overview mentions AsyncStorage and an offline storage service; inspect what is actually implemented.

Recommended records to support the requirements:

- Rides: stable ID, status, start/end times, moving/stopped duration, distance, data source and quality.
- Location samples: timestamps, coordinates, accuracy, speed, source, ride association.
- Fuel samples/events: timestamp, raw reading, calibrated value if available, simulated/real flag.
- Manual refills: litres, full/partial flag, distance reference, optional expense.
- Sync state: last durable records received and acknowledged per device.
- Settings/calibration: measurement mode, calibration version, installation baseline.

Exact schema, sampling rate, retention, database library, and migrations should be decided after repository inspection. Do not create a backend or cloud account system without a concrete need.

## 8. Original overview: context only, not verified completion

PROJECT_OVERVIEW.md describes a Vehicle-Monitor repository with:

- React Native 0.81, Expo SDK 54, TypeScript, Zustand, React Navigation.
- react-native-ble-plx, expo-location, expo-speech, map rendering and routing services.
- Arduino/C++ firmware in Firmware/FuelMonitor.ino.
- BLE telemetry, Wi-Fi HTTP development endpoint, LittleFS logs, and chunked sync.
- Dashboard, trip, fuel analytics, security, maintenance, and navigation screens.
- Hooks such as useBleTelemetry, useDeviceLocation, useOfflineSync, and useTripMeter.
- Services such as routingService, tripMeterService, fuelStorageService, offlineStorageService, syncProtocolService, and dataProcessingService.
- Supporting documents: PLAN.md, Vehicle.md, and offline monitor.md.

The overview claims many screens/services and firmware components are complete, but also lists real hardware testing, GPS integration, fuel calibration, BLE negotiation testing, and sync stress testing as pending. File size, line count, or an implemented screen is not evidence of a working end-to-end feature.

Useful claims to audit:

| Overview claim | Required check |
| --- | --- |
| GPS odometer already implemented | Identify mocked coordinates and the actual data path |
| Fuel calibrated to litres | Separate potentiometer scaling from real tank calibration |
| BLE MTU request fixes payload size | Check negotiated size, framing, fragmentation, and fallback |
| Odometer saved every 10 seconds, but very few writes per ride | Reconcile actual write behavior and recovery strategy |
| Ignition-on/off logging | Identify how ignition state is measured |
| Phone and firmware both have trip engines | Establish authority and prevent distance double-counting |
| Fuel heatmap / live mileage | Determine whether values are simulated, estimated, or measured |
| Map cache supports offline behavior | Distinguish cached display from search/routing availability |

The overview lists tank capacity, sender resistance, wire colour, divider values, a buck converter, and filtering components. Treat these as unverified bike-specific electrical assumptions. This handoff does not validate that circuit or authorize direct connection based only on those values. Verify the real signal and appropriate power/input protection before installation; a fuse and generic buck module alone are not evidence of transient protection.

## 9. Features not established as current requirements

Do not expand scope merely because the old overview lists twenty features. The following are deferred/unconfirmed:

- Remote theft tracking, geofence security, and recovery mode.
- Overnight fuel theft/leak monitoring.
- Petrol pump dispenser auditing.
- Evaporative fuel-loss measurement.
- Route-level fuel efficiency heatmaps.
- Weekly rider scores.
- Weather-based chain maintenance automation.
- Cryptographically verified resale/maintenance PDFs.
- iOS support.
- Cloud services, accounts, commercial rollout, or subscription plans.

Maintenance reminders, range-to-empty, expense forecasting, and petrol-pump routing may be useful later, but are not the three core priorities confirmed by the owner.

Remote alerts and parked monitoring would require explicit power and communication designs beyond local BLE and ignition-switched power. A signature on exported records would not prove the underlying sensor measurements are true.

## 10. Main risks and the chosen response

| Angle discussed | Concern | Response |
| --- | --- | --- |
| Demand / usefulness | Initial sales-oriented critique did not match the owner's purpose | Evaluate usefulness to this owner and learning value; no market validation needed |
| Technical feasibility | Software scope exceeds demonstrated sensing capability | Prove end-to-end data collection before promising precise analytics |
| Daily behavior | Manual startup, lost connections, and repeated prompts can make the app inconvenient | Automatic recording, durable saves, background testing, and restrained prompts |
| Scope | A navigation clone can consume the entire project | Deliver reliable ride recording first while preserving navigation as a core goal |
| Fuel quality | Simulated or noisy values can appear misleadingly precise | Label source/quality and use manual full-to-full records initially |

## 11. Recommended implementation sequence

This sequence was proposed as a practical path; it is not a claim that these steps are already complete.

### Phase 0 — Audit the existing repository

Read repository instructions and the files relevant to this handoff. Establish what is implemented, mocked, broken, or untested. Review package/build configuration, firmware, location flow, BLE framing, ride lifecycle, and storage. Preserve working code; avoid a speculative rewrite.

### Phase 1 — Working prototype pipeline

Get real potentiometer readings from the ESP32 to the phone over BLE. Integrate phone GPS as the current location source. Show connection notification and explicit test-data labels. Establish a durable ride record.

### Phase 2 — Automatic lifecycle and recovery

Start on validated movement. Persist incrementally. Implement manual end, paused rides, resume/finish prompt, disconnect recovery, and app restart recovery. Verify screen-locked operation on the owner's phone. Keep ignition state distinct from BLE state.

### Phase 3 — Useful mileage records

Add or validate manual refills and full-to-full interval calculations. Show overall mileage since installation and clearly labelled per-ride estimates. Verify partial fills and missing data behavior.

### Phase 4 — Essential in-app navigation

Audit existing map/search/routing code. Select compatible services after verifying current documentation and terms. Implement the essential navigation flow and test off-route and network-failure behavior.

### Phase 5 — Independent bike hardware

Prioritize the ₹2,000 budget against actual locally available parts and full installation cost. Purchase/design power conversion and protection, add a suitable distance/location source when feasible, validate real fuel sensing, and test disconnected logging and sync. Do not promise that all future hardware fits this budget without a priced BOM.

## 12. Acceptance checks for the prototype

- Potentiometer changes appear as simulated fuel telemetry in the app.
- A successful ESP32 connection produces a notification without notification spam during unstable reconnects.
- Connection while stationary does not immediately create a false ride.
- Movement starts recording under the selected, tested criteria.
- A brief traffic stop does not finalize the ride.
- Loss of BLE is not shown as confirmed ignition-off.
- Pause/finish decisions preserve the recorded data.
- An unanswered prompt leaves a saved, recoverable ride.
- Resume continues the same ride; manual finish finalizes it once.
- App restart can recover unfinished ride state.
- Phone GPS gaps are flagged; distance is not invented.
- Repeated sync does not duplicate records.
- Mock fuel never contaminates real refill analytics.
- Full-to-full mileage uses correctly matched distance and fuel.
- Estimated per-ride mileage is visibly distinguished from measured results.
- Essential navigation works inside the app, with understandable failures when services are unavailable.

Tests should focus on these behaviors, calculations, and recovery paths. Physical hardware, locked-screen behavior, ignition sensing, and fuel accuracy require real-device validation, not just unit tests.

## 13. Remaining uncertainties — do not re-ask settled questions

Resolve from code or direct inspection where possible:

1. Whether BLE telemetry already works on the actual board and phone.
2. Current power source and intended ignition sensing arrangement.
3. Exact firmware and mobile dependency versions.
4. Whether native Android background recording support is implemented.
5. Existing storage engine and ride/refill schemas.
6. Whether phone location is processed only in the app or also forwarded to the ESP32; prevent duplicate accumulation either way.
7. Actual map, geocoding, and routing providers and their terms.
8. Thresholds for movement, pause, and recovery.
9. Exact real-fuel sender interface and calibration procedure.
10. Hardware purchase priorities once current parts/prices are verified.

Do not ask again whether this is commercial, what board/phone is owned, whether manual refill entry is acceptable, whether internet navigation is allowed, or what the next-purchase budget is: those answers are above.

## 14. Suggested first instruction to Codex

> Read CODEX_PROJECT_HANDOFF.md and PROJECT_OVERVIEW.md, then inspect this repository and its applicable instructions. Treat the clarified owner requirements in the handoff as the current scope and the overview's completion claims as unverified. Report what is actually working, mocked, missing, and risky. Then implement the smallest end-to-end prototype increment: ESP32 potentiometer telemetry plus phone GPS, durable ride recording, and clear data-source labels. Reuse existing working code. Keep future standalone GPS support possible, but do not pretend phone-free distance tracking or measured fuel consumption works today. Ask only for hardware facts or decisions that cannot be established from the code or this handoff.

## 15. Completion standard

Success is a useful personal ride computer and a credible electronics learning experience: reliable records, honest mileage information, convenient automatic operation, and essential navigation. A large feature list or polished mock dashboard alone does not meet that goal.
