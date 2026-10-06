// GPS course is more useful than the phone's orientation while riding.
export function cameraHeading(course, speed, compass, previous = 0) {
  const valid = value => Number.isFinite(value) && value >= 0 && value < 360;
  const target = speed >= 2 && valid(course) ? course : valid(compass) ? compass : previous;
  const delta = ((target - previous + 540) % 360) - 180;
  return (previous + delta * 0.3 + 360) % 360;
}

export function cameraZoom(speed, metresToTurn = Infinity) {
  if (metresToTurn < 150) return 18;
  if (speed >= 22) return 15;
  if (speed >= 12) return 16;
  if (speed >= 5) return 17;
  return 18;
}
