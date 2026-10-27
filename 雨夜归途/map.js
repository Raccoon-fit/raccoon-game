/* =========================================================
   map.js — 雨痕地图 v7 完整版
   ========================================================= */
(function(global){
'use strict';

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

/* ==================== 节点数据（包含夜晚、白天、棋牌室） ==================== */
const NODES = {
  /* 夜晚 */
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
  neighbor:     { x:0.92, y:0.70, name:'邻屋',    icon:'ruin'    },
  parlor:       { x:0.32, y:0.92, name:'棋牌室',  icon:'can'     },

  /* 白天 */
  alley_day:      { x:0.10, y:0.72, name:'雨巷·早',    icon:'lamp'   },
  backstreet_day: { x:0.32, y:0.72, name:'后巷·早',    icon:'ladder' },
  shop_day:       { x:0.48, y:0.52, name:'便利店·早',  icon:'can'    },
  street_day:     { x:0.62, y:0.68, name:'街道·早',    icon:'traffic'},
  doorstep_day:   { x:0.78, y:0.52, name:'门前·早',    icon:'arch'   },
  house_day:      { x:0.88, y:0.28, name:'红屋顶·早',  icon:'house'  },

  /* 万圣节幻境 */
  halloween_alley:     { x:0.18, y:0.62, name:'南瓜巷',   icon:'pumpkin' },
  halloween_forest:    { x:0.50, y:0.38, name:'糖果林',   icon:'candy'   },
  halloween_graveyard: { x:0.82, y:0.62, name:'南瓜墓园', icon:'grave'   }
};

const EDGES = [
  /* 夜晚 */
  ['alley','backstreet'], ['backstreet','powerstation'], ['backstreet','rooftop'],
  ['backstreet','shop'], ['shop','street'], ['street','underpass'],
  ['street','riverside'], ['street','doorstep'], ['doorstep','house'],
  ['doorstep','neighbor'], ['backstreet','parlor'],
  
  /* 白天 */
  ['alley_day','backstreet_day'], ['backstreet_day','shop_day'],
  ['shop_day','street_day'], ['street_day','doorstep_day'], ['doorstep_day','house_day'],

  /* 万圣节幻境 */
  ['halloween_alley','halloween_forest'], ['halloween_forest','halloween_graveyard']
];

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
    if(!raw) return {};
    var parsed = JSON.parse(raw);
    return _isObj(parsed) ? parsed : {};
  }catch(e){ return {}; }
}
function getFlag(k){
  if(!_isStr(k)) return false;
  const s = readSave();
  return (_isObj(s.flags) && !!s.flags[k]);
}
function hasSeenScene(k){
  if(!_isStr(k)) return false;
  const s = readSave();
  const arr = (_isObj(s.flags) && Array.isArray(s.flags.seenScenes)) ? s.flags.seenScenes : [];
  return arr.indexOf(k) >= 0;
}

let curScene = 'alley';

function isAdjacentToCurrent(key){
  if(!_isStr(key)) return false;
  const nb = NEIGHBORS[curScene];
  return Array.isArray(nb) && nb.indexOf(key) >= 0;
}

