const env = import.meta.env;

export const PRODUCTION = env.VITE_APP_PRODUCTION === 'true';
export const API_URL = env.VITE_APP_API_URL;
export const BACKEND_URL = env.VITE_BACKEND_URL;
export const GOOGLE_OAUTH_CLIENT_ID = env.VITE_APP_GOOGLE_OAUTH_CLIENT_ID;
export const DEFAULT_DATA_DATETIME = env.VITE_DEFAULT_DATA_DATETIME;
const publicBaseUrl = env.BASE_URL || '/';
export const MAP_GEOJSON_URL =
  env.VITE_MAP_GEOJSON_URL || `${publicBaseUrl}data/tien_giang.geojson`;
export const MAP_CONTEXT_URL =
  env.VITE_MAP_CONTEXT_URL || `${publicBaseUrl}data/context.json`;
