 /* =========================================================
   engine.js — 3D 引擎（raycasting + 纹理 + 互动按钮）
   独立于 2D，只服务 3D 场景。
   ========================================================= */
(function(){
'use strict';

const W = 960, H = 540;
let cv = null, ctx = null;

let sceneKey = null;
let map = null;

let stopped = false;
let lastFrame = performance.now();
let time = 0;

const P = {
  x:1.5, y:1.5,
  dirX:1, dirY:0,
  planeX:0, planeY:0.66,
  keys:{},
  lastTrigger:{}
};

let rain = [], embers = [];
let tempTimer = 0;
const TEMP_TOTAL = 4.2;
let highlightTimer = 0;
let touchLook = null;

/* 靠近的物件（用于互动按钮） */
let nearby = null;

/* 互动按钮范围 */
const BUTTON = { x: 32, y: H - 132, w: 268, h: 80 };

/* 输入模式 */
let isTouch = false;

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

function rrect(c,x,y,w,h,r){
  c.beginPath();
  c.moveTo(x+r,y);
  c.arcTo(x+w,y,x+w,y+h,r);
  c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r);
  c.arcTo(x,y,x+w,y,r);
  c.closePath();
}
function rr(c,x,y,w,h,r,col){ rrect(c,x,y,w,h,r); c.fillStyle=col; c.fill(); }

/* ================= 纹理生成 ================= */
const texCache = {};

function makeTexture(spec){
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  const type = spec.type || 'brick';

  if(type === 'brick'){
    x.fillStyle = spec.base || '#2a1a1a';
    x.fillRect(0,0,64,64);
    x.strokeStyle = spec.mortar || 'rgba(0,0,0,0.5)';
    x.lineWidth = 1.4;
    const bw = 16, bh = 8;
    for(let row = 0; row < 8; row++){
      const yy = row * bh;
      x.beginPath(); x.moveTo(0, yy); x.lineTo(64, yy); x.stroke();
      const off = row % 2 ? 0 : bw / 2;
      for(let xx = off; xx < 64; xx += bw){
        x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy + bh); x.stroke();
      }
    }
    x.fillStyle = spec.accent || 'rgba(255,255,255,0.045)';
    for(let i = 0; i < 60; i++){
      x.fillRect((i*19)%64, (i*23)%64, 2, 1);
    }
    /* 水渍 / 污渍 */
    x.fillStyle = spec.stain || 'rgba(0,0,0,0.12)';
    for(let i = 0; i < 5; i++){
      const px = (i*27)%64, py = (i*37)%64;
      x.beginPath();
      x.ellipse(px, py, 5 + (i%3)*3, 4 + (i%2)*3, 0, 0, Math.PI*2);
      x.fill();
    }
  }
  else if(type === 'tile'){
    x.fillStyle = spec.base || '#dfe4ea';
    x.fillRect(0,0,64,64);
    x.strokeStyle = spec.line || 'rgba(0,0,0,0.25)';
    x.lineWidth = 1;
    for(let i = 0; i <= 64; i += 16){
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke();
      x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke();
    }
    x.fillStyle = spec.accent || 'rgba(255,255,255,0.15)';
    for(let i = 0; i < 8; i++){
      x.fillRect((i*8)%64 + 2, (i*13)%64 + 2, 5, 1);
    }
  }
  else if(type === 'wood'){
    x.fillStyle = spec.base || '#5a3a20';
    x.fillRect(0,0,64,64);
    x.strokeStyle = spec.line || 'rgba(0,0,0,0.35)';
    x.lineWidth = 1;
    for(let i = 0; i <= 64; i += 16){
      x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke();
    }
    x.strokeStyle = spec.grain || 'rgba(0,0,0,0.15)';
    for(let i = 0; i < 16; i++){
      const yy = (i*7)%64;
      x.beginPath();
      x.moveTo(0, yy);
      x.bezierCurveTo(20, yy + 1, 40, yy - 1, 64, yy + 0.5);
      x.stroke();
    }
    x.fillStyle = spec.accent || 'rgba(255,255,255,0.06)';
    for(let i = 0; i < 4; i++){
      x.fillRect(0, i*16 + 1, 64, 1);
    }
  }
  else if(type === 'metal'){
    x.fillStyle = spec.base || '#3a4048';
    x.fillRect(0,0,64,64);
    x.strokeStyle = spec.line || 'rgba(0,0,0,0.4)';
    x.lineWidth = 1;
    x.strokeRect(0.5, 0.5, 63, 63);
    x.beginPath(); x.moveTo(0, 32); x.lineTo(64, 32); x.stroke();
    x.fillStyle = spec.accent || 'rgba(255,255,255,0.18)';
    for(let i = 8; i < 64; i += 16){
      for(let j = 8; j < 64; j += 16){
        x.beginPath();
        x.arc(i, j, 1.5, 0, Math.PI*2);
        x.fill();
      }
    }
    x.strokeStyle = 'rgba(0,0,0,0.22)';
    for(let i = 0; i < 6; i++){
      x.beginPath();
      x.moveTo((i*13)%64, 0);
      x.lineTo((i*13+10)%64, 64);
      x.stroke();
    }
  }
  else if(type === 'burnt'){
    x.fillStyle = spec.base || '#120806';
    x.fillRect(0,0,64,64);
    x.fillStyle = 'rgba(40,15,8,0.5)';
    for(let i = 0; i < 30; i++){
      x.fillRect((i*17)%64, (i*29)%64, 3 + (i%5), 2 + (i%3));
    }
    x.fillStyle = 'rgba(0,0,0,0.6)';
    for(let i = 0; i < 20; i++){
      x.beginPath();
      x.ellipse((i*23)%64, (i*31)%64, 2 + (i%4), 2 + (i%3), 0, 0, Math.PI*2);
      x.fill();
    }
    x.fillStyle = 'rgba(120,50,20,0.15)';
    for(let i = 0; i < 12; i++){
      x.fillRect((i*11)%64, (i*7)%64, 1, 3);
    }
  }
  else if(type === 'wetBrick'){
    x.fillStyle = spec.base || '#1a1018';
    x.fillRect(0,0,64,64);
    x.strokeStyle = spec.mortar || 'rgba(0,0,0,0.6)';
    x.lineWidth = 1.4;
    const bw = 16, bh = 8;
    for(let row = 0; row < 8; row++){
      const yy = row * bh;
      x.beginPath(); x.moveTo(0, yy); x.lineTo(64, yy); x.stroke();
      const off = row % 2 ? 0 : bw / 2;
      for(let xx = off; xx < 64; xx += bw){
        x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy + bh); x.stroke();
      }
    }
    /* 湿痕反光 */
    x.fillStyle = 'rgba(120,160,200,0.08)';
    for(let i = 0; i < 20; i++){
      x.beginPath();
      x.ellipse((i*13)%64, (i*23)%64, 3 + (i%3), 1 + (i%2), 0, 0, Math.PI*2);
      x.fill();
    }
    x.fillStyle = 'rgba(0,0,0,0.3)';
    for(let i = 0; i < 8; i++){
      x.beginPath();
      x.ellipse((i*11)%64, (i*19)%64, 4, 2, 0, 0, Math.PI*2);
      x.fill();
    }
  }

  return c;
}

