import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import Renderer,{act} from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const ui={Text:'Text',TextInput:'TextInput',Pressable:'Pressable',Section:'Section'};
const native={Text:'Text',View:'View',ScrollView:'ScrollView',Switch:'Switch',StyleSheet:{create:s=>s},Alert:{alert(){}},AppState:{addEventListener:()=>({remove(){}})}};
function load(file,mocks){const full=path.resolve(file),mod=new Module(full);mod.filename=full;const require=createRequire(full);mod.require=name=>name in mocks?mocks[name]:require(name);mod._compile(ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,full);return mod.exports.default;}
const Tabs=load('src/BottomTabs.tsx',{'react-native':native,'./ui':ui,'@expo/vector-icons/Ionicons':{__esModule:true,default:'Icon'}});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function textOf(node){return typeof node==='string'?node:node.children.map(textOf).join('');}
function button(root,label){return root.findAllByType('Pressable').find(n=>textOf(n)===label);}

test('Navigate starts one ride, opens its ride view, and switching tabs keeps Navigation mounted',async()=>{
 let mounts=0,records=[];
 const FakeNavigation=props=>{React.useEffect(()=>{mounts++;},[]);return React.createElement('Map',props);};
 const Instruments=load('src/RideInstruments.tsx',{'./ui':ui,'react-native':native});
 const db={rides:async()=>records,fills:async()=>[{id:1,created:1,odometer:100,litres:5,full:1,cost:500}],setting:async()=>'',setSetting:async()=>{},start:async()=>{if(!records.length)records=[{id:1,status:'recording',km:0,started:1,source:'phone-gps'}];}};
 const App=load('App.tsx',{'./src/BottomTabs':{__esModule:true,default:Tabs},'./src/loadFont':{loadFont:async()=>{}},'./src/ui':ui,'react-native':native,'react-native-safe-area-context':{SafeAreaProvider:'SafeAreaProvider',SafeAreaView:'SafeAreaView'},'expo-status-bar':{StatusBar:'StatusBar'},'./src/db':db,'./src/tracking':{arm:async()=>{},recoverTracking:async()=>{}},'./src/ble':{},'./src/core.mjs':{mileage:()=>({kmpl:null})},'./src/Navigation':{__esModule:true,default:FakeNavigation},'./src/RideInstruments':{__esModule:true,default:Instruments}});
 let tree;await act(async()=>{tree=Renderer.create(React.createElement(App));await flush();});
 assert.equal(mounts,1);
 assert.ok(JSON.stringify(tree.toJSON()).includes('Latest refill: 5.00 L'));
 await act(async()=>button(tree.root,'Navigate').props.onPress());
 await act(async()=>{await tree.root.findByType('Map').props.onStartRide();await flush();});
 assert.equal(records.length,1);
 assert.equal(tree.root.findByType('Map').props.riding,true);
 assert.equal(tree.root.findByProps({testID:'ride-map-region'}).props.style.flex,7);
 assert.equal(tree.root.findByProps({testID:'ride-instruments-region'}).props.style.flex,3);
 assert.ok(button(tree.root,'Pause ride'));
 assert.ok(button(tree.root,'End ride'));
 await act(async()=>{tree.root.findByType('Map').props.onExitRide();await flush();});
 assert.equal(records[0].status,'recording');
 for(const tab of ['Navigate','Fuel','Rides','Cockpit'])await act(async()=>{button(tree.root,tab).props.onPress();await flush();});
 assert.equal(mounts,1);
 assert.equal(records[0].status,'recording');
 assert.ok(button(tree.root,'End & save ride'));
 await act(async()=>{button(tree.root,'OPEN RIDE VIEW').props.onPress();await flush();});
 assert.equal(tree.root.findByType('Map').props.riding,true);
 assert.equal(mounts,1);
 await act(async()=>tree.unmount());
});

