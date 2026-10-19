import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AppLogo, { LogoIcon, LogoImage } from '../components/common/AppLogo';

describe('AppLogo Component & LogoIcon', () => {
  it('renders LogoImage with /logo.png and correct attributes', () => {
    render(<LogoImage size={48} className="custom-logo" />);

    const logoImg = screen.getByTestId('app-logo-image');
    expect(logoImg).toBeTruthy();
    expect(logoImg.getAttribute('src')).toBe('/logo.png');
    expect(logoImg.getAttribute('width')).toBe('48');
    expect(logoImg.getAttribute('height')).toBe('48');
    expect(logoImg.classList.contains('custom-logo')).toBe(true);
  });

  it('renders vector LogoIcon SVG with correct attributes and agriculture emblem elements', () => {
    render(<LogoIcon variant="vector" size={48} className="custom-vector" />);

    const logoSvg = screen.getByTestId('app-logo-icon');
    expect(logoSvg).toBeTruthy();
    expect(logoSvg.getAttribute('width')).toBe('48');
    expect(logoSvg.getAttribute('height')).toBe('48');
    expect(logoSvg.classList.contains('custom-vector')).toBe(true);
    expect(logoSvg.querySelector('#dr-agri-emblem')).toBeTruthy();
  });

  it('renders AppLogo with branding text and AI badge', () => {
    render(<AppLogo showText={true} size={40} />);

    expect(screen.getByText('Dr Agri')).toBeTruthy();
    expect(screen.getByText('AI')).toBeTruthy();
  });

  it('renders AppLogo with optional PRO tier badge', () => {
    render(<AppLogo showText={true} proBadge={true} />);

    expect(screen.getByText('Dr Agri')).toBeTruthy();
    expect(screen.getByText('AI')).toBeTruthy();
    expect(screen.getByText('PRO')).toBeTruthy();
  });
});
