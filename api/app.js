import app from '../dist/server/index.js';

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (error) => reject(error));
  });
}

function isTextContentType(contentType) {
  return (
    typeof contentType === 'string' &&
    /(text\/|json|javascript|xml|html|svg)/i.test(contentType)
  );
}

export default async function handler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `${protocol}://${host}`);
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await getRawBody(req);

  const request = new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body,
  });

  const response = await app.fetch(request);
  const responseBody = await response.arrayBuffer();
  const buffer = Buffer.from(responseBody);
  const headers = Object.fromEntries(response.headers.entries());

  res.statusCode = response.status;
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }

  res.end(buffer);
}
