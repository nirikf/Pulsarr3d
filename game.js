(function(){
'use strict';
var TAU=Math.PI*2,STEP=1/60,MAX_WAVE=30,EDGE=40;
var BOSS_DEPTHS=[5,10,14,18,22,26];
var D={hp:1.56,sp:1.12,dmg:1.62,budget:1.25,base:80,mult:1.5};
var BOSS_NAMES={guardian:'СТРАЖ',hive:'МАТКА УЛЬЯ',prism:'ПРИЗМА',hammer:'МОЛОТ',eye:'ОКО',phantom:'ФАНТОМ',twins:'ЭХО И ЭГИДА'};
var BOSS_POOL=['guardian','prism','hammer','eye','phantom','twins'];
var DREAD=['КТО ТЫ?','ПОЧЕМУ ТЫ ЗДЕСЬ','УБИРАЙСЯ.','УМРИ!','???'];
var CHEAT={god:false,dark:false};
var REVIVE_COST=100,SPLIT_ON=340,SPLIT_OFF=250,DK=1/3,MAX_MINES=18;
function clamp(v,a,b){return v<a?a:(v>b?b:v)}
function rand(a,b){return a+Math.random()*(b-a)}
function randi(a,b){return Math.floor(rand(a,b+1))}
function pick(a){return a[(Math.random()*a.length)|0]}
function hyp(x,y){return Math.sqrt(x*x+y*y)}
function fmt(n){return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ')}
function angDiff(a,b){var d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d}
function dodgeCd(w){if(w<=5)return 1e9;if(w<=10)return 10;if(w<=16)return 5;if(w<=23)return 2.5;return 1}
function dmgScale(){return (1+(G.wave-1)*0.085)*0.9}
function escale(e){return dmgScale()*(e&&e.boss?1.7:1)*(e&&e.ghost?.75:1)}
var $=function(s){return document.querySelector(s)};
function localPlayer(){return NET.mode==='guest'?P2:P}
function viewPlayer(){var p=localPlayer();if(p.hp>0)return p;for(var i=0;i<PL.length;i++)if(PL[i].hp>0)return PL[i];return p}
function isCoop(){return PL.length>1}
function isLocal(){return NET.mode==='local'&&PL.length>1}
function storeGet(k,d){try{var v=localStorage.getItem('ppix_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function storeSet(k,v){try{localStorage.setItem('ppix_'+k,JSON.stringify(v))}catch(e){}}
function metaDefault(){return{frag:0,bonusShards:0,perm:{hp:0,spd:0,dmg:0,rate:0,dash:0,shield:0,luck:0},unlocked:[],bp:[],invest:{},runs:0,bestDepth:0,ships:['std'],ship:'std'}}
function loadMeta(k){var m=storeGet(k,metaDefault());m.invest=m.invest||{};m.ships=m.ships||['std'];m.ship=m.ship||'std';m.frag=m.frag||0;m.bonusShards=m.bonusShards||0;
m.perm=m.perm||metaDefault().perm;m.unlocked=m.unlocked||[];m.bp=m.bp||[];return m}
var META=loadMeta('meta'),META2=loadMeta('meta2');
function saveMeta(){storeSet('meta',META);storeSet('meta2',META2)}
function seatMeta(s){return s===1?META2:META}
function metaOf(p){if(isLocal())return p.id?META2:META;return META}
function bankOf(p){return metaOf(p).frag}
function setBank(p,v){metaOf(p).frag=v;if(p)p.frags=v;saveMeta()}
function addBank(p,n){setBank(p,bankOf(p)+n)}
function wallet(seat){return seatMeta(seat===undefined?0:seat).frag}
var VOL=storeGet('vols',{master:1,music:.55,sfx:1,ui:1});
if(typeof VOL.sfx!=='number')VOL={master:1,music:.55,sfx:1,ui:1};
function saveVol(){storeSet('vols',VOL)}
var PERMS=[
{k:'hp',n:'КОРПУС+',d:'+15 базового HP',base:18,max:8},
{k:'spd',n:'ДВИГАТЕЛЬ+',d:'+4% скорость хода',base:15,max:6},
{k:'dmg',n:'КАЛИБР+',d:'+6% урон',base:18,max:8},
{k:'rate',n:'ТЕМП+',d:'+5% скорострельность',base:15,max:6},
{k:'dash',n:'РЫВОК+',d:'-6% откат рывка',base:15,max:5},
{k:'shield',n:'ЩИТ+',d:'+10 энергии щита',base:15,max:6},
{k:'luck',n:'УДАЧА+',d:'+10% шанс чертежей и фрагментов',base:20,max:5}
];
var BP_COST=30;
function permCost(mm,k){var p=null;for(var i=0;i<PERMS.length;i++)if(PERMS[i].k===k)p=PERMS[i];return Math.round(p.base*Math.pow(1.45,mm.perm[k]||0))}
var LOCKED=['vamp','kir','pierce','hyper','socio','healdrone','aegis','seeder','phase','tesla'];
var SHIP_LOCKED=['phantom','forge','reaper','chronos','legion','groza'];
var SHIPS=[
{id:'std',n:'МАРШАЛ',cost:0,d:'сбалансированный корабль · ровный темп огня'},
{id:'sniper',n:'СНАЙПЕР',cost:50,d:'темп в 3.5 раза ниже маршала · пуля в 7 раз быстрее · пробой 2 · +40% скорость'},
{id:'bomber',n:'БОМБАРДИР',cost:50,d:'самонаводящиеся ракеты 30 · броня 3 · мина после рывка'},
{id:'psy',n:'ТАКТИЛЬНЫЙ ПСИХОПАТ',cost:50,d:'дробовик · волна 1 · социофоб 3 · x2 скорость · рывок отражает пули'},
{id:'phantom',n:'ФАНТОМ',cost:100,d:'невидимость 1.2с после рывка · первый выстрел ×2 · +25% скорость · −20% урон · −10 корпус'},
{id:'forge',n:'КУЗНЕЦ',cost:140,d:'рывок ставит турель (3 шт, 14с) · +30 корпус · свой огонь вдвое медленнее'},
{id:'reaper',n:'ЖНЕЦ',cost:100,d:'коса 46 / 120° · кровотечение лечит тебя · +40 корпус · −15% скорость'},
{id:'chronos',n:'ХРОНОС',cost:140,d:'оружие = хроно-поле: враги ×0.4 на 2.5с, откат 12с · не берёт модули оружия'},
{id:'legion',n:'ЛЕГИОН',cost:100,d:'старт с 2 спутниками · дроны бьют на 100% и пробивают · −35% свой урон · −15 корпус'},
{id:'groza',n:'ГРОЗА',cost:100,d:'конус молний 70° / 95 единиц, 26 урона в секунду · шанс оглушения · +10% скорость'}
];
function shipPrice(id){for(var i=0;i<SHIPS.length;i++)if(SHIPS[i].id===id)return SHIPS[i].cost;return 50}
function shipNeedsBp(id){return SHIP_LOCKED.indexOf(id)>=0}
function shipStart(id){
if(id==='sniper')return{weapon:'beam',beam:1,pierce:2};
if(id==='bomber')return{weapon:'rocket',rocket:1,armor:3};
if(id==='psy')return{weapon:'wave',wave:1,socio:3};
if(id==='phantom')return{dash:1};
if(id==='forge')return{armor:1};
if(id==='reaper')return{armor:1};
if(id==='chronos')return{shield:1};
if(id==='legion')return{drone:2};
if(id==='groza')return{speed:1};
return{}}
var THEMES={
neon:{n:'НЕОН',css:{'--void':'#0a0518','--deep':'#150a2e','--panel':'#1d1040','--panel2':'#2a1856','--edge':'#4a2a8f','--edge2':'#7b4fd6','--cyan':'#22e6ff','--green':'#9dff3c','--mag':'#ff2fb0','--amber':'#ffb020','--red':'#ff4d4d','--violet':'#a86bff','--blue':'#4d8cff','--ink':'#f4ecff','--dim':'#9a8fc4'},pal:{c:'#22e6ff',C:'#b8fbff',g:'#9dff3c',G:'#4d8f1e',m:'#ff2fb0',M:'#8f1a63',a:'#ffb020',A:'#8f5a10',r:'#ff4d4d',R:'#8f2020',v:'#a86bff',V:'#4f2a94',b:'#4d8cff',B:'#1e4f8f'},floor:{base:'#0a0518',n1:'79,42,148',n2:'34,230,255',star:'216,208,240',grid:'168,107,255'},stars:['#4f2a94','#22e6ff','#6b6a8a','#a86bff'],bloom:'#22e6ff'},
synth:{n:'СИНТВЕЙВ',css:{'--void':'#12041f','--deep':'#200736','--panel':'#2b0a4a','--panel2':'#3d1166','--edge':'#7a1e8f','--edge2':'#ff6ec7','--cyan':'#4dc9ff','--green':'#7dff8a','--mag':'#ff6ec7','--amber':'#ff9e3d','--red':'#ff4d6d','--violet':'#b967ff','--blue':'#4dc9ff','--ink':'#ffe9fb','--dim':'#c79ad6'},pal:{c:'#4dc9ff',C:'#d8f4ff',g:'#7dff8a',G:'#2f8f4a',m:'#ff6ec7',M:'#8f2a6b',a:'#ff9e3d',A:'#8f5a20',r:'#ff4d6d',R:'#8f2038',v:'#b967ff',V:'#5a2a9f',b:'#4dc9ff',B:'#1e5f8f'},floor:{base:'#12041f',n1:'255,110,199',n2:'77,201,255',star:'255,233,251',grid:'255,110,199'},stars:['#7a1e8f','#ff6ec7','#8a6a9a','#b967ff'],bloom:'#ff6ec7'},
amber:{n:'АМБЕР',css:{'--void':'#0d0700','--deep':'#1a0f00','--panel':'#241500','--panel2':'#332000','--edge':'#6b4300','--edge2':'#c98a1e','--cyan':'#ffc24d','--green':'#ffd98a','--mag':'#ff9e3d','--amber':'#ffb020','--red':'#ff6b4d','--violet':'#e0a060','--blue':'#ffd98a','--ink':'#ffe9c4','--dim':'#c9a06a'},pal:{c:'#ffc24d',C:'#ffe9c4',g:'#ffd98a',G:'#8f6a20',m:'#ff9e3d',M:'#8f4a10',a:'#ffb020',A:'#8f5a10',r:'#ff6b4d',R:'#8f2a10',v:'#e0a060',V:'#6b4300',b:'#ffd98a',B:'#8f6a20'},floor:{base:'#0d0700',n1:'201,138,30',n2:'255,176,32',star:'255,233,196',grid:'201,138,30'},stars:['#6b4300','#c98a1e','#8a7a5a','#e0a060'],bloom:'#ffb020'},
bio:{n:'БИО-ОКЕАН',css:{'--void':'#02120f','--deep':'#04211c','--panel':'#063028','--panel2':'#0a4438','--edge':'#1e6b52','--edge2':'#35f0a0','--cyan':'#4dffd2','--green':'#9dff3c','--mag':'#ff7a9e','--amber':'#ffd76a','--red':'#ff5a6d','--violet':'#7ab8ff','--blue':'#4dffd2','--ink':'#e6fff6','--dim':'#8fc9b8'},pal:{c:'#4dffd2',C:'#d8fff2',g:'#9dff3c',G:'#4d8f1e',m:'#ff7a9e',M:'#8f2a4a',a:'#ffd76a',A:'#8f6a20',r:'#ff5a6d',R:'#8f2030',v:'#7ab8ff',V:'#2a5a8f',b:'#4dffd2',B:'#1e6b52'},floor:{base:'#02120f',n1:'53,240,160',n2:'122,184,255',star:'230,255,246',grid:'53,240,160'},stars:['#1e6b52','#4dffd2','#5a8a7a','#7ab8ff'],bloom:'#35f0a0'}
};
var themeKey=storeGet('theme','neon'),THEME=THEMES[themeKey]||THEMES.neon,bloomOn=storeGet('bloom',true);
var PAL={o:'#0a0518',d:'#150a2e',w:'#d8d0f0',W:'#ffffff',s:'#6b6a8a'};
function applyThemePal(){var p=THEME.pal;for(var k in p)PAL[k]=p[k];PAL.o=THEME.css['--void'];PAL.d=THEME.css['--deep']}
applyThemePal();
var UPS=[
{k:'rate',n:'УСКОРИТЕЛЬ',d:'+18% темп огня',cap:5,col:'#22e6ff'},
{k:'cal',n:'КАЛИБР',d:'+25% урон',cap:5,col:'#ffb020'},
{k:'fan',n:'ВЕЕР',d:'+1 пуля в залпе',cap:3,col:'#9dff3c'},
{k:'pierce',n:'ПРОБОЙ',d:'пуля шьёт +1 врага',cap:2,col:'#ff2fb0'},
{k:'speed',n:'ПРИВОД',d:'+13% скорость хода',cap:4,col:'#4d8cff'},
{k:'armor',n:'БРОНЯ',d:'+25 корпуса и лечение',cap:4,col:'#35f0a0'},
{k:'dash',n:'РЫВОК',d:'-30% откат · 4 ур. за 100◆ убирает откат',cap:4,col:'#22e6ff'},
{k:'magnet',n:'МАГНИТ',d:'+70% радиус сбора ◆',cap:3,col:'#ff2fb0'},
{k:'vamp',n:'ВАМПИР',d:'4% урона лечит корпус',cap:3,col:'#ff4d4d'},
{k:'drone',n:'СПУТНИК',d:'дрон бьёт сильно и часто',cap:3,col:'#9dff3c'},
{k:'regen',n:'РЕГЕН',d:'чинит корпус вне боя',cap:3,col:'#a86bff'},
{k:'shield',n:'ЩИТ',d:'+25 энергии щита, сам восстанавливается',cap:3,col:'#a86bff'},
{k:'kir',n:'СКОРОСТРЕЛ КИРЮША',d:'+14% темп и +18% скорость пуль',cap:3,col:'#22e6ff'},
{k:'aegis',n:'ЭГИДА',d:'обломки режут пули · на рывке разлетаются и таранят',cap:3,col:'#b8fbff'},
{k:'seeder',n:'МИННОЕ ПОЛЕ',d:'рывок сеет мины веером · 55/70/85 урона',cap:3,col:'#ffb020'},
{k:'phase',n:'ФАЗОВЫЙ СДВИГ',d:'рывок сквозь всё · фантом стреляет 1с',cap:2,col:'#a86bff'},
{k:'tesla',n:'ТЕСЛА-КАТУШКА',d:'аура 9/14/20 урона в сек, тонкие молнии и замедление',cap:3,col:'#22e6ff'},
{k:'scytheEdge',n:'КЛИНОК ЖАТВЫ',d:'личный модуль ЖНЕЦА: коса шире и дальше',cap:3,col:'#ff2fb0',ship:'reaper'},
{k:'phaseDrive',n:'ФАНТОМНЫЙ ПРИВОД',d:'личный модуль ФАНТОМА: дальше рывок, дольше невидимость, сильнее удар',cap:3,col:'#a86bff',ship:'phantom'},
{k:'swarmCore',n:'ЯДРО РОЯ',d:'личный модуль ЛЕГИОНА: +1 дрон за уровень, до 5',cap:3,col:'#9dff3c',ship:'legion'},
{k:'stormChain',n:'ЦЕПЬ ГРОЗЫ',d:'личный модуль ГРОЗЫ: шире конус, электризация и её передача',cap:3,col:'#22e6ff',ship:'groza'},
{k:'foundry',n:'ЛИТЕЙНЫЙ ЦЕХ',d:'личный модуль КУЗНЕЦА: +1 турель одновременно и дольше живут',cap:3,col:'#ffb020',ship:'forge'},
{k:'chronoCore',n:'ХРОНО-ЯДРО',d:'личный модуль ХРОНОСА: короче откат · 3 ур. замедляет всё поле',cap:3,col:'#4d8cff',ship:'chronos'},
{k:'rocket',n:'РАКЕТОМЁТ',d:'ракета · урон 50/100/150',cap:3,col:'#ffb020',weapon:true},
{k:'wave',n:'УДАРНАЯ ВОЛНА',d:'раз в 5с · радиус 100 · урон 45/70/115',cap:3,col:'#22e6ff',weapon:true},
{k:'beam',n:'ЛУЧ',d:'3с непрерывного урона · откат 7с',cap:3,col:'#ff2fb0',weapon:true},
{k:'healdrone',n:'ДРОН-ЦЕЛИТЕЛЬ',d:'слабое лечение, растёт с уровнем',cap:4,col:'#9dff3c'},
{k:'hydra',n:'ГИДРА',d:'ракета слабее, но +3 мини-ракеты по 30',cap:1,col:'#ffd76a',gold:true,req:'rocket'},
{k:'density',n:'ПЛОТНОСТЬ',d:'волна 90° спереди, урон x4, радиус 150',cap:1,col:'#ffd76a',gold:true,req:'wave'},
{k:'reflect',n:'ОТРАЖЕНИЕ',d:'луч отражается до 5 целей',cap:1,col:'#ffd76a',gold:true,req:'beam'},
{k:'hyper',n:'ГИПЕР ДРАЙВ',d:'зажми рывок 1.5с · таран 50/75/100',cap:3,col:'#ff2fb0'},
{k:'hyperGold',n:'ЦЕПНОЙ ТАРАН',d:'гипер драйв таранит 3 врагов подряд',cap:1,col:'#ffd76a',gold:true,req:'hyper',cost:100},
{k:'socio',n:'СОЦИОФОБ',d:'два лезвия · после рывка лазер',cap:3,col:'#a86bff'}
];
var ICON={rate:['...ooo...','..occo...','.occo....','occccoo..','.ooccco..','...occo..','..occo...','..oco....','..oo.....'],cal:['....x....','....x....','..xxxxx..','.xx.w.xx.','xxxwwwxxx','.xx.w.xx.','..xxxxx..','....x....','....x....'],fan:['x...x...x','.x..x..x.','..x.x.x..','...xxx...','....x....','....x....','....x....','....x....','....x....'],pierce:['.........','..x...x..','..x...x..','xxxxxxxxx','..x...xxx','..x...x..','.........','.........','.........'],speed:['..x..x...','.xx..xx..','xxx..xxx.','.xx..xx..','..x..x...','.........','..x..x...','.xx..xx..','.........'],armor:['.xxxxxxx.','xwwwwwwwx','xwxxxxxwx','xwxxxxxwx','xwxxxxxwx','.xwxxxwx.','..xwxwx..','...xxx...','....x....'],dash:['.........','.x...x...','.xx..xx..','.xxx.xxx.','.xx..xx..','.x...x...','.........','........x','.........'],magnet:['.xx...xx.','xxx...xxx','x.x...x.x','x.x...x.x','x.xxxxx.x','.xxxxxxx.','..xxxxx..','.........','.........'],vamp:['....x....','...xxx...','..xxxxx..','.xxxxxxx.','xxxwwwxxx','xxxwwwxxx','.xxxxxxx.','..xxxxx..','...xxx...'],drone:['..xxxxx..','.x.....x.','x..www..x','x..www..x','x..www..x','.x.....x.','..xxxxx..','.........','.........'],regen:['.xx...xx.','xxxx.xxxx','xxxxxxxxx','xxxxxxxxx','.xxxxxxx.','..xxxxx..','...xxx...','....x....','.........'],shield:['..xxxxx..','.x.....x.','x..www..x','x..www..x','x..www..x','.x..w..x.','..x.w.x..','...xxx...','.........'],kir:['....xx...','...xx....','..xxxxx..','.xxxx....','...xx....','..xx.....','.xx......','xx.......','.........'],aegis:['..x...x..','.xxx.xxx.','..x...x..','.........','...www...','..w...w..','...www...','.........','....x....'],seeder:['.........','..x.x.x..','.xxxxxxx.','..x.x.x..','.........','...www...','...w.w...','...www...','.........'],phase:['....x....','...xx....','..xxxx...','.xxxxxx..','..xxxx...','...xx....','....x....','..w...w..','.........'],tesla:['x...x...x','.x.x.x.x.','..xxxxx..','...www...','...w.w...','...www...','..xxxxx..','.x.x.x.x.','x...x...x'],chrono:['..xxxxx..','.x.....x.','x...w...x','x...w...x','x...ww..x','x.......x','x.......x','.x.....x.','..xxxxx..'],
scytheEdge:['......xxx','....xxxww','..xxxww..','.xxww....','xxw......','xw.......','w........','.........','.........'],
phaseDrive:['....x....','...xxx...','..xxxxx..','.xxxxxxx.','..x...x..','.w.....w.','w.......w','.........','....x....'],
swarmCore:['x..x..x..','.x.x.x...','..xxx....','.xwwwx...','..xwx....','.xwwwx...','..xxx....','.x.x.x...','x..x..x..'],
stormChain:['x...x....','.x.x..x..','..x..x...','.xxx.xxx.','..x...x..','.xxx.xxx.','..x..x...','.x.x..x..','x...x....'],
foundry:['..xxxxx..','.x.....x.','x.wwwww.x','x.w...w.x','x.w.w.w.x','x.w...w.x','x.wwwww.x','.x.....x.','..xxxxx..'],
chronoCore:['..xxxxx..','.x..w..x.','x..www..x','x.w.w.w.x','x..www..x','x...w...x','x.......x','.x.....x.','..xxxxx..'],
rocket:['....x....','...xxx...','...xwx...','...xwx...','..xxwxx..','..xwwwx..','.xx...xx.','.........','.........'],wave:['.........','..x...x..','.x.x.x.x.','x..x.x..x','x..x.x..x','.x.x.x.x.','..x...x..','.........','.........'],beam:['x........','xx.......','x.x......','x..x.....','x...x....','x....x...','x.....x..','x......xx','x........'],healdrone:['..xxxxx..','.x..w..x.','x..www..x','x..www..x','x..www..x','.x..w..x.','..xxxxx..','.........','.........'],hydra:['....x....','...xxx...','..xwxwx..','.xxwxwxx.','..xwxwx..','...xxx...','....x....','.........','.........'],density:['....x....','...xxx...','..xxxxx..','.xxxxxxx.','xxxxxxxxx','.xxxxxxx.','..xxxxx..','...xxx...','....x....'],reflect:['x...x...x','.x.x.x.x.','..x.x.x..','...xxx...','..x.x.x..','.x.x.x.x.','x...x...x','.........','.........'],hyper:['....x....','...xxx...','..xxwxx..','.xxxwxxx.','xxxxwxxxx','.xxxwxxx.','..xxwxx..','...xxx...','....x....'],hyperGold:['x...x...x','.x.x.x.x.','..xxxxx..','.xxwwwxx.','..xxxxx..','.x.x.x.x.','x...x...x','.........','.........'],socio:['..x...x..','.xxx.xxx.','..x...x..','.........','..x...x..','.xxx.xxx.','..x...x..','.........','.........']};
var FONT={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','111'],'+':['000','010','111','010','000'],'-':['000','000','111','000','000'],'x':['000','101','010','101','000'],'!':['010','010','010','000','010']};
var G={state:'title',t:0,dt:.016,wave:0,waveT:0,score:0,shards:0,frags:META.frag,kills:0,combo:0,comboT:0,mult:1,
enemies:[],bul:[],ebul:[],erock:[],rockets:[],beams:[],zones:[],shocks:[],mines:[],wells:[],turrets:[],phantoms:[],chronoFields:[],
parts:[],drops:[],floats:[],rings:[],ghost:[],beats:[],queue:[],
active:false,boss:null,shake:0,flash:0,flashCol:'#fff',slow:0,glitch:0,beat:0,beatT:0,musicMode:'title',zoom:1,splitOn:false,padSel:0,
twinsLink:false,
best:storeGet('best',{score:0,wave:0}),st:{shots:0,hits:0,time:0},
portal:null,portalCharge:0,map:null,curNode:0,mapCam:0,mapDrag:{active:false,startX:0,startCam:0,moved:false},mapSel:0,
travel:false,travelT:0,travelDone:false,menuOpened:false,postT:0,pendingNode:null,
lootMult:1,arena:{w:640,h:480},event:null,lastBossKind:null,lastKill:{x:320,y:240},bossPool:BOSS_POOL.slice(),darkUsed:false};
function makePlayer(id,col,light){return{id:id,col:col,light:light,ship:'std',x:0,y:0,vx:0,vy:0,r:5,hp:100,max:100,aim:0,fireT:0,dashT:0,dashCd:0,dx:1,dy:0,inv:0,hurtT:0,noHit:0,focus:false,shield:0,shieldT:0,weaponCd:0,beamT:0,beamChain:[],dT:[],lvl:{},shards:0,frags:0,dual:false,pickPhase:0,offer:[],ready:false,padSel:0,stun:0,trapped:0,hyperCd:0,dashHold:0,socioSpin:0,invis:0,invisShot:false,jammed:false,aegisA:0,aegisR:24,aegisOut:0,swingT:0,swingDir:1,lastSeen:{x:0,y:0},coneT:0,stats:null,input:{mx:0,my:0,aim:0,dash:false,weapon:false,focus:false,held:false}}}
var P=makePlayer(0,'#ffb020','#fff0cf'),P2=makePlayer(1,'#4d8cff','#b8d4ff'),PL=[P];
P.frags=META.frag;P2.frags=META2.frag;
var CAM={x:0,y:0},CAMS=[{x:0,y:0},{x:0,y:0}],VIEW={x:0,y:0,w:240,h:240},AR={x:0,y:0,w:640,h:480};
var W=240,H=240,SCALE=3,eid=0,bid=0;
function nextEid(){return ++eid}function nextBid(){return ++bid}
var keys={},mx=0,my=0,mouseT=-99,K2={dash:false,weapon:false};
var sticks={move:{id:null,ox:0,oy:0,dx:0,dy:0,m:0},aim:{id:null,ox:0,oy:0,dx:0,dy:0,m:0}};
var activePtr={},isTouch=(window.matchMedia&&window.matchMedia('(hover:none)').matches)||('ontouchstart' in window);
var LI={dash:false,weapon:false},dashHeld=false,touchDashHeld=false,mouseRightHeld=false;
function clearStick(id){['move','aim'].forEach(function(k){var s=sticks[k];if(s.id===id){s.id=null;s.m=0;s.dx=0;s.dy=0}})}
function resetSticks(){sticks.move.id=null;sticks.move.m=0;sticks.move.dx=0;sticks.move.dy=0;sticks.aim.id=null;sticks.aim.m=0;sticks.aim.dx=0;sticks.aim.dy=0;touchDashHeld=false}
function mkPad(){return{active:false,mx:0,my:0,aim:0,aimActive:false,dash:false,weapon:false,pause:false,dashHeld:false,up:false,down:false,left:false,right:false,ok:false,back:false,prev:{},ax:{}}}
var GP=mkPad(),GP2=mkPad();
function readPad(g,pad){
g.dash=false;g.weapon=false;g.pause=false;g.dashHeld=false;g.up=false;g.down=false;g.left=false;g.right=false;g.ok=false;g.back=false;
if(!pad){g.active=false;return}
g.active=true;
var e=[];for(var i=0;i<20;i++){var now=!!(pad.buttons[i]&&pad.buttons[i].pressed);e[i]=now&&!g.prev[i];g.prev[i]=now}
function dz(v){return Math.abs(v)<.18?0:v}
g.mx=dz(pad.axes[0]||0);g.my=dz(pad.axes[1]||0);
var rx=dz(pad.axes[2]||0),ry=dz(pad.axes[3]||0);
if(Math.sqrt(rx*rx+ry*ry)>.25){g.aim=Math.atan2(ry,rx);g.aimActive=true}else g.aimActive=false;
g.dashHeld=!!(pad.buttons[6]&&pad.buttons[6].pressed)||!!(pad.buttons[0]&&pad.buttons[0].pressed);
if(e[6]||e[0])g.dash=true;
if(e[7]||e[2]||e[5])g.weapon=true;
if(e[9])g.pause=true;
if(e[12])g.up=true;if(e[13])g.down=true;if(e[14])g.left=true;if(e[15])g.right=true;
if(e[0])g.ok=true;if(e[1])g.back=true;
if(g.my<-.6&&!g.ax.y){g.up=true;g.ax.y=true}if(g.my>-.25&&g.my<.25)g.ax.y=false;
if(g.my>.6&&!g.ax.y2){g.down=true;g.ax.y2=true}if(g.my<.25&&g.my>-.25)g.ax.y2=false;
if(g.mx<-.6&&!g.ax.x){g.left=true;g.ax.x=true}if(g.mx>-.25&&g.mx<.25)g.ax.x=false;
if(g.mx>.6&&!g.ax.x2){g.right=true;g.ax.x2=true}if(g.mx<.25&&g.mx>-.25)g.ax.x2=false}
function pollGamepads(){var pads=navigator.getGamepads?navigator.getGamepads():[];var list=[];
for(var i=0;i<pads.length;i++)if(pads[i]&&pads[i].connected)list.push(pads[i]);
readPad(GP,list[0]);readPad(GP2,list[1])}
function padMove(g){var l=hyp(g.mx,g.my);if(l>1)return{x:g.mx/l,y:g.my/l};return{x:g.mx,y:g.my}}
var NET={mode:'solo',peer:null,conn:null,code:'',connected:false,lastSend:0,lastState:0,buf:[],pred:null,interp:70,pend:{dash:false,weapon:false}};
function mpStatus(t){var e=$('#mpStatus');if(e)e.textContent=t}
function makeCode(){var c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',s='';for(var i=0;i<6;i++)s+=c[randi(0,c.length-1)];return s}
function netSend(o){if(NET.conn&&NET.conn.open){try{NET.conn.send(o)}catch(e){}}}
function setupConn(c){NET.conn=c;
c.on('open',function(){NET.connected=true;mpStatus('Соединено. Игроков: 2');if(NET.mode==='host'){PL=[P,P2];netSend({t:'hello'});if(G.state==='play')netSend({t:'start'})}});
c.on('data',onNet);
c.on('close',function(){NET.connected=false;if(NET.mode==='host')PL=[P];NET.buf=[];NET.pred=null;mpStatus('Соединение потеряно')});
c.on('error',function(){mpStatus('Ошибка соединения')})}
function hostGame(){if(typeof Peer==='undefined'){mpStatus('WebRTC недоступен');return}
NET.mode='host';NET.code=makeCode();NET.peer=new Peer('ppx-'+NET.code);
NET.peer.on('open',function(){$('#mpCodeShow').style.display='block';$('#mpCodeShow').textContent=NET.code;mpStatus('Код: '+NET.code)});
NET.peer.on('connection',setupConn);NET.peer.on('error',function(e){mpStatus('Ошибка: '+e.type)});buildTitleCols()}
function joinGame(){if(typeof Peer==='undefined'){mpStatus('WebRTC недоступен');return}
var code=$('#mpCode').value.trim().toUpperCase();if(code.length<4){mpStatus('Введи код');return}
NET.mode='guest';NET.peer=new Peer();
NET.peer.on('open',function(){setupConn(NET.peer.connect('ppx-'+code,{reliable:true}));mpStatus('Подключаемся...')});
NET.peer.on('error',function(e){mpStatus('Ошибка: '+e.type)});buildTitleCols()}
function onJoinClick(){if(tryCheat())return;joinGame()}
function toggleLocal(){
if(NET.mode==='local'){NET.mode='solo';PL=[P];mpStatus('Одиночная игра. Профиль игрока 1.')}
else{NET.mode='local';PL=[P,P2];P2.frags=META2.frag;mpStatus('Локальный co-op: у каждого свой профиль, корабли и торговец.')}
var b=$('#bLocal');if(b){b.classList.toggle('on',NET.mode==='local');b.textContent=NET.mode==='local'?'CO-OP ВКЛЮЧЁН · ВЫКЛЮЧИТЬ':'2 ИГРОКА НА ОДНОМ ЭКРАНЕ'}
buildTitleCols();recalc()}
function onNet(d){
if(NET.mode==='host'){
if(d.t==='input'){P2.input.mx=d.mx;P2.input.my=d.my;P2.input.aim=d.aim;P2.input.focus=d.focus;P2.input.held=d.held;
if(d.dash)P2.input.dash=true;if(d.weapon)P2.input.weapon=true}
else if(d.t==='choose')choose(d.i,P2);
else if(d.t==='shop')shopAction(d.a,P2);
else if(d.t==='revive')revive(P,P2);
else if(d.t==='metabuy')metaBuy(d.kind,d.k,0);
}else{
if(d.t==='hello')mpStatus('Подключено как игрок 2');
else if(d.t==='start'){setState('play');NET.pred=null}
else if(d.t==='state'){NET.buf.push({t:performance.now(),d:d});if(NET.buf.length>24)NET.buf.shift();reconcile(d)}
else if(d.t==='up')setState('up');
else if(d.t==='upview')applyUpView(d.v);
else if(d.t==='metaok')buildShop();
else if(d.t==='over')setState('over');
else if(d.t==='win')setState('win')}}
function reconcile(d){var a=d.pl&&d.pl[1];if(!a)return;
if(!NET.pred){NET.pred={x:a.x,y:a.y,vx:0,vy:0,dashT:0,dashCd:a.dashCd||0};return}
var err=hyp(a.x-NET.pred.x,a.y-NET.pred.y);
if(err>60){NET.pred.x=a.x;NET.pred.y=a.y;NET.pred.vx=0;NET.pred.vy=0}
else{NET.pred.x+=(a.x-NET.pred.x)*.25;NET.pred.y+=(a.y-NET.pred.y)*.25}
NET.pred.dashCd=a.dashCd||0}
function predictGuest(dt){var p=P2,st=p.stats;if(!st||!NET.pred)return;var inp=p.input;
NET.pred.dashCd=Math.max(0,NET.pred.dashCd-dt);
if(inp.dash&&NET.pred.dashCd<=0&&p.stun<=0){var dx=inp.mx,dy=inp.my;if(!dx&&!dy){dx=Math.cos(inp.aim);dy=Math.sin(inp.aim)}var l=hyp(dx,dy)||1;NET.pred.dx=dx/l;NET.pred.dy=dy/l;NET.pred.dashT=.16;NET.pred.dashCd=st.dashCd;inp.dash=false}
if(NET.pred.dashT>0){NET.pred.dashT-=dt;var ds=280*(st.dashSpeedMul||1);NET.pred.vx=(NET.pred.dx||1)*ds;NET.pred.vy=(NET.pred.dy||0)*ds}
else{var sp=st.speed*(inp.focus?.55:1)*(p.stun>0?.2:1),k=1-Math.exp(-20*dt);NET.pred.vx+=(inp.mx*sp-NET.pred.vx)*k;NET.pred.vy+=(inp.my*sp-NET.pred.vy)*k}
NET.pred.x=clamp(NET.pred.x+NET.pred.vx*dt,AR.x+p.r,AR.x+AR.w-p.r);
NET.pred.y=clamp(NET.pred.y+NET.pred.vy*dt,AR.y+p.r,AR.y+AR.h-p.r);
p.x=NET.pred.x;p.y=NET.pred.y;p.aim=inp.aim}
function lerp(a,b,t){return a+(b-a)*t}
function interpArr(A,B,t,key){if(!A)return B||[];if(!B)return A||[];var m={};for(var i=0;i<A.length;i++)m[A[i][key]]=A[i];var o=[];for(var j=0;j<B.length;j++){var b=B[j],a=m[b[key]];if(a){var q=Object.assign({},b);q.x=lerp(a.x,b.x,t);q.y=lerp(a.y,b.y,t);o.push(q)}else o.push(b)}return o}
function guestWorld(now){if(!NET.buf.length)return;
var rt=now-NET.interp,a=NET.buf[0],b=NET.buf[NET.buf.length-1];
for(var i=0;i<NET.buf.length-1;i++)if(NET.buf[i].t<=rt&&NET.buf[i+1].t>=rt){a=NET.buf[i];b=NET.buf[i+1];break}
var span=b.t-a.t,t=span>0?clamp((rt-a.t)/span,0,1):1,da=a.d,db=b.d;
G.state=db.st;G.wave=db.wave;G.score=db.score;G.mult=db.mult;G.comboT=db.comboT;G.twinsLink=!!db.twinsLink;
G.chronoFields=db.chronoFields||[];
G.portal=db.portal;G.portalCharge=db.portalCharge||0;G.map=db.map;G.curNode=db.curNode;G.travel=db.travel;G.travelT=db.travelT;G.lootMult=db.lootMult;G.event=db.event;G.musicMode=db.musicMode||G.musicMode;
if(db.arena){G.arena=db.arena;AR.w=db.arena.w;AR.h=db.arena.h}
G.enemies=interpArr(da.en,db.en,t,'id').map(function(e){var o=Object.assign({},e);o.spr=resolveSpr(e);return o});
G.bul=interpArr(da.bul,db.bul,t,'id');G.ebul=interpArr(da.ebul,db.ebul,t,'id');
G.rockets=interpArr(da.rockets,db.rockets,t,'id');G.erock=db.erock||[];G.drops=interpArr(da.drops,db.drops,t,'id');
G.mines=db.mines||[];G.wells=db.wells||[];G.turrets=db.turrets||[];G.phantoms=db.phantoms||[];
G.beams=db.beams;G.zones=db.zones;G.shocks=db.shocks;G.rings=db.rings;G.parts=db.parts;G.floats=db.floats;G.ghost=db.ghost||[];
for(var i=0;i<2;i++){var pa=da.pl[i],pb=db.pl[i],o=i?P2:P;if(!pb)continue;
if(i===0){o.x=lerp(pa.x,pb.x,t);o.y=lerp(pa.y,pb.y,t)}else{o.x=pb.x;o.y=pb.y}
o.hp=pb.hp;o.max=pb.max;o.aim=pb.aim;o.shield=pb.shield;o.inv=pb.inv;o.beamT=pb.beamT;o.beamChain=pb.chain||[];
o.stats=pb.stats;o.lvl=pb.lvl||o.lvl;o.dashCd=pb.dashCd||0;o.socioSpin=pb.socioSpin||0;o.shards=pb.shards;o.frags=pb.frags;
o.ship=pb.ship||'std';o.ready=pb.ready;o.stun=pb.stun||0;o.invis=pb.invis||0;o.jammed=!!pb.jammed;
o.aegisA=pb.aegisA||0;o.aegisR=pb.aegisR||24;o.coneT=pb.coneT||0;o.swingT=pb.swingT||0;o.swingDir=pb.swingDir||1}
PL=db.pl.length>1?[P,P2]:[P];G.shards=localPlayer().shards;G.frags=localPlayer().frags;
if(db.boss){$('#bossbar').classList.add('on');$('#bossName').textContent=db.boss.name;$('#bossPhase').textContent='ФАЗА '+db.boss.phase;setBossPips(db.boss.phase);$('#bossFill').style.transform='scaleX('+clamp(db.boss.fr,0,1)+')'}else $('#bossbar').classList.remove('on')}
function snapshot(){
function rp(p){return{x:Math.round(p.x),y:Math.round(p.y),hp:Math.round(p.hp),max:p.max,aim:+p.aim.toFixed(2),col:p.col,shield:Math.round(p.shield),inv:p.inv>0,beamT:p.beamT,chain:p.beamChain,dashCd:p.dashCd,socioSpin:p.socioSpin,stats:p.stats,lvl:p.lvl,shards:p.shards,frags:p.frags,ship:p.ship,ready:p.ready,stun:p.stun,invis:p.invis,jammed:p.jammed,aegisA:+p.aegisA.toFixed(2),aegisR:Math.round(p.aegisR),coneT:p.coneT,swingT:p.swingT,swingDir:p.swingDir}}
function re(e){return{id:e.id,x:Math.round(e.x),y:Math.round(e.y),r:e.r,type:e.type,ang:e.ang,aim:e.aim,face:e.face,tel:e.tel,col:e.col,hp:e.hp,max:e.max,boss:e.boss,ghost:e.ghost,bossKind:e.bossKind,ship:e.ship,shieldFl:e.shieldFl,beam:e.beam,mode:e.mode,ax:e.ax,ay:e.ay,ar:e.ar,slot:e.slot,guardId:e.guardId,fl:e.fl,shield:e.shield,open:e.open,elite:e.elite,invuln:e.invuln,sc:e.sc,stunT:e.stunT,bleedT:e.bleedT,electroT:e.electroT}}
return{t:'state',st:G.state,wave:G.wave,score:G.score,mult:G.mult,comboT:G.comboT,musicMode:G.musicMode,twinsLink:G.twinsLink,chronoFields:G.chronoFields,
portal:G.portal,portalCharge:G.portalCharge,map:G.map,curNode:G.curNode,travel:G.travel,travelT:G.travelT,lootMult:G.lootMult,event:G.event,arena:G.arena,
pl:PL.map(rp),en:G.enemies.map(re),mines:G.mines,wells:G.wells,turrets:G.turrets,phantoms:G.phantoms,erock:G.erock,
bul:G.bul.map(function(b){return{id:b.id,x:b.x,y:b.y,a:b.a,dr:b.dr,col:b.col}}),
ebul:G.ebul.map(function(b){return{id:b.id,x:b.x,y:b.y,spr:b.spr}}),
rockets:G.rockets.map(function(r){return{id:r.id,x:r.x,y:r.y,a:r.a,mini:r.mini}}),
drops:G.drops.map(function(d){return{id:d.id,x:d.x,y:d.y,type:d.type,l:d.l,sp:d.sp,bp:d.bp}}),
beams:G.beams,zones:G.zones,shocks:G.shocks,rings:G.rings,parts:G.parts.slice(0,120),floats:G.floats,ghost:G.ghost,
boss:G.boss?{name:G.boss.bossName,phase:G.boss.phase,fr:G.boss.hp/G.boss.max}:null}}
function resolveSpr(e){if(e.type==='dark')return (SPR.darkShips[e.ship||'std']||SPR.darkShips.std);if(e.boss)return SPR.bosses[e.bossKind]||SPR.boss;return SPR[e.type]||SPR.grunt}
function setBossPips(ph){var p=$('#bossPips').children;for(var i=0;i<p.length;i++)p[i].classList.toggle('on',i<ph)}
function mkC(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
function tint(src,col){var c=mkC(src.width,src.height),g=c.getContext('2d');g.drawImage(src,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,c.width,c.height);return c}
function spr(rows,map){var w=0;for(var i=0;i<rows.length;i++)w=Math.max(w,rows[i].length);var c=mkC(w,rows.length),g=c.getContext('2d'),m=map||PAL;for(var y=0;y<rows.length;y++)for(var x=0;x<rows[y].length;x++){var ch=rows[y][x];if(ch==='.'||ch===' ')continue;var col=m[ch];if(!col)continue;g.fillStyle=col;g.fillRect(x,y,1,1)}return{n:c,f:tint(c,'#fff'),w:w,h:rows.length}}
function mirror(half){var rows=half.slice();for(var i=half.length-2;i>=0;i--)rows.push(half[i]);return rows}
function shipHalf(id){
if(id==='sniper')return[
'ooo...ooo.................',
'occo.occo.................',
'oCCcocCo...oo.............',
'oocCcCooo.ocCo............',
'.oocCcccoocCooooooooooooo.',
'ooGccCccccCcccccccccccccco',
'oGGccccCCCCCCCCCCCCcooooo.'];
if(id==='bomber')return['.oo.............','ocCo............','ocCco...........','.ocCco..oo......','..ocCcoocCo.....','...ocCcocCco....','..oocCccCCwco...','GgocCcCWWWcco...'];
if(id==='psy')return['....oooo.....','..ooccccoo...','.ocCCWWCCco..','ocCWWWWWWCco.','ocCWWWWWWCco.','ocCWWWWWWCco.','GgcCWWWWWCco.'];
if(id==='phantom')return[
'.......oo...............',
'......ocCo..............',
'.....ocCCco..oo.........',
'....ocCCCco.ocCo........',
'..oocCCCCCcoocCCco......',
'.oGgccCCCCCcCCCCCwco....',
'oGGgocccCCCWWWWWWccco...'];
if(id==='forge')return[
'..oooo..................',
'..oCCo..................',
'..oCCoo.................',
'.ooCCcooo...............',
'.ocCCCcco.ooo...........',
'ocCCCCCcoocCCco.........',
'oGccCCCCCcCCCCwco.......',
'GGgocCCcCCWWWWWccco.....'];
if(id==='reaper')return[
'.....ooooo..............',
'...ooCCCCCo.............',
'..oCCCCCCCco............',
'.oCCCccccCCco...........',
'oCCCco..ocCCco..........',
'oCCco....ocCCco.........',
'oGcco..ooocCCCwco.......',
'GGgocccccCCWWWWWcco.....'];
if(id==='chronos')return[
'....oooooo..............',
'..ooCCCCCCoo............',
'.oCCoooooCCco...........',
'oCCoo...ooCCco..........',
'oCco.....ocCco..........',
'oGco..oo..oCCwco........',
'GGgocCooCoCWWWWccco.....'];
if(id==='legion')return[
'..ooo..ooo..............',
'..oCo..oCo..............',
'.ooCooooCoo.............',
'.oCCccccCCco............',
'ooCCCCCCCCCco...........',
'oGgcCooCooCCwco.........',
'GGgocCooCooCWWWWccco....'];
if(id==='groza')return[
'.........oo.............',
'........oCCo............',
'...oo...oCCo............',
'..oCCo..oCCo............',
'.ooCCooooCCco...........',
'oGcCCccccCCwco..........',
'GGgocCCCCCWWWWWccco.....'];
return['..oo............','..oao...........','.occo...........','.ocCco..oo......','ocCcco.ocCo.....','ocgCcCocCCwco...','GgocCcCwWWWWcCco']}
function shipSpriteFor(id,main,light){var m=Object.assign({},PAL);m.c=main;m.C=light;return spr(mirror(shipHalf(id)),m)}
function bossSpriteFor(kind){var s=31,c=mkC(s,s),g=c.getContext('2d'),cx=15,cy=15;
var pal={guardian:['#ff4d4d','#8f2020','#ff2fb0'],hive:['#9dff3c','#4d8f1e','#ff2fb0'],prism:['#22e6ff','#1e4f8f','#a86bff'],hammer:['#ffb020','#8f5a10','#ff4d4d'],eye:['#a86bff','#4f2a94','#ffffff'],phantom:['#ff2fb0','#8f1a63','#22e6ff'],twins:['#a86bff','#4f2a94','#22e6ff']}[kind]||['#ff4d4d','#8f2020','#ff2fb0'];
for(var y=0;y<s;y++)for(var x=0;x<s;x++){var dx=x-cx,dy=y-cy,m;
if(kind==='prism'||kind==='twins')m=Math.abs(dx)+Math.abs(dy);else if(kind==='hammer')m=Math.max(Math.abs(dx),Math.abs(dy));else if(kind==='phantom')m=Math.abs(dx)*.8+Math.max(0,dy)*.9;else if(kind==='hive')m=Math.sqrt(dx*dx+dy*dy)+Math.sin(Math.atan2(dy,dx)*6)*1.5;else m=Math.max(Math.abs(dx)*.88+Math.abs(dy)*.5,Math.abs(dy));
var d=Math.sqrt(dx*dx+dy*dy),col=null;if(m<14.5)col=PAL.o;if(m<13.5)col=pal[0];if(m<11)col=pal[1];if(m<9)col=PAL.d;if(m<7.5)col=pal[2];if(d<4)col='#fff';if(d<2)col=PAL.o;if(col){g.fillStyle=col;g.fillRect(x,y,1,1)}}
return{n:c,f:tint(c,'#fff'),w:s,h:s}}
function orb(col,lit){return spr(['.ooo.','oXXXo','oXWXo','oXXXo','.ooo.'],{o:PAL.o,X:col,W:lit||'#fff'})}
function iconCanvas(k,col,scale){var rows=ICON[k]||ICON.cal,c=mkC(9,9),g=c.getContext('2d');for(var y=0;y<9;y++)for(var x=0;x<rows[y].length;x++){var ch=rows[y][x];if(ch==='.')continue;g.fillStyle=ch==='o'?PAL.o:ch==='w'?'#fff':col;g.fillRect(x,y,1,1)}var out=mkC(9,9);out.getContext('2d').drawImage(c,0,0);out.style.width=(9*(scale||4))+'px';out.style.height=(9*(scale||4))+'px';return out}
var floorCanvas=null;
function makeFloor(w,h){var f=THEME.floor,c=mkC(w,h),g=c.getContext('2d');g.fillStyle=f.base;g.fillRect(0,0,w,h);
function neb(x,y,r,col,a){var gr=g.createRadialGradient(x,y,1,x,y,r);gr.addColorStop(0,'rgba('+col+','+a+')');gr.addColorStop(1,'rgba('+col+',0)');g.fillStyle=gr;g.fillRect(0,0,w,h)}
neb(w*.28,h*.42,w*.5,f.n1,.14);neb(w*.78,h*.2,w*.4,f.n2,.07);neb(w*.6,h*.85,w*.45,f.n1,.08);
for(var i=0;i<Math.round(w*h/1500);i++){g.fillStyle='rgba('+f.star+','+rand(.04,.2)+')';g.fillRect(randi(0,w-1),randi(0,h-1),1,1)}
for(i=0;i<26;i++){g.fillStyle='rgba('+f.grid+',.14)';g.fillRect(randi(0,w-2),randi(0,h-1),2,1)}return c}
var SPR={};
function buildSprites(){
SPR.ships={};SPR.darkShips={};
['std','sniper','bomber','psy','phantom','forge','reaper','chronos','legion','groza'].forEach(function(id){
SPR.ships[id]=[shipSpriteFor(id,'#ffb020','#fff0cf'),shipSpriteFor(id,'#4d8cff','#b8d4ff')];
SPR.darkShips[id]=shipSpriteFor(id,'#1a0f30','#5a3a9a')});
SPR.shipY=SPR.ships.std[0];SPR.shipB=SPR.ships.std[1];SPR.ship=SPR.shipY;SPR.dark=SPR.darkShips.std;
SPR.grunt=spr(['....oo.....','...ommo....','..omMMmo...','.omMwwMmo..','omMwWWwMmo.','omMwWWwMmoo','omMwWWwMmo.','.omMwwMmo..','..omMMmo...','...ommo....','....oo.....']);
SPR.mini=spr(['..oo...','.ovvo..','ovVWvo.','ovwVvoo','ovVVvo.','.ovvo..','..oo...']);
SPR.shooter=spr(['...ooooo.....','..oaaaaao....','.oaAAAAAao...','oaAAaaaAAao..','oaAawwwAaAao.','oaAawWWwaAaoo','oaAawWWwaAaoo','oaAawwwAaAao.','oaAAaaaAAao..','.oaAAAAAao...','..oaaaaao....','...ooooo.....']);
SPR.splitter=spr(['..ooooooooo..','.ovvvvvvvvvo.','ovVVVVVVVVVvo','ovVvvvvvvvVvo','ovVvVVVVVvVvo','ovVvVwwwVvVvo','ovVvVwWwVvVvo','ovVvVwwwVvVvo','ovVvVVVVVvVvo','ovVvvvvvvvVvo','ovVVVVVVVVVvo','.ovvvvvvvvvo.','..ooooooooo..']);
SPR.tank=spr(['......ooooooo........','....oorrrrrrroo......','..oorRRRRRRRRRroo....','.orRRRRRRRRRRRRRro...','orRRRrrrrrrrrrRRRro..','orRRrRRRRRRRRRrRRRro.','orRrRRRwwwwwRRRrRRro.','orRrRRwwWWWwwRRrRRroo','orRrRRwWWWWWwRRrRRrro','orRrRRwwWWWwwRRrRRroo','orRrRRRwwwwwRRRrRRro.','orRRrRRRRRRRRRrRRRro.','orRRRrrrrrrrrrRRRro..','.orRRRRRRRRRRRRRro...','..oorRRRRRRRRRroo....','....oorrrrrrroo......','......ooooooo........']);
SPR.shielder=spr(['....ooooo....','...obbbbbo...','..obBBBBBbo..','.obBBwwwBBbo.','obBBwWWWwBBbc','obBBwWWWwBBcc','obBBwWWWwBBcc','obBBwWWWwBBbc','.obBBwwwBBbo.','..obBBBBBbo..','...obbbbbo...','....ooooo....']);
SPR.sniper=spr(['......ooo......','.....ovvvo.....','....ovVVVvo....','...ovVwwwVvo...','..ovVwWWWwVvooo','.ovVwWWWWWvvoVV','..ovVwWWWwVvooo','...ovVwwwVvo...','....ovVVVvo....','.....ovvvo.....','......ooo......']);
SPR.medic=spr(['...ooooo...','..ogggggo..','.ogGGWGGgo.','ogGGWWWGGgo','ogGWWWWWGgo','ogGGWWWGGgo','.ogGGWGGgo.','..ogggggo..','...ooooo...']);
SPR.emitter=spr(['....ooooo....','...occccco...','..ocCCCCCco..','.ocCCwwwCCco.','ocCCwWWWwCCco','ocCCwWWWwCCco','ocCCwWWWwCCco','.ocCCwwwCCco.','..ocCCCCCco..','...occccco...','....ooooo....']);
SPR.clone=spr(['..oo...','.ommo..','omMWmo.','omwMmoo','omMMmo.','.ommo..','..oo...']);
SPR.ram=spr(['.....oo.....','....orro....','...orRRro...','..orRwwRro..','.orRwWWwRro.','orRwWWWWwRro','orRwWWWWwRro','.orRwWWwRro.','..orRwwRro..','...orRRro...','....orro....','.....oo.....']);
SPR.lgun=spr(['...ooooo...','..ovvvvvo..','.ovVWWWVvo.','ovVWrrrWVvo','ovVWrRrWVvo','ovVWrrrWVvo','.ovVWWWVvo.','..ovvvvvo..','...ooooo...']);
SPR.mirror=spr(['.....ooo.....','....obbbo....','...obBBBbo...','..obBWWWBbo..','.obBWCCWBbo..','obBWCWWCWBbo.','obBWCWWCWBbo.','obBWCWWCWBbo.','.obBWCCWBbo..','..obBWWWBbo..','...obBBBbo...','....obbbo....','.....ooo.....']);
SPR.brood=spr(['....ooooooo....','..oogggggggoo..','.ogGGGGGGGGGgo.','ogGGooGGGooGGgo','ogGowwoGowwoGgo','ogGowwoGowwoGgo','ogGGooGGGooGGgo','ogGGGGGGGGGGGgo','ogGGooGGGooGGgo','ogGowwoGowwoGgo','ogGowwoGowwoGgo','ogGGooGGGooGGgo','.ogGGGGGGGGGgo.','..oogggggggoo..','....ooooooo....']);
SPR.jammer=spr(['..o.......o..','..oo.....oo..','...oo...oo...','....oo.oo....','.....ooo.....','....occco....','...ocCCCco...','..ocCWWWCco..','..ocCWwWCco..','..ocCWWWCco..','...ocCCCco...','....occco....','.....ooo.....','....oo.oo....','...oo...oo...']);
SPR.aegis=spr(['....ooooooo....','..oobBBBBBoo...','.obBBBBBBBBBo..','obBBCCCCCBBBbo.','obBCCWWWCCBBbo.','obBCWWoWWCBBbo.','obBCWoWoWCBBbo.','obBCWWoWWCBBbo.','obBCCWWWCCBBbo.','obBBCCCCCBBBbo.','.obBBBBBBBBBo..','..oobBBBBBoo...','....ooooooo....']);
SPR.turret=spr(['...ooooo...','..oaaaaao..','.oaAAAAAao.','oaAAWWWAAao','oaAAWoWAAao','oaAAWWWAAao','.oaAAAAAao.','..oaaaaao..','...ooooo...','..oo...oo..','.oo.....oo.']);
SPR.shard=spr(['...o...','..omo..','.omMmo.','omwWMmo','.omMmo.','..omo..','...o...']);
SPR.med=spr(['..ooooo..','..ogggo..','..ogGgo..','ooggGggoo','ogGGWGGgo','ooggGggoo','..ogGgo..','..ogggo..','..ooooo..']);
SPR.frag=spr(['..ooo..','.obBbo.','obWWbo.','obBbbo.','..ooo..']);
SPR.bp=spr(['.ooooo.','owwwwo.','owwwwo.','owwwwo.','owwwwo.','.ooooo.']);
SPR.mine=spr(['.ooo.','oaAao','oAWAo','oaAao','.ooo.']);
SPR.drone=spr(['..oo...','.oggo..','ogGwgo.','ogwWGgo','ogGwgo.','.oggo..','..oo...']);
SPR.healdrone=spr(['..oo...','.oggo..','ogWwgo.','ogWWGgo','ogWwgo.','.oggo..','..oo...']);
SPR.bolt=spr(['.ccC','cCWW','cCWW','.ccC']);
SPR.rocket=spr(['..oo...','.oaao..','oaWWaoo','.oaao..','..oo...']);
SPR.miniRocket=spr(['.oo.','oaWo','.oo.']);
SPR.bosses={guardian:bossSpriteFor('guardian'),hive:bossSpriteFor('hive'),prism:bossSpriteFor('prism'),hammer:bossSpriteFor('hammer'),eye:bossSpriteFor('eye'),phantom:bossSpriteFor('phantom'),twins:bossSpriteFor('twins')};
SPR.boss=SPR.bosses.guardian;
SPR.orbM=orb(PAL.m,'#ffd6f2');SPR.orbA=orb(PAL.a,'#fff0cf');SPR.orbR=orb(PAL.r,'#ffd9d9');SPR.orbV=orb(PAL.v,'#e8dcff');SPR.orbC=orb(PAL.c,'#b8fbff')}
buildSprites();floorCanvas=makeFloor(640,480);
function playerSpr(p){var s=SPR.ships[p.ship]||SPR.ships.std;return s[p.id?1:0]}
function catVol(c){return c==='ui'?VOL.ui:c==='music'?VOL.music:VOL.sfx}
var A={ctx:null,master:null,on:storeGet('sound',true),last:{},nb:null,tokens:36,frameVoices:0,
init:function(){if(this.ctx)return;var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;try{this.ctx=new AC()}catch(e){return}this.master=this.ctx.createGain();this.master.gain.value=this.on?.9*VOL.master:0;this.master.connect(this.ctx.destination);var n=this.ctx.createBuffer(1,this.ctx.sampleRate*.5,this.ctx.sampleRate),d=n.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.nb=n},
resume:function(){if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume().catch(function(){})},
setOn:function(v){this.on=v;storeSet('sound',v);applyVolumes()},
gate:function(k,ms){var t=performance.now();if(this.last[k]&&t-this.last[k]<ms)return false;this.last[k]=t;return true},
allow:function(cat){if(cat==='music')return true;if(this.tokens<1||this.frameVoices>=4)return false;this.tokens-=1;this.frameVoices++;return true},
tone:function(f,dur,type,vol,slide,delay,cat){if(!this.ctx||!this.on)return;vol*=catVol(cat);if(vol<=0)return;
if(!this.allow(cat))return;
var t=this.ctx.currentTime+(delay||0),o=this.ctx.createOscillator(),g=this.ctx.createGain();
o.type=type||'square';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+dur);
g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+.02);
o.onended=function(){try{o.disconnect();g.disconnect()}catch(e){}}},
noise:function(dur,vol,freq,type,delay,cat){if(!this.ctx||!this.on||!this.nb)return null;vol*=catVol(cat);if(vol<=0)return null;
if(!this.allow(cat))return null;
var t=this.ctx.currentTime+(delay||0),s=this.ctx.createBufferSource();s.buffer=this.nb;s.loop=true;
var f=this.ctx.createBiquadFilter();f.type=type||'bandpass';f.frequency.setValueAtTime(freq,t);f.Q.value=1.2;
var g=this.ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+dur+.02);
s.onended=function(){try{s.disconnect();f.disconnect();g.disconnect()}catch(e){}};return f},
shoot:function(){if(this.gate('sh',70))this.tone(900,.05,'square',.06,.4)},
hit:function(){if(this.gate('ht',55))this.noise(.04,.08,2200)},
kill:function(){if(this.gate('kl',70)){this.tone(320,.13,'square',.09,.25);this.noise(.12,.09,900)}},
boom:function(){if(this.gate('bm',90)){this.tone(110,.35,'square',.2,.25);this.noise(.32,.18,400,'lowpass')}},
pick:function(n){this.tone(660*Math.pow(1.05,Math.min(n,14)),.07,'square',.07,1.5,0,'ui')},
heal:function(){this.tone(520,.1,'triangle',.12,1.4,0,'ui');this.tone(780,.12,'triangle',.1,1.4,.06,'ui')},
dash:function(){if(this.gate('ds',120)){var f=this.noise(.2,.13,700);if(f&&this.ctx)f.frequency.exponentialRampToValueAtTime(3000,this.ctx.currentTime+.19)}},
hurt:function(){this.tone(220,.24,'square',.18,.3);this.noise(.2,.14,300,'lowpass')},
stun:function(){this.tone(180,.5,'sawtooth',.16,.35);this.noise(.4,.12,500,'lowpass')},
zapStun:function(){if(this.gate('zs',260)){this.tone(1700,.09,'square',.07,.25);this.noise(.1,.06,4200,'highpass')}},
bleed:function(){if(this.gate('bl',420))this.tone(150,.14,'sawtooth',.06,.6)},
well:function(){this.tone(70,.9,'sine',.14,3.2);this.noise(.8,.09,320,'lowpass')},
jam:function(){if(this.gate('jm',1200))this.tone(58,.7,'sawtooth',.09,.8)},
chrono:function(){this.tone(160,1.1,'sine',.16,.35);this.tone(80,1.2,'triangle',.12,.5,.05)},
turret:function(){if(this.gate('tr',150)){this.tone(420,.12,'square',.08,1.6);this.tone(640,.1,'square',.05,1.3,.06)}},
turretShot:function(){if(this.gate('ts',170))this.tone(760,.04,'square',.035,.6)},
scythe:function(){if(this.gate('sc',240)){var f=this.noise(.22,.13,1500);if(f&&this.ctx)f.frequency.exponentialRampToValueAtTime(380,this.ctx.currentTime+.21)}},
zap:function(){if(this.gate('zp',190))this.tone(1300+Math.random()*600,.05,'sawtooth',.05,.35)},
reflect:function(){if(this.gate('rf',110))this.tone(1100,.08,'triangle',.08,.5)},
wave:function(){var s=this;[392,523,659].forEach(function(f,i){s.tone(f,.16,'square',.1,1,i*.08)})},
bossIn:function(){var s=this;[0,.24,.48].forEach(function(d){s.tone(160,.22,'sawtooth',.15,1.7,d);s.tone(240,.2,'square',.1,1.6,d+.11)})},
dread:function(){var s=this;[0,.18,.42,.7].forEach(function(d,i){s.tone(90-i*8,.5,'sawtooth',.16,.4,d);s.noise(.3,.14,260+i*90,'lowpass',d)})},
up:function(){var s=this;[523,659,784,1046].forEach(function(f,i){s.tone(f,.14,'square',.1,1,i*.05,'ui')})},
over:function(){var s=this;[392,311,262,196].forEach(function(f,i){s.tone(f,.4,'square',.13,.7,i*.15,'ui')})},
win:function(){var s=this;[523,659,784,1046,1318].forEach(function(f,i){s.tone(f,.28,'square',.12,1,i*.1,'ui')})},
rocket:function(){if(this.gate('rk',110)){this.tone(140,.3,'sawtooth',.15,3);this.noise(.25,.13,500,'lowpass')}},
explode:function(){if(this.gate('ex',110)){this.tone(70,.4,'square',.22,.3);this.noise(.4,.2,300,'lowpass')}},
shieldHit:function(){if(this.gate('sv',110))this.tone(1200,.06,'triangle',.09,.5)},
shock:function(){this.tone(90,.35,'sawtooth',.18,2.4);this.noise(.3,.15,600,'lowpass')},
beam:function(){this.tone(220,.4,'sawtooth',.13,2.2);this.tone(440,.3,'square',.07,1.5,.05)},
laser:function(){if(this.gate('lz',200))this.tone(1400,.12,'sawtooth',.07,.5)},
blink:function(){this.tone(800,.12,'square',.09,.3);this.noise(.1,.07,3000)},
portal:function(){this.tone(300,.4,'sine',.13,2);this.tone(600,.3,'sine',.08,1.5,.1)},
revive:function(){var s=this;[392,523,659,880].forEach(function(f,i){s.tone(f,.22,'triangle',.12,1.2,i*.07,'ui')})},
beat:function(i,heat,mode){if(!this.ctx||!this.on)return;mode=mode||'dynamic';
var bass,lead,hat,ld;
if(mode==='fast'){bass=[0,7,0,7,3,7,5,7];lead=[12,15,19,15,12,15,19,22];hat=2;ld=.05}
else if(mode==='tense'){bass=[0,0,3,0,6,0,3,1];lead=[12,11,12,15,11,12,11,8];hat=1;ld=.04}
else if(mode==='ambient'){bass=[0,0,0,0,5,0,0,0];lead=[12,0,15,0,19,0,15,0];hat=0;ld=.03}
else if(mode==='ominous'){bass=[0,1,0,1,6,1,0,1];lead=[12,13,12,18,13,12,13,6];hat=0;ld=.04}
else if(mode==='boss'){bass=[0,0,7,0,6,0,7,10];lead=[12,15,18,15,18,22,18,15];hat=2;ld=.05}
else if(mode==='title'){bass=[0,0,5,0,7,0,5,0];lead=[12,0,15,0,19,0,15,0];hat=0;ld=.03}
else{bass=[0,0,7,0,5,0,7,3];lead=[12,15,19,15,12,15,19,15];hat=1;ld=.045}
this.tone(55*Math.pow(2,bass[i%8]/12),.14,'square',.11,1,0,'music');
if(hat&&i%2===1)this.noise(.03,.02+heat*.02,8000,'highpass',0,'music');
if(hat===2)this.noise(.02,.02,9000,'highpass',.2,'music');
if(i%4===2)this.noise(.09,.05,1600,null,0,'music');
var ln=lead[i%8];if(ln)this.tone(220*Math.pow(2,ln/12),.1,'triangle',ld+heat*.03,1,0,'music')}};
function applyVolumes(){if(A.master&&A.ctx)A.master.gain.setTargetAtTime(A.on?.9*VOL.master:0,A.ctx.currentTime,.02);MUS.volume=VOL.music;saveVol()}
var MUS={dirs:['music/','audio/',''],
battleList:['Coin Beast.wav','Boss Raid Circuit.wav','Hex Crash Circuit.wav','Cartridge Rot (1).wav','Cartridge Rot.wav','Pixel Rush Circuit (1).wav','Pixel Rush Circuit.wav'],
volume:VOL.music,unlocked:false,cur:'none',active:false,ready:false,
menu:{el:null,name:'Pixel Porch.wav',pi:0,ok:false,fail:false,vol:0,want:false,lastPlay:0,lastTime:0,stall:0},
boss:{el:null,name:'Aggressive.wav',pi:0,ok:false,fail:false,vol:0,want:false,lastPlay:0,lastTime:0,stall:0},
battle:{el:null,name:null,pi:0,ok:false,fail:false,vol:0,idx:-1,want:false,lastPlay:0,lastTime:0,stall:0}};
function musSrc(c){return MUS.dirs[c.pi]+encodeURI(c.name)}
function musMakeChannel(c,loop){var el=new Audio();el.preload='auto';el.loop=loop;el.volume=0;el.setAttribute('playsinline','');
el.addEventListener('playing',function(){c.ok=true;c.fail=false;c.stall=0});
el.addEventListener('canplay',function(){c.ok=true});
el.addEventListener('pause',function(){if(c.want)c.lastPlay=0});
el.addEventListener('waiting',function(){c.stall=.9});
el.addEventListener('stalled',function(){c.stall=.9});
el.addEventListener('error',function(){c.ok=false;c.pi++;if(c.pi<MUS.dirs.length&&c.name){el.src=musSrc(c);el.load()}else c.fail=true});
c.el=el;return el}
function musPickBattle(){var b=MUS.battle,i=b.idx;
if(MUS.battleList.length>1){while(i===b.idx)i=randi(0,MUS.battleList.length-1)}else i=0;
b.idx=i;b.name=MUS.battleList[i];b.pi=0;b.ok=false;b.fail=false;b.lastTime=0;b.stall=0;
if(b.el){b.el.src=musSrc(b);b.el.currentTime=0;b.el.load()}}
function initMusic(){if(MUS.ready)return;MUS.ready=true;
musMakeChannel(MUS.menu,true);musMakeChannel(MUS.boss,true);
var bel=musMakeChannel(MUS.battle,false);
bel.addEventListener('ended',function(){musPickBattle();if(MUS.cur==='battle'&&MUS.unlocked){bel.lastPlay=0;var p=bel.play();if(p&&p.catch)p.catch(function(){})}});
MUS.menu.el.src=musSrc(MUS.menu);MUS.boss.el.src=musSrc(MUS.boss);musPickBattle();MUS.menu.el.load();MUS.boss.el.load()}
function musUnlock(){MUS.unlocked=true;initMusic()}
function musTarget(){if(!A.on||!MUS.unlocked)return 'none';
if(G.state==='play')return (G.boss&&G.boss.boss&&!G.boss.ghost)?'boss':'battle';return 'menu'}
function musUpdate(dt){if(!MUS.ready)return;var want=musTarget(),now=performance.now();
if(want!=='none'&&MUS[want].fail)want='none';MUS.cur=want;
['menu','boss','battle'].forEach(function(k){var c=MUS[k];if(!c.el)return;
var target=(k===want)?MUS.volume:0;
c.vol+=(target-c.vol)*Math.min(1,dt*3.2);
if(target<=0){c.want=false;
 if(c.vol<.004){c.vol=0;c.el.volume=0;if(!c.el.paused)c.el.pause()}
 else c.el.volume=clamp(c.vol,0,1);
 return}
c.want=true;c.el.volume=clamp(c.vol,0,1);
if(c.fail||!MUS.unlocked)return;
if(c.el.paused){if(now-c.lastPlay>420){c.lastPlay=now;var p=c.el.play();if(p&&p.catch)p.catch(function(){})}return}
if(c.el.currentTime!==c.lastTime){c.lastTime=c.el.currentTime;c.stall=0}
else{c.stall+=dt;
 if(c.stall>1.1){c.stall=0;c.lastPlay=0;
  try{var q=c.el.play();if(q&&q.catch)q.catch(function(){})}catch(e){}}}});
MUS.active=want!=='none'&&MUS[want].ok&&MUS[want].el&&!MUS[want].el.paused}
function musLabel(){if(!MUS.active)return '';var c=MUS[MUS.cur];if(!c||!c.name)return '';return c.name.replace(/\.wav$/i,'')}
function part(x,y,col,n,spd,life,size){for(var i=0;i<n;i++){if(G.parts.length>460)break;var a=rand(0,TAU),s=rand(spd*.3,spd);G.parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:rand(life*.5,life),m:life,c:col,s:size||1,dr:rand(2,5)})}}
function ring(x,y,r0,r1,col,life){if(G.rings.length>16)return;G.rings.push({x:x,y:y,r:r0,r1:r1,l:life,m:life,c:col})}
function float(x,y,txt,col,sc){if(G.floats.length>28)return;G.floats.push({x:x,y:y,t:String(txt),c:col,s:sc||1,l:.7,m:.7})}
function shake(v){G.shake=Math.min(9,G.shake+v)}
function flash(v,c){G.flash=Math.max(G.flash,v);G.flashCol=c||'#fff'}
function updateEffects(dt){var i;
for(i=G.beats.length-1;i>=0;i--){var b=G.beats[i];b.r+=70*dt;b.a-=dt*.5;if(b.a<=0)G.beats.splice(i,1)}
for(i=G.rings.length-1;i>=0;i--){var r=G.rings[i];r.l-=dt;r.r+=(r.r1-r.r)*Math.min(1,9*dt);if(r.l<=0)G.rings.splice(i,1)}
for(i=G.parts.length-1;i>=0;i--){var p=G.parts[i];p.l-=dt;var kk=Math.exp(-p.dr*dt);p.vx*=kk;p.vy*=kk;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.l<=0)G.parts.splice(i,1)}
for(i=G.floats.length-1;i>=0;i--){var f=G.floats[i];f.l-=dt;f.y-=16*dt;if(f.l<=0)G.floats.splice(i,1)}
for(i=G.ghost.length-1;i>=0;i--){G.ghost[i].l-=dt;if(G.ghost[i].l<=0)G.ghost.splice(i,1)}}
function drawSpr(ctx,s,x,y,ang,fl,alpha){if(!s)return;ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(ang);ctx.drawImage(fl?s.f:s.n,-Math.round(s.w/2),-Math.round(s.h/2));ctx.restore();ctx.globalAlpha=1}
function txt(ctx,s,x,y,col,px,align){ctx.save();ctx.fillStyle=col;ctx.font='700 '+(px||11)+'px Handjet, Tiny5, monospace';ctx.textAlign=align||'left';ctx.textBaseline='top';ctx.fillText(s,x,y);ctx.restore()}
function pxText(ctx,str,x,y,col,sc){sc=sc||1;ctx.fillStyle=col;var cx=Math.round(x);for(var i=0;i<str.length;i++){var gl=FONT[str[i]];if(!gl){cx+=4*sc;continue}for(var r=0;r<5;r++)for(var c=0;c<3;c++)if(gl[r][c]==='1')ctx.fillRect(cx+c*sc,Math.round(y)+r*sc,sc,sc);cx+=4*sc}}
function pxCircle(ctx,cx,cy,r,col,alpha){cx=Math.round(cx);cy=Math.round(cy);r=Math.round(r);if(r<1)return;ctx.globalAlpha=alpha==null?1:alpha;ctx.fillStyle=col;var x=r,y=0,err=1-r;while(x>=y){ctx.fillRect(cx+x,cy+y,1,1);ctx.fillRect(cx+y,cy+x,1,1);ctx.fillRect(cx-y,cy+x,1,1);ctx.fillRect(cx-x,cy+y,1,1);ctx.fillRect(cx-x,cy-y,1,1);ctx.fillRect(cx-y,cy-x,1,1);ctx.fillRect(cx+y,cy-x,1,1);ctx.fillRect(cx+x,cy-y,1,1);y++;if(err<0)err+=2*y+1;else{x--;err+=2*(y-x)+1}}ctx.globalAlpha=1}
function pxDisc(ctx,cx,cy,r,col,alpha){cx=Math.round(cx);cy=Math.round(cy);r=Math.round(r);ctx.globalAlpha=alpha==null?1:alpha;ctx.fillStyle=col;for(var y=-r;y<=r;y++){var w=Math.floor(Math.sqrt(Math.max(0,r*r-y*y)));ctx.fillRect(cx-w,cy+y,w*2+1,1)}ctx.globalAlpha=1}
function line(ctx,x1,y1,x2,y2,col,w,a){ctx.save();ctx.globalAlpha=a==null?1:a;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(Math.round(x1),Math.round(y1));ctx.lineTo(Math.round(x2),Math.round(y2));ctx.stroke();ctx.restore()}
function bolt(ctx,x1,y1,x2,y2,seed,amp){
var dx=x2-x1,dy=y2-y1,len=hyp(dx,dy);if(len<2)return;
var n=Math.max(3,Math.min(12,Math.round(len/11))),nx=-dy/len,ny=dx/len;
ctx.beginPath();ctx.moveTo(x1,y1);
for(var i=1;i<n;i++){var f=i/n;
var off=Math.sin(seed*3.1+i*2.7+visualT*26)*amp*(1-Math.abs(f-.5)*.9)+Math.sin(seed+i*5.3+visualT*17)*amp*.4;
ctx.lineTo(x1+dx*f+nx*off,y1+dy*f+ny*off)}
ctx.lineTo(x2,y2);ctx.stroke()}
function lightning(ctx,x1,y1,x2,y2,seed,col,wid){
var w=wid==null?1:wid;
ctx.save();
ctx.strokeStyle=col||'#22e6ff';ctx.globalAlpha=.22;ctx.lineWidth=6*w;bolt(ctx,x1,y1,x2,y2,seed,7*w);
ctx.globalAlpha=.55;ctx.lineWidth=3*w;bolt(ctx,x1,y1,x2,y2,seed,7*w);
ctx.strokeStyle='#ffffff';ctx.globalAlpha=.95;ctx.lineWidth=Math.max(.6,1.2*w);bolt(ctx,x1,y1,x2,y2,seed,7*w);
ctx.restore()}
function segHit(x1,y1,x2,y2,cx,cy,r){var dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;var t=l2?((cx-x1)*dx+(cy-y1)*dy)/l2:0;t=clamp(t,0,1);var px=x1+dx*t,py=y1+dy*t;return(px-cx)*(px-cx)+(py-cy)*(py-cy)<r*r}
function nearestPlayer(x,y){var b=null,bd=1e9;for(var i=0;i<PL.length;i++){var p=PL[i];if(p.hp<=0)continue;var d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);if(d<bd){bd=d;b=p}}return b||P}
function aiTarget(x,y){var b=null,bd=1e9,i,p;
for(i=0;i<PL.length;i++){p=PL[i];if(p.hp<=0||p.invis>0)continue;var d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);if(d<bd){bd=d;b=p}}
if(b)return b;var n=nearestPlayer(x,y);
return{x:n.lastSeen.x,y:n.lastSeen.y,hp:1,inv:0,shield:0,invis:1,stun:0,trapped:0,vx:0,vy:0,ghostTarget:true}}
function slowAt(x,y){for(var i=0;i<G.chronoFields.length;i++){var f=G.chronoFields[i];
if(f.g)return .4;if(hyp(x-f.x,y-f.y)<f.r)return .4}return 1}
function chronoAnyGlobal(){for(var i=0;i<G.chronoFields.length;i++)if(G.chronoFields[i].g)return true;return false}
function healPlayer(p,v){if(!p||p.hp<=0||p.ghostTarget)return;var b=p.hp;p.hp=Math.min(p.max,p.hp+v);if(p.hp-b>2)float(p.x,p.y-10,'+'+Math.round(p.hp-b),'#35f0a0',1)}
function playerDown(p){p.hp=0;p.trapped=0;p.invis=0;p.invisShot=false;part(p.x,p.y,p.col,30,120,.7,2);ring(p.x,p.y,4,40,p.col,.6);
if(PL.every(function(q){return q.hp<=0})){gameOver();return}
banner('ИГРОК '+(p.id+1)+' ПАЛ','НАПАРНИК МОЖЕТ ВОСКРЕСИТЬ В МЕНЮ МОДУЛЕЙ');A.over();shake(6)}
function hurtPlayer(p,d){if(!p||p.ghostTarget||p.inv>0||G.state!=='play')return;if(CHEAT.god)return;
if(p.shield>0){var ab=Math.min(p.shield,d);p.shield-=ab;d-=ab;p.shieldT=2.5;A.shieldHit();part(p.x,p.y,'#a86bff',8,80,.3,1);if(d<=0){p.inv=.35;return}}
p.hp-=d;p.inv=.7;p.hurtT=.35;p.noHit=0;p.shieldT=2.5;G.combo=0;G.mult=1;shake(5);flash(.3,'#ff4d4d');A.hurt();part(p.x,p.y,'#ff4d4d',12,90,.4,1);float(p.x,p.y-11,'-'+Math.round(d),'#ff4d4d',1);
if(p.hp<=0)playerDown(p)}
function stunPlayer(p,t){if(!p||p.ghostTarget||CHEAT.god)return;p.stun=Math.max(p.stun,t);A.stun();flash(.22,'#ffb020');shake(4);
float(p.x,p.y-16,'ОГЛУШЕН','#ffb020',1);part(p.x,p.y,'#ffb020',16,90,.5,1)}
function twinsShielded(e){return e.bossKind==='twins'&&G.twinsLink}
function damageEnemy(e,dmg,crit,hx,hy,dir,ignoreShield,owner){if(e.dead)return;
if(e.invuln){
 if(dir!==undefined){e.vx+=Math.cos(dir)*100;e.vy+=Math.sin(dir)*100}
 else if(hx!==undefined){var ka=Math.atan2(e.y-hy,e.x-hx);e.vx+=Math.cos(ka)*80;e.vy+=Math.sin(ka)*80}
 e.shieldFl=.15;A.shieldHit();if(hx!==undefined)part(hx,hy,'#b8fbff',4,60,.2,1);
 float(e.x,e.y-e.r-5,'ЩИТ','#b8fbff',1);return}
if(twinsShielded(e)){e.shieldFl=.15;A.shieldHit();float(e.x,e.y-e.r-5,'КУПОЛ','#b8fbff',1);
 if(hx!==undefined)part(hx,hy,'#b8fbff',4,60,.2,1);return}
if(e.type==='mirror'&&e.open<=0&&dir!==undefined&&!ignoreShield){
 var inc=dir+Math.PI,diff=Math.abs(angDiff(e.face,inc));
 if(diff>Math.PI-1.0){e.open=.8;e.shieldFl=.15;A.reflect();
  var ra=inc+rand(-.12,.12);
  G.ebul.push({id:nextBid(),x:e.x+Math.cos(ra)*(e.r+3),y:e.y+Math.sin(ra)*(e.r+3),vx:Math.cos(ra)*95,vy:Math.sin(ra)*95,r:2.5,dmg:7*escale(e),l:3,spr:'orbC'});
  float(e.x,e.y-e.r-5,'ОТБИТО','#b8fbff',1);part(hx||e.x,hy||e.y,'#b8fbff',5,70,.22,1);return}}
if(e.type==='shielder'&&!ignoreShield&&dir!==undefined&&Math.abs(angDiff(e.face,dir+Math.PI))<1.15){e.shieldFl=.15;part(hx,hy,'#22e6ff',4,60,.2,1);float(e.x,e.y-e.r-4,'БЛОК','#22e6ff',1);A.shieldHit();return}
if(e.bossKind==='prism'&&!ignoreShield&&dir!==undefined){var inc2=dir+Math.PI,bl=false;for(var k=0;k<3;k++)if(Math.abs(angDiff(e.shieldAng+k*TAU/3,inc2))<.5){bl=true;break}
if(bl){e.shieldFl=.15;part(hx,hy,'#22e6ff',5,70,.2,1);A.shieldHit();G.ebul.push({id:nextBid(),x:e.x+Math.cos(inc2)*18,y:e.y+Math.sin(inc2)*18,vx:Math.cos(inc2)*170,vy:Math.sin(inc2)*170,r:2.5,dmg:9*escale(e),l:3,spr:'orbC'});return}}
if(e.shield>0){var ab2=Math.min(e.shield,dmg);e.shield-=ab2;dmg-=ab2;if(e.type==='dark')e.shieldT=2.5;
 A.shieldHit();if(hx!==undefined)part(hx,hy,'#b8fbff',4,55,.2,1);if(dmg<=0)return}
e.hp-=dmg;e.fr=.1;e.fl=.1;G.st.hits++;if(hx!==undefined)part(hx,hy,crit?'#ffb020':'#fff',crit?6:3,crit?80:55,.25,1);
float(e.x+rand(-3,3),e.y-e.r-4,Math.round(dmg),crit?'#ffb020':'#f4ecff',crit?2:1);
var ow=owner||P;if(ow.stats&&ow.stats.vamp)healPlayer(ow,ow.stats.vamp*dmg);A.hit();if(e.hp<=0)killEnemy(e)}
function luckMult(p){return 1+.1*((p?metaOf(p):META).perm.luck||0)}
function lootX(){return isCoop()?2:1}
function dropFrag(x,y,n){n*=lootX();for(var i=0;i<n;i++)G.drops.push({id:nextBid(),x:x+rand(-8,8),y:y+rand(-8,8),vx:rand(-30,30),vy:rand(-30,30),type:'frag',l:25,sp:rand(0,TAU)})}
function dropBlueprint(x,y){
 var mm=META,pool=[];
 LOCKED.forEach(function(k){if(mm.unlocked.indexOf(k)<0&&mm.bp.indexOf(k)<0)pool.push(k)});
 SHIP_LOCKED.forEach(function(id){if(mm.ships.indexOf(id)<0&&mm.bp.indexOf('ship:'+id)<0)pool.push('ship:'+id)});
 if(!pool.length)return;
 var k=pick(pool);G.drops.push({id:nextBid(),x:x,y:y,vx:rand(-20,20),vy:rand(-20,20),type:'bp',bp:k,l:25,sp:rand(0,TAU)})}
function spawnWell(x,y){G.wells.push({id:nextBid(),x:x,y:y,r:48,core:12,life:rand(3,6),max:6,spin:rand(0,TAU)});A.well();ring(x,y,4,48,'#a86bff',.6)}
function killEnemy(e){if(e.dead||e.invuln)return;e.dead=true;G.kills++;G.lastKill={x:e.x,y:e.y};
G.combo=Math.min(20,G.combo+1);G.comboT=2.4;G.mult=1+Math.min(G.combo,15)*.1;addScore(e.pts*G.mult);
part(e.x,e.y,e.col,e.boss?60:14,e.boss?150:95,e.boss?.9:.45,e.boss?2:1);part(e.x,e.y,'#fff',e.boss?24:5,e.boss?120:70,.3,1);
ring(e.x,e.y,e.r*.5,e.boss?70:e.r*3,e.col,e.boss?.8:.35);A.kill();shake(e.boss?8:2);
if(e.type==='ram'&&Math.random()<.25)spawnWell(e.x,e.y);
if(e.type==='lgun'){ring(e.x,e.y,4,34,'#ff4d4d',.45);part(e.x,e.y,'#ff4d4d',20,120,.5,2);A.explode();shake(4);
 for(var q=0;q<PL.length;q++){var pq=PL[q];if(pq.hp>0&&hyp(pq.x-e.x,pq.y-e.y)<34)hurtPlayer(pq,16*D.dmg*dmgScale())}}
if(e.type==='brood'){for(var bi=0;bi<6&&G.enemies.length<48;bi++){var ba=bi*TAU/6,mn=makeEnemy('mini',e.x+Math.cos(ba)*12,e.y+Math.sin(ba)*12);
 mn.vx=Math.cos(ba)*72;mn.vy=Math.sin(ba)*72;G.enemies.push(mn)}
 ring(e.x,e.y,4,34,PAL.g,.5);float(e.x,e.y-e.r-8,'РОЙ!','#9dff3c',1)}
if(e.elite===3){ring(e.x,e.y,4,32,'#ffb020',.45);part(e.x,e.y,'#ffb020',20,120,.5,2);A.explode();shake(4);
 for(var eq=0;eq<PL.length;eq++){var ep=PL[eq];if(ep.hp>0&&hyp(ep.x-e.x,ep.y-e.y)<32)hurtPlayer(ep,14*D.dmg*dmgScale())}}
if(e.type==='dark'){G.darkUsed=true;G.boss=null;$('#bossbar').classList.remove('on');dropFrag(e.x,e.y,50);dropBlueprint(e.x,e.y);flash(.4,'#a86bff');A.boom()}
if(e.boss){G.slow=1.1;flash(.45,e.col);G.boss=null;$('#bossbar').classList.remove('on');A.boom();
 if(e.bossKind==='twins'){for(var ti=0;ti<G.enemies.length;ti++){var ag=G.enemies[ti];
  if(ag.type==='aegis'){ag.dead=true;part(ag.x,ag.y,'#b8fbff',30,130,.7,2);ring(ag.x,ag.y,4,40,'#b8fbff',.6)}}G.twinsLink=false}
 G.drops.push({id:nextBid(),x:e.x,y:e.y,vx:0,vy:0,type:'hp',l:20,sp:0});
 dropFrag(e.x,e.y,Math.round(rand(8,14)*G.lootMult));dropBlueprint(e.x,e.y);
 if(!e.ghost&&e.bossKind!=='hive')G.lastBossKind=e.bossKind}
else if(e.type!=='dark'){if(Math.random()<.10*luckMult()*G.lootMult*lootX())dropFrag(e.x,e.y,1);
 if(Math.random()<(.02+(e.elite!=null?.08:0))*luckMult())dropBlueprint(e.x,e.y)}
if(e.type==='splitter')for(var i=0;i<2;i++){var a=rand(0,TAU),m=makeEnemy('mini',e.x+Math.cos(a)*7,e.y+Math.sin(a)*7);m.vx=Math.cos(a)*70;m.vy=Math.sin(a)*70;G.enemies.push(m)}
if(e.type==='tank'){ring(e.x,e.y,4,34,'#ff4d4d',.45);part(e.x,e.y,'#ffb020',18,120,.5,1);A.boom();shake(4);
 for(var j=0;j<G.enemies.length;j++){var o=G.enemies[j];if(!o.dead&&o!==e&&hyp(o.x-e.x,o.y-e.y)<32)damageEnemy(o,26,false)}
 var np=nearestPlayer(e.x,e.y);if(hyp(np.x-e.x,np.y-e.y)<26)hurtPlayer(np,12*D.dmg*dmgScale())}
var shn=(e.sh||0)*lootX()*(e.elite!=null?2:1);for(var k=0;k<shn&&G.drops.length<260;k++)spawnShard(e.x,e.y);
if(!e.boss&&e.type!=='mini'&&e.type!=='dark'&&e.type!=='ram'&&e.type!=='lgun'&&e.type!=='brood'&&Math.random()<(e.type==='tank'?.45:.05))spawnMedkit(e.x,e.y)}
function addScore(v){G.score+=Math.round(v*D.mult)}
function popChip(sel){var el=$(sel);if(!el)return;el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit')}
function edge(){var m=18,s=randi(0,3),x,y;
if(s===0){x=rand(CAM.x,CAM.x+W);y=CAM.y-m}else if(s===1){x=CAM.x+W+m;y=rand(CAM.y,CAM.y+H)}else if(s===2){x=rand(CAM.x,CAM.x+W);y=CAM.y+H+m}else{x=CAM.x-m;y=rand(CAM.y,CAM.y+H)}
return{x:clamp(x,AR.x+EDGE,AR.x+AR.w-EDGE),y:clamp(y,AR.y+EDGE,AR.y+AR.h-EDGE)}}
var ELITE_OK={grunt:1,shooter:1,splitter:1,tank:1,shielder:1,sniper:1,medic:1,emitter:1,ram:1,lgun:1,mirror:1,brood:1,jammer:1};
function makeEnemy(type,x,y){var sc=1+.09*(G.wave-1),ds=dmgScale();
var e={id:nextEid(),type:type,x:x,y:y,vx:0,vy:0,fl:0,fr:0,dead:false,t:rand(0,9),hitT:0,tel:0,ang:rand(0,TAU),st:'walk',cd:rand(1,3),lock:0,face:rand(0,TAU),shieldFl:0,beam:null,mode:'normal',group:null,slot:0,guardId:null,tx:x,ty:y,tface:0,ax:x,ay:y,ar:0,dodgeCd:dodgeCd(G.wave),dodgeT:0,dvx:0,dvy:0,open:0,shield:0,slowT:0,slowMul:1,elite:null,sc:1,
stunT:0,zapTick:rand(0,.3),bleedT:0,bleedDps:0,bleedOwner:0,electroT:0,electroDps:0,electroOwner:0,electroTick:0,electroLvl:0};
if(type==='grunt'){e.r=5;e.hp=20*sc*D.hp;e.sp=40*D.sp;e.dmg=8*D.dmg*ds;e.pts=10;e.sh=1;e.col=PAL.m}
else if(type==='mini'){e.r=3.5;e.hp=9*sc*D.hp;e.sp=62*D.sp;e.dmg=5*D.dmg*ds;e.pts=5;e.sh=Math.random()<.4?1:0;e.col=PAL.v}
else if(type==='shooter'){e.r=6;e.hp=26*sc*D.hp;e.sp=26*D.sp;e.dmg=7*D.dmg*ds;e.pts=18;e.sh=2;e.col=PAL.a;e.cd=rand(.7,1.8)}
else if(type==='splitter'){e.r=6.5;e.hp=34*sc*D.hp;e.sp=30*D.sp;e.dmg=10*D.dmg*ds;e.pts=22;e.sh=2;e.col=PAL.v}
else if(type==='tank'){e.r=9;e.hp=85*sc*D.hp;e.sp=20*D.sp;e.dmg=16*D.dmg*ds;e.pts=45;e.sh=4;e.col=PAL.r;e.cd=rand(2,3.6)}
else if(type==='shielder'){e.r=6;e.hp=40*sc*D.hp;e.sp=30*D.sp;e.dmg=9*D.dmg*ds;e.pts=26;e.sh=2;e.col=PAL.b;e.cd=rand(1,2)}
else if(type==='sniper'){e.r=5;e.hp=24*sc*D.hp;e.sp=34*D.sp;e.dmg=6;e.pts=30;e.sh=2;e.col=PAL.v;e.cd=3}
else if(type==='medic'){e.r=5;e.hp=70*sc*D.hp;e.sp=46*D.sp;e.dmg=0;e.pts=28;e.sh=2;e.col=PAL.g}
else if(type==='emitter'){e.r=7;e.hp=55*sc*D.hp;e.sp=22*D.sp;e.dmg=0;e.pts=36;e.sh=3;e.col=PAL.c;e.cd=rand(2,3.4)}
else if(type==='clone'){e.r=4;e.hp=1;e.sp=75*D.sp;e.dmg=10*D.dmg*ds;e.pts=2;e.sh=0;e.col=PAL.m}
else if(type==='ram'){e.r=5;e.hp=14*sc*D.hp;e.sp=74*D.sp;e.dmg=20;e.pts=24;e.sh=1;e.col='#ff4d4d';e.cd=rand(.6,1.6);e.st='approach'}
else if(type==='lgun'){e.r=6;e.hp=30*D.hp;e.sp=44*D.sp;e.dmg=0;e.pts=32;e.sh=2;e.col='#a86bff';e.st='approach';e.cd=0;e.open=0}
else if(type==='mirror'){e.r=6;e.hp=42*sc*D.hp;e.sp=22*D.sp;e.dmg=9*D.dmg*ds;e.pts=32;e.sh=2;e.col=PAL.b;e.open=0}
else if(type==='brood'){e.r=7;e.hp=58*sc*D.hp;e.sp=0;e.dmg=0;e.pts=36;e.sh=4;e.col=PAL.g;e.cd=rand(1.4,3)}
else if(type==='jammer'){e.r=6;e.hp=26*D.hp;e.sp=30*D.sp;e.dmg=0;e.pts=34;e.sh=4;e.col=PAL.c}
else if(type==='aegis'){e.r=8;e.hp=1;e.max=1;e.sp=26*D.sp;e.dmg=0;e.pts=0;e.sh=0;e.col='#b8fbff';e.invuln=true}
else if(type==='dark'){var lp=localPlayer();e.r=6;e.ship=lp.ship;e.lvl=Object.assign({},lp.lvl);
e.stats=computeStats(e.lvl,e.ship,metaOf(lp));
e.hp=900*(1+(G.wave-5)*.045)*D.hp;e.shield=e.stats.shieldMax;e.shieldT=0;e.sp=e.stats.speed;e.pts=900;e.sh=0;e.col='#a86bff';
e.fireT=0;e.weaponCd=1.5;e.dT=[];for(var d=0;d<e.stats.drones;d++)e.dT.push(rand(0,.6));
e.socioSpin=0;e.dashT=0;e.dashCd=1.2;e.ramCd=2.4;e.hyperCd=3;e.bossName='ТЁМНЫЙ ДВОЙНИК';e.phase=1;e.aim=0}
else if(type==='boss'){var kind=e.bossKind||'guardian';var base={guardian:380,prism:620,hammer:760,eye:860,phantom:980,twins:620,hive:1250}[kind]||500;
e.r=kind==='twins'?12:15;e.hp=base*(1+(G.wave-5)*.045)*D.hp;e.sp=(kind==='hive'?40:kind==='twins'?30:24)*D.sp;e.dmg=20*D.dmg*ds*1.7;e.pts=600+G.wave*20;e.sh=20;
e.col={guardian:'#ff4d4d',hive:'#9dff3c',prism:'#22e6ff',hammer:'#ffb020',eye:'#a86bff',phantom:'#ff2fb0',twins:'#a86bff'}[kind]||'#ff4d4d';
e.boss=true;e.bossName=BOSS_NAMES[kind]||'БОСС';e.atk='idle';e.atkT=1.4;e.phase=1;e.pending=null;e.shieldAng=0;e.chargeT=0;e.crisis=false;e.fleeT=0}
e.max=e.hp;e.spr=resolveSpr(e);return e}
function rollElite(e){
 if(!ELITE_OK[e.type])return;
 if(Math.random()>=.10)return;
 e.elite=randi(0,3);e.hp*=1.4;e.max=e.hp;e.r+=1;
 if(e.elite===0)e.shield=30;
 if(e.elite===1)e.sp*=1.5;
 e.pts=Math.round(e.pts*1.6)}
function makeBoss(kind,x,y,ghost){var e=makeEnemy('boss',x,y);e.bossKind=kind;e.spr=resolveSpr(e);
e.bossName=(ghost?'ПРИЗРАК ':'')+(BOSS_NAMES[kind]||'БОСС');
if(ghost){e.ghost=true;e.hp*=.75;e.max=e.hp;e.dmg*=.75}return e}
function spawnAt(type,x,y,extra){var e=makeEnemy(type,x,y);if(extra)for(var k in extra)e[k]=extra[k];rollElite(e);G.enemies.push(e);ring(x,y,2,12,e.col,.35);return e}
function spawn(type){var p=edge();return spawnAt(type,p.x,p.y)}
function fireBullet(x,y,angle,speed,dmg,pierce,isDrone,owner,life){G.bul.push({id:nextBid(),x:x,y:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:2,dmg:dmg,p:pierce||0,l:life||(isDrone?1.1:1.2),hit:[],a:angle,dr:isDrone||false,owner:owner||0,col:owner?'#4d8cff':'#ffb020'})}
function fireRocketEntity(x,y,angle,dmg,owner,mini,hydra){G.rockets.push({id:nextBid(),x:x,y:y,a:angle,vx:Math.cos(angle)*(mini?200:160),vy:Math.sin(angle)*(mini?200:160),r:mini?2:3,dmg:dmg,l:mini?1.6:2.4,owner:owner||0,mini:!!mini,hydra:!!hydra})}
function eRocket(x,y,angle,dmg){G.erock.push({id:nextBid(),x:x,y:y,a:angle,vx:Math.cos(angle)*170,vy:Math.sin(angle)*170,r:3,dmg:dmg,l:2.6})}
function eShoot(e,ang,spd,dmg,sprKey){if(G.ebul.length>260)return;G.ebul.push({id:nextBid(),x:e.x+Math.cos(ang)*(e.r+2),y:e.y+Math.sin(ang)*(e.r+2),vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,r:2.5,dmg:dmg*escale(e),l:4,spr:sprKey||'orbM'})}
function eBulletRaw(x,y,ang,spd,dmg,life){if(G.ebul.length>260)return;G.ebul.push({id:nextBid(),x:x,y:y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,r:2.5,dmg:dmg,l:life||2.2,spr:'orbV'})}
function spawnBeam(x,y,ang,rot,life,dmg,len,width,col,src){if(G.beams.length>44)return;G.beams.push({x:x,y:y,ang:ang,rot:rot,life:life,max:life,dmg:dmg,len:len,width:width,col:col||'#ff4d4d',tick:0,src:src||null})}
function spawnZone(x,y,r,tel,life,dmg,col){if(G.zones.length>34)return;G.zones.push({x:x,y:y,r:r,tel:tel,life:life,max:life,dmg:dmg,col:col||'#ff4d4d',done:false})}
function spawnShock(x,y,maxR,speed,dmg,col){if(G.shocks.length>14)return;G.shocks.push({x:x,y:y,r:4,maxR:maxR,speed:speed,dmg:dmg,col:col||'#ffb020',hit:false})}
function spawnMine(x,y,owner,dmg,rad){if(G.mines.length>=MAX_MINES)G.mines.shift();
G.mines.push({id:nextBid(),x:x,y:y,arm:.4,r:5,dmg:dmg||60,rad:rad||34,owner:owner||0,l:12})}
function spawnTurret(p){
var cap=p.stats.maxTurrets||3;
var mine=G.turrets.filter(function(t){return t.owner===p.id});
while(mine.length>=cap){var old=mine.shift();var ix=G.turrets.indexOf(old);if(ix>=0)G.turrets.splice(ix,1);
 part(old.x,old.y,'#8f5a10',8,60,.3,1)}
var life=p.stats.turretLife||14;
G.turrets.push({id:nextBid(),x:p.x,y:p.y,l:life,max:life,ft:.25,owner:p.id,ang:p.aim});A.turret();ring(p.x,p.y,3,20,'#ffb020',.4)}
function spawnPhantom(p){G.phantoms.push({id:nextBid(),x:p.x,y:p.y,a:p.aim,l:p.stats.phLife,max:p.stats.phLife,ft:0,owner:p.id,mul:p.stats.phMul,ship:p.ship})}
function updateTurrets(dt){for(var i=G.turrets.length-1;i>=0;i--){var t=G.turrets[i];t.l-=dt;t.ft-=dt;
if(t.ft<=0){t.ft=.6;var e=nearestEnemy(t.x,t.y);
 if(e){var a=Math.atan2(e.y-t.y,e.x-t.x);t.ang=a;
  fireBullet(t.x+Math.cos(a)*6,t.y+Math.sin(a)*6,a,180,7,0,false,t.owner,1.3);A.turretShot()}}
if(t.l<=0){part(t.x,t.y,'#8f5a10',10,70,.35,1);G.turrets.splice(i,1)}}}
function updatePhantoms(dt){for(var i=G.phantoms.length-1;i>=0;i--){var f=G.phantoms[i];f.l-=dt;f.ft-=dt;
if(f.ft<=0){f.ft=.3;var e=nearestEnemy(f.x,f.y);
 if(e){var a=Math.atan2(e.y-f.y,e.x-f.x);f.a=a;var ow=PL[f.owner]||P;
  fireBullet(f.x,f.y,a,190,(ow.stats?ow.stats.dmg:10)*f.mul,0,false,f.owner,1.2)}}
if(f.l<=0){part(f.x,f.y,'#a86bff',8,60,.3,1);G.phantoms.splice(i,1)}}}
function updateChrono(dt){for(var i=G.chronoFields.length-1;i>=0;i--){var f=G.chronoFields[i];f.t-=dt;
var ow=PL[f.owner];if(ow&&ow.hp>0&&!f.g){f.x=ow.x;f.y=ow.y}
if(f.t<=0){ring(f.x,f.y,f.g?60:f.r,6,'#4d8cff',.4);G.chronoFields.splice(i,1)}}}
function updateMines(dt){for(var i=G.mines.length-1;i>=0;i--){var m=G.mines[i];m.l-=dt;m.arm-=dt;var hit=false;
if(m.arm<=0)for(var j=0;j<G.enemies.length;j++){var e=G.enemies[j];if(e.dead||e.invuln)continue;if(hyp(e.x-m.x,e.y-m.y)<e.r*(e.sc||1)+11){hit=true;break}}
if(hit||m.l<=0){if(hit){var rad=m.rad||34;ring(m.x,m.y,4,rad,'#ffb020',.45);part(m.x,m.y,'#ffb020',20,120,.5,2);A.explode();shake(4);
 for(var j2=0;j2<G.enemies.length;j2++){var e2=G.enemies[j2];if(e2.dead)continue;var d=hyp(e2.x-m.x,e2.y-m.y);if(d<rad)damageEnemy(e2,m.dmg*(1-d/rad*.5),true,e2.x,e2.y,undefined,true,PL[m.owner]||P)}}
 G.mines.splice(i,1)}}}
function updateWells(dt){for(var i=G.wells.length-1;i>=0;i--){var w=G.wells[i];w.life-=dt;w.spin+=dt*3.4;
for(var j=0;j<PL.length;j++){var p=PL[j];if(p.hp<=0)continue;var dx=w.x-p.x,dy=w.y-p.y,d=hyp(dx,dy)||1;
 if(d<w.r){var pull=(1-d/w.r)*900;p.vx+=dx/d*pull*dt;p.vy+=dy/d*pull*dt;
  if(d<w.core){p.trapped=w.id;p.x+=(w.x-p.x)*Math.min(1,10*dt);p.y+=(w.y-p.y)*Math.min(1,10*dt);p.vx*=.2;p.vy*=.2;
   if(Math.random()<.3)part(p.x,p.y,'#a86bff',1,40,.3,1)}}}
if(w.life<=0){for(j=0;j<PL.length;j++)if(PL[j].trapped===w.id)PL[j].trapped=0;
 ring(w.x,w.y,w.r,4,'#a86bff',.4);G.wells.splice(i,1)}}}
function updateBullets(dt){for(var i=G.bul.length-1;i>=0;i--){var bl=G.bul[i];bl.l-=dt;
var ox=bl.x,oy=bl.y;bl.x+=bl.vx*dt;bl.y+=bl.vy*dt;
var dead=bl.l<=0||bl.x<AR.x||bl.x>AR.x+AR.w||bl.y<AR.y||bl.y>AR.y+AR.h;
if(!dead)for(var j=0;j<G.enemies.length;j++){var e=G.enemies[j];if(e.dead||bl.hit.indexOf(e.id)>=0)continue;
 if(segHit(ox,oy,bl.x,bl.y,e.x,e.y,e.r*(e.sc||1)+bl.r)){
  bl.hit.push(e.id);damageEnemy(e,bl.dmg,false,bl.x,bl.y,bl.a,false,PL[bl.owner]||P);
  if(bl.p>0)bl.p--;else{dead=true;break}}}
if(dead){if(bl.l>0)part(bl.x,bl.y,bl.dr?'#9dff3c':bl.col,3,45,.18,1);G.bul.splice(i,1)}}}
function updateRockets(dt){for(var i=G.rockets.length-1;i>=0;i--){var r=G.rockets[i];r.l-=dt;var tgt=null,bd=280*280;
for(var q=0;q<G.enemies.length;q++){var e=G.enemies[q];if(e.dead)continue;var d2=(e.x-r.x)*(e.x-r.x)+(e.y-r.y)*(e.y-r.y);if(d2<bd){bd=d2;tgt=e}}
if(tgt){var want=Math.atan2(tgt.y-r.y,tgt.x-r.x);r.a+=clamp(angDiff(r.a,want),-3.4*dt,3.4*dt)}
r.vx=Math.cos(r.a)*(r.mini?200:160);r.vy=Math.sin(r.a)*(r.mini?200:160);r.x+=r.vx*dt;r.y+=r.vy*dt;part(r.x,r.y,r.mini?'#ffd76a':'#ffb020',1,30,.2,1);
var hitE=null;for(q=0;q<G.enemies.length;q++){e=G.enemies[q];if(e.dead)continue;if(hyp(e.x-r.x,e.y-r.y)<e.r*(e.sc||1)+r.r){hitE=e;break}}
var boom=r.l<=0||r.x<AR.x||r.x>AR.x+AR.w||r.y<AR.y||r.y>AR.y+AR.h||hitE;
if(boom){explodeRocket(r,hitE);G.rockets.splice(i,1)}}}
function explodeRocket(r,hitE){var x=r.x,y=r.y,dmg=r.dmg;ring(x,y,4,r.mini?22:50,'#ffb020',.5);part(x,y,'#ffb020',r.mini?10:26,r.mini?70:140,.6,2);shake(r.mini?2:6);flash(r.mini?.08:.2,'#ffb020');A.explode();
if(r.hydra&&!r.mini&&hitE)for(var i=0;i<3;i++){var a=r.a+(i-1)*.7;fireRocketEntity(x,y,a,30,r.owner,true,false)}
for(var j=0;j<G.enemies.length;j++){var e=G.enemies[j];if(e.dead)continue;var d=hyp(e.x-x,e.y-y),rad=r.mini?22:50;if(d<rad)damageEnemy(e,dmg*(1-d/rad*.5),true,e.x,e.y,undefined,true,PL[r.owner]||P)}}
function updateERockets(dt){for(var i=G.erock.length-1;i>=0;i--){var r=G.erock[i];var d0=dt*slowAt(r.x,r.y);r.l-=d0;
var tg=nearestPlayer(r.x,r.y);var want=Math.atan2(tg.y-r.y,tg.x-r.x);r.a+=clamp(angDiff(r.a,want),-2.6*d0,2.6*d0);
r.vx=Math.cos(r.a)*170;r.vy=Math.sin(r.a)*170;r.x+=r.vx*d0;r.y+=r.vy*d0;part(r.x,r.y,'#a86bff',1,30,.2,1);
var hit=null;for(var q=0;q<PL.length;q++){var p=PL[q];if(p.hp<=0)continue;if(hyp(p.x-r.x,p.y-r.y)<p.r+r.r+2){hit=p;break}}
var boom=r.l<=0||hit||r.x<AR.x||r.x>AR.x+AR.w||r.y<AR.y||r.y>AR.y+AR.h;
if(boom){ring(r.x,r.y,3,26,'#a86bff',.4);part(r.x,r.y,'#a86bff',14,100,.45,2);A.explode();shake(3);
 for(q=0;q<PL.length;q++){var p2=PL[q];if(p2.hp>0&&hyp(p2.x-r.x,p2.y-r.y)<26)hurtPlayer(p2,r.dmg)}
 G.erock.splice(i,1)}}}
function updateEnemyBullets(dt){for(var i=G.ebul.length-1;i>=0;i--){var eb=G.ebul[i];var d0=dt*slowAt(eb.x,eb.y);
eb.l-=d0;var ox=eb.x,oy=eb.y;eb.x+=eb.vx*d0;eb.y+=eb.vy*d0;
if(eb.l<=0||eb.x<AR.x-20||eb.x>AR.x+AR.w+20||eb.y<AR.y-20||eb.y>AR.y+AR.h+20){G.ebul.splice(i,1);continue}
var blocked=false;
for(var q=0;q<PL.length;q++){var pp=PL[q];if(pp.hp<=0||!pp.stats||!pp.stats.aegis)continue;
 for(var s=0;s<pp.stats.aegisN;s++){var aa=pp.aegisA+s*TAU/pp.stats.aegisN,ax=pp.x+Math.cos(aa)*pp.aegisR,ay=pp.y+Math.sin(aa)*pp.aegisR;
  if(hyp(eb.x-ax,eb.y-ay)<7){part(ax,ay,'#b8fbff',6,60,.25,1);ring(ax,ay,2,10,'#b8fbff',.22);A.shieldHit();blocked=true;break}}
 if(blocked)break}
if(blocked){G.ebul.splice(i,1);continue}
for(var j=0;j<PL.length;j++){var p=PL[j];if(p.hp<=0)continue;if(segHit(ox,oy,eb.x,eb.y,p.x,p.y,eb.r+p.r*.9)){hurtPlayer(p,eb.dmg);part(eb.x,eb.y,'#a86bff',7,70,.3,1);G.ebul.splice(i,1);break}}}}
function updateHazards(dt){var i,j,p;
for(i=G.beams.length-1;i>=0;i--){var b=G.beams[i];var d0=dt*slowAt(b.x,b.y);
if(b.src){if(b.src.dead){G.beams.splice(i,1);continue}b.x=b.src.x;b.y=b.src.y;
 var tg=aiTarget(b.x,b.y);var want=Math.atan2(tg.y-b.y,tg.x-b.x);b.ang+=clamp(angDiff(b.ang,want),-1.1*d0,1.1*d0)}
b.life-=d0;b.ang+=b.rot*d0;b.tick-=d0;var x2=b.x+Math.cos(b.ang)*b.len,y2=b.y+Math.sin(b.ang)*b.len;
if(b.tick<=0)for(j=0;j<PL.length;j++){p=PL[j];if(p.hp>0&&segHit(b.x,b.y,x2,y2,p.x,p.y,b.width+p.r*.7)){hurtPlayer(p,b.dmg);b.tick=.35;part(p.x,p.y,'#ff4d4d',5,60,.2,1);break}}
if(b.life<=0)G.beams.splice(i,1)}
for(i=G.zones.length-1;i>=0;i--){var z=G.zones[i];var dz=dt*slowAt(z.x,z.y);z.life-=dz;
if(!z.done){z.tel-=dz;if(z.tel<=0){z.done=true;ring(z.x,z.y,2,z.r,z.col,.4);part(z.x,z.y,z.col,16,110,.4,1);A.boom();for(j=0;j<PL.length;j++){p=PL[j];if(p.hp>0&&hyp(p.x-z.x,p.y-z.y)<z.r+p.r)hurtPlayer(p,z.dmg)}}}if(z.life<=0)G.zones.splice(i,1)}
for(i=G.shocks.length-1;i>=0;i--){var s=G.shocks[i];s.r+=s.speed*dt*slowAt(s.x,s.y);
if(!s.hit)for(j=0;j<PL.length;j++){p=PL[j];if(p.hp>0&&Math.abs(hyp(p.x-s.x,p.y-s.y)-s.r)<7){hurtPlayer(p,s.dmg);s.hit=true;break}}if(s.r>s.maxR)G.shocks.splice(i,1)}}
function spawnShard(x,y){if(G.drops.length>=260)return;var a=rand(0,TAU),s=rand(20,60);G.drops.push({id:nextBid(),x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,type:'shard',l:14,sp:rand(0,TAU)})}
function spawnMedkit(x,y){if(G.drops.length>=260)return;G.drops.push({id:nextBid(),x:x,y:y,vx:rand(-20,20),vy:rand(-20,20),type:'hp',l:14,sp:0})}
function updateDrops(dt){for(var i=G.drops.length-1;i>=0;i--){var dr=G.drops[i];dr.l-=dt;dr.sp+=dt*4;
var p=nearestPlayer(dr.x,dr.y),dx=p.x-dr.x,dy=p.y-dr.y,dist=hyp(dx,dy)||1;
var mg=(p.stats?p.stats.magnet:34)*(dr.type==='hp'?.7:1);
if(dist<mg){var pull=420*(1-dist/mg)+70;dr.vx+=dx/dist*pull*dt;dr.vy+=dy/dist*pull*dt}
var kd=Math.exp(-2.4*dt);dr.vx*=kd;dr.vy*=kd;dr.x+=dr.vx*dt;dr.y+=dr.vy*dt;
if(dist<p.r+5){
if(dr.type==='shard'){var add=Math.floor(G.lootMult)+(Math.random()<(G.lootMult%1)?1:0);p.shards+=add;addScore(6*G.mult);A.pick(G.combo);part(dr.x,dr.y,'#ff2fb0',4,55,.25,1);popChip('.chip.g')}
else if(dr.type==='frag'){addBank(p,1);A.pick(8);part(dr.x,dr.y,'#4d8cff',6,60,.3,1);popChip('.chip.f');float(dr.x,dr.y-8,'+1','#4d8cff',1)}
else if(dr.type==='bp'){var mm=metaOf(p);if(mm.bp.indexOf(dr.bp)<0){
  if(dr.bp.indexOf('ship:')===0){var sid=dr.bp.slice(5);if(mm.ships.indexOf(sid)<0)mm.bp.push(dr.bp)}
  else if(mm.unlocked.indexOf(dr.bp)<0)mm.bp.push(dr.bp);
  saveMeta()}
 A.up();part(dr.x,dr.y,'#ffd76a',12,80,.4,1);
 float(dr.x,dr.y-10,dr.bp.indexOf('ship:')===0?'ЧЕРТЁЖ КОРАБЛЯ':'ЧЕРТЁЖ','#ffd76a',1)}
else{healPlayer(p,35);A.heal();part(dr.x,dr.y,'#35f0a0',9,70,.35,1);ring(dr.x,dr.y,2,16,'#35f0a0',.3)}
G.shards=localPlayer().shards;G.frags=localPlayer().frags;
G.drops.splice(i,1);continue}
if(dr.l<=0)G.drops.splice(i,1)}}
var DODGE={shooter:1,splitter:1,sniper:1,medic:1,emitter:1};
function edgeAvoid(e,dt){var f=140;if(e.x<AR.x+EDGE)e.vx+=f*dt*(1-(e.x-AR.x)/EDGE);if(e.x>AR.x+AR.w-EDGE)e.vx-=f*dt*(1-(AR.x+AR.w-e.x)/EDGE);if(e.y<AR.y+EDGE)e.vy+=f*dt*(1-(e.y-AR.y)/EDGE);if(e.y>AR.y+AR.h-EDGE)e.vy-=f*dt*(1-(AR.y+AR.h-e.y)/EDGE)}
function updateRam(e,dt,d,ux,uy){
if(e.st==='approach'){e.vx+=(ux*e.sp-e.vx)*Math.min(1,4*dt);e.vy+=(uy*e.sp-e.vy)*Math.min(1,4*dt);
e.cd-=dt;if(d<120&&e.cd<=0){e.st='tel';e.cd=.34;e.lock=Math.atan2(uy,ux);e.tel=1}}
else if(e.st==='tel'){e.cd-=dt;e.vx*=.82;e.vy*=.82;e.lock=Math.atan2(uy,ux);
if(e.cd<=0){e.st='charge';e.cd=.6;e.tel=0;A.tone(320,.16,'sawtooth',.1,2.2)}}
else{e.cd-=dt;e.vx=Math.cos(e.lock)*300;e.vy=Math.sin(e.lock)*300;part(e.x,e.y,'#ff4d4d',1,40,.25,1);
var p=nearestPlayer(e.x,e.y);
if(hyp(p.x-e.x,p.y-e.y)<e.r+p.r+2&&p.hp>0){hurtPlayer(p,20);stunPlayer(p,rand(2,4));killEnemy(e);return}
if(e.cd<=0){e.st='approach';e.cd=rand(.7,1.4)}}}
function updateLgun(e,dt,d,ux,uy){
if(e.st==='approach'){e.vx+=(ux*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(uy*e.sp-e.vy)*Math.min(1,3*dt);
if(d<130){e.st='open';e.cd=.85;e.open=0}}
else if(e.st==='open'){e.cd-=dt;e.open=clamp(1-e.cd/.85,0,1);e.vx*=.85;e.vy*=.85;e.tel=1;
if(e.cd<=0){e.st='fire';e.cd=3;e.tel=0;var p=aiTarget(e.x,e.y);
 spawnBeam(e.x,e.y,Math.atan2(p.y-e.y,p.x-e.x),0,3,20*D.dmg*dmgScale(),300,4,'#a86bff',e);A.beam()}}
else{e.cd-=dt;e.vx*=.9;e.vy*=.9;e.open=1;if(e.cd<=0)killEnemy(e)}}
function updateMirror(e,dt,d,ux,uy){
e.face+=angDiff(e.face,Math.atan2(uy,ux))*Math.min(1,2.2*dt);
if(e.open>0)e.open-=dt;
var w=d>90?e.sp:(d<58?-e.sp*.7:0);
e.vx+=(ux*w-e.vx)*Math.min(1,2*dt);e.vy+=(uy*w-e.vy)*Math.min(1,2*dt)}
function updateBrood(e,dt){e.vx*=.9;e.vy*=.9;e.cd-=dt;
if(e.cd<=0){e.cd=3;
 for(var i=0;i<2&&G.enemies.length<48;i++){var a=rand(0,TAU),m=makeEnemy('mini',e.x+Math.cos(a)*11,e.y+Math.sin(a)*11);
  m.vx=Math.cos(a)*55;m.vy=Math.sin(a)*55;G.enemies.push(m)}
 ring(e.x,e.y,3,17,PAL.g,.32);A.tone(200,.16,'sawtooth',.07,1.8)}}
function updateJammer(e,dt,d,ux,uy){
var w=d>96?e.sp:(d<72?-e.sp:0);
e.vx+=(ux*w-e.vx)*Math.min(1,2.4*dt);e.vy+=(uy*w-e.vy)*Math.min(1,2.4*dt)}
function updateAegisGuard(e,dt){
var echo=null;for(var i=0;i<G.enemies.length;i++){var q=G.enemies[i];if(q.bossKind==='twins'&&!q.dead){echo=q;break}}
if(!echo){e.dead=true;return}
var a=Math.atan2(echo.y-e.y,echo.x-e.x);
e.vx+=(Math.cos(a)*e.sp-e.vx)*Math.min(1,1.6*dt);e.vy+=(Math.sin(a)*e.sp-e.vy)*Math.min(1,1.6*dt);
e.face+=dt*1.2}
function updateTwins(e,dt,p,d){
var fr=e.hp/e.max;e.phase=fr>.66?1:(fr>.33?2:3);
$('#bossPhase').textContent='ФАЗА '+e.phase;setBossPips(e.phase);$('#bossFill').style.transform='scaleX('+clamp(fr,0,1)+')';
var ag=null;for(var i=0;i<G.enemies.length;i++){var q=G.enemies[i];if(q.type==='aegis'&&!q.dead){ag=q;break}}
G.twinsLink=!!(ag&&hyp(ag.x-e.x,ag.y-e.y)<120);
var ux=(p.x-e.x)/(d||1),uy=(p.y-e.y)/(d||1);
var w=d<150?-e.sp:(d>210?e.sp*.4:0);
e.vx+=(ux*w-uy*e.sp*.4-e.vx)*Math.min(1,1.8*dt);e.vy+=(uy*w+ux*e.sp*.4-e.vy)*Math.min(1,1.8*dt);
e.atkT-=dt;
if(e.atkT<=0){e.atkT=2.6;var n=8+e.phase*2;e.ang+=.3;
 for(var k=0;k<n;k++)eShoot(e,e.ang+k*TAU/n,74,8*D.dmg,'orbV');
 ring(e.x,e.y,e.r,e.r+16,e.col,.25);A.tone(260,.12,'square',.06,.6)}}
function updateDark(e,dt){var st=e.stats,p=aiTarget(e.x,e.y);
var dx=p.x-e.x,dy=p.y-e.y,dd=hyp(dx,dy)||1,ux=dx/dd,uy=dy/dd;
var fr=e.hp/e.max;e.phase=fr>.66?1:(fr>.33?2:3);
$('#bossPhase').textContent='ФАЗА '+e.phase;setBossPips(e.phase);$('#bossFill').style.transform='scaleX('+clamp(fr,0,1)+')';
e.aim=Math.atan2(dy,dx);
e.shieldT=Math.max(0,(e.shieldT||0)-dt);if(st.shieldMax&&e.shieldT<=0)e.shield=Math.min(st.shieldMax,e.shield+st.shieldRegen*dt);
if(st.regen&&e.hp<e.max)e.hp=Math.min(e.max,e.hp+st.regen*dt*.6);
if(st.healRate)e.hp=Math.min(e.max,e.hp+st.healRate*dt);
e.dashCd=Math.max(0,e.dashCd-dt);e.ramCd=Math.max(0,e.ramCd-dt);e.hyperCd=Math.max(0,e.hyperCd-dt);
var wantDash=(st.ship==='psy')?1.1:2.6;
if(e.dashT>0){e.dashT-=dt;e.vx=e.dx*300;e.vy=e.dy*300;e.socioSpin=1.1;
G.ghost.push({x:e.x,y:e.y,a:e.aim,l:.22,m:.22,col:'#5a3a9a',ship:e.ship,id:2,dark:true});
if(hyp(p.x-e.x,p.y-e.y)<e.r+8&&e.hitT<=0){hurtPlayer(p,st.dashDmg*.45*DK);e.hitT=.7}}
else{
if(e.dashCd<=0&&dd<(st.ship==='psy'?150:220)){var la=Math.atan2(dy,dx);e.dx=Math.cos(la);e.dy=Math.sin(la);e.dashT=.18;e.dashCd=st.dashCd*wantDash*.5+wantDash;A.dash()}
else if(e.ramCd<=0&&dd<200){var ra=Math.atan2(dy,dx);e.dx=Math.cos(ra);e.dy=Math.sin(ra);e.dashT=.3;e.ramCd=3.4;e.dashCd=Math.max(e.dashCd,1);A.dash();part(e.x,e.y,'#a86bff',12,90,.4,1)}
else{var tx,ty;if(dd<95){tx=-ux;ty=-uy}else if(dd>150){tx=ux;ty=uy}else{tx=-uy;ty=ux}
e.vx+=(tx*st.speed*.85-e.vx)*Math.min(1,4*dt);e.vy+=(ty*st.speed*.85-e.vy)*Math.min(1,4*dt)}}
if(st.hyper&&e.hyperCd<=0&&dd<240){e.hyperCd=st.hyperCd+2;var cnt=st.hyperGold?3:1,hx=e.x,hy=e.y;
for(var c=0;c<cnt;c++){var tg2=nearestPlayer(hx,hy);if(tg2.hp<=0)break;
 G.ghost.push({x:hx,y:hy,a:e.aim,l:.3,m:.3,col:'#5a3a9a',ship:e.ship,id:2,dark:true});
 hx=tg2.x;hy=tg2.y;e.x=clamp(hx,AR.x+e.r,AR.x+AR.w-e.r);e.y=clamp(hy,AR.y+e.r,AR.y+AR.h-e.r);
 hurtPlayer(tg2,st.hyperDmg*.4*DK);ring(e.x,e.y,4,28,'#a86bff',.4)}
e.inv=.3;A.blink();shake(4)}
e.fireT-=dt;
if(e.fireT<=0){e.fireT=1/st.rate;
if(st.fireMode==='rocket'){eRocket(e.x+Math.cos(e.aim)*8,e.y+Math.sin(e.aim)*8,e.aim,st.dmg*.5);A.rocket()}
else if(st.fireMode==='sniper'){eBulletRaw(e.x+Math.cos(e.aim)*10,e.y+Math.sin(e.aim)*10,e.aim,Math.min(st.bs,900),st.dmg*.5,1.6);A.tone(1200,.08,'square',.05,.4)}
else if(st.fireMode==='shotgun'){for(var s=0;s<st.count;s++){var so=(s-(st.count-1)/2)*st.spread;
 eBulletRaw(e.x+Math.cos(e.aim)*7,e.y+Math.sin(e.aim)*7,e.aim+so,st.bs*.8,st.dmg*.35,.4)}A.tone(500,.08,'square',.05,.4)}
else if(st.fireMode==='scythe'){if(dd<(st.scytheR||46)+8){hurtPlayer(p,(st.scytheDmg||22)*DK);ring(e.x,e.y,20,st.scytheR||46,'#a86bff',.2)}}
else if(st.fireMode==='cone'){if(dd<(st.coneR||95)&&Math.abs(angDiff(e.aim,Math.atan2(dy,dx)))<(st.coneHalf||.61)){
 hurtPlayer(p,(st.coneDps||26)*DK*dt*8);if(Math.random()<.3)part(p.x,p.y,'#a86bff',1,40,.2,1)}}
else{for(var i=0;i<st.count;i++){var off=(i-(st.count-1)/2)*st.spread*2;
 eBulletRaw(e.x+Math.cos(e.aim)*7,e.y+Math.sin(e.aim)*7,e.aim+off,st.bs,st.dmg*.45,1.3)}A.shoot()}}
e.weaponCd-=dt;
if(st.weapon&&st.weapon!=='chrono'&&e.weaponCd<=0){e.weaponCd=st.weaponCdMax;
if(st.weapon==='rocket'){eRocket(e.x,e.y,e.aim,st.weaponDmg*.45*DK);A.rocket()}
else if(st.weapon==='wave'){spawnShock(e.x,e.y,st.weaponRadius,150,st.weaponDmg*.35*DK,'#a86bff');A.shock()}
else if(st.weapon==='beam')spawnBeam(e.x,e.y,e.aim,0,2,st.weaponDmg*.35*DK,280,4,'#a86bff',e);
flash(.08,'#a86bff')}
for(i=0;i<st.drones;i++){e.dT[i]-=dt;if(e.dT[i]<=0){e.dT[i]=.5;
var a3=G.t*1.8+i*TAU/Math.max(1,st.drones),ddx=e.x+Math.cos(a3)*16,ddy=e.y+Math.sin(a3)*16;
var t2=nearestPlayer(ddx,ddy),aa=Math.atan2(t2.y-ddy,t2.x-ddx);
eBulletRaw(ddx,ddy,aa,200,st.dmg*.35*DK,1.1)}}
if(st.socio){e.socioSpin=Math.max(0,e.socioSpin-dt);var spin=e.socioSpin>0,bs=spin?16:2.2,dps=(spin?st.socioSpinDps:st.socioDps)*.45*DK;
for(var b=0;b<2;b++){var ba=G.t*bs+b*Math.PI,bx=e.x+Math.cos(ba)*22,by=e.y+Math.sin(ba)*22;
for(var j=0;j<PL.length;j++){var pp=PL[j];if(pp.hp>0&&hyp(pp.x-bx,pp.y-by)<pp.r+7&&!CHEAT.god){pp.hp-=dps*dt;if(pp.hp<=0)playerDown(pp)}}}}
if(dd<e.r+8&&e.hitT<=0&&e.dashT<=0){hurtPlayer(p,st.dashDmg*.3*DK);e.hitT=.7}}
function applyBleed(e,dps,owner){if(e.invuln||twinsShielded(e))return;
e.bleedT=3;e.bleedDps=Math.max(e.bleedDps,dps);e.bleedOwner=owner;A.bleed()}
function applyElectro(e,dps,owner,lvl){if(e.invuln||twinsShielded(e))return;
e.electroT=Math.max(e.electroT,1.3);e.electroDps=Math.max(e.electroDps,dps);e.electroOwner=owner;e.electroLvl=Math.max(e.electroLvl||0,lvl)}
function updateEnemies(dt){planShieldGroups();
var onlyMedics=G.enemies.length>0;for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;if(e.type!=='medic'){onlyMedics=false;break}}
for(i=0;i<G.enemies.length;i++){e=G.enemies[i];if(e.dead)continue;
var cs=slowAt(e.x,e.y),edt=dt*cs;
e.t+=edt;e.fl=Math.max(0,e.fl-dt);e.fr=Math.max(0,(e.fr||0)-dt);e.hitT=Math.max(0,e.hitT-dt);e.shieldFl=Math.max(0,e.shieldFl-dt);
if(e.slowT>0)e.slowT-=dt;
if(e.bleedT>0&&!e.invuln&&!twinsShielded(e)){e.bleedT-=dt;
 var bd=e.bleedDps*dt;e.hp-=bd;e.fr=Math.max(e.fr,.03);
 var ow=PL[e.bleedOwner]||P;healPlayer(ow,bd);
 if(Math.random()<dt*7)part(e.x+rand(-4,4),e.y+rand(-4,4),'#ff4d4d',1,26,.35,1);
 if(e.hp<=0){killEnemy(e);continue}}
if(e.electroT>0&&!e.invuln&&!twinsShielded(e)){e.electroT-=dt;
 e.hp-=e.electroDps*dt;e.fr=Math.max(e.fr,.03);e.electroTick-=dt;
 if(Math.random()<dt*8)part(e.x+rand(-5,5),e.y+rand(-5,5),'#b8fbff',1,35,.2,1);
 if(e.electroTick<=0){e.electroTick=.4;
  if(e.electroLvl>=2){var rad=e.electroLvl>=3?70:48,best=null,bd2=1e9;
   for(var v2=0;v2<G.enemies.length;v2++){var q2=G.enemies[v2];
    if(q2===e||q2.dead||q2.invuln||q2.electroT>0)continue;
    var dd2=hyp(q2.x-e.x,q2.y-e.y);if(dd2<rad&&dd2<bd2){bd2=dd2;best=q2}}
   if(best){applyElectro(best,e.electroDps*.8,e.electroOwner,e.electroLvl);
    G.rings.length<16&&ring(best.x,best.y,2,12,'#b8fbff',.25);A.zap()}}}
 if(e.hp<=0){killEnemy(e);continue}}
var sm=e.slowT>0?e.slowMul:1,mdt=edt*sm;
var p=aiTarget(e.x,e.y),dx=p.x-e.x,dy=p.y-e.y,d=hyp(dx,dy)||1,ux=dx/d,uy=dy/d;
if(e.stunT>0){e.stunT-=dt;e.vx*=.86;e.vy*=.86;
 if(Math.random()<dt*6)part(e.x+rand(-6,6),e.y-e.r-3,'#ffb020',1,25,.25,1)}
else{
if(onlyMedics&&e.type==='medic')e.mode='boom';
if(e.type==='dark')updateDark(e,mdt);
else if(e.type==='aegis')updateAegisGuard(e,mdt);
else if(e.bossKind==='twins')updateTwins(e,mdt,p,d);
else if(e.type==='ram')updateRam(e,mdt,d,ux,uy);
else if(e.type==='lgun')updateLgun(e,mdt,d,ux,uy);
else if(e.type==='mirror')updateMirror(e,mdt,d,ux,uy);
else if(e.type==='brood')updateBrood(e,mdt);
else if(e.type==='jammer')updateJammer(e,mdt,d,ux,uy);
else if(e.boss)bossAI(e,mdt,ux,uy,d);
else if(e.type==='shooter')updateShooter(e,mdt,d,ux,uy,dx,dy);
else if(e.type==='tank')updateTank(e,mdt,d,ux,uy,dx,dy);
else if(e.type==='shielder')updateShielder(e,mdt,d,ux,uy,dx,dy);
else if(e.type==='sniper')updateSniper(e,mdt,d,ux,uy);
else if(e.type==='medic')updateMedic(e,mdt,d,ux,uy);
else if(e.type==='emitter')updateEmitter(e,mdt,d,ux,uy);
else updateWalker(e,mdt,ux,uy);
if(e.elite===2){for(var v=0;v<G.enemies.length;v++){var vv=G.enemies[v];
 if(vv!==e&&!vv.dead&&!vv.invuln&&vv.hp<vv.max&&hyp(vv.x-e.x,vv.y-e.y)<45){vv.hp=Math.min(vv.max,vv.hp+4*mdt);
  if(Math.random()<mdt*2)part(vv.x,vv.y,'#ff2fb0',1,30,.2,1)}}}
if(DODGE[e.type])applyDodge(e,mdt);edgeAvoid(e,mdt)}
e.x+=e.vx*mdt;e.y+=e.vy*mdt;e.x=clamp(e.x,AR.x+e.r,AR.x+AR.w-e.r);e.y=clamp(e.y,AR.y+e.r,AR.y+AR.h-e.r);
var rp=nearestPlayer(e.x,e.y),rd=hyp(rp.x-e.x,rp.y-e.y);
if(e.stunT<=0&&e.type!=='dark'&&e.type!=='ram'&&e.type!=='lgun'&&e.type!=='aegis'&&e.type!=='brood'&&e.type!=='jammer'&&rd<e.r*(e.sc||1)+rp.r&&e.hitT<=0&&e.type!=='medic'&&e.type!=='emitter'){
 if(!(rp.dashT>0&&rp.stats&&rp.stats.phase)){hurtPlayer(rp,e.dmg*(e.st==='charge'?1.3:1));e.hitT=.6;e.vx-=ux*70;e.vy-=uy*70;rp.vx+=ux*50;rp.vy+=uy*50}}}
for(i=0;i<G.enemies.length;i++){var a1=G.enemies[i];if(a1.dead)continue;
for(var j=i+1;j<G.enemies.length;j++){var b1=G.enemies[j];if(b1.dead)continue;var ddx=b1.x-a1.x,ddy=b1.y-a1.y,rr=a1.r+b1.r,d2=ddx*ddx+ddy*ddy;
if(d2<rr*rr&&d2>.01){var dd=Math.sqrt(d2),ff=(rr-dd)/dd*.4;if(!a1.boss&&!a1.invuln){a1.x-=ddx*ff;a1.y-=ddy*ff}if(!b1.boss&&!b1.invuln){b1.x+=ddx*ff;b1.y+=ddy*ff}}}}
G.enemies=G.enemies.filter(function(en){return !en.dead})}
function planShieldGroups(){var groups=new Map(),snipers=[];
for(var q=0;q<G.enemies.length;q++){var e=G.enemies[q];if(e.dead)continue;if(e.type==='sniper')snipers.push(e);
if(e.type==='shielder'){var k=e.group!=null?e.group:'solo'+e.id;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}}
var claimed=new Set();
groups.forEach(function(mem){mem.sort(function(a,b){return a.slot-b.slot});var n=mem.length,cx=0,cy=0;
for(var i=0;i<n;i++){cx+=mem[i].x;cy+=mem[i].y}cx/=n;cy/=n;var guard=null;
if(mem[0].guardId!=null)for(i=0;i<snipers.length;i++)if(snipers[i].id===mem[0].guardId){guard=snipers[i];break}
if(!guard){var bd=1e9;for(i=0;i<snipers.length;i++){var s=snipers[i];if(claimed.has(s.id))continue;var d=hyp(s.x-cx,s.y-cy);if(d<bd){bd=d;guard=s}}if(bd>300)guard=null}
if(guard)claimed.add(guard.id);
var p=aiTarget(cx,cy),dP=hyp(p.x-cx,p.y-cy),prev=mem[0].mode,mode,ax=cx,ay=cy,ar=0;
if(guard){mode='guard';ax=guard.x;ay=guard.y;ar=27}else if(n===1)mode='solo';else{var close=prev==='circle'?dP<96:dP<74;mode=close?'circle':'cluster';ar=24}
var toP=Math.atan2(p.y-ay,p.x-ax),base=mode==='guard'?G.t*.5:G.t*.25;
for(i=0;i<n;i++){var m=mem[i];m.guardId=guard?guard.id:null;m.mode=mode;m.ax=ax;m.ay=ay;m.ar=ar;
if(mode==='solo'){m.tx=p.x;m.ty=p.y;m.tface=toP}
else if(mode==='cluster'){var off=(i-(n-1)/2)*14,px=-Math.sin(toP),py=Math.cos(toP);m.tx=ax+px*off+Math.cos(toP)*16;m.ty=ay+py*off+Math.sin(toP)*16;m.tface=toP}
else{var a=base+i*TAU/n;m.tx=ax+Math.cos(a)*ar;m.ty=ay+Math.sin(a)*ar;m.tface=a}}})}
function applyDodge(e,dt){if(G.wave<=5)return;e.dodgeCd-=dt;e.dodgeT-=dt;
if(e.dodgeT>0){e.vx=e.vx*.25+e.dvx;e.vy=e.vy*.25+e.dvy;return}
if(e.dodgeCd>0||!isFinite(e.dodgeCd))return;
for(var i=0;i<G.bul.length;i++){var bl=G.bul[i],rx=e.x-bl.x,ry=e.y-bl.y,v2=bl.vx*bl.vx+bl.vy*bl.vy;if(v2<1)continue;
var t=(rx*bl.vx+ry*bl.vy)/v2;if(t<0||t>.55)continue;var cx=rx-bl.vx*t,cy=ry-bl.vy*t;
if(cx*cx+cy*cy>(e.r+bl.r+7)*(e.r+bl.r+7))continue;
var vl=Math.sqrt(v2),px=-bl.vy/vl,py=bl.vx/vl,side=(cx*px+cy*py)>=0?1:-1,sp=e.sp*1.9+65;
e.dvx=px*side*sp;e.dvy=py*side*sp;e.dodgeT=.22;e.dodgeCd=dodgeCd(G.wave)*rand(.8,1.2);part(e.x,e.y,'#fff',2,40,.15,1);return}}
function updateShooter(e,dt,d,ux,uy,dx,dy){var tx,ty;if(d<70){tx=-ux;ty=-uy}else if(d>110){tx=ux;ty=uy}else{tx=-uy;ty=ux}
e.vx+=(tx*e.sp-e.vx)*Math.min(1,4*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,4*dt);e.cd-=dt;e.tel=e.cd<.3?1:0;
if(e.cd<=0){e.cd=rand(1.5,2.2)/D.sp;eShoot(e,Math.atan2(dy,dx),95,8*D.dmg,'orbA');part(e.x,e.y,PAL.a,3,50,.2,1);A.tone(300,.06,'square',.05,.6)}}
function updateTank(e,dt,d,ux,uy,dx,dy){if(e.st==='walk'){e.vx+=(ux*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(uy*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;if(e.cd<=0&&d<130){e.st='tel';e.cd=.75;e.lock=Math.atan2(dy,dx)}}
else if(e.st==='tel'){e.cd-=dt;e.tel=1;e.vx*=.86;e.vy*=.86;if(e.cd<=0){e.st='charge';e.cd=.6;e.tel=0;A.tone(120,.22,'sawtooth',.11,1.8)}}
else{e.cd-=dt;e.vx=Math.cos(e.lock)*130;e.vy=Math.sin(e.lock)*130;part(e.x,e.y,PAL.r,1,35,.25,1);if(e.cd<=0){e.st='walk';e.cd=rand(2.4,3.6)}}}
function updateShielder(e,dt,d,ux,uy,dx,dy){e.face+=angDiff(e.face,e.tface)*Math.min(1,1.6*dt);
var tx=e.tx-e.x,ty=e.ty-e.y,td=hyp(tx,ty)||1,sp=Math.min(e.sp*1.9,td*5);
e.vx+=((tx/td)*sp-e.vx)*Math.min(1,4*dt);e.vy+=((ty/td)*sp-e.vy)*Math.min(1,4*dt);e.cd-=dt;var ap=Math.atan2(dy,dx);
if(e.cd<=0&&Math.abs(angDiff(e.face,ap))<.9){e.cd=rand(1.8,2.4);eShoot(e,e.face,95,8*D.dmg,'orbM');A.tone(280,.06,'square',.05,.6)}}
function updateSniper(e,dt,d,ux,uy){var tx,ty;if(e.tel>0){tx=0;ty=0}else if(d<170){tx=-ux;ty=-uy}else if(d>230){tx=ux;ty=uy}else{tx=-uy;ty=ux}
e.vx+=(tx*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;
var p=aiTarget(e.x,e.y);
if(e.cd<=.7&&e.tel===0){e.tel=1;e.lock=Math.atan2(p.y-e.y,p.x-e.x);A.tone(700,.3,'sine',.05,1.6)}
if(e.cd<=0){e.cd=3;e.tel=0;eShoot(e,e.lock,1400,36*D.dmg,'orbR');part(e.x,e.y,PAL.r,6,90,.25,1);A.tone(150,.15,'sawtooth',.12,.4)}}
function updateMedic(e,dt,d,ux,uy){e.beam=null;if(e.hp<e.max*.25)e.mode='boom';
if(e.mode==='boom'){e.vx+=(ux*130-e.vx)*Math.min(1,6*dt);e.vy+=(uy*130-e.vy)*Math.min(1,6*dt);part(e.x,e.y,PAL.g,1,40,.2,1);
if(d<12){var p=nearestPlayer(e.x,e.y);hurtPlayer(p,50*dmgScale());ring(e.x,e.y,4,44,PAL.g,.5);part(e.x,e.y,PAL.g,30,130,.6,2);flash(.3,PAL.g);A.boom();killEnemy(e)}return}
var target=null,bd=1e9;for(var i=0;i<G.enemies.length;i++){var o=G.enemies[i];if(o===e||o.dead||o.type==='medic'||o.type==='dark'||o.invuln||o.hp>=o.max)continue;var dd=hyp(o.x-e.x,o.y-e.y);if(dd<bd){bd=dd;target=o}}
if(target&&bd<110){e.beam={x:target.x,y:target.y};target.hp=Math.min(target.max,target.hp+12*dt);var tx=(target.x-e.x)/bd,ty=(target.y-e.y)/bd;e.vx+=(tx*20-e.vx)*Math.min(1,3*dt);e.vy+=(ty*20-e.vy)*Math.min(1,3*dt)}
else{var t2,u2;if(d<110){t2=-ux;u2=-uy}else{t2=-uy;u2=ux}e.vx+=(t2*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(u2*e.sp-e.vy)*Math.min(1,3*dt)}}
function updateEmitter(e,dt,d,ux,uy){var tx,ty;if(d<120){tx=-ux;ty=-uy}else if(d>170){tx=ux;ty=uy}else{tx=-uy;ty=ux}
e.vx+=(tx*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;e.tel=e.cd<.7?1:0;
if(e.cd<=0){e.cd=4.2;var n=G.wave>=18?8:6,base=rand(0,TAU);for(var i=0;i<n;i++)spawnBeam(e.x,e.y,base+i*TAU/n,.35,1.3,10*D.dmg*escale(e),240,2,PAL.c);A.laser()}}
function updateWalker(e,dt,ux,uy){var wob=e.type==='splitter'?Math.sin(e.t*3)*.45:0;var ax=ux*Math.cos(wob)-uy*Math.sin(wob),ay=ux*Math.sin(wob)+uy*Math.cos(wob);e.vx+=(ax*e.sp-e.vx)*Math.min(1,5*dt);e.vy+=(ay*e.sp-e.vy)*Math.min(1,5*dt)}
function bossAI(e,dt,ux,uy,d){var fr=e.hp/e.max;e.phase=fr>.66?1:(fr>.33?2:3);
$('#bossPhase').textContent='ФАЗА '+e.phase;setBossPips(e.phase);$('#bossFill').style.transform='scaleX('+clamp(fr,0,1)+')';
e.shieldAng=(e.shieldAng||0)+dt*(e.bossKind==='prism'?1.1:.3);e.fleeT=Math.max(0,(e.fleeT||0)-dt);
if(e.bossKind==='hive'&&!e.crisis&&fr<.5){e.crisis=true;e.fleeT=4;var cp=nearestPlayer(e.x,e.y);
for(var mi=0;mi<6;mi++){var ma=mi*TAU/6,mx2=clamp(e.x+Math.cos(ma)*26,AR.x+EDGE,AR.x+AR.w-EDGE),my2=clamp(e.y+Math.sin(ma)*26,AR.y+EDGE,AR.y+AR.h-EDGE);
var md=makeEnemy('medic',mx2,my2);md.vx=Math.cos(ma)*60;md.vy=Math.sin(ma)*60;G.enemies.push(md);ring(mx2,my2,2,12,PAL.g,.35)}
for(var si=0;si<5;si++){var sa=si*TAU/5,sx=clamp(cp.x+Math.cos(sa)*80,AR.x+EDGE,AR.x+AR.w-EDGE),sy=clamp(cp.y+Math.sin(sa)*80,AR.y+EDGE,AR.y+AR.h-EDGE);
G.enemies.push(makeEnemy('sniper',sx,sy));ring(sx,sy,2,12,PAL.v,.35)}
banner('УЛЕЙ ПРОБУЖДЁН','МАТКА ЗОВЁТ ЗАЩИТУ');flash(.3,PAL.g);shake(5);A.bossIn()}
if(e.st==='charge'){e.chargeT-=dt;e.vx=Math.cos(e.lock)*210;e.vy=Math.sin(e.lock)*210;part(e.x,e.y,e.col,2,50,.3,1);if(e.chargeT<=0)e.st='';return}
moveBoss(e,dt,ux,uy,d);
if(e.pending){e.tel-=dt;if(e.tel<=0){execBoss(e,e.pending);e.pending=null;e.atkT=bossCd(e)}}
else{e.atkT-=dt;if(e.atkT<=0){e.pending=pickBossAtk(e);e.tel=.5}}}
function moveBoss(e,dt,ux,uy,d){var tx=0,ty=0,k=e.bossKind;
if(k==='hammer'){tx=ux*e.sp;ty=uy*e.sp}
else if(k==='eye'){var w=d<170?-1:(d>220?1:0);tx=ux*w*e.sp-uy*e.sp*.5;ty=uy*w*e.sp+ux*e.sp*.5}
else if(k==='prism'){tx=-uy*e.sp;ty=ux*e.sp}
else if(k==='hive'){if(e.fleeT>0){tx=-ux*e.sp*1.25;ty=-uy*e.sp*1.25}else if(d<150){tx=-ux*e.sp;ty=-uy*e.sp}else if(d>200){tx=ux*e.sp*.5;ty=uy*e.sp*.5}else{tx=-uy*e.sp*.6;ty=ux*e.sp*.6}}
else{var w2=d>90?1:-1;tx=ux*w2*e.sp*.8;ty=uy*w2*e.sp*.8}
e.vx+=(tx-e.vx)*Math.min(1,2*dt);e.vy+=(ty-e.vy)*Math.min(1,2*dt)}
function bossCd(e){var b=Math.max(.7,1.6-(e.phase-1)*.25-(G.wave-5)*.01);if(e.bossKind==='hive'&&e.crisis)return Math.max(.5,b*.65);return b}
function pickBossAtk(e){var p=e.phase,k=e.bossKind;
if(k==='guardian')return pick(p>=2?['radial','spiral','charge','summon']:['radial','spiral','summon']);
if(k==='hive'){if(e.crisis)return pick(p>=2?['summonMed','summonMed','summonMed','summonSnipe','summonSnipe','spore','radial']:['summonMed','summonMed','summonSnipe','spore']);return pick(p>=2?['summon','summon','spore','radial']:['summon','spore'])}
if(k==='prism')return pick(p>=2?['beams','radial','charge','spiral']:['beams','radial']);
if(k==='hammer')return pick(p>=2?['shock','zones','charge','pull']:['shock','zones','charge']);
if(k==='eye')return pick(p>=2?['volley','cross','mark','summon']:['volley','mark']);
return pick(p>=2?['blink','clones','spiral','radial']:['blink','clones'])}
function execBoss(e,kind){var ds=escale(e),p0=aiTarget(e.x,e.y),dd=hyp(p0.x-e.x,p0.y-e.y)||1,ux=(p0.x-e.x)/dd,uy=(p0.y-e.y)/dd;
if(kind==='radial'){var n=10+e.phase*3;e.ang+=.24;for(var k=0;k<n;k++)eShoot(e,e.ang+k*TAU/n,72+e.phase*6,9*D.dmg,'orbM');ring(e.x,e.y,e.r,e.r+16,e.col,.25);A.tone(240,.1,'square',.07,.6)}
else if(kind==='spiral'){for(var s=0;s<10;s++){var a=e.ang+s*.42;eShoot(e,a,88,8*D.dmg,'orbA');eShoot(e,a+Math.PI,88,8*D.dmg,'orbA')}e.ang+=.6;A.tone(300,.12,'square',.07,.7)}
else if(kind==='charge'){e.st='charge';e.chargeT=.6;e.lock=Math.atan2(p0.y-e.y,p0.x-e.x);A.tone(90,.5,'sawtooth',.12,2.2)}
else if(kind==='summon'){var n2=(e.bossKind==='hive'?3:2)+e.phase;for(var i=0;i<n2;i++){var a2=rand(0,TAU),type=e.bossKind==='hive'?(i%3===0?'medic':(i%3===1?'splitter':'grunt')):(e.bossKind==='eye'?'sniper':(e.phase>=3?'shooter':'grunt'));var m=makeEnemy(type,e.x+Math.cos(a2)*22,e.y+Math.sin(a2)*22);m.vx=Math.cos(a2)*70;m.vy=Math.sin(a2)*70;rollElite(m);G.enemies.push(m);ring(m.x,m.y,2,11,e.col,.3)}A.tone(180,.3,'sawtooth',.11,2)}
else if(kind==='summonMed'){var nm=2+(e.phase>=3?1:0);for(var im=0;im<nm&&G.enemies.length<48;im++){var am=rand(0,TAU),xm=clamp(e.x+Math.cos(am)*24,AR.x+EDGE,AR.x+AR.w-EDGE),ym=clamp(e.y+Math.sin(am)*24,AR.y+EDGE,AR.y+AR.h-EDGE);var md=makeEnemy('medic',xm,ym);md.vx=Math.cos(am)*50;md.vy=Math.sin(am)*50;G.enemies.push(md);ring(xm,ym,2,11,PAL.g,.3)}A.tone(180,.3,'sawtooth',.11,2)}
else if(kind==='summonSnipe'){var ns=1+(e.phase>=3?1:0);for(var is=0;is<ns&&G.enemies.length<48;is++){var as=rand(0,TAU),xs=clamp(e.x+Math.cos(as)*60,AR.x+EDGE,AR.x+AR.w-EDGE),ys=clamp(e.y+Math.sin(as)*60,AR.y+EDGE,AR.y+AR.h-EDGE);G.enemies.push(makeEnemy('sniper',xs,ys));ring(xs,ys,2,11,PAL.v,.3)}A.tone(700,.2,'sine',.06,1.6)}
else if(kind==='spore'){for(i=0;i<3+e.phase;i++)spawnZone(p0.x+rand(-70,70),p0.y+rand(-70,70),26,.8,1.1,12*D.dmg*ds,'#9dff3c');A.tone(160,.3,'triangle',.1,1.6)}
else if(kind==='beams'){var n3=2+e.phase;for(i=0;i<n3;i++)spawnBeam(e.x,e.y,e.shieldAng+i*TAU/n3,.5,1.6,11*D.dmg*ds,300,3,PAL.c);A.laser()}
else if(kind==='shock'){spawnShock(e.x,e.y,180,150,16*D.dmg*ds,'#ffb020');shake(4);A.shock()}
else if(kind==='zones'){for(i=0;i<2+e.phase;i++)spawnZone(p0.x+rand(-60,60),p0.y+rand(-60,60),30,.75,1.05,18*D.dmg*ds,'#ffb020');A.tone(120,.3,'square',.1,1.8)}
else if(kind==='pull'){var rp=nearestPlayer(e.x,e.y);rp.vx-=ux*160;rp.vy-=uy*160;spawnShock(e.x,e.y,150,130,14*D.dmg*ds,'#ff4d4d');A.tone(70,.4,'sawtooth',.14,2)}
else if(kind==='volley'){for(i=0;i<3;i++){var a3=Math.atan2(p0.y-e.y,p0.x-e.x)+(i-1)*.12;eShoot(e,a3,900,14*D.dmg,'orbR')}A.tone(150,.15,'sawtooth',.12,.4)}
else if(kind==='cross'){for(i=0;i<4;i++)spawnBeam(e.x,e.y,e.shieldAng+i*TAU/4,.25,1.4,12*D.dmg*ds,320,3,'#a86bff');A.laser()}
else if(kind==='mark'){spawnZone(p0.x,p0.y,34,.9,1.2,24*D.dmg*ds,'#ff4d4d');A.tone(700,.3,'sine',.06,1.6)}
else if(kind==='blink'){var a4=rand(0,TAU),dist=rand(70,110);e.x=clamp(p0.x+Math.cos(a4)*dist,AR.x+20,AR.x+AR.w-20);e.y=clamp(p0.y+Math.sin(a4)*dist,AR.y+20,AR.y+AR.h-20);ring(e.x,e.y,4,40,'#ff2fb0',.4);A.blink();var n4=8+e.phase*2;for(k=0;k<n4;k++)eShoot(e,k*TAU/n4,80,8*D.dmg,'orbM')}
else if(kind==='clones'){for(i=0;i<2+e.phase;i++){var a5=rand(0,TAU),m2=makeEnemy('clone',e.x+Math.cos(a5)*18,e.y+Math.sin(a5)*18);m2.vx=Math.cos(a5)*80;m2.vy=Math.sin(a5)*80;G.enemies.push(m2)}A.blink()}}
function computeStats(L,ship,mm){var o={};ship=ship||'std';mm=mm||META;o.ship=ship;
o.rate=4.6*Math.pow(1.18,L.rate||0)*Math.pow(1.14,L.kir||0)*(1+.05*(mm.perm.rate||0));
o.dmg=10*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));o.count=1+(L.fan||0);
o.spread=.11*(L.fan||0)+.03;o.pierce=L.pierce||0;
o.speed=74*Math.pow(1.13,L.speed||0)*(1+.04*(mm.perm.spd||0));
var dl=L.dash||0;o.dashCd=(dl>=4?0:0.91*Math.pow(0.7,dl))*Math.pow(.94,mm.perm.dash||0);o.dashDmg=18+9*dl;
o.magnet=34*Math.pow(1.7,L.magnet||0);o.vamp=.04*(L.vamp||0);o.regen=1.6*(L.regen||0);o.drones=L.drone||0;o.bs=200*Math.pow(1.18,L.kir||0);
o.shieldMax=25*(L.shield||0)+10*(mm.perm.shield||0);o.shieldRegen=6+2*(L.shield||0);
o.healDrone=L.healdrone||0;o.healRate=.7*o.healDrone*(1+o.healDrone*.3);
var hl=L.hyper||0;o.hyper=hl;o.hyperDmg=hl?50+(hl-1)*25:0;o.hyperCd=hl?5-(hl-1):0;o.hyperGold=!!L.hyperGold;
var sl=L.socio||0;o.socio=sl;o.socioDps=10*sl;o.socioSpinDps=120*sl;
var al=L.aegis||0;o.aegis=al;o.aegisN=al?2+al:0;o.aegisR=24+2*Math.max(0,al-1);o.aegisDmg=12+7*Math.max(0,al-1);
var se=L.seeder||0;o.seeder=se;o.seedN=se?2+se+(ship==='bomber'?2:0):0;
o.seedDmg=se?55+15*(se-1):0;o.seedRad=(34+2*Math.max(0,se-1))*(ship==='bomber'?1.25:1);
var ph=L.phase||0;o.phase=ph;o.phLife=ph?1+.4*(ph-1):0;o.phMul=ph?.4+.15*(ph-1):0;
if(ph)o.dashCd*=1.15;
var te=L.tesla||0;o.tesla=te;o.teslaR=te?58+8*(te-1):0;
o.teslaDps=te?(9+5*(te-1))*(1+.5*(Math.pow(1.25,L.cal||0)-1)):0;o.teslaSlow=te?1-(.20+.06*(te-1)):1;
var sEdge=L.scytheEdge||0,pDrive=L.phaseDrive||0,sCore=L.swarmCore||0,sChain=L.stormChain||0,fnd=L.foundry||0,cCore=L.chronoCore||0;
o.scytheEdge=sEdge;o.phaseDrive=pDrive;o.swarmCore=sCore;o.stormChain=sChain;o.foundry=fnd;o.chronoCore=cCore;
o.droneMul=.85;o.droneCd=.5;o.dronePierce=0;
o.dashSpeedMul=1;o.invisBoost=2;o.maxTurrets=3;o.turretLife=14;
var wp=L.weapon,wl=wp?(L[wp]||0):0;o.weapon=wp;o.weaponLvl=wl;
if(wp==='rocket'){o.weaponCdMax=wl>=3?3.5:5;o.weaponDmg=(L.hydra?.6:1)*(50+(wl-1)*50)}
else if(wp==='wave'){o.weaponCdMax=5;o.weaponDmg=L.density?460:[45,70,115][wl-1]||45;o.weaponRadius=L.density?150:100}
else if(wp==='beam'){o.weaponCdMax=7;o.weaponDmg=40+(wl-1)*30;o.beamDur=3}
else{o.weaponCdMax=0;o.weaponDmg=0}
o.hydra=!!L.hydra;o.density=!!L.density;o.reflect=!!L.reflect;
o.fireMode='bullet';o.bulletLife=1.2;o.hpMod=0;o.coneDps=0;o.scytheDmg=0;o.coneR=0;o.coneHalf=.61;
o.scytheR=46;o.scytheHalf=1.05;o.bleedDps=0;o.zapStun=.05;o.electroLvl=0;o.electroDps=0;
if(ship==='sniper'){o.speed*=1.4;o.dashCd*=1.5;o.fireMode='sniper';o.rate=o.rate/3.5;
o.dmg=35*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));o.pierce=Math.max(2,o.pierce);o.bulletLife=1.6;o.count=1;o.bs*=7}
else if(ship==='bomber'){o.fireMode='rocket';o.rate=o.rate/3;o.dmg=30*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));o.dashCd*=1.2}
else if(ship==='psy'){o.fireMode='shotgun';o.speed*=2;o.dashCd*=.5;o.count=Math.max(6,o.count+5);o.spread=.16;o.bulletLife=.34;o.dmg*=.6}
else if(ship==='phantom'){o.speed*=1.25;o.dmg*=.8;o.hpMod=-10;
o.invisDash=1.2+.3*pDrive;o.dashSpeedMul=1+.35*pDrive;o.invisBoost=2+.4*pDrive}
else if(ship==='forge'){o.rate*=.5;o.hpMod=30;o.turretDash=true;o.maxTurrets=3+fnd;o.turretLife=14+2*fnd}
else if(ship==='reaper'){o.fireMode='scythe';o.rate=1.8;
o.scytheDmg=22*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));
o.scytheR=46+12*sEdge;o.scytheHalf=1.05+.15*sEdge;o.bleedDps=o.scytheDmg*.28;
o.vamp=Math.max(o.vamp,.08);o.hpMod=40;o.speed*=.85;o.count=1}
else if(ship==='chronos'){o.weapon='chrono';o.chronoCd=12-2.5*cCore;o.weaponCdMax=o.chronoCd;o.weaponDmg=0;
o.chronoDur=2.5+.25*cCore;o.chronoGlobal=cCore>=3;o.chronoR=o.chronoGlobal?0:150+35*cCore}
else if(ship==='legion'){o.dmg*=.65;o.hpMod=-15;o.droneMul=1;o.droneCd=.45;o.dronePierce=1;
o.drones=Math.min(5,(L.drone||0)+sCore)}
else if(ship==='groza'){o.fireMode='cone';
o.coneDps=26*(1+.5*(Math.pow(1.25,L.cal||0)-1))*(1+.06*(mm.perm.dmg||0));
o.coneR=95+12*sChain;o.coneHalf=.61+.08*sChain;o.speed*=1.1;o.count=0;
o.zapStun=.05+.02*sChain;o.electroLvl=sChain;o.electroDps=sChain?8+4*sChain:0}
o.teslaElectro=0;
if(o.tesla){o.teslaElectro=Math.max(o.electroLvl,ship==='groza'?1:0);
 if(o.teslaElectro&&!o.electroDps)o.electroDps=8+4*o.teslaElectro}
