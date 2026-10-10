/**
 * Pure utility functions and algorithms for the ASAPTools Cosmic Background System.
 * Framework-agnostic, deterministic, and fully unit-testable.
 */

export type StarLayer = 0 | 1 | 2; // 0 = distant dust, 1 = mid star, 2 = bright near star
export type StarTint = 'white' | 'cyan' | 'violet' | 'amber' | 'slate';

export interface CosmicStar {
  x: number; // Normalized coordinate [0, 1]
  y: number; // Normalized coordinate [0, 1]
  radius: number; // Base radius in pixels
  layer: StarLayer;
  baseAlpha: number; // Target opacity in night mode [0, 1]
  dayAlpha: number; // Target opacity in day mode [0, 1]
  twinklePhase: number; // Initial radian phase [0, 2*PI]
  twinkleSpeed: number; // Radians per second
  tint: StarTint;
  vx: number; // Normalized horizontal velocity per second
  vy: number; // Normalized vertical velocity per second
  parallaxFactor: number; // Depth multiplier for parallax movement
  hasGlint: boolean; // Subtle 4-point cross diffraction flare
}

export interface ShootingStarState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  vx: number;
  vy: number;
  speed: number;
  trailLength: number;
  progress: number; // 0 to 1
  lifeTime: number; // in seconds
  elapsed: number;
}

/**
 * High-performance, deterministic 32-bit pseudo-random number generator (Mulberry32).
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a deterministic array of cosmic stars distributed across 3 depth planes.
 */
export function generateStarField(count: number, seed: number = 0x41534150): CosmicStar[] {
  const prng = mulberry32(seed);
  const stars: CosmicStar[] = [];

  for (let i = 0; i < count; i++) {
    const layerRand = prng();
    let layer: StarLayer;
    let radius: number;
    let baseAlpha: number;
    let dayAlpha: number;
    let parallaxFactor: number;
    let twinkleSpeed: number;
    let vx: number;
    let vy: number;
    let hasGlint = false;

    if (layerRand < 0.55) {
      // Layer 0: Distant micro-dust stars (55%)
      layer = 0;
      radius = 0.5 + prng() * 0.35; // 0.5px - 0.85px
      baseAlpha = 0.25 + prng() * 0.25; // 0.25 - 0.50
      dayAlpha = 0.08 + prng() * 0.12; // 0.08 - 0.20
      parallaxFactor = 0.12;
      twinkleSpeed = 0.6 + prng() * 0.8;
      vx = -(0.002 + prng() * 0.004);
      vy = -(0.001 + prng() * 0.003);
    } else if (layerRand < 0.87) {
      // Layer 1: Mid-depth glowing stars (32%)
      layer = 1;
      radius = 0.9 + prng() * 0.5; // 0.9px - 1.40px
      baseAlpha = 0.45 + prng() * 0.3; // 0.45 - 0.75
      dayAlpha = 0.15 + prng() * 0.18; // 0.15 - 0.33
      parallaxFactor = 0.35;
      twinkleSpeed = 1.0 + prng() * 1.4;
      vx = -(0.004 + prng() * 0.008);
      vy = -(0.002 + prng() * 0.005);
    } else {
      // Layer 2: Near prominent celestial stars (13%)
      layer = 2;
      radius = 1.5 + prng() * 0.7; // 1.5px - 2.20px
      baseAlpha = 0.75 + prng() * 0.22; // 0.75 - 0.97
      dayAlpha = 0.22 + prng() * 0.22; // 0.22 - 0.44
      parallaxFactor = 0.65;
      twinkleSpeed = 1.5 + prng() * 1.8;
      vx = -(0.008 + prng() * 0.012);
      vy = -(0.004 + prng() * 0.008);
      hasGlint = prng() < 0.35; // 35% of layer 2 stars get cross diffraction glint
    }

    // Color Tint Distribution
    const tintRand = prng();
    let tint: StarTint;
    if (tintRand < 0.55) {
      tint = 'white';
    } else if (tintRand < 0.75) {
      tint = 'cyan';
    } else if (tintRand < 0.88) {
      tint = 'violet';
    } else {
      tint = 'amber';
    }

    stars.push({
      x: prng(),
      y: prng(),
      radius,
      layer,
      baseAlpha,
      dayAlpha,
      twinklePhase: prng() * Math.PI * 2,
      twinkleSpeed,
      tint,
      vx,
      vy,
      parallaxFactor,
      hasGlint,
    });
  }

  return stars;
}

/**
 * Advance star drift position with screen boundary wrapping.
 */
