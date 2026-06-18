const rooms = new Map();

const html = String.raw`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>P2P ビデオチャット</title>
  <style>
    :root { color-scheme: dark; --bg:#07111f; --panel:#111c2e; --text:#f7fbff; --muted:#aab8c8; --accent:#56d6a2; --danger:#ff6b6b; }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; overflow: hidden; background: radial-gradient(circle at top, #18395f, var(--bg)); color: var(--text); font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { min-height: 100dvh; }
    .app { height: 100dvh; display: grid; grid-template-rows: auto 1fr auto; gap: clamp(8px, 2dvh, 16px); padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }
    header { display:flex; justify-content:space-between; align-items:center; gap:12px; min-height: 36px; }
    h1 { margin:0; font-size: clamp(18px, 4vw, 28px); letter-spacing:.02em; }
    .status { color: var(--muted); font-size: clamp(12px, 2.5vw, 14px); text-align:right; }
    .stage { min-height:0; display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(8px, 2vw, 16px); align-items:center; justify-items:center; }
    .tile { position:relative; width:min(100%, 43dvh, 43vw); aspect-ratio:1/1; border-radius:24px; overflow:hidden; background:#000; box-shadow:0 20px 60px rgba(0,0,0,.35); }
    video { width:100%; height:100%; object-fit:cover; transform: scaleX(-1); background:#000; }
    #remoteVideo { transform:none; }
    .label { position:absolute; left:10px; bottom:10px; padding:6px 10px; border-radius:999px; background:rgba(0,0,0,.55); font-size:12px; }
    .panel { display:grid; gap:10px; grid-template-columns: 1fr; background:rgba(17,28,46,.86); border:1px solid rgba(255,255,255,.12); border-radius:22px; padding:12px; backdrop-filter: blur(10px); }
    .buttons { display:flex; flex-wrap:wrap; justify-content:center; gap:8px; }
    button, input { border:0; border-radius:999px; padding:12px 16px; font:inherit; }
    button { cursor:pointer; background:#233553; color:var(--text); font-weight:700; }
    button.primary { background:var(--accent); color:#042015; }
    button.danger { background:var(--danger); color:#260303; }
    button:disabled { opacity:.45; cursor:not-allowed; }
    .share { display:flex; gap:8px; min-width:0; }
    input { min-width:0; flex:1; background:#07111f; color:var(--text); border:1px solid rgba(255,255,255,.16); }
    @media (max-width: 720px) { .stage { grid-template-columns:1fr 1fr; } .tile { width:min(100%, 42dvw, 34dvh); border-radius:18px; } .app { gap:8px; } button,input{padding:10px 12px;font-size:14px;} }
    @media (orientation: portrait) and (max-width: 720px) { .stage { align-content:center; } .tile { width:min(44dvw, 34dvh); } }
  </style>
</head>
<body>
  <main class="app">
    <header><h1>P2P ビデオチャット</h1><div id="status" class="status">準備中</div></header>
    <section class="stage" aria-label="ビデオ表示領域">
      <div class="tile"><video id="localVideo" autoplay muted playsinline></video><span class="label">自分</span></div>
      <div class="tile"><video id="remoteVideo" autoplay playsinline></video><span class="label">相手</span></div>
    </section>
    <section class="panel">
      <div class="buttons">
        <button id="startBtn" class="primary">開始</button>
        <button id="connectBtn" class="primary" disabled>接続</button>
        <button id="muteBtn" disabled>マイクミュート</button>
        <button id="cameraBtn" disabled>カメラ切り替え</button>
        <button id="hangupBtn" class="danger" disabled>終了</button>
      </div>
      <div class="share"><input id="shareUrl" readonly placeholder="開始すると接続用 URL が表示されます" /><button id="copyBtn" disabled>コピー</button></div>
    </section>
  </main>
  <script>
    const $ = (id) => document.getElementById(id);
    const localVideo = $('localVideo'), remoteVideo = $('remoteVideo'), statusEl = $('status'), shareUrl = $('shareUrl');
    const startBtn = $('startBtn'), connectBtn = $('connectBtn'), muteBtn = $('muteBtn'), cameraBtn = $('cameraBtn'), hangupBtn = $('hangupBtn'), copyBtn = $('copyBtn');
    let roomId = new URLSearchParams(location.search).get('room');
    let role = roomId ? 'guest' : 'host';
    let ws, pc, localStream, cameras = [], cameraIndex = 0, makingOffer = false;
    const rtcConfig = { iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }] };

    function setStatus(text) { statusEl.textContent = text; }
    function randomRoom() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }
    function send(message) { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message)); }

    async function refreshCameras() {
      const devices = await navigator.mediaDevices.enumerateDevices();
      cameras = devices.filter((d) => d.kind === 'videoinput');
      cameraBtn.disabled = cameras.length < 2 || !localStream;
    }

    async function openMedia(deviceId) {
      const video = deviceId ? { deviceId: { exact: deviceId }, aspectRatio: 1 } : { facingMode: 'user', aspectRatio: 1 };
      localStream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      localVideo.srcObject = localStream;
      await refreshCameras();
      muteBtn.disabled = false;
      hangupBtn.disabled = false;
      return localStream;
    }

    function setupPeer() {
      pc = new RTCPeerConnection(rtcConfig);
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      pc.ontrack = (event) => { remoteVideo.srcObject = event.streams[0]; };
      pc.onicecandidate = (event) => { if (event.candidate) send({ type: 'ice', candidate: event.candidate }); };
      pc.onconnectionstatechange = () => setStatus('接続状態: ' + pc.connectionState);
      pc.onnegotiationneeded = async () => {
        if (role !== 'host') return;
        try { makingOffer = true; await pc.setLocalDescription(); send({ type: 'offer', description: pc.localDescription }); }
        finally { makingOffer = false; }
      };
    }

    async function join(room) {
      if (!localStream) await openMedia();
      setupPeer();
      ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws/' + room + '?role=' + role);
      ws.onopen = () => { setStatus(role === 'host' ? '待機中: URL を相手に送ってください' : '接続中'); send({ type: 'ready' }); };
      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'peer-ready' && role === 'host') { await pc.setLocalDescription(await pc.createOffer()); send({ type: 'offer', description: pc.localDescription }); }
        if (msg.type === 'offer') { const collision = makingOffer || pc.signalingState !== 'stable'; if (collision) return; await pc.setRemoteDescription(msg.description); await pc.setLocalDescription(await pc.createAnswer()); send({ type: 'answer', description: pc.localDescription }); }
        if (msg.type === 'answer') await pc.setRemoteDescription(msg.description);
        if (msg.type === 'ice') await pc.addIceCandidate(msg.candidate).catch(() => {});
        if (msg.type === 'peer-left') setStatus('相手が退出しました');
        if (msg.type === 'full') setStatus('この部屋は満員です');
      };
      ws.onclose = () => setStatus('シグナリング切断');
    }

    startBtn.onclick = async () => {
      roomId = randomRoom(); role = 'host';
      const url = new URL(location.href); url.search = '?room=' + encodeURIComponent(roomId);
      shareUrl.value = url.href; copyBtn.disabled = false; startBtn.disabled = true; connectBtn.disabled = true;
      await join(roomId);
    };
    connectBtn.onclick = async () => { startBtn.disabled = true; connectBtn.disabled = true; await join(roomId); };
    copyBtn.onclick = async () => { await navigator.clipboard.writeText(shareUrl.value); setStatus('URL をコピーしました'); };
    muteBtn.onclick = () => { const audio = localStream?.getAudioTracks()[0]; if (!audio) return; audio.enabled = !audio.enabled; muteBtn.textContent = audio.enabled ? 'マイクミュート' : 'ミュート解除'; };
    cameraBtn.onclick = async () => {
      if (cameras.length < 2) return;
      cameraIndex = (cameraIndex + 1) % cameras.length;
      const next = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: cameras[cameraIndex].deviceId }, aspectRatio: 1 }, audio: false });
      const oldVideo = localStream.getVideoTracks()[0];
      const newVideo = next.getVideoTracks()[0];
      localStream.removeTrack(oldVideo);
      oldVideo.stop();
      localStream.addTrack(newVideo);
      localVideo.srcObject = localStream;
      const sender = pc?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newVideo);
    };
    hangupBtn.onclick = () => { send({ type: 'leave' }); ws?.close(); pc?.close(); localStream?.getTracks().forEach((t) => t.stop()); remoteVideo.srcObject = null; localVideo.srcObject = null; setStatus('終了しました'); };

    if (roomId) { shareUrl.value = location.href; connectBtn.disabled = false; startBtn.disabled = true; setStatus('接続ボタンを押してください'); }
    else setStatus('開始ボタンを押してください');
  </script>
</body>
</html>`;

