/* =========================================================
   engine.js — 真 3D 引擎 v14
   v13 全功能 + 几何体精细拆分（每件 ≥ 500 顶点）
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

let scareTime = 0, scareSeed = 0, nextScareAt = 0;
let silenceT = 0, nextSilenceAt = 0;
let invertT = 0, nextInvertAt = 0;
let intrudeT = 0, intrudeX = 0, intrudeY = 0, intrudeSeed = 0, nextIntrudeAt = 0;
let bloodDrops = [];
let shakeTime = 0, shakeAmp = 0;
let breathPhase = 0;
let audioReady = false;
let musicStarted = false;

let shadowAlpha = 0;
let ackFlashTime = 0;
let ackFlashAlpha = 0;
let bloodFadeActive = false;
let bloodFadeT = 0;
const BLOOD_FADE_TOTAL = 3.5;

let lensDrops = [];
let lensTrails = [];
let bloodSplats = [];

let emgPulse = 0.55;
let emgTarget = 0.55;
let emgNextChange = 0;

let focusCheckTimer = null;
let lastExternalFocus = 0;

/* ★ 精细拆分等级：1=关 2=中 3=精细 */
const DETAIL_LEVEL = 3;

const F = () => (window.S && window.S.flags) || {};
function isBloodMode(){ return !!F().bloodMode; }
function isPowerCut(){ return !!F().powerCut; }
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

/* ==================== 颜色工具 ==================== */
function shadeHex(hex, factor){
  if(!hex || hex.charAt(0) !== '#') return hex || '#888888';
  if(hex.length === 4){
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  let r = parseInt(hex.slice(1,3), 16);
  let g = parseInt(hex.slice(3,5), 16);
  let b = parseInt(hex.slice(5,7), 16);
  if(factor > 1){
    r = Math.min(255, r * factor) | 0;
    g = Math.min(255, g * factor) | 0;
    b = Math.min(255, b * factor) | 0;
  } else {
    r = Math.max(0, r * factor) | 0;
    g = Math.max(0, g * factor) | 0;
    b = Math.max(0, b * factor) | 0;
  }
  return '#' + r.toString(16).padStart(2,'0')
             + g.toString(16).padStart(2,'0')
             + b.toString(16).padStart(2,'0');
}

/* =========================================================
   ★ v14 几何体精细拆分 —— 每件 ≥ 500 顶点
   ========================================================= */
function enrichBox(p){
  const w = p.w !== undefined ? p.w : 0.6;
  const h = p.h !== undefined ? p.h : 0.6;
  const d = p.d !== undefined ? p.d : w;
  const x = p.x, y = p.y, z = p.z;
  const col = p.color || '#888888';
  const vol = Math.abs(w * h * d);

  if(vol < 0.005){
    const t = Math.max(0.005, Math.min(w,h,d) * 0.06);
    return [
      { shape:'box', x:x, y:y, z:z, w:w, h:h, d:d, color: col },
      { shape:'box', x:x, y:y+h-t*0.5, z:z, w:w*1.02, h:t, d:d*1.02, color: shadeHex(col,1.35) },
      { shape:'box', x:x, y:y+t*0.5, z:z, w:w*1.02, h:t, d:d*1.02, color: shadeHex(col,0.65) },
      { shape:'box', x:x, y:y+h*0.5, z:z+d*0.5, w:w*1.02, h:h*1.01, d:t, color: shadeHex(col,1.15) },
      { shape:'box', x:x, y:y+h*0.5, z:z-d*0.5, w:w*1.02, h:h*1.01, d:t, color: shadeHex(col,0.85) },
      { shape:'box', x:x-w*0.5, y:y+h*0.5, z:z, w:t, h:h*1.01, d:d*1.02, color: shadeHex(col,1.1) },
      { shape:'box', x:x+w*0.5, y:y+h*0.5, z:z, w:t, h:h*1.01, d:d*1.02, color: shadeHex(col,0.9) },
      { shape:'box', x:x, y:y+h*0.5, z:z, w:w*0.6, h:h*0.6, d:0.005, color: shadeHex(col,0.75) }
    ];
  }

  if(vol < 0.05){
    const t = Math.max(0.015, Math.min(w,h,d) * 0.05);
    const arr = [];
    arr.push({ shape:'box', x:x, y:y, z:z, w:w, h:h, d:d, color: col });
    arr.push({ shape:'box', x:x, y:y+h-t*0.5, z:z, w:w*1.025, h:t, d:d*1.025, color: shadeHex(col,1.35) });
    arr.push({ shape:'box', x:x, y:y+t*0.5, z:z, w:w*1.025, h:t, d:d*1.025, color: shadeHex(col,0.65) });
    arr.push({ shape:'box', x:x, y:y+h*0.5, z:z+d*0.5, w:w*1.025, h:h*1.01, d:t, color: shadeHex(col,1.15) });
    arr.push({ shape:'box', x:x, y:y+h*0.5, z:z-d*0.5, w:w*1.025, h:h*1.01, d:t, color: shadeHex(col,0.85) });
    arr.push({ shape:'box', x:x-w*0.5, y:y+h*0.5, z:z, w:t, h:h*1.01, d:d*1.025, color: shadeHex(col,1.1) });
    arr.push({ shape:'box', x:x+w*0.5, y:y+h*0.5, z:z, w:t, h:h*1.01, d:d*1.025, color: shadeHex(col,0.9) });
    arr.push({ shape:'box', x:x, y:y+h*0.5, z:z+d*0.5+0.008, w:w*0.82, h:h*0.82, d:0.004, color: shadeHex(col,0.78) });
    arr.push({ shape:'box', x:x, y:y+h*0.5, z:z-d*0.5-0.008, w:w*0.82, h:h*0.82, d:0.004, color: shadeHex(col,0.78) });
    arr.push({ shape:'box', x:x, y:y+h*0.7, z:z+d*0.5+0.014, w:w*0.66, h:h*0.05, d:0.003, color: shadeHex(col,1.5) });
    arr.push({ shape:'box', x:x, y:y+h*0.5, z:z+d*0.5+0.014, w:w*0.58, h:h*0.04, d:0.003, color: shadeHex(col,1.4) });
    const cw = Math.min(w, d) * 0.07;
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(cc){
      arr.push({ shape:'box',
        x: x + cc[0]*(w*0.5-cw*0.5), y: y+h*0.5, z: z + cc[1]*(d*0.5-cw*0.5),
        w: cw, h: h*1.02, d: cw, color: shadeHex(col, 0.6) });
    });
    return arr;
  }

  const t = Math.max(0.02, Math.min(w,h,d) * 0.045);
  const arr = [];
  arr.push({ shape:'box', x:x, y:y, z:z, w:w, h:h, d:d, color: col });
  arr.push({ shape:'box', x:x, y:y+h-t*0.5, z:z, w:w*1.03, h:t, d:d*1.03, color: shadeHex(col,1.35) });
  arr.push({ shape:'box', x:x, y:y+t*0.5, z:z, w:w*1.03, h:t, d:d*1.03, color: shadeHex(col,0.65) });
  arr.push({ shape:'box', x:x, y:y+h*0.5, z:z+d*0.5, w:w*1.03, h:h*1.01, d:t, color: shadeHex(col,1.18) });
  arr.push({ shape:'box', x:x, y:y+h*0.5, z:z-d*0.5, w:w*1.03, h:h*1.01, d:t, color: shadeHex(col,0.82) });
  arr.push({ shape:'box', x:x-w*0.5, y:y+h*0.5, z:z, w:t, h:h*1.01, d:d*1.03, color: shadeHex(col,1.12) });
  arr.push({ shape:'box', x:x+w*0.5, y:y+h*0.5, z:z, w:t, h:h*1.01, d:d*1.03, color: shadeHex(col,0.88) });
  arr.push({ shape:'box', x:x, y:y+h*0.5, z:z+d*0.5+0.01, w:w*0.80, h:h*0.80, d:0.005, color: shadeHex(col,0.75) });
  arr.push({ shape:'box', x:x, y:y+h*0.5, z:z-d*0.5-0.01, w:w*0.80, h:h*0.80, d:0.005, color: shadeHex(col,0.75) });
  arr.push({ shape:'box', x:x-w*0.5-0.01, y:y+h*0.5, z:z, w:0.005, h:h*0.80, d:d*0.80, color: shadeHex(col,0.75) });
  arr.push({ shape:'box', x:x+w*0.5+0.01, y:y+h*0.5, z:z, w:0.005, h:h*0.80, d:d*0.80, color: shadeHex(col,0.75) });
  arr.push({ shape:'box', x:x, y:y+h*0.72, z:z+d*0.5+0.016, w:w*0.66, h:h*0.045, d:0.004, color: shadeHex(col,1.55) });
  arr.push({ shape:'box', x:x, y:y+h*0.56, z:z+d*0.5+0.016, w:w*0.60, h:h*0.035, d:0.004, color: shadeHex(col,1.45) });
  arr.push({ shape:'box', x:x, y:y+h*0.42, z:z+d*0.5+0.016, w:w*0.54, h:h*0.030, d:0.004, color: shadeHex(col,1.35) });
  arr.push({ shape:'box', x:x, y:y+h*0.28, z:z+d*0.5+0.016, w:w*0.46, h:h*0.028, d:0.004, color: shadeHex(col,1.25) });
  arr.push({ shape:'box', x:x, y:y+h*0.68, z:z-d*0.5-0.016, w:w*0.60, h:h*0.040, d:0.004, color: shadeHex(col,1.4) });
  arr.push({ shape:'box', x:x, y:y+h*0.50, z:z-d*0.5-0.016, w:w*0.52, h:h*0.032, d:0.004, color: shadeHex(col,1.3) });
  const cw = Math.min(w, d) * 0.08;
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(cc){
    arr.push({ shape:'box',
      x: x + cc[0]*(w*0.5-cw*0.5), y: y+h*0.5, z: z + cc[1]*(d*0.5-cw*0.5),
      w: cw, h: h*1.03, d: cw, color: shadeHex(col, 0.55) });
  });
  const mw = Math.min(w, d) * 0.04;
  arr.push({ shape:'box', x:x, y:y+h*0.5, z:z+d*0.5, w:mw, h:h*1.01, d:mw, color: shadeHex(col,0.7) });
  arr.push({ shape:'box', x:x, y:y+h*0.5, z:z-d*0.5, w:mw, h:h*1.01, d:mw, color: shadeHex(col,0.7) });
  arr.push({ shape:'box', x:x-w*0.5, y:y+h*0.5, z:z, w:mw, h:h*1.01, d:mw, color: shadeHex(col,0.7) });
  arr.push({ shape:'box', x:x+w*0.5, y:y+h*0.5, z:z, w:mw, h:h*1.01, d:mw, color: shadeHex(col,0.7) });
  arr.push({ shape:'box', x:x, y:y+h+t*0.8, z:z, w:w*0.95, h:t*0.7, d:d*0.95, color: shadeHex(col,1.5) });
  arr.push({ shape:'box', x:x, y:y+h+t*1.7, z:z, w:w*0.80, h:t*0.5, d:d*0.80, color: shadeHex(col,1.6) });
  arr.push({ shape:'box', x:x, y:y+h+t*2.3, z:z, w:w*0.55, h:t*0.4, d:d*0.55, color: shadeHex(col,1.7) });
  arr.push({ shape:'box', x:x, y:y-t*1.5, z:z, w:w*0.95, h:t*0.7, d:d*0.95, color: shadeHex(col,0.55) });
  arr.push({ shape:'box', x:x, y:y-t*2.4, z:z, w:w*0.80, h:t*0.5, d:d*0.80, color: shadeHex(col,0.45) });
  arr.push({ shape:'box', x:x, y:y-t*3.0, z:z, w:w*0.55, h:t*0.4, d:d*0.55, color: shadeHex(col,0.35) });
  return arr;
}

