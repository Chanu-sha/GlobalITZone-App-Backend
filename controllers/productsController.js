// controllers/productsController.js
import Product from '../models/Product.js';
import { deleteImage } from '../config/cloudinary.js';
import mongoose from 'mongoose';

// Build filter helper
const buildFilter = (q) => {
  const {
    category,
    condition,
    type,
    availability,
    minPrice,
    maxPrice,
    search,
    isActive,
    tags,
  } = q;

  const filter = {};

  if (typeof isActive !== 'undefined') {
    filter.isActive = isActive === 'true' || isActive === true;
  } else {
    filter.isActive = true;
  }

  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (type) filter.type = type;
  if (availability) filter.availability = availability;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (search) {
    filter.$text = { $search: search };
  }

  if (tags) {
    const arr = Array.isArray(tags) ? tags : String(tags).split(',').map(s => s.trim().toLowerCase());
    filter.tags = { $in: arr };
  }

  return filter;
};

// GET /api/products
export const listProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sort = '-createdAt', // default newest first
      fields,
    } = req.query;

    const filter = buildFilter(req.query);

    const select = fields ? fields.split(',').join(' ') : undefined;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      Product.find(filter).select(select).sort(sort).skip(skip).limit(parseInt(limit)),
      Product.countDocuments(filter),
    ]);

    return res.json({
      products: items,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNextPage: parseInt(page) * parseInt(limit) < total,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (err) {
    console.error('List products error:', err);
    return res.status(500).json({ message: 'Failed to fetch products' });
  }
};

// GET /api/products/:id
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product ID' });

    const doc = await Product.findById(id);
    if (!doc) return res.status(404).json({ message: 'Product not found' });

    return res.json({ product: doc });
  } catch (err) {
    console.error('Get product error:', err);
    return res.status(500).json({ message: 'Failed to fetch product' });
  }
};

// POST /api/products  (Admin)
// Uses uploadMultiple middleware to read images
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      condition,
      type,
      availability,
      features = [],
      price,
      originalPrice,
      discount,
      stock,
      specifications = {},
      tags = [],
    } = req.body;

    // Cloudinary multer puts files in req.files
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const images = files.map((f) => f.path || f.secure_url).filter(Boolean);
    const imagePublicIds = files.map((f) => f.filename || f.public_id).filter(Boolean);

    const product = await Product.create({
      name,
      description,
      category,
      condition,
      type,
      availability: availability || 'Available',
      features: Array.isArray(features) ? features : String(features).split(',').map(s => s.trim()).filter(Boolean),
      images,
      imagePublicIds,
      price,
      originalPrice,
      discount,
      stock,
      specifications: typeof specifications === 'string' ? JSON.parse(specifications) : specifications,
      tags: Array.isArray(tags) ? tags : String(tags).split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
      createdBy: req.user._id,
    });

    return res.status(201).json({ message: 'Product created successfully', product });
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ message: 'Failed to create product' });
  }
};

// PUT /api/products/:id  (Admin)
// Can add new images and/or remove some via removePublicIds
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product ID' });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const body = { ...req.body };

    // Parse arrays/objects sent as strings
    if (typeof body.features === 'string') {
      body.features = body.features.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof body.tags === 'string') {
      body.tags = body.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    }
    if (typeof body.specifications === 'string') {
      try { body.specifications = JSON.parse(body.specifications); } catch { /* ignore */ }
    }

    // Handle image removals
    let removePublicIds = [];
    if (body.removePublicIds) {
      removePublicIds = Array.isArray(body.removePublicIds) ? body.removePublicIds : String(body.removePublicIds).split(',').map(s => s.trim());
      // Remove from Cloudinary + model arrays
      for (const pid of removePublicIds) {
        try { await deleteImage(pid); } catch (e) { /* ignore delete failures */ }
      }
      product.imagePublicIds = product.imagePublicIds.filter((pid) => !removePublicIds.includes(pid));
      // Also remove matching image URLs if present (by index mapping heuristic)
      // (publicIds from CloudinaryStorage usually align with file names; keep URLs as-is otherwise)
    }

    // Handle new uploads
    const files = req.files || [];
    if (files.length) {
      const newUrls = files.map((f) => f.path || f.secure_url).filter(Boolean);
      const newIds = files.map((f) => f.filename || f.public_id).filter(Boolean);
      product.images.push(...newUrls);
      product.imagePublicIds.push(...newIds);
    }

    // Assign other fields
    const mutable = [
      'name','description','category','condition','type','availability','features',
      'price','originalPrice','discount','stock','specifications','tags','isActive'
    ];
    for (const key of mutable) {
      if (typeof body[key] !== 'undefined') product[key] = body[key];
    }

    await product.save();

    return res.json({ message: 'Product updated successfully', product });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ message: 'Failed to update product' });
  }
};

// DELETE /api/products/:id  (Admin) — soft delete
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product ID' });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.isActive = false;
    product.availability = 'Discontinued';
    await product.save();

    return res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({ message: 'Failed to delete product' });
  }
};

// PATCH /api/products/:id/view — increment views (public)
export const incrementView = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product ID' });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await product.incrementViews();
    return res.json({ views: product.views });
  } catch (err) {
    console.error('Increment view error:', err);
    return res.status(500).json({ message: 'Failed to increment view' });
  }
};

// POST /api/products/:id/like — toggle like (public)
export const likeProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid product ID' });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await product.toggleLike();
    return res.json({ likes: product.likes });
  } catch (err) {
    console.error('Like product error:', err);
    return res.status(500).json({ message: 'Failed to like product' });
  }
};
