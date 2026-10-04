export type AspectRatio = '16:9' | '9:16';
export type Resolution = '720p' | '1080p';

export interface GenerationHistoryItem {
  id: string;
  timestamp: number;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  videoUrl?: string; // object URL or data URL
  thumbnailUrl?: string;
  originalImage?: string;
  operationName: string;
  duration?: number;
}

export interface PresetCharacter {
  id: string;
  name: string;
  title: string;
  description: string;
  avatarSvg: string; // inline data URI or SVG string
  imageDataUrl: string;
  suggestedPrompt?: string;
}

export interface PresetPrompt {
  id: string;
  title: string;
  badge: string;
  description: string;
  prompt: string;
  aspectRatio: AspectRatio;
}
