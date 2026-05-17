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

function MetaballsFluid({ hardwareData }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const blobsRef = useRef([]);
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

    // Offscreen low-res buffer for the scalar field
    const CELL = 8; // downsample factor
    const MAX_BLOBS = 18; // per active color
    let fieldCanvas = document.createElement('canvas');
    let fieldCtx = fieldCanvas.getContext('2d');
    let fieldImage = null;
    let fieldW = 0;
    let fieldH = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      fieldW = Math.max(1, Math.ceil(canvas.width / CELL));
      fieldH = Math.max(1, Math.ceil(canvas.height / CELL));
      fieldCanvas.width = fieldW;
      fieldCanvas.height = fieldH;
      fieldImage = fieldCtx.createImageData(fieldW, fieldH);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const COLORS = {
      red: [255, 40, 40],
      green: [40, 255, 80],
      blue: [60, 140, 255],
    };

    const makeBlob = (color) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      r: 40 + Math.random() * 50,
      color,
    });

    const animate = () => {
      const { switches, encoders, key } = hardwareDataRef.current;

      const invert = key.active === true;
      const count = Math.max(
        3,
        Math.min(MAX_BLOBS, Math.floor(3 + Math.abs(encoders[1].value) * 1.2)),
      );
      const radiusMul = Math.min(2.5, Math.max(0.3, 1 + encoders[3].value * 0.08));
      const speedMul = encoders[2].value * 0.04;
      const distort = encoders[4].value * 0.001;
      // threshold: lower threshold = more stringy tendrils
      const threshold = Math.max(0.35, 1.0 - Math.abs(encoders[4].value) * 0.03);

      const activeColors = [];
      if (switches.red.active === true) activeColors.push('red');
      if (switches.green.active === true) activeColors.push('green');
      if (switches.blue.active === true) activeColors.push('blue');

      if (activeColors.length === 0) {
        blobsRef.current = [];
      } else {
        // Reconcile blob colors with active set
        const existing = new Set(blobsRef.current.map((b) => b.color));
        const missing = activeColors.filter((c) => !existing.has(c));
        if (missing.length > 0 && blobsRef.current.length > 0) {
          const toConvert = Math.ceil(
            blobsRef.current.length / activeColors.length,
          );
          let idx = 0;
          for (let i = 0; i < toConvert && missing.length > 0; i++) {
            const c = missing[i % missing.length];
            if (idx < blobsRef.current.length) {
              blobsRef.current[idx].color = c;
              idx++;
            }
          }
        }
        blobsRef.current = blobsRef.current.filter((b) =>
          activeColors.includes(b.color),
        );

        const totalTarget = count * activeColors.length;
        while (blobsRef.current.length < totalTarget) {
          const c =
            activeColors[Math.floor(Math.random() * activeColors.length)];
          blobsRef.current.push(makeBlob(c));
        }
        while (blobsRef.current.length > totalTarget) {
          blobsRef.current.pop();
        }
      }

      // Move blobs
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      blobsRef.current.forEach((b) => {
        b.x += b.vx * speedMul;
        b.y += b.vy * speedMul;

        if (distort !== 0) {
          const dx = b.x - centerX;
          const dy = b.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const a = Math.atan2(dy, dx) + distort;
          b.x = centerX + Math.cos(a) * dist;
          b.y = centerY + Math.sin(a) * dist;
        }

        // Bounce off edges
        if (b.x < 0) {
          b.x = 0;
          b.vx = Math.abs(b.vx);
        }
        if (b.x > canvas.width) {
          b.x = canvas.width;
          b.vx = -Math.abs(b.vx);
        }
        if (b.y < 0) {
          b.y = 0;
          b.vy = Math.abs(b.vy);
        }
        if (b.y > canvas.height) {
          b.y = canvas.height;
          b.vy = -Math.abs(b.vy);
        }
      });

      // Clear main canvas (background)
      ctx.fillStyle = invert ? 'rgb(245,245,245)' : 'rgb(0,0,0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (blobsRef.current.length === 0) {
        if (showDebugRef.current) drawDebug();
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Compute scalar field per color channel at downsampled resolution
      const data = fieldImage.data;
      // Precompute blob list per color with scaled radius squared
      const blobs = blobsRef.current.map((b) => {
        const rr = (b.r * radiusMul) / CELL;
        return {
          x: b.x / CELL,
          y: b.y / CELL,
          r2: rr * rr,
          color: b.color,
        };
      });

      for (let py = 0; py < fieldH; py++) {
        for (let px = 0; px < fieldW; px++) {
          let fr = 0;
          let fg = 0;
          let fb = 0;
          for (let i = 0; i < blobs.length; i++) {
            const b = blobs[i];
            const dx = px - b.x;
            const dy = py - b.y;
            const d2 = dx * dx + dy * dy + 0.001;
            const v = b.r2 / d2;
            if (b.color === 'red') fr += v;
            else if (b.color === 'green') fg += v;
            else fb += v;
          }

          const idx = (py * fieldW + px) * 4;
          // Combined intensity for threshold mask
          const total = fr + fg + fb;
          if (total > threshold) {
            // Normalize color contribution
            const nr = fr / (total + 0.0001);
            const ng = fg / (total + 0.0001);
            const nb = fb / (total + 0.0001);
            let rOut =
              nr * COLORS.red[0] + ng * COLORS.green[0] + nb * COLORS.blue[0];
            let gOut =
              nr * COLORS.red[1] + ng * COLORS.green[1] + nb * COLORS.blue[1];
            let bOut =
              nr * COLORS.red[2] + ng * COLORS.green[2] + nb * COLORS.blue[2];

            // Brighten core (where total >> threshold)
            const core = Math.min(1, (total - threshold) * 0.6);
            rOut = rOut + (255 - rOut) * core * 0.4;
            gOut = gOut + (255 - gOut) * core * 0.4;
            bOut = bOut + (255 - bOut) * core * 0.4;

            if (invert) {
              // Darken colors against light background
              rOut *= 0.7;
              gOut *= 0.7;
              bOut *= 0.7;
              data[idx] = rOut;
              data[idx + 1] = gOut;
              data[idx + 2] = bOut;
              data[idx + 3] = 255;
            } else {
              data[idx] = rOut;
              data[idx + 1] = gOut;
              data[idx + 2] = bOut;
              data[idx + 3] = 255;
            }
          } else {
            // Outside isosurface: transparent
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 0;
          }
        }
      }

      fieldCtx.putImageData(fieldImage, 0, 0);

      // Scale up to main canvas with smoothing for that gooey look
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(fieldCanvas, 0, 0, canvas.width, canvas.height);

      if (showDebugRef.current) drawDebug();

      function drawDebug() {
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
            .padStart(4)} → Blobs: ${count}`,
          20,
          105,
        );
        ctx.fillText(
          `E2: ${encoders[2].value
            .toString()
            .padStart(4)} → Speed: ${speedMul.toFixed(2)}x`,
          20,
          130,
        );
        ctx.fillText(
          `E3: ${encoders[3].value
            .toString()
            .padStart(4)} → Radius: ${radiusMul.toFixed(2)}x`,
          20,
          155,
        );
        ctx.fillText(
          `E4: ${encoders[4].value
            .toString()
            .padStart(4)} → Distort: ${threshold.toFixed(2)}`,
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
        ctx.fillText(`Blobs: ${blobsRef.current.length}`, 20, 310);
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

export default MetaballsFluid;