test('current ride toggles between free mode and recenter-follow mode',async()=>{
 let saved='',receiveLocation;
 const WebView=React.forwardRef((props,ref)=>{React.useImperativeHandle(ref,()=>({injectJavaScript(){}}));return React.createElement('WebView',props);});
 const Navigation=load('src/Navigation.tsx',{'./ui':ui,'react-native':native,'react-native-webview':{WebView},'expo-location':{Accuracy:{High:4,BestForNavigation:6},requestForegroundPermissionsAsync:async()=>({granted:true}),getCurrentPositionAsync:async()=>({coords:{latitude:18,longitude:73,speed:0,accuracy:5},timestamp:Date.now()}),watchPositionAsync:async(options,callback)=>{receiveLocation=callback;return {remove(){}};},watchHeadingAsync:async()=>({remove(){}})},'expo-speech':{stop(){},speak(){}},'./core.mjs':{distance:()=>1},'./mapCamera.mjs':{cameraHeading:()=>0,cameraZoom:()=>18},'./rideMetrics.mjs':{speedReading:()=>({kmh:0,timestamp:Date.now()})},'./routeProgress.mjs':{},'./db':{setting:async()=>saved,setSetting:async(key,value)=>{saved=value;}}});
 let tree;await act(async()=>{tree=Renderer.create(React.createElement(Navigation,{visible:true,rideStatus:'recording',endVersion:0,riding:true,onSummary(){}}));await flush();});
 assert.ok(receiveLocation);
 assert.ok(button(tree.root,'Free mode'));
 await act(async()=>button(tree.root,'Free mode').props.onPress());
 assert.ok(button(tree.root,'Recenter & follow'));
 await act(async()=>button(tree.root,'Recenter & follow').props.onPress());
 assert.ok(button(tree.root,'Free mode'));
 await act(async()=>tree.unmount());
});

test('a route prepared in Navigate offers Start ride',async()=>{
 const route={distance:3000,duration:300,geometry:{coordinates:[[73,18],[73.01,18.01]]},legs:[{steps:[{name:'Road',distance:3000,maneuver:{type:'depart',location:[73,18]}},{name:'',distance:0,maneuver:{type:'arrive',location:[73.01,18.01]}}]}]};
 let saved=JSON.stringify({query:'Home',destination:{label:'Home',latitude:18.01,longitude:73.01},route,guiding:false,step:0,voice:true}),starts=0;
 const WebView=React.forwardRef((props,ref)=>{React.useImperativeHandle(ref,()=>({injectJavaScript(){}}));return React.createElement('WebView',props);});
 const Navigation=load('src/Navigation.tsx',{'./ui':ui,'react-native':native,'react-native-webview':{WebView},'expo-location':{Accuracy:{High:4,BestForNavigation:6},requestForegroundPermissionsAsync:async()=>({granted:true}),getCurrentPositionAsync:async()=>({coords:{latitude:18,longitude:73,speed:0,accuracy:5}}),watchPositionAsync:async()=>({remove(){}}),watchHeadingAsync:async()=>({remove(){}})},'expo-speech':{stop(){},speak(){}},'./core.mjs':{distance:()=>1},'./mapCamera.mjs':{cameraHeading:()=>0,cameraZoom:()=>18},'./db':{setting:async()=>saved,setSetting:async(key,value)=>{saved=value;}}});
 let tree;await act(async()=>{tree=Renderer.create(React.createElement(Navigation,{visible:true,endVersion:0,onSummary(){},onStartRide:()=>{starts++;}}));await flush();});
 assert.ok(button(tree.root,'Start ride'));
 assert.ok(JSON.stringify(tree.toJSON()).includes('Route ready · start your ride here'));
 await act(async()=>button(tree.root,'Start ride').props.onPress());
 assert.equal(starts,1);
 await act(async()=>tree.unmount());
});

