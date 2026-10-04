import defaultConfig, {
  MIN_COVERAGE_THRESHOLD,
  MAX_COVERAGE_THRESHOLD,
  VALID_TEST_ENVIRONMENTS,
  DEFAULT_COVERAGE_THRESHOLD,
  DEFAULT_ROOTS,
  DEFAULT_TEST_MATCH,
  DEFAULT_COLLECT_COVERAGE_FROM,
  DEFAULT_CONFIG,
  DEFAULT_COVERAGE_METRICS,
  DEFAULT_JEST_CONFIG,
  isValidThresholdValue,
  validateCoverageThreshold,
  isValidPatternString,
  isValidRegexPattern,
  validateJestConfig,
  resolveJestConfig,
  transitionCoverageThreshold,
  createJestConfig,
  getJestConfig,
  validateThreshold,
  validateAndDeduplicateStringArray,
  validateNonEmptyString,
} from '../jest.config.js';

describe('design-system/jest.config.js - State-Transition & Recovery Coverage', () => {
  // ── 1. Default Configuration & Structural Invariants ─────────────────────────

  describe('Default Configuration Invariants', () => {
    it('exports preset ts-jest', () => {
      expect(defaultConfig.preset).toBe('ts-jest');
    });

    it('exports testEnvironment as node', () => {
      expect(defaultConfig.testEnvironment).toBe('node');
      expect(VALID_TEST_ENVIRONMENTS).toContain(defaultConfig.testEnvironment);
    });

    it('exports roots targeting <rootDir>/src', () => {
      expect(defaultConfig.roots).toEqual(['<rootDir>/src']);
      expect(defaultConfig.roots).toEqual(DEFAULT_ROOTS);
    });

    it('exports standard testMatch glob patterns', () => {
      expect(defaultConfig.testMatch).toEqual([
        '**/__tests__/**/*.ts',
        '**/?(*.)+(spec|test).ts',
      ]);
      expect(defaultConfig.testMatch).toEqual(DEFAULT_TEST_MATCH);
    });

    it('exports collectCoverageFrom covering src while excluding tests and declaration files', () => {
      expect(defaultConfig.collectCoverageFrom).toEqual([
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
      ]);
      expect(defaultConfig.collectCoverageFrom).toEqual(DEFAULT_COLLECT_COVERAGE_FROM);
    });

    it('enforces 80% coverage threshold across branches, functions, lines, statements', () => {
      expect(defaultConfig.coverageThreshold.global).toEqual({
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      });
      expect(defaultConfig.coverageThreshold.global).toEqual(DEFAULT_COVERAGE_THRESHOLD);
    });

    it('passes full structural validation via validateJestConfig', () => {
      expect(validateJestConfig(defaultConfig)).toBe(true);
      const inspection = validateJestConfig(defaultConfig, { throwOnError: false });
      expect(inspection.isValid).toBe(true);
      expect(inspection.errors).toHaveLength(0);
    });

    it('enforces runtime immutability on exported config and sub-objects', () => {
      expect(Object.isFrozen(defaultConfig)).toBe(true);
      expect(Object.isFrozen(defaultConfig.roots)).toBe(true);
      expect(Object.isFrozen(defaultConfig.testMatch)).toBe(true);
      expect(Object.isFrozen(defaultConfig.collectCoverageFrom)).toBe(true);
      expect(Object.isFrozen(defaultConfig.coverageThreshold)).toBe(true);
      expect(Object.isFrozen(defaultConfig.coverageThreshold.global)).toBe(true);

      expect(() => {
        (defaultConfig as Record<string, unknown>).testEnvironment = 'jsdom';
      }).toThrow();
    });
  });

  // ── 2. Coverage Threshold Limits (0 <= threshold <= 100) ────────────────────

  describe('Coverage Threshold Limit Validations (0 <= threshold <= 100)', () => {
    it('accepts boundary limits 0 and 100', () => {
      expect(isValidThresholdValue(0)).toBe(true);
      expect(isValidThresholdValue(100)).toBe(true);
      expect(isValidThresholdValue(MIN_COVERAGE_THRESHOLD)).toBe(true);
      expect(isValidThresholdValue(MAX_COVERAGE_THRESHOLD)).toBe(true);
    });

    it('accepts valid floating and integer percentages between 0 and 100', () => {
      expect(isValidThresholdValue(0.1)).toBe(true);
      expect(isValidThresholdValue(50)).toBe(true);
      expect(isValidThresholdValue(80)).toBe(true);
      expect(isValidThresholdValue(99.9)).toBe(true);
    });

    it('rejects numbers strictly less than 0', () => {
      expect(isValidThresholdValue(-1)).toBe(false);
      expect(isValidThresholdValue(-0.01)).toBe(false);
      expect(isValidThresholdValue(-100)).toBe(false);
    });

    it('rejects numbers strictly greater than 100', () => {
      expect(isValidThresholdValue(100.1)).toBe(false);
      expect(isValidThresholdValue(101)).toBe(false);
      expect(isValidThresholdValue(500)).toBe(false);
    });

    it('rejects non-numeric and non-finite types (NaN, Infinity, strings, null, undefined)', () => {
      expect(isValidThresholdValue(NaN)).toBe(false);
      expect(isValidThresholdValue(Infinity)).toBe(false);
      expect(isValidThresholdValue(-Infinity)).toBe(false);
      expect(isValidThresholdValue('80')).toBe(false);
      expect(isValidThresholdValue(null)).toBe(false);
      expect(isValidThresholdValue(undefined)).toBe(false);
      expect(isValidThresholdValue({})).toBe(false);
      expect(isValidThresholdValue([])).toBe(false);
      expect(isValidThresholdValue(true)).toBe(false);
    });

    it('validateCoverageThreshold validates complete threshold maps', () => {
      const validThresholds = {
        branches: 75,
        functions: 85,
        lines: 90,
        statements: 80,
      };
      const result = validateCoverageThreshold(validThresholds);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validateCoverageThreshold reports errors for missing or invalid threshold keys', () => {
      const invalidThresholds = {
        branches: 120, // out of range
        functions: -5, // out of range
        lines: 'ninety', // wrong type
        // statements missing
      };
      const result = validateCoverageThreshold(invalidThresholds);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ── 3. Glob & Pattern Validation Invariants ──────────────────────────────────

  describe('Glob & Pattern Invariants', () => {
    it('validates proper testMatch glob patterns', () => {
      expect(isValidPatternString('**/__tests__/**/*.ts')).toBe(true);
      expect(isValidPatternString('**/?(*.)+(spec|test).ts')).toBe(true);
      expect(isValidPatternString('src/**/*.spec.ts')).toBe(true);
    });

    it('validates negative pattern globs in collectCoverageFrom', () => {
      expect(isValidPatternString('!src/**/*.d.ts')).toBe(true);
      expect(isValidPatternString('!src/**/__tests__/**')).toBe(true);
    });

    it('accepts glob patterns with escaped brackets and braces', () => {
      expect(isValidPatternString('src/\\[tokens\\]/**/*.ts')).toBe(true);
      expect(isValidPatternString('src/\\{components\\}/**/*.ts')).toBe(true);
      expect(isValidPatternString('src/\\(utils\\)/**/*.ts')).toBe(true);
    });

    it('rejects unbalanced or empty pattern strings', () => {
      expect(isValidPatternString('')).toBe(false);
      expect(isValidPatternString('   ')).toBe(false);
      expect(isValidPatternString(null)).toBe(false);
      expect(isValidPatternString(undefined)).toBe(false);
      expect(isValidPatternString('src/**/[a-z')).toBe(false);
      expect(isValidPatternString('src/**/{a,b')).toBe(false);
      expect(isValidPatternString('src/**/(a|b')).toBe(false);
      expect(isValidPatternString('src/**/]unopened')).toBe(false);
      expect(isValidPatternString('src/**/\\')).toBe(false);
    });

    it('validates compilable regex pattern strings via isValidRegexPattern', () => {
      expect(isValidRegexPattern('^src/.*\\.test\\.ts$')).toBe(true);
      expect(isValidRegexPattern('(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$')).toBe(true);
      expect(isValidRegexPattern('/node_modules/')).toBe(true);
      expect(isValidRegexPattern(/__tests__\/.*\.ts$/)).toBe(true);
    });

    it('rejects invalid or uncompilable regex patterns via isValidRegexPattern', () => {
      expect(isValidRegexPattern('')).toBe(false);
      expect(isValidRegexPattern('   ')).toBe(false);
      expect(isValidRegexPattern(null)).toBe(false);
      expect(isValidRegexPattern(undefined)).toBe(false);
      expect(isValidRegexPattern(12345)).toBe(false);

      // Malformed regex
      expect(isValidRegexPattern('[unclosed')).toBe(false);
      expect(isValidRegexPattern('(unclosed')).toBe(false);
      expect(isValidRegexPattern('*quantifier-first')).toBe(false);
    });

    it('validateJestConfig verifies optional testRegex and testPathIgnorePatterns', () => {
      const validWithRegex = {
        ...defaultConfig,
        testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
        testPathIgnorePatterns: ['/node_modules/', '/dist/'],
      };
      expect(validateJestConfig(validWithRegex)).toBe(true);
      const validInspection = validateJestConfig(validWithRegex, { throwOnError: false });
      expect(validInspection.isValid).toBe(true);

      const validWithRegExpObj = {
        ...defaultConfig,
        testRegex: /__tests__\/.*\.test\.ts$/,
      };
      expect(validateJestConfig(validWithRegExpObj)).toBe(true);

      const invalidWithRegex = {
        ...defaultConfig,
        testRegex: '[invalid',
        testPathIgnorePatterns: ['*bad-regex'],
      };
      expect(() => validateJestConfig(invalidWithRegex)).toThrow(RangeError);

      const res = validateJestConfig(invalidWithRegex, { throwOnError: false });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e: string) => e.includes('testRegex'))).toBe(true);
      expect(res.errors.some((e: string) => e.includes('testPathIgnorePatterns'))).toBe(true);
    });
  });

  // ── 4. State Transitions & Recovery (resolveJestConfig) ───────────────────────

  describe('State Transitions & Deterministic Recovery', () => {
    it('returns default config when overrides are undefined, null, or empty', () => {
      const resolvedEmpty = resolveJestConfig();
      expect(resolvedEmpty).toEqual(DEFAULT_JEST_CONFIG);

      const resolvedNull = resolveJestConfig(null);
      expect(resolvedNull).toEqual(DEFAULT_JEST_CONFIG);

      const resolvedNonObject = resolveJestConfig('invalid' as unknown as Record<string, unknown>);
      expect(resolvedNonObject).toEqual(DEFAULT_JEST_CONFIG);
    });

    it('allows valid partial overrides while preserving safe defaults', () => {
      const custom = resolveJestConfig({
        testEnvironment: 'jsdom',
        coverageThreshold: {
          global: {
            branches: 95,
            functions: 85,
            lines: 90,
            statements: 90,
          },
        },
      });

      expect(custom.testEnvironment).toBe('jsdom');
      expect(custom.preset).toBe('ts-jest');
      expect(custom.roots).toEqual(DEFAULT_ROOTS);
      expect(custom.coverageThreshold.global.branches).toBe(95);
      expect(custom.coverageThreshold.global.functions).toBe(85);
      expect(custom.coverageThreshold.global.lines).toBe(90);
      expect(custom.coverageThreshold.global.statements).toBe(90);
    });

    it('recovers safely to default coverage thresholds when invalid threshold values are provided', () => {
      const corruptThresholds = resolveJestConfig({
        coverageThreshold: {
          global: {
            branches: -10, // Invalid: < 0
            functions: 150, // Invalid: > 100
            lines: NaN, // Invalid: NaN
            statements: 85, // Valid
          },
        },
      });

      expect(corruptThresholds.coverageThreshold.global.branches).toBe(80);
      expect(corruptThresholds.coverageThreshold.global.functions).toBe(80);
      expect(corruptThresholds.coverageThreshold.global.lines).toBe(80);
      expect(corruptThresholds.coverageThreshold.global.statements).toBe(85);
    });

    it('recovers safely when corrupted patterns or roots are provided', () => {
      const corruptGlobs = resolveJestConfig({
        roots: ['', '   '],
        testMatch: ['unclosed-[bracket', 12345 as unknown as string],
        collectCoverageFrom: ['{unclosed-brace'],
      });

      expect(corruptGlobs.roots).toEqual(DEFAULT_ROOTS);
      expect(corruptGlobs.testMatch).toEqual(DEFAULT_TEST_MATCH);
      expect(corruptGlobs.collectCoverageFrom).toEqual(DEFAULT_COLLECT_COVERAGE_FROM);
    });

    it('transitionCoverageThreshold transitions to valid state or recovers to current config', () => {
      const current = resolveJestConfig();

      const validTarget = {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      };
      const transitioned = transitionCoverageThreshold(current, validTarget);
      expect(transitioned.coverageThreshold.global).toEqual(validTarget);

      const invalidTarget = {
        branches: 150,
        functions: 90,
        lines: 90,
        statements: 90,
      };
      const recovered = transitionCoverageThreshold(transitioned, invalidTarget);
      expect(recovered.coverageThreshold.global).toEqual(validTarget);
    });

    it('recovers safely when overrides contain hostile throwing getters', () => {
      const hostileOverrides = {
        get preset(): string {
          throw new Error('Hostile preset getter');
        },
        get testEnvironment(): string {
          throw new Error('Hostile testEnvironment getter');
        },
        get roots(): string[] {
          throw new Error('Hostile roots getter');
        },
        get coverageThreshold(): { global: Record<string, number> } {
          throw new Error('Hostile coverageThreshold getter');
        },
      };

      expect(() => resolveJestConfig(hostileOverrides)).not.toThrow();
      const resolved = resolveJestConfig(hostileOverrides);
      expect(resolved.preset).toBe('ts-jest');
      expect(resolved.testEnvironment).toBe('node');
      expect(resolved.roots).toEqual(DEFAULT_ROOTS);
      expect(resolved.coverageThreshold.global).toEqual(DEFAULT_COVERAGE_THRESHOLD);
    });

    it('transitionCoverageThreshold recovers safely when targetThresholds has throwing getters', () => {
      const hostileTarget = {
        get branches() {
          throw new Error('Throwing branches getter');
        },
        functions: 85,
        lines: 85,
        statements: 85,
      };

      const result = transitionCoverageThreshold(defaultConfig, hostileTarget);
      expect(result.coverageThreshold.global).toEqual(DEFAULT_COVERAGE_THRESHOLD);
    });

    it('is immune to prototype pollution in overrides', () => {
      const payload = JSON.parse('{"__proto__":{"polluted":true,"preset":"malicious"}}');
      const resolved = resolveJestConfig(payload);
      expect(resolved.preset).toBe('ts-jest');
      // @ts-expect-error - checking Object prototype pollution
      expect(Object.prototype.polluted).toBeUndefined();
    });

    it('is idempotent and concurrent-safe across multiple parallel resolutions', async () => {
      const parallelTasks = Array.from({ length: 24 }, (_, i) =>
        Promise.resolve().then(() =>
          resolveJestConfig({
            coverageThreshold: {
              global: {
                branches: 70 + (i % 10),
                functions: 80,
                lines: 80,
                statements: 80,
              },
            },
          })
        )
      );

      const results = await Promise.all(parallelTasks);
      expect(results).toHaveLength(24);
      for (let i = 0; i < results.length; i++) {
        expect(results[i].coverageThreshold.global.branches).toBe(70 + (i % 10));
        expect(Object.isFrozen(results[i])).toBe(true);
      }
    });
  });

  // ── 5. Unified Upstream Factories & Constants ─────────────────────────────────

  describe('Unified Upstream Factories & Constants', () => {
    it('exports callable module, createJestConfig, and getJestConfig returning isolated configs', () => {
      expect(typeof defaultConfig).toBe('function');
      const invoked = (defaultConfig as () => typeof DEFAULT_CONFIG)();
      const created = createJestConfig();
      const got = getJestConfig();

      expect(invoked).toEqual(DEFAULT_CONFIG);
      expect(created).toEqual(DEFAULT_CONFIG);
      expect(got).toEqual(DEFAULT_CONFIG);

      // Verify mutation isolation
      (created.roots as string[]).push('<rootDir>/custom');
      expect(getJestConfig().roots).toEqual(['<rootDir>/src']);
    });

    it('exports DEFAULT_CONFIG, DEFAULT_COVERAGE_METRICS, and DEFAULT_JEST_CONFIG', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(DEFAULT_JEST_CONFIG).toEqual(DEFAULT_CONFIG);
      expect(DEFAULT_COVERAGE_METRICS).toEqual(['branches', 'functions', 'lines', 'statements']);
    });

    it('exports validateThreshold with strict type and range invariants', () => {
      expect(validateThreshold(80, 'lines')).toBe(80);
      expect(validateThreshold(0, 'branches')).toBe(0);
      expect(validateThreshold(100, 'statements')).toBe(100);

      expect(() => validateThreshold(-1, 'branches')).toThrow(RangeError);
      expect(() => validateThreshold(101, 'lines')).toThrow(RangeError);
      expect(() => validateThreshold(NaN, 'functions')).toThrow(TypeError);
      expect(() => validateThreshold('80' as unknown as number, 'lines')).toThrow(TypeError);
    });

    it('exports validateAndDeduplicateStringArray with deduplication and trimming', () => {
      const input = ['<rootDir>/src', ' <rootDir>/src ', '<rootDir>/components'];
      const deduplicated = validateAndDeduplicateStringArray(input, 'roots');
      expect(deduplicated).toEqual(['<rootDir>/src', '<rootDir>/components']);

      expect(() => validateAndDeduplicateStringArray([], 'roots')).toThrow(RangeError);
      expect(() => validateAndDeduplicateStringArray('not-array' as unknown as string[], 'roots')).toThrow(TypeError);
      expect(() => validateAndDeduplicateStringArray(['   '], 'roots')).toThrow(RangeError);
    });

    it('exports validateNonEmptyString with string trimming and range enforcement', () => {
      expect(validateNonEmptyString('  node  ', 'testEnvironment')).toBe('node');
      expect(() => validateNonEmptyString('', 'preset')).toThrow(RangeError);
      expect(() => validateNonEmptyString('   ', 'preset')).toThrow(RangeError);
      expect(() => validateNonEmptyString(123 as unknown as string, 'preset')).toThrow(TypeError);
    });

    it('preserves custom top-level Jest configuration overrides and per-path thresholds', () => {
      const customSubPathThreshold = {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      };

      const created = createJestConfig({
        verbose: true,
        testTimeout: 5000,
        coverageThreshold: {
          global: { branches: 85 },
          '<rootDir>/src/components/': customSubPathThreshold,
        },
      });
      expect(created.verbose).toBe(true);
      expect(created.testTimeout).toBe(5000);
      expect((created.coverageThreshold as Record<string, unknown>)['<rootDir>/src/components/']).toEqual(customSubPathThreshold);

      const resolved = resolveJestConfig({
        verbose: true,
        testTimeout: 5000,
        coverageThreshold: {
          global: { branches: 85 },
          '<rootDir>/src/components/': customSubPathThreshold,
        },
      });
      expect(resolved.verbose).toBe(true);
      expect(resolved.testTimeout).toBe(5000);
      expect((resolved.coverageThreshold as Record<string, unknown>)['<rootDir>/src/components/']).toEqual(customSubPathThreshold);
      expect(Object.isFrozen((resolved.coverageThreshold as Record<string, unknown>)['<rootDir>/src/components/'])).toBe(true);
    });
  });
});
