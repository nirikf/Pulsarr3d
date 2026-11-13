import { DIFF, rand, hyp, TAU, angDiff } from './constants.js';
import { G, P, S } from './state.js';
import { part, ring, shake, flash, float } from './effects.js';
import { A } from './audio.js';
import { makeEnemy } from './entities/enemy.js';
import { spawnMedkit, spawnShard } from './entities/drops.js';
import { gameOver } from './game.js';

export function healPlayer(v){
  if(P.hp<=0)return;const b=P.hp;P.hp=Math.min(P.max,P.hp+v);
  if(P.hp-b>2)float(P.x,P.y-10,'+'+Math.round(P.hp-b),'#35f0a0',1);
}

export function hurtPlayer(d){
  if(P.inv>0||G.state!=='play')return;
  if(P.shield>0){
    const ab=Math.min(P.shield,d);P.shield-=ab;d-=ab;P.shieldT=2.5;
    A.shieldHit();part(P.x,P.y,'#a86bff',8,80,0.3,1);
    if(d<=0){P.inv=0.35;return}
  }
  P.hp-=d;P.inv=0.7;P.hurtT=0.35;P.noHit=0;P.shieldT=2.5;G.combo=0;G.mult=1;
  shake(5);flash(0.3,'#ff4d4d');A.hurt();part(P.x,P.y,'#ff4d4d',12,90,0.4,1);
  float(P.x,P.y-11,'-'+Math.round(d),'#ff4d4d',1);
  if(P.hp<=0){P.hp=0;gameOver()}
}

export function damageEnemy(e,dmg,crit,hx,hy,dir,ignoreShield){
  if(e.dead)return;
  if(e.type==='shielder'&&!ignoreShield&&dir!==undefined){
    if(Math.abs(angDiff(e.face,dir+Math.PI))<1.15){
      e.shieldFl=0.15;part(hx,hy,'#22e6ff',4,60,0.2,1);
      float(e.x,e.y-e.r-4,'БЛОК','#22e6ff',1);A.shieldHit();return;
    }
  }
  e.hp-=dmg;e.fl=0.1;G.st.hits++;
  if(hx!==undefined)part(hx,hy,crit?'#ffb020':'#ffffff',crit?6:3,crit?80:55,0.25,1);
  float(e.x+rand(-3,3),e.y-e.r-4,Math.round(dmg),crit?'#ffb020':'#f4ecff',crit?2:1);
  if(S.vamp)healPlayer(S.vamp*dmg);
  A.hit();
  if(e.hp<=0)killEnemy(e);
}

export function killEnemy(e){
  if(e.dead)return;e.dead=true;G.kills++;
  G.combo=Math.min(20,G.combo+1);G.comboT=2.4;G.mult=1+Math.min(G.combo,15)*0.1;
  addScore(e.pts*G.mult);
  part(e.x,e.y,e.col,e.boss?60:14,e.boss?150:95,e.boss?0.9:0.45,e.boss?2:1);
  part(e.x,e.y,'#ffffff',e.boss?24:5,e.boss?120:70,0.3,1);
  ring(e.x,e.y,e.r*0.5,e.boss?70:e.r*3,e.col,e.boss?0.8:0.35);
  A.kill();shake(e.boss?8:2);
  if(e.boss){G.slow=1.1;flash(0.45,'#ffb020');G.boss=null;document.getElementById('bossbar').classList.remove('on');A.boom();
    G.drops.push({x:e.x,y:e.y,vx:0,vy:0,type:'hp',l:20,sp:0})}
  if(e.type==='splitter'){for(let i=0;i<2;i++){const a=rand(0,TAU),m=makeEnemy('mini',e.x+Math.cos(a)*7,e.y+Math.sin(a)*7);
    m.vx=Math.cos(a)*70;m.vy=Math.sin(a)*70;G.enemies.push(m)}}
  if(e.type==='tank'){ring(e.x,e.y,4,34,'#ff4d4d',0.45);part(e.x,e.y,'#ffb020',18,120,0.5,1);A.boom();shake(4);
    for(let j=0;j<G.enemies.length;j++){const o=G.enemies[j];if(!o.dead&&o!==e&&hyp(o.x-e.x,o.y-e.y)<32)damageEnemy(o,26,false)}
    if(hyp(P.x-e.x,P.y-e.y)<26)hurtPlayer(12*DIFF[G.diff].dmg)}
  for(let k=0;k<(e.sh||0)&&G.drops.length<170;k++)spawnShard(e.x,e.y);
  if(!e.boss&&e.type!=='mini'&&Math.random()<(e.type==='tank'?0.45:0.05))spawnMedkit(e.x,e.y);
}

export function addScore(v){G.score+=Math.round(v*DIFF[G.diff].mult)}
export function popChip(sel){const el=document.querySelector(sel);if(!el)return;el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit')}
