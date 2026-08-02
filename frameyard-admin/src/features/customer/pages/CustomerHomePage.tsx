import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight } from 'lucide-react';
import useProducts from '../../../hooks/useProducts';
import heroFallback from '../../../assets/hero.png';
import { Product } from '../../../types';
import { FeaturedProductsCarousel, HowItWorksSection } from '../components';

const CustomerHomePage: React.FC = () => {
  const { products, fetchProducts } = useProducts(true);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const featuredProducts = products.filter((product) => product.isActive).slice(0, 5);
  const heroCards: Array<Product | null> =
    featuredProducts.length > 0 ? featuredProducts : Array.from({ length: 5 }, () => null);
  const heroCardArcClasses = [
    'lg:translate-y-9 lg:-rotate-[4deg]',
    'lg:translate-y-3 lg:-rotate-[2deg]',
    'lg:-translate-y-3 lg:rotate-0',
    'lg:translate-y-3 lg:rotate-[2deg]',
    'lg:translate-y-9 lg:rotate-[4deg]',
  ];

  return (
    <div className="bg-white text-black">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Link
          to="/products"
          className="mb-8 inline-flex items-center gap-4 rounded-md bg-black px-8 py-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:bg-black/90"
        >
          Shop All <ArrowRight className="h-4 w-4" />
        </Link>

        <div className="w-full overflow-x-auto overflow-y-visible px-4 pb-14 pt-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 lg:overflow-visible lg:px-0">
          <div className="mx-auto flex min-w-max items-end justify-start gap-4 sm:gap-5 lg:min-w-0 lg:max-w-7xl lg:justify-center lg:gap-6">
            {heroCards.map((product, index) => {
              const imageUrl = product?.images?.[0]?.imageUrl;
              const name = product?.name || `Frame ${index + 1}`;

              return (
                <Link
                  key={product?.id || index}
                  to={product?.id ? `/product/${product.id}` : '/products'}
                  className={`group w-[168px] shrink-0 overflow-hidden rounded-2xl bg-[#f4f0ea] shadow-[0_18px_45px_rgba(0,0,0,0.12)] transition duration-500 hover:-translate-y-2 hover:shadow-[0_24px_60px_rgba(0,0,0,0.16)] sm:w-[210px] md:w-[240px] lg:w-1/5 lg:max-w-[235px] ${
                    heroCardArcClasses[index] || ''
                  }`}
                >
                  <img
                    src={imageUrl || heroFallback}
                    alt={name}
                    className="aspect-[3/4] h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </Link>
              );
            })}
          </div>
        </div>

        <a
          href="#featured-products"
          className="mt-12 inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/20 text-black transition hover:bg-black hover:text-white"
          aria-label="Scroll to featured products"
        >
          <ArrowDown className="h-4 w-4" />
        </a>
      </section>

      <FeaturedProductsCarousel products={products} />
      <HowItWorksSection />
    </div>
  );
};

export default CustomerHomePage;
