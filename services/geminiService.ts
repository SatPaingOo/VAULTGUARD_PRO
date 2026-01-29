
import { GoogleGenAI, Type } from "@google/genai";
import { maskData } from "../utils/masking";
import { AI_CONSTANTS, NETWORK_CONSTANTS, API_KEY_CONSTANTS } from "../constants";

export interface TechItem {
  name: string;
  version: string;
  category: 'Frontend' | 'Backend' | 'Library' | 'Server' | 'Database';
  status: 'Stable' | 'Outdated' | 'Legacy' | 'End of Life';
  cves?: string[];
  advisory?: string;
  actionPlan: string;
}

export interface VerificationPayload {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  payload?: string;
  description: string;
  expectedBehavior: string;
}

export interface VulnerabilityFinding {
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  remediation: string;
  businessImpact: string;
  cwe: string;
  origin: string;
  poc: string;
  confidence?: 'High' | 'Medium' | 'Low';
  evidence?: string[];
}

export interface DigitalFootprint {
  type: string;
  value: string;
  source: string;
  timestamp?: string;
}

export interface DataQuality {
  trustScore: number; // 0-100
  limitations: string[]; // e.g., ["CORS blocked DOM extraction"]
  corsCompensation?: boolean; // AI compensation mode flag
  sources: {
    dom: boolean;
    headers: boolean;
    ssl: boolean;
    dns: boolean;
    osint: boolean;
    probes: {
      executed: number;
      successful: number;
    };
  };
}

export interface UsageMetadata {
  totalTokenCount?: number;
  inputTokenCount?: number;
  outputTokenCount?: number;
}

export interface MissionReport {
  targetIntelligence: {
    purpose: string;
    businessLogic: string;
    attackSurfaceSummary: string;
    forensicAnalysis: string;
    apis: string[];
    associatedLinks: string[];
    hosting: {
      provider: string;
      location: string;
      ip: string;
      latitude: number;
      longitude: number;
    };
    groundingSources?: Array<{
      uri?: string;
      url?: string;
      title?: string;
    }>;
  };
  activeProbes: VerificationPayload[];
  digitalFootprint: DigitalFootprint[];
  technologyDNA: TechItem[];
  findings: VulnerabilityFinding[];
  securityScore: number;
  confidenceScore: number;
  usage?: UsageMetadata;
  sources?: string[];
  dataQuality?: DataQuality;
}

export type ScanLevel = 'FAST' | 'STANDARD' | 'DEEP';

export const LEVEL_COLORS: Record<ScanLevel, string> = {
  FAST: '#4ade80',
  STANDARD: '#00d4ff',
  DEEP: '#ef4444'
};

export class GeminiService {
  private apiKey: string;

  constructor(apiKey?: string) {
    // API key passed from React Context, NOT from localStorage
    // Standardize on GEMINI_API_KEY environment variable
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
  }

  /**
   * Resolves the current active API key from constructor parameter or env.
   * No longer reads from localStorage - key must be passed from React Context.
   * Standardized to use GEMINI_API_KEY environment variable.
   */
  private getActiveKey(): string {
    return this.apiKey || process.env.GEMINI_API_KEY || "";
  }

