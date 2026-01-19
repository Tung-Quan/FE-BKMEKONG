const PageFooter = () => {
  return (
    <footer className="bg-[#0056b3] py-5 px-3 flex justify-center items-center font-sans">

      <div className="shadow-md rounded-xl overflow-hidden w-full max-w-6xl">

        <div className="bg-white py-6 px-6 md:px-10 text-center text-[#005DCE]">
          {/* Tên công ty */}
          <h3 className="text-lg md:text-xl font-bold">
            CÔNG TY TNHH MỘT THÀNH VIÊN KHAI THÁC CÔNG TRÌNH THỦY LỢI TIỀN GIANG
          </h3>
        </div>

        <div className="bg-[#e6f7ff] pb-6 px-6 md:px-10 text-center text-[#004080]">
          <hr className="w-3/5 h-px mx-auto bg-[#004080] border-0 mb-4" />

          {/* Khối thông tin liên hệ */}
          <div className="text-sm md:text-base leading-relaxed">

            {/* Địa chỉ */}
            <p className="mb-2.5">
              Địa chỉ: 65/4 Trần Hưng Đạo - Phường 06 - TP. Mỹ Tho - Tỉnh Tiền Giang
            </p>

            {/* Thông tin SĐT, Fax, Email */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
              <span className="whitespace-nowrap">Điện thoại: 073.3870221</span>
              <span className="whitespace-nowrap">Fax: 073.3871388</span>
              <span className="whitespace-nowrap">Email: ktcttltg@yahoo.com.vn</span>
            </div>
          </div>

        </div>

      </div>
    </footer>
  );
};

export default PageFooter;