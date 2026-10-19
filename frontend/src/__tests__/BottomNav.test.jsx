import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from '../components/layout/BottomNav';

describe('Mobile BottomNav Component', () => {
  it('renders all five navigation destinations with appropriate labels and links', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNav />
      </MemoryRouter>
    );

    // 1. Home -> /dashboard
    const homeLink = screen.getByRole('link', { name: /Home/i });
    expect(homeLink).toBeTruthy();
    expect(homeLink.getAttribute('href')).toBe('/dashboard');

    // 2. My Farm -> /farm
    const farmLink = screen.getByRole('link', { name: /My Farm/i });
    expect(farmLink).toBeTruthy();
    expect(farmLink.getAttribute('href')).toBe('/farm');

    // 3. AI Scan -> /scan
    const scanLink = screen.getByRole('link', { name: /AI Scan/i });
    expect(scanLink).toBeTruthy();
    expect(scanLink.getAttribute('href')).toBe('/scan');

    // 4. Market -> /marketplace
    const marketLink = screen.getByRole('link', { name: /Market/i });
    expect(marketLink).toBeTruthy();
    expect(marketLink.getAttribute('href')).toBe('/marketplace');

    // 5. Profile -> /settings
    const profileLink = screen.getByRole('link', { name: /Profile/i });
    expect(profileLink).toBeTruthy();
    expect(profileLink.getAttribute('href')).toBe('/settings');
  });

  it('sets aria-current="page" on the active destination and highlights it', () => {
    render(
      <MemoryRouter initialEntries={['/scan']}>
        <BottomNav />
      </MemoryRouter>
    );

    const scanLink = screen.getByRole('link', { name: /AI Scan/i });
    expect(scanLink.getAttribute('aria-current')).toBe('page');

    const homeLink = screen.getByRole('link', { name: /Home/i });
    expect(homeLink.getAttribute('aria-current')).toBeNull();
  });

  it('has mobile-only responsive classes (md:hidden) and fixed bottom placement', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <BottomNav />
      </MemoryRouter>
    );

    const nav = screen.getByRole('navigation', { name: /Mobile Bottom Navigation/i });
    expect(nav).toBeTruthy();
    expect(nav.className).toContain('md:hidden');
    expect(nav.className).toContain('fixed');
    expect(nav.className).toContain('bottom-0');
  });
});
