# API Description (Frontend ↔ Backend)

## Base URL

Frontend resolves backend base URL in this order:

1. `VITE_BACKEND_URL`
2. `VITE_APP_API_URL`

## Environment Variables

- `VITE_BACKEND_URL`: Main backend URL.
- `VITE_APP_API_URL`: Fallback backend URL.
- `VITE_DEFAULT_DATA_DATETIME`: Optional default datetime for dashboard time selector (ISO format).
- `VITE_MAP_GEOJSON_URL`: Optional map GeoJSON endpoint/file URL.
- `VITE_MAP_CONTEXT_URL`: Optional map context endpoint/file URL.

Example:

```env
VITE_BACKEND_URL=http://localhost:3001
VITE_APP_API_URL=http://localhost:3001
VITE_DEFAULT_DATA_DATETIME=2024-01-01T10:00:00
VITE_MAP_GEOJSON_URL=/data/tien_giang.geojson
VITE_MAP_CONTEXT_URL=/data/context.json
```

---

## 1) Get Positions

### Endpoint

`GET /api/data/positions`

### Purpose

Returns all monitoring positions/stations used by map and charts.

### Expected response (accepted formats)

Frontend accepts:

- Array directly
- Object with `data` array
- Object containing any array field

### Recommended response shape

```json
{
  "success": true,
  "data": [
    {
      "id": "station-1",
      "name": "Trạm A",
      "latitude": 10.35,
      "longitude": 106.26,
      "distanceKm": 2.5,
      "type": "CỐNG"
    }
  ]
}
```

### Fields used by frontend

- `id` (required)
- `name` (required)
- coordinate candidates (one of):
  - `latitude` + `longitude`
  - `lat` + `lng`
  - `Latitude` + `Longitude`
  - `coordinates` string: `"lat,lng"`
- optional:
  - `label`
  - `type`
  - `distanceKm` or `distance_km`

---

## 2) Get Position Data by Date Range

### Endpoint

`GET /api/data/date-range/:date/:startTime/:endTime/:positionId`

### Parameters

- `date`: `YYYY-M-D` (example: `2026-4-24`)
- `startTime`: `HH:mm:ss`
- `endTime`: `HH:mm:ss`
- `positionId`: position ID

Example:
`GET /api/data/date-range/2026-4-24/00:00:00/23:59:59/station-1`

### Purpose

Returns timeseries observation records for one position in one day/time range.

### Recommended response shape

```json
{
  "success": true,
  "data": [
    {
      "id": "obs-1",
      "station_id": "station-1",
      "station_name": "Trạm A",
      "datetime": "2026-04-24T10:00:00Z",
      "salinity": 1.23,
      "water_level": 0.45
    }
  ]
}
```

### Fields used by frontend

- `datetime` (required)
- `salinity` (optional, number or numeric string)
- `water_level` (optional, number or numeric string)
- optional IDs and names:
  - `id`
  - `station_id`
  - `station_name`

---

## Frontend Behavior Notes

- Map marker popup and chart points are computed from backend response only.
- For selected time, frontend chooses the nearest record at or before that time.
- If no valid records are returned, frontend shows empty-state UI.
- Static map files can be moved to backend by setting:
  - `VITE_MAP_GEOJSON_URL`
  - `VITE_MAP_CONTEXT_URL`

---

## Source of truth in code

- API client: [src/utils/backend-api.ts](src/utils/backend-api.ts)
- Shared API types: [src/types/api.types.ts](src/types/api.types.ts)
- Dashboard data mapping: [src/utils/homePage.ts](src/utils/homePage.ts)
