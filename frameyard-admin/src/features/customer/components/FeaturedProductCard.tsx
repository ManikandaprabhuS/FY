import React from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Product } from '../../../types';
import heroFallback from '../../../assets/hero.png';

export interface FeaturedProductPricing {
  currentPrice: number;
  originalPrice: number;
  discount: number;
}

interface FeaturedProductCardProps {
  product: Product;
  pricing: FeaturedProductPricing;
  isActive: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSelect?: () => void;
}

const FeaturedProductCard: React.FC<FeaturedProductCardProps> = ({
  product,
  pricing,
  isActive,
  className = '',
  style,
  onSelect,
}) => {
  const imageUrl = product.images?.[0]?.imageUrl || heroFallback;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      }}
      className={`group relative shrink-0 cursor-pointer overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_18px_50px_rgba(0,0,0,0.10)] transition-[transform,box-shadow,border-color] duration-500 ease-in-out will-change-transform hover:-translate-y-2 hover:shadow-[0_24px_70px_rgba(0,0,0,0.16)] focus:outline-none focus:ring-4 focus:ring-black/15 ${
        isActive
          ? 'border-[6px] border-black shadow-[0_30px_90px_rgba(0,0,0,0.24)]'
          : 'border border-black/10'
      } ${className}`}
      style={style}
      aria-label={`Select ${product.name}`}
      aria-current={isActive ? 'true' : undefined}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-black/15"
        aria-label={`Add ${product.name} to wishlist`}
        onClick={(event) => event.stopPropagation()}
      >
        <Heart className="h-7 w-7" aria-hidden="true" />
      </button>

      <div className="aspect-[4/3] bg-[#f4f0ea]">
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      <div className="relative z-10 -mt-4 rounded-t-[1.1rem] bg-white px-5 pb-5 pt-4 shadow-[0_-10px_22px_rgba(0,0,0,0.04)]">
        <h3 className="truncate text-lg font-black text-black">{product.name}</h3>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xl font-black text-black">
              {pricing.currentPrice > 0 ? `₹${pricing.currentPrice.toLocaleString('en-IN')}` : '₹0'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-black/45 line-through">
                ₹{pricing.originalPrice.toLocaleString('en-IN')}
              </span>
              {pricing.discount > 0 && (
                <span className="rounded-lg bg-[#f7dfc8] px-2.5 py-1.5 text-xs font-black text-[#c55f12]">
                  {pricing.discount}% OFF
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-black/20 transition hover:bg-black hover:text-white focus:outline-none focus:ring-4 focus:ring-black/15 ${
              isActive ? 'bg-black text-white' : 'bg-white text-black'
            }`}
            aria-label={`Add ${product.name} to cart`}
            onClick={(event) => event.stopPropagation()}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default FeaturedProductCard;
