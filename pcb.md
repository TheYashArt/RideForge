# Rideforge Motorcycle Hardware Design

## 1. Purpose

This document defines a new hardware architecture for Rideforge using four functional blocks:

1. Motorcycle power and battery management
2. ESP32-S3 controller and Bluetooth interface
3. u-blox M10 GNSS receiver
4. Motorcycle fuel-gauge monitor

The design is intended for a 12 V motorcycle electrical system. It does not depend on any existing PCB drawing or placement image.

This is a reference design, not yet a fabrication release. The exact GPS board identity, fuel-sender voltage range, battery type, connectors, enclosure and thermal limits must be confirmed before producing a final schematic or PCB.

## 2. Safety and electrical constraints

- Never connect the ESP32-S3, GPS or an ordinary charger directly to the motorcycle battery.
- A running motorcycle normally produces approximately 13.5-14.8 V, not a fixed 12 V.
- The power input must tolerate reverse battery connection, starter cranking, jump start, conducted noise and load-dump transients.
- Install a fuse close to the point where power is taken from the motorcycle harness.
- Do not cut or replace the original fuel sender. Read its signal with a high-impedance circuit while leaving the factory gauge operational.
- Do not install a Li-ion battery or unsealed electronics close to the fuel tank, engine, cylinder or exhaust.
- Disconnect the motorcycle battery before modifying its wiring.
- Use sealed, locking automotive connectors and strain relief for every external cable.

Automotive battery inputs require more protection than a normal bench supply. TI's automotive input-protection reference describes reverse-polarity, overvoltage, overload, jump-start and load-dump requirements: [Automotive 12 V/24 V battery input protection](https://www.ti.com/tool/TIDA-01167).

## 3. System architecture

```text
 MOTORCYCLE

 ACC/switched 12 V ── fuse ── reverse protection ── TVS/filter ── 12 V-to-5 V buck
 Battery negative ──────────────────────────────────────────────────── GND_STAR
                                                                  │
                                               optional power-path charger
                                                                  │
                                               protected 1-cell battery
                                                                  │
                                                       3.3 V regulator
                                                                  │
                           ┌──────────────────────────────────────┼──────────────┐
                           │                                      │              │
                      ESP32-S3                              MAX-M10S       fuel input
                           │                                      │          conditioner
                           │<──────────── 3.3 V UART ─────────────>│              │
                           │<──────────── optional PPS ────────────│              │
                           │<──────────────── ADC fuel signal ────────────────────┘
                           │
                           └──────────────── Bluetooth LE ─────────────── phone
```

All low-voltage blocks use the same regulated 3.3 V rail and the same PCB ground. The motorcycle fuel-gauge signal enters only through the protected high-impedance analog front end.

## 4. Recommended net names

| Net | Purpose |
|---|---|
| `BIKE_ACC_RAW` | Fused switched motorcycle supply before protection |
| `BIKE_GND` | Motorcycle battery negative at the power connector |
| `VIN_PROTECTED` | Reverse- and surge-protected vehicle supply |
| `V5_SYS` | Regulated 5 V power rail |
| `V3V3_SYS` | Regulated 3.3 V logic rail |
| `GND_STAR` | Common PCB ground tied to `BIKE_GND` at power entry |
| `GPS_TX` | GPS-to-ESP UART data |
| `GPS_RX` | ESP-to-GPS UART data |
| `GPS_PPS` | Optional one-pulse-per-second timing signal |
| `FUEL_GAUGE_RAW` | High-voltage tap from factory fuel-gauge signal |
| `FUEL_DIV` | Protected and divided fuel voltage |
| `FUEL_ADC` | Buffered 0-3.3 V signal for ESP ADC |
| `ACC_SENSE` | Optional protected ignition-state input |

## 5. Module 1: motorcycle power and battery management

### 5.1 Power-entry connector

Use a sealed two- or three-pin connector:

| Pin | Signal | Connection |
|---:|---|---|
| 1 | `BIKE_ACC_RAW` | Ignition-switched 12 V through an inline fuse |
| 2 | `BIKE_GND` | Battery negative or the harness ground return |
| 3 | `BIKE_BATT_RAW` | Optional permanent battery feed for charging only |

