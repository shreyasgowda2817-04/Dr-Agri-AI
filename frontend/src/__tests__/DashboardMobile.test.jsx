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

  it('renders all 6 required Quick Action buttons on mobile with correct links and icons', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </Provider>
    );

    // 1. AI Scan -> /scan
    const aiScanLink = screen.getByRole('link', { name: /^AI Scan$/i });
    expect(aiScanLink).toBeTruthy();
    expect(aiScanLink.getAttribute('href')).toBe('/scan');

    // 2. Add Expense -> /finance
    const addExpenseLink = screen.getByRole('link', { name: /^Add Expense$/i });
    expect(addExpenseLink).toBeTruthy();
    expect(addExpenseLink.getAttribute('href')).toBe('/finance');

    // 3. Buy Products -> /marketplace
    const buyProductsLink = screen.getByRole('link', { name: /^Buy Products$/i });
    expect(buyProductsLink).toBeTruthy();
    expect(buyProductsLink.getAttribute('href')).toBe('/marketplace');

    // 4. Consult Expert -> /consult
    const consultLink = screen.getByRole('link', { name: /^Consult Expert$/i });
    expect(consultLink).toBeTruthy();
    expect(consultLink.getAttribute('href')).toBe('/consult');

    // 5. Govt Schemes -> /schemes
    const schemesLink = screen.getByRole('link', { name: /^Govt Schemes$/i });
    expect(schemesLink).toBeTruthy();
    expect(schemesLink.getAttribute('href')).toBe('/schemes');

    // 6. My Farm -> /farm
    const farmLink = screen.getByRole('link', { name: /^My Farm$/i });
    expect(farmLink).toBeTruthy();
    expect(farmLink.getAttribute('href')).toBe('/farm');
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
