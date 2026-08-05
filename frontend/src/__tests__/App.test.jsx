import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import App from '../App';
import { describe, it, expect } from 'vitest';

describe('App Component', () => {
  it('renders the Home page by default', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    );
    
    // Check if the navbar title is present
    expect(screen.getByText(/CropAI/i)).toBeTruthy();
    
    // Check if the hero section text is present
    expect(screen.getByText(/Detect Crop Diseases with/i)).toBeTruthy();
  });
});
