"""Render an explicit pin-to-pin interconnect poster, with unresolved circuits marked."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[1]
out=root/'output'/'hardware';out.mkdir(parents=True,exist_ok=True)
im=Image.new('RGB',(2000,1570),'#f5f7fa');d=ImageDraw.Draw(im)
ink='#172c40'; red='#cc3b49'; black='#465262'; teal='#008678'; blue='#2863c2'; amber='#ac6100'
def font(n,b=False):return ImageFont.truetype('C:/Windows/Fonts/arial'+('bd' if b else '')+'.ttf',n)
def t(x,y,s,n=25,c=ink,b=False):d.text((x,y),s,font=font(n,b),fill=c)
def box(x,y,w,h,title,sub=None,c=ink):
 d.rounded_rectangle((x,y,x+w,y+h),radius=18,fill='white',outline=c,width=3)
 t(x+20,y+16,title,29,c,True)
 if sub:t(x+20,y+57,sub,22)
def wire(points,c=teal,width=5,dashed=False):
 if not dashed:d.line(points,fill=c,width=width,joint='curve');return
 for a,b in zip(points,points[1:]):
  import math
  length=math.dist(a,b)
  for p in range(0,int(length),22):
   q=min(p+12,length)
   d.line([(a[0]+(b[0]-a[0])*p/length,a[1]+(b[1]-a[1])*p/length),(a[0]+(b[0]-a[0])*q/length,a[1]+(b[1]-a[1])*q/length)],fill=c,width=width)
def dot(x,y,c):d.ellipse((x-6,y-6,x+6,y+6),fill=c)
def gnd(x,y):
 wire([(x,y),(x,y+15)],black,3)
 for k,w in enumerate([36,24,10]):wire([(x-w/2,y+15+k*8),(x+w/2,y+15+k*8)],black,3)
 t(x-23,y+44,'GND',19,black)
def cap(x,y,label):
 wire([(x,y),(x,y+32)],red,3)
 wire([(x-18,y+32),(x+18,y+32)],ink,3);wire([(x-18,y+43),(x+18,y+43)],ink,3)
 wire([(x,y+43),(x,y+68)],black,3);gnd(x,y+68);t(x+28,y+28,label,21)

t(45,28,'RIDEFORGE  /  VISUAL PIN CONNECTIONS',46,b=True)
t(45,91,'ESP32-S3 SuperMini + SmartElex MAX-M10S breakout + 2023 Platina 110 analogue fuel gauge',26)
t(45,132,'LOGICAL PIN POSITIONS: match printed labels on your boards, not the locations drawn here.',24,blue,True)

box(45,200,270,175,'BIKE POWER','Ignition-switched supply')
t(65,293,'+12 V',26,red,True);t(65,337,'Battery negative',22)
wire([(170,307),(355,307)],red)
d.rectangle((355,293,440,321),fill='white',outline=red,width=3)
t(352,244,'F1 FUSE',23,red,True);t(330,344,'Size per converter',20);t(330,369,'and wire rating',20)
wire([(440,307),(515,307)],red)
box(515,200,520,190,'PROTECTED 12 V -> 5 V CONVERTER','Exact model / footprint still to be selected',amber)
t(535,291,'IN+',25,red);t(535,343,'IN-',25,black)
t(916,291,'OUT+',25,red);t(916,343,'OUT-',25,black)
wire([(265,353),(290,353),(290,421),(550,421),(550,390)],black);gnd(550,421)
wire([(1035,307),(1150,307),(1150,533)],red)
t(1070,242,'Regulated 5 V',23,red,True)
wire([(1035,353),(1080,353),(1080,417)],black);gnd(1080,417)
t(45,440,'Reverse-polarity + transient protection required.',20,amber)
t(45,488,'Power through USB cable. Disconnect bike power before plugging into a PC.',22,b=True)

box(740,535,500,540,'ESP32-S3 SUPERMINI','Core controller / BLE radio',teal)
d.rounded_rectangle((1075,519,1210,568),radius=7,fill='#dfe5eb',outline=ink,width=3)
t(1088,530,'USB 5 V',24)
d.rounded_rectangle((780,655,1030,827),radius=9,fill='#dce6e9',outline='#6c808b',width=2)
t(803,692,'ESP32-S3',32,b=True);t(815,741,'3.3 V logic',23)

box(1580,535,375,540,'MAX-M10S','SmartElex breakout board',teal)
d.rounded_rectangle((1665,950,1870,1023),radius=7,fill='#e0e6e9',outline=ink,width=2)
t(1680,968,'u-blox GNSS',25,b=True)
for y,lp,rp,col,lab in [(650,'3V3','3V3',red,'3.3 V power'),(725,'GND','GND',black,'Common ground'),(800,'GPIO5 (RX)','TX',teal,'GPS -> ESP'),(875,'GPIO4 (TX)','RX',blue,'ESP -> GPS')]:
 t(1250,y-44,lab,21,col,True);wire([(1240,y),(1580,y)],col);dot(1240,y,col);dot(1580,y,col)
 t(1110 if y<780 else 1050,y-13,lp,24,col,True);t(1601,y-13,rp,25,col,True)
t(760,960,'GPIO1 / FUEL ADC',25,amber,True)
t(765,1023,'UART GPIO4/5: proposed firmware mapping',20)
dot(740,975,amber)

# Local bypass components connect explicitly to the same 3.3 V and GND nets.
wire([(1380,650),(1380,410),(1490,410)],red,3);dot(1380,650,red)
cap(1420,410,'100 nF');cap(1540,410,'10 uF')
wire([(1490,410),(1540,410)],red,3)
t(1280,359,'C1 + C2 close to GPS power header',22,red)

box(1600,200,355,115,'GNSS ANTENNA','Compatible antenna + SMA cable')
wire([(1870,315),(1870,500),(1780,500),(1780,535)],ink,6)
t(1710,448,'SMA connector',23)

box(45,555,490,150,'EXISTING ANALOGUE GAUGE','Keep factory gauge / sender wiring intact.',amber)
t(65,651,'Tank sender <-> original gauge',24)
wire([(290,705),(290,770)],amber,dashed=True)
box(45,770,530,240,'FUEL SIGNAL CONDITIONER','NOT DESIGNED - do not wire to bike yet',amber)
t(65,864,'High-impedance sense + protection',25)
t(65,905,'Buffer / filter + power-off protection',25)
t(65,946,'Component values need signal measurements.',22)
wire([(575,975),(740,975)],amber,dashed=True)
t(590,929,'OUT',23,amber,True)
gnd(455,1010)

box(45,1120,600,143,'BENCH TEST ONLY','10 kOhm potentiometer replaces fuel interface')
t(65,1211,'Ends: 3V3 / GND     Wiper: GPIO1',26,teal,True)
box(740,1120,500,143,'RIDEFORGE PHONE APP','Wireless BLE - no electrical connection')
t(760,1211,'Device: Platina_Telematics',25,teal,True)
wire([(990,1075),(990,1120)],teal,dashed=True)
box(1320,1120,635,143,'UNUSED GPS HEADERS','PPS / EINT / RST / SDA / SCL: leave open')
t(1340,1211,'Use header labels; no bare-module pad wiring.',23)

d.rounded_rectangle((45,1300,1955,1530),radius=15,fill='#fff0da',outline='#dca44a',width=2)
t(65,1317,'BUILD STATUS / REQUIRED CHECKS',28,amber,True)
t(65,1361,'1. GPS wiring is specified. Verify ESP board 3V3 regulator capacity for the GPS plus antenna load.',25)
t(65,1398,'2. All GND symbols join one common ground. GPS 3V3 must never receive 5 V or bike voltage.',25)
t(65,1435,'3. Dashed fuel circuit is unfinished: measure gauge voltage / pulses before selecting interface parts.',25)
t(65,1472,'4. Firmware still needs GPS parsing and real-fuel calibration. This is not a production PCB schematic.',25)
im.save(out/'rideforge-visual-pin-diagram.png')
print(out/'rideforge-visual-pin-diagram.png')

