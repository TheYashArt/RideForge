"""Create the review schematic from pcb.md; no fabrication/CAD release implied.

Requires reportlab, pypdfium2 and pypdf. Run: python docs/build_schematic.py
"""
from pathlib import Path
from html import escape
import csv
import math
import sys
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.pagesizes import A3, landscape

ROOT = Path(__file__).resolve().parents[1]
PDFDIR = ROOT / 'output' / 'pdf'
SVGDIR = ROOT / 'output' / 'hardware' / 'schematic'
QADIR = ROOT / 'tmp' / 'schematic-qa'
for folder in (PDFDIR, SVGDIR, QADIR):
    folder.mkdir(parents=True, exist_ok=True)
W, H = 1600, 1130
PW, PH = landscape(A3)
INK, WIRE, POWER, TBD = '#202c36', '#315e61', '#9b303b', '#a85b0b'
PDF = PDFDIR / 'rideforge-schematic.pdf'
c = canvas.Canvas(str(PDF), pagesize=(PW, PH))
c.setTitle('Rideforge hardware schematic - Rev A draft')
c.setAuthor('Rideforge')
svg = []
all_text = []
files = []
def text(x, y, s, size=16, col=INK, bold=False, anchor='start'):
    font = 'Helvetica-Bold' if bold else 'Helvetica'
    tw = stringWidth(s, font, size)
    left = x if anchor == 'start' else x - tw if anchor == 'end' else x - tw / 2
    if left < 0 or left + tw > W or y < 0 or y > H:
        raise ValueError(f'Text outside sheet: {s}')
    c.setFont(font, size); c.setFillColor(HexColor(col))
    c.drawString(left, H-y, s)
    svg.append(f'<text x="{x}" y="{y}" font-family="Arial,Helvetica,sans-serif" font-size="{size}" fill="{col}" text-anchor="{anchor}" font-weight="{"bold" if bold else "normal"}">{escape(s)}</text>')
    all_text.append(s)
def line(x1, y1, x2, y2, col=WIRE, dashed=False, width=2):
    c.setStrokeColor(HexColor(col)); c.setLineWidth(width)
    c.setDash(6,4) if dashed else c.setDash()
    c.line(x1,H-y1,x2,H-y2); c.setDash()
    svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" stroke-width="{width}"'+(' stroke-dasharray="6 4"' if dashed else '')+'/>')
def path(points, col=WIRE, dashed=False):
    for a,b in zip(points,points[1:]): line(*a,*b,col,dashed)
def rect(x,y,w,h,col=INK,fill='none',dashed=False):
    c.setStrokeColor(HexColor(col)); c.setLineWidth(1.4)
    c.setDash(6,4) if dashed else c.setDash()
    c.setFillColor(HexColor(fill if fill != 'none' else '#ffffff'))
    c.rect(x,H-y-h,w,h,stroke=1,fill=fill!='none'); c.setDash()
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{col}" stroke-width="1.4"'+(' stroke-dasharray="6 4"' if dashed else '')+'/>')
def dot(x,y,col=WIRE):
    c.setFillColor(HexColor(col)); c.circle(x,H-y,3.8,stroke=0,fill=1)
    svg.append(f'<circle cx="{x}" cy="{y}" r="3.8" fill="{col}"/>')
def circle(x,y,r,col=INK):
    c.setStrokeColor(HexColor(col));c.setLineWidth(1.5);c.circle(x,H-y,r,stroke=1,fill=0)
    svg.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{col}" stroke-width="1.5"/>')
def ground(x,y):
    line(x,y,x,y+10,INK)
    for yy,ww in ((y+10,24),(y+16,16),(y+22,8)): line(x-ww/2,yy,x+ww/2,yy,INK)
def nc(x,y):
    line(x-5,y-5,x+5,y+5,TBD); line(x-5,y+5,x+5,y-5,TBD)
def net(x,y,label,col=WIRE,anchor='start'):
    text(x,y,label,15,col,True,anchor)
def r_h(x1,x2,y,ref,value):
    mid=(x1+x2)/2
    line(x1,y,mid-25,y); rect(mid-25,y-9,50,18); line(mid+25,y,x2,y)
    text(mid,y-26,ref,15,anchor='middle'); text(mid,y+35,value,15,anchor='middle')
def r_v(x,y1,y2,ref,value,label_side='right'):
    mid=(y1+y2)/2
    line(x,y1,x,mid-23);rect(x-9,mid-23,18,46);line(x,mid+23,x,y2)
    tx=x+18 if label_side=='right' else x-18
    anchor='start' if label_side=='right' else 'end'
    text(tx,mid-3,ref,15,anchor=anchor);text(tx,mid+18,value,15,anchor=anchor)
def cap(x,y1,y2,ref,value,left=False):
    mid=(y1+y2)/2
    line(x,y1,x,mid-5);line(x-12,mid-5,x+12,mid-5,INK);line(x-12,mid+5,x+12,mid+5,INK);line(x,mid+5,x,y2)
    tx=x-19 if left else x+19; anchor='end' if left else 'start'
    text(tx,mid-2,ref,14,anchor=anchor);text(tx,mid+18,value,14,anchor=anchor)
