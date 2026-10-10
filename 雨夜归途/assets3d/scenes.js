/* =========================================================
   3D 场景定义
   grid: '1'=墙 '0'=地
   spawn: {x, y, dir}  dir = 弧度，0 = +x 方向
   wallTex: 墙壁纹理参数（程序生成）
   lights: 场景灯光（最多 3 盏，手电筒占用第 1 个槽）
   things: {id, x, y, icon, label, scale, cond, decor}
   ========================================================= */
(function(){
'use strict';

const F = () => (window.S && window.S.flags) || {};

window.__SCENES_3D__ = {

  alley: {
    wallTex: { type:'wetBrick', base:'#1a1018', mortar:'rgba(0,0,0,0.6)' },
    spawn: { x:1.5, y:9.5, dir:-Math.PI/2 },
    rain: true,
    lights: [
      { x:1.7, y:1.9, z:1.7, color: [1.6, 1.1, 0.5] },
      { x:5.5, y:1.4, z:5.5, color: [0.4, 0.5, 0.7] }
    ],
    grid: [
      '1111111',
      '1000001',
      '1000001',
      '1000001',
      '1000001',
      '1000001',
      '1000001',
      '1000001',
      '1000001',
      '1000001',
      '1000001',
      '1111111'
    ],
    things: [
      { id:'lamp',      x:1.7, y:1.7,  icon:'🏮', label:'路灯',       scale:0.9 },
      { id:'wires',     x:3.5, y:1.7,  icon:'⚡', label:'电线',       scale:0.7 },
      { id:'graffiti',  x:1.7, y:5.5,  icon:'🖍', label:'墙上的字',   scale:0.8 },
      { id:'trash',     x:5.5, y:5.5,  icon:'🗑', label:'垃圾桶',     scale:1.0 },
      { id:'photo1',    x:5.5, y:9.5,  icon:'📄', label:'湿透的纸片', scale:0.7,
        cond: () => !F().photo1Taken && !F().bloodMode },
      { id:'puddle',    x:3.5, y:9.5,  icon:'💧', label:'水洼',       scale:0.6 },
      { id:'bloodExit', x:1.7, y:11.3, icon:'🚪', label:'墙根窄缝',   scale:0.8,
        cond: () => F().bloodMode },
      { id:'exit',      x:5.5, y:1.5,  icon:'➡',  label:'巷子深处',   scale:0.9 },
      { id:'d_bucket',  x:1.6, y:3.3,  icon:'🪣', decor:true, scale:0.7 },
      { id:'d_rat',     x:5.6, y:7.3,  icon:'🐀', decor:true, scale:0.5 }
    ]
  },

  backstreet: {
    wallTex: { type:'brick', base:'#1a1414', mortar:'rgba(0,0,0,0.5)', accent:'rgba(255,255,255,0.03)' },
    spawn: { x:1.5, y:5.5, dir:0 },
    rain: true,
    lights: [
      { x:3.5, y:2.2, z:1.7, color: [1.4, 0.9, 0.4] },
      { x:10.5, y:1.8, z:5.5, color: [0.6, 1.2, 1.5] }
    ],
    grid: [
      '111111111111111',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '111111111111111'
    ],
    things: [
      { id:'stairs',    x:3.5,  y:1.7, icon:'🪜', label:'消防梯',     scale:1.1 },
      { id:'mold',      x:7.5,  y:1.7, icon:'🟢', label:'墙上的霉斑', scale:0.8 },
      { id:'box',       x:2.5,  y:6.5, icon:'📦', label:'纸箱',       scale:0.9 },
      { id:'cat',       x:3.5,  y:6.5, icon:'🐈',
        label: () => F().bloodMode ? '干涸的水渍' : '大橘',
        scale:0.9, cond: () => !F().catGone },
      { id:'door',      x:10.5, y:5.5, icon:'🚪', label:'后门',       scale:1.1 },
      { id:'powerDoor', x:7.5,  y:8.5, icon:'⚡', label:'配电房',     scale:0.9 },
      { id:'back',      x:1.5,  y:5.5, icon:'⬅',  label:'回到雨巷',   scale:0.8 },
      { id:'d_crate',   x:13.5, y:2.5, icon:'📦', decor:true, scale:0.8 },
      { id:'d_pipe',    x:12.5, y:8.5, icon:'🪈', decor:true, scale:0.7 },
      { id:'d_doll',    x:5.5,  y:3.5, icon:'🧸', decor:true, scale:0.6 }
    ]
  },

  shop: {
    wallTex: { type:'tile', base:'#c8d0d8', line:'rgba(0,0,0,0.25)', accent:'rgba(255,255,255,0.18)' },
    spawn: { x:2.5, y:5.5, dir:0 },
    lights: [
      { x:5.5, y:2.4, z:5.5, color: [1.6, 1.5, 1.2] },
      { x:8.5, y:2.0, z:5.5, color: [0.5, 0.7, 1.0] }
    ],
    grid: [
      '11111111111',
      '10000000001',
      '10000000001',
      '10000000001',
      '10000000001',
      '10000000001',
      '10000000001',
      '10000000001',
      '10000000001',
      '11111111111'
    ],
    things: [
      { id:'poster',   x:5.5, y:1.7, icon:'📜', label:'墙上海报',   scale:0.8 },
      { id:'counter',  x:8.5, y:5.5, icon:'💳', label:'收银台',     scale:1.0 },
      { id:'shelf',    x:3.5, y:4.5, icon:'📚', label:'货架',       scale:1.1 },
      { id:'floor',    x:5.5, y:7.5, icon:'📐', label:'地板',       scale:0.7 },
      { id:'window',   x:1.7, y:5.5, icon:'🪟', label:'后窗',       scale:0.8 },
      { id:'back',     x:2.5, y:9.5, icon:'⬅',  label:'回到后巷',   scale:0.8 },
      { id:'d_basket', x:4.5, y:2.5, icon:'🧺', decor:true, scale:0.7 },
      { id:'d_mop',    x:7.5, y:2.5, icon:'🧹', decor:true, scale:0.8 }
    ]
  },

  street: {
    wallTex: { type:'brick', base:'#1c2430', mortar:'rgba(0,0,0,0.4)', accent:'rgba(180,210,255,0.03)' },
    spawn: { x:2.5, y:5.5, dir:0 },
    rain: true,
    lights: [
      { x:2.5,  y:2.4, z:1.7, color: [1.6, 1.2, 0.6] },
      { x:11.5, y:2.0, z:5.5, color: [0.6, 0.9, 1.4] }
    ],
    grid: [
      '1111111111111111',
      '1000000000000001',
      '1000000000000001',
      '1000000000000001',
      '1000000000000001',
      '1000000000000001',
      '1000000000000001',
      '1000000000000001',
      '1000000000000001',
      '1111111111111111'
    ],
    things: [
      { id:'lamp',    x:2.5,  y:1.7, icon:'🏮', label:'路灯',       scale:0.9 },
      { id:'power',   x:4.5,  y:1.7, icon:'⚡', label:'配电房',     scale:1.0 },
      { id:'under',   x:6.5,  y:1.7, icon:'⬇',  label:'地下通道',   scale:0.9 },
      { id:'river',   x:1.7,  y:5.5, icon:'🌊', label:'河堤',       scale:0.9 },
      { id:'rope',    x:5.5,  y:4.5, icon:'🧵', label:'晾衣绳',     scale:0.7,
        cond: () => !F().ropeTaken },
      { id:'gate',    x:11.5, y:5.5, icon:'🚪', label:'铁门',       scale:1.2 },
      { id:'tree',    x:13.5, y:2.5, icon:'🌳', label:'梧桐树',     scale:1.1 },
      { id:'mailbox', x:13.5, y:7.5, icon:'📮', label:'信箱',       scale:0.8 },
      { id:'fire',    x:14.5, y:8.5, icon:'🧯', label:'消防栓',     scale:0.7 },
      { id:'back',    x:1.5,  y:5.5, icon:'⬅',  label:'回后巷',     scale:0.8 },
      { id:'d_car',   x:8.5,  y:3.5, icon:'🚗', decor:true, scale:1.0 },
      { id:'d_bin',   x:8.5,  y:7.5, icon:'🗑', decor:true, scale:0.8 },
      { id:'d_sign',  x:10.5, y:1.7, icon:'🪧', decor:true, scale:0.8 }
    ]
  },

  doorstep: {
    wallTex: { type:'brick', base:'#3a2a20', mortar:'rgba(0,0,0,0.35)', accent:'rgba(255,240,200,0.05)' },
    spawn: { x:2.5, y:8.5, dir:0 },
    lights: [
      { x:6.5, y:2.0, z:1.7, color: [1.8, 1.2, 0.5] },
      { x:4.5, y:1.8, z:4.5, color: [0.4, 0.4, 0.6] }
    ],
    grid: [
      '1111111111111',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1111111111111'
    ],
    things: [
      { id:'window',  x:4.5, y:1.7, icon:'🪟', label:'窗户',       scale:1.0 },
      { id:'lamp',    x:6.5, y:1.7, icon:'🏮', label:'门灯',       scale:0.7 },
      { id:'door',    x:6.5, y:4.5, icon:'🚪', label:'门',         scale:1.2 },
      { id:'steps',   x:6.5, y:7.5, icon:'🪜', label:'台阶',       scale:0.6 },
      { id:'back',    x:2.5, y:5.5, icon:'⬅',  label:'回到街道',   scale:0.8 },
      { id:'d_plant', x:9.5, y:2.5, icon:'🪴', decor:true, scale:0.8 },
      { id:'d_mat',   x:8.5, y:6.5, icon:'🧻', decor:true, scale:0.5 }
    ]
  },

  house: {
    wallTex: { type:'wood', base:'#5a3a20', line:'rgba(0,0,0,0.35)' },
    spawn: { x:5.5, y:5.5, dir:Math.PI },
    lights: [
      { x:5.5, y:2.4, z:5.5, color: [1.8, 1.4, 0.9] },
      { x:9.5, y:2.0, z:3.5, color: [1.4, 1.0, 0.5] }
    ],
    grid: [
      '11111111111',
      '10000000001',
      '10000000001',
      '10000000001',
      '10000000001',
      '10000000001',
      '10000000001',
      '10000000001',
      '10000000001',
      '11111111111'
    ],
    things: [
      { id:'window',  x:2.5, y:1.7, icon:'🪟', label:'窗户',       scale:1.1 },
      { id:'clock',   x:5.5, y:1.7, icon:'🕰', label:'挂钟',       scale:0.8 },
      { id:'books',   x:1.7, y:4.5, icon:'📚', label:'书架',       scale:0.9 },
      { id:'lamp',    x:9.5, y:3.5, icon:'💡', label:'台灯',       scale:0.8 },
      { id:'frame',   x:5.5, y:8.5, icon:'🖼', label:'相框',       scale:0.9 },
      { id:'chair',   x:2.5, y:7.5, icon:'🪑', label:'摇椅',       scale:1.0 },
      { id:'bowl',    x:3.5, y:8.5, icon:'🥣', label:'小碗',       scale:0.6 },
      { id:'back',    x:1.5, y:5.5, icon:'⬅',  label:'回到门前',   scale:0.8 },
      { id:'d_plant', x:8.5, y:1.7, icon:'🪴', decor:true, scale:0.8 },
      { id:'d_candle',x:7.5, y:8.5, icon:'🕯', decor:true, scale:0.5 },
      { id:'d_rug',   x:5.5, y:5.5, icon:'🟫', decor:true, scale:0.5 }
    ]
  },

  powerstation: {
    wallTex: { type:'metal', base:'#3a4048', line:'rgba(0,0,0,0.4)' },
    spawn: { x:2.5, y:5.5, dir:0 },
    lights: [
      { x:5.5, y:2.4, z:5.5, color: [0.7, 0.9, 1.2] },
      { x:1.7, y:2.0, z:3.5, color: [1.2, 0.4, 0.3] }
    ],
    grid: [
      '1111111111',
      '1000000001',
      '1000000001',
      '1000000001',
      '1000000001',
      '1000000001',
      '1000000001',
      '1000000001',
      '1111111111'
    ],
    things: [
      { id:'breaker', x:8.5, y:3.5, icon:'⚡', label:'电闸',       scale:1.0 },
      { id:'fuse',    x:1.7, y:3.5, icon:'🔌', label:'保险丝盒',   scale:0.9 },
      { id:'log',     x:5.5, y:7.5, icon:'📓', label:'工作日志',   scale:0.8 },
      { id:'back',    x:1.5, y:5.5, icon:'⬅',  label:'回去',       scale:0.8 },
      { id:'d_wire',  x:5.5, y:1.7, icon:'🪢', decor:true, scale:0.6 },
      { id:'d_warn',  x:7.5, y:1.7, icon:'⚠',  decor:true, scale:0.8 }
    ]
  },

  rooftop: {
    wallTex: { type:'brick', base:'#1a2028', mortar:'rgba(0,0,0,0.5)' },
    spawn: { x:5.5, y:7.5, dir:Math.PI },
    lights: [
      { x:5.5,  y:3.2, z:5.5, color: [0.3, 0.4, 0.7] },
      { x:11.5, y:1.8, z:2.5, color: [1.4, 0.8, 0.4] }
    ],
    grid: [
      '111111111111111',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '100000000000001',
      '111111111111111'
    ],
    things: [
      { id:'antenna',   x:2.5,  y:1.7, icon:'📡', label:'旧天线',       scale:1.1 },
      { id:'watertank', x:13.5, y:1.7, icon:'🛢', label:'水塔',         scale:1.1 },
      { id:'hang',      x:6.5,  y:2.5, icon:'🧵', label:'晾衣架',       scale:0.8 },
      { id:'houseroof', x:11.5, y:2.5, icon:'🏠', label:'远处的红屋顶', scale:1.0 },
      { id:'back',      x:1.5,  y:5.5, icon:'⬅',  label:'回到后巷',     scale:0.8 },
      { id:'d_star',    x:4.5,  y:1.7, icon:'⭐', decor:true, scale:0.6 },
      { id:'d_bird',    x:9.5,  y:2.5, icon:'🐦', decor:true, scale:0.5 }
    ]
  },

  underpass: {
    wallTex: { type:'brick', base:'#1a2028', mortar:'rgba(0,0,0,0.55)' },
    spawn: { x:2.5, y:5.5, dir:0 },
    lights: [
      { x:2.5, y:2.4, z:1.7, color: [0.8, 0.9, 1.1] },
      { x:7.5, y:2.2, z:1.7, color: [0.5, 1.2, 0.8] }
    ],
    grid: [
      '1111111111111',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1111111111111'
    ],
    things: [
      { id:'stairs',    x:2.5,  y:1.7, icon:'🪜', label:'上方的楼梯', scale:1.0 },
      { id:'graffiti',  x:4.5,  y:1.7, icon:'🖍', label:'墙上的涂鸦', scale:0.8 },
      { id:'emergency', x:7.5,  y:1.7, icon:'💡', label:'应急灯',     scale:0.7 },
      { id:'trash',     x:8.5,  y:8.5, icon:'🗑', label:'垃圾桶',     scale:0.9 },
      { id:'room',      x:10.5, y:5.5, icon:'⚡', label:'配电房的门', scale:0.9 },
      { id:'back',      x:1.5,  y:5.5, icon:'⬅',  label:'回到街道',   scale:0.8 },
      { id:'d_puddle',  x:5.5,  y:5.5, icon:'💧', decor:true, scale:0.5 }
    ]
  },

  riverside: {
    wallTex: { type:'brick', base:'#1a2230', mortar:'rgba(0,0,0,0.45)' },
    spawn: { x:2.5, y:5.5, dir:0 },
    rain: true,
    lights: [
      { x:2.5, y:2.4, z:1.7, color: [1.6, 1.2, 0.5] },
      { x:5.5, y:1.5, z:8.5, color: [0.4, 0.6, 1.0] }
    ],
    grid: [
      '1111111111111',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1111111111111'
    ],
    things: [
      { id:'lamp',     x:2.5, y:1.7, icon:'🏮', label:'路灯',       scale:0.9 },
      { id:'bench',    x:5.5, y:1.7, icon:'🪑', label:'长椅',       scale:1.0 },
      { id:'umbrella', x:8.5, y:1.7, icon:'☂',  label:'丢弃的伞',   scale:0.9 },
      { id:'river',    x:5.5, y:8.5, icon:'🌊', label:'河面',       scale:1.2 },
      { id:'back',     x:1.5, y:5.5, icon:'⬅',  label:'回到街道',   scale:0.8 },
      { id:'d_boat',   x:9.5, y:8.5, icon:'⛵', decor:true, scale:0.9 },
      { id:'d_reed',   x:3.5, y:8.5, icon:'🌾', decor:true, scale:0.7 }
    ]
  },

  neighbor: {
    wallTex: { type:'burnt', base:'#120806' },
    spawn: { x:2.5, y:5.5, dir:0 },
    lights: [
      { x:5.5, y:2.0, z:1.7, color: [1.2, 0.4, 0.3] },
      { x:9.5, y:1.6, z:5.5, color: [0.5, 0.3, 0.3] }
    ],
    grid: [
      '1111111111111',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1000000000001',
      '1111111111111'
    ],
    things: [
      { id:'neighborWindow',   x:5.5,  y:1.7, icon:'🪟', label:'窗户',         scale:1.1 },
      { id:'neighborCalendar', x:2.5,  y:1.7, icon:'📅', label:'日历',         scale:0.8 },
      { id:'neighborFloor',    x:5.5,  y:5.5, icon:'🐾', label:'地板上的爪印', scale:0.7 },
      { id:'neighborBed',      x:9.5,  y:5.5, icon:'🛏', label:'小床',         scale:1.0 },
      { id:'back',             x:2.5,  y:9.5, icon:'⬅',  label:'来的路',       scale:0.8 },
      { id:'exit',             x:11.5, y:5.5, icon:'➡',  label:'通向院子的门', scale:0.9 },
      { id:'d_ash',            x:7.5,  y:1.7, icon:'🪵', decor:true, scale:0.6 },
      { id:'d_smoke',          x:3.5,  y:8.5, icon:'💨', decor:true, scale:0.7 }
    ]
  }
};
})();