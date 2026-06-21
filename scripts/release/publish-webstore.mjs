// Chrome Web Store に zip をアップロードして公開申請するエントリスクリプトです。
// CI から `node scripts/release/publish-webstore.mjs` で呼ばれることを想定しています。

import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchAccessToken, publishItem, uploadPackage } from './webstore-client.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`環境変数 ${name} が設定されていません`);
  }
  return value.trim();
}

function abort(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

try {
  const clientId = requireEnv('CWS_CLIENT_ID');
  const clientSecret = requireEnv('CWS_CLIENT_SECRET');
  const refreshToken = requireEnv('CWS_REFRESH_TOKEN');
  const extensionId = requireEnv('CWS_EXTENSION_ID');

  const publishTarget = process.env.CWS_PUBLISH_TARGET ?? 'default';

  const manifestPath = join(root, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const version = manifest.version;
  if (typeof version !== 'string' || version === '') {
    abort('manifest.json から version を取得できませんでした');
  }

  const zipPath = join(root, 'dist', `TabClusterAI-${version}.zip`);
  const zipStat = statSync(zipPath, { throwIfNoEntry: false });
  if (!zipStat?.isFile()) {
    abort(`zip が見つかりません: ${zipPath}. 先に \`npm run build\` を実行してください`);
  }

  const zipBuffer = readFileSync(zipPath);
  console.log(`uploading ${zipPath} (${zipBuffer.length} bytes) to extension ${extensionId}`);

  const accessToken = await fetchAccessToken({ clientId, clientSecret, refreshToken });

  const uploadResult = await uploadPackage({ accessToken, extensionId, zipBuffer });
  console.log(`uploadState: ${uploadResult.uploadState ?? '<unknown>'}`);

  if (uploadResult.uploadState !== 'SUCCESS') {
    const errors = Array.isArray(uploadResult.itemError) ? uploadResult.itemError : [];
    console.error('upload に失敗しました:');
    for (const err of errors) {
      console.error(`  - [${err.error_code ?? 'UNKNOWN'}] ${err.error_detail ?? ''}`);
    }
    process.exit(1);
  }

  const publishResult = await publishItem({ accessToken, extensionId, target: publishTarget });
  const status = Array.isArray(publishResult.status) ? publishResult.status : [];
  console.log(`publish status: ${JSON.stringify(status)}`);

  if (!status.includes('OK')) {
    console.error('公開申請が拒否されました:');
    console.error(JSON.stringify({ status, statusDetail: publishResult.statusDetail }, null, 2));
    process.exit(1);
  }

  console.log(`version ${version} を Chrome Web Store に公開申請しました (target: ${publishTarget})`);
} catch (err) {
  abort(err instanceof Error ? err.message : String(err));
}
