/* =========================================================
   game.js — 雨夜归途 · 全部游戏逻辑
   ========================================================= */
(function(){
'use strict';

/* =========================================================
   存储键
   ========================================================= */
var SAVE_KEY      = 'raccoon_rainy_night_v5';
var LAUNCH_KEY    = 'raccoon_launch_mode';
var SET_KEY       = 'raccoon_settings_v5';
var ACHV_KEY      = 'raccoon_achievements_v1';
var ACHV_SEEN_KEY = 'raccoon_achievements_seen_v1';

/* =========================================================
   DOM 引用
   ========================================================= */
var stage          = document.getElementById('stage');
var overlayEl      = document.getElementById('overlay');
var invEl          = document.getElementById('inv');
var dlgEl          = document.getElementById('dlg');
var dlgMaskEl      = document.getElementById('dlgMask');
var choiceBoxEl    = document.getElementById('choiceBox');
var toastEl        = document.getElementById('toast');
var endEl          = document.getElementById('ending');
var bloodEndEl     = document.getElementById('bloodEnding');
var forgetEndEl    = document.getElementById('forgetEnding');
var setEl          = document.getElementById('settings');
var sceneTitleEl   = document.getElementById('sceneTitle');
var loadingEl      = document.getElementById('loadingScreen');
var loadingNameEl  = document.getElementById('loadingName');
var loadingFill    = document.getElementById('loadingFill');
var loadingPctEl   = document.getElementById('loadingPct');
var loadingTipEl   = document.getElementById('loadingTip');
var loadingRetryEl = document.getElementById('loadingRetry');
var btnTempLightEl = document.getElementById('btnTempLight');
var achvPanelEl    = document.getElementById('achvPanel');
var achvListEl     = document.getElementById('achvList');
var achvProgressEl = document.getElementById('achvProgress');
var achvTotalEl    = document.getElementById('achvTotal');
var btnAchvEl      = document.getElementById('btnAchievements');
var gameFrame = null;

/* =========================================================
   全局错误处理
   ========================================================= */
window.addEventListener('error', function(ev){
  try{
    var tip = document.getElementById('loadingTip');
    var retry = document.getElementById('loadingRetry');
    if(tip){ tip.textContent = '脚本错误：' + (ev.message || '未知'); tip.classList.add('error'); }
    if(retry) retry.classList.add('show');
    console.error('[GLOBAL ERROR]', ev.message, ev.filename, ev.lineno);
  }catch(_){}
});

/* =========================================================
   resize
   ========================================================= */
function resize(){
  var vw = window.innerWidth, vh = window.innerHeight;
  var scale = Math.min(vw / 960, vh / 540);
  stage.style.transform = 'scale(' + scale + ')';
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function(){ setTimeout(resize, 220); });
document.getElementById('btnForce').addEventListener('click', function(){
  document.body.classList.add('forceLand'); setTimeout(resize, 60);
});

/* =========================================================
   设置
   ========================================================= */
var settings = { fps:'60', quality:'high', textSpeed:'normal', fontSize:19, streamerMode:'off' };
try{
  var _d = JSON.parse(localStorage.getItem(SET_KEY) || '{}');
  Object.keys(settings).forEach(function(k){ if(k in _d) settings[k] = _d[k]; });
}catch(e){}
function saveSettings(){ try{ localStorage.setItem(SET_KEY, JSON.stringify(settings)); }catch(e){} }

var streamerWarnShownThisSession = false;

function applySettings(){
  dlgEl.style.fontSize = settings.fontSize + 'px';
  var isStreamer = settings.streamerMode === 'on';
  invEl.classList.toggle('streamer-mode', isStreamer);
  document.body.classList.toggle('streamer-mode', isStreamer);
  document.querySelectorAll('.opts').forEach(function(g){
    var k = g.dataset.key, cur = String(settings[k]);
    g.querySelectorAll('button[data-v]').forEach(function(b){
      b.classList.toggle('on', b.dataset.v === cur);
    });
  });
  if(S && S.flags){ S.flags.streamerMode = isStreamer; }
  syncState();
  if(isStreamer && S && S.flags && S.flags.bloodMode && !streamerWarnShownThisSession){
    streamerWarnShownThisSession = true;
    setTimeout(function(){
      document.getElementById('streamerWarnMask').classList.add('show');
    }, 260);
  }
}

/* =========================================================
   物品定义
   ========================================================= */
var ITEMS = {
  hook:{name:'生锈的挂钩',icon:'🪝',desc:'从垃圾桶里翻出来的，弯得像一个问号。'},
  catfood:{name:'半罐猫粮',icon:'🥫',desc:'还剩一半。铁皮边缘被啃得参差不齐。'},
  key:{name:'黄铜钥匙',icon:'🗝️',desc:'大橘从身下扒出来的，还带着猫毛。'},
  torch:{name:'手电筒',icon:'🔦',desc:'外壳上有牙印。摇一摇，里面有东西松了。'},
  battery:{name:'电池',icon:'🔋',desc:'还剩一点电。'},
  torchOn:{name:'亮着的手电筒',icon:'🔦',desc:'一道细细的、温暖的光柱。'},
  rope:{name:'晾衣绳',icon:'🧵',desc:'晾衣绳，上面还夹着两个塑料夹子。'},
  grapnel:{name:'钩爪',icon:'⚓',desc:'挂钩绑上晾衣绳，歪歪扭扭，但结实。'},
  photo1:{name:'照片碎片·一',icon:'🖼️',desc:'左半张旧照片：一个老人，和一只很小的浣熊。'},
  photo2:{name:'照片碎片·二',icon:'🖼️',desc:'右半张：红屋顶的房子，门口的台阶。'},
  photoFull:{name:'完整的照片',icon:'📷',desc:'一个老人抱着一只小浣熊，站在红屋顶的房子前。'}
};

/* =========================================================
   状态
   ========================================================= */
var S = null;
var endingShown = false;
var endingLock = false;
var bloodPuddleCount = 0;

/* =========================================================
   成就系统
   ========================================================= */
var ACHIEVEMENTS = {
  truth_daybreak: { section:'main',  icon:'☀',  name:'第二天早上',   desc:'真相线 · 台阶上有一只小浣熊' },
  forget_alone:   { section:'main',  icon:'🌫', name:'一个人的早晨', desc:'遗忘线 · 街上是空的' },
  blood_dark:     { section:'blood', icon:'🕯', name:'雨还在下',     desc:'什么都没承认' },
  blood_half:     { section:'blood', icon:'⚡', name:'半承认',       desc:'承认了一部分' },
  blood_full:     { section:'blood', icon:'🌑', name:'另一个雨夜',   desc:'全部承认' }
};

function loadAchievements(){
  try{
    var d = JSON.parse(localStorage.getItem(ACHV_KEY) || '{}');
    if(!d || typeof d !== 'object') return {};
    return d;
  }catch(e){ return {}; }
}
function saveAchievements(d){ try{ localStorage.setItem(ACHV_KEY, JSON.stringify(d)); }catch(e){} }
function getAchievementCount(){
  var d = loadAchievements(), n = 0;
  for(var k in d){ if(ACHIEVEMENTS[k]) n++; }
  return n;
}
function getSeenCount(){ try{ return Number(localStorage.getItem(ACHV_SEEN_KEY) || '0'); }catch(e){ return 0; } }
function setSeenCount(n){ try{ localStorage.setItem(ACHV_SEEN_KEY, String(n)); }catch(e){} }

function unlockAchievement(id){
  if(!ACHIEVEMENTS[id]) return;
  var d = loadAchievements();
  if(d[id]) return;
  d[id] = Date.now();
  saveAchievements(d);
  renderAchvProgress();
  updateAchvUnread();
  toastGold('🏆 达成结局 · ' + ACHIEVEMENTS[id].name);
}
function formatStamp(ms){
  try{
    var d = new Date(ms);
    return String(d.getMonth()+1).padStart(2,'0') + '-' +
           String(d.getDate()).padStart(2,'0') + ' ' +
           String(d.getHours()).padStart(2,'0') + ':' +
           String(d.getMinutes()).padStart(2,'0');
  }catch(e){ return ''; }
}
function renderAchvProgress(){
  var total = Object.keys(ACHIEVEMENTS).length;
  var got = getAchievementCount();
  if(achvProgressEl) achvProgressEl.textContent = got + ' / ' + total;
  if(achvTotalEl) achvTotalEl.innerHTML = '已达成 <b>' + got + '</b> / ' + total;
}
function updateAchvUnread(){
  if(!btnAchvEl) return;
  btnAchvEl.classList.toggle('unread', getAchievementCount() > getSeenCount());
}
function renderAchvPanel(){
  if(!achvListEl) return;
  var d = loadAchievements();
  var html = '';
  function row(id){
    var a = ACHIEVEMENTS[id], ts = d[id], u = !!ts;
    html += '<div class="achv-item' + (u?' unlocked':'') + '">';
    html += '<div class="ico">' + (u ? a.icon : '?') + '</div>';
    html += '<div class="txt">';
    html += '<div class="name">' + (u ? a.name : '？？？') + '</div>';
    html += '<div class="desc">' + (u ? a.desc : '尚未抵达') + '</div>';
    html += '</div>';
    if(u) html += '<div class="stamp">' + formatStamp(ts) + '</div>';
    html += '</div>';
  }
  html += '<div class="achv-sec">主 线</div>';
  row('truth_daybreak'); row('forget_alone');
  html += '<div class="achv-sec">暗 夜</div>';
  row('blood_dark'); row('blood_half'); row('blood_full');
  achvListEl.innerHTML = html;
}
function openAchvPanel(){
  renderAchvPanel();
  achvPanelEl.classList.add('show');
  setSeenCount(getAchievementCount());
  updateAchvUnread();
}
function closeAchvPanel(){ achvPanelEl.classList.remove('show'); }

/* =========================================================
   场景 URL
   ========================================================= */
function sceneURL(name){
  if(S && S.flags && S.flags.bloodMode){
    return 'assets3d/scene.html?id=' + name + '&blood=1';
  }
  if(SCENES[name] && SCENES[name].url) return SCENES[name].url;
  if(/^[a-z]+_day$/.test(name)){
    return 'assets/scene_day.html?id=' + name;
  }
  return name;
}

/* =========================================================
   库存 / 状态 工具
   ========================================================= */
function getInv(){
  if(!S) return [];
  if(S.flags && S.flags.bloodMode){
    if(!S.invBlood) S.invBlood = [];
    return S.invBlood;
  }
  if(!S.inv) S.inv = [];
  return S.inv;
}
function setInv(arr){
  if(!S) return;
  if(S.flags && S.flags.bloodMode) S.invBlood = arr;
  else S.inv = arr;
}
function is(key){
  if(!S || !S.flags) return false;
  return !!S.flags[S.flags.bloodMode ? ('b_' + key) : key];
}
function set(key, val){
  if(!S || !S.flags) return;
  S.flags[S.flags.bloodMode ? ('b_' + key) : key] = !!val;
}
function getVal(key, def){
  if(!S || !S.flags) return def;
  var v = S.flags[S.flags.bloodMode ? ('b_' + key) : key];
  return v === undefined ? def : v;
}
function setVal(key, val){
  if(!S || !S.flags) return;
  S.flags[S.flags.bloodMode ? ('b_' + key) : key] = val;
}

function torchLit(){ return !!(getInv().indexOf('torchOn') !== -1 && is('torchOn')); }
function isBloodMode(){ return !!(S && S.flags && S.flags.bloodMode); }
function isStreamer(){ return settings.streamerMode === 'on'; }

function freshState(){ return { scene:'alley', inv:[], invBlood:[], flags:{}, ended:false }; }
function save(){ if(!S) return; try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function loadSave(){
  try{
    var raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    var d = JSON.parse(raw);
    if(!d || !d.scene || !SCENES[d.scene]) return null;
    if(!d.inv) d.inv = [];
    if(!d.invBlood) d.invBlood = [];
    return d;
  }catch(e){ return null; }
}

/* =========================================================
   暗夜模式切换
   ========================================================= */
var bloodWarnMask = document.getElementById('bloodWarnMask');
var streamerWarnMask = document.getElementById('streamerWarnMask');
var streamerBlockMask = document.getElementById('streamerBlockMask');

function showBloodWarn(){ bloodWarnMask.classList.add('show'); }

function enterBloodMode(){
  if(!S) return;
  S.flags.bloodMode = true;
  S.flags.bloodEnteredOnce = true;
  bloodPuddleCount = 0;
  save(); syncState();
  renderInv();
  if(SCENES[S.scene]){
    showLoading(SCENES[S.scene].label);
    createGameFrame(sceneURL(S.scene));
  }
  say('水洼里的倒影，忽然抬起了头。');
  say('灰豆眨了眨眼。');
  say('——倒影没有眨眼。');
  say('雨声变了。');
  say('变得更近、更沉，像是敲在**铁皮**上。');
  say('远处那栋红屋顶房子，变成了一片焦黑。');
  say('（暗夜模式已开启。）');
  say('（视图切换为**第一人称**。）');
  say('（**WASD** 前后左右移动。）');
  say('（**↑ ↓ ← →** 转动视角。）');
  say('（**E / 空格** 与物件互动。）');
  say('（靠近物件，左下角会出现互动按钮。）');
  say('（主线里的东西，在这里**带不进来**。）');
  say('（雨巷墙根处，有一道窄缝，似乎能回去。）');
  toast('🩸 暗夜模式 · 3D 场景');
}

function exitBloodMode(){
  if(!S) return;
  S.flags.bloodMode = false;
  bloodPuddleCount = 0;
  save(); syncState();
  renderInv();
  if(SCENES[S.scene]){
    showLoading(SCENES[S.scene].label);
    createGameFrame(sceneURL(S.scene));
  }
  toast('🌧 已回到原来的雨夜');
}

bloodWarnMask.addEventListener('click', function(e){
  if(e.target === bloodWarnMask) bloodWarnMask.classList.remove('show');
});
document.getElementById('bloodCancel').addEventListener('click', function(){
  bloodWarnMask.classList.remove('show');
  toast('已回到原来的雨夜');
});
document.getElementById('bloodConfirm').addEventListener('click', function(){
  bloodWarnMask.classList.remove('show');
  enterBloodMode();
});
streamerWarnMask.addEventListener('click', function(e){
  if(e.target === streamerWarnMask) streamerWarnMask.classList.remove('show');
});
document.getElementById('streamerOkBtn').addEventListener('click', function(){
  streamerWarnMask.classList.remove('show');
});
streamerBlockMask.addEventListener('click', function(e){
  if(e.target === streamerBlockMask) streamerBlockMask.classList.remove('show');
});
document.getElementById('streamerBlockOk').addEventListener('click', function(){
  streamerBlockMask.classList.remove('show');
});

/* =========================================================
   ★ A · 老人身影
   ========================================================= */
var SILHOUETTES = {
  alley: [
    '巷子的尽头，有一个模糊的轮廓。',
    '——穿着雨衣。',
    '灰豆看了一会儿。',
    '那个轮廓没有动。',
    '——也没有走。'
  ],
  backstreet: [
    '消防梯下面，站着一个背影。',
    '——还是那件雨衣。',
    '灰豆停了一下。',
    '背影没有回头。',
    '——像是在看着什么。'
  ],
  shop: [
    '后窗外，有一个人。',
    '——隔着玻璃，正对着里面看。',
    '雨衣的帽檐压得很低。',
    '灰豆往后退了一步。',
    '——那个人，也没动。'
  ],
  street: [
    '铁门的另一侧。',
    '——有人在。',
    '一个老人。',
    '雨衣的袖口里，攥着什么东西。',
    '灰豆看不清。'
  ],
  doorstep: [
    '台阶上，站着一个身影。',
    '——背对着门。',
    '一动不动。',
    '像是等了很久。'
  ],
  house: [
    '窗外，站着一个人。',
    '雨衣湿透了。',
    '——他终于抬起了头。',
    '灰豆认出了他。',
    '——是老周。',
    '（他一直在雨里。）'
  ]
};

function maybeShowSilhouette(sceneName){
  if(!S || !S.flags) return;
  if(isBloodMode()) return;
  if(S.flags.daySequence) return;
  if(!SILHOUETTES[sceneName]) return;
  if(!S.flags.seenSilhouettes) S.flags.seenSilhouettes = [];
  if(S.flags.seenSilhouettes.indexOf(sceneName) >= 0) return;
  S.flags.seenSilhouettes.push(sceneName);
  save();
  var lines = SILHOUETTES[sceneName];
  setTimeout(function(){
    lines.forEach(function(l){ say(l); });
  }, 1400);
}

/* =========================================================
   ★ D · 选择 UI
   ========================================================= */
function presentChoice(options, onPick){
  choiceBoxEl.innerHTML = '';
  options.forEach(function(opt){
    var btn = document.createElement('button');
    btn.textContent = opt.text;
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      choiceBoxEl.classList.remove('show');
      choiceBoxEl.innerHTML = '';
      if(onPick) onPick(opt.value);
    });
    choiceBoxEl.appendChild(btn);
  });
  try{
    var dlgRect = dlgEl.getBoundingClientRect();
    var stageRect = stage.getBoundingClientRect();
    var scale = stageRect.width / 960;
    var topInStage = (dlgRect.top - stageRect.top) / scale;
    var bottom = 540 - topInStage + 14;
    if(bottom < 100) bottom = 100;
    if(bottom > 380) bottom = 380;
    choiceBoxEl.style.bottom = bottom + 'px';
  }catch(e){
    choiceBoxEl.style.bottom = '170px';
  }
  choiceBoxEl.classList.add('show');
}

function sayChoice(promptText, options, onPick){
  say(promptText);
  queue.push({ choice: true, options: options, onPick: onPick });
}

/* =========================================================
   ★ D · 三道心结 的具体实现
   ========================================================= */

function triggerInjuredCat(){
  var myInv = getInv();
  if(myInv.indexOf('catfood') === -1){
    say('垃圾桶旁边，什么都没有了。');
    say('那只小猫，也不在了。');
    set('injuredCatDone', true);
    save();
    return;
  }
  say('垃圾桶旁边，蹲着一只小猫。');
  say('——很小。橘色的。');
  say('它的一条后腿，在往外渗血。');
  say('它看着灰豆。');
  say('——但没有躲。');
  say('');
  say('灰豆的包里，还有**半罐猫粮**。');
  say('（猫粮可以喂大橘，可以换一把钥匙。）');
  say('（也可以留给这只猫。）');
  say('');
  sayChoice('——你要怎么做？', [
    { text:'把猫粮留给它', value:'feed' },
    { text:'留着。它还有用。', value:'keep' }
  ], function(v){
    set('injuredCatDone', true);
    if(v === 'feed'){
      var arr = getInv().filter(function(i){ return i !== 'catfood'; });
      setInv(arr);
      set('injuredCatFed', true);
      setVal('catKarma', 1);
      renderInv(); save(); syncState();
      say('灰豆把罐头撕开，推到它面前。');
      say('小猫没有立刻吃。');
      say('它先看了灰豆一会儿。');
      say('——然后才低下头。');
      say('灰豆转身走了。');
      say('它没有回头。');
      say('（猫粮没了。你只剩下别的东西。）', function(){
        afterInjuredCatChoice(v);
      });
    } else {
      setVal('catKarma', -1);
      save();
      say('灰豆把罐头塞回包里。');
      say('小猫看着它。');
      say('——很久。');
      say('然后它把目光移开了。');
      say('灰豆走了。');
      say('（你还留着半罐猫粮。）', function(){
        afterInjuredCatChoice(v);
      });
    }
  });
}

function afterInjuredCatChoice(v){
  if(v === 'feed'){
    set('catFedByKarma', true);
    save();
  }
}

function triggerCatQuestion(){
  say('大橘看着灰豆。');
  say('——看得很久了。');
  say('“那天晚上。”');
  say('“——你跑了吗？”');
  say('');
  say('雨落在它身上。');
  say('它没有眨眼。');
  sayChoice('——你要怎么回答？', [
    { text:'“跑了。”', value:'truth' },
    { text:'“我没有。”', value:'lie' },
    { text:'什么都不说', value:'silent' }
  ], function(v){
    set('catQuestionAsked', true);
    if(v === 'truth'){
      setVal('catTruth', 1);
      save();
      say('灰豆点了点头。');
      say('大橘看了它很久。');
      say('然后它把尾巴收了回来。');
      say('“谢谢。”');
      say('“说真话的，不多。”');
      say('它转过头，继续睡了。');
      say('（它记住了你的答案。）');
    } else if(v === 'lie'){
      setVal('catTruth', -1);
      save();
      say('灰豆摇了摇头。');
      say('大橘看着它。');
      say('——没有拆穿。');
      say('“好。”它说。');
      say('“那就好。”');
      say('它闭上眼睛。');
      say('（它不再看你了。）');
    } else {
      setVal('catTruth', 0);
      save();
      say('灰豆什么都没有说。');
      say('大橘也没有再问。');
      say('雨声里，它们沉默了一会儿。');
      say('然后大橘把脸埋进了尾巴里。');
      say('“走吧。”');
      say('（有些问题，本来就没有答案。）');
    }
  });
}

function triggerPhotoChoice(){
  say('两片照片，都凑齐了。');
  say('');
  say('左边：一个老人，怀里抱着一只很小的浣熊。');
  say('右边：红屋顶的房子，门口的台阶。');
  say('');
  say('——它们能拼上。');
  say('拼上之后，是一张完整的照片。');
  say('照片上是一个老人，抱着小浣熊。');
  say('——站在家门口。');
  say('');
  say('灰豆的手停住了。');
  say('（它其实可以只拼一半。）');
  say('（那样的话，那张照片永远是缺的。）');
  say('（——它就永远不知道另半张上是谁。）');
  say('');
  sayChoice('——你要怎么拼？', [
    { text:'拼完整。我要看全部。', value:'full' },
    { text:'只拼一半。我不想知道。', value:'half' }
  ], function(v){
    if(v === 'full'){
      setVal('photoChoice', 'full');
      save();
      var myInv = getInv();
      var newInv = myInv.filter(function(i){ return i!=='photo1' && i!=='photo2'; });
      newInv.push('photoFull'); setInv(newInv);
      set('photoJoined', true);
      renderInv('photoFull'); save(); syncState();
      say('灰豆把两片纸拼在一起。');
      say('——照片完整了。');
      say('那个老人，在笑着。');
      say('小浣熊在他怀里，尾巴翘得老高。');
      say('一只很小的蓝绳，系在小浣熊的脖子上。');
      say('灰豆低头看了看自己的脖子。');
      say('绳子早就没了，只剩一圈浅浅的毛。');
      say('（它想起来了。）');
      say('（它一直都知道。）', function(){
        setTimeout(startDaySequence, 800);
      });
    } else {
      setVal('photoChoice', 'half');
      save();
      var myInv2 = getInv();
      var newInv2 = myInv2.filter(function(i){ return i!=='photo1' && i!=='photo2'; });
      newInv2.push('photo1'); setInv(newInv2);
      set('photoJoined', true);
      renderInv('photo1'); save(); syncState();
      say('灰豆把左半张放进了相框。');
      say('——右半张，它塞回了口袋。');
      say('');
      say('照片上只剩下那个老人。');
      say('和他怀里的半只浣熊。');
      say('');
      say('（另一半，它不想看。）');
      say('（它不想知道。）');
      say('（——它已经知道了。）', function(){
        setTimeout(function(){
          endingLock = true;
          unlockAchievement('forget_alone');
          endingShown = true;
          syncState();
          forgetEndEl.classList.add('show');
        }, 900);
      });
    }
  });
}

/* =========================================================
   ★ B · 第二天早上
   ========================================================= */
function startDaySequence(){
  if(!S || !S.flags) return;
  if(S.flags.dayStarted) return;
  S.flags.dayStarted = true;
  S.flags.daySequence = true;
  S.scene = 'alley_day';
  save();
  say('雨停了。');
  say('——真的停了。');
  say('');
  say('灰豆抬起头。');
  say('天边，有一点点亮。');
  say('（天，要亮了。）', function(){
    showLoading('雨 巷 · 早');
    setLoadingProgress(15, 45);
    createGameFrame(sceneURL('alley_day'));
  });
}

/* =========================================================
   场景定义
   ========================================================= */
var SCENES = {

  /* =====================================================
     白天雨巷
     ===================================================== */
  alley_day: {
    url: null,
    label: '雨 巷 · 早',
    acts: {
      trash: function(){
        say('垃圾桶翻倒在墙边。');
        say('——是昨晚那一只。');
        say('但现在，它安安静静地躺在阳光里。');
        say('像是什么都没发生过。');
      },
      cat: function(){
        say('一只小猫蹲在垃圾桶旁边。');
        say('——橘色的。');
        say('它抬起头，看了灰豆一眼。');
        say('——没有怕。');
        say('也没有动。');
        say('（像是在这里，等了很久。）');
      },
      graffiti: function(){
        say('墙上那行字，白天看得很清楚。');
        say('“……记得回家。”');
        say('——原来是这五个字。');
        say('昨晚雨太大，只能看见前四个。');
      },
      puddle: function(){
        say('水洼还在。');
        say('但已经干了半边。');
        say('——现在是水。');
        say('不是别的。');
      },
      lamp: function(){
        say('路灯关着。');
        say('——白天不需要它。');
        say('灰豆抬头看了一眼。');
        say('灯罩上什么都没有。');
        say('（昨晚的那些，只是影子。）');
      },
      exit: function(){
        say('灰豆往前走。');
        say('阳光照在它的背上。');
        say('——很暖。');
        say('它走在昨晚跑过的那条巷子里。');
        say('——走得很慢。');
        changeScene('backstreet_day', '后 巷 · 早');
      }
    }
  },

  /* =====================================================
     后巷 · 早
     ===================================================== */
  backstreet_day: {
    url: null,
    label: '后 巷 · 早',
    acts: {
      stairs: function(){
        say('消防梯锈得更厉害了。');
        say('——但它看起来没那么吓人了。');
        say('铁栏杆上还留着灰豆的爪印。');
        say('（昨晚它爬上去过。）');
      },
      mold: function(){
        say('墙上的霉斑，白天看是一团普通的黑。');
        say('——只是一块老墙。');
        say('灰豆盯着看了一会儿。');
        say('形状还是有点像一栋房子。');
        say('——但屋顶是黑的了。');
      },
      box: function(){
        say('三个纸箱都塌了。');
        say('里面是空的。');
        say('——只有雨水和一点碎报纸。');
      },
      cat: function(){
        say('大橘蜷在纸箱上，在晒太阳。');
        say('它看见灰豆，只抬了一下眼皮。');
        say('“哦，是你。”');
        say('“昨晚的事，就当没发生。”');
        say('然后它把脸埋回尾巴里。');
      },
      door: function(){
        say('后门开着。');
        say('——是昨晚灰豆撞开的。');
        say('里面是便利店。');
        changeScene('shop_day', '便 利 店 · 早');
      },
      powerDoor: function(){
        say('配电房的小铁门还开着。');
        say('里面黑漆漆的。');
        say('——白天看，只是一间小屋。');
        say('灰豆没有进去。');
      },
      back: function(){
        say('灰豆走回雨巷。');
        changeScene('alley_day', '雨 巷 · 早');
      }
    }
  },

  /* =====================================================
     便利店 · 早
     ===================================================== */
  shop_day: {
    url: null,
    label: '便 利 店 · 早',
    acts: {
      counter: function(){
        if(is('zhouMet')){
          say('老周站在收银台后面。');
          say('——他在擦一个杯子。');
          say('“不着急。”他说。“慢慢来。”');
          return;
        }
        set('zhouMet', true); save();
        say('一个老人从收银台后面走了出来。');
        say('——他穿着一件旧毛衣，手里端着一个茶缸。');
        say('他看见灰豆。');
        say('茶缸停在了半空中。');
        say('');
        say('“……你回来了。”');
        say('');
        say('灰豆看着他。');
        say('——它认出来了。');
        say('是老周。');
        say('那天晚上，从窗户里往外看的，就是他。');
        say('——他没有追出来。');
        say('——是因为他追不动了。');
        say('');
        say('“进来吧。”老周说。');
        say('“外面冷。”');
        say('');
        say('（老周把茶缸放在了桌上。）');
        say('（他没有再看灰豆。）');
        say('（他好像……已经等这一天很久了。）');
      },
      shelf: function(){
        say('货架是空的。');
        say('——白天看，就只是空的。');
        say('昨天晚上那些红色的标签，都不在了。');
      },
      window: function(){
        say('后窗外面，天已经大亮了。');
        say('——巷子尽头，就是街。');
      },
      floor: function(){
        say('地板上，还是那串爪印。');
        say('——很小。');
        say('是小浣熊的。');
        say('灰豆把自己的爪子按了上去。');
        say('——正好。');
      },
      poster: function(){
        say('墙上的海报。');
        say('——白天看，只是一张普通的促销海报。');
        say('右下角那只小小的浣熊，还是歪歪的。');
        say('——但画得很认真。');
      },
      back: function(){
        say('灰豆退回后巷。');
        changeScene('backstreet_day', '后 巷 · 早');
      },
      exit: function(){
        say('灰豆推开后门。');
        say('外面是一条街。');
        changeScene('street_day', '街 道 · 早');
      }
    }
  },

  /* =====================================================
     街道 · 早
     ===================================================== */
  street_day: {
    url: null,
    label: '街 道 · 早',
    acts: {
      lamp: function(){
        say('路灯是关着的。');
        say('白天不需要它。');
      },
      power: function(){
        say('配电房的门锁着。');
        say('——老周说，白天的电，是给别人的。');
      },
      under: function(){
        say('地下通道的入口，白天看只是一个普通的洞口。');
        say('灰豆没有下去。');
      },
      river: function(){
        say('河堤那边，能听见水声。');
        say('——哗啦哗啦。');
        say('河还在。');
      },
      rope: function(){
        say('晾衣绳已经不在那里了。');
      },
      gate: function(){
        say('铁门开着。');
        say('——昨晚灰豆用钩爪翻过去过。');
        say('今天不用了。');
        say('灰豆从门里走了过去。');
        changeScene('doorstep_day', '门 前 · 早');
      },
      tree: function(){
        say('梧桐树上的塑料袋，还在风里抖。');
        say('——但白天看，就只是塑料袋。');
      },
      mailbox: function(){
        say('信箱还在那里。');
        say('——锁还是锈的。');
        say('灰豆这次没有去扒。');
      },
      fire: function(){
        say('消防栓在阳光里闪着一点光。');
        say('灰豆凑过去蹭了蹭。');
        say('——还是凉的。');
        say('——但比昨晚暖。');
      },
      back: function(){
        say('灰豆退回后巷。');
        changeScene('backstreet_day', '后 巷 · 早');
      }
    }
  },

  /* =====================================================
     门前 · 早
     ===================================================== */
  doorstep_day: {
    url: null,
    label: '门 前 · 早',
    acts: {
      window: function(){
        say('窗户里，有人在走动。');
        say('——是老周。');
        say('他在整理什么东西。');
      },
      lamp: function(){
        say('门框上的小灯，白天不需要亮。');
        say('——灯罩上还挂着几滴昨晚的雨。');
      },
      door: function(){
        say('门开着。');
        say('——像是在等谁。');
        say('灰豆走了进去。');
        changeScene('house_day', '红 屋 顶 · 早');
      },
      steps: function(){
        say('两级石阶，被早晨的阳光晒得暖暖的。');
        say('——昨晚的青苔，还在。');
        say('灰豆在台阶上坐了一会儿。');
      },
      back: function(){
        say('灰豆退回到街道。');
        changeScene('street_day', '街 道 · 早');
      }
    }
  },

  /* =====================================================
     红屋顶 · 早 —— 主线真相线终章
     ===================================================== */
  house_day: {
    url: null,
    label: '红 屋 顶 · 早',
    acts: {
      frame: function(){
        if(endingShown || endingLock) return;
        say('桌上摆着一张照片。');
        say('——完整的。');
        say('一个老人，抱着一只小浣熊。');
        say('小浣熊的脖子上，系着一根蓝色的绳子。');
        say('——绳子没有断。');
        say('');
        say('灰豆看了很久。');
        say('然后它转过头。');
        say('——它不需要再看了。');
        say('');
        say('“我回来了。”');
        say('');
        say('老周站在门口。');
        say('他没有说话。');
        say('——但他笑了。');
        say('（主线 · 真相线 · 完结）', function(){
          endingLock = true;
          unlockAchievement('truth_daybreak');
          setTimeout(function(){
            endingShown = true;
            syncState();
            endEl.classList.add('show');
          }, 900);
        });
      },
      chair: function(){
        say('摇椅还在慢慢地晃。');
        say('——好像刚有人站起来。');
      },
      bowl: function(){
        say('小碗已经洗干净了。');
        say('——里面放着一块饼干。');
      },
      window: function(){
        say('窗外，天亮了。');
        say('——没有雨。');
      },
      books: function(){
        say('书架上的旧书，还在那里。');
        say('——这一次，没有烧焦。');
      },
      clock: function(){
        say('挂钟还在走。');
        say('——滴答。滴答。');
      },
      lamp: function(){
        say('台灯是关着的。');
        say('白天不需要它。');
      },
      back: function(){
        say('灰豆退回门前。');
        changeScene('doorstep_day', '门 前 · 早');
      }
    }
  },

  /* =====================================================
     雨巷
     ===================================================== */
  alley: {
    url:'assets/scene1.html', label:'雨 巷',
    acts: {
      trash: function(){
        var myInv = getInv();
        if(myInv.indexOf('hook') !== -1 && myInv.indexOf('torch') !== -1){
          if(isBloodMode()){
            say('垃圾桶里，什么都没有了。');
            say('只剩下那股腥甜。');
          } else {
            if(!is('injuredCatDone')){
              triggerInjuredCat();
            } else {
              say('除了一股馊味，什么也没有了。');
              say('那张报纸还黏在桶底，像一层剥不下来的皮。');
            }
          }
          return;
        }
        if(isBloodMode()){
          say('垃圾桶还在原来的位置。');
          say('桶盖开着——不是灰豆掀开的。');
          say('里面那点馊味，换成了一股腥甜。');
          say('灰豆不想去翻。');
          say('——但它的爪子，自己伸了进去。');
          say('桶底湿乎乎的，像是有东西在往下沉。');
          say('它摸到了什么。');
          say('——冰的。');
          say('——不是铁的温度。');
          say('——像什么**活着的东西**，凉透了。');
          say('灰豆停了一下。');
          say('——桶底里，那个东西，**也停了一下**。');
          say('它猛地抽回爪子。');
          say('一个**挂钩**掉了出来，跟着一个**手电筒**。');
          say('手电筒外壳上，有一圈**很浅的牙印**。');
          say('——不是灰豆的。');
          say('——是比它大得多的牙。', function(){
            pickup('hook');
            pickup('torch');
            save(); syncState();
          });
          return;
        }
        if(myInv.indexOf('hook') !== -1){
          say('除了一股馊味，什么也没有了。');
          say('那张报纸还黏在桶底，像一层剥不下来的皮。');
          return;
        }
        say('垃圾桶里飘出一股酸味。');
        say('灰豆踮起脚，前爪搭上桶沿，整只桶晃了一下。');
        say('桶底压着一张湿透的报纸，字迹已经糊了。');
        say('一个**挂钩**掉了出来，锈得像一块干了的血痂。', function(){
          pickup('hook'); save(); syncState();
        });
      },

      photo1: function(){
        if(isBloodMode()) return;
        if(getInv().indexOf('photo1') !== -1 || is('photo1Taken')) return;
        say('一张湿透的纸片贴在墙上。');
        say('灰豆用指甲把它一点点抠下来。');
        say('照片上是一个{{老人}}，怀里抱着一只很小的浣熊。');
        say('背景里有**红色的屋顶**——被撕掉了一半。');
        say('照片背面有一行小字，被雨泡开了：');
        say('“……你还记得，怎么回家吗？”', function(){
          set('photo1Taken', true);
          pickup('photo1'); save(); syncState();
        });
      },

      puddle: function(){
        if(isStreamer() && !isBloodMode()){
          document.getElementById('streamerBlockMask').classList.add('show');
          return;
        }
        if(isBloodMode()){
          bloodPuddleCount++;
          if(bloodPuddleCount === 1){
            say('水洼又深了一点。');
            say('倒影里，那栋烧过的房子，窗户里亮起了一盏灯。');
          } else if(bloodPuddleCount === 2){
            say('灯下站着一个人。');
            say('背对着灰豆。');
            say('——那个人一动不动。');
            say('——但灰豆的影子，**在动**。');
          } else if(bloodPuddleCount === 3){
            say('那个人缓缓转过了头。');
            say('灰豆立刻把目光移开了。');
            say('——倒影里的人，**没有脸**。');
            say('只有一整片焦黑。');
          } else if(bloodPuddleCount === 4){
            say('水洼里的倒影，慢慢地、慢慢地——');
            say('学着灰豆的样子，抬起了头。');
            say('——但倒影的头顶，是**塌下去的**。');
            say('灰豆转身走了。');
          } else {
            say('灰豆不想再看水洼了。');
            say('——但水洼在看它。');
          }
          return;
        }
        say('水洼里浮着一团暗红色。');
        say('——不像油漆。');
        say('灰豆低下头，凑近闻了闻。');
        say('……是**铁锈味**。');
        say('它盯着水洼深处看了一眼。');
        say('水里倒映着一栋房子。');
        say('**红色的屋顶**。');
        say('但不是它要找的那一栋。');
        say('这栋房子——**烧过**。', function(){
          setTimeout(showBloodWarn, 320);
        });
      },

      lamp: function(){
        if(isBloodMode()){
          say('路灯灭了。');
          say('灯罩上挂着一缕黑烟。');
          say('——像是刚刚烧断的。');
          say('灰豆抬头看了一眼。');
          say('——灯罩的边缘，有什么东西**在往下滴**。');
          say('一滴。');
          say('又一滴。');
          say('灰豆没有去接。');
          return;
        }
        if(S.flags.powerCut){ say('路灯灭了。'); say('灯罩里只剩下黑黢黢的灯泡。'); }
        else{
          say('路灯在雨里亮着，光晕被雨丝切碎成一片一片。');
          say('灯罩边缘积了一层薄薄的灰。');
          say('——是蛾子的翅膀，还是别的什么？');
          say('灰豆抬头看了一眼。');
          say('它忽然想起，以前有一盏灯，也是这样昏黄的。');
        }
      },

      wires: function(){
        if(isBloodMode()){
          say('电线上挂着一只塑料袋。');
          say('袋子里，好像装着什么。');
          say('灰豆看了一会儿。');
          say('——袋子在**慢慢地鼓起来**。');
          say('又**慢慢地瘪下去**。');
          say('像在呼吸。');
          say('灰豆没有去碰。');
          return;
        }
        say('一根电线从楼顶垂下来，上面挂着一排水珠。');
        say('风一吹，水珠晃了晃，落下来一颗。');
        say('电线杆上贴着一张寻猫启事，纸已经发黄。');
        say('照片上那只猫，和大橘很像。');
        say('灰豆伸出爪子去接水珠——');
        say('什么都没接住。');
      },

      graffiti: function(){
        if(isBloodMode()){
          say('墙上那行粉笔字，被雨冲得更淡了。');
          say('“……记得回……”');
          say('灰豆盯着看了很久。');
          say('——它确定，上次来的时候，后半句是“后半句没了”。');
          say('但现在，那后半句——');
          say('**慢慢显出来了**。');
          say('歪歪扭扭，像是一笔一笔刚写上去的：');
          say('“……记得回**家**。”');
          say('灰豆往后退了一步。');
          say('——墙上，还有一只手印。');
          say('很小。');
          say('像是一只浣熊的爪印。');
          say('——是**湿的**。');
          return;
        }
        say('墙上有一行粉笔字，被雨冲得只剩一半。');
        say('“……记得回……”');
        say('后半句没了。');
        say('灰豆用鼻子凑近闻了闻。');
        say('——是新的。');
        say('——粉笔的味道里，混着一点淡淡的铁锈味。');
      },

      bloodExit: function(){
        if(!isBloodMode()) return;
        say('墙根处，有一道细得像线的缝。');
        say('缝里透出一点点暖色的光。');
        say('——像是谁在墙那边点了一盏灯。');
        say('灰豆把爪子伸了进去。');
        say('墙那边的光，很暖。');
        say('——它决定回去。', function(){
          exitBloodMode();
          say('它把爪子抽了出来。');
          say('雨又变回了原来的雨。');
          say('墙上的字，还是那半句“……记得回……”。');
          say('——像是什么都没发生过。');
        });
      },

      exit: function(){
        if(isBloodMode()){
          say('巷子深处更暗了。');
          say('——雨声里，混着一点**别的声音**。');
          say('像是谁，在后面**慢慢地走**。');
          say('灰豆没有回头。');
        } else {
          say('灰豆钻进了巷子深处。');
        }
        changeScene('backstreet', '后 巷');
      }
    }
  },

  /* =====================================================
     后巷
     ===================================================== */
  backstreet: {
    url:'assets/scene2.html', label:'后 巷',
    acts: {
      box: function(){
        var myInv = getInv();
        if(isBloodMode()){
          if(myInv.indexOf('key') !== -1){
            say('纸箱里只剩下一些碎纸屑。');
            say('还有那张旧报纸——“一家三口”几个字，被雨洇糊了。');
            return;
          }
          say('三个纸箱还在。');
          say('最上面那个，纸箱底被撕开了。');
          say('露出下面一叠旧报纸。');
          say('头版上写着：“**某小区昨夜失火，一家三口……**”');
          say('后面几个字，被雨水洇糊了。');
          say('——灰豆凑近看了看。');
          say('照片上，有一个模糊的人形。');
          say('**一家三口**。');
          say('——但照片上，只有**两个人**。');
          say('第三个人影，被人用指甲刮掉了。');
          say('刮得很深。');
          say('报纸下面，压着一样东西。');
          say('一把**黄铜钥匙**。');
          say('上面……沾着一点猫毛。');
          say('——干干的。不像刚掉的。');
          say('灰豆把它叼了出来。', function(){
            pickup('key'); save(); syncState();
          });
          return;
        }
        if(myInv.indexOf('catfood') !== -1 || is('catFed') || is('catGone')){
          say('纸箱里只剩下一些碎纸屑。');
          say('和那张旧报纸的一角。');
          return;
        }
        say('三个纸箱，被雨泡得发软。');
        say('最上面那个是空的……不，有东西。');
        say('半罐**猫粮**。铁皮边缘被啃得参差不齐。');
        say('罐头底下，压着一张旧报纸的一角。');
        say('头条是“某小区昨夜失火”——下面被撕掉了。', function(){
          pickup('catfood'); save(); syncState();
        });
      },

      cat: function(){
        var myInv = getInv();
        if(isBloodMode()){
          if(myInv.indexOf('photo1') !== -1){
            say('那摊水渍已经干了。');
            say('只剩一圈淡淡的印子。');
            say('——但印子，**变大了**。');
            return;
          }
          say('纸箱上，什么都没有。');
          say('——大橘不在这里。');
          say('只有一摊浅浅的水渍。');
          say('形状很奇怪，像是一只蜷着的猫。');
          say('——不是猫。');
          say('灰豆凑近看了看。');
          say('水渍的边缘，有几道很细很细的划痕。');
          say('像是挣扎过。');
          say('——但只有**三只爪**的痕迹。');
          say('第四条腿，被拖走了。');
          say('水渍下面，压着一张湿透的纸片。');
          say('灰豆用爪子把它抠了出来。');
          say('照片上，是一个老人，怀里抱着一只很小的浣熊。');
          say('——但照片上，**老人没有脸**。');
          say('只有一片烧焦的黑。');
          say('怀里那只小浣熊——');
          say('在**盯着灰豆看**。', function(){
            pickup('photo1'); save(); syncState();
          });
          return;
        }
        if(myInv.indexOf('catfood') === -1){
          say('一只橘猫蜷在纸箱上，尾巴圈住鼻子。');
          say('它的肚子瘪瘪的。');
          say('灰豆注意到，它的脖子上有一道浅浅的疤。');
          say('大橘的耳朵动了一下，但{{没有睁眼}}。');
          return;
        }
        if(is('catFed') || myInv.indexOf('key') !== -1){
          if(!is('catQuestionAsked')){
            triggerCatQuestion();
          } else {
            say('大橘已经睡了。');
            say('——它的呼吸很轻。');
            say('灰豆不想吵它。');
          }
          return;
        }
        set('catFed', true);
        var newInv = myInv.filter(function(i){ return i !== 'catfood'; });
        setInv(newInv);
        renderInv();
        say('灰豆把罐头推过去，铁皮刮着地面。');
        say('大橘的耳朵先动，然后是鼻子，然后是整只猫。');
        say('“哟。”它打了个哈欠，“新来的。”');
        say('“你要过那扇门？老板锁得比他的钱包还紧。”');
        say('“不过嘛……”它伸了个懒腰，从身下扒出一样东西。');
        say('一把**黄铜钥匙**，上面还沾着猫毛。', function(){
          pickup('key'); save(); syncState();
        });
        say('“前几天他掉这个的时候，我顺手收了。”');
        say('“罐头归我，钥匙归你。{{公平。}}”');
        say('“对了——那扇门通着电，是死锁的。”');
        say('“得先断了这条街的电，才打得开。”');
        say('“巷子尽头有一扇小铁门，门上写着配电。”');
        say('“从那儿进去就对了。”');
        say('（它顿了顿。）');
        say('“……还有一件事。”');
        say('“如果你哪天看见一栋**烧过的房子**——”');
        say('“别进去。”');
      },

      door: function(){
        if(S.flags.doorOpen){
          say('门开着一条缝。');
          changeScene('shop', '便 利 店');
          say('灰豆侧着身子钻了进去。');
          return;
        }
        var myInv = getInv();
        if(myInv.indexOf('key') === -1){
          say('金属门冰凉。');
          say('灰豆用爪子挠了几下，只留下三道白印。');
          say('门上挂着一把**黄铜锁**。');
          if(isBloodMode()){
            say('——锁孔里，有什么东西在动。');
            say('——像是**有人在里面**看着外面。');
          }
          return;
        }
        var missing = [];
        /* ★ 修复：暗夜模式下不再要求 hook / photo1 */
        if(!isBloodMode()){
          if(myInv.indexOf('hook') === -1 && myInv.indexOf('grapnel') === -1)
            missing.push('雨巷垃圾桶里的挂钩');
          if(myInv.indexOf('photo1') === -1 && myInv.indexOf('photoFull') === -1 && !is('photo1Taken'))
            missing.push('雨巷墙上的湿透的纸片');
        }
        if(missing.length > 0){
          say('钥匙插进锁孔，灰豆的动作停住了。');
          say('它回头看了一眼来时的路。');
          say('——好像还有什么没做完。');
          say('（还缺：' + missing.join('、') + '。）');
          say('（请先往左边走回雨巷，把东西找齐。）');
          return;
        }
        /* ★ 修复：暗夜模式下跳过主线电力检查 */
        if(!isBloodMode() && !S.flags.powerCut){
          say('钥匙插进锁孔，转了一圈。');
          say('“咔哒”一声——');
          say('门却纹丝不动。');
          say('门框上亮着一颗**红色**的小灯，一闪，一闪。');
          say('旁边钉着一块小铁牌：');
          say('“**电路控制 · 通电中**”。');
          say('——这条街的电不断掉，这门就永远打不开。');
          say('（灰豆记得，巷子尽头有一扇配电房的小铁门。）');
          return;
        }
        S.flags.doorOpen = true; save(); syncState();
        say('钥匙插进锁孔，转了两圈。');
        say('“咔哒。”');
        say('门开了一条缝，里面{{黑得像一口井}}。');
        if(isBloodMode()){
          say('——门里，传来很轻很轻的**水声**。');
          say('像是有人在里面**洗手**。');
          say('灰豆停了一下。');
          say('——水声也停了一下。');
        }
        setTimeout(function(){
          changeScene('shop', '便 利 店');
          say('灰豆侧着身子钻了进去。');
        }, 220);
      },

      powerDoor: function(){
        if(!S.flags.powerDoorSeen){
          S.flags.powerDoorSeen = true; save(); syncState();
          if(isBloodMode()){
            say('巷子的尽头，墙上嵌着一扇小铁门。');
            say('——门上的红漆早就烧黑了。');
            say('“**配电**”两个字，只剩半边。');
            say('门缝里透出的不是冷光。');
            say('是一点暗红的光。');
            say('——光在**呼吸**。');
            say('灰豆用肩膀顶了顶，门吱呀一声开了。');
            say('里面，传来一声很低的**叹息**。');
          } else {
            say('巷子的尽头，墙上嵌着一扇小铁门。');
            say('门上钉着一块褪色的红牌子——');
            say('“**配电**”。');
            say('门缝里透出一点冷光，还有低低的嗡嗡声。');
            say('灰豆用肩膀顶了顶，门吱呀一声开了。');
            say('里面黑漆漆的。');
          }
          setTimeout(function(){
            S.flags.powerFrom = 'backstreet'; save(); syncState();
            changeScene('powerstation', '配 电 房');
          }, 300);
        } else {
          say('那扇配电房的小铁门还开着。');
          say('里面黑漆漆的。', function(){
            S.flags.powerFrom = 'backstreet'; save(); syncState();
            changeScene('powerstation', '配 电 房');
          });
        }
      },

      stairs: function(){
        if(isBloodMode()){
          say('头顶那架消防梯，锈得更厉害了。');
          say('——但这次，灰豆不想上去。');
          say('消防梯的横梁上，挂着一根**很细的绳**。');
          say('像是**猫毛编的**。');
          say('——从上面垂下来。');
          say('一直垂到地面上。');
          return;
        }
        if(!S.flags.rooftopSeen){
          S.flags.rooftopSeen = true; save(); syncState();
          say('头顶有一架锈透了的消防梯。');
          say('最上面一层横梁上，有一只被雨淋透的鸟窝。');
          say('——窝里是空的。');
          say('灰豆跳了一下，够不到。');
          say('又跳了一下。');
          say('这一次，爪尖勾住了一道铁横梁。');
          say('——好吧，上去看看。');
        } else {
          say('消防梯上还留着它的爪印。');
          say('那只鸟窝，还挂在那里。');
          say('灰豆蹭了蹭铁栏杆。');
        }
        changeScene('rooftop', '屋 顶');
      },

      mold: function(){
        if(isBloodMode()){
          say('霉斑变成了深红色。');
          say('——一片一片，像是溅上去的。');
          say('形状还是像一栋房子。');
          say('但屋顶不再是红色。');
          say('是焦黑。');
          say('——房子里面，有几个小小的**人形**。');
          say('灰豆数了数。');
          say('——两个。');
          say('——第三个，被刮掉了。');
          return;
        }
        say('墙上的霉斑长成一片模糊的地图。');
        say('灰豆盯着看了很久。');
        say('——其中一块的形状，有点像一栋房子。');
        say('**红屋顶**。');
      },

      back: function(){
        if(isBloodMode()){
          say('灰豆退回到雨巷。');
          say('——雨，还在下。');
          say('——但**雨声停了**，大概半秒钟。');
          say('就在灰豆回头的那一瞬间。');
        }
        changeScene('alley', '雨 巷');
      }
    }
  },

  /* =====================================================
     便利店
     ===================================================== */
  shop: {
    url:'assets/scene3.html', label:'便 利 店',
    acts: {
      counter: function(){
        var myInv = getInv();
        if(isBloodMode()){
          if(myInv.indexOf('torch') === -1 && myInv.indexOf('torchOn') === -1){
            say('收银台抽屉里，滚出一个**手电筒**。');
            say('——好像它一直在这里等。');
            pickup('torch'); save(); syncState();
            return;
          }
          if(myInv.indexOf('photo2') !== -1){
            say('收银台上落了一层灰。');
            say('抽屉半开着。');
            say('里面是空的。');
            return;
          }
          if(myInv.indexOf('battery') === -1){
            say('抽屉里只剩下一些硬币和过期的会员卡。');
            say('——还有那张便签。');
            say('“老周，电闸不要再关了。”');
            say('——字迹，**在动**。');
            say('灰豆把目光移开了。');
            return;
          }
          say('灰豆把坏掉的手电筒放在收银台上。');
          say('——没用。');
          say('');
          say('它用爪子去抠那个抽屉的底板。');
          say('——有一块木板是松的。');
          say('它用牙咬住边缘，一点点往上掀。');
          say('木板下面，藏着一张照片。');
          say('照片上，红屋顶的房子，门口的台阶。');
          say('台阶上站着一个女孩，举着一把**蓝伞**。');
          say('——照片的边角，还在冒烟。');
          say('——女孩的脸，**是灰豆的**。', function(){
            pickup('photo2'); save(); syncState();
          });
          return;
        }
        if(myInv.indexOf('photo2') !== -1){
          say('收银台上落了一层薄灰。');
          say('便签还在那里，字迹有点被水洇糊了。');
          return;
        }
        if(myInv.indexOf('torch') !== -1 && myInv.indexOf('battery') !== -1){
          say('灰豆把坏掉的手电筒放在收银台上。');
          say('它用爪子去撬抽屉的底板。');
          say('——木板翘起一条边。');
          say('里面藏着一张照片。');
          say('照片上，红屋顶的房子，门口的台阶，还有{{半只浣熊的影子}}。', function(){
            pickup('photo2'); save(); syncState();
          });
          say('和刚才那半张，**正好能拼上**。');
          return;
        }
        if(myInv.indexOf('torch') === -1 && myInv.indexOf('torchOn') === -1){
          say('灰豆跳上收银台。');
          say('抽屉卡住了，它用牙咬，用爪子刨。');
          say('收银台的底下，贴着一张手写便签：');
          say('“**老周，电闸不要再关了。**”');
          say('——字迹很潦草，像是写得很急。');
          say('一个**手电筒**滚了出来。外壳上有牙印——不是它的。', function(){
            pickup('torch'); save(); syncState();
          });
          return;
        }
        say('抽屉里只剩下一些硬币和过期的会员卡。');
        say('——还有那张便签。');
        say('“老周，电闸不要再关了。”');
      },

      shelf: function(){
        var myInv = getInv();
        if(myInv.indexOf('battery') !== -1){
          say('货架空了。');
          say('只剩那几罐过期的罐头。');
          return;
        }
        if(isBloodMode()){
          say('货架上，所有的商品都蒙了一层灰。');
          say('罐头上的标签——**全是红的**。');
          say('没有字。');
          say('——像一罐一罐没写名字的血。');
          say('——但最上面那一罐，标签上有个很小的字。');
          say('灰豆凑近看了看。');
          say('是一个**名字**。');
          say('——“**灰豆**”。');
          say('灰豆往后退了一步。');
          say('最底层，滚着一个圆圆的东西。');
          say('一节**电池**。', function(){
            pickup('battery'); save(); syncState();
          });
          return;
        }
        say('货架上大多是空的。');
        say('最上层的几罐，保质期是三个月前。');
        say('已经过期了。');
        say('最底层滚着一个圆圆的东西。');
        say('一节**电池**。还剩一点电。', function(){
          pickup('battery'); save(); syncState();
        });
      },

      window: function(){
        if(isBloodMode()){
          if(is('bloodWindowPassed')){
            say('后窗已经关死了。');
            say('——从里面，从外面，都打不开。');
            return;
          }
          set('bloodWindowPassed', true);
          say('后窗外，是一片黑。');
          say('——那种连雨都照不亮的黑。');
          say('灰豆不想往里钻。');
          say('');
          say('——但后窗玻璃上，有一层**水汽**。');
          say('水汽上，画着一只很小的手印。');
          say('——五根指头。');
          say('——太小了。');
          say('——小得，像是刚出生不久。');
          say('');
          say('手印旁边，又慢慢浮出第二只。');
          say('——五根指头。');
          say('——和灰豆的爪子，**一样大**。');
          say('');
          say('灰豆往后退了一步。');
          say('——窗户自己开了。');
          say('雨声涌了进来。', function(){
            changeScene('street', '街 道');
            say('灰豆从后窗掉了出去。');
            say('——玻璃在身后，无声地合上。');
            say('回不去了。');
          });
          return;
        }
        changeScene('street', '街 道');
        say('后窗外一片漆黑。');
        say('灰豆探头往外看了看。');
        say('——什么都看不见。');
        say('');
        say('但它知道，这条街，它必须走完。');
        say('它从后窗翻了出去。');
        say('窗台太高，回不去了。');
      },

      back: function(){
        if(isBloodMode()){
          say('灰豆退回到后门。');
          say('——门缝里透出的，还是那股腥甜。');
          say('——但它还是钻了出去。');
        } else {
          say('灰豆从后门钻了出去。');
        }
        changeScene('backstreet', '后 巷');
      },

      floor: function(){
        if(isBloodMode()){
          say('地板上，有一串湿漉漉的脚印。');
          say('——不大。');
          say('——是小动物的。');
          say('但走到一半，就断了。');
          say('——旁边的地板上，又有一串脚印。');
          say('**是人的**。');
          say('——赤脚。');
          say('——脚趾头，有**六个**。');
          return;
        }
        say('地板很黑。灰豆用爪子一点一点摸过去。');
        say('——摸到一张落满灰的收据。');
        say('字迹看不清了。');
        say('日期是……三个月前。');
        say('收据背面，有一行小字，是用圆珠笔写的：');
        say('“11月14日，晴。”');
      },

      poster: function(){
        if(isBloodMode()){
          say('海报还在墙上。');
          say('上面那只用圆珠笔画的浣熊——');
          say('**脸被涂掉了**。');
          say('只有一团黑色的、重重的圆珠笔痕。');
          say('——但这一次，涂痕里露出来一点点。');
          say('露出来的不是浣熊的脸。');
          say('是**人的眼睛**。');
          return;
        }
        say('墙上贴着一张促销海报。');
        say('——灰豆其实看不清。');
        say('它只是借着窗外的微光，勉强看到了一个轮廓。');
        say('“本店特惠 · 罐头半价”。');
        say('海报右下角用圆珠笔画了一只小小的浣熊。');
        say('画得不太像。但画得很认真。');
        say('海报最下面印着日期——是三个月前。');
      }
    }
  },

  /* =====================================================
     街道
     ===================================================== */
  street: {
    url:'assets/scene4.html', label:'街 道',
    acts: {
      power: function(){
        if(S.flags.powerCut){
          say('配电房的铁门半掩着。');
          say('里面黑漆漆的，只有应急灯一闪一闪。');
          say('灰豆已经来过了。');
        }else{
          say('墙边有一扇窄门。');
          say('铁皮做的，刷着深灰色漆，门缝里透出一点冷光。');
          say('门上挂着一块红底白字的牌子——“配电”。');
          say('门没有锁。');
          S.flags.powerFrom = 'street'; save(); syncState();
          changeScene('powerstation', '配 电 房');
        }
      },
      under: function(){
        if(!S.flags.underpassSeen){
          S.flags.underpassSeen = true; save(); syncState();
          say('一个向下的入口，石阶上积着水。');
          say('牌子被雨打歪了，隐约能看到“地下通道”四个字。');
          say('灰豆探头往里看了看。');
          say('——黑得看不见底。');
          say('但它还是下去了。');
        } else {
          say('还是那个向下的入口。');
          say('灰豆这次没有犹豫。');
        }
        changeScene('underpass', '地 下 通 道');
      },
      river: function(){
        if(!S.flags.riversideSeen){
          S.flags.riversideSeen = true; save(); syncState();
          say('左侧有一道窄窄的缺口，通向河堤。');
          say('雨声在那儿忽然变大——');
          say('像是整条河都在下着。');
          say('灰豆侧身钻了过去。');
        } else {
          say('缺口还在那里，风从那里穿过来。');
        }
        changeScene('riverside', '河 堤');
      },
      rope: function(){
        var myInv = getInv();
        if(myInv.indexOf('rope') !== -1 || myInv.indexOf('grapnel') !== -1){
          say('晾衣绳已经不在那里了。');
          return;
        }
        if(isBloodMode()){
          say('一根晾衣绳横在两堵墙之间。');
          say('——绳子上挂着东西。');
          say('不是衣服。');
          say('灰豆抬头看了一眼。');
          say('——绳子上，挂着**一串小小的骨头**。');
          say('很小的骨头。');
          say('——浣熊大小。');
          say('灰豆跳起来，一口咬住绳子。');
          say('——很沉。');
          say('它把绳子扯了下来。', function(){
            pickup('rope'); save(); syncState();
          });
          say('绳子断了，它摔进了一堆落叶里。');
          say('——落叶里，有东西**硌了它一下**。');
          say('灰豆没敢看。');
          return;
        }
        say('一根晾衣绳横在两堵墙之间。');
        say('灰豆跳起来，一口咬住绳子，吊在半空晃了两下。', function(){
          pickup('rope'); save(); syncState();
        });
        say('绳子断了，它摔进了一堆落叶里。');
      },
      gate: function(){
        if(isBloodMode()){
          say('铁门。');
          say('——但不是那扇铁门。');
          say('灰豆伸手去推。');
          say('手指没有碰到金属。');
          say('——它**穿了过去**。');
          say('像穿过去一层薄薄的水膜。');
          say('门那边的世界，和它记忆里的，一模一样。', function(){
            setTimeout(function(){
              changeScene('neighbor', '邻 屋');
              say('灰豆走了进去。');
              say('——身后，铁门还在那里。');
              say('——像是在等下一个走进去的人。');
            }, 300);
          });
          return;
        }
        if(!S.flags.powerCut){
          say('铁门的横梁上装着一把黑色的电子锁。');
          say('指示灯是**红色**的，一闪，一闪。');
          say('灰豆伸爪去碰——');
          say('一道细小的电流窜上来，麻得它缩回爪子。');
          say('门上钉着一块小铁牌：');
          say('“**电路控制 · 请先断电**”。');
          say('——这条街上应该有一间配电房。');
          return;
        }
        if(getInv().indexOf('grapnel') !== -1){
          S.flags.gateOpen = true; save(); syncState();
          say('灰豆甩出钩爪。');
          say('挂钩在空中划了一道弧，**咬住了门顶**。');
          setTimeout(function(){
            changeScene('doorstep', '门 前');
            say('门那边，是一栋红屋顶的房子。');
          }, 300);
        }else{
          say('铁门比灰豆站起来还高。');
          say('栏杆冰凉，爪子抓不住。');
          say('门后是一栋{{红屋顶的房子}}。');
          say('窗户是黑的。');
          say('——刚才那一盏灯，也被灰豆亲手关掉了。');
        }
      },
      fire: function(){
        if(isBloodMode()){
          say('消防栓锈死了。');
          say('——上面有一道很深的划痕。');
          say('——不是爪子。');
          say('是**手指**。');
          say('五道。');
          say('从上面，一直划到下面。');
          return;
        }
        if(S.flags.powerCut){ say('消防栓在黑暗里几乎看不见。'); }
        else{
          say('路边的消防栓漆掉了大半。');
          say('灰豆凑过去，在它身上蹭了蹭。');
          say('——冰凉。');
          say('但比雨暖一点。');
        }
      },
      mailbox: function(){
        if(isBloodMode()){
          say('一个旧信箱。');
          say('——里面烧过。');
          say('灰豆扒了扒投信口。');
          say('——没有灰。');
          say('——有一封信。');
          say('信封上，收件人写的是：“**灰豆**”。');
          say('——发件人，是空白的。');
          say('——邮戳日期，是**今天**。');
          say('灰豆没有拆。');
          return;
        }
        say('一个旧信箱，锁早就锈死了。');
        say('灰豆跳上去，扒着投信口往里看。');
        say('里面有一封信。');
        say('信封上有两个名字。');
        say('一个模糊了。另一个，是“灰豆”。');
        say('……打不开。');
      },
      tree: function(){
        if(isBloodMode()){
          say('街角那棵梧桐，烧得只剩一根主干。');
          say('灰豆在树根下转了一圈。');
          say('——什么味道都没有。');
          say('只有焦味。');
          say('——但树干上，有一个**新的**刻痕。');
          say('是三个歪歪扭扭的字：');
          say('“**回来啊**”。');
          return;
        }
        say('街角有一棵梧桐，叶子落得差不多了。');
        say('树枝上挂着一些塑料袋，在风里抖。');
        say('灰豆在树根下转了一圈。');
        say('闻到一点熟悉的、干燥的味道。');
      },
      lamp: function(){
        if(isBloodMode()){
          say('这盏路灯也灭了。');
          say('——灯罩上有个洞。');
          say('像是被什么东西，**打穿**了。');
          say('——洞口边缘，有几根**很短的焦毛**。');
          return;
        }
        if(S.flags.powerCut){
          say('这盏路灯也灭了。');
          say('白天它亮的时候，灰豆的影子会被拉得很长。');
          say('现在——什么影子都没有了。');
        }else{
          say('这盏路灯比巷子里那盏亮。');
          say('灰豆的影子被拉得很长，一直伸到铁门下。');
        }
      },
      back: function(){
        changeScene('backstreet', '后 巷');
        if(isBloodMode()){
          say('灰豆走回后巷。');
          say('——它很确定，刚刚后巷里**没有这个声音**。');
          say('——一个很低的、很轻的**哼声**。');
          say('像是谁在哄谁睡觉。');
        } else {
          say('灰豆走回了后巷。');
        }
      }
    }
  },

  /* =====================================================
     门前
     ===================================================== */
  doorstep: {
    url:'assets/scene10.html', label:'门 前',
    acts: {
      steps: function(){
        if(isBloodMode()){
          say('两级石阶。');
          say('灰豆低头看了看。');
          say('——不是青苔。');
          say('是**焦黑**的痕迹。');
          say('——还有一只很小的**手印**。');
          say('——在石阶上，按得很深。');
          say('——灰豆把自己的爪子，按了上去。');
          say('——正好。');
          return;
        }
        say('两级石阶，边角被磨得圆润。');
        say('上面长了一层薄薄的青苔。');
        say('——有人经常走。');
      },
      door: function(){
        if(isBloodMode()){
          say('门关着。');
          say('——但这一次，门缝里透出的不是暖光。');
          say('是**火光**。');
          say('灰豆抬起爪子。');
          say('——门里，有很轻很轻的声音。');
          say('像是什么东西，**在门口等**。');
          say('——已经等了很久。');
          say('灰豆把爪子放在门上。');
          say('门没有锁。');
          say('——像是，一直在等谁。', function(){
            setTimeout(function(){
              changeScene('house', '红 屋 顶');
              say('它把门推开了。');
              say('——门里，站着一个人。');
              say('——背对着它。');
            }, 400);
          });
          return;
        }
        if(!S.flags.powerCut){
          say('门关着。');
          say('门缝里透出一点暖光。');
          say('灰豆抬起爪子，停在半空中。');
          say('——它认得这扇门。');
        } else {
          say('门关着。');
          say('门缝里是黑的。');
          say('——灯，是它自己关的。');
        }
        say('它用额头轻轻抵了抵门板。');
        say('门没有锁。');
        say('——像是，一直在等谁。', function(){
          setTimeout(function(){
            changeScene('house', '红 屋 顶');
            say('灰豆用爪子把门推开了一条缝。');
          }, 400);
        });
      },
      lamp: function(){
        if(isBloodMode()){
          say('门框上面那盏小灯，早就没了。');
          say('只剩下一截烧断的铁丝。');
          say('——和一圈被熏黑的墙。');
          say('——熏黑的形状，是一个人。');
          say('——站在门口的样子。');
          return;
        }
        if(!S.flags.powerCut){
          say('门框上面挂着一盏小灯。');
          say('橙黄色的，暖的。');
          say('——是这条街上，唯一还亮着的一盏。');
        } else {
          say('门框上的小灯灭了。');
          say('灯罩上还挂着几滴雨。');
          say('——但那些雨，正好让灯罩泛着一点点微光。');
        }
      },
      window: function(){
        if(isBloodMode()){
          say('窗户里什么都没有。');
          say('——玻璃早碎了。');
          say('只剩几片焦黑的碎片卡在窗框上。');
          say('——碎片里，映着灰豆自己。');
          say('——但碎片里的灰豆，**在笑**。');
          return;
        }
        if(!S.flags.powerCut){
          say('窗户里亮着一点暖光。');
          say('——像是特地为谁留着。');
        } else {
          say('窗户是黑的。');
          say('——但那个轮廓，就是它记得的那一栋。');
        }
      },
      back: function(){
        changeScene('street', '街 道');
        say('灰豆退回到铁门那边。');
      }
    }
  },

  /* =====================================================
     红屋顶
     ===================================================== */
  house: {
    url:'assets/scene5.html', label:'红 屋 顶',
    acts: {
      back: function(){ changeScene('doorstep', '门 前'); },

      frame: function(){
        var myInv = getInv();
        if(isBloodMode()){
          if(is('photoJoined')){
            say('照片已经拼好了。');
            say('灰豆不想再看它第二眼。');
            return;
          }
          if(myInv.indexOf('photo1') !== -1 && myInv.indexOf('photo2') !== -1){
            var newInvB = myInv.filter(function(i){ return i!=='photo1' && i!=='photo2'; });
            newInvB.push('photoFull'); setInv(newInvB);
            set('photoJoined', true);
            renderInv('photoFull'); save(); syncState();
            say('灰豆把两片纸拼在一起。');
            say('——但它拼不上。');
            say('左半张，不是老人和小浣熊。');
            say('左半张，是一栋**烧过的房子**。');
            say('窗户里，有一只手。');
            say('——一只很小的、浣熊的手。');
            say('——照片背面，有一行字。');
            say('——不是原来那行。');
            say('——是**刚刚写上去的**。');
            say('——“你终于回来了。”');
            say('灰豆转过身。');
            say('——身后，站着一个人。');
            say('——背对着它。');
            say('——那个人**慢慢地转过了头**。', function(){
              setTimeout(function(){ startBloodEnding(); }, 500);
            });
            return;
          }
          say('桌上有一个相框。');
          say('玻璃全碎了。');
          say('照片被撕成了两半。');
          var has1b = myInv.indexOf('photo1') !== -1;
          var has2b = myInv.indexOf('photo2') !== -1;
          if(!has1b && !has2b){
            say('两半都不在灰豆身上。');
            say('它得回去找找。');
          } else if(!has1b){
            say('还缺**左半张**。');
          } else if(!has2b){
            say('还缺**右半张**。');
          }
          return;
        }

        if(is('photoJoined')){
          say('照片还摆在桌上。');
          if(getVal('photoChoice', '') === 'half'){
            say('——只拼了一半。');
            say('灰豆不想再看它第二眼。');
          } else {
            say('老人笑着，小浣熊在他怀里，尾巴翘得老高。');
            say('一条蓝绳子。一栋红屋顶。门口的台阶。');
            say('——**全都在**。');
          }
          return;
        }
        var has1 = myInv.indexOf('photo1') !== -1;
        var has2 = myInv.indexOf('photo2') !== -1;
        if(has1 && has2){
          triggerPhotoChoice();
          return;
        }
        say('桌上有一个相框，玻璃上有一道裂痕。');
        say('照片缺了一角。');
        if(!has1 && !has2){
          say('两半都不在灰豆身上。');
          say('它得回去找找。{{雨巷的墙上，还有那间便利店。}}');
        } else if(!has1){
          say('还缺**雨巷**那半张——老人和一只小浣熊。');
        } else if(!has2){
          say('还缺**便利店**那半张——红屋顶和台阶。');
        }
      },

      chair: function(){
        if(isBloodMode()){
          say('摇椅还在慢慢地晃。');
          say('——但它没有风。');
          say('灰豆走过去，把爪子按在扶手上。');
          say('扶手上有一圈浅浅的印子。');
          say('——像是什么东西，**经常坐在那里**。');
          return;
        }
        if(is('photoJoined')){ say('摇椅还在轻轻地晃。'); say('像有人刚刚站起来，**去开门**。'); }
        else{
          say('一把旧摇椅。');
          say('灰豆跳上去，椅子吱呀一声，晃了很久。');
          say('它突然{{不想下来了}}。');
        }
      },

      bowl: function(){
        if(isBloodMode()){
          say('地上有一只小碗。');
          say('碗底结了一层黑色的东西。');
          say('——像干了的血。');
          say('碗边上刻着两个字。');
          say('灰豆没有去看。');
          return;
        }
        say('地上有一只小碗，边上刻着两个字。');
        say('——**灰豆**。');
        say('碗是干净的。好像每天都有人把它洗一遍。');
      },

      window: function(){
        if(isBloodMode()){
          say('灰豆跳到窗台上。');
          say('——窗台是烫的。');
          say('像刚刚烧过。');
          say('外面什么都没有。');
          say('没有月亮，没有街灯。');
          say('只有雨。');
          return;
        }
        say('灰豆跳到窗台上。');
        say('月亮挂在那里，像一枚不肯落下的硬币。');
        say('它用额头抵着玻璃——冰凉的。');
        say('——但比雨夜暖。');
      },

      books: function(){
        if(isBloodMode()){
          say('书架上的书，全烧焦了。');
          say('灰豆用爪子碰了碰——');
          say('书页碎成了灰。');
          say('——像有很多话，再也没有人说了。');
          return;
        }
        say('书架上排着一些旧书，书脊都褪了色。');
        say('灰豆用爪子抽出一本。');
        say('里面夹着一片枯叶，压得很平整。');
        say('叶子上写着很小很小的字：“{{给你的。}}”');
      },

      clock: function(){
        if(isBloodMode()){
          say('挂钟停了。');
          say('指针卡在凌晨两点。');
          say('——那是那栋房子烧起来的时间。');
          say('灰豆不想再看它。');
          return;
        }
        if(S.flags.powerCut){
          say('挂钟停了。');
          say('指针卡在某一个时刻。');
          say('——那是拉下电闸的瞬间。');
        }else{
          say('墙上的挂钟还在走。');
          say('滴答。滴答。');
          say('指针停在某个早就过去的时间里，却还在往前。');
        }
      },

      lamp: function(){
        if(isBloodMode()){
          say('台灯早就没了。');
          say('只剩一个铁架子。');
          say('——上面还挂着一点烧化的塑料。');
          return;
        }
        if(S.flags.powerCut){
          say('台灯灭了。');
          say('灯罩上还留着一点温度。');
          say('灰豆把爪子贴在灯罩上——凉的。');
          say('很快就凉透了。');
        }else{
          say('台灯的灯罩上落了一层薄薄的灰。');
          say('但灯还是亮的。');
          say('灰豆伸出一只爪子，在光里停了一会儿。');
          say('——像是在暖手。');
        }
      }
    }
  },

  /* =====================================================
     配电房
     ===================================================== */
  powerstation: {
    url:'assets/scene6.html', label:'配 电 房',
    acts: {
      breaker: function(){
        if(S.flags.powerCut){
          say('电闸已经在“OFF”的位置了。');
          say('电流的嗡嗡声早就停了。');
          say('整个街区都陷在安静的黑里。');
          say('灰豆站在配电柜前，没有动。');
          say('——它其实可以再推上去的。');
          say('但它没有。');
          say('有些事情，一旦做了，就不该反悔。');
          return;
        }
        say('配电柜上的电压表指针，正缓慢地左右晃着。');
        say('灰豆盯着那个写着“主电源”的红色手柄。');
        say('——拉下它，整个街区的灯都会灭。');
        say('——包括，那栋红屋顶房子窗户里的光。');
        say('灰豆犹豫了一下。');
        say('雨声在屋顶上敲着。');
        say('然后它伸出爪子，握住手柄——');
        say('**往下一拉。**');
        say('**啪。**');
        say('一道微弱的电弧闪过，照亮了灰豆的整张脸。');
        say('然后，世界暗了下来。', function(){
          S.flags.powerCut = true; save(); syncState();
          try{
            if(gameFrame && gameFrame.contentWindow){
              gameFrame.contentWindow.postMessage({ type:'powerCutNow' }, '*');
            }
          }catch(e){}
        });
        say('雨声突然变得很响。');
        say('远处的霓虹、窗灯、路灯——一盏接一盏地熄灭。');
        say('整条街，只剩下灰豆眼睛里的两点反光。');
        say('……还有，远处那栋红屋顶的房子。');
        say('它窗户里的那点暖光也灭了。');
        say('灰豆突然有点后悔。');
        say('但有些门，通了电就打不开。');
        say('——后巷那扇黄铜锁。');
        say('——街尽头那扇铁门。');
        say('现在，它们都松了。');
      },
      fuse: function(){
        if(S.flags.powerCut){
          say('保险丝盒的面板上，所有指示灯都灭了。');
          say('一排小玻璃管，安静地躺在那里。');
          say('像一排熄灭的蜡烛。');
        }else{
          say('六根保险丝，指示灯都是绿的。');
          say('每一根玻璃管里，都有一根细细的金属丝在发光。');
          say('——像很小很小的日出。');
        }
      },
      log: function(){
        say('工作台上摊着一本旧日志。');
        say('纸页泛黄，边角卷起。');
        say('灰豆用爪子小心地翻开。');
        say('最后一页写着——');
        say('“11月14日，晴。今天没下雨。');
        say('配电房漏雨修好了。');
        say('隔壁老周说，他家那只浣熊上个月走了。');
        say('脖子上的绳子断了。');
        say('我说，它会的，它会回来的。');
        say('他说，不会了。”');
        say('……');
        say('灰豆把爪子搭在纸上。');
        say('墨迹有点晕开了。');
        say('像是有谁，很久以前，在这页上落过一滴水。');
      },
      back: function(){
        if(S.flags.powerFrom === 'street'){
          changeScene('street', '街 道');
          say('灰豆退回到街上。');
        } else {
          changeScene('backstreet', '后 巷');
          say('灰豆退回到巷子里。');
        }
      }
    }
  },

  /* =====================================================
     屋顶
     ===================================================== */
  rooftop: {
    url:'assets/scene7.html', label:'屋 顶',
    acts: {
      antenna: function(){
        say('屋顶角上立着一根旧天线。');
        say('上面挂着几只塑料袋，被风吹得哗啦啦响。');
        say('灰豆爬上去，坐在天线的横梁上。');
        say('——从这里，能看到整条街。');
        if(isBloodMode()){
          say('街上什么都没有。');
          say('只有一片黑。');
        } else if(!S.flags.powerCut){
          say('灯一盏一盏亮着。');
          say('远处的红屋顶，在灯海的边缘。');
        } else {
          say('灯全灭了。');
          say('只有远处那栋红屋顶——');
          say('像一枚被雨洗过的黑色剪影。');
        }
      },
      watertank: function(){
        say('一个锈迹斑斑的水塔，立在屋顶另一角。');
        say('灰豆绕着它转了一圈。');
        say('塔身上有一圈红漆字，早看不清了。');
        say('它把爪子按在锈迹上。');
        say('——粗糙，微凉。');
        say('像什么东西在说：');
        say('“我等过很久。”');
      },
      hang: function(){
        say('两栋楼之间拉着一根晾衣绳。');
        say('上面挂着两块布，被雨淋得透亮。');
        say('灰豆用爪子碰了碰绳结。');
        say('绳子晃了一下，又晃了一下。');
        say('雨珠顺着绳子往下滑，一颗接一颗。');
      },
      houseroof: function(){
        say('灰豆趴在矮墙上，往下看。');
        say('远处有一栋房子。');
        if(isBloodMode()){
          say('红屋顶？');
          say('不。');
          say('是一片焦黑。');
        } else {
          say('红屋顶。');
          if(!S.flags.powerCut){
            say('窗户里亮着一点暖光。');
            say('——像是特地为谁留着。');
          } else {
            say('窗户是黑的。');
            say('——但那个轮廓，就是它记得的那一栋。');
          }
        }
      },
      back: function(){
        changeScene('backstreet', '后 巷');
        say('灰豆顺着消防梯下去了。');
      }
    }
  },

  /* =====================================================
     地下通道
     ===================================================== */
  underpass: {
    url:'assets/scene8.html', label:'地 下 通 道',
    acts: {
      stairs: function(){
        say('来时的楼梯。');
        say('台阶湿漉漉的，上面还留着一层积水。');
        if(!S.flags.powerCut){
          say('顶上透下一点路灯的光。');
        } else {
          say('顶上也是黑的。');
          say('——像是一个回不去的出口。');
        }
      },
      graffiti: function(){
        say('墙上的涂鸦颜色很新。');
        say('——是一颗歪歪斜斜的星星。');
        say('星星底下，还有一行字：');
        say('“今天也要活着。”');
        say('谁写的呢……');
      },
      emergency: function(){
        say('壁挂式的应急灯。');
        if(S.flags.powerCut){
          say('——红灯在闪。');
          say('一闪，一闪。');
          say('整个通道里，只有这一点还会亮。');
        } else {
          say('——灯光是暗黄色的。');
          say('像是自己也不知道在等谁。');
        }
      },
      trash: function(){
        say('一个破了的垃圾桶，倒在地上。');
        say('灰豆凑过去闻了闻。');
        say('——里面有一个硬硬的东西。');
        say('它扒了扒。');
        say('是一个易拉罐。空的。');
        say('它用爪子拨了一下，罐子滚了出去。');
      },
      room: function(){
        if(S.flags.powerCut){
          say('配电房的门。');
          say('里面还是黑的。');
          say('——灰豆已经进去过了。');
        } else {
          say('一扇铁皮门。门上贴着“配电房”。');
          say('门缝里透出一点冷光。');
          S.flags.powerFrom = 'street'; save(); syncState();
          changeScene('powerstation', '配 电 房');
        }
      },
      back: function(){
        changeScene('street', '街 道');
        say('灰豆顺着楼梯爬了上去。');
      }
    }
  },

  /* =====================================================
     河堤
     ===================================================== */
  riverside: {
    url:'assets/scene9.html', label:'河 堤',
    acts: {
      lamp: function(){
        if(S.flags.powerCut){
          say('河堤上的这盏灯也灭了。');
          say('灰豆摸了一下灯柱。');
          say('——冰凉。');
        } else {
          say('河堤上的路灯是昏黄的。');
          say('光晕被雨丝切成一小圈一小圈。');
          say('灰豆站在灯下，没动。');
        }
      },
      bench: function(){
        say('一张被雨淋湿的长椅。');
        say('木板上积了一层水。');
        say('灰豆跳上去，爪子印出一串小小的湿痕。');
        say('它坐了一会儿。');
        say('——没有人来赶它走。');
      },
      umbrella: function(){
        say('一把被丢弃的伞。');
        say('伞面塌了，只剩一根伞骨还挺着。');
        say('灰豆钻进伞下躲雨。');
        say('伞布很薄，雨从破洞里漏进来。');
        say('……但总比什么都没有强。');
      },
      river: function(){
        say('灰豆趴在栏杆上，低头看河。');
        if(!S.flags.powerCut){
          say('河面上映着对岸的灯。');
          say('一闪一闪的，像有人在眨眼。');
        } else {
          say('河面是黑的。');
          say('只有雨点在河上敲出一圈圈微弱的波纹。');
          say('——河还在。');
          say('——只是没有人再看它了。');
        }
        say('灰豆看了一会儿。');
        say('然后转身走了。');
      },
      back: function(){
        changeScene('street', '街 道');
      }
    }
  },

  /* =====================================================
     邻屋
     ★ 修复：补上 back act
     ===================================================== */
  neighbor: {
    url:'assets/scene11.html', label:'邻 屋',
    acts: {
      neighborWindow: function(){
        if(is('neighborWindowSeen')){
          say('窗外还是那栋房子。');
          say('——烧过的。');
          say('——和它记忆里，**一模一样**。');
          return;
        }
        set('neighborWindowSeen', true);
        say('窗框烧焦了，玻璃碎了一地。');
        say('雨从破洞里飘进来，打在地板上。');
        say('从这儿看出去，正好能看到那栋**红屋顶的房子**。');
        say('——但它现在是焦黑的。');
        say('——只有二楼那扇窗，还亮着一点暗红的光。');
        say('——像是什么东西，一直在里面，没有走。');
        say('灰豆盯着看了一会儿。');
        say('它的爪子，自己按在了窗台上。');
        say('——这个位置，很熟悉。');
        say('——它好像在这里，坐过很久。');
      },
      neighborFloor: function(){
        say('地板上有一串小小的爪印。');
        say('——只有一只动物的。');
        say('——不大。');
        say('比灰豆现在小很多。');
        say('爪印从窗户那边，一直延伸到床边。');
        say('——好像有一只小动物，');
        say('——在这个房间里，');
        say('——坐了很多天。');
        say('从窗台到床边，从床边到窗台。');
        say('反反复复。');
        say('——但一次也没有走到门外。');
      },
      neighborCalendar: function(){
        if(is('neighborCalendarSeen')){
          say('日历停在 11 月 14 日。');
          say('“**它回来了。**”');
          return;
        }
        set('neighborCalendarSeen', true);
        say('墙上挂着一本旧日历。');
        say('被火舌舔过，边角卷了起来。');
        say('停在 **11 月 14 日**。');
        say('——那天的格子里，有一行很小的字。');
        say('——是手指写的。');
        say('——笔迹很轻，像是写的时候，手在抖：');
        say('“**它回来了。**”');
        say('灰豆盯着那行字，很久。');
        say('——它不知道那是什么意思。');
        say('——但它觉得，自己应该知道。');
      },
      neighborBed: function(){
        if(is('neighborRopeSeen')){
          say('床还在那里。');
          say('枕头下面的蓝色绳子已经不在了。');
          say('——但凹陷还在。');
          say('——蜷着什么睡过很久的凹陷。');
          return;
        }
        set('neighborRopeSeen', true);
        save();
        say('一张烧焦的小床。');
        say('床垫上有一个凹陷。');
        say('——蜷着的。');
        say('——小小的。');
        say('枕头下面，露出一角蓝色。');
        say('灰豆把爪子伸进去——');
        say('是一根**蓝色的绳子**。');
        say('——很短。');
        say('——断口是整齐的，不是撕开的。');
        say('——像是被什么东西，**割断**的。');
        say('灰豆把绳子叼在嘴里。');
        say('很久没有动。');
        say('——它记得脖子上有过一根一样的东西。');
        say('——但它不记得，绳子是什么时候断的。');
      },
      back: function(){
        if(isBloodMode()){
          say('灰豆退回到那条街。');
          say('——铁门还在那里。');
          say('——像是在等它。');
        } else {
          say('灰豆退回到那条街。');
        }
        changeScene('street', '街 道');
      },
      exit: function(){
        say('房间另一头，有一扇门。');
        say('门板烧得只剩半边。');
        say('门缝里透出一线暗红的光。');
        say('——是那栋房子的光。');
        say('灰豆把爪子放在门上。');
        say('——门没有锁。');
        say('——像是在等它。', function(){
          setTimeout(function(){
            changeScene('doorstep', '门 前');
            say('灰豆推开了门。');
            say('外面，就是那栋房子的院子。');
          }, 400);
        });
      }
    }
  }
};

/* =========================================================
   iframe 生命周期
   ========================================================= */
var expectingLoad = false;
function destroyFrame(){
  if(!gameFrame) return;
  var old = gameFrame; gameFrame = null;
  try{
    old.style.visibility = 'hidden'; old.style.display = 'none';
    old.style.opacity = '0'; old.style.pointerEvents = 'none';
    old.style.zIndex = '-1'; old.style.left = '-9999px'; old.style.top = '-9999px';
    try{ old.src = 'about:blank'; }catch(e){}
  }catch(e){}
  try{ if(old.contentWindow && old.contentWindow.__engineStop) old.contentWindow.__engineStop(); }catch(e){}
  try{ old.contentWindow.postMessage({ type:'stop' }, '*'); }catch(e){}
  setTimeout(function(){
    if(old.parentNode){ try{ old.parentNode.removeChild(old); }catch(e){} }
  }, 300);
}
function createGameFrame(url){
  destroyFrame();
  var fresh = document.createElement('iframe');
  fresh.id = 'gameFrame';
  fresh.setAttribute('frameborder', '0');
  fresh.setAttribute('scrolling', 'no');
  fresh.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;border:none;background:#000;display:block;';
  fresh.addEventListener('load', function(){
    if(!expectingLoad) return;
    if(fresh !== gameFrame) return;
    expectingLoad = false;
    setLoadingProgress(60, 88);
  });
  stage.insertBefore(fresh, overlayEl);
  gameFrame = fresh;
  expectingLoad = true;
  fresh.src = url;
}

/* =========================================================
   加载动画
   ========================================================= */
var loadingRAF = null, loadingShown = 0, loadingTarget = 0;
var loadingCeiling = 40, loadingActive = false, loadingReady = false;
var loadingFinishCb = null, loadingSlowTimer = null, loadingErrTimer = null;
function tickLoading(){
  if(!loadingActive) return;
  if(loadingTarget < loadingCeiling) loadingTarget = Math.min(loadingTarget + 0.18, loadingCeiling);
  var diff = loadingTarget - loadingShown;
  if(Math.abs(diff) < 0.1){ loadingShown = loadingTarget; } else { loadingShown += diff * 0.14; }
  if(loadingShown > 100) loadingShown = 100;
  loadingFill.style.width = loadingShown.toFixed(2) + '%';
  loadingPctEl.textContent = Math.round(loadingShown) + '%';
  loadingRAF = requestAnimationFrame(tickLoading);
}
function showLoading(sceneName){
  loadingActive = true; loadingReady = false; loadingShown = 0; loadingTarget = 0;
  loadingCeiling = 40; loadingFinishCb = null;
  loadingNameEl.textContent = sceneName || '雨 夜 归 途';
  loadingFill.style.width = '0%';
  loadingPctEl.textContent = '0%';
  loadingTipEl.textContent = '正在准备……';
  loadingTipEl.classList.remove('slow'); loadingTipEl.classList.remove('error');
  loadingRetryEl.classList.remove('show');
  loadingEl.classList.remove('hidden');
  if(loadingRAF) cancelAnimationFrame(loadingRAF);
  loadingRAF = requestAnimationFrame(tickLoading);
  if(loadingSlowTimer) clearTimeout(loadingSlowTimer);
  if(loadingErrTimer) clearTimeout(loadingErrTimer);
  loadingSlowTimer = setTimeout(function(){
    if(!loadingReady && loadingActive){
      loadingCeiling = 90;
      loadingTipEl.textContent = '加载较慢，请稍候……';
      loadingTipEl.classList.add('slow');
    }
  }, 5000);
  loadingErrTimer = setTimeout(function(){
    if(!loadingReady && loadingActive){
      loadingCeiling = 95;
      loadingTipEl.textContent = '加载失败，可点击重试';
      loadingTipEl.classList.add('error');
      loadingRetryEl.classList.add('show');
    }
  }, 15000);
}
function setLoadingProgress(target, ceiling){
  if(!loadingActive) return;
  if(target > loadingTarget) loadingTarget = target;
  if(ceiling !== undefined) loadingCeiling = ceiling;
}
function finishLoading(callback){
  if(!loadingActive) return;
  loadingReady = true; loadingCeiling = 100; loadingTarget = 100;
  if(loadingSlowTimer){ clearTimeout(loadingSlowTimer); loadingSlowTimer = null; }
  if(loadingErrTimer){ clearTimeout(loadingErrTimer); loadingErrTimer = null; }
  loadingFinishCb = callback || null;
  var waitTop = function(){
    if(!loadingActive){ if(callback) callback(); return; }
    if(loadingShown < 99.5){ requestAnimationFrame(waitTop); return; }
    setTimeout(function(){
      loadingActive = false;
      if(loadingRAF){ cancelAnimationFrame(loadingRAF); loadingRAF = null; }
      loadingEl.classList.add('hidden');
      var cb = loadingFinishCb;
      loadingFinishCb = null;
      if(cb) cb();
    }, 200);
  };
  waitTop();
}
loadingRetryEl.addEventListener('click', function(){
  loadingRetryEl.classList.remove('show');
  var sceneName = S ? S.scene : 'alley';
  if(SCENES[sceneName]){
    showLoading(SCENES[sceneName].label);
    createGameFrame(sceneURL(sceneName));
  }
});

function changeScene(name, label){
  if(!SCENES[name]) return;
  S.scene = name; save();
  showLoading(label || SCENES[name].label);
  createGameFrame(sceneURL(name));
}

/* =========================================================
   iframe 通信
   ========================================================= */
var pendingOpeningMonologue = false;
window.addEventListener('message', function(e){
  var d = e.data;
  if(!d || !d.type) return;

  if(d.type === 'engineError'){
    loadingActive = true;
    loadingCeiling = 100;
    loadingTarget = 100;
    loadingTipEl.textContent = '⚠ ' + (d.message || '引擎错误');
    loadingTipEl.classList.add('error');
    loadingRetryEl.classList.add('show');
    return;
  }

  if(!gameFrame || !gameFrame.contentWindow) return;
  if(e.source !== gameFrame.contentWindow) return;
  if(d.type === 'ready'){
    syncState();
    finishLoading(function(){
      try{
        gameFrame.contentWindow.postMessage({ type:'refocus' }, '*');
      }catch(err){}
      if(pendingOpeningMonologue){
        pendingOpeningMonologue = false;
        setTimeout(function(){
          say('雨下了**三天**。');
          say('城市把一半的灯都关掉了。');
          say('灰豆在垃圾桶后面醒过来，湿得像一块抹布。');
          say('它记得一些事。{{不多。}}');
          say('一个老人。一双粗糙的手。还有一个**红色的屋顶**。');
          say('它决定去找那个屋顶。');
        }, 420);
      } else {
        maybeShowSilhouette(S.scene);
      }
    });
  }
  if(d.type === 'bloodAcknowledge'){
    if(!S || !S.flags) return;
    var ackId = d.id;
    if(!ackId) return;
    if(!S.flags.b_acked) S.flags.b_acked = {};
    if(S.flags.b_acked[ackId]) return;
    S.flags.b_acked[ackId] = true;

    var cnt = 0;
    for(var k in S.flags.b_acked){ if(S.flags.b_acked[k]) cnt++; }
    S.flags.b_knows = cnt;
    save(); syncState();

    var ackTexts = {
      pawprints: [
        '灰豆看着那串爪印。',
        '——它认得那双小脚。',
        '“是我。”'
      ],
      ropeEnd: [
        '灰豆把断绳叼起来。',
        '断口是齐的。',
        '“是我咬断的。”'
      ],
      photoBack: [
        '灰豆把相框翻了过来。',
        '背面的字，是它写的。',
        '“我那天……跑掉了。”'
      ]
    };
    if(ackTexts[ackId]){
      ackTexts[ackId].forEach(function(l){ say(l); });
    }
  }
  if(d.type === 'hit'){
    if(!S) return;
    var sc = SCENES[S.scene];
    if(!sc) return;
    var act = sc.acts[d.spotId];
    if(act) act();
  }
});
function syncState(){
  if(!S || !gameFrame || !gameFrame.contentWindow) return;
  try{
    gameFrame.contentWindow.postMessage({ type: 'setState', state: S }, '*');
    gameFrame.contentWindow.postMessage({ type: 'setEnding', value: endingShown }, '*');
  }catch(e){}
}
function triggerHighlight(){
  if(!gameFrame || !gameFrame.contentWindow) return;
  try{ gameFrame.contentWindow.postMessage({ type: 'setHighlight', duration: 5 }, '*'); }catch(e){}
}
function triggerTempLight(){
  if(!gameFrame || !gameFrame.contentWindow) return;
  try{ gameFrame.contentWindow.postMessage({ type: 'tempLight' }, '*'); }catch(e){}
}

btnTempLightEl.addEventListener('click', function(e){
  e.stopPropagation();
  if(settings.streamerMode !== 'on') return;
  if(isBloodMode()){
    toast('🩸 暗夜模式中不提供该功能');
    return;
  }
  triggerTempLight();
  toast('✨ 全局点亮 · 3 秒');
});

/* =========================================================
   对话系统
   ========================================================= */
var SPEEDS = { slow: 58, normal: 30, fast: 14, instant: 0 };
var typing = { active:false, spans:[], idx:0, acc:0 };
var queue = [];
var currentDlg = null;
var comboLock = false;

function parseRich(text){
  var out = [], stack = [];
  var i = 0;
  while(i < text.length){
    if(text.startsWith('**', i)){ var k1=stack.lastIndexOf('b'); if(k1>=0) stack.splice(k1,1); else stack.push('b'); i+=2; continue; }
    if(text.startsWith('{{', i)){ stack.push('g'); i+=2; continue; }
    if(text.startsWith('}}', i)){ var k2=stack.lastIndexOf('g'); if(k2>=0) stack.splice(k2,1); i+=2; continue; }
    if(text.startsWith('[[', i)){ stack.push('w'); i+=2; continue; }
    if(text.startsWith(']]', i)){ var k3=stack.lastIndexOf('w'); if(k3>=0) stack.splice(k3,1); i+=2; continue; }
    if(text.startsWith('<<', i)){ stack.push('r'); i+=2; continue; }
    if(text.startsWith('>>', i)){ var k4=stack.lastIndexOf('r'); if(k4>=0) stack.splice(k4,1); i+=2; continue; }
    out.push({ch:text[i], cls:stack.slice().join(' ')});
    i++;
  }
  return out;
}
function typeLine(text){
  var tokens = parseRich(text);
  dlgEl.innerHTML = '';
  var frag = document.createDocumentFragment();
  var spans = [];
  for(var i=0;i<tokens.length;i++){
    var tk = tokens[i];
    var sp = document.createElement('span');
    sp.textContent = tk.ch;
    if(tk.cls) sp.className = tk.cls;
    sp.style.opacity = '0';
    frag.appendChild(sp);
    spans.push(sp);
  }
  dlgEl.appendChild(frag);
  var spd = SPEEDS[settings.textSpeed] !== undefined ? SPEEDS[settings.textSpeed] : 30;
  typing = { active:true, spans:spans, idx:0, acc:0 };
  if(spd === 0 || spans.length === 0) finishTyping();
}
function finishTyping(){
  typing.active = false;
  for(var i=0;i<typing.spans.length;i++) typing.spans[i].style.opacity = '1';
}
var lastTyping = performance.now();
function tickTyping(){
  var now = performance.now();
  var dt = Math.min(0.05, (now - lastTyping) / 1000);
  lastTyping = now;
  if(!typing.active) return;
  var spd = SPEEDS[settings.textSpeed] !== undefined ? SPEEDS[settings.textSpeed] : 30;
  if(spd === 0){ finishTyping(); return; }
  typing.acc += dt * 1000;
  while(typing.acc >= spd && typing.idx < typing.spans.length){
    typing.acc -= spd;
    typing.spans[typing.idx].style.opacity = '1';
    typing.idx++;
  }
  if(typing.idx >= typing.spans.length) typing.active = false;
}
setInterval(tickTyping, 30);

function say(text, cb){ queue.push({text:text, cb:cb}); if(!currentDlg) nextDlg(); }

function nextDlg(){
  if(queue.length === 0){
    currentDlg = null;
    dlgEl.classList.remove('show');
    dlgMaskEl.classList.remove('show');
    choiceBoxEl.classList.remove('show');
    try{
      if(gameFrame && gameFrame.contentWindow){
        gameFrame.contentWindow.postMessage({ type:'dlgClosed' }, '*');
      }
    }catch(err){}
    checkCombos();
    return;
  }

  var item = queue.shift();

  if(item.choice){
    currentDlg = null;
    dlgEl.classList.remove('show');
    dlgMaskEl.classList.remove('show');
    try{
      if(gameFrame && gameFrame.contentWindow){
        gameFrame.contentWindow.postMessage({ type:'dlgClosed' }, '*');
      }
    }catch(err){}
    presentChoice(item.options, function(v){
      if(item.onPick) item.onPick(v);
      if(!currentDlg) nextDlg();
    });
    return;
  }

  currentDlg = item;
  dlgEl.classList.add('show');
  dlgMaskEl.classList.add('show');
  try{
    if(gameFrame && gameFrame.contentWindow){
      gameFrame.contentWindow.postMessage({ type:'dlgOpen' }, '*');
    }
  }catch(err){}
  typeLine(currentDlg.text);
}
function advanceDialog(){
  if(!currentDlg) return;
  if(typing.active){ finishTyping(); return; }
  var cb = currentDlg.cb;
  currentDlg = null;
  nextDlg();
  if(cb) cb();
}
dlgEl.addEventListener('click', function(e){ e.stopPropagation(); advanceDialog(); });
dlgEl.addEventListener('touchend', function(e){ e.stopPropagation(); e.preventDefault(); advanceDialog(); }, {passive:false});
dlgMaskEl.addEventListener('click', function(e){ e.stopPropagation(); if(currentDlg) advanceDialog(); });
dlgMaskEl.addEventListener('touchend', function(e){ e.stopPropagation(); e.preventDefault(); if(currentDlg) advanceDialog(); }, {passive:false});

function checkCombos(){
  if(comboLock || !S) return;
  comboLock = true;
  var myInv = getInv();

  if(myInv.indexOf('torch') !== -1 && myInv.indexOf('battery') !== -1){
    if(!is('torchBrokenTold')){
      set('torchBrokenTold', true);
      save();
      comboLock = false;
      say('灰豆把电池塞进手电筒，用牙咬住尾部转了一圈。');
      say('啪。');
      say('——什么都没发生。');
      say('');
      say('它又试了一次。');
      say('——灯，还是不亮。');
      say('');
      say('灰豆把电池取出来，翻过来，再塞进去。');
      say('这次它咬得很紧。');
      say('——还是黑的。');
      say('');
      say('它把手电筒贴在耳朵上，摇了摇。');
      say('里面有什么东西，**松了**。');
      say('——像是一个早就坏掉的东西。');
      say('');
      say('灰豆把坏掉的手电筒放在地上，用爪子按了按。');
      say('（手电筒坏了。这一路，只能摸黑走。）');
      return;
    }
  }

  if(myInv.indexOf('hook') !== -1 && myInv.indexOf('rope') !== -1 && myInv.indexOf('grapnel') === -1){
    var n = myInv.filter(function(i){ return i!=='hook' && i!=='rope'; });
    n.push('grapnel');
    setInv(n);
    renderInv('grapnel'); save(); syncState();
    comboLock = false;
    say('灰豆把晾衣绳一圈一圈缠在挂钩上，打了个死结。');
    say('**歪歪扭扭**的，但看起来挺结实。');
    return;
  }
  comboLock = false;
}

/* =========================================================
   物品栏 / 提示
   ========================================================= */
function renderInv(newId){
  invEl.innerHTML = '';
  if(!S) return;
  var arr = getInv();
  for(var i=0;i<arr.length;i++){
    (function(id){
      var it = ITEMS[id];
      if(!it) return;
      var d = document.createElement('div');
      d.className = 'slot' + (id === newId ? ' new' : '');

      var iconEl = document.createElement('span');
      iconEl.className = 'slot-icon';
      iconEl.textContent = it.icon;
      d.appendChild(iconEl);

      var nameEl = document.createElement('span');
      nameEl.className = 'slot-name';
      nameEl.textContent = it.name;
      d.appendChild(nameEl);

      if(id === 'torchOn' && is('torchOn')){
        d.style.borderColor = 'rgba(255,214,140,0.95)';
        d.style.boxShadow = '0 0 20px rgba(255,200,120,0.65), 0 4px 16px rgba(0,0,0,.55)';
        d.style.background = 'linear-gradient(180deg,rgba(60,48,26,.95),rgba(30,22,12,.95))';
      }

      var handler = function(ev){
        ev.stopPropagation();
        if(id === 'torchOn'){
          var cur = is('torchOn');
          set('torchOn', !cur);
          if(!isBloodMode()) S.flags.lightsOn = !cur;
          save(); syncState(); renderInv();
          if(!cur){ toast('🔦 手电筒已打开 · 光会跟随你的手指 / 光标'); }
          else { toast('🔦 手电筒已关闭'); }
          return;
        }
        toast(it.name + ' · ' + it.desc);
      };

      d.addEventListener('click', handler);
      d.addEventListener('touchend', function(ev){ ev.preventDefault(); handler(ev); }, {passive:false});
      invEl.appendChild(d);
    })(arr[i]);
  }
}
var toastTimer = null;
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.remove('gold');
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){
    toastEl.classList.remove('show');
    toastEl.classList.remove('gold');
  }, 3000);
}
function toastGold(msg){
  toastEl.textContent = msg;
  toastEl.classList.remove('gold');
  void toastEl.offsetWidth;
  toastEl.classList.add('gold');
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){
    toastEl.classList.remove('show');
    toastEl.classList.remove('gold');
  }, 4200);
}
function pickup(id){
  if(!S || !ITEMS[id]) return;
  var arr = getInv();
  if(arr.indexOf(id) !== -1) return;
  arr.push(id);
  renderInv(id);
  toast('获得 · ' + ITEMS[id].name);
  save();
}

