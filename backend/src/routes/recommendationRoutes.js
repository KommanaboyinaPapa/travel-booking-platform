import express from 'express';
import { getRecommendations, submitFeedback } from '../controllers/recommendationController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', requireAuth, getRecommendations);
router.post('/feedback', requireAuth, submitFeedback);

export default router;
