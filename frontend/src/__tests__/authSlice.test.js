import { describe, it, expect, beforeEach, vi } from 'vitest';
import authReducer, { loginSuccess, logout, setTokenFromOAuth } from '../store/slices/authSlice';

describe('authSlice reducer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return initial state with no token', () => {
    const state = authReducer(undefined, { type: 'unknown' });
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('should handle loginSuccess with token string', () => {
    const token = 'mock-jwt-token-12345';
    const state = authReducer(undefined, loginSuccess(token));
    expect(state.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe(token);
  });

  it('should handle loginSuccess with user object and access_token', () => {
    const payload = {
      access_token: 'mock-access-token',
      user: { id: 'user-1', name: 'Ramesh Patel', role: 'FARMER' }
    };
    const state = authReducer(undefined, loginSuccess(payload));
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(payload.user);
    expect(localStorage.getItem('token')).toBe('mock-access-token');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(payload.user);
  });

  it('should handle logout and clear state and localStorage', () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Farmer' }));

    const previousState = {
      user: { name: 'Farmer' },
      isAuthenticated: true,
      loading: false,
      error: null
    };

    const state = authReducer(previousState, logout());
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should handle setTokenFromOAuth', () => {
    const token = 'oauth-callback-token';
    const state = authReducer(undefined, setTokenFromOAuth(token));
    expect(state.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe(token);
  });
});