if(CHEAT.god){o.dmg=1000;o.weaponDmg=1000;o.dashDmg=1000;o.hyperDmg=1000;o.socioDps=1000;o.socioSpinDps=1000;o.coneDps=1000;o.scytheDmg=1000;o.teslaDps=1000}
return o}
function renderMods(){var m=$('#mods');m.innerHTML='';var L=viewPlayer().lvl;
UPS.forEach(function(u){var l=L[u.k]||0;if(!l)return;var ic=iconCanvas(u.k,u.col,2);ic.style.width='20px';ic.style.height='20px';ic.title=u.n+' ур.'+l;m.appendChild(ic)})}
function recalcPlayer(p){p.stats=computeStats(p.lvl,p.ship,metaOf(p));
p.max=Math.max(30,D.base+25*(p.lvl.armor||0)+15*(metaOf(p).perm.hp||0)+(p.stats.hpMod||0));
p.shield=Math.min(p.shield,p.stats.shieldMax);while(p.dT.length<p.stats.drones)p.dT.push(rand(0,.6));p.dT.length=p.stats.drones;
if(p===viewPlayer())renderMods()}
function recalc(){for(var i=0;i<PL.length;i++)recalcPlayer(PL[i])}
function autoAim(p){var tg=nearestEnemy(p.x,p.y);return tg?Math.atan2(tg.y-p.y,tg.x-p.x):p.aim}
function readInput(p,dev){
var pad=dev===1?GP:GP2,o={mx:0,my:0,aim:p.aim,dash:false,weapon:false,held:false,focus:false};
var liD=false,liW=false;
if(dev===1){liD=LI.dash;liW=LI.weapon;LI.dash=false;LI.weapon=false}
if(pad.active){var mv=padMove(pad);o.mx=mv.x;o.my=mv.y;o.aim=pad.aimActive?pad.aim:autoAim(p);
o.dash=pad.dash||liD;o.weapon=pad.weapon||liW;o.held=pad.dashHeld||(dev===1&&dashHeld);
if(dev===1&&sticks.move.m>.14){o.mx=sticks.move.dx;o.my=sticks.move.dy}
if(dev===1&&sticks.aim.m>.2)o.aim=Math.atan2(sticks.aim.dy,sticks.aim.dx);
return o}
if(dev===1){var x=0,y=0;
if(keys.KeyA)x-=1;if(keys.KeyD)x+=1;if(keys.KeyW)y-=1;if(keys.KeyS)y+=1;
if(!isLocal()){if(keys.ArrowLeft)x-=1;if(keys.ArrowRight)x+=1;if(keys.ArrowUp)y-=1;if(keys.ArrowDown)y+=1}
if(sticks.move.m>.14){x+=sticks.move.dx;y+=sticks.move.dy}
var l=hyp(x,y);if(l>1){x/=l;y/=l}
o.mx=x;o.my=y;o.focus=!!(keys.ShiftLeft||keys.ShiftRight);
if(sticks.aim.m>.2)o.aim=Math.atan2(sticks.aim.dy,sticks.aim.dx);
else if(!isTouch&&G.t-mouseT<4){var w=screenToWorld(mx,my);o.aim=Math.atan2(w.y-p.y,w.x-p.x)}
else o.aim=autoAim(p);
o.dash=liD;o.weapon=liW;o.held=dashHeld;return o}
var x2=0,y2=0;
if(keys.ArrowLeft)x2-=1;if(keys.ArrowRight)x2+=1;if(keys.ArrowUp)y2-=1;if(keys.ArrowDown)y2+=1;
var l2=hyp(x2,y2);if(l2>1){x2/=l2;y2/=l2}
o.mx=x2;o.my=y2;o.aim=autoAim(p);
o.dash=K2.dash;o.weapon=K2.weapon;o.held=!!keys.Enter;K2.dash=false;K2.weapon=false;
return o}
function feedInput(p,dev){var ri=readInput(p,dev);
ri.dash=ri.dash||p.input.dash;ri.weapon=ri.weapon||p.input.weapon;
p.input=ri;return ri}
function nearestEnemy(x,y){var b=null,bd=1e9;for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;var d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;b=e}}return b}
function nearestEnemyExcluding(x,y,hit){var b=null,bd=1e9;for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||hit.indexOf(e.id)>=0)continue;var d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;b=e}}return b}
function triggerHyper(p){var st=p.stats;if(!st.hyper||p.hyperCd>0||p.jammed)return;p.hyperCd=st.hyperCd;p.dashHold=0;p.socioSpin=1.16;
var hit=[],count=st.hyperGold?3:1;
for(var c=0;c<count;c++){var e=nearestEnemyExcluding(p.x,p.y,hit);if(!e)break;hit.push(e.id);
G.ghost.push({x:p.x,y:p.y,a:p.aim,l:.3,m:.3,col:p.col,ship:p.ship,id:p.id});
p.x=clamp(e.x,AR.x+p.r,AR.x+AR.w-p.r);p.y=clamp(e.y,AR.y+p.r,AR.y+AR.h-p.r);
damageEnemy(e,st.hyperDmg,true,e.x,e.y,0,true,p);ring(e.x,e.y,4,30,'#ff2fb0',.4);part(e.x,e.y,'#ff2fb0',14,110,.4,1)}
p.inv=Math.max(p.inv,.45);A.dash();shake(4)}
function updateSocio(p,dt,st){if(!st.socio)return;p.socioSpin=Math.max(0,p.socioSpin-dt);
var spin=p.socioSpin>0,speed=spin?16:2.2,R=22,bladeR=spin?8:6,base=G.t*speed,dps=spin?st.socioSpinDps:st.socioDps;
for(var b=0;b<2;b++){var a=base+b*Math.PI,bx=p.x+Math.cos(a)*R,by=p.y+Math.sin(a)*R;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.invuln||twinsShielded(e))continue;
if(hyp(e.x-bx,e.y-by)<e.r*(e.sc||1)+bladeR){e.hp-=dps*dt;e.fr=.05;if(Math.random()<.2)part(e.x,e.y,'#a86bff',1,40,.15,1);if(e.hp<=0)killEnemy(e)}}}}
function updateTesla(p,dt,st){if(!st.tesla)return;var any=false;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.invuln||twinsShielded(e))continue;
var d=hyp(e.x-p.x,e.y-p.y);if(d>st.teslaR)continue;
any=true;
e.slowT=.2;e.slowMul=st.teslaSlow;e.hp-=st.teslaDps*dt;e.fr=Math.max(e.fr,.04);
if(st.teslaElectro>0)applyElectro(e,8+4*st.teslaElectro,p.id,st.teslaElectro);
if(Math.random()<dt*3)part((p.x+e.x)/2+rand(-6,6),(p.y+e.y)/2+rand(-6,6),'#b8fbff',1,30,.15,1);
if(e.hp<=0)killEnemy(e)}
if(any)A.zap()}
function updateCone(p,dt,st){var any=false;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.invuln||twinsShielded(e))continue;
var d=hyp(e.x-p.x,e.y-p.y);if(d>st.coneR)continue;
var a=Math.atan2(e.y-p.y,e.x-p.x);if(Math.abs(angDiff(p.aim,a))>st.coneHalf)continue;
any=true;
e.hp-=st.coneDps*dt;e.fr=Math.max(e.fr,.04);
e.zapTick-=dt;
if(e.zapTick<=0){e.zapTick=.3;
 if(Math.random()<st.zapStun&&e.stunT<=0&&!e.boss){e.stunT=.7;A.zapStun();
  ring(e.x,e.y,3,16,'#ffb020',.3);float(e.x,e.y-e.r-8,'СТАН','#ffb020',1)}
 if(st.electroLvl>0)applyElectro(e,st.electroDps,p.id,st.electroLvl)}
