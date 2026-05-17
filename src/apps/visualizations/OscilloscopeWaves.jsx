import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #000;
`;

const Canvas = styled.canvas`
  width: 100%;
  height: 100%;
  display: block;
`;

function OscilloscopeWaves({ hardwareData }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const hardwareDataRef = useRef(hardwareData);
  const phaseRef = useRef(0);
  const [showDebug, setShowDebug] = React.useState(true);
  const showDebugRef = useRef(showDebug);

  // Keep hardware data ref updated
  useEffect(() => {
    hardwareDataRef.current = hardwareData;
  }, [hardwareData]);

  // Keep showDebug ref updated
  useEffect(() => {
    showDebugRef.current = showDebug;
  }, [showDebug]);

  // Toggle debug view with spacebar
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setShowDebug((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      const { switches, encoders, key } = hardwareDataRef.current;
      const blueprint = key.active === true;

      // Phosphor trail
      if (blueprint) {
        ctx.fillStyle = 'rgba(235, 240, 250, 0.18)';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const waveCount = Math.max(4, Math.min(60, Math.abs(8 + encoders[1].value * 1)));
      const sizeMultiplier = Math.max(0.3, 1 + encoders[3].value * 0.1);
      const speedMultiplier = encoders[2].value * 0.02;
      const frequencyAmount = Math.abs(encoders[4].value) * 0.1;

      phaseRef.current += speedMultiplier;

      const activeColors = [];
      if (switches.red.active === true) activeColors.push('red');
      if (switches.green.active === true) activeColors.push('green');
      if (switches.blue.active === true) activeColors.push('blue');

      let totalWavesDrawn = 0;

      if (activeColors.length > 0) {
        const channelSpacing = canvas.height / activeColors.length;
        const baseAmplitude = (channelSpacing / (waveCount + 1)) * 0.9;
        const amplitude = baseAmplitude * sizeMultiplier;
        const strokeWidth = Math.max(0.5, 1.2 * sizeMultiplier);
        const baseFreq = 0.008;
        const freq = baseFreq + frequencyAmount * 0.004;
        const harmonicRatio = 2 + Math.floor(Math.abs(encoders[4].value) * 0.2) % 5;
        const harmonicMix = Math.min(0.9, frequencyAmount * 0.15);

        activeColors.forEach((color, channelIndex) => {
          let colorRGB;
          switch (color) {
            case 'red':
              colorRGB = [255, 40, 40];
              break;
            case 'green':
              colorRGB = [40, 255, 80];
              break;
            case 'blue':
              colorRGB = [60, 140, 255];
              break;
            default:
              colorRGB = [255, 255, 255];
          }

          if (blueprint) {
            colorRGB = [
              Math.floor(colorRGB[0] * 0.25),
              Math.floor(colorRGB[1] * 0.25),
              Math.floor(colorRGB[2] * 0.45),
            ];
          }

          const channelTop = channelIndex * channelSpacing;

          for (let w = 0; w < waveCount; w++) {
            const waveY = channelTop + ((w + 1) / (waveCount + 1)) * channelSpacing;
            const wavePhase = phaseRef.current + w * 0.3 + channelIndex * 0.7;
            const fadeMix = 0.5 + 0.5 * Math.sin(w * 0.4 + channelIndex);

            // Outer glow pass
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${colorRGB[0]}, ${colorRGB[1]}, ${colorRGB[2]}, ${0.15 * fadeMix})`;
            ctx.lineWidth = strokeWidth * 4;
            for (let x = 0; x <= canvas.width; x += 2) {
              const t = x * freq;
              const fundamental = Math.sin(t + wavePhase);
              const harmonic = Math.sin(t * harmonicRatio + wavePhase * 1.3) * harmonicMix;
              const y = waveY + (fundamental + harmonic) * amplitude;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Bright core
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${colorRGB[0]}, ${colorRGB[1]}, ${colorRGB[2]}, ${0.9})`;
            ctx.lineWidth = strokeWidth;
            for (let x = 0; x <= canvas.width; x += 2) {
              const t = x * freq;
              const fundamental = Math.sin(t + wavePhase);
              const harmonic = Math.sin(t * harmonicRatio + wavePhase * 1.3) * harmonicMix;
              const y = waveY + (fundamental + harmonic) * amplitude;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();

            totalWavesDrawn++;
          }
        });
      }

      if (showDebugRef.current) {
        const { connected } = hardwareDataRef.current;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 420, 310);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '16px monospace';

        ctx.fillText(
          `SOCKET: ${connected ? '● CONNECTED' : '○ DISCONNECTED'}`,
          20,
          35,
        );
        ctx.fillText(`─────────────────────────────`, 20, 50);
        ctx.fillText(
          `KEY: ${key.active === true ? 'ACTIVE' : 'INACTIVE'}`,
          20,
          65,
        );
        ctx.fillText(`─────────────────────────────`, 20, 80);
        ctx.fillText(
          `E1: ${encoders[1].value
            .toString()
            .padStart(4)} → Density: ${Math.floor(waveCount)}`,
          20,
          105,
        );
        ctx.fillText(
          `E2: ${encoders[2].value
            .toString()
            .padStart(4)} → Speed: ${speedMultiplier.toFixed(2)}x`,
          20,
          130,
        );
        ctx.fillText(
          `E3: ${encoders[3].value
            .toString()
            .padStart(4)} → Amplitude: ${sizeMultiplier.toFixed(2)}x`,
          20,
          155,
        );
        ctx.fillText(
          `E4: ${encoders[4].value
            .toString()
            .padStart(4)} → Frequency: ${frequencyAmount.toFixed(2)}`,
          20,
          180,
        );
        ctx.fillText(`─────────────────────────────`, 20, 195);
        ctx.fillText(
          `RED:   ${switches.red.active === true ? '● ACTIVE' : '○ INACTIVE'}`,
          20,
          220,
        );
        ctx.fillText(
          `GREEN: ${
            switches.green.active === true ? '● ACTIVE' : '○ INACTIVE'
          }`,
          20,
          245,
        );
        ctx.fillText(
          `BLUE:  ${switches.blue.active === true ? '● ACTIVE' : '○ INACTIVE'}`,
          20,
          270,
        );
        ctx.fillText(`─────────────────────────────`, 20, 285);
        ctx.fillText(`Waves: ${totalWavesDrawn}`, 20, 310);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <Container>
      <Canvas ref={canvasRef} />
    </Container>
  );
}

export default OscilloscopeWaves;
