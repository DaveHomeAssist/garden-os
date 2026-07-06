import { createServer } from 'node:http';
import { Readable } from 'node:stream';

import { createAuthorityFetchHandler } from '../src/server/authority-http.js';
import { createAuthorityService, createFileLedgerStore } from '../src/server/authority-service.js';

const host = process.env.GOS_AUTHORITY_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.GOS_AUTHORITY_PORT ?? '8787', 10);
const origin = `http://${host}:${port}`;

const service = createAuthorityService({
  ledgerStore: createFileLedgerStore(),
});
const handle = createAuthorityFetchHandler(service);

function requestBody(req) {
  return req.method === 'GET' || req.method === 'HEAD'
    ? undefined
    : Readable.toWeb(req);
}

const server = createServer(async (req, res) => {
  try {
    const request = new Request(new URL(req.url ?? '/', origin), {
      body: requestBody(req),
      duplex: 'half',
      headers: req.headers,
      method: req.method,
    });
    const response = await handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error?.message ?? 'Authority server failed.', ok: false }));
  }
});

server.listen(port, host, () => {
  console.log(`Garden OS authority listening on ${origin}/api/session`);
});
