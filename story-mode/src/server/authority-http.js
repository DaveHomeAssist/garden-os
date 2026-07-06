import { createAuthorityService } from './authority-service.js';

const JSON_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function jsonResponse(body, { status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    headers: JSON_HEADERS,
    status,
  });
}

async function readJson(request) {
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function normalizePath(pathname) {
  return pathname.replace(/^\/api/, '') || '/';
}

function createAuthorityFetchHandler(service = createAuthorityService()) {
  return async function handleAuthorityRequest(request) {
    const url = new URL(request.url);
    const pathname = normalizePath(url.pathname);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: JSON_HEADERS, status: 204 });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'Method not allowed.' }, { status: 405 });
    }

    let body;
    try {
      body = await readJson(request);
    } catch {
      return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (pathname === '/session') {
      const result = await service.createSession(body);
      return jsonResponse(result, { status: result.ok ? 200 : 400 });
    }

    if (pathname === '/action') {
      const result = await service.applyAction(body);
      return jsonResponse(result, { status: 200 });
    }

    if (pathname === '/ack/verify') {
      const result = await service.verifyAck(body.ack);
      return jsonResponse(result, { status: result.verified ? 200 : 422 });
    }

    return jsonResponse({ ok: false, error: 'Not found.' }, { status: 404 });
  };
}

export { createAuthorityFetchHandler };
