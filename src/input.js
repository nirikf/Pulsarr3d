import { G,P,keys,sticks,setMouse,W } from './state.js';
import { A } from './audio.js';
import { doDash,fireWeapon } from './player.js';
import { choose } from './upgrades.js';
import { newRun,pause,resume } from './game.js';
import { toggleSound } from './ui.js';

export function initInput(canvas){
 let lastTap={t:0,side:''};
 window.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.code)>=0)e.preventDefault();
  keys[e.code]=true;A.init();A.resume();
  if(e.code==='ShiftLeft'||e.code==='ShiftRight')P.focus=true;
  if(e.code==='KeyM'){toggleSound();return}
  if(e.code==='KeyP'||e.code==='Escape'){if(G.state==='play')pause();else if(G.state==='pause')resume();return}
  if(e.code==='KeyR'){if(G.state!=='title')newRun();return}
  if((G.state==='title'||G.state==='over'||G.state==='win')&&(e.code==='Enter'||e.code==='Space')){newRun();return}
  if(G.state==='up'){const idx={Digit1:0,Digit2:1,Digit3:2}[e.code];if(idx!==undefined)choose(idx);return}
  if(G.state==='play'&&e.code==='Space')doDash();
 });
 window.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight')P.focus=false});
 window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);P.focus=false;sticks.move.id=null;sticks.aim.id=null;sticks.move.m=0;sticks.aim.m=0;if(G.state==='play')pause()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.state==='play')pause()});
 function toLogical(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/canvas.SCALE,y:(e.clientY-r.top)/canvas.SCALE}}
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('pointerdown',e=>{
  A.init();A.resume();try{canvas.setPointerCapture(e.pointerId)}catch(err){}
  const p=toLogical(e);
  if(e.pointerType==='touch'){
   const side=p.x<W*0.5?'L':'R',now=performance.now();
   if(now-lastTap.t<300&&lastTap.side===side){if(side==='L')doDash();else fireWeapon();lastTap.t=0}else lastTap={t:now,side};
   const s=side==='L'?sticks.move:sticks.aim;
   if(s.id===null){s.id=e.pointerId;s.ox=p.x;s.oy=p.y;s.x=p.x;s.y=p.y;s.dx=0;s.dy=0;s.m=0}
  }else{
   setMouse(p.x,p.y,G.t);
   if(e.button===0)fireWeapon();
   if(e.button===2)doDash();
  }
 });
 canvas.addEventListener('pointermove',e=>{
  const p=toLogical(e);
  if(e.pointerType==='touch'){
   ['move','aim'].forEach(k=>{
    const s=sticks[k];if(s.id!==e.pointerId)return;
    s.x=p.x;s.y=p.y;let dx=p.x-s.ox,dy=p.y-s.oy;const d=Math.sqrt(dx*dx+dy*dy),max=22;
    if(d>max){s.ox=p.x-dx/d*max;s.oy=p.y-dy/d*max;dx=dx/d*max;dy=dy/d*max}
    s.dx=dx/max;s.dy=dy/max;s.m=Math.min(Math.max(d/max,0),1);
   });
  }else setMouse(p.x,p.y,G.t);
 });
 function pointerUp(e){
  if(e.pointerType==='touch'){
   ['move','aim'].forEach(k=>{
    const s=sticks[k];
    if(s.id===e.pointerId){s.id=null;s.m=0;s.dx=0;s.dy=0}
   });
  }
 }
 canvas.addEventListener('pointerup',pointerUp);
 canvas.addEventListener('pointercancel',pointerUp);
 document.addEventListener('pointerdown',()=>{A.init();A.resume()},{once:true});
}
