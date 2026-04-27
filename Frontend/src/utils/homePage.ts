import {
  formatDateForApi,
  getPositionDayData,
  getPositions,
} from '@/utils/backend-api';

// Fetch positions from API
export const fetchPositions = async () => {
  try {
    return await getPositions();
  } catch (error) {
    console.error('Lỗi tải positions:', error);
    return [];
  }
};

// Helper to format date for API
export const formatDateForAPI = (date: Date) => {
  return formatDateForApi(date);
};

// Fetch data for position in date range (sẽ fetch toàn bộ ngày)
export const fetchDataForPosition = async (
  positionId: string | number,
  targetDate: Date
) => {
  try {
    return await getPositionDayData(positionId, targetDate);
  } catch (error) {
    console.error(`Lỗi tải dữ liệu cho position ${positionId}:`, error);
    return [];
  }
};

// === CÁC HÀM HELPER (Đưa ra ngoài component) ===

/**
 * Helper to extract salinity value from a record (updated for API data)
 */
export const getSal = (rec: Record<string, unknown>) => {
  // API fields
  if (rec.salinity !== undefined && rec.salinity !== null)
    return Number(rec.salinity);
  // Legacy JSON fields
  const keys = [
    'sal_song_gpl',
    'sal_dong_gpl',
    'sal_surface_gpl',
    'sal_bottom_gpl',
  ];
  for (const k of keys) {
    if (rec[k] !== undefined && rec[k] !== null) return Number(rec[k]);
  }
  return null;
};

/**
 * Helper to extract depth (surface) value (updated for API data)
 */
export const getDepth = (rec: Record<string, unknown>) => {
  // API fields
  if (rec.water_level !== undefined && rec.water_level !== null)
    return Number(rec.water_level);
  // Legacy JSON fields
  const keys = ['m_song_m', 'm_dong_m', 'depth_surface_m', 'depth_bottom_m'];
  for (const k of keys) {
    if (rec[k] !== undefined && rec[k] !== null) return Number(rec[k]);
  }
  return null;
};

/**
 * Helper to parse timestamp from data (API or JSON format)
 */
export const parseTimestamp = (record: Record<string, unknown>) => {
  // API format: datetime field (ISO string)
  if (typeof record.datetime === 'string' && record.datetime) {
    try {
      return new Date(record.datetime).getTime();
    } catch {
      // Fall through to legacy format
    }
  }

  // Legacy JSON format: date + time fields
  const datePart = typeof record.date === 'string' ? record.date : '';
  const timePart = typeof record.time === 'string' ? record.time : '00:00';
  let ts: Date | null = null;
  try {
    // Thử chuẩn ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      ts = new Date(datePart + 'T' + timePart + ':00');
    } else {
      // Thử fallback dd/mm
      const d = datePart.split('/').map((s: string) => s.trim());
      if (d.length >= 2) {
        const day = d[0].padStart(2, '0');
        const month = d[1].padStart(2, '0');
        const iso = `2020-${month}-${day}T${timePart || '00:00'}:00`;
        ts = new Date(iso);
      } else {
        ts = new Date(); // Fallback
      }
    }
  } catch {
    ts = new Date(); // Lỗi
  }
  return ts.getTime();
};
