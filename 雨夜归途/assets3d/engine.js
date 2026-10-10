/* =========================================================
   engine.js — 真 3D 引擎 v4
   Props 几何体 + 恐怖层 + 纯键盘视角
   ========================================================= */
(function(){
'use strict';

const W = 960, H = 540;

let viewport, canvas, renderer;
let fxCanvas, fxCtx;
let sceneKey = null, map = null;

let stopped = false;
let lastFrame = performance.now();
let time = 0;
let sceneEnterTime = 0;

const cam = { x:1.5, z:9.5, yaw:-Math.PI/2, pitch:0, eye:1.3 };

let camDriftYaw = 0, camDriftPitch = 0, camDriftT = 0, nextDriftAt = 0;
const keys = {};
let isTouch = false;
let touchLook = null, touchMove = null;
let isMoving = false;
let nearby = null;
const triggerTime = {};
const texCache = {};
const spriteTexCache = {};
const spritePendings = {};

let scareTime = 0, scareSeed = 0, nextScareAt = 0;
let silenceT = 0, nextSilenceAt = 0;
let invertT = 0, nextInvertAt = 0;
let intrudeT = 0, intrudeX = 0, intrudeY = 0, intrudeSeed = 0, nextIntrudeAt = 0;
let bloodDrops = [];
let shakeTime = 0, shakeAmp = 0;
let breathPhase = 0;
let audioReady = false;

const F = () => (window.S && window.S.flags) || {};
function isBloodMode(){ return !!F().bloodMode; }
function isTorchOn(){ return isBloodMode() ? !!F().b_torchOn : !!F().torchOn; }

function getPanic(){
  if(!isBloodMode()) return 0;
  let p = 0.35;
  p += Math.min(0.25, (performance.now() - sceneEnterTime) / 1000 / 220);
  if(nearby) p += 0.20;
  if(isMoving) p += 0.10;
  if(scareTime > 0) p += 0.5;
  if(silenceT > 0) p += 0.25;
  return Math.min(1, p);
}

/* ==================== 音频 ==================== */
const HorrorAudio = (function(){
  let ctx = null, master = null;
  let rainGain = null, rumbleGain = null, breathGain = null;
  let heartInterval = 1.1, lastBeat = 0;

  function init(){
    if(ctx) return;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.55;
      master.connect(ctx.destination);

      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const filt = ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=420;
      rainGain = ctx.createGain(); rainGain.gain.value = 0.16;
      src.connect(filt).connect(rainGain).connect(master); src.start();

      const osc = ctx.createOscillator(); osc.type='sine'; osc.frequency.value=30;
      rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0.06;
      osc.connect(rumbleGain).connect(master); osc.start();

      const bbuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const bd = bbuf.getChannelData(0);
      for(let i = 0; i < bd.length; i++) bd[i] = (Math.random()*2-1) * 0.5;
      const bsrc = ctx.createBufferSource(); bsrc.buffer = bbuf; bsrc.loop = true;
      const bfilt = ctx.createBiquadFilter(); bfilt.type='bandpass';
      bfilt.frequency.value = 620; bfilt.Q.value = 1.4;
      breathGain = ctx.createGain(); breathGain.gain.value = 0.02;
      bsrc.connect(bfilt).connect(breathGain).connect(master); bsrc.start();

      setInterval(heartTick, 100);
    }catch(e){ console.warn('[音频]', e); }
  }
  function thump(when, freq, vol){
    if(!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(freq, when);
    o.frequency.exponentialRampToValueAtTime(freq*0.55, when+0.24);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when+0.26);
    o.connect(g).connect(master); o.start(when); o.stop(when+0.32);
  }
  function heartTick(){
    if(!ctx || ctx.state !== 'running') return;
    const blood = isBloodMode();
    heartInterval = blood ? (1.10 - 0.60*getPanic()) : 1.8;
    const now = performance.now() / 1000;
    if(now - lastBeat > heartInterval){
      lastBeat = now;
      const vol = blood ? (0.24 + 0.32*getPanic()) : 0.06;
      const t0 = ctx.currentTime;
      thump(t0, 62, vol);
      thump(t0+0.30, 50, vol*0.7);
    }
  }
  function scareScream(){
    if(!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime;
    const o1 = ctx.createOscillator(); const g1 = ctx.createGain();
    o1.type='sine'; o1.frequency.setValueAtTime(180, t0);
    o1.frequency.exponentialRampToValueAtTime(22, t0+0.65);
    g1.gain.setValueAtTime(0, t0);
    g1.gain.linearRampToValueAtTime(0.7, t0+0.02);
    g1.gain.exponentialRampToValueAtTime(0.0001, t0+1.1);
    o1.connect(g1).connect(master); o1.start(t0); o1.stop(t0+1.2);

    const nbuf = ctx.createBuffer(1, ctx.sampleRate*0.7, ctx.sampleRate);
    const nd = nbuf.getChannelData(0);
    for(let i = 0; i < nd.length; i++) nd[i] = Math.random()*2-1;
    const nsrc = ctx.createBufferSource(); nsrc.buffer = nbuf;
    const nfilt = ctx.createBiquadFilter(); nfilt.type='highpass'; nfilt.frequency.value=1800;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0, t0);
    ng.gain.linearRampToValueAtTime(0.24, t0+0.01);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0+0.55);
    nsrc.connect(nfilt).connect(ng).connect(master); nsrc.start(t0);

    const o2 = ctx.createOscillator(); o2.type='sawtooth';
    o2.frequency.setValueAtTime(240, t0);
    o2.frequency.exponentialRampToValueAtTime(120, t0+0.45);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, t0);
    g2.gain.linearRampToValueAtTime(0.06, t0+0.005);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0+0.5);
    o2.connect(g2).connect(master); o2.start(t0); o2.stop(t0+0.55);
  }
  function footstepBehind(){
    if(!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime;
    const nbuf = ctx.createBuffer(1, ctx.sampleRate*0.14, ctx.sampleRate);
    const nd = nbuf.getChannelData(0);
    for(let i = 0; i < nd.length; i++) nd[i] = (Math.random()*2-1) * Math.exp(-i/2200);
    const src = ctx.createBufferSource(); src.buffer = nbuf;
    const filt = ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=320;
    const g = ctx.createGain(); g.gain.value = 0.22;
    src.connect(filt).connect(g).connect(master); src.start(t0);
  }
  function updateMix(){
    if(!ctx) return;
    const blood = isBloodMode();
    const silent = silenceT > 0;
    const rT = silent ? 0.005 : (blood ? 0.20 : 0.06);
    const mT = silent ? 0.004 : (blood ? 0.07 : 0.02);
    const bT = silent ? 0.001 : (blood ? (0.03 + 0.04*getPanic()) : 0.01);
    if(rainGain)   rainGain.gain.value   += (rT - rainGain.gain.value)   * 0.12;
    if(rumbleGain) rumbleGain.gain.value += (mT - rumbleGain.gain.value) * 0.12;
    if(breathGain) breathGain.gain.value += (bT - breathGain.gain.value) * 0.12;
  }
  function resume(){ if(ctx && ctx.state === 'suspended') ctx.resume(); }
  return { init, resume, scareScream, footstepBehind, updateMix };
})();

