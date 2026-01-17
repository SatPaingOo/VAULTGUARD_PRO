/**
 * Application Constants
 * Centralized constants to replace magic numbers throughout the codebase
 */

// AI Model Configuration
export const AI_CONSTANTS = {
  /** Thinking budget for DEEP tier (32K tokens) */
  DEEP_THINKING_BUDGET: 32768,
  
  /** Cooldown period between API calls (2.5 seconds) */
  API_COOLDOWN_MS: 2500,
  
  /** Base delay for rate limit retry (5 seconds) */
  RATE_LIMIT_BASE_DELAY_MS: 5000,
  
  /** Maximum retry attempts for API calls */
  MAX_RETRY_ATTEMPTS: 5,
  
  /** Jitter range for rate limit backoff (0-2000ms) */
  RATE_LIMIT_JITTER_MS: 2000,
} as const;

// Network Analysis Configuration
export const NETWORK_CONSTANTS = {
  /** SSL Labs API cache TTL (24 hours) */
  SSL_CACHE_TTL_MS: 24 * 60 * 60 * 1000,
  
  /** DNS cache TTL (1 hour) */
  DNS_CACHE_TTL_MS: 60 * 60 * 1000,
  
  /** Headers cache TTL (1 hour) */
  HEADERS_CACHE_TTL_MS: 60 * 60 * 1000,
  
  /** Iframe timeout for DOM extraction (10 seconds) */
  IFRAME_TIMEOUT_MS: 10000,
} as const;

// Probe Execution Configuration
export const PROBE_CONSTANTS = {
  /** Batch size for parallel probe execution */
  PROBE_BATCH_SIZE: 3,
  
  /** Delay between probe batches (1 second) */
  PROBE_BATCH_DELAY_MS: 1000,
} as const;

// API Key Validation
export const API_KEY_CONSTANTS = {
  /** Minimum API key length */
  MIN_KEY_LENGTH: 20,
  
  /** Minimum key length for basic validation */
  MIN_KEY_LENGTH_BASIC: 10,
} as const;

// UI Configuration
export const UI_CONSTANTS = {
  /** Animation duration for transitions (ms) */
  ANIMATION_DURATION_MS: 500,
  
  /** Debounce delay for input fields (ms) */
  INPUT_DEBOUNCE_MS: 300,
} as const;

// Scan Level Token Estimates
export const TOKEN_ESTIMATES = {
  FAST: { min: 8000, max: 10000 },
  STANDARD: { min: 25000, max: 35000 },
  DEEP: { min: 150000, max: 400000 },
} as const;

// Scan Level Time Estimates (seconds)
export const TIME_ESTIMATES = {
  FAST: 45,
  STANDARD: 120,
  DEEP: 300,
} as const;
