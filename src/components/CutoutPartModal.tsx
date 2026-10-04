import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Scissors,
  Paintbrush,
  Square,
  Wand2,
  Eraser,
  RotateCcw,
  Check,
  Sparkles,
  Info,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { BouncePart } from '../types/gif';

interface CutoutPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCanvas: HTMLCanvasElement | null;
  onAddPart: (part: BouncePart) => void;
  existingPartsCount: number;
}

type ToolType = 'brush' | 'box' | 'wand' | 'eraser';
type AnchorPreset = 'bottom-center' | 'center' | 'top-center';

export const CutoutPartModal: React.FC<CutoutPartModalProps> = ({
  isOpen,
  onClose,
  sourceCanvas,
  onAddPart,
  existingPartsCount,
}) => {
  const [tool, setTool] = useState<ToolType>('brush');
  const [brushSize, setBrushSize] = useState(24);
  const [partName, setPartName] = useState(`部位 ${existingPartsCount + 1}`);
  const [anchorPreset, setAnchorPreset] = useState<AnchorPreset>('bottom-center');
  const [zoom, setZoom] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

  // Box marquee drag state
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);

  // Canvases
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null); // red selection overlay
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Preset names for quick clicking
  const suggestionNames = ['呆毛', '猫耳', '右耳', '小尾巴', '翅膀', '蝴蝶结', '发梢', '手臂'];

  // Update default name when opened
  useEffect(() => {
    if (isOpen) {
      setPartName(`部位 ${existingPartsCount + 1}`);
      setHasSelection(false);
    }
  }, [isOpen, existingPartsCount]);

  // Synchronize display canvas with sourceCanvas
  useEffect(() => {
    if (!isOpen || !sourceCanvas) return;

    const displayC = displayCanvasRef.current;
    const maskC = maskCanvasRef.current;
    if (!displayC || !maskC) return;

    displayC.width = sourceCanvas.width;
    displayC.height = sourceCanvas.height;
    maskC.width = sourceCanvas.width;
    maskC.height = sourceCanvas.height;

    const dCtx = displayC.getContext('2d')!;
    dCtx.clearRect(0, 0, displayC.width, displayC.height);
    dCtx.drawImage(sourceCanvas, 0, 0);

    const mCtx = maskC.getContext('2d')!;
    mCtx.clearRect(0, 0, maskC.width, maskC.height);

    updateMiniPreview();
  }, [isOpen, sourceCanvas]);

  // Get mouse coordinates on canvas
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const maskC = maskCanvasRef.current;
    if (!maskC) return { x: 0, y: 0 };
    const rect = maskC.getBoundingClientRect();
    const scaleX = maskC.width / rect.width;
    const scaleY = maskC.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Update real-time mini preview of the cutout region
  const updateMiniPreview = useCallback(() => {
    const maskC = maskCanvasRef.current;
    const sourceC = sourceCanvas;
    const prevC = previewCanvasRef.current;
    if (!maskC || !sourceC || !prevC) return;

    const mW = maskC.width;
    const mH = maskC.height;
    const mCtx = maskC.getContext('2d')!;
    const mData = mCtx.getImageData(0, 0, mW, mH).data;

    let minX = mW;
    let minY = mH;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < mH; y++) {
      for (let x = 0; x < mW; x++) {
        const idx = (y * mW + x) * 4;
        if (mData[idx + 3] > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const prevCtx = prevC.getContext('2d')!;
    prevCtx.clearRect(0, 0, prevC.width, prevC.height);

    if (maxX < minX || maxY < minY) {
      setHasSelection(false);
      return;
    }

    setHasSelection(true);
    const selW = maxX - minX + 1;
    const selH = maxY - minY + 1;

    // Draw extracted part onto offscreen canvas
    const tempC = document.createElement('canvas');
    tempC.width = selW;
    tempC.height = selH;
    const tCtx = tempC.getContext('2d')!;

    // 1. Draw source
    tCtx.drawImage(sourceC, minX, minY, selW, selH, 0, 0, selW, selH);
    // 2. Mask with selection
    tCtx.globalCompositeOperation = 'destination-in';
    tCtx.drawImage(maskC, minX, minY, selW, selH, 0, 0, selW, selH);

    // Scale to fit preview canvas (80x80)
    const scale = Math.min((prevC.width - 8) / selW, (prevC.height - 8) / selH);
    const fitW = selW * scale;
    const fitH = selH * scale;
    const offX = (prevC.width - fitW) / 2;
    const offY = (prevC.height - fitH) / 2;

    prevCtx.drawImage(tempC, offX, offY, fitW, fitH);
  }, [sourceCanvas]);

  // Pointer down
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);

    if (tool === 'brush' || tool === 'eraser') {
      paintStroke(coords.x, coords.y);
    } else if (tool === 'box') {
      boxStartRef.current = coords;
    } else if (tool === 'wand') {
      applyMagicWand(coords.x, coords.y);
    }
  };

  // Pointer move
  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (tool === 'brush' || tool === 'eraser') {
      paintStroke(coords.x, coords.y);
    } else if (tool === 'box' && boxStartRef.current) {
      // Re-draw box marquee on mask canvas
      drawTemporaryBox(boxStartRef.current, coords);
    }
  };

  // Pointer up
  const handlePointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      boxStartRef.current = null;
      updateMiniPreview();
    }
  };

  // Paint circle with brush or eraser
  const paintStroke = (x: number, y: number) => {
    const maskC = maskCanvasRef.current;
    if (!maskC) return;
    const ctx = maskC.getContext('2d')!;
    ctx.save();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.75)'; // vibrant red
    }
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    updateMiniPreview();
  };

  // Box drag marquee
  const drawTemporaryBox = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const maskC = maskCanvasRef.current;
    if (!maskC) return;
    const ctx = maskC.getContext('2d')!;

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    updateMiniPreview();
  };

  // Magic wand: select contiguous opaque region
  const applyMagicWand = (startX: number, startY: number) => {
    const sourceC = sourceCanvas;
    const maskC = maskCanvasRef.current;
    if (!sourceC || !maskC) return;

    const sCtx = sourceC.getContext('2d')!;
    const mCtx = maskC.getContext('2d')!;
    const w = sourceC.width;
    const h = sourceC.height;

    const sData = sCtx.getImageData(0, 0, w, h).data;
    const mImageData = mCtx.getImageData(0, 0, w, h);
    const mData = mImageData.data;

    const px = Math.floor(startX);
    const py = Math.floor(startY);
    if (px < 0 || px >= w || py < 0 || py >= h) return;

    const startIdx = (py * w + px) * 4;
    const targetA = sData[startIdx + 3];
    if (targetA < 15) return; // clicked on transparent space

    const targetR = sData[startIdx];
    const targetG = sData[startIdx + 1];
    const targetB = sData[startIdx + 2];

    const visited = new Uint8Array(w * h);
    const queue = [px + py * w];
    visited[px + py * w] = 1;

    const tol = 36;

    while (queue.length > 0) {
      const idx = queue.pop()!;
      const cx = idx % w;
      const cy = Math.floor(idx / w);
      const pIdx = idx * 4;

      // Mark on mask canvas
      mData[pIdx] = 239;
      mData[pIdx + 1] = 68;
      mData[pIdx + 2] = 68;
      mData[pIdx + 3] = 190;

      const neighbors = [
        cx > 0 ? idx - 1 : -1,
        cx < w - 1 ? idx + 1 : -1,
        cy > 0 ? idx - w : -1,
        cy < h - 1 ? idx + w : -1,
      ];

      for (const n of neighbors) {
        if (n >= 0 && !visited[n]) {
          visited[n] = 1;
          const nIdx = n * 4;
          const nA = sData[nIdx + 3];
          if (nA > 20) {
            const diff =
              Math.abs(sData[nIdx] - targetR) +
              Math.abs(sData[nIdx + 1] - targetG) +
              Math.abs(sData[nIdx + 2] - targetB);
            if (diff < tol * 3) {
              queue.push(n);
            }
          }
        }
      }
    }

    mCtx.putImageData(mImageData, 0, 0);
    updateMiniPreview();
  };

  // Clear mask
  const handleClearMask = () => {
    const maskC = maskCanvasRef.current;
    if (!maskC) return;
    const ctx = maskC.getContext('2d')!;
    ctx.clearRect(0, 0, maskC.width, maskC.height);
    updateMiniPreview();
  };

  // Confirm and add part
  const handleConfirmAdd = () => {
    const maskC = maskCanvasRef.current;
    const sourceC = sourceCanvas;
    if (!maskC || !sourceC) return;

    const mW = maskC.width;
    const mH = maskC.height;
    const mCtx = maskC.getContext('2d')!;
    const mData = mCtx.getImageData(0, 0, mW, mH).data;

    let minX = mW;
    let minY = mH;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < mH; y++) {
      for (let x = 0; x < mW; x++) {
        const idx = (y * mW + x) * 4;
        if (mData[idx + 3] > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      alert('请先使用画笔涂抹或框选出想要提取的部位区域！');
      return;
    }

    const selW = maxX - minX + 1;
    const selH = maxY - minY + 1;

    // Create tight cutout canvas
    const partC = document.createElement('canvas');
    partC.width = selW;
    partC.height = selH;
    const pCtx = partC.getContext('2d')!;

    // 1. Draw source image section
    pCtx.drawImage(sourceC, minX, minY, selW, selH, 0, 0, selW, selH);
    // 2. Clip with selection alpha
    pCtx.globalCompositeOperation = 'destination-in';
    pCtx.drawImage(maskC, minX, minY, selW, selH, 0, 0, selW, selH);

    const dataUrl = partC.toDataURL('image/png');

    // Calculate anchor point (1点对1部位: 扎根固定点)
    let ancPixelX = minX + selW / 2;
    let ancPixelY = minY + selH; // default bottom-center (base of ear/hair)

    if (anchorPreset === 'center') {
      ancPixelY = minY + selH / 2;
    } else if (anchorPreset === 'top-center') {
      ancPixelY = minY;
    }

    const anchorNormX = Math.max(0.01, Math.min(0.99, ancPixelX / mW));
    const anchorNormY = Math.max(0.01, Math.min(0.99, ancPixelY / mH));

    const newPart: BouncePart = {
      id: `part_${Date.now()}`,
      name: partName.trim() || `部位 ${existingPartsCount + 1}`,
      imageDataUrl: dataUrl,
      sourceX: minX,
      sourceY: minY,
      sourceW: selW,
      sourceH: selH,
      anchorX: Number(anchorNormX.toFixed(4)),
      anchorY: Number(anchorNormY.toFixed(4)),
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      motion: 'spring',
      amplitudeMult: 1.0,
      speedMult: 1.0,
      phaseDelay: 0.15,
      hollowOutBody: true, // Default hollow out base body so no duplicate ghosting
      visible: true,
    };

    onAddPart(newPart);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-sky-100 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-100 bg-sky-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <Scissors className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>从原图抠出独立回弹部位</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  1点对1部位 · 告别抢点
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                涂抹或框选呆毛、耳朵、尾巴、蝴蝶结等局部，创建独立绑定固定点、支持旋转、挪动与复制回弹的专属部位
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Tools + Canvas */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Canvas Area */}
          <div className="flex-1 bg-stone-900/90 relative flex items-center justify-center p-4 overflow-auto min-h-[320px]">
            <div
              className="relative rounded-lg shadow-xl overflow-hidden cursor-crosshair border border-white/20 select-none l41-transparent-grid"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.1s ease',
              }}
            >
              {/* Background source image canvas */}
              <canvas ref={displayCanvasRef} className="block max-w-full max-h-[55vh]" />

              {/* Red selection mask canvas */}
              <canvas
                ref={maskCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-auto"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
              />
            </div>

            {/* Canvas Zoom Overlay */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white rounded-lg px-2.5 py-1 text-xs flex items-center gap-2 shadow-md">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                className="hover:text-sky-300"
                title="缩小"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                className="hover:text-sky-300"
                title="放大"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="text-[10px] text-stone-300 hover:text-white border-l border-white/20 pl-2"
              >
                重置
              </button>
            </div>
          </div>

          {/* Right Sidebar: Tools & Settings */}
          <div className="w-full md:w-72 bg-white border-t md:border-t-0 md:border-l border-sky-100 p-4 flex flex-col justify-between overflow-y-auto gap-4">
            <div className="flex flex-col gap-4">
              {/* Tool Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  🛠️ 选区工具
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTool('brush')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                      tool === 'brush'
                        ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-2xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Paintbrush className="w-3.5 h-3.5 text-sky-600" />
                    <span>画笔涂抹</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTool('box')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                      tool === 'box'
                        ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-2xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Square className="w-3.5 h-3.5 text-sky-600" />
                    <span>矩形框选</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTool('wand')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                      tool === 'wand'
                        ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-2xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>魔棒识别</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTool('eraser')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                      tool === 'eraser'
                        ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-2xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5 text-rose-500" />
                    <span>选区擦除</span>
                  </button>
                </div>
              </div>

              {/* Brush size slider (if brush or eraser) */}
              {(tool === 'brush' || tool === 'eraser') && (
                <div className="bg-sky-50/50 p-2.5 rounded-xl border border-sky-100 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span className="font-medium">笔刷粗细</span>
                    <span className="font-mono font-bold text-sky-700">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="80"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full h-1.5 bg-sky-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                  />
                </div>
              )}

              {/* Clear button */}
              <button
                type="button"
                onClick={handleClearMask}
                className="w-full py-1.5 px-3 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                <span>清空重选选区</span>
              </button>

              <hr className="border-stone-100" />

              {/* Part Name & Suggestions */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  🏷️ 部位名称
                </label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-sky-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="如：呆毛、猫耳、小裙子"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {suggestionNames.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPartName(s)}
                      className="px-2 py-0.5 text-[11px] rounded-md bg-stone-100 hover:bg-sky-100 hover:text-sky-700 text-stone-600 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anchor Preset: 1 Point to 1 Part! */}
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1.5">
                  <span>📍 固定点扎根默认位置</span>
                  <span className="text-[10px] text-sky-600 font-normal">1对1扎根</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAnchorPreset('bottom-center')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                      anchorPreset === 'bottom-center'
                        ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    底部扎根
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnchorPreset('center')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                      anchorPreset === 'center'
                        ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    中心扎根
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnchorPreset('top-center')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
                      anchorPreset === 'top-center'
                        ? 'border-sky-500 bg-sky-50 text-sky-700 font-bold'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    顶部扎根
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  提示：呆毛/耳朵/尾巴建议选“底部扎根”，可在生成动效时如同扎根植物般摇摆！
                </p>
              </div>

              {/* Real-time Cutout Preview Card */}
              <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-100 flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-stone-900 border border-stone-300/40 flex items-center justify-center shrink-0 overflow-hidden l41-transparent-grid">
                  <canvas ref={previewCanvasRef} width={64} height={64} className="block" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-800">
                    {hasSelection ? '已就绪部位' : '等待划选'}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    {hasSelection
                      ? '已自动识别边缘，添加后可自由旋转、拖动挪动或一键复制！'
                      : '请在左侧图片涂抹想要抠出的区域'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-3 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={!hasSelection}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                  hasSelection
                    ? 'bg-sky-500 hover:bg-sky-600 text-white active:scale-95'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>完成添加部位</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
