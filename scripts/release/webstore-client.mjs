// Chrome Web Store Publish API の薄いラッパーです。
// 公式 REST API のみに依存し、外部 npm パッケージは使いません。
// 仕様: https://developer.chrome.com/docs/webstore/using-api

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com/chromewebstore/v1.1';
const UPLOAD_BASE = 'https://www.googleapis.com/upload/chromewebstore/v1.1';

const TOKEN_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 5 * 60_000;
const PUBLISH_TIMEOUT_MS = 60_000;

// レスポンス本文に access_token / refresh_token が含まれる可能性を考慮し、
// ログ出力前にトークンらしき文字列を伏字に置き換えます。
function redact(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/"(access_token|refresh_token|id_token)"\s*:\s*"[^"]+"/g, '"$1":"[REDACTED]"');
}

async function readBodySafely(res) {
  try {
    return redact(await res.text());
  } catch {
    return '<failed to read response body>';
  }
}

export async function fetchAccessToken({ clientId, clientSecret, refreshToken }) {
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('OAuth 認証情報が不足しています');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`access_token の取得に失敗しました (HTTP ${res.status}): ${await readBodySafely(res)}`);
  }

  const json = await res.json();
  if (!json.access_token) {
    throw new Error('access_token がレスポンスに含まれていません');
  }
  return json.access_token;
}

export async function uploadPackage({ accessToken, extensionId, zipBuffer }) {
  if (!accessToken) throw new Error('accessToken が指定されていません');
  if (!extensionId) throw new Error('extensionId が指定されていません');
  if (!Buffer.isBuffer(zipBuffer) || zipBuffer.length === 0) {
    throw new Error('zipBuffer が空です');
  }

  const url = `${UPLOAD_BASE}/items/${encodeURIComponent(extensionId)}?uploadType=media`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-goog-api-version': '2',
      'Content-Type': 'application/zip',
      'Content-Length': String(zipBuffer.length),
    },
    body: zipBuffer,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`zip のアップロードに失敗しました (HTTP ${res.status}): ${await readBodySafely(res)}`);
  }

  return res.json();
}

export async function publishItem({ accessToken, extensionId, target = 'default' }) {
  if (!accessToken) throw new Error('accessToken が指定されていません');
  if (!extensionId) throw new Error('extensionId が指定されていません');
  if (target !== 'default' && target !== 'trustedTesters') {
    throw new Error(`未知の publish target: ${target}`);
  }

  const base = `${API_BASE}/items/${encodeURIComponent(extensionId)}/publish`;
  const url = target === 'trustedTesters' ? `${base}?publishTarget=trustedTesters` : base;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-goog-api-version': '2',
      'Content-Length': '0',
    },
    signal: AbortSignal.timeout(PUBLISH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`公開申請に失敗しました (HTTP ${res.status}): ${await readBodySafely(res)}`);
  }

  return res.json();
}
