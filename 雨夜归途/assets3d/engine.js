/* =========================================================
   engine.js — 真 3D 引擎（基于 r3d.js）
   精灵纹理走 dataURL → Image 异步路径（iOS 友好）
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
let lastDlgOpen = false;

const texCache = {};
const spriteTexCache = {};
const spritePendings = {};

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

/* ================= 墙壁纹理生成 ================= */
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
    x.strokeStyle = 'rgba(0,0,0,0.15)';
    for(let i = 0; i < 16; i++){
      const yy = (i*7)%64;
      x.beginPath();
      x.moveTo(0, yy);
      x.bezierCurveTo(20, yy + 1, 40, yy - 1, 64, yy + 0.5);
      x.stroke();
    }
  }
  else if(type === 'metal'){
    x.fillStyle = spec.base || '#3a4048'; x.fillRect(0,0,64,64);
    x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1;
    x.strokeRect(0.5, 0.5, 63, 63);
    x.beginPath(); x.moveTo(0, 32); x.lineTo(64, 32); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.2)';
    for(let i = 8; i < 64; i += 16)
      for(let j = 8; j < 64; j += 16){
        x.beginPath(); x.arc(i, j, 1.6, 0, Math.PI*2); x.fill();
      }
    x.strokeStyle = 'rgba(0,0,0,0.25)';
    for(let i = 0; i < 6; i++){
      x.beginPath();
      x.moveTo((i*13)%64, 0);
      x.lineTo((i*13+10)%64, 64);
      x.stroke();
    }
  }
  else if(type === 'burnt'){
    x.fillStyle = spec.base || '#120806'; x.fillRect(0,0,64,64);
    x.fillStyle = 'rgba(40,15,8,0.5)';
    for(let i = 0; i < 30; i++) x.fillRect((i*17)%64, (i*29)%64, 3 + (i%5), 2 + (i%3));
    x.fillStyle = 'rgba(0,0,0,0.6)';
    for(let i = 0; i < 20; i++){
      x.beginPath();
      x.ellipse((i*23)%64, (i*31)%64, 2 + (i%4), 2 + (i%3), 0, 0, Math.PI*2);
      x.fill();
    }
    x.fillStyle = 'rgba(120,50,20,0.15)';
    for(let i = 0; i < 12; i++) x.fillRect((i*11)%64, (i*7)%64, 1, 3);
  }
  else if(type === 'wetBrick'){
    x.fillStyle = spec.base || '#1a1018'; x.fillRect(0,0,64,64);
    x.strokeStyle = spec.mortar || 'rgba(0,0,0,0.6)';
    x.lineWidth = 1.4;
    for(let row = 0; row < 8; row++){
      const yy = row * 8;
      x.beginPath(); x.moveTo(0, yy); x.lineTo(64, yy); x.stroke();
      const off = row % 2 ? 0 : 8;
      for(let xx = off; xx < 64; xx += 16){
        x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx, yy + 8); x.stroke();
      }
    }
    x.fillStyle = 'rgba(120,160,200,0.08)';
    for(let i = 0; i < 20; i++){
      x.beginPath();
      x.ellipse((i*13)%64, (i*23)%64, 3 + (i%3), 1 + (i%2), 0, 0, Math.PI*2);
      x.fill();
    }
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

/* 精灵纹理：canvas → dataURL → Image → 上传。异步返回 null 直到就绪 */
function getSpriteTexture(icon){
  if(spriteTexCache[icon] !== undefined) return spriteTexCache[icon];
  if(spritePendings[icon]) return null;
  spritePendings[icon] = true;

  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.font = 'bold 96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(icon || '❓', 64, 64);

  const dataURL = c.toDataURL('image/png');
  const img = new Image();

  img.onload = function(){
    delete spritePendings[icon];
    try{
      spriteTexCache[icon] = renderer.textureFromCanvas(img, {});
    }catch(e){
      console.error('[3D] 精灵纹理创建失败:', icon, e.message);
      spriteTexCache[icon] = null;
    }
  };
  img.onerror = function(){
    delete spritePendings[icon];
    spriteTexCache[icon] = null;
    console.warn('[3D] 精灵图加载失败:', icon);
  };
  img.src = dataURL;

  return null;
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
  if(!map){
    console.error('[3D] 未知场景:', key);
    return;
  }

  const sp = map.spawn || { x: 1.5, y: 1.5, dir: 0 };
  cam.x = sp.x;
  cam.z = sp.y;
  cam.yaw = sp.dir || 0;
  cam.pitch = 0;

  nearby = null;
  for(const k in triggerTime) delete triggerTime[k];

  resize();
  buildWorld();
}

