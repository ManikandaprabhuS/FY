# FrameYaad Admin

This is the admin dashboard for the FrameYaad backend. It is a React + TypeScript + Vite application that talks directly to the backend APIs and keeps the admin workflow focused on store operations.

## Backend/API Notes

- The dashboard uses the FrameYaad backend API at `VITE_API_URL` or `http://localhost:5000/api/v1`.
- Authentication is cookie/token based through the existing backend auth flow.
- Global search in the top bar now routes by intent:
  - `FY-2345` style order numbers go to the Orders section and filter to that order.
  - Phone numbers go to the matching customer profile.
- Order numbers are now generated in the simpler `FY-2345` format.

## Completed UI and UX Work

- Overview KPI cards use white icon tiles.
- Order fulfillment indicators use colored status dots.
- Loading states now use a clean spinner instead of the old GIF background.
- Success and error toasts display in the top-right corner.
- Heavy admin pages were cleaned up to avoid duplicate fetches and reduce navigation lag.
- Wishlist analytics section added for Admin and Employee access.
- Coupon management is available to Admins under Marketing > Coupons. It includes a searchable, filterable paginated list, four-step create/edit wizard, details view, status activation/deactivation, and deletion.

## Completed Modules and Features

- Authentication
- User management
- Employee management
- Product management
- Cart
- Orders
- Wishlist analytics
- Notifications
- Coupons (Admin only)
- Product Discounts (Admin only, variant-based)

## Key Pages

- Overview
- Products
- Orders
- Customers
- Employees
- Notifications
- Wishlists
- Marketing > Coupons
- Profile

## Coupon Frontend

- Routes: `/admin/marketing/coupons`, `/admin/marketing/coupons/new`, `/admin/marketing/coupons/:id`, and `/admin/marketing/coupons/:id/edit`.
- Reusable API service, Zustand store, wizard form, status badge, loading skeleton, responsive table, and details cards were added under `src/services`, `src/store`, `src/hooks`, and `src/pages/marketing/coupon`.
- All create, read, update, status, and delete actions use the existing backend coupon API. Client-side required-field checks, loading states, empty/error handling, and success/error toasts are included.
- Product Discount, checkout, and coupon application logic are intentionally out of scope.

## Product Discount Frontend

- Added Admin-only Product Discounts under Marketing, directly below Coupons.
- Routes: `/admin/marketing/product-discounts`, `/admin/marketing/product-discounts/new`, `/admin/marketing/product-discounts/:id`, and `/admin/marketing/product-discounts/:id/edit`.
- Added API service, Zustand store, hook, responsive assignment table, loading skeleton, search, pagination, assign wizard, review step, detail view, edit expiry, and assignment deletion.
- Assignments are always made to a Product Variant and use the existing `/product-discounts` backend APIs. Product, Coupon, and Product CRUD remain unchanged.

## Folder Structure

```text
src/
├── assets/
├── components/
├── features/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
├── store/
├── types/
└── utils/
```

## Environment Variables

Create a `.env` file in the frontend root if needed:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

## Installation

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- The dashboard is designed to stay thin and rely on backend APIs for business logic.
- Search and navigation are intentionally role-aware for faster admin workflows.

## Recent Fixes and Completed Work

- Products use backend pagination (10 products per page) with server-side search and Active/Draft filtering.
- Orders use backend pagination (5 orders per page) with responsive status/search/date filtering.
- Customers use backend pagination (8 customers per page).
- Product, order, and customer exports download escaped CSV files with success/error toasts.
- Customer exports fetch full order details so product/order-item fields are included.
- Global search routes `FY-####` order numbers to Orders and phone numbers to the matching customer profile.
- Product add/edit supports multiple variants and image persistence through the existing APIs.
- Removed duplicate fetches and unnecessary render delays from product, order, notification, and employee pages.
- Shared toasts now use green success styling/check icons and red error styling/icons.
