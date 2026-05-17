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

function PerspectiveTunnel({ hardwareData }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const ringsRef = useRef([]);
  const zOffsetRef = useRef(0);
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

    // Tunnel constants
    const NEAR = 8;
    const FAR = 800;
    const FOCAL = 500;
    const MAX_RINGS = 22;        // Pi-safe ring ceiling
    const MAX_SIDES = 12;        // Pi-safe polygon side ceiling
    const MAX_SIZE = 3;          // Pi-safe radius multiplier ceiling

    // Animation loop
    const animate = () => {
      // Get current values from hardware data ref
      const { switches, encoders, key } = hardwareDataRef.current;

      // Clear canvas with background based on key state
      if (key.active === true) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // White background
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Black background
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const ringCount = Math.max(
        4,
        Math.min(MAX_RINGS, Math.floor(Math.abs(20 + encoders[1].value * 2))),
      );
      const sizeMultiplier = Math.min(MAX_SIZE, Math.max(0.3, 1 + encoders[3].value * 0.1));
      const speed = Math.max(0, 0.5 + encoders[2].value * 0.4);
      const twist = encoders[4].value * 0.05;
      const sides = Math.max(
        3,
        Math.min(MAX_SIDES, 3 + Math.floor(Math.abs(encoders[4].value) / 3)),
      );

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(canvas.width, canvas.height) * 0.55;

      // Determine active colors
      const activeColors = [];
      if (switches.red.active === true) activeColors.push([255, 40, 40]);
      if (switches.green.active === true) activeColors.push([40, 255, 80]);
      if (switches.blue.active === true) activeColors.push([60, 140, 255]);

      // Advance camera through tunnel
      zOffsetRef.current += speed;

      // Rebuild rings array when count changes
      if (ringsRef.current.length !== ringCount) {
        ringsRef.current = [];
        const spacing = (FAR - NEAR) / ringCount;
        for (let i = 0; i < ringCount; i++) {
          ringsRef.current.push({ index: i, baseZ: NEAR + i * spacing });
        }
      }

      if (activeColors.length === 0) {
        // Fade only — no rings drawn
        if (showDebugRef.current) drawDebug(ctx, canvas, hardwareDataRef.current, ringCount, sides, sizeMultiplier, speed, twist);
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const span = FAR - NEAR;

      // Build draw list sorted far → near
      const drawList = ringsRef.current
        .map((ring) => {
          let z = ring.baseZ - (zOffsetRef.current % span);
          if (z < NEAR) z += span;
          return { z, index: ring.index };
        })
        .sort((a, b) => b.z - a.z);

      // Draw spokes between adjacent rings
      const lineColorBase = key.active === true ? [30, 30, 50] : null;
      ctx.lineWidth = 1;

      const offScreenThreshold = 3 * Math.max(canvas.width, canvas.height);

      for (let i = 0; i < drawList.length - 1; i++) {
        const a = drawList[i];
        const b = drawList[i + 1];
        const rA = (baseRadius * sizeMultiplier * FOCAL) / a.z;
        const rB = (baseRadius * sizeMultiplier * FOCAL) / b.z;

        // Skip spoke pair if both rings are entirely off-screen
        if (rA > offScreenThreshold && rB > offScreenThreshold) continue;
        const rotA = a.z * twist * 0.01;
        const rotB = b.z * twist * 0.01;
        const depth = 1 - (a.z - NEAR) / span;

        let strokeRGB;
        if (lineColorBase) {
          strokeRGB = `rgba(20, 20, 40, ${0.15 + depth * 0.3})`;
        } else {
          const c = activeColors[a.index % activeColors.length];
          strokeRGB = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${0.1 + depth * 0.2})`;
        }
        ctx.strokeStyle = strokeRGB;

        for (let s = 0; s < sides; s++) {
          const angA = (s / sides) * Math.PI * 2 + rotA;
          const angB = (s / sides) * Math.PI * 2 + rotB;
          ctx.beginPath();
          ctx.moveTo(centerX + Math.cos(angA) * rA, centerY + Math.sin(angA) * rA);
          ctx.lineTo(centerX + Math.cos(angB) * rB, centerY + Math.sin(angB) * rB);
          ctx.stroke();
        }
      }

      // Draw rings far → near
      for (let i = 0; i < drawList.length; i++) {
        const { z, index } = drawList[i];
        const screenRadius = (baseRadius * sizeMultiplier * FOCAL) / z;

        // Skip rings entirely off-screen
        if (screenRadius > offScreenThreshold) continue;

        const depth = 1 - (z - NEAR) / span;
        const rot = z * twist * 0.01;

        const c = activeColors[index % activeColors.length];
        const alpha = 0.25 + depth * 0.75;
        const lineW = Math.max(0.5, sizeMultiplier * (0.5 + depth * 2.5));

        if (key.active === true) {
          ctx.strokeStyle = `rgba(${Math.floor(c[0] * 0.4)}, ${Math.floor(
            c[1] * 0.4,
          )}, ${Math.floor(c[2] * 0.4)}, ${alpha})`;
        } else {
          ctx.strokeStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
        }
        ctx.lineWidth = lineW;

        ctx.beginPath();
        for (let s = 0; s <= sides; s++) {
          const ang = (s / sides) * Math.PI * 2 + rot;
          const x = centerX + Math.cos(ang) * screenRadius;
          const y = centerY + Math.sin(ang) * screenRadius;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw debug info if enabled
      if (showDebugRef.current) {
        drawDebug(
          ctx,
          canvas,
          hardwareDataRef.current,
          ringCount,
          sides,
          sizeMultiplier,
          speed,
          twist,
        );
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    const drawDebug = (
      ctx,
      canvas,
      data,
      ringCount,
      sides,
      sizeMultiplier,
      speed,
      twist,
    ) => {
      const { switches, encoders, key, connected } = data;

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
        `E1: ${encoders[1].value.toString().padStart(4)} → Rings:  ${ringCount}`,
        20,
        105,
      );
      ctx.fillText(
        `E2: ${encoders[2].value
          .toString()
          .padStart(4)} → Speed:  ${speed.toFixed(2)}`,
        20,
        130,
      );
      ctx.fillText(
        `E3: ${encoders[3].value
          .toString()
          .padStart(4)} → Radius: ${sizeMultiplier.toFixed(2)}x`,
        20,
        155,
      );
      ctx.fillText(
        `E4: ${encoders[4].value
          .toString()
          .padStart(4)} → Twist:  ${twist.toFixed(3)} / Sides: ${sides}`,
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
      ctx.fillText(`Rings: ${ringsRef.current.length}`, 20, 310);
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

export default PerspectiveTunnel;
