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

function SpectrumBars({ hardwareData }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const barsRef = useRef([]);
  const hardwareDataRef = useRef(hardwareData);
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

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let time = 0;

    // Animation loop
    const animate = () => {
      // Get current values from hardware data ref
      const { switches, encoders, key } = hardwareDataRef.current;

      // Clear canvas with background based on key state
      const inverted = key.active === true;
      if (inverted) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // White background
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Black background
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barCount = Math.max(
        8,
        Math.min(128, Math.floor(Math.abs(32 + encoders[1].value * 2))),
      );
      const amplitude = Math.max(0.3, 1 + encoders[2].value * 0.08);
      const speed = Math.max(0, 0.005 + encoders[3].value * 0.0015);
      const spectrum = Math.max(0.2, 1 + encoders[4].value * 0.12);

      // Determine active colors
      const activeColors = [];
      if (switches.red.active === true)
        activeColors.push([255, 40, 40]);
      if (switches.green.active === true)
        activeColors.push([40, 255, 80]);
      if (switches.blue.active === true)
        activeColors.push([60, 140, 255]);

      // Resize bars array to match barCount
      if (barsRef.current.length !== barCount) {
        const newBars = [];
        for (let i = 0; i < barCount; i++) {
          newBars.push(
            barsRef.current[i] || {
              current: 0,
              peak: 0,
              phase: Math.random() * Math.PI * 2,
            },
          );
        }
        barsRef.current = newBars;
      }

      time += speed;

      // If no colors active, fade bars to zero
      const anyActive = activeColors.length > 0;

      const baselineY = canvas.height * 0.82;
      const maxBarHeight = canvas.height * 0.7 * amplitude;
      const totalWidth = canvas.width;
      const slotWidth = totalWidth / barCount;
      const gap = Math.max(1, slotWidth * 0.18);
      const barWidth = Math.max(1, slotWidth - gap);

      barsRef.current.forEach((bar, i) => {
        // Synthetic noise: sum of a few sines with different frequencies
        const norm = i / Math.max(1, barCount - 1);
        const freq1 = 0.8 + spectrum * 0.4;
        const freq2 = 1.6 + spectrum * 1.2;
        const freq3 = 3.0 + spectrum * 2.5;

        const phaseExp = 1 + spectrum * 0.6;
        const localPhase = Math.pow(norm, phaseExp) * Math.PI * 6;

        const s1 = Math.sin(time * freq1 + localPhase + bar.phase);
        const s2 = Math.sin(time * freq2 + i * 0.7 + bar.phase * 1.3);
        const s3 = Math.sin(time * freq3 + i * 1.9);

        let target = (s1 * 0.5 + s2 * 0.3 + s3 * 0.2) * 0.5 + 0.5;
        // Slight bias to make bars feel like a spectrum tilt
        target *= 0.6 + 0.4 * (1 - Math.abs(norm - 0.5) * 1.4);

        if (!anyActive) target = 0;

        // Ease current toward target
        bar.current += (target - bar.current) * 0.18;

        // Peak hold: rise instantly with current, fall slowly
        if (bar.current > bar.peak) {
          bar.peak = bar.current;
        } else {
          bar.peak -= 0.006;
          if (bar.peak < bar.current) bar.peak = bar.current;
          if (bar.peak < 0) bar.peak = 0;
        }

        if (!anyActive) {
          // No color: don't draw bars
          return;
        }

        const x = i * slotWidth + gap * 0.5;
        const h = Math.max(0, bar.current) * maxBarHeight;
        const peakH = Math.max(0, bar.peak) * maxBarHeight;

        // Choose color for this bar based on index
        const colorRGB = activeColors[i % activeColors.length];
        const [r, g, b] = colorRGB;

        // Vertical gradient from color at base to white/color-shifted at top
        const grad = ctx.createLinearGradient(0, baselineY - h, 0, baselineY);
        const topR = inverted ? Math.floor(r * 0.4) : Math.min(255, r + 120);
        const topG = inverted ? Math.floor(g * 0.4) : Math.min(255, g + 120);
        const topB = inverted ? Math.floor(b * 0.4) : Math.min(255, b + 120);
        grad.addColorStop(0, `rgba(${topR}, ${topG}, ${topB}, 0.95)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.9)`);

        ctx.fillStyle = grad;
        ctx.fillRect(x, baselineY - h, barWidth, h);

        // Mirrored downward bar (dimmer)
        const mirrorH = h * 0.4;
        const mgrad = ctx.createLinearGradient(
          0,
          baselineY,
          0,
          baselineY + mirrorH,
        );
        mgrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.45)`);
        mgrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = mgrad;
        ctx.fillRect(x, baselineY, barWidth, mirrorH);

        // Peak hold cap line
        const peakY = baselineY - peakH;
        ctx.fillStyle = inverted
          ? `rgba(20, 20, 20, 0.95)`
          : `rgba(255, 255, 255, 0.95)`;
        ctx.fillRect(x, peakY - 2, barWidth, 2);
      });

      // Baseline line
      ctx.strokeStyle = inverted
        ? 'rgba(0, 0, 0, 0.3)'
        : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      ctx.lineTo(canvas.width, baselineY);
      ctx.stroke();

      // Draw debug info if enabled
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
            .padStart(4)} → Bars: ${barCount}`,
          20,
          105,
        );
        ctx.fillText(
          `E2: ${encoders[2].value
            .toString()
            .padStart(4)} → Amplitude: ${amplitude.toFixed(2)}x`,
          20,
          130,
        );
        ctx.fillText(
          `E3: ${encoders[3].value
            .toString()
            .padStart(4)} → Speed: ${speed.toFixed(3)}`,
          20,
          155,
        );
        ctx.fillText(
          `E4: ${encoders[4].value
            .toString()
            .padStart(4)} → Spectrum: ${spectrum.toFixed(2)}`,
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
        ctx.fillText(`Bars: ${barsRef.current.length}`, 20, 310);
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
  }, []); // Empty deps - animation loop only initializes once

  return (
    <Container>
      <Canvas ref={canvasRef} />
    </Container>
  );
}

export default SpectrumBars;
