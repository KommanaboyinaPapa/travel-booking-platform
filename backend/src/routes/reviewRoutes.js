import express from 'express';
import {
  createReview,
  listReviews,
  addReply,
  markHelpful,
  flagReview,
} from '../controllers/reviewController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', requireAuth, createReview);
router.get('/', listReviews);
router.post('/:id/reply', requireAuth, addReply);
router.post('/:id/helpful', requireAuth, markHelpful);
router.post('/:id/flag', requireAuth, flagReview);

export default router;
