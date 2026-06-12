import express from 'express';
import { createBooking, listBookings, getBooking, cancelBooking } from '../controllers/bookingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// protected endpoints - require a valid JWT
router.post('/', requireAuth, createBooking);
router.get('/', requireAuth, listBookings);
router.get('/:id', requireAuth, getBooking);
router.post('/:id/cancel', requireAuth, cancelBooking);

export default router;