function enrichCyl(p){
  const w = p.w !== undefined ? p.w : 0.6;
  const h = p.h !== undefined ? p.h : 0.6;
  const x = p.x, y = p.y, z = p.z;
  const col = p.color || '#888888';
  const r = w / 2;
  const vol = Math.PI * r * r * h;

  if(vol < 0.01){
    const arr = [
      { shape:'cyl', x:x, y:y, z:z, w:w, h:h, color: col },
      { shape:'cyl', x:x, y:y+h-h*0.05, z:z, w:w*1.15, h:h*0.06, color: shadeHex(col,1.4) },
      { shape:'cyl', x:x, y:y+h*0.05, z:z, w:w*1.15, h:h*0.06, color: shadeHex(col,0.6) },
      { shape:'cyl', x:x, y:y+h-h*0.12, z:z, w:w*1.10, h:h*0.04, color: shadeHex(col,1.25) },
      { shape:'cyl', x:x, y:y+h*0.12, z:z, w:w*1.10, h:h*0.04, color: shadeHex(col,0.75) }
    ];
    [[0,1],[1,0],[0,-1],[-1,0]].forEach(function(dir){
      arr.push({ shape:'box',
        x: x + dir[0]*(r*1.01), y: y+h*0.5, z: z + dir[1]*(r*1.01),
        w: Math.abs(dir[0])>0 ? r*0.18 : r*0.7,
        h: h*1.01,
        d: Math.abs(dir[0])>0 ? r*0.7 : r*0.18,
        color: shadeHex(col,0.7) });
    });
    return arr;
  }

  if(vol < 0.08){
    const ringT = Math.max(0.015, h * 0.05);
    const arr = [
      { shape:'cyl', x:x, y:y, z:z, w:w, h:h, color: col },
      { shape:'cyl', x:x, y:y+h-ringT*0.5, z:z, w:w*1.18, h:ringT, color: shadeHex(col,1.4) },
      { shape:'cyl', x:x, y:y+ringT*0.5, z:z, w:w*1.18, h:ringT, color: shadeHex(col,0.6) },
      { shape:'cyl', x:x, y:y+h-h*0.12, z:z, w:w*1.10, h:ringT*0.6, color: shadeHex(col,1.28) },
      { shape:'cyl', x:x, y:y+h*0.12, z:z, w:w*1.10, h:ringT*0.6, color: shadeHex(col,0.72) },
      { shape:'cyl', x:x, y:y+h*0.5, z:z, w:w*1.05, h:ringT*0.5, color: shadeHex(col,1.1) }
    ];
    for(let i = 0; i < 8; i++){
      const a = (i / 8) * Math.PI * 2;
      arr.push({ shape:'box',
        x: x + Math.cos(a) * r * 1.01,
        y: y + h*0.5,
        z: z + Math.sin(a) * r * 1.01,
        w: Math.abs(Math.cos(a)) > 0.5 ? r*0.14 : r*0.55,
        h: h*1.01,
        d: Math.abs(Math.sin(a)) > 0.5 ? r*0.14 : r*0.55,
        color: shadeHex(col, 0.65)
      });
    }
    arr.push({ shape:'cyl', x:x, y:y+h, z:z, w:w*0.85, h:0.008, color: shadeHex(col,1.5) });
    arr.push({ shape:'cyl', x:x, y:y-h*0.02, z:z, w:w*0.85, h:0.008, color: shadeHex(col,0.45) });
    arr.push({ shape:'cyl', x:x, y:y+h+0.01, z:z, w:w*0.55, h:0.02, color: shadeHex(col,1.6) });
    arr.push({ shape:'cyl', x:x, y:y-h*0.04, z:z, w:w*0.55, h:0.02, color: shadeHex(col,0.35) });
    return arr;
  }

  const ringT = Math.max(0.02, h * 0.045);
  const arr = [
    { shape:'cyl', x:x, y:y, z:z, w:w, h:h, color: col },
    { shape:'cyl', x:x, y:y+h-ringT*0.5, z:z, w:w*1.20, h:ringT, color: shadeHex(col,1.42) },
    { shape:'cyl', x:x, y:y+ringT*0.5, z:z, w:w*1.20, h:ringT, color: shadeHex(col,0.58) },
    { shape:'cyl', x:x, y:y+h-h*0.15, z:z, w:w*1.12, h:ringT*0.6, color: shadeHex(col,1.30) },
    { shape:'cyl', x:x, y:y+h*0.15, z:z, w:w*1.12, h:ringT*0.6, color: shadeHex(col,0.70) },
    { shape:'cyl', x:x, y:y+h*0.72, z:z, w:w*1.08, h:ringT*0.5, color: shadeHex(col,1.15) },
    { shape:'cyl', x:x, y:y+h*0.28, z:z, w:w*1.08, h:ringT*0.5, color: shadeHex(col,0.85) },
    { shape:'cyl', x:x, y:y+h*0.5, z:z, w:w*1.05, h:ringT*0.4, color: shadeHex(col,1.05) }
  ];
  for(let i = 0; i < 12; i++){
    const a = (i / 12) * Math.PI * 2;
    arr.push({ shape:'box',
      x: x + Math.cos(a) * r * 1.015,
      y: y + h*0.5,
      z: z + Math.sin(a) * r * 1.015,
      w: Math.abs(Math.cos(a)) > 0.5 ? r*0.11 : r*0.5,
      h: h*1.02,
      d: Math.abs(Math.sin(a)) > 0.5 ? r*0.11 : r*0.5,
      color: shadeHex(col, 0.62)
    });
  }
  arr.push({ shape:'cyl', x:x, y:y+h, z:z, w:w*0.88, h:0.008, color: shadeHex(col,1.5) });
  arr.push({ shape:'cyl', x:x, y:y-h*0.02, z:z, w:w*0.88, h:0.008, color: shadeHex(col,0.45) });
  arr.push({ shape:'cyl', x:x, y:y+h+0.01, z:z, w:w*0.65, h:0.015, color: shadeHex(col,1.6) });
  arr.push({ shape:'cyl', x:x, y:y-h*0.03, z:z, w:w*0.65, h:0.015, color: shadeHex(col,0.35) });
  return arr;
}

