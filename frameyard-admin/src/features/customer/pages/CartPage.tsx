import React from 'react';
import { Link } from 'react-router-dom';

const CartPage: React.FC = () => (
  <div className="rounded-[2rem] border border-outline-variant bg-surface-container-lowest p-8 text-center">
    <h1 className="text-3xl font-black text-on-surface">Your cart</h1>
    <p className="mt-2 text-sm text-on-surface-variant">Cart functionality is ready to connect to the existing order flow.</p>
    <Link to="/products" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary">
      Continue shopping
    </Link>
  </div>
);

export default CartPage;