  /**
   * Enhanced retry logic with exponential backoff and jitter.
   * Retries on 429 (rate limit) and 503/500 (service overloaded / unavailable).
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, retries = AI_CONSTANTS.MAX_RETRY_ATTEMPTS, baseDelay = AI_CONSTANTS.RATE_LIMIT_BASE_DELAY_MS): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const errorStr = (error?.message || "").toLowerCase();
      const status = error?.status;
      const isRateLimit = status === 429 || errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('too many requests');
      const isServiceUnavailable = status === 503 || status === 500 ||
        errorStr.includes('503') || errorStr.includes('500') ||
        errorStr.includes('overloaded') || errorStr.includes('unavailable') ||
        errorStr.includes('service unavailable') || errorStr.includes('internal server error');

      const isRetryable = (isRateLimit || isServiceUnavailable) && retries > 0;

      if (isRetryable) {
        const backoff = baseDelay * Math.pow(2, AI_CONSTANTS.MAX_RETRY_ATTEMPTS - retries);
        const jitter = Math.random() * AI_CONSTANTS.RATE_LIMIT_JITTER_MS;
        const totalDelay = backoff + jitter;

        const isDev = import.meta.env?.MODE === 'development' || import.meta.env?.DEV === true;
        if (isDev || retries <= 2) {
          const reason = isRateLimit ? 'Rate limit' : 'Service busy';
          console.warn(`[GeminiService] ${reason}. Retrying in ${Math.round(totalDelay / 1000)}s... (${retries} attempts left)`);
        }
        await new Promise(resolve => setTimeout(resolve, totalDelay));
        return this.executeWithRetry(fn, (retries - 1) as typeof retries, baseDelay);
      }

      // Handle API key errors (401, 403, unauthorized)
      const isApiKeyError = status === 401 || status === 403 || 
                           errorStr.includes('api key') || 
                           errorStr.includes('apikey') ||
                           errorStr.includes('unauthorized') ||
                           errorStr.includes('authentication') ||
                           errorStr.includes("requested entity was not found") ||
                           errorStr.includes('invalid api key') ||
                           errorStr.includes('permission denied');
      
      if (isApiKeyError) {
        const apiKeyError = new Error(`API_KEY_INVALID: API key is invalid, expired, or lacks required permissions. Status: ${status || 'unknown'}`);
        (apiKeyError as any).status = status;
        (apiKeyError as any).isApiKeyError = true;
        throw apiKeyError;
      }
      
      throw error;
    }
  }

  private extractJson(text: string): unknown {
    if (!text || typeof text !== 'string') {
      console.warn('[GeminiService] Empty or invalid text for JSON extraction');
      return {};
    }
    
    try {
      const sanitized = text.trim();
      
      // Try to extract JSON from code blocks first
      const blockMatch = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const target = blockMatch ? blockMatch[1].trim() : sanitized;
      
      // Try parsing the target
      try {
        return JSON.parse(target);
      } catch (parseError) {
        // If that fails, try to find JSON structure in the text
        const structuralMatch = text.match(/\{[\s\S]*\}/);
        if (structuralMatch) {
          try {
            return JSON.parse(structuralMatch[0]);
          } catch (structuralError) {
            console.warn('[GeminiService] Failed to parse JSON structure:', structuralError);
            return {};
          }
        }
        console.warn('[GeminiService] No valid JSON structure found in response');
        return {};
      }
    } catch (e: any) {
      console.error('[GeminiService] Error extracting JSON:', e);
      return {};
    }
  }

  /**
   * ENHANCED: Validate AI response structure to prevent silent failures and ensure accuracy
   */
  private validateMissionReport(result: Record<string, unknown>): MissionReport {
    // Type guard to safely access nested properties
    const getNested = (obj: unknown, path: string[]): unknown => {
      let current: unknown = obj;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return undefined;
        }
      }
      return current;
    };

    // Validate required fields
    const requiredFields = [
      'targetIntelligence',
      'activeProbes',
      'technologyDNA',
      'findings',
      'securityScore',
      'confidenceScore'
    ];

    const missingFields = requiredFields.filter(field => !result[field]);
    if (missingFields.length > 0) {
      console.warn('[GeminiService] Missing required fields:', missingFields);
      // Fill with defaults rather than throwing
    }

    // Ensure arrays are arrays
    const findings = Array.isArray(result.findings) ? result.findings : [];
    const activeProbes = Array.isArray(result.activeProbes) ? result.activeProbes : [];
    const technologyDNA = Array.isArray(result.technologyDNA) ? result.technologyDNA : [];

    // Validate and clean findings array - ensure all required fields exist
    const validatedFindings = findings.map((finding: unknown, index: number) => {
      if (!finding || typeof finding !== 'object') return null;
      const f = finding as Record<string, unknown>;
        // Ensure all required fields exist
        if (!f.title || typeof f.title !== 'string') {
          console.warn(`[GeminiService] Finding ${index} missing title, skipping`);
          return null;
        }
        return {
          title: typeof f.title === 'string' ? f.title : `Finding ${index + 1}`,
          description: typeof f.description === 'string' ? f.description : 'No description provided.',
          severity: (typeof f.severity === 'string' && ['Low', 'Medium', 'High', 'Critical'].includes(f.severity))
            ? f.severity as 'Low' | 'Medium' | 'High' | 'Critical'
            : 'Medium' as const,
          remediation: typeof f.remediation === 'string' ? f.remediation : 'No remediation provided.',
          businessImpact: typeof f.businessImpact === 'string' ? f.businessImpact : 'Impact assessment not available.',
          cwe: typeof f.cwe === 'string' ? f.cwe : 'N/A',
          origin: typeof f.origin === 'string' ? f.origin : 'Unknown',
          poc: typeof f.poc === 'string' ? f.poc : 'No proof-of-concept provided.',
          confidence: (typeof f.confidence === 'string' && ['High', 'Medium', 'Low'].includes(f.confidence))
            ? f.confidence as 'High' | 'Medium' | 'Low'
            : 'Medium' as const,
          evidence: Array.isArray(f.evidence) ? f.evidence.filter((e): e is string => typeof e === 'string') : [],
        };
      }).filter((f): f is NonNullable<typeof f> => f !== null) as VulnerabilityFinding[]; // Remove null entries

    // Validate and clean technologyDNA array
    const validatedTechDNA = technologyDNA.map((tech: unknown) => {
      if (!tech || typeof tech !== 'object') {
        return {
          name: 'Unknown',
          version: 'Unknown',
          category: 'Library' as const,
          status: 'Stable' as const,
          actionPlan: 'No action plan provided.',
          cves: [],
        };
      }
      const t = tech as Record<string, unknown>;
      return {
        name: typeof t.name === 'string' ? t.name : 'Unknown',
        version: typeof t.version === 'string' ? t.version : 'Unknown',
        category: (typeof t.category === 'string' && ['Frontend', 'Backend', 'Library', 'Server', 'Database'].includes(t.category))
          ? t.category as TechItem['category']
          : 'Library' as const,
        status: (typeof t.status === 'string' && ['Stable', 'Outdated', 'Legacy', 'End of Life'].includes(t.status))
          ? t.status as TechItem['status']
          : 'Stable' as const,
        actionPlan: typeof t.actionPlan === 'string' ? t.actionPlan : 'No action plan provided.',
        cves: Array.isArray(t.cves) ? t.cves.filter((cve): cve is string => typeof cve === 'string') : [],
        advisory: typeof t.advisory === 'string' ? t.advisory : undefined,
      };
    });

    // Validate nested structures
    const targetIntelligence = result.targetIntelligence && typeof result.targetIntelligence === 'object'
      ? result.targetIntelligence as Record<string, unknown>
      : null;
    
    const validatedTargetIntelligence = targetIntelligence ? {
      purpose: typeof targetIntelligence.purpose === 'string' ? targetIntelligence.purpose : 'Analysis incomplete',
      businessLogic: typeof targetIntelligence.businessLogic === 'string' ? targetIntelligence.businessLogic : 'Analysis incomplete',
      attackSurfaceSummary: typeof targetIntelligence.attackSurfaceSummary === 'string' ? targetIntelligence.attackSurfaceSummary : 'Analysis incomplete',
      forensicAnalysis: typeof targetIntelligence.forensicAnalysis === 'string' ? targetIntelligence.forensicAnalysis : 'Analysis incomplete',
      apis: Array.isArray(targetIntelligence.apis) ? targetIntelligence.apis.filter((api): api is string => typeof api === 'string') : [],
      associatedLinks: Array.isArray(targetIntelligence.associatedLinks) ? targetIntelligence.associatedLinks.filter((link): link is string => typeof link === 'string') : [],
      hosting: (() => {
        const hosting = targetIntelligence.hosting;
        if (hosting && typeof hosting === 'object') {
          const h = hosting as Record<string, unknown>;
          return {
            provider: typeof h.provider === 'string' ? h.provider : 'Unknown',
            location: typeof h.location === 'string' ? h.location : 'Unknown',
            ip: typeof h.ip === 'string' ? h.ip : '0.0.0.0',
            latitude: typeof h.latitude === 'number' ? h.latitude : 0,
            longitude: typeof h.longitude === 'number' ? h.longitude : 0,
          };
        }
        return {
          provider: 'Unknown',
          location: 'Unknown',
          ip: '0.0.0.0',
          latitude: 0,
          longitude: 0
        };
      })(),
      groundingSources: Array.isArray(targetIntelligence.groundingSources) 
        ? targetIntelligence.groundingSources.filter((s): s is { uri?: string; url?: string; title?: string } => 
            typeof s === 'object' && s !== null && (typeof s === 'object')
          ).map(s => ({
            uri: typeof (s as any).uri === 'string' ? (s as any).uri : undefined,
            url: typeof (s as any).url === 'string' ? (s as any).url : undefined,
            title: typeof (s as any).title === 'string' ? (s as any).title : undefined,
          }))
        : undefined,
    } : {
      purpose: 'Analysis incomplete',
      businessLogic: 'Analysis incomplete',
      attackSurfaceSummary: 'Analysis incomplete',
      forensicAnalysis: 'Analysis incomplete',
      apis: [],
      associatedLinks: [],
      hosting: {
        provider: 'Unknown',
        location: 'Unknown',
        ip: '0.0.0.0',
        latitude: 0,
        longitude: 0
      },
      groundingSources: undefined
    };

    // Ensure scores are numbers and within valid range
    const securityScore = typeof result.securityScore === 'number' && !isNaN(result.securityScore)
      ? Math.max(0, Math.min(100, Math.round(result.securityScore)))
      : 0;
    
    const confidenceScore = typeof result.confidenceScore === 'number' && !isNaN(result.confidenceScore)
      ? Math.max(0, Math.min(100, Math.round(result.confidenceScore)))
      : 0;

    return {
      targetIntelligence: validatedTargetIntelligence,
      activeProbes: activeProbes.filter((probe): probe is VerificationPayload => {
        return probe && typeof probe === 'object' &&
          typeof (probe as Record<string, unknown>).method === 'string' &&
          typeof (probe as Record<string, unknown>).endpoint === 'string';
      }).map(probe => probe as VerificationPayload),
      digitalFootprint: Array.isArray(result.digitalFootprint) ? result.digitalFootprint : [],
      technologyDNA: validatedTechDNA,
      findings: validatedFindings,
      securityScore,
      confidenceScore,
      usage: result.usage && typeof result.usage === 'object' ? result.usage as UsageMetadata : undefined,
      sources: Array.isArray(result.sources) ? result.sources.filter((s): s is string => typeof s === 'string') : undefined,
      dataQuality: result.dataQuality && typeof result.dataQuality === 'object' ? result.dataQuality as DataQuality : undefined,
    };
  }

  async performDeepAudit(
    targetUrl: string, 
    signals: string, 
    level: ScanLevel, 
    reconIntel: string = "", 
    language: string = "English",
    tierBasedData?: any, // OPTIMIZED: Tier-based data for token reduction
    corsStatus?: { domBlocked: boolean; headersBlocked: boolean; sslBlocked: boolean; directScanBlocked: boolean } // CORS status for AI compensation
  ): Promise<MissionReport> {
    const isDeep = level === 'DEEP';
    const modelName = isDeep ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    return this.executeWithRetry(async () => {
      // Re-initialize client before each call to ensure the latest resolved key is used
      const ai = new GoogleGenAI({ apiKey: this.getActiveKey() });
      const config: any = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetIntelligence: {
              type: Type.OBJECT,
              properties: {
                purpose: { type: Type.STRING },
                businessLogic: { type: Type.STRING },
                attackSurfaceSummary: { type: Type.STRING },
                forensicAnalysis: { type: Type.STRING },
                apis: { type: Type.ARRAY, items: { type: Type.STRING } },
                associatedLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
                hosting: {
                  type: Type.OBJECT,
                  properties: {
                    provider: { type: Type.STRING }, location: { type: Type.STRING }, ip: { type: Type.STRING },
                    latitude: { type: Type.NUMBER }, longitude: { type: Type.NUMBER }
                  },
                  required: ['provider', 'location', 'ip', 'latitude', 'longitude']
                }
              },
              required: ['purpose', 'businessLogic', 'attackSurfaceSummary', 'forensicAnalysis', 'apis', 'associatedLinks', 'hosting']
            },
            activeProbes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  method: { type: Type.STRING, enum: ['GET', 'POST', 'PUT', 'DELETE'] },
                  endpoint: { type: Type.STRING },
                  payload: { type: Type.STRING },
                  description: { type: Type.STRING },
                  expectedBehavior: { type: Type.STRING }
                },
                required: ['method', 'endpoint', 'description', 'expectedBehavior']
              }
            },
            technologyDNA: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  name: { type: Type.STRING }, version: { type: Type.STRING }, category: { type: Type.STRING }, status: { type: Type.STRING }, actionPlan: { type: Type.STRING } 
                }, 
                required: ['name', 'version', 'category', 'status', 'actionPlan'] 
              } 
            },
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING }, 
                  description: { type: Type.STRING }, 
                  severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] },
                  remediation: { type: Type.STRING }, 
                  businessImpact: { type: Type.STRING }, 
                  cwe: { type: Type.STRING }, 
                  origin: { type: Type.STRING },
                  poc: { type: Type.STRING, description: "Technical Proof-of-Concept script or detailed curl command sequences." },
                  confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "Confidence level based on evidence quality" },
                  evidence: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Data sources that led to this finding (e.g., headers, DOM, SSL, DNS, probes)" }
                },
                required: ['title', 'description', 'severity', 'remediation', 'businessImpact', 'cwe', 'origin', 'poc']
              },
            },
            securityScore: { type: Type.NUMBER },
            confidenceScore: { type: Type.NUMBER }
          },
          required: ['targetIntelligence', 'activeProbes', 'technologyDNA', 'findings', 'securityScore', 'confidenceScore']
        }
      };

      if (isDeep) {
        config.thinkingConfig = { thinkingBudget: AI_CONSTANTS.DEEP_THINKING_BUDGET };
      }

      // OPTIMIZED: Tier-based prompt (send only relevant data per level)
      let promptData = '';
      if (tierBasedData) {
        // Use tier-based data to reduce token usage
        if (level === 'FAST') {
          promptData = `NETWORK_DATA: ${JSON.stringify({
            headers: tierBasedData.headers,
            ssl: tierBasedData.sslInfo,
            dns: tierBasedData.dnsInfo,
          })}`;
        } else if (level === 'STANDARD') {
          promptData = `NETWORK_DATA: ${JSON.stringify({
            headers: tierBasedData.headers,
            ssl: tierBasedData.sslInfo,
            dns: tierBasedData.dnsInfo,
          })}
DOM_SIGNALS: ${maskData(tierBasedData.signals || signals)}`;
        } else {
          // DEEP: Full data
          promptData = `NETWORK_DATA: ${JSON.stringify({
            headers: tierBasedData.headers,
            ssl: tierBasedData.sslInfo,
            dns: tierBasedData.dnsInfo,
          })}
DOM_SIGNALS: ${maskData(tierBasedData.signals || signals)}
FULL_DOM: ${tierBasedData.dom ? maskData(tierBasedData.dom.substring(0, NETWORK_CONSTANTS.MAX_DOM_CHARS)) : 'N/A'}`;
        }
      } else {
        // Fallback: Use original method
        promptData = `DOM_SIGNALS: ${maskData(signals)}`;
      }

      // Level-specific mission instructions
      const levelInstructions: Record<ScanLevel, string> = {
        FAST: `MISSION_FOCUS: Network Perimeter & SSL/TLS Security
- Analyze security headers (CSP, HSTS, X-Frame-Options, etc.)
- Evaluate SSL/TLS certificate configuration and grade
- Check DNS records and IP resolution
- Identify network-level vulnerabilities (missing headers, weak SSL config)
- DO NOT analyze DOM structure or client-side code
- Focus on infrastructure security posture`,
        STANDARD: `MISSION_FOCUS: Software DNA & Dependency CVEs
- Perform all FAST level analyses
- Extract and analyze technology stack (frameworks, libraries, versions)
- Cross-reference detected technologies with live CVE databases via Search Grounding
- Analyze security signals from DOM (forms, scripts, meta tags)
- Detect client-side vulnerabilities (XSS, CSRF, DOM-based flaws)
- Identify outdated dependencies and known CVEs
- Provide action plans for each technology`,
        DEEP: `MISSION_FOCUS: Business Logic & Exploit Chaining
- Perform all STANDARD level analyses
- Analyze complete DOM structure (up to 50K chars) for logic flaws
- Simulate multi-step attack chains and exploit paths
- Identify business logic vulnerabilities (auth bypass, privilege escalation, etc.)
- Chain multiple vulnerabilities to demonstrate attack scenarios
- Provide detailed forensic deduction about attack surface
- Use extended reasoning (32K thinking budget) for complex triage`
      };

      // Build CORS compensation context
      const corsContext = corsStatus?.directScanBlocked ? `
  
⚠️ CORS_RESTRICTION_DETECTED: Direct scan blocked by CORS policy (browser security restriction).

AVAILABLE_DATA_SOURCES:
- SSL/TLS Info: ${tierBasedData?.sslInfo ? JSON.stringify(tierBasedData.sslInfo) : 'Limited/Blocked'}
- DNS Records: ${tierBasedData?.dnsInfo ? JSON.stringify(tierBasedData.dnsInfo) : 'Limited'}
- OSINT Intelligence: ${reconIntel ? 'Available (from Search Grounding)' : 'Limited'}
- Security Headers: ${tierBasedData?.headers ? 'Partially Available' : 'Blocked by CORS'}

AI_INTELLIGENCE_COMPENSATION_MODE:
You are operating in AI compensation mode due to CORS restrictions. Use your advanced reasoning capabilities to:

1. **Infer Security Posture**: Analyze available network data (SSL grade, DNS records, IP info) to infer overall security posture
2. **CVE Cross-Reference**: Use Search Grounding to cross-reference detected technologies/versions with live CVE databases
3. **Intelligent Deduction**: Make evidence-based deductions about potential vulnerabilities:
   - SSL/TLS misconfigurations (weak protocols, expired certs, poor grades)
   - DNS security issues (open resolvers, missing DNSSEC, suspicious records)
   - Infrastructure vulnerabilities inferred from OSINT data
   - Technology stack inference from available metadata
4. **Risk Assessment**: Provide security score and confidence based on available data quality
5. **Transparency**: Clearly indicate in findings which are:
   - **High Confidence**: Based on concrete available data (SSL, DNS, OSINT)
   - **Medium Confidence**: Inferred from patterns and intelligence
   - **Low Confidence**: Assumptions based on limited data

This demonstrates AI-powered workaround for browser security restrictions - turning limitations into intelligent analysis opportunities.

CRITICAL: Do not fabricate findings. Only report vulnerabilities with clear evidence from available data sources.` : '';

      const prompt = `[MISSION_COMMAND: ACTIVE_SOC_FORENSIC_V9.0]
TARGET: ${targetUrl} | LEVEL: ${level}
RECON_INTEL: ${reconIntel.substring(0, AI_CONSTANTS.MAX_RECON_INTEL_LENGTH)}
${promptData}
${corsContext}

${levelInstructions[level]}

CORE MISSION:
Analyze the target for vulnerabilities and logic flaws according to the mission focus above.
${corsStatus?.directScanBlocked ? 'NOTE: Operating in CORS compensation mode - use available data intelligently.' : ''}

CRITICAL ACCURACY REQUIREMENTS:
- PRIORITIZE PRECISION OVER SPEED: Take time to analyze thoroughly. Accuracy is more important than speed.
- CROSS-VALIDATE FINDINGS: Verify each vulnerability with multiple data sources before reporting.
- EVIDENCE-BASED ANALYSIS: Only report vulnerabilities with clear evidence from the provided data.
- PREVENT FALSE POSITIVES: Do not report potential vulnerabilities without concrete evidence. Only confirmed issues.
- DETAILED REMEDIATION: Provide specific, actionable remediation steps with code examples where applicable.
- CONFIDENCE RATING: Rate your confidence level for each finding (High/Medium/Low) based on evidence quality.
- DATA SOURCE ATTRIBUTION: Note which data source (headers, DOM, SSL, DNS, probes) led to each finding.
- COMPREHENSIVE ANALYSIS: Be thorough - missing a real vulnerability is worse than taking extra time.

OUTPUT REQUIREMENTS:
- Output strict JSON according to the schema
- All findings must include: title, description, severity, remediation, businessImpact, cwe, origin, poc
- Technology DNA must include: name, version, category, status, actionPlan
- Security score must be calculated based on actual findings (0-100)
- Confidence score must reflect overall analysis quality (0-100)
- PDF_EXPORT: Write ALL report text fields in English only (purpose, businessLogic, attackSurfaceSummary, forensicAnalysis, technology actionPlan, probe description, finding title/description/remediation/businessImpact/poc) so the PDF debrief displays correctly. Use English regardless of UI language.
- Output in ${language}`;

      const response = await ai.models.generateContent({ model: modelName, contents: prompt, config });
      
      // Enhanced error handling for response parsing
      if (!response || !response.text) {
        throw new Error('AI response is empty or invalid. Please try again.');
      }
      
      const result = this.extractJson(response.text);
      
      // Validate response structure with enhanced error handling
      if (!result || typeof result !== 'object') {
        console.error('[GeminiService] Invalid response structure:', result);
        throw new Error('AI response structure is invalid. Please try again.');
      }
      
      const validatedResult = this.validateMissionReport(result as Record<string, unknown>);
      
      // Ensure usage metadata exists
      const usage = response.usageMetadata || { totalTokenCount: 0 };
      
      return Object.assign({}, validatedResult, { usage: usage as UsageMetadata });
    });
  }

  async runIntelligenceDiscovery(domain: string, targetUrl: string, language: string = "English"): Promise<any> {
    return this.executeWithRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: this.getActiveKey() });
      const prompt = `[OSINT_TACTICAL_V6] Target: ${domain}
Provide precise Infrastructure, IP, Provider, and Geo-coordinates using Grounding. Output in JSON format. Language: ${language}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        }
      });

      const result = this.extractJson(response.text);
      if (result && typeof result === 'object') {
        return Object.assign({}, result, { 
          usage: response.usageMetadata, 
          sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
        });
      }
      return { usage: response.usageMetadata, sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
    });
  }
}
