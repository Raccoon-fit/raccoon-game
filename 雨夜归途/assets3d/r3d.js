/* =========================================================
   r3d.js — 极简真 3D 引擎 v3
   纯 WebGL 1.0，零依赖，单文件
   - 三贴图：墙 / 地板 / 天花板
   - 三光源：手电 + 场景灯 + 环境补光
   - Prop 几何体：box / cyl / plate / low
   - iOS WebKit 兼容：纹理优先走 Image
   ========================================================= */
(function(global){
'use strict';

/* ==================== 数学 ==================== */
const M4 = {
  create(){
    const m = new Float32Array(16);
    m[0]=1; m[5]=1; m[10]=1; m[15]=1;
    return m;
  },
  perspective(out, fovy, aspect, near, far){
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    out[1] = out[2] = out[3] = out[4] = 0;
    out[6] = out[7] = out[8] = out[9] = 0;
    out[12] = out[13] = 0;
    out[15] = 0;
    return out;
  },
  lookAt(out, eye, center, up){
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;

    let xx = up[1]*zz - up[2]*zy;
    let xy = up[2]*zx - up[0]*zz;
    let xz = up[0]*zy - up[1]*zx;
    len = Math.hypot(xx, xy, xz);
    if(len < 1e-6){ xx = 1; xy = 0; xz = 0; }
    else { xx /= len; xy /= len; xz /= len; }

    const yx = zy*xz - zz*xy;
    const yy = zz*xx - zx*xz;
    const yz = zx*xy - zy*xx;

    out[0]=xx; out[1]=yx; out[2]=zx; out[3]=0;
    out[4]=xy; out[5]=yy; out[6]=zy; out[7]=0;
    out[8]=xz; out[9]=yz; out[10]=zz; out[11]=0;
    out[12]=-(xx*eye[0]+xy*eye[1]+xz*eye[2]);
    out[13]=-(yx*eye[0]+yy*eye[1]+yz*eye[2]);
    out[14]=-(zx*eye[0]+zy*eye[1]+zz*eye[2]);
    out[15]=1;
    return out;
  },
  multiply(out, a, b){
    for(let r = 0; r < 4; r++){
      for(let c = 0; c < 4; c++){
        let s = 0;
        for(let k = 0; k < 4; k++){
          s += a[k*4 + r] * b[c*4 + k];
        }
        out[c*4 + r] = s;
      }
    }
    return out;
  }
};

/* ==================== 着色器 ==================== */
const VERT_SRC = [
'attribute vec3 aPos;',
'attribute vec3 aNormal;',
'attribute vec2 aUV;',
'uniform mat4 uVP;',
'varying vec3 vNormal;',
'varying vec3 vWorldPos;',
'varying vec2 vUV;',
'varying float vDist;',
'void main(){',
'  vNormal = aNormal;',
'  vWorldPos = aPos;',
'  vUV = aUV;',
'  vec4 clip = uVP * vec4(aPos, 1.0);',
'  vDist = clip.w;',
'  gl_Position = clip;',
'}'
].join('\n');

const FRAG_SRC = [
'precision mediump float;',
'varying vec3 vNormal;',
'varying vec3 vWorldPos;',
'varying vec2 vUV;',
'varying float vDist;',
'uniform sampler2D uTex;',
'uniform float uHasTex;',
'uniform float uAlphaTest;',
'uniform vec3 uColor;',
'uniform vec3 uLP0;',
'uniform vec3 uLP1;',
'uniform vec3 uLP2;',
'uniform vec3 uLC0;',
'uniform vec3 uLC1;',
'uniform vec3 uLC2;',
'uniform vec3 uAmbient;',
'uniform vec3 uCamPos;',
'uniform vec3 uFogColor;',
'uniform float uFogNear;',
'uniform float uFogFar;',
'void main(){',
'  vec4 base = vec4(uColor, 1.0);',
'  if(uHasTex > 0.5){ base *= texture2D(uTex, vUV); }',
'  if(uAlphaTest > 0.5 && base.a < 0.35) discard;',
'  vec3 N = normalize(vNormal);',
'  vec3 V = normalize(uCamPos - vWorldPos);',
'  vec3 lit = uAmbient;',
'  {',
'    vec3 tL = uLP0 - vWorldPos;',
'    float d = length(tL);',
'    vec3 L = tL / max(d, 0.001);',
'    float df = max(dot(N, L), 0.0);',
'    float at = 1.0 / (1.0 + 0.20*d + 0.08*d*d);',
'    vec3 H = normalize(L + V);',
'    float sp = pow(max(dot(N, H), 0.0), 32.0) * 0.12;',
'    lit += uLC0 * (df * at * 6.0 + sp * at);',
'  }',
'  {',
'    vec3 tL = uLP1 - vWorldPos;',
'    float d = length(tL);',
'    vec3 L = tL / max(d, 0.001);',
'    float df = max(dot(N, L), 0.0);',
'    float at = 1.0 / (1.0 + 0.20*d + 0.08*d*d);',
'    vec3 H = normalize(L + V);',
'    float sp = pow(max(dot(N, H), 0.0), 32.0) * 0.12;',
'    lit += uLC1 * (df * at * 6.0 + sp * at);',
'  }',
'  {',
'    vec3 tL = uLP2 - vWorldPos;',
'    float d = length(tL);',
'    vec3 L = tL / max(d, 0.001);',
'    float df = max(dot(N, L), 0.0);',
'    float at = 1.0 / (1.0 + 0.20*d + 0.08*d*d);',
'    vec3 H = normalize(L + V);',
'    float sp = pow(max(dot(N, H), 0.0), 32.0) * 0.12;',
'    lit += uLC2 * (df * at * 6.0 + sp * at);',
'  }',
'  vec3 color = base.rgb * lit;',
'  float fogF = clamp((vDist - uFogNear) / max(uFogFar - uFogNear, 0.01), 0.0, 1.0);',
'  color = mix(color, uFogColor, fogF);',
'  gl_FragColor = vec4(color, base.a);',
'}'
].join('\n');

function compile(gl, type, src){
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
    console.error('[R3D] shader:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}
function linkProgram(gl){
  const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if(!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
    console.error('[R3D] link:', gl.getProgramInfoLog(p));
    return null;
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return p;
}

/* ==================== 纹理 ==================== */
function isPOT(n){ return (n & (n-1)) === 0; }

function makeTexture(gl, source, opts){
  opts = opts || {};
  if(!source) throw new Error('纹理源为空');

  const isImg = (typeof HTMLImageElement !== 'undefined') && (source instanceof HTMLImageElement);
  const w = isImg ? source.naturalWidth : source.width;
  const h = isImg ? source.naturalHeight : source.height;
  if(!w || !h) throw new Error('尺寸无效 ' + w + 'x' + h);

  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, opts.flipY ? 1 : 0);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);

  if(isImg){
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  } else {
    const data = source.getContext('2d').getImageData(0, 0, w, h);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  const wrap = opts.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);

  if(isPOT(w) && isPOT(h) && !opts.noMip){
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }
  return t;
}

/* ==================== 网格 ==================== */
function createMesh(gl){
  return {
    vbo: gl.createBuffer(),
    ibo: gl.createBuffer(),
    indexCount: 0,
    vertexCount: 0
  };
}

function uploadMesh(gl, mesh, P, N, U, I){
  const n = P.length / 3;
  const data = new Float32Array(n * 8);
  for(let i = 0; i < n; i++){
    data[i*8+0] = P[i*3+0];
    data[i*8+1] = P[i*3+1];
    data[i*8+2] = P[i*3+2];
    data[i*8+3] = N[i*3+0];
    data[i*8+4] = N[i*3+1];
    data[i*8+5] = N[i*3+2];
    data[i*8+6] = U[i*2+0];
    data[i*8+7] = U[i*2+1];
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(I), gl.STATIC_DRAW);

  mesh.indexCount = I.length;
  mesh.vertexCount = n;
}

/* ==================== 几何体生成器 ==================== */
function pushQuad(P, N, U, I, v0, v1, v2, v3, n){
  const base = P.length / 3;
  P.push(
    v0[0], v0[1], v0[2],
    v1[0], v1[1], v1[2],
    v2[0], v2[1], v2[2],
    v3[0], v3[1], v3[2]
  );
  for(let k = 0; k < 4; k++) N.push(n[0], n[1], n[2]);
  U.push(0, 0, 1, 0, 1, 1, 0, 1);
  I.push(base, base+1, base+2, base, base+2, base+3);
}

function buildBox(P, N, U, I, cx, y0, cz, w, h, d){
  const hw = w / 2, hd = d / 2;
  const x0 = cx - hw, x1 = cx + hw;
  const y1 = y0 + h;
  const z0 = cz - hd, z1 = cz + hd;

  /* 前 (+z) */
  pushQuad(P, N, U, I,
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    [0, 0, 1]);
  /* 后 (-z) */
  pushQuad(P, N, U, I,
    [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0],
    [0, 0, -1]);
  /* 左 (-x) */
  pushQuad(P, N, U, I,
    [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0],
    [-1, 0, 0]);
  /* 右 (+x) */
  pushQuad(P, N, U, I,
    [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1],
    [1, 0, 0]);
  /* 顶 (+y) */
  pushQuad(P, N, U, I,
    [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0],
    [0, 1, 0]);
  /* 底 (-y) */
  pushQuad(P, N, U, I,
    [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
    [0, -1, 0]);
}

function buildCylinder(P, N, U, I, cx, y0, cz, r, h, seg){
  seg = seg || 10;
  const y1 = y0 + h;

  for(let i = 0; i < seg; i++){
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    const x0 = cx + Math.cos(a0) * r;
    const z0 = cz + Math.sin(a0) * r;
    const x1 = cx + Math.cos(a1) * r;
    const z1 = cz + Math.sin(a1) * r;
    const nx = Math.cos((a0 + a1) / 2);
    const nz = Math.sin((a0 + a1) / 2);

    /* 侧面 */
    pushQuad(P, N, U, I,
      [x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0],
      [nx, 0, nz]);

    /* 顶盖扇形 */
    const topBase = P.length / 3;
    P.push(cx, y1, cz, x0, y1, z0, x1, y1, z1, cx, y1, cz);
    for(let k = 0; k < 4; k++) N.push(0, 1, 0);
    U.push(0.5, 0.5, 0, 0, 1, 0, 0.5, 0.5);
    I.push(topBase, topBase+1, topBase+2, topBase, topBase+2, topBase+3);

    /* 底盖扇形 */
    const botBase = P.length / 3;
    P.push(cx, y0, cz, x1, y0, z1, x0, y0, z0, cx, y0, cz);
    for(let k = 0; k < 4; k++) N.push(0, -1, 0);
    U.push(0.5, 0.5, 1, 0, 0, 0, 0.5, 0.5);
    I.push(botBase, botBase+1, botBase+2, botBase, botBase+2, botBase+3);
  }
}

/* ==================== 渲染器 ==================== */
function Renderer(canvas){
  const gl = canvas.getContext('webgl', {
    antialias: true,
    alpha: false,
    depth: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
  }) || canvas.getContext('experimental-webgl');

  if(!gl) throw new Error('WebGL 不可用');

  this.gl = gl;
  this.canvas = canvas;

  const program = linkProgram(gl);
  if(!program) throw new Error('着色器编译失败');
  this.program = program;

  this.attr = {
    pos:    gl.getAttribLocation(program, 'aPos'),
    normal: gl.getAttribLocation(program, 'aNormal'),
    uv:     gl.getAttribLocation(program, 'aUV')
  };

  this.uni = {};
  const uniNames = ['uVP', 'uTex', 'uHasTex', 'uAlphaTest', 'uColor',
    'uLP0', 'uLP1', 'uLP2', 'uLC0', 'uLC1', 'uLC2',
    'uAmbient', 'uCamPos', 'uFogColor', 'uFogNear', 'uFogFar'];
  for(let i = 0; i < uniNames.length; i++){
    this.uni[uniNames[i]] = gl.getUniformLocation(program, uniNames[i]);
  }

  this.camera = {
    x: 0, y: 1.6, z: 0,
    yaw: 0, pitch: 0,
    fov: Math.PI / 3,
    near: 0.05,
    far: 60
  };

  this.lights = [
    { x: 0, y: -100, z: 0, color: [0, 0, 0] },
    { x: 0, y: -100, z: 0, color: [0, 0, 0] },
    { x: 0, y: -100, z: 0, color: [0, 0, 0] }
  ];
  this.ambient = [0.12, 0.14, 0.18];
  this.fog = { r: 0.04, g: 0.05, b: 0.08, near: 6, far: 22 };

  this.wallMesh = null;  this.wallTex = null;  this.wallHasTex = false;
  this.floorMesh = null; this.floorTex = null; this.floorHasTex = false;
  this.ceilMesh = null;  this.ceilTex = null;  this.ceilHasTex = false;

  this.props = [];

  this.bbMesh = createMesh(gl);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.bbMesh.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, 4 * 8 * 4, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bbMesh.ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  this.bbMesh.indexCount = 6;

  this.billboards = [];
  this._bbData = new Float32Array(4 * 8);

  this._vp = M4.create();
  this._proj = M4.create();
  this._view = M4.create();

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.CULL_FACE);
  gl.clearColor(this.fog.r, this.fog.g, this.fog.b, 1);

  this.aspect = 1;
}

Renderer.prototype.resize = function(cssW, cssH, dpr){
  const gl = this.gl;
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  if(this.canvas.width !== w || this.canvas.height !== h){
    this.canvas.width = w;
    this.canvas.height = h;
  }
  gl.viewport(0, 0, w, h);
  this.aspect = cssW / Math.max(1, cssH);
};

Renderer.prototype.setCamera = function(c){
  const cam = this.camera;
  const keys = ['x', 'y', 'z', 'yaw', 'pitch', 'fov', 'near', 'far'];
  for(let i = 0; i < keys.length; i++){
    if(c[keys[i]] !== undefined) cam[keys[i]] = c[keys[i]];
  }
};

Renderer.prototype.setLights = function(list){
  for(let i = 0; i < 3; i++){
    if(list && list[i]) this.lights[i] = list[i];
    else this.lights[i] = { x: 0, y: -999, z: 0, color: [0, 0, 0] };
  }
};

Renderer.prototype.setAmbient = function(rgb){
  if(Array.isArray(rgb)) this.ambient = [rgb[0], rgb[1], rgb[2]];
};

Renderer.prototype.setFog = function(f){
  if(f.color){
    this.fog.r = f.color[0];
    this.fog.g = f.color[1];
    this.fog.b = f.color[2];
    this.gl.clearColor(f.color[0], f.color[1], f.color[2], 1);
  }
  if(f.near !== undefined) this.fog.near = f.near;
  if(f.far !== undefined) this.fog.far = f.far;
};

Renderer.prototype.textureFromCanvas = function(source, opts){
  return makeTexture(this.gl, source, opts);
};

Renderer.prototype._loadTex = function(existing, source, opts){
  const gl = this.gl;
  if(existing){ try{ gl.deleteTexture(existing); }catch(e){} }
  if(!source) return { tex: null, ok: false };
  try{
    return { tex: makeTexture(gl, source, opts), ok: true };
  }catch(e){
    console.warn('[R3D] 纹理上传失败，降级为纯色:', e.message);
    return { tex: null, ok: false };
  }
};

/* ---------- 从 grid 构建世界 ---------- */
Renderer.prototype.buildWorld = function(cfg){
  const gl = this.gl;
  const grid = cfg.grid;
  const wallH = cfg.wallHeight !== undefined ? cfg.wallHeight : 2.6;
  const rows = grid.length;
  const cols = grid[0].length;

  const WP = [], WN = [], WU = [], WI = [];

  function wq(v0, v1, v2, v3, n){
    const base = WP.length / 3;
    WP.push(
      v0[0], v0[1], v0[2],
      v1[0], v1[1], v1[2],
      v2[0], v2[1], v2[2],
      v3[0], v3[1], v3[2]
    );
    for(let k = 0; k < 4; k++) WN.push(n[0], n[1], n[2]);
    WU.push(0, 1, 1, 1, 1, 0, 0, 0);
    WI.push(base, base+1, base+2, base, base+2, base+3);
  }

  for(let y = 0; y < rows; y++){
    for(let x = 0; x < cols; x++){
      if(grid[y][x] !== '1') continue;

      const x0 = x, x1 = x + 1;
      const z0 = y, z1 = y + 1;
      const y0 = 0, y1 = wallH;

      /* 顶面（总是画） */
      wq([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0]);

      /* 前后左右 — 只画暴露的 */
      if(y - 1 < 0 || grid[y-1][x] !== '1'){
        wq([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1]);
      }
      if(y + 1 >= rows || grid[y+1][x] !== '1'){
        wq([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1]);
      }
      if(x - 1 < 0 || grid[y][x-1] !== '1'){
        wq([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0]);
      }
      if(x + 1 >= cols || grid[y][x+1] !== '1'){
        wq([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0]);
      }
    }
  }

  /* 地板 —— 一大块，UV 平铺 */
  const FP = [], FN = [], FU = [], FI = [];
  pushQuad(FP, FN, FU, FI,
    [0, 0, 0], [cols, 0, 0], [cols, 0, rows], [0, 0, rows],
    [0, 1, 0]);
  /* 上面 pushQuad 的 UV 是 0-1，改成平铺：重写 UV */
  FU[0] = 0; FU[1] = 0;
  FU[2] = cols; FU[3] = 0;
  FU[4] = cols; FU[5] = rows;
  FU[6] = 0; FU[7] = rows;

  /* 天花板 */
  const CP = [], CN = [], CU = [], CI = [];
  pushQuad(CP, CN, CU, CI,
    [0, wallH, 0], [cols, wallH, 0], [cols, wallH, rows], [0, wallH, rows],
    [0, -1, 0]);
  CU[0] = 0; CU[1] = 0;
  CU[2] = cols; CU[3] = 0;
  CU[4] = cols; CU[5] = rows;
  CU[6] = 0; CU[7] = rows;

  if(!this.wallMesh)  this.wallMesh  = createMesh(gl);
  if(!this.floorMesh) this.floorMesh = createMesh(gl);
  if(!this.ceilMesh)  this.ceilMesh  = createMesh(gl);

  uploadMesh(gl, this.wallMesh,  WP, WN, WU, WI);
  uploadMesh(gl, this.floorMesh, FP, FN, FU, FI);
  uploadMesh(gl, this.ceilMesh,  CP, CN, CU, CI);

  const wt = this._loadTex(this.wallTex,  cfg.wallTexSource,  { repeat: true });
  const ft = this._loadTex(this.floorTex, cfg.floorTexSource, { repeat: true });
  const ct = this._loadTex(this.ceilTex,  cfg.ceilTexSource,  { repeat: true });

  this.wallTex  = wt.tex;  this.wallHasTex  = wt.ok;
  this.floorTex = ft.tex;  this.floorHasTex = ft.ok;
  this.ceilTex  = ct.tex;  this.ceilHasTex  = ct.ok;
};

/* ---------- Prop 构建 ---------- */
Renderer.prototype.buildProps = function(list){
  const gl = this.gl;

  /* 清掉旧的 */
  for(let i = 0; i < this.props.length; i++){
    const p = this.props[i];
    try{
      gl.deleteBuffer(p.mesh.vbo);
      gl.deleteBuffer(p.mesh.ibo);
    }catch(e){}
  }
  this.props = [];
  if(!list || !list.length) return;

  for(let i = 0; i < list.length; i++){
    const p = list[i];
    const P = [], N = [], U = [], I = [];
    const shape = p.shape || 'box';
    const w = p.w !== undefined ? p.w : 0.6;
    const h = p.h !== undefined ? p.h : 0.6;
    const d = p.d !== undefined ? p.d : (p.w || 0.6);
    const cx = p.x;
    const y0 = p.y !== undefined ? p.y : 0;
    const cz = p.z;

    if(shape === 'box'){
      buildBox(P, N, U, I, cx, y0, cz, w, h, d);
    }
    else if(shape === 'cyl'){
      buildCylinder(P, N, U, I, cx, y0, cz, w / 2, h, 10);
    }
    else if(shape === 'plate'){
      /* 薄板：默认厚度 0.06，朝 +z */
      buildBox(P, N, U, I, cx, y0, cz, w, h, 0.06);
    }
    else if(shape === 'low'){
      /* 矮盘：默认厚度 h，半径 w/2，8 段 */
      buildCylinder(P, N, U, I, cx, y0, cz, w / 2, h, 8);
    }
    else {
      /* 未知 shape，跳过 */
      continue;
    }

    if(P.length === 0) continue;
    if(I.length > 65535) continue;  /* 单 mesh 顶点上限 */

    const mesh = createMesh(gl);
    uploadMesh(gl, mesh, P, N, U, I);

    /* 解析 hex 颜色 */
    let color = p.color || '#888888';
    if(color.charAt(0) !== '#') color = '#888888';
    if(color.length === 4){
      /* #abc → #aabbcc */
      color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    this.props.push({
      mesh: mesh,
      color: [r, g, b]
    });
  }
};

Renderer.prototype.setBillboards = function(list){
  this.billboards = list || [];
};

/* ---------- 内部：画一个 mesh ---------- */
Renderer.prototype._drawMesh = function(mesh, tex, hasTex, r, g, b, alphaTest){
  const gl = this.gl;
  if(!mesh || mesh.indexCount === 0) return;

  gl.uniform1f(this.uni.uAlphaTest, alphaTest || 0);
  gl.uniform1f(this.uni.uHasTex, hasTex ? 1 : 0);
  gl.uniform3f(this.uni.uColor, r, g, b);

  if(hasTex && tex){
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(this.uni.uTex, 0);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
  gl.vertexAttribPointer(this.attr.pos,    3, gl.FLOAT, false, 32, 0);
  gl.vertexAttribPointer(this.attr.normal, 3, gl.FLOAT, false, 32, 12);
  gl.vertexAttribPointer(this.attr.uv,     2, gl.FLOAT, false, 32, 24);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
  gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
};

/* ---------- 渲染一帧 ---------- */
Renderer.prototype.render = function(){
  const gl = this.gl;
  const cam = this.camera;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.program);

  gl.enableVertexAttribArray(this.attr.pos);
  gl.enableVertexAttribArray(this.attr.normal);
  gl.enableVertexAttribArray(this.attr.uv);

  /* 相机方向 */
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const cy = Math.cos(cam.yaw),   sy = Math.sin(cam.yaw);
  const dir = [cy * cp, sp, sy * cp];
  const target = [cam.x + dir[0], cam.y + dir[1], cam.z + dir[2]];

  /* 投影 + 视图 */
  M4.perspective(this._proj, cam.fov, this.aspect || 1, cam.near, cam.far);
  M4.lookAt(this._view, [cam.x, cam.y, cam.z], target, [0, 1, 0]);
  M4.multiply(this._vp, this._proj, this._view);

  gl.uniformMatrix4fv(this.uni.uVP, false, this._vp);

  /* 相机 / 光源 / 雾 */
  gl.uniform3f(this.uni.uCamPos, cam.x, cam.y, cam.z);

  for(let i = 0; i < 3; i++){
    const l = this.lights[i];
    gl.uniform3f(this.uni['uLP' + i], l.x, l.y, l.z);
    gl.uniform3f(this.uni['uLC' + i], l.color[0], l.color[1], l.color[2]);
  }

  gl.uniform3f(this.uni.uAmbient, this.ambient[0], this.ambient[1], this.ambient[2]);
  gl.uniform3f(this.uni.uFogColor, this.fog.r, this.fog.g, this.fog.b);
  gl.uniform1f(this.uni.uFogNear, this.fog.near);
  gl.uniform1f(this.uni.uFogFar, this.fog.far);

  /* 世界 */
  this._drawMesh(this.wallMesh,  this.wallTex,  this.wallHasTex,  1, 1, 1, 0);
  this._drawMesh(this.floorMesh, this.floorTex, this.floorHasTex, 1, 1, 1, 0);
  this._drawMesh(this.ceilMesh,  this.ceilTex,  this.ceilHasTex,  1, 1, 1, 0);

  /* Props */
  for(let i = 0; i < this.props.length; i++){
    const p = this.props[i];
    this._drawMesh(p.mesh, null, false, p.color[0], p.color[1], p.color[2], 0);
  }

  /* Billboard */
  if(this.billboards.length){
    gl.uniform1f(this.uni.uAlphaTest, 1.0);
    const camX = cam.x, camZ = cam.z;

    for(let i = 0; i < this.billboards.length; i++){
      const bb = this.billboards[i];
      let dx = camX - bb.x, dz = camZ - bb.z;
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl; dz /= dl;

      const rx = -dz, rz = dx;
      const hw = (bb.w || 0.8) * 0.5;
      const bh = bb.h || 1.0;

      const cx0 = bb.x - rx * hw, cz0 = bb.z - rz * hw;
      const cx1 = bb.x + rx * hw, cz1 = bb.z + rz * hw;

      const d = this._bbData;
      d[0]  = cx0; d[1]  = bb.y;       d[2]  = cz0;
      d[3]  = -dx; d[4]  = 0;          d[5]  = -dz;
      d[6]  = 0;   d[7]  = 1;

      d[8]  = cx1; d[9]  = bb.y;       d[10] = cz1;
      d[11] = -dx; d[12] = 0;          d[13] = -dz;
      d[14] = 1;   d[15] = 1;

      d[16] = cx1; d[17] = bb.y + bh;  d[18] = cz1;
      d[19] = -dx; d[20] = 0;          d[21] = -dz;
      d[22] = 1;   d[23] = 0;

      d[24] = cx0; d[25] = bb.y + bh;  d[26] = cz0;
      d[27] = -dx; d[28] = 0;          d[29] = -dz;
      d[30] = 0;   d[31] = 0;

      gl.bindBuffer(gl.ARRAY_BUFFER, this.bbMesh.vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, d);

      gl.vertexAttribPointer(this.attr.pos,    3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(this.attr.normal, 3, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(this.attr.uv,     2, gl.FLOAT, false, 32, 24);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bbMesh.ibo);

      if(bb.tex){
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, bb.tex);
        gl.uniform1i(this.uni.uTex, 0);
        gl.uniform1f(this.uni.uHasTex, 1.0);
      } else {
        gl.uniform1f(this.uni.uHasTex, 0.0);
      }

      const c = bb.color || [1, 1, 1];
      gl.uniform3f(this.uni.uColor, c[0], c[1], c[2]);

      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
  }
};

/* ---------- 释放 ---------- */
Renderer.prototype.dispose = function(){
  const gl = this.gl;

  [this.wallMesh, this.floorMesh, this.ceilMesh, this.bbMesh].forEach(m => {
    if(m){
      try{ gl.deleteBuffer(m.vbo); gl.deleteBuffer(m.ibo); }catch(e){}
    }
  });

  for(let i = 0; i < this.props.length; i++){
    const p = this.props[i];
    try{
      gl.deleteBuffer(p.mesh.vbo);
      gl.deleteBuffer(p.mesh.ibo);
    }catch(e){}
  }
  this.props = [];

  [this.wallTex, this.floorTex, this.ceilTex].forEach(t => {
    if(t){ try{ gl.deleteTexture(t); }catch(e){} }
  });

  if(this.program){ try{ gl.deleteProgram(this.program); }catch(e){} }
};

/* ==================== 导出 ==================== */
global.R3D = {
  create(canvas){
    return new Renderer(canvas);
  }
};

})(window);