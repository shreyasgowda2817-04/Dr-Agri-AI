import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../i18n';
import Footer from '../components/layout/Footer';

describe('Footer Component', () => {
  it('renders branding and copyright information', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    // Dr Agri AI brand elements
    const brandElements = screen.getAllByText(/Dr Agri/i);
    expect(brandElements.length).toBeGreaterThan(0);

    // Privacy policy and terms links
    expect(screen.getAllByText(/Privacy Policy/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Terms Of Service/i).length).toBeGreaterThan(0);
  });

  it('renders quick links and solutions', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Marketplace/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/For Farmers/i).length).toBeGreaterThan(0);
  });

  it('renders contact details with phone number', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/\+91 900 343 432/i).length).toBeGreaterThan(0);
  });

  it('applies hidden on mobile and md:block on desktop (768px and above)', () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const footerElement = container.querySelector('footer');
    expect(footerElement).toBeTruthy();
    expect(footerElement.classList.contains('hidden')).toBe(true);
    expect(footerElement.classList.contains('md:block')).toBe(true);
  });
});
