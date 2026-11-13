import { G,P,S,store,isTouch } from './state.js';
import { DIFF,fmt } from './constants.js';
import { A } from './audio.js';
import { recalc } from './player.js';
import { newRun,pause,resume,toMenu } from './game.js';

const SCR={title:'#sTitle',up:'#sUp',pause:'#sPause',over:'#sOver',win:'#sWin'};
const WN={rocket:'РАКЕТА',wave:'ВОЛНА',beam:'ЛУЧ'};
export function setState(s){G.state=s;for(const k in SCR)document.querySelector(SCR[k]).classList.remove('on');if(SCR[s])document.querySelector(SCR[s]).classList.add('on')}
export function banner(a,b){const el=document.getElementById('banner');el.querySelector('b').textContent=a;el.querySelector('s').textContent=b;el.classList.remove('go');void el.offsetWidth;el.classList.add('go')}
export function popChip(sel){const el=document.querySelector(sel);if(!el)return;el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit')}
export function syncBest(){document.getElementById('tBest').textContent=fmt(G.best.score);document.getElementById('tWave').textContent=G.best.wave;document.getElementById('tRuns').textContent=G.runs}
export function saveBest(){const rec=G.score>G.best.score;if(rec){G.best={score:G.score,wave:G.wave};store.set('best',G.best)}else if(G.wave>G.best.wave){G.best.wave=G.wave;store.set('best',G.best)}syncBest();return rec}
export function statsHTML(){const acc=G.st.shots?Math.round(G.st.hits/G.st.shots*100):0;const m=Math.floor(G.st.time/60),s=Math.floor(G.st.time%60);let mods=0;for(const k in P.lvl)mods+=P.lvl[k];return[['ВОЛНА',G.wave,''],['СЧЁТ',fmt(G.score),'g'],['УБИЙСТВ',G.kills,'m'],['ТОЧНОСТЬ',acc+'%','a'],['МОДУЛЕЙ',mods,''],['ВРЕМЯ',m+':'+(s<10?'0':'')+s,'g']].map(x=>'<div class="stat '+x[2]+'"><s>'+x[0]+'</s><b>'+x[1]+'</b></div>').join('')}
export function toggleSound(){A.init();A.setOn(!A.on);A.resume();syncSound();if(A.on)A.tone(660,0.1,'square',0.08,1.3)}
export function syncSound(){const b=document.getElementById('bSound');b.classList.toggle('off',!A.on);b.textContent=A.on?'♪':'x';b.title=A.on?'Звук включён':'Звук выключен'}
export function syncDiff(){document.querySelectorAll('[data-diff]').forEach(p=>p.classList.toggle('on',p.getAttribute('data-diff')===G.diff))}
export function buildDiffButtons(){const el=document.getElementById('diffPills');Object.keys(DIFF).forEach(k=>{const b=document.createElement('button');b.className='pill';b.type='button';b.setAttribute('data-diff',k);b.innerHTML=DIFF[k].n+'<small>'+DIFF[k].d+'</small>';b.addEventListener('click',()=>{G.diff=k;store.set('diff',k);recalc();syncDiff();A.init();A.tone(440,0.07,'square',0.06,1.3)});el.appendChild(b)});syncDiff()}
export function buildKeys(){const K=isTouch?[['ЛЕВО','ход · двойной тап = рывок'],['ПРАВО','прицел · двойной тап = оружие'],['ОГОНЬ','автоматически']]:[['W A S D','движение'],['МЫШЬ','прицел'],['ПРОБЕЛ','рывок'],['ЛКМ','активное оружие'],['SHIFT','точный ход'],['P / R','пауза / заново']];
 ['#keys1','#keys2'].forEach(sel=>{const el=document.querySelector(sel);el.innerHTML='';K.forEach(k=>{const d=document.createElement('div');d.className='key';d.innerHTML='<kbd>'+k[0]+'</kbd><span>'+k[1]+'</span>';el.appendChild(d)})});
 const kh=document.getElementById('keyhint');if(kh)kh.innerHTML='<b>WASD</b> ход · <b>МЫШЬ</b> прицел<br><b>ПРОБЕЛ</b> рывок · <b>ЛКМ</b> оружие · <b>SHIFT</b> точный ход';
 const th=document.getElementById('touchhint');if(th)th.innerHTML='<b>2×ТАП СЛЕВА</b> — рывок<br><b>2×ТАП СПРАВА</b> — оружие'}
let hudT=0,lScore=-1,lShards=-1;
export function hud(dt){hudT+=dt;const hf=Math.min(Math.max(P.hp/P.max,0),1);document.getElementById('hpFill').style.transform='scaleX('+hf+')';document.getElementById('hpBar').classList.toggle('low',hf<0.34);document.getElementById('stage').classList.toggle('low',G.state==='play'&&hf<0.3);
 const dp=P.dashCd<=0?1:1-P.dashCd/S.dashCd;document.getElementById('dashFill').style.transform='scaleX('+dp+')';
 const shBar=document.getElementById('shBar');shBar.style.display=S.shieldMax?'block':'none';if(S.shieldMax)document.getElementById('shFill').style.transform='scaleX('+Math.min(1,P.shield/S.shieldMax)+')';
 const rkBar=document.getElementById('rkBar');rkBar.style.display=S.weapon?'block':'none';if(S.weapon){rkBar.title=WN[S.weapon]||'Оружие';document.getElementById('rkFill').style.transform='scaleX('+(S.weaponCdMax?1-P.weaponCd/S.weaponCdMax:0)+')'}
 document.getElementById('comboFill').style.transform='scaleX('+Math.min(Math.max(G.comboT/2.4,0),1)+')';document.getElementById('comboBox').classList.toggle('hot',G.combo>=8);
 if(hudT>0.1){hudT=0;document.getElementById('hpTxt').textContent=Math.ceil(P.hp);document.getElementById('comboTxt').textContent='x'+G.mult.toFixed(1);if(G.score!==lScore){lScore=G.score;document.getElementById('cScore').textContent=fmt(G.score)}if(G.shards!==lShards){lShards=G.shards;document.getElementById('cShards').textContent=G.shards}}}
export function initButtons(){document.getElementById('bStart').addEventListener('click',newRun);document.getElementById('bSound').addEventListener('click',toggleSound);document.getElementById('bPause').addEventListener('click',()=>{if(G.state==='play')pause();else if(G.state==='pause')resume()});document.getElementById('bRestart').addEventListener('click',newRun);document.getElementById('bResume').addEventListener('click',resume);document.getElementById('bRestart2').addEventListener('click',newRun);document.getElementById('bMenu2').addEventListener('click',toMenu);document.getElementById('bAgain').addEventListener('click',newRun);document.getElementById('bMenu').addEventListener('click',toMenu);document.getElementById('bAgain2').addEventListener('click',newRun);document.getElementById('bMenu3').addEventListener('click',toMenu)}
