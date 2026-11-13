export const TAU = Math.PI * 2;
export const STEP = 1 / 60;
export const WORLD = { w: 1280, h: 960 };

export const PAL = {
  o:'#0a0518', d:'#150a2e', c:'#22e6ff', C:'#b8fbff', g:'#9dff3c', G:'#4d8f1e',
  w:'#d8d0f0', W:'#ffffff', m:'#ff2fb0', M:'#8f1a63', a:'#ffb020', A:'#8f5a10',
  r:'#ff4d4d', R:'#8f2020', v:'#a86bff', V:'#4f2a94', b:'#4d8cff', B:'#1e4f8f', s:'#6b6a8a'
};

export const DIFF = {
  easy:{n:'СПОКОЙНО',d:'урон x0.65',hp:.8,sp:.9,dmg:.65,budget:.85,base:130,mult:.8},
  normal:{n:'НОРМА',d:'честный баланс',hp:1,sp:1,dmg:1,budget:1,base:100,mult:1},
  hard:{n:'ХАРДКОР',d:'счёт x1.5',hp:1.3,sp:1.12,dmg:1.35,budget:1.25,base:80,mult:1.5}
};

export const UPS = [
  {k:'rate',n:'УСКОРИТЕЛЬ',d:'+18% темп огня',cap:5,col:'#22e6ff'},
  {k:'cal',n:'КАЛИБР',d:'+25% урон пули',cap:5,col:'#ffb020'},
  {k:'fan',n:'ВЕЕР',d:'+1 пуля в залпе',cap:3,col:'#9dff3c'},
  {k:'pierce',n:'ПРОБОЙ',d:'пуля шьёт +1 врага',cap:2,col:'#ff2fb0'},
  {k:'speed',n:'ПРИВОД',d:'+13% скорость хода',cap:4,col:'#4d8cff'},
  {k:'armor',n:'БРОНЯ',d:'+25 корпуса и лечение',cap:4,col:'#35f0a0'},
  {k:'dash',n:'РЫВОК',d:'-22% откат, таран сильнее',cap:3,col:'#22e6ff'},
  {k:'magnet',n:'МАГНИТ',d:'+70% радиус сбора ◆',cap:3,col:'#ff2fb0'},
  {k:'vamp',n:'ВАМПИР',d:'4% урона лечит корпус',cap:3,col:'#ff4d4d'},
  {k:'drone',n:'СПУТНИК',d:'+1 дрон стреляет сам',cap:2,col:'#9dff3c'},
  {k:'regen',n:'РЕГЕН',d:'чинит корпус вне боя',cap:3,col:'#a86bff'},
  {k:'shield',n:'ЩИТ',d:'+25 энергии щита, сам восстанавливается',cap:3,col:'#a86bff'},
  {k:'kir',n:'СКОРОСТРЕЛ КИРЮША',d:'+14% темп и +18% скорость пуль',cap:3,col:'#22e6ff'},
  {k:'rocket',n:'РАКЕТОМЁТ',d:'ракета раз в 5с, урон 300-500',cap:2,col:'#ffb020'}
];

export const ICON = {
  rate:['...ooo...','..occo...','.occo....','occccoo..','.ooccco..','...occo..','..occo...','..oco....','..oo.....'],
  cal:['....x....','....x....','..xxxxx..','.xx.w.xx.','xxxwwwxxx','.xx.w.xx.','..xxxxx..','....x....','....x....'],
  fan:['x...x...x','.x..x..x.','..x.x.x..','...xxx...','....x....','....x....','....x....','....x....','....x....'],
  pierce:['.........','..x...x..','..x...x..','xxxxxxxxx','..x...xxx','..x...x..','.........','.........','.........'],
  speed:['..x..x...','.xx..xx..','xxx..xxx.','.xx..xx..','..x..x...','.........','..x..x...','.xx..xx..','.........'],
  armor:['.xxxxxxx.','xwwwwwwwx','xwxxxxxwx','xwxxxxxwx','xwxxxxxwx','.xwxxxwx.','..xwxwx..','...xxx...','....x....'],
  dash:['.........','.x...x...','.xx..xx..','.xxx.xxx.','.xx..xx..','.x...x...','.........','........x','.........'],
  magnet:['.xx...xx.','xxx...xxx','x.x...x.x','x.x...x.x','x.xxxxx.x','.xxxxxxx.','..xxxxx..','.........','.........'],
  vamp:['....x....','...xxx...','..xxxxx..','.xxxxxxx.','xxxwwwxxx','xxxwwwxxx','.xxxxxxx.','..xxxxx..','...xxx...'],
  drone:['..xxxxx..','.x.....x.','x..www..x','x..www..x','x..www..x','.x.....x.','..xxxxx..','.........','.........'],
  regen:['.xx...xx.','xxxx.xxxx','xxxxxxxxx','xxxxxxxxx','.xxxxxxx.','..xxxxx..','...xxx...','....x....','.........'],
  shield:['..xxxxx..','.x.....x.','x..www..x','x..www..x','x..www..x','.x..w..x.','..x.w.x..','...xxx...','.........'],
  kir:['....xx...','...xx....','..xxxxx..','.xxxx....','...xx....','..xx.....','.xx......','xx.......','.........'],
  rocket:['....x....','...xxx...','...xwx...','...xwx...','..xxwxx..','..xwwwx..','.xx...xx.','.........','.........']
};

export const FONT = {
  '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],
  '3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],
  '6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],
  '9':['111','101','111','001','111'],'+':['000','010','111','010','000'],'-':['000','000','111','000','000'],
  'x':['000','101','010','101','000'],'!':['010','010','010','000','010']
};

export function clamp(v,a,b){return v<a?a:(v>b?b:v)}
export function rand(a,b){return a+Math.random()*(b-a)}
export function randi(a,b){return Math.floor(rand(a,b+1))}
export function pick(a){return a[(Math.random()*a.length)|0]}
export function hyp(x,y){return Math.sqrt(x*x+y*y)}
export function fmt(n){return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ')}
export function angDiff(a,b){let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d}
