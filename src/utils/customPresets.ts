import { PresetCharacter } from '../types/veo';
import { PRESET_CHARACTERS, USER_CUSTOM_IMAGE_DATA, USER_CUSTOM_CHARACTER_NAME } from '../constants/presets';

const STORAGE_KEY = 'l41_custom_preset_characters';
const DEFAULT_ID_KEY = 'l41_default_preset_character_id';

export function getStoredCustomPresets(): PresetCharacter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse custom presets from localStorage', e);
    return [];
  }
}

export function saveStoredCustomPreset(preset: PresetCharacter): void {
  try {
    const current = getStoredCustomPresets();
    const filtered = current.filter((p) => p.id !== preset.id);
    const updated = [preset, ...filtered];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save custom preset to localStorage', e);
  }
}

export function deleteStoredCustomPreset(id: string): void {
  try {
    const current = getStoredCustomPresets();
    const updated = current.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (getDefaultPresetId() === id) {
      localStorage.removeItem(DEFAULT_ID_KEY);
    }
  } catch (e) {
    console.error('Failed to delete custom preset from localStorage', e);
  }
}

export function getDefaultPresetId(): string | null {
  try {
    return localStorage.getItem(DEFAULT_ID_KEY);
  } catch {
    return null;
  }
}

export function setDefaultPresetId(id: string): void {
  try {
    localStorage.setItem(DEFAULT_ID_KEY, id);
  } catch (e) {
    console.error('Failed to set default preset id', e);
  }
}

/**
 * Returns merged preset character list:
 * 1. Hardcoded USER_CUSTOM_IMAGE_DATA from presets.ts (if provided)
 * 2. User's browser-persisted custom presets from localStorage
 * 3. Default built-in presets
 */
export function getAllPresets(): PresetCharacter[] {
  const customList = getStoredCustomPresets();
  const builtInList = [...PRESET_CHARACTERS];

  // If developer or user pasted an image in presets.ts USER_CUSTOM_IMAGE_DATA
  if (USER_CUSTOM_IMAGE_DATA && USER_CUSTOM_IMAGE_DATA.trim() !== '') {
    const directCustom: PresetCharacter = {
      id: 'hardcoded-custom',
      name: USER_CUSTOM_CHARACTER_NAME || '自定义设定图',
      title: '源码配置的自定义角色',
      description: '由 presets.ts 中的 USER_CUSTOM_IMAGE_DATA 指定',
      avatarSvg: USER_CUSTOM_IMAGE_DATA,
      imageDataUrl: USER_CUSTOM_IMAGE_DATA,
    };
    return [directCustom, ...customList, ...builtInList];
  }

  return [...customList, ...builtInList];
}