function getRoom(id) {
  if (!rooms.has(id)) rooms.set(id, new Set());
  return rooms.get(id);
}

function handleSocket(request) {
  const url = new URL(request.url);
  const roomId = decodeURIComponent(url.pathname.split('/').pop() || '');
  if (!roomId || request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket required', { status: 426 });
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  const room = getRoom(roomId);
  if (room.size >= 2) {
    server.accept();
    server.send(JSON.stringify({ type: 'full' }));
    server.close(1008, 'room full');
    return new Response(null, { status: 101, webSocket: client });
  }
  server.accept();
  room.add(server);
  const broadcast = (message) => room.forEach((peer) => { if (peer !== server && peer.readyState === WebSocket.OPEN) peer.send(message); });
  broadcast(JSON.stringify({ type: 'peer-ready' }));
  server.addEventListener('message', (event) => {
    const text = typeof event.data === 'string' ? event.data : '';
    if (!text) return;
    const msg = JSON.parse(text);
    if (msg.type === 'leave') broadcast(JSON.stringify({ type: 'peer-left' }));
    else broadcast(text);
  });
  server.addEventListener('close', () => { room.delete(server); broadcast(JSON.stringify({ type: 'peer-left' })); if (room.size === 0) rooms.delete(roomId); });
  return new Response(null, { status: 101, webSocket: client });
}

export default {
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/ws/')) return handleSocket(request);
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  }
};
