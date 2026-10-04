import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Sparkles, RefreshCw, X, Check, Eye } from 'lucide-react';
import { AspectRatio, PresetCharacter } from '../types/veo';
import { PRESET_CHARACTERS } from '../constants/presets';

interface ImageUploadZoneProps {
  imageSrc: string | null;
  onImageChange: (imageSrc: string | null, mimeType?: string) => void;
  aspectRatio: AspectRatio;
  onSelectPreset?: (preset: PresetCharacter) => void;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  imageSrc,
  onImageChange,
  aspectRatio,
  onSelectPreset,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen to global clipboard paste events
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传有效的图片格式 (PNG, JPEG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onImageChange(result, file.type);
      triggerBounce();
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const triggerBounce = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 800);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-stone-800">
              第 1 步：上传角色照片或选择预设
            </h2>
            <p className="text-xs text-stone-500">
              支持上传可爱人物、手办、宠物、立绘或贴纸，Veo 将赋予其 3D 动画生命
            </p>
          </div>
        </div>

        {imageSrc && (
          <button
            onClick={() => onImageChange(null)}
            className="text-xs text-stone-400 hover:text-rose-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
            title="移除当前照片"
          >
            <X className="w-3.5 h-3.5" />
            <span>清空</span>
          </button>
        )}
      </div>

      {/* Preset Character Bar */}
      <div>
        <div className="text-xs font-medium text-stone-600 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>快速体验预设角色（点击即刻载入）：</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {PRESET_CHARACTERS.map((char) => {
            const isSelected = imageSrc === char.imageDataUrl;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => {
                  onImageChange(char.imageDataUrl, 'image/svg+xml');
                  if (onSelectPreset) onSelectPreset(char);
                  triggerBounce();
                }}
                className={`relative flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 group ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/70 shadow-xs ring-2 ring-orange-200'
                    : 'border-stone-200 hover:border-orange-300 hover:bg-stone-50/80 bg-white'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-stone-100 shrink-0 overflow-hidden border border-stone-200/60 p-0.5 group-hover:scale-105 transition-transform">
                  <img
                    src={char.avatarSvg}
                    alt={char.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 truncate">
                      {char.name}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                    {char.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Upload / Preview Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !imageSrc && fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
          imageSrc
            ? 'border-stone-200 bg-stone-900/5'
            : isDragging
            ? 'border-orange-500 bg-orange-50/60 cursor-copy scale-[1.01]'
            : 'border-dashed border-stone-300 hover:border-orange-400 bg-stone-50/70 hover:bg-orange-50/20 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processFile(e.target.files[0]);
            }
          }}
        />

        {imageSrc ? (
          <div className="relative p-4 flex flex-col items-center justify-center min-h-[280px]">
            {/* Aspect Ratio Framing Indicator */}
            <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                画幅模式：{aspectRatio} ({aspectRatio === '16:9' ? '16:9 宽屏' : '9:16 竖屏'})
              </span>
            </div>

            {/* Change Image Button */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerBounce();
                }}
                className="bg-white/90 hover:bg-white text-stone-700 text-xs px-2.5 py-1.5 rounded-xl border border-stone-200/80 shadow-xs flex items-center gap-1 transition-all active:scale-95"
                title="Duang 一下果冻晃动测试"
              >
                <span>🍮</span>
                <span>Duang~ 晃动</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="bg-white/90 hover:bg-white text-stone-700 text-xs px-2.5 py-1.5 rounded-xl border border-stone-200/80 shadow-xs flex items-center gap-1 transition-all active:scale-95"
              >
                <RefreshCw className="w-3 h-3 text-stone-500" />
                <span>更换图片</span>
              </button>
            </div>

            {/* Interactive Image Frame with Jelly Bounce */}
            <div
              onClick={triggerBounce}
              className={`relative cursor-pointer transition-transform duration-500 ${
                isBouncing ? 'animate-bounce-jelly' : 'hover:scale-[1.02]'
              }`}
              style={{
                width: aspectRatio === '16:9' ? '360px' : '220px',
                aspectRatio: aspectRatio === '16:9' ? '16 / 9' : '9 / 16',
                maxHeight: '340px',
              }}
            >
              <div className="w-full h-full rounded-xl overflow-hidden border-2 border-white shadow-xl bg-radial from-white to-amber-50/50 flex items-center justify-center p-2">
                <img
                  src={imageSrc}
                  alt="角色图片"
                  className="w-full h-full object-contain filter drop-shadow-md select-none pointer-events-none"
                />
              </div>

              {/* Watermark/Fun Label */}
              <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  点击图片测试 Q 弹回弹 ✨
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-500 mt-4 text-center">
              图片已就绪！Veo 将参考此角色的外观细节、服饰和神态生成连续动态。
            </p>
          </div>
        ) : (
          <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-semibold text-stone-800 mb-1">
              点击上传或直接将照片拖入此处
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mb-3">
              支持直接键盘粘贴剪贴板截图 (<kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-[10px]">Ctrl+V</kbd> / <kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-[10px]">⌘+V</kbd>)
            </p>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium shadow-xs shadow-orange-500/20 transition-all">
              <Upload className="w-3.5 h-3.5" />
              选择电脑文件
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