const UNLOCK = {
  alley:        () => true,
  backstreet:   () => hasSeenScene('backstreet')   || isAdjacentToCurrent('backstreet'),
  powerstation: () => hasSeenScene('powerstation') || isAdjacentToCurrent('powerstation'),
  rooftop:      () => hasSeenScene('rooftop')      || isAdjacentToCurrent('rooftop'),
  shop:         () => getFlag('doorOpen'),
  street:       () => hasSeenScene('street')       || isAdjacentToCurrent('street'),
  underpass:    () => hasSeenScene('underpass')    || hasSeenScene('street'),
  riverside:    () => hasSeenScene('riverside')    || hasSeenScene('street'),
  doorstep:     () => getFlag('gateOpen'),
  house:        () => getFlag('gateOpen'),
  neighbor:     () => getFlag('gateOpen'),
  parlor:       () => hasSeenScene('parlor')       || isAdjacentToCurrent('parlor'),

  alley_day:      () => getFlag('daySequence'),
  backstreet_day: () => getFlag('daySequence') && hasSeenScene('backstreet_day'),
  shop_day:       () => getFlag('daySequence') && hasSeenScene('shop_day'),
  street_day:     () => getFlag('daySequence') && hasSeenScene('street_day'),
  doorstep_day:   () => getFlag('daySequence') && hasSeenScene('doorstep_day'),
  house_day:      () => getFlag('daySequence') && hasSeenScene('house_day'),

  halloween_alley:     () => getFlag('halloween_mode'),
  halloween_forest:    () => getFlag('halloween_mode') && (hasSeenScene('halloween_forest') || isAdjacentToCurrent('halloween_forest')),
  halloween_graveyard: () => getFlag('halloween_mode') && (hasSeenScene('halloween_graveyard') || isAdjacentToCurrent('halloween_graveyard'))
};

let canvas, ctx, dpr;
let opened = 0, targetOpened = 0;
let visible = false, hoverNode = null;
let travelAnim = null, onTravel = null;
let rafId = 0, lastTime = 0, fallbackTimer = 0;

function px(n){ return n * W; }
function py(n){ return n * H; }
function dist2(ax,ay,bx,by){ const dx=ax-bx,dy=ay-by; return dx*dx+dy*dy; }
function ease(t){ return t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
function clamp(v,a,b){ return v<a?a:v>b?b:v; }

/* ==================== 绘制底层 ==================== */
function isHalloweenMode(){ return /^halloween_/.test(curScene) || getFlag('halloween_mode'); }

function drawHalloweenPaper(t){
  const g = ctx.createRadialGradient(W*.5,H*.46,40,W*.5,H*.46,W*.72);
  g.addColorStop(0,'#3b174f'); g.addColorStop(.58,'#20102f'); g.addColorStop(1,'#0b0712');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(255,124,28,.10)';
  for(let i=0;i<18;i++){ const x=(i*173+51)%W,y=(i*97+33)%H; ctx.beginPath(); ctx.arc(x,y,2+(i%3),0,Math.PI*2); ctx.fill(); }
  ctx.fillStyle='rgba(8,5,12,.55)'; ctx.fillRect(0,H*.78,W,H*.22);
  ctx.font='bold 24px serif'; ctx.textAlign='center'; ctx.fillStyle='rgba(255,145,38,.8)'; ctx.fillText('🎃  万 圣 夜 幻 境  🎃',W/2,55);
  ctx.font='14px sans-serif'; ctx.fillStyle='rgba(205,151,255,.65)'; ctx.fillText('沿着糖纸与墓碑之间的路走',W/2,80);
}

function drawPaper(t){
  if(isHalloweenMode()){ drawHalloweenPaper(t); return; }
  const bg = ctx.createRadialGradient(W*0.55, H*0.45, 80, W*0.55, H*0.45, W*0.75);
  bg.addColorStop(0,   '#3d2c1d');
  bg.addColorStop(0.55,'#2e2015');
  bg.addColorStop(1,   '#1a120c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

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
  ws.addColorStop(0, 'rgba(40,55,70,0.32)');
  ws.addColorStop(0.5, 'rgba(30,42,58,0.14)');
  ws.addColorStop(1, 'rgba(30,42,58,0)');
  ctx.fillStyle = ws; ctx.fillRect(0, H*0.55, W, H*0.45);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, H*0.5); ctx.lineTo(W, H*0.5); ctx.moveTo(W*0.5, 0); ctx.lineTo(W*0.5, H); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,220,170,0.06)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H*0.5+2); ctx.lineTo(W, H*0.5+2); ctx.moveTo(W*0.5+2, 0); ctx.lineTo(W*0.5+2, H); ctx.stroke();
  ctx.restore();

  ctx.save();
  const cj = ctx.createRadialGradient(W-20, 20, 5, W-20, 20, 140);
  cj.addColorStop(0,   'rgba(15,8,4,0.95)');
  cj.addColorStop(0.35,'rgba(30,15,8,0.75)');
  cj.addColorStop(0.7, 'rgba(50,28,15,0.32)');
  cj.addColorStop(1,   'rgba(50,28,15,0)');
  ctx.fillStyle = cj; ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W-140, 0);
  for(let i = 0; i <= 14; i++){
    const tt = i / 14, x = W-140 + tt*140, y = tt < 0.5 ? Math.sin(tt*Math.PI)*18 : Math.sin(tt*Math.PI)*18 + Math.random()*4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, 140); ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.font = 'italic 22px "KaiTi","STKaiti",serif'; ctx.fillStyle = 'rgba(80,50,30,0.55)';
  ctx.textAlign = 'right'; ctx.fillText('回家。', W-48, 56);
  ctx.restore();
}

