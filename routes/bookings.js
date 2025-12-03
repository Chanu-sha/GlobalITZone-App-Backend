// routes/bookings.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  completeBooking,
  getByCoupon,
} from '../controllers/bookingsController.js';

const router = express.Router();

router.post('/', authenticateToken, createBooking);
router.get('/', authenticateToken, getBookings);
router.get('/:id', authenticateToken, getBookingById);
router.patch('/:id/cancel', authenticateToken, cancelBooking);
router.patch('/:id/complete', authenticateToken, completeBooking);
router.get('/coupon/:couponCode', authenticateToken, getByCoupon);

export default router;
