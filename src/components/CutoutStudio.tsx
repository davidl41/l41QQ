import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Sparkles,
  Wand2,
  Eraser,
  RotateCcw,
  RotateCw,
  Crop,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Paintbrush,
  Plus,
  Trash2,
  Star,
  Image as ImageIcon,
  X,
  Smile,
  Layers,
  Scissors,
  Undo2,
  Redo2,
} from 'lucide-react';
import {
  removeBorderBackground,
  removeWhiteBackground,
  magicWandAt,
  applyBrush,
  smoothEdgeAntiAliasing,
  trimTransparent,
} from '../utils/cutout';
import {
  getAllPresets,
  saveStoredCustomPreset,
  deleteStoredCustomPreset,
  getDefaultPresetId,
  setDefaultPresetId,
} from '../utils/customPresets';
import { PresetCharacter } from '../types/veo';
import { BouncePart } from '../types/gif';

interface CutoutStudioProps {
  onCutoutUpdated: (canvas: HTMLCanvasElement) => void;
  onLocalMaskUpdated?: (canvas: HTMLCanvasElement | null) => void;
  onCustomAccessoryCreated?: (dataUrl: string) => void;
  onAddBouncePart?: (part: BouncePart) => void;
  existingParts?: BouncePart[];
}

type StudioTab = 'cutout' | 'localMask';
type ToolMode = 'auto' | 'wand' | 'eraser' | 'restore';