function drawEdge(a, b, t, highlight, waterProgress){
  const A = NODES[a], B = NODES[b];
  if(!_isObj(A) || !_isObj(B)) return;
  const ax = px(A.x), ay = py(A.y), bx = px(B.x), by = py(B.y);
  const midX = (ax + bx) / 2, midY = (ay + by) / 2;
  const nx = -(by - ay), ny = (bx - ax);
  const nl = Math.hypot(nx, ny) || 1;
  const wobbleAmp = 14 + ((a.charCodeAt(0) * 3 + b.charCodeAt(0) * 7) % 10);
  const cx1 = midX + (nx/nl) * wobbleAmp, cy1 = midY + (ny/nl) * wobbleAmp;
  const cx2 = midX - (nx/nl) * wobbleAmp * 0.7, cy2 = midY - (ny/nl) * wobbleAmp * 0.7;

  ctx.save();
  ctx.lineCap = 'round'; ctx.lineWidth = 3.5;
  ctx.strokeStyle = highlight ? 'rgba(200,160,100,0.32)' : 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.bezierCurveTo(cx1, cy1, cx2, cy2, bx, by); ctx.stroke();
  ctx.restore();

  if(highlight){
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineWidth = 1.8;
    const hg = ctx.createLinearGradient(ax, ay, bx, by);
    hg.addColorStop(0, 'rgba(255,214,140,0.7)'); hg.addColorStop(1, 'rgba(255,214,140,0.25)');
    ctx.strokeStyle = hg;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.bezierCurveTo(cx1, cy1, cx2, cy2, bx, by); ctx.stroke();
    ctx.restore();
  }

  if(waterProgress > 0){
    const seed = a + b, steps = 32, N = Math.max(1, Math.floor(steps * waterProgress)), pts = [];
    for(let i = 0; i <= N; i++){
      const t2 = (i / steps), it = 1 - t2;
      const x = it*it*it*ax + 3*it*it*t2*cx1 + 3*it*t2*t2*cx2 + t2*t2*t2*bx;
      const y = it*it*it*ay + 3*it*it*t2*cy1 + 3*it*t2*t2*cy2 + t2*t2*t2*by;
      const jitter = Math.sin(t2 * 21 + seed.charCodeAt(0)) * 2.5 + Math.sin(t2 * 37 + seed.charCodeAt(1)) * 1.5;
      pts.push([x + jitter, y + Math.cos(t2*29 + seed.charCodeAt(0))*2]);
    }
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(80,110,130,0.62)'; ctx.lineWidth = 5;
    ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])); ctx.stroke();
    ctx.strokeStyle = 'rgba(180,210,230,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p[0], p[1] - 1.5) : ctx.lineTo(p[0], p[1] - 1.5)); ctx.stroke();
    ctx.restore();
  }
}

