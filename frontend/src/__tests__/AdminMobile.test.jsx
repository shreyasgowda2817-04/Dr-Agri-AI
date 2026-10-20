import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import Admin from '../pages/Admin';
import ChatbotWidget from '../components/chat/ChatbotWidget';
import { MemoryRouter } from 'react-router-dom';
import '../i18n';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/admin/users') {
        return Promise.resolve({
          data: [
            {
              id: 'user_1',
              name: 'Dr. Ramesh Kumar',
              email: 'ramesh.kumar.agriculturalist.expert@farmdomain.example.com',
              role: 'AGRONOMY_EXPERT',
              tier: 'pro',
              is_active: true,
            },
            {
              id: 'user_2',
              name: 'Suresh Patel',
              email: 'suresh.farmer@village.in',
              role: 'FARMER',
              tier: 'basic',
              is_active: false, // Blocked user
            },
          ],
        });
      }
      if (url === '/admin/products') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/admin/organizations') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/schemes/') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/reports/history') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
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

describe('Admin Dashboard Mobile Responsiveness', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
      preloadedState: {
        auth: {
          user: {
            id: 'admin_1',
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
          },
          token: 'mock-admin-token',
          isAuthenticated: true,
        },
      },
    });
  });

  it('renders the Admin Command Center with wrapping title, subtitle, and mobile clearance padding', async () => {
    const { container } = render(
      <Provider store={store}>
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      </Provider>
    );

    // Root container must have overflow prevention and mobile bottom padding for bottom nav clearance
    const rootContainer = container.firstChild;
    expect(rootContainer.className).toContain('overflow-x-hidden');
    expect(rootContainer.className).toContain('pb-28');

    // Title & subtitle wrap naturally on mobile
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toBeTruthy();
    expect(title.className).toContain('break-words');

    // Contained tabs container has horizontal scrolling touch support
    const tabsContainer = screen.getByText(/Govt Schemes/i).closest('div');
    expect(tabsContainer.className).toContain('overflow-x-auto');
    expect(tabsContainer.className).toContain('min-w-0');
    expect(tabsContainer.className).toContain('max-w-full');
  });

  it('preserves the desktop table with hidden md:block and displays mobile cards with block md:hidden', async () => {
    const { container } = render(
      <Provider store={store}>
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Dr. Ramesh Kumar').length).toBeGreaterThanOrEqual(1);
    });

    // Desktop table container has responsive utility classes
    const desktopTableContainer = container.querySelector('.hidden.md\\:block');
    expect(desktopTableContainer).toBeTruthy();
    expect(desktopTableContainer.querySelector('table')).toBeTruthy();

    // Mobile cards container has responsive utility classes
    const mobileCardsContainer = container.querySelector('.block.md\\:hidden');
    expect(mobileCardsContainer).toBeTruthy();
  });

  it('displays user name, long email, role badge, tier, and status correctly on mobile user cards', async () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      // Both users are rendered
      expect(screen.getAllByText('Dr. Ramesh Kumar').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Suresh Patel').length).toBeGreaterThanOrEqual(1);
      
      // Long email displays without breaking layout
      expect(screen.getAllByText('ramesh.kumar.agriculturalist.expert@farmdomain.example.com').length).toBeGreaterThanOrEqual(1);
      
      // Role badges
      expect(screen.getAllByText(/AGRONOMY_EXPERT/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/FARMER/).length).toBeGreaterThanOrEqual(1);

      // Subscription tiers
      expect(screen.getAllByText(/pro/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/basic/i).length).toBeGreaterThanOrEqual(1);

      // Inactive/Blocked badge for user 2
      expect(screen.getAllByText(/Blocked/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('provides accessible and functional action buttons on mobile user cards', async () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Admin />
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Dr. Ramesh Kumar').length).toBeGreaterThanOrEqual(1);
    });

    // 1. Role modal button on mobile user card
    const roleButtons = screen.getAllByRole('button', { name: /role/i });
    expect(roleButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(roleButtons[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/Change Role/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Select Role/i).length).toBeGreaterThanOrEqual(1);
    });
    // Close role modal
    const cancelButtons1 = screen.getAllByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButtons1[0]);

    // 2. Edit Profile modal button
    const editButtons = screen.getAllByTitle('Edit Profile');
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(editButtons[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/Edit User Profile/i).length).toBeGreaterThanOrEqual(1);
    });
    // Close user modal
    const cancelButtons2 = screen.getAllByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButtons2[0]);

    // 3. Delete modal button
    const deleteButtons = screen.getAllByTitle('Delete User');
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/Delete User/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('repositions chatbot launcher above mobile bottom navigation and uses compact mobile greeting bubble', async () => {
    const { container } = render(
      <Provider store={store}>
        <MemoryRouter>
          <ChatbotWidget />
        </MemoryRouter>
      </Provider>
    );

    // Chatbot widget container must have mobile bottom-20 and desktop bottom-6
    const widgetContainer = container.firstChild;
    expect(widgetContainer.className).toContain('bottom-20');
    expect(widgetContainer.className).toContain('md:bottom-6');
    expect(widgetContainer.className).toContain('right-3');
    expect(widgetContainer.className).toContain('sm:right-6');

    // Chat launcher button is within the viewport
    const chatBtn = screen.getByRole('button', { name: /Open AI Assistant/i });
    expect(chatBtn).toBeTruthy();
  });
});
