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

    // Don't initialize particles here - let the animation loop handle it
    // This ensures we use the most up-to-date switch states

    // Animation loop
    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get current values from hardware data ref
      const { switches, encoders } = hardwareDataRef.current;
      const density = Math.abs(50 + encoders[1].value * 10); // More sensitive: 10 particles per increment
      const sizeMultiplier = Math.max(0.3, 1 + encoders[2].value * 0.2); // More sensitive: 20% per increment
      const speedMultiplier = Math.max(0.5, 1 + encoders[3].value * 0.1); // More sensitive: 10% per increment
      const rotationIntensity = encoders[4].value * 0.003; // More sensitive: 3x rotation effect

      // Determine active colors
      const activeColors = [];
      if (switches.red.active === true) activeColors.push('red');
      if (switches.green.active === true) activeColors.push('green');
      if (switches.blue.active === true) activeColors.push('blue');

      // If no colors active, clear all particles
      if (activeColors.length === 0) {
        particlesRef.current = [];
      } else {
        // Check which active colors are missing from current particles
        const existingColors = new Set(
          particlesRef.current.map((p) => p.color),
        );
        const missingColors = activeColors.filter(
          (color) => !existingColors.has(color),
        );

        // Convert some existing particles to missing colors BEFORE filtering
        if (missingColors.length > 0 && particlesRef.current.length > 0) {
          const particlesToConvert = Math.ceil(
            particlesRef.current.length / activeColors.length,
          );
          let convertIndex = 0;
          for (
            let i = 0;
            i < particlesToConvert && missingColors.length > 0;
            i++
          ) {
            const colorIndex = i % missingColors.length;
            if (convertIndex < particlesRef.current.length) {
              particlesRef.current[convertIndex].color =
                missingColors[colorIndex];
              convertIndex++;
            }
          }
        }

        // Remove particles that don't match active colors
        particlesRef.current = particlesRef.current.filter((particle) =>
          activeColors.includes(particle.color),
        );

        // Adjust particle count if needed
        while (particlesRef.current.length < density) {
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
      }

      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        // Basic movement
        particle.x += particle.vx * speedMultiplier;
        particle.y += particle.vy * speedMultiplier;

        // Apply rotation/spiral effect based on encoder 4
        if (rotationIntensity !== 0) {
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const dx = particle.x - centerX;
          const dy = particle.y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          // Rotate around center
          const newAngle = angle + rotationIntensity;
          particle.x = centerX + Math.cos(newAngle) * distance;
          particle.y = centerY + Math.sin(newAngle) * distance;
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

        // Draw connecting lines to nearby particles
        if (index < particlesRef.current.length - 1) {
          for (
            let j = index + 1;
            j < Math.min(index + 5, particlesRef.current.length);
            j++
          ) {
            const other = particlesRef.current[j];
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
      });

      // Draw debug info
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 320, 180);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '16px monospace';
      ctx.fillText(`E1: ${encoders[1].value.toString().padStart(4)} → Density: ${Math.floor(density)}`, 20, 30);
      ctx.fillText(`E2: ${encoders[2].value.toString().padStart(4)} → Size: ${sizeMultiplier.toFixed(2)}x`, 20, 55);
      ctx.fillText(`E3: ${encoders[3].value.toString().padStart(4)} → Speed: ${speedMultiplier.toFixed(2)}x`, 20, 80);
      ctx.fillText(`E4: ${encoders[4].value.toString().padStart(4)} → Rotation: ${rotationIntensity.toFixed(3)}`, 20, 105);
      ctx.fillText(`Particles: ${particlesRef.current.length}`, 20, 140);
      ctx.fillText(`Colors: ${activeColors.join(', ') || 'none'}`, 20, 165);

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