function buildWorld(){
  const wallH = 2.5;
  const wallTexSource = getWallTextureCanvas(
    map.wallTex || { type: 'brick' },
    sceneKey
  );

  renderer.buildWorld({
    grid: map.grid,
    wallHeight: wallH,
    wallTexSource: wallTexSource
  });
}

/* ================= 碰撞 ================= */
function isWall(cx, cy){
  if(!map) return true;
  const gy = Math.floor(cy);
  const gx = Math.floor(cx);
  if(gy < 0 || gy >= map.grid.length) return true;
  const row = map.grid[gy];
  if(gx < 0 || gx >= row.length) return true;
  return row[gx] === '1';
}
function canStand(x, z){
  const r = 0.22;
  if(isWall(x - r, z - r)) return false;
  if(isWall(x + r, z - r)) return false;
  if(isWall(x - r, z + r)) return false;
  if(isWall(x + r, z + r)) return false;
  return true;
}

/* ================= 更新 ================= */
function update(dt){
  if(!map) return;

  const rotSpeed = 2.4;
  if(keys['arrowleft'])  cam.yaw -= rotSpeed * dt;
  if(keys['arrowright']) cam.yaw += rotSpeed * dt;
  if(keys['arrowup'])    cam.pitch += rotSpeed * 0.6 * dt;
  if(keys['arrowdown'])  cam.pitch -= rotSpeed * 0.6 * dt;
  if(cam.pitch >  1.35) cam.pitch =  1.35;
  if(cam.pitch < -1.35) cam.pitch = -1.35;

  const speed = 2.6;
  let fwd = 0, str = 0;
  if(keys['w']) fwd += 1;
  if(keys['s']) fwd -= 1;
  if(keys['a']) str -= 1;
  if(keys['d']) str += 1;

  if(fwd !== 0 || str !== 0){
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    let dx = cy * fwd - sy * str;
    let dz = sy * fwd + cy * str;
    const len = Math.hypot(dx, dz) || 1;
    dx = dx / len * speed * dt;
    dz = dz / len * speed * dt;
    if(canStand(cam.x + dx, cam.z)) cam.x += dx;
    if(canStand(cam.x, cam.z + dz)) cam.z += dz;
  }

  if(touchMove){
    const dxs = touchMove.x - touchMove.sx;
    const dys = touchMove.y - touchMove.sy;
    const len = Math.hypot(dxs, dys);
    const dead = 8;
    if(len > dead){
      const mag = Math.min(1, (len - dead) / 60);
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
      const fwd2 = -dys / len * mag;
      const str2 =  dxs / len * mag;
      let dx = cy * fwd2 - sy * str2;
      let dz = sy * fwd2 + cy * str2;
      const l2 = Math.hypot(dx, dz) || 1;
      dx = dx / l2 * speed * dt;
      dz = dz / l2 * speed * dt;
      if(canStand(cam.x + dx, cam.z)) cam.x += dx;
      if(canStand(cam.x, cam.z + dz)) cam.z += dz;
    }
  }

  let dlgOpen = false;
  try{
    const pel = window.parent && window.parent.document.getElementById('dlg');
    if(pel && pel.classList.contains('show')) dlgOpen = true;
  }catch(e){}
  if(dlgOpen !== lastDlgOpen) lastDlgOpen = dlgOpen;

  let best = null, bestD = 2.0;
  if(!dlgOpen){
    for(let i = 0; i < map.things.length; i++){
      const th = map.things[i];
      if(th.decor) continue;
      if(th.cond && !th.cond()) continue;
      const lastAt = triggerTime[th.id] || 0;
      if(performance.now() - lastAt < 3000) continue;
      const dx = th.x - cam.x;
      const dz = th.y - cam.z;
      const d = Math.sqrt(dx*dx + dz*dz);
      if(d < bestD){ bestD = d; best = th; }
    }
  }
  if(best !== nearby){
    nearby = best;
    updateButton();
  }
}

function triggerNearby(){
  if(!nearby) return;
  const now = performance.now();
  if(now - (triggerTime[nearby.id] || 0) < 700) return;
  triggerTime[nearby.id] = now;
  try{
    window.parent.postMessage({ type:'hit', spotId: nearby.id }, '*');
  }catch(e){}
  nearby = null;
  updateButton();
}

