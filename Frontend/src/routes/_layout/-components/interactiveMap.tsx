import { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CustomZoomControl from "./customZoomControl";
import SearchBarMap from "./searchBarMap";
import SalinityPopup from "./salinityPopup"; 
import SecondPopup from "./secondPopup";
import axios from "axios";

const regionColors = [
  { name: "Cái Bè", color: "#ff595e" },
  { name: "Cai Lậy", color: "#8ac926" },
  { name: "Châu Thành", color: "#f72585" },
  { name: "Chợ Gạo", color: "#4361ee" },
  { name: "Gò Công Ðông", color: "#E5FFCC" },
  { name: "Gò Công Tây", color: "#7209b7" },
  { name: "Tân Phú Ðông", color: "#4c0099" },
  { name: "Tân Phước", color: "#90be6d" },
  { name: "Mỹ Tho", color: "#ffca3a" },
  { name: "Go Cong", color: "#1982c4" },
  { name: "Cai Lậy", color: "#6a4c93" },
  { name: "Tân Phước", color: "#ffca3a" },
];

// === API CONFIGURATION ===
const backendURL = import.meta.env.VITE_BACKEND_URL;
const markersDataURL = `${backendURL}/api/data/positions`;

// Fetch positions from API
const fetchMarkersData = async () => {
  try {
    const response = await axios.get(markersDataURL);
    // API may return either an array directly or an object like { success: true, data: [...] }
    if (!response || !response.data) return [];
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data.data)) return response.data.data;
    // fallback: try to find array in response.data
    for (const key of Object.keys(response.data)) {
      if (Array.isArray(response.data[key])) return response.data[key];
    }
    return [];
  } catch (error) {
    console.error("Lỗi tải dữ liệu vị trí marker:", error);
    return [];
  }
};

// Fetch latest data for a specific position (updated to use selectedTime)
const fetchLatestDataForPosition = async (positionId, targetDate) => {
  try {
    // Format date for API
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    const dateStr = `${year}-${month}-${day}`;
    
    // Fetch toàn bộ ngày
    const url = `${backendURL}/api/data/date-range/${dateStr}/00:00:00/23:59:59/${positionId}`;
    const response = await axios.get(url);
    if (response.data.success && response.data.data && response.data.data.length > 0) {
      // Tìm điểm gần nhất với targetDate
      const targetTime = targetDate.getTime();
      const dataWithTime = response.data.data.map(d => ({
        ...d,
        _time: new Date(d.datetime).getTime()
      }));
      
      // Sắp xếp theo thời gian
      dataWithTime.sort((a, b) => a._time - b._time);
      
      // Tìm điểm gần nhất không vượt quá targetTime
      let closest = dataWithTime[0];
      for (const d of dataWithTime) {
        if (d._time <= targetTime) {
          closest = d;
        } else {
          break;
        }
      }
      
      return closest;
    }
    return null;
  } catch (error) {
    console.error(`Lỗi tải dữ liệu cho position ${positionId}:`, error);
    return null;
  }
};


const getSalinityState = (salinityValue) => {
  const s = parseFloat(salinityValue);
  if (isNaN(s)) {
    return { level: 'unknown' };
  }
  if (s >= 4.0) {
    return { level: 'warning' };
  }
  if (s >= 1.0) {
    return { level: 'caution' };
  }
  return { level: 'safe' };
};
// === KẾT THÚC PHẦN SỬA LỖI ===


