import { AccessoryConfig, BounceTransform } from '../types/gif';

// Image cache for custom uploaded accessories
const customImageCache = new Map<string, HTMLImageElement>();

function getCustomImage(url: string): HTMLImageElement | null {
  if (!url) return null;
  let img = customImageCache.get(url);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    customImageCache.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/**
 * Calculates current canvas coordinates of the accessory for hit testing & dragging
 */
export function getAccessoryScreenPosition(
  w: number,
  h: number,
  transform: BounceTransform,
  config: AccessoryConfig,
  phase: number = 0
): { x: number; y: number; radius: number } {
  const lag = config.lagIntensity ?? 0.8;
  const inertiaX = -transform.translateX * 0.6 * lag + (transform.topDisplacement ? -transform.topDisplacement * 0.25 * lag : 0);
  const inertiaY = -transform.translateY * 0.5 * lag;

  const userOffX = config.offsetX ?? 55;
  const userOffY = config.offsetY !== undefined ? config.offsetY : -h * 0.22;

  const posX = w * 0.5 + userOffX + transform.translateX * 0.85 + (transform.topDisplacement || 0) * 0.4 + inertiaX;
  const posY = h * 0.5 + userOffY + transform.translateY * 0.85 + inertiaY;

  const radius = Math.max(28, 36 * (config.size || 1.0));
  return { x: posX, y: posY, radius };
}

/**
 * Draws dynamic ground shadow and landing impact shockwave ripples
 */
export function drawGroundShadowAndRipple(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  transform: BounceTransform,
  groundShadow: boolean,
  impactRipple: boolean,
  phase: number
): void {
  const groundY = h * 0.92;
  const groundX = w * 0.5;

  const charDistY = Math.max(0, -transform.translateY);
  const squashFactor = Math.max(0.6, transform.scaleX);

  // 1. Draw Ground Shadow
  if (groundShadow) {
    ctx.save();
    const shadowWidth = (w * 0.32) * squashFactor * Math.max(0.3, 1 - charDistY / 100);
    const shadowHeight = (h * 0.065) * Math.max(0.3, 1 - charDistY / 120);
    const shadowOpacity = Math.max(0.08, Math.min(0.48, 0.36 + (squashFactor - 1) * 0.3 - charDistY / 140));

    const shadowGrad = ctx.createRadialGradient(
      groundX,
      groundY,
      0,
      groundX,
      groundY,
      shadowWidth
    );
    shadowGrad.addColorStop(0, `rgba(15, 23, 42, ${shadowOpacity})`);
    shadowGrad.addColorStop(0.6, `rgba(15, 23, 42, ${shadowOpacity * 0.45})`);
    shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');

    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(groundX, groundY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Draw Impact Candy Particles & Star Sparkles (软糖粒子与闪烁星芒，彻底替换原有环形)
  if (impactRipple) {
    const isImpact = transform.scaleY < 0.96 && transform.translateY >= -14;
    if (isImpact) {
      ctx.save();
      const depth = Math.min(1.0, (1 - transform.scaleY) * 2.5);
      const alpha = Math.min(0.9, depth * 1.5);

      const particles = [
        { angle: -0.28, dist: 0.36, size: 5.5, color: '#f43f5e', type: 'candy' }, // strawberry pink
        { angle: 0.28, dist: 0.36, size: 5.5, color: '#f43f5e', type: 'candy' },
        { angle: -0.52, dist: 0.46, size: 4.2, color: '#fbbf24', type: 'star' },  // gold star
        { angle: 0.52, dist: 0.46, size: 4.2, color: '#fbbf24', type: 'star' },
        { angle: -0.16, dist: 0.54, size: 4.8, color: '#38bdf8', type: 'candy' }, // soda blue
        { angle: 0.16, dist: 0.54, size: 4.8, color: '#38bdf8', type: 'candy' },
        { angle: -0.72, dist: 0.26, size: 3.8, color: '#a855f7', type: 'star' },  // purple star
        { angle: 0.72, dist: 0.26, size: 3.8, color: '#a855f7', type: 'star' },
        { angle: -0.38, dist: 0.66, size: 3.2, color: '#34d399', type: 'candy' }, // mint green
        { angle: 0.38, dist: 0.66, size: 3.2, color: '#34d399', type: 'candy' },
      ];

      const spreadW = w * 0.42 * (1 + depth * 0.7);
      const spreadH = h * 0.12 * depth;

      particles.forEach((p) => {
        const px = groundX + Math.sin(p.angle) * spreadW * (1 + depth * 0.35);
        const py = groundY - Math.abs(Math.cos(p.angle)) * spreadH - 2;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;

        if (p.type === 'star') {
          // 4-point star ✨
          ctx.beginPath();
          const r = p.size * (1 + depth * 0.3);
          ctx.moveTo(px, py - r);
          ctx.quadraticCurveTo(px, py, px + r, py);
          ctx.quadraticCurveTo(px, py, px, py + r);
          ctx.quadraticCurveTo(px, py, px - r, py);
          ctx.quadraticCurveTo(px, py, px, py - r);
          ctx.fill();
        } else {
          // Soft glossy candy droplet 🍬
          ctx.beginPath();
          ctx.arc(px, py, p.size * (1 + depth * 0.2), 0, Math.PI * 2);
          ctx.fill();

          // Highlight
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px - p.size * 0.28, py - p.size * 0.28, p.size * 0.32, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();
    }
  }
}

/**
 * Draws dynamic comic accessory with customizable ROTATION, draggable position,
 * and horizontal dizzy stars rotation
 */
export function drawComicAccessory(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  transform: BounceTransform,
  config: AccessoryConfig,
  phase: number
): void {
  if (!config || config.type === 'none') return;

  const scale = config.size || 1.0;
  const lag = config.lagIntensity ?? 0.8;
  const userRotation = ((config.rotation || 0) * Math.PI) / 180; // Customizable user rotation!

  const lagPhase = (phase - 0.18 * lag + 1) % 1;
  const inertiaX = -transform.translateX * 0.6 * lag + (transform.topDisplacement ? -transform.topDisplacement * 0.25 * lag : 0);
  const inertiaY = -transform.translateY * 0.5 * lag;

  const userOffX = config.offsetX ?? 55;
  const userOffY = config.offsetY !== undefined ? config.offsetY : -h * 0.22;

  // Fully free positioning anchor across the entire canvas
  const baseX = w * 0.5 + userOffX + transform.translateX * 0.85 + (transform.topDisplacement || 0) * 0.4 + inertiaX;
  const baseY = h * 0.5 + userOffY + transform.translateY * 0.85 + inertiaY;

  ctx.save();

  switch (config.type) {
    case 'custom': {
      // 🖼️ User Custom Uploaded & Auto-Cutout Accessory with User Rotation
      if (config.customImageUrl) {
        const customImg = getCustomImage(config.customImageUrl);
        if (customImg) {
          const wobble = Math.sin(lagPhase * Math.PI * 2) * 0.15;

          ctx.translate(baseX, baseY);
          ctx.rotate(userRotation + wobble);
          ctx.scale(scale, scale);

          const maxDim = 100;
          let dw = customImg.width;
          let dh = customImg.height;
          if (dw > maxDim || dh > maxDim) {
            if (dw > dh) {
              dh = (dh * maxDim) / dw;
              dw = maxDim;
            } else {
              dw = (dw * maxDim) / dh;
              dh = maxDim;
            }
          }

          ctx.drawImage(customImg, -dw / 2, -dh / 2, dw, dh);
        }
      }
      break;
    }

    case 'sweat': {
      // 💦 Comical anime sweat drop with User Rotation
      const dropY = baseY + Math.sin(phase * Math.PI * 4) * 6;
      const wobbleAngle = 0.25 + Math.sin(lagPhase * Math.PI * 2) * 0.3;

      ctx.translate(baseX, dropY);
      ctx.rotate(userRotation + wobbleAngle);
      ctx.scale(scale, scale);

      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.bezierCurveTo(12, -2, 14, 14, 0, 18);
      ctx.bezierCurveTo(-14, 14, -12, -2, 0, -18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-4, 5, 3, 7, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Second droplet
      ctx.translate(14, 16);
      ctx.scale(0.55, 0.55);
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.bezierCurveTo(12, -2, 14, 14, 0, 18);
      ctx.bezierCurveTo(-14, 14, -12, -2, 0, -18);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'heart': {
      // 💖 Floating & pulsing pink love hearts with User Rotation
      const pulse = 1 + 0.2 * Math.sin(phase * Math.PI * 4);
      const heartY = baseY + Math.sin(phase * Math.PI * 2) * 8;

      ctx.translate(baseX, heartY);
      ctx.rotate(userRotation);
      ctx.scale(scale * pulse, scale * pulse);

      const drawHeart = (size: number, fill: string, stroke: string) => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, size * 0.4);
        ctx.bezierCurveTo(-size, -size * 0.4, -size * 0.5, -size * 1.1, 0, -size * 0.5);
        ctx.bezierCurveTo(size * 0.5, -size * 1.1, size, -size * 0.4, 0, size * 0.4);
        ctx.fill();
        ctx.stroke();
      };

      drawHeart(22, '#f43f5e', '#be123c');
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-7, -10, 3, 0, Math.PI * 2);
      ctx.fill();

      // Secondary floating baby heart
      ctx.translate(-36, -18);
      ctx.scale(0.58, 0.58);
      ctx.rotate(-0.35);
      drawHeart(20, '#fb7185', '#e11d48');
      break;
    }

    case 'stars': {
      // 💫 4 Sparkling Dizzy Stars in Strictly HORIZONTAL Rotation (水平旋转环绕)
      const orbitA = w * 0.28 * scale;
      const orbitB = h * 0.08 * scale;
      const baseAngle = phase * Math.PI * 4;

      ctx.translate(baseX, baseY);
      if (userRotation !== 0) {
        ctx.rotate(userRotation);
      }

      const draw4PointSparkleStar = (x: number, y: number, s: number, isFront: boolean) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(phase * Math.PI * 4);

        const starAlpha = isFront ? 1.0 : 0.62;
        const finalScale = isFront ? s : s * 0.8;

        ctx.fillStyle = `rgba(251, 191, 36, ${starAlpha})`;
        ctx.strokeStyle = `rgba(180, 83, 9, ${starAlpha})`;
        ctx.lineWidth = 2;

        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(Math.cos((i * Math.PI) / 2) * finalScale, Math.sin((i * Math.PI) / 2) * finalScale);
          ctx.lineTo(
            Math.cos((i * Math.PI) / 2 + Math.PI / 4) * (finalScale * 0.36),
            Math.sin((i * Math.PI) / 2 + Math.PI / 4) * (finalScale * 0.36)
          );
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(0, 0, finalScale * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      for (let i = 0; i < 4; i++) {
        const theta = baseAngle + (i * Math.PI) / 2;

        const starX = Math.cos(theta) * orbitA;
        const starY = Math.sin(theta) * orbitB;

        const isFront = Math.sin(theta) > 0;
        const baseSize = i % 2 === 0 ? 14 : 11;

        draw4PointSparkleStar(starX, starY, baseSize, isFront);
      }
      break;
    }

    case 'music': {
      // 🎵 Bouncing joyful musical notes with User Rotation
      const noteY = baseY + Math.sin(phase * Math.PI * 3) * 10;
      const swing = Math.sin(phase * Math.PI * 2) * 0.3;

      ctx.translate(baseX, noteY);
      ctx.rotate(userRotation + swing);
      ctx.scale(scale, scale);

      ctx.fillStyle = '#6366f1';
      ctx.strokeStyle = '#4338ca';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.ellipse(0, 6, 8, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(5, 4);
      ctx.lineTo(5, -18);
      ctx.lineTo(14, -14);
      ctx.stroke();

      ctx.translate(-24, -14);
      ctx.scale(0.65, 0.65);
      ctx.rotate(-0.4);
      ctx.beginPath();
      ctx.ellipse(0, 6, 8, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(5, 4);
      ctx.lineTo(5, -18);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

/**
 * Renders a preset comic sticker into a clean, transparent PNG DataURL
 */
export function renderPresetStickerToDataUrl(type: 'sweat' | 'heart' | 'stars' | 'music'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 120;
  const ctx = canvas.getContext('2d')!;
  const dummyTransform: BounceTransform = {
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
  drawComicAccessory(
    ctx,
    120,
    120,
    dummyTransform,
    {
      type,
      size: 1.25,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      lagIntensity: 0,
    },
    0
  );
  return canvas.toDataURL('image/png');
}
