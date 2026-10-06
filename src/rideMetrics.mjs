export function speedReading(coords, timestamp) {
 const valid=Number.isFinite(coords.speed)&&coords.speed>=0&&Number.isFinite(coords.accuracy)&&coords.accuracy<=35;
 return {kmh:valid?coords.speed*3.6:null,timestamp};
}
export function displaySpeed(reading, now) {
 if(!reading||reading.kmh===null||!Number.isFinite(reading.kmh)||reading.kmh<0||!Number.isFinite(reading.timestamp)||now-reading.timestamp>5000||reading.timestamp-now>1000)return null;
 return Math.round(reading.kmh);
}
