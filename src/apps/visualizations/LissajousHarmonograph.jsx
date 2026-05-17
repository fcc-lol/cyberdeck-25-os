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

function LissajousHarmonograph({ hardwareData }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const hardwareDataRef = useRef(hardwareData);
  const tRef = useRef(0);
  const lastPointRef = useRef({});
  const [showDebug, setShowDebug] = React.useState(true);
  const showDebugRef = useRef(showDebug);

  useEffect(() => {
    hardwareDataRef.current = hardwareData;
  }, [hardwareData]);

  useEffect(() => {
    showDebugRef.current = showDebug;
  }, [showDebug]);

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

      const inverted = key.active === true;

      // Fade trail
      if (inverted) {
        ctx.fillStyle = 'rgba(245, 242, 235, 0.06)';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const pointsPerFrame = Math.max(
        1,
        Math.floor(Math.abs(40 + encoders[1].value * 4)),
      );
      const scale = Math.max(0.3, 1 + encoders[2].value * 0.08);
      const dt = 0.003 + encoders[3].value * 0.0008;
      const ratio = 2 + encoders[4].value * 0.05;

      const activeColors = [];
      if (switches.red.active === true) activeColors.push('red');
      if (switches.green.active === true) activeColors.push('green');
      if (switches.blue.active === true) activeColors.push('blue');

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const baseAmp = Math.min(canvas.width, canvas.height) * 0.35 * scale;

      if (activeColors.length === 0) {
        // fade out — no new strokes
        lastPointRef.current = {};
      } else {
        // Curve definitions per color — slight offsets so layered curves dance
        const curveDefs = {
          red: {
            rgb: [255, 40, 40],
            fxA: 3,
            fxB: ratio,
            fyA: 2,
            fyB: ratio * 1.5,
            pxA: 0,
            pxB: Math.PI / 3,
            pyA: Math.PI / 2,
            pyB: 0,
            d: 0.0008,
          },
          green: {
            rgb: [40, 255, 80],
            fxA: 2,
            fxB: ratio * 1.1,
            fyA: 3,
            fyB: ratio * 0.9,
            pxA: Math.PI / 4,
            pxB: 0,
            pyA: 0,
            pyB: Math.PI / 2,
            d: 0.0010,
          },
          blue: {
            rgb: [60, 140, 255],
            fxA: 4,
            fxB: ratio * 0.8,
            fyA: 2.5,
            fyB: ratio * 1.3,
            pxA: Math.PI / 6,
            pxB: Math.PI / 2,
            pyA: Math.PI / 3,
            pyB: Math.PI / 4,
            d: 0.0006,
          },
        };

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 1.4;

        for (let i = 0; i < pointsPerFrame; i++) {
          const t = tRef.current;
          // Periodic reset of damping clock to prevent collapse
          const td = t % 2000;

          activeColors.forEach((colorName) => {
            const def = curveDefs[colorName];
            const damp = Math.exp(-def.d * td);
            const x =
              cx +
              baseAmp *
                (Math.sin(def.fxA * t + def.pxA) +
                  0.6 * Math.sin(def.fxB * t + def.pxB)) *
                0.5 *
                damp;
            const y =
              cy +
              baseAmp *
                (Math.sin(def.fyA * t + def.pyA) +
                  0.6 * Math.sin(def.fyB * t + def.pyB)) *
                0.5 *
                damp;

            const last = lastPointRef.current[colorName];
            if (last) {
              const [r, g, b] = def.rgb;
              if (inverted) {
                // dark ink on white paper
                const ir = Math.floor(r * 0.25);
                const ig = Math.floor(g * 0.25);
                const ib = Math.floor(b * 0.25);
                ctx.strokeStyle = `rgba(${ir}, ${ig}, ${ib}, 0.85)`;
              } else {
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.75)`;
              }
              ctx.beginPath();
              ctx.moveTo(last.x, last.y);
              ctx.lineTo(x, y);
              ctx.stroke();
            }
            lastPointRef.current[colorName] = { x, y };
          });

          tRef.current += dt;
          if (tRef.current > 2000) tRef.current = 0;
        }
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
            .padStart(4)} → Points: ${pointsPerFrame}`,
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
            .padStart(4)} → TimeRate: ${dt.toFixed(4)}`,
          20,
          155,
        );
        ctx.fillText(
          `E4: ${encoders[4].value
            .toString()
            .padStart(4)} → Ratio: ${ratio.toFixed(2)}`,
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
        ctx.fillText(`Points/frame: ${pointsPerFrame}`, 20, 310);
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

export default LissajousHarmonograph;
