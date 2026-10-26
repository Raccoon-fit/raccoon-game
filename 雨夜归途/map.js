/* =========================================================
   map.js — 雨痕地图 v4
   v4: 全面自检与错误上报，去掉去重（全量上报）
       - 任何空值/null/未定义/杂值都会通过 __DEV_ERROR__ / __DEV_WARN__ 上报
       - NODES/EDGES/UNLOCK/NEIGHBORS 一致性会在 init 时校验
       - 已知缺口（parlor、_day 节点未定义）会明确上报
       - ★ 本轮不修复已知缺口，只上报
   ========================================================= */
(function(global){
'use strict';

/* =========================================================
   ★ 错误上报工具（无去重，全量上报）
   ========================================================= */
function _push(level, src, msg){
  try{
    if(level === 'warn'){
      if(global.__DEV_WARN__) global.__DEV_WARN__(msg, src);
      else console.warn('[MAP_WARN]', src, msg);
    } else {
      if(global.__DEV_ERROR__) global.__DEV_ERROR__(msg, src);
      else console.error('[MAP_ERR]', src, msg);
    }
  }catch(e){}
}
function mapErr(msg, src){ _push('error', 'map:' + (src || '?'), msg); }
function mapWarn(msg, src){ _push('warn',  'map:' + (src || '?'), msg); }

function _isObj(v){ return v !== null && typeof v === 'object'; }
function _isNum(v){ return typeof v === 'number' && isFinite(v); }
function _isStr(v){ return typeof v === 'string' && v.length > 0; }
function _isFn(v){ return typeof v === 'function'; }

const W = 960, H = 540;
const SAVE_KEY = 'raccoon_rainy_night_v5';

/* ==================== 节点数据 ==================== */
const NODES = {
  alley:        { x:0.10, y:0.72, name:'雨巷',    icon:'lamp'    },
  backstreet:   { x:0.32, y:0.72, name:'后巷',    icon:'ladder'  },
  powerstation: { x:0.32, y:0.48, name:'配电房',  icon:'bolt'    },
  rooftop:      { x:0.22, y:0.24, name:'屋顶',    icon:'tower'   },
  shop:         { x:0.48, y:0.52, name:'便利店',  icon:'can'     },
  street:       { x:0.62, y:0.68, name:'街道',    icon:'traffic' },
  underpass:    { x:0.52, y:0.85, name:'地下通道',icon:'stairs'  },
  riverside:    { x:0.72, y:0.85, name:'河堤',    icon:'wave'    },
  doorstep:     { x:0.78, y:0.52, name:'门前',    icon:'arch'    },
  house:        { x:0.88, y:0.28, name:'红屋顶',  icon:'house'   },
  neighbor:     { x:0.92, y:0.70, name:'邻屋',    icon:'ruin'    }
};

const EDGES = [
  ['alley','backstreet'], ['backstreet','powerstation'], ['backstreet','rooftop'],
  ['backstreet','shop'], ['shop','street'], ['street','underpass'],
  ['street','riverside'], ['street','doorstep'], ['doorstep','house'],
  ['doorstep','neighbor']
];

/* 邻接表 */
const NEIGHBORS = {};
Object.keys(NODES).forEach(k => NEIGHBORS[k] = []);
EDGES.forEach(e => {
  NEIGHBORS[e[0]].push(e[1]);
  NEIGHBORS[e[1]].push(e[0]);
});

/* ==================== 存档读取 ==================== */
function readSave(){
  try{
    var raw = localStorage.getItem(SAVE_KEY);
    if(raw === null || raw === undefined || raw === '') return {};
    var parsed = JSON.parse(raw);
    if(!_isObj(parsed)){
      mapWarn('readSave: 存档不是对象 (' + (typeof parsed) + ')', 'readSave');
      return {};
    }
    return parsed;
  }catch(e){
    mapWarn('readSave: 解析失败 - ' + (e && e.message ? e.message : e), 'readSave');
    return {};
  }
}
function getFlag(k){
  if(!_isStr(k)){
    mapErr('getFlag: key 非法 (' + String(k) + ')', 'getFlag');
    return false;
  }
  const s = readSave();
  if(!_isObj(s.flags)){
    return false;
  }
  return !!s.flags[k];
}
function hasSeenScene(k){
  if(!_isStr(k)){
    mapErr('hasSeenScene: key 非法 (' + String(k) + ')', 'hasSeenScene');
    return false;
  }
  const s = readSave();
  const arr = (_isObj(s.flags) && Array.isArray(s.flags.seenScenes)) ? s.flags.seenScenes : [];
  return arr.indexOf(k) >= 0;
}

/* ==================== 解锁规则 ==================== */
let curScene = 'alley';

/* 相邻于当前所在节点 —— 可点，但没去过就不发光 */
function isAdjacentToCurrent(key){
  if(!_isStr(key)){
    mapErr('isAdjacentToCurrent: key 非法', 'isAdjacent');
    return false;
  }
  const nb = NEIGHBORS[curScene];
  if(!Array.isArray(nb)){
    mapErr('isAdjacentToCurrent: NEIGHBORS["' + curScene + '"] 不是数组', 'isAdjacent');
    return false;
  }
  return nb.indexOf(key) >= 0;
}

const UNLOCK = {
  alley:        () => true,
  backstreet:   () => hasSeenScene('backstreet')   || isAdjacentToCurrent('backstreet'),
  powerstation: () => hasSeenScene('powerstation') || isAdjacentToCurrent('powerstation'),
  rooftop:      () => hasSeenScene('rooftop')      || isAdjacentToCurrent('rooftop'),

  /* ★ 便利店只能通过“后门被打开”解锁 */
  shop:         () => getFlag('doorOpen'),

  street:       () => hasSeenScene('street')       || isAdjacentToCurrent('street'),
  underpass:    () => hasSeenScene('underpass')    || hasSeenScene('street'),
  riverside:    () => hasSeenScene('riverside')    || hasSeenScene('street'),
  doorstep:     () => getFlag('gateOpen'),
  house:        () => getFlag('gateOpen'),
  neighbor:     () => getFlag('gateOpen')
};

/* ==================== 状态 ==================== */
let canvas, ctx, dpr;
let opened = 0;
let targetOpened = 0;
let visible = false;
let hoverNode = null;
let travelAnim = null;
let onTravel = null;
let rafId = 0;
let lastTime = 0;
let fallbackTimer = 0;

/* ==================== 工具 ==================== */
function px(n){ return n * W; }
function py(n){ return n * H; }
function dist2(ax,ay,bx,by){ const dx=ax-bx,dy=ay-by; return dx*dx+dy*dy; }
function ease(t){ return t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
function clamp(v,a,b){ return v<a?a:v>b?b:v; }

/* ==================== 纸面 ==================== */
function drawPaper(t){
  const bg = ctx.createRadialGradient(W*0.55, H*0.45, 80, W*0.55, H*0.45, W*0.75);
  bg.addColorStop(0,   '#3d2c1d');
  bg.addColorStop(0.55,'#2e2015');
  bg.addColorStop(1,   '#1a120c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  for(let i = 0; i < 2200; i++){
    const x = (i * 137.5) % W;
    const y = (i * 83.7) % H;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,220,170,0.025)' : 'rgba(0,0,0,0.035)';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();

  ctx.save();
  const ws = ctx.createRadialGradient(W*0.42, H*0.96, 20, W*0.42, H*0.96, 280);
  ws.addColorStop(0,   'rgba(40,55,70,0.32)');
  ws.addColorStop(0.5, 'rgba(30,42,58,0.14)');
  ws.addColorStop(1,   'rgba(30,42,58,0)');
  ctx.fillStyle = ws;
  ctx.fillRect(0, H*0.55, W, H*0.45);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.32)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, H*0.5); ctx.lineTo(W, H*0.5);
  ctx.moveTo(W*0.5, 0); ctx.lineTo(W*0.5, H);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,170,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H*0.5+2); ctx.lineTo(W, H*0.5+2);
  ctx.moveTo(W*0.5+2, 0); ctx.lineTo(W*0.5+2, H);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  const cj = ctx.createRadialGradient(W-20, 20, 5, W-20, 20, 140);
  cj.addColorStop(0,   'rgba(15,8,4,0.95)');
  cj.addColorStop(0.35,'rgba(30,15,8,0.75)');
  cj.addColorStop(0.7, 'rgba(50,28,15,0.32)');
  cj.addColorStop(1,   'rgba(50,28,15,0)');
  ctx.fillStyle = cj;
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(W-140, 0);
  for(let i = 0; i <= 14; i++){
    const tt = i / 14;
    const x = W-140 + tt*140;
    const y = tt < 0.5 ? Math.sin(tt*Math.PI)*18 : Math.sin(tt*Math.PI)*18 + Math.random()*4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, 140);
  ctx.lineTo(W, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.font = 'italic 22px "KaiTi","STKaiti",serif';
  ctx.fillStyle = 'rgba(80,50,30,0.55)';
  ctx.textAlign = 'right';
  ctx.fillText('回家。', W-48, 56);
  ctx.restore();
}

/* ==================== 路径 ==================== */
function drawEdge(a, b, t, highlight, waterProgress){
  const A = NODES[a];
  const B = NODES[b];
  if(!_isObj(A)){
    mapErr('drawEdge: NODES["' + String(a) + '"] 不存在', 'drawEdge');
    return;
  }
  if(!_isObj(B)){
    mapErr('drawEdge: NODES["' + String(b) + '"] 不存在', 'drawEdge');
    return;
  }
  if(!_isNum(A.x) || !_isNum(A.y) || !_isNum(B.x) || !_isNum(B.y)){
    mapErr('drawEdge: 节点坐标非法 ' + a + ' / ' + b, 'drawEdge');
    return;
  }
  if(!_isNum(waterProgress)) waterProgress = 0;

  const ax = px(A.x), ay = py(A.y);
  const bx = px(B.x), by = py(B.y);

  const midX = (ax + bx) / 2;
  const midY = (ay + by) / 2;
  const nx = -(by - ay);
  const ny = (bx - ax);
  const nl = Math.hypot(nx, ny) || 1;
  const wobbleAmp = 14 + ((a.charCodeAt(0) * 3 + b.charCodeAt(0) * 7) % 10);
  const cx1 = midX + (nx/nl) * wobbleAmp;
  const cy1 = midY + (ny/nl) * wobbleAmp;
  const cx2 = midX - (nx/nl) * wobbleAmp * 0.7;
  const cy2 = midY - (ny/nl) * wobbleAmp * 0.7;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = highlight ? 'rgba(200,160,100,0.32)' : 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.bezierCurveTo(cx1, cy1, cx2, cy2, bx, by);
  ctx.stroke();
  ctx.restore();

  if(highlight){
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.8;
    const hg = ctx.createLinearGradient(ax, ay, bx, by);
    hg.addColorStop(0, 'rgba(255,214,140,0.7)');
    hg.addColorStop(1, 'rgba(255,214,140,0.25)');
    ctx.strokeStyle = hg;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, bx, by);
    ctx.stroke();
    ctx.restore();
  }

  if(waterProgress > 0){
    drawWaterStreak(ax, ay, cx1, cy1, cx2, cy2, bx, by, waterProgress, a + b);
  }
}

