/* =========================================================
   r3d.js — 极简真 3D 引擎 v7
   v6 + 修复：addModel 用 Uint32 索引一次性上传
        （原分块逻辑对 171K 顶点模型存在隐藏 bug）
   ========================================================= */
(function(global){
'use strict';

/* ==================== 数学 ==================== */
const M4 = {
  create(){ const m = new Float32Array(16); m[0]=1;m[5]=1;m[10]=1;m[15]=1; return m; },
  perspective(out, fovy, aspect, near, far){
    const f = 1/Math.tan(fovy/2), nf = 1/(near-far);
    out[0]=f/aspect; out[5]=f; out[10]=(far+near)*nf; out[11]=-1; out[14]=2*far*near*nf;
    out[1]=out[2]=out[3]=out[4]=0; out[6]=out[7]=out[8]=out[9]=0;
    out[12]=out[13]=0; out[15]=0;
    return out;
  },
  lookAt(out, eye, center, up){
    let zx=eye[0]-center[0], zy=eye[1]-center[1], zz=eye[2]-center[2];
    let len=Math.hypot(zx,zy,zz)||1; zx/=len; zy/=len; zz/=len;
    let xx=up[1]*zz-up[2]*zy, xy=up[2]*zx-up[0]*zz, xz=up[0]*zy-up[1]*zx;
    len=Math.hypot(xx,xy,xz);
    if(len<1e-6){ xx=1;xy=0;xz=0; } else { xx/=len;xy/=len;xz/=len; }
    const yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
    out[0]=xx;out[1]=yx;out[2]=zx;out[3]=0;
    out[4]=xy;out[5]=yy;out[6]=zy;out[7]=0;
    out[8]=xz;out[9]=yz;out[10]=zz;out[11]=0;
    out[12]=-(xx*eye[0]+xy*eye[1]+xz*eye[2]);
    out[13]=-(yx*eye[0]+yy*eye[1]+yz*eye[2]);
    out[14]=-(zx*eye[0]+zy*eye[1]+zz*eye[2]);
    out[15]=1;
    return out;
  },
  multiply(out, a, b){
    for(let r=0;r<4;r++) for(let c=0;c<4;c++){
      let s=0; for(let k=0;k<4;k++) s+=a[k*4+r]*b[c*4+k];
      out[c*4+r]=s;
    }
    return out;
  }
};

/* ==================== 着色器 ==================== */
const VERT_SRC = [
'attribute vec3 aPos;','attribute vec3 aNormal;','attribute vec2 aUV;',
'uniform mat4 uVP;',
'varying vec3 vNormal;','varying vec3 vWorldPos;','varying vec2 vUV;','varying float vDist;',
'void main(){',
'  vNormal = aNormal;','  vWorldPos = aPos;','  vUV = aUV;',
'  vec4 clip = uVP * vec4(aPos, 1.0);',
'  vDist = clip.w;','  gl_Position = clip;',
'}'
].join('\n');

const FRAG_SRC = [
'precision mediump float;',
'varying vec3 vNormal;','varying vec3 vWorldPos;','varying vec2 vUV;','varying float vDist;',
'uniform sampler2D uTex;','uniform float uHasTex;','uniform float uAlphaTest;','uniform vec3 uColor;',
'uniform vec3 uLP0;','uniform vec3 uLP1;','uniform vec3 uLP2;',
'uniform vec3 uLC0;','uniform vec3 uLC1;','uniform vec3 uLC2;',
'uniform vec3 uAmbient;','uniform vec3 uCamPos;','uniform vec3 uFogColor;',
'uniform float uFogNear;','uniform float uFogFar;',
'void main(){',
'  vec4 base = vec4(uColor, 1.0);',
'  if(uHasTex > 0.5){ base *= texture2D(uTex, vUV); }',
'  if(uAlphaTest > 0.5 && base.a < 0.35) discard;',
'  vec3 N = normalize(vNormal);',
'  vec3 V = normalize(uCamPos - vWorldPos);',
'  vec3 lit = uAmbient;',
'  {vec3 tL=uLP0-vWorldPos; float d=length(tL); vec3 L=tL/max(d,0.001);',
'   float df=max(dot(N,L),0.0); float at=1.0/(1.0+0.20*d+0.08*d*d);',
'   vec3 H=normalize(L+V); float sp=pow(max(dot(N,H),0.0),32.0)*0.12;',
'   lit += uLC0*(df*at*6.0+sp*at);}',
'  {vec3 tL=uLP1-vWorldPos; float d=length(tL); vec3 L=tL/max(d,0.001);',
'   float df=max(dot(N,L),0.0); float at=1.0/(1.0+0.20*d+0.08*d*d);',
'   vec3 H=normalize(L+V); float sp=pow(max(dot(N,H),0.0),32.0)*0.12;',
'   lit += uLC1*(df*at*6.0+sp*at);}',
'  {vec3 tL=uLP2-vWorldPos; float d=length(tL); vec3 L=tL/max(d,0.001);',
'   float df=max(dot(N,L),0.0); float at=1.0/(1.0+0.20*d+0.08*d*d);',
'   vec3 H=normalize(L+V); float sp=pow(max(dot(N,H),0.0),32.0)*0.12;',
'   lit += uLC2*(df*at*6.0+sp*at);}',
'  vec3 color = base.rgb * lit;',
'  float fogF = clamp((vDist - uFogNear) / max(uFogFar - uFogNear, 0.01), 0.0, 1.0);',
'  color = mix(color, uFogColor, fogF);',
'  gl_FragColor = vec4(color, base.a);',
'}'
].join('\n');

function compile(gl, type, src){
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
    console.error('[R3D] shader:', gl.getShaderInfoLog(s));
    gl.deleteShader(s); return null;
  }
  return s;
}
function linkProgram(gl){
  const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if(!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
    console.error('[R3D] link:', gl.getProgramInfoLog(p));
    return null;
  }
  gl.deleteShader(vs); gl.deleteShader(fs);
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
  return { vbo: gl.createBuffer(), ibo: gl.createBuffer(), indexCount: 0, vertexCount: 0, uint32: false };
}
function uploadMesh(gl, mesh, P, N, U, I){
  const n = P.length / 3;
  const data = new Float32Array(n * 8);
  for(let i = 0; i < n; i++){
    data[i*8+0]=P[i*3+0]; data[i*8+1]=P[i*3+1]; data[i*8+2]=P[i*3+2];
    data[i*8+3]=N[i*3+0]; data[i*8+4]=N[i*3+1]; data[i*8+5]=N[i*3+2];
    data[i*8+6]=U[i*2+0]; data[i*8+7]=U[i*2+1];
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(I), gl.STATIC_DRAW);
  mesh.indexCount = I.length;
  mesh.vertexCount = n;
  mesh.uint32 = false;
}

/* ★ v7 新增：32 位索引上传 */
function uploadMeshU32(gl, mesh, P, N, U, I){
  const n = P.length / 3;
  const data = new Float32Array(n * 8);
  for(let i = 0; i < n; i++){
    data[i*8+0]=P[i*3+0]; data[i*8+1]=P[i*3+1]; data[i*8+2]=P[i*3+2];
    data[i*8+3]=N[i*3+0]; data[i*8+4]=N[i*3+1]; data[i*8+5]=N[i*3+2];
    data[i*8+6]=U[i*2+0]; data[i*8+7]=U[i*2+1];
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.STATIC_DRAW);
  mesh.indexCount = I.length;
  mesh.vertexCount = n;
  mesh.uint32 = true;
}

/* ==================== 几何体生成器 ==================== */
function pushQuad(P, N, U, I, v0, v1, v2, v3, n){
  const base = P.length / 3;
  P.push(v0[0],v0[1],v0[2], v1[0],v1[1],v1[2], v2[0],v2[1],v2[2], v3[0],v3[1],v3[2]);
  for(let k = 0; k < 4; k++) N.push(n[0], n[1], n[2]);
  U.push(0,0, 1,0, 1,1, 0,1);
  I.push(base, base+1, base+2, base, base+2, base+3);
}
function pushTri(P, N, U, I, v0, v1, v2, n, uv0, uv1, uv2){
  const base = P.length / 3;
  P.push(v0[0],v0[1],v0[2], v1[0],v1[1],v1[2], v2[0],v2[1],v2[2]);
  for(let k = 0; k < 3; k++) N.push(n[0], n[1], n[2]);
  U.push(uv0?uv0[0]:0, uv0?uv0[1]:0, uv1?uv1[0]:1, uv1?uv1[1]:0, uv2?uv2[0]:0.5, uv2?uv2[1]:1);
  I.push(base, base+1, base+2);
}
function buildBox(P, N, U, I, cx, y0, cz, w, h, d){
  const hw=w/2, hd=d/2, x0=cx-hw, x1=cx+hw, y1=y0+h, z0=cz-hd, z1=cz+hd;
  pushQuad(P,N,U,I,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1]);
  pushQuad(P,N,U,I,[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1]);
  pushQuad(P,N,U,I,[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0]);
  pushQuad(P,N,U,I,[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0]);
  pushQuad(P,N,U,I,[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0]);
  pushQuad(P,N,U,I,[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0]);
}
function buildCylinder(P, N, U, I, cx, y0, cz, r, h, seg){
  seg = seg || 24;
  const y1 = y0 + h;
  for(let i = 0; i < seg; i++){
    const a0=(i/seg)*Math.PI*2, a1=((i+1)/seg)*Math.PI*2;
    const x0=cx+Math.cos(a0)*r, z0=cz+Math.sin(a0)*r;
    const x1=cx+Math.cos(a1)*r, z1=cz+Math.sin(a1)*r;
    const nx=Math.cos((a0+a1)/2), nz=Math.sin((a0+a1)/2);
    pushQuad(P,N,U,I,[x0,y0,z0],[x1,y0,z1],[x1,y1,z1],[x0,y1,z0],[nx,0,nz]);
    pushTri(P,N,U,I,[cx,y1,cz],[x0,y1,z0],[x1,y1,z1],[0,1,0],[0.5,0.5],[0,0],[1,0]);
    pushTri(P,N,U,I,[cx,y0,cz],[x1,y0,z1],[x0,y0,z0],[0,-1,0],[0.5,0.5],[1,0],[0,0]);
  }
}
function buildSphere(P, N, U, I, cx, y0, cz, r, segU, segV){
  segU=segU||16; segV=segV||12;
  const cy=y0+r;
  for(let j=0;j<segV;j++){
    const v0=j/segV, v1=(j+1)/segV;
    const phi0=v0*Math.PI, phi1=v1*Math.PI;
    const yt0=Math.cos(phi0)*r, yt1=Math.cos(phi1)*r;
    const rt0=Math.sin(phi0)*r, rt1=Math.sin(phi1)*r;
    for(let i=0;i<segU;i++){
      const u0=i/segU, u1=(i+1)/segU;
      const th0=u0*Math.PI*2, th1=u1*Math.PI*2;
      const x00=cx+Math.cos(th0)*rt0, z00=cz+Math.sin(th0)*rt0, y00=cy+yt0;
      const x10=cx+Math.cos(th1)*rt0, z10=cz+Math.sin(th1)*rt0, y10=cy+yt0;
      const x01=cx+Math.cos(th0)*rt1, z01=cz+Math.sin(th0)*rt1, y01=cy+yt1;
      const x11=cx+Math.cos(th1)*rt1, z11=cz+Math.sin(th1)*rt1, y11=cy+yt1;
      function nrm(x,y,z){const dx=x-cx,dy=y-cy,dz=z-cz;const l=Math.hypot(dx,dy,dz)||1;return [dx/l,dy/l,dz/l];}
      const base=P.length/3;
      P.push(x00,y00,z00,x10,y10,z10,x11,y11,z11,x01,y01,z01);
      const n00=nrm(x00,y00,z00),n10=nrm(x10,y10,z10),n11=nrm(x11,y11,z11),n01=nrm(x01,y01,z01);
      N.push(n00[0],n00[1],n00[2],n10[0],n10[1],n10[2],n11[0],n11[1],n11[2],n01[0],n01[1],n01[2]);
      U.push(u0,v0,u1,v0,u1,v1,u0,v1);
      I.push(base,base+1,base+2,base,base+2,base+3);
    }
  }
}
function buildCone(P, N, U, I, cx, y0, cz, r, h, seg){
  seg=seg||24;
  const yTop=y0+h;
  for(let i=0;i<seg;i++){
    const a0=(i/seg)*Math.PI*2, a1=((i+1)/seg)*Math.PI*2;
    const x0=cx+Math.cos(a0)*r, z0=cz+Math.sin(a0)*r;
    const x1=cx+Math.cos(a1)*r, z1=cz+Math.sin(a1)*r;
    const slope=Math.atan2(r,h);
    const nx0=Math.cos(a0)*Math.cos(slope), nz0=Math.sin(a0)*Math.cos(slope), ny0=Math.sin(slope);
    const nx1=Math.cos(a1)*Math.cos(slope), nz1=Math.sin(a1)*Math.cos(slope);
    const nAvg=[(nx0+nx1)/2, ny0, (nz0+nz1)/2];
    const nl=Math.hypot(nAvg[0],nAvg[1],nAvg[2])||1;
    nAvg[0]/=nl; nAvg[1]/=nl; nAvg[2]/=nl;
    const base=P.length/3;
    P.push(x0,y0,z0,x1,y0,z1,cx,yTop,cz,cx,yTop,cz);
    for(let k=0;k<4;k++) N.push(nAvg[0],nAvg[1],nAvg[2]);
    U.push(0,0,1,0,0.5,1,0.5,1);
    I.push(base,base+1,base+2);
    pushTri(P,N,U,I,[cx,y0,cz],[x1,y0,z1],[x0,y0,z0],[0,-1,0],[0.5,0.5],[1,0],[0,0]);
  }
}
function buildTorus(P, N, U, I, cx, y0, cz, R, r, segU, segV){
  segU=segU||24; segV=segV||12;
  const cy=y0+R;
  for(let j=0;j<segV;j++){
    const v0=j/segV, v1=(j+1)/segV;
    const phi0=v0*Math.PI*2, phi1=v1*Math.PI*2;
    for(let i=0;i<segU;i++){
      const u0=i/segU, u1=(i+1)/segU;
      const th0=u0*Math.PI*2, th1=u1*Math.PI*2;
      function pt(th,ph){const rr=R+r*Math.cos(ph);return [cx+Math.cos(th)*rr, cy+r*Math.sin(ph), cz+Math.sin(th)*rr];}
      function nrm(th,ph){return [Math.cos(th)*Math.cos(ph), Math.sin(ph), Math.sin(th)*Math.cos(ph)];}
      const p00=pt(th0,phi0),p10=pt(th1,phi0),p11=pt(th1,phi1),p01=pt(th0,phi1);
      const n00=nrm(th0,phi0),n10=nrm(th1,phi0),n11=nrm(th1,phi1),n01=nrm(th0,phi1);
      const base=P.length/3;
      P.push(p00[0],p00[1],p00[2],p10[0],p10[1],p10[2],p11[0],p11[1],p11[2],p01[0],p01[1],p01[2]);
      N.push(n00[0],n00[1],n00[2],n10[0],n10[1],n10[2],n11[0],n11[1],n11[2],n01[0],n01[1],n01[2]);
      U.push(u0,v0,u1,v0,u1,v1,u0,v1);
      I.push(base,base+1,base+2,base,base+2,base+3);
    }
  }
}

