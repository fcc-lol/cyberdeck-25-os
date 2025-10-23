import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { io } from 'socket.io-client';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a0a0a;
  color: #00ff00;
  font-family: 'Courier New', monospace;
`;

const Header = styled.div`
  padding: 20px;
  background: #000;
  border-bottom: 2px solid #00ff00;
  font-size: 24px;
  font-weight: bold;
  text-align: center;
`;

const StatusBar = styled.div`
  padding: 10px 20px;
  background: #000;
  border-bottom: 1px solid #00ff00;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StatusIndicator = styled.span`
  color: ${(props) => (props.connected ? '#00ff00' : '#ff0000')};
  font-size: 16px;
  &::before {
    content: '●';
    margin-right: 8px;
  }
`;

const Dashboard = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 30px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 20px;
  align-content: start;
`;

const Section = styled.div`
  background: #0f0f0f;
  border: 2px solid #00ff00;
  border-radius: 8px;
  padding: 20px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 20px 0;
  color: #ffff00;
  font-size: 20px;
  text-transform: uppercase;
  border-bottom: 1px solid #00ff00;
  padding-bottom: 10px;
`;

const ComponentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
`;

const Component = styled.div`
  background: #000;
  border: 1px solid ${(props) => (props.active ? '#00ff00' : '#333')};
  border-radius: 4px;
  padding: 15px;
  text-align: center;
`;

const ComponentLabel = styled.div`
  color: #00ffff;
  font-size: 14px;
  margin-bottom: 10px;
  text-transform: uppercase;
`;

const ComponentValue = styled.div`
  color: ${(props) => (props.active ? '#00ff00' : '#ff0000')};
  font-size: 32px;
  font-weight: bold;
  margin: 10px 0;
`;

const ComponentState = styled.div`
  color: #888;
  font-size: 12px;
  margin-top: 5px;
`;

const EncoderValue = styled.div`
  color: #00ff00;
  font-size: 48px;
  font-weight: bold;
  margin: 10px 0;
`;

const EncoderDirection = styled.div`
  color: #ffff00;
  font-size: 14px;
  margin-top: 5px;
`;

const FullWidthSection = styled(Section)`
  grid-column: 1 / -1;
`;

function App() {
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
    const socket = io('http://localhost:5000', {
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

  const getKeyStatus = (active) => {
    if (active === null) return 'UNKNOWN';
    return active ? 'RELEASED' : 'PRESSED';
  };

  const getSwitchStatus = (active) => {
    if (active === null) return 'UNKNOWN';
    return active ? 'RELEASED' : 'PRESSED';
  };

  return (
    <Page>
      <Header>⚡ CYBERDECK-25-OS CONTROL PANEL ⚡</Header>
      <StatusBar>
        <StatusIndicator connected={connected}>
          {connected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
        </StatusIndicator>
      </StatusBar>
      <Dashboard>
        <Section>
          <SectionTitle>🔘 Main Key</SectionTitle>
          <Component active={key.active !== null && !key.active}>
            <ComponentLabel>Status</ComponentLabel>
            <ComponentValue active={key.active !== null && !key.active}>
              {key.active === null ? '?' : key.active ? '○' : '●'}
            </ComponentValue>
            <ComponentState>{getKeyStatus(key.active)}</ComponentState>
          </Component>
        </Section>

        <Section>
          <SectionTitle>🎚️ Switches</SectionTitle>
          <ComponentGrid>
            {['red', 'green', 'blue'].map((color) => (
              <Component
                key={color}
                active={
                  switches[color].active !== null && !switches[color].active
                }>
                <ComponentLabel>{color}</ComponentLabel>
                <ComponentValue
                  active={
                    switches[color].active !== null && !switches[color].active
                  }>
                  {switches[color].active === null
                    ? '?'
                    : switches[color].active
                    ? '○'
                    : '●'}
                </ComponentValue>
                <ComponentState>
                  {getSwitchStatus(switches[color].active)}
                </ComponentState>
              </Component>
            ))}
          </ComponentGrid>
        </Section>

        <FullWidthSection>
          <SectionTitle>🎛️ Rotary Encoders</SectionTitle>
          <ComponentGrid>
            {[1, 2, 3, 4].map((id) => (
              <Component key={id} active={true}>
                <ComponentLabel>Encoder {id}</ComponentLabel>
                <EncoderValue>{encoders[id].value}</EncoderValue>
                <EncoderDirection>
                  {encoders[id].direction === 'right'
                    ? '→ CLOCKWISE'
                    : encoders[id].direction === 'left'
                    ? '← COUNTER-CW'
                    : '— IDLE'}
                </EncoderDirection>
              </Component>
            ))}
          </ComponentGrid>
        </FullWidthSection>
      </Dashboard>
    </Page>
  );
}

export default App;
