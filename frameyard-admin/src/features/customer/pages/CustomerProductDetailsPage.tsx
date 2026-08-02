import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import useProducts from '../../../hooks/useProducts';

const CustomerProductDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { currentProduct, loading, fetchProductById, clearCurrentProduct } = useProducts();

  useEffect(() => {
    if (slug) {
      fetchProductById(slug);
    }

    return () => clearCurrentProduct();
  }, [clearCurrentProduct, fetchProductById, slug]);

  if (loading) {
    return <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">Loading product...</div>;
  }

  if (!currentProduct) {
    return <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">Product not found.</div>;
  }

  const startingPrice = currentProduct.variants?.length
    ? Math.min(...currentProduct.variants.map((variant) => Number(variant.offerPrice || variant.price || 0)))
    : 0;

  return (
    <div className="space-y-6">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm font-bold text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <section className="grid gap-8 rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl bg-surface-container">
          {currentProduct.images?.[0]?.imageUrl ? (
            <img src={currentProduct.images[0].imageUrl} alt={currentProduct.name} className="h-full max-h-[520px] w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-sm text-on-surface-variant">No image</div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">{currentProduct.material}</p>
          <h1 className="mt-3 text-4xl font-black text-on-surface">{currentProduct.name}</h1>
          <p className="mt-4 leading-7 text-on-surface-variant">{currentProduct.description || 'Premium FrameYaad product.'}</p>
          <p className="mt-6 text-2xl font-black text-on-surface">
            {startingPrice > 0 ? `From ₹${startingPrice.toLocaleString('en-IN')}` : 'Price on selection'}
          </p>
          <button className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary transition hover:bg-primary/90">
            <ShoppingCart className="h-4 w-4" /> Add to cart
          </button>
        </div>
      </section>
    </div>
  );
};

export default CustomerProductDetailsPage;
