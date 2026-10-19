import express from 'express';
import { createServer, get, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import zlib from 'node:zlib';
import compression from 'compression';
import { afterEach, describe, expect, it, vi } from 'vitest';

let server: Server | undefined;
const streams: Array<zlib.Gzip | zlib.Deflate> = [];

afterEach(async () => {
  // Also release resources when testing an older, vulnerable compression version.
  for (const stream of streams.splice(0)) stream.destroy();
  vi.restoreAllMocks();
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    server = undefined;
  }
});

describe('HTTP compression resource lifecycle', () => {
  it.each(['gzip', 'deflate'] as const)('releases the %s stream when the client aborts an unfinished response', async encoding => {
    const factory = encoding === 'gzip' ? 'createGzip' : 'createDeflate';
    const createStream = zlib[factory];
    vi.spyOn(zlib, factory).mockImplementation(options => {
      const stream = createStream(options);
      streams.push(stream);
      return stream;
    });

    const app = express();
    app.use(compression());
    let responseClosed: Promise<void>;
    app.get('/', (_request, response) => {
      response.type('text/plain');
      response.write('partial response '.repeat(256));
      response.flush();
      responseClosed = new Promise(resolve => response.once('close', resolve));
    });
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;

    await new Promise<void>((resolve, reject) => {
      const request = get({ host: '127.0.0.1', port, headers: { 'Accept-Encoding': encoding } }, response => {
        response.once('data', () => {
          response.destroy();
          resolve();
        });
        response.on('error', reject);
      });
      request.on('error', reject);
    });
    await responseClosed;

    expect(streams).toHaveLength(1);
    expect(streams[0].destroyed).toBe(true);
  });

  it('still delivers complete gzip responses', async () => {
    const body = 'complete response '.repeat(256);
    const app = express();
    app.use(compression());
    app.get('/', (_request, response) => response.type('text/plain').send(body));
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;

    const compressed = await new Promise<Buffer>((resolve, reject) => {
      const request = get({ host: '127.0.0.1', port, headers: { 'Accept-Encoding': 'gzip' } }, response => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      });
      request.on('error', reject);
    });
    expect(zlib.gunzipSync(compressed).toString()).toBe(body);
  });
});
