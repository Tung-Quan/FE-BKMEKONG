import demo_userBanner from '@assets/demo_userBanner.png';

type UserBannerProps = {
  userName?: string;
  unitInfo?: string;
  avatarSrc?: string;
};
const UserBanner = ({ userName, unitInfo, avatarSrc }: UserBannerProps) => {
  return (
    <div className="mx-auto my-3 flex w-full max-w-sm items-center rounded-full border-2 border-[#0056b3] bg-white p-1.5 pr-3 font-sans shadow-sm">
      {/* Khối chứa thông tin văn bản */}
      <div className="ml-2 mr-3 flex-grow text-[#0056b3]">
        <h3 className="text-lg font-semibold uppercase leading-tight">
          {/* Tên người dùng */}
          {userName || 'NGUYỄN VĂN A'}
        </h3>
        <p className="mt-0.5 text-xs">
          {/* Thông tin đơn vị/ID */}
          {unitInfo || 'Đơn vị B - 2453445'}
        </p>
      </div>

      <div className="flex-shrink-0">
        <img
          src={avatarSrc || demo_userBanner}
          alt="User Avatar"
          className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm"
        />
      </div>
    </div>
  );
};

export default UserBanner;
