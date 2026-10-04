import React, { useState, useRef, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  Activity,
  Clock,
  Palette,
  Maximize2,
  Gauge,
  Film,
  Smile,
  ShieldCheck,
  Sun,
  Move,
  Radio,
  Plus,
  Trash2,
  Upload,
  RotateCw,
  Compass,
  MapPin,
  ChevronDown,
  ChevronUp,
  Copy,
  Scissors,
  Eye,
  EyeOff,
  RotateCcw,
  Image as ImageIcon,
  MessageSquare,
} from 'lucide-react';
import {
  BounceConfig,
  BounceMotion,
  GifBgType,
  AccessoryType,
  BounceDirection,
  BouncePart,
} from '../types/gif';
import { autoCutoutAccessoryImage } from '../utils/customAccessories';
import { renderPresetStickerToDataUrl } from '../utils/accessoriesRenderer';
import { CutoutPartModal } from './CutoutPartModal';
import { TextBubbleModal } from './TextBubbleModal';

interface BounceControlsProps {
  config: BounceConfig;
  onChange: (newConfig: BounceConfig) => void;
  sourceCanvas?: HTMLCanvasElement | null;
  onAddPart?: (part: BouncePart) => void;
}

const MOTION_OPTIONS: {
  id: BounceMotion;
  name: string;
  emoji: string;
  desc: string;
  tag: string;
  highlight?: boolean;
}[] = [
  {
    id: 'spring-sway',
    name: '弹簧左右摇摆',
    emoji: '🌾',
    desc: '左右自然钟摆式回弹摇摆，带柔韧弹簧滞后与微微下蹲形变',
    tag: '治愈摆动',
    highlight: true,
  },
  {
    id: 'jelly-duang',
    name: '经典果冻Duang',
    emoji: '🍮',
    desc: '最正统的果冻软糖垂直大幅度蓄力压扁与高弹回弹拉伸',
    tag: '招牌Q弹',
    highlight: true,
  },
  {
    id: 'trampoline-hop',
    name: '蹦床超弹跳',
    emoji: '🦘',
    desc: '深度压缩蓄力冲刺拉伸，滞空微颤与Duang轻盈落地',
    tag: '动感欢脱',
  },
  {
    id: 'belly-breathe',
    name: '腮帮肚肚鼓动',
    emoji: '🐡',
    desc: '脸颊与身体两侧横向向外鼓起膨胀，傲娇生气或吃饱鼓鼓',
    tag: '搞怪膨胀',
  },
  {
    id: 'jelly-jiggle',
    name: '布丁果冻微颤',
    emoji: '🍧',
    desc: '如手指轻弹布丁般的高频密集弹性体态震颤，软糯可口',
    tag: '布丁微颤',
  },
  {
    id: 'floating-bubble',
    name: '漂浮软萌漫游',
    emoji: '🫧',
    desc: '如微风中漂浮的软萌泡泡，零重力失重慢摇与呼吸起伏',
    tag: '失重漫游',
  },
  {
    id: 'dough-knead',
    name: '糯米团挤压揉捏',
    emoji: '🥟',
    desc: '对角线与水平交替挤压拉伸形变，像被手掌轻柔揉捏的软糯麻薯糍粑',
    tag: '软糯形变',
  },
  {
    id: 'heartbeat-pulse',
    name: '心跳砰砰律动',
    emoji: '💓',
    desc: '双连发扑通扑通搏动收缩与扩张，治愈且具有节奏感',
    tag: '治愈节拍',
  },
];

const MOTION_PRESET_CONFIGS: Record<BounceMotion, {
  amplitude: number;
  speed: number;
  easing: number;
  bounceDirection: BounceDirection;
  bounceAngle: number;
  groundShadow: boolean;
  impactRipple: boolean;
}> = {
  'spring-sway': {
    amplitude: 0.28,
    speed: 1.1,
    easing: 35,
    bounceDirection: 'custom',
    bounceAngle: 0,
    groundShadow: true,
    impactRipple: false,
  },
  'jelly-duang': {
    amplitude: 0.32,
    speed: 1.2,
    easing: 60,
    bounceDirection: 'custom',
    bounceAngle: 0,
    groundShadow: true,
    impactRipple: true,
  },
  'trampoline-hop': {
    amplitude: 0.38,
    speed: 1.3,
    easing: 75,
    bounceDirection: 'custom',
    bounceAngle: 0,
    groundShadow: true,
    impactRipple: true,
  },
  'belly-breathe': {
    amplitude: 0.24,
    speed: 1.1,
    easing: 35,
    bounceDirection: 'custom',
    bounceAngle: 0,
    groundShadow: false,
    impactRipple: false,
  },
  'jelly-jiggle': {
    amplitude: 0.15,
    speed: 2.0,
    easing: 20,
    bounceDirection: 'custom',
    bounceAngle: 0,
    groundShadow: true,
    impactRipple: false,
  },
  'floating-bubble': {
    amplitude: 0.18,
    speed: 0.8,
    easing: 30,
    bounceDirection: 'custom',
    bounceAngle: 15,
    groundShadow: false,
    impactRipple: false,
  },
  'dough-knead': {
    amplitude: 0.26,
    speed: 1.0,
    easing: 40,
    bounceDirection: 'custom',
    bounceAngle: 45,
    groundShadow: true,
    impactRipple: true,
  },
  'heartbeat-pulse': {
    amplitude: 0.22,
    speed: 1.5,
    easing: 55,
    bounceDirection: 'custom',
    bounceAngle: 0,
    groundShadow: false,
    impactRipple: false,
  },
};

