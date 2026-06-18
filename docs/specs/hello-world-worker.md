# Cloudflare Workers 連携確認用 hello world 仕様

- 最終確認日: 2026-06-18
- 対象バージョン: 初期ダミーページ（`video-codex` 0.1.0）

## 目的

GitHub と Cloudflare Workers の連携を確認するため、P2P ビデオチャット本実装の前段階として、ブラウザで `hello world` を表示する最小構成のダミーページを提供する。

## 対象端末

PC、タブレット、スマホの各ブラウザで表示できること。

## 表示内容

- 見出しとして `hello world` を表示する。
- 補足文として Cloudflare Workers 連携確認用のダミーページであることを表示する。
- 画面中央に収まるシンプルなレイアウトにする。

## デプロイ方針

- Cloudflare Workers の Module Worker として `src/index.js` をエントリーポイントにする。
- `wrangler.toml` の `workers_dev = true` により、無料プランでも Workers.dev サブドメインで確認できる構成にする。