if(Math.random()<dt*3)part(e.x+rand(-4,4),e.y+rand(-4,4),'#b8fbff',1,45,.16,1);
if(e.hp<=0)killEnemy(e)}
if(any)A.zap()}
function updateAegisOrbit(p,dt,st){if(!st||!st.aegis)return;
p.aegisA+=dt*(p.dashT>0?7:2.4);
var target=(p.dashT>0||p.aegisOut>0)?52:st.aegisR;
p.aegisR+=(target-p.aegisR)*Math.min(1,dt*(target>p.aegisR?12:5));
if(p.aegisOut>0)p.aegisOut-=dt;
var out=(p.dashT>0||p.aegisOut>0);
for(var s=0;s<st.aegisN;s++){var a=p.aegisA+s*TAU/st.aegisN,x=p.x+Math.cos(a)*p.aegisR,y=p.y+Math.sin(a)*p.aegisR;
for(var i=G.erock.length-1;i>=0;i--){var r=G.erock[i];if(hyp(r.x-x,r.y-y)<8){part(x,y,'#b8fbff',8,70,.3,1);ring(x,y,2,12,'#b8fbff',.25);A.shieldHit();G.erock.splice(i,1)}}
if(!out)continue;
for(var j=0;j<G.enemies.length;j++){var e=G.enemies[j];if(e.dead||e.aegisHit===p.id+1)continue;
 if(hyp(e.x-x,e.y-y)<e.r*(e.sc||1)+7){e.aegisHit=p.id+1;damageEnemy(e,st.aegisDmg,true,x,y,a,true,p)}}}}
