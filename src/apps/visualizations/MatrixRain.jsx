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

const KATAKANA = [];
for (let i = 0x30a0; i <= 0x30ff; i++) {
  KATAKANA.push(String.fromCharCode(i));
}
const DIGITS = '0123456789'.split('');
const PUNCT = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`'.split('');
const GLYPHS = [...KATAKANA, ...DIGITS, ...PUNCT];

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

function MatrixRain({ hardwareData }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const columnsRef = useRef([]);
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

    // Animation loop
    const animate = () => {
      const { switches, encoders, key } = hardwareDataRef.current;

      const inverted = key.active === true;

      // Fade canvas with low-alpha rect for trail effect
      if (inverted) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const columnCount = Math.max(
        8,
        Math.floor(40 + encoders[1].value * 2),
      );
      const sizeMultiplier = Math.max(0.3, 1 + encoders[3].value * 0.1);
      const fallSpeed = Math.max(0.5, 2 + encoders[2].value * 0.3);
      const mutationRate = Math.min(
        1,
        Math.max(0, encoders[4].value * 0.02),
      );

      const baseFontPx = canvas.width / columnCount;
      const fontPx = Math.max(4, baseFontPx * sizeMultiplier);
      const colWidth = canvas.width / columnCount;

      // Determine active colors
      const activeColors = [];
      if (switches.red.active === true) activeColors.push('red');
      if (switches.green.active === true) activeColors.push('green');
      if (switches.blue.active === true) activeColors.push('blue');

      if (activeColors.length === 0) {
        columnsRef.current = [];
      } else {
        // Adjust column count
        while (columnsRef.current.length < columnCount) {
          const i = columnsRef.current.length;
          const color =
            activeColors[Math.floor(Math.random() * activeColors.length)];
          const trailLen = 8 + Math.floor(Math.random() * 20);
          columnsRef.current.push({
            x: i * colWidth + colWidth / 2,
            y: Math.random() * canvas.height,
            speed: 0.5 + Math.random() * 1.5,
            trailLen,
            color,
            chars: Array.from({ length: trailLen }, () => randomGlyph()),
          });
        }
        while (columnsRef.current.length > columnCount) {
          columnsRef.current.pop();
        }

        // Reposition x for current column count
        columnsRef.current.forEach((col, i) => {
          col.x = i * colWidth + colWidth / 2;
          if (!activeColors.includes(col.color)) {
            col.color =
              activeColors[Math.floor(Math.random() * activeColors.length)];
          }
        });
      }

      // Update and draw columns
      ctx.font = `${fontPx}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      columnsRef.current.forEach((col) => {
        // Advance head
        col.y += col.speed * fallSpeed;

        // Mutate chars based on mutation rate
        for (let i = 0; i < col.chars.length; i++) {
          if (Math.random() < mutationRate) {
            col.chars[i] = randomGlyph();
          }
        }

        // Occasionally shift in a new head char
        if (Math.random() < 0.3) {
          col.chars[0] = randomGlyph();
        }

        let colorRGB;
        switch (col.color) {
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

        // Draw trail (back-to-front so head is on top)
        for (let i = col.trailLen - 1; i >= 0; i--) {
          const y = col.y - i * fontPx;
          if (y < -fontPx || y > canvas.height + fontPx) continue;
          const ch = col.chars[i];

          if (i === 0) {
            // Head: bright
            if (inverted) {
              ctx.fillStyle = `rgba(0, 0, 0, 1)`;
            } else {
              ctx.fillStyle = `rgba(230, 255, 240, 1)`;
            }
          } else {
            const alpha = 1 - i / col.trailLen;
            if (inverted) {
              // Dark glyphs on white: scale toward black
              const r = Math.floor(colorRGB[0] * 0.4);
              const g = Math.floor(colorRGB[1] * 0.4);
              const b = Math.floor(colorRGB[2] * 0.4);
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            } else {
              ctx.fillStyle = `rgba(${colorRGB[0]}, ${colorRGB[1]}, ${colorRGB[2]}, ${alpha})`;
            }
          }
          ctx.fillText(ch, col.x, y);
        }

        // Respawn when head leaves bottom
        if (col.y - col.trailLen * fontPx > canvas.height) {
          col.y = -Math.random() * canvas.height * 0.5;
          col.speed = 0.5 + Math.random() * 1.5;
          col.trailLen = 8 + Math.floor(Math.random() * 20);
          col.chars = Array.from({ length: col.trailLen }, () => randomGlyph());
          if (activeColors.length > 0) {
            col.color =
              activeColors[Math.floor(Math.random() * activeColors.length)];
          }
        }
      });

      // Draw debug info if enabled
      if (showDebugRef.current) {
        const { connected } = hardwareDataRef.current;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 420, 310);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '16px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

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
            .padStart(4)} → Columns: ${columnCount}`,
          20,
          105,
        );
        ctx.fillText(
          `E2: ${encoders[2].value
            .toString()
            .padStart(4)} → FallSpeed: ${fallSpeed.toFixed(2)}x`,
          20,
          130,
        );
        ctx.fillText(
          `E3: ${encoders[3].value
            .toString()
            .padStart(4)} → FontSize: ${sizeMultiplier.toFixed(2)}x`,
          20,
          155,
        );
        ctx.fillText(
          `E4: ${encoders[4].value
            .toString()
            .padStart(4)} → Mutation: ${mutationRate.toFixed(2)}`,
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
        ctx.fillText(`Columns: ${columnsRef.current.length}`, 20, 310);
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

export default MatrixRain;
