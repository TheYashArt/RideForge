import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraHeading,cameraZoom} from '../src/mapCamera.mjs';

test('camera prioritizes travel direction while moving and compass when slow',()=>{
 assert.equal(cameraHeading(90,10,180,90),90);
 assert.equal(cameraHeading(90,0,180,180),180);
 assert.equal(cameraHeading(-1,10,null,45),45);
});
test('heading crosses north by the shortest rotation and rejects unknown headings',()=>{
 const bearing=cameraHeading(1,10,null,359);
 assert.ok(bearing>359&&bearing<360);
 assert.equal(cameraHeading(null,0,-1,270),270);
});
test('camera shows more road at speed and zooms closer approaching a turn',()=>{
 assert.ok(cameraZoom(25)<cameraZoom(3));
 assert.equal(cameraZoom(25,100),18);
 assert.equal(cameraZoom(25,1000),15);
});
