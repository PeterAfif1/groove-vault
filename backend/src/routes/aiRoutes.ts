import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { uploadDocument, chat, listDocuments } from '../controllers/aiController';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// POST /api/ai/upload
router.post('/upload', upload.single('file'), uploadDocument);

// POST /api/ai/chat
router.post('/chat', chatLimiter, chat);

// GET /api/ai/documents
router.get('/documents', listDocuments);

export default router;
