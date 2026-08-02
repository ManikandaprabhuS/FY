import { z } from "zod";

export const productIdSchema = z.string().uuid();

const productFields = {
  materialId: z.string().uuid(),
  variantId: z.string().uuid(),
  productIdentifier: z.string().trim().min(2).max(100).regex(/^[A-Za-z0-9_-]+$/),
  productName: z.string().trim().min(2).max(160),
};

export const createProductSchema = z.object(productFields).strict();

export const updateProductSchema = z.object({
  materialId: productFields.materialId.optional(),
  variantId: productFields.variantId.optional(),
  productIdentifier: productFields.productIdentifier.optional(),
  productName: productFields.productName.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one product field is required",
});

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(160).optional(),
  materialId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
});
