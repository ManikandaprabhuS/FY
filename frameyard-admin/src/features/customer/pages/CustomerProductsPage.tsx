import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import useProducts from '../../../hooks/useProducts';

const CustomerProductsPage: React.FC = () => {
  const { products, loading, fetchProducts } = useProducts(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.isActive &&
          (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.material.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [products, searchTerm]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Shop</p>
          <h1 className="mt-2 text-3xl font-black text-on-surface">Products</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Browse available FrameYaad products.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search products..."
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">
          Loading products...
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <Link key={product.id} to={`/product/${product.id}`} className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest transition hover:-translate-y-1 hover:shadow-lg">
              <div className="aspect-[4/3] bg-surface-container">
                {product.images?.[0]?.imageUrl ? (
                  <img src={product.images[0].imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">No image</div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-bold text-on-surface">{product.name}</h2>
                <p className="mt-1 text-sm text-on-surface-variant">{product.material}</p>
                <p className="mt-3 text-sm font-bold text-primary">View details</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerProductsPage;
