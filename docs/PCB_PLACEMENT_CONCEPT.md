# Rideforge carrier PCB placement concept

Status: visual study only. No circuit simulation, schematic capture, ERC, PCB routing, DRC, thermal analysis, or fabrication files have been completed.

This concept reuses the ESP32-S3 SuperMini and SmartElex MAX-M10S breakout. It is not a design for a bare GPS or ESP32 chip. Physical fit must be checked against measured board dimensions, mounting holes, header pitch, component heights and connector overhangs before choosing the carrier outline.

## Proposed placement

| Area | Parts / connections | Outstanding work |
| --- | --- | --- |
| Left: vehicle power | Switched 12 V/GND connector; fuse; TVS; reverse-polarity MOSFET circuit; optional gate Zener; buck regulator with inductor and input/output capacitors | Select a coordinated protection circuit and regulator; determine pulse ratings, fuse sizing, component footprints and thermal requirements. Placement artwork does not establish circuit topology. |
| Centre: controller | ESP32-S3 SuperMini on securely mounted headers; accessible USB; antenna positioned at carrier edge | Confirm board revision and pinout, manufacturer antenna keepout, power input and regulator capacity. Prevent USB/external-supply backfeed. |
| Upper right: GPS | SmartElex MAX-M10S breakout; outward SMA connector; 3.3 V and GND; 100 nF and 10 uF local decoupling if needed | Check breakout dimensions and antenna bias requirements. Keep switching power components and high-current paths away. |
| Lower right: fuel input | Gauge-signal/reference connector; reserved pads for series limiting, scaling, clamps, filter and possible buffer | Measure the original gauge signal with gauge connected. Select actual topology and component values; check loading, transients and power-off behaviour. Do not connect the bike signal to GPIO1 directly. |

The 3.3 V external regulator shown in the concept is an option if the SuperMini supply lacks capacity; its output must not be paralleled with the onboard regulator. The gate Zener is optional and depends on the reverse-polarity circuit selected. Neither part is automatically required.

## Proposed logical signal assignments

- GPS TX -> ESP32 GPIO5 (UART RX).
- ESP32 GPIO4 (UART TX) -> GPS RX.
- GPS supply -> regulated 3.3 V; GPS GND -> circuit ground.
- Validated fuel-interface output -> GPIO1; retain the factory gauge and sender wiring.
- ESP32 -> phone by BLE, without an electrical connection.

GPIO4/5 require a firmware change. Existing firmware implements simulated potentiometer fuel telemetry, not GPS reception or calibrated bike fuel measurement.

## Before this becomes a manufacturable PCB

1. Select the exact power design and identify the gauge signal.
2. Capture the complete schematic with verified symbols and footprints, then run electrical rule checks.
3. Check module dimensions and connector access in CAD; size the board and enclosure from those checks.
4. Route the PCB, preserve antenna clearance, evaluate grounding, regulator heat and transient current paths, and run design rule checks.
5. Assemble and validate a prototype under controlled power, then test vehicle power and gauge behaviour before permanent installation.

The generated image is a placement illustration. Decorative traces are not a usable routing design. A rendered board image cannot demonstrate that the circuit works.
