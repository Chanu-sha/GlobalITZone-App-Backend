// routes/users.js
import express from 'express';
import { body, query } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getStatsOverview,
} from '../controllers/usersController.js';

const router = express.Router();

router.get(
  '/',
  [
    authenticateToken,
    requireAdmin,
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
    query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  ],
  getUsers
);

router.get('/:id', [authenticateToken, requireAdmin], getUserById);

router.put(
  '/:id',
  [
    authenticateToken,
    requireAdmin,
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Please provide a valid 10-digit phone number'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],
  updateUser
);

router.delete('/:id', [authenticateToken, requireAdmin], deleteUser);
router.get('/stats/overview', [authenticateToken, requireAdmin], getStatsOverview);

export default router;
