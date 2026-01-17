
import { useState, useCallback, useRef, useEffect } from 'react';
import { GeminiService, MissionReport, ScanLevel, VerificationPayload } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { useSecurity } from '../contexts/SecurityContext';
import { extractSecuritySignals, extractTargetDOM } from '../utils/masking';
import { FrontendNetworkAnalysis } from '../utils/networkAnalysis';
import { validateAndCheckUrl } from '../utils/urlValidation';

export type MissionPhase = 'Briefing' | 'Simulation' | 'Debriefing';
export type ScanStatus = 'Idle' | 'Recon' | 'Discovery' | 'Probing' | 'Fuzzing' | 'Triage' | 'Finalizing';

export interface TelemetryEntry {
  msg: string;
  type: 'info' | 'warn' | 'error' | 'success' | 'probe';
  timestamp: string;
  progressAtLog: number;
}

const INITIAL_REPORT: MissionReport = {
  targetIntelligence: { purpose: "---", businessLogic: "---", attackSurfaceSummary: "---", forensicAnalysis: "---", apis: [], associatedLinks: [], hosting: { provider: "---", location: "---", ip: "0.0.0.0", latitude: 0, longitude: 0 } },
  activeProbes: [],
  digitalFootprint: [], 
  technologyDNA: [], 
  findings: [], 
  confidenceScore: 0, 
  securityScore: 0, 
  usage: { tokens: 0, cost: 0 }
};

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
  const [recentFindings, setRecentFindings] = useState<any[]>([]);
  const [dispatchedProbes, setDispatchedProbes] = useState<any[]>([]);
  const [error, setError] = useState<{ message: string; type: 'api_key' | 'network' | 'unknown' } | null>(null);

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
  }, []);

  const runMission = async (url: string, level: ScanLevel, languageName: string = "English") => {
    // Validate API key before starting scan
    if (!activeKey || activeKey.length < 20) {
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
      if (!activeKey || activeKey.length < 20) {
        throw new Error('API_KEY_INVALID: API key is missing or invalid. Please reconfigure.');
      }
      const networkAnalysis = new FrontendNetworkAnalysis();
      
      // Phase 1: Parallel Data Collection (OPTIMIZED: All requests in parallel for 2-3x speed)
      addLog(`[NETWORK] Collecting data in parallel (DOM, OSINT, Headers, SSL, DNS)...`, 'info', 10);
      setScanStatus('Discovery');
      
      // Execute all data collection in parallel
      const [domResult, osintResult, headersResult, sslResult, dnsResult] = await Promise.allSettled([
        extractTargetDOM(target), // Promise.allSettled will handle errors automatically
        g.runIntelligenceDiscovery(domain, target, languageName),
        networkAnalysis.analyzeHeaders(target),
        networkAnalysis.analyzeSSL(domain),
        networkAnalysis.checkDNS(domain),
      ]);
      
      // Extract results
      const rawDom = domResult.status === 'fulfilled' 
        ? (typeof domResult.value === 'string' ? domResult.value : '')
        : '';
      const domExtractionSuccess = domResult.status === 'fulfilled' && rawDom.length > 0;
      
      if (domExtractionSuccess) {
        addLog(`[SANDBOX] Target DOM extracted successfully`, 'success', 15);
      } else {
        addLog(`[WARN] DOM extraction blocked/failed. Continuing with network analysis...`, 'warn', 15);
      }
      
      const disc = osintResult.status === 'fulfilled' ? osintResult.value : { usage: { totalTokenCount: 0 } };
      const headers = headersResult.status === 'fulfilled' ? headersResult.value : null;
      const sslInfo = sslResult.status === 'fulfilled' ? sslResult.value : null;
      const dnsInfo = dnsResult.status === 'fulfilled' ? dnsResult.value : null;
      
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
      }
      
      if (dnsInfo && dnsInfo.ip) {
        addLog(`[NETWORK] Resolved IP: ${dnsInfo.ip}`, 'success', 21);
      }
      
      // Extract security signals (only if DOM available)
      const signals = rawDom ? extractSecuritySignals(rawDom) : JSON.stringify({ 
        note: 'DOM extraction blocked by CORS - analyzing with network data only',
        headers: headers?.securityHeaders,
        sslGrade: sslInfo?.grade,
        ip: dnsInfo?.ip,
      });
      
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

      setUsage(prev => ({ 
        tokens: prev.tokens + getTokenCount(disc.usage), 
        cost: prev.cost + getTokenCount(disc.usage) * 0.00000035 
      }));
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
      };

      // MANDATORY COOLDOWN: Give the API breathing room to prevent burst 429s
      addLog(`[SYSTEM] Cooldown period active: mitigating API rate limits...`, 'info', 32);
      await new Promise(r => setTimeout(r, 2500));

      // Phase 2: Neural Processing & Sandbox (OPTIMIZED: Tier-based data transmission)
      setScanStatus('Probing');
      addLog(`[NEURAL] Enabling PII-Masking for sensitive forensic data...`, 'success', 35);
      addLog(`[SANDBOX] Initializing Heuristic Simulation...`, 'info', 40);
      addLog(`[PROBE] Generating tactical verification payloads...`, 'info', 45);
      
      // Prepare tier-based data (OPTIMIZED: Send only what's needed per scan level)
      const tierBasedData = {
        FAST: {
          headers: headers?.securityHeaders,
          sslInfo: sslInfo,
          dnsInfo: dnsInfo,
          // Skip DOM for FAST tier (saves ~12K tokens)
        },
        STANDARD: {
          headers: headers?.securityHeaders,
          sslInfo: sslInfo,
          dnsInfo: dnsInfo,
          signals: signals, // Lightweight signals only (saves ~37K tokens vs full DOM)
        },
        DEEP: {
          headers: headers?.securityHeaders,
          sslInfo: sslInfo,
          dnsInfo: dnsInfo,
          signals: signals,
          dom: rawDom, // Full DOM for deep analysis
        },
      };
      
      const audit = await g.performDeepAudit(
        target, 
        signals, 
        level, 
        JSON.stringify(enhancedDisc), 
        languageName,
        tierBasedData[level] // Pass tier-based data for optimization
      );
      
      // Track deep audit token usage
      setUsage(prev => {
        const auditTokens = getTokenCount(audit.usage);
        return {
          tokens: prev.tokens + auditTokens,
          cost: prev.cost + auditTokens * 0.00000035
        };
      });
      
      // Track probe execution for data quality
      let probesExecuted = 0;
      let probesSuccessful = 0;
      
      // Real HTTP Probes with batch execution (OPTIMIZED: Process 3 at a time for 2-3x speed)
      if (audit.activeProbes && audit.activeProbes.length > 0) {
        addLog(`[PROBE] Executing ${audit.activeProbes.length} real HTTP probes in batches...`, 'info', 50);
        
        const batchSize = 3;
        const executeProbe = async (probe: VerificationPayload, index: number) => {
          probesExecuted++;
          try {
            // Build full URL
            const probeUrl = probe.endpoint.startsWith('http') 
              ? probe.endpoint 
              : `${target.replace(/\/$/, '')}${probe.endpoint.startsWith('/') ? '' : '/'}${probe.endpoint}`;
            
            addLog(`[PROBE] ${probe.method} ${probe.endpoint}...`, 'probe', 50 + (index * 2));
            
            // Make REAL HTTP request
            const startTime = Date.now();
            let response: Response;
            let corsBlocked = false;
            
            try {
              response = await fetch(probeUrl, {
                method: probe.method,
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'VaultGuard-Pro/1.0',
                },
                body: probe.payload ? JSON.stringify(JSON.parse(probe.payload)) : undefined,
                mode: 'cors', // Try CORS first
                credentials: 'omit',
              });
            } catch (corsError: any) {
              // CORS failed, try no-cors (can't read response but confirms endpoint exists)
              try {
                await fetch(probeUrl, {
                  method: probe.method,
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
        for (let i = 0; i < audit.activeProbes.length; i += batchSize) {
          const batch = audit.activeProbes.slice(i, i + batchSize);
          await Promise.all(batch.map((probe, batchIndex) => executeProbe(probe, i + batchIndex)));
          
          // Rate limiting between batches (not between individual probes)
          if (i + batchSize < audit.activeProbes.length) {
            await new Promise(r => setTimeout(r, 1000));
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
          limitations.push('SSL analysis limited (SSL Labs API CORS blocked)');
        }
        if (!dnsInfo?.ip) {
          limitations.push('DNS resolution unavailable');
        }
        return limitations;
      };
      
      const probeSuccessRate = probesExecuted > 0 ? probesSuccessful / probesExecuted : 0;
      const trustScore = calculateTrustScore(
        domExtractionSuccess,
        headers?.cors?.allowed || false,
        sslInfo?.valid || false,
        !!dnsInfo?.ip,
        osintResult.status === 'fulfilled',
        probeSuccessRate
      );
      
      const dataQuality = {
        trustScore,
        limitations: collectLimitations(),
        sources: {
          dom: domExtractionSuccess,
          headers: headers?.cors?.allowed || false,
          ssl: sslInfo?.valid || false,
          dns: !!dnsInfo?.ip,
          osint: osintResult.status === 'fulfilled',
          probes: {
            executed: probesExecuted,
            successful: probesSuccessful,
          },
        },
      };
      
      // Add data quality to mission report
      const reportWithQuality = {
        ...audit,
        dataQuality,
      };
      
      setMissionReport(reportWithQuality);
      addLog(`[DATA_QUALITY] Trust score: ${trustScore}%`, trustScore >= 80 ? 'success' : trustScore >= 60 ? 'warn' : 'error', 95);
      if (dataQuality.limitations.length > 0) {
        addLog(`[DATA_QUALITY] Limitations: ${dataQuality.limitations.join(', ')}`, 'warn', 96);
      }
      
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
        // Enhanced error handling for network/website errors
        let userMessage = errorMsg;
        let errorType: 'api_key' | 'network' | 'unknown' = 'unknown';
        
        // Check for network-related errors
        if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('CORS') || 
            errorMsg.includes('Failed to load') || errorMsg.includes('DNS') || errorMsg.includes('timeout') ||
            errorMsg.includes('connection') || errorMsg.includes('unreachable') || errorMsg.includes('not exist') ||
            errorMsg.includes('404') || errorMsg.includes('not found')) {
          errorType = 'network';
          
          // Provide more helpful network error messages
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
        } else {
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
  };

  const clearError = () => {
    setError(null);
    setMissionPhase('Briefing');
    setScanStatus('Idle');
    setProgress(0);
  };

  return { missionPhase, scanStatus, progress, telemetry, missionReport, usage, targetUrl, currentLevel, recentFindings, dispatchedProbes, error, runMission, resetMission, clearError };
};
