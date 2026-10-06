import * as SQLite from 'expo-sqlite';
export type Ride={id:number;started:number;ended:number|null;status:string;km:number;source:string;last:string|null};
export type Fill={id:number;created:number;odometer:number;litres:number;full:number;cost:number|null};
let promise:ReturnType<typeof SQLite.openDatabaseAsync>|null=null;
export async function db(){
 if(!promise) promise=(async()=>{const d=await SQLite.openDatabaseAsync('rideforge.db');await d.execAsync(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS rides(id INTEGER PRIMARY KEY,started INTEGER NOT NULL,ended INTEGER,status TEXT NOT NULL,km REAL DEFAULT 0,source TEXT NOT NULL,last TEXT);
 CREATE TABLE IF NOT EXISTS points(id INTEGER PRIMARY KEY,ride INTEGER,timestamp INTEGER,latitude REAL,longitude REAL,accuracy REAL,speed REAL,UNIQUE(ride,timestamp));
 CREATE TABLE IF NOT EXISTS fills(id INTEGER PRIMARY KEY,created INTEGER,odometer REAL,litres REAL,full INTEGER,cost REAL);
 CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
 `);return d})();return promise;
}
export async function setting(key:string,fallback=''){return (await (await db()).getFirstAsync<{value:string}>('SELECT value FROM settings WHERE key=?',key))?.value??fallback;}
export async function setSetting(key:string,value:string){await (await db()).runAsync('INSERT OR REPLACE INTO settings VALUES(?,?)',key,value);}
export async function active(){return (await db()).getFirstAsync<Ride>("SELECT * FROM rides WHERE status!='finished' ORDER BY id DESC LIMIT 1");}
export async function rides(){return (await db()).getAllAsync<Ride>('SELECT * FROM rides ORDER BY id DESC');}
export async function fills(){return (await db()).getAllAsync<Fill>('SELECT * FROM fills ORDER BY odometer,created');}
export async function start(source='phone-gps'){
 const d=await db();
 await d.withExclusiveTransactionAsync(async tx=>{
  const old=await tx.getFirstAsync<Ride>("SELECT * FROM rides WHERE status!='finished' LIMIT 1");
  if(!old)await tx.runAsync('INSERT INTO rides(started,status,source) VALUES(?,?,?)',Date.now(),'recording',source);
 });
 return (await active())!;
}
export async function pause(){await (await db()).runAsync("UPDATE rides SET status='paused',last=NULL WHERE status='recording'");}
export async function resume(){await (await db()).runAsync("UPDATE rides SET status='recording',last=NULL WHERE status='paused'");}
export async function finish(){await (await db()).runAsync("UPDATE rides SET status='finished',ended=?,last=NULL WHERE status!='finished'",Date.now());await setSetting('armed','0');}

export async function deleteRide(id:number){
 const d=await db();
 await d.withExclusiveTransactionAsync(async tx=>{
  const ride=await tx.getFirstAsync<Ride>('SELECT * FROM rides WHERE id=?',id);
  if(ride&&ride.status==='recording')throw Error('Stop recording before deleting this ride.');
  await tx.runAsync('DELETE FROM points WHERE ride=?',id);
  await tx.runAsync('DELETE FROM rides WHERE id=?',id);
 });
}
export async function deleteFill(id:number){await (await db()).runAsync('DELETE FROM fills WHERE id=?',id);}
export async function resetData(){
 const d=await db();
 await d.withExclusiveTransactionAsync(async tx=>{
  await tx.runAsync('DELETE FROM points');
  await tx.runAsync('DELETE FROM rides');
  await tx.runAsync('DELETE FROM fills');
  await tx.runAsync('DELETE FROM settings');
 });
}
