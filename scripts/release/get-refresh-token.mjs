// Chrome Web Store API 用の refresh_token を取得するローカル実行ヘルパーです。
// Authorization Code Flow + PKCE (S256) + loopback redirect を使い、
// state による CSRF 対策を行います。取得した refresh_token は GitHub Secrets に登録してください。

import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const SERVER_TIMEOUT_MS = 5 * 60_000;

function base64url(buf) {
  return buf.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function prompt(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

const clientId = process.env.CWS_CLIENT_ID || await prompt('Client ID: ');
if (!clientId) {
  console.error('error: Client ID が入力されていません');
  process.exit(1);
}
const clientSecret = process.env.CWS_CLIENT_SECRET || await prompt('Client Secret: ');
if (!clientSecret) {
  console.error('error: Client Secret が入力されていません');
  process.exit(1);
}

const codeVerifier = base64url(randomBytes(32));
const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
const state = base64url(randomBytes(16));

const server = createServer();
server.on('error', (err) => {
  console.error(`error: ローカルサーバー起動に失敗しました: ${err.message}`);
  process.exit(1);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const redirectUri = `http://127.0.0.1:${port}/callback`;

const authUrl = new URL(AUTH_URL);
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

console.log('\nブラウザで次の URL を開き、Google アカウントで認可してください:\n');
console.log(authUrl.toString());
console.log('');

const timer = setTimeout(() => {
  console.error('error: 認可がタイムアウトしました');
  process.exit(1);
}, SERVER_TIMEOUT_MS);

const code = await new Promise((resolve, reject) => {
  server.on('request', (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
      }
      const receivedState = url.searchParams.get('state');
      if (receivedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('state mismatch');
        reject(new Error('state パラメータが一致しません (CSRF チェック失敗)'));
        return;
      }
      const errorParam = url.searchParams.get('error');
      if (errorParam) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`error: ${errorParam}`);
        reject(new Error(`認可エラー: ${errorParam}`));
        return;
      }
      const authCode = url.searchParams.get('code');
      if (!authCode) {
        res.writeHead(400).end('code がありません');
        reject(new Error('認可コードを取得できませんでした'));
        return;
      }
      res
        .writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end('認可に成功しました。このタブを閉じてターミナルに戻ってください。');
      resolve(authCode);
    } catch (e) {
      res.writeHead(500).end();
      reject(e);
    }
  });
}).finally(() => {
  clearTimeout(timer);
  server.close();
});

const tokenBody = new URLSearchParams({
  client_id: clientId,
  client_secret: clientSecret,
  code,
  code_verifier: codeVerifier,
  grant_type: 'authorization_code',
  redirect_uri: redirectUri,
});

const tokenRes = await fetch(TOKEN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: tokenBody,
  signal: AbortSignal.timeout(30_000),
});

if (!tokenRes.ok) {
  console.error(`error: トークン交換に失敗しました (HTTP ${tokenRes.status})`);
  process.exit(1);
}

const tokenJson = await tokenRes.json();
if (!tokenJson.refresh_token) {
  console.error('error: refresh_token がレスポンスに含まれていません。');
  console.error('  Google アカウントの「サードパーティアプリ」設定から該当アプリを削除し、再度実行してください。');
  process.exit(1);
}

console.log('\nrefresh_token を取得しました。GitHub Secrets の CWS_REFRESH_TOKEN に登録してください:');
console.log('-----BEGIN REFRESH TOKEN-----');
console.log(tokenJson.refresh_token);
console.log('-----END REFRESH TOKEN-----');
console.log('\nこの値は秘匿情報です。シェル履歴やクラウド同期される場所に保存しないでください。');
