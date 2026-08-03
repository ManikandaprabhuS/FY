import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import useProducts from '../../hooks/useProducts';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { ArrowLeft, Plus, Edit2, Trash2, Image as ImageIcon, Upload, Info, CheckCircle2 } from 'lucide-react';
import { ProductImage, ProductStatus } from '../../types';
import { uploadProductImages } from '../../services/product.service';
import { showError, showSuccess } from '../../utils/toast';

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
  const isEditing = !isNew;
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
  const [wizardStep, setWizardStep] = useState(1);
  const [creationComplete, setCreationComplete] = useState(false);
  const [createdProductName, setCreatedProductName] = useState('');

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
      brandName: brand,
      material,
      availableColors: colors,
      isActive: status === 'active',
      images: images.map((image, index) => ({
        imageUrl: image.imageUrl,
        displayOrder: index + 1,
      })),
      variants: variants.map((variant) => ({
        frameSize: variant.frameSize,
        mountType: variant.mountType,
        glassType: variant.glassType,
        price: variant.price,
        offerPrice: variant.offerPrice,
        stockQuantity: variant.stockQuantity,
      })),
    };

    let success = false;
    if (isNew) {
      const product = await addProduct(payload);
      if (product) {
        setCreatedProductName(product.name || name);
        success = true;
        showSuccess('Product created successfully');
      } else {
        showError('Unable to create product');
      }
    } else if (id) {
      success = await editProduct(id, payload);
      if (success) {
        showSuccess('Product updated successfully');
      } else {
        showError('Unable to update product');
      }
    }

    setIsSaving(false);

    if (success && isNew) {
      setCreationComplete(true);
      return;
    }

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
        showSuccess(editingVariant ? 'Variant updated successfully' : 'Variant added successfully');
      } else {
        showError(editingVariant ? 'Unable to update variant' : 'Unable to add variant');
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

  const wizardSteps = ['Basic Info', 'Materials', 'Variants', 'Images', 'Review'];

  const startAnotherProduct = () => {
    setName('');
    setDescription('');
    setBrand('');
    setMaterial('Solid Oak');
    setColors(['#0f172a', '#fef3c7', '#ffffff']);
    setStatus('active');
    setVariants([]);
    setImages([]);
    setImageError(null);
    setCreatedProductName('');
    setWizardStep(1);
    setCreationComplete(false);
  };

  if (isNew && creationComplete) {
    return (
      <div className="mx-auto flex min-h-[580px] max-w-6xl items-center justify-center rounded-sm border border-outline-variant bg-surface-container-lowest p-6 animate-fade-in">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-9 w-9" strokeWidth={1.8} />
          </div>
          <h2 className="text-xl font-bold text-on-surface">Product Created Successfully!</h2>
          <p className="mt-2 text-sm text-on-surface-variant">{createdProductName || 'Your product'} has been created.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => navigate('/admin/products')} className="rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-on-primary shadow-sm">View Products</button>
            <button type="button" onClick={startAnotherProduct} className="rounded-lg border border-outline-variant px-5 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface">Add Another Product</button>
          </div>
        </div>
      </div>
    );
  }

  // The add flow is deliberately UI-only: it uses the same local state and the
  // same save/upload handlers as the existing product form.
  if (isNew || isEditing) {
    const goNext = () => {
      if (wizardStep === 1 && (!name || !description || !brand)) return;
      setWizardStep((step) => Math.min(step + 1, wizardSteps.length));
    };

    return (
      <div className="mx-auto max-w-6xl space-y-6 pb-12 animate-fade-in">
        <header className="flex flex-col gap-4 border-b border-outline-variant/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <nav className="flex items-center gap-1 text-[11px] text-on-surface-variant">
              <Link to="/admin/products" className="hover:text-primary">Products</Link><span>›</span><span>{isEditing ? 'Edit Product' : 'Add Product'}</span>
            </nav>
            <h2 className="mt-1 text-2xl font-bold text-on-surface">{isEditing ? 'Edit Product' : 'Add Product'}</h2>
          </div>
          <button type="button" onClick={() => navigate('/admin/products')} className="rounded-lg border border-outline-variant px-5 py-2 text-xs font-semibold hover:bg-surface">Cancel</button>
        </header>

        <ol className="grid grid-cols-5 gap-1 border-b border-outline-variant pb-5">
          {wizardSteps.map((step, index) => {
            const number = index + 1;
            const complete = number < wizardStep;
            const active = number === wizardStep;
            return <li key={step} className="flex items-center gap-2 min-w-0">
              <button type="button" onClick={() => number < wizardStep && setWizardStep(number)} className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-primary text-on-primary' : complete ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>{complete ? '✓' : number}</button>
              <span className={`hidden truncate text-xs sm:block ${active ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>{step}</span>
            </li>;
          })}
        </ol>

        <section className="min-h-[410px] rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm sm:p-7">
          {wizardStep === 1 && <div className="mx-auto max-w-3xl">
            <h3 className="text-base font-bold text-on-surface">Basic Information</h3><p className="mt-1 text-xs text-on-surface-variant">Add the product details customers will see.</p>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Product Name *<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Modern Family Frame" className="mt-2 w-full rounded-lg border border-outline-variant p-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-primary" /></label>
              <label className="md:col-span-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Description *<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder="Write product description..." className="mt-2 w-full resize-none rounded-lg border border-outline-variant p-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-primary" /></label>
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Brand Name *<input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="e.g. FrameYard" className="mt-2 w-full rounded-lg border border-outline-variant p-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-primary" /></label>
              <fieldset className="text-xs font-bold uppercase tracking-wider text-on-surface-variant"><legend>Publishing Status</legend><div className="mt-3 flex gap-5 text-sm font-normal normal-case tracking-normal text-on-surface"><label className="flex items-center gap-2"><input type="radio" checked={status === 'active'} onChange={() => setStatus('active')} /> Active</label><label className="flex items-center gap-2"><input type="radio" checked={status === 'draft'} onChange={() => setStatus('draft')} /> Draft</label></div></fieldset>
            </div>
          </div>}

          {wizardStep === 2 && <div className="mx-auto max-w-3xl">
            <h3 className="text-base font-bold text-on-surface">Material &amp; Colours</h3><p className="mt-1 text-xs text-on-surface-variant">Choose the frame material and available finish colours.</p>
            <div className="mt-7 grid gap-6 md:grid-cols-2"><label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Material<select value={material} onChange={(event) => setMaterial(event.target.value)} className="mt-2 w-full rounded-lg border border-outline-variant bg-white p-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-primary"><option>Solid Oak</option><option>Black Walnut</option><option>Anodized Aluminum</option><option>Maple Wood</option><option>Pine Wood</option></select></label><div><p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Available Colours</p><div className="mt-3 flex flex-wrap gap-3">{presetColors.map((color) => <button key={color.code} type="button" onClick={() => togglePresetColor(color.code)} title={color.name} className={`h-9 w-9 rounded-full border-2 ${colors.includes(color.code) ? 'border-primary ring-2 ring-primary/20' : 'border-outline-variant'}`} style={{ backgroundColor: color.code }} />)}</div><p className="mt-3 text-xs text-on-surface-variant">Select one or more colours.</p></div></div>
          </div>}

          {wizardStep === 3 && <div>
            <div className="flex items-start justify-between gap-4"><div><h3 className="text-base font-bold text-on-surface">Add Variants</h3><p className="mt-1 text-xs text-on-surface-variant">Add sizes, mount options, glass options, prices and stock.</p></div><button type="button" onClick={openAddVariant} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary"><Plus className="h-3.5 w-3.5" /> Add Variant</button></div>
            <div className="mt-6 overflow-x-auto rounded-lg border border-outline-variant"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-surface text-[11px] uppercase tracking-wider text-on-surface-variant"><tr><th className="px-4 py-3">Size</th><th className="px-4 py-3">Mount Type</th><th className="px-4 py-3">Glass Type</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-outline-variant/50">{variants.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-on-surface-variant">No variants added yet.</td></tr> : variants.map((variant) => <tr key={variant.id}><td className="px-4 py-3 font-medium">{variant.frameSize}</td><td className="px-4 py-3">{variant.mountType}</td><td className="px-4 py-3">{variant.glassType}</td><td className="px-4 py-3">₹{variant.price.toFixed(2)}</td><td className="px-4 py-3">{variant.stockQuantity}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => openEditVariant(variant)} className="p-1 text-on-surface-variant hover:text-primary"><Edit2 className="h-4 w-4" /></button><button type="button" onClick={() => handleDeleteVariant(variant.id)} className="p-1 text-on-surface-variant hover:text-error"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>
          </div>}

          {wizardStep === 4 && <div><div className="flex items-start justify-between gap-4"><div><h3 className="text-base font-bold text-on-surface">Upload Product Images</h3><p className="mt-1 text-xs text-on-surface-variant">Upload up to {MAX_IMAGES} images or videos. The first is the product cover.</p></div><button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImages || images.length >= MAX_IMAGES} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-60"><Upload className="h-3.5 w-3.5" /> {isUploadingImages ? 'Uploading...' : 'Upload Images'}</button></div><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,.jpg,.jpeg,.png,.webp,.mp4" multiple className="hidden" onChange={handleImageSelection} />{imageError && <p className="mt-4 rounded-lg bg-error-container/20 p-3 text-xs text-error">{imageError}</p>}<div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">{images.map((image, index) => <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg border border-outline-variant bg-surface-container">{isVideoUrl(image.imageUrl) ? <video src={image.imageUrl} className="h-full w-full object-cover" controls /> : <img src={image.imageUrl} alt={`Product image ${index + 1}`} className="h-full w-full object-cover" />}<span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">{index === 0 ? 'Cover' : `Image ${index + 1}`}</span><button type="button" onClick={() => handleRemoveImage(image.id)} className="absolute right-1 top-1 rounded bg-white p-1 text-error shadow"><Trash2 className="h-3.5 w-3.5" /></button></div>)}<button type="button" onClick={() => fileInputRef.current?.click()} className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant text-xs text-on-surface-variant hover:bg-surface"><Plus className="mb-1 h-5 w-5" />Add Image</button></div></div>}

          {wizardStep === 5 && <div className="mx-auto max-w-3xl"><h3 className="text-base font-bold text-on-surface">Review Product</h3><p className="mt-1 text-xs text-on-surface-variant">Review the product before creating it.</p><div className="mt-6 divide-y divide-outline-variant overflow-hidden rounded-lg border border-outline-variant text-sm"><div className="grid gap-2 p-4 sm:grid-cols-[150px_1fr]"><span className="font-bold">Basic Information</span><span><strong>{name}</strong><br /><span className="text-on-surface-variant">{description}</span><br /><span className="text-on-surface-variant">Brand: {brand} · {status === 'active' ? 'Active' : 'Draft'}</span></span></div><div className="grid gap-2 p-4 sm:grid-cols-[150px_1fr]"><span className="font-bold">Materials</span><span>{material} · {colors.length} colour{colors.length === 1 ? '' : 's'} selected</span></div><div className="grid gap-2 p-4 sm:grid-cols-[150px_1fr]"><span className="font-bold">Variants</span><span>{variants.length} variant{variants.length === 1 ? '' : 's'} added</span></div><div className="grid gap-2 p-4 sm:grid-cols-[150px_1fr]"><span className="font-bold">Images</span><span>{images.length} image{images.length === 1 ? '' : 's'} added</span></div></div></div>}
        </section>

        <footer className="flex items-center justify-between"><button type="button" onClick={() => setWizardStep((step) => Math.max(1, step - 1))} disabled={wizardStep === 1} className="rounded-lg border border-outline-variant px-5 py-2 text-xs font-semibold disabled:invisible hover:bg-surface">Back</button>{wizardStep < wizardSteps.length ? <button type="button" onClick={goNext} className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-on-primary">Next</button> : <button type="button" onClick={handleSave} disabled={isSaving || isUploadingImages} className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-on-primary disabled:opacity-60">{isSaving ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Product' : 'Create Product')}</button>}</footer>

        <Modal isOpen={variantModalOpen} onClose={() => setVariantModalOpen(false)} title={editingVariant ? 'Edit Variant' : 'Add Variant'} footer={<><button type="button" onClick={() => setVariantModalOpen(false)} className="rounded-lg border border-outline-variant px-4 py-2 text-xs font-semibold">Cancel</button><button type="button" onClick={handleSaveVariant} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary">Save Variant</button></>}><div className="grid grid-cols-2 gap-4"><label className="col-span-2 text-xs font-bold uppercase text-on-surface-variant">Frame Size *<input value={varSize} onChange={(event) => setVarSize(event.target.value)} placeholder={'e.g. 8" x 10"'} className="mt-2 w-full rounded-lg border border-outline-variant p-2.5 text-sm font-normal normal-case" /></label><label className="text-xs font-bold uppercase text-on-surface-variant">Mount Type<select value={varMountType} onChange={(event) => setVarMountType(event.target.value)} className="mt-2 w-full rounded-lg border border-outline-variant p-2.5 text-sm font-normal normal-case"><option value="NONE">None</option><option value="OPTION_1">Option 1</option><option value="OPTION_2">Option 2</option></select></label><label className="text-xs font-bold uppercase text-on-surface-variant">Glass Type<select value={varGlassType} onChange={(event) => setVarGlassType(event.target.value)} className="mt-2 w-full rounded-lg border border-outline-variant p-2.5 text-sm font-normal normal-case"><option value="NONE">None</option><option value="OPTION_1">Option 1</option><option value="OPTION_2">Option 2</option></select></label><label className="text-xs font-bold uppercase text-on-surface-variant">Price *<input type="number" value={varPrice} onChange={(event) => setVarPrice(event.target.value)} className="mt-2 w-full rounded-lg border border-outline-variant p-2.5 text-sm" /></label><label className="text-xs font-bold uppercase text-on-surface-variant">Offer Price<input type="number" value={varOfferPrice} onChange={(event) => setVarOfferPrice(event.target.value)} className="mt-2 w-full rounded-lg border border-outline-variant p-2.5 text-sm" /></label><label className="col-span-2 text-xs font-bold uppercase text-on-surface-variant">Stock Inventory *<input type="number" value={varStock} onChange={(event) => setVarStock(event.target.value)} className="mt-2 w-full rounded-lg border border-outline-variant p-2.5 text-sm" /></label></div></Modal>
      </div>
    );
  }

  return null;
};

export default ProductDetailsPage;
