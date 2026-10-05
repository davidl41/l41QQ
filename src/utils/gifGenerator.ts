import { GIFEncoder, quantize, applyPalette, nearestColorIndex } from 'gifenc';
import JSZip from 'jszip';
import {
  BounceConfig,
  BounceMotion,
  AccessoryConfig,
  BounceTransform,
  LocalBounceConfig,
  BounceDirection,
  BouncePart,
} from '../types/gif';
import { drawGroundShadowAndRipple, drawComicAccessory } from './accessoriesRenderer';
import { inpaintCutoutHole } from './cutout';

// Cache for decoded part images so animation frames render synchronously without blinking
const partImageCache = new Map<string, HTMLImageElement>();

export function getCachedPartImage(part: BouncePart): HTMLImageElement | null {
  if (!part.imageDataUrl) return null;
  const key = `${part.id}_${part.imageDataUrl.length}`;
  let img = partImageCache.get(key);
  if (!img) {
    img = new Image();
    img.src = part.imageDataUrl;
    partImageCache.set(key, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export async function preloadPartImages(parts: BouncePart[]): Promise<void> {
  await Promise.all(
    parts.map((p) => {
      return new Promise<void>((resolve) => {
        if (!p.imageDataUrl) return resolve();
        const key = `${p.id}_${p.imageDataUrl.length}`;
        const existing = partImageCache.get(key);
        if (existing && existing.complete && existing.naturalWidth > 0) return resolve();
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = p.imageDataUrl;
        partImageCache.set(key, img);
      });
    })
  );
}

export interface GeneratedExportResult {
  blob: Blob;
  url: string;
  sizeBytes: number;
  width: number;
  height: number;
  frameCount: number;
  format: 'gif' | 'wechat-gif' | 'webp' | 'spritesheet' | 'zip-frames';
  fileName: string;
}

export type { BounceTransform };

/**
 * Evaluates custom Easing Function slider (0: 匀速 -> 35: 正弦 -> 70: 回弹过冲 -> 100: 弹跳)
 */
export function evaluateEasingPhase(phase: number, easingValue: number = 35): number {
  const p = Math.max(0, Math.min(1, phase));
  if (easingValue <= 4) return p;

  const sine = 0.5 - 0.5 * Math.cos(Math.PI * p);

  const c1 = 1.70158;
  const c3 = c1 + 1;
  const back = 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);

  let bounce = 0;
  const n1 = 7.5625;
  const d1 = 2.75;
  if (p < 1 / d1) {
    bounce = n1 * p * p;
  } else if (p < 2 / d1) {
    const t = p - 1.5 / d1;
    bounce = n1 * t * t + 0.75;
  } else if (p < 2.5 / d1) {
    const t = p - 2.25 / d1;
    bounce = n1 * t * t + 0.9375;
  } else {
    const t = p - 2.625 / d1;
    bounce = n1 * t * t + 0.984375;
  }

  if (easingValue <= 35) {
    const t = easingValue / 35;
    return (1 - t) * p + t * sine;
  } else if (easingValue <= 70) {
    const t = (easingValue - 35) / 35;
    return (1 - t) * sine + t * back;
  } else {
    const t = (easingValue - 70) / 30;
    return (1 - t) * back + t * bounce;
  }
}

/**
 * Computes transformation matrix values for any motion style, amplitude, phase, and easing
 */
function computeRawTransform(
  motion: BounceMotion,
  amplitude: number,
  phase: number,
  easing: number = 35
): BounceTransform {
  const amp = amplitude;

  switch (motion) {
    case 'spring-sway': {
      const eased = evaluateEasingPhase(phase, easing);
      const cycles = 3.5;
      const angle = 2 * Math.PI * cycles * eased;

      const decay = Math.exp(-2.6 * eased);
      const currentSway = Math.sin(angle) * decay;

      const topDisplacement = amp * 125 * currentSway;
      const topCompressY = Math.abs(currentSway) * amp * 20;

      return {
        scaleX: 1,
        scaleY: 1,
        translateX: 0,
        translateY: 0,
        rotation: 0,
        skewX: 0,
        skewY: 0,
        anchorX: 0.5,
        anchorY: 0.95,
        isBending: true,
        topDisplacement,
        topCompressY,
      };
    }

    case 'viral-doll': {
      // 🧸 音乐互动娃娃原版物理算法 (来自 Wallpaper Engine 原版 physics.js: deformationCycle)
      const smooth = (t: number) => t * t * (3 - 2 * t);
      let pulse = 0;
      if (phase < 0.44) {
        pulse = 1;
      } else if (phase < 0.60) {
        pulse = 1 - 2 * smooth((phase - 0.44) / 0.16);
      } else if (phase < 0.88) {
        pulse = -1;
      } else {
        pulse = -1 + smooth(Math.max(0, Math.min(1, (phase - 0.88) / 0.12)));
      }

      const strength = amp * 0.92;
      const stretch = amp * 0.92;
      const squash = pulse >= 0 ? pulse * strength : pulse * stretch;

      const scaleX = 1 + squash;
      const scaleY = 1 - squash;

      return {
        scaleX,
        scaleY,
        translateX: 0,
        translateY: 0,
        rotation: 0,
        skewX: 0,
        skewY: 0,
        anchorX: 0.5,
        anchorY: 0.95,
      };
    }

    case 'jelly-duang': {
      const eased = evaluateEasingPhase(phase, easing);
      let scaleX = 1;
      let scaleY = 1;
      let translateY = 0;

      if (eased < 0.25) {
        // Stage 1: 蓄力深蹲蓄势 (0% ~ 25%)
        const t = eased / 0.25;
        const squat = Math.sin(Math.PI * t * 0.5);
        scaleY = 1 - amp * 1.4 * squat;
        scaleX = 1 + amp * 1.5 * squat;
        translateY = 0;
      } else if (eased < 0.52) {
        // Stage 2: 瞬间爆发回弹拉伸滞空 (25% ~ 52%)
        const t = (eased - 0.25) / 0.27;
        const launch = Math.sin(Math.PI * t);
        scaleY = 1 + amp * 1.35 * launch;
        scaleX = 1 - amp * 0.7 * launch;
        translateY = -amp * 38 * Math.sin(Math.PI * t);
      } else if (eased < 0.76) {
        // Stage 3: 重力下坠触地二次Duang形变 (52% ~ 76%)
        const t = (eased - 0.52) / 0.24;
        const impact = Math.sin(Math.PI * t);
        scaleY = 1 - amp * 0.7 * impact;
        scaleX = 1 + amp * 0.8 * impact;
        translateY = 0;
      } else {
        // Stage 4: 阻尼微颤逐渐平息 (76% ~ 100%)
        const t = (eased - 0.76) / 0.24;
        const decay = Math.exp(-3.5 * t);
        const ripple = Math.sin(4 * Math.PI * t) * decay;
        scaleY = 1 + amp * 0.35 * ripple;
        scaleX = 1 - amp * 0.35 * ripple;
        translateY = 0;
      }

      return {
        scaleX,
        scaleY,
        translateX: 0,
        translateY,
        rotation: 0,
        skewX: 0,
        skewY: 0,
        anchorX: 0.5,
        anchorY: 0.95,
      };
    }

    case 'belly-breathe': {
      const eased = evaluateEasingPhase(phase, easing);
      const theta = 2 * Math.PI * eased;
      const wave = Math.sin(theta) + 0.25 * Math.sin(2 * theta);
      const scaleX = 1 + amp * 1.45 * wave;
      const scaleY = 1 + amp * 0.95 * Math.sin(theta);
      return {
        scaleX,
        scaleY,
        translateX: 0,
        translateY: 0,
        rotation: 0,
        skewX: 0,
        skewY: 0,
        anchorX: 0.5,
        anchorY: 0.5,
      };
    }

    case 'jelly-jiggle': {
      const eased = evaluateEasingPhase(phase, easing);
      const freq = 6 * Math.PI * eased;
      const jiggle = Math.sin(freq);
      const scaleX = 1 + amp * 0.9 * jiggle;
      const scaleY = 1 - amp * 0.9 * jiggle;
      const skewX = amp * 0.14 * Math.cos(freq);
      const translateY = -amp * 10 * Math.abs(jiggle);
      return {
        scaleX,
        scaleY,
        translateX: 0,
        translateY: 0,
        rotation: 0,
        skewX,
        skewY: 0,
        anchorX: 0.5,
        anchorY: 0.88,
      };
    }

    case 'trampoline-hop': {
      const eased = evaluateEasingPhase(phase, easing);
      let scaleX = 1;
      let scaleY = 1;
      let translateY = 0;

      if (eased < 0.28) {
        const t = eased / 0.28;
        const squat = Math.sin(Math.PI * t);
        scaleY = 1 - amp * 1.7 * squat;
        scaleX = 1 + amp * 1.7 * squat;
        translateY = 0;
      } else if (eased < 0.64) {
        const t = (eased - 0.28) / 0.36;
        const arc = Math.sin(Math.PI * t);
        translateY = -55 * amp * arc;
        const stretch = Math.max(0, 1 - 2.2 * t);
        scaleY = 1 + amp * 1.6 * stretch;
        scaleX = 1 - amp * 0.7 * stretch;
      } else {
        const t = (eased - 0.64) / 0.36;
        const decay = Math.exp(-3.5 * t);
        const bounce = decay * Math.sin(2.5 * Math.PI * t);
        scaleY = 1 - amp * 1.7 * bounce;
        scaleX = 1 + amp * 1.7 * bounce;
        translateY = 0;
      }

      return {
        scaleX,
        scaleY,
        translateX: 0,
        translateY,
        rotation: 0,
        skewX: 0,
        skewY: 0,
        anchorX: 0.5,
        anchorY: 0.95,
      };
    }

    case 'floating-bubble': {
      const eased = evaluateEasingPhase(phase, easing);
      const theta = 2 * Math.PI * eased;
      const translateY = -24 * amp * Math.cos(theta);
      const translateX = 14 * amp * Math.sin(theta);
      const rotation = amp * 0.18 * Math.sin(theta);
      const scaleX = 1 + amp * 0.5 * Math.sin(2 * theta);
      const scaleY = 1 - amp * 0.4 * Math.sin(2 * theta);
      return {
        scaleX,
        scaleY,
        translateX,
        translateY,
        rotation,
        skewX: 0,
        skewY: 0,
        anchorX: 0.5,
        anchorY: 0.5,
      };
    }

    case 'dough-knead': {
      const eased = evaluateEasingPhase(phase, easing);
      const theta = 2 * Math.PI * eased;
      const scaleX = 1 + amp * 1.15 * Math.cos(theta);
      const scaleY = 1 - amp * 1.0 * Math.cos(theta);
      const skewX = amp * 0.38 * Math.sin(theta);
      const skewY = -amp * 0.15 * Math.sin(theta);
      return {
        scaleX,
        scaleY,
        translateX: 0,
        translateY: 0,
        rotation: 0,
        skewX,
        skewY,
        anchorX: 0.5,
        anchorY: 0.6,
      };
    }

    case 'heartbeat-pulse': {
      const eased = evaluateEasingPhase(phase, easing);
      const b1 = Math.exp(-36 * Math.pow(eased - 0.2, 2));
      const b2 = Math.exp(-42 * Math.pow(eased - 0.44, 2));
      const beat = (b1 * 1.4 + b2 * 1.05) * amp;
      return {
        scaleX: 1 + beat * 1.25,
        scaleY: 1 + beat * 1.25,
        translateX: 0,
        translateY: -beat * 8,
        rotation: 0,
        skewX: 0,
        skewY: 0,
        anchorX: 0.5,
        anchorY: 0.5,
      };
    }

    default:
      return {
        scaleX: 1,
        scaleY: 1,
        translateX: 0,
        translateY: 0,
        rotation: 0,
        skewX: 0,
        skewY: 0,
        anchorX: 0.5,
        anchorY: 0.5,
      };
  }
}

export function getBounceTransform(
  motion: BounceMotion,
  amplitude: number,
  phase: number,
  easing: number = 35,
  volumeConservation: boolean = true
): BounceTransform {
  const result = computeRawTransform(motion, amplitude, phase, easing);

  // 🎈 真实物理体积守恒联动 (Disney Squash & Stretch Principle)
  if (volumeConservation && motion !== 'belly-breathe' && motion !== 'heartbeat-pulse') {
    if (result.scaleY < 0.98) {
      const squat = 1 - result.scaleY;
      result.scaleX = Math.max(result.scaleX, 1 + squat * 0.85);
    } else if (result.scaleY > 1.02) {
      const stretch = result.scaleY - 1;
      result.scaleX = Math.min(result.scaleX, Math.max(0.65, 1 - stretch * 0.65));
    }
  }

  return result;
}

// 2D Point & Voronoi Polygon Clipper for Multi-Anchor Local Bounce Zones
interface Point2D {
  x: number;
  y: number;
}

function clipPolygonByHalfPlane(poly: Point2D[], p1: Point2D, p2: Point2D): Point2D[] {
  const out: Point2D[] = [];
  if (poly.length === 0) return out;

  const isInside = (p: Point2D) => {
    return (p2.x - p1.x) * (p.y - p1.y) - (p2.y - p1.y) * (p.x - p1.x) >= 0;
  };

  const lineIntersection = (cp1: Point2D, cp2: Point2D): Point2D => {
    const a1 = p2.y - p1.y;
    const b1 = p1.x - p2.x;
    const c1 = a1 * p1.x + b1 * p1.y;
    const a2 = cp2.y - cp1.y;
    const b2 = cp1.x - cp2.x;
    const c2 = a2 * cp1.x + b2 * cp1.y;
    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-6) return cp1;
    return {
      x: (b2 * c1 - b1 * c2) / det,
      y: (a1 * c2 - a2 * c1) / det,
    };
  };

  let s = poly[poly.length - 1];
  for (let i = 0; i < poly.length; i++) {
    const e = poly[i];
    if (isInside(e)) {
      if (isInside(s)) {
        out.push(e);
      } else {
        out.push(lineIntersection(s, e));
        out.push(e);
      }
    } else if (isInside(s)) {
      out.push(lineIntersection(s, e));
    }
    s = e;
  }
  return out;
}

function computeVoronoiCell(
  targetAnchor: Point2D,
  allAnchors: Point2D[],
  w: number,
  h: number
): Point2D[] {
  let poly: Point2D[] = [
    { x: -100, y: -100 },
    { x: w + 100, y: -100 },
    { x: w + 100, y: h + 100 },
    { x: -100, y: h + 100 },
  ];

  for (const other of allAnchors) {
    if (other === targetAnchor) continue;
    const mx = (targetAnchor.x + other.x) / 2;
    const my = (targetAnchor.y + other.y) / 2;
    const dx = other.x - targetAnchor.x;
    const dy = other.y - targetAnchor.y;
    const p1 = { x: mx, y: my };
    const p2 = { x: mx - dy, y: my + dx };
    poly = clipPolygonByHalfPlane(poly, p1, p2);
  }
  return poly;
}

/**
 * Draws a single Q-bounce frame with High-Resolution Anti-Aliased Canvas Rendering,
 * Ground Shadow, Impact Ripple, Comic Accessories, and Multi-Part Local Bounce
 */
export function drawBounceFrame(
  targetCtx: CanvasRenderingContext2D,
  sourceImg: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  targetSize: number,
  transform: BounceTransform,
  bgType: string,
  groundShadow: boolean = false,
  impactRipple: boolean = false,
  accessory?: AccessoryConfig,
  phase: number = 0,
  localMaskCanvas?: HTMLCanvasElement | null,
  localBounceConfig?: LocalBounceConfig,
  bounceDirection: BounceDirection = 'vertical',
  bounceAngle: number = 0,
  jellyBulge: boolean = true,
  jellyGloss: boolean = false
): void {
  const w = targetSize;
  const h = targetSize;

  targetCtx.clearRect(0, 0, w, h);

  // 1. Background Fill
  if (bgType === 'white') {
    targetCtx.fillStyle = '#ffffff';
    targetCtx.fillRect(0, 0, w, h);
  } else if (bgType === 'pink') {
    targetCtx.fillStyle = '#fff1f2';
    targetCtx.fillRect(0, 0, w, h);
  } else if (bgType === 'dark') {
    targetCtx.fillStyle = '#18181b';
    targetCtx.fillRect(0, 0, w, h);
  }

  // Directional angle in radians
  let dirAngle = 0;
  if (bounceDirection === 'horizontal') {
    dirAngle = Math.PI / 2;
  } else if (bounceDirection === 'diagonal-right') {
    dirAngle = Math.PI / 4;
  } else if (bounceDirection === 'diagonal-left') {
    dirAngle = -Math.PI / 4;
  } else if (bounceDirection === 'custom') {
    dirAngle = ((bounceAngle || 0) * Math.PI) / 180;
  }

  // 2. Ground Shadow & Landing Impact Ripple
  if (groundShadow || impactRipple) {
    drawGroundShadowAndRipple(targetCtx, w, h, transform, groundShadow, impactRipple, phase);
  }

  const safeMargin = 1.45;
  const scaleRatio = Math.min(
    (w * 0.84) / (sourceW * safeMargin),
    (h * 0.84) / (sourceH * safeMargin)
  );

  const drawW = sourceW * scaleRatio;
  const drawH = sourceH * scaleRatio;

  const activeParts = (localBounceConfig?.enabled ? localBounceConfig?.parts : [])?.filter(
    (p) => p.visible !== false
  ) || [];
  const hasParts = activeParts.length > 0;
  const hasLocal = Boolean((localMaskCanvas || hasParts) && localBounceConfig && localBounceConfig.enabled);
  const onlyPartBounces = Boolean(hasLocal && localBounceConfig?.onlyPartBounces);

  // If local mask/parts are active, split image into:
  // 1. subtractedBodyCanvas (Body WITHOUT the painted/cutout parts)
  // 2. isolatedPartCanvas (ONLY the painted parts, for legacy fallback)
  let bodySourceToDraw: CanvasImageSource = sourceImg;
  let isolatedPartCanvas: HTMLCanvasElement | null = null;

  if (hasLocal) {
    if (hasParts) {
      // 1. Create hollowed-out body canvas for independent cutout parts
      const bodyC = document.createElement('canvas');
      bodyC.width = sourceW;
      bodyC.height = sourceH;
      const bCtx = bodyC.getContext('2d')!;
      bCtx.drawImage(sourceImg, 0, 0, sourceW, sourceH);
      bCtx.globalCompositeOperation = 'destination-out';
      for (const p of activeParts) {
        if (p.hollowOutBody !== false) {
          const pImg = getCachedPartImage(p);
          if (pImg) {
            bCtx.drawImage(pImg, p.sourceX, p.sourceY, p.sourceW, p.sourceH);
          } else {
            bCtx.clearRect(p.sourceX, p.sourceY, p.sourceW, p.sourceH);
          }

          // 🎨 智能自动补底：将挖空区域用周围邻近发丝/肤色平滑补全，防挪动或旋转耳朵时露出背景！
          if (p.autoInfill !== false && (p.type === 'cutout' || !p.type)) {
            inpaintCutoutHole(bodyC, p.sourceX, p.sourceY, p.sourceW, p.sourceH);
          }
        }
      }
      bCtx.globalCompositeOperation = 'source-over';
      bodySourceToDraw = bodyC;
    } else if (localMaskCanvas) {
      // 1. Legacy single mask hollowed-out body canvas
      const bodyC = document.createElement('canvas');
      bodyC.width = sourceW;
      bodyC.height = sourceH;
      const bCtx = bodyC.getContext('2d')!;
      bCtx.drawImage(sourceImg, 0, 0, sourceW, sourceH);
      bCtx.globalCompositeOperation = 'destination-out';
      bCtx.drawImage(localMaskCanvas, 0, 0, sourceW, sourceH);
      bCtx.globalCompositeOperation = 'source-over';
      bodySourceToDraw = bodyC;

      // 2. Create isolated part canvas
      const partC = document.createElement('canvas');
      partC.width = sourceW;
      partC.height = sourceH;
      const pCtx = partC.getContext('2d')!;
      pCtx.drawImage(sourceImg, 0, 0, sourceW, sourceH);
      pCtx.globalCompositeOperation = 'destination-in';
      pCtx.drawImage(localMaskCanvas, 0, 0, sourceW, sourceH);
      isolatedPartCanvas = partC;
    }
  }

  // Determine transform for the base body
  const bodyTransform: BounceTransform = onlyPartBounces
    ? {
        scaleX: 1,
        scaleY: 1,
        translateX: 0,
        translateY: 0,
        rotation: 0,
        skewX: 0,
        skewY: 0,
        anchorX: 0.5,
        anchorY: 0.95,
      }
    : transform;

  const anchorX = w * bodyTransform.anchorX;
  const anchorY = h * bodyTransform.anchorY;

  targetCtx.save();
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = 'high';

  // 3. Draw Hollowed Base Body (no duplicate overlay!)
  if (bodyTransform.isBending && bodyTransform.topDisplacement !== undefined) {
    targetCtx.translate(anchorX, anchorY);
    if (!onlyPartBounces && dirAngle !== 0) {
      targetCtx.rotate(dirAngle);
    }

    const imgOffsetX = -drawW * bodyTransform.anchorX;
    const imgOffsetY = -drawH * bodyTransform.anchorY;

    const slices = 84;
    const sliceH = drawH / slices;
    const srcSliceH = sourceH / slices;

    for (let s = 0; s < slices; s++) {
      const yRatio = s / slices;
      const bendFactor = Math.pow(1 - yRatio, 1.8);
      const sliceOffsetX = (bodyTransform.topDisplacement || 0) * bendFactor;
      const sliceOffsetY = (bodyTransform.topCompressY || 0) * Math.pow(1 - yRatio, 1.2);

      targetCtx.drawImage(
        bodySourceToDraw,
        0,
        s * srcSliceH,
        sourceW,
        srcSliceH,
        imgOffsetX + sliceOffsetX,
        imgOffsetY + s * sliceH + sliceOffsetY,
        drawW,
        sliceH + 0.8
      );
    }
  } else {
    targetCtx.translate(anchorX + bodyTransform.translateX, anchorY + bodyTransform.translateY);
    if (!onlyPartBounces && dirAngle !== 0) {
      targetCtx.rotate(dirAngle);
    }

    if (bodyTransform.rotation !== 0) {
      targetCtx.rotate(bodyTransform.rotation);
    }

    if (bodyTransform.skewX !== 0 || bodyTransform.skewY !== 0) {
      targetCtx.transform(1, bodyTransform.skewY || 0, bodyTransform.skewX || 0, 1, 0, 0);
    }

    const imgOffsetX = -drawW * bodyTransform.anchorX;
    const imgOffsetY = -drawH * bodyTransform.anchorY;

    // 🍮 非线性果冻弧形鼓胀渲染 (让果冻挤压时肚子向外饱满弧形膨胀，起跳时收紧)
    if (jellyBulge !== false && (Math.abs(bodyTransform.scaleX - 1) > 0.015 || Math.abs(bodyTransform.scaleY - 1) > 0.015)) {
      const slices = 56;
      const sliceH = drawH / slices;
      const srcSliceH = sourceH / slices;
      const bulgeFactor = bodyTransform.scaleX - 1;

      for (let s = 0; s < slices; s++) {
        const yRatio = s / slices;
        // Parabolic belly curve (0 at top and bottom, peak at belly yRatio=0.55)
        const bellyCurve = Math.sin(Math.PI * Math.pow(yRatio, 0.85));
        const sliceW = drawW * Math.max(0.4, 1 + bulgeFactor * bellyCurve * 1.4);
        const sliceX = -sliceW * bodyTransform.anchorX;
        const sliceY = -drawH * bodyTransform.anchorY * bodyTransform.scaleY + s * sliceH * bodyTransform.scaleY;

        targetCtx.drawImage(
          bodySourceToDraw,
          0,
          s * srcSliceH,
          sourceW,
          srcSliceH,
          sliceX,
          sliceY,
          sliceW,
          sliceH * bodyTransform.scaleY + 0.6
        );
      }
    } else {
      targetCtx.scale(bodyTransform.scaleX, bodyTransform.scaleY);
      if (!onlyPartBounces && dirAngle !== 0) {
        targetCtx.rotate(-dirAngle);
      }
      targetCtx.drawImage(bodySourceToDraw, imgOffsetX, imgOffsetY, drawW, drawH);
    }

    // ✨ 水润果冻弧形高光反光层 (日系动漫布丁高光质感)
    if (jellyGloss) {
      const glossX = imgOffsetX + drawW * 0.28;
      const glossY = imgOffsetY + drawH * 0.22;
      const glossW = drawW * 0.22 * Math.max(0.6, bodyTransform.scaleX);
      const glossH = drawH * 0.09 * Math.max(0.6, bodyTransform.scaleY);

      targetCtx.save();
      targetCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      targetCtx.beginPath();
      targetCtx.ellipse(glossX, glossY, glossW, glossH, -Math.PI / 6, 0, Math.PI * 2);
      targetCtx.fill();

      targetCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      targetCtx.beginPath();
      targetCtx.arc(glossX - glossW * 0.35, glossY - glossH * 0.15, 3.5, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.restore();
    }
  }

  targetCtx.restore();

  // 3.5. Draw Isolated Local Bounce Parts (1:1 固定点与专属部位绑定，绝不抢点，支持旋转、挪动与复制)
  if (hasLocal && localBounceConfig) {
    const globalAmp = localBounceConfig.amplitude ?? 0.6;
    const globalSpeed = localBounceConfig.speedMult ?? 1.5;
    const basePhaseLag = localBounceConfig.phaseDelay ?? 0.15;

    if (hasParts) {
      // 拥有 1:1 独立回弹部位！一个点严格对应一个部分，彻底杜绝强点/抢点现象
      activeParts.forEach((part, idx) => {
        const pImg = getCachedPartImage(part);
        if (!pImg) return;

        const pinRatioX = part.anchorX;
        const pinRatioY = part.anchorY;
        const motionType = part.motion || localBounceConfig.motion || 'spring';
        const pAmp = globalAmp * (part.amplitudeMult ?? 1.0);
        const pSpeed = globalSpeed * (part.speedMult ?? 1.0);
        const pDelay = part.phaseDelay ?? (basePhaseLag + idx * 0.12);
        const pEasing = part.easing ?? 35;

        // 独立相位与物理重力缓动阻尼手感
        const rawPhase = (phase - pDelay + 1) % 1;
        const partPhase = evaluateEasingPhase(rawPhase, pEasing);

        let jiggleScaleX = 1;
        let jiggleScaleY = 1;
        let jiggleRot = 0;

        if (motionType === 'spring') {
          // 1. 🌀 弹簧超弹回弹 (高频阻尼弹簧，发尖左右疯狂甩动)
          const springCycle = (partPhase * pSpeed * 2.2) % 1;
          const decay = Math.exp(-2.8 * springCycle);
          const springOsc = Math.sin(2 * Math.PI * springCycle * 3.5) * decay;
          jiggleRot = pAmp * 0.52 * springOsc;
          jiggleScaleX = 1 + pAmp * 0.35 * springOsc;
          jiggleScaleY = 1 - pAmp * 0.28 * springOsc;
        } else if (motionType === 'sway') {
          // 2. 🌾 柔顺摇摆 (如草木迎风大角度柔美摆动)
          const theta = Math.sin(2 * Math.PI * partPhase * pSpeed);
          jiggleRot = theta * (pAmp * 0.58);
          jiggleScaleX = 1 + pAmp * 0.15 * Math.cos(4 * Math.PI * partPhase * pSpeed);
          jiggleScaleY = 1;
        } else if (motionType === 'orbit-spin') {
          // 3. 💫 环绕立体旋转 (立体透视陀螺式绕根部盘旋)
          const orbitTheta = 2 * Math.PI * partPhase * pSpeed;
          jiggleRot = 0.45 * pAmp * Math.cos(orbitTheta);
          jiggleScaleX = 1 + 0.35 * pAmp * Math.sin(orbitTheta);
          jiggleScaleY = 1 - 0.25 * pAmp * Math.sin(orbitTheta);
        } else if (motionType === 'breathe') {
          // 4. 💓 呼吸脉动 (各向同性有节奏膨胀收缩)
          const p = Math.sin(2 * Math.PI * partPhase * pSpeed);
          jiggleScaleX = 1 + pAmp * 0.48 * p;
          jiggleScaleY = 1 + pAmp * 0.48 * p;
          jiggleRot = 0;
        } else {
          // 5. 🍧 果冻微颤 (高频果冻双向挤压抖动)
          const p = Math.sin(4 * Math.PI * partPhase * pSpeed);
          jiggleScaleX = 1 + pAmp * 0.42 * p;
          jiggleScaleY = 1 - pAmp * 0.38 * p;
          jiggleRot = pAmp * 0.2 * Math.cos(4 * Math.PI * partPhase * pSpeed);
        }

        targetCtx.save();
        targetCtx.imageSmoothingEnabled = true;
        targetCtx.imageSmoothingQuality = 'high';

        const userRotRad = ((part.rotation || 0) * Math.PI) / 180;
        const partDrawW = part.sourceW * scaleRatio;
        const partDrawH = part.sourceH * scaleRatio;
        const partOffX = (part.offsetX || 0) * scaleRatio;
        const partOffY = (part.offsetY || 0) * scaleRatio;

        // Relative offset of cutout image top-left to its anchor pin
        let dx: number;
        let dy: number;
        if (part.type === 'preset-sticker' || part.type === 'custom-upload') {
          dx = -partDrawW * 0.5;
          dy = -partDrawH * 0.5;
        } else {
          dx = (part.sourceX - pinRatioX * sourceW) * scaleRatio;
          dy = (part.sourceY - pinRatioY * sourceH) * scaleRatio;
        }

        const pScale = part.scale ?? 1.0;
        const mulX = (part.flipH ? -1 : 1) * pScale;
        const mulY = (part.flipV ? -1 : 1) * pScale;

        if (onlyPartBounces) {
          const rootX = (anchorX - drawW * bodyTransform.anchorX) + pinRatioX * drawW + partOffX;
          const rootY = (anchorY - drawH * bodyTransform.anchorY) + pinRatioY * drawH + partOffY;
          targetCtx.translate(rootX, rootY);
        } else {
          targetCtx.translate(anchorX + transform.translateX, anchorY + transform.translateY);
          if (dirAngle !== 0) targetCtx.rotate(dirAngle);
          if (transform.rotation !== 0) targetCtx.rotate(transform.rotation);
          targetCtx.scale(transform.scaleX, transform.scaleY);

          const relRootX = (pinRatioX - bodyTransform.anchorX) * drawW + partOffX;
          const relRootY = (pinRatioY - bodyTransform.anchorY) * drawH + partOffY;
          targetCtx.translate(relRootX, relRootY);
        }

        if (userRotRad !== 0) targetCtx.rotate(userRotRad);

        // 弹力方向角度 (自调任意弹动方向 0°~360°)
        const bounceDirRad = ((part.bounceDirectionAngle || 0) * Math.PI) / 180;

        if (part.type === 'cutout' || !part.type) {
          // 👂 耳朵/呆毛专用有机柔韧弯曲物理：
          // 底部与扎根锚定线紧密重合，底边位移严格为 0 绝对不动，只有上部沿弹力方向柔顺弯曲甩动！
          const slices = 36;
          const sliceH = partDrawH / slices;
          const srcSliceH = pImg.naturalHeight / slices;

          // Oscillation along bounce direction
          const oscMag = (jiggleRot !== 0 ? jiggleRot : (jiggleScaleX - 1) * 2.2) * partDrawW * 1.35;
          const dirX = Math.sin(bounceDirRad !== 0 ? bounceDirRad : Math.PI / 2);
          const dirY = -Math.cos(bounceDirRad !== 0 ? bounceDirRad : 0);

          for (let s = 0; s < slices; s++) {
            // s = slices - 1 为耳朵底部（紧贴身体锚定线），s = 0 为耳朵顶部尖尖
            const v = (slices - 1 - s) / (slices - 1); // 0 at bottom seam, 1 at top tip
            const weight = Math.pow(v, 1.55);

            // 底部 v = 0 时，dispX = 0, dispY = 0！耳朵底部与锚定线完全重叠绝对不动！
            const dispX = dirX * oscMag * weight;
            const dispY = (bounceDirRad !== 0 ? dirY * oscMag * weight * 0.45 : 0);

            targetCtx.save();
            targetCtx.scale(mulX, mulY);
            targetCtx.drawImage(
              pImg,
              0,
              s * srcSliceH,
              pImg.naturalWidth,
              srcSliceH,
              dx + dispX,
              dy + s * sliceH + dispY,
              partDrawW,
              sliceH + 0.6
            );
            targetCtx.restore();
          }
        } else {
          // 贴图/挂件/文字：按弹力方向自由弹射与晃动
          if (bounceDirRad !== 0) targetCtx.rotate(bounceDirRad);
          if (jiggleRot !== 0) targetCtx.rotate(jiggleRot);
          targetCtx.scale(jiggleScaleX * mulX, jiggleScaleY * mulY);
          if (bounceDirRad !== 0) targetCtx.rotate(-bounceDirRad);
          targetCtx.drawImage(pImg, dx, dy, partDrawW, partDrawH);
        }

        targetCtx.restore();
      });
    } else if (isolatedPartCanvas) {
      // Legacy single mask fallback
      const userAnchors = localBounceConfig.anchors || [];
      const localPhase = (phase - basePhaseLag + 1) % 1;

      if (userAnchors.length === 0) {
        targetCtx.save();
        targetCtx.imageSmoothingEnabled = true;
        targetCtx.imageSmoothingQuality = 'high';
        if (onlyPartBounces) {
          targetCtx.drawImage(isolatedPartCanvas, anchorX - drawW * 0.5, anchorY - drawH * 0.95, drawW, drawH);
        } else {
          targetCtx.translate(anchorX + transform.translateX, anchorY + transform.translateY);
          if (dirAngle !== 0) targetCtx.rotate(dirAngle);
          if (transform.rotation !== 0) targetCtx.rotate(transform.rotation);
          targetCtx.scale(transform.scaleX, transform.scaleY);
          targetCtx.drawImage(isolatedPartCanvas, -drawW * bodyTransform.anchorX, -drawH * bodyTransform.anchorY, drawW, drawH);
        }
        targetCtx.restore();
      } else {
        const anchorPixelPoints: Point2D[] = userAnchors.map((anc) => ({
          x: (anchorX - drawW * bodyTransform.anchorX) + anc.anchorX * drawW,
          y: (anchorY - drawH * bodyTransform.anchorY) + anc.anchorY * drawH,
        }));

        userAnchors.forEach((anc, idx) => {
          const pinRatioX = anc.anchorX;
          const pinRatioY = anc.anchorY;
          const motionType = anc.motion || localBounceConfig.motion;
          const zonePhase = (localPhase + (idx * 0.23)) % 1;

          let jiggleScaleX = 1;
          let jiggleScaleY = 1;
          let jiggleRot = 0;

          if (motionType === 'spring') {
            const springCycle = (zonePhase * globalSpeed * 2.2) % 1;
            const decay = Math.exp(-2.8 * springCycle);
            const springOsc = Math.sin(2 * Math.PI * springCycle * 3.5) * decay;
            jiggleRot = globalAmp * 0.52 * springOsc;
            jiggleScaleX = 1 + globalAmp * 0.35 * springOsc;
            jiggleScaleY = 1 - globalAmp * 0.28 * springOsc;
          } else if (motionType === 'sway') {
            const theta = Math.sin(2 * Math.PI * zonePhase * globalSpeed);
            jiggleRot = theta * (globalAmp * 0.58);
            jiggleScaleX = 1 + globalAmp * 0.15 * Math.cos(4 * Math.PI * zonePhase * globalSpeed);
            jiggleScaleY = 1;
          } else if (motionType === 'orbit-spin') {
            const orbitTheta = 2 * Math.PI * zonePhase * globalSpeed;
            jiggleRot = 0.45 * globalAmp * Math.cos(orbitTheta);
            jiggleScaleX = 1 + 0.35 * globalAmp * Math.sin(orbitTheta);
            jiggleScaleY = 1 - 0.25 * globalAmp * Math.sin(orbitTheta);
          } else if (motionType === 'breathe') {
            const p = Math.sin(2 * Math.PI * zonePhase * globalSpeed);
            jiggleScaleX = 1 + globalAmp * 0.48 * p;
            jiggleScaleY = 1 + globalAmp * 0.48 * p;
            jiggleRot = 0;
          } else {
            const p = Math.sin(4 * Math.PI * zonePhase * globalSpeed);
            jiggleScaleX = 1 + globalAmp * 0.42 * p;
            jiggleScaleY = 1 - globalAmp * 0.38 * p;
            jiggleRot = globalAmp * 0.2 * Math.cos(4 * Math.PI * zonePhase * globalSpeed);
          }

          targetCtx.save();
          targetCtx.imageSmoothingEnabled = true;
          targetCtx.imageSmoothingQuality = 'high';

          if (userAnchors.length > 1) {
            const cell = computeVoronoiCell(anchorPixelPoints[idx], anchorPixelPoints, w, h);
            if (cell.length >= 3) {
              targetCtx.beginPath();
              cell.forEach((pt, pIdx) => {
                if (pIdx === 0) targetCtx.moveTo(pt.x, pt.y);
                else targetCtx.lineTo(pt.x, pt.y);
              });
              targetCtx.closePath();
              targetCtx.clip();
            }
          }

          if (onlyPartBounces) {
            const rootX = (anchorX - drawW * bodyTransform.anchorX) + pinRatioX * drawW;
            const rootY = (anchorY - drawH * bodyTransform.anchorY) + pinRatioY * drawH;

            targetCtx.translate(rootX, rootY);
            if (dirAngle !== 0) targetCtx.rotate(dirAngle);
            if (jiggleRot !== 0) targetCtx.rotate(jiggleRot);
            targetCtx.scale(jiggleScaleX, jiggleScaleY);
            if (dirAngle !== 0) targetCtx.rotate(-dirAngle);

            targetCtx.drawImage(
              isolatedPartCanvas,
              -pinRatioX * drawW,
              -pinRatioY * drawH,
              drawW,
              drawH
            );
          } else {
            targetCtx.translate(anchorX + transform.translateX, anchorY + transform.translateY);
            if (dirAngle !== 0) targetCtx.rotate(dirAngle);
            if (transform.rotation !== 0) targetCtx.rotate(transform.rotation);
            targetCtx.scale(transform.scaleX, transform.scaleY);

            const relRootX = (pinRatioX - bodyTransform.anchorX) * drawW;
            const relRootY = (pinRatioY - bodyTransform.anchorY) * drawH;

            targetCtx.translate(relRootX, relRootY);
            if (jiggleRot !== 0) targetCtx.rotate(jiggleRot);
            targetCtx.scale(jiggleScaleX, jiggleScaleY);

            targetCtx.drawImage(
              isolatedPartCanvas,
              -pinRatioX * drawW,
              -pinRatioY * drawH,
              drawW,
              drawH
            );
          }

          targetCtx.restore();
        });
      }
    }
  }

  // 4. Draw Comic Accessories (仅在无独立贴图模式下作为后向兼容绘制，避免一个贴图显示两次)
  if (accessory && accessory.type !== 'none' && (!localBounceConfig?.parts || localBounceConfig.parts.length === 0)) {
    drawComicAccessory(targetCtx, w, h, transform, accessory, phase);
  }
}

/**
 * Generate animated GIF
 */
export async function generateQElasticGif(
  sourceCanvas: HTMLCanvasElement,
  config: BounceConfig,
  onProgress?: (percent: number) => void,
  localMaskCanvas?: HTMLCanvasElement | null
): Promise<GeneratedExportResult> {
  const {
    frameCount,
    fps,
    motion,
    amplitude,
    bgType,
    easing,
    alphaDithering,
    groundShadow,
    impactRipple,
    accessory,
    wechatOptimized,
    localBounce,
  } = config;

  const outputSize = wechatOptimized ? 240 : config.outputSize;
  const effectiveFps = wechatOptimized ? Math.min(fps, 24) : fps;
  const effectiveFrameCount = wechatOptimized ? Math.min(frameCount, 26) : frameCount;

  // Preload all part images so drawing does not drop frames
  if (localBounce?.parts?.length) {
    await preloadPartImages(localBounce.parts);
  }

  const gif = GIFEncoder();

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = outputSize;
  frameCanvas.height = outputSize;
  const ctx = frameCanvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const delayMs = Math.round(1000 / effectiveFps);
  const isTransparent = bgType === 'transparent' || bgType === 'checker';

  // STEP 1: Pre-sample palette
  const sampleSteps = Math.min(effectiveFrameCount, 8);
  const opaqueSamples: number[] = [];

  for (let s = 0; s < sampleSteps; s++) {
    const p = s / sampleSteps;
    const tf = getBounceTransform(motion, amplitude, p, easing ?? 35);
    drawBounceFrame(
      ctx,
      sourceCanvas,
      sourceCanvas.width,
      sourceCanvas.height,
      outputSize,
      tf,
      isTransparent ? 'transparent' : bgType,
      groundShadow,
      impactRipple,
      accessory,
      p,
      localMaskCanvas,
      localBounce,
      config.bounceDirection,
      config.bounceAngle,
      config.jellyBulge ?? true,
      config.jellyGloss ?? false
    );

    const imgData = ctx.getImageData(0, 0, outputSize, outputSize);
    const data = imgData.data;
    const stride = outputSize > 400 ? 6 : 3;

    for (let i = 0; i < data.length; i += stride * 4) {
      const a = data[i + 3];
      if (!isTransparent || a > 20) {
        opaqueSamples.push(data[i], data[i + 1], data[i + 2], 255);
      }
    }
  }

  const sampleArray = new Uint8ClampedArray(
    opaqueSamples.length > 0 ? opaqueSamples : [255, 255, 255, 255]
  );
  const maxColors = wechatOptimized ? 128 : isTransparent ? 255 : 256;
  const rawPalette = quantize(sampleArray, maxColors, { format: 'rgb565' });

  const masterPalette: number[][] = isTransparent
    ? [[0, 0, 0, 0], ...rawPalette]
    : rawPalette;

  const colorCache = new Int16Array(65536);
  colorCache.fill(-1);

  if (onProgress) onProgress(15);

  // STEP 2: Frame rendering
  for (let i = 0; i < effectiveFrameCount; i++) {
    const phase = i / effectiveFrameCount;
    const transform = getBounceTransform(motion, amplitude, phase, easing ?? 35);

    drawBounceFrame(
      ctx,
      sourceCanvas,
      sourceCanvas.width,
      sourceCanvas.height,
      outputSize,
      transform,
      isTransparent ? 'transparent' : bgType,
      groundShadow,
      impactRipple,
      accessory,
      phase,
      localMaskCanvas,
      localBounce,
      config.bounceDirection,
      config.bounceAngle,
      config.jellyBulge ?? true,
      config.jellyGloss ?? false
    );

    const imgData = ctx.getImageData(0, 0, outputSize, outputSize);
    const rgba = imgData.data;
    const pixelCount = outputSize * outputSize;
    const frameIndices = new Uint8Array(pixelCount);

    if (isTransparent) {
      let alphaError = 0;

      for (let pIdx = 0; pIdx < pixelCount; pIdx++) {
        const dIdx = pIdx * 4;
        const a = rgba[dIdx + 3];

        if (alphaDithering) {
          const totalA = a + alphaError;
          if (totalA < 128) {
            frameIndices[pIdx] = 0;
            alphaError = totalA;
          } else {
            alphaError = totalA - 255;
            const r = rgba[dIdx];
            const g = rgba[dIdx + 1];
            const b = rgba[dIdx + 2];
            const key = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
            let pIdxColor = colorCache[key];
            if (pIdxColor === -1) {
              pIdxColor = nearestColorIndex(rawPalette, [r, g, b]);
              colorCache[key] = pIdxColor;
            }
            frameIndices[pIdx] = pIdxColor + 1;
          }
        } else {
          if (a <= 32) {
            frameIndices[pIdx] = 0;
          } else {
            const r = rgba[dIdx];
            const g = rgba[dIdx + 1];
            const b = rgba[dIdx + 2];
            const key = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
            let pIdxColor = colorCache[key];
            if (pIdxColor === -1) {
              pIdxColor = nearestColorIndex(rawPalette, [r, g, b]);
              colorCache[key] = pIdxColor;
            }
            frameIndices[pIdx] = pIdxColor + 1;
          }
        }
      }

      gif.writeFrame(frameIndices, outputSize, outputSize, {
        palette: masterPalette,
        delay: delayMs,
        transparent: true,
        transparentIndex: 0,
      });
    } else {
      const index = applyPalette(rgba, masterPalette, 'rgb565');
      gif.writeFrame(index, outputSize, outputSize, {
        palette: masterPalette,
        delay: delayMs,
      });
    }

    if (onProgress) {
      onProgress(15 + Math.round(((i + 1) / effectiveFrameCount) * 85));
    }

    if (i % 4 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  const blob = new Blob([bytes as any], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);

  const format = wechatOptimized ? 'wechat-gif' : 'gif';
  const fileName = wechatOptimized ? 'l41-wechat-sticker.gif' : 'l41-jelly-bounce.gif';

  return {
    blob,
    url,
    sizeBytes: bytes.length,
    width: outputSize,
    height: outputSize,
    frameCount: effectiveFrameCount,
    format,
    fileName,
  };
}

/**
 * Generate Spritesheet PNG
 */
export async function generateSpritesheetPng(
  sourceCanvas: HTMLCanvasElement,
  config: BounceConfig,
  onProgress?: (percent: number) => void,
  localMaskCanvas?: HTMLCanvasElement | null
): Promise<GeneratedExportResult> {
  const { frameCount, outputSize, motion, amplitude, bgType, easing, groundShadow, impactRipple, accessory, localBounce } = config;

  if (localBounce?.parts?.length) {
    await preloadPartImages(localBounce.parts);
  }

  const singleSize = outputSize > 320 ? 320 : outputSize;
  const cols = Math.ceil(Math.sqrt(frameCount));
  const rows = Math.ceil(frameCount / cols);

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = cols * singleSize;
  sheetCanvas.height = rows * singleSize;
  const sheetCtx = sheetCanvas.getContext('2d')!;
  sheetCtx.imageSmoothingEnabled = true;
  sheetCtx.imageSmoothingQuality = 'high';

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = singleSize;
  frameCanvas.height = singleSize;
  const frameCtx = frameCanvas.getContext('2d')!;

  for (let i = 0; i < frameCount; i++) {
    const phase = i / frameCount;
    const transform = getBounceTransform(motion, amplitude, phase, easing ?? 35);

    drawBounceFrame(
      frameCtx,
      sourceCanvas,
      sourceCanvas.width,
      sourceCanvas.height,
      singleSize,
      transform,
      bgType,
      groundShadow,
      impactRipple,
      accessory,
      phase,
      localMaskCanvas,
      localBounce,
      config.bounceDirection,
      config.bounceAngle,
      config.jellyBulge ?? true,
      config.jellyGloss ?? false
    );

    const col = i % cols;
    const row = Math.floor(i / cols);
    sheetCtx.drawImage(frameCanvas, col * singleSize, row * singleSize);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / frameCount) * 100));
    }
  }

  const blob = await new Promise<Blob>((resolve) => {
    sheetCanvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
  });
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    sizeBytes: blob.size,
    width: sheetCanvas.width,
    height: sheetCanvas.height,
    frameCount,
    format: 'spritesheet',
    fileName: `l41-spritesheet-${cols}x${rows}.png`,
  };
}

