// controllers/bookingsController.js
import Booking from '../models/Booking.js';
import Product from '../models/Product.js';

export const createBooking = async (req, res) => {
  try {
    const {
      productId,
      productName,
      productImage,
      productCategory,
      customerName,
      customerPhone,
      customerAddress,
      quantity,
      bookingDate,
      actualPrice,
      strikePrice,
      sellingPrice,
      totalAmount,
      discountPercentage,
    } = req.body;

    if (!productId || !customerName || !customerPhone || !customerAddress || !quantity || !bookingDate) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.availability !== 'Available') {
      return res.status(400).json({ message: 'Product is not available for booking' });
    }

    const booking = await Booking.create({
      productId,
      productName,
      productImage,
      productCategory,
      userId: req.user._id,
      customerName,
      customerPhone,
      customerAddress,
      quantity,
      bookingDate,
      actualPrice: actualPrice || 0,
      strikePrice: strikePrice || 0,
      sellingPrice: sellingPrice || 0,
      totalAmount: totalAmount || 0,
      discountPercentage: discountPercentage || 0,
      status: 'confirmed',
    });

    res.status(201).json({ success: true, message: 'Booking created successfully', booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Failed to create booking', error: error.message });
  }
};

export const getBookings = async (req, res) => {
  try {
    let bookings;
    if (req.user.role === 'admin') {
      bookings = await Booking.find()
        .populate('productId', 'name category')
        .populate('userId', 'name email phone')
        .sort({ orderDate: -1 });
    } else {
      bookings = await Booking.find({ userId: req.user._id })
        .populate('productId', 'name category')
        .sort({ orderDate: -1 });
    }

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Failed to fetch bookings', error: error.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('productId', 'name category description features')
      .populate('userId', 'name email phone');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = booking.userId._id.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Not authorized to view this booking' });

    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Failed to fetch booking', error: error.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = booking.userId.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Not authorized to cancel this booking' });

    if (booking.status === 'cancelled') return res.status(400).json({ message: 'Booking is already cancelled' });
    if (booking.status === 'completed') return res.status(400).json({ message: 'Cannot cancel a completed booking' });

    await booking.updateStatus('cancelled');
    booking.cancellationReason = req.body.reason || (isAdmin ? 'Cancelled by Admin' : 'Cancelled by customer');
    await booking.save();

    res.json({ success: true, message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Failed to cancel booking', error: error.message });
  }
};

export const completeBooking = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized. Admin access required.' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Booking is already marked as completed' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot complete a cancelled booking' });
    }

    await booking.updateStatus('completed');
    await booking.save();

    res.json({ success: true, message: 'Booking marked as completed successfully', booking });
  } catch (error) {
    console.error('Error completing booking:', error);
    res.status(500).json({ success: false, message: 'Failed to complete booking', error: error.message });
  }
};

export const getByCoupon = async (req, res) => {
  try {
    const booking = await Booking.findOne({ couponCode: req.params.couponCode.toUpperCase() })
      .populate('productId', 'name category')
      .populate('userId', 'name email phone');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found with this coupon code' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = booking.userId._id.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });

    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error fetching booking by coupon:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking', error: error.message });
  }
};