function ensureAudio(){
  if(!audioReady){ audioReady = true; HorrorAudio.init(); }
  HorrorAudio.resume();
}

/* ==================== 纹理 ==================== */
const TEX_SIZE = 128;

function makeWallTextureCanvas(spec){
  const S = TEX_SIZE;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const x = c.getContext('2d');
  const type = spec.type || 'brick';

  if(type === 'brick' || type === 'wetBrick' || type === 'burnt'){
    const isWet = type === 'wetBrick';
    const isBurnt = type === 'burnt';
    const base = spec.base || (isBurnt ? '#120806' : (isWet ? '#1a1018' : '#2a1a1a'));

    const bg = x.createLinearGradient(0, 0, 0, S);
    bg.addColorStop(0, base);
    bg.addColorStop(1, shade(base, -0.25));
    x.fillStyle = bg; x.fillRect(0, 0, S, S);

    const bw = 32, bh = 16;
    const rows = S / bh;
    for(let row = 0; row < rows; row++){
      const yy = row * bh;
      const off = (row % 2) ? 0 : bw/2;
      for(let xx = off - bw; xx < S; xx += bw){
        const bx = xx + 1, by = yy + 1;
        const cellW = bw - 2, cellH = bh - 2;
        const seed = (row * 31 + xx * 17) % 100;
        const tint = (seed - 50) / 400;
        x.fillStyle = shade(base, tint * 0.6);
        x.fillRect(bx, by, cellW, cellH);
        x.fillStyle = 'rgba(255,255,255,' + (0.05 + Math.random()*0.04) + ')';
        x.fillRect(bx, by, cellW, 1);
        x.fillStyle = 'rgba(0,0,0,0.35)';
        x.fillRect(bx, by + cellH - 1, cellW, 1);
        x.fillRect(bx + cellW - 1, by, 1, cellH);
      }
    }
    x.strokeStyle = isBurnt ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.55)';
    x.lineWidth = 1;
    for(let row = 0; row <= rows; row++){
      x.beginPath(); x.moveTo(0, row*bh); x.lineTo(S, row*bh); x.stroke();
    }
    for(let i = 0; i < 22; i++){
      const px = Math.random()*S, py = Math.random()*S;
      const r = 4 + Math.random()*14;
      const grd = x.createRadialGradient(px, py, 0, px, py, r);
      grd.addColorStop(0, isWet ? 'rgba(140,180,220,0.28)' : 'rgba(0,0,0,0.22)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = grd;
      x.beginPath(); x.arc(px, py, r, 0, Math.PI*2); x.fill();
    }
    if(isWet){
      x.fillStyle = 'rgba(140,180,220,0.06)';
      for(let i = 0; i < 5; i++) x.fillRect(0, 4 + i*26, S, 2);
    }
    if(isBurnt){
      x.fillStyle = 'rgba(0,0,0,0.6)';
      for(let i = 0; i < 60; i++){
        x.beginPath();
        x.arc(Math.random()*S, Math.random()*S, 1 + Math.random()*4, 0, Math.PI*2);
        x.fill();
      }
      x.fillStyle = 'rgba(120,50,20,0.20)';
      for(let i = 0; i < 24; i++) x.fillRect(Math.random()*S, Math.random()*S, 1, 3 + Math.random()*4);
    }
  }
  else if(type === 'tile'){
    const base = spec.base || '#c8d0d8';
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    const t = 32;
    for(let yy = 0; yy < S; yy += t){
      for(let xx = 0; xx < S; xx += t){
        const seed = (yy*11 + xx*7) % 100;
        const tint = (seed - 50) / 500;
        x.fillStyle = shade(base, tint);
        x.fillRect(xx + 1, yy + 1, t - 2, t - 2);
        x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(xx + 1, yy + 1, t - 2, 1);
        x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(xx + 1, yy + t - 2, t - 2, 1);
      }
    }
    x.strokeStyle = 'rgba(0,0,0,0.28)'; x.lineWidth = 1;
    for(let i = 0; i <= S; i += t){
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke();
    }
  }
  else if(type === 'wood'){
    const base = spec.base || '#5a3a20';
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    const pw = 16;
    for(let xx = 0; xx < S; xx += pw){
      const tint = ((xx * 13) % 40 - 20) / 200;
      x.fillStyle = shade(base, tint);
      x.fillRect(xx + 1, 0, pw - 1, S);
      x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, S); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,0.14)';
      for(let i = 0; i < 4; i++){
        const py = 4 + i * 32 + Math.random() * 4;
        x.beginPath();
        x.moveTo(xx + 2, py);
        x.bezierCurveTo(xx + 6, py + 1, xx + 10, py - 1, xx + pw - 1, py + 0.5);
        x.stroke();
      }
    }
  }
  else if(type === 'metal'){
    const base = spec.base || '#3a4048';
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 2;
    x.strokeRect(2, 2, S-4, S-4);
    x.beginPath(); x.moveTo(0, S/2); x.lineTo(S, S/2); x.stroke();
    x.beginPath(); x.moveTo(S/2, 0); x.lineTo(S/2, S); x.stroke();
    for(let yy = 12; yy < S; yy += 24){
      for(let xx = 12; xx < S; xx += 24){
        x.fillStyle = 'rgba(255,255,255,0.28)';
        x.beginPath(); x.arc(xx, yy, 2.5, 0, Math.PI*2); x.fill();
        x.fillStyle = 'rgba(0,0,0,0.35)';
        x.beginPath(); x.arc(xx + 0.5, yy + 0.5, 1.6, 0, Math.PI*2); x.fill();
      }
    }
  }

  if(spec.skirting !== false && type !== 'tile'){
    const skH = Math.floor(S * 0.12);
    const sgrad = x.createLinearGradient(0, S - skH, 0, S);
    sgrad.addColorStop(0, 'rgba(0,0,0,0.6)');
    sgrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    x.fillStyle = sgrad;
    x.fillRect(0, S - skH, S, skH);
    x.fillStyle = 'rgba(255,255,255,0.06)';
    x.fillRect(0, S - skH, S, 1);
  }
  return c;
}

