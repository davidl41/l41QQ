/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { CutoutStudio } from './components/CutoutStudio';
import { BounceControls } from './components/BounceControls';
import { GifPreviewExport } from './components/GifPreviewExport';
import { BounceConfig, BouncePart } from './types/gif';
import { Sparkles, Heart } from 'lucide-react';

export default function App() {
  const [cutoutCanvas, setCutoutCanvas] = useState<HTMLCanvasElement | null>(null);
  const [localMaskCanvas, setLocalMaskCanvas] = useState<HTMLCanvasElement | null>(null);

  const [bounceConfig, setBounceConfig] = useState<BounceConfig>({
    motion: 'viral-doll',
    amplitude: 0.22,
    speed: 1.8,
    easing: 35,
    fps: 30,
    frameCount: 30,
    bgType: 'transparent',
    outputSize: 480,
    antiAliasing: true,
    alphaDithering: true,
    bounceDirection: 'custom',
    bounceAngle: 0,
    accessory: {
      type: 'none',
      size: 1.0,
      lagIntensity: 0.8,
      offsetX: 55,
      offsetY: -30,
      rotation: 0,
    },
    groundShadow: true,
    impactRipple: true,
    wechatOptimized: false,
    localBounce: {
      enabled: true,
      amplitude: 0.35,
      speedMult: 1.5,
      phaseDelay: 0.15,
      motion: 'jiggle',
      onlyPartBounces: false,
      parts: [],   // 独立回弹部位列表（1:1专属固定点、抠图复制、旋转与挪动）
      anchors: [], // 兼容字段
    },
  });

  const handleAddBouncePart = (part: BouncePart) => {
    setBounceConfig((prev) => {
      const currentParts = prev.localBounce?.parts || [];
      const updatedParts = [...currentParts, part];
      return {
        ...prev,
        localBounce: {
          ...prev.localBounce,
          enabled: true,
          parts: updatedParts,
          activePartId: part.id,
          anchors: updatedParts.map((p) => ({
            id: p.id,
            name: p.name,
            anchorX: p.anchorX,
            anchorY: p.anchorY,
            motion: p.motion,
          })),
        },
      };
    });
  };

  return (
    <div className="min-h-screen l41-watermark-bg text-stone-900 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Intro banner */}
        <div className="bg-linear-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 border border-sky-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <img
              src="/avatar.jpg"
              alt="程序头像"
              className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm border border-sky-200 ring-2 ring-sky-400/30"
            />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">
                l41果冻铺 · 角色抠图与 Q 弹动图工坊
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                欢迎来到 l41果冻铺！上传角色图片，一键去除背景，赋予角色弹簧左右摇摆、果冻挤压拉伸回弹（Duang~）或呆毛/尾巴扎根弹动动效，导出超清透明 GIF！
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-sky-800 bg-white/90 border border-sky-200 px-3 py-1.5 rounded-xl font-medium shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>智能抠图 + 纯透明 GIF 导出</span>
          </div>
        </div>

        {/* Workspace: 2-column or stacked grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Cutout Studio (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <CutoutStudio
              onCutoutUpdated={(c) => setCutoutCanvas(c)}
              onLocalMaskUpdated={(m) => setLocalMaskCanvas(m)}
              onAddBouncePart={handleAddBouncePart}
              existingParts={bounceConfig.localBounce?.parts || []}
              onCustomAccessoryCreated={(url) => {
                handleAddBouncePart({
                  id: `sticker_${Date.now()}`,
                  name: '自制贴图',
                  type: 'custom-upload',
                  imageDataUrl: url,
                  sourceX: 0,
                  sourceY: 0,
                  sourceW: 90,
                  sourceH: 90,
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
                });
              }}
            />
            <BounceControls
              config={bounceConfig}
              onChange={setBounceConfig}
              sourceCanvas={cutoutCanvas}
              onAddPart={handleAddBouncePart}
            />
          </div>

          {/* Right Column: Live Preview & GIF Export (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky top-22">
            <GifPreviewExport
              sourceCanvas={cutoutCanvas}
              config={bounceConfig}
              localMaskCanvas={localMaskCanvas}
              onChangeConfig={setBounceConfig}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white/60 py-4 text-center text-xs text-stone-500 flex items-center justify-center gap-1">
        <span>l41果冻铺 · 角色智能抠图与 Q 弹果冻动图工坊</span>
        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
      </footer>
    </div>
  );
}
