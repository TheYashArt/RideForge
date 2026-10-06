from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
W,H=1000,720
c=canvas.Canvas(str(OUT/'rideforge-hardware-wiring.pdf'),pagesize=(W,H))
c.setTitle('Rideforge - MAX-M10S breakout wiring - revision A')
def text(x,y,s,size=11,color='#203047'):
    c.setFillColor(HexColor(color)); c.setFont('Helvetica',size); c.drawString(x,H-y,s)
def line(x,y,x2,y2,color='#087f8c',dash=False):
    c.setStrokeColor(HexColor(color)); c.setLineWidth(1.7); c.setDash(5,3) if dash else c.setDash()
    c.line(x,H-y,x2,H-y2); c.setDash()
def box(x,y,w,h,title,rows=(),color='#087f8c'):
    c.setFillColor(HexColor('#f4f7fa'));c.setStrokeColor(HexColor(color));c.setLineWidth(1)
    c.roundRect(x,H-y-h,w,h,8,fill=1,stroke=1)
    text(x+14,y+25,title,13,color)
    for i,r in enumerate(rows):text(x+14,y+47+i*18,r,10)
def header(n,title):
    text(35,38,'RIDEFORGE / HARDWARE CONNECTIONS',22)
    text(35,62,title,12)
    text(35,695,f'Rev A | 24 Sep 2026 | Sheet {n}/2 | Interconnect drawing, not a PCB layout or validated vehicle schematic',10)
def note(y,title,rows):
    text(35,y,title,13,'#a14f08')
    for i,r in enumerate(rows):text(35,y+20+i*17,r,11)

header(1,'ESP32-S3 SuperMini + SmartElex MAX-M10S breakout: wire by printed labels, not physical header order')
box(55,100,290,325,'U1 / ESP32-S3 SuperMini',[
    'Existing project controller; 3.3 V GPIO logic.',
    'Confirm IO4 and IO5 on your board silkscreen.',
    'USB connector: 5 V power / programming.'
])
box(655,100,290,325,'U2 / SmartElex MAX-M10S',[
    'Breakout board in the supplied photograph.',
    'Use the header marked 3V3; never 5 V.',
    'SMA: connect compatible GNSS antenna.'
])
for y,left,right,net,col in [
    (225,'3V3','3V3','3.3 V supply *','#b43c3c'),
    (270,'GND','GND','Common ground','#48515e'),
    (315,'GPIO5 / UART RX','TX','GPS data: TX -> RX','#087f8c'),
    (360,'GPIO4 / UART TX','RX','Configuration: TX -> RX','#087f8c')]:
    text(75,y+4,left,12);text(675,y+4,right,12);line(345,y,655,y,col);text(400,y-9,net,10,col)
text(675,398,'PPS, EINT, RST, SDA, SCL: leave open.',10)
box(55,455,390,90,'Bench fuel simulator',[
    '10 kOhm linear potentiometer: ends -> 3V3 and GND.',
    'Wiper -> GPIO1. This matches the current firmware.'
])
box(560,455,385,90,'Android phone / Rideforge',[
    'BLE radio link; no wire to the phone.',
    'ESP advertises as Platina_Telematics.'
])
note(580,'Before powering this sheet',[
    '* Verify the SuperMini 3V3 regulator has headroom for the GPS board and antenna load.',
    'If it does not, use a separate regulated 3.3 V supply for U2; join grounds, not regulator outputs.',
    'Add 100 nF ceramic + 10 uF across U2 3V3/GND near its header. Keep UART wires short.',
    'GPIO4/5 are proposed assignments. Firmware currently has no GPS reader; wiring alone will not enable GPS.'
])
c.showPage()
header(2,'Vehicle power and fuel-gauge integration / 2023 Platina 110 analogue gauge')
box(35,95,210,100,'J1 / vehicle input',[
    '1: verified switched +12 V',
    '2: battery-negative ground',
    'Assumption: off with ignition.'
])
box(295,95,350,100,'P1 / protected automotive 5 V supply',[
    'Fused input; reverse-polarity + transient protection.',
    'Regulated 5 V, at least 1 A; documented bike use.',
    'Choose exact unit before committing PCB footprint.'
])
box(715,95,250,100,'ESP32 USB power input',[
    'P1 5 V -> USB VBUS',
    'P1 GND -> USB GND',
    'Use a correctly wired USB cable.'
])
line(245,145,295,145,'#b43c3c');line(645,145,715,145,'#b43c3c')
text(40,222,'Use an inline fuse near the power takeoff, sized to the converter instructions and wire capacity.',11)
text(40,241,'Unplug vehicle USB power before connecting a programming PC. Do not parallel two 5 V sources.',11)
text(40,260,'Do not use the fuel-gauge signal as the power source. A generic buck board alone is not transient protection.',11)

box(35,295,250,120,'Existing bike circuit',[
    'Original gauge <-> tank sender',
    'Keep the factory wiring intact.',
    'No wire colour assumed.',
    'No resistance range assumed.'
],color='#a14f08')
box(365,295,355,120,'A1 / fuel interface - NOT YET SPECIFIED',[
    'High-impedance sense of verified gauge signal.',
    'Input limiting, transient protection, buffer/filter.',
    'Output bounded to ESP32 ADC input range.',
    'Must prevent back-powering when ESP is off.'
],color='#a14f08')
box(795,295,170,120,'ESP32 input',[
    'A1 OUT -> GPIO1',
    'A1 GND -> GND',
    'Remove bench pot.'
],color='#a14f08')
line(285,352,365,352,'#a14f08',True);line(720,352,795,352,'#a14f08',True)
note(451,'Dashed fuel connections: DO NOT CONNECT until the interface is designed',[
    'Have the gauge signal identified and measured relative to battery negative with the original gauge connected.',
    'Record key-off / key-on / engine-running voltage and check whether the signal is pulsed (an oscilloscope may be needed).',
    'These measurements determine component values. Model year and an analogue needle do not establish the signal range.',
    'Fuel-to-litres calibration needs measured fill levels; the current firmware sends simulated fuel only.'
])
text(35,556,'Build status: sheet 1 is the bench interconnect. Vehicle power selection and A1 remain open engineering items.',11)
text(35,585,'References / use actual board labels; bare-module pad numbers do not apply to breakout headers:',10)
for y,label,url in [
    (605,'SmartElex MAX-M10S documentation','https://robu.in/wp-content/uploads/2024/10/SmartElex-u-blox-GNSS-MAX-M10S.pdf'),
    (623,'u-blox MAX-M10S manufacturer data sheet','https://content.u-blox.com/sites/default/files/MAX-M10S_DataSheet_UBX-20035208.pdf')]:
    text(35,y,label,10,'#087f8c');c.linkURL(url,(35,H-y-3,520,H-y+12),relative=0)
text(35,650,'PCB notes: keep buck converter away from GNSS/antenna; preserve ESP antenna clearance; use secure connectors.',10)
c.save()
doc=pdfium.PdfDocument(str(OUT/'rideforge-hardware-wiring.pdf'))
for i in range(len(doc)):
    doc[i].render(scale=1.4).to_pil().save(OUT/f'rideforge-hardware-wiring-{i+1}.png')
print(OUT/'rideforge-hardware-wiring.pdf')
