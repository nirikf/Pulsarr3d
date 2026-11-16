(function(){
'use strict';
var TAU=Math.PI*2,STEP=1/60,MAX_WAVE=30,EDGE=40;
var D={hp:1.56,sp:1.12,dmg:1.62,budget:1.25,base:80,mult:1.5};
var BOSS_NAMES={guardian:'СТРАЖ',hive:'МАТКА УЛЬЯ',prism:'ПРИЗМА',hammer:'МОЛОТ',eye:'ОКО',phantom:'ФАНТОМ'};
var BOSS_POOL=['guardian','prism','hammer','eye','phantom'];
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
function storeGet(k,d){try{var v=localStorage.getItem('ppix_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function storeSet(k,v){try{localStorage.setItem('ppix_'+k,JSON.stringify(v))}catch(e){}}
var META=storeGet('meta',{frag:0,perm:{hp:0,spd:0,dmg:0,rate:0,dash:0,shield:0,luck:0},unlocked:[],bp:[],invest:{},runs:0,bestDepth:0});
META.invest=META.invest||{};
function saveMeta(){storeSet('meta',META)}
function syncFrags(){META.frag=G.frags;saveMeta()}
function spend(n){if(G.frags<n)return false;G.frags-=n;syncFrags();return true}
var PERMS=[
{k:'hp',n:'КОРПУС+',d:'+15 базового HP',base:18,max:8},
{k:'spd',n:'ДВИГАТЕЛЬ+',d:'+4% скорость хода',base:15,max:6},
{k:'dmg',n:'КАЛИБР+',d:'+6% урон пуль',base:18,max:8},
{k:'rate',n:'ТЕМП+',d:'+5% скорострельность',base:15,max:6},
{k:'dash',n:'РЫВОК+',d:'-6% откат рывка',base:15,max:5},
{k:'shield',n:'ЩИТ+',d:'+10 энергии щита',base:15,max:6},
{k:'luck',n:'УДАЧА+',d:'+10% шанс чертежей и фрагментов',base:20,max:5}
];
var BP_COST=30;
function permCost(k){var p=null;for(var i=0;i<PERMS.length;i++)if(PERMS[i].k===k)p=PERMS[i];return Math.round(p.base*Math.pow(1.45,META.perm[k]||0))}
var LOCKED=['vamp','kir','pierce','hyper','socio','healdrone'];
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
{k:'cal',n:'КАЛИБР',d:'+25% урон пули',cap:5,col:'#ffb020'},
{k:'fan',n:'ВЕЕР',d:'+1 пуля в залпе',cap:3,col:'#9dff3c'},
{k:'pierce',n:'ПРОБОЙ',d:'пуля шьёт +1 врага',cap:2,col:'#ff2fb0'},
{k:'speed',n:'ПРИВОД',d:'+13% скорость хода',cap:4,col:'#4d8cff'},
{k:'armor',n:'БРОНЯ',d:'+25 корпуса и лечение',cap:4,col:'#35f0a0'},
{k:'dash',n:'РЫВОК',d:'-30% откат · 4 ур. за 100◆ убирает откат',cap:4,col:'#22e6ff'},
{k:'magnet',n:'МАГНИТ',d:'+70% радиус сбора ◆',cap:3,col:'#ff2fb0'},
{k:'vamp',n:'ВАМПИР',d:'4% урона лечит корпус',cap:3,col:'#ff4d4d'},
{k:'drone',n:'СПУТНИК',d:'+1 дрон стреляет сам',cap:2,col:'#9dff3c'},
{k:'regen',n:'РЕГЕН',d:'чинит корпус вне боя',cap:3,col:'#a86bff'},
{k:'shield',n:'ЩИТ',d:'+25 энергии щита, сам восстанавливается',cap:3,col:'#a86bff'},
{k:'kir',n:'СКОРОСТРЕЛ КИРЮША',d:'+14% темп и +18% скорость пуль',cap:3,col:'#22e6ff'},
{k:'rocket',n:'РАКЕТОМЁТ',d:'ракета · урон 50/100/150',cap:3,col:'#ffb020',weapon:true},
{k:'wave',n:'УДАРНАЯ ВОЛНА',d:'раз в 5с · радиус 100 · урон 45/70/115',cap:3,col:'#22e6ff',weapon:true},
{k:'beam',n:'ЛУЧ',d:'3с непрерывного урона · откат 7с',cap:3,col:'#ff2fb0',weapon:true},
{k:'healdrone',n:'ДРОН-ЦЕЛИТЕЛЬ',d:'слабое лечение, растёт с уровнем',cap:4,col:'#9dff3c'},
{k:'hydra',n:'ГИДРА',d:'ракета слабее, но +3 мини-ракеты по 30',cap:1,col:'#ffd76a',gold:true,req:'rocket'},
{k:'density',n:'ПЛОТНОСТЬ',d:'волна 90° спереди, урон x4, радиус 150',cap:1,col:'#ffd76a',gold:true,req:'wave'},
{k:'reflect',n:'ОТРАЖЕНИЕ',d:'луч отражается до 5 целей',cap:1,col:'#ffd76a',gold:true,req:'beam'},
{k:'hyper',n:'ГИПЕР ДРАЙВ',d:'зажми рывок 1.5с · таран 50/75/100',cap:3,col:'#ff2fb0'},
{k:'hyperGold',n:'ЦЕПНОЙ ТАРАН',d:'гипер драйв таранит 3 врагов',cap:1,col:'#ffd76a',gold:true,req:'hyper',cost:100},
{k:'socio',n:'СОЦИОФОБ',d:'два лезвия · после рывка лазер',cap:3,col:'#a86bff'}
];
var ICON={rate:['...ooo...','..occo...','.occo....','occccoo..','.ooccco..','...occo..','..occo...','..oco....','..oo.....'],cal:['....x....','....x....','..xxxxx..','.xx.w.xx.','xxxwwwxxx','.xx.w.xx.','..xxxxx..','....x....','....x....'],fan:['x...x...x','.x..x..x.','..x.x.x..','...xxx...','....x....','....x....','....x....','....x....','....x....'],pierce:['.........','..x...x..','..x...x..','xxxxxxxxx','..x...xxx','..x...x..','.........','.........','.........'],speed:['..x..x...','.xx..xx..','xxx..xxx.','.xx..xx..','..x..x...','.........','..x..x...','.xx..xx..','.........'],armor:['.xxxxxxx.','xwwwwwwwx','xwxxxxxwx','xwxxxxxwx','xwxxxxxwx','.xwxxxwx.','..xwxwx..','...xxx...','....x....'],dash:['.........','.x...x...','.xx..xx..','.xxx.xxx.','.xx..xx..','.x...x...','.........','........x','.........'],magnet:['.xx...xx.','xxx...xxx','x.x...x.x','x.x...x.x','x.xxxxx.x','.xxxxxxx.','..xxxxx..','.........','.........'],vamp:['....x....','...xxx...','..xxxxx..','.xxxxxxx.','xxxwwwxxx','xxxwwwxxx','.xxxxxxx.','..xxxxx..','...xxx...'],drone:['..xxxxx..','.x.....x.','x..www..x','x..www..x','x..www..x','.x.....x.','..xxxxx..','.........','.........'],regen:['.xx...xx.','xxxx.xxxx','xxxxxxxxx','xxxxxxxxx','.xxxxxxx.','..xxxxx..','...xxx...','....x....','.........'],shield:['..xxxxx..','.x.....x.','x..www..x','x..www..x','x..www..x','.x..w..x.','..x.w.x..','...xxx...','.........'],kir:['....xx...','...xx....','..xxxxx..','.xxxx....','...xx....','..xx.....','.xx......','xx.......','.........'],rocket:['....x....','...xxx...','...xwx...','...xwx...','..xxwxx..','..xwwwx..','.xx...xx.','.........','.........'],wave:['.........','..x...x..','.x.x.x.x.','x..x.x..x','x..x.x..x','.x.x.x.x.','..x...x..','.........','.........'],beam:['x........','xx.......','x.x......','x..x.....','x...x....','x....x...','x.....x..','x......xx','x........'],healdrone:['..xxxxx..','.x..w..x.','x..www..x','x..www..x','x..www..x','.x..w..x.','..xxxxx..','.........','.........'],hydra:['....x....','...xxx...','..xwxwx..','.xxwxwxx.','..xwxwx..','...xxx...','....x....','.........','.........'],density:['....x....','...xxx...','..xxxxx..','.xxxxxxx.','xxxxxxxxx','.xxxxxxx.','..xxxxx..','...xxx...','....x....'],reflect:['x...x...x','.x.x.x.x.','..x.x.x..','...xxx...','..x.x.x..','.x.x.x.x.','x...x...x','.........','.........'],hyper:['....x....','...xxx...','..xxwxx..','.xxxwxxx.','xxxxwxxxx','.xxxwxxx.','..xxwxx..','...xxx...','....x....'],hyperGold:['x...x...x','.x.x.x.x.','..xxxxx..','.xxwwwxx.','..xxxxx..','.x.x.x.x.','x...x...x','.........','.........'],socio:['..x...x..','.xxx.xxx.','..x...x..','.........','..x...x..','.xxx.xxx.','..x...x..','.........','.........']};
var FONT={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','111'],'+':['000','010','111','010','000'],'-':['000','000','111','000','000'],'x':['000','101','010','101','000'],'!':['010','010','010','000','010']};
var store={get:storeGet,set:storeSet};
var G={state:'title',t:0,wave:0,waveT:0,score:0,shards:0,frags:META.frag,kills:0,combo:0,comboT:0,mult:1,
enemies:[],bul:[],ebul:[],rockets:[],beams:[],zones:[],shocks:[],parts:[],drops:[],floats:[],rings:[],ghost:[],beats:[],queue:[],
active:false,boss:null,shake:0,flash:0,flashCol:'#fff',slow:0,clearT:0,beat:0,beatT:0,
best:storeGet('best',{score:0,wave:0}),st:{shots:0,hits:0,time:0},
portal:null,map:null,curNode:0,travel:false,travelT:0,travelDone:false,menuOpened:false,postT:0,pendingNode:null,
lootMult:1,arena:{w:640,h:480},event:null,lastBossKind:null,lastKill:{x:320,y:240},bossPool:BOSS_POOL.slice(),mapCam:0};
function makePlayer(id,col,light){return{id:id,col:col,light:light,x:0,y:0,vx:0,vy:0,r:5,hp:100,max:100,aim:0,fireT:0,dashT:0,dashCd:0,dx:1,dy:0,inv:0,hurtT:0,noHit:0,focus:false,shield:0,shieldT:0,weaponCd:0,beamT:0,beamChain:[],dT:[],lvl:{},dual:false,pickPhase:0,offer:[],ready:false,hyperCd:0,dashHold:0,socioSpin:0,stats:null,input:{mx:0,my:0,aim:0,dash:false,weapon:false,focus:false,held:false}}}
var P=makePlayer(0,'#ffb020','#fff0cf'),P2=makePlayer(1,'#4d8cff','#b8d4ff'),PL=[P];
var CAM={x:0,y:0},VIEW={x:0,y:0,w:240,h:240},AR={x:0,y:0,w:640,h:480};
var W=240,H=240,SCALE=3,eid=0,bid=0;
function nextEid(){return ++eid}function nextBid(){return ++bid}
var keys={},mx=0,my=0,mouseT=-99;
var sticks={move:{id:null,ox:0,oy:0,dx:0,dy:0,m:0},aim:{id:null,ox:0,oy:0,dx:0,dy:0,m:0}};
var isTouch=(window.matchMedia&&window.matchMedia('(hover:none)').matches)||('ontouchstart' in window);
var LI={dash:false,weapon:false},dashHeld=false,touchDashHeld=false,mouseRightHeld=false;
var GP={active:false,mx:0,my:0,aim:0,aimActive:false,dash:false,weapon:false,pause:false,dashHeld:false,prev:{}};
function pollGamepad(){GP.dash=false;GP.weapon=false;GP.pause=false;GP.dashHeld=false;
var pads=navigator.getGamepads?navigator.getGamepads():[],g=null;
for(var i=0;i<pads.length;i++)if(pads[i]&&pads[i].connected){g=pads[i];break}
if(!g){GP.active=false;return}GP.active=true;
function dz(v){return Math.abs(v)<.18?0:v}
GP.mx=dz(g.axes[0]||0);GP.my=dz(g.axes[1]||0);
var rx=dz(g.axes[2]||0),ry=dz(g.axes[3]||0);
if(Math.sqrt(rx*rx+ry*ry)>.25){GP.aim=Math.atan2(ry,rx);GP.aimActive=true}else GP.aimActive=false;
function pr(i){return !!(g.buttons[i]&&g.buttons[i].pressed)}
function edge(i){var p=pr(i),w=GP.prev[i];GP.prev[i]=p;return p&&!w}
GP.dashHeld=pr(0)||pr(12);if(edge(0)||edge(12))GP.dash=true;
if(edge(2)||edge(7)||edge(5))GP.weapon=true;if(edge(9))GP.pause=true}
function gamepadMove(){var l=hyp(GP.mx,GP.my);if(l>1)return{x:GP.mx/l,y:GP.my/l};return{x:GP.mx,y:GP.my}}
var NET={mode:'solo',peer:null,conn:null,code:'',connected:false,lastSend:0,lastState:0,buf:[],pred:null,interp:90};
function mpStatus(t){$('#mpStatus').textContent=t}
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
NET.peer.on('connection',setupConn);NET.peer.on('error',function(e){mpStatus('Ошибка: '+e.type)})}
function joinGame(){if(typeof Peer==='undefined'){mpStatus('WebRTC недоступен');return}
var code=$('#mpCode').value.trim().toUpperCase();if(code.length<4){mpStatus('Введи код');return}
NET.mode='guest';NET.peer=new Peer();
NET.peer.on('open',function(){setupConn(NET.peer.connect('ppx-'+code,{reliable:true}));mpStatus('Подключаемся...')});
NET.peer.on('error',function(e){mpStatus('Ошибка: '+e.type)})}
function onNet(d){
if(NET.mode==='host'){
if(d.t==='input'){P2.input.mx=d.mx;P2.input.my=d.my;P2.input.aim=d.aim;P2.input.focus=d.focus;P2.input.held=d.held;if(d.dash)P2.input.dash=true;if(d.weapon)P2.input.weapon=true}
else if(d.t==='choose')choose(d.i,P2);
else if(d.t==='shop')shopAction(d.a,P2);
else if(d.t==='map')trySelectNode(d.id);
else if(d.t==='metabuy')hostMetaBuy(d.kind,d.k);
}else{
if(d.t==='hello')mpStatus('Подключено как игрок 2');
else if(d.t==='start'){setState('play');NET.pred=null}
else if(d.t==='state'){NET.buf.push({t:performance.now(),d:d});if(NET.buf.length>24)NET.buf.shift();reconcile(d)}
else if(d.t==='up')setState('up');
else if(d.t==='upview')applyUpView(d.v);
else if(d.t==='metaok')guestMeta(d);
else if(d.t==='over')setState('over');
else if(d.t==='win')setState('win')}}
function guestMeta(d){
if(d.kind==='perm')META.perm[d.k]=(META.perm[d.k]||0)+1;
else if(d.kind==='bp'){var i=META.bp.indexOf(d.k);if(i>=0)META.bp.splice(i,1);if(META.unlocked.indexOf(d.k)<0)META.unlocked.push(d.k)}
else if(d.kind==='invperm'){META.invest[d.k]=(META.invest[d.k]||0)+1;if(d.granted){META.invest[d.k]=0;META.perm[d.k]=(META.perm[d.k]||0)+1}}
else if(d.kind==='invbp'){META.invest[d.k]=(META.invest[d.k]||0)+1;if(d.granted){META.invest[d.k]=0;var j=META.bp.indexOf(d.k);if(j>=0)META.bp.splice(j,1);if(META.unlocked.indexOf(d.k)<0)META.unlocked.push(d.k)}}
saveMeta();recalc();buildShop()}
function applyMetaBuy(kind,k){if(kind==='perm')META.perm[k]=(META.perm[k]||0)+1;
else{var i=META.bp.indexOf(k);if(i>=0)META.bp.splice(i,1);if(META.unlocked.indexOf(k)<0)META.unlocked.push(k)}
saveMeta();recalc();buildShop()}
function hostMetaBuy(kind,k){
if(kind==='perm'){var c=permCost(k);if(!spend(c))return;applyMetaBuy('perm',k);netSend({t:'metaok',kind:'perm',k:k})}
else if(kind==='bp'){if(!spend(BP_COST))return;applyMetaBuy('bp',k);netSend({t:'metaok',kind:'bp',k:k})}
else if(kind==='invperm'){if(!spend(1))return;META.invest[k]=(META.invest[k]||0)+1;var g=false;
if(META.invest[k]>=permCost(k)){META.invest[k]=0;META.perm[k]=(META.perm[k]||0)+1;g=true;recalc()}
saveMeta();buildShop();netSend({t:'metaok',kind:'invperm',k:k,granted:g})}
else if(kind==='invbp'){if(!spend(1))return;META.invest[k]=(META.invest[k]||0)+1;var g2=false;
if(META.invest[k]>=BP_COST){META.invest[k]=0;var i=META.bp.indexOf(k);if(i>=0)META.bp.splice(i,1);if(META.unlocked.indexOf(k)<0)META.unlocked.push(k);g2=true;recalc()}
saveMeta();buildShop();netSend({t:'metaok',kind:'invbp',k:k,granted:g2})}}
function reconcile(d){var a=d.pl&&d.pl[1];if(!a)return;
if(!NET.pred){NET.pred={x:a.x,y:a.y,vx:0,vy:0,dashT:0,dashCd:a.dashCd||0};return}
var err=hyp(a.x-NET.pred.x,a.y-NET.pred.y);
if(err>60){NET.pred.x=a.x;NET.pred.y=a.y;NET.pred.vx=0;NET.pred.vy=0}
else{NET.pred.x+=(a.x-NET.pred.x)*.2;NET.pred.y+=(a.y-NET.pred.y)*.2}
NET.pred.dashCd=a.dashCd||0}
function predictGuest(dt){var p=P2,st=p.stats;if(!st||!NET.pred)return;var inp=p.input;
NET.pred.dashCd=Math.max(0,NET.pred.dashCd-dt);
if(inp.dash&&NET.pred.dashCd<=0){var dx=inp.mx,dy=inp.my;if(!dx&&!dy){dx=Math.cos(inp.aim);dy=Math.sin(inp.aim)}var l=hyp(dx,dy)||1;NET.pred.dx=dx/l;NET.pred.dy=dy/l;NET.pred.dashT=.16;NET.pred.dashCd=st.dashCd;inp.dash=false}
if(NET.pred.dashT>0){NET.pred.dashT-=dt;NET.pred.vx=(NET.pred.dx||1)*280;NET.pred.vy=(NET.pred.dy||0)*280}
else{var sp=st.speed*(inp.focus?.55:1),k=1-Math.exp(-20*dt);NET.pred.vx+=(inp.mx*sp-NET.pred.vx)*k;NET.pred.vy+=(inp.my*sp-NET.pred.vy)*k}
NET.pred.x=clamp(NET.pred.x+NET.pred.vx*dt,AR.x+p.r,AR.x+AR.w-p.r);
NET.pred.y=clamp(NET.pred.y+NET.pred.vy*dt,AR.y+p.r,AR.y+AR.h-p.r);
p.x=NET.pred.x;p.y=NET.pred.y;p.aim=inp.aim}
function lerp(a,b,t){return a+(b-a)*t}
function interpArr(A,B,t,key){if(!A)return B||[];if(!B)return A||[];var m={};for(var i=0;i<A.length;i++)m[A[i][key]]=A[i];var o=[];for(var j=0;j<B.length;j++){var b=B[j],a=m[b[key]];if(a){var q=Object.assign({},b);q.x=lerp(a.x,b.x,t);q.y=lerp(a.y,b.y,t);o.push(q)}else o.push(b)}return o}
function guestWorld(now){if(!NET.buf.length)return;
var rt=now-NET.interp,a=NET.buf[0],b=NET.buf[NET.buf.length-1];
for(var i=0;i<NET.buf.length-1;i++)if(NET.buf[i].t<=rt&&NET.buf[i+1].t>=rt){a=NET.buf[i];b=NET.buf[i+1];break}
var span=b.t-a.t,t=span>0?clamp((rt-a.t)/span,0,1):1,da=a.d,db=b.d;
G.state=db.st;G.wave=db.wave;G.score=db.score;G.shards=db.shards;G.frags=db.frags;G.mult=db.mult;G.comboT=db.comboT;
G.portal=db.portal;G.map=db.map;G.curNode=db.curNode;G.travel=db.travel;G.travelT=db.travelT;G.lootMult=db.lootMult;G.event=db.event;
if(db.arena){G.arena=db.arena;AR.w=db.arena.w;AR.h=db.arena.h}
G.enemies=interpArr(da.en,db.en,t,'id').map(function(e){var o=Object.assign({},e);o.spr=resolveSpr(e);return o});
G.bul=interpArr(da.bul,db.bul,t,'id');G.ebul=interpArr(da.ebul,db.ebul,t,'id');
G.rockets=interpArr(da.rockets,db.rockets,t,'id');G.drops=interpArr(da.drops,db.drops,t,'id');
G.beams=db.beams;G.zones=db.zones;G.shocks=db.shocks;G.rings=db.rings;G.parts=db.parts;G.floats=db.floats;G.ghost=db.ghost||[];
var pa=da.pl[0],pb=db.pl[0];
P.x=lerp(pa.x,pb.x,t);P.y=lerp(pa.y,pb.y,t);P.hp=pb.hp;P.max=pb.max;P.aim=pb.aim;P.shield=pb.shield;P.inv=pb.inv;P.beamT=pb.beamT;P.beamChain=pb.chain||[];P.stats=pb.stats;P.lvl=pb.lvl||P.lvl;P.dashCd=pb.dashCd||0;P.socioSpin=pb.socioSpin||0;
var qb=db.pl[1];if(qb){P2.hp=qb.hp;P2.max=qb.max;P2.shield=qb.shield;P2.inv=qb.inv;P2.beamT=qb.beamT;P2.beamChain=qb.chain||[];P2.stats=qb.stats;P2.lvl=qb.lvl||P2.lvl;P2.dashCd=qb.dashCd||0;P2.socioSpin=qb.socioSpin||0}
PL=[P,P2];
if(db.boss){$('#bossbar').classList.add('on');$('#bossName').textContent=db.boss.name;$('#bossPhase').textContent='ФАЗА '+db.boss.phase;setBossPips(db.boss.phase);$('#bossFill').style.transform='scaleX('+clamp(db.boss.fr,0,1)+')'}else $('#bossbar').classList.remove('on')}
function snapshot(){
function rp(p){return{x:Math.round(p.x),y:Math.round(p.y),hp:Math.round(p.hp),max:p.max,aim:+p.aim.toFixed(2),col:p.col,shield:Math.round(p.shield),inv:p.inv>0,beamT:p.beamT,chain:p.beamChain,dashCd:p.dashCd,socioSpin:p.socioSpin,stats:p.stats,lvl:p.lvl}}
function re(e){return{id:e.id,x:Math.round(e.x),y:Math.round(e.y),r:e.r,type:e.type,ang:e.ang,face:e.face,tel:e.tel,col:e.col,hp:e.hp,max:e.max,boss:e.boss,ghost:e.ghost,bossKind:e.bossKind,shieldFl:e.shieldFl,beam:e.beam,mode:e.mode,ax:e.ax,ay:e.ay,ar:e.ar,slot:e.slot,guardId:e.guardId,fl:e.fl}}
return{t:'state',st:G.state,wave:G.wave,score:G.score,shards:G.shards,frags:G.frags,mult:G.mult,comboT:G.comboT,
portal:G.portal,map:G.map,curNode:G.curNode,travel:G.travel,travelT:G.travelT,lootMult:G.lootMult,event:G.event,arena:G.arena,
pl:PL.map(rp),en:G.enemies.map(re),
bul:G.bul.map(function(b){return{id:b.id,x:b.x,y:b.y,a:b.a,dr:b.dr,col:b.col}}),
ebul:G.ebul.map(function(b){return{id:b.id,x:b.x,y:b.y,spr:b.spr}}),
rockets:G.rockets.map(function(r){return{id:r.id,x:r.x,y:r.y,a:r.a,mini:r.mini}}),
drops:G.drops.map(function(d){return{id:d.id,x:d.x,y:d.y,type:d.type,l:d.l,sp:d.sp,bp:d.bp}}),
beams:G.beams,zones:G.zones,shocks:G.shocks,rings:G.rings,parts:G.parts.slice(0,120),floats:G.floats,ghost:G.ghost,
boss:G.boss?{name:G.boss.bossName,phase:G.boss.phase,fr:G.boss.hp/G.boss.max}:null}}
function resolveSpr(e){if(e.boss)return SPR.bosses[e.bossKind]||SPR.boss;return SPR[e.type]||SPR.grunt}
function setBossPips(ph){var p=$('#bossPips').children;for(var i=0;i<p.length;i++)p[i].classList.toggle('on',i<ph)}
function mkC(w,h){var c=document.createElement('canvas');c.width=w;c.height=h;return c}
function tint(src,col){var c=mkC(src.width,src.height),g=c.getContext('2d');g.drawImage(src,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,c.width,c.height);return c}
function spr(rows,map){var w=0;for(var i=0;i<rows.length;i++)w=Math.max(w,rows[i].length);var c=mkC(w,rows.length),g=c.getContext('2d'),m=map||PAL;for(var y=0;y<rows.length;y++)for(var x=0;x<rows[y].length;x++){var ch=rows[y][x];if(ch==='.'||ch===' ')continue;var col=m[ch];if(!col)continue;g.fillStyle=col;g.fillRect(x,y,1,1)}return{n:c,f:tint(c,'#fff'),w:w,h:rows.length}}
function shipSprite(main,light){var m=Object.assign({},PAL);m.c=main;m.C=light;
var half=['..oo............','..oao...........','.occo...........','.ocCco..oo......','ocCcco.ocCo.....','ocgCcCocCCwco...','GgocCcCwWWWWcCco'];
var rows=half.slice();for(var i=half.length-2;i>=0;i--)rows.push(half[i]);return spr(rows,m)}
function bossSpriteFor(kind){var s=31,c=mkC(s,s),g=c.getContext('2d'),cx=15,cy=15;
var pal={guardian:['#ff4d4d','#8f2020','#ff2fb0'],hive:['#9dff3c','#4d8f1e','#ff2fb0'],prism:['#22e6ff','#1e4f8f','#a86bff'],hammer:['#ffb020','#8f5a10','#ff4d4d'],eye:['#a86bff','#4f2a94','#ffffff'],phantom:['#ff2fb0','#8f1a63','#22e6ff']}[kind];
for(var y=0;y<s;y++)for(var x=0;x<s;x++){var dx=x-cx,dy=y-cy,m;
if(kind==='prism')m=Math.abs(dx)+Math.abs(dy);else if(kind==='hammer')m=Math.max(Math.abs(dx),Math.abs(dy));else if(kind==='phantom')m=Math.abs(dx)*.8+Math.max(0,dy)*.9;else if(kind==='hive')m=Math.sqrt(dx*dx+dy*dy)+Math.sin(Math.atan2(dy,dx)*6)*1.5;else m=Math.max(Math.abs(dx)*.88+Math.abs(dy)*.5,Math.abs(dy));
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
function buildSprites(){SPR.shipY=shipSprite('#ffb020','#fff0cf');SPR.shipB=shipSprite('#4d8cff','#b8d4ff');SPR.ship=SPR.shipY;
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
SPR.shard=spr(['...o...','..omo..','.omMmo.','omwWMmo','.omMmo.','..omo..','...o...']);
SPR.med=spr(['..ooooo..','..ogggo..','..ogGgo..','ooggGggoo','ogGGWGGgo','ooggGggoo','..ogGgo..','..ogggo..','..ooooo..']);
SPR.frag=spr(['..ooo..','.obBbo.','obWWbo.'.replace(' ',''),'obBbbo.','..ooo..']);
SPR.bp=spr(['.ooooo.','owwwwo.','owwwwo.','owwwwo.','owwwwo.','.ooooo.']);
SPR.drone=spr(['..oo...','.oggo..','ogGwgo.','ogwWGgo','ogGwgo.','.oggo..','..oo...']);
SPR.healdrone=spr(['..oo...','.oggo..','ogWwgo.','ogWWGgo','ogWwgo.','.oggo..','..oo...']);
SPR.bolt=spr(['.ccC','cCWW','cCWW','.ccC']);
SPR.rocket=spr(['..oo...','.oaao..','oaWWaoo','.oaao..','..oo...']);
SPR.miniRocket=spr(['.oo.','oaWo','.oo.']);
SPR.bosses={guardian:bossSpriteFor('guardian'),hive:bossSpriteFor('hive'),prism:bossSpriteFor('prism'),hammer:bossSpriteFor('hammer'),eye:bossSpriteFor('eye'),phantom:bossSpriteFor('phantom')};
SPR.boss=SPR.bosses.guardian;
SPR.orbM=orb(PAL.m,'#ffd6f2');SPR.orbA=orb(PAL.a,'#fff0cf');SPR.orbR=orb(PAL.r,'#ffd9d9');SPR.orbV=orb(PAL.v,'#e8dcff');SPR.orbC=orb(PAL.c,'#b8fbff')}
buildSprites();floorCanvas=makeFloor(640,480);
var A={ctx:null,master:null,on:storeGet('sound',true),last:{},nb:null,
init:function(){if(this.ctx)return;var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;try{this.ctx=new AC()}catch(e){return}this.master=this.ctx.createGain();this.master.gain.value=this.on?.42:0;this.master.connect(this.ctx.destination);var n=this.ctx.createBuffer(1,this.ctx.sampleRate*.5,this.ctx.sampleRate),d=n.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.nb=n},
resume:function(){if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume().catch(function(){})},
setOn:function(v){this.on=v;store.set('sound',v);if(this.master)this.master.gain.setTargetAtTime(v?.42:0,this.ctx.currentTime,.02)},
gate:function(k,ms){var t=performance.now();if(this.last[k]&&t-this.last[k]<ms)return false;this.last[k]=t;return true},
tone:function(f,dur,type,vol,slide,delay){if(!this.ctx||!this.on)return;var t=this.ctx.currentTime+(delay||0),o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+.02)},
noise:function(dur,vol,freq,type,delay){if(!this.ctx||!this.on||!this.nb)return null;var t=this.ctx.currentTime+(delay||0),s=this.ctx.createBufferSource();s.buffer=this.nb;s.loop=true;var f=this.ctx.createBiquadFilter();f.type=type||'bandpass';f.frequency.setValueAtTime(freq,t);f.Q.value=1.2;var g=this.ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+dur+.02);return f},
shoot:function(){if(this.gate('sh',55))this.tone(900,.05,'square',.05,.4)},
hit:function(){if(this.gate('ht',35))this.noise(.04,.06,2200)},
kill:function(){if(this.gate('kl',45)){this.tone(320,.13,'square',.07,.25);this.noise(.12,.07,900)}},
boom:function(){this.tone(110,.35,'square',.16,.25);this.noise(.32,.14,400,'lowpass')},
pick:function(n){this.tone(660*Math.pow(1.05,Math.min(n,14)),.07,'square',.06,1.5)},
heal:function(){this.tone(520,.1,'triangle',.1,1.4);this.tone(780,.12,'triangle',.08,1.4,.06)},
dash:function(){var f=this.noise(.2,.1,700);if(f&&this.ctx)f.frequency.exponentialRampToValueAtTime(3000,this.ctx.currentTime+.19)},
hurt:function(){this.tone(220,.24,'square',.14,.3);this.noise(.2,.1,300,'lowpass')},
wave:function(){var s=this;[392,523,659].forEach(function(f,i){s.tone(f,.16,'square',.08,1,i*.08)})},
bossIn:function(){var s=this;[0,.24,.48].forEach(function(d){s.tone(160,.22,'sawtooth',.12,1.7,d);s.tone(240,.2,'square',.08,1.6,d+.11)})},
up:function(){var s=this;[523,659,784,1046].forEach(function(f,i){s.tone(f,.14,'square',.08,1,i*.05)})},
over:function(){var s=this;[392,311,262,196].forEach(function(f,i){s.tone(f,.4,'square',.11,.7,i*.15)})},
win:function(){var s=this;[523,659,784,1046,1318].forEach(function(f,i){s.tone(f,.28,'square',.1,1,i*.1)})},
rocket:function(){this.tone(140,.3,'sawtooth',.12,3);this.noise(.25,.1,500,'lowpass')},
explode:function(){this.tone(70,.4,'square',.18,.3);this.noise(.4,.16,300,'lowpass')},
shieldHit:function(){if(this.gate('sv',60))this.tone(1200,.06,'triangle',.07,.5)},
shock:function(){this.tone(90,.35,'sawtooth',.14,2.4);this.noise(.3,.12,600,'lowpass')},
beam:function(){this.tone(220,.4,'sawtooth',.1,2.2);this.tone(440,.3,'square',.05,1.5,.05)},
laser:function(){if(this.gate('lz',120))this.tone(1400,.12,'sawtooth',.05,.5)},
blink:function(){this.tone(800,.12,'square',.07,.3);this.noise(.1,.05,3000)},
portal:function(){this.tone(300,.4,'sine',.1,2);this.tone(600,.3,'sine',.06,1.5,.1)},
beat:function(i,heat){if(!this.ctx||!this.on)return;var bass=[0,0,7,0,5,0,7,3][i%8];this.tone(55*Math.pow(2,bass/12),.14,'square',.11,1);if(i%2===1)this.noise(.03,.02+heat*.02,8000,'highpass');if(i%4===2)this.noise(.09,.05,1600);if(heat>.12&&i%2===0){var sc=[0,3,5,7,10,12];this.tone(220*Math.pow(2,sc[(i/2)%6]/12),.1,'triangle',.03+heat*.04,1)}}};
function part(x,y,col,n,spd,life,size){for(var i=0;i<n;i++){if(G.parts.length>420)break;var a=rand(0,TAU),s=rand(spd*.3,spd);G.parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:rand(life*.5,life),m:life,c:col,s:size||1,dr:rand(2,5)})}}
function ring(x,y,r0,r1,col,life){if(G.rings.length>10)return;G.rings.push({x:x,y:y,r:r0,r1:r1,l:life,m:life,c:col})}
function float(x,y,txt,col,sc){if(G.floats.length>26)return;G.floats.push({x:x,y:y,t:String(txt),c:col,s:sc||1,l:.7,m:.7})}
function shake(v){G.shake=Math.min(9,G.shake+v)}
function flash(v,c){G.flash=Math.max(G.flash,v);G.flashCol=c||'#fff'}
function updateEffects(dt){var i;
for(i=G.beats.length-1;i>=0;i--){var b=G.beats[i];b.r+=70*dt;b.a-=dt*.5;if(b.a<=0)G.beats.splice(i,1)}
for(i=G.rings.length-1;i>=0;i--){var r=G.rings[i];r.l-=dt;r.r+=(r.r1-r.r)*Math.min(1,9*dt);if(r.l<=0)G.rings.splice(i,1)}
for(i=G.parts.length-1;i>=0;i--){var p=G.parts[i];p.l-=dt;var kk=Math.exp(-p.dr*dt);p.vx*=kk;p.vy*=kk;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.l<=0)G.parts.splice(i,1)}
for(i=G.floats.length-1;i>=0;i--){var f=G.floats[i];f.l-=dt;f.y-=16*dt;if(f.l<=0)G.floats.splice(i,1)}
for(i=G.ghost.length-1;i>=0;i--){G.ghost[i].l-=dt;if(G.ghost[i].l<=0)G.ghost.splice(i,1)}}
function drawSpr(ctx,s,x,y,ang,fl,alpha){if(!s)return;ctx.save();ctx.globalAlpha=alpha==null?1:alpha;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(ang);ctx.drawImage(fl?s.f:s.n,-Math.round(s.w/2),-Math.round(s.h/2));ctx.restore();ctx.globalAlpha=1}
function pxText(ctx,str,x,y,col,sc){sc=sc||1;ctx.fillStyle=col;var cx=Math.round(x);for(var i=0;i<str.length;i++){var gl=FONT[str[i]];if(!gl){cx+=4*sc;continue}for(var r=0;r<5;r++)for(var c=0;c<3;c++)if(gl[r][c]==='1')ctx.fillRect(cx+c*sc,Math.round(y)+r*sc,sc,sc);cx+=4*sc}}
function pxTextW(str,sc){return str.length*4*(sc||1)-(sc||1)}
function pxCircle(ctx,cx,cy,r,col,alpha){cx=Math.round(cx);cy=Math.round(cy);r=Math.round(r);if(r<1)return;ctx.globalAlpha=alpha==null?1:alpha;ctx.fillStyle=col;var x=r,y=0,err=1-r;while(x>=y){ctx.fillRect(cx+x,cy+y,1,1);ctx.fillRect(cx+y,cy+x,1,1);ctx.fillRect(cx-y,cy+x,1,1);ctx.fillRect(cx-x,cy+y,1,1);ctx.fillRect(cx-x,cy-y,1,1);ctx.fillRect(cx-y,cy-x,1,1);ctx.fillRect(cx+y,cy-x,1,1);ctx.fillRect(cx+x,cy-y,1,1);y++;if(err<0)err+=2*y+1;else{x--;err+=2*(y-x)+1}}ctx.globalAlpha=1}
function pxDisc(ctx,cx,cy,r,col,alpha){cx=Math.round(cx);cy=Math.round(cy);r=Math.round(r);ctx.globalAlpha=alpha==null?1:alpha;ctx.fillStyle=col;for(var y=-r;y<=r;y++){var w=Math.floor(Math.sqrt(Math.max(0,r*r-y*y)));ctx.fillRect(cx-w,cy+y,w*2+1,1)}ctx.globalAlpha=1}
function line(ctx,x1,y1,x2,y2,col,w,a){ctx.save();ctx.globalAlpha=a==null?1:a;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(Math.round(x1),Math.round(y1));ctx.lineTo(Math.round(x2),Math.round(y2));ctx.stroke();ctx.restore()}
function nearestPlayer(x,y){var b=null,bd=1e9;for(var i=0;i<PL.length;i++){var p=PL[i];if(p.hp<=0)continue;var d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);if(d<bd){bd=d;b=p}}return b||P}
function healPlayer(p,v){if(p.hp<=0)return;var b=p.hp;p.hp=Math.min(p.max,p.hp+v);if(p.hp-b>2)float(p.x,p.y-10,'+'+Math.round(p.hp-b),'#35f0a0',1)}
function hurtPlayer(p,d){if(p.inv>0||G.state!=='play')return;
if(p.shield>0){var ab=Math.min(p.shield,d);p.shield-=ab;d-=ab;p.shieldT=2.5;A.shieldHit();part(p.x,p.y,'#a86bff',8,80,.3,1);if(d<=0){p.inv=.35;return}}
p.hp-=d;p.inv=.7;p.hurtT=.35;p.noHit=0;p.shieldT=2.5;G.combo=0;G.mult=1;shake(5);flash(.3,'#ff4d4d');A.hurt();part(p.x,p.y,'#ff4d4d',12,90,.4,1);float(p.x,p.y-11,'-'+Math.round(d),'#ff4d4d',1);
if(p.hp<=0){p.hp=0;if(PL.every(function(q){return q.hp<=0}))gameOver()}}
function damageEnemy(e,dmg,crit,hx,hy,dir,ignoreShield,owner){if(e.dead)return;
if(e.type==='shielder'&&!ignoreShield&&dir!==undefined&&Math.abs(angDiff(e.face,dir+Math.PI))<1.15){e.shieldFl=.15;part(hx,hy,'#22e6ff',4,60,.2,1);float(e.x,e.y-e.r-4,'БЛОК','#22e6ff',1);A.shieldHit();return}
if(e.bossKind==='prism'&&!ignoreShield&&dir!==undefined){var inc=dir+Math.PI,bl=false;for(var k=0;k<3;k++)if(Math.abs(angDiff(e.shieldAng+k*TAU/3,inc))<.5){bl=true;break}
if(bl){e.shieldFl=.15;part(hx,hy,'#22e6ff',5,70,.2,1);A.shieldHit();G.ebul.push({id:nextBid(),x:e.x+Math.cos(inc)*18,y:e.y+Math.sin(inc)*18,vx:Math.cos(inc)*170,vy:Math.sin(inc)*170,r:2.5,dmg:9*escale(e),l:3,spr:'orbC'});return}}
e.hp-=dmg;e.fl=.1;G.st.hits++;if(hx!==undefined)part(hx,hy,crit?'#ffb020':'#fff',crit?6:3,crit?80:55,.25,1);
float(e.x+rand(-3,3),e.y-e.r-4,Math.round(dmg),crit?'#ffb020':'#f4ecff',crit?2:1);
var ow=owner||P;if(ow.stats&&ow.stats.vamp)healPlayer(ow,ow.stats.vamp*dmg);A.hit();if(e.hp<=0)killEnemy(e)}
function luckMult(){return 1+.1*(META.perm.luck||0)}
function dropFrag(x,y,n){for(var i=0;i<n;i++)G.drops.push({id:nextBid(),x:x+rand(-6,6),y:y+rand(-6,6),vx:rand(-30,30),vy:rand(-30,30),type:'frag',l:20,sp:rand(0,TAU)})}
function dropBlueprint(x,y){var avail=LOCKED.filter(function(k){return META.unlocked.indexOf(k)<0&&META.bp.indexOf(k)<0});if(!avail.length)return;
var k=pick(avail);G.drops.push({id:nextBid(),x:x,y:y,vx:rand(-20,20),vy:rand(-20,20),type:'bp',bp:k,l:25,sp:rand(0,TAU)})}
function killEnemy(e){if(e.dead)return;e.dead=true;G.kills++;G.lastKill={x:e.x,y:e.y};
G.combo=Math.min(20,G.combo+1);G.comboT=2.4;G.mult=1+Math.min(G.combo,15)*.1;addScore(e.pts*G.mult);
part(e.x,e.y,e.col,e.boss?60:14,e.boss?150:95,e.boss?.9:.45,e.boss?2:1);part(e.x,e.y,'#fff',e.boss?24:5,e.boss?120:70,.3,1);
ring(e.x,e.y,e.r*.5,e.boss?70:e.r*3,e.col,e.boss?.8:.35);A.kill();shake(e.boss?8:2);
if(e.boss){G.slow=1.1;flash(.45,e.col);G.boss=null;$('#bossbar').classList.remove('on');A.boom();
G.drops.push({id:nextBid(),x:e.x,y:e.y,vx:0,vy:0,type:'hp',l:20,sp:0});
dropFrag(e.x,e.y,Math.round(rand(8,14)*G.lootMult));dropBlueprint(e.x,e.y);
if(!e.ghost&&e.bossKind!=='hive')G.lastBossKind=e.bossKind}
else{if(Math.random()<.06*luckMult()*G.lootMult)dropFrag(e.x,e.y,1);
if(Math.random()<.02*luckMult())dropBlueprint(e.x,e.y)}
if(e.type==='splitter')for(var i=0;i<2;i++){var a=rand(0,TAU),m=makeEnemy('mini',e.x+Math.cos(a)*7,e.y+Math.sin(a)*7);m.vx=Math.cos(a)*70;m.vy=Math.sin(a)*70;G.enemies.push(m)}
if(e.type==='tank'){ring(e.x,e.y,4,34,'#ff4d4d',.45);part(e.x,e.y,'#ffb020',18,120,.5,1);A.boom();shake(4);
for(var j=0;j<G.enemies.length;j++){var o=G.enemies[j];if(!o.dead&&o!==e&&hyp(o.x-e.x,o.y-e.y)<32)damageEnemy(o,26,false)}
var np=nearestPlayer(e.x,e.y);if(hyp(np.x-e.x,np.y-e.y)<26)hurtPlayer(np,12*D.dmg*dmgScale())}
for(var k=0;k<(e.sh||0)&&G.drops.length<170;k++)spawnShard(e.x,e.y);
if(!e.boss&&e.type!=='mini'&&Math.random()<(e.type==='tank'?.45:.05))spawnMedkit(e.x,e.y)}
function addScore(v){G.score+=Math.round(v*D.mult)}
function popChip(sel){var el=$(sel);if(!el)return;el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit')}
function edge(){var m=18,s=randi(0,3),x,y;
if(s===0){x=rand(CAM.x,CAM.x+W);y=CAM.y-m}else if(s===1){x=CAM.x+W+m;y=rand(CAM.y,CAM.y+H)}else if(s===2){x=rand(CAM.x,CAM.x+W);y=CAM.y+H+m}else{x=CAM.x-m;y=rand(CAM.y,CAM.y+H)}
return{x:clamp(x,AR.x+EDGE,AR.x+AR.w-EDGE),y:clamp(y,AR.y+EDGE,AR.y+AR.h-EDGE)}}
function makeEnemy(type,x,y){var sc=1+.09*(G.wave-1),ds=dmgScale();
var e={id:nextEid(),type:type,x:x,y:y,vx:0,vy:0,fl:0,dead:false,t:rand(0,9),hitT:0,tel:0,sub:0,ang:rand(0,TAU),st:'walk',cd:rand(1,3),lock:0,face:rand(0,TAU),shieldFl:0,beam:null,mode:'normal',group:null,slot:0,guardId:null,tx:x,ty:y,tface:0,ax:x,ay:y,ar:0,dodgeCd:dodgeCd(G.wave),dodgeT:0,dvx:0,dvy:0};
if(type==='grunt'){e.r=5;e.hp=20*sc*D.hp;e.sp=40*D.sp;e.dmg=8*D.dmg*ds;e.pts=10;e.sh=1;e.col=PAL.m}
else if(type==='mini'){e.r=3.5;e.hp=9*sc*D.hp;e.sp=62*D.sp;e.dmg=5*D.dmg*ds;e.pts=5;e.sh=Math.random()<.4?1:0;e.col=PAL.v}
else if(type==='shooter'){e.r=6;e.hp=26*sc*D.hp;e.sp=26*D.sp;e.dmg=7*D.dmg*ds;e.pts=18;e.sh=2;e.col=PAL.a;e.cd=rand(.7,1.8)}
else if(type==='splitter'){e.r=6.5;e.hp=34*sc*D.hp;e.sp=30*D.sp;e.dmg=10*D.dmg*ds;e.pts=22;e.sh=2;e.col=PAL.v}
else if(type==='tank'){e.r=9;e.hp=85*sc*D.hp;e.sp=20*D.sp;e.dmg=16*D.dmg*ds;e.pts=45;e.sh=4;e.col=PAL.r;e.cd=rand(2,3.6)}
else if(type==='shielder'){e.r=6;e.hp=40*sc*D.hp;e.sp=30*D.sp;e.dmg=9*D.dmg*ds;e.pts=26;e.sh=2;e.col=PAL.b;e.cd=rand(1,2)}
else if(type==='sniper'){e.r=5;e.hp=24*sc*D.hp;e.sp=34*D.sp;e.dmg=6;e.pts=30;e.sh=2;e.col=PAL.v;e.cd=3}
else if(type==='medic'){e.r=5;e.hp=70*sc*D.hp;e.sp=46*D.sp;e.dmg=0;e.pts=28;e.sh=2;e.col=PAL.g}
else if(type==='emitter'){e.r=7;e.hp=55*sc*D.hp;e.sp=22*D.sp;e.dmg=0;e.pts=36;e.sh=3;e.col=PAL.c;e.cd=rand(2.5,4)}
else if(type==='clone'){e.r=4;e.hp=1;e.sp=75*D.sp;e.dmg=10*D.dmg*ds;e.pts=2;e.sh=0;e.col=PAL.m}
else if(type==='boss'){var kind=e.bossKind||'guardian';var base={guardian:380,prism:620,hammer:760,eye:860,phantom:980,hive:1250}[kind];
e.r=15;e.hp=base*(1+(G.wave-5)*.045)*D.hp;e.sp=(kind==='hive'?40:24)*D.sp;e.dmg=20*D.dmg*ds*1.7;e.pts=600+G.wave*20;e.sh=20;
e.col={guardian:'#ff4d4d',hive:'#9dff3c',prism:'#22e6ff',hammer:'#ffb020',eye:'#a86bff',phantom:'#ff2fb0'}[kind];
e.boss=true;e.bossName=BOSS_NAMES[kind];e.atk='idle';e.atkT=1.4;e.phase=1;e.pending=null;e.shieldAng=0;e.chargeT=0;e.crisis=false;e.fleeT=0}
e.max=e.hp;e.spr=resolveSpr(e);return e}
function makeBoss(kind,x,y,ghost){var e=makeEnemy('boss',x,y);e.bossKind=kind;e.spr=resolveSpr(e);
e.bossName=(ghost?'ПРИЗРАК ':'')+BOSS_NAMES[kind];
if(ghost){e.ghost=true;e.hp*=.75;e.max=e.hp;e.dmg*=.75}return e}
function spawnAt(type,x,y,extra){var e=makeEnemy(type,x,y);if(extra)for(var k in extra)e[k]=extra[k];G.enemies.push(e);ring(x,y,2,12,e.col,.35);return e}
function spawn(type){var p=edge();return spawnAt(type,p.x,p.y)}
function fireBullet(x,y,angle,speed,dmg,pierce,isDrone,owner){G.bul.push({id:nextBid(),x:x,y:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:2,dmg:dmg,p:pierce||0,l:isDrone?1.1:1.2,hit:[],a:angle,dr:isDrone||false,owner:owner||0,col:owner?'#4d8cff':'#ffb020'})}
function fireRocketEntity(x,y,angle,dmg,owner,mini,hydra){G.rockets.push({id:nextBid(),x:x,y:y,a:angle,vx:Math.cos(angle)*(mini?200:160),vy:Math.sin(angle)*(mini?200:160),r:mini?2:3,dmg:dmg,l:mini?1.4:2.4,owner:owner||0,mini:!!mini,hydra:!!hydra})}
function eShoot(e,ang,spd,dmg,sprKey){if(G.ebul.length>240)return;G.ebul.push({id:nextBid(),x:e.x+Math.cos(ang)*(e.r+2),y:e.y+Math.sin(ang)*(e.r+2),vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,r:2.5,dmg:dmg*escale(e),l:4,spr:sprKey||'orbM'})}
function spawnBeam(x,y,ang,rot,life,dmg,len,width,col){if(G.beams.length>40)return;G.beams.push({x:x,y:y,ang:ang,rot:rot,life:life,max:life,dmg:dmg,len:len,width:width,col:col||'#ff4d4d',tick:0})}
function spawnZone(x,y,r,tel,life,dmg,col){if(G.zones.length>30)return;G.zones.push({x:x,y:y,r:r,tel:tel,life:life,max:life,dmg:dmg,col:col||'#ff4d4d',done:false})}
function spawnShock(x,y,maxR,speed,dmg,col){if(G.shocks.length>12)return;G.shocks.push({x:x,y:y,r:4,maxR:maxR,speed:speed,dmg:dmg,col:col||'#ffb020',hit:false})}
function updateBullets(dt){for(var i=G.bul.length-1;i>=0;i--){var bl=G.bul[i];bl.l-=dt;bl.x+=bl.vx*dt;bl.y+=bl.vy*dt;
var dead=bl.l<=0||bl.x<AR.x||bl.x>AR.x+AR.w||bl.y<AR.y||bl.y>AR.y+AR.h;
if(!dead)for(var j=0;j<G.enemies.length;j++){var e=G.enemies[j];if(e.dead||bl.hit.indexOf(e.id)>=0)continue;var dx=e.x-bl.x,dy=e.y-bl.y;
if(dx*dx+dy*dy<(e.r+bl.r)*(e.r+bl.r)){bl.hit.push(e.id);damageEnemy(e,bl.dmg,false,bl.x,bl.y,bl.a,false,PL[bl.owner]||P);if(bl.p>0)bl.p--;else dead=true;break}}
if(dead){if(bl.l>0)part(bl.x,bl.y,bl.dr?'#9dff3c':bl.col,3,45,.18,1);G.bul.splice(i,1)}}}
function updateRockets(dt){for(var i=G.rockets.length-1;i>=0;i--){var r=G.rockets[i];r.l-=dt;var tgt=null,bd=220*220;
for(var q=0;q<G.enemies.length;q++){var e=G.enemies[q];if(e.dead)continue;var d2=(e.x-r.x)*(e.x-r.x)+(e.y-r.y)*(e.y-r.y);if(d2<bd){bd=d2;tgt=e}}
if(tgt){var want=Math.atan2(tgt.y-r.y,tgt.x-r.x);r.a+=clamp(angDiff(r.a,want),-2.4*dt,2.4*dt)}
r.vx=Math.cos(r.a)*(r.mini?200:160);r.vy=Math.sin(r.a)*(r.mini?200:160);r.x+=r.vx*dt;r.y+=r.vy*dt;part(r.x,r.y,r.mini?'#ffd76a':'#ffb020',1,30,.2,1);
var hitE=null;for(q=0;q<G.enemies.length;q++){e=G.enemies[q];if(e.dead)continue;if(hyp(e.x-r.x,e.y-r.y)<e.r+r.r){hitE=e;break}}
var boom=r.l<=0||r.x<AR.x||r.x>AR.x+AR.w||r.y<AR.y||r.y>AR.y+AR.h||hitE;
if(boom){explodeRocket(r,hitE);G.rockets.splice(i,1)}}}
function explodeRocket(r,hitE){var x=r.x,y=r.y,dmg=r.dmg;ring(x,y,4,r.mini?22:50,'#ffb020',.5);part(x,y,'#ffb020',r.mini?10:26,r.mini?70:140,.6,2);shake(r.mini?2:6);flash(r.mini?.08:.2,'#ffb020');A.explode();
if(r.hydra&&!r.mini&&hitE)for(var i=0;i<3;i++){var a=r.a+(i-1)*.7;fireRocketEntity(x,y,a,30,r.owner,true,false)}
for(var j=0;j<G.enemies.length;j++){var e=G.enemies[j];if(e.dead)continue;var d=hyp(e.x-x,e.y-y),rad=r.mini?22:50;if(d<rad)damageEnemy(e,dmg*(1-d/rad*.5),true,e.x,e.y,0,true,PL[r.owner]||P)}}
function segHit(x1,y1,x2,y2,cx,cy,r){var dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;var t=l2?((cx-x1)*dx+(cy-y1)*dy)/l2:0;t=clamp(t,0,1);var px=x1+dx*t,py=y1+dy*t;return(px-cx)*(px-cx)+(py-cy)*(py-cy)<r*r}
function updateEnemyBullets(dt){for(var i=G.ebul.length-1;i>=0;i--){var eb=G.ebul[i];eb.l-=dt;var ox=eb.x,oy=eb.y;eb.x+=eb.vx*dt;eb.y+=eb.vy*dt;
if(eb.l<=0||eb.x<AR.x-16||eb.x>AR.x+AR.w+16||eb.y<AR.y-16||eb.y>AR.y+AR.h+16){G.ebul.splice(i,1);continue}
for(var j=0;j<PL.length;j++){var p=PL[j];if(p.hp<=0)continue;if(segHit(ox,oy,eb.x,eb.y,p.x,p.y,eb.r+p.r*.9)){hurtPlayer(p,eb.dmg);part(eb.x,eb.y,'#ff2fb0',7,70,.3,1);G.ebul.splice(i,1);break}}}}
function updateHazards(dt){var i,j,p;
for(i=G.beams.length-1;i>=0;i--){var b=G.beams[i];b.life-=dt;b.ang+=b.rot*dt;b.tick-=dt;var x2=b.x+Math.cos(b.ang)*b.len,y2=b.y+Math.sin(b.ang)*b.len;
if(b.tick<=0)for(j=0;j<PL.length;j++){p=PL[j];if(p.hp>0&&segHit(b.x,b.y,x2,y2,p.x,p.y,b.width+p.r*.7)){hurtPlayer(p,b.dmg);b.tick=.35;part(p.x,p.y,'#ff4d4d',5,60,.2,1);break}}
if(b.life<=0)G.beams.splice(i,1)}
for(i=G.zones.length-1;i>=0;i--){var z=G.zones[i];z.life-=dt;if(!z.done){z.tel-=dt;if(z.tel<=0){z.done=true;ring(z.x,z.y,2,z.r,z.col,.4);part(z.x,z.y,z.col,16,110,.4,1);A.boom();for(j=0;j<PL.length;j++){p=PL[j];if(p.hp>0&&hyp(p.x-z.x,p.y-z.y)<z.r+p.r)hurtPlayer(p,z.dmg)}}}if(z.life<=0)G.zones.splice(i,1)}
for(i=G.shocks.length-1;i>=0;i--){var s=G.shocks[i];s.r+=s.speed*dt;if(!s.hit)for(j=0;j<PL.length;j++){p=PL[j];if(p.hp>0&&Math.abs(hyp(p.x-s.x,p.y-s.y)-s.r)<7){hurtPlayer(p,s.dmg);s.hit=true;break}}if(s.r>s.maxR)G.shocks.splice(i,1)}}
function spawnShard(x,y){if(G.drops.length>=170)return;var a=rand(0,TAU),s=rand(20,60);G.drops.push({id:nextBid(),x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,type:'shard',l:14,sp:rand(0,TAU)})}
function spawnMedkit(x,y){if(G.drops.length>=170)return;G.drops.push({id:nextBid(),x:x,y:y,vx:rand(-20,20),vy:rand(-20,20),type:'hp',l:14,sp:0})}
function updateDrops(dt){for(var i=G.drops.length-1;i>=0;i--){var dr=G.drops[i];dr.l-=dt;dr.sp+=dt*4;
var p=nearestPlayer(dr.x,dr.y),dx=p.x-dr.x,dy=p.y-dr.y,dist=hyp(dx,dy)||1;
var mg=(p.stats?p.stats.magnet:34)*(dr.type==='hp'?.7:1);
if(dist<mg){var pull=420*(1-dist/mg)+70;dr.vx+=dx/dist*pull*dt;dr.vy+=dy/dist*pull*dt}
var kd=Math.exp(-2.4*dt);dr.vx*=kd;dr.vy*=kd;dr.x+=dr.vx*dt;dr.y+=dr.vy*dt;
if(dist<P.r+5){
if(dr.type==='shard'){var add=Math.floor(G.lootMult)+(Math.random()<(G.lootMult%1)?1:0);G.shards+=add;addScore(6*G.mult);A.pick(G.combo);part(dr.x,dr.y,'#ff2fb0',4,55,.25,1);popChip('.chip.g')}
else if(dr.type==='frag'){G.frags+=1;syncFrags();A.pick(8);part(dr.x,dr.y,'#4d8cff',6,60,.3,1);popChip('.chip.f');float(dr.x,dr.y-8,'+1⬡','#4d8cff',1)}
else if(dr.type==='bp'){if(META.bp.indexOf(dr.bp)<0&&META.unlocked.indexOf(dr.bp)<0){META.bp.push(dr.bp);saveMeta()}A.up();part(dr.x,dr.y,'#ffd76a',12,80,.4,1);float(dr.x,dr.y-10,'ЧЕРТЁЖ','#ffd76a',1)}
else{healPlayer(p,35);A.heal();part(dr.x,dr.y,'#35f0a0',9,70,.35,1);ring(dr.x,dr.y,2,16,'#35f0a0',.3)}
G.drops.splice(i,1);continue}
if(dr.l<=0)G.drops.splice(i,1)}}
var DODGE={shooter:1,splitter:1,sniper:1,medic:1,emitter:1};
function edgeAvoid(e,dt){var f=140;if(e.x<AR.x+EDGE)e.vx+=f*dt*(1-(e.x-AR.x)/EDGE);if(e.x>AR.x+AR.w-EDGE)e.vx-=f*dt*(1-(AR.x+AR.w-e.x)/EDGE);if(e.y<AR.y+EDGE)e.vy+=f*dt*(1-(e.y-AR.y)/EDGE);if(e.y>AR.y+AR.h-EDGE)e.vy-=f*dt*(1-(AR.y+AR.h-e.y)/EDGE)}
function updateEnemies(dt){planShieldGroups();
var onlyMedics=G.enemies.length>0;for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;if(e.type!=='medic'){onlyMedics=false;break}}
for(i=0;i<G.enemies.length;i++){e=G.enemies[i];if(e.dead)continue;
e.t+=dt;e.fl=Math.max(0,e.fl-dt);e.hitT=Math.max(0,e.hitT-dt);e.shieldFl=Math.max(0,e.shieldFl-dt);
var p=nearestPlayer(e.x,e.y),dx=p.x-e.x,dy=p.y-e.y,d=hyp(dx,dy)||1,ux=dx/d,uy=dy/d;
if(onlyMedics&&e.type==='medic')e.mode='boom';
if(e.boss)bossAI(e,dt,ux,uy,d);
else if(e.type==='shooter')updateShooter(e,dt,d,ux,uy,dx,dy);
else if(e.type==='tank')updateTank(e,dt,d,ux,uy,dx,dy);
else if(e.type==='shielder')updateShielder(e,dt,d,ux,uy,dx,dy);
else if(e.type==='sniper')updateSniper(e,dt,d,ux,uy);
else if(e.type==='medic')updateMedic(e,dt,d,ux,uy);
else if(e.type==='emitter')updateEmitter(e,dt,d,ux,uy);
else updateWalker(e,dt,ux,uy);
if(DODGE[e.type])applyDodge(e,dt);edgeAvoid(e,dt);
e.x+=e.vx*dt;e.y+=e.vy*dt;e.x=clamp(e.x,AR.x+e.r,AR.x+AR.w-e.r);e.y=clamp(e.y,AR.y+e.r,AR.y+AR.h-e.r);
if(d<e.r+p.r&&e.hitT<=0&&e.type!=='medic'&&e.type!=='emitter'){hurtPlayer(p,e.dmg*(e.st==='charge'?1.3:1));e.hitT=.6;e.vx-=ux*70;e.vy-=uy*70;p.vx+=ux*50;p.vy+=uy*50}}
for(i=0;i<G.enemies.length;i++){var a1=G.enemies[i];if(a1.dead)continue;
for(var j=i+1;j<G.enemies.length;j++){var b1=G.enemies[j];if(b1.dead)continue;var ddx=b1.x-a1.x,ddy=b1.y-a1.y,rr=a1.r+b1.r,d2=ddx*ddx+ddy*ddy;
if(d2<rr*rr&&d2>.01){var dd=Math.sqrt(d2),ff=(rr-dd)/dd*.4;if(!a1.boss){a1.x-=ddx*ff;a1.y-=ddy*ff}if(!b1.boss){b1.x+=ddx*ff;b1.y+=ddy*ff}}}}
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
var p=nearestPlayer(cx,cy),dP=hyp(p.x-cx,p.y-cy),prev=mem[0].mode,mode,ax=cx,ay=cy,ar=0;
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
if(e.cd<=0){e.cd=rand(1.5,2.2)/D.sp;eShoot(e,Math.atan2(dy,dx),95,8*D.dmg,'orbA');part(e.x,e.y,PAL.a,3,50,.2,1);A.tone(300,.06,'square',.04,.6)}}
function updateTank(e,dt,d,ux,uy,dx,dy){if(e.st==='walk'){e.vx+=(ux*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(uy*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;if(e.cd<=0&&d<130){e.st='tel';e.cd=.75;e.lock=Math.atan2(dy,dx)}}
else if(e.st==='tel'){e.cd-=dt;e.tel=1;e.vx*=.86;e.vy*=.86;if(e.cd<=0){e.st='charge';e.cd=.6;e.tel=0;A.tone(120,.22,'sawtooth',.09,1.8)}}
else{e.cd-=dt;e.vx=Math.cos(e.lock)*130;e.vy=Math.sin(e.lock)*130;part(e.x,e.y,PAL.r,1,35,.25,1);if(e.cd<=0){e.st='walk';e.cd=rand(2.4,3.6)}}}
function updateShielder(e,dt,d,ux,uy,dx,dy){e.face+=angDiff(e.face,e.tface)*Math.min(1,1.6*dt);
var tx=e.tx-e.x,ty=e.ty-e.y,td=hyp(tx,ty)||1,sp=Math.min(e.sp*1.9,td*5);
e.vx+=((tx/td)*sp-e.vx)*Math.min(1,4*dt);e.vy+=((ty/td)*sp-e.vy)*Math.min(1,4*dt);e.cd-=dt;var ap=Math.atan2(dy,dx);
if(e.cd<=0&&Math.abs(angDiff(e.face,ap))<.9){e.cd=rand(1.8,2.4);eShoot(e,e.face,95,8*D.dmg,'orbM');A.tone(280,.06,'square',.04,.6)}}
function updateSniper(e,dt,d,ux,uy){var tx,ty;if(e.tel>0){tx=0;ty=0}else if(d<170){tx=-ux;ty=-uy}else if(d>230){tx=ux;ty=uy}else{tx=-uy;ty=ux}
e.vx+=(tx*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;
if(e.cd<=.7&&e.tel===0){e.tel=1;e.lock=Math.atan2(P.y-e.y,P.x-e.x);A.tone(700,.3,'sine',.04,1.6)}
if(e.cd<=0){e.cd=3;e.tel=0;eShoot(e,e.lock,2600,36*D.dmg,'orbR');part(e.x,e.y,PAL.r,6,90,.25,1);A.tone(150,.15,'sawtooth',.1,.4)}}
function updateMedic(e,dt,d,ux,uy){e.beam=null;if(e.hp<e.max*.25)e.mode='boom';
if(e.mode==='boom'){e.vx+=(ux*130-e.vx)*Math.min(1,6*dt);e.vy+=(uy*130-e.vy)*Math.min(1,6*dt);part(e.x,e.y,PAL.g,1,40,.2,1);
if(d<12){var p=nearestPlayer(e.x,e.y);hurtPlayer(p,50*dmgScale());ring(e.x,e.y,4,44,PAL.g,.5);part(e.x,e.y,PAL.g,30,130,.6,2);flash(.3,PAL.g);A.boom();killEnemy(e)}return}
var target=null,bd=1e9;for(var i=0;i<G.enemies.length;i++){var o=G.enemies[i];if(o===e||o.dead||o.type==='medic'||o.hp>=o.max)continue;var dd=hyp(o.x-e.x,o.y-e.y);if(dd<bd){bd=dd;target=o}}
if(target&&bd<110){e.beam={x:target.x,y:target.y};target.hp=Math.min(target.max,target.hp+12*dt);var tx=(target.x-e.x)/bd,ty=(target.y-e.y)/bd;e.vx+=(tx*20-e.vx)*Math.min(1,3*dt);e.vy+=(ty*20-e.vy)*Math.min(1,3*dt)}
else{var t2,u2;if(d<110){t2=-ux;u2=-uy}else{t2=-uy;u2=ux}e.vx+=(t2*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(u2*e.sp-e.vy)*Math.min(1,3*dt)}}
function updateEmitter(e,dt,d,ux,uy){var tx,ty;if(d<120){tx=-ux;ty=-uy}else if(d>170){tx=ux;ty=uy}else{tx=-uy;ty=ux}
e.vx+=(tx*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;e.tel=e.cd<.7?1:0;
if(e.cd<=0){e.cd=4.5;var n=G.wave>=18?8:4,base=rand(0,TAU);for(var i=0;i<n;i++)spawnBeam(e.x,e.y,base+i*TAU/n,.35,1.3,10*D.dmg*escale(e),240,2,PAL.c);A.laser()}}
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
function execBoss(e,kind){var ds=escale(e),dd=hyp(P.x-e.x,P.y-e.y)||1,ux=(P.x-e.x)/dd,uy=(P.y-e.y)/dd;
if(kind==='radial'){var n=10+e.phase*3;e.ang+=.24;for(var k=0;k<n;k++)eShoot(e,e.ang+k*TAU/n,72+e.phase*6,9*D.dmg,'orbM');ring(e.x,e.y,e.r,e.r+16,e.col,.25);A.tone(240,.1,'square',.06,.6)}
else if(kind==='spiral'){for(var s=0;s<10;s++){var a=e.ang+s*.42;eShoot(e,a,88,8*D.dmg,'orbA');eShoot(e,a+Math.PI,88,8*D.dmg,'orbA')}e.ang+=.6;A.tone(300,.12,'square',.06,.7)}
else if(kind==='charge'){e.st='charge';e.chargeT=.6;e.lock=Math.atan2(P.y-e.y,P.x-e.x);A.tone(90,.5,'sawtooth',.1,2.2)}
else if(kind==='summon'){var n2=(e.bossKind==='hive'?3:2)+e.phase;for(var i=0;i<n2;i++){var a2=rand(0,TAU),type=e.bossKind==='hive'?(i%3===0?'medic':(i%3===1?'splitter':'grunt')):(e.bossKind==='eye'?'sniper':(e.phase>=3?'shooter':'grunt'));var m=makeEnemy(type,e.x+Math.cos(a2)*22,e.y+Math.sin(a2)*22);m.vx=Math.cos(a2)*70;m.vy=Math.sin(a2)*70;G.enemies.push(m);ring(m.x,m.y,2,11,e.col,.3)}A.tone(180,.3,'sawtooth',.09,2)}
else if(kind==='summonMed'){var nm=2+(e.phase>=3?1:0);for(var im=0;im<nm&&G.enemies.length<40;im++){var am=rand(0,TAU),xm=clamp(e.x+Math.cos(am)*24,AR.x+EDGE,AR.x+AR.w-EDGE),ym=clamp(e.y+Math.sin(am)*24,AR.y+EDGE,AR.y+AR.h-EDGE);var md=makeEnemy('medic',xm,ym);md.vx=Math.cos(am)*50;md.vy=Math.sin(am)*50;G.enemies.push(md);ring(xm,ym,2,11,PAL.g,.3)}A.tone(180,.3,'sawtooth',.09,2)}
else if(kind==='summonSnipe'){var ns=1+(e.phase>=3?1:0);for(var is=0;is<ns&&G.enemies.length<40;is++){var as=rand(0,TAU),xs=clamp(e.x+Math.cos(as)*60,AR.x+EDGE,AR.x+AR.w-EDGE),ys=clamp(e.y+Math.sin(as)*60,AR.y+EDGE,AR.y+AR.h-EDGE);G.enemies.push(makeEnemy('sniper',xs,ys));ring(xs,ys,2,11,PAL.v,.3)}A.tone(700,.2,'sine',.05,1.6)}
else if(kind==='spore'){for(i=0;i<3+e.phase;i++)spawnZone(P.x+rand(-70,70),P.y+rand(-70,70),26,.8,1.1,12*D.dmg*ds,'#9dff3c');A.tone(160,.3,'triangle',.08,1.6)}
else if(kind==='beams'){var n3=2+e.phase;for(i=0;i<n3;i++)spawnBeam(e.x,e.y,e.shieldAng+i*TAU/n3,.5,1.6,11*D.dmg*ds,300,3,PAL.c);A.laser()}
else if(kind==='shock'){spawnShock(e.x,e.y,180,150,16*D.dmg*ds,'#ffb020');shake(4);A.shock()}
else if(kind==='zones'){for(i=0;i<2+e.phase;i++)spawnZone(P.x+rand(-60,60),P.y+rand(-60,60),30,.75,1.05,18*D.dmg*ds,'#ffb020');A.tone(120,.3,'square',.08,1.8)}
else if(kind==='pull'){P.vx-=ux*160;P.vy-=uy*160;spawnShock(e.x,e.y,150,130,14*D.dmg*ds,'#ff4d4d');A.tone(70,.4,'sawtooth',.12,2)}
else if(kind==='volley'){for(i=0;i<3;i++){var a3=Math.atan2(P.y-e.y,P.x-e.x)+(i-1)*.12;eShoot(e,a3,900,14*D.dmg,'orbR')}A.tone(150,.15,'sawtooth',.1,.4)}
else if(kind==='cross'){for(i=0;i<4;i++)spawnBeam(e.x,e.y,e.shieldAng+i*TAU/4,.25,1.4,12*D.dmg*ds,320,3,'#a86bff');A.laser()}
else if(kind==='mark'){spawnZone(P.x,P.y,34,.9,1.2,24*D.dmg*ds,'#ff4d4d');A.tone(700,.3,'sine',.05,1.6)}
else if(kind==='blink'){var a4=rand(0,TAU),dist=rand(70,110);e.x=clamp(P.x+Math.cos(a4)*dist,AR.x+20,AR.x+AR.w-20);e.y=clamp(P.y+Math.sin(a4)*dist,AR.y+20,AR.y+AR.h-20);ring(e.x,e.y,4,40,'#ff2fb0',.4);A.blink();var n4=8+e.phase*2;for(k=0;k<n4;k++)eShoot(e,k*TAU/n4,80,8*D.dmg,'orbM')}
else if(kind==='clones'){for(i=0;i<2+e.phase;i++){var a5=rand(0,TAU),m2=makeEnemy('clone',e.x+Math.cos(a5)*18,e.y+Math.sin(a5)*18);m2.vx=Math.cos(a5)*80;m2.vy=Math.sin(a5)*80;G.enemies.push(m2)}A.blink()}}
function computeStats(L){var o={};
o.rate=4.6*Math.pow(1.18,L.rate||0)*Math.pow(1.14,L.kir||0)*(1+.05*(META.perm.rate||0));
o.dmg=10*Math.pow(1.25,L.cal||0)*(1+.06*(META.perm.dmg||0));o.count=1+(L.fan||0);
o.spread=.11*(L.fan||0)+.03;o.pierce=L.pierce||0;
o.speed=74*Math.pow(1.13,L.speed||0)*(1+.04*(META.perm.spd||0));
var dl=L.dash||0;o.dashCd=(dl>=4?0:0.91*Math.pow(0.7,dl))*Math.pow(.94,META.perm.dash||0);o.dashDmg=18+9*dl;
o.magnet=34*Math.pow(1.7,L.magnet||0);o.vamp=.04*(L.vamp||0);o.regen=1.6*(L.regen||0);o.drones=L.drone||0;o.bs=200*Math.pow(1.18,L.kir||0);
o.shieldMax=25*(L.shield||0)+10*(META.perm.shield||0);o.shieldRegen=6+2*(L.shield||0);
o.healDrone=L.healdrone||0;o.healRate=.7*o.healDrone*(1+o.healDrone*.3);
var hl=L.hyper||0;o.hyper=hl;o.hyperDmg=hl?50+(hl-1)*25:0;o.hyperCd=hl?5-(hl-1):0;o.hyperGold=!!L.hyperGold;
var sl=L.socio||0;o.socio=sl;o.socioDps=10*sl;o.socioSpinDps=120*sl;
var wp=L.weapon,wl=wp?(L[wp]||0):0;o.weapon=wp;o.weaponLvl=wl;
if(wp==='rocket'){o.weaponCdMax=wl>=3?3.5:5;o.weaponDmg=(L.hydra?.6:1)*(50+(wl-1)*50)}
else if(wp==='wave'){o.weaponCdMax=5;o.weaponDmg=L.density?460:[45,70,115][wl-1]||45;o.weaponRadius=L.density?150:100}
else if(wp==='beam'){o.weaponCdMax=7;o.weaponDmg=40+(wl-1)*30;o.beamDur=3}
else{o.weaponCdMax=0;o.weaponDmg=0}
o.hydra=!!L.hydra;o.density=!!L.density;o.reflect=!!L.reflect;return o}
function renderMods(){var m=$('#mods');m.innerHTML='';var L=localPlayer().lvl;
UPS.forEach(function(u){var l=L[u.k]||0;if(!l)return;var ic=iconCanvas(u.k,u.col,2);ic.style.width='18px';ic.style.height='18px';ic.title=u.n+' ур.'+l;m.appendChild(ic)})}
function recalcPlayer(p){p.stats=computeStats(p.lvl);p.max=D.base+25*(p.lvl.armor||0)+15*(META.perm.hp||0);
p.shield=Math.min(p.shield,p.stats.shieldMax);while(p.dT.length<p.stats.drones)p.dT.push(rand(0,.6));p.dT.length=p.stats.drones;
if(p===localPlayer())renderMods()}
function recalc(){for(var i=0;i<PL.length;i++)recalcPlayer(PL[i])}
function moveVecLocal(){if(GP.active){var g=gamepadMove();if(g.x||g.y)return g}
var x=0,y=0;if(keys.KeyA||keys.ArrowLeft)x-=1;if(keys.KeyD||keys.ArrowRight)x+=1;if(keys.KeyW||keys.ArrowUp)y-=1;if(keys.KeyS||keys.ArrowDown)y+=1;
if(sticks.move.m>.14){x+=sticks.move.dx;y+=sticks.move.dy}var l=hyp(x,y);if(l>1){x/=l;y/=l}return{x:x,y:y}}
function localAim(p){if(GP.active&&GP.aimActive)return GP.aim;if(sticks.aim.m>.2)return Math.atan2(sticks.aim.dy,sticks.aim.dx);
if(!isTouch&&G.t-mouseT<4)return Math.atan2(my+CAM.y-p.y,mx+CAM.x-p.x);
var tg=nearestEnemy(p.x,p.y);return tg?Math.atan2(tg.y-p.y,tg.x-p.x):p.aim}
function nearestEnemy(x,y){var b=null,bd=1e9;for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;var d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;b=e}}return b}
function nearestEnemyExcluding(x,y,hit){var b=null,bd=1e9;for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||hit.indexOf(e.id)>=0)continue;var d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;b=e}}return b}
function triggerHyper(p){var st=p.stats;if(!st.hyper||p.hyperCd>0)return;p.hyperCd=st.hyperCd;p.dashHold=0;p.socioSpin=1.16;
var hit=[],count=st.hyperGold?3:1;
for(var c=0;c<count;c++){var e=nearestEnemyExcluding(p.x,p.y,hit);if(!e)break;hit.push(e.id);
G.ghost.push({x:p.x,y:p.y,a:p.aim,l:.3,m:.3,col:p.col});
p.x=clamp(e.x,AR.x+p.r,AR.x+AR.w-p.r);p.y=clamp(e.y,AR.y+p.r,AR.y+AR.h-p.r);
damageEnemy(e,st.hyperDmg,true,e.x,e.y,0,true,p);ring(e.x,e.y,4,30,'#ff2fb0',.4);part(e.x,e.y,'#ff2fb0',14,110,.4,1)}
p.inv=Math.max(p.inv,.45);A.dash();shake(4)}
function updateSocio(p,dt,st){if(!st.socio)return;p.socioSpin=Math.max(0,p.socioSpin-dt);
var spin=p.socioSpin>0,speed=spin?16:2.2,R=22,bladeR=spin?8:6,base=G.t*speed,dps=spin?st.socioSpinDps:st.socioDps;
for(var b=0;b<2;b++){var a=base+b*Math.PI,bx=p.x+Math.cos(a)*R,by=p.y+Math.sin(a)*R;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;
if(hyp(e.x-bx,e.y-by)<e.r+bladeR){e.hp-=dps*dt;e.fl=.05;if(Math.random()<.2)part(e.x,e.y,'#a86bff',1,40,.15,1);if(e.hp<=0)killEnemy(e)}}}}
function updatePlayer(p,dt){var st=p.stats,inp=p.input,local=(p===localPlayer()),mvx,mvy,aim;
if(local){var mv=moveVecLocal();mvx=mv.x;mvy=mv.y;p.focus=!!(keys.ShiftLeft||keys.ShiftRight);aim=localAim(p);
inp.mx=mvx;inp.my=mvy;inp.aim=aim;inp.held=dashHeld;
if(LI.dash||GP.dash){inp.dash=true;LI.dash=false}if(LI.weapon||GP.weapon){inp.weapon=true;LI.weapon=false}}
else{mvx=inp.mx;mvy=inp.my;aim=inp.aim;p.focus=inp.focus}
p.aim=aim;p.inv=Math.max(0,p.inv-dt);p.hurtT=Math.max(0,p.hurtT-dt);p.dashCd=Math.max(0,p.dashCd-dt);
p.weaponCd=Math.max(0,p.weaponCd-dt);p.hyperCd=Math.max(0,p.hyperCd-dt);p.shieldT=Math.max(0,p.shieldT-dt);p.noHit+=dt;
if(st.regen&&p.noHit>3)healPlayer(p,st.regen*dt);
if(st.shieldMax&&p.shieldT<=0)p.shield=Math.min(st.shieldMax,p.shield+st.shieldRegen*dt);
if(st.healRate)healPlayer(p,st.healRate*dt);
var held=local?dashHeld:!!inp.held;if(held)p.dashHold+=dt;else p.dashHold=0;
if(st.hyper&&p.dashHold>=1.5&&p.hyperCd<=0)triggerHyper(p);
if(inp.dash){doDash(p);inp.dash=false}if(inp.weapon){fireWeapon(p);inp.weapon=false}
if(p.dashT>0){p.dashT-=dt;p.vx=p.dx*280;p.vy=p.dy*280;G.ghost.push({x:p.x,y:p.y,a:p.aim,l:.22,m:.22,col:p.col});
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.dh)continue;
if(hyp(e.x-p.x,e.y-p.y)<e.r+p.r+2){e.dh=true;damageEnemy(e,st.dashDmg,true,e.x,e.y,0,true,p);var ka=Math.atan2(e.y-p.y,e.x-p.x);e.vx+=Math.cos(ka)*90;e.vy+=Math.sin(ka)*90}}}
else{for(i=0;i<G.enemies.length;i++)G.enemies[i].dh=false;var sp=st.speed*(p.focus?.55:1),k=1-Math.exp(-20*dt);p.vx+=(mvx*sp-p.vx)*k;p.vy+=(mvy*sp-p.vy)*k}
p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=clamp(p.x,AR.x+p.r,AR.x+AR.w-p.r);p.y=clamp(p.y,AR.y+p.r,AR.y+AR.h-p.r);
updateSocio(p,dt,st);
p.fireT-=dt;if(p.fireT<=0){p.fireT=1/st.rate;shoot(p)}
for(i=0;i<st.drones;i++){p.dT[i]-=dt;if(p.dT[i]<=0){var t2=nearestEnemy(p.x,p.y);
if(t2){p.dT[i]=.7;var ang=G.t*1.8+i*TAU/st.drones,ddx=p.x+Math.cos(ang)*16,ddy=p.y+Math.sin(ang)*16;fireBullet(ddx,ddy,Math.atan2(t2.y-ddy,t2.x-ddx),180,st.dmg*.5,0,true,p.id)}else p.dT[i]=.25}}
if(p.beamT>0){p.beamT-=dt;updateBeam(p,dt)}}
function shoot(p){var st=p.stats,n=st.count;for(var i=0;i<n;i++){var off=(i-(n-1)/2)*st.spread*2+rand(-.02,.02)*(p.focus?.3:1),a=p.aim+off;fireBullet(p.x+Math.cos(a)*7,p.y+Math.sin(a)*7,a,st.bs,st.dmg,st.pierce,false,p.id)}
G.st.shots+=n;part(p.x+Math.cos(p.aim)*8,p.y+Math.sin(p.aim)*8,p.light,2,50,.15,1);p.vx-=Math.cos(p.aim)*9;p.vy-=Math.sin(p.aim)*9;A.shoot()}
function updateBeam(p,dt){var st=p.stats,dps=st.weaponDmg,len=280,w=5,ca=Math.cos(p.aim),sa=Math.sin(p.aim);p.beamChain=[];
if(st.reflect){var hit=[],cur={x:p.x,y:p.y},ang=p.aim;
for(var c=0;c<5;c++){var best=null,bd=1e9;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||hit.indexOf(e.id)>=0)continue;
var rx=e.x-cur.x,ry=e.y-cur.y,proj=rx*Math.cos(ang)+ry*Math.sin(ang);if(proj<0||proj>len)continue;
var perp=Math.abs(-rx*Math.sin(ang)+ry*Math.cos(ang));if(perp<e.r+w&&proj<bd){bd=proj;best=e}}
if(!best)break;hit.push(best.id);p.beamChain.push({x1:cur.x,y1:cur.y,x2:best.x,y2:best.y});
best.hp-=dps*dt;best.fl=.05;if(best.hp<=0)killEnemy(best);cur={x:best.x,y:best.y};
var nxt=null,nd=1e9;for(i=0;i<G.enemies.length;i++){var e2=G.enemies[i];if(e2.dead||hit.indexOf(e2.id)>=0)continue;var d=hyp(e2.x-cur.x,e2.y-cur.y);if(d<nd&&d<160){nd=d;nxt=e2}}
if(!nxt)break;ang=Math.atan2(nxt.y-cur.y,nxt.x-cur.x)}
if(!p.beamChain.length)p.beamChain.push({x1:p.x,y1:p.y,x2:p.x+ca*len,y2:p.y+sa*len})}
else{p.beamChain.push({x1:p.x,y1:p.y,x2:p.x+ca*len,y2:p.y+sa*len});
for(i=0;i<G.enemies.length;i++){var e3=G.enemies[i];if(e3.dead)continue;var rx3=e3.x-p.x,ry3=e3.y-p.y,proj3=rx3*ca+ry3*sa;if(proj3<0||proj3>len)continue;var perp3=Math.abs(-rx3*sa+ry3*ca);
if(perp3<e3.r+w){e3.hp-=dps*dt;e3.fl=.05;if(Math.random()<.15)part(e3.x,e3.y,'#ff2fb0',1,40,.15,1);if(e3.hp<=0)killEnemy(e3)}}}}
function fireWeapon(p){var st=p.stats;if(G.state!=='play'||!st.weapon||p.weaponCd>0)return;
if(st.weapon==='rocket'){p.weaponCd=st.weaponCdMax;fireRocketEntity(p.x+Math.cos(p.aim)*8,p.y+Math.sin(p.aim)*8,p.aim,st.weaponDmg,p.id,false,st.hydra);A.rocket();shake(2);part(p.x,p.y,'#ffb020',6,70,.25,1)}
else if(st.weapon==='wave'){p.weaponCd=st.weaponCdMax;var rad=st.weaponRadius;
if(st.density){if(G.rings.length<=10)G.rings.push({x:p.x,y:p.y,r:6,r1:rad,l:.55,m:.55,c:'#22e6ff',ang:p.aim,spread:Math.PI/4})}else ring(p.x,p.y,4,rad,'#22e6ff',.55);
part(p.x,p.y,'#22e6ff',24,130,.5,1);shake(4);A.shock();
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;var d=hyp(e.x-p.x,e.y-p.y);if(d>rad)continue;
if(st.density){var a=Math.atan2(e.y-p.y,e.x-p.x);if(Math.abs(angDiff(p.aim,a))>Math.PI/4)continue}
damageEnemy(e,st.weaponDmg,true,e.x,e.y,0,true,p)}}
else if(st.weapon==='beam'){p.weaponCd=st.weaponCdMax;p.beamT=st.beamDur;A.beam();flash(.12,'#ff2fb0')}}
function doDash(p){var st=p.stats;if(G.state!=='play'||p.dashCd>0)return;
var mv=p===localPlayer()?moveVecLocal():{x:p.input.mx,y:p.input.my};var dx=mv.x,dy=mv.y;if(!dx&&!dy){dx=Math.cos(p.aim);dy=Math.sin(p.aim)}
var l=hyp(dx,dy)||1;p.dx=dx/l;p.dy=dy/l;p.dashT=.16;p.dashCd=st.dashCd;p.socioSpin=1.16;
p.inv=Math.max(p.inv,.28);A.dash();shake(2);part(p.x,p.y,p.col,10,90,.3,1);ring(p.x,p.y,3,18,p.col,.25)}
var groupCounter=0,groupAnchor={};
function pushShieldGroup(at){var size=randi(3,4),gid=++groupCounter;for(var i=0;i<size;i++)G.queue.push({type:'shielder',at:at+i*.08,group:gid,slot:i})}
function levelTypeName(t){return t==='std'?'СЕКТОР':t==='bomb'?'БОМБЕЖКА':t==='snipe'?'ПОД ПРИЦЕЛОМ':t==='mystery'?'ТАИНСТВЕННЫЙ':t==='rand'?'СЛУЧАЙНЫЙ':t==='boss'?'БОСС':''}
function buildWave(node){G.queue=[];groupAnchor={};var t=.5,type=node.type;
if(type==='boss'){G.queue.push({type:'boss',boss:node.boss,at:.8});
var adds=Math.round((4+Math.floor(G.wave/3))*(PL.length>1?1.5:1));
for(var i=0;i<adds;i++)G.queue.push({type:i%4===3?'shooter':'grunt',at:2.2+i*.5});
if(G.wave>=10)pushShieldGroup(5);if(G.wave>=15)G.queue.push({type:'sniper',at:7});
if(G.wave>=20)G.queue.push({type:'medic',at:6});if(G.wave>=25)G.queue.push({type:'emitter',at:8});return}
var mp=PL.length>1?1.5:1,budget=(6+G.wave*2.4)*D.budget*mp,pool=[['grunt',1]];
if(type==='bomb'){pool=[['medic',3.5]]}
else if(type==='snipe'){pool=[['sniper',2],['sniper',2],['sniper',2],['shielder',3],['medic',3.5]];
for(var s0=0;s0<5;s0++)G.queue.push({type:'sniper',at:.4+s0*.25})}
else if(type==='mystery'){if(Math.random()<.45){pool=[]}else pool=[['grunt',1],['shooter',2],['splitter',2.5]]}
else if(type==='rand'&&G.event==='swarm'){pool=[['clone',.5],['mini',.5]]}
else if(type==='rand'&&G.event==='calm'){pool=[]}
else{if(G.wave>=2)pool.push(['shooter',2]);if(G.wave>=3)pool.push(['splitter',2.5]);
if(G.wave>=4){pool.push(['tank',4]);pool.push(['sniper',3])}if(G.wave>=5)pool.push(['medic',3.5]);
if(G.wave>=8)pool.push(['emitter',4]);if(G.wave>=12)pool.push(['shielder',3])}
if(type==='mystery'&&G.lastBossKind&&Math.random()<.35){G.queue.push({type:'ghost',boss:G.lastBossKind,at:1.5})}
if(!pool.length){for(var s=0;s<8;s++)spawnShard(rand(AR.x+60,AR.x+AR.w-60),rand(AR.y+60,AR.y+AR.h-60));return}
var guard=0,hasShield=false,hasSniper=false;
var groups=(type==='snipe'?1:G.wave>=6?1+Math.floor((G.wave-6)/7):0);
for(var g=0;g<groups;g++){pushShieldGroup(t+g*2.2);hasShield=true;budget-=6}
while(budget>0&&guard++<160){var av=pool.filter(function(p){return p[1]<=budget+.5});if(!av.length)break;
var gs=randi(1,Math.min(5,2+Math.floor(G.wave/5)));
for(i=0;i<gs;i++){var p=pick(av);budget-=p[1];if(p[0]==='sniper')hasSniper=true;
if(p[0]==='shielder'){pushShieldGroup(t);hasShield=true}else G.queue.push({type:p[0],at:t+i*rand(.14,.3)})}
t+=rand(.75,1.5)*clamp(1.2-G.wave*.02,.5,1.2)}
if(hasShield&&G.wave>=4&&!hasSniper)G.queue.push({type:'sniper',at:t+.5});
G.queue.sort(function(a,b){return a.at-b.at})}
function setArena(w,h){G.arena={w:w,h:h};AR.w=w;AR.h=h;floorCanvas=makeFloor(w,h)}
function startLevel(node){G.wave=node.d;G.waveT=0;G.active=true;G.portal=null;G.event=null;
var type=node.type;
if(type==='bomb')setArena(512,384);
else if(type==='mystery')setArena(1280,360);
else setArena(640,480);
if(type==='rand'){if(Math.random()<.5){var t=pick(['std','bomb','snipe','mystery']);node.type=t;G.lootMult=1.5;
if(t==='bomb')setArena(512,384);else if(t==='mystery')setArena(1280,360);else setArena(640,480)}
else{G.lootMult=2;G.event=pick(['gold','meteor','swarm','calm'])}}
else G.lootMult=(type==='std')?1:1.5;
G.enemies=[];G.bul=[];G.ebul=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];G.drops=[];G.queue=[];G.boss=null;
for(var i=0;i<PL.length;i++){var p=PL[i];p.x=AR.w/2+(i?10:-10);p.y=AR.h/2;p.vx=0;p.vy=0}
centerCam(true);buildWave(node);
var label=node.type==='boss'?BOSS_NAMES[node.boss]:levelTypeName(node.type);
banner(label,node.type==='boss'?'УНИЧТОЖЬ ЯДРО':'ЗАЧИСТИ СЕКТОР');
if(node.type==='boss')A.bossIn();else A.wave();
$('#cWave').textContent=G.wave;popChip('.chip.w');setState('play')}
function updateSpawns(){while(G.queue.length&&G.queue[0].at<=G.waveT&&G.enemies.length<(PL.length>1?36:28)){var q=G.queue.shift();
if(q.type==='boss'){var e=makeBoss(q.boss,AR.w/2,AR.y+60,false);G.enemies.push(e);G.boss=e;$('#bossbar').classList.add('on');$('#bossName').textContent=e.bossName}
else if(q.type==='ghost'){var g=makeBoss(q.boss,AR.w/2,AR.y+60,true);G.enemies.push(g);G.boss=g;$('#bossbar').classList.add('on');$('#bossName').textContent=g.bossName}
else if(q.type==='shielder'&&q.group!=null){if(!groupAnchor[q.group])groupAnchor[q.group]=edge();var a=groupAnchor[q.group],ang=q.slot*TAU/4;
spawnAt('shielder',clamp(a.x+Math.cos(ang)*11,AR.x+EDGE,AR.x+AR.w-EDGE),clamp(a.y+Math.sin(ang)*11,AR.y+EDGE,AR.y+AR.h-EDGE),{group:q.group,slot:q.slot})}
else spawn(q.type)}}
function waveClear(){G.active=false;G.boss=null;$('#bossbar').classList.remove('on');
var bonus=100+G.wave*35;addScore(bonus);G.shards+=3+Math.floor(G.wave/2);A.up();
var node=getNode(G.curNode);
if(node&&node.type==='boss'&&node.boss==='hive'){winRun();return}
G.portal={x:G.lastKill.x,y:G.lastKill.y,r:10,t:0};A.portal();
float(G.portal.x,G.portal.y-14,'ПОРТАЛ','#22e6ff',1)}
function getNode(id){if(!G.map)return null;for(var d=0;d<G.map.length;d++)for(var i=0;i<G.map[d].length;i++)if(G.map[d][i].id===id)return G.map[d][i];return null}
function genMap(){G.map=[];var id=1;G.bossPool=BOSS_POOL.slice();
for(var d=1;d<=MAX_WAVE;d++){var nodes=[];
if(d===30)nodes=[{id:id++,d:d,type:'boss',boss:'hive',row:0}];
else if(d%5===0){var cnt=Math.min(2,G.bossPool.length);var sample=G.bossPool.slice().sort(function(){return Math.random()-.5}).slice(0,cnt);
for(var b=0;b<cnt;b++)nodes.push({id:id++,d:d,type:'boss',boss:sample[b],row:b})}
else{var n=d===1?1:randi(2,3);for(var i=0;i<n;i++){var t=pick(['std','std','bomb','snipe','mystery','rand']);nodes.push({id:id++,d:d,type:t,row:i})}}
G.map.push(nodes)}
for(d=0;d<G.map.length-1;d++){var cur=G.map[d],nxt=G.map[d+1];
for(i=0;i<cur.length;i++){cur[i].next=[];var j=Math.round(i*(nxt.length-1)/Math.max(1,cur.length-1));
cur[i].next.push(nxt[j].id);if(nxt[j+1]&&Math.random()<.6)cur[i].next.push(nxt[j+1].id);if(nxt[j-1]&&Math.random()<.4)cur[i].next.push(nxt[j-1].id)}
for(i=0;i<nxt.length;i++){var has=false;for(var c=0;c<cur.length;c++)if(cur[c].next.indexOf(nxt[i].id)>=0)has=true;
if(!has)cur[Math.min(cur.length-1,Math.round(i*(cur.length-1)/Math.max(1,nxt.length-1)))].next.push(nxt[i].id)}}
G.curNode=G.map[0][0].id}
function reachableNodes(){var cur=getNode(G.curNode);if(!cur||!cur.next)return[];return cur.next.map(getNode).filter(Boolean)}
function trySelectNode(id){if(NET.mode==='guest'){netSend({t:'map',id:id});return}
var reach=reachableNodes();var node=null;for(var i=0;i<reach.length;i++)if(reach[i].id===id)node=reach[i];
if(!node)return;selectNode(node)}
function selectNode(node){if(node.type==='boss'&&node.boss!=='hive'){var ix=G.bossPool.indexOf(node.boss);if(ix>=0)G.bossPool.splice(ix,1)}
G.pendingNode=node;G.curNode=node.id;G.travel=true;G.travelT=0;G.travelDone=false;G.menuOpened=false;G.postT=0;
setState('travel')}
function enterPortal(){G.portal=null;var node=getNode(G.curNode);
if(node&&node.type==='boss'){setState('shop');buildShop()}
else{setState('map');G.mapCam=(node?node.d:1)*70-W/3}}
function openUp(){P.ready=false;P.pickPhase=0;rollFor(P);
if(NET.connected){P2.ready=false;P2.pickPhase=0;rollFor(P2)}
setState('up');renderCards();syncShop();
$('#upEye').textContent='ПЕРЕЛЁТ · '+(G.pendingNode?(G.pendingNode.type==='boss'?BOSS_NAMES[G.pendingNode.boss]:levelTypeName(G.pendingNode.type)):'');
if(NET.mode==='host')sendUpView()}
function baseCap(k){for(var i=0;i<UPS.length;i++)if(UPS[i].k===k)return UPS[i].cap;return 3}
function upByKey(k){for(var i=0;i<UPS.length;i++)if(UPS[i].k===k)return UPS[i];return null}
function upgradeCost(u,p){var lv=p.lvl[u.k]||0;if(u.k==='dash'&&lv>=3)return 100;if(u.cost)return u.cost;return 0}
function rollFor(p){var L=p.lvl,pool=UPS.filter(function(u){
if((L[u.k]||0)>=u.cap)return false;
if(LOCKED.indexOf(u.k)>=0&&META.unlocked.indexOf(u.k)<0)return false;
if(u.gold)return L.weapon===u.req&&(L[u.req]||0)>=baseCap(u.req)&&!L[u.k];
if(u.weapon&&L.weapon&&u.k!==L.weapon)return false;return true});
p.offer=[];var guard=0;while(p.offer.length<Math.min(3,pool.length)&&guard++<80){var u=pick(pool);if(p.offer.indexOf(u)<0)p.offer.push(u)}}
function upView(p){return{offer:p.offer.map(function(u){return u.k}),shards:G.shards,dual:p.dual,phase:p.pickPhase,ready:p.ready,lvl:p.lvl,hp:p.hp,max:p.max,otherReady:(p===P?P2.ready:P.ready),connected:NET.connected}}
function sendUpView(){if(NET.mode==='host'&&NET.connected)netSend({t:'upview',v:upView(P2)})}
function applyUpView(v){G.shards=v.shards;P2.dual=v.dual;P2.pickPhase=v.phase;P2.ready=v.ready;P2.lvl=v.lvl;P2.hp=v.hp;P2.max=v.max;
P2.offer=v.offer.map(upByKey).filter(Boolean);recalcPlayer(P2);renderCards();syncShop()}
function renderCards(){var p=localPlayer(),el=$('#cards');el.innerHTML='';
p.offer.forEach(function(u,i){var lv=p.lvl[u.k]||0,b=document.createElement('button');var cost=upgradeCost(u,p);
b.className='card'+((u.gold||cost)?' gold':'');b.type='button';
var pips='';for(var j=0;j<u.cap;j++)pips+='<i class="'+(j<lv?'f':'')+'"></i>';
b.innerHTML='<span class="num">'+(i+1)+'</span><h4>'+u.n+'</h4><p>'+u.d+(cost?' · '+cost+'◆':'')+'</p><div class="lv">'+pips+'</div>';
b.insertBefore(iconCanvas(u.k,u.col,4),b.firstChild);
b.addEventListener('click',function(){if(NET.mode==='guest')netSend({t:'choose',i:i});else choose(i,p)});el.appendChild(b)});
var hint;if(p.ready)hint=NET.connected?'Модуль выбран. Ждём второго...':'Готово. Перелёт завершается.';
else if(p.dual)hint=p.pickPhase===0?'Двойной выбор: первый бесплатно, второй за 50◆':'Выбери второй за 50◆ или заверши';
else hint='Клавиши 1·2·3. Осколки ◆ на ремонт и переброску.';
$('#upHint').textContent=hint}
function syncShop(){$('#upShards').textContent=G.shards;var p=localPlayer();
$('#sRepair').disabled=G.shards<12||p.hp>=p.max||p.ready;$('#sReroll').disabled=G.shards<6||p.ready;
$('#sDual').style.display=p.dual?'none':'';$('#sDual').disabled=G.shards<350||p.ready;
$('#sSkip').textContent=p.ready?'ГОТОВО':'ПРОПУСТИТЬ +75◆';
$('#sDone').style.display=p.dual&&p.pickPhase===1&&!p.ready?'':'none'}
function applyUpgrade(u,p){var L=p.lvl;if(u.weapon&&!L.weapon)L.weapon=u.k;L[u.k]=(L[u.k]||0)+1;recalcPlayer(p);
if(u.k==='armor')healPlayer(p,25);A.up();flash(.15,'#22e6ff');ring(p.x,p.y,3,44,'#9dff3c',.5);part(p.x,p.y,'#9dff3c',16,90,.5,1)}
function checkAdvance(){if(NET.mode==='guest'||G.state!=='up')return;
var done=NET.connected?(P.ready&&P2.ready):P.ready;
if(done){G.travelDone=true;setState('travel')}else{renderCards();syncShop();sendUpView()}}
function choose(i,p){if(G.state!=='up')return;p=p||localPlayer();if(p.ready)return;var u=p.offer[i];if(!u)return;
var cost=upgradeCost(u,p),total=cost+((p.dual&&p.pickPhase===1)?50:0);if(G.shards<total)return;G.shards-=total;
if(p.dual&&p.pickPhase===1){applyUpgrade(u,p);p.ready=true}else{applyUpgrade(u,p);if(p.dual){p.pickPhase=1;rollFor(p)}else p.ready=true}
if(p===P2)sendUpView();if(p===localPlayer()){renderCards();syncShop()}checkAdvance()}
function shopAction(a,p){if(G.state!=='up'||p.ready)return;
if(a==='repair'){if(G.shards<12||p.hp>=p.max)return;G.shards-=12;healPlayer(p,35);A.heal()}
else if(a==='reroll'){if(G.shards<6)return;G.shards-=6;rollFor(p);A.tone(600,.09,'square',.07,1.4)}
else if(a==='dual'){if(G.shards<350||p.dual)return;G.shards-=350;p.dual=true;A.up()}
else if(a==='skip'){G.shards+=75;A.pick(3);p.ready=true}else if(a==='done'){p.ready=true}
if(p===P2)sendUpView();if(p===localPlayer()){renderCards();syncShop()}checkAdvance()}
function initShopButtons(){function act(a){if(NET.mode==='guest')netSend({t:'shop',a:a});else shopAction(a,localPlayer())}
$('#sRepair').addEventListener('click',function(){act('repair')});$('#sReroll').addEventListener('click',function(){act('reroll')});
$('#sDual').addEventListener('click',function(){act('dual')});$('#sSkip').addEventListener('click',function(){act('skip')});
$('#sDone').addEventListener('click',function(){act('done')});
$('#bToMap').addEventListener('click',function(){setState('map');var n=getNode(G.curNode);G.mapCam=(n?n.d:1)*70-W/3})}
function metaBuyAction(kind,k){if(NET.mode==='guest')netSend({t:'metabuy',kind:kind,k:k});else hostMetaBuy(kind,k)}
function buildShop(){$('#shopFrags').textContent=G.frags;
var pe=$('#shopPerms');pe.innerHTML='';
PERMS.forEach(function(pm){var lv=META.perm[pm.k]||0,cost=permCost(pm.k),maxed=lv>=pm.max,inv=META.invest[pm.k]||0;
var row=document.createElement('div');row.className='mrow';
row.innerHTML='<div class="mi"><b>'+pm.n+'</b><s>'+pm.d+'</s><s style="color:var(--blue)">вложено '+inv+'/'+cost+'</s></div><span class="ml">ур.'+lv+'/'+pm.max+'</span>';
var bi=document.createElement('button');bi.className='sb';bi.textContent='+1⬡';bi.disabled=maxed||G.frags<1;
bi.addEventListener('click',function(){metaBuyAction('invperm',pm.k)});
var b=document.createElement('button');b.className='sb gold';b.textContent=maxed?'МАКС':cost+'⬡';b.disabled=maxed||G.frags<cost;
b.addEventListener('click',function(){metaBuyAction('perm',pm.k)});
row.appendChild(bi);row.appendChild(b);pe.appendChild(row)});
var be=$('#shopBp');be.innerHTML='';
if(!META.bp.length)be.innerHTML='<div class="sub">Чертежей нет. Они падают из боссов и редко из мобов.</div>';
META.bp.forEach(function(k){var u=upByKey(k);if(!u)return;var inv=META.invest[k]||0;
var row=document.createElement('div');row.className='mrow';
row.innerHTML='<div class="mi"><b>'+u.n+'</b><s>'+u.d+'</s><s style="color:var(--blue)">вложено '+inv+'/'+BP_COST+'</s></div>';
var bi=document.createElement('button');bi.className='sb';bi.textContent='+1⬡';bi.disabled=G.frags<1;
bi.addEventListener('click',function(){metaBuyAction('invbp',k)});
var b=document.createElement('button');b.className='sb gold';b.textContent=BP_COST+'⬡';b.disabled=G.frags<BP_COST;
b.addEventListener('click',function(){metaBuyAction('bp',k)});
row.appendChild(bi);row.appendChild(b);be.appendChild(row)})}
function initInput(canvas){var lastTapTime=0,lastTapSide='';
function onKeyDown(e){if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code)>=0)e.preventDefault();
keys[e.code]=true;A.init();A.resume();
if(e.code==='KeyM'){toggleSound();return}
if(e.code==='KeyP'||e.code==='Escape'){if(G.state==='play')pause();else if(G.state==='pause')resume();return}
if(e.code==='KeyR'){if(G.state!=='title')newRun();return}
if((G.state==='title'||G.state==='over'||G.state==='win')&&(e.code==='Enter'||e.code==='Space')){newRun();return}
if(G.state==='up'){var idx={Digit1:0,Digit2:1,Digit3:2}[e.code];if(idx!==undefined){if(NET.mode==='guest')netSend({t:'choose',i:idx});else choose(idx,localPlayer())}return}
if(G.state==='play'&&e.code==='Space'&&!e.repeat)LI.dash=true}
function onKeyUp(e){keys[e.code]=false}
function onBlur(){for(var k in keys)keys[k]=false;sticks.move.id=null;sticks.aim.id=null;sticks.move.m=0;sticks.aim.m=0;touchDashHeld=false;mouseRightHeld=false;if(G.state==='play'&&NET.mode!=='guest')pause()}
function toLogical(e){var r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/canvas.SCALE,y:(e.clientY-r.top)/canvas.SCALE}}
function onDown(e){A.init();A.resume();try{canvas.setPointerCapture(e.pointerId)}catch(err){}
var p=toLogical(e);
if(G.state==='map'){var wx=p.x+G.mapCam,wy=p.y;var reach=reachableNodes();
for(var i=0;i<reach.length;i++){var n=reach[i];var nx=60+n.d*70,ny=H/2+(n.row-(G.map[n.d-1].length-1)/2)*70;
if(hyp(wx-nx,wy-ny)<20){trySelectNode(n.id);return}}return}
if(e.pointerType==='touch'){var side=p.x<W*.5?'L':'R',now=performance.now();
if(now-lastTapTime<300&&lastTapSide===side){if(side==='L')LI.dash=true;else LI.weapon=true;lastTapTime=0}else{lastTapTime=now;lastTapSide=side}
var s=side==='L'?sticks.move:sticks.aim;if(s.id===null){s.id=e.pointerId;s.ox=p.x;s.oy=p.y;s.dx=0;s.dy=0;s.m=0}}
else{mx=p.x;my=p.y;mouseT=G.t;if(e.button===0)LI.weapon=true;if(e.button===2){LI.dash=true;mouseRightHeld=true}}}
function onMove(e){var p=toLogical(e);if(e.pointerType!=='touch'){mx=p.x;my=p.y;mouseT=G.t;return}
['move','aim'].forEach(function(k){var s=sticks[k];if(s.id!==e.pointerId)return;var dx=p.x-s.ox,dy=p.y-s.oy,d=Math.sqrt(dx*dx+dy*dy),max=22;
if(d>max){s.ox=p.x-dx/d*max;s.oy=p.y-dy/d*max;dx=dx/d*max;dy=dy/d*max}s.dx=dx/max;s.dy=dy/max;s.m=Math.min(Math.max(d/max,0),1)})}
function onUp(e){if(e.pointerType==='touch'){['move','aim'].forEach(function(k){var s=sticks[k];if(s.id===e.pointerId){s.id=null;s.m=0;s.dx=0;s.dy=0}})}else if(e.button===2)mouseRightHeld=false}
window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',onBlur);
canvas.addEventListener('contextmenu',function(e){e.preventDefault()});
canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);
canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
var rb=$('#rbDash');rb.addEventListener('pointerdown',function(e){e.preventDefault();LI.dash=true;touchDashHeld=true});
rb.addEventListener('pointerup',function(){touchDashHeld=false});rb.addEventListener('pointercancel',function(){touchDashHeld=false});rb.addEventListener('pointerleave',function(){touchDashHeld=false});
$('#rbWeapon').addEventListener('pointerdown',function(e){e.preventDefault();LI.weapon=true});
document.addEventListener('pointerdown',function(){A.init();A.resume()},{once:true})}
var starLayers=[],comets=[],bloomCv=null,bloomCtx=null,visualT=0;
function initBackground(ctx){starLayers=[];for(var L=0;L<3;L++){var arr=[],n=[46,32,20][L];for(var i=0;i<n;i++)arr.push({x:randi(0,W-1),y:randi(0,H-1),c:pick(THEME.stars),p:rand(0,TAU),s:L===2?2:1});starLayers.push(arr)}comets=[]}
function updateVisual(dt){visualT+=dt;if(Math.random()<dt*.12&&comets.length<2){var e=Math.random()<.5;comets.push({x:e?rand(-40,W):rand(0,W),y:e?rand(0,H*.5):rand(-30,0),vx:rand(60,120)*(Math.random()<.5?-1:1),vy:rand(40,90),l:rand(1.2,2),m:2})}
for(var i=comets.length-1;i>=0;i--){var c=comets[i];c.l-=dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.l<=0)comets.splice(i,1)}}
function drawParallax(ctx){for(var L=0;L<starLayers.length;L++){var depth=[.06,.14,.26][L],arr=starLayers[L];
for(var i=0;i<arr.length;i++){var st=arr[i],tw=.4+.6*Math.abs(Math.sin(visualT*(.8+L*.4)+st.p));ctx.globalAlpha=tw*(.35+L*.2);ctx.fillStyle=st.c;
var x=((Math.round(st.x-CAM.x*depth)%W)+W)%W,y=((Math.round(st.y-CAM.y*depth)%H)+H)%H;ctx.fillRect(x,y,st.s,st.s)}}
ctx.globalAlpha=1;for(i=0;i<comets.length;i++){var c=comets[i],a=clamp(c.l/c.m,0,1);line(ctx,c.x,c.y,c.x-c.vx*.12,c.y-c.vy*.12,THEME.bloom,1,a*.5)}}
function setupBloom(){bloomCv=mkC(Math.max(1,Math.ceil(W/3)),Math.max(1,Math.ceil(H/3)));bloomCtx=bloomCv.getContext('2d')}
function applyBloom(ctx){if(!bloomOn||!bloomCv)return;var bw=bloomCv.width,bh=bloomCv.height;bloomCtx.clearRect(0,0,bw,bh);bloomCtx.drawImage(cv,0,0,bw,bh);
ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.34;try{ctx.filter='blur(2px)'}catch(e){}ctx.drawImage(bloomCv,0,0,W,H);ctx.filter='none';ctx.restore()}
function drawTravel(ctx){ctx.fillStyle=THEME.css['--void'];ctx.fillRect(0,0,W,H);
var cx=W/2,cy=H/2;
for(var i=0;i<60;i++){var a=(i/60)*TAU+visualT*.6,r=((visualT*140+i*37)%Math.max(W,H));
var x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;ctx.globalAlpha=clamp(r/Math.max(W,H),0,1)*.7;
ctx.fillStyle=i%3?THEME.bloom:'#fff';ctx.fillRect(Math.round(x),Math.round(y),2,2)}
ctx.globalAlpha=1;pxCircle(ctx,cx,cy,20+Math.sin(visualT*6)*4,THEME.bloom,.6);
pxCircle(ctx,cx,cy,10,'#fff',.8);
drawSpr(ctx,localPlayer().id?SPR.shipB:SPR.shipY,cx,cy,-Math.PI/2,false,1);
pxText(ctx,'ПЕРЕЛЁТ',cx-pxTextW('ПЕРЕЛЁТ',1)/2,cy+34,THEME.css['--cyan'],1)}
function nodeColor(n){return n.type==='boss'?(n.boss==='hive'?'#ff2fb0':{guardian:'#ff4d4d',prism:'#22e6ff',hammer:'#ffb020',eye:'#a86bff',phantom:'#ff2fb0'}[n.boss]):n.type==='bomb'?'#9dff3c':n.type==='snipe'?'#a86bff':n.type==='mystery'?'#6b6a8a':n.type==='rand'?'#ffb020':'#22e6ff'}
function drawMap(ctx){ctx.fillStyle=THEME.css['--void'];ctx.fillRect(0,0,W,H);drawParallax(ctx);
var reach=reachableNodes(),rids=reach.map(function(n){return n.id});
var target=(getNode(G.curNode).d)*70-W/3;G.mapCam+=(target-G.mapCam)*.1;
ctx.save();ctx.translate(-G.mapCam,0);
for(var d=0;d<G.map.length-1;d++)for(var i=0;i<G.map[d].length;i++){var n=G.map[d][i];
for(var j=0;j<(n.next||[]).length;j++){var m=getNode(n.next[j]);if(!m)continue;
var x1=60+n.d*70,y1=H/2+(n.row-(G.map[n.d-1].length-1)/2)*70;
var x2=60+m.d*70,y2=H/2+(m.row-(G.map[m.d-1].length-1)/2)*70;
var active=n.id===G.curNode;line(ctx,x1,y1,x2,y2,active?THEME.bloom:THEME.css['--edge'],active?1.5:1,active?.7:.3)}}
for(d=0;d<G.map.length;d++)for(i=0;i<G.map[d].length;i++){n=G.map[d][i];
var x=60+n.d*70,y=H/2+(n.row-(G.map[d].length-1)/2)*70;
if(x-G.mapCam<-40||x-G.mapCam>W+40)continue;
var col=nodeColor(n),isCur=n.id===G.curNode,isReach=rids.indexOf(n.id)>=0;
var r=n.type==='boss'?12:8;
if(isReach){ctx.globalAlpha=.4+.3*Math.sin(visualT*5);pxCircle(ctx,x,y,r+5,col,.6);ctx.globalAlpha=1}
pxDisc(ctx,x,y,r,col,isCur?1:isReach?.9:.35);
pxCircle(ctx,x,y,r,isCur?'#fff':col,isCur?1:.6);
if(n.type==='boss')pxText(ctx,n.boss==='hive'?'УЛЕЙ':'Б',x-2,y-2,'#0a0518',1);
else if(n.type==='mystery')pxText(ctx,'?',x-2,y-2,'#0a0518',1);
ctx.globalAlpha=isReach||isCur?1:.4;
pxText(ctx,String(n.d),x-pxTextW(String(n.d),1)/2,y-r-8,THEME.css['--dim'],1);
ctx.globalAlpha=1}
ctx.restore();
pxText(ctx,'ВЫБЕРИ МАРШРУТ',8,VIEW.y+4,THEME.css['--cyan'],1);
pxText(ctx,'x'+G.lootMult+' ЛУТ',8,VIEW.y+14,THEME.css['--amber'],1)}
function render(ctx){ctx.imageSmoothingEnabled=false;
if(G.state==='map'){drawMap(ctx);return}
if(G.travel&&(G.state==='travel'||G.state==='up')){drawTravel(ctx);return}
ctx.fillStyle=THEME.css['--void'];ctx.fillRect(0,0,W,H);drawParallax(ctx);
var sx=G.shake?randi(-Math.round(G.shake),Math.round(G.shake)):0,sy=G.shake?randi(-Math.round(G.shake),Math.round(G.shake)):0;
ctx.save();ctx.translate(sx-CAM.x,sy-CAM.y);
ctx.save();ctx.beginPath();ctx.rect(AR.x,AR.y,AR.w,AR.h);ctx.clip();ctx.drawImage(floorCanvas,AR.x,AR.y,AR.w,AR.h);
var pulse=.5+.5*Math.sin(visualT*2.4);ctx.globalAlpha=.04+.03*pulse;ctx.strokeStyle='rgb('+THEME.floor.grid+')';ctx.lineWidth=1;ctx.beginPath();
for(var gx=AR.x;gx<=AR.x+AR.w;gx+=40){ctx.moveTo(gx+.5,AR.y);ctx.lineTo(gx+.5,AR.y+AR.h)}
for(var gy=AR.y;gy<=AR.y+AR.h;gy+=40){ctx.moveTo(AR.x,gy+.5);ctx.lineTo(AR.x+AR.w,gy+.5)}ctx.stroke();ctx.globalAlpha=1;
for(var i=0;i<G.beats.length;i++){var bt=G.beats[i];pxCircle(ctx,P.x,P.y,bt.r,THEME.bloom,Math.max(0,bt.a)*.4)}ctx.restore();
var hurtG=P.hurtT>0;ctx.fillStyle=hurtG?PAL.r:THEME.css['--edge'];
ctx.fillRect(AR.x-1,AR.y-1,AR.w+2,1);ctx.fillRect(AR.x-1,AR.y+AR.h,AR.w+2,1);ctx.fillRect(AR.x-1,AR.y-1,1,AR.h+2);ctx.fillRect(AR.x+AR.w,AR.y-1,1,AR.h+2);
ctx.fillStyle=hurtG?PAL.r:THEME.css['--cyan'];[[AR.x-2,AR.y-2],[AR.x+AR.w-2,AR.y-2],[AR.x-2,AR.y+AR.h-2],[AR.x+AR.w-2,AR.y+AR.h-2]].forEach(function(c){ctx.fillRect(c[0],c[1],4,4)});
ctx.globalAlpha=.12;ctx.strokeStyle=THEME.css['--violet'];ctx.strokeRect(AR.x+EDGE,AR.y+EDGE,AR.w-EDGE*2,AR.h-EDGE*2);ctx.globalAlpha=1;
for(i=0;i<G.zones.length;i++){var z=G.zones[i],za=z.done?clamp(z.life/z.max,0,1):.35+.3*Math.abs(Math.sin(G.t*14));pxCircle(ctx,z.x,z.y,z.r,z.col,za);if(!z.done)pxCircle(ctx,z.x,z.y,z.r*clamp(1-z.tel/.9,0,1),z.col,.5)}
for(i=0;i<G.shocks.length;i++){var s=G.shocks[i];pxCircle(ctx,s.x,s.y,s.r,s.col,.8)}
for(i=0;i<G.rings.length;i++){var rg=G.rings[i];
if(rg.ang!==undefined){var ral=clamp(rg.l/rg.m,0,1);ctx.save();ctx.globalAlpha=ral*.26;ctx.fillStyle=rg.c;
ctx.beginPath();ctx.moveTo(rg.x,rg.y);ctx.arc(rg.x,rg.y,rg.r,rg.ang-rg.spread,rg.ang+rg.spread);ctx.closePath();ctx.fill();
ctx.globalAlpha=ral*.9;ctx.strokeStyle=rg.c;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(rg.x,rg.y,rg.r,rg.ang-rg.spread,rg.ang+rg.spread);ctx.stroke();
ctx.beginPath();ctx.moveTo(rg.x,rg.y);ctx.lineTo(rg.x+Math.cos(rg.ang-rg.spread)*rg.r,rg.y+Math.sin(rg.ang-rg.spread)*rg.r);
ctx.moveTo(rg.x,rg.y);ctx.lineTo(rg.x+Math.cos(rg.ang+rg.spread)*rg.r,rg.y+Math.sin(rg.ang+rg.spread)*rg.r);ctx.stroke();
ctx.globalAlpha=ral*.5;ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(rg.x,rg.y,Math.max(1,rg.r-3),rg.ang-rg.spread,rg.ang+rg.spread);ctx.stroke();ctx.restore()}
else pxCircle(ctx,rg.x,rg.y,rg.r,rg.c,clamp(rg.l/rg.m,0,1))}
if(G.portal){var po=G.portal,pr=po.r+Math.sin(visualT*5)*2;
pxCircle(ctx,po.x,po.y,pr,'#22e6ff',.8);pxCircle(ctx,po.x,po.y,pr*.6,'#fff',.5);pxDisc(ctx,po.x,po.y,3,'#22e6ff',.8);
ctx.globalAlpha=.3;pxCircle(ctx,po.x,po.y,pr+6,'#22e6ff',.4);ctx.globalAlpha=1}
for(i=0;i<G.drops.length;i++){var dp=G.drops[i];if(dp.l<3&&Math.floor(dp.l*8)%2===0)continue;
var bob=Math.round(Math.sin(G.t*4+dp.sp));var sp=dp.type==='shard'?SPR.shard:dp.type==='frag'?SPR.frag:dp.type==='bp'?SPR.bp:SPR.med;
ctx.drawImage(sp.n,Math.round(dp.x-sp.w/2),Math.round(dp.y-sp.h/2)+bob)}
for(i=0;i<G.beams.length;i++){var b=G.beams[i],x2=b.x+Math.cos(b.ang)*b.len,y2=b.y+Math.sin(b.ang)*b.len;line(ctx,b.x,b.y,x2,y2,b.col,b.width*2,.25);line(ctx,b.x,b.y,x2,y2,'#fff',1,.8)}
for(i=0;i<G.enemies.length;i++){var e=G.enemies[i];var ealpha=e.ghost?.5:1;
if(e.type==='medic'&&e.beam)line(ctx,e.x,e.y,e.beam.x,e.beam.y,PAL.g,1,.7*ealpha);
if(e.type==='shielder'&&e.guardId!=null){var g=null;for(var q=0;q<G.enemies.length;q++)if(G.enemies[q].id===e.guardId&&!G.enemies[q].dead){g=G.enemies[q];break}if(g)line(ctx,e.x,e.y,g.x,g.y,PAL.b,1,.25)}
if(e.type==='shielder'&&e.slot===0&&(e.mode==='circle'||e.mode==='guard')&&e.ar>0)pxCircle(ctx,e.ax,e.ay,e.ar,PAL.b,.22);
if(e.type==='sniper'&&e.tel>0){var p2=Math.floor(G.t*16)%2===0;ctx.fillStyle=p2?'#fff':PAL.r;for(q=8;q<440;q+=5)ctx.fillRect(Math.round(e.x+Math.cos(e.lock)*q),Math.round(e.y+Math.sin(e.lock)*q),1,1)}
if(e.type==='emitter'&&e.tel>0){p2=Math.floor(G.t*16)%2===0;pxCircle(ctx,e.x,e.y,e.r+5,p2?'#fff':PAL.c,.8)}
if(e.tel>0&&e.type!=='sniper'&&e.type!=='emitter'){p2=Math.floor(G.t*16)%2===0;pxCircle(ctx,e.x,e.y,e.r+4+Math.round(Math.sin(G.t*12)),p2?'#fff':e.col,.85);
if(e.st==='charge'||e.atk==='charge'){var lx=Math.cos(e.lock),ly=Math.sin(e.lock);for(q=6;q<70;q+=4){ctx.fillStyle=p2?'#fff':PAL.r;ctx.fillRect(Math.round(e.x+lx*q),Math.round(e.y+ly*q),2,2)}}}
var np=nearestPlayer(e.x,e.y);var ang=e.boss?(e.bossKind==='phantom'?e.t*.8:e.t*.35):((e.type==='shooter'||e.type==='tank'||e.type==='sniper'||e.type==='emitter')?Math.atan2(np.y-e.y,np.x-e.x):(e.type==='shielder'?e.face:Math.atan2(e.vy,e.vx)));
drawSpr(ctx,resolveSpr(e),e.x,e.y,ang,e.fl>0&&Math.floor(G.t*30)%2===0,ealpha);
if(e.boss){ctx.globalAlpha=(.18+.1*Math.sin(visualT*3))*ealpha;pxCircle(ctx,e.x,e.y,e.r+7+Math.round(Math.sin(visualT*2)*2),e.col,.5);ctx.globalAlpha=1}
if(e.type==='shielder'){var col=e.shieldFl>0?'#fff':PAL.c;for(var t=-1.1;t<=1.1;t+=.16){ctx.fillStyle=col;ctx.fillRect(Math.round(e.x+Math.cos(e.face+t)*(e.r+3)),Math.round(e.y+Math.sin(e.face+t)*(e.r+3)),2,2)}}
if(e.bossKind==='prism')for(var k=0;k<3;k++){var a0=e.shieldAng+k*TAU/3;for(t=-.5;t<=.5;t+=.12){ctx.fillStyle=e.shieldFl>0?'#fff':PAL.c;ctx.fillRect(Math.round(e.x+Math.cos(a0+t)*(e.r+5)),Math.round(e.y+Math.sin(a0+t)*(e.r+5)),2,2)}}
if(e.type==='tank'||e.type==='shielder'||e.type==='medic'||e.type==='emitter'||e.boss){var f=clamp(e.hp/e.max,0,1),bw=e.boss?24:16;
ctx.fillStyle=PAL.o;ctx.fillRect(Math.round(e.x-bw/2)-1,Math.round(e.y-e.r-6),bw+2,4);
ctx.fillStyle=THEME.css['--deep'];ctx.fillRect(Math.round(e.x-bw/2),Math.round(e.y-e.r-5),bw,2);
ctx.fillStyle=e.type==='medic'?PAL.g:(f>.5?PAL.g:(f>.25?PAL.a:PAL.r));ctx.fillRect(Math.round(e.x-bw/2),Math.round(e.y-e.r-5),Math.round(bw*f),2)}}
for(i=0;i<G.ebul.length;i++){var eb=G.ebul[i],os=typeof eb.spr==='string'?SPR[eb.spr]:eb.spr;ctx.drawImage(os.n,Math.round(eb.x-2),Math.round(eb.y-2))}
for(i=0;i<G.rockets.length;i++){var r=G.rockets[i];drawSpr(ctx,r.mini?SPR.miniRocket:SPR.rocket,r.x,r.y,r.a,false,1)}
if(G.state!=='title'){for(i=0;i<G.ghost.length;i++){var gh=G.ghost[i];drawSpr(ctx,gh.col==='#4d8cff'?SPR.shipB:SPR.shipY,gh.x,gh.y,gh.a,false,clamp(gh.l/gh.m,0,1)*.35)}
for(var pi=0;pi<PL.length;pi++){var p=PL[pi];if(p.hp<=0)continue;var pspr=p.id?SPR.shipB:SPR.shipY;var st=p.stats||computeStats(p.lvl);
for(i=0;i<st.drones;i++){var a2=G.t*1.8+i*TAU/st.drones;drawSpr(ctx,SPR.drone,p.x+Math.cos(a2)*16,p.y+Math.sin(a2)*16,a2*2,false,1)}
if(st.healDrone){var ha=G.t*1.2+Math.PI;drawSpr(ctx,SPR.healdrone,p.x+Math.cos(ha)*18,p.y+Math.sin(ha)*18,ha*2,false,1);if(p.hp<p.max)line(ctx,p.x,p.y,p.x+Math.cos(ha)*18,p.y+Math.sin(ha)*18,PAL.g,1,.25)}
if(st.socio){var spin=p.socioSpin>0,bs=spin?16:2.2;for(var bl=0;bl<2;bl++){var ba=G.t*bs+bl*Math.PI;
line(ctx,p.x+Math.cos(ba)*10,p.y+Math.sin(ba)*10,p.x+Math.cos(ba)*28,p.y+Math.sin(ba)*28,spin?'#fff':PAL.v,spin?4:3,spin?.95:.8)}}
var blink=p.inv&&Math.floor(G.t*20)%2===0;var fb=Math.sin(G.t*3.2+p.id*2.1)*.8;
var fbx=p.x-Math.sin(p.aim)*fb,fby=p.y+Math.cos(p.aim)*fb,bank=Math.sin(G.t*2.6+p.id*1.7)*.05;
var fca=Math.cos(p.aim),fsa=Math.sin(p.aim);
if(!blink){var spd=hyp(p.vx,p.vy);
if(spd>18){var bx=fbx-fca*9,by=fby-fsa*9;ctx.fillStyle=Math.floor(G.t*24)%2===0?p.col:p.light;ctx.fillRect(Math.round(bx)-1,Math.round(by)-1,2,2);
ctx.globalAlpha=.4;ctx.fillStyle=p.col;ctx.fillRect(Math.round(bx-fca*3)-1,Math.round(by-fsa*3)-1,2,2);ctx.globalAlpha=1}
else if(Math.floor(G.t*10)%2===0){ctx.fillStyle=p.light;ctx.fillRect(Math.round(fbx-fca*8),Math.round(fby-fsa*8),1,1)}
drawSpr(ctx,pspr,fbx,fby,p.aim+bank,p.hurtT>0&&Math.floor(G.t*30)%2===0,1);
if(Math.floor(G.t*2+p.id)%2===0){ctx.fillStyle='#fff';ctx.fillRect(Math.round(fbx+(-5*fca+5*fsa)),Math.round(fby+(-5*fsa-5*fca)),1,1);ctx.fillRect(Math.round(fbx+(-5*fca-5*fsa)),Math.round(fby+(-5*fsa+5*fca)),1,1)}}
if(p.shield>0)pxCircle(ctx,p.x,p.y,9,PAL.v,.3+.5*(p.shield/st.shieldMax));
if(p.beamT>0&&p.beamChain)for(i=0;i<p.beamChain.length;i++){var c=p.beamChain[i];line(ctx,c.x1,c.y1,c.x2,c.y2,PAL.m,7,.25);line(ctx,c.x1,c.y1,c.x2,c.y2,'#fff',2,.9)}
var pr=p.dashCd<=0?1:1-p.dashCd/st.dashCd;pxCircle(ctx,p.x,p.y,11,p.dashCd<=0?p.col:THEME.css['--edge'],.3+.2*pr);
if(st.hyper&&p.dashHold>0)pxCircle(ctx,p.x,p.y,14,'#ff2fb0',.2+.6*clamp(p.dashHold/1.5,0,1));
ctx.globalAlpha=.5;for(q=10;q<26;q+=4){ctx.fillStyle=PAL.g;ctx.fillRect(Math.round(p.x+Math.cos(p.aim)*q),Math.round(p.y+Math.sin(p.aim)*q),1,1)}ctx.globalAlpha=1;
if(st.density){ctx.globalAlpha=.15;ctx.strokeStyle='#22e6ff';ctx.lineWidth=1;ctx.beginPath();
ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(p.aim-Math.PI/4)*30,p.y+Math.sin(p.aim-Math.PI/4)*30);
ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(p.aim+Math.PI/4)*30,p.y+Math.sin(p.aim+Math.PI/4)*30);ctx.stroke();ctx.globalAlpha=1}
if(PL.length>1)pxText(ctx,p.id?'2':'1',p.x-2,p.y-16,p.col,1)}
if(!isTouch&&G.t-mouseT<4){var wx=mx+CAM.x,wy=my+CAM.y;ctx.fillStyle=THEME.css['--cyan'];ctx.fillRect(Math.round(wx)-3,Math.round(wy),7,1);ctx.fillRect(Math.round(wx),Math.round(wy)-3,1,7)}}
for(i=0;i<G.bul.length;i++){var bl=G.bul[i];ctx.save();ctx.translate(Math.round(bl.x),Math.round(bl.y));ctx.rotate(bl.a);
if(bl.dr){ctx.fillStyle=PAL.g;ctx.fillRect(-2,-1,4,2);ctx.fillStyle='#fff';ctx.fillRect(0,-1,1,2)}else{ctx.fillStyle=bl.col||PAL.a;ctx.fillRect(-2,-2,4,4);ctx.fillStyle='#fff';ctx.fillRect(0,-1,2,2)}ctx.restore()}
for(i=0;i<G.parts.length;i++){var pp=G.parts[i],al=clamp(pp.l/pp.m,0,1);ctx.globalAlpha=al>.35?1:.55;ctx.fillStyle=pp.c;var sz=pp.s+(al>.7?1:0);ctx.fillRect(Math.round(pp.x),Math.round(pp.y),sz,sz)}ctx.globalAlpha=1;
for(i=0;i<G.floats.length;i++){var fl=G.floats[i];if(fl.l<.2&&Math.floor(fl.l*30)%2===0)continue;var w=pxTextW(fl.t,fl.s);pxText(ctx,fl.t,fl.x-w/2+1,fl.y+1,PAL.o,fl.s);pxText(ctx,fl.t,fl.x-w/2,fl.y,fl.c,fl.s)}
if(isTouch&&G.state==='play'){['move','aim'].forEach(function(k){var s=sticks[k];if(s.id===null)return;var col=k==='move'?THEME.css['--cyan']:PAL.m;pxCircle(ctx,s.ox+CAM.x,s.oy+CAM.y,22,col,.45);pxDisc(ctx,s.ox+CAM.x+s.dx*22,s.oy+CAM.y+s.dy*22,7,col,.75)})}
ctx.restore();
var mw=64,mh=Math.round(AR.h/AR.w*mw),mx0=W-mw-6,my0=VIEW.y+6,sc=mw/AR.w;
ctx.globalAlpha=.8;ctx.fillStyle=THEME.css['--deep'];ctx.fillRect(mx0,my0,mw,mh);ctx.strokeStyle=THEME.css['--edge'];ctx.strokeRect(mx0+.5,my0+.5,mw-1,mh-1);
ctx.fillStyle=THEME.css['--cyan'];ctx.globalAlpha=.25;ctx.fillRect(mx0+CAM.x*sc,my0+CAM.y*sc,W*sc,H*sc);ctx.globalAlpha=.9;
for(i=0;i<G.enemies.length;i++){e=G.enemies[i];ctx.fillStyle=e.boss?PAL.r:(e.type==='medic'?PAL.g:e.type==='shielder'?PAL.b:e.type==='sniper'?PAL.v:e.type==='emitter'?PAL.c:PAL.m);ctx.fillRect(mx0+e.x*sc,my0+e.y*sc,e.boss?3:1,e.boss?3:1)}
for(pi=0;pi<PL.length;pi++){p=PL[pi];ctx.fillStyle=p.col;ctx.fillRect(mx0+p.x*sc-1,my0+p.y*sc-1,2,2)}ctx.globalAlpha=1;
if(G.flash>0){ctx.globalAlpha=Math.min(.55,G.flash);ctx.fillStyle=G.flashCol;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
if(G.state==='play'&&P.hp/P.max<.3){var pl=.4+.6*Math.abs(Math.sin(G.t*4));ctx.globalAlpha=pl;ctx.fillStyle=PAL.r;
ctx.fillRect(0,VIEW.y,W,1);ctx.fillRect(0,VIEW.y+VIEW.h-1,W,1);ctx.fillRect(0,VIEW.y,1,VIEW.h);ctx.fillRect(W-1,VIEW.y,1,VIEW.h);ctx.globalAlpha=1}}
var SCR={title:'#sTitle',up:'#sUp',shop:'#sShop',pause:'#sPause',over:'#sOver',win:'#sWin'};
function setState(s){G.state=s;for(var k in SCR)$(SCR[k]).classList.remove('on');if(SCR[s])$(SCR[s]).classList.add('on')}
function banner(a,b){var el=$('#banner');el.querySelector('b').textContent=a;el.querySelector('s').textContent=b;el.classList.remove('go');void el.offsetWidth;el.classList.add('go')}
function syncBest(){$('#tBest').textContent=fmt(G.best.score);$('#tWave').textContent=META.bestDepth;$('#tRuns').textContent=META.runs;
var pow=0;for(var k in META.perm)pow+=META.perm[k];
$('#metaLine').textContent='Фрагментов: '+META.frag+' · Вечных улучшений: '+pow+' · Модулей открыто: '+META.unlocked.length+'/'+LOCKED.length}
function saveBest(){var rec=G.score>G.best.score;if(rec){G.best={score:G.score,wave:G.wave};store.set('best',G.best)}
if(G.wave>META.bestDepth)META.bestDepth=G.wave;saveMeta();syncBest();return rec}
function bankFrags(){META.runs++;syncFrags();saveMeta()}
function statsHTML(){var acc=G.st.shots?Math.round(G.st.hits/G.st.shots*100):0,m=Math.floor(G.st.time/60),s=Math.floor(G.st.time%60),mods=0,L=localPlayer().lvl;for(var k in L)mods+=L[k];
return[['УРОВЕНЬ',G.wave,''],['СЧЁТ',fmt(G.score),'g'],['УБИЙСТВ',G.kills,'m'],['ТОЧНОСТЬ',acc+'%','a'],['МОДУЛЕЙ',mods,''],['ВРЕМЯ',m+':'+(s<10?'0':'')+s,'g']].map(function(x){return '<div class="stat '+x[2]+'"><s>'+x[0]+'</s><b>'+x[1]+'</b></div>'}).join('')}
function toggleSound(){A.init();A.setOn(!A.on);A.resume();syncSound();if(A.on)A.tone(660,.1,'square',.08,1.3)}
function syncSound(){var b=$('#bSound');b.classList.toggle('off',!A.on);b.textContent=A.on?'♪':'x'}
function setTheme(k){if(!THEMES[k])return;themeKey=k;THEME=THEMES[k];store.set('theme',k);
var root=document.documentElement;for(var v in THEME.css)root.style.setProperty(v,THEME.css[v]);
applyThemePal();buildSprites();floorCanvas=makeFloor(AR.w,AR.h);if(ctx)initBackground(ctx);syncTheme();recalc()}
function syncTheme(){document.querySelectorAll('[data-theme]').forEach(function(p){p.classList.toggle('on',p.getAttribute('data-theme')===themeKey)})}
function buildThemeButtons(){var el=$('#themePills');Object.keys(THEMES).forEach(function(k){var b=document.createElement('button');b.className='pill';b.type='button';b.setAttribute('data-theme',k);b.textContent=THEMES[k].n;
b.addEventListener('click',function(){setTheme(k);A.init();A.tone(520,.07,'square',.06,1.3)});el.appendChild(b)});syncTheme();
var bt=$('#bloomToggle');bt.classList.toggle('on',bloomOn);bt.textContent='СВЕЧЕНИЕ: '+(bloomOn?'ВКЛ':'ВЫКЛ');
bt.addEventListener('click',function(){bloomOn=!bloomOn;store.set('bloom',bloomOn);bt.classList.toggle('on',bloomOn);bt.textContent='СВЕЧЕНИЕ: '+(bloomOn?'ВКЛ':'ВЫКЛ');A.init();A.tone(bloomOn?660:330,.07,'square',.06,1.2)})}
function buildKeys(){var K=isTouch?[['ЛЕВО','ход · 2×тап рывок'],['ПРАВО','прицел · 2×тап оружие'],['КНОПКИ','рывок и оружие'],['УДЕРЖАНИЕ','рывок 1.5с = гипер'],['ГЕЙМПАД','стики + A/X']]:
[['W A S D','движение'],['МЫШЬ','прицел'],['ПРОБЕЛ','рывок · 1.5с гипер'],['ЛКМ','оружие'],['SHIFT','точный ход'],['P / R','пауза / заново']];
['#keys1','#keys2'].forEach(function(sel){var el=$(sel);el.innerHTML='';K.forEach(function(k){var d=document.createElement('div');d.className='key';d.innerHTML='<kbd>'+k[0]+'</kbd><span>'+k[1]+'</span>';el.appendChild(d)})})}
var hudT=0,lScore=-1,lShards=-1,lFrags=-1;
function hud(dt){hudT+=dt;var p=localPlayer(),st=p.stats||computeStats(p.lvl);var hf=clamp(p.hp/p.max,0,1);
$('#hpFill').style.transform='scaleX('+hf+')';$('#hpBar').classList.toggle('low',hf<.34);$('#stage').classList.toggle('low',G.state==='play'&&hf<.3);
var dp=p.dashCd<=0?1:1-p.dashCd/st.dashCd;$('#dashFill').style.transform='scaleX('+dp+')';
$('#shBar').style.display=st.shieldMax?'block':'none';if(st.shieldMax)$('#shFill').style.transform='scaleX('+clamp(p.shield/st.shieldMax,0,1)+')';
$('#rkBar').style.display=st.weapon?'block':'none';if(st.weapon)$('#rkFill').style.transform='scaleX('+(st.weaponCdMax?1-p.weaponCd/st.weaponCdMax:0)+')';
$('#comboFill').style.transform='scaleX('+clamp(G.comboT/2.4,0,1)+')';$('#comboBox').classList.toggle('hot',G.combo>=8);
if(hudT>.1){hudT=0;$('#hpTxt').textContent=Math.ceil(p.hp);$('#comboTxt').textContent='x'+G.mult.toFixed(1);
if(G.score!==lScore){lScore=G.score;$('#cScore').textContent=fmt(G.score)}
if(G.shards!==lShards){lShards=G.shards;$('#cShards').textContent=G.shards}
if(G.frags!==lFrags){lFrags=G.frags;$('#cFrags').textContent=G.frags}}}
function initButtons(){$('#bStart').addEventListener('click',newRun);$('#bSound').addEventListener('click',toggleSound);
$('#bPause').addEventListener('click',function(){if(G.state==='play')pause();else if(G.state==='pause')resume()});
$('#bRestart').addEventListener('click',newRun);$('#bResume').addEventListener('click',resume);$('#bRestart2').addEventListener('click',newRun);
$('#bMenu2').addEventListener('click',toMenu);$('#bAgain').addEventListener('click',newRun);$('#bMenu').addEventListener('click',toMenu);
$('#bAgain2').addEventListener('click',newRun);$('#bMenu3').addEventListener('click',toMenu);
$('#mpHost').addEventListener('click',hostGame);$('#mpJoin').addEventListener('click',joinGame)}
var cv,ctx;
function initGame(){cv=$('#cv');ctx=cv.getContext('2d',{alpha:false});setTheme(themeKey);resize();
P.x=AR.w/2;P.y=AR.h/2;centerCam(true);recalc();P.hp=P.max;syncSound();syncBest();$('#cWave').textContent='—';
initBackground(ctx);setupBloom();initInput(cv);initButtons();initShopButtons();buildThemeButtons();buildKeys();requestAnimationFrame(frame)}
function resize(){var sw=window.innerWidth,sh=window.innerHeight,scale=clamp(Math.round(Math.min(sw,sh)/240),2,5),w=Math.ceil(sw/scale),h=Math.ceil(sh/scale);
cv.width=w;cv.height=h;cv.style.width=w*scale+'px';cv.style.height=h*scale+'px';cv.SCALE=scale;
ctx=cv.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
var topPx=$('#top').offsetHeight||46,botPx=$('#hud').offsetHeight||90,ti=Math.ceil(topPx/scale)+3,bi=Math.ceil(botPx/scale)+3;
W=w;H=h;SCALE=scale;VIEW.x=0;VIEW.y=ti;VIEW.w=w;VIEW.h=Math.max(60,h-ti-bi);initBackground(ctx);setupBloom();centerCam(true)}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',function(){setTimeout(resize,250)});
function centerCam(snap){var p=localPlayer();var tx=clamp(p.x-(VIEW.x+VIEW.w/2),0,Math.max(0,AR.w-W)),ty=clamp(p.y-(VIEW.y+VIEW.h/2),0,Math.max(0,AR.h-H));if(snap){CAM.x=tx;CAM.y=ty}}
function updateCam(dt){var p=localPlayer();var tx=clamp(p.x-(VIEW.x+VIEW.w/2),0,Math.max(0,AR.w-W)),ty=clamp(p.y-(VIEW.y+VIEW.h/2),0,Math.max(0,AR.h-H));var k=1-Math.exp(-8*dt);CAM.x+=(tx-CAM.x)*k;CAM.y+=(ty-CAM.y)*k}
function resetPlayer(p,x,y){p.x=x;p.y=y;p.vx=0;p.vy=0;p.inv=1.2;p.dashCd=0;p.dashT=0;p.fireT=0;p.noHit=0;p.shield=0;p.shieldT=0;p.weaponCd=0;p.beamT=0;p.beamChain=[];p.hyperCd=0;p.dashHold=0;p.socioSpin=0;p.lvl={};p.dual=false;p.pickPhase=0;p.offer=[];p.ready=false;p.input={mx:0,my:0,aim:0,dash:false,weapon:false,focus:false,held:false}}
function newRun(){if(NET.mode==='guest')return;A.init();A.resume();
G.enemies=[];G.bul=[];G.ebul=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];G.parts=[];G.drops=[];G.floats=[];G.rings=[];G.ghost=[];G.queue=[];
G.score=0;G.shards=0;G.frags=META.frag;G.kills=0;G.combo=0;G.comboT=0;G.mult=1;G.wave=1;G.boss=null;G.shake=0;G.flash=0;G.slow=0;G.st={shots:0,hits:0,time:0};
G.portal=null;G.travel=false;G.travelT=0;G.travelDone=false;G.menuOpened=false;G.postT=0;G.pendingNode=null;G.lootMult=1;G.event=null;G.lastBossKind=null;
setArena(640,480);genMap();
PL=NET.connected?[P,P2]:[P];resetPlayer(P,AR.w/2-10,AR.h/2);if(PL.length>1)resetPlayer(P2,AR.w/2+10,AR.h/2);
recalc();for(var i=0;i<PL.length;i++)PL[i].hp=PL[i].max;centerCam(true);$('#bossbar').classList.remove('on');
var first=G.map[0][0];startLevel(first);syncBest();if(NET.mode==='host')netSend({t:'start'})}
function pause(){if(G.state!=='play'||NET.mode==='guest')return;setState('pause')}
function resume(){if(G.state!=='pause'||NET.mode==='guest')return;setState('play');A.resume()}
function toMenu(){setState('title');G.enemies=[];G.bul=[];G.ebul=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];G.drops=[];G.queue=[];G.boss=null;G.portal=null;$('#bossbar').classList.remove('on');syncBest()}
function gameOver(){setState('over');A.over();G.slow=1;shake(8);flash(.5,'#ff4d4d');part(P.x,P.y,'#ff4d4d',46,150,.9,2);ring(P.x,P.y,4,60,'#ff4d4d',.8);
bankFrags();var rec=saveBest();$('#overRec').innerHTML=rec?'<span class="rec">НОВЫЙ РЕКОРД</span>':'';
$('#overSub').textContent='Уровень '+G.wave+' · '+G.kills+' врагов · фрагменты сохранены';$('#overStats').innerHTML=statsHTML();
if(NET.mode==='host')netSend({t:'over'})}
function winRun(){setState('win');A.win();flash(.35,'#9dff3c');bankFrags();var rec=saveBest();
$('#winRec').innerHTML=rec?'<span class="rec">НОВЫЙ РЕКОРД</span>':'';$('#winStats').innerHTML=statsHTML();
if(NET.mode==='host')netSend({t:'win'})}
var last=performance.now(),acc=0,meteorT=0;
function onBeat(){if(G.state==='pause')return;G.beat++;G.beats.push({r:3,a:.55});
var heat=G.state==='play'?clamp(G.enemies.length/12+(G.boss?.5:0)+G.wave/30,0,1):.05;A.beat(G.beat,heat);
if(G.state==='play'&&P.hp/P.max<.3&&G.beat%2===0)A.tone(70,.12,'square',.12,.6)}
function frame(now){var raw=Math.min(.05,(now-last)/1000);last=now;pollGamepad();
dashHeld=!!keys.Space||GP.dashHeld||touchDashHeld||mouseRightHeld;
if(GP.pause){if(G.state==='play')pause();else if(G.state==='pause')resume()}
updateVisual(raw);G.beatT+=raw;var guard=0;while(G.beatT>=.4&&guard++<4){G.beatT-=.4;onBeat()}
if(G.travel){G.travelT+=raw;
if(!G.menuOpened&&G.travelT>=0.8){G.menuOpened=true;openUp();if(NET.mode==='host')netSend({t:'up'})}
if(G.travelDone){G.postT+=raw;if(G.postT>=1){G.travel=false;startLevel(G.pendingNode)}}}
if(NET.mode==='guest'){if(NET.connected&&now-NET.lastSend>33){NET.lastSend=now;var mv=moveVecLocal(),aim=localAim(P2);
netSend({t:'input',mx:mv.x,my:mv.y,aim:aim,focus:!!(keys.ShiftLeft||keys.ShiftRight),dash:LI.dash||GP.dash,weapon:LI.weapon||GP.weapon,held:dashHeld});
LI.dash=false;LI.weapon=false;P2.input.mx=mv.x;P2.input.my=mv.y;P2.input.aim=aim;P2.input.held=dashHeld}
guestWorld(now);predictGuest(raw);updateCam(raw);render(ctx);applyBloom(ctx);hud(raw);requestAnimationFrame(frame);return}
var scale=G.state==='play'?(G.slow>0?.4:1):(G.state==='title'?.6:(G.state==='over'||G.state==='win'||G.state==='clear'?.5:.1));
acc+=raw*scale;var steps=0;while(acc>=STEP&&steps<5){update(STEP);acc-=STEP;steps++}if(acc>STEP*5)acc=0;
if(NET.mode==='host'&&NET.connected&&now-NET.lastState>33){NET.lastState=now;netSend(snapshot())}
render(ctx);applyBloom(ctx);hud(raw);requestAnimationFrame(frame)}
function update(dt){G.t+=dt;G.shake=Math.max(0,G.shake-dt*22);G.flash=Math.max(0,G.flash-dt*2.2);G.slow=Math.max(0,G.slow-dt);updateEffects(dt);
if(G.state!=='play')return;G.st.time+=dt;G.waveT+=dt;
if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0){G.combo=0;G.mult=1}}
if(G.event==='meteor'){meteorT-=dt;if(meteorT<=0){meteorT=1.2;var p=nearestPlayer(rand(AR.x,AR.x+AR.w),rand(AR.y,AR.y+AR.h));spawnZone(p.x+rand(-40,40),p.y+rand(-40,40),26,.7,1,14*D.dmg*dmgScale(),'#ffb020')}}
if(G.portal){for(var i=0;i<PL.length;i++){var p=PL[i];if(p.hp>0&&hyp(p.x-G.portal.x,p.y-G.portal.y)<G.portal.r+p.r){enterPortal();break}}}
updateSpawns();for(i=0;i<PL.length;i++)if(PL[i].hp>0)updatePlayer(PL[i],dt);
updateBullets(dt);updateRockets(dt);updateHazards(dt);updateEnemies(dt);updateEnemyBullets(dt);updateDrops(dt);updateCam(dt);
if(G.active&&!G.queue.length&&!G.enemies.length&&!G.portal)waveClear()}
try{initGame();window.__pulsarReady=true}catch(e){if(window.__boot)window.__boot('INIT: '+(e&&e.message||e))}
})();
