import api from './api';
import { Product, ProductImage, ProductVariant } from '../types';

export type ProductImagePayload = {
  imageUrl: string;
  displayOrder: number;
};

export type ProductPayload = {
  productIdentifier?: string | null;
  productName?: string | null;
  materialId?: string | null;
  variantId?: string | null;
  name: string;
  description?: string;
  material: string;
  availableColors: string[];
  createdBy?: string | null;
  isActive?: boolean;
  images?: ProductImagePayload[];
};

export type VariantPayload = {
  color?: string | null;
  frameSize: string;
  mountType: string;
  glassType: string;
  isActive?: boolean;
  createdBy?: string | null;
  mrp?: number | null;
  MRP?: number | null;
  price: number;
  offerPrice?: number | null;
  stockQuantity: number;
  priceValidUntil?: string | null;
};

type ProductVariantApi = {
  price: number | string;
  mrp?: number | string | null;
  offerPrice?: number | string | null;
  stockQuantity: number | string;
  createdAt?: string;
  updatedAt?: string;
  priceValidUntil?: string | null;
  [key: string]: unknown;
};

type ProductApi = {
  variants?: ProductVariantApi[];
  images?: Array<{
    id: string;
    productId: string;
    productIdentifier?: string | null;
    imageUrl: string;
    isPrimary?: boolean;
    displayOrder: number | string;
  }>;
  [key: string]: unknown;
};

const normalizeVariant = (variant: ProductVariantApi): ProductVariant => ({
  ...(variant as unknown as ProductVariant),
  price: Number(variant.price),
  offerPrice:
    variant.offerPrice === null || variant.offerPrice === undefined
      ? null
      : Number(variant.offerPrice),
  mrp:
    variant.mrp === null || variant.mrp === undefined
      ? null
      : Number(variant.mrp),
  stockQuantity: Number(variant.stockQuantity),
  createdAt: variant.createdAt
    ? new Date(variant.createdAt).toISOString()
    : new Date().toISOString(),
  updatedAt: variant.updatedAt
    ? new Date(variant.updatedAt).toISOString()
    : undefined,
  priceValidUntil: variant.priceValidUntil
    ? new Date(variant.priceValidUntil).toISOString()
    : null,
});

const normalizeProduct = (product: ProductApi): Product => ({
  ...(product as unknown as Product),
  variants: Array.isArray(product.variants)
    ? product.variants.map(normalizeVariant)
    : [],
  images: Array.isArray(product.images)
    ? product.images.map((image): ProductImage => ({
      id: image.id,
      productId: image.productId,
      productIdentifier: image.productIdentifier ?? null,
      imageUrl: image.imageUrl,
      isPrimary: image.isPrimary ?? false,
      displayOrder: Number(image.displayOrder),
    }))
    : [],
});

export const uploadProductImages = async (
  files: File[]
) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append(
      "images",
      file
    );
  });
  const response = await api.post("/products/uploadProductImages", formData);
  return response.data.images;
};

export const productService = {
  getProducts: async (): Promise<Product[]> => {
    const response = await api.get('/products');
    return (response.data.products || []).map(normalizeProduct);
  },

  getProductById: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return normalizeProduct(response.data.product);
  },

  createProduct: async (
    product: ProductPayload
  ): Promise<Product> => {
    const response = await api.post('/products/addProduct', product);
    return normalizeProduct(response.data.product);
  },

  updateProduct: async (
    id: string,
    product: ProductPayload
  ): Promise<Product> => {
    const response = await api.put(`/products/${id}`, product);
    return normalizeProduct(response.data.product);
  },

  createVariant: async (
    productId: string,
    variant: VariantPayload
  ): Promise<ProductVariant> => {
    const response = await api.post(`/products/${productId}/variants`, variant);
    return normalizeVariant(response.data.variant);
  },

  updateVariant: async (
    variantId: string,
    variant: VariantPayload
  ): Promise<ProductVariant> => {
    const response = await api.put(`/products/variants/${variantId}`, variant);
    return normalizeVariant(response.data.variant);
  },

  deleteVariant: async (variantId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/products/variants/${variantId}`);
    return response.data;
  },

deleteProduct: async (productId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/products/${productId}`
  );
  return response.data;
},

  exportInventory: async (): Promise<Blob> => {
    const response = await api.get(
      "/products/export",
      {
        responseType: "blob",
      }
    );

    return response.data;
  },

};

