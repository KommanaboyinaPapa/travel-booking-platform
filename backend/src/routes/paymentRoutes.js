import express from 'express';
import { createPayment, listPayments } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/', createPayment);
router.get('/', listPayments);

export default router;
