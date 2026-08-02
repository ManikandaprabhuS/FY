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

## Completed Modules and Features

- Authentication
- User management
- Employee management
- Product management
- Cart
- Orders
- Wishlist analytics
- Notifications

## Key Pages

- Overview
- Products
- Orders
- Customers
- Employees
- Notifications
- Wishlists
- Profile

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
