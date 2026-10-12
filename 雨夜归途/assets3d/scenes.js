/* =========================================================
   3D 场景定义 —— 暗夜模式专属 v4
   v3 基础 + 使用新几何体（sphere/cone/torus/arch/ramp/bevelBox）
   ========================================================= */
(function(){
'use strict';

const F = () => (window.S && window.S.flags) || {};

/* ==================== 辅助函数 ==================== */
function bloodSpots(cx, cz, count, spread, color){
  color = color || '#2a0404';
  const arr = [];
  for(let i = 0; i < count; i++){
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.9;
    const d = Math.random() * spread;
    arr.push({
      shape: 'low',
      x: cx + Math.cos(a) * d,
      y: 0.006 + Math.random() * 0.008,
      z: cz + Math.sin(a) * d,
      w: 0.12 + Math.random() * 0.32,
      h: 0.01,
      color: color
    });
  }
  arr.push({ shape:'low', x:cx, y:0.005, z:cz, w:0.5 + Math.random()*0.4, h:0.01, color:'#1a0202' });
  return arr;
}

function bloodTrail(x0, z0, x1, z1, count, color){
  color = color || '#1e0303';
  const arr = [];
  for(let i = 0; i < count; i++){
    const t = i / (count - 1);
    arr.push({
      shape: 'low',
      x: x0 + (x1 - x0) * t + (Math.random() - 0.5) * 0.2,
      y: 0.005,
      z: z0 + (z1 - z0) * t + (Math.random() - 0.5) * 0.2,
      w: 0.18 + Math.random() * 0.22,
      h: 0.01,
      color: color
    });
  }
  return arr;
}

function hangingMeat(wx, wy, wz, dir){
  const arr = [];
  const dh = 0.22;
  let dx = 0, dz = 0;
  if(dir === 'n') dz = -dh;
  if(dir === 's') dz =  dh;
  if(dir === 'e') dx =  dh;
  if(dir === 'w') dx = -dh;
  arr.push({ shape:'cyl', x:wx, y:wy + 0.5, z:wz, w:0.05, h:0.55, color:'#1a1410' });
  arr.push({ shape:'torus', x:wx, y:wy + 0.5, z:wz, w:0.1, r2:0.02, color:'#0e0a08' });
  arr.push({ shape:'bevelBox', x:wx + dx*0.3, y:wy, z:wz + dz*0.3, w:0.38, h:0.55, d:0.32, bevel:0.04, color:'#3a0606' });
  arr.push({ shape:'plate', x:wx + dx*0.5, y:wy + 0.15, z:wz + dz*0.5, w:0.06, h:0.3, color:'#180202' });
  arr.push({ shape:'low', x:wx, y:0.005, z:wz, w:0.35, h:0.01, color:'#1a0202' });
  return arr;
}

function wallHandprint(wx, wy, wz){
  const arr = [];
  arr.push({ shape:'plate', x:wx, y:wy, z:wz, w:0.22, h:0.28, color:'#3a0404' });
  const fingers = [[-0.09, 0.15],[-0.04, 0.19],[0.01, 0.20],[0.06, 0.18],[0.11, 0.13]];
  for(let i = 0; i < 5; i++){
    arr.push({
      shape:'plate',
      x: wx + fingers[i][0], y: wy + fingers[i][1], z: wz,
      w: 0.04, h: 0.12, color:'#2a0303'
    });
  }
  arr.push({ shape:'plate', x:wx, y:wy - 0.35, z:wz, w:0.06, h:0.6, color:'#1e0202' });
  return arr;
}

function hangingBags(wx, wy, wz, count){
  const arr = [];
  for(let i = 0; i < count; i++){
    const a = (i / count) * Math.PI * 2;
    arr.push({ shape:'cyl', x:wx + Math.cos(a)*0.15, y:wy, z:wz + Math.sin(a)*0.15, w:0.06, h:0.35, color:'#0a0606' });
    arr.push({ shape:'bevelBox', x:wx + Math.cos(a)*0.15, y:wy - 0.1, z:wz + Math.sin(a)*0.15, w:0.2, h:0.25, d:0.18, bevel:0.03, color:'#1a1210' });
  }
  return arr;
}

function burnMark(cx, cz, radius){
  const arr = [];
  arr.push({ shape:'low', x:cx, y:0.003, z:cz, w:radius*2, h:0.01, color:'#080404' });
  for(let i = 0; i < 8; i++){
    const a = (i / 8) * Math.PI * 2;
    arr.push({
      shape:'low',
      x: cx + Math.cos(a) * radius * 0.9,
      y: 0.004, z: cz + Math.sin(a) * radius * 0.9,
      w: 0.25 + Math.random()*0.25, h:0.01, color:'#1a0c08'
    });
  }
  return arr;
}

/* ★ 新辅助：一盏完整的精细路灯 */
function buildFullLamp(x, z){
  return [
    /* 底座 —— 三层 + 环形装饰 */
    { shape:'cyl',    x:x, y:0,    z:z, w:0.55, h:0.08, color:'#1a1814' },
    { shape:'torus',  x:x, y:0.06, z:z, w:0.5,  r2:0.035, color:'#2a2018' },
    { shape:'cyl',    x:x, y:0.1,  z:z, w:0.4,  h:0.08, color:'#161210' },
    { shape:'cyl',    x:x, y:0.18, z:z, w:0.28, h:0.06, color:'#1a1814' },
    /* 柱身 —— 渐细的三节 */
    { shape:'cyl',    x:x, y:0.24, z:z, w:0.18, h:2.3,  color:'#1e1a16' },
    /* 装饰环 —— 上/中/下 */
    { shape:'torus',  x:x, y:0.4,  z:z, w:0.22, r2:0.018, color:'#2a2018' },
    { shape:'torus',  x:x, y:1.4,  z:z, w:0.22, r2:0.018, color:'#2a2018' },
    { shape:'torus',  x:x, y:2.4,  z:z, w:0.22, r2:0.018, color:'#2a2018' },
    /* 灯罩底盘 */
    { shape:'cyl',    x:x, y:2.54, z:z, w:0.55, h:0.06, color:'#1a1814' },
    /* 灯罩 —— 圆锥 */
    { shape:'cone',   x:x, y:2.6,  z:z, w:0.6,  h:0.35, color:'#2a1d10' },
    /* 灯珠 —— 球 */
    { shape:'sphere', x:x, y:2.55, z:z, w:0.42, color:'#ffe0a0' },
    /* 顶盖 —— 小圆锥 */
    { shape:'cone',   x:x, y:2.95, z:z, w:0.65, h:0.08, color:'#1a0e08' },
    /* 顶杆 + 顶球 */
    { shape:'cyl',    x:x, y:3.03, z:z, w:0.08, h:0.15, color:'#1a1410' },
    { shape:'sphere', x:x, y:3.2,  z:z, w:0.12, color:'#2a1d10' }
  ];
}

/* ★ 新辅助：一个精细的木箱 */
function buildCrate(x, y, z, w, h, d, col){
  return [
    { shape:'bevelBox', x:x, y:y, z:z, w:w, h:h, d:d, bevel:Math.min(w,h,d)*0.08, color: col },
    /* 顶部盖板 */
    { shape:'box', x:x, y:y+h-0.02, z:z, w:w*1.02, h:0.03, d:d*1.02, color: '#2a2018' },
    /* 底边装饰 */
    { shape:'box', x:x, y:y+0.01, z:z, w:w*1.02, h:0.02, d:d*1.02, color: '#1a1208' },
    /* 正面凹槽 */
    { shape:'box', x:x, y:y+h*0.4, z:z+d/2+0.005, w:w*0.7, h:h*0.2, d:0.003, color: '#0a0604' }
  ];
}

/* ★ 新辅助：一个精细的垃圾桶 */
function buildFullTrashCan(x, z){
  return [
    { shape:'cyl',   x:x, y:0,    z:z, w:0.78, h:0.05, color:'#0e0a08' },
    { shape:'cyl',   x:x, y:0.05, z:z, w:0.7,  h:0.85, color:'#1a1612' },
    { shape:'torus', x:x, y:0.15, z:z, w:0.72, r2:0.02, color:'#0a0604' },
    { shape:'torus', x:x, y:0.55, z:z, w:0.72, r2:0.02, color:'#0a0604' },
    { shape:'cyl',   x:x, y:0.9,  z:z, w:0.78, h:0.06, color:'#0e0a08' },
    { shape:'cyl',   x:x, y:0.96, z:z, w:0.72, h:0.08, color:'#1a1410' },
    { shape:'sphere',x:x, y:1.05, z:z, w:0.1,  color:'#0e0a08' }
  ];
}

/* =========================================================
   场景定义
   ========================================================= */
window.__SCENES_3D__ = {

  /* =====================================================
     雨巷 —— 窄长巷子
     ===================================================== */
  alley: {
    wallTex: { type:'burnt', base:'#150c0a' },
    floorTex: { base: '#0a0607' },
    ceilTex: { base: '#050303' },
    spawn: { x:1.5, y:14.5, dir:-Math.PI/2 },
    rain: true,
    shadow: { x: 5.5, z: 18.0, h: 1.7 },
    lights: [
      { x:1.7, y:2.6, z:2.0,  color: [1.0, 0.35, 0.15] },
      { x:5.5, y:2.6, z:9.5,  color: [0.9, 0.30, 0.15] },
      { x:1.7, y:2.6, z:17.5, color: [0.85, 0.25, 0.12] }
    ],
    grid: [
      '111111111',
      '100000001','100000001','100000001','100000001','100000001',
      '100000001','100000001','100000001','100000001','100000001',
      '100000001','100000001','100000001','100000001','100000001',
      '100000001','100000001','100000001',
      '111111111'
    ],
    props: [
      /* --- 巷口路灯（完整） --- */
      ...buildFullLamp(1.9, 2.2),

      /* --- 中间路灯 --- */
      ...buildFullLamp(5.6, 9.5),

      /* --- 尽头路灯 --- */
      ...buildFullLamp(1.9, 17.8),

      /* --- 垃圾桶 × 2 --- */
      ...buildFullTrashCan(5.5, 6.5),
      ...buildFullTrashCan(5.5, 7.5),

      /* --- 木箱堆 --- */
      ...buildCrate(3.8, 0, 2.5, 0.9, 0.7, 0.9, '#1a1410'),
      ...buildCrate(4.6, 0, 2.6, 0.6, 0.5, 0.6, '#221a12'),

      /* --- 电线杆 --- */
      { shape:'cyl',    x:7.8, y:0,   z:3.0, w:0.2, h:5.5, color:'#1a1410' },
      { shape:'torus',  x:7.8, y:4.5, z:3.0, w:0.24, r2:0.03, color:'#0e0a08' },
      { shape:'box',    x:7.8, y:5.0, z:3.0, w:0.06, h:0.06, d:2.0, color:'#1a1410' },
      { shape:'box',    x:7.8, y:4.7, z:3.0, w:0.06, h:0.06, d:1.6, color:'#1a1410' },

      /* --- 消防栓 --- */
      { shape:'cyl',    x:1.4, y:0,    z:6.0, w:0.45, h:0.08, color:'#5a1510' },
      { shape:'cyl',    x:1.4, y:0.08, z:6.0, w:0.35, h:0.7,  color:'#8a2424' },
      { shape:'sphere', x:1.4, y:0.85, z:6.0, w:0.42, color:'#8a2424' },
      { shape:'cyl',    x:1.15, y:0.35, z:6.0, w:0.1, h:0.18, color:'#5a1510' },
      { shape:'cyl',    x:1.65, y:0.35, z:6.0, w:0.1, h:0.18, color:'#5a1510' },
      { shape:'sphere', x:1.4, y:1.05, z:6.0, w:0.15, color:'#5a1510' },

      /* --- 地面血迹 --- */
      ...bloodSpots(1.7, 3.5, 14, 0.9, '#2a0404'),
      ...bloodTrail(5.5, 6.5, 5.5, 9.5, 10, '#1e0303'),
      ...bloodSpots(1.7, 6.8, 8, 0.4, '#240303'),
      ...bloodSpots(7.5, 5.5, 12, 0.8, '#260303'),
      ...bloodSpots(7.5, 7.5, 12, 0.8, '#260303'),

      /* --- 墙壁手印 --- */
      ...wallHandprint(1.6, 1.5, 8.5),
      ...wallHandprint(1.6, 0.9, 9.5),
      ...wallHandprint(1.6, 1.3, 10.5),
      ...wallHandprint(7.4, 1.6, 11.5),
      ...wallHandprint(7.4, 1.0, 12.5),

      /* --- 小爪印 --- */
      { shape:'low', x:3.0, y:0.012, z:14.5, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:3.3, y:0.012, z:14.3, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:3.6, y:0.012, z:14.5, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:3.9, y:0.012, z:14.3, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:4.2, y:0.012, z:14.5, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:4.5, y:0.012, z:14.3, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:4.8, y:0.012, z:14.5, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:5.1, y:0.012, z:14.3, w:0.14, h:0.01, color:'#1a0808' },

      /* --- 墙上挂着的破布 --- */
      { shape:'plate', x:1.6, y:1.0, z:6.5, w:0.8, h:0.5, color:'#1c1614' },

      /* --- 悬挂物 --- */
      ...hangingMeat(7.3, 1.5, 5.5, 'w'),
      ...hangingMeat(7.3, 1.5, 7.5, 'w'),

      /* --- 巷尾的墙 --- */
      { shape:'plate', x:1.6, y:0.0, z:17.3, w:0.7, h:1.6, color:'#050303' },
      { shape:'plate', x:5.5, y:0.0, z:1.5,  w:1.6, h:2.2, color:'#12080a' },

      /* --- 酒瓶堆 --- */
      { shape:'cyl', x:4.5, y:0, z:11.5, w:0.06, h:0.3, color:'#2a1a10' },
      { shape:'cyl', x:4.7, y:0, z:11.6, w:0.06, h:0.28, color:'#2a1a10' },
      { shape:'cyl', x:4.3, y:0, z:11.7, w:0.06, h:0.32, color:'#2a1a10' },

      /* --- 地面小石头 --- */
      { shape:'sphere', x:6.2, y:0.02, z:12.5, w:0.08, color:'#2a2620' },
      { shape:'sphere', x:2.5, y:0.02, z:11.5, w:0.06, color:'#2a2620' },
      { shape:'sphere', x:6.8, y:0.02, z:8.5,  w:0.09, color:'#2a2620' }
    ],
    things: [
      { id:'lamp',      x:1.9, y:2.2,  icon:'🕯', label:'烧了一半的路灯', scale:0.9 },
      { id:'wires',     x:3.5, y:2.0,  icon:'⚡', label:'垂下的电线',     scale:0.7 },
      { id:'graffiti',  x:1.6, y:6.5,  icon:'🖍', label:'墙上那半句话',   scale:0.8 },
      { id:'trash',     x:5.5, y:6.5,  icon:'🔥', label:'烧过的垃圾桶',   scale:1.0 },
      { id:'photo1',    x:5.5, y:14.5, icon:'📄', label:'湿透的纸片',     scale:0.7,
        cond: () => !F().photo1Taken },
      { id:'puddle',    x:3.5, y:14.5, icon:'🩸', label:'水洼',           scale:0.6 },
      { id:'pawprints', x:4.3, y:14.4, icon:'🐾', label:'一串小爪印',     scale:0.6,
        ack: true, ackId: 'pawprints' },
      { id:'bloodExit', x:1.6, y:17.3, icon:'🚪', label:'墙根窄缝',       scale:0.8 },
      { id:'exit',      x:5.5, y:1.5,  icon:'➡',  label:'巷子深处',       scale:0.9 }
    ]
  },

  /* =====================================================
     后巷 —— 宽巷
     ===================================================== */
  backstreet: {
    wallTex: { type:'burnt', base:'#100806' },
    floorTex: { base: '#080505' },
    ceilTex: { base: '#040202' },
    spawn: { x:1.5, y:7.5, dir:0 },
    rain: true,
    shadow: { x: 4.5, z: 2.5, h: 1.7 },
    lights: [
      { x:4.5,  y:2.6, z:2.0,  color: [0.9, 0.35, 0.15] },
      { x:10.5, y:2.6, z:7.5,  color: [0.85, 0.30, 0.15] },
      { x:16.5, y:2.6, z:12.5, color: [0.8, 0.25, 0.12] }
    ],
    grid: [
      '11111111111111111111',
      '10000000000000000001','10000000000000000001','10000000000000000001',
      '10000000000000000001','10000000000000000001','10000000000000000001',
      '10000000000000000001','10000000000000000001','10000000000000000001',
      '10000000000000000001','10000000000000000001','10000000000000000001',
      '10000000000000000001','10000000000000000001',
      '11111111111111111111'
    ],
    props: [
      /* --- 消防梯（完整） --- */
      { shape:'box',   x:4.5, y:0,    z:1.6, w:2.4, h:0.1, d:0.2, color:'#0f0a08' },
      { shape:'cyl',   x:3.4, y:0,    z:1.7, w:0.12, h:2.5, color:'#0d0908' },
      { shape:'cyl',   x:5.6, y:0,    z:1.7, w:0.12, h:2.5, color:'#0d0908' },
      { shape:'cyl',   x:3.4, y:1.0,  z:1.7, w:0.14, h:0.04, color:'#1a1410' },
      { shape:'cyl',   x:5.6, y:1.0,  z:1.7, w:0.14, h:0.04, color:'#1a1410' },
      { shape:'cyl',   x:3.4, y:2.0,  z:1.7, w:0.14, h:0.04, color:'#1a1410' },
      { shape:'cyl',   x:5.6, y:2.0,  z:1.7, w:0.14, h:0.04, color:'#1a1410' },
      { shape:'cyl',   x:4.5, y:0.3,  z:1.6, w:0.05, h:2.0, color:'#2a1810' },
      ...hangingMeat(4.5, 1.8, 2.2, 's'),

      /* --- 纸箱堆（精细） --- */
      ...buildCrate(2.5, 0, 8.5, 0.9, 0.7, 0.9, '#100a06'),
      ...buildCrate(3.2, 0, 8.4, 0.6, 0.4, 0.6, '#0d0804'),
      ...buildCrate(2.0, 0, 9.2, 0.7, 0.5, 0.7, '#0e0805'),

      /* --- 后门 + 招牌 --- */
      { shape:'plate', x:13.4, y:0.0, z:7.5, w:1.3, h:2.2, color:'#050303' },
      { shape:'arch',  x:13.5, y:0.0, z:7.5, w:0.9, h:2.5, d:0.1, seg:16, color:'#2a1a12' },

      /* --- 配电房 --- */
      { shape:'plate', x:10.5, y:0.0, z:11.5, w:0.8, h:1.5, color:'#0d0a08' },

      /* --- 悬挂物 --- */
      ...hangingMeat(9.4, 1.6, 4.5, 'w'),
      ...hangingMeat(9.4, 1.6, 6.5, 'w'),
      ...hangingMeat(9.4, 1.6, 8.5, 'w'),

      /* --- 地面血迹 --- */
      ...bloodSpots(3.0, 9.5, 18, 1.2, '#2a0404'),
      ...bloodTrail(3.0, 9.5, 3.5, 5.0, 14, '#1e0303'),
      ...bloodSpots(3.5, 8.5, 10, 0.5, '#240303'),
      ...bloodSpots(12.5, 7.5, 14, 0.9, '#2a0404'),
      ...bloodSpots(9.5, 6.5, 20, 1.4, '#260303'),

      /* --- 墙壁手印 --- */
      ...wallHandprint(1.6, 1.5, 6.5),
      ...wallHandprint(1.6, 1.2, 8.5),
      ...wallHandprint(1.6, 0.9, 10.5),
      ...wallHandprint(1.6, 1.4, 12.5),
      ...wallHandprint(14.4, 1.5, 4.5),
      ...wallHandprint(14.4, 1.2, 6.5),

      /* --- 巷尾烧痕 --- */
      ...burnMark(16.5, 12.5, 1.2),

      /* --- 墙面小道具 --- */
      { shape:'cyl',    x:15.5, y:0, z:5.5, w:0.08, h:0.12, color:'#2a2018' },
      { shape:'cyl',    x:15.8, y:0, z:5.7, w:0.07, h:0.11, color:'#2a2018' },
      { shape:'cyl',    x:16.1, y:0, z:5.5, w:0.09, h:0.13, color:'#2a2018' },

      /* --- 木箱 --- */
      { shape:'low', x:3.5, y:0.005, z:8.5, w:1.0, h:0.06, color:'#1c0e08' },
      ...buildCrate(15.5, 0, 3.5, 0.6, 0.5, 0.6, '#1a1410')
    ],
    things: [
      { id:'stairs',    x:4.5,  y:1.7, icon:'🪢', label:'挂断绳的消防梯', scale:1.1 },
      { id:'mold',      x:9.5,  y:2.0, icon:'🟥', label:'墙上的红斑',     scale:0.8 },
      { id:'box',       x:2.5,  y:8.5, icon:'📦', label:'塌掉的纸箱',     scale:0.9 },
      { id:'cat',       x:3.5,  y:8.5, icon:'🩸', label:'一团灰烬',       scale:0.9,
        cond: () => !F().catGone },
      { id:'door',      x:13.5, y:7.5, icon:'🚪', label:'后门',           scale:1.1 },
      { id:'powerDoor', x:10.5, y:11.5, icon:'⚡', label:'配电房',         scale:0.9 },
      { id:'ropeEnd',   x:4.5,  y:2.3, icon:'🪢', label:'消防梯下的断绳', scale:0.7,
        ack: true, ackId: 'ropeEnd' },
      { id:'back',      x:1.5,  y:7.5, icon:'⬅',  label:'回到雨巷',       scale:0.8 }
    ]
  },

  /* =====================================================
     便利店
     ===================================================== */
  shop: {
    wallTex: { type:'burnt', base:'#130b0a' },
    floorTex: { base: '#0b0708' },
    ceilTex: { base: '#050404' },
    spawn: { x:2.5, y:7.5, dir:0 },
    shadow: { x: 1.7, z: 4.5, h: 1.7 },
    lights: [
      { x:4.5,  y:2.6, z:4.5,  color: [1.0, 0.55, 0.25] },
      { x:9.5,  y:2.6, z:9.5,  color: [0.9, 0.35, 0.18] },
      { x:13.0, y:2.6, z:5.5,  color: [0.85, 0.30, 0.15] }
    ],
    grid: [
      '111111111111111',
      '100000000000001','100000000000001','100000000000001','100000000000001',
      '100000000000001','100000000000001','100000000000001','100000000000001',
      '100000000000001','100000000000001','100000000000001',
      '111111111111111'
    ],
    props: [
      /* --- 货架 —— 多层结构 --- */
      { shape:'bevelBox', x:4.5, y:0,    z:5.5, w:4.0, h:1.8, d:0.6, bevel:0.1, color:'#100a08' },
      { shape:'box',      x:4.5, y:1.8,  z:5.5, w:4.2, h:0.1, d:0.7, color:'#0a0605' },
      /* 货架物品 —— 圆罐头 */
      { shape:'cyl',   x:3.5, y:0, z:4.8, w:0.2, h:0.25, color:'#1a0a0a' },
      { shape:'cyl',   x:4.3, y:0, z:4.6, w:0.2, h:0.25, color:'#1a0a0a' },
      { shape:'cyl',   x:5.1, y:0, z:4.9, w:0.2, h:0.25, color:'#1a0a0a' },
      { shape:'cyl',   x:5.8, y:0, z:4.7, w:0.2, h:0.25, color:'#1a0a0a' },
      { shape:'sphere',x:3.5, y:0.25, z:4.8, w:0.15, color:'#2a0a0a' },
      { shape:'sphere',x:4.3, y:0.25, z:4.6, w:0.15, color:'#2a0a0a' },

      /* --- 收银台（倒） --- */
      { shape:'bevelBox', x:11.5, y:0, z:7.5, w:1.4, h:1.0, d:0.9, bevel:0.08, color:'#0f0a0a' },
      { shape:'bevelBox', x:10.5, y:0, z:7.6, w:0.6, h:0.6, d:0.6, bevel:0.04, color:'#0a0606' },

      /* --- 收银机（乱） --- */
      { shape:'box',    x:11.5, y:1.0, z:7.4, w:0.6, h:0.4, d:0.4, color:'#050303' },
      { shape:'plate',  x:11.5, y:1.0, z:7.2, w:0.5, h:0.3, color:'#2a0a0a' },

      /* --- 后窗 --- */
      { shape:'plate', x:1.7, y:0.8, z:7.5, w:0.6, h:1.4, color:'#050408' },

      /* --- 地板脚印 --- */
      { shape:'low', x:3.5, y:0.012, z:8.5, w:0.15, h:0.01, color:'#1a0808' },
      { shape:'low', x:4.0, y:0.012, z:8.3, w:0.15, h:0.01, color:'#1a0808' },
      { shape:'low', x:4.5, y:0.012, z:8.5, w:0.15, h:0.01, color:'#1a0808' },
      { shape:'low', x:5.0, y:0.012, z:8.3, w:0.15, h:0.01, color:'#1a0808' },
      { shape:'low', x:5.5, y:0.012, z:8.5, w:0.15, h:0.01, color:'#1a0808' },
      { shape:'low', x:6.0, y:0.012, z:8.3, w:0.15, h:0.01, color:'#1a0808' },
      { shape:'low', x:6.5, y:0.012, z:8.5, w:0.15, h:0.01, color:'#1a0808' },
      { shape:'low', x:7.0, y:0.012, z:8.3, w:0.15, h:0.01, color:'#1a0808' },

      /* --- 地面血迹 --- */
      ...bloodTrail(11.5, 7.5, 2.5, 7.5, 18, '#240303'),
      ...bloodSpots(2.5, 7.5, 16, 1.1, '#2a0404'),

      /* --- 悬挂物 --- */
      ...hangingMeat(13.4, 1.5, 5.5, 'w'),
      ...hangingMeat(13.4, 1.5, 9.5, 'w'),

      /* --- 墙壁手印 --- */
      ...wallHandprint(1.6, 1.4, 4.5),
      ...wallHandprint(1.6, 1.0, 10.5),
      ...wallHandprint(13.4, 1.5, 11.5),
      ...wallHandprint(13.4, 1.2, 2.5),

      /* --- 海报 --- */
      { shape:'plate', x:7.5, y:1.4, z:1.7, w:0.8, h:1.0, color:'#1a1008' },
      ...hangingBags(9.5, 2.3, 3.5, 4),
      ...burnMark(8.5, 11.5, 0.9),

      /* --- 倒地的椅子 --- */
      { shape:'bevelBox', x:12.5, y:0.2, z:3.5, w:0.5, h:0.1, d:0.5, bevel:0.03, color:'#1a1410' },
      { shape:'cyl', x:12.5, y:0, z:3.5, w:0.08, h:0.2, color:'#0a0606' },
      { shape:'cyl', x:12.8, y:0, z:3.2, w:0.08, h:0.2, color:'#0a0606' },

      /* --- 地上散落硬币（用小盘模拟）--- */
      { shape:'low', x:10.5, y:0.008, z:8.5, w:0.08, h:0.006, color:'#3a2a10' },
      { shape:'low', x:10.8, y:0.008, z:8.7, w:0.07, h:0.006, color:'#3a2a10' },
      { shape:'low', x:11.1, y:0.008, z:8.4, w:0.08, h:0.006, color:'#3a2a10' }
    ],
    things: [
      { id:'poster',  x:7.5,  y:1.7, icon:'📜', label:'烧了一半的海报', scale:0.8 },
      { id:'counter', x:11.5, y:7.5, icon:'💳', label:'翻倒的收银台',   scale:1.0 },
      { id:'shelf',   x:4.5,  y:5.5, icon:'📚', label:'烧毁的货架',     scale:1.1 },
      { id:'floor',   x:7.5,  y:9.5, icon:'🐾', label:'地板上的脚印',   scale:0.7 },
      { id:'window',  x:1.7,  y:7.5, icon:'🪟', label:'后窗',           scale:0.8 },
      { id:'back',    x:2.5,  y:9.5, icon:'⬅',  label:'回到后巷',       scale:0.8 }
    ]
  },

  /* =====================================================
     街道 —— 长街
     ===================================================== */
  street: {
    wallTex: { type:'burnt', base:'#120c0a' },
    floorTex: { base: '#0a0806' },
    ceilTex: { base: '#040404' },
    spawn: { x:2.5, y:7.5, dir:0 },
    rain: true,
    shadow: { x: 15.5, z: 7.5, h: 1.7 },
    lights: [
      { x:5.5,  y:2.6, z:2.0,  color: [1.0, 0.4, 0.2] },
      { x:12.5, y:2.6, z:7.5,  color: [0.9, 0.35, 0.18] },
      { x:20.5, y:2.6, z:11.5, color: [0.85, 0.28, 0.14] }
    ],
    grid: [
      '1111111111111111111111',
      '1000000000000000000001','1000000000000000000001','1000000000000000000001',
      '1000000000000000000001','1000000000000000000001','1000000000000000000001',
      '1000000000000000000001','1000000000000000000001','1000000000000000000001',
      '1000000000000000000001','1000000000000000000001',
      '1111111111111111111111'
    ],
    props: [
      /* --- 街口路灯 --- */
      ...buildFullLamp(2.5, 2.0),

      /* --- 配电房（完整） --- */
      { shape:'bevelBox', x:4.5, y:0, z:2.0, w:0.9, h:1.8, d:0.6, bevel:0.05, color:'#0d0a08' },
      { shape:'plate',    x:4.5, y:1.4, z:1.65, w:0.5, h:0.2, color:'#3a0a0a' },
      { shape:'sphere',   x:4.9, y:1.0, z:1.68, w:0.08, color:'#d0a040' },

      /* --- 铁门 --- */
      { shape:'box', x:15.5, y:0, z:7.5, w:2.2, h:2.4, d:0.15, color:'#0d0a0a' },
      { shape:'plate', x:15.5, y:1.5, z:7.35, w:0.9, h:0.14, color:'#3a0a0a' },

      /* --- 铁门一侧的铁艺 --- */
      { shape:'cyl', x:14.3, y:0, z:7.5, w:0.08, h:2.4, color:'#1a1410' },
      { shape:'cyl', x:16.7, y:0, z:7.5, w:0.08, h:2.4, color:'#1a1410' },
      { shape:'cyl', x:14.3, y:2.4, z:7.5, w:0.1, h:0.05, color:'#1a1410' },
      { shape:'cyl', x:16.7, y:2.4, z:7.5, w:0.1, h:0.05, color:'#1a1410' },
      { shape:'box', x:15.5, y:2.4, z:7.5, w:2.5, h:0.06, d:0.06, color:'#1a1410' },

      /* --- 消防栓 --- */
      { shape:'cyl',    x:11.5, y:0, z:4.5, w:0.5, h:0.08, color:'#5a1510' },
      { shape:'cyl',    x:11.5, y:0.08, z:4.5, w:0.4, h:0.7, color:'#8a2424' },
      { shape:'sphere', x:11.5, y:0.85, z:4.5, w:0.42, color:'#8a2424' },
      { shape:'cyl',    x:11.2, y:0.35, z:4.5, w:0.1, h:0.18, color:'#5a1510' },
      { shape:'cyl',    x:11.8, y:0.35, z:4.5, w:0.1, h:0.18, color:'#5a1510' },
      { shape:'sphere', x:11.5, y:1.05, z:4.5, w:0.15, color:'#5a1510' },

      /* --- 信箱 --- */
      { shape:'cyl',    x:18.5, y:0,    z:3.5, w:0.08, h:0.9, color:'#1a1814' },
      { shape:'bevelBox', x:18.5, y:0.9, z:3.5, w:0.5, h:0.6, d:0.4, bevel:0.05, color:'#3a2a1a' },
      { shape:'box',    x:18.5, y:1.5, z:3.5, w:0.55, h:0.04, d:0.45, color:'#2a1e10' },

      /* --- 消防栓 --- */
      { shape:'cyl',    x:20.0, y:0,    z:11.5, w:0.4, h:0.08, color:'#5a1510' },
      { shape:'cyl',    x:20.0, y:0.08, z:11.5, w:0.3, h:0.5, color:'#8a2424' },
      { shape:'sphere', x:20.0, y:0.65, z:11.5, w:0.32, color:'#8a2424' },

      /* --- 树 --- */
      { shape:'cyl',    x:18.5, y:0, z:7.5, w:0.4, h:2.4, color:'#0a0604' },
      { shape:'cyl',    x:18.5, y:2.4, z:7.5, w:0.6, h:0.1, color:'#0a0604' },
      { shape:'sphere', x:18.5, y:3.0, z:7.5, w:2.2, color:'#1a2010' },
      { shape:'sphere', x:17.8, y:3.3, z:7.8, w:1.6, color:'#16200c' },
      { shape:'sphere', x:19.2, y:3.2, z:7.2, w:1.8, color:'#16200c' },

      /* --- 电线杆 × 2 --- */
      { shape:'cyl', x:5.5, y:0, z:6.5, w:0.15, h:5.5, color:'#1a1410' },
      { shape:'box', x:5.5, y:5.0, z:6.5, w:0.05, h:0.05, d:2.4, color:'#1a1410' },
      { shape:'box', x:5.5, y:4.7, z:6.5, w:0.05, h:0.05, d:1.8, color:'#1a1410' },
      { shape:'cyl', x:8.5, y:0, z:6.5, w:0.15, h:5.5, color:'#1a1410' },
      { shape:'box', x:8.5, y:5.0, z:6.5, w:0.05, h:0.05, d:2.4, color:'#1a1410' },

      /* --- 悬挂物 --- */
      ...hangingMeat(15.3, 1.8, 6.5, 'w'),
      ...hangingMeat(15.3, 1.8, 8.5, 'w'),
      ...hangingMeat(21.4, 1.6, 3.5, 'w'),
      ...hangingMeat(21.4, 1.6, 5.5, 'w'),
      ...hangingMeat(21.4, 1.6, 9.5, 'w'),
      ...hangingMeat(21.4, 1.6, 11.5, 'w'),

      /* --- 地面血迹 --- */
      ...bloodSpots(8.5, 7.5, 22, 1.8, '#2a0404'),
      ...bloodTrail(8.5, 7.5, 15.5, 7.5, 20, '#1e0303'),
      ...bloodSpots(3.5, 10.5, 12, 1.0, '#260303'),
      ...bloodSpots(13.5, 3.5, 14, 1.2, '#240303'),
      ...bloodSpots(18.5, 7.5, 12, 1.0, '#260303'),

      /* --- 墙壁手印 --- */
      ...wallHandprint(1.6, 1.5, 4.5),
      ...wallHandprint(1.6, 1.0, 9.5),
      ...wallHandprint(21.4, 1.5, 6.5),
      ...wallHandprint(21.4, 1.2, 8.5),
      ...wallHandprint(21.4, 1.5, 7.5),

      /* --- 烧痕 --- */
      ...burnMark(5.5, 11.5, 1.1),
      ...burnMark(16.5, 11.5, 0.9),

      /* --- 自行车 --- */
      { shape:'torus', x:10.5, y:0.02, z:10.5, w:0.7, r2:0.04, color:'#1a1814' },
      { shape:'torus', x:11.5, y:0.02, z:10.5, w:0.7, r2:0.04, color:'#1a1814' },
      { shape:'box',   x:11.0, y:0.35, z:10.5, w:1.2, h:0.06, d:0.06, color:'#2a2018' },
      { shape:'box',   x:11.0, y:0.55, z:10.5, w:0.05, h:0.4, d:0.4, color:'#2a2018' },

      /* --- 长椅 --- */
      { shape:'bevelBox', x:7.5, y:0.5, z:3.0, w:2.0, h:0.08, d:0.6, bevel:0.03, color:'#3a2a1a' },
      { shape:'box',      x:6.7, y:0, z:3.0, w:0.08, h:0.5, d:0.5, color:'#1a1410' },
      { shape:'box',      x:8.3, y:0, z:3.0, w:0.08, h:0.5, d:0.5, color:'#1a1410' },
      { shape:'bevelBox', x:7.5, y:0.5, z:3.35, w:2.0, h:0.6, d:0.08, bevel:0.03, color:'#3a2a1a' }
    ],
    things: [
      { id:'lamp',    x:2.5,  y:2.0, icon:'🕯', label:'烧断的路灯',     scale:0.9 },
      { id:'power',   x:4.5,  y:2.0, icon:'⚡', label:'配电房',         scale:1.0 },
      { id:'under',   x:7.5,  y:2.0, icon:'⬇',  label:'地下通道',       scale:0.9 },
      { id:'river',   x:1.7,  y:7.5, icon:'🌊', label:'河堤',           scale:0.9 },
      { id:'rope',    x:7.5,  y:6.5, icon:'🧵', label:'晾衣绳',         scale:0.7 },
      { id:'gate',    x:15.5, y:7.5, icon:'📜', label:'贴着封条的铁门', scale:1.2 },
      { id:'tree',    x:18.5, y:3.5, icon:'🌳', label:'烧焦的梧桐',     scale:1.1 },
      { id:'mailbox', x:18.5, y:10.5, icon:'📮', label:'信箱',           scale:0.8 },
      { id:'fire',    x:20.0, y:11.5, icon:'🧯', label:'消防栓',         scale:0.7 },
      { id:'back',    x:1.5,  y:7.5, icon:'⬅',  label:'回后巷',         scale:0.8 }
    ]
  },

  /* =====================================================
     门前
     ===================================================== */
  doorstep: {
    wallTex: { type:'burnt', base:'#150d0a' },
    floorTex: { base: '#0a0605' },
    ceilTex: { base: '#040202' },
    spawn: { x:2.5, y:11.5, dir:0 },
    shadow: { x: 8.5, z: 10.5, h: 1.7 },
    lights: [
      { x:8.5, y:2.6, z:2.0,   color: [1.0, 0.4, 0.15] },
      { x:5.5, y:2.6, z:5.5,   color: [0.85, 0.30, 0.14] },
      { x:8.5, y:2.6, z:10.5,  color: [0.8, 0.25, 0.12] }
    ],
    grid: [
      '111111111111111',
      '100000000000001','100000000000001','100000000000001','100000000000001',
      '100000000000001','100000000000001','100000000000001','100000000000001',
      '100000000000001','100000000000001','100000000000001',
      '111111111111111'
    ],
    props: [
      /* --- 房子正面 --- */
      { shape:'plate', x:5.5, y:1.4, z:2.0, w:1.2, h:1.2, color:'#050304' },
      { shape:'bevelBox', x:5.5, y:0, z:3.0, w:1.4, h:0.4, d:0.5, bevel:0.05, color:'#0a0605' },

      /* --- 门（完整） --- */
      { shape:'plate', x:8.5, y:0.0, z:5.5, w:1.2, h:2.0, color:'#0a0605' },
      { shape:'arch',  x:8.5, y:0.0, z:5.5, w:1.0, h:2.3, d:0.1, seg:16, color:'#3a2218' },

      /* --- 台阶 × 3 --- */
      { shape:'bevelBox', x:8.5, y:0,    z:10.5, w:2.2, h:0.14, d:0.6, bevel:0.04, color:'#0d0908' },
      { shape:'bevelBox', x:8.5, y:0.14, z:9.8,  w:1.8, h:0.14, d:0.6, bevel:0.04, color:'#0f0a08' },
      { shape:'bevelBox', x:8.5, y:0.28, z:9.1,  w:1.4, h:0.14, d:0.6, bevel:0.04, color:'#100b08' },

      /* --- 台阶上的爪印 --- */
      { shape:'low', x:8.2, y:0.30, z:8.8, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:8.6, y:0.30, z:8.6, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:8.9, y:0.16, z:9.4, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:8.5, y:0.16, z:9.2, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:8.2, y:0.02, z:10.2, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:8.6, y:0.02, z:10.0, w:0.14, h:0.01, color:'#1a0808' },

      /* --- 门灯 × 2 --- */
      { shape:'cyl',    x:7.0, y:2.4, z:2.05, w:0.05, h:0.3, color:'#1a1410' },
      { shape:'cone',   x:7.0, y:2.25, z:2.15, w:0.32, h:0.2, color:'#1a1410' },
      { shape:'sphere', x:7.0, y:2.2, z:2.15, w:0.22, color:'#ffd27a' },
      { shape:'cyl',    x:10.0, y:2.4, z:2.05, w:0.05, h:0.3, color:'#1a1410' },
      { shape:'cone',   x:10.0, y:2.25, z:2.15, w:0.32, h:0.2, color:'#1a1410' },
      { shape:'sphere', x:10.0, y:2.2, z:2.15, w:0.22, color:'#ffd27a' },

      /* --- 地面血迹 --- */
      ...bloodSpots(8.5, 11.5, 16, 1.2, '#2a0404'),
      ...bloodTrail(8.5, 11.5, 8.5, 7.5, 12, '#1e0303'),

      /* --- 悬挂物 --- */
      ...hangingMeat(4.5, 1.6, 2.5, 's'),
      ...hangingMeat(6.5, 1.6, 2.5, 's'),
      ...hangingMeat(10.5, 1.6, 2.5, 's'),

      /* --- 墙壁手印 --- */
      ...wallHandprint(2.0, 1.5, 5.5),
      ...wallHandprint(13.4, 1.4, 5.5),
      ...wallHandprint(13.4, 1.0, 8.5),

      /* --- 花盆 --- */
      { shape:'cone',   x:12.5, y:0, z:3.5, w:0.5, h:0.5, color:'#0a0605' },
      { shape:'sphere', x:12.5, y:0.6, z:3.5, w:0.4, color:'#2a3018' },
      { shape:'sphere', x:12.5, y:0.75, z:3.5, w:0.25, color:'#3a4020' },

      /* --- 井盖 --- */
      { shape:'cyl', x:11.5, y:0.008, z:8.5, w:0.7, h:0.02, color:'#0a0606' },
      { shape:'torus', x:11.5, y:0.02, z:8.5, w:0.65, r2:0.04, color:'#1a1410' }
    ],
    things: [
      { id:'window', x:5.5,  y:2.0,  icon:'🪟', label:'烧穿的窗户',     scale:1.0 },
      { id:'lamp',   x:8.5,  y:2.0,  icon:'🕯', label:'烧化的门灯',     scale:0.7 },
      { id:'door',   x:8.5,  y:5.5,  icon:'🚪', label:'门',             scale:1.2 },
      { id:'steps',  x:8.5,  y:10.5, icon:'🐾', label:'台阶上的脚印',   scale:0.6 },
      { id:'back',   x:2.5,  y:7.5,  icon:'⬅',  label:'回到街道',       scale:0.8 }
    ]
  },

  /* =====================================================
     红屋顶
     ===================================================== */
  house: {
    wallTex: { type:'burnt', base:'#100806' },
    floorTex: { base: '#0c0604' },
    ceilTex: { base: '#030202' },
    spawn: { x:7.5, y:7.5, dir:Math.PI },
    shadow: { x: 3.5, z: 2.0, h: 1.7 },
    lights: [
      { x:3.5,  y:2.6, z:2.5,  color: [1.0, 0.5, 0.25] },
      { x:7.5,  y:2.6, z:7.5,  color: [0.95, 0.40, 0.20] },
      { x:12.5, y:2.6, z:11.5, color: [0.85, 0.30, 0.15] }
    ],
    grid: [
      '111111111111111',
      '100000000000001','100000000000001','100000000000001','100000000000001',
      '100000000000001','100000000000001','100000000000001','100000000000001',
      '100000000000001','100000000000001','100000000000001',
      '111111111111111'
    ],
    props: [
      /* --- 窗户 --- */
      { shape:'plate', x:3.5, y:1.4, z:2.0, w:1.2, h:1.2, color:'#040204' },
      { shape:'plate', x:7.5, y:1.6, z:2.0, w:0.5, h:0.5, color:'#100a06' },

      /* --- 书架（精细） --- */
      { shape:'bevelBox', x:2.0, y:0, z:6.5, w:0.5, h:2.0, d:1.2, bevel:0.04, color:'#0a0605' },
      { shape:'box',      x:2.0, y:0.6, z:6.5, w:0.55, h:0.04, d:1.25, color:'#1a1208' },
      { shape:'box',      x:2.0, y:1.2, z:6.5, w:0.55, h:0.04, d:1.25, color:'#1a1208' },
      { shape:'box',      x:2.0, y:1.8, z:6.5, w:0.55, h:0.04, d:1.25, color:'#1a1208' },

      /* --- 台灯（精细） --- */
      { shape:'cyl',    x:12.5, y:0,    z:4.5, w:0.35, h:0.5, color:'#0a0605' },
      { shape:'cyl',    x:12.5, y:0.5,  z:4.5, w:0.12, h:0.8, color:'#0a0605' },
      { shape:'cone',   x:12.5, y:1.3,  z:4.5, w:0.7, h:0.5, color:'#1a1208' },
      { shape:'sphere', x:12.5, y:1.5,  z:4.5, w:0.35, color:'#3a2010' },

      /* --- 相框 --- */
      { shape:'box', x:7.5, y:0.9, z:11.5, w:0.8, h:0.6, d:0.05, color:'#100a06' },
      { shape:'box', x:7.5, y:0.9, z:11.52, w:0.7, h:0.5, d:0.02, color:'#1a1208' },

      /* --- 摇椅（精细） --- */
      { shape:'bevelBox', x:3.5, y:0,    z:9.5, w:0.9, h:0.15, d:1.1, bevel:0.04, color:'#0a0605' },
      { shape:'bevelBox', x:3.5, y:0.15, z:10.0, w:0.9, h:0.6, d:0.15, bevel:0.04, color:'#0a0605' },
      { shape:'cyl',      x:3.0, y:0.15, z:9.0, w:0.06, h:0.6, color:'#0a0605' },
      { shape:'cyl',      x:4.0, y:0.15, z:9.0, w:0.06, h:0.6, color:'#0a0605' },

      /* --- 小碗（精细） --- */
      { shape:'cone',   x:4.5, y:0.02, z:11.5, w:0.35, h:0.12, color:'#1a0a08' },
      { shape:'torus',  x:4.5, y:0.12, z:11.5, w:0.32, r2:0.025, color:'#2a1a10' },

      /* --- 桌子 --- */
      { shape:'bevelBox', x:7.5, y:0.5, z:5.0, w:1.8, h:0.1, d:0.7, bevel:0.05, color:'#1a1008' },
      { shape:'cyl', x:6.8, y:0, z:4.7, w:0.1, h:0.5, color:'#0a0605' },
      { shape:'cyl', x:8.2, y:0, z:4.7, w:0.1, h:0.5, color:'#0a0605' },
      { shape:'cyl', x:6.8, y:0, z:5.3, w:0.1, h:0.5, color:'#0a0605' },
      { shape:'cyl', x:8.2, y:0, z:5.3, w:0.1, h:0.5, color:'#0a0605' },

      /* --- 门口的地毯 --- */
      { shape:'low', x:7.5, y:0.005, z:7.5, w:2.2, h:0.02, color:'#1a0a08' },
      { shape:'low', x:7.5, y:0.006, z:2.0, w:1.2, h:0.02, color:'#060404' },

      /* --- 地面血迹 --- */
      ...bloodSpots(7.5, 10.5, 20, 1.6, '#2a0404'),
      ...bloodTrail(7.5, 10.5, 7.5, 4.5, 16, '#1e0303'),
      ...bloodTrail(7.5, 2.5, 3.5, 2.5, 12, '#240303'),

      /* --- 悬挂物 --- */
      ...hangingMeat(13.4, 1.6, 6.5, 'w'),
      ...hangingMeat(13.4, 1.6, 8.5, 'w'),
      ...hangingMeat(13.4, 1.6, 10.5, 'w'),

      ...bloodSpots(12.5, 8.5, 16, 1.2, '#260303'),

      /* --- 墙壁手印 --- */
      ...wallHandprint(2.0, 1.5, 4.5),
      ...wallHandprint(2.0, 1.2, 8.5),
      ...wallHandprint(13.4, 1.5, 3.5),
      ...wallHandprint(13.4, 1.2, 11.5),

      /* --- 挂钟 --- */
      { shape:'cyl',    x:7.5, y:2.3, z:12.8, w:0.4, h:0.08, color:'#2a1a10' },
      { shape:'cyl',    x:7.5, y:2.28, z:12.85, w:0.32, h:0.05, color:'#d8c8a8' },
      { shape:'sphere', x:7.5, y:2.28, z:12.88, w:0.04, color:'#3a2010' },

      /* --- 吊灯残骸 --- */
      { shape:'cyl',    x:7.5, y:2.6, z:7.5, w:0.03, h:0.5, color:'#0a0605' },
      { shape:'sphere', x:7.5, y:2.5, z:7.5, w:0.15, color:'#1a0a08' },

      /* --- 杂物 --- */
      { shape:'bevelBox', x:10.5, y:0, z:10.5, w:0.5, h:0.6, d:0.5, bevel:0.04, color:'#0a0605' }
    ],
    things: [
      { id:'window', x:3.5,  y:2.0,  icon:'🪟', label:'窗户',           scale:1.1 },
      { id:'clock',  x:7.5,  y:2.0,  icon:'🕰', label:'停了的挂钟',     scale:0.8 },
      { id:'books',  x:2.0,  y:6.5,  icon:'📚', label:'烧掉的书架',     scale:0.9 },
      { id:'lamp',   x:12.5, y:4.5,  icon:'💡', label:'台灯的铁架',     scale:0.8 },
      { id:'frame',  x:7.5,  y:11.5, icon:'🖼', label:'烧焦的相框',     scale:0.9,
        ack: true, ackId: 'photoBack' },
      { id:'chair',  x:3.5,  y:9.5,  icon:'🪑', label:'翻倒的摇椅',     scale:1.0 },
      { id:'bowl',   x:4.5,  y:11.5, icon:'🥣', label:'小碗',           scale:0.6 },
      { id:'back',   x:2.5,  y:7.5,  icon:'⬅',  label:'回到门前',       scale:0.8 }
    ]
  },

  /* =====================================================
     配电房
     ===================================================== */
  powerstation: {
    wallTex: { type:'burnt', base:'#0e0c0c' },
    floorTex: { base: '#080606' },
    ceilTex: { base: '#030303' },
    spawn: { x:2.5, y:7.5, dir:0 },
    lights: [
      { x:2.5,  y:2.6, z:4.5,  color: [0.9, 0.35, 0.18] },
      { x:7.5,  y:2.6, z:9.5,  color: [0.9, 0.30, 0.15] },
      { x:10.5, y:2.6, z:4.5,  color: [1.0, 0.30, 0.15] }
    ],
    grid: [
      '111111111111',
      '100000000001','100000000001','100000000001','100000000001',
      '100000000001','100000000001','100000000001','100000000001',
      '100000000001',
      '111111111111'
    ],
    props: [
      /* --- 配电柜（完整） --- */
      { shape:'bevelBox', x:10.5, y:0, z:4.5, w:1.4, h:2.0, d:0.9, bevel:0.06, color:'#0d0a08' },
      { shape:'box',      x:10.5, y:1.3, z:4.5, w:0.5, h:0.2, d:0.1, color:'#2a0808' },
      { shape:'sphere',   x:10.5, y:1.4, z:4.42, w:0.1, color:'#ff2020' },
      { shape:'cyl',      x:9.8, y:0.02, z:5.0, w:0.1, h:0.4, color:'#1a0606' },

      /* --- 保险丝盒 --- */
      { shape:'bevelBox', x:2.0, y:0.8, z:4.5, w:0.7, h:1.4, d:0.25, bevel:0.03, color:'#0d0a08' },
      { shape:'sphere',   x:2.0, y:1.5, z:4.35, w:0.06, color:'#40c040' },
      { shape:'sphere',   x:2.0, y:1.3, z:4.35, w:0.06, color:'#40c040' },
      { shape:'sphere',   x:2.0, y:1.1, z:4.35, w:0.06, color:'#40c040' },
      { shape:'sphere',   x:2.0, y:0.9, z:4.35, w:0.06, color:'#40c040' },

      /* --- 工作台 --- */
      { shape:'bevelBox', x:7.5, y:0, z:9.5, w:1.8, h:0.7, d:1.0, bevel:0.05, color:'#0d0a08' },
      { shape:'plate',    x:7.5, y:0.7, z:9.5, w:0.7, h:0.4, color:'#2a1a10' },

      /* --- 工作台上的日志 --- */
      { shape:'plate', x:7.5, y:0.72, z:9.3, w:0.4, h:0.1, color:'#3a2a1a' },

      /* --- 血迹 --- */
      ...bloodSpots(7.5, 9.5, 12, 0.8, '#2a0404'),
      ...bloodTrail(7.5, 10.0, 2.0, 7.5, 14, '#1e0303'),

      /* --- 高处小灯 --- */
      { shape:'cyl',    x:2.5, y:2.2, z:2.0, w:0.25, h:0.15, color:'#1a0606' },
      { shape:'sphere', x:2.5, y:2.15, z:2.0, w:0.2, color:'#ff8040' },

      /* --- 支撑柱 --- */
      { shape:'cyl', x:7.5, y:0.5, z:2.0, w:0.05, h:1.8, color:'#0a0606' },

      /* --- 悬挂物 --- */
      ...hangingMeat(10.4, 1.6, 7.5, 'w'),
      ...hangingMeat(10.4, 1.6, 9.5, 'w'),
      ...hangingMeat(1.6, 1.6, 4.5, 'e'),
      ...hangingMeat(1.6, 1.6, 7.5, 'e'),

      /* --- 墙壁手印 --- */
      ...wallHandprint(1.6, 1.5, 9.5),
      ...wallHandprint(10.4, 1.5, 2.5),

      /* --- 烧痕 --- */
      ...burnMark(4.5, 7.5, 0.8),

      /* --- 油桶 --- */
      { shape:'cyl',   x:4.5, y:0, z:6.0, w:0.6, h:0.9, color:'#1a1410' },
      { shape:'torus', x:4.5, y:0.15, z:6.0, w:0.62, r2:0.02, color:'#0a0604' },
      { shape:'torus', x:4.5, y:0.75, z:6.0, w:0.62, r2:0.02, color:'#0a0604' }
    ],
    things: [
      { id:'breaker', x:10.5, y:4.5,  icon:'⚡', label:'断了的电闸',     scale:1.0 },
      { id:'fuse',    x:2.0,  y:4.5,  icon:'🔌', label:'保险丝盒',       scale:0.9 },
      { id:'log',     x:7.5,  y:9.5,  icon:'📓', label:'工作日志',       scale:0.8 },
      { id:'back',    x:1.5,  y:7.5,  icon:'⬅',  label:'回去',           scale:0.8 }
    ]
  },

  /* =====================================================
     屋顶
     ===================================================== */
  rooftop: {
    wallTex: { type:'burnt', base:'#0c0a08' },
    floorTex: { base: '#060604' },
    ceilTex: { base: '#020203' },
    spawn: { x:7.5, y:11.5, dir:Math.PI },
    lights: [
      { x:7.5,  y:3.5, z:7.5,  color: [0.35, 0.35, 0.6], conditional: false },
      { x:15.5, y:1.5, z:4.5,  color: [1.0, 0.35, 0.15], conditional: false },
      { x:3.5,  y:2.6, z:3.5,  color: [0.9, 0.30, 0.15] }
    ],
    grid: [
      '11111111111111111111',
      '10000000000000000001','10000000000000000001','10000000000000000001',
      '10000000000000000001','10000000000000000001','10000000000000000001',
      '10000000000000000001','10000000000000000001','10000000000000000001',
      '10000000000000000001','10000000000000000001','10000000000000000001',
      '10000000000000000001','10000000000000000001',
      '11111111111111111111'
    ],
    props: [
      /* --- 天线（精细） --- */
      { shape:'cyl',    x:3.5, y:0,   z:2.0, w:0.12, h:2.5, color:'#0d0908' },
      { shape:'torus',  x:3.5, y:2.2, z:2.0, w:0.2, r2:0.03, color:'#1a1410' },
      { shape:'sphere', x:3.5, y:2.55, z:2.0, w:0.15, color:'#2a1d10' },
      { shape:'cyl',    x:3.5, y:2.5, z:2.0, w:0.06, h:0.3, color:'#0d0908' },
      { shape:'sphere', x:3.5, y:2.85, z:2.0, w:0.1, color:'#ff6060' },

      /* --- 水塔（精细） --- */
      { shape:'cyl',    x:17.5, y:0,   z:2.0, w:0.9, h:1.2, color:'#0a0806' },
      { shape:'torus',  x:17.5, y:0.15, z:2.0, w:0.92, r2:0.03, color:'#1a1410' },
      { shape:'torus',  x:17.5, y:0.6,  z:2.0, w:0.92, r2:0.03, color:'#1a1410' },
      { shape:'torus',  x:17.5, y:1.05, z:2.0, w:0.92, r2:0.03, color:'#1a1410' },
      { shape:'cone',   x:17.5, y:1.2,  z:2.0, w:1.1, h:0.5, color:'#1a1410' },
      { shape:'sphere', x:17.5, y:1.75, z:2.0, w:0.15, color:'#0a0806' },

      /* --- 晾衣架 --- */
      { shape:'cyl', x:9.5, y:0, z:3.5, w:0.08, h:2.0, color:'#0a0606' },
      { shape:'box', x:9.5, y:2.0, z:3.5, w:0.04, h:0.04, d:1.0, color:'#0a0606' },
      { shape:'cyl', x:9.5, y:0.5, z:6.0, w:0.05, h:1.6, color:'#2a1810' },
      ...hangingMeat(9.5, 1.2, 6.4, 's'),
      ...hangingMeat(9.5, 1.2, 5.6, 's'),

      /* --- 矮墙 --- */
      { shape:'box', x:7.5, y:0, z:8.5, w:5.0, h:0.7, d:0.2, color:'#0a0806' },

      /* --- 远处的红屋顶 --- */
      { shape:'bevelBox', x:15.5, y:0, z:4.5, w:1.5, h:1.2, d:1.2, bevel:0.08, color:'#0a0404' },
      { shape:'ramp',     x:15.5, y:1.2, z:4.5, w:1.6, h:0.5, d:1.3, dir:'n', color:'#3a0a08' },
      { shape:'sphere',   x:15.5, y:1.75, z:4.5, w:0.5, color:'#5a1010' },

      /* --- 烟囱 --- */
      { shape:'cyl',    x:15.5, y:1.6, z:4.5, w:0.5, h:0.4, color:'#1a0a08' },
      { shape:'sphere', x:15.5, y:1.95, z:4.5, w:0.2, color:'#ff4020' },

      /* --- 血迹 --- */
      ...bloodSpots(7.5, 11.5, 20, 1.8, '#2a0404'),
      ...bloodTrail(7.5, 11.5, 7.5, 6.5, 16, '#1e0303'),
      ...bloodSpots(15.5, 7.5, 14, 1.2, '#240303'),

      /* --- 墙壁手印 --- */
      ...wallHandprint(1.6, 1.5, 6.5),
      ...wallHandprint(1.6, 1.2, 10.5),
      ...wallHandprint(18.4, 1.5, 6.5),
      ...wallHandprint(18.4, 1.2, 10.5),

      /* --- 烧痕 --- */
      ...burnMark(15.5, 12.5, 1.3),

      /* --- 通风管道 --- */
      { shape:'cyl',    x:5.5, y:0, z:11.5, w:0.5, h:0.3, color:'#2a1810' },
      { shape:'torus',  x:5.5, y:0.15, z:11.5, w:0.5, r2:0.04, color:'#1a1410' }
    ],
    things: [
      { id:'antenna',   x:3.5,  y:2.0,  icon:'📡', label:'锈天线',         scale:1.1 },
      { id:'watertank', x:17.5, y:2.0,  icon:'🛢', label:'水塔',           scale:1.1 },
      { id:'hang',      x:9.5,  y:3.5,  icon:'🧵', label:'晾衣架',         scale:0.8 },
      { id:'houseroof', x:15.5, y:4.5,  icon:'🏠', label:'远处的焦黑屋顶', scale:1.0 },
      { id:'back',      x:1.5,  y:7.5,  icon:'⬅',  label:'回到后巷',       scale:0.8 }
    ]
  },

  /* =====================================================
     地下通道
     ===================================================== */
  underpass: {
    wallTex: { type:'burnt', base:'#0e0e10' },
    floorTex: { base: '#060606' },
    ceilTex: { base: '#030303' },
    spawn: { x:2.5, y:7.5, dir:0 },
    lights: [
      { x:3.5,  y:2.6, z:2.0,  color: [0.9, 0.30, 0.15] },
      { x:7.5,  y:2.6, z:7.5,  color: [0.9, 0.28, 0.14] },
      { x:11.5, y:2.6, z:11.5, color: [0.85, 0.25, 0.12] }
    ],
    grid: [
      '1111111111111111',
      '1000000000000001','1000000000000001','1000000000000001','1000000000000001',
      '1000000000000001','1000000000000001','1000000000000001','1000000000000001',
      '1000000000000001','1000000000000001',
      '1111111111111111'
    ],
    props: [
      /* --- 楼梯（用层叠 box 表示台阶） --- */
      { shape:'bevelBox', x:3.5, y:0,   z:2.0, w:1.4, h:0.3, d:0.9, bevel:0.04, color:'#0a0808' },
      { shape:'bevelBox', x:3.5, y:0.3, z:2.5, w:1.2, h:0.3, d:0.5, bevel:0.04, color:'#0c0a08' },
      { shape:'bevelBox', x:3.5, y:0.6, z:2.9, w:1.0, h:0.3, d:0.4, bevel:0.04, color:'#0e0c0a' },

      /* --- 墙上大字 --- */
      { shape:'plate', x:6.5, y:1.0, z:2.0, w:1.4, h:0.7, color:'#1a1008' },

      /* --- 应急灯 --- */
      { shape:'box',    x:10.5, y:2.2, z:2.0, w:0.3, h:0.15, d:0.15, color:'#0a1408' },
      { shape:'sphere', x:10.5, y:2.15, z:2.0, w:0.15, color:'#40c040' },

      /* --- 角落纸板 --- */
      { shape:'bevelBox', x:11.5, y:0, z:10.5, w:1.2, h:0.15, d:0.9, bevel:0.04, color:'#1a1208' },
      { shape:'bevelBox', x:11.5, y:0.15, z:10.5, w:0.8, h:0.12, d:0.7, bevel:0.04, color:'#1a1208' },

      /* --- 配电房门 --- */
      { shape:'plate', x:14.4, y:0.0, z:7.5, w:0.8, h:1.7, color:'#0a0806' },
      { shape:'sphere', x:14.35, y:0.8, z:7.5, w:0.06, color:'#a08040' },

      /* --- 血迹 --- */
      ...bloodSpots(6.5, 2.5, 8, 0.5, '#240303'),
      ...bloodSpots(11.5, 10.5, 12, 0.9, '#2a0404'),
      ...bloodTrail(3.5, 2.5, 3.5, 10.5, 16, '#1e0303'),
      ...bloodTrail(11.5, 10.5, 3.5, 10.5, 14, '#240303'),
      ...bloodSpots(7.5, 7.5, 18, 1.4, '#280404'),

      /* --- 墙壁手印 --- */
      ...wallHandprint(1.6, 1.5, 5.5),
      ...wallHandprint(1.6, 1.2, 9.5),
      ...wallHandprint(14.4, 1.5, 5.5),
      ...wallHandprint(14.4, 1.2, 9.5),

      /* --- 悬挂物 --- */
      ...hangingMeat(14.4, 1.6, 4.5, 'w'),
      ...hangingMeat(1.6, 1.6, 4.5, 'e'),

      /* --- 烧痕 --- */
      ...burnMark(5.5, 11.5, 0.8),

      /* --- 天花板管道 --- */
      { shape:'cyl',    x:7.5, y:2.5, z:7.5, w:0.15, h:0.15, color:'#2a1a10' },
      { shape:'torus',  x:7.5, y:2.5, z:7.5, w:0.18, r2:0.03, color:'#1a1410' },
      { shape:'box',    x:7.5, y:2.5, z:7.5, w:0.05, h:0.05, d:3.0, color:'#1a1410' }
    ],
    things: [
      { id:'stairs',    x:3.5,  y:2.0,  icon:'🪜', label:'上方的楼梯',     scale:1.0 },
      { id:'graffiti',  x:6.5,  y:2.0,  icon:'✍',  label:'墙上的字',       scale:0.8 },
      { id:'emergency', x:10.5, y:2.0,  icon:'💡', label:'应急灯',         scale:0.7 },
      { id:'trash',     x:11.5, y:10.5, icon:'📦', label:'角落里的纸板',   scale:0.9 },
      { id:'room',      x:14.4, y:7.5,  icon:'⚡', label:'配电房的门',     scale:0.9 },
      { id:'back',      x:1.5,  y:7.5,  icon:'⬅',  label:'回到街道',       scale:0.8 }
    ]
  },

  /* =====================================================
     河堤
     ===================================================== */
  riverside: {
    wallTex: { type:'burnt', base:'#0c0a0c' },
    floorTex: { base: '#060608' },
    ceilTex: { base: '#020203' },
    spawn: { x:2.5, y:7.5, dir:0 },
    rain: true,
    lights: [
      { x:3.5,  y:2.6, z:2.0,  color: [0.95, 0.35, 0.16] },
      { x:7.5,  y:1.4, z:5.5,  color: [0.30, 0.40, 0.65], conditional: false },
      { x:12.5, y:2.6, z:10.5, color: [0.85, 0.28, 0.14] }
    ],
    grid: [
      '111111111111111',
      '100000000000001','100000000000001','100000000000001','100000000000001',
      '100000000000001','100000000000001','100000000000001','100000000000001',
      '100000000000001',
      '111111111111111'
    ],
    props: [
      /* --- 河堤路灯（完整） --- */
      ...buildFullLamp(3.5, 2.0),

      /* --- 长椅（精细） --- */
      { shape:'bevelBox', x:7.5, y:0.6,  z:2.0, w:1.8, h:0.1, d:0.5, bevel:0.04, color:'#0a0605' },
      { shape:'bevelBox', x:7.5, y:0.7,  z:2.3, w:1.8, h:0.15, d:0.4, bevel:0.04, color:'#1a0e08' },
      { shape:'box',      x:7.5, y:0,    z:1.85, w:0.1, h:0.6, d:0.5, color:'#0a0605' },
      { shape:'box',      x:7.5, y:0,    z:2.15, w:0.1, h:0.6, d:0.5, color:'#0a0605' },
      { shape:'cyl',      x:6.7, y:0,    z:2.0, w:0.08, h:0.6, color:'#0a0605' },
      { shape:'cyl',      x:8.3, y:0,    z:2.0, w:0.08, h:0.6, color:'#0a0605' },

      /* --- 丢弃的伞（精细） --- */
      { shape:'cone',   x:11.5, y:0.5, z:2.0, w:0.9, h:0.3, color:'#1a0a08' },
      { shape:'cyl',    x:11.5, y:0,   z:2.0, w:0.05, h:0.5, color:'#0a0606' },
      { shape:'sphere', x:11.5, y:0.85, z:2.0, w:0.1, color:'#0a0606' },

      /* --- 河面反光 --- */
      { shape:'low', x:7.5, y:0.02, z:11.5, w:8.0, h:0.03, color:'#030408' },

      /* --- 路灯下的杂物 --- */
      { shape:'cyl',    x:2.5, y:0, z:5.5, w:0.08, h:1.0, color:'#0a0806' },
      { shape:'torus',  x:2.5, y:1.0, z:5.5, w:0.1, r2:0.02, color:'#1a1410' },
      { shape:'cyl',    x:12.5, y:0, z:5.5, w:0.08, h:1.0, color:'#0a0806' },

      /* --- 血迹 --- */
      ...bloodSpots(7.5, 2.0, 12, 0.7, '#2a0404'),
      ...hangingMeat(4.0, 1.5, 5.4, 's'),
      ...hangingMeat(10.5, 1.5, 5.4, 's'),
      ...bloodSpots(7.5, 7.5, 18, 1.6, '#2a0404'),
      ...bloodTrail(7.5, 7.5, 3.5, 7.5, 12, '#1e0303'),

      /* --- 墙壁手印 --- */
      ...wallHandprint(1.6, 1.5, 5.5),
      ...wallHandprint(13.4, 1.5, 5.5),
      ...wallHandprint(13.4, 1.2, 9.5),

      /* --- 岸边杂草 --- */
      { shape:'cone',   x:5.5, y:0, z:11.5, w:0.3, h:0.5, color:'#1a1210' },
      { shape:'cone',   x:6.2, y:0, z:11.6, w:0.25, h:0.45, color:'#1a1210' },
      { shape:'cone',   x:9.5, y:0, z:11.4, w:0.28, h:0.5, color:'#1a1210' },

      /* --- 铁栏杆 --- */
      { shape:'cyl', x:7.5, y:0.5, z:5.5, w:0.1, h:0.1, color:'#0a0806' },
      { shape:'box', x:7.5, y:0.5, z:5.5, w:5.0, h:0.06, d:0.06, color:'#0a0806' },
      { shape:'cyl', x:5.5, y:0, z:5.5, w:0.06, h:0.5, color:'#0a0806' },
      { shape:'cyl', x:9.5, y:0, z:5.5, w:0.06, h:0.5, color:'#0a0806' }
    ],
    things: [
      { id:'lamp',     x:3.5,  y:2.0,  icon:'🕯', label:'熄灭的路灯',     scale:0.9 },
      { id:'bench',    x:7.5,  y:2.0,  icon:'🧥', label:'长椅上的旧外套', scale:1.0 },
      { id:'umbrella', x:11.5, y:2.0,  icon:'☂',  label:'丢弃的伞',       scale:0.9 },
      { id:'river',    x:7.5,  y:11.5, icon:'🌊', label:'河面',           scale:1.2 },
      { id:'back',     x:1.5,  y:7.5,  icon:'⬅',  label:'回到街道',       scale:0.8 }
    ]
  },

  /* =====================================================
     邻屋
     ===================================================== */
  neighbor: {
    wallTex: { type:'burnt', base:'#0a0606' },
    floorTex: { base: '#060404' },
    ceilTex: { base: '#020202' },
    spawn: { x:2.5, y:7.5, dir:0 },
    lights: [
      { x:7.5,  y:2.6, z:2.0,  color: [1.2, 0.35, 0.2], conditional: false },
      { x:7.5,  y:2.6, z:7.5,  color: [0.85, 0.30, 0.15] },
      { x:12.5, y:2.6, z:10.5, color: [0.8, 0.25, 0.12] }
    ],
    grid: [
      '111111111111111',
      '100000000000001','100000000000001','100000000000001','100000000000001',
      '100000000000001','100000000000001','100000000000001','100000000000001',
      '100000000000001','100000000000001','100000000000001',
      '111111111111111'
    ],
    props: [
      /* --- 窗户（大火后的焦黑窗户） --- */
      { shape:'plate', x:7.5, y:1.4, z:2.0, w:1.8, h:1.6, color:'#0a0404' },
      { shape:'plate', x:7.5, y:1.7, z:1.95, w:0.6, h:0.4, color:'#3a0808' },

      /* --- 日历 --- */
      { shape:'plate', x:3.5, y:1.6, z:2.0, w:0.5, h:0.7, color:'#2a1e10' },

      /* --- 小床（精细） --- */
      { shape:'bevelBox', x:12.5, y:0,   z:7.5, w:2.2, h:0.5, d:1.2, bevel:0.06, color:'#0a0605' },
      { shape:'bevelBox', x:12.5, y:0.5, z:7.5, w:2.0, h:0.1, d:1.0, bevel:0.04, color:'#1a1008' },
      { shape:'low',      x:12.5, y:0.6, z:7.5, w:0.9, h:0.04, color:'#0a0605' },

      /* --- 地板爪印 --- */
      { shape:'low', x:7.5, y:0.005, z:5.5, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:7.5, y:0.005, z:7.5, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:7.5, y:0.005, z:9.5, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:9.5, y:0.005, z:7.5, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:9.5, y:0.005, z:5.5, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:9.5, y:0.005, z:9.5, w:0.14, h:0.01, color:'#1a0808' },
      { shape:'low', x:11.5, y:0.005, z:7.5, w:0.14, h:0.01, color:'#1a0808' },

      /* --- 门 --- */
      { shape:'plate', x:14.4, y:0.0, z:7.5, w:1.0, h:2.0, color:'#060404' },
      { shape:'arch',  x:14.4, y:0.0, z:7.5, w:0.9, h:2.3, d:0.1, seg:16, color:'#1a0a08' },

      /* --- 屋后门 --- */
      { shape:'plate', x:2.5, y:0.0, z:11.5, w:1.2, h:2.0, color:'#080606' },

      /* --- 血迹 --- */
      ...bloodSpots(7.5, 5.5, 16, 1.4, '#2a0404'),
      ...bloodTrail(7.5, 5.5, 12.5, 7.5, 14, '#1e0303'),

      /* --- 悬挂物 --- */
      ...hangingMeat(1.6, 1.6, 5.5, 'e'),
      ...hangingMeat(1.6, 1.6, 9.5, 'e'),
      ...hangingMeat(14.4, 1.6, 4.5, 'w'),
      ...hangingMeat(14.4, 1.6, 10.5, 'w'),

      /* --- 墙壁手印 --- */
      ...wallHandprint(1.6, 1.5, 7.5),
      ...wallHandprint(14.4, 1.5, 6.5),
      ...wallHandprint(14.4, 1.2, 9.5),

      /* --- 桌上的物品 --- */
      { shape:'bevelBox', x:3.5, y:0.5, z:8.5, w:1.0, h:0.5, d:0.7, bevel:0.04, color:'#0a0605' },
      { shape:'sphere',   x:3.5, y:1.1, z:8.5, w:0.2, color:'#1a0a08' },

      /* --- 地毯 --- */
      { shape:'low', x:5.5, y:0.006, z:4.5, w:1.8, h:0.015, color:'#3a0404' },

      /* --- 门边的挂钟 --- */
      { shape:'cyl',    x:1.8, y:2.2, z:7.5, w:0.35, h:0.06, color:'#1a0a08' },
      { shape:'sphere', x:1.78, y:2.2, z:7.5, w:0.05, color:'#3a1010' }
    ],
    things: [
      { id:'neighborWindow',   x:7.5,  y:2.0,  icon:'🪟', label:'对着红屋顶的窗户', scale:1.1 },
      { id:'neighborCalendar', x:3.5,  y:2.0,  icon:'📅', label:'停在那一夜的日历', scale:0.8 },
      { id:'neighborFloor',    x:7.5,  y:7.5,  icon:'🐾', label:'地板上的爪印',     scale:0.7 },
      { id:'neighborBed',      x:12.5, y:7.5,  icon:'🛏', label:'塌了一半的小床',   scale:1.0 },
      { id:'back',             x:2.5,  y:11.5, icon:'⬅',  label:'来的路',           scale:0.8 },
      { id:'exit',             x:14.4, y:7.5,  icon:'➡',  label:'通向院子的门',     scale:0.9 }
    ]
  }
};
})();