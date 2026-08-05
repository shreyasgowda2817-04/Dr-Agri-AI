import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds timeout for ML Inference + Image Uploads
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 token expiration globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Token expired or unauthorized. Logging out...");
      localStorage.removeItem('token');
      // Dispatch a custom event so the React app can pick it up and redirect
      window.dispatchEvent(new Event('auth:unauthorized'));
      // Fallback redirect if event listener isn't caught
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
