import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useHardwareData } from './hooks/useHardwareData';
import Picker from './apps/Picker';
import Visualizer from './apps/Visualizer';
import OscilloscopeWaves from './apps/visualizations/OscilloscopeWaves';
import GeometricMosaic from './apps/visualizations/GeometricMosaic';
import PerspectiveTunnel from './apps/visualizations/PerspectiveTunnel';
import MetaballsFluid from './apps/visualizations/MetaballsFluid';
import HyperspaceStarfield from './apps/visualizations/HyperspaceStarfield';
import FractalTree from './apps/visualizations/FractalTree';
import SpectrumBars from './apps/visualizations/SpectrumBars';
import KaleidoscopeMandala from './apps/visualizations/KaleidoscopeMandala';
import MatrixRain from './apps/visualizations/MatrixRain';
import LissajousHarmonograph from './apps/visualizations/LissajousHarmonograph';

const LAUNCH_DURATION_MS = 280;

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

const VISUALIZATIONS = [
  { key: 'particles', icon: '/emoji/sparkles.svg', label: 'Particles', component: Visualizer },
  { key: 'waves', icon: '/emoji/wave.svg', label: 'Oscilloscope', component: OscilloscopeWaves },
  { key: 'mosaic', icon: '/emoji/diamond.svg', label: 'Mosaic', component: GeometricMosaic },
  { key: 'tunnel', icon: '/emoji/cyclone.svg', label: 'Tunnel', component: PerspectiveTunnel },
  { key: 'fluid', icon: '/emoji/crystal-ball.svg', label: 'Fluid', component: MetaballsFluid },
  { key: 'stars', icon: '/emoji/rocket.svg', label: 'Hyperspace', component: HyperspaceStarfield },
  { key: 'tree', icon: '/emoji/tree.svg', label: 'Fractal Tree', component: FractalTree },
  { key: 'bars', icon: '/emoji/bar-chart.svg', label: 'Spectrum', component: SpectrumBars },
  { key: 'mandala', icon: '/emoji/cherry-blossom.svg', label: 'Mandala', component: KaleidoscopeMandala },
  { key: 'rain', icon: '/emoji/droplet.svg', label: 'Matrix Rain', component: MatrixRain },
  { key: 'curve', icon: '/emoji/target.svg', label: 'Harmonograph', component: LissajousHarmonograph },
];

function App() {
  const hardwareData = useHardwareData();
  const [activeKey, setActiveKey] = useState(null);
  const [launchingKey, setLaunchingKey] = useState(null);
  const encoderSnapshotRef = useRef({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const launchTimeoutRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Escape') {
        if (launchTimeoutRef.current) {
          clearTimeout(launchTimeoutRef.current);
          launchTimeoutRef.current = null;
        }
        setLaunchingKey(null);
        setActiveKey(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleOpen = (key) => {
    if (launchTimeoutRef.current) {
      clearTimeout(launchTimeoutRef.current);
    }
    encoderSnapshotRef.current = {
      1: hardwareData.encoders[1].value,
      2: hardwareData.encoders[2].value,
      3: hardwareData.encoders[3].value,
      4: hardwareData.encoders[4].value,
    };
    setLaunchingKey(key);
    launchTimeoutRef.current = setTimeout(() => {
      setActiveKey(key);
      setLaunchingKey(null);
      launchTimeoutRef.current = null;
    }, LAUNCH_DURATION_MS);
  };

  const snapshot = encoderSnapshotRef.current;
  const offsetHardwareData = {
    ...hardwareData,
    encoders: {
      1: { ...hardwareData.encoders[1], value: hardwareData.encoders[1].value - snapshot[1] },
      2: { ...hardwareData.encoders[2], value: hardwareData.encoders[2].value - snapshot[2] },
      3: { ...hardwareData.encoders[3], value: hardwareData.encoders[3].value - snapshot[3] },
      4: { ...hardwareData.encoders[4], value: hardwareData.encoders[4].value - snapshot[4] },
    },
  };

  const active = VISUALIZATIONS.find((v) => v.key === activeKey);
  const ActiveComponent = active?.component;

  return (
    <Screen>
      {ActiveComponent ? (
        <ActiveComponent hardwareData={offsetHardwareData} />
      ) : (
        <Picker
          items={VISUALIZATIONS}
          onOpen={handleOpen}
          launchingKey={launchingKey}
        />
      )}
    </Screen>
  );
}

export default App;
