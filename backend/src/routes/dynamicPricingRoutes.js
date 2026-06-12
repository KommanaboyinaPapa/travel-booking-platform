import express from 'express';
import { calculatePrice, freezePrice, getFrozenPrice, deleteFreeze } from '../controllers/dynamicPricingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/calculate', calculatePrice);
router.post('/freeze', requireAuth, freezePrice);
router.get('/freeze/:entityType/:entityId', requireAuth, getFrozenPrice);
router.delete('/freeze/:entityType/:entityId', requireAuth, deleteFreeze);

export default router;
