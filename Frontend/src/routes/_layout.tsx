import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { useAppStore } from '../stores/useAppStore';

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
});

function LayoutComponent() {
  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r bg-white transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <div className="flex h-16 items-center justify-center border-b font-bold text-indigo-600">
          {isSidebarOpen ? 'MY APP' : 'MA'}
        </div>
        
        <nav className="flex-1 space-y-2 p-2">
          {/* Link Home */}
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 [&.active]:bg-indigo-100 [&.active]:text-indigo-700"
          >
            <div className="h-6 w-6 rounded bg-gray-200"></div> {/* Icon giả lập */}
            {isSidebarOpen && <span>Home</span>}
          </Link>

        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
          <button
            onClick={toggleSidebar}
            className="rounded p-2 hover:bg-gray-100"
          >
            <span className="font-bold">☰</span> {/* Nút Menu */}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">User Admin</span>
            <div className="h-8 w-8 rounded-full bg-indigo-500"></div>
          </div>
        </header>

        {/* Nội dung trang con sẽ hiển thị ở đây */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}