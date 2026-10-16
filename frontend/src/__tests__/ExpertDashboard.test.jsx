import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import cartReducer from '../store/slices/cartSlice';
import ExpertDashboard from '../pages/ExpertDashboard';
import api from '../services/api';
import '../i18n';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock JitsiMeeting
vi.mock('@jitsi/react-sdk', () => ({
  JitsiMeeting: ({ roomName, userInfo, onApiReady }) => {
    return (
      <div data-testid="expert-jitsi-meeting">
        <span data-testid="expert-room-name">{roomName}</span>
        <span data-testid="expert-display-name">{userInfo?.displayName}</span>
        <button
          data-testid="expert-leave-call"
          onClick={() => {
            if (onApiReady) {
              const fakeApi = {
                addListener: (event, handler) => {
                  if (event === 'videoConferenceLeft') {
                    fakeApi._leaveHandler = handler;
                  }
                },
              };
              onApiReady(fakeApi);
              if (fakeApi._leaveHandler) fakeApi._leaveHandler();
            }
          }}
        >
          Hangup
        </button>
      </div>
    );
  },
}));

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('ExpertDashboard Component (Agronomy Expert Portal)', () => {
  let store;

  beforeEach(() => {
    vi.clearAllMocks();

    store = configureStore({
      reducer: {
        auth: authReducer,
        cart: cartReducer,
      },
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: {
            id: 'expert-999',
            name: 'Dr. Swaminathan',
            role: 'AGRONOMY_EXPERT',
          },
        },
      },
    });

    api.get.mockImplementation((url) => {
      if (url === '/marketplace/supplies') {
        return Promise.resolve({
          data: [
            {
              id: 'prod-neem',
              name: 'Organic Neem Oil 1L',
              price: 320,
              stock_quantity: 50,
            },
            {
              id: 'prod-copper',
              name: 'Copper Fungicide 500g',
              price: 450,
              stock_quantity: 35,
            },
          ],
        });
      }
      if (url === '/consultations/active-calls') {
        return Promise.resolve({
          data: [
            {
              id: 'call-101',
              room_name: 'dragriaiexpert999farmer123',
              farmer_id: 'farmer-123',
              call_type: 'video',
              created_at: new Date().toISOString(),
            },
          ],
        });
      }
      if (url === '/consultations/triage/farmer-123') {
        return Promise.resolve({
          data: {
            farmer_name: 'Farmer Ramesh',
            total_scans: 3,
            most_common_disease: 'Early Blight',
            average_confidence: 0.94,
            primary_crop: 'Tomato',
            recommended_treatment: 'Apply systemic fungicide and reduce overhead watering',
          },
        });
      }
      if (url === '/consultations/expert/overview') {
        return Promise.resolve({
          data: {
            total_consultations: 5,
            active_queue_count: 1,
            today_appointments_count: 2,
            average_rating: 4.9,
            total_reviews: 12,
            total_prescriptions: 8,
            fee_per_consultation: 250,
            total_earnings: 1250,
            is_available: true,
            working_hours: { start: '09:00', end: '18:00', timezone: 'Asia/Kolkata' },
            available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            specializations: ['Crop Pathology'],
            title: 'Chief Agronomist',
            bio: 'Expert advisor',
          },
        });
      }
      if (url === '/consultations/expert/appointments') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    api.post.mockResolvedValue({
      data: { message: 'Success' },
    });
  });

  it('polls active calls and displays incoming call card with farmer AI triage data', async () => {
    render(
      <Provider store={store}>
        <ExpertDashboard />
      </Provider>
    );

    // Queue counter should show 1 farmer waiting
    await waitFor(() => {
      expect(screen.getByText(/1 farmer waiting/i)).toBeTruthy();
    });

    // Triage card should show farmer's name and detected disease
    await waitFor(() => {
      expect(screen.getAllByText('Farmer Ramesh').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Early Blight').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/94/i)).toBeTruthy();
    });
  });

  it('accepts incoming consultation and enters Jitsi WebRTC room', async () => {
    render(
      <Provider store={store}>
        <ExpertDashboard />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Accept Consultation/i)).toBeTruthy();
    });

    const acceptButton = screen.getByRole('button', { name: /accept consultation/i });
    fireEvent.click(acceptButton);

    expect(api.post).toHaveBeenCalledWith('/consultations/call/call-101/accept');

    // Expert should join the Jitsi room
    await waitFor(() => {
      expect(screen.getByTestId('expert-jitsi-meeting')).toBeTruthy();
      expect(screen.getByTestId('expert-room-name').textContent).toBe('dragriaiexpert999farmer123');
      expect(screen.getByTestId('expert-display-name').textContent).toBe('Dr. Dr. Swaminathan');
    });
  });

  it('allows expert to issue digital prescription with products', async () => {
    render(
      <Provider store={store}>
        <ExpertDashboard />
      </Provider>
    );

    // First accept the call to set the active farmer
    await waitFor(() => {
      expect(screen.getByText(/Accept Consultation/i)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /accept consultation/i }));

    // Prescription form should be visible
    await waitFor(() => {
      expect(screen.getByText(/Confirmed Diagnosis/i)).toBeTruthy();
      expect(screen.getByText(/Treatment Notes/i)).toBeTruthy();
    });

    // Select a product
    const productButton = screen.getByText(/Organic Neem Oil 1L/i);
    fireEvent.click(productButton);

    // Enter notes
    const notesInput = screen.getByPlaceholderText(/Apply 2L\/acre/i);
    fireEvent.change(notesInput, { target: { value: 'Spray 5ml/L every 5 days in early morning' } });

    // Submit prescription
    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/consultations/prescriptions', expect.objectContaining({
        farmer_id: 'farmer-123',
        prescribed_products: expect.arrayContaining(['prod-neem']),
        notes: 'Spray 5ml/L every 5 days in early morning',
      }));
    });
  });

  it('switches tabs and saves availability working hours schedule', async () => {
    api.put.mockResolvedValueOnce({
      data: { message: 'Schedule updated' }
    });

    render(
      <Provider store={store}>
        <ExpertDashboard />
      </Provider>
    );

    // Switch to Availability tab
    const availTabBtn = screen.getByRole('button', { name: /Availability & Working Hours/i });
    fireEvent.click(availTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Working Hours & Availability Management/i)).toBeTruthy();
      expect(screen.getByText(/Available Consultation Days/i)).toBeTruthy();
    });

    // Toggle a day (e.g. Saturday)
    const satBtn = screen.getByRole('button', { name: /Saturday/i });
    fireEvent.click(satBtn);

    // Click Save Schedule
    const saveBtn = screen.getByRole('button', { name: /Save Availability Schedule/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/consultations/expert/availability', expect.objectContaining({
        is_available: true,
        available_days: expect.arrayContaining(['Saturday']),
      }));
    });
  });
});