/* =========================================================
   结局
   ========================================================= */
function startEnding(){
  if(endingLock) return;
  endingLock = true;
  if(!getAchievementCount() || !loadAchievements()['truth_daybreak']){
    unlockAchievement('truth_daybreak');
  }
  say('门外传来脚步声。');
  say('钥匙插进锁孔，转了一圈。');
  say('门开了。');
  say('一个女孩站在门口，伞还在滴水。');
  say('她看着灰豆，很久，很久。');
  say('“{{你回来了。}}”');
  say('灰豆不认识她。');
  say('但它认得这个味道——');
  say('是被**留下**的味道。', function(){ showEnding(); });
}
function showEnding(){
  endingShown = true; syncState();
  endEl.classList.add('show');
}

function startBloodEnding(){
  if(endingLock) return;
  endingLock = true;

  var count = 0;
  if(S && S.flags && S.flags.b_acked){
    for(var k in S.flags.b_acked){ if(S.flags.b_acked[k]) count++; }
  }
  S.flags.b_knows = count;

  if(count >= 3){
    unlockAchievement('blood_full');
  } else if(count === 2){
    unlockAchievement('blood_half');
  } else {
    unlockAchievement('blood_dark');
  }

  setTimeout(function(){
    endingShown = true; syncState();
    bloodEndEl.classList.add('show');
  }, 500);
}

