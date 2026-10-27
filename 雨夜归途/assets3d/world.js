/* 雨夜归途：连续立体世界、垂直碰撞与步行连接 */
(function(global){
'use strict';
var regions = {
  alley:        { offset:{x:0,z:0},    label:'雨巷',     level:0, surface:true, openSky:true },
  backstreet:   { offset:{x:8,z:2},    label:'后巷',     level:0, surface:true, openSky:true },
  shop:         { offset:{x:27,z:4},   label:'便利店',   level:0, surface:false },
  street:       { offset:{x:41,z:4},   label:'街道',     level:0, surface:true, openSky:true },
  doorstep:     { offset:{x:62,z:4},   label:'门前',     level:0.35, surface:true, openSky:true },
  house:        { offset:{x:76,z:4},   label:'红屋顶',   level:0.55, surface:false },
  powerstation: { offset:{x:12,z:17},  label:'配电房',   level:-0.2, surface:false },
  rooftop:      { offset:{x:8,z:-16},  label:'屋顶',     level:5.2, surface:true, openSky:true },
  underpass:    { offset:{x:45,z:17},  label:'地下通道', level:-3.1, surface:false },
  riverside:    { offset:{x:57,z:17},  label:'河堤',     level:-0.7, surface:true, openSky:true },
  neighbor:     { offset:{x:69,z:17},  label:'邻屋',     level:0.25, surface:false }
};
var links = [
  ['alley','backstreet'], ['backstreet','shop'], ['shop','street'],
  ['street','doorstep'], ['doorstep','house'], ['backstreet','powerstation'],
  ['backstreet','rooftop'], ['street','underpass'], ['street','riverside'],
  ['street','neighbor']
];
var routes = [
  {id:'alley_backstreet',from:'alley',to:'backstreet',width:2.7,kind:'road'},
  {id:'backstreet_shop',from:'backstreet',to:'shop',width:2.5,kind:'doorway'},
  {id:'shop_street',from:'shop',to:'street',width:2.4,kind:'serviceRamp'},
  {id:'street_doorstep',from:'street',to:'doorstep',width:2.8,kind:'porchRamp'},
  {id:'doorstep_house',from:'doorstep',to:'house',width:2.2,kind:'threshold'},
  {id:'backstreet_powerstation',from:'backstreet',to:'powerstation',width:2.2,kind:'serviceRamp'},
  {id:'backstreet_rooftop',from:'backstreet',to:'rooftop',width:2.1,kind:'fireEscape',steps:26,maxStep:0.20},
  {id:'street_underpass',from:'street',to:'underpass',width:2.4,kind:'stairs',steps:18,maxStep:0.18},
  {id:'street_riverside',from:'street',to:'riverside',width:2.6,kind:'leveeRamp'},
  {id:'street_neighbor',from:'street',to:'neighbor',width:2.2,kind:'gateRamp'}
];
var connections={}; Object.keys(regions).forEach(function(k){connections[k]=[];});
links.forEach(function(e){connections[e[0]].push(e[1]);connections[e[1]].push(e[0]);});
function spawn(key){var m=global.__SCENES_3D__&&global.__SCENES_3D__[key],s=m&&m.spawn||{x:1.5,y:1.5};return {x:regions[key].offset.x+s.x,z:regions[key].offset.z+s.y,y:regions[key].level||0};}
routes.forEach(function(r){r.a=spawn(r.from);r.b=spawn(r.to);});
global.__WORLD_3D__={version:2,regions:regions,links:links,routes:routes,connections:connections,activeRadius:1,
  movement:{radius:0.22,height:1.15,eye:1.3,maxSlope:0.78,maxStep:0.24,fallLimit:7},
  forcedTransitions:['普通/万圣节结局','白天线与幻境','剧情明确的门内事件']};
})(window);
