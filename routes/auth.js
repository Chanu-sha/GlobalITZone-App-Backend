// routes/auth.js
import express from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import {
  register,
  login,
  adminLogin,
  getProfile,
  updateProfile,
  changePassword,
  logout,
} from '../controllers/authController.js';

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit phone number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  register
);

// Login
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'), body('password').notEmpty().withMessage('Password is required')],
  login
);

// Admin Login
router.post(
  '/admin-login',
  [body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'), body('password').notEmpty().withMessage('Password is required')],
  adminLogin
);

// Profile
router.get('/profile', authenticateToken, getProfile);
router.put(
  '/profile',
  [
    authenticateToken,
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit phone number'),
  ],
  updateProfile
);

// Change password
router.post(
  '/change-password',
  [
    authenticateToken,
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  ],
  changePassword
);

// Logout
router.post('/logout', authenticateToken, logout);

export default router;
