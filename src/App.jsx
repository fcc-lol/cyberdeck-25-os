import React from 'react';
import styled from 'styled-components';
import { useHardwareData } from './hooks/useHardwareData';
import Visualizer from './apps/Visualizer';

const Screen = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #000000;
  cursor: none;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  overflow: hidden;
`;

function App() {
  const hardwareData = useHardwareData();

  return (
    <Screen>
      <Visualizer hardwareData={hardwareData} />
    </Screen>
  );
}

export default App;
