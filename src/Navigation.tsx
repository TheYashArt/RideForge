import {Text,TextInput,Pressable} from './ui';
import React,{useState,useRef,useEffect} from 'react';
import {View,StyleSheet,ScrollView} from 'react-native';
import {WebView} from 'react-native-webview';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import {distance} from './core.mjs';
import {cameraHeading,cameraZoom} from './mapCamera.mjs';
import {setting,setSetting} from './db';
import {speedReading} from './rideMetrics.mjs';
import {buildRoute,matchRoute,splitRoute,remainingRoute,routeStep,bearingBetween} from './routeProgress.mjs';
import type {SpeedReading} from './RideInstruments';

type Place={label:string;latitude:number;longitude:number};
type Step={name:string;distance:number;maneuver:{type:string;modifier?:string;location:number[]}};
type Route={distance:number;duration:number;geometry:{coordinates:number[][]};legs:{steps:Step[]}[]};
type Session={query:string;destination:Place|null;route:Route|null;guiding:boolean;step:number;voice:boolean;progress:number;pastRoutes:number[][][]};
export type RouteSummary={label:string;km:number;minutes:number}|null;
const empty:Session={query:'',destination:null,route:null,guiding:false,step:0,voice:true,progress:0,pastRoutes:[]};
let saveQueue=Promise.resolve();
let writesSuspended=false;
export async function suspendNavigationWrites(){writesSuspended=true;await saveQueue;}
export function releaseNavigationWrites(){writesSuspended=false;}
const html=`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0;background:#f5f5f0}.leaflet-control-attribution{font-size:10px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script src="https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate.js"></script><script>
const map=L.map('map',{rotate:true,rotateControl:false,touchRotate:true}).setView([18.52,73.85],11);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
let marker,lastHeading=0;
const travelled=L.polyline([],{color:'#9ba49a',weight:6,opacity:.8}).addTo(map);
const remaining=L.polyline([],{color:'#445e40',weight:6,opacity:1}).addTo(map);
const arrowIcon=L.divIcon({className:'ride-direction',iconSize:[42,42],iconAnchor:[21,21],html:'<div class="direction-arrow" style="width:42px;height:42px;filter:drop-shadow(0 2px 3px #0005)"><svg viewBox="0 0 42 42" width="42" height="42"><path d="M21 4 L36 35 L21 28 L6 35 Z" fill="#354f35" stroke="white" stroke-width="3" stroke-linejoin="round"/></svg></div>'});
function orientArrow(){const arrow=marker&&marker.getElement()?.querySelector('.direction-arrow');if(arrow)arrow.style.transform='rotate('+(lastHeading+(map.getBearing?map.getBearing():0))+'deg)';}
map.on('rotate',orientArrow);
map.on('dragstart',()=>window.ReactNativeWebView.postMessage('browse'));
map.getContainer().addEventListener('touchstart',event=>{if(event.touches?.length===2)window.ReactNativeWebView.postMessage('browse');},{passive:true});
window.update=data=>{
 if(data.clear){travelled.setLatLngs([]);remaining.setLatLngs([]);}
 if(data.resize)map.invalidateSize({pan:false});
 if(data.route&&data.overview){if(map.setBearing)map.setBearing(0);map.fitBounds(L.latLngBounds(data.route),{padding:[25,25]});}
 if(data.completed)travelled.setLatLngs(data.completed);
 if(data.remaining)remaining.setLatLngs(data.remaining);
 if(data.position){lastHeading=data.heading??lastHeading;if(!marker)marker=L.marker(data.position,{icon:arrowIcon,interactive:false,zIndexOffset:1000}).addTo(map);else marker.setLatLng(data.position);if(data.follow){if(map.setBearing)map.setBearing(-data.heading);map.setView(data.position,data.zoom,{animate:false});}orientArrow();}
};
window.ReactNativeWebView.postMessage(typeof map.setBearing==='function'?'ready':'rotation-unavailable');
</script></body></html>`;
async function request(url:string){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'Rideforge/0.1 personal-prototype'}});if(!r.ok)throw Error('Map service unavailable. Try again later.');return await r.json();}finally{clearTimeout(timer);}}
const instruction=(s:Step)=>`${s.maneuver.type.replace(/-/g,' ')} ${s.maneuver.modifier??''}${s.name?' onto '+s.name:''}`;