/* ================= 光照计算 ================= */
function computeAmbient(){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const torch = isTorchOn();

  if(blood){
    return torch ? [0.42, 0.16, 0.14] : [0.16, 0.06, 0.07];
  }
  if(cut){
    return torch ? [0.36, 0.34, 0.30] : [0.10, 0.11, 0.15];
  }
  return torch ? [0.48, 0.44, 0.38] : [0.26, 0.26, 0.30];
}
function computeLight(){
  const blood = isBloodMode();
  const torch = isTorchOn();

  if(!torch){
    const a = isDarkScene() ? 0.4 : 1.0;
    return {
      x: cam.x + Math.cos(cam.yaw) * 3,
      y: cam.eye + 1.2,
      z: cam.z + Math.sin(cam.yaw) * 3,
      color: blood ? [0.55 * a, 0.20 * a, 0.18 * a] : [0.5 * a, 0.46 * a, 0.42 * a]
    };
  }
  return {
    x: cam.x,
    y: cam.eye - 0.05,
    z: cam.z,
    color: blood ? [1.5, 0.65, 0.55] : [1.6, 1.45, 1.2]
  };
}

/* ================= 渲染 ================= */
function render(dt, t){
  if(!map) return;

  renderer.setAmbient(computeAmbient());
  renderer.setLight(computeLight());

  const cut = isPowerCut();
  const blood = isBloodMode();
  let fogColor;
  if(blood) fogColor = [0.06, 0.02, 0.03];
  else if(cut) fogColor = [0.03, 0.04, 0.06];
  else fogColor = [0.05, 0.06, 0.09];

  renderer.setFog({
    color: fogColor,
    near: isDarkScene() ? 3 : 5,
    far:  isDarkScene() ? 12 : 20
  });

  renderer.setCamera({
    x: cam.x,
    y: cam.eye,
    z: cam.z,
    yaw: cam.yaw,
    pitch: cam.pitch,
    fov: Math.PI / 3.1,
    near: 0.06,
    far: 60
  });

  const list = [];
  for(let i = 0; i < map.things.length; i++){
    const th = map.things[i];
    if(th.cond && !th.cond()) continue;
    const icon = th.icon || '❓';
    const tex = getSpriteTexture(icon);
    if(!tex) continue;   /* 还在加载中的精灵跳过这一帧 */
    const h = (th.scale || 0.85) * 1.15;
    const w = h * 0.75;
    let baseY = 0;
    if(th.id === 'wires' || th.id === 'hang') baseY = 1.8;
    else if(th.id === 'lamp' || th.id === 'emergency') baseY = 0.6;
    else if(th.id.indexOf('Window') >= 0 || th.id === 'window') baseY = 0.9;
    else if(th.id === 'clock' || th.id === 'books') baseY = 1.0;
    else if(th.id === 'photo1' || th.id === 'photo2' || th.id === 'frame') baseY = 0.9;

    list.push({
      x: th.x, y: baseY, z: th.y,
      w: w, h: h,
      tex: tex,
      color: th.decor ? [0.85, 0.85, 0.9] : [1.0, 1.0, 1.0]
    });
  }
  renderer.setBillboards(list);

  renderer.render();
  updateOverlayFilter();
}

let lastFilterKey = '';
function updateOverlayFilter(){
  const blood = isBloodMode();
  const dark = isDarkScene() && !isTorchOn();
  let key = '';
  if(blood) key = 'blood';
  else if(dark) key = 'dark';
  if(key === lastFilterKey) return;
  lastFilterKey = key;

  if(key === 'blood'){
    canvas.style.filter = 'hue-rotate(-25deg) saturate(1.15) contrast(1.05) brightness(0.92)';
  } else if(key === 'dark'){
    canvas.style.filter = 'brightness(0.6) contrast(1.1)';
  } else {
    canvas.style.filter = 'none';
  }
}

/* ================= 互动按钮 ================= */
let overlayBtn, overlayIcon, overlayName, overlayHint;

function updateButton(){
  if(!overlayBtn) return;
  if(!nearby){
    overlayBtn.classList.remove('show');
    return;
  }
  const label = typeof nearby.label === 'function' ? nearby.label() : nearby.label;
  if(!label){
    overlayBtn.classList.remove('show');
    return;
  }
  overlayIcon.textContent = nearby.icon || '❓';
  overlayName.textContent = label;
  overlayHint.textContent = isTouch ? '轻点查看' : '点击 / 按 E 查看';
  overlayBtn.classList.add('show');
}

/* ================= 主循环 ================= */
function loop(now){
  if(stopped) return;
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  time += dt;

  update(dt);
  render(dt, time);
  requestAnimationFrame(loop);
}

/* ================= 尺寸 ================= */
function resize(){
  if(!viewport || !renderer) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  const cssW = Math.max(1, Math.round(W * scale));
  const cssH = Math.max(1, Math.round(H * scale));

  viewport.style.width  = cssW + 'px';
  viewport.style.height = cssH + 'px';
  viewport.style.left = Math.round((vw - cssW) / 2) + 'px';
  viewport.style.top  = Math.round((vh - cssH) / 2) + 'px';

  const dprLimit = isBloodMode() ? 1.35 : 1.5;
  const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);

  renderer.resize(cssW, cssH, dpr);
}

