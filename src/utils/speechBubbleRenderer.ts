/**
 * Renders custom meme text and comic speech bubbles into transparent PNG DataURLs
 */

export type BubbleStyle = 'meme-black-outline' | 'cute-pink' | 'speech-bubble' | 'shout-burst';

export interface TextBubbleOptions {
  text: string;
  style: BubbleStyle;
  fontSize?: number;
}

export function renderTextBubbleToDataUrl(options: TextBubbleOptions): { dataUrl: string; width: number; height: number } {
  const { text, style, fontSize = 28 } = options;
  const cleanText = text.trim() || '好耶！';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const font = `900 ${fontSize}px "Microsoft YaHei", -apple-system, sans-serif`;
  ctx.font = font;

  const textMetrics = ctx.measureText(cleanText);
  const textW = Math.ceil(textMetrics.width);
  const textH = fontSize * 1.25;

  const padX = style === 'speech-bubble' || style === 'shout-burst' ? 24 : 14;
  const padY = style === 'speech-bubble' ? 16 : 10;
  const tailH = style === 'speech-bubble' ? 12 : 0;

  const w = textW + padX * 2 + 16;
  const h = textH + padY * 2 + tailH + 16;

  canvas.width = Math.max(80, w);
  canvas.height = Math.max(48, h);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const centerX = canvas.width / 2;
  const centerY = (canvas.height - tailH) / 2;

  ctx.save();

  if (style === 'meme-black-outline') {
    // 1. Classic anime / meme text with thick black outline
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#0f172a';
    ctx.strokeText(cleanText, centerX, centerY);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(cleanText, centerX, centerY);
  } else if (style === 'cute-pink') {
    // 2. Cute pink pastel text with white outline & drop shadow
    ctx.shadowColor = 'rgba(244, 63, 94, 0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.lineJoin = 'round';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(cleanText, centerX, centerY);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(cleanText, centerX, centerY);
  } else if (style === 'speech-bubble') {
    // 3. Cute rounded speech bubble with pointer tail
    const rectX = 8;
    const rectY = 6;
    const rectW = canvas.width - 16;
    const rectH = canvas.height - tailH - 12;
    const radius = 16;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.roundRect(rectX, rectY, rectW, rectH, radius);
    ctx.fill();
    ctx.stroke();

    // Bubble Tail pointing downwards
    ctx.beginPath();
    const tailX = centerX - 8;
    const tailY = rectY + rectH - 1;
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tailX - 6, tailY + tailH);
    ctx.lineTo(tailX + 14, tailY);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.fillText(cleanText, centerX, centerY + 2);
  } else if (style === 'shout-burst') {
    // 4. Comic excitement / shout burst bubble
    const cx = centerX;
    const cy = centerY;
    const rx = canvas.width * 0.45;
    const ry = (canvas.height - 10) * 0.42;

    ctx.fillStyle = '#fef08a'; // bright comic yellow
    ctx.strokeStyle = '#e11d48'; // vibrant red stroke
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'miter';

    const points = 16;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const isSpike = i % 2 === 0;
      const rRatioX = isSpike ? 1.05 : 0.82;
      const rRatioY = isSpike ? 1.05 : 0.82;
      const px = cx + Math.cos(angle) * rx * rRatioX;
      const py = cy + Math.sin(angle) * ry * rRatioY;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(cleanText, centerX, centerY);

    ctx.fillStyle = '#be123c';
    ctx.fillText(cleanText, centerX, centerY);
  }

  ctx.restore();

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}
