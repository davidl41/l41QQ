import React, { useState } from 'react';
import {
  Sparkles,
  Smartphone,
  Tv,
  Wand2,
  RotateCcw,
  Sliders,
  Flame,
  CheckCircle,
  Video,
} from 'lucide-react';
import { AspectRatio, Resolution, PresetPrompt } from '../types/veo';
import { PRESET_PROMPTS, DEFAULT_USER_PROMPT } from '../constants/presets';

interface PromptEditorProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (val: AspectRatio) => void;
  resolution: Resolution;
  onResolutionChange: (val: Resolution) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  hasImage: boolean;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  onPromptChange,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  onGenerate,
  isGenerating,
  hasImage,
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState<any>(null);

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawPrompt: prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setEnhancedResult(data);
        if (data.chinesePrompt) {
          onPromptChange(data.chinesePrompt);
        }
      }
    } catch (err) {
      console.error('Enhance failed:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleApplyPreset = (p: PresetPrompt) => {
    onPromptChange(p.prompt);
    onAspectRatioChange(p.aspectRatio);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-stone-800">
              第 2 步：设置视频比例与动画剧本
            </h2>
            <p className="text-xs text-stone-500">
              精准调控 Veo 生成画幅比例与一镜到底运镜提示词
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onPromptChange(DEFAULT_USER_PROMPT)}
          className="text-xs text-stone-400 hover:text-amber-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-amber-50"
          title="重置为米饭山原版剧本"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>重置剧本</span>
        </button>
      </div>

      {/* Aspect Ratio & Resolution Config */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Aspect Ratio Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
            <span>画面比例 (Aspect Ratio)</span>
            <span className="text-[10px] text-stone-400 font-normal">必选 16:9 或 9:16</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onAspectRatioChange('16:9')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                aspectRatio === '16:9'
                  ? 'border-orange-500 bg-orange-50 text-orange-900 shadow-xs ring-2 ring-orange-200'
                  : 'border-stone-200 bg-stone-50/60 text-stone-600 hover:border-stone-300 hover:bg-white'
              }`}
            >
              <Tv className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="text-left">
                <div>16:9 宽屏</div>
                <div className="text-[10px] font-normal text-stone-400">横版 · 电影感</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onAspectRatioChange('9:16')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                aspectRatio === '9:16'
                  ? 'border-orange-500 bg-orange-50 text-orange-900 shadow-xs ring-2 ring-orange-200'
                  : 'border-stone-200 bg-stone-50/60 text-stone-600 hover:border-stone-300 hover:bg-white'
              }`}
            >
              <Smartphone className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="text-left">
                <div>9:16 竖屏</div>
                <div className="text-[10px] font-normal text-stone-400">手机 · 短视频</div>
              </div>
            </button>
          </div>
        </div>

        {/* Resolution Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-700 flex items-center justify-between">
            <span>清晰度 (Resolution)</span>
            <span className="text-[10px] text-emerald-600 font-medium">极速出片推荐 720p</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onResolutionChange('720p')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                resolution === '720p'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs ring-2 ring-emerald-200'
                  : 'border-stone-200 bg-stone-50/60 text-stone-600 hover:border-stone-300 hover:bg-white'
              }`}
            >
              <CheckCircle className={`w-3.5 h-3.5 ${resolution === '720p' ? 'text-emerald-500' : 'text-stone-400'}`} />
              <div className="text-left">
                <div>720p (标清极速)</div>
                <div className="text-[10px] font-normal text-stone-400">生成最稳定流畅</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onResolutionChange('1080p')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                resolution === '1080p'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs ring-2 ring-emerald-200'
                  : 'border-stone-200 bg-stone-50/60 text-stone-600 hover:border-stone-300 hover:bg-white'
              }`}
            >
              <CheckCircle className={`w-3.5 h-3.5 ${resolution === '1080p' ? 'text-emerald-500' : 'text-stone-400'}`} />
              <div className="text-left">
                <div>1080p (全高清)</div>
                <div className="text-[10px] font-normal text-stone-400">超细腻毛发纹理</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Script Chips */}
      <div>
        <div className="text-xs font-medium text-stone-600 mb-2 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          <span>精选 3D 动画剧本预设：</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_PROMPTS.map((p) => {
            const isActive = prompt === p.prompt;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all text-left flex items-center gap-1.5 ${
                  isActive
                    ? 'border-orange-500 bg-orange-50 text-orange-950 font-semibold shadow-xs'
                    : 'border-stone-200 hover:border-orange-300 bg-stone-50/60 text-stone-700 hover:bg-white'
                }`}
              >
                <span>{p.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-orange-200 text-orange-900' : 'bg-stone-200/70 text-stone-600'
                  }`}
                >
                  {p.aspectRatio}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Prompt Textarea */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
            <span>动画镜头运镜与动作描述</span>
            <span className="text-[11px] text-stone-400">({prompt.length} 字符)</span>
          </label>
          <button
            type="button"
            disabled={isEnhancing || !prompt.trim()}
            onClick={handleEnhancePrompt}
            className="text-xs text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 px-2.5 py-1 rounded-lg border border-amber-200/80 flex items-center gap-1 transition-all"
            title="利用 Gemini 智能优化镜头运镜与果冻形变关键词"
          >
            <Wand2 className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
            <span>{isEnhancing ? 'AI 导演润色中...' : 'AI 润色镜头与物理细节'}</span>
          </button>
        </div>

        <textarea
          rows={5}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="描述开场镜头、角色神态、镜头旋转运镜、果冻挤压拉伸回弹物理（Duang~）以及动作结尾..."
          className="w-full text-xs sm:text-sm p-3 rounded-xl border border-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all resize-none font-sans text-stone-800 leading-relaxed bg-stone-50/30 focus:bg-white"
        />

        {/* Enhanced Suggestions if available */}
        {enhancedResult && (
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1 text-stone-700">
            <div className="flex items-center gap-1 text-amber-800 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 导演镜头设计要点：</span>
            </div>
            {enhancedResult.cameraDirection && (
              <p>
                <span className="font-medium text-stone-600">运镜设计：</span>
                {enhancedResult.cameraDirection}
              </p>
            )}
            {enhancedResult.physicsHighlights && (
              <p>
                <span className="font-medium text-stone-600">物理特性：</span>
                {enhancedResult.physicsHighlights}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action / Generate Button */}
      <button
        type="button"
        disabled={isGenerating || (!prompt.trim() && !hasImage)}
        onClick={onGenerate}
        className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-300 shadow-md ${
          isGenerating
            ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
            : 'bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 text-white shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.01] active:scale-[0.99]'
        }`}
      >
        <Video className="w-5 h-5 shrink-0" />
        <span>
          {isGenerating
            ? 'Veo 3.1 渲染引擎正在生成中...'
            : hasImage
            ? `基于图片生成 3D Q弹动画 (${aspectRatio})`
            : `生成 3D Q弹纯文本动画 (${aspectRatio})`}
        </span>
      </button>

      <div className="flex items-center justify-center gap-2 text-[11px] text-stone-400">
        <span>🚀 采用模型: veo-3.1-fast-generate-preview</span>
        <span>•</span>
        <span>🎬 帧率: 60fps 丝滑果冻物理</span>
      </div>
    </div>
  );
};
