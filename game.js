(function(){
'use strict';
var TAU=Math.PI*2,STEP=1/60,MAX_WAVE=30,EDGE=40,BOSS_DEPTHS=[5,10,14,18,22,26];
var D={hp:1.56,sp:1.12,dmg:1.62,budget:1.25,base:80,mult:1.5};
var BOSS_NAMES={guardian:'СТРАЖ',hive:'МАТКА УЛЬЯ',prism:'ПРИЗМА',hammer:'МОЛОТ',eye:'ОКО',phantom:'ФАНТОМ',twins:'ЭХО И ЭГИДА'};
var BOSS_POOL=['guardian','prism','hammer','eye','phantom','twins'],ALLB=BOSS_POOL.concat(['hive']);
var DREAD=['КТО ТЫ?','ПОЧЕМУ ТЫ ЗДЕСЬ','УБИРАЙСЯ.','УМРИ!','???'];
var CHEAT={god:false,dark:false},REVIVE_COST=100,SPLIT_ON=340,SPLIT_OFF=250,DK=1/3,MAX_MINES=18,SHIPMOD_COST=50;
var CAPMSG=['ПОМОГИТЕ!','ОНИ ПРОБИЛИ КОРПУС!','ЗДЕСЬ ЕСТЬ ЛЮДИ!','ДЕРЖИТЕ ИХ ОТ НАС!','МЫ НЕ ВЫБЕРЕМСЯ!','ЕЩЁ НЕМНОГО!'];
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
function metaDefault(){return{frag:0,bonusShards:0,perm:{hp:0,spd:0,dmg:0,rate:0,dash:0,shield:0,luck:0},unlocked:[],bp:[],invest:{},runs:0,bestDepth:0,bestEnd:0,ships:['std'],ship:'std'}}
function loadMeta(k){var m=storeGet(k,metaDefault());m.invest=m.invest||{};m.ships=m.ships||['std'];m.ship=m.ship||'std';m.frag=m.frag||0;m.bonusShards=m.bonusShards||0;m.bestEnd=m.bestEnd||0;
m.perm=m.perm||metaDefault().perm;m.unlocked=m.unlocked||[];m.bp=m.bp||[];return m}
var META=loadMeta('meta'),META2=loadMeta('meta2');
function saveMeta(){storeSet('meta',META);storeSet('meta2',META2)}
var SEEN=storeGet('seen',{e:{},b:{}});SEEN.e=SEEN.e||{};SEEN.b=SEEN.b||{};
function saveSeen(){storeSet('seen',SEEN)}
function markSeenE(t){if(!SEEN.e[t]){SEEN.e[t]=1;saveSeen()}}
function markSeenB(t){if(!SEEN.b[t]){SEEN.b[t]=1;saveSeen()}}
function seatMeta(s){return s===1?META2:META}
function metaOf(p){if(isLocal())return p.id?META2:META;return META}
function bankOf(p){return metaOf(p).frag}
function setBank(p,v){metaOf(p).frag=v;if(p)p.frags=v;saveMeta()}
function addBank(p,n){setBank(p,bankOf(p)+n)}
function wallet(s){return seatMeta(s===undefined?0:s).frag}
var VOL=storeGet('vols',{master:1,music:.55,sfx:1,ui:1});
if(typeof VOL.sfx!=='number')VOL={master:1,music:.55,sfx:1,ui:1};
function saveVol(){storeSet('vols',VOL)}
var PERMS=[{k:'hp',n:'КОРПУС+',d:'+15 базового HP',base:18,max:8},{k:'spd',n:'ДВИГАТЕЛЬ+',d:'+4% скорость',base:15,max:6},
{k:'dmg',n:'КАЛИБР+',d:'+6% урон',base:18,max:8},{k:'rate',n:'ТЕМП+',d:'+5% скорострельность',base:15,max:6},
{k:'dash',n:'РЫВОК+',d:'-6% откат рывка',base:15,max:5},{k:'shield',n:'ЩИТ+',d:'+10 энергии щита',base:15,max:6},
{k:'luck',n:'УДАЧА+',d:'+10% шанс чертежей',base:20,max:5}];
var BP_COST=30;
function permCost(mm,k){var p=null;for(var i=0;i<PERMS.length;i++)if(PERMS[i].k===k)p=PERMS[i];return Math.round(p.base*Math.pow(1.45,mm.perm[k]||0))}
var LOCKED=['vamp','kir','pierce','hyper','socio','healdrone','aegis','seeder','phase','tesla'];
var SHIP_LOCKED=['phantom','forge','reaper','chronos','legion','groza','monster'];
var SHIPS=[
{id:'std',n:'МАРШАЛ',cost:0,d:'сбалансированный корабль · ровный темп огня'},
{id:'sniper',n:'СНАЙПЕР',cost:50,d:'темп в 3.5 раза ниже · пуля в 7 раз быстрее · пробой 2 · +40% скорость'},
{id:'bomber',n:'БОМБАРДИР',cost:50,d:'самонаводящиеся ракеты 30 · броня 3 · мина после рывка'},
{id:'psy',n:'ТАКТИЛЬНЫЙ ПСИХОПАТ',cost:50,d:'дробовик · волна 1 · социофоб 3 · x2 скорость · рывок отражает пули'},
{id:'phantom',n:'ФАНТОМ',cost:100,d:'невидимость 1.2с после рывка · первый выстрел ×2 · +25% скорость · −20% урон'},
{id:'forge',n:'КУЗНЕЦ',cost:140,d:'рывок ставит турель (3 шт) · +30 корпус · свой огонь вдвое медленнее'},
{id:'reaper',n:'ЖНЕЦ',cost:100,d:'коса 46/120° · кровотечение лечит тебя · +40 корпус · −15% скорость'},
{id:'chronos',n:'ХРОНОС',cost:140,d:'оружие = хроно-поле · не берёт модули оружия'},
{id:'legion',n:'ЛЕГИОН',cost:100,d:'старт с 2 спутниками · дроны бьют на 100% · −35% свой урон'},
{id:'groza',n:'ГРОЗА',cost:100,d:'конус молний 70°/95 · 26 урона в секунду · шанс оглушения'},
{id:'monster',n:'МОНСТРООБРАЗНЫЙ',cost:160,d:'×3 корпус · две сходящиеся пушки · все три активных оружия сразу · дальний мощный рывок · щупальца'}];
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
if(id==='monster')return{dash:1};
return{}}
var THEMES={
neon:{n:'НЕОН',v:'#0a0518',dp:'#150a2e',pn:'#1d1040',p2:'#2a1856',eg:'#4a2a8f',ink:'#f4ecff',dim:'#9a8fc4',
pal:{c:'#22e6ff',C:'#b8fbff',g:'#9dff3c',G:'#4d8f1e',m:'#ff2fb0',M:'#8f1a63',a:'#ffb020',A:'#8f5a10',r:'#ff4d4d',R:'#8f2020',v:'#a86bff',V:'#4f2a94',b:'#4d8cff',B:'#1e4f8f'},
fl:{base:'#0a0518',n1:'79,42,148',n2:'34,230,255',star:'216,208,240',grid:'168,107,255'},st:['#4f2a94','#22e6ff','#6b6a8a','#a86bff']},
synth:{n:'СИНТВЕЙВ',v:'#12041f',dp:'#200736',pn:'#2b0a4a',p2:'#3d1166',eg:'#7a1e8f',ink:'#ffe9fb',dim:'#c79ad6',
pal:{c:'#4dc9ff',C:'#d8f4ff',g:'#7dff8a',G:'#2f8f4a',m:'#ff6ec7',M:'#8f2a6b',a:'#ff9e3d',A:'#8f5a20',r:'#ff4d6d',R:'#8f2038',v:'#b967ff',V:'#5a2a9f',b:'#4dc9ff',B:'#1e5f8f'},
fl:{base:'#12041f',n1:'255,110,199',n2:'77,201,255',star:'255,233,251',grid:'255,110,199'},st:['#7a1e8f','#ff6ec7','#8a6a9a','#b967ff']},
amber:{n:'АМБЕР',v:'#0d0700',dp:'#1a0f00',pn:'#241500',p2:'#332000',eg:'#6b4300',ink:'#ffe9c4',dim:'#c9a06a',
pal:{c:'#ffc24d',C:'#ffe9c4',g:'#ffd98a',G:'#8f6a20',m:'#ff9e3d',M:'#8f4a10',a:'#ffb020',A:'#8f5a10',r:'#ff6b4d',R:'#8f2a10',v:'#e0a060',V:'#6b4300',b:'#ffd98a',B:'#8f6a20'},
fl:{base:'#0d0700',n1:'201,138,30',n2:'255,176,32',star:'255,233,196',grid:'201,138,30'},st:['#6b4300','#c98a1e','#8a7a5a','#e0a060']},
bio:{n:'БИО-ОКЕАН',v:'#02120f',dp:'#04211c',pn:'#063028',p2:'#0a4438',eg:'#1e6b52',ink:'#e6fff6',dim:'#8fc9b8',
pal:{c:'#4dffd2',C:'#d8fff2',g:'#9dff3c',G:'#4d8f1e',m:'#ff7a9e',M:'#8f2a4a',a:'#ffd76a',A:'#8f6a20',r:'#ff5a6d',R:'#8f2030',v:'#7ab8ff',V:'#2a5a8f',b:'#4dffd2',B:'#1e6b52'},
fl:{base:'#02120f',n1:'53,240,160',n2:'122,184,255',star:'230,255,246',grid:'53,240,160'},st:['#1e6b52','#4dffd2','#5a8a7a','#7ab8ff']}};
function themeCss(t){var p=t.pal;return{'--void':t.v,'--deep':t.dp,'--panel':t.pn,'--panel2':t.p2,'--edge':t.eg,'--edge2':p.v,'--cyan':p.c,'--green':p.g,'--mag':p.m,'--amber':p.a,'--red':p.r,'--violet':p.v,'--blue':p.b,'--ink':t.ink,'--dim':t.dim}}
var themeKey=storeGet('theme','neon'),THEME=THEMES[themeKey]||THEMES.neon,bloomOn=storeGet('bloom',true);
var PAL={o:'#0a0518',d:'#150a2e',w:'#d8d0f0',W:'#ffffff',s:'#6b6a8a'};
function applyThemePal(){var p=THEME.pal;for(var k in p)PAL[k]=p[k];PAL.o=THEME.v;PAL.d=THEME.dp}
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
{k:'shield',n:'ЩИТ',d:'+25 энергии щита',cap:3,col:'#a86bff'},
{k:'kir',n:'СКОРОСТРЕЛ КИРЮША',d:'+14% темп и +18% скорость пуль',cap:3,col:'#22e6ff'},
{k:'aegis',n:'ЭГИДА',d:'обломки режут пули · на рывке таранят',cap:3,col:'#b8fbff'},
{k:'seeder',n:'МИННОЕ ПОЛЕ',d:'рывок сеет мины · 55/70/85 урона',cap:3,col:'#ffb020'},
{k:'phase',n:'ФАЗОВЫЙ СДВИГ',d:'рывок сквозь всё · фантом копирует оружие',cap:2,col:'#a86bff'},
{k:'tesla',n:'ТЕСЛА-КАТУШКА',d:'аура 9/14/20 урона в сек и замедление',cap:3,col:'#22e6ff'},
{k:'scytheEdge',n:'КЛИНОК ЖАТВЫ',d:'личное ЖНЕЦА: коса шире и дальше',cap:3,col:'#ff2fb0',ship:'reaper'},
{k:'phaseDrive',n:'ФАНТОМНЫЙ ПРИВОД',d:'личное ФАНТОМА: дальше рывок, дольше невидимость',cap:3,col:'#a86bff',ship:'phantom'},
{k:'swarmCore',n:'ЯДРО РОЯ',d:'личное ЛЕГИОНА: +1 дрон, до 5',cap:3,col:'#9dff3c',ship:'legion'},
{k:'stormChain',n:'ЦЕПЬ ГРОЗЫ',d:'личное ГРОЗЫ: шире конус, электризация',cap:3,col:'#22e6ff',ship:'groza'},
{k:'foundry',n:'ЛИТЕЙНЫЙ ЦЕХ',d:'личное КУЗНЕЦА: +1 турель',cap:3,col:'#ffb020',ship:'forge'},
{k:'chronoCore',n:'ХРОНО-ЯДРО',d:'личное ХРОНОСА: короче откат · 3 ур. всё поле',cap:3,col:'#4d8cff',ship:'chronos'},
{k:'rocket',n:'РАКЕТОМЁТ',d:'ракета · урон 50/100/150',cap:3,col:'#ffb020',weapon:true},
{k:'wave',n:'УДАРНАЯ ВОЛНА',d:'раз в 5с · радиус 100 · урон 45/70/115',cap:3,col:'#22e6ff',weapon:true},
{k:'beam',n:'ЛУЧ',d:'3с непрерывного урона · откат 7с',cap:3,col:'#ff2fb0',weapon:true},
{k:'healdrone',n:'ДРОН-ЦЕЛИТЕЛЬ',d:'лечение, растёт с уровнем',cap:4,col:'#9dff3c'},
{k:'hydra',n:'ГИДРА',d:'ракета слабее, но +3 мини-ракеты',cap:1,col:'#ffd76a',gold:true,req:'rocket'},
{k:'density',n:'ПЛОТНОСТЬ',d:'волна 90°, урон x4, радиус 150',cap:1,col:'#ffd76a',gold:true,req:'wave'},
{k:'reflect',n:'ОТРАЖЕНИЕ',d:'луч отражается до 5 целей',cap:1,col:'#ffd76a',gold:true,req:'beam'},
{k:'hyper',n:'ГИПЕР ДРАЙВ',d:'зажми рывок 1.5с · таран 50/75/100',cap:3,col:'#ff2fb0'},
{k:'hyperGold',n:'ЦЕПНОЙ ТАРАН',d:'гипер драйв таранит 3 врагов',cap:1,col:'#ffd76a',gold:true,req:'hyper',cost:100},
{k:'socio',n:'СОЦИОФОБ',d:'два лезвия · после рывка лазер',cap:3,col:'#a86bff'}];
var ICON={rate:['...ooo...','..occo...','.occo....','occccoo..','.ooccco..','...occo..','..occo...','..oco....','..oo.....'],cal:['....x....','....x....','..xxxxx..','.xx.w.xx.','xxxwwwxxx','.xx.w.xx.','..xxxxx..','....x....','....x....'],fan:['x...x...x','.x..x..x.','..x.x.x..','...xxx...','....x....','....x....','....x....','....x....','....x....'],pierce:['.........','..x...x..','..x...x..','xxxxxxxxx','..x...xxx','..x...x..','.........','.........','.........'],speed:['..x..x...','.xx..xx..','xxx..xxx.','.xx..xx..','..x..x...','.........','..x..x...','.xx..xx..','.........'],armor:['.xxxxxxx.','xwwwwwwwx','xwxxxxxwx','xwxxxxxwx','xwxxxxxwx','.xwxxxwx.','..xwxwx..','...xxx...','....x....'],dash:['.........','.x...x...','.xx..xx..','.xxx.xxx.','.xx..xx..','.x...x...','.........','........x','.........'],magnet:['.xx...xx.','xxx...xxx','x.x...x.x','x.x...x.x','x.xxxxx.x','.xxxxxxx.','..xxxxx..','.........','.........'],vamp:['....x....','...xxx...','..xxxxx..','.xxxxxxx.','xxxwwwxxx','xxxwwwxxx','.xxxxxxx.','..xxxxx..','...xxx...'],drone:['..xxxxx..','.x.....x.','x..www..x','x..www..x','x..www..x','.x.....x.','..xxxxx..','.........','.........'],regen:['.xx...xx.','xxxx.xxxx','xxxxxxxxx','xxxxxxxxx','.xxxxxxx.','..xxxxx..','...xxx...','....x....','.........'],shield:['..xxxxx..','.x.....x.','x..www..x','x..www..x','x..www..x','.x..w..x.','..x.w.x..','...xxx...','.........'],kir:['....xx...','...xx....','..xxxxx..','.xxxx....','...xx....','..xx.....','.xx......','xx.......','.........'],aegis:['..x...x..','.xxx.xxx.','..x...x..','.........','...www...','..w...w..','...www...','.........','....x....'],seeder:['.........','..x.x.x..','.xxxxxxx.','..x.x.x..','.........','...www...','...w.w...','...www...','.........'],phase:['....x....','...xx....','..xxxx...','.xxxxxx..','..xxxx...','...xx....','....x....','..w...w..','.........'],tesla:['x...x...x','.x.x.x.x.','..xxxxx..','...www...','...w.w...','...www...','..xxxxx..','.x.x.x.x.','x...x...x'],chrono:['..xxxxx..','.x.....x.','x...w...x','x...w...x','x...ww..x','x.......x','x.......x','.x.....x.','..xxxxx..'],scytheEdge:['......xxx','....xxxww','..xxxww..','.xxww....','xxw......','xw.......','w........','.........','.........'],phaseDrive:['....x....','...xxx...','..xxxxx..','.xxxxxxx.','..x...x..','.w.....w.','w.......w','.........','....x....'],swarmCore:['x..x..x..','.x.x.x...','..xxx....','.xwwwx...','..xwx....','.xwwwx...','..xxx....','.x.x.x...','x..x..x..'],stormChain:['x...x....','.x.x..x..','..x..x...','.xxx.xxx.','..x...x..','.xxx.xxx.','..x..x...','.x.x..x..','x...x....'],foundry:['..xxxxx..','.x.....x.','x.wwwww.x','x.w...w.x','x.w.w.w.x','x.w...w.x','x.wwwww.x','.x.....x.','..xxxxx..'],chronoCore:['..xxxxx..','.x..w..x.','x..www..x','x.w.w.w.x','x..www..x','x...w...x','x.......x','.x.....x.','..xxxxx..'],rocket:['....x....','...xxx...','...xwx...','...xwx...','..xxwxx..','..xwwwx..','.xx...xx.','.........','.........'],wave:['.........','..x...x..','.x.x.x.x.','x..x.x..x','x..x.x..x','.x.x.x.x.','..x...x..','.........','.........'],beam:['x........','xx.......','x.x......','x..x.....','x...x....','x....x...','x.....x..','x......xx','x........'],healdrone:['..xxxxx..','.x..w..x.','x..www..x','x..www..x','x..www..x','.x..w..x.','..xxxxx..','.........','.........'],hydra:['....x....','...xxx...','..xwxwx..','.xxwxwxx.','..xwxwx..','...xxx...','....x....','.........','.........'],density:['....x....','...xxx...','..xxxxx..','.xxxxxxx.','xxxxxxxxx','.xxxxxxx.','..xxxxx..','...xxx...','....x....'],reflect:['x...x...x','.x.x.x.x.','..x.x.x..','...xxx...','..x.x.x..','.x.x.x.x.','x...x...x','.........','.........'],hyper:['....x....','...xxx...','..xxwxx..','.xxxwxxx.','xxxxwxxxx','.xxxwxxx.','..xxwxx..','...xxx...','....x....'],hyperGold:['x...x...x','.x.x.x.x.','..xxxxx..','.xxwwwxx.','..xxxxx..','.x.x.x.x.','x...x...x','.........','.........'],socio:['..x...x..','.xxx.xxx.','..x...x..','.........','..x...x..','.xxx.xxx.','..x...x..','.........','.........']};
var G={state:'title',t:0,dt:.016,wave:0,waveT:0,score:0,shards:0,frags:META.frag,kills:0,combo:0,comboT:0,mult:1,endless:false,
enemies:[],bul:[],ebul:[],erock:[],rockets:[],beams:[],zones:[],shocks:[],mines:[],wells:[],turrets:[],phantoms:[],chronoFields:[],
parts:[],drops:[],floats:[],rings:[],ghost:[],beats:[],queue:[],cap:null,
active:false,boss:null,shake:0,flash:0,flashCol:'#fff',slow:0,glitch:0,beat:0,beatT:0,musicMode:'title',zoom:1,splitOn:false,padSel:0,
twinsLink:false,glossTab:'all',nid:0,bossIdx:0,
best:storeGet('best',{score:0,wave:0}),st:{shots:0,hits:0,time:0},
portal:null,portalCharge:0,map:null,curNode:0,mapCam:0,mapDrag:{active:false,startX:0,startCam:0,moved:false},mapSel:0,
travel:false,travelT:0,travelDone:false,menuOpened:false,postT:0,pendingNode:null,
lootMult:1,arena:{w:640,h:480},event:null,lastBossKind:null,lastKill:{x:320,y:240},bossPool:BOSS_POOL.slice(),darkUsed:false};
function makePlayer(id,col,light){return{id:id,col:col,light:light,ship:'std',x:0,y:0,vx:0,vy:0,r:5,hp:100,max:100,aim:0,fireT:0,dashT:0,dashCd:0,dx:1,dy:0,inv:0,hurtT:0,noHit:0,focus:false,shield:0,shieldT:0,weaponCd:0,beamT:0,beamChain:[],dT:[],lvl:{},shards:0,frags:0,dual:false,pickPhase:0,offer:[],ready:false,padSel:0,stun:0,trapped:0,hyperCd:0,dashHold:0,socioSpin:0,invis:0,invisShot:false,jammed:false,aegisA:0,aegisR:24,aegisOut:0,swingT:0,swingDir:1,lastSeen:{x:0,y:0},coneT:0,wsel:0,wcd:{wave:0,beam:0,rocket:0},plateT:0,stats:null,input:{mx:0,my:0,aim:0,dash:false,weapon:false,focus:false,held:false,cycle:false}}}
var P=makePlayer(0,'#ffb020','#fff0cf'),P2=makePlayer(1,'#4d8cff','#b8d4ff'),PL=[P];
P.frags=META.frag;P2.frags=META2.frag;
var CAM={x:0,y:0},CAMS=[{x:0,y:0},{x:0,y:0}],VIEW={x:0,y:0,w:240,h:240},AR={x:0,y:0,w:640,h:480};
var W=240,H=240,SCALE=3,eid=0,bid=0;
function nextEid(){return ++eid}function nextBid(){return ++bid}
var keys={},mx=0,my=0,mouseT=-99,K2={dash:false,weapon:false,cycle:false};
var sticks={move:{id:null,ox:0,oy:0,dx:0,dy:0,m:0},aim:{id:null,ox:0,oy:0,dx:0,dy:0,m:0}};
var activePtr={},isTouch=(window.matchMedia&&window.matchMedia('(hover:none)').matches)||('ontouchstart' in window);
var LI={dash:false,weapon:false,cycle:false},dashHeld=false,touchDashHeld=false,mouseRightHeld=false;
function clearStick(id){['move','aim'].forEach(function(k){var s=sticks[k];if(s.id===id){s.id=null;s.m=0;s.dx=0;s.dy=0}})}
function resetSticks(){sticks.move.id=null;sticks.move.m=0;sticks.move.dx=0;sticks.move.dy=0;sticks.aim.id=null;sticks.aim.m=0;sticks.aim.dx=0;sticks.aim.dy=0;touchDashHeld=false}
var HAP={on:storeGet('haptic',true),last:{},
set:function(v){this.on=v;storeSet('haptic',v)},
ok:function(k,ms){var t=performance.now();if(this.last[k]&&t-this.last[k]<ms)return false;this.last[k]=t;return true},
phone:function(pat){if(!this.on)return;try{if(navigator.vibrate)navigator.vibrate(pat)}catch(e){}},
pads:function(s,w,d){if(!this.on)return;for(var i=0;i<2;i++){var g=i?GP2:GP,pad=g&&g.raw;if(!pad||!pad.vibrationActuator)continue;
try{pad.vibrationActuator.playEffect('dual-rumble',{startDelay:0,duration:d,strongMagnitude:s,weakMagnitude:w})}catch(e){}}},
hit:function(){if(!this.ok('h',110))return;this.phone(9);this.pads(0,.18,45)},
hurt:function(){if(!this.ok('u',260))return;this.phone([22,30,22]);this.pads(.55,.35,150)},
boom:function(){if(!this.ok('b',150))return;this.phone([38,20,26]);this.pads(.85,.6,230)},
dash:function(){if(!this.ok('d',140))return;this.phone(7);this.pads(0,.22,60)},
pick:function(){if(!this.ok('p',180))return;this.phone(5);this.pads(0,.1,30)},
death:function(){this.phone([60,50,90,50,160]);this.pads(1,.9,600)},
win:function(){this.phone([30,40,30,40,90]);this.pads(.5,.7,420)},
big:function(){this.phone([90,60,140,60,220]);this.pads(1,1,750)},
zap:function(){if(!this.ok('z',300))return;this.phone(6);this.pads(0,.14,40)}};
function mkPad(){return{active:false,raw:null,mx:0,my:0,aim:0,aimActive:false,dash:false,weapon:false,cycle:false,pause:false,dashHeld:false,up:false,down:false,left:false,right:false,ok:false,back:false,prev:{},ax:{}}}
var GP=mkPad(),GP2=mkPad();
function readPad(g,pad){
g.dash=false;g.weapon=false;g.cycle=false;g.pause=false;g.dashHeld=false;g.up=false;g.down=false;g.left=false;g.right=false;g.ok=false;g.back=false;
g.raw=pad||null;
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
if(e[3])g.cycle=true;
if(e[9])g.pause=true;
if(e[12])g.up=true;if(e[13])g.down=true;if(e[14])g.left=true;if(e[15])g.right=true;
if(e[0])g.ok=true;if(e[1])g.back=true;
if(g.my<-.6&&!g.ax.y){g.up=true;g.ax.y=true}if(g.my>-.25&&g.my<.25)g.ax.y=false;
if(g.my>.6&&!g.ax.y2){g.down=true;g.ax.y2=true}if(g.my<.25&&g.my>-.25)g.ax.y2=false;
if(g.mx<-.6&&!g.ax.x){g.left=true;g.ax.x=true}if(g.mx>-.25&&g.mx<.25)g.ax.x=false;
if(g.mx>.6&&!g.ax.x2){g.right=true;g.ax.x2=true}if(g.mx<.25&&g.mx>-.25)g.ax.x2=false}
function pollGamepads(){var pads=navigator.getGamepads?navigator.getGamepads():[],list=[];
for(var i=0;i<pads.length;i++)if(pads[i]&&pads[i].connected)list.push(pads[i]);
readPad(GP,list[0]);readPad(GP2,list[1])}
function padMove(g){var l=hyp(g.mx,g.my);if(l>1)return{x:g.mx/l,y:g.my/l};return{x:g.mx,y:g.my}}
var NET={mode:'solo',peer:null,conn:null,code:'',connected:false,lastSend:0,lastState:0,buf:[],pred:null,interp:70,pend:{dash:false,weapon:false,cycle:false}};
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
else{NET.mode='local';PL=[P,P2];P2.frags=META2.frag;mpStatus('Локальный co-op: у каждого свой профиль.')}
var b=$('#bLocal');if(b){b.classList.toggle('on',NET.mode==='local');b.textContent=NET.mode==='local'?'CO-OP ВКЛЮЧЁН · ВЫКЛЮЧИТЬ':'2 ИГРОКА НА ОДНОМ ЭКРАНЕ'}
buildTitleCols();recalc()}
function onNet(d){
if(NET.mode==='host'){
if(d.t==='input'){P2.input.mx=d.mx;P2.input.my=d.my;P2.input.aim=d.aim;P2.input.focus=d.focus;P2.input.held=d.held;
if(d.dash)P2.input.dash=true;if(d.weapon)P2.input.weapon=true;if(d.cycle)P2.input.cycle=true}
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
G.state=db.st;G.wave=db.wave;G.score=db.score;G.mult=db.mult;G.comboT=db.comboT;G.twinsLink=!!db.twinsLink;G.endless=!!db.endless;
G.chronoFields=db.chronoFields||[];G.cap=db.cap||null;
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
o.ship=pb.ship||'std';o.ready=pb.ready;o.stun=pb.stun||0;o.invis=pb.invis||0;o.jammed=!!pb.jammed;o.wsel=pb.wsel||0;o.wcd=pb.wcd||o.wcd;o.plateT=pb.plateT||0;
o.aegisA=pb.aegisA||0;o.aegisR=pb.aegisR||24;o.swingT=pb.swingT||0;o.swingDir=pb.swingDir||1}
PL=db.pl.length>1?[P,P2]:[P];G.shards=localPlayer().shards;G.frags=localPlayer().frags;
if(db.boss){$('#bossbar').classList.add('on');$('#bossName').textContent=db.boss.name;$('#bossPhase').textContent='ФАЗА '+db.boss.phase;setBossPips(db.boss.phase);$('#bossFill').style.transform='scaleX('+clamp(db.boss.fr,0,1)+')'}else $('#bossbar').classList.remove('on')}
function snapshot(){
function rp(p){return{x:Math.round(p.x),y:Math.round(p.y),hp:Math.round(p.hp),max:p.max,aim:+p.aim.toFixed(2),col:p.col,shield:Math.round(p.shield),inv:p.inv>0,beamT:p.beamT,chain:p.beamChain,dashCd:p.dashCd,socioSpin:p.socioSpin,stats:p.stats,lvl:p.lvl,shards:p.shards,frags:p.frags,ship:p.ship,ready:p.ready,stun:p.stun,invis:p.invis,jammed:p.jammed,wsel:p.wsel,wcd:p.wcd,plateT:p.plateT,aegisA:+p.aegisA.toFixed(2),aegisR:Math.round(p.aegisR),swingT:p.swingT,swingDir:p.swingDir}}
function re(e){return{id:e.id,x:Math.round(e.x),y:Math.round(e.y),r:e.r,type:e.type,ang:e.ang,aim:e.aim,face:e.face,tel:e.tel,col:e.col,hp:e.hp,max:e.max,boss:e.boss,ghost:e.ghost,bossKind:e.bossKind,ship:e.ship,shieldFl:e.shieldFl,beam:e.beam,mode:e.mode,ax:e.ax,ay:e.ay,ar:e.ar,slot:e.slot,guardId:e.guardId,fl:e.fl,shield:e.shield,open:e.open,elite:e.elite,invuln:e.invuln,sc:e.sc,stunT:e.stunT,bleedT:e.bleedT,electroT:e.electroT,st:e.st,heat:e.heat,lock:e.lock,swingT:e.swingT,swingDir:e.swingDir,stats:e.type==='dark'?e.stats:undefined}}
return{t:'state',st:G.state,wave:G.wave,score:G.score,mult:G.mult,comboT:G.comboT,musicMode:G.musicMode,twinsLink:G.twinsLink,endless:G.endless,chronoFields:G.chronoFields,cap:G.cap,
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
function spr(rows,map){var w=0;for(var i=0;i<rows.length;i++)w=Math.max(w,rows[i].length);var c=mkC(w,rows.length),g=c.getContext('2d'),m=map||PAL;
for(var y=0;y<rows.length;y++)for(var x=0;x<rows[y].length;x++){var ch=rows[y][x];if(ch==='.'||ch===' ')continue;var col=m[ch];if(!col)continue;g.fillStyle=col;g.fillRect(x,y,1,1)}
return{n:c,f:tint(c,'#fff'),w:w,h:rows.length}}
function mirror(half){var r=half.slice();for(var i=half.length-2;i>=0;i--)r.push(half[i]);return r}
function shipHalf(id){
if(id==='sniper')return['ooo...ooo.................','occo.occo.................','oCCcocCo...oo.............','oocCcCooo.ocCo............','.oocCcccoocCooooooooooooo.','ooGccCccccCcccccccccccccco','oGGccccCCCCCCCCCCCCcooooo.'];
if(id==='bomber')return['.oo.............','ocCo............','ocCco...........','.ocCco..oo......','..ocCcoocCo.....','...ocCcocCco....','..oocCccCCwco...','GgocCcCWWWcco...'];
if(id==='psy')return['....oooo.....','..ooccccoo...','.ocCCWWCCco..','ocCWWWWWWCco.','ocCWWWWWWCco.','ocCWWWWWWCco.','GgcCWWWWWCco.'];
if(id==='phantom')return['.......oo...............','......ocCo..............','.....ocCCco..oo.........','....ocCCCco.ocCo........','..oocCCCCCcoocCCco......','.oGgccCCCCCcCCCCCwco....','oGGgocccCCCWWWWWWccco...'];
if(id==='forge')return['..oooo..................','..oCCo..................','..oCCoo.................','.ooCCcooo...............','.ocCCCcco.ooo...........','ocCCCCCcoocCCco.........','oGccCCCCCcCCCCwco.......','GGgocCCcCCWWWWWccco.....'];
if(id==='reaper')return['.....ooooo..............','...ooCCCCCo.............','..oCCCCCCCco............','.oCCCccccCCco...........','oCCCco..ocCCco..........','oCCco....ocCCco.........','oGcco..ooocCCCwco.......','GGgocccccCCWWWWWcco.....'];
if(id==='chronos')return['....oooooo..............','..ooCCCCCCoo............','.oCCoooooCCco...........','oCCoo...ooCCco..........','oCco.....ocCco..........','oGco..oo..oCCwco........','GGgocCooCoCWWWWccco.....'];
if(id==='legion')return['..ooo..ooo..............','..oCo..oCo..............','.ooCooooCoo.............','.oCCccccCCco............','ooCCCCCCCCCco...........','oGgcCooCooCCwco.........','GGgocCooCooCWWWWccco....'];
if(id==='groza')return['.........oo.............','........oCCo............','...oo...oCCo............','..oCCo..oCCo............','.ooCCooooCCco...........','oGcCCccccCCwco..........','GGgocCCCCCWWWWWccco.....'];
return['..oo............','..oao...........','.occo...........','.ocCco..oo......','ocCcco.ocCo.....','ocgCcCocCCwco...','GgocCcCwWWWWcCco']}
function shipSpriteFor(id,main,light){if(id==='monster')return monsterBody(main,light);var m=Object.assign({},PAL);m.c=main;m.C=light;return spr(mirror(shipHalf(id)),m)}
function monsterBody(main,light){
var w=46,h=34,c=mkC(w,h),g=c.getContext('2d');
for(var y=0;y<h;y++)for(var x=0;x<w;x++){
var dx=(x-21)/22,dy=(y-17)/16,m=dx*dx+dy*dy,tail=x<11?(11-x)/11:0,lim=1-tail*.6;
if(m>lim)continue;
g.fillStyle=m>lim*.8?PAL.o:(m>lim*.46?main:light);g.fillRect(x,y,1,1)}
g.fillStyle=light;for(var i=0;i<17;i++)g.fillRect(7+i,16+Math.round(Math.sin(i*.55)),2,2);
g.fillStyle=PAL.o;g.fillRect(29,9,8,7);g.fillRect(29,19,8,7);
g.fillStyle='#ff2fb0';g.fillRect(30,10,6,5);g.fillRect(30,20,6,5);
g.fillStyle='#fff';g.fillRect(33,11,2,2);g.fillRect(33,21,2,2);
g.fillStyle='#ffd76a';[[25,6],[25,25],[20,4],[20,27],[15,7],[15,24]].forEach(function(p){g.fillRect(p[0],p[1],3,3)});
g.fillStyle=PAL.o;g.fillRect(37,14,7,6);g.fillStyle='#ff4d4d';g.fillRect(38,15,5,4);
g.fillStyle='#fff';for(var t=0;t<4;t++)g.fillRect(38+t,15,1,1);
return{n:c,f:tint(c,'#fff'),w:w,h:h}}
function bossSpriteFor(kind){var s=31,c=mkC(s,s),g=c.getContext('2d');
var pal={guardian:['#ff4d4d','#8f2020','#ff2fb0'],hive:['#9dff3c','#4d8f1e','#ff2fb0'],prism:['#22e6ff','#1e4f8f','#a86bff'],hammer:['#ffb020','#8f5a10','#ff4d4d'],eye:['#a86bff','#4f2a94','#ffffff'],phantom:['#ff2fb0','#8f1a63','#22e6ff'],twins:['#a86bff','#4f2a94','#22e6ff']}[kind]||['#ff4d4d','#8f2020','#ff2fb0'];
for(var y=0;y<s;y++)for(var x=0;x<s;x++){var dx=x-15,dy=y-15,m;
if(kind==='prism'||kind==='twins')m=Math.abs(dx)+Math.abs(dy);else if(kind==='hammer')m=Math.max(Math.abs(dx),Math.abs(dy));else if(kind==='phantom')m=Math.abs(dx)*.8+Math.max(0,dy)*.9;else if(kind==='hive')m=Math.sqrt(dx*dx+dy*dy)+Math.sin(Math.atan2(dy,dx)*6)*1.5;else m=Math.max(Math.abs(dx)*.88+Math.abs(dy)*.5,Math.abs(dy));
var d=Math.sqrt(dx*dx+dy*dy),col=null;if(m<14.5)col=PAL.o;if(m<13.5)col=pal[0];if(m<11)col=pal[1];if(m<9)col=PAL.d;if(m<7.5)col=pal[2];if(d<4)col='#fff';if(d<2)col=PAL.o;
if(col){g.fillStyle=col;g.fillRect(x,y,1,1)}}
return{n:c,f:tint(c,'#fff'),w:s,h:s}}
function orb(col,lit){return spr(['.ooo.','oXXXo','oXWXo','oXXXo','.ooo.'],{o:PAL.o,X:col,W:lit||'#fff'})}
function iconCanvas(k,col,scale){var rows=ICON[k]||ICON.cal,c=mkC(9,9),g=c.getContext('2d');
for(var y=0;y<9;y++)for(var x=0;x<rows[y].length;x++){var ch=rows[y][x];if(ch==='.')continue;g.fillStyle=ch==='o'?PAL.o:ch==='w'?'#fff':col;g.fillRect(x,y,1,1)}
var out=mkC(9,9);out.getContext('2d').drawImage(c,0,0);out.style.width=(9*(scale||4))+'px';out.style.height=(9*(scale||4))+'px';return out}
var floorCanvas=null;
function makeFloor(w,h){var f=THEME.fl,c=mkC(w,h),g=c.getContext('2d');g.fillStyle=f.base;g.fillRect(0,0,w,h);
function neb(x,y,r,col,a){var gr=g.createRadialGradient(x,y,1,x,y,r);gr.addColorStop(0,'rgba('+col+','+a+')');gr.addColorStop(1,'rgba('+col+',0)');g.fillStyle=gr;g.fillRect(0,0,w,h)}
neb(w*.28,h*.42,w*.5,f.n1,.14);neb(w*.78,h*.2,w*.4,f.n2,.07);neb(w*.6,h*.85,w*.45,f.n1,.08);
for(var i=0;i<Math.round(w*h/1500);i++){g.fillStyle='rgba('+f.star+','+rand(.04,.2)+')';g.fillRect(randi(0,w-1),randi(0,h-1),1,1)}
for(i=0;i<26;i++){g.fillStyle='rgba('+f.grid+',.14)';g.fillRect(randi(0,w-2),randi(0,h-1),2,1)}return c}
var SPR={};
function buildSprites(){
SPR.ships={};SPR.darkShips={};
SHIPS.forEach(function(s){var id=s.id;
SPR.ships[id]=[shipSpriteFor(id,'#ffb020','#fff0cf'),shipSpriteFor(id,'#4d8cff','#b8d4ff')];
SPR.darkShips[id]=shipSpriteFor(id,'#1a0f30','#5a3a9a')});
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
SPR.bastard=spr(['.....ooooo.....','....orRRRro....','...orRwwwRro...','..orRwWWWwRro..','.orRwWoooWwRro.','orRwWo...oWwRro','orRwWo.a.oWwRro','orRwWooaooWwRro','orRwWo.a.oWwRro','orRwWo...oWwRro','.orRwWoooWwRro.','..orRwWWWwRro..','...orRwwwRro...','....orRRRro....','.....ooooo.....']);
SPR.aegis=spr(['....ooooooo....','..oobBBBBBoo...','.obBBBBBBBBBo..','obBBCCCCCBBBbo.','obBCCWWWCCBBbo.','obBCWWoWWCBBbo.','obBCWoWoWCBBbo.','obBCWWoWWCBBbo.','obBCCWWWCCBBbo.','obBBCCCCCBBBbo.','.obBBBBBBBBBo..','..oobBBBBBoo...','....ooooooo....']);
SPR.turret=spr(['...ooooo...','..oaaaaao..','.oaAAAAAao.','oaAAWWWAAao','oaAAWoWAAao','oaAAWWWAAao','.oaAAAAAao.','..oaaaaao..','...ooooo...','..oo...oo..','.oo.....oo.']);
SPR.shard=spr(['..ooooo..','.oMWWWmo.','oMWoooMmo','oWo...oMo','oWo...oMo','oMo...oMo','omMoooMmo','.omMMMmo.','..ooooo..']);
SPR.med=spr(['..ooooo..','..ogggo..','..ogGgo..','ooggGggoo','ogGGWGGgo','ooggGggoo','..ogGgo..','..ogggo..','..ooooo..']);
SPR.frag=spr(['..ooo..','.obBbo.','obWWbo.','obBbbo.','..ooo..']);
SPR.bp=spr(['.ooooo.','owwwwo.','owwwwo.','owwwwo.','owwwwo.','.ooooo.']);
SPR.mine=spr(['.ooo.','oaAao','oAWAo','oaAao','.ooo.']);
SPR.cargo=spr(['ooooooooooo','oaaaaaaaaao','oaAoooooAao','oaAoWWWoAao','oaAoWWWoAao','oaAoWWWoAao','oaAoooooAao','oaaaaaaaaao','ooooooooooo']);
SPR.drone=spr(['..oo...','.oggo..','ogGwgo.','ogwWGgo','ogGwgo.','.oggo..','..oo...']);
SPR.healdrone=spr(['..oo...','.oggo..','ogWwgo.','ogWWGgo','ogWwgo.','.oggo..','..oo...']);
SPR.rocket=spr(['..oo...','.oaao..','oaWWaoo','.oaao..','..oo...']);
SPR.miniRocket=spr(['.oo.','oaWo','.oo.']);
SPR.bosses={};ALLB.forEach(function(k){SPR.bosses[k]=bossSpriteFor(k)});
SPR.boss=SPR.bosses.guardian;
SPR.orbM=orb(PAL.m,'#ffd6f2');SPR.orbA=orb(PAL.a,'#fff0cf');SPR.orbR=orb(PAL.r,'#ffd9d9');SPR.orbV=orb(PAL.v,'#e8dcff');SPR.orbC=orb(PAL.c,'#b8fbff')}
buildSprites();floorCanvas=makeFloor(640,480);
function playerSpr(p){var s=SPR.ships[p.ship]||SPR.ships.std;return s[p.id?1:0]}
function catVol(c){return c==='ui'?VOL.ui:c==='music'?VOL.music:VOL.sfx}
var A={ctx:null,master:null,on:storeGet('sound',true),last:{},nb:null,tokens:36,fv:0,
init:function(){if(this.ctx)return;var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;try{this.ctx=new AC()}catch(e){return}
this.master=this.ctx.createGain();this.master.gain.value=this.on?.9*VOL.master:0;this.master.connect(this.ctx.destination);
var n=this.ctx.createBuffer(1,this.ctx.sampleRate*.5,this.ctx.sampleRate),d=n.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.nb=n},
resume:function(){if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume().catch(function(){})},
setOn:function(v){this.on=v;storeSet('sound',v);applyVolumes()},
gate:function(k,ms){var t=performance.now();if(this.last[k]&&t-this.last[k]<ms)return false;this.last[k]=t;return true},
allow:function(c){if(c==='music')return true;if(this.tokens<1||this.fv>=4)return false;this.tokens-=1;this.fv++;return true},
tone:function(f,dur,type,vol,slide,delay,cat){if(!this.ctx||!this.on)return;vol*=catVol(cat);if(vol<=0||!this.allow(cat))return;
var t=this.ctx.currentTime+(delay||0),o=this.ctx.createOscillator(),g=this.ctx.createGain();
o.type=type||'square';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+dur);
g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+.02);o.onended=function(){try{o.disconnect();g.disconnect()}catch(e){}}},
noise:function(dur,vol,freq,type,delay,cat){if(!this.ctx||!this.on||!this.nb)return null;vol*=catVol(cat);if(vol<=0||!this.allow(cat))return null;
var t=this.ctx.currentTime+(delay||0),s=this.ctx.createBufferSource();s.buffer=this.nb;s.loop=true;
var f=this.ctx.createBiquadFilter();f.type=type||'bandpass';f.frequency.setValueAtTime(freq,t);f.Q.value=1.2;
var g=this.ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+dur+.02);
s.onended=function(){try{s.disconnect();f.disconnect();g.disconnect()}catch(e){}};return f},
shoot:function(){if(this.gate('sh',70))this.tone(900,.05,'square',.06,.4)},
gun:function(){if(this.gate('gn',95)){this.tone(240+Math.random()*90,.035,'square',.05,.5);this.noise(.03,.05,2600)}},
overheat:function(){this.tone(300,.7,'sawtooth',.12,.25);this.noise(.8,.12,900,'lowpass')},
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
alarm:function(){if(this.gate('al',900)){this.tone(880,.16,'square',.1,.6);this.tone(660,.16,'square',.08,.6,.18)}},
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
var MUS={dirs:['music/','audio/',''],battleList:['Coin Beast.wav','Boss Raid Circuit.wav','Hex Crash Circuit.wav','Cartridge Rot (1).wav','Cartridge Rot.wav','Pixel Rush Circuit (1).wav','Pixel Rush Circuit.wav'],
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
var target=(k===want)?MUS.volume:0;c.vol+=(target-c.vol)*Math.min(1,dt*3.2);
if(target<=0){c.want=false;if(c.vol<.004){c.vol=0;c.el.volume=0;if(!c.el.paused)c.el.pause()}else c.el.volume=clamp(c.vol,0,1);return}
c.want=true;c.el.volume=clamp(c.vol,0,1);if(c.fail||!MUS.unlocked)return;
if(c.el.paused){if(now-c.lastPlay>420){c.lastPlay=now;var p=c.el.play();if(p&&p.catch)p.catch(function(){})}return}
if(c.el.currentTime!==c.lastTime){c.lastTime=c.el.currentTime;c.stall=0}
else{c.stall+=dt;if(c.stall>1.1){c.stall=0;c.lastPlay=0;try{var q=c.el.play();if(q&&q.catch)q.catch(function(){})}catch(e){}}}});
MUS.active=want!=='none'&&MUS[want].ok&&MUS[want].el&&!MUS[want].el.paused}
function musLabel(){if(!MUS.active)return '';var c=MUS[MUS.cur];if(!c||!c.name)return '';return c.name.replace(/\.wav$/i,'')}
function part(x,y,col,n,spd,life,size){for(var i=0;i<n;i++){if(G.parts.length>460)break;var a=rand(0,TAU),s=rand(spd*.3,spd);
G.parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:rand(life*.5,life),m:life,c:col,s:size||1,dr:rand(2,5)})}}
function ring(x,y,r0,r1,col,life){if(G.rings.length>16)return;G.rings.push({x:x,y:y,r:r0,r1:r1,l:life,m:life,c:col})}
function float(x,y,t,col,sc){if(G.floats.length>28)return;G.floats.push({x:x,y:y,t:String(t),c:col,s:sc||1,l:.8,m:.8})}
function shake(v){G.shake=Math.min(11,G.shake+v)}
function flash(v,c){G.flash=Math.max(G.flash,v);G.flashCol=c||'#fff'}
function updateEffects(dt){var i;
for(i=G.beats.length-1;i>=0;i--){var b=G.beats[i];b.r+=70*dt;b.a-=dt*.5;if(b.a<=0)G.beats.splice(i,1)}
for(i=G.rings.length-1;i>=0;i--){var r=G.rings[i];r.l-=dt;r.r+=(r.r1-r.r)*Math.min(1,9*dt);if(r.l<=0)G.rings.splice(i,1)}
for(i=G.parts.length-1;i>=0;i--){var p=G.parts[i];p.l-=dt;var k=Math.exp(-p.dr*dt);p.vx*=k;p.vy*=k;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.l<=0)G.parts.splice(i,1)}
for(i=G.floats.length-1;i>=0;i--){var f=G.floats[i];f.l-=dt;f.y-=16*dt;if(f.l<=0)G.floats.splice(i,1)}
for(i=G.ghost.length-1;i>=0;i--){G.ghost[i].l-=dt;if(G.ghost[i].l<=0)G.ghost.splice(i,1)}}
function drawSpr(ctx,s,x,y,ang,fl,alpha){if(!s)return;ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(ang);ctx.drawImage(fl?s.f:s.n,-Math.round(s.w/2),-Math.round(s.h/2));ctx.restore();ctx.globalAlpha=1}
function txt(ctx,s,x,y,col,px,align){ctx.save();ctx.fillStyle=col;ctx.font='700 '+(px||11)+'px Handjet, Tiny5, monospace';ctx.textAlign=align||'left';ctx.textBaseline='top';ctx.fillText(s,x,y);ctx.restore()}
function pxCircle(ctx,cx,cy,r,col,alpha){cx=Math.round(cx);cy=Math.round(cy);r=Math.round(r);if(r<1)return;ctx.globalAlpha=alpha==null?1:alpha;ctx.fillStyle=col;
var x=r,y=0,err=1-r;while(x>=y){ctx.fillRect(cx+x,cy+y,1,1);ctx.fillRect(cx+y,cy+x,1,1);ctx.fillRect(cx-y,cy+x,1,1);ctx.fillRect(cx-x,cy+y,1,1);ctx.fillRect(cx-x,cy-y,1,1);ctx.fillRect(cx-y,cy-x,1,1);ctx.fillRect(cx+y,cy-x,1,1);ctx.fillRect(cx+x,cy-y,1,1);y++;if(err<0)err+=2*y+1;else{x--;err+=2*(y-x)+1}}ctx.globalAlpha=1}
function pxDisc(ctx,cx,cy,r,col,alpha){cx=Math.round(cx);cy=Math.round(cy);r=Math.round(r);ctx.globalAlpha=alpha==null?1:alpha;ctx.fillStyle=col;
for(var y=-r;y<=r;y++){var w=Math.floor(Math.sqrt(Math.max(0,r*r-y*y)));ctx.fillRect(cx-w,cy+y,w*2+1,1)}ctx.globalAlpha=1}
function line(ctx,x1,y1,x2,y2,col,w,a){ctx.save();ctx.globalAlpha=a==null?1:a;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(Math.round(x1),Math.round(y1));ctx.lineTo(Math.round(x2),Math.round(y2));ctx.stroke();ctx.restore()}
function bolt(ctx,x1,y1,x2,y2,seed,amp){var dx=x2-x1,dy=y2-y1,len=hyp(dx,dy);if(len<2)return;
var n=Math.max(3,Math.min(12,Math.round(len/11))),nx=-dy/len,ny=dx/len;ctx.beginPath();ctx.moveTo(x1,y1);
for(var i=1;i<n;i++){var f=i/n,off=Math.sin(seed*3.1+i*2.7+visualT*26)*amp*(1-Math.abs(f-.5)*.9)+Math.sin(seed+i*5.3+visualT*17)*amp*.4;
ctx.lineTo(x1+dx*f+nx*off,y1+dy*f+ny*off)}ctx.lineTo(x2,y2);ctx.stroke()}
function lightning(ctx,x1,y1,x2,y2,seed,col,wid){var w=wid==null?1:wid;ctx.save();
ctx.strokeStyle=col||'#22e6ff';ctx.globalAlpha=.22;ctx.lineWidth=6*w;bolt(ctx,x1,y1,x2,y2,seed,7*w);
ctx.globalAlpha=.55;ctx.lineWidth=3*w;bolt(ctx,x1,y1,x2,y2,seed,7*w);
ctx.strokeStyle='#fff';ctx.globalAlpha=.95;ctx.lineWidth=Math.max(.6,1.2*w);bolt(ctx,x1,y1,x2,y2,seed,7*w);ctx.restore()}
function segHit(x1,y1,x2,y2,cx,cy,r){var dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;var t=l2?((cx-x1)*dx+(cy-y1)*dy)/l2:0;t=clamp(t,0,1);
var px=x1+dx*t,py=y1+dy*t;return(px-cx)*(px-cx)+(py-cy)*(py-cy)<r*r}
function nearestPlayer(x,y){var b=null,bd=1e9;for(var i=0;i<PL.length;i++){var p=PL[i];if(p.hp<=0)continue;var d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);if(d<bd){bd=d;b=p}}return b||P}
function capAlive(){return !!(G.cap&&G.cap.kind==='rescue'&&!G.cap.dead)}
function capTarget(){var c=G.cap;return{x:c.x,y:c.y,hp:c.hp,cap:true,inv:0,shield:0,invis:0,stun:0,trapped:0,vx:0,vy:0,r:44}}
function aiTarget(x,y){
if(capAlive()&&G.cap.hunters>0){var dc=hyp(G.cap.x-x,G.cap.y-y),dp=1e9,b=null;
for(var i=0;i<PL.length;i++){var p=PL[i];if(p.hp<=0||p.invis>0)continue;var d=hyp(p.x-x,p.y-y);if(d<dp){dp=d;b=p}}
if(b&&dc<dp*.9)return capTarget()}
var bb=null,bd=1e9;
for(i=0;i<PL.length;i++){p=PL[i];if(p.hp<=0||p.invis>0)continue;var dd=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);if(dd<bd){bd=dd;bb=p}}
if(bb)return bb;var n=nearestPlayer(x,y);
return{x:n.lastSeen.x,y:n.lastSeen.y,hp:1,inv:0,shield:0,invis:1,stun:0,trapped:0,vx:0,vy:0,ghostTarget:true}}
function slowAt(x,y){for(var i=0;i<G.chronoFields.length;i++){var f=G.chronoFields[i];if(f.g)return .4;if(hyp(x-f.x,y-f.y)<f.r)return .4}return 1}
function chronoAnyGlobal(){for(var i=0;i<G.chronoFields.length;i++)if(G.chronoFields[i].g)return true;return false}
function healPlayer(p,v){if(!p||p.hp<=0||p.ghostTarget||p.cap)return;var b=p.hp;p.hp=Math.min(p.max,p.hp+v);if(p.hp-b>2)float(p.x,p.y-10,'+'+Math.round(p.hp-b),'#35f0a0',1)}
function playerDown(p){p.hp=0;p.trapped=0;p.invis=0;p.invisShot=false;part(p.x,p.y,p.col,30,120,.7,2);ring(p.x,p.y,4,40,p.col,.6);HAP.death();
if(PL.every(function(q){return q.hp<=0})){gameOver();return}
banner('ИГРОК '+(p.id+1)+' ПАЛ','НАПАРНИК МОЖЕТ ВОСКРЕСИТЬ В МЕНЮ МОДУЛЕЙ');A.over();shake(6)}
function hurtPlayer(p,d){if(!p||p.ghostTarget||G.state!=='play')return;
if(p.cap){damageCap(d);return}
if(p.inv>0||CHEAT.god)return;
if(p.shield>0){var ab=Math.min(p.shield,d);p.shield-=ab;d-=ab;p.shieldT=2.5;A.shieldHit();part(p.x,p.y,'#a86bff',8,80,.3,1);if(d<=0){p.inv=.35;return}}
p.hp-=d;p.inv=.7;p.hurtT=.35;p.noHit=0;p.shieldT=2.5;G.combo=0;G.mult=1;shake(5);flash(.3,'#ff4d4d');A.hurt();HAP.hurt();
part(p.x,p.y,'#ff4d4d',12,90,.4,1);float(p.x,p.y-11,'-'+Math.round(d),'#ff4d4d',1);
if(p.hp<=0)playerDown(p)}
function damageCap(d){var c=G.cap;if(!c||c.kind!=='rescue'||c.dead)return;
c.hp-=d;c.fl=.14;if(c.hp<=0){c.hp=0;c.dead=true;capExplode(false);}}
function capExplode(force){var c=G.cap;if(!c||c.boomed)return;c.boomed=true;c.dead=true;
ring(c.x,c.y,10,180,'#ffb020',.9);ring(c.x,c.y,10,120,'#ff4d4d',.7);
part(c.x,c.y,'#ffb020',70,220,1,2);part(c.x,c.y,'#ff4d4d',50,180,.9,2);
flash(.6,'#ffb020');shake(11);A.boom();A.explode();HAP.big();
for(var i=0;i<PL.length;i++){var p=PL[i];if(p.hp<=0)continue;
var d=hyp(p.x-c.x,p.y-c.y);if(d<230||force){p.inv=0;p.shield=0;hurtPlayer(p,1000)}}
banner('КОРАБЛЬ УНИЧТОЖЕН','ВЗРЫВНАЯ ВОЛНА 1000 УРОНА')}
function stunPlayer(p,t){if(!p||p.ghostTarget||p.cap||CHEAT.god)return;p.stun=Math.max(p.stun,t);A.stun();HAP.hurt();flash(.22,'#ffb020');shake(4);
float(p.x,p.y-16,'ОГЛУШЕН','#ffb020',1);part(p.x,p.y,'#ffb020',16,90,.5,1)}
function twinsShielded(e){return e.bossKind==='twins'&&G.twinsLink}
function damageEnemy(e,dmg,crit,hx,hy,dir,ignoreShield,owner){if(e.dead)return;
if(e.invuln){var kb=e.type==='bastard'?26:100;
if(dir!==undefined){e.vx+=Math.cos(dir)*kb;e.vy+=Math.sin(dir)*kb}
else if(hx!==undefined){var ka=Math.atan2(e.y-hy,e.x-hx);e.vx+=Math.cos(ka)*kb*.8;e.vy+=Math.sin(ka)*kb*.8}
e.shieldFl=.15;A.shieldHit();if(hx!==undefined)part(hx,hy,'#b8fbff',4,60,.2,1);
float(e.x,e.y-e.r-5,e.type==='bastard'?'ПЕРЕГРЕВ':'ЩИТ','#b8fbff',1);return}
if(twinsShielded(e)){e.shieldFl=.15;A.shieldHit();float(e.x,e.y-e.r-5,'КУПОЛ','#b8fbff',1);if(hx!==undefined)part(hx,hy,'#b8fbff',4,60,.2,1);return}
if(e.type==='mirror'&&e.open<=0&&dir!==undefined&&!ignoreShield){var inc=dir+Math.PI;
if(Math.abs(angDiff(e.face,inc))>Math.PI-1){e.open=.8;e.shieldFl=.15;A.reflect();var ra=inc+rand(-.12,.12);
G.ebul.push({id:nextBid(),x:e.x+Math.cos(ra)*(e.r+3),y:e.y+Math.sin(ra)*(e.r+3),vx:Math.cos(ra)*95,vy:Math.sin(ra)*95,r:2.5,dmg:7*escale(e),l:3,spr:'orbC'});
float(e.x,e.y-e.r-5,'ОТБИТО','#b8fbff',1);part(hx||e.x,hy||e.y,'#b8fbff',5,70,.22,1);return}}
if(e.type==='shielder'&&!ignoreShield&&dir!==undefined&&Math.abs(angDiff(e.face,dir+Math.PI))<1.15){e.shieldFl=.15;part(hx,hy,'#22e6ff',4,60,.2,1);float(e.x,e.y-e.r-4,'БЛОК','#22e6ff',1);A.shieldHit();return}
if(e.bossKind==='prism'&&!ignoreShield&&dir!==undefined){var ic=dir+Math.PI,bl=false;
for(var k=0;k<3;k++)if(Math.abs(angDiff(e.shieldAng+k*TAU/3,ic))<.5){bl=true;break}
if(bl){e.shieldFl=.15;part(hx,hy,'#22e6ff',5,70,.2,1);A.shieldHit();
G.ebul.push({id:nextBid(),x:e.x+Math.cos(ic)*18,y:e.y+Math.sin(ic)*18,vx:Math.cos(ic)*170,vy:Math.sin(ic)*170,r:2.5,dmg:9*escale(e),l:3,spr:'orbC'});return}}
if(e.shield>0){var ab=Math.min(e.shield,dmg);e.shield-=ab;dmg-=ab;if(e.type==='dark')e.shieldT=2.5;
A.shieldHit();if(hx!==undefined)part(hx,hy,'#b8fbff',4,55,.2,1);if(dmg<=0)return}
e.hp-=dmg;e.fr=.1;e.fl=.1;G.st.hits++;if(hx!==undefined)part(hx,hy,crit?'#ffb020':'#fff',crit?6:3,crit?80:55,.25,1);
float(e.x+rand(-3,3),e.y-e.r-4,Math.round(dmg),crit?'#ffb020':'#f4ecff',crit?2:1);
var ow=owner||P;if(ow.stats&&ow.stats.vamp)healPlayer(ow,ow.stats.vamp*dmg);A.hit();HAP.hit();if(e.hp<=0)killEnemy(e)}
function luckMult(p){return 1+.1*((p?metaOf(p):META).perm.luck||0)}
function lootX(){return isCoop()?2:1}
function dropFrag(x,y,n){n*=lootX();for(var i=0;i<n;i++)G.drops.push({id:nextBid(),x:x+rand(-8,8),y:y+rand(-8,8),vx:rand(-30,30),vy:rand(-30,30),type:'frag',l:25,sp:rand(0,TAU)})}
function dropShards(x,y,n){for(var i=0;i<n;i++){var a=rand(0,TAU),s=rand(30,90);
G.drops.push({id:nextBid(),x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,type:'shard',l:22,sp:rand(0,TAU)})}}
function bpDrop(x,y,key){G.drops.push({id:nextBid(),x:x,y:y,vx:rand(-20,20),vy:rand(-20,20),type:'bp',bp:key,l:28,sp:rand(0,TAU)})}
function dropBlueprint(x,y){var mm=META,pool=[];
LOCKED.forEach(function(k){if(mm.unlocked.indexOf(k)<0&&mm.bp.indexOf(k)<0)pool.push(k)});
SHIP_LOCKED.forEach(function(id){if(mm.ships.indexOf(id)<0&&mm.bp.indexOf('ship:'+id)<0)pool.push('ship:'+id)});
if(!pool.length)return;bpDrop(x,y,pick(pool))}
function spawnWell(x,y){G.wells.push({id:nextBid(),x:x,y:y,r:48,core:12,life:rand(3,6),max:6,spin:rand(0,TAU)});A.well();ring(x,y,4,48,'#a86bff',.6)}
function killEnemy(e){if(e.dead||e.invuln)return;e.dead=true;G.kills++;G.lastKill={x:e.x,y:e.y};
G.combo=Math.min(20,G.combo+1);G.comboT=2.4;G.mult=1+Math.min(G.combo,15)*.1;addScore(e.pts*G.mult);
part(e.x,e.y,e.col,e.boss?60:14,e.boss?150:95,e.boss?.9:.45,e.boss?2:1);part(e.x,e.y,'#fff',e.boss?24:5,e.boss?120:70,.3,1);
ring(e.x,e.y,e.r*.5,e.boss?70:e.r*3,e.col,e.boss?.8:.35);A.kill();shake(e.boss?8:2);
if(e.boss||e.type==='bastard'||e.type==='tank'||e.type==='lgun')HAP.boom();
if(e.type==='ram'&&Math.random()<.25)spawnWell(e.x,e.y);
if(e.type==='lgun'||e.type==='bastard'){ring(e.x,e.y,4,32,'#ffb020',.45);part(e.x,e.y,'#ffb020',20,120,.5,2);A.explode();shake(4);
for(var q=0;q<PL.length;q++){var pq=PL[q];if(pq.hp>0&&hyp(pq.x-e.x,pq.y-e.y)<32)hurtPlayer(pq,15*D.dmg*dmgScale())}}
if(e.type==='brood'){for(var bi=0;bi<6&&G.enemies.length<50;bi++){var ba=bi*TAU/6,mn=makeEnemy('mini',e.x+Math.cos(ba)*12,e.y+Math.sin(ba)*12);
mn.vx=Math.cos(ba)*72;mn.vy=Math.sin(ba)*72;G.enemies.push(mn)}ring(e.x,e.y,4,34,PAL.g,.5);float(e.x,e.y-e.r-8,'РОЙ!','#9dff3c',1)}
if(e.elite===3){ring(e.x,e.y,4,32,'#ffb020',.45);part(e.x,e.y,'#ffb020',20,120,.5,2);A.explode();HAP.boom();
for(var eq=0;eq<PL.length;eq++){var ep=PL[eq];if(ep.hp>0&&hyp(ep.x-e.x,ep.y-e.y)<32)hurtPlayer(ep,14*D.dmg*dmgScale())}}
if(e.type==='dark'){G.darkUsed=true;G.boss=null;$('#bossbar').classList.remove('on');dropFrag(e.x,e.y,50);dropBlueprint(e.x,e.y);
if(META.ships.indexOf('monster')<0&&META.bp.indexOf('ship:monster')<0&&Math.random()<.25){bpDrop(e.x+14,e.y,'ship:monster');float(e.x,e.y-24,'ЧЕРТЁЖ МОНСТРА','#ffd76a',2)}
flash(.4,'#a86bff');A.boom();HAP.big()}
if(e.boss){G.slow=1.1;flash(.45,e.col);A.boom();HAP.big();
if(e.bossKind==='twins'){for(var ti=0;ti<G.enemies.length;ti++){var ag=G.enemies[ti];
if(ag.type==='aegis'){ag.dead=true;part(ag.x,ag.y,'#b8fbff',30,130,.7,2);ring(ag.x,ag.y,4,40,'#b8fbff',.6)}}G.twinsLink=false}
G.drops.push({id:nextBid(),x:e.x,y:e.y,vx:0,vy:0,type:'hp',l:20,sp:0});
dropFrag(e.x,e.y,Math.round(rand(8,14)*G.lootMult));dropBlueprint(e.x,e.y);
if(!e.ghost&&e.bossKind!=='hive')G.lastBossKind=e.bossKind;
var anyBoss=false;for(var bq=0;bq<G.enemies.length;bq++)if(G.enemies[bq].boss&&!G.enemies[bq].dead&&G.enemies[bq]!==e)anyBoss=true;
if(!anyBoss){G.boss=null;$('#bossbar').classList.remove('on')}else{for(bq=0;bq<G.enemies.length;bq++)if(G.enemies[bq].boss&&!G.enemies[bq].dead){G.boss=G.enemies[bq];break}}}
else if(e.type!=='dark'){if(Math.random()<.1*luckMult()*G.lootMult*lootX())dropFrag(e.x,e.y,1);
if(Math.random()<(.02+(e.elite!=null?.08:0))*luckMult())dropBlueprint(e.x,e.y)}
if(e.type==='splitter')for(var i=0;i<2;i++){var a=rand(0,TAU),m=makeEnemy('mini',e.x+Math.cos(a)*7,e.y+Math.sin(a)*7);m.vx=Math.cos(a)*70;m.vy=Math.sin(a)*70;G.enemies.push(m)}
if(e.type==='tank'){ring(e.x,e.y,4,34,'#ff4d4d',.45);part(e.x,e.y,'#ffb020',18,120,.5,1);A.boom();shake(4);
for(var j=0;j<G.enemies.length;j++){var o=G.enemies[j];if(!o.dead&&o!==e&&hyp(o.x-e.x,o.y-e.y)<32)damageEnemy(o,26,false)}
var np=nearestPlayer(e.x,e.y);if(hyp(np.x-e.x,np.y-e.y)<26)hurtPlayer(np,12*D.dmg*dmgScale())}
var shn=(e.sh||0)*lootX()*(e.elite!=null?2:1);for(var k=0;k<shn&&G.drops.length<280;k++)spawnShard(e.x,e.y);
if(!e.boss&&e.type!=='mini'&&e.type!=='dark'&&e.type!=='ram'&&e.type!=='lgun'&&e.type!=='brood'&&e.type!=='bastard'&&Math.random()<(e.type==='tank'?.45:.05))spawnMedkit(e.x,e.y)}
function addScore(v){G.score+=Math.round(v*D.mult*(G.endless?1+G.wave*.04:1))}
function popChip(sel){var el=$(sel);if(!el)return;el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit')}
function edge(){var m=18,s=randi(0,3),x,y;
if(s===0){x=rand(CAM.x,CAM.x+W);y=CAM.y-m}else if(s===1){x=CAM.x+W+m;y=rand(CAM.y,CAM.y+H)}else if(s===2){x=rand(CAM.x,CAM.x+W);y=CAM.y+H+m}else{x=CAM.x-m;y=rand(CAM.y,CAM.y+H)}
return{x:clamp(x,AR.x+EDGE,AR.x+AR.w-EDGE),y:clamp(y,AR.y+EDGE,AR.y+AR.h-EDGE)}}
var ELITE_OK={grunt:1,shooter:1,splitter:1,tank:1,shielder:1,sniper:1,medic:1,emitter:1,ram:1,lgun:1,mirror:1,brood:1,jammer:1};
var GLOSS_E=['grunt','mini','shooter','splitter','tank','shielder','sniper','medic','emitter','clone','ram','lgun','mirror','brood','jammer','bastard','dark'];
function makeEnemy(type,x,y){var sc=1+.09*(G.wave-1),ds=dmgScale();
var e={id:nextEid(),type:type,x:x,y:y,vx:0,vy:0,fl:0,fr:0,dead:false,t:rand(0,9),hitT:0,tel:0,ang:rand(0,TAU),st:'walk',cd:rand(1,3),lock:0,face:rand(0,TAU),shieldFl:0,beam:null,mode:'normal',group:null,slot:0,guardId:null,tx:x,ty:y,tface:0,ax:x,ay:y,ar:0,dodgeCd:dodgeCd(G.wave),dodgeT:0,dvx:0,dvy:0,open:0,shield:0,slowT:0,slowMul:1,elite:null,sc:1,heat:0,fireT:0,swingT:0,swingDir:1,aegisA:0,aegisR:24,
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
else if(type==='lgun'){e.r=6;e.hp=30*D.hp;e.sp=44*D.sp;e.dmg=0;e.pts=32;e.sh=2;e.col='#a86bff';e.st='approach';e.cd=0}
else if(type==='mirror'){e.r=6;e.hp=42*sc*D.hp;e.sp=22*D.sp;e.dmg=9*D.dmg*ds;e.pts=32;e.sh=2;e.col=PAL.b}
else if(type==='brood'){e.r=7;e.hp=58*sc*D.hp;e.sp=0;e.dmg=0;e.pts=36;e.sh=4;e.col=PAL.g;e.cd=rand(1.4,3)}
else if(type==='jammer'){e.r=6;e.hp=26*D.hp;e.sp=30*D.sp;e.dmg=0;e.pts=34;e.sh=4;e.col=PAL.c}
else if(type==='bastard'){e.r=8;e.hp=30*sc*D.hp;e.sp=34*D.sp;e.dmg=10*D.dmg*ds;e.pts=48;e.sh=4;e.col='#ff4d4d';e.st='approach'}
else if(type==='aegis'){e.r=8;e.hp=1;e.sp=26*D.sp;e.dmg=0;e.pts=0;e.sh=0;e.col='#b8fbff';e.invuln=true}
else if(type==='dark'){var lp=localPlayer();e.r=lp.ship==='monster'?14:6;e.ship=lp.ship;e.lvl=Object.assign({},lp.lvl);
e.stats=computeStats(e.lvl,e.ship,metaOf(lp));e.hp=900*(1+(G.wave-5)*.045)*D.hp;e.shield=e.stats.shieldMax;e.shieldT=0;e.sp=e.stats.speed;e.pts=900;e.sh=0;e.col='#a86bff';
e.fireT=0;e.weaponCd=1.5;e.dT=[];for(var d=0;d<e.stats.drones;d++)e.dT.push(rand(0,.6));
e.socioSpin=0;e.dashT=0;e.dashCd=1.2;e.ramCd=2.4;e.hyperCd=3;e.bossName='ТЁМНЫЙ ДВОЙНИК';e.phase=1;e.aim=0;e.aegisR=e.stats.aegisR||24}
else if(type==='boss'){var kind=e.bossKind||'guardian',base={guardian:380,prism:620,hammer:760,eye:860,phantom:980,twins:620,hive:1250}[kind]||500;
e.r=kind==='twins'?12:15;e.hp=base*(1+(G.wave-5)*.045)*D.hp*(G.endless?1+Math.max(0,G.wave-30)*.05:1);
e.sp=(kind==='hive'?40:kind==='twins'?30:24)*D.sp;e.dmg=20*D.dmg*ds*1.7;e.pts=600+G.wave*20;e.sh=20;
e.col={guardian:'#ff4d4d',hive:'#9dff3c',prism:'#22e6ff',hammer:'#ffb020',eye:'#a86bff',phantom:'#ff2fb0',twins:'#a86bff'}[kind]||'#ff4d4d';
e.boss=true;e.bossName=BOSS_NAMES[kind]||'БОСС';e.atk='idle';e.atkT=1.4;e.phase=1;e.pending=null;e.shieldAng=0;e.chargeT=0;e.crisis=false;e.fleeT=0}
e.max=e.hp;e.spr=resolveSpr(e);
if(GLOSS_E.indexOf(type)>=0)markSeenE(type);
return e}
function rollElite(e){if(!ELITE_OK[e.type]||Math.random()>=.1)return;
e.elite=randi(0,3);e.hp*=1.4;e.max=e.hp;e.r+=1;if(e.elite===0)e.shield=30;if(e.elite===1)e.sp*=1.5;e.pts=Math.round(e.pts*1.6)}
function makeBoss(kind,x,y,ghost){var e=makeEnemy('boss',x,y);e.bossKind=kind;e.spr=resolveSpr(e);
e.bossName=(ghost?'ПРИЗРАК ':'')+(BOSS_NAMES[kind]||'БОСС');
if(ghost){e.ghost=true;e.hp*=.75;e.max=e.hp;e.dmg*=.75}markSeenB(kind);return e}
function spawnAt(type,x,y,extra){var e=makeEnemy(type,x,y);if(extra)for(var k in extra)e[k]=extra[k];rollElite(e);G.enemies.push(e);ring(x,y,2,12,e.col,.35);return e}
function spawn(type){var p=edge();return spawnAt(type,p.x,p.y)}
function fireBullet(x,y,a,sp,dmg,pierce,isDrone,owner,life){G.bul.push({id:nextBid(),x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:2,dmg:dmg,p:pierce||0,l:life||(isDrone?1.1:1.2),hit:[],a:a,dr:isDrone||false,owner:owner||0,col:owner?'#4d8cff':'#ffb020'})}
function fireRocketEntity(x,y,a,dmg,owner,mini,hydra){G.rockets.push({id:nextBid(),x:x,y:y,a:a,vx:Math.cos(a)*(mini?200:160),vy:Math.sin(a)*(mini?200:160),r:mini?2:3,dmg:dmg,l:mini?1.6:2.4,owner:owner||0,mini:!!mini,hydra:!!hydra})}
function eRocket(x,y,a,dmg){G.erock.push({id:nextBid(),x:x,y:y,a:a,vx:Math.cos(a)*170,vy:Math.sin(a)*170,r:3,dmg:dmg,l:2.6})}
function eShoot(e,a,sp,dmg,key){if(G.ebul.length>320)return;G.ebul.push({id:nextBid(),x:e.x+Math.cos(a)*(e.r+2),y:e.y+Math.sin(a)*(e.r+2),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:2.5,dmg:dmg*escale(e),l:4,spr:key||'orbM'})}
function eBulletRaw(x,y,a,sp,dmg,life){if(G.ebul.length>320)return;G.ebul.push({id:nextBid(),x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:2.5,dmg:dmg,l:life||2.2,spr:'orbV'})}
function spawnBeam(x,y,a,rot,life,dmg,len,width,col,src){if(G.beams.length>44)return;G.beams.push({x:x,y:y,ang:a,rot:rot,life:life,max:life,dmg:dmg,len:len,width:width,col:col||'#ff4d4d',tick:0,src:src||null})}
function spawnZone(x,y,r,tel,life,dmg,col){if(G.zones.length>34)return;G.zones.push({x:x,y:y,r:r,tel:tel,life:life,max:life,dmg:dmg,col:col||'#ff4d4d',done:false})}
function spawnShock(x,y,maxR,speed,dmg,col){if(G.shocks.length>14)return;G.shocks.push({x:x,y:y,r:4,maxR:maxR,speed:speed,dmg:dmg,col:col||'#ffb020',hit:false})}
function spawnMine(x,y,owner,dmg,rad){if(G.mines.length>=MAX_MINES)G.mines.shift();
G.mines.push({id:nextBid(),x:x,y:y,arm:.4,r:5,dmg:dmg||60,rad:rad||34,owner:owner||0,l:12})}
function spawnTurret(p){var cap=p.stats.maxTurrets||3,mine=G.turrets.filter(function(t){return t.owner===p.id});
while(mine.length>=cap){var old=mine.shift(),ix=G.turrets.indexOf(old);if(ix>=0)G.turrets.splice(ix,1);part(old.x,old.y,'#8f5a10',8,60,.3,1)}
var life=p.stats.turretLife||14;G.turrets.push({id:nextBid(),x:p.x,y:p.y,l:life,max:life,ft:.25,owner:p.id,ang:p.aim});A.turret();ring(p.x,p.y,3,20,'#ffb020',.4)}
function spawnPhantom(p){var st=p.stats;
G.phantoms.push({id:nextBid(),x:p.x,y:p.y,a:p.aim,l:st.phLife,max:st.phLife,ft:0,owner:p.id,mul:st.phMul,ship:p.ship,st:st,swingT:0,swingDir:1})}
function updateTurrets(dt){for(var i=G.turrets.length-1;i>=0;i--){var t=G.turrets[i];t.l-=dt;t.ft-=dt;
if(t.ft<=0){t.ft=.6;var e=nearestEnemy(t.x,t.y);if(e){var a=Math.atan2(e.y-t.y,e.x-t.x);t.ang=a;
fireBullet(t.x+Math.cos(a)*6,t.y+Math.sin(a)*6,a,180,7,0,false,t.owner,1.3);A.turretShot()}}
if(t.l<=0){part(t.x,t.y,'#8f5a10',10,70,.35,1);G.turrets.splice(i,1)}}}
function updatePhantoms(dt){for(var i=G.phantoms.length-1;i>=0;i--){var f=G.phantoms[i];f.l-=dt;f.ft-=dt;
if(f.swingT>0)f.swingT-=dt;
var st=f.st,tg=nearestEnemy(f.x,f.y);
if(tg)f.a=Math.atan2(tg.y-f.y,tg.x-f.x);
if(st.fireMode==='scythe'){if(f.ft<=0){f.ft=.55;f.swingT=.3;f.swingDir=-f.swingDir;A.scythe();
for(var s=0;s<G.enemies.length;s++){var se=G.enemies[s];if(se.dead)continue;
if(hyp(se.x-f.x,se.y-f.y)>st.scytheR+se.r)continue;
if(Math.abs(angDiff(f.a,Math.atan2(se.y-f.y,se.x-f.x)))>st.scytheHalf)continue;
damageEnemy(se,st.scytheDmg*f.mul,true,se.x,se.y,undefined,true,PL[f.owner]||P)}}}
else if(st.fireMode==='cone'){for(var c=0;c<G.enemies.length;c++){var ce=G.enemies[c];if(ce.dead||ce.invuln)continue;
if(hyp(ce.x-f.x,ce.y-f.y)>st.coneR)continue;
if(Math.abs(angDiff(f.a,Math.atan2(ce.y-f.y,ce.x-f.x)))>st.coneHalf)continue;
ce.hp-=st.coneDps*f.mul*dt;ce.fr=.05;if(ce.hp<=0)killEnemy(ce)}}
else if(f.ft<=0){f.ft=.3;
if(tg){var ow=PL[f.owner]||P,dmg=(st.dmg)*f.mul;
if(st.fireMode==='rocket')fireRocketEntity(f.x,f.y,f.a,dmg,f.owner,true,false);
else if(st.fireMode==='shotgun'){for(var q=0;q<Math.min(6,st.count);q++)fireBullet(f.x,f.y,f.a+(q-2.5)*st.spread,st.bs*.8,dmg,0,false,f.owner,.4)}
else fireBullet(f.x,f.y,f.a,st.fireMode==='sniper'?st.bs:190,dmg,st.fireMode==='sniper'?st.pierce:0,false,f.owner,1.2)}}
if(f.l<=0){part(f.x,f.y,'#a86bff',8,60,.3,1);G.phantoms.splice(i,1)}}}
function updateChrono(dt){for(var i=G.chronoFields.length-1;i>=0;i--){var f=G.chronoFields[i];f.t-=dt;
var ow=PL[f.owner];if(ow&&ow.hp>0&&!f.g){f.x=ow.x;f.y=ow.y}
if(f.t<=0){ring(f.x,f.y,f.g?60:f.r,6,'#4d8cff',.4);G.chronoFields.splice(i,1)}}}
function updateMines(dt){for(var i=G.mines.length-1;i>=0;i--){var m=G.mines[i];m.l-=dt;m.arm-=dt;var hit=false;
if(m.arm<=0)for(var j=0;j<G.enemies.length;j++){var e=G.enemies[j];if(e.dead||e.invuln)continue;if(hyp(e.x-m.x,e.y-m.y)<e.r*(e.sc||1)+11){hit=true;break}}
if(hit||m.l<=0){if(hit){var rad=m.rad||34;ring(m.x,m.y,4,rad,'#ffb020',.45);part(m.x,m.y,'#ffb020',20,120,.5,2);A.explode();HAP.boom();shake(4);
for(var j2=0;j2<G.enemies.length;j2++){var e2=G.enemies[j2];if(e2.dead)continue;var d=hyp(e2.x-m.x,e2.y-m.y);
if(d<rad)damageEnemy(e2,m.dmg*(1-d/rad*.5),true,e2.x,e2.y,undefined,true,PL[m.owner]||P)}}
G.mines.splice(i,1)}}}
function updateWells(dt){for(var i=G.wells.length-1;i>=0;i--){var w=G.wells[i];w.life-=dt;w.spin+=dt*3.4;
for(var j=0;j<PL.length;j++){var p=PL[j];if(p.hp<=0)continue;var dx=w.x-p.x,dy=w.y-p.y,d=hyp(dx,dy)||1;
if(d<w.r){var pull=(1-d/w.r)*900;p.vx+=dx/d*pull*dt;p.vy+=dy/d*pull*dt;
if(d<w.core){p.trapped=w.id;p.x+=(w.x-p.x)*Math.min(1,10*dt);p.y+=(w.y-p.y)*Math.min(1,10*dt);p.vx*=.2;p.vy*=.2;
if(Math.random()<.3)part(p.x,p.y,'#a86bff',1,40,.3,1)}}}
if(w.life<=0){for(j=0;j<PL.length;j++)if(PL[j].trapped===w.id)PL[j].trapped=0;ring(w.x,w.y,w.r,4,'#a86bff',.4);G.wells.splice(i,1)}}}
function updateCap(dt){var c=G.cap;if(!c)return;
if(c.fl>0)c.fl-=dt;
if(c.kind==='doom'&&!c.boomed){c.t-=dt;
if(c.t<10&&Math.floor(c.t*2)!==c.lastBeep){c.lastBeep=Math.floor(c.t*2);A.alarm()}
if(c.t<=0){capExplode(true);return}}
if(c.kind==='rescue'&&!c.dead){c.msgT-=dt;
if(c.msgT<=0){c.msgT=rand(4,7);float(c.x+rand(-30,30),c.y-40,pick(CAPMSG),'#9dff3c',1)}
if(c.hp<c.max*.35&&Math.random()<dt*10)part(c.x+rand(-50,50),c.y+rand(-22,22),'#ff4d4d',1,40,.5,1)}
if(c.dead&&Math.random()<dt*6)part(c.x+rand(-50,50),c.y+rand(-20,20),'#6b6a8a',1,30,.7,2);
if(c.cargo&&!c.cargo.dead){c.cargo.t+=dt}}
function cargoHit(dmg,owner){var c=G.cap;if(!c||!c.cargo||c.cargo.dead)return;
var g=c.cargo;g.hp-=dmg;g.fl=.12;A.hit();part(g.x,g.y,'#ffb020',4,60,.25,1);
if(g.hp<=0){g.dead=true;dropShards(g.x,g.y,30);ring(g.x,g.y,4,30,'#ffd76a',.5);part(g.x,g.y,'#ffd76a',26,130,.6,2);
A.explode();HAP.boom();shake(4);float(g.x,g.y-16,'+30 ◆','#ff2fb0',2)}}
function updateBullets(dt){for(var i=G.bul.length-1;i>=0;i--){var bl=G.bul[i];bl.l-=dt;
var ox=bl.x,oy=bl.y;bl.x+=bl.vx*dt;bl.y+=bl.vy*dt;
var dead=bl.l<=0||bl.x<AR.x||bl.x>AR.x+AR.w||bl.y<AR.y||bl.y>AR.y+AR.h;
if(!dead&&G.cap&&G.cap.cargo&&!G.cap.cargo.dead){var cg=G.cap.cargo;
if(segHit(ox,oy,bl.x,bl.y,cg.x,cg.y,11)){cargoHit(bl.dmg,bl.owner);dead=true}}
if(!dead)for(var j=0;j<G.enemies.length;j++){var e=G.enemies[j];if(e.dead||bl.hit.indexOf(e.id)>=0)continue;
if(segHit(ox,oy,bl.x,bl.y,e.x,e.y,e.r*(e.sc||1)+bl.r)){bl.hit.push(e.id);
damageEnemy(e,bl.dmg,false,bl.x,bl.y,bl.a,false,PL[bl.owner]||P);
if(bl.p>0)bl.p--;else{dead=true;break}}}
if(dead){if(bl.l>0)part(bl.x,bl.y,bl.dr?'#9dff3c':bl.col,3,45,.18,1);G.bul.splice(i,1)}}}
function updateRockets(dt){for(var i=G.rockets.length-1;i>=0;i--){var r=G.rockets[i];r.l-=dt;var tgt=null,bd=300*300;
for(var q=0;q<G.enemies.length;q++){var e=G.enemies[q];if(e.dead)continue;var d2=(e.x-r.x)*(e.x-r.x)+(e.y-r.y)*(e.y-r.y);if(d2<bd){bd=d2;tgt=e}}
if(tgt){var want=Math.atan2(tgt.y-r.y,tgt.x-r.x);r.a+=clamp(angDiff(r.a,want),-3.4*dt,3.4*dt)}
r.vx=Math.cos(r.a)*(r.mini?200:160);r.vy=Math.sin(r.a)*(r.mini?200:160);r.x+=r.vx*dt;r.y+=r.vy*dt;part(r.x,r.y,r.mini?'#ffd76a':'#ffb020',1,30,.2,1);
var hitE=null;for(q=0;q<G.enemies.length;q++){e=G.enemies[q];if(e.dead)continue;if(hyp(e.x-r.x,e.y-r.y)<e.r*(e.sc||1)+r.r){hitE=e;break}}
var boom=r.l<=0||r.x<AR.x||r.x>AR.x+AR.w||r.y<AR.y||r.y>AR.y+AR.h||hitE;
if(!boom&&G.cap&&G.cap.cargo&&!G.cap.cargo.dead&&hyp(G.cap.cargo.x-r.x,G.cap.cargo.y-r.y)<14){cargoHit(r.dmg,r.owner);boom=true}
if(boom){explodeRocket(r,hitE);G.rockets.splice(i,1)}}}
function explodeRocket(r,hitE){var x=r.x,y=r.y,dmg=r.dmg;ring(x,y,4,r.mini?22:50,'#ffb020',.5);part(x,y,'#ffb020',r.mini?10:26,r.mini?70:140,.6,2);
shake(r.mini?2:6);flash(r.mini?.08:.2,'#ffb020');A.explode();HAP.boom();
if(r.hydra&&!r.mini&&hitE)for(var i=0;i<3;i++)fireRocketEntity(x,y,r.a+(i-1)*.7,30,r.owner,true,false);
for(var j=0;j<G.enemies.length;j++){var e=G.enemies[j];if(e.dead)continue;var d=hyp(e.x-x,e.y-y),rad=r.mini?22:50;
if(d<rad)damageEnemy(e,dmg*(1-d/rad*.5),true,e.x,e.y,undefined,true,PL[r.owner]||P)}}
function updateERockets(dt){for(var i=G.erock.length-1;i>=0;i--){var r=G.erock[i],d0=dt*slowAt(r.x,r.y);r.l-=d0;
var tg=nearestPlayer(r.x,r.y),want=Math.atan2(tg.y-r.y,tg.x-r.x);r.a+=clamp(angDiff(r.a,want),-2.6*d0,2.6*d0);
r.vx=Math.cos(r.a)*170;r.vy=Math.sin(r.a)*170;r.x+=r.vx*d0;r.y+=r.vy*d0;part(r.x,r.y,'#a86bff',1,30,.2,1);
var hit=null;for(var q=0;q<PL.length;q++){var p=PL[q];if(p.hp<=0)continue;if(hyp(p.x-r.x,p.y-r.y)<p.r+r.r+2){hit=p;break}}
var boom=r.l<=0||hit||r.x<AR.x||r.x>AR.x+AR.w||r.y<AR.y||r.y>AR.y+AR.h;
if(boom){ring(r.x,r.y,3,26,'#a86bff',.4);part(r.x,r.y,'#a86bff',14,100,.45,2);A.explode();HAP.boom();shake(3);
for(q=0;q<PL.length;q++){var p2=PL[q];if(p2.hp>0&&hyp(p2.x-r.x,p2.y-r.y)<26)hurtPlayer(p2,r.dmg)}
G.erock.splice(i,1)}}}
function updateEnemyBullets(dt){for(var i=G.ebul.length-1;i>=0;i--){var eb=G.ebul[i],d0=dt*slowAt(eb.x,eb.y);
eb.l-=d0;var ox=eb.x,oy=eb.y;eb.x+=eb.vx*d0;eb.y+=eb.vy*d0;
if(eb.l<=0||eb.x<AR.x-20||eb.x>AR.x+AR.w+20||eb.y<AR.y-20||eb.y>AR.y+AR.h+20){G.ebul.splice(i,1);continue}
if(capAlive()&&segHit(ox,oy,eb.x,eb.y,G.cap.x,G.cap.y,46)){damageCap(eb.dmg);part(eb.x,eb.y,'#ffb020',5,60,.25,1);G.ebul.splice(i,1);continue}
var blocked=false;
for(var q=0;q<PL.length;q++){var pp=PL[q];if(pp.hp<=0||!pp.stats||!pp.stats.aegis)continue;
for(var s=0;s<pp.stats.aegisN;s++){var aa=pp.aegisA+s*TAU/pp.stats.aegisN,ax=pp.x+Math.cos(aa)*pp.aegisR,ay=pp.y+Math.sin(aa)*pp.aegisR;
if(hyp(eb.x-ax,eb.y-ay)<7){part(ax,ay,'#b8fbff',6,60,.25,1);ring(ax,ay,2,10,'#b8fbff',.22);A.shieldHit();blocked=true;break}}
if(blocked)break}
if(blocked){G.ebul.splice(i,1);continue}
for(var j=0;j<PL.length;j++){var p=PL[j];if(p.hp<=0)continue;
if(segHit(ox,oy,eb.x,eb.y,p.x,p.y,eb.r+p.r*.9)){hurtPlayer(p,eb.dmg);part(eb.x,eb.y,'#a86bff',7,70,.3,1);G.ebul.splice(i,1);break}}}}
function updateHazards(dt){var i,j,p;
for(i=G.beams.length-1;i>=0;i--){var b=G.beams[i],d0=dt*slowAt(b.x,b.y);
if(b.src){if(b.src.dead){G.beams.splice(i,1);continue}b.x=b.src.x;b.y=b.src.y;
var tg=aiTarget(b.x,b.y),want=Math.atan2(tg.y-b.y,tg.x-b.x);b.ang+=clamp(angDiff(b.ang,want),-1.1*d0,1.1*d0)}
b.life-=d0;b.ang+=b.rot*d0;b.tick-=d0;var x2=b.x+Math.cos(b.ang)*b.len,y2=b.y+Math.sin(b.ang)*b.len;
if(b.tick<=0){for(j=0;j<PL.length;j++){p=PL[j];if(p.hp>0&&segHit(b.x,b.y,x2,y2,p.x,p.y,b.width+p.r*.7)){hurtPlayer(p,b.dmg);b.tick=.35;part(p.x,p.y,'#ff4d4d',5,60,.2,1);break}}
if(capAlive()&&segHit(b.x,b.y,x2,y2,G.cap.x,G.cap.y,46)){damageCap(b.dmg*.6);b.tick=.35}}
if(b.life<=0)G.beams.splice(i,1)}
for(i=G.zones.length-1;i>=0;i--){var z=G.zones[i],dz=dt*slowAt(z.x,z.y);z.life-=dz;
if(!z.done){z.tel-=dz;if(z.tel<=0){z.done=true;ring(z.x,z.y,2,z.r,z.col,.4);part(z.x,z.y,z.col,16,110,.4,1);A.boom();
for(j=0;j<PL.length;j++){p=PL[j];if(p.hp>0&&hyp(p.x-z.x,p.y-z.y)<z.r+p.r)hurtPlayer(p,z.dmg)}}}
if(z.life<=0)G.zones.splice(i,1)}
for(i=G.shocks.length-1;i>=0;i--){var s=G.shocks[i];s.r+=s.speed*dt*slowAt(s.x,s.y);
if(!s.hit)for(j=0;j<PL.length;j++){p=PL[j];if(p.hp>0&&Math.abs(hyp(p.x-s.x,p.y-s.y)-s.r)<7){hurtPlayer(p,s.dmg);s.hit=true;break}}
if(s.r>s.maxR)G.shocks.splice(i,1)}}
function spawnShard(x,y){if(G.drops.length>=280)return;var a=rand(0,TAU),s=rand(20,60);
G.drops.push({id:nextBid(),x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,type:'shard',l:14,sp:rand(0,TAU)})}
function spawnMedkit(x,y){if(G.drops.length>=280)return;G.drops.push({id:nextBid(),x:x,y:y,vx:rand(-20,20),vy:rand(-20,20),type:'hp',l:14,sp:0})}
function updateDrops(dt){for(var i=G.drops.length-1;i>=0;i--){var dr=G.drops[i];dr.l-=dt;dr.sp+=dt*4;
var p=nearestPlayer(dr.x,dr.y),dx=p.x-dr.x,dy=p.y-dr.y,dist=hyp(dx,dy)||1;
var mg=(p.stats?p.stats.magnet:34)*(dr.type==='hp'?.7:1);
if(dist<mg){var pull=420*(1-dist/mg)+70;dr.vx+=dx/dist*pull*dt;dr.vy+=dy/dist*pull*dt}
var kd=Math.exp(-2.4*dt);dr.vx*=kd;dr.vy*=kd;dr.x+=dr.vx*dt;dr.y+=dr.vy*dt;
if(dist<p.r+6){
if(dr.type==='shard'){var add=Math.floor(G.lootMult)+(Math.random()<(G.lootMult%1)?1:0);p.shards+=add;addScore(6*G.mult);A.pick(G.combo);HAP.pick();
part(dr.x,dr.y,'#ff2fb0',6,60,.3,1);ring(dr.x,dr.y,2,11,'#fff',.25);popChip('.chip.g')}
else if(dr.type==='frag'){addBank(p,1);A.pick(8);HAP.pick();part(dr.x,dr.y,'#4d8cff',6,60,.3,1);popChip('.chip.f');float(dr.x,dr.y-8,'+1','#4d8cff',1)}
else if(dr.type==='bp'){var mm=metaOf(p);if(mm.bp.indexOf(dr.bp)<0){
if(dr.bp.indexOf('ship:')===0){if(mm.ships.indexOf(dr.bp.slice(5))<0)mm.bp.push(dr.bp)}
else if(mm.unlocked.indexOf(dr.bp)<0)mm.bp.push(dr.bp);saveMeta()}
A.up();HAP.win();part(dr.x,dr.y,'#ffd76a',12,80,.4,1);
float(dr.x,dr.y-10,dr.bp==='ship:monster'?'ЧЕРТЁЖ МОНСТРА':dr.bp.indexOf('ship:')===0?'ЧЕРТЁЖ КОРАБЛЯ':'ЧЕРТЁЖ','#ffd76a',1)}
else{healPlayer(p,35);A.heal();part(dr.x,dr.y,'#35f0a0',9,70,.35,1);ring(dr.x,dr.y,2,16,'#35f0a0',.3)}
G.shards=localPlayer().shards;G.frags=localPlayer().frags;G.drops.splice(i,1);continue}
if(dr.l<=0)G.drops.splice(i,1)}}
var DODGE={shooter:1,splitter:1,sniper:1,medic:1,emitter:1};
function edgeAvoid(e,dt){var f=140;
if(e.x<AR.x+EDGE)e.vx+=f*dt*(1-(e.x-AR.x)/EDGE);if(e.x>AR.x+AR.w-EDGE)e.vx-=f*dt*(1-(AR.x+AR.w-e.x)/EDGE);
if(e.y<AR.y+EDGE)e.vy+=f*dt*(1-(e.y-AR.y)/EDGE);if(e.y>AR.y+AR.h-EDGE)e.vy-=f*dt*(1-(AR.y+AR.h-e.y)/EDGE)}
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
if(e.st==='approach'){e.vx+=(ux*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(uy*e.sp-e.vy)*Math.min(1,3*dt);if(d<130){e.st='open';e.cd=.85;e.open=0}}
else if(e.st==='open'){e.cd-=dt;e.open=clamp(1-e.cd/.85,0,1);e.vx*=.85;e.vy*=.85;e.tel=1;
if(e.cd<=0){e.st='fire';e.cd=3;e.tel=0;var p=aiTarget(e.x,e.y);
spawnBeam(e.x,e.y,Math.atan2(p.y-e.y,p.x-e.x),0,3,20*D.dmg*dmgScale(),300,4,'#a86bff',e);A.beam()}}
else{e.cd-=dt;e.vx*=.9;e.vy*=.9;e.open=1;if(e.cd<=0)killEnemy(e)}}
function updateBastard(e,dt,d,ux,uy,p){
if(e.st==='approach'){e.invuln=false;var w=d>170?e.sp:(d<120?-e.sp*.6:0);
e.vx+=(ux*w-e.vx)*Math.min(1,2.6*dt);e.vy+=(uy*w-e.vy)*Math.min(1,2.6*dt);e.heat=Math.max(0,e.heat-dt*.5);
if(d<185){e.st='fire';e.cd=3;e.fireT=0;e.lock=Math.atan2(uy,ux);A.tone(140,.3,'sawtooth',.1,2.4);float(e.x,e.y-e.r-10,'ОГОНЬ','#ffb020',1)}return}
if(e.st==='fire'){e.invuln=false;e.vx*=.9;e.vy*=.9;
var la=Math.atan2(p.y-e.y,p.x-e.x);e.lock+=angDiff(e.lock,la)*Math.min(1,1.6*dt);
e.cd-=dt;e.heat=clamp(1-e.cd/3,0,1);e.fireT-=dt;
if(e.fireT<=0){e.fireT=.062;
for(var b=0;b<2;b++){var sa=e.lock+rand(-.42,.42);
eBulletRaw(e.x+Math.cos(e.lock)*(e.r+3)-Math.sin(e.lock)*(b?3:-3),e.y+Math.sin(e.lock)*(e.r+3)+Math.cos(e.lock)*(b?3:-3),sa,190+rand(-25,25),4.2*D.dmg*dmgScale(),2.1)}
part(e.x+Math.cos(e.lock)*(e.r+5),e.y+Math.sin(e.lock)*(e.r+5),'#ffb020',2,60,.16,1);A.gun()}
if(e.cd<=0){e.st='cool';e.cd=5;e.invuln=true;e.shieldFl=.4;A.overheat();ring(e.x,e.y,4,26,'#b8fbff',.5);
float(e.x,e.y-e.r-10,'ПЕРЕГРЕВ','#b8fbff',1);part(e.x,e.y,'#b8fbff',18,70,.7,2)}return}
e.invuln=true;e.cd-=dt;e.heat=clamp(e.cd/5,0,1);
var fw=d<150?-e.sp*.55:(d>210?e.sp*.5:0);
e.vx+=(ux*fw-e.vx)*Math.min(1,2*dt);e.vy+=(uy*fw-e.vy)*Math.min(1,2*dt);
if(Math.random()<dt*8)part(e.x+rand(-6,6),e.y-e.r-2,'#b8fbff',1,26,.5,1);
if(e.cd<=0){e.invuln=false;e.shieldFl=0;if(d<210){e.st='fire';e.cd=3;e.fireT=0;A.tone(140,.3,'sawtooth',.1,2.4)}else e.st='approach'}}
function updateMirror(e,dt,d,ux,uy){e.face+=angDiff(e.face,Math.atan2(uy,ux))*Math.min(1,2.2*dt);if(e.open>0)e.open-=dt;
var w=d>90?e.sp:(d<58?-e.sp*.7:0);e.vx+=(ux*w-e.vx)*Math.min(1,2*dt);e.vy+=(uy*w-e.vy)*Math.min(1,2*dt)}
function updateBrood(e,dt){e.vx*=.9;e.vy*=.9;e.cd-=dt;
if(e.cd<=0){e.cd=3;for(var i=0;i<2&&G.enemies.length<50;i++){var a=rand(0,TAU),m=makeEnemy('mini',e.x+Math.cos(a)*11,e.y+Math.sin(a)*11);
m.vx=Math.cos(a)*55;m.vy=Math.sin(a)*55;G.enemies.push(m)}ring(e.x,e.y,3,17,PAL.g,.32);A.tone(200,.16,'sawtooth',.07,1.8)}}
function updateJammer(e,dt,d,ux,uy){var w=d>96?e.sp:(d<72?-e.sp:0);
e.vx+=(ux*w-e.vx)*Math.min(1,2.4*dt);e.vy+=(uy*w-e.vy)*Math.min(1,2.4*dt)}
function updateAegisGuard(e,dt){var echo=null;
for(var i=0;i<G.enemies.length;i++){var q=G.enemies[i];if(q.bossKind==='twins'&&!q.dead){echo=q;break}}
if(!echo){e.dead=true;return}
var a=Math.atan2(echo.y-e.y,echo.x-e.x);
e.vx+=(Math.cos(a)*e.sp-e.vx)*Math.min(1,1.6*dt);e.vy+=(Math.sin(a)*e.sp-e.vy)*Math.min(1,1.6*dt);e.face+=dt*1.2}
function updateTwins(e,dt,p,d){var fr=e.hp/e.max;e.phase=fr>.66?1:(fr>.33?2:3);
if(G.boss===e){$('#bossPhase').textContent='ФАЗА '+e.phase;setBossPips(e.phase);$('#bossFill').style.transform='scaleX('+clamp(fr,0,1)+')'}
var ag=null;for(var i=0;i<G.enemies.length;i++){var q=G.enemies[i];if(q.type==='aegis'&&!q.dead){ag=q;break}}
G.twinsLink=!!(ag&&hyp(ag.x-e.x,ag.y-e.y)<120);
var ux=(p.x-e.x)/(d||1),uy=(p.y-e.y)/(d||1),w=d<150?-e.sp:(d>210?e.sp*.4:0);
e.vx+=(ux*w-uy*e.sp*.4-e.vx)*Math.min(1,1.8*dt);e.vy+=(uy*w+ux*e.sp*.4-e.vy)*Math.min(1,1.8*dt);
e.atkT-=dt;if(e.atkT<=0){e.atkT=2.6;var n=8+e.phase*2;e.ang+=.3;
for(var k=0;k<n;k++)eShoot(e,e.ang+k*TAU/n,74,8*D.dmg,'orbV');ring(e.x,e.y,e.r,e.r+16,e.col,.25);A.tone(260,.12,'square',.06,.6)}}
function updateDark(e,dt){var st=e.stats,p=aiTarget(e.x,e.y);
var dx=p.x-e.x,dy=p.y-e.y,dd=hyp(dx,dy)||1,ux=dx/dd,uy=dy/dd,fr=e.hp/e.max;
e.phase=fr>.66?1:(fr>.33?2:3);
if(G.boss===e){$('#bossPhase').textContent='ФАЗА '+e.phase;setBossPips(e.phase);$('#bossFill').style.transform='scaleX('+clamp(fr,0,1)+')'}
e.aim=Math.atan2(dy,dx);if(e.swingT>0)e.swingT-=dt;
e.shieldT=Math.max(0,e.shieldT-dt);if(st.shieldMax&&e.shieldT<=0)e.shield=Math.min(st.shieldMax,e.shield+st.shieldRegen*dt);
if(st.regen&&e.hp<e.max)e.hp=Math.min(e.max,e.hp+st.regen*dt*.6);
if(st.healRate)e.hp=Math.min(e.max,e.hp+st.healRate*dt);
if(st.aegis){e.aegisA+=dt*(e.dashT>0?7:2.4);e.aegisR+=((e.dashT>0?52:st.aegisR)-e.aegisR)*Math.min(1,dt*8);
for(var ag=0;ag<st.aegisN;ag++){var aa=e.aegisA+ag*TAU/st.aegisN,ax=e.x+Math.cos(aa)*e.aegisR,ay=e.y+Math.sin(aa)*e.aegisR;
for(var q2=0;q2<PL.length;q2++){var pp2=PL[q2];if(pp2.hp>0&&hyp(pp2.x-ax,pp2.y-ay)<pp2.r+6&&e.hitT<=0){hurtPlayer(pp2,st.aegisDmg*DK);e.hitT=.5}}}}
if(st.tesla){for(var tz=0;tz<PL.length;tz++){var tp=PL[tz];if(tp.hp<=0)continue;
if(hyp(tp.x-e.x,tp.y-e.y)<st.teslaR){tp.hp-=st.teslaDps*DK*dt;if(Math.random()<dt*3)part(tp.x,tp.y,'#a86bff',1,30,.2,1);
if(tp.hp<=0)playerDown(tp)}}}
e.dashCd=Math.max(0,e.dashCd-dt);e.ramCd=Math.max(0,e.ramCd-dt);e.hyperCd=Math.max(0,e.hyperCd-dt);
var wantDash=st.ship==='psy'?1.1:2.6;
if(e.dashT>0){e.dashT-=dt;e.vx=e.dx*300*(st.dashSpeedMul||1);e.vy=e.dy*300*(st.dashSpeedMul||1);e.socioSpin=1.1;
G.ghost.push({x:e.x,y:e.y,a:e.aim,l:.22,m:.22,col:'#5a3a9a',ship:e.ship,id:2,dark:true});
if(hyp(p.x-e.x,p.y-e.y)<e.r+8&&e.hitT<=0){hurtPlayer(p,st.dashDmg*DK);e.hitT=.7}}
else{
if(e.dashCd<=0&&dd<(st.ship==='psy'?150:220)){var la=Math.atan2(dy,dx);e.dx=Math.cos(la);e.dy=Math.sin(la);e.dashT=.18;e.dashCd=st.dashCd*wantDash*.5+wantDash;A.dash()}
else if(e.ramCd<=0&&dd<200){var ra=Math.atan2(dy,dx);e.dx=Math.cos(ra);e.dy=Math.sin(ra);e.dashT=.3;e.ramCd=3.4;e.dashCd=Math.max(e.dashCd,1);A.dash();part(e.x,e.y,'#a86bff',12,90,.4,1)}
else{var tx,ty;if(dd<95){tx=-ux;ty=-uy}else if(dd>150){tx=ux;ty=uy}else{tx=-uy;ty=ux}
e.vx+=(tx*st.speed*.85-e.vx)*Math.min(1,4*dt);e.vy+=(ty*st.speed*.85-e.vy)*Math.min(1,4*dt)}}
if(st.hyper&&e.hyperCd<=0&&dd<240){e.hyperCd=st.hyperCd+2;var cnt=st.hyperGold?3:1,hx=e.x,hy=e.y;
for(var c=0;c<cnt;c++){var tg2=nearestPlayer(hx,hy);if(tg2.hp<=0)break;
G.ghost.push({x:hx,y:hy,a:e.aim,l:.3,m:.3,col:'#5a3a9a',ship:e.ship,id:2,dark:true});
hx=tg2.x;hy=tg2.y;e.x=clamp(hx,AR.x+e.r,AR.x+AR.w-e.r);e.y=clamp(hy,AR.y+e.r,AR.y+AR.h-e.r);
hurtPlayer(tg2,st.hyperDmg*DK);ring(e.x,e.y,4,28,'#a86bff',.4)}A.blink();shake(4)}
e.fireT-=dt;
if(e.fireT<=0){
if(st.fireMode==='scythe'){e.fireT=1/st.rate;e.swingT=.3;e.swingDir=-e.swingDir;A.scythe();
for(var s2=0;s2<PL.length;s2++){var sp=PL[s2];if(sp.hp<=0)continue;
if(hyp(sp.x-e.x,sp.y-e.y)>st.scytheR+sp.r)continue;
if(Math.abs(angDiff(e.aim,Math.atan2(sp.y-e.y,sp.x-e.x)))>st.scytheHalf)continue;
hurtPlayer(sp,st.scytheDmg*DK);ring(e.x,e.y,st.scytheR*.4,st.scytheR,'#a86bff',.22)}}
else if(st.fireMode==='cone'){e.fireT=.1;
for(var c2=0;c2<PL.length;c2++){var cp=PL[c2];if(cp.hp<=0)continue;
if(hyp(cp.x-e.x,cp.y-e.y)>st.coneR)continue;
if(Math.abs(angDiff(e.aim,Math.atan2(cp.y-e.y,cp.x-e.x)))>st.coneHalf)continue;
cp.hp-=st.coneDps*DK*.1;if(Math.random()<.4)part(cp.x,cp.y,'#a86bff',1,40,.2,1);
if(cp.hp<=0)playerDown(cp)}}
else{e.fireT=1/st.rate;
if(st.fireMode==='rocket'){eRocket(e.x+Math.cos(e.aim)*8,e.y+Math.sin(e.aim)*8,e.aim,st.dmg*.5);A.rocket()}
else if(st.fireMode==='sniper'){eBulletRaw(e.x+Math.cos(e.aim)*10,e.y+Math.sin(e.aim)*10,e.aim,Math.min(st.bs,900),st.dmg*.5,1.6);A.tone(1200,.08,'square',.05,.4)}
else if(st.fireMode==='shotgun'){for(var s3=0;s3<st.count;s3++)eBulletRaw(e.x+Math.cos(e.aim)*7,e.y+Math.sin(e.aim)*7,e.aim+(s3-(st.count-1)/2)*st.spread,st.bs*.8,st.dmg*.35,.4);A.tone(500,.08,'square',.05,.4)}
else if(st.fireMode==='dual'){for(var g2=-1;g2<=1;g2+=2){var gx=e.x+Math.cos(e.aim)*14-Math.sin(e.aim)*g2*9,gy=e.y+Math.sin(e.aim)*14+Math.cos(e.aim)*g2*9;
eBulletRaw(gx,gy,Math.atan2(p.y-gy,p.x-gx),st.bs,st.dmg*.45,1.3)}A.shoot()}
else{for(var i2=0;i2<st.count;i2++)eBulletRaw(e.x+Math.cos(e.aim)*7,e.y+Math.sin(e.aim)*7,e.aim+(i2-(st.count-1)/2)*st.spread*2,st.bs,st.dmg*.45,1.3);A.shoot()}}}
e.weaponCd-=dt;
if(st.weapon&&st.weapon!=='chrono'&&e.weaponCd<=0){e.weaponCd=st.weaponCdMax;
if(st.weapon==='rocket'){eRocket(e.x,e.y,e.aim,st.weaponDmg*DK);A.rocket()}
else if(st.weapon==='wave'){spawnShock(e.x,e.y,st.weaponRadius,150,st.weaponDmg*DK,'#a86bff');A.shock()}
else if(st.weapon==='beam')spawnBeam(e.x,e.y,e.aim,0,2,st.weaponDmg*DK,280,4,'#a86bff',e);
flash(.08,'#a86bff')}
for(var d2=0;d2<st.drones;d2++){e.dT[d2]-=dt;if(e.dT[d2]<=0){e.dT[d2]=.5;
var a3=G.t*1.8+d2*TAU/Math.max(1,st.drones),ddx=e.x+Math.cos(a3)*16,ddy=e.y+Math.sin(a3)*16,t2=nearestPlayer(ddx,ddy);
eBulletRaw(ddx,ddy,Math.atan2(t2.y-ddy,t2.x-ddx),200,st.dmg*.35*DK,1.1)}}
if(st.socio){e.socioSpin=Math.max(0,e.socioSpin-dt);var spin=e.socioSpin>0,bs=spin?16:2.2,dps=(spin?st.socioSpinDps:st.socioDps)*DK;
for(var b=0;b<2;b++){var ba=G.t*bs+b*Math.PI,bx=e.x+Math.cos(ba)*22,by=e.y+Math.sin(ba)*22;
for(var j=0;j<PL.length;j++){var pp=PL[j];if(pp.hp>0&&hyp(pp.x-bx,pp.y-by)<pp.r+7&&!CHEAT.god){pp.hp-=dps*dt;if(pp.hp<=0)playerDown(pp)}}}}
if(dd<e.r+8&&e.hitT<=0&&e.dashT<=0){hurtPlayer(p,st.dashDmg*.3*DK);e.hitT=.7}}
function applyBleed(e,dps,owner){if(e.invuln||twinsShielded(e))return;e.bleedT=3;e.bleedDps=Math.max(e.bleedDps,dps);e.bleedOwner=owner;A.bleed()}
function applyElectro(e,dps,owner,lvl){if(e.invuln||twinsShielded(e))return;
e.electroT=Math.max(e.electroT,1.3);e.electroDps=Math.max(e.electroDps,dps);e.electroOwner=owner;e.electroLvl=Math.max(e.electroLvl,lvl)}
function updateEnemies(dt){planShieldGroups();
var onlyMedics=G.enemies.length>0;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;if(e.type!=='medic'){onlyMedics=false;break}}
for(i=0;i<G.enemies.length;i++){e=G.enemies[i];if(e.dead)continue;
var cs=slowAt(e.x,e.y),edt=dt*cs;
e.t+=edt;e.fl=Math.max(0,e.fl-dt);e.fr=Math.max(0,e.fr-dt);e.hitT=Math.max(0,e.hitT-dt);e.shieldFl=Math.max(0,e.shieldFl-dt);
if(e.slowT>0)e.slowT-=dt;
if(e.bleedT>0&&!e.invuln&&!twinsShielded(e)){e.bleedT-=dt;var bd=e.bleedDps*dt;e.hp-=bd;e.fr=Math.max(e.fr,.03);
healPlayer(PL[e.bleedOwner]||P,bd);
if(Math.random()<dt*7)part(e.x+rand(-4,4),e.y+rand(-4,4),'#ff4d4d',1,26,.35,1);
if(e.hp<=0){killEnemy(e);continue}}
if(e.electroT>0&&!e.invuln&&!twinsShielded(e)){e.electroT-=dt;e.hp-=e.electroDps*dt;e.fr=Math.max(e.fr,.03);e.electroTick-=dt;
if(Math.random()<dt*8)part(e.x+rand(-5,5),e.y+rand(-5,5),'#b8fbff',1,35,.2,1);
if(e.electroTick<=0){e.electroTick=.4;
if(e.electroLvl>=2){var rad=e.electroLvl>=3?70:48,best=null,bd2=1e9;
for(var v2=0;v2<G.enemies.length;v2++){var q2=G.enemies[v2];if(q2===e||q2.dead||q2.invuln||q2.electroT>0)continue;
var dd2=hyp(q2.x-e.x,q2.y-e.y);if(dd2<rad&&dd2<bd2){bd2=dd2;best=q2}}
if(best){applyElectro(best,e.electroDps*.8,e.electroOwner,e.electroLvl);ring(best.x,best.y,2,12,'#b8fbff',.25);A.zap()}}}
if(e.hp<=0){killEnemy(e);continue}}
var sm=e.slowT>0?e.slowMul:1,mdt=edt*sm;
var p=aiTarget(e.x,e.y),dx=p.x-e.x,dy=p.y-e.y,d=hyp(dx,dy)||1,ux=dx/d,uy=dy/d;
if(e.stunT>0){e.stunT-=dt;e.vx*=.86;e.vy*=.86;if(Math.random()<dt*6)part(e.x+rand(-6,6),e.y-e.r-3,'#ffb020',1,25,.25,1)}
else{
if(onlyMedics&&e.type==='medic')e.mode='boom';
if(e.type==='dark')updateDark(e,mdt);
else if(e.type==='aegis')updateAegisGuard(e,mdt);
else if(e.bossKind==='twins')updateTwins(e,mdt,p,d);
else if(e.type==='ram')updateRam(e,mdt,d,ux,uy);
else if(e.type==='lgun')updateLgun(e,mdt,d,ux,uy);
else if(e.type==='bastard')updateBastard(e,mdt,d,ux,uy,p);
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
if(e.elite===2)for(var v=0;v<G.enemies.length;v++){var vv=G.enemies[v];
if(vv!==e&&!vv.dead&&!vv.invuln&&vv.hp<vv.max&&hyp(vv.x-e.x,vv.y-e.y)<45){vv.hp=Math.min(vv.max,vv.hp+4*mdt);
if(Math.random()<mdt*2)part(vv.x,vv.y,'#ff2fb0',1,30,.2,1)}}
if(DODGE[e.type])applyDodge(e,mdt);edgeAvoid(e,mdt)}
e.x+=e.vx*mdt;e.y+=e.vy*mdt;e.x=clamp(e.x,AR.x+e.r,AR.x+AR.w-e.r);e.y=clamp(e.y,AR.y+e.r,AR.y+AR.h-e.r);
if(capAlive()&&hyp(G.cap.x-e.x,G.cap.y-e.y)<52&&e.hitT<=0&&e.dmg>0){damageCap(e.dmg*.8);e.hitT=.7;
e.vx-=ux*80;e.vy-=uy*80;part(e.x,e.y,'#ffb020',6,70,.3,1)}
var rp=nearestPlayer(e.x,e.y),rd=hyp(rp.x-e.x,rp.y-e.y);
if(e.stunT<=0&&e.type!=='dark'&&e.type!=='ram'&&e.type!=='lgun'&&e.type!=='aegis'&&e.type!=='brood'&&e.type!=='jammer'&&rd<e.r*(e.sc||1)+rp.r&&e.hitT<=0&&e.type!=='medic'&&e.type!=='emitter'){
if(!(rp.dashT>0&&rp.stats&&rp.stats.phase)){hurtPlayer(rp,e.dmg*(e.st==='charge'?1.3:1));e.hitT=.6;e.vx-=ux*70;e.vy-=uy*70;rp.vx+=ux*50;rp.vy+=uy*50}}}
for(i=0;i<G.enemies.length;i++){var a1=G.enemies[i];if(a1.dead)continue;
for(var j=i+1;j<G.enemies.length;j++){var b1=G.enemies[j];if(b1.dead)continue;
var ddx=b1.x-a1.x,ddy=b1.y-a1.y,rr=a1.r+b1.r,d2=ddx*ddx+ddy*ddy;
if(d2<rr*rr&&d2>.01){var dd=Math.sqrt(d2),ff=(rr-dd)/dd*.4;
if(!a1.boss&&!a1.invuln){a1.x-=ddx*ff;a1.y-=ddy*ff}if(!b1.boss&&!b1.invuln){b1.x+=ddx*ff;b1.y+=ddy*ff}}}}
G.enemies=G.enemies.filter(function(en){return !en.dead})}
function planShieldGroups(){var groups=new Map(),snipers=[];
for(var q=0;q<G.enemies.length;q++){var e=G.enemies[q];if(e.dead)continue;if(e.type==='sniper')snipers.push(e);
if(e.type==='shielder'){var k=e.group!=null?e.group:'solo'+e.id;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}}
var claimed=new Set();
groups.forEach(function(mem){mem.sort(function(a,b){return a.slot-b.slot});
var n=mem.length,cx=0,cy=0,i;for(i=0;i<n;i++){cx+=mem[i].x;cy+=mem[i].y}cx/=n;cy/=n;
var guard=null;if(mem[0].guardId!=null)for(i=0;i<snipers.length;i++)if(snipers[i].id===mem[0].guardId){guard=snipers[i];break}
if(!guard){var bd=1e9;for(i=0;i<snipers.length;i++){var s=snipers[i];if(claimed.has(s.id))continue;
var d=hyp(s.x-cx,s.y-cy);if(d<bd){bd=d;guard=s}}if(bd>300)guard=null}
if(guard)claimed.add(guard.id);
var p=aiTarget(cx,cy),dP=hyp(p.x-cx,p.y-cy),prev=mem[0].mode,mode,ax=cx,ay=cy,ar=0;
if(guard){mode='guard';ax=guard.x;ay=guard.y;ar=27}else if(n===1)mode='solo';
else{mode=(prev==='circle'?dP<96:dP<74)?'circle':'cluster';ar=24}
var toP=Math.atan2(p.y-ay,p.x-ax),base=mode==='guard'?G.t*.5:G.t*.25;
for(i=0;i<n;i++){var m=mem[i];m.guardId=guard?guard.id:null;m.mode=mode;m.ax=ax;m.ay=ay;m.ar=ar;
if(mode==='solo'){m.tx=p.x;m.ty=p.y;m.tface=toP}
else if(mode==='cluster'){var off=(i-(n-1)/2)*14,px=-Math.sin(toP),py=Math.cos(toP);
m.tx=ax+px*off+Math.cos(toP)*16;m.ty=ay+py*off+Math.sin(toP)*16;m.tface=toP}
else{var a=base+i*TAU/n;m.tx=ax+Math.cos(a)*ar;m.ty=ay+Math.sin(a)*ar;m.tface=a}}})}
function applyDodge(e,dt){if(G.wave<=5)return;e.dodgeCd-=dt;e.dodgeT-=dt;
if(e.dodgeT>0){e.vx=e.vx*.25+e.dvx;e.vy=e.vy*.25+e.dvy;return}
if(e.dodgeCd>0||!isFinite(e.dodgeCd))return;
for(var i=0;i<G.bul.length;i++){var bl=G.bul[i],rx=e.x-bl.x,ry=e.y-bl.y,v2=bl.vx*bl.vx+bl.vy*bl.vy;if(v2<1)continue;
var t=(rx*bl.vx+ry*bl.vy)/v2;if(t<0||t>.55)continue;var cx=rx-bl.vx*t,cy=ry-bl.vy*t;
if(cx*cx+cy*cy>(e.r+bl.r+7)*(e.r+bl.r+7))continue;
var vl=Math.sqrt(v2),px=-bl.vy/vl,py=bl.vx/vl,side=(cx*px+cy*py)>=0?1:-1,sp=e.sp*1.9+65;
e.dvx=px*side*sp;e.dvy=py*side*sp;e.dodgeT=.22;e.dodgeCd=dodgeCd(G.wave)*rand(.8,1.2);part(e.x,e.y,'#fff',2,40,.15,1);return}}
function updateShooter(e,dt,d,ux,uy,dx,dy){var tx,ty;
if(d<70){tx=-ux;ty=-uy}else if(d>110){tx=ux;ty=uy}else{tx=-uy;ty=ux}
e.vx+=(tx*e.sp-e.vx)*Math.min(1,4*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,4*dt);e.cd-=dt;e.tel=e.cd<.3?1:0;
if(e.cd<=0){e.cd=rand(1.5,2.2)/D.sp;eShoot(e,Math.atan2(dy,dx),95,8*D.dmg,'orbA');part(e.x,e.y,PAL.a,3,50,.2,1);A.tone(300,.06,'square',.05,.6)}}
function updateTank(e,dt,d,ux,uy,dx,dy){
if(e.st==='walk'){e.vx+=(ux*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(uy*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;
if(e.cd<=0&&d<130){e.st='tel';e.cd=.75;e.lock=Math.atan2(dy,dx)}}
else if(e.st==='tel'){e.cd-=dt;e.tel=1;e.vx*=.86;e.vy*=.86;if(e.cd<=0){e.st='charge';e.cd=.6;e.tel=0;A.tone(120,.22,'sawtooth',.11,1.8)}}
else{e.cd-=dt;e.vx=Math.cos(e.lock)*130;e.vy=Math.sin(e.lock)*130;part(e.x,e.y,PAL.r,1,35,.25,1);if(e.cd<=0){e.st='walk';e.cd=rand(2.4,3.6)}}}
function updateShielder(e,dt,d,ux,uy,dx,dy){e.face+=angDiff(e.face,e.tface)*Math.min(1,1.6*dt);
var tx=e.tx-e.x,ty=e.ty-e.y,td=hyp(tx,ty)||1,sp=Math.min(e.sp*1.9,td*5);
e.vx+=((tx/td)*sp-e.vx)*Math.min(1,4*dt);e.vy+=((ty/td)*sp-e.vy)*Math.min(1,4*dt);e.cd-=dt;
if(e.cd<=0&&Math.abs(angDiff(e.face,Math.atan2(dy,dx)))<.9){e.cd=rand(1.8,2.4);eShoot(e,e.face,95,8*D.dmg,'orbM');A.tone(280,.06,'square',.05,.6)}}
function updateSniper(e,dt,d,ux,uy){var tx,ty;
if(e.tel>0){tx=0;ty=0}else if(d<170){tx=-ux;ty=-uy}else if(d>230){tx=ux;ty=uy}else{tx=-uy;ty=ux}
e.vx+=(tx*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;
var p=aiTarget(e.x,e.y);
if(e.cd<=.7&&e.tel===0){e.tel=1;e.lock=Math.atan2(p.y-e.y,p.x-e.x);A.tone(700,.3,'sine',.05,1.6)}
if(e.cd<=0){e.cd=3;e.tel=0;eShoot(e,e.lock,1400,36*D.dmg,'orbR');part(e.x,e.y,PAL.r,6,90,.25,1);A.tone(150,.15,'sawtooth',.12,.4)}}
function updateMedic(e,dt,d,ux,uy){e.beam=null;if(e.hp<e.max*.25)e.mode='boom';
if(e.mode==='boom'){e.vx+=(ux*130-e.vx)*Math.min(1,6*dt);e.vy+=(uy*130-e.vy)*Math.min(1,6*dt);part(e.x,e.y,PAL.g,1,40,.2,1);
if(d<12){var p=nearestPlayer(e.x,e.y);hurtPlayer(p,50*dmgScale());ring(e.x,e.y,4,44,PAL.g,.5);part(e.x,e.y,PAL.g,30,130,.6,2);flash(.3,PAL.g);A.boom();HAP.boom();killEnemy(e)}return}
var target=null,bd=1e9;
for(var i=0;i<G.enemies.length;i++){var o=G.enemies[i];if(o===e||o.dead||o.type==='medic'||o.type==='dark'||o.invuln||o.hp>=o.max)continue;
var dd=hyp(o.x-e.x,o.y-e.y);if(dd<bd){bd=dd;target=o}}
if(target&&bd<110){e.beam={x:target.x,y:target.y};target.hp=Math.min(target.max,target.hp+12*dt);
e.vx+=((target.x-e.x)/bd*20-e.vx)*Math.min(1,3*dt);e.vy+=((target.y-e.y)/bd*20-e.vy)*Math.min(1,3*dt)}
else{var t2,u2;if(d<110){t2=-ux;u2=-uy}else{t2=-uy;u2=ux}
e.vx+=(t2*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(u2*e.sp-e.vy)*Math.min(1,3*dt)}}
function updateEmitter(e,dt,d,ux,uy){var tx,ty;
if(d<120){tx=-ux;ty=-uy}else if(d>170){tx=ux;ty=uy}else{tx=-uy;ty=ux}
e.vx+=(tx*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;e.tel=e.cd<.7?1:0;
if(e.cd<=0){e.cd=4.2;var n=G.wave>=18?8:6,base=rand(0,TAU);
for(var i=0;i<n;i++)spawnBeam(e.x,e.y,base+i*TAU/n,.35,1.3,10*D.dmg*escale(e),240,2,PAL.c);A.laser()}}
function updateWalker(e,dt,ux,uy){var wob=e.type==='splitter'?Math.sin(e.t*3)*.45:0;
var ax=ux*Math.cos(wob)-uy*Math.sin(wob),ay=ux*Math.sin(wob)+uy*Math.cos(wob);
e.vx+=(ax*e.sp-e.vx)*Math.min(1,5*dt);e.vy+=(ay*e.sp-e.vy)*Math.min(1,5*dt)}
function bossAI(e,dt,ux,uy,d){var fr=e.hp/e.max;e.phase=fr>.66?1:(fr>.33?2:3);
if(G.boss===e){$('#bossPhase').textContent='ФАЗА '+e.phase;setBossPips(e.phase);$('#bossFill').style.transform='scaleX('+clamp(fr,0,1)+')'}
e.shieldAng+=dt*(e.bossKind==='prism'?1.1:.3);e.fleeT=Math.max(0,e.fleeT-dt);
if(e.bossKind==='hive'&&!e.crisis&&fr<.5){e.crisis=true;e.fleeT=4;var cp=nearestPlayer(e.x,e.y);
for(var mi=0;mi<6;mi++){var ma=mi*TAU/6,mx=clamp(e.x+Math.cos(ma)*26,AR.x+EDGE,AR.x+AR.w-EDGE),my=clamp(e.y+Math.sin(ma)*26,AR.y+EDGE,AR.y+AR.h-EDGE);
var md=makeEnemy('medic',mx,my);md.vx=Math.cos(ma)*60;md.vy=Math.sin(ma)*60;G.enemies.push(md);ring(mx,my,2,12,PAL.g,.35)}
for(var si=0;si<5;si++){var sa=si*TAU/5,sx=clamp(cp.x+Math.cos(sa)*80,AR.x+EDGE,AR.x+AR.w-EDGE),sy=clamp(cp.y+Math.sin(sa)*80,AR.y+EDGE,AR.y+AR.h-EDGE);
G.enemies.push(makeEnemy('sniper',sx,sy));ring(sx,sy,2,12,PAL.v,.35)}
banner('УЛЕЙ ПРОБУЖДЁН','МАТКА ЗОВЁТ ЗАЩИТУ');flash(.3,PAL.g);shake(5);A.bossIn();HAP.big()}
if(e.st==='charge'){e.chargeT-=dt;e.vx=Math.cos(e.lock)*210;e.vy=Math.sin(e.lock)*210;part(e.x,e.y,e.col,2,50,.3,1);if(e.chargeT<=0)e.st='';return}
moveBoss(e,dt,ux,uy,d);
if(e.pending){e.tel-=dt;if(e.tel<=0){execBoss(e,e.pending);e.pending=null;e.atkT=bossCd(e)}}
else{e.atkT-=dt;if(e.atkT<=0){e.pending=pickBossAtk(e);e.tel=.5}}}
function moveBoss(e,dt,ux,uy,d){var tx=0,ty=0,k=e.bossKind;
if(k==='hammer'){tx=ux*e.sp;ty=uy*e.sp}
else if(k==='eye'){var w=d<170?-1:(d>220?1:0);tx=ux*w*e.sp-uy*e.sp*.5;ty=uy*w*e.sp+ux*e.sp*.5}
else if(k==='prism'){tx=-uy*e.sp;ty=ux*e.sp}
else if(k==='hive'){if(e.fleeT>0){tx=-ux*e.sp*1.25;ty=-uy*e.sp*1.25}else if(d<150){tx=-ux*e.sp;ty=-uy*e.sp}
else if(d>200){tx=ux*e.sp*.5;ty=uy*e.sp*.5}else{tx=-uy*e.sp*.6;ty=ux*e.sp*.6}}
else{var w2=d>90?1:-1;tx=ux*w2*e.sp*.8;ty=uy*w2*e.sp*.8}
e.vx+=(tx-e.vx)*Math.min(1,2*dt);e.vy+=(ty-e.vy)*Math.min(1,2*dt)}
function bossCd(e){var b=Math.max(.7,1.6-(e.phase-1)*.25-(G.wave-5)*.01);if(e.bossKind==='hive'&&e.crisis)return Math.max(.5,b*.65);return b}
function pickBossAtk(e){var p=e.phase,k=e.bossKind;
if(k==='guardian')return pick(p>=2?['radial','spiral','charge','summon']:['radial','spiral','summon']);
if(k==='hive'){if(e.crisis)return pick(p>=2?['summonMed','summonMed','summonSnipe','spore','radial']:['summonMed','summonSnipe','spore']);
return pick(p>=2?['summon','summon','spore','radial']:['summon','spore'])}
if(k==='prism')return pick(p>=2?['beams','radial','charge','spiral']:['beams','radial']);
if(k==='hammer')return pick(p>=2?['shock','zones','charge','pull']:['shock','zones','charge']);
if(k==='eye')return pick(p>=2?['volley','cross','mark','summon']:['volley','mark']);
return pick(p>=2?['blink','clones','spiral','radial']:['blink','clones'])}
function execBoss(e,kind){var ds=escale(e),p0=aiTarget(e.x,e.y),dd=hyp(p0.x-e.x,p0.y-e.y)||1,ux=(p0.x-e.x)/dd,uy=(p0.y-e.y)/dd,i;
if(kind==='radial'){var n=10+e.phase*3;e.ang+=.24;for(var k=0;k<n;k++)eShoot(e,e.ang+k*TAU/n,72+e.phase*6,9*D.dmg,'orbM');
ring(e.x,e.y,e.r,e.r+16,e.col,.25);A.tone(240,.1,'square',.07,.6)}
else if(kind==='spiral'){for(var s=0;s<10;s++){var a=e.ang+s*.42;eShoot(e,a,88,8*D.dmg,'orbA');eShoot(e,a+Math.PI,88,8*D.dmg,'orbA')}e.ang+=.6;A.tone(300,.12,'square',.07,.7)}
else if(kind==='charge'){e.st='charge';e.chargeT=.6;e.lock=Math.atan2(p0.y-e.y,p0.x-e.x);A.tone(90,.5,'sawtooth',.12,2.2)}
else if(kind==='summon'){var n2=(e.bossKind==='hive'?3:2)+e.phase;
for(i=0;i<n2;i++){var a2=rand(0,TAU),type=e.bossKind==='hive'?(i%3===0?'medic':(i%3===1?'splitter':'grunt')):(e.bossKind==='eye'?'sniper':(e.phase>=3?'shooter':'grunt'));
var m=makeEnemy(type,e.x+Math.cos(a2)*22,e.y+Math.sin(a2)*22);m.vx=Math.cos(a2)*70;m.vy=Math.sin(a2)*70;rollElite(m);G.enemies.push(m);ring(m.x,m.y,2,11,e.col,.3)}A.tone(180,.3,'sawtooth',.11,2)}
else if(kind==='summonMed'){for(i=0;i<2+(e.phase>=3?1:0)&&G.enemies.length<50;i++){var am=rand(0,TAU),xm=clamp(e.x+Math.cos(am)*24,AR.x+EDGE,AR.x+AR.w-EDGE),ym=clamp(e.y+Math.sin(am)*24,AR.y+EDGE,AR.y+AR.h-EDGE);
var md=makeEnemy('medic',xm,ym);md.vx=Math.cos(am)*50;md.vy=Math.sin(am)*50;G.enemies.push(md);ring(xm,ym,2,11,PAL.g,.3)}A.tone(180,.3,'sawtooth',.11,2)}
else if(kind==='summonSnipe'){for(i=0;i<1+(e.phase>=3?1:0)&&G.enemies.length<50;i++){var as=rand(0,TAU),xs=clamp(e.x+Math.cos(as)*60,AR.x+EDGE,AR.x+AR.w-EDGE),ys=clamp(e.y+Math.sin(as)*60,AR.y+EDGE,AR.y+AR.h-EDGE);
G.enemies.push(makeEnemy('sniper',xs,ys));ring(xs,ys,2,11,PAL.v,.3)}A.tone(700,.2,'sine',.06,1.6)}
else if(kind==='spore'){for(i=0;i<3+e.phase;i++)spawnZone(p0.x+rand(-70,70),p0.y+rand(-70,70),26,.8,1.1,12*D.dmg*ds,'#9dff3c');A.tone(160,.3,'triangle',.1,1.6)}
else if(kind==='beams'){var n3=2+e.phase;for(i=0;i<n3;i++)spawnBeam(e.x,e.y,e.shieldAng+i*TAU/n3,.5,1.6,11*D.dmg*ds,300,3,PAL.c);A.laser()}
else if(kind==='shock'){spawnShock(e.x,e.y,180,150,16*D.dmg*ds,'#ffb020');shake(4);A.shock();HAP.boom()}
else if(kind==='zones'){for(i=0;i<2+e.phase;i++)spawnZone(p0.x+rand(-60,60),p0.y+rand(-60,60),30,.75,1.05,18*D.dmg*ds,'#ffb020');A.tone(120,.3,'square',.1,1.8)}
else if(kind==='pull'){var rp=nearestPlayer(e.x,e.y);rp.vx-=ux*160;rp.vy-=uy*160;spawnShock(e.x,e.y,150,130,14*D.dmg*ds,'#ff4d4d');A.tone(70,.4,'sawtooth',.14,2)}
else if(kind==='volley'){for(i=0;i<3;i++)eShoot(e,Math.atan2(p0.y-e.y,p0.x-e.x)+(i-1)*.12,900,14*D.dmg,'orbR');A.tone(150,.15,'sawtooth',.12,.4)}
else if(kind==='cross'){for(i=0;i<4;i++)spawnBeam(e.x,e.y,e.shieldAng+i*TAU/4,.25,1.4,12*D.dmg*ds,320,3,'#a86bff');A.laser()}
else if(kind==='mark'){spawnZone(p0.x,p0.y,34,.9,1.2,24*D.dmg*ds,'#ff4d4d');A.tone(700,.3,'sine',.06,1.6)}
else if(kind==='blink'){var a4=rand(0,TAU),dist=rand(70,110);
e.x=clamp(p0.x+Math.cos(a4)*dist,AR.x+20,AR.x+AR.w-20);e.y=clamp(p0.y+Math.sin(a4)*dist,AR.y+20,AR.y+AR.h-20);
ring(e.x,e.y,4,40,'#ff2fb0',.4);A.blink();var n4=8+e.phase*2;for(k=0;k<n4;k++)eShoot(e,k*TAU/n4,80,8*D.dmg,'orbM')}
else if(kind==='clones'){for(i=0;i<2+e.phase;i++){var a5=rand(0,TAU),m2=makeEnemy('clone',e.x+Math.cos(a5)*18,e.y+Math.sin(a5)*18);
m2.vx=Math.cos(a5)*80;m2.vy=Math.sin(a5)*80;G.enemies.push(m2)}A.blink()}}
SHIPS.forEach(function(s){if(s.id==='monster'){s.cost=250;s.d='175 корпуса · ×3 размер · две сходящиеся пушки · все три активных оружия · дальний мощный рывок'}});
var PD=window.PULSAR_DATA||{};
G.wrecks=[];G.dmgMarks=[];CHEAT.fullmap=false;
var PREVIEWS=[],GLOSSANIM=[],ANIMT=0;
function pd(){return PD}
function pdMerch(){return PD.merch||{name:'ГЛАЗАСТЫЙ',sub:'торгует железом',first:'Фрагменты в обмен на железо. По рукам?',hurt:'Почини корабль, больно смотреть.',idle:['...']}}
function pdTints(){return PD.tints||[{n:'РОДНОЙ',d:0}]}
function pdTut(){return PD.tut||[]}
function combatTargets(){for(var i=0;i<G.enemies.length;i++)if(!G.enemies[i].dead)return true;
if(G.cap&&G.cap.cargo&&!G.cap.cargo.dead)return true;return false}
function mapSpan(){return (G.endless||CHEAT.fullmap)?(G.map?G.map.length+3:MAX_WAVE):MAX_WAVE}
function capImg(){var s=window.PULSAR_CAP_SPRITE;if(!s)return null;if(typeof s==='string'){var im=new Image();im.src=s;window.PULSAR_CAP_SPRITE=im;return null}return s.complete&&s.naturalWidth?s:null}
function hsl2rgb(h,s,l){function f(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<.5)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p}
if(s===0)return[l*255,l*255,l*255];var q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;return[f(p,q,h+1/3)*255,f(p,q,h)*255,f(p,q,h-1/3)*255]}
function shiftHueCanvas(src,deg){var c=mkC(src.width,src.height),g=c.getContext('2d');g.drawImage(src,0,0);
var d=g.getImageData(0,0,c.width,c.height),p=d.data;
for(var i=0;i<p.length;i+=4){if(p[i+3]<8)continue;
var r=p[i]/255,gg=p[i+1]/255,b=p[i+2]/255,mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),l=(mx+mn)/2,s=0,h=0;
if(mx!==mn){var dd=mx-mn;s=l>.5?dd/(2-mx-mn):dd/(mx+mn);h=mx===r?((gg-b)/dd+(gg<b?6:0)):mx===gg?((b-r)/dd+2):((r-gg)/dd+4);h/=6}
if(s<.14)continue;h=(h+deg/360)%1;if(h<0)h+=1;var rgb=hsl2rgb(h,s,l);p[i]=rgb[0];p[i+1]=rgb[1];p[i+2]=rgb[2]}
g.putImageData(d,0,0);return c}
function shiftHex(hex,deg){var r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
var mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,s=0,h=0;
if(mx!==mn){var d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4);h/=6}
h=(h+deg/360)%1;if(h<0)h+=1;var q=hsl2rgb(h,s,l);
function hx(v){v=Math.round(clamp(v,0,255)).toString(16);return v.length<2?'0'+v:v}
return '#'+hx(q[0])+hx(q[1])+hx(q[2])}
var TINTC={};
function tintedSpr(ship,idx,deg){var key=ship+'|'+idx+'|'+deg;if(TINTC[key])return TINTC[key];
var base=(SPR.ships[ship]||SPR.ships.std)[idx?1:0];var n=shiftHueCanvas(base.n,deg);
var o={n:n,f:tint(n,'#fff'),w:n.width,h:n.height};TINTC[key]=o;return o}
function tintDeg(p){var mm=metaOf(p),t=pdTints()[mm.tint||0];return t?t.d:0}
function playerSprT(p){var d=tintDeg(p);return d?tintedSpr(p.ship,p.id,d):playerSpr(p)}
function applyTint(p){var d=tintDeg(p),mm=metaOf(p);p.tintIdx=mm.tint||0;
p.col=d?shiftHex(p.id?'#4d8cff':'#ffb020',d):(p.id?'#4d8cff':'#ffb020');
p.light=d?shiftHex(p.id?'#b8d4ff':'#fff0cf',d):(p.id?'#b8d4ff':'#fff0cf')}
function lockedModPool(){var mm=META,out=[];LOCKED.forEach(function(k){if(mm.unlocked.indexOf(k)<0&&mm.bp.indexOf(k)<0)out.push(k)});return out}
function sanitizeBp(dr){if(dr.type!=='bp')return;
if(dr.bp==='ship:monster')dr.bp=null;else if(dr.bp&&dr.bp.indexOf('ship:')===0)dr.bp=null;
if(dr.bp===null){var pool=lockedModPool();if(pool.length)dr.bp=pick(pool);else{dr.type='frag';delete dr.bp}}}
function monsterBodyV2(main,light){var w=58,h=28,c=mkC(w,h),g=c.getContext('2d'),x,y;
for(x=0;x<w;x++){var hh;if(x<21)hh=12.5;else if(x<44)hh=13;else hh=13*Math.sqrt(Math.max(0,1-Math.pow((x-44)/14,2)));
for(y=0;y<h;y++){var d=Math.abs(y-13.5);if(d>hh)continue;g.fillStyle=d>hh-1.5?PAL.o:(d>hh*.52?main:light);g.fillRect(x,y,1,1)}}
g.fillStyle=light;for(var i=0;i<34;i++)g.fillRect(4+i,13+Math.round(Math.sin(i*.45)),2,2);
g.fillStyle=PAL.o;for(var s=0;s<7;s++){var sx=6+s*7;for(y=1;y<27;y++)if(Math.abs(y-13.5)<(sx<21?11:12))g.fillRect(sx,y,1,1)}
g.fillStyle=main;for(s=0;s<7;s++){var sx2=7+s*7;for(y=2;y<26;y++)if(Math.abs(y-13.5)<10)g.fillRect(sx2,y,1,1)}
g.fillStyle=PAL.o;g.fillRect(36,8,13,12);g.fillStyle='#8f2020';g.fillRect(37,9,11,10);g.fillStyle='#ff4d4d';g.fillRect(38,10,9,8);g.fillStyle='#ff9f9f';g.fillRect(39,11,7,6);g.fillStyle='#fff';g.fillRect(41,12,3,3);
g.fillStyle='#ffd76a';[[31,4],[31,22],[25,3],[25,23],[19,4],[19,22],[12,5],[12,21]].forEach(function(p){g.fillRect(p[0],p[1],2,2)});
g.fillStyle=PAL.o;g.fillRect(50,11,7,6);g.fillStyle='#ff4d4d';g.fillRect(51,12,5,4);g.fillStyle='#fff';for(var t=0;t<4;t++)g.fillRect(51+t,12,1,1);
g.fillStyle=PAL.o;for(y=3;y<25;y++)g.fillRect(0,y,1,1);
return{n:c,f:tint(c,'#fff'),w:w,h:h}}
function refreshMonsterSprites(){SPR.ships.monster=[monsterBodyV2('#ffb020','#fff0cf'),monsterBodyV2('#4d8cff','#b8d4ff')];SPR.darkShips.monster=monsterBodyV2('#1a0f30','#5a3a9a');TINTC={}}
function buildCapSprite(){var w=260,h=84,c=mkC(w,h),g=c.getContext('2d'),cy=42,x,y,i;
function half(x){if(x<16)return 25;if(x<38)return 31;if(x<198)return 35;if(x<232)return 35-(x-198)*.5;return Math.max(3,18-(x-232)*.62)}
for(x=0;x<w;x++){var hh=half(x);for(y=0;y<h;y++){var d=Math.abs(y-cy);if(d>hh)continue;
g.fillStyle=d>hh-2?PAL.o:(d>hh*.72?'#2b2b3a':(d>hh*.34?'#4c4c5e':'#767689'));g.fillRect(x,y,1,1)}}
g.fillStyle='#8b8b9e';for(x=18;x<224;x++)g.fillRect(x,cy-3,1,2);
g.fillStyle='#5e5e70';for(x=18;x<224;x++)g.fillRect(x,cy+14,1,1);
g.fillStyle=PAL.o;[46,86,126,166,204].forEach(function(sx){var h2=half(sx);for(y=Math.round(cy-h2+2);y<cy+h2-2;y++)g.fillRect(sx,y,1,1)});
g.fillStyle='#8f2020';for(x=5;x<40;x++){var h3=half(x);for(y=Math.round(cy-h3+3);y<cy+h3-3;y++)if((x+y)%9<3)g.fillRect(x,y,1,1)}
g.fillStyle='#150a2e';g.fillRect(62,cy-19,124,38);
for(var bx=67;bx<182;bx+=13)for(var by=cy-14;by<cy+13;by+=10){g.fillStyle='#4d8cff';g.fillRect(bx,by,9,6);g.fillStyle='#b8fbff';g.fillRect(bx,by,9,2)}
g.fillStyle=PAL.o;g.fillRect(122,cy-50,62,26);g.fillStyle='#4c4c5e';g.fillRect(124,cy-48,58,22);
g.fillStyle='#767689';g.fillRect(124,cy-48,58,5);g.fillStyle='#5e5e70';g.fillRect(124,cy-32,58,4);
g.fillStyle='#ff2fb0';g.fillRect(130,cy-42,46,8);g.fillStyle='#ffd6f2';g.fillRect(130,cy-42,46,2);
g.fillStyle=PAL.o;g.fillRect(150,cy-62,4,14);g.fillStyle='#ffb020';g.fillRect(149,cy-65,6,4);
g.fillStyle=PAL.o;g.fillRect(100,cy-40,16,10);g.fillStyle='#3a3a4a';g.fillRect(101,cy-39,14,8);
g.fillStyle='#22e6ff';g.fillRect(103,cy-37,10,3);
g.fillStyle='#3a3a4a';g.fillRect(74,cy+25,44,10);g.fillRect(146,cy+25,44,10);
g.fillStyle=PAL.o;g.fillRect(80,cy+30,32,4);g.fillRect(152,cy+30,32,4);
g.fillStyle='#150a2e';g.fillRect(196,cy+8,30,16);g.fillStyle='#ffb020';g.fillRect(198,cy+10,26,3);
g.fillStyle='#22e6ff';for(i=0;i<5;i++)g.fillRect(199+i*5,cy+16,3,5);
for(var e=0;e<4;e++){var ey=cy-24+e*16;g.fillStyle=PAL.o;g.fillRect(0,ey-7,13,14);
g.fillStyle='#1e4f8f';g.fillRect(1,ey-6,11,12);g.fillStyle='#22e6ff';g.fillRect(2,ey-5,9,10);g.fillStyle='#d8fbff';g.fillRect(2,ey-3,6,6)}
g.fillStyle=PAL.o;g.fillRect(232,cy-9,22,18);g.fillStyle='#ff4d4d';g.fillRect(234,cy-7,18,14);
g.fillStyle='#ffd9d9';g.fillRect(237,cy-3,12,6);
g.fillStyle='#ffb020';for(x=28;x<226;x+=16)g.fillRect(x,Math.round(cy-half(x)+2),5,2);
g.fillStyle='#9dff3c';g.fillRect(192,cy-3,5,5);g.fillRect(40,cy-3,5,5);
g.fillStyle='#6b6a8a';for(i=0;i<6;i++)g.fillRect(50+i*30,cy+half(50+i*30)-6,8,3);
return{n:c,f:tint(c,'#fff'),w:w,h:h}}
function capSprite(){if(!SPR.capBig)SPR.capBig=buildCapSprite();return SPR.capBig}
function capHitTest(x,y,pad){var c=G.cap;if(!c||c.kind!=='rescue'||c.dead)return false;
var rx=c.w*.42+(pad||0),ry=c.h*.44+(pad||0),dx=(x-c.x)/rx,dy=(y-c.y)/ry;return dx*dx+dy*dy<1}
var MER={buf:null,t:0,eye:{x:0,y:0},tx:0,ty:0,blink:0,nextBlink:3,say:'',shown:0,hold:0,idle:6,last:-1,hurtSaid:false,sigh:0,nextSigh:9,mx:-1,my:-1};
function merchBuf(){if(!MER.buf)MER.buf=mkC(120,140);return MER.buf}
function merchSay(txt,force){if(!txt)return;if(MER.say&&!force)return;MER.say=txt;MER.shown=0;MER.hold=0;var el=$('#merchSay');if(el)el.innerHTML=''}
function merchPickIdle(){var L=pdMerch().idle||['...'],i,guard=0;do{i=randi(0,L.length-1)}while(i===MER.last&&L.length>1&&guard++<8);MER.last=i;return L[i]}
function merchOpen(){var m=pdMerch();$('#merchName').textContent=m.name;$('#merchSub').textContent=m.sub;
MER.say='';MER.shown=0;MER.hold=0;MER.hurtSaid=false;MER.idle=7;MER.last=-1;
if(!storeGet('merchMet',false)){storeSet('merchMet',true);merchSay(m.first,true);MER.idle=13}
else{var p=localPlayer();if(p.hp>0&&p.hp/p.max<.5){merchSay(m.hurt,true);MER.hurtSaid=true;MER.idle=11}else merchSay(merchPickIdle(),true)}}
function merchTargetPoint(){var cvv=$('#merchCv');if(!cvv)return null;var r=cvv.getBoundingClientRect();if(!r.width)return null;
var sel=document.querySelector('#sShop .padsel');
if(sel){var b=sel.getBoundingClientRect();return{x:(b.left+b.width/2-r.left)/r.width*120,y:(b.top+b.height/2-r.top)/r.height*140}}
if(MER.mx>=0)return{x:(MER.mx-r.left)/r.width*120,y:(MER.my-r.top)/r.height*140};
return null}
function merchUpdate(dt){MER.t+=dt;
var tg=merchTargetPoint(),gx=60,gy=42;
if(tg){var dx=tg.x-gx,dy=tg.y-gy,d=hyp(dx,dy)||1;MER.tx=clamp(dx/d,-1,1);MER.ty=clamp(dy/d,-1,1)}
else{MER.tx=Math.sin(MER.t*.5)*.5;MER.ty=Math.cos(MER.t*.37)*.3}
MER.eye.x+=(MER.tx-MER.eye.x)*Math.min(1,dt*7);MER.eye.y+=(MER.ty-MER.eye.y)*Math.min(1,dt*7);
MER.nextBlink-=dt;if(MER.nextBlink<=0){MER.blink=.16;MER.nextBlink=rand(3.5,7)}
if(MER.blink>0)MER.blink-=dt;
MER.nextSigh-=dt;if(MER.nextSigh<=0){MER.sigh=1.2;MER.nextSigh=rand(9,17)}
if(MER.sigh>0)MER.sigh-=dt;
var el=$('#merchSay');
if(MER.say){var n=MER.say.length;
if(MER.shown<n){MER.shown=Math.min(n,MER.shown+dt*34);if(el)el.innerHTML=MER.say.slice(0,Math.floor(MER.shown)).replace(/\n/g,'<br>')+'<i>▌</i>'}
else{MER.hold+=dt;if(el)el.innerHTML=MER.say.replace(/\n/g,'<br>');if(MER.hold>6.5){MER.say='';if(el)el.innerHTML='';MER.idle=rand(5,9)}}}
else{MER.idle-=dt;if(MER.idle<=0){var p=localPlayer();
if(!MER.hurtSaid&&p.hp>0&&p.hp/p.max<.5){merchSay(pdMerch().hurt,true);MER.hurtSaid=true}else merchSay(merchPickIdle(),true);
MER.idle=rand(10,16)}}}
function drawMerchant(){var cvv=$('#merchCv');if(!cvv)return;var g=merchBuf().getContext('2d'),t=MER.t,i;
g.clearRect(0,0,120,140);
g.fillStyle='#0d0620';g.fillRect(0,0,120,140);
g.fillStyle='#160b30';g.fillRect(0,0,120,106);
g.fillStyle='#1d1040';for(i=0;i<7;i++)g.fillRect(0,i*15,120,1);
g.fillStyle='#241452';g.fillRect(4,8,112,4);
g.fillStyle='#0a0518';g.fillRect(4,12,112,2);
var junk=[[8,2,'#4a2a8f'],[18,3,'#2f6b3f'],[27,2,'#8f5a10'],[36,4,'#241452'],[48,2,'#4a2a8f'],[57,3,'#2f6b3f'],[68,2,'#8f2020'],[78,4,'#241452'],[90,3,'#4a2a8f'],[101,2,'#2f6b3f']];
junk.forEach(function(j,k){var bob=Math.sin(t*.6+k)*.4;g.fillStyle=j[2];g.fillRect(j[0],Math.round(8-j[1]*2+bob),6,j[1]*2);
g.fillStyle='#0a0518';g.fillRect(j[0],Math.round(8-j[1]*2+bob),6,1);
if(k%3===0){g.fillStyle=k%2?'#22e6ff':'#9dff3c';g.globalAlpha=.5+.5*Math.sin(t*3+k);g.fillRect(j[0]+2,Math.round(6-j[1]*2+bob),2,1);g.globalAlpha=1}});
var sway=Math.sin(t*.9)*2.5;
g.strokeStyle='#3a2a6a';g.lineWidth=1;g.beginPath();g.moveTo(104,0);g.quadraticCurveTo(104+sway,14,101+sway,24);g.stroke();
g.fillStyle='#8f5a10';g.fillRect(Math.round(99+sway),24,5,4);
var lamp=.55+.45*Math.sin(t*2.3);
g.fillStyle='#ffd76a';g.globalAlpha=lamp;g.fillRect(Math.round(99+sway),28,5,3);
g.globalAlpha=.14*lamp;g.beginPath();g.arc(101+sway,30,16,0,TAU);g.fill();g.globalAlpha=1;
var breath=Math.sin(t*1.1)*1,sigh=MER.sigh>0?Math.sin((1.2-MER.sigh)/1.2*Math.PI)*2:0,by=Math.round(breath+sigh);
var talking=MER.say&&MER.shown<MER.say.length,talk=talking?Math.sin(t*15):0;
var tilt=Math.sin(t*.45)*.6+(talking?Math.sin(t*7)*.5:0);
g.fillStyle='#24512f';g.fillRect(36,90+by,48,18);
g.fillStyle='#2f6b3f';g.fillRect(38,92+by,44,16);
g.fillStyle='#3f8a4f';g.fillRect(40,93+by,40,5);
g.fillStyle='#24512f';g.fillRect(30,94+by,8,16);g.fillRect(82,94+by,8,16);
g.fillStyle='#2f6b3f';g.fillRect(31,96+by,6,14);g.fillRect(83,96+by,6,14);
g.fillStyle='#4f9a5a';g.fillRect(26,102+by,12,6);g.fillRect(82,102+by,12,6);
g.fillStyle='#24512f';g.fillRect(26,106+by,12,2);g.fillRect(82,106+by,12,2);
g.fillStyle='#7fd68a';g.fillRect(28,103+by,3,2);g.fillRect(89,103+by,3,2);
g.fillStyle='#24512f';g.fillRect(54,60+by,12,36);
g.fillStyle='#2f6b3f';g.fillRect(55,60+by,10,36);
g.fillStyle='#4f9a5a';g.fillRect(56,60+by,3,36);
var gill=MER.sigh>0?2:1;
g.fillStyle='#1c3d24';for(i=0;i<3;i++)g.fillRect(56,70+by+i*7,8,gill);
if(MER.sigh>.55){g.fillStyle='rgba(154,214,180,.45)';for(i=0;i<3;i++)g.fillRect(66+i*4,72+by-i*3,2,2)}
var hx=60+tilt,hy=40+by;
g.fillStyle='#1c3d24';g.beginPath();g.ellipse(hx,hy,20,26,0,0,TAU);g.fill();
g.fillStyle='#2f6b3f';g.beginPath();g.ellipse(hx,hy,18,24,0,0,TAU);g.fill();
g.fillStyle='#4f9a5a';g.beginPath();g.ellipse(hx,hy-6,15,17,0,0,TAU);g.fill();
g.fillStyle='#7fd68a';g.beginPath();g.ellipse(hx-4,hy-12,7,9,0,0,TAU);g.fill();
g.fillStyle='#24512f';g.beginPath();g.ellipse(hx,hy+16,14,8,0,0,TAU);g.fill();
g.fillStyle='#1c3d24';g.fillRect(Math.round(hx-13),Math.round(hy-19),9,2);g.fillRect(Math.round(hx+5),Math.round(hy-19),9,2);
g.fillRect(Math.round(hx-11),Math.round(hy-15),6,1);g.fillRect(Math.round(hx+6),Math.round(hy-15),6,1);
g.fillStyle='#24512f';g.fillRect(Math.round(hx-1),Math.round(hy-32),3,8);
var aw=Math.sin(t*1.7)*3;
g.fillStyle='#2f6b3f';g.fillRect(Math.round(hx+aw),Math.round(hy-38),2,8);
g.fillStyle='#9dff3c';g.fillRect(Math.round(hx-1+aw),Math.round(hy-40),4,4);
g.globalAlpha=.4+.3*Math.sin(t*3);g.fillStyle='#9dff3c';g.beginPath();g.arc(hx+1+aw,hy-38,5,0,TAU);g.fill();g.globalAlpha=1;
var ex=hx,ey=hy+3,er=13;
g.fillStyle='#1c3d24';g.beginPath();g.arc(ex,ey,er+2,0,TAU);g.fill();
g.fillStyle='#e8e2d0';g.beginPath();g.arc(ex,ey,er,0,TAU);g.fill();
g.fillStyle='#c9b8a0';g.beginPath();g.arc(ex,ey+4,er-2,.2,Math.PI-.2);g.fill();
var px=ex+MER.eye.x*4.5,py=ey+MER.eye.y*3.5,ir=6+(talking?talk*.7:0);
g.fillStyle='#8f5a10';g.beginPath();g.arc(px,py,ir+1.5,0,TAU);g.fill();
g.fillStyle='#ffb020';g.beginPath();g.arc(px,py,ir,0,TAU);g.fill();
g.fillStyle='#150a2e';g.beginPath();g.arc(px,py,3+(talking?talk*.4:0),0,TAU);g.fill();
g.fillStyle='#fff';g.fillRect(Math.round(px-3),Math.round(py-3),2,2);
var lid=MER.blink>0?1:.38+Math.sin(t*.7)*.04+(MER.sigh>0?.12:0)+(talking?Math.max(0,talk)*.06:0);
g.fillStyle='#2f6b3f';g.beginPath();g.arc(ex,ey,er+1,Math.PI,TAU);g.lineTo(ex+er+1,ey-er+(er*2)*lid);g.lineTo(ex-er-1,ey-er+(er*2)*lid);g.closePath();g.fill();
g.fillStyle='#1c3d24';g.fillRect(Math.round(ex-er-1),Math.round(ey-er+(er*2)*lid),er*2+2,2);
g.fillStyle='#5c3a6b';g.beginPath();g.arc(ex,ey+er-2,er-3,.25,Math.PI-.25);g.fill();
g.fillStyle='#43284f';g.fillRect(Math.round(ex-9),Math.round(ey+er+1),18,2);
g.fillStyle='#0a0518';g.fillRect(0,104,120,4);
g.fillStyle='#3a2a6a';g.fillRect(0,108,120,32);
g.fillStyle='#4a3580';g.fillRect(0,108,120,3);
g.fillStyle='#241452';g.fillRect(0,124,120,16);
g.fillStyle='#22e6ff';g.globalAlpha=.35+.25*Math.sin(t*2);g.fillRect(0,111,120,1);g.globalAlpha=1;
for(i=0;i<10;i++){g.fillStyle='#1d1040';g.fillRect(4+i*12,128,8,8);g.fillStyle=i%3===0?'#9dff3c':(i%3===1?'#ffb020':'#4a2a8f');
g.globalAlpha=.4+.6*Math.abs(Math.sin(t*2+i));g.fillRect(6+i*12,130,4,2);g.globalAlpha=1}
g.fillStyle='#0a0518';g.fillRect(6,86,26,20);g.fillStyle='#241452';g.fillRect(7,87,24,18);
g.fillStyle='#0d2a3a';g.fillRect(9,89,20,12);
g.fillStyle='#22e6ff';for(i=0;i<4;i++){var lw=6+Math.abs(Math.sin(t*3+i*1.7))*12;g.globalAlpha=.7;g.fillRect(10,91+i*3,Math.round(lw),1);g.globalAlpha=1}
g.fillStyle='#4a2a8f';g.fillRect(9,102,20,2);
g.fillStyle='#0a0518';g.fillRect(92,88,22,18);g.fillStyle='#8f5a10';g.fillRect(93,89,20,16);
g.fillStyle='#6b4300';g.fillRect(93,95,20,2);g.fillRect(101,89,2,16);
g.fillStyle='#ffb020';g.fillRect(95,91,4,2);g.fillRect(105,99,4,2);
g.fillStyle='#0a0518';g.fillRect(96,80,14,9);g.fillStyle='#4a2a8f';g.fillRect(97,81,12,7);
g.fillStyle='#22e6ff';g.globalAlpha=.6;g.fillRect(99,83,8,2);g.globalAlpha=1;
g.fillStyle='#3a2a6a';g.fillRect(42,100,10,6);g.fillStyle='#22e6ff';g.globalAlpha=.5+.5*Math.sin(t*4);g.fillRect(44,102,6,2);g.globalAlpha=1;
g.fillStyle='#6b6a8a';g.fillRect(66,101,7,5);g.fillStyle='#8f2020';g.fillRect(67,100,5,2);
g.strokeStyle='#4a2a8f';g.lineWidth=1;g.beginPath();g.moveTo(34,104);g.quadraticCurveTo(46,98,58,104);g.stroke();
g.strokeStyle='#2f6b3f';g.beginPath();g.moveTo(76,104);g.quadraticCurveTo(84,99,92,104);g.stroke();
var out=cvv.getContext('2d');out.imageSmoothingEnabled=false;out.clearRect(0,0,cvv.width,cvv.height);out.drawImage(MER.buf,0,0,cvv.width,cvv.height)}
var TUT={done:storeGet('tut',{}),cur:null,life:0};
function tutShow(k){if(TUT.done[k])return;var list=pdTut(),d=null;for(var i=0;i<list.length;i++)if(list[i].k===k)d=list[i];if(!d)return;
TUT.done[k]=1;storeSet('tut',TUT.done);TUT.cur=isTouch?(d.m||d.t):d.t;TUT.life=6.5;
var el=$('#tutor');if(el){el.querySelector('span').textContent=TUT.cur;el.classList.add('on')}}
function tutTick(dt){if(TUT.life>0){TUT.life-=dt;if(TUT.life<=0){var el=$('#tutor');if(el)el.classList.remove('on')}}}
function tutReset(){TUT.done={};storeSet('tut',TUT.done);TUT.life=0;var el=$('#tutor');if(el)el.classList.remove('on')}
function computeStats(L,ship,mm){var o={};ship=ship||'std';mm=mm||META;o.ship=ship;
o.rate=4.6*Math.pow(1.18,L.rate||0)*Math.pow(1.14,L.kir||0)*(1+.05*(mm.perm.rate||0));
o.dmg=10*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));o.count=1+(L.fan||0);
o.spread=.11*(L.fan||0)+.03;o.pierce=L.pierce||0;
o.speed=74*Math.pow(1.13,L.speed||0)*(1+.04*(mm.perm.spd||0));
var dl=L.dash||0;o.dashCd=(dl>=4?0:.91*Math.pow(.7,dl))*Math.pow(.94,mm.perm.dash||0);o.dashDmg=18+9*dl;
o.magnet=34*Math.pow(1.7,L.magnet||0);o.vamp=.04*(L.vamp||0);o.regen=1.6*(L.regen||0);o.drones=L.drone||0;o.bs=200*Math.pow(1.18,L.kir||0);
o.shieldMax=25*(L.shield||0)+10*(mm.perm.shield||0);o.shieldRegen=6+2*(L.shield||0);
o.healDrone=L.healdrone||0;o.healRate=.7*o.healDrone*(1+o.healDrone*.3);
var hl=L.hyper||0;o.hyper=hl;o.hyperDmg=hl?50+(hl-1)*25:0;o.hyperCd=hl?5-(hl-1):0;o.hyperGold=!!L.hyperGold;
var sl=L.socio||0;o.socio=sl;o.socioDps=10*sl;o.socioSpinDps=120*sl;
var al=L.aegis||0;o.aegis=al;o.aegisN=al?2+al:0;o.aegisR=24+2*Math.max(0,al-1);o.aegisDmg=12+7*Math.max(0,al-1);
var se=L.seeder||0;o.seeder=se;o.seedN=se?2+se+(ship==='bomber'?2:0):0;o.seedDmg=se?55+15*(se-1):0;o.seedRad=(34+2*Math.max(0,se-1))*(ship==='bomber'?1.25:1);
var ph=L.phase||0;o.phase=ph;o.phLife=ph?1+.4*(ph-1):0;o.phMul=ph?.4+.15*(ph-1):0;if(ph)o.dashCd*=1.15;
var te=L.tesla||0;o.tesla=te;o.teslaR=te?58+8*(te-1):0;o.teslaDps=te?(9+5*(te-1))*(1+.5*(Math.pow(1.25,L.cal||0)-1)):0;o.teslaSlow=te?1-(.2+.06*(te-1)):1;
var sE=L.scytheEdge||0,pD=L.phaseDrive||0,sC=L.swarmCore||0,sCh=L.stormChain||0,fn=L.foundry||0,cC=L.chronoCore||0;
o.droneMul=.85;o.droneCd=.5;o.dronePierce=0;o.dashSpeedMul=1;o.invisBoost=2;o.maxTurrets=3;o.turretLife=14;
function wcalc(wp,wl){if(wp==='rocket')return{cd:wl>=3?3.5:5,dmg:(L.hydra?.6:1)*(50+(wl-1)*50)};
if(wp==='wave')return{cd:5,dmg:L.density?460:[45,70,115][wl-1]||45,rad:L.density?150:100};
if(wp==='beam')return{cd:7,dmg:40+(wl-1)*30,dur:3};return{cd:0,dmg:0}}
o.wstat={wave:wcalc('wave',L.wave||0),beam:wcalc('beam',L.beam||0),rocket:wcalc('rocket',L.rocket||0)};
o.weapons=[];if(ship==='monster')['wave','beam','rocket'].forEach(function(w){if((L[w]||0)>0)o.weapons.push(w)});
var wp=L.weapon,wl=wp?(L[wp]||0):0;o.weapon=wp;o.weaponLvl=wl;var wc=wcalc(wp,wl);
o.weaponCdMax=wc.cd;o.weaponDmg=wc.dmg;o.weaponRadius=wc.rad||100;o.beamDur=wc.dur||3;
o.hydra=!!L.hydra;o.density=!!L.density;o.reflect=!!L.reflect;
o.fireMode='bullet';o.bulletLife=1.2;o.hpMod=0;o.coneDps=0;o.scytheDmg=0;o.coneR=0;o.coneHalf=.61;o.scytheR=46;o.scytheHalf=1.05;o.bleedDps=0;o.zapStun=.05;o.electroLvl=0;o.electroDps=0;
if(ship==='sniper'){o.speed*=1.4;o.dashCd*=1.5;o.fireMode='sniper';o.rate/=3.5;o.dmg=35*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));o.pierce=Math.max(2,o.pierce);o.bulletLife=1.6;o.count=1;o.bs*=7}
else if(ship==='bomber'){o.fireMode='rocket';o.rate/=3;o.dmg=30*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));o.dashCd*=1.2}
else if(ship==='psy'){o.fireMode='shotgun';o.speed*=2;o.dashCd*=.5;o.count=Math.max(6,o.count+5);o.spread=.16;o.bulletLife=.34;o.dmg*=.6}
else if(ship==='phantom'){o.speed*=1.25;o.dmg*=.8;o.hpMod=-10;o.invisDash=1.2+.3*pD;o.dashSpeedMul=1+.35*pD;o.invisBoost=2+.4*pD}
else if(ship==='forge'){o.rate*=.5;o.hpMod=30;o.turretDash=true;o.maxTurrets=3+fn;o.turretLife=14+2*fn}
else if(ship==='reaper'){o.fireMode='scythe';o.rate=1.8;o.scytheDmg=22*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));o.scytheR=46+12*sE;o.scytheHalf=1.05+.15*sE;o.bleedDps=o.scytheDmg*.28;o.vamp=Math.max(o.vamp,.08);o.hpMod=40;o.speed*=.85;o.count=1}
else if(ship==='chronos'){o.weapon='chrono';o.chronoCd=12-2.5*cC;o.weaponCdMax=o.chronoCd;o.weaponDmg=0;o.chronoDur=2.5+.25*cC;o.chronoGlobal=cC>=3;o.chronoR=o.chronoGlobal?0:150+35*cC}
else if(ship==='legion'){o.dmg*=.65;o.hpMod=-15;o.droneMul=1;o.droneCd=.45;o.dronePierce=1;o.drones=Math.min(5,(L.drone||0)+sC)}
else if(ship==='groza'){o.fireMode='cone';o.coneDps=26*(1+.5*(Math.pow(1.25,L.cal||0)-1))*(1+.06*(mm.perm.dmg||0));o.coneR=95+12*sCh;o.coneHalf=.61+.08*sCh;o.speed*=1.1;o.count=0;o.zapStun=.05+.02*sCh;o.electroLvl=sCh;o.electroDps=sCh?8+4*sCh:0}
else if(ship==='monster'){o.fireMode='dual';o.dashSpeedMul=1.6;o.dashDmg*=2;o.hpMod=95}
o.teslaElectro=0;if(o.tesla){o.teslaElectro=Math.max(o.electroLvl,ship==='groza'?1:0);if(o.teslaElectro&&!o.electroDps)o.electroDps=8+4*o.teslaElectro}
if(CHEAT.god){o.dmg=1000;o.weaponDmg=1000;o.dashDmg=1000;o.hyperDmg=1000;o.socioDps=1000;o.socioSpinDps=1000;o.coneDps=1000;o.scytheDmg=1000;o.teslaDps=1000}
return o}
function renderMods(){var m=$('#mods');m.innerHTML='';var L=viewPlayer().lvl;UPS.forEach(function(u){var l=L[u.k]||0;if(!l)return;var ic=iconCanvas(u.k,u.col,2);ic.style.width='20px';ic.style.height='20px';ic.title=(u.k==='socio'&&viewPlayer().ship==='psy'?'БЕНЗОПИЛЫ':u.n)+' ур.'+l;m.appendChild(ic)})}
function recalcPlayer(p){p.stats=computeStats(p.lvl,p.ship,metaOf(p));p.r=p.ship==='monster'?12:5;applyTint(p);
p.max=Math.max(30,D.base+25*(p.lvl.armor||0)+15*(metaOf(p).perm.hp||0)+(p.stats.hpMod||0));
p.shield=Math.min(p.shield,p.stats.shieldMax);while(p.dT.length<p.stats.drones)p.dT.push(rand(0,.6));p.dT.length=p.stats.drones;
if(p.wsel>=p.stats.weapons.length)p.wsel=0;if(p===viewPlayer())renderMods()}
function recalc(){for(var i=0;i<PL.length;i++)recalcPlayer(PL[i])}
function autoAim(p){var t=nearestEnemy(p.x,p.y);return t?Math.atan2(t.y-p.y,t.x-p.x):p.aim}
function aimPoint(p){if(!isTouch&&G.t-mouseT<4&&(GP.raw==null||!GP.raw.connected)&&p.id===0)return screenToWorld(mx,my);
var t=nearestEnemy(p.x,p.y);if(t)return{x:t.x,y:t.y};
if(G.cap&&G.cap.cargo&&!G.cap.cargo.dead)return{x:G.cap.cargo.x,y:G.cap.cargo.y};
return{x:p.x+Math.cos(p.aim)*200,y:p.y+Math.sin(p.aim)*200}}
function readInput(p,dev){var pad=dev===1?GP:GP2,o={mx:0,my:0,aim:p.aim,dash:false,weapon:false,cycle:false,held:false,focus:false},liD=false,liW=false,liC=false;
if(dev===1){liD=LI.dash;liW=LI.weapon;liC=LI.cycle;LI.dash=false;LI.weapon=false;LI.cycle=false}
if(pad.active){var mv=padMove(pad);o.mx=mv.x;o.my=mv.y;o.aim=pad.aimActive?pad.aim:autoAim(p);o.dash=pad.dash||liD;o.weapon=pad.weapon||liW;o.cycle=pad.cycle||liC;o.held=pad.dashHeld||(dev===1&&dashHeld);
if(dev===1&&sticks.move.m>.14){o.mx=sticks.move.dx;o.my=sticks.move.dy}if(dev===1&&sticks.aim.m>.2)o.aim=Math.atan2(sticks.aim.dy,sticks.aim.dx);return o}
if(dev===1){var x=0,y=0;if(keys.KeyA)x-=1;if(keys.KeyD)x+=1;if(keys.KeyW)y-=1;if(keys.KeyS)y+=1;
if(!isLocal()){if(keys.ArrowLeft)x-=1;if(keys.ArrowRight)x+=1;if(keys.ArrowUp)y-=1;if(keys.ArrowDown)y+=1}
if(sticks.move.m>.14){x+=sticks.move.dx;y+=sticks.move.dy}var l=hyp(x,y);if(l>1){x/=l;y/=l}o.mx=x;o.my=y;o.focus=!!(keys.ShiftLeft||keys.ShiftRight);
if(sticks.aim.m>.2)o.aim=Math.atan2(sticks.aim.dy,sticks.aim.dx);else if(!isTouch&&G.t-mouseT<4){var w=screenToWorld(mx,my);o.aim=Math.atan2(w.y-p.y,w.x-p.x)}else o.aim=autoAim(p);
o.dash=liD;o.weapon=liW;o.cycle=liC;o.held=dashHeld;return o}
var x2=0,y2=0;if(keys.ArrowLeft)x2-=1;if(keys.ArrowRight)x2+=1;if(keys.ArrowUp)y2-=1;if(keys.ArrowDown)y2+=1;var l2=hyp(x2,y2);if(l2>1){x2/=l2;y2/=l2}
o.mx=x2;o.my=y2;o.aim=autoAim(p);o.dash=K2.dash;o.weapon=K2.weapon;o.cycle=K2.cycle;o.held=!!keys.Enter;K2.dash=false;K2.weapon=false;K2.cycle=false;return o}
function feedInput(p,dev){var ri=readInput(p,dev);ri.dash=ri.dash||p.input.dash;ri.weapon=ri.weapon||p.input.weapon;ri.cycle=ri.cycle||p.input.cycle;p.input=ri;return ri}
function nearestEnemy(x,y){var b=null,bd=1e9;for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;var d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;b=e}}return b}
function nearestEnemyExcluding(x,y,hit){var b=null,bd=1e9;for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||hit.indexOf(e.id)>=0)continue;var d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;b=e}}return b}
function triggerHyper(p){var st=p.stats;if(!st.hyper||p.hyperCd>0||p.jammed)return;p.hyperCd=st.hyperCd;p.dashHold=0;p.socioSpin=1.16;var hit=[],cnt=st.hyperGold?3:1;
for(var c=0;c<cnt;c++){var e=nearestEnemyExcluding(p.x,p.y,hit);if(!e)break;hit.push(e.id);G.ghost.push({x:p.x,y:p.y,a:p.aim,l:.3,m:.3,col:p.col,ship:p.ship,id:p.id,tint:p.tintIdx});
p.x=clamp(e.x,AR.x+p.r,AR.x+AR.w-p.r);p.y=clamp(e.y,AR.y+p.r,AR.y+AR.h-p.r);damageEnemy(e,st.hyperDmg,true,e.x,e.y,0,true,p);ring(e.x,e.y,4,30,'#ff2fb0',.4);part(e.x,e.y,'#ff2fb0',14,110,.4,1)}
p.inv=Math.max(p.inv,.45);A.dash();HAP.boom();shake(3)}
function updateSocio(p,dt,st){if(!st.socio)return;p.socioSpin=Math.max(0,p.socioSpin-dt);var spin=p.socioSpin>0,sp=spin?16:2.2,R=22,br=spin?8:6,base=G.t*sp,dps=spin?st.socioSpinDps:st.socioDps;
for(var b=0;b<2;b++){var a=base+b*Math.PI,bx=p.x+Math.cos(a)*R,by=p.y+Math.sin(a)*R;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.invuln||twinsShielded(e))continue;if(hyp(e.x-bx,e.y-by)<e.r*(e.sc||1)+br){e.hp-=dps*dt;e.fr=.05;if(Math.random()<.2)part(e.x,e.y,'#a86bff',1,40,.15,1);if(e.hp<=0)killEnemy(e)}}}}
function updateTesla(p,dt,st){if(!st.tesla)return;var any=false;for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.invuln||twinsShielded(e))continue;var d=hyp(e.x-p.x,e.y-p.y);if(d>st.teslaR)continue;any=true;
e.slowT=.2;e.slowMul=st.teslaSlow;e.hp-=st.teslaDps*dt;e.fr=Math.max(e.fr,.04);if(st.teslaElectro>0)applyElectro(e,8+4*st.teslaElectro,p.id,st.teslaElectro);
if(Math.random()<dt*3)part((p.x+e.x)/2+rand(-6,6),(p.y+e.y)/2+rand(-6,6),'#b8fbff',1,30,.15,1);if(e.hp<=0)killEnemy(e)}if(any){A.zap();HAP.zap()}}
function updateCone(p,dt,st){var any=false;for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.invuln||twinsShielded(e))continue;var d=hyp(e.x-p.x,e.y-p.y);if(d>st.coneR)continue;var a=Math.atan2(e.y-p.y,e.x-p.x);if(Math.abs(angDiff(p.aim,a))>st.coneHalf)continue;any=true;
e.hp-=st.coneDps*dt;e.fr=Math.max(e.fr,.04);e.zapTick-=dt;if(e.zapTick<=0){e.zapTick=.3;if(Math.random()<st.zapStun&&e.stunT<=0&&!e.boss){e.stunT=.7;A.zapStun();HAP.zap();ring(e.x,e.y,3,16,'#ffb020',.3);float(e.x,e.y-e.r-8,'СТАН','#ffb020',1)}if(st.electroLvl>0)applyElectro(e,st.electroDps,p.id,st.electroLvl)}
if(Math.random()<dt*3)part(e.x+rand(-4,4),e.y+rand(-4,4),'#b8fbff',1,45,.16,1);if(e.hp<=0)killEnemy(e)}if(any){A.zap();HAP.zap()}}
function updateAegisOrbit(p,dt,st){if(!st||!st.aegis)return;p.aegisA+=dt*(p.dashT>0?7:2.4);var tg=(p.dashT>0||p.aegisOut>0)?52:st.aegisR;p.aegisR+=(tg-p.aegisR)*Math.min(1,dt*(tg>p.aegisR?12:5));if(p.aegisOut>0)p.aegisOut-=dt;var out=p.dashT>0||p.aegisOut>0;
for(var s=0;s<st.aegisN;s++){var a=p.aegisA+s*TAU/st.aegisN,x=p.x+Math.cos(a)*p.aegisR,y=p.y+Math.sin(a)*p.aegisR;
for(var i=G.erock.length-1;i>=0;i--){var r=G.erock[i];if(hyp(r.x-x,r.y-y)<8){part(x,y,'#b8fbff',8,70,.3,1);ring(x,y,2,12,'#b8fbff',.25);A.shieldHit();G.erock.splice(i,1)}}
if(!out)continue;for(var j=0;j<G.enemies.length;j++){var e=G.enemies[j];if(e.dead||e.aegisHit===p.id+1)continue;if(hyp(e.x-x,e.y-y)<e.r*(e.sc||1)+7){e.aegisHit=p.id+1;damageEnemy(e,st.aegisDmg,true,x,y,a,true,p)}}}}
function reflectBullets(p){for(var i=G.ebul.length-1;i>=0;i--){var eb=G.ebul[i];if(hyp(eb.x-p.x,eb.y-p.y)<p.r+22){var t=nearestEnemy(p.x,p.y),a=t?Math.atan2(t.y-p.y,t.x-p.x):p.aim;fireBullet(p.x,p.y,a,240,Math.max(12,eb.dmg*1.5),1,false,p.id,1.4);part(eb.x,eb.y,'#a86bff',6,70,.25,1);G.ebul.splice(i,1);A.shieldHit()}}}
function cycleWeapon(p){var ws=p.stats.weapons;if(!ws||ws.length<2)return;p.wsel=(p.wsel+1)%ws.length;A.tone(560,.05,'square',.06,1.3,0,'ui');HAP.pick();setupTouchButtons(true)}
function updatePlayer(p,dt){if(p.hp<=0)return;var st=p.stats;if(!st)return;var inp=p.input;
p.recoil=Math.max(0,(p.recoil||0)-dt*6.5);p.bay=Math.max(0,(p.bay||0)-dt*2.2);p.idleT=(p.idleT||0)+dt;
p.stun=Math.max(0,p.stun-dt);if(p.swingT>0)p.swingT-=dt;if(p.plateT>0)p.plateT=Math.max(0,p.plateT-dt*1.6);if(p.beamT>0)p.plateT=1;
if(p.invis>0)p.invis-=dt;else{p.lastSeen.x=p.x;p.lastSeen.y=p.y;p.invisShot=false}
if(p.trapped){var w=null;for(var q=0;q<G.wells.length;q++)if(G.wells[q].id===p.trapped){w=G.wells[q];break}if(!w)p.trapped=0}
p.jammed=false;for(var j0=0;j0<G.enemies.length;j0++){var jm=G.enemies[j0];if(jm.type==='jammer'&&!jm.dead&&hyp(jm.x-p.x,jm.y-p.y)<90){p.jammed=true;break}}if(p.jammed)A.jam();
p.aim=inp.aim;p.focus=inp.focus;p.inv=Math.max(0,p.inv-dt);p.hurtT=Math.max(0,p.hurtT-dt);p.dashCd=Math.max(0,p.dashCd-dt);
if(!p.jammed){p.weaponCd=Math.max(0,p.weaponCd-dt);for(var wk in p.wcd)p.wcd[wk]=Math.max(0,p.wcd[wk]-dt)}
p.hyperCd=Math.max(0,p.hyperCd-dt);p.shieldT=Math.max(0,p.shieldT-dt);p.noHit+=dt;
if(CHEAT.god){p.hp=p.max;p.inv=Math.max(p.inv,.2);p.stun=0;p.trapped=0;p.jammed=false}
if(st.regen&&p.noHit>3)healPlayer(p,st.regen*dt);if(st.shieldMax&&p.shieldT<=0)p.shield=Math.min(st.shieldMax,p.shield+st.shieldRegen*dt);if(st.healRate)healPlayer(p,st.healRate*dt);
if(inp.cycle){inp.cycle=false;cycleWeapon(p)}
if(inp.held&&p.stun<=0&&!p.jammed)p.dashHold+=dt;else p.dashHold=0;
if(st.hyper&&p.dashHold>=1.5&&p.hyperCd<=0&&p.stun<=0&&!p.jammed)triggerHyper(p);
if(inp.dash){inp.dash=false;if(p.stun<=0&&!p.trapped)doDash(p)}
if(inp.weapon){inp.weapon=false;fireWeapon(p)}
if(p.dashT>0){p.dashT-=dt;var ds=280*(st.dashSpeedMul||1);p.vx=p.dx*ds;p.vy=p.dy*ds;G.ghost.push({x:p.x,y:p.y,a:p.aim,l:.22,m:.22,col:p.col,ship:p.ship,id:p.id,tint:p.tintIdx});
if(st.ship==='psy')reflectBullets(p);
if(!st.phase)for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.dh)continue;if(hyp(e.x-p.x,e.y-p.y)<e.r*(e.sc||1)+p.r+2){e.dh=true;damageEnemy(e,st.dashDmg,true,e.x,e.y,0,true,p);var ka=Math.atan2(e.y-p.y,e.x-p.x);e.vx+=Math.cos(ka)*90;e.vy+=Math.sin(ka)*90}}}
else{for(i=0;i<G.enemies.length;i++)G.enemies[i].dh=false,G.enemies[i].aegisHit=0;var sp=st.speed*(p.focus?.55:1)*(p.stun>0?.2:1),k=1-Math.exp(-20*dt),mxv=p.trapped?0:inp.mx,myv=p.trapped?0:inp.my;p.vx+=(mxv*sp-p.vx)*k;p.vy+=(myv*sp-p.vy)*k}
p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=clamp(p.x,AR.x+p.r,AR.x+AR.w-p.r);p.y=clamp(p.y,AR.y+p.r,AR.y+AR.h-p.r);
var engage=combatTargets();p.engaging=engage;
updateSocio(p,dt,st);updateTesla(p,dt,st);updateAegisOrbit(p,dt,st);
if(st.fireMode==='cone'){p.coneT+=dt;if(engage)updateCone(p,dt,st)}else p.coneT=0;
p.fireT-=dt;if(p.fireT<=0){if(engage){p.fireT=1/st.rate;shoot(p)}else p.fireT=0}
for(i=0;i<st.drones;i++){p.dT[i]-=dt;if(p.dT[i]<=0){var t2=nearestEnemy(p.x,p.y);if(t2){p.dT[i]=st.droneCd;var ang=G.t*1.8+i*TAU/Math.max(1,st.drones),ddx=p.x+Math.cos(ang)*16,ddy=p.y+Math.sin(ang)*16;fireBullet(ddx,ddy,Math.atan2(t2.y-ddy,t2.x-ddx),210,st.dmg*st.droneMul,st.dronePierce,true,p.id)}else p.dT[i]=.25}}
if(p.beamT>0){p.beamT-=dt;updateBeam(p,dt)}}
function shoot(p){var st=p.stats;if(st.fireMode==='cone')return;var boost=1;
if(p.invisShot&&p.invis>0){boost=st.invisBoost||2;p.invisShot=false;float(p.x,p.y-16,'×'+boost.toFixed(1).replace('.0',''),'#a86bff',1);part(p.x,p.y,'#a86bff',12,90,.35,1)}
if(st.fireMode==='dual'){var ap=aimPoint(p);p.recoil=.5;for(var g=-1;g<=1;g+=2){var gx=p.x+Math.cos(p.aim)*20-Math.sin(p.aim)*g*8,gy=p.y+Math.sin(p.aim)*20+Math.cos(p.aim)*g*8,ga=Math.atan2(ap.y-gy,ap.x-gx);fireBullet(gx,gy,ga,st.bs,st.dmg*boost,st.pierce,false,p.id,st.bulletLife);part(gx,gy,p.light,2,50,.15,1)}A.shoot();G.st.shots++;return}
if(st.fireMode==='scythe'){p.swingT=.3;p.swingDir=-(p.swingDir||1);A.scythe();ring(p.x,p.y,st.scytheR*.4,st.scytheR,'#ff2fb0',.22);var hit=false;
for(var si=0;si<G.enemies.length;si++){var se=G.enemies[si];if(se.dead)continue;if(hyp(se.x-p.x,se.y-p.y)>st.scytheR+se.r*(se.sc||1))continue;var sa=Math.atan2(se.y-p.y,se.x-p.x);if(Math.abs(angDiff(p.aim,sa))>st.scytheHalf)continue;damageEnemy(se,st.scytheDmg*boost,true,se.x,se.y,sa,true,p);if(!se.dead)applyBleed(se,st.bleedDps,p.id);hit=true}
if(hit)healPlayer(p,st.scytheDmg*.08);for(var sp2=0;sp2<9;sp2++){var aa=p.aim-st.scytheHalf+sp2*(st.scytheHalf*2/8);part(p.x+Math.cos(aa)*st.scytheR,p.y+Math.sin(aa)*st.scytheR,'#ff2fb0',1,45,.2,1)}G.st.shots++;return}
if(st.fireMode==='sniper'){p.recoil=1;fireBullet(p.x+Math.cos(p.aim)*12,p.y+Math.sin(p.aim)*12,p.aim,st.bs,st.dmg*boost,st.pierce,false,p.id,st.bulletLife);
part(p.x+Math.cos(p.aim)*12,p.y+Math.sin(p.aim)*12,p.light,5,80,.2,1);
for(var rc=0;rc<3;rc++)G.ghost.push({x:p.x-Math.cos(p.aim)*rc*2,y:p.y-Math.sin(p.aim)*rc*2,a:p.aim,l:.14,m:.14,col:p.col,ship:p.ship,id:p.id,tint:p.tintIdx});
A.tone(1300,.08,'square',.06,.35)}
else if(st.fireMode==='rocket'){p.bay=1;fireRocketEntity(p.x+Math.cos(p.aim)*8,p.y+Math.sin(p.aim)*8,p.aim,st.dmg*boost,p.id,true,false);A.tone(700,.07,'sawtooth',.05,.5)}
else if(st.fireMode==='shotgun'){p.recoil=.7;for(var s=0;s<st.count;s++){var off=(s-(st.count-1)/2)*st.spread+rand(-.05,.05);fireBullet(p.x+Math.cos(p.aim)*7,p.y+Math.sin(p.aim)*7,p.aim+off,st.bs*.8,st.dmg*boost,st.pierce,false,p.id,st.bulletLife)}A.tone(500,.08,'square',.06,.4)}
else{var n=st.count;for(var i=0;i<n;i++){var o2=(i-(n-1)/2)*st.spread*2+rand(-.02,.02)*(p.focus?.3:1),a=p.aim+o2;fireBullet(p.x+Math.cos(a)*7,p.y+Math.sin(a)*7,a,st.bs,st.dmg*boost,st.pierce,false,p.id,st.bulletLife)}A.shoot()}
G.st.shots++;part(p.x+Math.cos(p.aim)*8,p.y+Math.sin(p.aim)*8,p.light,2,50,.15,1);
p.vx-=Math.cos(p.aim)*9;p.vy-=Math.sin(p.aim)*9}
function updateBeam(p,dt){var st=p.stats,dps=p.ship==='monster'?st.wstat.beam.dmg:st.weaponDmg,len=280,w=5,ca=Math.cos(p.aim),sa=Math.sin(p.aim);p.beamChain=[];
if(st.reflect){var hit=[],cur={x:p.x,y:p.y},ang=p.aim;for(var c=0;c<5;c++){var best=null,bd=1e9;for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||hit.indexOf(e.id)>=0)continue;var rx=e.x-cur.x,ry=e.y-cur.y,proj=rx*Math.cos(ang)+ry*Math.sin(ang);if(proj<0||proj>len)continue;var perp=Math.abs(-rx*Math.sin(ang)+ry*Math.cos(ang));if(perp<e.r+w&&proj<bd){bd=proj;best=e}}if(!best)break;hit.push(best.id);p.beamChain.push({x1:cur.x,y1:cur.y,x2:best.x,y2:best.y});if(!best.invuln&&!twinsShielded(best)){best.hp-=dps*dt;best.fr=.05;if(best.hp<=0)killEnemy(best)}cur={x:best.x,y:best.y};var nx=null,nd=1e9;for(i=0;i<G.enemies.length;i++){var e2=G.enemies[i];if(e2.dead||hit.indexOf(e2.id)>=0)continue;var d=hyp(e2.x-cur.x,e2.y-cur.y);if(d<nd&&d<160){nd=d;nx=e2}}if(!nx)break;ang=Math.atan2(nx.y-cur.y,nx.x-cur.x)}if(!p.beamChain.length)p.beamChain.push({x1:p.x,y1:p.y,x2:p.x+ca*len,y2:p.y+sa*len})}
else{p.beamChain.push({x1:p.x,y1:p.y,x2:p.x+ca*len,y2:p.y+sa*len});for(i=0;i<G.enemies.length;i++){var e3=G.enemies[i];if(e3.dead||e3.invuln||twinsShielded(e3))continue;var rx3=e3.x-p.x,ry3=e3.y-p.y,pr3=rx3*ca+ry3*sa;if(pr3<0||pr3>len)continue;var pp3=Math.abs(-rx3*sa+ry3*ca);if(pp3<e3.r+w){e3.hp-=dps*dt;e3.fr=.05;if(Math.random()<.15)part(e3.x,e3.y,'#ff2fb0',1,40,.15,1);if(e3.hp<=0)killEnemy(e3)}}}}
function fireWeapon(p){var st=p.stats;if(G.state!=='play'||p.jammed)return;
if(p.ship==='monster'){var ws=st.weapons;if(!ws.length)return;var w=ws[p.wsel%ws.length],wc=st.wstat[w];if(p.wcd[w]>0)return;p.wcd[w]=wc.cd;p.plateT=1;HAP.boom();
if(w==='rocket'){fireRocketEntity(p.x+Math.cos(p.aim)*20,p.y+Math.sin(p.aim)*20,p.aim,wc.dmg,p.id,false,st.hydra);A.rocket();shake(2);part(p.x,p.y,'#ffb020',8,80,.3,1)}
else if(w==='wave'){var rad=wc.rad;if(st.density)G.rings.push({x:p.x,y:p.y,r:6,r1:rad,l:.55,m:.55,c:'#22e6ff',ang:p.aim,spread:Math.PI/4});else ring(p.x,p.y,4,rad,'#22e6ff',.55);part(p.x,p.y,'#22e6ff',24,130,.5,1);shake(2.5);A.shock();for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;var d=hyp(e.x-p.x,e.y-p.y);if(d>rad)continue;if(st.density&&Math.abs(angDiff(p.aim,Math.atan2(e.y-p.y,e.x-p.x)))>Math.PI/4)continue;damageEnemy(e,wc.dmg,true,e.x,e.y,undefined,true,p)}}
else if(w==='beam'){p.beamT=wc.dur;A.beam();flash(.12,'#ff2fb0')}return}
if(!st.weapon||p.weaponCd>0)return;
if(st.weapon==='chrono'){p.weaponCd=st.weaponCdMax;G.chronoFields.push({x:p.x,y:p.y,r:st.chronoR,g:!!st.chronoGlobal,t:st.chronoDur,max:st.chronoDur,owner:p.id});A.chrono();HAP.win();flash(.18,'#4d8cff');ring(p.x,p.y,6,st.chronoGlobal?200:st.chronoR,'#4d8cff',.7);float(p.x,p.y-18,st.chronoGlobal?'ПОЛЕ ВРЕМЕНИ':'ХРОНО-ПОЛЕ','#4d8cff',1);return}
p.weaponCd=st.weaponCdMax;HAP.boom();
if(st.weapon==='rocket'){fireRocketEntity(p.x+Math.cos(p.aim)*8,p.y+Math.sin(p.aim)*8,p.aim,st.weaponDmg,p.id,false,st.hydra);A.rocket();shake(1.6);part(p.x,p.y,'#ffb020',6,70,.25,1)}
else if(st.weapon==='wave'){var rad2=st.weaponRadius;if(st.density)G.rings.push({x:p.x,y:p.y,r:6,r1:rad2,l:.55,m:.55,c:'#22e6ff',ang:p.aim,spread:Math.PI/4});else ring(p.x,p.y,4,rad2,'#22e6ff',.55);part(p.x,p.y,'#22e6ff',24,130,.5,1);shake(2.5);A.shock();for(var j=0;j<G.enemies.length;j++){var e2=G.enemies[j];if(e2.dead)continue;var d2=hyp(e2.x-p.x,e2.y-p.y);if(d2>rad2)continue;if(st.density&&Math.abs(angDiff(p.aim,Math.atan2(e2.y-p.y,e2.x-p.x)))>Math.PI/4)continue;damageEnemy(e2,st.weaponDmg,true,e2.x,e2.y,undefined,true,p)}}
else if(st.weapon==='beam'){p.beamT=st.beamDur;A.beam();flash(.12,'#ff2fb0')}}
function doDash(p){var st=p.stats;if(G.state!=='play'||p.dashCd>0||p.stun>0||p.trapped)return;var dx=p.input.mx,dy=p.input.my;if(!dx&&!dy){dx=Math.cos(p.aim);dy=Math.sin(p.aim)}var l=hyp(dx,dy)||1;p.dx=dx/l;p.dy=dy/l;p.dashT=.16;p.dashCd=st.dashCd;p.socioSpin=1.16;
if(st.ship==='bomber'&&!st.seeder)spawnMine(p.x,p.y,p.id,60,34);
if(st.seeder){var n=st.seedN;for(var i=0;i<n;i++){var a=p.aim+Math.PI+(i-(n-1)/2)*.42;spawnMine(p.x+Math.cos(a)*15,p.y+Math.sin(a)*15,p.id,st.seedDmg,st.seedRad)}}
if(st.turretDash)spawnTurret(p);if(st.phase){spawnPhantom(p);p.inv=Math.max(p.inv,.34);ring(p.x,p.y,3,22,'#a86bff',.35)}
if(st.invisDash){p.invis=st.invisDash;p.invisShot=true;part(p.x,p.y,'#a86bff',14,95,.4,1);ring(p.x,p.y,3,20,'#a86bff',.35);float(p.x,p.y-20,'НЕВИДИМ','#a86bff',1)}
if(st.aegis)p.aegisOut=.6;p.inv=Math.max(p.inv,.28);A.dash();HAP.dash();shake(1.4);part(p.x,p.y,p.col,10,90,.3,1);ring(p.x,p.y,3,18,p.col,.25)}
var groupCounter=0,groupAnchor={};
function pushShieldGroup(at){var size=randi(3,4),gid=++groupCounter;for(var i=0;i<size;i++)G.queue.push({type:'shielder',at:at+i*.08,group:gid,slot:i})}
function levelTypeName(t){return t==='std'?'СЕКТОР':t==='bomb'?'БОМБЕЖКА':t==='snipe'?'ПОД ПРИЦЕЛОМ':t==='laser'?'ЛАЗЕР-ТАГ':t==='bigship'?'КРУПНЫЙ КОРАБЛЬ':t==='mystery'?'ТАИНСТВЕННЫЙ':t==='dark'?'ТЁМНЫЙ МИР':t==='rand'?'СЛУЧАЙНЫЙ':t==='boss'?'БОСС':''}
function stdPool(){var pool=[['grunt',1]];if(G.wave>=2)pool.push(['shooter',2]);if(G.wave>=3)pool.push(['splitter',2.5]);if(G.wave>=4){pool.push(['tank',4]);pool.push(['sniper',3])}if(G.wave>=5)pool.push(['medic',3.5]);if(G.wave>=6)pool.push(['ram',2]);if(G.wave>=7)pool.push(['lgun',3]);if(G.wave>=8){pool.push(['emitter',4]);pool.push(['mirror',3])}if(G.wave>=10)pool.push(['brood',4]);if(G.wave>=11&&Math.random()<.34)pool.push(['bastard',5]);if(G.wave>=12){pool.push(['shielder',3]);pool.push(['jammer',3.5])}return pool}
function fillQueue(pool,t){var budget=(6+G.wave*2.4)*D.budget*(isCoop()?1.5:1),guard=0,hasShield=false,hasSniper=false;
var groups=G.wave>=6?1+Math.floor((G.wave-6)/7):0;for(var g=0;g<groups;g++){pushShieldGroup(t+g*2.2);hasShield=true;budget-=6}
while(budget>0&&guard++<170){var av=pool.filter(function(p){return p[1]<=budget+.5});if(!av.length)break;var gs=randi(1,Math.min(5,2+Math.floor(G.wave/5)));for(var i=0;i<gs;i++){var p=pick(av);budget-=p[1];if(p[0]==='sniper')hasSniper=true;if(p[0]==='shielder'){pushShieldGroup(t);hasShield=true}else G.queue.push({type:p[0],at:t+i*rand(.14,.3)})}t+=rand(.75,1.5)*clamp(1.2-G.wave*.02,.5,1.2)}
if(hasShield&&G.wave>=4&&!hasSniper)G.queue.push({type:'sniper',at:t+.5});var bc=0;for(var qi=0;qi<G.queue.length;qi++)if(G.queue[qi].type==='bastard'){bc++;if(bc>2)G.queue[qi].type='shooter'}G.queue.sort(function(a,b){return a.at-b.at})}
function buildWave(node){G.queue=[];groupAnchor={};var t=.5,type=node.type;
if(type==='boss'){var cnt=node.count||1;for(var b=0;b<cnt;b++)G.queue.push({type:'boss',boss:b===0?node.boss:pick(ALLB),at:.8+b*.6,idx:b});var adds=Math.round((4+Math.floor(G.wave/3))*(isCoop()?1.5:1));for(var i=0;i<adds;i++)G.queue.push({type:i%4===3?'shooter':'grunt',at:2.2+i*.5});if(G.wave>=10)pushShieldGroup(5);if(G.wave>=15)G.queue.push({type:'sniper',at:7});if(G.wave>=20)G.queue.push({type:'medic',at:6});return}
if(type==='dark'){G.queue.push({type:'dark',at:1.2});return}
if(type==='bigship'){if(G.cap&&G.cap.kind!=='derelict')fillQueue(stdPool(),t);return}
if(type==='bomb'){fillQueue([['medic',3.5]],t);return}
if(type==='laser'){fillQueue([['emitter',4]],t);return}
if(type==='snipe'){for(var s0=0;s0<5;s0++)G.queue.push({type:'sniper',at:.4+s0*.25});fillQueue([['sniper',2],['shielder',3],['medic',3.5]],t);return}
if(type==='mystery'){if(Math.random()<.45){for(var sh=0;sh<8*lootX();sh++)spawnShard(rand(AR.x+60,AR.x+AR.w-60),rand(AR.y+60,AR.y+AR.h-60));return}fillQueue([['grunt',1],['shooter',2],['splitter',2.5]],t);if(G.lastBossKind&&Math.random()<.35)G.queue.push({type:'ghost',boss:G.lastBossKind,at:1.5});return}
if(type==='rand'&&G.event==='swarm'){fillQueue([['clone',.5],['mini',.5]],t);return}
if(type==='rand'&&G.event==='calm'){for(var s=0;s<8*lootX();s++)spawnShard(rand(AR.x+60,AR.x+AR.w-60),rand(AR.y+60,AR.y+AR.h-60));return}
fillQueue(stdPool(),t)}
function setArena(w,h){G.arena={w:w,h:h};AR.w=w;AR.h=h;floorCanvas=makeFloor(w,h)}
function makeCap(kind){var c={kind:kind,x:AR.w/2,y:AR.h/2,w:260,h:84,r:76,hp:600,max:600,t:0,dead:false,boomed:false,fl:0,msgT:3,lastBeep:-1,cargo:null,hunters:0};
if(kind==='doom'){c.t=rand(60,90);c.maxT=c.t}
if(kind==='derelict'&&Math.random()<.6)c.cargo={x:c.x+rand(-100,100),y:c.y+78,hp:40,max:40,t:0,fl:0,dead:false};
return c}
function startLevel(node){G.wave=node.d;G.waveT=0;G.active=true;G.portal=null;G.portalCharge=0;G.event=null;G.cap=null;G.lastKill={x:AR.w/2,y:AR.h/2};G.levelKills=0;G.wrecks=[];G.dmgMarks=[];var type=node.type;
if(type==='bigship'){setArena(1200,880);G.cap=makeCap(pick(['doom','rescue','rescue','derelict']))}
else if(type==='bomb')setArena(512,384);else if(type==='mystery')setArena(1280,360);else setArena(640,480);
if(type==='rand'){if(Math.random()<.5){var t=pick(G.wave>=10?['std','bomb','snipe','mystery','laser']:['std','bomb','snipe','mystery']);node.type=t;G.lootMult=1.5;if(t==='bomb')setArena(512,384);else if(t==='mystery')setArena(1280,360);else setArena(640,480)}else{G.lootMult=2;G.event=pick(['gold','meteor','swarm','calm'])}}
else G.lootMult=(type==='std')?1:(G.endless?1+G.wave*.03:1.5);
G.musicMode=type==='boss'?'boss':type==='bigship'?'tense':type==='bomb'?'fast':type==='snipe'||type==='laser'?'tense':type==='mystery'?'ambient':type==='dark'?'ominous':'dynamic';
G.enemies=[];G.bul=[];G.ebul=[];G.erock=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];G.mines=[];G.wells=[];G.turrets=[];G.phantoms=[];G.chronoFields=[];G.drops=[];G.queue=[];G.boss=null;G.twinsLink=false;
for(var i=0;i<PL.length;i++){var p=PL[i];p.x=AR.w/2+(i?24:-24);p.y=AR.h*.8;p.vx=0;p.vy=0;p.stun=0;p.trapped=0;p.invis=0;p.invisShot=false;p.jammed=false;p.swingT=0;p.plateT=0;p.recoil=0;p.bay=0;p.dmgFxT=0;p.wcd={wave:0,beam:0,rocket:0};p.aegisR=p.stats?p.stats.aegisR||24:24;p.input.dash=false;p.input.weapon=false;p.lastSeen.x=p.x;p.lastSeen.y=p.y;if(p.hp>0)p.inv=Math.max(p.inv,1)}
G.splitOn=false;centerCam(true);buildWave(node);
if(node.type==='dark'){G.glitch=2.4;bannerDread(pick(DREAD));A.dread();flash(.35,'#a86bff');shake(5)}
else if(node.type==='bigship'){var k=G.cap.kind;banner('КРУПНЫЙ КОРАБЛЬ',k==='doom'?'ВЗОРВЁТСЯ · ЗАЧИСТИ И БЕГИ':k==='rescue'?'ЗАЩИТИ ЛЮДЕЙ ВНУТРИ':'ЗАБРОШЕН · ОБЫЩИ КОНТЕЙНЕР');A.bossIn();if(k==='doom')HAP.big()}
else{var label=node.type==='boss'?(BOSS_NAMES[node.boss]||'БОСС'):levelTypeName(node.type);banner(label,node.type==='boss'?'УНИЧТОЖЬ ЯДРО':'ЗАЧИСТИ СЕКТОР');if(node.type==='boss'){A.bossIn();HAP.big();tutShow('boss')}else A.wave()}
if(G.wave===1){tutShow('move');G.tutT=0}
$('#cWave').textContent=G.endless?G.wave+'∞':G.wave;popChip('.chip.w');setState('play')}
function updateSpawns(){while(G.queue.length&&G.queue[0].at<=G.waveT&&G.enemies.length<(isCoop()?48:34)){var q=G.queue.shift();
if(q.type==='boss'){var bx=AR.w/2+(q.idx?(q.idx%2?120:-120):0),by=AR.y+70+(q.idx?Math.floor(q.idx/2)*90:0);
if(q.boss==='twins'){var ec=makeBoss('twins',bx,by,false);ec.hp*=2;ec.max=ec.hp;G.enemies.push(ec);if(!G.boss)G.boss=ec;var ag=makeEnemy('aegis',bx+70,by+40);G.enemies.push(ag);G.twinsLink=true}
else{var e=makeBoss(q.boss,bx,by,false);e.hp*=2;e.max=e.hp;G.enemies.push(e);if(!G.boss)G.boss=e}$('#bossbar').classList.add('on');$('#bossName').textContent=G.boss.bossName}
else if(q.type==='ghost'){var g=makeBoss(q.boss,AR.w/2,AR.y+60,true);g.hp*=2;g.max=g.hp;G.enemies.push(g);if(!G.boss)G.boss=g;$('#bossbar').classList.add('on');$('#bossName').textContent=g.bossName}
else if(q.type==='dark'){var dk=makeEnemy('dark',AR.w/2,AR.y+80);G.enemies.push(dk);G.boss=dk;$('#bossbar').classList.add('on');$('#bossName').textContent=dk.bossName;ring(dk.x,dk.y,4,34,'#a86bff',.6)}
else if(q.type==='shielder'&&q.group!=null){if(!groupAnchor[q.group])groupAnchor[q.group]=edge();var a=groupAnchor[q.group],ang=q.slot*TAU/4;spawnAt('shielder',clamp(a.x+Math.cos(ang)*11,AR.x+EDGE,AR.x+AR.w-EDGE),clamp(a.y+Math.sin(ang)*11,AR.y+EDGE,AR.y+AR.h-EDGE),{group:q.group,slot:q.slot})}
else spawn(q.type)}}
function waveClear(){G.active=false;var node=getNode(G.curNode);
if(G.cap&&G.cap.kind==='rescue'&&!G.cap.dead){for(var i=0;i<PL.length;i++)PL[i].shards+=200;float(G.cap.x,G.cap.y-70,'СПАСЕНЫ! +200 ◆','#9dff3c',2);A.win();HAP.win();dropShards(G.cap.x,G.cap.y+60,20)}
G.boss=null;$('#bossbar').classList.remove('on');var bonus=100+G.wave*35;addScore(bonus);var sh=3+Math.floor(G.wave/2);for(i=0;i<PL.length;i++)PL[i].shards+=sh;A.up();
if(!G.endless&&node&&node.type==='boss'&&node.boss==='hive'){winRun();return}
var px=G.lastKill.x,py=G.lastKill.y;
if(G.cap||!G.levelKills){px=AR.w/2;py=G.cap?AR.h*.9:AR.h/2}
G.portal={x:clamp(px,AR.x+40,AR.x+AR.w-40),y:clamp(py,AR.y+40,AR.y+AR.h-40),r:20,t:0,age:0};
G.portalCharge=0;A.portal();float(G.portal.x,G.portal.y-26,'ПОРТАЛ','#22e6ff',2);tutShow('portal')}
function getNode(id){if(!G.map)return null;for(var d=0;d<G.map.length;d++)for(var i=0;i<G.map[d].length;i++)if(G.map[d][i].id===id)return G.map[d][i];return null}
function nodeRow(d){var nodes=[];
if(!G.endless&&d===MAX_WAVE)return[{id:++G.nid,d:d,type:'boss',boss:'hive',row:0}];
if((G.endless&&d%5===0)||(!G.endless&&BOSS_DEPTHS.indexOf(d)>=0)){var cnt=1;if(G.endless&&d>=30)cnt=Math.min(3,1+Math.floor((d-30)/10));var b=G.endless?pick(ALLB):(G.bossPool[G.bossIdx++]||'guardian');return[{id:++G.nid,d:d,type:'boss',boss:b,count:cnt,row:0}]}
var n=d===1?1:randi(2,3);for(var i=0;i<n;i++){var t;
if(CHEAT.dark)t='dark';else if(d>=16&&!G.darkPlaced&&Math.random()<.28){t='dark';G.darkPlaced=true}
else if(d>=4&&Math.random()<.16)t='bigship';
else if(d>=10&&!G.laserPlaced&&Math.random()<.3){t='laser';G.laserPlaced=true}
else if(d<6)t=pick(['std','std','std','mystery','rand']);else if(d<10)t=pick(['std','std','bomb','snipe','mystery','rand']);else t=pick(['std','std','bomb','snipe','mystery','rand','laser']);
nodes.push({id:++G.nid,d:d,type:t,row:i})}return nodes}
function linkRows(cur,nxt){for(var i=0;i<cur.length;i++){cur[i].next=[];var j=Math.round(i*(nxt.length-1)/Math.max(1,cur.length-1));cur[i].next.push(nxt[j].id);if(nxt[j+1]&&Math.random()<.6)cur[i].next.push(nxt[j+1].id);if(nxt[j-1]&&Math.random()<.4)cur[i].next.push(nxt[j-1].id)}
for(i=0;i<nxt.length;i++){var has=false;for(var c=0;c<cur.length;c++)if(cur[c].next.indexOf(nxt[i].id)>=0)has=true;if(!has)cur[Math.min(cur.length-1,Math.round(i*(cur.length-1)/Math.max(1,nxt.length-1)))].next.push(nxt[i].id)}}
function extendMap(to){while(G.map.length<to){var d=G.map.length+1,row=nodeRow(d);if(G.map.length)linkRows(G.map[G.map.length-1],row);G.map.push(row)}}
function genMap(){G.map=[];G.nid=0;G.bossIdx=0;G.darkPlaced=false;G.laserPlaced=false;G.bossPool=BOSS_POOL.slice().sort(function(){return Math.random()-.5});extendMap(G.endless?12:MAX_WAVE);G.curNode=G.map[0][0].id;G.mapSel=0}
function reachableNodes(){if(CHEAT.fullmap&&G.map&&G.map.length){var all=[];for(var d=0;d<G.map.length;d++)for(var i=0;i<G.map[d].length;i++)all.push(G.map[d][i]);return all}
var cur=getNode(G.curNode);if(!cur||!cur.next)return[];return cur.next.map(getNode).filter(Boolean)}
function trySelectNode(id){if(NET.mode==='guest')return;var reach=reachableNodes(),node=null;for(var i=0;i<reach.length;i++)if(reach[i].id===id)node=reach[i];if(node)selectNode(node)}
function selectNode(node){G.pendingNode=node;G.curNode=node.id;G.travel=true;G.travelT=0;G.travelDone=false;G.menuOpened=false;G.postT=0;setState('travel')}
function enterPortal(){G.portal=null;G.portalCharge=0;var node=getNode(G.curNode);if(G.endless)extendMap(node.d+6);
if(node&&node.type==='boss'){setState('shop');buildShop();merchOpen()}else{setState('map');tutShow('map');G.mapSel=0;G.mapCam=clamp((node?node.d:1)*70-W/3,0,mapSpan()*70-W+80)}}
function openUp(){for(var i=0;i<PL.length;i++){PL[i].pickPhase=0;PL[i].padSel=0;if(PL[i].hp>0){PL[i].ready=false;rollFor(PL[i])}else PL[i].ready=true}setState('up');G.padSel=0;renderCards();tutShow('module');$('#upEye').textContent='ПЕРЕЛЁТ · '+(G.pendingNode?(G.pendingNode.type==='boss'?(BOSS_NAMES[G.pendingNode.boss]||'БОСС'):levelTypeName(G.pendingNode.type)):'');if(NET.mode==='host')sendUpView()}
function baseCap(k){for(var i=0;i<UPS.length;i++)if(UPS[i].k===k)return UPS[i].cap;return 3}
function upByKey(k){for(var i=0;i<UPS.length;i++)if(UPS[i].k===k)return UPS[i];return null}
function upgradeCost(u,p){var lv=p.lvl[u.k]||0;if(u.ship)return SHIPMOD_COST;if(u.k==='dash'&&lv>=3)return 100;if(u.cost)return u.cost;return 0}
function moduleFits(u,ship){var noB=ship==='bomber'||ship==='reaper'||ship==='groza',single=ship==='sniper';
if(u.k==='socio'&&ship==='psy')return false;
if(u.k==='fan'&&(noB||single||ship==='monster'))return false;if(u.k==='pierce'&&(noB||single))return false;if(u.k==='kir'&&ship==='groza')return false;if(u.k==='rate'&&ship==='groza')return false;
if(ship==='chronos'&&(u.weapon||u.req==='rocket'||u.req==='wave'||u.req==='beam'))return false;return true}
function rollFor(p){var L=p.lvl,mm=metaOf(p),pool=UPS.filter(function(u){if(u.ship&&u.ship!==p.ship)return false;if(!moduleFits(u,p.ship))return false;if((L[u.k]||0)>=u.cap)return false;if(LOCKED.indexOf(u.k)>=0&&mm.unlocked.indexOf(u.k)<0)return false;
if(u.gold){var need=L[u.req]||0;if(need<baseCap(u.req))return false;if((u.req==='rocket'||u.req==='wave'||u.req==='beam')&&(p.ship!=='monster'&&L.weapon!==u.req))return false;return !L[u.k]}
if(u.weapon&&p.ship!=='monster'&&L.weapon&&u.k!==L.weapon)return false;return true});
p.offer=[];var guard=0;while(p.offer.length<Math.min(3,pool.length)&&guard++<90){var u=pick(pool);if(p.offer.indexOf(u)<0)p.offer.push(u)}}
function upView(p){return{offer:p.offer.map(function(u){return u.k}),shards:p.shards,dual:p.dual,phase:p.pickPhase,ready:p.ready,lvl:p.lvl,hp:p.hp,max:p.max}}
function sendUpView(){if(NET.mode==='host'&&NET.connected)netSend({t:'upview',v:upView(P2)})}
function applyUpView(v){P2.dual=v.dual;P2.pickPhase=v.phase;P2.ready=v.ready;P2.lvl=v.lvl;P2.hp=v.hp;P2.max=v.max;P2.shards=v.shards;P2.offer=v.offer.map(upByKey).filter(Boolean);recalcPlayer(P2);renderCards()}
function ownsColumn(pi){if(NET.mode==='guest')return pi===1;if(isLocal())return true;return pi===0}
function revive(by,who){if(G.state!=='up'||who.hp>0||by.hp<=0||by.shards<REVIVE_COST)return;by.shards-=REVIVE_COST;who.hp=Math.round(who.max*.6);who.inv=2.5;who.ready=false;who.pickPhase=0;who.stun=0;who.trapped=0;who.invis=0;rollFor(who);who.x=by.x+16;who.y=by.y;who.vx=0;who.vy=0;A.revive();HAP.win();flash(.2,who.col);ring(by.x,by.y,4,46,who.col,.6);if(NET.mode==='host')sendUpView();G.shards=localPlayer().shards;renderCards();checkAdvance()}
function renderCards(){var el=$('#cards');el.innerHTML='';var two=PL.length>1,wrap=document.createElement('div');wrap.className=two?'cols':'cols solo';
PL.forEach(function(p,pi){var col=document.createElement('div');col.className='pcol';col.style.borderColor=p.col;var head=document.createElement('div');head.className='phead';head.style.color=p.col;head.innerHTML='<span>ИГРОК '+(pi+1)+'</span><em>'+(p.hp<=0?'ПАЛ':p.ready?'ГОТОВ':'ВЫБИРАЕТ')+'</em>';col.appendChild(head);
var st=document.createElement('div');st.className='pstat';st.innerHTML='<span>◆ <b>'+p.shards+'</b></span><span>⬡ <b>'+bankOf(p)+'</b></span><span>'+shipLabel(p.ship)+'</span>';col.appendChild(st);
if(!ownsColumn(pi)){var lk=document.createElement('div');lk.className='sub';lk.style.margin='0';lk.textContent='управляет другой игрок';col.appendChild(lk)}
if(p.hp<=0){var d=document.createElement('div');d.className='sub';d.textContent='Корпус разрушен. Напарник воскресит за '+REVIVE_COST+'◆.';col.appendChild(d)}
else{p.offer.forEach(function(u,i){var lv=p.lvl[u.k]||0,b=document.createElement('button'),cost=upgradeCost(u,p);b.className='card'+((u.gold||cost||u.ship)?' gold':'');b.type='button';b.setAttribute('data-own',pi);if(p.ready||!ownsColumn(pi))b.disabled=true;var pips='';for(var j=0;j<u.cap;j++)pips+='<i class="'+(j<lv?'f':'')+'"></i>';b.innerHTML='<span class="num">'+(i+1)+'</span><h4>'+u.n+'</h4><p>'+u.d+(cost?' · '+cost+'◆':'')+'</p><div class="lv">'+pips+'</div>';b.insertBefore(iconCanvas(u.k,u.col,4),b.firstChild);b.addEventListener('click',function(){if(NET.mode==='guest')netSend({t:'choose',i:i});else choose(i,p)});col.appendChild(b)});
var row=document.createElement('div');row.className='upshop';row.innerHTML='<span class="upsh">◆ '+p.shards+'</span>';
function mk(l,fn,dis){var b=document.createElement('button');b.className='sb';b.textContent=l;b.setAttribute('data-own',pi);b.disabled=!!dis||p.ready||!ownsColumn(pi);b.addEventListener('click',function(){if(NET.mode==='guest'&&pi===1)netSend({t:'shop',a:fn});else shopAction(fn,p)});return b}
row.appendChild(mk('РЕМОНТ 12','repair',p.shards<12||p.hp>=p.max));row.appendChild(mk('ПЕРЕБРОС 6','reroll',p.shards<6));if(!p.dual)row.appendChild(mk('ДВОЙНОЙ 350','dual',p.shards<350));row.appendChild(mk(p.ready?'ГОТОВО':'ПРОПУСТИТЬ +75','skip',false));if(p.dual&&p.pickPhase===1&&!p.ready)row.appendChild(mk('ЗАВЕРШИТЬ','done',false));col.appendChild(row)}
var other=PL[1-pi];if(other&&other.hp<=0&&p.hp>0){var rb=document.createElement('button');rb.className='btn mag revive';rb.type='button';rb.setAttribute('data-own',pi);rb.textContent='ВОСКРЕСИТЬ ИГРОКА '+(2-pi)+' · '+REVIVE_COST+'◆';rb.disabled=p.shards<REVIVE_COST||!ownsColumn(pi);rb.addEventListener('click',function(){if(NET.mode==='guest'&&pi===1)netSend({t:'revive'});else revive(p,other)});col.appendChild(rb)}
wrap.appendChild(col)});el.appendChild(wrap);$('#upHint').textContent=two?'Каждый управляет своей колонкой. Личные модули '+SHIPMOD_COST+'◆.':'Клавиши 1·2·3. Личные модули корабля '+SHIPMOD_COST+'◆.';$('#upShards').textContent=localPlayer().shards}
function shipLabel(id){for(var i=0;i<SHIPS.length;i++)if(SHIPS[i].id===id)return SHIPS[i].n;return 'МАРШАЛ'}
function applyUpgrade(u,p){var L=p.lvl;if(u.weapon&&p.ship!=='monster'&&!L.weapon)L.weapon=u.k;L[u.k]=(L[u.k]||0)+1;recalcPlayer(p);if(u.k==='armor')healPlayer(p,25);A.up();HAP.win();flash(.15,'#22e6ff');ring(p.x,p.y,3,44,'#9dff3c',.5);part(p.x,p.y,'#9dff3c',16,90,.5,1)}
function checkAdvance(){if(NET.mode==='guest'||G.state!=='up')return;var alive=PL.filter(function(p){return p.hp>0}),done=alive.length>0&&alive.every(function(p){return p.ready});if(done){G.travelDone=true;setState('travel')}else{renderCards();sendUpView()}}
function choose(i,p){if(G.state!=='up')return;p=p||localPlayer();if(p.ready||p.hp<=0)return;var u=p.offer[i];if(!u)return;var cost=upgradeCost(u,p),total=cost+((p.dual&&p.pickPhase===1)?50:0);if(p.shards<total)return;p.shards-=total;if(p.dual&&p.pickPhase===1){applyUpgrade(u,p);p.ready=true}else{applyUpgrade(u,p);if(p.dual){p.pickPhase=1;rollFor(p)}else p.ready=true}if(p===P2&&NET.mode==='host')sendUpView();G.shards=localPlayer().shards;renderCards();checkAdvance()}
function shopAction(a,p){if(G.state!=='up'||p.ready||p.hp<=0)return;if(a==='repair'){if(p.shards<12||p.hp>=p.max)return;p.shards-=12;healPlayer(p,35);A.heal()}else if(a==='reroll'){if(p.shards<6)return;p.shards-=6;rollFor(p);A.tone(600,.09,'square',.08,1.4,0,'ui')}else if(a==='dual'){if(p.shards<350||p.dual)return;p.shards-=350;p.dual=true;A.up()}else if(a==='skip'){p.shards+=75;A.pick(3);p.ready=true}else if(a==='done')p.ready=true;if(p===P2&&NET.mode==='host')sendUpView();G.shards=localPlayer().shards;renderCards();checkAdvance()}
function initShopButtons(){$('#bToMap').addEventListener('click',function(){setState('map');tutShow('map');G.mapSel=0;var n=getNode(G.curNode);G.mapCam=clamp((n?n.d:1)*70-W/3,0,mapSpan()*70-W+80)})}
function metaBuy(kind,k,seat){var mm=seatMeta(seat),pl=seat===1?P2:P;function pay(n){if(mm.frag<n)return false;mm.frag-=n;pl.frags=mm.frag;saveMeta();return true}
if(kind==='perm'){var lv=mm.perm[k]||0,pm=null;for(var i=0;i<PERMS.length;i++)if(PERMS[i].k===k)pm=PERMS[i];if(lv>=pm.max)return;if(!pay(permCost(mm,k)))return;mm.perm[k]=lv+1}
else if(kind==='bp'){if(!pay(BP_COST))return;var bi=mm.bp.indexOf(k);if(bi>=0)mm.bp.splice(bi,1);if(mm.unlocked.indexOf(k)<0)mm.unlocked.push(k)}
else if(kind==='ship'){if(mm.ships.indexOf(k)>=0)return;if(shipNeedsBp(k)&&mm.bp.indexOf('ship:'+k)<0)return;if(!pay(shipPrice(k)))return;mm.ships.push(k);var sb=mm.bp.indexOf('ship:'+k);if(sb>=0)mm.bp.splice(sb,1);if(mm.invest['ship:'+k])delete mm.invest['ship:'+k]}
else if(kind==='invperm'){if(!pay(1))return;mm.invest[k]=(mm.invest[k]||0)+1;if(mm.invest[k]>=permCost(mm,k)){mm.invest[k]=0;mm.perm[k]=(mm.perm[k]||0)+1}}
else if(kind==='invbp'){if(!pay(1))return;mm.invest[k]=(mm.invest[k]||0)+1;if(mm.invest[k]>=BP_COST){mm.invest[k]=0;var j=mm.bp.indexOf(k);if(j>=0)mm.bp.splice(j,1);if(mm.unlocked.indexOf(k)<0)mm.unlocked.push(k)}}
else if(kind==='invship'){var key='ship:'+k;if(mm.bp.indexOf(key)<0)return;if(!pay(1))return;mm.invest[key]=(mm.invest[key]||0)+1;if(mm.invest[key]>=shipPrice(k)){mm.invest[key]=0;mm.ships.push(k);var q=mm.bp.indexOf(key);if(q>=0)mm.bp.splice(q,1)}}
saveMeta();recalc();G.frags=localPlayer().frags;buildShop();buildTitleCols();if(NET.mode==='host')netSend({t:'metaok'});A.up();merchSay('Хорошо. Ещё?',true)}
function metaBuyAction(kind,k,seat){if(NET.mode==='guest'){netSend({t:'metabuy',kind:kind,k:k});return}var mm=seatMeta(seat),cost=(kind==='invship'||kind==='invperm'||kind==='invbp')?1:(kind==='perm'?permCost(mm,k):kind==='bp'?BP_COST:shipPrice(k));if(mm.frag<cost){A.tone(160,.12,'square',.08,.6,0,'ui');merchSay('Пусто у тебя. Приходи с фрагментами.',true);return}metaBuy(kind,k,seat)}
function buildShop(){var root=$('#shopCols');if(!root)return;var seats=isLocal()?[0,1]:[0];root.className=seats.length>1?'cols':'cols solo';root.innerHTML='';
seats.forEach(function(seat){var mm=seatMeta(seat),pl=seat===1?P2:P,col=document.createElement('div');col.className='pcol';col.style.borderColor=pl.col;var head=document.createElement('div');head.className='phead';head.style.color=pl.col;head.innerHTML='<span>ИГРОК '+(seat+1)+'</span><em>⬡ '+mm.frag+'</em>';col.appendChild(head);
PERMS.forEach(function(pm){var lv=mm.perm[pm.k]||0,cost=permCost(mm,pm.k),maxed=lv>=pm.max,inv=mm.invest[pm.k]||0,row=document.createElement('div');row.className='mrow';row.innerHTML='<div class="mi"><b>'+pm.n+'</b><s>'+pm.d+'</s><s style="color:var(--blue)">вложено '+inv+'/'+cost+'</s></div><span class="ml">'+lv+'/'+pm.max+'</span>';var bi=document.createElement('button');bi.className='sb';bi.textContent='+1';bi.setAttribute('data-own',seat);bi.disabled=maxed||mm.frag<1;bi.addEventListener('click',function(){metaBuyAction('invperm',pm.k,seat)});var b=document.createElement('button');b.className='sb gold';b.textContent=maxed?'МАКС':cost;b.setAttribute('data-own',seat);b.disabled=maxed||mm.frag<cost;b.addEventListener('click',function(){metaBuyAction('perm',pm.k,seat)});row.appendChild(bi);row.appendChild(b);col.appendChild(row)});
var sh=document.createElement('div');sh.className='set';sh.innerHTML='<span>КОРАБЛИ</span>';SHIPS.forEach(function(s){if(s.cost===0)return;var owned=mm.ships.indexOf(s.id)>=0,needBp=shipNeedsBp(s.id),hasBp=mm.bp.indexOf('ship:'+s.id)>=0,row=document.createElement('div');row.className='mrow';row.innerHTML='<div class="mi"><b>'+s.n+'</b><s>'+(owned?'куплен':(needBp&&!hasBp?(s.id==='monster'?'чертёж только с тёмного двойника':'нужен чертёж от босса'):s.d))+'</s></div>';var b=document.createElement('button');b.className='sb gold';b.setAttribute('data-own',seat);b.textContent=owned?'ЕСТЬ':(needBp&&!hasBp?'ЧЕРТЁЖ':s.cost);b.disabled=owned||(needBp&&!hasBp)||mm.frag<s.cost;b.addEventListener('click',function(){metaBuyAction('ship',s.id,seat)});row.appendChild(b);sh.appendChild(row)});col.appendChild(sh);
var shipBps=mm.bp.filter(function(x){return x.indexOf('ship:')===0});if(shipBps.length){var sb=document.createElement('div');sb.className='set';sb.innerHTML='<span>ЧЕРТЕЖИ КОРАБЛЕЙ</span>';shipBps.forEach(function(key){var id=key.slice(5),price=shipPrice(id),inv=mm.invest[key]||0,row=document.createElement('div');row.className='mrow';row.innerHTML='<div class="mi"><b>'+shipLabel(id)+'</b><s>'+shipDesc(id)+'</s><s style="color:var(--blue)">вложено '+inv+'/'+price+'</s></div>';var bi=document.createElement('button');bi.className='sb';bi.textContent='+1';bi.setAttribute('data-own',seat);bi.disabled=mm.frag<1;bi.addEventListener('click',function(){metaBuyAction('invship',id,seat)});var b=document.createElement('button');b.className='sb gold';b.textContent=price;b.setAttribute('data-own',seat);b.disabled=mm.frag<price;b.addEventListener('click',function(){metaBuyAction('ship',id,seat)});row.appendChild(bi);row.appendChild(b);sb.appendChild(row)});col.appendChild(sb)}
var bt=document.createElement('div');bt.className='set';bt.innerHTML='<span>ЧЕРТЕЖИ МОДУЛЕЙ</span>';var modBps=mm.bp.filter(function(x){return x.indexOf('ship:')!==0});if(!modBps.length){var e=document.createElement('div');e.className='sub';e.textContent='Чертежей нет. Падают из боссов и редко из мобов.';bt.appendChild(e)}modBps.forEach(function(k){var u=upByKey(k);if(!u)return;var inv=mm.invest[k]||0,row=document.createElement('div');row.className='mrow';row.innerHTML='<div class="mi"><b>'+u.n+'</b><s>'+u.d+'</s><s style="color:var(--blue)">вложено '+inv+'/'+BP_COST+'</s></div>';var bi=document.createElement('button');bi.className='sb';bi.textContent='+1';bi.setAttribute('data-own',seat);bi.disabled=mm.frag<1;bi.addEventListener('click',function(){metaBuyAction('invbp',k,seat)});var b=document.createElement('button');b.className='sb gold';b.textContent=BP_COST;b.setAttribute('data-own',seat);b.disabled=mm.frag<BP_COST;b.addEventListener('click',function(){metaBuyAction('bp',k,seat)});row.appendChild(bi);row.appendChild(b);bt.appendChild(row)});col.appendChild(bt);root.appendChild(col)});$('#shopFrags').textContent=wallet(0)}
function drawPreviewShip(cv,ship,idx,deg,t){var g=cv.getContext('2d'),w=cv.width,h=cv.height;g.imageSmoothingEnabled=false;g.clearRect(0,0,w,h);
var src=deg?tintedSpr(ship,idx,deg).n:(SPR.ships[ship]||SPR.ships.std)[idx?1:0].n;
var sc=Math.max(1,Math.floor(Math.min(w/src.width,h/src.height)));
var dw=src.width*sc,dh=src.height*sc,ox=Math.round((w-dw)/2),oy=Math.round((h-dh)/2+Math.sin(t*2.2+idx)*sc);
var col=deg?shiftHex(idx?'#4d8cff':'#ffb020',deg):(idx?'#4d8cff':'#ffb020');
var light=deg?shiftHex(idx?'#b8d4ff':'#fff0cf',deg):(idx?'#b8d4ff':'#fff0cf');
if(ship==='monster'){g.save();g.translate(ox+dw/2,oy+dh/2);
for(var k=0;k<5;k++){var off=(k-2)*3*sc,x=-dw/2+2*sc,y=off;g.strokeStyle=k%2?col:light;g.lineWidth=Math.max(1,sc);g.beginPath();g.moveTo(x,y);
for(var s2=1;s2<=5;s2++){x-=2.2*sc;y=off+Math.sin(t*4+k+s2*.7)*2*sc*(s2/5);g.lineTo(x,y)}g.stroke()}g.restore()}
else{var fl=Math.floor(t*14)%2===0,len=3+Math.round(Math.abs(Math.sin(t*2))*2);
for(var s3=0;s3<len;s3++){var fw=Math.max(1,Math.round((1-s3/len)*2))*sc;
g.fillStyle=s3<1?'#fff':(fl?light:col);g.fillRect(ox-sc*(s3+1),oy+Math.round(dh/2-fw/2),sc,fw)}}
g.drawImage(src,ox,oy,dw,dh);
if(ship==='groza'){g.fillStyle='#b8fbff';g.globalAlpha=.5+.5*Math.sin(t*9);g.fillRect(ox+dw-sc*3,oy+Math.round(dh*.28),sc*2,sc);g.fillRect(ox+dw-sc*3,oy+Math.round(dh*.68),sc*2,sc);g.globalAlpha=1}
if(ship==='chronos'){g.fillStyle='#fff';g.globalAlpha=.7;var cx2=ox+dw*.42,cy2=oy+dh/2;g.fillRect(Math.round(cx2+Math.cos(t*2)*sc*2),Math.round(cy2+Math.sin(t*2)*sc*2),sc,sc);g.globalAlpha=1}
if(ship==='phantom'){g.globalAlpha=.25+.2*Math.sin(t*5);g.drawImage(src,ox+sc,oy,dw,dh);g.globalAlpha=1}}
function buildTintRow(seat,mm,pl){var wrap=document.createElement('div');wrap.className='set';wrap.innerHTML='<span>ОТТЕНОК КОРПУСА</span>';
var row=document.createElement('div');row.className='tints';
pdTints().forEach(function(t,i){var b=document.createElement('button');b.type='button';b.className='tint'+((mm.tint||0)===i?' on':'');b.setAttribute('data-own',seat);
var src=t.d?tintedSpr(pl.ship,seat,t.d).n:(SPR.ships[pl.ship]||SPR.ships.std)[seat?1:0].n;
var sc=Math.max(1,Math.floor(44/src.width));var cv=mkC(Math.max(44,src.width*sc+6),Math.max(24,src.height*sc+4));
cv.style.width='44px';cv.style.height='auto';b.appendChild(cv);
PREVIEWS.push({cv:cv,ship:pl.ship,idx:seat,deg:t.d,ph:i*.7});
var s=document.createElement('s');s.textContent=t.n;b.appendChild(s);
b.addEventListener('click',function(){mm.tint=i;saveMeta();recalcPlayer(pl);buildTitleCols();A.init();A.tone(600,.05,'square',.06,1.25,0,'ui')});
row.appendChild(b)});
wrap.appendChild(row);return wrap}
function buildTitleCols(){var root=$('#titleCols');if(!root)return;PREVIEWS=[];var seats=isLocal()?[0,1]:[0];root.className=seats.length>1?'cols':'cols solo';root.innerHTML='';
seats.forEach(function(seat){var mm=seatMeta(seat),pl=seat===1?P2:P,col=document.createElement('div');col.className='pcol';col.style.borderColor=pl.col;var head=document.createElement('div');head.className='phead';head.style.color=pl.col;head.innerHTML='<span>ИГРОК '+(seat+1)+'</span><em>⬡ '+mm.frag+'</em>';col.appendChild(head);var pow=0;for(var k in mm.perm)pow+=mm.perm[k];var st=document.createElement('div');st.className='pstat';st.innerHTML='<span>улучшений <b>'+pow+'</b></span><span>модулей <b>'+mm.unlocked.length+'/'+LOCKED.length+'</b></span><span>кораблей <b>'+mm.ships.length+'/'+SHIPS.length+'</b></span>';col.appendChild(st);
var sl=document.createElement('div');sl.className='set';sl.style.marginTop='4px';sl.innerHTML='<span>КОРАБЛЬ</span>';var pills=document.createElement('div');pills.className='pills';SHIPS.forEach(function(s){var owned=mm.ships.indexOf(s.id)>=0,needBp=shipNeedsBp(s.id),hasBp=mm.bp.indexOf('ship:'+s.id)>=0,b=document.createElement('button');b.className='pill'+(mm.ship===s.id?' on':'');b.type='button';b.setAttribute('data-own',seat);var note=owned?(s.id==='std'?'базовый':'куплен'):(needBp?(hasBp?'чертёж найден · '+s.cost+'⬡':'нужен чертёж'):'закрыт · '+s.cost+'⬡');b.innerHTML=s.n+'<small>'+note+'</small>';b.disabled=!owned;b.addEventListener('click',function(){if(!owned)return;mm.ship=s.id;saveMeta();pl.ship=s.id;pl.lvl=shipStart(s.id);recalcPlayer(pl);buildTitleCols();A.init();A.tone(520,.07,'square',.08,1.3,0,'ui')});pills.appendChild(b)});sl.appendChild(pills);col.appendChild(sl);
col.appendChild(buildTintRow(seat,mm,pl));
var info=document.createElement('div');info.className='sub';info.style.margin='0';info.textContent=shipDesc(mm.ship);col.appendChild(info);root.appendChild(col)});syncBest()}
function shipDesc(id){for(var i=0;i<SHIPS.length;i++)if(SHIPS[i].id===id)return SHIPS[i].d;return ''}
function buildModePills(){var el=$('#modePills');if(!el)return;el.innerHTML='';[['story','ЗАБЕГ · 30 УРОВНЕЙ'],['end','БЕСКОНЕЧНЫЙ']].forEach(function(m){var b=document.createElement('button');b.className='pill'+((m[0]==='end')===G.endless?' on':'');b.type='button';b.setAttribute('data-own','0');b.textContent=m[1];b.addEventListener('click',function(){G.endless=m[0]==='end';buildModePills();A.init();A.tone(560,.06,'square',.06,1.2,0,'ui')});el.appendChild(b)})}
function glossCanvas(src,scale,locked){var c=mkC(src.width*scale,src.height*scale),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(src,0,0,c.width,c.height);if(locked){g.globalCompositeOperation='source-atop';g.fillStyle='#2a1856';g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over'}c.style.width=c.width+'px';c.style.height=c.height+'px';return c}
var GLQ={cv:null,t:0};
function drawGlitchQ(cv){var g=cv.getContext('2d'),w=cv.width,h=cv.height;g.clearRect(0,0,w,h);
var t=GLQ.t,jx=Math.round(Math.sin(t*13)*2),jy=Math.round(Math.cos(t*9)*1);
var Q=['.XXXX.','XX..XX','....XX','...XX.','..XX..','..XX..','......','..XX..','..XX..'];
function draw(ox,oy,col){g.fillStyle=col;for(var y=0;y<Q.length;y++)for(var x=0;x<Q[y].length;x++)if(Q[y][x]==='X')g.fillRect(ox+x*5,oy+y*5,5,5)}
g.globalAlpha=.75;draw(6+jx-2,8+jy,'#ff2fb0');draw(6+jx+2,8+jy,'#22e6ff');g.globalAlpha=1;draw(6+jx,8+jy,'#f4ecff');
g.globalAlpha=.5;for(var i=0;i<5;i++){var by=Math.floor((Math.sin(t*7+i*2.1)*.5+.5)*h);g.fillStyle=i%2?'#22e6ff':'#ff2f4f';g.fillRect(0,by,w,1+((i+Math.floor(t*8))%2))}
g.globalAlpha=1}
function drawGlossSprite(en,t){var cv=en.cv,g=cv.getContext('2d'),src=en.src,sc=en.sc;
g.imageSmoothingEnabled=false;g.clearRect(0,0,cv.width,cv.height);
var bob=Math.round(Math.sin(t*2.4+en.ph)*sc);
g.drawImage(src,0,bob,cv.width,cv.height);
if(en.flash>0){g.globalAlpha=en.flash;g.globalCompositeOperation='lighter';g.drawImage(src,0,bob,cv.width,cv.height);g.globalCompositeOperation='source-over';g.globalAlpha=1}
g.globalAlpha=.10;g.fillStyle='#22e6ff';var sy=Math.floor(((t*.35+en.ph*.2)%1)*cv.height);g.fillRect(0,sy,cv.width,sc);g.globalAlpha=1}
function locSource(t){var c=mkC(26,26),g=c.getContext('2d');g.imageSmoothingEnabled=false;nodeIcon(g,13,13,10,{type:t==='boss'?'boss':t,boss:t==='boss'?'guardian':null});return c}
function glossCard(cv,name,sub,desc,locked,boss){var d=document.createElement('div');d.className='gcard'+(locked?' lock':'')+(boss?' boss':'');d.appendChild(cv);var tx=document.createElement('div');tx.className='gtxt';var b=document.createElement('b');b.textContent=locked?'???':name;tx.appendChild(b);var i=document.createElement('i');i.textContent=locked?'НЕ ВСТРЕЧЕН':sub;tx.appendChild(i);var p=document.createElement('p');p.textContent=locked?'Запись появится после первой встречи.':desc;tx.appendChild(p);d.appendChild(tx);return d}
function buildGloss(){var tabs=$('#glossTabs'),body=$('#glossBody'),prog=$('#glossProg');if(!tabs||!body)return;
var GD=(PD.gloss)||{loc:[],ene:{},bo:{}};GLQ.cv=null;GLOSSANIM=[];
tabs.innerHTML='';[['all','ВСЁ'],['loc','ЛОКАЦИИ'],['ene','ВРАГИ'],['boss','БОССЫ']].forEach(function(t){var b=document.createElement('button');b.className='pill'+(G.glossTab===t[0]?' on':'');b.type='button';b.setAttribute('data-own','0');b.textContent=t[1];b.addEventListener('click',function(){G.glossTab=t[0];buildGloss();A.init();A.tone(560,.05,'square',.06,1.2,0,'ui')});tabs.appendChild(b)});
var eS=0;for(var q=0;q<GLOSS_E.length;q++)if(SEEN.e[GLOSS_E[q]])eS++;var bK=Object.keys(GD.bo),bS=0;for(var w=0;w<bK.length;w++)if(SEEN.b[bK[w]])bS++;prog.innerHTML='Встречено врагов: <b>'+eS+'/'+GLOSS_E.length+'</b> · боссов: <b>'+bS+'/'+bK.length+'</b>';body.innerHTML='';
if(G.glossTab==='all'||G.glossTab==='loc'){var h=document.createElement('div');h.className='gsec';h.textContent='ИКОНЫ ЛОКАЦИЙ';body.appendChild(h);var g1=document.createElement('div');g1.className='ggrid';GD.loc.forEach(function(L){g1.appendChild(glossCard(glossCanvas(locSource(L.t),3,false),L.n,L.s,L.d,false,L.t==='boss'))});body.appendChild(g1)}
if(G.glossTab==='all'||G.glossTab==='ene'){var h2=document.createElement('div');h2.className='gsec';h2.textContent='ВРАГИ АРЕНЫ';body.appendChild(h2);var g2=document.createElement('div');g2.className='ggrid';
GLOSS_E.forEach(function(k){var info=GD.ene[k];if(!info)return;var seen=!!SEEN.e[k],cv;
if(k==='dark'){cv=mkC(60,60);cv.style.width='60px';cv.style.height='60px';cv.style.imageRendering='pixelated';drawGlitchQ(cv);GLQ.cv=cv}
else{var src=SPR[k]||SPR.grunt,sc=Math.max(2,Math.min(5,Math.round(60/Math.max(src.width,src.height))));cv=glossCanvas(src.n,sc,!seen);
if(seen)GLOSSANIM.push({cv:cv,src:src.n,sc:sc,ph:GLOSSANIM.length*.6,flash:0,next:rand(2,6)})}
g2.appendChild(glossCard(cv,info.n,info.s,info.d,!seen,false))});body.appendChild(g2)}
if(G.glossTab==='all'||G.glossTab==='boss'){var h3=document.createElement('div');h3.className='gsec';h3.textContent='БОССЫ';body.appendChild(h3);var g3=document.createElement('div');g3.className='ggrid';Object.keys(GD.bo).forEach(function(k){var info=GD.bo[k],src=SPR.bosses[k]||SPR.boss,seen=!!SEEN.b[k],cv=glossCanvas(src.n,2,!seen);
if(seen)GLOSSANIM.push({cv:cv,src:src.n,sc:2,ph:GLOSSANIM.length*.6,flash:0,next:rand(2,6)});
g3.appendChild(glossCard(cv,info.n,'босс',info.d,!seen,true))});body.appendChild(g3)}}
function applyDarkCheat(){if(!G.map)return;var cur=getNode(G.curNode),cd=cur?cur.d:0;for(var d=0;d<G.map.length;d++)for(var i=0;i<G.map[d].length;i++){var n=G.map[d][i];if(n.type==='boss'||n.d<=cd)continue;n.type=CHEAT.dark?'dark':'std'}}
function applyFullMap(){if(!G.map||!G.map.length)return;var cd=getNode(G.curNode)?getNode(G.curNode).d:1;
extendMap(G.endless?Math.max(G.map.length,cd+20):MAX_WAVE)}
function syncCheatUI(){var box=$('#sPause .box');if(!box)return;var wrap=$('#cheatRow');
if(!CHEAT.god&&!CHEAT.dark&&!CHEAT.fullmap){if(wrap&&wrap.parentNode)wrap.parentNode.removeChild(wrap);return}
if(!wrap){wrap=document.createElement('div');wrap.id='cheatRow';wrap.className='row';box.appendChild(wrap)}wrap.innerHTML='';
function cb(label,fn){var b=document.createElement('button');b.className='btn';b.setAttribute('data-own','0');b.textContent=label;b.addEventListener('click',fn);wrap.appendChild(b)}
if(CHEAT.god)cb('БЕССМЕРТИЕ: ВКЛ',function(){CHEAT.god=false;recalc();syncCheatUI()});
if(CHEAT.dark)cb('ТЁМНЫЙ МИР: ВКЛ',function(){CHEAT.dark=false;applyDarkCheat();syncCheatUI()});
if(CHEAT.fullmap)cb('ВСЯ КАРТА: ВКЛ',function(){CHEAT.fullmap=false;syncCheatUI()})}
function wipeProgress(){META=metaDefault();META2=metaDefault();saveMeta();SEEN={e:{},b:{}};saveSeen();storeSet('merchMet',false);tutReset();storeSet('best',{score:0,wave:0});G.best={score:0,wave:0};P.lvl={};P2.lvl={};P.shards=0;P2.shards=0;P.frags=0;P2.frags=0;G.frags=0;G.shards=0;recalc();buildTitleCols();buildShop();syncBest()}
function tryCheat(){var el=$('#mpCode');if(!el)return false;var raw=(el.value||'').trim();if(!raw)return false;var s=raw.toLowerCase(),m;
if(s==='god666'){CHEAT.god=!CHEAT.god;recalc();syncCheatUI();el.value='';return true}
if(s==='darkworld8'){CHEAT.dark=!CHEAT.dark;applyDarkCheat();syncCheatUI();el.value='';return true}
if(s==='fullmap8'){CHEAT.fullmap=!CHEAT.fullmap;if(CHEAT.fullmap)applyFullMap();syncCheatUI();el.value='';return true}
if(s==='clear67'){wipeProgress();el.value='';return true}
if(s==='allships'){META.ships=SHIPS.map(function(x){return x.id});META2.ships=SHIPS.map(function(x){return x.id});saveMeta();buildTitleCols();buildShop();syncBest();el.value='';return true}
m=s.match(/^(\d+)fragments$/);if(m){var pl=localPlayer();addBank(pl,parseInt(m[1],10));G.frags=pl.frags;syncBest();buildShop();buildTitleCols();el.value='';return true}
m=s.match(/^(\d+)shard$/);if(m){var n=parseInt(m[1],10);if(G.state==='title'){META.bonusShards=(META.bonusShards||0)+n;saveMeta()}else{localPlayer().shards+=n;G.shards=localPlayer().shards}el.value='';return true}return false}
function screenToWorld(px,py){var z=G.zoom||1,cx=W/2,cy=H/2;return{x:(px-cx)/z+cx+CAM.x,y:(py-cy)/z+cy+CAM.y}}
function mapClick(px,py){var wx=px+G.mapCam,wy=py,reach=reachableNodes();for(var i=0;i<reach.length;i++){var n=reach[i],nx=60+n.d*70,ny=H/2+(n.row-(G.map[n.d-1].length-1)/2)*70;if(hyp(wx-nx,wy-ny)<24){trySelectNode(n.id);return}}}
function initInput(canvas){var lastTap=0,lastSide='';
function onKeyDown(e){var tag=(e.target&&e.target.tagName)||'';if(tag==='INPUT')return;musUnlock();if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Slash'].indexOf(e.code)>=0)e.preventDefault();var rep=e.repeat;keys[e.code]=true;A.init();A.resume();
if(e.code==='KeyM'&&!rep){toggleSound();return}if((e.code==='KeyP'||e.code==='Escape')&&!rep){if(G.state==='play')pause();else if(G.state==='pause')resume();else if(G.state==='gloss')setState('title');return}
if(e.code==='KeyR'&&!rep){if(G.state!=='title'&&G.state!=='gloss')newRun();return}
if((G.state==='title'||G.state==='over'||G.state==='win')&&(e.code==='Enter'||e.code==='Space')&&!rep&&!isLocal()){newRun();return}
if(G.state==='up'){var idx={Digit1:0,Digit2:1,Digit3:2}[e.code];if(idx!==undefined&&!rep){if(NET.mode==='guest')netSend({t:'choose',i:idx});else choose(idx,P)}var idx2={Digit8:0,Digit9:1,Digit0:2}[e.code];if(idx2!==undefined&&!rep&&isLocal())choose(idx2,P2);return}
if(G.state==='play'){if(e.code==='Space'&&!rep)LI.dash=true;if((e.code==='KeyQ'||e.code==='KeyE')&&!rep)LI.cycle=true;if(isLocal()){if(e.code==='Enter'&&!rep)K2.dash=true;if((e.code==='Slash'||e.code==='Numpad0'||e.code==='ControlRight')&&!rep)K2.weapon=true;if(e.code==='Period'&&!rep)K2.cycle=true}}}
function onKeyUp(e){keys[e.code]=false}
function onBlur(){for(var k in keys)keys[k]=false;resetSticks();activePtr={};mouseRightHeld=false;G.mapDrag.active=false;LI.dash=false;LI.weapon=false;LI.cycle=false;K2.dash=false;K2.weapon=false;K2.cycle=false;if(G.state==='play'&&NET.mode!=='guest'&&!isLocal())pause()}
function toLogical(e){var r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/canvas.SCALE,y:(e.clientY-r.top)/canvas.SCALE}}
function onDown(e){A.init();A.resume();musUnlock();activePtr[e.pointerId]=1;try{canvas.setPointerCapture(e.pointerId)}catch(err){}var p=toLogical(e);
if(G.state==='map'){G.mapDrag={active:true,startX:p.x,startCam:G.mapCam,moved:false,id:e.pointerId};return}
if(e.pointerType==='touch'){var side=p.x<W*.5?'L':'R',now=performance.now();if(now-lastTap<300&&lastSide===side){if(side==='L')LI.dash=true;else LI.weapon=true;lastTap=0}else{lastTap=now;lastSide=side}var s=side==='L'?sticks.move:sticks.aim;if(s.id!==null&&s.id!==e.pointerId&&!activePtr[s.id])clearStick(s.id);if(s.id===null){s.id=e.pointerId;s.ox=p.x;s.oy=p.y;s.dx=0;s.dy=0;s.m=0}}
else{mx=p.x;my=p.y;mouseT=G.t;if(e.button===0)LI.weapon=true;if(e.button===2){LI.dash=true;mouseRightHeld=true}}}
function onMove(e){var p=toLogical(e);if(G.state==='map'&&G.mapDrag.active&&G.mapDrag.id===e.pointerId){var dx=p.x-G.mapDrag.startX;if(Math.abs(dx)>6)G.mapDrag.moved=true;G.mapCam=clamp(G.mapDrag.startCam-dx,0,mapSpan()*70-W+80);return}if(e.pointerType!=='touch'){mx=p.x;my=p.y;mouseT=G.t;return}activePtr[e.pointerId]=1;['move','aim'].forEach(function(k){var s=sticks[k];if(s.id!==e.pointerId)return;var dx=p.x-s.ox,dy=p.y-s.oy,d=Math.sqrt(dx*dx+dy*dy),max=22;if(d>max){s.ox=p.x-dx/d*max;s.oy=p.y-dy/d*max;dx=dx/d*max;dy=dy/d*max}s.dx=dx/max;s.dy=dy/max;s.m=Math.min(Math.max(d/max,0),1)})}
function onUp(e){delete activePtr[e.pointerId];if(G.state==='map'){if(G.mapDrag.active&&G.mapDrag.id===e.pointerId){var p=toLogical(e);if(!G.mapDrag.moved)mapClick(p.x,p.y);G.mapDrag.active=false}return}if(e.pointerType==='touch')clearStick(e.pointerId);else if(e.button===2)mouseRightHeld=false}
window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',onBlur);
window.addEventListener('pointermove',function(e){MER.mx=e.clientX;MER.my=e.clientY},true);
canvas.addEventListener('contextmenu',function(e){e.preventDefault()});canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
canvas.addEventListener('lostpointercapture',function(e){delete activePtr[e.pointerId];clearStick(e.pointerId)});
window.addEventListener('pointerup',function(e){delete activePtr[e.pointerId];clearStick(e.pointerId)},true);window.addEventListener('pointercancel',function(e){delete activePtr[e.pointerId];clearStick(e.pointerId)},true);
window.addEventListener('touchend',function(e){if(!e.touches||e.touches.length===0){resetSticks();activePtr={}}},true);window.addEventListener('touchcancel',function(){resetSticks();activePtr={}},true);
canvas.addEventListener('wheel',function(e){if(G.state==='map'){e.preventDefault();G.mapCam=clamp(G.mapCam+e.deltaY*.5,0,mapSpan()*70-W+80)}else if(G.state==='play'){e.preventDefault();LI.cycle=true}},{passive:false});
document.addEventListener('pointerdown',function(){A.init();A.resume();musUnlock()},{once:true});window.addEventListener('keydown',function(){musUnlock()},{once:true});window.addEventListener('touchstart',function(){musUnlock()},{once:true,passive:true})}
function stickWatch(){['move','aim'].forEach(function(k){var s=sticks[k];if(s.id!==null&&!activePtr[s.id])clearStick(s.id)})}
function ownedButtons(root,seat){return [].slice.call(root.querySelectorAll('button:not(:disabled),a.btn')).filter(function(b){if(b.offsetParent===null)return false;var o=b.getAttribute('data-own');if(seat===1)return o==='1';return o!=='1'})}
function markSel(btns,idx){for(var i=0;i<btns.length;i++)btns[i].classList.toggle('padsel',i===idx)}
function clearSel(){var r=SCR[G.state];if(!r)return;var root=$(r);if(!root)return;var l=root.querySelectorAll('.padsel');for(var i=0;i<l.length;i++)l[i].classList.remove('padsel')}
function navList(g,btns,owner){if(!g.active||!btns.length)return;if(owner.padSel>=btns.length)owner.padSel=0;var before=owner.padSel;if(g.down||g.right){owner.padSel=(owner.padSel+1)%btns.length;A.tone(520,.03,'square',.05,1,0,'ui')}if(g.up||g.left){owner.padSel=(owner.padSel-1+btns.length)%btns.length;A.tone(520,.03,'square',.05,1,0,'ui')}markSel(btns,owner.padSel);if(before!==owner.padSel){try{btns[owner.padSel].scrollIntoView({block:'nearest'})}catch(e){}}if(g.ok){btns[owner.padSel].click();A.tone(760,.05,'square',.07,1.2,0,'ui')}}
function padMenus(){if(!GP.active&&!GP2.active){clearSel();return}
if(G.state==='map'){var g=GP;if(!g.active||NET.mode==='guest')return;var reach=reachableNodes();if(!reach.length)return;if(g.right||g.down)G.mapSel=(G.mapSel+1)%reach.length;if(g.left||g.up)G.mapSel=(G.mapSel-1+reach.length)%reach.length;G.mapSel=clamp(G.mapSel,0,reach.length-1);var n=reach[G.mapSel];G.mapCam=clamp(60+n.d*70-W/2,0,mapSpan()*70-W+80);if(g.ok)trySelectNode(n.id);return}
if(G.state==='up'){var root=$('#sUp');if(!root)return;var pi0=NET.mode==='guest'?1:0;navList(GP,ownedButtons(root,pi0),PL[pi0]||P);if(isLocal())navList(GP2,ownedButtons(root,1),P2);return}
if(G.state==='shop'||G.state==='title'||G.state==='gloss'){var sr=$(SCR[G.state]);if(!sr)return;navList(GP,ownedButtons(sr,0),P);if(isLocal()&&G.state!=='gloss')navList(GP2,ownedButtons(sr,1),P2);if(GP.back){if(G.state==='shop')$('#bToMap').click();else if(G.state==='gloss')setState('title')}return}
var sel=SCR[G.state];if(!sel||!GP.active)return;var box=$(sel);if(!box)return;var btns=ownedButtons(box,0);if(!btns.length)return;if(G.padSel>=btns.length)G.padSel=0;var before=G.padSel;if(GP.down||GP.right)G.padSel=(G.padSel+1)%btns.length;if(GP.up||GP.left)G.padSel=(G.padSel-1+btns.length)%btns.length;markSel(btns,G.padSel);if(before!==G.padSel){try{btns[G.padSel].scrollIntoView({block:'nearest'})}catch(e){}}if(GP.ok)btns[G.padSel].click();if(GP.back&&G.state==='pause')resume()}
var starLayers=[],comets=[],bloomCv=null,bloomCtx=null,visualT=0;
function initBackground(ctx){starLayers=[];for(var L=0;L<3;L++){var arr=[],n=[46,32,20][L];for(var i=0;i<n;i++)arr.push({x:randi(0,W-1),y:randi(0,H-1),c:pick(THEME.st),p:rand(0,TAU),s:L===2?2:1});starLayers.push(arr)}comets=[]}
function updateVisual(dt){visualT+=dt;if(G.glitch>0)G.glitch-=dt;if(Math.random()<dt*.12&&comets.length<2){var e=Math.random()<.5;comets.push({x:e?rand(-40,W):rand(0,W),y:e?rand(0,H*.5):rand(-30,0),vx:rand(60,120)*(Math.random()<.5?-1:1),vy:rand(40,90),l:rand(1.2,2),m:2})}for(var i=comets.length-1;i>=0;i--){var c=comets[i];c.l-=dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.l<=0)comets.splice(i,1)}}
function drawParallax(ctx,cam,vx,vy,vw,vh){ctx.save();ctx.beginPath();ctx.rect(vx,vy,vw,vh);ctx.clip();for(var L=0;L<starLayers.length;L++){var depth=[.06,.14,.26][L],arr=starLayers[L];for(var i=0;i<arr.length;i++){var st=arr[i],tw=.4+.6*Math.abs(Math.sin(visualT*(.8+L*.4)+st.p));ctx.globalAlpha=tw*(.35+L*.2);ctx.fillStyle=st.c;var x=vx+(((Math.round(st.x-cam.x*depth)%vw)+vw)%vw),y=vy+(((Math.round(st.y-cam.y*depth)%vh)+vh)%vh);ctx.fillRect(x,y,st.s,st.s)}}ctx.globalAlpha=1;for(i=0;i<comets.length;i++){var c=comets[i],a=clamp(c.l/c.m,0,1);line(ctx,vx+c.x,vy+c.y,vx+c.x-c.vx*.12,vy+c.y-c.vy*.12,THEME.pal.c,1,a*.5)}ctx.restore()}
function setupBloom(){bloomCv=mkC(Math.max(1,Math.ceil(W/3)),Math.max(1,Math.ceil(H/3)));bloomCtx=bloomCv.getContext('2d')}
function applyBloom(ctx){if(!bloomOn||!bloomCv)return;var bw=bloomCv.width,bh=bloomCv.height;bloomCtx.clearRect(0,0,bw,bh);bloomCtx.drawImage(cv,0,0,bw,bh);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.34;try{ctx.filter='blur(2px)'}catch(e){}ctx.drawImage(bloomCv,0,0,W,H);ctx.filter='none';ctx.restore()}
function drawGlitch(ctx){if(G.glitch<=0)return;var a=clamp(G.glitch/2.4,0,1);ctx.save();ctx.globalAlpha=a*.5;for(var i=0;i<16;i++){var y=randi(0,H),h=randi(1,5),off=randi(-8,8);ctx.drawImage(cv,0,y,W,h,off,y,W,h)}ctx.globalAlpha=a*.22;ctx.fillStyle='#ff2f4f';for(i=0;i<40;i++)ctx.fillRect(randi(0,W),randi(0,H),randi(2,26),1);ctx.globalAlpha=a*.16;ctx.fillStyle='#22e6ff';for(i=0;i<24;i++)ctx.fillRect(randi(0,W),randi(0,H),randi(2,18),1);ctx.restore()}
function drawChronoScreen(ctx){if(!chronoAnyGlobal())return;var t=0;for(var i=0;i<G.chronoFields.length;i++)if(G.chronoFields[i].g)t=Math.max(t,G.chronoFields[i].t);ctx.save();var a=clamp(t/3,0,1);ctx.globalAlpha=.1*a;ctx.fillStyle='#4d8cff';ctx.fillRect(0,0,W,H);ctx.globalAlpha=.55*a;ctx.lineWidth=2;ctx.strokeStyle='#4d8cff';ctx.strokeRect(1,1,W-2,H-2);ctx.strokeStyle='#ff2fb0';ctx.strokeRect(3,3,W-6,H-6);ctx.globalAlpha=.9;txt(ctx,'ПОЛЕ ВРЕМЕНИ '+t.toFixed(1)+'С',W/2,H-30,'#4d8cff',13,'center');ctx.restore()}
function drawTravel(ctx){ctx.fillStyle=THEME.v;ctx.fillRect(0,0,W,H);var cx=W/2,cy=H/2;for(var i=0;i<60;i++){var a=(i/60)*TAU+visualT*.6,r=((visualT*140+i*37)%Math.max(W,H)),x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;ctx.globalAlpha=clamp(r/Math.max(W,H),0,1)*.7;ctx.fillStyle=i%3?THEME.pal.c:'#fff';ctx.fillRect(Math.round(x),Math.round(y),2,2)}ctx.globalAlpha=1;pxCircle(ctx,cx,cy,20+Math.sin(visualT*6)*4,THEME.pal.c,.6);pxCircle(ctx,cx,cy,10,'#fff',.8);drawSpr(ctx,playerSprT(viewPlayer()),cx,cy,-Math.PI/2,false,1);txt(ctx,'ПЕРЕЛЁТ',cx,cy+34,THEME.pal.c,14,'center')}
function nodeColor(n){return n.type==='boss'?(n.boss==='hive'?'#9dff3c':{guardian:'#ff4d4d',prism:'#22e6ff',hammer:'#ffb020',eye:'#a86bff',phantom:'#ff2fb0',twins:'#b8fbff'}[n.boss]||'#ff4d4d'):n.type==='bomb'?'#9dff3c':n.type==='snipe'?'#a86bff':n.type==='laser'?'#22e6ff':n.type==='bigship'?'#ffb020':n.type==='mystery'?'#6b6a8a':n.type==='dark'?'#7a4ad6':n.type==='rand'?'#ffb020':'#4d8cff'}
function nodeIcon(ctx,x,y,r,n){var c=nodeColor(n),o=PAL.o;
if(n.type==='boss'){var k=n.boss,i;if(k==='guardian'){ctx.fillStyle=o;ctx.fillRect(x-8,y-9,16,18);ctx.fillStyle=c;ctx.fillRect(x-7,y-8,14,13);ctx.fillStyle=o;ctx.fillRect(x-3,y-4,6,8);ctx.fillStyle='#fff';ctx.fillRect(x-1,y-2,2,4);ctx.fillStyle=c;ctx.fillRect(x-5,y+5,10,3)}
else if(k==='prism'){ctx.fillStyle=o;for(i=-9;i<=9;i++){var w=9-Math.abs(i);ctx.fillRect(x-w,y+i,w*2+1,1)}ctx.fillStyle=c;for(i=-7;i<=7;i++){var w2=7-Math.abs(i);ctx.fillRect(x-w2,y+i,w2*2+1,1)}ctx.fillStyle='#fff';ctx.fillRect(x-2,y-2,4,4)}
else if(k==='hammer'){ctx.fillStyle=o;ctx.fillRect(x-9,y-8,18,9);ctx.fillStyle=c;ctx.fillRect(x-8,y-7,16,7);ctx.fillStyle=o;ctx.fillRect(x-2,y+1,4,9);ctx.fillStyle='#8f5a10';ctx.fillRect(x-1,y+2,2,8)}
else if(k==='eye'){ctx.fillStyle=o;ctx.fillRect(x-9,y-6,18,12);ctx.fillStyle=c;ctx.fillRect(x-8,y-5,16,10);ctx.fillStyle='#fff';ctx.fillRect(x-4,y-3,8,6);ctx.fillStyle=o;ctx.fillRect(x-2,y-2,4,4)}
else if(k==='twins'){ctx.fillStyle=o;ctx.fillRect(x-10,y-7,9,14);ctx.fillRect(x+1,y-7,9,14);ctx.fillStyle='#a86bff';ctx.fillRect(x-9,y-6,7,12);ctx.fillStyle='#b8fbff';ctx.fillRect(x+2,y-6,7,12);ctx.fillStyle='#fff';ctx.fillRect(x-7,y-2,3,3);ctx.fillRect(x+4,y-2,3,3)}
else if(k==='phantom'){ctx.fillStyle=o;ctx.fillRect(x-8,y-9,16,15);ctx.fillStyle=c;ctx.fillRect(x-7,y-8,14,13);ctx.fillStyle=o;ctx.fillRect(x-4,y-4,3,4);ctx.fillRect(x+1,y-4,3,4);ctx.fillStyle=c;for(i=0;i<3;i++)ctx.fillRect(x-7+i*5,y+5,3,4)}
else{ctx.fillStyle=o;ctx.fillRect(x-9,y-9,18,18);ctx.fillStyle=c;for(var q=0;q<3;q++)for(var w3=0;w3<3;w3++)if((q+w3)%2===0)ctx.fillRect(x-8+w3*5,y-8+q*5,4,4);ctx.fillStyle='#fff';ctx.fillRect(x-2,y-2,4,4)}return}
if(n.type==='bigship'){ctx.fillStyle=o;ctx.fillRect(x-12,y-4,24,8);ctx.fillStyle=c;ctx.fillRect(x-11,y-3,22,6);ctx.fillStyle=o;ctx.fillRect(x+8,y-2,4,4);ctx.fillStyle='#fff';ctx.fillRect(x-7,y-1,2,2);ctx.fillRect(x-3,y-1,2,2);ctx.fillRect(x+1,y-1,2,2);ctx.fillStyle='#22e6ff';ctx.fillRect(x-13,y-2,2,4);return}
if(n.type==='std'){ctx.fillStyle=o;ctx.fillRect(x-8,y-8,16,16);ctx.fillStyle=c;ctx.fillRect(x-7,y-7,14,14);ctx.fillStyle=o;ctx.fillRect(x-4,y-4,8,8);ctx.fillStyle=c;ctx.fillRect(x-2,y-2,4,4)}
else if(n.type==='bomb'){ctx.fillStyle=o;ctx.fillRect(x-7,y-4,14,12);ctx.fillStyle=c;ctx.fillRect(x-6,y-3,12,10);ctx.fillStyle='#fff';ctx.fillRect(x-4,y-1,3,3);ctx.fillStyle='#8f5a10';ctx.fillRect(x+2,y-8,2,5);ctx.fillStyle='#ffb020';ctx.fillRect(x+3,y-10,3,3)}
else if(n.type==='snipe'){ctx.fillStyle=c;ctx.fillRect(x-9,y-1,18,2);ctx.fillRect(x-1,y-9,2,18);ctx.fillStyle=o;ctx.fillRect(x-5,y-5,10,10);ctx.fillStyle=c;ctx.fillRect(x-4,y-4,8,8);ctx.fillStyle=o;ctx.fillRect(x-2,y-2,4,4);ctx.fillStyle='#ff4d4d';ctx.fillRect(x-1,y-1,2,2)}
else if(n.type==='laser'){ctx.fillStyle=c;for(var a=0;a<8;a++){var an=a*TAU/8;for(var t=3;t<10;t++)ctx.fillRect(Math.round(x+Math.cos(an)*t),Math.round(y+Math.sin(an)*t),1,1)}ctx.fillStyle=o;ctx.fillRect(x-4,y-4,8,8);ctx.fillStyle='#fff';ctx.fillRect(x-2,y-2,4,4)}
else if(n.type==='mystery'){ctx.fillStyle=o;for(var i2=-8;i2<=8;i2++){var w4=8-Math.abs(i2);ctx.fillRect(x-w4,y+i2,w4*2+1,1)}ctx.fillStyle='#3a2a6a';for(i2=-6;i2<=6;i2++){var w5=6-Math.abs(i2);ctx.fillRect(x-w5,y+i2,w5*2+1,1)}txt(ctx,'?',x,y-6,'#c9b8ff',13,'center')}
else if(n.type==='dark'){ctx.fillStyle='#12081f';ctx.fillRect(x-8,y-9,16,16);ctx.fillStyle=c;ctx.fillRect(x-7,y-8,14,12);ctx.fillStyle='#ff2f4f';ctx.fillRect(x-5,y-4,4,4);ctx.fillRect(x+1,y-4,4,4);ctx.fillStyle='#12081f';ctx.fillRect(x-4,y+2,8,2);ctx.fillStyle=c;ctx.fillRect(x-6,y+5,3,3);ctx.fillRect(x+3,y+5,3,3)}
else if(n.type==='rand'){ctx.fillStyle=o;ctx.fillRect(x-8,y-8,16,16);ctx.fillStyle=c;ctx.fillRect(x-7,y-7,14,14);ctx.fillStyle=o;ctx.fillRect(x-4,y-4,3,3);ctx.fillRect(x+1,y-4,3,3);ctx.fillRect(x-1,y-1,3,3);ctx.fillRect(x-4,y+2,3,3);ctx.fillRect(x+1,y+2,3,3)}
else{ctx.fillStyle=o;ctx.fillRect(x-7,y-7,14,14);ctx.fillStyle=c;ctx.fillRect(x-6,y-6,12,12)}}
function drawMap(ctx){ctx.fillStyle=THEME.v;ctx.fillRect(0,0,W,H);drawParallax(ctx,CAM,0,0,W,H);var curD=getNode(G.curNode)?getNode(G.curNode).d:1,reach=reachableNodes(),rids=reach.map(function(n){return n.id}),selNode=reach[clamp(G.mapSel,0,Math.max(0,reach.length-1))];ctx.save();ctx.translate(-G.mapCam,0);
for(var d=0;d<G.map.length-1;d++)for(var i=0;i<G.map[d].length;i++){var n=G.map[d][i];for(var j=0;j<(n.next||[]).length;j++){var m=getNode(n.next[j]);if(!m)continue;var x1=60+n.d*70,y1=H/2+(n.row-(G.map[n.d-1].length-1)/2)*70,x2=60+m.d*70,y2=H/2+(m.row-(G.map[m.d-1].length-1)/2)*70,active=n.id===G.curNode,fog=!CHEAT.fullmap&&(m.d-curD)>2;line(ctx,x1,y1,x2,y2,fog?'#150a2e':(active?THEME.pal.c:THEME.eg),active?2:1,fog?.25:(active?.75:.35))}}
for(d=0;d<G.map.length;d++)for(i=0;i<G.map[d].length;i++){n=G.map[d][i];var x=60+n.d*70,y=H/2+(n.row-(G.map[d].length-1)/2)*70;if(x-G.mapCam<-40||x-G.mapCam>W+40)continue;var rel=n.d-curD,fog=!CHEAT.fullmap&&rel>2,isCur=n.id===G.curNode,isReach=rids.indexOf(n.id)>=0,r=n.type==='boss'?12:10;if(fog){pxDisc(ctx,x,y,r,'#0a0518',.92);pxCircle(ctx,x,y,r,'#241452',.5);txt(ctx,String(n.d),x,y-r-12,'#3a2a6a',11,'center');continue}if(isReach){ctx.globalAlpha=.35+.3*Math.sin(visualT*5);pxCircle(ctx,x,y,r+5,nodeColor(n),.6);ctx.globalAlpha=1}if(selNode&&n.id===selNode.id&&GP.active){ctx.save();ctx.globalAlpha=.9;pxCircle(ctx,x,y,r+8,'#9dff3c',.9);ctx.restore()}ctx.globalAlpha=isCur||isReach?1:.55;nodeIcon(ctx,Math.round(x),Math.round(y),r,n);if(isCur)pxCircle(ctx,x,y,r+2,'#fff',.8);ctx.globalAlpha=1;txt(ctx,String(n.d),x,y-r-12,isReach||isCur?THEME.ink:THEME.dim,11,'center')}
ctx.restore();txt(ctx,CHEAT.fullmap?'ВСЯ КАРТА ОТКРЫТА · прыгай куда хочешь':(G.endless?'БЕСКОНЕЧНЫЙ · листай карту':'ВЫБЕРИ МАРШРУТ · листай'),8,VIEW.y+4,CHEAT.fullmap?'#9dff3c':THEME.pal.c,14);
if(selNode){var nm=selNode.type==='boss'?(BOSS_NAMES[selNode.boss]||'БОСС'):levelTypeName(selNode.type);txt(ctx,nm+' · ур.'+selNode.d,8,VIEW.y+20,THEME.pal.a,13);nodeIcon(ctx,W-22,VIEW.y+16,10,selNode)}
var legend=[],seen={};for(i=0;i<reach.length;i++){var t=reach[i].type==='boss'?'boss':reach[i].type;if(!seen[t]){seen[t]=1;legend.push(reach[i])}}var lx=10,ly=H-20;for(i=0;i<legend.length&&i<5;i++){nodeIcon(ctx,lx+8,ly,8,legend[i]);var lb=legend[i].type==='boss'?'БОСС':levelTypeName(legend[i].type);txt(ctx,lb,lx+19,ly-6,THEME.dim,11);lx+=Math.min(120,26+lb.length*6)}}
function drawTransfer(ctx){var bw=132,bx=W/2-bw/2,by=VIEW.y+8;ctx.globalAlpha=.92;ctx.fillStyle=THEME.dp;ctx.fillRect(bx-3,by-3,bw+6,15);ctx.strokeStyle=THEME.pal.c;ctx.lineWidth=1;ctx.strokeRect(bx-2.5,by-2.5,bw+5,14);ctx.fillStyle=THEME.pal.c;ctx.fillRect(bx,by,bw*clamp(G.portalCharge/1.5,0,1),9);ctx.globalAlpha=1;txt(ctx,'ПЕРЕМЕЩЕНИЕ',W/2,by+14,THEME.pal.c,13,'center');txt(ctx,'стой неподвижно · авто через '+Math.max(0,Math.ceil(15-(G.portal?G.portal.age||0:0)))+'с',W/2,by+26,THEME.dim,11,'center')}
function drawCapTimer(ctx){var c=G.cap;if(!c||c.kind!=='doom'||c.boomed)return;var bw=Math.min(200,W*.7),bx=W/2-bw/2,by=VIEW.y+6,fr=clamp(c.t/c.maxT,0,1),danger=c.t<15;ctx.save();ctx.globalAlpha=.92;ctx.fillStyle=THEME.dp;ctx.fillRect(bx-3,by-3,bw+6,16);ctx.strokeStyle=danger?'#ff4d4d':'#ffb020';ctx.lineWidth=1;ctx.strokeRect(bx-2.5,by-2.5,bw+5,15);ctx.fillStyle=danger&&Math.floor(visualT*6)%2?'#ff4d4d':'#ffb020';ctx.fillRect(bx,by,bw*fr,10);ctx.globalAlpha=1;txt(ctx,'ВЗРЫВ ЧЕРЕЗ '+Math.ceil(c.t)+'С',W/2,by+13,danger?'#ff4d4d':'#ffb020',13,'center');ctx.restore()}
function drawPortalPointer(ctx){if(!G.portal||G.state!=='play')return;var z=G.zoom||1,p=G.portal;
var sx=(p.x-CAM.x-W/2)*z+W/2,sy=(p.y-CAM.y-H/2)*z+H/2;
var m=26;if(sx>m&&sx<W-m&&sy>VIEW.y+m&&sy<H-m)return;
var cx=W/2,cy=H/2,a=Math.atan2(sy-cy,sx-cx);
var rx=Math.min(W/2-m,H/2-m),px=cx+Math.cos(a)*rx*1.35,py=cy+Math.sin(a)*rx;
px=clamp(px,m,W-m);py=clamp(py,VIEW.y+m,H-m);
ctx.save();ctx.translate(px,py);ctx.rotate(a);
var pulse=.6+.4*Math.sin(visualT*6);ctx.globalAlpha=pulse;
ctx.fillStyle='#22e6ff';ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-6,-7);ctx.lineTo(-3,0);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();
ctx.restore();ctx.globalAlpha=.9;txt(ctx,'ПОРТАЛ',px,py+11,'#22e6ff',11,'center');ctx.globalAlpha=1}
function drawDmgMarks(ctx){if(!G.dmgMarks.length)return;var p=viewPlayer(),z=G.zoom||1;
var sx=(p.x-CAM.x-W/2)*z+W/2,sy=(p.y-CAM.y-H/2)*z+H/2,R=(p.r+13)*z;
for(var i=0;i<G.dmgMarks.length;i++){var m=G.dmgMarks[i],a=clamp(m.l/m.max,0,1);
ctx.save();ctx.globalAlpha=a*.85;ctx.strokeStyle='#ff4d4d';ctx.lineWidth=2.5;
ctx.beginPath();ctx.arc(sx,sy,R,m.a-.34,m.a+.34);ctx.stroke();
ctx.globalAlpha=a*.4;ctx.strokeStyle='#ffd9d9';ctx.lineWidth=1;
ctx.beginPath();ctx.arc(sx,sy,R+2,m.a-.22,m.a+.22);ctx.stroke();ctx.restore()}}
function drawSticks(ctx){if(!isTouch||G.state!=='play')return;['move','aim'].forEach(function(k){var s=sticks[k];if(s.id===null)return;var col=k==='move'?THEME.pal.c:PAL.m;pxCircle(ctx,s.ox,s.oy,22,col,.45);pxDisc(ctx,s.ox+s.dx*22,s.oy+s.dy*22,7,col,.75)})}
function camTargetFor(f,vx,vy,vw,vh,z){var cx=vx+vw/2,cy=vy+vh/2,hw=vw/(2*z),hh=vh/(2*z),lox=hw-cx,hix=AR.w-hw-cx,loy=hh-cy,hiy=AR.h-hh-cy,x=f.x-cx,y=f.y-cy;x=hix<lox?(lox+hix)/2:clamp(x,lox,hix);y=hiy<loy?(loy+hiy)/2:clamp(y,loy,hiy);return{x:x,y:y}}
function splitActive(){return isLocal()&&G.splitOn&&PL[0].hp>0&&PL[1].hp>0&&G.state==='play'}
var ELITE_NAMES=['ЩИТ','СКОРОСТЬ','ВАМП','ВЗРЫВ'];
function drawScythe(ctx,p,st,am){am=am==null?1:am;var R=st.scytheR,H2=st.scytheHalf;ctx.save();ctx.globalAlpha=.14*am;ctx.strokeStyle='#ff2fb0';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,R,p.aim-H2,p.aim+H2);ctx.stroke();if(p.swingT>0){var prog=1-clamp(p.swingT/.3,0,1),dir=p.swingDir||1,a0=p.aim-H2*dir,cur=a0+(p.aim+H2*dir-a0)*prog,fade=clamp(p.swingT/.3,0,1)*am;ctx.globalAlpha=.28*fade;ctx.strokeStyle='#ff2fb0';ctx.lineWidth=10;ctx.beginPath();ctx.arc(p.x,p.y,R-4,Math.min(a0,cur),Math.max(a0,cur));ctx.stroke();ctx.globalAlpha=.55*fade;ctx.strokeStyle='#ff8fd4';ctx.lineWidth=5;ctx.beginPath();ctx.arc(p.x,p.y,R-4,Math.min(a0,cur),Math.max(a0,cur));ctx.stroke();ctx.globalAlpha=.95*fade;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,R-4,Math.min(a0,cur),Math.max(a0,cur));ctx.stroke();var tx=p.x+Math.cos(cur)*(R-4),ty=p.y+Math.sin(cur)*(R-4),ix=p.x+Math.cos(cur)*(R*.42),iy=p.y+Math.sin(cur)*(R*.42);ctx.globalAlpha=.9*fade;ctx.strokeStyle='#ffd6f2';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ix,iy);ctx.lineTo(tx,ty);ctx.stroke();ctx.globalAlpha=fade;ctx.fillStyle='#fff';ctx.fillRect(Math.round(tx)-2,Math.round(ty)-2,4,4)}ctx.restore()}
function drawCone(ctx,p,st,targets,am){am=am==null?1:am;targets=targets||G.enemies;ctx.save();var gr=ctx.createRadialGradient(p.x,p.y,6,p.x,p.y,st.coneR);gr.addColorStop(0,'rgba(184,251,255,'+(.26*am)+')');gr.addColorStop(.6,'rgba(34,230,255,'+(.1*am)+')');gr.addColorStop(1,'rgba(34,230,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.arc(p.x,p.y,st.coneR,p.aim-st.coneHalf,p.aim+st.coneHalf);ctx.closePath();ctx.fill();ctx.globalAlpha=.35*am;ctx.strokeStyle='#b8fbff';ctx.lineWidth=1;ctx.stroke();ctx.restore();for(var s=0;s<2;s++){var ea=p.aim+(s?1:-1)*st.coneHalf;lightning(ctx,p.x,p.y,p.x+Math.cos(ea)*st.coneR,p.y+Math.sin(ea)*st.coneR,p.id*3+s*7,'#22e6ff',.7*am)}for(var i=0;i<targets.length;i++){var e=targets[i];if(e.dead||e.hp<=0)continue;var d=hyp(e.x-p.x,e.y-p.y);if(d>st.coneR)continue;if(Math.abs(angDiff(p.aim,Math.atan2(e.y-p.y,e.x-p.x)))>st.coneHalf)continue;lightning(ctx,p.x+Math.cos(p.aim)*10,p.y+Math.sin(p.aim)*10,e.x,e.y,(e.id||i)*.7+p.id*5,'#22e6ff',am)}}
function drawTesla(ctx,p,st,targets,am){am=am==null?1:am;targets=targets||G.enemies;var R=st.teslaR;ctx.save();var gr=ctx.createRadialGradient(p.x,p.y,4,p.x,p.y,R);gr.addColorStop(0,'rgba(184,251,255,'+(.28*am)+')');gr.addColorStop(.55,'rgba(34,230,255,'+(.12*am)+')');gr.addColorStop(1,'rgba(34,230,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y,R,0,TAU);ctx.fill();ctx.globalAlpha=.5*am;ctx.strokeStyle='#b8fbff';ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(p.x,p.y,R,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();for(var s=0;s<5;s++){var a0=visualT*1.15+s*TAU/5+p.id*1.7,r0=R*(.22+.12*Math.sin(visualT*3+s)),a1=a0+.85+.35*Math.sin(visualT*2.3+s*2);lightning(ctx,p.x+Math.cos(a0)*r0,p.y+Math.sin(a0)*r0,p.x+Math.cos(a1)*R,p.y+Math.sin(a1)*R,p.id*11+s*3.3,'#b8fbff',.42*am)}for(var i=0;i<targets.length;i++){var e=targets[i];if(e.dead||e.invuln||e.hp<=0)continue;if(hyp(e.x-p.x,e.y-p.y)>R)continue;lightning(ctx,p.x,p.y,e.x,e.y,(e.id||i)*.9+p.id*7,'#22e6ff',.5*am)}}
function drawShardDrop(ctx,dp){var t=visualT*3+dp.sp,pulse=.5+.5*Math.sin(t*2.2),blink=Math.floor(visualT*7+dp.sp)%5===0;ctx.save();ctx.globalAlpha=.22+.28*pulse;pxCircle(ctx,dp.x,dp.y,7+Math.round(pulse*3),'#ff2fb0',.55);ctx.globalAlpha=.5;pxCircle(ctx,dp.x,dp.y,5,'#fff',.35+.3*pulse);ctx.restore();var bob=Math.round(Math.sin(G.t*4+dp.sp)),img=blink?SPR.shard.f:SPR.shard.n;ctx.save();ctx.globalAlpha=blink?1:.82+.18*pulse;ctx.drawImage(img,Math.round(dp.x-img.width/2),Math.round(dp.y-img.height/2)+bob);ctx.restore();ctx.save();ctx.globalAlpha=.55+.45*pulse;ctx.fillStyle='#fff';for(var s=0;s<4;s++){var a=t*1.3+s*TAU/4,r=8+pulse*2;ctx.fillRect(Math.round(dp.x+Math.cos(a)*r),Math.round(dp.y+Math.sin(a)*r+bob),1,1)}ctx.restore()}
function drawChainSaw(ctx,x,y,ang,phase,col,hot){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(ang);
ctx.fillStyle=PAL.o;ctx.fillRect(-3,-5,24,10);
ctx.fillStyle='#6b6a8a';ctx.fillRect(-2,-4,22,8);
ctx.fillStyle=hot?'#ffd6f2':col;ctx.fillRect(-1,-3,20,6);
ctx.fillStyle=PAL.o;ctx.fillRect(1,-1,16,2);
var per=52,n=13;
for(var i=0;i<n;i++){var d=((phase*per)+(i/n)*per)%per,px,py;
if(d<20){px=d;py=-4}else if(d<26){px=20;py=-4+(d-20)}else if(d<46){px=20-(d-26);py=4}else{px=0;py=4-(d-46)}
ctx.fillStyle=i%2?'#fff':'#d8d0f0';ctx.fillRect(Math.round(px)-1,Math.round(py)-1,2,2)}
ctx.fillStyle=hot?'#fff':col;ctx.fillRect(19,-2,3,4);
ctx.fillStyle='#8f5a10';ctx.fillRect(-4,-2,3,4);
if(hot){ctx.globalAlpha=.6;ctx.fillStyle='#6b6a8a';ctx.fillRect(-6-Math.floor(phase*8)%3,-1,2,2);ctx.globalAlpha=1}
ctx.restore()}
function drawBlade(ctx,x,y,ang,phase,col,hot){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(ang);
var i,t,h;
ctx.fillStyle=PAL.o;
for(i=-3;i<=20;i++){t=clamp((i+3)/23,0,1);h=Math.round(4.6*(1-Math.pow(t,1.7)))+1;ctx.fillRect(i,-h,1,h*2)}
ctx.fillStyle=hot?'#ffd6f2':col;
for(i=-2;i<=19;i++){t=clamp((i+2)/21,0,1);h=Math.max(1,Math.round(3.6*(1-Math.pow(t,1.7))));ctx.fillRect(i,-h,1,h*2)}
ctx.fillStyle=PAL.o;ctx.fillRect(1,0,14,1);
ctx.globalAlpha=hot?.95:.72;ctx.fillStyle='#fff';
for(i=1;i<=18;i++){t=i/18;h=Math.max(1,Math.round(3.6*(1-Math.pow(t,1.7))));ctx.fillRect(i,-h,1,1)}
ctx.globalAlpha=1;
var gp=1+Math.floor((phase%1)*17),gh=Math.max(1,Math.round(3.6*(1-Math.pow(gp/18,1.7))));
ctx.fillStyle='#fff';ctx.fillRect(gp,-gh-1,2,2);
ctx.fillStyle=PAL.o;ctx.fillRect(-5,-5,3,10);
ctx.fillStyle=hot?'#fff':'#6b6a8a';ctx.fillRect(-4,-4,1,8);
ctx.fillStyle=hot?'#ffd76a':col;ctx.fillRect(-2,-1,2,2);
ctx.restore()}
function drawShipAnim(ctx,p,st,layer){var t=visualT,id=p.id||0,col=p.col,light=p.light,ship=p.ship;
ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.aim);
if(layer==='back'){
if(ship!=='monster'&&!p.engBad){
var spd=hyp(p.vx||0,p.vy||0),lat=clamp(((p.vy||0)*Math.cos(p.aim)-(p.vx||0)*Math.sin(p.aim))/120,-1,1);
var len=3+Math.min(7,spd/26)+(p.dashT>0?6:0),flick=Math.floor(t*24)%2,oy=lat*2;
ctx.fillStyle=PAL.o;ctx.fillRect(-14,Math.round(-4+oy),6,8);
ctx.fillStyle='#3a3a4a';ctx.fillRect(-13,Math.round(-3+oy),5,6);
ctx.fillStyle='#150a2e';ctx.fillRect(-12,Math.round(-2+oy),3,4);
for(var s=0;s<len;s++){var w=Math.max(1,Math.round((1-s/len)*3.4));
ctx.fillStyle=s<1?'#fff':s<len*.4?(flick?light:col):(flick?col:'#8f5a10');
ctx.fillRect(-14-s,Math.round(-w/2+oy),1,w)}
ctx.globalAlpha=.35;ctx.fillStyle=col;ctx.fillRect(-16-len,Math.round(-1+oy),2,2);ctx.globalAlpha=1}
if(ship==='phantom'){ctx.globalAlpha=.16+.12*Math.sin(t*5+id);ctx.fillStyle=col;ctx.fillRect(-14,-8,26,16);ctx.globalAlpha=1}
else if(ship==='chronos'){for(var s2=0;s2<3;s2++){var a=t*.9+s2*TAU/3;ctx.globalAlpha=.5;ctx.strokeStyle=light;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,15,a,a+.7);ctx.stroke();ctx.globalAlpha=1}}
else if(ship==='reaper'&&!(p.swingT>0)){var ra=t*1.1;ctx.globalAlpha=.35;ctx.strokeStyle='#ff2fb0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,19,ra,ra+1.1);ctx.stroke();ctx.globalAlpha=.8;ctx.fillStyle='#ffd6f2';ctx.fillRect(Math.round(Math.cos(ra+1.1)*19)-1,Math.round(Math.sin(ra+1.1)*19)-1,2,2);ctx.globalAlpha=1}
else if(ship==='legion'){for(var c2=0;c2<3;c2++){var lit=(Math.floor(t*3)+c2)%3===0;ctx.fillStyle=lit?light:PAL.o;ctx.globalAlpha=lit?.9:.5;ctx.fillRect(-6+c2*5,-9,3,2);ctx.fillRect(-6+c2*5,7,3,2);ctx.globalAlpha=1}}
else if(ship==='forge'){var aa=Math.sin(t*1.3)*.5;ctx.save();ctx.translate(-4,-9);ctx.rotate(aa);ctx.fillStyle=PAL.o;ctx.fillRect(-1,-1,10,3);ctx.fillStyle='#8f5a10';ctx.fillRect(0,0,9,1);ctx.fillStyle='#ffb020';ctx.fillRect(8,-1,2,3);ctx.restore()}
ctx.restore();return}
if(ship==='sniper'){var gl=(t*1.4)%1;ctx.globalAlpha=.7;ctx.fillStyle='#fff';ctx.fillRect(Math.round(2+gl*8),-4,2,1);ctx.globalAlpha=1;
ctx.fillStyle=PAL.o;ctx.fillRect(10,-2,10,4);ctx.fillStyle='#6b6a8a';ctx.fillRect(11,-1,9,2);
if(p.recoil>.3){ctx.globalAlpha=p.recoil;ctx.fillStyle='#ffd76a';ctx.fillRect(20,-2,4,4);ctx.globalAlpha=1}}
else if(ship==='bomber'){var op=p.bay||0;for(var s3=-1;s3<=1;s3+=2){ctx.save();ctx.translate(2,s3*4);ctx.rotate(s3*op*.8);ctx.fillStyle=PAL.o;ctx.fillRect(-1,-1,9,3);ctx.fillStyle='#8f5a10';ctx.fillRect(0,0,8,1);ctx.restore()}
if(op>.2){ctx.globalAlpha=op;ctx.fillStyle='#ffb020';ctx.fillRect(3,-2,4,4);ctx.globalAlpha=1}}
else if(ship==='psy'){var ex=6+Math.sin(t*7+id)*2,ey=Math.cos(t*9+id)*2;ctx.fillStyle=PAL.o;ctx.fillRect(Math.round(ex)-2,Math.round(ey)-2,5,5);ctx.fillStyle='#ff2fb0';ctx.fillRect(Math.round(ex)-1,Math.round(ey)-1,3,3);ctx.fillStyle='#fff';ctx.fillRect(Math.round(ex),Math.round(ey),1,1)}
else if(ship==='forge'){if(Math.floor(t*6)%3===0){ctx.fillStyle='#ffd76a';ctx.fillRect(6+Math.round(Math.sin(t*20)*2),-6,1,1);ctx.fillRect(8,6,1,1)}
ctx.globalAlpha=.5+.5*Math.sin(t*4);ctx.fillStyle='#ff4d4d';ctx.fillRect(-8,-3,2,6);ctx.globalAlpha=1}
else if(ship==='groza'){for(var g2=0;g2<2;g2++){var gy=g2?5:-5;ctx.strokeStyle='#b8fbff';ctx.globalAlpha=.55;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(4,gy);
for(var k2=1;k2<=3;k2++)ctx.lineTo(4+k2*3,gy+Math.sin(t*18+k2*2+g2)*1.6);ctx.stroke();ctx.globalAlpha=1}
ctx.fillStyle='#fff';ctx.globalAlpha=.5+.5*Math.sin(t*10);ctx.fillRect(12,-1,2,2);ctx.globalAlpha=1}
else if(ship==='chronos'){ctx.strokeStyle='#fff';ctx.globalAlpha=.85;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(t*2)*6,Math.sin(t*2)*6);ctx.stroke();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(t*.5)*4,Math.sin(t*.5)*4);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=light;ctx.fillRect(-1,-1,2,2)}
else if(ship==='legion'){ctx.globalAlpha=.6+.4*Math.sin(t*5);ctx.fillStyle=light;ctx.fillRect(6,-1,3,2);ctx.globalAlpha=1}
ctx.restore()}
function drawMonsterBack(ctx,p,dark){var col=dark?'#4a2a7a':p.col,light=dark?'#a86bff':p.light;
var vx=p.vx||0,vy=p.vy||0,ca=Math.cos(p.aim),sa=Math.sin(p.aim);
var fwd=vx*ca+vy*sa,side=-vx*sa+vy*ca,sp=hyp(vx,vy),dash=p.dashT>0?1:0;
var trail=clamp(fwd/260,-1,1),drift=clamp(side/180,-1,1),idle=sp<14?1:0;
ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.aim);
for(var t=0;t<6;t++){var off=(t-2.5)*4,x=-30,y=off,pw=6.5;
for(var s=1;s<=7;s++){var f=s/7;
var sway=Math.sin(visualT*(4.2+dash*3)+t*1.25+s*.62)*4.6*f*(1-.55*Math.abs(trail));
var curl=idle*Math.sin(visualT*1.6+t+s*.9)*2.2*f;
var nx=x-(4.4+dash*1.8+Math.max(0,trail)*1.6),ny=off+sway+curl-drift*f*3.4,nw=Math.max(2,6.5-s*.66);
ctx.fillStyle=PAL.o;ctx.beginPath();ctx.moveTo(x+1,y-pw/2-1);ctx.lineTo(nx,ny-nw/2-1);ctx.lineTo(nx,ny+nw/2+1);ctx.lineTo(x+1,y+pw/2+1);ctx.closePath();ctx.fill();
ctx.fillStyle=s%2?col:light;ctx.beginPath();ctx.moveTo(x+1,y-pw/2);ctx.lineTo(nx,ny-nw/2);ctx.lineTo(nx,ny+nw/2);ctx.lineTo(x+1,y+pw/2);ctx.closePath();ctx.fill();
x=nx;y=ny;pw=nw}
ctx.fillStyle=light;ctx.fillRect(Math.round(x)-1,Math.round(y)-1,3,3)}
ctx.fillStyle=PAL.o;ctx.fillRect(-34,-13,12,26);
ctx.fillStyle=col;ctx.fillRect(-33,-12,11,24);
ctx.fillStyle=light;ctx.fillRect(-33,-4,11,8);
ctx.fillStyle=PAL.o;for(var r2=0;r2<3;r2++)ctx.fillRect(-31,-9+r2*8,7,1);
ctx.restore()}
function drawMonsterFront(ctx,p,dark){var open=p.plateT||0,col=dark?'#3a2a6a':p.col,eg=.5+.5*Math.sin(visualT*3.2);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.aim);
var gr=ctx.createRadialGradient(13,0,1,13,0,12);gr.addColorStop(0,'rgba(255,77,77,'+(.55+.35*eg)+')');gr.addColorStop(.5,'rgba(255,47,47,'+(.22*eg)+')');gr.addColorStop(1,'rgba(255,77,77,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(13,0,12,0,TAU);ctx.fill();
ctx.globalAlpha=.7+.3*eg;ctx.fillStyle='#fff';ctx.fillRect(12,-1,3,2);ctx.globalAlpha=1;
for(var s=-1;s<=1;s+=2){ctx.save();ctx.translate(18,s*7);ctx.rotate(s*open*.95);ctx.fillStyle=PAL.o;ctx.fillRect(-2,-2,15,4);ctx.fillStyle=col;ctx.fillRect(-1,-1,13,2);ctx.fillStyle='#fff';ctx.fillRect(10,-1,2,2);ctx.restore()}
for(var g=-1;g<=1;g+=2){ctx.fillStyle=PAL.o;ctx.fillRect(18,g*8-2,9,4);ctx.fillStyle=open>.3?'#ffb020':col;ctx.fillRect(19,g*8-1,7,2)}ctx.restore()}
function drawBorn(ctx,e,spr,ang){var pr=1-clamp(e.born/.3,0,1),n=5,bh=Math.ceil(spr.h/n);
ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));ctx.rotate(ang);ctx.globalAlpha=.35+.65*pr;
for(var i=0;i<n;i++){var off=Math.round((1-pr)*Math.sin(e.id*1.7+i*2.3)*14);
var sy=i*bh,hh=Math.min(bh,spr.h-sy);if(hh<=0)continue;
ctx.drawImage(spr.n,0,sy,spr.w,hh,-Math.round(spr.w/2)+off,-Math.round(spr.h/2)+sy,spr.w,hh)}
ctx.restore();ctx.globalAlpha=1;
if(pr<.9){ctx.save();ctx.globalAlpha=.5*(1-pr);pxCircle(ctx,e.x,e.y,e.r+6+(1-pr)*10,'#22e6ff',.6);ctx.restore()}}
function pushWreck(e){var ch=[];for(var i=0;i<7;i++){var a=rand(0,TAU),s=rand(30,90);
ch.push({x:e.x+rand(-e.r,e.r),y:e.y+rand(-e.r,e.r),vx:Math.cos(a)*s,vy:Math.sin(a)*s,a:rand(0,TAU),va:rand(-5,5),s:randi(2,4)})}
G.wrecks.push({x:e.x,y:e.y,spr:e.spr,col:e.col,r:e.r,t:1.5,max:1.5,boom:0,ch:ch});
if(G.wrecks.length>4)G.wrecks.shift()}
function updateWrecks(dt){for(var i=G.wrecks.length-1;i>=0;i--){var w=G.wrecks[i];w.t-=dt;w.boom-=dt;
if(w.boom<=0&&w.t>.3){w.boom=rand(.14,.3);var bx=w.x+rand(-w.r,w.r),by=w.y+rand(-w.r,w.r);
part(bx,by,'#ffb020',10,110,.45,2);part(bx,by,'#ff4d4d',6,80,.4,1);ring(bx,by,2,16,'#ffb020',.3);A.explode();shake(1.1)}
for(var j=0;j<w.ch.length;j++){var c=w.ch[j];c.x+=c.vx*dt;c.y+=c.vy*dt;c.vx*=Math.exp(-1.2*dt);c.vy*=Math.exp(-1.2*dt);c.a+=c.va*dt;
if(Math.random()<dt*8)part(c.x,c.y,'#6b6a8a',1,20,.4,1)}
if(w.t<=0){flash(.28,'#fff');ring(w.x,w.y,6,w.r*4,'#fff',.5);part(w.x,w.y,'#fff',30,170,.7,2);part(w.x,w.y,w.col,24,130,.6,2);A.boom();HAP.big();shake(2.2);G.wrecks.splice(i,1)}}}
function drawWrecks(ctx){for(var i=0;i<G.wrecks.length;i++){var w=G.wrecks[i],pr=clamp(w.t/w.max,0,1),jit=(1-pr)*2.5;
ctx.save();ctx.globalAlpha=.35+.65*pr;ctx.translate(Math.round(w.x+rand(-jit,jit)),Math.round(w.y+rand(-jit,jit)));ctx.rotate((1-pr)*.5);
if(w.spr)ctx.drawImage(w.spr.n,-Math.round(w.spr.w/2),-Math.round(w.spr.h/2));
ctx.globalAlpha=(1-pr)*.9;ctx.strokeStyle=PAL.o;ctx.lineWidth=1;
for(var k=0;k<5;k++){var a=k*1.3+w.x*.01;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*w.r*(1-pr)*1.2,Math.sin(a)*w.r*(1-pr)*1.2);ctx.stroke()}
ctx.restore();
for(var j=0;j<w.ch.length;j++){var c=w.ch[j];ctx.save();ctx.globalAlpha=pr;ctx.translate(Math.round(c.x),Math.round(c.y));ctx.rotate(c.a);ctx.fillStyle=PAL.o;ctx.fillRect(-c.s-1,-c.s-1,c.s*2+2,c.s*2+2);ctx.fillStyle=w.col;ctx.fillRect(-c.s,-c.s,c.s*2,c.s*2);ctx.restore()}
ctx.globalAlpha=1;
if(pr<.28){ctx.save();ctx.globalAlpha=(1-pr/.28)*.7;pxDisc(ctx,w.x,w.y,w.r*1.6,'#fff',.8);ctx.restore()}}}
function drawEyeTelegraph(ctx,e){var p=aiTarget(e.x,e.y),base=Math.atan2(p.y-e.y,p.x-e.x),blink=Math.floor(G.t*16)%2===0;
ctx.save();ctx.fillStyle=blink?'#fff':'#a86bff';
for(var k=-1;k<=1;k++){var a=base+k*.12;
for(var d=e.r+6;d<460;d+=5)ctx.fillRect(Math.round(e.x+Math.cos(a)*d),Math.round(e.y+Math.sin(a)*d),1,1)}
ctx.restore();
ctx.save();ctx.globalAlpha=.8;txt(ctx,'ЗАЛП',e.x,e.y-e.r-20,'#a86bff',11,'center');ctx.restore()}
function capFireInten(c){if(c.boomed)return 1;if(c.dead)return .6;if(c.kind==='doom')return clamp((30-c.t)/30,.1,1);if(c.kind==='rescue'&&c.hp<c.max*.5)return clamp(1-c.hp/(c.max*.5),0,1)*.9;return 0}
function drawCapFire(ctx,c,inten){var i,s,n=Math.round(11+inten*18),hw=c.w*.46,hh=c.h*.42;
ctx.save();ctx.globalAlpha=.14+.2*inten*(.65+.35*Math.sin(visualT*11));var gg=ctx.createRadialGradient(c.x,c.y,10,c.x,c.y,c.w*.75);gg.addColorStop(0,'rgba(255,176,32,.85)');gg.addColorStop(.45,'rgba(255,77,77,.35)');gg.addColorStop(1,'rgba(255,77,77,0)');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(c.x,c.y,c.w*.75,0,TAU);ctx.fill();ctx.restore();
for(i=0;i<n;i++){var seed=i*7.31,fx=c.x-hw+((i*67)%(hw*2)),fy=c.y-hh+((i*37)%(hh*2)),h=(18+inten*46)*(.6+.4*Math.sin(visualT*9.5+seed));
for(s=0;s<h;s++){var w=Math.max(1,Math.round((1-s/h)*8*(.72+.28*Math.sin(visualT*13+seed+s)))),wob=Math.sin(visualT*7.5+seed+s*.45)*3.4;
ctx.fillStyle=s<2?'#fff':s<h*.26?'#ffd76a':s<h*.6?'#ffb020':'#ff4d4d';ctx.fillRect(Math.round(fx+wob-w/2),Math.round(fy-s),w,1)}}
ctx.save();for(i=0;i<n;i++){var sd=i*3.77,sx=c.x-hw+((i*83)%(hw*2)),rise=(visualT*28+sd*11)%76,sy=c.y-hh-rise;ctx.globalAlpha=clamp(1-rise/76,0,1)*.4;ctx.fillStyle='#6b6a8a';var sw=3+Math.round(rise/13);ctx.fillRect(Math.round(sx+Math.sin(visualT*2+sd)*7),Math.round(sy),sw,sw)}ctx.restore();
for(i=0;i<Math.round(8+inten*18);i++){var es=i*5.13,ex=c.x-hw+((i*79)%(hw*2)),ph2=(visualT*56+es*13)%104,ey=c.y-hh*.5-ph2;ctx.globalAlpha=clamp(1-ph2/104,0,1);ctx.fillStyle=i%2?'#ffd76a':'#ff4d4d';ctx.fillRect(Math.round(ex+Math.sin(visualT*5+es)*8),Math.round(ey),2,2)}ctx.globalAlpha=1}
function drawCap(ctx){var c=G.cap;if(!c)return;var spr=capSprite(),ext=capImg(),fl=c.fl>0&&Math.floor(visualT*30)%2===0,inten=capFireInten(c);
ctx.save();ctx.translate(c.x,c.y);ctx.imageSmoothingEnabled=false;
if(ext){var ew=c.w,eh=c.w*(ext.naturalHeight/ext.naturalWidth);ctx.drawImage(ext,-ew/2,-eh/2,ew,eh)}
else{var dw=spr.w,dh=spr.h;
if(c.dead){ctx.globalAlpha=.5;ctx.drawImage(spr.n,-dw/2,-dh/2);ctx.globalAlpha=1}
else ctx.drawImage(fl?spr.f:spr.n,-dw/2,-dh/2);
if(!c.dead){for(var e=0;e<4;e++){var ey=-24+e*16;ctx.globalAlpha=.35+.35*Math.sin(visualT*7+e);ctx.fillStyle='#b8fbff';ctx.fillRect(-dw/2-6,ey-4,6,8);ctx.globalAlpha=1}
ctx.globalAlpha=.5+.5*Math.sin(visualT*4);ctx.fillStyle='#ff2fb0';ctx.fillRect(-dw/2+130,-dh/2+2,46,2);ctx.globalAlpha=1}
if(inten>0&&!c.dead){ctx.globalAlpha=.16*inten*(.6+.4*Math.sin(visualT*12));ctx.globalCompositeOperation='lighter';ctx.drawImage(spr.n,-dw/2,-dh/2);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1}}
if(c.kind==='rescue'&&!c.dead){var hf=clamp(c.hp/c.max,0,1),by=-c.h/2-20;ctx.fillStyle=PAL.o;ctx.fillRect(-92,by,184,9);ctx.fillStyle=THEME.dp;ctx.fillRect(-91,by+1,182,7);ctx.fillStyle=hf>.5?'#9dff3c':hf>.25?'#ffb020':'#ff4d4d';ctx.fillRect(-91,by+1,Math.round(182*hf),7)}
ctx.restore();
if(inten>0)drawCapFire(ctx,c,inten);
if(c.kind==='rescue'&&!c.dead)txt(ctx,'ЛЮДИ ВНУТРИ',c.x,c.y-c.h/2-38,'#9dff3c',14,'center');
if(c.dead)txt(ctx,c.boomed?'КОРАБЛЬ УНИЧТОЖЕН':'КОРАБЛЬ ПОТЕРЯН',c.x,c.y-c.h/2-38,'#ff4d4d',14,'center');
if(c.kind==='doom'&&!c.boomed&&c.t<30)txt(ctx,'КОРПУС НЕ ВЫДЕРЖИТ',c.x,c.y+c.h/2+12,Math.floor(visualT*5)%2?'#ff4d4d':'#ffb020',14,'center');
if(c.cargo&&!c.cargo.dead){var g=c.cargo;drawSpr(ctx,SPR.cargo,g.x,g.y,0,g.fl>0&&Math.floor(visualT*30)%2===0,1);var gf=clamp(g.hp/g.max,0,1);ctx.fillStyle=PAL.o;ctx.fillRect(g.x-12,g.y-14,24,4);ctx.fillStyle='#ffb020';ctx.fillRect(g.x-11,g.y-13,Math.round(22*gf),2);ctx.globalAlpha=.3+.3*Math.sin(visualT*5);pxCircle(ctx,g.x,g.y,13,'#ffd76a',.4);ctx.globalAlpha=1;txt(ctx,'КОНТЕЙНЕР',g.x,g.y-24,'#ffd76a',10,'center')}}
function drawPortal(ctx){var por=G.portal,pr=por.r+Math.sin(visualT*4)*3,age=por.age||0;
ctx.save();
var gr=ctx.createRadialGradient(por.x,por.y,2,por.x,por.y,pr*2.4);gr.addColorStop(0,'rgba(34,230,255,.4)');gr.addColorStop(.5,'rgba(34,230,255,.12)');gr.addColorStop(1,'rgba(34,230,255,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(por.x,por.y,pr*2.4,0,TAU);ctx.fill();
ctx.globalAlpha=.35;for(var i=0;i<3;i++){var rr=pr+8+i*9+Math.sin(visualT*3+i)*3;pxCircle(ctx,por.x,por.y,rr,'#22e6ff',.3-i*.08)}
ctx.globalAlpha=1;pxCircle(ctx,por.x,por.y,pr,'#22e6ff',.95);pxCircle(ctx,por.x,por.y,pr*.66,'#b8fbff',.7);pxDisc(ctx,por.x,por.y,5,'#fff',.9);
for(i=0;i<6;i++){var a=visualT*1.6+i*TAU/6,rx=por.x+Math.cos(a)*(pr+5),ry=por.y+Math.sin(a)*(pr+5);ctx.fillStyle='#fff';ctx.fillRect(Math.round(rx)-1,Math.round(ry)-1,2,2)}
if(G.portalCharge>0){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.globalAlpha=.95;ctx.beginPath();ctx.arc(por.x,por.y,pr+6,-Math.PI/2,-Math.PI/2+TAU*clamp(G.portalCharge/1.5,0,1));ctx.stroke()}
ctx.globalAlpha=.8;ctx.strokeStyle='#9dff3c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(por.x,por.y,pr+11,-Math.PI/2,-Math.PI/2+TAU*clamp(1-age/15,0,1));ctx.stroke();
ctx.restore();txt(ctx,'ПОРТАЛ',por.x,por.y-pr-24,'#22e6ff',13,'center');
txt(ctx,'авто '+Math.max(0,Math.ceil(15-age))+'с',por.x,por.y+pr+8,'#9dff3c',11,'center')}
function renderScene(ctx,vx,vy,vw,vh,focus,z,idx){var tgt=camTargetFor(focus,vx,vy,vw,vh,z),cam=CAMS[idx]||CAMS[0],k=G.dt>0?1-Math.exp(-9*G.dt):1;cam.x+=(tgt.x-cam.x)*k;cam.y+=(tgt.y-cam.y)*k;if(idx===0){CAM.x=cam.x;CAM.y=cam.y}
ctx.save();ctx.beginPath();ctx.rect(vx,vy,vw,vh);ctx.clip();ctx.fillStyle=THEME.v;ctx.fillRect(vx,vy,vw,vh);drawParallax(ctx,cam,vx,vy,vw,vh);var cx=vx+vw/2,cy=vy+vh/2,sx=G.shake?randi(-Math.round(G.shake),Math.round(G.shake)):0,sy=G.shake?randi(-Math.round(G.shake),Math.round(G.shake)):0;ctx.translate(cx,cy);ctx.scale(z,z);ctx.translate(-cx,-cy);ctx.translate(sx-cam.x,sy-cam.y);
ctx.save();ctx.beginPath();ctx.rect(AR.x,AR.y,AR.w,AR.h);ctx.clip();ctx.drawImage(floorCanvas,AR.x,AR.y,AR.w,AR.h);var pulse=.5+.5*Math.sin(visualT*2.4);ctx.globalAlpha=.04+.03*pulse;ctx.strokeStyle='rgb('+THEME.fl.grid+')';ctx.lineWidth=1;ctx.beginPath();for(var gx=AR.x;gx<=AR.x+AR.w;gx+=40){ctx.moveTo(gx+.5,AR.y);ctx.lineTo(gx+.5,AR.y+AR.h)}for(var gy=AR.y;gy<=AR.y+AR.h;gy+=40){ctx.moveTo(AR.x,gy+.5);ctx.lineTo(AR.x+AR.w,gy+.5)}ctx.stroke();ctx.globalAlpha=1;for(var i=0;i<G.beats.length;i++){var bt=G.beats[i];pxCircle(ctx,focus.x,focus.y,bt.r,THEME.pal.c,Math.max(0,bt.a)*(MUS.active?.18:.4))}ctx.restore();
var hurtG=focus.hurtT>0;ctx.fillStyle=hurtG?PAL.r:THEME.eg;ctx.fillRect(AR.x-1,AR.y-1,AR.w+2,1);ctx.fillRect(AR.x-1,AR.y+AR.h,AR.w+2,1);ctx.fillRect(AR.x-1,AR.y-1,1,AR.h+2);ctx.fillRect(AR.x+AR.w,AR.y-1,1,AR.h+2);ctx.globalAlpha=.12;ctx.strokeStyle=THEME.pal.v;ctx.strokeRect(AR.x+EDGE,AR.y+EDGE,AR.w-EDGE*2,AR.h-EDGE*2);ctx.globalAlpha=1;
if(G.cap)drawCap(ctx);
for(i=0;i<G.chronoFields.length;i++){var cf=G.chronoFields[i];if(cf.g)continue;ctx.save();ctx.globalAlpha=.1+.04*Math.sin(visualT*4);ctx.fillStyle='#4d8cff';ctx.beginPath();ctx.arc(cf.x,cf.y,cf.r,0,TAU);ctx.fill();ctx.globalAlpha=.6;ctx.strokeStyle='#4d8cff';ctx.lineWidth=1.5;ctx.setLineDash([7,6]);ctx.beginPath();ctx.arc(cf.x,cf.y,cf.r,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=.85;txt(ctx,'×0.4',cf.x,cf.y-cf.r-14,'#4d8cff',12,'center');ctx.restore()}
for(i=0;i<G.enemies.length;i++){var je=G.enemies[i];if(je.type!=='jammer'||je.dead)continue;ctx.save();ctx.globalAlpha=.09+.05*Math.sin(visualT*5);ctx.fillStyle=PAL.c;ctx.beginPath();ctx.arc(je.x,je.y,90,0,TAU);ctx.fill();ctx.globalAlpha=.45;ctx.strokeStyle=PAL.c;ctx.setLineDash([5,6]);ctx.lineWidth=1;ctx.beginPath();ctx.arc(je.x,je.y,90,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore()}
var echo=null,aegis=null;for(i=0;i<G.enemies.length;i++){var te=G.enemies[i];if(te.bossKind==='twins'&&!te.dead)echo=te;if(te.type==='aegis'&&!te.dead)aegis=te}if(echo&&aegis){ctx.save();ctx.globalAlpha=G.twinsLink?.75:.25;ctx.strokeStyle=G.twinsLink?'#b8fbff':THEME.eg;ctx.lineWidth=G.twinsLink?2:1;ctx.setLineDash(G.twinsLink?[]:[6,5]);ctx.beginPath();ctx.moveTo(aegis.x,aegis.y);ctx.lineTo(echo.x,echo.y);ctx.stroke();ctx.setLineDash([]);if(G.twinsLink){ctx.globalAlpha=.13;ctx.fillStyle='#b8fbff';ctx.beginPath();ctx.arc(echo.x,echo.y,echo.r+9,0,TAU);ctx.fill()}ctx.globalAlpha=.9;txt(ctx,G.twinsLink?'КУПОЛ':'ОКНО УРОНА',echo.x,echo.y-echo.r-24,G.twinsLink?'#b8fbff':'#9dff3c',12,'center');ctx.restore()}
for(i=0;i<G.enemies.length;i++){var ey=G.enemies[i];if(ey.bossKind==='eye'&&ey.pending==='volley'&&ey.tel>0&&!ey.dead)drawEyeTelegraph(ctx,ey)}
for(i=0;i<G.wells.length;i++){var wl=G.wells[i];ctx.save();ctx.globalAlpha=.5;for(var s2=0;s2<3;s2++){ctx.strokeStyle=s2%2?'#a86bff':'#22e6ff';ctx.lineWidth=1.5;ctx.beginPath();for(var t2=0;t2<40;t2++){var an=wl.spin+s2*2.1+t2*.22,rr=wl.r*(t2/40),px2=wl.x+Math.cos(an)*rr,py2=wl.y+Math.sin(an)*rr;if(t2===0)ctx.moveTo(px2,py2);else ctx.lineTo(px2,py2)}ctx.stroke()}ctx.globalAlpha=.8;pxCircle(ctx,wl.x,wl.y,wl.core,'#a86bff',.7);ctx.restore()}
for(i=0;i<G.mines.length;i++){var mn=G.mines[i];drawSpr(ctx,SPR.mine,mn.x,mn.y,0,false,1);if(mn.arm<=0){ctx.globalAlpha=.3+.3*Math.sin(visualT*8);pxCircle(ctx,mn.x,mn.y,(mn.rad||34)*.32,'#ffb020',.5);ctx.globalAlpha=1}}
for(i=0;i<G.turrets.length;i++){var tu=G.turrets[i];drawSpr(ctx,SPR.turret,tu.x,tu.y,tu.ang+Math.PI/2,false,1);ctx.save();ctx.globalAlpha=.45;ctx.strokeStyle='#ffb020';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(tu.x,tu.y,9,-Math.PI/2,-Math.PI/2+TAU*clamp(tu.l/tu.max,0,1));ctx.stroke();ctx.restore()}
for(i=0;i<G.phantoms.length;i++){var ph=G.phantoms[i],pa=clamp(ph.l/ph.max,0,1)*.5;var pdeg=(pdTints()[(PL[ph.owner]||P).tintIdx||0]||{d:0}).d;
var ps=pdeg?tintedSpr(ph.ship||'std',ph.owner,pdeg).n:(SPR.ships[ph.ship||'std']||SPR.ships.std)[ph.owner?1:0].n;
if(ph.ship==='monster')drawMonsterBack(ctx,{x:ph.x,y:ph.y,aim:ph.a,col:'#a86bff',light:'#b8fbff',vx:0,vy:0},true);
ctx.save();ctx.globalAlpha=pa;ctx.translate(Math.round(ph.x),Math.round(ph.y));ctx.rotate(ph.a);ctx.drawImage(ps,-Math.round(ps.width/2),-Math.round(ps.height/2));ctx.restore();
if(ph.ship==='monster')drawMonsterFront(ctx,{x:ph.x,y:ph.y,aim:ph.a,plateT:0,col:'#a86bff'},true);
if(ph.st){var fp={x:ph.x,y:ph.y,aim:ph.a,id:ph.id,swingT:ph.swingT,swingDir:ph.swingDir};if(ph.st.fireMode==='scythe')drawScythe(ctx,fp,ph.st,pa);else if(ph.st.fireMode==='cone')drawCone(ctx,fp,ph.st,G.enemies,pa)}}
for(i=0;i<G.zones.length;i++){var zz=G.zones[i],za=zz.done?clamp(zz.life/zz.max,0,1):.35+.3*Math.abs(Math.sin(G.t*14));pxCircle(ctx,zz.x,zz.y,zz.r,zz.col,za);if(!zz.done)pxCircle(ctx,zz.x,zz.y,zz.r*clamp(1-zz.tel/.9,0,1),zz.col,.5)}
for(i=0;i<G.shocks.length;i++){var s=G.shocks[i];pxCircle(ctx,s.x,s.y,s.r,s.col,.8)}
for(i=0;i<G.rings.length;i++){var rg=G.rings[i];if(rg.ang!==undefined){var ral=clamp(rg.l/rg.m,0,1);ctx.save();ctx.globalAlpha=ral*.26;ctx.fillStyle=rg.c;ctx.beginPath();ctx.moveTo(rg.x,rg.y);ctx.arc(rg.x,rg.y,rg.r,rg.ang-rg.spread,rg.ang+rg.spread);ctx.closePath();ctx.fill();ctx.globalAlpha=ral*.9;ctx.strokeStyle=rg.c;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(rg.x,rg.y,rg.r,rg.ang-rg.spread,rg.ang+rg.spread);ctx.stroke();ctx.restore()}else pxCircle(ctx,rg.x,rg.y,rg.r,rg.c,clamp(rg.l/rg.m,0,1))}
if(G.portal)drawPortal(ctx);
for(i=0;i<G.drops.length;i++){var dp=G.drops[i];if(dp.l<3&&Math.floor(dp.l*8)%2===0)continue;if(dp.type==='shard'){drawShardDrop(ctx,dp);continue}var bob=Math.round(Math.sin(G.t*4+dp.sp)),sp=dp.type==='frag'?SPR.frag:dp.type==='bp'?SPR.bp:SPR.med;ctx.drawImage(sp.n,Math.round(dp.x-sp.w/2),Math.round(dp.y-sp.h/2)+bob);if(dp.type==='bp'){ctx.globalAlpha=.3+.3*Math.sin(visualT*6+dp.sp);pxCircle(ctx,dp.x,dp.y,8,'#ffd76a',.5);ctx.globalAlpha=1}}
for(i=0;i<G.beams.length;i++){var b=G.beams[i],x2=b.x+Math.cos(b.ang)*b.len,y2=b.y+Math.sin(b.ang)*b.len;line(ctx,b.x,b.y,x2,y2,b.col,b.width*2,.25);line(ctx,b.x,b.y,x2,y2,'#fff',1,.8)}
for(i=0;i<G.enemies.length;i++){var ee=G.enemies[i];if(ee.electroT>0)for(var ej=i+1;ej<G.enemies.length;ej++){var e2=G.enemies[ej];if(e2.electroT>0&&hyp(e2.x-ee.x,e2.y-ee.y)<70)lightning(ctx,ee.x,ee.y,e2.x,e2.y,ee.id+e2.id,'#b8fbff',.5)}}
drawWrecks(ctx);
for(i=0;i<G.enemies.length;i++){var e=G.enemies[i],ealpha=e.ghost?.5:1;if(e.type==='medic'&&e.beam)line(ctx,e.x,e.y,e.beam.x,e.beam.y,PAL.g,1,.7*ealpha);
if(e.type==='shielder'&&e.guardId!=null){var g=null;for(var q=0;q<G.enemies.length;q++)if(G.enemies[q].id===e.guardId&&!G.enemies[q].dead){g=G.enemies[q];break}if(g)line(ctx,e.x,e.y,g.x,g.y,PAL.b,1,.25)}
if(e.type==='sniper'&&e.tel>0){var p2=Math.floor(G.t*16)%2===0;ctx.fillStyle=p2?'#fff':PAL.r;for(q=8;q<440;q+=5)ctx.fillRect(Math.round(e.x+Math.cos(e.lock)*q),Math.round(e.y+Math.sin(e.lock)*q),1,1)}
if(e.type==='ram'&&e.tel>0){var rp2=Math.floor(G.t*20)%2===0;pxCircle(ctx,e.x,e.y,e.r+4,rp2?'#fff':'#ff4d4d',.85);for(q=6;q<60;q+=4){ctx.fillStyle=rp2?'#fff':'#ff4d4d';ctx.fillRect(Math.round(e.x+Math.cos(e.lock)*q),Math.round(e.y+Math.sin(e.lock)*q),2,2)}}
if(e.type==='lgun'&&e.open>0){var op=e.open;ctx.save();ctx.globalAlpha=.8;for(var pt=0;pt<4;pt++){var pa2=pt*TAU/4+G.t*.6;line(ctx,e.x+Math.cos(pa2)*4,e.y+Math.sin(pa2)*4,e.x+Math.cos(pa2)*(5+op*9),e.y+Math.sin(pa2)*(5+op*9),'#a86bff',2,.9)}ctx.restore()}
if(e.type==='emitter'&&e.tel>0){p2=Math.floor(G.t*16)%2===0;pxCircle(ctx,e.x,e.y,e.r+5,p2?'#fff':PAL.c,.8)}
var np=nearestPlayer(e.x,e.y),ang=(e.type==='dark')?e.aim:(e.type==='mirror'||e.type==='aegis')?e.face:(e.type==='bastard')?(e.lock||0):(e.boss?(e.bossKind==='phantom'?e.t*.8:e.t*.35):((e.type==='shooter'||e.type==='tank'||e.type==='sniper'||e.type==='emitter'||e.type==='ram'||e.type==='jammer')?Math.atan2(np.y-e.y,np.x-e.x):(e.type==='shielder'?e.face:Math.atan2(e.vy,e.vx))));
if(e.type==='dark'){var dst=SPR.darkShips[e.ship||'std'],dsp={x:e.x,y:e.y,aim:e.aim,id:e.id,swingT:e.swingT,swingDir:e.swingDir,col:'#5a3a9a',light:'#a86bff',plateT:e.beamT>0?1:0,vx:e.vx,vy:e.vy,dashT:e.dashT};if(e.ship==='monster')drawMonsterBack(ctx,dsp,true);ctx.globalAlpha=.3+.15*Math.sin(visualT*4);pxCircle(ctx,e.x,e.y,e.r+7,'#a86bff',.55);ctx.globalAlpha=1;drawSpr(ctx,dst,e.x,e.y,ang,e.fr>0&&Math.floor(G.t*30)%2===0,1);if(e.ship==='monster')drawMonsterFront(ctx,dsp,true);if(e.shield>0)pxCircle(ctx,e.x,e.y,e.r+3,'#a86bff',.4);var ds=e.stats;if(ds){if(ds.fireMode==='scythe')drawScythe(ctx,dsp,ds,.85);else if(ds.fireMode==='cone')drawCone(ctx,dsp,ds,PL,.85);if(ds.tesla)drawTesla(ctx,dsp,ds,PL,.7);if(ds.socio){var spn=e.socioSpin>0,bsp=spn?16:2.2;for(var bl2=0;bl2<2;bl2++){var ba2=G.t*bsp+bl2*Math.PI,bx2=e.x+Math.cos(ba2)*22,by2=e.y+Math.sin(ba2)*22;line(ctx,e.x,e.y,bx2,by2,'#5a3a9a',2,.7);
if(e.ship==='psy')drawChainSaw(ctx,bx2,by2,ba2+Math.PI/2,G.t*(spn?16:5),'#a86bff',spn);
else drawBlade(ctx,bx2,by2,ba2,G.t*(spn?2.4:.7)+bl2*.5,'#a86bff',spn)}}for(var dq=0;dq<ds.drones;dq++){var da=G.t*1.8+dq*TAU/Math.max(1,ds.drones);drawSpr(ctx,SPR.drone,e.x+Math.cos(da)*16,e.y+Math.sin(da)*16,da*2,false,.8)}if(ds.aegis)for(var ag2=0;ag2<ds.aegisN;ag2++){var aa2=e.aegisA+ag2*TAU/ds.aegisN,ax2=e.x+Math.cos(aa2)*e.aegisR,ay2=e.y+Math.sin(aa2)*e.aegisR;ctx.fillStyle='#a86bff';ctx.fillRect(Math.round(ax2)-2,Math.round(ay2)-2,4,4)}}}
else if(e.born>0)drawBorn(ctx,e,resolveSpr(e),ang);
else drawSpr(ctx,resolveSpr(e),e.x,e.y,ang,(e.fr>0||e.fl>0)&&Math.floor(G.t*30)%2===0,ealpha);
if(e.type==='bastard'){var ba=e.lock||0;for(var bs=-1;bs<=1;bs+=2){var bx0=e.x+Math.cos(ba)*(e.r-1)-Math.sin(ba)*bs*3.5,by0=e.y+Math.sin(ba)*(e.r-1)+Math.cos(ba)*bs*3.5;line(ctx,bx0,by0,bx0+Math.cos(ba)*9,by0+Math.sin(ba)*9,e.st==='fire'?'#ffb020':'#8f5a10',2.5,.95)}if(e.st==='fire'){var mx0=e.x+Math.cos(ba)*(e.r+9),my0=e.y+Math.sin(ba)*(e.r+9);ctx.save();ctx.globalAlpha=.5+.4*Math.sin(visualT*40);pxDisc(ctx,mx0,my0,3,'#ffb020',.8);ctx.restore();ctx.save();ctx.globalAlpha=.85;ctx.strokeStyle='#ff4d4d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,-Math.PI/2,-Math.PI/2+TAU*clamp(e.heat,0,1));ctx.stroke();ctx.restore();txt(ctx,'УЯЗВИМ',e.x,e.y-e.r-20,'#9dff3c',10,'center')}else if(e.st==='cool'){ctx.save();ctx.globalAlpha=.3+.14*Math.sin(visualT*6);ctx.fillStyle='#b8fbff';ctx.beginPath();ctx.arc(e.x,e.y,e.r+7,0,TAU);ctx.fill();ctx.globalAlpha=.85;ctx.strokeStyle='#b8fbff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(e.x,e.y,e.r+7,0,TAU);ctx.stroke();ctx.restore();txt(ctx,'ЩИТ '+Math.max(0,e.cd).toFixed(1),e.x,e.y-e.r-20,'#b8fbff',10,'center')}}
if(e.type==='mirror'){ctx.save();ctx.strokeStyle=e.open>0?'#ff4d4d':'#b8fbff';ctx.lineWidth=2;ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(e.x,e.y,e.r+4,e.face-1,e.face+1);ctx.stroke();ctx.restore()}
if(e.type==='aegis'){ctx.save();ctx.globalAlpha=.35+.15*Math.sin(visualT*3);pxCircle(ctx,e.x,e.y,e.r+6,'#b8fbff',.6);ctx.restore()}
if(e.boss&&e.type!=='dark'){ctx.globalAlpha=(.18+.1*Math.sin(visualT*3))*ealpha;pxCircle(ctx,e.x,e.y,e.r+7+Math.round(Math.sin(visualT*2)*2),e.col,.5);ctx.globalAlpha=1}
if(e.type==='shielder'){var col=e.shieldFl>0?'#fff':PAL.c;for(var t=-1.1;t<=1.1;t+=.16){ctx.fillStyle=col;ctx.fillRect(Math.round(e.x+Math.cos(e.face+t)*(e.r+3)),Math.round(e.y+Math.sin(e.face+t)*(e.r+3)),2,2)}}
if(e.bossKind==='prism')for(var k2=0;k2<3;k2++){var a0=e.shieldAng+k2*TAU/3;for(t=-.5;t<=.5;t+=.12){ctx.fillStyle=e.shieldFl>0?'#fff':PAL.c;ctx.fillRect(Math.round(e.x+Math.cos(a0+t)*(e.r+5)),Math.round(e.y+Math.sin(a0+t)*(e.r+5)),2,2)}}
if(e.bleedT>0){ctx.save();ctx.globalAlpha=.55+.2*Math.sin(visualT*9+e.id);ctx.strokeStyle='#ff4d4d';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(e.x,e.y,e.r*(e.sc||1)+3,0,TAU);ctx.stroke();ctx.restore();txt(ctx,'КРОВЬ',e.x,e.y-e.r-26,'#ff4d4d',10,'center')}
if(e.electroT>0){ctx.save();ctx.globalAlpha=.5+.3*Math.sin(visualT*17+e.id);ctx.strokeStyle='#b8fbff';ctx.lineWidth=1;for(var ez=0;ez<3;ez++){var za2=visualT*7+ez*2.1+e.id;bolt(ctx,e.x,e.y,e.x+Math.cos(za2)*(e.r+8),e.y+Math.sin(za2)*(e.r+8),e.id+ez,3);ctx.stroke()}ctx.restore()}
if(e.stunT>0){ctx.save();ctx.globalAlpha=.85;ctx.strokeStyle='#ffb020';ctx.lineWidth=1.5;ctx.beginPath();for(var sz3=0;sz3<9;sz3++){var sa3=sz3*.75+visualT*11,sr3=e.r+7+Math.sin(sz3*2+visualT*16)*2.5,sx3=e.x+Math.cos(sa3)*sr3,sy3=e.y+Math.sin(sa3)*sr3;if(sz3===0)ctx.moveTo(sx3,sy3);else ctx.lineTo(sx3,sy3)}ctx.closePath();ctx.stroke();ctx.restore();txt(ctx,'СТАН',e.x,e.y-e.r-18,'#ffb020',10,'center')}
if(e.elite!=null){var ec=[PAL.C,PAL.g,PAL.m,PAL.a][e.elite];ctx.save();ctx.globalAlpha=.22+.12*Math.sin(visualT*4+i);ctx.strokeStyle=ec;ctx.lineWidth=1;ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,0,TAU);ctx.stroke();ctx.restore();txt(ctx,ELITE_NAMES[e.elite],e.x,e.y-e.r-19,ec,11,'center')}
if(e.shield>0&&e.type!=='dark'){ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle='#b8fbff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(e.x,e.y,e.r+3,0,TAU);ctx.stroke();ctx.restore()}
if(e.type==='tank'||e.type==='shielder'||e.type==='medic'||e.type==='emitter'||e.boss||e.type==='dark'||e.type==='ram'||e.type==='lgun'||e.type==='mirror'||e.type==='brood'||e.type==='jammer'||e.type==='bastard'){var f=clamp(e.hp/e.max,0,1),bw=(e.boss||e.type==='dark')?26:16;ctx.fillStyle=PAL.o;ctx.fillRect(Math.round(e.x-bw/2)-1,Math.round(e.y-e.r-7),bw+2,4);ctx.fillStyle=THEME.dp;ctx.fillRect(Math.round(e.x-bw/2),Math.round(e.y-e.r-6),bw,2);ctx.fillStyle=e.type==='medic'?PAL.g:(f>.5?PAL.g:(f>.25?PAL.a:PAL.r));ctx.fillRect(Math.round(e.x-bw/2),Math.round(e.y-e.r-6),Math.round(bw*f),2)}}
for(i=0;i<G.ebul.length;i++){var eb=G.ebul[i],os=typeof eb.spr==='string'?SPR[eb.spr]:eb.spr;if(os)ctx.drawImage(os.n,Math.round(eb.x-2),Math.round(eb.y-2))}
for(i=0;i<G.rockets.length;i++){var r=G.rockets[i];drawSpr(ctx,r.mini?SPR.miniRocket:SPR.rocket,r.x,r.y,r.a,false,1)}
for(i=0;i<G.erock.length;i++){var er=G.erock[i];drawSpr(ctx,SPR.miniRocket,er.x,er.y,er.a,false,1);ctx.globalAlpha=.5;pxCircle(ctx,er.x,er.y,4,'#a86bff',.5);ctx.globalAlpha=1}
for(i=0;i<G.ghost.length;i++){var gh=G.ghost[i],gd=(pdTints()[gh.tint||0]||{d:0}).d;
var gs=gh.dark?(SPR.darkShips[gh.ship||'std']||SPR.darkShips.std).n:(gd?tintedSpr(gh.ship||'std',gh.id,gd).n:(SPR.ships[gh.ship||'std']||SPR.ships.std)[gh.id?1:0].n);
ctx.save();ctx.globalAlpha=clamp(gh.l/gh.m,0,1)*.35;ctx.translate(Math.round(gh.x),Math.round(gh.y));ctx.rotate(gh.a);ctx.drawImage(gs,-Math.round(gs.width/2),-Math.round(gs.height/2));ctx.restore()}
for(var pi=0;pi<PL.length;pi++){var p=PL[pi],pspr=playerSprT(p),st=p.stats||computeStats(p.lvl,p.ship,metaOf(p));if(p.hp<=0){ctx.globalAlpha=.5;pxCircle(ctx,p.x,p.y,7,'#6b6a8a',.6);txt(ctx,'X',p.x,p.y-6,'#6b6a8a',12,'center');ctx.globalAlpha=1;continue}
var hpf=clamp(p.hp/p.max,0,1),rc=p.recoil||0,jit=p.ship==='psy'?(1+(p.dashT>0?1.6:0)):0;
var rcx=-Math.cos(p.aim)*rc*5+(jit?rand(-jit,jit)*.5:0),rcy=-Math.sin(p.aim)*rc*5+(jit?rand(-jit,jit)*.5:0);
var engBad=hpf<.25&&Math.floor(G.t*12)%3===0;
var dp2={x:p.x+rcx,y:p.y+rcy,aim:p.aim,id:p.id,col:p.col,light:p.light,vx:p.vx,vy:p.vy,dashT:p.dashT,recoil:rc,bay:p.bay,plateT:p.plateT,swingT:p.swingT,engBad:engBad};
if(p.ship==='monster')drawMonsterBack(ctx,dp2,false);
drawShipAnim(ctx,dp2,st,'back');
if(st.tesla)drawTesla(ctx,dp2,st);
if(st.fireMode==='cone'&&p.engaging)drawCone(ctx,dp2,st);
if(st.fireMode==='scythe')drawScythe(ctx,dp2,st);
if(st.ship==='sniper'){ctx.globalAlpha=.22;line(ctx,dp2.x+Math.cos(p.aim)*12,dp2.y+Math.sin(p.aim)*12,dp2.x+Math.cos(p.aim)*340,dp2.y+Math.sin(p.aim)*340,'#ff4d4d',1,.5);ctx.globalAlpha=1}
for(i=0;i<st.drones;i++){var a2=G.t*1.8+i*TAU/Math.max(1,st.drones);drawSpr(ctx,SPR.drone,dp2.x+Math.cos(a2)*16,dp2.y+Math.sin(a2)*16,a2*2,false,1)}
if(st.healDrone){var ha=G.t*1.2+Math.PI;drawSpr(ctx,SPR.healdrone,dp2.x+Math.cos(ha)*18,dp2.y+Math.sin(ha)*18,ha*2,false,1)}
if(st.socio){var spin=p.socioSpin>0,bsp2=spin?16:2.2,isPsy=p.ship==='psy';
for(var bl=0;bl<2;bl++){var ba=G.t*bsp2+bl*Math.PI,bx3=dp2.x+Math.cos(ba)*22,by3=dp2.y+Math.sin(ba)*22;
line(ctx,dp2.x+Math.cos(ba)*8,dp2.y+Math.sin(ba)*8,bx3,by3,PAL.o,3,.9);
line(ctx,dp2.x+Math.cos(ba)*8,dp2.y+Math.sin(ba)*8,bx3,by3,spin?'#ffd6f2':PAL.v,1.5,.85);
if(isPsy)drawChainSaw(ctx,bx3,by3,ba+Math.PI/2,G.t*(spin?15:4.5)+bl*.5,spin?'#ff8fd4':PAL.v,spin);
else drawBlade(ctx,bx3,by3,ba,G.t*(spin?2.4:.7)+bl*.5,spin?'#ff8fd4':PAL.v,spin);
if(spin&&Math.random()<.25)part(bx3,by3,'#ffd6f2',1,50,.2,1)}}
if(st.aegis)for(var ag=0;ag<st.aegisN;ag++){var aa=p.aegisA+ag*TAU/st.aegisN,ax=dp2.x+Math.cos(aa)*p.aegisR,ay=dp2.y+Math.sin(aa)*p.aegisR;ctx.fillStyle=PAL.o;ctx.fillRect(Math.round(ax)-3,Math.round(ay)-3,6,6);ctx.fillStyle='#b8fbff';ctx.fillRect(Math.round(ax)-2,Math.round(ay)-2,4,4);ctx.fillStyle='#fff';ctx.fillRect(Math.round(ax)-1,Math.round(ay)-1,2,2)}
var blink=p.inv&&Math.floor(G.t*20)%2===0,fb=Math.sin(G.t*3.2+p.id*2.1)*.8,fbx=dp2.x-Math.sin(p.aim)*fb,fby=dp2.y+Math.cos(p.aim)*fb,bank=Math.sin(G.t*2.6+p.id*1.7)*.05,alpha=p.invis>0?.26:1;
if(!blink)drawSpr(ctx,pspr,fbx,fby,p.aim+bank,p.hurtT>0&&Math.floor(G.t*30)%2===0,alpha);
if(p.ship==='monster')drawMonsterFront(ctx,dp2,false);
drawShipAnim(ctx,dp2,st,'front');
if(hpf<.5){ctx.save();ctx.globalAlpha=(1-hpf/.5)*.5;ctx.fillStyle='#ff4d4d';ctx.fillRect(Math.round(dp2.x)-3,Math.round(dp2.y)-2,2,2);ctx.fillRect(Math.round(dp2.x)+2,Math.round(dp2.y)+1,2,2);ctx.restore()}
if(p.invis>0){ctx.save();ctx.globalAlpha=.5+.2*Math.sin(visualT*8);ctx.strokeStyle='#a86bff';ctx.lineWidth=1.2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(dp2.x,dp2.y,p.r+9,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.restore();txt(ctx,'НЕВИДИМ '+p.invis.toFixed(1),dp2.x,dp2.y-p.r-24,'#a86bff',11,'center')}
if(p.shield>0)pxCircle(ctx,dp2.x,dp2.y,p.r+5,PAL.v,.3+.5*(p.shield/st.shieldMax));
if(p.beamT>0&&p.beamChain)for(i=0;i<p.beamChain.length;i++){var c=p.beamChain[i];line(ctx,c.x1,c.y1,c.x2,c.y2,PAL.m,7,.25);line(ctx,c.x1,c.y1,c.x2,c.y2,'#fff',2,.9)}
var pr=p.dashCd<=0?1:1-p.dashCd/st.dashCd;pxCircle(ctx,dp2.x,dp2.y,p.r+7,p.dashCd<=0?p.col:THEME.eg,.3+.2*pr);
if(p.stun>0)txt(ctx,'СТАН',dp2.x,dp2.y-p.r-24,'#ffb020',11,'center');if(p.jammed)txt(ctx,'ЗАГЛУШЕН',dp2.x,dp2.y+p.r+8,'#22e6ff',11,'center');if(p.trapped){ctx.globalAlpha=.8;pxCircle(ctx,dp2.x,dp2.y,p.r+9,'#a86bff',.6);ctx.globalAlpha=1}
if(PL.length>1){var hf2=clamp(p.hp/p.max,0,1);ctx.fillStyle=PAL.o;ctx.fillRect(Math.round(dp2.x)-12,Math.round(dp2.y)-p.r-16,24,4);ctx.fillStyle=p.col;ctx.fillRect(Math.round(dp2.x)-11,Math.round(dp2.y)-p.r-15,Math.round(22*hf2),2);txt(ctx,String(p.id+1),dp2.x,dp2.y-p.r-28,p.col,12,'center')}}
if(!isTouch&&G.t-mouseT<4&&idx===0&&!splitActive()){var wpt=screenToWorld(mx,my);ctx.fillStyle=THEME.pal.c;ctx.fillRect(Math.round(wpt.x)-3,Math.round(wpt.y),7,1);ctx.fillRect(Math.round(wpt.x),Math.round(wpt.y)-3,1,7)}
for(i=0;i<G.bul.length;i++){var bl2=G.bul[i];ctx.save();ctx.translate(Math.round(bl2.x),Math.round(bl2.y));ctx.rotate(bl2.a);if(bl2.dr){ctx.fillStyle=PAL.g;ctx.fillRect(-2,-1,4,2);ctx.fillStyle='#fff';ctx.fillRect(0,-1,1,2)}else{ctx.fillStyle=bl2.col||PAL.a;ctx.fillRect(-2,-2,4,4);ctx.fillStyle='#fff';ctx.fillRect(0,-1,2,2)}ctx.restore()}
for(i=0;i<G.parts.length;i++){var pp=G.parts[i],al=clamp(pp.l/pp.m,0,1);ctx.globalAlpha=al>.35?1:.55;ctx.fillStyle=pp.c;var sz2=pp.s+(al>.7?1:0);ctx.fillRect(Math.round(pp.x),Math.round(pp.y),sz2,sz2)}ctx.globalAlpha=1;
for(i=0;i<G.floats.length;i++){var fl=G.floats[i];if(fl.l<.2&&Math.floor(fl.l*30)%2===0)continue;txt(ctx,fl.t,fl.x,fl.y,fl.c,fl.s>1?15:12,'center')}
ctx.restore();
var mw=Math.min(56,vw*.3),mh=Math.round(AR.h/AR.w*mw),mx0=vx+vw-mw-4,my0=vy+4,sc=mw/AR.w;ctx.globalAlpha=.8;ctx.fillStyle=THEME.dp;ctx.fillRect(mx0,my0,mw,mh);ctx.strokeStyle=THEME.eg;ctx.strokeRect(mx0+.5,my0+.5,mw-1,mh-1);
ctx.globalAlpha=.95;for(i=0;i<G.enemies.length;i++){var ee2=G.enemies[i];ctx.fillStyle=ee2.boss?PAL.r:(ee2.type==='dark'?'#a86bff':ee2.type==='medic'?PAL.g:ee2.type==='emitter'?PAL.c:PAL.m);ctx.fillRect(mx0+ee2.x*sc,my0+ee2.y*sc,(ee2.boss||ee2.type==='dark')?3:1,(ee2.boss||ee2.type==='dark')?3:1)}
if(G.cap){ctx.fillStyle=G.cap.dead?'#6b6a8a':'#ffb020';ctx.fillRect(mx0+G.cap.x*sc-5,my0+G.cap.y*sc-2,10,4)}
if(G.portal){var ppx=mx0+G.portal.x*sc,ppy=my0+G.portal.y*sc,pp2=.5+.5*Math.sin(visualT*6);ctx.globalAlpha=.5+.5*pp2;pxCircle(ctx,ppx,ppy,3+Math.round(pp2*2),'#22e6ff',.9);ctx.fillStyle='#fff';ctx.fillRect(Math.round(ppx)-1,Math.round(ppy)-1,2,2);ctx.globalAlpha=1}
for(pi=0;pi<PL.length;pi++){var pp3=PL[pi];if(pp3.hp<=0)continue;ctx.fillStyle=pp3.col;ctx.fillRect(mx0+pp3.x*sc-1,my0+pp3.y*sc-1,2,2)}ctx.globalAlpha=1;
if(splitActive()){txt(ctx,'ИГРОК '+(focus.id+1),vx+6,vy+vh-16,focus.col,13);ctx.save();ctx.globalAlpha=.5;ctx.strokeStyle=focus.col;ctx.lineWidth=1;ctx.strokeRect(vx+.5,vy+.5,vw-1,vh-1);ctx.restore()}}
function render(ctx){ctx.imageSmoothingEnabled=false;if(G.state==='map'){drawMap(ctx);return}if(G.state==='gloss'){ctx.fillStyle=THEME.v;ctx.fillRect(0,0,W,H);drawParallax(ctx,CAM,0,0,W,H);return}if(G.travel&&(G.state==='travel'||G.state==='up')){drawTravel(ctx);return}ctx.fillStyle=THEME.v;ctx.fillRect(0,0,W,H);
if(splitActive()){if(H>=W){renderScene(ctx,0,0,W,H/2-1,P,1,0);renderScene(ctx,0,H/2+1,W,H/2-1,P2,1,1);ctx.fillStyle=THEME.eg;ctx.fillRect(0,H/2-1,W,2)}else{renderScene(ctx,0,0,W/2-1,H,P,1,0);renderScene(ctx,W/2+1,0,W/2-1,H,P2,1,1);ctx.fillStyle=THEME.eg;ctx.fillRect(W/2-1,0,2,H)}}else renderScene(ctx,0,0,W,H,viewPlayer(),G.zoom,0);
drawSticks(ctx);drawChronoScreen(ctx);drawDmgMarks(ctx);drawPortalPointer(ctx);if(G.cap&&G.state==='play')drawCapTimer(ctx);if(G.portal&&G.state==='play')drawTransfer(ctx);drawGlitch(ctx);
if(G.flash>0){ctx.globalAlpha=Math.min(.55,G.flash);ctx.fillStyle=G.flashCol;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
var vp=viewPlayer();if(G.state==='play'&&vp.hp/vp.max<.3&&!CHEAT.god){var pl=.4+.6*Math.abs(Math.sin(G.t*4));ctx.globalAlpha=pl;ctx.fillStyle=PAL.r;ctx.fillRect(0,VIEW.y,W,1);ctx.fillRect(0,VIEW.y+VIEW.h-1,W,1);ctx.fillRect(0,VIEW.y,1,VIEW.h);ctx.fillRect(W-1,VIEW.y,1,VIEW.h);ctx.globalAlpha=1}}
var SCR={title:'#sTitle',gloss:'#sGloss',up:'#sUp',shop:'#sShop',pause:'#sPause',over:'#sOver',win:'#sWin'};
function setState(s){G.state=s;G.padSel=0;P.padSel=0;P2.padSel=0;resetSticks();clearSel();for(var k in SCR)$(SCR[k]).classList.remove('on');if(SCR[s])$(SCR[s]).classList.add('on');
if(s!=='play'){var te=$('#tutor');if(te)te.classList.remove('on');TUT.life=0}
if(s==='pause')syncCheatUI();if(s==='title'){buildTitleCols();buildModePills()}if(s==='gloss')buildGloss();var sc=$(SCR[s]);if(sc)sc.scrollTop=0}
function banner(a,b){var el=$('#banner');el.classList.remove('dread');el.querySelector('b').textContent=a;el.querySelector('s').textContent=b||'';el.classList.remove('go');void el.offsetWidth;el.classList.add('go')}
function bannerDread(a){var el=$('#banner');el.querySelector('b').textContent=a;el.querySelector('s').textContent='';el.classList.remove('go');void el.offsetWidth;el.classList.add('dread');el.classList.add('go')}
function syncBest(){$('#tBest').textContent=fmt(G.best.score);$('#tWave').textContent=META.bestDepth;$('#tEnd').textContent=META.bestEnd;$('#tRuns').textContent=META.runs}
function saveBest(){var rec=G.score>G.best.score;if(rec){G.best={score:G.score,wave:G.wave};storeSet('best',G.best)}if(G.endless){if(G.wave>META.bestEnd)META.bestEnd=G.wave}else if(G.wave>META.bestDepth)META.bestDepth=G.wave;saveMeta();syncBest();return rec}
function bankFrags(){META.runs++;saveMeta()}
function statsHTML(){var acc=G.st.shots?Math.round(G.st.hits/G.st.shots*100):0,m=Math.floor(G.st.time/60),s=Math.floor(G.st.time%60),mods=0,L=localPlayer().lvl;for(var k in L)if(typeof L[k]==='number')mods+=L[k];return[['УРОВЕНЬ',G.wave,''],['СЧЁТ',fmt(G.score),'g'],['УБИЙСТВ',G.kills,'m'],['ТОЧНОСТЬ',acc+'%','a'],['МОДУЛЕЙ',mods,''],['ВРЕМЯ',m+':'+(s<10?'0':'')+s,'g']].map(function(x){return '<div class="stat '+x[2]+'"><s>'+x[0]+'</s><b>'+x[1]+'</b></div>'}).join('')}
function toggleSound(){A.init();A.resume();musUnlock();A.setOn(!A.on);syncSound();if(A.on)A.tone(660,.1,'square',.1,1.3,0,'ui')}
function syncSound(){var b=$('#bSound');b.classList.toggle('off',!A.on);b.textContent=A.on?'♪':'x'}
function setTheme(k){if(!THEMES[k])return;themeKey=k;THEME=THEMES[k];storeSet('theme',k);var root=document.documentElement,css=themeCss(THEME);for(var v in css)root.style.setProperty(v,css[v]);applyThemePal();buildSprites();refreshMonsterSprites();SPR.capBig=null;floorCanvas=makeFloor(AR.w,AR.h);if(ctx)initBackground(ctx);syncTheme();recalc();setupTouchButtons(true)}
function syncTheme(){document.querySelectorAll('[data-theme]').forEach(function(p){p.classList.toggle('on',p.getAttribute('data-theme')===themeKey)})}
function buildThemeButtons(){var el=$('#themePills');Object.keys(THEMES).forEach(function(k){var b=document.createElement('button');b.className='pill';b.type='button';b.setAttribute('data-theme',k);b.setAttribute('data-own','0');b.textContent=THEMES[k].n;b.addEventListener('click',function(){setTheme(k);A.init();A.tone(520,.07,'square',.08,1.3,0,'ui')});el.appendChild(b)});syncTheme();
var bt=$('#bloomToggle');bt.classList.toggle('on',bloomOn);bt.textContent='СВЕЧЕНИЕ: '+(bloomOn?'ВКЛ':'ВЫКЛ');bt.addEventListener('click',function(){bloomOn=!bloomOn;storeSet('bloom',bloomOn);bt.classList.toggle('on',bloomOn);bt.textContent='СВЕЧЕНИЕ: '+(bloomOn?'ВКЛ':'ВЫКЛ');A.init();A.tone(bloomOn?660:330,.07,'square',.08,1.2,0,'ui')});
var ht=$('#hapticToggle');ht.classList.toggle('on',HAP.on);ht.textContent='ВИБРАЦИЯ: '+(HAP.on?'ВКЛ':'ВЫКЛ');ht.addEventListener('click',function(){HAP.set(!HAP.on);ht.classList.toggle('on',HAP.on);ht.textContent='ВИБРАЦИЯ: '+(HAP.on?'ВКЛ':'ВЫКЛ');if(HAP.on)HAP.win();A.init();A.tone(HAP.on?660:330,.07,'square',.08,1.2,0,'ui')});
var tr=$('#bTutReset');if(tr)tr.addEventListener('click',function(){tutReset();tr.textContent='ОБУЧЕНИЕ СБРОШЕНО';setTimeout(function(){tr.textContent='ПОКАЗАТЬ ОБУЧЕНИЕ СНОВА'},1600);A.init();A.tone(700,.07,'triangle',.07,1.3,0,'ui')})}
function buildKeys(){var K=[['ГЕЙМПАД 1','стики · LT рывок · RT оружие · Y смена · A подтвердить'],['ГЕЙМПАД 2','игрок 2 в локальном co-op'],['W A S D','P1 движение'],['МЫШЬ','P1 прицел · ЛКМ оружие · КОЛЕСО смена'],['ПРОБЕЛ','P1 рывок · Q/E смена оружия'],['СТРЕЛКИ','P2 движение и меню'],['ENTER / /','P2 рывок / оружие'],['1 2 3 / 8 9 0','модули P1 / P2']];['#keys1','#keys2'].forEach(function(sel){var el=$(sel);if(!el)return;el.innerHTML='';K.forEach(function(k){var d=document.createElement('div');d.className='key';d.innerHTML='<kbd>'+k[0]+'</kbd><span>'+k[1]+'</span>';el.appendChild(d)})})}
function togglePanel(which){var ps=$('#panelSettings'),pc=$('#panelCoop'),bs=$('#bTabSettings'),bc=$('#bTabCoop');if(!ps||!pc)return;var oS=!ps.classList.contains('hidden'),oC=!pc.classList.contains('hidden'),wS=which==='settings'?!oS:false,wC=which==='coop'?!oC:false;ps.classList.toggle('hidden',!wS);pc.classList.toggle('hidden',!wC);if(bs)bs.classList.toggle('on',wS);if(bc)bc.classList.toggle('on',wC);G.padSel=0;P.padSel=0;P2.padSel=0;clearSel();A.init();A.tone(wS||wC?620:380,.06,'square',.07,wS||wC?1.25:.7,0,'ui');var el=wS?ps:wC?pc:null;if(el)setTimeout(function(){try{el.scrollIntoView({block:'nearest'})}catch(e){}},40)}
function addFeedback(sel){var box=$(sel+' .box');if(!box||box.querySelector('.fb'))return;var a=document.createElement('a');a.className='btn fb';a.setAttribute('data-own','0');a.href='https://t.me/Gooseetler';a.target='_blank';a.rel='noopener';a.textContent='ОБРАТНАЯ СВЯЗЬ';a.style.marginTop='12px';a.style.display='inline-block';a.style.textDecoration='none';box.appendChild(a)}
function sliderRow(label,key,onChange){var row=document.createElement('div');row.className='volrow';var lab=document.createElement('span');lab.className='vlab';lab.textContent=label;var sl=document.createElement('input');sl.type='range';sl.min='0';sl.max='100';sl.className='vslide';sl.value=String(Math.round(VOL[key]*100));var val=document.createElement('span');val.className='vval';val.textContent=sl.value+'%';sl.addEventListener('input',function(){VOL[key]=parseInt(sl.value,10)/100;val.textContent=sl.value+'%';applyVolumes();onChange&&onChange()});row.appendChild(lab);row.appendChild(sl);row.appendChild(val);return row}
function injectSoundUI(){var mount=$('#volMount');if(!mount||$('#volBox'))return;mount.innerHTML='<span>ЗВУК</span>';var box=document.createElement('div');box.id='volBox';box.appendChild(sliderRow('ОБЩАЯ','master'));box.appendChild(sliderRow('МУЗЫКА','music',function(){musUnlock()}));box.appendChild(sliderRow('ЭФФЕКТЫ','sfx',function(){A.init();A.shoot()}));box.appendChild(sliderRow('ИНТЕРФЕЙС','ui',function(){A.init();A.pick(4)}));var np=document.createElement('div');np.id='nowPlaying';np.textContent='';box.appendChild(np);mount.appendChild(box)}
var touchSig='__';
function setupTouchButtons(force){var box=$('#rbtns');if(!box)return;var lp=localPlayer(),st=lp.stats;if(!st)return;var sig=lp.ship+'|'+st.weapons.join(',')+'|'+(st.weapon||'')+'|'+lp.wsel;if(sig===touchSig&&!force)return;touchSig=sig;box.innerHTML='';
function mk(cls,icon,col,label,on){var b=document.createElement('button');b.className='rbtn '+cls;b.appendChild(iconCanvas(icon,col,4));if(label){var i=document.createElement('i');i.textContent=label;b.appendChild(i)}b.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();A.init();A.resume();on(b);try{b.setPointerCapture(e.pointerId)}catch(err){}});b.addEventListener('pointerup',function(e){e.stopPropagation();if(cls==='d')touchDashHeld=false});b.addEventListener('pointercancel',function(){if(cls==='d')touchDashHeld=false});box.appendChild(b);return b}
if(lp.ship==='monster'&&st.weapons.length)st.weapons.forEach(function(w,idx){var u=upByKey(w),b=mk('w'+(idx===lp.wsel?' sel':''),w,u?u.col:'#ffb020',String(idx+1),function(){lp.wsel=idx;LI.weapon=true;setupTouchButtons(true)});b.dataset.w=w});
else if(st.weapon)mk('w',st.weapon==='chrono'?'chrono':st.weapon,(upByKey(st.weapon)||{}).col||'#4d8cff','',function(){LI.weapon=true});
mk('d','dash','#22e6ff','',function(){LI.dash=true;touchDashHeld=true})}
var hudT=0,lScore=-1,lShards=-1,lFrags=-1,lTrack='';
function hud(dt){hudT+=dt;var p=viewPlayer(),st=p.stats||computeStats(p.lvl,p.ship,metaOf(p)),hf=clamp(p.hp/p.max,0,1);$('#hpFill').style.transform='scaleX('+hf+')';$('#hpBar').classList.toggle('low',hf<.34);$('#stage').classList.toggle('low',G.state==='play'&&hf<.3&&!CHEAT.god);var dp=st.dashCd>0?clamp(1-p.dashCd/st.dashCd,0,1):1;$('#dashFill').style.transform='scaleX('+dp+')';$('#shBar').style.display=st.shieldMax?'block':'none';if(st.shieldMax)$('#shFill').style.transform='scaleX('+clamp(p.shield/st.shieldMax,0,1)+')';
var lp=localPlayer(),wshow=null,wcd=0,wmax=0;if(lp.ship==='monster'&&st.weapons.length){var w=st.weapons[lp.wsel%st.weapons.length];wshow=w;wcd=lp.wcd[w];wmax=st.wstat[w].cd}else if(st.weapon){wshow=st.weapon;wcd=lp.weaponCd;wmax=st.weaponCdMax}
$('#rkBar').style.display=wshow?'block':'none';if(wshow)$('#rkFill').style.transform='scaleX('+(wmax?clamp(1-wcd/wmax,0,1):0)+')';
$('#comboFill').style.transform='scaleX('+clamp(G.comboT/2.4,0,1)+')';$('#comboBox').classList.toggle('hot',G.combo>=8);setupTouchButtons(false);
var rb=$('#rbtns').children;for(var i=0;i<rb.length;i++){var b=rb[i];if(b.classList.contains('d'))b.classList.toggle('cool',lp.dashCd>0||lp.stun>0);else if(b.dataset.w)b.classList.toggle('cool',lp.wcd[b.dataset.w]>0||lp.jammed);else b.classList.toggle('cool',wcd>0||lp.jammed)}
if(hudT>.1){hudT=0;$('#hpTxt').textContent=Math.ceil(p.hp);$('#comboTxt').textContent='x'+G.mult.toFixed(1);if(G.score!==lScore){lScore=G.score;$('#cScore').textContent=fmt(G.score)}if(lp.shards!==lShards){lShards=lp.shards;$('#cShards').textContent=lp.shards}if(lp.frags!==lFrags){lFrags=lp.frags;$('#cFrags').textContent=lp.frags}var tl=musLabel();if(tl!==lTrack){lTrack=tl;var np=$('#nowPlaying');if(np)np.textContent=tl?('♪ '+tl):''}}}
function initButtons(){$('#bStart').addEventListener('click',newRun);$('#bSound').addEventListener('click',toggleSound);$('#bPause').addEventListener('click',function(){if(G.state==='play')pause();else if(G.state==='pause')resume()});$('#bRestart').addEventListener('click',function(){if(G.state!=='title'&&G.state!=='gloss')newRun()});$('#bResume').addEventListener('click',resume);$('#bRestart2').addEventListener('click',newRun);$('#bMenu2').addEventListener('click',toMenu);$('#bAgain').addEventListener('click',newRun);$('#bMenu').addEventListener('click',toMenu);$('#bAgain2').addEventListener('click',newRun);$('#bMenu3').addEventListener('click',toMenu);$('#mpHost').addEventListener('click',hostGame);$('#mpJoin').addEventListener('click',onJoinClick);$('#bLocal').addEventListener('click',toggleLocal);var bg=$('#bGloss');if(bg)bg.addEventListener('click',function(){A.init();A.tone(680,.07,'triangle',.07,1.3,0,'ui');setState('gloss')});var bb=$('#bGlossBack');if(bb)bb.addEventListener('click',function(){setState('title')});var ts=$('#bTabSettings');if(ts)ts.addEventListener('click',function(){togglePanel('settings')});var tc=$('#bTabCoop');if(tc)tc.addEventListener('click',function(){togglePanel('coop')});var ci=$('#mpCode');if(ci)ci.addEventListener('keydown',function(e){if(e.code==='Enter'||e.code==='NumpadEnter'){e.preventDefault();e.stopPropagation();onJoinClick()}});addFeedback('#sPause')}
var cv,ctx;
function initGame(){cv=$('#cv');ctx=cv.getContext('2d',{alpha:false});setTheme(themeKey);resize();P.x=AR.w/2;P.y=AR.h/2;centerCam(true);recalc();P.hp=P.max;syncSound();syncBest();$('#cWave').textContent='—';initBackground(ctx);setupBloom();initInput(cv);injectSoundUI();initButtons();initShopButtons();buildThemeButtons();buildTitleCols();buildModePills();buildKeys();setupTouchButtons(true);initMusic();applyVolumes();requestAnimationFrame(frame)}
function resize(){var sw=window.innerWidth,sh=window.innerHeight,scale=clamp(Math.round(Math.min(sw,sh)/240),2,5),w=Math.ceil(sw/scale),h=Math.ceil(sh/scale);cv.width=w;cv.height=h;cv.style.width=w*scale+'px';cv.style.height=h*scale+'px';cv.SCALE=scale;ctx=cv.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;var topPx=$('#top').offsetHeight||50,botPx=$('#hud').offsetHeight||96,ti=Math.ceil(topPx/scale)+3,bi=Math.ceil(botPx/scale)+3;W=w;H=h;SCALE=scale;VIEW.x=0;VIEW.y=ti;VIEW.w=w;VIEW.h=Math.max(60,h-ti-bi);initBackground(ctx);setupBloom();centerCam(true)}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',function(){setTimeout(resize,250)});
function centerCam(snap){if(!snap)return;var t=camTargetFor(viewPlayer(),0,0,W,H,G.zoom);CAMS[0].x=t.x;CAMS[0].y=t.y;CAM.x=t.x;CAM.y=t.y;if(PL.length>1){var t2=camTargetFor(P2,0,0,W,H,1);CAMS[1].x=t2.x;CAMS[1].y=t2.y}}
function updateZoom(dt){if(isLocal()&&PL[0].hp>0&&PL[1].hp>0){var d=hyp(PL[0].x-PL[1].x,PL[0].y-PL[1].y);if(d>SPLIT_ON)G.splitOn=true;else if(d<SPLIT_OFF)G.splitOn=false;var target=G.splitOn?1:clamp(1-(d-90)/420,.62,1);G.zoom+=(target-G.zoom)*Math.min(1,4*dt)}else{G.splitOn=false;G.zoom+=(1-G.zoom)*Math.min(1,4*dt)}}
function resetPlayer(p,x,y){p.x=x;p.y=y;p.vx=0;p.vy=0;p.inv=1.2;p.dashCd=0;p.dashT=0;p.fireT=0;p.noHit=0;p.shield=0;p.shieldT=0;p.weaponCd=0;p.beamT=0;p.beamChain=[];p.hyperCd=0;p.dashHold=0;p.socioSpin=0;p.stun=0;p.trapped=0;p.invis=0;p.invisShot=false;p.jammed=false;p.aegisA=0;p.aegisOut=0;p.coneT=0;p.swingT=0;p.swingDir=1;p.wsel=0;p.wcd={wave:0,beam:0,rocket:0};p.plateT=0;p.recoil=0;p.bay=0;p.dmgFxT=0;p.engaging=false;p.idleT=rand(0,9);p.lastSeen={x:x,y:y};p.shards=0;p.frags=bankOf(p);p.dual=false;p.pickPhase=0;p.offer=[];p.ready=false;p.padSel=0;var mm=metaOf(p);p.ship=mm.ships.indexOf(mm.ship)>=0?mm.ship:'std';p.lvl=shipStart(p.ship);p.input={mx:0,my:0,aim:0,dash:false,weapon:false,cycle:false,focus:false,held:false}}
function newRun(){if(NET.mode==='guest')return;A.init();A.resume();musUnlock();G.enemies=[];G.bul=[];G.ebul=[];G.erock=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];G.mines=[];G.wells=[];G.turrets=[];G.phantoms=[];G.chronoFields=[];G.parts=[];G.drops=[];G.floats=[];G.rings=[];G.ghost=[];G.queue=[];G.cap=null;G.wrecks=[];G.dmgMarks=[];G.score=0;G.kills=0;G.levelKills=0;G.combo=0;G.comboT=0;G.mult=1;G.wave=1;G.boss=null;G.shake=0;G.flash=0;G.slow=0;G.glitch=0;G.st={shots:0,hits:0,time:0};G.portal=null;G.portalCharge=0;G.travel=false;G.travelT=0;G.travelDone=false;G.menuOpened=false;G.postT=0;G.pendingNode=null;G.lootMult=1;G.event=null;G.lastBossKind=null;G.darkUsed=false;G.zoom=1;G.splitOn=false;G.twinsLink=false;setArena(640,480);genMap();if(CHEAT.fullmap)applyFullMap();PL=(NET.connected||NET.mode==='local')?[P,P2]:[P];resetPlayer(P,AR.w/2-24,AR.h*.8);if(PL.length>1)resetPlayer(P2,AR.w/2+24,AR.h*.8);if(META.bonusShards>0){P.shards+=META.bonusShards;META.bonusShards=0;saveMeta()}if(isLocal()&&META2.bonusShards>0){P2.shards+=META2.bonusShards;META2.bonusShards=0;saveMeta()}recalc();for(var i=0;i<PL.length;i++)PL[i].hp=PL[i].max;G.shards=localPlayer().shards;G.frags=localPlayer().frags;setupTouchButtons(true);if(MUS.ready)musPickBattle();centerCam(true);$('#bossbar').classList.remove('on');startLevel(G.map[0][0]);syncBest();if(NET.mode==='host')netSend({t:'start'})}
function pause(){if(G.state!=='play'||NET.mode==='guest')return;setState('pause')}
function resume(){if(G.state!=='pause'||NET.mode==='guest')return;setState('play');A.resume()}
function toMenu(){setState('title');G.musicMode='title';G.enemies=[];G.bul=[];G.ebul=[];G.erock=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];G.mines=[];G.wells=[];G.turrets=[];G.phantoms=[];G.chronoFields=[];G.drops=[];G.queue=[];G.boss=null;G.portal=null;G.cap=null;G.wrecks=[];G.dmgMarks=[];$('#bossbar').classList.remove('on');syncBest();buildTitleCols()}
function gameOver(){setState('over');A.over();HAP.death();G.slow=1;shake(4);flash(.5,'#ff4d4d');part(P.x,P.y,'#ff4d4d',46,150,.9,2);ring(P.x,P.y,4,60,'#ff4d4d',.8);bankFrags();var rec=saveBest();$('#overRec').innerHTML=rec?'<span class="rec">НОВЫЙ РЕКОРД</span>':'';$('#overSub').textContent=(G.endless?'Бесконечный · ':'')+'Уровень '+G.wave+' · '+G.kills+' врагов · фрагменты сохранены';$('#overStats').innerHTML=statsHTML();if(NET.mode==='host')netSend({t:'over'})}
function winRun(){setState('win');A.win();HAP.win();flash(.35,'#9dff3c');bankFrags();var rec=saveBest();$('#winRec').innerHTML=rec?'<span class="rec">НОВЫЙ РЕКОРД</span>':'';$('#winStats').innerHTML=statsHTML();if(NET.mode==='host')netSend({t:'win'})}
var last=performance.now(),acc=0,meteorT=0;
function onBeat(){if(G.state==='pause')return;G.beat++;G.beats.push({r:3,a:.55});var heat=G.state==='play'?clamp(G.enemies.length/12+(G.boss?.5:0)+G.wave/30,0,1):.05;if(!MUS.active)A.beat(G.beat,heat,G.musicMode);var vp=viewPlayer();if(G.state==='play'&&vp.hp/vp.max<.3&&G.beat%2===0&&!CHEAT.god)A.tone(70,.12,'square',.14,.6)}
function frame(now){var raw=Math.min(.05,(now-last)/1000);last=now;G.dt=raw;A.fv=0;A.tokens=Math.min(36,A.tokens+raw*30);pollGamepads();padMenus();stickWatch();dashHeld=!!keys.Space||GP.dashHeld||touchDashHeld||mouseRightHeld;
if(GP.pause){if(G.state==='play')pause();else if(G.state==='pause')resume()}
updateVisual(raw);musUpdate(raw);tutTick(raw);ANIMT+=raw;
if(G.state==='shop'){merchUpdate(raw);drawMerchant()}
if(G.state==='title'&&PREVIEWS.length)for(var pv=0;pv<PREVIEWS.length;pv++){var pe=PREVIEWS[pv];if(pe.cv.offsetParent!==null)drawPreviewShip(pe.cv,pe.ship,pe.idx,pe.deg,ANIMT+pe.ph)}
if(G.state==='gloss'){if(GLQ.cv){GLQ.t+=raw;drawGlitchQ(GLQ.cv)}
var drawn=0;for(var ga=0;ga<GLOSSANIM.length&&drawn<14;ga++){var ge=GLOSSANIM[ga];if(ge.cv.offsetParent===null)continue;var rc=ge.cv.getBoundingClientRect();if(rc.bottom<0||rc.top>window.innerHeight)continue;
ge.next-=raw;if(ge.next<=0){ge.flash=.8;ge.next=rand(3,7)}if(ge.flash>0)ge.flash=Math.max(0,ge.flash-raw*3);
drawGlossSprite(ge,ANIMT);drawn++}}
G.beatT+=raw;var guard=0;while(G.beatT>=.4&&guard++<4){G.beatT-=.4;onBeat()}
if(G.travel){G.travelT+=raw;if(!G.menuOpened&&G.travelT>=.8){G.menuOpened=true;openUp();if(NET.mode==='host')netSend({t:'up'})}if(G.travelDone){G.postT+=raw;if(G.postT>=1){G.travel=false;startLevel(G.pendingNode)}}}
if(NET.mode==='guest'){var ri=readInput(P2,1);NET.pend.dash=NET.pend.dash||ri.dash;NET.pend.weapon=NET.pend.weapon||ri.weapon;NET.pend.cycle=NET.pend.cycle||ri.cycle;P2.input.mx=ri.mx;P2.input.my=ri.my;P2.input.aim=ri.aim;P2.input.focus=ri.focus;P2.input.held=ri.held;P2.input.dash=P2.input.dash||ri.dash;P2.input.weapon=P2.input.weapon||ri.weapon;P2.input.cycle=P2.input.cycle||ri.cycle;if(NET.connected&&now-NET.lastSend>33){NET.lastSend=now;netSend({t:'input',mx:ri.mx,my:ri.my,aim:ri.aim,focus:ri.focus,dash:NET.pend.dash,weapon:NET.pend.weapon,cycle:NET.pend.cycle,held:ri.held});NET.pend.dash=false;NET.pend.weapon=false;NET.pend.cycle=false}guestWorld(now);predictGuest(raw);render(ctx);applyBloom(ctx);hud(raw);requestAnimationFrame(frame);return}
if(G.state==='play'){feedInput(P,1);if(isLocal())feedInput(P2,2)}var scale=G.state==='play'?(G.slow>0?.4:1):(G.state==='title'?.6:(G.state==='over'||G.state==='win'?.5:.1));acc+=raw*scale;var steps=0;while(acc>=STEP&&steps<5){update(STEP);acc-=STEP;steps++}if(acc>STEP*5)acc=0;if(NET.mode==='host'&&NET.connected&&now-NET.lastState>33){NET.lastState=now;netSend(snapshot())}render(ctx);applyBloom(ctx);hud(raw);requestAnimationFrame(frame)}
function update(dt){G.t+=dt;G.shake=Math.max(0,G.shake-dt*22);G.shake*=Math.exp(-5.5*dt);if(G.shake>2.6)G.shake=2.6;
G.flash=Math.max(0,G.flash-dt*2.2);G.slow=Math.max(0,G.slow-dt);updateEffects(dt);updateWrecks(dt);
for(var dm=G.dmgMarks.length-1;dm>=0;dm--){G.dmgMarks[dm].l-=dt;if(G.dmgMarks[dm].l<=0)G.dmgMarks.splice(dm,1)}
if(G.state!=='play')return;updateChrono(dt);updateCap(dt);G.st.time+=dt;G.waveT+=dt*(chronoAnyGlobal()?.4:1);if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0){G.combo=0;G.mult=1}}
if(G.wave===1){G.tutT=(G.tutT||0)+dt;if(G.tutT>3.5)tutShow('aim');if(G.tutT>8)tutShow('dash');if(G.levelKills>0)tutShow('shard')}
var vp=viewPlayer();if(vp.hp>0&&vp.hp/vp.max<.35)tutShow('hurt');
var hpBefore=[];for(i=0;i<PL.length;i++)hpBefore.push(PL[i].hp);
for(var i=0;i<PL.length;i++){var pp=PL[i];if(pp.hp<=0)continue;var hf=pp.hp/pp.max;pp.dmgFxT=(pp.dmgFxT||0)-dt;
if(hf<.5&&pp.dmgFxT<=0){pp.dmgFxT=hf<.25?.14:.34;
part(pp.x+rand(-5,5),pp.y+rand(-4,4),Math.random()<.5?'#ffb020':'#ffd76a',1,45,.3,1);
if(hf<.25){part(pp.x-Math.cos(pp.aim)*8,pp.y-Math.sin(pp.aim)*8,'#6b6a8a',1,22,.8,2);
if(Math.random()<.35)part(pp.x+rand(-6,6),pp.y+rand(-5,5),'#ff4d4d',1,35,.4,1)}}}
if(G.cap){var cc=G.cap;cc.hunters=0;if(cc.kind==='rescue'&&!cc.dead)for(var ci=0;ci<G.enemies.length;ci++)if(G.enemies[ci].huntCap)cc.hunters++;
var fi=capFireInten(cc);if(fi>0&&Math.random()<dt*(12+fi*46)){var fx=cc.x+rand(-cc.w*.46,cc.w*.46),fy=cc.y+rand(-cc.h*.42,cc.h*.42);part(fx,fy,Math.random()<.5?'#ffb020':'#ff4d4d',1,40+fi*70,.5+fi*.4,1)}
if(fi>.5&&Math.random()<dt*5)part(cc.x+rand(-cc.w*.44,cc.w*.44),cc.y-cc.h*.4,'#6b6a8a',1,26,.9,2)}
if(G.event==='meteor'){meteorT-=dt;if(meteorT<=0){meteorT=1.2;var mp=nearestPlayer(rand(AR.x,AR.x+AR.w),rand(AR.y,AR.y+AR.h));spawnZone(mp.x+rand(-40,40),mp.y+rand(-40,40),26,.7,1,14*D.dmg*dmgScale(),'#ffb020')}}
if(G.portal){G.portal.age=(G.portal.age||0)+dt;var inside=null;
for(i=0;i<PL.length;i++){var p=PL[i];if(p.hp>0&&hyp(p.x-G.portal.x,p.y-G.portal.y)<G.portal.r+p.r){inside=p;break}}
var still=inside&&hyp(inside.vx,inside.vy)<10&&hyp(inside.input.mx,inside.input.my)<.1&&!inside.trapped;
if(still){G.portalCharge+=dt;if(G.portalCharge>=1.5){enterPortal();return}}else G.portalCharge=Math.max(0,G.portalCharge-dt*2);
if(G.portal&&G.portal.age>=15){A.portal();flash(.2,'#22e6ff');float(vp.x,vp.y-20,'АВТОПЕРЕХОД','#22e6ff',1);enterPortal();return}}
var kBefore=G.kills,bAlive=0,dAlive=0,bossSnap={};
for(i=0;i<G.enemies.length;i++){var ea=G.enemies[i];if(ea.dead)continue;if(ea.boss){bAlive++;bossSnap[ea.id]={x:ea.x,y:ea.y,spr:ea.spr,col:ea.col,r:ea.r}}if(ea.type==='dark')dAlive++;
if(ea.born===undefined)ea.born=.3;else if(ea.born>0)ea.born-=dt;
if(ea.bossKind==='eye'){if(ea.pending==='volley'){if(!ea.telBoost){ea.tel=Math.max(ea.tel,.95);ea.telBoost=true}}else ea.telBoost=false}}
var dropsBefore=G.drops.length;
updateSpawns();
for(i=0;i<G.enemies.length;i++)if(G.enemies[i].born===undefined)G.enemies[i].born=.3;
if(G.cap&&G.cap.kind==='rescue')for(i=0;i<G.enemies.length;i++)if(G.enemies[i].huntCap===undefined)G.enemies[i].huntCap=Math.random()<.5;
for(i=0;i<PL.length;i++)updatePlayer(PL[i],dt);updateWells(dt);updateZoom(dt);updateTurrets(dt);updatePhantoms(dt);updateBullets(dt);updateRockets(dt);updateERockets(dt);updateMines(dt);updateHazards(dt);updateEnemies(dt);updateEnemyBullets(dt);
var bAfter=0,dAfter=0,aliveIds={};
for(i=0;i<G.enemies.length;i++){var eb2=G.enemies[i];if(eb2.dead)continue;aliveIds[eb2.id]=1;if(eb2.boss)bAfter++;if(eb2.type==='dark')dAfter++}
for(var bid in bossSnap)if(!aliveIds[bid])pushWreck(bossSnap[bid]);
var bossDied=bAfter<bAlive,darkDied=dAfter<dAlive;
for(i=0;i<PL.length;i++){var pl2=PL[i],drop=hpBefore[i]-pl2.hp;
if(drop>.4&&pl2.hp>0){var src=null,sd=1e9;
for(var j2=0;j2<G.ebul.length;j2++){var bb=G.ebul[j2],d2=hyp(bb.x-pl2.x,bb.y-pl2.y);if(d2<sd){sd=d2;src=bb}}
for(j2=0;j2<G.enemies.length;j2++){var en=G.enemies[j2];if(en.dead)continue;var d3=hyp(en.x-pl2.x,en.y-pl2.y);if(d3<sd){sd=d3;src=en}}
if(src){G.dmgMarks.push({a:Math.atan2(src.y-pl2.y,src.x-pl2.x),l:.7,max:.7});if(G.dmgMarks.length>6)G.dmgMarks.shift()}}}
for(i=dropsBefore;i<G.drops.length;i++){var nd=G.drops[i];if(!nd||nd.type!=='bp')continue;
if(nd.bp==='ship:monster'){if(!darkDied)sanitizeBp(nd)}
else if(nd.bp&&nd.bp.indexOf('ship:')===0&&!bossDied)sanitizeBp(nd)}
if(capAlive()){
for(i=G.ebul.length-1;i>=0;i--){var pb=G.ebul[i];if(capHitTest(pb.x,pb.y,2)){damageCap(pb.dmg);part(pb.x,pb.y,'#ffb020',5,60,.25,1);G.ebul.splice(i,1)}}
for(i=0;i<G.enemies.length;i++){var ce=G.enemies[i];if(ce.dead||ce.dmg<=0||ce.hitT>0||ce.type==='medic')continue;
if(capHitTest(ce.x,ce.y,ce.r*.7)){damageCap(ce.dmg*.8);ce.hitT=.7;part(ce.x,ce.y,'#ffb020',6,70,.3,1)}}
for(i=0;i<G.beams.length;i++){var bm=G.beams[i];if(bm.tick>0)continue;
for(var smp=1;smp<=14;smp++){var f=smp/14,bx=bm.x+Math.cos(bm.ang)*bm.len*f,by=bm.y+Math.sin(bm.ang)*bm.len*f;
if(capHitTest(bx,by,bm.width)){damageCap(bm.dmg*.6);bm.tick=.35;part(bx,by,'#ffb020',5,60,.25,1);break}}}}
updateDrops(dt);
G.levelKills=(G.levelKills||0)+Math.max(0,G.kills-kBefore);
G.shards=localPlayer().shards;G.frags=localPlayer().frags;
if(G.active&&!G.queue.length&&!G.enemies.length&&!G.portal&&!G.wrecks.length)waveClear()}
try{initGame();window.__pulsarReady=true}catch(e){if(window.__boot)window.__boot('INIT: '+(e&&e.message||e))}
})();
