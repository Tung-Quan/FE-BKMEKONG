import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_layout/')({
  component: DashboardHome,
});

function DashboardHome() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
      <p className="mt-2 text-gray-600">
        Đây là nội dung của trang chủ, được hiển thị bên trong Outlet của Layout.
      </p>
      
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Ví dụ thẻ Card */}
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Thống kê {item}</h3>
            <p className="text-3xl font-bold text-indigo-600 mt-2">1,234</p>
          </div>
        ))}
      </div>
    </div>
  );
}