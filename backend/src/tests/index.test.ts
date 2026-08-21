import request from 'supertest';
import { IndexController } from '@controllers/index.controller';
import { HealthController } from '@controllers/health.controller';
import { localApi } from '@utils/util';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@node-saml/passport-saml', () => ({
  Strategy: class {
    name = 'saml';

    authenticate() {}

    generateServiceProviderMetadata() {
      return '<xml />';
    }

    logout(_request: unknown, callback: () => void) {
      callback();
    }
  },
}));

let App: (typeof import('@/app'))['default'];

beforeAll(async () => {
  ({ default: App } = await import('@/app'));
});

afterAll(async () => {
  await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
});
describe('Testing Index', () => {
  describe('[GET] /', () => {
    it('responds with status 200', async () => {
      const app = new App([IndexController]);
      const response = await request(app.getServer()).get(localApi('/'));

      expect(response.status).toBe(200);
    });
  });
  describe('[GET] /health/up', () => {
    it('reports process liveness without calling an external service', async () => {
      const app = new App([HealthController]);
      const response = await request(app.getServer()).get(localApi('health/up'));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'OK' });
    });
  });
});
