/**
 * Frontend-only network analysis using browser APIs and public services
 * No backend server required
 */

import { createErrorSuppressor } from './errorSuppression';

/** Parsed cookie flags from Set-Cookie (HttpOnly, Secure, SameSite). */
export interface CookieDetail {
  name: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string | null;
}

export interface HeaderAnalysis {
  securityHeaders: {
    'X-Frame-Options': string | null;
    'X-Content-Type-Options': string | null;
    'Strict-Transport-Security': string | null;
    'Content-Security-Policy': string | null;
    'X-XSS-Protection': string | null;
    'Referrer-Policy': string | null;
    'Permissions-Policy': string | null;
    'Feature-Policy': string | null;
    'Cross-Origin-Embedder-Policy': string | null;
    'Cross-Origin-Opener-Policy': string | null;
  };
  server: string | null;
  poweredBy: string | null;
  cookies: string[];
  /** Parsed cookie security flags (HttpOnly, Secure, SameSite) when Set-Cookie is available. */
  cookieDetails: CookieDetail[];
  cors: {
    allowed: boolean;
    credentials: boolean;
  };
}

export interface SSLInfo {
  valid: boolean;
  issuer: string | null;
  expiry: string | null;
  protocol: string | null;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | 'Unknown';
}

export interface DNSInfo {
  ip: string | null;
  records: any[];
  /** IPv6 addresses from AAAA lookup (when available). */
  aaaa?: string[];
  /** TXT record values (when available). */
  txt?: string[];
}

export interface SecurityHeaderTest {
  missing: string[];
  weak: string[];
  score: number;
}

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; expiry: number }>();

const getCached = (key: string): any | null => {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key: string, data: any, ttlMs: number) => {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
};

/** Expert mode: custom headers and cookies for authenticated targets. */
export interface ExpertFetchOptions {
  headers?: Record<string, string>;
  cookies?: string;
}

function buildRequestHeaders(options?: ExpertFetchOptions): HeadersInit {
  const h: Record<string, string> = {};
  if (options?.headers) Object.assign(h, options.headers);
  if (options?.cookies) h['Cookie'] = options.cookies;
  return h;
}

/** Parse Set-Cookie header value(s) for security flags (HttpOnly, Secure, SameSite). */
function parseSetCookieHeader(headerValue: string | null): CookieDetail[] {
  if (!headerValue || typeof headerValue !== 'string') return [];
  const results: CookieDetail[] = [];
  try {
    const parts = headerValue.split(/;\s*/);
    const namePart = parts[0]?.trim();
    if (!namePart) return [];
    const eq = namePart.indexOf('=');
    const name = eq >= 0 ? namePart.slice(0, eq).trim() : namePart;
    const detail: CookieDetail = { name: name || 'unknown' };
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i].trim().toLowerCase();
      if (p === 'httponly') detail.httpOnly = true;
      else if (p === 'secure') detail.secure = true;
      else if (p.startsWith('samesite=')) detail.sameSite = parts[i].split('=')[1]?.trim() || null;
    }
    results.push(detail);
  } catch {
    // ignore parse errors
  }
  return results;
}

