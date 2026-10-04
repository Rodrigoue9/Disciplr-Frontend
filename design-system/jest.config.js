/**
 * Jest configuration for @disciplr/design-system
 *
 * Enforces deterministic invariants for test runners, CI environments, and programmatic consumers.
 * Supports both CommonJS and ESM module loading without runtime or syntax errors.
 *
 * Exported as a callable function (with static properties) so Jest receives a clean configuration
 * object without unknown option warnings, while remaining fully backward-compatible with
 * object property access and named imports.
 */

const MIN_COVERAGE_THRESHOLD = 0;
const MAX_COVERAGE_THRESHOLD = 100;

const VALID_TEST_ENVIRONMENTS = Object.freeze(['node', 'jsdom']);

const DEFAULT_COVERAGE_METRICS = Object.freeze(['branches', 'functions', 'lines', 'statements']);

const DEFAULT_GLOBAL_THRESHOLDS = Object.freeze({
  branches: 80,
  functions: 80,
  lines: 80,
  statements: 80,
});

const DEFAULT_COVERAGE_THRESHOLD = DEFAULT_GLOBAL_THRESHOLDS;

const DEFAULT_ROOTS = Object.freeze(['<rootDir>/src']);
const DEFAULT_TEST_MATCH = Object.freeze([
  '**/__tests__/**/*.ts',
  '**/?(*.)+(spec|test).ts',
]);
const DEFAULT_COLLECT_COVERAGE_FROM = Object.freeze([
  'src/**/*.ts',
  '!src/**/*.d.ts',
  '!src/**/__tests__/**',
]);

const DEFAULT_CONFIG = Object.freeze({
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: DEFAULT_ROOTS,
  testMatch: DEFAULT_TEST_MATCH,
  collectCoverageFrom: DEFAULT_COLLECT_COVERAGE_FROM,
  coverageThreshold: Object.freeze({
    global: DEFAULT_GLOBAL_THRESHOLDS,
  }),
});

const DEFAULT_JEST_CONFIG = DEFAULT_CONFIG;

/**
 * Validates a single coverage threshold value.
 * Boundary: [0, 100]. Must be a finite number.
 *
 * @param {unknown} value
 * @param {string} metric
 * @returns {number}
 */
function validateThreshold(value, metric) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new TypeError(
      `Coverage threshold for '${metric}' must be a finite number, received: ${
        Number.isNaN(value) ? 'NaN' : typeof value === 'number' ? String(value) : typeof value
      }`
    );
  }
  if (value < MIN_COVERAGE_THRESHOLD || value > MAX_COVERAGE_THRESHOLD) {
    throw new RangeError(
      `Coverage threshold for '${metric}' must be between ${MIN_COVERAGE_THRESHOLD} and ${MAX_COVERAGE_THRESHOLD}, received: ${value}`
    );
  }
  return value;
}

/**
 * Validate that a coverage threshold is a finite number between 0 and 100 inclusive.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isValidThresholdValue(value) {
  try {
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= MIN_COVERAGE_THRESHOLD &&
      value <= MAX_COVERAGE_THRESHOLD
    );
  } catch {
    return false;
  }
}

/**
 * Validates and deduplicates an array of string patterns or paths.
 *
 * @param {unknown} value
 * @param {string} fieldName
 * @returns {string[]}
 */
function validateAndDeduplicateStringArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array of strings, received: ${typeof value}`);
  }
  if (value.length === 0) {
    throw new RangeError(`${fieldName} must contain at least one pattern or path`);
  }
  const seen = new Set();
  const result = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== 'string') {
      throw new TypeError(
        `${fieldName}[${i}] must be a non-empty string, received: ${typeof item}`
      );
    }
    const trimmed = item.trim();
    if (trimmed.length === 0) {
      throw new RangeError(`${fieldName}[${i}] cannot be an empty or whitespace-only string`);
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Validates a non-empty string field.
 *
 * @param {unknown} value
 * @param {string} fieldName
 * @returns {string}
 */
function validateNonEmptyString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} must be a string, received: ${typeof value}`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new RangeError(`${fieldName} cannot be empty or whitespace-only`);
  }
  return trimmed;
}

/**
 * Validate that a glob or pattern string is structurally valid with balanced brackets.
 * Properly skips escaped characters (e.g. \\[, \\{, \\().
 *
 * @param {unknown} pattern
 * @returns {boolean}
 */
