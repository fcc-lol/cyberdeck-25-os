import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { io } from 'socket.io-client';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a1a;
  color: #00ff00;
  font-family: 'Courier New', monospace;
`;

const Header = styled.div`
  padding: 20px;
  background: #0a0a0a;
  border-bottom: 2px solid #00ff00;
  font-size: 20px;
  font-weight: bold;
`;

const Status = styled.div`
  padding: 10px 20px;
  background: #0a0a0a;
  border-bottom: 1px solid #00ff00;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatusIndicator = styled.span`
  color: ${(props) => (props.connected ? '#00ff00' : '#ff0000')};
  &::before {
    content: '●';
    margin-right: 8px;
  }
`;

const EventList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
`;

const EventItem = styled.div`
  margin-bottom: 15px;
  padding: 10px;
  background: #0f0f0f;
  border-left: 3px solid #00ff00;
  border-radius: 3px;
  font-size: 14px;
`;

const EventHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #00ffff;
  font-weight: bold;
`;

const EventName = styled.span`
  color: #ffff00;
`;

const EventTimestamp = styled.span`
  color: #888;
  font-size: 12px;
`;

const EventData = styled.pre`
  margin: 0;
  padding: 8px;
  background: #000;
  border-radius: 3px;
  overflow-x: auto;
  font-size: 12px;
  color: #00ff00;
`;

const ClearButton = styled.button`
  padding: 8px 16px;
  background: #00ff00;
  color: #000;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-weight: bold;

  &:hover {
    background: #00cc00;
  }
`;

function App() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const eventIdCounter = useRef(0);

  useEffect(() => {
    // Connect to the socket server
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      setConnected(true);
      addEvent('connect', { socketId: socket.id });
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      addEvent('disconnect', { reason });
    });

    socket.on('connect_error', (error) => {
      addEvent('connect_error', { error: error.message });
    });

    // Capture all other events using onAny
    socket.onAny((eventName, ...args) => {
      // Skip the built-in connection events since we handle them above
      if (!['connect', 'disconnect', 'connect_error'].includes(eventName)) {
        addEvent(eventName, args.length === 1 ? args[0] : args);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const addEvent = (eventName, data) => {
    setEvents((prev) => [
      {
        id: eventIdCounter.current++,
        name: eventName,
        data: data,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <Page>
      <Header>🔌 Socket Event Monitor - http://localhost:5000</Header>
      <Status>
        <StatusIndicator connected={connected}>
          {connected ? 'Connected' : 'Disconnected'}
        </StatusIndicator>
        <ClearButton onClick={clearEvents}>Clear Events</ClearButton>
      </Status>
      <EventList>
        {events.length === 0 ? (
          <div
            style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>
            Waiting for socket events...
          </div>
        ) : (
          events.map((event) => (
            <EventItem key={event.id}>
              <EventHeader>
                <EventName>{event.name}</EventName>
                <EventTimestamp>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </EventTimestamp>
              </EventHeader>
              <EventData>{JSON.stringify(event.data, null, 2)}</EventData>
            </EventItem>
          ))
        )}
      </EventList>
    </Page>
  );
}

export default App;