export class FrontendNetworkAnalysis {
  /**
   * Analyze HTTP headers from actual response.
   * @param options - Optional expert headers/cookies for authenticated targets.
   */
  async analyzeHeaders(targetUrl: string, options?: ExpertFetchOptions): Promise<HeaderAnalysis> {
    const cacheKey = `headers_${targetUrl}_${options?.cookies ? 'auth' : 'anon'}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const suppressor = createErrorSuppressor();
    suppressor.start();

    try {
      const requestHeaders = buildRequestHeaders(options);
      const response = await fetch(targetUrl, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit',
        ...(Object.keys(requestHeaders).length > 0 ? { headers: requestHeaders } : {}),
      });

      const setCookie = response.headers.get('Set-Cookie');
      const headers: HeaderAnalysis = {
        securityHeaders: {
          'X-Frame-Options': response.headers.get('X-Frame-Options'),
          'X-Content-Type-Options': response.headers.get('X-Content-Type-Options'),
          'Strict-Transport-Security': response.headers.get('Strict-Transport-Security'),
          'Content-Security-Policy': response.headers.get('Content-Security-Policy'),
          'X-XSS-Protection': response.headers.get('X-XSS-Protection'),
          'Referrer-Policy': response.headers.get('Referrer-Policy'),
          'Permissions-Policy': response.headers.get('Permissions-Policy'),
          'Feature-Policy': response.headers.get('Feature-Policy'),
          'Cross-Origin-Embedder-Policy': response.headers.get('Cross-Origin-Embedder-Policy'),
          'Cross-Origin-Opener-Policy': response.headers.get('Cross-Origin-Opener-Policy'),
        },
        server: response.headers.get('Server'),
        poweredBy: response.headers.get('X-Powered-By'),
        cookies: setCookie ? [setCookie] : [],
        cookieDetails: parseSetCookieHeader(setCookie),
        cors: {
          allowed: true,
          credentials: response.headers.get('Access-Control-Allow-Credentials') === 'true',
        },
      };

      setCache(cacheKey, headers, 3600000); // Cache for 1 hour
      suppressor.stop();
      return headers;
    } catch (error: any) {
      suppressor.stop();
      
      // CORS blocked - return partial info (expected behavior)
      const headers: HeaderAnalysis = {
        securityHeaders: {
          'X-Frame-Options': null,
          'X-Content-Type-Options': null,
          'Strict-Transport-Security': null,
          'Content-Security-Policy': null,
          'X-XSS-Protection': null,
          'Referrer-Policy': null,
          'Permissions-Policy': null,
          'Feature-Policy': null,
          'Cross-Origin-Embedder-Policy': null,
          'Cross-Origin-Opener-Policy': null,
        },
        server: null,
        poweredBy: null,
        cookies: [],
        cookieDetails: [],
        cors: {
          allowed: false,
          credentials: false,
        },
      };
      setCache(cacheKey, headers, 60000); // Cache CORS failure only 1 min so re-scan with extension can succeed
      return headers;
    }
  }

  /**
   * Check SSL using public API (SSL Labs or similar)
   */
  async analyzeSSL(domain: string): Promise<SSLInfo> {
    const cacheKey = `ssl_${domain}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      // Use SSL Labs API (free, no backend needed)
      // Note: SSL Labs API doesn't support CORS from browsers - this is expected
      const response = await fetch(`https://api.ssllabs.com/api/v3/analyze?host=${domain}&publish=off&fromCache=on&maxAge=24`, {
        mode: 'cors',
      });

      if (response.ok) {
        const data = await response.json();
        const endpoint = data.endpoints?.[0];
        
        const sslInfo: SSLInfo = {
          valid: endpoint?.statusMessage === 'Ready',
          issuer: endpoint?.details?.cert?.issuerLabel || null,
          expiry: endpoint?.details?.cert?.notAfter || null,
          protocol: endpoint?.details?.protocols?.[0]?.name || null,
          grade: endpoint?.grade || 'Unknown',
        };

        setCache(cacheKey, sslInfo, 86400000); // Cache for 24 hours
        return sslInfo;
      }
    } catch (error: any) {
      // SSL Labs API doesn't support CORS - this is expected, use fallback silently
      // Suppress all CORS-related errors from console (expected behavior)
      const errorMessage = error?.message || '';
      const isCorsError = errorMessage.includes('CORS') || 
                        errorMessage.includes('Access-Control-Allow-Origin') ||
                        error?.status === 403 ||
                        error?.status === 0 ||
                        error?.name === 'TypeError' ||
                        error?.name === 'NetworkError';
      
      // Silently handle CORS errors - don't log to console
      // Only log unexpected errors in development mode
      const isDev = import.meta.env?.MODE === 'development' || import.meta.env?.DEV === true;
      if (!isCorsError && isDev) {
        console.warn('[NetworkAnalysis] SSL check failed:', errorMessage);
      }
    }

