import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';

// Exercise the app's SQL against SQLite without opening any phone/user database.
const sqlite=await import('node:sqlite').catch(()=>null);
async function fixture(){
 const sql=new sqlite.DatabaseSync(':memory:');
 let failOn='';
 const adapter={
  execAsync:async query=>sql.exec(query),
  runAsync:async(query,...args)=>{if(query===failOn)throw Error('Injected failure');return sql.prepare(query).run(...args);},
  getFirstAsync:async(query,...args)=>sql.prepare(query).get(...args)??null,
  getAllAsync:async(query,...args)=>sql.prepare(query).all(...args),
  withExclusiveTransactionAsync:async fn=>{sql.exec('BEGIN');try{await fn(adapter);sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}
 };
 const file=path.resolve('src/db.ts'),mod=new Module(file);
 mod.require=name=>{assert.equal(name,'expo-sqlite');return {openDatabaseAsync:async()=>adapter};};
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
 const db=mod.exports;await db.db();
 sql.exec("INSERT INTO rides(id,started,status,source) VALUES(1,100,'finished','phone-gps'),(2,200,'paused','phone-gps'); INSERT INTO points(ride,timestamp) VALUES(1,100),(1,101),(2,200); INSERT INTO fills(id,created,odometer,litres,full,cost) VALUES(1,100,100,5,1,500),(2,200,200,2,0,200); INSERT INTO settings VALUES('armed','1'),('navigation','saved route'),('trackingError','old error');");
 return {db,sql,fail:query=>{failOn=query;}};
}
const options={skip:!sqlite&&'SQLite integration tests need Node 22+; other tests still run.'};
test('deleting a ride removes only its points and leaves fuel records intact',options,async()=>{
 const {db,sql}=await fixture();try{await db.deleteRide(1);assert.deepEqual(sql.prepare('SELECT id FROM rides').all().map(r=>r.id),[2]);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM points WHERE ride=1').get().n,0);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM points WHERE ride=2').get().n,1);assert.equal((await db.fills()).length,2);}finally{sql.close();}
});
test('recording rides cannot be deleted before tracking stops',options,async()=>{
 const {db,sql}=await fixture();try{sql.exec("UPDATE rides SET status='recording' WHERE id=2");await assert.rejects(db.deleteRide(2),/Stop recording/);assert.equal((await db.rides()).length,2);}finally{sql.close();}
});
test('deleting a refill preserves other records',options,async()=>{
 const {db,sql}=await fixture();try{await db.deleteFill(1);assert.deepEqual((await db.fills()).map(f=>f.id),[2]);assert.equal((await db.rides()).length,2);}finally{sql.close();}
});
test('ride deletion and full reset roll back together if a delete fails',options,async()=>{
 const {db,sql,fail}=await fixture();try{fail('DELETE FROM rides WHERE id=?');await assert.rejects(db.deleteRide(1));assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM points').get().n,3);fail('DELETE FROM fills');await assert.rejects(db.resetData());assert.equal((await db.rides()).length,2);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM points').get().n,3);assert.equal(await db.setting('navigation'),'saved route');}finally{sql.close();}
});
test('full reset clears every data table and allows a fresh first ride',options,async()=>{
 const {db,sql}=await fixture();try{await db.resetData();for(const name of ['rides','points','fills','settings'])assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM '+name).get().n,0);const ride=await db.start();assert.equal(ride.id,1);assert.equal(ride.km,0);assert.equal(ride.status,'recording');assert.equal(await db.setting('armed'),'');}finally{sql.close();}
});
