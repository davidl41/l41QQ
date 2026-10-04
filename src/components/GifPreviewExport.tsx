import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  Check,
  Copy,
  Hand,
  Layers,
  FileArchive,
  Image as ImageIcon,
  ShieldCheck,
  Video,
  Move,
} from 'lucide-react';
import { BounceConfig, ExportFormat } from '../types/gif';
import {
  getBounceTransform,
  drawBounceFrame,
  generateQElasticGif,
  generateSpritesheetPng,
  generateZipFrames,
  generateAnimatedWebp,
  GeneratedExportResult,
  BounceTransform,
} from '../utils/gifGenerator';
import { getAccessoryScreenPosition } from '../utils/accessoriesRenderer';
import { playCartoonBounceSound, isSoundEnabled, setSoundEnabled } from '../utils/audioEffects';

interface GifPreviewExportProps {
  sourceCanvas: HTMLCanvasElement | null;
  config: BounceConfig;
  localMaskCanvas?: HTMLCanvasElement | null;
  onChangeConfig?: (newConfig: BounceConfig) => void;
}

export const GifPreviewExport: React.FC<GifPreviewExportProps> = ({
  sourceCanvas,
  config,
  localMaskCanvas,
  onChangeConfig,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('gif');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [exportResult, setExportResult] = useState<GeneratedExportResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  // Interactive Jelly Drag & Release State
  const [isDraggingJelly, setIsDraggingJelly] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapbackDecay, setSnapbackDecay] = useState<{ ampX: number; ampY: number; startTime: number } | null>(null);

  // Direct Mouse Drag for Accessory Position
  const [isHoveringAcc, setIsHoveringAcc] = useState(false);
  const [isDraggingAcc, setIsDraggingAcc] = useState(false);
  const dragAccStartRef = useRef<{ clientX: number; clientY: number; startOffX: number; startOffY: number }>({
    clientX: 0,
    clientY: 0,
    startOffX: 0,
    startOffY: 0,
  });

  // Direct Mouse Drag for Local Bounce Anchor Pin (自选多固定点: 1点对1部位)
  const [hoveredAnchorId, setHoveredAnchorId] = useState<string | null>(null);
  const [draggingAnchorId, setDraggingAnchorId] = useState<string | null>(null);
  const [draggingEndpoint, setDraggingEndpoint] = useState<1 | 2>(1);

  // Direct Mouse Drag for Local Bounce Part (部位拖动挪位置)
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [draggingPartId, setDraggingPartId] = useState<string | null>(null);
  const dragPartStartRef = useRef<{
    clientX: number;
    clientY: number;
    startOffX: number;
    startOffY: number;
    startAncX: number;
    startAncY: number;
  }>({
    clientX: 0,
    clientY: 0,
    startOffX: 0,
    startOffY: 0,
    startAncX: 0,
    startAncY: 0,
  });

  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const latestTransformRef = useRef<BounceTransform>({
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    anchorX: 0.5,
    anchorY: 0.95,
  });
  const latestPhaseRef = useRef<number>(0);

  // Real-time physics canvas animation loop
  useEffect(() => {
    if (!sourceCanvas) return;

    let active = true;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (!active) return;
      const now = Date.now();
      let phase = latestPhaseRef.current;
      if (isPlaying) {
        const elapsedSec = (now - startTimeRef.current) / 1000;
        const cycleDuration = 1.2 / config.speed;
        phase = (elapsedSec % cycleDuration) / cycleDuration;
        latestPhaseRef.current = phase;
      }

      let transform: BounceTransform;

      // Handle interactive drag and release physics for character body
      if (isDraggingJelly) {
        const dx = dragOffset.x;
        const dy = dragOffset.y;
        const stretchX = 1 + dx * 0.005 - dy * 0.003;
        const stretchY = 1 + dy * 0.005 - Math.abs(dx) * 0.003;
        const rotation = dx * 0.002;

        transform = {
          scaleX: Math.max(0.4, Math.min(2.0, stretchX)),
          scaleY: Math.max(0.4, Math.min(2.0, stretchY)),
          translateX: dx * 0.7,
          translateY: dy * 0.7,
          rotation,
          skewX: dx * 0.0015,
          skewY: 0,
          anchorX: 0.5,
          anchorY: 0.95,
        };
      } else if (snapbackDecay) {
        const snapElapsed = (now - snapbackDecay.startTime) / 1000;
        const duration = 0.7;

        if (snapElapsed >= duration) {
          setSnapbackDecay(null);
          transform = getBounceTransform(config.motion, config.amplitude, phase, config.easing ?? 35, config.volumeConservation ?? true);
        } else {
          const decay = Math.exp(-6.5 * snapElapsed);
          const omega = 28;
          const osc = Math.cos(omega * snapElapsed);

          const snapX = snapbackDecay.ampX * decay * osc * 0.004;
          const snapY = snapbackDecay.ampY * decay * osc * 0.004;

          transform = {
            scaleX: 1 - snapX + snapY * 0.5,
            scaleY: 1 - snapY + Math.abs(snapX) * 0.5,
            translateX: snapbackDecay.ampX * decay * osc * 0.3,
            translateY: snapbackDecay.ampY * decay * osc * 0.3,
            rotation: snapbackDecay.ampX * decay * osc * 0.001,
            skewX: 0,
            skewY: 0,
            anchorX: 0.5,
            anchorY: 0.95,
          };
        }
      } else {
        transform = getBounceTransform(
          config.motion,
          config.amplitude,
          phase,
          config.easing ?? 35
        );
      }

      latestTransformRef.current = transform;

      // Draw standard frame
      drawBounceFrame(
        ctx,
        sourceCanvas,
        sourceCanvas.width,
        sourceCanvas.height,
        config.outputSize,
        transform,
        config.bgType === 'transparent' ? 'transparent' : config.bgType,
        config.groundShadow ?? true,
        config.impactRipple ?? true,
        config.accessory,
        phase,
        localMaskCanvas,
        config.localBounce,
        config.bounceDirection,
        config.bounceAngle
      );

      // If hovering or dragging accessory, draw visual drag ring overlay
      if (config.accessory && config.accessory.type !== 'none' && (isHoveringAcc || isDraggingAcc)) {
        const accPos = getAccessoryScreenPosition(
          config.outputSize,
          config.outputSize,
          transform,
          config.accessory,
          phase
        );

        ctx.save();
        ctx.strokeStyle = isDraggingAcc ? '#f59e0b' : '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(accPos.x, accPos.y, accPos.radius + 10, 0, Math.PI * 2);
        ctx.stroke();

        // Little center crosshair
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(accPos.x, accPos.y, 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // If local bounce is enabled, draw all user-defined anchor pins 📍 on canvas
      if (config.localBounce?.enabled) {
        const safeMargin = 1.45;
        const scaleRatio = Math.min(
          (config.outputSize * 0.84) / (sourceCanvas.width * safeMargin),
          (config.outputSize * 0.84) / (sourceCanvas.height * safeMargin)
        );
        const drawW = sourceCanvas.width * scaleRatio;
        const drawH = sourceCanvas.height * scaleRatio;
        const charLeft = config.outputSize * 0.5 - drawW * 0.5;
        const charTop = config.outputSize * 0.95 - drawH * 0.95;

        const currentParts = config.localBounce.parts || [];

        if (currentParts.length > 0) {
          // 仅当用户点击/选中某个部位时，才弹出该部位对应的专属锚点；演示时不出现锚点
          const activePart = currentParts.find((p) => p.id === config.localBounce?.activePartId);

          if (activePart && activePart.visible !== false) {
            const pinPixelX = charLeft + activePart.anchorX * drawW + (activePart.offsetX * scaleRatio);
            const pinPixelY = charTop + activePart.anchorY * drawH + (activePart.offsetY * scaleRatio);
            const isDragging = activePart.id === draggingAnchorId || activePart.id === draggingPartId;

            // 贴图与锚点完全重合对齐计算
            const pScale = activePart.scale ?? 1.0;
            const bW = activePart.sourceW * scaleRatio * pScale;
            const bH = activePart.sourceH * scaleRatio * pScale;

            let bX: number;
            let bY: number;

            if (activePart.type === 'preset-sticker' || activePart.type === 'custom-upload') {
              // 预设挂件与自制贴图：锚点与贴图中心绝对重合！
              bX = pinPixelX - bW * 0.5;
              bY = pinPixelY - bH * 0.5;
            } else {
              // 原图抠出部位：锚点与原图相对截取位置完全重合
              const dx = (activePart.sourceX - activePart.anchorX * sourceCanvas.width) * scaleRatio;
              const dy = (activePart.sourceY - activePart.anchorY * sourceCanvas.height) * scaleRatio;
              bX = pinPixelX + dx;
              bY = pinPixelY + dy;
            }

            // Draw dashed selection bounding box around the active part
            ctx.save();

            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(bX, bY, bW, bH);

            // Small badge on box top
            ctx.fillStyle = 'rgba(2, 132, 199, 0.9)';
            ctx.fillRect(bX, Math.max(0, bY - 15), Math.min(bW, 80), 15);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(activePart.name.slice(0, 6), bX + 4, Math.max(0, bY - 7.5));
            ctx.restore();

            // 弹出对应的专属 1:1 扎根锚点 (支持单点或线段底边缝合线)
            ctx.save();

            if (activePart.anchorMode === 'line') {
              // 📏 线段锚点模式：绘制两个端点及连接线
              const anc2X = activePart.anchorX2 ?? Math.min(0.98, activePart.anchorX + 0.12);
              const anc2Y = activePart.anchorY2 ?? activePart.anchorY;
              const pin2X = charLeft + anc2X * drawW + (activePart.offsetX * scaleRatio);
              const pin2Y = charTop + anc2Y * drawH + (activePart.offsetY * scaleRatio);

              // 绘制扎根缝合线
              ctx.strokeStyle = '#6366f1';
              ctx.lineWidth = 3;
              ctx.setLineDash([5, 3]);
              ctx.beginPath();
              ctx.moveTo(pinPixelX, pinPixelY);
              ctx.lineTo(pin2X, pin2Y);
              ctx.stroke();

              // 端点 1 (左根部)
              ctx.setLineDash([]);
              ctx.fillStyle = '#6366f1';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(pinPixelX, pinPixelY, 7, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              // 端点 2 (右根部)
              ctx.beginPath();
              ctx.arc(pin2X, pin2Y, 7, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              // 中间缝合线标识
              const midX = (pinPixelX + pin2X) / 2;
              const midY = (pinPixelY + pin2Y) / 2;
              ctx.fillStyle = 'rgba(79, 70, 229, 0.9)';
              ctx.beginPath();
              const labelLine = `📏 ${activePart.name} 缝合底边 (防脱节)`;
              ctx.roundRect(midX - 60, midY - 24, 120, 16, 4);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 9px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'alphabetic';
              ctx.fillText(labelLine, midX, midY - 13);

              // 绘制弹力方向指示箭头 🧭
              const dirAngleRad = ((activePart.bounceDirectionAngle || 0) * Math.PI) / 180;
              const arrowLen = 34;
              const arrowEndX = midX + Math.sin(dirAngleRad) * arrowLen;
              const arrowEndY = midY - Math.cos(dirAngleRad) * arrowLen;

              ctx.strokeStyle = '#f43f5e';
              ctx.lineWidth = 2.5;
              ctx.setLineDash([]);
              ctx.beginPath();
              ctx.moveTo(midX, midY);
              ctx.lineTo(arrowEndX, arrowEndY);
              ctx.stroke();

              const headLen = 7;
              const arrowAngle = Math.atan2(arrowEndY - midY, arrowEndX - midX);
              ctx.fillStyle = '#f43f5e';
              ctx.beginPath();
              ctx.moveTo(arrowEndX, arrowEndY);
              ctx.lineTo(
                arrowEndX - headLen * Math.cos(arrowAngle - Math.PI / 6),
                arrowEndY - headLen * Math.sin(arrowAngle - Math.PI / 6)
              );
              ctx.lineTo(
                arrowEndX - headLen * Math.cos(arrowAngle + Math.PI / 6),
                arrowEndY - headLen * Math.sin(arrowAngle + Math.PI / 6)
              );
              ctx.closePath();
              ctx.fill();
            } else {
              // 📍 单点模式
              ctx.strokeStyle = isDragging ? '#0284c7' : 'rgba(2, 132, 199, 0.7)';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.arc(pinPixelX, pinPixelY, 13, 0, Math.PI * 2);
              ctx.stroke();

              ctx.fillStyle = '#0284c7';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(pinPixelX, pinPixelY, 7, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(pinPixelX, pinPixelY, 2.5, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
              ctx.beginPath();
              const labelText = `📍 ${activePart.name} 扎根锚点`;
              ctx.roundRect(pinPixelX - 50, pinPixelY - 26, 100, 17, 4);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 9px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'alphabetic';
              ctx.fillText(labelText, pinPixelX, pinPixelY - 14);
            }

            ctx.restore();
          }
        } else if (config.localBounce.anchors?.length) {
          // Legacy anchors fallback
          config.localBounce.anchors.forEach((anc, idx) => {
            const pinPixelX = charLeft + anc.anchorX * drawW;
            const pinPixelY = charTop + anc.anchorY * drawH;
            const isSelected = anc.id === config.localBounce?.activeAnchorId;
            const isHovered = anc.id === hoveredAnchorId;
            const isDragging = anc.id === draggingAnchorId;

            ctx.save();
            ctx.fillStyle = isSelected ? '#e11d48' : '#f43f5e';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pinPixelX, pinPixelY, isSelected ? 7 : 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(idx + 1), pinPixelX, pinPixelY);

            ctx.strokeStyle = (isDragging || isSelected) ? '#f43f5e' : 'rgba(244, 63, 94, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(pinPixelX, pinPixelY, isSelected ? 13 : 11, 0, Math.PI * 2);
            ctx.stroke();

            if (isHovered || isDragging || isSelected) {
              ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
              ctx.beginPath();
              const labelText = `📍 ${anc.name || `固定点 ${idx + 1}`}`;
              ctx.roundRect(pinPixelX - 38, pinPixelY - 26, 76, 17, 4);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 9px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'alphabetic';
              ctx.fillText(labelText, pinPixelX, pinPixelY - 14);
            }
            ctx.restore();
          });
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      active = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [sourceCanvas, config, isDraggingJelly, dragOffset, snapbackDecay, localMaskCanvas, isHoveringAcc, isDraggingAcc, hoveredAnchorId, draggingAnchorId, hoveredPartId, draggingPartId, isPlaying]);

  // Pointer interactions: Handle Anchor Pin Drag vs Part Drag vs Accessory Drag vs Character Jelly Drag
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !sourceCanvas) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const scale = config.outputSize / rect.width;
    const mouseCanvasX = (e.clientX - rect.left) * scale;
    const mouseCanvasY = (e.clientY - rect.top) * scale;

    const parts = config.localBounce?.parts || [];
    const hasParts = config.localBounce?.enabled && parts.length > 0;

    const safeMargin = 1.45;
    const scaleRatio = Math.min(
      (config.outputSize * 0.84) / (sourceCanvas.width * safeMargin),
      (config.outputSize * 0.84) / (sourceCanvas.height * safeMargin)
    );
    const drawW = sourceCanvas.width * scaleRatio;
    const drawH = sourceCanvas.height * scaleRatio;
    const charLeft = config.outputSize * 0.5 - drawW * 0.5;
    const charTop = config.outputSize * 0.95 - drawH * 0.95;

    // 1. Check hit test against Local Bounce Parts (点击部位选中并弹锚点，或拖拽已弹出的锚点)
    if (hasParts && onChangeConfig) {
      const activePart = parts.find((p) => p.id === config.localBounce?.activePartId);

      // 1A. 若当前已有选中部位，检测是否点击在锚点端点上
      if (activePart && activePart.visible !== false) {
        const pinPixelX = charLeft + activePart.anchorX * drawW + (activePart.offsetX * scaleRatio);
        const pinPixelY = charTop + activePart.anchorY * drawH + (activePart.offsetY * scaleRatio);

        if (activePart.anchorMode === 'line') {
          const anc2X = activePart.anchorX2 ?? Math.min(0.98, activePart.anchorX + 0.12);
          const anc2Y = activePart.anchorY2 ?? activePart.anchorY;
          const pin2X = charLeft + anc2X * drawW + (activePart.offsetX * scaleRatio);
          const pin2Y = charTop + anc2Y * drawH + (activePart.offsetY * scaleRatio);

          if (Math.hypot(mouseCanvasX - pin2X, mouseCanvasY - pin2Y) <= 22) {
            setDraggingAnchorId(activePart.id);
            setDraggingEndpoint(2);
            return;
          }
        }

        if (Math.hypot(mouseCanvasX - pinPixelX, mouseCanvasY - pinPixelY) <= 22) {
          setDraggingAnchorId(activePart.id);
          setDraggingEndpoint(1);
          return;
        }
      }

      // 1B. 检测是否点击在任何部位的包围盒内（点击部位再弹出对应锚点，并支持拖动挪位置）
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        if (part.visible === false) continue;
        const pPinX = charLeft + part.anchorX * drawW + (part.offsetX * scaleRatio);
        const pPinY = charTop + part.anchorY * drawH + (part.offsetY * scaleRatio);
        const pScale = part.scale ?? 1.0;
        const bW = part.sourceW * scaleRatio * pScale;
        const bH = part.sourceH * scaleRatio * pScale;

        let bX: number;
        let bY: number;

        if (part.type === 'preset-sticker' || part.type === 'custom-upload') {
          bX = pPinX - bW * 0.5;
          bY = pPinY - bH * 0.5;
        } else {
          const dx = (part.sourceX - part.anchorX * sourceCanvas.width) * scaleRatio;
          const dy = (part.sourceY - part.anchorY * sourceCanvas.height) * scaleRatio;
          bX = pPinX + dx;
          bY = pPinY + dy;
        }

        if (
          mouseCanvasX >= bX &&
          mouseCanvasX <= bX + bW &&
          mouseCanvasY >= bY &&
          mouseCanvasY <= bY + bH
        ) {
          setDraggingPartId(part.id);
          dragPartStartRef.current = {
            clientX: e.clientX,
            clientY: e.clientY,
            startOffX: part.offsetX || 0,
            startOffY: part.offsetY || 0,
            startAncX: part.anchorX,
            startAncY: part.anchorY,
          };
          onChangeConfig({
            ...config,
            localBounce: {
              ...config.localBounce,
              activePartId: part.id,
            },
          });
          return;
        }
      }
    } else if (config.localBounce?.enabled && config.localBounce.anchors?.length && onChangeConfig) {
      // Legacy anchor check
      for (const anc of config.localBounce.anchors) {
        const pinPixelX = charLeft + anc.anchorX * drawW;
        const pinPixelY = charTop + anc.anchorY * drawH;
        const distToPin = Math.hypot(mouseCanvasX - pinPixelX, mouseCanvasY - pinPixelY);
        if (distToPin <= 20) {
          setDraggingAnchorId(anc.id);
          onChangeConfig({
            ...config,
            localBounce: {
              ...config.localBounce,
              activeAnchorId: anc.id,
            },
          });
          return;
        }
      }
    }

    // 2. Check hit test against accessory
    if (config.accessory && config.accessory.type !== 'none') {
      const accPos = getAccessoryScreenPosition(
        config.outputSize,
        config.outputSize,
        latestTransformRef.current,
        config.accessory,
        latestPhaseRef.current
      );

      const dist = Math.hypot(mouseCanvasX - accPos.x, mouseCanvasY - accPos.y);
      if (dist <= Math.max(36, accPos.radius + 14)) {
        // Dragging accessory directly!
        setIsDraggingAcc(true);
        dragAccStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          startOffX: config.accessory.offsetX ?? 55,
          startOffY: config.accessory.offsetY ?? -80,
        };
        return;
      }
    }

    // 3. 点击空白处：若此前选中了部位，取消选中收起锚点（演示时不要出现锚点）
    if (config.localBounce?.activePartId && onChangeConfig) {
      onChangeConfig({
        ...config,
        localBounce: {
          ...config.localBounce,
          activePartId: undefined,
        },
      });
    }

    // 4. Otherwise: Dragging character jelly body
    setIsDraggingJelly(true);
    setSnapbackDecay(null);
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !sourceCanvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = config.outputSize / rect.width;
    const mouseCanvasX = (e.clientX - rect.left) * scale;
    const mouseCanvasY = (e.clientY - rect.top) * scale;

    const parts = config.localBounce?.parts || [];
    const hasParts = config.localBounce?.enabled && parts.length > 0;

    const safeMargin = 1.45;
    const scaleRatio = Math.min(
      (config.outputSize * 0.84) / (sourceCanvas.width * safeMargin),
      (config.outputSize * 0.84) / (sourceCanvas.height * safeMargin)
    );
    const drawW = sourceCanvas.width * scaleRatio;
    const drawH = sourceCanvas.height * scaleRatio;
    const charLeft = config.outputSize * 0.5 - drawW * 0.5;
    const charTop = config.outputSize * 0.95 - drawH * 0.95;

    // If dragging anchor pin: update anchorX and anchorY of that anchor
    if (draggingAnchorId && onChangeConfig) {
      if (hasParts) {
        const targetPart = parts.find((p) => p.id === draggingAnchorId);
        if (targetPart) {
          const newAncX = Math.max(
            0.01,
            Math.min(0.99, (mouseCanvasX - (charLeft + (targetPart.offsetX || 0) * scaleRatio)) / drawW)
          );
          const newAncY = Math.max(
            0.01,
            Math.min(0.99, (mouseCanvasY - (charTop + (targetPart.offsetY || 0) * scaleRatio)) / drawH)
          );
          const nextParts = parts.map((p) => {
            if (p.id !== draggingAnchorId) return p;
            if (p.anchorMode === 'line' && draggingEndpoint === 2) {
              return {
                ...p,
                anchorX2: Number(newAncX.toFixed(4)),
                anchorY2: Number(newAncY.toFixed(4)),
              };
            }
            return {
              ...p,
              anchorX: Number(newAncX.toFixed(4)),
              anchorY: Number(newAncY.toFixed(4)),
            };
          });
          onChangeConfig({
            ...config,
            localBounce: {
              ...config.localBounce,
              parts: nextParts,
              activePartId: draggingAnchorId,
              anchors: nextParts.map((p) => ({
                id: p.id,
                name: p.name,
                anchorX: p.anchorX,
                anchorY: p.anchorY,
                motion: p.motion,
              })),
            },
          });
          return;
        }
      } else if (config.localBounce?.anchors) {
        const newAnchorX = Math.max(0.05, Math.min(0.95, (mouseCanvasX - charLeft) / drawW));
        const newAnchorY = Math.max(0.05, Math.min(0.95, (mouseCanvasY - charTop) / drawH));

        const nextAnchors = config.localBounce.anchors.map((a) =>
          a.id === draggingAnchorId
            ? {
                ...a,
                anchorX: Number(newAnchorX.toFixed(2)),
                anchorY: Number(newAnchorY.toFixed(2)),
              }
            : a
        );

        onChangeConfig({
          ...config,
          localBounce: {
            ...config.localBounce,
            anchors: nextAnchors,
            activeAnchorId: draggingAnchorId,
          },
        });
        return;
      }
    }

    // If dragging a part itself (拖动挪位置):
    if (draggingPartId && onChangeConfig && hasParts) {
      const deltaX = (e.clientX - dragPartStartRef.current.clientX) * scale;
      const deltaY = (e.clientY - dragPartStartRef.current.clientY) * scale;
      const newOffX = Math.round(dragPartStartRef.current.startOffX + deltaX / scaleRatio);
      const newOffY = Math.round(dragPartStartRef.current.startOffY + deltaY / scaleRatio);
      const newAncX = Math.max(0.01, Math.min(0.99, dragPartStartRef.current.startAncX + deltaX / drawW));
      const newAncY = Math.max(0.01, Math.min(0.99, dragPartStartRef.current.startAncY + deltaY / drawH));

      const nextParts = parts.map((p) =>
        p.id === draggingPartId
          ? {
              ...p,
              offsetX: newOffX,
              offsetY: newOffY,
              anchorX: Number(newAncX.toFixed(4)),
              anchorY: Number(newAncY.toFixed(4)),
            }
          : p
      );

      onChangeConfig({
        ...config,
        localBounce: {
          ...config.localBounce,
          parts: nextParts,
          activePartId: draggingPartId,
          anchors: nextParts.map((p) => ({
            id: p.id,
            name: p.name,
            anchorX: p.anchorX,
            anchorY: p.anchorY,
            motion: p.motion,
          })),
        },
      });
      return;
    }

    // If dragging accessory: update offset
    if (isDraggingAcc && onChangeConfig && config.accessory) {
      const deltaX = (e.clientX - dragAccStartRef.current.clientX) * scale;
      const deltaY = (e.clientY - dragAccStartRef.current.clientY) * scale;
      const newX = Math.round(dragAccStartRef.current.startOffX + deltaX);
      const newY = Math.round(dragAccStartRef.current.startOffY + deltaY);

      const maxReach = Math.round(config.outputSize * 0.6);
      onChangeConfig({
        ...config,
        accessory: {
          ...config.accessory,
          offsetX: Math.max(-maxReach, Math.min(maxReach, newX)),
          offsetY: Math.max(-maxReach, Math.min(maxReach, newY)),
        },
      });
      return;
    }

    // If dragging character body
    if (isDraggingJelly) {
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      setDragOffset({ x: dx, y: dy });
      return;
    }

    // Hover hit test
    if (hasParts) {
      let foundAnchorHover: string | null = null;
      let foundPartHover: string | null = null;

      // 仅对当前被选中的部位弹出锚点检测 hover
      const activePart = parts.find((p) => p.id === config.localBounce?.activePartId);
      if (activePart && activePart.visible !== false) {
        const pinPixelX = charLeft + activePart.anchorX * drawW + (activePart.offsetX * scaleRatio);
        const pinPixelY = charTop + activePart.anchorY * drawH + (activePart.offsetY * scaleRatio);
        if (Math.hypot(mouseCanvasX - pinPixelX, mouseCanvasY - pinPixelY) <= 20) {
          foundAnchorHover = activePart.id;
        }
      }

      for (const part of parts) {
        if (part.visible === false) continue;
        const pPinX = charLeft + part.anchorX * drawW + (part.offsetX * scaleRatio);
        const pPinY = charTop + part.anchorY * drawH + (part.offsetY * scaleRatio);
        const pScale = part.scale ?? 1.0;
        const bW = part.sourceW * scaleRatio * pScale;
        const bH = part.sourceH * scaleRatio * pScale;

        let bX: number;
        let bY: number;

        if (part.type === 'preset-sticker' || part.type === 'custom-upload') {
          bX = pPinX - bW * 0.5;
          bY = pPinY - bH * 0.5;
        } else {
          const dx = (part.sourceX - part.anchorX * sourceCanvas.width) * scaleRatio;
          const dy = (part.sourceY - part.anchorY * sourceCanvas.height) * scaleRatio;
          bX = pPinX + dx;
          bY = pPinY + dy;
        }
        if (
          mouseCanvasX >= bX &&
          mouseCanvasX <= bX + bW &&
          mouseCanvasY >= bY &&
          mouseCanvasY <= bY + bH
        ) {
          foundPartHover = part.id;
          break;
        }
      }

      setHoveredAnchorId(foundAnchorHover);
      setHoveredPartId(foundPartHover);
    } else if (config.localBounce?.enabled && config.localBounce.anchors?.length) {
      let foundHover: string | null = null;
      for (const anc of config.localBounce.anchors) {
        const pinPixelX = charLeft + anc.anchorX * drawW;
        const pinPixelY = charTop + anc.anchorY * drawH;
        if (Math.hypot(mouseCanvasX - pinPixelX, mouseCanvasY - pinPixelY) <= 20) {
          foundHover = anc.id;
          break;
        }
      }
      setHoveredAnchorId(foundHover);
      setHoveredPartId(null);
    } else {
      setHoveredAnchorId(null);
      setHoveredPartId(null);
    }

    // Hover hit test for accessory
    if (config.accessory && config.accessory.type !== 'none') {
      const accPos = getAccessoryScreenPosition(
        config.outputSize,
        config.outputSize,
        latestTransformRef.current,
        config.accessory,
        latestPhaseRef.current
      );
      const dist = Math.hypot(mouseCanvasX - accPos.x, mouseCanvasY - accPos.y);
      setIsHoveringAcc(dist <= Math.max(36, accPos.radius + 14));
    } else {
      setIsHoveringAcc(false);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (draggingAnchorId) {
      setDraggingAnchorId(null);
      return;
    }

    if (draggingPartId) {
      setDraggingPartId(null);
      return;
    }

    if (isDraggingAcc) {
      setIsDraggingAcc(false);
      return;
    }

    if (isDraggingJelly) {
      setIsDraggingJelly(false);
      const dx = dragOffset.x;
      const dy = dragOffset.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        setSnapbackDecay({
          ampX: dx,
          ampY: dy,
          startTime: Date.now(),
        });
        playCartoonBounceSound(Math.min(2.0, Math.hypot(dx, dy) / 45));
      }
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Multi-Format Export Handler
  const handleStartExport = async () => {
    if (!sourceCanvas) return;
    setIsGenerating(true);
    setGenerateProgress(0);

    try {
      let result: GeneratedExportResult;

      switch (selectedFormat) {
        case 'wechat-gif':
          result = await generateQElasticGif(
            sourceCanvas,
            { ...config, wechatOptimized: true },
            setGenerateProgress,
            localMaskCanvas
          );
          break;

        case 'spritesheet':
          result = await generateSpritesheetPng(
            sourceCanvas,
            config,
            setGenerateProgress,
            localMaskCanvas
          );
          break;

        case 'zip-frames':
          result = await generateZipFrames(
            sourceCanvas,
            config,
            setGenerateProgress,
            localMaskCanvas
          );
          break;

        case 'webp':
          result = await generateAnimatedWebp(
            sourceCanvas,
            config,
            setGenerateProgress,
            localMaskCanvas
          );
          break;

        case 'gif':
        default:
          result = await generateQElasticGif(
            sourceCanvas,
            config,
            setGenerateProgress,
            localMaskCanvas
          );
          break;
      }

      setExportResult(result);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!exportResult) return;
    try {
      if (exportResult.format === 'gif' || exportResult.format === 'wechat-gif') {
        const item = new ClipboardItem({ 'image/gif': exportResult.blob });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.warn('Clipboard copy fallback', e);
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!exportResult) return;
    const a = document.createElement('a');
    a.href = exportResult.url;
    a.download = exportResult.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">
            3
          </span>
          <h2 className="text-base font-bold text-stone-800">实时预览与多格式导出</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              setSoundEnabled(next);
              if (next) playCartoonBounceSound(1.0);
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
              soundOn
                ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            title={soundOn ? '点击关闭Q弹音效' : '点击开启Q弹卡通Duang音效'}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 text-amber-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span>{soundOn ? 'Duang音效已开' : '静音'}</span>
          </button>

          {/* Mode & Selection Indicator */}
        {config.localBounce?.activePartId ? (
          <button
            type="button"
            onClick={() =>
              onChangeConfig &&
              onChangeConfig({
                ...config,
                localBounce: { ...config.localBounce, activePartId: undefined },
              })
            }
            className="text-[11px] text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1 rounded-full border border-sky-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            title="退出部位编辑，隐藏锚点并进入纯净演示"
          >
            <span>🎬 退出编辑 · 纯净演示</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>纯净演示模式（点击部位弹锚点）</span>
          </span>
        )}
        </div>
      </div>

      {/* Interactive Physics Preview Viewport */}
      <div className="relative border border-stone-200 rounded-2xl overflow-hidden bg-stone-100 flex items-center justify-center p-4 min-h-[340px]">
        {/* Transparent Checkerboard */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
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

        <canvas
          ref={previewCanvasRef}
          width={config.outputSize}
          height={config.outputSize}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative max-w-full max-h-[340px] object-contain drop-shadow-md rounded-xl select-none touch-none ${
            isDraggingAcc || draggingPartId
              ? 'cursor-move ring-2 ring-sky-400'
              : draggingAnchorId
              ? 'cursor-crosshair ring-2 ring-rose-400'
              : isHoveringAcc || hoveredPartId
              ? 'cursor-move'
              : hoveredAnchorId
              ? 'cursor-crosshair'
              : isDraggingJelly
              ? 'cursor-grabbing scale-105'
              : 'cursor-grab hover:scale-[1.02]'
          } transition-transform duration-75`}
          title="鼠标按住部位可挪位置，按住固定点可调扎根，按住身体可拉扯体验果冻回弹！"
        />

        {/* Live Interaction Overlay Badge & Play/Pause */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 bg-black/75 hover:bg-black/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs transition-all active:scale-95 cursor-pointer"
            title={isPlaying ? '暂停动效 (方便定格部位拖拽与微调)' : '继续播放动效'}
          >
            {isPlaying ? <Pause className="w-3 h-3 text-sky-400" /> : <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />}
            <span>{isPlaying ? '暂停' : '播放'}</span>
          </button>

          <div className="flex items-center gap-1.5 bg-black/65 backdrop-blur-xs text-white text-[10px] font-medium px-2.5 py-1 rounded-full shadow-xs">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>
              {isDraggingAcc
                ? '正在拖动挂件位置...'
                : draggingAnchorId
                ? '正在微调扎根锚点 📍...'
                : draggingPartId
                ? '正在拖动挪动部位位置 ✂️...'
                : config.localBounce?.activePartId
                ? '部位编辑中（点击空白处收回锚点）'
                : isDraggingJelly
                ? '果冻拉扯形变中...'
                : snapbackDecay
                ? 'Duang~ 物理回弹中'
                : isPlaying
                ? '60fps 纯净演示中'
                : '已定格暂停'}
            </span>
          </div>
        </div>

        {/* Drag Hint at bottom */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-stone-200 shadow-xs text-xs">
          <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1">
            <Move className="w-3.5 h-3.5 text-sky-600" />
            <span>点击部位可弹出锚点并拖动挪位</span>
          </span>
        </div>
      </div>

      {/* Multi-Format Export Selector Tabs */}
      <div>
        <label className="text-xs font-bold text-stone-700 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>选择导出格式与规范：</span>
          </span>
          <span className="text-[10px] text-stone-400">支持表情包/WebP/雪碧图/序列帧</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {[
            {
              id: 'gif' as ExportFormat,
              name: '标准 GIF',
              badge: '通用动图',
              icon: ImageIcon,
            },
            {
              id: 'wechat-gif' as ExportFormat,
              name: '微信规范 GIF',
              badge: '<1MB·240px',
              icon: ShieldCheck,
              highlight: true,
            },
            {
              id: 'webp' as ExportFormat,
              name: '高帧率动画 WebP',
              badge: '半透明',
              icon: Video,
            },
            {
              id: 'spritesheet' as ExportFormat,
              name: '雪碧图 PNG',
              badge: '游戏/二创',
              icon: Layers,
            },
            {
              id: 'zip-frames' as ExportFormat,
              name: '序列帧 ZIP',
              badge: '逐帧PNG',
              icon: FileArchive,
            },
          ].map((item) => {
            const isSelected = selectedFormat === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedFormat(item.id)}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all flex flex-col items-center justify-between gap-1 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/90 text-indigo-950 font-bold shadow-2xs ring-1 ring-indigo-300'
                    : item.highlight
                    ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-900'
                    : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs">{item.name}</span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                    isSelected
                      ? 'bg-indigo-200 text-indigo-900 font-semibold'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Export Action Button */}
      <button
        type="button"
        disabled={isGenerating || !sourceCanvas}
        onClick={handleStartExport}
        className="w-full py-3.5 px-4 rounded-xl bg-linear-to-r from-indigo-500 via-rose-500 to-amber-500 hover:from-indigo-600 hover:via-rose-600 hover:to-amber-600 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
      >
        {isGenerating ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <span>正在高清渲染生成中 ({generateProgress}%)...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>
              立即生成并导出{' '}
              {selectedFormat === 'wechat-gif'
                ? '微信规范 GIF 表情包'
                : selectedFormat === 'spritesheet'
                ? '动画雪碧图 PNG'
                : selectedFormat === 'zip-frames'
                ? '序列帧 ZIP 压缩包'
                : selectedFormat === 'webp'
                ? '高帧率动画 WebP'
                : 'Q 弹透明 GIF'}
            </span>
          </>
        )}
      </button>

      {/* Progress Bar */}
      {isGenerating && (
        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden border border-stone-200">
          <div
            className="bg-linear-to-r from-rose-500 to-indigo-500 h-full transition-all duration-150"
            style={{ width: `${generateProgress}%` }}
          />
        </div>
      )}

      {/* Exported Result Card */}
      {exportResult && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>渲染导出成功！</span>
            </div>
            <div className="text-[11px] font-mono text-emerald-700 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200">
              {formatFileSize(exportResult.sizeBytes)} · {exportResult.width}×{exportResult.height}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>保存文件到电脑</span>
            </button>

            {(exportResult.format === 'gif' || exportResult.format === 'wechat-gif') && (
              <button
                type="button"
                onClick={handleCopy}
                className="py-2.5 px-3 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已复制！可直接发微信' : '复制动图到剪贴板'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
