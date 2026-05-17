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

function GeometricMosaic({ hardwareData }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const hardwareDataRef = useRef(hardwareData);
  const tilesRef = useRef([]);
  const [showDebug, setShowDebug] = React.useState(false);
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

    const startTime = performance.now();

    const animate = () => {
      const { switches, encoders, key } = hardwareDataRef.current;
      const t = (performance.now() - startTime) / 1000;

      // Background based on key inversion
      const inverted = key.active === true;
      ctx.fillStyle = inverted ? 'rgb(240, 235, 225)' : 'rgb(8, 8, 12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Map encoder inputs
      const MAX_GRID = 28;
      const gridSize = Math.max(3, Math.min(MAX_GRID, Math.floor(4 + Math.abs(encoders[1].value))));
      const tileScale = Math.min(2.5, Math.max(0.3, 1 + encoders[3].value * 0.05));
      const pulseSpeed = encoders[2].value * 0.05;
      const rotationRate = Math.min(2.0, Math.abs(encoders[4].value * 0.01)) * Math.sign(encoders[4].value || 1);
      const hueShift = t * rotationRate * 30;

      // Active colors
      const activeColors = [];
      if (switches.red.active === true) activeColors.push([255, 40, 40]);
      if (switches.green.active === true) activeColors.push([40, 255, 80]);
      if (switches.blue.active === true) activeColors.push([60, 140, 255]);

      // Hexagon geometry
      const hexRadius = Math.min(canvas.width, canvas.height) / (gridSize * 1.8);
      const hexWidth = Math.sqrt(3) * hexRadius;
      const hexHeight = 2 * hexRadius;
      const vertSpacing = hexHeight * 0.75;

      const cols = Math.ceil(canvas.width / hexWidth) + 2;
      const rows = Math.ceil(canvas.height / vertSpacing) + 2;

      // Rebuild tile cache if grid changed
      const totalTiles = cols * rows;
      if (tilesRef.current.length !== totalTiles) {
        tilesRef.current = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            tilesRef.current.push({
              seed: Math.random() * Math.PI * 2,
              phase: Math.random() * Math.PI * 2,
              colorIdx: Math.floor(Math.random() * 3),
            });
          }
        }
      }

      let drawnCount = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tile = tilesRef.current[r * cols + c];
          const xOffset = (r % 2) * (hexWidth / 2);
          const cx = c * hexWidth + xOffset - hexWidth / 2;
          const cy = r * vertSpacing - hexHeight / 2;

          // Pulse oscillation
          const pulse = 0.85 + 0.15 * Math.sin(t * pulseSpeed * 2 + tile.phase);
          const alpha = 0.55 + 0.35 * Math.sin(t * pulseSpeed + tile.seed);
          const rot = t * rotationRate + tile.seed * 0.5;

          // Color selection
          let fill;
          if (activeColors.length === 0) {
            const dim = inverted ? 180 : 60;
            fill = `rgba(${dim}, ${dim}, ${dim}, ${alpha * 0.4})`;
          } else {
            const baseIdx = (tile.colorIdx + Math.floor(hueShift + r + c)) % activeColors.length;
            const safeIdx = ((baseIdx % activeColors.length) + activeColors.length) % activeColors.length;
            const [cr, cg, cb] = activeColors[safeIdx];
            if (inverted) {
              fill = `rgba(${Math.floor(cr * 0.55)}, ${Math.floor(cg * 0.55)}, ${Math.floor(cb * 0.55)}, ${alpha})`;
            } else {
              fill = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
            }
          }

          // Draw hexagon (setTransform avoids save/restore overhead per tile)
          const cosR = Math.cos(rot);
          const sinR = Math.sin(rot);
          ctx.setTransform(cosR, sinR, -sinR, cosR, cx, cy);
          const r2 = hexRadius * tileScale * pulse;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i + Math.PI / 6;
            const px = Math.cos(a) * r2;
            const py = Math.sin(a) * r2;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
          drawnCount++;
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Debug overlay
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
          `E1: ${encoders[1].value.toString().padStart(4)} → GridSize: ${gridSize}`,
          20,
          105,
        );
        ctx.fillText(
          `E2: ${encoders[2].value.toString().padStart(4)} → PulseSpeed: ${pulseSpeed.toFixed(3)}`,
          20,
          130,
        );
        ctx.fillText(
          `E3: ${encoders[3].value.toString().padStart(4)} → TileScale: ${tileScale.toFixed(2)}x`,
          20,
          155,
        );
        ctx.fillText(
          `E4: ${encoders[4].value.toString().padStart(4)} → Rotation: ${rotationRate.toFixed(3)}`,
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
          `GREEN: ${switches.green.active === true ? '● ACTIVE' : '○ INACTIVE'}`,
          20,
          245,
        );
        ctx.fillText(
          `BLUE:  ${switches.blue.active === true ? '● ACTIVE' : '○ INACTIVE'}`,
          20,
          270,
        );
        ctx.fillText(`─────────────────────────────`, 20, 285);
        ctx.fillText(`Tiles: ${drawnCount}`, 20, 310);
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

export default GeometricMosaic;
