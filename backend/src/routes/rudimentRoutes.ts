import { Router } from 'express';
import { getAllRudiments, createRudiment, createPracticeLog, getPracticeHistory, getStats } from '../controllers/rudimentController';

const router = Router();

// GET /api/rudiments
router.get('/', getAllRudiments);

// POST /api/rudiments
router.post('/', createRudiment);

// GET /api/rudiments/stats
router.get('/stats', getStats);

// POST /api/rudiments/:id/logs
router.post('/:id/logs', createPracticeLog);

// GET /api/rudiments/:id/logs
router.get('/:id/logs', getPracticeHistory);

export default router;