def diode_h(x1,x2,y,ref,label,reverse=False,dashed=False,label_y=None):
    mid=(x1+x2)/2; k=mid-14 if reverse else mid+14; a=mid+14 if reverse else mid-14
    line(x1,y,mid-14,y,dashed=dashed);line(mid+14,y,x2,y,dashed=dashed)
    path([(a,y-11),(a,y+11),(k,y),(a,y-11)],INK,dashed)
    line(k,y-13,k,y+13,INK,dashed)
    text(mid,y-30,ref,15,anchor='middle');text(mid,label_y if label_y is not None else y+35,label,14,TBD,anchor='middle')
    text(a,y+20,'A',11,anchor='middle');text(k,y+20,'K',11,anchor='middle')
def diode_up(x,y1,y2,ref,label,left=False):
    mid=(y1+y2)/2
    line(x,y1,x,mid-12);line(x,y2,x,mid+12)
    path([(x-11,mid+12),(x+11,mid+12),(x,mid-12),(x-11,mid+12)],INK)
    line(x-13,mid-12,x+13,mid-12,INK)
    tx=x-22 if left else x+22; anchor='end' if left else 'start'
    text(tx,mid-5,ref,15,anchor=anchor);text(tx,mid+15,label,13,TBD,anchor=anchor)
    text(x-18,mid-13,'K',11,anchor='end');text(x-18,mid+21,'A',11,anchor='end')
def notes(x,y,title,rows,width=1450):
    rect(x,y,width,47+len(rows)*25,TBD,'#fffaf3')
    text(x+16,y+28,title,18,TBD,True)
    for i,row in enumerate(rows):text(x+16,y+55+25*i,row,15)
def header(n,title,subtitle):
    global svg
    c.saveState();c.scale(PW/W,PH/H)
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1130" viewBox="0 0 1600 1130"><rect width="1600" height="1130" fill="white"/>']
    text(48,48,'RIDEFORGE',27,INK,True)
    text(1550,47,f'REV A / DRAFT / SHEET {n} OF 4',16,TBD,True,'end')
    text(48,82,title,24,INK,True);text(48,110,subtitle,15)
    line(48,126,1552,126,INK,width=1)
def finish(n,stem):
    line(48,1060,1552,1060,INK,width=1)
    text(48,1086,'Basis: pcb.md + pcb-components.md | 06 Oct 2026 | Amber = unresolved selection / validation',14)
    text(48,1110,'Schematic review drawing. No CAD ERC, physical-board verification, vehicle testing or fabrication release.',14,TBD)
    svg.append('</svg>')
    target=SVGDIR/f'{n:02d}-{stem}.svg';target.write_text('\n'.join(svg),encoding='utf-8');files.append(target)
    c.restoreState();c.showPage()

# 1: Power. TVS is shunt-connected; the unknown protection stages are explicit blocks.
header(1,'Vehicle power and separate 3.3 V supplies','Selected controller: ESP32-S3 SuperMini. Baseline: ignition-switched power, no backup battery.')
text(60,177,'J1 / sealed power input',17,bold=True)
text(60,208,'1  ACC +12 V',16);text(60,251,'2  BIKE_GND',16)
line(188,204,248,204,POWER)
rect(248,194,45,20);text(270,178,'F1',15,anchor='middle');text(270,246,'0.5-1 A TBD',14,anchor='middle')
line(293,204,350,204,POWER)
rect(350,160,270,96,TBD,'#fffaf3',True)
text(365,187,'Q1 / U0 reverse protection',17,TBD,True)
text(365,214,'Automotive topology + ratings TBD',14)
line(620,204,710,204,POWER);dot(710,204,POWER)
line(710,204,710,231,POWER)
rect(682,231,56,50,TBD,'#fffaf3')
text(747,254,'D1 TVS',15,TBD,True);text(747,278,'Part / pulse rating TBD',14,TBD)
line(710,281,710,306);ground(710,306)
line(710,204,865,204,POWER)
rect(865,160,272,96,TBD,'#fffaf3',True)
text(881,187,'FLT1 / conducted-noise filter',17,TBD,True)
text(881,215,'LC or CMC / values TBD',14)
line(1137,204,1440,204,POWER);net(1158,187,'VIN_PROTECTED',POWER)
line(188,246,210,246);ground(210,246);text(59,300,'BIKE_GND = GND_STAR',15)
text(48,349,'U1 / 5 V buck - TI 400 kHz reference circuit',20,bold=True)
rect(520,390,335,260)
text(538,418,'LMR51610XFQDBVRQ1',19,bold=True)
text(538,446,'DBV / SOT-23-6 / FPWM / 1 A',15)
for yy,label in ((480,'5 VIN'),(530,'4 EN'),(615,'2 GND')):text(538,yy+5,label,16)
for yy,label in ((480,'1 CB'),(540,'6 SW'),(605,'3 FB')):text(837,yy+5,label,16,anchor='end')
net(105,459,'VIN_PROTECTED',POWER)
line(105,480,520,480,POWER)
for xx,ref,value in ((250,'C10','2.2 uF / 100 V'),(403,'C11','100 nF / 100 V')):
    dot(xx,480,POWER);cap(xx,480,575,ref,value,left=xx==250);ground(xx,575)
