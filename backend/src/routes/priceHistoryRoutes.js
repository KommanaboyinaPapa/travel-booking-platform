import express from 'express';
import {
  getHotelPriceHistory,
  getFlightPriceHistory,
  updatePrice,
} from '../controllers/priceHistoryController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/hotels/:hotelId', getHotelPriceHistory);
router.get('/flights/:flightId', getFlightPriceHistory);
router.put('/update', requireAuth, updatePrice);

export default router;