function getTex(spec, key){
  if(!spec) return null;
  const k = key + ':' + JSON.stringify(spec);
  if(texCache[k]) return texCache[k];
  const t = makeTexture(spec);
  texCache[k] = t;
  return t;
}

/* ================= 碰撞 ================= */
function isWall(x, y){
  if(!map) return true;
  if(y < 0 || y >= map.grid.length) return true;
  const row = map.grid[y];
  if(x < 0 || x >= row.length) return true;
  return row[x] === '1';
}
function canStand(x, y){
  const r = 0.22;
  if(isWall(Math.floor(x-r), Math.floor(y-r))) return false;
  if(isWall(Math.floor(x+r), Math.floor(y-r))) return false;
  if(isWall(Math.floor(x-r), Math.floor(y+r))) return false;
  if(isWall(Math.floor(x+r), Math.floor(y+r))) return false;
  return true;
}

/* ================= 场景加载 ================= */
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

  const sp = map.spawn;
  P.x = sp.x;
  P.y = sp.y;
  const d = sp.dir || 0;
  P.dirX = Math.cos(d);
  P.dirY = Math.sin(d);
  P.planeX = -Math.sin(d) * 0.66;
  P.planeY =  Math.cos(d) * 0.66;
  P.lastTrigger = {};
  nearby = null;

  rebuildRain();
  rebuildEmbers();
}

