// src/server.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/product.routes';
import dotenv from 'dotenv';
import userRoutes from './modules/user/user.routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => { 
  res.send('Inventory System API'); 
});

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/users', userRoutes);

app.listen(process.env.PORT, () => {
  console.log('Server running on port ' + process.env.PORT);
});