// Publisher: the small private service n8n calls to turn an email into a draft article.
// It runs next to n8n on the server (same Docker network, no public port). The work itself is
// in core.ts (shared with the local test, try.ts); the model is chosen in llm.ts.
//
//   POST /ingest   { message_id, subject, text, images: [{ filename, mime, data(base64) }], dry_run? }
//                  → saves a DRAFT, returns the summary + a proposed Facebook post
//   POST /publish  { work_id }  → makes that draft public, returns the public link
//   GET  /health
//
// Every request needs `Authorization: Bearer $PUBLISHER_TOKEN`. Env: see n8n/.env.example.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { HttpError, ingest, publish, type Json } from './core';
import { MODEL, PROVIDER } from './llm';

const PORT = Number(process.env.PORT ?? 8787);
const TOKEN = process.env.PUBLISHER_TOKEN ?? '';
if (TOKEN.length < 24) throw new Error('PUBLISHER_TOKEN must be set (24+ characters)');

function send(res: ServerResponse, status: number, body: Json) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function authorized(req: IncomingMessage) {
  const got = Buffer.from(req.headers.authorization ?? '');
  const want = Buffer.from(`Bearer ${TOKEN}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

async function readJson(req: IncomingMessage, limit = 80 * 1024 * 1024): Promise<Json> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > limit) throw new HttpError(413, 'request too large');
    chunks.push(c as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as Json;
}

createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
    if (!authorized(req)) return send(res, 401, { ok: false, error: 'unauthorized' });
    if (req.method === 'POST' && req.url === '/ingest') return send(res, 200, await ingest(await readJson(req)));
    if (req.method === 'POST' && req.url === '/publish') return send(res, 200, await publish(await readJson(req, 1024 * 1024)));
    send(res, 404, { ok: false, error: 'not found' });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    console.error(`[error] ${req.method} ${req.url}: ${(e as Error).message}`);
    send(res, status, { ok: false, error: (e as Error).message });
  }
}).listen(PORT, () => console.log(`publisher listening on :${PORT} (${PROVIDER} ${MODEL})`));
