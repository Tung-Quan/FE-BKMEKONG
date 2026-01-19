import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      login: (token: string) =>
        set(() => ({ isAuthenticated: true, token })),
      setToken: (token: string) =>
        set(() => ({ token })),
      logout: () =>
        set(() => ({ isAuthenticated: false, token: null })),
    }),
    {
      name: 'auth-storage', // unique name
    }
  )
);