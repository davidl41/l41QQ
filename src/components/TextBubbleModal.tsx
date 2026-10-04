import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Check, Sparkles, Sliders } from 'lucide-react';
import { BubbleStyle, renderTextBubbleToDataUrl } from '../utils/speechBubbleRenderer';
import { BouncePart } from '../types/gif';

interface TextBubbleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPart: (part: BouncePart) => void;
}

const MEME_PRESETS = [
  '好耶！',
  '摸鱼中~',
  '暗中观察',
  'Duang~',
  '给大佬递茶',
  '委屈巴巴',
  '？？？',
  '困成狗',
  '吃饱饱',
  '心动了💖',
];

const STYLES: { id: BubbleStyle; name: string; desc: string }[] = [
  { id: 'meme-black-outline', name: '经典黑白描边字', desc: '漫画表情包最常用的粗体白字黑描边' },
  { id: 'cute-pink', name: '粉萌泡泡字', desc: '少女风粉嫩白边与柔光投影' },
  { id: 'speech-bubble', name: '可爱对话气泡', desc: '带指示小尾巴的圆角对话框' },
  { id: 'shout-burst', name: '震惊爆裂气泡', desc: '搞笑夸张的黄色锯齿漫画气浪' },
];

export const TextBubbleModal: React.FC<TextBubbleModalProps> = ({
  isOpen,
  onClose,
  onAddPart,
}) => {
  const [text, setText] = useState('好耶！');
  const [selectedStyle, setSelectedStyle] = useState<BubbleStyle>('meme-black-outline');
  const [fontSize, setFontSize] = useState(30);
  const [previewDataUrl, setPreviewDataUrl] = useState('');
  const [dimensions, setDimensions] = useState({ width: 120, height: 60 });

  useEffect(() => {
    if (!isOpen) return;
    const res = renderTextBubbleToDataUrl({
      text,
      style: selectedStyle,
      fontSize,
    });
    setPreviewDataUrl(res.dataUrl);
    setDimensions({ width: res.width, height: res.height });
  }, [isOpen, text, selectedStyle, fontSize]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const res = renderTextBubbleToDataUrl({
      text,
      style: selectedStyle,
      fontSize,
    });

    const newPart: BouncePart = {
      id: `text_${Date.now()}`,
      name: text.trim().slice(0, 6) || '表情文字',
      type: 'preset-sticker',
      imageDataUrl: res.dataUrl,
      sourceX: 0,
      sourceY: 0,
      sourceW: res.width,
      sourceH: res.height,
      anchorX: 0.5,
      anchorY: 0.85,
      offsetX: 0,
      offsetY: -70, // Float comfortably above the character's head
      rotation: 0,
      motion: selectedStyle === 'shout-burst' ? 'jiggle' : 'spring',
      amplitudeMult: 1.1,
      speedMult: 1.2,
      easing: 40,
      hollowOutBody: false,
      visible: true,
    };

    onAddPart(newPart);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-sky-100 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sky-100 bg-sky-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">添加表情包文字与对话气泡</h3>
              <p className="text-[11px] text-slate-500">制作经典弹动字幕，随角色一起 Q 弹晃动</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
          {/* Live Preview Box */}
          <div className="h-28 rounded-xl bg-stone-900 border border-stone-700/50 flex items-center justify-center p-3 relative overflow-hidden l41-transparent-grid">
            {previewDataUrl && (
              <img
                src={previewDataUrl}
                alt="文字预览"
                className="max-h-full max-w-full object-contain drop-shadow-lg animate-in zoom-in-95 duration-150"
              />
            )}
            <span className="absolute bottom-1.5 right-2 text-[10px] text-stone-400 font-mono">
              {dimensions.width}×{dimensions.height}px
            </span>
          </div>

          {/* Text Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">✍️ 输入台词内容：</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={20}
              placeholder="输入表情包文字..."
              className="w-full px-3 py-2 rounded-xl border border-sky-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1 mt-1">
              {MEME_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setText(p)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-sky-100 hover:text-sky-700 text-slate-600 text-[11px] transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Style Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">🎨 文字样式与气泡：</label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((st) => {
                const isSel = selectedStyle === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStyle(st.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                      isSel
                        ? 'border-sky-500 bg-sky-500 text-white font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:border-sky-300 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{st.name}</span>
                    <span className={`text-[10px] ${isSel ? 'text-sky-100' : 'text-slate-400'}`}>
                      {st.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size Slider */}
          <div className="flex flex-col gap-1 bg-sky-50/50 p-2.5 rounded-xl border border-sky-100 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>字体大小:</span>
              <span className="font-mono font-bold text-sky-700">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={18}
              max={48}
              step={2}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>添加为表情贴图</span>
          </button>
        </div>
      </div>
    </div>
  );
};
