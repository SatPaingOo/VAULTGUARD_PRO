/**
 * URL Validation and Pre-flight Checks
 * Validates URL format and checks DNS resolution. Does not fetch the target from the
 * browser (avoids CORS blocking). Non-existent domains are still caught via DNS.
 */

export interface ValidationResult {
  isValid: boolean;
  isReachable: boolean;
  error?: string;
  errorType?: 'invalid_format' | 'dns_failed' | 'connection_failed' | 'timeout' | 'unknown';
  details?: {
    domain?: string;
    ip?: string | null;
    statusCode?: number;
  };
}

/**
 * Pre-flight check: Validates URL format and checks if website is reachable
 */
export const validateAndCheckUrl = async (url: string): Promise<ValidationResult> => {
  // Step 1: Format validation
  let targetUrl: string;
  let domain: string;

  try {
    // Try parsing as-is
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          isValid: false,
          isReachable: false,
          error: 'Invalid protocol. Only HTTP and HTTPS are supported.',
          errorType: 'invalid_format'
        };
      }
      targetUrl = url;
      domain = parsed.hostname;
    } catch {
      // Try with https:// prefix
      const parsed = new URL(`https://${url}`);
      targetUrl = `https://${url}`;
      domain = parsed.hostname;
    }

    // Basic domain validation
    if (!domain || !domain.includes('.') || domain.length < 3) {
      return {
        isValid: false,
        isReachable: false,
        error: 'Invalid domain format. Please enter a valid website URL.',
        errorType: 'invalid_format'
      };
    }

    // Check for localhost or private IPs (optional - can be allowed)
    if (domain === 'localhost' || domain.startsWith('127.') || domain.startsWith('192.168.')) {
      // Allow localhost for development
    }

  } catch (error) {
    return {
      isValid: false,
      isReachable: false,
      error: 'Invalid URL format. Please enter a valid website URL (e.g., example.com or https://example.com)',
      errorType: 'invalid_format'
    };
  }

  // Step 2: DNS Resolution Check
  let dnsResolved = false;
  let ip: string | null = null;

  try {
    const dnsResponse = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, {
      mode: 'cors',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (dnsResponse.ok) {
      const dnsData = await dnsResponse.json();
      if (dnsData.Answer && dnsData.Answer.length > 0) {
        ip = dnsData.Answer[0].data;
        dnsResolved = true;
      }
    }
  } catch (error: any) {
    // DNS check failed - might be CORS or network issue; treat as unreachable
  }

  if (!dnsResolved && !ip) {
    return {
      isValid: true,
      isReachable: false,
      error: `DNS resolution failed for "${domain}". The domain may not exist or DNS servers cannot resolve it.`,
      errorType: 'dns_failed',
      details: { domain }
    };
  }

  // DNS resolved: consider reachable so scan can proceed (no browser fetch to target = no CORS block)
  return {
    isValid: true,
    isReachable: true,
    details: {
      domain,
      ip
    }
  };
};

/**
 * Quick format validation (without network checks)
 */
export const validateUrlFormat = (url: string): { isValid: boolean; normalizedUrl?: string; error?: string } => {
  const trimmed = url.trim();
  if (!trimmed) {
    return { isValid: false, error: 'URL cannot be empty' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'Only HTTP and HTTPS protocols are supported' };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { isValid: false, error: 'Invalid hostname format' };
    }
    return { isValid: true, normalizedUrl: trimmed };
  } catch {
    try {
      const parsed = new URL(`https://${trimmed}`);
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        return { isValid: false, error: 'Invalid hostname format' };
      }
      return { isValid: true, normalizedUrl: `https://${trimmed}` };
    } catch {
      return { isValid: false, error: 'Invalid URL format. Please enter a valid website URL' };
    }
  }
};
