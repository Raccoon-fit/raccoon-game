/* =========================================================
   scenes.js — 2D 场景绘制 + 定义 (大厂标准·三层视差·精细版)
   依赖 window.S
   ========================================================= */
(function(){
'use strict';

const W = 960, H = 540;
let ctx = null;
function setCtx(c){ ctx = c; }
function getCtx(){ return ctx; }

function flags(){ return (window.S && window.S.flags) || {}; }
function isPowerCut(){ return !!flags().powerCut; }
function isBloodMode(){ return !!flags().bloodMode; }

/* ================== 核心工具函数 ================== */
function rrect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function rr(x,y,w,h,r,c){ rrect(x,y,w,h,r); ctx.fillStyle=c; ctx.fill(); }
function grad(x1,y1,x2,y2,stops){
  const g = ctx.createLinearGradient(x1,y1,x2,y2);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  return g;
}
function brickWall(x, y, w, h, bw, bh, face, gap){
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = face;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = gap;
  ctx.lineWidth = 1;
  for(let yy = y, row = 0; yy < y + h; yy += bh, row++){
    ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
    const off = row % 2 ? 0 : bw / 2;
    for(let xx = x + off; xx < x + w; xx += bw){
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + bh); ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for(let yy = y + 2, row = 0; yy < y + h; yy += bh, row++){
    const off = row % 2 ? 0 : bw / 2;
    for(let xx = x + off; xx < x + w; xx += bw){
      ctx.fillRect(xx + 1, yy, 4, bh - 2);
    }
  }
  ctx.restore();
}
function woodGrain(x, y, w, h, baseColor, lineColor, vertical){
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  if(vertical){
    for(let xx = x + 6; xx < x + w; xx += 10){
      ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke();
    }
  } else {
    for(let yy = y + 6; yy < y + h; yy += 10){
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
    }
  }
}

/* =========================================================
   ★ 新增场景：棋牌室 (Parlor) · 三层
   ========================================================= */
function drawParlorFar(){
  // 远景：深色复古壁纸、老挂钟、窗外雨夜
  ctx.fillStyle = grad(0,0,0,H, [[0,'#1a1410'],[1,'#0a0806']]);
  ctx.fillRect(0,0,W,H);

  // 复古壁纸纹理（暗花）
  for(let i=0; i<W; i+=60){
    for(let j=0; j<H; j+=60){
      ctx.fillStyle = 'rgba(255,255,255,0.012)';
      ctx.beginPath(); ctx.arc(i+30, j+30, 15, 0, Math.PI*2); ctx.fill();
    }
  }

  // 窗户（透着外面的雨夜霓虹）
  const wx = 680, wy = 100, ww = 180, wh = 240;
  ctx.fillStyle = '#050810';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 8;
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.beginPath();
  ctx.moveTo(wx+ww/2, wy); ctx.lineTo(wx+ww/2, wy+wh);
  ctx.moveTo(wx, wy+wh/2); ctx.lineTo(wx+ww, wy+wh/2);
  ctx.stroke();

  // 窗外模糊的霓虹
  const neon = ctx.createRadialGradient(wx+60, wy+80, 0, wx+60, wy+80, 100);
  neon.addColorStop(0, 'rgba(255,80,50,0.12)');
  neon.addColorStop(1, 'rgba(255,80,50,0)');
  ctx.fillStyle = neon;
  ctx.fillRect(wx, wy, ww, wh);

  // 老挂钟
  const cx = 140, cy = 120;
  ctx.fillStyle = '#3a2c1e';
  ctx.beginPath(); ctx.arc(cx, cy, 45, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#d8c8a8';
  ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI*2); ctx.fill();
  // 刻度
  ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 2;
  for(let i=0; i<12; i++){
    const a = i * Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a)*32, cy + Math.sin(a)*32);
    ctx.lineTo(cx + Math.cos(a)*36, cy + Math.sin(a)*36);
    ctx.stroke();
  }
  // 指针（静止在凌晨）
  ctx.strokeStyle = '#3a2c1e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx-15, cy-10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+20, cy+5); ctx.stroke();
}

function drawParlorMid(){
  // 中景：护墙板、麻将桌、椅子、绿罩台灯
  ctx.fillStyle = '#2a1e14';
  ctx.fillRect(0, 380, W, 160);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 380, W, 4);

  // 麻将桌
  const tx = 380, ty = 400, tw = 220, th = 120;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.ellipse(tx+tw/2, ty+th+8, tw*0.55, 24, 0, 0, Math.PI*2); ctx.fill();
  
  // 桌腿
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(tx+30, ty+th, 20, 60);
  ctx.fillRect(tx+tw-50, ty+th, 20, 60);

  // 桌面（绿绒布）
  ctx.fillStyle = '#1a3a2a';
  ctx.beginPath(); ctx.ellipse(tx+tw/2, ty+th/2, tw/2, th/2, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 8;
  ctx.stroke();

  // 散落的麻将牌（带立体感）
  const tiles = [
    [-50,-20,'#e8e0d0'], [20,-30,'#e8e0d0'], [-10,10,'#d8c8a8'],
    [45,15,'#e8e0d0'], [-60,25,'#c8b898'], [15,35,'#e8e0d0']
  ];
  tiles.forEach(t => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(tx+tw/2+t[0]+2, ty+th/2+t[1]+2, 18, 24);
    ctx.fillStyle = t[2];
    ctx.fillRect(tx+tw/2+t[0], ty+th/2+t[1], 18, 24);
    ctx.fillStyle = '#2a5a3a';
    ctx.fillRect(tx+tw/2+t[0]+2, ty+th/2+t[1]+3, 14, 8);
  });

  // 椅子（四把，透视感）
  const chairs = [[-80, 10], [tw+40, 10], [20, th+40], [tw-60, th+40]];
  chairs.forEach(c => {
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(tx+c[0], ty+c[1], 50, 80);
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(tx+c[0]+4, ty+c[1]+4, 42, 30);
  });

  // 绿罩台灯
  const lx = tx+tw/2, ly = ty-80;
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(lx-6, ly, 12, 80);
  ctx.fillStyle = '#1a5a3a';
  ctx.beginPath();
  ctx.moveTo(lx-60, ly); ctx.lineTo(lx+60, ly);
  ctx.lineTo(lx+35, ly-35); ctx.lineTo(lx-35, ly-35);
  ctx.closePath(); ctx.fill();
  // 台灯高光
  ctx.fillStyle = 'rgba(255,220,150,0.15)';
  ctx.beginPath();
  ctx.moveTo(lx-60, ly); ctx.lineTo(lx, ly);
  ctx.lineTo(lx-15, ly-35); ctx.lineTo(lx-35, ly-35);
  ctx.closePath(); ctx.fill();

  // 台灯光晕（照亮桌面）
  const glow = ctx.createRadialGradient(lx, ly+40, 0, lx, ly+40, 200);
  glow.addColorStop(0, 'rgba(255,220,150,0.22)');
  glow.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(tx-100, ty-100, tw+200, th+200);
}

