import { Prisma, UserRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { z } from "zod";

import { supabaseAdmin } from "../../config/supabase";
import { prisma } from "../../prisma/client";
import { ApiError } from "../../utils/api-error";
import { paginationMeta } from "../../utils/pagination";
import { legacyProductViewSelect, productViewSelect } from "./products.select";
import { productListQuerySchema } from "./products.schemas";
import type { createAdminProductPreviewSchema, createProductSchema, updateProductSchema } from "./products.schemas";

type CreateProductInput = z.infer<typeof createProductSchema>;
type CreateAdminProductPreviewInput = z.infer<typeof createAdminProductPreviewSchema>;
type UpdateProductInput = z.infer<typeof updateProductSchema>;

const productImagesBucket = "product-images";

const supportsProductVariants = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT product_id FROM variants LIMIT 1`;
    return true;
  } catch {
    return false;
  }
};

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

  let products;
  let total;
  try {
    [products, total] = await prisma.$transaction([
      prisma.product.findMany({ where, select: productViewSelect, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.product.count({ where }),
    ]);
  } catch (error) {
    // Keep catalog reads available until the new product_id migration is deployed.
    if (!(error instanceof Error) || !error.message.includes("product_id")) throw error;
    [products, total] = await prisma.$transaction([
      prisma.product.findMany({ where, select: legacyProductViewSelect, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.product.count({ where }),
    ]);
  }

  return { products, pagination: paginationMeta(page, limit, total) };
};

export const getProduct = async (id: string, role: UserRole) => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: await supportsProductVariants() ? productViewSelect : legacyProductViewSelect,
  });
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

  return prisma.$transaction(async (transaction) => {
    if (
      input.name !== undefined ||
      input.description !== undefined ||
      input.brandName !== undefined ||
      input.material !== undefined ||
      input.availableColors !== undefined ||
      input.isActive !== undefined
    ) {
      await transaction.material.update({
        where: { id: existing.materialId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.brandName !== undefined ? { brandName: input.brandName } : {}),
          ...(input.material !== undefined ? { material: input.material } : {}),
          ...(input.availableColors !== undefined ? { availableColors: input.availableColors } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });
    }

    if (
      input.variants?.[0] &&
      (input.variants[0].frameSize ||
        input.variants[0].mountType ||
        input.variants[0].glassType ||
        input.variants[0].price !== undefined ||
        input.variants[0].offerPrice !== undefined ||
        input.variants[0].stockQuantity !== undefined)
    ) {
      const primary = input.variants[0];
      await transaction.variant.update({
        where: { id: existing.variantId },
        data: {
          ...(primary.color !== undefined ? { color: primary.color ?? "Standard" } : {}),
          ...(primary.frameSize !== undefined ? { frameSize: primary.frameSize } : {}),
          ...(primary.mountType !== undefined ? { mountType: primary.mountType } : {}),
          ...(primary.glassType !== undefined ? { glassType: primary.glassType } : {}),
          ...(primary.price !== undefined ? { mrp: primary.price } : {}),
          ...(primary.offerPrice !== undefined ? { price: primary.offerPrice ?? primary.price } : primary.price !== undefined ? { price: primary.price } : {}),
          ...(primary.stockQuantity !== undefined ? { stockQuantity: primary.stockQuantity } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });
    }

    if (input.images !== undefined) {
      await transaction.productImage.deleteMany({ where: { productIdentifier: existing.productIdentifier } });
      if (input.images.length > 0) {
        await transaction.productImage.createMany({
          data: input.images.map((image, index) => ({
            productIdentifier: existing.productIdentifier,
            imageUrl: image.imageUrl,
            isPrimary: index === 0,
          })),
        });
      }
    }

    return transaction.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { productName: input.name } : {}),
        ...(input.productIdentifier !== undefined ? { productIdentifier: input.productIdentifier } : {}),
        ...(input.productName !== undefined ? { productName: input.productName } : {}),
      },
      select: (await supportsProductVariants()) ? productViewSelect : legacyProductViewSelect,
    });
  });
};

export const createProductVariant = async (productId: string, input: unknown, role: UserRole) => {
  const product = await getProduct(productId, role);
  const payload = input as {
    color?: string | null;
    frameSize?: string;
    mountType?: string;
    glassType?: "NONE" | "OPTION_1" | "OPTION_2" | string;
    price?: number;
    offerPrice?: number | null;
    stockQuantity?: number;
    isActive?: boolean;
  };

  if (!payload.frameSize || !payload.mountType || payload.price === undefined || payload.stockQuantity === undefined) {
    throw new ApiError(400, "Variant fields are required", "VARIANT_PAYLOAD_INVALID");
  }
  if (!Number.isFinite(payload.price) || !Number.isInteger(payload.stockQuantity) || payload.stockQuantity < 0) {
    throw new ApiError(400, "Variant price and stock must be valid numbers", "VARIANT_PAYLOAD_INVALID");
  }

  // A product may be edited repeatedly.  Creating a variant must create a
  // new variant row (the UI's “Add Variant” action), then move the product's
  // primary reference to it. Updating the existing row here caused duplicate
  // requests to hit the unique variant constraint and made additions appear
  // to silently fail.
  const variantData = {
    color: payload.color ?? product.material.availableColors[0] ?? "Standard",
    frameSize: payload.frameSize,
    mountType: payload.mountType,
    glassType: (payload.glassType ?? "NONE") as any,
    stockQuantity: payload.stockQuantity,
    mrp: payload.price,
    price: payload.offerPrice ?? payload.price,
    isActive: payload.isActive ?? true,
    createdById: product.createdById,
  };
  // Reuse an identical variant when the unique composite key already exists.
  // This makes retries idempotent instead of surfacing a 500 from Prisma.
  // Resolve the unique variant in two explicit steps. This avoids Prisma
  // upsert validation failures with Decimal compound keys on older clients.
  const multiVariant = await supportsProductVariants();
  const existingVariant = await prisma.variant.findFirst({
    where: {
      color: variantData.color,
      frameSize: variantData.frameSize,
      mountType: variantData.mountType,
      mrp: variantData.mrp,
      price: variantData.price,
      ...(multiVariant ? { OR: [{ productId: null }, { productId }] } : {}),
    },
  });
  const variant = existingVariant
    ? await prisma.variant.update({
        where: { id: existingVariant.id },
        data: {
          glassType: variantData.glassType,
          stockQuantity: variantData.stockQuantity,
          isActive: variantData.isActive,
        },
      })
    : await prisma.variant.create({ data: multiVariant ? { ...variantData, productId } : variantData });

  if (await supportsProductVariants()) {
    await prisma.variant.update({ where: { id: variant.id }, data: { productId } });
  }

  return prisma.product.findUniqueOrThrow({
    where: { id: productId },
    select: multiVariant ? productViewSelect : legacyProductViewSelect,
  });
};

export const updateProductVariant = async (variantId: string, input: unknown, role: UserRole) => {
  const payload = input as {
    color?: string | null;
    frameSize?: string;
    mountType?: string;
    glassType?: "NONE" | "OPTION_1" | "OPTION_2" | string;
    price?: number;
    offerPrice?: number | null;
    stockQuantity?: number;
    isActive?: boolean;
  };
  const variant = await prisma.variant.findUnique({ where: { id: variantId }, select: { id: true } });
  if (!variant) throw new ApiError(404, "Variant does not exist", "VARIANT_NOT_FOUND");
  if (payload.price !== undefined && !Number.isFinite(payload.price)) {
    throw new ApiError(400, "Variant price must be a valid number", "VARIANT_PAYLOAD_INVALID");
  }
  if (payload.stockQuantity !== undefined && (!Number.isInteger(payload.stockQuantity) || payload.stockQuantity < 0)) {
    throw new ApiError(400, "Variant stock must be a valid non-negative integer", "VARIANT_PAYLOAD_INVALID");
  }
  const nextColor = payload.color !== undefined ? (payload.color ?? "Standard") : undefined;
  const nextFrameSize = payload.frameSize;
  const nextMountType = payload.mountType;
  const nextMrp = payload.price;
  const nextPrice = payload.offerPrice ?? payload.price;
  if (nextColor !== undefined && nextFrameSize !== undefined && nextMountType !== undefined && nextPrice !== undefined && nextMrp !== undefined) {
    const duplicate = await prisma.variant.findFirst({
      where: { color: nextColor, frameSize: nextFrameSize, mountType: nextMountType, mrp: nextMrp, price: nextPrice, NOT: { id: variantId } },
      select: { id: true },
    });
    if (duplicate) throw new ApiError(409, "A variant with these details already exists", "DUPLICATE_VARIANT");
  }
  return prisma.variant.update({
    where: { id: variantId },
    data: {
      ...(payload.color !== undefined ? { color: payload.color ?? "Standard" } : {}),
      ...(payload.frameSize !== undefined ? { frameSize: payload.frameSize } : {}),
      ...(payload.mountType !== undefined ? { mountType: payload.mountType } : {}),
      ...(payload.glassType !== undefined ? { glassType: payload.glassType as any } : {}),
      ...(payload.price !== undefined ? { mrp: payload.price } : {}),
      ...(payload.offerPrice !== undefined ? { price: payload.offerPrice ?? payload.price } : payload.price !== undefined ? { price: payload.price } : {}),
      ...(payload.stockQuantity !== undefined ? { stockQuantity: payload.stockQuantity } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    },
  });
};

export const deleteProductVariant = async (variantId: string, role: UserRole): Promise<void> => {
  await prisma.variant.delete({ where: { id: variantId } });
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
  const multiVariant = await supportsProductVariants();
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
        price: primaryVariant.offerPrice ?? primaryVariant.price,
        isActive: input.isActive,
        createdById: actorId,
      },
    });
    const product = await transaction.product.create({
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
      // Keep this insert scalar-only. The variant relation is attached below
      // after the product row exists, avoiding a circular relation read.
      select: { id: true },
    });
    if (multiVariant) {
      await transaction.variant.update({ where: { id: variant.id }, data: { productId: product.id } });
    }
    for (const extra of input.variants.slice(1)) {
      await transaction.variant.create({
        data: {
          ...(multiVariant ? { productId: product.id } : {}),
          color: extra.color ?? input.availableColors[0] ?? "Standard",
          frameSize: extra.frameSize,
          mountType: extra.mountType,
          glassType: extra.glassType,
          stockQuantity: extra.stockQuantity,
          mrp: extra.price,
          price: extra.offerPrice ?? extra.price,
          isActive: input.isActive,
          createdById: actorId,
        },
      });
    }
    return transaction.product.findUniqueOrThrow({
      where: { id: product.id },
      select: multiVariant ? productViewSelect : legacyProductViewSelect,
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
