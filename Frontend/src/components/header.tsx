import settingPng from '@assets/setting.png';
import tien_giang_icon from '@assets/tien_giang_icon.webp';
import { useAppStore } from '@stores/useAppStore';
import { Link } from '@tanstack/react-router';

import UserBanner from './userBanner';

function Header() {
  const pathname = window.location.pathname;
  const isHomePage = pathname === '/';
  const isWorkingPage = pathname === '/working';
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <div className="z-50 border-b backdrop-blur-lg">
      <div className="flex min-h-[3.5rem] w-11/12 justify-between p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            {/* Hamburger menu for toggling sidebar */}
            <button
              className="ml-4 mt-3 inline-block rounded-md p-2 text-xl hover:bg-gray-200"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
          </div>
          {/* LOGO */}
          <div className="flex-1 lg:flex-none">
            <Link to="/" className="transition-opacity hover:opacity-80">
              <div className="flex items-center gap-2">
                {/* <ShoppingCartIcon className="size-9 text-primary" /> */}
                <img
                  src={tien_giang_icon}
                  alt="Logo"
                  className="h-10 w-10 object-contain"
                />
                <div>
                  {isHomePage && (
                    <span className="font-mono text-xl font-semibold tracking-widest text-[#0060C9]">
                      BK MÊKÔNG
                    </span>
                  )}
                  {isWorkingPage && (
                    <span className="font-mono text-xl font-semibold tracking-widest text-[#069843]">
                      CỔNG ĐIỆN TỬ CÔNG TY ABCD
                    </span>
                  )}

                  <div
                    // {/* CHANGED: Thêm 'hidden md:block' để ẩn mô tả trên màn hình nhỏ */}
                    className={`max-w-[480px] text-xs opacity-70 ${isHomePage ? 'text-[#0060C9]' : isWorkingPage ? 'text-[#069843]' : 'text-[#003264]'} font-SVNArial hidden md:block`}
                  >
                    <span>
                      Dự án web được thực hiện bởi sinh viên Trường Đại học Bách
                      Khoa TP.HCM (HCMUT), nhằm theo dõi và phân tích tình hình
                      xâm nhập mặn
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-4">
          {isHomePage && (
            <div className="indicator flex flex-col items-center">
              {/* CHANGED: Thêm 'hidden md:block' để ẩn text trên màn hình nhỏ */}
              <div className="hidden rounded-full p-2 text-[#069843] transition-colors hover:bg-white md:block">
                ĐƠN VỊ TÀI TRỢ VÀ HỢP TÁC
              </div>

              {/* separated sponsor circles placed under the label */}
              {/* CHANGED: Điều chỉnh margin và gap cho di động */}
              <div
                className="flex justify-between gap-2 md:mt-2 md:gap-4"
                aria-hidden="true"
              >
                <span className="inline-block h-7 w-7 rounded-full bg-[#069843]" />
                <span className="inline-block h-7 w-7 rounded-full bg-[#069843]" />
                <span className="inline-block h-7 w-7 rounded-full bg-[#069843]" />
                <span className="inline-block h-7 w-7 rounded-full bg-[#069843]" />
              </div>
            </div>
          )}

          {isWorkingPage && (
            <div className="indicator relative flex items-center justify-between">
              {/* CHANGED: Giảm gap trên di động */}
              <div
                className="flex items-center gap-2 md:gap-3"
                aria-hidden="true"
              >
                {/* CHANGED: Thu nhỏ icon '?' trên di động */}
                <span className="inline-block h-10 w-10 rounded-full border-2 border-solid border-[#0060C9] bg-white md:h-14 md:w-14">
                  <Link
                    to="/"
                    className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#0060C9] md:text-4xl"
                  >
                    ?
                  </Link>
                </span>

                {/* CHANGED: Thu nhỏ icon 'setting' trên di động */}
                <span className="inline-block h-10 w-10 rounded-full border-2 border-solid border-[#0060C9] bg-white md:h-14 md:w-14">
                  <Link
                    to="/"
                    className="flex h-full w-full items-center justify-center text-4xl"
                  >
                    <img
                      src={settingPng}
                      alt="home icon"
                      className="h-6 w-6 object-contain md:h-8 md:w-8"
                    />
                  </Link>
                </span>
              </div>

              {/* right: user banner */}
              {/* CHANGED: Giảm margin trái trên di động */}
              <div className="ml-2 flex-shrink-0 md:ml-4">
                <UserBanner />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default Header;
