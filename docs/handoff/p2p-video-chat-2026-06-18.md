# 引き継ぎ: P2P ビデオチャット初期実装

- 最終確認日: 2026-06-18
- 対象バージョン: 0.1.0

## 実装内容
- `src/worker.js` に Cloudflare Worker を実装した。
- ルートアクセスでは単一 HTML アプリを返す。
- `/ws/:room` では WebSocket を受け付け、同一 room 内の 2 接続間でシグナリングメッセージを中継する。
- ブラウザ側では WebRTC、カメラ・マイク取得、ミュート、カメラ切り替え、URL コピー、終了操作を実装した。

## 確認方法
```bash
npm install
npm run check
npm run dev
```

## 注意点
- 現時点では Worker メモリ上の簡易ルーム管理であり、本番品質の永続的なシグナリングではない。
- TURN サーバー未設定のため、ネットワーク環境によって P2P 接続に失敗する可能性がある。
- 実機確認では HTTPS または localhost でカメラ・マイク権限を確認する。

## 次の候補
- Durable Objects などを使った安定したルーム管理への移行。
- TURN の追加、または Cloudflare Calls などの利用検討。
- E2E テストと複数端末でのレイアウト確認。
