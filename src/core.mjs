export function distance(a,b) {
 const r=x=>x*Math.PI/180, dlat=r(b.latitude-a.latitude),dlon=r(b.longitude-a.longitude);
 const h=Math.sin(dlat/2)**2+Math.cos(r(a.latitude))*Math.cos(r(b.latitude))*Math.sin(dlon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function validStep(a,b) {
 if(!a||!b||b.accuracy>35||a.accuracy>35)return 0;
 const seconds=(b.timestamp-a.timestamp)/1000;
 if(seconds<=0||seconds>30)return 0;
 const km=distance(a,b);
 return km/seconds*3600>160 || km<0.003 ? 0 : km;
}
export function mileage(fills) {
 let baseline=null,litres=0,km=0,total=0,intervals=0;
 for(const f of [...fills].sort((a,b)=>a.odometer-b.odometer||a.created-b.created)) {
  if(baseline===null){if(f.full)baseline=f.odometer;continue;}
  litres+=f.litres;
  if(f.full){const d=f.odometer-baseline;if(d>0&&litres>0){km+=d;total+=litres;intervals++;}baseline=f.odometer;litres=0;}
 }
 return {kmpl:total>0?km/total:null,km,litres:total,intervals};
}
export function parseTelemetry(text) {
 const v=JSON.parse(text);
 if(v.v!==1||typeof v.fuelPct!=='number'||!Number.isFinite(v.fuelPct)||v.fuelPct<0||v.fuelPct>100)throw Error('Invalid telemetry');
 return {fuelPct:v.fuelPct,simulated:v.simulated!==false,ignition:typeof v.ignition==='boolean'?v.ignition:null};
}
