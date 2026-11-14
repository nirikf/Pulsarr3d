import { TAU,hyp,rand,randi,pick,clamp,angDiff,dodgeCooldown } from '../constants.js';
import { G,P,AR } from '../state.js';
import { DIFF } from '../constants.js';
import { eShoot,spawnBeam,spawnZone,spawnShock } from './bullet.js';
import { makeEnemy } from './enemy.js';
import { hurtPlayer,killEnemy } from '../combat.js';
import { part,ring,flash,shake } from '../effects.js';
import { A } from '../audio.js';
import { SPR } from '../sprites.js';

const DODGE_TYPES={shooter:1,splitter:1,sniper:1,medic:1,emitter:1};
export function updateEnemies(dt){
 planShieldGroups();
 for(let i=0;i<G.enemies.length;i++){
  const e=G.enemies[i];if(e.dead)continue;
  e.t+=dt;e.fl=Math.max(0,e.fl-dt);e.hitT=Math.max(0,e.hitT-dt);e.shieldFl=Math.max(0,e.shieldFl-dt);
  const dx=P.x-e.x,dy=P.y-e.y,d=hyp(dx,dy)||1,ux=dx/d,uy=dy/d;
  if(e.boss)bossAI(e,dt,ux,uy,d);
  else if(e.type==='shooter')updateShooter(e,dt,d,ux,uy,dx,dy);
  else if(e.type==='tank')updateTank(e,dt,d,ux,uy,dx,dy);
  else if(e.type==='shielder')updateShielder(e,dt,d,ux,uy,dx,dy);
  else if(e.type==='sniper')updateSniper(e,dt,d,ux,uy);
  else if(e.type==='medic')updateMedic(e,dt,d,ux,uy);
  else if(e.type==='emitter')updateEmitter(e,dt,d,ux,uy);
  else updateWalker(e,dt,ux,uy);
  if(DODGE_TYPES[e.type])applyDodge(e,dt);
  e.x+=e.vx*dt;e.y+=e.vy*dt;
  e.x=clamp(e.x,AR.x+e.r,AR.x+AR.w-e.r);e.y=clamp(e.y,AR.y+e.r,AR.y+AR.h-e.r);
  if(d<e.r+P.r&&e.hitT<=0&&e.type!=='medic'&&e.type!=='emitter'){hurtPlayer(e.dmg*(e.st==='charge'?1.3:1));e.hitT=0.6;e.vx-=ux*70;e.vy-=uy*70;P.vx+=ux*50;P.vy+=uy*50}
 }
 for(let i=0;i<G.enemies.length;i++){
  const a1=G.enemies[i];if(a1.dead)continue;
  for(let j=i+1;j<G.enemies.length;j++){
   const b1=G.enemies[j];if(b1.dead)continue;
   const ddx=b1.x-a1.x,ddy=b1.y-a1.y,rr=a1.r+b1.r,d2=ddx*ddx+ddy*ddy;
   if(d2<rr*rr&&d2>0.01){const dd=Math.sqrt(d2),ff=(rr-dd)/dd*0.4;if(!a1.boss){a1.x-=ddx*ff;a1.y-=ddy*ff}if(!b1.boss){b1.x+=ddx*ff;b1.y+=ddy*ff}}
  }
 }
 G.enemies=G.enemies.filter(en=>!en.dead);
}