function shade(hex, amount){
  if(hex.charAt(0) !== '#') return hex;
  let r = parseInt(hex.slice(1,3), 16);
  let g = parseInt(hex.slice(3,5), 16);
  let b = parseInt(hex.slice(5,7), 16);
  if(amount > 0){
    r = Math.min(255, r + amount * 255);
    g = Math.min(255, g + amount * 255);
    b = Math.min(255, b + amount * 255);
  } else {
    r = Math.max(0, r * (1 + amount));
    g = Math.max(0, g * (1 + amount));
    b = Math.max(0, b * (1 + amount));
  }
  return 'rgb(' + (r|0) + ',' + (g|0) + ',' + (b|0) + ')';
}

function makeFloorTextureCanvas(spec){
  const S = TEX_SIZE;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const x = c.getContext('2d');
  const base = (spec && spec.base) || '#0d1218';
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1;
  const t = 32;
  for(let i = 0; i <= S; i += t){
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke();
  }
  for(let yy = 0; yy < S; yy += t){
    for(let xx = 0; xx < S; xx += t){
      const seed = (xx*7 + yy*13) % 100;
      const tint = (seed - 50) / 600;
      x.fillStyle = shade(base, tint);
      x.fillRect(xx + 1, yy + 1, t - 2, t - 2);
    }
  }
  for(let i = 0; i < 14; i++){
    const px = Math.random()*S, py = Math.random()*S;
    const r = 6 + Math.random()*18;
    const grd = x.createRadialGradient(px, py, 0, px, py, r);
    grd.addColorStop(0, 'rgba(100,140,180,0.18)');
    grd.addColorStop(1, 'rgba(100,140,180,0)');
    x.fillStyle = grd;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI*2); x.fill();
  }
  x.fillStyle = 'rgba(255,255,255,0.04)';
  for(let i = 0; i < 200; i++) x.fillRect(Math.random()*S, Math.random()*S, 1, 1);
  x.fillStyle = 'rgba(0,0,0,0.12)';
  for(let i = 0; i < 200; i++) x.fillRect(Math.random()*S, Math.random()*S, 1, 1);
  return c;
}

