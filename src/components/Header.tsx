import React from 'react';
import { Sparkles, Scissors, Image as ImageIcon, HeartHandshake } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-sky-100 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-17 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/avatar.jpg"
            alt="程序头像"
            className="w-10 h-10 rounded-xl object-cover shadow-sm border border-sky-200 ring-2 ring-sky-400/30"
          />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black bg-linear-to-r from-sky-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                l41果冻铺
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <Scissors className="w-3 h-3 text-sky-500" />
                智能抠图 + Q 弹果冻工坊
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              l41果冻铺 · 角色一键抠图 · 弹簧摆动与果冻Duang物理 · 最高60帧高清透明 GIF
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
            <span>实时 60fps 物理预览</span>
          </div>
        </div>
      </div>
    </header>
  );
};
