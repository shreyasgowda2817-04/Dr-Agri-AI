import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import Home from '../pages/Home';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import RoleRoute from '../components/layout/RoleRoute';

// Mock framer-motion with Proxy to support all HTML tags
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_, Tag) => ({ children, ...props }) => <Tag {...props}>{children}</Tag>,
    }
  ),
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

const createMockStore = (authState) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isInitializing: false,
        authLoading: false,
        loading: false,
        isRestoring: false,
        error: null,
        ...authState,
      },
    },
  });
};

describe('Persistent Authentication Routing & Initialization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Home Component Landing Page & Session Restore Redirection', () => {
    it('shows loading spinner and avoids flashing landing page when session is initializing', () => {
      const store = createMockStore({
        isInitializing: true,
        authLoading: true,
        isAuthenticated: false,
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<Home />} />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText(/Loading Dr Agri AI/i)).toBeTruthy();
      expect(screen.queryByText(/dr_agri/i)).toBeNull();
    });

    it('renders marketing landing page for a guest/unauthenticated visitor once initialized', () => {
      const store = createMockStore({
        isInitializing: false,
        authLoading: false,
        isAuthenticated: false,
        user: null,
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<Home />} />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.queryByText(/Loading Dr Agri AI/i)).toBeNull();
      expect(screen.getByText('dr_agri')).toBeTruthy();
    });

    it('immediately redirects authenticated farmer directly to /dashboard without showing landing page', () => {
      const store = createMockStore({
        isInitializing: false,
        authLoading: false,
        isAuthenticated: true,
        user: { id: 'u1', name: 'Ramesh', role: 'FARMER' },
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<div>Farmer Dashboard Destination</div>} />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText('Farmer Dashboard Destination')).toBeTruthy();
      expect(screen.queryByText(/platform/i)).toBeNull();
    });

    it('redirects agronomy expert directly to /expert-dashboard when session is restored', () => {
      const store = createMockStore({
        isInitializing: false,
        authLoading: false,
        isAuthenticated: true,
        user: { id: 'u2', name: 'Dr. Rao', role: 'AGRONOMY_EXPERT' },
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/expert-dashboard" element={<div>Expert Dashboard Destination</div>} />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText('Expert Dashboard Destination')).toBeTruthy();
    });
  });

  describe('ProtectedRoute Session Persistence Verification', () => {
    it('shows verifying session spinner while initialization is pending on refresh', () => {
      const store = createMockStore({
        isInitializing: true,
        authLoading: true,
        isAuthenticated: false,
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
              </Route>
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText(/Verifying session/i)).toBeTruthy();
      expect(screen.queryByText('Login Page')).toBeNull();
      expect(screen.queryByText('Protected Dashboard Content')).toBeNull();
    });

    it('redirects to /login when session check completes and user is not authenticated', () => {
      const store = createMockStore({
        isInitializing: false,
        authLoading: false,
        isAuthenticated: false,
        user: null,
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
              </Route>
              <Route path="/login" element={<div>Login Page Target</div>} />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText('Login Page Target')).toBeTruthy();
      expect(screen.queryByText('Protected Dashboard Content')).toBeNull();
    });

    it('renders protected dashboard content when user is authenticated and initialized', () => {
      const store = createMockStore({
        isInitializing: false,
        authLoading: false,
        isAuthenticated: true,
        user: { id: 'u1', name: 'Ramesh', is_onboarded: true },
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText('Protected Dashboard Content')).toBeTruthy();
    });
  });

  describe('RoleRoute Permission Verification', () => {
    it('shows verifying permissions spinner when session is restoring and user state is not ready', () => {
      const store = createMockStore({
        isInitializing: true,
        authLoading: true,
        isAuthenticated: true,
        user: null,
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/expert-dashboard']}>
            <Routes>
              <Route
                path="/expert-dashboard"
                element={
                  <RoleRoute allowedRoles={['AGRONOMY_EXPERT']}>
                    <div>Secret Expert Hub</div>
                  </RoleRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText(/Verifying permissions/i)).toBeTruthy();
      expect(screen.queryByText('Secret Expert Hub')).toBeNull();
    });

    it('redirects unauthorized role to /dashboard', () => {
      const store = createMockStore({
        isInitializing: false,
        authLoading: false,
        isAuthenticated: true,
        user: { id: 'u1', name: 'Ramesh', role: 'FARMER' },
      });

      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/expert-dashboard']}>
            <Routes>
              <Route
                path="/expert-dashboard"
                element={
                  <RoleRoute allowedRoles={['AGRONOMY_EXPERT']}>
                    <div>Secret Expert Hub</div>
                  </RoleRoute>
                }
              />
              <Route path="/dashboard" element={<div>Farmer Main Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText('Farmer Main Dashboard')).toBeTruthy();
      expect(screen.queryByText('Secret Expert Hub')).toBeNull();
    });
  });
});