export function updateStarPosition(
  star: CosmicStar,
  dt: number,
  speedMultiplier: number = 1
): void {
  star.x += star.vx * dt * speedMultiplier;
  star.y += star.vy * dt * speedMultiplier;

  // Wrap around boundaries
  if (star.x < 0) {
    star.x = (star.x % 1) + 1;
  } else if (star.x >= 1) {
    star.x = star.x % 1;
  }

  if (star.y < 0) {
    star.y = (star.y % 1) + 1;
  } else if (star.y >= 1) {
    star.y = star.y % 1;
  }
}

/**
 * Calculate dynamic star opacity factoring in twinkle oscillation and theme blending.
 */
export function calculateStarAlpha(
  star: CosmicStar,
  elapsedTime: number,
  themeFactor: number, // 0 = day, 1 = night
  reducedMotion: boolean = false
): number {
  const targetBase = star.dayAlpha * (1 - themeFactor) + star.baseAlpha * themeFactor;

  if (reducedMotion) {
    return targetBase;
  }

  const twinkle = 0.72 + 0.28 * Math.sin(star.twinklePhase + elapsedTime * star.twinkleSpeed);
  return Math.max(0, Math.min(1, targetBase * twinkle));
}

/**
 * Return RGB values for star rendering based on tint and themeFactor.
 */
export function getStarRgb(tint: StarTint, themeFactor: number): [number, number, number] {
  // Day Mode (themeFactor near 0): soft cool slate / silver motes
  if (themeFactor < 0.35) {
    return [115, 128, 142]; // Slate 500
  }

  switch (tint) {
    case 'cyan':
      return [165, 243, 252]; // Cyan 200
    case 'violet':
      return [224, 231, 255]; // Indigo 100
    case 'amber':
      return [254, 243, 199]; // Amber 100
    case 'white':
    default:
      return [245, 248, 255]; // Crisp cool white
  }
}

/**
 * Spawn a shooting star streak with realistic diagonal velocity and trail.
 */
export function createShootingStar(
  width: number,
  height: number,
  prng: () => number = Math.random
): ShootingStarState {
  const startX = width * (0.15 + prng() * 0.7);
  const startY = height * (0.04 + prng() * 0.22);

  // Direction: between 30 and 52 degrees downwards
  const goLeft = prng() < 0.35;
  const angleDeg = goLeft ? 180 - (30 + prng() * 22) : 30 + prng() * 22;
  const angle = (angleDeg * Math.PI) / 180;
  const speed = 720 + prng() * 420; // pixels per second
  const trailLength = 90 + prng() * 60;
  const lifeTime = 0.55 + prng() * 0.35; // 0.55s - 0.90s

  return {
    active: true,
    startX,
    startY,
    currentX: startX,
    currentY: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    speed,
    trailLength,
    progress: 0,
    lifeTime,
    elapsed: 0,
  };
}

/**
 * Advance shooting star trajectory; returns false when finished.
 */
export function updateShootingStar(star: ShootingStarState, dt: number): boolean {
  if (!star.active) return false;

  star.elapsed += dt;
  star.progress = Math.min(1, star.elapsed / star.lifeTime);
  star.currentX = star.startX + star.vx * star.elapsed;
  star.currentY = star.startY + star.vy * star.elapsed;

  if (star.progress >= 1) {
    star.active = false;
    return false;
  }

  return true;
}

/**
 * Damped interpolation for smooth parallax tracking.
 */
export function smoothParallax(
  current: { x: number; y: number },
  target: { x: number; y: number },
  dt: number,
  smoothing: number = 4
): { x: number; y: number } {
  const factor = Math.min(1, dt * smoothing);
  return {
    x: current.x + (target.x - current.x) * factor,
    y: current.y + (target.y - current.y) * factor,
  };
}

/* ==========================================================================
   Light-Mode Geometric Texture System
   ========================================================================== */

export type GeometricShapeType =
  | 'circle'
  | 'concentric-ring'
  | 'dot'
  | 'square'
  | 'rounded-square'
  | 'diamond'
  | 'triangle'
  | 'cluster-cross';

export type PastelPalette = 'blue' | 'lavender' | 'peach' | 'orange' | 'slate';

export interface GeometricElement {
  id: number;
  x: number; // Normalized coordinate [0, 1]
  y: number; // Normalized coordinate [0, 1]
  type: GeometricShapeType;
  size: number; // Size in pixels
  color: PastelPalette;
  baseAlpha: number; // Very low opacity (0.10 to 0.25)
  rotation: number; // Radians
  rotationSpeed: number; // Radians / sec
  vx: number; // Normalized horizontal velocity / sec
  vy: number; // Normalized vertical velocity / sec
  parallaxFactor: number;
  hasGlow: boolean;
  glowRadius: number;
  connectTargetIndex?: number;
}

