# FrameYaad -- Master Project Specification

## 1. Project Requirements Document (PRD)

### Vision

FrameYaad is a premium custom photo frame e-commerce platform enabling
customers to upload photos, customize frames, preview products, place
orders, and track deliveries.

### Goals

-   Premium shopping experience
-   Responsive web application
-   Admin-managed catalog
-   Employee-assisted operations
-   Secure authentication
-   Scalable architecture

### User Roles

#### Customer

-   Register/Login
-   Manage profile & addresses
-   Browse products
-   Choose material & variant
-   Upload photo
-   Live preview
-   Wishlist
-   Cart
-   Place & track orders

#### Employee

-   Login
-   Manage products
-   Manage inventory
-   Process orders
-   Cannot create employees

#### Admin

-   Full system access
-   Employee management
-   Product management
-   Coupons
-   Orders
-   Notifications
-   Reports

------------------------------------------------------------------------

## 2. Technical Requirements

### Frontend

-   React
-   TypeScript
-   Vite
-   Zustand
-   React Router
-   Axios
-   Tailwind CSS

### Backend

-   Node.js
-   Express
-   TypeScript

### Database

-   Supabase PostgreSQL

### ORM

-   Prisma

### Authentication

-   Supabase Auth
-   JWT
-   HttpOnly Cookies

### Storage

-   Supabase Storage

### Deployment

-   Frontend: Netlify
-   Backend: Render
-   Database: Supabase

Architecture:

React → REST API → Express → Prisma → Supabase PostgreSQL

Business logic must remain only in the backend.

------------------------------------------------------------------------

## 3. Application Flow

Customer: Landing → Products → Product Details → Material → Variant →
Upload Image → Preview → Wishlist/Cart → Checkout → Order → Notification

Admin: Login → Dashboard → Products → Materials → Variants → Images →
Coupons → Employees → Customers → Orders → Notifications

------------------------------------------------------------------------

## 4. UI/UX

Theme: - Premium - Minimal - Black & White - Mobile First

Primary: #000000 Secondary: #FFFFFF

Guidelines: - Thin frontend - Backend-driven logic - Responsive -
Accessible - Consistent spacing - Skeleton loaders - Toast notifications

------------------------------------------------------------------------

## 5. Backend Schema

Core entities: - User - Address - Product - Material - Variant -
ProductImage - Wishlist - Cart - CartItem - Order - OrderItem - Coupon -
ProductDiscount - Notification - CustomerIncident

Relationship: User -\> Address User -\> Cart -\> CartItem User -\>
Orders -\> OrderItem Product -\> Material -\> Variant Material -\>
ProductImage Product -\> ProductDiscount Coupon -\> ProductDiscount

(Payment module intentionally excluded.)

------------------------------------------------------------------------

## 6. Implementation Plan

Phase 1 - Project setup - Authentication - RBAC

Phase 2 - ER Diagram - Prisma Schema - Backend Alignment

Phase 3 - Admin Dashboard - Products - Materials - Variants - Images -
Employees - Customers - Orders - Notifications

Phase 4 - Customer Website - Wishlist - Cart - Checkout - Order Tracking

Phase 5 - Payment Module

Phase 6 - Testing - Deployment

Development Principles: - Backend owns business logic. - Frontend is
presentation only. - Preserve API contracts. - Batch-based
implementation.
