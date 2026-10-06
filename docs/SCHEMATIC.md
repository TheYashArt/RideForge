# Rideforge schematic - Rev A draft

Basis: `pcb.md` and `pcb-components.md`, read 6 October 2026. Source files were not modified.

## Drawing set

- `output/pdf/rideforge-schematic.pdf`: four A3 landscape sheets.
- `output/hardware/schematic/01-power.svg`: protected vehicle supply, full U1 buck reference circuit, proposed U2 GPS regulator.
- `output/hardware/schematic/02-controller-gnss.svg`: controller, raw MAX-M10S and alternative breakout connection.
- `output/hardware/schematic/03-fuel-input.svg`: removable T-harness and fuel divider/clamps/buffer/filter.
- `output/hardware/schematic/04-connection-schedule.svg`: connection schedule and review items.
- `output/hardware/schematic/component-pin-schedule.csv`: component-pin-to-net schedule for later schematic capture.

These are vector schematic review drawings, not a KiCad project, CAD-generated netlist, ERC report, PCB layout, or fabrication package.

To regenerate, install `reportlab`, `pypdfium2` and `pypdf` into your Python environment, then run `python docs/build_schematic.py`. QA renders go to `tmp/schematic-qa/`.

## Scope and deliberate choices

The baseline uses switched motorcycle power and no backup battery, as in the current component list. The SuperMini remains an assembled development board. Its actual header positions and exposed GPIOs are not invented.

U1 is the 400 kHz forced-PWM LMR51610XFQDBVRQ1. Manufacturer reference values are 33 uH, 118 kOhm / 22.1 kOhm feedback, 2.2 uF plus 100 nF input bypass, 22 uF output, and 100 nF bootstrap. The reference divider gives about 5.07 V. This 6-65 V reference example does not establish cranking or vehicle surge performance. The 1 A buck rating is shared across both downstream branches.

U2 is a **proposed addition**, TLV76733QWDRBRQ1, a fixed 3.3 V automotive LDO rated 1 A. Pins IN/EN receive V5_SYS, OUT/SNS join V3V3_SYS, both GND pins and exposed pad join ground. Pins 2/7 remain NC; grounding them is permitted by the manufacturer. Use 1 uF input and 2.2 uF nominal output with effective capacitance/ESR checked against the datasheet. D20 shows the manufacturer reverse-current bypass orientation (OUT anode, IN cathode), with its exact part/rating unresolved. The LDO rating is not a verified thermal load budget: approximately 0.17 W at 100 mA and 1.7 W at 1 A.

V3V3_SYS supplies GNSS. The SuperMini's V3V3_FUEL output supplies U5 and the fuel upper clamp. They share GND_STAR but their regulator outputs are never joined. Vehicle power must be disconnected for PC USB programming unless the exact board's power-path arrangement is verified. Separately powered UART pins also require sequencing/backfeed verification; 47 Ohm series resistors are not power-off isolation.

The raw MAX-M10S drawing is an option, not a claim that the owned GPS is a bare module. Use raw U4 or alternative breakout J3, never both. J3 numbering is a proposed carrier connector, not a breakout-header pinout. The raw module baseline uses a compatible passive antenna through a short controlled-impedance 50 Ohm RF connection; connector, RF ESD and matching footprints remain antenna/layout-dependent. An active antenna requires a selected bias-T/supply design. VIO_SEL is open for 3.3 V I/O. TIMEPULSE must not be pulled low at startup. Unused reset/backup/control pins remain open as documented.

## Fuel circuit

Only the verified sender signal branches inside the new removable adapter. Every original contact passes straight through by electrical identity, not by an assumed view or wire colour. R1 sits at that branch takeoff before the outgoing cable; it is one of the existing two 110 kOhm resistors. The PCB connector therefore carries FUEL_TAP_LIMITED, not the raw pre-R1 voltage.

R1 + R2 + R3 = 267 kOhm; divider ratio = 47/267 = 0.17602996. Nominal FUEL_DIV: 0.880 V at 5 V raw, 2.112 V at 12 V, 2.552 V at 14.5 V, 2.816 V at 16 V. Worst 1% resistor extremes at 16 V are about 2.770-2.863 V. Hardware RC filtering suppresses electrical noise; firmware still needs slosh averaging and real tank calibration.

The standard DBV TLV9001QDBVRQ1 pin map is 1 OUT, 2 V-, 3 IN+, 4 IN-, 5 V+. OUT and IN- share FUEL_BUF before R4. D2 anode is FUEL_DIV, cathode V3V3_FUEL. D3 anode is ground, cathode FUEL_DIV. The op-amp supply decoupling C3 is separate from ADC filter C2.

The upper Schottky and op-amp rail diodes can inject current into the unpowered controller rail. Their presence is not a completed power-off protection solution. Select low-leakage parts and resolve rail-current handling or isolation after the actual sender signal and controller supply behavior are measured. No original sender excitation, new pull-up, or second tank-ground wire is added.

## Still open before schematic release

1. Exact SuperMini board schematic, power input, USB path, GPIO/header map and footprints.
2. Bare versus breakout MAX-M10S, actual connector order and passive/active antenna.
3. Coordinated fuse, reverse-battery protection, TVS, LC/CMC filter and pulse/temperature ratings.
4. Fuel sender connector identity, ground reference, waveform/loading and clamp/power-off behavior.
5. LDO reverse current and ESP/GNSS startup/shutdown/USB I/O sequencing.
6. Connector families, enclosure, thermal limits and installed component/PCB dimensions.

No CAD ERC, DRC, circuit simulation or on-bike test was performed. The draft has been checked against manufacturer pin tables, numerical divider calculations, its component-pin schedule, and rendered pages.

## References

- [TI LMR51610-Q1 data sheet](https://www.ti.com/lit/ds/symlink/lmr51610-q1.pdf)
- [TI TLV767-Q1 data sheet](https://www.ti.com/lit/ds/symlink/tlv767-q1.pdf)
- [TI fixed 3.3 V part identification](https://www.ti.com/product/TLV767-Q1/part-details/TLV76733QWDRBRQ1)
- [TI TLV9001-Q1 data sheet](https://www.ti.com/lit/ds/symlink/tlv9001-q1.pdf)
- [u-blox MAX-M10S data sheet](https://content.u-blox.com/sites/default/files/MAX-M10S_DataSheet_UBX-20035208.pdf)
- [u-blox MAX-M10S integration manual](https://content.u-blox.com/sites/default/files/MAX-M10S_IntegrationManual_UBX-20053088.pdf)
