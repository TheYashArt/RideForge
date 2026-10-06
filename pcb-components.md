# Rideforge Module Component List

Source: [pcb.md](pcb.md)

This list is for **one Rideforge module** using an **ESP32-S3 SuperMini development board** and a **u-blox MAX-M10S GNSS receiver**, with motorcycle accessory power and fuel monitoring, **without a backup battery**.

The controller board and GNSS receiver are selected. The exact SuperMini board revision and whether the MAX-M10S is a bare module or mounted on a breakout board remain to be confirmed.

This is a preliminary bill of materials. Some power-circuit parts and component ratings still require selection before it becomes a complete shopping list. Quantities below apply to one unit; development boards and breakout boards may already include some supporting components.

## 1. Main Electronics and Power Components

| Component | Quantity | Specification / purpose |
|---|---:|---|
| ESP32-S3 SuperMini development board | 1 | Selected controller board; includes the ESP32-S3 and Bluetooth LE |
| u-blox MAX-M10S | 1 | Selected GPS/GNSS receiver; confirm bare module versus breakout board to determine the additional parts needed. [Datasheet](https://content.u-blox.com/sites/default/files/MAX-M10S_DataSheet_UBX-20035208.pdf) |
| Compatible GNSS antenna | 1 | May already be included with the GPS breakout |
| Automotive 12 V to 5 V buck converter | 1 | [LMR51610-Q1](https://www.ti.com/product/LMR51610-Q1), 65 V input class, 1 A output |
| Buck-converter supporting components | 1 set | Inductor, input/output capacitors, bootstrap capacitor and feedback resistors selected from the manufacturer's reference circuit |
| External 5 V to 3.3 V regulator | 1 | Retained for the GPS; at least 1 A as specified in the source reference architecture. The SuperMini's own regulator powers its ESP32-S3 and fuel buffer. Exact external regulator remains unspecified |
| 3.3 V regulator supporting components | 1 set | Capacitors and any other parts required by the selected regulator |
| Input fuse | 1 | 0.5-1 A, with a suitable holder |
| Reverse-polarity protection circuit | 1 set | Automotive MOSFET or protection controller, plus supporting parts |
| Automotive TVS diode | 1 | Surge suppression; exact rating must match the protection design |
| Input noise filter | 1 set | LC filter or common-mode choke arrangement, with suitable capacitors |

The buck converter, reverse-polarity protection and filter require complete supporting circuits. Buying only the ICs does not complete the power section.

### Power Arrangement for the Selected Boards

```text
Motorcycle ACC -> fuse -> reverse protection -> TVS/filter -> 5 V buck
                                                           |
                                                           +-> SuperMini verified 5 V input
                                                           |   +-> regulated 3V3 output -> fuel op-amp
                                                           |
                                                           +-> external 3.3 V regulator
                                                               +-> MAX-M10S
```

Use a common ground for the SuperMini, GPS and fuel circuitry. The external 3.3 V rail does not connect to the SuperMini's 3V3 pin while the board is powered through its 5 V input.

The fuel buffer and upper input clamp use the SuperMini's regulated 3V3 output (`V3V3_FUEL`) so that the buffer and ESP ADC share a supply. Confirm this output on the actual board. The external 3.3 V regulator may be omitted only after the actual SuperMini regulator's spare current, thermal performance and startup response are verified for the GPS and fuel load. In that alternative, the SuperMini's regulated 3V3 output supplies those loads; do not connect two regulator outputs together. The [MAX-M10S datasheet](https://content.u-blox.com/sites/default/files/MAX-M10S_DataSheet_UBX-20035208.pdf) specifies startup inrush up to approximately 100 mA. An active antenna can add further load.

## 2. Fuel-Monitor Circuit

These quantities are specified in the source document.

| Component | Quantity | Purpose |
|---|---:|---|
| [TLV9001-Q1 op-amp](https://www.ti.com/product/TLV9001-Q1) | 1 | Buffers the fuel signal |
| 110 kΩ resistor, 1%, suitably voltage rated | 2 | Upper voltage-divider resistors |
| 47 kΩ resistor, 1% | 1 | Lower voltage-divider resistor |
| 1 kΩ resistor | 1 | ADC input isolation |
| 10 nF capacitor | 1 | Fuel-input filtering |
| 100 nF capacitor | 2 | ADC filtering and op-amp supply decoupling |
| Suitable low-leakage Schottky clamp diodes | 2 junctions | Input protection; possibly one suitable dual-diode package |

Retain the motorcycle's existing fuel sender and gauge. **No replacement fuel sender or separate Bluetooth module is needed.**

The selected bike is a user-identified **2023 Bajaj Platina 110 BS6 Phase 1 with a needle gauge**. Assume a float-operated resistive sender until verified. Use a removable T-harness; branch the signal only in that new adapter and pass every original terminal straight through. No original motorcycle wire may be cut or pierced. If R1 is fitted at the adapter's branch takeoff, it is one of the two listed 110 kΩ resistors, not an additional resistor.

See `pcb.md` sections 8.0–8.3 for the adapter arrangement, clamp polarity and exact standard DBV TLV9001-Q1 pin connections. The Schottky clamps can inject current into the 3.3 V rail when the module is off or the input is overvoltage; final rail-current handling and powered-off protection remain to be selected and validated.

## 3. Connectors and Physical Parts

| Item | Quantity | Notes |
|---|---:|---|
| Sealed 2-pin power connector and mating plug | 1 pair | Include contacts and seals |
| Sealed fuel-tap connector and mating plug | 1 pair | Matches the harness arrangement |
| OEM-compatible sender adapter plug and socket | 1 mating connector of each required type | With terminals, seals and adapter wiring; matches the existing sender connection exactly, passing all original pins straight through and adding the signal branch only in the new adapter |
| 4- or 5-pin GPS connector | 1 pair, if external | Power, ground, UART and optional PPS |
| SuperMini mounting headers/sockets | 1 set, if socketed | Match the actual board footprint and header arrangement |
| USB-C data cable | 1 | For SuperMini programming and bench testing |
| PCB or carrier board | 1 | Four layers preferred for the custom PCB |
| Sealed enclosure | 1 | Sized for the boards and connectors |
| Automotive wiring, strain relief and mounting hardware | As needed | For installation |

## 4. SuperMini and MAX-M10S Supporting Parts

Breakout and development boards may already contain supporting parts. Check their schematics before ordering duplicates.

### ESP32-S3 SuperMini

The SuperMini is used as an assembled development board. The separate bare-ESP support circuit is therefore excluded from this shopping list: EN/GPIO0 pull-ups, reset-timing capacitor, ESP supply decoupling, boot button and USB programming circuitry are expected to be provided by the board. Check the actual board schematic rather than adding duplicates automatically.

A [vendor-documented SuperMini implementation](https://iotcrazy.com/docs/esp32-s3-m.html) includes a regulated 3V3 output, native USB-C and BOOT/RESET buttons. This is a reference for that vendor's board, not confirmation of the user's exact board revision or regulator rating. No separate USB-to-UART programmer is needed when the board's native USB programming connection is available.

The GPIO17/GPIO18/GPIO16 assignments in the source document are ESP32-S3 chip-level suggestions, not a verified SuperMini wiring map. Final UART, optional PPS, fuel ADC and optional ignition-sense pins must be selected from the actual board's exposed GPIOs. Reserve GPIO19/GPIO20 for native USB and use a suitable ADC1 pin for the fuel input. See [Espressif's GPIO reference](https://docs.espressif.com/projects/esp-idf/en/v5.0/esp32s3/api-reference/peripherals/gpio.html).

### MAX-M10S: Bare Module Versus Breakout Board

For a **bare MAX-M10S**, include the following additional parts. If it is already on a breakout board, buy only the items missing from that board.

| Component | Quantity | Purpose |
|---|---:|---|
| 100 nF capacitor | 2 | VCC and V_IO decoupling |
| 4.7-10 µF capacitor | 1 | Local GPS supply bulk decoupling |
| Compatible GNSS antenna | 1 total | The antenna already listed in Section 1; do not count twice |
| RF connector/pigtail | As required | For the selected external antenna |
| Low-capacitance RF ESD protection | As required | For an exposed antenna connector |
| Antenna matching components | As required | Selected for the antenna and RF layout |

Optional GPS components:

- Two 33-100 Ω UART series resistors.
- One supply ferrite bead.

For the bare module, power VCC and V_IO from the regulated 3.3 V rail and leave VIO_SEL open for 3.3 V I/O operation. The module is not a 5 V device; its VCC absolute maximum is 3.6 V. UART level shifting is unnecessary when both devices use 3.3 V I/O. A breakout board's input voltage depends on its onboard circuitry and must be checked separately. See the [MAX-M10S datasheet](https://content.u-blox.com/sites/default/files/MAX-M10S_DataSheet_UBX-20035208.pdf).

## 5. Optional Backup-Battery Parts

Add these only if operation after ignition-off is required.

| Component | Quantity | Notes |
|---|---:|---|
| Protected single-cell Li-ion/LiPo battery with NTC temperature sensor | 1 | Capacity and temperature limits must be selected |
| [BQ24074 power-path charger](https://www.ti.com/product/BQ24074), with supporting components | 1 circuit | Powered from the protected 5 V rail |
| [TPS63070 buck-boost regulator](https://www.ti.com/product/TPS63070), with supporting components | 1 circuit | Configured for 3.3 V; replaces the basic 3.3 V regulator stage |
| Battery connector | 1 pair | Compatible with the selected battery pack |
| 220 kΩ resistor | 1 | Ignition-sensing divider |
| 47 kΩ resistor | 1 | Ignition-sensing divider |
| 1 kΩ resistor | 1 | Ignition-sensing GPIO series resistor |
| 10 nF capacitor | 1 | Ignition-sensing filter |
| Suitable Schottky clamp diodes | 2 junctions | Ignition-sensing protection |

The ignition-sensing circuit requires validation against the ESP32-S3 input thresholds. The charger current, battery capacity and power budget also require confirmation. These optional resistor and capacitor quantities are additional to the fuel-monitor components.

For the SuperMini, backup power must also reach the controller after ignition-off. The source document's 3.3 V backup rail cannot simply be assumed to power a board connected only to switched 5 V. Verify an approved 3.3 V input arrangement or design a suitable backup supply for its 5 V input before selecting the final backup components. Any onboard battery-charging circuit must be identified and assessed separately; its presence does not establish power-path capability.

## 6. Details to Confirm Before Final Ordering

- ESP32-S3 SuperMini seller/model/revision, exposed GPIOs, regulator rating and power-input arrangement.
- Whether the selected MAX-M10S is bare or on a breakout board; if a breakout, its schematic and supply requirements.
- GNSS antenna type: included, passive external or active external.
- Vehicle transient requirements and coordinated fuse, TVS and reverse-protection ratings.
- Exact 3.3 V regulator and all regulator/filter supporting components.
- Motorcycle fuel-signal voltage and waveform.
- Exact sender signal pin and ground reference, T-harness mating connectors, input clamp ratings and powered-off/rail-current protection.
- Connector family, enclosure dimensions and environmental requirements.
- If using backup power: battery capacity, temperature limits and charge current.

The fuel divider assumes approximately **0-16 V** on the sender signal during normal operation. Measure the motorcycle's actual voltage and waveform before connecting it. The source design is not yet a fabrication-ready schematic or final production BOM.
