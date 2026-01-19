import demo_userBanner from '@assets/demo_userBanner.png';
type UserBannerProps = {
  userName?: string;
  unitInfo?: string;
  avatarSrc?: string;
};
const UserBanner = ({ userName, unitInfo, avatarSrc }: UserBannerProps) => {
  return (
    <div className="flex items-center bg-white border-2 border-[#0056b3] rounded-full p-1.5 pr-3 shadow-sm w-full max-w-sm mx-auto my-3 font-sans">
      
      {/* Khối chứa thông tin văn bản */}
      <div className="flex-grow text-[#0056b3] ml-2 mr-3"> 
        <h3 className="text-lg font-semibold uppercase leading-tight">
          {/* Tên người dùng */}
          {userName || "NGUYỄN VĂN A"} 
        </h3>
        <p className="text-xs mt-0.5">
          {/* Thông tin đơn vị/ID */}
          {unitInfo || "Đơn vị B - 2453445"} 
        </p>
      </div>

      <div className="flex-shrink-0">
        <img
          src={avatarSrc || demo_userBanner}
          alt="User Avatar"
          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
        />
      </div>
    </div>
  );
};

export default UserBanner;