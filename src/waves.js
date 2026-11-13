import { rand,randi,pick,clamp,TAU,MAX_WAVE,BOSS_WAVES,BOSS_NAMES } from './constants.js';
import { G,P,AR } from './state.js';
import { DIFF } from './constants.js';
import { ring,float } from './effects.js';
import { A } from './audio.js';
import { spawn,spawnAt,edge } from './entities/enemy.js';
import { addScore } from './combat.js';
import { banner,popChip } from './ui.js';

let groupCounter=0,groupAnchor={};
function pushShieldGroup(at){const size=randi(3,4),gid=++groupCounter;for(let i=0;i<size;i++)G.queue.push({type:'shielder',at:at+i*0.08,group:gid,slot:i})}

export function buildWave(n){G.queue=[];const D=DIFF[G.diff];let t=0.5;
 if(BOSS_WAVES[n]){const kind=BOSS_WAVES[n];G.queue.push({type:'boss',at:0.8});
  const adds=4+Math.floor(n/3);for(let i=0;i<adds;i++)G.queue.push({type:i%4===3?'shooter':'grunt',at:2.2+i*0.5});
  if(n>=10)pushShieldGroup(5);if(n>=15)G.queue.push({type:'sniper',at:7});if(n>=20)G.queue.push({type:'medic',at:6});if(n>=25)G.queue.push({type:'emitter',at:8});return}
 let budget=(6+n*2.7)*D.budget;const pool=[['grunt',1]];
 if(n>=2)pool.push(['shooter',2]);if(n>=3)pool.push(['splitter',2.5]);if(n>=4){pool.push(['tank',4]);pool.push(['sniper',3])}
 if(n>=5)pool.push(['medic',3.5]);if(n>=8)pool.push(['emitter',4]);if(n>=12)pool.push(['shielder',3]);
 let guard=0,hasShield=false,hasSniper=false;
 const groups=n>=6?1+Math.floor((n-6)/7):0;
 for(let g=0;g<groups;g++){pushShieldGroup(t+g*2.2);hasShield=true;budget-=6}
 while(budget>0&&guard++<160){const av=pool.filter(p=>p[1]<=budget+0.5);if(!av.length)break;const gs=randi(1,Math.min(5,2+Math.floor(n/5)));
  for(let i=0;i<gs;i++){const p=pick(av);budget-=p[1];if(p[0]==='sniper')hasSniper=true;if(p[0]==='shielder'){pushShieldGroup(t);hasShield=true}else G.queue.push({type:p[0],at:t+i*rand(0.14,0.3)})}
  t+=rand(0.75,1.5)*clamp(1.2-n*0.02,0.5,1.2)}
 if(hasShield&&n>=4&&!hasSniper)G.queue.push({type:'sniper',at:t+0.5});
 G.queue.sort((a,b)=>a.at-b.at)}

export function startWave(n){G.wave=n;G.waveT=0;G.active=true;groupAnchor={};buildWave(n);
 const kind=BOSS_WAVES[n];banner(kind?BOSS_NAMES[kind]:'ВОЛНА '+n,kind?'УНИЧТОЖЬ ЯДРО':'ЗАЧИСТИ АРЕНУ');if(kind)A.bossIn();else A.wave();document.getElementById('cWave').textContent=n;popChip('.chip.w')}
export function waveClear(){G.active=false;G.boss=null;document.getElementById('bossbar').classList.remove('on');const bonus=100+G.wave*35;addScore(bonus);G.shards+=3+Math.floor(G.wave/2);float(P.x,P.y-12,'+'+bonus,'#9dff3c',1);ring(P.x,P.y,4,40,'#9dff3c',0.6);A.up();G.state='clear';G.clearT=0.75}
export function updateSpawns(){while(G.queue.length&&G.queue[0].at<=G.waveT&&G.enemies.length<28){const q=G.queue.shift();
 if(q.type==='shielder'&&q.group!=null){if(!groupAnchor[q.group])groupAnchor[q.group]=edge();const a=groupAnchor[q.group],ang=q.slot*TAU/4,x=clamp(a.x+Math.cos(ang)*11,AR.x+10,AR.x+AR.w-10),y=clamp(a.y+Math.sin(ang)*11,AR.y+10,AR.y+AR.h-10);spawnAt('shielder',x,y,{group:q.group,slot:q.slot})}
 else{const e=spawn(q.type);if(e.boss){G.boss=e;document.getElementById('bossbar').classList.add('on');document.getElementById('bossName').textContent=e.bossName}}}
