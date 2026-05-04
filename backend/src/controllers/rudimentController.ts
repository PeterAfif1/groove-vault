import { type Request, type Response } from 'express';
import pool from '../db/index';

/**
 * GET /api/rudiments
 * Fetches all rudiments with current BPM, previous BPM, and session count.
 */
export const getAllRudiments = async (req: Request, res: Response) => {
  try {
    const query = `
      WITH RankedLogs AS (
        SELECT
          rudiment_id,
          current_bpm,
          ROW_NUMBER() OVER (PARTITION BY rudiment_id ORDER BY date DESC) as rn
        FROM practice_logs
      ),
      SessionCounts AS (
        SELECT rudiment_id, COUNT(*) as session_count
        FROM practice_logs
        GROUP BY rudiment_id
      )
      SELECT
        r.*,
        COALESCE(sc.session_count, 0) as session_count,
        MAX(CASE WHEN rl.rn = 1 THEN rl.current_bpm END) as current_bpm,
        MAX(CASE WHEN rl.rn = 2 THEN rl.current_bpm END) as previous_bpm
      FROM rudiments r
      LEFT JOIN RankedLogs rl ON r.id = rl.rudiment_id
      LEFT JOIN SessionCounts sc ON r.id = sc.rudiment_id
      GROUP BY r.id, sc.session_count
      ORDER BY r.id ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching rudiments:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/rudiments
 * Creates a new rudiment in the database.
 */
export const createRudiment = async (req: Request, res: Response) => {
  const { name, sticking, target_bpm, category } = req.body;

  if (!name || !sticking || !target_bpm) {
    return res.status(400).json({ error: 'Missing required fields: name, sticking, target_bpm' });
  }

  try {
    const query = 'INSERT INTO rudiments (name, sticking, target_bpm, category) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [name, sticking, target_bpm, category || 'Uncategorized'];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating rudiment:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/rudiments/:id/logs
 * Creates a practice log for a specific rudiment.
 */
export const createPracticeLog = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { current_bpm, notes } = req.body;

  if (!current_bpm) {
    return res.status(400).json({ error: 'Missing required field: current_bpm' });
  }

  try {
    const query = 'INSERT INTO practice_logs (rudiment_id, current_bpm, notes) VALUES ($1, $2, $3) RETURNING *';
    const values = [id, current_bpm, notes];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating practice log:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/rudiments/:id/history
 * Fetches practice history for a specific rudiment.
 */
export const getPracticeHistory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const query = 'SELECT * FROM practice_logs WHERE rudiment_id = $1 ORDER BY date DESC';
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching practice history:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/rudiments/stats
 * Calculates high-level practice statistics including streak.
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const query = `
      WITH base AS (
        SELECT
          COUNT(*) as total_sessions,
          ROUND(AVG(current_bpm)) as average_bpm,
          COUNT(DISTINCT rudiment_id) as active_rudiments
        FROM practice_logs
      ),
      daily AS (
        SELECT DISTINCT CAST(date AS DATE) as d FROM practice_logs
      ),
      gaps AS (
        SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::int AS grp
        FROM daily
      ),
      groups AS (
        SELECT grp, MAX(d) as end_date, COUNT(*) as days
        FROM gaps
        GROUP BY grp
      ),
      streak AS (
        SELECT COALESCE(days, 0) as streak_days
        FROM groups
        WHERE end_date >= CURRENT_DATE - 1
        ORDER BY end_date DESC
        LIMIT 1
      )
      SELECT
        base.total_sessions,
        base.average_bpm,
        base.active_rudiments,
        COALESCE(streak.streak_days, 0) as streak_days
      FROM base
      LEFT JOIN streak ON true
    `;
    const result = await pool.query(query);
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error fetching stats:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
