# ADR 0001: Cloudflare Worker で WebRTC シグナリングと静的 UI を提供する

- 最終確認日: 2026-06-18
- 対象バージョン: 0.1.0
- ステータス: 採用

## 文脈
シンプルな 1 対 1 の P2P ビデオチャットを、GitHub と Cloudflare Workers の連携で運用したい。ブラウザ間の映像・音声は WebRTC で P2P 接続するが、接続開始には offer / answer / ICE candidate を交換するシグナリング経路が必要である。

## 決定
単一の Cloudflare Worker が HTML/CSS/JavaScript を返し、`/ws/:room` で WebSocket シグナリングを処理する。部屋情報は Worker isolate のメモリ上の `Map` に保持し、部屋ごとに最大 2 WebSocket まで許可する。

## 理由
- 追加サーバーやデータベースなしで構成でき、初期実装が小さい。
- Cloudflare Workers へのデプロイ対象が 1 つで、GitHub 連携が単純になる。
- 映像・音声データは WebRTC の P2P 経路を通るため、Worker はシグナリングだけを担当する。

## 影響
- Worker isolate の再起動や配置変更で待機中の部屋が失われる可能性がある。
- 複数 isolate に分散された場合、同じ部屋の参加者が同じメモリに到達しない可能性がある。
- NAT 越えの成功率を高めるには、将来的に TURN サーバーや Cloudflare Calls などの検討が必要である。
