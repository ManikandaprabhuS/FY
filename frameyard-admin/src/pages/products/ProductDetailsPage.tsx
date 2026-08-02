import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import useProducts from '../../hooks/useProducts';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { ArrowLeft, Plus, Edit2, Trash2, Image as ImageIcon, Upload, Info } from 'lucide-react';
import { ProductImage, ProductStatus } from '../../types';
import { uploadProductImages } from '../../services/product.service';

type VariantForm = {
  id: string;
  productId?: string;
  frameSize: string;
  mountType: string;
  glassType: string;
  price: number;
  offerPrice?: number | null;
  stockQuantity: number;
  priceValidUntil?: string | null;
};

type ProductImageDraft = ProductImage & {
  previewUrl?: string;
  isUploading?: boolean;
};

const MAX_IMAGES = 10;

const isVideoUrl = (url: string) => /\.mp4(\?|$)/i.test(url);

const normalizeImageOrder = (items: ProductImageDraft[]) =>
  items.map((item, index) => ({
    ...item,
    displayOrder: index + 1,
  }));

export const ProductDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    currentProduct,
    loading,
    fetchProductById,
    addProduct,
    editProduct,
    addVariant,
    editVariant,
    removeVariant,
    clearCurrentProduct,
  } = useProducts();

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [material, setMaterial] = useState('Solid Oak');
  const [colors, setColors] = useState<string[]>([]);
  const [status, setStatus] = useState<ProductStatus>('active');
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [images, setImages] = useState<ProductImageDraft[]>([]);

  // Upload State
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Variant Modal State
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<VariantForm | null>(null);
  const [varSize, setVarSize] = useState('');
  const [varMountType, setVarMountType] = useState('NONE');
  const [varGlassType, setVarGlassType] = useState('NONE');
  const [varPrice, setVarPrice] = useState('');
  const [varOfferPrice, setVarOfferPrice] = useState('');
  const [varStock, setVarStock] = useState('');

  const mapCurrentProductImages = (productImages: ProductImage[] = []) =>
    normalizeImageOrder(
      productImages.map((image) => ({
        ...image,
        previewUrl: image.imageUrl,
      }))
    );

  useEffect(() => {
    if (!isNew && id) {
      fetchProductById(id);
      return;
    }

    clearCurrentProduct();
    const resetTimer = window.setTimeout(() => {
      setName('');
      setDescription('');
      setBrand('');
      setMaterial('Solid Oak');
      setColors(['#0f172a', '#fef3c7', '#ffffff']);
      setStatus('active');
      setVariants([]);
      setImages([]);
      setImageError(null);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [id, isNew, fetchProductById, clearCurrentProduct]);

  useEffect(() => {
    if (!isNew && currentProduct) {
      const applyTimer = window.setTimeout(() => {
        setName(currentProduct.name);
        setDescription(currentProduct.description || '');
        setBrand(currentProduct.brandName);
        setMaterial(currentProduct.material);
        setColors(currentProduct.availableColors || []);
        setStatus(currentProduct.isActive ? 'active' : 'draft');
        setVariants(currentProduct.variants);
        setImages(mapCurrentProductImages(currentProduct.images || []));
      }, 0);

      return () => window.clearTimeout(applyTimer);
    }
  }, [currentProduct, isNew]);

  const handleImageSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';

    if (selectedFiles.length === 0) {
      return;
    }

    if (isUploadingImages) {
      setImageError('Please wait for the current upload to finish.');
      return;
    }

    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      setImageError(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    const filesToUpload = selectedFiles.slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      setImageError(`Only ${remainingSlots} more image(s) can be added.`);
    } else {
      setImageError(null);
    }

    const tempEntries: ProductImageDraft[] = filesToUpload.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      return {
        id: `temp-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        productId: id || '',
        imageUrl: previewUrl,
        displayOrder: images.length + index + 1,
        previewUrl,
        isUploading: true,
      };
    });

    setImages((prev) => normalizeImageOrder([...prev, ...tempEntries]));
    setIsUploadingImages(true);

    try {
      const uploadedUrls = await uploadProductImages(filesToUpload);

      if (uploadedUrls.length !== tempEntries.length) {
        throw new Error('Upload completed without returning all image URLs.');
      }

      setImages((prev) =>
        normalizeImageOrder(
          prev.map((image) => {
            const uploadedIndex = tempEntries.findIndex((entry) => entry.id === image.id);

            if (uploadedIndex === -1) {
              return image;
            }

            return {
              ...image,
              imageUrl: uploadedUrls[uploadedIndex],
              previewUrl: uploadedUrls[uploadedIndex],
              isUploading: false,
            };
          })
        )
      );

      tempEntries.forEach((entry) => {
        if (entry.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(entry.previewUrl);
        }
      });
    } catch (error: unknown) {
      setImages((prev) =>
        normalizeImageOrder(prev.filter((image) => !tempEntries.some((entry) => entry.id === image.id)))
      );
      const uploadError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setImageError(
        uploadError?.response?.data?.message ||
          uploadError?.message ||
          'Failed to upload images.'
      );
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setImages((prev) => {
      const target = prev.find((item) => item.id === imageId);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return normalizeImageOrder(prev.filter((item) => item.id !== imageId));
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !material || isUploadingImages || isSaving) return;

    setIsSaving(true);

    const payload = {
      name,
      description,
      material,
      availableColors: colors,
      isActive: status === 'active',
      images: images.map((image, index) => ({
        imageUrl: image.imageUrl,
        displayOrder: index + 1,
      })),
    };

    let success = false;
    if (isNew) {
      const product = await addProduct(payload);
      if (product) {
        for (const variant of variants) {
          await addVariant(product.id, {
            frameSize: variant.frameSize,
            mountType: variant.mountType,
            glassType: variant.glassType,
            price: variant.price,
            offerPrice: variant.offerPrice,
            stockQuantity: variant.stockQuantity,
            priceValidUntil: variant.priceValidUntil,
          });
        }
        success = true;
      }
    } else if (id) {
      success = await editProduct(id, payload);
    }

    setIsSaving(false);

    if (success) {
      navigate('/admin/products');
    }
  };

  const togglePresetColor = (colorCode: string) => {
    if (colors.includes(colorCode)) {
      setColors(colors.filter((color) => color !== colorCode));
    } else {
      setColors([...colors, colorCode]);
    }
  };

  const openAddVariant = () => {
    setEditingVariant(null);
    setVarSize('');
    setVarMountType('NONE');
    setVarGlassType('NONE');
    setVarPrice('');
    setVarOfferPrice('');
    setVarStock('');
    setVariantModalOpen(true);
  };

  const openEditVariant = (variant: VariantForm) => {
    setEditingVariant(variant);
    setVarSize(variant.frameSize);
    setVarMountType(variant.mountType);
    setVarGlassType(variant.glassType);
    setVarPrice(variant.price.toString());
    setVarOfferPrice(variant.offerPrice?.toString() || '');
    setVarStock(variant.stockQuantity.toString());
    setVariantModalOpen(true);
  };

  const handleSaveVariant = async () => {
    if (!varSize || !varPrice || !varStock) return;

    const newVariant: VariantForm = {
      id: editingVariant?.id || `v-${Math.random().toString(36).slice(2, 7)}`,
      productId: editingVariant?.productId || id,
      frameSize: varSize,
      mountType: varMountType,
      glassType: varGlassType,
      price: parseFloat(varPrice),
      offerPrice: varOfferPrice ? parseFloat(varOfferPrice) : null,
      stockQuantity: parseInt(varStock, 10),
      priceValidUntil: editingVariant?.priceValidUntil || null,
    };

    if (!isNew && id) {
      const payload = {
        frameSize: newVariant.frameSize,
        mountType: newVariant.mountType,
        glassType: newVariant.glassType,
        price: newVariant.price,
        offerPrice: newVariant.offerPrice,
        stockQuantity: newVariant.stockQuantity,
        priceValidUntil: newVariant.priceValidUntil,
      };
      const saved = editingVariant
        ? await editVariant(editingVariant.id, payload)
        : await addVariant(id, payload);
      if (saved) {
        await fetchProductById(id);
      }
      setVariantModalOpen(false);
      return;
    }

    if (editingVariant) {
      setVariants(variants.map((variant) => (variant.id === editingVariant.id ? newVariant : variant)));
    } else {
      setVariants([...variants, newVariant]);
    }
    setVariantModalOpen(false);
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!isNew && id) {
      const removed = await removeVariant(variantId);
      if (removed) {
        await fetchProductById(id);
      }
      return;
    }
    setVariants(variants.filter((variant) => variant.id !== variantId));
  };

  if (loading && !isNew) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-secondary">Loading product details...</p>
      </div>
    );
  }

  const presetColors = [
    { code: '#0f172a', name: 'Black' },
    { code: '#fef3c7', name: 'Natural Oak' },
    { code: '#ffffff', name: 'White' },
    { code: '#4a3728', name: 'Dark Walnut' },
    { code: '#94a3b8', name: 'Silver' },
    { code: '#ca8a04', name: 'Gold' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col gap-4 border-b border-outline-variant/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => navigate('/admin/products')}
            className="p-2 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <nav className="flex items-center gap-1 text-[11px] text-on-surface-variant">
              <Link to="/admin/products" className="hover:text-primary">Products</Link>
              <span>&gt;</span>
              <span className="text-primary font-medium">{isNew ? 'New Product' : 'Edit Product'}</span>
            </nav>
            <h2 className="mt-0.5 truncate text-2xl font-bold text-on-surface">
              {isNew ? 'New Product' : name || 'Edit Product'}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="h-10 w-full rounded-xl border border-outline-variant px-5 py-2 text-sm font-semibold transition-colors hover:bg-surface-container-low sm:w-auto"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isUploadingImages || isSaving}
            className="h-10 w-full rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-on-primary shadow-sm transition-all hover:scale-[1.01] hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSaving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/50">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">General Information</h3>
              <Badge type={status === 'active' ? 'success' : 'neutral'}>
                Status: {status === 'active' ? 'Active' : 'Draft'}
              </Badge>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-5" onSubmit={(event) => event.preventDefault()}>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  placeholder="e.g. Nordic Oak Gallery"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  rows={4}
                  placeholder="Describe the materials, craftsmanship, and aesthetics..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Brand Name</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  className="w-full border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                  placeholder="e.g. FrameYard Studio"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Material</label>
                <select
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  className="w-full border border-outline-variant rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all cursor-pointer"
                >
                  <option>Solid Oak</option>
                  <option>Black Walnut</option>
                  <option>Anodized Aluminum</option>
                  <option>Maple Wood</option>
                  <option>Pine Wood</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Available Colors</label>
                <div className="flex flex-wrap items-center gap-2 py-1">
                  {presetColors.map((color) => {
                    const isSelected = colors.includes(color.code);
                    return (
                      <button
                        key={color.code}
                        type="button"
                        onClick={() => togglePresetColor(color.code)}
                        className={`w-7 h-7 rounded-full border ring-offset-1 transition-all ${
                          isSelected ? 'ring-2 ring-primary border-transparent' : 'border-outline-variant hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.code }}
                        title={color.name}
                      />
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Publishing Status</label>
                <div className="flex items-center gap-6 py-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface">
                    <input
                      type="radio"
                      name="status"
                      checked={status === 'active'}
                      onChange={() => setStatus('active')}
                      className="text-primary focus:ring-primary/10 w-4 h-4"
                    />
                    <span>Published</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface">
                    <input
                      type="radio"
                      name="status"
                      checked={status === 'draft'}
                      onChange={() => setStatus('draft')}
                      className="text-primary focus:ring-primary/10 w-4 h-4"
                    />
                    <span>Draft</span>
                  </label>
                </div>
              </div>
            </form>
          </section>

          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/50 bg-surface-container-lowest">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Pricing &amp; Variants</h3>
              <button
                type="button"
                onClick={openAddVariant}
                className="flex items-center gap-1 bg-secondary text-on-secondary px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-secondary/95 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface border-b border-outline-variant">
                  <tr className="text-secondary font-semibold text-xs uppercase tracking-wider">
                    <th className="px-6 py-3">Frame Size</th>
                    <th className="px-6 py-3">Mount & Glass</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Stock</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-sm">
                  {variants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-xs text-on-surface-variant">
                        No sizing variants added. Click "Add Variant" to insert options.
                      </td>
                    </tr>
                  ) : (
                    variants.map((variant) => (
                      <tr key={variant.id} className="hover:bg-surface transition-colors">
                        <td className="px-6 py-4 font-semibold text-on-surface">{variant.frameSize}</td>
                        <td className="px-6 py-4 text-on-surface-variant">
                          {variant.mountType} / {variant.glassType}
                        </td>
                        <td className="px-6 py-4 font-semibold">
                          <div className="flex flex-col">
                            <span>â‚¹{variant.price.toFixed(2)}</span>
                            {variant.offerPrice && (
                              <span className="text-xs text-error font-medium">â‚¹{variant.offerPrice.toFixed(2)} Offer</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium">
                          <span className={variant.stockQuantity <= 5 ? 'text-error font-bold' : 'text-on-surface'}>
                            {variant.stockQuantity} units
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditVariant(variant)}
                              className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(variant.id)}
                              className="p-1 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <section className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Product Images</h3>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Upload up to {MAX_IMAGES} files. JPG, JPEG, PNG, WEBP, and MP4 are supported.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImages || images.length >= MAX_IMAGES}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-outline-variant text-xs font-semibold hover:bg-surface-container-low transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingImages ? 'Uploading...' : 'Add Images'}</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,.jpg,.jpeg,.png,.webp,.mp4"
              multiple
              className="hidden"
              onChange={handleImageSelection}
            />

            {imageError && (
              <div className="rounded-lg border border-error/20 bg-error-container/20 px-3 py-2 text-xs text-error">
                {imageError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {images.length > 0 ? (
                images.map((image, index) => (
                  <div key={image.id} className={index === 0 ? 'col-span-2' : ''}>
                    <div
                      className={`relative group overflow-hidden rounded-lg bg-surface-container inner-stroke ${
                        index === 0 ? 'aspect-[4/3]' : 'aspect-square'
                      }`}
                    >
                      {isVideoUrl(image.imageUrl) ? (
                        <video
                          src={image.imageUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          controls
                        />
                      ) : (
                        <img
                          src={image.imageUrl}
                          alt={`Product visual ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      )}

                      {image.isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-on-primary text-[9px] font-bold uppercase rounded tracking-wider shadow">
                        {index === 0 ? 'Primary Cover' : `Image ${index + 1}`}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        disabled={isUploadingImages || image.isUploading}
                        className="absolute top-2 right-2 p-1.5 bg-white rounded-full text-error hover:bg-error hover:text-white transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 aspect-square border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center bg-surface-container">
                  <ImageIcon className="w-8 h-8 text-outline-variant/80 mb-2" />
                  <span className="text-xs text-on-surface-variant">No images added</span>
                </div>
              )}

              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImages}
                  className="aspect-square border-2 border-dashed border-outline-variant rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-surface-container transition-all group disabled:opacity-60"
                >
                  <Upload className="w-5 h-5 text-outline-variant group-hover:text-primary transition-colors" />
                  <span className="text-[10px] font-semibold text-outline-variant group-hover:text-primary transition-colors">
                    Add Image
                  </span>
                </button>
              )}
            </div>

            <div className="p-4 bg-surface-container rounded-lg flex items-start gap-3">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                The first uploaded asset becomes the primary cover. You can remove or add images before saving, and the order is preserved in the saved product record.
              </p>
            </div>

            {isUploadingImages && (
              <div className="text-xs text-primary font-medium">
                Upload in progress. Saving is disabled until the selected files finish uploading.
              </div>
            )}
          </section>
        </div>
      </div>

      <Modal
        isOpen={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        title={editingVariant ? 'Edit Sizing Variant' : 'Create Custom Variant'}
        footer={
          <>
            <button
              type="button"
              onClick={() => setVariantModalOpen(false)}
              className="px-4 py-2 border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveVariant}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary/95"
            >
              Save Variant
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Frame Size (e.g. 11" x 14", A3)</label>
            <input
              type="text"
              value={varSize}
              onChange={(event) => setVarSize(event.target.value)}
              className="w-full border border-outline-variant rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder='e.g. 8" x 10"'
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2"> MOUNT TYPE </label>
            <select
              value={varMountType}
              onChange={(event) => setVarMountType(event.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="NONE">NONE</option>
              <option value="OPTION_1">OPTION 1</option>
              <option value="OPTION_2">OPTION 2</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2">GLASS TYPE</label>

            <select
              value={varGlassType}
              onChange={(event) => setVarGlassType(event.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="NONE">NONE</option>
              <option value="OPTION_1">OPTION 1</option>
              <option value="OPTION_2">OPTION 2</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Price (â‚¹)</label>
            <input
              type="number"
              value={varPrice}
              onChange={(event) => setVarPrice(event.target.value)}
              className="w-full border border-outline-variant rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. 45.00"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Offer Price (â‚¹ - Optional)</label>
            <input
              type="number"
              value={varOfferPrice}
              onChange={(event) => setVarOfferPrice(event.target.value)}
              className="w-full border border-outline-variant rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. 39.00"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Stock Inventory (Units)</label>
            <input
              type="number"
              value={varStock}
              onChange={(event) => setVarStock(event.target.value)}
              className="w-full border border-outline-variant rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. 100"
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductDetailsPage;