path([(470,480),(470,530),(520,530)],POWER);dot(470,480,POWER)
line(490,615,520,615);ground(490,615)
path([(855,480),(904,480)],POWER)
cap(904,480,540,'C12','100 nF / >=16 V')
line(855,540,982,540,POWER);dot(904,540,POWER)
# L10 conventional inductor symbol, four arcs.
line(982,540,1000,540,POWER)
for i in range(4):
    x=1000+i*15
    c.setStrokeColor(HexColor(INK));c.setLineWidth(2)
    c.arc(x,H-550,x+15,H-530,startAng=0,extent=180)
    svg.append(f'<path d="M{x} 540 A7.5 10 0 0 1 {x+15} 540" stroke="{INK}" stroke-width="2" fill="none"/>')
line(1060,540,1440,540,POWER)
text(1030,510,'L10 / 33 uH',16,anchor='middle');text(1030,576,'>=1.5 A RMS / >=2.5 A Isat',14,anchor='middle')
net(1376,518,'V5_SYS',POWER)
dot(1310,540,POWER);cap(1310,540,655,'C13','22 uF / 16 V');ground(1310,655)
dot(1180,540,POWER);r_v(1180,540,640,'R10','118 kOhm')
dot(1180,640);path([(855,605),(1100,605),(1100,640),(1180,640)])
r_v(1180,640,740,'R11','22.1 kOhm');ground(1180,740)
text(60,696,'C10/C11/C13: X7R ceramic; account for DC-bias derating.',15)
text(60,721,'Reference 5 V setting calculates 5.07 V nominal; 33 uH comes from TI\'s 6-65 V input example.',15)
text(60,746,'U1\'s 1 A output budget is shared by the controller and GPS branch.',15,bold=True)
# U2 detailed connection; independent from the SuperMini's 3V3.
rect(370,830,430,136)
text(387,853,'U2 / TLV76733QWDRBRQ1 (proposed)',18,bold=True)
text(387,876,'Fixed 3.3 V / DRB VSON-8 / GPS rail',15)
text(387,890,'8 IN + 5 EN',16);text(780,890,'1 OUT + 3 SNS',16,anchor='end')
text(387,937,'4 GND, 6 GND, exposed pad -> GND_STAR',14)
net(62,863,'V5_SYS',POWER);line(62,885,370,885,POWER)
dot(213,885,POWER);cap(213,885,965,'C20','1 uF / 10 V',True);ground(213,965)
line(800,885,1285,885,POWER);net(1200,866,'V3V3_SYS',POWER)
dot(980,885,POWER);cap(980,885,972,'C21','2.2 uF / 10 V');ground(980,972)
path([(330,885),(330,776),(475,776)],POWER,True)
path([(700,776),(838,776),(838,885)],POWER,True)
diode_h(475,700,776,'','D20: Schottky reverse bypass / part TBD',reverse=True,dashed=True,label_y=818)
dot(330,885,POWER);dot(838,885,POWER)
line(600,966,600,978);ground(600,978)
text(850,1009,'D20: A = OUT, K = IN. U2 has no reverse-current limiting.',14,TBD)
text(60,1011,'U2 pins 2/7 NC; may tie to GND per TI. Separate output from V3V3_FUEL.',14)
text(60,1037,'Baseline has no post-key-off power, charger, battery, or ACC sense circuit.',15,TBD,True)
finish(1,'power')

# 2: Controller and GNSS. Logical pins are shown; no fabricated SuperMini header positions.
header(2,'ESP32-S3 controller and MAX-M10S GNSS','Raw-module option drawn below. Use the alternate J3 breakout interface instead if the purchased GPS is a carrier board.')
rect(68,189,478,520)
text(87,220,'U3 / ESP32-S3 SuperMini',21,bold=True)
text(87,250,'Board revision / header footprint TBD',16,TBD)
text(87,294,'Verified 5V/VIN input',17)
line(20,288,68,288,POWER);net(20,270,'V5_SYS',POWER)
text(87,345,'GND',17);line(20,339,68,339);ground(20,339)
text(87,396,'3V3 regulated OUTPUT',17)
line(546,390,735,390,POWER);net(573,370,'V3V3_FUEL',POWER)
text(528,477,'UART_RX_FROM_GNSS',16,anchor='end')
text(528,556,'UART_TX_TO_GNSS',16,anchor='end')
text(528,635,'PPS_INPUT_OPTIONAL',16,anchor='end')
text(87,680,'ADC1_FUEL_INPUT',16)
line(546,674,735,674);net(575,698,'FUEL_ADC (sheet 3)')
text(88,737,'GPIO proposals from pcb.md:',17,bold=True)
text(88,764,'RX GPIO17 / TX GPIO18 / PPS GPIO16 / ADC GPIO1.',15)
text(88,790,'Use only exposed pins on the actual SuperMini.',15,TBD)
text(88,816,'GPIO4/5 are an alternate UART proposal in older notes.',15)
text(88,842,'Reserve GPIO19/20 for native USB; avoid strapping pins.',15)
rect(1095,189,360,520)
text(1112,220,'U4 / u-blox MAX-M10S',21,bold=True)
text(1112,250,'Raw module, 3.3 V UART logic',16)
text(1112,295,'8 VCC + 7 V_IO',17)
line(970,289,1095,289,POWER);net(959,270,'V3V3_SYS',POWER)
text(1112,345,'1 / 10 / 12 GND',17);line(1020,339,1095,339);ground(1020,339)
text(1112,477,'2 TXD (output)',17)
text(1112,556,'3 RXD (input)',17)
text(1112,635,'4 TIMEPULSE (output)',17)
text(1437,687,'11 RF_IN',15,anchor='end')
line(1455,681,1512,681);circle(1512,681,18);dot(1512,681)
line(1512,699,1512,741);ground(1512,741)
net(1550,657,'GNSS_RF_50R',WIRE,'end')
text(1550,794,'J4 / coax, part TBD',14,TBD,anchor='end')
text(1550,818,'Attach passive GNSS antenna',13,anchor='end')
line(546,471,698,471);r_h(698,892,471,'R20','47 Ohm optional');line(892,471,1095,471)
net(650,444,'GPS_TX',WIRE,'end')
line(546,550,698,550);r_h(698,892,550,'R21','47 Ohm optional');line(892,550,1095,550)
net(650,523,'GPS_RX',WIRE,'end')
line(546,629,1095,629,dashed=True);net(812,612,'GPS_PPS (optional)',WIRE,'middle')
# Local decoupling illustrated with global rail labels for clarity.
net(750,714,'V3V3_SYS',POWER)
line(700,735,1010,735,POWER)
for x,ref,value,left in ((720,'C40','100 nF / VCC',True),(865,'C41','100 nF / V_IO',False)):
    dot(x,735,POWER);cap(x,735,818,ref,value,left);ground(x,818)
