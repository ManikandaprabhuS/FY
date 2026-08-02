import { Prisma, UserRole } from "@prisma/client";
import type { z } from "zod";

import { prisma } from "../../prisma/client";
import { ApiError } from "../../utils/api-error";
import { paginationMeta } from "../../utils/pagination";
import { productViewSelect } from "./products.select";
import { productListQuerySchema } from "./products.schemas";
import type { createProductSchema, updateProductSchema } from "./products.schemas";

type CreateProductInput = z.infer<typeof createProductSchema>;
type UpdateProductInput = z.infer<typeof updateProductSchema>;

const assertActiveReferences = async (materialId: string, variantId: string): Promise<void> => {
  const [material, variant] = await Promise.all([
    prisma.material.findUnique({ where: { id: materialId }, select: { id: true, isActive: true } }),
    prisma.variant.findUnique({ where: { id: variantId }, select: { id: true, isActive: true } }),
  ]);

  if (!material) throw new ApiError(400, "Material does not exist", "MATERIAL_NOT_FOUND");
  if (!material.isActive) throw new ApiError(409, "Material is inactive", "MATERIAL_INACTIVE");
  if (!variant) throw new ApiError(400, "Variant does not exist", "VARIANT_NOT_FOUND");
  if (!variant.isActive) throw new ApiError(409, "Variant is inactive", "VARIANT_INACTIVE");
};

export const listProducts = async (rawQuery: unknown, role: UserRole) => {
  const { page, limit, search, materialId, variantId } = productListQuerySchema.parse(rawQuery);
  const customerVisibility: Prisma.ProductWhereInput = role === UserRole.CUSTOMER
    ? { material: { isActive: true }, variant: { isActive: true } }
    : {};
  const where: Prisma.ProductWhereInput = {
    ...customerVisibility,
    ...(materialId ? { materialId } : {}),
    ...(variantId ? { variantId } : {}),
    ...(search ? { OR: [
      { productName: { contains: search, mode: "insensitive" } },
      { productIdentifier: { contains: search, mode: "insensitive" } },
    ] } : {}),
  };

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({ where, select: productViewSelect, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.product.count({ where }),
  ]);

  return { products, pagination: paginationMeta(page, limit, total) };
};

export const getProduct = async (id: string, role: UserRole) => {
  const product = await prisma.product.findUnique({ where: { id }, select: productViewSelect });
  if (!product) throw new ApiError(404, "Product was not found", "PRODUCT_NOT_FOUND");
  if (role === UserRole.CUSTOMER && (!product.material.isActive || !product.variant.isActive)) {
    throw new ApiError(404, "Product was not found", "PRODUCT_NOT_FOUND");
  }
  return product;
};

export const createProduct = async (input: CreateProductInput, actorId: string) => {
  await assertActiveReferences(input.materialId, input.variantId);
  return prisma.product.create({ data: { ...input, createdById: actorId }, select: productViewSelect });
};

export const updateProduct = async (id: string, input: UpdateProductInput, role: UserRole) => {
  const existing = await getProduct(id, role);
  const materialId = input.materialId ?? existing.materialId;
  const variantId = input.variantId ?? existing.variantId;
  if (input.materialId || input.variantId) await assertActiveReferences(materialId, variantId);
  return prisma.product.update({ where: { id }, data: input, select: productViewSelect });
};

export const deleteProduct = async (id: string, role: UserRole): Promise<void> => {
  await getProduct(id, role);
  await prisma.product.delete({ where: { id } });
};
