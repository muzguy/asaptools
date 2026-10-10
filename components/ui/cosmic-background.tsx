'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/components/theme/theme-context';
import {
  CosmicStar,
  generateStarField,
  updateStarPosition,
  calculateStarAlpha,
  getStarRgb,
  ShootingStarState,
  createShootingStar,
  updateShootingStar,
  smoothParallax,
  GeometricElement,
  generateGeometricField,
  updateGeometricElement,
  renderGeometricElements,
} from '@/lib/cosmic-background-utils';

export function CosmicBackground() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation and physics state kept in refs for high performance
  const starsRef = useRef<CosmicStar[]>([]);
  const geometricElementsRef = useRef<GeometricElement[]>([]);
  const shootingStarRef = useRef<ShootingStarState | null>(null);
  const nextShootingStarTimeRef = useRef<number>(0);
  const themeFactorRef = useRef<number>(isDark ? 1 : 0);
  const mouseTargetOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseCurrentOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const reducedMotionRef = useRef<boolean>(false);
  const isMobileRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Detect reduced motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = motionQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      if (e.matches) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        // Draw static frame
        drawSingleFrame();
      } else {
        lastTimeRef.current = performance.now();
        if (!animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      }
    };

    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', handleMotionChange);
    } else {
      motionQuery.addListener(handleMotionChange);
    }

    // Determine viewport and device characteristics
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      isMobileRef.current = isMobile;

      // Re-generate stars only if particle density tier changed
      const neededCount = isMobile ? 80 : 200;
      if (starsRef.current.length !== neededCount) {
        starsRef.current = generateStarField(neededCount, 0x41534150);
      }

      // Re-generate geometric elements only if count tier changed
      const neededGeometricCount = isMobile ? 20 : 42;
      if (geometricElementsRef.current.length !== neededGeometricCount) {
        geometricElementsRef.current = generateGeometricField(neededGeometricCount, 0x4441594d);
      }

      // High-DPI scaling (clamped to prevent memory pressure)
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      return { width, height };
    };

    let { width, height } = updateDimensions();

    // Resize listener with debounced adjustment
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const dims = updateDimensions();
        width = dims.width;
        height = dims.height;
        if (reducedMotionRef.current) {
          drawSingleFrame();
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    // Desktop pointer parallax listener
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || reducedMotionRef.current) return;
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseTargetOffsetRef.current = {
        x: ((e.clientX - halfW) / halfW) * 18,
        y: ((e.clientY - halfH) / halfH) * 18,
      };
    };

    const handlePointerLeave = () => {
      mouseTargetOffsetRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    // Initial shooting star timer (first one occurs after 6s in dark mode)
    nextShootingStarTimeRef.current = performance.now() + 6000 + Math.random() * 8000;

    // Single static render for reduced motion users
    const drawSingleFrame = () => {
      const themeFactor = isDark ? 1 : 0;
      ctx.clearRect(0, 0, width, height);

      // Draw static geometric texture in light mode
      if (themeFactor < 0.95) {
        renderGeometricElements(
          ctx,
          geometricElementsRef.current,
          width,
          height,
          { x: 0, y: 0 },
          themeFactor,
          true
        );
      }

      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        if (themeFactor < 0.5 && i % 3 !== 0) continue;

        const alpha = calculateStarAlpha(star, 0, themeFactor, true);
        if (alpha <= 0.01) continue;

        const sx = star.x * width;
        const sy = star.y * height;
        const rgb = getStarRgb(star.tint, themeFactor);

        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Main animation loop
    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      let dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      if (dt > 0.1) dt = 0.1; // Clamp large frame jumps

      // Smooth theme factor interpolation (0 = Day, 1 = Night)
      const targetThemeFactor = isDark ? 1 : 0;
      themeFactorRef.current += (targetThemeFactor - themeFactorRef.current) * Math.min(1, dt * 4);
      const themeFactor = themeFactorRef.current;

      // Smooth parallax tracking
      if (!reducedMotionRef.current) {
        mouseCurrentOffsetRef.current = smoothParallax(
          mouseCurrentOffsetRef.current,
          mouseTargetOffsetRef.current,
          dt,
          4
        );
      } else {
        mouseCurrentOffsetRef.current = { x: 0, y: 0 };
      }

      ctx.clearRect(0, 0, width, height);

      const stars = starsRef.current;
      const reduced = reducedMotionRef.current;
      const mouseOffset = mouseCurrentOffsetRef.current;

      // Render Light-Mode Geometric Texture (circles, rings, squares, diamonds, triangles, connections)
      if (themeFactor < 0.95) {
        const geoms = geometricElementsRef.current;
        if (!reduced) {
          for (let i = 0; i < geoms.length; i++) {
            updateGeometricElement(geoms[i], dt, 1.0);
          }
        }
        renderGeometricElements(
          ctx,
          geoms,
          width,
          height,
          mouseOffset,
          themeFactor,
          reduced
        );
      }

      // Draw Star Particles
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Day mode: sparse stars for clean, airy layout
        if (themeFactor < 0.5 && i % 3 !== 0) {
          continue;
        }

        // Star Drift Physics
        if (!reduced) {
          const speedMult = themeFactor < 0.5 ? 0.35 : 1.0;
          updateStarPosition(star, dt, speedMult);
        }

        const alpha = calculateStarAlpha(star, timestamp / 1000, themeFactor, reduced);
        if (alpha <= 0.01) continue;

        // Parallax coordinates
        const pFactor = reduced ? 0 : star.parallaxFactor;
        let sx = star.x * width + mouseOffset.x * pFactor;
        let sy = star.y * height + mouseOffset.y * pFactor;

        // Screen boundary wrapping for parallax
        if (sx < 0) sx += width;
        else if (sx >= width) sx -= width;
        if (sy < 0) sy += height;
        else if (sy >= height) sy -= height;

        const rgb = getStarRgb(star.tint, themeFactor);
        const rgbStr = `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;

        // Star Core Circle
        ctx.fillStyle = `rgba(${rgbStr}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
        ctx.fill();

        // Layer 2 Bright Star Halos and Diffraction Flares (Night Mode)
        if (star.layer === 2 && themeFactor > 0.4 && alpha > 0.45) {
          const glowRadius = star.radius * 3.2;
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowRadius);
          glow.addColorStop(0, `rgba(${rgbStr}, ${alpha * 0.4})`);
          glow.addColorStop(1, `rgba(${rgbStr}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(sx, sy, glowRadius, 0, Math.PI * 2);
          ctx.fill();

          // 4-point cross diffraction glint on desktop
          if (star.hasGlint && themeFactor > 0.75 && !isMobileRef.current) {
            const glintLen = star.radius * 3.4;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.22})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(sx - glintLen, sy);
            ctx.lineTo(sx + glintLen, sy);
            ctx.moveTo(sx, sy - glintLen);
            ctx.lineTo(sx, sy + glintLen);
            ctx.stroke();
          }
        }
      }

      // Shooting Stars (Occasional randomized streaks in Night Mode)
      if (themeFactor > 0.6 && !reduced && !isMobileRef.current) {
        if (!shootingStarRef.current && timestamp >= nextShootingStarTimeRef.current) {
          shootingStarRef.current = createShootingStar(width, height);
          nextShootingStarTimeRef.current = timestamp + 8000 + Math.random() * 10000;
        }

        if (shootingStarRef.current) {
          const shooting = shootingStarRef.current;
          const active = updateShootingStar(shooting, dt);

          if (active) {
            let sAlpha = 1;
            if (shooting.progress < 0.2) {
              sAlpha = shooting.progress / 0.2;
            } else if (shooting.progress > 0.7) {
              sAlpha = (1 - shooting.progress) / 0.3;
            }
            sAlpha *= themeFactor;

            if (sAlpha > 0.01) {
              const tailRatio = Math.min(shooting.trailLength, shooting.speed * shooting.elapsed);
              const tailX = shooting.currentX - (shooting.vx / shooting.speed) * tailRatio;
              const tailY = shooting.currentY - (shooting.vy / shooting.speed) * tailRatio;

              const grad = ctx.createLinearGradient(
                tailX,
                tailY,
                shooting.currentX,
                shooting.currentY
              );
              grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
              grad.addColorStop(0.65, `rgba(165, 243, 252, ${sAlpha * 0.45})`);
              grad.addColorStop(1, `rgba(255, 255, 255, ${sAlpha * 0.95})`);

              ctx.strokeStyle = grad;
              ctx.lineWidth = 1.35;
              ctx.beginPath();
              ctx.moveTo(tailX, tailY);
              ctx.lineTo(shooting.currentX, shooting.currentY);
              ctx.stroke();

              // Glowing head particle
              ctx.fillStyle = `rgba(255, 255, 255, ${sAlpha})`;
              ctx.beginPath();
              ctx.arc(shooting.currentX, shooting.currentY, 1.25, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            shootingStarRef.current = null;
          }
        }
      }

      if (!reduced) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Pause animation when tab is not visible to preserve battery
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      } else {
        lastTimeRef.current = performance.now();
        if (!reducedMotionRef.current && !animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start execution
    if (reducedMotionRef.current) {
      drawSingleFrame();
    } else {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      clearTimeout(resizeTimer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (typeof motionQuery.removeEventListener === 'function') {
        motionQuery.removeEventListener('change', handleMotionChange);
      } else {
        motionQuery.removeListener(handleMotionChange);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDark]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
      role="presentation"
    >
      {/* Layer 1: Base Cosmic Background Gradient */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          isDark ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(ellipse 130% 110% at 50% -10%, #0d122e 0%, #070919 45%, #03050f 100%)',
        }}
      />
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          isDark ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background:
            'radial-gradient(ellipse 135% 115% at 50% -5%, #ffffff 0%, #f8fafc 48%, #f1f5f9 100%)',
        }}
      />

      {/* Layer 2: Subtle Atmospheric Nebula Glows (Floating Layer 1) */}
      <div
        className={`cosmic-nebula-layer-1 absolute inset-0 transition-opacity duration-700 ease-in-out ${
          isDark ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: `
            radial-gradient(circle 620px at 18% 28%, rgba(6, 182, 212, 0.055) 0%, transparent 70%),
            radial-gradient(circle 680px at 82% 32%, rgba(139, 92, 246, 0.065) 0%, transparent 70%)
          `,
        }}
      />
      <div
        className={`cosmic-nebula-layer-1 absolute inset-0 transition-opacity duration-700 ease-in-out ${
          isDark ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background: `
            radial-gradient(circle 760px at 15% 18%, rgba(6, 182, 212, 0.12) 0%, transparent 68%),
            radial-gradient(circle 820px at 85% 22%, rgba(192, 132, 252, 0.13) 0%, transparent 68%),
            radial-gradient(circle 680px at 50% 55%, rgba(249, 115, 22, 0.08) 0%, transparent 65%)
          `,
        }}
      />

      {/* Layer 3: Subtle Atmospheric Nebula Glows (Floating Layer 2) */}
      <div
        className={`cosmic-nebula-layer-2 absolute inset-0 transition-opacity duration-700 ease-in-out ${
          isDark ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: `
            radial-gradient(circle 760px at 45% 72%, rgba(37, 99, 235, 0.048) 0%, transparent 70%),
            radial-gradient(circle 500px at 72% 82%, rgba(225, 29, 72, 0.035) 0%, transparent 65%)
          `,
        }}
      />
      <div
        className={`cosmic-nebula-layer-2 absolute inset-0 transition-opacity duration-700 ease-in-out ${
          isDark ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background: `
            radial-gradient(circle 880px at 20% 78%, rgba(56, 189, 248, 0.12) 0%, transparent 70%),
            radial-gradient(circle 720px at 82% 82%, rgba(168, 85, 247, 0.10) 0%, transparent 65%),
            radial-gradient(circle 620px at 50% 6%, rgba(251, 146, 60, 0.075) 0%, transparent 60%)
          `,
        }}
      />

      {/* Layer 3.5: Light-Mode Dotted Tech Blueprint Canvas */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-none ${
          isDark ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          backgroundImage:
            'radial-gradient(rgba(148, 163, 184, 0.22) 1.25px, transparent 1.25px)',
          backgroundSize: '32px 32px',
          maskImage:
            'radial-gradient(ellipse 92% 88% at 50% 45%, black 45%, rgba(0, 0, 0, 0.4) 80%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 92% 88% at 50% 45%, black 45%, rgba(0, 0, 0, 0.4) 80%, transparent 100%)',
        }}
      />

      {/* Layer 4: Interactive Canvas 2D Particle System */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        aria-hidden="true"
      />

      {/* Layer 5: Cosmic Edge Vignette in Night Mode */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-none ${
          isDark ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(3, 5, 15, 0.42) 100%)',
        }}
      />
    </div>
  );
}