net(1190,742,'V3V3_SYS',POWER,'middle');cap(1190,755,828,'C42','10 uF / 10 V');ground(1190,828)
text(1088,861,'Fit close to U4; check breakout parts before duplicating.',14)
text(48,898,'U4 unused pads: 5 EXTINT, 6 V_BCKP, 9 RESET_N, 13 LNA_EN, 14 VCC_RF, 15 VIO_SEL, 16 SDA, 17 SCL, 18 SAFEBOOT_N: NC.',14)
text(48,924,'VIO_SEL open = 3.3 V I/O. Passive antenna baseline; an active antenna needs its verified bias supply circuit.',15)
notes(48,932,'Alternate J3 / breakout interface + power sequencing',[
    'J3: 1 V3V3_SYS / 2 GND_STAR / 3 GPS_TX / 4 GPS_RX / 5 GPS_PPS optional. These are proposed carrier-connector pins.',
    'Use U4 raw module OR J3 breakout; do not populate both. Breakout header order and voltage must be verified separately.',
    'Do not drive GNSS inputs while V_IO is off. PPS must stay high impedance at startup. Verify USB and separate-rail sequencing.'
],width=1504)
finish(2,'controller-gnss')

# 3: Existing sender untouched; R1 physically precedes outgoing branch cable.
header(3,'Fuel-sender tap, input conditioning and ADC','Reference front end assumes 0-16 V. Actual vehicle signal / ground reference, tank calibration and powered-off protection remain unverified.')
rect(55,175,1460,190,col=TBD,fill='#fffaf3')
text(76,205,'REMOVABLE T-HARNESS / NO ORIGINAL WIRE CUT OR PIERCED',19,TBD,True)
text(76,244,'Original bike harness',17,bold=True);text(1250,244,'Original tank sender',17,bold=True)
line(295,255,1240,255);dot(650,255)
text(345,236,'Identified signal contact passes straight through by electrical identity',15)
line(295,298,1240,298)
text(345,325,'All other original contacts / sender return pass straight through; actual contact count and pin numbers TBD.',15)
path([(650,255),(650,275),(240,275),(240,415)])
net(670,284,'FUEL_GAUGE_RAW')
r_h(240,440,415,'R1','110 kOhm / 1%')
text(81,384,'R1 inside sealed adapter',15,TBD,True)
rect(222,391,223,72,TBD,'none',True)
line(440,415,680,415);net(460,395,'FUEL_TAP_LIMITED')
text(681,393,'J2 pin 1',15,bold=True)
rect(675,406,12,18);line(687,415,757,415)
r_h(757,987,415,'R2','110 kOhm / 1%')
line(987,415,1075,415);dot(1075,415);net(1020,393,'FUEL_DIV')
text(52,487,'J2 pin 2: RESERVED / NC',15,TBD)
text(52,512,'No second tank ground added.',15)
# The divided signal fanout lies below and then toward the op-amp.
path([(1075,415),(1075,540),(430,540)])
dot(1075,540);line(1075,540,1170,540)
for x in (430,580,710):line(x,540,785,540) if x==710 else None
dot(430,540);dot(580,540);dot(710,540)
r_v(430,540,704,'R3','47 kOhm / 1%','left');ground(430,704)
cap(580,540,704,'C1','10 nF',True);ground(580,704)
diode_up(710,452,540,'D2','Upper clamp TBD',True)
net(745,477,'V3V3_FUEL',POWER);path([(710,452),(736,452),(736,480)],POWER)
diode_up(710,540,704,'D3','Lower clamp TBD',False);ground(710,704)
# Op-amp triangle, separated from input branches.
path([(1170,500),(1170,690),(1310,595),(1170,500)],INK)
text(1177,547,'+ 3',15);text(1177,651,'- 4',15)
text(1550,477,'U5 / TLV9001QDBVRQ1',16,bold=True,anchor='end')
text(1550,501,'DBV / standard SOT-23-5',14,anchor='end')
path([(1310,595),(1338,595),(1338,730),(1100,730),(1100,645),(1170,645)])
dot(1338,595)
text(1320,579,'1 OUT',14)
text(1130,756,'Feedback: OUT pin 1 directly to IN- pin 4, before R4.',15)
line(1310,595,1370,595);r_h(1370,1534,595,'R4','1 kOhm')
path([(1534,595),(1544,595),(1544,813),(1110,813)])
net(1270,792,'FUEL_ADC -> U3 ADC1 input')
dot(1445,813);cap(1445,813,901,'C2','100 nF',True);ground(1445,901)
# Supply pins as named globals, no accidental rail tie.
path([(1240,547.5),(1240,514)],POWER)
net(1240,420,'V3V3_FUEL',POWER,'middle')
path([(1240,514),(1240,432)],POWER);text(1248,529,'5 V+',14)
line(1240,642.5,1240,705);ground(1240,705);text(1248,697,'2 V-',14)
net(52,582,'V3V3_FUEL',POWER);cap(144,595,681,'C3','100 nF / supply');ground(144,681)
text(52,744,'Nominal divider: 47 / (110 + 110 + 47) = 0.17603',17,bold=True)
text(52,775,'12 V -> 2.112 V | 14.5 V -> 2.552 V | 16 V -> 2.816 V',16)
text(52,806,'DC input resistance ~267 kOhm; normal 16 V load ~59.9 uA.',15)
text(52,836,'FUEL_TAP_LIMITED is after R1: do not add a third 110 kOhm.',15,TBD)
text(52,869,'D2: A = FUEL_DIV, K = V3V3_FUEL.',15)
text(52,894,'D3: A = GND_STAR, K = FUEL_DIV.',15)
notes(48,932,'OPEN: input clamps and power-off behavior',[
    'D2/D3 parts, leakage over temperature and pulse ratings are TBD. Upper clamp and op-amp input diodes can back-power 3V3.',
    'The divider is not a completed automotive surge/power-off design. Resolve rail-current handling or isolation before bike use.',
    'Measure the actual signal and ground reference with the factory gauge connected. ADC attenuation/calibration must suit this range.'
],width=1504)
finish(3,'fuel-input')

