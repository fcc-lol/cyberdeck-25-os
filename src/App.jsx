import React from 'react';
import styled from 'styled-components';
import { useHardwareData } from './hooks/useHardwareData';
import Visualizer from './apps/Visualizer';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0a0a0a;
  color: #fff;
  font-family: 'Courier New', monospace;
`;

const Header = styled.div`
  padding: 20px;
  background: #000;
  font-size: 24px;
  font-weight: bold;
  text-align: center;
`;

const StatusBar = styled.div`
  padding: 10px 20px;
  background: #000;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StatusIndicator = styled.span`
  color: ${(props) => (props.connected ? '#fff' : '#666')};
  font-size: 16px;
  &::before {
    content: '●';
    margin-right: 8px;
  }
`;

function App() {
  const hardwareData = useHardwareData();

  return (
    <Page>
      <Header>⚡ CYBERDECK-25-OS CONTROL PANEL ⚡</Header>
      <StatusBar>
        <StatusIndicator connected={hardwareData.connected}>
          {hardwareData.connected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
        </StatusIndicator>
      </StatusBar>
      <Visualizer hardwareData={hardwareData} />
    </Page>
  );
}

export default App;
