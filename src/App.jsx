import React from 'react';
import styled from 'styled-components';
import { useHardwareData } from './hooks/useHardwareData';
import Visualizer from './apps/Visualizer';

const Screen = styled.div`
  height: 100vh;
  width: 100vw;
  background: #000000;
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
