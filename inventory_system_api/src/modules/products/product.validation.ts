import { z } from 'zod';

const optionalText = z.string().optional().or(z.literal(''));

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    barcode: z.string().min(1, 'Barcode is required'),
    quantity: z.number().min(0, 'Quantity cannot be negative').optional(),
    lowStockThreshold: z.number().min(0).optional(),
    model: optionalText,
    type: optionalText,
    location: optionalText,
    project: optionalText,
    account: optionalText,
    status: optionalText,
    description: optionalText,
    imageUrl: optionalText
  })
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    barcode: z.string().min(1, 'Barcode is required'),
    quantity: z.number().min(0, 'Quantity cannot be negative'),
    lowStockThreshold: z.number().min(0).optional(),
    model: optionalText,
    type: optionalText,
    location: optionalText,
    project: optionalText,
    account: optionalText,
    status: optionalText,
    description: optionalText,
    imageUrl: optionalText
  }),
  params: z.object({
    id: z.string().min(1, 'Product id is required')
  })
});

export const productIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Product id is required')
  })
});

export const scanProductSchema = z.object({
  body: z.object({
    barcode: z.string().min(1, 'Barcode is required'),
    quantity: z.number().min(1, 'Quantity must be greater than 0')
  })
});