/* ==================== OBJ 加载 ==================== */
function parseOBJ(text){
  const V=[], VT=[], VN=[];
  const outP=[], outN=[], outU=[], outI=[];
  const cache=new Map();
  let currentIdx=0;
  let mtlFile=null;

  const lines = text.split('\n');
  for(let li=0; li<lines.length; li++){
    const line = lines[li];
    if(!line || line.charCodeAt(0) === 35) continue;
    const sp = line.indexOf(' ');
    if(sp < 0) continue;
    const tag = line.slice(0, sp);

    if(tag === 'v'){
      const p = line.slice(sp+1).split(' ');
      V.push(+p[0], +p[1], +p[2]);
    } else if(tag === 'vt'){
      const p = line.slice(sp+1).split(' ');
      VT.push(+p[0], +p[1]);
    } else if(tag === 'vn'){
      const p = line.slice(sp+1).split(' ');
      VN.push(+p[0], +p[1], +p[2]);
    } else if(tag === 'f'){
      const parts = line.slice(sp+1).split(/\s+/);
      const idxs = [];
      for(let j=0;j<parts.length;j++){
        const key = parts[j];
        let idx = cache.get(key);
        if(idx === undefined){
          const seg = key.split('/');
          const vi = (parseInt(seg[0], 10) - 1);
          const ti = seg.length>1 && seg[1] ? (parseInt(seg[1],10) - 1) : -1;
          const ni = seg.length>2 && seg[2] ? (parseInt(seg[2],10) - 1) : -1;
          outP.push(V[vi*3], V[vi*3+1], V[vi*3+2]);
          if(ti >= 0) outU.push(VT[ti*2], 1 - VT[ti*2+1]);
          else outU.push(0, 0);
          if(ni >= 0) outN.push(VN[ni*3], VN[ni*3+1], VN[ni*3+2]);
          else outN.push(0, 1, 0);
          idx = currentIdx++;
          cache.set(key, idx);
        }
        idxs.push(idx);
      }
      for(let j=1;j<idxs.length-1;j++){
        outI.push(idxs[0], idxs[j], idxs[j+1]);
      }
    } else if(tag === 'mtllib'){
      mtlFile = line.slice(sp+1).trim();
    }
  }

  return { P: outP, N: outN, U: outU, I: outI, mtlFile: mtlFile };
}

