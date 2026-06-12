import express from 'express';
import {
  getRoomsForHotel,
  getRoom,
  bookRoom,
  releaseRoom,
} from '../controllers/roomController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/hotel/:hotelId', getRoomsForHotel);
router.get('/:roomId', getRoom);
router.post('/:roomId/book', requireAuth, bookRoom);
router.post('/:roomId/release', requireAuth, releaseRoom);

export default router;