function enrichPlate(p){
  const w = p.w !== undefined ? p.w : 0.6;
  const h = p.h !== undefined ? p.h : 0.6;
  const x = p.x, y = p.y, z = p.z;
  const col = p.color || '#888888';

  const barT = Math.max(0.012, Math.min(w, h) * 0.05);
  const arr = [
    { shape:'plate', x:x, y:y, z:z, w:w, h:h, color: col },
    { shape:'box', x:x, y:y+h-barT*0.5, z:z, w:w*1.04, h:barT, d:0.05, color: shadeHex(col,1.35) },
    { shape:'box', x:x, y:y+barT*0.5, z:z, w:w*1.04, h:barT, d:0.05, color: shadeHex(col,0.65) },
    { shape:'box', x:x-w*0.5, y:y+h*0.5, z:z, w:barT, h:h*1.02, d:0.05, color: shadeHex(col,1.15) },
    { shape:'box', x:x+w*0.5, y:y+h*0.5, z:z, w:barT, h:h*1.02, d:0.05, color: shadeHex(col,0.85) },
    { shape:'box', x:x, y:y+h-barT*1.5, z:z+0.02, w:w*0.90, h:barT*0.5, d:0.03, color: shadeHex(col,1.5) },
    { shape:'box', x:x, y:y+barT*1.5, z:z+0.02, w:w*0.90, h:barT*0.5, d:0.03, color: shadeHex(col,0.5) },
    { shape:'box', x:x-w*0.42, y:y+h*0.5, z:z+0.02, w:barT*0.5, h:h*0.85, d:0.03, color: shadeHex(col,1.3) },
    { shape:'box', x:x+w*0.42, y:y+h*0.5, z:z+0.02, w:barT*0.5, h:h*0.85, d:0.03, color: shadeHex(col,0.8) },
    { shape:'box', x:x, y:y+h*0.5, z:z+0.008, w:w*0.75, h:h*0.75, d:0.004, color: shadeHex(col,0.72) },
    { shape:'box', x:x, y:y+h*0.72, z:z+0.014, w:w*0.6, h:h*0.04, d:0.003, color: shadeHex(col,1.55) },
    { shape:'box', x:x, y:y+h*0.58, z:z+0.014, w:w*0.55, h:h*0.03, d:0.003, color: shadeHex(col,1.45) },
    { shape:'box', x:x, y:y+h*0.42, z:z+0.014, w:w*0.5, h:h*0.03, d:0.003, color: shadeHex(col,1.35) },
    { shape:'box', x:x, y:y+h*0.28, z:z+0.014, w:w*0.42, h:h*0.025, d:0.003, color: shadeHex(col,1.25) }
  ];
  const rvT = Math.min(w, h) * 0.04;
  [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(cc){
    arr.push({ shape:'cyl',
      x: x + cc[0]*(w*0.46), y: y+h*0.5 + cc[1]*(h*0.46), z: z + 0.02,
      w: rvT, h: 0.02, color: shadeHex(col,1.5) });
  });
  return arr;
}

function enrichLow(p){
  const w = p.w !== undefined ? p.w : 0.6;
  const h = p.h !== undefined ? p.h : 0.01;
  const x = p.x, y = p.y, z = p.z;
  const col = p.color || '#888888';
  const r = w / 2;
  const ringT = Math.max(0.004, h * 0.5);

  const arr = [
    { shape:'low', x:x, y:y, z:z, w:w, h:h, color: col },
    { shape:'low', x:x, y:y+h*0.5, z:z, w:w*1.15, h:ringT, color: shadeHex(col,1.4) },
    { shape:'low', x:x, y:y-h*0.5, z:z, w:w*1.1, h:ringT, color: shadeHex(col,0.6) },
    { shape:'low', x:x, y:y+h*0.2, z:z, w:w*1.08, h:ringT*0.7, color: shadeHex(col,1.25) },
    { shape:'low', x:x, y:y-h*0.2, z:z, w:w*1.05, h:ringT*0.7, color: shadeHex(col,0.75) }
  ];
  for(let i = 0; i < 8; i++){
    const a = (i / 8) * Math.PI * 2;
    arr.push({ shape:'box',
      x: x + Math.cos(a) * r * 0.6,
      y: y, z: z + Math.sin(a) * r * 0.6,
      w: Math.abs(Math.cos(a)) > 0.5 ? r*0.28 : r*0.12,
      h: h * 2,
      d: Math.abs(Math.sin(a)) > 0.5 ? r*0.28 : r*0.12,
      color: shadeHex(col, 1.1)
    });
  }
  arr.push({ shape:'low', x:x, y:y, z:z, w:r*0.4, h:h*3, color: shadeHex(col,1.55) });
  arr.push({ shape:'low', x:x, y:y, z:z, w:r*0.7, h:h*2, color: shadeHex(col,1.35) });
  arr.push({ shape:'box', x:x, y:y, z:z, w:r*1.5, h:h*2, d:r*0.1, color: shadeHex(col,1.2) });
  arr.push({ shape:'box', x:x, y:y, z:z, w:r*0.1, h:h*2, d:r*1.5, color: shadeHex(col,1.2) });
  return arr;
}

function enrichProp(p){
  if(DETAIL_LEVEL <= 1) return [p];
  const shape = p.shape || 'box';
  if(shape === 'box')   return enrichBox(p);
  if(shape === 'cyl')   return enrichCyl(p);
  if(shape === 'plate') return enrichPlate(p);
  if(shape === 'low')   return enrichLow(p);
  return [p];
}

function enrichProps(rawProps){
  if(!rawProps || !rawProps.length) return rawProps || [];
  if(DETAIL_LEVEL <= 1) return rawProps;
  const out = [];
  for(let i = 0; i < rawProps.length; i++){
    const sub = enrichProp(rawProps[i]);
    for(let j = 0; j < sub.length; j++) out.push(sub[j]);
  }
  return out;
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

/* ==================== 背景音乐 ==================== */
const SceneMusic = (function(){
  let ctx = null, master = null;
  let reverbInput = null;
  let active = false;
  let currentTheme = null;
  let schedTimer = null;
  let nextBeat = 0;
  let beatIndex = 0;
  let chordIndex = 0;
  const TARGET_VOLUME = 0.42;

  function makeReverb(c){
    const d1 = c.createDelay(2.0);
    d1.delayTime.value = 0.37;
    const d2 = c.createDelay(2.0);
    d2.delayTime.value = 0.53;
    const fb = c.createGain();
    fb.gain.value = 0.40;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    d1.connect(lp);
    lp.connect(fb);
    fb.connect(d2);
    d2.connect(d1);
    return d1;
  }

  const THEMES = {
    horror: { root: 110, chords: [[0,1,6],[0,1,6],[-1,3,8],[0,1,6]], arp: [0,1,0,2,1,0,1,2], bpm: 40, wave: 'sawtooth', filt: 480, vol: 0.15 },
    mystery: { root: 174.61, chords: [[0,3,7],[-2,1,5],[-4,-1,3],[0,3,7]], arp: [0,2,1,2,3,2,1,0], bpm: 48, wave: 'sine', filt: 1200, vol: 0.13 },
    warm: { root: 261.63, chords: [[0,4,7],[-3,2,5],[-5,0,4],[-3,2,5]], arp: [0,1,2,1,0,1,2,1], bpm: 62, wave: 'triangle', filt: 2100, vol: 0.18 },
    sad: { root: 196, chords: [[0,3,7],[-2,1,5],[-5,-2,2],[0,3,7]], arp: [0,2,1,3,2,1,0,2], bpm: 52, wave: 'sine', filt: 1100, vol: 0.14 },
    bright: { root: 293.66, chords: [[0,4,7,12],[-2,2,5,9],[3,7,10,14],[-2,2,5,9]], arp: [0,1,2,3,2,1,0,1], bpm: 68, wave: 'triangle', filt: 2600, vol: 0.15 }
  };

  function themeForScene(key, isBlood){
    if(isBlood) return 'horror';
    const map = {
      alley: 'mystery', backstreet: 'mystery', shop: 'warm',
      street: 'mystery', doorstep: 'warm', house: 'warm',
      powerstation: 'mystery', rooftop: 'sad', underpass: 'mystery',
      riverside: 'sad', neighbor: 'mystery',
      alley_day: 'bright', backstreet_day: 'bright', shop_day: 'warm',
      street_day: 'warm', doorstep_day: 'warm', house_day: 'warm'
    };
    return map[key] || 'warm';
  }

  function noteFreq(root, semitone){ return root * Math.pow(2, semitone / 12); }

  function playNote(c, dest, freq, when, dur, opts){
    const osc = c.createOscillator();
    osc.type = opts.wave || 'sine';
    osc.frequency.value = freq;
    const g = c.createGain();
    const peak = opts.peak || 0.15;
    const attack = opts.attack || 0.1;
    const release = opts.release || 0.6;
    const sustain = opts.sustain || 0.7;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + attack);
    g.gain.linearRampToValueAtTime(peak * sustain, when + Math.max(attack + 0.05, dur - release));
    g.gain.linearRampToValueAtTime(0, when + dur);
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = opts.filt || 1500;
    filt.Q.value = 0.8;
    osc.connect(filt); filt.connect(g);
    g.connect(dest); g.connect(reverbInput);
    osc.start(when); osc.stop(when + dur + 0.1);
  }

  function scheduleLoop(){
    if(!ctx || !active) return;
    const theme = THEMES[currentTheme];
    if(!theme) return;
    const now = ctx.currentTime;
    const beatDur = 60 / theme.bpm / 2;
    const chordDur = beatDur * 8;
    while(nextBeat < now + 1.5){
      const idx = beatIndex % theme.arp.length;
      const chord = theme.chords[chordIndex % theme.chords.length];
      const arpNote = theme.arp[idx];
      const semitone = (chord[arpNote % chord.length] || 0) + 12 * Math.floor(arpNote / 3);
      const freq = noteFreq(theme.root, semitone + 12);
      const peak = theme.vol * (0.7 + Math.random() * 0.4);
      playNote(ctx, master, freq, nextBeat, beatDur * 1.6, {
        wave: theme.wave, attack: 0.15, release: 0.7,
        peak: peak, filt: theme.filt
      });
      beatIndex++;
      if(beatIndex % 8 === 0){
        chordIndex++;
        const padChord = theme.chords[chordIndex % theme.chords.length];
        padChord.forEach(function(st){
          const pf = noteFreq(theme.root, st);
          playNote(ctx, master, pf, nextBeat, chordDur * 1.05, {
            wave: 'sine', attack: 0.6, release: 1.4,
            peak: theme.vol * 0.38, filt: theme.filt * 0.6
          });
        });
      }
      nextBeat += beatDur;
    }
    schedTimer = setTimeout(scheduleLoop, 700);
  }

  function init(){
    if(ctx) return;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      reverbInput = makeReverb(ctx);
      const revGain = ctx.createGain();
      revGain.gain.value = 0.45;
      reverbInput.connect(revGain);
      revGain.connect(ctx.destination);
      master.connect(ctx.destination);
    }catch(e){ console.warn('[SceneMusic]', e); }
  }

  function start(themeName, fadeIn){
    if(!ctx) init();
    if(!ctx) return;
    currentTheme = themeName;
    if(master){
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(TARGET_VOLUME, ctx.currentTime + (fadeIn || 1.5));
    }
    if(active) return;
    active = true;
    nextBeat = ctx.currentTime + 0.1;
    beatIndex = 0;
    chordIndex = 0;
    scheduleLoop();
  }

  function stop(fadeOut){
    if(!ctx || !master) return;
    active = false;
    if(schedTimer){ clearTimeout(schedTimer); schedTimer = null; }
    const dur = fadeOut || 1.2;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
  }

  function setScene(key, isBlood){
    const newTheme = themeForScene(key, isBlood);
    if(!ctx) init();
    if(!ctx) return;
    if(newTheme === currentTheme && active) return;
    if(!active){ start(newTheme, 1.5); return; }
    if(master){
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    }
    active = false;
    if(schedTimer){ clearTimeout(schedTimer); schedTimer = null; }
    setTimeout(function(){
      currentTheme = newTheme;
      start(newTheme, 1.2);
    }, 900);
  }

  function resume(){ if(ctx && ctx.state === 'suspended') ctx.resume(); }
  return { init, start, stop, setScene, resume };
})();

