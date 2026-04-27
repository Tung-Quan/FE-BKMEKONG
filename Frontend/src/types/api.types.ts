export type ApiListResponse<T> = {
  success?: boolean;
  data?: T[];
  message?: string;
} & Record<string, unknown>;

export type ApiPosition = {
  id: string | number;
  name: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
  Latitude?: number | string;
  Longitude?: number | string;
  label?: string;
  type?: string;
  distanceKm?: number | string;
  distance_km?: number | string;
  [key: string]: unknown;
};

export type ApiObservation = {
  id?: string | number;
  station_id?: string | number;
  station_name?: string;
  position_id?: string | number;
  datetime: string;
  salinity?: number | string | null;
  water_level?: number | string | null;
  [key: string]: unknown;
};

export type DateRangeQuery = {
  date: string; // YYYY-M-D
  startTime?: string; // HH:mm:ss
  endTime?: string; // HH:mm:ss
  positionId: string | number;
};
