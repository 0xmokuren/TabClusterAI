# AGENTS.md

このファイルは、Claude Code や Codex などの AI エージェントが本リポジトリで作業するときの規約をまとめます。人間の開発者向けの情報は [`README.md`](README.md) / [`README.ja.md`](README.ja.md) を参照してください。

## ローカル動作確認の手順

UI や popup を変更したときは、必ず Chrome に読み込んで実機確認します。

### Chrome に読み込むディレクトリ

`manifest.json` がある**ディレクトリそのもの**を Chrome に読み込ませます。`npm run build` の出力 (`dist/TabClusterAI`) を経由する必要はありません — Chrome は manifest がある場所のファイルをリアルタイムで読みます。

#### main ブランチで作業しているとき

```
~/書類/ghq/github.com/0xmokuren/TabClusterAI
```

#### git worktree で作業しているとき (推奨運用)

```
~/書類/ghq/github.com/0xmokuren/TabClusterAI/.claude/worktrees/<name>
```

`.claude/worktrees/` は隠しディレクトリなので、Chrome の「**パッケージ化されていない拡張機能を読み込む**」ダイアログで：

- `Cmd+Shift+G` でパス直接入力、または
- `Cmd+Shift+.` で隠しディレクトリ表示

を使います。一度登録すれば Chrome が記憶してくれるので、以降は対象拡張のカードの 🔄 ボタンを押すだけで変更が反映されます。

### worktree 運用のメリット

- main の拡張機能と worktree の拡張機能は**別 extension ID** で同時にロードでき、新旧 UI を並べて比較できる
- `npm run build` も `cp` も不要、ファイル編集が即反映される

### ファイル変更後の反映

1. `chrome://extensions/` で対象拡張のカードの 🔄 (更新) ボタンを押す
2. ポップアップを開き直して確認

ストレージをリセットして「新規ユーザー状態」で確認したい場合は、対象拡張のサービスワーカーの DevTools で：

```js
await chrome.storage.local.clear()
```

## コミットとプッシュ

- ユーザー本人の identity (`0xmokuren` / `will1522sagacityfield@gmail.com`) でのみコミットする
- `Co-Authored-By` フッタを追加しない
- `git push` はユーザーが手動で行う（エージェントは push しない）
- コミットメッセージは Conventional Commits (日本語、subject 50 文字以内、末尾「〜した」)

## リリース

`v*.*.*` タグの push で `.github/workflows/release.yml` が起動し、GitHub Release 作成 → Chrome Web Store 公開申請まで自動で進みます。詳細は [`README.ja.md` の「リリースフロー」](README.ja.md) を参照。

## 動作確認時のデバッグ用パッチ

UI 状態を強制表示する一時パッチを当てる場合は、必ず `// TODO: REMOVE BEFORE COMMIT` を含むコメントで囲み、コミット前に確実に取り除きます。
