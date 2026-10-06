import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('map arrow points forward in heading-up mode and east in north-up mode',()=>{
 const source=fs.readFileSync(new URL('../src/Navigation.tsx',import.meta.url),'utf8');
 const html=source.match(/const html=`([\s\S]*?)`;/)[1];
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const arrow={style:{}},listeners={},containerListeners={},lines=[],messages=[];
 let mapOptions;
 const map={bearing:0,setView(){return this;},on(event,callback){listeners[event]=callback;},getContainer(){return {addEventListener(event,callback){containerListeners[event]=callback;}};},setBearing(value){this.bearing=value;listeners.rotate?.();},getBearing(){return this.bearing;},invalidateSize(){},fitBounds(){}};
 const L={map:(id,options)=>{mapOptions=options;return map;},tileLayer:()=>({addTo(){}}),divIcon:options=>options,polyline:(points,style)=>{const line={points,style,addTo(){return this;},setLatLngs(value){this.points=value;}};lines.push(line);return line;},marker:()=>({addTo(){return this;},setLatLng(){},getElement:()=>({querySelector:()=>arrow})}),latLngBounds:points=>points};
 const window={ReactNativeWebView:{postMessage(message){messages.push(message);}}};
 vm.runInNewContext(script,{L,window});
 assert.equal(mapOptions.touchRotate,true);
 containerListeners.touchstart({touches:[{},{}]});
 assert.equal(messages.at(-1),'browse');
 window.update({position:[0,0],heading:90,follow:true,zoom:17});
 assert.equal(arrow.style.transform,'rotate(0deg)');
 map.setBearing(0);
 assert.equal(arrow.style.transform,'rotate(90deg)');
 window.update({completed:[[[0,0],[0,.01]]],remaining:[[0,.01],[0,.02]]});
 assert.equal(lines[0].style.color,'#9ba49a');
 assert.equal(lines[0].points[0].length,2);
 assert.equal(lines[1].points.length,2);
 window.update({clear:true});
 assert.equal(lines[0].points.length,0);assert.equal(lines[1].points.length,0);
});
