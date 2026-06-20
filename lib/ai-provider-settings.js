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

  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.aiProvider]: normalized });
  } catch {
    // ignore
  }

  return normalized;
}

export async function saveGeminiApiKey(value) {
  const normalized = normalizeGeminiApiKey(value);

  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.geminiApiKey]: normalized });
  } catch {
    // ignore
  }

  return normalized;
}

export async function saveGeminiApiModel(value) {
  const normalized = normalizeGeminiApiModel(value);

  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.geminiApiModel]: normalized });
  } catch {
    // ignore
  }

  return normalized;
}

export async function saveAutoDownloadModel(value) {
  const normalized = normalizeAutoDownloadModel(value);

  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.autoDownloadModel]: normalized,
    });
  } catch {
    // ignore
  }

  return normalized;
}

export function hasGeminiApiKey(settings) {
  return Boolean(normalizeGeminiApiKey(settings?.geminiApiKey));
}