const PRESET_STICKERS: {
  id: 'sweat' | 'heart' | 'stars' | 'music';
  name: string;
  emoji: string;
  defaultMotion: 'spring' | 'jiggle' | 'orbit-spin' | 'sway' | 'breathe';
}[] = [
  { id: 'sweat', name: '漫画大汗滴', emoji: '💦', defaultMotion: 'jiggle' },
  { id: 'heart', name: '悬浮爱心', emoji: '💖', defaultMotion: 'breathe' },
  { id: 'stars', name: '眩晕小星星', emoji: '💫', defaultMotion: 'orbit-spin' },
  { id: 'music', name: '动感音符', emoji: '🎵', defaultMotion: 'spring' },
];

const BG_OPTIONS: { id: GifBgType; name: string; previewClass: string }[] = [
  { id: 'transparent', name: '透明背景 (微信/QQ表情包)', previewClass: 'border-sky-400 bg-checkerboard' },
  { id: 'white', name: '纯白背景', previewClass: 'bg-white border-stone-300' },
  { id: 'pink', name: '蜜桃浅粉', previewClass: 'bg-rose-100 border-rose-300' },
  { id: 'dark', name: '极夜深黑', previewClass: 'bg-stone-900 border-stone-700' },
];

export const BounceControls: React.FC<BounceControlsProps> = ({
  config,
  onChange,
  sourceCanvas,
  onAddPart,
}) => {
  const currentEasing = config.easing ?? 35;
  const [isUploadingSticker, setIsUploadingSticker] = useState(false);
  const stickerFileInputRef = useRef<HTMLInputElement>(null);
  const [showCutoutModal, setShowCutoutModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);

  // 折叠卡片状态控制 (进入界面自动收起所有功能)
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    motion: false,
    parts: false,
    effects: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getEasingLabel = (val: number) => {
    if (val <= 12) return { name: '匀速 (Linear)', desc: '机械无加速度，平滑线性循环' };
    if (val <= 45) return { name: '平滑正弦 (Sine)', desc: '经典平滑缓入缓出，丝滑呼吸感' };
    if (val <= 75) return { name: '回弹过冲 (Back)', desc: '弹簧拉力过冲，具有明显弹性反弹' };
    return { name: '真实弹跳 (Bounce)', desc: '像小球落地般多段反弹阻尼跳动' };
  };

  const easingInfo = getEasingLabel(currentEasing);

  const handleFpsChange = (newFps: number) => {
    const recommendedFrames = newFps >= 50 ? 40 : newFps >= 30 ? 30 : 24;
    onChange({ ...config, fps: newFps, frameCount: recommendedFrames });
  };

  const toggleWechatMode = () => {
    const nextVal = !config.wechatOptimized;
    if (nextVal) {
      onChange({
        ...config,
        wechatOptimized: true,
        outputSize: 240,
        fps: Math.min(config.fps, 24),
        frameCount: Math.min(config.frameCount, 26),
      });
    } else {
      onChange({
        ...config,
        wechatOptimized: false,
        outputSize: 480,
      });
    }
  };

  // Parts / Stickers management
  const parts = config.localBounce?.parts || [];
  const activePartId = config.localBounce?.activePartId || parts[0]?.id;
  const activePart = parts.find((p) => p.id === activePartId) || parts[0];

  const handleSelectActivePart = (id: string) => {
    onChange({
      ...config,
      localBounce: {
        ...config.localBounce,
        activePartId: id,
      },
    });
  };

  const handleAddPartInternal = (newPart: BouncePart) => {
    const updated = [...parts, newPart];
    onChange({
      ...config,
      localBounce: {
        ...config.localBounce,
        enabled: true,
        parts: updated,
        activePartId: newPart.id,
        anchors: updated.map((p) => ({
          id: p.id,
          name: p.name,
          anchorX: p.anchorX,
          anchorY: p.anchorY,
          motion: p.motion,
        })),
      },
    });
    if (onAddPart) {
      onAddPart(newPart);
    }
  };

  // 添加预设漫画贴图 (汗滴、爱心、星星、音符，预先调优最佳参数开箱即用)
  const handleAddPresetSticker = (preset: typeof PRESET_STICKERS[number]) => {
    const dataUrl = renderPresetStickerToDataUrl(preset.id);
    const params = {
      sweat: { motion: 'jiggle' as const, amplitudeMult: 1.2, speedMult: 2.0, easing: 25, anchorX: 0.72, anchorY: 0.28 },
      heart: { motion: 'breathe' as const, amplitudeMult: 1.1, speedMult: 1.3, easing: 45, anchorX: 0.68, anchorY: 0.22 },
      stars: { motion: 'orbit-spin' as const, amplitudeMult: 1.0, speedMult: 1.2, easing: 30, anchorX: 0.5, anchorY: 0.15 },
      music: { motion: 'spring' as const, amplitudeMult: 1.2, speedMult: 1.4, easing: 50, anchorX: 0.75, anchorY: 0.28 },
    }[preset.id] || { motion: 'spring' as const, amplitudeMult: 1.0, speedMult: 1.0, easing: 35, anchorX: 0.5, anchorY: 0.5 };

    const newPart: BouncePart = {
      id: `sticker_${Date.now()}`,
      name: preset.name,
      type: 'preset-sticker',
      imageDataUrl: dataUrl,
      sourceX: 0,
      sourceY: 0,
      sourceW: 90,
      sourceH: 90,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      ...params,
      hollowOutBody: false,
      visible: true,
    };
    handleAddPartInternal(newPart);
  };

  // 上传自选本地贴纸
  const handleUploadCustomSticker = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSticker(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUrl = reader.result as string;
      const cutoutDataUrl = await autoCutoutAccessoryImage(rawDataUrl, 32);
      const stickerName = file.name.replace(/\.[^/.]+$/, '').slice(0, 10);

      const newPart: BouncePart = {
        id: `sticker_${Date.now()}`,
        name: stickerName || '自制贴纸',
        type: 'custom-upload',
        imageDataUrl: cutoutDataUrl,
        sourceX: 0,
        sourceY: 0,
        sourceW: 100,
        sourceH: 100,
        anchorX: 0.5,
        anchorY: 0.5,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        motion: 'spring',
        amplitudeMult: 1.0,
        speedMult: 1.0,
        easing: 35,
        hollowOutBody: false,
        visible: true,
      };

      handleAddPartInternal(newPart);
      setIsUploadingSticker(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 抠图复制功能
  const handleMirrorCopyPart = (partToMirror: BouncePart, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = `part_${Date.now()}`;
    const mirroredAnchorX = Number(Math.max(0.02, Math.min(0.98, 1.0 - partToMirror.anchorX)).toFixed(4));
    const mirroredOffsetX = -partToMirror.offsetX;

    const mirrored: BouncePart = {
      ...partToMirror,
      id: newId,
      name: `${partToMirror.name} (镜像)`,
      anchorX: mirroredAnchorX,
      offsetX: mirroredOffsetX,
      flipH: !partToMirror.flipH,
      hollowOutBody: false,
      visible: true,
    };
    const updated = [...parts, mirrored];
    onChange({
      ...config,
      localBounce: {
        ...config.localBounce,
        parts: updated,
        activePartId: newId,
        anchors: updated.map((p) => ({
          id: p.id,
          name: p.name,
          anchorX: p.anchorX,
          anchorY: p.anchorY,
          motion: p.motion,
        })),
      },
    });
  };

  const handleMoveLayer = (partId: string, direction: 'up' | 'down') => {
    const idx = parts.findIndex((p) => p.id === partId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
    if (targetIdx < 0 || targetIdx >= parts.length) return;

    const newParts = [...parts];
    const temp = newParts[idx];
    newParts[idx] = newParts[targetIdx];
    newParts[targetIdx] = temp;

    onChange({
      ...config,
      localBounce: {
        ...config.localBounce,
        parts: newParts,
        anchors: newParts.map((p) => ({
          id: p.id,
          name: p.name,
          anchorX: p.anchorX,
          anchorY: p.anchorY,
          motion: p.motion,
        })),
      },
    });
  };

  const handleDuplicatePart = (partToDup: BouncePart, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = `part_${Date.now()}`;
    const cloned: BouncePart = {
      ...partToDup,
      id: newId,
      name: `${partToDup.name} (副本)`,
      offsetX: partToDup.offsetX + 25,
      offsetY: partToDup.offsetY + 25,
      anchorX: Number(Math.min(0.98, partToDup.anchorX + 0.04).toFixed(4)),
      anchorY: Number(Math.min(0.98, partToDup.anchorY + 0.04).toFixed(4)),
      hollowOutBody: false,
      visible: true,
    };
    const updated = [...parts, cloned];
    onChange({
      ...config,
      localBounce: {
        ...config.localBounce,
        parts: updated,
        activePartId: newId,
        anchors: updated.map((p) => ({
          id: p.id,
          name: p.name,
          anchorX: p.anchorX,
          anchorY: p.anchorY,
          motion: p.motion,
        })),
      },
    });
  };

  const handleDeletePart = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = parts.filter((p) => p.id !== idToDelete);
    onChange({
      ...config,
      localBounce: {
        ...config.localBounce,
        parts: updated,
        activePartId: updated[0]?.id,
        anchors: updated.map((p) => ({
          id: p.id,
          name: p.name,
          anchorX: p.anchorX,
          anchorY: p.anchorY,
          motion: p.motion,
        })),
      },
    });
  };

  const handleUpdatePart = (partId: string, updates: Partial<BouncePart>) => {
    const updated = parts.map((p) => (p.id === partId ? { ...p, ...updates } : p));
    onChange({
      ...config,
      localBounce: {
        ...config.localBounce,
        parts: updated,
        anchors: updated.map((p) => ({
          id: p.id,
          name: p.name,
          anchorX: p.anchorX,
          anchorY: p.anchorY,
          motion: p.motion,
        })),
      },
    });
  };

  return (
    <div className="bg-white/95 rounded-2xl border border-sky-100 p-5 shadow-xs flex flex-col gap-4">
      {/* Title Bar */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-sky-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            2
          </span>
          <h2 className="text-base font-bold text-slate-800">
            Q 弹动效、贴图挂件与独立回弹
          </h2>
        </div>

        {/* WeChat Preset Pill */}
        <button
          type="button"
          onClick={toggleWechatMode}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
            config.wechatOptimized
              ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          <span>{config.wechatOptimized ? '微信表情规范已开启 (<1MB)' : '一键微信表情包规范'}</span>
        </button>
      </div>

      {/* ===================== 功能 1: 角色整体 Q 弹物理律动、缓动阻尼与回弹方向 (折叠卡片) ===================== */}
      <div className="rounded-xl border border-sky-200/80 overflow-hidden bg-white shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection('motion')}
          className="w-full flex items-center justify-between p-3.5 bg-sky-50/60 hover:bg-sky-100/50 transition-colors text-left"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold text-slate-800">
                1. 角色整体 Q 弹物理律动、缓动阻尼与方向
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold border border-sky-200">
                {MOTION_OPTIONS.find((m) => m.id === config.motion)?.name || '律动'} · {easingInfo.name} · {config.bounceAngle ?? 0}°
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              短介绍：选择全身动作模式，调节弹性幅度与速度，支持物理重力缓动阻尼手感与 0°~360° 任意回弹物理方向。
            </p>
          </div>
          <div className="flex items-center gap-1 text-sky-600 text-xs font-medium shrink-0 ml-2">
            <span>{expandedSections.motion ? '收起' : '展开'}</span>
            {expandedSections.motion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {expandedSections.motion && (
          <div className="p-4 flex flex-col gap-4 border-t border-sky-100 bg-sky-50/20">
            {/* Motion Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MOTION_OPTIONS.map((m) => {
                const isSelected = config.motion === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      const p = MOTION_PRESET_CONFIGS[m.id];
                      onChange({
                        ...config,
                        motion: m.id,
                        ...(p || {}),
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col gap-1 ${
                      isSelected
                        ? 'border-sky-500 bg-sky-500 text-white shadow-xs'
                        : 'border-slate-200 hover:border-sky-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{m.emoji}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {m.tag}
                      </span>
                    </div>
                    <span className="text-xs font-bold leading-tight">{m.name}</span>
                    <span className={`text-[10px] leading-snug ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                      {m.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sliders: Amplitude & Speed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-sky-100 text-xs">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-sky-600" />
                    <span>挤压回弹幅度:</span>
                  </span>
                  <span className="font-mono font-bold text-sky-700">
                    {Math.round(config.amplitude * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={config.amplitude}
                  onChange={(e) => onChange({ ...config, amplitude: Number(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>律动速度:</span>
                  </span>
                  <span className="font-mono font-bold text-sky-700">
                    {config.speed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={2.5}
                  step={0.1}
                  value={config.speed}
                  onChange={(e) => onChange({ ...config, speed: Number(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </div>

            {/* 物理重力缓动阻尼手感 (从功能4整合至功能1) */}
            <div className="bg-white p-3.5 rounded-xl border border-sky-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-sky-600" />
                  <span>物理重力缓动阻尼手感 (Easing):</span>
                </span>
                <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  {easingInfo.name} ({currentEasing})
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={currentEasing}
                onChange={(e) => onChange({ ...config, easing: Number(e.target.value) })}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">{easingInfo.desc}</p>
            </div>

            {/* 物理真实果冻增强开关组 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="flex items-start gap-2 p-2.5 rounded-xl border border-sky-100 bg-white cursor-pointer hover:bg-sky-50/50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.volumeConservation ?? true}
                  onChange={(e) => onChange({ ...config, volumeConservation: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 mt-0.5 cursor-pointer shrink-0"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>🎈 物理体积守恒</span>
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    压扁时两侧自然肉感膨胀
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2.5 rounded-xl border border-sky-100 bg-white cursor-pointer hover:bg-sky-50/50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.jellyBulge ?? true}
                  onChange={(e) => onChange({ ...config, jellyBulge: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 mt-0.5 cursor-pointer shrink-0"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>🍮 弧线抛物线鼓肚</span>
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    非线性腰线饱满弧形形变
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2.5 rounded-xl border border-sky-100 bg-white cursor-pointer hover:bg-sky-50/50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.jellyGloss ?? true}
                  onChange={(e) => onChange({ ...config, jellyGloss: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 mt-0.5 cursor-pointer shrink-0"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>✨ 水润果冻弧形高光</span>
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    日系动漫布丁高光质感
                  </span>
                </div>
              </label>
            </div>

            {/* 回弹物理方向 (0° ~ 360° 任意角度自调) */}
            <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-200/80 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-slate-800">
                    回弹物理方向 (0° ~ 360° 任意角度自调)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-sky-200">
                    <input
                      type="number"
                      min={0}
                      max={360}
                      value={config.bounceAngle ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(360, Number(e.target.value) || 0));
                        onChange({ ...config, bounceDirection: 'custom', bounceAngle: val });
                      }}
                      className="w-10 text-right text-xs font-mono font-bold text-sky-700 focus:outline-none"
                    />
                    <span className="text-xs text-sky-700 font-bold">°</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange({ ...config, bounceDirection: 'custom', bounceAngle: 0 })}
                    className="text-[11px] text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                    title="重置为垂直 0°"
                  >
                    重置垂直(0°)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Visual compass/angle pointer */}
                <div
                  className="w-10 h-10 rounded-full border border-sky-300 bg-white shadow-2xs flex items-center justify-center shrink-0 relative overflow-hidden"
                  title={`当前回弹方向：${config.bounceAngle ?? 0}°`}
                >
                  <div
                    className="w-1 h-4 bg-sky-500 rounded-full origin-bottom"
                    style={{
                      transform: `rotate(${config.bounceAngle ?? 0}deg)`,
                      transition: 'transform 0.1s ease-out',
                    }}
                  />
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-700 absolute" />
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={config.bounceAngle ?? 0}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        bounceDirection: 'custom',
                        bounceAngle: Number(e.target.value),
                      })
                    }
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0° 垂直向上</span>
                    <span>90° 水平向右</span>
                    <span>180° 垂直向下</span>
                    <span>270° 水平向左</span>
                    <span>360°</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================== 功能 2: 独立贴图、挂件与局部回弹 (功能2+功能3归并) ===================== */}
      <div className="rounded-xl border border-sky-200/80 overflow-hidden bg-white shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection('parts')}
          className="w-full flex items-center justify-between p-3.5 bg-sky-50/60 hover:bg-sky-100/50 transition-colors text-left"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold text-slate-800">
                2. 独立贴图、挂件与局部回弹
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold border border-sky-200">
                {config.localBounce?.enabled
                  ? `已启用 · 共 ${parts.length} 个贴图/部位`
                  : '未启用'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              短介绍：支持原图抠图或上传贴纸，点击贴图加锚点，调整回弹效果、幅度、速度与物理阻尼手感，纯鼠标拖拽操作。
            </p>
          </div>
          <div className="flex items-center gap-1 text-sky-600 text-xs font-medium shrink-0 ml-2">
            <span>{expandedSections.parts ? '收起' : '展开'}</span>
            {expandedSections.parts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {expandedSections.parts && (
          <div className="p-4 flex flex-col gap-4 border-t border-sky-100 bg-sky-50/20">
            {/* Top Switch & Quick Add Sources */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-sky-100">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.localBounce?.enabled ?? true}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        localBounce: {
                          ...config.localBounce,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                  />
                  <span>开启贴图与局部独立回弹</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.localBounce?.onlyPartBounces ?? false}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        localBounce: {
                          ...config.localBounce,
                          onlyPartBounces: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>仅贴图部位跳动（主体静止）</span>
                </label>
              </div>

              {/* Add actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCutoutModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>从原图抠图添加 ✂️</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowTextModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>添加文字气泡 💬</span>
                </button>

                <button
                  type="button"
                  onClick={() => stickerFileInputRef.current?.click()}
                  disabled={isUploadingSticker}
                  className="px-3 py-1.5 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-600" />
                  <span>{isUploadingSticker ? '上传中...' : '上传自选贴纸 📤'}</span>
                  <input
                    ref={stickerFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCustomSticker}
                    className="hidden"
                  />
                </button>
              </div>
            </div>

            {/* Quick Add Preset Stickers Bar */}
            <div className="bg-white p-3 rounded-xl border border-sky-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <span>快速添加漫画预设贴图：</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRESET_STICKERS.map((stk) => (
                  <button
                    key={stk.id}
                    type="button"
                    onClick={() => handleAddPresetSticker(stk)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-sky-300 bg-white hover:bg-sky-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                    title={`添加 ${stk.name}`}
                  >
                    <span>{stk.emoji}</span>
                    <span>{stk.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 贴图/部位列表与独立管理 */}
            <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-200/90 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>当前贴图列表（共 {parts.length} 个贴图，点击贴图在画布弹出对应锚点）：</span>
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  ✓ 锚点作为贴图属性 · 绝不重复识别
                </span>
              </div>

              {parts.length === 0 ? (
                <div className="p-4 bg-white rounded-xl border border-dashed border-sky-300 flex flex-col items-center justify-center text-center gap-2">
                  <Smile className="w-8 h-8 text-sky-400 stroke-[1.5]" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-700">暂无独立贴图或部位</span>
                    <span className="text-[11px] text-slate-400 max-w-sm">
                      可点击上方【从原图抠图添加】、上传本地贴纸，或点击预设汗滴、爱心等，自由调整回弹幅度、速度与阻尼手感！
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setShowCutoutModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      ✂️ 从原图抠图添加
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddPresetSticker(PRESET_STICKERS[0])}
                      className="px-3.5 py-1.5 rounded-xl bg-white border border-sky-200 hover:bg-sky-50 text-sky-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      💦 快速加个汗滴
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Sticker / Part Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {parts.map((p, idx) => {
                      const isSel = p.id === activePart?.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectActivePart(p.id)}
                          className={`group shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSel
                              ? 'border-sky-500 bg-sky-500 text-white font-bold shadow-xs'
                              : 'border-slate-200 bg-white hover:border-sky-300 text-slate-700'
                          }`}
                        >
                          {p.imageDataUrl && (
                            <img
                              src={p.imageDataUrl}
                              alt={p.name}
                              className="w-5 h-5 rounded-md object-contain bg-white/20 border border-black/10 shrink-0"
                            />
                          )}
                          <span>
                            #{idx + 1} {p.name}
                          </span>

                          {/* 抠图复制按钮 */}
                          <button
                            type="button"
                            onClick={(e) => handleDuplicatePart(p, e)}
                            className={`p-1 rounded-md transition-colors ${
                              isSel ? 'hover:bg-white/20 text-white' : 'hover:bg-sky-50 text-sky-600'
                            }`}
                            title="复制克隆此贴图"
                          >
                            <Copy className="w-3 h-3" />
                          </button>

                          {/* 删除按钮 */}
                          <button
                            type="button"
                            onClick={(e) => handleDeletePart(p.id, e)}
                            className={`p-1 rounded-md transition-colors ${
                              isSel ? 'hover:bg-rose-600 text-rose-100' : 'hover:bg-rose-50 text-rose-500'
                            }`}
                            title="删除此贴图"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setShowCutoutModal(true)}
                      className="shrink-0 px-2.5 py-1.5 rounded-xl border border-dashed border-sky-300 hover:border-sky-500 bg-white hover:bg-sky-50 text-sky-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>加贴图</span>
                    </button>
                  </div>

                  {/* Active Sticker Inspector Panel */}
                  {activePart && (
                    <div className="bg-white p-3.5 rounded-xl border border-sky-200/90 flex flex-col gap-3 text-xs">
                      {/* Header & Quick duplicate/delete */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          {activePart.imageDataUrl && (
                            <div className="w-9 h-9 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center p-0.5 overflow-hidden l41-transparent-grid shrink-0">
                              <img
                                src={activePart.imageDataUrl}
                                alt={activePart.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={activePart.name}
                              onChange={(e) => handleUpdatePart(activePart.id, { name: e.target.value })}
                              className="px-2 py-0.5 rounded-md border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 w-28 sm:w-36"
                              placeholder="贴图名称"
                            />
                            <span className="text-[10px] text-stone-400 font-mono">
                              ({activePart.sourceW}×{activePart.sourceH}px)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleDuplicatePart(activePart, e)}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold border border-sky-200 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                            title="复制克隆此贴图"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>抠图复制</span>
                          </button>

                          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleMoveLayer(activePart.id, 'down')}
                              className="px-1.5 py-0.5 rounded hover:bg-white text-[11px] text-slate-600 transition-colors cursor-pointer"
                              title="图层下移一层"
                            >
                              🔽
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveLayer(activePart.id, 'up')}
                              className="px-1.5 py-0.5 rounded hover:bg-white text-[11px] text-slate-600 transition-colors cursor-pointer"
                              title="图层上移一层"
                            >
                              🔼
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleMirrorCopyPart(activePart, e)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                            title="对称镜像复制（自动水平翻转并对称放置到另一侧，适合耳朵、翅膀、小手）"
                          >
                            <span>🪞 镜像复制</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeletePart(activePart.id, e)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-rose-100 transition-colors cursor-pointer"
                            title="删除此贴图"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 锚点形态模式选择: 📍 单点锚点 vs 📏 线段缝合线 (防耳朵与头部脱节) */}
                      <div className="bg-sky-50/50 p-2.5 rounded-xl border border-sky-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                            <span>锚点扎根模式</span>
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                              耳朵防脱节专属
                            </span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdatePart(activePart.id, { anchorMode: 'point' })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                (activePart.anchorMode || 'point') === 'point'
                                  ? 'border-sky-500 bg-sky-500 text-white shadow-2xs'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
                              }`}
                            >
                              📍 单点支点
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdatePart(activePart.id, {
                                  anchorMode: 'line',
                                  anchorX2: activePart.anchorX2 ?? Number(Math.min(0.98, activePart.anchorX + 0.12).toFixed(4)),
                                  anchorY2: activePart.anchorY2 ?? activePart.anchorY,
                                })
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                activePart.anchorMode === 'line'
                                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-2xs'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
                              }`}
                              title="线段底边缝合：耳朵底边紧贴头部缝合线，发尖耳尖弹性摇摆，耳朵永不脱节！"
                            >
                              📏 线段缝合线 (防脱节)
                            </button>
                          </div>
                        </div>

                        {activePart.anchorMode === 'line' ? (
                          <div className="bg-indigo-50/70 p-2 rounded-lg border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-1.5">
                            <span className="text-sm">📏</span>
                            <span>
                              <strong>线段缝合已生效：</strong>已在底部建立连接缝合线，在右侧画布可拖动<strong>端点1</strong>与<strong>端点2</strong>贴紧头皮边缘，摆动时底边保持 0 位移，耳朵绝不会与头部分离脱节！
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400">
                            提示：如制作猫耳、狗耳、发丝等，推荐切换为「📏 线段缝合线」，底边贴紧头皮，摆动自然且不脱节。
                          </p>
                        )}
                      </div>

                      {/* 鼠标拖动与位置调节 (简洁纯鼠标交互，隐藏 XY 轴数字滑杆) */}
                      <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-100 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                            <Move className="w-3.5 h-3.5 text-sky-600" />
                            <span>鼠标拖动挪位与扎根锚点</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdatePart(activePart.id, { offsetX: 0, offsetY: 0 })}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="重置部位偏移位置，回到初始抠图原位"
                            >
                              ↺ 位置归零
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const mW = sourceCanvas?.width || 500;
                                const mH = sourceCanvas?.height || 500;
                                const botX = Number(((activePart.sourceX + activePart.sourceW / 2) / mW).toFixed(4));
                                const botY = Number(((activePart.sourceY + activePart.sourceH) / mH).toFixed(4));
                                handleUpdatePart(activePart.id, {
                                  anchorX: Math.max(0.01, Math.min(0.99, botX)),
                                  anchorY: Math.max(0.01, Math.min(0.99, botY)),
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="将扎根锚点设在贴图底部根部中心"
                            >
                              📍 锚点置于根部
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const mW = sourceCanvas?.width || 500;
                                const mH = sourceCanvas?.height || 500;
                                const cenX = Number(((activePart.sourceX + activePart.sourceW / 2) / mW).toFixed(4));
                                const cenY = Number(((activePart.sourceY + activePart.sourceH / 2) / mH).toFixed(4));
                                handleUpdatePart(activePart.id, {
                                  anchorX: Math.max(0.01, Math.min(0.99, cenX)),
                                  anchorY: Math.max(0.01, Math.min(0.99, cenY)),
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="将扎根锚点设在贴图中心"
                            >
                              📍 锚点置于中心
                            </button>
                          </div>
                        </div>

                        <div className="bg-white/80 p-2.5 rounded-lg border border-sky-100 text-[11px] text-slate-600 flex items-start gap-2">
                          <span className="text-base leading-none">💡</span>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-700">鼠标操作提示：</span>
                            <span className="text-slate-500">
                              • <strong>挪动位置：</strong>在右侧画布直接按住该贴图拖拽即可随意挪位；<br />
                              • <strong>加锚点/调扎根：</strong>点击贴图弹出专属 📍 锚点，拖拽锚点即可调整旋转摆动支点。
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 旋转角度 */}
                      <div className="bg-sky-50/50 p-2.5 rounded-xl border border-sky-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <RotateCw className="w-3.5 h-3.5 text-sky-600" />
                            <span>自由旋转角度</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              <input
                                type="number"
                                min={-180}
                                max={180}
                                value={activePart.rotation || 0}
                                onChange={(e) => {
                                  const val = Math.max(-180, Math.min(180, Number(e.target.value) || 0));
                                  handleUpdatePart(activePart.id, { rotation: val });
                                }}
                                className="w-10 text-right font-mono font-bold text-sky-700 text-xs focus:outline-none"
                              />
                              <span className="text-sky-700 font-bold">°</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUpdatePart(activePart.id, { rotation: 0 })}
                              className="text-[11px] text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                            >
                              重置(0°)
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                          <input
                            type="range"
                            min={-180}
                            max={180}
                            step={1}
                            value={activePart.rotation || 0}
                            onChange={(e) =>
                              handleUpdatePart(activePart.id, { rotation: Number(e.target.value) })
                            }
                            className="flex-1 accent-sky-600 cursor-pointer"
                          />
                          <span className="font-mono font-bold text-sky-700 w-12 text-right">
                            {activePart.rotation || 0}°
                          </span>
                        </div>
                      </div>

                      {/* 贴图镜像翻转与缩放 (左右对称耳朵/翅膀一键制作) */}
                      <div className="bg-sky-50/50 p-2.5 rounded-xl border border-sky-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <span>🪞 镜像翻转与贴图大小缩放</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdatePart(activePart.id, { flipH: !activePart.flipH })}
                              className={`px-2 py-0.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                                activePart.flipH
                                  ? 'border-sky-500 bg-sky-500 text-white shadow-2xs'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
                              }`}
                              title="水平镜像翻转（左耳变右耳）"
                            >
                              ⇄ 水平翻转
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdatePart(activePart.id, { flipV: !activePart.flipV })}
                              className={`px-2 py-0.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                                activePart.flipV
                                  ? 'border-sky-500 bg-sky-500 text-white shadow-2xs'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-sky-50'
                              }`}
                              title="垂直翻转"
                            >
                              ⇅ 垂直翻转
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-slate-500 font-medium shrink-0">贴图缩放:</span>
                          <input
                            type="range"
                            min={0.3}
                            max={2.5}
                            step={0.05}
                            value={activePart.scale ?? 1.0}
                            onChange={(e) =>
                              handleUpdatePart(activePart.id, { scale: Number(e.target.value) })
                            }
                            className="flex-1 accent-sky-600 cursor-pointer"
                          />
                          <span className="font-mono font-bold text-sky-700 w-12 text-right">
                            {Math.round((activePart.scale ?? 1.0) * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdatePart(activePart.id, { scale: 1.0 })}
                            className="text-[10px] text-sky-600 hover:underline"
                          >
                            100%
                          </button>
                        </div>
                      </div>

                      {/* 专属弹力回弹方向角度 (0° ~ 360° 任意自调) */}
                      <div className="bg-sky-50/50 p-2.5 rounded-xl border border-sky-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                            <Compass className="w-3.5 h-3.5 text-sky-600" />
                            <span>专属弹力方向 (0° ~ 360° 任意角度自调)</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={360}
                              value={activePart.bounceDirectionAngle ?? 0}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(360, Number(e.target.value) || 0));
                                handleUpdatePart(activePart.id, { bounceDirectionAngle: val });
                              }}
                              className="w-10 text-right font-mono font-bold text-sky-700 text-xs px-1 py-0.5 rounded border border-slate-200 focus:outline-none"
                            />
                            <span className="text-xs font-bold text-sky-700">°</span>
                            <button
                              type="button"
                              onClick={() => handleUpdatePart(activePart.id, { bounceDirectionAngle: 0 })}
                              className="text-[11px] text-sky-600 hover:text-sky-800 hover:underline cursor-pointer ml-1"
                            >
                              垂直(0°)
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
                          {/* Visual compass needle */}
                          <div
                            className="w-8 h-8 rounded-full border border-sky-300 bg-sky-50/60 shadow-2xs flex items-center justify-center shrink-0 relative overflow-hidden"
                            title={`当前部位弹力方向：${activePart.bounceDirectionAngle ?? 0}°`}
                          >
                            <div
                              className="w-0.5 h-3.5 bg-sky-600 rounded-full origin-bottom"
                              style={{
                                transform: `rotate(${activePart.bounceDirectionAngle ?? 0}deg)`,
                                transition: 'transform 0.1s ease-out',
                              }}
                            />
                            <div className="w-1.5 h-1.5 rounded-full bg-sky-800 absolute" />
                          </div>

                          <div className="flex-1 flex flex-col gap-1.5">
                            <input
                              type="range"
                              min={0}
                              max={360}
                              step={1}
                              value={activePart.bounceDirectionAngle ?? 0}
                              onChange={(e) =>
                                handleUpdatePart(activePart.id, { bounceDirectionAngle: Number(e.target.value) })
                              }
                              className="w-full accent-sky-600 cursor-pointer"
                            />
                            <div className="flex flex-wrap gap-1">
                              {[
                                { angle: 0, label: '↑垂直' },
                                { angle: 45, label: '↗斜45°' },
                                { angle: 90, label: '→水平' },
                                { angle: 135, label: '↘斜135°' },
                                { angle: 180, label: '↓向下' },
                                { angle: 315, label: '↖斜315°' },
                              ].map((btn) => (
                                <button
                                  key={btn.angle}
                                  type="button"
                                  onClick={() => handleUpdatePart(activePart.id, { bounceDirectionAngle: btn.angle })}
                                  className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                                    (activePart.bounceDirectionAngle ?? 0) === btn.angle
                                      ? 'bg-sky-500 text-white font-bold border-sky-500'
                                      : 'bg-slate-50 hover:bg-sky-50 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 专属弹动效果形态 (选择效果) */}
                      <div className="flex flex-col gap-1.5">
                        <span className="font-bold text-slate-700">🎭 选择回弹效果形态</span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                          {[
                            { id: 'spring' as const, label: '🌀 弹簧超弹', desc: '发梢疯狂甩动' },
                            { id: 'sway' as const, label: '🌾 柔顺摇摆', desc: '迎风拂动' },
                            { id: 'orbit-spin' as const, label: '💫 环绕旋转', desc: '立体盘旋' },
                            { id: 'jiggle' as const, label: '🍧 果冻微颤', desc: '高频颤抖' },
                            { id: 'breathe' as const, label: '💓 呼吸脉动', desc: '收缩膨胀' },
                          ].map((m) => {
                            const isSelected = (activePart.motion || 'spring') === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleUpdatePart(activePart.id, { motion: m.id })}
                                className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center gap-0.5 ${
                                  isSelected
                                    ? 'border-sky-500 bg-sky-50 text-sky-800 font-bold shadow-2xs'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                <span className="text-[11px] font-bold">{m.label}</span>
                                <span className="text-[9px] text-slate-400">{m.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 调整回弹幅度、速度以及物理重力缓动阻尼手感 */}
                      <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. 回弹幅度 */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                            <span>回弹幅度:</span>
                            <span className="font-mono font-bold text-sky-700">
                              {Math.round((activePart.amplitudeMult ?? 1.0) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.1}
                            max={2.0}
                            step={0.05}
                            value={activePart.amplitudeMult ?? 1.0}
                            onChange={(e) =>
                              handleUpdatePart(activePart.id, { amplitudeMult: Number(e.target.value) })
                            }
                            className="w-full accent-sky-600 cursor-pointer"
                          />
                        </div>

                        {/* 2. 回弹速度 */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                            <span>回弹速度:</span>
                            <span className="font-mono font-bold text-sky-700">
                              {(activePart.speedMult ?? 1.0).toFixed(1)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.5}
                            max={3.0}
                            step={0.1}
                            value={activePart.speedMult ?? 1.0}
                            onChange={(e) =>
                              handleUpdatePart(activePart.id, { speedMult: Number(e.target.value) })
                            }
                            className="w-full accent-sky-600 cursor-pointer"
                          />
                        </div>

                        {/* 3. 物理重力缓动阻尼手感 */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                            <span>缓动阻尼手感:</span>
                            <span className="font-mono font-bold text-sky-700">
                              {getEasingLabel(activePart.easing ?? 35).name.split(' ')[0]} ({activePart.easing ?? 35})
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={activePart.easing ?? 35}
                            onChange={(e) =>
                              handleUpdatePart(activePart.id, { easing: Number(e.target.value) })
                            }
                            className="w-full accent-sky-600 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* 挖空身体与智能补底防露背景 */}
                      <div className="flex flex-col gap-1.5 pt-2 border-t border-stone-100">
                        <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activePart.autoInfill ?? true}
                            onChange={(e) =>
                              handleUpdatePart(activePart.id, { autoInfill: e.target.checked })
                            }
                            className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="font-bold text-sky-900 flex items-center gap-1">
                            <span>🎨 智能自动修补底色（防露背景断层 · 强烈推荐）</span>
                          </span>
                        </label>
                        <p className="text-[10px] text-slate-500 pl-6 leading-relaxed">
                          用周围发丝/肤色自动补齐被挖空部位下方的身体区域。挪动、旋转或耳朵大幅度摇摆时，下方永远饱满连接，绝不漏空露出背景！
                        </p>

                        <label className="flex items-center gap-2 text-[11px] text-slate-500 pl-6 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activePart.hollowOutBody ?? (activePart.type === 'cutout')}
                            onChange={(e) =>
                              handleUpdatePart(activePart.id, { hollowOutBody: e.target.checked })
                            }
                            className="rounded text-slate-400 focus:ring-slate-400 w-3 h-3 cursor-pointer"
                          />
                          <span>挖空人物身体底图（避免部位原位重影）</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================== 功能 3: 地面光影特效与画布设置 (折叠卡片) ===================== */}
      <div className="rounded-xl border border-sky-200/80 overflow-hidden bg-white shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection('effects')}
          className="w-full flex items-center justify-between p-3.5 bg-sky-50/60 hover:bg-sky-100/50 transition-colors text-left"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold text-slate-800">
                3. 地面光影特效与画布设置
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold border border-sky-200">
                {config.fps}fps · {BG_OPTIONS.find((b) => b.id === config.bgType)?.name.split(' ')[0]}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              短介绍：调节地面动态受光阴影、触地冲击波、动画导出帧率以及背景底色。
            </p>
          </div>
          <div className="flex items-center gap-1 text-sky-600 text-xs font-medium shrink-0 ml-2">
            <span>{expandedSections.effects ? '收起' : '展开'}</span>
            {expandedSections.effects ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {expandedSections.effects && (
          <div className="p-4 flex flex-col gap-4 border-t border-sky-100 bg-sky-50/20">
            {/* Ground Shadow & Impact Ripple Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-sky-100 bg-white cursor-pointer hover:bg-sky-50/50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.groundShadow}
                  onChange={(e) => onChange({ ...config, groundShadow: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>动态受光地面阴影</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    下蹲着地时阴影扩散变深，起跳时淡化聚拢
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-sky-100 bg-white cursor-pointer hover:bg-sky-50/50 transition-colors">
                <input
                  type="checkbox"
                  checked={config.impactRipple}
                  onChange={(e) => onChange({ ...config, impactRipple: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    <span>触地软糖冲击波</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    着地瞬间从脚底向外迸发 Q 弹气浪粒子
                  </span>
                </div>
              </label>
            </div>

            {/* FPS and Background options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-sky-100 flex flex-col gap-2">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Film className="w-3.5 h-3.5 text-sky-600" />
                  <span>帧率选择 (FPS):</span>
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[15, 24, 30, 60].map((fpsVal) => (
                    <button
                      key={fpsVal}
                      type="button"
                      onClick={() => handleFpsChange(fpsVal)}
                      className={`py-1.5 rounded-lg border text-center font-bold text-xs transition-all ${
                        config.fps === fpsVal
                          ? 'border-sky-500 bg-sky-500 text-white shadow-xs'
                          : 'border-slate-200 hover:border-sky-300 bg-white text-slate-700'
                      }`}
                    >
                      {fpsVal} FPS
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-sky-100 flex flex-col gap-2">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-sky-600" />
                  <span>导出背景底色:</span>
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {BG_OPTIONS.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => onChange({ ...config, bgType: bg.id })}
                      className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-semibold transition-all ${
                        config.bgType === bg.id
                          ? 'border-sky-500 bg-sky-50 text-sky-800 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {bg.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Text Bubble Modal */}
      <TextBubbleModal
        isOpen={showTextModal}
        onClose={() => setShowTextModal(false)}
        onAddPart={handleAddPartInternal}
      />

      {/* Cutout Part Modal */}
      <CutoutPartModal
        isOpen={showCutoutModal}
        onClose={() => setShowCutoutModal(false)}
        sourceCanvas={sourceCanvas || null}
        onAddPart={handleAddPartInternal}
        existingPartsCount={parts.length}
      />
    </div>
  );
};
