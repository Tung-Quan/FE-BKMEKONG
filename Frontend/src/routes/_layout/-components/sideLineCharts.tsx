// src/components/sideLineChart.tsx
import { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';

import type { SideLineChartProps } from '@utils/charts.type';
import type { ApexOptions } from 'apexcharts';
import type { ApexAxisChartSeries } from 'apexcharts';

export default function SideLineChart({
  data = {
    labels: [],
    values: [],
  },
  pointName = 'Điểm đo',
  value = null,
  measurementType = 'salinity',
  salinity = undefined,
  distanceKm = 2.5,
  color = '#0ea5e9',
  highlightedIndex = -1,
}: SideLineChartProps) {
  const displayValue =
    (value === null || value === undefined) && salinity !== undefined
      ? salinity
      : value;

  // Fixed chart height (non-responsive)
  const chartHeight = 160;

  // ApexCharts options và series
  const chartOptions = useMemo<{
    options: ApexOptions;
    series: ApexAxisChartSeries;
  }>(() => {
    const labels = data.labels || [];
    const values = data.values || [];

    // Prepare single color for the line and a discrete marker for highlighted point
    const mainColor = color;
    const discreteMarker =
      highlightedIndex >= 0 && highlightedIndex < values.length
        ? [
            {
              seriesIndex: 0,
              dataPointIndex: highlightedIndex,
              fillColor: '#F59E0B',
              strokeColor: '#ffffff',
              size: 8,
            },
          ]
        : [];

    const options: ApexOptions = {
      chart: {
        type: 'line',
        height: chartHeight,
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      markers: {
        size: 4,
        colors: [mainColor],
        strokeColors: '#fff',
        strokeWidth: 2,
        discrete: discreteMarker,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'vertical',
          shadeIntensity: 1,
          inverseColors: false,
          opacityFrom: 0.16,
          opacityTo: 0,
          stops: [0, 90, 100],
        },
      },
      colors: [mainColor],
      dataLabels: { enabled: false },
      grid: {
        show: true,
        borderColor: '#e0e0e0',
        strokeDashArray: 3,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { top: 6, right: 20, bottom: 18, left: 6 },
      },
      xaxis: {
        categories: labels,
        labels: { style: { colors: '#6b7280', fontSize: '10px' } },
        title: {
          text: 'Thời gian',
          offsetY: -5,
          style: { color: '#6b7280', fontSize: '10px', fontWeight: 400 },
        },
        axisBorder: { show: true, color: '#e0e0e0' },
        axisTicks: { show: true, color: '#e0e0e0' },
      },
      yaxis: {
        labels: {
          style: { colors: '#6b7280', fontSize: '10px' },
          formatter: (val: number) => val?.toFixed(1) || '0',
        },
        title: {
          text: measurementType === 'depth' ? 'Mực nước (m)' : 'Độ mặn (g/l)',
          style: { color: '#6b7280', fontSize: '10px', fontWeight: 400 },
        },
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: (val: number) =>
            `${Number(val).toFixed(2)} ${measurementType === 'depth' ? 'm' : 'g/l'}`,
          title: {
            formatter: () =>
              measurementType === 'depth' ? 'Mực nước' : 'Độ mặn',
          },
        },
        style: { fontSize: '12px' },
      },
      legend: { show: false },
    };

    const series: ApexAxisChartSeries = [{ name: 'Giá trị', data: values }];
    return { options, series };
  }, [data, highlightedIndex, color, measurementType]);

  return (
    <div className="flex min-h-[160px] items-stretch overflow-hidden rounded-lg bg-white shadow-sm">
      {/* Left side: Point info (narrowed) */}
      <div className="flex min-w-[140px] flex-col justify-center border-r border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 px-3 py-2">
        <div className="mb-1 truncate text-xs font-semibold text-gray-700">
          {pointName}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-600">
          <span className="font-medium">
            {measurementType === 'depth' ? 'Mực:' : 'Độ mặn:'}
          </span>
          <span className="font-semibold text-blue-700">
            {displayValue === null ||
            displayValue === undefined ||
            Number.isNaN(Number(displayValue))
              ? '—'
              : `${Number(displayValue).toFixed(2)} ${measurementType === 'depth' ? 'm' : 'g/l'}`}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-600">
          <span className="font-medium">Khoảng cách:</span>
          <span className="font-semibold text-blue-700">
            {distanceKm.toFixed(1)} km
          </span>
        </div>
      </div>

      {/* Right side: ApexCharts LineChart (responsive with horizontal scroll) */}
      <div className="flex min-h-[160px] flex-1 items-center justify-center bg-gradient-to-br from-gray-50 to-white px-2">
        {/* Scroll container */}
        <div className="w-full overflow-x-auto">
          {/* Inline block with computed min width so chart can overflow horizontally when many points */}
          <div
            className="inline-block"
            style={{ minWidth: Math.max((data.labels || []).length * 48, 300) }}
          >
            <ReactApexChart
              options={chartOptions.options}
              series={chartOptions.series}
              type="line"
              height={chartHeight}
              width={Math.max((data.labels || []).length * 48, 300)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
