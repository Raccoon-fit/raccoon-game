/* =========================================================
   scenes.js — 2D 场景绘制 + 定义
   依赖 window.S
   v2: 补齐 6 个 _day 白天场景
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

/* ================== 工具函数 ================== */
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
   夜间场景（保持原样）
   ========================================================= */
/* ... 这里粘贴原本的 drawParlorFar/Mid/Near/Dynamic、
   drawAlleyFar/Mid/Near/Dynamic、
   drawBackstreetFar/Mid/Near/Dynamic、
   drawShopFar/Mid/Near/Dynamic、
   drawStreetFar/Mid/Near/Dynamic、
   drawDoorstepFar/Mid/Near/Dynamic、
   drawHouseFar/Mid/Near/Dynamic、
   drawPowerStationFar/Mid/Near/Dynamic、
   drawRooftopFar/Mid/Near/Dynamic、
   drawUnderpassFar/Mid/Near/Dynamic、
   drawRiversideFar/Mid/Near/Dynamic、
   drawNeighborFar/Mid/Near/Dynamic、
   drawCat、drawBloodStain ... 全部原样保留 ... */

/* =========================================================
   ★ 白天场景 —— 共用辅助
   ========================================================= */
function daySky(top, bot){
  ctx.fillStyle = grad(0, 0, 0, 460, [[0, top], [0.7, bot], [1, bot]]);
  ctx.fillRect(0, 0, W, 460);
}
function daySun(x, y, r, alpha){
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,252,228,' + alpha + ')');
  g.addColorStop(0.35, 'rgba(255,246,210,' + (alpha * 0.55) + ')');
  g.addColorStop(0.75, 'rgba(255,236,190,' + (alpha * 0.16) + ')');
  g.addColorStop(1, 'rgba(255,236,190,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function dayCloud(x, y, sx, sy){
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.beginPath();
  ctx.ellipse(x, y, sx, sy, 0, 0, Math.PI * 2);
  ctx.ellipse(x - sx * 0.55, y + sy * 0.2, sx * 0.6, sy * 0.75, 0, 0, Math.PI * 2);
  ctx.ellipse(x + sx * 0.55, y + sy * 0.2, sx * 0.55, sy * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}
function dayWarmOverlay(t){
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(W * 0.82, H * 0.12, 0, W * 0.82, H * 0.12, W * 0.9);
  g.addColorStop(0, 'rgba(255,238,200,0.18)');
  g.addColorStop(0.5, 'rgba(255,228,180,0.06)');
  g.addColorStop(1, 'rgba(255,220,160,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* =========================================================
   ★ 雨巷 · 早（alley_day）
   ========================================================= */
function drawAlleyDayFar(){
  daySky('#b4d8f0', '#f2e8d2');
  daySun(140, 70, 220, 0.42);
  dayCloud(720, 90, 90, 32);
  dayCloud(340, 60, 70, 24);

  const skyline = [
    { x:0,   y:200, w:120, h:260, c:'#b8c8d8' },
    { x:140, y:230, w:130, h:230, c:'#c8d4e0' },
    { x:290, y:180, w:140, h:280, c:'#a8b8c8' },
    { x:450, y:210, w:120, h:250, c:'#c0ccd8' },
    { x:590, y:160, w:150, h:300, c:'#b0c0d0' },
    { x:760, y:200, w:130, h:260, c:'#c4d0dc' },
    { x:900, y:230, w:80,  h:230, c:'#b4c4d4' }
  ];
  skyline.forEach(b => {
    ctx.fillStyle = b.c;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(b.x, b.y, b.w, 4);
  });

  skyline.forEach(b => {
    const cols = Math.floor(b.w / 34);
    const rows = Math.floor(b.h / 50);
    for(let i = 0; i < cols; i++){
      for(let j = 0; j < rows; j++){
        const wx = b.x + 16 + i * 34;
        const wy = b.y + 26 + j * 50;
        if(wx + 14 > b.x + b.w - 8) continue;
        if(wy + 22 > b.y + b.h - 8) continue;
        const lit = (i + j) % 3 === 0;
        ctx.fillStyle = lit ? 'rgba(255,250,220,0.85)' : 'rgba(88,108,138,0.55)';
        ctx.fillRect(wx, wy, 12, 18);
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, 12, 18);
      }
    }
  });

  const hx = 780, hy = 210;
  ctx.fillStyle = '#b04838';
  ctx.beginPath();
  ctx.moveTo(hx - 28, hy); ctx.lineTo(hx + 42, hy - 78); ctx.lineTo(hx + 112, hy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a3020';
  ctx.beginPath();
  ctx.moveTo(hx - 22, hy); ctx.lineTo(hx + 42, hy - 72); ctx.lineTo(hx + 106, hy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e6dac6';
  ctx.fillRect(hx, hy, 84, 82);
  ctx.fillStyle = 'rgba(255,225,160,0.95)';
  ctx.fillRect(hx + 28, hy + 28, 28, 34);
  ctx.strokeStyle = 'rgba(80,50,30,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(hx + 28, hy + 28, 28, 34);
}

function drawAlleyDayMid(){
  brickWall(-6, 16, 172, 524, 60, 22, '#8a6a4a', 'rgba(60,40,20,0.4)');

  ctx.fillStyle = grad(0, 380, 0, 540, [
    [0, 'rgba(0,0,0,0)'],
    [1, 'rgba(60,50,40,0.32)']
  ]);
  ctx.fillRect(-6, 380, 172, 160);

  // 墙上的字
  ctx.save();
  ctx.font = 'italic 22px "KaiTi","STKaiti",serif';
  ctx.fillStyle = 'rgba(60,50,40,0.85)';
  ctx.textAlign = 'center';
  ctx.fillText('……记得回家。', 70, 280);
  ctx.restore();

  ctx.fillStyle = '#5a5048';
  ctx.fillRect(164, 116, 9, 336);
  ctx.fillStyle = '#6a6058';
  ctx.beginPath();
  ctx.moveTo(146, 120); ctx.lineTo(190, 120);
  ctx.lineTo(182, 96); ctx.lineTo(154, 96);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#2a2824';
  ctx.beginPath(); ctx.ellipse(168, 124, 8, 4.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = grad(0, 430, 0, 570, [
    [0, '#c8b89a'],
    [1, '#9a8a70']
  ]);
  ctx.fillRect(-10, 430, W + 20, 140);

  ctx.strokeStyle = 'rgba(60,40,20,0.28)';
  ctx.lineWidth = 1;
  for(let x = -60; x < W + 80; x += 120){
    ctx.beginPath();
    ctx.moveTo(x, 440); ctx.lineTo(x + 40, H);
    ctx.stroke();
  }

  const bx = 618, by = 314, bw = 126, bh = 180;
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.beginPath(); ctx.ellipse(bx + bw/2, by + bh + 2, bw * 0.6, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6a7888';
  ctx.beginPath();
  ctx.moveTo(bx + 7, by + 16); ctx.lineTo(bx + bw - 7, by + 16);
  ctx.lineTo(bx + bw - 16, by + bh); ctx.lineTo(bx + 16, by + bh);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(bx + 18, by + 30, 12, 128);
  ctx.fillStyle = '#5a6878';
  ctx.beginPath(); ctx.ellipse(bx + bw/2, by + 14, bw/2, 15, 0, 0, Math.PI * 2); ctx.fill();

  // 垃圾桶旁边的小猫（白天才有的 cat act）
  ctx.save();
  ctx.translate(bx + 30, by + bh + 26);
  ctx.fillStyle = '#d89050';
  ctx.beginPath(); ctx.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(16, -6, 12, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(9, -15); ctx.lineTo(12, -26); ctx.lineTo(19, -16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(19, -15); ctx.lineTo(25, -25); ctx.lineTo(28, -14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(60,30,10,0.7)';
  ctx.beginPath(); ctx.arc(20, -6, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(25, -6, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawAlleyDayNear(){
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(330, 492, 120, 26, 0, 0, Math.PI * 2);
  const pg = ctx.createRadialGradient(330, 492, 0, 330, 492, 120);
  pg.addColorStop(0, 'rgba(200,220,240,0.55)');
  pg.addColorStop(0.5, 'rgba(150,180,210,0.28)');
  pg.addColorStop(1, 'rgba(80,120,160,0)');
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(80,60,40,0.12)';
  ctx.beginPath(); ctx.ellipse(830, 510, 50, 8, 0, 0, Math.PI * 2); ctx.fill();
}

function drawAlleyDayDynamic(t, dt){
  dayWarmOverlay(t);
  ctx.save();
  ctx.globalAlpha = 0.06 + 0.03 * Math.sin(t * 0.8);
  ctx.fillStyle = '#fff4dc';
  ctx.beginPath();
  ctx.ellipse(660 + Math.sin(t * 0.4) * 8, 340 + Math.cos(t * 0.5) * 6, 60, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* =========================================================
   ★ 后巷 · 早（backstreet_day）
   ========================================================= */
function drawBackstreetDayFar(){
  daySky('#b8daf0', '#f0e6ce');
  daySun(200, 90, 200, 0.4);
  dayCloud(700, 100, 100, 30);

  brickWall(0, 36, W, 434, 68, 24, '#9a7a5a', 'rgba(60,40,20,0.35)');

  // 消防梯
  ctx.fillStyle = '#4a3828';
  ctx.fillRect(296, 60, 40, 380);
  ctx.fillRect(210, 60, 30, 380);

  // 锈迹
  ctx.fillStyle = 'rgba(140,80,40,0.25)';
  for(let i = 0; i < 12; i++){
    const px = 296 + Math.random() * 40;
    const py = 100 + Math.random() * 340;
    ctx.beginPath();
    ctx.arc(px, py, 3 + Math.random() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBackstreetDayMid(){
  ctx.fillStyle = '#5a4838';
  ctx.fillRect(428, 36, 18, 300);
  ctx.fillStyle = '#6a5642';
  ctx.fillRect(430, 36, 14, 300);
  for(let y = 60; y < 300; y += 30){
    ctx.fillStyle = 'rgba(160,100,60,0.35)';
    ctx.fillRect(430, y, 14, 4);
  }

  const dx = 580, dy = 130, dw = 184, dh = 334;
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.fillRect(dx - 10, dy - 10, dw + 20, dh + 14);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(dx - 7, dy - 7, dw + 14, dh + 14);
  ctx.fillStyle = '#a07850';
  ctx.fillRect(dx - 6, dy - 6, dw + 12, dh + 12);
  ctx.fillStyle = '#9a7048';
  ctx.fillRect(dx, dy, dw, dh);
  for(let y = dy + 14; y < dy + dh; y += 16){
    ctx.fillStyle = 'rgba(60,30,10,0.45)';
    ctx.fillRect(dx + 4, y, dw - 8, 2);
  }
  ctx.strokeStyle = '#6a4828';
  ctx.lineWidth = 7;
  ctx.strokeRect(dx, dy, dw, dh);

  ctx.fillStyle = '#3a3028';
  ctx.beginPath(); ctx.ellipse(dx + dw/2, dy - 24, 8, 4, 0, 0, Math.PI * 2); ctx.fill();

  // 纸箱
  const ox = 400, oy = 300, ow = 160, oh = 150;
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.fillRect(ox, oy, ow, oh);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(ox + 4, oy + 4, ow - 8, oh - 8);
  ctx.strokeStyle = '#6a4828';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox + 4, oy + 4, ow - 8, oh - 8);
  ctx.beginPath();
  ctx.moveTo(ox + ow/2, oy + 4); ctx.lineTo(ox + ow/2, oy + oh - 4);
  ctx.stroke();

  // 大橘（晒太阳）
  ctx.save();
  ctx.translate(246, 354);
  ctx.fillStyle = '#d89050';
  ctx.beginPath(); ctx.ellipse(0, 0, 46, 27, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(37, -13, 24, 21, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c07840';
  ctx.beginPath(); ctx.moveTo(24, -28); ctx.lineTo(28, -48); ctx.lineTo(43, -29); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(43, -30); ctx.lineTo(55, -47); ctx.lineTo(58, -25); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,10,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(41, -14, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(55, -13, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.strokeStyle = '#d89050';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-40, 4); ctx.quadraticCurveTo(-78, -2, -64, 26); ctx.stroke();
  ctx.restore();

  // 配电房门（左墙）
  ctx.fillStyle = '#4a3828';
  ctx.fillRect(20, 260, 100, 220);
  ctx.fillStyle = '#3a2c1e';
  ctx.fillRect(28, 268, 84, 204);
  ctx.fillStyle = 'rgba(200,60,50,0.75)';
  ctx.fillRect(40, 290, 60, 30);
  ctx.fillStyle = 'rgba(255,245,180,0.95)';
  ctx.font = 'bold 13px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('配电', 70, 305);
}

function drawBackstreetDayNear(){
  ctx.fillStyle = grad(0, 470, 0, H, [
    [0, '#b8a888'],
    [1, '#8a7a60']
  ]);
  ctx.fillRect(0, 470, W, 70);

  ctx.fillStyle = 'rgba(120,160,200,0.25)';
  ctx.beginPath(); ctx.ellipse(300, 500, 120, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(680, 520, 80, 20, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(80,60,40,0.28)';
  for(let i = 0; i < 12; i++){
    const lx = (i * 67) % W;
    const ly = 480 + (i * 23) % 40;
    ctx.beginPath(); ctx.ellipse(lx, ly, 8, 4, i * 0.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBackstreetDayDynamic(t, dt){
  dayWarmOverlay(t);
  ctx.save();
  ctx.globalAlpha = 0.08 + 0.04 * Math.sin(t * 0.7);
  ctx.fillStyle = '#fff4dc';
  ctx.beginPath();
  ctx.ellipse(320 + Math.sin(t * 0.5) * 10, 380, 80, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* =========================================================
   ★ 便利店 · 早（shop_day）
   ========================================================= */
function drawShopDayFar(){
  ctx.fillStyle = grad(0, 0, 0, H, [
    [0, '#f2e8d6'],
    [0.5, '#e8dcc4'],
    [1, '#c8b898']
  ]);
  ctx.fillRect(0, 0, W, H);

  // 货架背景
  const shelfYs = [168, 256, 344];
  shelfYs.forEach(y => {
    ctx.fillStyle = 'rgba(120,90,60,0.35)';
    ctx.fillRect(110, y + 13, 320, 4);
    ctx.fillStyle = '#c8b8a0';
    ctx.fillRect(110, y, 320, 13);
    ctx.fillRect(110, y, 11, 90);
    ctx.fillRect(419, y, 11, 90);

    const colors = ['#c08a5a', '#8aa06a', '#6a8aaa', '#aa6a7a', '#d0a87a'];
    for(let j = 0; j < 7; j++){
      const w0 = 22 + ((j * 13) % 10);
      const h0 = 26 + ((j * 7) % 16);
      ctx.fillStyle = colors[j % colors.length];
      ctx.fillRect(126 + j * 42, y - h0, w0, h0);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(126 + j * 42, y - h0, 3, h0);
      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(126 + j * 42, y - h0, w0, h0);
    }
  });
}

function drawShopDayMid(){
  // 后窗（透光）
  ctx.fillStyle = 'rgba(60,40,20,0.3)';
  ctx.fillRect(46, 184, 142, 162);
  ctx.fillStyle = '#bfe0f5';
  ctx.fillRect(52, 190, 130, 150);
  ctx.fillStyle = 'rgba(255,250,220,0.55)';
  ctx.fillRect(60, 200, 50, 60);
  ctx.strokeStyle = '#a08a6a';
  ctx.lineWidth = 5;
  ctx.strokeRect(52, 190, 130, 150);
  ctx.beginPath();
  ctx.moveTo(117, 190); ctx.lineTo(117, 340);
  ctx.moveTo(52, 265); ctx.lineTo(182, 265);
  ctx.stroke();

  // 收银台（老周站在后面）
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.fillRect(616, 334, 304, 8);
  ctx.fillStyle = '#b09a78';
  ctx.fillRect(618, 320, 300, 148);
  ctx.fillStyle = '#a08a68';
  ctx.fillRect(680, 256, 96, 66);
  ctx.fillStyle = '#2a2824';
  ctx.fillRect(692, 266, 72, 34);
  ctx.fillStyle = 'rgba(180,220,240,0.75)';
  ctx.fillRect(694, 268, 68, 30);

  // 老周
  ctx.fillStyle = '#8a7a6a';
  ctx.beginPath(); ctx.arc(880, 240, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(858, 262, 44, 60);
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath(); ctx.arc(880, 240, 24, Math.PI, 0); ctx.fill();
}

function drawShopDayNear(){
  ctx.fillStyle = grad(0, 430, 0, H, [
    [0, '#c8b8a0'],
    [1, '#8a7a60']
  ]);
  ctx.fillRect(0, 430, W, 110);

  ctx.strokeStyle = 'rgba(60,40,20,0.2)';
  ctx.lineWidth = 1;
  for(let y = 440; y < H; y += 30){
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for(let x = 0; x < W; x += 60){
    ctx.beginPath(); ctx.moveTo(x, 430); ctx.lineTo(x, H); ctx.stroke();
  }

  // 地板上的爪印
  ctx.fillStyle = 'rgba(80,60,40,0.4)';
  for(let i = 0; i < 7; i++){
    const px = 380 + i * 28;
    const py = 460 + Math.sin(i * 0.9) * 4;
    ctx.beginPath(); ctx.ellipse(px, py, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px - 5, py - 6, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + 5, py - 6, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  // 后门（回后巷）
  ctx.fillStyle = 'rgba(60,40,20,0.4)';
  ctx.fillRect(884, 184, 60, 162);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(890, 190, 50, 150);
  ctx.fillStyle = '#a08060';
  ctx.fillRect(896, 200, 38, 130);
  ctx.strokeStyle = '#5a4028';
  ctx.lineWidth = 4;
  ctx.strokeRect(890, 190, 50, 150);

  // 通往后街的出口
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.fillRect(870, 440, 90, 100);
  ctx.fillStyle = '#bfe0f5';
  ctx.fillRect(876, 446, 78, 88);
  ctx.fillStyle = 'rgba(255,250,220,0.6)';
  ctx.fillRect(884, 460, 30, 50);
  ctx.strokeStyle = '#a08a6a';
  ctx.lineWidth = 3;
  ctx.strokeRect(876, 446, 78, 88);
}

function drawShopDayDynamic(t, dt){
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(470, 400, 0, 470, 400, 640);
  g.addColorStop(0, 'rgba(255,244,220,0.18)');
  g.addColorStop(0.5, 'rgba(255,238,200,0.06)');
  g.addColorStop(1, 'rgba(255,220,160,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for(let i = 0; i < 15; i++){
    const dx = (i * 73 + t * 10) % W;
    const dy = (i * 47 + Math.sin(t * 0.5 + i) * 20 + 100) % H;
    ctx.fillStyle = 'rgba(255, 250, 220, ' + (0.1 + (i % 3) * 0.05) + ')';
    ctx.beginPath(); ctx.arc(dx, dy, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* =========================================================
   ★ 街道 · 早（street_day）
   ========================================================= */
function drawStreetDayFar(){
  daySky('#bfe0f5', '#f4ebd5');
  daySun(160, 70, 230, 0.4);

  ctx.fillStyle = '#c8d0d8';
  ctx.fillRect(0, 178, 244, 292);
  ctx.fillRect(876, 136, 84, 334);
  ctx.fillStyle = '#b8c4d0';
  ctx.fillRect(230, 200, 140, 270);
  ctx.fillRect(390, 170, 120, 300);
  ctx.fillRect(540, 190, 120, 280);

  for(let i = 0; i < 3; i++){
    for(let j = 0; j < 3; j++){
      const wins = [
        [30 + i * 70, 218 + j * 82, 26, 34],
        [898 + i * 20, 190 + j * 92, 16, 26],
        [250 + i * 44, 240 + j * 80, 20, 26],
        [410 + i * 36, 210 + j * 84, 18, 24]
      ];
      wins.forEach(w0 => {
        const lit = (i + j) % 3 === 0;
        ctx.fillStyle = lit ? 'rgba(255,250,220,0.82)' : 'rgba(90,110,140,0.55)';
        ctx.fillRect(w0[0], w0[1], w0[2], w0[3]);
        ctx.strokeStyle = 'rgba(0,0,0,0.16)';
        ctx.lineWidth = 1;
        ctx.strokeRect(w0[0], w0[1], w0[2], w0[3]);
      });
    }
  }

  const rx = 630, ry = 258, rw = 180;
  ctx.fillStyle = '#b04838';
  ctx.beginPath();
  ctx.moveTo(rx, ry); ctx.lineTo(rx + 90, ry - 72); ctx.lineTo(rx + rw, ry);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a3020';
  ctx.beginPath();
  ctx.moveTo(rx + 8, ry); ctx.lineTo(rx + 90, ry - 66); ctx.lineTo(rx + rw - 8, ry);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e6dac6';
  ctx.fillRect(rx + 24, ry, 132, 122);
  ctx.fillStyle = 'rgba(255,225,160,0.95)';
  ctx.fillRect(rx + 70, ry + 34, 40, 46);
}

function drawStreetDayMid(){
  const gx = 520, gy = 168, gw = 360, gh = 362;
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.fillRect(gx + 4, gy + 4, gw, gh);
  ctx.fillStyle = '#8a7a6a';
  ctx.fillRect(gx, gy, 26, gh);
  ctx.fillRect(gx + gw - 26, gy, 26, gh);
  ctx.fillRect(gx, gy, gw, 22);
  ctx.fillRect(gx, gy + gh - 18, gw, 18);
  for(let i = 0; i < 9; i++){
    const x = gx + 40 + i * 35;
    ctx.fillRect(x, gy + 22, 8, gh - 40);
  }
  ctx.fillRect(gx, gy + 150, gw, 10);

  // 铁门开着（gateOpen 后）
  if(flags().gateOpen){
    ctx.fillStyle = 'rgba(255,240,200,0.4)';
    ctx.fillRect(gx + 90, gy + 30, 180, gh - 60);
  }

  brickWall(0, 298, 202, 242, 60, 22, '#a08060', 'rgba(60,40,20,0.35)');
  ctx.fillStyle = '#e0d0b8';
  ctx.fillRect(118, 318, 38, 24);
  ctx.fillStyle = '#5a4838';
  ctx.font = 'bold 13px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('17', 137, 330);

  // 梧桐树
  ctx.fillStyle = '#5a4028';
  ctx.fillRect(870, 220, 14, 260);
  ctx.fillStyle = '#6a5038';
  ctx.fillRect(860, 230, 34, 20);
  ctx.fillStyle = '#4a6a3a';
  ctx.beginPath(); ctx.arc(878, 190, 60, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a7a48';
  ctx.beginPath(); ctx.arc(850, 210, 40, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(906, 210, 44, 0, Math.PI * 2); ctx.fill();

  // 信箱
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(826, 340, 30, 42);
  ctx.fillStyle = '#a08060';
  ctx.beginPath();
  ctx.arc(841, 360, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a4028';
  ctx.fillRect(838, 320, 6, 22);

  // 配电房
  const px = 224, py = 250, pw = 76, ph = 180;
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.fillRect(px + 4, py + 4, pw, ph);
  ctx.fillStyle = '#7a6a58';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for(let y = py + 16; y < py + ph; y += 14){
    ctx.beginPath();
    ctx.moveTo(px + 4, y); ctx.lineTo(px + pw - 4, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#5a4838';
  ctx.lineWidth = 4;
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = 'rgba(200,60,50,0.85)';
  ctx.fillRect(px + 20, py + 26, 36, 20);
  ctx.fillStyle = 'rgba(255,250,200,0.95)';
  ctx.font = 'bold 9px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('配电', px + 38, py + 36);

  // 地下通道入口
  const ux = 130, uy = 358, uw = 84, uh = 62;
  ctx.fillStyle = 'rgba(60,40,20,0.4)';
  ctx.fillRect(ux, uy, uw, uh);
  ctx.fillStyle = '#3a3028';
  ctx.fillRect(ux + 6, uy + 6, uw - 12, uh - 12);
  ctx.strokeStyle = '#5a4838';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ux + 4, uy + 12); ctx.lineTo(ux + 4, uy + uh - 4);
  ctx.moveTo(ux + uw - 4, uy + 12); ctx.lineTo(ux + uw - 4, uy + uh - 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(200,220,240,0.9)';
  ctx.fillRect(ux + 14, uy - 8, 56, 14);
  ctx.fillStyle = '#3a3028';
  ctx.font = 'bold 9px "PingFang SC",sans-serif';
  ctx.fillText('地下通道 ↓', ux + 42, uy - 1);

  // 河堤
  const rx = 4, ry = 380, rw = 60, rh = 60;
  ctx.fillStyle = 'rgba(140,180,220,0.35)';
  ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = '#5a4838';
  ctx.lineWidth = 2;
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.fillStyle = '#3a3028';
  ctx.font = 'bold 9px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('河堤', rx + rw / 2, ry + rh / 2 + 3);
}

function drawStreetDayNear(){
  ctx.fillStyle = grad(0, 470, 0, H, [
    [0, '#c8b89a'],
    [1, '#9a8a70']
  ]);
  ctx.fillRect(0, 470, W, 70);

  // 消防栓
  ctx.fillStyle = '#b04838';
  ctx.fillRect(770, 456, 16, 36);
  ctx.fillStyle = '#c85848';
  ctx.beginPath();
  ctx.arc(778, 454, 10, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(60,30,20,0.4)';
  ctx.beginPath(); ctx.ellipse(778, 500, 22, 5, 0, 0, Math.PI * 2); ctx.fill();

  // 路灯
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.fillRect(152, 240, 16, 250);
  ctx.fillStyle = '#5a4838';
  ctx.fillRect(150, 240, 20, 250);
  ctx.fillStyle = '#3a3028';
  ctx.beginPath();
  ctx.arc(160, 236, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,160,0.6)';
  ctx.beginPath();
  ctx.arc(160, 236, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(100,140,190,0.14)';
  ctx.beginPath(); ctx.ellipse(300, 510, 60, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(700, 500, 80, 12, 0, 0, Math.PI * 2); ctx.fill();
}

function drawStreetDayDynamic(t, dt){
  dayWarmOverlay(t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sweep = (t * 0.08) % 1.6;
  if(sweep < 1){
    const sx = -300 + sweep * 1600;
    const g = ctx.createRadialGradient(sx, 460, 0, sx, 460, 320);
    g.addColorStop(0, 'rgba(255,248,220,0.22)');
    g.addColorStop(1, 'rgba(255,248,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - 340, 140, 680, 400);
  }
  ctx.restore();
}

/* =========================================================
   ★ 门前 · 早（doorstep_day）
   ========================================================= */
function drawDoorstepDayFar(){
  daySky('#bcdcf2', '#f2e8d0');
  daySun(160, 60, 220, 0.4);
  dayCloud(720, 80, 90, 28);

  const far = [
    { x: 0,   y: 240, w: 100, h: 160 },
    { x: 100, y: 260, w: 90,  h: 140 },
    { x: 190, y: 230, w: 100, h: 170 },
    { x: 840, y: 250, w: 120, h: 150 },
    { x: 920, y: 240, w: 40,  h: 160 }
  ];
  far.forEach(b => {
    ctx.fillStyle = '#b8c4d0';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });
}

function drawDoorstepDayMid(){
  const hx = 240, hy = 120, hw = 480, hh = 300;

  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.beginPath();
  ctx.ellipse(hx + hw / 2, hy + hh + 10, hw * 0.55, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d0c0a0';
  ctx.fillRect(hx, hy + 60, hw, hh - 60);
  ctx.fillStyle = '#e0d0b0';
  ctx.fillRect(hx, hy + 60, hw, 20);

  ctx.strokeStyle = 'rgba(60,40,20,0.22)';
  ctx.lineWidth = 1;
  for(let y = hy + 80; y < hy + hh; y += 16){
    ctx.beginPath();
    ctx.moveTo(hx + 4, y);
    ctx.lineTo(hx + hw - 4, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#b04838';
  ctx.beginPath();
  ctx.moveTo(hx - 40, hy + 80);
  ctx.lineTo(hx + hw / 2, hy - 20);
  ctx.lineTo(hx + hw + 40, hy + 80);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#c85848';
  ctx.beginPath();
  ctx.moveTo(hx - 30, hy + 78);
  ctx.lineTo(hx + hw / 2, hy - 14);
  ctx.lineTo(hx + hw + 30, hy + 78);
  ctx.closePath();
  ctx.fill();

  // 左窗
  const wx = hx + 40, wy = hy + 120, ww = 100, wh = 120;
  ctx.fillStyle = 'rgba(60,40,20,0.3)';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = 'rgba(255,250,225,0.88)';
  ctx.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);
  ctx.strokeStyle = '#a08a6a';
  ctx.lineWidth = 8;
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy);
  ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.moveTo(wx, wy + wh / 2);
  ctx.lineTo(wx + ww, wy + wh / 2);
  ctx.stroke();

  // 门
  const dx = hx + hw / 2 - 55, dy = hy + 200, dw = 110, dh = 140;
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(dx - 12, dy - 12, dw + 24, dh + 12);
  ctx.fillStyle = '#9a7a5a';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.strokeStyle = 'rgba(60,40,20,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dx + dw / 2, dy);
  ctx.lineTo(dx + dw / 2, dy + dh);
  ctx.stroke();
  ctx.fillStyle = '#d0a040';
  ctx.beginPath();
  ctx.arc(dx + dw - 22, dy + dh / 2 + 6, 5, 0, Math.PI * 2);
  ctx.fill();

  // 门灯
  const lx = hx + hw / 2, ly = dy - 28;
  ctx.fillStyle = '#5a4838';
  ctx.beginPath();
  ctx.moveTo(lx - 14, ly);
  ctx.lineTo(lx + 14, ly);
  ctx.lineTo(lx + 10, ly + 14);
  ctx.lineTo(lx - 10, ly + 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,200,0.85)';
  ctx.beginPath();
  ctx.ellipse(lx, ly + 12, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawDoorstepDayNear(){
  const hx = 240, hy = 120, hw = 480, hh = 300;
  const dx = hx + hw / 2 - 55, dy = hy + 200, dw = 110, dh = 140;
  const sx = hx + hw / 2 - 80, sy = dy + dh;

  // 台阶
  ctx.fillStyle = '#a89878';
  ctx.fillRect(sx, sy, 160, 12);
  ctx.fillStyle = '#b8a888';
  ctx.fillRect(sx + 8, sy + 12, 144, 12);
  ctx.fillStyle = '#a89878';
  ctx.fillRect(sx + 16, sy + 24, 128, 12);

  ctx.fillStyle = 'rgba(255,255,240,0.55)';
  ctx.fillRect(sx, sy, 160, 2);
  ctx.fillRect(sx + 8, sy + 12, 144, 2);
  ctx.fillRect(sx + 16, sy + 24, 128, 2);

  ctx.fillStyle = 'rgba(100,140,190,0.2)';
  ctx.beginPath();
  ctx.ellipse(hx + hw / 2, 500, 120, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,240,200,0.4)';
  ctx.beginPath();
  ctx.ellipse(hx + hw / 2, 500, 50, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const egL = ctx.createLinearGradient(0, 0, 80, 0);
  egL.addColorStop(0, 'rgba(80,60,40,0.35)');
  egL.addColorStop(1, 'rgba(80,60,40,0)');
  ctx.fillStyle = egL;
  ctx.fillRect(0, 0, 80, H);

  const egR = ctx.createLinearGradient(W - 80, 0, W, 0);
  egR.addColorStop(0, 'rgba(80,60,40,0)');
  egR.addColorStop(1, 'rgba(80,60,40,0.35)');
  ctx.fillStyle = egR;
  ctx.fillRect(W - 80, 0, 80, H);
}

function drawDoorstepDayDynamic(t, dt){
  dayWarmOverlay(t);
}

/* =========================================================
   ★ 红屋顶 · 早（house_day）
   ========================================================= */
function drawHouseDayFar(){
  ctx.fillStyle = grad(0, 0, 0, H, [
    [0, '#f0e4cc'],
    [0.5, '#e8dcc4'],
    [1, '#c8b898']
  ]);
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(120,90,60,0.12)';
  ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 48){
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, H);
    ctx.stroke();
  }
}

function drawHouseDayMid(){
  woodGrain(0, 420, W, 120, '#8a6a4a', 'rgba(60,40,20,0.32)', true);
  ctx.fillStyle = 'rgba(60,40,20,0.15)';
  ctx.fillRect(0, 420, W, 120);
  ctx.fillStyle = '#6a5038';
  ctx.fillRect(0, 414, W, 6);

  // 窗户（白天的窗外是天空）
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(72, 80, 228, 228);
  ctx.fillStyle = '#bfe0f5';
  ctx.fillRect(80, 88, 212, 212);
  ctx.fillStyle = 'rgba(255,250,220,0.75)';
  ctx.beginPath(); ctx.arc(242, 142, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.arc(130, 120, 20, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(160, 116, 26, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(200, 122, 18, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a6a4a';
  ctx.lineWidth = 9;
  ctx.strokeRect(80, 88, 212, 212);
  ctx.beginPath();
  ctx.moveTo(186, 88); ctx.lineTo(186, 300);
  ctx.moveTo(80, 194); ctx.lineTo(292, 194);
  ctx.stroke();

  // 台灯
  ctx.fillStyle = '#6a5038';
  ctx.fillRect(846, 306, 12, 130);
  ctx.beginPath();
  ctx.moveTo(806, 306); ctx.lineTo(898, 306);
  ctx.lineTo(878, 260); ctx.lineTo(826, 260);
  ctx.closePath();
  ctx.fillStyle = '#d0a860';
  ctx.fill();

  // 书架
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(60, 300, 60, 140);
  ctx.fillStyle = '#5a4028';
  ctx.fillRect(64, 304, 52, 4);
  ctx.fillRect(64, 344, 52, 4);
  ctx.fillRect(64, 384, 52, 4);
  const bookColors = ['#a08a60', '#8a7a50', '#a89870', '#7a6a44', '#b0a080'];
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

  // 桌子
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.beginPath(); ctx.ellipse(510, 516, 175, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(360, 388, 300, 18);
  ctx.fillStyle = '#6a5038';
  ctx.fillRect(378, 406, 16, 122);
  ctx.fillRect(626, 406, 16, 122);

  // 相框
  ctx.save();
  ctx.translate(470, 292); ctx.rotate(-0.045);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(-60, -52, 120, 104);
  ctx.fillStyle = '#9a7a5a';
  ctx.fillRect(-58, -50, 116, 100);
  ctx.fillStyle = '#c0a870';
  ctx.fillRect(-53, -45, 106, 90);
  ctx.restore();

  // 挂钟
  ctx.fillStyle = '#7a5a3a';
  ctx.beginPath(); ctx.arc(540, 120, 32, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f0e4cc';
  ctx.beginPath(); ctx.arc(540, 120, 27, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a4028';
  ctx.lineWidth = 1.5;
  for(let i = 0; i < 12; i++){
    const a = i * Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(540 + Math.cos(a) * 22, 120 + Math.sin(a) * 22);
    ctx.lineTo(540 + Math.cos(a) * 25, 120 + Math.sin(a) * 25);
    ctx.stroke();
  }
}

function drawHouseDayNear(){
  ctx.fillStyle = grad(0, 520, 0, H, [
    [0, 'rgba(0,0,0,0)'],
    [1, 'rgba(80,60,40,0.28)']
  ]);
  ctx.fillRect(0, 520, W, 20);

  // 摇椅
  ctx.save();
  ctx.translate(170, 420);
  ctx.rotate(0);
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 56, 64, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-46, 0); ctx.quadraticCurveTo(-20, 42, 10, 52);
  ctx.moveTo(46, 0); ctx.quadraticCurveTo(20, 42, -10, 52);
  ctx.stroke();
  ctx.fillStyle = '#6a5038';
  ctx.fillRect(-50, -12, 100, 14);
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-42, -10); ctx.lineTo(-56, -118);
  ctx.moveTo(42, -10); ctx.lineTo(56, -118);
  ctx.moveTo(-56, -118); ctx.lineTo(56, -118);
  ctx.stroke();
  ctx.restore();

  // 小碗
  ctx.save();
  ctx.translate(295, 495);
  ctx.fillStyle = 'rgba(60,40,20,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 10, 38, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8c8a8';
  ctx.beginPath();
  ctx.moveTo(-30, -8);
  ctx.quadraticCurveTo(-32, 10, 0, 14);
  ctx.quadraticCurveTo(32, 10, 30, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a7a60';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = 'rgba(255,250,220,0.4)';
  const g = ctx.createRadialGradient(852, 300, 0, 852, 300, 400);
  g.addColorStop(0, 'rgba(255,240,200,0.22)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(400, 0, 560, 600);
}

function drawHouseDayDynamic(t, dt){
  dayWarmOverlay(t);
  // 时钟指针
  ctx.save();
  ctx.translate(540, 120);
  const hA = (t * 0.02) % (Math.PI * 2);
  const mA = (t * 0.3) % (Math.PI * 2);
  ctx.strokeStyle = '#5a4028';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(hA) * 14, Math.sin(hA) * 14);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(mA) * 20, Math.sin(mA) * 20);
  ctx.stroke();
  ctx.fillStyle = '#8a6a4a';
  ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 相框内容（photoJoined）
  if(flags().photoJoined){
    ctx.save();
    ctx.translate(470, 292); ctx.rotate(-0.045);
    ctx.fillStyle = '#e0d0b0';
    ctx.fillRect(-48, -40, 96, 80);
    ctx.fillStyle = '#a09070';
    ctx.fillRect(-44, -36, 88, 72);
    ctx.fillStyle = '#5a4838';
    ctx.beginPath(); ctx.arc(-6, -10, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-22, 0, 32, 34);
    ctx.fillStyle = '#4a3828';
    ctx.beginPath(); ctx.ellipse(24, 12, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(35, 0, 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a7fb5';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(35, 7, 7, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.fillStyle = '#b04838';
    ctx.beginPath();
    ctx.moveTo(6, 34); ctx.lineTo(30, 14); ctx.lineTo(54, 34);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  if(window.__ENDING__){
    const g = ctx.createRadialGradient(480, 200, 0, 480, 200, 640);
    g.addColorStop(0, 'rgba(255,248,220,0.3)');
    g.addColorStop(1, 'rgba(255,248,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

/* =========================================================
   ★ 场景 SPOTS 定义（原有夜间 + 新增白天）
   ========================================================= */
const SCENES = {
  parlor: {
    layers: { far: drawParlorFar, mid: drawParlorMid, near: drawParlorNear },
    dynamic: drawParlorDynamic, rain: false,
    spots: [
      { id:'mahjong',  x:380, y:380, w:220, h:140, label:'麻将桌' },
      { id:'window',   x:680, y:100, w:180, h:240, label:'后窗' },
      { id:'clock',    x:100, y:80,  w:80,  h:80,  label:'老挂钟' },
      { id:'back',     x:16,  y:244, w:52,  h:52,  label:'离开' }
    ]
  },
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
      { id:'parlorDoor', x:340, y:300, w:50, h:80, label:'棋牌室' },
      { id:'back',   x:16,  y:244, w:52,  h:52,  label:'回到雨巷' }
    ]
  },
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
  street: {
    layers: { far: drawStreetFar, mid: drawStreetMid, near: drawStreetNear },
    dynamic: drawStreetDynamic, rain: true,
    spots: [
      { id:'lamp',    x:145, y:240, w:40,  h:90,  label:'路灯' },
      { id:'power',   x:224, y:250, w:76,  h:180, label:'配电房' },
      { id:'under',   x:128, y:356, w:88,  h:66,  label:'地下通道' },
      { id:'river',   x:0,   y:376, w:68,  h:68,  label:'河堤' },
      { id:'gate',    x:520, y:148, w:360, h:382, label:'铁门' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回后巷' }
    ]
  },
  doorstep: {
    layers: { far: drawDoorstepFar, mid: drawDoorstepMid, near: drawDoorstepNear },
    dynamic: drawDoorstepDynamic, rain: false,
    spots: [
      { id:'window', x:280, y:240, w:100, h:120, label:'窗户' },
      { id:'lamp',   x:445, y:284, w:70,  h:44,  label:'门灯' },
      { id:'door',   x:425, y:320, w:110, h:140, label:'门' },
      { id:'steps',  x:400, y:456, w:160, h:44,  label:'台阶' },
      { id:'back',   x:16,  y:244, w:52,  h:52,  label:'回到街道' }
    ]
  },
  house: {
    layers: { far: drawHouseFar, mid: drawHouseMid, near: drawHouseNear },
    dynamic: drawHouseDynamic, rain: false,
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
    layers: { far: drawPowerStationFar, mid: drawPowerStationMid, near: drawPowerStationNear },
    dynamic: drawPowerStationDynamic, rain: false,
    spots: [
      { id:'breaker', x:460, y:140, w:140, h:140, label:'电闸' },
      { id:'fuse',    x:60,  y:200, w:120, h:180, label:'保险丝盒' },
      { id:'log',     x:720, y:320, w:200, h:120, label:'工作日志' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回去' }
    ]
  },
  rooftop: {
    layers: { far: drawRooftopFar, mid: drawRooftopMid, near: drawRooftopNear },
    dynamic: drawRooftopDynamic, rain: false,
    spots: [
      { id:'antenna',   x:100, y:180, w:80,  h:260, label:'旧天线' },
      { id:'watertank', x:780, y:210, w:130, h:130, label:'水塔' },
      { id:'hang',      x:350, y:240, w:180, h:80,  label:'晾衣架' },
      { id:'houseroof', x:590, y:200, w:120, h:130, label:'远处的红屋顶' },
      { id:'back',      x:16,  y:244, w:52,  h:52,  label:'回到后巷' }
    ]
  },
  underpass: {
    layers: { far: drawUnderpassFar, mid: drawUnderpassMid, near: drawUnderpassNear },
    dynamic: drawUnderpassDynamic, rain: false,
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
    layers: { far: drawRiversideFar, mid: drawRiversideMid, near: drawRiversideNear },
    dynamic: drawRiversideDynamic, rain: true,
    spots: [
      { id:'lamp',     x:56,  y:300, w:60,  h:120, label:'路灯' },
      { id:'bench',    x:230, y:440, w:150, h:100, label:'长椅' },
      { id:'umbrella', x:660, y:440, w:100, h:80,  label:'丢弃的伞' },
      { id:'river',    x:400, y:470, w:200, h:60,  label:'河面' },
      { id:'back',     x:16,  y:244, w:52,  h:52,  label:'回到街道' }
    ]
  },
  neighbor: {
    layers: { far: drawNeighborFar, mid: drawNeighborMid, near: drawNeighborNear },
    dynamic: drawNeighborDynamic, rain: false,
    spots: [
      { id:'neighborWindow',   x:300, y:150, w:300, h:260, label:'窗户' },
      { id:'neighborCalendar', x:92,  y:162, w:86,  h:108, label:'日历' },
      { id:'neighborFloor',    x:260, y:462, w:280, h:76,  label:'地板上的爪印' },
      { id:'neighborBed',      x:672, y:314, w:256, h:172, label:'小床' },
      { id:'back',             x:16,  y:456, w:100, h:84,  label:'来的路' },
      { id:'exit',             x:856, y:236, w:96,  h:138, label:'通向院子的门' }
    ]
  },

  /* ============ ★ 白天场景（新增） ============ */
  alley_day: {
    layers: { far: drawAlleyDayFar, mid: drawAlleyDayMid, near: drawAlleyDayNear },
    dynamic: drawAlleyDayDynamic, rain: false,
    spots: [
      { id:'lamp',     x:136, y:88,  w:66,  h:56,  label:'路灯' },
      { id:'graffiti', x:28,  y:250, w:84,  h:70,  label:'墙上的字' },
      { id:'trash',    x:610, y:294, w:144, h:212, label:'垃圾桶' },
      { id:'cat',      x:640, y:430, w:80,  h:70,  label:'小猫' },
      { id:'puddle',   x:236, y:466, w:190, h:56,  label:'水洼' },
      { id:'exit',     x:892, y:244, w:52,  h:52,  label:'巷子深处' }
    ]
  },
  backstreet_day: {
    layers: { far: drawBackstreetDayFar, mid: drawBackstreetDayMid, near: drawBackstreetDayNear },
    dynamic: drawBackstreetDayDynamic, rain: false,
    spots: [
      { id:'stairs',    x:210, y:60,  w:130, h:380, label:'消防梯' },
      { id:'mold',      x:540, y:220, w:80,  h:90,  label:'墙上的霉斑' },
      { id:'box',       x:400, y:300, w:160, h:150, label:'纸箱' },
      { id:'cat',       x:196, y:314, w:100, h:84,  label:'大橘' },
      { id:'door',      x:580, y:130, w:184, h:334, label:'后门' },
      { id:'powerDoor', x:20,  y:260, w:100, h:220, label:'配电房' },
      { id:'back',      x:16,  y:244, w:52,  h:52,  label:'回到雨巷' }
    ]
  },
  shop_day: {
    layers: { far: drawShopDayFar, mid: drawShopDayMid, near: drawShopDayNear },
    dynamic: drawShopDayDynamic, rain: false,
    spots: [
      { id:'poster',  x:490, y:100, w:90,  h:110, label:'墙上海报' },
      { id:'counter', x:618, y:248, w:300, h:220, label:'收银台' },
      { id:'shelf',   x:100, y:148, w:340, h:266, label:'货架' },
      { id:'floor',   x:360, y:440, w:220, h:80,  label:'地板' },
      { id:'window',  x:46,  y:184, w:142, h:162, label:'后窗' },
      { id:'back',    x:884, y:184, w:60,  h:162, label:'回到后巷' },
      { id:'exit',    x:870, y:440, w:90,  h:100, label:'街道' }
    ]
  },
  street_day: {
    layers: { far: drawStreetDayFar, mid: drawStreetDayMid, near: drawStreetDayNear },
    dynamic: drawStreetDayDynamic, rain: false,
    spots: [
      { id:'lamp',    x:145, y:236, w:40,  h:90,  label:'路灯' },
      { id:'power',   x:224, y:250, w:76,  h:180, label:'配电房' },
      { id:'under',   x:128, y:356, w:88,  h:66,  label:'地下通道' },
      { id:'river',   x:0,   y:376, w:68,  h:68,  label:'河堤' },
      { id:'rope',    x:238, y:130, w:100, h:80,  label:'晾衣绳的位置' },
      { id:'gate',    x:520, y:148, w:360, h:382, label:'铁门' },
      { id:'tree',    x:820, y:150, w:120, h:200, label:'梧桐树' },
      { id:'mailbox', x:820, y:320, w:60,  h:80,  label:'信箱' },
      { id:'fire',    x:750, y:440, w:80,  h:60,  label:'消防栓' },
      { id:'back',    x:16,  y:244, w:52,  h:52,  label:'回后巷' }
    ]
  },
  doorstep_day: {
    layers: { far: drawDoorstepDayFar, mid: drawDoorstepDayMid, near: drawDoorstepDayNear },
    dynamic: drawDoorstepDayDynamic, rain: false,
    spots: [
      { id:'window', x:280, y:240, w:100, h:120, label:'窗户' },
      { id:'lamp',   x:445, y:284, w:70,  h:44,  label:'门灯' },
      { id:'door',   x:425, y:320, w:110, h:140, label:'门' },
      { id:'steps',  x:400, y:456, w:160, h:44,  label:'台阶' },
      { id:'back',   x:16,  y:244, w:52,  h:52,  label:'回到街道' }
    ]
  },
  house_day: {
    layers: { far: drawHouseDayFar, mid: drawHouseDayMid, near: drawHouseDayNear },
    dynamic: drawHouseDayDynamic, rain: false,
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
  }
};

window.__SCENES__ = Object.assign({ setCtx, getCtx }, SCENES);
})();