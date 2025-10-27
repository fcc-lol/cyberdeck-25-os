import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export const useHardwareData = () => {
  const [connected, setConnected] = useState(false);
  const [key, setKey] = useState({ active: null });
  const [switches, setSwitches] = useState({
    red: { active: null },
    green: { active: null },
    blue: { active: null },
  });
  const [encoders, setEncoders] = useState({
    1: { value: 0, direction: null },
    2: { value: 0, direction: null },
    3: { value: 0, direction: null },
    4: { value: 0, direction: null },
  });
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to the socket server
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Initial state
    socket.on('initial_state', (data) => {
      if (data.key) {
        setKey(data.key);
      }
      if (data.switches) {
        setSwitches(data.switches);
      }
      if (data.encoders) {
        setEncoders((prev) => {
          const newEncoders = { ...prev };
          Object.keys(data.encoders).forEach((key) => {
            newEncoders[key] = {
              value: data.encoders[key],
              direction: prev[key]?.direction || null,
            };
          });
          return newEncoders;
        });
      }
    });

    // Key change
    socket.on('key_change', (data) => {
      setKey({ active: data.active });
    });

    // Switch change
    socket.on('switch_change', (data) => {
      setSwitches((prev) => ({
        ...prev,
        [data.switch]: { active: data.active },
      }));
    });

    // Encoder change
    socket.on('encoder_change', (data) => {
      setEncoders((prev) => ({
        ...prev,
        [data.encoder_id]: {
          value: data.value,
          direction: data.direction,
        },
      }));
    });

    // Encoder button press (resets to 0)
    socket.on('encoder_button_press', (data) => {
      setEncoders((prev) => ({
        ...prev,
        [data.encoder_id]: {
          value: 0,
          direction: null,
        },
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    connected,
    key,
    switches,
    encoders,
    socket: socketRef.current,
  };
};