/**
 * Return RGB values for light-mode pastel palette.
 */
export function getPastelRgb(color: PastelPalette): [number, number, number] {
  switch (color) {
    case 'blue':
      return [56, 189, 248]; // Sky blue
    case 'lavender':
      return [192, 132, 252]; // Soft lavender
    case 'peach':
      return [251, 146, 60]; // Peach
    case 'orange':
      return [249, 115, 22]; // Soft brand orange
    case 'slate':
    default:
      return [148, 163, 184]; // Cool grey / slate
  }
}

/**
 * Generate a deterministic field of delicate geometric shapes for Light Mode.
 */
export function generateGeometricField(
  count: number,
  seed: number = 0x4441594d
): GeometricElement[] {
  const prng = mulberry32(seed);
  const elements: GeometricElement[] = [];

  const types: GeometricShapeType[] = [
    'circle',
    'circle',
    'concentric-ring',
    'dot',
    'dot',
    'square',
    'rounded-square',
    'diamond',
    'triangle', // sparingly included
    'cluster-cross',
  ];

  const colors: PastelPalette[] = ['blue', 'lavender', 'peach', 'orange', 'slate'];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(prng() * types.length)];
    const color = colors[Math.floor(prng() * colors.length)];

    // Vary size depending on shape type
    let size: number;
    let baseAlpha: number;
    let hasGlow = false;
    let glowRadius = 40;

    switch (type) {
      case 'dot':
        size = 3 + prng() * 3; // 3 - 6px
        baseAlpha = 0.16 + prng() * 0.10; // 0.16 - 0.26
        break;
      case 'concentric-ring':
        size = 18 + prng() * 12; // 18 - 30px
        baseAlpha = 0.12 + prng() * 0.08; // 0.12 - 0.20
        hasGlow = prng() < 0.4;
        glowRadius = 38 + prng() * 25;
        break;
      case 'circle':
        size = 12 + prng() * 14; // 12 - 26px
        baseAlpha = 0.12 + prng() * 0.09; // 0.12 - 0.21
        hasGlow = prng() < 0.25;
        glowRadius = 35 + prng() * 25;
        break;
      case 'triangle':
        size = 10 + prng() * 6; // 10 - 16px (delicate, spare)
        baseAlpha = 0.11 + prng() * 0.08; // 0.11 - 0.19
        break;
      case 'diamond':
        size = 11 + prng() * 9; // 11 - 20px
        baseAlpha = 0.12 + prng() * 0.08;
        break;
      case 'square':
      case 'rounded-square':
        size = 9 + prng() * 8; // 9 - 17px
        baseAlpha = 0.11 + prng() * 0.09;
        break;
      case 'cluster-cross':
      default:
        size = 8 + prng() * 5; // 8 - 13px
        baseAlpha = 0.14 + prng() * 0.10;
        break;
    }

    // Subtle drift and slow rotation
    const vx = (prng() - 0.5) * 0.004; // Very slow drift
    const vy = (prng() - 0.5) * 0.003;
    const rotation = prng() * Math.PI * 2;
    const rotationSpeed = (prng() - 0.5) * 0.05; // ~0.025 rad/s
    const parallaxFactor = 0.15 + prng() * 0.30;

    elements.push({
      id: i,
      x: prng(),
      y: prng(),
      type,
      size,
      color,
      baseAlpha,
      rotation,
      rotationSpeed,
      vx,
      vy,
      parallaxFactor,
      hasGlow,
      glowRadius,
    });
  }

  // Connect ~15-20% of elements to nearby geometric neighbors for constellation lines
  const connectCount = Math.floor(count * 0.2);
  for (let c = 0; c < connectCount; c++) {
    const sourceIdx = (c * 4 + 1) % count;
    // Find closest neighbor in normalized space
    let closestIdx = -1;
    let closestDist = Infinity;
    const source = elements[sourceIdx];

    for (let j = 0; j < count; j++) {
      if (j === sourceIdx) continue;
      const target = elements[j];
      const dist = Math.hypot(target.x - source.x, target.y - source.y);
      if (dist > 0.05 && dist < 0.22 && dist < closestDist) {
        closestDist = dist;
        closestIdx = j;
      }
    }

    if (closestIdx !== -1) {
      source.connectTargetIndex = closestIdx;
    }
  }

  return elements;
}

/**
 * Advance geometric shape position and rotation.
 */
