import type { Customer, Order, UserAddress } from '../types';
import api from './api';
import type { ApiEnvelope, Pagination } from './contracts';
import { orderService } from './order.service';

type CustomerApi = Partial<Customer> & {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  createdById?: string | null;
};

export interface CustomerResponse {
  customers: Customer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomerLookupResponse {
  id: string;
  name: string;
  phoneNumber: string;
}

export type CustomerDetailsResponse = Omit<Customer, 'orders'> & { orders: Order[] };

const normalizeCustomer = (
  customer: CustomerApi,
  orders: Customer['orders'] = [],
  addresses: UserAddress[] = [],
): Customer => ({
  id: String(customer.id ?? ''),
  role: customer.role ?? 'CUSTOMER',
  name: String(customer.name ?? ''),
  email: String(customer.email ?? ''),
  phoneNumber: String(customer.phoneNumber ?? ''),
  isPhoneNumberVerified: customer.isPhoneNumberVerified ?? false,
  addressLine: customer.addressLine ?? null,
  postalCode: customer.postalCode ?? null,
  cityName: customer.city ?? customer.cityName ?? null,
  stateName: customer.state ?? customer.stateName ?? null,
  countryName: customer.country ?? customer.countryName ?? null,
  addresses,
  isEmailVerified: customer.isEmailVerified ?? false,
  isActive: customer.isActive ?? true,
  createdBy: customer.createdById ?? customer.createdBy ?? null,
  createdAt: String(customer.createdAt ?? new Date().toISOString()),
  updatedAt: String(customer.updatedAt ?? new Date().toISOString()),
  orders,
  customerIncidents: customer.customerIncidents ?? [],
});

type OrderSummaryApi = {
  id: string;
  userId: string;
  status: string;
  totalPrice: string | number;
  createdAt: string;
};

export const customerService = {
  getCustomerById: async (id: string): Promise<CustomerDetailsResponse> => {
    const [userResponse, orderResponse] = await Promise.all([
      api.get<ApiEnvelope<{ user: CustomerApi }>>(`/users/${id}`),
      orderService.getOrders({ userId: id, page: 1, limit: 100 }),
    ]);
    return {
      ...normalizeCustomer(userResponse.data.data.user, orderResponse.orders),
      orders: orderResponse.orders,
    };
  },

  lookupCustomerByPhoneNumber: async (phoneNumber: string): Promise<CustomerLookupResponse> => {
    const normalizedInput = phoneNumber.replace(/\D/g, '');
    const requests = [
      api.get<ApiEnvelope<{ users: CustomerApi[]; pagination: Pagination }>>('/users', {
        params: { search: normalizedInput || phoneNumber, page: 1, limit: 50 },
      }),
      api.get<ApiEnvelope<{ users: CustomerApi[]; pagination: Pagination }>>('/users', {
        params: { page: 1, limit: 100 },
      }),
    ];
    const responses = await Promise.all(requests);
    const users = responses.flatMap((response) => response.data.data.users);
    const customer = users.find((user) => {
      const normalizedUserPhone = String(user.phoneNumber ?? '').replace(/\D/g, '');
      return normalizedUserPhone === normalizedInput || String(user.phoneNumber ?? '') === phoneNumber;
    });
    if (!customer?.id) throw new Error('Customer not found');
    return {
      id: customer.id,
      name: String(customer.name ?? ''),
      phoneNumber: String(customer.phoneNumber ?? ''),
    };
  },

  getCustomers: async (page = 1, limit = 10): Promise<CustomerResponse> => {
    const [userResponse, orderResponse] = await Promise.all([
      api.get<ApiEnvelope<{ users: CustomerApi[]; pagination: Pagination }>>('/users', {
        params: { page, limit },
      }),
      api.get<ApiEnvelope<{ orders: OrderSummaryApi[]; pagination: Pagination }>>('/orders', {
        params: { page: 1, limit: 100 },
      }),
    ]);
    const customers = userResponse.data.data.users.map((customer) => {
      const orders = orderResponse.data.data.orders
        .filter((order) => order.userId === customer.id)
        .map((order) => ({
          id: order.id,
          orderStatus: order.status,
          totalAmount: Number(order.totalPrice),
          createdAt: order.createdAt,
        }));
      return normalizeCustomer(customer, orders);
    });
    return { customers, ...userResponse.data.data.pagination };
  },
};

export default customerService;