function parseMTL(text){
  const out = { mapKd: null, Kd: null };
  const lines = text.split('\n');
  for(let i=0;i<lines.length;i++){
    const line = lines[i].trim();
    if(line.indexOf('map_Kd') === 0){
      out.mapKd = line.slice(6).trim();
    } else if(line.indexOf('Kd ') === 0){
      const p = line.slice(3).split(/\s+/);
      out.Kd = [+p[0], +p[1], +p[2]];
    }
  }
  return out;
}

function resolveURL(base, rel){
  if(!rel) return null;
  if(rel.indexOf('http') === 0 || rel.indexOf('/') === 0) return rel;
  const idx = base.lastIndexOf('/');
  if(idx < 0) return rel;
  return base.slice(0, idx+1) + rel;
}

function loadImage(url){
  return new Promise(function(resolve, reject){
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){ resolve(img); };
    img.onerror = function(){ reject(new Error('图片加载失败: ' + url)); };
    img.src = url;
  });
}

function loadOBJModel(objUrl, onProgress){
  const report = function(msg){
    if(onProgress) try{ onProgress(msg); }catch(e){}
  };
  report('读取模型文件…');
  return fetch(objUrl).then(function(r){
    if(!r.ok) throw new Error('加载失败 HTTP ' + r.status);
    return r.text();
  }).then(function(text){
    report('解析模型数据…');
    const model = parseOBJ(text);
    console.log('[R3D] 顶点', model.P.length/3, '三角形', model.I.length/3);
    if(model.mtlFile){
      const mtlUrl = resolveURL(objUrl, model.mtlFile);
      report('读取材质…');
      return fetch(mtlUrl).then(function(r){ return r.text(); }).then(function(mtlText){
        model.mtl = parseMTL(mtlText);
        return model;
      }).catch(function(){ return model; });
    }
    return model;
  }).then(function(model){
    if(model.mtl && model.mtl.mapKd){
      const texUrl = resolveURL(objUrl, model.mtl.mapKd);
      report('加载贴图…');
      return loadImage(texUrl).then(function(img){
        model.texImage = img;
        return model;
      }).catch(function(){
        return model;
      });
    }
    return model;
  });
}

