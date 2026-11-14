import { STEP,clamp,WORLD,MAX_WAVE,DIFF } from './constants.js';
import { G,P,AR,CAM,VIEW,W,H,setCanvasSize,setView,store } from './state.js';
import { A } from './audio.js';
import { recalc,updatePlayer } from './player.js';
import { startWave,updateSpawns,waveClear } from './waves.js';
import { updateEffects,ring,part,shake,flash } from './effects.js';
import { updateBullets,updateRockets,updateEnemyBullets,updateHazards } from './entities/bullet.js';
import { updateDrops } from './entities/drops.js';
import { render,initBackground } from './render.js';
import { hud,syncBest,saveBest,statsHTML,setState,buildDiffButtons,buildKeys,initButtons,syncSound } from './ui.js';
import { openUp,initShopButtons } from './upgrades.js';

let cv,ctx,aiMod=null;
function bootErr(tag,e){if(window.__bootError)window.__bootError(tag+': '+((e&&e.stack)||e))}
export function initGame(){
 cv=document.getElementById('cv');ctx=cv.getContext('2d',{alpha:false});
 resize();P.x=AR.x+AR.w/2;P.y=AR.y+AR.h/2;centerCam(true);
 recalc();P.hp=P.max;syncSound();syncBest();
 document.getElementById('cWave').textContent='—';
 initBackground(ctx);initButtons();initShopButtons();buildDiffButtons();buildKeys();
 import('./input.js').then(m=>m.initInput(cv)).catch(e=>bootErr('INPUT',e));
 import('./entities/enemyAI.js').then(m=>{aiMod=m}).catch(e=>bootErr('AI',e));
 requestAnimationFrame(frame);
}
export function resize(){const sw=window.innerWidth,sh=window.innerHeight,scale=clamp(Math.round(Math.min(sw,sh)/240),2,5),w=Math.ceil(sw/scale),h=Math.ceil(sh/scale);cv.width=w;cv.height=h;cv.style.width=(w*scale)+'px';cv.style.height=(h*scale)+'px';cv.SCALE=scale;ctx=cv.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;const topPx=document.getElementById('top').offsetHeight||46,botPx=document.getElementById('hud').offsetHeight||90,ti=Math.ceil(topPx/scale)+3,bi=Math.ceil(botPx/scale)+3;setCanvasSize(w,h,scale);setView(0,ti,w,Math.max(60,h-ti-bi));initBackground(ctx);centerCam(true)}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>setTimeout(resize,250));
function centerCam(snap){const tx=clamp(P.x-(VIEW.x+VIEW.w/2),0,Math.max(0,WORLD.w-W)),ty=clamp(P.y-(VIEW.y+VIEW.h/2),0,Math.max(0,WORLD.h-H));if(snap){CAM.x=tx;CAM.y=ty}}
function updateCam(dt){const tx=clamp(P.x-(VIEW.x+VIEW.w/2),0,Math.max(0,WORLD.w-W)),ty=clamp(P.y-(VIEW.y+VIEW.h/2),0,Math.max(0,WORLD.h-H)),k=1-Math.exp(-8*dt);CAM.x+=(tx-CAM.x)*k;CAM.y+=(ty-CAM.y)*k}
export function newRun(){A.init();A.resume();G.runs++;store.set('runs',G.runs);G.enemies=[];G.bul=[];G.ebul=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];G.parts=[];G.drops=[];G.floats=[];G.rings=[];G.ghost=[];G.queue=[];G.score=0;G.shards=0;G.kills=0;G.combo=0;G.comboT=0;G.mult=1;G.wave=0;G.boss=null;G.shake=0;G.flash=0;G.slow=0;G.st={shots:0,hits:0,time:0};P.lvl={};P.weapon=null;P.weaponCd=0;P.beamT=0;P.x=AR.x+AR.w/2;P.y=AR.y+AR.h/2;P.vx=0;P.vy=0;P.inv=1.2;P.dashCd=0;P.dashT=0;P.fireT=0;P.noHit=0;P.shield=0;P.shieldT=0;recalc();P.hp=P.max;centerCam(true);document.getElementById('bossbar').classList.remove('on');setState('play');startWave(1);ring(P.x,P.y,3,40,'#22e6ff',0.5);part(P.x,P.y,'#22e6ff',16,90,0.5,1);syncBest()}
export function pause(){if(G.state!=='play')return;setState('pause')}
export function resume(){if(G.state!=='pause')return;setState('play');A.resume()}
export function toMenu(){setState('title');G.enemies=[];G.bul=[];G.ebul=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];G.drops=[];G.queue=[];G.boss=null;document.getElementById('bossbar').classList.remove('on');syncBest()}
export function gameOver(){setState('over');A.over();G.slow=1;shake(8);flash(0.5,'#ff4d4d');part(P.x,P.y,'#ff4d4d',46,150,0.9,2);ring(P.x,P.y,4,60,'#ff4d4d',0.8);const rec=saveBest();document.getElementById('overRec').innerHTML=rec?'<span class="rec">НОВЫЙ РЕКОРД</span>':'';document.getElementById('overSub').textContent='Волна '+G.wave+' · '+DIFF[G.diff].n+' · '+G.kills+' врагов уничтожено';document.getElementById('overStats').innerHTML=statsHTML()}
export function winRun(){setState('win');A.win();flash(0.35,'#9dff3c');const rec=saveBest();document.getElementById('winRec').innerHTML=rec?'<span class="rec">НОВЫЙ РЕКОРД</span>':'';document.getElementById('winStats').innerHTML=statsHTML()}
let last=performance.now(),acc=0;
function onBeat(){if(G.state==='pause')return;G.beat++;G.beats.push({r:3,a:0.55});const heat=G.state==='play'?clamp(G.enemies.length/12+(G.boss?0.5:0)+G.wave/30,0,1):0.05;A.beat(G.beat,heat);if(G.state==='play'&&P.hp/P.max<0.3&&G.beat%2===0)A.tone(70,0.12,'square',0.12,0.6)}
function frame(now){const raw=Math.min(0.05,(now-last)/1000);last=now;G.beatT+=raw;let guard=0;while(G.beatT>=0.4&&guard++<4){G.beatT-=0.4;onBeat()}let scale=1;if(G.state==='play')scale=G.slow>0?0.4:1;else if(G.state==='title')scale=0.6;else if(G.state==='over'||G.state==='win'||G.state==='clear')scale=0.5;else scale=0.1;acc+=raw*scale;let steps=0;while(acc>=STEP&&steps<5){update(STEP);acc-=STEP;steps++}if(acc>STEP*5)acc=0;render(ctx);hud(raw);requestAnimationFrame(frame)}
function update(dt){G.t+=dt;G.shake=Math.max(0,G.shake-dt*22);G.flash=Math.max(0,G.flash-dt*2.2);G.slow=Math.max(0,G.slow-dt);updateEffects(dt);
 if(G.state==='clear'){G.clearT-=dt;if(G.clearT<=0){if(G.wave>=MAX_WAVE)winRun();else openUp()}return}
 if(G.state!=='play')return;G.st.time+=dt;G.waveT+=dt;if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0){G.combo=0;G.mult=1}}
 updateSpawns();updatePlayer(dt);updateBullets(dt);updateRockets(dt);updateHazards(dt);if(aiMod)aiMod.updateEnemies(dt);updateEnemyBullets(dt);updateDrops(dt);updateCam(dt);
 if(G.active&&!G.queue.length&&!G.enemies.length)waveClear()}
