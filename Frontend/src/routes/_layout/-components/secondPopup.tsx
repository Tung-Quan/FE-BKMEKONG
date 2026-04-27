import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';

import type { ApexOptions } from 'apexcharts';

import { getDefaultTargetDate, getPositionDayData } from '@/utils/backend-api';

// Hàm xác định màu theo mức độ mặn
const getSalinityColor = (salinity: string | number | null | undefined) => {
  const s = Number(salinity);
  if (isNaN(s)) return '#94A3B8'; // Màu xám cho unknown
  if (s >= 4.0) return '#DC2626'; // Đỏ (warning)
  if (s >= 1.0) return '#F97316'; // Cam (caution)
  return '#16A34A'; // Xanh (safe)
};

interface SecondPopupProps {
  onClose: () => void;
  activeMarker: {
    id: number | string;
    name?: string;
    salinity?: string | number | null;
    waterLevel?: string | number | null;
    timestamp?: string;
    rawData?: {
      datetime?: string;
    };
  } | null;
}

function SecondPopup({ onClose, activeMarker }: SecondPopupProps) {
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data khi component mount
  useEffect(() => {
    const loadData = async () => {
      if (!activeMarker || !activeMarker.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      // Sử dụng ngày hiện tại từ rawData hoặc default
      const targetDate = activeMarker.rawData?.datetime
        ? new Date(activeMarker.rawData.datetime)
        : getDefaultTargetDate();

      const data = await getPositionDayData(activeMarker.id, targetDate);

      // Process data: nhóm theo khung giờ 4h
      const processed = data
        .filter((d) => d.salinity !== null && d.salinity !== undefined)
        .map(
          (d: {
            datetime: string;
            salinity: string;
            water_level?: string;
          }) => ({
            time: new Date(d.datetime),
            salinity: parseFloat(d.salinity),
            waterLevel: parseFloat(d.water_level || '0'),
          })
        )
        .sort((a, b) => a.time.getTime() - b.time.getTime());

      // Nhóm theo 4 tiếng (lấy trung bình hoặc giá trị gần nhất)
      const grouped: { name: string; value: number }[] = [];
      for (let hour = 0; hour < 24; hour += 4) {
        const records = processed.filter((d) => {
          const h = d.time.getHours();
          return h >= hour && h < hour + 4;
        });

        if (records.length > 0) {
          // Lấy giá trị trung bình
          const avgSalinity =
            records.reduce((sum, r) => sum + r.salinity, 0) / records.length;
          grouped.push({
            name: `${hour.toString().padStart(2, '0')}:00`,
            value: avgSalinity,
          });
        }
      }

      setChartData(grouped);
      setIsLoading(false);
    };

    loadData();
  }, [activeMarker]);

  // 1. Cấu hình Series (Dữ liệu giá trị)
  const series = [
    {
      name: 'Độ mặn (g/L)',
      data: chartData.map((item) => Number(item.value.toFixed(2))),
    },
  ];

  // 2. Cấu hình Options (Giao diện)
  const options: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false }, // Ẩn menu download/zoom
      fontFamily: 'inherit',
    },
    colors: chartData.map((item) => getSalinityColor(item.value)), // Màu động theo giá trị
    plotOptions: {
      bar: {
        borderRadius: 4, // Bo góc cột
        columnWidth: '50%', // Độ rộng cột
        distributed: true, // Cho phép mỗi cột có màu riêng
      },
    },
    dataLabels: {
      enabled: false, // Ẩn số trên đầu cột cho thoáng
    },
    xaxis: {
      categories: chartData.map((item) => item.name), // ['00:00', '04:00'...]
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: '11px', colors: '#6B7280', fontWeight: 500 },
      },
    },
    yaxis: {
      title: {
        text: 'Độ mặn (g/L)',
        style: { fontSize: '11px', color: '#6B7280' },
      },
      labels: {
        style: { fontSize: '10px', colors: '#6B7280' },
        formatter: function (val: number) {
          return Number(val).toFixed(1);
        },
      },
    },
    grid: {
      show: true,
      borderColor: '#f3f4f6', // Màu lưới nhạt
      strokeDashArray: 4, // Lưới nét đứt
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    legend: {
      show: false, // Ẩn legend vì màu đã rõ ràng
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: function (val: number) {
          return `${val} g/L`;
        },
      },
    },
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      {/* Container chính */}
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-yellow-100 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header nền động theo mức độ mặn */}
        {(() => {
          const headerBg = getSalinityColor(activeMarker?.salinity);
          const headerTextColor =
            headerBg === '#94A3B8' ? '#1f2937' : '#ffffff';
          return (
            <div
              style={{ backgroundColor: headerBg }}
              className="relative p-3 text-center"
            >
              <h2
                style={{ color: headerTextColor }}
                className="text-lg font-bold uppercase tracking-wide"
              >
                {activeMarker?.name || 'TRẠM QUAN TRẮC'}
              </h2>
              <button
                onClick={onClose}
                aria-label="Đóng"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full font-bold hover:bg-white/20"
                style={{ color: headerTextColor }}
              >
                ✕
              </button>
            </div>
          );
        })()}

        {/* Nội dung bên trong */}
        <div className="p-4">
          {/* Khu vực biểu đồ */}
          <div className="mb-4 w-full rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
            {isLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-gray-500">Đang tải dữ liệu...</p>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-gray-500">Không có dữ liệu</p>
              </div>
            ) : (
              <ReactApexChart
                options={options}
                series={series}
                type="bar"
                height={200}
              />
            )}
          </div>

          {/* Khu vực thông số (Độ mặn / Mực nước) */}
          <div className="mb-3 flex items-center justify-between px-2">
            <div className="text-center">
              <span className="text-lg font-bold text-gray-800">Độ mặn</span>
              <span className="ml-2 text-lg font-bold">
                :{' '}
                {activeMarker?.salinity !== null &&
                activeMarker?.salinity !== undefined
                  ? `${Number(activeMarker.salinity).toFixed(2)} g/L`
                  : 'N/A'}
              </span>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-gray-800">Mực nước</span>
              <span className="ml-2 text-lg font-bold">
                :{' '}
                {activeMarker?.waterLevel !== null &&
                activeMarker?.waterLevel !== undefined
                  ? `${Number(activeMarker.waterLevel).toFixed(2)} m`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Thông báo cảnh báo dựa trên độ mặn (badge nền theo mức độ) */}
          <div className="mb-1 text-center">
            {(() => {
              const s = Number(activeMarker?.salinity);
              if (isNaN(s)) {
                return (
                  <div
                    style={{ backgroundColor: '#94A3B8' }}
                    className="mx-auto inline-block rounded-full px-3 py-1"
                  >
                    <span className="text-sm font-bold text-gray-800">
                      Không có dữ liệu để đánh giá
                    </span>
                  </div>
                );
              }
              if (s >= 4.0) {
                return (
                  <div
                    style={{ backgroundColor: '#DC2626' }}
                    className="mx-auto inline-block rounded-full px-3 py-1"
                  >
                    <span className="text-sm font-bold text-white">
                      ⚠️ Không nên sử dụng nước - Độ mặn cao
                    </span>
                  </div>
                );
              }
              if (s >= 1.0) {
                return (
                  <div
                    style={{ backgroundColor: '#F97316' }}
                    className="mx-auto inline-block rounded-full px-3 py-1"
                  >
                    <span className="text-sm font-bold text-white">
                      Chỉ nên sử dụng nước để rửa và hạn chế tưới tiêu
                    </span>
                  </div>
                );
              }
              return (
                <div
                  style={{ backgroundColor: '#16A34A' }}
                  className="mx-auto inline-block rounded-full px-3 py-1"
                >
                  <span className="text-sm font-bold text-white">
                    ✓ An toàn - Có thể sử dụng nước
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Thời gian cập nhật */}
          <div className="text-center">
            <p className="text-xs italic text-gray-400">
              Lần cập nhật cuối: {activeMarker?.timestamp || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecondPopup;
