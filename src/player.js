import { TAU, hyp, clamp, rand, DIFF, UPS, angDiff } from './constants.js';
import { G, P, S, AR, CAM, keys, sticks, mx, my, mouseT, isTouch } from './state.js';
import { part, ring, shake } from './effects.js';
import { A } from './audio.js';
import { fireBullet, fireRocketEntity } from './entities/bullet.js';
import { healPlayer, damageEnemy } from './combat.js';
import { iconCanvas } from './sprites.js';

export function recalc(){
  const L=P.lvl,D=DIFF[G.diff];
  S.rate=4.6*Math.pow(1.18,L.rate||0)*Math.pow(1.14,L.kir||0);
  S.dmg=10*Math.pow(1.25,L.cal||0);
  S.count=1+(L.fan||0);S.spread=0.11*(L.fan||0)+0.03;S.pierce=L.pierce||0;
  S.speed=74*Math.pow(1.13,L.speed||0);
  S.dashCd=1.3*Math.pow(0.78,L.dash||0);S.dashDmg=18+9*(L.dash||0);
  S.magnet=34*Math.pow(1.7,L.magnet||0);S.vamp=0.04*(L.vamp||0);S.regen=1.6*(L.regen||0);
  S.drones=L.drone||0;S.bs=200*Math.pow(1.18,L.kir||0);
  S.shieldMax=25*(L.shield||0);S.shieldRegen=6+2*(L.shield||0);
  S.rocket=L.rocket||0;S.rocketCd=(L.rocket||0)>=2?3.5:5;
  S.rocketDmg=(L.rocket||0)>=2?150:50;
  P.max=D.base+25*(L.armor||0);
  P.shield=Math.min(P.shield,S.shieldMax);
  while(P.dT.length<S.drones)P.dT.push(rand(0,0.6));
  P.dT.length=S.drones;
  const m=document.getElementById('mods');m.innerHTML='';
  UPS.forEach(u=>{const l=P.lvl[u.k]||0;if(!l)return;
    const ic=iconCanvas(u.k,u.col,2);ic.style.width='18px';ic.style.height='18px';ic.title=u.n+' ур.'+l;m.appendChild(ic)});
}

export function moveVec(){
  let x=0,y=0;
  if(keys.KeyA||keys.ArrowLeft)x-=1;if(keys.KeyD||keys.ArrowRight)x+=1;
  if(keys.KeyW||keys.ArrowUp)y-=1;if(keys.KeyS||keys.ArrowDown)y+=1;
  if(sticks.move.m>0.14){x+=sticks.move.dx;y+=sticks.move.dy}
  const l=hyp(x,y);if(l>1){x/=l;y/=l}
  return{x,y};
}

export function nearest(){let b=null,bd=1e9;for(const e of G.enemies){if(e.dead)continue;
  const d=(e.x-P.x)**2+(e.y-P.y)**2;if(d<bd){bd=d;b=e}}return b}

export function updatePlayer(dt){
  P.inv=Math.max(0,P.inv-dt);P.hurtT=Math.max(0,P.hurtT-dt);P.dashCd=Math.max(0,P.dashCd-dt);
  P.rocketCd=Math.max(0,P.rocketCd-dt);P.shieldT=Math.max(0,P.shieldT-dt);P.noHit+=dt;
  if(S.regen&&P.noHit>3)healPlayer(S.regen*dt);
  if(S.shieldMax&&P.shieldT<=0)P.shield=Math.min(S.shieldMax,P.shield+S.shieldRegen*dt);
  const mv=moveVec();
  if(P.dashT>0){
    P.dashT-=dt;P.vx=P.dx*280;P.vy=P.dy*280;
    G.ghost.push({x:P.x,y:P.y,a:P.aim,l:0.22,m:0.22});
    for(const e of G.enemies){if(e.dead||e.dh)continue;
      if(hyp(e.x-P.x,e.y-P.y)<e.r+P.r+2){e.dh=true;damageEnemy(e,S.dashDmg,true,e.x,e.y,0,true);
        const ka=Math.atan2(e.y-P.y,e.x-P.x);e.vx+=Math.cos(ka)*90;e.vy+=Math.sin(ka)*90}}
  }else{
    for(const e of G.enemies)e.dh=false;
    const sp=S.speed*(P.focus?0.55:1),k=1-Math.exp(-20*dt);
    P.vx+=(mv.x*sp-P.vx)*k;P.vy+=(mv.y*sp-P.vy)*k;
  }
  P.x+=P.vx*dt;P.y+=P.vy*dt;
  if(P.x<AR.x+P.r){P.x=AR.x+P.r;P.vx=0}
  if(P.x>AR.x+AR.w-P.r){P.x=AR.x+AR.w-P.r;P.vx=0}
  if(P.y<AR.y+P.r){P.y=AR.y+P.r;P.vy=0}
  if(P.y>AR.y+AR.h-P.r){P.y=AR.y+AR.h-P.r;P.vy=0}
  if(sticks.aim.m>0.2)P.aim=Math.atan2(sticks.aim.dy,sticks.aim.dx);
  else if(!isTouch&&G.t-mouseT<4)P.aim=Math.atan2(my+CAM.y-P.y,mx+CAM.x-P.x);
  else{const tg=nearest();if(tg)P.aim=Math.atan2(tg.y-P.y,tg.x-P.x)}
  P.fireT-=dt;if(P.fireT<=0){P.fireT=1/S.rate;shoot()}
  for(let i=0;i<S.drones;i++){
    P.dT[i]-=dt;
    if(P.dT[i]<=0){const t2=nearest();
      if(t2){P.dT[i]=0.7;const ang=G.t*1.8+i*TAU/S.drones,ddx=P.x+Math.cos(ang)*16,ddy=P.y+Math.sin(ang)*16;
        fireBullet(ddx,ddy,Math.atan2(t2.y-ddy,t2.x-ddx),180,S.dmg*0.5,0,true)}
      else P.dT[i]=0.25}
  }
}

export function shoot(){
  const n=S.count;
  for(let i=0;i<n;i++){
    const off=(i-(n-1)/2)*S.spread*2+rand(-0.02,0.02)*(P.focus?0.3:1),a=P.aim+off;
    fireBullet(P.x+Math.cos(a)*7,P.y+Math.sin(a)*7,a,S.bs,S.dmg,S.pierce,false);
  }
  G.st.shots+=n;part(P.x+Math.cos(P.aim)*8,P.y+Math.sin(P.aim)*8,'#b8fbff',2,50,0.15,1);
  P.vx-=Math.cos(P.aim)*9;P.vy-=Math.sin(P.aim)*9;A.shoot();
}

export function fireRocket(){
  if(G.state!=='play'||!S.rocket||P.rocketCd>0)return;
  P.rocketCd=S.rocketCd;
  fireRocketEntity(P.x+Math.cos(P.aim)*8,P.y+Math.sin(P.aim)*8,P.aim,S.rocketDmg);
  A.rocket();shake(2);part(P.x,P.y,'#ffb020',6,70,0.25,1);
}

export function doDash(){
  if(G.state!=='play'||P.dashCd>0)return;
  const m=moveVec();let dx=m.x,dy=m.y;
  if(!dx&&!dy){dx=Math.cos(P.aim);dy=Math.sin(P.aim)}
  const l=hyp(dx,dy)||1;P.dx=dx/l;P.dy=dy/l;
  P.dashT=0.16;P.dashCd=S.dashCd;P.inv=Math.max(P.inv,0.28);
  A.dash();shake(2);part(P.x,P.y,'#22e6ff',10,90,0.3,1);ring(P.x,P.y,3,18,'#22e6ff',0.25);
}
