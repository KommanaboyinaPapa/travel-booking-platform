import express from 'express';
import {
  getHotelPriceHistory,
  getFlightPriceHistory,
  updatePrice,
} from '../controllers/priceHistoryController.js';

const router = express.Router();

router.get('/hotels/:hotelId', getHotelPriceHistory);
router.get('/flights/:flightId', getFlightPriceHistory);
router.put('/update', updatePrice);

export default router;