function reflectBullets(p){for(var i=G.ebul.length-1;i>=0;i--){var eb=G.ebul[i];
if(hyp(eb.x-p.x,eb.y-p.y)<p.r+22){var tg=nearestEnemy(p.x,p.y);var a=tg?Math.atan2(tg.y-p.y,tg.x-p.x):p.aim;
fireBullet(p.x,p.y,a,240,Math.max(12,eb.dmg*1.5),1,false,p.id,1.4);
part(eb.x,eb.y,'#a86bff',6,70,.25,1);G.ebul.splice(i,1);A.shieldHit()}}}
function updatePlayer(p,dt){if(p.hp<=0)return;var st=p.stats;if(!st)return;var inp=p.input;
p.stun=Math.max(0,p.stun-dt);
if(p.swingT>0)p.swingT-=dt;
if(p.invis>0)p.invis-=dt;else{p.lastSeen.x=p.x;p.lastSeen.y=p.y;p.invisShot=false}
if(p.trapped){var w=null;for(var q=0;q<G.wells.length;q++)if(G.wells[q].id===p.trapped){w=G.wells[q];break}
if(!w)p.trapped=0}
p.jammed=false;
for(var j0=0;j0<G.enemies.length;j0++){var jm=G.enemies[j0];
 if(jm.type==='jammer'&&!jm.dead&&hyp(jm.x-p.x,jm.y-p.y)<90){p.jammed=true;break}}
if(p.jammed)A.jam();
p.aim=inp.aim;p.focus=inp.focus;p.inv=Math.max(0,p.inv-dt);p.hurtT=Math.max(0,p.hurtT-dt);p.dashCd=Math.max(0,p.dashCd-dt);
if(!p.jammed)p.weaponCd=Math.max(0,p.weaponCd-dt);
p.hyperCd=Math.max(0,p.hyperCd-dt);p.shieldT=Math.max(0,p.shieldT-dt);p.noHit+=dt;
if(CHEAT.god){p.hp=p.max;p.inv=Math.max(p.inv,.2);p.stun=0;p.trapped=0;p.jammed=false}
if(st.regen&&p.noHit>3)healPlayer(p,st.regen*dt);
if(st.shieldMax&&p.shieldT<=0)p.shield=Math.min(st.shieldMax,p.shield+st.shieldRegen*dt);
if(st.healRate)healPlayer(p,st.healRate*dt);
if(inp.held&&p.stun<=0&&!p.jammed)p.dashHold+=dt;else p.dashHold=0;
if(st.hyper&&p.dashHold>=1.5&&p.hyperCd<=0&&p.stun<=0&&!p.jammed)triggerHyper(p);
if(inp.dash){inp.dash=false;if(p.stun<=0&&!p.trapped)doDash(p)}
if(inp.weapon){inp.weapon=false;fireWeapon(p)}
if(p.dashT>0){p.dashT-=dt;var ds=280*(st.dashSpeedMul||1);p.vx=p.dx*ds;p.vy=p.dy*ds;
G.ghost.push({x:p.x,y:p.y,a:p.aim,l:.22,m:.22,col:p.col,ship:p.ship,id:p.id});
if(st.ship==='psy')reflectBullets(p);
if(!st.phase)for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.dh)continue;
 if(hyp(e.x-p.x,e.y-p.y)<e.r*(e.sc||1)+p.r+2){e.dh=true;damageEnemy(e,st.dashDmg,true,e.x,e.y,0,true,p);var ka=Math.atan2(e.y-p.y,e.x-p.x);e.vx+=Math.cos(ka)*90;e.vy+=Math.sin(ka)*90}}}
