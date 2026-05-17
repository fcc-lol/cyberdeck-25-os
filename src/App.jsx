import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Escape') {
        setActiveKey(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const active = VISUALIZATIONS.find((v) => v.key === activeKey);
  const ActiveComponent = active?.component;

  return (
    <Screen>
      {ActiveComponent ? (
        <ActiveComponent hardwareData={hardwareData} />
      ) : (
        <Picker items={VISUALIZATIONS} onOpen={setActiveKey} />
      )}
    </Screen>
  );
}

export default App;
