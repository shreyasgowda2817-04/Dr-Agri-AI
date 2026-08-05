import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

const NotificationListener = () => {
  const { user, token } = useSelector((state) => state.auth);
  const ws = useRef(null);

  useEffect(() => {
    if (!user || !token) return;

    // Connect to WebSocket server for notifications
    const wsUrl = `ws://localhost:8000/api/v1/notifications/ws/${user.id}?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('Connected to real-time notification server');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ALERT') {
        toast.error(data.message, { icon: '🚨' });
      } else if (data.type === 'MARKETPLACE_UPDATE') {
        toast.success(data.message, { icon: '📦' });
      } else {
        toast.info(data.message);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    ws.current.onclose = () => {
      console.log('Disconnected from notification server');
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user, token]);

  return null; // Invisible component
};

export default NotificationListener;
