// Backend Tests with Jest

const request = require('supertest');
const app = require('../server');

describe('API Tests', () => {
  it('GET /api/properties should return properties', async () => {
    const res = await request(app).get('/api/properties');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/users should create user', async () => {
    const res = await request(app).post('/api/users').send({
      email: 'test@example.com',
      password_hash: 'hash',
      subscription_tier: 'basic'
    });
    expect(res.status).toBe(200);
  });
});