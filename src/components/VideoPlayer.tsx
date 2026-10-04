import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Maximize2,
  Columns,
  Sparkles,
  AlertCircle,
  Clock,
  Film,
  Zap,
} from 'lucide-react';
import { AspectRatio } from '../types/veo';

interface VideoPlayerProps {
  videoUrl: string | null;
  originalImage: string | null;
  aspectRatio: AspectRatio;
  isGenerating: boolean;
  progressStage: string;
  progressPercent: number;
  error: string | null;
  onRetry: () => void;
  promptText: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  originalImage,
  aspectRatio,
  isGenerating,
  progressStage,
  progressPercent,
  error,
  onRetry,
  promptText,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState(true);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked by browser policy until interaction
        setIsPlaying(false);
      });
    }
  }, [videoUrl, playbackSpeed]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `veo-3d-jelly-animation-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col gap-4">
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-stone-800">
              第 3 步：视频预览与播放器
            </h2>
            <p className="text-xs text-stone-500">
              支持慢动作慢放回放、原图/动画对比与无损 MP4 导出
            </p>
          </div>
        </div>

        {videoUrl && (
          <div className="flex items-center gap-2">
            {originalImage && (
              <button
                type="button"
                onClick={() => setCompareMode(!compareMode)}
                className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                  compareMode
                    ? 'border-orange-500 bg-orange-50 text-orange-900 font-semibold'
                    : 'border-stone-200 hover:border-stone-300 text-stone-600 bg-stone-50'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>原图对比</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="text-xs px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-1.5 shadow-xs shadow-orange-500/20 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 MP4</span>
            </button>
          </div>
        )}
      </div>

      {/* Main View Area */}
      <div className="relative rounded-2xl overflow-hidden bg-stone-950 flex items-center justify-center min-h-[380px] border border-stone-800">
        {/* Loading State */}
        {isGenerating && (
          <div className="absolute inset-0 z-20 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="relative mb-6">
              {/* Outer pulsing ring */}
              <div className="w-20 h-20 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl animate-bounce-jelly">🍚</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-mono mb-2 border border-orange-500/30">
              <Zap className="w-3.5 h-3.5 animate-pulse text-orange-400" />
              <span>veo-3.1-fast-generate-preview 正在渲染</span>
            </div>

            <h3 className="text-lg font-bold mb-1 text-white">
              {progressStage || '正在计算 3D Q弹果冻物理运动...'}
            </h3>
            <p className="text-xs text-stone-400 max-w-md mb-6 leading-relaxed">
              Veo 正在分析输入图像的形态结构，并合成具有夸张弹性形变、一镜到底运镜的 60fps 动态视频。
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-sm bg-stone-800 rounded-full h-2 overflow-hidden mb-3">
              <div
                className="bg-linear-to-r from-amber-400 via-orange-500 to-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(10, progressPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between w-full max-w-sm text-[11px] text-stone-400 font-mono">
              <span>处理进度</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isGenerating && error && (
          <div className="p-8 text-center text-white max-w-md flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-rose-200 mb-1">
              生成遇到问题
            </h3>
            <p className="text-xs text-stone-300 mb-5 leading-relaxed bg-stone-900/80 p-3 rounded-xl border border-stone-800">
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重试生成</span>
            </button>
          </div>
        )}

        {/* Video Player Display */}
        {!isGenerating && !error && videoUrl && (
          <div
            className={`w-full h-full flex items-center justify-center p-2 ${
              compareMode ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''
            }`}
          >
            {/* Compare Mode: Show Original Image */}
            {compareMode && originalImage && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-[11px] text-stone-400 mb-1 flex items-center gap-1">
                  <span>📸 参考原图 / 角色设计</span>
                </div>
                <div
                  className="rounded-xl overflow-hidden border border-stone-800 bg-stone-900 flex items-center justify-center p-2"
                  style={{
                    maxHeight: '380px',
                    aspectRatio: aspectRatio === '16:9' ? '16 / 9' : '9 / 16',
                  }}
                >
                  <img
                    src={originalImage}
                    alt="参考图"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Video Element */}
            <div className="flex flex-col items-center justify-center h-full w-full">
              {compareMode && (
                <div className="text-[11px] text-orange-400 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Veo 3.1 3D Q弹动态动画</span>
                </div>
              )}
              <div
                className="relative rounded-xl overflow-hidden shadow-2xl bg-black flex items-center justify-center"
                style={{
                  maxHeight: '380px',
                  aspectRatio: aspectRatio === '16:9' ? '16 / 9' : '9 / 16',
                  width: compareMode ? '100%' : aspectRatio === '16:9' ? '100%' : 'auto',
                }}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  loop={isLooping}
                  playsInline
                  autoPlay
                  controls={false}
                  onClick={togglePlay}
                  className="w-full h-full object-contain cursor-pointer"
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                {/* Big Center Play Icon overlay when paused */}
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Play className="w-8 h-8 fill-white translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty / Placeholder State */}
        {!isGenerating && !error && !videoUrl && (
          <div className="p-8 text-center text-stone-400 flex flex-col items-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 text-stone-600 flex items-center justify-center mb-3">
              <Play className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-semibold text-stone-300 mb-1">
              等待生成动画视频
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              在左侧上传照片或选用预设，点击下方“生成 3D Q弹动画”按钮，Veo 将实时为您渲染一镜到底卡通动画。
            </p>
          </div>
        )}
      </div>

      {/* Video Control Bar */}
      {videoUrl && !isGenerating && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-xs">
          {/* Left Controls: Play / Pause, Replay, Loop */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="p-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 shadow-xs"
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-stone-700" />}
            </button>

            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play();
                  setIsPlaying(true);
                }
              }}
              className="p-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 shadow-xs"
              title="重新从头播放"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1 transition-all ${
                isLooping
                  ? 'border-orange-500 bg-orange-50 text-orange-900'
                  : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
              }`}
              title="循环播放"
            >
              <span>循环: {isLooping ? '开' : '关'}</span>
            </button>
          </div>

          {/* Right Controls: Playback Speed, Fullscreen */}
          <div className="flex items-center gap-2">
            <span className="text-stone-500 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>慢动作慢放：</span>
            </span>
            {[0.5, 0.75, 1.0, 1.25].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  playbackSpeed === speed
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {speed}x
              </button>
            ))}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 shadow-xs ml-1"
              title="全屏播放"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
