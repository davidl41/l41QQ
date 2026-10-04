import React from 'react';
import { History, Play, Download, Trash2, Film, Clock } from 'lucide-react';
import { GenerationHistoryItem } from '../types/veo';

interface HistoryGalleryProps {
  history: GenerationHistoryItem[];
  onSelectVideo: (item: GenerationHistoryItem) => void;
  onClearHistory: () => void;
  currentVideoId?: string;
}

export const HistoryGallery: React.FC<HistoryGalleryProps> = ({
  history,
  onSelectVideo,
  onClearHistory,
  currentVideoId,
}) => {
  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-800">
              历史生成记录 ({history.length})
            </h3>
            <p className="text-[11px] text-stone-500">
              保存在本地，点击即可直接载入播放或重新下载
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClearHistory}
          className="text-xs text-stone-400 hover:text-rose-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>清空记录</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {history.map((item) => {
          const isCurrent = item.id === currentVideoId;
          return (
            <div
              key={item.id}
              onClick={() => onSelectVideo(item)}
              className={`group relative rounded-xl border overflow-hidden cursor-pointer bg-stone-900 transition-all duration-200 ${
                isCurrent
                  ? 'ring-2 ring-orange-500 border-orange-500 shadow-md scale-[1.02]'
                  : 'border-stone-200 hover:border-orange-400 hover:shadow-xs'
              }`}
            >
              {/* Thumbnail or Video snapshot */}
              <div
                className="w-full relative flex items-center justify-center bg-black overflow-hidden"
                style={{
                  aspectRatio: item.aspectRatio === '16:9' ? '16 / 9' : '9 / 16',
                }}
              >
                {item.thumbnailUrl || item.originalImage ? (
                  <img
                    src={item.thumbnailUrl || item.originalImage}
                    alt="缩略图"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Film className="w-6 h-6 text-stone-600" />
                )}

                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                  <div className="w-8 h-8 rounded-full bg-white/80 group-hover:bg-white text-stone-900 flex items-center justify-center shadow-md">
                    <Play className="w-4 h-4 fill-stone-900 translate-x-0.5" />
                  </div>
                </div>

                <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded-md font-mono">
                  {item.aspectRatio}
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-2 bg-white">
                <p className="text-[11px] font-medium text-stone-800 truncate" title={item.prompt}>
                  {item.prompt}
                </p>
                <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1">
                  <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-mono text-emerald-600">{item.resolution}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
