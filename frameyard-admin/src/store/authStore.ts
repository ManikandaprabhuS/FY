import { create } from 'zustand';
import { User } from '../types';
import { authService } from '../services/auth.service';

const AUTH_TOKEN_KEY = 'fy_auth_token';

const getStoredAuthToken = () => {
  const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const legacyLocalToken = localStorage.getItem(AUTH_TOKEN_KEY);

  if (!sessionToken && legacyLocalToken) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, legacyLocalToken);
  }

  if (legacyLocalToken) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  return sessionToken || legacyLocalToken;
};

const setStoredAuthToken = (token: string) => {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

const clearStoredAuthToken = () => {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,

 login: async (email, password) => {
  set({
    loading: true,
    error: null,
  });

  try {
    const response = await authService.login(
        email,
        password
      );

const user = response.user;
const token = null;

if (user?.role === 'CUSTOMER') {
  clearStoredAuthToken();
  set({
    user: null,
    token: null,
    isAuthenticated: false,
    error: 'Access Denied: customers cannot access the admin dashboard.',
    loading: false,
  });
  return false;
}

if (token) {
  setStoredAuthToken(token);
}

    set({
      user,
      token,
      isAuthenticated: true,
      loading: false,
    });
    return true;
  } catch (err: any) {
    const errMsg =
      err.response?.data?.message ||
      "Login failed";
    set({
      error: errMsg,
      loading: false,
    });
    return false;
  }
},

  logout: async () => {
  set({ loading: true });

  try {
    await authService.logout();

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });

  } catch {

    clearStoredAuthToken();

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });
  }
},
  checkAuth: async () => {

  set({
    loading: true,
  });
  try {
    const user =await authService.me();
   const token = getStoredAuthToken();

   set({
  user,
  token,
  isAuthenticated: true,
  loading: false,
});

  } catch (err) {

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });
    clearStoredAuthToken();
  }
},

  updateProfile: async (profileData) => {
    set({ loading: true, error: null });
    try {
      const updatedUser = await authService.updateProfile(profileData);
      set({ user: updatedUser, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Update failed', loading: false });
      return false;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    set({ loading: true, error: null });
    try {
      await authService.changePassword(currentPassword, newPassword);
      clearStoredAuthToken();
      set({ user: null, token: null, isAuthenticated: false, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Password update failed', loading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
