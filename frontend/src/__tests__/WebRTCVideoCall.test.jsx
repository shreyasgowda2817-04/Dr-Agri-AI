import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WebRTCVideoCall from '../components/consultation/WebRTCVideoCall';
import '../i18n';

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('WebRTCVideoCall Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the call room without any third-party login prompts', () => {
    render(
      <WebRTCVideoCall
        roomName="dragriai-room-101"
        callType="video"
        currentUser={{ id: 'farmer-1', name: 'Farmer Ramesh', role: 'farmer' }}
        peerName="Dr. Swaminathan"
        onEndCall={vi.fn()}
        isExpert={false}
      />
    );

    // Should display direct call badge
    expect(screen.getByText(/Dr Agri AI Direct Call/i)).toBeTruthy();

    // Should display peer's name
    expect(screen.getByText('Dr. Swaminathan')).toBeTruthy();

    // Should NOT display any moderator or login prompt
    expect(screen.queryByText(/Log in/i)).toBeNull();
    expect(screen.queryByText(/Moderator/i)).toBeNull();
  });

  it('allows user to toggle microphone and camera controls', () => {
    render(
      <WebRTCVideoCall
        roomName="dragriai-room-101"
        callType="video"
        currentUser={{ id: 'farmer-1', name: 'Farmer Ramesh', role: 'farmer' }}
        peerName="Dr. Swaminathan"
        onEndCall={vi.fn()}
        isExpert={false}
      />
    );

    const muteBtn = screen.getByTitle(/Mute Microphone|Unmute Microphone/i);
    expect(muteBtn).toBeTruthy();
    fireEvent.click(muteBtn);

    const videoBtn = screen.getByTitle(/Turn Camera Off|Turn Camera On/i);
    expect(videoBtn).toBeTruthy();
    fireEvent.click(videoBtn);
  });

  it('opens in-call chat and sends a message', () => {
    render(
      <WebRTCVideoCall
        roomName="dragriai-room-101"
        callType="video"
        currentUser={{ id: 'farmer-1', name: 'Farmer Ramesh', role: 'farmer' }}
        peerName="Dr. Swaminathan"
        onEndCall={vi.fn()}
        isExpert={false}
      />
    );

    // Toggle chat
    const chatBtn = screen.getByTitle(/In-call chat/i);
    fireEvent.click(chatBtn);

    // Chat drawer should open
    expect(screen.getByText(/In-Call Messages/i)).toBeTruthy();

    const input = screen.getByPlaceholderText(/Type note or dosage/i);
    fireEvent.change(input, { target: { value: 'Spray Mancozeb 2g per liter' } });

    const sendBtn = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(sendBtn);

    expect(screen.getByText('Spray Mancozeb 2g per liter')).toBeTruthy();
  });

  it('triggers onEndCall callback when user ends consultation', () => {
    const endCallMock = vi.fn();
    render(
      <WebRTCVideoCall
        roomName="dragriai-room-101"
        callType="video"
        currentUser={{ id: 'farmer-1', name: 'Farmer Ramesh', role: 'farmer' }}
        peerName="Dr. Swaminathan"
        onEndCall={endCallMock}
        isExpert={false}
      />
    );

    const endBtn = screen.getByTitle(/Finish Consultation/i);
    fireEvent.click(endBtn);

    expect(endCallMock).toHaveBeenCalledTimes(1);
  });
});