export default function InteractiveMap({ selectedTime }) {
  const [geoData, setGeoData] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null); 
  const [zones, setZones] = useState([]); 
  const [zoneMap, setZoneMap] = useState({}); 
  const [province, setProvince] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(10);
  
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [isMarkerPopupOpen, setIsMarkerPopupOpen] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(true);

  const mapRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  
  // Dùng selectedTime từ props, hoặc default
  const effectiveTime = selectedTime || new Date('2020-08-29T10:00:00');
  
  const center = [10.4125, 106.2614];
  const maxBounds = L.latLngBounds([9.9, 105.6], [11.0, 107.0]);
  
  const safeNormalize = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  useEffect(() => {
    fetch("/data/tien_giang.geojson")
  .then((res) => res.json())
  .then((data) => setGeoData(data))
  .catch(() => console.error("Lỗi tải GeoJSON"));
  }, []);

  // Fetch positions và data từ API - refetch khi selectedTime thay đổi
  useEffect(() => {
    const loadMarkersData = async () => {
      setIsLoadingMarkers(true);
      try {
        // 1. Fetch tất cả positions
        const positions = await fetchMarkersData();
        console.log('Raw positions fetched:', positions, 'Type:', typeof positions, 'IsArray:', Array.isArray(positions), 'Length:', positions?.length);
        
        if (!positions || !Array.isArray(positions) || positions.length === 0) {
          console.log("Không có positions nào hoặc positions không phải mảng");
          setMarkers([]);
          setIsLoadingMarkers(false);
          return;
        }

        // 2. Fetch data cho từng position tại thời điểm effectiveTime
        console.debug('Fetched positions:', positions);
        console.log('Fetching marker data for time:', effectiveTime);
        const markersWithData = (await Promise.all(
          positions.map(async (position) => {
            const latestData = await fetchLatestDataForPosition(position.id, effectiveTime);

            // API returns lat/lng swapped: their "lng" is actually latitude, "lat" is longitude
            // Try several possible field names for coordinates
            const latCandidates = [position.Latitude, position.latitude, position.lng, position.latitutde, position.Lat, position.y];
            const lngCandidates = [position.Longitude, position.longitude, position.lat, position.long, position.Long, position.x];

            let lat = null;
            let lng = null;

            const parseCoord = (v) => {
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
                lat = p.lat; lng = p.lng; break;
              }
              if (p !== null && typeof p === 'number' && !isNaN(p)) { lat = p; break; }
            }
            for (const c of lngCandidates) {
              const p = parseCoord(c);
              if (p && typeof p === 'object' && p.lng !== undefined) { lng = p.lng; break; }
              if (p !== null && typeof p === 'number' && !isNaN(p)) { lng = p; break; }
            }

            // If still null, try splitting a combined field like position.coordinates or position.location
            if ((lat === null || lng === null) && typeof position.coordinates === 'string') {
              const parts = position.coordinates.split(',');
              if (parts.length >= 2) {
                const a = parseFloat(parts[0]);
                const b = parseFloat(parts[1]);
                if (!isNaN(a) && !isNaN(b)) { lat = a; lng = b; }
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
              rawData: latestData
            };
            
            console.debug('Prepared marker:', marker);
            return marker;
          })
        ))
          // filter out invalid coordinates (0,0 or NaN) which are outside our province bounds
          .filter(m => Number.isFinite(m.lat) && Number.isFinite(m.lng) && !(m.lat === 0 && m.lng === 0));

        console.debug('Markers prepared:', markersWithData);
        setMarkers(markersWithData);

        // Auto-fit map to markers if any
        if (markersWithData.length > 0 && mapRef.current) {
          try {
            const bounds = L.latLngBounds(markersWithData.map(m => [m.lat, m.lng]));
            if (bounds.isValid()) {
              mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
            }
          } catch (err) {
            console.warn('Could not fit map to markers:', err);
          }
        }
      } catch (error) {
        console.error("Lỗi khi load markers:", error);
        setMarkers([]);
      } finally {
        setIsLoadingMarkers(false);
      }
    };

    loadMarkersData();
  }, [effectiveTime]);

  useEffect(() => {
    fetch('/data/context.json')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.province) setProvince(data.province);
        if (data && Array.isArray(data.zones)) {
          setZones(data.zones); 
          const newZoneMap = {};
          data.zones.forEach(z => {
            newZoneMap[z.zoneName] = z.regions;
          });
          setZoneMap(newZoneMap);
        }
      })
      .catch(() => {
        console.error("Lỗi tải context.json");
      });
  }, []);

  const findFeaturesByNames = (geoJson, namesToFind) => {
    if (!geoJson || !geoJson.features || !namesToFind) return [];
    const normalizedNames = namesToFind.map(safeNormalize);
    return geoJson.features.filter((f) => {
      const nameProp = f?.properties?.NAME_3 || f?.properties?.NAME_2 || '';
      return normalizedNames.includes(safeNormalize(nameProp));
    });
  };

  const provinceDataForSearch = useMemo(() => {
    if (!province || !geoData || zones.length === 0) {
      return {};
    }
    return {
      [province]: { 
        geoData: geoData,
        zones: zones 
      }
    };
  }, [geoData, zones, province]);

  const handleSearchSelection = (selection) => {
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
          const featureGroup = L.featureGroup(features.map(f => L.geoJSON(f)));
          const bounds = featureGroup.getBounds();
          if (bounds && bounds.isValid()) {
            mapRef.current.fitBounds(bounds, {
              padding: [50, 50], maxZoom: 12, animate: true, duration: 0.8
            });
          }
        }
        setSelectedRegion({ name: zoneName, type: "Vùng" });
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
              padding: [50, 50], maxZoom: 12, animate: true, duration: 0.8
            });
          }
          setSelectedRegion({ 
            name: feature.properties.NAME_3 || regionName, 
            type: feature.properties.TYPE_3 || 'Huyện' 
          });
        }
        break;
      }
      default:
        setSelectedRegion(selection);
        break;
    }
  };


  const styleFeature = (feature) => {
    const name = feature.properties.NAME_3?.trim();
    const region = regionColors.find((r) => r.name === name);
    const lname = (name || '');
    const isGoCongGroup = lname.includes('Gò Công') || lname.includes('Go Cong') || lname.includes('Tân Phú Ðông') || lname.includes('Tan Phu Dong');
    const goCongGroupColor = '#1982c4';
    const fillColor = isGoCongGroup ? goCongGroupColor : (region ? region.color : "#cccccc");
    const isFullProvinceView = currentZoom <= 10.5;

    let isSelected = false;
    if (selectedRegion) {
      if (selectedRegion.type === "Vùng") {
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
      const provinceColor = "#76B0FD";
      return {
        color: provinceColor, weight: 1, fillColor: provinceColor, fillOpacity: 1,
      };
    } else {
      return {
        color: isSelected ? "#2563eb" : fillColor,
        weight: isSelected ? 3 : 1,
        fillColor,
        fillOpacity: isSelected ? 0.8 : 0.6,
      };
    }
  };

  const onEachFeature = (feature, layer) => {
    const name = feature.properties.NAME_3?.trim();
    const type = feature.properties.TYPE_3 || ""; 

    layer.bindPopup(`
      <div style="text-align: center;">
        <b style="font-size: 14px;">${type} ${name}</b>
        <p style="margin: 4px 0; font-size: 12px; color: #666;">Nhấp để phóng to vùng này</p>
      </div>
    `);

    layer.on({
      mouseover: (e) => {
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
      mouseout: (e) => {
        if (geoJsonLayerRef.current) {
          geoJsonLayerRef.current.resetStyle(e.target);
        }
        e.target.closePopup();
      },
      click: (e) => {
        setActiveMarkerId(null);
        setIsMarkerPopupOpen(false);
        setSecondPopupOpen(false);

        const map = e.target._map;
        setSelectedRegion({ name, type }); 
        map.fitBounds(e.target.getBounds(), {
          padding: [50, 50], maxZoom: 12, animate: true, duration: 0.8
        });
      }
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
            "absolute z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 " +
            "px-3 py-1 sm:px-4 " +
            // On small screens place near bottom (above custom zoom); on md+ keep top-right
            // note: unset bottom on md+ to avoid stretching from top to bottom
            "left-3 right-3 bottom-20 md:bottom-auto md:top-4 md:right-4 md:left-auto md:w-auto"
          }
          style={{ maxWidth: 'min(95%, 420px)' }}
          role="region"
          aria-label={`Selected region: ${selectedRegion.type} ${selectedRegion.name}`}
        >
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-semibold text-sm text-gray-700">Chọn:</span>
              <span className="text-sm font-bold text-blue-600 truncate" title={`${selectedRegion.type} ${selectedRegion.name}`}>{selectedRegion.type} {selectedRegion.name}</span>
            </div>
            <button
              onClick={() => {
                setSelectedRegion(null);
                if (mapRef.current) {
                  mapRef.current.setView(center, 10, { animate: true });
                }
              }}
              className="ml-auto sm:ml-2 text-gray-500 hover:text-gray-700 text-lg leading-none"
              title="Đặt lại khung nhìn"
              aria-label="Đặt lại khung nhìn"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          height: "500px",
          width: "100%",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
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
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          zoomControl={false}
          whenCreated={(map) => {
            try {
              map.setMaxBounds(maxBounds);
              map.options.maxBoundsViscosity = 1.0;
              if (!map.getPane('markerPane')) {
                map.createPane('markerPane');
                const p = map.getPane('markerPane');
                if (p) p.style.zIndex = 650;
              }
            } catch {
              // ignore
            }
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <CustomZoomControl />

          {geoData && (
            <GeoJSON
              key={`${selectedRegion?.name || 'all'}-${currentZoom}`}
              ref={geoJsonLayerRef}
              data={geoData}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          )}

          
          {/* --- Render markers từ API --- */}
          {!isLoadingMarkers && markers.map((marker) => {
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
                  weight: isSelected ? 3 : 1
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
                      try { layer.bringToFront(); } catch (err) { void err; }
                      try { if (typeof layer.setRadius === 'function') layer.setRadius(12); } catch (err) { void err; }
                      try { layer.setStyle({ weight: 3, fillOpacity: 1 }); } catch (err) { void err; }
                    }
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    if (!isSelected) {
                      try { if (typeof layer.setRadius === 'function') layer.setRadius(8); } catch (err) { void err; }
                      try { layer.setStyle({ weight: 1, fillOpacity: 0.95 }); } catch (err) { void err; }
                    }
                  },
                }}
              >
                <Popup
                  className="custom-marker-popup"
                  onOpen={() => {
                    setActiveMarkerId(marker.id);
                    setIsMarkerPopupOpen(true);
                    setSecondPopupOpen(false);
                  }}
                  onClose={() => {
                    setActiveMarkerId(null);
                    setIsMarkerPopupOpen(false);
                    setSecondPopupOpen(false);
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