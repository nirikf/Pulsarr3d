import { rand, randi, TAU, clamp, BOSS_WAVES, BOSS_NAMES, dodgeCooldown } from '../constants.js';
import { G, AR, CAM, W, H, nextEid } from '../state.js';
import { DIFF } from '../constants.js';
import { SPR } from '../sprites.js';
import { ring } from '../effects.js';

export function edge(){const m=18,s=randi(0,3);let x,y;if(s===0){x=rand(CAM.x,CAM.x+W);y=CAM.y-m}else if(s===1){x=CAM.x+W+m;y=rand(CAM.y,CAM.y+H)}else if(s===2){x=rand(CAM.x,CAM.x+W);y=CAM.y+H+m}else{x=CAM.x-m;y=rand(CAM.y,CAM.y+H)}return{x:clamp(x,AR.x+10,AR.x+AR.w-10),y:clamp(y,AR.y+10,AR.y+AR.h-10)}}

export function makeEnemy(type,x,y){
 const D=DIFF[G.diff],sc=1+0.1*(G.wave-1);
 const e={id:nextEid(),type,x,y,vx:0,vy:0,fl:0,dead:false,t:rand(0,9),hitT:0,tel:0,sub:0,ang:rand(0,TAU),st:'walk',cd:rand(1,3),lock:0,face:rand(0,TAU),shieldFl:0,beam:null,mode:'normal',group:null,slot:0,guardId:null,tx:x,ty:y,tface:0,ax:x,ay:y,ar:0,dodgeCd:dodgeCooldown(G.wave),dodgeT:0,dvx:0,dvy:0};
 if(type==='grunt'){e.r=5;e.hp=20*sc*D.hp;e.sp=40*D.sp;e.dmg=8*D.dmg;e.pts=10;e.sh=1;e.spr=SPR.grunt;e.col='#ff2fb0'}
 else if(type==='mini'){e.r=3.5;e.hp=9*sc*D.hp;e.sp=62*D.sp;e.dmg=5*D.dmg;e.pts=5;e.sh=Math.random()<0.4?1:0;e.spr=SPR.mini;e.col='#a86bff'}
 else if(type==='shooter'){e.r=6;e.hp=26*sc*D.hp;e.sp=26*D.sp;e.dmg=7*D.dmg;e.pts=18;e.sh=2;e.spr=SPR.shooter;e.col='#ffb020';e.cd=rand(0.7,1.8)}
 else if(type==='splitter'){e.r=6.5;e.hp=34*sc*D.hp;e.sp=30*D.sp;e.dmg=10*D.dmg;e.pts=22;e.sh=2;e.spr=SPR.splitter;e.col='#a86bff'}
 else if(type==='tank'){e.r=9;e.hp=85*sc*D.hp;e.sp=20*D.sp;e.dmg=16*D.dmg;e.pts=45;e.sh=4;e.spr=SPR.tank;e.col='#ff4d4d';e.cd=rand(2,3.6)}
 else if(type==='shielder'){e.r=6;e.hp=40*sc*D.hp;e.sp=30*D.sp;e.dmg=9*D.dmg;e.pts=26;e.sh=2;e.spr=SPR.shielder;e.col='#4d8cff';e.cd=rand(1,2)}
 else if(type==='sniper'){e.r=5;e.hp=24*sc*D.hp;e.sp=34*D.sp;e.dmg=6;e.pts=30;e.sh=2;e.spr=SPR.sniper;e.col='#a86bff';e.cd=3}
 else if(type==='medic'){e.r=5;e.hp=70*sc*D.hp;e.sp=46*D.sp;e.dmg=0;e.pts=28;e.sh=2;e.spr=SPR.medic;e.col='#9dff3c'}
 else if(type==='emitter'){e.r=7;e.hp=55*sc*D.hp;e.sp=22*D.sp;e.dmg=0;e.pts=36;e.sh=3;e.spr=SPR.emitter;e.col='#22e6ff';e.cd=rand(2.5,4)}
 else if(type==='clone'){e.r=4;e.hp=1;e.sp=75*D.sp;e.dmg=10*D.dmg;e.pts=2;e.sh=0;e.spr=SPR.clone;e.col='#ff2fb0'}
 else if(type==='boss'){
  const kind=BOSS_WAVES[G.wave]||'guardian';
  const base={guardian:380,hive:520,prism:640,hammer:780,eye:880,phantom:1100}[kind];
  e.r=15;e.hp=base*(1+(G.wave-5)*0.045)*D.hp;e.sp=24*D.sp;e.dmg=20*D.dmg;e.pts=600+G.wave*20;e.sh=20;e.spr=SPR.bosses[kind];e.col={guardian:'#ff4d4d',hive:'#9dff3c',prism:'#22e6ff',hammer:'#ffb020',eye:'#a86bff',phantom:'#ff2fb0'}[kind];
  e.boss=true;e.bossKind=kind;e.bossName=BOSS_NAMES[kind];e.atk='idle';e.atkT=1.4;e.phase=1;e.pending=null;e.shieldAng=0;e.chargeT=0;
 }
 e.max=e.hp;return e;
}
export function spawnAt(type,x,y,extra){const e=makeEnemy(type,x,y);if(extra)Object.assign(e,extra);G.enemies.push(e);ring(x,y,2,12,e.col,0.35);return e}
export function spawn(type){const p=edge();return spawnAt(type,p.x,p.y)}