# 4: A concise assembly reference and traceable assumptions.
header(4,'Connection schedule, draft decisions and verification','Read with sheets 1-3. Named nets are electrical connections; they do not define connector mating-face order or PCB footprints.')
def table(x,y,widths,headers,rows,rowheight=35):
    xs=[x]
    for w in widths:xs.append(xs[-1]+w)
    rect(x,y,sum(widths),rowheight*(len(rows)+1),fill='#ffffff')
    rect(x,y,sum(widths),rowheight,fill='#edf3f3')
    for xx in xs[1:-1]:line(xx,y,xx,y+rowheight*(len(rows)+1),INK,width=1)
    for j,row in enumerate([headers]+rows):
        if j:line(x,y+j*rowheight,x+sum(widths),y+j*rowheight,INK,width=0.7)
        for i,cell in enumerate(row):text(xs[i]+10,y+j*rowheight+24,cell,15,bold=j==0)
table(48,155,[190,410,904],['Connection','From','To / treatment'],[
    ('V5_SYS','U1 output','U3 verified 5V/VIN input + U2 IN/EN; unplug vehicle supply for USB programming.'),
    ('V3V3_SYS','U2 output','MAX-M10S VCC/V_IO or verified 3.3 V breakout input; GNSS decoupling.'),
    ('V3V3_FUEL','U3 regulated 3V3 output','U5 pin 5, C3 and upper fuel clamp; do not join to V3V3_SYS.'),
    ('GND_STAR','J1 verified battery/harness GND','U1/U2/U3/U4/U5 and all local return capacitors; one external return.'),
    ('GPS_TX','U4 pin 2 / breakout TX','U3 exposed UART RX (GPIO17 proposed, actual mapping TBD).'),
    ('GPS_RX','U3 exposed UART TX','U4 pin 3 / breakout RX (GPIO18 proposed, actual mapping TBD).'),
    ('GPS_PPS','U4 pin 4 / breakout PPS','Optional U3 input; no startup pull-down (GPIO16 proposed).'),
    ('FUEL_ADC','U5 pin 1 -> R4 -> C2 node','U3 exposed ADC1 input (GPIO1 proposed); conditioned real signal only.'),
    ('J2 pin 1','T-harness R1 outgoing branch','R2 input = FUEL_TAP_LIMITED. Actual motorcycle sender pin is unverified.'),
    ('J2 pin 2','Reserved','NC in baseline; no extra tank/chassis ground.')
])
notes(48,574,'Decisions made for this drawing',[
    'No backup battery or charger. U2 TLV76733-Q1 is a proposed new selection; original BOM left the external regulator open.',
    'U1 values reproduce TI\'s reference circuit, not a verified Platina installation. Reverse protection, TVS and input filter remain TBD.',
    'Raw MAX-M10S uses a passive antenna baseline. A documented breakout is an alternate implementation, not an additional GPS.',
    'SuperMini is an assembled board; no duplicate bare-ESP reset, boot or USB circuit is added. BLE is a radio link to the phone.'
],width=1504)
text(48,775,'Verification before assembly / installation',20,bold=True)
text(48,805,'1. Match actual board labels, GNSS variant, antenna and sender connector; finalize footprints and GPIO allocation.',15)
text(48,833,'2. Close protection ratings, clamp leakage/rail injection, U2 reverse current, and USB/UART sequencing; capture CAD and run ERC.',15)
text(48,861,'3. Bench-test current-limited power rails and temperatures; exercise a 0-16 V fuel test signal and powered-off cases.',15)
text(48,889,'4. Verify motorcycle waveform/loading, key-on/crank/key-off behavior and enclosure; calibrate tank level with known quantities.',15)
text(48,926,'Manufacturer references (clickable in PDF)',18,bold=True)
refs=[
    ('U1: TI LMR51610-Q1 data sheet / 5 V reference circuit','https://www.ti.com/lit/ds/symlink/lmr51610-q1.pdf'),
    ('U2: TI TLV767-Q1 data sheet / DRB pinout and reverse current','https://www.ti.com/lit/ds/symlink/tlv767-q1.pdf'),
    ('U4: u-blox MAX-M10S data sheet + integration manual','https://content.u-blox.com/sites/default/files/MAX-M10S_DataSheet_UBX-20035208.pdf'),
    ('U5: TI TLV9001-Q1 data sheet / standard DBV pinout','https://www.ti.com/lit/ds/symlink/tlv9001-q1.pdf'),
]
for i,(label,url) in enumerate(refs):
    yy=954+i*23;text(48,yy,label,14,WIRE)
    c.linkURL(url,(48,H-yy-3,760,H-yy+17),relative=1)
