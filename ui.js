'use strict';
var SCR={title:'#sTitle',gloss:'#sGloss',up:'#sUp',shop:'#sShop',pause:'#sPause',over:'#sOver',win:'#sWin'};
function setState(s){G.state=s;G.padSel=0;P.padSel=0;P2.padSel=0;resetSticks();clearSel();
for(var k in SCR){var el=$(SCR[k]);if(el)el.classList.remove('on')}
if(SCR[s])$(SCR[s]).classList.add('on');
if(s==='pause')syncCheatUI();if(s==='title'){buildTitleCols();syncEndlessBtn()}if(s==='gloss')buildGloss();
if(s!=='play')$('#capTimer').classList.remove('on');
var sc=$(SCR[s]);if(sc)sc.scrollTop=0}
function banner(a,b){var el=$('#banner');el.classList.remove('dread');el.querySelector('b').textContent=a;
el.querySelector('s').textContent=b||'';el.classList.remove('go');void el.offsetWidth;el.classList.add('go')}
function bannerDread(a){var el=$('#banner');el.querySelector('b').textContent=a;el.querySelector('s').textContent='';
el.classList.remove('go');void el.offsetWidth;el.classList.add('dread');el.classList.add('go')}
function syncBest(){$('#tBest').textContent=fmt(G.best.score);$('#tWave').textContent=META.bestDepth;
$('#tEndless').textContent=META.bestEndless;$('#tRuns').textContent=META.runs}
function saveBest(){var rec=G.score>G.best.score;if(rec){G.best={score:G.score,wave:G.wave};storeSet('best',G.best)}
if(G.endless){if(G.wave>META.bestEndless)META.bestEndless=G.wave}else if(G.wave>META.bestDepth)META.bestDepth=G.wave;
saveMeta();syncBest();return rec}
function bankFrags(){META.runs++;saveMeta()}
function statsHTML(){var acc=G.st.shots?Math.round(G.st.hits/G.st.shots*100):0,m=Math.floor(G.st.time/60),s=Math.floor(G.st.time%60),mods=0,L=localPlayer().lvl;
for(var k in L){var v=L[k];if(typeof v==='number'&&isFinite(v))mods+=v}
return[['УРОВЕНЬ',G.wave+(G.endless?'∞':''),''],['СЧЁТ',fmt(G.score),'g'],['УБИЙСТВ',G.kills,'m'],['ТОЧНОСТЬ',acc+'%','a'],['МОДУЛЕЙ',mods,''],['ВРЕМЯ',m+':'+(s<10?'0':'')+s,'g']]
.map(function(x){return '<div class="stat '+x[2]+'"><s>'+x[0]+'</s><b>'+x[1]+'</b></div>'}).join('')}
function toggleSound(){A.init();A.resume();musUnlock();A.setOn(!A.on);syncSound();if(A.on)A.tone(660,.1,'square',.1,1.3,0,'ui')}
function syncSound(){var b=$('#bSound');b.classList.toggle('off',!A.on);b.textContent=A.on?'♪':'x'}
function setTheme(k){if(!THEMES[k])return;themeKey=k;THEME=THEMES[k];storeSet('theme',k);
var root=document.documentElement;for(var v in THEME.css)root.style.setProperty(v,THEME.css[v]);
applyThemePal();buildSprites();floorCanvas=makeFloor(AR.w,AR.h);initBackground();syncTheme();recalc();setupTouchButtons(true)}
function syncTheme(){document.querySelectorAll('[data-theme]').forEach(function(p){p.classList.toggle('on',p.getAttribute('data-theme')===themeKey)})}
function buildThemeButtons(){var el=$('#themePills');el.innerHTML='';
Object.keys(THEMES).forEach(function(k){var b=document.createElement('button');b.className='pill';b.type='button';
b.setAttribute('data-theme',k);b.setAttribute('data-own','0');b.textContent=THEMES[k].n;
b.addEventListener('click',function(){setTheme(k);A.init();A.tone(520,.07,'square',.08,1.3,0,'ui')});el.appendChild(b)});syncTheme();
var bt=$('#bloomToggle');bt.classList.toggle('on',bloomOn);bt.textContent='СВЕЧЕНИЕ: '+(bloomOn?'ВКЛ':'ВЫКЛ');
bt.addEventListener('click',function(){bloomOn=!bloomOn;storeSet('bloom',bloomOn);bt.classList.toggle('on',bloomOn);
bt.textContent='СВЕЧЕНИЕ: '+(bloomOn?'ВКЛ':'ВЫКЛ');A.init();A.tone(bloomOn?660:330,.07,'square',.08,1.2,0,'ui')});
if(!$('#vibToggle')){var vb=document.createElement('button');vb.className='pill'+(HAP.on?' on':'');vb.type='button';vb.id='vibToggle';vb.setAttribute('data-own','0');
vb.textContent='ВИБРО: '+(HAP.on?'ВКЛ':'ВЫКЛ');
vb.addEventListener('click',function(){HAP.set(!HAP.on);vb.classList.toggle('on',HAP.on);
vb.textContent='ВИБРО: '+(HAP.on?'ВКЛ':'ВЫКЛ');A.init();if(HAP.on)HAP.med()});bt.parentNode.appendChild(vb)}}
function buildKeys(){var K=[['ГЕЙМПАД 1','стики · LT рывок · RT оружие · Y смена'],['ГЕЙМПАД 2','игрок 2 в локальном co-op'],
['W A S D','P1 движение'],['МЫШЬ','прицел · ЛКМ оружие · КОЛЕСО смена'],['ПРОБЕЛ','рывок · удержи 1.5с гипер'],
['СТРЕЛКИ','P2 движение и меню'],['ENTER / /','P2 рывок / оружие'],['1 2 3 / 8 9 0','модули P1 / P2']];
['#keys1','#keys2'].forEach(function(sel){var el=$(sel);if(!el)return;el.innerHTML='';
K.forEach(function(k){var d=document.createElement('div');d.className='key';d.innerHTML='<kbd>'+k[0]+'</kbd><span>'+k[1]+'</span>';el.appendChild(d)})})}
function togglePanel(which){var ps=$('#panelSettings'),pc=$('#panelCoop'),bs=$('#bTabSettings'),bc=$('#bTabCoop');
if(!ps||!pc)return;
var wantS=which==='settings'?ps.classList.contains('hidden'):false,wantC=which==='coop'?pc.classList.contains('hidden'):false;
ps.classList.toggle('hidden',!wantS);pc.classList.toggle('hidden',!wantC);
if(bs)bs.classList.toggle('on',wantS);if(bc)bc.classList.toggle('on',wantC);
G.padSel=0;P.padSel=0;P2.padSel=0;clearSel();A.init();A.tone(wantS||wantC?620:380,.06,'square',.07,1.2,0,'ui');
var el=wantS?ps:wantC?pc:null;if(el)setTimeout(function(){try{el.scrollIntoView({block:'nearest'})}catch(e){}},40)}
function addFeedback(sel){var box=$(sel+' .box');if(!box||box.querySelector('.fb'))return;
var a=document.createElement('a');a.className='btn fb';a.setAttribute('data-own','0');a.href='https://t.me/Gooseetler';
a.target='_blank';a.rel='noopener';a.textContent='ОБРАТНАЯ СВЯЗЬ';a.style.marginTop='12px';a.style.display='inline-block';a.style.textDecoration='none';box.appendChild(a)}
function sliderRow(label,key,onChange){var row=document.createElement('div');row.className='volrow';
var lab=document.createElement('span');lab.className='vlab';lab.textContent=label;
var sl=document.createElement('input');sl.type='range';sl.min='0';sl.max='100';sl.className='vslide';sl.value=String(Math.round(VOL[key]*100));
var val=document.createElement('span');val.className='vval';val.textContent=sl.value+'%';
sl.addEventListener('input',function(){VOL[key]=parseInt(sl.value,10)/100;val.textContent=sl.value+'%';applyVolumes();if(onChange)onChange()});
row.appendChild(lab);row.appendChild(sl);row.appendChild(val);return row}
function injectSoundUI(){var mount=$('#volMount');if(!mount||$('#volBox'))return;
mount.innerHTML='<span>ЗВУК</span>';var box=document.createElement('div');box.id='volBox';
box.appendChild(sliderRow('ОБЩАЯ','master'));
box.appendChild(sliderRow('МУЗЫКА','music',function(){musUnlock()}));
box.appendChild(sliderRow('ЭФФЕКТЫ','sfx',function(){A.init();A.shoot()}));
box.appendChild(sliderRow('ИНТЕРФЕЙС','ui',function(){A.init();A.pick(4)}));
var np=document.createElement('div');np.id='nowPlaying';np.textContent='';box.appendChild(np);mount.appendChild(box)}
var touchSig='';
function setupTouchButtons(force){var box=$('#rbtns');if(!box)return;
var lp=localPlayer(),st=lp.stats;if(!st)return;
var w=st.multiWeapon?monsterWeapons(lp):(st.weapon?[st.weapon]:[]);
var sig=lp.ship+'|'+w.join(',')+'|'+lp.wIdx;
if(!force&&sig===touchSig)return;touchSig=sig;box.innerHTML='';
var rd=document.createElement('button');rd.className='rbtn';rd.id='rbDash';rd.setAttribute('aria-label','Рывок');
rd.appendChild(iconCanvas('dash','#22e6ff',4));box.appendChild(rd);
rd.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();A.init();A.resume();LI.dash=true;touchDashHeld=true;
try{rd.setPointerCapture(e.pointerId)}catch(err){}});
rd.addEventListener('pointerup',function(e){e.stopPropagation();touchDashHeld=false});
rd.addEventListener('pointercancel',function(){touchDashHeld=false});
rd.addEventListener('lostpointercapture',function(){touchDashHeld=false});
w.forEach(function(k,i){var u=upByKey(k),col=u?u.col:'#4d8cff';
var b=document.createElement('button');b.className='rbtn w'+(st.multiWeapon&&i===lp.wIdx?' sel':'');
b.setAttribute('data-w',k);b.setAttribute('aria-label',u?u.n:k);
b.appendChild(iconCanvas(k==='chrono'?'chrono':k,col,4));
b.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();A.init();A.resume();
if(st.multiWeapon){lp.wIdx=i;touchSig='';fireWeapon(lp,k)}else LI.weapon=true});
box.appendChild(b)});
if(st.multiWeapon&&w.length>1){var sw=document.createElement('button');sw.className='rbtn';sw.setAttribute('aria-label','Смена оружия');
sw.appendChild(iconCanvas('reflect','#9dff3c',4));
sw.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();cycleWeapon(lp,1);touchSig=''});
box.appendChild(sw)}}
var hudT=0,lScore=-1,lShards=-1,lFrags=-1,lTrack='';
function hud(dt){hudT+=dt;var p=viewPlayer(),st=p.stats||computeStats(p.lvl,p.ship,metaOf(p)),hf=clamp(p.hp/p.max,0,1);
$('#hpFill').style.transform='scaleX('+hf+')';$('#hpBar').classList.toggle('low',hf<.34);
$('#stage').classList.toggle('low',G.state==='play'&&hf<.3&&!CHEAT.god);
$('#dashFill').style.transform='scaleX('+(st.dashCd>0?clamp(1-p.dashCd/st.dashCd,0,1):1)+')';
$('#shBar').style.display=st.shieldMax?'block':'none';
if(st.shieldMax)$('#shFill').style.transform='scaleX('+clamp(p.shield/st.shieldMax,0,1)+')';
var ak=activeWeaponKey(p);
$('#rkBar').style.display=ak?'block':'none';
if(ak)$('#rkFill').style.transform='scaleX('+clamp(1-weaponCdOf(p,ak)/weaponCdMax(p,ak),0,1)+')';
$('#comboFill').style.transform='scaleX('+clamp(G.comboT/2.4,0,1)+')';$('#comboBox').classList.toggle('hot',G.combo>=8);
var lp=localPlayer();setupTouchButtons(false);
var box=$('#rbtns');
if(box){var btns=box.querySelectorAll('.rbtn');
for(var i=0;i<btns.length;i++){var b=btns[i];
if(b.id==='rbDash')b.classList.toggle('cool',lp.dashCd>0||lp.stun>0);
else{var k=b.getAttribute('data-w');if(k)b.classList.toggle('cool',weaponCdOf(lp,k)>0||lp.jammed)}}}
syncCapBar();
if(hudT>.1){hudT=0;$('#hpTxt').textContent=Math.ceil(p.hp);$('#comboTxt').textContent='x'+G.mult.toFixed(1);
if(G.score!==lScore){lScore=G.score;$('#cScore').textContent=fmt(G.score)}
if(lp.shards!==lShards){lShards=lp.shards;$('#cShards').textContent=lp.shards}
if(lp.frags!==lFrags){lFrags=lp.frags;$('#cFrags').textContent=lp.frags}
var tl=musLabel();if(tl!==lTrack){lTrack=tl;var np=$('#nowPlaying');if(np)np.textContent=tl?('♪ '+tl):''}}}
function baseCap(k){for(var i=0;i<UPS.length;i++)if(UPS[i].k===k)return UPS[i].cap;return 3}
function upByKey(k){for(var i=0;i<UPS.length;i++)if(UPS[i].k===k)return UPS[i];return null}
function upgradeCost(u,p){var lv=p.lvl[u.k]||0;if(u.ship)return SHIPMOD_COST;if(u.k==='dash'&&lv>=3)return 100;if(u.cost)return u.cost;return 0}
function moduleFits(u,ship){var noB=['bomber','reaper','groza'].indexOf(ship)>=0,single=ship==='sniper';
if(u.k==='fan'&&(noB||single))return false;
if(u.k==='pierce'&&(noB||single))return false;
if(u.k==='kir'&&ship==='groza')return false;
if(u.k==='rate'&&ship==='groza')return false;
if(ship==='chronos'&&(u.weapon||['rocket','wave','beam'].indexOf(u.req)>=0))return false;
return true}
function rollFor(p){var L=p.lvl,mm=metaOf(p),multi=p.ship==='monster';
var pool=UPS.filter(function(u){
if(u.ship&&u.ship!==p.ship)return false;
if(!moduleFits(u,p.ship))return false;
if((L[u.k]||0)>=u.cap)return false;
if(LOCKED.indexOf(u.k)>=0&&mm.unlocked.indexOf(u.k)<0)return false;
if(u.gold){var need=L[u.req]||0;if(need<baseCap(u.req))return false;
if(['rocket','wave','beam'].indexOf(u.req)>=0&&!(multi?(L[u.req]||0)>0:L.weapon===u.req))return false;
return !L[u.k]}
if(u.weapon&&!multi&&L.weapon&&u.k!==L.weapon)return false;
return true});
p.offer=[];var guard=0;
while(p.offer.length<Math.min(3,pool.length)&&guard++<90){var u=pick(pool);if(p.offer.indexOf(u)<0)p.offer.push(u)}}
function openUp(){for(var i=0;i<PL.length;i++){PL[i].pickPhase=0;PL[i].padSel=0;
if(PL[i].hp>0){PL[i].ready=false;rollFor(PL[i])}else PL[i].ready=true}
setState('up');renderCards();
var pn=G.pendingNode;
$('#upEye').textContent='ПЕРЕЛЁТ · '+(pn?(pn.type==='boss'?(pn.bossList&&pn.bossList.length>1?'НЕСКОЛЬКО БОССОВ':(BOSS_NAMES[pn.boss]||'БОСС')):levelTypeName(pn.type)):'');
if(NET.mode==='host')sendUpView()}
function upView(p){return{offer:p.offer.map(function(u){return u.k}),shards:p.shards,dual:p.dual,phase:p.pickPhase,ready:p.ready,lvl:p.lvl,hp:p.hp,max:p.max}}
function sendUpView(){if(NET.mode==='host'&&NET.connected)netSend({t:'upview',v:upView(P2)})}
function applyUpView(v){P2.dual=v.dual;P2.pickPhase=v.phase;P2.ready=v.ready;P2.lvl=v.lvl;P2.hp=v.hp;P2.max=v.max;P2.shards=v.shards;
P2.offer=v.offer.map(upByKey).filter(Boolean);recalcPlayer(P2);renderCards()}
function ownsColumn(pi){if(NET.mode==='guest')return pi===1;if(isLocal())return true;return pi===0}
function revive(by,who){if(G.state!=='up'||who.hp>0||by.hp<=0||by.shards<REVIVE_COST)return;
by.shards-=REVIVE_COST;who.hp=Math.round(who.max*.6);who.inv=2.5;who.ready=false;who.pickPhase=0;who.stun=0;who.trapped=0;who.invis=0;
rollFor(who);who.x=by.x+16;who.y=by.y;who.vx=0;who.vy=0;
A.revive();flash(.2,who.col);ring(by.x,by.y,4,46,who.col,.6);
if(NET.mode==='host')sendUpView();G.shards=localPlayer().shards;renderCards();checkAdvance()}
function renderCards(){var el=$('#cards');el.innerHTML='';var two=PL.length>1;
var wrap=document.createElement('div');wrap.className=two?'cols':'cols solo';
PL.forEach(function(p,pi){var col=document.createElement('div');col.className='pcol';col.style.borderColor=p.col;
var head=document.createElement('div');head.className='phead';head.style.color=p.col;
head.innerHTML='<span>ИГРОК '+(pi+1)+'</span><em>'+(p.hp<=0?'ПАЛ':p.ready?'ГОТОВ':'ВЫБИРАЕТ')+'</em>';col.appendChild(head);
var stt=document.createElement('div');stt.className='pstat';
stt.innerHTML='<span>◆ <b>'+p.shards+'</b></span><span>⬡ <b>'+bankOf(p)+'</b></span><span>'+shipLabel(p.ship)+'</span>';col.appendChild(stt);
if(!ownsColumn(pi)){var lock=document.createElement('div');lock.className='sub';lock.style.margin='0';lock.textContent='управляет другой игрок';col.appendChild(lock)}
if(p.hp<=0){var d=document.createElement('div');d.className='sub';d.textContent='Корпус разрушен. Напарник может воскресить за '+REVIVE_COST+'◆.';col.appendChild(d)}
else{p.offer.forEach(function(u,i){var lv=p.lvl[u.k]||0,b=document.createElement('button'),cost=upgradeCost(u,p);
b.className='card'+((u.gold||cost||u.ship)?' gold':'');b.type='button';b.setAttribute('data-own',pi);
if(p.ready||!ownsColumn(pi))b.disabled=true;
var pips='';for(var j=0;j<u.cap;j++)pips+='<i class="'+(j<lv?'f':'')+'"></i>';
b.innerHTML='<span class="num">'+(i+1)+'</span><h4>'+u.n+'</h4><p>'+u.d+(cost?' · '+cost+'◆':'')+'</p><div class="lv">'+pips+'</div>';
b.insertBefore(iconCanvas(u.k,u.col,4),b.firstChild);
b.addEventListener('click',function(){if(NET.mode==='guest')netSend({t:'choose',i:i});else choose(i,p)});col.appendChild(b)});
var row=document.createElement('div');row.className='upshop';row.innerHTML='<span class="upsh">◆ '+p.shards+'</span>';
var mk=function(label,fn,dis){var b=document.createElement('button');b.className='sb';b.textContent=label;b.setAttribute('data-own',pi);
b.disabled=!!dis||p.ready||!ownsColumn(pi);
b.addEventListener('click',function(){if(NET.mode==='guest'&&pi===1)netSend({t:'shop',a:fn});else shopAction(fn,p)});return b};
row.appendChild(mk('РЕМОНТ 12','repair',p.shards<12||p.hp>=p.max));
row.appendChild(mk('ПЕРЕБРОС 6','reroll',p.shards<6));
if(!p.dual)row.appendChild(mk('ДВОЙНОЙ 350','dual',p.shards<350));
row.appendChild(mk(p.ready?'ГОТОВО':'ПРОПУСТИТЬ +75','skip',false));
if(p.dual&&p.pickPhase===1&&!p.ready)row.appendChild(mk('ЗАВЕРШИТЬ','done',false));
col.appendChild(row)}
var other=PL[1-pi];
if(other&&other.hp<=0&&p.hp>0){var rb=document.createElement('button');rb.className='btn mag revive';rb.type='button';
rb.setAttribute('data-own',pi);rb.textContent='ВОСКРЕСИТЬ ИГРОКА '+(2-pi)+' · '+REVIVE_COST+'◆';
rb.disabled=p.shards<REVIVE_COST||!ownsColumn(pi);
rb.addEventListener('click',function(){if(NET.mode==='guest'&&pi===1)netSend({t:'revive'});else revive(p,other)});col.appendChild(rb)}
wrap.appendChild(col)});
el.appendChild(wrap);
$('#upHint').textContent=(two?'Каждый управляет своей колонкой. ':'Клавиши 1·2·3. ')+'Личные модули стоят '+SHIPMOD_COST+'◆.';
$('#upShards').textContent=localPlayer().shards}
function shipLabel(id){for(var i=0;i<SHIPS.length;i++)if(SHIPS[i].id===id)return SHIPS[i].n;return 'МАРШАЛ'}
function shipDesc(id){for(var i=0;i<SHIPS.length;i++)if(SHIPS[i].id===id)return SHIPS[i].d;return ''}
function applyUpgrade(u,p){var L=p.lvl;
if(u.weapon&&p.ship!=='monster'&&!L.weapon)L.weapon=u.k;
L[u.k]=(L[u.k]||0)+1;recalcPlayer(p);setupTouchButtons(true);
if(u.k==='armor')healPlayer(p,25);
A.up();flash(.15,'#22e6ff');ring(p.x,p.y,3,44,'#9dff3c',.5);part(p.x,p.y,'#9dff3c',16,90,.5,1)}
function checkAdvance(){if(NET.mode==='guest'||G.state!=='up')return;
var alive=PL.filter(function(p){return p.hp>0});
var done=alive.length>0&&alive.every(function(p){return p.ready});
if(done){G.travelDone=true;setState('travel')}else{renderCards();sendUpView()}}
function choose(i,p){if(G.state!=='up')return;p=p||localPlayer();if(p.ready||p.hp<=0)return;
var u=p.offer[i];if(!u)return;
var cost=upgradeCost(u,p),total=cost+((p.dual&&p.pickPhase===1)?50:0);
if(p.shards<total)return;p.shards-=total;
if(p.dual&&p.pickPhase===1){applyUpgrade(u,p);p.ready=true}
else{applyUpgrade(u,p);if(p.dual){p.pickPhase=1;rollFor(p)}else p.ready=true}
if(p===P2&&NET.mode==='host')sendUpView();
G.shards=localPlayer().shards;renderCards();checkAdvance()}
function shopAction(a,p){if(G.state!=='up'||p.ready||p.hp<=0)return;
if(a==='repair'){if(p.shards<12||p.hp>=p.max)return;p.shards-=12;healPlayer(p,35);A.heal()}
else if(a==='reroll'){if(p.shards<6)return;p.shards-=6;rollFor(p);A.tone(600,.09,'square',.08,1.4,0,'ui')}
else if(a==='dual'){if(p.shards<350||p.dual)return;p.shards-=350;p.dual=true;A.up()}
else if(a==='skip'){p.shards+=75;A.pick(3);p.ready=true}else if(a==='done')p.ready=true;
if(p===P2&&NET.mode==='host')sendUpView();
G.shards=localPlayer().shards;renderCards();checkAdvance()}
function metaBuy(kind,k,seat){var mm=seatMeta(seat),pl=seat===1?P2:P;
function pay(n){if(mm.frag<n)return false;mm.frag-=n;pl.frags=mm.frag;saveMeta();return true}
if(kind==='perm'){var lv=mm.perm[k]||0,pm=null;
for(var i=0;i<PERMS.length;i++)if(PERMS[i].k===k)pm=PERMS[i];
if(lv>=pm.max)return;if(!pay(permCost(mm,k)))return;mm.perm[k]=lv+1}
else if(kind==='bp'){if(!pay(BP_COST))return;var bi=mm.bp.indexOf(k);if(bi>=0)mm.bp.splice(bi,1);
if(mm.unlocked.indexOf(k)<0)mm.unlocked.push(k)}
else if(kind==='ship'){if(mm.ships.indexOf(k)>=0)return;
if(shipNeedsBp(k)&&mm.bp.indexOf('ship:'+k)<0)return;
if(!pay(shipPrice(k)))return;mm.ships.push(k);
var sb=mm.bp.indexOf('ship:'+k);if(sb>=0)mm.bp.splice(sb,1);delete mm.invest['ship:'+k]}
else if(kind==='invperm'){if(!pay(1))return;mm.invest[k]=(mm.invest[k]||0)+1;
if(mm.invest[k]>=permCost(mm,k)){mm.invest[k]=0;mm.perm[k]=(mm.perm[k]||0)+1}}
else if(kind==='invbp'){if(!pay(1))return;mm.invest[k]=(mm.invest[k]||0)+1;
if(mm.invest[k]>=BP_COST){mm.invest[k]=0;var j=mm.bp.indexOf(k);if(j>=0)mm.bp.splice(j,1);
if(mm.unlocked.indexOf(k)<0)mm.unlocked.push(k)}}
else if(kind==='invship'){var key='ship:'+k;if(mm.bp.indexOf(key)<0)return;if(!pay(1))return;
mm.invest[key]=(mm.invest[key]||0)+1;
if(mm.invest[key]>=shipPrice(k)){mm.invest[key]=0;mm.ships.push(k);var q=mm.bp.indexOf(key);if(q>=0)mm.bp.splice(q,1)}}
saveMeta();recalc();G.frags=localPlayer().frags;buildShop();buildTitleCols();
if(NET.mode==='host')netSend({t:'metaok'});A.up()}
function metaBuyAction(kind,k,seat){if(NET.mode==='guest'){netSend({t:'metabuy',kind:kind,k:k});return}
var mm=seatMeta(seat);
var cost=(kind==='invship'||kind==='invperm'||kind==='invbp')?1:(kind==='perm'?permCost(mm,k):kind==='bp'?BP_COST:shipPrice(k));
if(mm.frag<cost){A.tone(160,.12,'square',.08,.6,0,'ui');return}
metaBuy(kind,k,seat)}
function buildShop(){var root=$('#shopCols');if(!root)return;
var seats=isLocal()?[0,1]:[0];root.className=seats.length>1?'cols':'cols solo';root.innerHTML='';
seats.forEach(function(seat){var mm=seatMeta(seat),pl=seat===1?P2:P;
var col=document.createElement('div');col.className='pcol';col.style.borderColor=pl.col;
var head=document.createElement('div');head.className='phead';head.style.color=pl.col;
head.innerHTML='<span>ИГРОК '+(seat+1)+'</span><em>⬡ '+mm.frag+'</em>';col.appendChild(head);
PERMS.forEach(function(pm){var lv=mm.perm[pm.k]||0,cost=permCost(mm,pm.k),maxed=lv>=pm.max,inv=mm.invest[pm.k]||0;
var row=document.createElement('div');row.className='mrow';
row.innerHTML='<div class="mi"><b>'+pm.n+'</b><s>'+pm.d+'</s><s style="color:var(--blue)">вложено '+inv+'/'+cost+'</s></div><span class="ml">'+lv+'/'+pm.max+'</span>';
var bi=document.createElement('button');bi.className='sb';bi.textContent='+1';bi.setAttribute('data-own',seat);bi.disabled=maxed||mm.frag<1;
bi.addEventListener('click',function(){metaBuyAction('invperm',pm.k,seat)});
var b=document.createElement('button');b.className='sb gold';b.textContent=maxed?'МАКС':cost;b.setAttribute('data-own',seat);b.disabled=maxed||mm.frag<cost;
b.addEventListener('click',function(){metaBuyAction('perm',pm.k,seat)});
row.appendChild(bi);row.appendChild(b);col.appendChild(row)});
var sh=document.createElement('div');sh.className='set';sh.innerHTML='<span>КОРАБЛИ</span>';
SHIPS.forEach(function(s){if(s.cost===0)return;
var owned=mm.ships.indexOf(s.id)>=0,needBp=shipNeedsBp(s.id),hasBp=mm.bp.indexOf('ship:'+s.id)>=0;
var row=document.createElement('div');row.className='mrow';
row.innerHTML='<div class="mi"><b>'+s.n+'</b><s>'+(owned?'куплен':(needBp&&!hasBp?'нужен чертёж':s.d))+'</s></div>';
var b=document.createElement('button');b.className='sb gold';b.setAttribute('data-own',seat);
b.textContent=owned?'ЕСТЬ':(needBp&&!hasBp?'ЧЕРТЁЖ':s.cost);
b.disabled=owned||(needBp&&!hasBp)||mm.frag<s.cost;
b.addEventListener('click',function(){metaBuyAction('ship',s.id,seat)});
row.appendChild(b);sh.appendChild(row)});
col.appendChild(sh);
var shipBps=mm.bp.filter(function(x){return x.indexOf('ship:')===0});
if(shipBps.length){var sb=document.createElement('div');sb.className='set';sb.innerHTML='<span>ЧЕРТЕЖИ КОРАБЛЕЙ</span>';
shipBps.forEach(function(key){var id=key.slice(5),price=shipPrice(id),inv=mm.invest[key]||0;
var row=document.createElement('div');row.className='mrow';
row.innerHTML='<div class="mi"><b>'+shipLabel(id)+'</b><s>'+shipDesc(id)+'</s><s style="color:var(--blue)">вложено '+inv+'/'+price+'</s></div>';
var bi=document.createElement('button');bi.className='sb';bi.textContent='+1';bi.setAttribute('data-own',seat);bi.disabled=mm.frag<1;
bi.addEventListener('click',function(){metaBuyAction('invship',id,seat)});
var b=document.createElement('button');b.className='sb gold';b.textContent=price;b.setAttribute('data-own',seat);b.disabled=mm.frag<price;
b.addEventListener('click',function(){metaBuyAction('ship',id,seat)});
row.appendChild(bi);row.appendChild(b);sb.appendChild(row)});col.appendChild(sb)}
var bt=document.createElement('div');bt.className='set';bt.innerHTML='<span>ЧЕРТЕЖИ МОДУЛЕЙ</span>';
var modBps=mm.bp.filter(function(x){return x.indexOf('ship:')!==0});
if(!modBps.length){var e=document.createElement('div');e.className='sub';e.textContent='Чертежей нет. Падают из боссов.';bt.appendChild(e)}
modBps.forEach(function(k){var u=upByKey(k);if(!u)return;var inv=mm.invest[k]||0;
var row=document.createElement('div');row.className='mrow';
row.innerHTML='<div class="mi"><b>'+u.n+'</b><s>'+u.d+'</s><s style="color:var(--blue)">вложено '+inv+'/'+BP_COST+'</s></div>';
var bi=document.createElement('button');bi.className='sb';bi.textContent='+1';bi.setAttribute('data-own',seat);bi.disabled=mm.frag<1;
bi.addEventListener('click',function(){metaBuyAction('invbp',k,seat)});
var b=document.createElement('button');b.className='sb gold';b.textContent=BP_COST;b.setAttribute('data-own',seat);b.disabled=mm.frag<BP_COST;
b.addEventListener('click',function(){metaBuyAction('bp',k,seat)});
row.appendChild(bi);row.appendChild(b);bt.appendChild(row)});
col.appendChild(bt);root.appendChild(col)});
$('#shopFrags').textContent=wallet(0)}
function buildTitleCols(){var root=$('#titleCols');if(!root)return;
var seats=isLocal()?[0,1]:[0];root.className=seats.length>1?'cols':'cols solo';root.innerHTML='';
seats.forEach(function(seat){var mm=seatMeta(seat),pl=seat===1?P2:P;
var col=document.createElement('div');col.className='pcol';col.style.borderColor=pl.col;
var head=document.createElement('div');head.className='phead';head.style.color=pl.col;
head.innerHTML='<span>ИГРОК '+(seat+1)+'</span><em>⬡ '+mm.frag+'</em>';col.appendChild(head);
var pow=0;for(var k in mm.perm)pow+=mm.perm[k];
var stt=document.createElement('div');stt.className='pstat';
stt.innerHTML='<span>улучшений <b>'+pow+'</b></span><span>модулей <b>'+mm.unlocked.length+'/'+LOCKED.length+'</b></span><span>кораблей <b>'+mm.ships.length+'/'+SHIPS.length+'</b></span>';
col.appendChild(stt);
var sl=document.createElement('div');sl.className='set';sl.style.marginTop='4px';sl.innerHTML='<span>КОРАБЛЬ</span>';
var pills=document.createElement('div');pills.className='pills';
SHIPS.forEach(function(s){var owned=mm.ships.indexOf(s.id)>=0,needBp=shipNeedsBp(s.id),hasBp=mm.bp.indexOf('ship:'+s.id)>=0;
var b=document.createElement('button');b.className='pill'+(mm.ship===s.id?' on':'');b.type='button';b.setAttribute('data-own',seat);
var note=owned?(s.id==='std'?'базовый':'куплен'):(needBp?(hasBp?'чертёж найден · '+s.cost+'⬡':'нужен чертёж'):'закрыт · '+s.cost+'⬡');
b.innerHTML=s.n+'<small>'+note+'</small>';b.disabled=!owned;
b.addEventListener('click',function(){if(!owned)return;mm.ship=s.id;saveMeta();
pl.ship=s.id;pl.lvl=shipStart(s.id);pl.wIdx=0;recalcPlayer(pl);buildTitleCols();setupTouchButtons(true);
A.init();A.tone(520,.07,'square',.08,1.3,0,'ui')});
pills.appendChild(b)});
sl.appendChild(pills);col.appendChild(sl);
var info=document.createElement('div');info.className='sub';info.style.margin='0';info.textContent=shipDesc(mm.ship);col.appendChild(info);
root.appendChild(col)});syncBest()}
var GLOSS_LOC=[
{t:'std',n:'СЕКТОР',s:'лут ×1',d:'Обычная арена 640×480 со сбалансированной волной. Самая безопасная развилка.'},
{t:'bomb',n:'БОМБЕЖКА',s:'лут ×1.5',d:'Тесная арена, забита медиками. Они лечат соседей и взрываются при низком HP.'},
{t:'snipe',n:'ПОД ПРИЦЕЛОМ',s:'лут ×1.5',d:'Пять снайперов сразу плюс щитоносцы. Красный пунктир — линия выстрела, уходи вбок.'},
{t:'laser',n:'ЛАЗЕР-ТАГ',s:'лут ×1.5 · с 10',d:'Только эмиттеры с вращающимися лучами на 240 единиц. Двигайся по кругу вместе с ними.'},
{t:'mystery',n:'ТАИНСТВЕННЫЙ',s:'лут ×1.5',d:'Узкая арена 1280×360. Может быть пустой или содержать призрака прошлого босса.'},
{t:'dark',n:'ТЁМНЫЙ МИР',s:'лут ×1.5 · с 16',d:'Тёмная копия твоего корабля со всеми модулями. 50 фрагментов и 25% шанс чертежа МОНСТРА.'},
{t:'ship',n:'КРУПНЫЙ КОРАБЛЬ',s:'арена 1000×760',d:'Огромный корпус в центре. Три исхода: реактор нестабилен и надо успеть убежать за минуту-полторы; экипаж просит помощи и платит 200◆; или корабль заброшен и рядом лежит контейнер на 30◆.'},
{t:'rand',n:'СЛУЧАЙНЫЙ',s:'лут ×2',d:'Кот в мешке: другой тип локации или событие — золотой дождь, метеоры, рой, штиль.'},
{t:'boss',n:'БОСС',s:'торговец + чертёж',d:'Стадии 5, 10, 14, 18, 22, 26 и Матка Улья на 30. В бесконечном режиме боссы каждые 5 волн, могут повторяться, а с 30 волны их несколько сразу.'}];
var GLOSS_EN={
grunt:{n:'ДРОН',s:'ближний',d:'Базовый камикадзе. Опасен только толпой.'},
mini:{n:'МАЛЁК',s:'рой',d:'Мелкий и юркий, рождается из делителей и инкубаторов.'},
shooter:{n:'СТРЕЛОК',s:'дальний',d:'Держит 70–110 и плюёт янтарными сферами, заходя вбок.'},
splitter:{n:'ДЕЛИТЕЛЬ',s:'дробится',d:'При смерти распадается на двух мальков.'},
tank:{n:'ТАНК',s:'таран',d:'Телеграфирует рывок красной линией и взрывается при смерти.'},
shielder:{n:'ЩИТОНОСЕЦ',s:'щит спереди',d:'Ходит группами по 3–4, прикрывая снайпера. Бей с фланга или аурой.'},
sniper:{n:'СНАЙПЕР',s:'линия',d:'Наводится 0.7с и бьёт очень быстрой пулей на 36 урона.'},
medic:{n:'МЕДИК',s:'лечит',d:'Восстанавливает HP союзнику лучом. При 25% HP становится бомбой.'},
emitter:{n:'ЭМИТТЕР',s:'лучи',d:'Раз в 4.2с выпускает 6–8 вращающихся лучей во все стороны.'},
clone:{n:'КЛОН',s:'1 HP',d:'Пустышка Фантома, сбивает автоприцел.'},
ram:{n:"ТАРАН'ТИНО",s:'оглушение · с 6',d:'Таранит на 20 и глушит на 2–4с. С 25% шансом оставляет воронку.'},
lgun:{n:'ЛАЗЕР-ГАН',s:'30 HP · с 7',d:'Раскрывается, три секунды ведёт луч, затем взрывается.'},
mirror:{n:'ЗЕРКАЛЬЩИК',s:'отражает · с 8',d:'Лобовой щит возвращает пули. Уязвим с боков и 0.8с после отражения.'},
brood:{n:'ИНКУБАТОР',s:'рой · с 10',d:'Каждые 3с выпускает мальков, при смерти — сразу шесть.'},
jammer:{n:'ГЛУШИТЕЛЬ',s:'глушит · с 12',d:'В радиусе 90 оружие не заряжается и гипер не запускается.'},
bastard:{n:'УБЛЮДОК',s:'пулемёт · с 11',d:'Три секунды плотной очереди с большим разбросом, потом 5 секунд под щитом. Бей только в окно огня.'},
dark:{n:'ТЁМНЫЙ ДВОЙНИК',s:'босс локации',d:'Копирует корабль, оружие, дроны и лезвия. Урон кроме пуль урезан втрое. 25% на чертёж МОНСТРА.'}};
var GLOSS_BO={
guardian:{n:'СТРАЖ',d:'Веера, спирали, таран и призыв дронов.'},
prism:{n:'ПРИЗМА',d:'Три вращающихся щита отражают пули. Бей в промежутки или волной.'},
hammer:{n:'МОЛОТ',d:'Идёт напролом, ударные волны, зоны и притяжение.'},
eye:{n:'ОКО',d:'Держит дистанцию, залпы по три, кресты лучей и метка под тобой.'},
phantom:{n:'ФАНТОМ',d:'Блинкует за спину, плодит клонов и спирали.'},
twins:{n:'ЭХО И ЭГИДА',d:'ЭГИДА неуязвима и кроет ЭХО куполом ближе 120. Отталкивай её выстрелами.'},
hive:{n:'МАТКА УЛЬЯ',d:'На половине HP зовёт медиков и снайперов. Сначала вычисти лекарей.'}};
function glossCanvas(src,scale,locked){var c=mkC(src.width*scale,src.height*scale),g=c.getContext('2d');
g.imageSmoothingEnabled=false;g.drawImage(src,0,0,c.width,c.height);
if(locked){g.globalCompositeOperation='source-atop';g.fillStyle='#2a1856';g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over'}
var max=64,k=Math.min(1,max/Math.max(c.width,c.height));
c.style.width=Math.round(c.width*k)+'px';c.style.height=Math.round(c.height*k)+'px';return c}
function locSource(t){var c=mkC(26,26),g=c.getContext('2d');g.imageSmoothingEnabled=false;
nodeIcon(g,13,13,10,{type:t,boss:t==='boss'?'guardian':null});return c}
function glossCard(cv,name,sub,desc,locked,boss){var d=document.createElement('div');
d.className='gcard'+(locked?' lock':'')+(boss?' boss':'');d.appendChild(cv);
var tx=document.createElement('div');tx.className='gtxt';
var b=document.createElement('b');b.textContent=locked?'???':name;tx.appendChild(b);
var i=document.createElement('i');i.textContent=locked?'НЕ ВСТРЕЧЕН':sub;tx.appendChild(i);
var p=document.createElement('p');p.textContent=locked?'Запись появится после первой встречи.':desc;tx.appendChild(p);
d.appendChild(tx);return d}
function buildGloss(){var tabs=$('#glossTabs'),body=$('#glossBody'),prog=$('#glossProg');if(!tabs||!body)return;
tabs.innerHTML='';
[['all','ВСЁ'],['loc','ЛОКАЦИИ'],['ene','ВРАГИ'],['boss','БОССЫ']].forEach(function(t){
var b=document.createElement('button');b.className='pill'+(G.glossTab===t[0]?' on':'');b.type='button';
b.setAttribute('data-own','0');b.textContent=t[1];
b.addEventListener('click',function(){G.glossTab=t[0];buildGloss();A.init();A.tone(560,.05,'square',.06,1.2,0,'ui')});
tabs.appendChild(b)});
var eS=0;for(var q=0;q<GLOSS_E.length;q++)if(SEEN.e[GLOSS_E[q]])eS++;
var bS=0,bK=Object.keys(GLOSS_BO);for(var w=0;w<bK.length;w++)if(SEEN.b[bK[w]])bS++;
prog.innerHTML='Встречено врагов: <b>'+eS+'/'+GLOSS_E.length+'</b> · боссов: <b>'+bS+'/'+bK.length+'</b>';
body.innerHTML='';
if(G.glossTab==='all'||G.glossTab==='loc'){
var h1=document.createElement('div');h1.className='gsec';h1.textContent='ИКОНЫ ЛОКАЦИЙ';body.appendChild(h1);
var g1=document.createElement('div');g1.className='ggrid';
GLOSS_LOC.forEach(function(L){g1.appendChild(glossCard(glossCanvas(locSource(L.t),3,false),L.n,L.s,L.d,false,L.t==='boss'))});
body.appendChild(g1)}
if(G.glossTab==='all'||G.glossTab==='ene'){
var h2=document.createElement('div');h2.className='gsec';h2.textContent='ВРАГИ АРЕНЫ';body.appendChild(h2);
var g2=document.createElement('div');g2.className='ggrid';
GLOSS_E.forEach(function(k){var info=GLOSS_EN[k];if(!info)return;
var src=k==='dark'?SPR.darkShips.std:(SPR[k]||SPR.grunt);
var sc=Math.max(2,Math.min(4,Math.round(56/Math.max(src.width,src.height))));
g2.appendChild(glossCard(glossCanvas(src.n,sc,!SEEN.e[k]),info.n,info.s,info.d,!SEEN.e[k],false))});
body.appendChild(g2)}
if(G.glossTab==='all'||G.glossTab==='boss'){
var h3=document.createElement('div');h3.className='gsec';h3.textContent='БОССЫ';body.appendChild(h3);
var g3=document.createElement('div');g3.className='ggrid';
Object.keys(GLOSS_BO).forEach(function(k){var info=GLOSS_BO[k],src=SPR.bosses[k]||SPR.boss;
g3.appendChild(glossCard(glossCanvas(src.n,2,!SEEN.b[k]),info.n,'босс',info.d,!SEEN.b[k],true))});
body.appendChild(g3)}}
function enterPortal(){G.portal=null;G.portalCharge=0;
var wasBoss=G.pendingNode&&G.pendingNode.type==='boss';
if(G.endless){if(wasBoss){setState('shop');buildShop()}else selectNode(endlessNode(G.wave+1));return}
var node=getNode(G.curNode);
if(node&&node.type==='boss'){setState('shop');buildShop()}
else{setState('map');G.mapSel=0;G.mapCam=clamp((node?node.d:1)*70-W/3,0,MAX_WAVE*70-W+80)}}
function applyDarkCheat(){if(!G.map)return;var cur=getNode(G.curNode),cd=cur?cur.d:0;
for(var d=0;d<G.map.length;d++)for(var i=0;i<G.map[d].length;i++){var n=G.map[d][i];
if(n.type==='boss'||n.d<=cd)continue;n.type=CHEAT.dark?'dark':'std'}}
function syncCheatUI(){var box=$('#sPause .box');if(!box)return;var wrap=$('#cheatRow');
if(!CHEAT.god&&!CHEAT.dark){if(wrap&&wrap.parentNode)wrap.parentNode.removeChild(wrap);return}
if(!wrap){wrap=document.createElement('div');wrap.id='cheatRow';wrap.className='row';box.appendChild(wrap)}
wrap.innerHTML='';
if(CHEAT.god){var b=document.createElement('button');b.className='btn';b.type='button';b.setAttribute('data-own','0');b.textContent='БЕССМЕРТИЕ: ВКЛ';
b.addEventListener('click',function(){CHEAT.god=false;recalc();syncCheatUI()});wrap.appendChild(b)}
if(CHEAT.dark){var b2=document.createElement('button');b2.className='btn';b2.type='button';b2.setAttribute('data-own','0');b2.textContent='ТЁМНЫЙ МИР: ВКЛ';
b2.addEventListener('click',function(){CHEAT.dark=false;applyDarkCheat();syncCheatUI()});wrap.appendChild(b2)}}
function wipeProgress(){META=metaDefault();META2=metaDefault();saveMeta();SEEN={e:{},b:{}};saveSeen();
storeSet('best',{score:0,wave:0});G.best={score:0,wave:0};
P.lvl={};P2.lvl={};P.shards=0;P2.shards=0;P.frags=0;P2.frags=0;G.frags=0;G.shards=0;
recalc();buildTitleCols();buildShop();syncBest()}
function tryCheat(){var el=$('#mpCode');if(!el)return false;var raw=(el.value||'').trim();if(!raw)return false;
var s=raw.toLowerCase(),m;
if(s==='god666'){CHEAT.god=!CHEAT.god;recalc();syncCheatUI();el.value='';return true}
if(s==='darkworld8'){CHEAT.dark=!CHEAT.dark;applyDarkCheat();syncCheatUI();el.value='';return true}
if(s==='clear67'){wipeProgress();el.value='';return true}
if(s==='allships'){META.ships=SHIPS.map(function(x){return x.id});META2.ships=SHIPS.map(function(x){return x.id});
saveMeta();buildTitleCols();buildShop();syncBest();el.value='';return true}
m=s.match(/^(\d+)fragments$/);if(m){var pl=localPlayer();addBank(pl,parseInt(m[1],10));G.frags=pl.frags;
syncBest();buildShop();buildTitleCols();el.value='';return true}
m=s.match(/^(\d+)shard$/);if(m){var n=parseInt(m[1],10);
if(G.state==='title'){META.bonusShards=(META.bonusShards||0)+n;saveMeta()}
else{localPlayer().shards+=n;G.shards=localPlayer().shards}
el.value='';return true}
return false}
function screenToWorld(px,py){var z=G.zoom||1,cx=W/2,cy=H/2;
return{x:(px-cx)/z+cx+CAM.x,y:(py-cy)/z+cy+CAM.y}}
function mapClick(px,py){var wx=px+G.mapCam,wy=py,reach=reachableNodes();
for(var i=0;i<reach.length;i++){var n=reach[i],nx=60+n.d*70,ny=H/2+(n.row-(G.map[n.d-1].length-1)/2)*70;
if(hyp(wx-nx,wy-ny)<24){trySelectNode(n.id);return}}}
function initInput(canvas){var lastTap=0,lastSide='';
function onKeyDown(e){var tag=(e.target&&e.target.tagName)||'';if(tag==='INPUT')return;
musUnlock();
if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Slash'].indexOf(e.code)>=0)e.preventDefault();
var rep=e.repeat;keys[e.code]=true;A.init();A.resume();
if(e.code==='KeyM'&&!rep){toggleSound();return}
if((e.code==='KeyP'||e.code==='Escape')&&!rep){
if(G.state==='play')pause();else if(G.state==='pause')resume();else if(G.state==='gloss')setState('title');return}
if(e.code==='KeyR'&&!rep){if(G.state!=='title'&&G.state!=='gloss')newRun();return}
if((G.state==='title'||G.state==='over'||G.state==='win')&&(e.code==='Enter'||e.code==='Space')&&!rep&&!isLocal()){newRun();return}
if(G.state==='up'){var i1={Digit1:0,Digit2:1,Digit3:2}[e.code];
if(i1!==undefined&&!rep){if(NET.mode==='guest')netSend({t:'choose',i:i1});else choose(i1,P)}
var i2={Digit8:0,Digit9:1,Digit0:2}[e.code];
if(i2!==undefined&&!rep&&isLocal())choose(i2,P2);return}
if(G.state==='play'){
if(e.code==='Space'&&!rep)LI.dash=true;
if((e.code==='KeyQ'||e.code==='Tab')&&!rep){LI.swap=true;e.preventDefault()}
if(isLocal()){if(e.code==='Enter'&&!rep)K2.dash=true;
if((e.code==='Slash'||e.code==='Numpad0'||e.code==='ControlRight')&&!rep)K2.weapon=true;
if(e.code==='Period'&&!rep)K2.swap=true}}}
function onKeyUp(e){keys[e.code]=false}
function onBlur(){for(var k in keys)keys[k]=false;resetSticks();activePtr={};mouseRightHeld=false;G.mapDrag.active=false;
LI.dash=false;LI.weapon=false;LI.swap=false;K2.dash=false;K2.weapon=false;K2.swap=false;
if(G.state==='play'&&NET.mode!=='guest'&&!isLocal())pause()}
function toLogical(e){var r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/canvas.SCALE,y:(e.clientY-r.top)/canvas.SCALE}}
function onDown(e){A.init();A.resume();musUnlock();activePtr[e.pointerId]=1;
try{canvas.setPointerCapture(e.pointerId)}catch(err){}
var p=toLogical(e);
if(G.state==='map'){G.mapDrag={active:true,startX:p.x,startCam:G.mapCam,moved:false,id:e.pointerId};return}
if(e.pointerType==='touch'){var side=p.x<W*.5?'L':'R',now=performance.now();
if(now-lastTap<300&&lastSide===side){if(side==='L')LI.dash=true;else LI.weapon=true;lastTap=0}
else{lastTap=now;lastSide=side}
var s=side==='L'?sticks.move:sticks.aim;
if(s.id!==null&&s.id!==e.pointerId&&!activePtr[s.id])clearStick(s.id);
if(s.id===null){s.id=e.pointerId;s.ox=p.x;s.oy=p.y;s.dx=0;s.dy=0;s.m=0}}
else{mx=p.x;my=p.y;mouseT=G.t;if(e.button===0)LI.weapon=true;if(e.button===2){LI.dash=true;mouseRightHeld=true}}}
function onMove(e){var p=toLogical(e);
if(G.state==='map'&&G.mapDrag.active&&G.mapDrag.id===e.pointerId){
var dx=p.x-G.mapDrag.startX;if(Math.abs(dx)>6)G.mapDrag.moved=true;
G.mapCam=clamp(G.mapDrag.startCam-dx,0,MAX_WAVE*70-W+80);return}
if(e.pointerType!=='touch'){mx=p.x;my=p.y;mouseT=G.t;return}
activePtr[e.pointerId]=1;
['move','aim'].forEach(function(k){var s=sticks[k];if(s.id!==e.pointerId)return;
var dx=p.x-s.ox,dy=p.y-s.oy,d=Math.sqrt(dx*dx+dy*dy),max=22;
if(d>max){s.ox=p.x-dx/d*max;s.oy=p.y-dy/d*max;dx=dx/d*max;dy=dy/d*max}
s.dx=dx/max;s.dy=dy/max;s.m=Math.min(Math.max(d/max,0),1)})}
function onUp(e){delete activePtr[e.pointerId];
if(G.state==='map'){if(G.mapDrag.active&&G.mapDrag.id===e.pointerId){
var p=toLogical(e);if(!G.mapDrag.moved)mapClick(p.x,p.y);G.mapDrag.active=false}return}
if(e.pointerType==='touch')clearStick(e.pointerId);else if(e.button===2)mouseRightHeld=false}
window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);window.addEventListener('blur',onBlur);
canvas.addEventListener('contextmenu',function(e){e.preventDefault()});
canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);
canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
canvas.addEventListener('lostpointercapture',function(e){delete activePtr[e.pointerId];clearStick(e.pointerId)});
window.addEventListener('pointerup',function(e){delete activePtr[e.pointerId];clearStick(e.pointerId)},true);
window.addEventListener('pointercancel',function(e){delete activePtr[e.pointerId];clearStick(e.pointerId)},true);
window.addEventListener('touchend',function(e){if(!e.touches||e.touches.length===0){resetSticks();activePtr={}}},true);
window.addEventListener('touchcancel',function(){resetSticks();activePtr={}},true);
canvas.addEventListener('wheel',function(e){
if(G.state==='map'){e.preventDefault();G.mapCam=clamp(G.mapCam+e.deltaY*.5,0,MAX_WAVE*70-W+80);return}
if(G.state==='play'){var lp=localPlayer();
if(lp.stats&&lp.stats.multiWeapon){e.preventDefault();cycleWeapon(lp,e.deltaY>0?1:-1)}}},{passive:false});
document.addEventListener('pointerdown',function(){A.init();A.resume();musUnlock()},{once:true});
window.addEventListener('keydown',function(){musUnlock()},{once:true});
window.addEventListener('touchstart',function(){musUnlock()},{once:true,passive:true})}
function stickWatch(){['move','aim'].forEach(function(k){var s=sticks[k];if(s.id!==null&&!activePtr[s.id])clearStick(s.id)})}
function ownedButtons(root,seat){return [].slice.call(root.querySelectorAll('button:not(:disabled),a.btn')).filter(function(b){
if(b.offsetParent===null)return false;
var o=b.getAttribute('data-own');
if(seat===1)return o==='1';
return o!=='1'})}
function markSel(btns,idx){for(var i=0;i<btns.length;i++){if(i===idx)btns[i].classList.add('padsel');else btns[i].classList.remove('padsel')}}
function clearSel(){var r=SCR[G.state];if(!r)return;var root=$(r);if(!root)return;
var l=root.querySelectorAll('.padsel');for(var i=0;i<l.length;i++)l[i].classList.remove('padsel')}
function navList(g,btns,owner){if(!g.active||!btns.length)return;
if(owner.padSel>=btns.length)owner.padSel=0;
var before=owner.padSel;
if(g.down||g.right){owner.padSel=(owner.padSel+1)%btns.length;A.tone(520,.03,'square',.05,1,0,'ui')}
if(g.up||g.left){owner.padSel=(owner.padSel-1+btns.length)%btns.length;A.tone(520,.03,'square',.05,1,0,'ui')}
markSel(btns,owner.padSel);
if(before!==owner.padSel){try{btns[owner.padSel].scrollIntoView({block:'nearest'})}catch(e){}}
if(g.ok){btns[owner.padSel].click();A.tone(760,.05,'square',.07,1.2,0,'ui')}}
function padMenus(){if(!GP.active&&!GP2.active){clearSel();return}
if(G.state==='map'){var g=GP;if(!g.active||NET.mode==='guest')return;
var reach=reachableNodes();if(!reach.length)return;
if(g.right||g.down)G.mapSel=(G.mapSel+1)%reach.length;
if(g.left||g.up)G.mapSel=(G.mapSel-1+reach.length)%reach.length;
G.mapSel=clamp(G.mapSel,0,reach.length-1);
var n=reach[G.mapSel];G.mapCam=clamp(60+n.d*70-W/2,0,MAX_WAVE*70-W+80);
if(g.ok)trySelectNode(n.id);return}
if(G.state==='up'){var root=$('#sUp');if(!root)return;
var pi0=NET.mode==='guest'?1:0;
navList(GP,ownedButtons(root,pi0),PL[pi0]||P);
if(isLocal())navList(GP2,ownedButtons(root,1),P2);return}
if(G.state==='shop'||G.state==='title'||G.state==='gloss'){var sr=$(SCR[G.state]);if(!sr)return;
navList(GP,ownedButtons(sr,0),P);
if(isLocal()&&G.state!=='gloss')navList(GP2,ownedButtons(sr,1),P2);
if(GP.back){if(G.state==='shop')$('#bToMap').click();else if(G.state==='gloss')setState('title')}
return}
var sel=SCR[G.state];if(!sel||!GP.active)return;var box=$(sel);if(!box)return;
var btns=ownedButtons(box,0);if(!btns.length)return;
if(G.padSel>=btns.length)G.padSel=0;
var before=G.padSel;
if(GP.down||GP.right)G.padSel=(G.padSel+1)%btns.length;
if(GP.up||GP.left)G.padSel=(G.padSel-1+btns.length)%btns.length;
markSel(btns,G.padSel);
if(before!==G.padSel){try{btns[G.padSel].scrollIntoView({block:'nearest'})}catch(e){}}
if(GP.ok)btns[G.padSel].click();
if(GP.back&&G.state==='pause')resume()}
function predictGuest(dt){var p=P2,st=p.stats;if(!st||!NET.pred)return;var inp=p.input;
NET.pred.dashCd=Math.max(0,NET.pred.dashCd-dt);
if(inp.dash&&NET.pred.dashCd<=0&&p.stun<=0){var dx=inp.mx,dy=inp.my;
if(!dx&&!dy){dx=Math.cos(inp.aim);dy=Math.sin(inp.aim)}
var l=hyp(dx,dy)||1;NET.pred.dx=dx/l;NET.pred.dy=dy/l;
NET.pred.dashT=st.ship==='monster'?.22:.16;NET.pred.dashCd=st.dashCd;inp.dash=false}
if(NET.pred.dashT>0){NET.pred.dashT-=dt;var ds=280*(st.dashSpeedMul||1);
NET.pred.vx=(NET.pred.dx||1)*ds;NET.pred.vy=(NET.pred.dy||0)*ds}
else{var sp=st.speed*(inp.focus?.55:1)*(p.stun>0?.2:1)*(p.chill>0?.55:1),k=1-Math.exp(-20*dt);
NET.pred.vx+=(inp.mx*sp-NET.pred.vx)*k;NET.pred.vy+=(inp.my*sp-NET.pred.vy)*k}
NET.pred.x=clamp(NET.pred.x+NET.pred.vx*dt,AR.x+p.r,AR.x+AR.w-p.r);
NET.pred.y=clamp(NET.pred.y+NET.pred.vy*dt,AR.y+p.r,AR.y+AR.h-p.r);
p.x=NET.pred.x;p.y=NET.pred.y;p.aim=inp.aim}
var cv,ctx;
function initGame(){cv=$('#cv');ctx=cv.getContext('2d',{alpha:false});
setTheme(themeKey);resize();
P.x=AR.w/2;P.y=AR.h/2;centerCam(true);recalc();P.hp=P.max;
syncSound();syncBest();syncEndlessBtn();$('#cWave').textContent='—';
initBackground();setupBloom();initInput(cv);injectSoundUI();initButtons();
buildThemeButtons();buildTitleCols();buildKeys();setupTouchButtons(true);initMusic();applyVolumes();
requestAnimationFrame(frame)}
function resize(){var sw=window.innerWidth,sh=window.innerHeight;
var scale=clamp(Math.round(Math.min(sw,sh)/240),2,5),w=Math.ceil(sw/scale),h=Math.ceil(sh/scale);
cv.width=w;cv.height=h;cv.style.width=w*scale+'px';cv.style.height=h*scale+'px';cv.SCALE=scale;
ctx=cv.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
var topPx=$('#top').offsetHeight||50,botPx=$('#hud').offsetHeight||96;
var ti=Math.ceil(topPx/scale)+3,bi=Math.ceil(botPx/scale)+3;
W=w;H=h;SCALE=scale;VIEW.x=0;VIEW.y=ti;VIEW.w=w;VIEW.h=Math.max(60,h-ti-bi);
initBackground();setupBloom();centerCam(true)}
window.addEventListener('resize',function(){if(cv)resize()});
window.addEventListener('orientationchange',function(){setTimeout(function(){if(cv)resize()},250)});
function centerCam(snap){if(!snap)return;
var t=camTargetFor(viewPlayer(),0,0,W,H,G.zoom);CAMS[0].x=t.x;CAMS[0].y=t.y;CAM.x=t.x;CAM.y=t.y;
if(PL.length>1){var t2=camTargetFor(P2,0,0,W,H,1);CAMS[1].x=t2.x;CAMS[1].y=t2.y}}
function updateZoom(dt){if(isLocal()&&PL[0].hp>0&&PL[1].hp>0){
var d=hyp(PL[0].x-PL[1].x,PL[0].y-PL[1].y);
if(d>SPLIT_ON)G.splitOn=true;else if(d<SPLIT_OFF)G.splitOn=false;
var target=G.splitOn?1:clamp(1-(d-90)/420,.55,1);
G.zoom+=(target-G.zoom)*Math.min(1,4*dt)}
else{G.splitOn=false;var z=G.capital?.82:1;G.zoom+=(z-G.zoom)*Math.min(1,4*dt)}}
function resetPlayer(p,x,y){p.x=x;p.y=y;p.vx=0;p.vy=0;p.inv=1.2;p.dashCd=0;p.dashT=0;p.fireT=0;p.noHit=0;
p.shield=0;p.shieldT=0;p.weaponCd=0;p.beamT=0;p.beamChain=[];p.hyperCd=0;p.dashHold=0;p.socioSpin=0;
p.stun=0;p.trapped=0;p.chill=0;p.invis=0;p.invisShot=false;p.jammed=false;p.aegisA=0;p.aegisOut=0;
p.coneT=0;p.swingT=0;p.swingDir=1;p.plates=0;p.plateT=0;p.wIdx=0;p.wCd={rocket:0,wave:0,beam:0};
p.lastSeen={x:x,y:y};p.shards=0;p.frags=bankOf(p);p.dual=false;p.pickPhase=0;p.offer=[];p.ready=false;p.padSel=0;
var mm=metaOf(p);p.ship=mm.ships.indexOf(mm.ship)>=0?mm.ship:'std';
p.lvl=shipStart(p.ship);p.input={mx:0,my:0,aim:0,dash:false,weapon:false,swap:false,focus:false,held:false,mouse:false}}
function newRun(){if(NET.mode==='guest')return;A.init();A.resume();musUnlock();
G.enemies=[];G.bul=[];G.ebul=[];G.erock=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];
G.mines=[];G.wells=[];G.turrets=[];G.phantoms=[];G.chronoFields=[];G.parts=[];G.drops=[];
G.floats=[];G.rings=[];G.ghost=[];G.queue=[];G.bosses=[];
G.score=0;G.kills=0;G.combo=0;G.comboT=0;G.mult=1;G.wave=1;G.boss=null;G.shake=0;G.flash=0;
G.slow=0;G.glitch=0;G.st={shots:0,hits:0,time:0};G.portal=null;G.portalCharge=0;
G.travel=false;G.travelT=0;G.travelDone=false;G.menuOpened=false;G.postT=0;G.pendingNode=null;
G.lootMult=1;G.event=null;G.lastBossKind=null;G.darkUsed=false;G.zoom=1;G.splitOn=false;G.twinsLink=false;
G.capital=null;G.container=null;
setArena(640,480);
PL=(NET.connected||NET.mode==='local')?[P,P2]:[P];
resetPlayer(P,AR.w/2-26,AR.h/2);if(PL.length>1)resetPlayer(P2,AR.w/2+26,AR.h/2);
if(META.bonusShards>0){P.shards+=META.bonusShards;META.bonusShards=0;saveMeta()}
if(isLocal()&&META2.bonusShards>0){P2.shards+=META2.bonusShards;META2.bonusShards=0;saveMeta()}
recalc();for(var i=0;i<PL.length;i++)PL[i].hp=PL[i].max;
G.shards=localPlayer().shards;G.frags=localPlayer().frags;
setupTouchButtons(true);if(MUS.ready)musPickBattle();
var first;
if(G.endless){G.map=null;first=endlessNode(1);G.pendingNode=first;G.curNode=first.id}
else{genMap();first=G.map[0][0];G.pendingNode=first}
centerCam(true);$('#bossbar').classList.remove('on');$('#capbar').classList.remove('on');
startLevel(first);syncBest();if(NET.mode==='host')netSend({t:'start'})}
function pause(){if(G.state!=='play'||NET.mode==='guest')return;setState('pause')}
function resume(){if(G.state!=='pause'||NET.mode==='guest')return;setState('play');A.resume()}
function toMenu(){setState('title');G.musicMode='title';
G.enemies=[];G.bul=[];G.ebul=[];G.erock=[];G.rockets=[];G.beams=[];G.zones=[];G.shocks=[];
G.mines=[];G.wells=[];G.turrets=[];G.phantoms=[];G.chronoFields=[];G.drops=[];G.queue=[];
G.boss=null;G.bosses=[];G.portal=null;G.capital=null;G.container=null;
$('#bossbar').classList.remove('on');$('#capbar').classList.remove('on');syncBest();buildTitleCols()}
function gameOver(){setState('over');A.over();G.slow=1;shake(8);flash(.5,'#ff4d4d');
part(P.x,P.y,'#ff4d4d',46,150,.9,2);ring(P.x,P.y,4,60,'#ff4d4d',.8);
bankFrags();var rec=saveBest();
$('#overRec').innerHTML=rec?'<span class="rec">НОВЫЙ РЕКОРД</span>':'';
$('#overSub').textContent='Уровень '+G.wave+(G.endless?' (бесконечный)':'')+' · '+G.kills+' врагов · фрагменты сохранены';
$('#overStats').innerHTML=statsHTML();if(NET.mode==='host')netSend({t:'over'})}
function winRun(){setState('win');A.win();flash(.35,'#9dff3c');bankFrags();var rec=saveBest();
$('#winRec').innerHTML=rec?'<span class="rec">НОВЫЙ РЕКОРД</span>':'';
$('#winStats').innerHTML=statsHTML();if(NET.mode==='host')netSend({t:'win'})}
function initButtons(){
$('#bStart').addEventListener('click',newRun);
$('#bSound').addEventListener('click',toggleSound);
$('#bPause').addEventListener('click',function(){if(G.state==='play')pause();else if(G.state==='pause')resume()});
$('#bRestart').addEventListener('click',function(){if(G.state!=='title'&&G.state!=='gloss')newRun()});
$('#bResume').addEventListener('click',resume);
$('#bRestart2').addEventListener('click',newRun);
$('#bMenu2').addEventListener('click',toMenu);
$('#bAgain').addEventListener('click',newRun);
$('#bMenu').addEventListener('click',toMenu);
$('#bAgain2').addEventListener('click',newRun);
$('#bMenu3').addEventListener('click',toMenu);
$('#mpHost').addEventListener('click',hostGame);
$('#mpJoin').addEventListener('click',onJoinClick);
$('#bLocal').addEventListener('click',toggleLocal);
$('#bEndless').addEventListener('click',toggleEndless);
$('#bGloss').addEventListener('click',function(){A.init();A.tone(680,.07,'triangle',.07,1.3,0,'ui');setState('gloss')});
$('#bGlossBack').addEventListener('click',function(){setState('title')});
$('#bTabSettings').addEventListener('click',function(){togglePanel('settings')});
$('#bTabCoop').addEventListener('click',function(){togglePanel('coop')});
$('#bToMap').addEventListener('click',function(){
if(G.endless){selectNode(endlessNode(G.wave+1));return}
setState('map');G.mapSel=0;var n=getNode(G.curNode);
G.mapCam=clamp((n?n.d:1)*70-W/3,0,MAX_WAVE*70-W+80)});
var ci=$('#mpCode');if(ci)ci.addEventListener('keydown',function(e){
if(e.code==='Enter'||e.code==='NumpadEnter'){e.preventDefault();e.stopPropagation();onJoinClick()}});
addFeedback('#sPause')}
var last=performance.now(),acc=0,meteorT=0;
function onBeat(){if(G.state==='pause')return;G.beat++;G.beats.push({r:3,a:.55});
var heat=G.state==='play'?clamp(G.enemies.length/12+(G.boss?.5:0)+G.wave/30,0,1):.05;
if(!MUS.active)A.beat(G.beat,heat,G.musicMode);
var vp=viewPlayer();
if(G.state==='play'&&vp.hp/vp.max<.3&&G.beat%2===0&&!CHEAT.god)A.tone(70,.12,'square',.14,.6)}
function frame(now){var raw=Math.min(.05,(now-last)/1000);last=now;G.dt=raw;
A.frameVoices=0;A.tokens=Math.min(36,A.tokens+raw*30);
pollGamepads();padMenus();stickWatch();
dashHeld=!!keys.Space||GP.dashHeld||touchDashHeld||mouseRightHeld;
if(GP.pause){if(G.state==='play')pause();else if(G.state==='pause')resume()}
updateVisual(raw);musUpdate(raw);
G.beatT+=raw;var guard=0;while(G.beatT>=.4&&guard++<4){G.beatT-=.4;onBeat()}
if(G.travel){G.travelT+=raw;
if(!G.menuOpened&&G.travelT>=.8){G.menuOpened=true;openUp();if(NET.mode==='host')netSend({t:'up'})}
if(G.travelDone){G.postT+=raw;if(G.postT>=1){G.travel=false;startLevel(G.pendingNode)}}}
if(NET.mode==='guest'){var ri=readInput(P2,1);
NET.pend.dash=NET.pend.dash||ri.dash;NET.pend.weapon=NET.pend.weapon||ri.weapon;NET.pend.swap=NET.pend.swap||ri.swap;
P2.input.mx=ri.mx;P2.input.my=ri.my;P2.input.aim=ri.aim;P2.input.focus=ri.focus;P2.input.held=ri.held;P2.input.mouse=false;
P2.input.dash=P2.input.dash||ri.dash;P2.input.weapon=P2.input.weapon||ri.weapon;P2.input.swap=P2.input.swap||ri.swap;
if(NET.connected&&now-NET.lastSend>33){NET.lastSend=now;
netSend({t:'input',mx:ri.mx,my:ri.my,aim:ri.aim,focus:ri.focus,dash:NET.pend.dash,weapon:NET.pend.weapon,swap:NET.pend.swap,held:ri.held});
NET.pend.dash=false;NET.pend.weapon=false;NET.pend.swap=false}
guestWorld(now);predictGuest(raw);render(ctx);applyBloom(ctx);hud(raw);requestAnimationFrame(frame);return}
if(G.state==='play'){feedInput(P,1);if(isLocal())feedInput(P2,2)}
var scale=G.state==='play'?(G.slow>0?.4:1):(G.state==='title'?.6:(G.state==='over'||G.state==='win'?.5:.1));
acc+=raw*scale;var steps=0;
while(acc>=STEP&&steps<5){update(STEP);acc-=STEP;steps++}
if(acc>STEP*5)acc=0;
if(NET.mode==='host'&&NET.connected&&now-NET.lastState>33){NET.lastState=now;netSend(snapshot())}
render(ctx);applyBloom(ctx);hud(raw);requestAnimationFrame(frame)}
function update(dt){G.t+=dt;G.shake=Math.max(0,G.shake-dt*22);G.flash=Math.max(0,G.flash-dt*2.2);
G.slow=Math.max(0,G.slow-dt);updateEffects(dt);
if(G.state!=='play')return;
updateChrono(dt);updateCapital(dt);updateContainer(dt);
G.st.time+=dt;G.waveT+=dt*(chronoAnyGlobal()?.4:1);
if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0){G.combo=0;G.mult=1}}
if(G.event==='meteor'){meteorT-=dt;if(meteorT<=0){meteorT=1.2;
var mp=nearestPlayer(rand(AR.x,AR.x+AR.w),rand(AR.y,AR.y+AR.h));
spawnZone(mp.x+rand(-40,40),mp.y+rand(-40,40),26,.7,1,14*D.dmg*dmgScale(),'#ffb020')}}
if(G.portal){var inside=null;
for(var i=0;i<PL.length;i++){var p=PL[i];if(p.hp>0&&hyp(p.x-G.portal.x,p.y-G.portal.y)<G.portal.r+p.r){inside=p;break}}
var still=inside&&hyp(inside.vx,inside.vy)<10&&hyp(inside.input.mx,inside.input.my)<.1&&!inside.trapped;
if(still){G.portalCharge+=dt;if(G.portalCharge>=1.5)enterPortal()}
else G.portalCharge=Math.max(0,G.portalCharge-dt*2)}
updateSpawns();
for(i=0;i<PL.length;i++)updatePlayer(PL[i],dt);
updateWells(dt);updateZoom(dt);updateTurrets(dt);updatePhantoms(dt);
updateBullets(dt);updateRockets(dt);updateERockets(dt);updateMines(dt);
updateHazards(dt);updateEnemies(dt);updateEnemyBullets(dt);updateDrops(dt);
G.shards=localPlayer().shards;G.frags=localPlayer().frags;
if(G.active&&!G.queue.length&&!G.enemies.length&&!G.portal)waveClear()}
try{initGame();window.__pulsarReady=true}catch(e){if(window.__boot)window.__boot('INIT: '+(e&&e.message||e))}
