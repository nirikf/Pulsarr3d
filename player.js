'use strict';
var WEAPON_KEYS=['rocket','wave','beam'],MON_DIV=1.6,MON_BEAM=.62;
function monsterWeapons(p){var out=[];for(var i=0;i<WEAPON_KEYS.length;i++){var k=WEAPON_KEYS[i];if((p.lvl[k]||0)>0)out.push(k)}return out}
function activeWeaponKey(p){var st=p.stats;if(!st)return null;
if(st.multiWeapon){var w=monsterWeapons(p);if(!w.length)return null;return w[clamp(p.wIdx,0,w.length-1)]}
return st.weapon||null}
function weaponCdOf(p,k){var st=p.stats;if(!st)return 0;return st.multiWeapon?(p.wCd[k]||0):p.weaponCd}
function weaponCdMax(p,k){var st=p.stats;if(!st)return 1;
if(!st.multiWeapon)return st.weaponCdMax||1;
var L=p.lvl[k]||1;
if(k==='rocket')return L>=3?3.5:5;
if(k==='wave')return 5;
return 7}
function weaponPower(p,k){var L=p.lvl[k]||1;
if(k==='rocket')return (p.lvl.hydra?.6:1)*(50+(L-1)*50);
if(k==='wave')return p.lvl.density?460:([45,70,115][L-1]||45);
return 40+(L-1)*30}
function cycleWeapon(p,dir){var st=p.stats;if(!st||!st.multiWeapon)return;
var w=monsterWeapons(p);if(w.length<2)return;
p.wIdx=(clamp(p.wIdx,0,w.length-1)+(dir||1)+w.length)%w.length;
A.swap();float(p.x,p.y-30,(upByKey(w[p.wIdx])||{n:''}).n,'#ffb020',1);HAP.tap()}
function computeStats(L,ship,mm){var o={};ship=ship||'std';mm=mm||META;o.ship=ship;
o.rate=4.6*Math.pow(1.18,L.rate||0)*Math.pow(1.14,L.kir||0)*(1+.05*(mm.perm.rate||0));
o.dmg=10*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));o.count=1+(L.fan||0);
o.spread=.11*(L.fan||0)+.03;o.pierce=L.pierce||0;
o.speed=74*Math.pow(1.13,L.speed||0)*(1+.04*(mm.perm.spd||0));
var dl=L.dash||0;o.dashCd=(dl>=4?0:.91*Math.pow(.7,dl))*Math.pow(.94,mm.perm.dash||0);o.dashDmg=18+9*dl;
o.magnet=34*Math.pow(1.7,L.magnet||0);o.vamp=.04*(L.vamp||0);o.regen=1.6*(L.regen||0);
o.drones=L.drone||0;o.bs=200*Math.pow(1.18,L.kir||0);
o.shieldMax=25*(L.shield||0)+10*(mm.perm.shield||0);o.shieldRegen=6+2*(L.shield||0);
o.healDrone=L.healdrone||0;o.healRate=.7*o.healDrone*(1+o.healDrone*.3);
var hl=L.hyper||0;o.hyper=hl;o.hyperDmg=hl?50+(hl-1)*25:0;o.hyperCd=hl?5-(hl-1):0;o.hyperGold=!!L.hyperGold;
var sl=L.socio||0;o.socio=sl;o.socioDps=10*sl;o.socioSpinDps=120*sl;
var al=L.aegis||0;o.aegis=al;o.aegisN=al?2+al:0;o.aegisR=24+2*Math.max(0,al-1);o.aegisDmg=12+7*Math.max(0,al-1);
var se=L.seeder||0;o.seeder=se;o.seedN=se?2+se+(ship==='bomber'?2:0):0;
o.seedDmg=se?55+15*(se-1):0;o.seedRad=(34+2*Math.max(0,se-1))*(ship==='bomber'?1.25:1);
var ph=L.phase||0;o.phase=ph;o.phLife=ph?1+.4*(ph-1):0;o.phMul=ph?.4+.15*(ph-1):0;if(ph)o.dashCd*=1.15;
var te=L.tesla||0;o.tesla=te;o.teslaR=te?58+8*(te-1):0;
o.teslaDps=te?(9+5*(te-1))*(1+.5*(Math.pow(1.25,L.cal||0)-1)):0;o.teslaSlow=te?1-(.20+.06*(te-1)):1;
var sEdge=L.scytheEdge||0,pDrive=L.phaseDrive||0,sCore=L.swarmCore||0,sChain=L.stormChain||0,fnd=L.foundry||0,cCore=L.chronoCore||0;
o.droneMul=.85;o.droneCd=.5;o.dronePierce=0;o.dashSpeedMul=1;o.invisBoost=2;o.maxTurrets=3;o.turretLife=14;
o.multiWeapon=false;o.size=1;o.tentacles=0;
var wp=L.weapon,wl=wp?(L[wp]||0):0;o.weapon=wp;o.weaponLvl=wl;
if(wp==='rocket'){o.weaponCdMax=wl>=3?3.5:5;o.weaponDmg=(L.hydra?.6:1)*(50+(wl-1)*50)}
else if(wp==='wave'){o.weaponCdMax=5;o.weaponDmg=L.density?460:([45,70,115][wl-1]||45);o.weaponRadius=L.density?150:100}
else if(wp==='beam'){o.weaponCdMax=7;o.weaponDmg=40+(wl-1)*30;o.beamDur=3}
else{o.weaponCdMax=0;o.weaponDmg=0}
o.hydra=!!L.hydra;o.density=!!L.density;o.reflect=!!L.reflect;
o.fireMode='bullet';o.bulletLife=1.2;o.hpMod=0;o.coneDps=0;o.scytheDmg=0;o.coneR=0;o.coneHalf=.61;
o.scytheR=46;o.scytheHalf=1.05;o.bleedDps=0;o.zapStun=.05;o.electroLvl=0;o.electroDps=0;o.weaponRadius=100;o.beamDur=3;
if(ship==='sniper'){o.speed*=1.4;o.dashCd*=1.5;o.fireMode='sniper';o.rate=o.rate/3.5;
o.dmg=35*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));o.pierce=Math.max(2,o.pierce);o.bulletLife=1.6;o.count=1;o.bs*=7}
else if(ship==='bomber'){o.fireMode='rocket';o.rate=o.rate/3;o.dmg=30*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));o.dashCd*=1.2}
else if(ship==='psy'){o.fireMode='shotgun';o.speed*=2;o.dashCd*=.5;o.count=Math.max(6,o.count+5);o.spread=.16;o.bulletLife=.34;o.dmg*=.6}
else if(ship==='phantom'){o.speed*=1.25;o.dmg*=.8;o.hpMod=-10;o.invisDash=1.2+.3*pDrive;o.dashSpeedMul=1+.35*pDrive;o.invisBoost=2+.4*pDrive}
else if(ship==='forge'){o.rate*=.5;o.hpMod=30;o.turretDash=true;o.maxTurrets=3+fnd;o.turretLife=14+2*fnd}
else if(ship==='reaper'){o.fireMode='scythe';o.rate=1.8;o.scytheDmg=22*Math.pow(1.25,L.cal||0)*(1+.06*(mm.perm.dmg||0));
o.scytheR=46+12*sEdge;o.scytheHalf=1.05+.15*sEdge;o.bleedDps=o.scytheDmg*.28;o.vamp=Math.max(o.vamp,.08);o.hpMod=40;o.speed*=.85;o.count=1}
else if(ship==='chronos'){o.weapon='chrono';o.chronoCd=12-2.5*cCore;o.weaponCdMax=o.chronoCd;o.weaponDmg=0;
o.chronoDur=2.5+.25*cCore;o.chronoGlobal=cCore>=3;o.chronoR=o.chronoGlobal?0:150+35*cCore}
else if(ship==='legion'){o.dmg*=.65;o.hpMod=-15;o.droneMul=1;o.droneCd=.45;o.dronePierce=1;o.drones=Math.min(5,(L.drone||0)+sCore)}
else if(ship==='groza'){o.fireMode='cone';o.coneDps=26*(1+.5*(Math.pow(1.25,L.cal||0)-1))*(1+.06*(mm.perm.dmg||0));
o.coneR=95+12*sChain;o.coneHalf=.61+.08*sChain;o.speed*=1.1;o.count=0;o.zapStun=.05+.02*sChain;o.electroLvl=sChain;o.electroDps=sChain?8+4*sChain:0}
else if(ship==='monster'){o.fireMode='monster';o.size=3;o.tentacles=5;o.multiWeapon=true;o.weapon=null;o.weaponCdMax=0;
o.dashSpeedMul=1.75;o.dashDmg=Math.round(o.dashDmg*2.2);o.hpMod=20;o.count=Math.max(1,o.count)}
o.teslaElectro=0;
if(o.tesla){o.teslaElectro=Math.max(o.electroLvl,ship==='groza'?1:0);if(o.teslaElectro&&!o.electroDps)o.electroDps=8+4*o.teslaElectro}
if(CHEAT.god){o.dmg=1000;o.weaponDmg=1000;o.dashDmg=1000;o.hyperDmg=1000;o.socioDps=1000;o.socioSpinDps=1000;o.coneDps=1000;o.scytheDmg=1000;o.teslaDps=1000}
return o}
function renderMods(){var m=$('#mods');if(!m)return;m.innerHTML='';var L=viewPlayer().lvl;
UPS.forEach(function(u){var l=L[u.k]||0;if(!l)return;
var ic=iconCanvas(u.k,u.col,2);ic.style.width='20px';ic.style.height='20px';ic.title=u.n+' ур.'+l;m.appendChild(ic)})}
function recalcPlayer(p){p.stats=computeStats(p.lvl,p.ship,metaOf(p));
p.max=Math.max(30,D.base+25*(p.lvl.armor||0)+15*(metaOf(p).perm.hp||0)+(p.stats.hpMod||0));
p.r=p.stats.size>1?9:5;
p.shield=Math.min(p.shield,p.stats.shieldMax);
while(p.dT.length<p.stats.drones)p.dT.push(rand(0,.6));p.dT.length=p.stats.drones;
var mw=monsterWeapons(p);if(p.wIdx>=mw.length)p.wIdx=0;
if(p===viewPlayer())renderMods()}
function recalc(){for(var i=0;i<PL.length;i++)recalcPlayer(PL[i])}
function nearestEnemy(x,y){var b=null,bd=1e9;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead)continue;
var d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;b=e}}return b}
function nearestEnemyExcluding(x,y,hit){var b=null,bd=1e9;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||hit.indexOf(e.id)>=0)continue;
var d=(e.x-x)*(e.x-x)+(e.y-y)*(e.y-y);if(d<bd){bd=d;b=e}}return b}
function aimPointFor(p,useMouse){
if(useMouse&&G.t-mouseT<4){var w=screenToWorld(mx,my);return{x:w.x,y:w.y}}
var e=nearestEnemy(p.x,p.y);if(e)return{x:e.x,y:e.y};
var cr=G.container;if(cr&&!cr.dead)return{x:cr.x,y:cr.y};
return{x:p.x+Math.cos(p.aim)*260,y:p.y+Math.sin(p.aim)*260}}
function autoAim(p){var t=aimPointFor(p,false);return Math.atan2(t.y-p.y,t.x-p.x)}
function readInput(p,dev){
var pad=dev===1?GP:GP2,o={mx:0,my:0,aim:p.aim,dash:false,weapon:false,swap:false,held:false,focus:false,mouse:false};
var liD=false,liW=false,liS=false;
if(dev===1){liD=LI.dash;liW=LI.weapon;liS=LI.swap;LI.dash=false;LI.weapon=false;LI.swap=false}
if(pad.active){var mv=padMove(pad);o.mx=mv.x;o.my=mv.y;o.aim=pad.aimActive?pad.aim:autoAim(p);
o.dash=pad.dash||liD;o.weapon=pad.weapon||liW;o.swap=pad.swap||liS;o.held=pad.dashHeld||(dev===1&&dashHeld);
if(dev===1&&sticks.move.m>.14){o.mx=sticks.move.dx;o.my=sticks.move.dy}
if(dev===1&&sticks.aim.m>.2)o.aim=Math.atan2(sticks.aim.dy,sticks.aim.dx);
return o}
if(dev===1){var x=0,y=0;
if(keys.KeyA)x-=1;if(keys.KeyD)x+=1;if(keys.KeyW)y-=1;if(keys.KeyS)y+=1;
if(!isLocal()){if(keys.ArrowLeft)x-=1;if(keys.ArrowRight)x+=1;if(keys.ArrowUp)y-=1;if(keys.ArrowDown)y+=1}
if(sticks.move.m>.14){x+=sticks.move.dx;y+=sticks.move.dy}
var l=hyp(x,y);if(l>1){x/=l;y/=l}
o.mx=x;o.my=y;o.focus=!!(keys.ShiftLeft||keys.ShiftRight);o.swap=liS;
if(sticks.aim.m>.2)o.aim=Math.atan2(sticks.aim.dy,sticks.aim.dx);
else if(!isTouch&&G.t-mouseT<4){var w=screenToWorld(mx,my);o.aim=Math.atan2(w.y-p.y,w.x-p.x);o.mouse=true}
else o.aim=autoAim(p);
o.dash=liD;o.weapon=liW;o.held=dashHeld;return o}
var x2=0,y2=0;
if(keys.ArrowLeft)x2-=1;if(keys.ArrowRight)x2+=1;if(keys.ArrowUp)y2-=1;if(keys.ArrowDown)y2+=1;
var l2=hyp(x2,y2);if(l2>1){x2/=l2;y2/=l2}
o.mx=x2;o.my=y2;o.aim=autoAim(p);
o.dash=K2.dash;o.weapon=K2.weapon;o.swap=K2.swap;o.held=!!keys.Enter;
K2.dash=false;K2.weapon=false;K2.swap=false;return o}
function feedInput(p,dev){var ri=readInput(p,dev);
ri.dash=ri.dash||p.input.dash;ri.weapon=ri.weapon||p.input.weapon;ri.swap=ri.swap||p.input.swap;
p.input=ri;return ri}
function triggerHyper(p){var st=p.stats;if(!st.hyper||p.hyperCd>0||p.jammed)return;
p.hyperCd=st.hyperCd;p.dashHold=0;p.socioSpin=1.16;
var hit=[],count=st.hyperGold?3:1;
for(var c=0;c<count;c++){var e=nearestEnemyExcluding(p.x,p.y,hit);if(!e)break;hit.push(e.id);
G.ghost.push({x:p.x,y:p.y,a:p.aim,l:.3,m:.3,col:p.col,ship:p.ship,id:p.id});
p.x=clamp(e.x,AR.x+p.r,AR.x+AR.w-p.r);p.y=clamp(e.y,AR.y+p.r,AR.y+AR.h-p.r);
damageEnemy(e,st.hyperDmg,true,e.x,e.y,0,true,p);ring(e.x,e.y,4,30,'#ff2fb0',.4);part(e.x,e.y,'#ff2fb0',14,110,.4,1)}
p.inv=Math.max(p.inv,.45);A.dash();shake(4)}
function updateSocio(p,dt,st){if(!st.socio)return;p.socioSpin=Math.max(0,p.socioSpin-dt);
var spin=p.socioSpin>0,speed=spin?16:2.2,R=22*st.size,bladeR=spin?8:6,base=G.t*speed,dps=spin?st.socioSpinDps:st.socioDps;
for(var b=0;b<2;b++){var a=base+b*Math.PI,bx=p.x+Math.cos(a)*R,by=p.y+Math.sin(a)*R;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.invuln||twinsShielded(e))continue;
if(hyp(e.x-bx,e.y-by)<e.r*(e.sc||1)+bladeR){e.hp-=dps*dt;e.fr=.05;if(e.hp<=0)killEnemy(e)}}}}
function updateTesla(p,dt,st){if(!st.tesla)return;var any=false;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.invuln||twinsShielded(e))continue;
if(hyp(e.x-p.x,e.y-p.y)>st.teslaR)continue;any=true;
e.slowT=.2;e.slowMul=st.teslaSlow;e.hp-=st.teslaDps*dt;e.fr=Math.max(e.fr,.04);
if(st.teslaElectro>0)applyElectro(e,8+4*st.teslaElectro,p.id,st.teslaElectro);
if(e.hp<=0)killEnemy(e)}
if(any)A.zap()}
function updateCone(p,dt,st){var any=false;
for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.invuln||twinsShielded(e))continue;
if(hyp(e.x-p.x,e.y-p.y)>st.coneR)continue;
if(Math.abs(angDiff(p.aim,Math.atan2(e.y-p.y,e.x-p.x)))>st.coneHalf)continue;
any=true;e.hp-=st.coneDps*dt;e.fr=Math.max(e.fr,.04);e.zapTick-=dt;
if(e.zapTick<=0){e.zapTick=.3;
if(Math.random()<st.zapStun&&e.stunT<=0&&!e.boss){e.stunT=.7;A.zapStun();ring(e.x,e.y,3,16,'#ffb020',.3);float(e.x,e.y-e.r-8,'СТАН','#ffb020',1)}
if(st.electroLvl>0)applyElectro(e,st.electroDps,p.id,st.electroLvl)}
if(e.hp<=0)killEnemy(e)}
if(any)A.zap()}
function updateAegisOrbit(p,dt,st){if(!st||!st.aegis)return;
p.aegisA+=dt*(p.dashT>0?7:2.4);
var target=(p.dashT>0||p.aegisOut>0)?52:st.aegisR;
p.aegisR+=(target-p.aegisR)*Math.min(1,dt*(target>p.aegisR?12:5));
if(p.aegisOut>0)p.aegisOut-=dt;
var out=p.dashT>0||p.aegisOut>0;
for(var s=0;s<st.aegisN;s++){var a=p.aegisA+s*TAU/st.aegisN,x=p.x+Math.cos(a)*p.aegisR,y=p.y+Math.sin(a)*p.aegisR;
for(var i=G.erock.length-1;i>=0;i--){var r=G.erock[i];
if(hyp(r.x-x,r.y-y)<8){part(x,y,'#b8fbff',8,70,.3,1);ring(x,y,2,12,'#b8fbff',.25);A.shieldHit();G.erock.splice(i,1)}}
if(!out)continue;
for(var j=0;j<G.enemies.length;j++){var e=G.enemies[j];if(e.dead||e.aegisHit===p.id+1)continue;
if(hyp(e.x-x,e.y-y)<e.r*(e.sc||1)+7){e.aegisHit=p.id+1;damageEnemy(e,st.aegisDmg,true,x,y,a,true,p)}}}}
function reflectBullets(p){for(var i=G.ebul.length-1;i>=0;i--){var eb=G.ebul[i];
if(hyp(eb.x-p.x,eb.y-p.y)<p.r+22){var tg=nearestEnemy(p.x,p.y),a=tg?Math.atan2(tg.y-p.y,tg.x-p.x):p.aim;
fireBullet(p.x,p.y,a,240,Math.max(12,eb.dmg*1.5),1,false,p.id,1.4);
part(eb.x,eb.y,'#a86bff',6,70,.25,1);G.ebul.splice(i,1);A.shieldHit()}}}
function updatePlayer(p,dt){if(p.hp<=0)return;var st=p.stats;if(!st)return;var inp=p.input;
p.stun=Math.max(0,p.stun-dt);if(p.chill>0)p.chill-=dt;
if(p.swingT>0)p.swingT-=dt;
if(p.plateT>0){p.plateT-=dt;p.plates=Math.min(1,p.plates+dt*7)}else p.plates=Math.max(0,p.plates-dt*4);
if(p.invis>0)p.invis-=dt;else{p.lastSeen.x=p.x;p.lastSeen.y=p.y;p.invisShot=false}
if(p.trapped){var w=null;for(var q=0;q<G.wells.length;q++)if(G.wells[q].id===p.trapped){w=G.wells[q];break}if(!w)p.trapped=0}
p.jammed=false;
for(var j0=0;j0<G.enemies.length;j0++){var jm=G.enemies[j0];
if(jm.type==='jammer'&&!jm.dead&&hyp(jm.x-p.x,jm.y-p.y)<90){p.jammed=true;break}}
if(p.jammed)A.jam();
var ap=aimPointFor(p,inp.mouse);p.aimX=ap.x;p.aimY=ap.y;
if(st.fireMode==='monster')p.aim=Math.atan2(ap.y-p.y,ap.x-p.x);else p.aim=inp.aim;
p.focus=inp.focus;p.inv=Math.max(0,p.inv-dt);p.hurtT=Math.max(0,p.hurtT-dt);p.dashCd=Math.max(0,p.dashCd-dt);
if(!p.jammed){p.weaponCd=Math.max(0,p.weaponCd-dt);
for(var wk in p.wCd)p.wCd[wk]=Math.max(0,p.wCd[wk]-dt)}
p.hyperCd=Math.max(0,p.hyperCd-dt);p.shieldT=Math.max(0,p.shieldT-dt);p.noHit+=dt;
if(CHEAT.god){p.hp=p.max;p.inv=Math.max(p.inv,.2);p.stun=0;p.trapped=0;p.jammed=false}
if(st.regen&&p.noHit>3)healPlayer(p,st.regen*dt);
if(st.shieldMax&&p.shieldT<=0)p.shield=Math.min(st.shieldMax,p.shield+st.shieldRegen*dt);
if(st.healRate)healPlayer(p,st.healRate*dt);
if(inp.held&&p.stun<=0&&!p.jammed)p.dashHold+=dt;else p.dashHold=0;
if(st.hyper&&p.dashHold>=1.5&&p.hyperCd<=0&&p.stun<=0&&!p.jammed)triggerHyper(p);
if(inp.swap){inp.swap=false;cycleWeapon(p,1)}
if(inp.dash){inp.dash=false;if(p.stun<=0&&!p.trapped)doDash(p)}
if(inp.weapon){inp.weapon=false;fireWeapon(p)}
if(p.dashT>0){p.dashT-=dt;var ds=280*(st.dashSpeedMul||1);p.vx=p.dx*ds;p.vy=p.dy*ds;
G.ghost.push({x:p.x,y:p.y,a:p.aim,l:.22,m:.22,col:p.col,ship:p.ship,id:p.id});
if(st.ship==='psy')reflectBullets(p);
if(!st.phase)for(var i=0;i<G.enemies.length;i++){var e=G.enemies[i];if(e.dead||e.dh)continue;
if(hyp(e.x-p.x,e.y-p.y)<e.r*(e.sc||1)+p.r+2){e.dh=true;damageEnemy(e,st.dashDmg,true,e.x,e.y,0,true,p);
var ka=Math.atan2(e.y-p.y,e.x-p.x);e.vx+=Math.cos(ka)*90;e.vy+=Math.sin(ka)*90}}}
else{for(i=0;i<G.enemies.length;i++){G.enemies[i].dh=false;G.enemies[i].aegisHit=0}
var sp=st.speed*(p.focus?.55:1)*(p.stun>0?.2:1)*(p.chill>0?.55:1),k=1-Math.exp(-20*dt);
var mxv=p.trapped?0:inp.mx,myv=p.trapped?0:inp.my;
p.vx+=(mxv*sp-p.vx)*k;p.vy+=(myv*sp-p.vy)*k}
p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=clamp(p.x,AR.x+p.r,AR.x+AR.w-p.r);p.y=clamp(p.y,AR.y+p.r,AR.y+AR.h-p.r);
updateSocio(p,dt,st);updateTesla(p,dt,st);updateAegisOrbit(p,dt,st);
if(st.fireMode==='cone'){p.coneT+=dt;updateCone(p,dt,st)}else p.coneT=0;
p.fireT-=dt;if(p.fireT<=0){p.fireT=
