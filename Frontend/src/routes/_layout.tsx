import { useAppStore } from '@stores/useAppStore';
import { Link, Outlet, createFileRoute } from '@tanstack/react-router';

import Header from '@/components/header';
import Subheader from '@/components/subHeader';
import useLockBodyScroll from '@/hooks/use-lock-body-scroll';

import PageFooter from './_layout/-components/pageFooter';

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
});

function LayoutComponent() {
  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  useLockBodyScroll(isSidebarOpen);
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex w-full bg-gray-50 text-gray-900">
        <>
          {/* Overlay: fades in/out, non-interactive when hidden */}
          <div
            className={`fixed inset-0 z-[1000000] bg-black backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'pointer-events-auto opacity-40' : 'pointer-events-none opacity-0'}`}
            onClick={toggleSidebar}
            aria-hidden="true"
          />

          {/* Sidebar: slides in/out from left */}
          <aside
            className={`fixed left-0 top-0 z-[1000001] h-screen w-80 transform overflow-auto bg-white shadow-lg transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                onClick={toggleSidebar}
                aria-label="Close sidebar"
                className="px-2 py-1 text-xl"
              >
                ×
              </button>
            </div>

            <nav className="p-4">
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/"
                    onClick={toggleSidebar}
                    className="block text-sm"
                  >
                    Trang chủ
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>
        </>
        {/* Main Content Area */}
        <div className="min-h-screen w-full flex-none transition-colors duration-300">
          {/* Header */}
          <Header />
          <Subheader />
          {/* Nội dung trang con sẽ hiển thị ở đây */}
          <Outlet />
        </div>
      </div>
      <PageFooter />
    </div>
  );
}
