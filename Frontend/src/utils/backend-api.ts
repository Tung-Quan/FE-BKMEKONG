import axios from 'axios';

import { API_URL, BACKEND_URL, DEFAULT_DATA_DATETIME } from '@/config/env';
import type {
  ApiListResponse,
  ApiObservation,
  ApiPosition,
  DateRangeQuery,
} from '@/types/api.types';

const baseURL = BACKEND_URL || API_URL;

const api = axios.create({
  baseURL,
});

function extractArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== 'object') return [];

  const obj = payload as ApiListResponse<T>;
  if (Array.isArray(obj.data)) return obj.data;

  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as T[];
  }

  return [];
}

export function getDefaultTargetDate(): Date {
  if (!DEFAULT_DATA_DATETIME) return new Date();
  const parsed = new Date(DEFAULT_DATA_DATETIME);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function formatDateForApi(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function getPositions(): Promise<ApiPosition[]> {
  const response = await api.get('/api/data/positions');
  return extractArrayPayload<ApiPosition>(response.data);
}

export async function getDateRangeData(
  query: DateRangeQuery
): Promise<ApiObservation[]> {
  const {
    date,
    startTime = '00:00:00',
    endTime = '23:59:59',
    positionId,
  } = query;

  const path = [
    '/api/data/date-range',
    date,
    startTime,
    endTime,
    String(positionId),
  ]
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join('/');

  const response = await api.get(path);

  const payload = response.data as ApiListResponse<ApiObservation>;
  if (payload?.success === false) return [];

  return extractArrayPayload<ApiObservation>(payload);
}

export async function getPositionDayData(
  positionId: string | number,
  targetDate: Date
): Promise<ApiObservation[]> {
  return getDateRangeData({
    date: formatDateForApi(targetDate),
    startTime: '00:00:00',
    endTime: '23:59:59',
    positionId,
  });
}

export function getClosestRecordAtOrBefore(
  records: ApiObservation[],
  targetDate: Date
): ApiObservation | null {
  if (!records.length) return null;

  const targetTime = targetDate.getTime();
  const sorted = records
    .filter((item) => item.datetime)
    .map((item) => ({
      ...item,
      _time: new Date(item.datetime).getTime(),
    }))
    .filter((item) => !Number.isNaN(item._time))
    .sort((a, b) => a._time - b._time);

  if (!sorted.length) return null;

  let closest = sorted[0] as ApiObservation & { _time: number };
  for (const item of sorted) {
    if (item._time <= targetTime) {
      closest = item;
    } else {
      break;
    }
  }

  const { _time, ...result } = closest as ApiObservation & { _time?: number };
  void _time;
  return result;
}
