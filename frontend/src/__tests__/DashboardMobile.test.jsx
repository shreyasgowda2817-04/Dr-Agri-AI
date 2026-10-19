import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import Dashboard from '../pages/Dashboard';
import { MemoryRouter } from 'react-router-dom';
import '../i18n';

// Mock API & subcomponents to focus on Dashboard hero & quick actions
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../hooks/useFetchWithCache', () => ({
  default: () => ({ data: [], loading: false }),
}));

vi.mock('../components/dashboard/SmartFarmAlerts', () => ({
  default: () => <div data-testid="smart-farm-alerts">Alerts</div>,
}));

vi.mock('../components/weather/PremiumWeatherWidget', () => ({
  default: () => <div data-testid="premium-weather">Weather Widget</div>,
}));

vi.mock('../components/GovernmentSchemes', () => ({
  default: () => <div data-testid="govt-schemes">Government Schemes</div>,
}));

vi.mock('../components/ads/SponsoredAds', () => ({
  default: () => <div data-testid="sponsored-ads">Sponsored Ads</div>,
}));

describe('Dashboard Mobile Hero & Quick Actions Layout', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
      preloadedState: {
        auth: {
          user: {
            id: 'farmer-123',
            name: 'Ramesh Patel',
            role: 'FARMER',
            location: 'Mandya, Karnataka',
          },
        },
      },
    });
  });

  it('renders the mobile illustrative hero layout with farmer illustration, welcome greeting and Scan Now CTA', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </Provider>
    );

    // Verify the mobile agriculture illustration banner image
    const mobileBannerImg = screen.getByAltText(/Dr Agri AI Farmer and Crop Field/i);
    expect(mobileBannerImg).toBeTruthy();
    expect(mobileBannerImg.getAttribute('src')).toBe('/dr_agri_banner.png');

    // Verify welcome greeting with user's name rendered in both mobile and desktop views
    expect(screen.getAllByText(/Ramesh/i).length).toBeGreaterThanOrEqual(2);

    // Verify AI crop scan description
    expect(screen.getByText(/Instant AI disease diagnosis & health insights for your crops/i)).toBeTruthy();

    // Verify prominent "Scan Now" button
    const scanNowBtn = screen.getByRole('link', { name: /Scan Now/i });
    expect(scanNowBtn).toBeTruthy();
    expect(scanNowBtn.getAttribute('href')).toBe('/scan');
  });

  it('confirms quick actions are removed in favor of the mobile bottom navigation bar', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </Provider>
    );

    // Fast Access / Quick Actions section header should not be rendered
    expect(screen.queryByText(/Fast Access/i)).toBeNull();
    expect(screen.queryByText(/^Quick Actions$/i)).toBeNull();
  });

  it('preserves the desktop & tablet banner header with hidden md:flex', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </Provider>
    );

    // Verify the desktop banner image exists and is preserved
    const desktopBannerImg = screen.getByAltText(/Smart Farm Dashboard Banner/i);
    expect(desktopBannerImg).toBeTruthy();
    expect(desktopBannerImg.getAttribute('src')).toBe('/dashboard-banner.jpg');
  });
});
