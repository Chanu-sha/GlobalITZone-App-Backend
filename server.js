// server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js'; // your existing file
import userRoutes from './routes/users.js';
import bookingRoutes from './routes/bookings.js';

// Load environment variables
dotenv.config();

// Start keep-alive scheduler (no logs, silent)
import './utils/keepAlive.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// CORS configuration - dynamic whitelist
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5173',
  'https://your-production-domain.com',
];
const uniqueAllowedOrigins = Array.from(new Set(allowedOrigins));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (uniqueAllowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error('CORS policy: Origin not allowed'), false);
    },
    credentials: true,
  })
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ⚙️ Relax server-side timeouts so 3s+ response me error auto throw na ho
app.use((req, res, next) => {
  // Disable per-request timeouts at Node/Express level
  req.setTimeout(0);  // no read timeout
  res.setTimeout(0);  // no write timeout
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes); // unchanged
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Global IT Zone API is running', timestamp: new Date().toISOString() });
});

// Errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err && err.message && err.message.includes('CORS')) {
    return res.status(401).json({ message: err.message });
  }
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// DB connect
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/globalitzone')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.PUBLIC_BASE_URL) {
        console.log(`Base URL: ${process.env.PUBLIC_BASE_URL}`);
      }
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

export default app;
