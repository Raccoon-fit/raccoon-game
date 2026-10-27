/* =========================================================
   tutorial.js — 雨夜归途 · 新手教程
   ------------------------------------------------------------
   首次进入游戏自动弹出：先选身份（普通玩家 / 主播），再按身份
   走各自的引导路径。

   主播分支比普通玩家多一段「设置 → 主播模式 → 开」的开启引导，
   并附带直播场景下的 HUD 说明（紧凑背包 / 临时点亮全局 / 主播徽章）。

   依赖：#stage（960×540 坐标系）、#settings、#btnSet、#btnMap、
        #btnTempLight、.opts[data-key="streamerMode"]
   ========================================================= */
(function(){
'use strict';

var TUT_KEY     = 'raccoon_tutorial_v1';
var STAGE_W     = 960;
var STAGE_H     = 540;
var CARD_W      = 344;
var CARD_GAP    = 16;
var EDGE        = 14;

/* ---------------- DOM ---------------- */
var root, spot, ring, card, pickBox;
var eStep, eTitle, eBody, eNote, eTag, ePrev, eNext, eSkip, eExtra;
var stage, setPanel, sceneFrame;

var steps = [], idx = 0, running = false, role = 'player';
var settingsOpenedByUs = false;
var boundEl = null, boundFn = null, boundTimer = null;
var autoStarted = false;

/* ---------------- 工具 ---------------- */
function E(id){ return document.getElementById(id); }
function devErr(m){ try{ if(window.__DEV_ERROR__) window.__DEV_ERROR__(m,'tutorial.js'); else console.error('[TUT_ERR]', m); }catch(e){} }
function devWarn(m){ try{ if(window.__DEV_WARN__) window.__DEV_WARN__(m,'tutorial.js'); else console.warn('[TUT_WARN]', m); }catch(e){} }

/* ---------------- 持久化 ---------------- */
function loadTut(){
  try{
    var d = JSON.parse(localStorage.getItem(TUT_KEY) || '{}');
    return (d && typeof d === 'object') ? d : {};
  }catch(e){ return {}; }
}
function saveTut(patch){
  var d = loadTut();
  for(var k in patch) d[k] = patch[k];
  try{ localStorage.setItem(TUT_KEY, JSON.stringify(d)); }catch(e){ devWarn('saveTut 写入失败: ' + e.message); }
}

/* ---------------- 富文本（沿用游戏内的 ** / {{ }} 标记） ---------------- */
function richToHtml(text){
  var toks = [];
  function stash(html){ toks.push(html); return '\u0001' + (toks.length - 1) + '\u0001'; }
  var s = String(text == null ? '' : text)
    .replace(/\*\*(.+?)\*\*/g, function(_, m){ return stash('<b>' + m + '</b>'); })
    .replace(/\{\{(.+?)\}\}/g, function(_, m){ return stash('<span class="g">' + m + '</span>'); })
    .replace(/<<(.+?)>>/g, function(_, m){ return stash('<span class="r">' + m + '</span>'); });
  s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  s = s.replace(/\u0001(\d+)\u0001/g, function(_, n){ return toks[+n] || ''; });
  return s.replace(/\n/g, '<br>');
}

/* =========================================================
   步骤内容
   ========================================================= */
var RECT_DLG = { x:82,  y:390, w:796, h:120 };
var RECT_INV = { x:14,  y:10,  w:180, h:66 };

var STEPS_PLAYER = [
{
  id:'p-start',
  title:'跟着灰豆走',
  body:
'灰豆是一只浣熊。它在雨里走丢了一夜，只想回到那栋**红屋顶**的房子。\n\n' +
'这个游戏没有任务列表，也没有战斗——**看到能点的东西，就去点它**。\n\n' +
'雨巷里有**垃圾桶**、**路灯**、**墙上的粉笔字**。先随便点点看。',
  cardPos:'center'
},{
  id:'p-dlg',
  title:'让故事继续',
  body:
'点**对话框**（或者屏幕下方的空白处），故事就会往下走。\n\n' +
'文字是慢慢浮现的——**点一下会立刻显示完整的一句**，再点一下才换下一句。\n\n' +
'想快一点？去设置里把「文字速度」调成「快」或「瞬显」。',
  rect:RECT_DLG
},
{
  id:'p-inv',
  title:'灰豆的背包',
  body:
'左上角是灰豆的**背包**。\n\n' +
'捡到的东西会出现在这里，**点一下能看它的说明**。\n\n' +
'（现在是空的——灰豆还什么都没捡到。）\n\n' +
'等到拿到电池，**手电筒**可以直接在这里开 / 关。',
  rect:RECT_INV
},
{
  id:'p-map',
  title:'地图：想去哪就去哪',
  body:
'右上角这张小地图，可以让你**直接去别的场景**。\n\n' +
'走错了、想回某个地方再看看，从这里选就行。地图上你现在的位置会一直亮着。',
  target:'#btnMap'
},
{
  id:'p-set',
  title:'设置：调成你舒服的样子',
  body:
'**齿轮图标**里可以调整**帧率**、**文字速度**、**文字大小**。\n\n' +
'字太小就调大，一句话跳得太快就调慢。\n\n' +
'同一个面板里还能**重新看一遍这个教程**。',
  target:'#btnSet'
},
{
  id:'p-end',
  title:'好了，去吧',
  body:
'进度会**自动保存**。随时可以从标题画面「继续存档」回来。\n\n' +
'雨还在下。灰豆还在等。\n\n' +
'祝你好运。',
  cardPos:'center'
}
];

var STEPS_STREAMER = [
{
  id:'s-intro',
  title:'直播模式',
  body:
'你是来直播的。\n\n' +
'《雨夜归途》的画面很暗，剧情又长——观众很容易不知道你现在在干什么。\n\n' +
'**主播模式**就是为直播准备的：把 HUD 换成观众一眼能看懂的样式。\n\n' +
'下面带你开一遍。',
  cardPos:'center'
},
{
  id:'s-open-set',
  title:'第一步 · 打开设置',
  body:
'点右上角的**齿轮**，打开设置面板。\n\n' +
'「主播模式」就在里面。\n\n' +
'（懒得找？点下面那个按钮也行。）',
  target:'#btnSet',
  advanceOnTarget:true,
  action:{ label:'帮我打开设置', fn:function(){ openSettings(true); } }
},
{
  id:'s-switch',
  title:'第二步 · 把主播模式切到「开」',
  body:
'在设置里找到**主播模式**这一行，把开关切到 **开**。\n\n' +
'懒得动手？点下面的**立即开启**，或者直接按「下一步」——我们会帮你打开。',
  target:'.opts[data-key="streamerMode"]',
  needSettings:true,
  action:{ label:'立即开启主播模式', advanceAfter:760, fn:function(){ setStreamerMode(true); } },
  verify:function(){ return getStreamerMode() === 'on'; }
},
{
  id:'s-after',
  title:'开启之后 · 画面变成这样',
  body:
'• **左上角的背包**收窄成一排，名字写在图标旁边\n' +
'• **右下角**多出一个「✨」——一键点亮整个画面（鼠标停在上面有名字）\n' +
'• **左下角**出现绿色的**主播模式：开**徽章，和一行**粉丝团**提示\n\n' +
'（随开关一起出现 / 消失。）',
  target:'#btnTempLight',
  ensureStreamer:true,
  closeSettings:true,
  cardPos:'center',
  action:{ label:'再看一遍怎么开', fn:function(){ jumpTo('s-open-set'); } }
},
{
  id:'s-dlg',
  title:'让观众跟上剧情',
  body:
'剧情是一句一句慢慢浮现的。直播时别让观众干等打字——去设置里把**文字速度**调到「快」或「瞬显」。\n\n' +
'还可以在设置里点 **🔍 高亮可交互**，让观众一眼知道该看哪里。',
  rect:RECT_DLG
},
{
  id:'s-inv',
  title:'背包：给观众看清楚',
  body:
'普通模式下背包是一排方块，得点开才知道是什么。\n\n' +
'**主播模式**下它会收窄成一排小条，**名字直接写在图标旁边**——观众一眼就看得见灰豆手里有什么。',
  rect:RECT_INV
},
{
  id:'s-map',
  title:'地图：让观众知道你在哪',
  body:
'右上角这张小地图，点开就能**直接去别的场景**。\n\n' +
'直播时观众最容易迷路，**开一次地图给他们看看你在哪儿**，比解释管用。',
  target:'#btnMap'
},
{
  id:'s-set',
  title:'开播前的最后检查',
  body:
'在**齿轮**里确认这几项：\n\n' +
'• **文字速度** → 「快」或「瞬显」\n' +
'• **文字大小** → 按你的直播窗口调\n' +
'• **主播模式** → 保持「开」\n\n' +
'同一个面板里可以**重新看一遍这个教程**。',
  target:'#btnSet'
},
{
  id:'s-end',
  title:'可以开播了',
  body:
'再补两句：\n\n' +
'• 进度**自动保存**，中途下播不会丢\n' +
'• 万圣节那几天会出现**南瓜灯**，可以点进去走一段支线\n\n' +
'雨还在下。别忘了开麦。',
  cardPos:'center'
}
];

/* =========================================================
   主播模式读写（走设置面板里那组 .opts，逻辑与设置面板一致）
   ========================================================= */
function getStreamerMode(){
  var on = document.querySelector('.opts[data-key="streamerMode"] button.on');
  return on ? on.dataset.v : 'off';
}
function setStreamerMode(on){
  var want = on ? 'on' : 'off';
  if(getStreamerMode() === want) return true;
  var btn = document.querySelector('.opts[data-key="streamerMode"] button[data-v="' + want + '"]');
  if(!btn){ devWarn('setStreamerMode: 找不到主播模式开关'); return false; }
  btn.click();
  return getStreamerMode() === want;
}

/* ---------------- 设置面板 ---------------- */
function openSettings(byUs){
  if(!setPanel) return;
  setPanel.classList.add('show');
  if(byUs) settingsOpenedByUs = true;
}
function closeSettings(){
  if(!setPanel) return;
  setPanel.classList.remove('show');
  settingsOpenedByUs = false;
}

/* ---------------- 场景 iframe 交互锁定 ---------------- */
function setSceneInteractive(on){
  try{
    var f = document.getElementById('gameFrame');
    if(f) f.style.pointerEvents = on ? '' : 'none';
  }catch(e){}
}

/* =========================================================
   聚光灯 / 卡片定位
   ========================================================= */
function stageScale(){
  try{
    if(!stage) return 1;
    var w = stage.getBoundingClientRect().width;
    return (w > 0) ? (w / STAGE_W) : 1;
  }catch(e){ return 1; }
}

function resolveHole(s){
  var scale = stageScale();
  if(s.target){
    try{
      var el = document.querySelector(s.target);
      if(el){
        var r = el.getBoundingClientRect();
        if(r.width > 4 && r.height > 4){
          var sr = stage.getBoundingClientRect();
          return {
            x:(r.left - sr.left) / scale,
            y:(r.top  - sr.top)  / scale,
            w:r.width  / scale,
            h:r.height / scale
          };
        }
      }
    }catch(e){ devWarn('resolveHole: ' + e.message); }
  }
  if(s.rect) return { x:s.rect.x, y:s.rect.y, w:s.rect.w, h:s.rect.h };
  return null;
}

function updateSpot(hole){
  if(!spot) return;
  if(!hole){ spot.style.opacity = '0'; return; }
  spot.style.opacity = '1';
  spot.style.left   = hole.x + 'px';
  spot.style.top    = hole.y + 'px';
  spot.style.width  = hole.w + 'px';
  spot.style.height = hole.h + 'px';
  spot.style.borderRadius = Math.min(16, Math.max(8, hole.h / 2)) + 'px';
}

function overlapArea(a, b){
  var w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  var h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if(w <= 0 || h <= 0) return 0;
  return w * h;
}

function placeCard(hole, s){
  if(!card) return;
  var ch = card.offsetHeight || 210;
  var cands = [];
  function push(x, y){ cands.push({ x:x, y:y }); }

  /* 1) 步骤指定的位置优先 */
  if(s && s.cardPos === 'center')        push((STAGE_W - CARD_W) / 2, (STAGE_H - ch) / 2);
  else if(s && s.cardPos === 'bottom-left')  push(EDGE, STAGE_H - ch - EDGE);
  else if(s && s.cardPos === 'bottom-right') push(STAGE_W - CARD_W - EDGE, STAGE_H - ch - EDGE);

  /* 2) 围绕聚光灯 */
  if(hole){
    var cx = hole.x + hole.w / 2, cy = hole.y + hole.h / 2;
    var L = { x:hole.x - CARD_W - CARD_GAP,  y:cy - ch / 2 };
    var R = { x:hole.x + hole.w + CARD_GAP, y:cy - ch / 2 };
    var A = { x:cx - CARD_W / 2,            y:hole.y - ch - CARD_GAP };
    var B = { x:cx - CARD_W / 2,            y:hole.y + hole.h + CARD_GAP };
    if(cx > STAGE_W * 0.52)      cands = cands.concat([L, B, A, R]);
    else if(cx < STAGE_W * 0.48) cands = cands.concat([R, B, A, L]);
    else                         cands = cands.concat([B, A, L, R]);
  }

  /* 3) 角落与居中兜底 */
  push(EDGE, EDGE);
  push(STAGE_W - CARD_W - EDGE, EDGE);
  push(EDGE, STAGE_H - ch - EDGE);
  push(STAGE_W - CARD_W - EDGE, STAGE_H - ch - EDGE);
  push((STAGE_W - CARD_W) / 2, (STAGE_H - ch) / 2);

  var best = null, bestScore = Infinity;
  for(var i=0;i<cands.length;i++){
    var c = cands[i];
    var clamped = {
      x: Math.max(EDGE, Math.min(STAGE_W - CARD_W - EDGE, c.x)),
      y: Math.max(EDGE, Math.min(STAGE_H - ch - EDGE, c.y)),
      w: CARD_W, h: ch
    };
    if(clamped.x !== c.x || clamped.y !== c.y) continue;   /* 放不下，跳过 */
    var score = hole ? overlapArea(clamped, hole) : 0;
    if(score < bestScore){
      bestScore = score; best = clamped;
      if(score === 0) break;
    }
  }
  if(!best) best = { x:EDGE, y:EDGE, w:CARD_W, h:ch };

  card.style.left = best.x + 'px';
  card.style.top  = best.y + 'px';
}

/* =========================================================
   步骤渲染
   ========================================================= */
function unbindTarget(){
  if(boundTimer){ clearTimeout(boundTimer); boundTimer = null; }
  if(boundEl && boundFn){
    try{ boundEl.removeEventListener('click', boundFn, true); }catch(e){}
  }
  boundEl = null; boundFn = null;
}

function bindTarget(s){
  unbindTarget();
  if(!s || !s.target || !s.advanceOnTarget) return;
  var el = null;
  try{ el = document.querySelector(s.target); }catch(e){}
  if(!el) return;
  boundEl = el;
  boundFn = function(e){
    e.stopPropagation();
    if(boundTimer) return;
    var ok = true;
    if(s.verify){
      setTimeout(function(){
        ok = s.verify();
        if(ok) next();
        else showNote('还没打开哦——把开关切到「开」。');
      }, 260);
      return;
    }
    boundTimer = setTimeout(function(){ boundTimer = null; next(); }, 420);
  };
  el.addEventListener('click', boundFn, true);
}

function showNote(text){
  if(!eNote) return;
  eNote.textContent = text || '';
  eNote.style.display = text ? 'block' : 'none';
}

function renderAction(s){
  if(!eExtra) return;
  eExtra.innerHTML = '';
  if(!s || !s.action) { eExtra.style.display = 'none'; return; }
  eExtra.style.display = 'block';
  var b = document.createElement('button');
  b.className = 'tut-act';
  b.textContent = s.action.label;
  b.addEventListener('click', function(e){
    e.stopPropagation();
    try{ if(s.action.fn) s.action.fn(); }catch(err){ devErr('教程动作执行失败: ' + err.message); }
    if(s.action.advanceAfter){
      setTimeout(function(){ if(running) next(); }, s.action.advanceAfter);
    }
  });
  eExtra.appendChild(b);
}

function renderStep(){
  if(!running) return;
  var s = steps[idx];
  if(!s){ devErr('renderStep: 第 ' + idx + ' 步不存在'); return; }

  eStep.textContent = (idx + 1) + ' / ' + steps.length;
  eTag.textContent  = (role === 'streamer') ? '新手教程 · 主播' : '新手教程 · 普通玩家';
  eTitle.textContent = s.title || '';
  eBody.innerHTML = richToHtml(s.body || '');
  showNote('');
  renderAction(s);

  var last = (idx === steps.length - 1);
  eNext.textContent = last ? '完 成' : '下 一 步';
  ePrev.style.display = (idx === 0) ? 'none' : '';
  eSkip.style.display = last ? 'none' : '';

  if(s.needSettings) openSettings(true);
  if(s.closeSettings) closeSettings();
  if(s.ensureStreamer && getStreamerMode() !== 'on'){
    setStreamerMode(true);
    showNote('已经帮你把主播模式打开了。');
  }

  bindTarget(s);

  /* 位置：需要时先让设置面板动画铺开，再量位置 */
  var place = function(){
    if(!running) return;
    var hole = resolveHole(s);
    updateSpot(hole);
    placeCard(hole, s);
  };
  if(s.needSettings){
    placeCard(null, s);
    setTimeout(place, 340);
  }else{
    place();
  }
}

function jumpTo(id){
  for(var i=0;i<steps.length;i++){
    if(steps[i].id === id){ idx = i; renderStep(); return true; }
  }
  return false;
}

/* =========================================================
   流程控制
   ========================================================= */
function startPath(which){
  role = (which === 'streamer') ? 'streamer' : 'player';
  steps = (role === 'streamer') ? STEPS_STREAMER : STEPS_PLAYER;
  idx = 0;
  if(root){
    root.classList.add('show');
    root.classList.remove('pick-mode');
  }
  running = true;
  setSceneInteractive(false);
  renderStep();
}

function showPick(){
  if(!root) return;
  running = true;
  root.classList.add('show');
  root.classList.add('pick-mode');
  updateSpot(null);
  setSceneInteractive(false);
  closeSettings();
  var st = loadTut();
  eTag.textContent = '新手教程';
}

function finish(markDone){
  running = false;
  unbindTarget();
  if(root){
    root.classList.remove('show');
    root.classList.remove('pick-mode');
  }
  updateSpot(null);
  setSceneInteractive(true);
  if(settingsOpenedByUs) closeSettings();
  if(markDone !== false){
    saveTut({ done:true, role:role });
  }
}

function next(){
  if(!running) return;
  if(idx >= steps.length - 1){ finish(true); return; }
  idx++;
  renderStep();
}
function prev(){
  if(!running || idx <= 0) return;
  idx--;
  renderStep();
}
function skip(){
  finish(true);
}

/* =========================================================
   设置面板里的「重新查看教程」入口
   ========================================================= */
function injectSettingsEntry(){
  try{
    var body = document.querySelector('#settings .settings-body');
    if(!body || document.getElementById('btnTutorial')) return;
    var row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<span>新手教程</span>' +
                    '<button class="tut-link-btn" id="btnTutorial">重新查看</button>';
    var resetBtn = document.getElementById('btnReset');
    if(resetBtn && resetBtn.parentNode) body.insertBefore(row, resetBtn.parentNode);
    else body.appendChild(row);
    var t = document.getElementById('btnTutorial');
    if(t){
      t.addEventListener('click', function(e){
        e.stopPropagation();
        setTimeout(function(){ showPick(); }, 220);
      });
    }
  }catch(e){ devWarn('injectSettingsEntry: ' + e.message); }
}

/* =========================================================
   启动时机：等首个场景加载完（loadingScreen 隐藏）再弹
   ========================================================= */
function whenGameReady(cb){
  var loading = E('loadingScreen');
  if(!loading){ setTimeout(cb, 700); return; }
  if(loading.classList.contains('hidden')){ setTimeout(cb, 420); return; }
  var fired = false;
  function once(){
    if(fired) return;
    fired = true;
    try{ obs.disconnect(); }catch(e){}
    setTimeout(cb, 420);
  }
  var obs = null;
  try{
    obs = new MutationObserver(function(){
      if(loading.classList.contains('hidden')) once();
    });
    obs.observe(loading, { attributes:true, attributeFilter:['class'] });
  }catch(e){ obs = null; }
  /* 兜底：20 秒后如果 loading 已经藏了，也弹 */
  setTimeout(function(){
    if(loading.classList.contains('hidden')) once();
  }, 20000);
}

function autoStart(){
  if(autoStarted) return;
  autoStarted = true;
  var st = loadTut();
  if(st.done){ return; }               /* 看过就不再打扰 */
  /* 继续旧存档的老玩家不打断，教程可以在设置里随时调出来 */
  var mode = 'new';
  try{ mode = window.__LAUNCH_MODE__ || 'new'; }catch(e){}
  if(mode === 'continue'){ return; }
  whenGameReady(function(){
    if(loadTut().done) return;         /* 期间玩家可能已经手动看过了 */
    showPick();
  });
}

/* =========================================================
   初始化
   ========================================================= */
function init(){
  root     = E('tutRoot');
  spot     = E('tutSpot');
  ring     = E('tutSpotRing');
  card     = E('tutCard');
  pickBox  = E('tutPick');
  eStep    = E('tutStepNum');
  eTitle   = E('tutTitle');
  eBody    = E('tutBody');
  eNote    = E('tutNote');
  eTag     = E('tutRoleTag');
  ePrev    = E('tutPrev');
  eNext    = E('tutNext');
  eSkip    = E('tutSkip');
  eExtra   = E('tutExtra');

  stage     = E('stage');
  setPanel  = E('settings');
  sceneFrame= E('gameFrame');

  if(!root || !card || !pickBox){
    devErr('init: 教程 DOM 缺失，教程已禁用');
    return;
  }

  eNext.addEventListener('click', function(e){ e.stopPropagation(); next(); });
  ePrev.addEventListener('click', function(e){ e.stopPropagation(); prev(); });
  eSkip.addEventListener('click', function(e){ e.stopPropagation(); skip(); });

  var opts = pickBox.querySelectorAll('.tut-pick-opt');
  for(var i=0;i<opts.length;i++){
    (function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        startPath(btn.getAttribute('data-role'));
      });
    })(opts[i]);
  }
  var pickSkip = E('tutPickSkip');
  if(pickSkip) pickSkip.addEventListener('click', function(e){ e.stopPropagation(); finish(true); });

  document.addEventListener('keydown', function(e){
    if(!running) return;
    if(e.key === 'Escape'){ skip(); }
    else if(e.key === 'ArrowRight'){ next(); }
    else if(e.key === 'ArrowLeft'){ prev(); }
  });

  injectSettingsEntry();
  autoStart();

  /* 对外留个口子，方便手动唤起 / 调试 */
  window.__TUTORIAL__ = {
    show: showPick,
    start: startPath,
    state: loadTut,
    reset: function(){ try{ localStorage.removeItem(TUT_KEY); }catch(e){} }
  };
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
}else{
  init();
}

})();
