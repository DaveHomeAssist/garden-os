import { Readable } from 'node:stream';

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

function nodeRequestBody(req) {
  return req.method === 'GET' || req.method === 'HEAD'
    ? undefined
    : Readable.toWeb(req);
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
