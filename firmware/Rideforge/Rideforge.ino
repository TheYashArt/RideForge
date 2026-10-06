/*
 * Rideforge ESP32-S3 BLE fuel prototype.
 * Target: ESP32S3 Dev Module, Espressif Arduino core 3.3.11, bundled BLE library.
 * USB power only for this bench setup. Pot outer pins: 3V3/GND; wiper: GPIO1.
 * Do not connect a motorcycle fuel sender or a 12 V wire directly to any GPIO.
 * Rideforge is the BLE central; this board advertises and accepts its connection.
 */
#include <Arduino.h>
#include <atomic>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#if defined(CONFIG_BLUEDROID_ENABLED)
#include <BLE2902.h>
#endif
#include "RideforgeProtocol.h"

#if !defined(CONFIG_IDF_TARGET_ESP32S3)
#error "Select ESP32S3 Dev Module (this firmware targets the ESP32-S3)."
#endif
#if !defined(CONFIG_BLUEDROID_ENABLED) && !defined(CONFIG_NIMBLE_ENABLED)
#error "Enable a BLE host stack in the Espressif Arduino ESP32 board package."
#endif

using namespace RideforgeProtocol;

// Set to 1 ONLY to test the BLE connection without a potentiometer attached.
#ifndef RIDEFORGE_DEMO_MODE
#define RIDEFORGE_DEMO_MODE 0
#endif
constexpr uint8_t kFuelPin = 1;
constexpr int kEmptyRaw = 0;
constexpr int kFullRaw = 4095; // Bench ADC scaling, NOT calibration of the bike tank.
constexpr uint32_t kSampleMs = 50;
constexpr uint32_t kFrameMs = 500;
constexpr uint32_t kChunkMs = 25;
constexpr uint32_t kAdvertiseDelayMs = 500;
static_assert(kFullRaw != kEmptyRaw, "ADC endpoints must differ");

BLECharacteristic *telemetry = nullptr;
#if defined(CONFIG_BLUEDROID_ENABLED)
BLE2902 *subscription = nullptr;
#endif
BLEAdvertising *advertising = nullptr;
std::atomic<bool> connected{false};
std::atomic<bool> subscribed{false};
std::atomic<bool> restartAdvertising{false};
std::atomic<uint32_t> connectionEpoch{0};

class ConnectionCallbacks : public BLEServerCallbacks {
 public:
  void onConnect(BLEServer *) override {
    subscribed.store(false);
#if defined(CONFIG_BLUEDROID_ENABLED)
    subscription->setNotifications(false);
#endif
    connectionEpoch.fetch_add(1);
    connected.store(true);
  }
  void onDisconnect(BLEServer *) override {
    connected.store(false);
    subscribed.store(false);
    connectionEpoch.fetch_add(1);
    restartAdvertising.store(true); // Restart from loop, outside the BLE callback.
  }
};

#if defined(CONFIG_BLUEDROID_ENABLED)
class SubscriptionCallbacks : public BLEDescriptorCallbacks {
 public:
  void onWrite(BLEDescriptor *) override {
    subscribed.store(subscription->getNotifications());
    connectionEpoch.fetch_add(1); // Never resume a half-sent frame on resubscription.
  }
};
#else
// NimBLE creates CCCD 0x2902 automatically; observe its subscription event.
class SubscriptionCallbacks : public BLECharacteristicCallbacks {
 public:
  void onSubscribe(BLECharacteristic *, ble_gap_conn_desc *, uint16_t value) override {
    subscribed.store((value & 1) != 0);
    connectionEpoch.fetch_add(1);
  }
};
#endif
ConnectionCallbacks connectionCallbacks;
SubscriptionCallbacks subscriptionCallbacks;

uint16_t rawAdc = 0;
float smoothedRaw = 0;
bool filterReady = false;
uint32_t sequence = 0;
char frame[kFrameCapacity];
size_t frameLength = 0;
size_t frameOffset = 0;

void sampleFuel() {
  uint32_t sum = 0;
  for (uint8_t i = 0; i < 16; ++i) sum += analogRead(kFuelPin);
  rawAdc = static_cast<uint16_t>(sum / 16);
  if (!filterReady) { smoothedRaw = rawAdc; filterReady = true; }
  else smoothedRaw += 0.18f * (rawAdc - smoothedRaw);
}

