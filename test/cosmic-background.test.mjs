import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  mulberry32,
  generateStarField,
  updateStarPosition,
  calculateStarAlpha,
  getStarRgb,
  createShootingStar,
  updateShootingStar,
  smoothParallax,
  generateGeometricField,
  getPastelRgb,
  updateGeometricElement,
  renderGeometricElements,
} from '../lib/cosmic-background-utils.ts';

describe('Cosmic Background - Deterministic PRNG & Generation', () => {
  test('mulberry32 generates identical pseudo-random sequence for identical seed', () => {
    const rng1 = mulberry32(1337);
    const rng2 = mulberry32(1337);

    for (let i = 0; i < 50; i++) {
      assert.equal(rng1(), rng2());
    }
  });

  test('generateStarField returns deterministic stars with valid ranges', () => {
    const count = 100;
    const starsA = generateStarField(count, 0x1234);
    const starsB = generateStarField(count, 0x1234);

    assert.equal(starsA.length, count);
    assert.deepEqual(starsA, starsB);

    for (const star of starsA) {
      assert.ok(star.x >= 0 && star.x <= 1, 'x coordinate must be in [0, 1]');
      assert.ok(star.y >= 0 && star.y <= 1, 'y coordinate must be in [0, 1]');
      assert.ok(star.radius >= 0.4 && star.radius <= 2.5, 'radius must be between 0.4 and 2.5');
      assert.ok(star.layer === 0 || star.layer === 1 || star.layer === 2, 'valid layer');
      assert.ok(star.baseAlpha > 0 && star.baseAlpha <= 1, 'valid base alpha');
      assert.ok(star.dayAlpha > 0 && star.dayAlpha <= 1, 'valid day alpha');
      assert.ok(['white', 'cyan', 'violet', 'amber'].includes(star.tint), 'valid tint');
    }
  });

  test('layers follow configured depth distribution', () => {
    const stars = generateStarField(300, 0x9999);
    const layer0 = stars.filter((s) => s.layer === 0).length;
    const layer1 = stars.filter((s) => s.layer === 1).length;
    const layer2 = stars.filter((s) => s.layer === 2).length;

    // Expected ~55% layer 0, ~32% layer 1, ~13% layer 2
    assert.ok(layer0 > 130 && layer0 < 190, `layer 0 count was ${layer0}`);
    assert.ok(layer1 > 70 && layer1 < 125, `layer 1 count was ${layer1}`);
    assert.ok(layer2 > 20 && layer2 < 60, `layer 2 count was ${layer2}`);
  });
});

