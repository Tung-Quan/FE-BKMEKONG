import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
} from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { MAP_CONTEXT_URL, MAP_GEOJSON_URL } from '@/config/env';
import {
  getClosestRecordAtOrBefore,
  getPositionDayData,
  getPositions,
} from '@/utils/backend-api';

import CustomZoomControl from './customZoomControl';
import SalinityPopup from './salinityPopup';
import SearchBarMap from './searchBarMap';
import SecondPopup from './secondPopup';

const regionColors = [
  { name: 'Cái Bè', color: '#ff595e' },
  { name: 'Cai Lậy', color: '#8ac926' },
  { name: 'Châu Thành', color: '#f72585' },
  { name: 'Chợ Gạo', color: '#4361ee' },
  { name: 'Gò Công Ðông', color: '#E5FFCC' },
  { name: 'Gò Công Tây', color: '#7209b7' },
  { name: 'Tân Phú Ðông', color: '#4c0099' },
  { name: 'Tân Phước', color: '#90be6d' },
  { name: 'Mỹ Tho', color: '#ffca3a' },
  { name: 'Go Cong', color: '#1982c4' },
  { name: 'Cai Lậy', color: '#6a4c93' },
  { name: 'Tân Phước', color: '#ffca3a' },
];

// Fetch latest data for a specific position (updated to use selectedTime)
const fetchLatestDataForPosition = async (
  positionId: number | string,
  targetDate: Date
) => {
  try {
    const dayData = await getPositionDayData(positionId, targetDate);
    return getClosestRecordAtOrBefore(dayData, targetDate);
  } catch (error) {
    console.error(`Lỗi tải dữ liệu cho position ${positionId}:`, error);
    return null;
  }
};

const getSalinityState = (salinityValue) => {
  const s = parseFloat(salinityValue);
  if (isNaN(s)) {
    return { level: 'unknown', label: 'Không có dữ liệu', color: '#94a3b8' };
  }
  if (s >= 4.0) {
    return { level: 'warning', label: 'Mặn cao', color: '#dc2626' };
  }
  if (s >= 1.0) {
    return { level: 'caution', label: 'Cần theo dõi', color: '#f59e0b' };
  }
  return { level: 'safe', label: 'An toàn', color: '#16a34a' };
};
// === KẾT THÚC PHẦN SỬA LỖI ===

type MarkerItem = {
  id: number | string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  salinity: number | string | null;
  waterLevel: number | string | null;
  timestamp: string;
  rawData: any;
};

type SelectedRegion = {
  name: string;
  type: string;
} | null;

type SalinityRisk = {
  level: string;
  label: string;
  color: string;
  salinity: number | null;
  stationName: string;
};