finish(4,'connection-schedule')
c.save()

# Editable companion notes and machine-readable component-pin schedule.
connections={
    'U1':{'1':'BUCK_CB','2':'GND_STAR','3':'BUCK_FB','4':'VIN_PROTECTED','5':'VIN_PROTECTED','6':'BUCK_SW'},
    'U2':{'1':'V3V3_SYS','2':'NC','3':'V3V3_SYS','4':'GND_STAR','5':'V5_SYS','6':'GND_STAR','7':'NC','8':'V5_SYS','EP':'GND_STAR'},
    'U3':{'5V/VIN':'V5_SYS','3V3_OUT':'V3V3_FUEL','GND':'GND_STAR','UART_RX_TBD':'GPS_TX','UART_TX_TBD':'GPS_RX','PPS_IN_TBD':'GPS_PPS','ADC1_IN_TBD':'FUEL_ADC'},
    'U4':{'1':'GND_STAR','2':'GPS_TX','3':'GPS_RX','4':'GPS_PPS','5':'NC','6':'NC','7':'V3V3_SYS','8':'V3V3_SYS','9':'NC','10':'GND_STAR','11':'GNSS_RF_50R','12':'GND_STAR','13':'NC','14':'NC','15':'NC','16':'NC','17':'NC','18':'NC'},
    'U5':{'1':'FUEL_BUF','2':'GND_STAR','3':'FUEL_DIV','4':'FUEL_BUF','5':'V3V3_FUEL'},
    'R1':{'1':'FUEL_GAUGE_RAW','2':'FUEL_TAP_LIMITED'},'R2':{'1':'FUEL_TAP_LIMITED','2':'FUEL_DIV'},
    'R3':{'1':'FUEL_DIV','2':'GND_STAR'},'R4':{'1':'FUEL_BUF','2':'FUEL_ADC'},
    'C1':{'1':'FUEL_DIV','2':'GND_STAR'},'C2':{'1':'FUEL_ADC','2':'GND_STAR'},'C3':{'1':'V3V3_FUEL','2':'GND_STAR'},
    'D2':{'A':'FUEL_DIV','K':'V3V3_FUEL'},'D3':{'A':'GND_STAR','K':'FUEL_DIV'},
    'C10':{'1':'VIN_PROTECTED','2':'GND_STAR'},'C11':{'1':'VIN_PROTECTED','2':'GND_STAR'},
    'C12':{'1':'BUCK_CB','2':'BUCK_SW'},'L10':{'1':'BUCK_SW','2':'V5_SYS'},'C13':{'1':'V5_SYS','2':'GND_STAR'},
    'R10':{'1':'V5_SYS','2':'BUCK_FB'},'R11':{'1':'BUCK_FB','2':'GND_STAR'},
    'C20':{'1':'V5_SYS','2':'GND_STAR'},'C21':{'1':'V3V3_SYS','2':'GND_STAR'},'D20':{'A':'V3V3_SYS','K':'V5_SYS'},
    'C40':{'1':'V3V3_SYS','2':'GND_STAR'},'C41':{'1':'V3V3_SYS','2':'GND_STAR'},'C42':{'1':'V3V3_SYS','2':'GND_STAR'},
    'R20':{'1':'GPS_TX_GNSS_SIDE','2':'GPS_TX_ESP_SIDE'},'R21':{'1':'GPS_RX_ESP_SIDE','2':'GPS_RX_GNSS_SIDE'},
    'J1':{'1':'BIKE_ACC_RAW','2':'GND_STAR'},'J2':{'1':'FUEL_TAP_LIMITED','2':'NC'},
    'J3_ALTERNATE':{'1':'V3V3_SYS','2':'GND_STAR','3':'GPS_TX','4':'GPS_RX','5':'GPS_PPS'},
    'J4':{'CENTER':'GNSS_RF_50R','SHELL':'GND_STAR'},
}
# The optional UART resistors split the functional GPS nets into physical nets.
connections['U4']['2']='GPS_TX_GNSS_SIDE';connections['U3']['UART_RX_TBD']='GPS_TX_ESP_SIDE'
connections['U4']['3']='GPS_RX_GNSS_SIDE';connections['U3']['UART_TX_TBD']='GPS_RX_ESP_SIDE'
connections['J3_ALTERNATE']['3']='GPS_TX_GNSS_SIDE';connections['J3_ALTERNATE']['4']='GPS_RX_GNSS_SIDE'
values={'U1':'LMR51610XFQDBVRQ1','U2':'TLV76733QWDRBRQ1 proposed','U3':'ESP32-S3 SuperMini exact board TBD','U4':'MAX-M10S raw OR J3 breakout','U5':'TLV9001QDBVRQ1',
        'R1':'110 kOhm 1% off-board','R2':'110 kOhm 1%','R3':'47 kOhm 1%','R4':'1 kOhm','C1':'10 nF','C2':'100 nF','C3':'100 nF',
        'D2':'low leakage Schottky TBD','D3':'low leakage Schottky TBD','C10':'2.2 uF 100 V X7R','C11':'100 nF 100 V X7R','C12':'100 nF >=16 V X7R',
        'L10':'33 uH >=1.5 A RMS >=2.5 A Isat','C13':'22 uF 16 V X7R','R10':'118 kOhm','R11':'22.1 kOhm','C20':'1 uF 10 V X7R','C21':'2.2 uF 10 V X7R',
        'D20':'reverse bypass Schottky TBD','C40':'100 nF','C41':'100 nF','C42':'10 uF 10 V','R20':'47 Ohm optional','R21':'47 Ohm optional'}
