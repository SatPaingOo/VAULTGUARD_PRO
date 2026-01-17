
import { GoogleGenAI, Type } from "@google/genai";
import { maskData } from "../utils/masking";

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

export interface DataQuality {
  trustScore: number; // 0-100
  limitations: string[]; // e.g., ["CORS blocked DOM extraction"]
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
  };
  activeProbes: VerificationPayload[];
  digitalFootprint: any[];
  technologyDNA: TechItem[];
  findings: any[];
  securityScore: number;
  confidenceScore: number;
  usage?: any;
  sources?: any[];
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
    this.apiKey = apiKey || process.env.API_KEY || "";
  }

  /**
   * Resolves the current active API key from constructor parameter or env.
   * No longer reads from localStorage - key must be passed from React Context.
   */
  private getActiveKey(): string {
    return this.apiKey || process.env.API_KEY || "";
  }

  /**
   * Enhanced retry logic with exponential backoff and jitter to mitigate 429 errors.
   * Improved with longer base delays and better backoff strategy.
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, retries = 5, baseDelay = 5000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const errorStr = (error?.message || "").toLowerCase();
      const status = error?.status;
      const isRateLimit = status === 429 || errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('too many requests');
      
      if (isRateLimit && retries > 0) {
        // More aggressive exponential backoff: 5s, 10s, 20s, 40s, 80s
        const backoff = baseDelay * Math.pow(2, 5 - retries);
        const jitter = Math.random() * 2000; // Increased jitter (0-2s)
        const totalDelay = backoff + jitter;
        
        console.warn(`[GeminiService] Rate limit hit. Retrying in ${Math.round(totalDelay/1000)}s... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
        return this.executeWithRetry(fn, retries - 1, baseDelay);
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

  private extractJson(text: string): any {
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
  private validateMissionReport(result: any): MissionReport {
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
    if (!Array.isArray(result.findings)) {
      console.warn('[GeminiService] Findings is not an array, defaulting to []');
      result.findings = [];
    }

    if (!Array.isArray(result.activeProbes)) {
      console.warn('[GeminiService] ActiveProbes is not an array, defaulting to []');
      result.activeProbes = [];
    }

    if (!Array.isArray(result.technologyDNA)) {
      console.warn('[GeminiService] TechnologyDNA is not an array, defaulting to []');
      result.technologyDNA = [];
    }

    // Validate and clean findings array - ensure all required fields exist
    if (Array.isArray(result.findings)) {
      result.findings = result.findings.map((finding: any, index: number) => {
        // Ensure all required fields exist
        if (!finding.title) {
          console.warn(`[GeminiService] Finding ${index} missing title, skipping`);
          return null;
        }
        return {
          title: finding.title || `Finding ${index + 1}`,
          description: finding.description || 'No description provided.',
          severity: ['Low', 'Medium', 'High', 'Critical'].includes(finding.severity) 
            ? finding.severity 
            : 'Medium',
          remediation: finding.remediation || 'No remediation provided.',
          businessImpact: finding.businessImpact || 'Impact assessment not available.',
          cwe: finding.cwe || 'N/A',
          origin: finding.origin || 'Unknown',
          poc: finding.poc || 'No proof-of-concept provided.',
          confidence: finding.confidence || 'Medium', // Add confidence if missing
          evidence: finding.evidence || [], // Add evidence array if missing
        };
      }).filter((f: any) => f !== null); // Remove null entries
    }

    // Validate and clean technologyDNA array
    if (Array.isArray(result.technologyDNA)) {
      result.technologyDNA = result.technologyDNA.map((tech: any, index: number) => {
        return {
          name: tech.name || `Technology ${index + 1}`,
          version: tech.version || 'Unknown',
          category: ['Frontend', 'Backend', 'Library', 'Server', 'Database'].includes(tech.category)
            ? tech.category
            : 'Library',
          status: ['Stable', 'Outdated', 'Legacy', 'End of Life'].includes(tech.status)
            ? tech.status
            : 'Unknown',
          actionPlan: tech.actionPlan || 'No action plan provided.',
          cves: Array.isArray(tech.cves) ? tech.cves : [],
          advisory: tech.advisory || undefined,
        };
      });
    }

    // Validate nested structures
    if (!result.targetIntelligence) {
      result.targetIntelligence = {
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
        }
      };
    } else {
      // Ensure arrays exist
      if (!Array.isArray(result.targetIntelligence.apis)) {
        result.targetIntelligence.apis = [];
      }
      if (!Array.isArray(result.targetIntelligence.associatedLinks)) {
        result.targetIntelligence.associatedLinks = [];
      }
      
      // Validate hosting structure
      if (!result.targetIntelligence.hosting) {
        result.targetIntelligence.hosting = {
          provider: 'Unknown',
          location: 'Unknown',
          ip: '0.0.0.0',
          latitude: 0,
          longitude: 0
        };
      } else {
        // Ensure all hosting fields are valid
        result.targetIntelligence.hosting = {
          provider: result.targetIntelligence.hosting.provider || 'Unknown',
          location: result.targetIntelligence.hosting.location || 'Unknown',
          ip: result.targetIntelligence.hosting.ip || '0.0.0.0',
          latitude: typeof result.targetIntelligence.hosting.latitude === 'number' 
            ? result.targetIntelligence.hosting.latitude 
            : 0,
          longitude: typeof result.targetIntelligence.hosting.longitude === 'number'
            ? result.targetIntelligence.hosting.longitude
            : 0,
        };
      }
      
      // Ensure all string fields exist
      result.targetIntelligence.purpose = result.targetIntelligence.purpose || 'Analysis incomplete';
      result.targetIntelligence.businessLogic = result.targetIntelligence.businessLogic || 'Analysis incomplete';
      result.targetIntelligence.attackSurfaceSummary = result.targetIntelligence.attackSurfaceSummary || 'Analysis incomplete';
      result.targetIntelligence.forensicAnalysis = result.targetIntelligence.forensicAnalysis || 'Analysis incomplete';
    }

    // Ensure scores are numbers and within valid range
    if (typeof result.securityScore !== 'number' || isNaN(result.securityScore)) {
      result.securityScore = 0;
    } else {
      result.securityScore = Math.max(0, Math.min(100, Math.round(result.securityScore)));
    }
    
    if (typeof result.confidenceScore !== 'number' || isNaN(result.confidenceScore)) {
      result.confidenceScore = 0;
    } else {
      result.confidenceScore = Math.max(0, Math.min(100, Math.round(result.confidenceScore)));
    }

    return result as MissionReport;
  }

  async performDeepAudit(
    targetUrl: string, 
    signals: string, 
    level: ScanLevel, 
    reconIntel: string = "", 
    language: string = "English",
    tierBasedData?: any // OPTIMIZED: Tier-based data for token reduction
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
                required: ['title', 'description', 'severity', 'remediation', 'cwe', 'origin', 'poc']
              },
            },
            securityScore: { type: Type.NUMBER },
            confidenceScore: { type: Type.NUMBER }
          },
          required: ['targetIntelligence', 'activeProbes', 'technologyDNA', 'findings', 'securityScore', 'confidenceScore']
        }
      };

      if (isDeep) {
        config.thinkingConfig = { thinkingBudget: 32768 };
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
FULL_DOM: ${tierBasedData.dom ? maskData(tierBasedData.dom.substring(0, 50000)) : 'N/A'}`;
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

      const prompt = `[MISSION_COMMAND: ACTIVE_SOC_FORENSIC_V9.0]
TARGET: ${targetUrl} | LEVEL: ${level}
RECON_INTEL: ${reconIntel.substring(0, 2000)}
${promptData}

${levelInstructions[level]}

CORE MISSION:
Analyze the target for vulnerabilities and logic flaws according to the mission focus above.

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
      
      const validatedResult = this.validateMissionReport(result);
      
      // Ensure usage metadata exists
      const usage = response.usageMetadata || { totalTokenCount: 0 };
      
      return { ...validatedResult, usage };
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
      return { ...result, usage: response.usageMetadata, sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
    });
  }
}
