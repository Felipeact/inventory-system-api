import request from 'supertest';
import app from '../src/app';

describe('app integration', () => {
  it('GET / returns the API banner', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Inventory System API');
  });

  it('GET /health reports ok with uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /updates/latest returns version metadata', async () => {
    const res = await request(app).get('/updates/latest');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('downloadUrl');
  });

  it('allows requests from a configured CORS origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not echo an allow-origin header for a disallowed origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sets security headers via helmet', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
