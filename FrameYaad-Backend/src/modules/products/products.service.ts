import { Prisma, UserRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { z } from "zod";

import { supabaseAdmin } from "../../config/supabase";
import { prisma } from "../../prisma/client";
import { ApiError } from "../../utils/api-error";
import { paginationMeta } from "../../utils/pagination";
import { productViewSelect } from "./products.select";
import { productListQuerySchema } from "./products.schemas";
import type { createAdminProductPreviewSchema, createProductSchema, updateProductSchema } from "./products.schemas";

type CreateProductInput = z.infer<typeof createProductSchema>;
type CreateAdminProductPreviewInput = z.infer<typeof createAdminProductPreviewSchema>;
type UpdateProductInput = z.infer<typeof updateProductSchema>;

const productImagesBucket = "product-images";

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

export const createAdminProductPreview = async (
  input: CreateAdminProductPreviewInput,
  actorId: string,
) => {
  const productIdentifier = `FY-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  // Validation requires at least one item before this service is called.
  const primaryVariant = input.variants[0]!;

  return prisma.$transaction(async (transaction) => {
    const material = await transaction.material.create({
      data: {
        // Material.name is not used by the admin list preview. The identifier
        // keeps its existing unique constraint satisfied for duplicate product names.
        name: `${input.name} ${productIdentifier}`,
        description: input.description,
        brandName: input.brandName,
        material: input.material,
        availableColors: input.availableColors,
        isActive: input.isActive,
        createdById: actorId,
      },
    });
    const variant = await transaction.variant.create({
      data: {
        color: primaryVariant.color ?? input.availableColors[0] ?? "Standard",
        frameSize: primaryVariant.frameSize,
        mountType: primaryVariant.mountType,
        glassType: primaryVariant.glassType,
        stockQuantity: primaryVariant.stockQuantity,
        mrp: primaryVariant.price,
        price: primaryVariant.price,
        isActive: input.isActive,
        createdById: actorId,
      },
    });

    return transaction.product.create({
      data: {
        productIdentifier,
        productName: input.name,
        materialId: material.id,
        variantId: variant.id,
        createdById: actorId,
        images: input.images.length > 0
          ? {
              create: input.images.map((image, index) => ({
                imageUrl: image.imageUrl,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      },
      select: productViewSelect,
    });
  });
};

export const uploadProductImages = async (files: Express.Multer.File[]): Promise<string[]> => {
  if (files.length === 0) {
    throw new ApiError(400, "At least one image file is required", "PRODUCT_IMAGES_REQUIRED");
  }

  const uploadedPaths: string[] = [];

  try {
    for (const file of files) {
      const extension = path.extname(file.originalname).toLowerCase() ||
        (file.mimetype === "video/mp4" ? ".mp4" : ".jpg");
      const objectPath = `products/${randomUUID()}${extension}`;
      const { error } = await supabaseAdmin.storage
        .from(productImagesBucket)
        .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });

      if (error) {
        throw new ApiError(502, "Unable to store product image", "PRODUCT_IMAGE_UPLOAD_FAILED");
      }

      uploadedPaths.push(objectPath);
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabaseAdmin.storage.from(productImagesBucket).remove(uploadedPaths);
    }
    throw error;
  }

  return uploadedPaths.map((objectPath) =>
    supabaseAdmin.storage.from(productImagesBucket).getPublicUrl(objectPath).data.publicUrl,
  );
};
