/**
 * Canvas-based image matting, edge anti-aliasing, and background removal utilities
 */

// Perceptual color difference helper (Weighted Redmean formula)
export function colorDiff(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const rmean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(
    (((512 + rmean) * dr * dr) >> 8) +
      4 * dg * dg +
      (((767 - rmean) * db * db) >> 8)
  );
}

/**
 * Automatically remove background by flood-filling from outer borders with
 * intelligent multi-point clustering, smooth edge feathering and de-fringing
 */
export function removeBorderBackground(
  canvas: HTMLCanvasElement,
  tolerance: number = 28
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Comprehensive perimeter color sampling (top, bottom, left, right borders)
  const samples: [number, number, number][] = [];
  const stepX = Math.max(1, Math.floor(w / 36));
  const stepY = Math.max(1, Math.floor(h / 36));

  for (let x = 0; x < w; x += stepX) {
    const tIdx = x * 4;
    const bIdx = ((h - 1) * w + x) * 4;
    if (data[tIdx + 3] > 20) samples.push([data[tIdx], data[tIdx + 1], data[tIdx + 2]]);
    if (data[bIdx + 3] > 20) samples.push([data[bIdx], data[bIdx + 1], data[bIdx + 2]]);
  }
  for (let y = 0; y < h; y += stepY) {
    const lIdx = (y * w) * 4;
    const rIdx = (y * w + (w - 1)) * 4;
    if (data[lIdx + 3] > 20) samples.push([data[lIdx], data[lIdx + 1], data[lIdx + 2]]);
    if (data[rIdx + 3] > 20) samples.push([data[rIdx], data[rIdx + 1], data[rIdx + 2]]);
  }

  if (samples.length === 0) samples.push([255, 255, 255]);

  // Cluster samples to identify the dominant background color group
  const clusters: { center: [number, number, number]; count: number; members: [number, number, number][] }[] = [];
  const clusterDist = Math.max(18, tolerance * 1.1);

  for (const s of samples) {
    let matched = false;
    for (const c of clusters) {
      if (colorDiff(s[0], s[1], s[2], c.center[0], c.center[1], c.center[2]) < clusterDist) {
        c.members.push(s);
        c.count++;
        c.center[0] = Math.round(c.members.reduce((acc, m) => acc + m[0], 0) / c.count);
        c.center[1] = Math.round(c.members.reduce((acc, m) => acc + m[1], 0) / c.count);
        c.center[2] = Math.round(c.members.reduce((acc, m) => acc + m[2], 0) / c.count);
        matched = true;
        break;
      }
    }
    if (!matched) {
      clusters.push({ center: [s[0], s[1], s[2]], count: 1, members: [s] });
    }
  }

  clusters.sort((a, b) => b.count - a.count);
  const bgClusters = clusters.filter((c) => c.count >= Math.max(2, samples.length * 0.1));
  if (bgClusters.length === 0 && clusters.length > 0) {
    bgClusters.push(clusters[0]);
  }

  const bgColors: [number, number, number][] = bgClusters.map((c) => c.center);

  const visited = new Uint8Array(w * h);
  const queue: number[] = [];

  const checkBgMatch = (r: number, g: number, b: number): { isMatch: boolean; softFactor: number } => {
    // 自动清除纯白背景、浅灰色阴影以及外围淡灰色水印 (如 R>188 且低饱和度)
    const isNeutralLight = (r > 185 && g > 185 && b > 185 && Math.abs(r - g) < 24 && Math.abs(g - b) < 24 && Math.abs(r - b) < 24);
    if (isNeutralLight) {
      return { isMatch: true, softFactor: 0 };
    }

    let minD = 9999;
    for (const [br, bg, bb] of bgColors) {
      const d = colorDiff(r, g, b, br, bg, bb);
      if (d < minD) minD = d;
    }

    const hardThreshold = tolerance * 2.2;
    const softThreshold = tolerance * 2.8;

    if (minD <= hardThreshold) {
      return { isMatch: true, softFactor: 0 };
    }
    if (minD <= softThreshold) {
      const ratio = (minD - hardThreshold) / (softThreshold - hardThreshold);
      return { isMatch: true, softFactor: Math.pow(ratio, 1.2) };
    }

    return { isMatch: false, softFactor: 1.0 };
  };

  for (let x = 0; x < w; x++) {
    queue.push(x, 0);
    queue.push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    queue.push(0, y);
    queue.push(w - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const pIdx = y * w + x;

    if (visited[pIdx]) continue;
    visited[pIdx] = 1;

    const dIdx = pIdx * 4;
    const a = data[dIdx + 3];
    if (a === 0) continue;

    const r = data[dIdx];
    const g = data[dIdx + 1];
    const b = data[dIdx + 2];

    const { isMatch, softFactor } = checkBgMatch(r, g, b);

    if (isMatch) {
      if (softFactor === 0) {
        data[dIdx + 3] = 0;
      } else {
        data[dIdx + 3] = Math.round(data[dIdx + 3] * softFactor);
      }

      if (x > 0 && !visited[pIdx - 1]) queue.push(x - 1, y);
      if (x < w - 1 && !visited[pIdx + 1]) queue.push(x + 1, y);
      if (y > 0 && !visited[pIdx - w]) queue.push(x, y - 1);
      if (y < h - 1 && !visited[pIdx + w]) queue.push(x, y + 1);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  smoothEdgeAntiAliasing(canvas);
}

/**
 * Remove all pixels matching white or light background across the entire image
 */
export function removeWhiteBackground(
  canvas: HTMLCanvasElement,
  threshold: number = 245
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  smoothEdgeAntiAliasing(canvas);
}

/**
 * Magic wand flood fill starting from clicked (x, y) with smooth feathering
 */
export function magicWandAt(
  canvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  tolerance: number = 25
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const targetIdx = (startY * w + startX) * 4;
  const tr = data[targetIdx];
  const tg = data[targetIdx + 1];
  const tb = data[targetIdx + 2];
  const ta = data[targetIdx + 3];

  if (ta === 0) return;

  const visited = new Uint8Array(w * h);
  const queue: number[] = [startX, startY];

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const pIdx = y * w + x;

    if (visited[pIdx]) continue;
    visited[pIdx] = 1;

    const dIdx = pIdx * 4;
    const a = data[dIdx + 3];
    if (a === 0) continue;

    const r = data[dIdx];
    const g = data[dIdx + 1];
    const b = data[dIdx + 2];

    const diff = colorDiff(r, g, b, tr, tg, tb);
    if (diff <= tolerance * 2.4) {
      data[dIdx + 3] = 0;

      if (x > 0 && !visited[pIdx - 1]) queue.push(x - 1, y);
      if (x < w - 1 && !visited[pIdx + 1]) queue.push(x + 1, y);
      if (y > 0 && !visited[pIdx - w]) queue.push(x, y - 1);
      if (y < h - 1 && !visited[pIdx + w]) queue.push(x, y + 1);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  smoothEdgeAntiAliasing(canvas);
}

/**
 * Eraser or restore brush applied in a circle
 */
export function applyBrush(
  canvas: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  radius: number,
  mode: 'erase' | 'restore',
  originalData?: ImageData
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const orig = originalData ? originalData.data : null;

  const rSq = radius * radius;
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(w - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(h - 1, Math.ceil(centerY + radius));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const distSq = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
      if (distSq <= rSq) {
        const idx = (y * w + x) * 4;
        if (mode === 'erase') {
          data[idx + 3] = 0;
        } else if (mode === 'restore' && orig) {
          data[idx] = orig[idx];
          data[idx + 1] = orig[idx + 1];
          data[idx + 2] = orig[idx + 2];
          data[idx + 3] = orig[idx + 3];
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Apply High-Fidelity Edge Anti-Aliasing and De-fringing to the Cutout Canvas
 * Smooths jagged stair-step pixels and removes halo artifacts around borders
 */
export function smoothEdgeAntiAliasing(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const copy = new Uint8ClampedArray(data);

  const kernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1],
  ];
  const kernelSum = 16;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;

      let hasTransparentNeighbor = false;
      let hasOpaqueNeighbor = false;
      let sumR = 0, sumG = 0, sumB = 0, opaqueCount = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nIdx = ((y + dy) * w + (x + dx)) * 4;
          const nAlpha = copy[nIdx + 3];
          if (nAlpha === 0) hasTransparentNeighbor = true;
          if (nAlpha > 180) {
            hasOpaqueNeighbor = true;
            sumR += copy[nIdx];
            sumG += copy[nIdx + 1];
            sumB += copy[nIdx + 2];
            opaqueCount++;
          }
        }
      }

      if (hasTransparentNeighbor && hasOpaqueNeighbor) {
        let weightedAlpha = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * w + (x + dx)) * 4;
            weightedAlpha += copy[nIdx + 3] * kernel[dy + 1][dx + 1];
          }
        }
        const smoothedA = Math.round(weightedAlpha / kernelSum);
        data[idx + 3] = smoothedA;

        // De-fringe: bleed pure character color into edge pixel to remove halo
        if (opaqueCount > 0) {
          data[idx] = Math.round(sumR / opaqueCount);
          data[idx + 1] = Math.round(sumG / opaqueCount);
          data[idx + 2] = Math.round(sumB / opaqueCount);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Trim transparent margins to wrap tightly around the character
 */
export function trimTransparent(canvas: HTMLCanvasElement, padding = 12): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w, minY = h, maxX = 0, maxY = 0;
  let hasPixel = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 15) {
        hasPixel = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixel) return canvas;

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(w - 1, maxX + padding);
  maxY = Math.min(h - 1, maxY + padding);

  const trimW = maxX - minX + 1;
  const trimH = maxY - minY + 1;

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimW;
  trimmedCanvas.height = trimH;
  const tCtx = trimmedCanvas.getContext('2d')!;
  tCtx.imageSmoothingEnabled = true;
  tCtx.imageSmoothingQuality = 'high';
  tCtx.drawImage(canvas, minX, minY, trimW, trimH, 0, 0, trimW, trimH);

  return trimmedCanvas;
}
/**
 * Inpaint / infill a cleared cutout hole with surrounding edge colors
 * Bleeds surrounding hair / skin colors inward so moving/tilting ears never exposes background
 */
export function inpaintCutoutHole(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  padding = 10
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const minX = Math.max(0, Math.floor(x - padding));
  const minY = Math.max(0, Math.floor(y - padding));
  const maxX = Math.min(canvas.width, Math.ceil(x + w + padding));
  const maxY = Math.min(canvas.height, Math.ceil(y + h + padding));
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  if (boxW <= 0 || boxH <= 0) return;

  const imgData = ctx.getImageData(minX, minY, boxW, boxH);
  const data = imgData.data;

  // 14 passes of inward color dilation
  const passes = 14;
  for (let pass = 0; pass < passes; pass++) {
    const fills: { idx: number; r: number; g: number; b: number }[] = [];

    for (let py = 1; py < boxH - 1; py++) {
      for (let px = 1; px < boxW - 1; px++) {
        const idx = (py * boxW + px) * 4;
        if (data[idx + 3] === 0) {
          let sumR = 0, sumG = 0, sumB = 0, count = 0;
          const neighbors = [-boxW - 1, -boxW, -boxW + 1, -1, 1, boxW - 1, boxW, boxW + 1];

          for (const n of neighbors) {
            const nIdx = idx + n * 4;
            if (data[nIdx + 3] > 180) {
              sumR += data[nIdx];
              sumG += data[nIdx + 1];
              sumB += data[nIdx + 2];
              count++;
            }
          }

          if (count > 0) {
            fills.push({
              idx,
              r: Math.round(sumR / count),
              g: Math.round(sumG / count),
              b: Math.round(sumB / count),
            });
          }
        }
      }
    }

    if (fills.length === 0) break;

    for (const f of fills) {
      data[f.idx] = f.r;
      data[f.idx + 1] = f.g;
      data[f.idx + 2] = f.b;
      data[f.idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, minX, minY);
}