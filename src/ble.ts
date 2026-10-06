import {BleManager,Device,Subscription} from 'react-native-ble-plx';
import {PermissionsAndroid,Platform} from 'react-native';
import {toByteArray} from 'base64-js';
import {parseTelemetry} from './core.mjs';
import {notify} from './tracking';
export const SERVICE='4fa869d1-1736-43c4-a393-b00e5a5a4309';
export const TELEMETRY='4fa869d2-1736-43c4-a393-b00e5a5a4309';
export type Telemetry={fuelPct:number;simulated:boolean;ignition:boolean|null};
let manager:BleManager|null=null,device:Device|null=null,monitor:Subscription|null=null,disconnectSub:Subscription|null=null;
let buffer='';
export async function connect(onData:(t:Telemetry)=>void,onStatus:(s:string)=>void){
 if(Platform.OS==='android'&&Number(Platform.Version)>=31){const result=await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]);if(Object.values(result).some(v=>v!=='granted'))throw Error('Bluetooth permissions are required.');}
 manager??=new BleManager();
 if(await manager.state()!=='PoweredOn')throw Error('Turn Bluetooth on, then connect.');
 onStatus('Scanning');
 const found=await new Promise<Device>((resolve,reject)=>{const timer=setTimeout(()=>{manager!.stopDeviceScan();reject(Error('ESP32 not found. Check firmware and power.'));},12000);manager!.startDeviceScan([SERVICE],null,(error,d)=>{if(error){clearTimeout(timer);manager!.stopDeviceScan();reject(error);}else if(d){clearTimeout(timer);manager!.stopDeviceScan();resolve(d);}});});
 device=await found.connect();device=await device.discoverAllServicesAndCharacteristics();
 buffer='';monitor?.remove();disconnectSub?.remove();
 disconnectSub=device.onDisconnected(()=>{monitor?.remove();device=null;onStatus('Disconnected');});
 monitor=device.monitorCharacteristicForService(SERVICE,TELEMETRY,(error,c)=>{if(error){onStatus('Disconnected');return;}if(!c?.value)return;buffer+=String.fromCharCode(...toByteArray(c.value));if(buffer.length>4096){buffer='';return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{onData(parseTelemetry(line));}catch{/* Ignore invalid frame; retain last valid reading. */}}});
 onStatus('Connected');await notify('ESP32 connected','Your bike telemetry is connected.');
}
export async function disconnect(){monitor?.remove();disconnectSub?.remove();manager?.stopDeviceScan();if(device)await device.cancelConnection().catch(()=>{});device=null;}
