import { createServer } from 'node:http';

import { createAuthorityFetchHandler } from '../src/server/authority-http.js';
import { handleNodeAuthorityRequest } from '../src/server/authority-node-adapter.js';
import { createAuthorityService, createFileLedgerStore } from '../src/server/authority-service.js';

const host = process.env.GOS_AUTHORITY_HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.GOS_AUTHORITY_PORT ?? '8787', 10);
const origin = `http://${host}:${port}`;

const service = createAuthorityService({
  ledgerStore: createFileLedgerStore(),
});
const handle = createAuthorityFetchHandler(service);

const server = createServer(async (req, res) => {
  try {
    await handleNodeAuthorityRequest(req, res, { handle, origin });
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error?.message ?? 'Authority server failed.', ok: false }));
  }
});

server.listen(port, host, () => {
  console.log(`Garden OS authority listening on ${origin}/api/session`);
});