describe('Cosmic Background - Star Physics & Motion', () => {
  test('updateStarPosition advances drift velocity and wraps around boundaries', () => {
    const star = {
      x: 0.99,
      y: 0.01,
      radius: 1,
      layer: 1,
      baseAlpha: 0.8,
      dayAlpha: 0.2,
      twinklePhase: 0,
      twinkleSpeed: 1,
      tint: 'white',
      vx: 0.05, // will exceed 1.0
      vy: -0.05, // will fall below 0.0
      parallaxFactor: 0.5,
      hasGlint: false,
    };

    updateStarPosition(star, 1.0);

    assert.ok(star.x >= 0 && star.x <= 1, `x wrapped correctly: ${star.x}`);
    assert.ok(star.y >= 0 && star.y <= 1, `y wrapped correctly: ${star.y}`);
    assert.ok(Math.abs(star.x - 0.04) < 0.0001, 'wrapped positive overflow cleanly');
    assert.ok(Math.abs(star.y - 0.96) < 0.0001, 'wrapped negative underflow cleanly');
  });

  test('calculateStarAlpha respects theme blend and reduced motion', () => {
    const star = {
      x: 0.5,
      y: 0.5,
      radius: 1,
      layer: 1,
      baseAlpha: 0.8,
      dayAlpha: 0.2,
      twinklePhase: 0,
      twinkleSpeed: 2,
      tint: 'white',
      vx: 0,
      vy: 0,
      parallaxFactor: 0.5,
      hasGlint: false,
    };

    // Reduced motion in night mode (themeFactor = 1)
    const nightReduced = calculateStarAlpha(star, 0, 1, true);
    assert.equal(nightReduced, 0.8);

    // Reduced motion in day mode (themeFactor = 0)
    const dayReduced = calculateStarAlpha(star, 0, 0, true);
    assert.equal(dayReduced, 0.2);

    // Dynamic twinkle produces oscillating alpha within safe bounds
    const alphaT0 = calculateStarAlpha(star, 0, 1, false);
    const alphaT1 = calculateStarAlpha(star, Math.PI / 4, 1, false);
    assert.ok(alphaT0 >= 0 && alphaT0 <= 1);
    assert.ok(alphaT1 >= 0 && alphaT1 <= 1);
    assert.notEqual(alphaT0, alphaT1);
  });

  test('getStarRgb correctly adapts for day and night modes', () => {
    // In day mode (themeFactor < 0.35), returns slate motes regardless of tint
    const dayRgb = getStarRgb('cyan', 0);
    assert.deepEqual(dayRgb, [115, 128, 142]);

    // In night mode (themeFactor = 1), returns tinted cosmic colors
    const cyanRgb = getStarRgb('cyan', 1);
    assert.deepEqual(cyanRgb, [165, 243, 252]);

    const violetRgb = getStarRgb('violet', 1);
    assert.deepEqual(violetRgb, [224, 231, 255]);

    const amberRgb = getStarRgb('amber', 1);
    assert.deepEqual(amberRgb, [254, 243, 199]);

    const whiteRgb = getStarRgb('white', 1);
    assert.deepEqual(whiteRgb, [245, 248, 255]);
  });
});

describe('Cosmic Background - Shooting Star Mechanics', () => {
  test('createShootingStar initializes active streak within bounds', () => {
    const shooting = createShootingStar(1920, 1080, mulberry32(42));

    assert.equal(shooting.active, true);
    assert.equal(shooting.progress, 0);
    assert.equal(shooting.elapsed, 0);
    assert.ok(shooting.startX > 0 && shooting.startX < 1920);
    assert.ok(shooting.startY > 0 && shooting.startY < 1080);
    assert.ok(shooting.trailLength >= 90 && shooting.trailLength <= 150);
  });

  test('updateShootingStar advances position and terminates after duration', () => {
    const shooting = createShootingStar(1920, 1080, mulberry32(42));
    const initialX = shooting.currentX;
    const initialY = shooting.currentY;

    // Step 0.1s
    const stillActive = updateShootingStar(shooting, 0.1);
    assert.equal(stillActive, true);
    assert.notEqual(shooting.currentX, initialX);
    assert.notEqual(shooting.currentY, initialY);
    assert.ok(shooting.progress > 0 && shooting.progress < 1);

    // Step remaining lifetime
    const finished = updateShootingStar(shooting, 2.0);
    assert.equal(finished, false);
    assert.equal(shooting.active, false);
    assert.equal(shooting.progress, 1);
  });
});

describe('Cosmic Background - Parallax Interpolation', () => {
  test('smoothParallax smoothly damps towards target coordinate', () => {
    const current = { x: 0, y: 0 };
    const target = { x: 20, y: 10 };

    const step1 = smoothParallax(current, target, 0.016, 4);
    assert.ok(step1.x > 0 && step1.x < 20);
    assert.ok(step1.y > 0 && step1.y < 10);

    // Over multiple steps, it converges to target
    let iterated = step1;
    for (let i = 0; i < 60; i++) {
      iterated = smoothParallax(iterated, target, 0.016, 4);
    }
    assert.ok(Math.abs(iterated.x - target.x) < 0.5);
    assert.ok(Math.abs(iterated.y - target.y) < 0.5);
  });
});

