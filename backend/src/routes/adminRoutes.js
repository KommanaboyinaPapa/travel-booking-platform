import express from 'express';
import { getFlaggedReviews, removeReview, updateFlagStatus, getAllRefunds, updateRefundStatus, getRefundAnalytics } from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Review management
router.get('/flagged', requireAuth, requireAdmin, getFlaggedReviews);
router.patch('/flags/:id', requireAuth, requireAdmin, updateFlagStatus);
router.delete('/reviews/:id', requireAuth, requireAdmin, removeReview);

// Refund management
router.get('/refunds', requireAuth, requireAdmin, getAllRefunds);
router.patch('/refunds/:id/status', requireAuth, requireAdmin, updateRefundStatus);
router.get('/refunds/analytics', requireAuth, requireAdmin, getRefundAnalytics);

export default router;
