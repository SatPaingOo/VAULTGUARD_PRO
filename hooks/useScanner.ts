
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GeminiService, MissionReport, ScanLevel, VerificationPayload, VulnerabilityFinding } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { useSecurity } from '../contexts/SecurityContext';
import { extractSecuritySignals, extractTargetDOM, type ExpertFetchOptions } from '../utils/masking';
import { FrontendNetworkAnalysis } from '../utils/networkAnalysis';
import { detectTechFingerprint } from '../utils/techFingerprint';
import { verifyFindings } from '../utils/findingVerification';
import { validateAndCheckUrl } from '../utils/urlValidation';
import { AI_CONSTANTS, NETWORK_CONSTANTS, PROBE_CONSTANTS, API_KEY_CONSTANTS, SENSITIVE_PROBE_PATHS } from '../constants';

export type MissionPhase = 'Briefing' | 'Simulation' | 'Debriefing';
export type ScanStatus = 'Idle' | 'Recon' | 'Discovery' | 'Probing' | 'Fuzzing' | 'Triage' | 'Finalizing';

export interface TelemetryEntry {
  msg: string;
  type: 'info' | 'warn' | 'error' | 'success' | 'probe';
  timestamp: string;
  progressAtLog: number;
}

export interface DispatchedProbe extends VerificationPayload {
  status?: number;
  responseTime?: number;
  responseLength?: number;
  timestamp?: string;
  vulnerable?: boolean;
  corsBlocked?: boolean;
  error?: string;
  errorMessage?: string;
}

const INITIAL_REPORT: MissionReport = {
  targetIntelligence: { purpose: "---", businessLogic: "---", attackSurfaceSummary: "---", forensicAnalysis: "---", apis: [], associatedLinks: [], hosting: { provider: "---", location: "---", ip: "0.0.0.0", latitude: 0, longitude: 0 }, groundingSources: undefined },
  activeProbes: [],
  digitalFootprint: [], 
  technologyDNA: [], 
  findings: [], 
  confidenceScore: 0, 
  securityScore: 0, 
  usage: { totalTokenCount: 0 }
};

/** Keep only probes whose endpoint is under the target domain (same host). Skip localhost, 127.0.0.1, and non-target hosts to avoid false positives. */
function filterProbesByTargetDomain(target: string, probes: VerificationPayload[]): VerificationPayload[] {
  if (!probes?.length) return [];
  let targetHost: string;
  try {
    targetHost = new URL(target.replace(/\/$/, '') || 'https://example.com').hostname.toLowerCase();
  } catch {
    return probes;
  }
  const isLocal = (h: string) => h === 'localhost' || h.startsWith('127.') || h.startsWith('192.168.') || h.startsWith('10.');
  return probes.filter((p) => {
    const full = p.endpoint.startsWith('http') ? p.endpoint : `${target.replace(/\/$/, '')}${p.endpoint.startsWith('/') ? '' : '/'}${p.endpoint}`;
    try {
      const host = new URL(full).hostname.toLowerCase();
      if (isLocal(host)) return false;
      return host === targetHost;
    } catch {
      return false;
    }
  });
}

/** Format raw API rate-limit message for modal: extract retry seconds, short summary, and correct docs link */
function formatRateLimitMessage(raw: string): string {
  const retryMatch = raw.match(/retry\s+in\s+([\d.]+)/i) || raw.match(/retry\s+after\s+([\d.]+)/i);
  const seconds = retryMatch ? Math.max(1, Math.ceil(parseFloat(retryMatch[1]))) : null;
  const lines: string[] = [
    'You have exceeded the API rate limit (too many requests).',
    seconds ? `Please retry in ${seconds} second${seconds !== 1 ? 's' : ''}.` : 'Please wait 1–2 minutes before scanning again.',
    'For more information: https://ai.google.dev/gemini-api/docs/rate-limits'
  ];
  return lines.join('\n');
}

