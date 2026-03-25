/**
 * Local development server for the Lambda backend.
 * Wraps the Lambda handler in an HTTP server so you can test locally.
 *
 * Usage: npm run start:api
 *
 * Endpoints:
 *   POST /api     — API handler (send { action, params, sessionToken })
 *   POST /script  — Script handler (send { script, payload })
 *   GET  /health  — Health check
 */

import http from 'node:http';
import { apiHandlers } from './index.js';
import { scriptHandlers } from './scripts/index.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

const server = http.createServer(async (req, res) => {
  const headers = corsHeaders();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, headers);
      res.end(JSON.stringify({ status: 'ok', handlers: Object.keys(apiHandlers) }));
      return;
    }

    // API handler
    if (url.pathname === '/api' && req.method === 'POST') {
      const body = await parseBody(req);
      const { action, params, sessionToken } = body;

      if (!action) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({ error: 'Missing "action" in request body' }));
        return;
      }

      const handler = apiHandlers[action];
      if (!handler) {
        res.writeHead(404, headers);
        res.end(JSON.stringify({ error: `Unknown action: ${action}`, available: Object.keys(apiHandlers) }));
        return;
      }

      const result = await handler.handler({ params: params || {}, sessionToken });
      res.writeHead(result.statusCode || 200, headers);
      res.end(JSON.stringify(result.body || result));
      return;
    }

    // Script handler
    if (url.pathname === '/script' && req.method === 'POST') {
      const body = await parseBody(req);
      const { script, payload } = body;

      if (!script) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({ error: 'Missing "script" in request body' }));
        return;
      }

      const handler = scriptHandlers[script];
      if (!handler) {
        res.writeHead(404, headers);
        res.end(JSON.stringify({ error: `Unknown script: ${script}`, available: Object.keys(scriptHandlers) }));
        return;
      }

      await handler.handler(payload || {});
      res.writeHead(200, headers);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Not found
    res.writeHead(404, headers);
    res.end(JSON.stringify({
      error: 'Not found',
      endpoints: {
        'POST /api': 'API handler — send { action, params, sessionToken }',
        'POST /script': 'Script handler — send { script, payload }',
        'GET /health': 'Health check — lists available handlers',
      },
    }));
  } catch (err: any) {
    console.error('Server error:', err);
    res.writeHead(err.statusCode || 500, headers);
    res.end(JSON.stringify({
      error: err.message || 'Internal server error',
      ...(process.env.ENV === 'dev' ? { stack: err.stack } : {}),
    }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Local API server running at http://localhost:${PORT}`);
  console.log(`\n   POST http://localhost:${PORT}/api     — API handlers`);
  console.log(`   POST http://localhost:${PORT}/script  — Script handlers`);
  console.log(`   GET  http://localhost:${PORT}/health  — Health check\n`);
  console.log(`   Available API actions: ${Object.keys(apiHandlers).join(', ') || '(none yet)'}`);
  console.log(`   Available scripts: ${Object.keys(scriptHandlers).join(', ') || '(none yet)'}`);
  console.log(`\n   Environment: ${process.env.ENV || 'dev'}`);
  console.log(`   Press Ctrl+C to stop\n`);
});
