/* =========================================================
   scenes.js — 10 场景绘制 + 定义
   依赖 window.S（游戏状态）
   ========================================================= */
(function(){
'use strict';

const W = 960, H = 540;
let ctx = null;
function setCtx(c){ ctx = c; }
function getCtx(){ return ctx; }

function flags(){ return (window.S && window.S.flags) || {}; }
function isPowerCut(){ return !!flags().powerCut; }
/* ★ 暗色分支：只判断 bloodMode，与主播模式无关 */
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
   雨巷
   ========================================================= */
function drawAlleyStatic(){
  const cut = isPowerCut();
  const blood = isBloodMode();

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

  /* 远处红屋顶：暗色模式下变成烧焦的黑屋顶 */
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
  if(blood){
    /* 烟囱冒黑烟 */
    ctx.fillStyle = 'rgba(30,10,15,0.7)';
    ctx.beginPath();
    ctx.ellipse(hx+42, hy-100, 20, 8, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx+42, hy-120, 32, 10, 0, 0, Math.PI*2);
    ctx.fill();
  }
  if(!cut && !blood){
    ctx.fillStyle = 'rgba(255,200,120,0.75)';
    ctx.fillRect(hx+28, hy+28, 28, 34);
    const hg = ctx.createRadialGradient(hx+42, hy+45, 0, hx+42, hy+45, 90);
    hg.addColorStop(0,'rgba(255,200,120,0.32)');
    hg.addColorStop(1,'rgba(255,200,120,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(hx-60, hy-60, 210, 210);
  } else if(blood){
    /* 血窗 */
    ctx.fillStyle = 'rgba(180,30,40,0.75)';
    ctx.fillRect(hx+28, hy+28, 28, 34);
    const hg = ctx.createRadialGradient(hx+42, hy+45, 0, hx+42, hy+45, 90);
    hg.addColorStop(0,'rgba(220,40,50,0.35)');
    hg.addColorStop(1,'rgba(200,20,30,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(hx-60, hy-60, 210, 210);
  }

  /* 霓虹招牌 */
  if(!cut && !blood){
    ctx.fillStyle = 'rgba(70,220,255,0.55)';
    ctx.fillRect(380, 130, 44, 5);
    ctx.fillRect(380, 142, 30, 5);
    ctx.fillRect(380, 154, 38, 5);
    const ng = ctx.createRadialGradient(402, 144, 0, 402, 144, 90);
    ng.addColorStop(0,'rgba(70,220,255,0.22)');
    ng.addColorStop(1,'rgba(70,220,255,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(320, 60, 180, 180);
    ctx.fillStyle = 'rgba(255,110,180,0.55)';
    ctx.fillRect(452, 148, 36, 5);
    ctx.fillRect(452, 160, 24, 5);
  } else {
    ctx.fillStyle = blood ? 'rgba(80,20,30,0.7)' : 'rgba(40,50,60,0.6)';
    ctx.fillRect(380, 130, 44, 5);
    ctx.fillRect(380, 142, 30, 5);
    ctx.fillRect(380, 154, 38, 5);
    ctx.fillRect(452, 148, 36, 5);
    ctx.fillRect(452, 160, 24, 5);
  }

  /* 左墙 */
  brickWall(0, 16, 160, 524, 60, 22,
    blood ? '#1a0a14' : '#131a23',
    blood ? 'rgba(60,10,20,0.35)' : 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grad(0, 380, 0, 540, [
    [0,'rgba(0,0,0,0)'],[1, blood ? 'rgba(40,5,10,0.7)' : 'rgba(0,0,0,0.6)']
  ]);
  ctx.fillRect(0, 380, 160, 160);

  /* 墙上的苔痕：暗色模式下变成红色斑 */
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

  /* 墙上的字 */
  if(blood){
    ctx.save();
    ctx.translate(38, 220); ctx.rotate(-0.05);
    ctx.fillStyle = 'rgba(200,30,40,0.4)';
    ctx.fillRect(0, 0, 48, 64);
    ctx.fillStyle = 'rgba(140,15,25,0.55)';
    ctx.fillRect(6, 8, 36, 26);
    ctx.restore();
    /* 血字 */
    ctx.save();
    ctx.translate(36, 400); ctx.rotate(-0.08);
    ctx.strokeStyle = 'rgba(200,30,40,0.55)';
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.quadraticCurveTo(22,-14,44,2);
    ctx.moveTo(6,12); ctx.lineTo(38,16);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(38, 220); ctx.rotate(-0.05);
    ctx.fillStyle = 'rgba(160,140,110,0.15)';
    ctx.fillRect(0, 0, 48, 64);
    ctx.fillStyle = 'rgba(100,90,75,0.22)';
    ctx.fillRect(6, 8, 36, 26);
    ctx.restore();
    ctx.save();
    ctx.translate(36, 400); ctx.rotate(-0.08);
    ctx.strokeStyle = 'rgba(200,90,120,0.22)';
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0,0); ctx.quadraticCurveTo(22,-14,44,2);
    ctx.moveTo(6,12); ctx.lineTo(38,16);
    ctx.stroke();
    ctx.restore();
  }

  /* 路灯柱 */
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

  /* 水洼 */
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(330, 492, 100, 22, 0, 0, Math.PI*2);
  const pg = ctx.createRadialGradient(330, 492, 0, 330, 492, 100);
  if(blood){
    pg.addColorStop(0,'rgba(120,15,25,0.45)');
    pg.addColorStop(1,'rgba(80,5,15,0)');
  } else {
    pg.addColorStop(0,'rgba(100,140,190,0.22)');
    pg.addColorStop(1,'rgba(60,90,130,0)');
  }
  ctx.fillStyle = pg;
  ctx.fill();
  if(!cut && !blood){
    ctx.fillStyle = 'rgba(255,200,120,0.30)';
    ctx.beginPath();
    ctx.ellipse(300, 492, 26, 4, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  /* 暗色模式下额外暗红水渍 */
  if(blood){
    ctx.fillStyle = 'rgba(140,20,30,0.35)';
    ctx.beginPath();
    ctx.ellipse(330, 492, 70, 16, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(280, 505, 30, 8, 0, 0, Math.PI*2);
    ctx.fill();
  }

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

  if(!cut && !blood && Math.random() < 0.008){
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(168, 124, 44, 0, Math.PI*2);
    ctx.fill();
  }
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

  ctx.save();
  ctx.translate(260, 190); ctx.rotate(-0.06);
  ctx.strokeStyle = blood ? 'rgba(220,60,60,0.25)' : 'rgba(200,140,80,0.18)';
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(30,-8); ctx.lineTo(60,4); ctx.lineTo(90,-6);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = blood ? '#1a0a0e' : '#1a222c';
  ctx.fillRect(428, 36, 18, 300);
  ctx.fillStyle = blood ? '#241014' : '#242e3a';
  ctx.fillRect(430, 36, 14, 300);

  /* 后门 */
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

  /* 配电房门 */
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

  if(!cut && !blood){
    ctx.fillStyle = 'rgba(140,200,240,0.45)';
    ctx.fillRect(ox + 10, oy + oh - 10, ow - 20, 4);
    const gl = ctx.createRadialGradient(ox + ow/2, oy + oh, 0, ox + ow/2, oy + oh, 110);
    gl.addColorStop(0, 'rgba(140,200,240,0.22)');
    gl.addColorStop(1, 'rgba(140,200,240,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(ox - 70, oy + oh - 50, ow + 140, 140);
  } else {
    ctx.fillStyle = blood ? 'rgba(120,20,30,0.35)' : 'rgba(60,90,120,0.18)';
    ctx.fillRect(ox + 10, oy + oh - 10, ow - 20, 4);
  }

  ctx.fillStyle = 'rgba(200,220,240,0.72)';
  ctx.font = 'bold 11px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('配电房 ↓', ox + ow / 2, oy + oh + 20);

  ctx.fillStyle = grad(0, 470, 0, H, blood
    ? [[0,'#1a0810'],[1,'#0a040a']]
    : [[0,'#101822'],[1,'#04070b']]);
  ctx.fillRect(0, 470, W, 70);
  ctx.fillStyle = blood ? '#160812' : '#0a1018'; ctx.fillRect(0, 480, W, 8);

  /* 纸箱 */
  const c1x = 166, c1y = 370, c1w = 160, c1h = 106;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(c1x + c1w/2, c1y + c1h + 3, c1w*0.6, 12, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = blood ? '#1a0c08' : '#28221a'; ctx.fillRect(c1x, c1y, c1w, c1h);
  ctx.fillStyle = blood ? '#221008' : '#38301f'; ctx.fillRect(c1x, c1y, c1w, 15);
  ctx.fillStyle = blood ? 'rgba(120,30,30,0.35)' : 'rgba(190,180,150,0.25)';
  ctx.fillRect(c1x + c1w/2 - 9, c1y, 18, c1h);
  ctx.fillStyle = blood ? '#150a06' : '#252019'; ctx.fillRect(c1x + 42, c1y - 58, 122, 60);
  ctx.fillStyle = blood ? '#1e0c08' : '#332c20'; ctx.fillRect(c1x + 42, c1y - 58, 122, 12);
  ctx.fillStyle = blood ? '#150a06' : '#2a2419'; ctx.fillRect(c1x - 46, c1y + 18, 52, 88);

  const eg2 = ctx.createLinearGradient(W-70, 0, W, 0);
  eg2.addColorStop(0, blood ? 'rgba(20,2,6,0)' : 'rgba(3,6,10,0)');
  eg2.addColorStop(1, blood ? 'rgba(20,2,6,0.85)' : 'rgba(3,6,10,0.85)');
  ctx.fillStyle = eg2;
  ctx.fillRect(W-70, 0, 70, H);
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
  const dropY = 400 + ((t*160) % 80);
  if(dropY < 470){
    ctx.fillStyle = blood ? 'rgba(220,150,150,0.6)' : 'rgba(180,215,245,0.55)';
    ctx.beginPath();
    ctx.ellipse(438, dropY, 2.2, 5, 0, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.save();
  for(let i=0;i<4;i++){
    const sy = 430 - ((t*30 + i*35) % 130);
    const sa = Math.max(0, 1 - (430-sy)/140) * 0.10;
    ctx.globalAlpha = sa;
    ctx.fillStyle = blood ? '#ffb8b8' : '#cfe0f0';
    ctx.beginPath();
    ctx.ellipse(258 + Math.sin(t*0.8 + i)*10, sy,
                24 + i*6, 12 + i*4, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  if(f.doorOpen){
    const dx = 580, dy = 130, dw = 184, dh = 334;
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(dx + 4, dy + 6, 10, dh - 12);
    if(!cut && !blood){
      const glow = ctx.createRadialGradient(dx + 24, dy + dh/2, 0, dx + 24, dy + dh/2, 240);
      glow.addColorStop(0, 'rgba(255,200,120,0.20)');
      glow.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(dx - 200, dy - 100, 460, dh + 200);
    }
  } else if(!blood){
    const dx = 580, dy = 130, dw = 184, dh = 334;
    ctx.fillStyle = '#8f7736';
    ctx.beginPath(); ctx.arc(dx + dw/2, dy + dh/2, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#c9a94e';
    ctx.beginPath(); ctx.arc(dx + dw/2, dy + dh/2, 8, 0, Math.PI*2); ctx.fill();
  }

  /* 猫：暗色模式下不绘制 */
  if(!f.catGone && !blood) drawCat(246, 354, t);
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
  ctx.fillStyle = 'rgba(140,70,20,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 8, 44, 20, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#c9792f';
  ctx.beginPath(); ctx.ellipse(37, -13, 24, 21, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(24,-28); ctx.lineTo(28,-48); ctx.lineTo(43,-29); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(43,-30); ctx.lineTo(55,-47); ctx.lineTo(58,-25); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(140,70,20,0.5)'; ctx.lineWidth = 4;
  for(let i=-1;i<2;i++){
    ctx.beginPath();
    ctx.moveTo(i*17-4, -21);
    ctx.lineTo(i*17-9, 18);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(70,40,15,0.88)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(41, -14, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(55, -13, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,150,120,0.35)';
  ctx.beginPath(); ctx.arc(34, -6, 6, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(52, -5, 6, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

/* =========================================================
   便利店
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

  ctx.strokeStyle = 'rgba(255,255,255,0.015)'; ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 60){
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, 430);
    ctx.stroke();
  }

  ctx.fillStyle = blood ? '#0a0306' : (lit ? '#080d14' : '#03060a');
  ctx.fillRect(0, 0, W, 44);

  ctx.fillStyle = grad(0, 430, 0, H, blood
    ? [[0,'#1a0810'],[1,'#0a040a']]
    : [[0, lit ? '#0e141c' : '#04070b'],[1, '#020406']]);
  ctx.fillRect(0, 430, W, 110);

  /* 货架 */
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
      if(blood){
        /* 暗色模式下：罐头标签是暗红的 */
        ctx.fillStyle = 'rgba(200,30,40,0.55)';
        ctx.fillRect(126 + j*42, y - h0 + 4, w0 - 2, h0 - 10);
      } else if(lit){
        ctx.fillStyle = 'rgba(255,240,200,0.10)';
        ctx.fillRect(126 + j*42, y - h0, 3, h0);
      }
    }
  });

  ctx.fillStyle = itemC;
  ctx.fillRect(150, 400, 44, 32);
  ctx.fillRect(300, 405, 38, 27);

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(616, 334, 304, 8);
  ctx.fillStyle = shelfC;
  ctx.fillRect(618, 320, 300, 148);
  ctx.fillStyle = blood ? '#23121a' : (lit ? '#25303d' : '#0b1118');
  ctx.fillRect(618, 320, 300, 16);
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

  if(!cut && !blood){
    const blink = 0.5 + 0.5 * Math.sin(performance.now()/300 * 3.2);
    ctx.fillStyle = `rgba(255,64,64,${0.4 + blink * 0.5})`;
    ctx.beginPath(); ctx.arc(700, 332, 4, 0, Math.PI*2); ctx.fill();
  }

  /* 后窗 */
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

  if(!lit && !blood){
    ctx.strokeStyle = 'rgba(140,180,220,0.22)';
    ctx.lineWidth = 1;
    for(let i = 0; i < 18; i++){
      const rx = 58 + (i * 19) % 118;
      const ry = 196 + ((i * 37) % 136);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 2, ry + 11);
      ctx.stroke();
    }
  }
  if(blood){
    /* 玻璃上的血手印 */
    ctx.fillStyle = 'rgba(180,20,30,0.35)';
    ctx.beginPath();
    ctx.ellipse(120, 260, 22, 28, -0.2, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawShopDynamic(t, dt){
  const cut = isPowerCut();
  const blood = isBloodMode();
  const lit = !!flags().lightsOn && !cut && !blood;

  if(lit){
    ctx.fillStyle = '#d8e0e8';
    ctx.fillRect(200, 20, 180, 6);
    ctx.fillRect(420, 20, 180, 6);
    const flick = 0.94 + 0.06 * Math.sin(t * 22) * (Math.random() > 0.9 ? 2 : 1);
    const g2 = ctx.createRadialGradient(470, 400, 0, 470, 400, 640);
    g2.addColorStop(0, `rgba(255,238,196,${0.24 * flick})`);
    g2.addColorStop(1, 'rgba(255,210,150,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  } else if(blood){
    /* 暗色模式下的暗红氛围 */
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
   街道
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
    const emLit = cut && (i * 7 + 3) % 27 === 0;
    if(lit){
      ctx.fillStyle = 'rgba(255,210,140,0.5)';
      ctx.fillRect(w0[0], w0[1], w0[2], w0[3]);
    } else if(emLit){
      ctx.fillStyle = 'rgba(255,180,90,0.4)';
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

  if(cut){
    ctx.fillStyle = 'rgba(25,35,48,0.85)';
    ctx.fillRect(700, 292, 40, 46);
  } else {
    ctx.fillStyle = 'rgba(255,200,120,0.7)';
    ctx.fillRect(700, 292, 40, 46);
    const hg = ctx.createRadialGradient(720, 315, 0, 720, 315, 260);
    hg.addColorStop(0, 'rgba(255,190,110,0.28)');
    hg.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(460, 55, 520, 520);
  }

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
    ctx.beginPath();
    ctx.moveTo(x - 5, gy + 22);
    ctx.lineTo(x + 4, gy - 6);
    ctx.lineTo(x + 13, gy + 22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(gx, gy + 150, gw, 10);

  brickWall(0, 298, 202, 242, 60, 22, '#151c25', 'rgba(0,0,0,0.3)');
  ctx.fillStyle = '#c9b58a';
  ctx.fillRect(118, 318, 38, 24);
  ctx.fillStyle = '#4a4030';
  ctx.font = 'bold 13px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('17', 137, 330);

  ctx.strokeStyle = 'rgba(200,210,220,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 110);
  ctx.quadraticCurveTo(300, 152, 520, 102);
  ctx.stroke();
  if(!f.ropeTaken){
    ctx.fillStyle = 'rgba(160,175,190,0.25)';
    ctx.beginPath();
    ctx.moveTo(238, 132); ctx.lineTo(288, 136);
    ctx.lineTo(284, 196); ctx.lineTo(242, 188);
    ctx.closePath(); ctx.fill();
  }

  ctx.fillStyle = '#141b25';
  ctx.fillRect(156, 240, 8, 240);
  if(cut){
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath(); ctx.ellipse(160, 300, 6, 4, 0, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,220,150,0.95)';
    ctx.beginPath(); ctx.ellipse(160, 300, 6, 4, 0, 0, Math.PI*2); ctx.fill();
    const sg = ctx.createRadialGradient(160, 300, 0, 160, 300, 260);
    sg.addColorStop(0, 'rgba(255,205,125,0.18)');
    sg.addColorStop(1, 'rgba(255,205,125,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-100, 40, 520, 520);
  }

  ctx.fillStyle = '#2a3542';
  ctx.fillRect(826, 336, 30, 42);
  ctx.fillStyle = '#c9b58a';
  ctx.beginPath();
  ctx.arc(841, 360, 3, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#8a2424';
  ctx.fillRect(770, 456, 16, 36);
  ctx.fillStyle = '#a83232';
  ctx.beginPath();
  ctx.arc(778, 454, 10, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = 'rgba(10,14,20,0.95)';
  ctx.fillRect(908, 220, 6, 90);
  ctx.fillStyle = 'rgba(8,14,20,0.9)';
  ctx.beginPath(); ctx.ellipse(910, 200, 65, 90, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(878, 170, 44, 60, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(944, 176, 38, 52, 0, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = 'rgba(100,140,190,0.12)';
  ctx.beginPath(); ctx.ellipse(300, 510, 60, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(700, 500, 80, 12, 0, 0, Math.PI*2); ctx.fill();

  const fog = ctx.createLinearGradient(0, 340, 0, 470);
  fog.addColorStop(0, 'rgba(20,35,55,0)');
  fog.addColorStop(1, 'rgba(20,35,55,0.32)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 340, W, 130);

  const px = 224, py = 250, pw = 76, ph = 180;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(px+4, py+4, pw, ph);
  ctx.fillStyle = '#1c2430';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
  for(let y = py + 16; y < py + ph; y += 14){
    ctx.beginPath();
    ctx.moveTo(px + 4, y); ctx.lineTo(px + pw - 4, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a3644'; ctx.lineWidth = 4;
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = 'rgba(200,60,50,0.7)';
  ctx.fillRect(px + 20, py + 26, 36, 20);
  ctx.fillStyle = 'rgba(255,240,180,0.85)';
  ctx.font = 'bold 9px "PingFang SC",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('配电', px + 38, py + 36);
  ctx.fillStyle = '#5a6878';
  ctx.beginPath();
  ctx.arc(px + pw - 14, py + ph/2, 4, 0, Math.PI*2);
  ctx.fill();

  const ux = 130, uy = 358, uw = 84, uh = 62;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(ux, uy, uw, uh);
  ctx.fillStyle = '#050810';
  ctx.fillRect(ux + 6, uy + 6, uw - 12, uh - 12);
  ctx.strokeStyle = '#2a3644'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ux + 4, uy + 12); ctx.lineTo(ux + 4, uy + uh - 4);
  ctx.moveTo(ux + uw - 4, uy + 12); ctx.lineTo(ux + uw - 4, uy + uh - 4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80,90,100,0.4)'; ctx.lineWidth = 1;
  for(let i=0;i<4;i++){
    const sy = uy + 20 + i*10;
    ctx.beginPath();
    ctx.moveTo(ux + 8, sy); ctx.lineTo(ux + uw - 8, sy);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(60,80,110,0.7)';
  ctx.fillRect(ux + 14, uy - 8, 56, 14);
  ctx.fillStyle = 'rgba(200,220,240,0.8)';
  ctx.font = 'bold 9px "PingFang SC",sans-serif';
  ctx.fillText('地下通道 ↓', ux + 42, uy - 1);

  const rx = 4, ry = 380, rw = 60, rh = 60;
  ctx.fillStyle = 'rgba(40,50,65,0.5)';
  ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = '#2a3644'; ctx.lineWidth = 2;
  ctx.strokeRect(rx, ry, rw, rh);
  ctx.fillStyle = 'rgba(200,220,240,0.7)';
  ctx.font = 'bold 9px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('河堤', rx + rw/2, ry + rh/2 + 3);
}

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

  ctx.fillStyle = '#1a222c';
  ctx.fillRect(876, 336, 6, 30);
  ctx.fillStyle = '#0a1018';
  ctx.fillRect(862, 356, 34, 26);
  if(cut){
    ctx.fillStyle = 'rgba(60,60,60,0.5)';
    ctx.beginPath(); ctx.arc(879, 374, 5, 0, Math.PI*2); ctx.fill();
  } else {
    const lightPhase = Math.floor(t) % 6;
    const green = lightPhase < 3;
    ctx.fillStyle = green ? 'rgba(80,220,120,0.95)' : 'rgba(40,60,50,0.5)';
    ctx.beginPath();
    ctx.arc(879, 374, 5, 0, Math.PI*2);
    ctx.fill();
  }
}

/* =========================================================
   门前
   ========================================================= */
function drawDoorstepStatic(){
  const cut = isPowerCut();
  ctx.fillStyle = grad(0, 0, 0, 400, [
    [0, '#0a1018'], [0.35, '#141c2a'], [0.7, '#1c2836'], [1, '#242f3e']
  ]);
  ctx.fillRect(0, 0, W, 400);

  for(let i=0;i<4;i++){
    const cx = 120 + i*240, cy = 40 + (i%2)*30;
    ctx.fillStyle = `rgba(40, 55, 75, ${0.28 + 0.08*(i%2)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 260 - i*10, 40 + (i%3)*6, 0, 0, Math.PI*2);
    ctx.fill();
  }

  const far = [
    { x: 0,   y: 240, w: 100, h: 160 },
    { x: 100, y: 260, w: 90,  h: 140 },
    { x: 190, y: 230, w: 100, h: 170 },
    { x: 840, y: 250, w: 120, h: 150 },
    { x: 920, y: 240, w: 40,  h: 160 }
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
  ctx.lineWidth = 1;
  for(let y = 410; y < H; y += 28){
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for(let x = 0; x < W; x += 80){
    ctx.beginPath();
    ctx.moveTo(x, 400);
    ctx.lineTo(x + 20, H);
    ctx.stroke();
  }

  const hx = 240, hy = 120, hw = 480, hh = 300;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(hx + hw/2, hy + hh + 10, hw * 0.55, 20, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#3a3226';
  ctx.fillRect(hx, hy + 60, hw, hh - 60);
  ctx.fillStyle = '#4a4032';
  ctx.fillRect(hx, hy + 60, hw, 20);

  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  for(let y = hy + 80; y < hy + hh; y += 16){
    ctx.beginPath();
    ctx.moveTo(hx + 4, y);
    ctx.lineTo(hx + hw - 4, y);
    ctx.stroke();
  }

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

  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  for(let i = 0; i < 12; i++){
    const t = i / 12;
    const x1 = hx - 30 + (hx + hw/2 - (hx - 30)) * t;
    const x2 = hx + hw + 30 - ((hx + hw + 30) - (hx + hw/2)) * t;
    ctx.beginPath();
    ctx.moveTo(x1, hy - 14 + 92 * t);
    ctx.lineTo(x2, hy - 14 + 92 * t);
    ctx.stroke();
  }

  ctx.fillStyle = '#4a3a30';
  ctx.fillRect(hx + 340, hy - 20, 40, 70);
  ctx.fillStyle = '#5a4a40';
  ctx.fillRect(hx + 340, hy - 20, 40, 10);

  const wx = hx + 40, wy = hy + 120, ww = 100, wh = 120;
  ctx.fillStyle = '#1a222c';
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = '#584a3a';
  ctx.lineWidth = 8;
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.beginPath();
  ctx.moveTo(wx + ww/2, wy);
  ctx.lineTo(wx + ww/2, wy + wh);
  ctx.moveTo(wx, wy + wh/2);
  ctx.lineTo(wx + ww, wy + wh/2);
  ctx.stroke();
  if(!cut){
    ctx.fillStyle = 'rgba(255,220,140,0.55)';
    ctx.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);
    const wg = ctx.createRadialGradient(wx + ww/2, wy + wh/2, 0, wx + ww/2, wy + wh/2, 160);
    wg.addColorStop(0, 'rgba(255, 200, 120, 0.28)');
    wg.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = wg;
    ctx.fillRect(wx - 100, wy - 100, ww + 200, wh + 200);
  } else {
    ctx.fillStyle = 'rgba(30, 40, 55, 0.9)';
    ctx.fillRect(wx + 4, wy + 4, ww - 8, wh - 8);
  }

  const wx2 = hx + hw - 140;
  ctx.fillStyle = '#1a222c';
  ctx.fillRect(wx2, wy, ww, wh);
  ctx.strokeStyle = '#584a3a';
  ctx.lineWidth = 8;
  ctx.strokeRect(wx2, wy, ww, wh);
  ctx.beginPath();
  ctx.moveTo(wx2 + ww/2, wy);
  ctx.lineTo(wx2 + ww/2, wy + wh);
  ctx.moveTo(wx2, wy + wh/2);
  ctx.lineTo(wx2 + ww, wy + wh/2);
  ctx.stroke();
  if(!cut){
    ctx.fillStyle = 'rgba(255,220,140,0.55)';
    ctx.fillRect(wx2 + 4, wy + 4, ww - 8, wh - 8);
  } else {
    ctx.fillStyle = 'rgba(30, 40, 55, 0.9)';
    ctx.fillRect(wx2 + 4, wy + 4, ww - 8, wh - 8);
  }

  const dx = hx + hw/2 - 55, dy = hy + 200, dw = 110, dh = 140;

  ctx.fillStyle = '#2a2018';
  ctx.fillRect(dx - 12, dy - 12, dw + 24, dh + 12);

  ctx.fillStyle = '#3a2c20';
  ctx.fillRect(dx, dy, dw, dh);

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dx + dw/2, dy);
  ctx.lineTo(dx + dw/2, dy + dh);
  ctx.stroke();

  ctx.fillStyle = '#1a222c';
  ctx.fillRect(dx + 12, dy + 12, dw - 24, 44);
  ctx.strokeStyle = '#2a2018';
  ctx.lineWidth = 3;
  ctx.strokeRect(dx + 12, dy + 12, dw - 24, 44);
  if(!cut){
    ctx.fillStyle = 'rgba(255,220,140,0.45)';
    ctx.fillRect(dx + 14, dy + 14, dw - 28, 40);
  }

  ctx.fillStyle = '#c9a04e';
  ctx.beginPath();
  ctx.arc(dx + dw - 22, dy + dh / 2 + 6, 5, 0, Math.PI * 2);
  ctx.fill();

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
    const lg = ctx.createRadialGradient(lx, ly + 14, 0, lx, ly + 14, 220);
    lg.addColorStop(0, 'rgba(255, 205, 125, 0.4)');
    lg.addColorStop(0.4, 'rgba(255, 195, 110, 0.16)');
    lg.addColorStop(1, 'rgba(255, 180, 90, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(lx - 220, ly - 200, 440, 440);
  } else {
    ctx.fillStyle = '#2a2a2a';
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

  ctx.fillStyle = 'rgba(180, 200, 220, 0.14)';
  ctx.fillRect(sx, sy, 160, 2);
  ctx.fillRect(sx + 8, sy + 12, 144, 2);
  ctx.fillRect(sx + 16, sy + 24, 128, 2);

  ctx.fillStyle = 'rgba(100, 140, 190, 0.15)';
  ctx.beginPath();
  ctx.ellipse(hx + hw/2, 500, 120, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  if(!cut){
    ctx.fillStyle = 'rgba(255, 200, 120, 0.25)';
    ctx.beginPath();
    ctx.ellipse(hx + hw/2, 500, 50, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const egL = ctx.createLinearGradient(0, 0, 80, 0);
  egL.addColorStop(0, 'rgba(3,6,10,0.85)');
  egL.addColorStop(1, 'rgba(3,6,10,0)');
  ctx.fillStyle = egL;
  ctx.fillRect(0, 0, 80, H);

  const egR = ctx.createLinearGradient(W - 80, 0, W, 0);
  egR.addColorStop(0, 'rgba(3,6,10,0)');
  egR.addColorStop(1, 'rgba(3,6,10,0.85)');
  ctx.fillStyle = egR;
  ctx.fillRect(W - 80, 0, 80, H);
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
  if(!cut){
    const pulse = 0.95 + 0.05 * Math.sin(t * 1.8);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lx = 240 + 240, ly = 120 + 200 - 28 + 14;
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 220);
    lg.addColorStop(0, `rgba(255, 205, 125, ${0.14 * pulse})`);
    lg.addColorStop(1, 'rgba(255, 195, 110, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(lx - 220, ly - 200, 440, 440);
    ctx.restore();
  }
}

/* =========================================================
   红屋顶
   ========================================================= */
function drawHouseStatic(){
  const cut = isPowerCut();
  const f = flags();
  ctx.fillStyle = grad(0, 0, 0, H, [
    [0,'#2e2218'],[0.5,'#281d16'],[1,'#15100c']
  ]);
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,220,170,0.03)';
  ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 48){
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, H);
    ctx.stroke();
  }

  woodGrain(0, 420, W, 120, '#3a2a1d', 'rgba(0,0,0,0.28)', true);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 420, W, 120);
  ctx.fillStyle = '#2e2118';
  ctx.fillRect(0, 414, W, 6);

  ctx.fillStyle = '#584430';
  ctx.fillRect(72, 80, 228, 228);
  ctx.fillStyle = '#16202c';
  ctx.fillRect(80, 88, 212, 212);
  ctx.fillStyle = 'rgba(220,230,245,0.55)';
  const stars = [[110,120,1.3],[160,110,0.9],[200,105,1.1],[260,118,1.0]];
  stars.forEach(s => {
    ctx.beginPath();
    ctx.arc(s[0], s[1], s[2], 0, Math.PI*2);
    ctx.fill();
  });
  ctx.fillStyle = 'rgba(255,244,214,0.82)';
  ctx.beginPath(); ctx.arc(242, 142, 18, 0, Math.PI*2); ctx.fill();
  const mg = ctx.createRadialGradient(242, 142, 0, 242, 142, 110);
  mg.addColorStop(0, 'rgba(255,244,214,0.20)');
  mg.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(140, 40, 220, 220);
  ctx.strokeStyle = '#584430'; ctx.lineWidth = 9;
  ctx.strokeRect(80, 88, 212, 212);
  ctx.beginPath();
  ctx.moveTo(186, 88); ctx.lineTo(186, 300);
  ctx.moveTo(80, 194); ctx.lineTo(292, 194);
  ctx.stroke();

  ctx.fillStyle = '#4a3524';
  ctx.fillRect(846, 306, 12, 130);
  ctx.beginPath();
  ctx.moveTo(806, 306); ctx.lineTo(898, 306);
  ctx.lineTo(878, 260); ctx.lineTo(826, 260);
  ctx.closePath();
  ctx.fillStyle = cut ? '#4a4030' : '#c9a35a';
  ctx.fill();

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
}

function drawHouseDynamic(t, dt){
  const cut = isPowerCut();
  const f = flags();
  const joined = !!f.photoJoined;

  if(!cut){
    const lampB = 0.94 + 0.06 * Math.sin(t * 1.7);
    const lg = ctx.createRadialGradient(852, 300, 0, 852, 300, 500);
    lg.addColorStop(0, `rgba(255,206,130,${0.32 * lampB})`);
    lg.addColorStop(0.4, `rgba(255,190,110,${0.12 * lampB})`);
    lg.addColorStop(1, 'rgba(255,180,90,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(350, -200, 620, 740);
  }

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
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(minuteAngle) * 20, Math.sin(minuteAngle) * 20);
  ctx.stroke();
  if(!cut){
    const secondAngle = (t * 1.5) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(180,60,60,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(secondAngle) * 22, Math.sin(secondAngle) * 22);
    ctx.stroke();
  }
  ctx.fillStyle = '#8a6b3f';
  ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  const sway = joined ? 0 : Math.sin(t * 0.9) * 0.014;
  ctx.save();
  ctx.translate(170, 420);
  ctx.rotate(sway);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 56, 64, 10, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = '#5a4230';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-46, 0); ctx.quadraticCurveTo(-20, 42, 10, 52);
  ctx.moveTo(46, 0); ctx.quadraticCurveTo(20, 42, -10, 52);
  ctx.stroke();
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(-50, -12, 100, 14);
  ctx.strokeStyle = '#5a4230';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-42, -10); ctx.lineTo(-56, -118);
  ctx.moveTo(42, -10); ctx.lineTo(56, -118);
  ctx.moveTo(-56, -118); ctx.lineTo(56, -118);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(470, 292); ctx.rotate(-0.045);
  ctx.fillStyle = joined ? '#cfc6ad' : '#b3ab95';
  ctx.fillRect(-48, -40, 96, 80);

  if(joined){
    ctx.fillStyle = '#8d8672';
    ctx.fillRect(-44, -36, 88, 72);
    ctx.fillStyle = '#5c5544';
    ctx.beginPath(); ctx.arc(-6, -10, 13, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(-22, 0, 32, 34);
    ctx.fillStyle = '#4a4536';
    ctx.beginPath(); ctx.ellipse(24, 12, 15, 12, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(35, 0, 9.5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#4a7fb5';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(35, 7, 7, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.fillStyle = '#8a4a3a';
    ctx.beginPath();
    ctx.moveTo(6, 34); ctx.lineTo(30, 14); ctx.lineTo(54, 34);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = '#3a3226';
    ctx.beginPath();
    ctx.moveTo(48, -40); ctx.lineTo(48, 14);
    ctx.lineTo(-8, 40); ctx.lineTo(-48, 40); ctx.lineTo(-48, -40);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  if(window.__ENDING__){
    const doorG = ctx.createRadialGradient(480, 200, 0, 480, 200, 640);
    doorG.addColorStop(0, 'rgba(255,240,200,0.22)');
    doorG.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = doorG;
    ctx.fillRect(0, 0, W, H);
  }
}

/* =========================================================
   配电房
   ========================================================= */
function drawPowerStationStatic(){
  const cut = isPowerCut();
  ctx.fillStyle = grad(0, 0, 0, H, [
    [0,'#0a0d12'],[0.6,'#0e1219'],[1,'#06090e']
  ]);
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#0e1218';
  ctx.fillRect(0, 420, W, 120);
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 60){
    ctx.beginPath();
    ctx.moveTo(x, 420); ctx.lineTo(x - 30, H);
    ctx.stroke();
  }

  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, W, 420);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  for(let x = 200; x < W; x += 200){
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, 420);
    ctx.stroke();
  }
  for(let y = 140; y < 420; y += 140){
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  ctx.fillStyle = '#131820';
  ctx.fillRect(0, 30, W, 12);
  ctx.fillStyle = '#1c2430';
  ctx.fillRect(0, 32, W, 3);

  const cx = 380, cy = 120, cw = 200, ch = 300;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(cx + 8, cy + 8, cw, ch);
  ctx.fillStyle = '#1c2430';
  ctx.fillRect(cx, cy, cw, ch);
  ctx.fillStyle = '#252e3b';
  ctx.fillRect(cx + 4, cy + 4, cw - 8, ch - 8);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + cw/2, cy + 4); ctx.lineTo(cx + cw/2, cy + ch - 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(200,60,40,0.6)';
  ctx.fillRect(cx + 4, cy + 4, cw - 8, 8);

  const meterX = cx + 60, meterY = cy + 60;
  ctx.fillStyle = '#050810';
  ctx.beginPath(); ctx.arc(meterX, meterY, 24, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#c9d9e6';
  ctx.beginPath(); ctx.arc(meterX, meterY, 20, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#2a3038'; ctx.lineWidth = 1;
  for(let i=0;i<11;i++){
    const a = Math.PI + (i/10) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(meterX + Math.cos(a)*14, meterY + Math.sin(a)*14);
    ctx.lineTo(meterX + Math.cos(a)*18, meterY + Math.sin(a)*18);
    ctx.stroke();
  }
  const needleAngle = cut ? Math.PI : (Math.PI + 0.9);
  ctx.strokeStyle = '#c93030'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(meterX, meterY);
  ctx.lineTo(meterX + Math.cos(needleAngle)*14, meterY + Math.sin(needleAngle)*14);
  ctx.stroke();

  const bX = cx + cw - 80, bY = cy + 80;
  ctx.fillStyle = '#0f141b';
  ctx.fillRect(bX - 40, bY - 40, 100, 120);
  ctx.strokeStyle = '#2a3644'; ctx.lineWidth = 2;
  ctx.strokeRect(bX - 40, bY - 40, 100, 120);
  ctx.fillStyle = 'rgba(200,60,50,0.5)';
  ctx.fillRect(bX - 30, bY - 32, 80, 14);
  ctx.fillStyle = 'rgba(255,240,180,0.8)';
  ctx.font = 'bold 10px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('主电源', bX + 10, bY - 25);
  ctx.fillStyle = '#050810';
  ctx.fillRect(bX - 10, bY - 10, 40, 70);
  const handleY = cut ? (bY - 5) : (bY + 50);
  ctx.fillStyle = cut ? 'rgba(120,40,40,0.5)' : 'rgba(40,120,60,0.5)';
  ctx.fillRect(bX - 12, handleY - 3, 44, 12);
  ctx.fillStyle = cut ? '#c93030' : '#3fa860';
  ctx.fillRect(bX - 8, handleY, 36, 8);

  const fX = 60, fY = 200, fW = 120, fH = 180;
  ctx.fillStyle = '#1a222c';
  ctx.fillRect(fX, fY, fW, fH);
  ctx.fillStyle = '#252e3a';
  ctx.fillRect(fX + 4, fY + 4, fW - 8, fH - 8);
  ctx.strokeStyle = '#2a3644'; ctx.lineWidth = 2;
  ctx.strokeRect(fX, fY, fW, fH);
  for(let i=0;i<4;i++){
    const fy = fY + 24 + i*38;
    ctx.fillStyle = '#050810';
    ctx.fillRect(fX + 20, fy, 80, 20);
    ctx.fillStyle = cut ? 'rgba(120,40,40,0.4)' : 'rgba(255,220,120,0.4)';
    ctx.fillRect(fX + 26, fy + 6, 68, 8);
    if(!cut){
      ctx.fillStyle = 'rgba(80,220,120,0.9)';
      ctx.beginPath();
      ctx.arc(fX + 110, fy + 10, 3, 0, Math.PI*2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(60,60,60,0.6)';
      ctx.beginPath();
      ctx.arc(fX + 110, fy + 10, 3, 0, Math.PI*2);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(200,180,140,0.5)';
  ctx.font = 'bold 10px "PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('保险丝', fX + fW/2, fY + 14);

  const tX = 720, tY = 340, tW = 200, tH = 80;
  ctx.fillStyle = '#33281c';
  ctx.fillRect(tX, tY, tW, tH);
  ctx.fillStyle = '#42341f';
  ctx.fillRect(tX, tY, tW, 8);
  ctx.fillStyle = '#2a2016';
  ctx.fillRect(tX + 10, tY + tH, 14, 60);
  ctx.fillRect(tX + tW - 24, tY + tH, 14, 60);

  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(tX + 20, tY - 16, 60, 44);
  ctx.fillStyle = 'rgba(220,210,180,0.6)';
  ctx.fillRect(tX + 24, tY - 10, 52, 32);

  ctx.fillStyle = '#3a4048';
  ctx.fillRect(tX + 100, tY - 20, 50, 48);
  ctx.fillStyle = '#2a3038';
  ctx.fillRect(tX + 100, tY - 20, 50, 8);

  ctx.save();
  ctx.translate(620, 60); ctx.rotate(-0.02);
  ctx.fillStyle = 'rgba(200,60,40,0.5)';
  ctx.fillRect(-80, -20, 160, 40);
  ctx.strokeStyle = 'rgba(180,180,180,0.4)'; ctx.lineWidth = 2;
  ctx.strokeRect(-80, -20, 160, 40);
  ctx.fillStyle = 'rgba(255,240,180,0.85)';
  ctx.font = 'bold 18px "PingFang SC",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('高 压 危 险', 0, 0);
  ctx.restore();

  if(cut){
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, W, H);
  }

  const tg = ctx.createLinearGradient(0, 0, 0, 80);
  tg.addColorStop(0,'rgba(0,0,0,0.7)');
  tg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, W, 80);
  const eg = ctx.createLinearGradient(0, 0, 80, 0);
  eg.addColorStop(0,'rgba(0,0,0,0.8)');
  eg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(0, 0, 80, H);
  const eg2 = ctx.createLinearGradient(W-80, 0, W, 0);
  eg2.addColorStop(0,'rgba(0,0,0,0)');
  eg2.addColorStop(1,'rgba(0,0,0,0.8)');
  ctx.fillStyle = eg2;
  ctx.fillRect(W-80, 0, 80, H);
}

function drawPowerStationDynamic(t, dt){
  const cut = isPowerCut();
  if(!cut){
    ctx.fillStyle = '#d8e0e8';
    ctx.fillRect(480, 20, 60, 4);
    const lg = ctx.createRadialGradient(510, 22, 0, 510, 22, 320);
    lg.addColorStop(0, 'rgba(255,230,180,0.18)');
    lg.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(200, -100, 620, 420);
  } else {
    const blink = 0.5 + 0.5 * Math.sin(t * 2.5);
    ctx.fillStyle = `rgba(200,60,50,${0.15 * blink})`;
    ctx.beginPath();
    ctx.arc(60 + 110, 200 + 10 + 3*38, 3, 0, Math.PI*2);
    ctx.fill();
  }
  const dy = 200 + ((t*80) % 200);
  if(dy < 420){
    ctx.fillStyle = 'rgba(180,215,245,0.4)';
    ctx.beginPath();
    ctx.ellipse(680, dy, 1.8, 3.5, 0, 0, Math.PI*2);
    ctx.fill();
  }
}

/* =========================================================
   屋顶
   ========================================================= */
function drawRooftopStatic(){
  const cut = isPowerCut();
  ctx.fillStyle = grad(0,0,0,420, [
    [0,'#02040a'],[0.4,'#0a1420'],[0.75,'#152030'],[1,'#1a2534']
  ]);
  ctx.fillRect(0,0,W,420);

  for(let i=0;i<5;i++){
    ctx.fillStyle = `rgba(28,42,62,${0.28 + 0.06*(i%2)})`;
    ctx.beginPath();
    ctx.ellipse(80 + i*220, 40 + (i%2)*24, 240, 36, 0, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(220,230,245,0.55)';
  const stars = [
    [320,60,1.0],[400,100,1.3],[500,50,0.9],[620,120,1.1],
    [750,70,1.0],[880,110,0.9],[200,140,0.8],[680,40,1.2]
  ];
  stars.forEach(s => {
    ctx.beginPath();
    ctx.arc(s[0], s[1], s[2], 0, Math.PI*2);
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(255,244,214,0.85)';
  ctx.beginPath(); ctx.arc(180, 90, 26, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(200,180,150,0.35)';
  ctx.beginPath(); ctx.arc(174, 84, 4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(186, 96, 3, 0, Math.PI*2); ctx.fill();
  const mg = ctx.createRadialGradient(180, 90, 0, 180, 90, 160);
  mg.addColorStop(0,'rgba(255,244,214,0.18)');
  mg.addColorStop(1,'rgba(255,244,214,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(20, -70, 320, 320);

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
    if(b.w > 100){
      ctx.fillStyle = '#040810';
      ctx.fillRect(b.x + 10, b.y - 12, 20, 12);
      ctx.fillRect(b.x + 40, b.y - 8, 16, 8);
    }
  });

  skyline.forEach((b, bi) => {
    const cols = Math.floor(b.w / 26);
    const rows = Math.floor(b.h / 34);
    for(let i=0;i<cols;i++){
      for(let j=0;j<rows;j++){
        const wx = b.x + 8 + i*26;
        const wy = b.y + 14 + j*34;
        if(wx + 12 > b.x + b.w - 4) continue;
        if(wy + 18 > b.y + b.h - 4) continue;
        const lit = !cut && (bi*7 + i*3 + j*11) % 13 === 0;
        const emLit = cut && (bi*7 + i*3 + j*11) % 31 === 0;
        if(lit){
          ctx.fillStyle = 'rgba(255,190,110,0.55)';
          ctx.fillRect(wx, wy, 12, 18);
        } else if(emLit){
          ctx.fillStyle = 'rgba(255,180,90,0.4)';
          ctx.fillRect(wx, wy, 12, 18);
        } else {
          ctx.fillStyle = 'rgba(20,30,45,0.8)';
          ctx.fillRect(wx, wy, 12, 18);
        }
      }
    }
  });

  const hx = 620, hy = 260;
  ctx.fillStyle = '#2c1414';
  ctx.beginPath();
  ctx.moveTo(hx-26, hy); ctx.lineTo(hx+30, hy-56); ctx.lineTo(hx+86, hy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a1c1c';
  ctx.beginPath();
  ctx.moveTo(hx-20, hy); ctx.lineTo(hx+30, hy-50); ctx.lineTo(hx+80, hy);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
  for(let i=0;i<5;i++){
    ctx.beginPath();
    ctx.moveTo(hx-8 + i*14, hy - 6 - i*6);
    ctx.lineTo(hx+30 + i*14, hy - 6 - i*6);
    ctx.stroke();
  }
  ctx.fillStyle = '#101822';
  ctx.fillRect(hx, hy, 60, 60);
  if(cut){
    ctx.fillStyle = 'rgba(25,35,48,0.9)';
    ctx.fillRect(hx+20, hy+18, 20, 24);
  } else {
    ctx.fillStyle = 'rgba(255,200,120,0.8)';
    ctx.fillRect(hx+20, hy+18, 20, 24);
    const hg = ctx.createRadialGradient(hx+30, hy+30, 0, hx+30, hy+30, 70);
    hg.addColorStop(0,'rgba(255,200,120,0.35)');
    hg.addColorStop(1,'rgba(255,200,120,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(hx-40, hy-40, 140, 140);
  }

  ctx.fillStyle = '#0c1219';
  ctx.fillRect(0, 420, W, 120);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 60){
    ctx.beginPath();
    ctx.moveTo(x, 420); ctx.lineTo(x, H);
    ctx.stroke();
  }
  for(let y = 440; y < H; y += 40){
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(100,140,190,0.10)';
  ctx.beginPath();
  ctx.ellipse(300, 490, 90, 12, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(650, 505, 70, 10, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.strokeStyle = '#1a222c'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(140, 200); ctx.lineTo(140, 440);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(115, 240); ctx.lineTo(165, 240);
  ctx.moveTo(115, 280); ctx.lineTo(165, 280);
  ctx.moveTo(115, 320); ctx.lineTo(165, 320);
  ctx.stroke();
  if(!cut){
    const blink = 0.5 + 0.5*Math.sin(performance.now()/500*2);
    ctx.fillStyle = `rgba(255,60,60,${0.5 + blink*0.5})`;
    ctx.beginPath();
    ctx.arc(140, 200, 4, 0, Math.PI*2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#3a2020';
    ctx.beginPath();
    ctx.arc(140, 200, 4, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.fillStyle = '#1a222c';
  ctx.fillRect(800, 320, 8, 120);
  ctx.fillRect(880, 320, 8, 120);
  ctx.fillStyle = '#252e3a';
  ctx.fillRect(790, 240, 108, 90);
  ctx.fillStyle = '#1c2631';
  ctx.fillRect(790, 240, 108, 10);
  ctx.fillStyle = '#2a3644';
  ctx.beginPath();
  ctx.moveTo(790, 240); ctx.lineTo(844, 216); ctx.lineTo(898, 240);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = 'rgba(200,210,220,0.42)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(360, 260);
  ctx.quadraticCurveTo(440, 290, 520, 260);
  ctx.stroke();
  ctx.fillStyle = 'rgba(140,155,175,0.22)';
  ctx.beginPath();
  ctx.moveTo(400, 272); ctx.lineTo(430, 274);
  ctx.lineTo(428, 312); ctx.lineTo(402, 308);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(160,140,150,0.20)';
  ctx.beginPath();
  ctx.moveTo(460, 274); ctx.lineTo(486, 274);
  ctx.lineTo(484, 312); ctx.lineTo(462, 310);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#0f1620';
  ctx.fillRect(0, 380, W, 46);
  ctx.fillStyle = '#151d28';
  ctx.fillRect(0, 380, W, 6);
  ctx.fillStyle = '#080d14';
  for(let x = 60; x < W; x += 120){
    ctx.fillRect(x, 400, 16, 4);
  }

  const drX = 780, drY = 240, drW = 90, drH = 140;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(drX + 4, drY + 4, drW, drH);
  ctx.fillStyle = '#1c2430';
  ctx.fillRect(drX, drY, drW, drH);
  ctx.fillStyle = '#252e3b';
  ctx.fillRect(drX + 4, drY + 4, drW - 8, drH - 8);
  ctx.strokeStyle = '#2a3644'; ctx.lineWidth = 3;
  ctx.strokeRect(drX, drY, drW, drH);
  ctx.fillStyle = 'rgba(200,220,240,0.5)';
  ctx.fillRect(drX + 30, drY + 40, 30, 40);
  ctx.fillStyle = 'rgba(40,60,90,0.7)';
  ctx.font = 'bold 12px "PingFang SC",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('出口', drX + drW/2, drY + 60);

  const tg = ctx.createLinearGradient(0, 0, 0, 80);
  tg.addColorStop(0, 'rgba(0,0,0,0.65)');
  tg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, W, 80);
  const eg = ctx.createLinearGradient(0, 0, 80, 0);
  eg.addColorStop(0, 'rgba(0,0,0,0.75)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(0, 0, 80, H);
  const eg2 = ctx.createLinearGradient(W-80, 0, W, 0);
  eg2.addColorStop(0, 'rgba(0,0,0,0)');
  eg2.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = eg2;
  ctx.fillRect(W-80, 0, 80, H);
}

function drawRooftopDynamic(t, dt){
  ctx.save();
  ctx.strokeStyle = 'rgba(168,205,240,0.35)';
  ctx.lineWidth = 1;
  for(let i=0;i<60;i++){
    const x = (i*47 + t*800) % W;
    const y = (i*97 + t*900) % H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y - 12);
    ctx.stroke();
  }
  ctx.restore();
}

/* =========================================================
   地下通道
   ========================================================= */
function drawUnderpassStatic(){
  const cut = isPowerCut();
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = grad(0, 400, 0, H, [
    [0, '#0a0f16'],[1, '#04070b']
  ]);
  ctx.fillRect(0, 400, W, 140);
  ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 1;
  for(let x = -40; x < W+80; x += 60){
    ctx.beginPath();
    ctx.moveTo(x, 400); ctx.lineTo(x+20, H);
    ctx.stroke();
  }
  for(let y = 420; y < H; y += 30){
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(60,100,140,0.10)';
  ctx.beginPath();
  ctx.ellipse(300, 480, 100, 15, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(700, 490, 80, 12, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = grad(0, 0, 0, 200, [
    [0, '#0c1119'],[1, '#050810']
  ]);
  ctx.beginPath();
  ctx.moveTo(0, 180);
  ctx.quadraticCurveTo(W/2, 20, W, 180);
  ctx.lineTo(W, 0); ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.015)'; ctx.lineWidth = 1;
  for(let x = 40; x < W; x += 60){
    const y = 180 - Math.sin((x/W)*Math.PI)*160;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x, 180);
    ctx.stroke();
  }

  ctx.fillStyle = '#080c12';
  ctx.fillRect(0, 180, W, 220);
  brickWall(0, 180, W, 220, 56, 22, '#0c1119', 'rgba(0,0,0,0.28)');
  for(let i=0;i<12;i++){
    const mx = (i*83 + 40) % W;
    const my = 200 + (i*59) % 180;
    ctx.fillStyle = `rgba(40,60,80,${0.10 + (i%3)*0.03})`;
    ctx.beginPath();
    ctx.ellipse(mx, my, 20 + (i%4)*8, 10 + (i%3)*5, 0, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.fillStyle = '#1a222c';
  ctx.fillRect(0, 220, W, 12);
  ctx.fillStyle = '#242e3a';
  ctx.fillRect(0, 222, W, 3);
  ctx.fillStyle = '#0f141b';
  for(let x = 80; x < W; x += 140){
    ctx.fillRect(x, 216, 8, 22);
  }
  ctx.fillStyle = '#2a3644';
  ctx.beginPath(); ctx.arc(280, 226, 8, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(680, 226, 8, 0, Math.PI*2); ctx.fill();

  const lamps = [
    { x: 200, y: 180 },
    { x: 480, y: 180 },
    { x: 760, y: 180 }
  ];
  lamps.forEach(l => {
    ctx.fillStyle = '#1a222c';
    ctx.beginPath();
    ctx.moveTo(l.x - 18, l.y);
    ctx.lineTo(l.x + 18, l.y);
    ctx.lineTo(l.x + 12, l.y - 12);
    ctx.lineTo(l.x - 12, l.y - 12);
    ctx.closePath();
    ctx.fill();
    if(cut){
      const blink = 0.5 + 0.5*Math.sin(performance.now()/400*2.5 + l.x*0.01);
      ctx.fillStyle = `rgba(255,140,80,${0.7 + blink*0.3})`;
      ctx.beginPath();
      ctx.ellipse(l.x, l.y - 6, 8, 4, 0, 0, Math.PI*2);
      ctx.fill();
      const rg = ctx.createRadialGradient(l.x, l.y - 4, 0, l.x, l.y - 4, 100);
      rg.addColorStop(0, `rgba(255,120,60,${0.20 * (0.5+blink*0.5)})`);
      rg.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(l.x - 100, l.y - 100, 200, 200);
    } else {
      ctx.fillStyle = 'rgba(255,220,150,0.95)';
      ctx.beginPath();
      ctx.ellipse(l.x, l.y - 6, 8, 4, 0, 0, Math.PI*2);
      ctx.fill();
      const lg = ctx.createRadialGradient(l.x, l.y - 4, 0, l.x, l.y - 4, 120);
      lg.addColorStop(0, 'rgba(255,205,125,0.22)');
      lg.addColorStop(1, 'rgba(255,205,125,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(l.x - 120, l.y - 120, 240, 240);
    }
  });

  ctx.save();
  ctx.translate(220, 320); ctx.rotate(-0.05);
  ctx.strokeStyle = 'rgba(220,90,140,0.20)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.quadraticCurveTo(30,-20,60,0);
  ctx.moveTo(10,18); ctx.lineTo(50,20);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(640, 340); ctx.rotate(0.04);
  ctx.strokeStyle = 'rgba(120,180,240,0.18)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(30,-12); ctx.lineTo(60,4); ctx.lineTo(90,-6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(50, 22, 12, 0, Math.PI*2); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(400, 300); ctx.rotate(-0.03);
  ctx.fillStyle = 'rgba(180,160,130,0.15)';
  ctx.fillRect(-40, -30, 80, 60);
  ctx.fillStyle = 'rgba(100,90,75,0.20)';
  ctx.fillRect(-34, -24, 68, 26);
  ctx.fillStyle = 'rgba(200,80,80,0.10)';
  ctx.fillRect(-34, 8, 40, 12);
  ctx.restore();

  const dx = 820, dy = 240, dw = 100, dh = 160;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(dx + 4, dy + 4, dw, dh);
  ctx.fillStyle = '#1c2430';
  ctx.fillRect(dx, dy, dw, dh);
  ctx.fillStyle = '#252e3b';
  ctx.fillRect(dx + 4, dy + 4, dw - 8, dh - 8);
  ctx.strokeStyle = '#2a3644'; ctx.lineWidth = 3;
  ctx.strokeRect(dx, dy, dw, dh);
  ctx.fillStyle = 'rgba(200,60,40,0.6)';
  ctx.fillRect(dx + 30, dy + 20, 40, 22);
  ctx.fillStyle = 'rgba(255,240,180,0.85)';
  ctx.font = 'bold 10px "PingFang SC",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('配电房', dx + 50, dy + 31);
  ctx.fillStyle = '#5a6878';
  ctx.beginPath();
  ctx.arc(dx + 84, dy + dh/2, 4, 0, Math.PI*2);
  ctx.fill();

  const sx = 60, sy = 240, sw = 120, sh = 160;
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(sx, sy, sw, sh);
  ctx.strokeStyle = 'rgba(120,140,160,0.3)'; ctx.lineWidth = 1;
  for(let i=0;i<8;i++){
    const stepY = sy + 20 + i*18;
    ctx.beginPath();
    ctx.moveTo(sx + 10, stepY);
    ctx.lineTo(sx + sw - 10, stepY);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2a3644'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx + 6, sy + 12); ctx.lineTo(sx + 6, sy + sh);
  ctx.moveTo(sx + sw - 6, sy + 12); ctx.lineTo(sx + sw - 6, sy + sh);
  ctx.stroke();
  const sg2 = ctx.createLinearGradient(0, sy, 0, sy + 40);
  sg2.addColorStop(0, 'rgba(140,170,200,0.15)');
  sg2.addColorStop(1, 'rgba(140,170,200,0)');
  ctx.fillStyle = sg2;
  ctx.fillRect(sx, sy, sw, 40);

  const bx = 560, by = 420, bw = 60, bh = 70;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(bx + bw/2, by + bh + 2, bw*0.5, 8, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#1e2631';
  ctx.beginPath();
  ctx.moveTo(bx + 4, by + 6);
  ctx.lineTo(bx + bw - 4, by + 6);
  ctx.lineTo(bx + bw - 8, by + bh);
  ctx.lineTo(bx + 8, by + bh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#252e3a';
  ctx.beginPath(); ctx.ellipse(bx + bw/2, by + 6, bw/2, 6, 0, 0, Math.PI*2); ctx.fill();

  const eg = ctx.createLinearGradient(0, 0, 0, 120);
  eg.addColorStop(0, 'rgba(0,0,0,0.75)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(0, 0, W, 120);
  const eg2 = ctx.createLinearGradient(0, H-80, 0, H);
  eg2.addColorStop(0, 'rgba(0,0,0,0)');
  eg2.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = eg2;
  ctx.fillRect(0, H-80, W, 80);
}

function drawUnderpassDynamic(t, dt){
  const cut = isPowerCut();
  const dy = 260 + ((t*80) % 160);
  if(dy < 400){
    ctx.fillStyle = 'rgba(180,215,245,0.5)';
    ctx.beginPath();
    ctx.ellipse(400, dy, 2, 4, 0, 0, Math.PI*2);
    ctx.fill();
  }
  if(cut){
    if(Math.random() < 0.03){
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, W, 400);
    }
  }
}

/* =========================================================
   河堤
   ========================================================= */
function drawRiversideStatic(){
  const cut = isPowerCut();
  ctx.fillStyle = grad(0,0,0,440, [
    [0,'#040710'],[0.4,'#0a1420'],[0.75,'#101c2c'],[1,'#1a2534']
  ]);
  ctx.fillRect(0,0,W,440);

  for(let i=0;i<5;i++){
    ctx.fillStyle = `rgba(28,42,62,${0.30 + 0.06*(i%2)})`;
    ctx.beginPath();
    ctx.ellipse(80 + i*220, 50 + (i%2)*20, 240, 34, 0, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(220,230,245,0.5)';
  const stars = [[120,60,1],[280,40,1.2],[500,80,0.9],[700,50,1.1],[820,90,0.8]];
  stars.forEach(s => {
    ctx.beginPath();
    ctx.arc(s[0], s[1], s[2], 0, Math.PI*2);
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(255,244,214,0.80)';
  ctx.beginPath(); ctx.arc(760, 90, 22, 0, Math.PI*2); ctx.fill();
  const mg = ctx.createRadialGradient(760, 90, 0, 760, 90, 140);
  mg.addColorStop(0,'rgba(255,244,214,0.15)');
  mg.addColorStop(1,'rgba(255,244,214,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(620, -50, 280, 280);

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

  skyline.forEach((b, bi) => {
    const cols = Math.floor(b.w / 24);
    const rows = Math.floor(b.h / 30);
    for(let i=0;i<cols;i++){
      for(let j=0;j<rows;j++){
        const wx = b.x + 8 + i*24;
        const wy = b.y + 14 + j*30;
        if(wx + 10 > b.x + b.w - 4) continue;
        if(wy + 16 > b.y + b.h - 4) continue;
        const lit = !cut && (bi*7 + i*3 + j*11) % 12 === 0;
        const emLit = cut && (bi*7 + i*3 + j*11) % 29 === 0;
        if(lit){
          ctx.fillStyle = 'rgba(255,190,110,0.5)';
          ctx.fillRect(wx, wy, 10, 16);
        } else if(emLit){
          ctx.fillStyle = 'rgba(255,180,90,0.35)';
          ctx.fillRect(wx, wy, 10, 16);
        } else {
          ctx.fillStyle = 'rgba(20,30,45,0.8)';
          ctx.fillRect(wx, wy, 10, 16);
        }
      }
    }
  });

  ctx.fillStyle = grad(0, 420, 0, 540, [
    [0, '#0a1520'],[0.5, '#061018'],[1, '#03080e']
  ]);
  ctx.fillRect(0, 420, W, 120);

  ctx.strokeStyle = 'rgba(140,180,220,0.10)'; ctx.lineWidth = 1;
  for(let i=0;i<20;i++){
    const y = 430 + i*5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(W/3, y - 4, W*2/3, y + 4, W, y - 2);
    ctx.stroke();
  }

  if(!cut){
    skyline.forEach((b, bi) => {
      const cols = Math.floor(b.w / 24);
      for(let i=0;i<cols;i++){
        const wx = b.x + 8 + i*24;
        const lit = (bi*7 + i*3) % 12 === 0;
        if(!lit) continue;
        const rY = 430 + (540 - 430) * 0.15;
        ctx.fillStyle = 'rgba(255,190,110,0.15)';
        ctx.fillRect(wx, rY, 10, 40);
      }
    });
    ctx.fillStyle = 'rgba(255,244,214,0.20)';
    ctx.beginPath();
    ctx.ellipse(760, 470, 40, 6, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,244,214,0.12)';
    ctx.beginPath();
    ctx.ellipse(760, 490, 50, 8, 0, 0, Math.PI*2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 420, W, 120);
  }

  const ry = 400;
  ctx.fillStyle = '#1a222c';
  ctx.fillRect(0, ry - 8, W, 8);
  ctx.fillStyle = '#242e3a';
  ctx.fillRect(0, ry - 8, W, 3);
  for(let x = 20; x < W; x += 40){
    ctx.fillStyle = '#1a222c';
    ctx.fillRect(x - 4, ry, 8, 140);
    ctx.fillStyle = '#2a3644';
    ctx.fillRect(x - 6, ry - 4, 12, 4);
  }
  ctx.fillStyle = '#1a222c';
  ctx.fillRect(0, ry + 40, W, 6);
  ctx.fillRect(0, ry + 90, W, 6);

  const bX = 240, bY = 480;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(bX + 60, bY + 30, 70, 6, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#3a2c1e';
  ctx.fillRect(bX, bY, 130, 12);
  ctx.fillStyle = '#2a2016';
  ctx.fillRect(bX, bY + 12, 130, 4);
  ctx.fillRect(bX + 6, bY + 16, 8, 40);
  ctx.fillRect(bX + 116, bY + 16, 8, 40);
  ctx.fillStyle = '#3a2c1e';
  ctx.fillRect(bX, bY - 40, 130, 12);
  ctx.fillStyle = '#2a2016';
  ctx.fillRect(bX, bY - 28, 130, 4);
  for(let i=0;i<5;i++){
    ctx.fillStyle = '#2a2016';
    ctx.fillRect(bX + 10 + i*24, bY - 40, 6, 40);
  }

  ctx.fillStyle = '#141b25';
  ctx.fillRect(76, 320, 9, 88);
  ctx.fillStyle = '#1c2531';
  ctx.beginPath();
  ctx.moveTo(60, 320); ctx.lineTo(102, 320);
  ctx.lineTo(94, 300); ctx.lineTo(68, 300);
  ctx.closePath(); ctx.fill();
  if(cut){
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath(); ctx.ellipse(80, 326, 8, 4.5, 0, 0, Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,214,140,0.95)';
    ctx.beginPath(); ctx.ellipse(80, 326, 8, 4.5, 0, 0, Math.PI*2); ctx.fill();
    const lg = ctx.createRadialGradient(80, 326, 0, 80, 326, 240);
    lg.addColorStop(0,'rgba(255,208,130,0.28)');
    lg.addColorStop(1,'rgba(255,180,90,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(-140, -120, 500, 700);
  }

  ctx.save();
  ctx.translate(700, 490); ctx.rotate(-0.1);
  ctx.fillStyle = '#3a2c2c';
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.quadraticCurveTo(-40, -50, 0, -50);
  ctx.quadraticCurveTo(40, -50, 40, 0);
  ctx.quadraticCurveTo(0, -8, -40, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4a3838';
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.quadraticCurveTo(-20, -12, 0, -8);
  ctx.quadraticCurveTo(20, -12, 40, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a2016'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -50); ctx.lineTo(0, 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-4, 20, 4, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  const eg = ctx.createLinearGradient(0, 0, 0, 80);
  eg.addColorStop(0, 'rgba(0,0,0,0.6)');
  eg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = eg;
  ctx.fillRect(0, 0, W, 80);
  const eg2 = ctx.createLinearGradient(W-70, 0, W, 0);
  eg2.addColorStop(0, 'rgba(0,0,0,0)');
  eg2.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = eg2;
  ctx.fillRect(W-70, 0, 70, H);
}

function drawRiversideDynamic(t, dt){
  /* 河面雨点交给 common.js 处理 */
}

/* =========================================================
   场景 SPOTS 定义
   ★ 已移除所有 arrows
   ★ 暗色分支 spot 只根据 bloodMode 出现，与主播模式无关
   ========================================================= */
const SCENES = {
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
      /* ★ 暗色分支：墙根窄缝（只要处于 bloodMode 就出现） */
      { id:'bloodExit', x:170, y:520, w:60, h:20, label:'墙根窄缝',
        cond: () => flags().bloodMode },
      { id:'exit',     x:892, y:244, w:52,  h:52,  label:'巷子深处' }
    ]
  },
  backstreet: {
    draw: drawBackstreetStatic, dynamic: drawBackstreetDynamic, rain: true,
    spots: [
      { id:'stairs', x:250, y:36,  w:120, h:180, label:'消防梯' },
      { id:'mold',   x:556, y:262, w:70,  h:70,  label:'墙上的霉斑' },
      { id:'box',    x:166, y:312, w:184, h:170, label:'纸箱' },
      { id:'cat',    x:196, y:288, w:150, h:84,  label:'大橘',
        cond: () => !flags().catGone && !flags().bloodMode },
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
      { id:'floor',   x:360, y:440, w:220, h:80,  label:'地板' },
      { id:'window',  x:16,  y:244, w:52,  h:52,  label:'后窗' }
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
      { id:'tree',    x:850, y:110, w:110, h:180, label:'梧桐树' },
      { id:'mailbox', x:820, y:330, w:46,  h:60,  label:'信箱' },
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
      { id:'fuse',    x:60,  y:200, w:120, h:180, label:'保险丝盒' },
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
      { id:'graffiti', x:220, y:290, w:80,  h:120, label:'墙上的涂鸦' },
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
  }
};

window.__SCENES__ = Object.assign({ setCtx, getCtx }, SCENES);
})();