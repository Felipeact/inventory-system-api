// src/server.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/product.routes';
import dotenv from 'dotenv';
import userRoutes from './modules/user/user.routes';
import assetRoutes from './modules/asset/asset.routes';
import reportRoutes from './modules/report/report.routes';

import { errorMiddleware } from './middleware/error.middleware';
import { generalRateLimiter } from './middleware/rate-limit.middleware';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(generalRateLimiter);


app.get('/', (req, res) => { 
  res.send('Inventory System API'); 
});

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/assets', assetRoutes);
app.use('/users', userRoutes);
app.use('/reports', reportRoutes);

app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  console.log('Server running on port ' + process.env.PORT);
});