export default function Navigation({visible,rideStatus,onSummary,endVersion,riding=false,onSpeed,onExitRide,onStartRide}:{visible:boolean;rideStatus?:string;onSummary:(summary:RouteSummary)=>void;endVersion:number;riding?:boolean;onSpeed?:(reading:SpeedReading|null)=>void;onExitRide?:()=>void;onStartRide?:()=>void}){
 const ended=useRef(endVersion);
 const geometry=useRef<ReturnType<typeof buildRoute>|null>(null),offRouteFixes=useRef(0),rerouting=useRef(false),lastFix=useRef(0),lastProgressFix=useRef(0),lastSavedProgress=useRef(0);
 const [remaining,setRemaining]=useState<{metres:number;seconds:number}|null>(null);
 const speedListener=useRef(onSpeed);speedListener.current=onSpeed;
 const web=useRef<WebView>(null),pos=useRef<Location.LocationObjectCoords|null>(null),heading=useRef(0),compass=useRef<number|null>(null),lastReroute=useRef(0),routeRequest=useRef(0),mounted=useRef(true),readyWeb=useRef(false);
 const [session,setSession]=useState<Session>(empty),sessionRef=useRef<Session>(empty);
 const [ready,setReady]=useState(false),[results,setResults]=useState<Place[]>([]),[status,setStatus]=useState('Find a destination to preview your route.'),[busy,setBusy]=useState(false),[following,setFollowing]=useState(true);
 const followRef=useRef(true),rideRef=useRef(rideStatus);rideRef.current=rideStatus;
 const update=(patch:Partial<Session>)=>{const next={...sessionRef.current,...patch};if(patch.route!==undefined){geometry.current=patch.route?buildRoute(patch.route.geometry.coordinates):null;lastSavedProgress.current=next.progress;setRemaining(patch.route?remainingRoute(geometry.current!,next.progress,patch.route.distance,patch.route.duration):null);}sessionRef.current=next;setSession(next);};
 const follow=(value:boolean)=>{followRef.current=value;setFollowing(value);};
	 const toggleFollow=()=>{const value=!followRef.current;follow(value);if(value)camera();};
 const send=(data:unknown)=>{if(readyWeb.current)web.current?.injectJavaScript(`window.update&&window.update(${JSON.stringify(data)});true;`);};
 function camera(){const p=pos.current;if(!p)return;const current=sessionRef.current;const next=current.guiding?current.route?.legs[0].steps[current.step+1]:null;const turnDistance=next?distance(p,{latitude:next.maneuver.location[1],longitude:next.maneuver.location[0]})*1000:Infinity;send({position:[p.latitude,p.longitude],follow:followRef.current,heading:heading.current,zoom:cameraZoom(Math.max(0,p.speed??0),turnDistance)});}
 function drawRoute(overview=false){
  const current=sessionRef.current,model=geometry.current;if(!current.route||!model)return;
  const parts=splitRoute(model,current.progress),asLatLng=(path:number[][])=>path.map(([lon,lat])=>[lat,lon]);
  send({...(overview?{route:asLatLng(model.coordinates),overview:true}:{}),completed:[...current.pastRoutes,parts.completed].filter(path=>path.length>1).map(asLatLng),remaining:asLatLng(parts.remaining)});
 }
 function redraw(){send({resize:true});drawRoute(!followRef.current);camera();}
 function speak(step:Step){if(sessionRef.current.voice){Speech.stop();Speech.speak(instruction(step));}}
 useEffect(()=>{mounted.current=true;(async()=>{try{const raw=await setting('navigation');if(raw){const saved=JSON.parse(raw);if(saved.route?.legs?.[0]?.steps?.length&&saved.destination){const value={...empty,...saved};value.progress=Number.isFinite(value.progress)?Math.max(0,value.progress):0;value.pastRoutes=Array.isArray(value.pastRoutes)?value.pastRoutes:[];value.step=Math.min(Math.max(0,value.step),value.route.legs[0].steps.length-1);if(mounted.current){update(value);setStatus(value.destination.label);}}}}catch{if(mounted.current)setStatus('Could not restore the route. Please choose your destination again.');}finally{if(mounted.current)setReady(true);}})();return()=>{mounted.current=false;routeRequest.current++;Speech.stop();};},[]);
 useEffect(()=>{if(!ready)return;const data=JSON.stringify(session);saveQueue=saveQueue.then(()=>{if(!writesSuspended)return setSetting('navigation',data);}).catch(()=>{if(mounted.current)setStatus('Could not save navigation. Your ride records are separate.');});onSummary(session.route&&session.destination?{label:session.destination.label,km:session.route.distance/1000,minutes:Math.ceil(session.route.duration/60)}:null);},[session,ready,onSummary]);
 useEffect(()=>{if(visible){const timer=setTimeout(redraw,150);return()=>clearTimeout(timer);}},[visible,ready,riding]);
 useEffect(()=>{if(!ready)return;if(rideStatus==='recording'&&sessionRef.current.route){update({guiding:true});follow(true);camera();}else if(rideStatus==='paused'){update({guiding:false});Speech.stop();}},[rideStatus,ready]);
 async function locate(){const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw Error('Location permission is required.');const l=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});pos.current=l.coords;speedListener.current?.(speedReading(l.coords,l.timestamp));camera();return l.coords;}
 async function makeRoute(to:Place,reroute=false){
  const token=++routeRequest.current;
  const from=pos.current??await locate();const data=await request(`https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson&steps=true`);
  if(!mounted.current||token!==routeRequest.current)return;
  if(data.code!=='Ok'||!data.routes?.[0]?.legs?.[0]?.steps?.length||!data.routes[0].geometry?.coordinates||data.routes[0].geometry.coordinates.length<2)throw Error('No route found for this destination.');
  const route:Route=data.routes[0],guiding=sessionRef.current.guiding||rideRef.current==='recording';
  const previous=sessionRef.current;
  const completed=reroute&&geometry.current?splitRoute(geometry.current,previous.progress).completed:[];
  const pastRoutes=reroute?[...previous.pastRoutes,...(completed.length>1?[completed]:[])].slice(-20):[];
  update({route,destination:to,step:0,guiding,progress:0,pastRoutes});offRouteFixes.current=0;lastFix.current=0;lastProgressFix.current=0;follow(guiding);drawRoute(!guiding);camera();setStatus(reroute?'Route updated':to.label);setResults([]);if(guiding)speak(route.legs[0].steps[0]);
 }
 useEffect(()=>{if(ended.current===endVersion)return;ended.current=endVersion;routeRequest.current++;offRouteFixes.current=0;lastFix.current=0;lastProgressFix.current=0;update({...empty});setResults([]);setStatus('Choose a destination for your next ride.');follow(true);Speech.stop();send({clear:true});},[endVersion]);
 const watching=ready&&(visible||session.guiding||rideStatus==='recording');
 useEffect(()=>{if(!watching)return;let subscription:Location.LocationSubscription|undefined,compassSubscription:Location.LocationSubscription|undefined,cancelled=false;
 (async()=>{await locate();if(cancelled)return;
 const s=await Location.watchPositionAsync({accuracy:Location.Accuracy.BestForNavigation,timeInterval:1000,distanceInterval:0},l=>{
  if(cancelled)return;
  speedListener.current?.(speedReading(l.coords,l.timestamp));
  if((l.coords.accuracy??999)>35)return;
  if(l.timestamp&&l.timestamp<=lastFix.current)return;
  const previousPosition=pos.current;
  pos.current=l.coords;
  const course=l.coords.heading!==null&&l.coords.heading>=0?l.coords.heading:bearingBetween(previousPosition,l.coords);
  const sampleSeconds=lastFix.current?(l.timestamp-lastFix.current)/1000:0;
  const headingSpeed=l.coords.speed!==null&&l.coords.speed>=0?l.coords.speed:previousPosition&&sampleSeconds>0&&sampleSeconds<=30?distance(previousPosition,l.coords)*1000/sampleSeconds:0;
  heading.current=cameraHeading(course,headingSpeed,compass.current,heading.current);camera();
  const current=sessionRef.current,r=current.route,model=geometry.current;
  const elapsed=lastProgressFix.current?(l.timestamp-lastProgressFix.current)/1000:null;
  lastFix.current=l.timestamp;
  if(!current.guiding||!r||!model)return;
  const match=matchRoute(model,l.coords,current.progress);if(!match)return;
  const away=match.distance>Math.max(60,(l.coords.accuracy??0)*2)||match.along<current.progress-100;
  offRouteFixes.current=away?offRouteFixes.current+1:0;
  if(away){
   if(offRouteFixes.current>=2&&!rerouting.current&&Date.now()-lastReroute.current>15000&&current.destination){
    rerouting.current=true;lastReroute.current=Date.now();setStatus('Recalculating route…');
    makeRoute(current.destination,true).catch(e=>{if(!cancelled)setStatus('Rerouting unavailable. Retrying automatically. '+e.message);}).finally(()=>{rerouting.current=false;});
   }
   return;
  }
  // Ignore implausible jumps at crossings; allow joining after a GPS gap.
  if(elapsed!==null&&elapsed<30&&match.along-current.progress>Math.max(80,Math.max(0,l.coords.speed??0)*elapsed*2+40))return;
  lastProgressFix.current=l.timestamp;
  const progress=Math.max(current.progress,match.along);
  const steps=r.legs[0].steps;
  const advanced=Math.max(current.step,routeStep(steps,progress,model.total,r.distance));
  const destination=steps[steps.length-1].maneuver.location;
  const arrived=model.total-progress<35&&distance(l.coords,{latitude:destination[1],longitude:destination[0]})<0.04;
  const step=arrived?steps.length-1:Math.min(advanced,Math.max(0,steps.length-2));
  const nextProgress=arrived?model.total:progress;
  sessionRef.current={...current,progress:nextProgress};
  setRemaining(remainingRoute(model,nextProgress,r.distance,r.duration));drawRoute();camera();
  if(Math.abs(nextProgress-lastSavedProgress.current)>25||step!==current.step||arrived){lastSavedProgress.current=nextProgress;update({progress:nextProgress,step,guiding:!arrived});}
  if(step!==current.step)speak(steps[step]);
  if(arrived)setStatus('Destination reached. End your ride from Cockpit when ready.');

 });if(cancelled){s.remove();return;}subscription=s;
 try{const c=await Location.watchHeadingAsync(h=>{if(cancelled||h.accuracy<2)return;compass.current=h.trueHeading>=0?h.trueHeading:h.magHeading;if(pos.current&&(pos.current.speed??0)<2){heading.current=cameraHeading(null,0,compass.current,heading.current);camera();}});if(cancelled)c.remove();else compassSubscription=c;}catch{if(!cancelled)setStatus('Phone compass unavailable. Map follows GPS direction while moving.');}
 })().catch(e=>{if(!cancelled)setStatus(e.message);});return()=>{cancelled=true;subscription?.remove();compassSubscription?.remove();speedListener.current?.(null);};},[watching]);
 async function search(){if(session.query.trim().length<3)return;setBusy(true);try{const data=await request(`https://photon.komoot.io/api/?q=${encodeURIComponent(session.query.trim())}&limit=5`);if(!mounted.current)return;setResults(data.features.map((f:any)=>({label:[f.properties.name,f.properties.city,f.properties.state].filter(Boolean).join(', '),longitude:f.geometry.coordinates[0],latitude:f.geometry.coordinates[1]})));setStatus(data.features.length?'Choose a destination':'No places found');}catch(e:any){if(mounted.current)setStatus(e.message);}finally{if(mounted.current)setBusy(false);}}
 if(!ready)return <Text>Restoring your route…</Text>;
 const {route,guiding,step,voice}=session;
 const remainingLabel=remaining?(remaining.metres/1000).toFixed(1)+' km left · ~'+Math.ceil(remaining.seconds/60)+' min':'';
 return <View style={{flex:1,gap:riding?0:10}}>{!riding&&<><Text style={s.title}>Navigation</Text><View style={s.row}><TextInput accessibilityLabel="Destination" style={s.input} placeholder="Search a place" placeholderTextColor="#777d73" value={session.query} onChangeText={query=>update({query})} onSubmitEditing={search}/><Pressable style={s.button} onPress={search} disabled={busy}><Text style={{color:'white'}}>{busy?'…':'Search'}</Text></Pressable></View>
 {results.length>0&&<ScrollView style={{maxHeight:160}}>{results.map((p,i)=><Pressable key={i} disabled={busy} style={{padding:12}} onPress={()=>{setBusy(true);makeRoute(p).catch(e=>setStatus(e.message)).finally(()=>setBusy(false));}}><Text style={s.text}>{p.label}</Text></Pressable>)}</ScrollView>}</>}
 <View style={{flex:1,minHeight:riding?0:180,borderRadius:riding?0:8,overflow:'hidden'}}><WebView ref={web} source={{html}} originWhitelist={['*']} userAgent="Rideforge/0.1 (Android personal navigation prototype)" javaScriptEnabled onLoadStart={()=>{readyWeb.current=false;}} onMessage={event=>{const message=event.nativeEvent.data;if(message==='browse')follow(false);else if(message==='ready'||message==='rotation-unavailable'){readyWeb.current=true;redraw();if(message==='rotation-unavailable')setStatus('Map rotation could not load. Reopen the app when online.');}}} onError={()=>setStatus('Map could not load. Check your internet connection.')} />{riding&&<>
	 <View style={s.rideTop}><View style={{flex:1,minWidth:0}}><Text style={s.rideTurn} numberOfLines={2}>{rideStatus==='paused'?'Ride paused':route?(guiding?instruction(route.legs[0].steps[step]):'Guidance paused'):`Free ride · ${following?'following your position':'free map mode'}`}</Text><Text style={s.small} numberOfLines={1}>{route?remainingLabel:'Set a destination in Cockpit for directions'}</Text></View><Pressable accessibilityRole="button" onPress={onExitRide} style={s.rideControl}><Text style={s.rideControlText}>Cockpit</Text></Pressable></View>
	 <View style={s.rideBottom}><View style={{flex:1,minWidth:0}}><Text style={s.rideStatus} numberOfLines={2}>{status}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={following?'Switch to free map mode':'Recenter and follow'} onPress={toggleFollow} style={s.rideControl}><Text style={s.rideControlText}>{following?'Free mode':'Recenter & follow'}</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>{update({voice:!voice});Speech.stop();}} style={s.rideControl}><Text style={s.rideControlText}>{voice?'Mute':'Voice'}</Text></Pressable></View>
 </>}</View>
 {!riding&&<><Pressable style={s.button} onPress={()=>{follow(!following);camera();}}><Text style={{color:'white'}}>{following?'Following · auto rotate & zoom':'Recenter & follow'}</Text></Pressable>
	 <Text style={s.text}>{status}</Text>{route&&<View style={s.card}><Text style={s.title}>{remainingLabel}</Text><Text style={s.text}>{guiding?instruction(route.legs[0].steps[step]):rideStatus?'Guidance paused':'Route ready · start your ride here'}</Text><View style={s.row}>{!rideStatus&&onStartRide?<Pressable accessibilityRole="button" style={s.button} onPress={onStartRide}><Text style={{color:'white'}}>Start ride</Text></Pressable>:<Pressable accessibilityRole="button" style={s.button} onPress={()=>{update({guiding:!guiding});if(!guiding){follow(true);camera();speak(route.legs[0].steps[step]);}else Speech.stop();}}><Text style={{color:'white'}}>{guiding?'Stop guidance':'Start guidance'}</Text></Pressable>}<Pressable accessibilityRole="button" style={s.button} onPress={()=>{update({voice:!voice});Speech.stop();}}><Text style={{color:'white'}}>Voice {voice?'on':'off'}</Text></Pressable></View></View>}
 <Text style={s.small}>Remaining time is an estimate · driving profile · no live traffic. Guidance stays active across tabs while the app is open.</Text></>}</View>;
}
const s=StyleSheet.create({rideTop:{position:'absolute',top:12,left:12,right:12,padding:12,borderRadius:8,backgroundColor:'#fffffff2',flexDirection:'row',alignItems:'center',gap:10},rideTurn:{fontSize:19,fontWeight:'700',color:'#252723'},rideControl:{minHeight:44,paddingHorizontal:12,justifyContent:'center',backgroundColor:'#44594d',borderRadius:6},rideControlText:{fontSize:13,fontWeight:'700',color:'#fff'},rideBottom:{position:'absolute',bottom:28,left:12,right:12,flexDirection:'row',alignItems:'center',gap:8},rideStatus:{fontSize:11,color:'#252723',backgroundColor:'#fffffff2',padding:6,borderRadius:4},title:{color:'#252723',fontSize:22,fontWeight:'700'},text:{color:'#60665e'},small:{color:'#73796f',fontSize:11},row:{flexDirection:'row',gap:8},input:{flex:1,backgroundColor:'#eeeee8',color:'#252723',padding:14,borderRadius:12},button:{backgroundColor:'#44594d',padding:13,borderRadius:12,justifyContent:'center'},card:{backgroundColor:'#eeeee8',padding:15,borderRadius:16,gap:12}});