test('navigation restores its route, survives hidden tabs, and clears only on ride end',async()=>{
 const route={distance:3000,duration:300,geometry:{coordinates:[[73,18],[73.01,18.01]]},legs:[{steps:[{name:'Road',distance:3000,maneuver:{type:'depart',location:[73,18]}},{name:'',distance:0,maneuver:{type:'arrive',location:[73.01,18.01]}}]}]};
 let saved=JSON.stringify({query:'Home',destination:{label:'Home',latitude:18.01,longitude:73.01},route,guiding:true,step:0,voice:true}),removals=0,summary;
 const WebView=React.forwardRef((props,ref)=>{React.useImperativeHandle(ref,()=>({injectJavaScript(){}}));return React.createElement('WebView',props);});
 const Navigation=load('src/Navigation.tsx',{'./ui':ui,'react-native':native,'react-native-webview':{WebView},'expo-location':{Accuracy:{High:4,BestForNavigation:6},requestForegroundPermissionsAsync:async()=>({granted:true}),getCurrentPositionAsync:async()=>({coords:{latitude:18,longitude:73,speed:0,accuracy:5}}),watchPositionAsync:async()=>({remove(){removals++;}}),watchHeadingAsync:async()=>({remove(){}})},'expo-speech':{stop(){},speak(){}},'./core.mjs':{distance:()=>1},'./mapCamera.mjs':{cameraHeading:()=>0,cameraZoom:()=>18},'./db':{setting:async()=>saved,setSetting:async(key,value)=>{saved=value;}}});
 const props={visible:true,rideStatus:'recording',endVersion:0,onSummary:s=>{summary=s;}};
 let tree;await act(async()=>{tree=Renderer.create(React.createElement(Navigation,props));await flush();});
 assert.equal(summary.label,'Home');
 for(const visible of [false,true,false,true])await act(async()=>{tree.update(React.createElement(Navigation,{...props,visible}));await flush();});
 assert.equal(removals,0);
 assert.equal(tree.root.findByType('TextInput').props.value,'Home');
 assert.equal(JSON.parse(saved).guiding,true);
 await act(async()=>tree.unmount());
 await act(async()=>{tree=Renderer.create(React.createElement(Navigation,props));await flush();});
 assert.equal(summary.label,'Home');
 await act(async()=>{tree.update(React.createElement(Navigation,{...props,rideStatus:undefined,endVersion:1}));await flush();});
 assert.equal(JSON.parse(saved).route,null);
 assert.equal(summary,null);
 await act(async()=>tree.unmount());
});

test('delete and reset controls require confirmation, refresh totals, and reset the whole UI',async()=>{
 let records=[{id:7,status:'finished',km:12,started:1,ended:2,source:'phone-gps'}];
 let fills=[{id:9,created:1,odometer:100,litres:5,full:1,cost:500}];
 let prompt,navMounts=0;const calls=[];
 const FakeNavigation=()=>{React.useEffect(()=>{navMounts++;},[]);return React.createElement('Map');};
 const db={rides:async()=>records,fills:async()=>fills,setting:async()=>'',active:async()=>null,deleteRide:async id=>{records=records.filter(r=>r.id!==id);},deleteFill:async id=>{fills=fills.filter(f=>f.id!==id);},resetData:async()=>{calls.push('reset database');records=[];fills=[];}};
 const App=load('App.tsx',{'./src/BottomTabs':{__esModule:true,default:Tabs},'./src/loadFont':{loadFont:async()=>{}},'./src/ui':ui,'react-native':{...native,Alert:{alert:(title,body,buttons)=>{prompt={title,body,buttons};}}},'react-native-safe-area-context':{SafeAreaProvider:'SafeAreaProvider',SafeAreaView:'SafeAreaView'},'expo-status-bar':{StatusBar:'StatusBar'},'./src/db':db,'./src/tracking':{recoverTracking:async()=>{},suspendTracking:async()=>{calls.push('stop tracking');},releaseTracking:()=>{},clearRideNotifications:async()=>{calls.push('clear notifications');}},'./src/ble':{disconnect:async()=>{calls.push('disconnect');}},'./src/core.mjs':{mileage:()=>({kmpl:null})},'./src/RideInstruments':{__esModule:true,default:()=>null},'./src/Navigation':{__esModule:true,default:FakeNavigation,suspendNavigationWrites:async()=>{calls.push('stop navigation');},releaseNavigationWrites:()=>{}}});
 let tree;await act(async()=>{tree=Renderer.create(React.createElement(App));await flush();});
 try{
  await act(async()=>button(tree.root,'Rides').props.onPress());
  await act(async()=>button(tree.root,'Delete ride').props.onPress());
  assert.equal(records.length,1);assert.ok(prompt.buttons.some(b=>b.style==='cancel'));
  await act(async()=>{prompt.buttons.find(b=>b.style==='destructive').onPress();await flush();});
  assert.equal(records.length,0);assert.ok(JSON.stringify(tree.toJSON()).includes('Your first ride starts here.'));
  await act(async()=>button(tree.root,'Fuel').props.onPress());
  await act(async()=>button(tree.root,'Delete fuel entry').props.onPress());
  assert.equal(fills.length,1);
  await act(async()=>{prompt.buttons.find(b=>b.style==='destructive').onPress();await flush();});
  assert.equal(fills.length,0);
  await act(async()=>tree.root.findAllByType('TextInput')[0].props.onChangeText('4.2'));
  await act(async()=>button(tree.root,'Device').props.onPress());
  await act(async()=>button(tree.root,'Reset all app data').props.onPress());
  assert.deepEqual(calls,[]);
  await act(async()=>{prompt.buttons.find(b=>b.style==='destructive').onPress();await flush();});
  assert.deepEqual(calls,['stop navigation','stop tracking','disconnect','clear notifications','reset database']);
  assert.equal(navMounts,2);
  assert.ok(JSON.stringify(tree.toJSON()).includes('No refills yet.'));
  await act(async()=>button(tree.root,'Fuel').props.onPress());
  assert.equal(tree.root.findAllByType('TextInput')[0].props.value,'');
 }finally{await act(async()=>tree.unmount());}
});