function makeCeilTextureCanvas(spec){
  const S = TEX_SIZE;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const x = c.getContext('2d');
  const base = (spec && spec.base) || '#0a0d12';
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1;
  const t = 64;
  for(let i = 0; i <= S; i += t){
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke();
  }
  for(let i = 0; i < 8; i++){
    const px = Math.random()*S, py = Math.random()*S;
    const r = 8 + Math.random()*20;
    const grd = x.createRadialGradient(px, py, 0, px, py, r);
    grd.addColorStop(0, 'rgba(0,0,0,0.28)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = grd;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI*2); x.fill();
  }
  for(let i = 0; i < 300; i++){
    x.fillStyle = 'rgba(255,255,255,0.025)';
    x.fillRect(Math.random()*S, Math.random()*S, 1, 1);
  }
  return c;
}

function getWallTextureCanvas(spec, key){
  const k = 'wall:' + key + ':' + JSON.stringify(spec);
  if(texCache[k]) return texCache[k];
  const cv = makeWallTextureCanvas(spec);
  texCache[k] = cv;
  return cv;
}
function getFloorTextureCanvas(spec, key){
  const k = 'floor:' + key + ':' + JSON.stringify(spec || {});
  if(texCache[k]) return texCache[k];
  const cv = makeFloorTextureCanvas(spec);
  texCache[k] = cv;
  return cv;
}
function getCeilTextureCanvas(spec, key){
  const k = 'ceil:' + key + ':' + JSON.stringify(spec || {});
  if(texCache[k]) return texCache[k];
  const cv = makeCeilTextureCanvas(spec);
  texCache[k] = cv;
  return cv;
}

function getSpriteTexture(icon){
  if(spriteTexCache[icon] !== undefined) return spriteTexCache[icon];
  if(spritePendings[icon]) return null;
  spritePendings[icon] = true;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.font = 'bold 96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(icon || '❓', 64, 64);
  const img = new Image();
  img.onload = function(){
    delete spritePendings[icon];
    try{ spriteTexCache[icon] = renderer.textureFromCanvas(img, {}); }
    catch(e){ spriteTexCache[icon] = null; }
  };
  img.onerror = function(){
    delete spritePendings[icon];
    spriteTexCache[icon] = null;
  };
  img.src = c.toDataURL('image/png');
  return null;
}

function resolveIcon(th){
  const raw = th.icon;
  if(typeof raw === 'function'){
    try{ return raw() || '❓'; }catch(e){ return '❓'; }
  }
  return raw || '❓';
}

/* ==================== 场景 ==================== */
function getQueryScene(){
  try{
    const p = new URLSearchParams(location.search).get('id');
    if(p && window.__SCENES_3D__[p]) return p;
  }catch(e){}
  return 'alley';
}

function loadScene(key){
  sceneKey = key;
  map = window.__SCENES_3D__[key];
  if(!map) return;
  const sp = map.spawn || { x:1.5, y:1.5, dir:0 };
  cam.x = sp.x; cam.z = sp.y; cam.yaw = sp.dir || 0; cam.pitch = 0;
  camDriftYaw = 0; camDriftPitch = 0; camDriftT = 0;
  nearby = null;
  for(const k in triggerTime) delete triggerTime[k];
  sceneEnterTime = performance.now();
  nextScareAt    = performance.now()/1000 + 4 + Math.random()*5;
  nextSilenceAt  = performance.now()/1000 + 10 + Math.random()*12;
  nextInvertAt   = performance.now()/1000 + 8 + Math.random()*10;
  nextIntrudeAt  = performance.now()/1000 + 6 + Math.random()*8;
  nextDriftAt    = performance.now()/1000 + 12 + Math.random()*10;
  bloodDrops = [];
  resize();
  buildWorld();
}

function buildWorld(){
  const wallSpec  = map.wallTex  || { type: 'brick' };
  const floorSpec = map.floorTex || { base: shadeHex(map.wallTex && map.wallTex.base || '#1a1018', -0.4) };
  const ceilSpec  = map.ceilTex  || { base: shadeHex(map.wallTex && map.wallTex.base || '#1a1018', -0.6) };
  renderer.buildWorld({
    grid: map.grid,
    wallHeight: 2.5,
    wallTexSource:  getWallTextureCanvas(wallSpec,  sceneKey),
    floorTexSource: getFloorTextureCanvas(floorSpec, sceneKey),
    ceilTexSource:  getCeilTextureCanvas(ceilSpec,  sceneKey)
  });

  /* ★ 构建 Props */
  const props = (typeof map.props === 'function') ? map.props() : (map.props || []);
  renderer.buildProps(props);
}

function shadeHex(hex, amount){
  if(!hex || hex.charAt(0) !== '#') return hex || '#0a0d12';
  let r = parseInt(hex.slice(1,3), 16);
  let g = parseInt(hex.slice(3,5), 16);
  let b = parseInt(hex.slice(5,7), 16);
  if(amount < 0){
    r = Math.max(0, r * (1 + amount));
    g = Math.max(0, g * (1 + amount));
    b = Math.max(0, b * (1 + amount));
  }
  return '#' + [r,g,b].map(v => ('0'+(v|0).toString(16)).slice(-2)).join('');
}

/* ==================== 碰撞 ==================== */
function isWall(cx, cy){
  if(!map) return true;
  const gy = Math.floor(cy), gx = Math.floor(cx);
  if(gy < 0 || gy >= map.grid.length) return true;
  const row = map.grid[gy];
  if(gx < 0 || gx >= row.length) return true;
  return row[gx] === '1';
}
function canStand(x, z){
  const r = 0.22;
  if(isWall(x-r, z-r)) return false;
  if(isWall(x+r, z-r)) return false;
  if(isWall(x-r, z+r)) return false;
  if(isWall(x+r, z+r)) return false;
  return true;
}

/* ==================== 更新 ==================== */
function update(dt){
  if(!map) return;
  isMoving = false;

  const rotSpeed = 2.2;
  if(keys['arrowleft'])  cam.yaw -= rotSpeed*dt;
  if(keys['arrowright']) cam.yaw += rotSpeed*dt;
  if(keys['arrowup'])    cam.pitch += rotSpeed*0.55*dt;
  if(keys['arrowdown'])  cam.pitch -= rotSpeed*0.55*dt;
  if(cam.pitch >  1.35) cam.pitch =  1.35;
  if(cam.pitch < -1.35) cam.pitch = -1.35;

  const speed = 2.6;
  let fwd = 0, str = 0;
  if(keys['w']) fwd += 1;
  if(keys['s']) fwd -= 1;
  if(keys['a']) str -= 1;
  if(keys['d']) str += 1;

  if(fwd || str){
    isMoving = true;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    let dx = cy*fwd - sy*str;
    let dz = sy*fwd + cy*str;
    const len = Math.hypot(dx, dz) || 1;
    dx = dx/len * speed * dt;
    dz = dz/len * speed * dt;
    if(canStand(cam.x + dx, cam.z)) cam.x += dx;
    if(canStand(cam.x, cam.z + dz)) cam.z += dz;
  }

  if(touchMove){
    const dxs = touchMove.x - touchMove.sx;
    const dys = touchMove.y - touchMove.sy;
    const len = Math.hypot(dxs, dys);
    if(len > 8){
      isMoving = true;
      const mag = Math.min(1, (len - 8) / 60);
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
      const f2 = -dys/len*mag, s2 = dxs/len*mag;
      let dx = cy*f2 - sy*s2;
      let dz = sy*f2 + cy*s2;
      const l2 = Math.hypot(dx, dz) || 1;
      dx = dx/l2 * speed * dt;
      dz = dz/l2 * speed * dt;
      if(canStand(cam.x + dx, cam.z)) cam.x += dx;
      if(canStand(cam.x, cam.z + dz)) cam.z += dz;
    }
  }

  let dlgOpen = false;
  try{
    const pel = window.parent && window.parent.document.getElementById('dlg');
    if(pel && pel.classList.contains('show')) dlgOpen = true;
  }catch(e){}

  let best = null, bestD = 2.0;
  if(!dlgOpen){
    for(let i = 0; i < map.things.length; i++){
      const th = map.things[i];
      if(th.decor) continue;
      if(th.cond && !th.cond()) continue;
      if(performance.now() - (triggerTime[th.id] || 0) < 3000) continue;
      const dx = th.x - cam.x, dz = th.y - cam.z;
      const d = Math.sqrt(dx*dx + dz*dz);
      if(d < bestD){ bestD = d; best = th; }
    }
  }
  if(best !== nearby){ nearby = best; updateButton(); }

  if(isBloodMode()){
    const nowSec = performance.now()/1000;
    if(scareTime <= 0 && nowSec >= nextScareAt){
      scareTime = 0.55; scareSeed = Math.random()*1000;
      shakeTime = 0.5; shakeAmp = 16;
      HorrorAudio.scareScream();
      nextScareAt = nowSec + 14 + Math.random()*14;
    }
    if(silenceT <= 0 && nowSec >= nextSilenceAt){
      silenceT = 1.6;
      nextSilenceAt = nowSec + 20 + Math.random()*18;
    }
    if(silenceT > 0) silenceT = Math.max(0, silenceT - dt);
    if(invertT <= 0 && nowSec >= nextInvertAt){
      invertT = 0.08;
      nextInvertAt = nowSec + 16 + Math.random()*20;
    }
    if(invertT > 0) invertT = Math.max(0, invertT - dt);
    if(intrudeT <= 0 && nowSec >= nextIntrudeAt){
      intrudeT = 0.9;
      intrudeX = 0.15 + Math.random()*0.7;
      intrudeY = 0.15 + Math.random()*0.7;
      intrudeSeed = Math.random()*1000;
      nextIntrudeAt = nowSec + 12 + Math.random()*14;
    }
    if(intrudeT > 0) intrudeT = Math.max(0, intrudeT - dt);
    if(camDriftT <= 0 && nowSec >= nextDriftAt){
      camDriftT = 0.7;
      const dir = Math.random() < 0.5 ? -1 : 1;
      camDriftYaw = dir * (0.35 + Math.random()*0.5);
      camDriftPitch = (Math.random()-0.5) * 0.4;
      nextDriftAt = nowSec + 20 + Math.random()*18;
    }
    if(camDriftT > 0) camDriftT = Math.max(0, camDriftT - dt);
    if(silenceT > 0 && silenceT - dt <= 0) HorrorAudio.footstepBehind();
    if(Math.random() < 0.004 + 0.008*getPanic()){
      bloodDrops.push({
        x: Math.random(), y: -0.02,
        v: 0.12 + Math.random()*0.2,
        len: 0.03 + Math.random()*0.05,
        a: 0.55 + Math.random()*0.35
      });
    }
    for(let i = bloodDrops.length - 1; i >= 0; i--){
      bloodDrops[i].y += bloodDrops[i].v * dt;
      if(bloodDrops[i].y > 1.1) bloodDrops.splice(i, 1);
    }
  }
}

function triggerNearby(){
  if(!nearby) return;
  const now = performance.now();
  if(now - (triggerTime[nearby.id] || 0) < 700) return;
  triggerTime[nearby.id] = now;
  try{ window.parent.postMessage({ type:'hit', spotId: nearby.id }, '*'); }catch(e){}
  nearby = null;
  updateButton();
}

/* ==================== 光照 ==================== */
function computeAmbient(){
  const blood = isBloodMode();
  if(blood){
    return isTorchOn() ? [0.16, 0.05, 0.05] : [0.04, 0.012, 0.015];
  }
  const cut = F().powerCut;
  if(cut) return isTorchOn() ? [0.20, 0.19, 0.18] : [0.05, 0.06, 0.08];
  return isTorchOn() ? [0.28, 0.26, 0.24] : [0.14, 0.15, 0.18];
}

function computeLights(){
  const blood = isBloodMode();
  const torch = isTorchOn();
  const cut = F().powerCut;
  const list = [];

  if(torch){
    let flick = blood
      ? 0.86 + 0.14*Math.sin(time*22) * (Math.random() > 0.8 ? 1.5 : 1)
      : 0.96 + 0.04*Math.sin(time*18);
    list.push({
      x: cam.x, y: cam.eye - 0.05, z: cam.z,
      color: blood
        ? [2.2*flick, 0.55*flick, 0.42*flick]
        : [2.4*flick, 2.1*flick, 1.75*flick]
    });
  }

  const sceneLights = (map && map.lights) || [];
  for(let i = 0; i < sceneLights.length && list.length < 3; i++){
    const l = sceneLights[i];
    let color = l.color || [0.6, 0.5, 0.4];
    if(cut && l.conditional !== false) color = [color[0]*0.15, color[1]*0.15, color[2]*0.15];
    if(blood) color = [color[0]*0.55, color[1]*0.18, color[2]*0.18];
    list.push({ x: l.x, y: l.y || 2.0, z: l.z, color: color });
  }

  if(!torch && list.length < 3){
    list.push({
      x: cam.x + Math.cos(cam.yaw) * 3,
      y: cam.eye + 1.5,
      z: cam.z + Math.sin(cam.yaw) * 3,
      color: blood
        ? [0.20, 0.05, 0.05]
        : (cut ? [0.15, 0.16, 0.20] : [0.35, 0.34, 0.36])
    });
  }
  while(list.length < 3) list.push({ x: 0, y: -999, z: 0, color: [0,0,0] });
  return list;
}

/* ==================== 渲染 ==================== */
function render(dt, t){
  if(!map) return;

  renderer.setAmbient(computeAmbient());
  renderer.setLights(computeLights());

  const blood = isBloodMode();
  const fogColor = blood ? [0.025, 0.006, 0.012] : [0.04, 0.05, 0.08];
  renderer.setFog({
    color: fogColor,
    near: blood ? 1.8 : 5,
    far:  blood ? 7.5 : 20
  });

  let yaw = cam.yaw, pitch = cam.pitch;
  if(camDriftT > 0){
    const k = camDriftT / 0.7;
    yaw += camDriftYaw * k;
    pitch += camDriftPitch * k;
  }
  breathPhase += dt * 1.3;
  const breathY = Math.sin(breathPhase) * 0.012;

  renderer.setCamera({
    x: cam.x, y: cam.eye + breathY, z: cam.z,
    yaw: yaw, pitch: pitch,
    fov: Math.PI / 3.1, near: 0.06, far: 60
  });

  /* ★ 物件全部用 prop 渲染。billboard 留给装饰用（比如飘落物） */
  renderer.setBillboards([]);
  renderer.render();

  updateOverlayFilter();
  drawHorror(dt, t);
  applyShake(dt);
}

function updateOverlayFilter(){
  const blood = isBloodMode();
  let f = 'none';
  if(blood){
    if(invertT > 0) f = 'invert(1) contrast(1.4)';
    else if(silenceT > 0) f = 'saturate(0.2) contrast(1.4) brightness(0.55)';
    else f = 'saturate(0.65) contrast(1.22) brightness(0.82) hue-rotate(-10deg)';
  }
  if(canvas.style.filter !== f) canvas.style.filter = f;
}

function applyShake(dt){
  if(shakeTime <= 0){
    if(viewport.style.transform !== '') viewport.style.transform = '';
    return;
  }
  shakeTime = Math.max(0, shakeTime - dt);
  const k = shakeTime / 0.5;
  const amp = shakeAmp * k;
  viewport.style.transform =
    'translate(' + ((Math.random()*2-1)*amp).toFixed(2) + 'px,' +
    ((Math.random()*2-1)*amp).toFixed(2) + 'px)';
}

/* ==================== 恐怖叠加 ==================== */
function drawHorror(dt, t){
  if(!fxCanvas || !fxCtx) return;
  if(!isBloodMode()){
    if(fxCanvas.style.display !== 'none') fxCanvas.style.display = 'none';
    return;
  }
  if(fxCanvas.style.display !== 'block') fxCanvas.style.display = 'block';
  const w = fxCanvas.width, h = fxCanvas.height;
  fxCtx.clearRect(0, 0, w, h);
  const panic = getPanic();
  const silent = silenceT > 0;

  const breathe = 0.5 + 0.5 * Math.sin(t * 1.1);
  const vg = fxCtx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.06, w/2, h/2, Math.max(w,h)*0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.42, 'rgba(70,0,10,' + (0.30 + 0.26*panic + 0.12*breathe) + ')');
  vg.addColorStop(1, 'rgba(8,0,1,' + (0.90 + 0.10*panic) + ')');
  fxCtx.fillStyle = vg;
  fxCtx.fillRect(0, 0, w, h);

  const heartFreq = 1.0 + 1.1 * panic;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * heartFreq);
  const pAlpha = 0.04 + 0.14 * pulse * (0.5 + 0.5*panic);
  const cg = fxCtx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.min(w,h)*0.65);
  cg.addColorStop(0, 'rgba(160,0,12,' + pAlpha + ')');
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  fxCtx.fillStyle = cg;
  fxCtx.fillRect(0, 0, w, h);

  const baseN = silent ? 520 : 260;
  const count = baseN + Math.floor(panic * 500);
  fxCtx.fillStyle = 'rgba(255,255,255,0.06)';
  for(let i = 0; i < count; i++) fxCtx.fillRect(Math.random()*w, Math.random()*h, 1, 1);
  fxCtx.fillStyle = 'rgba(255,40,40,' + (0.08 + 0.08*panic) + ')';
  for(let i = 0; i < Math.floor(count*0.35); i++) fxCtx.fillRect(Math.random()*w, Math.random()*h, 1, 1);

  const scanY = (t * 140) % h;
  fxCtx.fillStyle = 'rgba(255,255,255,0.014)';
  fxCtx.fillRect(0, scanY, w, 2);

  if(intrudeT > 0) drawIntrusion(w, h, intrudeT/0.9, intrudeX, intrudeY, intrudeSeed);

  for(let i = 0; i < bloodDrops.length; i++){
    const b = bloodDrops[i];
    const x = b.x * w, y = b.y * h;
    const grad = fxCtx.createLinearGradient(x, y, x, y + b.len*h);
    grad.addColorStop(0, 'rgba(120,0,0,0)');
    grad.addColorStop(1, 'rgba(160,0,0,' + b.a + ')');
    fxCtx.fillStyle = grad;
    fxCtx.fillRect(x - 1.5, y, 3, b.len*h);
    fxCtx.fillStyle = 'rgba(200,0,0,' + (b.a*0.7) + ')';
    fxCtx.beginPath(); fxCtx.arc(x, y + b.len*h, 2.5, 0, Math.PI*2); fxCtx.fill();
  }
  if(silent){ fxCtx.fillStyle = 'rgba(0,0,0,0.18)'; fxCtx.fillRect(0,0,w,h); }
  if(nearby){ fxCtx.fillStyle = 'rgba(120,0,10,0.10)'; fxCtx.fillRect(0,0,w,h); }
  if(scareTime > 0){
    scareTime = Math.max(0, scareTime - dt);
    drawScare(w, h, scareTime / 0.55);
  }
}

