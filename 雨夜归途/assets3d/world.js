/* 雨夜归途：入口锚定的连续街区拓扑（不再连接出生点） */
(function(global){
'use strict';
var regions={
 alley:{offset:{x:0,z:0},label:'雨巷',level:0,openSky:true},
 backstreet:{offset:{x:9,z:1},label:'后巷',level:0,openSky:true},
 shop:{offset:{x:29,z:2},label:'便利店',level:0},
 street:{offset:{x:44,z:2},label:'街道',level:0,openSky:true},
 powerstation:{offset:{x:31,z:16},label:'配电房',level:0},
 rooftop:{offset:{x:10,z:-20},label:'屋顶',level:5.04,openSky:true},
 underpass:{offset:{x:48,z:18},label:'地下通道',level:-3.06},
 riverside:{offset:{x:66,z:15},label:'河堤',level:-0.54,openSky:true},
 doorstep:{offset:{x:67,z:2},label:'门前',level:0.18,openSky:true},
 house:{offset:{x:82,z:2},label:'红屋顶房屋',level:0.18},
 neighbor:{offset:{x:68,z:19},label:'邻屋',level:0.18}
};
function P(region,x,z){var r=regions[region];return{x:r.offset.x+x,z:r.offset.z+z,y:r.level};}
var routes=[
 {id:'alley_backstreet',from:'alley',to:'backstreet',a:P('alley',8,4.5),b:P('backstreet',0,3.5),width:2,kind:'gap',direction:'both',condition:'always',visible:'巷口缺口'},
 {id:'backstreet_shop',from:'backstreet',to:'shop',a:P('backstreet',19,7.5),b:P('shop',0,7.5),width:2,kind:'controlledDoor',direction:'both',condition:'key&&powerCut',visible:'后门、门板与锁'},
 {id:'shop_street',from:'shop',to:'street',a:P('shop',14,3.5),b:P('street',0,3.5),width:1.8,kind:'windowDrop',direction:'forward',condition:'shopWindowOpened',visible:'破后窗与落差',drop:.18},
 {id:'backstreet_powerstation',from:'backstreet',to:'powerstation',a:P('backstreet',18.5,14.5),b:P('powerstation',1.5,.5),width:1.8,kind:'ironDoor',direction:'both',condition:'powerDoor',visible:'后巷小铁门'},
 {id:'street_powerstation',from:'street',to:'powerstation',a:P('street',2.5,11.5),b:P('powerstation',10.5,5.5),width:1.8,kind:'ironDoor',direction:'both',condition:'powerDoor',visible:'街道配电房门'},
 {id:'backstreet_rooftop',from:'backstreet',to:'rooftop',a:P('backstreet',4.5,1),b:P('rooftop',4.5,14),width:1.7,kind:'fireEscape',direction:'both',condition:'stairsReached',visible:'消防梯',steps:28,landings:3,rail:true},
 {id:'street_underpass',from:'street',to:'underpass',a:P('street',7.5,11.5),b:P('underpass',3.5,.5),width:2,kind:'underpassStairs',direction:'both',condition:'underpassKnown',visible:'地下入口',steps:18,landings:2,rail:true},
 {id:'street_riverside',from:'street',to:'riverside',a:P('street',21,9.5),b:P('riverside',0,3.5),width:2,kind:'gap',direction:'both',condition:'riversideKnown',visible:'护栏缺口',steps:3,landings:1,rail:false},
 {id:'street_doorstep',from:'street',to:'doorstep',a:P('street',21,5.5),b:P('doorstep',0,7.5),width:2.4,kind:'controlledGate',direction:'both',condition:'gateUnlocked',visible:'铁门与院路',steps:1,landings:1,rail:true},
 {id:'doorstep_house',from:'doorstep',to:'house',a:P('doorstep',14,2.5),b:P('house',0,2.5),width:2,kind:'frontDoor',direction:'both',condition:'houseDoor',visible:'正门'},
 {id:'street_neighbor',from:'street',to:'neighbor',a:P('street',21,11.5),b:P('neighbor',0,2.5),width:1.8,kind:'anomalyDoor',direction:'both',condition:'bloodMode',visible:'暗夜异常门'},
 {id:'neighbor_doorstep',from:'neighbor',to:'doorstep',a:P('neighbor',7.5,0),b:P('doorstep',7.5,12),width:1.8,kind:'burntDoor',direction:'forward',condition:'bloodMode&&neighborExit',visible:'烧毁门'}
];
var links=routes.map(function(r){return[r.from,r.to];}),connections={};Object.keys(regions).forEach(function(k){connections[k]=[];});
routes.forEach(function(r){connections[r.from].push(r.to);if(r.direction!=='forward')connections[r.to].push(r.from);});
global.__WORLD_3D__={version:4,regions:regions,routes:routes,links:links,connections:connections,activeRadius:1,
 movement:{radius:.22,height:1.15,eye:1.3,maxSlope:.78,maxStep:.24,fallLimit:7},
 topology:['雨巷↔后巷','后巷↔便利店','便利店→街道','后巷↔配电房','街道↔配电房','后巷↔屋顶','街道↔地下通道','街道↔河堤','街道↔门前','门前↔红屋顶房屋','街道↔邻屋','邻屋→门前'],
 forcedTransitions:['普通/万圣节结局','白天线与幻境','剧情明确的门内事件']};
})(window);
