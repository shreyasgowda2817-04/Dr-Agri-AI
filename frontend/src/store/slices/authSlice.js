import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import api from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'https://dr-agri-ai.onrender.com/api/v1';

// Restore the farmer's session automatically across page refreshes and browser restarts
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem('token');

    // Step 1: If an access token exists in storage, verify if it is still valid
    if (token) {
      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        return { user: response.data, token };
      } catch (err) {
        // Access token expired, proceed to refresh via HttpOnly cookie
        console.log("Access token expired, attempting session restore via refresh cookie...");
      }
    }

    // Step 2: Attempt to restore session using the HttpOnly refresh token cookie
    try {
      const refreshResponse = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const { access_token, user } = refreshResponse.data;
      if (access_token) {
        localStorage.setItem('token', access_token);
        return { user, token: access_token };
      }
      return rejectWithValue('No token returned');
    } catch (refreshErr) {
      localStorage.removeItem('token');
      return rejectWithValue('No active session found');
    }
  }
);

// Fetch updated user profile
export const fetchUser = createAsyncThunk(
  'auth/fetchUser',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem('token');
    if (!token) return rejectWithValue('No token found');

    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Session expired');
    }
  }
);

// Logout user: revokes session in backend database, clears cookies, and resets state
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { dispatch }) => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn("Server logout request error:", err);
    } finally {
      localStorage.removeItem('token');
      dispatch(authSlice.actions.logout());
    }
  }
);

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true, // Remains true while initial session verification is active
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const payload = action.payload;
      if (typeof payload === 'string') {
        localStorage.setItem('token', payload);
        state.isAuthenticated = true;
      } else if (payload && payload.access_token) {
        localStorage.setItem('token', payload.access_token);
        if (payload.user) {
          state.user = payload.user;
        }
        state.isAuthenticated = true;
      }
      state.loading = false;
      state.error = null;
    },
    logout: (state) => {
      localStorage.removeItem('token');
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    setTokenFromOAuth: (state, action) => {
      localStorage.setItem('token', action.payload);
      state.isAuthenticated = true;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // restoreSession
      .addCase(restoreSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      })
      // fetchUser
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(fetchUser.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { loginSuccess, logout, setTokenFromOAuth } = authSlice.actions;
export default authSlice.reducer;
