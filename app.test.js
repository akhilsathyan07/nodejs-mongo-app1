const request = require('supertest');
const app = require('./app'); // Ensure this path matches your project structure

describe('GET /', () => {
  it('should return the index page', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
  });
});
