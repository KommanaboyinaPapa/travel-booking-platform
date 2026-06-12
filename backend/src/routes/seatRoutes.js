import express from 'express';
import {
  getSeatsForFlight,
  getSeat,
  bookSeat,
  releaseSeat,
} from '../controllers/seatController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/flight/:flightId', getSeatsForFlight);
router.get('/:seatId', getSeat);
router.post('/:seatId/book', requireAuth, bookSeat);
router.post('/:seatId/release', requireAuth, releaseSeat);

export default router;
