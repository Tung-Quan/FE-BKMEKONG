import { create } from 'zustand';

// 1. Định nghĩa Interface cho State và Actions
interface AppState {
  // State
  count: number;
  isSidebarOpen: boolean;

  // Actions
  increment: () => void;
  decrement: () => void;
  resetCount: () => void;
  toggleSidebar: () => void;
  setCount: (value: number) => void;
}

// 2. Tạo Store với TypeScript
export const useAppStore = create<AppState>((set) => ({
  // Giá trị khởi tạo
  count: 0,
  isSidebarOpen: false,

  // Định nghĩa các hàm actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  
  decrement: () => set((state) => ({ count: state.count - 1 })),
  
  resetCount: () => set({ count: 0 }),
  
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  setCount: (value) => set({ count: value }),
}));