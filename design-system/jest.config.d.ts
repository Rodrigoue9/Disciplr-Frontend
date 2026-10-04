export interface CoverageThresholdGroup {
  branches: number;
  functions: number;
  lines: number;
  statements: number;
}

export interface CoverageThreshold {
  global: CoverageThresholdGroup;
  [key: string]: CoverageThresholdGroup;
}

export interface JestConfig {
  preset: string;
  testEnvironment: string;
  roots: readonly string[];
  testMatch: readonly string[];
  collectCoverageFrom: readonly string[];
  coverageThreshold: CoverageThreshold;
  [key: string]: unknown;
}

export const MIN_COVERAGE_THRESHOLD: number;
export const MAX_COVERAGE_THRESHOLD: number;
export const VALID_TEST_ENVIRONMENTS: readonly string[];
export const DEFAULT_COVERAGE_THRESHOLD: Readonly<CoverageThresholdGroup>;
export const DEFAULT_ROOTS: readonly string[];
export const DEFAULT_TEST_MATCH: readonly string[];
export const DEFAULT_COLLECT_COVERAGE_FROM: readonly string[];
export const DEFAULT_CONFIG: JestConfig;
export const DEFAULT_COVERAGE_METRICS: readonly string[];
export const DEFAULT_JEST_CONFIG: JestConfig;

export function validateThreshold(value: unknown, metric: string): number;
export function isValidThresholdValue(value: unknown): value is number;
export function validateAndDeduplicateStringArray(value: unknown, fieldName: string): string[];
export function validateNonEmptyString(value: unknown, fieldName: string): string;
export function isValidPatternString(pattern: unknown): pattern is string;
export function isValidRegexPattern(pattern: unknown): pattern is string | RegExp;
export function validateCoverageThreshold(thresholds: unknown): { isValid: boolean; errors: string[] };

export function validateJestConfig(config: unknown): true;
export function validateJestConfig(config: unknown, options: { throwOnError: false } | false): { isValid: boolean; errors: string[] };
export function validateJestConfig(config: unknown, options: { throwOnError?: true } | true): true;
export function validateJestConfig(
  config: unknown,
  options?: { throwOnError?: boolean } | boolean
): boolean | { isValid: boolean; errors: string[] };

export function createJestConfig(overrides?: Record<string, unknown>): JestConfig;
export function getJestConfig(overrides?: Record<string, unknown>): JestConfig;
export function resolveJestConfig(overrides?: unknown): JestConfig;
export function transitionCoverageThreshold(currentConfig: unknown, targetThresholds: unknown): JestConfig;

export interface JestConfigModule extends JestConfig {
  (overrides?: Record<string, unknown>): JestConfig;
  default: JestConfigModule;
  createJestConfig: typeof createJestConfig;
  getJestConfig: typeof getJestConfig;
  validateJestConfig: typeof validateJestConfig;
  validateThreshold: typeof validateThreshold;
  validateAndDeduplicateStringArray: typeof validateAndDeduplicateStringArray;
  validateNonEmptyString: typeof validateNonEmptyString;
  DEFAULT_CONFIG: JestConfig;
  DEFAULT_COVERAGE_METRICS: readonly string[];
  MIN_COVERAGE_THRESHOLD: number;
  MAX_COVERAGE_THRESHOLD: number;
  VALID_TEST_ENVIRONMENTS: readonly string[];
  DEFAULT_COVERAGE_THRESHOLD: Readonly<CoverageThresholdGroup>;
  DEFAULT_ROOTS: readonly string[];
  DEFAULT_TEST_MATCH: readonly string[];
  DEFAULT_COLLECT_COVERAGE_FROM: readonly string[];
  DEFAULT_JEST_CONFIG: JestConfig;
  isValidThresholdValue: typeof isValidThresholdValue;
  validateCoverageThreshold: typeof validateCoverageThreshold;
  isValidPatternString: typeof isValidPatternString;
  isValidRegexPattern: typeof isValidRegexPattern;
  resolveJestConfig: typeof resolveJestConfig;
  transitionCoverageThreshold: typeof transitionCoverageThreshold;
}

declare const config: JestConfigModule;
export default config;
