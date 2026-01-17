/**
 * Error suppression utility for expected browser errors
 * Suppresses CORS errors, third-party script errors, and other expected issues
 */

export interface ErrorSuppressor {
  start: () => void;
  stop: () => void;
}

export const createErrorSuppressor = (): ErrorSuppressor => {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const suppressedPatterns = [
    'CORS policy',
    'Access-Control-Allow-Origin',
    'has been blocked by CORS',
    'from origin',
    'net::ERR_FAILED',
    'SecurityError',
    'Blocked a frame',
    'cross-origin',
    'Failed to read',
    'Location',
    'GTM',
    'gtm.js',
    'Braze',
    'braze',
    'ERR_BLOCKED_BY_CLIENT',
    'Violation',
    'setTimeout',
    'ssllabs.com',
    'api.ssllabs.com',
    'Failed to load resource',
    '429 (Too Many Requests)',
    'generativelanguage.googleapis.com',
    '404 (Not Found)',
    'undefined:1',
    'cdn.tailwindcss.com',
  ];
  
  const suppress = (...args: any[]) => {
    const message = args.join(' ');
    if (suppressedPatterns.some(pattern => message.includes(pattern))) {
      return; // Suppress expected errors
    }
    originalError.apply(console, args);
  };
  
  const suppressWarn = (...args: any[]) => {
    const message = args.join(' ');
    if (suppressedPatterns.some(pattern => message.includes(pattern))) {
      return; // Suppress expected warnings
    }
    originalWarn.apply(console, args);
  };
  
  return {
    start: () => {
      console.error = suppress;
      console.warn = suppressWarn;
    },
    stop: () => {
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
};

/**
 * Global error handler for uncaught SecurityErrors from iframes
 */
export const setupGlobalErrorHandlers = () => {
  const originalErrorHandler = window.onerror;
  const originalUnhandledRejection = window.onunhandledrejection;
  
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = String(message);
    if (msg.includes('SecurityError') || 
        msg.includes('Blocked a frame') ||
        msg.includes('cross-origin') ||
        msg.includes('Location') ||
        msg.includes('href') ||
        msg.includes('CORS') ||
        msg.includes('Access-Control-Allow-Origin') ||
        (source && String(source).includes('ssllabs.com')) ||
        (source && String(source).includes('cdn.tailwindcss.com'))) {
      return true; // Suppress error
    }
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    return false;
  };
  
  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const reason = String(event.reason);
    if (reason.includes('CORS') || 
        reason.includes('SecurityError') ||
        reason.includes('Access-Control-Allow-Origin') ||
        reason.includes('CORS_BLOCKED') ||
        reason.includes('429') ||
        reason.includes('Rate limit')) {
      event.preventDefault(); // Suppress rejection
      return;
    }
    if (originalUnhandledRejection) {
      originalUnhandledRejection.call(window, event);
    }
  };
  
  return () => {
    window.onerror = originalErrorHandler;
    window.onunhandledrejection = originalUnhandledRejection;
  };
};
