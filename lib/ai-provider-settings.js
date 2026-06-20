import {
  DEFAULT_GEMINI_API_MODEL,
  resolveGeminiApiModel,
} from './gemini-models.js';

const STORAGE_KEYS = {
  aiProvider: 'aiProvider',
  geminiApiKey: 'geminiApiKey',
  geminiApiModel: 'geminiApiModel',
  autoDownloadModel: 'autoDownloadModel',
};

export const DEFAULT_AUTO_DOWNLOAD_MODEL = false;

export const AI_PROVIDERS = {
  ON_DEVICE: 'on-device',
  GEMINI_API: 'gemini-api',
};

// 設定の保存は、ユーザー操作に付随する副次的な処理。
// chrome.storage.local.set が失敗するのは稀（ストレージ破損・容量超過・
// 拡張機能コンテキストの無効化など）で、失敗しても「次回起動時に設定が
// 復元されない」程度の影響しかない。ここで例外を投げると呼び出し元
// （popup.js）の handleFatalError まで伝播し、チェックボックスを切り替えた
// だけで「初期化失敗」エラーが画面に出てしまう。実害に対して UI を壊す
// 方が損なので、throw せず warn でログだけ残して握りつぶす。
async function persistSetting(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.warn(`Failed to persist setting "${key}"`, error);
  }
}

function normalizeProvider(value) {
  if (value === AI_PROVIDERS.GEMINI_API) {
    return AI_PROVIDERS.GEMINI_API;
  }
  return AI_PROVIDERS.ON_DEVICE;
}

export function normalizeGeminiApiKey(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

export function normalizeGeminiApiModel(value) {
  return resolveGeminiApiModel(value);
}

export function normalizeAutoDownloadModel(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  return DEFAULT_AUTO_DOWNLOAD_MODEL;
}

export async function loadAiProviderSettings() {
  try {
    const stored = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
    return {
      aiProvider: normalizeProvider(stored[STORAGE_KEYS.aiProvider]),
      geminiApiKey: normalizeGeminiApiKey(stored[STORAGE_KEYS.geminiApiKey] ?? ''),
      geminiApiModel: normalizeGeminiApiModel(
        stored[STORAGE_KEYS.geminiApiModel] ?? DEFAULT_GEMINI_API_MODEL,
      ),
      autoDownloadModel: normalizeAutoDownloadModel(
        stored[STORAGE_KEYS.autoDownloadModel],
      ),
    };
  } catch {
    return {
      aiProvider: AI_PROVIDERS.ON_DEVICE,
      geminiApiKey: '',
      geminiApiModel: DEFAULT_GEMINI_API_MODEL,
      autoDownloadModel: DEFAULT_AUTO_DOWNLOAD_MODEL,
    };
  }
}

export async function saveAiProvider(value) {
  const normalized = normalizeProvider(value);
  await persistSetting(STORAGE_KEYS.aiProvider, normalized);
  return normalized;
}

export async function saveGeminiApiKey(value) {
  const normalized = normalizeGeminiApiKey(value);
  await persistSetting(STORAGE_KEYS.geminiApiKey, normalized);
  return normalized;
}

export async function saveGeminiApiModel(value) {
  const normalized = normalizeGeminiApiModel(value);
  await persistSetting(STORAGE_KEYS.geminiApiModel, normalized);
  return normalized;
}

export async function saveAutoDownloadModel(value) {
  const normalized = normalizeAutoDownloadModel(value);
  await persistSetting(STORAGE_KEYS.autoDownloadModel, normalized);
  return normalized;
}

export function hasGeminiApiKey(settings) {
  return Boolean(normalizeGeminiApiKey(settings?.geminiApiKey));
}
