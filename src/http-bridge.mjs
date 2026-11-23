import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRIDGE_PORT, OfficeStore } from './store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_HTML_PATH = path.resolve(__dirname, '..', 'dist', 'office-app.html');
const MAX_BODY_BYTES = 512 * 1024;

function resolveAllowedOrigin(originHeader) {
  if (!originHeader || typeof originHeader !== 'string') return null;
  if (
    /^(chrome|edge|moz)-extension:\/\/[a-z0-9-]+$/i.test(originHeader) ||
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(originHeader)
  ) {
    return originHeader;
  }
  return null;
}

function setCorsHeaders(req, res) {
  const allowed = resolveAllowedOrigin(req.headers.origin);
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function probeExistingHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(
      `http://127.0.0.1:${port}/health`,
      { timeout: 600 },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(Boolean(parsed && parsed.ok && parsed.service === 'pixel-office'));
          } catch {
            resolve(false);
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

function snapshotSignature(snapshot) {
  return JSON.stringify({
    stats: snapshot.stats,
    agents: snapshot.agents,
    prefs: snapshot.prefs,
    reposLen: snapshot.projectsAndRepos?.length || 0,
    w5: snapshot.analytics?.window5h?.totalTokens || 0,
    alertsLen: snapshot.alerts?.length || 0,
    xp: snapshot.progression?.xp || 0,
    feedHead: snapshot.feed[0]?.ts || 0,
    feedLen: snapshot.feed.length,
  });
}

export async function startHttpBridge(options = {}) {
  const store = options.store || new OfficeStore();
  const htmlPath = options.htmlPath || DEFAULT_HTML_PATH;
  const port = Number(options.port || BRIDGE_PORT);
  const sseClients = new Set();
  let lastBroadcastSig = '';

  const broadcastSnapshot = (force = false) => {
    if (sseClients.size === 0) return;
    const snapshot = store.getSnapshot();
    const sig = snapshotSignature(snapshot);
    if (!force && sig === lastBroadcastSig) return;
    lastBroadcastSig = sig;
    const payload = `data: ${JSON.stringify(snapshot)}\n\n`;
    for (const res of sseClients) {
      if (res.writableEnded || res.destroyed) {
        sseClients.delete(res);
        continue;
      }
      try {
        res.write(payload);
      } catch {
        sseClients.delete(res);
      }
    }
  };

  const handleJsonPost = async (req, res, fn) => {
    try {
      const body = await readJsonBody(req);
      const snapshot = fn(body);
      broadcastSnapshot(true);
      sendJson(res, 200, { ok: true, snapshot });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
  };

  const server = http.createServer(async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const pathname = url.pathname;

    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'pixel-office',
        version: '4.0.0',
        port,
      });
      return;
    }

    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      try {
        const html = fs.readFileSync(htmlPath, 'utf8');
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(html);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Pixel Office UI not built yet (${err.message}). Run npm.cmd run build.`);
      }
      return;
    }

    if (req.method === 'GET' && pathname === '/api/state') {
      sendJson(res, 200, store.getSnapshot());
      return;
    }

    if (req.method === 'GET' && pathname === '/api/daily-report') {
      sendJson(res, 200, { ok: true, markdown: store.generateDailyReport() });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/events') {
      res.socket?.setNoDelay?.(true);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      const initial = store.getSnapshot();
      lastBroadcastSig = snapshotSignature(initial);
      res.write(`data: ${JSON.stringify(initial)}\n\n`);
      sseClients.add(res);
      const cleanup = () => sseClients.delete(res);
      req.once('close', cleanup);
      res.once('close', cleanup);
      res.once('error', cleanup);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/hook-event') {
      try {
        const body = await readJsonBody(req);
        store.ingestHookEvent(body);
        broadcastSnapshot(true);
        sendJson(res, 200, { ok: true });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
      return;
    }

    if (req.method === 'POST' && pathname === '/api/gemini-event') {
      try {
        const body = await readJsonBody(req);
        store.ingestGeminiEvent(body);
        broadcastSnapshot(true);
        sendJson(res, 200, { ok: true });
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
      return;
    }

    if (req.method === 'POST' && pathname === '/api/clear-offline') {
      const snapshot = store.clearOffline();
      broadcastSnapshot(true);
      sendJson(res, 200, { ok: true, snapshot });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/prefs') {
      await handleJsonPost(req, res, (body) => store.updatePrefs(body));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/rooms') {
      await handleJsonPost(req, res, (body) => store.manageRoom(body));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/kanban') {
      await handleJsonPost(req, res, (body) => store.manageKanban(body));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/repos/refresh') {
      const snapshot = store.refreshRepos();
      broadcastSnapshot(true);
      sendJson(res, 200, { ok: true, snapshot });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/consolidate') {
      try {
        const body = await readJsonBody(req);
        const result = store.consolidateMemory(body);
        broadcastSnapshot(true);
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 400, { ok: false, error: err.message });
      }
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Not found' });
  });

  const pollTimer = setInterval(() => {
    try {
      broadcastSnapshot(false);
    } catch {
      // ignore background tick errors
    }
  }, 1500);
  pollTimer.unref();

  const keepaliveTimer = setInterval(() => {
    for (const res of sseClients) {
      if (res.writableEnded || res.destroyed) {
        sseClients.delete(res);
        continue;
      }
      try {
        res.write(': keepalive\n\n');
      } catch {
        sseClients.delete(res);
      }
    }
  }, 15000);
  keepaliveTimer.unref();

  return await new Promise((resolve) => {
    server.once('error', async (err) => {
      clearInterval(pollTimer);
      clearInterval(keepaliveTimer);
      if (err && err.code === 'EADDRINUSE') {
        const healthy = await probeExistingHealth(port);
        if (healthy) {
          console.error(
            `[pixel-office] Port ${port} already served by an active Pixel Office bridge; reusing existing instance.`
          );
          resolve({ reusedExisting: true, port, stop: async () => {} });
          return;
        }
        console.error(
          `[pixel-office] Port ${port} is occupied by another service; running in MCP-only mode.`
        );
        resolve({ reusedExisting: false, portOccupied: true, port, stop: async () => {} });
        return;
      }
      console.error(`[pixel-office] HTTP bridge failed to start: ${err.message}`);
      resolve({ reusedExisting: false, error: err.message, port, stop: async () => {} });
    });

    server.listen(port, '127.0.0.1', () => {
      console.error(`[pixel-office] HTTP/SSE bridge v4.0 listening at http://127.0.0.1:${port}`);
      const stop = async () => {
        clearInterval(pollTimer);
        clearInterval(keepaliveTimer);
        for (const res of sseClients) {
          try {
            res.end();
          } catch {
            // ignore
          }
        }
        sseClients.clear();
        await new Promise((done) => server.close(() => done()));
      };
      resolve({ reusedExisting: false, port, server, stop });
    });
  });
}

const isDirectEntry =
  process.argv[1] &&
  path.basename(process.argv[1]) === 'http-bridge.mjs' &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectEntry) {
  startHttpBridge().catch((err) => {
    console.error('[pixel-office] Fatal bridge error:', err);
    process.exit(1);
  });
}
