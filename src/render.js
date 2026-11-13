import { TAU,hyp,randi,clamp,rand,pick,WORLD } from './constants.js';
import { G,P,S,AR,CAM,VIEW,W,H,sticks,isTouch,mx,my,mouseT } from './state.js';
import { SPR,floorPattern } from './sprites.js';
import { drawSpr,pxText,pxTextW,pxCircle,pxDisc } from './render/draw.js';

export let stars=[],floorPat=null;
export function initBackground(ctx){floorPat=ctx.createPattern(floorPattern,'repeat');stars=[];for(let i=0;i<70;i++)stars.push({x:randi(0,W-1),y:randi(0,H-1),c:pick(['#4f2a94','#22e6ff','#6b6a8a','#a86bff']),p:rand(0,TAU)})}
function line(ctx,x1,y1,x2,y2,col,w,a){ctx.save();ctx.globalAlpha=a==null?1:a;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(Math.round(x1),Math.round(y1));ctx.lineTo(Math.round(x2),Math.round(y2));ctx.stroke();ctx.restore()}

export function render(ctx){ctx.imageSmoothingEnabled=false;ctx.fillStyle='#0a0518';ctx.fillRect(0,0,W,H);
 for(const st of stars){const tw=0.45+0.55*Math.abs(Math.sin(G.t*1.2+st.p));ctx.globalAlpha=tw*0.8;ctx.fillStyle=st.c;ctx.fillRect(((Math.round(st.x-CAM.x*0.15)%W)+W)%W,((Math.round(st.y-CAM.y*0.15)%H)+H)%H,1,1)}ctx.globalAlpha=1;
 const sx=G.shake?randi(-Math.round(G.shake),Math.round(G.shake)):0,sy=G.shake?randi(-Math.round(G.shake),Math.round(G.shake)):0;ctx.save();ctx.translate(sx-CAM.x,sy-CAM.y);
 ctx.save();ctx.beginPath();ctx.rect(AR.x,AR.y,AR.w,AR.h);ctx.clip();ctx.fillStyle=floorPat;ctx.fillRect(AR.x,AR.y,AR.w,AR.h);for(const bt of G.beats)pxCircle(ctx,P.x,P.y,bt.r,'#4f2a94',Math.max(0,bt.a)*0.7);ctx.restore();
 const hurtG=P.hurtT>0;ctx.fillStyle=hurtG?'#ff4d4d':'#4a2a8f';ctx.fillRect(AR.x-1,AR.y-1,AR.w+2,1);ctx.fillRect(AR.x-1,AR.y+AR.h,AR.w+2,1);ctx.fillRect(AR.x-1,AR.y-1,1,AR.h+2);ctx.fillRect(AR.x+AR.w,AR.y-1,1,AR.h+2);ctx.fillStyle=hurtG?'#ff4d4d':'#22e6ff';[[AR.x-2,AR.y-2],[AR.x+AR.w-2,AR.y-2],[AR.x-2,AR.y+AR.h-2],[AR.x+AR.w-2,AR.y+AR.h-2]].forEach(c=>ctx.fillRect(c[0],c[1],4,4));
 for(const z of G.zones){const a=z.done?clamp(z.life/z.max,0,1):0.35+0.3*Math.abs(Math.sin(G.t*14));pxCircle(ctx,z.x,z.y,z.r,z.col,a);if(!z.done)pxCircle(ctx,z.x,z.y,z.r*clamp(1-z.tel/0.9,0,1),z.col,0.5)}
 for(const s of G.shocks)pxCircle(ctx,s.x,s.y,s.r,s.col,0.8);
 for(const rg of G.rings)pxCircle(ctx,rg.x,rg.y,rg.r,rg.c,clamp(rg.l/rg.m,0,1));
 for(const dp of G.drops){if(dp.l<3&&Math.floor(dp.l*8)%2===0)continue;const bob=Math.round(Math.sin(G.t*4+dp.sp)),s=dp.type==='shard'?SPR.shard:SPR.med;ctx.drawImage(s.n,Math.round(dp.x-s.w/2),Math.round(dp.y-s.h/2)+bob)}
 for(const b of G.beams){const x2=b.x+Math.cos(b.ang)*b.len,y2=b.y+Math.sin(b.ang)*b.len;line(ctx,b.x,b.y,x2,y2,b.col,b.width*2,0.25);line(ctx,b.x,b.y,x2,y2,'#ffffff',1,0.8)}
 for(const e of G.enemies){
  if(e.type==='medic'&&e.beam)line(ctx,e.x,e.y,e.beam.x,e.beam.y,'#9dff3c',1,0.7);
  if(e.type==='shielder'&&e.guardId!=null){const g=G.enemies.find(o=>o.id===e.guardId&&!o.dead);if(g)line(ctx,e.x,e.y,g.x,g.y,'#4d8cff',1,0.25)}
  if(e.type==='shielder'&&e.slot===0&&(e.mode==='circle'||e.mode==='guard')&&e.ar>0)pxCircle(ctx,e.ax,e.ay,e.ar,'#4d8cff',0.22);
  if(e.type==='sniper'&&e.tel>0){const pulse=Math.floor(G.t*16)%2===0;ctx.fillStyle=pulse?'#ffffff':'#ff4d4d';for(let q=8;q<440;q+=5)ctx.fillRect(Math.round(e.x+Math.cos(e.lock)*q),Math.round(e.y+Math.sin(e.lock)*q),1,1)}
  if(e.type==='emitter'&&e.tel>0){const pulse=Math.floor(G.t*16)%2===0;pxCircle(ctx,e.x,e.y,e.r+5,pulse?'#ffffff':'#22e6ff',0.8)}
  if(e.tel>0&&e.type!=='sniper'&&e.type!=='emitter'){const pulse=Math.floor(G.t*16)%2===0;pxCircle(ctx,e.x,e.y,e.r+4+Math.round(Math.sin(G.t*12)),pulse?'#ffffff':e.col,0.85);if(e.st==='charge'||e.atk==='charge'){const lx=Math.cos(e.lock),ly=Math.sin(e.lock);for(let q=6;q<70;q+=4){ctx.fillStyle=pulse?'#ffffff':'#ff4d4d';ctx.fillRect(Math.round(e.x+lx*q),Math.round(e.y+ly*q),2,2)}}}
  const ang=e.boss?(e.bossKind==='phantom'?e.t*0.8:e.t*0.35):((e.type==='shooter'||e.type==='tank'||e.type==='sniper'||e.type==='emitter')?Math.atan2(P.y-e.y,P.x-e.x):(e.type==='shielder'?e.face:Math.atan2(e.vy,e.vx)));
  drawSpr(ctx,e.spr,e.x,e.y,ang,e.fl>0&&Math.floor(G.t*30)%2===0,1);
  if(e.type==='shielder'){const col=e.shieldFl>0?'#ffffff':'#22e6ff';for(let t=-1.1;t<=1.1;t+=0.16){ctx.fillStyle=col;ctx.fillRect(Math.round(e.x+Math.cos(e.face+t)*(e.r+3)),Math.round(e.y+Math.sin(e.face+t)*(e.r+3)),2,2)}}
  if(e.bossKind==='prism'){for(let k=0;k<3;k++){const a0=e.shieldAng+k*TAU/3;for(let t=-0.5;t<=0.5;t+=0.12){ctx.fillStyle=e.shieldFl>0?'#ffffff':'#22e6ff';ctx.fillRect(Math.round(e.x+Math.cos(a0+t)*(e.r+5)),Math.round(e.y+Math.sin(a0+t)*(e.r+5)),2,2)}}}
  if(e.type==='tank'||e.type==='shielder'||e.type==='medic'||e.type==='emitter'){const f=clamp(e.hp/e.max,0,1),bw=16;ctx.fillStyle='#0a0518';ctx.fillRect(Math.round(e.x-bw/2)-1,Math.round(e.y-e.r-6),bw+2,4);ctx.fillStyle='#241452';ctx.fillRect(Math.round(e.x-bw/2),Math.round(e.y-e.r-5),bw,2);ctx.fillStyle=e.type==='medic'?'#9dff3c':(f>0.5?'#9dff3c':(f>0.25?'#ffb020':'#ff4d4d'));ctx.fillRect(Math.round(e.x-bw/2),Math.round(e.y-e.r-5),Math.round(bw*f),2)}}
 for(const eb of G.ebul)ctx.drawImage(eb.spr.n,Math.round(eb.x-2),Math.round(eb.y-2));
 for(const r of G.rockets)drawSpr(ctx,SPR.rocket,r.x,r.y,r.a,false,1);
 if(G.state!=='title'){for(const gh of G.ghost)drawSpr(ctx,SPR.ship,gh.x,gh.y,gh.a,false,clamp(gh.l/gh.m,0,1)*0.35);
  for(let i=0;i<S.drones;i++){const a2=G.t*1.8+i*TAU/S.drones;drawSpr(ctx,SPR.drone,P.x+Math.cos(a2)*16,P.y+Math.sin(a2)*16,a2*2,false,1)}
  if(S.healDrone){const a=G.t*1.2+Math.PI;drawSpr(ctx,SPR.healdrone,P.x+Math.cos(a)*18,P.y+Math.sin(a)*18,a*2,false,1);if(P.hp<P.max)line(ctx,P.x,P.y,P.x+Math.cos(a)*18,P.y+Math.sin(a)*18,'#9dff3c',1,0.25)}
  const blink=P.inv>0&&Math.floor(G.t*20)%2===0;if(!blink){const spd=hyp(P.vx,P.vy);if(spd>18){const bx=P.x-Math.cos(P.aim)*8,by=P.y-Math.sin(P.aim)*8;ctx.fillStyle=Math.floor(G.t*24)%2===0?'#22e6ff':'#b8fbff';ctx.fillRect(Math.round(bx)-1,Math.round(by)-1,2,2)}drawSpr(ctx,SPR.ship,P.x,P.y,P.aim,P.hurtT>0&&Math.floor(G.t*30)%2===0,1)}
  if(P.shield>0)pxCircle(ctx,P.x,P.y,9,'#a86bff',0.3+0.5*(P.shield/S.shieldMax));
  if(P.beamT>0){const x2=P.x+Math.cos(P.aim)*280,y2=P.y+Math.sin(P.aim)*280;line(ctx,P.x,P.y,x2,y2,'#ff2fb0',7,0.25);line(ctx,P.x,P.y,x2,y2,'#ffffff',2,0.9)}
  const pr=P.dashCd<=0?1:1-P.dashCd/S.dashCd;pxCircle(ctx,P.x,P.y,11,P.dashCd<=0?'#22e6ff':'#4a2a8f',0.3+0.2*pr);
  if(!isTouch&&G.t-mouseT<4){const wx=mx+CAM.x,wy=my+CAM.y;ctx.fillStyle=P.focus?'#9dff3c':'#22e6ff';ctx.fillRect(Math.round(wx)-3,Math.round(wy),7,1);ctx.fillRect(Math.round(wx),Math.round(wy)-3,1,7)}
  ctx.globalAlpha=0.5;for(let q=10;q<26;q+=4){ctx.fillStyle='#9dff3c';ctx.fillRect(Math.round(P.x+Math.cos(P.aim)*q),Math.round(P.y+Math.sin(P.aim)*q),1,1)}ctx.globalAlpha=1}
 for(const bl of G.bul){ctx.save();ctx.translate(Math.round(bl.x),Math.round(bl.y));ctx.rotate(bl.a);if(bl.dr){ctx.fillStyle='#9dff3c';ctx.fillRect(-2,-1,4,2);ctx.fillStyle='#ffffff';ctx.fillRect(0,-1,1,2)}else ctx.drawImage(SPR.bolt.n,-2,-2);ctx.restore()}
 for(const pp of G.parts){const al=clamp(pp.l/pp.m,0,1);ctx.globalAlpha=al>0.35?1:0.55;ctx.fillStyle=pp.c;const sz=pp.s+(al>0.7?1:0);ctx.fillRect(Math.round(pp.x),Math.round(pp.y),sz,sz)}ctx.globalAlpha=1;
 for(const fl of G.floats){if(fl.l<0.2&&Math.floor(fl.l*30)%2===0)continue;const w=pxTextW(fl.t,fl.s);pxText(ctx,fl.t,fl.x-w/2+1,fl.y+1,'#0a0518',fl.s);pxText(ctx,fl.t,fl.x-w/2,fl.y,fl.c,fl.s)}
 if(isTouch&&G.state==='play'){['move','aim'].forEach(k=>{const s=sticks[k];if(s.id===null)return;const col=k==='move'?'#22e6ff':'#ff2fb0';pxCircle(ctx,s.ox+CAM.x,s.oy+CAM.y,22,col,0.45);pxDisc(ctx,s.ox+CAM.x+s.dx*22,s.oy+CAM.y+s.dy*22,7,col,0.75)})}
 ctx.restore();
 const mw=64,mh=Math.round(WORLD.h/WORLD.w*mw),mx0=W-mw-6,my0=VIEW.y+6,sc=mw/WORLD.w;ctx.globalAlpha=0.8;ctx.fillStyle='#150a2e';ctx.fillRect(mx0,my0,mw,mh);ctx.strokeStyle='#4a2a8f';ctx.strokeRect(mx0+0.5,my0+0.5,mw-1,mh-1);ctx.fillStyle='#22e6ff';ctx.fillRect(mx0+CAM.x*sc,my0+CAM.y*sc,W*sc,H*sc);
 for(const e of G.enemies){ctx.fillStyle=e.boss?'#ff4d4d':(e.type==='medic'?'#9dff3c':e.type==='shielder'?'#4d8cff':e.type==='sniper'?'#a86bff':e.type==='emitter'?'#22e6ff':'#ff2fb0');ctx.fillRect(mx0+e.x*sc,my0+e.y*sc,e.boss?3:1,e.boss?3:1)}
 ctx.fillStyle='#9dff3c';ctx.fillRect(mx0+P.x*sc-1,my0+P.y*sc-1,2,2);ctx.globalAlpha=1;
 if(G.flash>0){ctx.globalAlpha=Math.min(0.55,G.flash);ctx.fillStyle=G.flashCol;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
 if(G.state==='play'&&P.hp/P.max<0.3){const pl=0.4+0.6*Math.abs(Math.sin(G.t*4));ctx.globalAlpha=pl;ctx.fillStyle='#ff4d4d';ctx.fillRect(0,VIEW.y,W,1);ctx.fillRect(0,VIEW.y+VIEW.h-1,W,1);ctx.fillRect(0,VIEW.y,1,VIEW.h);ctx.fillRect(W-1,VIEW.y,1,VIEW.h);ctx.globalAlpha=1}
                           }