document.getElementById('btnAgain').addEventListener('click', function(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  endEl.classList.remove('show');
  endingShown = false; endingLock = false;
  beginGame(freshState(), true); save();
});

document.getElementById('btnBloodAgain').addEventListener('click', function(){
  if(this.disabled) return;
  var btn = this;
  btn.disabled = true;
  btn.textContent = '— 完 —';

  setTimeout(function(){
    bloodEndEl.style.transition = 'opacity 7s ease';
    bloodEndEl.style.opacity = '0';
  }, 1400);

  setTimeout(function(){
    bloodEndEl.classList.remove('show');
    bloodEndEl.style.opacity = '';
    bloodEndEl.style.transition = '';

    var curtain = document.getElementById('finalCurtain');
    if(!curtain){
      curtain = document.createElement('div');
      curtain.id = 'finalCurtain';
      curtain.style.cssText =
        'position:absolute;inset:0;background:#000;z-index:9999;' +
        'display:flex;align-items:center;justify-content:center;' +
        'opacity:0;transition:opacity 3s ease;pointer-events:auto;';
      var word = document.createElement('div');
      word.textContent = '—— 雨 还 在 下 ——';
      word.style.cssText =
        'color:#3a0a0e;font-family:inherit;font-size:13px;' +
        'letter-spacing:8px;user-select:none;';
      curtain.appendChild(word);
      document.getElementById('stage').appendChild(curtain);
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          curtain.style.opacity = '1';
        });
      });
    }
  }, 8600);
});