else{for(i=0;i<G.enemies.length;i++)G.enemies[i].dh=false,G.enemies[i].aegisHit=0;
var sp=st.speed*(p.focus?.55:1)*(p.stun>0?.2:1),k=1-Math.exp(-20*dt);
var mxv=p.trapped?0:inp.mx,myv=p.trapped?0:inp.my;
p.vx+=(mxv*sp-p.vx)*k;p.vy+=(myv*sp-p.vy)*k}
p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=clamp(p.x,AR.x+p.r,AR.x+AR.w-p.r);p.y=clamp(p.y,AR.y+p.r,AR.y+AR.h-p.r);
updateSocio(p,dt,st);updateTesla(p,dt,st);updateAegisOrbit(p,dt,st);
if(st.fireMode==='cone'){p.coneT+=dt;updateCone(p,dt,st)}else p.coneT=0;
p.fireT-=dt;if(p.fireT<=0){p.fireT=1/st.rate;shoot(p)}
for(i=0;i<st.drones;i++){p.dT[i]-=dt;if(p.dT[i]<=0){var t2=nearestEnemy(p.x,p.y);
if(t2){p.dT[i]=st.droneCd;var ang=G.t*1.8+i*TAU/Math.max(1,st.drones),ddx=p.x+Math.cos(ang)*16,ddy=p.y+Math.sin(ang)*16;
 fireBullet(ddx,ddy,Math.atan2(t2.y-ddy,t2.x-ddx),210,st.dmg*st.droneMul,st.dronePierce,true,p.id)}else p.dT[i]=.25}}