/* ==================== 渲染器 ==================== */
function Renderer(canvas){
  const gl = canvas.getContext('webgl', {
    antialias: true, alpha: false, depth: true,
    preserveDrawingBuffer: false, powerPreference: 'high-performance'
  }) || canvas.getContext('experimental-webgl');
  if(!gl) throw new Error('WebGL 不可用');

  this.gl = gl;
  this.canvas = canvas;

  const program = linkProgram(gl);
  if(!program) throw new Error('着色器编译失败');
  this.program = program;

  this.attr = {
    pos: gl.getAttribLocation(program, 'aPos'),
    normal: gl.getAttribLocation(program, 'aNormal'),
    uv: gl.getAttribLocation(program, 'aUV')
  };
  this.uni = {};
  const uniNames = ['uVP','uTex','uHasTex','uAlphaTest','uColor',
    'uLP0','uLP1','uLP2','uLC0','uLC1','uLC2',
    'uAmbient','uCamPos','uFogColor','uFogNear','uFogFar'];
  for(let i=0;i<uniNames.length;i++){
    this.uni[uniNames[i]] = gl.getUniformLocation(program, uniNames[i]);
  }

  this.camera = { x:0, y:1.6, z:0, yaw:0, pitch:0, fov:Math.PI/3, near:0.05, far:60 };
  this.lights = [
    { x:0,y:-100,z:0,color:[0,0,0] },
    { x:0,y:-100,z:0,color:[0,0,0] },
    { x:0,y:-100,z:0,color:[0,0,0] }
  ];
  this.ambient = [0.12, 0.14, 0.18];
  this.fog = { r:0.04, g:0.05, b:0.08, near:6, far:22 };

  this.wallMesh=null; this.wallTex=null; this.wallHasTex=false;
  this.floorMesh=null; this.floorTex=null; this.floorHasTex=false;
  this.ceilMesh=null; this.ceilTex=null; this.ceilHasTex=false;

  this.props = [];
  this.models = [];

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
    this.canvas.width = w; this.canvas.height = h;
  }
  gl.viewport(0, 0, w, h);
  this.aspect = cssW / Math.max(1, cssH);
};
Renderer.prototype.setCamera = function(c){
  const cam = this.camera, keys = ['x','y','z','yaw','pitch','fov','near','far'];
  for(let i=0;i<keys.length;i++) if(c[keys[i]] !== undefined) cam[keys[i]] = c[keys[i]];
};
Renderer.prototype.setLights = function(list){
  for(let i=0;i<3;i++){
    if(list && list[i]) this.lights[i] = list[i];
    else this.lights[i] = { x:0,y:-999,z:0,color:[0,0,0] };
  }
};
Renderer.prototype.setAmbient = function(rgb){ if(Array.isArray(rgb)) this.ambient = [rgb[0],rgb[1],rgb[2]]; };
Renderer.prototype.setFog = function(f){
  if(f.color){
    this.fog.r=f.color[0]; this.fog.g=f.color[1]; this.fog.b=f.color[2];
    this.gl.clearColor(f.color[0], f.color[1], f.color[2], 1);
  }
  if(f.near !== undefined) this.fog.near = f.near;
  if(f.far !== undefined) this.fog.far = f.far;
};