function ensureAudio(){
  if(!audioReady){ audioReady = true; HorrorAudio.init(); }
  HorrorAudio.resume();
  SceneMusic.init();
  SceneMusic.resume();
  if(sceneKey && !musicStarted){
    musicStarted = true;
    SceneMusic.setScene(sceneKey, isBloodMode());
  }
}

/* ==================== 纹理 —— 512 ==================== */
const TEX_SIZE = 512;

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
    bg.addColorStop(1, shadeHex(base, 0.72));
    x.fillStyle = bg; x.fillRect(0, 0, S, S);

    const bw = S / 4, bh = S / 8;
    const rows = S / bh;
    for(let row = 0; row < rows; row++){
      const yy = row * bh;
      const off = (row % 2) ? 0 : bw / 2;
      for(let xx = off - bw; xx < S; xx += bw){
        const bx = xx + 2, by = yy + 2;
        const cellW = bw - 4, cellH = bh - 4;
        const seed = (row * 31 + xx * 17) % 100;
        const tint = (seed - 50) / 350;
        x.fillStyle = shadeHex(base, 1 + tint * 0.7);
        x.fillRect(bx, by, cellW, cellH);

        x.strokeStyle = 'rgba(0,0,0,0.18)';
        x.lineWidth = 1;
        for(let k = 0; k < 3; k++){
          const lx = bx + 4 + (k + seed % 3) * cellW / 5;
          x.beginPath();
          x.moveTo(lx, by + 4);
          x.lineTo(lx + (Math.random() - 0.5) * 3, by + cellH - 4);
          x.stroke();
        }

        x.fillStyle = 'rgba(255,255,255,' + (0.06 + Math.random() * 0.05) + ')';
        x.fillRect(bx, by, cellW, 2);
        x.fillStyle = 'rgba(0,0,0,0.5)';
        x.fillRect(bx, by + cellH - 2, cellW, 2);
        x.fillRect(bx + cellW - 2, by, 2, cellH);
      }
    }

    x.strokeStyle = isBurnt ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.62)';
    x.lineWidth = 2;
    for(let row = 0; row <= rows; row++){
      x.beginPath(); x.moveTo(0, row * bh); x.lineTo(S, row * bh); x.stroke();
    }

    for(let i = 0; i < 90; i++){
      const px = Math.random() * S, py = Math.random() * S;
      const r = 10 + Math.random() * 45;
      const grd = x.createRadialGradient(px, py, 0, px, py, r);
      if(isBurnt){
        grd.addColorStop(0, 'rgba(70,10,10,0.42)');
        grd.addColorStop(1, 'rgba(70,10,10,0)');
      } else if(isWet){
        grd.addColorStop(0, 'rgba(140,180,220,0.30)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
      } else {
        grd.addColorStop(0, 'rgba(0,0,0,0.26)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
      }
      x.fillStyle = grd;
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
    }

    for(let i = 0; i < 60; i++){
      const px = Math.random() * S;
      const py = S * 0.55 + Math.random() * S * 0.45;
      const r = 6 + Math.random() * 22;
      const grd = x.createRadialGradient(px, py, 0, px, py, r);
      grd.addColorStop(0, 'rgba(50,75,40,0.4)');
      grd.addColorStop(1, 'rgba(50,75,40,0)');
      x.fillStyle = grd;
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
    }

    x.strokeStyle = 'rgba(0,0,0,0.5)';
    x.lineWidth = 1;
    for(let i = 0; i < 6; i++){
      let cx = Math.random() * S;
      let cy = Math.random() * S;
      x.beginPath();
      x.moveTo(cx, cy);
      for(let j = 0; j < 8; j++){
        cx += (Math.random() - 0.5) * 60;
        cy += Math.random() * 40;
        x.lineTo(cx, cy);
      }
      x.stroke();
    }

    if(isWet){
      x.fillStyle = 'rgba(140,180,220,0.07)';
      for(let i = 0; i < 12; i++) x.fillRect(0, 12 + i * 40, S, 3);
    }

    if(isBurnt){
      x.fillStyle = 'rgba(0,0,0,0.7)';
      for(let i = 0; i < 220; i++){
        x.beginPath();
        x.arc(Math.random() * S, Math.random() * S, 1 + Math.random() * 7, 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = 'rgba(90,5,5,0.55)';
      for(let i = 0; i < 45; i++){
        const bx = Math.random() * S;
        const by = Math.random() * S * 0.7;
        const bl = 10 + Math.random() * 30;
        x.fillRect(bx, by, 1.8, bl);
      }
      x.fillStyle = 'rgba(140,10,10,0.4)';
      for(let i = 0; i < 15; i++){
        x.beginPath();
        x.arc(Math.random() * S, Math.random() * S, 1.5 + Math.random() * 3, 0, Math.PI * 2);
        x.fill();
      }
    }
  }
  else if(type === 'tile'){
    const base = spec.base || '#c8d0d8';
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    const t = 64;
    for(let yy = 0; yy < S; yy += t){
      for(let xx = 0; xx < S; xx += t){
        const seed = (yy * 11 + xx * 7) % 100;
        const tint = (seed - 50) / 500;
        x.fillStyle = shadeHex(base, 1 + tint);
        x.fillRect(xx + 1, yy + 1, t - 2, t - 2);
        x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(xx + 1, yy + 1, t - 2, 2);
        x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(xx + 1, yy + t - 3, t - 2, 2);
      }
    }
    x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 2;
    for(let i = 0; i <= S; i += t){
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke();
    }
  }
  else if(type === 'wood'){
    const base = spec.base || '#5a3a20';
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    const pw = 32;
    for(let xx = 0; xx < S; xx += pw){
      const tint = ((xx * 13) % 40 - 20) / 200;
      x.fillStyle = shadeHex(base, 1 + tint);
      x.fillRect(xx + 1, 0, pw - 2, S);
      x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, S); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,0.14)';
      for(let i = 0; i < 8; i++){
        const py = 8 + i * 64 + Math.random() * 6;
        x.beginPath();
        x.moveTo(xx + 4, py);
        x.bezierCurveTo(xx + 10, py + 2, xx + 20, py - 2, xx + pw - 3, py + 1);
        x.stroke();
      }
    }
  }
  else if(type === 'metal'){
    const base = spec.base || '#3a4048';
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 3;
    x.strokeRect(4, 4, S-8, S-8);
    x.beginPath(); x.moveTo(0, S/2); x.lineTo(S, S/2); x.stroke();
    x.beginPath(); x.moveTo(S/2, 0); x.lineTo(S/2, S); x.stroke();
    for(let yy = 24; yy < S; yy += 48){
      for(let xx = 24; xx < S; xx += 48){
        x.fillStyle = 'rgba(255,255,255,0.32)';
        x.beginPath(); x.arc(xx, yy, 4, 0, Math.PI*2); x.fill();
        x.fillStyle = 'rgba(0,0,0,0.42)';
        x.beginPath(); x.arc(xx + 1, yy + 1, 2.5, 0, Math.PI*2); x.fill();
      }
    }
  }

  if(spec.skirting !== false && type !== 'tile'){
    const skH = Math.floor(S * 0.12);
    const sgrad = x.createLinearGradient(0, S - skH, 0, S);
    sgrad.addColorStop(0, 'rgba(0,0,0,0.65)');
    sgrad.addColorStop(1, 'rgba(0,0,0,0.9)');
    x.fillStyle = sgrad;
    x.fillRect(0, S - skH, S, skH);
    x.fillStyle = 'rgba(255,255,255,0.08)';
    x.fillRect(0, S - skH, S, 2);
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
  x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 2;
  const t = 64;
  for(let i = 0; i <= S; i += t){
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke();
  }
  for(let yy = 0; yy < S; yy += t){
    for(let xx = 0; xx < S; xx += t){
      const seed = (xx*7 + yy*13) % 100;
      const tint = (seed - 50) / 600;
      x.fillStyle = shadeHex(base, 1 + tint);
      x.fillRect(xx + 2, yy + 2, t - 4, t - 4);
    }
  }
  for(let i = 0; i < 30; i++){
    const px = Math.random()*S, py = Math.random()*S;
    const r = 12 + Math.random()*36;
    const grd = x.createRadialGradient(px, py, 0, px, py, r);
    grd.addColorStop(0, 'rgba(80,10,10,0.4)');
    grd.addColorStop(1, 'rgba(80,10,10,0)');
    x.fillStyle = grd;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI*2); x.fill();
  }
  x.fillStyle = 'rgba(255,255,255,0.06)';
  for(let i = 0; i < 800; i++) x.fillRect(Math.random()*S, Math.random()*S, 1.5, 1.5);
  x.fillStyle = 'rgba(0,0,0,0.14)';
  for(let i = 0; i < 800; i++) x.fillRect(Math.random()*S, Math.random()*S, 1.5, 1.5);
  return c;
}

