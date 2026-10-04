/**
 * Motion constants — sourced from design-system/tokens/motion.json
 * Use these in framer-motion `transition` props so JS animations
 * stay in sync with CSS custom properties.
 */

export type DurationKey = 'micro' | 'fast' | 'normal' | 'moderate' | 'slow' | 'slower';
export type EaseKey = 'inOut' | 'out' | 'in' | 'bounce' | 'smooth';
export type CubicBezierCurve = readonly [number, number, number, number];

export interface MotionTransition {
  readonly duration: number;
  readonly ease: CubicBezierCurve;
}

export const duration: Readonly<Record<DurationKey, number>> = Object.freeze({
  micro:    0.1,
  fast:     0.15,
  normal:   0.2,
  moderate: 0.3,
  slow:     0.4,
  slower:   0.5,
});

export const ease: Readonly<Record<EaseKey, CubicBezierCurve>> = Object.freeze({
  inOut:  Object.freeze([0.4, 0, 0.2, 1]) as CubicBezierCurve,
  out:    Object.freeze([0, 0, 0.2, 1]) as CubicBezierCurve,
  in:     Object.freeze([0.4, 0, 1, 1]) as CubicBezierCurve,
  bounce: Object.freeze([0.68, -0.55, 0.265, 1.55]) as CubicBezierCurve,
  smooth: Object.freeze([0.25, 0.1, 0.25, 1]) as CubicBezierCurve,
});

/** Standard transition for dropdowns / tooltips entering */
export const transitionEnter: MotionTransition = Object.freeze({
  duration: duration.moderate,
  ease: ease.out,
});

/** Standard transition for dropdowns / tooltips exiting */
export const transitionExit: MotionTransition = Object.freeze({
  duration: duration.normal,
  ease: ease.in,
});

/** Page-level fade transition */
export const transitionPage: MotionTransition = Object.freeze({
  duration: duration.moderate,
  ease: ease.out,
});

/**
 * Validate that a duration value is a positive, finite number within reasonable animation bounds.
 * Rejects non-numbers, NaN, <= 0, and excessively long durations (> 10s).
 */
export function isValidDuration(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 10
  );
}

/**
 * Validate that a cubic bezier easing curve matches the CSS specification:
 * - Must be an array of exactly 4 finite numbers [x1, y1, x2, y2]
 * - Time coordinates x1 and x2 must be within the range [0, 1]
 * - Output values y1 and y2 may exceed [0, 1] (e.g. bounce/overshoot) but must be finite
 */
export function isValidCubicBezier(curve: unknown): curve is CubicBezierCurve {
  if (!Array.isArray(curve) || curve.length !== 4) {
    return false;
  }
  const [x1, y1, x2, y2] = curve;
  return (
    typeof x1 === 'number' &&
    typeof y1 === 'number' &&
    typeof x2 === 'number' &&
    typeof y2 === 'number' &&
    Number.isFinite(x1) &&
    Number.isFinite(y1) &&
    Number.isFinite(x2) &&
    Number.isFinite(y2) &&
    x1 >= 0 &&
    x1 <= 1 &&
    x2 >= 0 &&
    x2 <= 1
  );
}

/**
 * Validate that a transition object conforms to MotionTransition structure.
 */
export function isValidTransition(transition: unknown): transition is MotionTransition {
  if (typeof transition !== 'object' || transition === null) {
    return false;
  }
  const candidate = transition as Record<string, unknown>;
  return isValidDuration(candidate.duration) && isValidCubicBezier(candidate.ease);
}

/**
 * Defensive transition resolver with fallback recovery.
 * Sanitizes input options against prototype pollution and invalid properties.
 * If properties are missing or invalid, safe defaults from the fallback transition are used.
 */
export function getSafeTransition(
  custom?: unknown,
  fallback: MotionTransition = transitionEnter
): MotionTransition {
  const safeFallback = isValidTransition(fallback) ? fallback : transitionEnter;

  if (typeof custom !== 'object' || custom === null) {
    return safeFallback;
  }

  const candidate = custom as Record<string, unknown>;

  const resolvedDuration = isValidDuration(candidate.duration)
    ? candidate.duration
    : safeFallback.duration;

  const resolvedEase = isValidCubicBezier(candidate.ease)
    ? (Object.freeze([...candidate.ease]) as CubicBezierCurve)
    : safeFallback.ease;

  return Object.freeze({
    duration: resolvedDuration,
    ease: resolvedEase,
  });
}
