/* 雨夜归途：二维/三维地图场景路由。两套实现共享父页面状态，但布局、交互、样式彼此独立。 */
(function(global){
'use strict';
var THREE_D = Object.freeze({alley:1,backstreet:1,shop:1,street:1,powerstation:1,rooftop:1,underpass:1,riverside:1,doorstep:1,house:1,neighbor:1});
var map2d=global.RaccoonMap2D, classic2d=global.RaccoonMapClassic2D, map3d=global.RaccoonMap3D, current='alley', callback=null, active=null, style='future';
function is3D(k){return Object.prototype.hasOwnProperty.call(THREE_D,String(k||''));}
function pick(){return is3D(current)?map3d:(style==='classic'?classic2d:map2d);}
function ensure(m){if(m&&m.init)m.init();}
function setCurrentScene(k){current=String(k||'alley');if(map2d&&map2d.setCurrentScene)map2d.setCurrentScene(current);if(classic2d&&classic2d.setCurrentScene)classic2d.setCurrentScene(current);if(map3d&&map3d.setCurrentScene)map3d.setCurrentScene(current);}
function setTravelCallback(cb){callback=cb;if(map2d&&map2d.setTravelCallback)map2d.setTravelCallback(cb);if(classic2d&&classic2d.setTravelCallback)classic2d.setTravelCallback(cb);if(map3d&&map3d.setTravelCallback)map3d.setTravelCallback(cb);}
function open(){var m=pick();if(active&&active!==m&&active.close)active.close();active=m;ensure(m);if(m&&m.open)m.open();}
function close(){if(active&&active.close)active.close();active=null;}
function delegate(name,args,def){var m=active||pick();return m&&typeof m[name]==='function'?m[name].apply(m,args):def;}
global.RaccoonMap={
 init:function(){ensure(map2d);ensure(classic2d);ensure(map3d);setCurrentScene(current);setTravelCallback(callback);},open:open,close:close,
 isOpen:function(){return !!(active&&active.isOpen&&active.isOpen());},setCurrentScene:setCurrentScene,setTravelCallback:setTravelCallback,
 reportTravelResult:function(v){return delegate('reportTravelResult',[v]);},getNodeScreenRect:function(k){var m=is3D(k)?map3d:map2d;return m&&m.getNodeScreenRect?m.getNodeScreenRect(k):null;},
 getCurrentNodeKey:function(){return current;},getAdjacentTargets:function(){return delegate('getAdjacentTargets',[],[]);},
 getSceneCatalog:function(){return delegate('getSceneCatalog',[],{});},set2DStyle:function(v){v=v==='classic'?'classic':'future';if(style===v)return;var was=!!(active&&active.isOpen&&active.isOpen());if(was&&active.close)active.close();style=v;active=null;if(was)open();},get2DStyle:function(){return style;},getMapMode:function(){return is3D(current)?'3d':'2d';}
};
})(window);
