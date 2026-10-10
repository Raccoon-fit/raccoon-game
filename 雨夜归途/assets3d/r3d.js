/* =========================================================
   r3d.js — 极简真 3D 引擎
   纯 WebGL 1.0，零依赖，单文件
   iOS WebKit 兼容：纹理用 ImageData 而非 canvas
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
'uniform vec3 uLightPos;',
'uniform vec3 uLightColor;',
'uniform vec3 uAmbient;',
'uniform vec3 uCamPos;',
'uniform vec3 uFogColor;',
'uniform float uFogNear;',
'uniform float uFogFar;',
'void main(){',
'  vec4 base = vec4(uColor, 1.0);',
'  if(uHasTex > 0.5){',
'    base *= texture2D(uTex, vUV);',
'  }',
'  if(uAlphaTest > 0.5 && base.a < 0.35) discard;',
'  vec3 N = normalize(vNormal);',
'  vec3 toL = uLightPos - vWorldPos;',
'  float d = length(toL);',
'  vec3 L = toL / max(d, 0.001);',
'  float diff = max(dot(N, L), 0.0);',
'  float atten = 1.0 / (1.0 + 0.18*d + 0.06*d*d);',
'  vec3 lit = uAmbient + uLightColor * diff * atten * 8.0;',
'  vec3 V = normalize(uCamPos - vWorldPos);',
'  vec3 H = normalize(L + V);',
'  float spec = pow(max(dot(N, H), 0.0), 24.0) * 0.14;',
'  vec3 color = base.rgb * lit + spec * uLightColor;',
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
    const log = gl.getShaderInfoLog(s);
    console.error('[R3D] shader error:', log);
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
    console.error('[R3D] link error:', gl.getProgramInfoLog(p));
    return null;
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return p;
}

/* ==================== 纹理 ==================== */
function isPOT(n){ return (n & (n-1)) === 0; }

function canvasToImageData(canvas){
  const w = canvas.width;
  const h = canvas.height;
  const c2d = canvas.getContext('2d');
  return c2d.getImageData(0, 0, w, h);
}

function makeTextureFromCanvas(gl, canvas, opts){
  opts = opts || {};
  if(!canvas) throw new Error('纹理源为空');
  const w = canvas.width;
  const h = canvas.height;
  if(!w || !h) throw new Error('纹理尺寸无效 ' + w + 'x' + h);

  const data = canvasToImageData(canvas);

  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, opts.flipY ? 1 : 0);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);

  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA,
    w, h, 0,
    gl.RGBA, gl.UNSIGNED_BYTE, data
  );

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
  const vbo = gl.createBuffer();
  const ibo = gl.createBuffer();
  return { vbo, ibo, indexCount: 0, vertexCount: 0, stride: 32 };
}

function uploadMesh(gl, mesh, positions, normals, uvs, indices, dynamic){
  const n = positions.length / 3;
  const data = new Float32Array(n * 8);
  for(let i = 0; i < n; i++){
    data[i*8+0] = positions[i*3+0];
    data[i*8+1] = positions[i*3+1];
    data[i*8+2] = positions[i*3+2];
    data[i*8+3] = normals[i*3+0];
    data[i*8+4] = normals[i*3+1];
    data[i*8+5] = normals[i*3+2];
    data[i*8+6] = uvs[i*2+0];
    data[i*8+7] = uvs[i*2+1];
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices),
                dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);

  mesh.indexCount = indices.length;
  mesh.vertexCount = n;
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

  this.uni = {
    uVP:         gl.getUniformLocation(program, 'uVP'),
    uTex:        gl.getUniformLocation(program, 'uTex'),
    uHasTex:     gl.getUniformLocation(program, 'uHasTex'),
    uAlphaTest:  gl.getUniformLocation(program, 'uAlphaTest'),
    uColor:      gl.getUniformLocation(program, 'uColor'),
    uLightPos:   gl.getUniformLocation(program, 'uLightPos'),
    uLightColor: gl.getUniformLocation(program, 'uLightColor'),
    uAmbient:    gl.getUniformLocation(program, 'uAmbient'),
    uCamPos:     gl.getUniformLocation(program, 'uCamPos'),
    uFogColor:   gl.getUniformLocation(program, 'uFogColor'),
    uFogNear:    gl.getUniformLocation(program, 'uFogNear'),
    uFogFar:     gl.getUniformLocation(program, 'uFogFar')
  };

  this.camera = {
    x: 0, y: 1.6, z: 0,
    yaw: 0, pitch: 0,
    fov: Math.PI / 3,
    near: 0.05,
    far: 60
  };

  this.light = { x: 0, y: 3, z: 0, r: 1, g: 0.92, b: 0.78 };
  this.ambient = [0.12, 0.14, 0.18];
  this.fog = { r: 0.04, g: 0.05, b: 0.08, near: 6, far: 22 };

  this.worldMesh = null;
  this.worldTex = null;
  this.worldHasTex = false;

  this.bbMesh = createMesh(gl);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.bbMesh.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, 4 * 8 * 4, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bbMesh.ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2, 0,2,3]), gl.STATIC_DRAW);
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
  if(c.x !== undefined) cam.x = c.x;
  if(c.y !== undefined) cam.y = c.y;
  if(c.z !== undefined) cam.z = c.z;
  if(c.yaw !== undefined) cam.yaw = c.yaw;
  if(c.pitch !== undefined) cam.pitch = c.pitch;
  if(c.fov !== undefined) cam.fov = c.fov;
  if(c.near !== undefined) cam.near = c.near;
  if(c.far !== undefined) cam.far = c.far;
};

