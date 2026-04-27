import { useEffect, useMemo, useState } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { getDefaultTargetDate } from '@utils/backend-api';
import {
  fetchDataForPosition,
  fetchPositions,
  formatDateForAPI,
  getDepth,
  getSal,
  parseTimestamp,
} from '@utils/homePage';

import type {
  LocationChartType,
  PositionType,
  recordType,
} from '@/types/homepage.types';

import SalinityNewsSwiper from './-components/SalinityNewsSwiper';
import InteractiveMap from './-components/interactiveMap';
import SideLineChart from './-components/sideLineCharts';
import TimeSelectorContent from './-components/timeSelectorContent';

export const Route = createFileRoute('/_layout/')({
  component: DashboardHome,
});

function DashboardHome() {
  const [currentTime] = useState(getDefaultTargetDate());
  const [selectedTime, setSelectedTime] = useState(currentTime);

  // State để lưu positions và dữ liệu thô
  const [positions, setPositions] = useState<PositionType[]>([]);
  const [allRawData, setAllRawData] = useState<recordType[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch positions once
  useEffect(() => {
    const loadPositions = async () => {
      try {
        const positionsData = await fetchPositions();
        console.log('Fetched positions for charts:', positionsData);
        setPositions(positionsData);
      } catch (error) {
        console.error('Error loading positions:', error);
      }
    };
    loadPositions();
  }, []);

  // Fetch data khi selectedTime hoặc positions thay đổi
  useEffect(() => {
    if (!selectedTime || positions.length === 0) {
      setAllRawData([]);
      setIsLoadingData(false);
      return;
    }

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        console.log('Fetching data for time:', selectedTime);

        // Fetch data for each position cho ngày được chọn
        const allData: recordType[] = [];
        for (const position of positions) {
          const data = await fetchDataForPosition(position.id, selectedTime);
          // Add position info and timestamp to each record
          data.forEach((record: recordType) => {
            record.location = position.name;
            record.position_id = position.id;
            record._ts = parseTimestamp(record);
            // Format time for display (HH:MM from datetime)
            if (record.datetime) {
              const d = new Date(record.datetime);
              record.time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            }
          });
          allData.push(...data);
        }

        console.log(
          'All raw data loaded for',
          formatDateForAPI(selectedTime),
          ':',
          allData.length,
          'records'
        );
        setAllRawData(allData);
      } catch (error) {
        console.error('Error loading data:', error);
        setAllRawData([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [selectedTime, positions]); // Re-fetch khi selectedTime hoặc positions thay đổi

  // Tính toán lại dữ liệu cho biểu đồ MỖI KHI selectedTime thay đổi
  const locationCharts = useMemo<LocationChartType[]>(() => {
    if (allRawData.length === 0 || positions.length === 0) return [];

    // 1. Group dữ liệu thô theo location
    const groups: { [key: string]: recordType[] } = {};
    allRawData.forEach((r) => {
      const loc = r.location || 'Unknown';
      groups[loc] = groups[loc] || [];
      groups[loc].push(r);
    });

    // 2. Các địa điểm từ positions (dùng tên thực từ API)
    const desired = positions.map((p) => p.name);
    const selectedTimeMs = selectedTime.getTime();

    console.log('Processing charts for locations:', desired);

    // 3. Xử lý dữ liệu cho từng địa điểm
    const results = desired.map((loc) => {
      const recs = (groups[loc] || [])
        .slice()
        .sort((a, b) => (a._ts || 0) - (b._ts || 0));
      if (recs.length === 0) return null; // Bỏ qua nếu không có data

      /**
       * Hàm helper để xử lý cho 1 loại dữ liệu (salinity hoặc depth)
       * @returns {object} { labels, values, latestValue, highlightedIndex }
       */
      const processChartData = (
        records: recordType[],
        valueGetter: (r: recordType) => number | null
      ) => {
        // Lọc ra các record có giá trị hợp lệ
        const validRecs = records
          .map((r) => ({ ...r, value: valueGetter(r) }))
          .filter((r) => r.value !== null && !Number.isNaN(r.value));

        if (validRecs.length === 0) {
          return {
            labels: [],
            values: [],
            latestValue: null,
            highlightedIndex: -1,
          };
        }

        // Tìm điểm gần nhất trong quá khứ so với selectedTime
        let targetIndex = validRecs.findIndex(
          (r: recordType) => (r._ts || 0) > selectedTimeMs
        );
        if (targetIndex === -1) {
          // Mọi điểm đều ở quá khứ -> chọn điểm cuối
          targetIndex = validRecs.length - 1;
        } else if (targetIndex === 0) {
          // Mọi điểm đều ở tương lai -> chọn điểm đầu
          targetIndex = 0;
        } else {
          // targetIndex là điểm *sau* selectedTime, ta lùi 1
          targetIndex = targetIndex - 1;
        }

        const latestValue = validRecs[targetIndex].value;

        // Lấy 5 điểm (2 trước, 1 giữa, 2 sau)
        let sliceStart = Math.max(0, targetIndex - 2);
        let sliceEnd = Math.min(validRecs.length, targetIndex + 3); // +3 vì slice() không bao gồm

        // Điều chỉnh nếu ở 2 đầu
        const sliceLength = sliceEnd - sliceStart;
        if (sliceLength < 5) {
          if (sliceStart === 0) {
            sliceEnd = Math.min(validRecs.length, 5);
          } else if (sliceEnd === validRecs.length) {
            sliceStart = Math.max(0, validRecs.length - 5);
          }
        }

        const chartSlice = validRecs.slice(sliceStart, sliceEnd);

        // Tìm lại index của điểm highlight (bên trong mảng 5 điểm)
        const highlightedIndex = chartSlice.findIndex(
          (r) => r._ts === validRecs[targetIndex]._ts
        );

        return {
          labels: chartSlice.map((r) => r.time || ''),
          values: chartSlice.map((r) => r.value),
          latestValue, // Giá trị tại điểm được tô vàng
          highlightedIndex, // Vị trí (0-4) của điểm tô vàng
        };
      };

      // Xử lý dữ liệu độ mặn để chọn top 4 điểm có độ mặn cao nhất.
      const mainChart = processChartData(recs, getSal);

      // Xử lý dữ liệu cho mực nước (luôn luôn, cho biểu đồ thứ 2)
      const depthChart = processChartData(recs, getDepth);

      return {
        location: loc,
        labels: mainChart.labels,
        values: mainChart.values as number[],
        latestValue: mainChart.latestValue,
        highlightedIndex: mainChart.highlightedIndex,

        depthLabels: depthChart.labels,
        depthValues: depthChart.values as number[],
        latestDepth: depthChart.latestValue,
        highlightedIndexDepth: depthChart.highlightedIndex,

        distanceKm: Number(
          positions.find((p) => p.name === loc)?.distanceKm ??
            positions.find((p) => p.name === loc)?.distance_km ??
            0
        ),
        measurementType: 'salinity' as const,
      };
    });

    return results.filter((r) => r !== null); // Lọc bỏ các location không có data
  }, [allRawData, selectedTime, positions]); // <-- Tự động chạy lại khi 3 giá trị này thay đổi

  const topSalinityCharts = useMemo(() => {
    return locationCharts
      .filter((chart) => chart.latestValue !== null)
      .slice()
      .sort((a, b) => Number(b.latestValue) - Number(a.latestValue))
      .slice(0, 4);
  }, [locationCharts]);

  return (
    <div className="mt-28 w-full px-4">
      {/* PARENT:
    - Luôn luôn là flex-row (hàng ngang)
    - gap-5: Khoảng cách giữa 2 cột
*/}
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* ============================================
      ============  NỘI DUNG CỘT BÊN TRÁI  ==========
      ============================================
      - Set cứng w-2/3
  */}
        <div
          className="w-full justify-center rounded-3xl bg-white px-4 text-lg md:text-2xl lg:w-2/3"
          style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
        >
          <h1
            className="my-3 px-4 text-center text-[#0060C9]"
            style={{ fontFamily: 'UTM Black' }}
          >
            BẢNG THÔNG TIN TỔNG HỢP
          </h1>

          {/* Time Selector */}
          <div className="mb-0 block rounded-t-lg bg-white px-6 py-6 shadow-sm">
            <div className="flex justify-center">
              <TimeSelectorContent
                currentTime={currentTime}
                selectedTime={selectedTime}
                onTimeSelect={setSelectedTime}
              />
            </div>
          </div>

          {/* Map */}
          <div className="mb-6 mt-0">
            <InteractiveMap selectedTime={selectedTime} />
          </div>

          {/* News Swiper */}
          <div className="mb-4 px-4">
            <div
              className="mb-3 max-w-[260px] rounded-sm bg-[#F0F9FF] p-2 text-2xl font-semibold"
              style={{ fontFamily: 'UTM Black' }}
            >
              <span>XÂM NHẬP MẶN </span>
              <span className="font-bold text-red-700">MỚI NHẤT</span>
            </div>
            <SalinityNewsSwiper />
          </div>
        </div>

        {/* ============================================
      =============== NỘI DUNG CỘT BÊN PHẢI ======
      ============================================
      - Set cứng w-1/3
  */}
        <div className="w-full lg:w-1/3">
          <div className="flex flex-col gap-5">
            {/* CARD 1: DIỄN BIẾN MẶN */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
              <div className="relative">
                <div className="flex flex-col bg-white">
                  <div
                    className="w-full bg-[#005DCE] p-4 text-center text-xl font-bold text-white md:text-3xl"
                    style={{ fontFamily: 'UTM Black' }}
                  >
                    <h1>DIỄN BIẾN MẶN</h1>
                  </div>

                  <div className="mt-4 px-4">
                    {isLoadingData ? (
                      <p className="p-4 text-center text-gray-500">
                        Đang tải...
                      </p>
                    ) : topSalinityCharts && topSalinityCharts.length > 0 ? (
                      <div className="space-y-3">
                        {topSalinityCharts.map((c) => (
                          <SideLineChart
                            key={c.location}
                            pointName={c.location}
                            value={c.latestValue}
                            measurementType={c.measurementType}
                            distanceKm={c.distanceKm}
                            data={{ labels: c.labels, values: c.values }}
                            highlightedIndex={c.highlightedIndex}
                            color="#0ea5e9"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="p-4 text-center text-gray-500">
                        Không có dữ liệu độ mặn.
                      </p>
                    )}
                  </div>

                  <div className="mb-4 mt-4 flex justify-end pr-4">
                    <a
                      href="#"
                      className="mr-2 text-black hover:underline"
                      style={{ fontFamily: 'UTM Black' }}
                    >
                      Xem thêm
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: TÌNH HÌNH MỰC NƯỚC */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
              <div className="relative">
                <div className="flex flex-col bg-white">
                  <div
                    className="w-full bg-[#005DCE] p-4 text-center text-xl font-bold text-white md:text-3xl"
                    style={{ fontFamily: 'UTM Black' }}
                  >
                    <h1>TÌNH HÌNH MỰC NƯỚC</h1>
                  </div>

                  <div className="mt-4 px-4">
                    {isLoadingData ? (
                      <p className="p-4 text-center text-gray-500">
                        Đang tải...
                      </p>
                    ) : topSalinityCharts &&
                      topSalinityCharts.some(
                        (c) => c.depthValues?.length > 0
                      ) ? (
                      <div className="space-y-3">
                        {topSalinityCharts.map((c) =>
                          c.depthValues?.length > 0 ? (
                            <SideLineChart
                              key={`${c.location}-depth`}
                              pointName={c.location}
                              value={c.latestDepth}
                              measurementType="depth"
                              distanceKm={c.distanceKm}
                              data={{
                                labels: c.depthLabels,
                                values: c.depthValues,
                              }}
                              highlightedIndex={c.highlightedIndexDepth}
                              color="#06b6d4"
                            />
                          ) : null
                        )}
                      </div>
                    ) : (
                      <p className="p-4 text-center text-gray-500">
                        Không có dữ liệu.
                      </p>
                    )}
                  </div>

                  <div className="mb-4 mt-4 flex justify-end pr-4">
                    <a
                      href="#"
                      className="mr-2 text-black hover:underline"
                      style={{ fontFamily: 'UTM Black' }}
                    >
                      Xem thêm
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: THÔNG BÁO */}
            <div className="h-96 p-4">
              <div className="flex h-full flex-col rounded-lg border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-4 shadow-inner">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M15 17H9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 22C13.1046 22 14 21.1046 14 20H10C10 21.1046 10.8954 22 12 22Z"
                        fill="currentColor"
                      />
                      <path
                        d="M18 8C18 5.23858 15.7614 3 13 3H11C8.23858 3 6 5.23858 6 8V12L4 14V15H20V14L18 12V8Z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <h2
                      className="text-lg font-bold"
                      style={{ fontFamily: 'UTM Black' }}
                    >
                      THÔNG BÁO
                    </h2>
                  </div>
                </div>
                <div className="flex-1 overflow-auto pr-2">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      <div>
                        <div className="text-sm text-gray-800">
                          Nội dung thông báo hoặc chỉ đạo chỉ định sẽ được hiển
                          thị ở đây một cách ngắn gọn và rõ ràng.
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          01/11/2025 09:30
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                      <div>
                        <div className="text-sm text-gray-800">
                          Khung này sẽ được mở rộng linh hoạt dựa trên nội dung
                          được chèn vào, giúp người dùng dễ dàng nắm bắt thông
                          tin quan trọng.
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          31/10/2025 14:20
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-green-400" />
                      <div>
                        <div className="text-sm text-gray-800">
                          Vui lòng kiểm tra thường xuyên để cập nhật những thông
                          báo mới nhất từ hệ thống.
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          30/10/2025 08:10
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
