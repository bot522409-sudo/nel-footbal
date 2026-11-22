import * as THREE from 'three';
import { KitPattern } from './types';

export function createPitchTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const width = 2048;
  const height = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Lush Championship Wembley / Bernabeu hybrid ryegrass base (balanced broadcast green, non-glaring)
  ctx.fillStyle = '#185427';
  ctx.fillRect(0, 0, width, height);

  // Crisp mowed horizontal bands (18 bands) with natural velvet roller contrast
  const bands = 18;
  const bandH = height / bands;
  for (let i = 0; i < bands; i++) {
    const grad = ctx.createLinearGradient(0, i * bandH, 0, (i + 1) * bandH);
    if (i % 2 === 0) {
      grad.addColorStop(0, '#1f6b32');
      grad.addColorStop(0.18, '#247738');
      grad.addColorStop(0.5, '#287e3c');
      grad.addColorStop(0.84, '#227235');
      grad.addColorStop(1, '#1d642e');
    } else {
      grad.addColorStop(0, '#154e24');
      grad.addColorStop(0.2, '#124620');
      grad.addColorStop(0.5, '#10411d');
      grad.addColorStop(0.82, '#144b22');
      grad.addColorStop(1, '#175226');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, i * bandH, width, bandH);

    // Subtle roller track seam without harsh bright glare
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(134, 239, 172, 0.032)' : 'rgba(5, 24, 10, 0.08)';
    ctx.fillRect(0, i * bandH, width, 3);
  }

  // Cross-cut vertical checkerboard mowing sheen (adds rich 3D lawn depth)
  const cols = 14;
  for (let x = 0; x < cols; x++) {
    const colGrad = ctx.createLinearGradient(
      (x * width) / cols,
      0,
      ((x + 1) * width) / cols,
      0,
    );
    if (x % 2 === 0) {
      colGrad.addColorStop(0, 'rgba(187, 247, 208, 0.01)');
      colGrad.addColorStop(0.5, 'rgba(187, 247, 208, 0.028)');
      colGrad.addColorStop(1, 'rgba(187, 247, 208, 0.01)');
    } else {
      colGrad.addColorStop(0, 'rgba(6, 28, 12, 0.015)');
      colGrad.addColorStop(0.5, 'rgba(6, 28, 12, 0.045)');
      colGrad.addColorStop(1, 'rgba(6, 28, 12, 0.015)');
    }
    ctx.fillStyle = colGrad;
    ctx.fillRect((x * width) / cols, 0, width / cols, height);
  }

  // Natural organic turf mottling & subtle emerald clover clusters
  for (let i = 0; i < 640; i++) {
    const px = ((i * 317 + 47) % width);
    const py = ((i * 571 + 91) % height);
    const r = 16 + (i % 46);
    const mott = ctx.createRadialGradient(px, py, 2, px, py, r);
    if (i % 4 === 0) {
      mott.addColorStop(0, 'rgba(74, 222, 128, 0.035)');
    } else if (i % 3 === 0) {
      mott.addColorStop(0, 'rgba(77, 124, 15, 0.04)');
    } else {
      mott.addColorStop(0, 'rgba(10, 40, 18, 0.075)');
    }
    mott.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = mott;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dense directional grass leaf micro-strokes (aligned along mowing bands for velvety look)
  ctx.lineCap = 'round';
  for (let i = 0; i < 88000; i++) {
    const gx = ((i * 2654435761) >>> 0) % width;
    const gy = (((i + 7919) * 2246822519) >>> 0) % height;
    const band = Math.floor(gy / bandH);
    const lean = band % 2 === 0 ? 1.8 : -1.8;
    const roll = (i % 100) / 100;
    if (roll > 0.68) {
      ctx.strokeStyle = 'rgba(134, 239, 172, 0.075)';
    } else if (roll > 0.36) {
      ctx.strokeStyle = 'rgba(132, 204, 22, 0.048)';
    } else {
      ctx.strokeStyle = 'rgba(4, 30, 12, 0.16)';
    }
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + lean, gy - 4.2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createPitchDetailMaps(maxAnisotropy: number): {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  bCtx.fillStyle = '#7e7e7e';
  bCtx.fillRect(0, 0, size, size);

  // Alternate mowed band roughness without shiny hotspots
  const bands = 18;
  const bandH = size / bands;
  for (let i = 0; i < bands; i++) {
    rCtx.fillStyle = i % 2 === 0 ? '#c4c4c4' : '#e0e0e0';
    rCtx.fillRect(0, i * bandH, size, bandH);
  }
  const cols = 14;
  for (let c = 0; c < cols; c++) {
    rCtx.fillStyle = c % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
    rCtx.fillRect((c * size) / cols, 0, size / cols, size);
  }

  // Directional grass blade relief (matte-textured turf)
  bCtx.lineCap = 'round';
  for (let i = 0; i < 46000; i++) {
    const x = ((i * 19349663) >>> 0) % size;
    const y = (((i + 5113) * 83492791) >>> 0) % size;
    const bright = (i & 1) === 0;
    const lean = Math.floor(y / bandH) % 2 === 0 ? 1.5 : -1.5;
    bCtx.strokeStyle = bright ? '#c8c8c8' : '#424242';
    bCtx.lineWidth = 1.4;
    bCtx.beginPath();
    bCtx.moveTo(x, y);
    bCtx.lineTo(x + lean, y - 4);
    bCtx.stroke();

    if (i % 3 === 0) {
      rCtx.fillStyle = bright ? '#b8b8b8' : '#ebebeb';
      rCtx.fillRect(x, y, 2, 3);
    }
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.needsUpdate = true;

  return { bumpMap, roughnessMap };
}

export function createGoalWearDecalTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.04,
    size / 2,
    size / 2,
    size * 0.48,
  );
  grad.addColorStop(0, 'rgba(92, 74, 42, 0.34)');
  grad.addColorStop(0.38, 'rgba(68, 78, 38, 0.22)');
  grad.addColorStop(0.75, 'rgba(34, 72, 32, 0.1)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle cleat scuff marks inside worn zone
  for (let i = 0; i < 65; i++) {
    const a = (i * 1.9) % (Math.PI * 2);
    const r = ((i * 19) % 86) * 0.9;
    const sx = size / 2 + Math.cos(a) * r;
    const sy = size / 2 + Math.sin(a) * r * 0.72;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(110, 88, 52, 0.22)' : 'rgba(24, 52, 22, 0.18)';
    ctx.fillRect(sx, sy, 3.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createPitchPerimeterTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep Champions-League synthetic emerald apron texture
  ctx.fillStyle = '#0e3c24';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 32) {
    ctx.fillStyle = y % 64 === 0 ? 'rgba(16, 185, 129, 0.065)' : 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, y, size, 32);
  }
  for (let i = 0; i < 4000; i++) {
    const x = ((i * 997) % size);
    const y = ((i * 541) % size);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(52, 211, 153, 0.04)' : 'rgba(2, 20, 12, 0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createSnowPitchTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const width = 2048;
  const height = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Crisp snow-blanketed pitch base with distinct alpine-blue depth
  ctx.fillStyle = '#cbe0f3';
  ctx.fillRect(0, 0, width, height);

  // High-contrast snow-plowed horizontal bands (18 bands matching pitch stripes)
  const bands = 18;
  const bandH = height / bands;
  for (let i = 0; i < bands; i++) {
    const grad = ctx.createLinearGradient(0, i * bandH, 0, (i + 1) * bandH);
    if (i % 2 === 0) {
      grad.addColorStop(0, '#eaf2fc');
      grad.addColorStop(0.5, '#f6faff');
      grad.addColorStop(1, '#e6f0fb');
    } else {
      grad.addColorStop(0, '#c4daef');
      grad.addColorStop(0.5, '#bad3eb');
      grad.addColorStop(1, '#c8ddf0');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, i * bandH, width, bandH);

    // Sharp snowplow ridge seam between bands for crisp spatial reading
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(255, 255, 255, 0.35)' : 'rgba(92, 134, 175, 0.22)';
    ctx.fillRect(0, i * bandH, width, 3);
  }

  // Organic wind-blown snowdrifts & crisp frozen emerald turf peeking through worn areas
  for (let i = 0; i < 650; i++) {
    const px = (i * 317 + 47) % width;
    const py = (i * 571 + 91) % height;
    const r = 16 + (i % 44);
    const drift = ctx.createRadialGradient(px, py, 2, px, py, r);
    if (i % 4 === 0) {
      // Crisp frosted turf undertone underneath trodden snow
      drift.addColorStop(0, 'rgba(30, 92, 58, 0.28)');
    } else if (i % 2 === 0) {
      drift.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
    } else {
      drift.addColorStop(0, 'rgba(148, 186, 222, 0.26)');
    }
    drift.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = drift;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sharp granular frost crystals & cleat tracks across snow surface
  for (let i = 0; i < 52000; i++) {
    const x = ((i * 2654435761) >>> 0) % width;
    const y = (((i + 7919) * 2246822519) >>> 0) % height;
    if (i % 6 === 0) {
      ctx.fillStyle = 'rgba(104, 142, 178, 0.28)';
      ctx.fillRect(x, y, 2, 2);
    } else if (i % 13 === 0) {
      ctx.fillStyle = 'rgba(24, 78, 48, 0.16)';
      ctx.fillRect(x, y, 2, 2);
    } else {
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(255, 255, 255, 0.55)' : 'rgba(182, 212, 240, 0.30)';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createSnowPerimeterTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#cfdff0';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 32) {
    ctx.fillStyle =
      y % 64 === 0 ? 'rgba(255, 255, 255, 0.28)' : 'rgba(148, 180, 212, 0.14)';
    ctx.fillRect(0, y, size, 32);
  }
  for (let i = 0; i < 4200; i++) {
    const x = (i * 997) % size;
    const y = (i * 541) % size;
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(255, 255, 255, 0.36)' : 'rgba(148, 175, 205, 0.18)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createFabricBumpTexture(
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Fine athletic jersey mesh weave
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const checker = ((x + y) / 4) % 2 === 0;
      ctx.fillStyle = checker ? '#969696' : '#6c6c6c';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createBallTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size / 2;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size / 2;
  const bCtx = bumpCanvas.getContext('2d')!;

  // White synthetic leather base
  ctx.fillStyle = '#f4f6f8';
  ctx.fillRect(0, 0, size, size / 2);

  bCtx.fillStyle = '#d0d0d0';
  bCtx.fillRect(0, 0, size, size / 2);

  // Modern tournament geometric panel bands
  const cols = 6;
  const rows = 3;
  const cellW = size / cols;
  const cellH = size / 2 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * cellW + (r % 2 === 1 ? cellW * 0.5 : 0);
      const cy = (r + 0.5) * cellH;
      const radius = cellH * 0.44;

      // Draw crisp pentagon/hexagon inspired panels
      ctx.save();
      ctx.translate(cx % size, cy);
      ctx.beginPath();
      const sides = 5;
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#111827';
      ctx.fill();

      // Accent gold/emerald trim arc
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();

      // Seam grooves on bump map
      bCtx.save();
      bCtx.translate(cx % size, cy);
      bCtx.beginPath();
      for (let s = 0; s < 5; s++) {
        const a = (s / 5) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * radius;
        const py = Math.sin(a) * radius;
        if (s === 0) bCtx.moveTo(px, py);
        else bCtx.lineTo(px, py);
      }
      bCtx.closePath();
      bCtx.strokeStyle = '#303030';
      bCtx.lineWidth = 6;
      bCtx.stroke();
      bCtx.restore();
    }
  }

  // Subtle leather pebble texture
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * (size / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.fillRect(x, y, 2, 2);
    bCtx.fillStyle = Math.random() > 0.5 ? '#ececec' : '#b8b8b8';
    bCtx.fillRect(x, y, 2, 2);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.wrapS = THREE.RepeatWrapping;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}

export function createNetTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // Hex/diamond nylon cord grid
  ctx.strokeStyle = 'rgba(241, 245, 249, 0.88)';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, size);
  ctx.moveTo(size, 0);
  ctx.lineTo(0, size);
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size, size / 2);
  ctx.lineTo(size / 2, size);
  ctx.lineTo(0, size / 2);
  ctx.closePath();
  ctx.stroke();

  // Knot intersections
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  [
    [0, 0],
    [size / 2, 0],
    [size, 0],
    [0, size / 2],
    [size / 2, size / 2],
    [size, size / 2],
    [0, size],
    [size / 2, size],
    [size, size],
  ].forEach(([kx, ky]) => {
    ctx.beginPath();
    ctx.arc(kx, ky, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    4,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createAdBoardTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const width = 1024;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#09121e';
  ctx.fillRect(0, 0, width, height);

  const panels = [
    { bg: '#0b1829', accent: '#10b981', text: 'SÚT PHẠT ĐỈNH CAO' },
    { bg: '#0f2238', accent: '#f59e0b', text: 'GIẢI VÔ ĐỊCH QUỐC GIA' },
    { bg: '#0b1829', accent: '#38bdf8', text: 'KỸ THUẬT XOÁY BÓNG' },
    { bg: '#0f2238', accent: '#10b981', text: 'CHUNG KẾT CÚP VÀNG' },
  ];

  const pw = width / panels.length;
  panels.forEach((p, idx) => {
    const x = idx * pw;
    ctx.fillStyle = p.bg;
    ctx.fillRect(x, 0, pw, height);

    ctx.fillStyle = p.accent;
    ctx.fillRect(x, 0, pw, 8);
    ctx.fillRect(x, height - 8, pw, 8);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 28px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, x + pw / 2, height / 2);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function drawKitPatternBase(
  ctx: CanvasRenderingContext2D,
  size: number,
  bgHex: string,
  accentHex: string,
  pattern: KitPattern,
): void {
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, size, size);

  if (pattern === 'royal_sash') {
    // Rich diagonal sash + subtle gold filigree lines
    ctx.fillStyle = accentHex;
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.18);
    ctx.lineTo(size * 0.82, size);
    ctx.lineTo(size, size);
    ctx.lineTo(size, size * 0.72);
    ctx.lineTo(size * 0.28, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, size - 20, size - 20);
  } else if (pattern === 'chevron') {
    // Crisp championship V-chevrons
    ctx.fillStyle = accentHex;
    ctx.globalAlpha = 0.24;
    for (let y = 26; y < size; y += 54) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size / 2, y + 42);
      ctx.lineTo(size, y);
      ctx.lineTo(size, y + 20);
      ctx.lineTo(size / 2, y + 62);
      ctx.lineTo(0, y + 20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'galaxy') {
    // Deep nebula gradient + crisp starfield specks
    const grad = ctx.createRadialGradient(
      size * 0.5,
      size * 0.35,
      10,
      size * 0.5,
      size * 0.5,
      size * 0.78,
    );
    grad.addColorStop(0, 'rgba(232, 121, 249, 0.32)');
    grad.addColorStop(0.55, 'rgba(56, 189, 248, 0.16)');
    grad.addColorStop(1, 'rgba(9, 13, 22, 0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 46; i++) {
      const sx = ((i * 73) % 240) + 8;
      const sy = ((i * 137) % 240) + 8;
      const sr = (i % 3) + 1;
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : accentHex;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'flame') {
    // Rising blaze streaks along the hem
    const grad = ctx.createLinearGradient(0, size, 0, 0);
    grad.addColorStop(0, accentHex);
    grad.addColorStop(0.45, 'rgba(251, 146, 60, 0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = accentHex;
    ctx.globalAlpha = 0.3;
    for (let x = 0; x < size; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, size);
      ctx.lineTo(x + 14, size * 0.38);
      ctx.lineTo(x + 28, size);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'cyber') {
    // High-tech grid circuit lines + neon ribs
    ctx.strokeStyle = accentHex;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 2;
    for (let g = 24; g < size; g += 32) {
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(size, g);
      ctx.moveTo(g, 0);
      ctx.lineTo(g, size);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(18, size);
    ctx.moveTo(size - 18, 0);
    ctx.lineTo(size - 18, size);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (pattern === 'toty_prism') {
    // EA FC TOTY faceted crystal prism shards + golden filigree trim
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#091433');
    grad.addColorStop(0.5, bgHex);
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 16; i++) {
      const px = ((i * 89) % size);
      const py = ((i * 131) % size);
      ctx.fillStyle = i % 2 === 0 ? accentHex : '#facc15';
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 64, py + 24);
      ctx.lineTo(px + 28, py + 76);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.25);
    ctx.lineTo(size, size * 0.75);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (pattern === 'carbon_gold') {
    // Platinum / Carbon weave with prestige gold trim
    for (let y = 0; y < size; y += 16) {
      for (let x = 0; x < size; x += 16) {
        ctx.fillStyle = ((x + y) / 16) % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.22)';
        ctx.fillRect(x, y, 14, 14);
      }
    }
    ctx.strokeStyle = accentHex;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, size);
    ctx.moveTo(size, 0);
    ctx.lineTo(0, size);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (pattern === 'halftone_pro') {
    // Pro gradient dot halftone sash
    ctx.fillStyle = accentHex;
    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 16; col++) {
        const radius = Math.max(1.2, (16 - row) * 0.35);
        ctx.globalAlpha = 0.22 * (1 - row / 18);
        ctx.beginPath();
        ctx.arc((col + 0.5) * (size / 16), (row + 0.5) * (size / 16), radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'aurora_wave') {
    // Sweeping Aurora Borealis silk ribbons + luminous frost specks
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#042f2e');
    grad.addColorStop(0.45, bgHex);
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    for (let w = 0; w < 5; w++) {
      const wg = ctx.createLinearGradient(0, w * (size * 0.2), size, (w + 1) * (size * 0.2));
      wg.addColorStop(0, 'rgba(45, 212, 191, 0.04)');
      wg.addColorStop(0.5, w % 2 === 0 ? 'rgba(45, 212, 191, 0.34)' : 'rgba(56, 189, 248, 0.28)');
      wg.addColorStop(1, 'rgba(167, 139, 250, 0.08)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.moveTo(0, size * (0.14 + w * 0.17));
      ctx.bezierCurveTo(
        size * 0.32,
        size * (0.04 + w * 0.16),
        size * 0.68,
        size * (0.28 + w * 0.15),
        size,
        size * (0.1 + w * 0.18),
      );
      ctx.lineTo(size, size * (0.22 + w * 0.18));
      ctx.bezierCurveTo(
        size * 0.68,
        size * (0.38 + w * 0.15),
        size * 0.32,
        size * (0.14 + w * 0.16),
        0,
        size * (0.24 + w * 0.17),
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'dragon_scale') {
    // Imperial overlapping dragon scale armor mesh with gold edges
    const step = size / 8;
    for (let row = 0; row < 10; row++) {
      for (let col = -1; col < 10; col++) {
        const cx = (col + (row % 2 === 0 ? 0.5 : 0)) * step;
        const cy = row * (step * 0.72);
        const sg = ctx.createRadialGradient(cx, cy - step * 0.12, 2, cx, cy, step * 0.6);
        sg.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
        sg.addColorStop(0.65, 'rgba(0, 0, 0, 0.18)');
        sg.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(cx, cy, step * 0.56, 0, Math.PI);
        ctx.fill();
        ctx.strokeStyle = accentHex;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  } else if (pattern === 'thunder_bolt') {
    // Electric lightning streaks + storm core glow
    const grad = ctx.createRadialGradient(size * 0.5, size * 0.45, 6, size * 0.5, size * 0.45, size * 0.7);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = accentHex;
    ctx.lineJoin = 'miter';
    for (let b = 0; b < 5; b++) {
      const bx = size * (0.14 + b * 0.18);
      ctx.globalAlpha = b % 2 === 0 ? 0.65 : 0.35;
      ctx.lineWidth = b % 2 === 0 ? 5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 26, size * 0.32);
      ctx.lineTo(bx - 16, size * 0.54);
      ctx.lineTo(bx + 22, size * 0.8);
      ctx.lineTo(bx - 8, size);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (pattern === 'sakura_gold') {
    // Imperial blossom petals & gold leaf sash
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, bgHex);
    grad.addColorStop(1, '#fce7f3');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Diagonal gold brush sash
    ctx.fillStyle = '#f59e0b';
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.72);
    ctx.lineTo(size * 0.78, 0);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size * 0.94);
    ctx.closePath();
    ctx.fill();

    // Scattered stylized sakura petals
    for (let p = 0; p < 22; p++) {
      const px = ((p * 83 + 21) % (size - 32)) + 16;
      const py = ((p * 119 + 37) % (size - 32)) + 16;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((p * 0.7) % Math.PI);
      ctx.fillStyle = p % 3 === 0 ? '#f59e0b' : accentHex;
      ctx.globalAlpha = p % 2 === 0 ? 0.52 : 0.32;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  } else {
    // Classic woven vertical stripes + diagonal jacquard
    ctx.fillStyle = 'rgba(255,255,255,0.065)';
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) ctx.fillRect((i * size) / 10, 0, size / 10, size);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 4;
    for (let d = -size; d < size * 2; d += 28) {
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + size, size);
      ctx.stroke();
    }
  }
}

export function createJerseyNumberTexture(
  numberStr: string,
  bgHex: string,
  textHex: string,
  accentHex = '#ffffff',
  isStar = false,
  kitPattern: KitPattern = 'striped',
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  drawKitPatternBase(ctx, size, bgHex, accentHex, kitPattern);

  // Top shoulder collar piping
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, size, 16);

  // Subtle name/star banner at upper back
  if (isStar) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 22px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ PRO ★', size / 2, 34);
  }

  // Bold outlined jersey number
  ctx.font = '800 132px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.62)';
  ctx.strokeText(numberStr, size / 2, size / 2 + 12);
  ctx.fillStyle = textHex;
  ctx.fillText(numberStr, size / 2, size / 2 + 12);

  // Bottom hem accent stripe
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.78;
  ctx.fillRect(0, size - 10, size, 10);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createJerseyChestTexture(
  bgHex: string,
  accentHex: string,
  numberStr: string,
  isStar = false,
  kitPattern: KitPattern = 'striped',
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  drawKitPatternBase(ctx, size, bgHex, accentHex, kitPattern);

  // Athletic V-neck collar cutout
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.moveTo(size * 0.34, 0);
  ctx.lineTo(size * 0.5, 42);
  ctx.lineTo(size * 0.66, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
  ctx.beginPath();
  ctx.moveTo(size * 0.39, 0);
  ctx.lineTo(size * 0.5, 28);
  ctx.lineTo(size * 0.61, 0);
  ctx.closePath();
  ctx.fill();

  // Left chest club shield crest
  const cx = size * 0.72;
  const cy = 78;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy - 16);
  ctx.lineTo(cx + 18, cy - 16);
  ctx.lineTo(cx + 16, cy + 8);
  ctx.lineTo(cx, cy + 24);
  ctx.lineTo(cx - 16, cy + 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isStar ? '#fbbf24' : accentHex;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = isStar ? '#fbbf24' : '#f8fafc';
  ctx.font = '800 13px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FC', cx, cy + 1);

  // Small chest number badge on opposite side
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px "Barlow Condensed", sans-serif';
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeText(numberStr, size * 0.28, 80);
  ctx.fillText(numberStr, size * 0.28, 80);

  // Center chest athletic band
  ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
  ctx.fillRect(32, 126, size - 64, 36);
  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 126, size - 64, 36);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 18px "Barlow Condensed", sans-serif';
  ctx.fillText('NEL FOOTBALL', size / 2, 145);

  // Bottom hem accent
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(0, size - 10, size, 10);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createJerseyWrapTexture(
  numberStr: string,
  bgHex: string,
  accentHex = '#ffffff',
  isStar = false,
  kitPattern: KitPattern = 'striped',
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Tile seamless kit pattern horizontally across 1024x512 wrap
  const tile = document.createElement('canvas');
  tile.width = 512;
  tile.height = 512;
  const tCtx = tile.getContext('2d')!;
  drawKitPatternBase(tCtx, 512, bgHex, accentHex, kitPattern);
  ctx.drawImage(tile, 0, 0);
  ctx.drawImage(tile, 512, 0);

  // Subtle athletic torso seam shading (underarm ribs + lower waist contour)
  [0, 512, 1024].forEach((sx) => {
    const sideGrad = ctx.createRadialGradient(
      sx,
      height * 0.52,
      8,
      sx,
      height * 0.52,
      110,
    );
    sideGrad.addColorStop(0, 'rgba(6, 12, 24, 0.28)');
    sideGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sideGrad;
    ctx.fillRect(Math.max(0, sx - 110), 0, 220, height);

    // Side mesh stripe trim
    ctx.fillStyle = accentHex;
    ctx.globalAlpha = 0.38;
    ctx.fillRect(sx - 6, 48, 12, height - 72);
    ctx.globalAlpha = 1;
  });

  // Top shoulder collar piping, raglan seam trim & bottom jersey hem trim
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, width, 20);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(width, 22);
  ctx.stroke();

  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, height - 18, width, 18);
  ctx.globalAlpha = 1;

  // --- BACK PANEL (u = 0.25 => x = 256) ---
  const backX = 256;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.fillRect(backX - 42, 24, 84, 20);
  ctx.fillStyle = accentHex;
  ctx.font = '800 13px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEL · PRO', backX, 34);

  if (isStar) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 32px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ LEGEND ★', backX, 74);
  }
  ctx.font = '900 220px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 16;
  ctx.strokeStyle = 'rgba(9, 15, 28, 0.72)';
  ctx.strokeText(numberStr, backX, 276);
  ctx.lineWidth = 6;
  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.55;
  ctx.strokeText(numberStr, backX, 276);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(numberStr, backX, 276);

  // Subtle fabric fold shadows under jersey number
  const backShadow = ctx.createLinearGradient(backX - 140, 390, backX + 140, 460);
  backShadow.addColorStop(0, 'rgba(0,0,0,0.08)');
  backShadow.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  backShadow.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = backShadow;
  ctx.fillRect(backX - 150, 380, 300, 90);

  // --- FRONT PANEL (u = 0.75 => x = 768) ---
  const frontX = 768;

  // Tailored athletic V-neck collar cutout with inner piping
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.moveTo(frontX - 78, 0);
  ctx.lineTo(frontX, 78);
  ctx.lineTo(frontX + 78, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.52)';
  ctx.beginPath();
  ctx.moveTo(frontX - 52, 0);
  ctx.lineTo(frontX, 48);
  ctx.lineTo(frontX + 52, 0);
  ctx.closePath();
  ctx.fill();

  // Subtle pectoral & core athletic shading
  const pecGrad = ctx.createRadialGradient(
    frontX - 58,
    148,
    8,
    frontX - 58,
    148,
    70,
  );
  pecGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
  pecGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pecGrad;
  ctx.fillRect(frontX - 150, 75, 160, 140);

  const pecGradR = ctx.createRadialGradient(
    frontX + 58,
    148,
    8,
    frontX + 58,
    148,
    70,
  );
  pecGradR.addColorStop(0, 'rgba(255,255,255,0.12)');
  pecGradR.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pecGradR;
  ctx.fillRect(frontX - 10, 75, 160, 140);

  // Left chest club crest shield with metallic bevel & star
  const cx = frontX + 82;
  const cy = 140;
  const crestGrad = ctx.createLinearGradient(cx - 28, cy - 28, cx + 28, cy + 36);
  crestGrad.addColorStop(0, '#1e293b');
  crestGrad.addColorStop(0.5, '#0f172a');
  crestGrad.addColorStop(1, '#020617');
  ctx.fillStyle = crestGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 28, cy - 26);
  ctx.lineTo(cx + 28, cy - 26);
  ctx.lineTo(cx + 24, cy + 12);
  ctx.lineTo(cx, cy + 38);
  ctx.lineTo(cx - 24, cy + 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isStar ? '#fbbf24' : accentHex;
  ctx.lineWidth = 4.5;
  ctx.stroke();

  if (isStar) {
    ctx.fillStyle = '#fde047';
    ctx.font = '800 15px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', cx, cy - 36);
  }

  ctx.fillStyle = isStar ? '#fbbf24' : '#f8fafc';
  ctx.font = '900 20px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEL', cx, cy + 2);

  // Small chest number on opposite breast
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 46px "Barlow Condensed", sans-serif';
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.lineWidth = 6.5;
  ctx.strokeText(numberStr, frontX - 82, 142);
  ctx.fillText(numberStr, frontX - 82, 142);

  // Center sponsor chest crest band with metallic trim
  const sponsorGrad = ctx.createLinearGradient(frontX - 140, 224, frontX + 140, 286);
  sponsorGrad.addColorStop(0, 'rgba(15, 23, 42, 0.36)');
  sponsorGrad.addColorStop(0.5, 'rgba(30, 41, 59, 0.24)');
  sponsorGrad.addColorStop(1, 'rgba(15, 23, 42, 0.36)');
  ctx.fillStyle = sponsorGrad;
  ctx.fillRect(frontX - 142, 224, 284, 62);
  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.68;
  ctx.lineWidth = 3;
  ctx.strokeRect(frontX - 142, 224, 284, 62);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 32px "Barlow Condensed", sans-serif';
  ctx.fillText('NEL FOOTBALL', frontX, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createPlayerFaceTexture(
  skinColorNum: number,
  hairColorNum: number,
  hasBeard = false,
  maxAnisotropy = 4,
): THREE.CanvasTexture {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const skinColor = new THREE.Color(skinColorNum);
  const hairColor = new THREE.Color(hairColorNum);
  const skinCss = `#${skinColor.getHexString()}`;
  const hairCss = `#${hairColor.getHexString()}`;

  // Base skin tone
  ctx.fillStyle = skinCss;
  ctx.fillRect(0, 0, width, height);

  // Realistic 3D facial subsurface warmth & brow/cheek/jaw shading
  const faceGlow = ctx.createRadialGradient(256, 224, 22, 256, 256, 184);
  faceGlow.addColorStop(0, 'rgba(255, 244, 232, 0.28)');
  faceGlow.addColorStop(0.48, 'rgba(255, 214, 188, 0.08)');
  faceGlow.addColorStop(0.82, 'rgba(34, 16, 8, 0.16)');
  faceGlow.addColorStop(1, 'rgba(18, 8, 4, 0.28)');
  ctx.fillStyle = faceGlow;
  ctx.fillRect(0, 0, width, height);

  // Subtle hairline temple feathering & natural scalp fade
  const hairlineGrad = ctx.createLinearGradient(0, 62, 0, 146);
  hairlineGrad.addColorStop(0, hairCss);
  hairlineGrad.addColorStop(0.58, hairCss);
  hairlineGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = hairlineGrad;
  ctx.beginPath();
  ctx.moveTo(118, 60);
  ctx.lineTo(394, 60);
  ctx.lineTo(380, 144);
  ctx.quadraticCurveTo(256, 114, 132, 144);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Forehead & cheekbone specular lift for sculpted athletic look
  const foreheadHighlight = ctx.createRadialGradient(256, 168, 4, 256, 174, 58);
  foreheadHighlight.addColorStop(0, 'rgba(255, 246, 235, 0.22)');
  foreheadHighlight.addColorStop(1, 'rgba(255, 246, 235, 0)');
  ctx.fillStyle = foreheadHighlight;
  ctx.beginPath();
  ctx.ellipse(256, 174, 58, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cheekbone warm tone + sculpted hollow contour below cheekbones
  ctx.fillStyle = 'rgba(218, 96, 78, 0.16)';
  ctx.beginPath();
  ctx.ellipse(192, 270, 26, 14, -0.18, 0, Math.PI * 2);
  ctx.ellipse(320, 270, 26, 14, 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(54, 24, 12, 0.14)';
  ctx.beginPath();
  ctx.ellipse(180, 294, 22, 10, -0.35, 0, Math.PI * 2);
  ctx.ellipse(332, 294, 22, 10, 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Brow ridge & eye socket depth
  [214, 298].forEach((ex) => {
    const socket = ctx.createRadialGradient(ex, 226, 4, ex, 226, 32);
    socket.addColorStop(0, 'rgba(48, 22, 11, 0.26)');
    socket.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = socket;
    ctx.beginPath();
    ctx.arc(ex, 226, 32, 0, Math.PI * 2);
    ctx.fill();
  });

  // Sculpted sharp athletic eyebrows with tapered outer tail
  ctx.strokeStyle = hairCss;
  ctx.lineWidth = 8.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(186, 204);
  ctx.quadraticCurveTo(212, 190, 238, 200);
  ctx.moveTo(274, 200);
  ctx.quadraticCurveTo(300, 190, 326, 204);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(15, 10, 8, 0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(190, 205);
  ctx.quadraticCurveTo(212, 194, 237, 202);
  ctx.moveTo(275, 202);
  ctx.quadraticCurveTo(300, 194, 322, 205);
  ctx.stroke();

  // Detailed expressive athletic eyes (almond sclera, limbal ring, amber-hazel iris, pupil, dual catchlights)
  [214, 298].forEach((ex, idx) => {
    const isLeft = idx === 0;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ex - 17, 231);
    ctx.quadraticCurveTo(ex, 219, ex + 17, 231);
    ctx.quadraticCurveTo(ex, 241, ex - 17, 231);
    ctx.closePath();
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.clip();

    // Limbal ring
    ctx.fillStyle = '#1f1713';
    ctx.beginPath();
    ctx.arc(ex, 231, 9.2, 0, Math.PI * 2);
    ctx.fill();

    // Warm detailed iris gradient
    const irisGrad = ctx.createRadialGradient(ex, 232, 2, ex, 231, 8.2);
    irisGrad.addColorStop(0, '#8c5d38');
    irisGrad.addColorStop(0.62, '#4a2e1c');
    irisGrad.addColorStop(1, '#23160f');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(ex, 231, 8.0, 0, Math.PI * 2);
    ctx.fill();

    // Crisp pupil
    ctx.fillStyle = '#0f0b09';
    ctx.beginPath();
    ctx.arc(ex, 231, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dual crisp specular catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 2.6, 228.8, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.arc(ex + 2.8, 233.5, 1.15, 0, Math.PI * 2);
    ctx.fill();

    // Sharp upper lash line & defined eyelid crease
    ctx.strokeStyle = 'rgba(16, 10, 8, 0.88)';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(ex - 17.5, 231);
    ctx.quadraticCurveTo(ex + (isLeft ? 1 : -1), 219, ex + 17.5, 231);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(70, 36, 20, 0.38)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(ex, 222, 16, 6.5, 0, Math.PI + 0.2, Math.PI * 2 - 0.2);
    ctx.stroke();
  });

  // Sculpted nose bridge highlight + shadow & subtle nostrils
  ctx.strokeStyle = 'rgba(255, 240, 226, 0.24)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(256, 228);
  ctx.lineTo(256, 268);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(85, 42, 24, 0.30)';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(252, 232);
  ctx.lineTo(249, 271);
  ctx.quadraticCurveTo(256, 281, 265, 272);
  ctx.stroke();

  ctx.fillStyle = 'rgba(65, 28, 16, 0.28)';
  ctx.beginPath();
  ctx.ellipse(247, 277, 4.2, 2.4, -0.2, 0, Math.PI * 2);
  ctx.ellipse(265, 277, 4.2, 2.4, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Philtrum & natural lip crease
  ctx.strokeStyle = 'rgba(80, 36, 20, 0.22)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(252, 290);
  ctx.lineTo(253, 309);
  ctx.moveTo(260, 290);
  ctx.lineTo(259, 309);
  ctx.stroke();

  // Beard & sculpted masculine jawline contour
  if (hasBeard) {
    ctx.fillStyle = hairCss;
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.moveTo(182, 286);
    ctx.quadraticCurveTo(256, 390, 330, 286);
    ctx.lineTo(334, 366);
    ctx.quadraticCurveTo(256, 442, 178, 366);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Groomed mustache contour
    ctx.fillStyle = hairCss;
    ctx.globalAlpha = 0.58;
    ctx.beginPath();
    ctx.moveTo(222, 305);
    ctx.quadraticCurveTo(256, 293, 290, 305);
    ctx.quadraticCurveTo(256, 312, 222, 305);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // Clean sculpted athletic jawline shadow
    ctx.fillStyle = 'rgba(35, 18, 10, 0.16)';
    ctx.beginPath();
    ctx.moveTo(184, 302);
    ctx.quadraticCurveTo(256, 410, 328, 302);
    ctx.lineTo(320, 366);
    ctx.quadraticCurveTo(256, 430, 192, 366);
    ctx.closePath();
    ctx.fill();
  }

  // Natural athletic mouth (defined Cupid's bow upper lip & soft lower lip)
  ctx.fillStyle = 'rgba(136, 54, 48, 0.65)';
  ctx.beginPath();
  ctx.moveTo(229, 320);
  ctx.quadraticCurveTo(243, 313, 256, 317);
  ctx.quadraticCurveTo(269, 313, 283, 320);
  ctx.quadraticCurveTo(256, 325, 229, 320);
  ctx.fill();

  ctx.fillStyle = 'rgba(188, 96, 86, 0.52)';
  ctx.beginPath();
  ctx.moveTo(234, 323);
  ctx.quadraticCurveTo(256, 337, 278, 323);
  ctx.quadraticCurveTo(256, 327, 234, 323);
  ctx.fill();

  // Subtle chin highlight
  ctx.fillStyle = 'rgba(255, 240, 225, 0.16)';
  ctx.beginPath();
  ctx.ellipse(256, 352, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createGoalSparkTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    2,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.32, 'rgba(253, 224, 71, 0.92)');
  grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.35)');
  grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createAuraRingTexture(colorHex: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const c = new THREE.Color(colorHex);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.16,
    size / 2,
    size / 2,
    size * 0.5,
  );
  grad.addColorStop(0, `rgba(${r},${g},${b}, 0)`);
  grad.addColorStop(0.55, `rgba(${r},${g},${b}, 0.25)`);
  grad.addColorStop(0.82, `rgba(${r},${g},${b}, 0.85)`);
  grad.addColorStop(1, `rgba(${r},${g},${b}, 0)`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createStadiumJumbotronTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const width = 1024;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#071022');
  bg.addColorStop(0.5, '#0f2744');
  bg.addColorStop(1, '#071022');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Neon emerald & gold framing bars
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, 0, width, 12);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(0, height - 12, width, 12);

  // Subtle scanlines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let y = 16; y < height - 16; y += 8) {
    ctx.fillRect(0, y, width, 3);
  }

  ctx.fillStyle = '#34d399';
  ctx.font = '800 32px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHAMPIONS NIGHT STADIUM · LIVE 3D', width / 2, 68);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 76px "Barlow Condensed", sans-serif';
  ctx.fillText('NEL FOOTBALL · FC ARENA', width / 2, 146);

  ctx.fillStyle = '#fbbf24';
  ctx.font = '700 24px "Barlow Condensed", sans-serif';
  ctx.fillText('★ SIÊU SAO HỘI TỤ · ĐỈNH CAO BÓNG ĐÁ ★', width / 2, 212);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createSkyDomeTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#040914');
  grad.addColorStop(0.45, '#0b1830');
  grad.addColorStop(0.72, '#162c4d');
  grad.addColorStop(0.86, '#1f3b5e');
  grad.addColorStop(1, '#0b1528');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Crisp stars in upper hemisphere
  for (let i = 0; i < 210; i++) {
    const sx = (i * 97 + 23) % width;
    const sy = (i * 53 + 11) % Math.round(height * 0.62);
    const radius = i % 7 === 0 ? 1.5 : 0.85;
    ctx.fillStyle =
      i % 5 === 0 ? 'rgba(186, 230, 253, 0.85)' : 'rgba(248, 250, 252, 0.65)';
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createWinterSkyDomeTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#27527d');
  grad.addColorStop(0.42, '#4a7eb0');
  grad.addColorStop(0.72, '#78aad6');
  grad.addColorStop(0.88, '#b8d7f0');
  grad.addColorStop(1, '#5882a8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSpeedAuraTexture(
  primaryHex: string,
  secondaryHex: string,
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const pCol = new THREE.Color(primaryHex);
  const sCol = new THREE.Color(secondaryHex);
  const pr = Math.round(pCol.r * 255);
  const pg = Math.round(pCol.g * 255);
  const pb = Math.round(pCol.b * 255);
  const sr = Math.round(sCol.r * 255);
  const sg = Math.round(sCol.g * 255);
  const sb = Math.round(sCol.b * 255);

  ctx.clearRect(0, 0, size, size);

  // Outer energy ring + inner radial core
  const rad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.14,
    size / 2,
    size / 2,
    size * 0.49,
  );
  rad.addColorStop(0, `rgba(${sr}, ${sg}, ${sb}, 0.0)`);
  rad.addColorStop(0.45, `rgba(${pr}, ${pg}, ${pb}, 0.34)`);
  rad.addColorStop(0.74, `rgba(${sr}, ${sg}, ${sb}, 0.96)`);
  rad.addColorStop(0.9, `rgba(${pr}, ${pg}, ${pb}, 0.48)`);
  rad.addColorStop(1, `rgba(${pr}, ${pg}, ${pb}, 0.0)`);
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);

  // Swept directional speed arcs + starburst runes around perimeter
  for (let i = 0; i < 12; i++) {
    const startA = (i / 12) * Math.PI * 2;
    ctx.strokeStyle =
      i % 2 === 0
        ? `rgba(${sr}, ${sg}, ${sb}, 0.88)`
        : `rgba(${pr}, ${pg}, ${pb}, 0.72)`;
    ctx.lineWidth = i % 2 === 0 ? 5 : 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * (0.31 + (i % 3) * 0.06), startA, startA + 0.34);
    ctx.stroke();

    // Orbit spark dot
    const sparkX = size / 2 + Math.cos(startA + 0.17) * size * 0.43;
    const sparkY = size / 2 + Math.sin(startA + 0.17) * size * 0.43;
    ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, 0.92)`;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, i % 2 === 0 ? 3.5 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