function stroke(color, width){
  ctx.strokeStyle = color || '#2a1a10';
  ctx.lineWidth = width || 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

const ICONS = {
  lamp(){ stroke(); ctx.beginPath(); ctx.moveTo(-8, 14); ctx.lineTo(8, 14); ctx.moveTo(-5, 14); ctx.lineTo(-3, 8); ctx.moveTo(5, 14); ctx.lineTo(3, 8); ctx.moveTo(0, 8); ctx.lineTo(0, -6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(9, -6); ctx.lineTo(5, -14); ctx.lineTo(-5, -14); ctx.closePath(); ctx.stroke(); ctx.fillStyle = 'rgba(255,220,150,0.9)'; ctx.beginPath(); ctx.arc(0, -3, 2, 0, Math.PI*2); ctx.fill(); },
  ladder(){ stroke(); ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(-8, 14); ctx.moveTo(8, -14);  ctx.lineTo(8, 14); ctx.stroke(); ctx.beginPath(); ctx.arc(-6, -14, 3, Math.PI, 0); ctx.stroke(); for(let i = -1; i <= 1; i++){ const y = i * 8; ctx.beginPath(); ctx.moveTo(-8, y); ctx.lineTo(8, y); ctx.stroke(); } },
  bolt(){ stroke(); ctx.beginPath(); ctx.moveTo(-3, -14); ctx.lineTo(4, -3); ctx.lineTo(-1, -3); ctx.lineTo(4, 14); ctx.lineTo(-4, 2); ctx.lineTo(1, 2); ctx.closePath(); ctx.stroke(); ctx.fillStyle = 'rgba(255,220,150,0.22)'; ctx.fill(); },
  tower(){ stroke(); ctx.beginPath(); ctx.moveTo(-9, 14); ctx.lineTo(-6, 4); ctx.moveTo(9, 14);  ctx.lineTo(6, 4); ctx.moveTo(-6, 4);  ctx.lineTo(6, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(-10, -8); ctx.lineTo(10, -8); ctx.lineTo(10, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(0, -16); ctx.lineTo(12, -8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke(); },
  can(){ stroke(); ctx.beginPath(); ctx.ellipse(0, -12, 8, 3, 0, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-8, 12); ctx.moveTo(8, -12);  ctx.lineTo(8, 12); ctx.ellipse(0, 12, 8, 3, 0, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(8, -3); ctx.moveTo(-8, 5);  ctx.lineTo(8, 5); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -14, 2.5, 0, Math.PI*2); ctx.stroke(); },
  traffic(){ stroke(); ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, -6); ctx.stroke(); ctx.beginPath(); ctx.rect(-6, -16, 12, 14); ctx.stroke(); ctx.fillStyle = 'rgba(255,80,80,0.85)'; ctx.beginPath(); ctx.arc(0, -13, 1.6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = 'rgba(255,220,90,0.4)'; ctx.beginPath(); ctx.arc(0, -9, 1.6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = 'rgba(120,255,140,0.4)'; ctx.beginPath(); ctx.arc(0, -5, 1.6, 0, Math.PI*2); ctx.fill(); },
  stairs(){ stroke(); ctx.beginPath(); ctx.moveTo(-12, 10); ctx.lineTo(-12, -2); ctx.arc(0, -2, 12, Math.PI, 0); ctx.lineTo(12, 10); ctx.stroke(); for(let i = 0; i < 3; i++){ const w = 10 - i * 2; const y = 4 + i * 3; ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.stroke(); } ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.moveTo(-9, 8); ctx.arc(0, -2, 9, Math.PI, 0); ctx.lineTo(9, 8); ctx.closePath(); ctx.fill(); },
  wave(){ stroke(); for(let k = 0; k < 3; k++){ const y = -6 + k * 6; ctx.beginPath(); for(let i = 0; i <= 20; i++){ const x = -14 + i * 1.4; const wy = y + Math.sin(i * 0.8 + k * 1.3) * 2; if(i === 0) ctx.moveTo(x, wy); else ctx.lineTo(x, wy); } ctx.stroke(); } },
  arch(){ stroke(); ctx.beginPath(); ctx.moveTo(-10, 14); ctx.lineTo(-10, -2); ctx.arc(0, -2, 10, Math.PI, 0); ctx.lineTo(10, 14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-7, 14); ctx.lineTo(-7, -2); ctx.arc(0, -2, 7, Math.PI, 0); ctx.lineTo(7, 14); ctx.stroke(); ctx.fillStyle = 'rgba(200,160,80,0.8)'; ctx.beginPath(); ctx.arc(4, 6, 1.5, 0, Math.PI*2); ctx.fill(); },
  house(){ stroke(); ctx.beginPath(); ctx.moveTo(-11, 4); ctx.lineTo(-11, 14); ctx.lineTo(11, 14); ctx.lineTo(11, 4); ctx.stroke(); ctx.fillStyle = 'rgba(170,60,40,0.85)'; ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(0, -14); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill(); stroke('rgba(120,35,25,0.9)', 1.4); ctx.stroke(); ctx.fillStyle = 'rgba(80,45,25,0.9)'; ctx.fillRect(-3, 6, 6, 8); ctx.fillStyle = 'rgba(255,220,140,0.9)'; ctx.fillRect(-9, 8, 4, 4); ctx.fillRect(5, 8, 4, 4); },
  pumpkin(){ stroke('#ff9a31',2); ctx.fillStyle='rgba(255,112,20,.72)'; ctx.beginPath(); ctx.ellipse(0,2,14,12,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.fillStyle='#ffe06d'; ctx.beginPath(); ctx.moveTo(-7,0);ctx.lineTo(-3,-4);ctx.lineTo(0,1);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(3,-4);ctx.lineTo(0,1);ctx.closePath();ctx.fill();ctx.fillRect(-5,6,10,2); ctx.fillStyle='#6b8d35';ctx.fillRect(-2,-13,4,5); },
  candy(){ stroke('#b76cff',2); ctx.fillStyle='rgba(255,107,190,.75)'; ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-16,-6);ctx.lineTo(-15,7);ctx.closePath();ctx.moveTo(8,0);ctx.lineTo(16,-6);ctx.lineTo(15,7);ctx.closePath();ctx.fill();ctx.stroke(); },
  grave(){ stroke('#9c78bd',2); ctx.fillStyle='rgba(72,48,84,.9)';ctx.beginPath();ctx.moveTo(-11,14);ctx.lineTo(-9,-5);ctx.arc(0,-5,9,Math.PI,0);ctx.lineTo(11,14);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(0,7);ctx.moveTo(-5,-2);ctx.lineTo(5,-2);ctx.stroke(); },
  ruin(){ stroke(); ctx.beginPath(); ctx.moveTo(-12, 6); ctx.lineTo(-6, -10); ctx.lineTo(0, 6); ctx.lineTo(0, 14); ctx.lineTo(-12, 14); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(4, 4); ctx.lineTo(6, 10); ctx.lineTo(4, 14); ctx.lineTo(0, 14); ctx.stroke(); ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(12, -6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(-4, 8); ctx.lineTo(-4, 12); ctx.stroke(); }
};

function drawNode(key, t){
  const n = NODES[key];
  if(!_isObj(n) || !_isNum(n.x) || !_isNum(n.y)) return;
  if(!_isFn(UNLOCK[key])){ mapErr('UNLOCK["' + key + '"] 未定义', 'drawNode'); return; }

  const x = px(n.x), y = py(n.y);
  const unlocked = UNLOCK[key]();
  const isCurrent = key === curScene;
  const isSeen = hasSeenScene(key);
  const isHover = key === hoverNode && unlocked;

  ctx.save(); ctx.translate(x, y);

  if(isCurrent){
    const waveR = 26 + Math.sin(t * 2) * 6;
    for(let k = 0; k < 2; k++){
      const r = waveR + k * 10, a = 0.35 * (1 - k * 0.4);
      ctx.strokeStyle = isHalloweenMode() ? `rgba(255,132,32,${a})` : `rgba(140,200,230,${a})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI*2); ctx.stroke();
    }
  }

  if(isHover){
    const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, 36);
    hg.addColorStop(0, 'rgba(255,214,140,0.28)'); hg.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI*2); ctx.fill();
  }

  if(unlocked && !isCurrent && isSeen){
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
    g.addColorStop(0, 'rgba(255,200,120,0.14)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI*2); ctx.fill();
  }

  const iconFn = ICONS[n.icon];
  if(_isFn(iconFn)) iconFn();
  else {
    stroke('#7a6a55', 1.8);
    ctx.beginPath(); ctx.arc(0, -2, 8, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#7a6a55'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, -2);
  }

  if(!unlocked){
    ctx.fillStyle = 'rgba(45,62,78,0.55)'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
  }

  if(unlocked && isSeen && !isCurrent){
    ctx.fillStyle = 'rgba(60,40,25,0.5)'; ctx.beginPath(); ctx.ellipse(0, 17, 7, 2, 0, 0, Math.PI*2); ctx.fill();
  }

  ctx.font = '13px "PingFang SC","Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = unlocked ? 'rgba(220,190,140,0.85)' : 'rgba(140,155,170,0.55)';
  ctx.fillText(n.name || key, 0, 30);

  if(!unlocked){
    ctx.font = '10px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = 'rgba(140,155,170,0.45)';
    ctx.fillText('（路还没通）', 0, 44);
  }
  ctx.restore();
}

/* ==================== 动画与路径 ==================== */
function startTravel(fromKey, toKey, path){
  if(!_isStr(fromKey) || !_isStr(toKey) || !Array.isArray(path) || path.length === 0) return;
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
    const ekey = path[i-1] + '_' + k;
    travelAnim.edgeProgress[ekey] = 0;
  });
}

function findPath(from, to){
  if(!_isObj(NODES[from]) || !_isObj(NODES[to]) || from === to) return null;
  const visited = { [from]: true };
  const queue = [[from]];
  while(queue.length){
    const cur = queue.shift();
    const last = cur[cur.length - 1];
    const nbList = NEIGHBORS[last] || [];
    for(const nb of nbList){
      if(!_isFn(UNLOCK[nb]) || !UNLOCK[nb]()) continue;
      if(visited[nb]) continue;
      const next = cur.concat([nb]);
      if(nb === to) return next;
      visited[nb] = true;
      queue.push(next);
    }
  }
  return null;
}

function updateOpenAnim(dt){
  const speed = 3.5;
  if(opened < targetOpened) opened = Math.min(targetOpened, opened + dt * speed);
  else if(opened > targetOpened) opened = Math.max(targetOpened, opened - dt * speed);
}

/* ==================== 渲染与循环 ==================== */
function render(t){
  const eo = ease(opened); if(eo <= 0.001) return;
  ctx.clearRect(0, 0, W, H); ctx.save();

  const originX = W - 155, originY = 41;
  const fullRadius = Math.hypot(Math.max(originX, W-originX), Math.max(originY, H-originY)) * 1.1;
  const radius = fullRadius * eo;

  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  ctx.save(); ctx.beginPath(); ctx.arc(originX, originY, radius, 0, Math.PI * 2); ctx.clip();

  drawPaper(t);

  const isDayMode = getFlag('daySequence');
  const halloweenMode = isHalloweenMode();
  const visibleNodes = Object.keys(NODES).filter(k => {
    const isHalloweenNode = k.indexOf('halloween_') === 0;
    const isDayNode = k.endsWith('_day');
    if(halloweenMode) return isHalloweenNode;
    if(isHalloweenNode) return false;
    return isDayMode ? isDayNode : !isDayNode;
  });

  // ★ 恢复：绘制当前模式下所有的连线
  EDGES.forEach(e => {
    const eIsHalloween = e[0].indexOf('halloween_') === 0;
    const eIsDay = e[0].endsWith('_day');
    if(halloweenMode ? !eIsHalloween : (eIsHalloween || eIsDay !== isDayMode)) return;
    
    const fromIsCurrent = e[0] === curScene || e[1] === curScene;
    let wp = 0;
    if(travelAnim){
      const key1 = e[0] + '_' + e[1], key2 = e[1] + '_' + e[0];
      if(travelAnim.edgeProgress[key1] !== undefined) wp = travelAnim.edgeProgress[key1];
      else if(travelAnim.edgeProgress[key2] !== undefined) wp = travelAnim.edgeProgress[key2];
    }
    drawEdge(e[0], e[1], t, fromIsCurrent, wp * eo);
  });

  visibleNodes.forEach((key, i) => {
    const appearAt = 0.4 + (i / visibleNodes.length) * 0.5;
    if(eo < appearAt) return;
    const localA = Math.min(1, (eo - appearAt) / 0.1);
    ctx.save(); ctx.globalAlpha = localA; drawNode(key, t); ctx.restore();
  });

  if(travelAnim && travelAnim.paw && travelAnim.paw.life > 0){
    const n = NODES[travelAnim.paw.node];
    if(_isObj(n)){
      const x = px(n.x), y = py(n.y);
      ctx.save(); ctx.globalAlpha = Math.min(1, travelAnim.paw.life * 2); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(60,90,110,0.75)';
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI*2); ctx.fill();
      for(let i = 0; i < 3; i++){
        const a = -0.6 + i * 0.6;
        ctx.beginPath(); ctx.arc(Math.cos(a-1.57)*10, Math.sin(a-1.57)*10 - 4, 2.5, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  }

  ctx.restore();

  const vg = ctx.createRadialGradient(W/2, H/2, H*0.35, W/2, H/2, H*1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.75, 'rgba(0,0,0,0.28)'); vg.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  ctx.restore();
}

function update(dt, t){
  updateOpenAnim(dt);
  if(!travelAnim) return;

  const el = t - travelAnim.start;
  const dur = travelAnim.duration;
  const k = clamp(el / dur, 0, 1);

  if(travelAnim.mode === 'spread'){
    const edgeKeys = Object.keys(travelAnim.edgeProgress);
    const total = edgeKeys.length;
    edgeKeys.forEach((ek, i) => {
      const start = i / total, end = (i + 1) / total;
      travelAnim.edgeProgress[ek] = clamp((k - start) / (end - start), 0, 1);
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
        travelAnim.edgeProgress[ek] = Math.max(1 - localShrink, 0);
      });
    }
  }

  if(k >= 1 && !travelAnim.paw) travelAnim.paw = { node: travelAnim.toKey, life: 1.0 };
  if(travelAnim.paw){
    travelAnim.paw.life -= dt * 0.7;
    if(travelAnim.paw.life <= 0){
      const to = travelAnim.toKey;
      travelAnim = null;
      if(_isFn(onTravel)) onTravel(to);
    }
  }
}

function loop(now){
  if(!visible && opened <= 0.001){ rafId = 0; return; }
  if(now - lastTime > 1000) lastTime = now - 50;
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt, now / 1000);
  render(now / 1000);
  rafId = requestAnimationFrame(loop);
}

/* ==================== 交互与自检 ==================== */
function findNodeAt(mx, my){
  let best = null, bestD = 40 * 40;
  const isDayMode = getFlag('daySequence');
  const halloweenMode = isHalloweenMode();
  Object.keys(NODES).forEach(k => {
    const isHalloweenNode = k.indexOf('halloween_') === 0;
    if(halloweenMode ? !isHalloweenNode : (isHalloweenNode || isDayMode !== k.endsWith('_day'))) return;
    const n = NODES[k];
    if(!_isObj(n) || !_isNum(n.x) || !_isNum(n.y)) return;
    const x = px(n.x), y = py(n.y);
    const d = dist2(mx, my, x, y);
    if(d < bestD){ bestD = d; best = k; }
  });
  return best;
}

function onClick(e){
  if(opened < 0.5 || travelAnim || !canvas) return;
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (W / r.width);
  const my = (e.clientY - r.top) * (H / r.height);
  const k = findNodeAt(mx, my);
  if(!k || !_isFn(UNLOCK[k]) || !UNLOCK[k]() || k === curScene) return;
  const path = findPath(curScene, k);
  if(!path) return;
  startTravel(curScene, k, path);
}

function onMove(e){
  if(opened < 0.5 || travelAnim || !canvas){ hoverNode = null; return; }
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (W / r.width);
  const my = (e.clientY - r.top) * (H / r.height);
  hoverNode = findNodeAt(mx, my);
}

function selfCheckMap(stage){
  const tag = 'selfCheck:' + (stage || '?');
  const isDayMode = getFlag('daySequence');
  const halloweenMode = isHalloweenMode();
  Object.keys(NODES).forEach(k => {
    const isHalloweenNode = k.indexOf('halloween_') === 0;
    if(halloweenMode ? !isHalloweenNode : (isHalloweenNode || isDayMode !== k.endsWith('_day'))) return;
    if(!_isFn(UNLOCK[k])) mapErr('UNLOCK["' + k + '"] 未定义', tag);
  });
}

function init(){
  canvas = document.getElementById('mapCanvas'); if(!canvas) return;
  ctx = canvas.getContext('2d'); if(!ctx) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', () => { hoverNode = null; });
}

function open(){
  if(visible) return;
  if(!canvas){ init(); if(!canvas) return; }
  if(!ctx) return;
  visible = true; targetOpened = 1;
  if(canvas.parentNode) canvas.parentNode.classList.add('show');
  lastTime = performance.now();
  if(!rafId) rafId = requestAnimationFrame(loop);
  selfCheckMap('open');
  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(function(){
    if(visible){ opened = 1; targetOpened = 1; if(!rafId){ lastTime = performance.now(); rafId = requestAnimationFrame(loop); } }
  }, 1200);
}

function close(){
  if(!visible) return;
  visible = false; targetOpened = 0;
  if(canvas && canvas.parentNode) canvas.parentNode.classList.remove('show');
  travelAnim = null; hoverNode = null; clearTimeout(fallbackTimer);
}

function isOpen(){ return visible; }

function setCurrentScene(s){
  if(!_isStr(s)) return;
  curScene = s;
}

function setTravelCallback(cb){
  if(_isFn(cb)) onTravel = cb;
}

/* ★ 恢复节点屏幕坐标计算（新手教程需要） */
function getNodeScreenRect(key){
  if(!_isStr(key)) return null;
  if(!NODES[key]) return null;
  const n = NODES[key];
  if(!_isNum(n.x) || !_isNum(n.y)) return null;
  const stage = document.getElementById('stage');
  const sr = stage ? stage.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const sx = sr.width  / W;
  const sy = sr.height / H;
  const cx = sr.left + n.x * W * sx;
  const cy = sr.top  + n.y * H * sy;
  const size = Math.max(48 * Math.min(sx, sy), 44);
  return { left: cx - size / 2, top: cy - size / 2, width: size, height: size };
}

global.RaccoonMap = {
  init, open, close, isOpen,
  setCurrentScene, setTravelCallback,
  getNodeScreenRect,
  getCurrentNodeKey: function(){ return curScene; },
  getAdjacentTargets: function(){ return []; }
};

})(window);