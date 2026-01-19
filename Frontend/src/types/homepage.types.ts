export type recordType = {
  id: string;
  station_id: string;
  station_name: string;
  datetime: string;
  salinity: number | null;
  water_level: number | null;
  // Dynamic properties added during processing
  location?: string;
  position_id?: string;
  _ts?: number; // Timestamp in milliseconds
  time?: string; // Formatted time string (HH:MM)
};

/**
 * Position/Station data from API
 */
export type PositionType = {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  description?: string;
};

/**
 * Chart data structure
 */
export type ChartDataType = {
  labels: string[];
  values: number[];
};

/**
 * Processed chart data for a location
 */
export type LocationChartType = {
  location: string;
  labels: string[];
  values: number[];
  latestValue: number | null;
  highlightedIndex: number;
  
  depthLabels: string[];
  depthValues: number[];
  latestDepth: number | null;
  highlightedIndexDepth: number;
  
  distanceKm: number;
  measurementType: 'salinity' | 'depth';
};

// ==================== COMPONENT PROPS TYPES ====================

/**
 * Props for TimeSelectorContent component
 */
export type TimeSelectorContentProps = {
  currentTime: Date;
  selectedTime: Date;
  onTimeSelect: (date: Date) => void;
};

/**
 * Props for InteractiveMap component
 */
export type InteractiveMapProps = {
  selectedTime: Date;
};

/**
 * Props for SideLineChart component
 */
export type SideLineChartProps = {
  data?: ChartDataType;
  pointName?: string;
  value?: number | null;
  measurementType?: 'salinity' | 'depth';
  salinity?: number;
  distanceKm?: number;
  color?: string;
  highlightedIndex?: number;
};

/**
 * Props for SalinityNewsSwiper component
 */
export type SalinityNewsSwiperProps = {
  // Add props if needed
};

// ==================== HELPER TYPES ====================

/**
 * Time slot for time selector
 */
export type TimeSlotType = {
  id: string;
  label: string;
  date: Date;
};

/**
 * Province/Zone data structure
 */
export type ZoneType = {
  zoneName: string;
  regions: string[];
};

export type ProvinceDataType = {
  geoData: any; // GeoJSON data
  zones: ZoneType[];
};

/**
 * Region selection
 */
export type RegionSelectionType = {
  name: string;
  type: 'PROVINCE' | 'ZONE' | 'REGION';
};