import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import hotelRoutes from './routes/hotelRoutes.js';
import flightRoutes from './routes/flightRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import refundRoutes from './routes/refundRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import seatRoutes from './routes/seatRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import priceHistoryRoutes from './routes/priceHistoryRoutes.js';
import dynamicPricingRoutes from './routes/dynamicPricingRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { seedDatabase } from './controllers/seedController.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/price-history', priceHistoryRoutes);
app.use('/api/pricing', dynamicPricingRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Admin/seed endpoint - accessible from localhost only
app.post('/api/admin/seed', seedDatabase);

app.use(errorHandler);

export default app;