/* ================= 粒子 ================= */
function rebuildRain(){
  rain = [];
  for(let i = 0; i < 130; i++){
    rain.push({
      x: Math.random()*W*1.4 - 140,
      y: Math.random()*H,
      len: 12 + Math.random()*22,
      sp: 700 + Math.random()*560,
      a: 0.10 + Math.random()*0.14
    });
  }
}
function drawRain(dt){
  if(!rain.length) return;
  const blood = isBloodMode();
  ctx.save();
  ctx.strokeStyle = blood ? 'rgba(220,140,140,0.92)' : 'rgba(168,205,240,0.9)';
  ctx.lineWidth = blood ? 1.35 : 1;
  for(let i = 0; i < rain.length; i++){
    const d = rain[i];
    d.y += d.sp * dt;
    d.x -= d.sp * dt * 0.16;
    if(d.y > H+24){ d.y = -30 - Math.random()*140; d.x = Math.random()*W*1.4 - 140; }
    if(d.x < -70) d.x = W + 50;
    ctx.globalAlpha = d.a;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - d.len*0.16, d.y - d.len);
    ctx.stroke();
  }
  ctx.restore();
}

function rebuildEmbers(){
  embers = [];
  for(let i = 0; i < 50; i++){
    embers.push({
      x: Math.random()*W, y: Math.random()*H,
      vx: (Math.random()-.5)*12,
      vy: -10 - Math.random()*28,
      r: 0.6 + Math.random()*1.8,
      a: 0.18 + Math.random()*0.42,
      hue: Math.random() < 0.4 ? '#ff8040' : '#c04020'
    });
  }
}
function drawEmbers(dt){
  if(!isBloodMode() || !embers.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for(let i = 0; i < embers.length; i++){
    const e = embers[i];
    e.x += e.vx * dt; e.y += e.vy * dt;
    if(e.y < -10){ e.y = H + 10; e.x = Math.random()*W; }
    if(e.x < -10) e.x = W + 10;
    if(e.x > W + 10) e.x = -10;
    ctx.globalAlpha = e.a;
    ctx.fillStyle = e.hue;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

/* ================= 更新 ================= */
function update(dt){
  if(!map) return;

  const rotSpeed = 2.4;
  let rot = 0;
  const k = P.keys;
  if(k['arrowleft'])  rot -= rotSpeed * dt;
  if(k['arrowright']) rot += rotSpeed * dt;
  if(rot !== 0){
    const c = Math.cos(rot), s = Math.sin(rot);
    const odx = P.dirX;
    P.dirX = P.dirX * c - P.dirY * s;
    P.dirY = odx * s + P.dirY * c;
    const opx = P.planeX;
    P.planeX = P.planeX * c - P.planeY * s;
    P.planeY = opx * s + P.planeY * c;
  }

  const speed = 2.7;
  let mx = 0, my = 0;
  if(k['w'] || k['arrowup'])   { mx += P.dirX; my += P.dirY; }
  if(k['s'] || k['arrowdown']) { mx -= P.dirX; my -= P.dirY; }
  if(k['a']) { mx -= P.planeX / 0.66; my -= P.planeY / 0.66; }
  if(k['d']) { mx += P.planeX / 0.66; my += P.planeY / 0.66; }
  if(mx !== 0 || my !== 0){
    const len = Math.hypot(mx, my);
    mx = mx / len * speed * dt;
    my = my / len * speed * dt;
    if(canStand(P.x + mx, P.y)) P.x += mx;
    if(canStand(P.x, P.y + my)) P.y += my;
  }

  /* 找最近的可互动物件 */
  let best = null, bestD = 2.2;
  for(let i = 0; i < map.things.length; i++){
    const th = map.things[i];
    if(th.decor) continue;
    if(th.cond && !th.cond()) continue;
    const dx = th.x - P.x, dy = th.y - P.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    if(d < bestD){ bestD = d; best = th; }
  }
  nearby = best;
}

function triggerNearby(){
  if(!nearby) return;
  const now = performance.now();
  if(now - (P.lastTrigger[nearby.id] || 0) < 700) return;
  P.lastTrigger[nearby.id] = now;
  try{
    window.parent.postMessage({ type:'hit', spotId: nearby.id }, '*');
  }catch(e){}
}

/* ================= 精灵缓存 ================= */
function getSprite(th){
  if(th._sprite) return th._sprite;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 180;
  const cx = c.getContext('2d');
  cx.fillStyle = 'rgba(0,0,0,0.42)';
  cx.beginPath();
  cx.ellipse(64, 168, 38, 8, 0, 0, Math.PI*2);
  cx.fill();
  cx.font = 'bold 100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(th.icon || '❓', 64, 88);
  th._sprite = c;
  return c;
}

/* ================= 渲染 ================= */
function render(dt, t){
  if(!map) return;

  const blood = isBloodMode();
  const cut = isPowerCut();

  /* 天花板 */
  const ceil = ctx.createLinearGradient(0, 0, 0, H*0.5);
  ceil.addColorStop(0, (map.palette && map.palette.ceilA) || '#04060c');
  ceil.addColorStop(1, (map.palette && map.palette.ceilB) || '#0a1424');
  ctx.fillStyle = ceil;
  ctx.fillRect(0, 0, W, H*0.5);

  /* 地板 */
  const floor = ctx.createLinearGradient(0, H*0.5, 0, H);
  floor.addColorStop(0, (map.palette && map.palette.floorA) || '#0a1424');
  floor.addColorStop(1, (map.palette && map.palette.floorB) || '#02040a');
  ctx.fillStyle = floor;
  ctx.fillRect(0, H*0.5, W, H*0.5);

  /* 近处地板反光（雨夜感） */
  if(map.rain && !cut){
    const refl = ctx.createLinearGradient(0, H*0.6, 0, H);
    refl.addColorStop(0, 'rgba(120,170,220,0)');
    refl.addColorStop(1, 'rgba(120,170,220,0.06)');
    ctx.fillStyle = refl;
    ctx.fillRect(0, H*0.6, W, H*0.4);
  }

  /* 墙壁纹理 */
  const tex = getTex(map.wallTex, sceneKey + '_wall');
  const texW = tex ? tex.width : 0;
  const texH = tex ? tex.height : 0;

  const zBuf = new Float32Array(W);

  ctx.imageSmoothingEnabled = false;

  for(let x = 0; x < W; x++){
    const cameraX = 2 * x / W - 1;
    const rdx = P.dirX + P.planeX * cameraX;
    const rdy = P.dirY + P.planeY * cameraX;

    let mapX = Math.floor(P.x);
    let mapY = Math.floor(P.y);

    const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
    const ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);

    let stepX, stepY, sdx, sdy;
    if(rdx < 0){ stepX = -1; sdx = (P.x - mapX) * ddx; }
    else       { stepX =  1; sdx = (mapX + 1 - P.x) * ddx; }
    if(rdy < 0){ stepY = -1; sdy = (P.y - mapY) * ddy; }
    else       { stepY =  1; sdy = (mapY + 1 - P.y) * ddy; }

    let side = 0, hit = false, iter = 0;
    while(!hit && iter < 64){
      iter++;
      if(sdx < sdy){ sdx += ddx; mapX += stepX; side = 0; }
      else         { sdy += ddy; mapY += stepY; side = 1; }
      if(mapX < 0 || mapY < 0 || mapY >= map.grid.length ||
         mapX >= map.grid[0].length){ hit = true; break; }
      if(map.grid[mapY][mapX] === '1') hit = true;
    }

    const perpDist = side === 0
      ? (mapX - P.x + (1 - stepX) / 2) / rdx
      : (mapY - P.y + (1 - stepY) / 2) / rdy;
    zBuf[x] = perpDist;

    if(perpDist <= 0.05 || perpDist > 40) continue;

    const lineH = H / perpDist;
    const dStart = Math.max(0, Math.floor(H*0.5 - lineH*0.5));
    const dEnd = Math.min(H, Math.floor(H*0.5 + lineH*0.5));
    const colH = dEnd - dStart;
    if(colH <= 0) continue;

    /* 命中点在小格内的横向位置 */
    let wallX;
    if(side === 0) wallX = P.y + perpDist * rdy;
    else           wallX = P.x + perpDist * rdx;
    wallX -= Math.floor(wallX);

    if(tex){
      const tx = Math.min(texW - 1, Math.max(0, Math.floor(wallX * texW)));
      ctx.drawImage(tex, tx, 0, 1, texH, x, dStart, 1, colH);
    } else {
      const fog = Math.max(0.10, 1 - perpDist / 16);
      const hex = side === 0
        ? ((map.palette && map.palette.wallA) || '#2a3040')
        : ((map.palette && map.palette.wallB) || '#1e2636');
      const r = parseInt(hex.slice(1,3), 16) * fog;
      const g = parseInt(hex.slice(3,5), 16) * fog;
      const b = parseInt(hex.slice(5,7), 16) * fog;
      ctx.fillStyle = 'rgb(' + (r|0) + ',' + (g|0) + ',' + (b|0) + ')';
      ctx.fillRect(x, dStart, 1, colH);
    }

    /* 侧面 / 距离 / 断电暗化 */
    const fog = Math.max(0.10, 1 - perpDist / 16);
    let dark = 1 - fog;
    if(side === 1) dark = Math.min(1, dark + 0.32);
    if(cut)        dark = Math.min(1, dark + 0.38);
    if(blood)      dark = Math.min(1, dark + 0.08);
    if(dark > 0.01){
      ctx.fillStyle = 'rgba(0,0,0,' + dark.toFixed(3) + ')';
      ctx.fillRect(x, dStart, 1, colH);
    }
  }

  ctx.imageSmoothingEnabled = true;

  /* 物件（billboard） */
  const invDet = 1 / (P.planeX * P.dirY - P.dirX * P.planeY);
  const visible = [];
  for(let i = 0; i < map.things.length; i++){
    const th = map.things[i];
    if(th.cond && !th.cond()) continue;
    const relX = th.x - P.x;
    const relY = th.y - P.y;
    const tx = invDet * (P.dirY * relX - P.dirX * relY);
    const ty = invDet * (-P.planeY * relX + P.planeX * relY);
    if(ty > 0.15) visible.push({ th, tx, ty });
  }
  visible.sort((a, b) => b.ty - a.ty);

  const highlightOn = highlightTimer > 0;
  for(let i = 0; i < visible.length; i++){
    const v = visible[i];
    const sx = (W * 0.5) * (1 + v.tx / v.ty);
    const col = Math.floor(sx);
    if(col < 0 || col >= W) continue;
    if(v.ty >= zBuf[col]) continue;

    const scale = (v.th.scale || 0.85);
    const spriteH = Math.min(H * 0.92, (H / v.ty) * scale);
    const spriteW = spriteH * 0.71;
    const floorY = H * 0.5 + (H / v.ty) * 0.5;

    const sprite = getSprite(v.th);

    let alpha = 1;
    if(cut) alpha = 0.78;
    if(v.th.decor) alpha *= 0.9;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, sx - spriteW/2, floorY - spriteH, spriteW, spriteH);
    ctx.globalAlpha = 1;

    /* 高亮 */
    const dToPlayer = Math.sqrt((v.th.x-P.x)*(v.th.x-P.x) + (v.th.y-P.y)*(v.th.y-P.y));
    if(highlightOn && dToPlayer < 4 && !v.th.decor){
      const pulse = 0.5 + 0.5 * Math.sin(t * 7);
      const fade = Math.min(1, highlightTimer / 0.6);
      const glowR = spriteW * 0.8;
      const g = ctx.createRadialGradient(sx, floorY - spriteH*0.5, 0, sx, floorY - spriteH*0.5, glowR);
      g.addColorStop(0, 'rgba(127,240,176,' + (0.35*pulse*fade).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(127,240,176,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - glowR, floorY - spriteH*0.5 - glowR, glowR*2, glowR*2);

      ctx.save();
      ctx.strokeStyle = 'rgba(127,240,176,' + (0.85*fade).toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 26;
      rrect(ctx, sx - spriteW*0.55, floorY - spriteH*0.95, spriteW*1.1, spriteH*0.95, 8);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* 雨 / 余烬 */
  if(map.rain) drawRain(dt);
  drawEmbers(dt);

  /* 手电筒 / 黑暗 */
  if(isDarkScene()){
    const mx = W * 0.5;
    const my = H * 0.55;
    if(isTorchOn()){
      const R = isBloodMode() ? 145 : 290;
      const flick = 0.93 + 0.07 * Math.sin(t * 17) * (Math.random() > 0.85 ? 1.5 : 1);
      const dg = ctx.createRadialGradient(mx, my, 0, mx, my, R);
      dg.addColorStop(0,    'rgba(0,0,0,0)');
      dg.addColorStop(0.34, 'rgba(0,0,0,' + (0.04*flick).toFixed(3) + ')');
      dg.addColorStop(0.64, 'rgba(0,0,0,' + (0.34*flick).toFixed(3) + ')');
      dg.addColorStop(1,    'rgba(0,0,0,' + (0.88*flick).toFixed(3) + ')');
      ctx.fillStyle = dg;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const warm = ctx.createRadialGradient(mx, my, 0, mx, my, R*0.95);
      if(isBloodMode()){
        warm.addColorStop(0, 'rgba(255,220,180,' + (0.22*flick).toFixed(3) + ')');
        warm.addColorStop(0.5, 'rgba(255,190,140,' + (0.08*flick).toFixed(3) + ')');
        warm.addColorStop(1, 'rgba(200,80,60,0)');
      } else {
        warm.addColorStop(0, 'rgba(255,244,214,' + (0.24*flick).toFixed(3) + ')');
        warm.addColorStop(0.5, 'rgba(255,232,186,' + (0.09*flick).toFixed(3) + ')');
        warm.addColorStop(1, 'rgba(255,210,140,0)');
      }
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else {
      const base = tempTimer > 0 ? (0.18 * (tempTimer / TEMP_TOTAL)) : 0.55;
      ctx.fillStyle = 'rgba(0,0,0,' + base.toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  if(tempTimer > 0) tempTimer = Math.max(0, tempTimer - dt);

  /* 支线覆盖 */
  if(blood){
    ctx.fillStyle = 'rgba(60,8,12,0.28)';
    ctx.fillRect(0, 0, W, H);
    const pulse = 0.5 + 0.5*Math.sin(t * 1.7);
    ctx.fillStyle = 'rgba(70,0,8,' + (0.05 + 0.07*pulse).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.20, W/2, H/2, H*0.88);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.7, 'rgba(30,0,4,0.35)');
    vg.addColorStop(1, 'rgba(20,0,2,0.82)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  /* 暗角 */
  const vg2 = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.32,
                                       W/2, H/2, Math.max(W,H)*0.72);
  vg2.addColorStop(0, 'rgba(0,0,0,0)');
  vg2.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg2;
  ctx.fillRect(0, 0, W, H);

  /* 准星 */
  ctx.save();
  const cr = W*0.5, cc = H*0.5;
  ctx.strokeStyle = 'rgba(200,225,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cr, cc, 4, 0, Math.PI*2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cr - 9, cc); ctx.lineTo(cr - 5, cc);
  ctx.moveTo(cr + 5, cc); ctx.lineTo(cr + 9, cc);
  ctx.moveTo(cr, cc - 9); ctx.lineTo(cr, cc - 5);
  ctx.moveTo(cr, cc + 5); ctx.lineTo(cr, cc + 9);
  ctx.stroke();
  ctx.restore();

  /* 底部提示 */
  ctx.save();
  ctx.font = 'bold 12px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(140,170,200,0.42)';
  ctx.fillText(
    isTouch
      ? '拖动屏幕转动视角 · 走近物件后点击左下按钮'
      : 'WASD / 方向键 移动 · 走近物件后点击按钮或按 E',
    W * 0.5, H - 20
  );
  ctx.restore();

  /* 互动按钮 */
  drawNearbyButton(t);
}

function drawNearbyButton(t){
  if(!nearby) return;
  const label = typeof nearby.label === 'function' ? nearby.label() : nearby.label;
  if(!label) return;

  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
  const bx = BUTTON.x, by = BUTTON.y, bw = BUTTON.w, bh = BUTTON.h;

  /* 外光晕 */
  const glow = ctx.createRadialGradient(bx + bw/2, by + bh/2, 0, bx + bw/2, by + bh/2, bw*0.9);
  glow.addColorStop(0, 'rgba(255,214,140,' + (0.10 + 0.08*pulse).toFixed(3) + ')');
  glow.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(bx - 40, by - 40, bw + 80, bh + 80);

  /* 底 */
  const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
  bg.addColorStop(0, 'rgba(26,42,62,0.94)');
  bg.addColorStop(1, 'rgba(10,18,28,0.96)');
  ctx.fillStyle = bg;
  rrect(ctx, bx, by, bw, bh, 14);
  ctx.fill();

  /* 边 */
  ctx.strokeStyle = 'rgba(255,214,140,' + (0.55 + 0.35*pulse).toFixed(3) + ')';
  ctx.lineWidth = 2;
  rrect(ctx, bx, by, bw, bh, 14);
  ctx.stroke();

  /* 图标 */
  ctx.save();
  ctx.font = 'bold 40px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nearby.icon || '❓', bx + 44, by + bh / 2);
  ctx.restore();

  /* 名字 */
  ctx.save();
  ctx.font = 'bold 19px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,220,150,0.98)';
  ctx.fillText(label, bx + 82, by + 30);
  ctx.restore();

  /* 操作提示 */
  ctx.save();
  ctx.font = '13px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(180,210,240,0.72)';
  ctx.fillText(isTouch ? '轻点查看' : '点击 / 按 E 查看', bx + 82, by + 54);
  ctx.restore();
}

/* ================= 主循环 ================= */
function loop(now){
  if(stopped) return;
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  time += dt;

  if(highlightTimer > 0) highlightTimer = Math.max(0, highlightTimer - dt);

  update(dt);
  render(dt, time);
  requestAnimationFrame(loop);
}

/* ================= 尺寸 ================= */
function resize(){
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  const cssW = Math.round(W * scale);
  const cssH = Math.round(H * scale);
  cv.style.width  = cssW + 'px';
  cv.style.height = cssH + 'px';
  cv.style.left = Math.round((vw - cssW) / 2) + 'px';
  cv.style.top  = Math.round((vh - cssH) / 2) + 'px';

  const dprLimit = isBloodMode() ? 1.35 : 1.5;
  const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);
  cv.width  = Math.round(cssW * dpr);
  cv.height = Math.round(cssH * dpr);
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
}

/* ================= 输入 ================= */
function clientToCanvas(clientX, clientY){
  const r = cv.getBoundingClientRect();
  return {
    x: (clientX - r.left) * (W / r.width),
    y: (clientY - r.top) * (H / r.height)
  };
}
function isInButton(p){
  return p.x >= BUTTON.x && p.x <= BUTTON.x + BUTTON.w
      && p.y >= BUTTON.y && p.y <= BUTTON.y + BUTTON.h;
}

function bindKeys(){
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    P.keys[k] = true;
    if(k === 'e' && nearby){ triggerNearby(); }
    if(k.indexOf('arrow') === 0 || k === ' ') e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    P.keys[e.key.toLowerCase()] = false;
  });
}

function bindPointer(){
  /* 鼠标 */
  cv.addEventListener('click', e => {
    if(isTouch) return;
    const p = clientToCanvas(e.clientX, e.clientY);
    if(isInButton(p)){ triggerNearby(); }
  });

  /* 触屏 */
  let touchStart = null;
  let touchMoved = false;

  cv.addEventListener('touchstart', e => {
    if(!e.touches.length) return;
    e.preventDefault();
    isTouch = true;
    const t0 = e.touches[0];
    touchStart = { x: t0.clientX, y: t0.clientY };
    touchMoved = false;
    touchLook = { id: t0.identifier, lx: t0.clientX, ly: t0.clientY };
  }, {passive:false});

  cv.addEventListener('touchmove', e => {
    if(!touchLook) return;
    e.preventDefault();
    for(let i = 0; i < e.touches.length; i++){
      const t0 = e.touches[i];
      if(t0.identifier !== touchLook.id) continue;
      const dx = t0.clientX - touchLook.lx;
      const dy = t0.clientY - touchLook.ly;
      if(Math.abs(dx) > 3 || Math.abs(dy) > 3) touchMoved = true;
      touchLook.lx = t0.clientX;
      touchLook.ly = t0.clientY;

      const rot = dx * 0.006;
      const c = Math.cos(rot), s = Math.sin(rot);
      const odx = P.dirX;
      P.dirX = P.dirX * c - P.dirY * s;
      P.dirY = odx * s + P.dirY * c;
      const opx = P.planeX;
      P.planeX = P.planeX * c - P.planeY * s;
      P.planeY = opx * s + P.planeY * c;

      const move = -dy * 0.014;
      const nx = P.x + P.dirX * move;
      const ny = P.y + P.dirY * move;
      if(canStand(nx, P.y)) P.x = nx;
      if(canStand(P.x, ny)) P.y = ny;
      break;
    }
  }, {passive:false});

  cv.addEventListener('touchend', e => {
    e.preventDefault();
    if(touchLook){
      const t0 = e.changedTouches && e.changedTouches[0];
      /* 短促触摸 = 点击 */
      if(t0 && !touchMoved){
        const p = clientToCanvas(t0.clientX, t0.clientY);
        if(isInButton(p) && nearby){ triggerNearby(); }
      }
      let still = false;
      for(let i = 0; i < e.touches.length; i++){
        if(e.touches[i].identifier === touchLook.id) still = true;
      }
      if(!still) touchLook = null;
    }
    touchStart = null;
    touchMoved = false;
  }, {passive:false});

  cv.addEventListener('touchcancel', () => {
    touchLook = null;
    touchStart = null;
    touchMoved = false;
  });
}

/* ================= 消息 ================= */
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
      }
    }
    else if(d.type === 'setEnding'){ window.__ENDING__ = !!d.value; }
    else if(d.type === 'setHighlight'){ highlightTimer = d.duration || 5; }
    else if(d.type === 'tempLight'){
      if(isBloodMode()) return;
      tempTimer = TEMP_TOTAL;
    }
  });
  try{
    window.parent.postMessage({ type:'ready' }, '*');
  }catch(e){}
}

/* ================= 启动 ================= */
function boot(){
  cv = document.getElementById('cv');
  if(!cv){ console.error('[3d] 缺少 #cv'); return; }
  ctx = cv.getContext('2d', { alpha:false });

  isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  loadScene(getQueryScene());
  bindKeys();
  bindPointer();
  bindMessage();

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  lastFrame = performance.now();
  requestAnimationFrame(loop);
}

window.Engine3D = { boot };
window.__engineStop = function(){
  stopped = true;
  try{
    if(ctx) ctx.clearRect(0, 0, W, H);
    if(cv) cv.style.visibility = 'hidden';
  }catch(e){}
};
window.addEventListener('pagehide', () => { stopped = true; });
window.addEventListener('beforeunload', () => { stopped = true; });
})();