import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './modules/auth/auth.routes.js';
import vendorRoutes from './modules/vendors/vendor.routes.js';
import productRoutes from './modules/products/product.routes.js';
import errorHandler from './middleware/errorHandler.js';
import searchRoutes from './modules/search/search.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import orderRoutes from './modules/orders/order.routes.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import { webhook } from './modules/payments/payment.controller.js';
import asyncHandler from './utils/asyncHandler.js';
import adminRoutes from './modules/admin/admin.routes.js';
import reviewRoutes from './modules/reviews/review.routes.js';
import couponRoutes from './modules/coupons/coupon.routes.js';


const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());

app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(webhook)
);

app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', invoiceRoutes);

app.use(errorHandler); // must stay last

export default app;