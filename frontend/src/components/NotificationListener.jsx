import { useTranslation } from "react-i18next";
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

const NotificationListener = () => {
  const { t } = useTranslation();
  const { user, token } = useSelector((state) => state.auth);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const pingInterval = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!user || !user.id) return;

    // Determine WebSocket protocol and host dynamically
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let defaultWsHost = window.location.hostname === 'localhost' ? 'localhost:8000' : 'dr-agri-ai.onrender.com';
    
    // Auto-detect host from VITE_API_URL if configured
    if (import.meta.env.VITE_API_URL) {
      try {
        const parsed = new URL(import.meta.env.VITE_API_URL);
        defaultWsHost = parsed.host;
      } catch (e) {}
    }

    const wsHost = import.meta.env.VITE_WS_HOST || defaultWsHost;
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const wsUrl = `${wsProtocol}//${wsHost}/api/v1/notifications/ws/${user.id}${tokenParam}`;

    const connect = () => {
      if (!isMounted.current) return;

      try {
        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        socket.onopen = () => {
          if (!isMounted.current) {
            socket.close(1000, "Component unmounted");
            return;
          }

          // Heartbeat ping every 30s to keep connection alive
          if (pingInterval.current) clearInterval(pingInterval.current);
          pingInterval.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send('ping');
            }
          }, 30000);
        };

        socket.onmessage = (event) => {
          if (event.data === 'pong') return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ALERT') {
              toast.error(data.message || 'Smart Farm Alert', { icon: '🚨' });
            } else if (data.type === 'MARKETPLACE_UPDATE') {
              toast.success(data.message || 'Marketplace Update', { icon: '📦' });
            } else if (data.type === 'INFO') {
              // Silently accept welcome message without toast
            } else if (data.message) {
              toast.info(data.message);
            }
          } catch (e) {
            // Non-JSON message received
          }
        };

        socket.onerror = (error) => {
          // Silent handler - onclose will handle reconnect if needed
        };

        socket.onclose = (event) => {
          if (pingInterval.current) clearInterval(pingInterval.current);
          if (!isMounted.current) return;

          // Reconnect with 10s backoff if closed unexpectedly
          if (event.code !== 1000 && event.code !== 1008) {
            if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = setTimeout(() => {
              if (isMounted.current) {
                connect();
              }
            }, 10000);
          }
        };
      } catch (err) {
        // Socket creation failed
      }
    };

    connect();

    return () => {
      isMounted.current = false;
      if (pingInterval.current) clearInterval(pingInterval.current);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);

      if (ws.current) {
        const socket = ws.current;
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1000, "Component unmounted");
        } else if (socket.readyState === WebSocket.CONNECTING) {
          // Gracefully defer closing until connection completes to prevent browser warnings
          socket.onopen = () => {
            socket.close(1000, "Closed after mount");
          };
        }
      }
    };
  }, [user?.id, token]);

  return null; // Invisible component
};

export default NotificationListener;
