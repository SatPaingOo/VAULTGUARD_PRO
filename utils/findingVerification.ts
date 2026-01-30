/**
 * Finding Verification (Check First): verify endpoints exist before reporting.
 * Reduces false positives: if AI reports /api/auth/login but it returns 404, exclude from report.
 */

import type { MissionReport, VulnerabilityFinding, VerificationPayload } from '../services/geminiService';

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

/**
 * HEAD request to endpoint; returns true if endpoint exists (2xx), false if 404/unreachable.
 */
async function endpointExists(fullUrl: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), VERIFY_TIMEOUT_MS);
    const res = await fetch(fullUrl, {
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit',
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Verify endpoints and remove findings/apis/probes that reference non-existent (404) endpoints.
 */
export async function verifyFindings(targetUrl: string, report: MissionReport): Promise<MissionReport> {
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

  const nonexistent = new Set<string>();
  for (const path of endpointsToCheck) {
    const fullUrl = path.startsWith('http') ? path : `${base}${path}`;
    const exists = await endpointExists(fullUrl);
    if (!exists) nonexistent.add(normalizePath(path));
  }

  if (nonexistent.size === 0) return report;

  const filteredFindings = (report.findings || []).filter(
    (f) => !Array.from(nonexistent).some((path) => findingReferencesEndpoint(f, path))
  );
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