/* ★ engine.js 需要的空实现 */
Renderer.prototype.setBillboards = function(list){
  /* no-op：本引擎不支持 billboard */
};

Renderer.prototype.textureFromCanvas = function(source, opts){ return makeTexture(this.gl, source, opts); };
Renderer.prototype._loadTex = function(existing, source, opts){
  const gl = this.gl;
  if(existing){ try{ gl.deleteTexture(existing); }catch(e){} }
  if(!source) return { tex: null, ok: false };
  try{ return { tex: makeTexture(gl, source, opts), ok: true }; }
  catch(e){ console.warn('[R3D] 纹理上传失败:', e.message); return { tex:null, ok:false }; }
};

Renderer.prototype.buildWorld = function(cfg){
  const gl = this.gl;
  const grid = cfg.grid;
  const wallH = cfg.wallHeight !== undefined ? cfg.wallHeight : 2.6;
  const rows = grid.length;
  const cols = grid[0].length;
  const originX = cfg.originX || 0, originZ = cfg.originZ || 0;
  const sampleHeight = typeof cfg.heightAt === 'function' ? cfg.heightAt : function(){ return 0; };
  const ceilingAt = typeof cfg.ceilingAt === 'function' ? cfg.ceilingAt : function(x,z){ return sampleHeight(x,z)+wallH; };
  const WP=[], WN=[], WU=[], WI=[];
  function normal(a,b,c){
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;
    return [nx/l,ny/l,nz/l];
  }
  function wq(v0,v1,v2,v3,n){
    const base = WP.length/3; n=n||normal(v0,v1,v2);
    WP.push(v0[0],v0[1],v0[2],v1[0],v1[1],v1[2],v2[0],v2[1],v2[2],v3[0],v3[1],v3[2]);
    for(let k=0;k<4;k++) WN.push(n[0],n[1],n[2]);
    WU.push(0,1,1,1,1,0,0,0); WI.push(base,base+1,base+2,base,base+2,base+3);
  }
  for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
    if(grid[y][x] !== '1') continue;
    const x0=x+originX,x1=x+1+originX,z0=y+originZ,z1=y+1+originZ;
    const b00=sampleHeight(x0,z0),b10=sampleHeight(x1,z0),b11=sampleHeight(x1,z1),b01=sampleHeight(x0,z1);
    const t00=ceilingAt(x0,z0),t10=ceilingAt(x1,z0),t11=ceilingAt(x1,z1),t01=ceilingAt(x0,z1);
    wq([x0,t00,z0],[x1,t10,z0],[x1,t11,z1],[x0,t01,z1]);
    if(y-1<0||grid[y-1][x]!=='1') wq([x0,b00,z0],[x1,b10,z0],[x1,t10,z0],[x0,t00,z0]);
    if(y+1>=rows||grid[y+1][x]!=='1') wq([x1,b11,z1],[x0,b01,z1],[x0,t01,z1],[x1,t11,z1]);
    if(x-1<0||grid[y][x-1]!=='1') wq([x0,b01,z1],[x0,b00,z0],[x0,t00,z0],[x0,t01,z1]);
    if(x+1>=cols||grid[y][x+1]!=='1') wq([x1,b10,z0],[x1,b11,z1],[x1,t11,z1],[x1,t10,z0]);
  }
  const FP=[],FN=[],FU=[],FI=[];
  for(let z=0;z<rows;z++) for(let x=0;x<cols;x++){
    if(grid[z][x] !== '0') continue;
    const x0=x+originX,x1=x0+1,z0=z+originZ,z1=z0+1;
    const a=[x0,sampleHeight(x0,z0),z0],b=[x1,sampleHeight(x1,z0),z0],c=[x1,sampleHeight(x1,z1),z1],d=[x0,sampleHeight(x0,z1),z1];
    const n=normal(a,b,c); pushQuad(FP,FN,FU,FI,a,b,c,d,n);
  }
  const CP=[],CN=[],CU=[],CI=[];
  if(cfg.openSky !== true){
    for(let z=0;z<rows;z++) for(let x=0;x<cols;x++){
      if(grid[z][x] !== '0') continue;
      const x0=x+originX,x1=x0+1,z0=z+originZ,z1=z0+1;
      pushQuad(CP,CN,CU,CI,[x0,ceilingAt(x0,z0),z0],[x0,ceilingAt(x0,z1),z1],[x1,ceilingAt(x1,z1),z1],[x1,ceilingAt(x1,z0),z0],[0,-1,0]);
    }
  }
  if(!this.wallMesh) this.wallMesh=createMesh(gl); if(!this.floorMesh) this.floorMesh=createMesh(gl); if(!this.ceilMesh) this.ceilMesh=createMesh(gl);
  uploadMesh(gl,this.wallMesh,WP,WN,WU,WI); uploadMesh(gl,this.floorMesh,FP,FN,FU,FI); uploadMesh(gl,this.ceilMesh,CP,CN,CU,CI);
  const wt=this._loadTex(this.wallTex,cfg.wallTexSource,{repeat:true}),ft=this._loadTex(this.floorTex,cfg.floorTexSource,{repeat:true}),ct=this._loadTex(this.ceilTex,cfg.ceilTexSource,{repeat:true});
  this.wallTex=wt.tex;this.wallHasTex=wt.ok;this.floorTex=ft.tex;this.floorHasTex=ft.ok;this.ceilTex=ct.tex;this.ceilHasTex=ct.ok;
};

