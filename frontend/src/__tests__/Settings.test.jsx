import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import Settings from '../pages/Settings';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '../i18n';

// Mock API calls
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/subscriptions/me') {
        return Promise.resolve({
          data: {
            plan_name: 'Free Plan',
            status: 'active',
            is_ad_free: false,
            current_period_end: '2026-12-31T00:00:00.000Z',
          },
        });
      }
      if (url === '/subscriptions/plans') {
        return Promise.resolve({
          data: [
            {
              id: 'plan_pro_monthly',
              name: 'Monthly Plan',
              price: 99,
              interval: 'month',
              features: ['Ad-Free Experience', 'Priority AI Inference', 'PDF Health Dossiers'],
            },
            {
              id: 'plan_pro_yearly',
              name: 'Annual Plan',
              price: 799,
              interval: 'year',
              features: ['Ad-Free Experience', 'Priority AI Inference', 'Priority Agronomist Calls'],
            },
          ],
        });
      }
      if (url === '/subscriptions/history' || url === '/payments/orders') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/organizations/my-orgs') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Settings Page Redesign (Mobile, Tablet, and Desktop)', () => {
  let store;

  const mockUser = {
    id: 'user_farmer_1',
    name: 'Ramesh Patel',
    email: 'ramesh@agri.in',
    phone: '9876543210',
    role: 'farmer',
    location: 'Gujarat',
    district: 'Anand',
    village: 'Navli',
    preferred_language: 'en-US',
    subscription_tier: 'free',
    farm_details: {
      total_acreage: '12',
      primary_crop: 'Wheat',
      soil_type: 'Black',
      irrigation: 'Drip',
    },
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
      preloadedState: {
        auth: {
          user: mockUser,
          token: 'mock-jwt-token',
          isAuthenticated: true,
          authLoading: false,
        },
      },
    });
  });

  it('renders settings categories and user profile info on /settings', () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/settings']}>
          <Routes>
            <Route path="settings" element={<Settings />} />
            <Route path="settings/:section" element={<Settings />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // User summary displays in DOM
    const names = screen.getAllByText('Ramesh Patel');
    expect(names.length).toBeGreaterThanOrEqual(1);

    const emails = screen.getAllByText(/ramesh@agri.in/i);
    expect(emails.length).toBeGreaterThanOrEqual(1);

    // Required settings menu items are present
    expect(screen.getAllByText('Profile').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Farm Details').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Account & Security').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Subscription & Billing').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Notifications').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Language & Preferences').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Help & Support').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Team & Workspaces').length).toBeGreaterThanOrEqual(1);
  });

  it('renders dedicated Profile sub-route on /settings/profile with back button and form', () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/settings/profile']}>
          <Routes>
            <Route path="settings" element={<Settings />} />
            <Route path="settings/:section" element={<Settings />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // Profile heading & form fields
    expect(screen.getAllByDisplayValue('Ramesh Patel').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('9876543210').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Save Profile Changes/i).length).toBeGreaterThanOrEqual(1);

    // Back to Settings button exists on mobile sub-page
    const backBtn = screen.getByRole('button', { name: /Settings/i });
    expect(backBtn).toBeTruthy();
  });

  it('renders Subscription & Billing section on /settings/billing with pricing cards', async () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/settings/billing']}>
          <Routes>
            <Route path="settings" element={<Settings />} />
            <Route path="settings/:section" element={<Settings />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // Free community plan card & pricing options after loading
    await waitFor(() => {
      expect(screen.getAllByText(/Free Community Plan/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Monthly Plan/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Yearly Plan/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/₹99/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/₹799/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders Farm Details on /settings/farm with acreage, crop varieties, and soil type', () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/settings/farm']}>
          <Routes>
            <Route path="settings" element={<Settings />} />
            <Route path="settings/:section" element={<Settings />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getAllByDisplayValue('12').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Total Farm Area \(in Acres\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Primary Soil Type/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Update Farm Profile/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Language & Preferences on /settings/preferences with theme mode and language selectors', () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/settings/preferences']}>
          <Routes>
            <Route path="settings" element={<Settings />} />
            <Route path="settings/:section" element={<Settings />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getAllByText(/Display Theme/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Dark Mode/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Regional Language/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/हिंदी/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ಕನ್ನಡ/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Help & Support on /settings/support with 24/7 farmer helpline and FAQ accordion', () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/settings/support']}>
          <Routes>
            <Route path="settings" element={<Settings />} />
            <Route path="settings/:section" element={<Settings />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getAllByText(/24\/7 Farmer Care/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Call Helpline/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Frequently Asked Questions/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/What do I get with the Ad-Free Pro plan\?/i).length).toBeGreaterThanOrEqual(1);
  });

  it('navigates from Settings mobile list to a sub-page when a menu item is clicked', async () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/settings']}>
          <Routes>
            <Route path="settings" element={<Settings />} />
            <Route path="settings/:section" element={<Settings />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // Find and click on the "Subscription & Billing" item in the mobile menu list
    const billingButtons = screen.getAllByText('Subscription & Billing');
    fireEvent.click(billingButtons[0]);

    // Now on /settings/billing, the plan view is shown
    await waitFor(() => {
      expect(screen.getAllByText(/Free Community Plan/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
