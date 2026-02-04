/**
 * Application Constants
 * Centralized constants to replace magic numbers throughout the codebase
 */

// AI Model Configuration
export const AI_CONSTANTS = {
  /** Thinking budget for DEEP tier (32K tokens) */
  DEEP_THINKING_BUDGET: 32768,
  
  /** Cooldown period between API calls (8 seconds - reduces 429/503 during scan) */
  API_COOLDOWN_MS: 8000,
  
  /** Base delay for rate limit / service unavailable retry (5 seconds) */
  RATE_LIMIT_BASE_DELAY_MS: 5000,
  
  /** Maximum retry attempts for API calls (3 = 4 total attempts for 429/503) */
  MAX_RETRY_ATTEMPTS: 3,
  
  /** Jitter range for rate limit backoff (0-2000ms) */
  RATE_LIMIT_JITTER_MS: 2000,
  
  /** Maximum length for recon intelligence substring (2000 chars) */
  MAX_RECON_INTEL_LENGTH: 2000,
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
  
  /** Maximum DOM characters for DEEP scan analysis */
  MAX_DOM_CHARS: 50000,
} as const;

// Probe Execution Configuration
export const PROBE_CONSTANTS = {
  /** Batch size for parallel probe execution */
  PROBE_BATCH_SIZE: 3,
  
  /** Delay between probe batches (1 second) */
  PROBE_BATCH_DELAY_MS: 1000,
} as const;

/** Common sensitive paths to probe (client-side only; no backend). Merged with AI-suggested probes. */
export const SENSITIVE_PROBE_PATHS: ReadonlyArray<{ method: 'GET'; endpoint: string; description: string; expectedBehavior: string }> = [
  { method: 'GET', endpoint: '/admin', description: 'Admin panel', expectedBehavior: '404 or 403 expected' },
  { method: 'GET', endpoint: '/wp-admin', description: 'WordPress admin', expectedBehavior: '404 or redirect' },
  { method: 'GET', endpoint: '/.env', description: 'Environment file', expectedBehavior: '404 or 403' },
  { method: 'GET', endpoint: '/api/debug', description: 'Debug API', expectedBehavior: '404 or 403' },
  { method: 'GET', endpoint: '/config', description: 'Config path', expectedBehavior: '404 or 403' },
  { method: 'GET', endpoint: '/backup', description: 'Backup path', expectedBehavior: '404 or 403' },
  { method: 'GET', endpoint: '/phpinfo.php', description: 'PHP info', expectedBehavior: '404 or 403' },
  { method: 'GET', endpoint: '/.git/config', description: 'Git config', expectedBehavior: '404 or 403' },
];

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
  FAST: 180,      // 3 minutes
  STANDARD: 300,  // 5 minutes
  DEEP: 600,      // 10 minutes
} as const;
