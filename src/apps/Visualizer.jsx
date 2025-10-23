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

function Visualizer({ hardwareData }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const hardwareDataRef = useRef(hardwareData);

  // Keep hardware data ref updated
  useEffect(() => {
    hardwareDataRef.current = hardwareData;
  }, [hardwareData]);

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

    // Initialize particles with colors
    const initParticles = () => {
      const { switches, encoders } = hardwareDataRef.current;
      const particleCount = Math.abs(50 + encoders[1].value * 5);
      particlesRef.current = [];

      // Determine active colors
      const activeColors = [];
      if (switches.red.active) activeColors.push('red');
      if (switches.green.active) activeColors.push('green');
      if (switches.blue.active) activeColors.push('blue');

      // If no colors active, don't create particles
      if (activeColors.length === 0) return;

      for (let i = 0; i < particleCount; i++) {
        // Assign color randomly from active colors
        const color =
          activeColors[Math.floor(Math.random() * activeColors.length)];

        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 3 + 1,
          angle: Math.random() * Math.PI * 2,
          angleSpeed: (Math.random() - 0.5) * 0.1,
          color: color,
        });
      }
    };

    initParticles();

    // Animation loop
    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get current values from hardware data ref
      const { switches, encoders } = hardwareDataRef.current;
      const density = Math.abs(50 + encoders[1].value * 5);
      const sizeMultiplier = 1 + encoders[2].value * 0.1;
      const speedMultiplier = 1 + encoders[3].value * 0.05;
      const pattern = Math.abs(encoders[4].value) % 4; // 4 different patterns

      // Determine active colors
      const activeColors = [];
      if (switches.red.active) activeColors.push('red');
      if (switches.green.active) activeColors.push('green');
      if (switches.blue.active) activeColors.push('blue');

      // Remove particles that don't match active colors
      particlesRef.current = particlesRef.current.filter((particle) =>
        activeColors.includes(particle.color),
      );

      // Adjust particle count if needed
      while (particlesRef.current.length < density && activeColors.length > 0) {
        const color =
          activeColors[Math.floor(Math.random() * activeColors.length)];
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 3 + 1,
          angle: Math.random() * Math.PI * 2,
          angleSpeed: (Math.random() - 0.5) * 0.1,
          color: color,
        });
      }
      while (particlesRef.current.length > density) {
        particlesRef.current.pop();
      }

      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        // Update position based on pattern
        switch (pattern) {
          case 0: // Circular motion
            particle.angle += particle.angleSpeed * speedMultiplier;
            particle.x += Math.cos(particle.angle) * speedMultiplier;
            particle.y += Math.sin(particle.angle) * speedMultiplier;
            break;
          case 1: // Wave motion
            particle.x += particle.vx * speedMultiplier;
            particle.y =
              canvas.height / 2 +
              Math.sin(particle.x * 0.01 + Date.now() * 0.001) * 100;
            break;
          case 2: // Spiral
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const distance = Math.sqrt(
              Math.pow(particle.x - centerX, 2) +
                Math.pow(particle.y - centerY, 2),
            );
            const angle = Math.atan2(
              particle.y - centerY,
              particle.x - centerX,
            );
            particle.x =
              centerX + Math.cos(angle + 0.02 * speedMultiplier) * distance;
            particle.y =
              centerY + Math.sin(angle + 0.02 * speedMultiplier) * distance;
            break;
          default: // Random motion
            particle.x += particle.vx * speedMultiplier;
            particle.y += particle.vy * speedMultiplier;
        }

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Get particle color
        let colorRGB;
        switch (particle.color) {
          case 'red':
            colorRGB = [255, 0, 0];
            break;
          case 'green':
            colorRGB = [0, 255, 0];
            break;
          case 'blue':
            colorRGB = [0, 128, 255];
            break;
          default:
            colorRGB = [255, 255, 255];
        }

        // Draw particle
        const size = particle.size * sizeMultiplier;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorRGB[0]}, ${colorRGB[1]}, ${colorRGB[2]}, 0.8)`;
        ctx.fill();

        // Draw connecting lines to nearby particles of the same color
        if (index < particlesRef.current.length - 1) {
          for (
            let j = index + 1;
            j < Math.min(index + 5, particlesRef.current.length);
            j++
          ) {
            const other = particlesRef.current[j];

            // Only connect particles of the same color
            if (particle.color === other.color) {
              const dx = particle.x - other.x;
              const dy = particle.y - other.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < 100) {
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(other.x, other.y);
                ctx.strokeStyle = `rgba(${colorRGB[0]}, ${colorRGB[1]}, ${
                  colorRGB[2]
                }, ${0.2 * (1 - distance / 100)})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }
            }
          }
        }
      });

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

export default Visualizer;
