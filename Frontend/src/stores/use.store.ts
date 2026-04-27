import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { User } from '../types';

type UserStore = {
  user: User | null;
  setUser: (user: User | null) => void;
  lastUpdatedDate: string;
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => {
        set(() => ({ user: user }));
      },
      lastUpdatedDate: '',
    }),
    {
      name: 'userStore',
    }
  )
);