Renderer.prototype.buildProps = function(list){
  const gl = this.gl;
  for(let i=0;i<this.props.length;i++){
    const p = this.props[i];
    try{ gl.deleteBuffer(p.mesh.vbo); gl.deleteBuffer(p.mesh.ibo); }catch(e){}
  }
  this.props = [];
  if(!list || !list.length) return;
  for(let i=0;i<list.length;i++){
    const p = list[i];
    const P=[],N=[],U=[],I=[];
    const shape = p.shape || 'box';
    const w = p.w!==undefined?p.w:0.6;
    const h = p.h!==undefined?p.h:0.6;
    const d = p.d!==undefined?p.d:(p.w||0.6);
    const cx=p.x, y0=p.y!==undefined?p.y:0, cz=p.z;
    if(shape==='box') buildBox(P,N,U,I,cx,y0,cz,w,h,d);
    else if(shape==='bevelBox') buildBox(P,N,U,I,cx,y0,cz,w,h,d);
    else if(shape==='ramp') buildBox(P,N,U,I,cx,y0,cz,w,h,d);
    else if(shape==='cyl') buildCylinder(P,N,U,I,cx,y0,cz,w/2,h,p.seg||24);
    else if(shape==='plate') buildBox(P,N,U,I,cx,y0,cz,w,h,0.06);
    else if(shape==='low') buildCylinder(P,N,U,I,cx,y0,cz,w/2,h,p.seg||12);
    else if(shape==='sphere') buildSphere(P,N,U,I,cx,y0,cz,w/2,p.segU||16,p.segV||12);
    else if(shape==='cone') buildCone(P,N,U,I,cx,y0,cz,w/2,h,p.seg||24);
    else if(shape==='torus') buildTorus(P,N,U,I,cx,y0,cz,w/2,(p.r2!==undefined?p.r2:h),p.segU||24,p.segV||12);
    else continue;
    if(P.length===0 || P.length/3 > 65535) continue;
    const mesh = createMesh(gl);
    uploadMesh(gl, mesh, P, N, U, I);
    let color = p.color || '#888888';
    if(color.charAt(0) !== '#') color = '#888888';
    if(color.length === 4){
      color = '#' + color[1]+color[1] + color[2]+color[2] + color[3]+color[3];
    }
    const r = parseInt(color.slice(1,3),16)/255;
    const g = parseInt(color.slice(3,5),16)/255;
    const b = parseInt(color.slice(5,7),16)/255;
    this.props.push({ mesh: mesh, color: [r,g,b] });
  }
};

