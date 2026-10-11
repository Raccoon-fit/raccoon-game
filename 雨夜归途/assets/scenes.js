/* =========================================================
   scenes.js — 2D 场景绘制 + 定义
   依赖 window.S
   + 白天场景：alley_day / backstreet_day / shop_day / street_day / doorstep_day / house_day
   + 老人身影：6 个场景的远景人物
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

/* ================== 工具 ================== */
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
  ctx.fillStyle = 'rgba(255,255,255,0.018)';
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
   ★ 老人身影 —— 远景人物
   在每个场景的背景里画一个模糊的雨衣身影
   ========================================================= */
function drawSilhouette(x, y, scale, alpha){
  alpha = alpha === undefined ? 0.85 : alpha;
  scale = scale || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  /* 影子 */
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 22, 5, 0, 0, Math.PI*2);
  ctx.fill();

  /* 雨衣 —— 深色 */
  ctx.fillStyle = '#0a0e14';
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-16, -62);
  ctx.lineTo(-8, -74);
  ctx.lineTo(8, -74);
  ctx.lineTo(16, -62);
  ctx.lineTo(20, 0);
  ctx.closePath();
  ctx.fill();

  /* 雨衣的褶 */
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, -60); ctx.lineTo(-12, -6);
  ctx.moveTo(6, -60); ctx.lineTo(8, -6);
  ctx.stroke();

  /* 兜帽 —— 圆 */
  ctx.fillStyle = '#080b10';
  ctx.beginPath();
  ctx.arc(0, -84, 13, 0, Math.PI*2);
  ctx.fill();

  /* 帽檐 */
  ctx.fillStyle = '#050709';
  ctx.beginPath();
  ctx.ellipse(0, -78, 19, 4.5, 0, 0, Math.PI*2);
  ctx.fill();

  /* 一点点亮的反射 —— 看不出脸，只有一点反光 */
  ctx.fillStyle = 'rgba(140,170,200,0.18)';
  ctx.beginPath();
  ctx.arc(-3, -84, 4, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

/* =========================================================
   雨巷
   ========================================================= */
function drawAlleyStatic(){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const f = flags();

  ctx.fillStyle = grad(0,0,0,440, blood ? [
    [0,'#0a0308'],[0.35,'#160810'],[0.7,'#1c0a14'],[1,'#1c0e18']
  ] : [
    [0,'#040710'],[0.35,'#0a1420'],[0.7,'#101c2c'],[1,'#1a2534']
  ]);
  ctx.fillRect(0,0,W,440);

  for(let i=0;i<5;i++){
    const cx = 100 + i*180, cy = 26 + Math.sin(i*1.3)*18;
    ctx.fillStyle = blood
      ? `rgba(70,20,30,${0.25 + 0.08*(i%2)})`
      : `rgba(28,42,62,${0.25 + 0.08*(i%2)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 240 - i*10, 32 + (i%3)*4, 0, 0, Math.PI*2);
    ctx.fill();
  }

  const skyline = [
    { x:0,   y:200, w:120, h:250 },
    { x:140, y:230, w:130, h:210 },
    { x:290, y:180, w:140, h:260 },
    { x:450, y:210, w:120, h:230 },
    { x:590, y:160, w:150, h:280 },
    { x:760, y:200, w:130, h:240 },
    { x:900, y:230, w:80,  h:210 }
  ];
  skyline.forEach(b => {
    ctx.fillStyle = blood ? '#120610' : '#060a10';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if(b.w > 120){
      ctx.fillStyle = blood ? '#0a0308' : '#040810';
      ctx.fillRect(b.x + 12, b.y - 16, 24, 16);
      ctx.fillRect(b.x + 44, b.y - 10, 18, 10);
    }
  });

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
    const emLit = cut && (i*13 + 7) % 31 === 0;
    if(lit){
      ctx.fillStyle = blood ? 'rgba(220,80,90,0.55)' : 'rgba(255,190,110,0.5)';
      ctx.fillRect(w0[0], w0[1], 12, 18);
    } else if(emLit){
      ctx.fillStyle = blood ? 'rgba(180,50,60,0.45)' : 'rgba(255,180,90,0.4)';
      ctx.fillRect(w0[0], w0[1], 12, 18);
    } else {
      ctx.fillStyle = blood ? 'rgba(30,10,20,0.9)' : 'rgba(20,28,40,0.85)';
      ctx.fillRect(w0[0], w0[1], 12, 18);
    }
  });

  /* 红屋顶 */
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
  }

  /* ★ 老人身影 —— 巷子尽头 */
  const silhouetteVisible = flags().seenSilhouettes && flags().seenSilhouettes.indexOf('alley') >= 0;
  if(silhouetteVisible && !isBloodMode()){
    drawSilhouette(860, 470, 1.0, 0.85);
  }

  /* 左墙 */
  brickWall(0, 16, 160, 524, 60, 22,
    blood ? '#1a0a14' : '#131a23',
    blood ? 'rgba(60,10,20,0.35)' : 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grad(0, 380, 0, 540, [
    [0,'rgba(0,0,0,0)'],[1, blood ? 'rgba(40,5,10,0.7)' : 'rgba(0,0,0,0.6)']
  ]);
  ctx.fillRect(0, 380, 160, 160);

  for(let i=0;i<20;i++){
    const mx = 6 + (i*43)%148;
    const my = 60 + (i*67)%430;
    ctx.fillStyle = blood
      ? `rgba(140,20,30,${0.10 + (i%4)*0.04})`
      : `rgba(70,110,80,${0.08 + (i%4)*0.03})`;
    ctx.beginPath();
    ctx.ellipse(mx, my, 6 + (i%4)*3, 4 + (i%3)*2, 0, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(38, 220); ctx.rotate(-0.05);
  ctx.fillStyle = blood ? 'rgba(200,30,40,0.4)' : 'rgba(160,140,110,0.15)';
  ctx.fillRect(0, 0, 48, 64);
  ctx.fillStyle = blood ? 'rgba(140,15,25,0.55)' : 'rgba(100,90,75,0.22)';
  ctx.fillRect(6, 8, 36, 26);
  ctx.restore();

  /* 路灯 */
  ctx.fillStyle = blood ? '#1a0c0c' : '#141b25'; ctx.fillRect(164, 116, 9, 336);
  ctx.fillStyle = blood ? '#241414' : '#1c2531';
  ctx.beginPath();
  ctx.moveTo(146, 120); ctx.lineTo(190, 120);
  ctx.lineTo(182, 96); ctx.lineTo(154, 96);
  ctx.closePath(); ctx.fill();
  if(cut || blood){
    ctx.fillStyle = blood ? '#180808' : '#2a2a2a';
    ctx.beginPath(); ctx.ellipse(168, 124, 8, 4.5, 0, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,214,140,0.95)';
    ctx.beginPath(); ctx.ellipse(168, 124, 8, 4.5, 0, 0, Math.PI*2); ctx.fill();
    const lg = ctx.createRadialGradient(168, 124, 0, 168, 124, 340);
    lg.addColorStop(0,'rgba(255,208,130,0.32)');
    lg.addColorStop(0.3,'rgba(255,195,110,0.12)');
    lg.addColorStop(1,'rgba(255,180,90,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(-180,-220,700,700);
  }

  /* 垃圾桶 */
  const bx = 618, by = 314, bw = 126, bh = 180;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(bx+bw/2, by+bh+2, bw*0.6, 15, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = blood ? '#1a0a0e' : '#1e2631';
  ctx.beginPath();
  ctx.moveTo(bx+7, by+16); ctx.lineTo(bx+bw-7, by+16);
  ctx.lineTo(bx+bw-16, by+bh); ctx.lineTo(bx+16, by+bh);
  ctx.closePath(); ctx.fill();
  for(let i=1;i<4;i++){
    ctx.strokeStyle = blood ? 'rgba(80,15,25,0.5)' : 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    const x = bx + 12 + i*27;
    ctx.beginPath();
    ctx.moveTo(x, by+24); ctx.lineTo(x-4, by+bh-8);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(180,210,240,0.08)';
  ctx.fillRect(bx+18, by+30, 12, 128);
  ctx.fillStyle = blood ? '#2a1218' : '#252e3a';
  ctx.beginPath(); ctx.ellipse(bx+bw/2, by+14, bw/2, 15, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = blood ? '#3a1a22' : '#364352';
  ctx.beginPath(); ctx.ellipse(bx+bw/2, by+10, bw/2-10, 9, 0, 0, Math.PI*2); ctx.fill();

  /* 地面 */
  ctx.fillStyle = grad(0, 440, 0, H, blood
    ? [[0,'#1a0810'],[1,'#0a040a']]
    : [[0,'#121a24'],[1,'#04070b']]);
  ctx.fillRect(0, 440, W, 100);
  ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1;
  for(let x = -60; x < W+80; x += 120){
    ctx.beginPath();
    ctx.moveTo(x, 440); ctx.lineTo(x+40, H);
    ctx.stroke();
  }

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(330, 492, 100, 22, 0, 0, Math.PI*2);
  const pg = ctx.createRadialGradient(330, 492, 0, 330, 492, 100);
  pg.addColorStop(0, blood ? 'rgba(120,15,25,0.45)' : 'rgba(100,140,190,0.22)');
  pg.addColorStop(1, blood ? 'rgba(80,5,15,0)' : 'rgba(60,90,130,0)');
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.restore();

  const eg = ctx.createLinearGradient(856, 0, W, 0);
  eg.addColorStop(0,'rgba(3,6,10,0)');
  eg.addColorStop(1, blood ? 'rgba(20,2,6,0.96)' : 'rgba(3,6,10,0.96)');
  ctx.fillStyle = eg;
  ctx.fillRect(856, 0, 104, H);
}

function drawAlleyDynamic(t, dt){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const f = flags();
  const sway = Math.sin(t*0.9)*3;
  ctx.strokeStyle = blood ? 'rgba(60,15,20,0.7)' : 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.quadraticCurveTo(200 + sway, 60, 380, 22);
  ctx.quadraticCurveTo(560, -8, 720, 34);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 44);
  ctx.quadraticCurveTo(200 + sway, 74, 380, 36);
  ctx.quadraticCurveTo(560, 6, 720, 48);
  ctx.stroke();

  if(!f.photo1Taken && !blood){
    ctx.save();
    ctx.translate(474, 498); ctx.rotate(-0.17);
    ctx.fillStyle = '#b9b3a0';
    ctx.fillRect(-26, -18, 52, 36);
    ctx.fillStyle = '#7d7869';
    ctx.fillRect(-20, -12, 40, 19);
    ctx.fillStyle = '#a8a292';
    ctx.fillRect(-20, 9, 26, 7);
    ctx.restore();
  }

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
   ★ 白天雨巷 —— 第二天早上
   ========================================================= */
function drawAlleyDayStatic(){
  ctx.fillStyle = grad(0, 0, 0, 440, [
    [0,   '#7a8a98'],
    [0.30,'#a8b4bc'],
    [0.55,'#d0c4b0'],
    [0.80,'#e8d2b0'],
    [1,   '#f0d8b8']
  ]);
  ctx.fillRect(0, 0, W, 440);

  for(let i=0;i<6;i++){
    const cx = 60 + i*170, cy = 30 + Math.sin(i*1.3)*22;
    ctx.fillStyle = 'rgba(245,235,225,' + (0.35 + 0.08*(i%2)) + ')';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 200 - i*8, 26 + (i%3)*5, 0, 0, Math.PI*2);
    ctx.fill();
  }

  const skyline = [
    { x:0,   y:200, w:120, h:250 },
    { x:140, y:230, w:130, h:210 },
    { x:290, y:180, w:140, h:260 },
    { x:450, y:210, w:120, h:230 },
    { x:590, y:160, w:150, h:280 },
    { x:760, y:200, w:130, h:240 },
    { x:900, y:230, w:80,  h:210 }
  ];
  skyline.forEach((b, bi) => {
    const shade = ['#6a7684','#5c6878','#748090','#606c78'][bi % 4];
    ctx.fillStyle = shade;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,235,200,0.45)';
    ctx.fillRect(b.x, b.y, b.w, 2);
  });

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
    const lit = (i*13 + 7) % 11 === 0;
    if(lit){
      ctx.fillStyle = 'rgba(255,220,150,0.85)';
      ctx.fillRect(w0[0], w0[1], 12, 18);
    } else {
      ctx.fillStyle = 'rgba(50,62,78,0.85)';
      ctx.fillRect(w0[0], w0[1], 12, 18);
      ctx.fillStyle = 'rgba(220,230,240,0.25)';
      ctx.fillRect(w0[0], w0[1], 4, 18);
    }
  });

  const hx = 780, hy = 210;
  ctx.fillStyle = '#7a2818';
  ctx.beginPath();
  ctx.moveTo(hx-28, hy); ctx.lineTo(hx+42, hy-78); ctx.lineTo(hx+112, hy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b84030';
  ctx.beginPath();
  ctx.moveTo(hx-22, hy); ctx.lineTo(hx+42, hy-72); ctx.lineTo(hx+106, hy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8d8b8';
  ctx.fillRect(hx, hy, 84, 82);
  ctx.fillStyle = 'rgba(255,240,200,0.95)';
  ctx.fillRect(hx+28, hy+28, 28, 34);

  brickWall(0, 16, 160, 524, 60, 22,
    '#9a8870',
    'rgba(70,50,30,0.35)');

  ctx.save();
  ctx.translate(38, 220); ctx.rotate(-0.05);
  ctx.fillStyle = 'rgba(200,180,140,0.5)';
  ctx.fillRect(0, 0, 48, 64);
  ctx.strokeStyle = 'rgba(240,235,220,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(8, 12); ctx.lineTo(38, 12);
  ctx.moveTo(8, 22); ctx.lineTo(32, 22);
  ctx.moveTo(8, 32); ctx.lineTo(40, 32);
  ctx.moveTo(8, 42); ctx.lineTo(28, 42);
  ctx.moveTo(8, 52); ctx.lineTo(44, 52);
  ctx.stroke();
  ctx.restore();

  /* 路灯 */
  ctx.fillStyle = '#4a5058';
  ctx.fillRect(164, 116, 9, 336);
  ctx.fillStyle = '#3a4048';
  ctx.beginPath();
  ctx.moveTo(146, 120); ctx.lineTo(190, 120);
  ctx.lineTo(182, 96); ctx.lineTo(154, 96);
  ctx.closePath(); ctx.fill();

  /* 翻倒的垃圾桶 */
  const bx = 618, by = 314, bw = 126, bh = 180;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(bx+bw/2, by+bh+2, bw*0.6, 15, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.save();
  ctx.translate(bx + bw/2, by + bh/2);
  ctx.rotate(-0.35);
  ctx.fillStyle = '#4a4a48';
  ctx.beginPath();
  ctx.moveTo(-40, -80); ctx.lineTo(40, -80);
  ctx.lineTo(36, 80); ctx.lineTo(-36, 80);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5a5a58';
  ctx.beginPath();
  ctx.ellipse(-60, 60, 44, 12, 0.3, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  /* 小猫 */
  drawDayCat(bx - 40, by + bh - 30);

  /* 地面 */
  ctx.fillStyle = grad(0, 440, 0, H, [
    [0, '#8a98a2'],
    [0.5, '#6a7882'],
    [1, '#4a5860']
  ]);
  ctx.fillRect(0, 440, W, 100);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  for(let y = 460; y < H; y += 30){
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.stroke();
  }

  /* 水洼 */
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(330, 492, 110, 24, 0, 0, Math.PI*2);
  const pg = ctx.createRadialGradient(330, 492, 0, 330, 492, 110);
  pg.addColorStop(0, 'rgba(150,180,200,0.55)');
  pg.addColorStop(0.5, 'rgba(100,140,170,0.35)');
  pg.addColorStop(1, 'rgba(80,110,140,0)');
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.fillStyle = 'rgba(180,200,220,0.35)';
  ctx.fillRect(300, 480, 60, 3);
  ctx.restore();

  /* 阳光 */
  const lg = ctx.createLinearGradient(856, 0, 600, 500);
  lg.addColorStop(0, 'rgba(255,230,180,0)');
  lg.addColorStop(0.5, 'rgba(255,225,170,0.20)');
  lg.addColorStop(1, 'rgba(255,220,160,0.45)');
  ctx.fillStyle = lg;
  ctx.fillRect(600, 0, W-600, H);

  const eg = ctx.createLinearGradient(856, 0, W, 0);
  eg.addColorStop(0, 'rgba(255,240,200,0)');
  eg.addColorStop(1, 'rgba(255,240,200,0.55)');
  ctx.fillStyle = eg;
  ctx.fillRect(856, 0, 104, H);
}

function drawDayCat(x, y){
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 26, 32, 6, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#d8964e';
  ctx.beginPath();
  ctx.ellipse(0, 0, 28, 18, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.strokeStyle = '#b87832';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-24, 8);
  ctx.quadraticCurveTo(-38, 4, -34, 20);
  ctx.stroke();

  ctx.fillStyle = '#d8964e';
  ctx.beginPath();
  ctx.ellipse(20, -6, 16, 14, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(10, -18); ctx.lineTo(12, -30); ctx.lineTo(22, -20);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(26, -19); ctx.lineTo(34, -30); ctx.lineTo(34, -16);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = '#3a2818';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(15, -6, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(26, -7, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.fillStyle = '#7a3828';
  ctx.beginPath();
  ctx.moveTo(20, 0); ctx.lineTo(22, 0); ctx.lineTo(21, 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawAlleyDayDynamic(t, dt){
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for(let i=0;i<24;i++){
    const x = (i * 83 + t * 8) % W;
    const y = (i * 137 + Math.sin(t*0.5 + i) * 20 + 200) % H;
    ctx.fillStyle = 'rgba(255,240,200,' + (0.15 + (i%3)*0.08) + ')';
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i%2)*0.8, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

/* =========================================================
   ★ 白天后巷
   ========================================================= */
function drawBackstreetDayStatic(){
  /* 天空 */
  ctx.fillStyle = grad(0, 0, 0, 470, [
    [0, '#8a98a4'],
    [0.4, '#b8c0c8'],
    [0.75, '#e0d0b8'],
    [1, '#f0d8b8']
  ]);
  ctx.fillRect(0, 0, W, 470);

  /* 云 */
  for(let i=0;i<5;i++){
    const cx = 100 + i*200, cy = 40 + (i%2)*20;
    ctx.fillStyle = 'rgba(248,240,230,' + (0.35 + 0.08*(i%2)) + ')';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 180, 26, 0, 0, Math.PI*2);
    ctx.fill();
  }

  /* 墙面 */
  brickWall(0, 36, W, 434, 68, 24,
    '#9a8a72',
    'rgba(70,50,30,0.35)');

  /* 消防梯 */
  ctx.strokeStyle = '#3a4048';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(230, 60); ctx.lineTo(230, 420);
  ctx.moveTo(340, 60); ctx.lineTo(340, 420);
  ctx.moveTo(230, 60); ctx.lineTo(340, 60);
  ctx.moveTo(230, 420); ctx.lineTo(340, 420);
  ctx.stroke();
  ctx.lineWidth = 2;
  for(let y = 100; y < 420; y += 30){
    ctx.beginPath();
    ctx.moveTo(230, y); ctx.lineTo(340, y);
    ctx.stroke();
  }

  /* 纸箱 */
  ctx.fillStyle = '#c8a878';
  ctx.fillRect(180, 320, 90, 90);
  ctx.fillStyle = '#b89868';
  ctx.fillRect(180, 320, 90, 12);
  ctx.fillStyle = '#a88858';
  ctx.fillRect(180, 400, 90, 10);

  ctx.fillStyle = '#d0b080';
  ctx.fillRect(240, 370, 70, 60);
  ctx.fillStyle = '#c0a068';
  ctx.fillRect(240, 370, 70, 10);

  /* 后门 */
  const dx = 580, dy = 130, dw = 184, dh = 334;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(dx + 6, dy + 6, dw, dh);
  ctx.fillStyle = '#5a4830';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.strokeStyle = '#3a2818';
  ctx.lineWidth = 5;
  ctx.strokeRect(dx, dy, dw, dh);
  ctx.beginPath();
  ctx.moveTo(dx, dy + dh/2); ctx.lineTo(dx + dw, dy + dh/2);
  ctx.stroke();
  ctx.fillStyle = '#8f7736';
  ctx.beginPath();
  ctx.arc(dx + dw - 20, dy + dh/2 + 20, 8, 0, Math.PI*2);
  ctx.fill();

  /* 配电房小门 */
  const ox = 400, oy = 300, ow = 160, oh = 150;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(ox + 6, oy + 6, ow, oh);
  ctx.fillStyle = '#3a4858';
  ctx.fillRect(ox, oy, ow, oh);
  ctx.strokeStyle = '#222c38';
  ctx.lineWidth = 5;
  ctx.strokeRect(ox, oy, ow, oh);
  /* 配电牌 */
  const sx = ox + 42, sy = oy + 30;
  ctx.fillStyle = 'rgba(200,50,40,0.9)';
  ctx.fillRect(sx, sy, 78, 26);
  ctx.fillStyle = 'rgba(255,235,200,0.98)';
  ctx.font = 'bold 14px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('配 电', sx + 39, sy + 14);

  /* 地面 */
  ctx.fillStyle = grad(0, 470, 0, H, [
    [0, '#9a9890'],
    [0.5, '#7a7870'],
    [1, '#5a5850']
  ]);
  ctx.fillRect(0, 470, W, 70);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  for(let y = 485; y < H; y += 15){
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.stroke();
  }

  /* 阳光斜射 */
  const lg = ctx.createLinearGradient(0, 0, 400, 540);
  lg.addColorStop(0, 'rgba(255,235,190,0.35)');
  lg.addColorStop(1, 'rgba(255,235,190,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);

  /* 暗角 */
  const vg = ctx.createRadialGradient(W/2, H/2, H*0.4, W/2, H/2, H*0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(60,50,40,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function drawBackstreetDayDynamic(t, dt){
  /* 猫在阳光下打盹，轻微呼吸 */
  const breathe = Math.sin(t * 1.4) * 1.2;
  ctx.save();
  ctx.translate(340, 430 + breathe);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 46, 8, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#d8964e';
  ctx.beginPath();
  ctx.ellipse(0, 0, 40, 22, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#d8964e';
  ctx.beginPath();
  ctx.ellipse(30, -10, 18, 16, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(22, -22); ctx.lineTo(24, -34); ctx.lineTo(34, -24);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3a2818';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(26, -12, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.beginPath();
  ctx.arc(38, -13, 3, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}

/* =========================================================
   ★ 白天便利店
   ========================================================= */
function drawShopDayStatic(){
  /* 地板 —— 白瓷砖 */
  ctx.fillStyle = '#d8d8d0';
  ctx.fillRect(0, 0, W, 460);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 60){
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 460); ctx.stroke();
  }
  for(let y = 0; y < 460; y += 60){
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  /* 天花板 */
  ctx.fillStyle = '#e8e8e4';
  ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = '#c8c8c0';
  ctx.fillRect(0, 56, W, 6);

  /* 顶灯 */
  for(let i = 0; i < 2; i++){
    ctx.fillStyle = '#f8f4e8';
    ctx.fillRect(180 + i*400, 40, 200, 14);
    ctx.strokeStyle = '#a8a8a0';
    ctx.lineWidth = 1;
    ctx.strokeRect(180 + i*400, 40, 200, 14);
  }

  /* 货架 */
  const shelfYs = [168, 256, 344];
  shelfYs.forEach(y => {
    ctx.fillStyle = '#a8a8a8';
    ctx.fillRect(110, y, 320, 13);
    ctx.fillRect(110, y, 11, 90);
    ctx.fillRect(419, y, 11, 90);
    for(let j = 0; j < 7; j++){
      const w0 = 22 + ((j*13) % 10);
      const h0 = 26 + ((j*7) % 16);
      const hues = ['#c9d4e2', '#e2c8a8', '#c8e2c4', '#e2c8d4', '#e2dcc8', '#c8dde2', '#d8d4c8'];
      ctx.fillStyle = hues[j % hues.length];
      ctx.fillRect(126 + j*42, y - h0, w0, h0);
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.strokeRect(126 + j*42, y - h0, w0, h0);
    }
  });

  /* 收银台 */
  ctx.fillStyle = '#9a8a72';
  ctx.fillRect(618, 320, 300, 148);
  ctx.fillStyle = '#b0a088';
  ctx.fillRect(618, 320, 300, 16);
  ctx.fillStyle = '#6a5a48';
  ctx.fillRect(680, 256, 96, 66);
  ctx.fillStyle = '#2a3548';
  ctx.fillRect(692, 266, 72, 34);
  ctx.fillStyle = 'rgba(140,200,240,0.4)';
  ctx.fillRect(694, 268, 68, 30);

  /* 后窗 */
  ctx.fillStyle = '#a8c8d8';
  ctx.fillRect(52, 190, 130, 150);
  ctx.strokeStyle = '#5a6878';
  ctx.lineWidth = 5;
  ctx.strokeRect(52, 190, 130, 150);
  ctx.beginPath();
  ctx.moveTo(117, 190); ctx.lineTo(117, 340);
  ctx.moveTo(52, 265); ctx.lineTo(182, 265);
  ctx.stroke();
  /* 窗外是亮的天空 */
  ctx.fillStyle = 'rgba(255,245,220,0.6)';
  ctx.fillRect(56, 194, 122, 142);

  /* 清晨的阳光透进来 */
  const lg = ctx.createLinearGradient(0, 0, 400, 540);
  lg.addColorStop(0, 'rgba(255,235,180,0.28)');
  lg.addColorStop(1, 'rgba(255,235,180,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);

  /* 老周在柜台 */
  drawDayOldMan(720, 310);
}

function drawDayOldMan(x, y){
  ctx.save();
  ctx.translate(x, y);

  /* 影子 */
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 36, 7, 0, 0, Math.PI*2);
  ctx.fill();

  /* 身体 —— 灰色毛衣 */
  ctx.fillStyle = '#7a7870';
  ctx.beginPath();
  ctx.moveTo(-28, 0);
  ctx.lineTo(-24, -70);
  ctx.lineTo(24, -70);
  ctx.lineTo(28, 0);
  ctx.closePath();
  ctx.fill();

  /* 手臂 —— 撑在柜台上 */
  ctx.fillStyle = '#6a6860';
  ctx.fillRect(-38, -50, 14, 50);
  ctx.fillRect(24, -50, 14, 50);

  /* 头 */
  ctx.fillStyle = '#e8d0b0';
  ctx.beginPath();
  ctx.arc(0, -84, 16, 0, Math.PI*2);
  ctx.fill();

  /* 头发 —— 花白 */
  ctx.fillStyle = '#c8c4bc';
  ctx.beginPath();
  ctx.arc(0, -90, 16, Math.PI, 0);
  ctx.fill();

  /* 眼睛 —— 闭着 */
  ctx.strokeStyle = '#5a5040';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-6, -84, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.beginPath();
  ctx.arc(6, -84, 2.5, 0.2, Math.PI - 0.2); ctx.stroke();

  /* 围裙 */
  ctx.fillStyle = '#a87858';
  ctx.beginPath();
  ctx.moveTo(-20, -60);
  ctx.lineTo(20, -60);
  ctx.lineTo(24, 0);
  ctx.lineTo(-24, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawShopDayDynamic(t, dt){
  /* 老周轻微呼吸 */
  const breathe = Math.sin(t * 1.2) * 1;
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(720, 220 + breathe, 40, 3, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

/* =========================================================
   ★ 白天街道
   ========================================================= */
function drawStreetDayStatic(){
  /* 天空 */
  ctx.fillStyle = grad(0, 0, 0, 470, [
    [0, '#9aa8b4'],
    [0.4, '#c0c8d0'],
    [0.75, '#e8d8c0'],
    [1, '#f4dcc0']
  ]);
  ctx.fillRect(0, 0, W, 470);

  /* 建筑 */
  ctx.fillStyle = '#a8b0b8';
  ctx.fillRect(0, 178, 244, 292);
  ctx.fillRect(876, 136, 84, 334);
  ctx.fillStyle = '#b8c0c8';
  ctx.fillRect(230, 200, 140, 270);
  ctx.fillRect(390, 170, 120, 300);
  ctx.fillRect(540, 190, 120, 280);

  /* 窗户 */
  const farWins = [];
  for(let i=0;i<3;i++){
    for(let j=0;j<3;j++){
      farWins.push([30 + i*70, 218 + j*82, 26, 34]);
      farWins.push([898 + i*20, 190 + j*92, 16, 26]);
      farWins.push([250 + i*44, 240 + j*80, 20, 26]);
      farWins.push([410 + i*36, 210 + j*84, 18, 24]);
    }
  }
  farWins.forEach((w0, i) => {
    const dark = (i * 7 + 3) % 5 === 0;
    if(dark){
      ctx.fillStyle = 'rgba(60,70,80,0.85)';
      ctx.fillRect(w0[0], w0[1], w0[2], w0[3]);
    } else {
      ctx.fillStyle = 'rgba(180,200,220,0.55)';
      ctx.fillRect(w0[0], w0[1], w0[2], w0[3]);
      ctx.fillStyle = 'rgba(255,250,230,0.45)';
      ctx.fillRect(w0[0], w0[1], w0[2], 4);
    }
  });

  /* 红屋顶房子 */
  ctx.fillStyle = '#8a3828';
  ctx.beginPath();
  ctx.moveTo(630, 258); ctx.lineTo(720, 186); ctx.lineTo(810, 258);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b84030';
  ctx.beginPath();
  ctx.moveTo(638, 258); ctx.lineTo(720, 192); ctx.lineTo(802, 258);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8d8b8';
  ctx.fillRect(654, 258, 132, 122);
  ctx.fillStyle = 'rgba(120,180,220,0.7)';
  ctx.fillRect(700, 292, 40, 46);

  /* 铁门 —— 开着 */
  const gx = 520, gy = 168, gw = 360, gh = 362;
  ctx.fillStyle = '#6a7078';
  ctx.fillRect(gx, gy, 26, gh);
  ctx.fillRect(gx + gw - 26, gy, 26, gh);
  ctx.fillRect(gx, gy, gw, 22);
  /* 铁门中央敞开 */
  ctx.fillStyle = 'rgba(154,140,110,0.35)';
  ctx.fillRect(gx + 26, gy + 22, gw - 52, gh - 40);
  for(let i = 0; i < 8; i++){
    const x = gx + 60 + i * 40;
    ctx.fillStyle = '#6a7078';
    ctx.fillRect(x, gy + 22, 6, gh - 40);
  }

  /* 门口台阶 */
  ctx.fillStyle = '#a8a098';
  ctx.fillRect(600, 400, 240, 20);
  ctx.fillStyle = '#9a9890';
  ctx.fillRect(610, 420, 220, 20);

  /* 门口的小碗 */
  ctx.fillStyle = '#c8a878';
  ctx.beginPath();
  ctx.ellipse(720, 400, 18, 6, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#8a6840';
  ctx.beginPath();
  ctx.ellipse(720, 398, 14, 5, 0, 0, Math.PI*2);
  ctx.fill();

  /* 地面 */
  ctx.fillStyle = grad(0, 470, 0, H, [
    [0, '#b8b0a8'],
    [0.5, '#98968e'],
    [1, '#7a7870']
  ]);
  ctx.fillRect(0, 470, W, 70);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  for(let x = -40; x < W + 60; x += 90){
    ctx.beginPath();
    ctx.moveTo(x, 470); ctx.lineTo(x + 30, H);
    ctx.stroke();
  }

  /* 配电房小门 */
  const px = 224, py = 250, pw = 76, ph = 180;
  ctx.fillStyle = '#5a6878';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#3a4858';
  ctx.lineWidth = 4;
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = 'rgba(200,60,50,0.85)';
  ctx.fillRect(px + 20, py + 26, 36, 20);
  ctx.fillStyle = 'rgba(255,240,180,0.95)';
  ctx.font = 'bold 9px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('配电', px + 38, py + 36);

  /* 地下通道入口 */
  ctx.fillStyle = '#4a5058';
  ctx.fillRect(128, 356, 88, 66);
  ctx.fillStyle = '#2a3038';
  ctx.fillRect(134, 362, 76, 54);

  /* 消防栓 */
  ctx.fillStyle = '#c93030';
  ctx.fillRect(770, 456, 16, 36);
  ctx.fillStyle = '#a83232';
  ctx.beginPath();
  ctx.arc(778, 454, 10, Math.PI, 0);
  ctx.fill();

  /* 阳光 */
  const lg = ctx.createLinearGradient(0, 0, 800, 540);
  lg.addColorStop(0, 'rgba(255,240,200,0.3)');
  lg.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);

  /* 暗角 */
  const vg = ctx.createRadialGradient(W/2, H/2, H*0.4, W/2, H/2, H*0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(60,50,40,0.3)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function drawStreetDayDynamic(t, dt){
  /* 阳光在地面上的晃动 */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sweep = (t * 0.1) % 1.5;
  if(sweep < 1){
    const sx = -200 + sweep * 1400;
    const cg = ctx.createRadialGradient(sx, 500, 0, sx, 500, 260);
    cg.addColorStop(0, 'rgba(255,250,220,0.15)');
    cg.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(sx - 280, 300, 560, 240);
  }
  ctx.restore();
}

/* =========================================================
   ★ 白天门前
   ========================================================= */
function drawDoorstepDayStatic(){
  /* 天空 */
  ctx.fillStyle = grad(0, 0, 0, 400, [
    [0, '#98a8b8'],
    [0.4, '#c8d0d8'],
    [0.7, '#e8d8c0'],
    [1, '#f4dcc0']
  ]);
  ctx.fillRect(0, 0, W, 400);

  /* 远景建筑 */
  const far = [
    { x: 0, y: 240, w: 100, h: 160 },
    { x: 100, y: 260, w: 90, h: 140 },
    { x: 190, y: 230, w: 100, h: 170 },
    { x: 840, y: 250, w: 120, h: 150 },
    { x: 920, y: 240, w: 40, h: 160 }
  ];
  far.forEach(b => {
    ctx.fillStyle = '#b0b8c0';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  /* 铁丝网 */
  const gx = 40, gy = 180, gw = 140, gh = 220;
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(gx, gy, 18, gh);
  ctx.fillRect(gx + gw - 18, gy, 18, gh);
  ctx.fillRect(gx, gy, gw, 18);
  for(let i = 0; i < 4; i++){
    const x = gx + 28 + i * 30;
    ctx.fillRect(x, gy + 18, 5, gh - 18);
  }

  /* 地面 */
  ctx.fillStyle = grad(0, 400, 0, H, [
    [0, '#c0b8a8'],
    [0.5, '#a09890'],
    [1, '#787068']
  ]);
  ctx.fillRect(0, 400, W, 140);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  for(let y = 410; y < H; y += 28){
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for(let x = 0; x < W; x += 80){
    ctx.beginPath(); ctx.moveTo(x, 400); ctx.lineTo(x + 20, H); ctx.stroke();
  }

  /* 房子 */
  const hx = 240, hy = 120, hw = 480, hh = 300;
  ctx.fillStyle = '#d8c8a8';
  ctx.fillRect(hx, hy + 60, hw, hh - 60);
  ctx.fillStyle = '#e0d0b0';
  ctx.fillRect(hx, hy + 60, hw, 20);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for(let y = hy + 80; y < hy + hh; y += 16){
    ctx.beginPath(); ctx.moveTo(hx + 4, y); ctx.lineTo(hx + hw - 4, y); ctx.stroke();
  }

  /* 屋顶 */
  ctx.fillStyle = '#9a4028';
  ctx.beginPath();
  ctx.moveTo(hx - 40, hy + 80);
  ctx.lineTo(hx + hw/2, hy - 20);
  ctx.lineTo(hx + hw + 40, hy + 80);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c8503a';
  ctx.beginPath();
  ctx.moveTo(hx - 30, hy + 78);
  ctx.lineTo(hx + hw/2, hy - 14);
  ctx.lineTo(hx + hw + 30, hy + 78);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  for(let i = 0; i < 12; i++){
    const t = i / 12;
    const x1 = hx - 30 + (hx + hw/2 - (hx - 30)) * t;
    const x2 = hx + hw + 30 - ((hx + hw + 30) - (hx + hw/2)) * t;
    ctx.beginPath();
    ctx.moveTo(x1, hy - 14 + 92 * t);
    ctx.lineTo(x2, hy - 14 + 92 * t);
    ctx.stroke();
  }

  /* 烟囱 */
  ctx.fillStyle = '#7a6858';
  ctx.fillRect(hx + 340, hy - 20, 40, 70);
  ctx.fillStyle = '#8a7868';
  ctx.fillRect(hx + 340, hy - 20, 40, 10);

  /* 窗户 */
  const wx = hx + 40, wy = hy + 120, ww = 100, wh = 120;
  ctx.fillStyle = '#a8c8d8';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = '#7a6858';
  ctx.lineWidth = 8;
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.beginPath();
  ctx.moveTo(wx + ww/2, wy); ctx.lineTo(wx + ww/2, wy + wh);
  ctx.moveTo(wx, wy + wh/2); ctx.lineTo(wx + ww, wy + wh/2);
  ctx.stroke();

  /* 第二扇窗 */
  const wx2 = hx + hw - 140;
  ctx.fillStyle = '#a8c8d8';
  ctx.fillRect(wx2, wy, ww, wh);
  ctx.strokeStyle = '#7a6858';
  ctx.lineWidth = 8;
  ctx.strokeRect(wx2, wy, ww, wh);
  ctx.beginPath();
  ctx.moveTo(wx2 + ww/2, wy); ctx.lineTo(wx2 + ww/2, wy + wh);
  ctx.moveTo(wx2, wy + wh/2); ctx.lineTo(wx2 + ww, wy + wh/2);
  ctx.stroke();

  /* 门 */
  const dx = hx + hw/2 - 55, dy = hy + 200, dw = 110, dh = 140;
  ctx.fillStyle = '#5a4838';
  ctx.fillRect(dx - 12, dy - 12, dw + 24, dh + 12);
  ctx.fillStyle = '#8a6840';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.fillStyle = '#a8c8d8';
  ctx.fillRect(dx + 12, dy + 12, dw - 24, 44);
  ctx.strokeStyle = '#5a4838';
  ctx.lineWidth = 3;
  ctx.strokeRect(dx + 12, dy + 12, dw - 24, 44);
  ctx.fillStyle = '#c9a04e';
  ctx.beginPath();
  ctx.arc(dx + dw - 22, dy + dh/2 + 6, 5, 0, Math.PI*2);
  ctx.fill();

  /* 门灯 */
  const lx = hx + hw/2, ly = dy - 28;
  ctx.fillStyle = '#4a5058';
  ctx.beginPath();
  ctx.moveTo(lx - 14, ly);
  ctx.lineTo(lx + 14, ly);
  ctx.lineTo(lx + 10, ly + 14);
  ctx.lineTo(lx - 10, ly + 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,150,0.7)';
  ctx.beginPath();
  ctx.ellipse(lx, ly + 12, 10, 6, 0, 0, Math.PI*2);
  ctx.fill();

  /* 台阶 */
  const sx = hx + hw/2 - 80, sy = dy + dh;
  ctx.fillStyle = '#b0a898';
  ctx.fillRect(sx, sy, 160, 12);
  ctx.fillStyle = '#a09888';
  ctx.fillRect(sx + 8, sy + 12, 144, 12);
  ctx.fillStyle = '#908878';
  ctx.fillRect(sx + 16, sy + 24, 128, 12);

  /* ★ 台阶上的小猫 —— 让小浣熊出现的伏笔 */
  ctx.save();
  ctx.translate(hx + hw/2 + 60, sy + 8);
  ctx.fillStyle = '#d8964e';
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(14, -6, 10, 9, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -14); ctx.lineTo(10, -22); ctx.lineTo(16, -15);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  /* 盆栽 */
  ctx.fillStyle = '#8a4838';
  ctx.fillRect(870, 340, 30, 30);
  ctx.fillStyle = '#4a7a48';
  ctx.beginPath();
  ctx.arc(885, 330, 22, 0, Math.PI*2);
  ctx.fill();

  /* 阳光 */
  const lg = ctx.createLinearGradient(0, 0, 800, 540);
  lg.addColorStop(0, 'rgba(255,240,200,0.32)');
  lg.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
}

function drawDoorstepDayDynamic(t, dt){
  /* 门灯微微亮 */
  const pulse = 0.85 + 0.15 * Math.sin(t * 1.4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lx = 240 + 240, ly = 120 + 200 - 28 + 12;
  const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 180);
  lg.addColorStop(0, `rgba(255,220,150,${0.18 * pulse})`);
  lg.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(lx - 180, ly - 180, 360, 360);
  ctx.restore();
}

/* =========================================================
   ★ 白天红屋顶
   ========================================================= */
function drawHouseDayStatic(){
  /* 室内暖木 */
  ctx.fillStyle = grad(0, 0, 0, H, [
    [0, '#7a5a3a'],
    [0.5, '#6a4a2a'],
    [1, '#5a3a1a']
  ]);
  ctx.fillRect(0, 0, W, H);

  /* 木地板纹理 */
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 48){
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for(let y = 420; y < H; y += 12){
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  /* 地板暗色 */
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 420, W, 120);

  /* 窗户 —— 白天亮 */
  ctx.fillStyle = '#8a6a3a';
  ctx.fillRect(72, 80, 228, 228);
  ctx.fillStyle = '#a8d0e8';
  ctx.fillRect(80, 88, 212, 212);
  /* 窗外的云 */
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(160, 130, 40, 15, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(230, 160, 30, 12, 0, 0, Math.PI*2);
  ctx.fill();
  /* 窗格 */
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 9;
  ctx.strokeRect(80, 88, 212, 212);
  ctx.beginPath();
  ctx.moveTo(186, 88); ctx.lineTo(186, 300);
  ctx.moveTo(80, 194); ctx.lineTo(292, 194);
  ctx.stroke();

  /* 台灯 —— 亮着 */
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(846, 306, 12, 130);
  ctx.fillStyle = '#e8a850';
  ctx.beginPath();
  ctx.moveTo(806, 306); ctx.lineTo(898, 306);
  ctx.lineTo(878, 260); ctx.lineTo(826, 260);
  ctx.closePath();
  ctx.fill();

  /* 书架 */
  ctx.fillStyle = '#3a2c1e';
  ctx.fillRect(60, 300, 60, 140);
  ctx.fillStyle = '#2a2016';
  ctx.fillRect(64, 304, 52, 4);
  ctx.fillRect(64, 344, 52, 4);
  ctx.fillRect(64, 384, 52, 4);
  const bookColors = ['#6a5a40','#5a4a30','#7a6a4a','#4a3a24','#8a7a5a'];
  for(let layer = 0; layer < 3; layer++){
    const layerY = 308 + layer * 40;
    let x = 68;
    for(let i = 0; i < 5; i++){
      ctx.fillStyle = bookColors[(layer * 5 + i) % bookColors.length];
      const w = 6 + (i % 3) * 2;
      ctx.fillRect(x, layerY, w, 30);
      x += w + 1;
    }
  }

  /* 桌子 */
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(360, 388, 300, 18);
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(378, 406, 16, 122);
  ctx.fillRect(626, 406, 16, 122);

  /* 相框 —— 完整的照片 */
  ctx.save();
  ctx.translate(470, 292); ctx.rotate(-0.045);
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(-60, -52, 120, 104);
  ctx.fillStyle = '#8a6b3f';
  ctx.fillRect(-58, -50, 116, 100);
  ctx.fillStyle = '#cfc6ad';
  ctx.fillRect(-53, -45, 106, 90);
  /* 照片上：老人 + 小浣熊 + 红屋顶 */
  ctx.fillStyle = '#8d8672';
  ctx.fillRect(-44, -36, 88, 72);
  /* 红屋顶 */
  ctx.fillStyle = '#b84030';
  ctx.beginPath();
  ctx.moveTo(-20, 34); ctx.lineTo(10, 8); ctx.lineTo(40, 34);
  ctx.closePath();
  ctx.fill();
  /* 老人 + 小浣熊 */
  ctx.fillStyle = '#5c5544';
  ctx.beginPath(); ctx.arc(-6, -10, 13, 0, Math.PI*2); ctx.fill();
  ctx.fillRect(-22, 0, 32, 34);
  ctx.fillStyle = '#4a4536';
  ctx.beginPath(); ctx.ellipse(24, 12, 15, 12, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(35, 0, 9.5, 0, Math.PI*2); ctx.fill();
  /* 蓝绳 */
  ctx.strokeStyle = '#4a7fb5';
  ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(35, 7, 7, 0.15, Math.PI - 0.15); ctx.stroke();
  ctx.restore();

  /* 挂钟 —— 正常走 */
  ctx.fillStyle = '#4a3524';
  ctx.beginPath(); ctx.arc(540, 120, 32, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f8f0d8';
  ctx.beginPath(); ctx.arc(540, 120, 27, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#4a3524'; ctx.lineWidth = 1.5;
  for(let i=0;i<12;i++){
    const a = i * Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(540 + Math.cos(a)*22, 120 + Math.sin(a)*22);
    ctx.lineTo(540 + Math.cos(a)*25, 120 + Math.sin(a)*25);
    ctx.stroke();
  }

  /* 摇椅 */
  ctx.save();
  ctx.translate(170, 420);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 56, 64, 10, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = '#7a5a40';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-46, 0); ctx.quadraticCurveTo(-20, 42, 10, 52);
  ctx.moveTo(46, 0); ctx.quadraticCurveTo(20, 42, -10, 52);
  ctx.stroke();
  ctx.fillStyle = '#6a4a30';
  ctx.fillRect(-50, -12, 100, 14);
  ctx.strokeStyle = '#7a5a40';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-42, -10); ctx.lineTo(-56, -118);
  ctx.moveTo(42, -10); ctx.lineTo(56, -118);
  ctx.moveTo(-56, -118); ctx.lineTo(56, -118);
  ctx.stroke();
  ctx.restore();

  /* 小碗 */
  ctx.fillStyle = '#a87858';
  ctx.beginPath();
  ctx.ellipse(300, 480, 22, 10, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#8a5838';
  ctx.beginPath();
  ctx.ellipse(300, 478, 18, 8, 0, 0, Math.PI*2);
  ctx.fill();

  /* 阳光透进来 */
  const lg = ctx.createRadialGradient(200, 200, 0, 200, 200, 500);
  lg.addColorStop(0, 'rgba(255,230,180,0.28)');
  lg.addColorStop(1, 'rgba(255,230,180,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
}

function drawHouseDayDynamic(t, dt){
  /* 阳光里飘着尘埃 */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for(let i=0;i<20;i++){
    const x = (i * 113 + t * 6) % W;
    const y = (i * 157 + Math.sin(t*0.4 + i) * 30 + 100) % H;
    ctx.fillStyle = 'rgba(255,240,200,' + (0.14 + (i%3)*0.08) + ')';
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i%2)*0.8, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  /* 挂钟秒针 */
  ctx.save();
  ctx.translate(540, 120);
  const secondAngle = (t * 1.0) % (Math.PI * 2);
  ctx.strokeStyle = '#a83020';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(secondAngle) * 22, Math.sin(secondAngle) * 22);
  ctx.stroke();
  ctx.restore();
}

/* =========================================================
   后巷
   ========================================================= */
function drawBackstreetStatic(){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const f = flags();

  ctx.fillStyle = grad(0,0,0,470, blood ? [
    [0,'#0a0308'],[0.4,'#160810'],[1,'#1c0a14']
  ] : [
    [0,'#03060c'],[0.4,'#0a1018'],[1,'#131c26']
  ]);
  ctx.fillRect(0,0,W,470);
  brickWall(0, 36, W, 434, 68, 24,
    blood ? '#1a0a10' : '#0f1620',
    blood ? 'rgba(60,10,20,0.3)' : 'rgba(0,0,0,0.28)');

  /* ★ 老人身影 */
  const silhouetteVisible = flags().seenSilhouettes && flags().seenSilhouettes.indexOf('backstreet') >= 0;
  if(silhouetteVisible && !isBloodMode()){
    drawSilhouette(300, 430, 0.95, 0.8);
  }

  ctx.fillStyle = grad(0, 300, 0, 470, [
    [0,'rgba(0,0,0,0)'],[1, blood ? 'rgba(40,5,10,0.65)' : 'rgba(0,0,0,0.55)']
  ]);
  ctx.fillRect(0, 300, W, 170);

  for(let i=0;i<24;i++){
    const mx = (i*53 + 30) % W;
    const my = 80 + (i*67) % 380;
    ctx.fillStyle = blood
      ? (i%3===0 ? 'rgba(120,20,30,0.22)' : 'rgba(40,10,20,0.28)')
      : (i % 3 === 0 ? 'rgba(50,80,60,0.18)' : 'rgba(20,30,40,0.24)');
    ctx.beginPath();
    ctx.ellipse(mx, my, 6 + (i%5)*4, 4 + (i%4)*3, i*0.3, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.fillStyle = blood ? '#1a0a0e' : '#1a222c';
  ctx.fillRect(428, 36, 18, 300);
  ctx.fillStyle = blood ? '#241014' : '#242e3a';
  ctx.fillRect(430, 36, 14, 300);

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
  ctx.fillStyle = blood ? '#2a1218' : '#212c37'; ctx.fillRect(dx - 12, dy - 22, dw + 24, 24);
  ctx.fillStyle = 'rgba(200,180,140,0.5)';
  ctx.font = 'bold 12px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('后 门', dx + dw/2, dy - 31);

  if(cut || blood){
    ctx.fillStyle = blood ? '#3a0f12' : '#2a2a2a';
    ctx.beginPath(); ctx.ellipse(dx + dw/2, dy - 24, 8, 4, 0, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,215,140,0.95)';
    ctx.beginPath(); ctx.ellipse(dx + dw/2, dy - 24, 8, 4, 0, 0, Math.PI*2); ctx.fill();
    const dg2 = ctx.createRadialGradient(dx + dw/2, dy - 22, 0, dx + dw/2, dy - 22, 260);
    dg2.addColorStop(0,'rgba(255,205,120,0.30)');
    dg2.addColorStop(1,'rgba(255,180,90,0)');
    ctx.fillStyle = dg2;
    ctx.fillRect(dx + dw/2 - 270, dy - 290, 540, 560);
  }

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
  ctx.strokeStyle = blood ? 'rgba(60,10,20,0.55)' : 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  for(let yy = oy + 26; yy < oy + oh - 10; yy += 14){
    ctx.beginPath();
    ctx.moveTo(ox + 12, yy);
    ctx.lineTo(ox + ow - 12, yy);
    ctx.stroke();
  }
  ctx.fillStyle = '#0e141c';
  ctx.fillRect(ox + 10, oy + 24, 6, 12);
  ctx.fillRect(ox + 10, oy + oh - 36, 6, 12);
  ctx.fillStyle = blood ? '#5a3038' : '#5a6878';
  ctx.beginPath();
  ctx.arc(ox + ow - 26, oy + oh / 2 + 6, 5, 0, Math.PI * 2);
  ctx.fill();

  const sx = ox + 42, sy = oy + 30;
  ctx.fillStyle = blood ? 'rgba(140,20,30,0.95)' : 'rgba(200,50,40,0.95)';
  ctx.fillRect(sx, sy, 78, 26);
  ctx.strokeStyle = 'rgba(255,220,180,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(sx, sy, 78, 26);
  ctx.fillStyle = 'rgba(255,235,200,0.98)';
  ctx.font = 'bold 14px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('配 电', sx + 39, sy + 14);

  ctx.fillStyle = grad(0, 470, 0, H, blood
    ? [[0,'#1a0810'],[1,'#0a040a']]
    : [[0,'#101822'],[1,'#04070b']]);
  ctx.fillRect(0, 470, W, 70);

  const c1x = 166, c1y = 370, c1w = 160, c1h = 106;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(c1x + c1w/2, c1y + c1h + 3, c1w*0.6, 12, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = blood ? '#1a0c08' : '#28221a'; ctx.fillRect(c1x, c1y, c1w, c1h);
  ctx.fillStyle = blood ? '#221008' : '#38301f'; ctx.fillRect(c1x, c1y, c1w, 15);
  ctx.fillStyle = blood ? '#150a06' : '#252019'; ctx.fillRect(c1x + 42, c1y - 58, 122, 60);

  const eg = ctx.createLinearGradient(0, 0, 96, 0);
  eg.addColorStop(0, blood ? 'rgba(20,2,6,0.94)' : 'rgba(3,6,10,0.94)');
  eg.addColorStop(1, blood ? 'rgba(20,2,6,0)' : 'rgba(3,6,10,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(0, 0, 96, H);
}

function drawBackstreetDynamic(t, dt){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const f = flags();

  if(!blood){
    if(!f.catGone) drawCat(246, 354, t);
  }
}

function drawCat(x, y, t){
  const breathe = Math.sin(t*1.6) * 1.6;
  ctx.save();
  ctx.translate(x, y + breathe);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 30, 54, 9, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = '#b96f2c'; ctx.lineWidth = 13; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-40, 4);
  ctx.quadraticCurveTo(-78, -2, -64, 26);
  ctx.stroke();
  ctx.fillStyle = '#c9792f';
  ctx.beginPath(); ctx.ellipse(0, 0, 46, 27, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#c9792f';
  ctx.beginPath(); ctx.ellipse(37, -13, 24, 21, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(24,-28); ctx.lineTo(28,-48); ctx.lineTo(43,-29); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(43,-30); ctx.lineTo(55,-47); ctx.lineTo(58,-25); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(70,40,15,0.88)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(41, -14, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(55, -13, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.restore();
}

/* =========================================================
   便利店（雨夜）
   ========================================================= */
function drawShopStatic(){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const f = flags();
  const lit = !!f.lightsOn && !cut && !blood;

  ctx.fillStyle = blood ? '#0a0306' : '#02050a';
  ctx.fillRect(0,0,W,H);

  const wallC  = blood ? '#1a0a10' : (lit ? '#121a24' : '#05090f');
  const shelfC = blood ? '#23121a' : (lit ? '#1c2631' : '#090e15');
  const itemC  = blood ? '#3a1a22' : (lit ? '#2d3b4a' : '#0d141c');

  ctx.fillStyle = wallC;
  ctx.fillRect(0,0,W,H);

  /* ★ 老人身影 */
  const silhouetteVisible = flags().seenSilhouettes && flags().seenSilhouettes.indexOf('shop') >= 0;
  if(silhouetteVisible && !isBloodMode()){
    drawSilhouette(880, 470, 0.9, 0.75);
  }

  const shelfYs = [168, 256, 344];
  shelfYs.forEach((y) => {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(110, y + 13, 320, 4);
    ctx.fillStyle = shelfC;
    ctx.fillRect(110, y, 320, 13);
    ctx.fillRect(110, y, 11, 90);
    ctx.fillRect(419, y, 11, 90);
    for(let j = 0; j < 7; j++){
      const w0 = 22 + ((j*13) % 10);
      const h0 = 26 + ((j*7) % 16);
      ctx.fillStyle = itemC;
      ctx.fillRect(126 + j*42, y - h0, w0, h0);
    }
  });

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(616, 334, 304, 8);
  ctx.fillStyle = shelfC;
  ctx.fillRect(618, 320, 300, 148);
  ctx.fillStyle = blood ? '#23121a' : (lit ? '#25303d' : '#0b1118');
  ctx.fillRect(618, 320, 300, 16);

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

function drawShopDynamic(t, dt){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const lit = !!flags().lightsOn && !cut && !blood;

  if(lit){
    const g2 = ctx.createRadialGradient(470, 400, 0, 470, 400, 640);
    g2.addColorStop(0, 'rgba(255,238,196,0.24)');
    g2.addColorStop(1, 'rgba(255,210,150,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
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
   街道（雨夜）
   ========================================================= */
function drawStreetStatic(){
  const cut = isPowerCut();
  const f = flags();

  ctx.fillStyle = grad(0, 0, 0, 470, [
    [0,'#04070e'],[0.4,'#0a1420'],[0.7,'#101c2a'],[1,'#1a2634']
  ]);
  ctx.fillRect(0, 0, W, 470);

  ctx.fillStyle = '#060a11';
  ctx.fillRect(0, 178, 244, 292);
  ctx.fillRect(876, 136, 84, 334);
  ctx.fillStyle = '#040810';
  ctx.fillRect(230, 200, 140, 270);
  ctx.fillRect(390, 170, 120, 300);
  ctx.fillRect(540, 190, 120, 280);

  const farWins = [];
  for(let i=0;i<3;i++){
    for(let j=0;j<3;j++){
      farWins.push([30 + i*70, 218 + j*82, 26, 34]);
      farWins.push([898 + i*20, 190 + j*92, 16, 26]);
      farWins.push([250 + i*44, 240 + j*80, 20, 26]);
      farWins.push([410 + i*36, 210 + j*84, 18, 24]);
    }
  }
  farWins.forEach((w0, i) => {
    const lit = !cut && (i * 7 + 3) % 9 === 0;
    if(lit){
      ctx.fillStyle = 'rgba(255,210,140,0.5)';
      ctx.fillRect(w0[0], w0[1], w0[2], w0[3]);
    } else {
      ctx.fillStyle = 'rgba(24,34,48,0.75)';
      ctx.fillRect(w0[0], w0[1], w0[2], w0[3]);
    }
  });

  ctx.fillStyle = grad(0, 470, 0, H, [
    [0,'#101822'],[1,'#02040a']
  ]);
  ctx.fillRect(0, 470, W, 70);

  ctx.fillStyle = '#2a1514';
  ctx.beginPath();
  ctx.moveTo(630, 258); ctx.lineTo(720, 186); ctx.lineTo(810, 258);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a1d1c';
  ctx.beginPath();
  ctx.moveTo(638, 258); ctx.lineTo(720, 192); ctx.lineTo(802, 258);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#101822';
  ctx.fillRect(654, 258, 132, 122);

  const gx = 520, gy = 168, gw = 360, gh = 362;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(gx + 4, gy + 4, gw, gh);
  ctx.fillStyle = '#222c38';
  ctx.fillRect(gx, gy, 26, gh);
  ctx.fillRect(gx + gw - 26, gy, 26, gh);
  ctx.fillRect(gx, gy, gw, 22);
  ctx.fillRect(gx, gy + gh - 18, gw, 18);
  for(let i = 0; i < 9; i++){
    const x = gx + 40 + i * 35;
    ctx.fillRect(x, gy + 22, 8, gh - 40);
  }

  /* ★ 老人身影 —— 铁门另一侧 */
  const silhouetteVisible = flags().seenSilhouettes && flags().seenSilhouettes.indexOf('street') >= 0;
  if(silhouetteVisible && !isBloodMode()){
    drawSilhouette(720, 500, 0.9, 0.7);
  }

  /* 晾衣绳 */
  if(!f.ropeTaken){
    ctx.strokeStyle = 'rgba(200,210,220,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 110);
    ctx.quadraticCurveTo(300, 152, 520, 102);
    ctx.stroke();
  }

  /* 路灯 */
  ctx.fillStyle = '#141b25';
  ctx.fillRect(156, 240, 8, 240);
  if(cut){
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath(); ctx.ellipse(160, 300, 6, 4, 0, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,220,150,0.95)';
    ctx.beginPath(); ctx.ellipse(160, 300, 6, 4, 0, 0, Math.PI*2); ctx.fill();
  }

  /* 配电房 */
  const px = 224, py = 250, pw = 76, ph = 180;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(px+4, py+4, pw, ph);
  ctx.fillStyle = '#1c2430';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#2a3644'; ctx.lineWidth = 4;
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = 'rgba(200,60,50,0.7)';
  ctx.fillRect(px + 20, py + 26, 36, 20);

  /* 地下通道 */
  const ux = 130, uy = 358, uw = 84, uh = 62;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(ux, uy, uw, uh);
  ctx.fillStyle = '#050810';
  ctx.fillRect(ux + 6, uy + 6, uw - 12, uh - 12);

  /* 铁门上的封条 */
  if(!S_flags().gateOpen){
    ctx.fillStyle = 'rgba(200,50,50,0.65)';
    ctx.fillRect(gx + gw/2 - 30, gy + 100, 60, 8);
  }
}

function S_flags(){ return (window.S && window.S.flags) || {}; }

function drawStreetDynamic(t, dt){
  const cut = isPowerCut();
  const sweep = (t * 0.12) % 1.6;
  if(sweep < 1){
    const sx = -300 + sweep * 1600;
    const cg2 = ctx.createRadialGradient(sx, 460, 0, sx, 460, 320);
    cg2.addColorStop(0, 'rgba(255,245,210,0.16)');
    cg2.addColorStop(1, 'rgba(255,245,210,0)');
    ctx.fillStyle = cg2;
    ctx.fillRect(sx - 340, 140, 680, 400);
  }
}

/* =========================================================
   门前（雨夜）
   ========================================================= */
function drawDoorstepStatic(){
  const cut = isPowerCut();
  ctx.fillStyle = grad(0, 0, 0, 400, [
    [0, '#0a1018'], [0.35, '#141c2a'], [0.7, '#1c2836'], [1, '#242f3e']
  ]);
  ctx.fillRect(0, 0, W, 400);

  const far = [
    { x: 0, y: 240, w: 100, h: 160 },
    { x: 100, y: 260, w: 90, h: 140 },
    { x: 190, y: 230, w: 100, h: 170 },
    { x: 840, y: 250, w: 120, h: 150 },
    { x: 920, y: 240, w: 40, h: 160 }
  ];
  far.forEach(b => {
    ctx.fillStyle = '#060a12';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  const gx = 40, gy = 180, gw = 140, gh = 220;
  ctx.fillStyle = '#1a222c';
  ctx.fillRect(gx, gy, 18, gh);
  ctx.fillRect(gx + gw - 18, gy, 18, gh);
  ctx.fillRect(gx, gy, gw, 18);
  for(let i = 0; i < 4; i++){
    const x = gx + 28 + i * 30;
    ctx.fillRect(x, gy + 18, 5, gh - 18);
  }

  ctx.fillStyle = grad(0, 400, 0, H, [
    [0, '#161e28'], [0.5, '#0e141c'], [1, '#060a10']
  ]);
  ctx.fillRect(0, 400, W, 140);

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  for(let y = 410; y < H; y += 28){
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const hx = 240, hy = 120, hw = 480, hh = 300;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(hx + hw/2, hy + hh + 10, hw * 0.55, 20, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#3a3226';
  ctx.fillRect(hx, hy + 60, hw, hh - 60);

  ctx.fillStyle = '#8a2820';
  ctx.beginPath();
  ctx.moveTo(hx - 40, hy + 80);
  ctx.lineTo(hx + hw/2, hy - 20);
  ctx.lineTo(hx + hw + 40, hy + 80);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a83828';
  ctx.beginPath();
  ctx.moveTo(hx - 30, hy + 78);
  ctx.lineTo(hx + hw/2, hy - 14);
  ctx.lineTo(hx + hw + 30, hy + 78);
  ctx.closePath();
  ctx.fill();

  /* ★ 老人身影 —— 台阶上 */
  const silhouetteVisible = flags().seenSilhouettes && flags().seenSilhouettes.indexOf('doorstep') >= 0;
  if(silhouetteVisible && !isBloodMode()){
    drawSilhouette(hx + hw/2, hy + hh + 40, 0.85, 0.7);
  }

  const wx = hx + 40, wy = hy + 120, ww = 100, wh = 120;
  ctx.fillStyle = '#1a222c';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = '#584a3a';
  ctx.lineWidth = 8;
  ctx.strokeRect(wx, wy, ww, wh);
  if(!cut){
    ctx.fillStyle = 'rgba(255,220,140,0.55)';
    ctx.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);
  } else {
    ctx.fillStyle = 'rgba(30, 40, 55, 0.9)';
    ctx.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);
  }

  const dx = hx + hw/2 - 55, dy = hy + 200, dw = 110, dh = 140;
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(dx - 12, dy - 12, dw + 24, dh + 12);
  ctx.fillStyle = '#3a2c20';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.fillStyle = '#1a222c';
  ctx.fillRect(dx + 12, dy + 12, dw - 24, 44);

  /* 门灯 */
  const lx = hx + hw/2, ly = dy - 28;
  ctx.fillStyle = '#2a3038';
  ctx.beginPath();
  ctx.moveTo(lx - 14, ly);
  ctx.lineTo(lx + 14, ly);
  ctx.lineTo(lx + 10, ly + 14);
  ctx.lineTo(lx - 10, ly + 14);
  ctx.closePath();
  ctx.fill();
  if(!cut){
    ctx.fillStyle = 'rgba(255,214,140,0.95)';
    ctx.beginPath();
    ctx.ellipse(lx, ly + 12, 10, 6, 0, 0, Math.PI*2);
    ctx.fill();
  }

  const sx = hx + hw/2 - 80, sy = dy + dh;
  ctx.fillStyle = '#2a2620';
  ctx.fillRect(sx, sy, 160, 12);
  ctx.fillStyle = '#3a3530';
  ctx.fillRect(sx + 8, sy + 12, 144, 12);
  ctx.fillStyle = '#2a2620';
  ctx.fillRect(sx + 16, sy + 24, 128, 12);
}

function drawDoorstepDynamic(t, dt){
  const cut = isPowerCut();
  ctx.save();
  ctx.strokeStyle = 'rgba(168, 205, 240, 0.45)';
  ctx.lineWidth = 1;
  for(let i = 0; i < 40; i++){
    const x = (i * 47 + t * 320) % W;
    const y = (i * 97 + t * 420) % H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2, y - 10);
    ctx.stroke();
  }
  ctx.restore();
}

/* =========================================================
   红屋顶（雨夜）
   ========================================================= */
function drawHouseStatic(){
  const cut = isPowerCut();
  const f = flags();
  ctx.fillStyle = grad(0, 0, 0, H, [
    [0,'#2e2218'],[0.5,'#281d16'],[1,'#15100c']
  ]);
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,220,170,0.03)';
  for(let x = 0; x < W; x += 48){
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, H);
    ctx.stroke();
  }

  woodGrain(0, 420, W, 120, '#3a2a1d', 'rgba(0,0,0,0.28)', true);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 420, W, 120);

  ctx.fillStyle = '#584430';
  ctx.fillRect(72, 80, 228, 228);
  ctx.fillStyle = '#16202c';
  ctx.fillRect(80, 88, 212, 212);
  ctx.fillStyle = 'rgba(220,230,245,0.55)';
  [[110,120,1.3],[160,110,0.9],[200,105,1.1],[260,118,1.0]].forEach(s => {
    ctx.beginPath();
    ctx.arc(s[0], s[1], s[2], 0, Math.PI*2);
    ctx.fill();
  });
  ctx.fillStyle = 'rgba(255,244,214,0.82)';
  ctx.beginPath(); ctx.arc(242, 142, 18, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#584430'; ctx.lineWidth = 9;
  ctx.strokeRect(80, 88, 212, 212);
  ctx.beginPath();
  ctx.moveTo(186, 88); ctx.lineTo(186, 300);
  ctx.moveTo(80, 194); ctx.lineTo(292, 194);
  ctx.stroke();

  /* ★ 老人身影 —— 窗外（这是关键的一帧） */
  const silhouetteVisible = flags().seenSilhouettes && flags().seenSilhouettes.indexOf('house') >= 0;
  if(silhouetteVisible && !isBloodMode()){
    drawSilhouette(880, 480, 1.1, 0.95);
  }

  ctx.fillStyle = '#4a3524';
  ctx.fillRect(846, 306, 12, 130);
  ctx.beginPath();
  ctx.moveTo(806, 306); ctx.lineTo(898, 306);
  ctx.lineTo(878, 260); ctx.lineTo(826, 260);
  ctx.closePath();
  ctx.fillStyle = cut ? '#4a4030' : '#c9a35a';
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(510, 516, 175, 13, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(360, 388, 300, 18);
  ctx.fillStyle = '#38281b';
  ctx.fillRect(378, 406, 16, 122);
  ctx.fillRect(626, 406, 16, 122);

  ctx.save();
  ctx.translate(470, 292); ctx.rotate(-0.045);
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(-60, -52, 120, 104);
  ctx.fillStyle = '#8a6b3f';
  ctx.fillRect(-58, -50, 116, 100);
  ctx.fillStyle = '#a88453';
  ctx.fillRect(-53, -45, 106, 90);
  ctx.restore();

  /* 挂钟 */
  ctx.fillStyle = '#4a3524';
  ctx.beginPath(); ctx.arc(540, 120, 32, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#e8d8b8';
  ctx.beginPath(); ctx.arc(540, 120, 27, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#4a3524'; ctx.lineWidth = 1.5;
  for(let i=0;i<12;i++){
    const a = i * Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(540 + Math.cos(a)*22, 120 + Math.sin(a)*22);
    ctx.lineTo(540 + Math.cos(a)*25, 120 + Math.sin(a)*25);
    ctx.stroke();
  }

  /* 摇椅 */
  ctx.save();
  ctx.translate(170, 420);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(0, 56, 64, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#5a4230'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-46, 0); ctx.quadraticCurveTo(-20, 42, 10, 52);
  ctx.moveTo(46, 0); ctx.quadraticCurveTo(20, 42, -10, 52);
  ctx.stroke();
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(-50, -12, 100, 14);
  ctx.restore();
}

function drawHouseDynamic(t, dt){
  const cut = isPowerCut();
  const f = flags();
  const joined = !!f.photoJoined;

  if(!cut){
    const lampB = 0.94 + 0.06 * Math.sin(t * 1.7);
    const lg = ctx.createRadialGradient(852, 300, 0, 852, 300, 500);
    lg.addColorStop(0, `rgba(255,206,130,${0.32 * lampB})`);
    lg.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(350, -200, 620, 740);
  }

  /* 挂钟指针 */
  ctx.save();
  ctx.translate(540, 120);
  const hourAngle = cut ? Math.PI * 0.75 : (t * 0.02) % (Math.PI * 2);
  const minuteAngle = cut ? Math.PI * 0.35 : (t * 0.3) % (Math.PI * 2);
  ctx.strokeStyle = '#4a3524';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(hourAngle) * 14, Math.sin(hourAngle) * 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(minuteAngle) * 20, Math.sin(minuteAngle) * 20);
  ctx.stroke();
  ctx.restore();

  /* 摇椅晃 */
  const sway = joined ? 0 : Math.sin(t * 0.9) * 0.014;
  ctx.save();
  ctx.translate(170, 420);
  ctx.rotate(sway);
  ctx.restore();
}

/* =========================================================
   配电房 / 屋顶 / 地下通道 / 河堤 / 邻屋
   （沿用原有，简要）
   ========================================================= */
function drawPowerStationStatic(){
  const cut = isPowerCut();
  ctx.fillStyle = grad(0, 0, 0, H, [[0,'#0a0d12'],[0.6,'#0e1219'],[1,'#06090e']]);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0e1218';
  ctx.fillRect(0, 420, W, 120);
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, W, 420);

  const cx = 380, cy = 120, cw = 200, ch = 300;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(cx + 8, cy + 8, cw, ch);
  ctx.fillStyle = '#1c2430';
  ctx.fillRect(cx, cy, cw, ch);
  ctx.fillStyle = '#252e3b';
  ctx.fillRect(cx + 4, cy + 4, cw - 8, ch - 8);

  const meterX = cx + 60, meterY = cy + 60;
  ctx.fillStyle = '#050810';
  ctx.beginPath(); ctx.arc(meterX, meterY, 24, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#c9d9e6';
  ctx.beginPath(); ctx.arc(meterX, meterY, 20, 0, Math.PI*2); ctx.fill();

  const bX = cx + cw - 80, bY = cy + 80;
  ctx.fillStyle = '#0f141b';
  ctx.fillRect(bX - 40, bY - 40, 100, 120);
  ctx.strokeStyle = '#2a3644'; ctx.lineWidth = 2;
  ctx.strokeRect(bX - 40, bY - 40, 100, 120);
  ctx.fillStyle = 'rgba(200,60,50,0.5)';
  ctx.fillRect(bX - 30, bY - 32, 80, 14);

  ctx.fillStyle = 'rgba(200,60,40,0.5)';
  ctx.fillRect(540, 40, 160, 40);
  ctx.fillStyle = 'rgba(255,240,180,0.85)';
  ctx.font = 'bold 18px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('高 压 危 险', 620, 60);
}

function drawPowerStationDynamic(t, dt){}

function drawRooftopStatic(){
  const cut = isPowerCut();
  ctx.fillStyle = grad(0,0,0,420, [[0,'#02040a'],[0.4,'#0a1420'],[0.75,'#152030'],[1,'#1a2534']]);
  ctx.fillRect(0,0,W,420);

  ctx.fillStyle = 'rgba(220,230,245,0.55)';
  [[320,60,1.0],[400,100,1.3],[500,50,0.9],[620,120,1.1],[750,70,1.0],[880,110,0.9]].forEach(s => {
    ctx.beginPath();
    ctx.arc(s[0], s[1], s[2], 0, Math.PI*2);
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(255,244,214,0.85)';
  ctx.beginPath(); ctx.arc(180, 90, 26, 0, Math.PI*2); ctx.fill();

  const skyline = [
    { x:-20, y:280, w:100, h:180 },
    { x:70,  y:250, w:110, h:210 },
    { x:170, y:300, w:80,  h:160 },
    { x:240, y:220, w:130, h:240 },
    { x:360, y:270, w:100, h:190 },
    { x:450, y:240, w:110, h:220 },
    { x:550, y:290, w:90,  h:170 },
    { x:630, y:230, w:140, h:230 },
    { x:760, y:260, w:110, h:200 },
    { x:860, y:220, w:120, h:240 }
  ];
  skyline.forEach(b => {
    ctx.fillStyle = '#080e16';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  ctx.fillStyle = '#0c1219';
  ctx.fillRect(0, 420, W, 120);
}

function drawRooftopDynamic(t, dt){}

function drawUnderpassStatic(){
  const cut = isPowerCut();
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = grad(0, 400, 0, H, [[0, '#0a0f16'],[1, '#04070b']]);
  ctx.fillRect(0, 400, W, 140);
  ctx.fillStyle = '#080c12';
  ctx.fillRect(0, 180, W, 220);
  brickWall(0, 180, W, 220, 56, 22, '#0c1119', 'rgba(0,0,0,0.28)');
  ctx.fillStyle = '#1a222c';
  ctx.fillRect(0, 220, W, 12);

  const lamps = [{x:200,y:180},{x:480,y:180},{x:760,y:180}];
  lamps.forEach(l => {
    ctx.fillStyle = '#1a222c';
    ctx.beginPath();
    ctx.moveTo(l.x - 18, l.y);
    ctx.lineTo(l.x + 18, l.y);
    ctx.lineTo(l.x + 12, l.y - 12);
    ctx.lineTo(l.x - 12, l.y - 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = cut ? 'rgba(255,120,60,0.9)' : 'rgba(255,220,150,0.95)';
    ctx.beginPath();
    ctx.ellipse(l.x, l.y - 6, 8, 4, 0, 0, Math.PI*2);
    ctx.fill();
  });
}

function drawUnderpassDynamic(t, dt){}

function drawRiversideStatic(){
  const cut = isPowerCut();
  ctx.fillStyle = grad(0,0,0,440, [[0,'#040710'],[0.4,'#0a1420'],[0.75,'#101c2c'],[1,'#1a2534']]);
  ctx.fillRect(0,0,W,440);
  const skyline = [
    { x:0,   y:300, w:100, h:140 },
    { x:100, y:280, w:80,  h:160 },
    { x:180, y:320, w:120, h:120 },
    { x:300, y:290, w:100, h:150 },
    { x:400, y:310, w:90,  h:130 },
    { x:490, y:270, w:120, h:170 },
    { x:610, y:300, w:100, h:140 },
    { x:710, y:280, w:110, h:160 },
    { x:820, y:310, w:100, h:130 },
    { x:920, y:290, w:80,  h:150 }
  ];
  skyline.forEach(b => {
    ctx.fillStyle = '#080e16';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  ctx.fillStyle = grad(0, 420, 0, 540, [[0, '#0a1520'],[0.5, '#061018'],[1, '#03080e']]);
  ctx.fillRect(0, 420, W, 120);
  ctx.strokeStyle = 'rgba(140,180,220,0.10)'; ctx.lineWidth = 1;
  for(let i=0;i<20;i++){
    const y = 430 + i*5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(W/3, y - 4, W*2/3, y + 4, W, y - 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#1a222c';
  ctx.fillRect(0, 392, W, 8);
  for(let x = 20; x < W; x += 40){
    ctx.fillStyle = '#1a222c';
    ctx.fillRect(x - 4, 400, 8, 140);
  }
}

function drawRiversideDynamic(t, dt){}

function drawNeighborStatic(){
  ctx.fillStyle = grad(0, 0, 0, H, [[0,'#0a0706'],[0.5,'#120b08'],[1,'#060403']]);
  ctx.fillRect(0, 0, W, H);
  brickWall(0, 60, W, 400, 60, 24, '#1a1008', 'rgba(0,0,0,0.55)');
  ctx.fillStyle = '#0a0604';
  ctx.fillRect(0, 40, W, 24);

  ctx.fillStyle = '#02040a';
  ctx.beginPath();
  ctx.moveTo(340, 0);
  ctx.lineTo(400, 60);
  ctx.lineTo(500, 50);
  ctx.lineTo(620, 0);
  ctx.closePath();
  ctx.fill();

  const wx = 300, wy = 160, ww = 300, wh = 240;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);
  ctx.fillStyle = '#1a0e08';
  ctx.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
  ctx.fillStyle = '#050810';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = 'rgba(180,40,30,0.6)';
  ctx.fillRect(wx + 130, wy + 140, 30, 32);

  ctx.fillStyle = grad(0, 460, 0, H, [[0,'#0e0806'],[1,'#040201']]);
  ctx.fillRect(0, 460, W, 80);
}

function drawNeighborDynamic(t, dt){
  ctx.strokeStyle = 'rgba(200,140,140,0.45)';
  ctx.lineWidth = 1;
  for(let i = 0; i < 8; i++){
    const y = ((t * 200 + i * 60) % 380) + 60;
    if(y > 450) continue;
    const rx = 400 + i * 16 - 56 + Math.sin(t * 0.8) * 30;
    ctx.beginPath();
    ctx.moveTo(rx, y);
    ctx.lineTo(rx - 2, y + 14);
    ctx.stroke();
  }
}

/* =========================================================
   场景 SPOTS 定义
   ========================================================= */
const SCENES = {
  /* ---- 白天场景 ---- */
  alley_day: {
    draw: drawAlleyDayStatic, dynamic: drawAlleyDayDynamic, rain: false,
    spots: [
      { id:'trash',    x:600, y:290, w:160, h:220, label:'翻倒的垃圾桶' },
      { id:'cat',      x:496, y:428, w:96,  h:72,  label:'一只小猫' },
      { id:'graffiti', x:28,  y:250, w:84,  h:70,  label:'墙上的字' },
      { id:'puddle',   x:220, y:466, w:220, h:56,  label:'水洼' },
      { id:'lamp',     x:136, y:88,  w:66,  h:56,  label:'路灯' },
      { id:'exit',     x:892, y:244, w:52,  h:52,  label:'巷子深处' }
    ]
  },

  backstreet_day: {
    draw: drawBackstreetDayStatic, dynamic: drawBackstreetDayDynamic, rain: false,
    spots: [
      { id:'box',    x:180, y:320, w:130, h:110, label:'纸箱' },
      { id:'cat',    x:300, y:410, w:100, h:60,  label:'在阳光下打盹的猫' },
      { id:'door',   x:566, y:130, w:210, h:340, label:'后门' },
      { id:'powerDoor', x:390, y:290, w:180, h:170, label:'配电房' },
      { id:'back',   x:16,  y:244, w:52,  h:52,  label:'回到雨巷' }
    ]
  },

  shop_day: {
    draw: drawShopDayStatic, dynamic: drawShopDayDynamic, rain: false,
    spots: [
      { id:'oldman',  x:680, y:240, w:120, h:80,  label:'老周' },
      { id:'shelf',   x:100, y:148, w:340, h:266, label:'货架' },
      { id:'counter', x:618, y:248, w:300, h:220, label:'收银台' },
      { id:'window',  x:16,  y:244, w:52,  h:52,  label:'后窗' },
      { id:'back',    x:16,  y:456, w:88,  h:72,  label:'回到后巷' }
    ]
  },

  street_day: {
    draw: drawStreetDayStatic, dynamic: drawStreetDayDynamic, rain: false,
    spots: [
      { id:'gate',    x:520, y:148, w:360, h:382, label:'铁门' },
      { id:'bowl',    x:700, y:390, w:60,  h:30,  label:'门口的小碗' },
      { id:'power',   x:224, y:250, w:76,  h:180, label:'配电房' },
      { id:'under',   x:128, y:356, w:88,  h:66,  label:'地下通道' },
      { id:'fire',    x:758, y:440, w:46,  h:60,  label:'消防栓' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回到后巷' }
    ]
  },

  doorstep_day: {
    draw: drawDoorstepDayStatic, dynamic: drawDoorstepDayDynamic, rain: false,
    spots: [
      { id:'door',    x:425, y:320, w:110, h:140, label:'门' },
      { id:'window',  x:280, y:240, w:100, h:120, label:'窗户' },
      { id:'lamp',    x:445, y:284, w:70,  h:44,  label:'门灯' },
      { id:'steps',   x:400, y:456, w:160, h:44,  label:'台阶' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回到街道' }
    ]
  },

  house_day: {
    draw: drawHouseDayStatic, dynamic: drawHouseDayDynamic, rain: false,
    spots: [
      { id:'frame',   x:404, y:238, w:132, h:122, label:'相框' },
      { id:'window',  x:76,  y:84,  w:222, h:222, label:'窗户' },
      { id:'clock',   x:504, y:84,  w:74,  h:74,  label:'挂钟' },
      { id:'books',   x:56,  y:296, w:50,  h:150, label:'书架' },
      { id:'chair',   x:106, y:292, w:146, h:154, label:'摇椅' },
      { id:'bowl',    x:258, y:472, w:90,  h:46,  label:'小碗' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回到门前' }
    ]
  },

  /* ---- 雨夜场景 ---- */
  alley: {
    draw: drawAlleyStatic, dynamic: drawAlleyDynamic, rain: true,
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

  backstreet: {
    draw: drawBackstreetStatic, dynamic: drawBackstreetDynamic, rain: true,
    spots: [
      { id:'stairs', x:250, y:36,  w:120, h:180, label:'消防梯' },
      { id:'box',    x:166, y:312, w:184, h:170, label:'纸箱' },
      { id:'cat',    x:196, y:288, w:150, h:84,
        label: () => flags().bloodMode ? '干涸的水渍' : '大橘',
        cond: () => !flags().catGone },
      { id:'door',   x:566, y:130, w:210, h:340, label:'后门' },
      { id:'powerDoor', x:390, y:290, w:180, h:170, label:'配电房' },
      { id:'back',   x:16,  y:244, w:52,  h:52,  label:'回到雨巷' }
    ]
  },

  shop: {
    draw: drawShopStatic, dynamic: drawShopDynamic, rain: false,
    spots: [
      { id:'poster',  x:490, y:100, w:90,  h:110, label:'墙上海报' },
      { id:'counter', x:618, y:248, w:300, h:220, label:'收银台' },
      { id:'shelf',   x:100, y:148, w:340, h:266, label:'货架' },
      { id:'window',  x:16,  y:244, w:52,  h:52,  label:'后窗' },
      { id:'back',    x:16,  y:456, w:88,  h:72,  label:'回到后巷' }
    ]
  },

  street: {
    draw: drawStreetStatic, dynamic: drawStreetDynamic, rain: true,
    spots: [
      { id:'lamp',    x:145, y:240, w:40,  h:90,  label:'路灯' },
      { id:'power',   x:224, y:250, w:76,  h:180, label:'配电房' },
      { id:'under',   x:128, y:356, w:88,  h:66,  label:'地下通道' },
      { id:'river',   x:0,   y:376, w:68,  h:68,  label:'河堤' },
      { id:'rope',    x:140, y:92,  w:320, h:116, label:'晾衣绳',
        cond: () => !flags().ropeTaken },
      { id:'gate',    x:520, y:148, w:360, h:382, label:'铁门' },
      { id:'fire',    x:758, y:440, w:46,  h:60,  label:'消防栓' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回后巷' }
    ]
  },

  doorstep: {
    draw: drawDoorstepStatic, dynamic: drawDoorstepDynamic, rain: false,
    spots: [
      { id:'window', x:280, y:240, w:100, h:120, label:'窗户' },
      { id:'lamp',   x:445, y:284, w:70,  h:44,  label:'门灯' },
      { id:'door',   x:425, y:320, w:110, h:140, label:'门' },
      { id:'steps',  x:400, y:456, w:160, h:44,  label:'台阶' },
      { id:'back',   x:16,  y:244, w:52,  h:52,  label:'回到街道' }
    ]
  },

  house: {
    draw: drawHouseStatic, dynamic: drawHouseDynamic, rain: false,
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

  powerstation: {
    draw: drawPowerStationStatic, dynamic: drawPowerStationDynamic, rain: false,
    spots: [
      { id:'breaker', x:460, y:140, w:140, h:140, label:'电闸' },
      { id:'log',     x:720, y:320, w:200, h:120, label:'工作日志' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回去' }
    ]
  },

  rooftop: {
    draw: drawRooftopStatic, dynamic: drawRooftopDynamic, rain: false,
    spots: [
      { id:'antenna',  x:100, y:180, w:80,  h:260, label:'旧天线' },
      { id:'watertank',x:780, y:210, w:130, h:130, label:'水塔' },
      { id:'hang',     x:350, y:240, w:180, h:80,  label:'晾衣架' },
      { id:'houseroof',x:590, y:200, w:120, h:130, label:'远处的红屋顶' },
      { id:'back',     x:16,  y:244, w:52,  h:52,  label:'回到后巷' }
    ]
  },

  underpass: {
    draw: drawUnderpassStatic, dynamic: drawUnderpassDynamic, rain: false,
    spots: [
      { id:'stairs',   x:60,  y:240, w:120, h:160, label:'上方的楼梯' },
      { id:'emergency',x:180, y:160, w:80,  h:40,  label:'应急灯' },
      { id:'trash',    x:540, y:410, w:100, h:90,  label:'垃圾桶' },
      { id:'room',     x:820, y:240, w:100, h:160, label:'配电房的门' },
      { id:'back',     x:16,  y:244, w:52,  h:52,  label:'回到街道' }
    ]
  },

  riverside: {
    draw: drawRiversideStatic, dynamic: drawRiversideDynamic, rain: true,
    spots: [
      { id:'lamp',    x:56,  y:300, w:60,  h:120, label:'路灯' },
      { id:'bench',   x:230, y:440, w:150, h:100, label:'长椅' },
      { id:'umbrella',x:660, y:440, w:100, h:80,  label:'丢弃的伞' },
      { id:'river',   x:400, y:470, w:200, h:60,  label:'河面' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回到街道' }
    ]
  },

  neighbor: {
    draw: drawNeighborStatic, dynamic: drawNeighborDynamic, rain: false,
    spots: [
      { id:'neighborWindow',   x:300, y:150, w:300, h:260, label:'窗户' },
      { id:'neighborFloor',    x:260, y:462, w:280, h:76,  label:'地板上的爪印' },
      { id:'neighborBed',      x:672, y:314, w:256, h:172, label:'小床' },
      { id:'back',             x:16,  y:456, w:100, h:84,  label:'来的路' },
      { id:'exit',             x:856, y:236, w:96,  h:138, label:'通向院子的门' }
    ]
  }
};

window.__SCENES__ = Object.assign({ setCtx, getCtx }, SCENES);
})();