with (SVGDIR/'component-pin-schedule.csv').open('w',encoding='utf-8',newline='') as f:
    writer=csv.writer(f);writer.writerow(['Reference','Part_or_value','Pin_or_function','Net'])
    for ref,pins in connections.items():
        for pin,netname in pins.items():writer.writerow([ref,values.get(ref,'Proposed connector / details TBD'),pin,netname])
md='''# Rideforge schematic - Rev A draft

Basis: `pcb.md` and `pcb-components.md`, read 6 October 2026. Source files were not modified.

## Drawing set

- `output/pdf/rideforge-schematic.pdf`: four A3 landscape sheets.
- `output/hardware/schematic/01-power.svg`: protected vehicle supply, full U1 buck reference circuit, proposed U2 GPS regulator.
- `output/hardware/schematic/02-controller-gnss.svg`: controller, raw MAX-M10S and alternative breakout connection.
- `output/hardware/schematic/03-fuel-input.svg`: removable T-harness and fuel divider/clamps/buffer/filter.
- `output/hardware/schematic/04-connection-schedule.svg`: connection schedule and review items.
- `output/hardware/schematic/component-pin-schedule.csv`: component-pin-to-net schedule for later schematic capture.

These are vector schematic review drawings, not a KiCad project, CAD-generated netlist, ERC report, PCB layout, or fabrication package.

To regenerate, install `reportlab`, `pypdfium2` and `pypdf` into your Python environment, then run `python docs/build_schematic.py`. QA renders go to `tmp/schematic-qa/`.

## Scope and deliberate choices

The baseline uses switched motorcycle power and no backup battery, as in the current component list. The SuperMini remains an assembled development board. Its actual header positions and exposed GPIOs are not invented.

U1 is the 400 kHz forced-PWM LMR51610XFQDBVRQ1. Manufacturer reference values are 33 uH, 118 kOhm / 22.1 kOhm feedback, 2.2 uF plus 100 nF input bypass, 22 uF output, and 100 nF bootstrap. The reference divider gives about 5.07 V. This 6-65 V reference example does not establish cranking or vehicle surge performance. The 1 A buck rating is shared across both downstream branches.

U2 is a **proposed addition**, TLV76733QWDRBRQ1, a fixed 3.3 V automotive LDO rated 1 A. Pins IN/EN receive V5_SYS, OUT/SNS join V3V3_SYS, both GND pins and exposed pad join ground. Pins 2/7 remain NC; grounding them is permitted by the manufacturer. Use 1 uF input and 2.2 uF nominal output with effective capacitance/ESR checked against the datasheet. D20 shows the manufacturer reverse-current bypass orientation (OUT anode, IN cathode), with its exact part/rating unresolved. The LDO rating is not a verified thermal load budget: approximately 0.17 W at 100 mA and 1.7 W at 1 A.

V3V3_SYS supplies GNSS. The SuperMini's V3V3_FUEL output supplies U5 and the fuel upper clamp. They share GND_STAR but their regulator outputs are never joined. Vehicle power must be disconnected for PC USB programming unless the exact board's power-path arrangement is verified. Separately powered UART pins also require sequencing/backfeed verification; 47 Ohm series resistors are not power-off isolation.

The raw MAX-M10S drawing is an option, not a claim that the owned GPS is a bare module. Use raw U4 or alternative breakout J3, never both. J3 numbering is a proposed carrier connector, not a breakout-header pinout. The raw module baseline uses a compatible passive antenna through a short controlled-impedance 50 Ohm RF connection; connector, RF ESD and matching footprints remain antenna/layout-dependent. An active antenna requires a selected bias-T/supply design. VIO_SEL is open for 3.3 V I/O. TIMEPULSE must not be pulled low at startup. Unused reset/backup/control pins remain open as documented.

## Fuel circuit

Only the verified sender signal branches inside the new removable adapter. Every original contact passes straight through by electrical identity, not by an assumed view or wire colour. R1 sits at that branch takeoff before the outgoing cable; it is one of the existing two 110 kOhm resistors. The PCB connector therefore carries FUEL_TAP_LIMITED, not the raw pre-R1 voltage.

R1 + R2 + R3 = 267 kOhm; divider ratio = 47/267 = 0.17602996. Nominal FUEL_DIV: 0.880 V at 5 V raw, 2.112 V at 12 V, 2.552 V at 14.5 V, 2.816 V at 16 V. Worst 1% resistor extremes at 16 V are about 2.770-2.863 V. Hardware RC filtering suppresses electrical noise; firmware still needs slosh averaging and real tank calibration.

The standard DBV TLV9001QDBVRQ1 pin map is 1 OUT, 2 V-, 3 IN+, 4 IN-, 5 V+. OUT and IN- share FUEL_BUF before R4. D2 anode is FUEL_DIV, cathode V3V3_FUEL. D3 anode is ground, cathode FUEL_DIV. The op-amp supply decoupling C3 is separate from ADC filter C2.

The upper Schottky and op-amp rail diodes can inject current into the unpowered controller rail. Their presence is not a completed power-off protection solution. Select low-leakage parts and resolve rail-current handling or isolation after the actual sender signal and controller supply behavior are measured. No original sender excitation, new pull-up, or second tank-ground wire is added.

## Still open before schematic release

1. Exact SuperMini board schematic, power input, USB path, GPIO/header map and footprints.
2. Bare versus breakout MAX-M10S, actual connector order and passive/active antenna.
3. Coordinated fuse, reverse-battery protection, TVS, LC/CMC filter and pulse/temperature ratings.
4. Fuel sender connector identity, ground reference, waveform/loading and clamp/power-off behavior.
5. LDO reverse current and ESP/GNSS startup/shutdown/USB I/O sequencing.
6. Connector families, enclosure, thermal limits and installed component/PCB dimensions.

No CAD ERC, DRC, circuit simulation or on-bike test was performed. The draft has been checked against manufacturer pin tables, numerical divider calculations, its component-pin schedule, and rendered pages.

## References

- [TI LMR51610-Q1 data sheet](https://www.ti.com/lit/ds/symlink/lmr51610-q1.pdf)
- [TI TLV767-Q1 data sheet](https://www.ti.com/lit/ds/symlink/tlv767-q1.pdf)
- [TI fixed 3.3 V part identification](https://www.ti.com/product/TLV767-Q1/part-details/TLV76733QWDRBRQ1)
- [TI TLV9001-Q1 data sheet](https://www.ti.com/lit/ds/symlink/tlv9001-q1.pdf)
- [u-blox MAX-M10S data sheet](https://content.u-blox.com/sites/default/files/MAX-M10S_DataSheet_UBX-20035208.pdf)
- [u-blox MAX-M10S integration manual](https://content.u-blox.com/sites/default/files/MAX-M10S_IntegrationManual_UBX-20053088.pdf)
'''
(ROOT/'docs'/'SCHEMATIC.md').write_text(md,encoding='utf-8')

