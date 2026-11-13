import { PAL, ICON } from './constants.js';
export function mkC(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
export function tint(src,col){const c=mkC(src.width,src.height),g=c.getContext('2d');g.drawImage(src,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,c.width,c.height);return c}
export function spr(rows,map){let w=0;for(let i=0;i<rows.length;i++)w=Math.max(w,rows[i].length);const c=mkC(w,rows.length),g=c.getContext('2d'),m=map||PAL;for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++){const ch=rows[y][x];if(ch==='.'||ch===' ')continue;const col=m[ch];if(!col)continue;g.fillStyle=col;g.fillRect(x,y,1,1)}return{n:c,f:tint(c,'#ffffff'),w,h:rows.length}}

function bossSpriteFor(kind){
 const s=31,c=mkC(s,s),g=c.getContext('2d'),cx=15,cy=15;
 const pal={guardian:['#ff4d4d','#8f2020','#ff2fb0'],hive:['#9dff3c','#4d8f1e','#ff2fb0'],prism:['#22e6ff','#1e4f8f','#a86bff'],hammer:['#ffb020','#8f5a10','#ff4d4d'],eye:['#a86bff','#4f2a94','#ffffff'],phantom:['#ff2fb0','#8f1a63','#22e6ff']}[kind];
 for(let y=0;y<s;y++)for(let x=0;x<s;x++){
  const dx=x-cx,dy=y-cy;let m;
  if(kind==='prism')m=Math.abs(dx)+Math.abs(dy);
  else if(kind==='hammer')m=Math.max(Math.abs(dx),Math.abs(dy));
  else if(kind==='phantom')m=Math.abs(dx)*0.8+Math.max(0,dy)*0.9;
  else if(kind==='hive')m=Math.sqrt(dx*dx+dy*dy)+Math.sin(Math.atan2(dy,dx)*6)*1.5;
  else m=Math.max(Math.abs(dx)*0.88+Math.abs(dy)*0.5,Math.abs(dy));
  const d=Math.sqrt(dx*dx+dy*dy);let col=null;
  if(m<14.5)col='#0a0518';if(m<13.5)col=pal[0];if(m<11)col=pal[1];if(m<9)col='#150a2e';if(m<7.5)col=pal[2];if(d<4)col='#ffffff';if(d<2)col='#0a0518';
  if(col){g.fillStyle=col;g.fillRect(x,y,1,1)}
 }
 return{n:c,f:tint(c,'#ffffff'),w:s,h:s};
}
function orb(col,lit){return spr(['.ooo.','oXXXo','oXWXo','oXXXo','.ooo.'],{o:'#0a0518',X:col,W:lit||'#fff'})}
function floorTile(){const t=mkC(16,16),g=t.getContext('2d');g.fillStyle='#150a2e';g.fillRect(0,0,16,16);g.fillStyle='#1b0f38';for(let y=0;y<16;y+=2)for(let x=((y/2)%2)*2;x<16;x+=4)g.fillRect(x,y,1,1);g.fillStyle='#241452';g.fillRect(0,0,16,1);g.fillRect(0,0,1,16);g.fillStyle='#2e1a63';g.fillRect(7,7,2,2);g.fillStyle='#0f0726';g.fillRect(15,0,1,16);g.fillRect(0,15,16,1);return t}
export function iconCanvas(k,col,scale){const rows=ICON[k]||ICON.cal,c=mkC(9,9),g=c.getContext('2d');for(let y=0;y<9;y++)for(let x=0;x<rows[y].length;x++){const ch=rows[y][x];if(ch==='.')continue;g.fillStyle=ch==='o'?'#0a0518':ch==='w'?'#ffffff':col;g.fillRect(x,y,1,1)}const out=mkC(9,9);out.getContext('2d').drawImage(c,0,0);out.style.width=(9*(scale||4))+'px';out.style.height=(9*(scale||4))+'px';return out}