function drawWaterStreak(ax, ay, cx1, cy1, cx2, cy2, bx, by, progress, seed){
  if(!_isStr(seed)) seed = 'xx';
  const steps = 32;
  const N = Math.max(1, Math.floor(steps * progress));
  const pts = [];
  for(let i = 0; i <= N; i++){
    const t = (i / steps);
    const it = 1 - t;
    const x = it*it*it*ax + 3*it*it*t*cx1 + 3*it*t*t*cx2 + t*t*t*bx;
    const y = it*it*it*ay + 3*it*it*t*cy1 + 3*it*t*t*cy2 + t*t*t*by;
    const jitter = Math.sin(t * 21 + seed.charCodeAt(0)) * 2.5 + Math.sin(t * 37 + seed.charCodeAt(1)) * 1.5;
    pts.push([x + jitter, y + Math.cos(t*29 + seed.charCodeAt(0))*2]);
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(80,110,130,0.62)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
  ctx.stroke();

  ctx.strokeStyle = 'rgba(180,210,230,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1] - 1.5) : ctx.lineTo(p[0], p[1] - 1.5));
  ctx.stroke();

  ctx.strokeStyle = 'rgba(30,45,58,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1] + 2.5) : ctx.lineTo(p[0], p[1] + 2.5));
  ctx.stroke();
  ctx.restore();
}

/* ==================== 图标 ==================== */
function stroke(color, width){
  ctx.strokeStyle = color || '#2a1a10';
  ctx.lineWidth = width || 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

const ICONS = {
  lamp(){
    stroke();
    ctx.beginPath();
    ctx.moveTo(-8, 14); ctx.lineTo(8, 14);
    ctx.moveTo(-5, 14); ctx.lineTo(-3, 8);
    ctx.moveTo(5, 14); ctx.lineTo(3, 8);
    ctx.moveTo(0, 8); ctx.lineTo(0, -6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, -6); ctx.lineTo(9, -6);
    ctx.lineTo(5, -14); ctx.lineTo(-5, -14);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,150,0.9)';
    ctx.beginPath(); ctx.arc(0, -3, 2, 0, Math.PI*2); ctx.fill();
  },
  ladder(){
    stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -14); ctx.lineTo(-8, 14);
    ctx.moveTo(8, -14);  ctx.lineTo(8, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-6, -14, 3, Math.PI, 0);
    ctx.stroke();
    for(let i = -1; i <= 1; i++){
      const y = i * 8;
      ctx.beginPath();
      ctx.moveTo(-8, y); ctx.lineTo(8, y);
      ctx.stroke();
    }
  },
  bolt(){
    stroke();
    ctx.beginPath();
    ctx.moveTo(-3, -14);
    ctx.lineTo(4, -3);
    ctx.lineTo(-1, -3);
    ctx.lineTo(4, 14);
    ctx.lineTo(-4, 2);
    ctx.lineTo(1, 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,220,150,0.22)';
    ctx.fill();
  },
  tower(){
    stroke();
    ctx.beginPath();
    ctx.moveTo(-9, 14); ctx.lineTo(-6, 4);
    ctx.moveTo(9, 14);  ctx.lineTo(6, 4);
    ctx.moveTo(-6, 4);  ctx.lineTo(6, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 4); ctx.lineTo(-10, -8);
    ctx.lineTo(10, -8); ctx.lineTo(10, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, -8); ctx.lineTo(0, -16); ctx.lineTo(12, -8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 0); ctx.lineTo(10, 0);
    ctx.stroke();
  },
  can(){
    stroke();
    ctx.beginPath();
    ctx.ellipse(0, -12, 8, 3, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -12); ctx.lineTo(-8, 12);
    ctx.moveTo(8, -12);  ctx.lineTo(8, 12);
    ctx.ellipse(0, 12, 8, 3, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -3); ctx.lineTo(8, -3);
    ctx.moveTo(-8, 5);  ctx.lineTo(8, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -14, 2.5, 0, Math.PI*2);
    ctx.stroke();
  },
  traffic(){
    stroke();
    ctx.beginPath();
    ctx.moveTo(0, 14); ctx.lineTo(0, -6);
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(-6, -16, 12, 14);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,80,80,0.85)';
    ctx.beginPath(); ctx.arc(0, -13, 1.6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,90,0.4)';
    ctx.beginPath(); ctx.arc(0, -9, 1.6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(120,255,140,0.4)';
    ctx.beginPath(); ctx.arc(0, -5, 1.6, 0, Math.PI*2); ctx.fill();
  },
  stairs(){
    stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 10);
    ctx.lineTo(-12, -2);
    ctx.arc(0, -2, 12, Math.PI, 0);
    ctx.lineTo(12, 10);
    ctx.stroke();
    for(let i = 0; i < 3; i++){
      const w = 10 - i * 2;
      const y = 4 + i * 3;
      ctx.beginPath();
      ctx.moveTo(-w, y); ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(-9, 8);
    ctx.arc(0, -2, 9, Math.PI, 0);
    ctx.lineTo(9, 8);
    ctx.closePath();
    ctx.fill();
  },
  wave(){
    stroke();
    for(let k = 0; k < 3; k++){
      const y = -6 + k * 6;
      ctx.beginPath();
      for(let i = 0; i <= 20; i++){
        const x = -14 + i * 1.4;
        const wy = y + Math.sin(i * 0.8 + k * 1.3) * 2;
        if(i === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  },
  arch(){
    stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 14);
    ctx.lineTo(-10, -2);
    ctx.arc(0, -2, 10, Math.PI, 0);
    ctx.lineTo(10, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7, 14);
    ctx.lineTo(-7, -2);
    ctx.arc(0, -2, 7, Math.PI, 0);
    ctx.lineTo(7, 14);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,160,80,0.8)';
    ctx.beginPath(); ctx.arc(4, 6, 1.5, 0, Math.PI*2); ctx.fill();
  },
  house(){
    stroke();
    ctx.beginPath();
    ctx.moveTo(-11, 4); ctx.lineTo(-11, 14);
    ctx.lineTo(11, 14); ctx.lineTo(11, 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(170,60,40,0.85)';
    ctx.beginPath();
    ctx.moveTo(-14, 4); ctx.lineTo(0, -14); ctx.lineTo(14, 4);
    ctx.closePath();
    ctx.fill();
    stroke('rgba(120,35,25,0.9)', 1.4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(80,45,25,0.9)';
    ctx.fillRect(-3, 6, 6, 8);
    ctx.fillStyle = 'rgba(255,220,140,0.9)';
    ctx.fillRect(-9, 8, 4, 4);
    ctx.fillRect(5, 8, 4, 4);
  },
  ruin(){
    stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 6); ctx.lineTo(-6, -10); ctx.lineTo(0, 6);
    ctx.lineTo(0, 14); ctx.lineTo(-12, 14);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(4, 4);
    ctx.lineTo(6, 10);
    ctx.lineTo(4, 14);
    ctx.lineTo(0, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 2); ctx.lineTo(12, -6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, 8); ctx.lineTo(-4, 8); ctx.lineTo(-4, 12);
    ctx.stroke();
  }
};

/* ==================== 节点绘制 ==================== */
function drawNode(key, t){
  const n = NODES[key];
  if(!_isObj(n)){
    mapErr('drawNode: NODES["' + String(key) + '"] 不存在或非对象', 'drawNode');
    return;
  }
  if(!_isNum(n.x) || !_isNum(n.y)){
    mapErr('drawNode: 节点 "' + key + '" 坐标非法', 'drawNode');
    return;
  }
  if(!_isStr(n.icon)){
    mapWarn('drawNode: 节点 "' + key + '" icon 缺失', 'drawNode');
  }
  if(!_isStr(n.name)){
    mapWarn('drawNode: 节点 "' + key + '" name 缺失', 'drawNode');
  }
  if(!_isFn(UNLOCK[key])){
    mapErr('drawNode: UNLOCK["' + key + '"] 未定义', 'drawNode');
    return;
  }

  const x = px(n.x), y = py(n.y);
  const unlocked = UNLOCK[key]();
  const isCurrent = key === curScene;
  const isSeen = hasSeenScene(key);
  const isHover = key === hoverNode && unlocked;

  ctx.save();
  ctx.translate(x, y);

  /* 当前节点的水波 */
  if(isCurrent){
    const waveR = 26 + Math.sin(t * 2) * 6;
    for(let k = 0; k < 2; k++){
      const r = waveR + k * 10;
      const a = 0.35 * (1 - k * 0.4);
      ctx.strokeStyle = `rgba(140,200,230,${a})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI*2);
      ctx.stroke();
    }
  }

  /* 悬停光晕 */
  if(isHover){
    const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, 36);
    hg.addColorStop(0, 'rgba(255,214,140,0.28)');
    hg.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI*2);
    ctx.fill();
  }

  /* 只有"去过的"节点发光 */
  if(unlocked && !isCurrent && isSeen){
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
    g.addColorStop(0, 'rgba(255,200,120,0.14)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI*2);
    ctx.fill();
  }

  /* 图标 */
  const iconFn = ICONS[n.icon];
  if(_isFn(iconFn)){
    iconFn();
  } else {
    mapWarn('drawNode: 未定义图标 "' + String(n.icon) + '"（节点 ' + key + '）', 'drawNode');
    /* 退化画一个问号 */
    stroke('#7a6a55', 1.8);
    ctx.beginPath();
    ctx.arc(0, -2, 8, 0, Math.PI*2);
    ctx.stroke();
    ctx.fillStyle = '#7a6a55';
    ctx.font = 'bold 12px "PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, -2);
  }

  /* 未解锁：叠水渍 */
  if(!unlocked){
    ctx.fillStyle = 'rgba(45,62,78,0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(45,62,78,0.35)';
    ctx.lineWidth = 1.2;
    for(let i = 0; i < 5; i++){
      const a = i / 5 * Math.PI * 2;
      const r = 16 + Math.sin(i * 3.1) * 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a)*r*0.5, Math.sin(a)*r*0.5, 4, 0, Math.PI*2);
      ctx.stroke();
    }
  }

  /* 去过的脚印墨渍 */
  if(unlocked && isSeen && !isCurrent){
    ctx.fillStyle = 'rgba(60,40,25,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 17, 7, 2, 0, 0, Math.PI*2);
    ctx.fill();
  }

  /* 名字 */
  ctx.font = '13px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = unlocked ? 'rgba(220,190,140,0.85)' : 'rgba(140,155,170,0.55)';
  ctx.fillText(n.name || key, 0, 30);

  /* 未解锁小字 */
  if(!unlocked){
    ctx.font = '10px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = 'rgba(140,155,170,0.45)';
    ctx.fillText('（路还没通）', 0, 44);
  }

  ctx.restore();
}

/* ==================== 雨痕动画 ==================== */
function startTravel(fromKey, toKey, path){
  if(!_isStr(fromKey) || !_isStr(toKey)){
    mapErr('startTravel: fromKey/toKey 非法', 'startTravel');
    return;
  }
  if(!Array.isArray(path) || path.length === 0){
    mapErr('startTravel: path 为空或非数组 (' + fromKey + ' → ' + toKey + ')', 'startTravel');
    return;
  }
  const short = path.length <= 2;
  travelAnim = {
    fromKey, toKey, path,
    start: performance.now() / 1000,
    duration: short ? 2.0 : 1.5,
    mode: short ? 'spread' : 'flood',
    edgeProgress: {},
    paw: null
  };
  path.forEach((k, i) => {
    if(i === 0) return;
    if(!_isStr(k)){
      mapErr('startTravel: path 中含非法节点 (' + String(k) + ')', 'startTravel');
      return;
    }
    const ekey = path[i-1] + '_' + k;
    travelAnim.edgeProgress[ekey] = 0;
  });
}

function findPath(from, to){
  if(!_isStr(from)){
    mapErr('findPath: from 非法 (' + String(from) + ')', 'findPath');
    return null;
  }
  if(!_isStr(to)){
    mapErr('findPath: to 非法 (' + String(to) + ')', 'findPath');
    return null;
  }
  if(!_isObj(NODES[from])){
    mapErr('findPath: 起点场景 "' + from + '" 未定义（NODES 中没有）', 'findPath');
    return null;
  }
  if(!_isObj(NODES[to])){
    mapErr('findPath: 终点场景 "' + to + '" 未定义（NODES 中没有）', 'findPath');
    return null;
  }
  if(!Array.isArray(NEIGHBORS[from])){
    mapErr('findPath: NEIGHBORS["' + from + '"] 不是数组（邻接表损坏）', 'findPath');
    return null;
  }
  if(from === to) return null;
  const visited = { [from]: true };
  const queue = [[from]];
  while(queue.length){
    const cur = queue.shift();
    const last = cur[cur.length - 1];
    const nbList = NEIGHBORS[last];
    if(!Array.isArray(nbList)){
      mapWarn('findPath: NEIGHBORS["' + last + '"] 缺失，跳过', 'findPath');
      continue;
    }
    for(const nb of nbList){
      if(!_isFn(UNLOCK[nb])){
        mapWarn('findPath: UNLOCK["' + nb + '"] 未定义，跳过', 'findPath');
        continue;
      }
      if(!UNLOCK[nb]()) continue;
      if(visited[nb]) continue;
      const next = cur.concat([nb]);
      if(nb === to) return next;
      visited[nb] = true;
      queue.push(next);
    }
  }
  mapWarn('findPath: 找不到从 "' + from + '" 到 "' + to + '" 的路径', 'findPath');
  return null;
}

/* ==================== 展开 ==================== */
function updateOpenAnim(dt){
  const speed = 3.5;
  if(opened < targetOpened){
    opened = Math.min(targetOpened, opened + dt * speed);
  } else if(opened > targetOpened){
    opened = Math.max(targetOpened, opened - dt * speed);
  }
}

/* ==================== 渲染 ==================== */
function render(t){
  const eo = ease(opened);
  if(eo <= 0.001) return;

  ctx.clearRect(0, 0, W, H);
  ctx.save();

  const originX = W - 155;
  const originY = 41;
  const fullRadius = Math.hypot(Math.max(originX, W-originX), Math.max(originY, H-originY)) * 1.1;
  const radius = fullRadius * eo;

  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  ctx.save();
  ctx.beginPath();
  ctx.arc(originX, originY, radius, 0, Math.PI * 2);
  ctx.clip();

  drawPaper(t);

  EDGES.forEach(e => {
    if(!Array.isArray(e) || e.length !== 2){
      mapErr('render: EDGES 中含非法项', 'render');
      return;
    }
    const fromIsCurrent = e[0] === curScene || e[1] === curScene;
    let wp = 0;
    if(travelAnim){
      const key1 = e[0] + '_' + e[1];
      const key2 = e[1] + '_' + e[0];
      if(travelAnim.edgeProgress[key1] !== undefined) wp = travelAnim.edgeProgress[key1];
      else if(travelAnim.edgeProgress[key2] !== undefined) wp = travelAnim.edgeProgress[key2];
    }
    drawEdge(e[0], e[1], t, fromIsCurrent, wp * eo);
  });

  const order = Object.keys(NODES);
  order.forEach((key, i) => {
    const appearAt = 0.4 + (i / order.length) * 0.5;
    if(eo < appearAt) return;
    const localA = Math.min(1, (eo - appearAt) / 0.1);
    ctx.save();
    ctx.globalAlpha = localA;
    drawNode(key, t);
    ctx.restore();
  });

  if(travelAnim && travelAnim.paw){
    const p = travelAnim.paw;
    if(p.life > 0){
      const n = NODES[p.node];
      if(_isObj(n)){
        const x = px(n.x), y = py(n.y);
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 2);
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(60,90,110,0.75)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI*2);
        ctx.fill();
        for(let i = 0; i < 3; i++){
          const a = -0.6 + i * 0.6;
          ctx.beginPath();
          ctx.arc(Math.cos(a-1.57)*10, Math.sin(a-1.57)*10 - 4, 2.5, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  ctx.restore();

  const vg = ctx.createRadialGradient(W/2, H/2, H*0.35, W/2, H/2, H*1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.75, 'rgba(0,0,0,0.28)');
  vg.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
}

/* ==================== 主循环 ==================== */
function update(dt, t){
  updateOpenAnim(dt);

  if(travelAnim){
    const el = t - travelAnim.start;
    const dur = travelAnim.duration;
    const k = clamp(el / dur, 0, 1);

    if(travelAnim.mode === 'spread'){
      const edgeKeys = Object.keys(travelAnim.edgeProgress);
      const total = edgeKeys.length;
      edgeKeys.forEach((ek, i) => {
        const start = i / total;
        const end = (i + 1) / total;
        const local = clamp((k - start) / (end - start), 0, 1);
        travelAnim.edgeProgress[ek] = local;
      });
    } else {
      const edgeKeys = Object.keys(travelAnim.edgeProgress);
      if(k < 0.3){
        const fill = k / 0.3;
        edgeKeys.forEach(ek => travelAnim.edgeProgress[ek] = fill);
      } else {
        const shrink = (k - 0.3) / 0.7;
        const total = edgeKeys.length;
        edgeKeys.forEach((ek, i) => {
          const order = i / total;
          const localShrink = clamp((shrink - order * 0.7) / 0.3, 0, 1);
          const after = 1 - localShrink;
          travelAnim.edgeProgress[ek] = Math.max(after, i / total < shrink ? after : 1);
          if(shrink > order){
            travelAnim.edgeProgress[ek] = Math.max(0, 1 - (shrink - order) * 2);
          }
        });
      }
    }

    if(k >= 1 && !travelAnim.paw){
      travelAnim.paw = { node: travelAnim.toKey, life: 1.0 };
    }
    if(travelAnim.paw){
      travelAnim.paw.life -= dt * 0.7;
      if(travelAnim.paw.life <= 0){
        const to = travelAnim.toKey;
        travelAnim = null;
        if(_isFn(onTravel)) onTravel(to);
        else mapWarn('update: onTravel 回调未设置', 'update');
        return;
      }
    }
  }
}

function loop(now){
  if(!visible && opened <= 0.001){
    rafId = 0;
    return;
  }

  if(now - lastTime > 1000){
    lastTime = now - 50;
  }
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  const t = now / 1000;
  update(dt, t);
  render(t);
  rafId = requestAnimationFrame(loop);
}

/* ==================== 点击 ==================== */
function findNodeAt(mx, my){
  let best = null, bestD = 40 * 40;
  Object.keys(NODES).forEach(k => {
    const n = NODES[k];
    if(!_isObj(n) || !_isNum(n.x) || !_isNum(n.y)) return;
    const x = px(n.x), y = py(n.y);
    const d = dist2(mx, my, x, y);
    if(d < bestD){ bestD = d; best = k; }
  });
  return best;
}

function onClick(e){
  if(opened < 0.5) return;
  if(travelAnim) return;
  if(!canvas){
    mapErr('onClick: canvas 为空', 'onClick');
    return;
  }
  const r = canvas.getBoundingClientRect();
  if(!r || !_isNum(r.width) || !_isNum(r.height) || r.width === 0 || r.height === 0){
    mapErr('onClick: canvas 尺寸非法', 'onClick');
    return;
  }
  const mx = (e.clientX - r.left) * (W / r.width);
  const my = (e.clientY - r.top) * (H / r.height);
  const k = findNodeAt(mx, my);
  if(!k) return;
  if(!_isFn(UNLOCK[k])){
    mapErr('onClick: UNLOCK["' + k + '"] 未定义', 'onClick');
    return;
  }
  if(!UNLOCK[k]()) return;
  if(k === curScene) return;
  const path = findPath(curScene, k);
  if(!path) return;
  startTravel(curScene, k, path);
}

function onMove(e){
  if(opened < 0.5 || travelAnim){
    hoverNode = null;
    return;
  }
  if(!canvas){
    hoverNode = null;
    return;
  }
  const r = canvas.getBoundingClientRect();
  if(!r || !_isNum(r.width) || !_isNum(r.height) || r.width === 0 || r.height === 0){
    hoverNode = null;
    return;
  }
  const mx = (e.clientX - r.left) * (W / r.width);
  const my = (e.clientY - r.top) * (H / r.height);
  hoverNode = findNodeAt(mx, my);
}

/* ==================== 一致性自检 ==================== */
function selfCheckMap(stage){
  const tag = 'selfCheck:' + (stage || '?');

  /* NODES 合法性 */
  if(!_isObj(NODES)){
    mapErr('NODES 不存在或非对象', tag);
    return;
  }
  const keys = Object.keys(NODES);
  if(keys.length === 0){
    mapErr('NODES 为空', tag);
    return;
  }
  keys.forEach(k => {
    const n = NODES[k];
    if(!_isObj(n)){
      mapErr('NODES["' + k + '"] 不是对象', tag);
      return;
    }
    if(!_isNum(n.x)) mapErr('NODES["' + k + '"].x 非数值', tag);
    if(!_isNum(n.y)) mapErr('NODES["' + k + '"].y 非数值', tag);
    if(!_isStr(n.name)) mapWarn('NODES["' + k + '"].name 缺失', tag);
    if(!_isStr(n.icon)){
      mapWarn('NODES["' + k + '"].icon 缺失', tag);
    } else if(!_isFn(ICONS[n.icon])){
      mapWarn('NODES["' + k + '"].icon "' + n.icon + '" 在 ICONS 中未定义', tag);
    }
    if(!_isFn(UNLOCK[k])){
      mapErr('UNLOCK["' + k + '"] 未定义', tag);
    }
    if(!Array.isArray(NEIGHBORS[k])){
      mapErr('NEIGHBORS["' + k + '"] 不是数组', tag);
    }
  });

  /* EDGES 合法性 */
  if(!Array.isArray(EDGES)){
    mapErr('EDGES 不是数组', tag);
    return;
  }
  EDGES.forEach((e, i) => {
    if(!Array.isArray(e) || e.length !== 2){
      mapErr('EDGES[' + i + '] 不是二元数组', tag);
      return;
    }
    if(!NODES[e[0]]) mapErr('EDGES[' + i + '] 引用未定义节点 "' + String(e[0]) + '"', tag);
    if(!NODES[e[1]]) mapErr('EDGES[' + i + '] 引用未定义节点 "' + String(e[1]) + '"', tag);
  });

  /* curScene 合法性 */
  if(!_isStr(curScene)){
    mapErr('curScene 非字符串 ("' + String(curScene) + '")', tag);
  } else if(!NODES[curScene]){
    mapWarn('curScene="' + curScene + '" 未在 NODES 中定义（地图上找不到当前位置）', tag);
  }

  /* 已知缺口提示（game.js 会用到但 NODES 里没有的场景） */
  ['parlor','alley_day','backstreet_day','shop_day','street_day','doorstep_day','house_day'].forEach(k => {
    if(!NODES[k]){
      mapWarn('NODES 缺少场景 "' + k + '"（game.js 可能切到该场景，地图将无法定位）', tag);
    }
  });
}

/* ==================== API ==================== */
function init(){
  canvas = document.getElementById('mapCanvas');
  if(!canvas){
    mapErr('缺少 #mapCanvas 元素', 'init');
    return;
  }
  ctx = canvas.getContext('2d');
  if(!ctx){
    mapErr('#mapCanvas.getContext("2d") 返回空', 'init');
    return;
  }
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  if(!_isNum(dpr) || dpr <= 0){
    mapWarn('devicePixelRatio 非法，回退为 1', 'init');
    dpr = 1;
  }
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', () => { hoverNode = null; });

  document.addEventListener('visibilitychange', function(){
    if(!document.hidden && visible){
      opened = 1;
      targetOpened = 1;
      lastTime = performance.now();
      if(!rafId) rafId = requestAnimationFrame(loop);
    }
  });

  selfCheckMap('init');
}

function open(){
  if(visible) return;
  if(!canvas){
    init();
    if(!canvas){
      mapErr('open: canvas 仍未就绪，无法打开地图', 'open');
      return;
    }
  }
  if(!ctx){
    mapErr('open: ctx 为空，无法渲染地图', 'open');
    return;
  }
  visible = true;
  targetOpened = 1;
  if(!canvas.parentNode){
    mapErr('open: canvas.parentNode 为空', 'open');
    visible = false;
    return;
  }
  canvas.parentNode.classList.add('show');
  lastTime = performance.now();
  if(!rafId) rafId = requestAnimationFrame(loop);

  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(function(){
    if(visible){
      opened = 1;
      targetOpened = 1;
      if(!rafId){
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    }
  }, 1200);
}

function close(){
  if(!visible) return;
  visible = false;
  targetOpened = 0;
  if(canvas && canvas.parentNode){
    canvas.parentNode.classList.remove('show');
  }
  travelAnim = null;
  hoverNode = null;
  clearTimeout(fallbackTimer);
}

function isOpen(){ return visible; }

function setCurrentScene(s){
  if(!_isStr(s)){
    mapErr('setCurrentScene: 参数非法 ("' + String(s) + '")', 'setCurrentScene');
    return;
  }
  if(!NODES[s]){
    mapWarn('setCurrentScene: 场景 "' + s + '" 不在 NODES 中（地图将无法显示当前节点）', 'setCurrentScene');
  }
  curScene = s;
}

function setTravelCallback(cb){
  if(!_isFn(cb)){
    mapErr('setTravelCallback: 传入的不是函数 ("' + typeof cb + '")', 'setTravelCallback');
    return;
  }
  onTravel = cb;
}

function refreshUnlocks(){}

function getNodeScreenRect(key){
  if(!_isStr(key)){
    mapErr('getNodeScreenRect: key 非法 ("' + String(key) + '")', 'getNodeScreenRect');
    return null;
  }
  if(!NODES[key]){
    mapErr('getNodeScreenRect: NODES["' + key + '"] 不存在', 'getNodeScreenRect');
    return null;
  }
  const n = NODES[key];
  if(!_isNum(n.x) || !_isNum(n.y)){
    mapErr('getNodeScreenRect: 节点 "' + key + '" 坐标非法', 'getNodeScreenRect');
    return null;
  }
  const stage = document.getElementById('stage');
  const sr = stage ? stage.getBoundingClientRect() : {
    left: 0, top: 0,
    width: window.innerWidth, height: window.innerHeight
  };
  if(!sr || !_isNum(sr.width) || !_isNum(sr.height) || sr.width === 0 || sr.height === 0){
    mapWarn('getNodeScreenRect: stage 尺寸非法，使用视口回退', 'getNodeScreenRect');
  }
  const sx = sr.width  / W;
  const sy = sr.height / H;
  const cx = sr.left + n.x * W * sx;
  const cy = sr.top  + n.y * H * sy;
  const size = Math.max(48 * Math.min(sx, sy), 44);
  return {
    left:   cx - size / 2,
    top:    cy - size / 2,
    width:  size,
    height: size
  };
}

function getCurrentNodeKey(){
  return curScene;
}

function getAdjacentTargets(){
  const list = NEIGHBORS[curScene];
  if(!Array.isArray(list)){
    mapErr('getAdjacentTargets: NEIGHBORS["' + curScene + '"] 不是数组', 'getAdjacentTargets');
    return [];
  }
  return list.filter(function(k){
    if(!_isFn(UNLOCK[k])){
      mapWarn('getAdjacentTargets: UNLOCK["' + k + '"] 未定义，跳过', 'getAdjacentTargets');
      return false;
    }
    return UNLOCK[k]();
  });
}

global.RaccoonMap = {
  init, open, close, isOpen,
  setCurrentScene, setTravelCallback, refreshUnlocks,
  getNodeScreenRect,
  getCurrentNodeKey,
  getAdjacentTargets
};

})(window);