/**
 * Generate transparent PNG sequence frames in a ZIP
 */
export async function generateZipFrames(
  sourceCanvas: HTMLCanvasElement,
  config: BounceConfig,
  onProgress?: (percent: number) => void,
  localMaskCanvas?: HTMLCanvasElement | null
): Promise<GeneratedExportResult> {
  const { frameCount, outputSize, motion, amplitude, bgType, easing, groundShadow, impactRipple, accessory, localBounce } = config;

  if (localBounce?.parts?.length) {
    await preloadPartImages(localBounce.parts);
  }

  const zip = new JSZip();

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = outputSize;
  frameCanvas.height = outputSize;
  const ctx = frameCanvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  for (let i = 0; i < frameCount; i++) {
    const phase = i / frameCount;
    const transform = getBounceTransform(motion, amplitude, phase, easing ?? 35);

    drawBounceFrame(
      ctx,
      sourceCanvas,
      sourceCanvas.width,
      sourceCanvas.height,
      outputSize,
      transform,
      bgType,
      groundShadow,
      impactRipple,
      accessory,
      phase,
      localMaskCanvas,
      localBounce,
      config.bounceDirection,
      config.bounceAngle,
      config.jellyBulge ?? true,
      config.jellyGloss ?? false
    );

    const blob = await new Promise<Blob>((resolve) => {
      frameCanvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
    });

    const indexStr = String(i + 1).padStart(3, '0');
    zip.file(`frame_${indexStr}.png`, blob);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / frameCount) * 75));
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) {
      onProgress(75 + Math.round(metadata.percent * 0.25));
    }
  });

  const url = URL.createObjectURL(zipBlob);

  return {
    blob: zipBlob,
    url,
    sizeBytes: zipBlob.size,
    width: outputSize,
    height: outputSize,
    frameCount,
    format: 'zip-frames',
    fileName: `l41-frames-sequence-${frameCount}fps.zip`,
  };
}