export const useScanner = () => {
  const { currentLanguageName } = useLanguage();
  const { activeKey, isEngineLinked, apiKeyStatus, setApiKeyStatus } = useSecurity();
  const [missionPhase, setMissionPhase] = useState<MissionPhase>('Briefing');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('Idle');
  const [progress, setProgress] = useState(0);
  const [telemetry, setTelemetry] = useState<TelemetryEntry[]>([]);
  const [currentAction, setCurrentAction] = useState<string>('Initializing Neural Link...');
  const [missionReport, setMissionReport] = useState<MissionReport>(INITIAL_REPORT);
  const [usage, setUsage] = useState({ tokens: 0, cost: 0 });
  const [targetUrl, setTargetUrl] = useState('');
  const [currentLevel, setCurrentLevel] = useState<ScanLevel>('STANDARD');
  const [recentFindings, setRecentFindings] = useState<VulnerabilityFinding[]>([]);
  const [dispatchedProbes, setDispatchedProbes] = useState<DispatchedProbe[]>([]);
  const [error, setError] = useState<{ message: string; type: 'api_key' | 'network' | 'rate_limit' | 'service_busy' | 'unknown' } | null>(null);
  const [scanStartTime, setScanStartTime] = useState<Date | null>(null);
  const [scanEndTime, setScanEndTime] = useState<Date | null>(null);

  const gemini = useRef<GeminiService | null>(null);

  // Recreate GeminiService when API key changes (from React Context)
  useEffect(() => {
    gemini.current = new GeminiService(activeKey);
  }, [activeKey]);

  const getGemini = () => {
    if (!gemini.current) {
      gemini.current = new GeminiService(activeKey);
    }
    return gemini.current;
  };

  const addLog = useCallback((msg: string, type: TelemetryEntry['type'] = 'info', currentProgress: number) => {
    setCurrentAction(msg.replace(/\[.*?\]\s*/, ''));
    setProgress(currentProgress); // Sync progress with log entry
    setTelemetry(prev => [...prev.slice(-49), { msg, type, timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }), progressAtLog: currentProgress }]);
    // Mirror to browser console only in development (no [VG] logs in production deploy)
    const isDev = import.meta.env?.DEV === true || import.meta.env?.MODE === 'development';
    if (isDev) {
      const prefix = '[VG]';
      if (type === 'error') console.error(prefix, msg);
      else if (type === 'warn') console.warn(prefix, msg);
      else console.log(prefix, msg);
    }
  }, []);

  const runMission = async (url: string, level: ScanLevel, languageName: string = "English", expertOptions?: ExpertFetchOptions) => {
    // Validate API key before starting scan
    if (!activeKey || activeKey.length < API_KEY_CONSTANTS.MIN_KEY_LENGTH) {
      addLog(`[FATAL] API_KEY_MISSING: Neural Engine Core not linked. Please configure API key to proceed.`, 'error', 0);
      setProgress(0);
      setScanStatus('Idle');
      setError({
        message: 'API_KEY_MISSING: Neural Engine Core not linked. Please configure API key to proceed.',
        type: 'api_key'
      });
      return;
    }

    // Pre-flight validation: Check if URL is valid and website is reachable
    setTargetUrl(url);
    setCurrentLevel(level);
    
    // Record scan start time
    const startTime = new Date();
    setScanStartTime(startTime);
    setScanEndTime(null);
    
    setMissionPhase('Simulation');
    setScanStatus('Recon');
    setProgress(2);
    addLog(`[PREFLIGHT] Validating target URL and checking connectivity...`, 'info', 2);

    try {
      // Validate URL format and check if website is reachable
      const validation = await validateAndCheckUrl(url);
      
      if (!validation.isValid) {
        setProgress(0);
        setScanStatus('Idle');
        setMissionPhase('Briefing');
        setError({
          message: validation.error || 'Invalid URL format. Please check the URL and try again.',
          type: 'network'
        });
        addLog(`[FATAL] ${validation.error}`, 'error', 0);
        return;
      }

      if (!validation.isReachable) {
        setProgress(0);
        setScanStatus('Idle');
        setMissionPhase('Briefing');
        const errorMessage = validation.error || `Cannot reach "${validation.details?.domain || url}". The website may not exist or is unreachable.`;
        setError({
          message: errorMessage,
          type: 'network'
        });
        addLog(`[FATAL] ${errorMessage}`, 'error', 0);
        return;
      }

      // URL is valid and reachable, proceed with scan
      const target = url.startsWith('http') ? url : `https://${url}`;
      const domain = target.replace(/^https?:\/\//, '').split('/')[0];
      setTargetUrl(target);
      setProgress(5);
      addLog(`[SYSTEM] Target validated. Initializing Mission: ${level}. Deployment in progress.`, 'info', 5);
      addLog(`[NETWORK] Target: ${domain} (${validation.details?.ip || 'IP resolved'})`, 'success', 5);

    } catch (validationError: any) {
      // If validation itself fails, still try to proceed (graceful degradation)
      addLog(`[WARN] Pre-flight validation failed, proceeding with scan anyway: ${validationError.message}`, 'warn', 5);
    }

    // Normalize URL for scanning
    const target = url.startsWith('http') ? url : `https://${url}`;
    const domain = target.replace(/^https?:\/\//, '').split('/')[0];

    try {
      const g = getGemini();
      
      // Verify API key is still valid (from React Context)
      if (!activeKey || activeKey.length < API_KEY_CONSTANTS.MIN_KEY_LENGTH) {
        throw new Error('API_KEY_INVALID: API key is missing or invalid. Please reconfigure.');
      }
      const networkAnalysis = new FrontendNetworkAnalysis();
      
      // Track CORS status for AI compensation
      const corsStatus = {
        domBlocked: false,
        headersBlocked: false,
        sslBlocked: false,
        directScanBlocked: false
      };
      
      // Phase 1: Parallel Data Collection (OPTIMIZED: All requests in parallel for 2-3x speed)
      // Level-specific data collection messages
      if (level === 'FAST') {
        addLog(`[NETWORK] Collecting data in parallel (Headers, SSL, DNS)...`, 'info', 10);
      } else {
        addLog(`[NETWORK] Collecting data in parallel (DOM, OSINT, Headers, SSL, DNS)...`, 'info', 10);
        addLog(`[OSINT] Fetching Live CVE Data from Google Search Grounding...`, 'info', 11);
      }
      setScanStatus('Discovery');
      
      // Execute data collection - OSINT only for STANDARD and DEEP levels
      // OSINT: retry once after 5s on failure (transient 503/429 can recover)
      const osintPromise = (level === 'STANDARD' || level === 'DEEP')
        ? (async () => {
            try {
              return await g.runIntelligenceDiscovery(domain, target, languageName);
            } catch (e) {
              addLog(`[OSINT] First attempt failed, retrying in 5s...`, 'warn', 12);
              await new Promise(r => setTimeout(r, 5000));
              return await g.runIntelligenceDiscovery(domain, target, languageName);
            }
          })()
        : Promise.resolve({ usage: { totalTokenCount: 0 }, sources: [] });

      const dataCollectionPromises = [
        extractTargetDOM(target, expertOptions).catch(err => {
          if (err.message?.includes('CORS_BLOCKED') || err.message?.includes('CORS')) {
            corsStatus.domBlocked = true;
            corsStatus.directScanBlocked = true;
          }
          throw err;
        }),
        osintPromise,
        networkAnalysis.analyzeHeaders(target, expertOptions),
        networkAnalysis.analyzeSSL(domain),
        networkAnalysis.checkDNS(domain),
      ];
      
      const [domResult, osintResult, headersResult, sslResult, dnsResult] = 
        await Promise.allSettled(dataCollectionPromises);
      
      // Extract results
      const rawDom = domResult.status === 'fulfilled' 
        ? (typeof domResult.value === 'string' ? domResult.value : '')
        : '';
      const domExtractionSuccess = domResult.status === 'fulfilled' && rawDom.length > 0;
      
      if (domExtractionSuccess) {
        addLog(`[SANDBOX] Target DOM extracted successfully`, 'success', 15);
      } else {
        corsStatus.domBlocked = true;
        corsStatus.directScanBlocked = true;
        addLog(`[WARN] DOM extraction blocked by CORS. AI intelligence compensation activated...`, 'warn', 15);
        // Level-specific compensation message
        if (level === 'FAST') {
          addLog(`[AI_COMPENSATION] Neural reasoning mode: Analyzing available data (SSL, DNS) with AI intelligence`, 'info', 16);
        } else {
          addLog(`[AI_COMPENSATION] Neural reasoning mode: Analyzing available data (SSL, DNS, OSINT) with AI intelligence`, 'info', 16);
        }
        addLog(`[AI_COMPENSATION] Using Gemini reasoning to infer security posture from network metadata`, 'info', 17);
      }
      
      const disc = osintResult.status === 'fulfilled' ? osintResult.value : { usage: { totalTokenCount: 0 } };
      const headers = headersResult.status === 'fulfilled' ? headersResult.value : null;
      const sslInfo = sslResult.status === 'fulfilled' ? sslResult.value : null;
      const dnsInfo = dnsResult.status === 'fulfilled' ? dnsResult.value : null;
      
      // Add status message after OSINT discovery completes (only for STANDARD and DEEP)
      if (level === 'STANDARD' || level === 'DEEP') {
        if (osintResult.status === 'fulfilled' && disc.sources && Array.isArray(disc.sources) && disc.sources.length > 0) {
          const sourceCount = disc.sources.length;
          addLog(`[OSINT] Retrieved ${sourceCount} live sources from Google Search Grounding`, 'success', 25);
        } else if (osintResult.status === 'fulfilled') {
          addLog(`[OSINT] OSINT intelligence gathered successfully`, 'success', 25);
        }
      }
      
      // Check headers CORS status
      if (headers && !headers.cors?.allowed) {
        corsStatus.headersBlocked = true;
      }
      
      // Network analysis results
      if (headers) {
        const headerTest = await networkAnalysis.testSecurityHeaders(target);
        addLog(`[NETWORK] Security headers score: ${headerTest.score}/100`, headerTest.score < 70 ? 'warn' : 'success', 18);
        if (headerTest.missing.length > 0) {
          addLog(`[NETWORK] Missing headers: ${headerTest.missing.join(', ')}`, 'warn', 19);
        }
      }
      
      if (sslInfo && sslInfo.valid) {
        addLog(`[NETWORK] SSL Grade: ${sslInfo.grade}`, sslInfo.grade === 'A' || sslInfo.grade === 'A+' ? 'success' : 'warn', 20);
      } else if (sslInfo && !sslInfo.valid) {
        corsStatus.sslBlocked = true;
      }
      
      if (dnsInfo && dnsInfo.ip) {
        addLog(`[NETWORK] Resolved IP: ${dnsInfo.ip}`, 'success', 21);
      }
      
      // AI Compensation Status Log (level-specific)
      if (corsStatus.directScanBlocked) {
        addLog(`[AI_COMPENSATION] CORS restriction detected. Compensating with AI-powered analysis...`, 'warn', 22);
        const availableSources = level === 'FAST'
          ? [
              sslInfo ? 'SSL ✓' : 'SSL ✗',
              dnsInfo?.ip ? 'DNS ✓' : 'DNS ✗'
            ].join(' | ')
          : [
              sslInfo ? 'SSL ✓' : 'SSL ✗',
              dnsInfo?.ip ? 'DNS ✓' : 'DNS ✗',
              osintResult.status === 'fulfilled' ? 'OSINT ✓' : 'OSINT ✗'
            ].join(' | ');
        addLog(`[AI_COMPENSATION] Available data sources: ${availableSources}`, 'info', 23);
        if (level === 'STANDARD' || level === 'DEEP') {
          addLog(`[AI_COMPENSATION] AI will use Search Grounding + Network Intelligence to compensate for CORS limitations`, 'info', 24);
        } else {
          addLog(`[AI_COMPENSATION] AI will use Network Intelligence to compensate for CORS limitations`, 'info', 24);
        }
      }
      
      // Extract security signals (only if DOM available)
      const signals = rawDom ? extractSecuritySignals(rawDom) : JSON.stringify({ 
        note: 'DOM extraction blocked by CORS - AI intelligence compensation mode',
        availableData: {
          headers: headers?.securityHeaders || null,
          sslGrade: sslInfo?.grade || null,
          sslValid: sslInfo?.valid || false,
          ip: dnsInfo?.ip || null,
          dnsRecords: dnsInfo?.records || [],
        },
        corsStatus: corsStatus,
      });

      // Ground Truth: deterministic tech fingerprint (Wappalyzer-style) before AI
      const techFingerprint = detectTechFingerprint(rawDom || signals, headers?.securityHeaders);
      // When target host is *.vercel.app, add Vercel + Node.js if not already detected (headers may be hidden by CORS)
      try {
        const targetHost = new URL(target.replace(/\/$/, '') || 'https://example.com').hostname.toLowerCase();
        if (targetHost.endsWith('.vercel.app') || targetHost === 'vercel.app') {
          const names = new Set(techFingerprint.map((t) => t.name.toLowerCase()));
          if (!names.has('vercel')) techFingerprint.push({ name: 'Vercel', category: 'Server', evidence: 'Inferred from hostname (*.vercel.app)' });
          if (!names.has('node.js')) techFingerprint.push({ name: 'Node.js', category: 'Server', evidence: 'Inferred from Vercel hosting' });
        }
      } catch {
        /* ignore URL parse */
      }
      if (level === 'STANDARD' || level === 'DEEP') {
        if (techFingerprint.length > 0) {
          addLog(`[TECH] Ground Truth: ${techFingerprint.map(t => t.name).join(', ')}`, 'success', 28);
        }
      }
      
      // Helper function to extract token count from usageMetadata (handles both formats)
      const getTokenCount = (usage: any): number => {
        if (!usage) return 0;
        // Handle totalTokenCount format
        if (typeof usage.totalTokenCount === 'number') {
          return usage.totalTokenCount;
        }
        // Handle inputTokenCount + outputTokenCount format
        if (typeof usage.inputTokenCount === 'number' || typeof usage.outputTokenCount === 'number') {
          return (usage.inputTokenCount || 0) + (usage.outputTokenCount || 0);
        }
        return 0;
      };

      // Track OSINT token usage and show status (only for STANDARD and DEEP)
      const osintTokens = (level === 'STANDARD' || level === 'DEEP') ? getTokenCount(disc.usage) : 0;
      if (osintTokens > 0) {
        setUsage(prev => ({ 
          tokens: prev.tokens + osintTokens, 
          cost: prev.cost + osintTokens * 0.00000035 
        }));
        
        // Add status message with actual token count from OSINT
        const formattedOsintTokens = osintTokens.toLocaleString();
        addLog(`[OSINT] Live CVE data retrieved (${formattedOsintTokens} tokens)`, 'success', 26);
      }
      
      setProgress(30);
      
      // Merge network analysis into OSINT data
      const enhancedDisc = {
        ...disc,
        networkAnalysis: {
          headers,
          sslInfo: target.startsWith('https://') ? sslInfo : null,
          dnsInfo,
        },
        ip: dnsInfo?.ip || disc.ip,
        corsStatus: corsStatus, // Add CORS status to intelligence
      };

      // MANDATORY COOLDOWN: Give the API breathing room to prevent burst 429s
      addLog(`[SYSTEM] Cooldown period active: mitigating API rate limits...`, 'info', 32);
      await new Promise(r => setTimeout(r, AI_CONSTANTS.API_COOLDOWN_MS));

      // Phase 2: Neural Processing & Sandbox (OPTIMIZED: Tier-based data transmission)
      setScanStatus('Probing');
      addLog(`[NEURAL] Enabling PII-Masking for sensitive forensic data...`, 'success', 35);
      
      if (corsStatus.directScanBlocked) {
        addLog(`[NEURAL] AI Compensation Mode: Enabling advanced reasoning to overcome CORS restrictions...`, 'success', 36);
        // Level-specific analysis message
        if (level === 'FAST') {
          addLog(`[NEURAL] Gemini will analyze: SSL config, DNS records, and infer vulnerabilities`, 'info', 37);
        } else {
          addLog(`[NEURAL] Gemini will analyze: SSL config, DNS records, OSINT intelligence, and infer vulnerabilities`, 'info', 37);
        }
      }
      
      // Add status message based on scan level
      if (level === 'STANDARD' || level === 'DEEP') {
        addLog(`[AI] Analyzing Technology DNA & Infrastructure...`, 'info', 38);
        if (level === 'DEEP') {
          addLog(`[AI] DEEP mode: 32K thinking budget enabled (32,768 tokens)`, 'info', 39);
          addLog(`[AI] Deep reasoning mode: Simulating multi-step attack chains...`, 'info', 39);
        }
      }
      
      addLog(`[SANDBOX] Initializing Heuristic Simulation...`, 'info', 40);
      addLog(`[PROBE] Generating tactical verification payloads...`, 'info', 45);
      
      // Prepare tier-based data (OPTIMIZED: Send only what's needed per scan level)
      const tierBasedData = {
        FAST: {
          headers: headers?.securityHeaders,
          sslInfo: sslInfo,
          dnsInfo: dnsInfo,
          corsStatus: corsStatus,
          techFingerprint: [], // FAST: no DOM, no fingerprint
        },
        STANDARD: {
          headers: headers?.securityHeaders,
          sslInfo: sslInfo,
          dnsInfo: dnsInfo,
          signals: signals,
          corsStatus: corsStatus,
          techFingerprint, // Ground Truth for AI (Wappalyzer-style)
        },
        DEEP: {
          headers: headers?.securityHeaders,
          sslInfo: sslInfo,
          dnsInfo: dnsInfo,
          signals: signals,
          dom: rawDom,
          corsStatus: corsStatus,
          techFingerprint, // Ground Truth for AI
        },
      };
      
      // Show current token usage before AI analysis
      // Calculate current tokens from OSINT discovery
      const currentTokens = osintTokens;
      if (currentTokens > 0) {
        const formattedCurrent = currentTokens.toLocaleString();
        addLog(`[AI] AI reasoning in progress (${formattedCurrent} tokens loaded)...`, 'info', 46);
      } else {
        const estimatedTokens = level === 'FAST' ? '~8K-10K' : level === 'STANDARD' ? '~25K-35K' : '~150K-400K';
        addLog(`[AI] AI reasoning in progress (estimated ${estimatedTokens} tokens)...`, 'info', 46);
      }
      
      const audit = await g.performDeepAudit(
        target, 
        signals, 
        level, 
        JSON.stringify(enhancedDisc), 
        languageName,
        tierBasedData[level], // Pass tier-based data for optimization
        corsStatus // Pass CORS status for AI compensation
      );
      
      // Track deep audit token usage
      setUsage(prev => {
        const auditTokens = getTokenCount(audit.usage);
        
        // Use correct pricing based on model used
        // FAST/STANDARD: Flash model ($0.00000035 per token)
        // DEEP: Pro model ($0.0000035 per token - 10x more expensive)
        const tokenPrice = level === 'DEEP' ? 0.0000035 : 0.00000035;
        
        return {
          tokens: prev.tokens + auditTokens,
          cost: prev.cost + (auditTokens * tokenPrice)
        };
      });
      
      // After audit completes, show actual token count
      const auditTokens = getTokenCount(audit.usage);
      if (auditTokens > 0) {
        const formattedTokens = auditTokens.toLocaleString();
        addLog(`[AI] AI reasoning completed (${formattedTokens} tokens processed)`, 'success', 70);
        if (level === 'DEEP') {
          addLog(`[AI] DEEP scan used 32K thinking budget (Gemini 3 Pro)`, 'success', 71);
        }
      }
      
      // Track probe execution for data quality
      let probesExecuted = 0;
      let probesSuccessful = 0;
      
      // Merge AI-suggested probes with sensitive path probes (no duplicates), then filter by target domain
      const aiProbes = audit.activeProbes || [];
      const norm = (ep: string) => {
        if (!ep.startsWith('http')) return ep;
        try { return new URL(ep).pathname; } catch { return ep; }
      };
      const existingPaths = new Set(aiProbes.map((p) => norm(p.endpoint)));
      const sensitiveProbes: VerificationPayload[] = SENSITIVE_PROBE_PATHS.filter((p) => !existingPaths.has(p.endpoint)).map((p) => ({ ...p }));
      const allProbes = [...aiProbes, ...sensitiveProbes];
      const probesToRun = filterProbesByTargetDomain(target, allProbes);
      const skippedCount = allProbes.length - probesToRun.length;
      if (skippedCount > 0) {
        addLog(`[PROBE] Skipped ${skippedCount} probe(s) not under target domain (localhost/non-target)`, 'warn', 50);
      }
      if (probesToRun.length > 0) {
        addLog(`[PROBE] Executing ${probesToRun.length} real HTTP probes in batches...`, 'info', 50);
        
        const batchSize = PROBE_CONSTANTS.PROBE_BATCH_SIZE;
        const executeProbe = async (probe: VerificationPayload, index: number) => {
          probesExecuted++;
          try {
            // Build full URL
            const probeUrl = probe.endpoint.startsWith('http') 
              ? probe.endpoint 
              : `${target.replace(/\/$/, '')}${probe.endpoint.startsWith('/') ? '' : '/'}${probe.endpoint}`;
            
            addLog(`[PROBE] ${probe.method} ${probe.endpoint}...`, 'probe', 50 + (index * 2));
            
            // Make REAL HTTP request. For GET with no body use minimal headers so the request
            // is "simple" and does not trigger CORS preflight (OPTIONS). Then CORS extension
            // can allow the GET response and we get status/body.
            const startTime = Date.now();
            let response: Response;
            let corsBlocked = false;
            const hasBody = !!(probe.payload && probe.method !== 'GET');
            const isSimpleGet = probe.method === 'GET' && !hasBody;

            const probeHeaders: Record<string, string> = isSimpleGet
              ? { ...expertOptions?.headers }
              : {
                  'Content-Type': 'application/json',
                  'User-Agent': 'VaultGuard-Pro/1.0',
                  ...expertOptions?.headers,
                };
            if (expertOptions?.cookies) probeHeaders['Cookie'] = expertOptions.cookies;

            try {
              response = await fetch(probeUrl, {
                method: probe.method,
                ...(Object.keys(probeHeaders).length > 0 ? { headers: probeHeaders } : {}),
                body: hasBody && probe.payload ? JSON.stringify(JSON.parse(probe.payload)) : undefined,
                mode: 'cors',
                credentials: 'omit',
              });
            } catch (corsError: any) {
              // CORS failed, try no-cors (can't read response but confirms endpoint exists)
              try {
                await fetch(probeUrl, {
                  method: probe.method,
                  ...(Object.keys(probeHeaders).length > 0 ? { headers: probeHeaders } : {}),
                  mode: 'no-cors',
                });
                // If no-cors succeeds, endpoint exists but we can't read response
                corsBlocked = true;
                response = { status: 0, ok: true, headers: new Headers(), text: () => Promise.resolve('') } as Response;
              } catch {
                throw corsError;
              }
            }
            
            const responseTime = Date.now() - startTime;
            const status = response.status || (response.ok ? 200 : 0);
            let responseText = '';
            let responseLength = 0;
            
            try {
              responseText = await response.text();
              responseLength = responseText.length;
            } catch {
              // Can't read response (CORS), but request succeeded
              responseLength = 0;
            }
            
            // Analyze response for vulnerability indicators
            const isVulnerable = analyzeProbeResponse(probe, status, responseText);
            
            addLog(
              `[PROBE] ${probe.method} ${probe.endpoint} -> ${status} (${responseTime}ms)${corsBlocked ? ' [CORS_BLOCKED]' : ''}${isVulnerable ? ' [VULNERABLE]' : ''}`,
              isVulnerable ? 'warn' : corsBlocked ? 'info' : 'probe',
              50 + (index * 2)
            );
            
            setDispatchedProbes(prev => [...prev, {
              ...probe,
              status,
              responseTime,
              responseLength,
              timestamp: new Date().toISOString(),
              vulnerable: isVulnerable,
              corsBlocked,
            }]);
            
            setProgress(p => Math.min(p + 2, 90));
            probesSuccessful++;
            
          } catch (error: any) {
            const errorType = error.message?.includes('CORS') ? 'CORS_BLOCKED' : 
                           error.message?.includes('Failed to fetch') ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR';
            
            addLog(
              `[PROBE] ${probe.method} ${probe.endpoint} -> ${errorType}`,
              'error',
              50 + (index * 2)
            );
            
            setDispatchedProbes(prev => [...prev, {
              ...probe,
              status: 0,
              error: errorType,
              errorMessage: error.message,
              timestamp: new Date().toISOString(),
            }]);
          }
        };
        
        // Execute probes in batches (OPTIMIZED: 3 at a time for 2-3x speed)
        for (let i = 0; i < probesToRun.length; i += batchSize) {
          const batch = probesToRun.slice(i, i + batchSize);
          await Promise.all(batch.map((probe, batchIndex) => executeProbe(probe, i + batchIndex)));
          
          // Rate limiting between batches (not between individual probes)
          if (i + batchSize < probesToRun.length) {
            await new Promise(r => setTimeout(r, PROBE_CONSTANTS.PROBE_BATCH_DELAY_MS));
          }
        }
      }
      
      // Helper function to analyze probe responses
      function analyzeProbeResponse(probe: VerificationPayload, status: number, responseText: string): boolean {
        // Check for common vulnerability indicators
        if (status === 200 && probe.expectedBehavior?.toLowerCase().includes('should reject')) {
          return true; // Should have rejected but didn't
        }
        
        if (status === 403 && probe.expectedBehavior?.toLowerCase().includes('should allow')) {
          return false; // Correctly blocked
        }
        
        // Check response content for error messages that reveal info
        const errorPatterns = [
          /sql.*error/i,
          /database.*error/i,
          /stack.*trace/i,
          /internal.*error/i,
          /exception.*at/i,
        ];
        
        if (errorPatterns.some(pattern => pattern.test(responseText))) {
          return true; // Information disclosure
        }
        
        return false;
      }

      setScanStatus('Triage');
      if (audit.findings) {
        setRecentFindings(audit.findings.slice(0, 3));
        audit.findings.forEach(f => addLog(`[VULN] ${f.severity}: ${f.title} detected in Neural Sandbox.`, 'warn', 90));
      }

      setProgress(100);
      addLog(`[SUCCESS] Forensic debriefing ready. Sandbox destroyed.`, 'success', 100);
      
      // Calculate final data quality metrics
      const calculateTrustScore = (
        domSuccess: boolean,
        headersSuccess: boolean,
        sslSuccess: boolean,
        dnsSuccess: boolean,
        osintSuccess: boolean,
        probeSuccessRate: number
      ): number => {
        // Weighted scoring
        const weights = {
          osint: 3,      // High trust
          aiAnalysis: 3, // High trust (always available if scan completes)
          probes: 3,     // High trust
          dom: 2,        // Medium trust
          ssl: 2,        // Medium trust
          headers: 1,    // Low trust
          dns: 1,        // Low trust
        };
        
        const scores = {
          osint: osintSuccess ? 90 : 0,
          aiAnalysis: 85, // Always available if scan completes
          probes: probeSuccessRate * 90,
          dom: domSuccess ? 60 : 0,
          ssl: sslSuccess ? 70 : 0,
          headers: headersSuccess ? 30 : 0,
          dns: dnsSuccess ? 50 : 0,
        };
        
        const totalScore = (
          scores.osint * weights.osint +
          scores.aiAnalysis * weights.aiAnalysis +
          scores.probes * weights.probes +
          scores.dom * weights.dom +
          scores.ssl * weights.ssl +
          scores.headers * weights.headers +
          scores.dns * weights.dns
        ) / (Object.values(weights).reduce((a, b) => a + b, 0));
        
        return Math.round(totalScore);
      };
      
      const collectLimitations = (): string[] => {
        const limitations: string[] = [];
        if (!domExtractionSuccess) {
          limitations.push('DOM extraction blocked by CORS');
        }
        if (!headers?.cors?.allowed) {
          limitations.push('Security headers analysis blocked by CORS');
        }
        if (!sslInfo?.valid || sslInfo.grade === 'Unknown') {
          limitations.push('SSL grade unavailable (SSL Labs API not accessible from browser)');
        }
        if (!dnsInfo?.ip) {
          limitations.push('DNS resolution unavailable');
        }
        return limitations;
      };
      
      const probeSuccessRate = probesExecuted > 0 ? probesSuccessful / probesExecuted : 0;
      // OSINT success only counts for STANDARD and DEEP levels
      const osintSuccess = (level === 'STANDARD' || level === 'DEEP') && osintResult.status === 'fulfilled';
      const trustScore = calculateTrustScore(
        domExtractionSuccess,
        headers?.cors?.allowed || false,
        sslInfo?.valid || false,
        !!dnsInfo?.ip,
        osintSuccess,
        probeSuccessRate
      );
      
      const dataQuality = {
        trustScore,
        limitations: collectLimitations(),
        corsCompensation: corsStatus.directScanBlocked, // Track AI compensation mode
        sources: {
          dom: domExtractionSuccess,
          headers: headers?.cors?.allowed || false,
          ssl: sslInfo?.valid || false,
          dns: !!dnsInfo?.ip,
          osint: (level === 'STANDARD' || level === 'DEEP') && osintResult.status === 'fulfilled',
          probes: {
            executed: probesExecuted,
            successful: probesSuccessful,
          },
        },
      };
      
      // Extract grounding sources from OSINT discovery (only for STANDARD and DEEP)
      const groundingSources = (level === 'STANDARD' || level === 'DEEP') && disc.sources && Array.isArray(disc.sources) && disc.sources.length > 0
        ? disc.sources.map((source: any) => {
            // Handle different source formats from Google Search Grounding
            if (typeof source === 'string') {
              return { uri: source, url: source };
            } else if (typeof source === 'object' && source !== null) {
              return {
                uri: source.uri || source.url || source.web?.uri || source.web?.url || undefined,
                url: source.url || source.uri || source.web?.url || source.web?.uri || undefined,
                title: source.title || source.web?.title || source.snippet || undefined,
              };
            }
            return undefined;
          }).filter((s): s is { uri?: string; url?: string; title?: string } => s !== undefined)
        : undefined;

      // Add data quality and grounding sources to mission report
      const reportWithQuality = {
        ...audit,
        dataQuality,
        targetIntelligence: {
          ...audit.targetIntelligence,
          groundingSources: groundingSources && groundingSources.length > 0 ? groundingSources : undefined,
        },
      };

      // Finding Verification (Check First): drop findings for endpoints that return 404
      let finalReport = await verifyFindings(target, reportWithQuality, expertOptions);
      if ((reportWithQuality.findings?.length || 0) !== (finalReport.findings?.length || 0)) {
        const removed = (reportWithQuality.findings?.length || 0) - (finalReport.findings?.length || 0);
        addLog(`[VERIFY] Removed ${removed} finding(s) for non-existent endpoints (404)`, 'info', 94);
      }

      // Tech DNA: keep all AI-reported tech; remove false positives; merge ground truth so we always show detected tech
      let dnaList = Array.isArray(finalReport.technologyDNA) ? [...finalReport.technologyDNA] : [];
      const groundNames = new Set(techFingerprint.map((f) => f.name.toLowerCase()));
      if (groundNames.has('vite')) {
        dnaList = dnaList.filter((t) => (t.name || '').toLowerCase() !== 'next.js');
      }
      const seenNames = new Set(dnaList.map((t) => (t.name || '').toLowerCase()));
      for (const f of techFingerprint) {
        const key = f.name.toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          dnaList.push({
            name: f.name,
            version: f.version || '',
            category: f.category,
            status: 'Stable',
            actionPlan: f.evidence || 'Detected from scan.',
            cves: [],
            cveLinks: undefined,
          });
        }
      }
      finalReport = { ...finalReport, technologyDNA: dnaList };
      // Report includes AI probes + sensitive path probes (already filtered by target domain)
      finalReport = { ...finalReport, activeProbes: probesToRun };

      setMissionReport(finalReport);
      addLog(`[DATA_QUALITY] Trust score: ${trustScore}%`, trustScore >= 80 ? 'success' : trustScore >= 60 ? 'warn' : 'error', 95);
      if (dataQuality.limitations.length > 0) {
        addLog(`[DATA_QUALITY] Limitations: ${dataQuality.limitations.join(', ')}`, 'warn', 96);
      }
      
      // Record scan end time
      const endTime = new Date();
      setScanEndTime(endTime);
      
      setTimeout(() => setMissionPhase('Debriefing'), 1500);

    } catch (e: any) {
      const errorMsg = e.message || "Unknown error occurred.";
      
      // Check if error is related to API key
      const isApiKeyError = (e as any)?.isApiKeyError || 
                           errorMsg.includes('API_KEY') || 
                           errorMsg.includes('API key') || 
                           errorMsg.includes('401') || 
                           errorMsg.includes('403') || 
                           errorMsg.includes('invalid') || 
                           errorMsg.includes('unauthorized') ||
                           errorMsg.includes('authentication') ||
                           errorMsg.includes('permission denied');
      
      if (isApiKeyError) {
        // Mark API key as invalid in context
        setApiKeyStatus('invalid');
        addLog(`[FATAL] API_KEY_ERROR: ${errorMsg}`, 'error', 0);
        addLog(`[FATAL] API key is invalid, expired, or lacks permissions. Please reconfigure in Neural Core Auth modal.`, 'error', 0);
        // Show error modal instead of redirecting
        setError({
          message: errorMsg,
          type: 'api_key'
        });
        setProgress(0);
        setScanStatus('Idle');
      } else {
        // Parse API error JSON (e.g. {"error":{"code":503,"message":"The model is overloaded..."}})
        let userMessage = errorMsg;
        let errorType: 'api_key' | 'network' | 'rate_limit' | 'service_busy' | 'unknown' = 'unknown';

        try {
          const parsed = JSON.parse(errorMsg);
          const code = parsed?.error?.code;
          const msg = parsed?.error?.message || '';
          if (code === 503 || code === 500 || (msg && (msg.toLowerCase().includes('overloaded') || msg.toLowerCase().includes('unavailable')))) {
            errorType = 'service_busy';
            userMessage = msg || 'The AI service is temporarily busy. Please try again in 1–2 minutes.';
          } else if (code === 429 || (msg && msg.toLowerCase().includes('too many requests'))) {
            errorType = 'rate_limit';
            userMessage = formatRateLimitMessage(msg || 'Too many requests. Please wait 1–2 minutes and try again.');
          }
        } catch {
          // Not JSON; check raw message for 503/429/overloaded
          if (errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('unavailable') || errorMsg.includes('500')) {
            errorType = 'service_busy';
            userMessage = 'The AI service is temporarily busy. Please try again in 1–2 minutes.';
          } else if (errorMsg.includes('429') || errorMsg.includes('too many requests') || errorMsg.includes('quota')) {
            errorType = 'rate_limit';
            userMessage = formatRateLimitMessage(errorMsg);
          }
        }

        // Check for network-related errors (only if not already service_busy/rate_limit)
        if (errorType === 'unknown' &&
            (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('CORS') ||
            errorMsg.includes('Failed to load') || errorMsg.includes('DNS') || errorMsg.includes('timeout') ||
            errorMsg.includes('connection') || errorMsg.includes('unreachable') || errorMsg.includes('not exist') ||
            errorMsg.includes('404') || errorMsg.includes('not found'))) {
          errorType = 'network';
          if (errorMsg.includes('DNS') || errorMsg.includes('not exist') || errorMsg.includes('cannot resolve')) {
            userMessage = `Website not found: "${domain || url}". The domain may not exist or DNS cannot resolve it. Please verify the URL is correct.`;
          } else if (errorMsg.includes('timeout') || errorMsg.includes('did not respond')) {
            userMessage = `Connection timeout: "${domain || url}" did not respond. The website may be down or unreachable.`;
          } else if (errorMsg.includes('Failed to load') || errorMsg.includes('unreachable') || errorMsg.includes('404') || errorMsg.includes('not found')) {
            userMessage = `Cannot reach website: "${domain || url}". The website may not exist, is down, or is blocking connections. Please check if the URL is correct.`;
          } else if (errorMsg.includes('CORS') || errorMsg.includes('cross-origin')) {
            userMessage = `CORS blocked: "${domain || url}" blocks cross-origin access. This is expected for some websites.`;
          } else {
            userMessage = `Network error accessing "${domain || url}": ${errorMsg}`;
          }
        } else if (errorType === 'unknown') {
          userMessage = errorMsg;
        }

        addLog(`[FATAL] MISSION_ABORTED: ${userMessage}`, 'error', 0);
        setError({
          message: userMessage,
          type: errorType
        });
        setProgress(0);
        setScanStatus('Idle');
        setMissionPhase('Briefing');
      }
    }
  };

  const resetMission = () => {
    setMissionPhase('Briefing');
    setScanStatus('Idle');
    setTelemetry([]);
    setDispatchedProbes([]);
    setMissionReport(INITIAL_REPORT);
    setProgress(0);
    setRecentFindings([]);
    setUsage({ tokens: 0, cost: 0 });
    setError(null);
    setScanStartTime(null);
    setScanEndTime(null);
  };

  const clearError = () => {
    setError(null);
    setMissionPhase('Briefing');
    setScanStatus('Idle');
    setProgress(0);
  };

  // Mission duration: show real elapsed time; sub-second completed scans show "< 1s"
  const missionDuration = useMemo(() => {
    if (!scanStartTime) return null;
    const endTime = scanEndTime || new Date();
    const durationMs = Math.max(0, endTime.getTime() - scanStartTime.getTime());
    const rawSeconds = Math.floor(durationMs / 1000);
    const subSecond = rawSeconds < 1 && scanEndTime;
    const minutes = Math.floor(rawSeconds / 60);
    const remainingSeconds = rawSeconds % 60;
    
    const formatted = subSecond
      ? '< 1s'
      : minutes > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${rawSeconds}s`;
    const formattedFull = subSecond
      ? 'less than 1 second'
      : minutes > 0
        ? `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`
        : `${rawSeconds} second${rawSeconds !== 1 ? 's' : ''}`;
    
    return {
      startTime: scanStartTime,
      endTime: scanEndTime || endTime,
      durationMs,
      formatted,
      formattedFull,
    };
  }, [scanStartTime, scanEndTime]);

  return { missionPhase, scanStatus, progress, telemetry, missionReport, usage, targetUrl, currentLevel, recentFindings, dispatchedProbes, error, missionDuration, runMission, resetMission, clearError };
};
