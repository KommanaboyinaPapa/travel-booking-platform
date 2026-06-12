import express from 'express';
import {
  listFlights,
  getFlight,
  getFlightStatus,
} from '../controllers/flightController.js';

const router = express.Router();

router.get('/', listFlights);
router.get('/:id/status', getFlightStatus);
router.get('/:id', getFlight);

export default router;
