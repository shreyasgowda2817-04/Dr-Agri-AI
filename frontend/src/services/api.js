import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://dr-agri-ai.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send and receive HttpOnly cookies across origins
  timeout: 60000, // 60 seconds timeout for ML Inference + Image Uploads
});

// Add a request interceptor to attach the JWT access token
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

// Token refresh mutex and queue to handle concurrent 401s without race conditions
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add a response interceptor to handle token refresh and 401 gracefully
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If no response or already retried, reject immediately
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    // Do NOT intercept auth endpoints to avoid loops
    const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
    const isAuthEndpoint = authEndpoints.some((ep) => originalRequest.url?.includes(ep));

    if (error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue pending request while refresh is in flight
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const storedRefreshToken = localStorage.getItem('refreshToken');

      try {
        const refreshHeaders = {};
        if (storedRefreshToken) {
          refreshHeaders['X-Refresh-Token'] = storedRefreshToken;
        }

        // Call refresh endpoint with stored refresh token (body + header) AND HttpOnly cookie
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          { refresh_token: storedRefreshToken || undefined },
          {
            headers: refreshHeaders,
            withCredentials: true,
          }
        );

        const { access_token, refresh_token: newRefreshToken, user } = refreshResponse.data;
        if (access_token) {
          localStorage.setItem('token', access_token);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }

          api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
          originalRequest.headers.Authorization = `Bearer ${access_token}`;

          processQueue(null, access_token);
          return api(originalRequest);
        } else {
          throw new Error('No access token received from refresh session');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Only log out if server explicitly returned 401/403 (invalid or revoked session)
        if (refreshError.response && (refreshError.response.status === 401 || refreshError.response.status === 403)) {
          console.warn('Session expired or revoked. Logging out...');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.dispatchEvent(new Event('auth:unauthorized'));
        } else {
          console.warn('Refresh request failed due to network or server timeout. Retaining session.');
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
