import { Readable } from 'node:stream';

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value ?? {}, key);
}

function nodeHeadersToWebHeaders(headers = {}) {
  const webHeaders = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) webHeaders.append(name, item);
    } else {
      webHeaders.set(name, String(value));
    }
  }
  return webHeaders;
}

function serializeKnownBody(body) {
  if (body == null) return '';
  if (typeof body === 'string' || body instanceof Uint8Array) return body;
  return JSON.stringify(body);
}

function nodeRequestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (hasOwn(req, 'body') && req.body !== undefined) return serializeKnownBody(req.body);
  if (hasOwn(req, 'rawBody') && req.rawBody !== undefined) return serializeKnownBody(req.rawBody);
  return Readable.toWeb(req);
}

function nodeRequestToWebRequest(req, { origin }) {
  const body = nodeRequestBody(req);
  return new Request(new URL(req.url ?? '/', origin), {
    ...(body ? { body, duplex: 'half' } : {}),
    headers: nodeHeadersToWebHeaders(req.headers),
    method: req.method ?? 'GET',
  });
}

async function sendWebResponseToNode(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function handleNodeAuthorityRequest(req, res, { handle, origin }) {
  const response = await handle(nodeRequestToWebRequest(req, { origin }));
  await sendWebResponseToNode(res, response);
}

export {
  handleNodeAuthorityRequest,
  nodeRequestToWebRequest,
  sendWebResponseToNode,
};
