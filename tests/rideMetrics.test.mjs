import test from 'node:test';
import assert from 'node:assert/strict';
import {speedReading,displaySpeed} from '../src/rideMetrics.mjs';

test('speedometer converts GPS metres per second to kilometres per hour',()=>{
 const reading=speedReading({speed:10,accuracy:5},10000);
 assert.equal(displaySpeed(reading,11000),36);
 assert.equal(displaySpeed(speedReading({speed:0,accuracy:5},10000),11000),0);
});
test('speedometer never presents missing, inaccurate or stale GPS as a live speed',()=>{
 for(const coords of [{speed:null,accuracy:5},{speed:-1,accuracy:5},{speed:10,accuracy:100},{speed:NaN,accuracy:5},{speed:10,accuracy:null}])assert.equal(displaySpeed(speedReading(coords,10000),11000),null);
 assert.equal(displaySpeed(speedReading({speed:20,accuracy:5},10000),16000),null);
 assert.equal(displaySpeed(null,11000),null);
});