export const SPR={};
SPR.ship=spr(['.....oo......','....occo.....','...ocCwco....','..ocCwWwco...','.ogcCwWwCco..','oggcCwWWwCcoo','.ogcCwWwCco..','..ocCwWwco...','...ocCwco....','....occo.....','.....oo......']);
SPR.grunt=spr(['....oo.....','...ommo....','..omMMmo...','.omMwwMmo..','omMwWWwMmo.','omMwWWwMmoo','omMwWWwMmo.','.omMwwMmo..','..omMMmo...','...ommo....','....oo.....']);
SPR.mini=spr(['..oo...','.ovvo..','ovVWvo.','ovwVvoo','ovVVvo.','.ovvo..','..oo...']);
SPR.shooter=spr(['...ooooo.....','..oaaaaao....','.oaAAAAAao...','oaAAaaaAAao..','oaAawwwAaAao.','oaAawWWwaAaoo','oaAawWWwaAaoo','oaAawwwAaAao.','oaAAaaaAAao..','.oaAAAAAao...','..oaaaaao....','...ooooo.....']);
SPR.splitter=spr(['..ooooooooo..','.ovvvvvvvvvo.','ovVVVVVVVVVvo','ovVvvvvvvvVvo','ovVvVVVVVvVvo','ovVvVwwwVvVvo','ovVvVwWwVvVvo','ovVvVwwwVvVvo','ovVvVVVVVvVvo','ovVvvvvvvvVvo','ovVVVVVVVVVvo','.ovvvvvvvvvo.','..ooooooooo..']);
SPR.tank=spr(['......ooooooo........','....oorrrrrrroo......','..oorRRRRRRRRRroo....','.orRRRRRRRRRRRRRro...','orRRRrrrrrrrrrRRRro..','orRRrRRRRRRRRRrRRRro.','orRrRRRwwwwwRRRrRRro.','orRrRRwwWWWwwRRrRRroo','orRrRRwWWWWWwRRrRRrro','orRrRRwwWWWwwRRrRRroo','orRrRRRwwwwwRRRrRRro.','orRRrRRRRRRRRRrRRRro.','orRRRrrrrrrrrrRRRro..','.orRRRRRRRRRRRRRro...','..oorRRRRRRRRRroo....','....oorrrrrrroo......','......ooooooo........']);
SPR.shielder=spr(['....ooooo....','...obbbbbo...','..obBBBBBbo..','.obBBwwwBBbo.','obBBwWWWwBBbc','obBBwWWWwBBcc','obBBwWWWwBBcc','obBBwWWWwBBbc','.obBBwwwBBbo.','..obBBBBBbo..','...obbbbbo...','....ooooo....']);
SPR.sniper=spr(['......ooo......','.....ovvvo.....','....ovVVVvo....','...ovVwwwVvo...','..ovVwWWWwVvooo','.ovVwWWWWWvvoVV','..ovVwWWWwVvooo','...ovVwwwVvo...','....ovVVVvo....','.....ovvvo.....','......ooo......']);
SPR.medic=spr(['...ooooo...','..ogggggo..','.ogGGWGGgo.','ogGGWWWGGgo','ogGWWWWWGgo','ogGGWWWGGgo','.ogGGWGGgo.','..ogggggo..','...ooooo...']);
SPR.emitter=spr(['....ooooo....','...occcc co..','..ocCCCCCco..','.ocCCwwwCCco.','ocCCwWWWwCCco','ocCCwWWWwCCco','ocCCwWWWwCCco','.ocCCwwwCCco.','..ocCCCCCco..','...occccco...','....ooooo....']);
SPR.clone=spr(['..oo...','.ommo..','omMWmo.','omwMmoo','omMMmo.','.ommo..','..oo...']);
SPR.shard=spr(['...o...','..omo..','.omMmo.','omwWMmo','.omMmo.','..omo..','...o...']);
SPR.med=spr(['..ooooo..','..ogggo..','..ogGgo..','ooggGggoo','ogGGWGGgo','ooggGggoo','..ogGgo..','..ogggo..','..ooooo..']);
SPR.drone=spr(['..oo...','.oggo..','ogGwgo.','ogwWGgo','ogGwgo.','.oggo..','..oo...']);
SPR.healdrone=spr(['..oo...','.oggo..','ogWwgo.','ogWWGgo','ogWwgo.','.oggo..','..oo...']);
SPR.bolt=spr(['.ccC','cCWW','cCWW','.ccC']);
SPR.rocket=spr(['..oo...','.oaao..','oaWWaoo','.oaao..','..oo...']);
SPR.bosses={guardian:bossSpriteFor('guardian'),hive:bossSpriteFor('hive'),prism:bossSpriteFor('prism'),hammer:bossSpriteFor('hammer'),eye:bossSpriteFor('eye'),phantom:bossSpriteFor('phantom')};
SPR.boss=SPR.bosses.guardian;
SPR.orbM=orb('#ff2fb0','#ffd6f2');SPR.orbA=orb('#ffb020','#fff0cf');SPR.orbR=orb('#ff4d4d','#ffd9d9');SPR.orbV=orb('#a86bff','#e8dcff');SPR.orbC=orb('#22e6ff','#b8fbff');
export const floorPattern=floorTile();