function drawParlorNear(){
  // 近景：烟灰缸、茶杯、烟雾
  const t = performance.now() / 1000;
  
  // 烟灰缸
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(220, 505, 55, 18, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1a1410';
  ctx.beginPath(); ctx.ellipse(220, 500, 55, 15, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath(); ctx.ellipse(220, 498, 40, 10, 0, 0, Math.PI*2); ctx.fill();
  
  // 烟头
  ctx.fillStyle = '#e8e0d0';
  ctx.fillRect(200, 492, 6, 18);
  ctx.fillRect(230, 495, 5, 15);
  ctx.fillStyle = '#ff6a4a';
  ctx.fillRect(200, 492, 6, 3);
  ctx.fillRect(230, 495, 5, 2);

  // 茶杯
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(720, 505, 30, 12, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#e8e0d0';
  ctx.beginPath(); ctx.ellipse(720, 500, 30, 12, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath(); ctx.ellipse(720, 498, 22, 8, 0, 0, Math.PI*2); ctx.fill();
  
  // 茶的热气（动态）
  const steamY = 500 - (t * 20 % 60);
  ctx.fillStyle = `rgba(255,255,255,${0.06 + 0.04*Math.sin(t*2)})`;
  ctx.beginPath();
  ctx.ellipse(720 + Math.sin(t)*5, steamY, 12, 18, 0, 0, Math.PI*2);
  ctx.fill();
}

function drawParlorDynamic(t, dt){
  // 整体烟雾缭绕
  for(let i=0; i<3; i++){
    const sx = 300 + Math.sin(t*0.3 + i*2)*150;
    const sy = 200 + Math.cos(t*0.2 + i*3)*100;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 180);
    g.addColorStop(0, 'rgba(180,180,180,0.025)');
    g.addColorStop(1, 'rgba(180,180,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // 台灯呼吸闪烁
  const flick = 0.92 + 0.08 * Math.sin(t * 10) * (Math.random() > 0.9 ? 2 : 1);
  const lx = 490, ly = 320;
  const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 200);
  glow.addColorStop(0, `rgba(255,220,150,${0.12 * flick})`);
  glow.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(lx-200, ly-200, 400, 400);
}

/* =========================================================
   ★ 重制：雨巷 (Alley) · 三层精细版
   ========================================================= */
function drawAlleyFar(){
  const cut = isPowerCut();
  const blood = isBloodMode();

  // 远景天空
  ctx.fillStyle = grad(0,0,0,460, blood ? [
    [0,'#0a0308'],[0.35,'#160810'],[0.7,'#1c0a14'],[1,'#1c0e18']
  ] : [
    [0,'#040710'],[0.35,'#0a1420'],[0.7,'#101c2c'],[1,'#1a2534']
  ]);
  ctx.fillRect(0,0,W,460);

  // 远景建筑轮廓
  const skyline = [
    { x:0,   y:200, w:120, h:260 },
    { x:140, y:230, w:130, h:230 },
    { x:290, y:180, w:140, h:280 },
    { x:450, y:210, w:120, h:250 },
    { x:590, y:160, w:150, h:300 },
    { x:760, y:200, w:130, h:260 },
    { x:900, y:230, w:80,  h:230 }
  ];
  skyline.forEach(b => {
    ctx.fillStyle = blood ? '#120610' : '#060a10';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  // 远景窗户（冷暖光斑）
  const wins = [];
  skyline.forEach(b => {
    const cols = Math.floor(b.w / 34);
    const rows = Math.floor(b.h / 50);
    for(let i=0;i<cols;i++){
      for(let j=0;j<rows;j++){
        const wx = b.x + 16 + i*34;
        const wy = b.y + 26 + j*50;
        if(wx + 14 > b.x + b.w - 8) continue;
        if(wy + 22 > b.y + b.h - 8) continue;
        wins.push([wx, wy]);
      }
    }
  });
  wins.forEach((w0, i) => {
    const lit = !cut && (i*13 + 7) % 9 === 0;
    const litCold = !cut && (i*13 + 7) % 13 === 0;
    if(lit){
      ctx.fillStyle = blood ? 'rgba(220,80,90,0.55)' : 'rgba(255,190,110,0.55)';
      ctx.fillRect(w0[0], w0[1], 12, 18);
    } else if(litCold){
      ctx.fillStyle = blood ? 'rgba(180,50,60,0.45)' : 'rgba(110,190,255,0.45)';
      ctx.fillRect(w0[0], w0[1], 12, 18);
    } else {
      ctx.fillStyle = blood ? 'rgba(30,10,20,0.9)' : 'rgba(20,28,40,0.85)';
      ctx.fillRect(w0[0], w0[1], 12, 18);
    }
  });

  // 红屋顶房子（远景）
  const hx = 780, hy = 210;
  ctx.fillStyle = blood ? '#180808' : '#2c1414';
  ctx.beginPath();
  ctx.moveTo(hx-28, hy); ctx.lineTo(hx+42, hy-78); ctx.lineTo(hx+112, hy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = blood ? '#0c0404' : '#3a1c1c';
  ctx.beginPath();
  ctx.moveTo(hx-22, hy); ctx.lineTo(hx+42, hy-72); ctx.lineTo(hx+106, hy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = blood ? '#050202' : '#101820';
  ctx.fillRect(hx, hy, 84, 82);
  
  if(!cut && !blood){
    ctx.fillStyle = 'rgba(255,200,120,0.75)';
    ctx.fillRect(hx+28, hy+28, 28, 34);
    const hg = ctx.createRadialGradient(hx+42, hy+45, 0, hx+42, hy+45, 90);
    hg.addColorStop(0,'rgba(255,200,120,0.32)');
    hg.addColorStop(1,'rgba(255,200,120,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(hx-60, hy-60, 210, 210);
  } else if(blood){
    ctx.fillStyle = 'rgba(180,30,40,0.75)';
    ctx.fillRect(hx+28, hy+28, 28, 34);
    const hg = ctx.createRadialGradient(hx+42, hy+45, 0, hx+42, hy+45, 90);
    hg.addColorStop(0,'rgba(220,40,50,0.35)');
    hg.addColorStop(1,'rgba(200,20,30,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(hx-60, hy-60, 210, 210);
  }
}

function drawAlleyMid(){
  const cut = isPowerCut();
  const blood = isBloodMode();

  // 左侧砖墙
  brickWall(-6, 16, 172, 524, 60, 22,
    blood ? '#1a0a14' : '#131a23',
    blood ? 'rgba(60,10,20,0.35)' : 'rgba(0,0,0,0.35)');

  // 墙根阴影
  ctx.fillStyle = grad(0, 380, 0, 540, [
    [0,'rgba(0,0,0,0)'],[1, blood ? 'rgba(40,5,10,0.7)' : 'rgba(0,0,0,0.6)']
  ]);
  ctx.fillRect(-6, 380, 172, 160);

  // 墙上霉斑/涂鸦
  if(blood){
    ctx.fillStyle = 'rgba(200,30,40,0.4)';
    ctx.fillRect(38, 220, 48, 64);
    ctx.fillStyle = 'rgba(140,15,25,0.55)';
    ctx.fillRect(44, 228, 36, 26);
  } else {
    ctx.fillStyle = 'rgba(160,140,110,0.15)';
    ctx.fillRect(38, 220, 48, 64);
    ctx.fillStyle = 'rgba(100,90,75,0.22)';
    ctx.fillRect(44, 228, 36, 26);
  }

  // 路灯柱
  ctx.fillStyle = blood ? '#1a0c0c' : '#141b25'; 
  ctx.fillRect(164, 116, 9, 336);
  ctx.fillStyle = blood ? '#241414' : '#1c2531';
  ctx.beginPath();
  ctx.moveTo(146, 120); ctx.lineTo(190, 120);
  ctx.lineTo(182, 96); ctx.lineTo(154, 96);
  ctx.closePath(); ctx.fill();

  // 灯罩 / 光晕
  if(cut || blood){
    ctx.fillStyle = blood ? '#180808' : '#2a2a2a';
    ctx.beginPath(); ctx.ellipse(168, 124, 8, 4.5, 0, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,214,140,0.95)';
    ctx.beginPath(); ctx.ellipse(168, 124, 8, 4.5, 0, 0, Math.PI*2); ctx.fill();
    const lg = ctx.createRadialGradient(168, 124, 0, 168, 124, 340);
    lg.addColorStop(0,'rgba(255,208,130,0.35)');
    lg.addColorStop(0.3,'rgba(255,195,110,0.12)');
    lg.addColorStop(1,'rgba(255,180,90,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(-180,-220,700,700);
  }

  // 地面
  ctx.fillStyle = grad(0, 430, 0, 570, blood
    ? [[0,'#1a0810'],[1,'#0a040a']]
    : [[0,'#121a24'],[1,'#04070b']]);
  ctx.fillRect(-10, 430, W + 20, 140);
  
  // 地面砖缝
  ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1;
  for(let x = -60; x < W+80; x += 120){
    ctx.beginPath();
    ctx.moveTo(x, 440); ctx.lineTo(x+40, H);
    ctx.stroke();
  }

  // 垃圾桶
  const bx = 618, by = 314, bw = 126, bh = 180;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(bx+bw/2, by+bh+2, bw*0.6, 15, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = blood ? '#1a0a0e' : '#1e2631';
  ctx.beginPath();
  ctx.moveTo(bx+7, by+16); ctx.lineTo(bx+bw-7, by+16);
  ctx.lineTo(bx+bw-16, by+bh); ctx.lineTo(bx+16, by+bh);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(180,210,240,0.08)';
  ctx.fillRect(bx+18, by+30, 12, 128);
  ctx.fillStyle = blood ? '#2a1218' : '#252e3a';
  ctx.beginPath(); ctx.ellipse(bx+bw/2, by+14, bw/2, 15, 0, 0, Math.PI*2); ctx.fill();
}

function drawAlleyNear(){
  const blood = isBloodMode();
  
  // 近景积水反光
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(330, 492, 120, 26, 0, 0, Math.PI*2);
  const pg = ctx.createRadialGradient(330, 492, 0, 330, 492, 120);
  if(blood){
    pg.addColorStop(0,'rgba(120,15,25,0.45)');
    pg.addColorStop(1,'rgba(80,5,15,0)');
  } else {
    pg.addColorStop(0,'rgba(120,160,200,0.28)');
    pg.addColorStop(0.5,'rgba(60,90,130,0.15)');
    pg.addColorStop(1,'rgba(60,90,130,0)');
  }
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.restore();

  // 近景雨滴（带拖影）
  const t = performance.now() / 1000;
  for(let i=0; i<15; i++){
    const x = (i * 87 + t * 300) % W;
    const y = 380 + ((i * 47) % 160);
    const len = 20 + (i % 4) * 8;
    ctx.strokeStyle = blood
      ? `rgba(200,120,120,${0.25 + (i%3)*0.05})`
      : `rgba(180,210,240,${0.25 + (i%3)*0.05})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.16, y - len);
    ctx.stroke();
  }
}

function drawAlleyDynamic(t, dt){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const f = flags();
  
  // 电线摇晃
  const sway = Math.sin(t*0.9)*3;
  ctx.strokeStyle = blood ? 'rgba(60,15,20,0.7)' : 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.quadraticCurveTo(200 + sway, 60, 380, 22);
  ctx.quadraticCurveTo(560, -8, 720, 34);
  ctx.stroke();

  // 湿透的纸片
  if(!f.photo1Taken && !blood){
    ctx.save();
    ctx.translate(474, 498); ctx.rotate(-0.17);
    ctx.fillStyle = '#b9b3a0';
    ctx.fillRect(-26, -18, 52, 36);
    ctx.fillStyle = '#7d7869';
    ctx.fillRect(-20, -12, 40, 19);
    ctx.restore();
  }

  // 垃圾桶蒸汽
  ctx.save();
  ctx.globalAlpha = 0.06 + 0.03*Math.sin(t*1.3);
  ctx.fillStyle = blood ? '#ffb8b8' : '#cfe0f0';
  const steamY = 314 - (t*30 % 100);
  ctx.beginPath();
  ctx.ellipse(680 + Math.sin(t)*6, steamY, 22, 10, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

/* =========================================================
   ★ 重制：后巷 (Backstreet) · 三层精细版
   ========================================================= */
function drawBackstreetFar(){
  const cut = isPowerCut();
  const blood = isBloodMode();

  ctx.fillStyle = grad(0,0,0,470, blood ? [
    [0,'#0a0308'],[0.4,'#160810'],[1,'#1c0a14']
  ] : [
    [0,'#03060c'],[0.4,'#0a1018'],[1,'#131c26']
  ]);
  ctx.fillRect(0,0,W,470);

  // 高墙
  brickWall(0, 36, W, 434, 68, 24,
    blood ? '#1a0a10' : '#0f1620',
    blood ? 'rgba(60,10,20,0.3)' : 'rgba(0,0,0,0.28)');

  if(!cut && !blood){
    const lg = ctx.createRadialGradient(W/2, 100, 0, W/2, 100, 400);
    lg.addColorStop(0, 'rgba(80, 120, 160, 0.12)');
    lg.addColorStop(1, 'rgba(80, 120, 160, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, 400);
  }
}

function drawBackstreetMid(){
  const cut = isPowerCut();
  const blood = isBloodMode();

  // 消防梯（带锈迹）
  ctx.fillStyle = blood ? '#1a0a0e' : '#1a222c';
  ctx.fillRect(428, 36, 18, 300);
  ctx.fillStyle = blood ? '#241014' : '#242e3a';
  ctx.fillRect(430, 36, 14, 300);
  for(let y=60; y<300; y+=30){
    ctx.fillStyle = 'rgba(100,60,40,0.3)';
    ctx.fillRect(430, y, 14, 4);
  }

  // 后门
  const dx = 580, dy = 130, dw = 184, dh = 334;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(dx - 10, dy - 10, dw + 20, dh + 14);
  ctx.fillStyle = blood ? '#1a0a0e' : '#1a222c';
  ctx.fillRect(dx - 7, dy - 7, dw + 14, dh + 14);
  ctx.fillStyle = blood ? '#241014' : '#232e3a';
  ctx.fillRect(dx - 6, dy - 6, dw + 12, dh + 12);
  ctx.fillStyle = blood ? '#1a0a0e' : '#1a222c';
  ctx.fillRect(dx, dy, dw, dh);
  for(let y = dy + 14; y < dy + dh; y += 16){
    ctx.fillStyle = blood ? 'rgba(60,10,20,0.55)' : 'rgba(0,0,0,0.45)';
    ctx.fillRect(dx + 4, y, dw - 8, 2);
  }
  ctx.strokeStyle = blood ? '#3a1418' : '#28333f'; ctx.lineWidth = 7;
  ctx.strokeRect(dx, dy, dw, dh);
  
  // 门灯
  if(cut || blood){
    ctx.fillStyle = blood ? '#3a0f12' : '#2a2a2a';
    ctx.beginPath(); ctx.ellipse(dx + dw/2, dy - 24, 8, 4, 0, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,215,140,0.95)';
    ctx.beginPath(); ctx.ellipse(dx + dw/2, dy - 24, 8, 4, 0, 0, Math.PI*2); ctx.fill();
    const dg2 = ctx.createRadialGradient(dx + dw/2, dy - 22, 0, dx + dw/2, dy - 22, 260);
    dg2.addColorStop(0,'rgba(255,205,120,0.32)');
    dg2.addColorStop(1,'rgba(255,180,90,0)');
    ctx.fillStyle = dg2;
    ctx.fillRect(dx + dw/2 - 270, dy - 290, 540, 560);
  }

  // 配电房
  const ox = 400, oy = 300, ow = 160, oh = 150;
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(ox, oy, ow, oh);
  ctx.fillStyle = blood ? '#3a1418' : '#3a4552';
  ctx.fillRect(ox, oy, ow, 6);
  ctx.fillRect(ox, oy + oh - 6, ow, 6);
  ctx.fillRect(ox, oy, 6, oh);
  ctx.fillRect(ox + ow - 6, oy, 6, oh);
  ctx.fillStyle = blood ? '#1a0a0e' : '#1b222c';
  ctx.fillRect(ox + 10, oy + 10, ow - 20, oh - 20);

  // 纸箱
  const c1x = 166, c1y = 370, c1w = 160, c1h = 106;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(c1x + c1w/2, c1y + c1h + 3, c1w*0.6, 12, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = blood ? '#1a0c08' : '#28221a'; ctx.fillRect(c1x, c1y, c1w, c1h);
  ctx.fillStyle = blood ? '#221008' : '#38301f'; ctx.fillRect(c1x, c1y, c1w, 15);
  ctx.fillStyle = blood ? '#150a06' : '#252019'; ctx.fillRect(c1x + 42, c1y - 58, 122, 60);
}

function drawBackstreetNear(){
  // 地面
  const cut = isPowerCut();
  const blood = isBloodMode();

  ctx.fillStyle = grad(0, 470, 0, H, blood
    ? [[0,'#1a0810'],[1,'#0a040a']]
    : [[0,'#101822'],[1,'#04070b']]);
  ctx.fillRect(0, 470, W, 70);

  // 积水
  ctx.fillStyle = blood ? 'rgba(80, 10, 20, 0.4)' : 'rgba(60, 90, 130, 0.15)';
  ctx.beginPath(); ctx.ellipse(300, 500, 120, 30, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(680, 520, 80, 20, 0, 0, Math.PI*2); ctx.fill();

  // 落叶/杂物
  for(let i=0; i<15; i++){
    const lx = (i*67)%W;
    const ly = 480 + (i*23)%40;
    ctx.fillStyle = blood ? '#2a0a10' : '#1a1410';
    ctx.beginPath(); ctx.ellipse(lx, ly, 8, 4, i*0.5, 0, Math.PI*2); ctx.fill();
  }
}

function drawBackstreetDynamic(t, dt){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const f = flags();

  // 消防梯滴水
  const dropY = 400 + ((t*160) % 80);
  if(dropY < 470){
    ctx.fillStyle = blood ? 'rgba(220,150,150,0.6)' : 'rgba(180,215,245,0.55)';
    ctx.beginPath(); ctx.ellipse(438, dropY, 2.2, 5, 0, 0, Math.PI*2); ctx.fill();
  }

  // 大橘呼吸
  if(!blood && !f.catGone){
    drawCat(246, 354, t);
  } else if(blood && !f.photo1Taken){
    drawBloodStain(246, 354, t);
  }
}

/* =========================================================
   ★ 重制：便利店 (Shop) · 三层精细版
   ========================================================= */
function drawShopFar(){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const lit = !!flags().lightsOn && !cut && !blood;

  ctx.fillStyle = blood ? '#0a0306' : (lit ? '#121a24' : '#05090f');
  ctx.fillRect(0,0,W,H);

  // 货架
  const shelfYs = [168, 256, 344];
  shelfYs.forEach((y) => {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(110, y + 13, 320, 4);
    ctx.fillStyle = blood ? '#23121a' : (lit ? '#1c2631' : '#090e15');
    ctx.fillRect(110, y, 320, 13);
    ctx.fillRect(110, y, 11, 90);
    ctx.fillRect(419, y, 11, 90);
    
    const colors = blood 
      ? ['#3a1a22', '#2a121a'] 
      : (lit ? ['#8a5a3a', '#5a7a4a', '#4a6a8a', '#8a4a5a'] : ['#0d141c', '#121a24']);
      
    for(let j = 0; j < 7; j++){
      const w0 = 22 + ((j*13) % 10);
      const h0 = 26 + ((j*7) % 16);
      ctx.fillStyle = colors[j % colors.length];
      ctx.fillRect(126 + j*42, y - h0, w0, h0);
      if(lit) {
        ctx.fillStyle = 'rgba(255,240,200,0.15)';
        ctx.fillRect(126 + j*42, y - h0, 3, h0);
      }
    }
  });
}

function drawShopMid(){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const lit = !!flags().lightsOn && !cut && !blood;

  // 收银台
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(616, 334, 304, 8);
  ctx.fillStyle = blood ? '#23121a' : (lit ? '#25303d' : '#0b1118');
  ctx.fillRect(618, 320, 300, 148);
  ctx.fillStyle = blood ? '#2a1218' : (lit ? '#28323e' : '#0c131b');
  ctx.fillRect(680, 256, 96, 66);
  ctx.fillStyle = blood ? '#1a0a10' : (lit ? '#1c2631' : '#091018');
  ctx.fillRect(692, 266, 72, 34);
  
  if(lit){
    ctx.fillStyle = 'rgba(120,200,255,0.22)';
    ctx.fillRect(694, 268, 68, 30);
  }
  if(blood){
    ctx.fillStyle = 'rgba(180,20,30,0.35)';
    ctx.fillRect(694, 268, 68, 30);
  }

  // 后窗
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(46, 184, 142, 162);
  ctx.fillStyle = blood ? '#1a0a10' : (lit ? '#1a2838' : '#050c12');
  ctx.fillRect(52, 190, 130, 150);
  ctx.strokeStyle = blood ? '#3a1418' : '#28343f'; ctx.lineWidth = 5;
  ctx.strokeRect(52, 190, 130, 150);
  ctx.beginPath();
  ctx.moveTo(117, 190); ctx.lineTo(117, 340);
  ctx.moveTo(52, 265); ctx.lineTo(182, 265);
  ctx.stroke();
}

function drawShopNear(){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const lit = !!flags().lightsOn && !cut && !blood;

  // 地板
  ctx.fillStyle = grad(0, 430, 0, H, blood
    ? [[0,'#1a0810'],[1,'#0a040a']]
    : [[0, lit ? '#0e141c' : '#04070b'],[1, '#020406']]);
  ctx.fillRect(0, 430, W, 110);

  // 地砖缝
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
  for(let y=440; y<H; y+=30){
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for(let x=0; x<W; x+=60){
    ctx.beginPath(); ctx.moveTo(x, 430); ctx.lineTo(x, H); ctx.stroke();
  }

  // 爪印
  ctx.fillStyle = blood ? 'rgba(120,20,30,0.3)' : 'rgba(80,60,40,0.28)';
  for(let i=0;i<7;i++){
    const px = 380 + i*28;
    const py = 460 + Math.sin(i*0.9)*4;
    ctx.beginPath(); ctx.ellipse(px, py, 4, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px - 5, py - 6, 2.5, 3, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + 5, py - 6, 2.5, 3, 0, 0, Math.PI*2); ctx.fill();
  }

  // 右侧出口
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(884, 184, 60, 162);
  ctx.fillStyle = '#8a8478';
  ctx.fillRect(890, 190, 50, 150);
  ctx.fillStyle = '#a8b8c0';
  ctx.fillRect(896, 200, 38, 130);
  ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 4;
  ctx.strokeRect(890, 190, 50, 150);
}

function drawShopDynamic(t, dt){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const lit = !!flags().lightsOn && !cut && !blood;

  if(lit){
    const flick = Math.random() > 0.95 ? 0.5 : 1;
    const g2 = ctx.createRadialGradient(470, 400, 0, 470, 400, 640);
    g2.addColorStop(0, `rgba(255,238,196,${0.24 * flick})`);
    g2.addColorStop(1, 'rgba(255,210,150,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
    
    // 浮尘
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for(let i=0; i<15; i++){
      const dx = (i * 73 + t * 10) % W;
      const dy = (i * 47 + Math.sin(t*0.5 + i) * 20 + 100) % H;
      ctx.fillStyle = `rgba(255, 240, 200, ${0.1 + (i%3)*0.05})`;
      ctx.beginPath(); ctx.arc(dx, dy, 1.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  } else if(blood){
    const g2 = ctx.createRadialGradient(470, 400, 0, 470, 400, 640);
    g2.addColorStop(0, 'rgba(140,15,25,0.22)');
    g2.addColorStop(1, 'rgba(80,5,15,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
  }
}

/* =========================================================
   ★ 辅助：画猫、画血渍
   ========================================================= */
function drawCat(x, y, t){
  const breathe = Math.sin(t*1.6) * 1.6;
  ctx.save();
  ctx.translate(x, y + breathe);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(0, 30, 54, 9, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#b96f2c'; ctx.lineWidth = 13; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-40, 4); ctx.quadraticCurveTo(-78, -2, -64, 26); ctx.stroke();
  ctx.fillStyle = '#c9792f';
  ctx.beginPath(); ctx.ellipse(0, 0, 46, 27, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(140,70,20,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 8, 44, 20, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#c9792f';
  ctx.beginPath(); ctx.ellipse(37, -13, 24, 21, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(24,-28); ctx.lineTo(28,-48); ctx.lineTo(43,-29); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(43,-30); ctx.lineTo(55,-47); ctx.lineTo(58,-25); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(70,40,15,0.88)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(41, -14, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(55, -13, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}

function drawBloodStain(x, y, t){
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(70, 6, 12, 0.55)';
  ctx.beginPath(); ctx.ellipse(0, 18, 56, 15, -0.08, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(120, 15, 22, 0.42)';
  ctx.beginPath(); ctx.ellipse(-6, 14, 40, 10, -0.08, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

/* =========================================================
   ★ 场景 SPOTS 定义
   ========================================================= */
const SCENES = {
  /* 新增：棋牌室 */
  parlor: {
    layers: { far: drawParlorFar, mid: drawParlorMid, near: drawParlorNear },
    dynamic: drawParlorDynamic, rain: false,
    spots: [
      { id:'mahjong',  x:380, y:380, w:220, h:140, label:'麻将桌' },
      { id:'window',   x:680, y:100, w:180, h:240, label:'后窗' },
      { id:'clock',    x:100, y:80,  w:80,  h:80,  label:'老挂钟' },
      { id:'exit',     x:884, y:184, w:60,  h:162, label:'离开' }
    ]
  },

  /* 雨巷 */
  alley: {
    layers: { far: drawAlleyFar, mid: drawAlleyMid, near: drawAlleyNear },
    dynamic: drawAlleyDynamic, rain: true,
    spots: [
      { id:'lamp',     x:136, y:88,  w:66,  h:56,  label:'路灯' },
      { id:'wires',    x:200, y:14,  w:400, h:36,  label:'电线' },
      { id:'graffiti', x:28,  y:250, w:84,  h:70,  label:'墙上的字' },
      { id:'trash',    x:610, y:294, w:144, h:212, label:'垃圾桶' },
      { id:'photo1',   x:442, y:470, w:70,  h:56,  label:'湿透的纸片',
        cond: () => !flags().photo1Taken && !flags().bloodMode },
      { id:'puddle',   x:236, y:466, w:190, h:56,  label:'水洼' },
      { id:'bloodExit', x:170, y:520, w:60, h:20, label:'墙根窄缝',
        cond: () => flags().bloodMode },
      { id:'exit',     x:892, y:244, w:52,  h:52,  label:'巷子深处' }
    ]
  },

  /* 后巷 */
  backstreet: {
    layers: { far: drawBackstreetFar, mid: drawBackstreetMid, near: drawBackstreetNear },
    dynamic: drawBackstreetDynamic, rain: true,
    spots: [
      { id:'stairs', x:250, y:36,  w:120, h:180, label:'消防梯' },
      { id:'mold',   x:556, y:262, w:70,  h:70,  label:'墙上的霉斑' },
      { id:'box',    x:166, y:312, w:184, h:170, label:'纸箱' },
      { id:'cat',    x:196, y:288, w:150, h:84, label:'大橘',
        cond: () => !flags().catGone },
      { id:'door',   x:566, y:130, w:210, h:340, label:'后门' },
      { id:'powerDoor', x:390, y:290, w:180, h:170, label:'配电房' },
      { id:'back',   x:16,  y:244, w:52,  h:52,  label:'回到雨巷' }
    ]
  },

  /* 便利店 */
  shop: {
    layers: { far: drawShopFar, mid: drawShopMid, near: drawShopNear },
    dynamic: drawShopDynamic, rain: false,
    spots: [
      { id:'poster',  x:490, y:100, w:90,  h:110, label:'墙上海报' },
      { id:'counter', x:618, y:248, w:300, h:220, label:'收银台' },
      { id:'shelf',   x:100, y:148, w:340, h:266, label:'货架' },
      { id:'floor',   x:360, y:440, w:220, h:80,  label:'地板' },
      { id:'window',  x:16,  y:244, w:52,  h:52,  label:'后窗' },
      { id:'back',    x:16,  y:456, w:88,  h:72,  label:'回到后巷' }
    ]
  },

  /* 街道 */
  street: {
    draw: function(t) {
      // 保底结构，如果没拆分
      ctx.fillStyle = '#04070e'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#1a222c'; ctx.fillRect(0, 300, W, 240);
    },
    dynamic: function(t, dt) {}, rain: true,
    spots: [
      { id:'lamp',    x:145, y:240, w:40,  h:90,  label:'路灯' },
      { id:'power',   x:224, y:250, w:76,  h:180, label:'配电房' },
      { id:'under',   x:128, y:356, w:88,  h:66,  label:'地下通道' },
      { id:'river',   x:0,   y:376, w:68,  h:68,  label:'河堤' },
      { id:'gate',    x:520, y:148, w:360, h:382, label:'铁门' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回后巷' }
    ]
  },

  /* 门前 */
  doorstep: {
    draw: function(t) {
      ctx.fillStyle = '#0a1018'; ctx.fillRect(0,0,W,H);
    },
    dynamic: function(t, dt) {}, rain: false,
    spots: [
      { id:'window', x:280, y:240, w:100, h:120, label:'窗户' },
      { id:'lamp',   x:445, y:284, w:70,  h:44,  label:'门灯' },
      { id:'door',   x:425, y:320, w:110, h:140, label:'门' },
      { id:'steps',  x:400, y:456, w:160, h:44,  label:'台阶' },
      { id:'back',   x:16,  y:244, w:52,  h:52,  label:'回到街道' }
    ]
  },

  /* 红屋顶 */
  house: {
    draw: function(t) {
      ctx.fillStyle = '#2e2218'; ctx.fillRect(0,0,W,H);
    },
    dynamic: function(t, dt) {}, rain: false,
    spots: [
      { id:'back',   x:16,  y:244, w:52,  h:52,  label:'回到门前' },
      { id:'window', x:76,  y:84,  w:222, h:222, label:'窗户' },
      { id:'clock',  x:504, y:84,  w:74,  h:74,  label:'挂钟' },
      { id:'books',  x:56,  y:296, w:50,  h:150, label:'书架' },
      { id:'lamp',   x:800, y:256, w:104, h:190, label:'台灯' },
      { id:'frame',  x:404, y:238, w:132, h:122, label:'相框' },
      { id:'chair',  x:106, y:292, w:146, h:154, label:'摇椅' },
      { id:'bowl',   x:258, y:472, w:90,  h:46,  label:'小碗' }
    ]
  },

  /* 辅助场景保底结构 */
  powerstation: {
    draw: function(t){ ctx.fillStyle = '#0a0d12'; ctx.fillRect(0,0,W,H); },
    dynamic: function(){}, rain: false,
    spots: [
      { id:'breaker', x:460, y:140, w:140, h:140, label:'电闸' },
      { id:'fuse',    x:60,  y:200, w:120, h:180, label:'保险丝盒' },
      { id:'log',     x:720, y:320, w:200, h:120, label:'工作日志' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回去' }
    ]
  },
  rooftop: {
    draw: function(t){ ctx.fillStyle = '#02040a'; ctx.fillRect(0,0,W,H); },
    dynamic: function(){}, rain: false,
    spots: [
      { id:'antenna',  x:100, y:180, w:80,  h:260, label:'旧天线' },
      { id:'watertank',x:780, y:210, w:130, h:130, label:'水塔' },
      { id:'hang',     x:350, y:240, w:180, h:80,  label:'晾衣架' },
      { id:'houseroof',x:590, y:200, w:120, h:130, label:'远处的红屋顶' },
      { id:'back',     x:16,  y:244, w:52,  h:52,  label:'回到后巷' }
    ]
  },
  underpass: {
    draw: function(t){ ctx.fillStyle = '#050810'; ctx.fillRect(0,0,W,H); },
    dynamic: function(){}, rain: false,
    spots: [
      { id:'stairs',     x:60,  y:240, w:120, h:160, label:'上方的楼梯' },
      { id:'graffiti',   x:220, y:290, w:80,  h:120, label:'墙上的涂鸦' },
      { id:'emergency',  x:180, y:160, w:80,  h:40,  label:'应急灯' },
      { id:'trash',      x:540, y:410, w:100, h:90,  label:'垃圾桶' },
      { id:'room',       x:820, y:240, w:100, h:160, label:'配电房的门' },
      { id:'back',       x:16,  y:244, w:52,  h:52,  label:'回到街道' }
    ]
  },
  riverside: {
    draw: function(t){ ctx.fillStyle = '#040710'; ctx.fillRect(0,0,W,H); },
    dynamic: function(){}, rain: true,
    spots: [
      { id:'lamp',    x:56,  y:300, w:60,  h:120, label:'路灯' },
      { id:'bench',   x:230, y:440, w:150, h:100, label:'长椅' },
      { id:'umbrella',x:660, y:440, w:100, h:80,  label:'丢弃的伞' },
      { id:'river',   x:400, y:470, w:200, h:60,  label:'河面' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回到街道' }
    ]
  },
  neighbor: {
    draw: function(t){ ctx.fillStyle = '#0a0706'; ctx.fillRect(0,0,W,H); },
    dynamic: function(){}, rain: false,
    spots: [
      { id:'neighborWindow',   x:300, y:150, w:300, h:260, label:'窗户' },
      { id:'neighborCalendar', x:92,  y:162, w:86,  h:108, label:'日历' },
      { id:'neighborFloor',    x:260, y:462, w:280, h:76,  label:'地板上的爪印' },
      { id:'neighborBed',      x:672, y:314, w:256, h:172, label:'小床' },
      { id:'back',             x:16,  y:456, w:100, h:84,  label:'来的路' },
      { id:'exit',             x:856, y:236, w:96,  h:138, label:'通向院子的门' }
    ]
  }
};

window.__SCENES__ = Object.assign({ setCtx, getCtx }, SCENES);
})()