function drawIntrusion(w, h, k, rx, ry, seed){
  const alpha = Math.min(1, Math.sin(k * Math.PI) * 1.4);
  if(alpha <= 0.01) return;
  const cx = rx * w, cy = ry * h;
  const scale = 1.4 + 0.6 * Math.sin(seed);
  fxCtx.save();
  fxCtx.globalAlpha = alpha;
  fxCtx.translate(cx, cy);
  fxCtx.rotate(seed % 6.28);
  fxCtx.fillStyle = 'rgba(60,0,0,0.72)';
  fxCtx.beginPath();
  fxCtx.ellipse(0, 0, 42*scale, 55*scale, 0, 0, Math.PI*2);
  fxCtx.fill();
  const fingers = [
    { x:-30, y:-50, a:-0.35 }, { x:-12, y:-62, a:-0.18 },
    { x:6, y:-64, a:0.05 }, { x:24, y:-58, a:0.22 },
    { x:42, y:-38, a:0.55 }
  ];
  for(let i = 0; i < fingers.length; i++){
    const f = fingers[i];
    fxCtx.save();
    fxCtx.translate(f.x*scale, f.y*scale);
    fxCtx.rotate(f.a);
    fxCtx.beginPath();
    fxCtx.ellipse(0, 0, 9*scale, 26*scale, 0, 0, Math.PI*2);
    fxCtx.fill();
    fxCtx.restore();
  }
  fxCtx.strokeStyle = 'rgba(90,0,0,0.55)';
  fxCtx.lineWidth = 6*scale;
  fxCtx.lineCap = 'round';
  for(let i = 0; i < 3; i++){
    fxCtx.beginPath();
    fxCtx.moveTo((i-1)*18*scale, 40*scale);
    fxCtx.lineTo((i-1)*18*scale + 4, 130*scale);
    fxCtx.stroke();
  }
  fxCtx.restore();
}