document.getElementById('btnForgetAgain').addEventListener('click', function(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  forgetEndEl.classList.remove('show');
  endingShown = false; endingLock = false;
  beginGame(freshState(), true); save();
});

/* =========================================================
   成就面板按钮
   ========================================================= */
btnAchvEl.addEventListener('click', function(){
  openAchvPanel();
});
document.getElementById('btnCloseAchv').addEventListener('click', function(){
  closeAchvPanel();
});
achvPanelEl.addEventListener('click', function(e){
  if(e.target === achvPanelEl) closeAchvPanel();
});

/* =========================================================
   设置 / 警告
   ========================================================= */
document.getElementById('btnSet').addEventListener('click', function(){ setEl.classList.add('show'); applySettings(); });
document.getElementById('btnCloseSet').addEventListener('click', function(){ setEl.classList.remove('show'); });
document.getElementById('btnHighlight').addEventListener('click', function(){
  triggerHighlight(); setEl.classList.remove('show');
  toast('🔍 可交互物品高亮 · 5 秒');
});
document.querySelectorAll('.opts').forEach(function(group){
  group.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-v]');
    if(!btn) return;
    var key = group.dataset.key, v = btn.dataset.v;
    if(key === 'fontSize') v = Number(v);
    settings[key] = v;
    saveSettings(); applySettings();
    if(key === 'streamerMode'){
      if(v === 'on'){ toast('🎬 主播模式已开启'); }
      else{ toast('主播模式已关闭'); }
    }
  });
});
var warnMask = document.getElementById('warnMask');
var warnConfirm = document.getElementById('warnConfirm');
var warnCancel = document.getElementById('warnCancel');
document.getElementById('btnReset').addEventListener('click', function(){ warnMask.classList.add('show'); });
warnCancel.addEventListener('click', function(){ warnMask.classList.remove('show'); toast('已取消'); });
warnConfirm.addEventListener('click', function(){
  warnMask.classList.remove('show');
  try{ localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SET_KEY); }catch(e){}
  toast('进度已清除 · 即将重启');
  setTimeout(function(){ location.reload(); }, 700);
});
warnMask.addEventListener('click', function(e){ if(e.target === warnMask) warnMask.classList.remove('show'); });

