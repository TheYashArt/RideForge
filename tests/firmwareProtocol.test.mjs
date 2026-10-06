import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';

const compiler=spawnSync('g++',['--version'],{encoding:'utf8'});
test('compiled firmware frames match app UUIDs and decode through its real BLE receiver', {skip:compiler.status!==0&&'Optional firmware host test requires g++'},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rideforge-protocol-'));
 try{
  const fixture=path.join(temp,'protocol.cpp'),executable=path.join(temp,process.platform==='win32'?'protocol.exe':'protocol');
  const header=path.resolve('firmware/Rideforge/RideforgeProtocol.h');
  fs.writeFileSync(fixture,`#include "RideforgeProtocol.h"
#include <cassert>
#include <limits>
using namespace RideforgeProtocol;
int main(){
 static_assert(kChunkBytes==20,"Default MTU compatible");
 assert(fuelPercent(-10,0,4095)==0);
 assert(fuelPercent(5000,0,4095)==100);
 assert(fuelPercent(2047.5f,0,4095)==50);
 assert(fuelPercent(0,4095,0)==100);
 char buffer[kFrameCapacity];
 assert(formatTelemetry(buffer,4,50,2048,0,0)==0);
 assert(formatTelemetry(buffer,sizeof(buffer),std::numeric_limits<float>::quiet_NaN(),0,0,0)==0);
 for(unsigned i=0;i<3;i++){
  const size_t length=formatTelemetry(buffer,sizeof(buffer),i*50.0f,i*2047,i,1000+i*500);
  assert(length>0&&length<sizeof(buffer));
  std::fwrite(buffer,1,length,stdout);
 }
}`);
  const build=spawnSync('g++',['-std=c++11','-Wall','-Wextra','-I',path.dirname(header),fixture,'-o',executable],{encoding:'utf8'});
  assert.equal(build.status,0,build.stderr);
  const run=spawnSync(executable,[],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const headerText=fs.readFileSync(header,'utf8');
  const service=headerText.match(/kServiceUuid\[\] = "([^"]+)"/)[1],characteristic=headerText.match(/kTelemetryUuid\[\] = "([^"]+)"/)[1];
  let monitor;
  const device={connect:async()=>device,discoverAllServicesAndCharacteristics:async()=>device,onDisconnected:()=>({remove(){}}),monitorCharacteristicForService:(s,c,callback)=>{assert.equal(s,service);assert.equal(c,characteristic);monitor=callback;return {remove(){}};},cancelConnection:async()=>{}};
  class BleManager{async state(){return 'PoweredOn';}startDeviceScan(services,options,callback){assert.deepEqual(services,[service]);callback(null,device);}stopDeviceScan(){}}
  const file=path.resolve('src/ble.ts'),mod=new Module(file),require=createRequire(file);
  const mocks={'react-native-ble-plx':{BleManager},'react-native':{Platform:{OS:'android',Version:36},PermissionsAndroid:{PERMISSIONS:{BLUETOOTH_SCAN:'scan',BLUETOOTH_CONNECT:'connect'},requestMultiple:async()=>({scan:'granted',connect:'granted'})}},'./tracking':{notify:async()=>{}}};
  mod.require=name=>name in mocks?mocks[name]:require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
  const readings=[];await mod.exports.connect(frame=>readings.push(frame),()=>{});
  const transmit=stream=>{for(let i=0;i<stream.length;i+=20)monitor(null,{value:Buffer.from(stream.slice(i,i+20),'ascii').toString('base64')});};
  transmit(run.stdout);
  assert.deepEqual(readings.map(r=>r.fuelPct),[0,50,100]);
  assert.ok(readings.every(r=>r.simulated&&r.ignition===null));
  // Interrupt one frame; the next leading newline restores the real app parser.
  transmit('{"v":1,"fuelPct":');transmit(run.stdout);
  assert.deepEqual(readings.map(r=>r.fuelPct),[0,50,100,0,50,100]);
  await mod.exports.disconnect();
 }finally{const resolved=path.resolve(temp);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('rideforge-protocol-'));fs.rmSync(resolved,{recursive:true,force:true});}
});
