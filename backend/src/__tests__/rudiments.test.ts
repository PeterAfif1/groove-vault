import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';

// Mock the DB pool so tests never need a real database
vi.mock('../db/index', () => ({
  default: {
    query: vi.fn(),
    on: vi.fn(),
  },
}));

import pool from '../db/index';
const mockQuery = pool.query as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

/* ============================================================
   GET /api/rudiments
   ============================================================ */
describe('GET /api/rudiments', () => {
  it('returns 200 with an array of rudiments', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          name: 'Single Stroke Roll',
          sticking: 'R L R L',
          target_bpm: 120,
          category: 'Uncategorized',
          current_bpm: null,
          previous_bpm: null,
        },
      ],
    });

    const res = await request(app).get('/api/rudiments');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe('Single Stroke Roll');
  });

  it('returns 500 when the database throws', async () => {
    mockQuery.mockRejectedValue(new Error('DB connection lost'));

    const res = await request(app).get('/api/rudiments');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

/* ============================================================
   POST /api/rudiments
   ============================================================ */
describe('POST /api/rudiments', () => {
  it('creates a rudiment and returns 201', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        { id: 2, name: 'Paradiddle', sticking: 'RLRR LRLL', target_bpm: 140 },
      ],
    });

    const res = await request(app)
      .post('/api/rudiments')
      .send({ name: 'Paradiddle', sticking: 'RLRR LRLL', target_bpm: 140 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Paradiddle');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/rudiments')
      .send({ sticking: 'RLRR LRLL', target_bpm: 140 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing required fields/);
  });

  it('returns 400 when sticking is missing', async () => {
    const res = await request(app)
      .post('/api/rudiments')
      .send({ name: 'Paradiddle', target_bpm: 140 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when target_bpm is missing', async () => {
    const res = await request(app)
      .post('/api/rudiments')
      .send({ name: 'Paradiddle', sticking: 'RLRR LRLL' });

    expect(res.status).toBe(400);
  });

  it('returns 500 when the database throws', async () => {
    mockQuery.mockRejectedValue(new Error('DB connection lost'));

    const res = await request(app)
      .post('/api/rudiments')
      .send({ name: 'Paradiddle', sticking: 'RLRR LRLL', target_bpm: 140 });

    expect(res.status).toBe(500);
  });
});