function makeCeilTextureCanvas(spec){
  const S = TEX_SIZE;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const x = c.getContext('2d');
  const base = (spec && spec.base) || '#0a0d12';
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 2;
  const t = 128;
  for(let i = 0; i <= S; i += t){
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke();
  }
  for(let i = 0; i < 30; i++){
    const px = Math.random()*S, py = Math.random()*S;
    const r = 16 + Math.random()*40;
    const grd = x.createRadialGradient(px, py, 0, px, py, r);
    grd.addColorStop(0, 'rgba(0,0,0,0.32)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = grd;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI*2); x.fill();
  }
  x.fillStyle = 'rgba(90,5,5,0.6)';
  for(let i = 0; i < 30; i++){
    const bx = Math.random()*S;
    const by = Math.random()*S*0.6;
    const bl = 10 + Math.random()*26;
    x.fillRect(bx, by, 1.6, bl);
  }
  for(let i = 0; i < 1200; i++){
    x.fillStyle = 'rgba(255,255,255,0.03)';
    x.fillRect(Math.random()*S, Math.random()*S, 1.5, 1.5);
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
  emgPulse = 0.50; emgTarget = 0.50;
  emgNextChange = performance.now()/1000 + 0.5 + Math.random()*2;
  bloodDrops = [];
  shadowAlpha = 0;
  ackFlashTime = 0;
  ackFlashAlpha = 0;
  lensDrops = [];
  lensTrails = [];
  bloodSplats = [];
  if(isBloodMode()){
    const hasAck = map.things && map.things.some(function(th){ return th.ack; });
    if(hasAck) triggerBloodSplats(0.5);
  }
  SceneMusic.setScene(key, isBloodMode());
  resize();
  buildWorld();
}

function buildWorld(){
  const wallSpec  = map.wallTex  || { type: 'burnt', base: '#150c0a' };
  const floorSpec = map.floorTex || { base: '#0a0806' };
  const ceilSpec  = map.ceilTex  || { base: '#050303' };
  renderer.buildWorld({
    grid: map.grid,
    wallHeight: 2.6,
    wallTexSource:  getWallTextureCanvas(wallSpec,  sceneKey),
    floorTexSource: getFloorTextureCanvas(floorSpec, sceneKey),
    ceilTexSource:  getCeilTextureCanvas(ceilSpec,  sceneKey)
  });

  let props = (typeof map.props === 'function') ? map.props() : (map.props || []);
  props = enrichProps(props);
  renderer.buildProps(props);
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

/* ==================== 应急灯脉冲 ==================== */
function updateEmgPulse(){
  const nowSec = performance.now() / 1000;
  if(nowSec < emgNextChange){
    emgPulse += (emgTarget - emgPulse) * 0.35;
    return;
  }
  const r = Math.random();
  if(r < 0.10){
    emgTarget = 0.04 + Math.random()*0.07;
    emgNextChange = nowSec + 0.25 + Math.random()*0.6;
  } else if(r < 0.40){
    emgTarget = 0.40 + Math.random()*0.14;
    emgNextChange = nowSec + 0.7 + Math.random()*1.6;
  } else if(r < 0.78){
    emgTarget = 0.68 + Math.random()*0.16;
    emgNextChange = nowSec + 0.9 + Math.random()*2.2;
  } else if(r < 0.94){
    emgTarget = 0.95 + Math.random()*0.14;
    emgNextChange = nowSec + 0.4 + Math.random()*1.0;
  } else {
    emgTarget = 1.22;
    emgNextChange = nowSec + 0.08 + Math.random()*0.15;
  }
}

/* ==================== 影子 / 承认 / 血雾 ==================== */
function updateShadow(dt){
  if(!map || !map.shadow){ shadowAlpha = 0; return; }
  const sh = map.shadow;
  const dx = sh.x - cam.x;
  const dz = sh.z - cam.z;
  const dist = Math.sqrt(dx*dx + dz*dz);
  const worldAngle = Math.atan2(dz, dx);
  const camAngle = Math.atan2(Math.sin(cam.yaw), Math.cos(cam.yaw));
  let diff = worldAngle - camAngle;
  while(diff >  Math.PI) diff -= Math.PI * 2;
  while(diff < -Math.PI) diff += Math.PI * 2;
  const ad = Math.abs(diff);
  let target = 0;
  if(dist < 2.5){ target = 0; }
  else {
    if(ad < Math.PI * 0.30){ target = 0; }
    else if(ad < Math.PI * 0.55){
      const t = (ad - Math.PI * 0.30) / (Math.PI * 0.25);
      target = t * 0.60;
    }
    else if(ad < Math.PI * 0.85){ target = 0.60; }
    else {
      const t = 1 - (ad - Math.PI * 0.85) / (Math.PI * 0.15);
      target = Math.max(0, t) * 0.60;
    }
  }
  if(dist > 14) target = 0;
  else if(dist > 9){
    const t = 1 - (dist - 9) / 5;
    target *= Math.max(0, t);
  }
  shadowAlpha += (target - shadowAlpha) * Math.min(1, dt * 3);
  if(shadowAlpha < 0.005) shadowAlpha = 0;
}

function updateAckFlash(dt){
  if(ackFlashTime > 0){
    ackFlashTime = Math.max(0, ackFlashTime - dt);
    ackFlashAlpha = Math.min(1, ackFlashTime / 0.5);
  } else {
    ackFlashAlpha = 0;
  }
}

function updateBloodFade(dt){
  if(!bloodFadeActive) return;
  bloodFadeT = Math.max(0, bloodFadeT - dt);
  if(bloodFadeT <= 0) bloodFadeActive = false;
}
function triggerBloodFade(){
  bloodFadeActive = true;
  bloodFadeT = BLOOD_FADE_TOTAL;
}

/* ==================== v12 更新 ==================== */
function updateLensRain(dt, t){
  if(Math.random() < dt * 2.5){
    lensDrops.push({
      x: Math.random() * W,
      y: -30 - Math.random() * 40,
      vy: 40 + Math.random() * 55,
      vx: (Math.random() - 0.5) * 8,
      r: 4 + Math.random() * 8,
      alpha: 0.5 + Math.random() * 0.4,
      life: 0,
      lifeMax: 12 + Math.random() * 8
    });
  }
  for(let i = lensDrops.length - 1; i >= 0; i--){
    const d = lensDrops[i];
    d.y += d.vy * dt;
    d.x += d.vx * dt;
    d.life += dt;
    if(d.y > H + 20 || d.life >= d.lifeMax){
      lensTrails.push({
        x: d.x, y: d.y - d.r * 2,
        len: 25 + Math.random() * 55,
        w: d.r * 0.6,
        alpha: 0.30 + Math.random() * 0.20,
        life: 0,
        lifeMax: 8 + Math.random() * 6
      });
      lensDrops.splice(i, 1);
    }
  }
  for(let i = lensTrails.length - 1; i >= 0; i--){
    const tr = lensTrails[i];
    tr.life += dt;
    if(tr.life >= tr.lifeMax) lensTrails.splice(i, 1);
  }
  if(lensDrops.length > 40) lensDrops.splice(0, lensDrops.length - 40);
  if(lensTrails.length > 30) lensTrails.splice(0, lensTrails.length - 30);
}

function updateBloodSplats(dt){
  for(let i = bloodSplats.length - 1; i >= 0; i--){
    const s = bloodSplats[i];
    s.life += dt;
    if(s.life >= s.lifeMax) bloodSplats.splice(i, 1);
  }
}

function triggerBloodSplats(intensity){
  if(!isBloodMode()) return;
  const count = 3 + Math.floor(intensity * 4);
  for(let i = 0; i < count; i++){
    let x, y;
    const side = Math.floor(Math.random() * 4);
    if(side === 0){ x = Math.random() * W * 0.30; y = Math.random() * H; }
    else if(side === 1){ x = W * 0.70 + Math.random() * W * 0.30; y = Math.random() * H; }
    else if(side === 2){ x = Math.random() * W; y = Math.random() * H * 0.28; }
    else { x = Math.random() * W; y = H * 0.72 + Math.random() * H * 0.28; }
    const baseR = 15 + Math.random() * 40 * intensity;
    bloodSplats.push({
      x: x, y: y, r: baseR,
      alpha: (0.45 + Math.random() * 0.35) * intensity,
      seed: Math.random() * 100,
      life: 0, lifeMax: 10 + Math.random() * 10
    });
    const drops = 2 + Math.floor(Math.random() * 3);
    for(let j = 0; j < drops; j++){
      const ang = Math.random() * Math.PI * 2;
      const dist = baseR * (0.8 + Math.random() * 1.6);
      bloodSplats.push({
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        r: 2 + Math.random() * 7,
        alpha: (0.35 + Math.random() * 0.30) * intensity,
        seed: Math.random() * 100,
        life: 0, lifeMax: 8 + Math.random() * 8
      });
    }
  }
}

/* ==================== 更新 ==================== */
function update(dt){
  if(!map) return;
  isMoving = false;
  updateEmgPulse();

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

  let best = null, bestD = 2.2;
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
      nextScareAt = nowSec + 12 + Math.random()*12;
    }
    if(silenceT <= 0 && nowSec >= nextSilenceAt){
      silenceT = 1.6;
      nextSilenceAt = nowSec + 18 + Math.random()*16;
    }
    if(silenceT > 0) silenceT = Math.max(0, silenceT - dt);
    if(invertT <= 0 && nowSec >= nextInvertAt){
      invertT = 0.08;
      nextInvertAt = nowSec + 14 + Math.random()*18;
    }
    if(invertT > 0) invertT = Math.max(0, invertT - dt);
    if(intrudeT <= 0 && nowSec >= nextIntrudeAt){
      intrudeT = 0.9;
      intrudeX = 0.15 + Math.random()*0.7;
      intrudeY = 0.15 + Math.random()*0.7;
      intrudeSeed = Math.random()*1000;
      nextIntrudeAt = nowSec + 10 + Math.random()*12;
    }
    if(intrudeT > 0) intrudeT = Math.max(0, intrudeT - dt);
    if(camDriftT <= 0 && nowSec >= nextDriftAt){
      camDriftT = 0.7;
      const dir = Math.random() < 0.5 ? -1 : 1;
      camDriftYaw = dir * (0.35 + Math.random()*0.5);
      camDriftPitch = (Math.random()-0.5) * 0.4;
      nextDriftAt = nowSec + 18 + Math.random()*16;
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
    updateShadow(dt);
    updateAckFlash(dt);
    updateBloodFade(dt);
  }
}

function triggerNearby(){
  if(!nearby) return;
  const now = performance.now();
  if(now - (triggerTime[nearby.id] || 0) < 700) return;
  triggerTime[nearby.id] = now;
  const wasNearby = nearby;
  nearby = null;
  updateButton();
  if(wasNearby.ack && wasNearby.ackId){
    ackFlashTime = 0.5;
    ackFlashAlpha = 1.0;
    triggerBloodSplats(1.0);
    try{ window.parent.postMessage({ type:'bloodAcknowledge', id: wasNearby.ackId }, '*'); }catch(e){}
    if(window.S && window.S.flags){
      if(!window.S.flags.b_acked) window.S.flags.b_acked = {};
      const wasNew = !window.S.flags.b_acked[wasNearby.ackId];
      window.S.flags.b_acked[wasNearby.ackId] = true;
      if(wasNew){
        let n = 0;
        for(const k in window.S.flags.b_acked){
          if(window.S.flags.b_acked[k]) n++;
        }
        window.S.flags.b_knows = n;
        if(n >= 3) triggerBloodFade();
      }
    }
  }
  try{ window.parent.postMessage({ type:'hit', spotId: wasNearby.id }, '*'); }catch(e){}
}

/* ==================== 光照 ==================== */
function computeAmbient(){
  const blood = isBloodMode();
  const cut = isPowerCut();
  const torch = isTorchOn();
  if(blood){
    if(cut) return torch ? [0.081, 0.027, 0.025] : [0.050, 0.016, 0.016];
    return torch ? [0.090, 0.031, 0.029] : [0.058, 0.020, 0.020];
  }
  if(cut) return torch ? [0.135, 0.108, 0.108] : [0.050, 0.041, 0.045];
  return torch ? [0.28, 0.26, 0.24] : [0.14, 0.15, 0.18];
}

function computeLights(){
  const blood = isBloodMode();
  const torch = isTorchOn();
  const cut = isPowerCut();
  const list = [];

  if(torch){
    let flick = blood
      ? 0.90 + 0.10*Math.sin(time*22) * (Math.random() > 0.85 ? 1.4 : 1)
      : 0.96 + 0.04*Math.sin(time*18);
    list.push({
      x: cam.x, y: cam.eye - 0.05, z: cam.z,
      color: blood
        ? [2.0*flick, 0.55*flick, 0.42*flick]
        : [2.4*flick, 2.1*flick, 1.75*flick]
    });
  }

  const sceneLights = (map && map.lights) || [];
  for(let i = 0; i < sceneLights.length && list.length < 3; i++){
    const l = sceneLights[i];
    if(cut && l.conditional !== false){
      const perLampPhase = Math.sin(time * 1.3 + i * 2.1) * 0.5 + 0.5;
      const localPulse = 0.55 + 0.45 * perLampPhase;
      const pulse = emgPulse * localPulse;
      const base = blood ? 1.22 : 0.99;
      const col = [base * pulse, 0.145 * pulse, 0.108 * pulse];
      list.push({ x: l.x, y: l.y || 2.0, z: l.z, color: col });
    } else {
      const base = (l.color || [0.6, 0.5, 0.4]).slice();
      let col;
      if(blood) col = [base[0]*0.68, base[1]*0.25, base[2]*0.20];
      else if(cut) col = [base[0]*0.50, base[1]*0.36, base[2]*0.36];
      else col = base;
      list.push({ x: l.x, y: l.y || 2.0, z: l.z, color: col });
    }
  }

  if(cut && list.length < 3){
    list.push({
      x: cam.x, y: 1.4, z: cam.z,
      color: blood ? [0.27, 0.09, 0.072] : [0.20, 0.144, 0.126]
    });
  }

  while(list.length < 3){
    list.push({ x: 0, y: -999, z: 0, color: [0, 0, 0] });
  }
  return list;
}

/* ==================== 渲染 ==================== */
function render(dt, t){
  if(!map) return;
  renderer.setAmbient(computeAmbient());
  renderer.setLights(computeLights());

  const blood = isBloodMode();
  const cut = isPowerCut();
  let fogColor;
  if(blood) fogColor = cut ? [0.020, 0.005, 0.007] : [0.023, 0.007, 0.009];
  else if(cut) fogColor = [0.032, 0.022, 0.018];
  else fogColor = [0.04, 0.05, 0.08];

  let fogNear, fogFar;
  if(blood){ fogNear = cut ? 1.5 : 2.2; fogFar = cut ? 7.0 : 8.8; }
  else if(cut){ fogNear = 1.8; fogFar = 8.2; }
  else { fogNear = 5; fogFar = 24; }

  renderer.setFog({ color: fogColor, near: fogNear, far: fogFar });

  let yaw = cam.yaw, pitch = cam.pitch;
  if(camDriftT > 0){
    const k = camDriftT / 0.7;
    yaw += camDriftYaw * k;
    pitch += camDriftPitch * k;
  }
  breathPhase += dt * 1.3;
  const breathY = Math.sin(breathPhase) * 0.012;
  let eyeY = cam.eye + breathY;
  let fov = Math.PI / 3.1;
  if(bloodFadeActive){
    const total = BLOOD_FADE_TOTAL;
    const elapsed = total - bloodFadeT;
    let k = 0;
    if(elapsed < 2.0) k = elapsed / 2.0;
    else k = 1.0;
    eyeY -= k * 0.35;
    fov = Math.PI / 3.1 + k * 0.25;
    pitch -= k * 0.12;
  }

  renderer.setCamera({
    x: cam.x, y: eyeY, z: cam.z,
    yaw: yaw, pitch: pitch,
    fov: fov, near: 0.06, far: 60
  });
  renderer.setBillboards([]);
  renderer.render();

  updateOverlayFilter();
  drawHorror(dt, t);
  applyShake(dt);
}

function updateOverlayFilter(){
  const blood = isBloodMode();
  const cut = isPowerCut();
  let f = 'none';
  if(blood){
    if(invertT > 0) f = 'invert(1) contrast(1.4)';
    else if(silenceT > 0) f = 'saturate(0.3) contrast(1.3) brightness(0.56)';
    else if(cut) f = 'saturate(0.65) contrast(1.22) brightness(0.79) hue-rotate(-10deg)';
    else f = 'saturate(0.7) contrast(1.17) brightness(0.83) hue-rotate(-10deg)';
  } else if(cut){
    f = 'saturate(0.9) contrast(1.10) brightness(0.81) hue-rotate(-6deg)';
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

/* ==================== 场景色调 ==================== */
const SCENE_GRADE = {
  alley: { r: 90, g: 30, b: 50, a: 0.10 },
  backstreet: { r: 100, g: 70, b: 25, a: 0.09 },
  shop: { r: 25, g: 60, b: 55, a: 0.10 },
  street: { r: 25, g: 45, b: 90, a: 0.10 },
  doorstep: { r: 80, g: 35, b: 25, a: 0.11 },
  house: { r: 80, g: 12, b: 18, a: 0.14 },
  powerstation: { r: 50, g: 50, b: 70, a: 0.10 },
  rooftop: { r: 35, g: 45, b: 80, a: 0.09 },
  underpass: { r: 40, g: 40, b: 55, a: 0.11 },
  riverside: { r: 25, g: 50, b: 75, a: 0.10 },
  neighbor: { r: 90, g: 20, b: 25, a: 0.14 }
};

function drawInnerFog(w, h, t){
  const flick = 0.85 + 0.15 * Math.sin(t * 0.7);
  fxCtx.save();
  fxCtx.globalCompositeOperation = 'lighter';
  const g1 = fxCtx.createRadialGradient(w * 0.08, h * 0.08, 0, w * 0.08, h * 0.08, w * 0.40);
  g1.addColorStop(0, 'rgba(80,95,120,' + (0.07 * flick) + ')');
  g1.addColorStop(0.6, 'rgba(70,85,110,' + (0.03 * flick) + ')');
  g1.addColorStop(1, 'rgba(60,75,100,0)');
  fxCtx.fillStyle = g1;
  fxCtx.fillRect(0, 0, w * 0.5, h * 0.5);
  const g2 = fxCtx.createRadialGradient(w * 0.92, h * 0.92, 0, w * 0.92, h * 0.92, w * 0.40);
  g2.addColorStop(0, 'rgba(75,85,105,' + (0.06 * flick) + ')');
  g2.addColorStop(1, 'rgba(65,75,95,0)');
  fxCtx.fillStyle = g2;
  fxCtx.fillRect(w * 0.5, h * 0.5, w * 0.5, h * 0.5);
  fxCtx.restore();
}

function drawSceneGrade(w, h){
  const grade = SCENE_GRADE[sceneKey];
  if(!grade) return;
  fxCtx.save();
  fxCtx.fillStyle = 'rgba(' + grade.r + ',' + grade.g + ',' + grade.b + ',' + grade.a + ')';
  fxCtx.fillRect(0, 0, w, h);
  fxCtx.restore();
}

function drawBreathVignette(w, h, t){
  const panic = getPanic();
  if(panic < 0.45) return;
  const breathK = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * (0.5 + panic * 0.35));
  const intensity = (panic - 0.45) / 0.55;
  const alpha = intensity * 0.30 * (0.35 + breathK * 0.65);
  const innerR = Math.min(w, h) * (0.34 + breathK * 0.06);
  const outerR = Math.max(w, h) * 0.80;
  const g = fxCtx.createRadialGradient(w/2, h/2, innerR, w/2, h/2, outerR);
  g.addColorStop(0, 'rgba(40,0,10,0)');
  g.addColorStop(0.5, 'rgba(40,0,10,' + (alpha * 0.35) + ')');
  g.addColorStop(1, 'rgba(20,0,6,' + alpha + ')');
  fxCtx.fillStyle = g;
  fxCtx.fillRect(0, 0, w, h);
}

function drawBloodSplats(w, h){
  if(!bloodSplats.length) return;
  fxCtx.save();
  for(let i = 0; i < bloodSplats.length; i++){
    const s = bloodSplats[i];
    const fade = 1 - s.life / s.lifeMax;
    const a = s.alpha * Math.min(1, fade * 1.6);
    if(a <= 0.01) continue;
    const sides = 9;
    fxCtx.beginPath();
    for(let j = 0; j <= sides; j++){
      const ang = (j / sides) * Math.PI * 2;
      const noise = Math.sin(s.seed + j * 2.13) * 0.28 + Math.cos(s.seed * 1.7 + j * 3.7) * 0.18;
      const rr = s.r * (0.85 + noise);
      const px = s.x + Math.cos(ang) * rr;
      const py = s.y + Math.sin(ang) * rr;
      if(j === 0) fxCtx.moveTo(px, py);
      else fxCtx.lineTo(px, py);
    }
    fxCtx.closePath();
    const g = fxCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    g.addColorStop(0, 'rgba(120,8,15,' + a + ')');
    g.addColorStop(0.45, 'rgba(80,3,8,' + (a * 0.85) + ')');
    g.addColorStop(0.8, 'rgba(50,0,5,' + (a * 0.4) + ')');
    g.addColorStop(1, 'rgba(30,0,2,0)');
    fxCtx.fillStyle = g;
    fxCtx.fill();
  }
  fxCtx.restore();
}

function drawLensRain(w, h){
  const sx = w / W, sy = h / H;
  fxCtx.save();
  fxCtx.scale(sx, sy);
  for(let i = 0; i < lensTrails.length; i++){
    const tr = lensTrails[i];
    const fade = 1 - tr.life / tr.lifeMax;
    const a = tr.alpha * fade;
    if(a <= 0.01) continue;
    const grad = fxCtx.createLinearGradient(tr.x, tr.y, tr.x, tr.y + tr.len);
    grad.addColorStop(0, 'rgba(180,210,240,' + (a * 0.4) + ')');
    grad.addColorStop(0.4, 'rgba(140,180,220,' + a + ')');
    grad.addColorStop(1, 'rgba(100,140,190,0)');
    fxCtx.fillStyle = grad;
    fxCtx.beginPath();
    fxCtx.ellipse(tr.x, tr.y + tr.len * 0.5, tr.w, tr.len * 0.5, 0, 0, Math.PI * 2);
    fxCtx.fill();
  }
  for(let i = 0; i < lensDrops.length; i++){
    const d = lensDrops[i];
    const a = d.alpha;
    fxCtx.fillStyle = 'rgba(20,30,40,' + (a * 0.35) + ')';
    fxCtx.beginPath();
    fxCtx.ellipse(d.x, d.y + d.r * 1.2, d.r * 0.9, d.r * 0.4, 0, 0, Math.PI * 2);
    fxCtx.fill();
    const g = fxCtx.createRadialGradient(d.x - d.r * 0.35, d.y - d.r * 0.4, 0, d.x, d.y, d.r * 1.05);
    g.addColorStop(0, 'rgba(240,248,255,' + (a * 0.85) + ')');
    g.addColorStop(0.5, 'rgba(160,195,230,' + (a * 0.55) + ')');
    g.addColorStop(0.85, 'rgba(90,130,170,' + (a * 0.35) + ')');
    g.addColorStop(1, 'rgba(40,70,100,' + (a * 0.15) + ')');
    fxCtx.fillStyle = g;
    fxCtx.beginPath();
    fxCtx.ellipse(d.x, d.y, d.r, d.r * 1.25, 0, 0, Math.PI * 2);
    fxCtx.fill();
    fxCtx.fillStyle = 'rgba(255,255,255,' + (a * 0.95) + ')';
    fxCtx.beginPath();
    fxCtx.arc(d.x - d.r * 0.42, d.y - d.r * 0.55, d.r * 0.26, 0, Math.PI * 2);
    fxCtx.fill();
    fxCtx.fillStyle = 'rgba(255,255,255,' + (a * 0.4) + ')';
    fxCtx.beginPath();
    fxCtx.arc(d.x + d.r * 0.35, d.y + d.r * 0.3, d.r * 0.12, 0, Math.PI * 2);
    fxCtx.fill();
  }
  fxCtx.restore();
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
  const cut = isPowerCut();

  updateLensRain(dt, t);
  updateBloodSplats(dt);

  drawSceneGrade(w, h);
  drawInnerFog(w, h, t);

  const innerR = Math.min(w, h) * (cut ? 0.07 : 0.09);
  const vg = fxCtx.createRadialGradient(w/2, h/2, innerR, w/2, h/2, Math.max(w,h)*0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.42, 'rgba(60,0,8,' + (cut ? 0.32 : 0.25) + ')');
  vg.addColorStop(1, 'rgba(4,0,1,' + (cut ? 0.92 : 0.86) + ')');
  fxCtx.fillStyle = vg;
  fxCtx.fillRect(0, 0, w, h);

  const heartFreq = 1.0 + 1.1 * panic;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * heartFreq);
  const pAlpha = 0.03 + 0.14 * pulse * (0.5 + 0.5*panic);
  const cg = fxCtx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.min(w,h)*0.65);
  cg.addColorStop(0, 'rgba(160,0,12,' + pAlpha + ')');
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  fxCtx.fillStyle = cg;
  fxCtx.fillRect(0, 0, w, h);

  drawBreathVignette(w, h, t);

  const baseN = (silent ? 520 : 260) + (cut ? 120 : 0);
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

  drawBloodSplats(w, h);
  if(silent){ fxCtx.fillStyle = 'rgba(0,0,0,0.24)'; fxCtx.fillRect(0,0,w,h); }
  if(nearby){ fxCtx.fillStyle = 'rgba(120,0,10,0.10)'; fxCtx.fillRect(0,0,w,h); }
  if(scareTime > 0){
    scareTime = Math.max(0, scareTime - dt);
    drawScare(w, h, scareTime / 0.55);
  }
  drawShadow(w, h);
  drawAckFlash(w, h);
  drawBloodFade(w, h);
  drawLensRain(w, h);
}

function drawShadow(w, h){
  if(shadowAlpha <= 0.005) return;
  if(!map || !map.shadow) return;
  const sh = map.shadow;
  const dx = sh.x - cam.x;
  const dz = sh.z - cam.z;
  const dist = Math.sqrt(dx*dx + dz*dz);
  const worldAngle = Math.atan2(dz, dx);
  const camAngle = Math.atan2(Math.sin(cam.yaw), Math.cos(cam.yaw));
  let diff = worldAngle - camAngle;
  while(diff >  Math.PI) diff -= Math.PI * 2;
  while(diff < -Math.PI) diff += Math.PI * 2;
  const xRatio = 0.5 + diff / Math.PI;
  const px = Math.max(w * 0.08, Math.min(w * 0.92, xRatio * w));
  const distK = Math.max(0, Math.min(1, (dist - 2) / 10));
  const py = h * (0.72 - distK * 0.10);
  const scale = 0.65 + (1 - distK) * 0.55;
  const bodyW = w * 0.052 * scale;
  const bodyH = h * 0.30 * scale;
  fxCtx.save();
  fxCtx.globalAlpha = shadowAlpha;
  fxCtx.fillStyle = 'rgba(2,0,0,0.94)';
  fxCtx.beginPath();
  fxCtx.arc(px, py - bodyH * 0.58, bodyW * 0.42, 0, Math.PI*2);
  fxCtx.fill();
  fxCtx.beginPath();
  fxCtx.moveTo(px - bodyW * 0.62, py + bodyH * 0.55);
  fxCtx.lineTo(px - bodyW * 0.42, py - bodyH * 0.30);
  fxCtx.lineTo(px + bodyW * 0.42, py - bodyH * 0.30);
  fxCtx.lineTo(px + bodyW * 0.62, py + bodyH * 0.55);
  fxCtx.closePath();
  fxCtx.fill();
  const gr = fxCtx.createRadialGradient(px, py, 0, px, py, bodyW * 4);
  gr.addColorStop(0, 'rgba(90,0,10,' + (shadowAlpha * 0.28) + ')');
  gr.addColorStop(0.5, 'rgba(60,0,8,' + (shadowAlpha * 0.12) + ')');
  gr.addColorStop(1, 'rgba(40,0,6,0)');
  fxCtx.fillStyle = gr;
  fxCtx.fillRect(px - bodyW * 4, py - bodyH * 1.6, bodyW * 8, bodyH * 3.6);
  fxCtx.restore();
}

function drawAckFlash(w, h){
  if(ackFlashAlpha <= 0.005) return;
  fxCtx.fillStyle = 'rgba(0,0,0,' + (ackFlashAlpha * 0.85) + ')';
  fxCtx.fillRect(0, 0, w, h);
  fxCtx.fillStyle = 'rgba(80,0,10,' + (ackFlashAlpha * 0.20) + ')';
  fxCtx.fillRect(0, 0, w, h);
}

function drawBloodFade(w, h){
  if(!bloodFadeActive) return;
  const total = BLOOD_FADE_TOTAL;
  const elapsed = total - bloodFadeT;
  let a = 0;
  if(elapsed < 1.6) a = elapsed / 1.6;
  else if(elapsed < 2.2) a = 1.0;
  else a = Math.max(0, 1 - (elapsed - 2.2) / (total - 2.2));
  if(a <= 0.005) return;
  fxCtx.save();
  fxCtx.globalAlpha = a;
  const g = fxCtx.createRadialGradient(w/2, h*0.6, 0, w/2, h*0.6, Math.max(w,h)*0.9);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  fxCtx.fillStyle = g;
  fxCtx.fillRect(0, 0, w, h);
  fxCtx.restore();
  fxCtx.fillStyle = 'rgba(0,0,0,' + a + ')';
  fxCtx.fillRect(0, 0, w, h);
  if(a > 0.85){
    fxCtx.save();
    fxCtx.globalAlpha = Math.min(1, (a - 0.85) / 0.15);
    fxCtx.fillStyle = 'rgba(180,60,60,0.85)';
    fxCtx.font = '500 15px "PingFang SC","Microsoft YaHei",sans-serif';
    fxCtx.textAlign = 'center';
    fxCtx.textBaseline = 'middle';
    fxCtx.letterSpacing = '8px';
    fxCtx.fillText('全 部 都 想 起 来 了', w/2, h/2);
    fxCtx.restore();
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
  overlayIcon.textContent = (typeof nearby.icon === 'function') ? (nearby.icon() || '❓') : (nearby.icon || '❓');
  overlayName.textContent = label;
  if(nearby.ack){
    overlayHint.textContent = isTouch ? '轻点承认它' : '按 E / 空格 承认它';
  } else {
    overlayHint.textContent = isTouch ? '轻点查看' : '按 E / 空格 查看';
  }
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

/* ==================== 焦点 ==================== */
function forceFocus(){
  try{ window.focus(); }catch(e){}
  try{ if(document.body) document.body.focus(); }catch(e){}
  try{
    if(window.parent && window.parent !== window){
      window.parent.focus();
      window.focus();
    }
  }catch(e){}
}

function startFocusKeeper(){
  if(focusCheckTimer) clearInterval(focusCheckTimer);
  focusCheckTimer = setInterval(function(){
    if(stopped) return;
    try{
      const active = document.activeElement;
      const inFrame = active && active.tagName !== 'IFRAME' && document.hasFocus();
      if(!inFrame){
        if(performance.now() - lastExternalFocus > 400){
          window.focus();
          if(document.body) document.body.focus();
        }
      }
    }catch(e){}
  }, 300);
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

  window.addEventListener('blur', function(){
    lastExternalFocus = performance.now();
  });
  document.addEventListener('visibilitychange', function(){
    if(document.hidden) lastExternalFocus = performance.now();
  });
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
        if(map) buildWorld();
        if(sceneKey) SceneMusic.setScene(sceneKey, isBloodMode());
      }
    }
    if(d.type === 'dlgClosed'){
      setTimeout(forceFocus, 20);
      setTimeout(forceFocus, 150);
      setTimeout(forceFocus, 500);
    }
    if(d.type === 'refocus'){ forceFocus(); }
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
  setTimeout(forceFocus, 100);
  setTimeout(forceFocus, 300);
  setTimeout(forceFocus, 800);
  setTimeout(forceFocus, 1500);
  window.addEventListener('click', forceFocus);
  startFocusKeeper();

  lastFrame = performance.now();
  requestAnimationFrame(loop);
}

window.Engine3D = { boot };
window.__engineStop = function(){
  stopped = true;
  try{
    if(focusCheckTimer) clearInterval(focusCheckTimer);
    if(canvas) canvas.style.visibility = 'hidden';
    if(fxCanvas) fxCanvas.style.display = 'none';
    if(viewport) viewport.style.transform = '';
    SceneMusic.stop(0.6);
  }catch(e){}
};
window.addEventListener('pagehide', () => { stopped = true; });
window.addEventListener('beforeunload', () => { stopped = true; });
})();