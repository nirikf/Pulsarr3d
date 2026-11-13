import { G,P,AR } from '../state.js';
import { SPR } from '../sprites.js';
import { part,ring,shake,flash,float } from '../effects.js';
import { damageEnemy,hurtPlayer } from '../combat.js';
import { hyp,clamp,angDiff,TAU } from '../constants.js';
import { A } from '../audio.js';

export function fireBullet(x,y,angle,speed,dmg,pierce,isDrone){G.bul.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:2,dmg,p:pierce||0,l:isDrone?1.1:1.2,hit:[],a:angle,dr:isDrone||false})}
export function fireRocketEntity(x,y,angle,dmg){G.rockets.push({x,y,a:angle,vx:Math.cos(angle)*160,vy:Math.sin(angle)*160,r:3,dmg,l:2.4})}
export function eShoot(e,ang,spd,dmg,sprKey){if(G.ebul.length>220)return;G.ebul.push({x:e.x+Math.cos(ang)*(e.r+2),y:e.y+Math.sin(ang)*(e.r+2),vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,r:2.5,dmg,l:4,spr:sprKey||SPR.orbM})}
export function spawnBeam(x,y,ang,rot,life,dmg,len,width,col){if(G.beams.length>40)return;G.beams.push({x,y,ang,rot,life,max:life,dmg,len,width,col:col||'#ff4d4d',tick:0})}
export function spawnZone(x,y,r,tel,life,dmg,col){if(G.zones.length>30)return;G.zones.push({x,y,r,tel,life,max:life,dmg,col:col||'#ff4d4d',done:false})}
export function spawnShock(x,y,maxR,speed,dmg,col){if(G.shocks.length>12)return;G.shocks.push({x,y,r:4,maxR,speed,dmg,col:col||'#ffb020',hit:false})}

export function updateBullets(dt){
 for(let i=G.bul.length-1;i>=0;i--){const bl=G.bul[i];bl.l-=dt;bl.x+=bl.vx*dt;bl.y+=bl.vy*dt;let dead=bl.l<=0||bl.x<AR.x||bl.x>AR.x+AR.w||bl.y<AR.y||bl.y>AR.y+AR.h;
  if(!dead)for(let j=0;j<G.enemies.length;j++){const e=G.enemies[j];if(e.dead||bl.hit.indexOf(e.id)>=0)continue;const dx=e.x-bl.x,dy=e.y-bl.y;if(dx*dx+dy*dy<(e.r+bl.r)*(e.r+bl.r)){bl.hit.push(e.id);damageEnemy(e,bl.dmg,false,bl.x,bl.y,bl.a,false);if(bl.p>0)bl.p--;else dead=true;break}}
  if(dead){if(bl.l>0)part(bl.x,bl.y,bl.dr?'#9dff3c':'#22e6ff',3,45,0.18,1);G.bul.splice(i,1)}}
}
export function updateRockets(dt){
 for(let i=G.rockets.length-1;i>=0;i--){const r=G.rockets[i];r.l-=dt;let tgt=null,bd=220*220;for(const e of G.enemies){if(e.dead)continue;const d2=(e.x-r.x)**2+(e.y-r.y)**2;if(d2<bd){bd=d2;tgt=e}}
  if(tgt){const want=Math.atan2(tgt.y-r.y,tgt.x-r.x);r.a+=clamp(angDiff(r.a,want),-2.4*dt,2.4*dt)}
  r.vx=Math.cos(r.a)*160;r.vy=Math.sin(r.a)*160;r.x+=r.vx*dt;r.y+=r.vy*dt;part(r.x,r.y,'#ffb020',1,30,0.2,1);
  let boom=r.l<=0||r.x<AR.x||r.x>AR.x+AR.w||r.y<AR.y||r.y>AR.y+AR.h;if(!boom)for(const e of G.enemies){if(e.dead)continue;if(hyp(e.x-r.x,e.y-r.y)<e.r+r.r){boom=true;break}}
  if(boom){explodeRocket(r.x,r.y,r.dmg);G.rockets.splice(i,1)}}
}
function explodeRocket(x,y,dmg){ring(x,y,4,50,'#ffb020',0.5);part(x,y,'#ffb020',26,140,0.6,2);part(x,y,'#ffffff',10,90,0.3,1);shake(6);flash(0.2,'#ffb020');A.explode();for(const e of G.enemies){if(e.dead)continue;const d=hyp(e.x-x,e.y-y);if(d<50)damageEnemy(e,dmg*(1-d/50*0.5),true,e.x,e.y,0,true)}}
function segHit(x1,y1,x2,y2,cx,cy,r){const dx=x2-x1,dy=y2-y1,l2=dx*dx+dy*dy;let t=l2?((cx-x1)*dx+(cy-y1)*dy)/l2:0;t=clamp(t,0,1);const px=x1+dx*t,py=y1+dy*t;return(px-cx)**2+(py-cy)**2<r*r}
export function updateEnemyBullets(dt){
 for(let i=G.ebul.length-1;i>=0;i--){const eb=G.ebul[i];eb.l-=dt;const ox=eb.x,oy=eb.y;eb.x+=eb.vx*dt;eb.y+=eb.vy*dt;
  if(eb.l<=0||eb.x<AR.x-16||eb.x>AR.x+AR.w+16||eb.y<AR.y-16||eb.y>AR.y+AR.h+16){G.ebul.splice(i,1);continue}
  if(segHit(ox,oy,eb.x,eb.y,P.x,P.y,eb.r+P.r*0.9)){hurtPlayer(eb.dmg);part(eb.x,eb.y,'#ff2fb0',7,70,0.3,1);G.ebul.splice(i,1)}}
}
export function updateHazards(dt){
 for(let i=G.beams.length-1;i>=0;i--){const b=G.beams[i];b.life-=dt;b.ang+=b.rot*dt;b.tick-=dt;
  const x2=b.x+Math.cos(b.ang)*b.len,y2=b.y+Math.sin(b.ang)*b.len;
  if(b.tick<=0&&segHit(b.x,b.y,x2,y2,P.x,P.y,b.width+P.r*0.7)){hurtPlayer(b.dmg);b.tick=0.35;part(P.x,P.y,'#ff4d4d',5,60,0.2,1)}
  if(b.life<=0)G.beams.splice(i,1)}
 for(let i=G.zones.length-1;i>=0;i--){const z=G.zones[i];z.life-=dt;if(!z.done){z.tel-=dt;if(z.tel<=0){z.done=true;ring(z.x,z.y,2,z.r,z.col,0.4);part(z.x,z.y,z.col,16,110,0.4,1);A.boom();if(hyp(P.x-z.x,P.y-z.y)<z.r+P.r)hurtPlayer(z.dmg)}}if(z.life<=0)G.zones.splice(i,1)}
 for(let i=G.shocks.length-1;i>=0;i--){const s=G.shocks[i];s.r+=s.speed*dt;if(!s.hit&&Math.abs(hyp(P.x-s.x,P.y-s.y)-s.r)<7){hurtPlayer(s.dmg);s.hit=true}if(s.r>s.maxR)G.shocks.splice(i,1)}
}
