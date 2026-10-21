import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import SplashScreen from '../components/common/SplashScreen';

// Mock framer-motion with Proxy
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_, Tag) => ({ children, ...props }) => <Tag {...props}>{children}</Tag>,
    }
  ),
  AnimatePresence: ({ children }) => <>{children}</>,
  useReducedMotion: () => false,
}));

const createMockStore = (authState = {}) => {
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

describe('Dr Agri AI - Animated Startup Splash Screen Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the brand title, AI badge, tagline, and agriculture emblem', () => {
    const store = createMockStore({ isInitializing: true });
    render(
      <Provider store={store}>
        <SplashScreen onComplete={vi.fn()} />
      </Provider>
    );

    expect(screen.getByTestId('splash-screen')).toBeTruthy();
    expect(screen.getByText('Dr Agri')).toBeTruthy();
    expect(screen.getByText('AI')).toBeTruthy();
    expect(screen.getByText('Smarter Farming. Healthier Harvests.')).toBeTruthy();
    expect(screen.getByText('Agritech Intelligence Platform')).toBeTruthy();
  });

  it('uses deep forest green brand background styling', () => {
    const store = createMockStore({ isInitializing: true });
    render(
      <Provider store={store}>
        <SplashScreen onComplete={vi.fn()} />
      </Provider>
    );

    const splash = screen.getByTestId('splash-screen');
    expect(splash.style.backgroundColor).toBe('rgb(9, 41, 31)'); // #09291F in RGB
  });

  it('automatically transitions out after minimum intro time and session resolution', () => {
    const onComplete = vi.fn();
    const store = createMockStore({ isInitializing: false, authLoading: false });

    render(
      <Provider store={store}>
        <SplashScreen onComplete={onComplete} />
      </Provider>
    );

    // Fast-forward through minimum intro delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // In test environment, it transitions smoothly
    expect(screen.queryByTestId('splash-screen')).toBeNull();
  });

  it('safely exits even if auth restoration takes longer or times out', () => {
    const onComplete = vi.fn();
    const store = createMockStore({ isInitializing: true, authLoading: true });

    render(
      <Provider store={store}>
        <SplashScreen onComplete={onComplete} />
      </Provider>
    );

    // Initial render is visible
    expect(screen.getByTestId('splash-screen')).toBeTruthy();

    // Advance beyond the safety ceiling
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Confirms safety timeout dismissed the splash screen
    expect(screen.queryByTestId('splash-screen')).toBeNull();
  });
});
