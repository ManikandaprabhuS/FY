import React from 'react';
import { Outlet } from 'react-router-dom';
import CustomerNavbar from '../features/customer/components/CustomerNavbar';
import Footer from '../features/customer/components/Footer';

const CustomerLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-on-background">
      <CustomerNavbar />

      <main>
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default CustomerLayout;
