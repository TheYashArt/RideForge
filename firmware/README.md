# Rideforge ESP32-S3 firmware

This sketch turns the ESP32-S3 SuperMini into the BLE fuel sensor expected by the Rideforge Android app. The phone initiates the connection; the ESP32 advertises automatically whenever it is available. Use the app's Connect button, not Android's Bluetooth pairing screen.

## Bench wiring

Power the ESP32 from USB. With power disconnected, wire the potentiometer:

| Potentiometer connection | ESP32-S3 pin |
| --- | --- |
| Outer terminal | 3V3 |
| Other outer terminal | GND |
| Middle terminal / wiper | GPIO1 (IO1) |

Reversing the outer terminals reverses the direction of the fuel dial. All readings are labelled simulated. A disconnected wiper floats and gives meaningless readings; connect the pot or use demo mode below. Do not connect the bike's 12 V supply or fuel sender directly to the board/GPIO. Vehicle power conditioning and real fuel calibration are separate work.

## Upload with Arduino IDE

1. Open `Rideforge/Rideforge.ino`. Keep `RideforgeProtocol.h` in the same sketch folder.
2. In Boards Manager, install **esp32 by Espressif Systems**. This project targets **3.3.11**, including its NimBLE backend. The sketch also contains a separate subscription handler for the Bluedroid backend. BLE comes with that board package; do not install a separate legacy ESP32 BLE Arduino library.
3. Select **ESP32S3 Dev Module** and the board's COM port.
4. For the native USB connector, use **USB Mode: Hardware CDC and JTAG** and **USB CDC On Boot: Enabled**. Leave **PSRAM: Disabled**; the firmware does not require it. Set flash size/mode according to your particular board. The compilation profile used here targets 4 MB flash and the default partition scheme; do not infer your board's actual memory size from that profile.
5. Click Verify, then Upload. Open Serial Monitor at **115200 baud**. The app connection does not require Serial Monitor to remain open.

If the board does not enter upload mode, hold **BOOT**, briefly press/release **RESET**, then release **BOOT**. Reselect the COM port if it changes. Use a USB data cable. After upload, press RESET if the board remains in the bootloader. These are the standard BOOT/RESET steps; follow your board manufacturer's instructions if its buttons/connector differ.

## Connect to Rideforge

1. Turn on Bluetooth on your phone and grant Rideforge Nearby devices permission.
2. Open **Cockpit → Connect bike sensor (optional)**. This connects BLE without starting GPS recording. You can also use **Device → Connect ESP32 & arm recording**, which additionally asks for GPS permissions and arms recording.
3. The header should show **BIKE ONLINE**. Fuel should show **SIMULATED POTENTIOMETER** in Cockpit and **Simulated** in the riding panel.
4. Turn the potentiometer. Fuel should change between approximately 0–100%, with a small smoothing delay.
5. Disconnect in Device, then reconnect. The ESP32 restarts advertising after roughly half a second. The app currently requires another tap to reconnect; firmware cannot wake/auto-connect a terminated phone app.

Serial status example:

```text
Rideforge | BLE=connected | notify=on | ADC=2048 | fuel=50.0% | SIMULATED POTENTIOMETER
```

`BLE=connected` with `notify=off` means the phone connected but has not subscribed to the telemetry characteristic. A BLE connection alone is not proof the app has received a complete fuel frame.

## Test without a potentiometer

Change `RIDEFORGE_DEMO_MODE` from `0` to `1` near the top of the sketch and upload again. Fuel will sweep from 0 to 100 to 0 over 20 seconds. It remains labelled simulated and cannot contaminate manual refill mileage. Change it back to `0` to use GPIO1.

## App protocol

- Device name: `Platina_Telematics`
- Advertised service: `4fa869d1-1736-43c4-a393-b00e5a5a4309`
- Notify characteristic: `4fa869d2-1736-43c4-a393-b00e5a5a4309`
- CCCD: standard `0x2902` notifications subscription
- Telemetry interval: 500 ms, including when the fuel value has not changed
- ASCII JSON, newline terminated; packets are at most 20 bytes with 25 ms spacing
- A leading newline before each frame lets the phone discard any incomplete prior frame

```json
{"v":1,"fuelPct":50.0,"simulated":true,"adc":2048,"seq":10,"uptimeMs":5000}
```

The app uses `v`, `fuelPct`, and `simulated`; the extra fields support debugging. No ignition state is sent because the board has no validated ignition input. There is no PIN/pairing/bonding requirement in this bench firmware, and only one phone connection is expected. Power from a USB power bank works without an attached computer.

Phone GPS still supplies speed, distance, and navigation. This firmware does not measure actual tank litres, record standalone rides, write refill entries, or implement phone-free GPS/history sync.

## Verify from the command line

With Arduino CLI in your PATH and the board package installed:

```powershell
arduino-cli compile --fqbn "esp32:esp32:esp32s3:USBMode=hwcdc,CDCOnBoot=cdc,FlashSize=4M,PartitionScheme=default,PSRAM=disabled" firmware/Rideforge
```

Use the board's actual flash settings when uploading. The local CLI bundled with Arduino IDE is also available at `%LOCALAPPDATA%\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe` on this PC.

`npm test` includes a protocol integration test when a host `g++` is installed: it compiles the actual C++ formatter and sends its fragmented packets through the app's BLE receiver, including recovery after an interrupted frame. This does not replace a physical BLE/radio test.

Official references: [Espressif BLE UART example](https://github.com/espressif/arduino-esp32/blob/3.3.11/libraries/BLE/examples/UART/UART.ino), [ADC API](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/adc.html), [Arduino ESP32 installation](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html).

## Troubleshooting the first connection

| Symptom | Check |
| --- | --- |
| No serial port | Use a data cable, try the board's USB connector, and enter BOOT/RESET download mode. |
| App cannot find the ESP32 | Confirm the sketch is running and USB power is stable. Disconnect other BLE test apps; the board stops advertising while connected. |
| Connected, but no fuel updates | Check `notify=on` in Serial Monitor. If it stays off, disconnect/reconnect from Rideforge so the phone subscribes again. |
| Fuel jumps randomly | Connect the GPIO1 wiper and shared GND. An unwired ADC is floating. |
| Fuel goes backwards | Swap the potentiometer's two outer terminals with power disconnected. |
| Fuel stays stale after loss of power | Repower the board, then tap Connect in Rideforge again. The current phone app does not automatically reconnect. |
| Duplicate BLE libraries / build errors | Use the BLE library bundled with Espressif's board package and remove a conflicting manually installed legacy library from the sketchbook. |

## Build result on this PC

The normal potentiometer configuration compiled successfully with the board profile above and Espressif core 3.3.11 (NimBLE). It uses 598,613 bytes of application storage (45%) and 28,520 bytes of static RAM (8%). Firmware binaries are generated in `dist/firmware/`. The board has not been flashed or physically tested by this task. The Bluedroid compatibility branch is present but was not target-compiled in this environment.
