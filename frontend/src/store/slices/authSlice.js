import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import api from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://dr-agri-ai.onrender.com/api/v1';

// Safe localStorage helpers that never throw in private/sandboxed environments
const getStoredItem = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      return window.localStorage.getItem(key);
    }
  } catch (e) {}
  return null;
};

const setStoredItem = (key, val) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem(key, val);
    }
  } catch (e) {}
};

const removeStoredItem = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.removeItem === 'function') {
      window.localStorage.removeItem(key);
    }
  } catch (e) {}
};

// Check if a JWT token is expired using local client timestamp with a 10s grace buffer
export const isTokenExpired = (token) => {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const { exp } = JSON.parse(jsonPayload);
    if (!exp) return false;
    return Date.now() >= (exp * 1000) - 10000;
  } catch (e) {
    return false; // If unable to decode locally, let server validate
  }
};

// Restore the farmer's session automatically across page refreshes, tabs, and browser restarts
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    const token = getStoredItem('token');
    const refreshToken = getStoredItem('refreshToken');

    // Step 1: If an unexpired access token exists in storage, verify/refresh user profile via /auth/me
    if (token && !isTokenExpired(token)) {
      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
          timeout: 10000,
        });
        if (response.data) {
          setStoredItem('user', JSON.stringify(response.data));
          return { user: response.data, token, refreshToken };
        }
      } catch (err) {
        // If network error, timeout, or server sleeping, PRESERVE cached session (offline resilience)
        if (!err.response || err.response.status >= 500 || err.code === 'ERR_NETWORK') {
          console.warn("Server unavailable or warming up. Preserving persistent offline session.");
          const cachedUserStr = getStoredItem('user');
          let cachedUser = null;
          try {
            cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;
          } catch (e) {}
          return { user: cachedUser, token, refreshToken, isOffline: true };
        }
        // 401 error indicates access token expired/invalid, proceed to refresh step
      }
    }

    // Step 2: Attempt to restore session using refreshToken (body + header) AND HttpOnly cookie
    try {
      const refreshHeaders = {};
      if (refreshToken) {
        refreshHeaders['X-Refresh-Token'] = refreshToken;
      }

      const refreshResponse = await axios.post(
        `${API_URL}/auth/refresh`,
        { refresh_token: refreshToken || undefined },
        {
          headers: refreshHeaders,
          withCredentials: true,
          timeout: 15000,
        }
      );

      const { access_token, refresh_token: newRefreshToken, user } = refreshResponse.data;
      if (access_token) {
        setStoredItem('token', access_token);
        const finalRefreshToken = newRefreshToken || refreshToken;
        if (finalRefreshToken) setStoredItem('refreshToken', finalRefreshToken);
        if (user) setStoredItem('user', JSON.stringify(user));
        return { user, token: access_token, refreshToken: finalRefreshToken };
      }
      return rejectWithValue('No token returned');
    } catch (refreshErr) {
      // If network error or server down, DO NOT log out! Keep cached credentials
      if (!refreshErr.response || refreshErr.response.status >= 500 || refreshErr.code === 'ERR_NETWORK') {
        console.warn("Refresh request failed due to network/server timeout. Retaining cached session.");
        const cachedUserStr = getStoredItem('user');
        let cachedUser = null;
        try {
          cachedUser = cachedUserStr ? JSON.parse(cachedUserStr) : null;
        } catch (e) {}
        if (cachedUser || token || refreshToken) {
          return { user: cachedUser, token, refreshToken, isOffline: true };
        }
      }

      // Explicit 401/403: Server confirmed session is revoked or expired
      removeStoredItem('token');
      removeStoredItem('refreshToken');
      removeStoredItem('user');
      return rejectWithValue('Session revoked or expired');
    }
  },
  {
    condition: (_, { getState }) => {
      const { auth } = getState();
      if (auth && auth.isRestoring) {
        return false;
      }
    }
  }
);

// Fetch updated user profile
export const fetchUser = createAsyncThunk(
  'auth/fetchUser',
  async (_, { rejectWithValue }) => {
    const token = getStoredItem('token');
    if (!token) return rejectWithValue('No token found');

    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Session expired');
    }
  }
);