function drawScare(w, h, k){
  const fade = Math.min(1, k * 2.8);
  fxCtx.save();
  fxCtx.globalAlpha = fade;
  fxCtx.fillStyle = 'rgba(0,0,0,0.97)';
  fxCtx.fillRect(0, 0, w, h);
  const cx = w * 0.5, cy = h * 0.5;
  const fs = 1.0 + (1 - k) * 0.4;
  fxCtx.save();
  fxCtx.translate(cx, cy); fxCtx.scale(fs, fs);
  const fW = Math.min(w, h) * 0.32;
  const fH = Math.min(w, h) * 0.42;
  fxCtx.fillStyle = 'rgba(180,150,140,0.35)';
  fxCtx.beginPath();
  fxCtx.moveTo(-fW*0.55, -fH*0.7);
  fxCtx.bezierCurveTo(-fW*1.05, -fH*0.4, -fW*0.95, fH*0.35, -fW*0.55, fH*0.75);
  fxCtx.bezierCurveTo(-fW*0.2, fH*1.05, fW*0.3, fH*1.0, fW*0.65, fH*0.7);
  fxCtx.bezierCurveTo(fW*0.98, fH*0.3, fW*0.85, -fH*0.5, fW*0.4, -fH*0.75);
  fxCtx.bezierCurveTo(fW*0.1, -fH*0.9, -fW*0.2, -fH*0.9, -fW*0.55, -fH*0.7);
  fxCtx.closePath(); fxCtx.fill();
  fxCtx.fillStyle = 'rgba(0,0,0,0.98)';
  fxCtx.beginPath();
  fxCtx.ellipse(-fW*0.32, -fH*0.15, fW*0.22, fH*0.14, -0.15, 0, Math.PI*2);
  fxCtx.fill();
  fxCtx.beginPath();
  fxCtx.ellipse(fW*0.36, -fH*0.18, fW*0.26, fH*0.17, 0.2, 0, Math.PI*2);
  fxCtx.fill();
  fxCtx.fillStyle = 'rgba(255,20,20,0.95)';
  fxCtx.beginPath(); fxCtx.arc(-fW*0.30, -fH*0.10, fW*0.025, 0, Math.PI*2); fxCtx.fill();
  fxCtx.beginPath(); fxCtx.arc(fW*0.34, -fH*0.15, fW*0.03, 0, Math.PI*2); fxCtx.fill();
  fxCtx.strokeStyle = 'rgba(120,0,0,0.85)';
  fxCtx.lineWidth = fW*0.03; fxCtx.lineCap = 'round';
  fxCtx.beginPath();
  fxCtx.moveTo(-fW*0.30, -fH*0.05); fxCtx.lineTo(-fW*0.28, fH*0.30); fxCtx.stroke();
  fxCtx.beginPath();
  fxCtx.moveTo(fW*0.34, -fH*0.08); fxCtx.lineTo(fW*0.32, fH*0.42); fxCtx.stroke();
  fxCtx.fillStyle = 'rgba(0,0,0,0.98)';
  fxCtx.beginPath();
  fxCtx.moveTo(-fW*0.35, fH*0.45);
  for(let i = 0; i <= 10; i++){
    const px = -fW*0.35 + (fW*0.7*i/10);
    const py = fH*0.45 + (i % 2 === 0 ? fH*0.05 : fH*0.10);
    fxCtx.lineTo(px, py);
  }
  fxCtx.lineTo(fW*0.35, fH*0.42);
  for(let i = 10; i >= 0; i--){
    const px = -fW*0.35 + (fW*0.7*i/10);
    const py = fH*0.72 + (i % 2 === 0 ? -fH*0.03 : 0);
    fxCtx.lineTo(px, py);
  }
  fxCtx.closePath(); fxCtx.fill();
  fxCtx.fillStyle = 'rgba(200,190,170,0.75)';
  for(let i = 0; i < 7; i++) fxCtx.fillRect(-fW*0.30 + i*fW*0.10, fH*0.46, fW*0.04, fH*0.05);
  for(let i = 0; i < 6; i++) fxCtx.fillRect(-fW*0.28 + i*fW*0.10, fH*0.65, fW*0.04, fH*0.05);
  fxCtx.restore();
  fxCtx.fillStyle = 'rgba(180,0,0,' + (fade*0.25) + ')';
  fxCtx.fillRect(0, 0, w, h);
  fxCtx.restore();
}

