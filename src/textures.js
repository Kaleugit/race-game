import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTex(canvas, { repeat = false, smooth = false } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  const filter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  tex.magFilter = filter;
  tex.minFilter = filter;
  tex.generateMipmaps = false;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

export function makeSkyTexture() {
  const w = 64, h = 128;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#1a1340');
  grad.addColorStop(0.35, '#5a3a8c');
  grad.addColorStop(0.65, '#e87a5d');
  grad.addColorStop(0.85, '#ffc46b');
  grad.addColorStop(1.0, '#ffe9b0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#fff8d0';
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h * 0.4);
    ctx.fillRect(x, y, 1, 1);
  }
  return toTex(c);
}

export function makeSunTexture() {
  const s = 64;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  const cx = s / 2, cy = s / 2;
  const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, s / 2);
  grad.addColorStop(0, '#fff5b8');
  grad.addColorStop(0.4, '#ffd06b');
  grad.addColorStop(0.7, 'rgba(255,140,80,0.4)');
  grad.addColorStop(1, 'rgba(255,140,80,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  return toTex(c);
}

export function makeMountainTexture(seed = 1) {
  const w = 512, h = 128;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  ctx.fillStyle = '#3d2c5a';
  ctx.beginPath();
  ctx.moveTo(0, h);
  let x = 0;
  while (x <= w) {
    const peak = h * 0.15 + rnd() * h * 0.55;
    const step = 30 + rnd() * 50;
    ctx.lineTo(x, h - peak);
    x += step;
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#5a4080';
  for (let i = 0; i < 60; i++) {
    const px = Math.floor(rnd() * w);
    const py = Math.floor(rnd() * h * 0.7) + h * 0.1;
    ctx.fillRect(px, py, 2, 2);
  }
  return toTex(c);
}

export function makeHillTexture(seed = 2) {
  const w = 1280, h = 256;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  function genPeaks(minSpacing, maxSpacing, minH, maxH) {
    const peaks = [{ x: 0, y: minH + rnd() * (maxH - minH) * 0.3 }];
    let x = 0;
    while (x < w) {
      x += minSpacing + rnd() * (maxSpacing - minSpacing);
      peaks.push({ x: Math.min(x, w), y: minH + rnd() * (maxH - minH) });
    }
    if (peaks[peaks.length - 1].x < w) {
      peaks.push({ x: w, y: minH + rnd() * (maxH - minH) * 0.3 });
    }
    return peaks;
  }

  function drawFacets(peaks, litColor, shadowColor, edgeColor) {
    for (let i = 0; i < peaks.length - 1; i++) {
      const p1 = peaks[i];
      const p2 = peaks[i + 1];
      const slope = (p2.y - p1.y) / (p2.x - p1.x);
      ctx.fillStyle = slope > 0 ? litColor : shadowColor;
      ctx.beginPath();
      ctx.moveTo(p1.x, h - p1.y);
      ctx.lineTo(p2.x, h - p2.y);
      ctx.lineTo(p2.x, h);
      ctx.lineTo(p1.x, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(peaks[0].x, h - peaks[0].y);
    for (let i = 1; i < peaks.length; i++) {
      ctx.lineTo(peaks[i].x, h - peaks[i].y);
    }
    ctx.stroke();
  }

  const back = genPeaks(110, 180, h * 0.30, h * 0.55);
  drawFacets(back, '#2d5a30', '#1c3d20', '#37703a');

  const front = genPeaks(70, 130, h * 0.18, h * 0.45);
  drawFacets(front, '#5aa050', '#3a7037', '#7ec070');

  return toTex(c, { smooth: true });
}

export function makeRoadTexture() {
  const w = 256, h = 64;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');

  // Cor base: Mistura de asfalto velho com tons de terra/lama
  ctx.fillStyle = '#2a2d24'; 
  ctx.fillRect(0, 0, w, h);

  // Manchas de Musgo e Grama nas bordas
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = 1 + Math.random() * 3;
    const green = 40 + Math.random() * 40;
    // Mais grama nas bordas (y perto de 0 ou h)
    const edgeDist = Math.min(y, h - y);
    if (Math.random() > edgeDist / 15) {
      ctx.fillStyle = `rgb(${green-20}, ${green}, ${green-30})`;
      ctx.fillRect(x, y, size, size);
    }
  }

  // Detalhes de Lama (manchas marrons)
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const rw = 10 + Math.random() * 30;
    const rh = 5 + Math.random() * 15;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rw);
    grad.addColorStop(0, 'rgba(60, 45, 30, 0.6)');
    grad.addColorStop(1, 'rgba(60, 45, 30, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - rw, y - rh, rw * 2, rh * 2);
  }

  // Ruído de areia/pedregulhos
  for (let i = 0; i < 800; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    const v = 35 + Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgb(${v},${v+2},${v-5})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Faixa central desgastada (amarelo pálido/sujo)
  ctx.fillStyle = 'rgba(200, 190, 100, 0.4)';
  const dashW = 28, dashGap = 20;
  let dx = 0;
  while (dx < w) {
    ctx.fillRect(dx, h / 2 - 1.5, dashW, 3);
    dx += dashW + dashGap;
  }

  // Bordas escuras/sombreadas
  const edgeGrad = ctx.createLinearGradient(0, 0, 0, h);
  edgeGrad.addColorStop(0, 'rgba(10, 15, 10, 0.5)');
  edgeGrad.addColorStop(0.1, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(0.9, 'rgba(0,0,0,0)');
  edgeGrad.addColorStop(1, 'rgba(10, 15, 10, 0.5)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, w, h);

  return toTex(c, { repeat: true });
}

export function makeRoadNormalTexture() {
  const w = 256, h = 64;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const noise = (Math.random() - 0.5) * 30;
      img.data[i + 0] = 128 + noise;
      img.data[i + 1] = 128 + noise;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTex(c, { repeat: true });
}

export function makeShoulderTexture() {
  const w = 128, h = 32;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4a3a26';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    const v = 60 + Math.floor(Math.random() * 50);
    ctx.fillStyle = `rgb(${v + 20},${v},${v - 30})`;
    ctx.fillRect(x, y, 1, 1);
  }
  return toTex(c, { repeat: true });
}

export function makeTreeTexture() {
  const w = 32, h = 48;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#3a2818';
  ctx.fillRect(14, 36, 4, 12);

  ctx.fillStyle = '#1d3a1a';
  ctx.beginPath();
  ctx.arc(16, 22, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2d5526';
  ctx.beginPath();
  ctx.arc(13, 19, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3d7030';
  for (let i = 0; i < 25; i++) {
    const px = 8 + Math.floor(Math.random() * 16);
    const py = 12 + Math.floor(Math.random() * 18);
    ctx.fillRect(px, py, 2, 2);
  }
  return toTex(c);
}

export function makeCloudTexture() {
  const w = 64, h = 24;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fff8d8';
  const blobs = [
    [12, 14, 8], [22, 10, 10], [34, 12, 9], [46, 14, 7],
  ];
  for (const [x, y, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#e0c890';
  for (const [x, y, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.5, r * 0.7, 0, Math.PI);
    ctx.fill();
  }
  return toTex(c);
}

export function makeFlameTexture() {
  const w = 32, h = 16;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(220,40,30,0.8)';
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, 1);
  ctx.lineTo(w, h - 1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,140,40,0.95)';
  ctx.beginPath();
  ctx.moveTo(4, h / 2);
  ctx.lineTo(w, 4);
  ctx.lineTo(w, h - 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,225,80,1)';
  ctx.beginPath();
  ctx.moveTo(10, h / 2);
  ctx.lineTo(w, 6);
  ctx.lineTo(w, h - 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,220,1)';
  ctx.fillRect(20, h / 2 - 1, w - 20, 2);

  return toTex(c);
}

export function makeCarTexture() {
  const w = 64, h = 32;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#c01a1a';
  ctx.fillRect(8, 14, 48, 10);
  ctx.fillRect(16, 8, 32, 8);

  ctx.fillStyle = '#e02a2a';
  ctx.fillRect(8, 14, 48, 2);
  ctx.fillRect(16, 8, 32, 2);

  ctx.fillStyle = '#7a0e0e';
  ctx.fillRect(8, 22, 48, 2);

  ctx.fillStyle = '#9adfff';
  ctx.fillRect(20, 10, 10, 5);
  ctx.fillRect(34, 10, 12, 5);
  ctx.fillStyle = '#cdefff';
  ctx.fillRect(20, 10, 10, 1);
  ctx.fillRect(34, 10, 12, 1);

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(13, 22, 9, 7);
  ctx.fillRect(42, 22, 9, 7);

  ctx.fillStyle = '#5a5a5a';
  ctx.fillRect(15, 24, 5, 3);
  ctx.fillRect(44, 24, 5, 3);

  ctx.fillStyle = '#ffd86b';
  ctx.fillRect(54, 16, 3, 3);
  ctx.fillStyle = '#ff4040';
  ctx.fillRect(7, 16, 2, 3);

  return toTex(c);
}