    // Fallback: Check if HTTPS works
    try {
      const httpsUrl = `https://${domain}`;
      const testResponse = await fetch(httpsUrl, { method: 'HEAD', mode: 'no-cors' });
      const sslInfo: SSLInfo = {
        valid: true,
        issuer: null,
        expiry: null,
        protocol: 'TLS',
        grade: 'Unknown',
      };
      setCache(cacheKey, sslInfo, 3600000); // Cache for 1 hour
      return sslInfo;
    } catch {
      const sslInfo: SSLInfo = {
        valid: false,
        issuer: null,
        expiry: null,
        protocol: null,
        grade: 'F',
      };
      setCache(cacheKey, sslInfo, 300000); // Cache error for 5 minutes
      return sslInfo;
    }
  }

  /**
   * Check DNS records (A, AAAA, TXT) using Google DNS over HTTPS.
   */
  async checkDNS(domain: string): Promise<DNSInfo> {
    const cacheKey = `dns_${domain}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const suppressor = createErrorSuppressor();
    suppressor.start();

    let ip: string | null = null;
    let records: any[] = [];
    const aaaaList: string[] = [];
    const txtList: string[] = [];

    try {
      const [resA, resAAAA, resTXT] = await Promise.all([
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, { mode: 'cors' }),
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=AAAA`, { mode: 'cors' }),
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`, { mode: 'cors' }),
      ]);

      if (resA.ok) {
        const data = await resA.json();
        records = data.Answer || [];
        ip = records[0]?.data || null;
      }
      if (resAAAA.ok) {
        try {
          const data = await resAAAA.json();
          const ans = data.Answer || [];
          for (const r of ans) {
            if (r.data) aaaaList.push(r.data);
          }
        } catch {
          // ignore
        }
      }
      if (resTXT.ok) {
        try {
          const data = await resTXT.json();
          const ans = data.Answer || [];
          for (const r of ans) {
            if (r.data) txtList.push(r.data.replace(/^"|"$/g, ''));
          }
        } catch {
          // ignore
        }
      }

      const dnsInfo: DNSInfo = {
        ip,
        records,
        ...(aaaaList.length > 0 ? { aaaa: aaaaList } : {}),
        ...(txtList.length > 0 ? { txt: txtList } : {}),
      };
      setCache(cacheKey, dnsInfo, 3600000);
      suppressor.stop();
      return dnsInfo;
    } catch {
      // Suppress expected CORS errors
    } finally {
      suppressor.stop();
    }

    const dnsInfo: DNSInfo = { ip: null, records: [] };
    setCache(cacheKey, dnsInfo, 300000);
    return dnsInfo;
  }

  /**
   * Test common security headers (including Permissions-Policy, COEP, COOP)
   */
  async testSecurityHeaders(targetUrl: string): Promise<SecurityHeaderTest> {
    const headers = await this.analyzeHeaders(targetUrl);
    const missing: string[] = [];
    const weak: string[] = [];
    let score = 100;

    // Critical headers
    if (!headers.securityHeaders['X-Frame-Options']) {
      missing.push('X-Frame-Options');
      score -= 15;
    }
    if (!headers.securityHeaders['X-Content-Type-Options']) {
      missing.push('X-Content-Type-Options');
      score -= 15;
    }
    if (!headers.securityHeaders['Strict-Transport-Security']) {
      missing.push('Strict-Transport-Security');
      score -= 20;
    }
    if (!headers.securityHeaders['Content-Security-Policy']) {
      missing.push('Content-Security-Policy');
      score -= 25;
    }
    if (!headers.securityHeaders['Permissions-Policy']) {
      missing.push('Permissions-Policy');
      score -= 10;
    }
    if (!headers.securityHeaders['Cross-Origin-Opener-Policy']) {
      missing.push('Cross-Origin-Opener-Policy');
      score -= 5;
    }
    if (!headers.securityHeaders['Cross-Origin-Embedder-Policy']) {
      missing.push('Cross-Origin-Embedder-Policy');
      score -= 5;
    }

    // Weak configurations
    if (headers.securityHeaders['X-Frame-Options'] === 'SAMEORIGIN') {
      weak.push('X-Frame-Options should be DENY');
      score -= 5;
    }

    return { missing, weak, score: Math.max(0, score) };
  }
}