/**
 * Generate animated WebP / WebM using Canvas MediaStream
 */
export async function generateAnimatedWebp(
  sourceCanvas: HTMLCanvasElement,
  config: BounceConfig,
  onProgress?: (percent: number) => void,
  localMaskCanvas?: HTMLCanvasElement | null
): Promise<GeneratedExportResult> {
  const { frameCount, fps, outputSize, motion, amplitude, bgType, easing, groundShadow, impactRipple, accessory, localBounce } = config;

  if (localBounce?.parts?.length) {
    await preloadPartImages(localBounce.parts);
  }

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const stream = canvas.captureStream(fps);
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2500000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const delayMs = Math.round(1000 / fps);
  recorder.start();

  const totalFrames = frameCount * 2;
  for (let i = 0; i < totalFrames; i++) {
    const phase = (i % frameCount) / frameCount;
    const transform = getBounceTransform(motion, amplitude, phase, easing ?? 35);

    drawBounceFrame(
      ctx,
      sourceCanvas,
      sourceCanvas.width,
      sourceCanvas.height,
      outputSize,
      transform,
      bgType,
      groundShadow,
      impactRipple,
      accessory,
      phase,
      localMaskCanvas,
      localBounce,
      config.bounceDirection,
      config.bounceAngle,
      config.jellyBulge ?? true,
      config.jellyGloss ?? false
    );

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalFrames) * 90));
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  recorder.stop();

  const blob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  const url = URL.createObjectURL(blob);
  if (onProgress) onProgress(100);

  return {
    blob,
    url,
    sizeBytes: blob.size,
    width: outputSize,
    height: outputSize,
    frameCount,
    format: 'webp',
    fileName: 'l41-jelly-animation.webm',
  };
}