function planShieldGroups(){
 const groups=new Map(),snipers=[];
 for(const e of G.enemies){if(e.dead)continue;if(e.type==='sniper')snipers.push(e);if(e.type==='shielder'){const k=e.group!=null?e.group:'solo'+e.id;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}}
 const claimed=new Set();
 for(const mem of groups.values()){
  mem.sort((a,b)=>a.slot-b.slot);const n=mem.length;let cx=0,cy=0;for(const m of mem){cx+=m.x;cy+=m.y}cx/=n;cy/=n;
  let guard=null;if(mem[0].guardId!=null)guard=snipers.find(s=>s.id===mem[0].guardId)||null;
  if(!guard){let bd=1e9;for(const s of snipers){if(claimed.has(s.id))continue;const d=hyp(s.x-cx,s.y-cy);if(d<bd){bd=d;guard=s}}if(bd>300)guard=null}
  if(guard)claimed.add(guard.id);
  const dP=hyp(P.x-cx,P.y-cy),prev=mem[0].mode;let mode,ax=cx,ay=cy,ar=0;
  if(guard){mode='guard';ax=guard.x;ay=guard.y;ar=27}else if(n===1)mode='solo';else{const close=prev==='circle'?dP<96:dP<74;mode=close?'circle':'cluster';ar=24}
  const toP=Math.atan2(P.y-ay,P.x-ax),base=mode==='guard'?G.t*0.5:G.t*0.25;
  for(let i=0;i<n;i++){
   const m=mem[i];m.guardId=guard?guard.id:null;m.mode=mode;m.ax=ax;m.ay=ay;m.ar=ar;
   if(mode==='solo'){m.tx=P.x;m.ty=P.y;m.tface=toP}
   else if(mode==='cluster'){const off=(i-(n-1)/2)*14,px=-Math.sin(toP),py=Math.cos(toP);m.tx=ax+px*off+Math.cos(toP)*16;m.ty=ay+py*off+Math.sin(toP)*16;m.tface=toP}
   else{const a=base+i*TAU/n;m.tx=ax+Math.cos(a)*ar;m.ty=ay+Math.sin(a)*ar;m.tface=a}
  }
 }
}
function applyDodge(e,dt){
 if(G.wave<=5)return;
 e.dodgeCd-=dt;e.dodgeT-=dt;
 if(e.dodgeT>0){e.vx=e.vx*0.25+e.dvx;e.vy=e.vy*0.25+e.dvy;return}
 if(e.dodgeCd>0||!isFinite(e.dodgeCd))return;
 for(const bl of G.bul){
  const rx=e.x-bl.x,ry=e.y-bl.y,v2=bl.vx*bl.vx+bl.vy*bl.vy;if(v2<1)continue;
  const t=(rx*bl.vx+ry*bl.vy)/v2;if(t<0||t>0.55)continue;
  const cx=rx-bl.vx*t,cy=ry-bl.vy*t;if(cx*cx+cy*cy>(e.r+bl.r+7)**2)continue;
  const vl=Math.sqrt(v2),px=-bl.vy/vl,py=bl.vx/vl,side=(cx*px+cy*py)>=0?1:-1,sp=e.sp*1.9+65;
  e.dvx=px*side*sp;e.dvy=py*side*sp;e.dodgeT=0.22;e.dodgeCd=dodgeCooldown(G.wave)*rand(0.8,1.2);
  part(e.x,e.y,'#ffffff',2,40,0.15,1);return;
 }
}

