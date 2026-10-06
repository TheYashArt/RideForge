import React from 'react';
import {View,Text,StyleSheet} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Pressable} from './ui';
const items=[
 {label:'Cockpit',icon:'speedometer-outline',active:'speedometer'},
 {label:'Rides',icon:'trail-sign-outline',active:'trail-sign'},
 {label:'Fuel',icon:'water-outline',active:'water'},
 {label:'Navigate',icon:'navigate-outline',active:'navigate'},
 {label:'Device',icon:'hardware-chip-outline',active:'hardware-chip'},
] as const;
export default function BottomTabs({selected,onSelect}:{selected:string;onSelect:(tab:string)=>void}){
 return <View style={s.shell}><View style={s.bar}>{items.map(item=>{
  const active=selected===item.label;
  return <View key={item.label} style={s.slot}><Pressable accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected:active}} onPress={()=>onSelect(item.label)} style={s.tab}>
   <View style={[s.icon,active&&s.activeIcon]}><Ionicons name={active?item.active:item.icon} size={22} color={active?'#fff':'#879080'}/></View>
   <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[s.label,active&&s.activeLabel]}>{item.label}</Text>
  </Pressable></View>;
 })}</View></View>;
}
const s=StyleSheet.create({
 shell:{backgroundColor:'#f8f7f4',paddingHorizontal:14,paddingTop:8,paddingBottom:6},
 bar:{flexDirection:'row',paddingHorizontal:5,paddingVertical:8,borderRadius:22,backgroundColor:'#fff',borderWidth:1,borderColor:'#e5e8df',elevation:3,shadowColor:'#233021',shadowOpacity:.06,shadowOffset:{width:0,height:3},shadowRadius:10},
 slot:{flex:1,minWidth:0},tab:{minHeight:58,alignItems:'center',justifyContent:'center',gap:5},
 icon:{height:32,width:44,borderRadius:12,alignItems:'center',justifyContent:'center'},activeIcon:{backgroundColor:'#445e40'},
 label:{fontSize:10,fontWeight:'500',color:'#879080'},activeLabel:{fontWeight:'700',color:'#354c31'},
});
