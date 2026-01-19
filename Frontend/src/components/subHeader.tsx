import { useEffect, useState } from 'react';
import { Link } from "@tanstack/react-router";
import homePng from '@assets/home.png';

// Tách các link nav ra mảng riêng để dễ quản lý
const navLinks = [
  { to: '/about', label: 'GIỚI THIỆU', width: 'w-[160px]' },
  { to: '/papers', label: 'DIỄN BIẾN XNM', width: 'w-[200px]' },
  { to: '/order-guidelines', label: 'TIN TỨC', width: 'w-[200px]' },
  { to: '/contact', label: 'TƯ LIỆU & KIẾN THỨC', width: 'w-[240px]' }
];

// --- CÁC ICON (Không thay đổi) ---

// Icon Hamburger (3 gạch)
function HamburgerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// Icon Kính lúp (Search)
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="6" strokeWidth="2" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Icon Đóng (X)
function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// --- Component Menu Di Động (Không thay đổi) ---
function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <div 
      className={`
        lg:hidden absolute top-full left-0 right-0 bg-[#005DCE] text-white
        shadow-lg overflow-hidden transition-all duration-300 ease-in-out z-[999]
        ${isOpen ? 'max-h-96' : 'max-h-0'} 
      `}
    >
      <nav className="flex flex-col gap-1 p-4">
        <Link 
          to='/' 
          onClick={onClose} 
          className='text-lg p-3 rounded hover:bg-white/10' 
          style={{ fontFamily: 'UTM Black' }}
        >
          TRANG CHỦ
        </Link>
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={onClose}
            className='text-lg p-3 rounded hover:bg-white/10'
            style={{ fontFamily: 'UTM Black' }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

// --- Component Subheader chính (Cập nhật) ---
function Subheader() {
  const [scrollingDown, setScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 50) {
        setScrollingDown(true);
      } else if (currentScrollY <= 0) {
        setScrollingDown(false);
      }
      setLastScrollY(currentScrollY);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // 1024px là breakpoint 'lg'
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <div className=' w-full mb-4 sticky top-0 z-[9999] bg-[#005DCE] text-white'>
        <div className='max-w-[1280px] mx-auto px-4 flex items-center justify-between gap-4 h-16'>
          
          {/* === LEFT SIDE (Logo & Nav) === */}
          {/* THAY ĐỔI: Thêm `flex-shrink-0` để bên phải có thể `flex-1` */}
          <div className={`flex flex-shrink-0 items-center gap-4 ${isSearchOpen ? 'hidden lg:flex' : 'flex'}`}>
            
            {/* Nút Home (Desktop) */}
            <div className='hidden lg:flex items-center rounded-full bg-white m-2'>
              <Link
                to='/'
                className='inline-flex items-center justify-center w-12 h-12'
                style={{
                  background: '#ffffff',
                  borderRadius: '9999px',
                  boxShadow: 'inset 0 4px 10px rgba(0,93,206,0.22), inset 0 -2px 6px rgba(0,93,206,0.10)'
                }}
              >
                <img src={homePng} alt='home icon' className='w-6 h-6 object-contain' />
              </Link>
            </div>

            {/* Nav Links (Desktop) */}
            <div className='hidden lg:flex gap-0'>
              {navLinks.map((link) => (
                <div
                  key={link.to}
                  className='my-1 flex items-center'
                >
                  <Link to={link.to} className={`text-white text-center ${link.width}`} style={{ fontFamily: 'UTM Black' }}>
                    {link.label}
                  </Link>
                </div>
              ))}
            </div>

            {/* Hamburger Button (Mobile) */}
            <div className="lg:hidden">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                  setIsSearchOpen(false);
                }}
                aria-label={isMobileMenuOpen ? "Đóng menu" : "Mở menu"}
                className="w-8 h-8 text-white"
              >
                {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
              </button>
            </div>
          </div>

          {/* === RIGHT SIDE (Search & Sticky Circles) === */}
          {/* THAY ĐỔI: Thêm `flex-1` để nó chiếm hết không gian còn lại */}
          <div className={`flex items-center justify-end flex-1`}>
            <div className="flex items-center">
              
              {scrollingDown ? (
                // === STICKY CIRCLES (Khi cuộn xuống) ===
                <div className="flex items-center gap-3 transition-opacity duration-300">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setScrollingDown(false)}
                      aria-label={`Option ${i + 1}`}
                      className="w-8 h-8 rounded-full bg-[#0060C9] flex items-center justify-center shadow-md hover:opacity-80 transition-opacity"
                    />
                  ))}
                </div>
              ) : (
                // === SEARCH BAR (Khi ở đầu trang) ===
                <div className="relative h-12 transition-all duration-300 flex-1">
                  
                  {/* Search Desktop (Luôn hiện) */}
                  {/* THAY ĐỔI: Thêm `w-full h-full` cho div cha */}
                  <div className="hidden lg:block w-full h-full"> 
                    {/* THAY ĐỔI: Thêm `z-10` để icon nổi lên trên input */}
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-md z-10">
                      <SearchIcon className="w-5 h-5 text-[#0060C9]" />
                    </div>
                    <input
                      type="search"
                      placeholder="Tìm kiếm"
                      aria-label="Tìm kiếm"
                      // THAY ĐỔI: Đổi `w-[420px]` thành `w-full`
                      className="pl-14 pr-4 h-full w-full bg-[#EAF6FF] text-[#0060C9] rounded-full border-none focus:outline-none shadow-inner"
                    />
                  </div>

                  {/* Search Mobile (Logic Thu/Mở - Không thay đổi) */}
                  <div className="lg:hidden h-full">
                    {isSearchOpen ? (
                      <div className="relative w-full h-full">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-md z-10">
                          <SearchIcon className="w-5 h-5 text-[#0060C9]" />
                        </div>
                        <input
                          type="search"
                          placeholder="Tìm kiếm"
                          aria-label="Tìm kiếm"
                          autoFocus
                          className="pl-14 pr-12 h-full w-full bg-[#EAF6FF] text-[#0060C9] rounded-full border-none focus:outline-none shadow-inner"
                        />
                        <button
                          onClick={() => setIsSearchOpen(false)}
                          aria-label="Đóng tìm kiếm"
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 text-[#0060C9] z-10"
                        >
                          <CloseIcon />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setIsSearchOpen(true);
                          setIsMobileMenuOpen(false);
                        }}
                        aria-label="Mở tìm kiếm"
                        className="w-9 h-9 flex items-center justify-center"
                      >
                        <SearchIcon className="w-6 h-6 text-white" />
                      </button>
                    )}
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>

        {/* Render Mobile Menu (Dropdown) */}
        <MobileMenu 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
        />
      </div>
    </>
  );
}

export default Subheader;