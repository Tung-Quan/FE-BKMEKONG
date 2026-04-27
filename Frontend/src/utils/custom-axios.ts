import axios from 'axios';

import { API_URL, BACKEND_URL } from '@/config/env';
import storage from '@/helpers/storage';

const instance = axios.create({
  baseURL: BACKEND_URL || API_URL,
  withCredentials: true,
});

instance.interceptors.request.use(
  (config) => {
    const token: string | null = storage.getItem('token');
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    console.error('Error in axios');
    Promise.reject(error);
  }
);

export default instance;