/* ================= 输入 ================= */
function bindKeys(){
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if(k === 'e' && nearby) triggerNearby();
    if(k.indexOf('arrow') === 0 || k === ' ') e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
  });
}

function bindPointer(){
  canvas.addEventListener('mousedown', e => {
    if(isTouch) return;
    mouseDrag = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if(!mouseDrag) return;
    const dx = e.clientX - mouseDrag.x;
    const dy = e.clientY - mouseDrag.y;
    mouseDrag.x = e.clientX;
    mouseDrag.y = e.clientY;
    cam.yaw += dx * 0.0032;
    cam.pitch -= dy * 0.0032;
    if(cam.pitch >  1.35) cam.pitch =  1.35;
    if(cam.pitch < -1.35) cam.pitch = -1.35;
  });
  window.addEventListener('mouseup', () => { mouseDrag = null; });

  canvas.addEventListener('touchstart', e => {
    if(!e.touches.length) return;
    e.preventDefault();
    isTouch = true;
    for(let i = 0; i < e.changedTouches.length; i++){
      const t0 = e.changedTouches[i];
      const x = t0.clientX, y = t0.clientY;
      const inLeftHalf = x < window.innerWidth * 0.5;
      if(inLeftHalf && !touchMove){
        touchMove = { id: t0.identifier, sx: x, sy: y, x: x, y: y };
      } else if(!touchLook){
        touchLook = { id: t0.identifier, lx: x, ly: y };
      }
    }
  }, {passive:false});

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for(let i = 0; i < e.changedTouches.length; i++){
      const t0 = e.changedTouches[i];
      if(touchMove && t0.identifier === touchMove.id){
        touchMove.x = t0.clientX;
        touchMove.y = t0.clientY;
      } else if(touchLook && t0.identifier === touchLook.id){
        const dx = t0.clientX - touchLook.lx;
        const dy = t0.clientY - touchLook.ly;
        touchLook.lx = t0.clientX;
        touchLook.ly = t0.clientY;
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
  canvas.addEventListener('touchcancel', () => {
    touchMove = null;
    touchLook = null;
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
        updateButton();
      }
    }
  });
  try{
    window.parent.postMessage({ type:'ready' }, '*');
  }catch(e){}
}

/* ================= 启动 ================= */
function boot(){
  viewport = document.getElementById('viewport');
  canvas = document.getElementById('cv');
  if(!canvas){ console.error('[3D] 缺少 #cv'); return; }

  try{
    renderer = R3D.create(canvas);
  }catch(e){
    console.error('[3D] WebGL 初始化失败:', e);
    var msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;inset:0;color:#fff;padding:40px;font-family:sans-serif;line-height:1.8;background:#0a0e14;z-index:9999;';
    msg.innerHTML = '<h2 style="color:#ff6a5a">WebGL 初始化失败</h2>' +
      '<p>' + (e && e.message ? e.message : '未知错误') + '</p>' +
      '<p style="color:#888;font-size:13px">请使用支持 WebGL 的浏览器，或回到设置切到 2D。</p>';
    document.body.appendChild(msg);
    return;
  }

  overlayBtn  = document.getElementById('interactBtn');
  overlayIcon = document.getElementById('ibIcon');
  overlayName = document.getElementById('ibName');
  overlayHint = document.getElementById('ibHint');

  if(overlayBtn){
    overlayBtn.addEventListener('click', e => {
      e.stopPropagation();
      triggerNearby();
    });
  }

  isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  const hint = document.getElementById('hint');
  if(hint){
    hint.textContent = isTouch
      ? '左侧拖动移动 · 右侧拖动看 · 靠近物件点按钮'
      : 'WASD / 方向键 移动 · 鼠标拖动看 · 靠近后点按钮或按 E';
    setTimeout(() => { hint.style.opacity = '0.25'; }, 8000);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  try{
    loadScene(getQueryScene());
  }catch(e){
    console.error('[3D] 场景加载失败:', e);
  }

  bindKeys();
  bindPointer();
  bindMessage();

  lastFrame = performance.now();
  requestAnimationFrame(loop);
}

window.Engine3D = { boot };
window.__engineStop = function(){
  stopped = true;
  try{
    if(canvas) canvas.style.visibility = 'hidden';
  }catch(e){}
};
window.addEventListener('pagehide', () => { stopped = true; });
window.addEventListener('beforeunload', () => { stopped = true; });
})();