test('GPS progress grays the completed route and two off-route fixes trigger one automatic reroute',async()=>{
 const coordinates=[[0,0],[.02,0]];
 const route={distance:2224,duration:300,geometry:{coordinates},legs:[{steps:[{name:'Main road',distance:2224,maneuver:{type:'depart',location:[0,0]}},{name:'',distance:0,maneuver:{type:'arrive',location:[.02,0]}}]}]};
 let saved=JSON.stringify({query:'Destination',destination:{label:'Destination',latitude:0,longitude:.02},route,guiding:true,step:0,voice:false});
 let receiveLocation,requests=0;const messages=[];
 const core=await import('../src/core.mjs');
 const WebView=React.forwardRef((props,ref)=>{React.useImperativeHandle(ref,()=>({injectJavaScript(code){const prefix='window.update&&window.update(';messages.push(JSON.parse(code.slice(prefix.length,-');true;'.length)));}}));return React.createElement('WebView',props);});
 const Navigation=load('src/Navigation.tsx',{'./ui':ui,'react-native':native,'react-native-webview':{WebView},'expo-location':{Accuracy:{High:4,BestForNavigation:6},requestForegroundPermissionsAsync:async()=>({granted:true}),getCurrentPositionAsync:async()=>({coords:{latitude:0,longitude:0,speed:20,accuracy:5},timestamp:Date.now()}),watchPositionAsync:async(options,callback)=>{receiveLocation=callback;return {remove(){}};},watchHeadingAsync:async()=>({remove(){}})},'expo-speech':{stop(){},speak(){}},'./core.mjs':core,'./db':{setting:async()=>saved,setSetting:async(key,value)=>{saved=value;}}});
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async()=>{requests++;return {ok:true,json:async()=>({code:'Ok',routes:[{...route,geometry:{coordinates:[[.0012,.003],[.02,0]]}}]})};};
 let tree;
 try{
  await act(async()=>{tree=Renderer.create(React.createElement(Navigation,{visible:true,rideStatus:'recording',endVersion:0,onSummary(){}}));await flush();});
  await act(async()=>tree.root.findByType('WebView').props.onMessage({nativeEvent:{data:'ready'}}));
  const base=Date.now();
  const tick=async(longitude,latitude,seconds)=>act(async()=>{receiveLocation({timestamp:base+seconds*1000,coords:{latitude,longitude,accuracy:5,speed:20,heading:90}});await flush();});
  await tick(.001,0,1);
  const first=messages.filter(m=>m.completed?.length).at(-1);
  assert.ok(first.completed[0].at(-1)[1]>.0009);
  assert.equal(first.remaining[0][1],first.completed[0].at(-1)[1]);
  await tick(.0012,0,2);
  assert.equal(requests,0);
  assert.ok(JSON.parse(saved).progress>100);
  await tick(.0012,.003,3);assert.equal(requests,0);
  await tick(.0012,.003,4);assert.equal(requests,1);
  assert.equal(JSON.parse(saved).pastRoutes.length,1);
  await tick(.0012,.006,5);await tick(.0012,.006,6);assert.equal(requests,1);
 }finally{globalThis.fetch=oldFetch;if(tree)await act(async()=>tree.unmount());}
});