# Sanity checks for draft connectivity and arithmetic; these do not replace CAD ERC.
assert connections['U5']['1']==connections['U5']['4']=='FUEL_BUF'
assert connections['U5']['5']=='V3V3_FUEL' and connections['U4']['8']=='V3V3_SYS'
assert connections['D2']=={'A':'FUEL_DIV','K':'V3V3_FUEL'}
assert connections['D3']=={'A':'GND_STAR','K':'FUEL_DIV'}
assert connections['C12']=={'1':'BUCK_CB','2':'BUCK_SW'}
assert math.isclose(16*47/267,2.8164794007490634)
assert len(connections['U4'])==18

sys.path.insert(0,str(ROOT/'tmp'/'schematic-runtime'))
import pypdfium2 as pdfium
from pypdf import PdfReader
reader=PdfReader(str(PDF)); assert len(reader.pages)==4
for i,page in enumerate(reader.pages):
    assert 'RIDEFORGE' in page.extract_text()
doc=pdfium.PdfDocument(str(PDF))
for i in range(len(doc)):
    doc[i].render(scale=1.3).to_pil().save(QADIR/f'sheet-{i+1}.png')
print(f'Created {PDF}\n4 SVG sheets + CSV schedule + docs/SCHEMATIC.md. Four PDF pages rendered; checks passed.')
