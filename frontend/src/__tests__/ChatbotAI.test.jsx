import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import ChatbotWidget from '../components/chat/ChatbotWidget';
import Agronomy from '../pages/Agronomy';
import api from '../services/api';

// Mock api
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() }
  })
}));

// Mock hooks
vi.mock('../hooks/useSpeechRecognition', () => ({
  default: () => ({
    isListening: false,
    transcript: '',
    setTranscript: vi.fn(),
    toggleListening: vi.fn(),
    hasSupport: false
  })
}));

vi.mock('../hooks/useFetchWithCache', () => ({
  default: () => ({
    data: {
      location_name: 'Mysuru, Karnataka',
      temperature: 28,
      feels_like: 29,
      weather_condition: 'Sunny',
      humidity: 65,
      rainfall: 0,
      rain_probability: 10,
      wind_speed: 3.5,
      retrieved_at: Math.floor(Date.now() / 1000)
    },
    loading: false
  })
}));

const createMockStore = () => configureStore({
  reducer: {
    auth: () => ({ user: { id: 'u1', name: 'Ramesh', role: 'farmer' } })
  }
});

describe('Chatbot AI & Agronomy Assistant Multi-Turn Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollTo = vi.fn();
    api.get.mockResolvedValue({ data: [] });
  });

  it('ChatbotWidget sends message, language, and history payload to /chat/message', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        reply: 'A crop is a cultivated plant grown for food or fiber.',
        source: 'gemini'
      }
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <ChatbotWidget />
        </MemoryRouter>
      </Provider>
    );

    // Open chat widget
    const openBtn = screen.getByLabelText('Open AI Assistant');
    fireEvent.click(openBtn);

    // Enter message
    const input = screen.getByPlaceholderText(/Type or speak/i);
    fireEvent.change(input, { target: { value: 'what is crops' } });

    // Submit via Enter
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/chat/message', expect.objectContaining({
        message: 'what is crops',
        language: 'en-US',
        history: expect.any(Array)
      }));
    });

    // Verify reply rendered
    await waitFor(() => {
      expect(screen.getByText(/A crop is a cultivated plant/i)).toBeTruthy();
    });
  });

  it('ChatbotWidget disables input during loading and prevents duplicate submissions', async () => {
    let resolvePost;
    api.post.mockReturnValueOnce(new Promise((res) => { resolvePost = res; }));

    const store = createMockStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <ChatbotWidget />
        </MemoryRouter>
      </Provider>
    );

    const openBtn = screen.getByLabelText('Open AI Assistant');
    fireEvent.click(openBtn);

    const input = screen.getByPlaceholderText(/Type or speak/i);
    fireEvent.change(input, { target: { value: 'what is crops' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Input should be disabled while request is pending
    expect(input.disabled).toBe(true);

    // Trying to press enter again should not trigger another call
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(api.post).toHaveBeenCalledTimes(1);

    // Resolve response
    resolvePost({ data: { reply: 'Educational answer.' } });

    await waitFor(() => {
      expect(input.disabled).toBe(false);
    });
  });

  it('ChatbotWidget displays error with retry button on failure', async () => {
    api.post.mockRejectedValueOnce(new Error('Network Error'));

    const store = createMockStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <ChatbotWidget />
        </MemoryRouter>
      </Provider>
    );

    const openBtn = screen.getByLabelText('Open AI Assistant');
    fireEvent.click(openBtn);

    const input = screen.getByPlaceholderText(/Type or speak/i);
    fireEvent.change(input, { target: { value: 'help' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/trouble connecting to my AI brain/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeTruthy();
    });
  });

  it('Agronomy page passes history and sends multi-turn chat request', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        reply: 'Fertilizer requirements depend strictly on the crop.',
        source: 'gemini'
      }
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/agronomy']}>
          <Agronomy />
        </MemoryRouter>
      </Provider>
    );

    const input = screen.getByPlaceholderText(/Ask Agri AI/i);
    fireEvent.change(input, { target: { value: 'What fertilizer is best for my crops?' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/chat/message', expect.objectContaining({
        message: 'What fertilizer is best for my crops?',
        language: 'en-US',
        history: expect.any(Array)
      }));
    });
  });
});
