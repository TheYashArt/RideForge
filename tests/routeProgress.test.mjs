import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRoute,matchRoute,splitRoute,remainingRoute,routeStep,bearingBetween} from '../src/routeProgress.mjs';

test('a rider between sparse vertices stays on the route',()=>{
 const model=buildRoute([[0,0],[.02,0]]);
 const match=matchRoute(model,{latitude:0,longitude:.01});
 assert.ok(match.distance<.01);
 assert.ok(Math.abs(match.along-model.total/2)<.01);
});
test('completed and remaining routes meet at the projected position',()=>{
 const model=buildRoute([[0,0],[.01,0],[.02,0]]);
 const match=matchRoute(model,{latitude:0,longitude:.005});
 const split=splitRoute(model,match.along);
 assert.deepEqual(split.completed.at(-1),split.remaining[0]);
 assert.ok(Math.abs(split.remaining[0][0]-.005)<1e-8);
 assert.equal(split.completed[0][0],0);
 assert.equal(split.remaining.at(-1)[0],.02);
 assert.equal(splitRoute(model,0).completed.length,0);
 assert.equal(splitRoute(model,model.total).remaining.length,0);
});
test('route segment matching identifies off-route movement and disambiguates a loop crossing',()=>{
 const model=buildRoute([[0,0],[.01,0],[.01,.01],[0,0],[0,-.01]]);
 assert.ok(matchRoute(model,{latitude:.005,longitude:-.005}).distance>60);
 const start=matchRoute(model,{latitude:0,longitude:0},0);
 assert.equal(start.along,0);
 const later=matchRoute(model,{latitude:0,longitude:0},model.cumulative[3]);
 assert.ok(later.along>2000);
});
test('remaining distance/time shrink with progress and skipped maneuvers advance',()=>{
 const model=buildRoute([[0,0],[.02,0]]);
 assert.deepEqual(remainingRoute(model,model.total/2,2000,600),{metres:1000,seconds:300});
 const steps=[{distance:500},{distance:500},{distance:1000},{distance:0}];
 assert.equal(routeStep(steps,model.total*.6,model.total,2000),2);
});
test('direction fallback uses movement bearing, ignoring tiny stationary drift',()=>{
 assert.ok(Math.abs(bearingBetween({latitude:0,longitude:0},{latitude:0,longitude:.01})-90)<1e-6);
 assert.equal(bearingBetween({latitude:0,longitude:0},{latitude:0,longitude:.000001}),null);
});