function isValidPatternString(pattern) {
  if (typeof pattern !== 'string' || pattern.trim().length === 0) {
    return false;
  }
  let brackets = 0;
  let parens = 0;
  let braces = 0;
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '\\') {
      if (i + 1 >= pattern.length) {
        return false;
      }
      i++; // Skip escaped literal character
      continue;
    }
    if (char === '[') brackets++;
    else if (char === ']') brackets--;
    else if (char === '(') parens++;
    else if (char === ')') parens--;
    else if (char === '{') braces++;
    else if (char === '}') braces--;
    if (brackets < 0 || parens < 0 || braces < 0) return false;
  }
  return brackets === 0 && parens === 0 && braces === 0;
}

/**
 * Validate that a regex pattern string or RegExp object is non-empty and compiles cleanly into a RegExp.
 *
 * @param {unknown} pattern
 * @returns {boolean}
 */
function isValidRegexPattern(pattern) {
  if (pattern instanceof RegExp) {
    return true;
  }
  if (typeof pattern !== 'string' || pattern.trim().length === 0) {
    return false;
  }
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a coverageThreshold object for branches, functions, lines, statements.
 *
 * @param {unknown} thresholds
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateCoverageThreshold(thresholds) {
  const errors = [];
  try {
    if (typeof thresholds !== 'object' || thresholds === null || Array.isArray(thresholds)) {
      return { isValid: false, errors: ['Thresholds must be a plain object'] };
    }

    for (const key of DEFAULT_COVERAGE_METRICS) {
      let val;
      try {
        val = thresholds[key];
      } catch {
        errors.push(`Error accessing threshold property: ${key}`);
        continue;
      }
      if (val === undefined) {
        errors.push(`Missing threshold key: ${key}`);
      } else if (!isValidThresholdValue(val)) {
        errors.push(
          `Threshold for '${key}' must be a number between ${MIN_COVERAGE_THRESHOLD} and ${MAX_COVERAGE_THRESHOLD}, received: ${val}`
        );
      }
    }
  } catch (err) {
    return { isValid: false, errors: [`Failed to validate thresholds: ${err?.message || err}`] };
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a complete Jest configuration object against required invariants.
 * Throws TypeError / RangeError if options.throwOnError is true (default).
 * Returns { isValid: boolean, errors: string[] } if options.throwOnError is false.
 *
 * @param {unknown} config
 * @param {{ throwOnError?: boolean } | boolean} [options]
 * @returns {boolean | { isValid: boolean, errors: string[] }}
 */
function validateJestConfig(config, options) {
  const throwOnError =
    options === undefined ||
    options === true ||
    (typeof options === 'object' && options !== null && options.throwOnError !== false);

  const errors = [];

  const fail = (ErrorClass, message) => {
    if (throwOnError) {
      throw new ErrorClass(message);
    }
    errors.push(message);
  };

  if (!config || (typeof config !== 'object' && typeof config !== 'function') || Array.isArray(config)) {
    fail(TypeError, 'Jest configuration must be a non-null object');
    return throwOnError ? false : { isValid: false, errors };
  }

  let preset, testEnvironment, roots, testMatch, testRegex, collectCoverageFrom, coverageThreshold, testPathIgnorePatterns;
  try {
    preset = config.preset;
    testEnvironment = config.testEnvironment;
    roots = config.roots;
    testMatch = config.testMatch;
    testRegex = config.testRegex;
    collectCoverageFrom = config.collectCoverageFrom;
    coverageThreshold = config.coverageThreshold;
    testPathIgnorePatterns = config.testPathIgnorePatterns;
  } catch (err) {
    fail(TypeError, `Failed inspecting configuration properties: ${err?.message || err}`);
    return throwOnError ? false : { isValid: false, errors };
  }

  try {
    validateNonEmptyString(preset, 'preset');
  } catch (err) {
    fail(err instanceof RangeError ? RangeError : TypeError, err.message);
  }

  try {
    validateNonEmptyString(testEnvironment, 'testEnvironment');
  } catch (err) {
    fail(err instanceof RangeError ? RangeError : TypeError, err.message);
  }

  try {
    validateAndDeduplicateStringArray(roots, 'roots');
  } catch (err) {
    fail(err instanceof RangeError ? RangeError : TypeError, err.message);
  }

  try {
    validateAndDeduplicateStringArray(testMatch, 'testMatch');
  } catch (err) {
    fail(err instanceof RangeError ? RangeError : TypeError, err.message);
  }

  try {
    validateAndDeduplicateStringArray(collectCoverageFrom, 'collectCoverageFrom');
  } catch (err) {
    fail(err instanceof RangeError ? RangeError : TypeError, err.message);
  }

  if (
    !coverageThreshold ||
    typeof coverageThreshold !== 'object' ||
    Array.isArray(coverageThreshold)
  ) {
    fail(TypeError, 'coverageThreshold must be a non-null object');
  } else {
    const globalThresholds = coverageThreshold.global;
    if (!globalThresholds || typeof globalThresholds !== 'object' || Array.isArray(globalThresholds)) {
      fail(TypeError, 'coverageThreshold.global must be a non-null object');
    } else {
      for (const metric of DEFAULT_COVERAGE_METRICS) {
        let val;
        try {
          val = globalThresholds[metric];
        } catch {
          val = undefined;
        }
        try {
          validateThreshold(val, metric);
        } catch (err) {
          fail(err instanceof RangeError ? RangeError : TypeError, err.message);
        }
      }
    }
  }

  // Optional testRegex validation
  if (testRegex !== undefined) {
    const regexPatterns = Array.isArray(testRegex) ? testRegex : [testRegex];
    for (const pattern of regexPatterns) {
      if (!isValidRegexPattern(pattern)) {
        fail(RangeError, `Invalid testRegex pattern: ${pattern}`);
      }
    }
  }

  // Optional testPathIgnorePatterns validation
  if (testPathIgnorePatterns !== undefined) {
    if (!Array.isArray(testPathIgnorePatterns)) {
      fail(TypeError, 'testPathIgnorePatterns must be an array of regex strings');
    } else {
      for (const pattern of testPathIgnorePatterns) {
        if (!isValidRegexPattern(pattern)) {
          fail(RangeError, `Invalid testPathIgnorePatterns pattern: ${pattern}`);
        }
      }
    }
  }

  if (throwOnError) {
    return true;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Factory function to create an isolated, validated Jest configuration.
 * Safe for retries, concurrency, and partial failure recovery.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {Record<string, unknown>}
 */
function createJestConfig(overrides = {}) {
  if (overrides === null || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new TypeError(
      `Overrides must be a non-null object, received: ${
        overrides === null ? 'null' : Array.isArray(overrides) ? 'array' : typeof overrides
      }`
    );
  }

  const preset = overrides.preset !== undefined
    ? validateNonEmptyString(overrides.preset, 'preset')
    : DEFAULT_CONFIG.preset;

  const testEnvironment = overrides.testEnvironment !== undefined
    ? validateNonEmptyString(overrides.testEnvironment, 'testEnvironment')
    : DEFAULT_CONFIG.testEnvironment;

  const roots = overrides.roots !== undefined
    ? validateAndDeduplicateStringArray(overrides.roots, 'roots')
    : [...DEFAULT_CONFIG.roots];

  const testMatch = overrides.testMatch !== undefined
    ? validateAndDeduplicateStringArray(overrides.testMatch, 'testMatch')
    : [...DEFAULT_CONFIG.testMatch];

  const collectCoverageFrom = overrides.collectCoverageFrom !== undefined
    ? validateAndDeduplicateStringArray(overrides.collectCoverageFrom, 'collectCoverageFrom')
    : [...DEFAULT_CONFIG.collectCoverageFrom];

  let mergedGlobalThresholds = { ...DEFAULT_CONFIG.coverageThreshold.global };
  if (overrides.coverageThreshold !== undefined) {
    if (
      overrides.coverageThreshold === null ||
      typeof overrides.coverageThreshold !== 'object' ||
      Array.isArray(overrides.coverageThreshold)
    ) {
      throw new TypeError('coverageThreshold override must be a non-null object');
    }

    if (overrides.coverageThreshold.global !== undefined) {
      const customGlobal = overrides.coverageThreshold.global;
      if (customGlobal === null || typeof customGlobal !== 'object' || Array.isArray(customGlobal)) {
        throw new TypeError('coverageThreshold.global override must be a non-null object');
      }

      for (const [key, value] of Object.entries(customGlobal)) {
        if (!DEFAULT_COVERAGE_METRICS.includes(key)) {
          throw new RangeError(
            `Unknown coverage metric '${key}'. Supported metrics: ${DEFAULT_COVERAGE_METRICS.join(', ')}`
          );
        }
        mergedGlobalThresholds[key] = validateThreshold(value, key);
      }
    }
  }

  // Ensure all required metrics are validated
  for (const metric of DEFAULT_COVERAGE_METRICS) {
    validateThreshold(mergedGlobalThresholds[metric], metric);
  }

  const mergedCoverageThreshold = {
    global: mergedGlobalThresholds,
  };
  if (
    overrides.coverageThreshold !== undefined &&
    overrides.coverageThreshold !== null &&
    typeof overrides.coverageThreshold === 'object' &&
    !Array.isArray(overrides.coverageThreshold)
  ) {
    for (const [key, val] of Object.entries(overrides.coverageThreshold)) {
      if (key !== 'global' && val !== undefined) {
        mergedCoverageThreshold[key] = val;
      }
    }
  }

  const result = {
    preset,
    testEnvironment,
    roots,
    testMatch,
    collectCoverageFrom,
    coverageThreshold: mergedCoverageThreshold,
  };

  // Preserve any additional top-level overrides (e.g. transform, testTimeout, verbose, testRegex, etc.)
  for (const [key, val] of Object.entries(overrides)) {
    if (!(key in result)) {
      result[key] = val;
    }
  }

  validateJestConfig(result);
  return result;
}

/**
 * Build and resolve a Jest configuration with safe state-transition and recovery.
 * Recovers gracefully to defaults if overrides are corrupted, partial, or out-of-bounds.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {Record<string, unknown>}
 */
function resolveJestConfig(overrides = {}) {
  const baseDefaults = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: [...DEFAULT_ROOTS],
    testMatch: [...DEFAULT_TEST_MATCH],
    collectCoverageFrom: [...DEFAULT_COLLECT_COVERAGE_FROM],
    coverageThreshold: {
      global: { ...DEFAULT_GLOBAL_THRESHOLDS },
    },
  };

  if (typeof overrides !== 'object' || overrides === null || Array.isArray(overrides)) {
    return freezeConfig(baseDefaults);
  }

  let candidatePreset;
  try { candidatePreset = overrides.preset; } catch {}
  let candidateEnv;
  try { candidateEnv = overrides.testEnvironment; } catch {}
  let candidateRoots;
  try { candidateRoots = overrides.roots; } catch {}
  let candidateMatch;
  try { candidateMatch = overrides.testMatch; } catch {}
  let candidateCoverage;
  try { candidateCoverage = overrides.collectCoverageFrom; } catch {}
  let candidateThreshold;
  try { candidateThreshold = overrides.coverageThreshold; } catch {}
  let candidateRegex;
  try { candidateRegex = overrides.testRegex; } catch {}
  let candidateIgnore;
  try { candidateIgnore = overrides.testPathIgnorePatterns; } catch {}

  // Resolve preset
  const preset =
    typeof candidatePreset === 'string' && candidatePreset.trim().length > 0
      ? candidatePreset.trim()
      : baseDefaults.preset;

  // Resolve testEnvironment
  const trimmedEnv = typeof candidateEnv === 'string' ? candidateEnv.trim() : candidateEnv;
  const testEnvironment =
    VALID_TEST_ENVIRONMENTS.includes(trimmedEnv)
      ? trimmedEnv
      : baseDefaults.testEnvironment;

  // Resolve roots
  let roots = baseDefaults.roots;
  if (Array.isArray(candidateRoots) && candidateRoots.length > 0) {
    try {
      const seen = new Set();
      const validRoots = [];
      for (const r of candidateRoots) {
        if (typeof r === 'string') {
          const trimmed = r.trim();
          if (trimmed.length > 0 && !seen.has(trimmed)) {
            seen.add(trimmed);
            validRoots.push(trimmed);
          }
        }
      }
      if (validRoots.length > 0) {
        roots = validRoots;
      }
    } catch {
      roots = baseDefaults.roots;
    }
  }

  // Resolve testMatch
  let testMatch = baseDefaults.testMatch;
  if (Array.isArray(candidateMatch) && candidateMatch.length > 0) {
    try {
      const seen = new Set();
      const validMatch = [];
      for (const m of candidateMatch) {
        if (typeof m === 'string') {
          const trimmed = m.trim();
          if (trimmed.length > 0 && isValidPatternString(trimmed) && !seen.has(trimmed)) {
            seen.add(trimmed);
            validMatch.push(trimmed);
          }
        }
      }
      if (validMatch.length > 0) {
        testMatch = validMatch;
      }
    } catch {
      testMatch = baseDefaults.testMatch;
    }
  }

  // Resolve collectCoverageFrom
  let collectCoverageFrom = baseDefaults.collectCoverageFrom;
  if (Array.isArray(candidateCoverage) && candidateCoverage.length > 0) {
    try {
      const seen = new Set();
      const validCoverage = [];
      for (const c of candidateCoverage) {
        if (typeof c === 'string') {
          const trimmed = c.trim();
          if (trimmed.length > 0 && isValidPatternString(trimmed) && !seen.has(trimmed)) {
            seen.add(trimmed);
            validCoverage.push(trimmed);
          }
        }
      }
      if (validCoverage.length > 0) {
        collectCoverageFrom = validCoverage;
      }
    } catch {
      collectCoverageFrom = baseDefaults.collectCoverageFrom;
    }
  }

  // Resolve coverageThreshold with recovery for invalid threshold numbers
  const resolvedThresholds = { ...DEFAULT_GLOBAL_THRESHOLDS };
  const resolvedCoverageThreshold = {
    global: resolvedThresholds,
  };
  if (
    candidateThreshold &&
    typeof candidateThreshold === 'object' &&
    !Array.isArray(candidateThreshold)
  ) {
    try {
      if (candidateThreshold.global && typeof candidateThreshold.global === 'object') {
        const inputGlobal = candidateThreshold.global;
        for (const key of DEFAULT_COVERAGE_METRICS) {
          let val;
          try {
            val = inputGlobal[key];
          } catch {
            val = undefined;
          }
          if (isValidThresholdValue(val)) {
            resolvedThresholds[key] = val;
          }
        }
      }
      const thresholdKeys = Object.getOwnPropertyNames(candidateThreshold);
      for (const key of thresholdKeys) {
        if (key === 'global') continue;
        let val;
        try {
          val = candidateThreshold[key];
        } catch {
          continue;
        }
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          const valRes = validateCoverageThreshold(val);
          if (valRes.isValid) {
            resolvedCoverageThreshold[key] = { ...val };
          }
        }
      }
    } catch {
      // Use defaults on error
    }
  }

  const resolved = {
    preset,
    testEnvironment,
    roots,
    testMatch,
    collectCoverageFrom,
    coverageThreshold: resolvedCoverageThreshold,
  };

  // Optional regex-based properties
  if (Array.isArray(candidateRegex) && candidateRegex.length > 0) {
    const valid = candidateRegex.filter((r) => isValidRegexPattern(r));
    if (valid.length > 0) resolved.testRegex = valid;
  } else if ((typeof candidateRegex === 'string' || candidateRegex instanceof RegExp) && isValidRegexPattern(candidateRegex)) {
    resolved.testRegex = candidateRegex;
  }

  if (Array.isArray(candidateIgnore) && candidateIgnore.length > 0) {
    const valid = candidateIgnore.filter((p) => isValidRegexPattern(p));
    if (valid.length > 0) resolved.testPathIgnorePatterns = valid;
  }

  // Preserve valid additional top-level overrides safely without prototype pollution
  const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);
  try {
    const overrideKeys = Object.getOwnPropertyNames(overrides);
    for (const key of overrideKeys) {
      if (!(key in resolved) && !dangerousKeys.has(key)) {
        try {
          resolved[key] = overrides[key];
        } catch {}
      }
    }
  } catch {}

  return freezeConfig(resolved);
}

/**
 * Transition configuration coverage threshold to new values with invariant validation.
 * If transition fails invariant validation, returns recovered current configuration without crashing.
 *
 * @param {unknown} currentConfig
 * @param {unknown} targetThresholds
 * @returns {Record<string, unknown>}
 */
function transitionCoverageThreshold(currentConfig, targetThresholds) {
  let safeCurrent;
  try {
    safeCurrent = validateJestConfig(currentConfig, { throwOnError: false }).isValid
      ? currentConfig
      : resolveJestConfig();
  } catch {
    safeCurrent = resolveJestConfig();
  }

  const validation = validateCoverageThreshold(targetThresholds);
  if (!validation.isValid) {
    return safeCurrent;
  }

  return resolveJestConfig({
    ...safeCurrent,
    coverageThreshold: {
      global: targetThresholds,
    },
  });
}

function freezeConfig(cfg) {
  if (Array.isArray(cfg.roots)) Object.freeze(cfg.roots);
  if (Array.isArray(cfg.testMatch)) Object.freeze(cfg.testMatch);
  if (Array.isArray(cfg.testRegex)) Object.freeze(cfg.testRegex);
  if (Array.isArray(cfg.testPathIgnorePatterns)) Object.freeze(cfg.testPathIgnorePatterns);
  if (Array.isArray(cfg.collectCoverageFrom)) Object.freeze(cfg.collectCoverageFrom);
  if (cfg.coverageThreshold && typeof cfg.coverageThreshold === 'object') {
    for (const group of Object.values(cfg.coverageThreshold)) {
      if (group && typeof group === 'object') {
        Object.freeze(group);
      }
    }
    Object.freeze(cfg.coverageThreshold);
  }
  return Object.freeze(cfg);
}

/**
 * Root export function. When Jest loads this file, it invokes this function and receives
 * a clean config object containing only valid Jest configuration options.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {Record<string, unknown>}
 */
function getJestConfig(overrides = {}) {
  return createJestConfig(overrides);
}

// Attach default properties for backward compatibility with object consumers
getJestConfig.preset = DEFAULT_CONFIG.preset;
getJestConfig.testEnvironment = DEFAULT_CONFIG.testEnvironment;
getJestConfig.roots = DEFAULT_CONFIG.roots;
getJestConfig.testMatch = DEFAULT_CONFIG.testMatch;
getJestConfig.collectCoverageFrom = DEFAULT_CONFIG.collectCoverageFrom;
getJestConfig.coverageThreshold = DEFAULT_CONFIG.coverageThreshold;

// CJS & ESM interoperability
getJestConfig.default = getJestConfig;

// Export named factories, validators, and constants
getJestConfig.createJestConfig = createJestConfig;
getJestConfig.getJestConfig = getJestConfig;
getJestConfig.validateJestConfig = validateJestConfig;
getJestConfig.validateThreshold = validateThreshold;
getJestConfig.validateAndDeduplicateStringArray = validateAndDeduplicateStringArray;
getJestConfig.validateNonEmptyString = validateNonEmptyString;
getJestConfig.DEFAULT_CONFIG = DEFAULT_CONFIG;
getJestConfig.DEFAULT_COVERAGE_METRICS = DEFAULT_COVERAGE_METRICS;

getJestConfig.MIN_COVERAGE_THRESHOLD = MIN_COVERAGE_THRESHOLD;
getJestConfig.MAX_COVERAGE_THRESHOLD = MAX_COVERAGE_THRESHOLD;
getJestConfig.VALID_TEST_ENVIRONMENTS = VALID_TEST_ENVIRONMENTS;
getJestConfig.DEFAULT_COVERAGE_THRESHOLD = DEFAULT_GLOBAL_THRESHOLDS;
getJestConfig.DEFAULT_ROOTS = DEFAULT_ROOTS;
getJestConfig.DEFAULT_TEST_MATCH = DEFAULT_TEST_MATCH;
getJestConfig.DEFAULT_COLLECT_COVERAGE_FROM = DEFAULT_COLLECT_COVERAGE_FROM;
getJestConfig.DEFAULT_JEST_CONFIG = DEFAULT_CONFIG;
getJestConfig.isValidThresholdValue = isValidThresholdValue;
getJestConfig.validateCoverageThreshold = validateCoverageThreshold;
getJestConfig.isValidPatternString = isValidPatternString;
getJestConfig.isValidRegexPattern = isValidRegexPattern;
getJestConfig.resolveJestConfig = resolveJestConfig;
getJestConfig.transitionCoverageThreshold = transitionCoverageThreshold;
getJestConfig.__esModule = true;

Object.freeze(getJestConfig);

module.exports = getJestConfig;
