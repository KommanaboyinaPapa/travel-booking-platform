import express from 'express';
import { getRefund } from '../controllers/refundController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// protected endpoint - requires a valid JWT
router.get('/:bookingId', requireAuth, getRefund);

export default router;
