import { Router } from 'express';
import { getAllRudiments, createRudiment, deleteRudiment, createPracticeLog, getPracticeHistory, getStats } from '../controllers/rudimentController';

const router = Router();

// GET /api/rudiments
router.get('/', getAllRudiments);

// POST /api/rudiments
router.post('/', createRudiment);

// DELETE /api/rudiments/:id
router.delete('/:id', deleteRudiment);

// /stats must be registered before any /:id GET routes — Express matches same-method
// routes in order, so GET /stats would be swallowed by GET /:id if it came first.
// GET /api/rudiments/stats
router.get('/stats', getStats);

// POST /api/rudiments/:id/logs
router.post('/:id/logs', createPracticeLog);

// GET /api/rudiments/:id/logs
router.get('/:id/logs', getPracticeHistory);

export default router;
