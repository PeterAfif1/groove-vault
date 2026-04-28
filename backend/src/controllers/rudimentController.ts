import { type Request, type Response } from 'express';
import pool from '../db/index';

/**
 * GET /api/rudiments
 * Fetches all rudiments from the database.
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
      )
      SELECT 
        r.*,
        MAX(CASE WHEN rl.rn = 1 THEN rl.current_bpm END) as current_bpm,
        MAX(CASE WHEN rl.rn = 2 THEN rl.current_bpm END) as previous_bpm
      FROM rudiments r
      LEFT JOIN RankedLogs rl ON r.id = rl.rudiment_id
      GROUP BY r.id
      ORDER BY r.id ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching rudiments:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/rudiments
 * Creates a new rudiment in the database.
 */
export const createRudiment = async (req: Request, res: Response) => {
  const { name, sticking, target_bpm } = req.body;

  if (!name || !sticking || !target_bpm) {
    return res.status(400).json({ error: 'Missing required fields: name, sticking, target_bpm' });
  }

  try {
    const query = 'INSERT INTO rudiments (name, sticking, target_bpm) VALUES ($1, $2, $3) RETURNING *';
    const values = [name, sticking, target_bpm];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating rudiment:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/rudiments/:id
 * Deletes a rudiment and its associated practice logs (via CASCADE).
 */
export const deleteRudiment = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM rudiments WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Rudiment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error deleting rudiment:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/rudiments/:id/logs
 * Creates a practice log for a specific rudiment.
 */
export const createPracticeLog = async (req: Request, res: Response) => {
  const { id } = req.params; // rudiment_id from URL
  const { current_bpm, notes } = req.body;

  if (current_bpm == null) {
    return res.status(400).json({ error: 'Missing required field: current_bpm' });
  }

  try {
    const query = 'INSERT INTO practice_logs (rudiment_id, current_bpm, notes) VALUES ($1, $2, $3) RETURNING *';
    const values = [id, current_bpm, notes];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating practice log:', err instanceof Error ? err.message : String(err));
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
    const query = 'SELECT * FROM practice_logs WHERE rudiment_id = $1 ORDER BY date DESC LIMIT 3';
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching practice history:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/rudiments/stats
 * Calculates high-level practice statistics including current streak.
 * Streak uses a gap-and-island approach: DATE - ROW_NUMBER() produces the same
 * value for consecutive days, so each island is a contiguous run.
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const query = `
      WITH practice_stats AS (
        SELECT
          COUNT(*) AS total_sessions,
          COALESCE(ROUND(AVG(current_bpm)), 0) AS average_bpm,
          COUNT(DISTINCT rudiment_id) AS active_rudiments
        FROM practice_logs
      ),
      distinct_days AS (
        SELECT DISTINCT DATE(date) AS practice_day
        FROM practice_logs
      ),
      numbered_days AS (
        SELECT
          practice_day,
          practice_day - ROW_NUMBER() OVER (ORDER BY practice_day)::INTEGER AS grp
        FROM distinct_days
      ),
      streak_groups AS (
        SELECT grp, COUNT(*) AS streak_len, MAX(practice_day) AS last_day
        FROM numbered_days
        GROUP BY grp
      )
      SELECT
        ps.total_sessions,
        ps.average_bpm,
        ps.active_rudiments,
        COALESCE(
          (
            SELECT streak_len
            FROM streak_groups
            WHERE last_day >= CURRENT_DATE - INTERVAL '1 day'
            ORDER BY last_day DESC
            LIMIT 1
          ),
          0
        ) AS streak_days
      FROM practice_stats ps
    `;
    const result = await pool.query(query);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching stats:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Internal server error' });
  }
};
