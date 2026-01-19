import { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import axios from 'axios';


// === API CONFIGURATION ===
const backendURL = import.meta.env.VITE_BACKEND_URL;

// Fetch dữ liệu toàn bộ ngày cho position
const fetchDayData = async (positionId: number, targetDate: Date) => {
  try {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    const dateStr = `${year}-${month}-${day}`;
    
    const url = `${backendURL}/api/data/date-range/${dateStr}/00:00:00/23:59:59/${positionId}`;
    const response = await axios.get(url);
    
    if (response.data.success && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Lỗi tải dữ liệu biểu đồ:', error);
    return [];
  }
};

// Hàm xác định màu theo mức độ mặn
const getSalinityColor = (salinity: string) => {
  const s = parseFloat(salinity);
  if (isNaN(s)) return '#94A3B8'; // Màu xám cho unknown
  if (s >= 4.0) return '#DC2626'; // Đỏ (warning)
  if (s >= 1.0) return '#F97316'; // Cam (caution)
  return '#16A34A'; // Xanh (safe)
};

interface SecondPopupProps {
  onClose: () => void;
  activeMarker: {
    id: number;
    rawData?: {
      datetime?: string;
    };
  } | null;
}

function SecondPopup({ onClose, activeMarker }: SecondPopupProps) {
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
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
        : new Date('2020-08-29T10:00:00');
      
      const data = await fetchDayData(activeMarker.id, targetDate);
      
      // Process data: nhóm theo khung giờ 4h
      const processed = data
        .filter(d => d.salinity !== null && d.salinity !== undefined)
        .map((d: { datetime: string; salinity: string; water_level?: string }) => ({
          time: new Date(d.datetime),
          salinity: parseFloat(d.salinity),
          waterLevel: parseFloat(d.water_level || "0"),
        }))
        .sort((a, b) => a.time.getTime() - b.time.getTime());

      // Nhóm theo 4 tiếng (lấy trung bình hoặc giá trị gần nhất)
      const grouped = [];
      for (let hour = 0; hour < 24; hour += 4) {
        const records = processed.filter(d => {
          const h = d.time.getHours();
          return h >= hour && h < hour + 4;
        });
        
        if (records.length > 0) {
          // Lấy giá trị trung bình
          const avgSalinity = records.reduce((sum, r) => sum + r.salinity, 0) / records.length;
          grouped.push({
            name: `${hour.toString().padStart(2, '0')}:00`,
            value: avgSalinity
          });
        }
      }

      setChartData(grouped);
      setIsLoading(false);
    };

    loadData();
  }, [activeMarker]);

  // 1. Cấu hình Series (Dữ liệu giá trị)
  const series = [{
    name: 'Độ mặn (g/L)',
    data: chartData.map(item => item.value.toFixed(2)) // [40, 60, 35...]
  }];

  // 2. Cấu hình Options (Giao diện)
  const options = {
    chart: {
      type: 'bar',
      toolbar: { show: false }, // Ẩn menu download/zoom
      fontFamily: 'inherit',
    },
    colors: chartData.map(item => getSalinityColor(item.value)), // Màu động theo giá trị
    plotOptions: {
      bar: {
        borderRadius: 4,      // Bo góc cột
        columnWidth: '50%',   // Độ rộng cột
        distributed: true,    // Cho phép mỗi cột có màu riêng
      }
    },
    dataLabels: {
      enabled: false, // Ẩn số trên đầu cột cho thoáng
    },
    xaxis: {
      categories: chartData.map(item => item.name), // ['00:00', '04:00'...]
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: '11px', colors: '#6B7280', fontWeight: 500 }
      }
    },
    yaxis: {
      title: {
        text: 'Độ mặn (g/L)',
        style: { fontSize: '11px', color: '#6B7280' }
      },
      labels: {
        style: { fontSize: '10px', colors: '#6B7280' },
        formatter: function (val) {
          return val.toFixed(1);
        }
      }
    },
    grid: {
      show: true,
      borderColor: '#f3f4f6', // Màu lưới nhạt
      strokeDashArray: 4,     // Lưới nét đứt
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    legend: {
      show: false, // Ẩn legend vì màu đã rõ ràng
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: function (val) {
          return val + " g/L"; // Format tooltip
        }
      }
    }
  };

  

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4" onClick={onClose}>
      
      {/* Container chính */}
      <div className="bg-white rounded-3xl overflow-hidden w-full max-w-md shadow-xl border border-yellow-100" onClick={(e) => e.stopPropagation()}>
        
        {/* Header nền động theo mức độ mặn */}
        {(() => {
          const headerBg = getSalinityColor(activeMarker?.salinity);
          const headerTextColor = headerBg === '#94A3B8' ? '#1f2937' : '#ffffff';
          return (
            <div style={{ backgroundColor: headerBg }} className="p-3 relative text-center">
              <h2 style={{ color: headerTextColor }} className="font-bold text-lg uppercase tracking-wide">
                {activeMarker?.name || 'TRẠM QUAN TRẮC'}
              </h2>
              <button 
                onClick={onClose}
                aria-label="Đóng"
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center font-bold"
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
          <div className="w-full bg-white rounded-xl p-2 mb-4 border border-gray-100 shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-gray-500">Đang tải dữ liệu...</p>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px]">
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
          <div className="flex justify-between items-center mb-3 px-2">
            <div className="text-center">
              <span className="font-bold text-gray-800 text-lg">Độ mặn</span>
              <span className="font-bold text-lg ml-2">
                : {activeMarker?.salinity !== null && activeMarker?.salinity !== undefined 
                    ? `${parseFloat(activeMarker.salinity).toFixed(2)} g/L` 
                    : 'N/A'}
              </span>
            </div>
            <div className="text-center">
              <span className="font-bold text-gray-800 text-lg">Mực nước</span>
              <span className="font-bold text-lg ml-2">
                : {activeMarker?.waterLevel !== null && activeMarker?.waterLevel !== undefined
                    ? `${parseFloat(activeMarker.waterLevel).toFixed(2)} m` 
                    : 'N/A'}
              </span>
            </div>
          </div>

          {/* Thông báo cảnh báo dựa trên độ mặn (badge nền theo mức độ) */}
          <div className="text-center mb-1">
            {(() => {
              const s = parseFloat(activeMarker?.salinity);
              if (isNaN(s)) {
                return (
                  <div style={{ backgroundColor: '#94A3B8' }} className="mx-auto inline-block px-3 py-1 rounded-full">
                    <span className="font-bold text-sm text-gray-800">Không có dữ liệu để đánh giá</span>
                  </div>
                );
              }
              if (s >= 4.0) {
                return (
                  <div style={{ backgroundColor: '#DC2626' }} className="mx-auto inline-block px-3 py-1 rounded-full">
                    <span className="font-bold text-sm text-white">⚠️ Không nên sử dụng nước - Độ mặn cao</span>
                  </div>
                );
              }
              if (s >= 1.0) {
                return (
                  <div style={{ backgroundColor: '#F97316' }} className="mx-auto inline-block px-3 py-1 rounded-full">
                    <span className="font-bold text-sm text-white">Chỉ nên sử dụng nước để rửa và hạn chế tưới tiêu</span>
                  </div>
                );
              }
              return (
                <div style={{ backgroundColor: '#16A34A' }} className="mx-auto inline-block px-3 py-1 rounded-full">
                  <span className="font-bold text-sm text-white">✓ An toàn - Có thể sử dụng nước</span>
                </div>
              );
            })()}
          </div>

          {/* Thời gian cập nhật */}
          <div className="text-center">
            <p className="text-gray-400 italic text-xs">
              Lần cập nhật cuối: {activeMarker?.timestamp || 'N/A'}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default SecondPopup;