export default function InteractiveMap({
  selectedTime,
}: {
  selectedTime?: Date;
}) {
  const [geoData, setGeoData] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<SelectedRegion>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [zoneMap, setZoneMap] = useState<Record<string, string[]>>({});
  const [province, setProvince] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(10);

  const [activeMarkerId, setActiveMarkerId] = useState<number | string | null>(
    null
  );
  const [isMarkerPopupOpen, setIsMarkerPopupOpen] = useState(false);
  const [markers, setMarkers] = useState<MarkerItem[]>([]);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(true);

  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  // Dùng selectedTime từ props, hoặc default
  const effectiveTime = useMemo(
    () => selectedTime ?? new Date('2020-08-29T10:00:00'),
    [selectedTime]
  );

  const center: [number, number] = [10.4125, 106.2614];
  const maxBounds = L.latLngBounds([9.9, 105.6], [11.0, 107.0]);

  const safeNormalize = (s: string | null | undefined) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  useEffect(() => {
    fetch(MAP_GEOJSON_URL)
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch(() => console.error('Lỗi tải GeoJSON'));
  }, []);

  // Fetch positions và data từ API - refetch khi selectedTime thay đổi
  useEffect(() => {
    const loadMarkersData = async () => {
      setIsLoadingMarkers(true);
      try {
        // 1. Fetch tất cả positions
        const positions = await getPositions();
        console.log(
          'Raw positions fetched:',
          positions,
          'Type:',
          typeof positions,
          'IsArray:',
          Array.isArray(positions),
          'Length:',
          positions?.length
        );

        if (!positions || !Array.isArray(positions) || positions.length === 0) {
          console.log('Không có positions nào hoặc positions không phải mảng');
          setMarkers([]);
          setIsLoadingMarkers(false);
          return;
        }

        // 2. Fetch data cho từng position tại thời điểm effectiveTime
        console.debug('Fetched positions:', positions);
        console.log('Fetching marker data for time:', effectiveTime);
        const markersWithData = (
          await Promise.all(
            positions.map(async (position: any) => {
              const latestData = await fetchLatestDataForPosition(
                position.id,
                effectiveTime
              );

              // API returns lat/lng swapped: their "lng" is actually latitude, "lat" is longitude
              // Try several possible field names for coordinates
              const latCandidates = [
                position.Latitude,
                position.latitude,
                position.lng,
                position.latitutde,
                position.Lat,
                position.y,
              ];
              const lngCandidates = [
                position.Longitude,
                position.longitude,
                position.lat,
                position.long,
                position.Long,
                position.x,
              ];

              let lat: number | null = null;
              let lng: number | null = null;

              const parseCoord = (
                v: any
              ): number | { lat: number; lng: number } | null => {
                if (v === undefined || v === null) return null;
                if (typeof v === 'number') return v;
                if (typeof v === 'string') {
                  const clean = v.trim();
                  // comma-separated pair like "10.35,106.26"
                  if (clean.includes(',') && !clean.includes(' ')) {
                    const [a, b] = clean.split(',');
                    const na = parseFloat(a);
                    const nb = parseFloat(b);
                    if (!isNaN(na) && !isNaN(nb)) {
                      // prefer first as lat
                      return { lat: na, lng: nb };
                    }
                  }
                  const n = parseFloat(clean.replace(/[^0-9+\-.eE]/g, ''));
                  return isNaN(n) ? null : n;
                }
                return null;
              };

              for (const c of latCandidates) {
                const p = parseCoord(c);
                if (p && typeof p === 'object' && p.lat !== undefined) {
                  lat = p.lat;
                  lng = p.lng;
                  break;
                }
                if (p !== null && typeof p === 'number' && !isNaN(p)) {
                  lat = p;
                  break;
                }
              }
              for (const c of lngCandidates) {
                const p = parseCoord(c);
                if (p && typeof p === 'object' && p.lng !== undefined) {
                  lng = p.lng;
                  break;
                }
                if (p !== null && typeof p === 'number' && !isNaN(p)) {
                  lng = p;
                  break;
                }
              }

              // If still null, try splitting a combined field like position.coordinates or position.location
              if (
                (lat === null || lng === null) &&
                typeof position.coordinates === 'string'
              ) {
                const parts = position.coordinates.split(',');
                if (parts.length >= 2) {
                  const a = parseFloat(parts[0]);
                  const b = parseFloat(parts[1]);
                  if (!isNaN(a) && !isNaN(b)) {
                    lat = a;
                    lng = b;
                  }
                }
              }

              // final numeric coercion
              lat = lat !== null ? Number(lat) : NaN;
              lng = lng !== null ? Number(lng) : NaN;

              const marker = {
                id: position.id,
                name: position.name || position.label || 'Unknown',
                type: 'CỐNG',
                lat: isFinite(lat) ? lat : 0,
                lng: isFinite(lng) ? lng : 0,
                salinity: latestData?.salinity ?? null,
                waterLevel: latestData?.water_level ?? null,
                timestamp: latestData?.datetime
                  ? new Date(latestData.datetime).toLocaleString('vi-VN')
                  : 'N/A',
                rawData: latestData,
              };

              console.debug('Prepared marker:', marker);
              return marker;
            })
          )
        )
          // filter out invalid coordinates (0,0 or NaN) which are outside our province bounds
          .filter(
            (m: MarkerItem) =>
              Number.isFinite(m.lat) &&
              Number.isFinite(m.lng) &&
              !(m.lat === 0 && m.lng === 0)
          );

        console.debug('Markers prepared:', markersWithData);
        setMarkers(markersWithData);

        // Auto-fit map to markers if any
        if (markersWithData.length > 0 && mapRef.current) {
          try {
            const bounds = L.latLngBounds(
              markersWithData.map(
                (m: MarkerItem) => [m.lat, m.lng] as [number, number]
              )
            );
            if (bounds.isValid()) {
              mapRef.current.fitBounds(bounds, {
                padding: [40, 40],
                maxZoom: 12,
              });
            }
          } catch (err) {
            console.warn('Could not fit map to markers:', err);
          }
        }
      } catch (error) {
        console.error('Lỗi khi load markers:', error);
        setMarkers([]);
      } finally {
        setIsLoadingMarkers(false);
      }
    };

    loadMarkersData();
  }, [effectiveTime]);

  useEffect(() => {
    fetch(MAP_CONTEXT_URL)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.province) setProvince(data.province);
        if (data && Array.isArray(data.zones)) {
          setZones(data.zones);
          const newZoneMap: Record<string, string[]> = {};
          data.zones.forEach((z: any) => {
            newZoneMap[z.zoneName] = z.regions;
          });
          setZoneMap(newZoneMap);
        }
      })
      .catch(() => {
        console.error('Lỗi tải context.json');
      });
  }, []);

  const findFeaturesByNames = (geoJson: any, namesToFind: string[]) => {
    if (!geoJson || !geoJson.features || !namesToFind) return [];
    const normalizedNames = namesToFind.map(safeNormalize);
    return geoJson.features.filter((f: any) => {
      const nameProp = f?.properties?.NAME_3 || f?.properties?.NAME_2 || '';
      return normalizedNames.includes(safeNormalize(nameProp));
    });
  };

  const getFeatureCenter = (feature: any): [number, number] | null => {
    const geometry = feature?.geometry;
    if (!geometry?.coordinates) return null;

    const points: [number, number][] = [];
    const collectPoints = (coords: any) => {
      if (!Array.isArray(coords)) return;
      if (
        coords.length >= 2 &&
        typeof coords[0] === 'number' &&
        typeof coords[1] === 'number'
      ) {
        points.push([coords[1], coords[0]]);
        return;
      }
      coords.forEach(collectPoints);
    };

    collectPoints(geometry.coordinates);
    if (!points.length) return null;

    const sums = points.reduce(
      (acc, point) => ({
        lat: acc.lat + point[0],
        lng: acc.lng + point[1],
      }),
      { lat: 0, lng: 0 }
    );

    return [sums.lat / points.length, sums.lng / points.length];
  };

  const salinityRiskByRegion = useMemo(() => {
    const riskMap: Record<string, SalinityRisk> = {};
    if (!geoData?.features || markers.length === 0) return riskMap;

    geoData.features.forEach((feature: any) => {
      const regionName = feature?.properties?.NAME_3?.trim();
      const centerPoint = getFeatureCenter(feature);
      if (!regionName || !centerPoint) return;

      let nearestMarker = null as MarkerItem | null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const marker of markers) {
        if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) {
          continue;
        }

        const distance =
          Math.pow(centerPoint[0] - marker.lat, 2) +
          Math.pow(centerPoint[1] - marker.lng, 2);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestMarker = marker;
        }
      }

      if (!nearestMarker) return;

      const marker = nearestMarker as MarkerItem;

      const salinity =
        marker.salinity === null ||
        marker.salinity === undefined ||
        Number.isNaN(Number(marker.salinity))
          ? null
          : Number(marker.salinity);
      const state = getSalinityState(salinity);

      riskMap[safeNormalize(regionName)] = {
        level: state.level,
        label: state.label,
        color: state.color,
        salinity,
        stationName: marker.name,
      };
    });

    return riskMap;
  }, [geoData, markers]);

  const provinceDataForSearch = useMemo(() => {
    if (!province || !geoData || zones.length === 0) {
      return {};
    }
    return {
      [province]: {
        geoData: geoData,
        zones: zones,
      },
    };
  }, [geoData, zones, province]);

  const handleSearchSelection = (selection: any) => {
    if (!selection || !mapRef.current) {
      setSelectedRegion(null);
      return;
    }

    setActiveMarkerId(null);
    setIsMarkerPopupOpen(false);
    setSecondPopupOpen(false);
    mapRef.current.closePopup();

    switch (selection.type) {
      case 'PROVINCE':
        setSelectedRegion(null);
        break;
      case 'ZONE': {
        const zoneName = selection.name;
        const regionNamesInZone = zoneMap[zoneName];
        if (!regionNamesInZone || regionNamesInZone.length === 0) break;
        const features = findFeaturesByNames(geoData, regionNamesInZone);
        if (features.length > 0) {
          const featureGroup = L.featureGroup(
            features.map((f: any) => L.geoJSON(f))
          );
          const bounds = featureGroup.getBounds();
          if (bounds && bounds.isValid()) {
            mapRef.current.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 12,
              animate: true,
              duration: 0.8,
            });
          }
        }
        setSelectedRegion({ name: zoneName, type: 'Vùng' });
        break;
      }
      case 'REGION': {
        const regionName = selection.name;
        const features = findFeaturesByNames(geoData, [regionName]);
        if (features.length > 0) {
          const feature = features[0];
          const layer = L.geoJSON(feature);
          const bounds = layer.getBounds();
          if (bounds && bounds.isValid()) {
            mapRef.current.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 12,
              animate: true,
              duration: 0.8,
            });
          }
          setSelectedRegion({
            name: feature.properties.NAME_3 || regionName,
            type: feature.properties.TYPE_3 || 'Huyện',
          });
        }
        break;
      }
      default:
        setSelectedRegion(selection as SelectedRegion);
        break;
    }
  };

  const styleFeature = (feature: any) => {
    const name = feature.properties.NAME_3?.trim();
    const region = regionColors.find((r) => r.name === name);
    const salinityRisk = salinityRiskByRegion[safeNormalize(name)];
    const lname = name || '';
    const isGoCongGroup =
      lname.includes('Gò Công') ||
      lname.includes('Go Cong') ||
      lname.includes('Tân Phú Ðông') ||
      lname.includes('Tan Phu Dong');
    const goCongGroupColor = '#1982c4';
    const fillColor = isGoCongGroup
      ? goCongGroupColor
      : region
        ? region.color
        : '#cccccc';
    const isFullProvinceView = currentZoom <= 10.5;

    let isSelected = false;
    if (selectedRegion) {
      if (selectedRegion.type === 'Vùng') {
        const regionNamesInSelectedZone = zoneMap[selectedRegion.name] || [];
        const normalizedNames = regionNamesInSelectedZone.map(safeNormalize);
        if (normalizedNames.includes(safeNormalize(name))) {
          isSelected = true;
        }
      } else {
        if (safeNormalize(selectedRegion.name) === safeNormalize(name)) {
          isSelected = true;
        }
      }
    }

    if (isFullProvinceView && !selectedRegion) {
      const provinceColor = salinityRisk?.color ?? '#76B0FD';
      return {
        color: '#ffffff',
        weight: 1,
        fillColor: provinceColor,
        fillOpacity: salinityRisk ? 0.62 : 0.5,
      };
    } else {
      return {
        color: isSelected ? '#2563eb' : '#ffffff',
        weight: isSelected ? 3 : 1,
        fillColor: salinityRisk?.color ?? fillColor,
        fillOpacity: isSelected ? 0.82 : salinityRisk ? 0.58 : 0.45,
      };
    }
  };

  const onEachFeature = (feature: any, layer: any) => {
    const name = feature.properties.NAME_3?.trim();
    const type = feature.properties.TYPE_3 || '';

    layer.bindPopup(`
      <div style="text-align: center;">
        <b style="font-size: 14px;">${type} ${name}</b>
        ${
          salinityRiskByRegion[safeNormalize(name)]
            ? `<p style="margin: 4px 0; font-size: 12px; color: #333;">
                ${salinityRiskByRegion[safeNormalize(name)].label}
                ${
                  salinityRiskByRegion[safeNormalize(name)].salinity !== null
                    ? `: ${salinityRiskByRegion[safeNormalize(name)].salinity?.toFixed(2)} g/l`
                    : ''
                }
              </p>
              <p style="margin: 4px 0; font-size: 11px; color: #666;">
                Theo trạm gần nhất: ${salinityRiskByRegion[safeNormalize(name)].stationName}
              </p>`
            : ''
        }
        <p style="margin: 4px 0; font-size: 12px; color: #666;">Nhấp để phóng to vùng này</p>
      </div>
    `);

    layer.on({
      mouseover: (e: any) => {
        const isFullProvinceView = currentZoom <= 10.5;
        if (isFullProvinceView && !selectedRegion) {
          e.target.setStyle({ weight: 2, fillOpacity: 0.8 });
        } else if (selectedRegion && selectedRegion.name === name) {
          e.target.setStyle({ weight: 4, fillOpacity: 0.9 });
        } else {
          e.target.setStyle({ weight: 2, fillOpacity: 0.75 });
        }
        if (!e.target.isPopupOpen()) {
          e.target.openPopup();
        }
      },
      mouseout: (e: any) => {
        if (geoJsonLayerRef.current) {
          geoJsonLayerRef.current.resetStyle(e.target);
        }
        e.target.closePopup();
      },
      click: (e: any) => {
        setActiveMarkerId(null);
        setIsMarkerPopupOpen(false);
        setSecondPopupOpen(false);

        const map = e.target._map;
        setSelectedRegion({ name, type });
        map.fitBounds(e.target.getBounds(), {
          padding: [50, 50],
          maxZoom: 12,
          animate: true,
          duration: 0.8,
        });
      },
    });
  };
  const [secondPopupOpen, setSecondPopupOpen] = useState(false);

  // Track zoom changes to update styling
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const handleZoomEnd = () => {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      if (zoom <= 10.5 && selectedRegion) {
        setSelectedRegion(null);
      }
    };

    const handleMapClick = () => {
      setActiveMarkerId(null);
      setIsMarkerPopupOpen(false);
      setSecondPopupOpen(false);

      if (mapRef.current) {
        mapRef.current.closePopup();
      }
    };

    map.on('zoomend', handleZoomEnd);
    map.on('click', handleMapClick);
    return () => {
      map.off('zoomend', handleZoomEnd);
      map.off('click', handleMapClick);
    };
  }, [selectedRegion]);

  return (
    <div className="relative">
      <style>{`
        .custom-marker-popup, .leaflet-popup-pane, .leaflet-popup-content-wrapper {
          z-index: 10000 ;
        }
        /* Bỏ phần viền/shadow mặc định của Leaflet popup */
        .leaflet-popup-content-wrapper {
          padding: 0;
          background-color: transparent;
          box-shadow: none;
        }
        .leaflet-popup-content {
          margin: 0;
        }
      `}</style>

      <SearchBarMap
        provinceData={provinceDataForSearch}
        mapRef={mapRef}
        onRegionSelect={handleSearchSelection}
        isMarkerPopupOpen={isMarkerPopupOpen}
      />

      {/* Selected Region Info Panel (responsive to avoid overlapping mobile search) */}
      {selectedRegion && (
        <div
          className={
            'absolute z-[1000] rounded-lg border border-gray-200 bg-white/95 shadow-lg backdrop-blur-sm ' +
            'px-3 py-1 sm:px-4 ' +
            // On small screens place near bottom (above custom zoom); on md+ keep top-right
            // note: unset bottom on md+ to avoid stretching from top to bottom
            'bottom-20 left-3 right-3 md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-auto'
          }
          style={{ maxWidth: 'min(95%, 420px)' }}
          role="region"
          aria-label={`Selected region: ${selectedRegion.type} ${selectedRegion.name}`}
        >
          <div className="flex w-full items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Chọn:</span>
              <span
                className="truncate text-sm font-bold text-blue-600"
                title={`${selectedRegion.type} ${selectedRegion.name}`}
              >
                {selectedRegion.type} {selectedRegion.name}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedRegion(null);
                if (mapRef.current) {
                  mapRef.current.setView(center, 10, { animate: true });
                }
              }}
              className="ml-auto text-lg leading-none text-gray-500 hover:text-gray-700 sm:ml-2"
              title="Đặt lại khung nhìn"
              aria-label="Đặt lại khung nhìn"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-xs text-gray-700 shadow-lg backdrop-blur-sm">
        <div className="mb-2 font-semibold text-gray-800">
          Bản đồ độ mặn
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[#16a34a]" />
            <span>An toàn (&lt; 1 g/l)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[#f59e0b]" />
            <span>Cần theo dõi (1-4 g/l)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[#dc2626]" />
            <span>Mặn cao (&ge; 4 g/l)</span>
          </div>
        </div>
      </div>

      <div
        style={{
          height: '500px',
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <MapContainer
          center={center}
          zoom={10}
          minZoom={9}
          maxZoom={13}
          maxBounds={maxBounds}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
          inertia={true}
          inertiaDeceleration={2000}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <CustomZoomControl />

          {geoData && (
            <GeoJSON
              key={`${selectedRegion?.name || 'all'}-${currentZoom}`}
              ref={geoJsonLayerRef as any}
              data={geoData}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          )}

          {/* --- Render markers từ API --- */}
          {!isLoadingMarkers &&
            markers.map((marker) => {
              // Xác định xem marker này có đang active không
              const isSelected = activeMarkerId === marker.id;

              const state = getSalinityState(marker.salinity);

              let color = '#2b6cb0'; // Mặc định (unknown)
              if (state.level === 'warning') color = '#d32f2f'; // Đỏ
              if (state.level === 'caution') color = '#ff5722'; // Vàng/Cam
              if (state.level === 'safe') color = '#16A34A'; // Xanh

              return (
                <CircleMarker
                  key={marker.id}
                  pane="markerPane"
                  center={[marker.lat, marker.lng]}
                  radius={isSelected ? 12 : 8}
                  pathOptions={{
                    color: color, // Màu viền
                    fillColor: color, // Màu nền
                    fillOpacity: isSelected ? 1 : 0.95,
                    weight: isSelected ? 3 : 1,
                  }}
                  eventHandlers={{
                    click: (e) => {
                      // Set state ngay khi click marker, reset secondPopup
                      e.originalEvent.stopPropagation();
                      setActiveMarkerId(marker.id);
                      setIsMarkerPopupOpen(true);
                      setSecondPopupOpen(false);
                    },
                    mouseover: (e) => {
                      const layer = e.target;
                      if (!isSelected) {
                        try {
                          layer.bringToFront();
                        } catch (err) {
                          void err;
                        }
                        try {
                          if (typeof layer.setRadius === 'function')
                            layer.setRadius(12);
                        } catch (err) {
                          void err;
                        }
                        try {
                          layer.setStyle({ weight: 3, fillOpacity: 1 });
                        } catch (err) {
                          void err;
                        }
                      }
                    },
                    mouseout: (e) => {
                      const layer = e.target;
                      if (!isSelected) {
                        try {
                          if (typeof layer.setRadius === 'function')
                            layer.setRadius(8);
                        } catch (err) {
                          void err;
                        }
                        try {
                          layer.setStyle({ weight: 1, fillOpacity: 0.95 });
                        } catch (err) {
                          void err;
                        }
                      }
                    },
                  }}
                >
                  <Popup
                    className="custom-marker-popup"
                    eventHandlers={{
                      add: () => {
                        setActiveMarkerId(marker.id);
                        setIsMarkerPopupOpen(true);
                        setSecondPopupOpen(false);
                      },
                      remove: () => {
                        setActiveMarkerId(null);
                        setIsMarkerPopupOpen(false);
                        setSecondPopupOpen(false);
                      },
                    }}
                  >
                    <SalinityPopup
                      locationName={marker.name}
                      locationType={marker.type}
                      salinity={marker.salinity}
                      waterLevel={marker.waterLevel}
                      timestamp={marker.timestamp}
                      secondPopup={() => setSecondPopupOpen(true)}
                    />
                  </Popup>
                  {secondPopupOpen && activeMarkerId === marker.id && (
                    <SecondPopup
                      onClose={() => setSecondPopupOpen(false)}
                      activeMarker={marker}
                    />
                  )}
                </CircleMarker>
              );
            })}
        </MapContainer>
      </div>
    </div>
  );
}
