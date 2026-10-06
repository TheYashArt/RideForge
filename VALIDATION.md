# Validation — 24 September 2026

Passed:

- Dependency installation with a reproducible package-lock.json.
- TypeScript strict type checking.
- Six Node tests: baseline/partial refills, weighted mileage, incomplete intervals, poor GPS/gaps, plausible movement versus jumps, invalid BLE frames.
- Expo dependency compatibility check.
- Android Metro/Hermes JavaScript export: 775 modules, approximately 2.16 MB bundle before the system-UI addition.
- Expo Android native project generation and plugin evaluation.

Not performed:

- Gradle APK compilation (no configured Android SDK/device here).
- Installation or visual inspection on Android.
- ESP32 firmware compilation or flashing.
- BLE connection, foreground-service recording, screen-locked behavior, or navigation field tests.
- Real fuel calibration, ignition sensing, or bike power tests.

This is a first implementation for device validation, not a certified road-ready or fully completed system. Consult README.md for the implemented features and remaining work.

## Ride/navigation update

- TypeScript check passed.
- Eleven Node tests passed, including camera heading/zoom and mocked React lifecycle checks for tab persistence, navigation restoration, ride end, and Cockpit refill display.
- Android Metro/Hermes export passed (776 modules, approximately 2.18 MB).
- Map rotation script URL was fetched successfully.
- Component tests mock location, BLE, and storage; they do not prove Android hardware behavior or physical SQLite durability.
- New camera behavior, phone compass, screen-locked GPS, and force-stop recovery still need device validation. No APK build or on-phone UI validation was performed for this update.

## Mounted ride view update

- TypeScript check passed.
- All 13 Node tests passed, including speed conversion, rejection of unknown/stale GPS speed, automatic ride-view entry, 70/30 flex allocation, and navigation remaining mounted when leaving/reopening the riding screen.
- Physical-phone layout, GPS speed accuracy, and mounted-road testing have not been performed for this update.

## Data deletion/reset update

- TypeScript passed; all 19 tests passed.
- Added SQLite integration checks using isolated in-memory databases: ride/point deletion, refill isolation, active-recording protection, transactional rollback, and clearing all four tables before starting a fresh ride.
- Added UI checks for confirmations, list refresh, reset operation ordering, and clearing unsaved form state.
- The SQLite integration tests require Node 22+ and skip on older supported Node versions. This run used Node 24.
- Tests did not delete any records on the connected phone. On-device testing of these controls remains pending.

## Tab bar and moving-route update

- TypeScript check and all 26 tests passed.
- Tests cover segment matching between sparse vertices, route splitting, crossing disambiguation, remaining distance/time, automatic rerouting from GPS callbacks, retained completed sections, and arrow orientation under map rotation.
- Android Metro/Hermes export passed: 790 modules, approximately 2.26 MB, including the bundled Ionicons font.
- The map bridge test executes the embedded JavaScript against a small Leaflet mock; on-device visual and road validation remains pending.

## ESP32-S3 firmware update

- Successfully compiled `firmware/Rideforge` with Espressif Arduino core 3.3.11 and its installed NimBLE backend.
- Board profile: `esp32:esp32:esp32s3:USBMode=hwcdc,CDCOnBoot=cdc,FlashSize=4M,PartitionScheme=default,PSRAM=disabled`.
- Program storage: 598,613 bytes of 1,310,720 bytes (45%). Static RAM: 28,520 bytes of 327,680 bytes (8%).
- Build artifacts are in `dist/firmware/`; this folder is ignored by version control.
- All 27 Node tests and TypeScript checking passed. The firmware integration test compiles the actual C++ formatter with host g++, validates ADC scaling/bounds, and feeds 20-byte fragments through the app's BLE receiver, including recovery after an interrupted frame.
- The sketch contains separate NimBLE and Bluedroid subscription handlers. Only the installed NimBLE backend was target-compiled in this run.
- No firmware upload, physical BLE connection, actual potentiometer reading, ignition sensing, or motorcycle installation was performed.