describe('Cosmic Background - Light Mode Geometric Texture System', () => {
  test('generateGeometricField produces deterministic shapes with valid constraints', () => {
    const field1 = generateGeometricField(30, 0x1234);
    const field2 = generateGeometricField(30, 0x1234);

    assert.equal(field1.length, 30);
    assert.deepEqual(field1, field2);

    const validTypes = [
      'circle',
      'concentric-ring',
      'dot',
      'square',
      'rounded-square',
      'diamond',
      'triangle',
      'cluster-cross',
    ];
    const validColors = ['blue', 'lavender', 'peach', 'orange', 'slate'];

    for (const el of field1) {
      assert.ok(el.x >= 0 && el.x <= 1, 'x in [0, 1]');
      assert.ok(el.y >= 0 && el.y <= 1, 'y in [0, 1]');
      assert.ok(validTypes.includes(el.type), `valid shape type: ${el.type}`);
      assert.ok(validColors.includes(el.color), `valid color: ${el.color}`);
      assert.ok(el.size >= 2 && el.size <= 40, 'valid size bounds');
      assert.ok(el.baseAlpha >= 0.05 && el.baseAlpha <= 0.35, 'subtle alpha bounds');

      if (el.connectTargetIndex !== undefined) {
        assert.ok(
          el.connectTargetIndex >= 0 && el.connectTargetIndex < 30,
          'valid connect target index'
        );
      }
    }
  });

  test('getPastelRgb returns distinct curated pastel RGB values', () => {
    const blue = getPastelRgb('blue');
    const lavender = getPastelRgb('lavender');
    const peach = getPastelRgb('peach');
    const orange = getPastelRgb('orange');
    const slate = getPastelRgb('slate');

    assert.deepEqual(blue, [56, 189, 248]);
    assert.deepEqual(lavender, [192, 132, 252]);
    assert.deepEqual(peach, [251, 146, 60]);
    assert.deepEqual(orange, [249, 115, 22]);
    assert.deepEqual(slate, [148, 163, 184]);
  });

  test('updateGeometricElement wraps coordinates and rotates gently', () => {
    const el = {
      id: 0,
      x: 0.999,
      y: 0.001,
      type: 'circle',
      size: 15,
      color: 'blue',
      baseAlpha: 0.15,
      rotation: 0,
      rotationSpeed: 0.1,
      vx: 0.01,
      vy: -0.01,
      parallaxFactor: 0.2,
      hasGlow: false,
      glowRadius: 40,
    };

    updateGeometricElement(el, 1.0);

    assert.ok(el.x >= 0 && el.x <= 1);
    assert.ok(el.y >= 0 && el.y <= 1);
    assert.ok(el.rotation > 0);
  });

  test('renderGeometricElements completely skips when themeFactor is in dark mode (>= 0.95)', () => {
    let callCount = 0;
    const dummyGrad = { addColorStop: () => {} };
    const mockCtx = {
      save: () => callCount++,
      restore: () => callCount++,
      beginPath: () => callCount++,
      arc: () => callCount++,
      stroke: () => callCount++,
      fill: () => callCount++,
      moveTo: () => callCount++,
      lineTo: () => callCount++,
      closePath: () => callCount++,
      translate: () => callCount++,
      rotate: () => callCount++,
      strokeRect: () => callCount++,
      rect: () => callCount++,
      createRadialGradient: () => dummyGrad,
      setLineDash: () => callCount++,
    };

    const elements = generateGeometricField(10, 0x1111);

    // Call with dark mode themeFactor = 1.0
    renderGeometricElements(
      mockCtx,
      elements,
      1920,
      1080,
      { x: 0, y: 0 },
      1.0, // Dark Mode
      false
    );

    // Dark mode must have ZERO canvas calls (preserving dark mode completely)
    assert.equal(callCount, 0);

    // Call with light mode themeFactor = 0.0
    renderGeometricElements(
      mockCtx,
      elements,
      1920,
      1080,
      { x: 0, y: 0 },
      0.0, // Light Mode
      false
    );

    assert.ok(callCount > 0, 'Canvas operations executed for light mode');
  });
});

