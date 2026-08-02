import type { UserRole } from "@prisma/client";
import type { RequestHandler } from "express";
import type { z } from "zod";

import { ApiError } from "../../utils/api-error";
import type { createProductSchema, updateProductSchema } from "./products.schemas";
import { productIdSchema } from "./products.schemas";
import * as productsService from "./products.service";

type CreateProductBody = z.infer<typeof createProductSchema>;
type UpdateProductBody = z.infer<typeof updateProductSchema>;

const authFrom = (request: Parameters<RequestHandler>[0]): { id: string; role: UserRole } => {
  if (!request.auth) throw new ApiError(401, "Authentication is required", "AUTHENTICATION_REQUIRED");
  return { id: request.auth.user.id, role: request.auth.user.role };
};

const idFrom = (value: unknown): string => productIdSchema.parse(value);

export const listProducts: RequestHandler = async (request, response) => {
  const auth = authFrom(request);
  const data = await productsService.listProducts(request.query, auth.role);
  response.status(200).json({ success: true, data });
};

export const getProduct: RequestHandler = async (request, response) => {
  const auth = authFrom(request);
  const product = await productsService.getProduct(idFrom(request.params.id), auth.role);
  response.status(200).json({ success: true, data: { product } });
};

export const createProduct: RequestHandler = async (request, response) => {
  const auth = authFrom(request);
  const product = await productsService.createProduct(request.body as CreateProductBody, auth.id);
  response.status(201).json({ success: true, data: { product } });
};

export const updateProduct: RequestHandler = async (request, response) => {
  const auth = authFrom(request);
  const product = await productsService.updateProduct(
    idFrom(request.params.id),
    request.body as UpdateProductBody,
    auth.role,
  );
  response.status(200).json({ success: true, data: { product } });
};

export const deleteProduct: RequestHandler = async (request, response) => {
  const auth = authFrom(request);
  await productsService.deleteProduct(idFrom(request.params.id), auth.role);
  response.status(204).send();
};
