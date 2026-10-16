import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import cartReducer from '../store/slices/cartSlice';
import Consultation from '../pages/Consultation';
import api from '../services/api';
import '../i18n';

// Mock API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock JitsiMeeting
vi.mock('@jitsi/react-sdk', () => ({
  JitsiMeeting: ({ roomName, userInfo, onApiReady }) => {
    return (
      <div data-testid="jitsi-meeting-mock">
        <span data-testid="jitsi-room-name">{roomName}</span>
        <span data-testid="jitsi-user-name">{userInfo?.displayName}</span>
        <button
          data-testid="end-call-btn"
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
          End Call
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

describe('Consultation Component (Farmer Portal)', () => {
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
            id: 'farmer-123',
            name: 'Farmer Ramesh',
            role: 'FARMER',
          },
        },
        cart: {
          items: [],
          isOpen: false,
        },
      },
    });

    api.get.mockImplementation((url) => {
      if (url === '/consultations/experts') {
        return Promise.resolve({
          data: [
            {
              id: 'exp-1',
              name: 'Dr. Swaminathan',
              title: 'Chief Agronomist',
              rating: 4.9,
              lang: 'Hindi, English, Kannada',
              img: 'https://example.com/expert.jpg',
            },
          ],
        });
      }
      if (url === '/consultations/prescriptions') {
        return Promise.resolve({
          data: [
            {
              _id: 'rx-1',
              diagnosis: 'Tomato Early Blight',
              notes: 'Spray copper fungicide weekly',
              created_at: new Date().toISOString(),
              prescribed_products: ['prod-fungicide-1'],
            },
          ],
        });
      }
      if (url === '/marketplace/supplies') {
        return Promise.resolve({
          data: [
            {
              id: 'prod-fungicide-1',
              name: 'Organic Copper Fungicide',
              price: 450,
              stock_quantity: 20,
              image_url: '',
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders available experts and farmer prescriptions', async () => {
    render(
      <Provider store={store}>
        <Consultation />
      </Provider>
    );

    // Should load and display the expert
    await waitFor(() => {
      expect(screen.getByText('Dr. Swaminathan')).toBeTruthy();
      expect(screen.getByText('Chief Agronomist')).toBeTruthy();
    });

    // Should display the prescription
    await waitFor(() => {
      expect(screen.getByText('Tomato Early Blight')).toBeTruthy();
      expect(screen.getByText('"Spray copper fungicide weekly"')).toBeTruthy();
      expect(screen.getByText('Organic Copper Fungicide')).toBeTruthy();
    });
  });

  it('initiates a video call and renders the Jitsi WebRTC room', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        room_name: 'dragriaiexp1farmer123timestamp',
        call_id: 'call-999',
      },
    });

    render(
      <Provider store={store}>
        <Consultation />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dr. Swaminathan')).toBeTruthy();
    });

    // Find and click the Video call button
    const videoButton = screen.getByRole('button', { name: /video/i });
    fireEvent.click(videoButton);

    expect(api.post).toHaveBeenCalledWith('/consultations/call', {
      expert_id: 'exp-1',
      call_type: 'video',
    });

    // Active call screen with Jitsi should be rendered
    await waitFor(() => {
      expect(screen.getByTestId('jitsi-meeting-mock')).toBeTruthy();
      expect(screen.getByTestId('jitsi-room-name').textContent).toBe('dragriaiexp1farmer123timestamp');
      expect(screen.getByTestId('jitsi-user-name').textContent).toBe('Farmer Ramesh');
    });
  });

  it('allows farmer to fulfill prescription into shopping cart', async () => {
    render(
      <Provider store={store}>
        <Consultation />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tomato Early Blight')).toBeTruthy();
    });

    const fulfillButton = screen.getByRole('button', { name: /fulfill prescription/i });
    fireEvent.click(fulfillButton);

    const currentCartState = store.getState().cart;
    expect(currentCartState.items.length).toBe(1);
    expect(currentCartState.items[0].id).toBe('prod-fungicide-1');
    expect(currentCartState.isOpen).toBe(true);
  });
});