// Logout user: revokes session in backend database, clears cookies and storage, and resets state
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { dispatch }) => {
    const refreshToken = getStoredItem('refreshToken');
    try {
      await api.post(
        '/auth/logout',
        { refresh_token: refreshToken || undefined },
        {
          headers: refreshToken ? { 'X-Refresh-Token': refreshToken } : {},
          withCredentials: true,
        }
      );
    } catch (err) {
      console.warn("Server logout request error:", err);
    } finally {
      removeStoredItem('token');
      removeStoredItem('refreshToken');
      removeStoredItem('user');
      dispatch(authSlice.actions.logout());
    }
  }
);

const savedToken = getStoredItem('token');
const savedRefreshToken = getStoredItem('refreshToken');
const savedUserStr = getStoredItem('user');
let savedUser = null;
try {
  savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
} catch (e) {
  savedUser = null;
}

const initialState = {
  user: savedUser,
  token: savedToken,
  refreshToken: savedRefreshToken,
  isAuthenticated: !!(savedToken || savedRefreshToken),
  isInitializing: true, // Application starts in initializing state until session check finishes
  authLoading: true,    // Alias for isInitializing as required by prompt
  loading: false,       // Non-blocking: background session restoration
  isRestoring: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const payload = action.payload;
      if (typeof payload === 'string') {
        setStoredItem('token', payload);
        state.token = payload;
        state.isAuthenticated = true;
      } else if (payload && (payload.access_token || payload.token)) {
        const token = payload.access_token || payload.token;
        const refreshToken = payload.refresh_token || payload.refreshToken;
        setStoredItem('token', token);
        state.token = token;
        if (refreshToken) {
          setStoredItem('refreshToken', refreshToken);
          state.refreshToken = refreshToken;
        }
        if (payload.user) {
          state.user = payload.user;
          setStoredItem('user', JSON.stringify(payload.user));
        }
        state.isAuthenticated = true;
      }
      state.isInitializing = false;
      state.authLoading = false;
      state.loading = false;
      state.error = null;
    },
    logout: (state) => {
      removeStoredItem('token');
      removeStoredItem('refreshToken');
      removeStoredItem('user');
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isInitializing = false;
      state.authLoading = false;
      state.loading = false;
      state.error = null;
    },
    setTokenFromOAuth: (state, action) => {
      const payload = action.payload;
      if (typeof payload === 'string') {
        setStoredItem('token', payload);
        state.token = payload;
      } else if (payload && payload.token) {
        setStoredItem('token', payload.token);
        state.token = payload.token;
        if (payload.refreshToken) {
          setStoredItem('refreshToken', payload.refreshToken);
          state.refreshToken = payload.refreshToken;
        }
      }
      state.isAuthenticated = true;
      state.isInitializing = false;
      state.authLoading = false;
      state.loading = false;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      if (action.payload) {
        setStoredItem('user', JSON.stringify(action.payload));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // restoreSession runs seamlessly with explicit initialization tracking
      .addCase(restoreSession.pending, (state) => {
        state.isRestoring = true;
        state.isInitializing = true;
        state.authLoading = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        if (action.payload.refreshToken) {
          state.refreshToken = action.payload.refreshToken;
        }
        if (action.payload.user) {
          setStoredItem('user', JSON.stringify(action.payload.user));
        }
        state.isAuthenticated = true;
        state.isRestoring = false;
        state.isInitializing = false;
        state.authLoading = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isRestoring = false;
        state.isInitializing = false;
        state.authLoading = false;
        state.loading = false;
        removeStoredItem('token');
        removeStoredItem('refreshToken');
        removeStoredItem('user');
      })
      // fetchUser
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload;
        if (action.payload) {
          setStoredItem('user', JSON.stringify(action.payload));
        }
        state.isAuthenticated = true;
        state.isInitializing = false;
        state.authLoading = false;
        state.loading = false;
      })
      .addCase(fetchUser.rejected, (state) => {
        state.isInitializing = false;
        state.authLoading = false;
        state.loading = false;
      });
  },
});

export const { loginSuccess, logout, setTokenFromOAuth, setUser } = authSlice.actions;
export default authSlice.reducer;