/* =========================================================
   ★ v7 addModel —— 关键修复：
     用 Uint32 索引一次性上传所有顶点+索引
     （旧版分块逻辑对 17 万顶点模型存在隐藏 bug，导致模型不显示）
   ========================================================= */
Renderer.prototype.addModel = function(model, options){
  const gl = this.gl;
  options = options || {};
  const ox = options.x || 0;
  const oy = options.y || 0;
  const oz = options.z || 0;
  const scale = options.scale !== undefined ? options.scale : 1;
  const rotationY = options.rotationY || 0;
  const autoFit = options.autoFit !== false;

  const srcP = model.P, srcN = model.N, srcU = model.U, srcI = model.I;

  /* ---- 包围盒 ---- */
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for(let i = 0; i < srcP.length; i += 3){
    const x = srcP[i], y = srcP[i+1], z = srcP[i+2];
    if(x < minX) minX = x; if(x > maxX) maxX = x;
    if(y < minY) minY = y; if(y > maxY) maxY = y;
    if(z < minZ) minZ = z; if(z > maxZ) maxZ = z;
  }
  const boxCX = (minX + maxX) / 2;
  const boxCZ = (minZ + maxZ) / 2;

  const cosR = Math.cos(rotationY), sinR = Math.sin(rotationY);

  const P = new Float32Array(srcP.length);
  for(let i = 0; i < srcP.length; i += 3){
    let px = srcP[i];
    let py = srcP[i+1];
    let pz = srcP[i+2];
    if(autoFit){
      px -= boxCX;
      pz -= boxCZ;
      py -= minY;
    }
    px *= scale; py *= scale; pz *= scale;
    const rx =  px * cosR + pz * sinR;
    const rz = -px * sinR + pz * cosR;
    P[i]   = rx + ox;
    P[i+1] = py + oy;
    P[i+2] = rz + oz;
  }

  const N = new Float32Array(srcN.length);
  for(let i = 0; i < srcN.length; i += 3){
    const x = srcN[i], y = srcN[i+1], z = srcN[i+2];
    N[i]   = x * cosR + z * sinR;
    N[i+1] = y;
    N[i+2] = -x * sinR + z * cosR;
  }

  const U = srcU;
  const I = srcI;
  const tex = model.texImage ? makeTexture(gl, model.texImage, { flipY: false }) : null;
  const hasTex = !!tex;
  const color = options.color || [1, 1, 1];

  const totalVerts = P.length / 3;
  const totalIndexes = I.length;
  console.log('[R3D] addModel 顶点:', totalVerts, '索引:', totalIndexes);

  /* ★ 优先用 Uint32 一次性上传 */
  const ext32 = gl.getExtension('OES_element_index_uint');

  if(ext32){
    const mesh = createMesh(gl);
    uploadMeshU32(gl, mesh, P, N, U, I);
    this.models.push({ mesh, tex, hasTex, color });
    console.log('[R3D] ✅ Uint32 一次性上传成功');
  } else if(totalVerts <= 65535 && totalIndexes <= 65535){
    const mesh = createMesh(gl);
    uploadMesh(gl, mesh, P, N, U, I);
    this.models.push({ mesh, tex, hasTex, color });
    console.log('[R3D] ✅ Uint16 一次性上传成功');
  } else {
    /* 最后兜底：分块（无 Uint32 扩展 + 模型过大） */
    console.warn('[R3D] ⚠ 不支持 Uint32 且模型过大，走降级分块');
    const MAX_VERTS = 60000;
    const triCount = I.length / 3;
    let chunkMap = new Map();
    let chunkP = [], chunkN = [], chunkU = [], chunkI = [];
    let chunkVertCount = 0;
    const self = this;

    function flushChunk(){
      if(chunkI.length === 0) return;
      const mesh = createMesh(gl);
      uploadMesh(gl, mesh, chunkP, chunkN, chunkU, chunkI);
      self.models.push({ mesh, tex, hasTex, color });
      chunkMap = new Map();
      chunkP = []; chunkN = []; chunkU = []; chunkI = [];
      chunkVertCount = 0;
    }

    for(let t = 0; t < triCount; t++){
      const i0 = I[t*3], i1 = I[t*3+1], i2 = I[t*3+2];
      const newVerts = [];
      if(!chunkMap.has(i0)) newVerts.push(i0);
      if(!chunkMap.has(i1)) newVerts.push(i1);
      if(!chunkMap.has(i2)) newVerts.push(i2);

      if(chunkVertCount + newVerts.length > MAX_VERTS){
        flushChunk();
      }

      [i0, i1, i2].forEach(function(vi){
        if(!chunkMap.has(vi)){
          const newIdx = chunkP.length / 3;
          chunkMap.set(vi, newIdx);
          chunkP.push(P[vi*3], P[vi*3+1], P[vi*3+2]);
          chunkN.push(N[vi*3], N[vi*3+1], N[vi*3+2]);
          chunkU.push(U[vi*2], U[vi*2+1]);
          chunkVertCount++;
        }
        chunkI.push(chunkMap.get(vi));
      });
    }
    flushChunk();
  }

  return { totalChunks: this.models.length };
};

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
  /* ★ 根据索引类型选择 UNSIGNED_INT / UNSIGNED_SHORT */
  gl.drawElements(gl.TRIANGLES, mesh.indexCount,
    mesh.uint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
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
  const cy = Math.cos(cam.yaw),   sy = Math.sin(cam.yaw);
  const dir = [cy*cp, sp, sy*cp];
  const target = [cam.x+dir[0], cam.y+dir[1], cam.z+dir[2]];

  M4.perspective(this._proj, cam.fov, this.aspect||1, cam.near, cam.far);
  M4.lookAt(this._view, [cam.x, cam.y, cam.z], target, [0,1,0]);
  M4.multiply(this._vp, this._proj, this._view);

  gl.uniformMatrix4fv(this.uni.uVP, false, this._vp);
  gl.uniform3f(this.uni.uCamPos, cam.x, cam.y, cam.z);

  for(let i=0;i<3;i++){
    const l = this.lights[i];
    gl.uniform3f(this.uni['uLP'+i], l.x, l.y, l.z);
    gl.uniform3f(this.uni['uLC'+i], l.color[0], l.color[1], l.color[2]);
  }
  gl.uniform3f(this.uni.uAmbient, this.ambient[0], this.ambient[1], this.ambient[2]);
  gl.uniform3f(this.uni.uFogColor, this.fog.r, this.fog.g, this.fog.b);
  gl.uniform1f(this.uni.uFogNear, this.fog.near);
  gl.uniform1f(this.uni.uFogFar, this.fog.far);

  this._drawMesh(this.wallMesh,  this.wallTex,  this.wallHasTex,  1,1,1,0);
  this._drawMesh(this.floorMesh, this.floorTex, this.floorHasTex, 1,1,1,0);
  this._drawMesh(this.ceilMesh,  this.ceilTex,  this.ceilHasTex,  1,1,1,0);

  for(let i=0;i<this.props.length;i++){
    const p = this.props[i];
    this._drawMesh(p.mesh, null, false, p.color[0], p.color[1], p.color[2], 0);
  }

  for(let i=0;i<this.models.length;i++){
    const m = this.models[i];
    this._drawMesh(m.mesh, m.tex, m.hasTex, m.color[0], m.color[1], m.color[2], 0);
  }
};