/* ==================== 按钮 ==================== */
let overlayBtn, overlayIcon, overlayName, overlayHint;

function updateButton(){
  if(!overlayBtn) return;
  if(!nearby){ overlayBtn.classList.remove('show'); return; }
  const label = typeof nearby.label === 'function' ? nearby.label() : nearby.label;
  if(!label){ overlayBtn.classList.remove('show'); return; }
  overlayIcon.textContent = resolveIcon(nearby);
  overlayName.textContent = label;
  overlayHint.textContent = isTouch ? '轻点查看' : '按 E / 空格 查看';
  overlayBtn.classList.add('show');
}

/* ==================== 主循环 ==================== */
function loop(now){
  if(stopped) return;
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  time += dt;
  update(dt);
  render(dt, time);
  if(audioReady) HorrorAudio.updateMix();
  requestAnimationFrame(loop);
}

/* ==================== 尺寸 ==================== */
function resize(){
  if(!viewport || !renderer) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  const cssW = Math.max(1, Math.round(W * scale));
  const cssH = Math.max(1, Math.round(H * scale));
  viewport.style.width  = cssW + 'px';
  viewport.style.height = cssH + 'px';
  viewport.style.left = Math.round((vw - cssW)/2) + 'px';
  viewport.style.top  = Math.round((vh - cssH)/2) + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, isBloodMode() ? 1.4 : 1.5);
  renderer.resize(cssW, cssH, dpr);
  if(fxCanvas && fxCtx){
    const fw = canvas.width, fh = canvas.height;
    if(fxCanvas.width !== fw || fxCanvas.height !== fh){
      fxCanvas.width = fw; fxCanvas.height = fh;
    }
    fxCanvas.style.width  = canvas.style.width;
    fxCanvas.style.height = canvas.style.height;
    fxCanvas.style.left   = canvas.style.left;
    fxCanvas.style.top    = canvas.style.top;
  }
}

