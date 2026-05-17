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
  { key: 'particles', emoji: '✨', label: 'Particles', component: Visualizer },
  { key: 'waves', emoji: '〰️', label: 'Oscilloscope', component: OscilloscopeWaves },
  { key: 'mosaic', emoji: '🔷', label: 'Mosaic', component: GeometricMosaic },
  { key: 'tunnel', emoji: '🌀', label: 'Tunnel', component: PerspectiveTunnel },
  { key: 'fluid', emoji: '🫧', label: 'Fluid', component: MetaballsFluid },
  { key: 'stars', emoji: '🚀', label: 'Hyperspace', component: HyperspaceStarfield },
  { key: 'tree', emoji: '🌳', label: 'Fractal Tree', component: FractalTree },
  { key: 'bars', emoji: '📊', label: 'Spectrum', component: SpectrumBars },
  { key: 'mandala', emoji: '🌸', label: 'Mandala', component: KaleidoscopeMandala },
  { key: 'rain', emoji: '💧', label: 'Matrix Rain', component: MatrixRain },
  { key: 'curve', emoji: '➰', label: 'Harmonograph', component: LissajousHarmonograph },
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
