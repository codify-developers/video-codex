# ADR 0001: Cloudflare Workers 連携確認は Module Worker のダミーページで開始する

- 最終確認日: 2026-06-18
- ステータス: 採用
- 対象バージョン: 初期ダミーページ（`video-codex` 0.1.0）

## 背景

P2P ビデオチャットの本実装に入る前に、GitHub と Cloudflare Workers の連携が動作することを最小構成で確認したい。

## 決定

Cloudflare Workers の Module Worker 形式で `hello world` を返す HTML ページを実装する。Worker 設定は `wrangler.toml` に集約し、`src/index.js` をエントリーポイントにする。

## 理由

- Cloudflare Workers 無料プランで動作確認しやすい。
- 静的な HTML レスポンスだけで連携確認ができ、P2P ビデオチャット本体の技術要素と切り離せる。
- 将来、同じ Worker にルーティングやシグナリング用 API を追加しやすい。

## 影響

現時点ではビデオチャット機能、WebRTC シグナリング、カメラ・マイク制御は含めない。これらは連携確認後の次段階で設計・実装する。
