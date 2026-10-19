import { describe, it, expect, beforeEach, vi } from 'vitest';
import authReducer, { loginSuccess, logout, setTokenFromOAuth, isTokenExpired } from '../store/slices/authSlice';

describe('authSlice reducer and persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return initial state with no token', () => {
    const state = authReducer(undefined, { type: 'unknown' });
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('should handle loginSuccess with token string', () => {
    const token = 'mock-jwt-token-12345';
    const state = authReducer(undefined, loginSuccess(token));
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe(token);
    expect(localStorage.getItem('token')).toBe(token);
  });

  it('should handle loginSuccess with user object, access_token and refresh_token', () => {
    const payload = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: { id: 'user-1', name: 'Ramesh Patel', role: 'FARMER' }
    };
    const state = authReducer(undefined, loginSuccess(payload));
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('mock-access-token');
    expect(state.refreshToken).toBe('mock-refresh-token');
    expect(state.user).toEqual(payload.user);
    expect(localStorage.getItem('token')).toBe('mock-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(payload.user);
  });

  it('should handle logout and clear state and localStorage including refreshToken', () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem('refreshToken', 'existing-refresh-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Farmer' }));

    const previousState = {
      user: { name: 'Farmer' },
      token: 'existing-token',
      refreshToken: 'existing-refresh-token',
      isAuthenticated: true,
      loading: false,
      error: null
    };

    const state = authReducer(previousState, logout());
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should handle setTokenFromOAuth with token string', () => {
    const token = 'oauth-callback-token';
    const state = authReducer(undefined, setTokenFromOAuth(token));
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe(token);
    expect(localStorage.getItem('token')).toBe(token);
  });

  it('should handle setTokenFromOAuth with both token and refreshToken', () => {
    const payload = {
      token: 'oauth-access-token',
      refreshToken: 'oauth-refresh-token'
    };
    const state = authReducer(undefined, setTokenFromOAuth(payload));
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('oauth-access-token');
    expect(state.refreshToken).toBe('oauth-refresh-token');
    expect(localStorage.getItem('token')).toBe('oauth-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('oauth-refresh-token');
  });

  describe('isTokenExpired utility', () => {
    it('returns true for missing or invalid tokens', () => {
      expect(isTokenExpired(null)).toBe(true);
      expect(isTokenExpired('')).toBe(true);
      expect(isTokenExpired('invalid-token')).toBe(true);
    });

    it('returns true for expired JWT', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payloadBase64 = btoa(JSON.stringify({ exp: pastExp }));
      const token = `header.${payloadBase64}.signature`;
      expect(isTokenExpired(token)).toBe(true);
    });

    it('returns false for fresh unexpired JWT', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
      const payloadBase64 = btoa(JSON.stringify({ exp: futureExp }));
      const token = `header.${payloadBase64}.signature`;
      expect(isTokenExpired(token)).toBe(false);
    });
  });
});
