import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.js';

test('hello world ページを返す', async () => {
  const response = await worker.fetch(new Request('https://example.com/'));
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.match(body, /hello world/);
  assert.match(body, /Cloudflare Workers 連携確認用/);
});
