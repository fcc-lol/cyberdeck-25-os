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

function FractalTree({ hardwareData }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const hardwareDataRef = useRef(hardwareData);
  const branchCountRef = useRef(0);
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

    const startTime = performance.now();

    // Animation loop
    const animate = () => {
      // Get current values from hardware data ref
      const { switches, encoders, key } = hardwareDataRef.current;

      // Clear canvas based on key state (full clear, no trails)
      if (key.active === true) {
        ctx.fillStyle = 'rgb(245, 245, 240)'; // White sky
      } else {
        ctx.fillStyle = 'rgb(5, 5, 12)'; // Black sky
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Map encoders
      const depth = Math.max(
        4,
        Math.min(12, Math.round(8 + encoders[1].value * 0.5)),
      );
      const lengthMultiplier = Math.max(0.3, 1 + encoders[3].value * 0.08);
      const windSpeed = encoders[2].value * 0.0008;
      const branchAngle = Math.PI / 7 + encoders[4].value * 0.015;

      // Determine active colors
      const activeColors = [];
      if (switches.red.active === true)
        activeColors.push([255, 40, 40]);
      if (switches.green.active === true)
        activeColors.push([40, 255, 80]);
      if (switches.blue.active === true)
        activeColors.push([60, 140, 255]);

      const time = (performance.now() - startTime) * 0.001;
      const luminous = key.active !== true;
      const baseLength = (canvas.height / 4) * lengthMultiplier;
      const baseLineWidth = Math.max(1, 8 * lengthMultiplier);

      branchCountRef.current = 0;

      const drawBranch = (x, y, angle, length, currentDepth) => {
        if (currentDepth <= 0 || length < 1) return;

        const sway =
          Math.sin(time * windSpeed * 1000 + currentDepth * 0.7) *
          (0.04 + (depth - currentDepth) * 0.01);
        const finalAngle = angle + sway;

        const x2 = x + Math.cos(finalAngle) * length;
        const y2 = y + Math.sin(finalAngle) * length;

        let colorRGB;
        if (activeColors.length === 0) {
          // Fade out branches when no switches active
          const fade = luminous ? 30 : 200;
          colorRGB = [fade, fade, fade];
        } else {
          colorRGB =
            activeColors[(depth - currentDepth) % activeColors.length];
        }

        const alpha =
          activeColors.length === 0
            ? 0.15
            : 0.4 + (currentDepth / depth) * 0.6;
        const lw = Math.max(
          0.4,
          (currentDepth / depth) * baseLineWidth,
        );

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${colorRGB[0]}, ${colorRGB[1]}, ${colorRGB[2]}, ${alpha})`;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.stroke();

        branchCountRef.current += 1;

        const newLength = length * 0.72;
        const jitter = (encoders[4].value * 0.002) || 0;

        drawBranch(
          x2,
          y2,
          finalAngle - branchAngle + jitter,
          newLength,
          currentDepth - 1,
        );
        drawBranch(
          x2,
          y2,
          finalAngle + branchAngle - jitter,
          newLength,
          currentDepth - 1,
        );
      };

      // Draw tree from bottom center, growing upward (-PI/2)
      drawBranch(
        canvas.width / 2,
        canvas.height,
        -Math.PI / 2,
        baseLength,
        depth,
      );

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
            .padStart(4)} → Depth: ${depth}`,
          20,
          105,
        );
        ctx.fillText(
          `E2: ${encoders[2].value
            .toString()
            .padStart(4)} → WindSpeed: ${windSpeed.toFixed(4)}`,
          20,
          130,
        );
        ctx.fillText(
          `E3: ${encoders[3].value
            .toString()
            .padStart(4)} → Length: ${lengthMultiplier.toFixed(2)}x`,
          20,
          155,
        );
        ctx.fillText(
          `E4: ${encoders[4].value
            .toString()
            .padStart(4)} → BranchAngle: ${branchAngle.toFixed(2)}`,
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
        ctx.fillText(`Branches: ${branchCountRef.current}`, 20, 310);
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

export default FractalTree;
