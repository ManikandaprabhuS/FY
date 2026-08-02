import { create } from 'zustand';
import { Product } from '../types';
import { ProductPayload, productService, VariantPayload } from '../services/product.service';

interface ProductState {
  products: Product[];
  currentProduct: Product | null;
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;
  addProduct: (product: ProductPayload) => Promise<Product | null>;
  editProduct: (id: string, product: ProductPayload) => Promise<boolean>;
  addVariant: (productId: string, variant: VariantPayload) => Promise<boolean>;
  editVariant: (variantId: string, variant: VariantPayload) => Promise<boolean>;
  removeVariant: (variantId: string) => Promise<boolean>;
  clearCurrentProduct: () => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  currentProduct: null,
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const data = await productService.getProducts();
      set({ products: data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch products', loading: false });
    }
  },

  fetchProductById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const product = await productService.getProductById(id);
      set({ currentProduct: product, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to fetch product', loading: false });
    }
  },

  addProduct: async (product) => {
    set({ loading: true, error: null });
    try {
      const newProd = await productService.createProduct(product);
      set((state) => ({
        products: [...state.products, newProd],
        loading: false,
      }));
      return newProd;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to add product', loading: false });
      return null;
    }
  },

  editProduct: async (id, product) => {
    set({ loading: true, error: null });
    try {
      const updatedProd = await productService.updateProduct(id, product);
      set((state) => {
        // The backend now returns variants+images. But as a safety net,
        // if variants come back empty/missing, keep the existing ones.
        const existingProduct = state.products.find((p) => p.id === id);
        const mergedVariants =
          updatedProd.variants !== undefined
            ? updatedProd.variants
            : existingProduct?.variants || [];
        const mergedImages =
          updatedProd.images !== undefined
            ? updatedProd.images
            : existingProduct?.images || [];
        const merged = {
          ...updatedProd,
          variants: mergedVariants,
          images: mergedImages,
        };
        return {
          products: state.products.map((p) => (p.id === id ? merged : p)),
          currentProduct:
            state.currentProduct?.id === id ? merged : state.currentProduct,
          loading: false,
        };
      });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update product', loading: false });
      return false;
    }
  },

  addVariant: async (productId, variant) => {
    set({ loading: true, error: null });
    try {
      await productService.createVariant(productId, variant);
      const product = await productService.getProductById(productId);
      set((state) => ({
        currentProduct: product,
        products: state.products.map((p) => (p.id === productId ? product : p)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to add variant', loading: false });
      return false;
    }
  },

  editVariant: async (variantId, variant) => {
    set({ loading: true, error: null });
    try {
      const updatedVariant = await productService.updateVariant(variantId, variant);
      set((state) => ({
        products: state.products.map((product) => ({
          ...product,
          variants: product.variants.map((item) => (item.id === variantId ? updatedVariant : item)),
        })),
        currentProduct: state.currentProduct
          ? {
              ...state.currentProduct,
              variants: state.currentProduct.variants.map((item) =>
                item.id === variantId ? updatedVariant : item
              ),
            }
          : null,
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to update variant', loading: false });
      return false;
    }
  },

  removeVariant: async (variantId) => {
    set({ loading: true, error: null });
    try {
      await productService.deleteVariant(variantId);
      set((state) => ({
        products: state.products.map((product) => ({
          ...product,
          variants: product.variants.filter((item) => item.id !== variantId),
        })),
        currentProduct: state.currentProduct
          ? {
              ...state.currentProduct,
              variants: state.currentProduct.variants.filter((item) => item.id !== variantId),
            }
          : null,
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Failed to delete variant', loading: false });
      return false;
    }
  },

  clearCurrentProduct: () => set({ currentProduct: null }),
}));