/* =========================================================
   返回键拦截
   ========================================================= */
var historyOk = false;
try{ history.pushState({ page:'game' }, '', location.href); historyOk = true; }catch(e){}
function handleBack(){
  if(loadingActive) return true;
  if(achvPanelEl.classList.contains('show')){ closeAchvPanel(); return true; }
  if(currentDlg){ advanceDialog(); return true; }
  if(choiceBoxEl.classList.contains('show')) return true;
  if(streamerBlockMask.classList.contains('show')){ streamerBlockMask.classList.remove('show'); return true; }
  if(streamerWarnMask.classList.contains('show')){ streamerWarnMask.classList.remove('show'); return true; }
  if(bloodWarnMask.classList.contains('show')){ bloodWarnMask.classList.remove('show'); return true; }
  if(warnMask.classList.contains('show')){ warnMask.classList.remove('show'); return true; }
  if(setEl.classList.contains('show')){ setEl.classList.remove('show'); return true; }
  if(endingShown) return true;
  setEl.classList.add('show'); applySettings();
  return true;
}
window.addEventListener('popstate', function(){
  if(historyOk){ try{ history.pushState({ page:'game' }, '', location.href); }catch(e){} }
  handleBack();
});
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    if(achvPanelEl.classList.contains('show')){ closeAchvPanel(); return; }
    if(streamerBlockMask.classList.contains('show')){ streamerBlockMask.classList.remove('show'); return; }
    if(streamerWarnMask.classList.contains('show')){ streamerWarnMask.classList.remove('show'); return; }
    if(bloodWarnMask.classList.contains('show')){ bloodWarnMask.classList.remove('show'); return; }
    if(warnMask.classList.contains('show')){ warnMask.classList.remove('show'); return; }
    if(setEl.classList.contains('show')){ setEl.classList.remove('show'); return; }
    if(currentDlg){ advanceDialog(); return; }
  }
});