For the first prototype, use only switched accessory power and omit pin 3. This prevents the electronics from draining the motorcycle battery while parked.

### 5.2 Required input-protection chain

```text
BIKE_ACC_RAW
    │
   F1       0.5-1 A fuse
    │
   Q1       reverse-polarity MOSFET or automotive protection controller
    │
   D1       automotive TVS selected for the regulator and vehicle transient class
    │
 CMC/LC     conducted-noise input filter
    │
VIN_PROTECTED
    │
   U1       4.5-65 V automotive buck, configured for 5 V
    │
V5_SYS
```

An appropriate regulator class is the [LMR51610-Q1](https://www.ti.com/product/LMR51610-Q1), which is an automotive-qualified 4-65 V, 1 A synchronous buck converter. Use the manufacturer's complete reference circuit and PCB layout, including the specified inductor, input capacitors, output capacitors, feedback divider and thermal copper. Do not guess the switcher component values.

The TVS stand-off voltage must be above the highest legitimate charging voltage, while its clamped voltage must remain below the safe input limit of U1. Verify this combination against the required motorcycle transient tests. The fuse, TVS and reverse-protection component must be coordinated so that a sustained fault opens the fuse safely.

Do not use an unprotected LM2596 hobby board as the installed motorcycle power supply.

### 5.3 Power architecture without a local backup battery

This is the recommended first prototype:

```text
VIN_PROTECTED ── U1 5 V buck ── V5_SYS

V5_SYS ── ESP32-S3 development-board 5 V/VIN input
V5_SYS ── U2 3.3 V regulator, rated at least 1 A ── V3V3_SYS
V3V3_SYS ── GPS and fuel-signal conditioner
```

If the final PCB uses an ESP32-S3-WROOM module instead of a development board, U1 may be configured directly for 3.3 V if the chosen power design provides sufficient transient performance and at least 1 A of usable output current.

The ESP32-S3 operates from 3.0-3.6 V. Espressif recommends a 3.3 V supply capable of at least 500 mA, local 100 nF decoupling and at least 10 uF at the main supply entrance. The 3.3 V system should be designed for at least 1 A to cover ESP radio peaks, GPS startup and analog circuitry. See the [ESP32-S3 hardware design guidelines](https://documentation.espressif.com/esp-hardware-design-guidelines/en/latest/esp32s3/index.html).

### 5.4 Optional backup-battery architecture

Use this only when the device must remain alive after the ignition is switched off:

```text
V5_SYS
   │
   └── BQ24074 power-path charger
           ├── BAT ── protected 1-cell LiPo with NTC temperature sensor
           └── OUT ── TPS63070 3.3 V buck-boost ── V3V3_SYS
```

- Use a protected one-cell battery pack with a temperature sensor.
- Set the charge current for the cell capacity and enclosure temperature. A conservative 300-500 mA is preferable for the first prototype.
- Place the battery in a cool, dry, serviceable location.
- Do not feed motorcycle voltage directly into the charger. Its input is the already protected 5 V rail.
- Do not use a TP4056 board as a vehicle power-path manager.

Reference devices: [BQ24074 power-path charger](https://www.ti.com/product/BQ24074) and [TPS63070 buck-boost regulator](https://www.ti.com/product/TPS63070).

### 5.5 Ignition sensing with backup power

If the backup battery keeps the ESP powered after key-off, add an independent ACC sense:

```text
BIKE_ACC_RAW ── 220 kΩ ── ACC_SENSE ── 47 kΩ ── GND_STAR
                                │
                              10 nF
                                │
                             GND_STAR
```

Clamp `ACC_SENSE` to ground and 3.3 V with low-current Schottky diodes and connect it to a spare ESP GPIO through 1 kΩ. The firmware can then save state and enter deep sleep after detecting ignition off.

## 6. Module 2: ESP32-S3

### 6.1 Suggested GPIO allocation

| ESP32-S3 GPIO | Function | Direction |
|---:|---|---|
| GPIO17 | `GPS_TX` into ESP UART RX | Input |
| GPIO18 | `GPS_RX` from ESP UART TX | Output |
| GPIO16 | `GPS_PPS`, optional | Input |
| GPIO1 / ADC1_CH0 | `FUEL_ADC` | Analog input |
| GPIO2 / ADC1_CH1 | Optional battery-voltage ADC | Analog input |
| GPIO4 | `ACC_SENSE`, optional | Input |

UART signals can be assigned to other suitable ESP32-S3 pins in firmware. The proposed pins keep the native programming UART and native USB pins free.

Avoid using the following without verifying the exact ESP module and boot requirements:

- GPIO0, GPIO3, GPIO45 and GPIO46 are strapping pins.
- GPIO19 and GPIO20 are used by native USB.
- GPIO33-GPIO37 can be occupied internally by flash or PSRAM on some ESP32-S3 modules.

### 6.2 ESP32-S3-WROOM minimum circuit

For a bare ESP32-S3-WROOM module rather than a complete development board:

- Connect every specified 3.3 V and ground pad according to the module reference schematic.
- Place 10 uF and 100 nF at the 3.3 V module entrance.
- Pull `EN/CHIP_PU` up to 3.3 V with 10 kΩ and place approximately 1 uF from EN to ground.
- Pull GPIO0 up to 3.3 V with 10 kΩ and provide a boot switch from GPIO0 to ground.
- Provide the required programming USB or UART connection.
- Place the antenna end at a PCB edge and maintain the manufacturer's copper and component keep-out.
- Do not route the switching-regulator node, fuel-signal trace or GPS RF trace beneath either radio antenna.

### 6.3 External connections

| ESP pin | Connect to |
|---|---|
| 3V3 | `V3V3_SYS` for a module/custom PCB |
| 5V/VIN | `V5_SYS` only for a development board designed for 5 V input |
| GND | `GND_STAR` |
| GPIO17 | GPS TX |
| GPIO18 | GPS RX |
| GPIO16 | GPS TIMEPULSE/PPS, optional |
| GPIO1 | Conditioned fuel signal |

Never apply power simultaneously to both the 5 V input and the 3.3 V input of a development board unless its manufacturer explicitly supports that arrangement.

## 7. Module 3: u-blox M10 GPS

### 7.1 Product-identity warning

The official u-blox module is named **MAX-M10S**. `NEO-M10S` is often a seller's name for a carrier board and is not sufficient to determine its power-input or connector pinout. Check the marking on the RF module and obtain the carrier-board schematic.

The connections below apply to the raw MAX-M10S. If the purchased unit is a breakout board, follow its labeled connector and verify whether it includes a regulator, level shifting, antenna and backup supply.

### 7.2 Raw MAX-M10S connections

| MAX-M10S pin | Name | Connection |
|---:|---|---|
| 1 | GND | `GND_STAR` |
| 2 | TXD | ESP GPIO17 / UART RX |
| 3 | RXD | ESP GPIO18 / UART TX |
| 4 | TIMEPULSE | ESP GPIO16, optional |
| 5 | EXTINT | Leave open when unused |
| 6 | V_BCKP | Leave open when no external backup supply is used |
| 7 | V_IO | `V3V3_SYS` |
| 8 | VCC | `V3V3_SYS` |
| 9 | RESET_N | Leave open when unused |
| 10 | GND | `GND_STAR` |
| 11 | RF_IN | Controlled-impedance 50 Ω antenna trace |
| 12 | GND | `GND_STAR` |
| 13 | LNA_EN | Use only for an external LNA/active antenna circuit |
| 14 | VCC_RF | Filtered RF-supply output; never use as a power input |
| 15 | VIO_SEL | Leave open for 3.3 V I/O operation |
| 16 | SDA | Leave open when UART is used |
| 17 | SCL | Leave open when UART is used |
| 18 | SAFEBOOT_N | Leave open |

The MAX-M10S VCC, V_IO and digital pins must not exceed 3.6 V. Its startup inrush can reach approximately 100 mA, so the supply must not be sized only from normal tracking current. See the [MAX-M10S datasheet](https://content.u-blox.com/sites/default/files/MAX-M10S_DataSheet_UBX-20035208.pdf) and [MAX-M10S integration manual](https://content.u-blox.com/sites/default/files/MAX-M10S_IntegrationManual_UBX-20053088.pdf).

### 7.3 UART connection

The serial connection is crossed:

```text
MAX-M10S TXD ── 33-100 Ω optional series resistor ── ESP GPIO17 / UART RX
MAX-M10S RXD ── 33-100 Ω optional series resistor ── ESP GPIO18 / UART TX
MAX-M10S GND ─────────────────────────────────────── GND_STAR
```

No voltage-level translator is required when both V_IO and the ESP use 3.3 V.

### 7.4 GPS supply decoupling

Place near the GPS power pins:

- 100 nF from VCC to ground.
- 100 nF from V_IO to ground.
- 4.7-10 uF bulk capacitance on the local 3.3 V GPS rail.
- Optional ferrite bead separating the GPS supply from the digital 3.3 V rail, provided the resulting voltage drop and startup response remain acceptable.

### 7.5 Antenna and RF layout

If the carrier already has a patch antenna or U.FL connector, follow the carrier manufacturer's mounting instructions.

For a raw MAX-M10S:

- Route RF_IN as a calculated 50 Ω controlled-impedance trace.
- Keep the trace short and on one layer where possible.
- Maintain an uninterrupted ground reference beneath the RF trace.
- Use RF-rated, very-low-capacitance ESD protection at an exposed antenna connector.
- Reserve a pi matching footprint close to the antenna/feed as recommended by the antenna manufacturer.
- Surround the RF path with ground vias without violating the calculated transmission-line geometry.
- Do not prototype the antenna path on a solderless breadboard.
- Place the GPS antenna away from the ESP antenna and switching regulator.
- Mount a patch antenna with its radiating face toward the sky and away from metal shielding.

## 8. Module 4: factory fuel-gauge monitor

### 8.1 Measurement strategy

The recommended design leaves the factory fuel gauge and sender connected exactly as they are. Rideforge taps only the sender signal through a high-impedance input.

Do not connect the sender line directly to the ESP ADC. Depending on the motorcycle, the cluster may drive this line with DC, a pulsed waveform or a voltage related to the battery rail.

Before freezing the schematic, measure `FUEL_GAUGE_RAW` at empty, half and full tank with:

- Ignition off.
- Ignition on, engine stopped.
- Engine running.
- Gauge startup.

Use an oscilloscope as well as a multimeter to identify PWM or pulsed excitation. The reference front end below assumes the line remains between approximately 0 V and 16 V during normal operation.

### 8.2 High-impedance divider and protection

```text
FUEL_GAUGE_RAW
      │
    R1 110 kΩ, 1%
      │
    R2 110 kΩ, 1%
      │
      ├──────────── FUEL_DIV ──────────> U5 non-inverting input
      │                    │
    R3 47 kΩ               ├── C1 10 nF ── GND_STAR
      │                    │
 GND_STAR                  ├── Schottky clamp to GND_STAR
                           └── Schottky clamp to V3V3_SYS
```

Using two series 110 kΩ resistors shares voltage stress and limits transient current. Use suitably rated automotive resistors.

The divider ratio is:

```text
FUEL_DIV / FUEL_GAUGE_RAW = 47 / (110 + 110 + 47) = 0.176
```

Expected values are:

| Raw gauge voltage | `FUEL_DIV` |
|---:|---:|
| 5.0 V | 0.88 V |
| 12.0 V | 2.11 V |
| 14.5 V | 2.55 V |
| 16.0 V | 2.82 V |

The divider presents approximately 267 kΩ to the factory gauge, minimizing additional loading.

### 8.3 Analog buffer

Use an automotive-qualified rail-to-rail op-amp such as the [TLV9001-Q1](https://www.ti.com/product/TLV9001-Q1):

```text
                         TLV9001-Q1
FUEL_DIV ───────────────> + input
                          - input <────── output
                                         │
                                       R4 1 kΩ
                                         │
                                      FUEL_ADC ──> ESP GPIO1 / ADC1_CH0
                                         │
                                      C2 100 nF
                                         │
                                      GND_STAR
```

- Power the op-amp from `V3V3_SYS` and `GND_STAR`.
- Place a 100 nF supply-decoupling capacitor directly beside the op-amp.
- Connect the inverting input to the op-amp output before R4.
- R4 isolates the op-amp from the ADC filter capacitor.
- C2 follows Espressif's ADC filtering recommendation.
- Use ADC1 rather than ADC2 for fewer radio-sharing complications.

### 8.4 Calibration

The fuel sender and tank shape will not produce a linear litres-versus-voltage curve. Firmware should:

1. Average samples for approximately 10-30 seconds to reduce fuel-slosh error.
2. Reject readings outside the calibrated electrical range.
3. Store calibration points for empty, quarter, half, three-quarter and full.
4. Interpolate between calibration points with a lookup table.
5. Apply additional hysteresis to the displayed percentage.
6. Mark the reading stale if no believable sample is received.

If the real gauge signal exceeds 16 V, goes negative for sustained periods or has large fast pulses, redesign and validate the protection stage before connecting the ESP.

### 8.5 Standalone sender operation

If the factory cluster will be disconnected and Rideforge must excite the bare tank sender itself, do not use the divider above as-is. First measure the sender resistance at empty and full. A separate current-limited resistance-measurement circuit must then be designed around that resistance range. Never inject voltage into a sender that is still connected to the original cluster.

## 9. Grounding

Use one intentional ground return:

```text
Motorcycle battery negative
          │
      power connector
          │
       GND_STAR
          ├── input protection and buck ground
          ├── ESP ground
          ├── GPS ground
          └── fuel analog ground
```

- Prefer the motorcycle harness ground/battery negative over an arbitrary frame screw.
- Do not create a second long ground connection at the fuel tank.
- Keep the high-current buck-switching return local to the input/output capacitors.
- Join the quiet analog ground area to the main ground plane away from the switching node.
- Maintain a continuous ground plane underneath digital signals and the GPS RF transmission line.

## 10. Connectors

### J1: motorcycle power

| Pin | Net |
|---:|---|
| 1 | Fused switched 12 V / `BIKE_ACC_RAW` |
| 2 | `BIKE_GND` |
| 3 | Optional permanent battery supply |

### J2: fuel-gauge tap

| Pin | Net |
|---:|---|
| 1 | `FUEL_GAUGE_RAW` |
| 2 | Optional shield/ground reference; normally do not add a second chassis ground |

### J3: external GPS breakout, if not PCB-mounted

| Pin | Net |
|---:|---|
| 1 | `V3V3_SYS` |
| 2 | `GND_STAR` |
| 3 | GPS TX / `GPS_TX` |
| 4 | GPS RX / `GPS_RX` |
| 5 | GPS PPS / `GPS_PPS`, optional |

Add ground pins beside sensitive signals when using a larger connector. Confirm the breakout board's voltage requirements before populating J3.

## 11. PCB placement and routing

Use a four-layer board when practical:

1. Top: components and short critical signals.
2. Inner layer 1: uninterrupted ground plane.
3. Inner layer 2: 5 V, 3.3 V and slower signals.
4. Bottom: secondary signals and ground fill.

Suggested functional order across the board:

```text
[power connector/protection] [buck] [ESP32] [fuel analog] [GPS/RF/antenna]
```

Placement rules:

- Put the fuse connection, reverse protection, TVS and buck close to the power connector.
- Keep the buck hot loop as small as possible and follow the regulator reference layout exactly.
- Keep the buck inductor and switch node far from the GPS antenna and fuel op-amp.
- Place ESP and GPS antenna regions at board edges with their required keep-outs.
- Place GPS decoupling at the GPS supply pins.
- Place the fuel divider near the external fuel connector so high-voltage noise does not travel across the PCB.
- Keep `FUEL_DIV` and `FUEL_ADC` short and shielded by ground copper.
- Do not route any signal under an onboard RF antenna.
- Add ground stitching vias around the board edge and noisy power area, while respecting RF antenna requirements.
- Keep external connectors accessible after the PCB is installed in its enclosure.

## 12. Test points

Provide clearly labelled test points for:

- `BIKE_ACC_RAW`
- `VIN_PROTECTED`
- `V5_SYS`
- `V3V3_SYS`
- `GND_STAR`
- `GPS_TX`
- `GPS_RX`
- `GPS_PPS`
- `FUEL_GAUGE_RAW` through a protected/high-impedance access point
- `FUEL_DIV`
- `FUEL_ADC`
- `ACC_SENSE`

Do not place an exposed, unprotected raw battery test point where it can short against the enclosure.

## 13. Preliminary component list

| Reference | Function | Preliminary choice |
|---|---|---|
| F1 | Input fuse | 0.5-1 A inline or serviceable PCB fuse |
| Q1/U0 | Reverse-battery protection | Automotive MOSFET/controller selected for the transient requirement |
| D1 | Input TVS | Automotive TVS coordinated with U1 and F1 |
| U1 | Vehicle buck converter | LMR51610-Q1-class 65 V, 1 A buck |
| U2 | 3.3 V regulator | At least 1 A, selected for the chosen battery architecture |
| U3 | Controller | ESP32-S3-WROOM module or verified ESP32-S3 development board |
| U4 | GNSS | Genuine MAX-M10S or documented M10 carrier board |
| U5 | Fuel buffer | TLV9001-Q1 |
| U6 | Optional charger | BQ24074 |
| U7 | Optional 3.3 V buck-boost | TPS63070 |
| R1, R2 | Fuel input series divider | 110 kΩ, 1%, appropriately voltage rated |
| R3 | Fuel divider lower resistor | 47 kΩ, 1% |
| R4 | ADC isolation | 1 kΩ |
| C1 | Fuel input filter | 10 nF |
| C2 | ADC filter | 100 nF |

All installed components, connectors and capacitors should be selected for the expected temperature, vibration, moisture and voltage environment. Automotive-qualified parts are preferred for vehicle-facing circuits.

## 14. Bring-up procedure

1. Assemble and test only the protected power section.
2. Feed it from a current-limited bench supply at 12 V.
3. Verify input current, `V5_SYS`, `V3V3_SYS` and regulator temperature.
4. Sweep the bench input over the intended normal range before fitting the ESP or GPS.
5. Install the ESP and verify programming, boot and Bluetooth operation.
6. Install the GPS and verify UART data using a known-good antenna outdoors.
7. Apply a current-limited 0-15 V bench signal to the fuel input and confirm `FUEL_DIV` and `FUEL_ADC` against the calculated values.
8. Confirm that accidental open-circuit and ground conditions on the fuel input do not damage the ADC.
9. Measure the real motorcycle fuel-gauge waveform before attaching the fuel tap.
10. Connect the PCB to the motorcycle with the inline fuse installed.
11. Test key-on, engine crank, idle and charging conditions while monitoring both power rails.
12. Calibrate the fuel lookup table using known fuel quantities.
13. Perform extended vibration, temperature and enclosure-water-ingress tests before permanent installation.

## 15. Software interface requirement

The electrical GPS connection only delivers UART data to the ESP32-S3. Firmware must parse the u-blox NMEA or UBX messages and expose the required position, speed and validity fields over Bluetooth. The mobile application must then consume that Bluetooth data if the external GPS is to replace or supplement phone GPS.

The fuel firmware should transmit at least:

- Raw filtered ADC value.
- Calibrated fuel percentage.
- Sensor open/short fault state.
- Reading timestamp or freshness indicator.
- A flag distinguishing real sensor data from simulated development data.

## 16. Information required before schematic release

The following must be confirmed before this document can become a fabrication-ready schematic:

- Exact ESP32-S3 board or module part number.
- Exact marking and seller schematic for the device described as `NEO-M10S`.
- Whether a local backup battery is actually required.
- Battery chemistry, capacity and allowed charge temperature.
- Motorcycle model/year and whether power is taken from ACC or permanent battery.
- Fuel-sender wire identity.
- Fuel signal voltage/waveform at empty and full with the engine off and running.
- Required connector family, enclosure size and environmental rating.
- Whether the GNSS antenna is onboard, passive external or active external.

Until these items are known, do not release Gerbers or connect an unverified fuel-gauge wire to the PCB.