Renderer.prototype.dispose = function(){
  const gl = this.gl;
  [this.wallMesh, this.floorMesh, this.ceilMesh].forEach(function(m){
    if(m){ try{ gl.deleteBuffer(m.vbo); gl.deleteBuffer(m.ibo); }catch(e){} }
  });
  for(let i=0;i<this.props.length;i++){
    const p = this.props[i];
    try{ gl.deleteBuffer(p.mesh.vbo); gl.deleteBuffer(p.mesh.ibo); }catch(e){}
  }
  for(let i=0;i<this.models.length;i++){
    const m = this.models[i];
    try{ gl.deleteBuffer(m.mesh.vbo); gl.deleteBuffer(m.mesh.ibo); }catch(e){}
    if(m.tex){ try{ gl.deleteTexture(m.tex); }catch(e){} }
  }
  [this.wallTex, this.floorTex, this.ceilTex].forEach(function(t){
    if(t){ try{ gl.deleteTexture(t); }catch(e){} }
  });
  if(this.program){ try{ gl.deleteProgram(this.program); }catch(e){} }
};

/* ==================== 导出 ==================== */
global.R3D = {
  create(canvas){ return new Renderer(canvas); },
  loadOBJModel(objUrl, onProgress){ return loadOBJModel(objUrl, onProgress); }
};

})(window);