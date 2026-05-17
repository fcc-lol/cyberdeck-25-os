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

function KaleidoscopeMandala({ hardwareData }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const wedgeCanvasRef = useRef(null);
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

    // Offscreen wedge canvas
    const wedgeCanvas = document.createElement('canvas');
    const wctx = wedgeCanvas.getContext('2d');
    wedgeCanvasRef.current = wedgeCanvas;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const r = Math.ceil(
        Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) /
          2,
      );
      wedgeCanvas.width = r;
      wedgeCanvas.height = r;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let evolveTime = 0;
    let barrelAngle = 0;
    let lastTs = performance.now();

    // Animation loop
    const animate = () => {
      const now = performance.now();
      const dt = (now - lastTs) / 1000;
      lastTs = now;

      const { switches, encoders, key } = hardwareDataRef.current;

      // Background fade (inverted by key)
      if (key.active === true) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const segments = Math.max(
        3,
        Math.min(24, 6 + Math.abs(encoders[1].value)),
      );
      const scale = Math.max(0.3, 1 + encoders[2].value * 0.08);
      const evolveRate = encoders[3].value * 0.05;
      const rotationRate = encoders[4].value * 0.02;

      evolveTime += dt * evolveRate;
      barrelAngle += dt * rotationRate;

      // Determine active colors
      const activeColors = [];
      if (switches.red.active === true) activeColors.push([255, 40, 40]);
      if (switches.green.active === true) activeColors.push([40, 255, 80]);
      if (switches.blue.active === true) activeColors.push([60, 140, 255]);

      // Fallback color when no switches are active
      const drawColors =
        activeColors.length > 0
          ? activeColors
          : [key.active === true ? [20, 20, 20] : [200, 200, 200]];

      const wedgeAngle = (Math.PI * 2) / segments;
      const r = wedgeCanvas.width;

      // Render source wedge to offscreen canvas
      wctx.clearRect(0, 0, r, r);

      // Clip to wedge region (apex at 0,0, opening downward by wedgeAngle)
      wctx.save();
      wctx.beginPath();
      wctx.moveTo(0, 0);
      wctx.arc(0, 0, r, -wedgeAngle / 2, wedgeAngle / 2);
      wctx.closePath();
      wctx.clip();

      // Draw layered generative strokes per active color
      const t = evolveTime;
      drawColors.forEach((rgb, ci) => {
        const phase = ci * 1.7;

        // Moving circles
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * wedgeAngle - wedgeAngle / 2;
          const dist =
            r * 0.2 +
            r * 0.5 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 0.7 + phase));
          const cx = Math.cos(a) * dist * scale;
          const cy = Math.sin(a) * dist * scale;
          const rad =
            r * 0.04 * scale * (1 + 0.6 * Math.sin(t * 2.1 + i + phase));
          wctx.beginPath();
          wctx.arc(cx, cy, Math.max(1, rad), 0, Math.PI * 2);
          wctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${
            key.active === true ? 0.35 : 0.55
          })`;
          wctx.fill();
        }

        // Sinusoidal stroke arcs
        wctx.lineWidth = 1.5;
        wctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${
          key.active === true ? 0.5 : 0.75
        })`;
        for (let k = 0; k < 3; k++) {
          wctx.beginPath();
          const steps = 40;
          for (let s = 0; s <= steps; s++) {
            const f = s / steps;
            const baseR = r * (0.15 + 0.7 * f) * scale;
            const wob =
              r *
              0.04 *
              scale *
              Math.sin(t * 1.8 + f * 6 + k * 1.3 + phase);
            const aa =
              (Math.sin(t * 0.9 + k + phase) * 0.5 - 0.25) * wedgeAngle +
              (f - 0.5) * wedgeAngle * 0.6;
            const x = Math.cos(aa) * (baseR + wob);
            const y = Math.sin(aa) * (baseR + wob);
            if (s === 0) wctx.moveTo(x, y);
            else wctx.lineTo(x, y);
          }
          wctx.stroke();
        }

        // Petal-ish arcs near apex
        wctx.lineWidth = 2;
        for (let p = 0; p < 4; p++) {
          const pr = r * (0.1 + p * 0.08) * scale;
          const sweep =
            wedgeAngle *
            (0.3 + 0.4 * Math.abs(Math.sin(t * 1.1 + p + phase)));
          wctx.beginPath();
          wctx.arc(0, 0, pr, -sweep / 2, sweep / 2);
          wctx.stroke();
        }
      });

      wctx.restore();

      // Composite wedge around center N times with mirror alternation
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (let i = 0; i < segments; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(barrelAngle + i * wedgeAngle);
        if (i % 2 === 1) {
          ctx.scale(1, -1);
        }
        // Wedge apex is at offscreen (0,0); rotate so wedge opens to the right
        ctx.drawImage(wedgeCanvas, 0, -wedgeCanvas.height / 2);
        ctx.restore();
      }

      // Debug overlay
      if (showDebugRef.current) {
        const { connected } = hardwareDataRef.current;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 420, 335);
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
            .padStart(4)} → Segments: ${segments}`,
          20,
          105,
        );
        ctx.fillText(
          `E2: ${encoders[2].value
            .toString()
            .padStart(4)} → Scale: ${scale.toFixed(2)}x`,
          20,
          130,
        );
        ctx.fillText(
          `E3: ${encoders[3].value
            .toString()
            .padStart(4)} → Evolve: ${evolveRate.toFixed(2)}x`,
          20,
          155,
        );
        ctx.fillText(
          `E4: ${encoders[4].value
            .toString()
            .padStart(4)} → Rotation: ${rotationRate.toFixed(3)}`,
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
        ctx.fillText(`Segments: ${segments}`, 20, 310);
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

export default KaleidoscopeMandala;
