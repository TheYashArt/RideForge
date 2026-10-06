#pragma once

#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>

namespace RideforgeProtocol {
constexpr char kDeviceName[] = "Platina_Telematics";
constexpr char kServiceUuid[] = "4fa869d1-1736-43c4-a393-b00e5a5a4309";
constexpr char kTelemetryUuid[] = "4fa869d2-1736-43c4-a393-b00e5a5a4309";
constexpr size_t kChunkBytes = 20; // Safe with the default ATT MTU of 23.
constexpr size_t kFrameCapacity = 160;

inline float fuelPercent(float raw, int emptyRaw, int fullRaw) {
  if (emptyRaw == fullRaw || !std::isfinite(raw)) return 0.0f;
  const float percent = (raw - emptyRaw) * 100.0f / (fullRaw - emptyRaw);
  return percent < 0 ? 0 : percent > 100 ? 100 : percent;
}

inline size_t formatTelemetry(char *buffer, size_t capacity, float fuel,
                              unsigned raw, uint32_t sequence, uint32_t uptime) {
  if (!std::isfinite(fuel) || fuel < 0 || fuel > 100) return 0;
  // A leading newline discards a partial prior frame after a lost packet or resubscribe.
  // "simulated" cannot be disabled: this firmware only measures a test potentiometer.
  const int length = std::snprintf(buffer, capacity,
      "\n{\"v\":1,\"fuelPct\":%.1f,\"simulated\":true,\"adc\":%u,\"seq\":%lu,\"uptimeMs\":%lu}\n",
      static_cast<double>(fuel), raw, static_cast<unsigned long>(sequence),
      static_cast<unsigned long>(uptime));
  return length > 0 && static_cast<size_t>(length) < capacity ? static_cast<size_t>(length) : 0;
}
} // namespace RideforgeProtocol
