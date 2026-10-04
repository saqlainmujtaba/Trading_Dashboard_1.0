import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.hasSessionToken = true;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const renewedToken = response.headers['x-auth-token'];
    if (renewedToken) {
      localStorage.setItem('token', renewedToken);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && error.config?.hasSessionToken) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
