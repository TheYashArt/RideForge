import React,{useEffect,useState} from 'react';
import {View,StyleSheet,Text} from 'react-native';
import {Pressable} from './ui';
import {displaySpeed} from './rideMetrics.mjs';

export type SpeedReading={kmh:number|null;timestamp:number};
type Props={
 speed:SpeedReading|null;fuel:number|undefined;fuelFresh:boolean;simulated:boolean;
 km:number;paused:boolean;busy:boolean;onPause:()=>void;onResume:()=>void;onEnd:()=>void;
};
export default function RideInstruments({speed,fuel,fuelFresh,simulated,km,paused,busy,onPause,onResume,onEnd}:Props){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const kmh=displaySpeed(speed,now);
 const fuelValue=fuel===undefined?null:Math.max(0,Math.min(100,fuel));
 const lowFuel=fuelValue!==null&&fuelValue<=15&&fuelFresh&&!simulated;
 const fuelColor=!fuelFresh?'#a3aaa1':lowFuel?'#a77835':'#536c52';
 return <View testID="ride-instruments" style={s.panel}>
  <View style={s.header}>
   <View style={s.status}><View style={[s.dot,paused&&s.pausedDot]}/><Text style={s.statusText} maxFontSizeMultiplier={1.2}>{paused?'RIDE PAUSED':'RIDE IN PROGRESS'}</Text></View>
   <Text style={s.trip} maxFontSizeMultiplier={1.2}><Text style={s.tripValue}>{km.toFixed(2)}</Text> km</Text>
  </View>
  <View style={s.metrics}>
   <View style={s.speed}>
    <View style={s.speedValue}>
     <Text testID="ride-speed" accessibilityLabel={kmh===null?'GPS speed unavailable':`${kmh} kilometres per hour`} adjustsFontSizeToFit numberOfLines={1} maxFontSizeMultiplier={1.15} style={s.digits}>{kmh===null?'—':kmh}</Text>
     <Text style={s.unit} maxFontSizeMultiplier={1.2}>km/h</Text>
    </View>
    <Text style={s.caption} numberOfLines={1} maxFontSizeMultiplier={1.2}>{kmh===null?'ACQUIRING GPS':'GPS SPEED'}</Text>
   </View>
   <View style={s.divider}/>
   <View style={s.fuel}>
    <View style={s.fuelHeading}><Text style={s.caption} maxFontSizeMultiplier={1.2}>FUEL</Text><Text testID="ride-fuel" style={[s.fuelDigits,lowFuel&&s.lowFuel]} adjustsFontSizeToFit numberOfLines={1} maxFontSizeMultiplier={1.2}>{fuelValue===null?'—':Math.round(fuelValue)}{fuelValue!==null&&<Text style={s.percent}>%</Text>}</Text></View>
    <View style={s.gauge} accessibilityLabel={fuelValue===null?'Fuel unavailable':`Fuel ${Math.round(fuelValue)} percent${simulated?', simulated':''}${fuelFresh?'':', stale'}`}>
     {Array.from({length:10},(_,index)=><View key={index} style={s.segment}><View style={{height:'100%',width:`${fuelValue===null?0:Math.max(0,Math.min(1,fuelValue/10-index))*100}%`,backgroundColor:fuelColor}}/></View>)}
    </View>
    <Text numberOfLines={1} style={s.source} maxFontSizeMultiplier={1.2}>{fuelValue===null?'Sensor not connected':`${simulated?'Simulated':'Sensor'}${fuelFresh?(lowFuel?' · Low fuel':''):' · Stale reading'}`}</Text>
   </View>
  </View>
  <View style={s.actions}>
   <View style={s.action}><Pressable accessibilityRole="button" accessibilityLabel={paused?'Resume ride':'Pause ride'} disabled={busy} onPress={paused?onResume:onPause} style={[s.button,paused&&s.resume,busy&&s.disabled]}><Text style={[s.buttonText,paused&&s.resumeText]} maxFontSizeMultiplier={1.2}>{paused?'Resume ride':'Pause ride'}</Text></Pressable></View>
   <View style={s.action}><Pressable accessibilityRole="button" accessibilityLabel="End ride" disabled={busy} onPress={onEnd} style={[s.button,s.end,busy&&s.disabled]}><Text style={[s.buttonText,s.endText]} maxFontSizeMultiplier={1.2}>End ride</Text></Pressable></View>
  </View>
 </View>;
}
const s=StyleSheet.create({
 panel:{flex:1,backgroundColor:'#fafbf8',paddingHorizontal:22,paddingTop:12,paddingBottom:12,borderTopWidth:1,borderTopColor:'#dce2d8'},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
 status:{flexDirection:'row',alignItems:'center',gap:7},dot:{height:5,width:5,borderRadius:3,backgroundColor:'#536c52'},pausedDot:{backgroundColor:'#a77835'},
 statusText:{fontSize:9,fontWeight:'600',letterSpacing:1.25,color:'#687265'},trip:{fontSize:11,color:'#7b8378',fontVariant:['tabular-nums']},tripValue:{color:'#354131',fontWeight:'600'},
 metrics:{flex:1,flexDirection:'row',alignItems:'center',gap:20,minHeight:0,paddingVertical:6},
 speed:{flex:1.2,minWidth:0},speedValue:{flexDirection:'row',alignItems:'baseline',gap:6},
 digits:{fontSize:66,lineHeight:70,fontWeight:'500',letterSpacing:-3,color:'#243021',fontVariant:['tabular-nums'],includeFontPadding:false,flexShrink:1},
 unit:{fontSize:12,fontWeight:'500',color:'#818a7c'},caption:{fontSize:9,fontWeight:'600',letterSpacing:1.5,color:'#7a8474'},
 divider:{width:1,height:'65%',maxHeight:66,backgroundColor:'#e2e7dd'},fuel:{flex:1,minWidth:0},fuelHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 fuelDigits:{fontSize:28,fontWeight:'500',color:'#354131',fontVariant:['tabular-nums'],letterSpacing:-.7},percent:{fontSize:15,fontWeight:'400',color:'#818a7c'},lowFuel:{color:'#a77835'},
 gauge:{flexDirection:'row',gap:3,marginTop:7,marginBottom:8},segment:{flex:1,height:7,borderRadius:2,backgroundColor:'#e4e9df',overflow:'hidden'},source:{fontSize:10,color:'#7d8678'},
 actions:{flexDirection:'row',gap:10},action:{flex:1},button:{minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#e9eee5',borderWidth:1,borderColor:'#e9eee5'},
 buttonText:{fontSize:13,fontWeight:'600',color:'#405339'},end:{backgroundColor:'transparent',borderColor:'#dce2d8'},endText:{color:'#747b70'},resume:{backgroundColor:'#445e40',borderColor:'#445e40'},resumeText:{color:'#fff'},disabled:{opacity:.45}
});
