const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Video Codex</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #0f172a; color: #f8fafc; }
      main { padding: 2rem; text-align: center; }
      h1 { margin: 0; font-size: clamp(2.5rem, 10vw, 5rem); letter-spacing: -0.05em; }
      p { margin: 1rem 0 0; color: #cbd5e1; }
    </style>
  </head>
  <body>
    <main>
      <h1>hello world</h1>
      <p>Cloudflare Workers 連携確認用のダミーページです。</p>
    </main>
  </body>
</html>`;

export default {
  async fetch() {
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });
  },
};
