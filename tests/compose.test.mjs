import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const run = promisify(execFile);

function compose(externalProxy = false, prefix = '', authenticated = false) {
  // Include profiled services in the model so the external-proxy exclusion is checked too.
  const args = ['compose', '--profile', '*', '--env-file', '/dev/null', '-f', 'docker-compose.yml'];
  if (externalProxy) args.push('-f', 'docker-compose.external-proxy.yml');
  args.push('config', '--format', 'json');
  const config = JSON.parse(execFileSync('docker', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 10000,
    maxBuffer: 1024 * 1024,
    // Do not read local .env files or interpolate real signing keys into test output.
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      SAML_IDP_PRIVATE_KEY: 'test-only',
      SAML_IDP_PUBLIC_CERT: 'test-only',
      PUBLIC_ORIGIN: 'https://idp.example.test',
      PUBLIC_PREFIX: prefix,
      ADMIN_BASE_PATH: prefix ? prefix + '/admin' : '',
      HEALTH_AUTH: String(authenticated),
      HEALTH_USERNAME: authenticated ? 'probe$user' : '',
      HEALTH_PASSWORD: authenticated ? 'test:pa$$word' : '',
    },
  }));
  // Compose escapes dollars when serializing config for reuse as a Compose file.
  // Child probes need the environment values Docker actually gives the container.
  for (const service of Object.values(config.services)) {
    for (const key of Object.keys(service.environment ?? {})) {
      service.environment[key] = service.environment[key].replaceAll('$$', '$');
    }
  }
  return config;
}

async function probe(service, origin) {
  const [kind, executable, flag, script] = service.healthcheck.test;
  assert.equal(kind, 'CMD');
  assert.equal(executable, 'node');
  assert.equal(flag, '-e');
  assert.ok(script.includes('http://127.0.0.1:3000'));
  try {
    // Run the actual Compose probe, changing only the port to a test-owned socket.
    await run(process.execPath, ['-e', script.replace('http://127.0.0.1:3000', origin)], {
      env: { ...process.env, ...service.environment },
      timeout: 6000,
      maxBuffer: 16384,
    });
    return 0;
  } catch (error) {
    if (typeof error.code !== 'number') throw error;
    return error.code;
  }
}

async function fixture(t, handler) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return { server, origin: 'http://127.0.0.1:' + server.address().port };
}

for (const externalProxy of [false, true]) {
  for (const prefix of ['', '/idp2']) {
    test(`deployment contract: ${externalProxy ? 'external' : 'bundled'} proxy, ${prefix || 'root'}`, async t => {
      const { services } = compose(externalProxy, prefix, Boolean(prefix));
      for (const service of Object.values(services)) {
        assert.equal(service.restart, 'unless-stopped');
        assert.ok(service.healthcheck.test.length > 0);
        assert.equal(service.healthcheck.timeout, '5s');
      }
      assert.equal(services.admin.depends_on.backend.condition, 'service_healthy');
      assert.equal(services.admin.environment.HOSTNAME, '0.0.0.0');
      assert.equal(services.admin.environment.BASE_PATH, services.admin.build.args.BASE_PATH);
      if (externalProxy) {
        // No active service may depend on the disabled bundled proxy.
        assert.deepEqual(services.proxy.profiles, ['bundled-proxy-disabled']);
        assert.equal(services.backend.depends_on, undefined);
        assert.deepEqual(Object.keys(services.admin.depends_on), ['backend']);
        assert.equal(services.admin.ports[0].target, 3000);
      } else {
        assert.equal(services.proxy.depends_on.backend.condition, 'service_healthy');
        assert.equal(services.proxy.depends_on.admin.condition, 'service_healthy');
        assert.ok(services.proxy.ports.every(port => port.target !== 8080));
      }

      for (const name of ['backend', 'admin']) {
        await t.test(`${name} probes its own health path with the configured credentials`, async t => {
          const service = services[name];
          const expectedPath = (name === 'admin' ? service.environment.BASE_PATH : '') + '/api/health/up';
          const expectedAuth = name === 'admin' && prefix
            ? 'Basic ' + Buffer.from('probe$user:test:pa$$word').toString('base64')
            : undefined;
          const requests = [];
          const { origin } = await fixture(t, (req, res) => {
            requests.push({ path: req.url, authorization: req.headers.authorization });
            const valid = req.url === expectedPath && req.headers.authorization === expectedAuth;
            res.writeHead(valid ? 200 : 401).end();
          });
          assert.equal(await probe(service, origin), 0);
          assert.deepEqual(requests, [{ path: expectedPath, authorization: expectedAuth }]);
        });
      }
    });
  }
}

const { services } = compose();
for (const name of ['backend', 'admin']) {
  test(`${name} healthcheck rejects HTTP errors, redirects and unexpected success codes`, async t => {
    let status = 200;
    const { origin } = await fixture(t, (_req, res) => {
      res.writeHead(status, { Location: '/api/health/up' }).end();
    });
    for (status of [204, 302, 401, 503]) {
      assert.equal(await probe(services[name], origin), 1, `HTTP ${status}`);
    }
  });

  test(`${name} healthcheck fails on a refused connection and recovers when available`, async t => {
    const { server, origin } = await fixture(t, (_req, res) => res.writeHead(200).end());
    const address = server.address();
    await new Promise(resolve => server.close(resolve));
    assert.equal(await probe(services[name], origin), 1);
    server.listen(address.port, address.address);
    await once(server, 'listening');
    assert.equal(await probe(services[name], origin), 0);
  });

  test(`${name} healthcheck times out when the application does not respond`, async t => {
    const { origin } = await fixture(t, () => {});
    assert.equal(await probe(services[name], origin), 1);
  });
}
