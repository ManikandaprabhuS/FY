import { create } from 'zustand';
import { Customer } from '../types';
import { customerService } from '../services/customer.service';

interface CustomerState {
  customers: Customer[];
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  error: string | null;

  fetchCustomers: (
    page?: number,
    limit?: number
  ) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],
  page: 1,
  totalPages: 1,
  total: 0,
  loading: false,
  error: null,

  fetchCustomers: async (
    page = 1,
    limit = 10
  ) => {
    set({
      loading: true,
      error: null,
    });

    try {
      const data =
        await customerService.getCustomers(
          page,
          limit
        );

      set({
        customers: data.customers,
        page: data.page,
        totalPages: data.totalPages,
        total: data.total,
        loading: false,
      });

    } catch (err: any) {
      set({
        error:
          err.response?.data?.message ||
          'Failed to fetch customers',
        loading: false,
      });
    }
  },
}));

export default useCustomerStore;