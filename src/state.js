import { WORLD } from './constants.js';

export const store = {
  get(k,d){try{const v=localStorage.getItem('ppix_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem('ppix_'+k,JSON.stringify(v))}catch(e){}}
};

export const G = {
  state:'title',t:0,wave:0,waveT:0,score:0,shards:0,kills:0,combo:0,comboT:0,mult:1,
  diff:store.get('diff','normal'),enemies:[],bul:[],ebul:[],rockets:[],parts:[],drops:[],floats:[],rings:[],ghost:[],beats:[],
  queue:[],active:false,boss:null,shake:0,flash:0,flashCol:'#fff',slow:0,clearT:0,beat:0,beatT:0,
  best:store.get('best',{score:0,wave:0}),runs:store.get('runs',0),st:{shots:0,hits:0,time:0}
};

export const P = {
  x:0,y:0,vx:0,vy:0,r:5,hp:100,max:100,aim:0,fireT:0,dashT:0,dashCd:0,dx:1,dy:0,inv:0,hurtT:0,
  lvl:{},noHit:0,focus:false,dT:[],shield:0,shieldT:0,rocketCd:0
};

export const S = {};
export const CAM = { x:0, y:0 };
export const VIEW = { x:0, y:0, w:240, h:240 };

let eid=0;
export function nextEid(){return ++eid}

export const keys = {};
export let mx=0,my=0,mouseT=-99;
export function setMouse(x,y,t){mx=x;my=y;mouseT=t}

export const sticks = {
  move:{id:null,ox:0,oy:0,x:0,y:0,dx:0,dy:0,m:0},
  aim:{id:null,ox:0,oy:0,x:0,y:0,dx:0,dy:0,m:0}
};

export const AR = { x:0, y:0, w:WORLD.w, h:WORLD.h };
export let W=240,H=240,SCALE=3;
export function setCanvasSize(w,h,scale){W=w;H=h;SCALE=scale}
export function setView(x,y,w,h){VIEW.x=x;VIEW.y=y;VIEW.w=w;VIEW.h=h}

export const isTouch = (window.matchMedia&&window.matchMedia('(hover:none)').matches)||('ontouchstart' in window);
