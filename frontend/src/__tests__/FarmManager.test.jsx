import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../i18n';
import FarmManager from '../pages/FarmManager';
import { MemoryRouter } from 'react-router-dom';

describe('FarmManager Component & Registration Modal', () => {
  it('renders the GPS manager header', () => {
    render(
      <MemoryRouter>
        <FarmManager />
      </MemoryRouter>
    );

    // Gps Manager title
    expect(screen.getByText(/Gps Manager/i)).toBeTruthy();
  });

  it('opens plot registration modal and renders SelectField without crashing', () => {
    render(
      <MemoryRouter>
        <FarmManager />
      </MemoryRouter>
    );

    // Click Add New Farm Plot button to open modal
    const addButton = screen.getByTitle(/Add New Farm Plot/i);
    fireEvent.click(addButton);

    // Modal should be visible
    expect(screen.getByText(/Register New Farm Plot/i)).toBeTruthy();

    // SelectFields (Soil Type, Water Source, Irrigation Type) should render options without throwing t is not defined
    expect(screen.getByText(/Soil Type/i)).toBeTruthy();
    expect(screen.getByText(/Water Source/i)).toBeTruthy();
    expect(screen.getByText(/Irrigation Type/i)).toBeTruthy();
  });
});
