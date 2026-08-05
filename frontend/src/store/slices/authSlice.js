import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const fetchUser = createAsyncThunk('auth/fetchUser', async (_, { getState, rejectWithValue }) => {
  const token = localStorage.getItem('token');
  if (!token) return rejectWithValue('No token found');
  
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    localStorage.removeItem('token');
    return rejectWithValue(error.response?.data?.detail || 'Session expired');
  }
});

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      localStorage.setItem('token', action.payload);
      state.isAuthenticated = true;
      state.error = null;
    },
    logout: (state) => {
      localStorage.removeItem('token');
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
    },
    setTokenFromOAuth: (state, action) => {
      localStorage.setItem('token', action.payload);
      state.isAuthenticated = true;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { loginSuccess, logout, setTokenFromOAuth } = authSlice.actions;
export default authSlice.reducer;
