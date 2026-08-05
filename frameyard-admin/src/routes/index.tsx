import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../layouts/ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import AdminOnlyRoute from '../layouts/AdminOnlyRoute';
import CustomerLayout from '../layouts/CustomerLayout';
import {
  CartPage,
  CheckoutPage,
  BookAppointmentPage,
  ContactUsPage,
  CustomerHomePage,
  CustomerOrdersPage,
  CustomerProductDetailsPage,
  CustomerProductsPage,
  CustomerProfilePage,
} from '../features/customer';
import {
  CustomerDetailsPage,
  CustomersPage,
  EmployeesPage,
  LoginPage,
  NotificationsPage,
  OrdersPage,
  OverviewPage,
  ProductDetailsPage,
  ProductsPage,
  ProfilePage,
  SettingsPage,
  WishlistAnalyticsPage,
} from '../features/admin';
import { CouponsPage, CouponWizard, CouponDetails } from '../pages/marketing/coupon/CouponPages';
import { ProductDiscountsPage, ProductDiscountWizard, ProductDiscountDetails } from '../pages/marketing/product-discount/ProductDiscountPages';

export const router = createBrowserRouter([
  {
    element: <CustomerLayout />,
    children: [
      { path: '/', element: <CustomerHomePage /> },
      { path: '/products', element: <CustomerProductsPage /> },
      { path: '/product/:slug', element: <CustomerProductDetailsPage /> },
      { path: '/cart', element: <CartPage /> },
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/profile', element: <CustomerProfilePage /> },
      { path: '/orders', element: <CustomerOrdersPage /> },
      { path: '/book-appointment', element: <BookAppointmentPage /> },
      { path: '/contact-us', element: <ContactUsPage /> },
    ],
  },
  {path: '/fyadminlogin',element: <LoginPage />,},
  {path: '/login',element: <Navigate to="/fyadminlogin" replace />,},
  {path: '/admin',element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            path: '',
            element: <Navigate to="overview" replace />,
          },
          {
            path: 'overview',
            element: <OverviewPage />,
          },
          {
            path: 'products',
            element: <ProductsPage />,
          },
          {
            path: 'products/:id',
            element: <ProductDetailsPage />,
          },
          {
            path: 'products/new',
            element: <ProductDetailsPage />,
          },
          {
            path: 'orders',
            element: <OrdersPage />,
          },
          {
            path: 'wishlists',
            element: <WishlistAnalyticsPage />,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
          },
          {
            path: 'customers',
            element: <CustomersPage />,
          },
          {
            path: 'customers/:id',
            element: <CustomerDetailsPage />,
          },
          {
            element: <AdminOnlyRoute />,
            children: [
              {
                path: 'employees',
                element: <EmployeesPage />,
              },
              { path: 'marketing/coupons', element: <CouponsPage /> },
              { path: 'marketing/coupons/new', element: <CouponWizard /> },
              { path: 'marketing/coupons/:id', element: <CouponDetails /> },
              { path: 'marketing/coupons/:id/edit', element: <CouponWizard /> },
              { path: 'marketing/product-discounts', element: <ProductDiscountsPage /> },
              { path: 'marketing/product-discounts/new', element: <ProductDiscountWizard /> },
              { path: 'marketing/product-discounts/:id', element: <ProductDiscountDetails /> },
              { path: 'marketing/product-discounts/:id/edit', element: <ProductDiscountWizard /> },
            ],
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
        ],
      },
    ],
  },
  {path: '*', element: <Navigate to="/" replace />,},
]);

export default router;
