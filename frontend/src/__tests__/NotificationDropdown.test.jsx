import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../i18n';
import NotificationDropdown from '../components/layout/NotificationDropdown';
import { MemoryRouter } from 'react-router-dom';

describe('NotificationDropdown Component', () => {
  it('renders notification bell button', () => {
    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>
    );

    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
  });

  it('toggles dropdown when clicked', () => {
    render(
      <MemoryRouter>
        <NotificationDropdown />
      </MemoryRouter>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Should display Notification Hub title
    expect(screen.getByText(/Notification Hub/i)).toBeTruthy();
  });
});
