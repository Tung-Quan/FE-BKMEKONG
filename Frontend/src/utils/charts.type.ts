/**
 * Chart data structure for line charts
 */
export type ChartData = {
  labels: string[];
  values: number[];
};

/**
 * Measurement type for chart display
 */
export type MeasurementType = 'salinity' | 'depth';

/**
 * Props for SideLineChart component
 */
export type SideLineChartProps = {
  data?: ChartData;
  pointName?: string;
  value?: number | null;
  measurementType?: MeasurementType;
  salinity?: number;
  distanceKm?: number;
  color?: string;
  highlightedIndex?: number;
};
