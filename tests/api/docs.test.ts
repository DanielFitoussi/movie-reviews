import request from 'supertest';
import app from '../../src/app';

describe('GET /api-docs', () => {
  it('serves the Swagger UI page', async () => {
    const res = await request(app).get('/api-docs/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('swagger-ui');
  });

  it('redirects /api-docs (no trailing slash) to /api-docs/', async () => {
    const res = await request(app).get('/api-docs');

    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('/api-docs/');
  });
});
