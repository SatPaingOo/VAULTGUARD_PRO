/**
 * Finding Verification (Check First): verify endpoints exist before reporting.
 * Reduces false positives: if AI reports /api/auth/login but it returns 404, exclude from report.
 */

import type { MissionReport, VulnerabilityFinding, VerificationPayload, VerificationStatus } from '../services/geminiService';

const VERIFY_TIMEOUT_MS = 5000;

/**
 * Normalize endpoint path for matching (e.g. /api/auth/login).
 */
function normalizePath(path: string): string {
  try {
    const p = path.trim();
    if (!p) return '';
    const match = p.match(/^(https?:\/\/[^/]+)?(\/[^?#]*)/);
    return match ? (match[2] || p) : p.startsWith('/') ? p : `/${p}`;
  } catch {
    return path;
  }
}

/**
 * Check if a finding references an endpoint path (in origin, poc, or title).
 */
function findingReferencesEndpoint(finding: VulnerabilityFinding, path: string): boolean {
  const lower = path.toLowerCase();
  const origin = (finding.origin || '').toLowerCase();
  const poc = (finding.poc || '').toLowerCase();
  const title = (finding.title || '').toLowerCase();
  const pathNorm = lower.startsWith('/') ? lower : `/${lower}`;
  return (
    origin.includes(lower) ||
    origin.includes(pathNorm) ||
    poc.includes(lower) ||
    poc.includes(pathNorm) ||
    title.includes(lower) ||
    title.includes(pathNorm)
  );
}

/** Expert mode: custom headers/cookies for verification requests. */
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

/**
 * HEAD request to endpoint.
 * Returns: 'exists' (2xx), 'protected' (401/403 - endpoint exists but auth required), 'not_found' (404), 'error' (5xx/timeout/network).
 */
async function endpointStatus(
  fullUrl: string,
  options?: ExpertFetchOptions
): Promise<'exists' | 'protected' | 'not_found' | 'error'> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), VERIFY_TIMEOUT_MS);
    const headers = buildRequestHeaders(options);
    const res = await fetch(fullUrl, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit',
      signal: ctrl.signal,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    });
    clearTimeout(timeout);
    if (res.ok) return 'exists';
    if (res.status === 401 || res.status === 403) return 'protected';
    if (res.status === 404) return 'not_found';
    return 'error';
  } catch {
    return 'error';
  }
}

/** Map endpoint path -> verification result. Used to tag findings with verificationStatus. */
export type EndpointStatusMap = Record<string, 'exists' | 'protected' | 'not_found' | 'error'>;

/** Map verification result to user-facing status: 200 = High, 403/401 = Potential, 404/error = discard. */
function toVerificationStatus(status: 'exists' | 'protected' | 'not_found' | 'error'): 'High' | 'Potential' | 'Unknown' {
  if (status === 'exists') return 'High';
  if (status === 'protected') return 'Potential';
  return 'Unknown';
}

/**
 * Get the best verification status for a finding that may reference multiple endpoints.
 */
function getBestVerificationStatusForFinding(
  finding: VulnerabilityFinding,
  pathToStatus: EndpointStatusMap
): 'High' | 'Potential' | 'Unknown' {
  let best: 'High' | 'Potential' | 'Unknown' = 'Unknown';
  for (const path of Object.keys(pathToStatus)) {
    if (!findingReferencesEndpoint(finding, path)) continue;
    const s = toVerificationStatus(pathToStatus[path]);
    if (s === 'High') return 'High';
    if (s === 'Potential') best = 'Potential';
  }
  return best;
}

/**
 * Verify endpoints and remove findings/apis/probes that reference non-existent (404) endpoints.
 * Tags remaining findings with verificationStatus: High (200), Potential (403/401), Unknown.
 */
export async function verifyFindings(
  targetUrl: string,
  report: MissionReport,
  options?: ExpertFetchOptions
): Promise<MissionReport> {
  const base = targetUrl.replace(/\/$/, '');
  const endpointsToCheck = new Set<string>();

  for (const api of report.targetIntelligence?.apis || []) {
    const path = normalizePath(api);
    if (path && path.startsWith('/')) endpointsToCheck.add(path);
  }
  for (const probe of report.activeProbes || []) {
    const path = normalizePath(probe.endpoint || '');
    if (path && path.startsWith('/')) endpointsToCheck.add(path);
  }

  const pathToStatus: EndpointStatusMap = {};
  for (const path of endpointsToCheck) {
    const fullUrl = path.startsWith('http') ? path : `${base}${path}`;
    pathToStatus[path] = await endpointStatus(fullUrl, options);
  }

  const nonexistent = new Set<string>(
    Object.entries(pathToStatus)
      .filter(([, s]) => s === 'not_found' || s === 'error')
      .map(([p]) => normalizePath(p))
  );

  const filteredFindings = (report.findings || [])
    .filter((f) => !Array.from(nonexistent).some((path) => findingReferencesEndpoint(f, path)))
    .map((f) => ({
      ...f,
      verificationStatus: getBestVerificationStatusForFinding(f, pathToStatus) as VerificationStatus,
    }));
  const filteredApis = (report.targetIntelligence?.apis || []).filter(
    (api) => !nonexistent.has(normalizePath(api))
  );
  const filteredProbes = (report.activeProbes || []).filter(
    (p) => !nonexistent.has(normalizePath(p.endpoint || ''))
  );

  return {
    ...report,
    findings: filteredFindings,
    targetIntelligence: {
      ...report.targetIntelligence,
      apis: filteredApis,
    },
    activeProbes: filteredProbes,
  };
}
