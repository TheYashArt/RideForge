import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import {active,db,pause,setting,setSetting,start} from './db';
import {validStep} from './core.mjs';
const TASK='rideforge-location';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});
export async function notify(title:string,body:string){await Notifications.scheduleNotificationAsync({content:{title,body},trigger:null}).catch(()=>{});}
// Serialize foreground/background updates inside each JS runtime; SQLite transactions protect durable writes.
let queue=Promise.resolve();
let suspended=false;
export function ingest(loc:Location.LocationObject){queue=queue.then(async()=>{
 if(suspended)return;
 const p={...loc.coords,timestamp:loc.timestamp,accuracy:loc.coords.accuracy??999,speed:loc.coords.speed??0};
 if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||p.accuracy>35)return;
 let ride=await active();
 if(!ride&&await setting('armed')==='1'&&p.speed>=2){
  const since=Number(await setting('movingSince','0'));
  if(!since||p.timestamp-since>30000){await setSetting('movingSince',String(p.timestamp));return;}
  if(p.timestamp-since>=4000){ride=await start();await notify('Ride started','Phone GPS is recording your ride.');}
 }else if(!ride&&p.speed<2&&await setting('armed')==='1')await setSetting('movingSince','0');
 if(!ride||ride.status!=='recording')return;
 const d=await db();await d.withExclusiveTransactionAsync(async tx=>{
  const current=await tx.getFirstAsync<{last:string|null;status:string}>('SELECT last,status FROM rides WHERE id=?',ride!.id);
  if(current?.status!=='recording')return;
  const prev=current.last?JSON.parse(current.last):null;
  if(prev&&p.timestamp<=prev.timestamp)return;
  const added=await tx.runAsync('INSERT OR IGNORE INTO points(ride,timestamp,latitude,longitude,accuracy,speed) VALUES(?,?,?,?,?,?)',ride!.id,p.timestamp,p.latitude,p.longitude,p.accuracy,p.speed);
  if(added.changes)await tx.runAsync('UPDATE rides SET km=km+?,last=? WHERE id=?',p.speed>=1?validStep(prev,p):0,JSON.stringify(p),ride!.id);
 });
}).catch(async e=>{if(suspended)return;await setSetting('trackingError',String(e)).catch(()=>{});});return queue;}
TaskManager.defineTask<{locations:Location.LocationObject[]}>(TASK,async({data,error})=>{if(error){if(suspended)return;await setSetting('trackingError',error.message);return;}for(const l of data?.locations??[])await ingest(l);});
let arming:Promise<void>|null=null;
export function arm(){
 if(suspended)return Promise.reject(Error('Tracking is being stopped. Try again shortly.'));
 if(!arming)arming=enableTracking().finally(()=>{arming=null;});
 return arming;
}
async function enableTracking(){
 const fg=await Location.requestForegroundPermissionsAsync();if(!fg.granted)throw Error('Location permission is required.');
 const bg=await Location.requestBackgroundPermissionsAsync();if(!bg.granted)throw Error('Allow background location to record with the screen locked.');
 await Notifications.setNotificationChannelAsync('rides',{name:'Ride recording',importance:Notifications.AndroidImportance.DEFAULT});
 await Notifications.requestPermissionsAsync();
 if(!await Location.hasStartedLocationUpdatesAsync(TASK))await Location.startLocationUpdatesAsync(TASK,{accuracy:Location.Accuracy.BestForNavigation,timeInterval:2000,distanceInterval:3,foregroundService:{notificationTitle:'Rideforge GPS active',notificationBody:'Ride tracking is enabled. Manage your ride in Cockpit.'},pausesUpdatesAutomatically:false});
 await setSetting('armed','1');await setSetting('movingSince','0');
}
export async function disarm(){await setSetting('armed','0');if(await Location.hasStartedLocationUpdatesAsync(TASK))await Location.stopLocationUpdatesAsync(TASK);await pause();}
export async function recoverTracking(){
 if(suspended)return;
 const ride=await active();
 if((ride?.status==='recording'||await setting('armed')==='1')&&!await Location.hasStartedLocationUpdatesAsync(TASK))await arm();
}

// Stop producers and drain pending sample writes before destructive data changes.
export async function suspendTracking(){
 suspended=true;
 try{if(arming)await arming.catch(()=>{});await disarm();await queue;}catch(e){suspended=false;throw e;}
}
export function releaseTracking(){suspended=false;}
export async function clearRideNotifications(){await Notifications.cancelAllScheduledNotificationsAsync();await Notifications.dismissAllNotificationsAsync();}
