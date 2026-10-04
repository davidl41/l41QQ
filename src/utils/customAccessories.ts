import { CustomAccessoryItem } from '../types/gif';
import { removeBorderBackground, removeWhiteBackground, smoothEdgeAntiAliasing, trimTransparent } from './cutout';

const STORAGE_KEY = 'l41_custom_accessories_shelf';

export function getStoredCustomAccessories(): CustomAccessoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get custom accessories from localStorage', e);
    return [];
  }
}

export function saveStoredCustomAccessory(item: CustomAccessoryItem): CustomAccessoryItem[] {
  try {
    const list = getStoredCustomAccessories().filter((a) => a.id !== item.id);
    const updated = [item, ...list];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save custom accessory', e);
    return [];
  }
}

export function deleteStoredCustomAccessory(id: string): CustomAccessoryItem[] {
  try {
    const list = getStoredCustomAccessories().filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Failed to delete custom accessory', e);
    return [];
  }
}

/**
 * Automatically cuts out the background of an uploaded accessory image,
 * performs trimming and edge smoothing, returning a pristine transparent PNG Data URL.
 */
export async function autoCutoutAccessoryImage(
  src: string,
  tolerance: number = 32
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 500;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);

      // Perform auto background cutout
      removeBorderBackground(canvas, tolerance);
      removeWhiteBackground(canvas, 246);
      smoothEdgeAntiAliasing(canvas);

      // Trim outer margins
      const trimmed = trimTransparent(canvas, 4);
      resolve(trimmed.toDataURL('image/png'));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
