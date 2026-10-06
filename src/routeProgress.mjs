import {distance} from './core.mjs';
const point = ([longitude, latitude]) => ({latitude, longitude});

export function buildRoute(coordinates) {
 const cumulative=[0];
 for(let i=1;i<coordinates.length;i++)cumulative.push(cumulative[i-1]+distance(point(coordinates[i-1]),point(coordinates[i]))*1000);
 return {coordinates,cumulative,total:cumulative.at(-1)??0};
}

// Project onto road segments, not only vertices (which can be far apart).
export function matchRoute(model, location, previous=0) {
 let best=null;
 const {coordinates,cumulative}=model;
 for(let i=0;i<coordinates.length-1;i++){
  const a=coordinates[i],b=coordinates[i+1];
  const scale=Math.cos(location.latitude*Math.PI/180);
  const dx=(b[0]-a[0])*scale,dy=b[1]-a[1];
  const px=(location.longitude-a[0])*scale,py=location.latitude-a[1];
  const lengthSquared=dx*dx+dy*dy;
  const fraction=lengthSquared?Math.max(0,Math.min(1,(px*dx+py*dy)/lengthSquared)):0;
  const projected=[a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction];
  const candidate={index:i,fraction,point:projected,distance:distance(location,point(projected))*1000,along:cumulative[i]+(cumulative[i+1]-cumulative[i])*fraction};
  // At crossings, prefer the nearby stage of the route over a later lap.
  if(!best||candidate.distance<best.distance-8||(Math.abs(candidate.distance-best.distance)<=8&&Math.abs(candidate.along-previous)<Math.abs(best.along-previous)))best=candidate;
 }
 return best;
}

export function splitRoute(model,progress) {
 const {coordinates,cumulative,total}=model;
 const clamped=Math.max(0,Math.min(total,progress));
 if(!coordinates.length)return {completed:[],remaining:[]};
 if(clamped<=0)return {completed:[],remaining:coordinates};
 if(clamped>=total)return {completed:coordinates,remaining:[]};
 let index=0;while(index<cumulative.length-2&&cumulative[index+1]<clamped)index++;
 const a=coordinates[index],b=coordinates[index+1],length=cumulative[index+1]-cumulative[index];
 const t=length?(clamped-cumulative[index])/length:0;
 const cut=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 return {completed:[...coordinates.slice(0,index+1),cut],remaining:[cut,...coordinates.slice(index+1)]};
}

export function remainingRoute(model,progress,routeDistance,routeDuration) {
 const ratio=model.total?Math.max(0,Math.min(1,1-progress/model.total)):1;
 return {metres:routeDistance*ratio,seconds:routeDuration*ratio};
}

export function routeStep(steps,progress,geometryTotal,routeDistance) {
 const travelled=geometryTotal>0?progress/geometryTotal*routeDistance:0;
 let cumulative=0,index=0;
 for(let i=1;i<steps.length;i++){cumulative+=steps[i-1].distance;if(travelled+5>=cumulative)index=i;else break;}
 return index;
}

export function bearingBetween(a,b) {
 if(!a||distance(a,b)<0.005)return null;
 const rad=x=>x*Math.PI/180;
 const delta=rad(b.longitude-a.longitude),lat1=rad(a.latitude),lat2=rad(b.latitude);
 return (Math.atan2(Math.sin(delta)*Math.cos(lat2),Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(delta))*180/Math.PI+360)%360;
}
