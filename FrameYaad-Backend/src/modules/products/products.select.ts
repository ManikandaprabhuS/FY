import type { Prisma } from "@prisma/client";

export const productViewSelect = {
  id: true,
  productIdentifier: true,
  productName: true,
  materialId: true,
  variantId: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  material: {
    select: {
      id: true,
      name: true,
      description: true,
      brandName: true,
      material: true,
      availableColors: true,
      isActive: true,
    },
  },
  variant: {
    select: {
      id: true,
      color: true,
      frameSize: true,
      mountType: true,
      glassType: true,
      stockQuantity: true,
      mrp: true,
      price: true,
      isActive: true,
    },
  },
  variants: {
    select: {
      id: true,
      color: true,
      frameSize: true,
      mountType: true,
      glassType: true,
      stockQuantity: true,
      mrp: true,
      price: true,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  },
  images: {
    select: {
      id: true,
      imageUrl: true,
      isPrimary: true,
      createdAt: true,
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.ProductSelect;

// Used while an older deployment is being migrated. It preserves the legacy
// primary variant response when the new product_id column is not present yet.
export const legacyProductViewSelect = (() => {
  const { variants: _variants, ...legacy } = productViewSelect;
  return legacy;
})();

export type ProductView = Prisma.ProductGetPayload<{ select: typeof productViewSelect }>;
