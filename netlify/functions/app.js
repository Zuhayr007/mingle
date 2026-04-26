import app from '../../dist/server/index.js';

function buildUrl(event) {
  const host = event.headers?.host || event.headers?.Host || 'localhost';
  const rawUrl = event.rawUrl || event.path || '/';
  const base = /^https?:\/\//.test(rawUrl) ? '' : `https://${host}`;
  let url = new URL(rawUrl, base || `https://${host}`);

  if (!event.rawUrl && event.queryStringParameters) {
    const searchParams = new URLSearchParams(event.queryStringParameters);
    url.search = searchParams.toString();
  }

  return url;
}

function getRequestBody(event) {
  if (!event.body || event.httpMethod === 'GET' || event.httpMethod === 'HEAD') {
    return undefined;
  }

  if (event.isBase64Encoded) {
    return Buffer.from(event.body, 'base64');
  }

  return event.body;
}

function normalizeHeaders(headers) {
  return headers || {};
}

function isTextContentType(contentType) {
  return (
    typeof contentType === 'string' &&
    /(text\/|json|javascript|xml|html|svg)/i.test(contentType)
  );
}

export async function handler(event) {
  const url = buildUrl(event);
  const request = new Request(url.toString(), {
    method: event.httpMethod,
    headers: normalizeHeaders(event.headers),
    body: getRequestBody(event),
  });

  const response = await app.fetch(request);
  const responseBody = await response.arrayBuffer();
  const bodyBuffer = Buffer.from(responseBody);
  const headers = Object.fromEntries(response.headers.entries());
  const contentType = headers['content-type'] || headers['Content-Type'];
  const isText = isTextContentType(contentType);

  return {
    statusCode: response.status,
    headers,
    body: isText ? bodyBuffer.toString('utf-8') : bodyBuffer.toString('base64'),
    isBase64Encoded: !isText,
  };
}