function updateShooter(e,dt,d,ux,uy,dx,dy){let tx,ty;if(d<70){tx=-ux;ty=-uy}else if(d>110){tx=ux;ty=uy}else{tx=-uy;ty=ux}e.vx+=(tx*e.sp-e.vx)*Math.min(1,4*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,4*dt);e.cd-=dt;e.tel=e.cd<0.3?1:0;if(e.cd<=0){e.cd=rand(1.5,2.2)/DIFF[G.diff].sp;eShoot(e,Math.atan2(dy,dx),95,8*DIFF[G.diff].dmg,SPR.orbA);part(e.x,e.y,'#ffb020',3,50,0.2,1);A.tone(300,0.06,'square',0.04,0.6)}}
function updateTank(e,dt,d,ux,uy,dx,dy){if(e.st==='walk'){e.vx+=(ux*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(uy*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;if(e.cd<=0&&d<130){e.st='tel';e.cd=0.75;e.lock=Math.atan2(dy,dx)}}else if(e.st==='tel'){e.cd-=dt;e.tel=1;e.vx*=0.86;e.vy*=0.86;if(e.cd<=0){e.st='charge';e.cd=0.6;e.tel=0;A.tone(120,0.22,'sawtooth',0.09,1.8)}}else{e.cd-=dt;e.vx=Math.cos(e.lock)*130;e.vy=Math.sin(e.lock)*130;part(e.x,e.y,'#ff4d4d',1,35,0.25,1);if(e.cd<=0){e.st='walk';e.cd=rand(2.4,3.6)}}}
function updateShielder(e,dt,d,ux,uy,dx,dy){e.face+=angDiff(e.face,e.tface)*Math.min(1,1.6*dt);const tx=e.tx-e.x,ty=e.ty-e.y,td=hyp(tx,ty)||1,sp=Math.min(e.sp*1.9,td*5);e.vx+=((tx/td)*sp-e.vx)*Math.min(1,4*dt);e.vy+=((ty/td)*sp-e.vy)*Math.min(1,4*dt);e.cd-=dt;const ap=Math.atan2(dy,dx);if(e.cd<=0&&Math.abs(angDiff(e.face,ap))<0.9){e.cd=rand(1.8,2.4);eShoot(e,e.face,95,8*DIFF[G.diff].dmg,SPR.orbM);A.tone(280,0.06,'square',0.04,0.6)}}
function updateSniper(e,dt,d,ux,uy){let tx,ty;if(e.tel>0){tx=0;ty=0}else if(d<170){tx=-ux;ty=-uy}else if(d>230){tx=ux;ty=uy}else{tx=-uy;ty=ux}e.vx+=(tx*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;if(e.cd<=0.6&&e.tel===0){e.tel=1;e.lock=Math.atan2(P.y-e.y,P.x-e.x);A.tone(700,0.3,'sine',0.04,1.6)}if(e.cd<=0){e.cd=3;e.tel=0;eShoot(e,e.lock,2600,36*DIFF[G.diff].dmg,SPR.orbR);part(e.x,e.y,'#ff4d4d',6,90,0.25,1);A.tone(150,0.15,'sawtooth',0.1,0.4)}}
function updateMedic(e,dt,d,ux,uy){e.beam=null;if(e.hp<e.max*0.25)e.mode='boom';if(e.mode==='boom'){e.vx+=(ux*130-e.vx)*Math.min(1,6*dt);e.vy+=(uy*130-e.vy)*Math.min(1,6*dt);part(e.x,e.y,'#9dff3c',1,40,0.2,1);if(d<12){hurtPlayer(50);ring(e.x,e.y,4,44,'#9dff3c',0.5);part(e.x,e.y,'#9dff3c',30,130,0.6,2);flash(0.3,'#9dff3c');A.boom();killEnemy(e)}return}
 let target=null,bd=1e9;for(const o of G.enemies){if(o===e||o.dead||o.type==='medic'||o.hp>=o.max)continue;const dd=hyp(o.x-e.x,o.y-e.y);if(dd<bd){bd=dd;target=o}}
 if(target&&bd<110){e.beam={x:target.x,y:target.y};target.hp=Math.min(target.max,target.hp+14*dt);const tx=(target.x-e.x)/bd,ty=(target.y-e.y)/bd;e.vx+=(tx*20-e.vx)*Math.min(1,3*dt);e.vy+=(ty*20-e.vy)*Math.min(1,3*dt)}else{let tx,ty;if(d<110){tx=-ux;ty=-uy}else{tx=-uy;ty=ux}e.vx+=(tx*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,3*dt)}}
function updateEmitter(e,dt,d,ux,uy){let tx,ty;if(d<120){tx=-ux;ty=-uy}else if(d>170){tx=ux;ty=uy}else{tx=-uy;ty=ux}e.vx+=(tx*e.sp-e.vx)*Math.min(1,3*dt);e.vy+=(ty*e.sp-e.vy)*Math.min(1,3*dt);e.cd-=dt;e.tel=e.cd<0.7?1:0;if(e.cd<=0){e.cd=4.5;const n=G.wave>=18?8:4,base=rand(0,TAU);for(let i=0;i<n;i++)spawnBeam(e.x,e.y,base+i*TAU/n,0.35,1.3,10*DIFF[G.diff].dmg,240,2,'#22e6ff');A.laser()}}
function updateWalker(e,dt,ux,uy){const wob=(e.type==='splitter')?Math.sin(e.t*3)*0.45:0;const ax=ux*Math.cos(wob)-uy*Math.sin(wob),ay=ux*Math.sin(wob)+uy*Math.cos(wob);e.vx+=(ax*e.sp-e.vx)*Math.min(1,5*dt);e.vy+=(ay*e.sp-e.vy)*Math.min(1,5*dt)}

function bossAI(e,dt,ux,uy,d){
 const fr=e.hp/e.max;e.phase=fr>0.66?1:(fr>0.33?2:3);
 document.getElementById('bossPhase').textContent='ФАЗА '+e.phase;
 document.getElementById('bossFill').style.transform='scaleX('+clamp(fr,0,1)+')';
 e.shieldAng=(e.shieldAng||0)+dt*(e.bossKind==='prism'?1.1:0.3);
 if(e.st==='charge'){e.chargeT-=dt;e.vx=Math.cos(e.lock)*210;e.vy=Math.sin(e.lock)*210;part(e.x,e.y,e.col,2,50,0.3,1);if(e.chargeT<=0)e.st='';return}
 moveBoss(e,dt,ux,uy,d);
 if(e.pending){e.tel-=dt;if(e.tel<=0){execBoss(e,e.pending);e.pending=null;e.atkT=bossCd(e)}}else{e.atkT-=dt;if(e.atkT<=0){e.pending=pickBossAtk(e);e.tel=0.5}}
}
function moveBoss(e,dt,ux,uy,d){let tx=0,ty=0;const k=e.bossKind;
 if(k==='hammer'){tx=ux*e.sp;ty=uy*e.sp}else if(k==='eye'){const want=d<170?-1:(d>220?1:0);tx=ux*want*e.sp+(-uy)*e.sp*0.5;ty=uy*want*e.sp+ux*e.sp*0.5}else if(k==='prism'){tx=-uy*e.sp;ty=ux*e.sp}else{const want=d>90?1:-1;tx=ux*want*e.sp*0.8;ty=uy*want*e.sp*0.8}
 e.vx+=(tx-e.vx)*Math.min(1,2*dt);e.vy+=(ty-e.vy)*Math.min(1,2*dt)}
function bossCd(e){return Math.max(0.7,1.6-(e.phase-1)*0.25-(G.wave-5)*0.01)}
function pickBossAtk(e){const p=e.phase,k=e.bossKind;
 if(k==='guardian')return pick(p>=2?['radial','spiral','charge','summon']:['radial','spiral','summon']);
 if(k==='hive')return pick(p>=2?['summon','summon','spore','radial']:['summon','spore']);
 if(k==='prism')return pick(p>=2?['beams','radial','charge','spiral']:['beams','radial']);
 if(k==='hammer')return pick(p>=2?['shock','zones','charge','pull']:['shock','zones','charge']);
 if(k==='eye')return pick(p>=2?['volley','cross','mark','summon']:['volley','mark']);
 return pick(p>=2?['blink','clones','spiral','radial']:['blink','clones'])}
function execBoss(e,kind){
 const D=DIFF[G.diff];
 const dd=hyp(P.x-e.x,P.y-e.y)||1,ux=(P.x-e.x)/dd,uy=(P.y-e.y)/dd;
 if(kind==='radial'){const n=10+e.phase*3;e.ang+=0.24;for(let k=0;k<n;k++)eShoot(e,e.ang+k*TAU/n,72+e.phase*6,9*D.dmg,SPR.orbM);ring(e.x,e.y,e.r,e.r+16,e.col,0.25);A.tone(240,0.1,'square',0.06,0.6)}
 else if(kind==='spiral'){for(let s=0;s<10;s++){const a=e.ang+s*0.42;eShoot(e,a,88,8*D.dmg,SPR.orbA);eShoot(e,a+Math.PI,88,8*D.dmg,SPR.orbA)}e.ang+=0.6;A.tone(300,0.12,'square',0.06,0.7)}
 else if(kind==='charge'){e.st='charge';e.chargeT=0.6;e.lock=Math.atan2(P.y-e.y,P.x-e.x);A.tone(90,0.5,'sawtooth',0.1,2.2)}
 else if(kind==='summon'){const n=2+e.phase;for(let i=0;i<n;i++){const a=rand(0,TAU),type=e.bossKind==='hive'?(i%3===0?'medic':(i%3===1?'splitter':'grunt')):(e.bossKind==='eye'?'sniper':(e.phase>=3?'shooter':'grunt'));const m=makeEnemy(type,e.x+Math.cos(a)*22,e.y+Math.sin(a)*22);m.vx=Math.cos(a)*70;m.vy=Math.sin(a)*70;G.enemies.push(m);ring(m.x,m.y,2,11,e.col,0.3)}A.tone(180,0.3,'sawtooth',0.09,2)}
 else if(kind==='spore'){for(let i=0;i<3+e.phase;i++)spawnZone(P.x+rand(-70,70),P.y+rand(-70,70),26,0.8,1.1,12*D.dmg,'#9dff3c');A.tone(160,0.3,'triangle',0.08,1.6)}
 else if(kind==='beams'){const n=2+e.phase;for(let i=0;i<n;i++)spawnBeam(e.x,e.y,e.shieldAng+i*TAU/n,0.5,1.6,11*D.dmg,300,3,'#22e6ff');A.laser()}
 else if(kind==='shock'){spawnShock(e.x,e.y,180,150,16*D.dmg,'#ffb020');shake(4);A.shock()}
 else if(kind==='zones'){for(let i=0;i<2+e.phase;i++)spawnZone(P.x+rand(-60,60),P.y+rand(-60,60),30,0.75,1.05,18*D.dmg,'#ffb020');A.tone(120,0.3,'square',0.08,1.8)}
 else if(kind==='pull'){P.vx-=ux*160;P.vy-=uy*160;spawnShock(e.x,e.y,150,130,14*D.dmg,'#ff4d4d');A.tone(70,0.4,'sawtooth',0.12,2)}
 else if(kind==='volley'){for(let i=0;i<3;i++){const a=Math.atan2(P.y-e.y,P.x-e.x)+(i-1)*0.12;eShoot(e,a,900,14*D.dmg,SPR.orbR)}A.tone(150,0.15,'sawtooth',0.1,0.4)}
 else if(kind==='cross'){for(let i=0;i<4;i++)spawnBeam(e.x,e.y,e.shieldAng+i*TAU/4,0.25,1.4,12*D.dmg,320,3,'#a86bff');A.laser()}
 else if(kind==='mark'){spawnZone(P.x,P.y,34,0.9,1.2,24*D.dmg,'#ff4d4d');A.tone(700,0.3,'sine',0.05,1.6)}
 else if(kind==='blink'){const a=rand(0,TAU),dist=rand(70,110);e.x=clamp(P.x+Math.cos(a)*dist,AR.x+20,AR.x+AR.w-20);e.y=clamp(P.y+Math.sin(a)*dist,AR.y+20,AR.y+AR.h-20);ring(e.x,e.y,4,40,'#ff2fb0',0.4);A.blink();const n=8+e.phase*2;for(let k=0;k<n;k++)eShoot(e,k*TAU/n,80,8*D.dmg,SPR.orbM)}
 else if(kind==='clones'){for(let i=0;i<2+e.phase;i++){const a=rand(0,TAU),m=makeEnemy('clone',e.x+Math.cos(a)*18,e.y+Math.sin(a)*18);m.vx=Math.cos(a)*80;m.vy=Math.sin(a)*80;G.enemies.push(m)}A.blink()}
}
