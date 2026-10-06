import test from 'node:test';import assert from 'node:assert/strict';
import {mileage,validStep,parseTelemetry,distance} from '../src/core.mjs';
test('first full tank is a baseline, partial fill joins the next interval',()=>{const r=mileage([{odometer:100,litres:5,full:1,created:1},{odometer:200,litres:2,full:0,created:2},{odometer:400,litres:3,full:1,created:3}]);assert.equal(r.kmpl,60);assert.equal(r.litres,5);});
test('overall economy is weighted by consumed litres',()=>{assert.equal(mileage([{odometer:0,litres:9,full:1},{odometer:100,litres:2,full:1},{odometer:400,litres:10,full:1}]).kmpl,400/12);});
test('incomplete interval does not fabricate mileage',()=>{assert.equal(mileage([{odometer:100,litres:5,full:1}]).kmpl,null);});
test('GPS outage and inaccurate points never bridge distance',()=>{const a={latitude:18,longitude:73,timestamp:1000,accuracy:5};assert.equal(validStep(a,{...a,latitude:19,timestamp:100000}),0);assert.equal(validStep(a,{...a,latitude:18.001,timestamp:6000,accuracy:90}),0);});
test('reasonable GPS movement accepted, impossible jump rejected',()=>{const a={latitude:18,longitude:73,timestamp:1000,accuracy:5};assert.ok(validStep(a,{...a,latitude:18.0001,timestamp:6000})>0);assert.equal(validStep(a,{...a,latitude:19,timestamp:6000}),0);});
test('fuel frames default to simulated and reject bad values',()=>{assert.equal(parseTelemetry('{"v":1,"fuelPct":40}').simulated,true);assert.throws(()=>parseTelemetry('{"v":1,"fuelPct":140}'));assert.throws(()=>parseTelemetry('{"v":2,"fuelPct":40}'));});
