/* =========================================================
   common.js — 引擎核心
   + 修复：手电筒开关状态在主线/支线里都正确识别
   + 修复：支线里手电筒光圈减半、雨色偏红、余烬粒子、心跳脉动
   + 支持 spot.label 为函数（可随状态改变显示文案）
   ========================================================= */
(function(){
'use strict';

const W = 960, H = 540;

window.S = { scene:'alley', inv:[], invBlood:[], flags:{}, ended:false };
window.__ENDING__ = false;

let stopped = false;
let highlightTimer = 0;
let currentSceneKey = null;

let cv = null, mainCtx = null;
let mouse = { x:-1, y:-1 };
let pointerAlpha = 0;
let hoverSpot = null;
let hasPointer = false;

let lastFrame = performance.now();
let time = 0;
let rainSpawnT = 0;

let rain = [], ripples = [], motes = [], embers = [];
const MAX_RIPPLES = 18;
const PERF = { rain:160, mainRain:95, motes:22, embers:55 };

let tempLightTimer = 0;
const TEMP_FADE = 0.6;
const TEMP_HOLD = 3.0;
const TEMP_TOTAL = TEMP_FADE + TEMP_HOLD + TEMP_FADE;

const VC = {
  tracking: false,
  x: W / 2, y: H / 2,
  lastTX: 0, lastTY: 0,
  startTime: 0,
  movedDist: 0,
  sensitivity: 2.2,
  clickFlash: 0,
  clickX: 0, clickY: 0
};

let touchMode = false;
let inputMode = 'mouse';
let lastTouchTime = 0;
let vcHintTimer = 0;

/* ★ 新增：解析 label（支持字符串 / 函数） */
function resolveLabel(sp){
  if(!sp || !sp.label) return null;
  return typeof sp.label === 'function' ? sp.label() : sp.label;
}

function isTouchDevice(){
  try{
    const p = new URLSearchParams(location.search).get('vc');
    if(p === '1') return true;
    if(p === '0') return false;
  }catch(e){}
  try{
    if(window.matchMedia){
      if(window.matchMedia('(pointer: coarse)').matches) return true;
      if(window.matchMedia('(any-pointer: coarse)').matches) return true;
      if(window.matchMedia('(hover: none)').matches) return true;
    }
  }catch(e){}
  if('ontouchstart' in window) return true;
  if(navigator.maxTouchPoints > 0) return true;
  if(navigator.msMaxTouchPoints > 0) return true;
  return false;
}

function scn(){ return window.__SCENES__; }
function getScene(key){
  const s = scn();
  return s ? s[key] : null;
}
function setSceneCtx(c){
  const s = scn();
  if(s && s.setCtx) s.setCtx(c);
}

function isPowerCut(){ return !!(window.S.flags && window.S.flags.powerCut); }
function isBloodMode(){ return !!(window.S.flags && window.S.flags.bloodMode); }

/* ★ 修复：手电筒开关状态 —— 主线读 flags.torchOn，支线读 flags.b_torchOn */
function isTorchOn(){
  if(!window.S || !window.S.flags) return false;
  return isBloodMode()
    ? !!window.S.flags.b_torchOn
    : !!window.S.flags.torchOn;
}

function rrectOn(c,x,y,w,h,r){
  c.beginPath();
  c.moveTo(x+r,y);
  c.arcTo(x+w,y,x+w,y+h,r);
  c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r);
  c.arcTo(x,y,x+w,y,r);
  c.closePath();
}
function rrOn(c,x,y,w,h,r,col){ rrectOn(c,x,y,w,h,r); c.fillStyle=col; c.fill(); }

/* ================== 雨 ================== */
function rebuildRain(){
  rain = [];
  for(let i=0;i<PERF.rain;i++){
    const isExtra = i >= PERF.mainRain;
    rain.push({
      x: Math.random()*W*1.4-140,
      y: Math.random()*H,
      len: (isExtra ? 14 : 10) + Math.random()*20,
      sp: (isExtra ? 760 : 640) + Math.random()*540,
      a: (isExtra ? 0.13 : 0.10) + Math.random()*0.12
    });
  }
}
function drawRain(dt){
  if(!rain.length) return;
  const blood = isBloodMode();
  const visible = blood ? rain.length : PERF.mainRain;
  mainCtx.save();
  mainCtx.strokeStyle = blood
    ? 'rgba(220,140,140,0.92)'
    : 'rgba(168,205,240,0.9)';
  mainCtx.lineWidth = blood ? 1.35 : 1;
  for(let i=0;i<rain.length;i++){
    const d = rain[i];
    d.y += d.sp * dt;
    d.x -= d.sp * dt * 0.16;
    if(d.y > H+24){ d.y = -30 - Math.random()*140; d.x = Math.random()*W*1.4 - 140; }
    if(d.x < -70) d.x = W + 50;
    if(i >= visible) continue;
    mainCtx.globalAlpha = d.a;
    mainCtx.beginPath();
    mainCtx.moveTo(d.x, d.y);
    mainCtx.lineTo(d.x - d.len*0.16, d.y - d.len);
    mainCtx.stroke();
  }
  mainCtx.restore();
}

/* ================== 余烬粒子（仅支线） ================== */
function rebuildEmbers(){
  embers = [];
  for(let i=0;i<PERF.embers;i++){
    embers.push({
      x: Math.random()*W,
      y: Math.random()*H,
      vx: (Math.random()-.5)*12,
      vy: -10 - Math.random()*28,
      r: 0.6 + Math.random()*1.8,
      a: 0.18 + Math.random()*0.42,
      hue: Math.random() < 0.4 ? '#ff8040' : '#c04020'
    });
  }
}
function drawEmbers(dt){
  if(!isBloodMode()) return;
  if(!embers.length) return;
  mainCtx.save();
  mainCtx.globalCompositeOperation = 'lighter';
  for(let i=0;i<embers.length;i++){
    const e = embers[i];
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if(e.y < -10){ e.y = H + 10; e.x = Math.random()*W; }
    if(e.x < -10){ e.x = W + 10; }
    if(e.x > W + 10){ e.x = -10; }
    mainCtx.globalAlpha = e.a;
    mainCtx.fillStyle = e.hue;
    mainCtx.beginPath();
    mainCtx.arc(e.x, e.y, e.r, 0, Math.PI*2);
    mainCtx.fill();
  }
  mainCtx.restore();
}

/* ================== 涟漪 ================== */
function spawnRipple(x,y){
  if(ripples.length >= MAX_RIPPLES) return;
  ripples.push({ x, y, r:1, max:12 + Math.random()*22, life:0, dur:.65 + Math.random()*.5 });
}
function updateRipples(dt){
  for(let i=ripples.length-1;i>=0;i--){
    const p = ripples[i];
    p.life += dt;
    if(p.life >= p.dur){ ripples.splice(i,1); continue; }
    p.r = 1 + p.max * (p.life / p.dur);
  }
}
function drawRipples(){
  if(!ripples.length) return;
  const blood = isBloodMode();
  mainCtx.save();
  mainCtx.strokeStyle = blood
    ? 'rgba(220,150,150,0.6)'
    : 'rgba(170,205,240,0.55)';
  mainCtx.lineWidth = 1.2;
  for(let i=0;i<ripples.length;i++){
    const p = ripples[i];
    mainCtx.globalAlpha = (1 - p.life / p.dur) * 0.5;
    mainCtx.beginPath();
    mainCtx.ellipse(p.x, p.y, p.r, p.r*0.32, 0, 0, Math.PI*2);
    mainCtx.stroke();
  }
  mainCtx.restore();
}

/* ================== 光尘（主线用） ================== */
function rebuildMotes(){
  motes = [];
  for(let i=0;i<PERF.motes;i++){
    motes.push({
      x: Math.random()*W, y: Math.random()*H,
      vx:(Math.random()-.5)*10, vy:-5 - Math.random()*12,
      r: .5 + Math.random()*1.4, a: .12 + Math.random()*.3
    });
  }
}

/* ================== 离屏缓存 ================== */
const bgCache = {};
function cacheKey(){
  const f = window.S.flags || {};
  const b = n => n ? '1' : '0';
  const p = b(f.powerCut);
  const bl = b(f.bloodMode);
  switch(currentSceneKey){
    case 'alley':       return b(f.trash) + b(f.photo1Taken) + p + bl;
    case 'backstreet':  return b(f.catfoodTaken) + b(f.catGone) + b(f.doorOpen) + p + bl;
    case 'shop':        return b(f.torchTaken) + b(f.batteryTaken) + b(f.lightsOn) + b(f.photo2Taken) + p + bl;
    case 'street':      return b(f.ropeTaken) + b(f.gateOpen) + p;
    case 'doorstep':    return b(f.powerCut);
    case 'house':       return b(f.photoJoined) + b(window.__ENDING__) + p;
    case 'powerstation':return b(f.powerCut);
    case 'rooftop':     return p;
    case 'underpass':   return b(f.powerCut);
    case 'riverside':   return b(f.ropeTaken) + b(f.photo1Taken) + p;
  }
  return '';
}
function getBg(){
  const key = cacheKey();
  const entry = bgCache[currentSceneKey];
  if(entry && entry.key === key) return entry.canvas;

  const c = entry ? entry.canvas : document.createElement('canvas');
  c.width = W; c.height = H;
  const offCtx = c.getContext('2d');
  offCtx.clearRect(0, 0, W, H);

  setSceneCtx(offCtx);
  const scene = getScene(currentSceneKey);
  if(scene && scene.draw) scene.draw(0);
  setSceneCtx(mainCtx);

  bgCache[currentSceneKey] = { canvas:c, key };
  return c;
}

function getLitBg(){
  const baseKey = cacheKey();
  const key = 'lit:' + currentSceneKey + ':' + baseKey;
  const entry = bgCache.__lit;
  if(entry && entry.key === key) return entry.canvas;

  const src = getBg();
  const c = entry ? entry.canvas : document.createElement('canvas');
  c.width = W; c.height = H;
  const cctx = c.getContext('2d');
  cctx.clearRect(0, 0, W, H);

  cctx.drawImage(src, 0, 0);
  cctx.globalCompositeOperation = 'lighter';
  cctx.fillStyle = 'rgba(240, 224, 200, 0.55)';
  cctx.fillRect(0, 0, W, H);
  cctx.globalCompositeOperation = 'source-over';

  bgCache.__lit = { canvas: c, key };
  return c;
}

let torchMaskCanvas = null;
function getTorchMaskCanvas(){
  if(!torchMaskCanvas){
    torchMaskCanvas = document.createElement('canvas');
    torchMaskCanvas.width = W;
    torchMaskCanvas.height = H;
  }
  return torchMaskCanvas;
}

let dynamicCanvas = null;
function getDynamicCanvas(){
  if(!dynamicCanvas){
    dynamicCanvas = document.createElement('canvas');
    dynamicCanvas.width = W;
    dynamicCanvas.height = H;
  }
  return dynamicCanvas;
}

/* ★ 手电筒半径：支线减半 */
function torchRadius(darkScene){
  const base = darkScene ? 290 : 230;
  return isBloodMode() ? Math.round(base * 0.5) : base;
}

function drawArrow(dir, x, y, t){
  const pulse = 0.55 + 0.45 * Math.sin(t * 2.2);
  const bob = Math.sin(t * 2.2) * 3;
  const sign = dir === 'left' ? -1 : 1;

  mainCtx.save();
  mainCtx.translate(x, y + bob);
  const halo = mainCtx.createRadialGradient(0, 0, 0, 0, 0, 52);
  halo.addColorStop(0, `rgba(255,220,150,${(0.10 + 0.14*pulse).toFixed(3)})`);
  halo.addColorStop(0.55, `rgba(255,200,120,${(0.03 + 0.05*pulse).toFixed(3)})`);
  halo.addColorStop(1, 'rgba(255,200,120,0)');
  mainCtx.fillStyle = halo;
  mainCtx.beginPath(); mainCtx.arc(0, 0, 52, 0, Math.PI*2); mainCtx.fill();
  mainCtx.fillStyle = `rgba(9,15,24,${(0.72 + 0.08*pulse).toFixed(3)})`;
  mainCtx.beginPath(); mainCtx.arc(0, 0, 24, 0, Math.PI*2); mainCtx.fill();
  mainCtx.strokeStyle = `rgba(255,214,140,${(0.5 + 0.4*pulse).toFixed(3)})`;
  mainCtx.lineWidth = 2;
  mainCtx.beginPath(); mainCtx.arc(0, 0, 24, 0, Math.PI*2); mainCtx.stroke();
  mainCtx.restore();
}

function drawAmbientLights(t){
  const scene = getScene(currentSceneKey);
  if(!scene || !scene.spots) return;
  const spots = scene.spots.filter(s => !s.cond || s.cond());
  if(!spots.length) return;

  const cut = isPowerCut();
  const blood = isBloodMode();
  const baseAlpha = blood ? 0.14 : (cut ? 0.10 : 0.18);
  const pulse = 0.75 + 0.25 * Math.sin(t * 1.6);

  mainCtx.save();
  mainCtx.globalCompositeOperation = 'lighter';

  for(let i = 0; i < spots.length; i++){
    const sp = spots[i];
    const cx = sp.x + sp.w/2;
    const cy = sp.y + sp.h/2;
    const maxR = Math.max(sp.w, sp.h) * 0.5;
    const R = Math.min(maxR + 34, 96);

    const g = mainCtx.createRadialGradient(cx, cy, 0, cx, cy, R);
    if(blood){
      g.addColorStop(0,   `rgba(255,150,130,${(baseAlpha * pulse).toFixed(3)})`);
      g.addColorStop(0.5, `rgba(210,80,70,${(baseAlpha * 0.35 * pulse).toFixed(3)})`);
      g.addColorStop(1,   'rgba(180,50,50,0)');
    } else {
      g.addColorStop(0,   `rgba(255,222,160,${(baseAlpha * pulse).toFixed(3)})`);
      g.addColorStop(0.5, `rgba(255,205,125,${(baseAlpha * 0.35 * pulse).toFixed(3)})`);
      g.addColorStop(1,   'rgba(255,200,120,0)');
    }
    mainCtx.fillStyle = g;
    mainCtx.fillRect(cx - R, cy - R, R*2, R*2);
  }
  mainCtx.restore();
}

function drawHighlight(t){
  if(highlightTimer <= 0) return;
  const scene = getScene(currentSceneKey);
  if(!scene || !scene.spots) return;

  const spots = scene.spots.filter(s => !s.cond || s.cond());
  const fade = Math.min(1, highlightTimer / 0.6);
  const pulse = 0.5 + 0.5 * Math.sin(t * 7);

  for(let i = 0; i < spots.length; i++){
    const sp = spots[i];
    const cx = sp.x + sp.w/2;
    const cy = sp.y + sp.h/2;
    const glowR = Math.max(sp.w, sp.h) * 0.9 + 30;

    const g = mainCtx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    g.addColorStop(0, `rgba(127,240,176,${(0.24*pulse*fade).toFixed(3)})`);
    g.addColorStop(0.5, `rgba(127,240,176,${(0.08*pulse*fade).toFixed(3)})`);
    g.addColorStop(1, 'rgba(127,240,176,0)');
    mainCtx.fillStyle = g;
    mainCtx.fillRect(cx - glowR, cy - glowR, glowR*2, glowR*2);

    mainCtx.save();
    mainCtx.strokeStyle = `rgba(127,240,176,${(0.7 + 0.3*pulse) * fade})`;
    mainCtx.lineWidth = 2.6;
    mainCtx.setLineDash([8, 6]);
    mainCtx.lineDashOffset = -t * 34;
    rrectOn(mainCtx, sp.x, sp.y, sp.w, sp.h, 10);
    mainCtx.stroke();
    mainCtx.restore();

    /* ★ 修复：label 支持函数 */
    const labelText = resolveLabel(sp);
    if(labelText){
      mainCtx.save();
      mainCtx.font = 'bold 14px "PingFang SC","Microsoft YaHei",sans-serif';
      const tw = mainCtx.measureText(labelText).width;
      let lx = cx;
      let ly = sp.y - 12;
      lx = Math.max(tw/2 + 18, Math.min(W - tw/2 - 18, lx));
      if(ly < 50) ly = sp.y + sp.h + 34;

      rrOn(mainCtx, lx - tw/2 - 12, ly - 22, tw + 24, 27, 9,
           `rgba(6,20,14,${(0.88*fade).toFixed(3)})`);
      mainCtx.strokeStyle = `rgba(127,240,176,${(0.7*fade).toFixed(3)})`;
      mainCtx.lineWidth = 1.2;
      rrectOn(mainCtx, lx - tw/2 - 12, ly - 22, tw + 24, 27, 9);
      mainCtx.stroke();

      mainCtx.fillStyle = `rgba(180,255,210,${fade.toFixed(3)})`;
      mainCtx.textAlign = 'center';
      mainCtx.textBaseline = 'middle';
      mainCtx.fillText(labelText, lx, ly - 8);
      mainCtx.restore();
    }
  }
}

function drawHover(t){
  if(!hoverSpot) return;
  mainCtx.save();
  mainCtx.strokeStyle = 'rgba(255,220,150,0.6)';
  mainCtx.lineWidth = 2;
  mainCtx.setLineDash([7, 5]);
  mainCtx.lineDashOffset = -t * 26;
  rrectOn(mainCtx, hoverSpot.x, hoverSpot.y, hoverSpot.w, hoverSpot.h, 10);
  mainCtx.stroke();
  mainCtx.setLineDash([]);

  /* ★ 修复：label 支持函数 */
  const labelText = resolveLabel(hoverSpot);
  if(labelText){
    mainCtx.save();
    mainCtx.font = 'bold 15px "PingFang SC","Microsoft YaHei",sans-serif';
    const tw = mainCtx.measureText(labelText).width;
    const gx = hoverSpot.x + hoverSpot.w/2;
    let lx = gx, ly = hoverSpot.y - 12;
    lx = Math.max(tw/2 + 18, Math.min(W - tw/2 - 18, lx));
    if(ly < 50) ly = hoverSpot.y + hoverSpot.h + 36;
    rrOn(mainCtx, lx - tw/2 - 13, ly - 24, tw + 26, 29, 10, 'rgba(8,14,22,0.9)');
    mainCtx.strokeStyle = 'rgba(255,220,150,0.45)';
    mainCtx.lineWidth = 1;
    rrectOn(mainCtx, lx - tw/2 - 13, ly - 24, tw + 26, 29, 10);
    mainCtx.stroke();
    mainCtx.fillStyle = '#ffd98f';
    mainCtx.textAlign = 'center';
    mainCtx.textBaseline = 'middle';
    mainCtx.fillText(labelText, lx, ly - 9);
    mainCtx.restore();
  }
  mainCtx.restore();
}

function drawPointer(dt){
  if(pointerAlpha <= 0.01 || mouse.x < 0 || mouse.y < 0) return;
  const hl = !!hoverSpot;
  const isVC = (inputMode === 'touch');
  const R = isVC ? (hl ? 26 : 20) : (hl ? 23 : 17);

  mainCtx.save();
  mainCtx.globalAlpha = Math.min(1, pointerAlpha);
  mainCtx.translate(mouse.x, mouse.y);

  const g = mainCtx.createRadialGradient(0,0,0,0,0,R*2);
  g.addColorStop(0, hl ? 'rgba(255,214,140,0.22)'
                       : (isVC ? 'rgba(190,225,255,0.16)' : 'rgba(170,210,250,0.09)'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  mainCtx.fillStyle = g;
  mainCtx.beginPath(); mainCtx.arc(0,0,R*2,0,Math.PI*2); mainCtx.fill();

  mainCtx.strokeStyle = hl
    ? 'rgba(255,214,140,0.95)'
    : (isVC ? 'rgba(210,235,255,0.85)' : 'rgba(190,220,250,0.45)');
  mainCtx.lineWidth = isVC ? 2.6 : 2;
  mainCtx.beginPath(); mainCtx.arc(0,0,R,0,Math.PI*2); mainCtx.stroke();

  if(isVC){
    mainCtx.strokeStyle = hl ? 'rgba(255,214,140,0.75)' : 'rgba(210,235,255,0.55)';
    mainCtx.lineWidth = 1.4;
    mainCtx.beginPath();
    mainCtx.moveTo(-R - 7, 0); mainCtx.lineTo(-R + 4, 0);
    mainCtx.moveTo(R - 4, 0);  mainCtx.lineTo(R + 7, 0);
    mainCtx.moveTo(0, -R - 7); mainCtx.lineTo(0, -R + 4);
    mainCtx.moveTo(0, R - 4);  mainCtx.lineTo(0, R + 7);
    mainCtx.stroke();
  }

  mainCtx.fillStyle = hl
    ? 'rgba(255,214,140,1)'
    : (isVC ? 'rgba(230,240,255,0.95)' : 'rgba(200,225,255,0.65)');
  mainCtx.beginPath(); mainCtx.arc(0,0, isVC ? 4 : 3, 0, Math.PI*2); mainCtx.fill();
  mainCtx.restore();
}

function getSpots(){
  const scene = getScene(currentSceneKey);
  if(!scene || !scene.spots) return [];
  return scene.spots.filter(s => !s.cond || s.cond());
}
function findSpotAt(x, y){
  const list = getSpots();
  for(let i = list.length - 1; i >= 0; i--){
    const s = list[i];
    if(x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
  }
  return null;
}

function isDarkScene(){
  const f = window.S.flags || {};
  return !!f.powerCut
      || (currentSceneKey === 'shop' && !f.lightsOn && !isBloodMode())
      || (currentSceneKey === 'powerstation' && f.powerCut);
}

function renderDynamicLayer(scene, t, dt){
  if(!scene.dynamic) return;
  const torchOn = isTorchOn();
  const dark = isDarkScene();
  if(!dark || !torchOn){
    scene.dynamic(t, dt);
    return;
  }
  const dcv = getDynamicCanvas();
  const dctx = dcv.getContext('2d');
  dctx.globalCompositeOperation = 'source-over';
  dctx.globalAlpha = 1;
  dctx.clearRect(0, 0, W, H);
  setSceneCtx(dctx);
  scene.dynamic(t, dt);
  setSceneCtx(mainCtx);

  let mx = mouse.x, my = mouse.y;
  if(!hasPointer){ mx = W * 0.5; my = H * 0.58; }
  const R = torchRadius(true);

  dctx.globalCompositeOperation = 'destination-in';
  const mask = dctx.createRadialGradient(mx, my, 0, mx, my, R);
  mask.addColorStop(0,    'rgba(0,0,0,1)');
  mask.addColorStop(0.45, 'rgba(0,0,0,0.94)');
  mask.addColorStop(0.72, 'rgba(0,0,0,0.52)');
  mask.addColorStop(0.9,  'rgba(0,0,0,0.14)');
  mask.addColorStop(1,    'rgba(0,0,0,0)');
  dctx.fillStyle = mask;
  dctx.fillRect(0, 0, W, H);
  dctx.globalCompositeOperation = 'source-over';

  mainCtx.drawImage(dcv, 0, 0);
}

function drawBloodOverlay(){
  if(!isBloodMode()) return;
  mainCtx.save();
  mainCtx.fillStyle = 'rgba(60, 8, 12, 0.30)';
  mainCtx.fillRect(0, 0, W, H);
  mainCtx.fillStyle = 'rgba(120, 20, 30, 0.12)';
  mainCtx.fillRect(0, 0, W, H);
  const vg = mainCtx.createRadialGradient(W/2, H/2, H*0.20, W/2, H/2, H*0.88);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.7, 'rgba(30, 0, 4, 0.35)');
  vg.addColorStop(1, 'rgba(20, 0, 2, 0.82)');
  mainCtx.fillStyle = vg;
  mainCtx.fillRect(0, 0, W, H);
  mainCtx.restore();
}

function drawHeartbeat(t){
  if(!isBloodMode()) return;
  const pulse = 0.5 + 0.5*Math.sin(t * 1.7);
  const a = 0.05 + 0.07 * pulse;
  mainCtx.save();
  mainCtx.fillStyle = `rgba(70, 0, 8, ${a.toFixed(3)})`;
  mainCtx.fillRect(0, 0, W, H);
  mainCtx.restore();
}

function drawTempLight(dt){
  if(tempLightTimer <= 0) return;
  if(isBloodMode()) return;
  tempLightTimer = Math.max(0, tempLightTimer - dt);
  const elapsed = TEMP_TOTAL - tempLightTimer;
  let alpha = 0;
  if(elapsed < TEMP_FADE){ alpha = elapsed / TEMP_FADE; }
  else if(elapsed < TEMP_FADE + TEMP_HOLD){ alpha = 1; }
  else if(elapsed < TEMP_TOTAL){ alpha = Math.max(0, (TEMP_TOTAL - elapsed) / TEMP_FADE); }
  else return;
  if(alpha <= 0.001) return;
  const lit = getLitBg();
  mainCtx.save();
  mainCtx.globalAlpha = alpha * 0.92;
  mainCtx.drawImage(lit, 0, 0);
  mainCtx.restore();
  mainCtx.save();
  mainCtx.globalCompositeOperation = 'lighter';
  mainCtx.fillStyle = `rgba(255,240,205,${(alpha * 0.10).toFixed(3)})`;
  mainCtx.fillRect(0, 0, W, H);
  mainCtx.restore();
}

function render(dt, t){
  mainCtx.clearRect(0, 0, W, H);
  setSceneCtx(mainCtx);

  const scene = getScene(currentSceneKey);
  if(!scene) return;

  mainCtx.drawImage(getBg(), 0, 0);

  if(isPowerCut()){
    mainCtx.save();
    mainCtx.fillStyle = 'rgba(2, 8, 20, 0.42)';
    mainCtx.fillRect(0, 0, W, H);
    mainCtx.fillStyle = 'rgba(20, 40, 70, 0.08)';
    mainCtx.fillRect(0, 0, W, H);
    mainCtx.restore();
  }

  drawTorchBackground(t);

  if(scene.rain){
    drawRain(dt);
    rainSpawnT += dt;
    const interval = 0.09;
    while(rainSpawnT > interval){
      rainSpawnT -= interval;
      if(currentSceneKey === 'alley')           spawnRipple(200 + Math.random()*620, 452 + Math.random()*70);
      else if(currentSceneKey === 'backstreet') spawnRipple(60 + Math.random()*780, 460 + Math.random()*66);
      else if(currentSceneKey === 'street')     spawnRipple(40 + Math.random()*800, 466 + Math.random()*62);
      else if(currentSceneKey === 'riverside')  spawnRipple(50 + Math.random()*860, 440 + Math.random()*80);
    }
  }
  updateRipples(dt);
  drawRipples();

  drawEmbers(dt);

  renderDynamicLayer(scene, t, dt);

  drawTorchDarknessOverlay();

  drawBloodOverlay();

  drawHeartbeat(t);

  drawTempLight(dt);

  drawAmbientLights(t);

  if(scene.arrows){
    for(let i = 0; i < scene.arrows.length; i++){
      const a = scene.arrows[i];
      drawArrow(a.dir, a.x, a.y, t);
    }
  }

  if(highlightTimer > 0){
    highlightTimer = Math.max(0, highlightTimer - dt);
  }

  hoverSpot = null;
  if(pointerAlpha > 0.01 && mouse.x >= 0 && mouse.y >= 0 && mouse.x <= W && mouse.y <= H){
    hoverSpot = findSpotAt(mouse.x, mouse.y);
  }

  drawHighlight(t);
  drawHover(t);
  drawPointer(dt);

  if(inputMode === 'touch' && VC.tracking){
    const pulse = 0.5 + 0.5 * Math.sin(t * 8);
    mainCtx.save();
    mainCtx.globalAlpha = 0.45 + 0.35 * pulse;
    mainCtx.strokeStyle = 'rgba(180,220,255,0.9)';
    mainCtx.lineWidth = 2;
    mainCtx.setLineDash([5, 5]);
    mainCtx.lineDashOffset = -t * 20;
    mainCtx.beginPath();
    mainCtx.arc(VC.x, VC.y, 32, 0, Math.PI * 2);
    mainCtx.stroke();
    mainCtx.setLineDash([]);
    mainCtx.restore();
  }

  if(VC.clickFlash > 0){
    const a = VC.clickFlash;
    mainCtx.save();
    mainCtx.globalAlpha = a;
    mainCtx.strokeStyle = 'rgba(255,214,140,0.95)';
    mainCtx.lineWidth = 3;
    mainCtx.beginPath();
    mainCtx.arc(VC.clickX, VC.clickY, 18 + (1 - a) * 34, 0, Math.PI * 2);
    mainCtx.stroke();
    mainCtx.restore();
    VC.clickFlash = Math.max(0, VC.clickFlash - dt * 2.5);
  }

  if(inputMode === 'touch' && vcHintTimer > 0){
    const fade = Math.min(1, vcHintTimer < 1 ? vcHintTimer : 1);
    const a = fade * 0.92;
    mainCtx.save();
    mainCtx.globalAlpha = a;
    mainCtx.font = 'bold 15px "PingFang SC","Microsoft YaHei",sans-serif';
    const txt = '滑动手指移动光标 · 直接点在目标上也可';
    const tw = mainCtx.measureText(txt).width;
    const px = W / 2, py = H - 42;
    rrOn(mainCtx, px - tw/2 - 18, py - 22, tw + 36, 32, 10, 'rgba(8,14,22,0.88)');
    mainCtx.strokeStyle = 'rgba(180,220,255,0.4)';
    mainCtx.lineWidth = 1;
    rrectOn(mainCtx, px - tw/2 - 18, py - 22, tw + 36, 32, 10);
    mainCtx.stroke();
    mainCtx.fillStyle = 'rgba(230,240,255,0.95)';
    mainCtx.textAlign = 'center';
    mainCtx.textBaseline = 'middle';
    mainCtx.fillText(txt, px, py - 6);
    mainCtx.restore();
    vcHintTimer -= dt;
  }

  if(inputMode === 'touch'){
    pointerAlpha = 1;
  } else if(pointerAlpha > 0){
    pointerAlpha = Math.max(0, pointerAlpha - dt * 0.55);
  }
}

function loop(now){
  if(stopped) return;
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  time += dt;
  render(dt, time);
  requestAnimationFrame(loop);
}

function resizeCanvas(){
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  const cssW = Math.round(W * scale);
  const cssH = Math.round(H * scale);
  cv.style.width  = cssW + 'px';
  cv.style.height = cssH + 'px';
  cv.style.left = Math.round((vw - cssW) / 2) + 'px';
  cv.style.top  = Math.round((vh - cssH) / 2) + 'px';
  const dprLimit = isBloodMode() ? 1.35 : 1.0;
  const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);
  cv.width  = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  mainCtx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  mainCtx.imageSmoothingEnabled = true;
}

function updateMouseFromEvent(clientX, clientY){
  if(!cv) return;
  const r = cv.getBoundingClientRect();
  mouse.x = (clientX - r.left) * (W / r.width);
  mouse.y = (clientY - r.top) * (H / r.height);
  hasPointer = true;
}

function bindInput(){
  cv.addEventListener('mousemove', e => {
    const now = performance.now();
    if(now - lastTouchTime < 700) return;
    if(inputMode !== 'mouse') inputMode = 'mouse';
    updateMouseFromEvent(e.clientX, e.clientY);
    pointerAlpha = 0.8;
  });
  cv.addEventListener('mouseleave', () => {
    if(inputMode !== 'mouse') return;
    pointerAlpha = 0;
  });
  window.addEventListener('blur', () => {
    if(inputMode === 'mouse') pointerAlpha = 0;
  });
  cv.addEventListener('click', e => {
    const now = performance.now();
    if(now - lastTouchTime < 700) return;
    if(inputMode !== 'mouse') return;
    updateMouseFromEvent(e.clientX, e.clientY);
    const s = findSpotAt(mouse.x, mouse.y);
    if(s) window.parent.postMessage({ type:'hit', spotId:s.id }, '*');
  });

  cv.addEventListener('touchstart', e => {
    e.preventDefault();
    if(!e.touches.length) return;
    lastTouchTime = performance.now();
    inputMode = 'touch';
    const t0 = e.touches[0];
    VC.tracking = true;
    VC.lastTX = t0.clientX;
    VC.lastTY = t0.clientY;
    VC.startTime = performance.now();
    VC.movedDist = 0;
    if(!hasPointer){ VC.x = W * 0.5; VC.y = H * 0.55; }
    mouse.x = VC.x; mouse.y = VC.y;
    hasPointer = true;
    pointerAlpha = 1;
  }, {passive:false});

  cv.addEventListener('touchmove', e => {
    e.preventDefault();
    if(!e.touches.length) return;
    lastTouchTime = performance.now();
    inputMode = 'touch';
    if(!VC.tracking) return;
    const t0 = e.touches[0];
    const dxs = t0.clientX - VC.lastTX;
    const dys = t0.clientY - VC.lastTY;
    VC.lastTX = t0.clientX; VC.lastTY = t0.clientY;
    VC.movedDist += Math.sqrt(dxs*dxs + dys*dys);
    const r = cv.getBoundingClientRect();
    const kx = W / r.width, ky = H / r.height;
    VC.x = Math.max(0, Math.min(W, VC.x + dxs * kx * VC.sensitivity));
    VC.y = Math.max(0, Math.min(H, VC.y + dys * ky * VC.sensitivity));
    mouse.x = VC.x; mouse.y = VC.y;
  }, {passive:false});

  cv.addEventListener('touchend', e => {
    e.preventDefault();
    lastTouchTime = performance.now();
    if(!VC.tracking) return;
    VC.tracking = false;
    const t0 = e.changedTouches && e.changedTouches[0];
    const dtms = performance.now() - VC.startTime;
    if(VC.movedDist < 20 && dtms < 800){
      let hit = null;
      if(t0){
        const r = cv.getBoundingClientRect();
        const tx = (t0.clientX - r.left) * (W / r.width);
        const ty = (t0.clientY - r.top) * (H / r.height);
        hit = findSpotAt(tx, ty);
        if(hit){ VC.x = tx; VC.y = ty; mouse.x = tx; mouse.y = ty; }
      }
      if(!hit) hit = findSpotAt(VC.x, VC.y);
      if(hit){
        window.parent.postMessage({ type:'hit', spotId:hit.id }, '*');
        VC.clickX = mouse.x;
        VC.clickY = mouse.y;
        VC.clickFlash = 1;
      }
    }
  }, {passive:false});
  cv.addEventListener('touchcancel', () => { VC.tracking = false; });
}

let lastBlood = null;
function bindMessage(){
  window.addEventListener('message', e => {
    const d = e.data;
    if(!d || !d.type) return;
    if(d.type === 'stop'){ stopped = true; return; }
    if(d.type === 'setState'){
      if(d.state){
        window.S = d.state;
        if(!window.S.flags) window.S.flags = {};
        if(!window.S.inv) window.S.inv = [];
        if(!window.S.invBlood) window.S.invBlood = [];
        const nowBlood = isBloodMode();
        if(lastBlood !== nowBlood){
          lastBlood = nowBlood;
          rebuildRain();
          if(nowBlood) rebuildEmbers();
          resizeCanvas();
        }
      }
    }
    else if(d.type === 'setEnding'){ window.__ENDING__ = !!d.value; }
    else if(d.type === 'setHighlight'){ highlightTimer = d.duration || 5; }
    else if(d.type === 'tempLight'){
      if(isBloodMode()) return;
      tempLightTimer = TEMP_TOTAL;
    }
  });
  window.parent.postMessage({ type:'ready' }, '*');
}

function boot(sceneKey){
  currentSceneKey = sceneKey;
  if(!getScene(sceneKey)){
    console.warn('[common] 未知场景:', sceneKey);
    return;
  }
  cv = document.getElementById('cv');
  if(!cv){
    console.error('[common] 缺少 #cv 画布');
    return;
  }
  mainCtx = cv.getContext('2d', { alpha:false });
  setSceneCtx(mainCtx);

  rebuildRain();
  rebuildMotes();
  rebuildEmbers();
  ripples.length = 0;

  lastBlood = isBloodMode();

  touchMode = isTouchDevice();
  inputMode = touchMode ? 'touch' : 'mouse';

  if(touchMode){
    VC.x = W * 0.5; VC.y = H * 0.55;
    VC.sensitivity = 2.2;
    mouse.x = VC.x; mouse.y = VC.y;
    hasPointer = true;
    pointerAlpha = 1;
    try{
      if(!sessionStorage.getItem('vc_hint_shown')){
        vcHintTimer = 6.5;
        sessionStorage.setItem('vc_hint_shown', '1');
      }
    }catch(e){ vcHintTimer = 6.5; }
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 200));

  bindInput();
  bindMessage();

  lastFrame = performance.now();
  requestAnimationFrame(loop);
}

window.__engineStop = function(){
  stopped = true;
  try{
    if(mainCtx) mainCtx.clearRect(0, 0, W, H);
    if(cv) cv.style.visibility = 'hidden';
  }catch(e){}
};
window.addEventListener('pagehide', () => { stopped = true; });
window.addEventListener('beforeunload', () => { stopped = true; });

function drawTorchBackground(t){
  const on = isTorchOn();
  if(!on) return;

  let mx = mouse.x, my = mouse.y;
  if(!hasPointer){ mx = W * 0.5; my = H * 0.58; }

  const darkScene = isDarkScene();
  const flick = 0.93 + 0.07 * Math.sin(t * 17) * (Math.random() > 0.85 ? 1.5 : 1);
  const R = torchRadius(darkScene);
  const boost = darkScene ? 1.0 : 0.55;
  const litAlpha = Math.min(1, 0.86 * boost + 0.16);

  const g = mainCtx.createRadialGradient(mx, my, 0, mx, my, R);
  g.addColorStop(0,    'rgba(0,0,0,0)');
  g.addColorStop(0.34, `rgba(0,0,0,${(0.04 * boost * flick).toFixed(3)})`);
  g.addColorStop(0.64, `rgba(0,0,0,${(0.32 * boost * flick).toFixed(3)})`);
  g.addColorStop(1,    `rgba(0,0,0,${(0.86 * boost * flick).toFixed(3)})`);
  mainCtx.fillStyle = g;
  mainCtx.fillRect(0, 0, W, H);

  const lit = getLitBg();
  const tmp = getTorchMaskCanvas();
  const tctx = tmp.getContext('2d');
  tctx.globalCompositeOperation = 'source-over';
  tctx.clearRect(0, 0, W, H);
  tctx.drawImage(lit, 0, 0);

  tctx.globalCompositeOperation = 'destination-in';
  const mask = tctx.createRadialGradient(mx, my, 0, mx, my, R);
  mask.addColorStop(0,    'rgba(0,0,0,1)');
  mask.addColorStop(0.42, 'rgba(0,0,0,0.97)');
  mask.addColorStop(0.72, 'rgba(0,0,0,0.55)');
  mask.addColorStop(0.9,  'rgba(0,0,0,0.15)');
  mask.addColorStop(1,    'rgba(0,0,0,0)');
  tctx.fillStyle = mask;
  tctx.fillRect(0, 0, W, H);
  tctx.globalCompositeOperation = 'source-over';

  mainCtx.save();
  mainCtx.globalAlpha = litAlpha;
  mainCtx.drawImage(tmp, 0, 0);
  mainCtx.restore();

  mainCtx.save();
  mainCtx.globalCompositeOperation = 'lighter';
  const warmR = R * 0.95;
  const warm = mainCtx.createRadialGradient(mx, my, 0, mx, my, warmR);
  if(isBloodMode()){
    warm.addColorStop(0,    `rgba(255,220,180,${(0.24 * boost * flick).toFixed(3)})`);
    warm.addColorStop(0.38, `rgba(255,190,140,${(0.12 * boost * flick).toFixed(3)})`);
    warm.addColorStop(0.72, `rgba(255,150,110,${(0.05 * boost * flick).toFixed(3)})`);
    warm.addColorStop(1,    'rgba(200,80,60,0)');
  } else {
    warm.addColorStop(0,    `rgba(255,244,214,${(0.28 * boost * flick).toFixed(3)})`);
    warm.addColorStop(0.38, `rgba(255,232,186,${(0.14 * boost * flick).toFixed(3)})`);
    warm.addColorStop(0.72, `rgba(255,220,158,${(0.05 * boost * flick).toFixed(3)})`);
    warm.addColorStop(1,    'rgba(255,210,140,0)');
  }
  mainCtx.fillStyle = warm;
  mainCtx.beginPath();
  mainCtx.arc(mx, my, warmR, 0, Math.PI * 2);
  mainCtx.fill();
  mainCtx.restore();

  mainCtx.save();
  mainCtx.globalCompositeOperation = 'lighter';
  const hot = mainCtx.createRadialGradient(mx, my, 0, mx, my, 44);
  hot.addColorStop(0, `rgba(255,250,232,${(0.30 * boost * flick).toFixed(3)})`);
  hot.addColorStop(0.6, `rgba(255,244,210,${(0.09 * boost * flick).toFixed(3)})`);
  hot.addColorStop(1, 'rgba(255,240,200,0)');
  mainCtx.fillStyle = hot;
  mainCtx.beginPath();
  mainCtx.arc(mx, my, 44, 0, Math.PI * 2);
  mainCtx.fill();
  mainCtx.restore();

  mainCtx.save();
  mainCtx.strokeStyle = `rgba(255,234,186,${(0.16 * boost * flick).toFixed(3)})`;
  mainCtx.lineWidth = 1.4;
  mainCtx.beginPath();
  mainCtx.arc(mx, my, warmR * 0.94, 0, Math.PI * 2);
  mainCtx.stroke();
  mainCtx.restore();
}

function drawTorchDarknessOverlay(){
  if(isTorchOn()) return;
  if(!isDarkScene()) return;
  mainCtx.fillStyle = 'rgba(0,0,0,0.55)';
  mainCtx.fillRect(0, 0, W, H);
}

window.SceneCommon = { boot };
})();