import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { vendorFiles } from './vendor.mjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || 4324);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };

const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const vendor = pathname.startsWith('/vendor/') && Object.hasOwn(vendorFiles, pathname.slice(8))
      ? vendorFiles[pathname.slice(8)] : null;
    const assetRoot = vendor || pathname === '/' || pathname === '/index.html' ? root : path.join(root, 'public');
    const filename = vendor || (pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, ''));
    const file = path.resolve(assetRoot, filename);
    if (!file.startsWith(assetRoot + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    let start = 0;
    let end = info.size - 1;
    let status = 200;
    if (request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!range || (!range[1] && !range[2])) {
        response.writeHead(416, { 'Content-Range': 'bytes */' + info.size }).end();
        return;
      }
      start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
      if (start > end || start >= info.size) {
        response.writeHead(416, { 'Content-Range': 'bytes */' + info.size }).end();
        return;
      }
      status = 206;
      headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + info.size;
    }
    response.writeHead(status, { ...headers, 'Content-Length': end - start + 1 });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file, { start, end }).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Page not found');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log('First Run is running at http://127.0.0.1:' + port));
