// routes/products.js
import express from 'express';
import { body, query, param } from 'express-validator';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.js';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  incrementView,
  likeProduct,
} from '../controllers/productsController.js';

import { uploadMultiple, handleUploadError } from '../config/cloudinary.js';

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    List products with filters, search & pagination
 * @access  Public
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sort').optional().isString(),
    query('category').optional().isString(),
    query('condition').optional().isString(),
    query('type').optional().isString(),
    query('availability').optional().isString(),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('search').optional().isString(),
    query('isActive').optional().isBoolean().toBoolean(),
    query('tags').optional().isString(),
    query('fields').optional().isString(),
  ],
  listProducts
);

/**
 * @route   GET /api/products/:id
 * @access  Public
 */
router.get(
  '/:id',
  [param('id').isString().withMessage('Invalid id')],
  getProduct
);

/**
 * @route   POST /api/products
 * @desc    Create product (with images)
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  uploadMultiple,              // multer for 'images' field (max 5) per your config
  handleUploadError,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Product name is required (2-100 chars)'),
    body('description').trim().isLength({ min: 5, max: 1000 }).withMessage('Description is required (5-1000 chars)'),
    body('category').isIn(['Laptops','Desktops','Security','Accessories','Audio','Networking','Components','Monitors','Storage','Gaming']).withMessage('Invalid category'),
    body('condition').isIn(['New','Excellent','Very Good','Good','Fair']).withMessage('Invalid condition'),
    body('type').isIn(['Second Hand','New/Refurbished','Spare Parts','Refurbished']).withMessage('Invalid type'),
    body('availability').optional().isIn(['Available','Out of Stock','Discontinued']).withMessage('Invalid availability'),
    body('price').optional().isFloat({ min: 0 }),
    body('originalPrice').optional().isFloat({ min: 0 }),
    body('discount').optional().isFloat({ min: 0, max: 100 }),
    body('stock').optional().isInt({ min: 0 }),
  ],
  createProduct
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product; can add new images and/or remove via body.removePublicIds
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  uploadMultiple,          // optional new images
  handleUploadError,
  [
    param('id').isString(),
    body('availability').optional().isIn(['Available','Out of Stock','Discontinued']).withMessage('Invalid availability'),
    body('price').optional().isFloat({ min: 0 }),
    body('originalPrice').optional().isFloat({ min: 0 }),
    body('discount').optional().isFloat({ min: 0, max: 100 }),
    body('stock').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean().toBoolean(),
    body('removePublicIds').optional(),
  ],
  updateProduct
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Soft delete (isActive=false, availability=Discontinued)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  [param('id').isString()],
  deleteProduct
);

/**
 * @route   PATCH /api/products/:id/view
 * @desc    Increment views
 * @access  Public (optional auth)
 */
router.patch('/:id/view', optionalAuth, [param('id').isString()], incrementView);

/**
 * @route   POST /api/products/:id/like
 * @desc    Increment likes
 * @access  Public (optional auth)
 */
router.post('/:id/like', optionalAuth, [param('id').isString()], likeProduct);

export default router;