/* =========================================================
   开始游戏 / 初始化
   ========================================================= */
function beginGame(state, isNew){
  S = state;
  if(S.flags){ S.flags.ended = false; }
  endingShown = false; endingLock = false;
  if(S.flags) S.flags.streamerMode = (settings.streamerMode === 'on');
  renderInv(); applySettings();
  var sceneName = S.scene;
  if(SCENES[sceneName]){
    showLoading(SCENES[sceneName].label);
    setLoadingProgress(15, 45);
    createGameFrame(sceneURL(sceneName));
  }
  pendingOpeningMonologue = isNew;
}
(function init(){
  try{
    resize(); applySettings();
    renderAchvProgress();
    updateAchvUnread();
    var mode = 'new';
    try{
      mode = localStorage.getItem(LAUNCH_KEY) || 'new';
      localStorage.removeItem(LAUNCH_KEY);
    }catch(e){}
    var state, isNew;
    if(mode === 'continue'){
      var saved = loadSave();
      if(saved){ state = saved; isNew = false; }
      else{ state = freshState(); isNew = true; }
    }else{
      try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
      state = freshState(); isNew = true;
    }
    beginGame(state, isNew); save();
  }catch(err){
    console.error('[init 失败]', err);
    var tip = document.getElementById('loadingTip');
    if(tip){ tip.textContent = '启动失败：' + (err.message || err); tip.classList.add('error'); }
    var retry = document.getElementById('loadingRetry');
    if(retry) retry.classList.add('show');
  }
})();

})();