/* ==================== 输入 ==================== */
function bindKeys(){
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if((k === 'e' || k === ' ') && nearby){ e.preventDefault(); triggerNearby(); }
    if(k.indexOf('arrow') === 0 || k === ' ') e.preventDefault();
    ensureAudio();
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
}

function bindPointer(){
  canvas.addEventListener('click', function(){ ensureAudio(); forceFocus(); });
  canvas.addEventListener('mousedown', function(){ ensureAudio(); });

  canvas.addEventListener('touchstart', e => {
    ensureAudio();
    if(!e.touches.length) return;
    e.preventDefault();
    isTouch = true;
    for(let i = 0; i < e.changedTouches.length; i++){
      const t0 = e.changedTouches[i];
      const x = t0.clientX, y = t0.clientY;
      if(x < window.innerWidth*0.5 && !touchMove){
        touchMove = { id: t0.identifier, sx:x, sy:y, x:x, y:y };
      } else if(!touchLook){
        touchLook = { id: t0.identifier, lx:x, ly:y };
      }
    }
  }, {passive:false});

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for(let i = 0; i < e.changedTouches.length; i++){
      const t0 = e.changedTouches[i];
      if(touchMove && t0.identifier === touchMove.id){
        touchMove.x = t0.clientX; touchMove.y = t0.clientY;
      } else if(touchLook && t0.identifier === touchLook.id){
        const dx = t0.clientX - touchLook.lx;
        const dy = t0.clientY - touchLook.ly;
        touchLook.lx = t0.clientX; touchLook.ly = t0.clientY;
        cam.yaw += dx * 0.0055;
        cam.pitch -= dy * 0.0055;
        if(cam.pitch >  1.35) cam.pitch =  1.35;
        if(cam.pitch < -1.35) cam.pitch = -1.35;
      }
    }
  }, {passive:false});

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    for(let i = 0; i < e.changedTouches.length; i++){
      const t0 = e.changedTouches[i];
      if(touchMove && t0.identifier === touchMove.id) touchMove = null;
      if(touchLook && t0.identifier === touchLook.id) touchLook = null;
    }
  }, {passive:false});
  canvas.addEventListener('touchcancel', () => { touchMove = null; touchLook = null; });

  window.addEventListener('touchstart', ensureAudio, { once:true, passive:true });
  window.addEventListener('mousedown', ensureAudio, { once:true });
  window.addEventListener('keydown', ensureAudio, { once:true });
}

function forceFocus(){
  try{ window.focus(); }catch(e){}
  try{ if(document.body) document.body.focus(); }catch(e){}
  try{
    if(window.parent && window.parent !== window){
      window.parent.focus(); window.focus();
    }
  }catch(e){}
}

/* ==================== 消息 ==================== */
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
        updateButton();
        /* 状态变了重建 props（有些 prop 依赖 flags） */
        if(map) buildWorld();
      }
    }
  });
  try{ window.parent.postMessage({ type:'ready' }, '*'); }catch(e){}
}

/* ==================== 启动 ==================== */
function boot(){
  viewport = document.getElementById('viewport');
  canvas = document.getElementById('cv');
  if(!canvas){ console.error('[3D] 缺 #cv'); return; }

  if(!window.S) window.S = { flags: {} };
  if(!window.S.flags) window.S.flags = {};
  try{
    if(new URLSearchParams(location.search).get('blood') === '1'){
      window.S.flags.bloodMode = true;
    }
  }catch(e){}

  try{
    renderer = R3D.create(canvas);
  }catch(e){
    console.error('[3D] WebGL:', e);
    var m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;color:#fff;padding:40px;font-family:sans-serif;background:#0a0e14;z-index:9999;line-height:1.8;';
    m.innerHTML = '<h2 style="color:#ff6a5a">WebGL 初始化失败</h2><p>' + (e && e.message ? e.message : '未知错误') + '</p>';
    document.body.appendChild(m);
    return;
  }

  fxCanvas = document.createElement('canvas');
  fxCanvas.id = 'fx';
  fxCanvas.style.cssText = 'position:absolute;pointer-events:none;z-index:6;display:none;';
  viewport.appendChild(fxCanvas);
  fxCtx = fxCanvas.getContext('2d');

  overlayBtn  = document.getElementById('interactBtn');
  overlayIcon = document.getElementById('ibIcon');
  overlayName = document.getElementById('ibName');
  overlayHint = document.getElementById('ibHint');
  if(overlayBtn){
    overlayBtn.addEventListener('click', e => { e.stopPropagation(); triggerNearby(); });
  }

  var helpEl = document.getElementById('ctrlHelp');
  isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if(helpEl){
    helpEl.innerHTML = isTouch
      ? '<b>移动</b> 左侧拖动　<b>视角</b> 右侧拖动　<b>互动</b> 轻点按钮'
      : '<b>移动</b> WASD　<b>视角</b> ↑ ↓ ← →　<b>互动</b> E / 空格';
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  try{ loadScene(getQueryScene()); }
  catch(e){ console.error('[3D] 场景:', e); }

  bindKeys();
  bindPointer();
  bindMessage();

  forceFocus();
  setTimeout(forceFocus, 120);
  setTimeout(forceFocus, 420);
  window.addEventListener('click', forceFocus);

  lastFrame = performance.now();
  requestAnimationFrame(loop);
}

window.Engine3D = { boot };
window.__engineStop = function(){
  stopped = true;
  try{
    if(canvas) canvas.style.visibility = 'hidden';
    if(fxCanvas) fxCanvas.style.display = 'none';
    if(viewport) viewport.style.transform = '';
  }catch(e){}
};
window.addEventListener('pagehide', () => { stopped = true; });
window.addEventListener('beforeunload', () => { stopped = true; });
})();