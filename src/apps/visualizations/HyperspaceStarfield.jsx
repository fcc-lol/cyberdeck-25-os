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

function HyperspaceStarfield({ hardwareData }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const starsRef = useRef([]);
  const rollAngleRef = useRef(0);
  const hardwareDataRef = useRef(hardwareData);
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

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const FAR_Z = 1000;
    const FOCAL = 350;

    const spawnStar = (color) => {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = Math.random() * FAR_Z + 1;
      return {
        x,
        y,
        z,
        prevSX: null,
        prevSY: null,
        color,
      };
    };

    // Animation loop
    const animate = () => {
      // Get current values from hardware data ref
      const { switches, encoders, key } = hardwareDataRef.current;

      // Clear canvas with background based on key state (trails)
      const invert = key.active === true;
      if (invert) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const density = Math.floor(
        Math.max(0, Math.min(2000, 50 + Math.abs(encoders[1].value) * 15)),
      );
      const brightness = Math.max(0.3, 1 + encoders[3].value * 0.1);
      const velocity = encoders[2].value * 0.5;
      const rollRate = encoders[4].value * 0.002;

      // Update roll angle
      rollAngleRef.current += rollRate;

      // Determine active colors
      const activeColors = [];
      if (switches.red.active === true) activeColors.push('red');
      if (switches.green.active === true) activeColors.push('green');
      if (switches.blue.active === true) activeColors.push('blue');

      const noColors = activeColors.length === 0;

      if (noColors) {
        // All white dim mode
        const existing = starsRef.current;
        // Convert all to white
        existing.forEach((s) => (s.color = 'white'));
        // Maintain density
        while (starsRef.current.length < density) {
          starsRef.current.push(spawnStar('white'));
        }
        while (starsRef.current.length > density) {
          starsRef.current.pop();
        }
      } else {
        // Convert non-matching stars (including 'white') to active colors
        const existingColors = new Set(starsRef.current.map((s) => s.color));
        const missingColors = activeColors.filter(
          (c) => !existingColors.has(c),
        );

        if (missingColors.length > 0 && starsRef.current.length > 0) {
          const toConvert = Math.ceil(
            starsRef.current.length / activeColors.length,
          );
          let idx = 0;
          for (let i = 0; i < toConvert && missingColors.length > 0; i++) {
            const ci = i % missingColors.length;
            if (idx < starsRef.current.length) {
              starsRef.current[idx].color = missingColors[ci];
              idx++;
            }
          }
        }

        starsRef.current = starsRef.current.filter((s) =>
          activeColors.includes(s.color),
        );

        while (starsRef.current.length < density) {
          const color =
            activeColors[Math.floor(Math.random() * activeColors.length)];
          starsRef.current.push(spawnStar(color));
        }
        while (starsRef.current.length > density) {
          starsRef.current.pop();
        }
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      // Lateral camera drift tied to roll
      const driftX = Math.sin(rollAngleRef.current * 0.3) * 20;
      const driftY = Math.cos(rollAngleRef.current * 0.3) * 20;

      const cosR = Math.cos(rollAngleRef.current);
      const sinR = Math.sin(rollAngleRef.current);

      // Update and draw stars
      starsRef.current.forEach((star) => {
        // Advance forward
        star.z -= velocity;

        // Respawn if behind camera
        if (star.z <= 1) {
          star.x = (Math.random() - 0.5) * 2000;
          star.y = (Math.random() - 0.5) * 2000;
          star.z = FAR_Z;
          star.prevSX = null;
          star.prevSY = null;
        }

        // Rotate around z-axis
        const rx = star.x * cosR - star.y * sinR;
        const ry = star.x * sinR + star.y * cosR;

        // Project
        const sx = (rx * FOCAL) / star.z + cx + driftX;
        const sy = (ry * FOCAL) / star.z + cy + driftY;

        // Depth-based intensity (closer = brighter, longer streak)
        const depth = 1 - star.z / FAR_Z; // 0 far, 1 near
        const alpha = Math.min(1, 0.2 + depth * 0.9) * brightness;
        const lineWidth = Math.max(0.3, depth * 2.5 * brightness);

        // Color
        let colorStr;
        if (star.color === 'red') {
          colorStr = `rgba(255, 40, 40, ${alpha})`;
        } else if (star.color === 'green') {
          colorStr = `rgba(40, 255, 80, ${alpha})`;
        } else if (star.color === 'blue') {
          colorStr = `rgba(60, 140, 255, ${alpha})`;
        } else {
          // white dim
          const v = invert ? 60 : 200;
          colorStr = `rgba(${v}, ${v}, ${v}, ${alpha * 0.5})`;
        }

        // If first frame for this star, just set previous
        if (star.prevSX === null) {
          star.prevSX = sx;
          star.prevSY = sy;
        }

        // Draw streak from previous projected to current
        ctx.beginPath();
        ctx.moveTo(star.prevSX, star.prevSY);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = invert
          ? colorStr
              .replace('rgba(255, 40, 40', 'rgba(180, 0, 0')
              .replace('rgba(40, 255, 80', 'rgba(0, 160, 40')
              .replace('rgba(60, 140, 255', 'rgba(0, 60, 200')
          : colorStr;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Update previous
        star.prevSX = sx;
        star.prevSY = sy;
      });

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
            .padStart(4)} → Stars: ${density}`,
          20,
          105,
        );
        ctx.fillText(
          `E2: ${encoders[2].value
            .toString()
            .padStart(4)} → Velocity: ${velocity.toFixed(2)}`,
          20,
          130,
        );
        ctx.fillText(
          `E3: ${encoders[3].value
            .toString()
            .padStart(4)} → Brightness: ${brightness.toFixed(2)}x`,
          20,
          155,
        );
        ctx.fillText(
          `E4: ${encoders[4].value
            .toString()
            .padStart(4)} → Roll: ${rollRate.toFixed(4)}`,
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
        ctx.fillText(`Stars: ${starsRef.current.length}`, 20, 310);
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

export default HyperspaceStarfield;