if(p.beamT>0){p.beamT-=dt;updateBeam(p,dt)}}
function shoot(p){var st=p.stats;
if(st.fireMode==='cone')return;
var boost=1;
if(p.invisShot&&p.invis>0){boost=st.invisBoost||2;p.invisShot=false;
 float(p.x,p.y-16,'×'+boost.toFixed(1).replace('.0',''),'#a86bff',1);part(p.x,p.y,'#a86bff',12,90,.35,1)}
if(st.fireMode==='scythe'){
 p.swingT=.3;p.swingDir=-(p.swingDir||1);
 A.scythe();ring(p.x,p.y,st.scytheR*.4,st.scytheR,'#ff2fb0',.22);
 var hitAny=false;
 for(var si=0;si<G.enemies.length;si++){var se=G.enemies[si];if(se.dead)continue;
  var sd=hyp(se.x-p.x,se.y-p.y);if(sd>st.scytheR+se.r*(se.sc||1))continue;
  var sa=Math.atan2(se.y-p.y,se.x-p.x);if(Math.abs(angDiff(p.aim,sa))>st.scytheHalf)continue;
  damageEnemy(se,st.scytheDmg*boost,true,se.x,se.y,sa,true,p);
  if(!se.dead)applyBleed(se,st.bleedDps,p.id);
  hitAny=true}
 if(hitAny)healPlayer(p,st.scytheDmg*.08);
 for(var sp2=0;sp2<9;sp2++){var aa=p.aim-st.scytheHalf+sp2*(st.scytheHalf*2/8);
  part(p.x+Math.cos(aa)*st.scytheR,p.y+Math.sin(aa)*st.scytheR,'#ff2fb0',1,45,.2,1)}
 G.st.shots++;return}
if(st.fireMode==='sniper'){fireBullet(p.x+Math.cos(p.aim)*12,p.y+Math.sin(p.aim)*12,p.aim,st.bs,st.dmg*boost,st.pierce,false,p.id,st.bulletLife);
part(p.x+Math.cos(p.aim)*12,p.y+Math.sin(p.aim)*12,p.light,5,80,.2,1);A.tone(1300,.08,'square',.06,.35)}
else if(st.fireMode==='rocket'){fireRocketEntity(p.x+Math.cos(p.aim)*8,p.y+Math.sin(p.aim)*8,p.aim,st.dmg*boost,p.id,true,false);A.tone(700,.07,'sawtooth',.05,.5)}
else if(st.fireMode==='shotgun'){for(var s=0;s<st.count;s++){var off=(s-(st.count-1)/2)*st.spread+rand(-.05,.05);
fireBullet(p.x+Math.cos(p.aim)*7,p.y+Math.sin(p.aim)*7,p.aim+off,st.bs*.8,st.dmg*boost,st.pierce,false,p.id,st.bulletLife)}A.tone(500,.08,'square',.06,.4)}
else{var n=st.count;for(var i=0;i<n;i++){var o2=(i-(n-1)/2)*st.spread*2+rand(-.02,.02)*(p.focus?.3:1),a=p.aim+o2;
fireBullet(p.x+Math.cos(a)*7,p.y+Math.sin(a)*7,a,st.bs,st.dmg*boost,st.pierce,false,p.id,st.bulletLife)}A.shoot()}
G.st.shots+=1;part(p.x+Math.cos(p.aim)*8,p.y+Math.sin(p.aim)*8,p.light,2,50,.15,1);
p.vx-=Math.cos(p.aim)*9;p.vy-=Math.sin(p.aim)*9}
function updateBeam(p,dt){var st=p.stats,dps=st.weaponDmg,len=280,w=5,ca=Math.cos(p.aim),sa=Math.sin(p.aim);p.beamChain=[];
if(st.reflect){var hit=[],cur={x:p.x,y:p.y},ang=p.aim;
for(var c=0;c<5;c++){var best=null,bd=1e9;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||hit.indexOf(e.id)>=0)continue;
var rx=e.x-cur.x,ry=e.y-cur.y,proj=rx*Math.cos(ang)+ry*Math.sin(ang);if(proj<0||proj>len)continue;
var perp=Math.abs(-rx*Math.sin(ang)+ry*Math.cos(ang));if(perp<e.r+w&&proj<bd){bd=proj;best=e}}
if(!best)break;hit.push(best.id);p.beamChain.push({x1:cur.x,y1:cur.y,x2:best.x,y2:best.y});
if(!best.invuln&&!twinsShielded(best)){best.hp-=dps*dt;best.fr=.05;if(best.hp<=0)killEnemy(best)}
cur={x:best.x,y:best.y};
var nxt=null,nd=1e9;for(i=0;i<G.enemies.length;i++){var e2=G.enemies[i];if(e2.dead||hit.indexOf(e2.id)>=0)continue;var d=hyp(e2.x-cur.x,e2.y-cur.y);if(d<nd&&d<160){nd=d;nxt=e2}}
if(!nxt)break;ang=Math.atan2(nxt.y-cur.y,nxt.x-cur.x)}
if(!p.beamChain.length)p.beamChain.push({x1:p.x,y1:p.y,x2:p.x+ca*len,y2:p.y+sa*len})}
else{p.beamChain.push({x1:p.x,y1:p.y,x2:p.x+ca*len,y2:p.y+sa*len});
for(i=0;i<G.enemies.length;i++){var e3=G.enemies[i];if(e3.dead||e3.invuln||twinsShielded(e3))continue;
var rx3=e3.x-p.x,ry3=e3.y-p.y,proj3=rx3*ca+ry3*sa;if(proj3<0||proj3>len)continue;var perp3=Math.abs(-rx3*sa+ry3*ca);
if(perp3<e3.r+w){e3.hp-=dps*dt;e3.fr=.05;if(Math.random()<.15)part(e3.x,e3.y,'#ff2fb0',1,40,.15,1);if(e3.hp<=0)killEnemy(e3)}}}}
function fireWeapon(p){var st=p.stats;if(G.state!=='play'||!st.weapon||p.weaponCd>0||p.jammed)return;
if(st.weapon==='chrono'){p.weaponCd=st.weaponCdMax;
 G.chronoFields.push({x:p.x,y:p.y,r:st.chronoR,g:!!st.chronoGlobal,t:st.chronoDur,max:st.chronoDur,owner:p.id});
 A.chrono();flash(.18,'#4d8cff');ring(p.x,p.y,6,st.chronoGlobal?200:st.chronoR,'#4d8cff',.7);
 float(p.x,p.y-18,st.chronoGlobal?'ПОЛЕ ВРЕМЕНИ':'ХРОНО-ПОЛЕ','#4d8cff',1);return}
if(st.weapon==='rocket'){p.weaponCd=st.weaponCdMax;fireRocketEntity(p.x+Math.cos(p.aim)*8,p.y+Math.sin(p.aim)*8,p.aim,st.weaponDmg,p.id,false,st.hydra);A.rocket();shake(2);part(p.x,p.y,'#ffb020',6,70,.25,1)}
else if(st.weapon==='wave'){p.weaponCd=st.weaponCdMax;var rad=st.weaponRadius;
if(st.density){if(G.rings.length<=16)G.rings.push({x:p.x,y:p.y,r:6,r1:rad,l:.55,m:.55,c:'#22e6ff',ang:p.aim,spread:Math.PI/4})}else ring(p.x,p.y,4,rad,'#22e6ff',.55);
part(p.x,p.y,'#22e6ff',24,130,.5,1);shake(4);A.shock();
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;var d=hyp(e.x-p.x,e.y-p.y);if(d>rad)continue;
if(st.density){var a=Math.atan2(e.y-p.y,e.x-p.x);if(Math.abs(angDiff(p.aim,a))>Math.PI/4)continue}
damageEnemy(e,st.weaponDmg,true,e.x,e.y,undefined,true,p)}}
else if(st.weapon==='beam'){p.weaponCd=st.weaponCdMax;p.beamT=st.beamDur;A.beam();flash(.12,'#ff2fb0')}}
function doDash(p){var st=p.stats;if(G.state!=='play'||p.dashCd>0||p.stun>0||p.trapped)return;
var dx=p.input.mx,dy=p.input.my;if(!dx&&!dy){dx=Math.cos(p.aim);dy=Math.sin(p.aim)}
var l=hyp(dx,dy)||1;p.dx=dx/l;p.dy=dy/l;p.dashT=.16;p.dashCd=st.dashCd;p.socioSpin=1.16;
if(st.ship==='bomber'&&!st.seeder)spawnMine(p.x,p.y,p.id,60,34);
if(st.seeder){var n=st.seedN;
 for(var i=0;i<n;i++){var a=p.aim+Math.PI+(i-(n-1)/2)*.42;
  spawnMine(p.x+Math.cos(a)*15,p.y+Math.sin(a)*15,p.id,st.seedDmg,st.seedRad)}}
if(st.turretDash)spawnTurret(p);
if(st.phase){spawnPhantom(p);p.inv=Math.max(p.inv,.34);ring(p.x,p.y,3,22,'#a86bff',.35)}
if(st.invisDash){p.invis=st.invisDash;p.invisShot=true;part(p.x,p.y,'#a86bff',14,95,.4,1);
 ring(p.x,p.y,3,20,'#a86bff',.35);float(p.x,p.y-20,'НЕВИДИМ','#a86bff',1)}
if(st.aegis)p.aegisOut=.6;
p.inv=Math.max(p.inv,.28);A.dash();shake(2);part(p.x,p.y,p.col,10,90,.3,1);ring(p.x,p.y,3,18,p.col,.25)}
var groupCounter=0,groupAnchor={};
function pushShieldGroup(at){var size=randi(3,4),gid=++groupCounter;for(var i=0;i<size;i++)G.queue.push({type:'shielder',at:at+i*.08,group:gid,slot:i})}
function levelTypeName(t){return t==='std'?'СЕКТОР':t==='bomb'?'БОМБЕЖКА':t==='snipe'?'ПОД ПРИЦЕЛОМ':t==='laser'?'ЛАЗЕР-ТАГ':t==='mystery'?'ТАИНСТВЕННЫЙ':t==='dark'?'ТЁМНЫЙ МИР':t==='rand'?'СЛУЧАЙНЫЙ':t==='boss'?'БОСС':''}
function buildWave(node){G.queue=[];groupAnchor={};var t=.5,type=node.type;
if(type==='boss'){G.queue.push({type:'boss',boss:node.boss,at:.8});
var adds=Math.round((4+Math.floor(G.wave/3))*(isCoop()?1.5:1));
for(var i=0;i<adds;i++)G.queue.push({type:i%4===3?'shooter':'grunt',at:2.2+i*.5});
if(G.wave>=10)pushShieldGroup(5);if(G.wave>=15)G.queue.push({type:'sniper',at:7});
if(G.wave>=20)G.queue.push({type:'medic',at:6});if(G.wave>=25)G.queue.push({type:'emitter',at:8});return}
if(type==='dark'){G.queue.push({type:'dark',at:1.2});return}
var mp=isCoop()?1.5:1,budget=(6+G.wave*2.4)*D.budget*mp,pool=[['grunt',1]];
if(type==='bomb')pool=[['medic',3.5]];
else if(type==='laser')pool=[['emitter',4]];
else if(type==='snipe'){pool=[['sniper',2],['sniper',2],['sniper',2],['shielder',3],['medic',3.5]];
for(var s0=0;s0<5;s0++)G.queue.push({type:'sniper',at:.4+s0*.25})}
else if(type==='mystery'){if(Math.random()<.45)pool=[];else pool=[['grunt',1],['shooter',2],['splitter',2.5]]}
else if(type==='rand'&&G.event==='swarm')pool=[['clone',.5],['mini',.5]];
else if(type==='rand'&&G.event==='calm')pool=[];
else{if(G.wave>=2)pool.push(['shooter',2]);if(G.wave>=3)pool.push(['splitter',2.5]);
if(G.wave>=4){pool.push(['tank',4]);pool.push(['sniper',3])}
if(G.wave>=5)pool.push(['medic',3.5]);
if(G.wave>=6)pool.push(['ram',2]);
if(G.wave>=7)pool.push(['lgun',3]);
if(G.wave>=8){pool.push(['emitter',4]);pool.push(['mirror',3])}
if(G.wave>=10)pool.push(['brood',4]);
if(G.wave>=12){pool.push(['shielder',3]);pool.push(['jammer',3.5])}}
if(type==='mystery'&&G.lastBossKind&&Math.random()<.35)G.queue.push({type:'ghost',boss:G.lastBossKind,at:1.5});
if(!pool.length){for(var s=0;s<8*lootX();s++)spawnShard(rand(AR.x+60,AR.x+AR.w-60),rand(AR.y+60,AR.y+AR.h-60));return}
var guard=0,hasShield=false,hasSniper=false;
var groups=(type==='snipe'?1:G.wave>=6?1+Math.floor((G.wave-6)/7):0);
for(var g=0;g<groups;g++){pushShieldGroup(t+g*2.2);hasShield=true;budget-=6}
while(budget>0&&guard++<170){var av=pool.filter(function(p){return p[1]<=budget+.5});if(!av.length)break;
var gs=randi(1,Math.min(5,2+Math.floor(G.wave/5)));
for(i=0;i<gs;i++){var p=pick(av);budget-=p[1];if(p[0]==='sniper')hasSniper=true;
if(p[0]==='shielder'){pushShieldGroup(t);hasShield=true}else G.queue.push({type:p[0],at:t+i*rand(.14,.3)})}
t+=rand(.75,1.5)*clamp(1.2-G.wave*.02,.5,1.2)}
if(hasShield&&G.wave>=4&&!hasSniper)G.queue.push({type:'sniper',at:t+.5});
G.queue.sort(function(a,b){return a.at-b.at})}
function setArena(w,h){G.arena={w:w,h:h};AR.w=w;AR.h=h;floorCanvas=makeFloor(w,h)}
function startLevel(node){G.wave=node.d;G.waveT=0;G.active=true;G.portal=null;G.portalCharge=0;G.event=null;
var type=node.type;
if(type==='bomb')setArena(512,384);
else if(type==='mystery')setArena(1280,360);
else setArena(640,480);
if(type==='rand'){if(Math.random()<.5){var t=pick(G.wave>=10?['std','bomb','snipe','mystery','laser']:G.wave>=6?['std','bomb','snipe','mystery']:['std','mystery']);node.type=t;G.lootMult=1.5;
if(t==='bomb')setArena(512,384);else if(t==='mystery')setArena(1280,360);else setArena(640,480)}
else{G.lootMult=2;G.event=pick(['gold','meteor','swarm','calm'])}}
else G.lootMult=(type==='std')?1:1.5;
G.musicMode=type==='boss'?'boss':type==='bomb'?'fast':type==='snipe'?'tense':type==='laser'?'tense':type==='mystery'?'ambient':type==='dark'?'ominous':'dynamic';
G.enemies=[];G.bul=[];G.ebul=[];G.erock=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];G.mines=[];G.wells=[];G.turrets=[];G.phantoms=[];G.chronoFields=[];
G.drops=[];G.queue=[];G.boss=null;G.twinsLink=false;
for(var i=0;i<PL.length;i++){var p=PL[i];p.x=AR.w/2+(i?14:-14);p.y=AR.h/2;p.vx=0;p.vy=0;p.stun=0;p.trapped=0;p.invis=0;p.invisShot=false;p.jammed=false;p.swingT=0;
p.aegisR=p.stats?p.stats.aegisR||24:24;p.input.dash=false;p.input.weapon=false;p.lastSeen.x=p.x;p.lastSeen.y=p.y;if(p.hp>0)p.inv=Math.max(p.inv,1)}
G.splitOn=false;centerCam(true);buildWave(node);
if(node.type==='dark'){G.glitch=2.4;bannerDread(pick(DREAD));A.dread();flash(.35,'#a86bff');shake(7)}
else{var label=node.type==='boss'?(BOSS_NAMES[node.boss]||'БОСС'):levelTypeName(node.type);
banner(label,node.type==='boss'?'УНИЧТОЖЬ ЯДРО':'ЗАЧИСТИ СЕКТОР');
if(node.type==='boss')A.bossIn();else A.wave()}
$('#cWave').textContent=G.wave;popChip('.chip.w');setState('play')}
function updateSpawns(){while(G.queue.length&&G.queue[0].at<=G.waveT&&G.enemies.length<(isCoop()?46:32)){var q=G.queue.shift();
if(q.type==='boss'){
 if(q.boss==='twins'){
  var ec=makeBoss('twins',AR.w*.6,AR.h*.4,false);G.enemies.push(ec);G.boss=ec;
  var ag=makeEnemy('aegis',AR.w*.72,AR.h*.62);G.enemies.push(ag);
  $('#bossbar').classList.add('on');$('#bossName').textContent=ec.bossName;G.twinsLink=true;
  banner('ЭХО И ЭГИДА','ОТТАЛКИВАЙ ЩИТОНОСЦА ВЫСТРЕЛАМИ · РАЗОРВИ СВЯЗЬ');
 }else{var e=makeBoss(q.boss,AR.w/2,AR.y+60,false);G.enemies.push(e);G.boss=e;$('#bossbar').classList.add('on');$('#bossName').textContent=e.bossName}}
else if(q.type==='ghost'){var g=makeBoss(q.boss,AR.w/2,AR.y+60,true);G.enemies.push(g);G.boss=g;$('#bossbar').classList.add('on');$('#bossName').textContent=g.bossName}
else if(q.type==='dark'){var dk=makeEnemy('dark',AR.w/2,AR.y+80);G.enemies.push(dk);G.boss=dk;$('#bossbar').classList.add('on');$('#bossName').textContent=dk.bossName;ring(dk.x,dk.y,4,34,'#a86bff',.6)}
else if(q.type==='shielder'&&q.group!=null){if(!groupAnchor[q.group])groupAnchor[q.group]=edge();var a=groupAnchor[q.group],ang=q.slot*TAU/4;
spawnAt('shielder',clamp(a.x+Math.cos(ang)*11,AR.x+EDGE,AR.x+AR.w-EDGE),clamp(a.y+Math.sin(ang)*11,AR.y+EDGE,AR.y+AR.h-EDGE),{group:q.group,slot:q.slot})}
else spawn(q.type)}}
function waveClear(){G.active=false;G.boss=null;$('#bossbar').classList.remove('on');
var bonus=100+G.wave*35;addScore(bonus);var sh=3+Math.floor(G.wave/2);for(var i=0;i<PL.length;i++)PL[i].shards+=sh;A.up();
var node=getNode(G.curNode);
if(node&&node.type==='boss'&&node.boss==='hive'){winRun();return}
G.portal={x:G.lastKill.x,y:G.lastKill.y,r:12,t:0};G.portalCharge=0;A.portal();
float(G.portal.x,G.portal.y-16,'ПОРТАЛ','#22e6ff',1)}
function getNode(id){if(!G.map)return null;for(var d=0;d<G.map.length;d++)for(var i=0;i<G.map[d].length;i++)if(G.map[d][i].id===id)return G.map[d][i];return null}
function genMap(){G.map=[];var id=1;G.bossPool=BOSS_POOL.slice().sort(function(){return Math.random()-.5});
var bossIdx=0,placedDark=false,placedLaser=false;
for(var d=1;d<=MAX_WAVE;d++){var nodes=[];
if(d===MAX_WAVE)nodes=[{id:id++,d:d,type:'boss',boss:'hive',row:0}];
else if(BOSS_DEPTHS.indexOf(d)>=0)nodes=[{id:id++,d:d,type:'boss',boss:G.bossPool[bossIdx++]||'guardian',row:0}];
else{var n=d===1?1:randi(2,3);
for(var i=0;i<n;i++){var t;
if(CHEAT.dark){t='dark';placedDark=true}
else if(d>=16&&!placedDark&&Math.random()<.28){t='dark';placedDark=true}
else if(d>=10&&!placedLaser&&Math.random()<.3){t='laser';placedLaser=true}
else if(d<6)t=pick(['std','std','std','mystery','rand']);
else if(d<10)t=pick(['std','std','bomb','snipe','mystery','rand']);
else t=pick(['std','std','bomb','snipe','mystery','rand','laser']);
nodes.push({id:id++,d:d,type:t,row:i})}}
G.map.push(nodes)}
for(d=0;d<G.map.length-1;d++){var cur=G.map[d],nxt=G.map[d+1];
for(i=0;i<cur.length;i++){cur[i].next=[];var j=Math.round(i*(nxt.length-1)/Math.max(1,cur.length-1));
cur[i].next.push(nxt[j].id);if(nxt[j+1]&&Math.random()<.6)cur[i].next.push(nxt[j+1].id);if(nxt[j-1]&&Math.random()<.4)cur[i].next.push(nxt[j-1].id)}
for(i=0;i<nxt.length;i++){var has=false;for(var c=0;c<cur.length;c++)if(cur[c].next.indexOf(nxt[i].id)>=0)has=true;
if(!has)cur[Math.min(cur.length-1,Math.round(i*(cur.length-1)/Math.max(1,nxt.length-1)))].next.push(nxt[i].id)}}
G.curNode=G.map[0][0].id;G.mapSel=0}
function reachableNodes(){var cur=getNode(G.curNode);if(!cur||!cur.next)return[];return cur.next.map(getNode).filter(Boolean)}
function trySelectNode(id){if(NET.mode==='guest')return;
var reach=reachableNodes();var node=null;for(var i=0;i<reach.length;i++)if(reach[i].id===id)node=reach[i];
if(!node)return;selectNode(node)}
function selectNode(node){G.pendingNode=node;G.curNode=node.id;G.travel=true;G.travelT=0;G.travelDone=false;G.menuOpened=false;G.postT=0;setState('travel')}
function enterPortal(){G.portal=null;G.portalCharge=0;var node=getNode(G.curNode);
if(node&&node.type==='boss'){setState('shop');buildShop()}
else{setState('map');G.mapSel=0;G.mapCam=clamp((node?node.d:1)*70-W/3,0,MAX_WAVE*70-W+80)}}
function openUp(){for(var i=0;i<PL.length;i++){PL[i].pickPhase=0;PL[i].padSel=0;if(PL[i].hp>0){PL[i].ready=false;rollFor(PL[i])}else PL[i].ready=true}
setState('up');G.padSel=0;renderCards();
$('#upEye').textContent='ПЕРЕЛЁТ · '+(G.pendingNode?(G.pendingNode.type==='boss'?(BOSS_NAMES[G.pendingNode.boss]||'БОСС'):levelTypeName(G.pendingNode.type)):'');
if(NET.mode==='host')sendUpView()}
function baseCap(k){for(var i=0;i<UPS.length;i++)if(UPS[i].k===k)return UPS[i].cap;return 3}
function upByKey(k){for(var i=0;i<UPS.length;i++)if(UPS[i].k===k)return UPS[i];return null}
function upgradeCost(u,p){var lv=p.lvl[u.k]||0;if(u.k==='dash'&&lv>=3)return 100;if(u.cost)return u.cost;return 0}
function moduleFits(u,ship){
var noBullets=(ship==='bomber'||ship==='reaper'||ship==='groza');
var single=(ship==='sniper');
if(u.k==='fan'&&(noBullets||single))return false;
if(u.k==='pierce'&&(noBullets||single))return false;
if(u.k==='kir'&&ship==='groza')return false;
if(u.k==='rate'&&ship==='groza')return false;
if(ship==='chronos'&&(u.weapon||u.req==='rocket'||u.req==='wave'||u.req==='beam'))return false;
return true}
function rollFor(p){var L=p.lvl,mm=metaOf(p),pool=UPS.filter(function(u){
if(u.ship&&u.ship!==p.ship)return false;
if(!moduleFits(u,p.ship))return false;
if((L[u.k]||0)>=u.cap)return false;
if(LOCKED.indexOf(u.k)>=0&&mm.unlocked.indexOf(u.k)<0)return false;
if(u.gold){var need=L[u.req]||0;if(need<baseCap(u.req))return false;
if((u.req==='rocket'||u.req==='wave'||u.req==='beam')&&L.weapon!==u.req)return false;return !L[u.k]}
if(u.weapon&&L.weapon&&u.k!==L.weapon)return false;return true});
p.offer=[];var guard=0;
var own=null;for(var q=0;q<UPS.length;q++)if(UPS[q].ship===p.ship&&(L[UPS[q].k]||0)<UPS[q].cap)own=UPS[q];
if(own&&Math.random()<.5)p.offer.push(own);
while(p.offer.length<Math.min(3,pool.length)&&guard++<80){var u=pick(pool);if(p.offer.indexOf(u)<0)p.offer.push(u)}}
function upView(p){return{offer:p.offer.map(function(u){return u.k}),shards:p.shards,dual:p.dual,phase:p.pickPhase,ready:p.ready,lvl:p.lvl,hp:p.hp,max:p.max}}
function sendUpView(){if(NET.mode==='host'&&NET.connected)netSend({t:'upview',v:upView(P2)})}
function applyUpView(v){P2.dual=v.dual;P2.pickPhase=v.phase;P2.ready=v.ready;P2.lvl=v.lvl;P2.hp=v.hp;P2.max=v.max;P2.shards=v.shards;
P2.offer=v.offer.map(upByKey).filter(Boolean);recalcPlayer(P2);renderCards()}
function ownsColumn(pi){if(NET.mode==='guest')return pi===1;if(isLocal())return true;return pi===0}
function revive(by,who){if(G.state!=='up'||who.hp>0||by.hp<=0)return;
if(by.shards<REVIVE_COST)return;
by.shards-=REVIVE_COST;who.hp=Math.round(who.max*.6);who.inv=2.5;who.ready=false;who.pickPhase=0;who.stun=0;who.trapped=0;who.invis=0;rollFor(who);
who.x=by.x+16;who.y=by.y;who.vx=0;who.vy=0;
A.revive();flash(.2,who.col);ring(by.x,by.y,4,46,who.col,.6);
if(NET.mode==='host')sendUpView();
G.shards=localPlayer().shards;renderCards();checkAdvance()}
function renderCards(){var el=$('#cards');el.innerHTML='';
var two=PL.length>1;
var wrap=document.createElement('div');wrap.className=two?'cols':'cols solo';
PL.forEach(function(p,pi){
var col=document.createElement('div');col.className='pcol';col.style.borderColor=p.col;
var head=document.createElement('div');head.className='phead';head.style.color=p.col;
head.innerHTML='<span>ИГРОК '+(pi+1)+'</span><em>'+(p.hp<=0?'ПАЛ':p.ready?'ГОТОВ':'ВЫБИРАЕТ')+'</em>';
col.appendChild(head);
var st=document.createElement('div');st.className='pstat';
st.innerHTML='<span>◆ <b>'+p.shards+'</b></span><span>⬡ <b>'+bankOf(p)+'</b></span><span>'+shipLabel(p.ship)+'</span>';
col.appendChild(st);
if(!ownsColumn(pi)){var lock=document.createElement('div');lock.className='sub';lock.style.margin='0';lock.textContent='управляет другой игрок';col.appendChild(lock)}
if(p.hp<=0){var d=document.createElement('div');d.className='sub';d.textContent='Корпус разрушен. Напарник может воскресить тебя за '+REVIVE_COST+'◆.';col.appendChild(d)}
else{
p.offer.forEach(function(u,i){var lv=p.lvl[u.k]||0,b=document.createElement('button');var cost=upgradeCost(u,p);
b.className='card'+((u.gold||cost||u.ship)?' gold':'');b.type='button';b.setAttribute('data-own',pi);
if(p.ready||!ownsColumn(pi))b.disabled=true;
var pips='';for(var j=0;j<u.cap;j++)pips+='<i class="'+(j<lv?'f':'')+'"></i>';
b.innerHTML='<span class="num">'+(i+1)+'</span><h4>'+u.n+'</h4><p>'+u.d+(cost?' · '+cost+'◆':'')+'</p><div class="lv">'+pips+'</div>';
b.insertBefore(iconCanvas(u.k,u.col,4),b.firstChild);
b.addEventListener('click',function(){if(NET.mode==='guest')netSend({t:'choose',i:i});else choose(i,p)});
col.appendChild(b)});
var row=document.createElement('div');row.className='upshop';
row.innerHTML='<span class="upsh">◆ '+p.shards+'</span>';
function mk(label,fn,dis){var b=document.createElement('button');b.className='sb';b.textContent=label;b.setAttribute('data-own',pi);
b.disabled=!!dis||p.ready||!ownsColumn(pi);
b.addEventListener('click',function(){if(NET.mode==='guest'&&pi===1)netSend({t:'shop',a:fn});else shopAction(fn,p)});return b}
row.appendChild(mk('РЕМОНТ 12','repair',p.shards<12||p.hp>=p.max));
row.appendChild(mk('ПЕРЕБРОС 6','reroll',p.shards<6));
if(!p.dual)row.appendChild(mk('ДВОЙНОЙ 350','dual',p.shards<350));
row.appendChild(mk(p.ready?'ГОТОВО':'ПРОПУСТИТЬ +75','skip',false));
if(p.dual&&p.pickPhase===1&&!p.ready)row.appendChild(mk('ЗАВЕРШИТЬ','done',false));
col.appendChild(row)}
var other=PL[1-pi];
if(other&&other.hp<=0&&p.hp>0){var rb=document.createElement('button');rb.className='btn mag revive';rb.type='button';
rb.setAttribute('data-own',pi);rb.textContent='ВОСКРЕСИТЬ ИГРОКА '+(2-pi)+' · '+REVIVE_COST+'◆';
rb.disabled=p.shards<REVIVE_COST||!ownsColumn(pi);
rb.addEventListener('click',function(){if(NET.mode==='guest'&&pi===1)netSend({t:'revive'});else revive(p,other)});
col.appendChild(rb)}
wrap.appendChild(col)});
el.appendChild(wrap);
$('#upHint').textContent=two?'Каждый управляет своей колонкой. Список прокручивается.':'Клавиши 1·2·3. Осколки ◆ на ремонт и переброску.';
$('#upShards').textContent=localPlayer().shards}
function shipLabel(id){for(var i=0;i<SHIPS.length;i++)if(SHIPS[i].id===id)return SHIPS[i].n;return 'МАРШАЛ'}
function applyUpgrade(u,p){var L=p.lvl;if(u.weapon&&!L.weapon)L.weapon=u.k;L[u.k]=(L[u.k]||0)+1;recalcPlayer(p);
if(u.k==='armor')healPlayer(p,25);A.up();flash(.15,'#22e6ff');ring(p.x,p.y,3,44,'#9dff3c',.5);part(p.x,p.y,'#9dff3c',16,90,.5,1)}
function checkAdvance(){if(NET.mode==='guest'||G.state!=='up')return;
var alive=PL.filter(function(p){return p.hp>0});
var done=alive.length>0&&alive.every(function(p){return p.ready});
if(done){G.travelDone=true;setState('travel')}else{renderCards();sendUpView()}}
function choose(i,p){if(G.state!=='up')return;p=p||localPlayer();if(p.ready||p.hp<=0)return;var u=p.offer[i];if(!u)return;
var cost=upgradeCost(u,p),total=cost+((p.dual&&p.pickPhase===1)?50:0);if(p.shards<total)return;p.shards-=total;
if(p.dual&&p.pickPhase===1){applyUpgrade(u,p);p.ready=true}else{applyUpgrade(u,p);if(p.dual){p.pickPhase=1;rollFor(p)}else p.ready=true}
if(p===P2&&NET.mode==='host')sendUpView();
G.shards=localPlayer().shards;renderCards();checkAdvance()}
function shopAction(a,p){if(G.state!=='up'||p.ready||p.hp<=0)return;
if(a==='repair'){if(p.shards<12||p.hp>=p.max)return;p.shards-=12;healPlayer(p,35);A.heal()}
else if(a==='reroll'){if(p.shards<6)return;p.shards-=6;rollFor(p);A.tone(600,.09,'square',.08,1.4,0,'ui')}
else if(a==='dual'){if(p.shards<350||p.dual)return;p.shards-=350;p.dual=true;A.up()}
else if(a==='skip'){p.shards+=75;A.pick(3);p.ready=true}else if(a==='done'){p.ready=true}
if(p===P2&&NET.mode==='host')sendUpView();
G.shards=localPlayer().shards;renderCards();checkAdvance()}
function initShopButtons(){$('#bToMap').addEventListener('click',function(){setState('map');G.mapSel=0;var n=getNode(G.curNode);G.mapCam=clamp((n?n.d:1)*70-W/3,0,MAX_WAVE*70-W+80)})}
function metaBuy(kind,k,seat){
var mm=seatMeta(seat),pl=(seat===1?P2:P);
function pay(n){if(mm.frag<n)return false;mm.frag-=n;pl.frags=mm.frag;saveMeta();return true}
if(kind==='perm'){var lv=mm.perm[k]||0,pm=null;for(var i=0;i<PERMS.length;i++)if(PERMS[i].k===k)pm=PERMS[i];
if(lv>=pm.max)return;if(!pay(permCost(mm,k)))return;mm.perm[k]=lv+1}
else if(kind==='bp'){if(!pay(BP_COST))return;var bi=mm.bp.indexOf(k);if(bi>=0)mm.bp.splice(bi,1);if(mm.unlocked.indexOf(k)<0)mm.unlocked.push(k)}
else if(kind==='ship'){if(mm.ships.indexOf(k)>=0)return;
if(shipNeedsBp(k)&&mm.bp.indexOf('ship:'+k)<0)return;
if(!pay(shipPrice(k)))return;mm.ships.push(k);
var sb=mm.bp.indexOf('ship:'+k);if(sb>=0)mm.bp.splice(sb,1);
var iv='ship:'+k;if(mm.invest[iv])delete mm.invest[iv]}
else if(kind==='invperm'){if(!pay(1))return;mm.invest[k]=(mm.invest[k]||0)+1;
if(mm.invest[k]>=permCost(mm,k)){mm.invest[k]=0;mm.perm[k]=(mm.perm[k]||0)+1}}
else if(kind==='invbp'){if(!pay(1))return;mm.invest[k]=(mm.invest[k]||0)+1;
if(mm.invest[k]>=BP_COST){mm.invest[k]=0;var j=mm.bp.indexOf(k);if(j>=0)mm.bp.splice(j,1);if(mm.unlocked.indexOf(k)<0)mm.unlocked.push(k)}}
else if(kind==='invship'){var key='ship:'+k;if(mm.bp.indexOf(key)<0)return;if(!pay(1))return;
mm.invest[key]=(mm.invest[key]||0)+1;
if(mm.invest[key]>=shipPrice(k)){mm.invest[key]=0;mm.ships.push(k);var q=mm.bp.indexOf(key);if(q>=0)mm.bp.splice(q,1)}}
saveMeta();recalc();G.frags=localPlayer().frags;buildShop();buildTitleCols();
if(NET.mode==='host')netSend({t:'metaok'});
A.up()}
function metaBuyAction(kind,k,seat){
if(NET.mode==='guest'){netSend({t:'metabuy',kind:kind,k:k});return}
var mm=seatMeta(seat);
var cost=(kind==='invship'||kind==='invperm'||kind==='invbp')?1:(kind==='perm'?permCost(mm,k):kind==='bp'?BP_COST:shipPrice(k));
if(mm.frag<cost){A.tone(160,.12,'square',.08,.6,0,'ui');return}
metaBuy(kind,k,seat)}
function buildShop(){
var root=$('#shopCols');if(!root)return;
var seats=isLocal()?[0,1]:[0];
root.className=seats.length>1?'cols':'cols solo';root.innerHTML='';
seats.forEach(function(seat){
var mm=seatMeta(seat),pl=seat===1?P2:P;
var col=document.createElement('div');col.className='pcol';col.style.borderColor=pl.col;
var head=document.createElement('div');head.className='phead';head.style.color=pl.col;
head.innerHTML='<span>ИГРОК '+(seat+1)+'</span><em>⬡ '+mm.frag+'</em>';col.appendChild(head);
PERMS.forEach(function(pm){var lv=mm.perm[pm.k]||0,cost=permCost(mm,pm.k),maxed=lv>=pm.max,inv=mm.invest[pm.k]||0;
var row=document.createElement('div');row.className='mrow';
row.innerHTML='<div class="mi"><b>'+pm.n+'</b><s>'+pm.d+'</s><s style="color:var(--blue)">вложено '+inv+'/'+cost+'</s></div><span class="ml">'+lv+'/'+pm.max+'</span>';
var bi=document.createElement('button');bi.className='sb';bi.textContent='+1';bi.setAttribute('data-own',seat);bi.disabled=maxed||mm.frag<1;
bi.addEventListener('click',function(){metaBuyAction('invperm',pm.k,seat)});
var b=document.createElement('button');b.className='sb gold';b.textContent=maxed?'МАКС':cost;b.setAttribute('data-own',seat);b.disabled=maxed||mm.frag<cost;
b.addEventListener('click',function(){metaBuyAction('perm',pm.k,seat)});
row.appendChild(bi);row.appendChild(b);col.appendChild(row)});
var sh=document.createElement('div');sh.className='set';sh.innerHTML='<span>КОРАБЛИ</span>';
SHIPS.forEach(function(s){if(s.cost===0)return;var owned=mm.ships.indexOf(s.id)>=0;
var needBp=shipNeedsBp(s.id),hasBp=mm.bp.indexOf('ship:'+s.id)>=0;
var row=document.createElement('div');row.className='mrow';
var sub=owned?'куплен':(needBp&&!hasBp?'нужен чертёж из босса':s.d);
row.innerHTML='<div class="mi"><b>'+s.n+'</b><s>'+sub+'</s></div>';
var b=document.createElement('button');b.className='sb gold';b.setAttribute('data-own',seat);
b.textContent=owned?'ЕСТЬ':(needBp&&!hasBp?'ЧЕРТЁЖ':s.cost);
b.disabled=owned||(needBp&&!hasBp)||mm.frag<s.cost;
b.addEventListener('click',function(){metaBuyAction('ship',s.id,seat)});
row.appendChild(b);sh.appendChild(row)});
col.appendChild(sh);
var shipBps=mm.bp.filter(function(x){return x.indexOf('ship:')===0});
if(shipBps.length){
var sb=document.createElement('div');sb.className='set';sb.innerHTML='<span>ЧЕРТЕЖИ КОРАБЛЕЙ</span>';
shipBps.forEach(function(key){var id=key.slice(5),price=shipPrice(id),inv=mm.invest[key]||0;
var row=document.createElement('div');row.className='mrow';
row.innerHTML='<div class="mi"><b>'+shipLabel(id)+'</b><s>'+shipDesc(id)+'</s><s style="color:var(--blue)">вложено '+inv+'/'+price+'</s></div>';
var bi=document.createElement('button');bi.className='sb';bi.textContent='+1';bi.setAttribute('data-own',seat);bi.disabled=mm.frag<1;
bi.addEventListener('click',function(){metaBuyAction('invship',id,seat)});
var b=document.createElement('button');b.className='sb gold';b.textContent=price;b.setAttribute('data-own',seat);b.disabled=mm.frag<price;
b.addEventListener('click',function(){metaBuyAction('ship',id,seat)});
row.appendChild(bi);row.appendChild(b);sb.appendChild(row)});
col.appendChild(sb)}
var bt=document.createElement('div');bt.className='set';bt.innerHTML='<span>ЧЕРТЕЖИ МОДУЛЕЙ</span>';
var modBps=mm.bp.filter(function(x){return x.indexOf('ship:')!==0});
if(!modBps.length){var e=document.createElement('div');e.className='sub';e.textContent='Чертежей нет. Падают из боссов и редко из мобов.';bt.appendChild(e)}
modBps.forEach(function(k){var u=upByKey(k);if(!u)return;var inv=mm.invest[k]||0;
var row=document.createElement('div');row.className='mrow';
row.innerHTML='<div class="mi"><b>'+u.n+'</b><s>'+u.d+'</s><s style="color:var(--blue)">вложено '+inv+'/'+BP_COST+'</s></div>';
var bi=document.createElement('button');bi.className='sb';bi.textContent='+1';bi.setAttribute('data-own',seat);bi.disabled=mm.frag<1;
bi.addEventListener('click',function(){metaBuyAction('invbp',k,seat)});
var b=document.createElement('button');b.className='sb gold';b.textContent=BP_COST;b.setAttribute('data-own',seat);b.disabled=mm.frag<BP_COST;
b.addEventListener('click',function(){metaBuyAction('bp',k,seat)});
row.appendChild(bi);row.appendChild(b);bt.appendChild(row)});
col.appendChild(bt);root.appendChild(col)});
$('#shopFrags').textContent=wallet(0)}
function buildTitleCols(){
var root=$('#titleCols');if(!root)return;
var seats=isLocal()?[0,1]:[0];
root.className=seats.length>1?'cols':'cols solo';root.innerHTML='';
seats.forEach(function(seat){
var mm=seatMeta(seat),pl=seat===1?P2:P;
var col=document.createElement('div');col.className='pcol';col.style.borderColor=pl.col;
var head=document.createElement('div');head.className='phead';head.style.color=pl.col;
head.innerHTML='<span>ИГРОК '+(seat+1)+'</span><em>⬡ '+mm.frag+'</em>';col.appendChild(head);
var pow=0;for(var k in mm.perm)pow+=mm.perm[k];
var st=document.createElement('div');st.className='pstat';
st.innerHTML='<span>вечных улучшений <b>'+pow+'</b></span><span>модулей <b>'+mm.unlocked.length+'/'+LOCKED.length+'</b></span><span>кораблей <b>'+mm.ships.length+'/'+SHIPS.length+'</b></span>';
col.appendChild(st);
var sl=document.createElement('div');sl.className='set';sl.style.marginTop='4px';sl.innerHTML='<span>КОРАБЛЬ</span>';
var pills=document.createElement('div');pills.className='pills';
SHIPS.forEach(function(s){var owned=mm.ships.indexOf(s.id)>=0;
var needBp=shipNeedsBp(s.id),hasBp=mm.bp.indexOf('ship:'+s.id)>=0;
var b=document.createElement('button');b.className='pill'+(mm.ship===s.id?' on':'');b.type='button';b.setAttribute('data-own',seat);
var note=owned?(s.id==='std'?'базовый':'куплен'):(needBp?(hasBp?'чертёж найден · '+s.cost+'⬡ у торговца':'нужен чертёж из босса'):'закрыт · '+s.cost+'⬡ у торговца');
b.innerHTML=s.n+'<small>'+note+'</small>';
b.disabled=!owned;
b.addEventListener('click',function(){if(!owned)return;mm.ship=s.id;saveMeta();
pl.ship=s.id;pl.lvl=shipStart(s.id);recalcPlayer(pl);buildTitleCols();A.init();A.tone(520,.07,'square',.08,1.3,0,'ui')});
pills.appendChild(b)});
sl.appendChild(pills);col.appendChild(sl);
var info=document.createElement('div');info.className='sub';info.style.margin='0';
info.textContent=shipDesc(mm.ship);col.appendChild(info);
root.appendChild(col)});
syncBest()}
function shipDesc(id){for(var i=0;i<SHIPS.length;i++)if(SHIPS[i].id===id)return SHIPS[i].d;return ''}
function applyDarkCheat(){if(!G.map)return;var cur=getNode(G.curNode),cd=cur?cur.d:0;
for(var d=0;d<G.map.length;d++)for(var i=0;i<G.map[d].length;i++){var n=G.map[d][i];
if(n.type==='boss'||n.d<=cd)continue;n.type=CHEAT.dark?'dark':'std'}}
function syncCheatUI(){var box=$('#sPause .box');if(!box)return;var wrap=$('#cheatRow');
if(!CHEAT.god&&!CHEAT.dark){if(wrap&&wrap.parentNode)wrap.parentNode.removeChild(wrap);return}
if(!wrap){wrap=document.createElement('div');wrap.id='cheatRow';wrap.className='row';box.appendChild(wrap)}
wrap.innerHTML='';
if(CHEAT.god){var b=document.createElement('button');b.className='btn';b.type='button';b.setAttribute('data-own','0');b.textContent='БЕССМЕРТИЕ: ВКЛ';
b.addEventListener('click',function(){CHEAT.god=false;recalc();syncCheatUI()});wrap.appendChild(b)}
if(CHEAT.dark){var b2=document.createElement('button');b2.className='btn';b2.type='button';b2.setAttribute('data-own','0');b2.textContent='ТЁМНЫЙ МИР: ВКЛ';
b2.addEventListener('click',function(){CHEAT.dark=false;applyDarkCheat();syncCheatUI()});wrap.appendChild(b2)}}
function wipeProgress(){META=metaDefault();META2=metaDefault();saveMeta();storeSet('best',{score:0,wave:0});G.best={score:0,wave:0};
P.lvl={};P2.lvl={};P.shards=0;P2.shards=0;P.frags=0;P2.frags=0;G.frags=0;G.shards=0;
recalc();buildTitleCols();buildShop();syncBest()}
function tryCheat(){var el=$('#mpCode');if(!el)return false;var raw=(el.value||'').trim();if(!raw)return false;
var s=raw.toLowerCase(),m;
if(s==='god666'){CHEAT.god=!CHEAT.god;recalc();syncCheatUI();el.value='';return true}
if(s==='darkworld8'){CHEAT.dark=!CHEAT.dark;applyDarkCheat();syncCheatUI();el.value='';return true}
if(s==='clear67'){wipeProgress();el.value='';return true}
if(s==='allships'){META.ships=SHIPS.map(function(x){return x.id});META2.ships=SHIPS.map(function(x){return x.id});saveMeta();buildTitleCols();buildShop();syncBest();el.value='';return true}
m=s.match(/^(\d+)fragments$/);if(m){var pl=localPlayer();addBank(pl,parseInt(m[1],10));G.frags=pl.frags;syncBest();buildShop();buildTitleCols();el.value='';return true}
m=s.match(/^(\d+)shard$/);if(m){var n=parseInt(m[1],10);
if(G.state==='title'){META.bonusShards=(META.bonusShards||0)+n;saveMeta()}
else{localPlayer().shards+=n;G.shards=localPlayer().shards}
el.value='';return true}
return false}
function screenToWorld(px,py){var z=G.zoom||1,cx=W/2,cy=H/2;
return{x:(px-cx)/z+cx+CAM.x,y:(py-cy)/z+cy+CAM.y}}
function mapClick(px,py){var wx=px+G.mapCam,wy=py;var reach=reachableNodes();
for(var i=0;i<reach.length;i++){var n=reach[i];var nx=60+n.d*70,ny=H/2+(n.row-(G.map[n.d-1].length-1)/2)*70;
if(hyp(wx-nx,wy-ny)<24){trySelectNode(n.id);return}}}
function initInput(canvas){var lastTapTime=0,lastTapSide='';
function onKeyDown(e){var tag=(e.target&&e.target.tagName)||'';if(tag==='INPUT')return;
musUnlock();
if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Slash'].indexOf(e.code)>=0)e.preventDefault();
var rep=e.repeat;keys[e.code]=true;A.init();A.resume();
if(e.code==='KeyM'&&!rep){toggleSound();return}
if((e.code==='KeyP'||e.code==='Escape')&&!rep){if(G.state==='play')pause();else if(G.state==='pause')resume();return}
if(e.code==='KeyR'&&!rep){if(G.state!=='title')newRun();return}
if((G.state==='title'||G.state==='over'||G.state==='win')&&(e.code==='Enter'||e.code==='Space')&&!rep&&!isLocal()){newRun();return}
if(G.state==='up'){var idx={Digit1:0,Digit2:1,Digit3:2}[e.code];
if(idx!==undefined&&!rep){if(NET.mode==='guest')netSend({t:'choose',i:idx});else choose(idx,P)}
var idx2={Digit8:0,Digit9:1,Digit0:2}[e.code];
if(idx2!==undefined&&!rep&&isLocal())choose(idx2,P2);return}
if(G.state==='play'){
if(e.code==='Space'&&!rep)LI.dash=true;
if(isLocal()){if(e.code==='Enter'&&!rep)K2.dash=true;
if((e.code==='Slash'||e.code==='Numpad0'||e.code==='ControlRight')&&!rep)K2.weapon=true}}}
function onKeyUp(e){keys[e.code]=false}
function onBlur(){for(var k in keys)keys[k]=false;resetSticks();activePtr={};mouseRightHeld=false;G.mapDrag.active=false;
LI.dash=false;LI.weapon=false;K2.dash=false;K2.weapon=false;
if(G.state==='play'&&NET.mode!=='guest'&&!isLocal())pause()}
function toLogical(e){var r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/canvas.SCALE,y:(e.clientY-r.top)/canvas.SCALE}}
function onDown(e){A.init();A.resume();musUnlock();activePtr[e.pointerId]=1;
try{canvas.setPointerCapture(e.pointerId)}catch(err){}
var p=toLogical(e);
if(G.state==='map'){G.mapDrag={active:true,startX:p.x,startCam:G.mapCam,moved:false,id:e.pointerId};return}
if(e.pointerType==='touch'){var side=p.x<W*.5?'L':'R',now=performance.now();
if(now-lastTapTime<300&&lastTapSide===side){if(side==='L')LI.dash=true;else LI.weapon=true;lastTapTime=0}else{lastTapTime=now;lastTapSide=side}
var s=side==='L'?sticks.move:sticks.aim;
if(s.id!==null&&s.id!==e.pointerId&&!activePtr[s.id])clearStick(s.id);
if(s.id===null){s.id=e.pointerId;s.ox=p.x;s.oy=p.y;s.dx=0;s.dy=0;s.m=0}}
else{mx=p.x;my=p.y;mouseT=G.t;if(e.button===0)LI.weapon=true;if(e.button===2){LI.dash=true;mouseRightHeld=true}}}
function onMove(e){var p=toLogical(e);
if(G.state==='map'&&G.mapDrag.active&&G.mapDrag.id===e.pointerId){var dx=p.x-G.mapDrag.startX;if(Math.abs(dx)>6)G.mapDrag.moved=true;
G.mapCam=clamp(G.mapDrag.startCam-dx,0,MAX_WAVE*70-W+80);return}
if(e.pointerType!=='touch'){mx=p.x;my=p.y;mouseT=G.t;return}
activePtr[e.pointerId]=1;
['move','aim'].forEach(function(k){var s=sticks[k];if(s.id!==e.pointerId)return;var dx=p.x-s.ox,dy=p.y-s.oy,d=Math.sqrt(dx*dx+dy*dy),max=22;
if(d>max){s.ox=p.x-dx/d*max;s.oy=p.y-dy/d*max;dx=dx/d*max;dy=dy/d*max}s.dx=dx/max;s.dy=dy/max;s.m=Math.min(Math.max(d/max,0),1)})}
function onUp(e){delete activePtr[e.pointerId];
if(G.state==='map'){if(G.mapDrag.active&&G.mapDrag.id===e.pointerId){var p=toLogical(e);if(!G.mapDrag.moved)mapClick(p.x,p.y);G.mapDrag.active=false}return}
if(e.pointerType==='touch')clearStick(e.pointerId);else if(e.button===2)mouseRightHeld=false}
window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',onBlur);
canvas.addEventListener('contextmenu',function(e){e.preventDefault()});
canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);
canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
canvas.addEventListener('lostpointercapture',function(e){delete activePtr[e.pointerId];clearStick(e.pointerId)});
window.addEventListener('pointerup',function(e){delete activePtr[e.pointerId];clearStick(e.pointerId)},true);
window.addEventListener('pointercancel',function(e){delete activePtr[e.pointerId];clearStick(e.pointerId)},true);
window.addEventListener('touchend',function(e){if(!e.touches||e.touches.length===0){resetSticks();activePtr={}}},true);
window.addEventListener('touchcancel',function(){resetSticks();activePtr={}},true);
canvas.addEventListener('wheel',function(e){if(G.state==='map'){e.preventDefault();G.mapCam=clamp(G.mapCam+e.deltaY*.5,0,MAX_WAVE*70-W+80)}},{passive:false});
var rb=$('#rbDash');
rb.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();A.init();A.resume();LI.dash=true;touchDashHeld=true;
try{rb.setPointerCapture(e.pointerId)}catch(err){}});
rb.addEventListener('pointerup',function(e){e.stopPropagation();touchDashHeld=false});
rb.addEventListener('pointercancel',function(){touchDashHeld=false});
rb.addEventListener('lostpointercapture',function(){touchDashHeld=false});
var rw=$('#rbWeapon');
rw.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();A.init();A.resume();LI.weapon=true;
try{rw.setPointerCapture(e.pointerId)}catch(err){}});
rw.addEventListener('pointerup',function(e){e.stopPropagation()});
document.addEventListener('pointerdown',function(){A.init();A.resume();musUnlock()},{once:true});
window.addEventListener('keydown',function(){musUnlock()},{once:true});
window.addEventListener('touchstart',function(){musUnlock()},{once:true,passive:true})}
function stickWatch(){['move','aim'].forEach(function(k){var s=sticks[k];if(s.id!==null&&!activePtr[s.id])clearStick(s.id)})}
function ownedButtons(root,seat){
return [].slice.call(root.querySelectorAll('button:not(:disabled),a.btn')).filter(function(b){
var o=b.getAttribute('data-own');
if(seat===1)return o==='1';
return o!=='1'})}
function markSel(btns,idx){for(var i=0;i<btns.length;i++){if(i===idx)btns[i].classList.add('padsel');else btns[i].classList.remove('padsel')}}
function clearSel(){var r=SCR[G.state];if(!r)return;var root=$(r);if(!root)return;
var l=root.querySelectorAll('.padsel');for(var i=0;i<l.length;i++)l[i].classList.remove('padsel')}
function navList(g,btns,owner){
if(!g.active||!btns.length)return;
if(owner.padSel>=btns.length)owner.padSel=0;
var before=owner.padSel;
if(g.down||g.right){owner.padSel=(owner.padSel+1)%btns.length;A.tone(520,.03,'square',.05,1,0,'ui')}
if(g.up||g.left){owner.padSel=(owner.padSel-1+btns.length)%btns.length;A.tone(520,.03,'square',.05,1,0,'ui')}
markSel(btns,owner.padSel);
if(before!==owner.padSel){try{btns[owner.padSel].scrollIntoView({block:'nearest'})}catch(e){}}
if(g.ok){btns[owner.padSel].click();A.tone(760,.05,'square',.07,1.2,0,'ui')}}
function padMenus(){
if(!GP.active&&!GP2.active){clearSel();return}
if(G.state==='map'){var g=GP;if(!g.active||NET.mode==='guest')return;
var reach=reachableNodes();if(!reach.length)return;
if(g.right||g.down)G.mapSel=(G.mapSel+1)%reach.length;
if(g.left||g.up)G.mapSel=(G.mapSel-1+reach.length)%reach.length;
G.mapSel=clamp(G.mapSel,0,reach.length-1);
var n=reach[G.mapSel];G.mapCam=clamp(60+n.d*70-W/2,0,MAX_WAVE*70-W+80);
if(g.ok)trySelectNode(n.id);return}
if(G.state==='up'){var root=$('#sUp');if(!root)return;
var pi0=NET.mode==='guest'?1:0;
navList(GP,ownedButtons(root,pi0),PL[pi0]||P);
if(isLocal())navList(GP2,ownedButtons(root,1),P2);
return}
if(G.state==='shop'||G.state==='title'){var sr=$(SCR[G.state]);if(!sr)return;
navList(GP,ownedButtons(sr,0),P);
if(isLocal())navList(GP2,ownedButtons(sr,1),P2);
if(G.state==='shop'&&GP.back)$('#bToMap').click();
return}
var sel=SCR[G.state];if(!sel||!GP.active)return;var box=$(sel);if(!box)return;
var btns=ownedButtons(box,0);if(!btns.length)return;
if(G.padSel>=btns.length)G.padSel=0;
var before=G.padSel;
if(GP.down||GP.right)G.padSel=(G.padSel+1)%btns.length;
if(GP.up||GP.left)G.padSel=(G.padSel-1+btns.length)%btns.length;
markSel(btns,G.padSel);
if(before!==G.padSel){try{btns[G.padSel].scrollIntoView({block:'nearest'})}catch(e){}}
if(GP.ok)btns[G.padSel].click();
if(GP.back&&G.state==='pause')resume()}
var starLayers=[],comets=[],bloomCv=null,bloomCtx=null,visualT=0;
function initBackground(ctx){starLayers=[];for(var L=0;L<3;L++){var arr=[],n=[46,32,20][L];for(var i=0;i<n;i++)arr.push({x:randi(0,W-1),y:randi(0,H-1),c:pick(THEME.stars),p:rand(0,TAU),s:L===2?2:1});starLayers.push(arr)}comets=[]}
function updateVisual(dt){visualT+=dt;if(G.glitch>0)G.glitch-=dt;
if(Math.random()<dt*.12&&comets.length<2){var e=Math.random()<.5;comets.push({x:e?rand(-40,W):rand(0,W),y:e?rand(0,H*.5):rand(-30,0),vx:rand(60,120)*(Math.random()<.5?-1:1),vy:rand(40,90),l:rand(1.2,2),m:2})}
for(var i=comets.length-1;i>=0;i--){var c=comets[i];c.l-=dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.l<=0)comets.splice(i,1)}}
function drawParallax(ctx,cam,vx,vy,vw,vh){ctx.save();ctx.beginPath();ctx.rect(vx,vy,vw,vh);ctx.clip();
for(var L=0;L<starLayers.length;L++){var depth=[.06,.14,.26][L],arr=starLayers[L];
for(var i=0;i<arr.length;i++){var st=arr[i],tw=.4+.6*Math.abs(Math.sin(visualT*(.8+L*.4)+st.p));ctx.globalAlpha=tw*(.35+L*.2);ctx.fillStyle=st.c;
var x=vx+(((Math.round(st.x-cam.x*depth)%vw)+vw)%vw),y=vy+(((Math.round(st.y-cam.y*depth)%vh)+vh)%vh);
ctx.fillRect(x,y,st.s,st.s)}}
ctx.globalAlpha=1;for(i=0;i<comets.length;i++){var c=comets[i],a=clamp(c.l/c.m,0,1);line(ctx,vx+c.x,vy+c.y,vx+c.x-c.vx*.12,vy+c.y-c.vy*.12,THEME.bloom,1,a*.5)}
ctx.restore()}
function setupBloom(){bloomCv=mkC(Math.max(1,Math.ceil(W/3)),Math.max(1,Math.ceil(H/3)));bloomCtx=bloomCv.getContext('2d')}
function applyBloom(ctx){if(!bloomOn||!bloomCv)return;var bw=bloomCv.width,bh=bloomCv.height;bloomCtx.clearRect(0,0,bw,bh);bloomCtx.drawImage(cv,0,0,bw,bh);
ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.34;try{ctx.filter='blur(2px)'}catch(e){}ctx.drawImage(bloomCv,0,0,W,H);ctx.filter='none';ctx.restore()}
function drawGlitch(ctx){if(G.glitch<=0)return;var a=clamp(G.glitch/2.4,0,1);
ctx.save();ctx.globalAlpha=a*.5;
for(var i=0;i<16;i++){var y=randi(0,H),h=randi(1,5),off=randi(-8,8);ctx.drawImage(cv,0,y,W,h,off,y,W,h)}
ctx.globalAlpha=a*.22;ctx.fillStyle='#ff2f4f';
for(i=0;i<40;i++)ctx.fillRect(randi(0,W),randi(0,H),randi(2,26),1);
ctx.globalAlpha=a*.16;ctx.fillStyle='#22e6ff';
for(i=0;i<24;i++)ctx.fillRect(randi(0,W),randi(0,H),randi(2,18),1);
ctx.restore()}
function drawChronoScreen(ctx){if(!chronoAnyGlobal())return;
var t=0;for(var i=0;i<G.chronoFields.length;i++)if(G.chronoFields[i].g)t=Math.max(t,G.chronoFields[i].t);
ctx.save();var a=clamp(t/3,0,1);
ctx.globalAlpha=.10*a;ctx.fillStyle='#4d8cff';ctx.fillRect(0,0,W,H);
ctx.globalAlpha=.55*a;ctx.lineWidth=2;
ctx.strokeStyle='#4d8cff';ctx.strokeRect(1,1,W-2,H-2);
ctx.strokeStyle='#ff2fb0';ctx.strokeRect(3,3,W-6,H-6);
ctx.globalAlpha=.9;txt(ctx,'ПОЛЕ ВРЕМЕНИ '+t.toFixed(1)+'С',W/2,H-30,'#4d8cff',13,'center');
ctx.restore()}
function drawTravel(ctx){ctx.fillStyle=THEME.css['--void'];ctx.fillRect(0,0,W,H);
var cx=W/2,cy=H/2;
for(var i=0;i<60;i++){var a=(i/60)*TAU+visualT*.6,r=((visualT*140+i*37)%Math.max(W,H));
var x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;ctx.globalAlpha=clamp(r/Math.max(W,H),0,1)*.7;
ctx.fillStyle=i%3?THEME.bloom:'#fff';ctx.fillRect(Math.round(x),Math.round(y),2,2)}
ctx.globalAlpha=1;pxCircle(ctx,cx,cy,20+Math.sin(visualT*6)*4,THEME.bloom,.6);pxCircle(ctx,cx,cy,10,'#fff',.8);
drawSpr(ctx,playerSpr(viewPlayer()),cx,cy,-Math.PI/2,false,1);
txt(ctx,'ПЕРЕЛЁТ',cx,cy+34,THEME.css['--cyan'],14,'center')}
function nodeColor(n){return n.type==='boss'?(n.boss==='hive'?'#9dff3c':{guardian:'#ff4d4d',prism:'#22e6ff',hammer:'#ffb020',eye:'#a86bff',phantom:'#ff2fb0',twins:'#b8fbff'}[n.boss]||'#ff4d4d'):n.type==='bomb'?'#9dff3c':n.type==='snipe'?'#a86bff':n.type==='laser'?'#22e6ff':n.type==='mystery'?'#6b6a8a':n.type==='dark'?'#7a4ad6':n.type==='rand'?'#ffb020':'#4d8cff'}
function nodeIcon(ctx,x,y,r,n){
var c=nodeColor(n),o=PAL.o;
if(n.type==='boss'){var k=n.boss;
if(k==='guardian'){ctx.fillStyle=o;ctx.fillRect(x-8,y-9,16,18);ctx.fillStyle=c;ctx.fillRect(x-7,y-8,14,13);ctx.fillStyle=o;ctx.fillRect(x-3,y-4,6,8);ctx.fillStyle='#fff';ctx.fillRect(x-1,y-2,2,4);ctx.fillStyle=c;ctx.fillRect(x-5,y+5,10,3)}
else if(k==='prism'){ctx.fillStyle=o;for(var i=-9;i<=9;i++){var w=9-Math.abs(i);ctx.fillRect(x-w,y+i,w*2+1,1)}ctx.fillStyle=c;for(i=-7;i<=7;i++){var w2=7-Math.abs(i);ctx.fillRect(x-w2,y+i,w2*2+1,1)}ctx.fillStyle='#fff';ctx.fillRect(x-2,y-2,4,4)}
else if(k==='hammer'){ctx.fillStyle=o;ctx.fillRect(x-9,y-8,18,9);ctx.fillStyle=c;ctx.fillRect(x-8,y-7,16,7);ctx.fillStyle=o;ctx.fillRect(x-2,y+1,4,9);ctx.fillStyle='#8f5a10';ctx.fillRect(x-1,y+2,2,8)}
else if(k==='eye'){ctx.fillStyle=o;ctx.fillRect(x-9,y-6,18,12);ctx.fillStyle=c;ctx.fillRect(x-8,y-5,16,10);ctx.fillStyle='#fff';ctx.fillRect(x-4,y-3,8,6);ctx.fillStyle=o;ctx.fillRect(x-2,y-2,4,4)}
else if(k==='twins'){ctx.fillStyle=o;ctx.fillRect(x-10,y-7,9,14);ctx.fillRect(x+1,y-7,9,14);
 ctx.fillStyle='#a86bff';ctx.fillRect(x-9,y-6,7,12);ctx.fillStyle='#b8fbff';ctx.fillRect(x+2,y-6,7,12);
 ctx.fillStyle='#fff';ctx.fillRect(x-7,y-2,3,3);ctx.fillRect(x+4,y-2,3,3);
 ctx.strokeStyle='#b8fbff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-1,y);ctx.lineTo(x+1,y);ctx.stroke()}
else if(k==='phantom'){ctx.fillStyle=o;ctx.fillRect(x-8,y-9,16,15);ctx.fillStyle=c;ctx.fillRect(x-7,y-8,14,13);ctx.fillStyle=o;ctx.fillRect(x-4,y-4,3,4);ctx.fillRect(x+1,y-4,3,4);ctx.fillStyle=c;for(i=0;i<3;i++)ctx.fillRect(x-7+i*5,y+5,3,4)}
else{ctx.fillStyle=o;ctx.fillRect(x-9,y-9,18,18);ctx.fillStyle=c;for(var q=0;q<3;q++)for(var w3=0;w3<3;w3++){if((q+w3)%2===0)ctx.fillRect(x-8+w3*5,y-8+q*5,4,4)}ctx.fillStyle='#fff';ctx.fillRect(x-2,y-2,4,4)}
return}
if(n.type==='std'){ctx.fillStyle=o;ctx.fillRect(x-8,y-8,16,16);ctx.fillStyle=c;ctx.fillRect(x-7,y-7,14,14);ctx.fillStyle=o;ctx.fillRect(x-4,y-4,8,8);ctx.fillStyle=c;ctx.fillRect(x-2,y-2,4,4)}
else if(n.type==='bomb'){ctx.fillStyle=o;ctx.fillRect(x-7,y-4,14,12);ctx.fillStyle=c;ctx.fillRect(x-6,y-3,12,10);ctx.fillStyle='#fff';ctx.fillRect(x-4,y-1,3,3);ctx.fillStyle='#8f5a10';ctx.fillRect(x+2,y-8,2,5);ctx.fillStyle='#ffb020';ctx.fillRect(x+3,y-10,3,3)}
else if(n.type==='snipe'){ctx.fillStyle=c;ctx.fillRect(x-9,y-1,18,2);ctx.fillRect(x-1,y-9,2,18);ctx.fillStyle=o;ctx.fillRect(x-5,y-5,10,10);ctx.fillStyle=c;ctx.fillRect(x-4,y-4,8,8);ctx.fillStyle=o;ctx.fillRect(x-2,y-2,4,4);ctx.fillStyle='#ff4d4d';ctx.fillRect(x-1,y-1,2,2)}
else if(n.type==='laser'){ctx.fillStyle=c;for(var a=0;a<8;a++){var an=a*TAU/8;for(var t=3;t<10;t++)ctx.fillRect(Math.round(x+Math.cos(an)*t),Math.round(y+Math.sin(an)*t),1,1)}ctx.fillStyle=o;ctx.fillRect(x-4,y-4,8,8);ctx.fillStyle='#fff';ctx.fillRect(x-2,y-2,4,4)}
else if(n.type==='mystery'){ctx.fillStyle=o;for(var i2=-8;i2<=8;i2++){var w4=8-Math.abs(i2);ctx.fillRect(x-w4,y+i2,w4*2+1,1)}ctx.fillStyle='#3a2a6a';for(i2=-6;i2<=6;i2++){var w5=6-Math.abs(i2);ctx.fillRect(x-w5,y+i2,w5*2+1,1)}txt(ctx,'?',x,y-6,'#c9b8ff',13,'center')}
else if(n.type==='dark'){ctx.fillStyle='#12081f';ctx.fillRect(x-8,y-9,16,16);ctx.fillStyle=c;ctx.fillRect(x-7,y-8,14,12);ctx.fillStyle='#ff2f4f';ctx.fillRect(x-5,y-4,4,4);ctx.fillRect(x+1,y-4,4,4);ctx.fillStyle='#12081f';ctx.fillRect(x-4,y+2,8,2);ctx.fillStyle=c;ctx.fillRect(x-6,y+5,3,3);ctx.fillRect(x+3,y+5,3,3)}
else if(n.type==='rand'){ctx.fillStyle=o;ctx.fillRect(x-8,y-8,16,16);ctx.fillStyle=c;ctx.fillRect(x-7,y-7,14,14);ctx.fillStyle=o;ctx.fillRect(x-4,y-4,3,3);ctx.fillRect(x+1,y-4,3,3);ctx.fillRect(x-1,y-1,3,3);ctx.fillRect(x-4,y+2,3,3);ctx.fillRect(x+1,y+2,3,3)}
else{ctx.fillStyle=o;ctx.fillRect(x-7,y-7,14,14);ctx.fillStyle=c;ctx.fillRect(x-6,y-6,12,12)}}
function drawMap(ctx){ctx.fillStyle=THEME.css['--void'];ctx.fillRect(0,0,W,H);drawParallax(ctx,CAM,0,0,W,H);
var curD=getNode(G.curNode)?getNode(G.curNode).d:1;
var reach=reachableNodes(),rids=reach.map(function(n){return n.id});
var selNode=reach[clamp(G.mapSel,0,Math.max(0,reach.length-1))];
ctx.save();ctx.translate(-G.mapCam,0);
for(var d=0;d<G.map.length-1;d++)for(var i=0;i<G.map[d].length;i++){var n=G.map[d][i];
for(var j=0;j<(n.next||[]).length;j++){var m=getNode(n.next[j]);if(!m)continue;
var x1=60+n.d*70,y1=H/2+(n.row-(G.map[n.d-1].length-1)/2)*70;
var x2=60+m.d*70,y2=H/2+(m.row-(G.map[m.d-1].length-1)/2)*70;
var active=n.id===G.curNode,fog=(m.d-curD)>2;
line(ctx,x1,y1,x2,y2,fog?'#150a2e':(active?THEME.bloom:THEME.css['--edge']),active?2:1,fog?.25:(active?.75:.35))}}
for(d=0;d<G.map.length;d++)for(i=0;i<G.map[d].length;i++){n=G.map[d][i];
var x=60+n.d*70,y=H/2+(n.row-(G.map[d].length-1)/2)*70;
if(x-G.mapCam<-40||x-G.mapCam>W+40)continue;
var rel=n.d-curD,fog=rel>2;
var isCur=n.id===G.curNode,isReach=rids.indexOf(n.id)>=0;
var r=n.type==='boss'?12:10;
if(fog){pxDisc(ctx,x,y,r,'#0a0518',.92);pxCircle(ctx,x,y,r,'#241452',.5);txt(ctx,String(n.d),x,y-r-12,'#3a2a6a',11,'center');continue}
if(isReach){ctx.globalAlpha=.35+.3*Math.sin(visualT*5);pxCircle(ctx,x,y,r+5,nodeColor(n),.6);ctx.globalAlpha=1}
if(selNode&&n.id===selNode.id&&GP.active){ctx.save();ctx.globalAlpha=.9;pxCircle(ctx,x,y,r+8,'#9dff3c',.9);pxCircle(ctx,x,y,r+10,'#9dff3c',.4);ctx.restore()}
ctx.globalAlpha=isCur||isReach?1:.55;
nodeIcon(ctx,Math.round(x),Math.round(y),r,n);
if(isCur)pxCircle(ctx,x,y,r+2,'#fff',.8);
ctx.globalAlpha=1;
txt(ctx,String(n.d),x,y-r-12,isReach||isCur?THEME.css['--ink']:THEME.css['--dim'],11,'center')}
ctx.restore();
txt(ctx,'ВЫБЕРИ МАРШРУТ · листай карту',8,VIEW.y+4,THEME.css['--cyan'],14);
if(selNode){var nm=selNode.type==='boss'?(BOSS_NAMES[selNode.boss]||'БОСС'):levelTypeName(selNode.type);
txt(ctx,nm+'  ·  лут x'+(selNode.type==='std'?1:selNode.type==='rand'?2:1.5),8,VIEW.y+20,THEME.css['--amber'],13);
nodeIcon(ctx,W-22,VIEW.y+16,10,selNode)}
var legend=[],seen={};
for(i=0;i<reach.length;i++){var t=reach[i].type==='boss'?'boss':reach[i].type;if(!seen[t]){seen[t]=1;legend.push(reach[i])}}
var lx=10,ly=H-20;
for(i=0;i<legend.length&&i<5;i++){nodeIcon(ctx,lx+8,ly,8,legend[i]);
var lb=legend[i].type==='boss'?'БОСС':levelTypeName(legend[i].type);
txt(ctx,lb,lx+19,ly-6,THEME.css['--dim'],11);lx+=Math.min(120,26+lb.length*6)}}
function drawTransfer(ctx){var bw2=132,bx2=W/2-bw2/2,by2=VIEW.y+8;
ctx.globalAlpha=.92;ctx.fillStyle=THEME.css['--deep'];ctx.fillRect(bx2-3,by2-3,bw2+6,15);
ctx.strokeStyle=THEME.css['--cyan'];ctx.lineWidth=1;ctx.strokeRect(bx2-2.5,by2-2.5,bw2+5,14);
ctx.fillStyle=THEME.css['--cyan'];ctx.fillRect(bx2,by2,bw2*clamp(G.portalCharge/1.5,0,1),9);ctx.globalAlpha=1;
txt(ctx,'ПЕРЕМЕЩЕНИЕ',W/2,by2+14,THEME.css['--cyan'],13,'center');
txt(ctx,'стой неподвижно',W/2,by2+26,THEME.css['--dim'],11,'center')}
function drawSticks(ctx){if(!isTouch||G.state!=='play')return;
['move','aim'].forEach(function(k){var s=sticks[k];if(s.id===null)return;
var col=k==='move'?THEME.css['--cyan']:PAL.m;
pxCircle(ctx,s.ox,s.oy,22,col,.45);
pxDisc(ctx,s.ox+s.dx*22,s.oy+s.dy*22,7,col,.75)})}
function camTargetFor(f,vx,vy,vw,vh,z){
var cx=vx+vw/2,cy=vy+vh/2,hw=vw/(2*z),hh=vh/(2*z);
var lox=hw-cx,hix=AR.w-hw-cx,loy=hh-cy,hiy=AR.h-hh-cy;
var x=f.x-cx,y=f.y-cy;
x=hix<lox?(lox+hix)/2:clamp(x,lox,hix);
y=hiy<loy?(loy+hiy)/2:clamp(y,loy,hiy);
return{x:x,y:y}}
function splitActive(){return isLocal()&&G.splitOn&&PL[0].hp>0&&PL[1].hp>0&&G.state==='play'}
var ELITE_NAMES=['ЩИТ','СКОРОСТЬ','ВАМП','ВЗРЫВ'];
function drawScythe(ctx,p,st){
var R=st.scytheR,H2=st.scytheHalf;
ctx.save();
ctx.globalAlpha=.14;ctx.strokeStyle='#ff2fb0';ctx.lineWidth=1;
ctx.beginPath();ctx.arc(p.x,p.y,R,p.aim-H2,p.aim+H2);ctx.stroke();
if(p.swingT>0){
var prog=1-clamp(p.swingT/.3,0,1),dir=p.swingDir||1;
var a0=p.aim-H2*dir,cur=a0+(p.aim+H2*dir-a0)*prog;
var fade=clamp(p.swingT/.3,0,1);
ctx.globalAlpha=.28*fade;ctx.strokeStyle='#ff2fb0';ctx.lineWidth=10;
ctx.beginPath();ctx.arc(p.x,p.y,R-4,Math.min(a0,cur),Math.max(a0,cur));ctx.stroke();
ctx.globalAlpha=.55*fade;ctx.strokeStyle='#ff8fd4';ctx.lineWidth=5;
ctx.beginPath();ctx.arc(p.x,p.y,R-4,Math.min(a0,cur),Math.max(a0,cur));ctx.stroke();
ctx.globalAlpha=.95*fade;ctx.strokeStyle='#ffffff';ctx.lineWidth=2;
ctx.beginPath();ctx.arc(p.x,p.y,R-4,Math.min(a0,cur),Math.max(a0,cur));ctx.stroke();
var tx=p.x+Math.cos(cur)*(R-4),ty=p.y+Math.sin(cur)*(R-4);
var ix=p.x+Math.cos(cur)*(R*.42),iy=p.y+Math.sin(cur)*(R*.42);
ctx.globalAlpha=.9*fade;ctx.strokeStyle='#ffd6f2';ctx.lineWidth=3;
ctx.beginPath();ctx.moveTo(ix,iy);ctx.lineTo(tx,ty);ctx.stroke();
ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(ix,iy);ctx.lineTo(tx,ty);ctx.stroke();
ctx.globalAlpha=fade;ctx.fillStyle='#fff';ctx.fillRect(Math.round(tx)-2,Math.round(ty)-2,4,4);
ctx.globalAlpha=.35*fade;pxCircle(ctx,tx,ty,7,'#ff2fb0',.5);
ctx.globalAlpha=.5*fade;ctx.strokeStyle='#8f1a63';ctx.lineWidth=2;
ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(ix,iy);ctx.stroke()}
ctx.restore()}
function drawCone(ctx,p,st){
ctx.save();
var gr=ctx.createRadialGradient(p.x,p.y,6,p.x,p.y,st.coneR);
gr.addColorStop(0,'rgba(184,251,255,.26)');gr.addColorStop(.6,'rgba(34,230,255,.10)');gr.addColorStop(1,'rgba(34,230,255,0)');
ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(p.x,p.y);
ctx.arc(p.x,p.y,st.coneR,p.aim-st.coneHalf,p.aim+st.coneHalf);ctx.closePath();ctx.fill();
ctx.globalAlpha=.35;ctx.strokeStyle='#b8fbff';ctx.lineWidth=1;ctx.stroke();
ctx.restore();
for(var s=0;s<2;s++){var ea=p.aim+(s?1:-1)*st.coneHalf;
lightning(ctx,p.x,p.y,p.x+Math.cos(ea)*st.coneR,p.y+Math.sin(ea)*st.coneR,p.id*3+s*7,'#22e6ff',.7)}
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;
var d=hyp(e.x-p.x,e.y-p.y);if(d>st.coneR)continue;
var a=Math.atan2(e.y-p.y,e.x-p.x);if(Math.abs(angDiff(p.aim,a))>st.coneHalf)continue;
lightning(ctx,p.x+Math.cos(p.aim)*10,p.y+Math.sin(p.aim)*10,e.x,e.y,e.id*.7+p.id*5,'#22e6ff',1);
ctx.save();ctx.globalAlpha=.5+.3*Math.sin(visualT*20+e.id);
pxCircle(ctx,e.x,e.y,e.r*(e.sc||1)+4,'#b8fbff',.5);ctx.restore()}}
function drawTesla(ctx,p,st){
var R=st.teslaR;
ctx.save();
var gr=ctx.createRadialGradient(p.x,p.y,4,p.x,p.y,R);
gr.addColorStop(0,'rgba(184,251,255,.28)');gr.addColorStop(.55,'rgba(34,230,255,.12)');gr.addColorStop(1,'rgba(34,230,255,0)');
ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y,R,0,TAU);ctx.fill();
ctx.globalAlpha=.5;ctx.strokeStyle='#b8fbff';ctx.lineWidth=1;ctx.setLineDash([3,4]);
ctx.beginPath();ctx.arc(p.x,p.y,R,0,TAU);ctx.stroke();ctx.setLineDash([]);
ctx.restore();
for(var s=0;s<5;s++){
var a0=visualT*1.15+s*TAU/5+p.id*1.7;
var r0=R*(.22+.12*Math.sin(visualT*3+s));
var a1=a0+.85+.35*Math.sin(visualT*2.3+s*2);
lightning(ctx,p.x+Math.cos(a0)*r0,p.y+Math.sin(a0)*r0,
 p.x+Math.cos(a1)*R,p.y+Math.sin(a1)*R,p.id*11+s*3.3,'#b8fbff',.42)}
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.invuln)continue;
var d=hyp(e.x-p.x,e.y-p.y);if(d>R)continue;
lightning(ctx,p.x,p.y,e.x,e.y,e.id*.9+p.id*7,'#22e6ff',.5);
ctx.save();ctx.globalAlpha=.45+.3*Math.sin(visualT*18+e.id);
pxCircle(ctx,e.x,e.y,e.r*(e.sc||1)+3,'#b8fbff',.45);ctx.restore()}}
function renderScene(ctx,vx,vy,vw,vh,focus,z,idx){
var tgt=camTargetFor(focus,vx,vy,vw,vh,z),cam=CAMS[idx]||CAMS[0];
var k=G.dt>0?1-Math.exp(-9*G.dt):1;cam.x+=(tgt.x-cam.x)*k;cam.y+=(tgt.y-cam.y)*k;
if(idx===0){CAM.x=cam.x;CAM.y=cam.y}
ctx.save();ctx.beginPath();ctx.rect(vx,vy,vw,vh);ctx.clip();
ctx.fillStyle=THEME.css['--void'];ctx.fillRect(vx,vy,vw,vh);
drawParallax(ctx,cam,vx,vy,vw,vh);
var cx=vx+vw/2,cy=vy+vh/2;
var sx=G.shake?randi(-Math.round(G.shake),Math.round(G.shake)):0,sy=G.shake?randi(-Math.round(G.shake),Math.round(G.shake)):0;
ctx.translate(cx,cy);ctx.scale(z,z);ctx.translate(-cx,-cy);ctx.translate(sx-cam.x,sy-cam.y);
ctx.save();ctx.beginPath();ctx.rect(AR.x,AR.y,AR.w,AR.h);ctx.clip();ctx.drawImage(floorCanvas,AR.x,AR.y,AR.w,AR.h);
var pulse=.5+.5*Math.sin(visualT*2.4);ctx.globalAlpha=.04+.03*pulse;ctx.strokeStyle='rgb('+THEME.floor.grid+')';ctx.lineWidth=1;ctx.beginPath();
for(var gx=AR.x;gx<=AR.x+AR.w;gx+=40){ctx.moveTo(gx+.5,AR.y);ctx.lineTo(gx+.5,AR.y+AR.h)}
for(var gy=AR.y;gy<=AR.y+AR.h;gy+=40){ctx.moveTo(AR.x,gy+.5);ctx.lineTo(AR.x+AR.w,gy+.5)}ctx.stroke();ctx.globalAlpha=1;
for(var i=0;i<G.beats.length;i++){var bt=G.beats[i];pxCircle(ctx,focus.x,focus.y,bt.r,THEME.bloom,Math.max(0,bt.a)*(MUS.active?.18:.4))}ctx.restore();
var hurtG=focus.hurtT>0;ctx.fillStyle=hurtG?PAL.r:THEME.css['--edge'];
ctx.fillRect(AR.x-1,AR.y-1,AR.w+2,1);ctx.fillRect(AR.x-1,AR.y+AR.h,AR.w+2,1);ctx.fillRect(AR.x-1,AR.y-1,1,AR.h+2);ctx.fillRect(AR.x+AR.w,AR.y-1,1,AR.h+2);
ctx.fillStyle=hurtG?PAL.r:THEME.css['--cyan'];[[AR.x-2,AR.y-2],[AR.x+AR.w-2,AR.y-2],[AR.x-2,AR.y+AR.h-2],[AR.x+AR.w-2,AR.y+AR.h-2]].forEach(function(c){ctx.fillRect(c[0],c[1],4,4)});
ctx.globalAlpha=.12;ctx.strokeStyle=THEME.css['--violet'];ctx.strokeRect(AR.x+EDGE,AR.y+EDGE,AR.w-EDGE*2,AR.h-EDGE*2);ctx.globalAlpha=1;
for(i=0;i<G.chronoFields.length;i++){var cf=G.chronoFields[i];if(cf.g)continue;
ctx.save();ctx.globalAlpha=.10+.04*Math.sin(visualT*4);ctx.fillStyle='#4d8cff';
ctx.beginPath();ctx.arc(cf.x,cf.y,cf.r,0,TAU);ctx.fill();
ctx.globalAlpha=.6;ctx.strokeStyle='#4d8cff';ctx.lineWidth=1.5;ctx.setLineDash([7,6]);
ctx.beginPath();ctx.arc(cf.x,cf.y,cf.r,0,TAU);ctx.stroke();ctx.setLineDash([]);
ctx.globalAlpha=.85;txt(ctx,'×0.4',cf.x,cf.y-cf.r-14,'#4d8cff',12,'center');ctx.restore()}
for(i=0;i<G.enemies.length;i++){var je=G.enemies[i];if(je.type!=='jammer'||je.dead)continue;
ctx.save();ctx.globalAlpha=.09+.05*Math.sin(visualT*5);ctx.fillStyle=PAL.c;
ctx.beginPath();ctx.arc(je.x,je.y,90,0,TAU);ctx.fill();
ctx.globalAlpha=.45;ctx.strokeStyle=PAL.c;ctx.setLineDash([5,6]);ctx.lineWidth=1;
ctx.beginPath();ctx.arc(je.x,je.y,90,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore()}
var echo=null,aegis=null;
for(i=0;i<G.enemies.length;i++){var te=G.enemies[i];if(te.bossKind==='twins'&&!te.dead)echo=te;if(te.type==='aegis'&&!te.dead)aegis=te}
if(echo&&aegis){ctx.save();
ctx.globalAlpha=G.twinsLink?.75:.25;ctx.strokeStyle=G.twinsLink?'#b8fbff':THEME.css['--edge2'];
ctx.lineWidth=G.twinsLink?2:1;ctx.setLineDash(G.twinsLink?[]:[6,5]);
ctx.beginPath();ctx.moveTo(aegis.x,aegis.y);ctx.lineTo(echo.x,echo.y);ctx.stroke();ctx.setLineDash([]);
if(G.twinsLink){ctx.globalAlpha=.13;ctx.fillStyle='#b8fbff';ctx.beginPath();ctx.arc(echo.x,echo.y,echo.r+9,0,TAU);ctx.fill();
 ctx.globalAlpha=.6;ctx.strokeStyle='#b8fbff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(echo.x,echo.y,echo.r+9,0,TAU);ctx.stroke()}
ctx.globalAlpha=.9;txt(ctx,G.twinsLink?'КУПОЛ':'ОКНО УРОНА',echo.x,echo.y-echo.r-24,G.twinsLink?'#b8fbff':'#9dff3c',12,'center');
ctx.globalAlpha=.8;txt(ctx,'ЭГИДА',aegis.x,aegis.y-aegis.r-16,'#b8fbff',10,'center');
ctx.restore()}
for(i=0;i<G.wells.length;i++){var wl=G.wells[i];ctx.save();ctx.globalAlpha=.5;
for(var s2=0;s2<3;s2++){ctx.strokeStyle=s2%2?'#a86bff':'#22e6ff';ctx.lineWidth=1.5;ctx.beginPath();
for(var t2=0;t2<40;t2++){var an=wl.spin+s2*2.1+t2*.22,rr=wl.r*(t2/40);
var px2=wl.x+Math.cos(an)*rr,py2=wl.y+Math.sin(an)*rr;if(t2===0)ctx.moveTo(px2,py2);else ctx.lineTo(px2,py2)}
ctx.stroke()}
ctx.globalAlpha=.8;pxCircle(ctx,wl.x,wl.y,wl.core,'#a86bff',.7);
ctx.globalAlpha=.35;pxCircle(ctx,wl.x,wl.y,wl.r,'#a86bff',.4);ctx.restore()}
for(i=0;i<G.mines.length;i++){var mn=G.mines[i];drawSpr(ctx,SPR.mine,mn.x,mn.y,0,false,1);
if(mn.arm<=0){ctx.globalAlpha=.3+.3*Math.sin(visualT*8);pxCircle(ctx,mn.x,mn.y,(mn.rad||34)*.32,'#ffb020',.5);ctx.globalAlpha=1}}
for(i=0;i<G.turrets.length;i++){var tu=G.turrets[i];
drawSpr(ctx,SPR.turret,tu.x,tu.y,tu.ang+Math.PI/2,false,1);
ctx.save();ctx.globalAlpha=.45;ctx.strokeStyle='#ffb020';ctx.lineWidth=1.5;
ctx.beginPath();ctx.arc(tu.x,tu.y,9,-Math.PI/2,-Math.PI/2+TAU*clamp(tu.l/tu.max,0,1));ctx.stroke();ctx.restore()}
for(i=0;i<G.phantoms.length;i++){var ph=G.phantoms[i];
var ps=(SPR.ships[ph.ship||'std']||SPR.ships.std)[ph.owner?1:0];
drawSpr(ctx,ps,ph.x,ph.y,ph.a,false,clamp(ph.l/ph.max,0,1)*.5);
ctx.globalAlpha=.4;pxCircle(ctx,ph.x,ph.y,10,'#a86bff',.4);ctx.globalAlpha=1}
for(i=0;i<G.zones.length;i++){var zz=G.zones[i],za=zz.done?clamp(zz.life/zz.max,0,1):.35+.3*Math.abs(Math.sin(G.t*14));pxCircle(ctx,zz.x,zz.y,zz.r,zz.col,za);if(!zz.done)pxCircle(ctx,zz.x,zz.y,zz.r*clamp(1-zz.tel/.9,0,1),zz.col,.5)}
for(i=0;i<G.shocks.length;i++){var s=G.shocks[i];pxCircle(ctx,s.x,s.y,s.r,s.col,.8)}
for(i=0;i<G.rings.length;i++){var rg=G.rings[i];
if(rg.ang!==undefined){var ral=clamp(rg.l/rg.m,0,1);ctx.save();ctx.globalAlpha=ral*.26;ctx.fillStyle=rg.c;
ctx.beginPath();ctx.moveTo(rg.x,rg.y);ctx.arc(rg.x,rg.y,rg.r,rg.ang-rg.spread,rg.ang+rg.spread);ctx.closePath();ctx.fill();
ctx.globalAlpha=ral*.9;ctx.strokeStyle=rg.c;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(rg.x,rg.y,rg.r,rg.ang-rg.spread,rg.ang+rg.spread);ctx.stroke();
ctx.beginPath();ctx.moveTo(rg.x,rg.y);ctx.lineTo(rg.x+Math.cos(rg.ang-rg.spread)*rg.r,rg.y+Math.sin(rg.ang-rg.spread)*rg.r);
ctx.moveTo(rg.x,rg.y);ctx.lineTo(rg.x+Math.cos(rg.ang+rg.spread)*rg.r,rg.y+Math.sin(rg.ang+rg.spread)*rg.r);ctx.stroke();ctx.restore()}
else pxCircle(ctx,rg.x,rg.y,rg.r,rg.c,clamp(rg.l/rg.m,0,1))}
if(G.portal){var por=G.portal,pr=por.r+Math.sin(visualT*5)*2;
pxCircle(ctx,por.x,por.y,pr,'#22e6ff',.8);pxCircle(ctx,por.x,por.y,pr*.6,'#fff',.5);pxDisc(ctx,por.x,por.y,3,'#22e6ff',.8);
ctx.globalAlpha=.3;pxCircle(ctx,por.x,por.y,pr+6,'#22e6ff',.4);ctx.globalAlpha=1;
if(G.portalCharge>0){ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.globalAlpha=.9;
ctx.beginPath();ctx.arc(por.x,por.y,pr+3,-Math.PI/2,-Math.PI/2+TAU*clamp(G.portalCharge/1.5,0,1));ctx.stroke();ctx.restore()}}
for(i=0;i<G.drops.length;i++){var dp=G.drops[i];if(dp.l<3&&Math.floor(dp.l*8)%2===0)continue;
var bob=Math.round(Math.sin(G.t*4+dp.sp));var sp=dp.type==='shard'?SPR.shard:dp.type==='frag'?SPR.frag:dp.type==='bp'?SPR.bp:SPR.med;
ctx.drawImage(sp.n,Math.round(dp.x-sp.w/2),Math.round(dp.y-sp.h/2)+bob)}
for(i=0;i<G.beams.length;i++){var b=G.beams[i],x2=b.x+Math.cos(b.ang)*b.len,y2=b.y+Math.sin(b.ang)*b.len;line(ctx,b.x,b.y,x2,y2,b.col,b.width*2,.25);line(ctx,b.x,b.y,x2,y2,'#fff',1,.8)}
for(i=0;i<G.enemies.length;i++){var ee=G.enemies[i];if(ee.electroT>0){
 for(var ej=i+1;ej<G.enemies.length;ej++){var e2=G.enemies[ej];
  if(e2.electroT>0&&hyp(e2.x-ee.x,e2.y-ee.y)<70)lightning(ctx,ee.x,ee.y,e2.x,e2.y,ee.id+e2.id,'#b8fbff',.5)}}}
for(i=0;i<G.enemies.length;i++){var e=G.enemies[i];var ealpha=e.ghost?.5:1;
if(e.type==='medic'&&e.beam)line(ctx,e.x,e.y,e.beam.x,e.beam.y,PAL.g,1,.7*ealpha);
if(e.type==='shielder'&&e.guardId!=null){var g=null;for(var q=0;q<G.enemies.length;q++)if(G.enemies[q].id===e.guardId&&!G.enemies[q].dead){g=G.enemies[q];break}if(g)line(ctx,e.x,e.y,g.x,g.y,PAL.b,1,.25)}
if(e.type==='shielder'&&e.slot===0&&(e.mode==='circle'||e.mode==='guard')&&e.ar>0)pxCircle(ctx,e.ax,e.ay,e.ar,PAL.b,.22);
if(e.type==='sniper'&&e.tel>0){var p2=Math.floor(G.t*16)%2===0;ctx.fillStyle=p2?'#fff':PAL.r;for(q=8;q<440;q+=5)ctx.fillRect(Math.round(e.x+Math.cos(e.lock)*q),Math.round(e.y+Math.sin(e.lock)*q),1,1)}
if(e.type==='ram'&&e.tel>0){var rp2=Math.floor(G.t*20)%2===0;pxCircle(ctx,e.x,e.y,e.r+4,rp2?'#fff':'#ff4d4d',.85);
for(q=6;q<60;q+=4){ctx.fillStyle=rp2?'#fff':'#ff4d4d';ctx.fillRect(Math.round(e.x+Math.cos(e.lock)*q),Math.round(e.y+Math.sin(e.lock)*q),2,2)}}
if(e.type==='lgun'&&e.open>0){var op=e.open;ctx.save();ctx.globalAlpha=.8;
for(var pt=0;pt<4;pt++){var pa=pt*TAU/4+G.t*.6;
line(ctx,e.x+Math.cos(pa)*4,e.y+Math.sin(pa)*4,e.x+Math.cos(pa)*(5+op*9),e.y+Math.sin(pa)*(5+op*9),'#a86bff',2,.9)}
ctx.restore();pxCircle(ctx,e.x,e.y,2+Math.round(op*3),'#fff',.8)}
if(e.type==='emitter'&&e.tel>0){p2=Math.floor(G.t*16)%2===0;pxCircle(ctx,e.x,e.y,e.r+5,p2?'#fff':PAL.c,.8)}
if(e.type==='brood'){var bp2=.5+.5*Math.sin(e.t*3);ctx.globalAlpha=.2+.2*bp2;
 pxCircle(ctx,e.x,e.y,e.r+4+Math.round(bp2*2),PAL.g,.5);ctx.globalAlpha=1}
if(e.tel>0&&e.type!=='sniper'&&e.type!=='emitter'&&e.type!=='ram'&&e.type!=='lgun'){p2=Math.floor(G.t*16)%2===0;pxCircle(ctx,e.x,e.y,e.r+4+Math.round(Math.sin(G.t*12)),p2?'#fff':e.col,.85);
if(e.st==='charge'){var lx=Math.cos(e.lock),ly=Math.sin(e.lock);for(q=6;q<70;q+=4){ctx.fillStyle=p2?'#fff':PAL.r;ctx.fillRect(Math.round(e.x+lx*q),Math.round(e.y+ly*q),2,2)}}}
var np=nearestPlayer(e.x,e.y);
var ang=(e.type==='dark')?e.aim:(e.type==='mirror'||e.type==='aegis')?e.face:(e.boss?(e.bossKind==='phantom'?e.t*.8:e.t*.35):((e.type==='shooter'||e.type==='tank'||e.type==='sniper'||e.type==='emitter'||e.type==='ram'||e.type==='jammer')?Math.atan2(np.y-e.y,np.x-e.x):(e.type==='shielder'?e.face:Math.atan2(e.vy,e.vx))));
if(e.type==='dark'){var dst=SPR.darkShips[e.ship||'std'];
ctx.globalAlpha=.3+.15*Math.sin(visualT*4);pxCircle(ctx,e.x,e.y,e.r+7,'#a86bff',.55);ctx.globalAlpha=1;
drawSpr(ctx,dst,e.x,e.y,ang,e.fr>0&&Math.floor(G.t*30)%2===0,1);
if(e.shield>0)pxCircle(ctx,e.x,e.y,e.r+3,'#a86bff',.4);
var dst2=e.stats;
if(dst2&&dst2.socio){var spn=e.socioSpin>0,bsp=spn?16:2.2;
for(var bl2=0;bl2<2;bl2++){var ba2=G.t*bsp+bl2*Math.PI;
line(ctx,e.x+Math.cos(ba2)*10,e.y+Math.sin(ba2)*10,e.x+Math.cos(ba2)*28,e.y+Math.sin(ba2)*28,spn?'#fff':'#a86bff',spn?4:3,.9)}}
if(dst2)for(var dq=0;dq<dst2.drones;dq++){var da=G.t*1.8+dq*TAU/Math.max(1,dst2.drones);
drawSpr(ctx,SPR.drone,e.x+Math.cos(da)*16,e.y+Math.sin(da)*16,da*2,false,.8)}}
else drawSpr(ctx,resolveSpr(e),e.x,e.y,ang,(e.fr>0||e.fl>0)&&Math.floor(G.t*30)%2===0,ealpha);
if(e.type==='mirror'){ctx.save();ctx.strokeStyle=e.open>0?'#ff4d4d':'#b8fbff';ctx.lineWidth=2;ctx.globalAlpha=.9;
ctx.beginPath();ctx.arc(e.x,e.y,e.r+4,e.face-1.0,e.face+1.0);ctx.stroke();
if(e.open>0){ctx.globalAlpha=.5;ctx.strokeStyle='#ff4d4d';ctx.lineWidth=1;
ctx.beginPath();ctx.arc(e.x,e.y,e.r+7,e.face-1.0,e.face+1.0);ctx.stroke()}ctx.restore()}
if(e.type==='aegis'){ctx.save();ctx.globalAlpha=.35+.15*Math.sin(visualT*3);
pxCircle(ctx,e.x,e.y,e.r+6,'#b8fbff',.6);ctx.restore()}
if(e.boss&&e.type!=='dark'){ctx.globalAlpha=(.18+.1*Math.sin(visualT*3))*ealpha;pxCircle(ctx,e.x,e.y,e.r+7+Math.round(Math.sin(visualT*2)*2),e.col,.5);ctx.globalAlpha=1}
if(e.type==='shielder'){var col=e.shieldFl>0?'#fff':PAL.c;for(var t=-1.1;t<=1.1;t+=.16){ctx.fillStyle=col;ctx.fillRect(Math.round(e.x+Math.cos(e.face+t)*(e.r+3)),Math.round(e.y+Math.sin(e.face+t)*(e.r+3)),2,2)}}
if(e.bossKind==='prism')for(var k2=0;k2<3;k2++){var a0=e.shieldAng+k2*TAU/3;for(t=-.5;t<=.5;t+=.12){ctx.fillStyle=e.shieldFl>0?'#fff':PAL.c;ctx.fillRect(Math.round(e.x+Math.cos(a0+t)*(e.r+5)),Math.round(e.y+Math.sin(a0+t)*(e.r+5)),2,2)}}
if(e.bleedT>0){ctx.save();ctx.globalAlpha=.55+.2*Math.sin(visualT*9+e.id);
ctx.strokeStyle='#ff4d4d';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(e.x,e.y,e.r*(e.sc||1)+3,0,TAU);ctx.stroke();
ctx.globalAlpha=.9;ctx.fillStyle='#ff4d4d';
for(var bdr=0;bdr<3;bdr++){var ba3=visualT*2+bdr*2.1+e.id;
ctx.fillRect(Math.round(e.x+Math.cos(ba3)*(e.r+5))-1,Math.round(e.y+Math.sin(ba3)*(e.r+5)),2,3)}
ctx.restore();txt(ctx,'КРОВЬ',e.x,e.y-e.r-26,'#ff4d4d',10,'center')}
if(e.electroT>0){ctx.save();ctx.globalAlpha=.5+.3*Math.sin(visualT*17+e.id);
ctx.strokeStyle='#b8fbff';ctx.lineWidth=1;
for(var ez=0;ez<3;ez++){var za2=visualT*7+ez*2.1+e.id;
bolt(ctx,e.x,e.y,e.x+Math.cos(za2)*(e.r+8),e.y+Math.sin(za2)*(e.r+8),e.id+ez,3);ctx.stroke()}
ctx.restore()}
if(e.stunT>0){ctx.save();ctx.globalAlpha=.85;ctx.strokeStyle='#ffb020';ctx.lineWidth=1.5;ctx.beginPath();
for(var sz3=0;sz3<9;sz3++){var sa3=sz3*.75+visualT*11,sr3=e.r+7+Math.sin(sz3*2+visualT*16)*2.5;
var sx3=e.x+Math.cos(sa3)*sr3,sy3=e.y+Math.sin(sa3)*sr3;if(sz3===0)ctx.moveTo(sx3,sy3);else ctx.lineTo(sx3,sy3)}
ctx.closePath();ctx.stroke();ctx.restore();txt(ctx,'СТАН',e.x,e.y-e.r-18,'#ffb020',10,'center')}
if(e.elite!=null){var ec=[PAL.C,PAL.g,PAL.m,PAL.a][e.elite];
ctx.save();ctx.globalAlpha=.22+.12*Math.sin(visualT*4+i);ctx.strokeStyle=ec;ctx.lineWidth=1;
ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,0,TAU);ctx.stroke();ctx.restore();
txt(ctx,ELITE_NAMES[e.elite],e.x,e.y-e.r-19,ec,11,'center')}
if(e.shield>0&&e.type!=='dark'){ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle='#b8fbff';ctx.lineWidth=1;
ctx.beginPath();ctx.arc(e.x,e.y,e.r+3,0,TAU);ctx.stroke();ctx.restore()}
if(e.slowT>0){ctx.globalAlpha=.5;pxCircle(ctx,e.x,e.y,e.r+2,'#b8fbff',.35);ctx.globalAlpha=1}
if(e.type==='tank'||e.type==='shielder'||e.type==='medic'||e.type==='emitter'||e.boss||e.type==='dark'||e.type==='ram'||e.type==='lgun'||e.type==='mirror'||e.type==='brood'||e.type==='jammer'){
var f=clamp(e.hp/e.max,0,1),bw=(e.boss||e.type==='dark')?26:16;
ctx.fillStyle=PAL.o;ctx.fillRect(Math.round(e.x-bw/2)-1,Math.round(e.y-e.r-7),bw+2,4);
ctx.fillStyle=THEME.css['--deep'];ctx.fillRect(Math.round(e.x-bw/2),Math.round(e.y-e.r-6),bw,2);
ctx.fillStyle=e.type==='medic'?PAL.g:(f>.5?PAL.g:(f>.25?PAL.a:PAL.r));ctx.fillRect(Math.round(e.x-bw/2),Math.round(e.y-e.r-6),Math.round(bw*f),2)}}
for(i=0;i<G.ebul.length;i++){var eb=G.ebul[i],os=typeof eb.spr==='string'?SPR[eb.spr]:eb.spr;if(os)ctx.drawImage(os.n,Math.round(eb.x-2),Math.round(eb.y-2))}
for(i=0;i<G.rockets.length;i++){var r=G.rockets[i];drawSpr(ctx,r.mini?SPR.miniRocket:SPR.rocket,r.x,r.y,r.a,false,1)}
for(i=0;i<G.erock.length;i++){var er=G.erock[i];drawSpr(ctx,SPR.miniRocket,er.x,er.y,er.a,false,1);
ctx.globalAlpha=.5;pxCircle(ctx,er.x,er.y,4,'#a86bff',.5);ctx.globalAlpha=1}
for(i=0;i<G.ghost.length;i++){var gh=G.ghost[i];
var gs=gh.dark?(SPR.darkShips[gh.ship||'std']||SPR.darkShips.std):((SPR.ships[gh.ship||'std']||SPR.ships.std)[gh.id?1:0]);
drawSpr(ctx,gs,gh.x,gh.y,gh.a,false,clamp(gh.l/gh.m,0,1)*.35)}
for(var pi=0;pi<PL.length;pi++){var p=PL[pi];var pspr=playerSpr(p);var st=p.stats||computeStats(p.lvl,p.ship,metaOf(p));
if(p.hp<=0){ctx.globalAlpha=.5;pxCircle(ctx,p.x,p.y,7,'#6b6a8a',.6);txt(ctx,'X',p.x,p.y-6,'#6b6a8a',12,'center');ctx.globalAlpha=1;continue}
if(st.tesla)drawTesla(ctx,p,st);
if(st.fireMode==='cone')drawCone(ctx,p,st);
if(st.fireMode==='scythe')drawScythe(ctx,p,st);
if(st.ship==='sniper'){ctx.globalAlpha=.22;line(ctx,p.x+Math.cos(p.aim)*12,p.y+Math.sin(p.aim)*12,p.x+Math.cos(p.aim)*340,p.y+Math.sin(p.aim)*340,'#ff4d4d',1,.5);
ctx.globalAlpha=.6;ctx.fillStyle='#ff4d4d';ctx.fillRect(Math.round(p.x+Math.cos(p.aim)*340)-1,Math.round(p.y+Math.sin(p.aim)*340)-1,2,2);ctx.globalAlpha=1}
for(i=0;i<st.drones;i++){var a2=G.t*1.8+i*TAU/Math.max(1,st.drones);drawSpr(ctx,SPR.drone,p.x+Math.cos(a2)*16,p.y+Math.sin(a2)*16,a2*2,false,1)}
if(st.healDrone){var ha=G.t*1.2+Math.PI;drawSpr(ctx,SPR.healdrone,p.x+Math.cos(ha)*18,p.y+Math.sin(ha)*18,ha*2,false,1);if(p.hp<p.max)line(ctx,p.x,p.y,p.x+Math.cos(ha)*18,p.y+Math.sin(ha)*18,PAL.g,1,.25)}
if(st.socio){var spin=p.socioSpin>0,bs=spin?16:2.2;for(var bl=0;bl<2;bl++){var ba=G.t*bs+bl*Math.PI;
line(ctx,p.x+Math.cos(ba)*10,p.y+Math.sin(ba)*10,p.x+Math.cos(ba)*28,p.y+Math.sin(ba)*28,spin?'#fff':PAL.v,spin?4:3,spin?.95:.8)}}
if(st.aegis){for(var ag2=0;ag2<st.aegisN;ag2++){var aa2=p.aegisA+ag2*TAU/st.aegisN;
var ax2=p.x+Math.cos(aa2)*p.aegisR,ay2=p.y+Math.sin(aa2)*p.aegisR;
ctx.fillStyle=PAL.o;ctx.fillRect(Math.round(ax2)-3,Math.round(ay2)-3,6,6);
ctx.fillStyle='#b8fbff';ctx.fillRect(Math.round(ax2)-2,Math.round(ay2)-2,4,4);
ctx.fillStyle='#fff';ctx.fillRect(Math.round(ax2)-1,Math.round(ay2)-1,2,2);
if(p.dashT>0||p.aegisOut>0){ctx.globalAlpha=.35;pxCircle(ctx,ax2,ay2,6,'#b8fbff',.4);ctx.globalAlpha=1}}}
var blink=p.inv&&Math.floor(G.t*20)%2===0;var fb=Math.sin(G.t*3.2+p.id*2.1)*.8;
var fbx=p.x-Math.sin(p.aim)*fb,fby=p.y+Math.cos(p.aim)*fb,bank=Math.sin(G.t*2.6+p.id*1.7)*.05;
var fca=Math.cos(p.aim),fsa=Math.sin(p.aim);
var alpha=p.invis>0?.26:1;
if(!blink){var spd=hyp(p.vx,p.vy);
if(spd>18){var bx=fbx-fca*10,by=fby-fsa*10;ctx.globalAlpha=alpha;
ctx.fillStyle=Math.floor(G.t*24)%2===0?p.col:p.light;ctx.fillRect(Math.round(bx)-1,Math.round(by)-1,2,2);
ctx.globalAlpha=.4*alpha;ctx.fillStyle=p.col;ctx.fillRect(Math.round(bx-fca*3)-1,Math.round(by-fsa*3)-1,2,2);ctx.globalAlpha=1}
else if(Math.floor(G.t*10)%2===0){ctx.globalAlpha=alpha;ctx.fillStyle=p.light;ctx.fillRect(Math.round(fbx-fca*9),Math.round(fby-fsa*9),1,1);ctx.globalAlpha=1}
drawSpr(ctx,pspr,fbx,fby,p.aim+bank,p.hurtT>0&&Math.floor(G.t*30)%2===0,alpha)}
if(p.invis>0){ctx.save();ctx.globalAlpha=.5+.2*Math.sin(visualT*8);ctx.strokeStyle='#a86bff';ctx.lineWidth=1.2;ctx.setLineDash([4,4]);
ctx.beginPath();ctx.arc(p.x,p.y,14,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();
ctx.save();ctx.globalAlpha=.9;txt(ctx,'НЕВИДИМ '+p.invis.toFixed(1),p.x,p.y-32,'#a86bff',11,'center');
if(p.invisShot)txt(ctx,'УДАР ×'+(st.invisBoost||2).toFixed(1).replace('.0',''),p.x,p.y-44,'#ffd6f2',10,'center');ctx.restore()}
if(p.shield>0)pxCircle(ctx,p.x,p.y,10,PAL.v,.3+.5*(p.shield/st.shieldMax));
if(p.beamT>0&&p.beamChain)for(i=0;i<p.beamChain.length;i++){var c=p.beamChain[i];line(ctx,c.x1,c.y1,c.x2,c.y2,PAL.m,7,.25);line(ctx,c.x1,c.y1,c.x2,c.y2,'#fff',2,.9)}
var pr=p.dashCd<=0?1:1-p.dashCd/st.dashCd;pxCircle(ctx,p.x,p.y,12,p.dashCd<=0?p.col:THEME.css['--edge'],.3+.2*pr);
if(st.hyper&&p.dashHold>0)pxCircle(ctx,p.x,p.y,15,'#ff2fb0',.2+.6*clamp(p.dashHold/1.5,0,1));
if(p.stun>0){ctx.save();ctx.globalAlpha=.75;ctx.strokeStyle='#ffb020';ctx.lineWidth=1.5;ctx.beginPath();
for(var sz=0;sz<10;sz++){var sa2=sz*.7+G.t*9,sr=13+Math.sin(sz*2+G.t*14)*3;
var sx2=p.x+Math.cos(sa2)*sr,sy2=p.y+Math.sin(sa2)*sr;if(sz===0)ctx.moveTo(sx2,sy2);else ctx.lineTo(sx2,sy2)}
ctx.closePath();ctx.stroke();ctx.restore();txt(ctx,'СТАН',p.x,p.y-30,'#ffb020',11,'center')}
if(p.jammed)txt(ctx,'ЗАГЛУШЕН',p.x,p.y+16,'#22e6ff',11,'center');
if(p.trapped){ctx.globalAlpha=.8;pxCircle(ctx,p.x,p.y,14,'#a86bff',.6);ctx.globalAlpha=1}
if(PL.length>1){var hf2=clamp(p.hp/p.max,0,1);
ctx.fillStyle=PAL.o;ctx.fillRect(Math.round(p.x)-12,Math.round(p.y)-21,24,4);
ctx.fillStyle=p.col;ctx.fillRect(Math.round(p.x)-11,Math.round(p.y)-20,Math.round(22*hf2),2);
txt(ctx,String(p.id+1),p.x,p.y-33,p.col,12,'center')}}
if(!isTouch&&G.t-mouseT<4&&idx===0&&!splitActive()){var wpt=screenToWorld(mx,my);ctx.fillStyle=THEME.css['--cyan'];ctx.fillRect(Math.round(wpt.x)-3,Math.round(wpt.y),7,1);ctx.fillRect(Math.round(wpt.x),Math.round(wpt.y)-3,1,7)}
for(i=0;i<G.bul.length;i++){var bl2=G.bul[i];ctx.save();ctx.translate(Math.round(bl2.x),Math.round(bl2.y));ctx.rotate(bl2.a);
if(bl2.dr){ctx.fillStyle=PAL.g;ctx.fillRect(-2,-1,4,2);ctx.fillStyle='#fff';ctx.fillRect(0,-1,1,2)}
else{ctx.fillStyle=bl2.col||PAL.a;ctx.fillRect(-2,-2,4,4);ctx.fillStyle='#fff';ctx.fillRect(0,-1,2,2)}ctx.restore()}
for(i=0;i<G.parts.length;i++){var pp=G.parts[i],al=clamp(pp.l/pp.m,0,1);ctx.globalAlpha=al>.35?1:.55;ctx.fillStyle=pp.c;var sz2=pp.s+(al>.7?1:0);ctx.fillRect(Math.round(pp.x),Math.round(pp.y),sz2,sz2)}ctx.globalAlpha=1;
for(i=0;i<G.floats.length;i++){var fl=G.floats[i];if(fl.l<.2&&Math.floor(fl.l*30)%2===0)continue;
txt(ctx,fl.t,fl.x,fl.y,fl.c,fl.s>1?15:12,'center')}
ctx.restore();
var mw=Math.min(56,vw*.3),mh=Math.round(AR.h/AR.w*mw),mx0=vx+vw-mw-4,my0=vy+4,sc=mw/AR.w;
ctx.globalAlpha=.75;ctx.fillStyle=THEME.css['--deep'];ctx.fillRect(mx0,my0,mw,mh);ctx.strokeStyle=THEME.css['--edge'];ctx.strokeRect(mx0+.5,my0+.5,mw-1,mh-1);
ctx.globalAlpha=.9;for(i=0;i<G.enemies.length;i++){var ee2=G.enemies[i];ctx.fillStyle=ee2.boss?PAL.r:(ee2.type==='dark'?'#a86bff':ee2.type==='medic'?PAL.g:ee2.type==='shielder'?PAL.b:ee2.type==='sniper'?PAL.v:ee2.type==='emitter'?PAL.c:PAL.m);ctx.fillRect(mx0+ee2.x*sc,my0+ee2.y*sc,(ee2.boss||ee2.type==='dark')?3:1,(ee2.boss||ee2.type==='dark')?3:1)}
for(pi=0;pi<PL.length;pi++){var pp2=PL[pi];if(pp2.hp<=0)continue;ctx.fillStyle=pp2.col;ctx.fillRect(mx0+pp2.x*sc-1,my0+pp2.y*sc-1,2,2)}
ctx.globalAlpha=1;
if(splitActive()){txt(ctx,'ИГРОК '+(focus.id+1),vx+6,vy+vh-16,focus.col,13);
ctx.save();ctx.globalAlpha=.5;ctx.strokeStyle=focus.col;ctx.lineWidth=1;ctx.strokeRect(vx+.5,vy+.5,vw-1,vh-1);ctx.restore()}}
function render(ctx){ctx.imageSmoothingEnabled=false;
if(G.state==='map'){drawMap(ctx);return}
if(G.travel&&(G.state==='travel'||G.state==='up')){drawTravel(ctx);return}
ctx.fillStyle=THEME.css['--void'];ctx.fillRect(0,0,W,H);
if(splitActive()){
if(H>=W){renderScene(ctx,0,0,W,H/2-1,P,1,0);renderScene(ctx,0,H/2+1,W,H/2-1,P2,1,1);
ctx.fillStyle=THEME.css['--edge2'];ctx.fillRect(0,H/2-1,W,2)}
else{renderScene(ctx,0,0,W/2-1,H,P,1,0);renderScene(ctx,W/2+1,0,W/2-1,H,P2,1,1);
ctx.fillStyle=THEME.css['--edge2'];ctx.fillRect(W/2-1,0,2,H)}}
else renderScene(ctx,0,0,W,H,viewPlayer(),G.zoom,0);
drawSticks(ctx);drawChronoScreen(ctx);
if(G.portal&&G.state==='play')drawTransfer(ctx);
drawGlitch(ctx);
if(G.flash>0){ctx.globalAlpha=Math.min(.55,G.flash);ctx.fillStyle=G.flashCol;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
var vp=viewPlayer();
if(G.state==='play'&&vp.hp/vp.max<.3&&!CHEAT.god){var pl=.4+.6*Math.abs(Math.sin(G.t*4));ctx.globalAlpha=pl;ctx.fillStyle=PAL.r;
ctx.fillRect(0,VIEW.y,W,1);ctx.fillRect(0,VIEW.y+VIEW.h-1,W,1);ctx.fillRect(0,VIEW.y,1,VIEW.h);ctx.fillRect(W-1,VIEW.y,1,VIEW.h);ctx.globalAlpha=1}}
var SCR={title:'#sTitle',up:'#sUp',shop:'#sShop',pause:'#sPause',over:'#sOver',win:'#sWin'};
function setState(s){G.state=s;G.padSel=0;P.padSel=0;P2.padSel=0;resetSticks();clearSel();
for(var k in SCR)$(SCR[k]).classList.remove('on');if(SCR[s])$(SCR[s]).classList.add('on');
if(s==='pause')syncCheatUI();if(s==='title')buildTitleCols()}
function banner(a,b){var el=$('#banner');el.classList.remove('dread');el.querySelector('b').textContent=a;
el.querySelector('s').textContent=b||'';el.classList.remove('go');void el.offsetWidth;el.classList.add('go')}
function bannerDread(a){var el=$('#banner');el.querySelector('b').textContent=a;el.querySelector('s').textContent='';
el.classList.remove('go');void el.offsetWidth;el.classList.add('dread');el.classList.add('go')}
function syncBest(){$('#tBest').textContent=fmt(G.best.score);$('#tWave').textContent=META.bestDepth;$('#tRuns').textContent=META.runs}
function saveBest(){var rec=G.score>G.best.score;if(rec){G.best={score:G.score,wave:G.wave};storeSet('best',G.best)}
if(G.wave>META.bestDepth)META.bestDepth=G.wave;saveMeta();syncBest();return rec}
function bankFrags(){META.runs++;saveMeta()}
function statsHTML(){var acc=G.st.shots?Math.round(G.st.hits/G.st.shots*100):0,m=Math.floor(G.st.time/60),s=Math.floor(G.st.time%60),mods=0,L=localPlayer().lvl;for(var k in L)mods+=L[k];
return[['УРОВЕНЬ',G.wave,''],['СЧЁТ',fmt(G.score),'g'],['УБИЙСТВ',G.kills,'m'],['ТОЧНОСТЬ',acc+'%','a'],['МОДУЛЕЙ',mods,''],['ВРЕМЯ',m+':'+(s<10?'0':'')+s,'g']].map(function(x){return '<div class="stat '+x[2]+'"><s>'+x[0]+'</s><b>'+x[1]+'</b></div>'}).join('')}
function toggleSound(){A.init();A.resume();musUnlock();A.setOn(!A.on);syncSound();if(A.on)A.tone(660,.1,'square',.1,1.3,0,'ui')}
function syncSound(){var b=$('#bSound');b.classList.toggle('off',!A.on);b.textContent=A.on?'♪':'x';b.title=A.on?'Звук включён':'Звук выключен'}
function setTheme(k){if(!THEMES[k])return;themeKey=k;THEME=THEMES[k];storeSet('theme',k);
var root=document.documentElement;for(var v in THEME.css)root.style.setProperty(v,THEME.css[v]);
applyThemePal();buildSprites();floorCanvas=makeFloor(AR.w,AR.h);if(ctx)initBackground(ctx);syncTheme();recalc();setupTouchButtons(true)}
function syncTheme(){document.querySelectorAll('[data-theme]').forEach(function(p){p.classList.toggle('on',p.getAttribute('data-theme')===themeKey)})}
function buildThemeButtons(){var el=$('#themePills');Object.keys(THEMES).forEach(function(k){var b=document.createElement('button');b.className='pill';b.type='button';b.setAttribute('data-theme',k);b.setAttribute('data-own','0');b.textContent=THEMES[k].n;
b.addEventListener('click',function(){setTheme(k);A.init();A.tone(520,.07,'square',.08,1.3,0,'ui')});el.appendChild(b)});syncTheme();
var bt=$('#bloomToggle');bt.classList.toggle('on',bloomOn);bt.textContent='СВЕЧЕНИЕ: '+(bloomOn?'ВКЛ':'ВЫКЛ');
bt.addEventListener('click',function(){bloomOn=!bloomOn;storeSet('bloom',bloomOn);bt.classList.toggle('on',bloomOn);bt.textContent='СВЕЧЕНИЕ: '+(bloomOn?'ВКЛ':'ВЫКЛ');A.init();A.tone(bloomOn?660:330,.07,'square',.08,1.2,0,'ui')})}
function buildKeys(){var K=[['ГЕЙМПАД 1','стики · LT/L2 рывок · RT оружие/хроно · A подтвердить'],['ГЕЙМПАД 2','игрок 2 в локальном co-op'],['W A S D','P1 движение'],['МЫШЬ','P1 прицел · ЛКМ оружие'],['ПРОБЕЛ','P1 рывок · 1.5с гипер'],['СТРЕЛКИ','P2 движение и меню'],['ENTER / /','P2 рывок / оружие'],['1 2 3 / 8 9 0','модули P1 / P2']];
['#keys1','#keys2'].forEach(function(sel){var el=$(sel);if(!el)return;el.innerHTML='';K.forEach(function(k){var d=document.createElement('div');d.className='key';d.innerHTML='<kbd>'+k[0]+'</kbd><span>'+k[1]+'</span>';el.appendChild(d)})})}
function addFeedback(sel){var box=$(sel+' .box');if(!box||box.querySelector('.fb'))return;
var a=document.createElement('a');a.className='btn fb';a.setAttribute('data-own','0');a.href='https://t.me/Gooseetler';a.target='_blank';a.rel='noopener';
a.textContent='ОБРАТНАЯ СВЯЗЬ';a.style.marginTop='12px';a.style.display='inline-block';a.style.textDecoration='none';box.appendChild(a)}
function sliderRow(label,key,onChange){
var row=document.createElement('div');row.className='volrow';
var lab=document.createElement('span');lab.className='vlab';lab.textContent=label;
var sl=document.createElement('input');sl.type='range';sl.min='0';sl.max='100';sl.className='vslide';sl.value=String(Math.round(VOL[key]*100));
var val=document.createElement('span');val.className='vval';val.textContent=sl.value+'%';
sl.addEventListener('input',function(){VOL[key]=parseInt(sl.value,10)/100;val.textContent=sl.value+'%';applyVolumes();onChange&&onChange()});
row.appendChild(lab);row.appendChild(sl);row.appendChild(val);return row}
function injectSoundUI(){var mount=$('#volMount');if(!mount||$('#volBox'))return;
mount.innerHTML='<span>ЗВУК</span>';
var box=document.createElement('div');box.id='volBox';
box.appendChild(sliderRow('ОБЩАЯ','master'));
box.appendChild(sliderRow('МУЗЫКА','music',function(){musUnlock()}));
box.appendChild(sliderRow('ЭФФЕКТЫ','sfx',function(){A.init();A.shoot()}));
box.appendChild(sliderRow('ИНТЕРФЕЙС','ui',function(){A.init();A.pick(4)}));
var np=document.createElement('div');np.id='nowPlaying';np.textContent='';box.appendChild(np);
mount.appendChild(box)}
var touchInit=false,touchWpn='__';
function setupTouchButtons(force){
var rd=$('#rbDash'),rw=$('#rbWeapon');if(!rd||!rw)return;
if(force||!touchInit){rd.innerHTML='';rd.appendChild(iconCanvas('dash','#22e6ff',4));touchInit=true;touchWpn='__'}
var lp=localPlayer(),st=lp.stats,w=st?st.weapon:null;
if(w!==touchWpn||force){touchWpn=w;rw.innerHTML='';
if(w){var u=upByKey(w);var col=u?u.col:'#4d8cff';
rw.appendChild(iconCanvas(w==='chrono'?'chrono':w,col,4));rw.style.display='';
rw.setAttribute('aria-label',w==='chrono'?'ХРОНО-ПОЛЕ':(u?u.n:'Оружие'))}
else rw.style.display='none'}}
var hudT=0,lScore=-1,lShards=-1,lFrags=-1,lTrack='';
function hud(dt){hudT+=dt;var p=viewPlayer(),st=p.stats||computeStats(p.lvl,p.ship,metaOf(p));var hf=clamp(p.hp/p.max,0,1);
$('#hpFill').style.transform='scaleX('+hf+')';$('#hpBar').classList.toggle('low',hf<.34);$('#stage').classList.toggle('low',G.state==='play'&&hf<.3&&!CHEAT.god);
var dp=p.dashCd<=0?1:1-p.dashCd/st.dashCd;$('#dashFill').style.transform='scaleX('+dp+')';
$('#shBar').style.display=st.shieldMax?'block':'none';if(st.shieldMax)$('#shFill').style.transform='scaleX('+clamp(p.shield/st.shieldMax,0,1)+')';
$('#rkBar').style.display=st.weapon?'block':'none';if(st.weapon)$('#rkFill').style.transform='scaleX('+(st.weaponCdMax?1-p.weaponCd/st.weaponCdMax:0)+')';
$('#comboFill').style.transform='scaleX('+clamp(G.comboT/2.4,0,1)+')';$('#comboBox').classList.toggle('hot',G.combo>=8);
var lp=localPlayer();setupTouchButtons(false);
var rw=$('#rbWeapon');if(rw)rw.classList.toggle('cool',!!(lp.stats&&lp.stats.weapon&&(lp.weaponCd>0||lp.jammed)));
var rd=$('#rbDash');if(rd)rd.classList.toggle('cool',lp.dashCd>0||lp.stun>0);
if(hudT>.1){hudT=0;$('#hpTxt').textContent=Math.ceil(p.hp);$('#comboTxt').textContent='x'+G.mult.toFixed(1);
if(G.score!==lScore){lScore=G.score;$('#cScore').textContent=fmt(G.score)}
if(lp.shards!==lShards){lShards=lp.shards;$('#cShards').textContent=lp.shards}
if(lp.frags!==lFrags){lFrags=lp.frags;$('#cFrags').textContent=lp.frags}
var tl=musLabel();if(tl!==lTrack){lTrack=tl;var np=$('#nowPlaying');if(np)np.textContent=tl?('♪ '+tl):''}}}
function initButtons(){$('#bStart').addEventListener('click',newRun);$('#bSound').addEventListener('click',toggleSound);
$('#bPause').addEventListener('click',function(){if(G.state==='play')pause();else if(G.state==='pause')resume()});
$('#bRestart').addEventListener('click',newRun);$('#bResume').addEventListener('click',resume);$('#bRestart2').addEventListener('click',newRun);
$('#bMenu2').addEventListener('click',toMenu);$('#bAgain').addEventListener('click',newRun);$('#bMenu').addEventListener('click',toMenu);
$('#bAgain2').addEventListener('click',newRun);$('#bMenu3').addEventListener('click',toMenu);
$('#mpHost').addEventListener('click',hostGame);$('#mpJoin').addEventListener('click',onJoinClick);
$('#bLocal').addEventListener('click',toggleLocal);
var ci=$('#mpCode');if(ci)ci.addEventListener('keydown',function(e){if(e.code==='Enter'||e.code==='NumpadEnter'){e.preventDefault();e.stopPropagation();onJoinClick()}});
addFeedback('#sPause')}
var cv,ctx;
function initGame(){cv=$('#cv');ctx=cv.getContext('2d',{alpha:false});setTheme(themeKey);resize();
P.x=AR.w/2;P.y=AR.h/2;centerCam(true);recalc();P.hp=P.max;syncSound();syncBest();$('#cWave').textContent='—';
initBackground(ctx);setupBloom();initInput(cv);injectSoundUI();initButtons();initShopButtons();buildThemeButtons();buildTitleCols();buildKeys();setupTouchButtons(true);initMusic();applyVolumes();requestAnimationFrame(frame)}
function resize(){var sw=window.innerWidth,sh=window.innerHeight,scale=clamp(Math.round(Math.min(sw,sh)/240),2,5),w=Math.ceil(sw/scale),h=Math.ceil(sh/scale);
cv.width=w;cv.height=h;cv.style.width=w*scale+'px';cv.style.height=h*scale+'px';cv.SCALE=scale;
ctx=cv.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
var topPx=$('#top').offsetHeight||50,botPx=$('#hud').offsetHeight||96,ti=Math.ceil(topPx/scale)+3,bi=Math.ceil(botPx/scale)+3;
W=w;H=h;SCALE=scale;VIEW.x=0;VIEW.y=ti;VIEW.w=w;VIEW.h=Math.max(60,h-ti-bi);initBackground(ctx);setupBloom();centerCam(true)}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',function(){setTimeout(resize,250)});
function centerCam(snap){if(!snap)return;var t=camTargetFor(viewPlayer(),0,0,W,H,G.zoom);CAMS[0].x=t.x;CAMS[0].y=t.y;CAM.x=t.x;CAM.y=t.y;
if(PL.length>1){var t2=camTargetFor(P2,0,0,W,H,1);CAMS[1].x=t2.x;CAMS[1].y=t2.y}}
function updateZoom(dt){
if(isLocal()&&PL[0].hp>0&&PL[1].hp>0){
var d=hyp(PL[0].x-PL[1].x,PL[0].y-PL[1].y);
if(d>SPLIT_ON)G.splitOn=true;else if(d<SPLIT_OFF)G.splitOn=false;
var target=G.splitOn?1:clamp(1-(d-90)/420,.62,1);
G.zoom+=(target-G.zoom)*Math.min(1,4*dt)}
else{G.splitOn=false;G.zoom+=(1-G.zoom)*Math.min(1,4*dt)}}
function resetPlayer(p,x,y){p.x=x;p.y=y;p.vx=0;p.vy=0;p.inv=1.2;p.dashCd=0;p.dashT=0;p.fireT=0;p.noHit=0;p.shield=0;p.shieldT=0;p.weaponCd=0;p.beamT=0;p.beamChain=[];p.hyperCd=0;p.dashHold=0;p.socioSpin=0;p.stun=0;p.trapped=0;
p.invis=0;p.invisShot=false;p.jammed=false;p.aegisA=0;p.aegisOut=0;p.coneT=0;p.swingT=0;p.swingDir=1;p.lastSeen={x:x,y:y};
p.shards=0;p.frags=bankOf(p);p.dual=false;p.pickPhase=0;p.offer=[];p.ready=false;p.padSel=0;
var mm=metaOf(p);p.ship=mm.ships.indexOf(mm.ship)>=0?mm.ship:'std';
p.lvl=shipStart(p.ship);p.input={mx:0,my:0,aim:0,dash:false,weapon:false,focus:false,held:false}}
function newRun(){if(NET.mode==='guest')return;A.init();A.resume();musUnlock();
G.enemies=[];G.bul=[];G.ebul=[];G.erock=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];G.mines=[];G.wells=[];G.turrets=[];G.phantoms=[];G.chronoFields=[];
G.parts=[];G.drops=[];G.floats=[];G.rings=[];G.ghost=[];G.queue=[];
G.score=0;G.kills=0;G.combo=0;G.comboT=0;G.mult=1;G.wave=1;G.boss=null;G.shake=0;G.flash=0;G.slow=0;G.glitch=0;G.st={shots:0,hits:0,time:0};
G.portal=null;G.portalCharge=0;G.travel=false;G.travelT=0;G.travelDone=false;G.menuOpened=false;G.postT=0;G.pendingNode=null;
G.lootMult=1;G.event=null;G.lastBossKind=null;G.darkUsed=false;G.zoom=1;G.splitOn=false;G.twinsLink=false;
setArena(640,480);genMap();
PL=(NET.connected||NET.mode==='local')?[P,P2]:[P];
resetPlayer(P,AR.w/2-14,AR.h/2);if(PL.length>1)resetPlayer(P2,AR.w/2+14,AR.h/2);
if(META.bonusShards>0){P.shards+=META.bonusShards;META.bonusShards=0;saveMeta()}
if(isLocal()&&META2.bonusShards>0){P2.shards+=META2.bonusShards;META2.bonusShards=0;saveMeta()}
recalc();for(var i=0;i<PL.length;i++)PL[i].hp=PL[i].max;
G.shards=localPlayer().shards;G.frags=localPlayer().frags;
setupTouchButtons(true);
if(MUS.ready)musPickBattle();
centerCam(true);$('#bossbar').classList.remove('on');
startLevel(G.map[0][0]);syncBest();if(NET.mode==='host')netSend({t:'start'})}
function pause(){if(G.state!=='play'||NET.mode==='guest')return;setState('pause')}
function resume(){if(G.state!=='pause'||NET.mode==='guest')return;setState('play');A.resume()}
function toMenu(){setState('title');G.musicMode='title';G.enemies=[];G.bul=[];G.ebul=[];G.erock=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];G.mines=[];G.wells=[];G.turrets=[];G.phantoms=[];G.chronoFields=[];
G.drops=[];G.queue=[];G.boss=null;G.portal=null;$('#bossbar').classList.remove('on');syncBest();buildTitleCols()}
function gameOver(){setState('over');A.over();G.slow=1;shake(8);flash(.5,'#ff4d4d');part(P.x,P.y,'#ff4d4d',46,150,.9,2);ring(P.x,P.y,4,60,'#ff4d4d',.8);
bankFrags();var rec=saveBest();$('#overRec').innerHTML=rec?'<span class="rec">НОВЫЙ РЕКОРД</span>':'';
$('#overSub').textContent='Уровень '+G.wave+' · '+G.kills+' врагов · фрагменты сохранены';$('#overStats').innerHTML=statsHTML();
if(NET.mode==='host')netSend({t:'over'})}
function winRun(){setState('win');A.win();flash(.35,'#9dff3c');bankFrags();var rec=saveBest();
$('#winRec').innerHTML=rec?'<span class="rec">НОВЫЙ РЕКОРД</span>':'';$('#winStats').innerHTML=statsHTML();
if(NET.mode==='host')netSend({t:'win'})}
var last=performance.now(),acc=0,meteorT=0;
function onBeat(){if(G.state==='pause')return;G.beat++;G.beats.push({r:3,a:.55});
var heat=G.state==='play'?clamp(G.enemies.length/12+(G.boss?.5:0)+G.wave/30,0,1):.05;
if(!MUS.active)A.beat(G.beat,heat,G.musicMode);
var vp=viewPlayer();
if(G.state==='play'&&vp.hp/vp.max<.3&&G.beat%2===0&&!CHEAT.god)A.tone(70,.12,'square',.14,.6)}
function frame(now){var raw=Math.min(.05,(now-last)/1000);last=now;G.dt=raw;
A.frameVoices=0;A.tokens=Math.min(36,A.tokens+raw*30);
pollGamepads();padMenus();stickWatch();
dashHeld=!!keys.Space||GP.dashHeld||touchDashHeld||mouseRightHeld;
if(GP.pause){if(G.state==='play')pause();else if(G.state==='pause')resume()}
updateVisual(raw);musUpdate(raw);G.beatT+=raw;var guard=0;while(G.beatT>=.4&&guard++<4){G.beatT-=.4;onBeat()}
if(G.travel){G.travelT+=raw;
if(!G.menuOpened&&G.travelT>=0.8){G.menuOpened=true;openUp();if(NET.mode==='host')netSend({t:'up'})}
if(G.travelDone){G.postT+=raw;if(G.postT>=1){G.travel=false;startLevel(G.pendingNode)}}}
if(NET.mode==='guest'){
var ri=readInput(P2,1);
NET.pend.dash=NET.pend.dash||ri.dash;NET.pend.weapon=NET.pend.weapon||ri.weapon;
P2.input.mx=ri.mx;P2.input.my=ri.my;P2.input.aim=ri.aim;P2.input.focus=ri.focus;P2.input.held=ri.held;
P2.input.dash=P2.input.dash||ri.dash;P2.input.weapon=P2.input.weapon||ri.weapon;
if(NET.connected&&now-NET.lastSend>33){NET.lastSend=now;
netSend({t:'input',mx:ri.mx,my:ri.my,aim:ri.aim,focus:ri.focus,dash:NET.pend.dash,weapon:NET.pend.weapon,held:ri.held});
NET.pend.dash=false;NET.pend.weapon=false}
guestWorld(now);predictGuest(raw);render(ctx);applyBloom(ctx);hud(raw);requestAnimationFrame(frame);return}
if(G.state==='play'){feedInput(P,1);if(isLocal())feedInput(P2,2)}
var scale=G.state==='play'?(G.slow>0?.4:1):(G.state==='title'?.6:(G.state==='over'||G.state==='win'?.5:.1));
acc+=raw*scale;var steps=0;while(acc>=STEP&&steps<5){update(STEP);acc-=STEP;steps++}if(acc>STEP*5)acc=0;
if(NET.mode==='host'&&NET.connected&&now-NET.lastState>33){NET.lastState=now;netSend(snapshot())}
render(ctx);applyBloom(ctx);hud(raw);requestAnimationFrame(frame)}
function update(dt){G.t+=dt;G.shake=Math.max(0,G.shake-dt*22);G.flash=Math.max(0,G.flash-dt*2.2);G.slow=Math.max(0,G.slow-dt);updateEffects(dt);
if(G.state!=='play')return;
updateChrono(dt);
G.st.time+=dt;G.waveT+=dt*(chronoAnyGlobal()?.4:1);
if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0){G.combo=0;G.mult=1}}
if(G.event==='meteor'){meteorT-=dt;if(meteorT<=0){meteorT=1.2;var mp=nearestPlayer(rand(AR.x,AR.x+AR.w),rand(AR.y,AR.y+AR.h));spawnZone(mp.x+rand(-40,40),mp.y+rand(-40,40),26,.7,1,14*D.dmg*dmgScale(),'#ffb020')}}
if(G.portal){var inside=null;
for(var i=0;i<PL.length;i++){var p=PL[i];if(p.hp>0&&hyp(p.x-G.portal.x,p.y-G.portal.y)<G.portal.r+p.r){inside=p;break}}
var still=inside&&hyp(inside.vx,inside.vy)<10&&hyp(inside.input.mx,inside.input.my)<.1&&!inside.trapped;
if(still){G.portalCharge+=dt;if(G.portalCharge>=1.5)enterPortal()}
else G.portalCharge=Math.max(0,G.portalCharge-dt*2)}
updateSpawns();for(i=0;i<PL.length;i++)updatePlayer(PL[i],dt);
updateWells(dt);updateZoom(dt);updateTurrets(dt);updatePhantoms(dt);
updateBullets(dt);updateRockets(dt);updateERockets(dt);updateMines(dt);
updateHazards(dt);updateEnemies(dt);updateEnemyBullets(dt);updateDrops(dt);
G.shards=localPlayer().shards;G.frags=localPlayer().frags;
if(G.active&&!G.queue.length&&!G.enemies.length&&!G.portal)waveClear()}
try{initGame();window.__pulsarReady=true}catch(e){if(window.__boot)window.__boot('INIT: '+(e&&e.message||e))}
})();