Renderer.prototype.setLight = function(l){
  if(l.x !== undefined) this.light.x = l.x;
  if(l.y !== undefined) this.light.y = l.y;
  if(l.z !== undefined) this.light.z = l.z;
  if(l.color){
    this.light.r = l.color[0];
    this.light.g = l.color[1];
    this.light.b = l.color[2];
  }
};

Renderer.prototype.setAmbient = function(rgb){
  if(Array.isArray(rgb)){
    this.ambient[0] = rgb[0];
    this.ambient[1] = rgb[1];
    this.ambient[2] = rgb[2];
  }
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

Renderer.prototype.textureFromCanvas = function(canvas, opts){
  return makeTextureFromCanvas(this.gl, canvas, opts);
};

Renderer.prototype.deleteTexture = function(tex){
  if(tex) this.gl.deleteTexture(tex);
};

Renderer.prototype.buildWorld = function(cfg){
  const gl = this.gl;
  const grid = cfg.grid;
  const wallH = cfg.wallHeight !== undefined ? cfg.wallHeight : 2.6;
  const rows = grid.length;
  const cols = grid[0].length;

  const P = [], N = [], U = [], I = [];

  function pushQuad(v0, v1, v2, v3, n, uv){
    const base = P.length / 3;
    P.push(v0[0],v0[1],v0[2], v1[0],v1[1],v1[2], v2[0],v2[1],v2[2], v3[0],v3[1],v3[2]);
    for(let k = 0; k < 4; k++) N.push(n[0], n[1], n[2]);
    U.push(uv[0][0],uv[0][1], uv[1][0],uv[1][1], uv[2][0],uv[2][1], uv[3][0],uv[3][1]);
    I.push(base, base+1, base+2, base, base+2, base+3);
  }

  for(let y = 0; y < rows; y++){
    for(let x = 0; x < cols; x++){
      if(grid[y][x] !== '1') continue;

      const x0 = x, x1 = x + 1;
      const z0 = y, z1 = y + 1;
      const y0 = 0, y1 = wallH;

      pushQuad(
        [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
        [0, 1, 0],
        [[0,0],[1,0],[1,1],[0,1]]
      );

      if(y - 1 < 0 || grid[y-1][x] !== '1'){
        pushQuad(
          [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
          [0, 0, -1],
          [[0,1],[1,1],[1,0],[0,0]]
        );
      }
      if(y + 1 >= rows || grid[y+1][x] !== '1'){
        pushQuad(
          [x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1],
          [0, 0, 1],
          [[0,1],[1,1],[1,0],[0,0]]
        );
      }
      if(x - 1 < 0 || grid[y][x-1] !== '1'){
        pushQuad(
          [x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1],
          [-1, 0, 0],
          [[0,1],[1,1],[1,0],[0,0]]
        );
      }
      if(x + 1 >= cols || grid[y][x+1] !== '1'){
        pushQuad(
          [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0],
          [1, 0, 0],
          [[0,1],[1,1],[1,0],[0,0]]
        );
      }
    }
  }

  {
    const base = P.length / 3;
    P.push(0,0,0, cols,0,0, cols,0,rows, 0,0,rows);
    for(let k = 0; k < 4; k++) N.push(0, 1, 0);
    U.push(0,0, cols,0, cols,rows, 0,rows);
    I.push(base, base+1, base+2, base, base+2, base+3);
  }
  {
    const base = P.length / 3;
    P.push(0,wallH,0, cols,wallH,0, cols,wallH,rows, 0,wallH,rows);
    for(let k = 0; k < 4; k++) N.push(0, -1, 0);
    U.push(0,0, cols,0, cols,rows, 0,rows);
    I.push(base, base+1, base+2, base, base+2, base+3);
  }

  if(!this.worldMesh) this.worldMesh = createMesh(gl);
  uploadMesh(gl, this.worldMesh, P, N, U, I, false);

  if(this.worldTex){
    try{ gl.deleteTexture(this.worldTex); }catch(e){}
    this.worldTex = null;
  }
  this.worldHasTex = false;
  if(cfg.wallTexCanvas){
    try{
      this.worldTex = makeTextureFromCanvas(gl, cfg.wallTexCanvas, { repeat: true });
      this.worldHasTex = true;
    }catch(e){
      console.warn('[R3D] 纹理上传失败，降级为纯色:', e.message);
      this.worldHasTex = false;
    }
  }

  this.worldMeta = {
    wallHeight: wallH,
    cols: cols,
    rows: rows
  };
};

Renderer.prototype.setBillboards = function(list){
  this.billboards = list || [];
};

Renderer.prototype.render = function(){
  const gl = this.gl;
  const cam = this.camera;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(this.program);

  gl.enableVertexAttribArray(this.attr.pos);
  gl.enableVertexAttribArray(this.attr.normal);
  gl.enableVertexAttribArray(this.attr.uv);

  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const dir = [cy * cp, sp, sy * cp];
  const target = [cam.x + dir[0], cam.y + dir[1], cam.z + dir[2]];

  M4.perspective(this._proj, cam.fov, this.aspect || 1, cam.near, cam.far);
  M4.lookAt(this._view, [cam.x, cam.y, cam.z], target, [0, 1, 0]);
  M4.multiply(this._vp, this._proj, this._view);

  gl.uniformMatrix4fv(this.uni.uVP, false, this._vp);

  gl.uniform3f(this.uni.uCamPos, cam.x, cam.y, cam.z);
  gl.uniform3f(this.uni.uLightPos, this.light.x, this.light.y, this.light.z);
  gl.uniform3f(this.uni.uLightColor, this.light.r, this.light.g, this.light.b);
  gl.uniform3f(this.uni.uAmbient, this.ambient[0], this.ambient[1], this.ambient[2]);
  gl.uniform3f(this.uni.uFogColor, this.fog.r, this.fog.g, this.fog.b);
  gl.uniform1f(this.uni.uFogNear, this.fog.near);
  gl.uniform1f(this.uni.uFogFar, this.fog.far);

  if(this.worldMesh && this.worldMeta){
    gl.uniform1f(this.uni.uAlphaTest, 0.0);
    gl.uniform1f(this.uni.uHasTex, this.worldHasTex ? 1 : 0);
    gl.uniform3f(this.uni.uColor, 1, 1, 1);

    if(this.worldHasTex){
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.worldTex);
      gl.uniform1i(this.uni.uTex, 0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.worldMesh.vbo);
    gl.vertexAttribPointer(this.attr.pos, 3, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(this.attr.normal, 3, gl.FLOAT, false, 32, 12);
    gl.vertexAttribPointer(this.attr.uv, 2, gl.FLOAT, false, 32, 24);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.worldMesh.ibo);
    gl.drawElements(gl.TRIANGLES, this.worldMesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }

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
      const bx = bb.x, by = bb.y, bz = bb.z;
      const bh = bb.h || 1.0;

      const d = this._bbData;
      const cx0 = bx - rx * hw, cz0 = bz - rz * hw;
      const cx1 = bx + rx * hw, cz1 = bz + rz * hw;

      d[0]=cx0; d[1]=by;      d[2]=cz0;
      d[3]=-dx; d[4]=0;       d[5]=-dz;
      d[6]=0;   d[7]=1;

      d[8]=cx1; d[9]=by;      d[10]=cz1;
      d[11]=-dx; d[12]=0;     d[13]=-dz;
      d[14]=1;   d[15]=1;

      d[16]=cx1; d[17]=by+bh; d[18]=cz1;
      d[19]=-dx; d[20]=0;     d[21]=-dz;
      d[22]=1;   d[23]=0;

      d[24]=cx0; d[25]=by+bh; d[26]=cz0;
      d[27]=-dx; d[28]=0;     d[29]=-dz;
      d[30]=0;   d[31]=0;

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

Renderer.prototype.dispose = function(){
  const gl = this.gl;
  if(this.worldMesh){
    gl.deleteBuffer(this.worldMesh.vbo);
    gl.deleteBuffer(this.worldMesh.ibo);
    this.worldMesh = null;
  }
  if(this.bbMesh){
    gl.deleteBuffer(this.bbMesh.vbo);
    gl.deleteBuffer(this.bbMesh.ibo);
    this.bbMesh = null;
  }
  if(this.worldTex){
    gl.deleteTexture(this.worldTex);
    this.worldTex = null;
  }
  if(this.program){
    gl.deleteProgram(this.program);
    this.program = null;
  }
};

global.R3D = {
  create(canvas){
    return new Renderer(canvas);
  }
};

})(window);