float currentFuel(uint32_t now) {
#if RIDEFORGE_DEMO_MODE
  // Clearly simulated triangular sweep: 0 -> 100 -> 0 every 20 seconds.
  const uint32_t phase = now % 20000;
  return (phase <= 10000 ? phase : 20000 - phase) / 100.0f;
#else
  (void)now;
  return fuelPercent(smoothedRaw, kEmptyRaw, kFullRaw);
#endif
}

void setup() {
  Serial.begin(115200); // Do not wait for Serial: BLE must work on a USB power bank.
  pinMode(kFuelPin, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(kFuelPin, ADC_11db);
  sampleFuel();

  BLEDevice::init(kDeviceName);
  BLEServer *server = BLEDevice::createServer();
  BLEService *service = server->createService(kServiceUuid);
  telemetry = service->createCharacteristic(kTelemetryUuid, BLECharacteristic::PROPERTY_NOTIFY);
#if defined(CONFIG_BLUEDROID_ENABLED)
  subscription = new BLE2902();
  subscription->setCallbacks(&subscriptionCallbacks);
  telemetry->addDescriptor(subscription);
#else
  telemetry->setCallbacks(&subscriptionCallbacks);
#endif
  server->setCallbacks(&connectionCallbacks);
  service->start();

  advertising = BLEDevice::getAdvertising();
  // Keep the 128-bit service UUID in the primary 31-byte advertisement so the
  // app's service-filtered scan can find it. Put the full name in scan response.
  BLEAdvertisementData primary;
  primary.setFlags(0x06); // General discoverable, no Bluetooth Classic.
  primary.setCompleteServices(BLEUUID(kServiceUuid));
  BLEAdvertisementData response;
  response.setName(kDeviceName);
  advertising->setAdvertisementData(primary);
  advertising->setScanResponseData(response);
  advertising->setScanResponse(true);
  advertising->setMinInterval(0x100); // 160 ms
  advertising->setMaxInterval(0x200); // 320 ms
  const bool started = advertising->start();
  if (!started) restartAdvertising.store(true);
  Serial.println(started ? "Rideforge: advertising. Open the app and tap Connect bike sensor." : "Rideforge: advertising failed; retrying.");
}

void loop() {
  const uint32_t now = millis();
  static uint32_t lastSample = 0, lastFrame = 0, lastChunk = 0, lastLog = 0;
  static uint32_t seenEpoch = 0, restartSince = 0;
  static bool restartPending = false;

  if (now - lastSample >= kSampleMs) { lastSample = now; sampleFuel(); }
  if (restartAdvertising.exchange(false)) { restartSince = now; restartPending = true; }
  if (restartPending && now - restartSince >= kAdvertiseDelayMs) {
    if (connected.load()) restartPending = false;
    else if (advertising->start()) { restartPending = false; Serial.println("Rideforge: advertising again."); }
    else restartSince = now;
  }

  const uint32_t epoch = connectionEpoch.load();
  if (epoch != seenEpoch) {
    seenEpoch = epoch;
    frameLength = frameOffset = 0;
    lastFrame = now - kFrameMs;
    lastChunk = now - kChunkMs;
  }

  if (connected.load() && subscribed.load()) {
    if (frameLength == 0 && now - lastFrame >= kFrameMs) {
      lastFrame = now;
      frameLength = formatTelemetry(frame, sizeof(frame), currentFuel(now), rawAdc, sequence++, now);
      frameOffset = 0;
    }
    if (frameLength > 0 && now - lastChunk >= kChunkMs) {
      const size_t left = frameLength - frameOffset;
      const size_t count = left < kChunkBytes ? left : kChunkBytes;
      // A reconnect/subscription event invalidates all in-flight fragments.
      if (connected.load() && subscribed.load() && connectionEpoch.load() == epoch) {
        telemetry->setValue(reinterpret_cast<const uint8_t *>(frame + frameOffset), count);
        telemetry->notify();
        frameOffset += count;
        if (frameOffset == frameLength) frameLength = frameOffset = 0;
      }
      lastChunk = now;
    }
  } else frameLength = frameOffset = 0;

  if (now - lastLog >= 1000 && Serial) {
    lastLog = now;
    Serial.printf("Rideforge | BLE=%s | notify=%s | ADC=%u | fuel=%.1f%% | SIMULATED%s\n",
      connected.load() ? "connected" : "waiting",
      subscribed.load() ? "on" : "off", rawAdc, currentFuel(now),
      RIDEFORGE_DEMO_MODE ? " DEMO" : " POTENTIOMETER");
  }
  delay(2); // Yield to the BLE/USB tasks; all transmission timing is non-blocking.
}
