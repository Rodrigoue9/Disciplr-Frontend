import { describe, expect, it } from 'vitest';
import {
  duration,
  ease,
  transitionEnter,
  transitionExit,
  transitionPage,
  isValidDuration,
  isValidCubicBezier,
  isValidTransition,
  getSafeTransition,
  type CubicBezierCurve,
  type MotionTransition,
} from '../utils/motion';

describe('src/utils/motion.ts - Authorization & Validation Regression Coverage', () => {
  // ── 1. Duration Ordering & Invariants ──────────────────────────────────────────

  describe('Duration Ordering & Boundary Invariants', () => {
    it('enforces strict monotonic ordering across all duration steps', () => {
      expect(duration.micro).toBeLessThan(duration.fast);
      expect(duration.fast).toBeLessThan(duration.normal);
      expect(duration.normal).toBeLessThan(duration.moderate);
      expect(duration.moderate).toBeLessThan(duration.slow);
      expect(duration.slow).toBeLessThan(duration.slower);
    });

    it('ensures each consecutive step has a positive delta of at least 0.04s', () => {
      const sequence = [
        duration.micro,
        duration.fast,
        duration.normal,
        duration.moderate,
        duration.slow,
        duration.slower,
      ];
      for (let i = 1; i < sequence.length; i++) {
        const delta = sequence[i] - sequence[i - 1];
        expect(delta).toBeGreaterThanOrEqual(0.04);
      }
    });

    it('bounds all durations within sensible human-perceptible animation limits (0.05s to 1.0s)', () => {
      for (const [key, value] of Object.entries(duration)) {
        expect(value, `duration.${key} should be >= 0.05s`).toBeGreaterThanOrEqual(0.05);
        expect(value, `duration.${key} should be <= 1.0s`).toBeLessThanOrEqual(1.0);
      }
    });

    it('enforces runtime immutability on the duration dictionary', () => {
      expect(Object.isFrozen(duration)).toBe(true);
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        duration.micro = 999;
      }).toThrow(TypeError);
    });

    it('isValidDuration accepts valid positive finite durations within [0, 10]', () => {
      expect(isValidDuration(0.1)).toBe(true);
      expect(isValidDuration(0.3)).toBe(true);
      expect(isValidDuration(5.0)).toBe(true);
      expect(isValidDuration(10.0)).toBe(true);
    });

    it('isValidDuration rejects non-numbers, negative values, zero, NaN, Infinity, and out-of-bounds numbers', () => {
      expect(isValidDuration(0)).toBe(false);
      expect(isValidDuration(-0.1)).toBe(false);
      expect(isValidDuration(NaN)).toBe(false);
      expect(isValidDuration(Infinity)).toBe(false);
      expect(isValidDuration(-Infinity)).toBe(false);
      expect(isValidDuration(10.1)).toBe(false);
      expect(isValidDuration('0.2')).toBe(false);
      expect(isValidDuration(null)).toBe(false);
      expect(isValidDuration(undefined)).toBe(false);
      expect(isValidDuration({})).toBe(false);
      expect(isValidDuration([])).toBe(false);
    });
  });

  // ── 2. Cubic Bezier Curve Array Validations ────────────────────────────────────

  describe('Cubic Bezier Curve Array Validations', () => {
    it('ensures every exported easing curve has exactly 4 numbers', () => {
      for (const [key, curve] of Object.entries(ease)) {
        expect(Array.isArray(curve), `ease.${key} must be an array`).toBe(true);
        expect(curve.length, `ease.${key} must have length 4`).toBe(4);
        for (const coord of curve) {
          expect(typeof coord).toBe('number');
          expect(Number.isFinite(coord)).toBe(true);
        }
      }
    });

    it('verifies that time coordinates x1 and x2 stay strictly in [0, 1] per CSS spec', () => {
      for (const [key, curve] of Object.entries(ease)) {
        const [x1, , x2] = curve;
        expect(x1, `ease.${key} x1 must be >= 0`).toBeGreaterThanOrEqual(0);
        expect(x1, `ease.${key} x1 must be <= 1`).toBeLessThanOrEqual(1);
        expect(x2, `ease.${key} x2 must be >= 0`).toBeGreaterThanOrEqual(0);
        expect(x2, `ease.${key} x2 must be <= 1`).toBeLessThanOrEqual(1);
      }
    });

    it('verifies that bounce easing allows valid anticipation (y1 < 0) and overshoot (y2 > 1)', () => {
      const [, y1, , y2] = ease.bounce;
      expect(y1).toBeLessThan(0);
      expect(y2).toBeGreaterThan(1);
    });

    it('enforces runtime immutability on ease dictionary and individual curve tuples', () => {
      expect(Object.isFrozen(ease)).toBe(true);
      for (const [key, curve] of Object.entries(ease)) {
        expect(Object.isFrozen(curve), `ease.${key} must be frozen`).toBe(true);
        expect(() => {
          // @ts-expect-error - Testing runtime immutability
          curve[0] = 0.99;
        }).toThrow(TypeError);
      }
    });

    it('isValidCubicBezier accepts valid standard and elastic curves', () => {
      expect(isValidCubicBezier(ease.inOut)).toBe(true);
      expect(isValidCubicBezier(ease.out)).toBe(true);
      expect(isValidCubicBezier(ease.in)).toBe(true);
      expect(isValidCubicBezier(ease.bounce)).toBe(true);
      expect(isValidCubicBezier(ease.smooth)).toBe(true);
      expect(isValidCubicBezier([0, 0, 1, 1])).toBe(true);
      expect(isValidCubicBezier([0.25, -0.5, 0.75, 1.5])).toBe(true);
    });

    it('isValidCubicBezier rejects invalid curve structures, bad lengths, and non-numeric entries', () => {
      expect(isValidCubicBezier(null)).toBe(false);
      expect(isValidCubicBezier(undefined)).toBe(false);
      expect(isValidCubicBezier('cubic-bezier(0,0,1,1)')).toBe(false);
      expect(isValidCubicBezier(123)).toBe(false);
      expect(isValidCubicBezier({})).toBe(false);
      expect(isValidCubicBezier([])).toBe(false);
      expect(isValidCubicBezier([0, 0, 1])).toBe(false);
      expect(isValidCubicBezier([0, 0, 1, 1, 0.5])).toBe(false);
      expect(isValidCubicBezier(['0', '0', '1', '1'])).toBe(false);
      expect(isValidCubicBezier([NaN, 0, 1, 1])).toBe(false);
      expect(isValidCubicBezier([0, Infinity, 1, 1])).toBe(false);
    });

    it('isValidCubicBezier strictly rejects curves where x1 or x2 are outside [0, 1]', () => {
      expect(isValidCubicBezier([-0.01, 0, 0.5, 1])).toBe(false);
      expect(isValidCubicBezier([1.01, 0, 0.5, 1])).toBe(false);
      expect(isValidCubicBezier([0.5, 0, -0.01, 1])).toBe(false);
      expect(isValidCubicBezier([0.5, 0, 1.01, 1])).toBe(false);
    });
  });

  // ── 3. Composite Transitions ──────────────────────────────────────────────────

  describe('Composite Transitions Invariants', () => {
    it('transitionEnter, transitionExit, transitionPage have valid duration and ease curves', () => {
      for (const [name, t] of [
        ['transitionEnter', transitionEnter],
        ['transitionExit', transitionExit],
        ['transitionPage', transitionPage],
      ] as const) {
        expect(isValidDuration(t.duration), `${name}.duration should be valid`).toBe(true);
        expect(isValidCubicBezier(t.ease), `${name}.ease should be valid`).toBe(true);
      }
    });

    it('preserves the exit-responsiveness invariant (transitionExit.duration <= transitionEnter.duration)', () => {
      expect(transitionExit.duration).toBeLessThanOrEqual(transitionEnter.duration);
    });

    it('ensures composite transitions contain exactly duration and ease without unexpected keys', () => {
      const allowedKeys = ['duration', 'ease'];
      for (const t of [transitionEnter, transitionExit, transitionPage]) {
        const keys = Object.keys(t);
        expect(keys.sort()).toEqual(allowedKeys.sort());
      }
    });

    it('enforces runtime immutability on all composite transitions', () => {
      for (const t of [transitionEnter, transitionExit, transitionPage]) {
        expect(Object.isFrozen(t)).toBe(true);
        expect(() => {
          // @ts-expect-error - Testing runtime immutability
          t.duration = 1.0;
        }).toThrow(TypeError);
      }
    });

    it('isValidTransition validates valid and invalid composite transitions', () => {
      expect(isValidTransition(transitionEnter)).toBe(true);
      expect(isValidTransition(transitionExit)).toBe(true);
      expect(isValidTransition(transitionPage)).toBe(true);
      expect(isValidTransition({ duration: 0.25, ease: [0.2, 0, 0.2, 1] })).toBe(true);

      expect(isValidTransition(null)).toBe(false);
      expect(isValidTransition(undefined)).toBe(false);
      expect(isValidTransition('transition')).toBe(false);
      expect(isValidTransition({ duration: 0.2 })).toBe(false);
      expect(isValidTransition({ ease: [0.2, 0, 0.2, 1] })).toBe(false);
      expect(isValidTransition({ duration: -1, ease: [0.2, 0, 0.2, 1] })).toBe(false);
      expect(isValidTransition({ duration: 0.2, ease: [2, 0, 0.2, 1] })).toBe(false);
    });
  });

  // ── 4. Defensive Fallbacks & State Recovery (getSafeTransition) ─────────────────

  describe('Defensive Fallbacks, Concurrency & Recovery (getSafeTransition)', () => {
    it('returns default fallback when input is undefined, null, or invalid type', () => {
      expect(getSafeTransition()).toEqual(transitionEnter);
      expect(getSafeTransition(null)).toEqual(transitionEnter);
      expect(getSafeTransition(undefined)).toEqual(transitionEnter);
      expect(getSafeTransition('invalid-string')).toEqual(transitionEnter);
      expect(getSafeTransition(12345)).toEqual(transitionEnter);
      expect(getSafeTransition([])).toEqual(transitionEnter);
    });

    it('allows overriding duration while safely preserving fallback easing', () => {
      const result = getSafeTransition({ duration: 0.45 });
      expect(result.duration).toBe(0.45);
      expect(result.ease).toEqual(transitionEnter.ease);
    });

    it('allows overriding ease while safely preserving fallback duration', () => {
      const customEase: CubicBezierCurve = [0.1, 0.1, 0.9, 0.9];
      const result = getSafeTransition({ ease: customEase });
      expect(result.duration).toBe(transitionEnter.duration);
      expect(result.ease).toEqual(customEase);
    });

    it('safely recovers to fallback when custom properties are invalid or corrupt', () => {
      const corrupt = {
        duration: -5, // Invalid duration
        ease: [2.5, 0, 0, 1], // Invalid x1
      };
      const result = getSafeTransition(corrupt);
      expect(result).toEqual(transitionEnter);
    });

    it('respects a custom fallback transition when provided', () => {
      const result = getSafeTransition({ duration: -1 }, transitionExit);
      expect(result).toEqual(transitionExit);
    });

    it('recovers to transitionEnter if custom fallback itself is corrupted', () => {
      const badFallback = { duration: -1, ease: [99, 0, 0, 1] } as unknown as MotionTransition;
      const result = getSafeTransition(null, badFallback);
      expect(result).toEqual(transitionEnter);
    });

    it('recovers safely when custom input contains hostile throwing getters', () => {
      const hostileDuration = {
        get duration(): number {
          throw new Error('Hostile duration getter exploded');
        },
        ease: ease.smooth,
      };
      const result1 = getSafeTransition(hostileDuration);
      expect(result1).toEqual(transitionEnter);

      const hostileEase = {
        duration: 0.25,
        get ease(): CubicBezierCurve {
          throw new Error('Hostile ease getter exploded');
        },
      };
      const result2 = getSafeTransition(hostileEase);
      expect(result2).toEqual(transitionEnter);
    });

    it('recovers safely when custom fallback contains hostile throwing getters', () => {
      const hostileFallback = {
        get duration(): number {
          throw new Error('Fallback duration exploded');
        },
        get ease(): CubicBezierCurve {
          throw new Error('Fallback ease exploded');
        },
      } as unknown as MotionTransition;

      const result = getSafeTransition(null, hostileFallback);
      expect(result).toEqual(transitionEnter);
    });

    it('isValidTransition returns false without throwing on hostile throwing getters or arrays', () => {
      const hostile = {
        get duration(): number {
          throw new Error('Validation getter crash');
        },
        ease: ease.smooth,
      };
      expect(isValidTransition(hostile)).toBe(false);
      expect(isValidTransition([0.3, [0, 0, 1, 1]])).toBe(false);
    });

    it('isValidCubicBezier returns false on sparse arrays without error', () => {
      const sparse = new Array(4);
      sparse[0] = 0;
      sparse[3] = 1;
      expect(isValidCubicBezier(sparse)).toBe(false);
    });

    it('recovers safely when a throwing Proxy is passed to getSafeTransition', () => {
      const throwingProxy = new Proxy({}, {
        get(_target, prop) {
          throw new Error(`Access to ${String(prop)} denied by proxy`);
        },
      });
      const result = getSafeTransition(throwingProxy);
      expect(result).toEqual(transitionEnter);
    });

    it('is immune to prototype pollution attempts', () => {
      const maliciousPayload = JSON.parse('{"__proto__":{"duration":0.001,"polluted":true}}');
      const safe = getSafeTransition(maliciousPayload);
      expect(safe.duration).toBe(transitionEnter.duration);
      // @ts-expect-error - Verify property did not pollute global Object prototype
      expect(Object.prototype.polluted).toBeUndefined();
    });

    it('returns frozen transition objects to prevent caller mutation', () => {
      const result = getSafeTransition({ duration: 0.35 });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.ease)).toBe(true);
    });

    it('executes deterministically across concurrent invocations', async () => {
      const runs = Array.from({ length: 32 }, (_, i) =>
        Promise.resolve().then(() => getSafeTransition({ duration: 0.15 + (i % 2) * 0.1 }))
      );
      const results = await Promise.all(runs);
      expect(results).toHaveLength(32);
      for (let i = 0; i < results.length; i++) {
        const expectedDuration = 0.15 + (i % 2) * 0.1;
        expect(results[i].duration).toBe(expectedDuration);
        expect(results[i].ease).toEqual(transitionEnter.ease);
        expect(Object.isFrozen(results[i])).toBe(true);
      }
    });
  });
});
