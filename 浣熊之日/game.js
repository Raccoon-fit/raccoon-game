/* ================================================================
   アライグマの日 — 翌日
   自研ホラーエンジン · 外部依存ゼロ · 全プラットフォーム対応
   コア機構：前に進むのみ · 日数進行 · 日常の漸進的崩壊
   ================================================================ */
(function(){
'use strict';

// ==================== 多言語テキスト ====================
const I18N = {
    ja: {
        title: 'アライグマの日',
        subtitle: '— 翌日 —',
        lore: '君は最後のアライグマ。<br>明日は必ず来る。<br>だが明日は、今日よりもっと悪い。',
        startBtn: '翌日へ踏み出す',
        hint: '→ 前に進む（戻れない） ←',
        dayNames: ['DAY 1','DAY 2','DAY 3','DAY 4','LAST DAY'],
        dayLabel: ['翌日','翌日','翌日','殪日','——'],
        daySub: ['世界がまた一層腐った','何か違和感がある','家への道が長くなった','何かが一緒に帰ってきた','もう明日はない'],
        whispers: ['見えるだろ…','助けて…','振り向くな…','それが君についてる…','明日は来ない…','君の顔が腐ってる…','………'],
        anomalyPhrases: ['……','殺','死','見','還','来','連','伜','不','逃'],

        // 最終日前の警告
        preFinal1: '家まであと少し',
        preFinal2: '何かが背後にいる',
        preFinal3: '灯りが消える',
        preFinal4: '自分の足音ではない',

        // エンディング（真の恐怖）
        endingSurvive: '生還',
        endingSurviveText: '家の扉を開ける。<br>部屋には誰かがいた。<br>それは君の顔をしていた。<br><br>ドアを閉めた。<br>鍵はなかった。',
        endingSurviveStats: (n)=>`君は${n}つの翌日を生き延びた。`,

        endingConsumed: '同化',
        endingConsumedText: '気づけば、歩く速度が遅くなっていた。<br>足が地面に根を張り始めている。<br>振り向くと——自分の体がいない。<br><br>道が君を飲み込んだ。',
        endingConsumedStats: (n)=>`君は${n}つの翌日で姿を消した。`,

        endingAlone: '独り',
        endingAloneText: '家に着いた。<br>誰もいない。<br>いや——何かがいる。<br>それは「家族」の形をしていた。<br><br>暗闇が微笑んだ。',
        endingAloneStats: (n)=>`君は${n}つの翌日を歩いた。`,

        endingFinal: '——',
        endingFinalText: '振り向くな。<br>振り向くな。<br>振り向くな。<br><br>だが君は振り向いた。',
        endingFinalStats: '',

        langBtn: 'JA',
    },
    zh: {
        title: '浣熊之日',
        subtitle: '— 翌日 —',
        lore: '你是最后一只浣熊。<br>明天总会到来。<br>而明天，总比今天更糟。',
        startBtn: '踏入翌日',
        hint: '→ 向前走（无法回头） ←',
        dayNames: ['DAY 1','DAY 2','DAY 3','DAY 4','LAST DAY'],
        dayLabel: ['翌日','翌日','翌日','殪日','——'],
        daySub: ['世界又腐烂了一层','你注意到一些不同','回家的路变长了','有些东西跟你回家了','没有明天了'],
        whispers: ['你能看见我吧…','救救我…','不要回头…','它跟着你…','明天不会来了…','你的脸在腐烂…','………'],
        anomalyPhrases: ['……','殺','死','见','还','来','跟','你','不','逃'],

        preFinal1: '就快到家了',
        preFinal2: '有什么在身后',
        preFinal3: '灯要灭了',
        preFinal4: '那不是你的脚步声',

        endingSurvive: '生还',
        endingSurviveText: '你打开家门。<br>屋里有人。<br>那张脸和你一模一样。<br><br>你关上门。<br>没有锁。',
        endingSurviveStats: (n)=>`你从 ${n} 个翌日中活了下来。`,

        endingConsumed: '同化',
        endingConsumedText: '你发现脚步越来越慢。<br>脚在往地里生根。<br>回头时——身体已经不在了。<br><br>路把你吞了下去。',
        endingConsumedStats: (n)=>`你在第 ${n} 个翌日消失了。`,

        endingAlone: '独处',
        endingAloneText: '你到了家。<br>没有人在。<br>不——有东西在。<br>它有着「家人」的形状。<br><br>黑暗冲你微笑。',
        endingAloneStats: (n)=>`你走过了 ${n} 个翌日。`,

        endingFinal: '——',
        endingFinalText: '不要回头。<br>不要回头。<br>不要回头。<br><br>但你还是回头了。',
        endingFinalStats: '',

        langBtn: 'ZH',
    }
};

let currentLang = 'ja'; // デフォルト：日本語

function t(key){
    const dict = I18N[currentLang];
    return dict[key] || I18N.ja[key] || key;
}
function tf(key, ...args){
    const fn = t(key);
    return typeof fn === 'function' ? fn(...args) : fn;
}

// ==================== 日数設定 ====================
const DAYS = [
    {
        name: 'DAY 1', label:'翌日', sub:'世界がまた一層腐った',
        decay: 0.0,
        bgTint: '#0a0a0e', groundTint:'#15151a', skyTint:'#0d0d12',
        lightLevel: 1.0, fogAlpha: 0.0,
        anomalyChance: 0.0, eventCount: 0,
        palette: { wall:'#1a1a22', wallTop:'#222230', wallEdge:'#111118', floor:'#12121a', floorAlt:'#101018', detail:'#1e1e28' },
        ambients: [55, 82],
        whisperText: '',
        ending: null,
    },
    {
        name: 'DAY 2', label:'翌日', sub:'何か違和感がある',
        decay: 0.15,
        bgTint: '#0c0808', groundTint:'#161112', skyTint:'#100a0a',
        lightLevel: 0.85, fogAlpha: 0.08,
        anomalyChance: 0.12, eventCount: 1,
        palette: { wall:'#1c1518', wallTop:'#251820', wallEdge:'#120c10', floor:'#141012', floorAlt:'#11100e', detail:'#221820' },
        ambients: [52, 78, 110],
        whisperText: '見えるだろ…',
        ending: null,
    },
    {
        name: 'DAY 3', label:'翌日', sub:'家への道が長くなった',
        decay: 0.35,
        bgTint: '#100808', groundTint:'#1a1010', skyTint:'#150a0a',
        lightLevel: 0.65, fogAlpha: 0.18,
        anomalyChance: 0.25, eventCount: 2,
        palette: { wall:'#1e1212', wallTop:'#2a1818', wallEdge:'#140808', floor:'#161010', floorAlt:'#131010', detail:'#2a1a1a' },
        ambients: [48, 72, 130],
        whisperText: '振り向くな…',
        ending: null,
    },
    {
        name: 'DAY 4', label:'殪日', sub:'何かが一緒に帰ってきた',
        decay: 0.6,
        bgTint: '#140606', groundTint:'#1e0e0e', skyTint:'#1a0808',
        lightLevel: 0.4, fogAlpha: 0.3,
        anomalyChance: 0.4, eventCount: 3,
        palette: { wall:'#201010', wallTop:'#301818', wallEdge:'#180808', floor:'#180c0c', floorAlt:'#150a0a', detail:'#301818' },
        ambients: [44, 66, 150],
        whisperText: '君の体に…死人の匂いがする…',
        ending: null,
    },
    {
        name: 'LAST DAY', label:'——', sub:'もう明日はない',
        decay: 0.9,
        bgTint: '#1a0404', groundTint:'#220a0a', skyTint:'#1e0606',
        lightLevel: 0.2, fogAlpha: 0.5,
        anomalyChance: 0.6, eventCount: 4,
        palette: { wall:'#241010', wallTop:'#381818', wallEdge:'#1a0808', floor:'#1c0808', floorAlt:'#180606', detail:'#381818' },
        ambients: [40, 60, 180],
        whisperText: '………',
        ending: 'escape',
    },
];

// ==================== シーン設定 ====================
const SEGMENT_LENGTHS = [900, 1000, 1100, 1200, 1300];
const PLAYER_WALK_SPEED = 60;
const PLAYER_SCREEN_POS = 0.35;

// ==================== 状態 ====================
const STATE = { TITLE:0, WALKING:1, TRANSITION:2, ENDING:3 };
let gameState = STATE.TITLE;

let currentDay = 0;
let segmentWidth = 0;
let playerX = 0;
let playerScreenX = 0;
let cameraX = 0;
let walkProgress = 0;
let isWalking = false;

let canvas, ctx, W, H;
let titleCanvas, titleCtx, tW, tH;
let lastTime = 0;
let rafId = null;
let keys = {};
let decayLevel = 0;

// ==================== シーン要素 ====================
let sceneObjects = [];
let anomalies = [];
let triggeredAnomalies = new Set();
let particles = [];
let whispers = [];

// ==================== オーディオ ====================
let audioCtx = null, masterGain = null;
function initAudio(){
    try {
        audioCtx = new (window.AudioContext||window.webkitAudioContext)();
        masterGain = audioCtx.createGain(); masterGain.gain.value=0.25; masterGain.connect(audioCtx.destination);
    } catch(e){ audioCtx=null; }
}
function tone(freq,dur,type,vl){
    if(!audioCtx) return;
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type||'sine'; o.frequency.value=freq; g.gain.value=vl||0.2;
    o.connect(g); g.connect(masterGain); o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+dur);
    o.stop(audioCtx.currentTime+dur);
}
function noise(dur,vl){
    if(!audioCtx) return;
    const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*dur,audioCtx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
    const s=audioCtx.createBufferSource(); s.buffer=buf;
    const g=audioCtx.createGain(); g.gain.value=vl||0.15;
    s.connect(g); g.connect(masterGain); s.start();
}

let ambientTimer = null;
function startAmbient(dayCfg){
    stopAmbient();
    const tick = ()=>{
        if(gameState!==STATE.WALKING) return;
        const amb = dayCfg.ambients;
        tone(amb[0]+Math.random()*8, 2.5, 'sine', 0.06);
        if(amb[2]) tone(amb[2]+Math.random()*15, 1.5, 'triangle', 0.03);
        if(Math.random()<0.2) noise(0.4, 0.02);
        if(Math.random() < 0.1 + decayLevel*0.3) {
            const phrases = I18N[currentLang].whispers;
            spawnWhisper(phrases[Math.floor(Math.random()*phrases.length)]);
        }
        ambientTimer = setTimeout(tick, 1800+Math.random()*2500);
    };
    tick();
}
function stopAmbient(){ if(ambientTimer){clearTimeout(ambientTimer);ambientTimer=null;} }

// ==================== ユーティリティ ====================
const $ = id=>document.getElementById(id);
const rand=(a,b)=>Math.random()*(b-a)+a;
const randi=(a,b)=>Math.floor(rand(a,b+1));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const safeR=r=>Math.max(r,0.5);

// ==================== シーン生成 ====================
function generateScene(dayIdx){
    const cfg = DAYS[dayIdx];
    const segLen = SEGMENT_LENGTHS[dayIdx];
    segmentWidth = segLen;
    sceneObjects = [];
    anomalies = [];
    triggeredAnomalies.clear();
    particles = [];
    whispers = [];

    const decoTypes = ['grass','stone','crack','stain','bone','meat'];
    const decoCount = Math.floor(segLen / 40);
    for(let i=0;i<decoCount;i++){
        const x = rand(20, segLen-20);
        const t = decoTypes[randi(0, dayIdx>=2?5:1)];
        sceneObjects.push({ type:'deco', sub:t, x, y:0, w:rand(6,18), h:rand(4,12), seed:rand(0,100) });
    }

    const bgCount = Math.floor(segLen / 120);
    for(let i=0;i<bgCount;i++){
        const x = rand(40, segLen-40);
        const w = rand(30, 80);
        const h = rand(40, 100);
        const isHouse = Math.random()<0.5;
        sceneObjects.push({ type:isHouse?'house':'wall', x, y:0, w, h, seed:rand(0,100) });
        const winCount = randi(1,3);
        for(let j=0;j<winCount;j++){
            sceneObjects.push({ type:'window', x:x+rand(5,w-12), y:rand(10,h*0.3), w:rand(6,10), h:rand(8,14), seed:rand(0,100) });
        }
    }

    const lampCount = Math.floor(segLen/200);
    for(let i=0;i<lampCount;i++){
        sceneObjects.push({ type:'lamp', x:rand(60,segLen-60), y:0, w:4, h:rand(35,55), seed:rand(0,100) });
    }

    const anomalyDefs = [
        { type:'shadow', name:'窓際の人影', chance:0.5 },
        { type:'blood', name:'血痕蔓延', chance:0.4 },
        { type:'eyes', name:'暗所の目', chance:0.3 },
        { type:'figure', name:'遠方の人影', chance:0.3 },
        { type:'whisper', name:'耳元の囁き', chance:0.6 },
        { type:'flicker', name:'明滅する灯', chance:0.4 },
        { type:'crack', name:'地面の亀裂', chance:0.3 },
        { type:'face', name:'壁の顔', chance:0.2 },
        { type:'hand', name:'地面から伸びる手', chance:0.15 },
        { type:'meat', name:'正体不明の肉塊', chance:0.2 },
    ];

    const evtCount = cfg.eventCount;
    let placed = 0, tries = 0;
    while(placed < evtCount && tries < 100){
        const def = anomalyDefs[randi(0, anomalyDefs.length-1)];
        if(Math.random() > def.chance * (1+dayIdx*0.3)) { tries++; continue; }
        const x = rand(100, segLen-100);
        if(anomalies.some(a=>Math.abs(a.x-x)<80)) { tries++; continue; }
        anomalies.push({ type:def.type, name:def.name, x, triggered:false, seed:rand(0,100), intensity: 0.3+dayIdx*0.2 });
        placed++; tries++;
    }

    sceneObjects.sort((a,b)=>a.x-b.x);
    anomalies.sort((a,b)=>a.x-b.x);
}

// ==================== 描画メイン ====================
function draw(){
    if(!ctx) return;

    if(finalCrawlActive){
        drawFinalCrawl();
        return;
    }

    const cfg = DAYS[currentDay];
    const p = cfg.palette;

    const skyGrad = ctx.createLinearGradient(0,0,0,H*0.6);
    skyGrad.addColorStop(0, cfg.skyTint);
    skyGrad.addColorStop(1, cfg.bgTint);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0,0,W,H);

    if(cfg.fogAlpha>0){
        ctx.fillStyle = `rgba(${40+decayLevel*60},0,0,${cfg.fogAlpha})`;
        ctx.fillRect(0,0,W,H);
    }

    const groundGrad = ctx.createLinearGradient(0,H*0.55,0,H);
    groundGrad.addColorStop(0, cfg.groundTint);
    groundGrad.addColorStop(1, '#050505');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, H*0.55, W, H*0.45);

    ctx.save();
    ctx.beginPath(); ctx.rect(0,H*0.55,W,H*0.45); ctx.clip();
    for(let gx=0; gx<W; gx+=30){
        const wx = gx + cameraX*0.3;
        const ox = (wx%30);
        const isAlt = Math.floor(wx/30)%2===0;
        ctx.fillStyle = isAlt ? p.floor : p.floorAlt;
        ctx.fillRect(gx-ox, H*0.55, 30, H*0.45);
        if(cfg.decay>0.2 && Math.random()<0.001){
            ctx.fillStyle = `rgba(60,0,0,${cfg.decay*0.3})`;
            ctx.fillRect(gx, H*0.6+Math.random()*H*0.3, rand(2,8), rand(1,3));
        }
    }
    ctx.restore();

    sceneObjects.forEach(obj=>{
        const sx = obj.x - cameraX;
        if(sx<-100||sx>W+100) return;
        const P = obj.x - cameraX;
        switch(obj.type){
            case 'house': drawHouse(P, obj); break;
            case 'wall': drawWall(P, obj); break;
            case 'window': drawWindow(P, obj); break;
            case 'lamp': drawLamp(P, obj); break;
            case 'deco': drawDeco(P, obj); break;
        }
    });

    anomalies.forEach(an=>{
        const sx = an.x - cameraX;
        if(sx<-50||sx>W+50) return;
        if(!an.triggered && Math.abs(playerX - an.x) < 60){
            an.triggered = true;
            triggeredAnomalies.add(an.type);
            onAnomalyTrigger(an);
        }
        if(an.triggered || Math.abs(playerX - an.x) < 120){
            drawAnomaly(sx, an);
        }
    });

    whispers.forEach(w=>{
        w.life -= 0.016;
        w.y -= 0.3;
        if(w.life>0){
            ctx.fillStyle = `rgba(180,50,50,${Math.min(w.life,0.6)})`;
            ctx.font = `${Math.floor(12+decayLevel*6)}px monospace`;
            ctx.textAlign='center';
            ctx.fillText(w.text, w.x, w.y);
        }
    });
    whispers = whispers.filter(w=>w.life>0);

    particles.forEach(p=>{
        p.x += p.vx; p.y += p.vy; p.life -= 0.016;
        if(p.life>0){
            ctx.globalAlpha = clamp(p.life,0,1);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.sz, p.sz);
        }
    });
    ctx.globalAlpha = 1;
    particles = particles.filter(p=>p.life>0);

    drawRaccoon(playerScreenX, H*0.55 - 5, decayLevel);

    const vg = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.2,W/2,H/2,Math.max(W,H)*0.7);
    vg.addColorStop(0,'transparent');
    vg.addColorStop(0.7,`rgba(0,0,0,${0.2+decayLevel*0.3})`);
    vg.addColorStop(1,`rgba(0,0,0,${0.5+decayLevel*0.4})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0,0,W,H);

    ctx.fillStyle = `rgba(0,0,0,${0.06+decayLevel*0.06})`;
    for(let y=0;y<H;y+=3) ctx.fillRect(0,y,W,1);

    if(decayLevel>0.5){
        ctx.fillStyle = `rgba(80,0,0,${(decayLevel-0.5)*0.15})`;
        ctx.fillRect(0,0,W,H);
    }
}

// ==================== 各描画関数 ====================
function drawHouse(x, obj){
    const p = DAYS[currentDay].palette;
    const y = H*0.55 - obj.h;
    ctx.fillStyle = p.wall;
    ctx.fillRect(x, y, obj.w, obj.h);
    ctx.fillStyle = p.wallTop;
    ctx.beginPath(); ctx.moveTo(x-4,y); ctx.lineTo(x+obj.w/2,y-obj.h*0.3); ctx.lineTo(x+obj.w+4,y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.wallEdge;
    ctx.fillRect(x, y+obj.h-3, obj.w, 3);
    if(decayLevel>0.2){
        ctx.fillStyle = `rgba(80,0,0,${decayLevel*0.2})`;
        ctx.fillRect(x+obj.w*0.3, y+obj.h*0.4, obj.w*0.4, obj.h*0.3);
    }
    if(decayLevel>0.5){
        ctx.fillStyle = `rgba(60,10,10,${decayLevel*0.4})`;
        for(let i=0;i<3;i++){
            const vx = x+obj.w*(0.2+i*0.3);
            ctx.beginPath(); ctx.moveTo(vx,y+obj.h*0.3);
            ctx.quadraticCurveTo(vx+Math.sin(performance.now()*0.001+i)*5, y+obj.h*0.6, vx+Math.cos(performance.now()*0.0015+i)*3, y+obj.h);
            ctx.lineWidth=1.5; ctx.strokeStyle=`rgba(80,20,20,${decayLevel*0.5})`; ctx.stroke();
        }
    }
}

function drawWall(x, obj){
    const p = DAYS[currentDay].palette;
    const y = H*0.55 - obj.h;
    ctx.fillStyle = p.wall;
    ctx.fillRect(x, y, obj.w, obj.h);
    ctx.fillStyle = p.wallEdge;
    for(let row=0;row<obj.h;row+=8){
        ctx.fillRect(x, y+row, obj.w, 1);
        for(let col=0;col<obj.w;col+=12){
            ctx.fillRect(x+col+(row%16===0?0:6), y+row, 1, 7);
        }
    }
    if(decayLevel>0.3 && obj.seed%3===0){
        ctx.fillStyle = `rgba(120,0,0,${decayLevel*0.5})`;
        ctx.font = `${8+decayLevel*6}px monospace`;
        const textsJa = ['助けて','死','還','HELP','.....','殺'];
        const textsZh = ['助けて','死','还','HELP','.....','杀'];
        const texts = currentLang==='zh' ? textsZh : textsJa;
        ctx.fillText(texts[Math.floor(obj.seed)%texts.length], x+obj.w*0.3, y+obj.h*0.5);
    }
}

function drawWindow(x, obj){
    const p = DAYS[currentDay].palette;
    const lit = (obj.seed%5<2+decayLevel*2);
    const y = H*0.55 - obj.y - obj.h;
    ctx.fillStyle = p.wallEdge;
    ctx.fillRect(x-1, y-1, obj.w+2, obj.h+2);
    ctx.fillStyle = lit ? `rgba(180,160,80,${0.3+decayLevel*0.3})` : `rgba(10,10,15,0.9)`;
    ctx.fillRect(x, y, obj.w, obj.h);
    ctx.fillStyle = p.wallEdge;
    ctx.fillRect(x+obj.w/2-0.5, y, 1, obj.h);
    ctx.fillRect(x, y+obj.h/2-0.5, obj.w, 1);

    if(decayLevel>0.3 && lit && obj.seed%4===0){
        const flick = 0.5+0.5*Math.sin(performance.now()*0.003+obj.seed);
        ctx.fillStyle = `rgba(20,0,0,${flick*decayLevel*0.6})`;
        ctx.beginPath();
        ctx.ellipse(x+obj.w/2, y+obj.h*0.65, obj.w*0.25, obj.h*0.3, 0, 0, Math.PI*2);
        ctx.fill();
        if(decayLevel>0.5){
            ctx.fillStyle = `rgba(200,50,0,${flick*0.6})`;
            ctx.beginPath(); ctx.arc(x+obj.w*0.4,y+obj.h*0.45,safeR(1.5),0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(x+obj.w*0.6,y+obj.h*0.45,safeR(1.5),0,Math.PI*2); ctx.fill();
        }
    }
}

function drawLamp(x, obj){
    const y = H*0.55 - obj.h;
    const lit = decayLevel < 0.7 || Math.sin(performance.now()*0.005+obj.seed)>0;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, obj.w, obj.h);
    const ly = y - 5;
    ctx.fillStyle = lit ? `rgba(255,200,100,${0.3+Math.random()*0.1})` : '#111';
    ctx.beginPath(); ctx.arc(x+obj.w/2, ly, safeR(5), 0, Math.PI*2); ctx.fill();
    if(lit){
        const glow = ctx.createRadialGradient(x+obj.w/2,ly,0,x+obj.w/2,ly,40);
        glow.addColorStop(0,`rgba(255,180,80,${0.15*(1-decayLevel*0.5)})`);
        glow.addColorStop(1,'rgba(255,180,80,0)');
        ctx.fillStyle=glow; ctx.fillRect(x-35,ly-35,70,70);
    }
    if(decayLevel>0.3 && Math.random()<0.005){
        ctx.fillStyle = `rgba(255,255,200,0.8)`;
        ctx.beginPath(); ctx.arc(x+obj.w/2,ly,safeR(8),0,Math.PI*2); ctx.fill();
    }
}

function drawDeco(x, obj){
    const y = H*0.55 - obj.h*0.3;
    const p = DAYS[currentDay].palette;
    switch(obj.sub){
        case 'grass':
            ctx.fillStyle = decayLevel>0.4 ? `rgba(30,${10+decayLevel*10},10,0.5)` : `rgba(15,25,15,0.4)`;
            ctx.fillRect(x, y, obj.w, obj.h);
            break;
        case 'stone':
            ctx.fillStyle = p.detail;
            ctx.beginPath(); ctx.arc(x+obj.w/2,y+obj.h/2,safeR(obj.w/2),0,Math.PI*2); ctx.fill();
            break;
        case 'crack':
            ctx.strokeStyle = `rgba(40,0,0,${0.2+decayLevel*0.3})`;
            ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x,y);
            ctx.lineTo(x+obj.w*0.3,y+obj.h*0.3); ctx.lineTo(x+obj.w*0.5,y+obj.h*0.7);
            ctx.lineTo(x+obj.w,y+obj.h); ctx.stroke();
            break;
        case 'stain':
            ctx.fillStyle = `rgba(60,0,0,${0.15+decayLevel*0.2})`;
            ctx.beginPath(); ctx.ellipse(x+obj.w/2,y+obj.h/2,obj.w/2,obj.h/2,0,0,Math.PI*2); ctx.fill();
            break;
        case 'bone':
            if(decayLevel>0.3){
                ctx.fillStyle = `rgba(180,170,150,${0.3+decayLevel*0.3})`;
                ctx.fillRect(x,y,obj.w*0.3,obj.h);
                ctx.fillRect(x+obj.w*0.5,y+obj.h*0.2,obj.w*0.3,obj.h*0.6);
            }
            break;
        case 'meat':
            if(decayLevel>0.5){
                const pulse = 0.5+0.5*Math.sin(performance.now()*0.002+obj.seed);
                ctx.fillStyle = `rgba(120,${20+pulse*30},20,${0.3+decayLevel*0.3})`;
                ctx.beginPath();
                for(let i=0;i<5;i++){
                    const a=(i/5)*Math.PI*2+performance.now()*0.001;
                    const r=obj.w*(0.3+0.2*Math.sin(i+a));
                    const px=x+obj.w/2+Math.cos(a)*r; const py=y+obj.h/2+Math.sin(a)*r;
                    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
                }
                ctx.closePath(); ctx.fill();
            }
            break;
    }
}

// ==================== 異常描画 ====================
function drawAnomaly(x, an){
    const tm = performance.now()*0.001;
    switch(an.type){
        case 'shadow': {
            const h = 20+an.intensity*25;
            const w = h*0.35;
            ctx.fillStyle = `rgba(0,0,0,${0.5+an.intensity*0.3})`;
            ctx.beginPath();
            ctx.ellipse(x, H*0.55-h*0.7, w, h*0.5, 0, 0, Math.PI*2);
            ctx.fill();
            if(an.intensity>0.5){
                ctx.fillStyle = `rgba(200,0,0,${an.intensity*0.7})`;
                ctx.beginPath(); ctx.arc(x-w*0.3, H*0.55-h*0.8,safeR(1.5),0,Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(x+w*0.3, H*0.55-h*0.8,safeR(1.5),0,Math.PI*2); ctx.fill();
            }
            break;
        }
        case 'blood': {
            const blobs = 5;
            for(let i=0;i<blobs;i++){
                const bx = x + Math.sin(tm*0.5+i)*8 + i*4;
                const by = H*0.58 + i*5 + Math.cos(tm+i)*3;
                const r = 3+i*1.5;
                ctx.fillStyle = `rgba(${80+decayLevel*40},0,0,${0.3+an.intensity*0.3})`;
                ctx.beginPath(); ctx.arc(bx,by,safeR(r),0,Math.PI*2); ctx.fill();
            }
            if(an.intensity>0.4){
                ctx.fillStyle = `rgba(120,0,0,${an.intensity*0.5})`;
                ctx.font = '10px monospace';
                ctx.fillText('助', x-3, H*0.6);
            }
            break;
        }
        case 'eyes': {
            const eyeCount = 2+Math.floor(an.intensity*3);
            for(let i=0;i<eyeCount;i++){
                const ex = x + (i-eyeCount/2)*12 + Math.sin(tm+i)*3;
                const ey = H*0.52 + Math.cos(tm*0.7+i)*8;
                ctx.fillStyle = `rgba(200,180,150,${0.3+an.intensity*0.3})`;
                ctx.beginPath(); ctx.ellipse(ex,ey,3,2,0,0,Math.PI*2); ctx.fill();
                ctx.fillStyle = `rgba(0,0,0,${0.8})`;
                ctx.beginPath(); ctx.arc(ex+Math.sin(tm+i)*0.5,ey,safeR(1),0,Math.PI*2); ctx.fill();
            }
            break;
        }
        case 'figure': {
            const dist = 30+an.intensity*20;
            const fx = x + Math.sin(tm*0.3)*10;
            ctx.fillStyle = `rgba(10,5,5,${0.4+an.intensity*0.3})`;
            ctx.beginPath(); ctx.arc(fx, H*0.55-dist*0.8, safeR(dist*0.15), 0, Math.PI*2); ctx.fill();
            ctx.fillRect(fx-dist*0.1, H*0.55-dist*0.65, dist*0.2, dist*0.65);
            if(an.intensity>0.6) an.x -= 0.05;
            break;
        }
        case 'whisper': {
            const phrases = I18N[currentLang].anomalyPhrases;
            const phrase = phrases[Math.floor(an.seed)%phrases.length];
            ctx.fillStyle = `rgba(180,20,20,${0.4+Math.sin(tm*3)*0.2})`;
            ctx.font = `${14+decayLevel*8}px monospace`;
            ctx.textAlign='center';
            ctx.fillText(phrase, x, H*0.4+Math.sin(tm*2)*10);
            break;
        }
        case 'flicker': {
            if(Math.random()<0.02+decayLevel*0.03){
                $('flash-overlay').classList.add('active');
                setTimeout(()=>$('flash-overlay').classList.remove('active'),30);
            }
            break;
        }
        case 'crack': {
            ctx.strokeStyle = `rgba(80,0,0,${0.4+an.intensity*0.3})`;
            ctx.lineWidth = 2+an.intensity*2;
            ctx.beginPath();
            const cx = x, cy = H*0.6;
            ctx.moveTo(cx, cy);
            for(let i=0;i<8;i++){
                ctx.lineTo(cx+(Math.random()-0.5)*20, cy+i*4+Math.random()*3);
            }
            ctx.stroke();
            if(an.intensity>0.5){
                ctx.fillStyle = `rgba(255,50,0,${0.1+Math.sin(tm*2)*0.1})`;
                ctx.beginPath(); ctx.ellipse(cx,cy+15,5,10,0,0,Math.PI*2); ctx.fill();
            }
            break;
        }
        case 'face': {
            const fx = x, fy = H*0.4+Math.sin(tm*0.5)*5;
            const appear = 0.3+0.3*Math.sin(tm*0.7+an.seed);
            ctx.fillStyle = `rgba(30,10,10,${appear*an.intensity})`;
            ctx.beginPath(); ctx.ellipse(fx,fy,10,14,0,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = `rgba(0,0,0,${appear*an.intensity})`;
            ctx.beginPath(); ctx.ellipse(fx-4,fy-3,2.5,3.5,0,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(fx+4,fy-3,2.5,3.5,0,0,Math.PI*2); ctx.fill();
            ctx.fillRect(fx-3,fy+5,6,1.5);
            break;
        }
        case 'hand': {
            const hx = x, hy = H*0.58+Math.sin(tm)*3;
            ctx.fillStyle = `rgba(120,100,80,${0.3+decayLevel*0.3})`;
            ctx.beginPath(); ctx.ellipse(hx,hy,5,3,0,0,Math.PI*2); ctx.fill();
            for(let i=-2;i<=2;i++){
                ctx.fillRect(hx+i*2-0.5, hy-8-i*0.5, 1.5, 8+i*1.5);
            }
            break;
        }
        case 'meat': {
            const pulse = 0.5+0.5*Math.sin(tm*2+an.seed);
            const mx = x, my = H*0.56;
            ctx.fillStyle = `rgba(${100+pulse*50},20,20,${0.4+an.intensity*0.3})`;
            ctx.beginPath();
            for(let i=0;i<7;i++){
                const a=(i/7)*Math.PI*2+tm;
                const r=6+Math.sin(i*1.5+tm)*3;
                i===0?ctx.moveTo(mx+Math.cos(a)*r,my+Math.sin(a)*r):ctx.lineTo(mx+Math.cos(a)*r,my+Math.sin(a)*r);
            }
            ctx.closePath(); ctx.fill();
            if(an.intensity>0.5){
                ctx.fillStyle = `rgba(60,10,10,${pulse*0.3})`;
                ctx.beginPath(); ctx.arc(mx+Math.cos(tm)*3,my+Math.sin(tm)*2,safeR(2),0,Math.PI*2); ctx.fill();
            }
            break;
        }
    }
}

// ==================== 最終爬行描画 ====================
function drawFinalCrawl(){
    const tm = performance.now()*0.001;
    const prog = walkProgress;

    // 背景：深い闇
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,`rgb(${5+prog*10},0,0)`);
    bg.addColorStop(0.5,`rgb(${2+prog*5},0,0)`);
    bg.addColorStop(1,'#000');
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,W,H);

    // 狭まる壁（左右から迫る）
    const wallOffset = prog * W * 0.15;
    ctx.fillStyle = `rgb(${15+prog*20},${5+prog*5},5)`;
    ctx.fillRect(0, H*0.3, wallOffset, H*0.7);
    ctx.fillRect(W-wallOffset, H*0.3, wallOffset, H*0.7);

    // 地面：血の池
    const groundGrad = ctx.createLinearGradient(0,H*0.6,0,H);
    groundGrad.addColorStop(0,`rgba(${40+prog*40},0,0,${0.5+prog*0.3})`);
    groundGrad.addColorStop(1,'#000');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0,H*0.6,W,H*0.4);

    // 地面の動脈のような血管
    ctx.strokeStyle = `rgba(${120+prog*50},0,0,${0.3+prog*0.4})`;
    ctx.lineWidth = 1+prog*2;
    for(let i=0;i<5;i++){
        ctx.beginPath();
        const baseY = H*0.65 + i*15 + Math.sin(tm+i)*5;
        ctx.moveTo(0, baseY);
        for(let x=0;x<W;x+=10){
            ctx.lineTo(x, baseY + Math.sin(x*0.02+tm*0.5+i)*8);
        }
        ctx.stroke();
    }

    // 前景オブジェクト
    sceneObjects.forEach(obj=>{
        const sx = obj.x - cameraX;
        if(sx<-50||sx>W+50) return;
        if(obj.type==='wall'){
            const y = H*0.6 - obj.h*(0.5+prog*0.5);
            ctx.fillStyle = `rgb(${20+prog*30},${5+prog*10},5)`;
            ctx.fillRect(sx, y, obj.w, obj.h);
            // 壁の肉質化
            if(prog>0.3){
                ctx.fillStyle = `rgba(${80+prog*40},10,10,${prog*0.5})`;
                ctx.fillRect(sx+2, y+obj.h*0.3, obj.w-4, obj.h*0.4);
            }
            // 壁の目
            if(prog>0.5 && obj.seed%2===0){
                const e=Math.sin(tm*0.3+obj.seed)*5;
                ctx.fillStyle=`rgba(200,50,0,${0.3+0.3*Math.sin(tm*2+obj.seed)})`;
                ctx.beginPath();ctx.arc(sx+obj.w*0.3,y+obj.h*0.4+e,2,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.arc(sx+obj.w*0.7,y+obj.h*0.4-e,2,0,Math.PI*2);ctx.fill();
            }
        }
    });

    // 異常描画
    anomalies.forEach(an=>{
        const sx = an.x - cameraX;
        if(sx<-50||sx>W+50) return;
        if(!an.triggered && Math.abs(playerX - an.x) < 40){
            an.triggered = true;
            triggeredAnomalies.add(an.type);
            onAnomalyTrigger(an);
        }
        if(an.triggered || Math.abs(playerX - an.x) < 80){
            drawAnomaly(sx, an);
        }
    });

    // 前方の「家」のシルエット（だんだん歪む）
    const homeX = FINAL_CRAWL.length - cameraX;
    if(homeX>0 && homeX<W+100){
        const hDist = (homeX-W*0.8)/W; // 0=遠い, 1=近い
        const distort = prog * 20;
        ctx.fillStyle = `rgba(5,0,0,${0.8+prog*0.2})`;
        ctx.beginPath();
        ctx.moveTo(homeX-30-distort, H*0.6);
        ctx.lineTo(homeX-15+distort*0.5, H*0.3+Math.sin(tm)*distort);
        ctx.lineTo(homeX+15+distort, H*0.3+Math.cos(tm*0.7)*distort);
        ctx.lineTo(homeX+30-distort*0.5, H*0.6);
        ctx.closePath();
        ctx.fill();
        // 扉（少し開いている）
        const doorOpen = prog * 10;
        ctx.fillStyle = `rgba(0,0,0,${0.9})`;
        ctx.fillRect(homeX-doorOpen*0.3, H*0.45, 8+doorOpen*0.5, H*0.15);
        // 扉の隙間から光
        if(prog>0.5){
            ctx.fillStyle = `rgba(${200+prog*55},${50+prog*20},0,${prog*0.6})`;
            ctx.fillRect(homeX-2, H*0.48, 4, H*0.08);
        }
    }

    // パーティクル：灰・血・肉片
    particles.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.life-=0.016;
        if(p.life>0){
            ctx.globalAlpha=clamp(p.life,0,1);
            ctx.fillStyle=p.color;
            ctx.fillRect(p.x,p.y,p.sz,p.sz);
        }
    });
    ctx.globalAlpha=1;
    particles=particles.filter(p=>p.life>0);

    if(Math.random()<0.1+prog*0.2){
        particles.push({
            x:rand(W*0.3,W*0.7),y:rand(H*0.2,H*0.5),
            vx:rand(-0.5,0.5),vy:rand(0.2,1),
            life:rand(1,3),sz:rand(1,3),
            color:`rgba(${80+rand(0,60)},${5+rand(0,20)},5,${0.4+prog*0.4})`
        });
    }

    // 囁き
    whispers.forEach(w=>{
        w.life-=0.016;w.y-=0.2;
        if(w.life>0){
            ctx.fillStyle=`rgba(180,${30+prog*40},30,${Math.min(w.life,0.7)})`;
            ctx.font=`${14+prog*8}px monospace`;
            ctx.textAlign='center';
            ctx.fillText(w.text,w.x,w.y);
        }
    });
    whispers=whispers.filter(w=>w.life>0);

    // 浣熊（腐敗が進む）
    drawRaccoon(playerScreenX, H*0.6-2, 0.8+prog*0.2);

    // ビネット：極限
    const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.1,W/2,H/2,Math.max(W,H)*0.6);
    vg.addColorStop(0,'transparent');
    vg.addColorStop(0.5,`rgba(0,0,0,${0.5+prog*0.3})`);
    vg.addColorStop(1,`rgba(20,0,0,${0.8+prog*0.2})`);
    ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);

    // 血のベール
    if(prog>0.4){
        ctx.fillStyle=`rgba(60,0,0,${(prog-0.4)*0.4})`;
        ctx.fillRect(0,0,W,H);
    }

    // スキャンライン強化
    ctx.fillStyle=`rgba(0,0,0,${0.15+prog*0.1})`;
    for(let y=0;y<H;y+=3)ctx.fillRect(0,y,W,1);

    // 最後の瞬間：画面が歪む
    if(prog>0.9){
        const warp=Math.sin(tm*5)*(prog-0.9)*50;
        ctx.fillStyle=`rgba(80,0,0,${(prog-0.9)*3})`;
        ctx.fillRect(0,0,W,H);
        ctx.save();
        ctx.translate(W/2,H/2);
        ctx.rotate(warp*0.01);
        ctx.translate(-W/2,-H/2);
    }
}

// ==================== アライグマ描画 ====================
function drawRaccoon(sx, sy, decay){
    const tm = performance.now()*0.001;
    const wobble = Math.sin(tm*4)*1.5;
    const breathe = Math.sin(tm*2)*0.5;

    ctx.save();
    ctx.translate(sx, sy + wobble);

    // 影
    ctx.fillStyle = `rgba(0,0,0,${0.4*(1-decay*0.3)})`;
    ctx.beginPath(); ctx.ellipse(0, 2, 10, 3, 0, 0, Math.PI*2); ctx.fill();

    // 尻尾
    ctx.fillStyle = `rgb(${90-decay*30},${75-decay*25},${60-decay*20})`;
    ctx.save();
    ctx.translate(-8, -2);
    ctx.rotate(-0.3+Math.sin(tm*3)*0.15);
    ctx.beginPath(); ctx.ellipse(0,0,3,12,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgb(${30-decay*15},${15-decay*10},${10-decay*8})`;
    for(let i=0;i<3;i++) ctx.fillRect(-2.5, -8+i*6, 5, 2);
    ctx.restore();

    // 体
    const bodyR = 8+decay*3;
    const bodyColor = `rgb(${100-decay*40},${85-decay*35},${70-decay*30})`;
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.ellipse(0,0,bodyR*0.7,bodyR,0,0,Math.PI*2); ctx.fill();

    // お腹
    ctx.fillStyle = `rgb(${160-decay*50},${140-decay*45},${120-decay*40})`;
    ctx.beginPath(); ctx.ellipse(0,3,bodyR*0.4,bodyR*0.55,0,0,Math.PI*2); ctx.fill();

    // 頭
    ctx.save();
    ctx.translate(2, -bodyR*0.7 + breathe);
    const headR = bodyR*0.7;
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.arc(0,0,safeR(headR),0,Math.PI*2); ctx.fill();

    // 耳
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.arc(-headR*0.7,-headR*0.7,safeR(headR*0.35),0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(headR*0.7,-headR*0.7,safeR(headR*0.35),0,Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgb(200,${150-decay*80},${150-decay*80})`;
    ctx.beginPath(); ctx.arc(-headR*0.7,-headR*0.7,safeR(headR*0.18),0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(headR*0.7,-headR*0.7,safeR(headR*0.18),0,Math.PI*2); ctx.fill();

    // 仮面（アイマスク）
    ctx.fillStyle = `rgb(${25-decay*10},${15-decay*8},${8-decay*5})`;
    ctx.beginPath(); ctx.ellipse(-headR*0.25,-headR*0.1,headR*0.35,headR*0.25,-0.15,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(headR*0.25,-headR*0.1,headR*0.35,headR*0.25,0.15,0,Math.PI*2); ctx.fill();

    // 目
    const blink = Math.sin(tm*0.7)>0.95 ? 0.1 : 1;
    ctx.fillStyle = `rgb(255,${210-decay*80},${50-decay*30})`;
    ctx.beginPath(); ctx.ellipse(-headR*0.25,-headR*0.15,headR*0.1,headR*0.12*blink,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(headR*0.25,-headR*0.15,headR*0.1,headR*0.12*blink,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-headR*0.25,-headR*0.15,safeR(headR*0.04),0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(headR*0.25,-headR*0.15,safeR(headR*0.04),0,Math.PI*2); ctx.fill();

    // 鼻
    ctx.fillStyle = '#1a0a05';
    ctx.beginPath(); ctx.arc(0,headR*0.15,safeR(headR*0.08),0,Math.PI*2); ctx.fill();

    // 口（高腐敗で出血）
    if(decay>0.4){
        ctx.fillStyle = `rgba(120,0,0,${decay*0.5})`;
        ctx.fillRect(-1.5,headR*0.25,3,1);
        ctx.beginPath(); ctx.arc(1,headR*0.35+Math.sin(tm*2)*2,safeR(1),0,Math.PI*2); ctx.fill();
    }

    // 腐敗異物
    if(decay>0.6){
        ctx.fillStyle = `rgba(80,${10+decay*20},10,${decay*0.5})`;
        for(let i=0;i<3;i++){
            const a = tm*0.5+i*2.1;
            const r = headR*(0.6+decay*0.3);
            ctx.beginPath(); ctx.arc(Math.cos(a)*r*0.8,Math.sin(a)*r*0.8,safeR(1.5),0,Math.PI*2); ctx.fill();
        }
    }

    ctx.restore(); // head

    // 脚
    const legPhase = tm*8;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-4, bodyR*0.8+Math.sin(legPhase)*2, 3, 5);
    ctx.fillRect(2, bodyR*0.8+Math.sin(legPhase+Math.PI)*2, 3, 5);

    ctx.restore(); // body

    // 腐敗粒子
    if(decay>0.5 && Math.random()<decay*0.3){
        particles.push({
            x: sx+rand(-10,10), y: sy+rand(-15,0),
            vx:rand(-0.3,0.3), vy:rand(-0.5,-0.1),
            life:rand(0.5,1.5), sz:rand(1,2.5),
            color:`rgba(${80+rand(0,40)},${10+rand(0,20)},10,0.6)`
        });
    }
}

// ==================== 異常トリガー ====================
function onAnomalyTrigger(an){
    switch(an.type){
        case 'shadow': tone(150+Math.random()*50,0.3,'sawtooth',0.15); noise(0.2,0.08); break;
        case 'blood': tone(60,0.5,'triangle',0.2); noise(0.4,0.1); spawnParticles(an.x,H*0.58,'rgba(120,0,0,0.6)',8,2); break;
        case 'eyes': tone(300+Math.random()*100,0.15,'sine',0.1); break;
        case 'figure': tone(80,0.8,'sawtooth',0.12); break;
        case 'whisper': {
            const phrases = I18N[currentLang].whispers;
            spawnWhisper(phrases[Math.floor(an.seed)%phrases.length]);
            tone(200+Math.random()*100,0.3,'sine',0.08);
            break;
        }
        case 'flicker': noise(0.1,0.15); break;
        case 'crack': tone(40,0.6,'triangle',0.2); noise(0.5,0.12); $('flash-overlay').classList.add('active'); setTimeout(()=>$('flash-overlay').classList.remove('active'),50); break;
        case 'face': tone(100,0.4,'square',0.1); break;
        case 'hand': tone(70,0.5,'sawtooth',0.15); break;
        case 'meat': noise(0.3,0.1); tone(50,0.4,'triangle',0.12); break;
    }
    if(an.intensity>0.4) triggerShake(an.intensity*2);
}

function spawnWhisper(text){
    whispers.push({
        text, x:rand(W*0.2,W*0.8), y:rand(H*0.2,H*0.5),
        life:rand(2,4)
    });
}

function spawnParticles(x,y,color,count,spd){
    for(let i=0;i<count;i++) particles.push({
        x,y,vx:rand(-spd,spd),vy:rand(-spd,0),
        life:rand(0.5,1.5),sz:rand(1,3),color
    });
}

// ==================== 画面震動 ====================
let shakeAmount = 0;
function triggerShake(amt){ shakeAmount = Math.max(shakeAmount, amt); }

// ==================== 更新 ====================
function update(dt){
    if(gameState!==STATE.WALKING) return;
    const dtSec = dt/1000;

    if(finalCrawlActive){
        // 最終爬行：極遅い自動前進
        playerX += FINAL_CRAWL.crawlSpeed * dtSec;
        cameraX = playerX - W*PLAYER_SCREEN_POS;
        cameraX = clamp(cameraX, 0, Math.max(0, FINAL_CRAWL.length-W+20));
        playerScreenX = W*PLAYER_SCREEN_POS;
        walkProgress = clamp(playerX/FINAL_CRAWL.length, 0, 1);
        updateHUD();

        // 爬行中の恐怖演出
        decayLevel = 0.95 + walkProgress*0.05;
        document.documentElement.style.setProperty('--decay', decayLevel);
        document.documentElement.style.setProperty('--progress', (walkProgress*100)+'%');

        // 時々画面が歪む
        if(Math.random()<0.01) triggerShake(1+walkProgress*3);
        // 時々フラッシュ
        if(Math.random()<0.005){
            $('flash-overlay').classList.add('active');
            setTimeout(()=>$('flash-overlay').classList.remove('active'),30);
        }
        // 足音（重い）
        if(Math.random()<0.08) tone(30+Math.random()*15,0.08,'sine',0.1);

        // 進捗で囁き追加
        if(walkProgress>0.3 && finalCrawlMsgIndex===0){
            spawnWhisper(currentLang==='zh'?'……回头……':'……振り向くな……');
            finalCrawlMsgIndex=1;
        }
        if(walkProgress>0.6 && finalCrawlMsgIndex===1){
            spawnWhisper(currentLang==='zh'?'它在你身后':'それが背中にいる');
            finalCrawlMsgIndex=2;
        }
        if(walkProgress>0.85 && finalCrawlMsgIndex===2){
            spawnWhisper(currentLang==='zh'?'门开了':'ドアが開いた');
            finalCrawlMsgIndex=3;
        }

        if(playerX >= FINAL_CRAWL.length - 10){
            finalCrawlActive = false;
            isWalking = false;
            const endType = determineEnding();
            showEnding(endType);
        }
        return;
    }

    if(isWalking){
        // 通常の日：アライグマは「前に進む」= 画面では右方向に移動、背景が左に流れる
        playerX += PLAYER_WALK_SPEED * dtSec;
        cameraX = playerX - W*PLAYER_SCREEN_POS;
        cameraX = clamp(cameraX, 0, Math.max(0, segmentWidth-W+20));
        playerScreenX = W*PLAYER_SCREEN_POS;

        walkProgress = clamp(playerX/segmentWidth, 0, 1);
        updateHUD();

        if(Math.random()<0.02) tone(40+Math.random()*20,0.05,'triangle',0.03);

        if(playerX >= segmentWidth - 20){
            isWalking = false;
            onDayEnd();
        }
    }

    decayLevel = DAYS[currentDay].decay;
    document.documentElement.style.setProperty('--decay', decayLevel);
    document.documentElement.style.setProperty('--progress', (walkProgress*100)+'%');
}

function updateHUD(){
    const filled = Math.floor(walkProgress*8);
    $('dist-display').textContent = '▮'.repeat(filled) + '▯'.repeat(8-filled);
}

// ==================== 最終日前の警告 ====================
const FINAL_CRAWL = {
    length: 600,
    decay: 0.95,
    whispers: [],
    crawlSpeed: 25, // 極めて遅い
};

let finalCrawlActive = false;
let finalCrawlX = 0;
let finalCrawlMessages = [];
let finalCrawlMsgIndex = 0;
let finalCrawlTimer = 0;
let endingType = '';

// ==================== 日次切替 ====================
function onDayEnd(){
    if(currentDay>=DAYS.length-1){
        // DAY 4 完了 → 最終爬行へ
        startFinalCrawl();
        return;
    }

    gameState = STATE.TRANSITION;
    const trans = $('day-transition');
    trans.classList.add('active');
    $('transition-title').textContent = DAYS[currentDay+1].label;
    $('transition-title').setAttribute('data-text', DAYS[currentDay+1].label);
    $('transition-title').className = 'transition-title glitch-text'+(currentDay>=2?' rotted':'');
    $('transition-sub').textContent = DAYS[currentDay+1].sub;

    tone(200,0.3,'sine',0.15);
    setTimeout(()=>tone(150,0.5,'sawtooth',0.12),200);

    // 最終日前の警告音
    if(currentDay===3){
        setTimeout(()=>{
            tone(80,1.5,'sawtooth',0.2);
            noise(0.8,0.15);
        },800);
    }

    setTimeout(()=>{
        trans.classList.remove('active');
        startNextDay();
    }, 2500+currentDay*400);
}

function startNextDay(){
    currentDay++;
    const cfg = DAYS[currentDay];
    $('day-display').textContent = cfg.name;
    $('day-display').className = 'hud-day'+(currentDay>=2?' late':'')+(currentDay>=3?' latest':'');

    playerX = 0;
    cameraX = 0;
    walkProgress = 0;
    isWalking = false;
    generateScene(currentDay);
    updateHUD();

    gameState = STATE.WALKING;
    startAmbient(cfg);

    tone(55,1,'sine',0.1);
    if(cfg.whisperText){
        setTimeout(()=>spawnWhisper(cfg.whisperText),1500);
    }

    // DAY 4 中の追加警告
    if(currentDay===4){
        const msgs = [tf('preFinal1'),tf('preFinal2'),tf('preFinal3'),tf('preFinal4')];
        msgs.forEach((m,i)=>{
            setTimeout(()=>spawnWhisper(m), 3000+i*4000);
        });
    }
}

// ==================== 最終爬行 ====================
function startFinalCrawl(){
    gameState = STATE.TRANSITION;
    stopAmbient();
    finalCrawlActive = true;
    finalCrawlX = 0;
    finalCrawlMsgIndex = 0;
    finalCrawlTimer = 0;
    document.body.classList.add('rotted');

    const trans = $('day-transition');
    trans.classList.add('active');
    $('transition-title').textContent = '——';
    $('transition-title').setAttribute('data-text', '——');
    $('transition-title').className = 'transition-title glitch-text rotted';
    $('transition-sub').textContent = '';

    // 重い音響
    tone(40,2,'sine',0.3);
    setTimeout(()=>noise(1.0,0.2),300);
    setTimeout(()=>tone(35,3,'sawtooth',0.2),800);

    // 4秒後にゲーム画面に戻り、最終爬行開始
    setTimeout(()=>{
        trans.classList.remove('active');
        $('game-screen').classList.add('active');
        gameState = STATE.WALKING;
        finalCrawlActive = true;
        playerX = 0;
        cameraX = 0;
        walkProgress = 0;
        isWalking = true; // 自動前進

        // 最終爬行の異常を生成
        generateFinalCrawlScene();

        // 持続的な低周波ドローン
        startFinalDrone();
    }, 4000);
}

let finalDroneInterval = null;
function startFinalDrone(){
    if(finalDroneInterval) clearInterval(finalDroneInterval);
    const tick = ()=>{
        if(!finalCrawlActive) return;
        tone(30+Math.random()*15, 2.0, 'sine', 0.15);
        if(Math.random()<0.4) tone(60+Math.random()*20, 0.5, 'triangle', 0.08);
        if(Math.random()<0.3) noise(0.3, 0.05);
        // 不規則な心拍
        if(Math.random()<0.5){
            tone(50,0.1,'sine',0.25);
            setTimeout(()=>tone(45,0.15,'sine',0.2),150+Math.random()*100);
        }
        finalDroneInterval = setTimeout(tick, 800+Math.random()*1500);
    };
    tick();
}

function generateFinalCrawlScene(){
    sceneObjects = [];
    anomalies = [];
    triggeredAnomalies.clear();
    particles = [];
    whispers = [];

    // 狭い壁（徐々に迫る）
    for(let i=0;i<8;i++){
        const x = 80+i*80;
        const w = 20+Math.sin(i*0.8)*10;
        const h = 50+Math.cos(i*0.5)*20;
        sceneObjects.push({type:'wall',x,w,h,seed:i*7});
        // 壁に血文字
        sceneObjects.push({type:'deco',sub:'stain',x:x+5,y:0,w:w-10,h:rand(20,40),seed:i*3});
    }

    // 肉塊を多数配置
    for(let i=0;i<6;i++){
        anomalies.push({type:'meat',name:'肉塊',x:rand(50,550),triggered:false,seed:i*13,intensity:0.9});
    }

    // 目
    for(let i=0;i<4;i++){
        anomalies.push({type:'eyes',name:'目',x:rand(30,570),triggered:false,seed:i*11,intensity:0.8});
    }

    // ひび割れ
    for(let i=0;i<5;i++){
        anomalies.push({type:'crack',name:'亀裂',x:rand(40,560),triggered:false,seed:i*17,intensity:0.85});
    }

    // 顔
    anomalies.push({type:'face',name:'壁の顔',x:300,triggered:false,seed:42,intensity:0.95});

    // 手
    anomalies.push({type:'hand',name:'手',x:450,triggered:false,seed:99,intensity:0.9});

    // 最後の囁き
    setTimeout(()=>spawnWhisper(tf('preFinal2')),1000);
    setTimeout(()=>spawnWhisper('………'),3000);
    setTimeout(()=>{
        const w2 = currentLang==='zh' ? '回头…' : '振り向くな…';
        spawnWhisper(w2);
    },5000);

    sceneObjects.sort((a,b)=>a.x-b.x);
    anomalies.sort((a,b)=>a.x-b.x);
}

// ==================== エンディング分岐判定 ====================
function determineEnding(){
    // 最終爬行中にトリガーした異常の数で結末を決定
    const triggerCount = triggeredAnomalies.size;
    const hasFace = triggeredAnomalies.has('face');
    const hasMeat = triggeredAnomalies.has('meat');
    const hasHand = triggeredAnomalies.has('hand');

    if(hasFace && hasHand) return 'consumed';  // 最悪：同化
    if(hasMeat && triggerCount>=4) return 'alone'; // 悪：独り
    return 'survive'; // 生還（でも……）
}

// ==================== エンディング ====================
function showEnding(type){
    gameState = STATE.ENDING;
    stopAmbient();
    if(finalDroneInterval){clearInterval(finalDroneInterval);finalDroneInterval=null;}
    finalCrawlActive = false;
    endingType = type;

    const screen = $('ending-screen');
    screen.classList.add('active');
    screen.dataset.ending = type;

    // エンディング別の演出
    switch(type){
        case 'survive':
            $('ending-title').textContent = tf('endingSurvive');
            $('ending-title').className = 'ending-title survive';
            $('ending-raccoon').textContent = '🦝';
            $('ending-text').innerHTML = tf('endingSurviveText');
            $('ending-stats').textContent = tf('endingSurviveStats', DAYS.length);
            // 不気味な和音
            tone(220,0.5,'sine',0.15);
            setTimeout(()=>tone(277,0.5,'sine',0.12),200);
            setTimeout(()=>tone(330,1.0,'sine',0.1),400);
            // でも最後に……
            setTimeout(()=>noise(0.3,0.08),1500);
            break;

        case 'alone':
            $('ending-title').textContent = tf('endingAlone');
            $('ending-title').className = 'ending-title alone';
            $('ending-raccoon').textContent = '🦝💀';
            $('ending-text').innerHTML = tf('endingAloneText');
            $('ending-stats').textContent = tf('endingAloneStats', DAYS.length);
            // 歪んだ音
            tone(150,0.8,'sawtooth',0.15);
            setTimeout(()=>tone(100,1.0,'sawtooth',0.12),300);
            setTimeout(()=>noise(0.6,0.12),600);
            // 笑い声のような音
            setTimeout(()=>{tone(400,0.1,'square',0.06);setTimeout(()=>tone(380,0.15,'square',0.05),100);},1200);
            break;

        case 'consumed':
            $('ending-title').textContent = tf('endingConsumed');
            $('ending-title').className = 'ending-title consumed';
            $('ending-raccoon').textContent = '💀🦝💀';
            $('ending-text').innerHTML = tf('endingConsumedText');
            $('ending-stats').textContent = tf('endingConsumedStats', DAYS.length);
            // 絶望の音響
            noise(2.0,0.25);
            tone(40,2.0,'sawtooth',0.2);
            setTimeout(()=>tone(30,3.0,'triangle',0.15),500);
            // 最後の鼓動
            setTimeout(()=>{tone(60,0.1,'sine',0.3);setTimeout(()=>tone(50,0.2,'sine',0.25),200);},1000);
            // そして静寂
            setTimeout(()=>{if(audioCtx){masterGain.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+2);}},2000);
            break;
    }

    // 画面エフェクト
    triggerShake(type==='consumed'?5:type==='alone'?3:1.5);
    $('flash-overlay').classList.add('active');
    setTimeout(()=>$('flash-overlay').classList.remove('active'),80);

    // エンディング背景を暗く
    setTimeout(()=>{
        if(ctx){
            ctx.fillStyle='#000';
            ctx.fillRect(0,0,W,H);
        }
    },100);
}

// ==================== メインループ ====================
function loop(ts){
    if(!lastTime) lastTime=ts;
    const dt = Math.min(ts-lastTime, 50);
    lastTime = ts;

    if(ctx){
        ctx.fillStyle = '#000';
        ctx.fillRect(0,0,W,H);
    }

    if(gameState===STATE.WALKING){
        update(dt);
        ctx.save();
        if(shakeAmount>0){
            ctx.translate(rand(-shakeAmount,shakeAmount), rand(-shakeAmount,shakeAmount));
            shakeAmount *= 0.9;
            if(shakeAmount<0.1) shakeAmount=0;
        }
        draw();
        ctx.restore();
    } else if(gameState===STATE.TITLE){
        drawTitle(ts);
    }

    if(gameState===STATE.TITLE){
        drawTitleCanvas(ts);
    }

    rafId = requestAnimationFrame(loop);
}

// ==================== タイトル描画（ゲームキャンバス） ====================
function drawTitle(ts){
    if(!ctx) return;
    const tm = ts*0.001;
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#050508'); g.addColorStop(1,'#020203');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

    ctx.fillStyle='#080810';
    ctx.beginPath(); ctx.moveTo(W*0.1,H*0.65); ctx.lineTo(W*0.9,H*0.65); ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();

    for(let i=0;i<5;i++){
        const x = (i/5)*W + Math.sin(tm*0.3+i)*20;
        const h = 30+Math.sin(i*1.7)*20;
        ctx.fillStyle = `rgba(10,10,15,0.8)`;
        ctx.fillRect(x,H*0.65-h,3,h);
        if(i%2===0){
            ctx.fillStyle = `rgba(255,180,80,${0.05+0.05*Math.sin(tm+i)})`;
            ctx.beginPath(); ctx.arc(x+1.5,H*0.65-h-3,safeR(4),0,Math.PI*2); ctx.fill();
        }
    }

    ctx.fillStyle='rgba(255,255,255,0.02)';
    for(let i=0;i<30;i++) ctx.fillRect(rand(0,W),rand(0,H),1,1);

    const titleText = currentLang==='zh' ? '浣熊之日' : 'アライグマの日';
    const subText = currentLang==='zh' ? '— 翌日 —' : '— 翌日 —';

    ctx.fillStyle = `rgba(180,180,170,${0.3+0.1*Math.sin(tm*0.5)})`;
    ctx.font = `${Math.floor(W*0.08)}px monospace`;
    ctx.textAlign='center';
    ctx.fillText(titleText, W/2, H*0.3);
    ctx.fillStyle = `rgba(120,0,0,${0.2+0.1*Math.sin(tm*0.7)})`;
    ctx.font = `${Math.floor(W*0.04)}px monospace`;
    ctx.fillText(subText, W/2, H*0.4);

    ctx.fillStyle = `rgba(80,80,80,${0.3+0.2*Math.sin(tm*1.5)})`;
    ctx.font = '12px monospace';
    const hintText = currentLang==='zh' ? '→ 向前走（无法回头） ←' : '→ 前に進む（戻れない） ←';
    ctx.fillText(hintText, W/2, H*0.85);
}

// ==================== タイトル独立キャンバス ====================
function drawTitleCanvas(ts){
    if(!titleCtx) return;
    const tm = ts*0.001;
    titleCtx.fillStyle = '#030305';
    titleCtx.fillRect(0,0,tW,tH);

    for(let i=0;i<6;i++){
        const fx = (tm*(20+i*10)) % (tW+200) - 100 + i*150;
        const fy = tH*0.3 + Math.sin(tm*0.5+i)*30 + i*40;
        const grad = titleCtx.createRadialGradient(fx,fy,0,fx,fy,80+i*20);
        grad.addColorStop(0,`rgba(20,20,30,${0.03+0.02*Math.sin(tm+i)})`);
        grad.addColorStop(1,'rgba(20,20,30,0)');
        titleCtx.fillStyle=grad;
        titleCtx.fillRect(fx-100,fy-100,200,200);
    }

    for(let i=0;i<4;i++){
        const lx = (i+1)*tW/5 + Math.sin(tm*0.3+i)*10;
        const lh = 40+Math.sin(i*2)*15;
        const ly = tH*0.6 - lh;
        titleCtx.fillStyle = '#0a0a0f';
        titleCtx.fillRect(lx, ly, 2, lh);
        const lit = 0.3+0.2*Math.sin(tm*2+i);
        titleCtx.fillStyle = `rgba(255,180,80,${lit*0.4})`;
        titleCtx.beginPath(); titleCtx.arc(lx+1,ly-3,safeR(4),0,Math.PI*2); titleCtx.fill();
        const lg = titleCtx.createRadialGradient(lx+1,ly-3,0,lx+1,ly-3,50);
        lg.addColorStop(0,`rgba(255,180,80,${lit*0.08})`);
        lg.addColorStop(1,'rgba(255,180,80,0)');
        titleCtx.fillStyle=lg; titleCtx.fillRect(lx-40,ly-40,80,80);
    }

    titleCtx.fillStyle = '#050508';
    titleCtx.fillRect(0,tH*0.6,tW,tH*0.4);

    for(let gx=0;gx<tW;gx+=40){
        const shade = 5+Math.sin(gx*0.1+tm)*3;
        titleCtx.fillStyle = `rgb(${shade},${shade},${shade+2})`;
        titleCtx.fillRect(gx,tH*0.6,38,2);
    }

    for(let i=0;i<15;i++){
        const px = (Math.sin(tm*0.3+i*1.7)*0.3+0.5)*tW;
        const py = (Math.cos(tm*0.2+i*0.9)*0.3+0.5)*tH*0.7;
        const a = 0.1+0.1*Math.sin(tm+i);
        titleCtx.fillStyle = `rgba(150,150,160,${a})`;
        titleCtx.fillRect(px,py,2,2);
    }
}

// ==================== 入力 ====================
function bindInput(){
    const pressForward = e=>{
        e.preventDefault();
        keys.forward=true;
        if(gameState===STATE.WALKING) isWalking=true;
    };
    const releaseForward = e=>{
        e.preventDefault();
        keys.forward=false;
        isWalking=false;
    };

    document.addEventListener('keydown',e=>{
        if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'||e.key===' '){ pressForward(e); }
        if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
    });
    document.addEventListener('keyup',e=>{
        if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'||e.key===' '){ releaseForward(e); }
    });
    document.addEventListener('blur',()=>{keys={};isWalking=false;});

    document.addEventListener('mousemove',e=>{
        document.documentElement.style.setProperty('--mx',e.clientX+'px');
        document.documentElement.style.setProperty('--my',e.clientY+'px');
    });

    const btn=$('btn-forward');
    if(btn){
        const p=e=>{e.preventDefault();pressForward(e);};
        const r=e=>{e.preventDefault();releaseForward(e);};
        btn.addEventListener('touchstart',p,{passive:false});
        btn.addEventListener('touchend',r,{passive:false});
        btn.addEventListener('touchcancel',r,{passive:false});
        btn.addEventListener('mousedown',p);
        btn.addEventListener('mouseup',r);
        btn.addEventListener('mouseleave',r);
    }
}

// ==================== 言語切替 ====================
function toggleLanguage(){
    currentLang = currentLang==='ja' ? 'zh' : 'ja';
    applyLanguage();
}

function applyLanguage(){
    const dict = I18N[currentLang];
    document.documentElement.lang = currentLang==='ja' ? 'ja' : 'zh-CN';
    document.title = currentLang==='ja' ? 'アライグマの日 — 翌日' : '浣熊之日 — 翌日';

    // タイトル
    const titleMain = document.querySelector('.title-main');
    if(titleMain){ titleMain.textContent = dict.title; titleMain.setAttribute('data-text', dict.title); }
    const titleSub = document.querySelector('.title-sub');
    if(titleSub){ titleSub.textContent = dict.subtitle; titleSub.setAttribute('data-text', dict.subtitle); }
    const lore = document.querySelector('.title-lore');
    if(lore) lore.innerHTML = dict.lore;
    const startBtn = document.querySelector('#start-btn .btn-text');
    if(startBtn) startBtn.textContent = dict.startBtn;
    const hint = document.querySelector('.title-hint');
    if(hint) hint.textContent = dict.hint;

    // モバイルボタン
    const fwBtn = document.querySelector('#btn-forward');
    if(fwBtn){
        fwBtn.textContent = currentLang==='zh' ? '▶ 向前走' : '▶ 進む';
    }

    // 言語ボタンラベル
    const langLabel = $('lang-label');
    if(langLabel) langLabel.textContent = dict.langBtn;

    // body データ属性
    document.body.setAttribute('data-lang', currentLang);
}

// ==================== ゲーム開始 ====================
function startGame(){
    initAudio();
    currentDay = 0;
    playerX = 0;
    cameraX = 0;
    walkProgress = 0;
    isWalking = false;
    decayLevel = 0;

    $('title-screen').classList.remove('active');
    $('ending-screen').classList.remove('active');
    $('day-transition').classList.remove('active');
    $('game-screen').classList.add('active');

    $('day-display').textContent = DAYS[0].name;
    $('day-display').className = 'hud-day';

    generateScene(0);
    updateHUD();

    gameState = STATE.WALKING;
    startAmbient(DAYS[0]);

    tone(55,1.5,'sine',0.1);
    setTimeout(()=>tone(82,2,'triangle',0.06),500);

    lastTime = 0;
    if(rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
}

// ==================== 初期化 ====================
function init(){
    canvas = $('game-canvas');
    ctx = canvas.getContext('2d');

    titleCanvas = $('title-canvas');
    titleCtx = titleCanvas.getContext('2d');

    function resize(){
        const wrap = canvas.parentElement;
        const cw = Math.max(wrap.clientWidth-10, 200);
        const ch = Math.max(wrap.clientHeight-10, 150);
        const aspect = 16/9;
        let w=cw, h=cw/aspect;
        if(h>ch){h=ch;w=h*aspect;}
        canvas.width=Math.floor(w); canvas.height=Math.floor(h);
        W=canvas.width; H=canvas.height;

        const tParent = titleCanvas.parentElement;
        const tw = Math.max(tParent.clientWidth, 200);
        const th = Math.max(tParent.clientHeight, 200);
        titleCanvas.width=Math.floor(tw); titleCanvas.height=Math.floor(th);
        tW=titleCanvas.width; tH=titleCanvas.height;
    }
    resize();
    window.addEventListener('resize',()=>{ resize(); });

    bindInput();

    // 言語ボタン
    $('lang-btn').addEventListener('click', toggleLanguage);

    // 初期言語適用（日本語）
    applyLanguage();

    $('start-btn').addEventListener('click',startGame);
    $('restart-btn').addEventListener('click',()=>{
        $('ending-screen').classList.remove('active');
        $('game-screen').classList.remove('active');
        $('title-screen').classList.add('active');
        applyLanguage();
        gameState = STATE.TITLE;
        lastTime=0;
        document.body.classList.remove('rotted');
        document.documentElement.style.setProperty('--decay', '0');
    });

    rafId = requestAnimationFrame(loop);
}

init();

})();