export function updateGeometricElement(
  el: GeometricElement,
  dt: number,
  speedMultiplier: number = 1
): void {
  el.x += el.vx * dt * speedMultiplier;
  el.y += el.vy * dt * speedMultiplier;

  // Boundary wrapping in normalized [0, 1] space
  if (el.x < 0) {
    el.x = (el.x % 1) + 1;
  } else if (el.x >= 1) {
    el.x = el.x % 1;
  }

  if (el.y < 0) {
    el.y = (el.y % 1) + 1;
  } else if (el.y >= 1) {
    el.y = el.y % 1;
  }

  el.rotation += el.rotationSpeed * dt * speedMultiplier;
}

/**
 * Render all geometric shapes and connections onto Canvas 2D.
 * Automatically skipped when in Dark Mode (themeFactor >= 0.95).
 */
export function renderGeometricElements(
  ctx: CanvasRenderingContext2D,
  elements: GeometricElement[],
  width: number,
  height: number,
  mouseOffset: { x: number; y: number },
  themeFactor: number, // 0 = Day, 1 = Night
  reducedMotion: boolean
): void {
  // If in dark mode, completely skip rendering for 0 performance impact
  if (themeFactor >= 0.95) return;

  const lightModeFactor = 1 - themeFactor; // 1.0 in pure Day Mode, fading out towards Night

  // 1. Draw delicate connecting lines between linked pairs
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.connectTargetIndex === undefined || el.connectTargetIndex < 0) continue;
    const target = elements[el.connectTargetIndex];
    if (!target) continue;

    const pFactor1 = reducedMotion ? 0 : el.parallaxFactor;
    const pFactor2 = reducedMotion ? 0 : target.parallaxFactor;

    const x1 = el.x * width + mouseOffset.x * pFactor1;
    const y1 = el.y * height + mouseOffset.y * pFactor1;
    const x2 = target.x * width + mouseOffset.x * pFactor2;
    const y2 = target.y * height + mouseOffset.y * pFactor2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);

    // Only draw if within sensible on-screen distance (avoid wrapping artifacts across edges)
    if (dist >= 45 && dist <= 240) {
      const lineAlpha = Math.min(el.baseAlpha, target.baseAlpha) * 0.42 * lightModeFactor;
      const rgb = getPastelRgb(el.color);

      ctx.save();
      ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${lineAlpha})`;
      ctx.lineWidth = 0.85;
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([3, 4]);
      }
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. Draw geometric shapes
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const alpha = el.baseAlpha * lightModeFactor;
    if (alpha <= 0.005) continue;

    const pFactor = reducedMotion ? 0 : el.parallaxFactor;
    let sx = el.x * width + mouseOffset.x * pFactor;
    let sy = el.y * height + mouseOffset.y * pFactor;

    // Wrap check for parallax margins
    if (sx < -40) sx += width + 80;
    else if (sx > width + 40) sx -= width + 80;
    if (sy < -40) sy += height + 80;
    else if (sy > height + 40) sy -= height + 80;

    const rgb = getPastelRgb(el.color);
    const rgbStr = `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;

    // Soft subtle radial glow (if present)
    if (el.hasGlow) {
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, el.glowRadius);
      glow.addColorStop(0, `rgba(${rgbStr}, ${alpha * 0.32})`);
      glow.addColorStop(1, `rgba(${rgbStr}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, el.glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(sx, sy);
    if (!reducedMotion && el.rotation !== 0) {
      ctx.rotate(el.rotation);
    }

    ctx.strokeStyle = `rgba(${rgbStr}, ${alpha})`;
    ctx.fillStyle = `rgba(${rgbStr}, ${alpha})`;
    ctx.lineWidth = 1;

    const s = el.size;
    const hs = s / 2;

    switch (el.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, hs, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'concentric-ring':
        ctx.beginPath();
        ctx.arc(0, 0, hs, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, hs * 0.45, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'dot':
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1.5, hs * 0.6), 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'square':
        ctx.strokeRect(-hs, -hs, s, s);
        break;

      case 'rounded-square': {
        const r = Math.min(3.5, s * 0.22);
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(-hs, -hs, s, s, r);
        } else {
          ctx.rect(-hs, -hs, s, s);
        }
        ctx.stroke();
        break;
      }

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -hs * 1.15);
        ctx.lineTo(hs * 0.85, 0);
        ctx.lineTo(0, hs * 1.15);
        ctx.lineTo(-hs * 0.85, 0);
        ctx.closePath();
        ctx.stroke();
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -hs);
        ctx.lineTo(hs * 0.866, hs * 0.5);
        ctx.lineTo(-hs * 0.866, hs * 0.5);
        ctx.closePath();
        ctx.stroke();
        break;

      case 'cluster-cross':
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-hs, 0);
        ctx.lineTo(hs, 0);
        ctx.moveTo(0, -hs);
        ctx.lineTo(0, hs);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }
}

