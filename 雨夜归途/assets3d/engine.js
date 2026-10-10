/* =========================================================
   engine.js — 真 3D 引擎（基于 r3d.js）
   ========================================================= */
(function(){
'use strict';

const W = 960, H = 540;

let viewport, canvas, renderer;
let sceneKey = null, map = null;

let stopped = false;
let lastFrame = performance.now();
let time = 0;

const cam = {
  x: 1.5, z: 9.5,
  yaw: -Math.PI / 2,
  pitch: 0,
  eye: 1.3
};

const keys = {};
let isTouch = false;
let mouseDrag = null;
let touchLook = null;
let touchMove = null;

let nearby = null;
const triggerTime = {};

const texCache = {};
const spriteTexCache = {};

const F = () => (window.S && window.S.flags) || {};
function isPowerCut(){ return !!F().powerCut; }
function isBloodMode(){ return !!F().bloodMode; }
function isTorchOn(){
  return isBloodMode() ? !!F().b_torchOn : !!F().torchOn;
}
function isDarkScene(){
  const f = F();
  return !!f.powerCut
      || (sceneKey === 'shop' && !f.lightsOn && !isBloodMode())
      || (sceneKey === 'powerstation' && f.powerCut);
}

/* ================= 纹理生成（canvas 作为源） ================= */
function makeWallTextureCanvas(spec){
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  const type = spec.type || 'brick';

  if(type === 'brick'){
    x.fillStyle = spec.base || '#2a1a1a'; x.fillRect(0,0,64,64);
    x.strokeStyle = spec.mortar || 'rgba(0,0,0,0.5)';
    x.lineWidth = 1.4;
    for(let row = 0; row < 8; row++){
      const yy = row * 8;
      x.beginPath(); x.moveTo(0, yy); x.lineTo(64, yy); x.stroke();
      const off = row % 2 ? 0 : 8;
      for(let xx = off; xx < 64; xx += 16){
        x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy + 8); x.stroke();
      }
    }
    x.fillStyle = spec.accent || 'rgba(255,255,255,0.05)';
    for(let i = 0; i < 60; i++) x.fillRect((i*19)%64, (i*23)%64, 2, 1);
    x.fillStyle = spec.stain || 'rgba(0,0,0,0.15)';
    for(let i = 0; i < 5; i++){
      x.beginPath();
      x.ellipse((i*27)%64, (i*37)%64, 5 + (i%3)*3, 4 + (i%2)*3, 0, 0, Math.PI*2);
      x.fill();
    }
  }
  else if(type === 'tile'){
    x.fillStyle = spec.base || '#c8d0d8'; x.fillRect(0,0,64,64);
    x.strokeStyle = spec.line || 'rgba(0,0,0,0.28)';
    x.lineWidth = 1;
    for(let i = 0; i <= 64; i += 16){
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke();
    }
    x.fillStyle = 'rgba(0,0,0,0.06)';
    for(let i = 0; i < 16; i++) x.fillRect((i*11)%64, (i*17)%64, 4, 2);
  }
  else if(type === 'wood'){
    x.fillStyle = spec.base || '#5a3a20'; x.fillRect(0,0,64,64);
    x.strokeStyle = spec.line || 'rgba(0,0,0,0.4)';
    x.lineWidth = 1;
    for(let i = 0; i <= 64; i += 16){
      x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke();
    }
    x.strokeStyle