export const CutoutStudio: React.FC<CutoutStudioProps> = ({
  onCutoutUpdated,
  onLocalMaskUpdated,
  onCustomAccessoryCreated,
  onAddBouncePart,
  existingParts = [],
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('cutout');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentTool, setCurrentTool] = useState<ToolMode>('auto');
  const [tolerance, setTolerance] = useState(25);
  const [brushSize, setBrushSize] = useState(24);
  const [zoom, setZoom] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);

  // Undo / Redo history stack (Ctrl+Z / Ctrl+Y)
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveUndoSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStackRef.current.push(snap);
    if (undoStackRef.current.length > 20) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStackRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentSnap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    redoStackRef.current.push(currentSnap);

    const prevSnap = undoStackRef.current.pop()!;
    canvas.width = prevSnap.width;
    canvas.height = prevSnap.height;
    ctx.putImageData(prevSnap, 0, 0);

    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    notifyUpdated();
  };

  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentSnap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStackRef.current.push(currentSnap);

    const nextSnap = redoStackRef.current.pop()!;
    canvas.width = nextSnap.width;
    canvas.height = nextSnap.height;
    ctx.putImageData(nextSnap, 0, 0);

    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    notifyUpdated();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Local Mask Brush State
  const [maskBrushMode, setMaskBrushMode] = useState<'paint' | 'erase'>('paint');
  const [hasLocalMask, setHasLocalMask] = useState(false);

  // Preset list state
  const [presets, setPresets] = useState<PresetCharacter[]>([]);
  const [activePresetId, setActivePresetId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Preset Modal State
  const [newPresetName, setNewPresetName] = useState('爱希娜雨妲海');
  const [newPresetImage, setNewPresetImage] = useState<string>('');
  const [setAsDefault, setSetAsDefault] = useState(true);

  // Custom Accessory Upload & Cutout Modal
  const [showAccessoryModal, setShowAccessoryModal] = useState(false);
  const [accRawImage, setAccRawImage] = useState<string>('');
  const [accTolerance, setAccTolerance] = useState(30);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const accCanvasRef = useRef<HTMLCanvasElement>(null);

  const originalImageDataRef = useRef<ImageData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const accFileInputRef = useRef<HTMLInputElement>(null);

  // Refresh preset list
  const refreshPresets = () => {
    const list = getAllPresets();
    setPresets(list);
    return list;
  };

  useEffect(() => {
    const list = refreshPresets();
    const defaultId = getDefaultPresetId();
    const target = list.find((p) => p.id === defaultId) || list[0];
    if (target) {
      setActivePresetId(target.id);
      loadSourceImage(target.imageDataUrl);
    }
  }, []);

  // Listen to clipboard paste events
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              if (showAddModal) {
                setNewPresetImage(res);
              } else if (showAccessoryModal) {
                setAccRawImage(res);
                loadAccImage(res);
              } else {
                loadSourceImage(res);
              }
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showAddModal, showAccessoryModal]);

  // Rotate canvas 90° clockwise or counter-clockwise
  const rotateCanvas90 = (clockwise = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveUndoSnapshot();
    const oldW = canvas.width;
    const oldH = canvas.height;
    const tempC = document.createElement('canvas');
    tempC.width = oldW;
    tempC.height = oldH;
    tempC.getContext('2d')!.drawImage(canvas, 0, 0);

    canvas.width = oldH;
    canvas.height = oldW;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(((clockwise ? 90 : -90) * Math.PI) / 180);
    ctx.drawImage(tempC, -oldW / 2, -oldH / 2);
    ctx.restore();

    initMaskCanvas(canvas.width, canvas.height);
    notifyUpdated();
  };

  const rotateCanvas180 = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveUndoSnapshot();
    const oldW = canvas.width;
    const oldH = canvas.height;
    const tempC = document.createElement('canvas');
    tempC.width = oldW;
    tempC.height = oldH;
    tempC.getContext('2d')!.drawImage(canvas, 0, 0);

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI);
    ctx.drawImage(tempC, -oldW / 2, -oldH / 2);
    ctx.restore();

    initMaskCanvas(canvas.width, canvas.height);
    notifyUpdated();
  };

  const loadSourceImage = (src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const maxDim = 1600;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      originalImageDataRef.current = ctx.getImageData(0, 0, w, h);
      setImageLoaded(true);

      // Reset and resize local mask canvas
      initMaskCanvas(w, h);

      // Auto run one-click background cutout on initial load
      handleAutoCutout();
    };
    img.src = src;
  };

  const initMaskCanvas = (w: number, h: number) => {
    const mCanvas = maskCanvasRef.current;
    if (!mCanvas) return;
    mCanvas.width = w;
    mCanvas.height = h;
    const mCtx = mCanvas.getContext('2d')!;
    mCtx.clearRect(0, 0, w, h);
    setHasLocalMask(false);
    if (onLocalMaskUpdated) onLocalMaskUpdated(null);
  };

  // 1. Auto Cutout
  const handleAutoCutout = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveUndoSnapshot();
    removeBorderBackground(canvas, tolerance);
    smoothEdgeAntiAliasing(canvas);
    notifyUpdated();
  };

  const handleDeepCleanBackground = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveUndoSnapshot();
    removeBorderBackground(canvas, Math.max(38, Math.round(tolerance * 1.35)));
    smoothEdgeAntiAliasing(canvas);
    notifyUpdated();
  };

  const handleSmoothEdges = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    smoothEdgeAntiAliasing(canvas);
    notifyUpdated();
  };

  const handleTrim = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const trimmed = trimTransparent(canvas, 10);
    canvas.width = trimmed.width;
    canvas.height = trimmed.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(trimmed, 0, 0);

    initMaskCanvas(trimmed.width, trimmed.height);
    notifyUpdated();
  };

  const handleReset = () => {
    const canvas = canvasRef.current;
    const orig = originalImageDataRef.current;
    if (!canvas || !orig) return;
    canvas.width = orig.width;
    canvas.height = orig.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.putImageData(orig, 0, 0);
    initMaskCanvas(orig.width, orig.height);
    notifyUpdated();
  };

  // 扣完贴图再扣出主体
  const handleCutoutBodyExcludingParts = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    saveUndoSnapshot();

    // 1. 智能去底
    removeBorderBackground(canvas, tolerance);
    smoothEdgeAntiAliasing(canvas);

    // 2. 将所有已提取好的贴图/耳朵部位从主体中彻底扣除 (destination-out)
    if (existingParts && existingParts.length > 0) {
      const ctx = canvas.getContext('2d')!;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';

      for (const part of existingParts) {
        if (part.type === 'cutout' || !part.type) {
          const pImg = new Image();
          pImg.src = part.imageDataUrl;
          if (pImg.complete && pImg.naturalWidth > 0) {
            ctx.drawImage(pImg, part.sourceX, part.sourceY, part.sourceW, part.sourceH);
          } else {
            ctx.clearRect(part.sourceX, part.sourceY, part.sourceW, part.sourceH);
          }
        }
      }
      ctx.restore();
      smoothEdgeAntiAliasing(canvas);
    }

    notifyUpdated();
    alert('✨ 成功扣出纯净主体！\n\n已将所有已提取贴图从主体中完全抠除，主体干净独立，贴图与主体各自独立回弹、绝无重叠！');
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetImage) return;

    const newId = `custom-${Date.now()}`;
    const name = newPresetName.trim() || '自定义角色';

    const newPreset: PresetCharacter = {
      id: newId,
      name,
      title: `${name} (我的预设)`,
      description: '用户上传并保存的预设立绘',
      avatarSvg: newPresetImage,
      imageDataUrl: newPresetImage,
    };

    saveStoredCustomPreset(newPreset);
    if (setAsDefault) {
      setDefaultPresetId(newId);
    }
    setActivePresetId(newId);
    refreshPresets();
    loadSourceImage(newPresetImage);
    setShowAddModal(false);
    setNewPresetImage('');
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定从预设库中删除此角色吗？')) {
      deleteStoredCustomPreset(id);
      const updated = refreshPresets();
      if (activePresetId === id && updated.length > 0) {
        setActivePresetId(updated[0].id);
        loadSourceImage(updated[0].imageDataUrl);
      }
    }
  };

  const notifyUpdated = () => {
    if (canvasRef.current) {
      onCutoutUpdated(canvasRef.current);
    }
  };

  const notifyMaskUpdated = () => {
    if (maskCanvasRef.current && onLocalMaskUpdated) {
      onLocalMaskUpdated(maskCanvasRef.current);
      setHasLocalMask(true);
    }
  };

  const clearLocalMask = () => {
    const mCanvas = maskCanvasRef.current;
    if (!mCanvas) return;
    const mCtx = mCanvas.getContext('2d')!;
    mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);
    setHasLocalMask(false);
    if (onLocalMaskUpdated) onLocalMaskUpdated(null);
  };

  // Custom Accessory Cutout Mini Studio Logic
  const loadAccImage = (src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = accCanvasRef.current;
      if (!c) return;
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      const ctx = c.getContext('2d')!;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);

      // Auto cutout accessory
      removeBorderBackground(c, accTolerance);
      removeWhiteBackground(c, 248);
      smoothEdgeAntiAliasing(c);
    };
    img.src = src;
  };

  const handleAccCutout = () => {
    const c = accCanvasRef.current;
    if (!c) return;
    removeBorderBackground(c, accTolerance);
    removeWhiteBackground(c, 248);
    smoothEdgeAntiAliasing(c);
  };

  const handleAccSave = () => {
    const c = accCanvasRef.current;
    if (!c) return;
    const trimmed = trimTransparent(c, 5);
    const dataUrl = trimmed.toDataURL('image/png');
    if (onCustomAccessoryCreated) {
      onCustomAccessoryCreated(dataUrl);
    }
    setShowAccessoryModal(false);
  };

  // Canvas Interactions
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (activeTab === 'localMask') {
      // Paint or Erase on Local Mask Canvas
      setIsDrawing(true);
      paintOnMask(x, y);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    saveUndoSnapshot();
    if (currentTool === 'wand') {
      magicWandAt(canvas, x, y, tolerance);
      smoothEdgeAntiAliasing(canvas);
      notifyUpdated();
    } else if (currentTool === 'eraser') {
      setIsDrawing(true);
      applyBrush(canvas, x, y, brushSize, 'erase');
      notifyUpdated();
    } else if (currentTool === 'restore') {
      setIsDrawing(true);
      applyBrush(canvas, x, y, brushSize, 'restore', originalImageDataRef.current || undefined);
      notifyUpdated();
    }
  };

  const paintOnMask = (x: number, y: number) => {
    const mCanvas = maskCanvasRef.current;
    if (!mCanvas) return;
    const ctx = mCanvas.getContext('2d')!;
    ctx.save();
    if (maskBrushMode === 'paint') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#f43f5e';
    } else {
      ctx.globalCompositeOperation = 'destination-out';
    }
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    notifyMaskUpdated();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoords(e);

    if (activeTab === 'localMask') {
      paintOnMask(x, y);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (currentTool === 'eraser') {
      applyBrush(canvas, x, y, brushSize, 'erase');
      notifyUpdated();
    } else if (currentTool === 'restore') {
      applyBrush(canvas, x, y, brushSize, 'restore', originalImageDataRef.current || undefined);
      notifyUpdated();
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (activeTab === 'cutout' && canvasRef.current) {
        smoothEdgeAntiAliasing(canvasRef.current);
        notifyUpdated();
      }
    }
  };

  const handleExtractPaintedToPart = () => {
    const maskC = maskCanvasRef.current;
    const sourceC = canvasRef.current;
    if (!maskC || !sourceC || !onAddBouncePart) return;

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
      alert('请先使用画笔在角色上涂抹出想要提取的部位（如呆毛、耳朵、尾巴）！');
      return;
    }

    const selW = maxX - minX + 1;
    const selH = maxY - minY + 1;

    const partC = document.createElement('canvas');
    partC.width = selW;
    partC.height = selH;
    const pCtx = partC.getContext('2d')!;

    pCtx.drawImage(sourceC, minX, minY, selW, selH, 0, 0, selW, selH);
    pCtx.globalCompositeOperation = 'destination-in';
    pCtx.drawImage(maskC, minX, minY, selW, selH, 0, 0, selW, selH);

    const dataUrl = partC.toDataURL('image/png');

    const ancPixelX = minX + selW / 2;
    const ancPixelY = minY + selH;

    const anchorNormX = Math.max(0.01, Math.min(0.99, ancPixelX / mW));
    const anchorNormY = Math.max(0.01, Math.min(0.99, ancPixelY / mH));

    const newPart: BouncePart = {
      id: `part_${Date.now()}`,
      name: `部位 ${Date.now().toString().slice(-4)}`,
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
      hollowOutBody: true,
      visible: true,
    };

    onAddBouncePart(newPart);
    clearLocalMask();
    alert('✨ 成功提取独立回弹部位！\n\n💡 提示：提取独立部位时请“一个部位一次提取”。现在可以继续用画笔涂抹提取下一个部位（如另一只耳朵或呆毛）！');
  };

  return (
    <div className="bg-white/95 rounded-2xl border border-sky-100 p-5 shadow-xs flex flex-col gap-4">
      {/* Studio Header & Tab Switching */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-sky-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            1
          </span>
          <div className="flex items-center gap-1 bg-sky-50/70 p-1 rounded-xl border border-sky-200">
            <button
              type="button"
              onClick={() => setActiveTab('cutout')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'cutout'
                  ? 'bg-white text-sky-800 shadow-xs border border-sky-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 text-sky-600" />
              <span>全图抠图修边</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('localMask')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'localMask'
                  ? 'bg-white text-sky-800 shadow-xs border border-sky-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5 text-sky-600" />
              <span>笔刷划定回弹部位</span>
              {hasLocalMask && (
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons: Upload & Custom Accessory */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAccessoryModal(true)}
            className="px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50/80 hover:bg-sky-100 text-sky-800 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
            title="上传并抠图制作专属于您的贴纸挂件"
          >
            <Smile className="w-3.5 h-3.5 text-sky-600" />
            <span>制作自定义挂件</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = () => loadSourceImage(reader.result as string);
                reader.readAsDataURL(e.target.files[0]);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs shadow-sky-500/20 transition-all active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>上传角色图片</span>
          </button>
        </div>
      </div>

      {/* 预设角色选择栏 */}
      {presets.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 bg-sky-50/40 p-2.5 rounded-xl border border-sky-100">
          <span className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>预设角色：</span>
          </span>
          {presets.map((char) => {
            const isSelected = activePresetId === char.id;
            return (
              <div
                key={char.id}
                onClick={() => {
                  setActivePresetId(char.id);
                  loadSourceImage(char.imageDataUrl);
                }}
                className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs text-slate-700 transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-sky-500 bg-sky-500 text-white font-bold shadow-2xs'
                    : 'border-slate-200 hover:border-sky-300 bg-white hover:bg-sky-50/50'
                }`}
              >
                <img
                  src={char.avatarSvg}
                  alt={char.name}
                  className="w-6 h-6 rounded-full object-cover border border-white/50 shrink-0"
                />
                <span className="max-w-[120px] truncate">{char.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Mode-Specific Toolbar */}
      {activeTab === 'cutout' ? (
        /* TAB 1: Cutout Toolbar */
        <div className="bg-sky-50/40 p-3 rounded-xl border border-sky-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAutoCutout}
              className="px-3 py-1.5 rounded-lg bg-linear-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs shadow-sky-500/20 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>一键智能去底</span>
            </button>

            <button
              type="button"
              onClick={handleSmoothEdges}
              className="px-2.5 py-1.5 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 text-sky-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>边缘平滑抗锯齿</span>
            </button>

            <button
              type="button"
              onClick={handleDeepCleanBackground}
              className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="一键清除外围阴影、水印及淡色残片"
            >
              <span>🧹 强力除水印阴影</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTool('wand')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                currentTool === 'wand'
                  ? 'border-sky-500 bg-sky-500 text-white font-bold shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-sky-50/50'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>魔棒点选</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTool('eraser')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                currentTool === 'eraser'
                  ? 'border-sky-500 bg-sky-500 text-white font-bold shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-sky-50/50'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>橡皮擦</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTool('restore')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                currentTool === 'restore'
                  ? 'border-sky-500 bg-sky-500 text-white font-bold shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-sky-50/50'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>恢复笔</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                canUndo
                  ? 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs active:scale-95 cursor-pointer'
                  : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
              }`}
              title="撤销上一步操作 (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>撤销</span>
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                canRedo
                  ? 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs active:scale-95 cursor-pointer'
                  : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
              }`}
              title="重做下一步操作 (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>重做</span>
            </button>

            <button
              type="button"
              onClick={handleCutoutBodyExcludingParts}
              className="px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="一键将已提取的所有贴图部位从人物身体中彻底抠除，生成纯净独立主体"
            >
              <Scissors className="w-3.5 h-3.5 text-indigo-600" />
              <span>扣完贴图再扣主体 ✂️</span>
            </button>

            <button
              type="button"
              onClick={handleTrim}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs font-medium flex items-center gap-1"
            >
              <Crop className="w-3.5 h-3.5 text-stone-500" />
              <span>紧凑裁剪</span>
            </button>

            <button
              type="button"
              onClick={() => rotateCanvas90(true)}
              className="px-2.5 py-1.5 rounded-lg border border-sky-200 bg-white hover:bg-sky-50 text-sky-800 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="图片顺时针旋转90°"
            >
              <RotateCw className="w-3.5 h-3.5 text-sky-600" />
              <span>旋转90°</span>
            </button>

            <button
              type="button"
              onClick={() => rotateCanvas90(false)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="图片逆时针旋转90°"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>逆90°</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
              <span>重置</span>
            </button>
          </div>
        </div>
      ) : (
        /* TAB 2: Local Bounce Mask Brush Toolbar */
        <div className="flex flex-col gap-2">
          {/* 单部位一次提取提示 */}
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-2">
            <span className="text-base shrink-0">💡</span>
            <span><strong>提取原则：一个部位一次提取！</strong>例如：先涂抹提取<strong>左耳</strong>并点击右侧【提取为独立部位】，完成后再涂抹提取<strong>右耳</strong>或<strong>呆毛</strong>，确保 1:1 独立绑定锚点！</span>
          </div>

          <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-rose-900 flex items-center gap-1">
              <Paintbrush className="w-3.5 h-3.5 text-rose-600" />
              <span>弹力笔刷模式：</span>
            </span>

            <button
              type="button"
              onClick={() => setMaskBrushMode('paint')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
                maskBrushMode === 'paint'
                  ? 'border-rose-500 bg-rose-500 text-white shadow-xs'
                  : 'border-stone-300 bg-white text-stone-700'
              }`}
            >
              <span>🖌️ 涂抹选区</span>
            </button>

            <button
              type="button"
              onClick={() => setMaskBrushMode('erase')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
                maskBrushMode === 'erase'
                  ? 'border-rose-500 bg-rose-500 text-white shadow-xs'
                  : 'border-stone-300 bg-white text-stone-700'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>擦除选区</span>
            </button>

            <button
              type="button"
              onClick={clearLocalMask}
              className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-rose-50 text-stone-700 text-xs font-medium cursor-pointer"
            >
              清空选区
            </button>

            {onAddBouncePart && (
              <button
                type="button"
                onClick={handleExtractPaintedToPart}
                className="px-3 py-1.5 rounded-lg border border-sky-300 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer ml-auto"
                title="将当前红笔涂抹的区域提取为拥有独立固定点、可旋转与挪动复制的独立回弹部位"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>提取为独立回弹部位 ✨</span>
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Sliders: Tolerance / Brush Size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-50/70 p-3 rounded-xl border border-stone-200/80">
        <div className="flex items-center justify-between gap-3">
          <span className="text-stone-600 font-medium flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-rose-500" />
            <span>去底容差 (Tolerance):</span>
          </span>
          <div className="flex items-center gap-2 flex-1 max-w-[200px]">
            <input
              type="range"
              min={5}
              max={65}
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <span className="font-mono text-stone-700 w-6 text-right font-bold">{tolerance}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-stone-600 font-medium flex items-center gap-1">
            <Paintbrush className="w-3.5 h-3.5 text-rose-500" />
            <span>笔刷粗细 (画笔/橡皮):</span>
          </span>
          <div className="flex items-center gap-2 flex-1 max-w-[200px]">
            <input
              type="range"
              min={6}
              max={90}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <span className="font-mono text-stone-700 w-6 text-right font-bold">{brushSize}px</span>
          </div>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative border-2 border-dashed border-sky-200 rounded-2xl overflow-hidden min-h-[360px] flex items-center justify-center p-4 bg-sky-50/20">
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
              linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
              linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)
            `,
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          }}
        />

        {!imageLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-10 bg-white/70 backdrop-blur-2xs">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-xs">
              <Upload className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <span className="text-sm font-bold text-slate-800">画布就绪，请上传角色图片</span>
              <span className="text-xs text-slate-500">
                预设库已为您完全留空。支持直接粘贴截图、拖拽图片到窗口，或点击下方按钮添加角色！
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                选择图片上传
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-white border border-sky-300 text-sky-700 hover:bg-sky-50 text-xs font-bold transition-all active:scale-95"
              >
                ➕ 添加我的预设
              </button>
            </div>
          </div>
        )}

        {/* Character Base Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative max-w-full max-h-[380px] object-contain drop-shadow-md rounded-lg ${
            activeTab === 'localMask'
              ? 'cursor-crosshair'
              : currentTool === 'wand'
              ? 'cursor-crosshair'
              : currentTool === 'eraser' || currentTool === 'restore'
              ? 'cursor-pointer'
              : 'cursor-default'
          }`}
          style={{
            transform: `scale(${zoom})`,
            transition: 'transform 0.15s ease-out',
          }}
        />

        {/* Local Mask Canvas (Overlaid visually on top of character) */}
        <canvas
          ref={maskCanvasRef}
          className={`absolute pointer-events-none max-w-full max-h-[380px] object-contain ${
            activeTab === 'localMask' ? 'opacity-65' : 'opacity-0'
          }`}
          style={{
            transform: `scale(${zoom})`,
            transition: 'opacity 0.2s ease-out',
          }}
        />

        {/* Zoom & Overlay */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-stone-200 shadow-xs text-xs">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1 hover:bg-stone-100 rounded text-stone-600"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-stone-600 min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            className="p-1 hover:bg-stone-100 rounded text-stone-600"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1 hover:bg-stone-100 rounded text-stone-600 ml-1"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Hint Overlay */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow-xs">
            {activeTab === 'localMask'
              ? '涂抹模式：涂红的区域将在动图中获得额外独立Q弹微颤'
              : '去底模式：支持 Ctrl+V 粘贴任何角色图片'}
          </span>
        </div>
      </div>

      {/* Custom Accessory Upload & Cutout Modal */}
      {showAccessoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 relative">
            <button
              type="button"
              onClick={() => setShowAccessoryModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                <Smile className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">上传并制作自定义挂件</h3>
                <p className="text-xs text-stone-500">上传任何图片或贴纸，自动去底并跟随角色一起 Q 弹摆动</p>
              </div>
            </div>

            <div className="space-y-4">
              {!accRawImage ? (
                <div
                  onClick={() => accFileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-300 hover:border-pink-500 bg-stone-50/70 hover:bg-pink-50/30 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                >
                  <input
                    ref={accFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const res = reader.result as string;
                          setAccRawImage(res);
                          loadAccImage(res);
                        };
                        reader.readAsDataURL(e.target.files[0]);
                      }
                    }}
                  />
                  <Upload className="w-8 h-8 text-pink-500 mb-2" />
                  <span className="text-xs font-bold text-stone-700">上传挂件图片（或直接 Ctrl+V 粘贴）</span>
                  <span className="text-[11px] text-stone-500 mt-1">
                    如：专属猫耳、小黄鸭、自定义字牌、搞怪表情包等
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative border border-stone-200 rounded-xl p-4 flex items-center justify-center bg-checkerboard min-h-[220px]">
                    <canvas
                      ref={accCanvasRef}
                      className="max-h-[200px] object-contain drop-shadow"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <span className="font-medium text-stone-700">挂件去底容差:</span>
                    <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                      <input
                        type="range"
                        min={10}
                        max={70}
                        value={accTolerance}
                        onChange={(e) => {
                          setAccTolerance(Number(e.target.value));
                          handleAccCutout();
                        }}
                        className="w-full accent-pink-500 cursor-pointer"
                      />
                      <span className="font-mono text-stone-700 font-bold w-6 text-right">
                        {accTolerance}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setAccRawImage('')}
                      className="text-xs text-stone-500 hover:text-stone-700"
                    >
                      重新上传
                    </button>
                    <button
                      type="button"
                      onClick={handleAccSave}
                      className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-sm"
                    >
                      完成去底并设为当前挂件
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
