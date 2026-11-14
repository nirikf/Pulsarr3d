import { G,P,keys,sticks,setMouse,W } from './state.js';
import { A } from './audio.js';
import { doDash,fireWeapon } from './player.js';
import { choose } from './upgrades.js';
import { newRun,pause,resume } from './game.js';
import { toggleSound } from './ui.js';

export function initInput(canvas){
  let lastTapTime = 0;
  let lastTapSide = '';

  function onKeyDown(e){
    if (e.code==='Space'||e.code==='ArrowUp'||e.code==='ArrowDown'||e.code==='ArrowLeft'||e.code==='ArrowRight') e.preventDefault();
    keys[e.code] = true;
    A.init(); A.resume();
    if (e.code==='ShiftLeft'||e.code==='ShiftRight') P.focus = true;
    if (e.code==='KeyM') { toggleSound(); return; }
    if (e.code==='KeyP'||e.code==='Escape') { if (G.state==='play') pause(); else if (G.state==='pause') resume(); return; }
    if (e.code==='KeyR') { if (G.state!=='title') newRun(); return; }
    if ((G.state==='title'||G.state==='over'||G.state==='win') && (e.code==='Enter'||e.code==='Space')) { newRun(); return; }
    if (G.state==='up') {
      const idx = {Digit1:0,Digit2:1,Digit3:2}[e.code];
      if (idx!==undefined) choose(idx);
      return;
    }
    if (G.state==='play' && e.code==='Space') doDash();
  }
  function onKeyUp(e){
    keys[e.code] = false;
    if (e.code==='ShiftLeft'||e.code==='ShiftRight') P.focus = false;
  }
  function onBlur(){
    for (const k in keys) keys[k] = false;
    P.focus = false;
    sticks.move.id = null; sticks.aim.id = null;
    sticks.move.m = 0; sticks.aim.m = 0;
    if (G.state==='play') pause();
  }
  function onVis(){ if (document.hidden && G.state==='play') pause(); }
  function toLogical(e){
    const r = canvas.getBoundingClientRect();
    return { x:(e.clientX-r.left)/canvas.SCALE, y:(e.clientY-r.top)/canvas.SCALE };
  }
  function onDown(e){
    A.init(); A.resume();
    try { canvas.setPointerCapture(e.pointerId); } catch(err) {}
    const p = toLogical(e);
    if (e.pointerType==='touch') {
      const side = (p.x < W*0.5) ? 'L' : 'R';
      const now = performance.now();
      if (now-lastTapTime < 300 && lastTapSide===side) {
        if (side==='L') doDash(); else fireWeapon();
        lastTapTime = 0;
      } else { lastTapTime = now; lastTapSide = side; }
      const s = (side==='L') ? sticks.move : sticks.aim;
      if (s.id===null) { s.id=e.pointerId; s.ox=p.x; s.oy=p.y; s.x=p.x; s.y=p.y; s.dx=0; s.dy=0; s.m=0; }
    } else {
      setMouse(p.x,p.y,G.t);
      if (e.button===0) fireWeapon();
      if (e.button===2) doDash();
    }
  }
  function onMove(e){
    const p = toLogical(e);
    if (e.pointerType!=='touch') { setMouse(p.x,p.y,G.t); return; }
    for (const k of ['move','aim']) {
      const s = sticks[k];
      if (s.id!==e.pointerId) continue;
      s.x=p.x; s.y=p.y;
      let dx=p.x-s.ox, dy=p.y-s.oy;
      const d=Math.sqrt(dx*dx+dy*dy), max=22;
      if (d>max) { s.ox=p.x-dx/d*max; s.oy=p.y-dy/d*max; dx=dx/d*max; dy=dy/d*max; }
      s.dx=dx/max; s.dy=dy/max; s.m=Math.min(Math.max(d/max,0),1);
    }
  }
  function onUp(e){
    if (e.pointerType!=='touch') return;
    for (const k of ['move','aim']) {
      const s = sticks[k];
      if (s.id===e.pointerId) { s.id=null; s.m=0; s.dx=0; s.dy=0; }
    }
  }
  function onCtx(e){ e.preventDefault(); }
  function firstTouch(){ A.init(); A.resume(); }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('contextmenu', onCtx);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  document.addEventListener('pointerdown', firstTouch, { once:true });
}
