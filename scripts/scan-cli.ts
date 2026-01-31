/**
 * CLI scan: fetch URL, run tech fingerprint (standard-level detection), print logs.
 * Usage: npx tsx scripts/scan-cli.ts [URL]
 * Example: npx tsx scripts/scan-cli.ts https://vaultguard-pro.vercel.app/
 * Requires: .env.local with GEMINI_API_KEY (only needed if you add --ai later).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { detectTechFingerprint } from '../utils/techFingerprint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvLocal(): Record<string, string> {
  const root = path.resolve(__dirname, '..');
  const envPath = path.join(root, '.env.local');
  const out: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return out;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    out[key] = value;
  }
  return out;
}

function log(msg: string, type: 'info' | 'warn' | 'error' = 'info') {
  const ts = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const prefix = `[${ts}] [VG]`;
  if (type === 'error') console.error(prefix, msg);
  else if (type === 'warn') console.warn(prefix, msg);
  else console.log(prefix, msg);
}

async function main() {
  const url = process.argv[2] || 'https://vaultguard-pro.vercel.app/';
  const env = loadEnvLocal();
  const hasKey = !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.length >= 10);

  log(`[PREFLIGHT] Target: ${url}`);
  log(`[PREFLIGHT] .env.local: ${env.GEMINI_API_KEY ? 'GEMINI_API_KEY set' : 'GEMINI_API_KEY missing'}`);

  let html: string;
  let headersRecord: Record<string, string | null> = {};

  try {
    log('[NETWORK] Fetching URL...');
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'VaultGuard-Pro-CLI/1.0' },
      redirect: 'follow',
    });
    html = await response.text();
    response.headers.forEach((value, key) => {
      headersRecord[key.toLowerCase()] = value;
    });
    log(`[NETWORK] Status: ${response.status} ${response.statusText}, length: ${html.length} chars`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`[FATAL] Fetch failed: ${message}`, 'error');
    process.exit(1);
  }

  log('[TECH] Running deterministic tech fingerprint (standard-level)...');
  const fingerprint = detectTechFingerprint(html, headersRecord);
  log(`[TECH] Ground Truth: ${fingerprint.map((t) => t.name).join(', ') || '(none)'}`);

  if (fingerprint.length === 0) {
    log('[TECH] No technologies detected from DOM/headers. Possible causes: CORS, non-HTML, or minimal page.', 'warn');
  } else {
    console.log('\n--- Technology DNA (CLI) ---');
    fingerprint.forEach((t) => {
      console.log(`  ${t.name}${t.version ? ` @ ${t.version}` : ''} [${t.category}] — ${t.evidence.slice(0, 60)}${t.evidence.length > 60 ? '…' : ''}`);
    });
    console.log('---\n');
  }

  log('[SUCCESS] CLI scan complete. Run full scan in browser for AI findings and PDF; check DevTools console for [VG] logs.');
  if (!hasKey) log('[WARN] No GEMINI_API_KEY in .env.local — AI analysis and full scan only work with API key.', 'warn');
}

main();
