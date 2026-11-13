import { UPS,pick } from './constants.js';
import { G,P } from './state.js';
import { recalc } from './player.js';
import { healPlayer } from './combat.js';
import { flash,ring,part } from './effects.js';
import { A } from './audio.js';
import { startWave } from './waves.js';
import { setState } from './ui.js';
import { iconCanvas } from './sprites.js';

export let offer=[];
export function roll(){const pool=UPS.filter(u=>{if((P.lvl[u.k]||0)>=u.cap)return false;if(u.weapon&&P.weapon&&u.k!==P.weapon)return false;return true});
 offer=[];let guard=0;while(offer.length<Math.min(3,pool.length)&&guard++<80){const u=pick(pool);if(offer.indexOf(u)<0)offer.push(u)}}
export function openUp(){setState('up');roll();renderCards();document.getElementById('upEye').textContent='ВОЛНА '+G.wave+' ЗАЧИЩЕНА · +'+(3+Math.floor(G.wave/2))+'◆';syncShop()}
export function renderCards(){const el=document.getElementById('cards');el.innerHTML='';offer.forEach((u,i)=>{const lv=P.lvl[u.k]||0,b=document.createElement('button');b.className='card';b.type='button';let pips='';for(let j=0;j<u.cap;j++)pips+='<i class="'+(j<lv?'f':'')+'"></i>';b.innerHTML='<span class="num">'+(i+1)+'</span><h4>'+u.n+'</h4><p>'+u.d+'</p><div class="lv">'+pips+'</div>';b.insertBefore(iconCanvas(u.k,u.col,4),b.firstChild);b.addEventListener('click',()=>choose(i));el.appendChild(b)})}
export function syncShop(){document.getElementById('upShards').textContent=G.shards;document.getElementById('sRepair').disabled=G.shards<12||P.hp>=P.max;document.getElementById('sReroll').disabled=G.shards<6}
export function choose(i){if(G.state!=='up')return;const u=offer[i];if(!u)return;if(u.weapon&&!P.weapon)P.weapon=u.k;P.lvl[u.k]=(P.lvl[u.k]||0)+1;recalc();if(u.k==='armor')healPlayer(25);A.up();flash(0.15,'#22e6ff');ring(P.x,P.y,3,44,'#9dff3c',0.5);part(P.x,P.y,'#9dff3c',16,90,0.5,1);nextWave()}
export function nextWave(){setState('play');P.inv=Math.max(P.inv,1);startWave(G.wave+1)}
export function initShopButtons(){document.getElementById('sRepair').addEventListener('click',()=>{if(G.shards<12||P.hp>=P.max)return;G.shards-=12;healPlayer(35);A.heal();syncShop()});document.getElementById('sReroll').addEventListener('click',()=>{if(G.shards<6)return;G.shards-=6;roll();renderCards();A.tone(600,0.09,'square',0.07,1.4);syncShop()});document.getElementById('sSkip').addEventListener('click',()=>{G.shards+=8;A.pick(3);nextWave()})}
