
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, RotateCcw, ShieldAlert, X, Activity, Target, Cpu, ExternalLink,
  Link2, CheckSquare, Square, Filter, AlertTriangle, Shield, CheckCircle2,
  Lock, Terminal, Code, Settings, ChevronRight, MessageSquare, Send, User, Bot, Search,
  Fingerprint, Database, Zap, Waypoints, Box, ShieldEllipsis, AlertCircle, FileSearch,
  Microscope, Braces, Globe, ShieldCheck, AlertOctagon, CheckCircle, Timer
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ScanLevel, MissionReport, TechItem, VulnerabilityFinding } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { TelemetryEntry, DispatchedProbe } from '../hooks/useScanner';
import { APP_VERSION } from '../constants/version';
import en from '../locales/en.ts';

const LEVEL_COLORS: Record<ScanLevel, string> = {
  FAST: '#4ade80',
  STANDARD: '#00d4ff',
  DEEP: '#ef4444'
};

interface SectionCardProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>;
  children: React.ReactNode;
  themeColor: string;
}

const SectionCard = ({ title, subtitle, icon: Icon, children, themeColor }: SectionCardProps) => {
  return (
    <section className="glass-panel rounded-[2rem] md:rounded-[3.5rem] border border-white/10 bg-black/40 overflow-hidden shadow-3xl mb-8 md:mb-12">
      <div className="px-6 py-5 md:px-12 md:py-8 border-b border-white/5 bg-white/[0.02] flex items-center gap-4 md:gap-6">
        <Icon className="w-5 h-5 md:w-7 md:h-7" style={{ color: themeColor }} />
        <div>
          <h3 className="text-xs md:text-[15px] font-black uppercase tracking-[0.2em] md:tracking-[0.5em] text-white/90 leading-tight">{title}</h3>
          <p className="text-[9px] md:text-[11px] font-mono text-white/30 uppercase tracking-widest mt-1 md:mt-1.5">{subtitle}</p>
        </div>
      </div>
      <div className="p-6 md:p-12">{children}</div>
    </section>
  );
};

interface ResultsPageProps {
  missionReport: MissionReport;
  usage: { tokens: number; cost: number };
  targetUrl: string;
  level: ScanLevel;
  onReset: () => void;
  telemetry?: TelemetryEntry[];
  dispatchedProbes?: DispatchedProbe[];
  missionDuration?: { startTime: Date; endTime: Date; durationMs: number; formatted: string; formattedFull: string } | null;
}

/** Wappalyzer-style display category for Technology DNA grouping (order matches report/PDF) */
const TECH_DISPLAY_CATEGORY_ORDER = [
  'tech_category_js_frameworks',
  'tech_category_ui_frameworks',
  'tech_category_programming_languages',
  'tech_category_web_servers',
  'tech_category_ssg',
  'tech_category_build_tools',
  'tech_category_package_managers',
  'tech_category_analytics',
  'tech_category_maps',
  'tech_category_security',
  'tech_category_js_libraries',
  'tech_category_paas',
  'tech_category_font_scripts',
  'tech_category_cdn',
  'tech_category_backend',
  'tech_category_server',
  'tech_category_database',
  'tech_category_library',
] as const;

function getTechDisplayCategoryKey(tech: TechItem): string {
  const n = (tech.name || '').toLowerCase();
  if (['react', 'react router', 'vite', 'next.js', 'vue', 'nuxt', 'angular', 'svelte', 'remix'].some((x) => n.includes(x))) return 'tech_category_js_frameworks';
  if (['tailwind css', 'bootstrap', 'chakra ui', 'material ui', 'radix ui'].some((x) => n.includes(x))) return 'tech_category_ui_frameworks';
  if (['javascript', 'typescript'].some((x) => n.includes(x))) return 'tech_category_programming_languages';
  if (['node.js', 'node', 'nginx', 'apache', 'iis'].some((x) => n.includes(x))) return 'tech_category_web_servers';
  if (['vite', 'next.js', 'nuxt', 'gatsby', 'hugo', 'jekyll', 'eleventy', 'astro'].some((x) => n.includes(x))) return 'tech_category_ssg';
  if (['vite', 'webpack', 'parcel', 'rollup', 'esbuild'].some((x) => n.includes(x))) return 'tech_category_build_tools';
  if (['npm', 'yarn', 'pnpm', 'bun'].some((x) => n.includes(x))) return 'tech_category_package_managers';
  if (['google analytics', 'gtm', 'google tag manager', 'matomo', 'plausible'].some((x) => n.includes(x))) return 'tech_category_analytics';
  if (['leaflet', 'mapbox', 'google maps'].some((x) => n.includes(x))) return 'tech_category_maps';
  if (n === 'hsts') return 'tech_category_security';
  if (['framer motion', 'jquery'].some((x) => n.includes(x))) return 'tech_category_js_libraries';
  if (['vercel', 'netlify'].some((x) => n.includes(x))) return 'tech_category_paas';
  if (['lucide', 'google fonts', 'google font api', 'font awesome'].some((x) => n.includes(x))) return 'tech_category_font_scripts';
  if (['unpkg', 'jsdelivr', 'cdnjs'].some((x) => n.includes(x))) return 'tech_category_cdn';
  if (tech.category === 'Backend') return 'tech_category_backend';
  if (tech.category === 'Server') return 'tech_category_server';
  if (tech.category === 'Database') return 'tech_category_database';
  return 'tech_category_library';
}

export const ResultsPage = ({ missionReport, usage, targetUrl, level, onReset, telemetry = [], dispatchedProbes = [], missionDuration }: ResultsPageProps) => {
  const { t } = useLanguage();
  const { targetIntelligence, technologyDNA = [], findings = [], activeProbes = [], securityScore = 0, dataQuality } = missionReport;

  const themeColor = useMemo(() => LEVEL_COLORS[level as ScanLevel] || '#00d4ff', [level]);

  const technologyDNAByCategory = useMemo(() => {
    const map = new Map<string, TechItem[]>();
    for (const tech of technologyDNA) {
      const key = getTechDisplayCategoryKey(tech);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tech);
    }
    const ordered: { categoryKey: string; items: TechItem[] }[] = [];
    for (const key of TECH_DISPLAY_CATEGORY_ORDER) {
      const items = map.get(key);
      if (items?.length) ordered.push({ categoryKey: key, items });
    }
    const restKey = 'tech_category_library';
    for (const [key, items] of map) {
      if (!TECH_DISPLAY_CATEGORY_ORDER.includes(key as any)) ordered.push({ categoryKey: key, items });
    }
    return ordered;
  }, [technologyDNA]);

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 212, 255]; // Fallback to Vault Blue
  };

  // English-only translation function for PDF (always uses English regardless of UI language)
  const tEn = (path: string): string => {
    const keys = path.split('.');
    let value: unknown = en;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        value = undefined;
        break;
      }
    }
    return typeof value === 'string' ? value : path;
  };

  // Sanitize text for jsPDF: default fonts only support Latin-1. Replace Unicode bullets,
  // emojis, curly quotes; collapse non-Latin runs (e.g. Thai/Burmese) to " [...] " so PDF is readable.
  const sanitizeForPdf = (raw: string | undefined | null): string => {
    if (raw == null || typeof raw !== 'string') return '';
    const step1 = raw
      .replace(/\u2022/g, '-')             // bullet -> hyphen
      .replace(/[\u2018\u2019]/g, "'")   // curly single quotes
      .replace(/[\u201C\u201D]/g, '"')   // curly double quotes
      .replace(/\u2013/g, '-')           // en dash
      .replace(/\u2014/g, '-')           // em dash
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
      .replace(/\u26A1/g, '[!]')         // lightning
      .replace(/\u{1F534}/gu, '[CRITICAL]')
      .replace(/\u{1F7E0}/gu, '[HIGH]')
      .replace(/\u{1F4A1}/gu, '[TIP]')
      .replace(/\u{1F6E1}\uFE0F?/gu, '[VG]')
      .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)); // fullwidth ASCII
    // Replace runs of non-Latin-1 (e.g. Thai, Burmese) with one placeholder so we don't get long ??? strings
    const step2 = step1.replace(/[^\u0000-\u00FF]+/g, ' [...] ');
    // Collapse multiple placeholders/spaces and trim
    return step2.replace(/(\s*\[\.\.\.\]\s*)+/g, ' [...] ').replace(/\s+/g, ' ').trim();
  };

  const generatePDF = async () => {
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();

      // Scan ID: use scan start time so UI and PDF show the same ID (VG-YYYYMMDD-HHMMSS)
      const scanIdRef = missionDuration?.startTime ?? new Date();
      const dateStr = scanIdRef.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = scanIdRef.toTimeString().slice(0, 8).replace(/:/g, '');
      const scanId = `VG-${dateStr}-${timeStr}`;

      // Operator Name (default to VaultGuard Neural Agent)
      const operatorName = "VaultGuard Neural Agent";

      let hostname = "target";
      try {
        hostname = new URL(targetUrl).hostname;
      } catch (e) { }

      const rgb = hexToRgb(themeColor);

      // Enhanced Header with Logo area and two-column scan info
      const headerHeight = 70; // Increased to accommodate scan info in two columns
      doc.setFillColor(2, 4, 8); // Deep Navy
      doc.rect(0, 0, 210, headerHeight, 'F');

      // Add colored bar at top
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(0, 0, 210, 8, 'F');

      // Center logo - slightly smaller to make room for scan info
      const pageWidth = 210; // A4 width in mm
      const logoWidth = 20; // Slightly smaller
      const logoHeight = 20; // Slightly smaller
      const logoX = (pageWidth - logoWidth) / 2; // Center horizontally
      const logoY = 10; // Start after cyan bar with spacing

      // Load and add logo image using fetch (more reliable)
      try {
        const response = await fetch('/assets/images/LOGO.png');
        if (response.ok) {
          const blob = await response.blob();
          const logoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read logo'));
            reader.readAsDataURL(blob);
          });

          // Add logo to PDF - centered and bigger
          doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
        } else {
          throw new Error('Logo not found');
        }
      } catch (err) {
        // Fallback to ASCII label if image loading fails (jsPDF default font does not support emoji)
        console.warn('Logo loading failed, using text fallback:', err);
        doc.setFontSize(18);
        doc.setFont("courier", "bold");
        const fallbackText = "[VG]";
        const fallbackX = (pageWidth - doc.getTextWidth(fallbackText)) / 2;
        doc.text(fallbackText, fallbackX, logoY + 8);
      }

      // Title below logo - centered
      const titleY = logoY + logoHeight + 4; // Tighter spacing
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.setFont("courier", "bold");
      doc.setFontSize(16); // Slightly smaller

      // "VAULTGUARD PRO" text
      const titleText = "VAULTGUARD PRO";
      const titleWidth = doc.getTextWidth(titleText);
      const titleX = (pageWidth - titleWidth) / 2; // Center
      doc.text(titleText, titleX, titleY);

      // Version "v1.2.0" - smaller, inline with title
      doc.setFontSize(9); // Smaller font
      doc.setTextColor(150, 150, 150); // Gray color
      doc.setFont("courier", "normal");
      const versionText = `v${APP_VERSION}`;
      const versionX = titleX + titleWidth + 3; // Right after title
      doc.text(versionText, versionX, titleY);

      // Subtitle "NEURAL FORENSIC DEBRIEF" - centered below title
      const subtitleY = titleY + 5; // Tighter spacing
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10); // Slightly smaller
      doc.setFont("courier", "normal");
      const subtitleText = "NEURAL FORENSIC DEBRIEF";
      const subtitleWidth = doc.getTextWidth(subtitleText);
      const subtitleX = (pageWidth - subtitleWidth) / 2; // Center
      doc.text(subtitleText, subtitleX, subtitleY);

      // Two-column scan information in header
      const infoStartY = subtitleY + 7;
      const leftColumnX = 15;
      const rightColumnX = 110; // Right side of page
      const infoFontSize = 7;
      const infoLineHeight = 4;

      doc.setFontSize(infoFontSize);
      doc.setFont("courier", "normal");
      doc.setTextColor(220, 220, 220); // Brighter gray for better readability on dark background

      // Left Column (5 items to match right column)
      doc.text(`${tEn('pdf.scan_id')}: ${scanId}`, leftColumnX, infoStartY);
      doc.text(`${tEn('pdf.timestamp')}: ${timestamp}`, leftColumnX, infoStartY + infoLineHeight);
      doc.text(`${tEn('pdf.operator')}: ${operatorName}`, leftColumnX, infoStartY + infoLineHeight * 2);
      doc.text(`Mission: ${level}`, leftColumnX, infoStartY + infoLineHeight * 3);
      doc.text(`Target: ${sanitizeForPdf(targetUrl)}`, leftColumnX, infoStartY + infoLineHeight * 4);

      // Right Column
      doc.text(`${tEn('pdf.risk_score')}: ${securityScore}/100`, rightColumnX, infoStartY);
      if (missionDuration) {
        doc.text(`${tEn('pdf.mission_duration')}: ${missionDuration.formattedFull}`, rightColumnX, infoStartY + infoLineHeight);
        doc.text(`${tEn('pdf.start_time')}: ${missionDuration.startTime.toLocaleString()}`, rightColumnX, infoStartY + infoLineHeight * 2);
        doc.text(`${tEn('pdf.end_time')}: ${missionDuration.endTime.toLocaleString()}`, rightColumnX, infoStartY + infoLineHeight * 3);
      }
      doc.text(`${tEn('pdf.neural_load')}: ${usage.tokens.toLocaleString()} ${tEn('pdf.tokens')}`, rightColumnX, infoStartY + infoLineHeight * 4);

      // Body Sections - start after header with proper spacing
      let yPos = headerHeight + 12; // 12mm spacing after header
      
      // CRITICAL: Reset text color to black after header (header uses white/gray colors)
      doc.setTextColor(0, 0, 0); // Black text for body content

      // Executive Intelligence Section - Skip if no content (all info is in header now)
      // Scan information is now in header, so we skip this section entirely

      // Calculate topology counts once for use in multiple sections
      const topologyCounts = {
        logic: findings.filter((f: VulnerabilityFinding) => (f.title || "").toLowerCase().includes('logic') || (f.title || "").toLowerCase().includes('auth')).length,
        injection: findings.filter((f: VulnerabilityFinding) => (f.title || "").toLowerCase().includes('injection') || (f.title || "").toLowerCase().includes('xss') || (f.title || "").toLowerCase().includes('sql')).length,
        network: findings.filter((f: VulnerabilityFinding) => (f.title || "").toLowerCase().includes('header') || (f.title || "").toLowerCase().includes('dns') || (f.title || "").toLowerCase().includes('ssl')).length,
        config: findings.filter((f: VulnerabilityFinding) => {
          const title = (f.title || "").toLowerCase();
          return !title.includes('logic') && !title.includes('auth') && !title.includes('injection') && !title.includes('xss') && !title.includes('sql') && !title.includes('header') && !title.includes('dns') && !title.includes('ssl');
        }).length
      };

      // Calculate starting yPos after Executive Intelligence (yPos already defined above)
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
        doc.setTextColor(0, 0, 0); // Reset text color after page break
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0); // Ensure black text
      doc.setFont("courier", "bold");
      doc.text(tEn('results.target_summary'), 15, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont("courier", "normal");
      doc.setTextColor(0, 0, 0); // Ensure black text - set right before text
      doc.text(`${tEn('results.domain')}: ${sanitizeForPdf(targetUrl)}`, 15, yPos);
      yPos += 6;

      if (targetIntelligence?.hosting?.ip && targetIntelligence.hosting.ip !== '0.0.0.0') {
        doc.setFontSize(9); // Ensure font size
        doc.setFont("courier", "normal"); // Ensure font
        doc.setTextColor(0, 0, 0); // Ensure black text - set right before text
        doc.text(`${tEn('results.ip_address')}: ${sanitizeForPdf(targetIntelligence.hosting.ip)}`, 15, yPos);
        yPos += 6;
      }

      if (targetIntelligence?.hosting?.provider && targetIntelligence.hosting.provider !== 'Unknown') {
        doc.setFontSize(9); // Ensure font size
        doc.setFont("courier", "normal"); // Ensure font
        doc.setTextColor(0, 0, 0); // Ensure black text - set right before text
        doc.text(`${tEn('results.hosting_provider')}: ${sanitizeForPdf(targetIntelligence.hosting.provider)}`, 15, yPos);
        yPos += 6;
      }

      if (targetIntelligence?.hosting?.location && targetIntelligence.hosting.location !== 'Unknown') {
        doc.setFontSize(9); // Ensure font size
        doc.setFont("courier", "normal"); // Ensure font
        doc.setTextColor(0, 0, 0); // Ensure black text - set right before text
        doc.text(`${tEn('results.location')}: ${sanitizeForPdf(targetIntelligence.hosting.location)}`, 15, yPos);
        yPos += 6;
      }

      if (targetIntelligence?.associatedLinks && targetIntelligence.associatedLinks.length > 0) {
        yPos += 3;
        doc.setFontSize(9); // Ensure font size
        doc.setFont("courier", "bold");
        doc.setTextColor(0, 0, 0); // Ensure black text - set right before text
        doc.text(`${tEn('results.subdomains')} / ${tEn('results.associated_links')}:`, 15, yPos);
        yPos += 6;
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0); // Ensure black text
        targetIntelligence.associatedLinks.forEach((link: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
            doc.setTextColor(0, 0, 0); // Reset text color after page break
          }
          doc.setFontSize(8); // Ensure font size
          doc.setFont("courier", "normal"); // Ensure font
          doc.setTextColor(0, 0, 0); // Ensure black text - set right before text
          const linkText = doc.splitTextToSize(`- ${sanitizeForPdf(link)}`, 180);
          linkText.forEach((line: string) => {
            doc.setTextColor(0, 0, 0); // Ensure black text for each line
            doc.text(line, 20, yPos);
            yPos += 5;
          });
        });
        yPos += 3;
      }

      if (targetIntelligence?.apis && targetIntelligence.apis.length > 0) {
        yPos += 3;
        doc.setFontSize(9); // Ensure font size
        doc.setFont("courier", "bold");
        doc.setTextColor(0, 0, 0); // Ensure black text - set right before text
        doc.text(`${tEn('results.apis')}:`, 15, yPos);
        yPos += 6;
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0); // Ensure black text
        targetIntelligence.apis.forEach((api: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
            doc.setTextColor(0, 0, 0); // Reset text color after page break
          }
          doc.setFontSize(8); // Ensure font size
          doc.setFont("courier", "normal"); // Ensure font
          doc.setTextColor(0, 0, 0); // Ensure black text - set right before text
          const apiText = doc.splitTextToSize(`- ${sanitizeForPdf(api)}`, 180);
          apiText.forEach((line: string) => {
            doc.setTextColor(0, 0, 0); // Ensure black text for each line
            doc.text(line, 20, yPos);
            yPos += 5;
          });
        });
        yPos += 3;
      }
      yPos += 5;

      // Level Scan Details Section
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("courier", "bold");
      doc.text(tEn('results.level_scan_details'), 15, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont("courier", "normal");
      const levelDetails = en.level_details[level.toLowerCase() as 'fast' | 'standard' | 'deep'];
      if (levelDetails) {
        doc.text(`Data Collected: ${levelDetails.data_collected}`, 15, yPos);
        yPos += 6;
        doc.text(`AI Model: ${levelDetails.ai_model}`, 15, yPos);
        yPos += 6;
        doc.text(`Thinking Budget: ${levelDetails.thinking_budget}`, 15, yPos);
        yPos += 8;

        doc.setFont("courier", "bold");
        doc.text(tEn('results.scans_performed') + ':', 15, yPos);
        yPos += 6;
        doc.setFont("courier", "normal");
        doc.setFontSize(8);

        levelDetails.scans.forEach((scan: any) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFont("courier", "bold");
          doc.text(`${scan.test} (${scan.accuracy})`, 15, yPos);
          yPos += 5;
          doc.setFont("courier", "normal");
          const methodText = doc.splitTextToSize(`Method: ${scan.method}`, 180);
          methodText.forEach((line: string) => {
            doc.text(line, 20, yPos);
            yPos += 4;
          });
          yPos += 3;
        });
      }
      yPos += 5;

      // Business Logic Section
      if (targetIntelligence?.purpose || targetIntelligence?.businessLogic || targetIntelligence?.attackSurfaceSummary) {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont("courier", "bold");
        doc.text(tEn('results.business_logic'), 15, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont("courier", "normal");
        doc.setTextColor(0, 0, 0); // Ensure black text

        if (targetIntelligence?.purpose && targetIntelligence.purpose !== '---') {
          doc.setFont("courier", "bold");
          doc.setTextColor(0, 0, 0); // Ensure black text
          doc.text(`${tEn('results.purpose')}:`, 15, yPos);
          yPos += 6;
          doc.setFont("courier", "normal");
          doc.setTextColor(0, 0, 0); // Ensure black text
          const purposeText = doc.splitTextToSize(sanitizeForPdf(targetIntelligence.purpose), 180);
          purposeText.forEach((line: string) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.setTextColor(0, 0, 0); // Ensure black text after page break
            doc.text(line, 20, yPos);
            yPos += 5;
          });
          yPos += 3;
        }

        if (targetIntelligence?.businessLogic && targetIntelligence.businessLogic !== '---') {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFont("courier", "bold");
          doc.setTextColor(0, 0, 0); // Ensure black text
          doc.text(`${tEn('results.business_logic')}:`, 15, yPos);
          yPos += 6;
          doc.setFont("courier", "normal");
          doc.setTextColor(0, 0, 0); // Ensure black text
          const logicText = doc.splitTextToSize(sanitizeForPdf(targetIntelligence.businessLogic), 180);
          logicText.forEach((line: string) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.setTextColor(0, 0, 0); // Ensure black text after page break
            doc.text(line, 20, yPos);
            yPos += 5;
          });
          yPos += 3;
        }

        if (targetIntelligence?.attackSurfaceSummary && targetIntelligence.attackSurfaceSummary !== '---') {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFont("courier", "bold");
          doc.setTextColor(0, 0, 0); // Ensure black text
          doc.text(`${tEn('results.attack_surface')}:`, 15, yPos);
          yPos += 6;
          doc.setFont("courier", "normal");
          doc.setTextColor(0, 0, 0); // Ensure black text
          const surfaceText = doc.splitTextToSize(sanitizeForPdf(targetIntelligence.attackSurfaceSummary), 180);
          surfaceText.forEach((line: string) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.setTextColor(0, 0, 0); // Ensure black text after page break
            doc.text(line, 20, yPos);
            yPos += 5;
          });
          yPos += 3;
        }
        yPos += 5;
      }

      // Data Quality Section
      if (dataQuality) {
        // yPos is already set from previous sections

        // Enhanced AI Compensation Mode Section
        if (dataQuality.corsCompensation) {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }

          // Bold highlighted box
          doc.setFillColor(128, 0, 128); // Purple background
          doc.rect(10, yPos - 3, 190, 32, 'F');

          // Border
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(1);
          doc.rect(10, yPos - 3, 190, 32, 'S');

          doc.setTextColor(255, 255, 255);
          doc.setFont("courier", "bold");
          doc.setFontSize(13);
          doc.text(`[!] ${tEn('pdf.ai_compensation_title')}`, 15, yPos + 5);

          doc.setFontSize(9);
          doc.setFont("courier", "normal");
          doc.text(tEn('pdf.ai_compensation_desc'), 15, yPos + 12);
          doc.text(`- ${tEn('pdf.ai_compensation_bullet1')}`, 20, yPos + 18);
          doc.text(`- ${tEn('pdf.ai_compensation_bullet2')}`, 20, yPos + 23);

          yPos += 35;
        }

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(tEn('pdf.data_quality_assessment'), 15, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.text(`${tEn('pdf.trust_score')}: ${dataQuality.trustScore}%`, 15, yPos);
        yPos += 8;
        const trustLevel = dataQuality.trustScore >= 80 ? tEn('pdf.trust_high') : dataQuality.trustScore >= 60 ? tEn('pdf.trust_medium') : dataQuality.trustScore >= 40 ? tEn('pdf.trust_low') : tEn('pdf.trust_very_low');
        doc.text(`${tEn('pdf.trust_level')}: ${trustLevel}`, 15, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(dataQuality.corsCompensation ? tEn('pdf.data_integrity_simulated') : tEn('pdf.data_integrity_live'), 15, yPos);
        yPos += 10;

        if (dataQuality.limitations.length > 0) {
          doc.setFontSize(9);
          doc.setTextColor(200, 100, 0);
          doc.text(`${tEn('pdf.limitations')}:`, 15, yPos);
          yPos += 7;
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60); // Darker gray for better readability
          dataQuality.limitations.forEach((lim: string) => {
            doc.text(`- ${sanitizeForPdf(lim)}`, 20, yPos);
            yPos += 6;
          });
          yPos += 5;
        }
      }

      // Forensic Analysis
      const splitAnalysis = doc.splitTextToSize(`${tEn('pdf.forensic_deduction')}: ${sanitizeForPdf(targetIntelligence?.forensicAnalysis) || tEn('pdf.no_analysis')}`, 180);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      splitAnalysis.forEach((line: string) => {
        doc.text(line, 15, yPos);
        yPos += 5;
      });
      yPos += 10;

      // Topology Stats Section
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("courier", "bold");
      doc.text(tEn('labels.risk_topology'), 15, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont("courier", "normal");

      doc.text(`${tEn('results.logic_flow')}: ${topologyCounts.logic}`, 15, yPos);
      yPos += 6;
      doc.text(`${tEn('results.injections')}: ${topologyCounts.injection}`, 15, yPos);
      yPos += 6;
      doc.text(`${tEn('results.net_hygiene')}: ${topologyCounts.network}`, 15, yPos);
      yPos += 6;
      doc.text(`${tEn('results.config_dna')}: ${topologyCounts.config}`, 15, yPos);
      yPos += 10;

      // Technology DNA Section (grouped by category like UI / Wappalyzer)
      if (technologyDNAByCategory.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont("courier", "bold");
        doc.text(tEn('pdf.technology_dna'), 15, yPos);
        yPos += 8;

        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        for (const { categoryKey, items } of technologyDNAByCategory) {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
            doc.setTextColor(0, 0, 0);
          }
          doc.setFont("courier", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(tEn(`results.${categoryKey}`), 15, yPos);
          yPos += 6;
          doc.setFont("courier", "normal");
          for (const tech of items) {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
              doc.setTextColor(0, 0, 0);
            }
            doc.setTextColor(0, 0, 0);
            doc.setFont("courier", "bold");
            const techVersionPdf = tech.version && tech.version.trim() ? sanitizeForPdf(tech.version) : '—';
            doc.text(`${sanitizeForPdf(tech.name)} | Version: ${techVersionPdf}`, 15, yPos);
            yPos += 5;
            doc.setFont("courier", "normal");
            doc.setTextColor(60, 60, 60);
            doc.text(`${tEn('pdf.category')}: ${sanitizeForPdf(tech.category)} | ${tEn('pdf.status')}: ${sanitizeForPdf(tech.status)}`, 15, yPos);
            yPos += 5;
            if (tech.actionPlan) {
              const actionPlan = doc.splitTextToSize(`${tEn('pdf.action')}: ${sanitizeForPdf(tech.actionPlan)}`, 180);
              actionPlan.forEach((line: string) => {
                if (yPos > 280) {
                  doc.addPage();
                  yPos = 20;
                  doc.setTextColor(0, 0, 0);
                }
                doc.text(line, 20, yPos);
                yPos += 4;
              });
              yPos += 3;
            }
          }
          yPos += 4;
        }
        yPos += 5;
      }

      // Probe Execution Details
      if (dispatchedProbes && dispatchedProbes.length > 0) {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont("courier", "bold");
        doc.text(tEn('pdf.probe_execution_details'), 15, yPos);
        yPos += 8;

        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        const spaDisclaimerLines = doc.splitTextToSize(tEn('pdf.probe_spa_disclaimer_title') + ': ' + tEn('pdf.probe_spa_disclaimer'), 180);
        spaDisclaimerLines.forEach((line: string) => {
          doc.text(line, 15, yPos);
          yPos += 4;
        });
        yPos += 5;

        doc.setFontSize(8);
        dispatchedProbes.forEach((probe: DispatchedProbe) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.setTextColor(0, 0, 0);
          doc.setFont("courier", "bold");
          doc.text(`${probe.method} ${probe.endpoint}`, 15, yPos);
          yPos += 5;
          doc.setFont("courier", "normal");
          doc.setTextColor(60, 60, 60); // Darker gray for better readability
          doc.text(`${tEn('pdf.status')}: ${probe.status || 'N/A'} | ${tEn('pdf.response_time')}: ${probe.responseTime || 'N/A'}ms`, 15, yPos);
          yPos += 5;
          if (probe.vulnerable) {
            doc.setTextColor(200, 0, 0);
            doc.text(tEn('pdf.vulnerable'), 15, yPos);
            yPos += 5;
          }
          if (probe.corsBlocked) {
            doc.setTextColor(200, 100, 0);
            doc.text(tEn('pdf.cors_blocked'), 15, yPos);
            yPos += 5;
          }
          if (probe.description) {
            doc.setTextColor(0, 0, 0);
            const desc = doc.splitTextToSize(`${tEn('pdf.description')}: ${sanitizeForPdf(probe.description)}`, 180);
            desc.forEach((line: string) => {
              doc.text(line, 20, yPos);
              yPos += 4;
            });
          }
          yPos += 5;
        });
        yPos += 5;
      }

      // Detailed Findings with Full Information
      if (findings && findings.length > 0) {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont("courier", "bold");
        doc.text(tEn('pdf.vulnerability_ledger'), 15, yPos);
        yPos += 8;
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        const disclaimerLines = doc.splitTextToSize(tEn('results.finding_origin_disclaimer'), 180);
        disclaimerLines.forEach((line: string) => {
          doc.text(line, 15, yPos);
          yPos += 4;
        });
        yPos += 6;

        findings.forEach((f: VulnerabilityFinding, index: number) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }

          // Title
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0); // Ensure black text
          doc.setFont("courier", "bold");
          const title = doc.splitTextToSize(`${index + 1}. ${sanitizeForPdf(f.title)}`, 180);
          title.forEach((line: string) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.setTextColor(0, 0, 0); // Ensure black text after page break
            doc.text(line, 15, yPos);
            yPos += 5;
          });
          yPos += 2;

          // Severity, CWE, Confidence, and Trust (Evidence-based vs AI-Inference)
          doc.setFontSize(8);
          doc.setTextColor(60, 60, 60); // Darker gray for better readability
          doc.setFont("courier", "normal");
          const confidenceText = f.confidence ? ` | ${tEn('pdf.confidence')}: ${f.confidence.toUpperCase()}` : '';
          doc.text(`${tEn('pdf.severity')}: ${f.severity.toUpperCase()} | ${tEn('pdf.cwe')}: ${f.cwe || 'N/A'}${confidenceText}`, 15, yPos);
          yPos += 4;
          const trustLabel = f.confidence === 'High' ? tEn('pdf.trust_evidence_based') : tEn('pdf.trust_ai_inference');
          doc.setFontSize(7);
          doc.setTextColor(f.confidence === 'High' ? 0 : 120, f.confidence === 'High' ? 150 : 80, f.confidence === 'High' ? 100 : 80);
          doc.text(`Trust: ${trustLabel}`, 15, yPos);
          yPos += 5;

          // Evidence Sources (if available)
          if (f.evidence && Array.isArray(f.evidence) && f.evidence.length > 0) {
            doc.setFontSize(7);
            doc.setTextColor(80, 80, 80); // Darker gray for better readability
            doc.text(`${tEn('pdf.evidence_sources')}: ${sanitizeForPdf(f.evidence.join(', '))}`, 15, yPos);
            yPos += 4;
          }

          // Full Description
          doc.setTextColor(0, 0, 0); // Ensure black text
          doc.setFontSize(9); // Ensure readable font size
          const description = doc.splitTextToSize(`${tEn('pdf.description')}: ${sanitizeForPdf(f.description) || tEn('pdf.no_description')}`, 180);
          description.forEach((line: string) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.setTextColor(0, 0, 0); // Ensure black text after page break
            doc.text(line, 15, yPos);
            yPos += 4;
          });
          yPos += 3;

          // Full Remediation (NO TRUNCATION)
          doc.setFont("courier", "bold");
          doc.setTextColor(0, 100, 0);
          doc.text(`${tEn('pdf.remediation')}:`, 15, yPos);
          yPos += 5;
          doc.setFont("courier", "normal");
          doc.setTextColor(0, 0, 0);
          const remediation = doc.splitTextToSize(sanitizeForPdf(f.remediation) || tEn('pdf.no_remediation'), 180);
          remediation.forEach((line: string) => {
            doc.text(line, 20, yPos);
            yPos += 4;
          });
          yPos += 3;

          // Business Impact
          if (f.businessImpact) {
            doc.setFont("courier", "bold");
            doc.setTextColor(200, 100, 0);
            doc.text(`${tEn('pdf.business_impact')}:`, 15, yPos);
            yPos += 5;
            doc.setFont("courier", "normal");
            doc.setTextColor(0, 0, 0);
            const impact = doc.splitTextToSize(sanitizeForPdf(f.businessImpact), 180);
            impact.forEach((line: string) => {
              doc.text(line, 20, yPos);
              yPos += 4;
            });
            yPos += 3;
          }

          // POC Script
          if (f.poc) {
            doc.setFont("courier", "bold");
            doc.setTextColor(0, 0, 200);
            doc.text(`${tEn('pdf.proof_of_concept')}:`, 15, yPos);
            yPos += 5;
            doc.setFont("courier", "normal");
            doc.setTextColor(0, 100, 0);
            const poc = doc.splitTextToSize(sanitizeForPdf(f.poc), 180);
            poc.forEach((line: string) => {
              doc.text(line, 20, yPos);
              yPos += 4;
            });
            yPos += 3;
          }

          yPos += 5; // Space between findings
        });
      } else {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60); // Darker gray for better readability
        doc.text(tEn('pdf.no_vulnerabilities'), 15, yPos);
        yPos += 10;
      }

      // Professional Closing Section
      // Executive Summary
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont("courier", "bold");
      doc.text(tEn('pdf.executive_summary'), 15, yPos);
      yPos += 10;

      doc.setFontSize(9);
      doc.setFont("courier", "normal");

      const concerns = [];
      if (topologyCounts.logic > 0) concerns.push('logic flow vulnerabilities');
      if (topologyCounts.injection > 0) concerns.push('injection vulnerabilities');
      if (topologyCounts.network > 0) concerns.push('network hygiene issues');

      const concernsText = concerns.length > 0
        ? concerns.join(concerns.length === 2 ? ' and ' : concerns.length === 3 ? ', ' : '')
        : 'configuration issues';

      const riskLevel = securityScore >= 70 ? 'moderate' : securityScore >= 50 ? 'significant' : 'critical';

      const summaryText = doc.splitTextToSize(
        `Based on this comprehensive security assessment, the target system has a Risk Score of ${securityScore}/100. ` +
        `The analysis identified ${findings.length} security finding${findings.length !== 1 ? 's' : ''} across multiple categories. ` +
        `Primary concerns include ${concernsText}. ` +
        `The application layer demonstrates ${riskLevel} security gaps that require immediate attention.`,
        180
      );
      summaryText.forEach((line: string) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 15, yPos);
        yPos += 5;
      });
      yPos += 8;

      // Prioritized Action Plan
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setFont("courier", "bold");
      doc.setTextColor(200, 0, 0); // Red for urgency
      doc.text(tEn('pdf.prioritized_action_plan'), 15, yPos);
      yPos += 10;

      doc.setFontSize(9);
      doc.setFont("courier", "normal");
      doc.setTextColor(0, 0, 0);

      // Get highest severity finding for priority
      const criticalFindings = findings.filter((f: VulnerabilityFinding) =>
        f.severity.toLowerCase() === 'critical'
      );
      const highFindings = findings.filter((f: VulnerabilityFinding) =>
        f.severity.toLowerCase() === 'high'
      );

      if (criticalFindings.length > 0) {
        doc.setFont("courier", "bold");
        doc.setTextColor(200, 0, 0);
        doc.text(`[CRITICAL] ${tEn('pdf.critical_priority')}:`, 15, yPos);
        yPos += 6;
        doc.setFont("courier", "normal");
        doc.setTextColor(0, 0, 0);
        const criticalText = doc.splitTextToSize(
          sanitizeForPdf(
            `Immediately address ${criticalFindings.length} critical vulnerability${criticalFindings.length !== 1 ? 'ies' : 'y'}. ` +
            `Primary recommendation: ${criticalFindings[0]?.title || 'Review critical findings'}. ` +
            `Implement Content Security Policy (CSP) and strengthen authentication mechanisms.`
          ),
          180
        );
        criticalText.forEach((line: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        yPos += 5;
      } else if (highFindings.length > 0) {
        doc.setFont("courier", "bold");
        doc.setTextColor(200, 100, 0);
        doc.text(`[HIGH] ${tEn('pdf.high_priority')}:`, 15, yPos);
        yPos += 6;
        doc.setFont("courier", "normal");
        doc.setTextColor(0, 0, 0);
        const highText = doc.splitTextToSize(
          sanitizeForPdf(
            `Address ${highFindings.length} high-severity finding${highFindings.length !== 1 ? 's' : ''} within 30 days. ` +
            `Focus on: ${highFindings[0]?.title || 'Review high-severity findings'}.`
          ),
          180
        );
        highText.forEach((line: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        yPos += 5;
      } else if (findings.length > 0) {
        doc.setFont("courier", "normal");
        doc.setTextColor(0, 0, 0);
        const generalText = doc.splitTextToSize(
          `Review and address ${findings.length} security finding${findings.length !== 1 ? 's' : ''} identified in this assessment. ` +
          `Implement recommended remediation measures to improve overall security posture.`,
          180
        );
        generalText.forEach((line: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 15, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      // AI Disclaimer
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(10);
      doc.setFont("courier", "bold");
      doc.setTextColor(60, 60, 60); // Darker gray for better readability
      doc.text(tEn('pdf.ai_disclaimer'), 15, yPos);
      yPos += 8;

      doc.setFontSize(8);
      doc.setFont("courier", "normal");
      doc.setTextColor(50, 50, 50); // Darker gray for better readability
      const disclaimerText = doc.splitTextToSize(
        "This report is generated using Gemini 3 AI-powered analysis and represents a point-in-time assessment of the target system's security posture. " +
        "While AI analysis provides comprehensive coverage, it is recommended to supplement this assessment with manual security audits conducted by certified security professionals. " +
        "The findings presented are based on automated analysis and should be validated through additional testing before implementing remediation measures.",
        180
      );
      disclaimerText.forEach((line: string) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 15, yPos);
        yPos += 4;
      });
      yPos += 8;

      // Next Steps with Vault Academy
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }

      // Card-style box for Next Steps
      doc.setFillColor(240, 248, 255); // Light blue background
      doc.rect(10, yPos - 5, 190, 40, 'F');
      doc.setDrawColor(0, 100, 200); // Blue border
      doc.setLineWidth(0.5);
      doc.rect(10, yPos - 5, 190, 40, 'S');

      doc.setFontSize(11);
      doc.setFont("courier", "bold");
      doc.setTextColor(0, 100, 200);
      doc.text("[TIP] " + tEn('pdf.next_steps'), 15, yPos + 5);
      yPos += 10;

      doc.setFontSize(8);
      doc.setFont("courier", "normal");
      doc.setTextColor(0, 0, 0);
      const nextStepsText = doc.splitTextToSize(
        "To better understand these findings and learn how to protect against similar vulnerabilities, visit our Vault Academy for free educational resources on SSL/TLS, Content Security Policy (CSP), OWASP Top 10, and other security topics. " +
        "Access comprehensive guides and best practices to strengthen your application's security posture.",
        175
      );
      nextStepsText.forEach((line: string) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 15, yPos);
        yPos += 4;
      });
      yPos += 5;

      // Add footer to all pages
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100); // Brighter gray for better readability
        doc.setFont("courier", "normal");
        doc.text(`Generated by VaultGuard Pro Neural Security Operations Center | ${tEn('pdf.scan_id')}: ${scanId}`, 105, 290, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, 105, 295, { align: 'center' });
      }

      doc.save(`VaultGuard_Debrief_${hostname}_${scanId}.pdf`);
    } catch (error: unknown) {
      console.error("PDF Generation Error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during PDF generation';
      alert(`${t('pdf.error_generating')}\n\nError: ${errorMessage}`);
    }
  };

  const topology = useMemo(() => {
    const counts = { logic: 0, config: 0, injection: 0, network: 0 };
    findings.forEach((f: VulnerabilityFinding) => {
      const title = (f.title || "").toLowerCase();
      if (title.includes('logic') || title.includes('auth')) counts.logic++;
      else if (title.includes('injection') || title.includes('xss') || title.includes('sql')) counts.injection++;
      else if (title.includes('header') || title.includes('dns') || title.includes('ssl')) counts.network++;
      else counts.config++;
    });
    return counts;
  }, [findings]);

  return (
    <div className="p-4 md:p-12 max-w-7xl mx-auto min-h-screen flex flex-col gap-6 md:gap-10 overflow-x-hidden relative">
      <header className="glass-panel p-6 md:p-10 rounded-[2rem] md:rounded-[4rem] border border-white/10 flex flex-col md:flex-row justify-between items-center bg-black/80 z-[100] gap-6">
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
          <img
            src="/assets/images/LOGO.png"
            alt="VaultGuard Pro"
            className="w-12 h-12 md:w-16 md:h-16 object-contain shrink-0"
          />
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center font-black text-black text-2xl md:text-4xl shadow-2xl transition-all duration-500 shrink-0"
            style={{ backgroundColor: themeColor, boxShadow: `0 0 30px ${themeColor}66` }}
          >
            V
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-xl font-black uppercase tracking-widest text-white/90">{t('labels.forensic_logs')}</h2>
            <div className="text-[10px] md:text-[13px] font-mono uppercase tracking-tighter mt-1 truncate" style={{ color: `${themeColor}99` }}>{targetUrl}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              generatePDF().catch(err => {
                console.error('Error generating PDF:', err);
                alert('Failed to generate PDF. Please try again.');
              });
            }}
            className="flex-1 md:flex-none px-6 md:px-10 py-4 md:py-5 bg-white/5 text-white border border-white/10 rounded-2xl md:rounded-3xl text-[10px] md:text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all pointer-events-auto"
          >
            <Download className="w-4 h-4 md:w-5 md:h-5" /> {t('export_pdf')}
          </button>
          <button
            onClick={onReset}
            className="flex-1 md:flex-none px-6 md:px-10 py-4 md:py-5 text-black rounded-2xl md:rounded-3xl text-[10px] md:text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 pointer-events-auto"
            style={{ backgroundColor: themeColor, boxShadow: `0 10px 30px ${themeColor}33` }}
          >
            <RotateCcw className="w-4 h-4 md:w-5 md:h-5" /> {t('restart_mission')}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full pb-32">
        {/* Data Quality Indicator */}
        {dataQuality && (
          <SectionCard
            title={t('results.data_quality')}
            subtitle={t('results.trustworthiness_assessment')}
            icon={ShieldCheck}
            themeColor={themeColor}
          >
            <div className="space-y-6">
              {/* AI Compensation Badge */}
              {dataQuality.corsCompensation && (
                <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-2 border-purple-500/30">
                  <div className="flex items-start gap-3 md:gap-4">
                    <Cpu className="w-5 h-5 md:w-6 md:h-6 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs md:text-sm font-black text-purple-400 uppercase mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        {t('cors_extension.ai_compensation_title')}
                      </div>
                      <p className="text-xs md:text-sm text-white/70 leading-relaxed mb-3">
                        {t('cors_extension.ai_compensation_desc')}
                      </p>
                      <ul className="mt-2 space-y-1 text-xs md:text-sm text-white/60 mb-4">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-purple-400" />
                          <span>{t('cors_extension.ai_compensation_item1')}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-purple-400" />
                          <span>{t('cors_extension.ai_compensation_item2')}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-purple-400" />
                          <span>{t('cors_extension.ai_compensation_item3')}</span>
                        </li>
                      </ul>

                      {/* Professional CORS Extension Suggestion */}
                      <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs font-black text-blue-400 uppercase mb-2 flex items-center gap-2">
                              <Settings className="w-4 h-4" />
                              {t('cors_extension.advanced_scanning_title')}
                            </div>

                            <p className="text-[10px] md:text-xs text-white/80 leading-relaxed mb-4">
                              {t('cors_extension.advanced_scanning_desc')}
                            </p>

                            {/* Why Use Extension Section */}
                            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-lg mb-4 border border-blue-500/20">
                              <div className="flex items-start gap-2 mb-3">
                                <Target className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-[10px] md:text-xs font-black text-blue-400 uppercase mb-2">
                                    {t('cors_extension.why_use_title')}
                                  </p>
                                  <p className="text-[10px] md:text-xs text-white/80 leading-relaxed mb-3">
                                    {t('cors_extension.why_use_desc')}
                                  </p>

                                  {/* Comparison Table */}
                                  <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div className="bg-red-500/10 p-2 rounded border border-red-500/20">
                                      <p className="text-[10px] font-black text-red-400 uppercase mb-1">{t('cors_extension.without_extension')}</p>
                                      <ul className="text-[10px] text-white/60 space-y-0.5">
                                        <li>• {t('cors_extension.limited_dom')}</li>
                                        <li>• {t('cors_extension.partial_headers')}</li>
                                        <li>• {t('cors_extension.ai_compensation_needed')}</li>
                                        <li>• {t('cors_extension.accuracy_low')}</li>
                                      </ul>
                                    </div>
                                    <div className="bg-green-500/10 p-2 rounded border border-green-500/20">
                                      <p className="text-[10px] font-black text-green-400 uppercase mb-1">{t('cors_extension.with_extension')}</p>
                                      <ul className="text-[10px] text-white/60 space-y-0.5">
                                        <li>• {t('cors_extension.complete_dom')}</li>
                                        <li>• {t('cors_extension.all_headers')}</li>
                                        <li>• {t('cors_extension.direct_analysis')}</li>
                                        <li>• {t('cors_extension.accuracy_high')}</li>
                                      </ul>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <p className="text-[10px] md:text-xs text-white/70 font-semibold">
                                      {t('cors_extension.key_benefits')}
                                    </p>
                                    <ul className="text-[10px] md:text-xs text-white/60 space-y-1 ml-4">
                                      <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                        <span><strong>{t('cors_extension.benefit_dom')}</strong></span>
                                      </li>
                                      <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                        <span><strong>{t('cors_extension.benefit_headers')}</strong></span>
                                      </li>
                                      <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                        <span><strong>{t('cors_extension.benefit_accuracy')}</strong></span>
                                      </li>
                                      <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                        <span><strong>{t('cors_extension.benefit_detection')}</strong></span>
                                      </li>
                                      <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                                        <span><strong>{t('cors_extension.benefit_probes')}</strong></span>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Recommended Extension */}
                            <div className="bg-black/30 p-3 rounded-lg mb-4 border border-blue-500/30">
                              <p className="text-[10px] md:text-xs text-white/90 font-mono mb-2">
                                <strong className="text-blue-400">{t('cors_extension.recommended')} Extension:</strong>
                              </p>
                              <div className="flex items-center gap-2 mb-2">
                                <Lock className="w-4 h-4 text-blue-400" />
                                <span className="text-[10px] md:text-xs text-white/80 font-mono">
                                  "{t('cors_extension.extension_name')}"
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <Activity className="w-3 h-3 text-white/40" />
                                <span className="text-[10px] text-white/60">
                                  {t('cors_extension.extension_stats')}
                                </span>
                              </div>
                              <p className="text-[10px] text-white/60 italic">
                                {t('cors_extension.available_on_stores')}
                              </p>
                            </div>

                            {/* How to Use Extension */}
                            <div className="bg-blue-500/5 p-4 rounded-lg mb-4 border border-blue-500/20">
                              <div className="flex items-start gap-2 mb-3">
                                <Terminal className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-[10px] md:text-xs font-black text-blue-400 uppercase mb-2">
                                    {t('cors_extension.how_to_use_title')}
                                  </p>
                                  <ol className="text-[10px] md:text-xs text-white/70 space-y-2 ml-4 list-decimal">
                                    <li className="flex items-start gap-2">
                                      <span className="flex-shrink-0">1.</span>
                                      <span>{t('cors_extension.how_to_step1')}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                      <span className="flex-shrink-0">2.</span>
                                      <span>{t('cors_extension.how_to_step2')}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                      <span className="flex-shrink-0">3.</span>
                                      <span>{t('cors_extension.how_to_step3')}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                      <span className="flex-shrink-0">4.</span>
                                      <span>{t('cors_extension.how_to_step4')}</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                      <span className="flex-shrink-0">5.</span>
                                      <span>{t('cors_extension.how_to_step5')}</span>
                                    </li>
                                  </ol>
                                </div>
                              </div>
                            </div>

                            {/* Extension Links */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              <a
                                href="https://chromewebstore.google.com/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded hover:bg-blue-500/30 transition-colors flex items-center gap-1.5"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {t('cors_extension.chrome_extension')}
                              </a>
                              <a
                                href="https://addons.mozilla.org/en-US/firefox/addon/access-control-allow-origin/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded hover:bg-blue-500/30 transition-colors flex items-center gap-1.5"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {t('cors_extension.firefox_addon')}
                              </a>
                            </div>

                            {/* Critical Security Warning */}
                            <div className="mt-3 pt-3 border-t-2 border-red-500/40 bg-red-500/5 rounded p-3">
                              <div className="flex items-start gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-[10px] md:text-xs font-black text-red-400 uppercase mb-1">
                                    {t('cors_extension.security_warning_title')}
                                  </p>
                                  <p className="text-[10px] text-white/80 leading-relaxed">
                                    {t('cors_extension.security_warning_desc')}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-blue-500/20">
                              <p className="text-[10px] text-white/60 italic leading-relaxed">
                                {t('cors_extension.alternative_note')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-purple-500/20">
                        <p className="text-[10px] md:text-xs text-purple-300/80 font-mono">
                          {t('cors_extension.ai_workaround_demo')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-6">
                <div className="text-5xl md:text-6xl font-black" style={{
                  color: dataQuality.trustScore >= 80 ? '#00ff9d' :
                    dataQuality.trustScore >= 60 ? '#00d4ff' :
                      dataQuality.trustScore >= 40 ? '#f59e0b' : '#ef4444'
                }}>
                  {dataQuality.trustScore}%
                </div>
                <div>
                  <div className="text-base md:text-lg font-black uppercase" style={{
                    color: dataQuality.trustScore >= 80 ? '#00ff9d' :
                      dataQuality.trustScore >= 60 ? '#00d4ff' :
                        dataQuality.trustScore >= 40 ? '#f59e0b' : '#ef4444'
                  }}>
                    {dataQuality.trustScore >= 80 ? t('results.high_trust') :
                      dataQuality.trustScore >= 60 ? t('results.medium_trust') :
                        dataQuality.trustScore >= 40 ? t('results.low_trust') : t('results.very_low_trust')}
                  </div>
                  <div className="text-xs md:text-sm text-white/40 mt-1">
                    {t('results.data_reliability_score')}
                  </div>
                  <div className="text-[10px] md:text-xs text-white/30 mt-0.5">
                    {dataQuality.corsCompensation ? t('results.data_integrity_simulated') : t('results.data_integrity_live')}
                  </div>
                </div>
              </div>

              {dataQuality.limitations.length > 0 && (
                <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                  <div className="text-xs md:text-sm font-black text-yellow-500 uppercase mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {dataQuality.trustScore < 80 ? t('results.why_trust_low') : t('results.limitations')}
                  </div>
                  <ul className="text-xs md:text-sm text-white/60 space-y-2">
                    {dataQuality.limitations.map((lim: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-yellow-500 mt-1">•</span>
                        <span>{lim}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] md:text-xs text-white/40 uppercase mb-1">DOM</div>
                  <div className={`text-sm md:text-base font-black ${dataQuality.sources.dom ? 'text-[#00ff9d]' : 'text-red-500'}`}>
                    {dataQuality.sources.dom ? t('results.available') : t('results.blocked')}
                  </div>
                </div>
                <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] md:text-xs text-white/40 uppercase mb-1">Headers</div>
                  <div className={`text-sm md:text-base font-black ${dataQuality.sources.headers ? 'text-[#00ff9d]' : 'text-red-500'}`}>
                    {dataQuality.sources.headers ? t('results.available') : t('results.blocked')}
                  </div>
                </div>
                <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] md:text-xs text-white/40 uppercase mb-1">SSL</div>
                  <div className={`text-sm md:text-base font-black ${dataQuality.sources.ssl ? 'text-[#00ff9d]' : 'text-red-500'}`}>
                    {dataQuality.sources.ssl ? t('results.available') : t('results.limited')}
                  </div>
                </div>
                <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] md:text-xs text-white/40 uppercase mb-1">DNS</div>
                  <div className={`text-sm md:text-base font-black ${dataQuality.sources.dns ? 'text-[#00ff9d]' : 'text-red-500'}`}>
                    {dataQuality.sources.dns ? t('results.available') : t('results.unavailable')}
                  </div>
                </div>
                <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] md:text-xs text-white/40 uppercase mb-1">OSINT</div>
                  <div className={`text-sm md:text-base font-black ${dataQuality.sources.osint ? 'text-[#00ff9d]' : 'text-red-500'}`}>
                    {dataQuality.sources.osint ? t('results.available') : t('results.failed')}
                  </div>
                </div>
                <div className="p-3 md:p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] md:text-xs text-white/40 uppercase mb-1">Probes</div>
                  <div className="text-sm md:text-base font-black text-[#00d4ff]">
                    {dataQuality.sources.probes.successful}/{dataQuality.sources.probes.executed}
                  </div>
                </div>
              </div>

              {(dataQuality.sources.dom === false || dataQuality.sources.headers === false || dataQuality.sources.ssl === false) && (
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <details className="group">
                    <summary className="text-xs md:text-sm font-semibold text-white/70 cursor-pointer list-none flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                      {t('results.why_blocked_title')}
                    </summary>
                    <p className="text-[10px] md:text-xs text-white/50 mt-3 mb-2">{t('results.cors_extension_tip')}</p>
                    {dataQuality.sources.dom === false && (
                      <p className="text-[10px] md:text-xs text-white/50 mb-2"><strong className="text-white/60">DOM:</strong> {t('results.why_dom_blocked')}</p>
                    )}
                    {dataQuality.sources.headers === false && (
                      <p className="text-[10px] md:text-xs text-white/50 mb-2"><strong className="text-white/60">Headers:</strong> {t('results.why_headers_blocked')}</p>
                    )}
                    {dataQuality.sources.ssl === false && (
                      <p className="text-[10px] md:text-xs text-white/50 mb-2"><strong className="text-white/60">SSL:</strong> {t('results.why_ssl_blocked')}</p>
                    )}
                  </details>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Target Summary Section */}
        <SectionCard
          title={t('results.target_summary')}
          subtitle={t('results.target_summary_subtitle')}
          icon={Globe}
          themeColor={themeColor}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-4">
              <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-black/60 border border-white/5">
                <div className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-2" style={{ color: themeColor }}>{t('results.domain')}</div>
                <div className="text-sm md:text-lg font-mono text-white/90 break-all">{targetUrl}</div>
              </div>

              {targetIntelligence?.hosting?.ip && targetIntelligence.hosting.ip !== '0.0.0.0' && (
                <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-black/60 border border-white/5">
                  <div className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-2" style={{ color: themeColor }}>{t('results.ip_address')}</div>
                  <div className="text-sm md:text-lg font-mono text-white/90">{targetIntelligence.hosting.ip}</div>
                </div>
              )}

              {targetIntelligence?.hosting?.provider && targetIntelligence.hosting.provider !== 'Unknown' && (
                <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-black/60 border border-white/5">
                  <div className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-2" style={{ color: themeColor }}>{t('results.hosting_provider')}</div>
                  <div className="text-sm md:text-lg font-mono text-white/90">{targetIntelligence.hosting.provider}</div>
                </div>
              )}

              {targetIntelligence?.hosting?.location && targetIntelligence.hosting.location !== 'Unknown' && (
                <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-black/60 border border-white/5">
                  <div className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-2" style={{ color: themeColor }}>{t('results.location')}</div>
                  <div className="text-sm md:text-lg font-mono text-white/90">{targetIntelligence.hosting.location}</div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {targetIntelligence?.associatedLinks && targetIntelligence.associatedLinks.length > 0 && (
                <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-black/60 border border-white/5">
                  <div className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-3" style={{ color: themeColor }}>{t('results.subdomains')} / {t('results.associated_links')}</div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {targetIntelligence.associatedLinks.map((link: string, i: number) => (
                      <div key={i} className="text-xs md:text-sm font-mono text-white/70 break-all flex items-center gap-2">
                        <Link2 className="w-3 h-3 flex-shrink-0" style={{ color: themeColor }} />
                        <span>{link}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {targetIntelligence?.apis && targetIntelligence.apis.length > 0 && (
                <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-black/60 border border-white/5">
                  <div className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-3" style={{ color: themeColor }}>{t('results.apis')}</div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {targetIntelligence.apis.map((api: string, i: number) => (
                      <div key={i} className="text-xs md:text-sm font-mono text-white/70 break-all flex items-center gap-2">
                        <Code className="w-3 h-3 flex-shrink-0" style={{ color: themeColor }} />
                        <span>{api}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {targetIntelligence?.groundingSources && targetIntelligence.groundingSources.length > 0 && (
                <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-black/60 border border-white/5">
                  <div className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-2" style={{ color: themeColor }}>
                    {t('results.grounding_sources')}
                  </div>
                  <div className="text-[9px] md:text-[10px] font-mono text-white/50 mb-3">
                    {t('results.grounding_sources_subtitle')}
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {targetIntelligence.groundingSources.map((source: any, i: number) => {
                      const sourceUrl = source.uri || source.url;
                      const sourceTitle = source.title || sourceUrl || `Source ${i + 1}`;

                      if (!sourceUrl) return null;

                      return (
                        <a
                          key={i}
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs md:text-sm font-mono text-[#00d4ff] hover:text-[#00ff9d] break-all flex items-start gap-2 underline transition-colors group"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" style={{ color: themeColor }} />
                          <span className="flex-1">{sourceTitle}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
          {[
            { label: t('results.logic_flow'), val: topology.logic, icon: Waypoints, color: 'text-purple-500' },
            { label: t('results.injections'), val: topology.injection, icon: Code, color: 'text-red-500' },
            { label: t('results.net_hygiene'), val: topology.network, icon: Globe, color: 'text-blue-500' },
            { label: t('results.config_dna'), val: topology.config, icon: Settings, color: 'text-orange-500' }
          ].map(stat => (
            <div key={stat.label} className="glass-panel p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 bg-black/40 flex flex-col items-center gap-2 md:gap-4 text-center">
              <stat.icon className={`${stat.color} w-4 h-4 md:w-6 md:h-6`} />
              <div>
                <div className="text-xl md:text-3xl font-black text-white">{stat.val}</div>
                <div className="text-[9px] md:text-[10px] font-black uppercase text-white/20 tracking-[0.2em]">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Level Scan Details Section */}
        <SectionCard
          title={t('results.level_scan_details')}
          subtitle={t('results.level_scan_details_subtitle')}
          icon={Microscope}
          themeColor={LEVEL_COLORS[level]}
        >
          <div className="space-y-6">
            <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-black/60 border border-white/5">
              <div className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-3" style={{ color: LEVEL_COLORS[level] }}>
                {t('level_details.' + level.toLowerCase() + '.data_collected')}
              </div>
              <div className="text-xs md:text-sm font-mono text-white/70">
                {t('level_details.' + level.toLowerCase() + '.ai_model')} | {t('level_details.' + level.toLowerCase() + '.thinking_budget')}
              </div>
            </div>

            <div>
              <div className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-4" style={{ color: LEVEL_COLORS[level] }}>
                {t('results.scans_performed')}
              </div>
              <div className="space-y-3">
                {(en.level_details[level.toLowerCase() as 'fast' | 'standard' | 'deep']?.scans || []).map((scan: any, i: number) => (
                  <div key={i} className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-black/40 border border-white/5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                      <div className="text-sm md:text-base font-black text-white uppercase">{scan.test}</div>
                      <div className="text-xs font-mono px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60">
                        {scan.accuracy}
                      </div>
                    </div>
                    <div className="text-xs md:text-sm font-mono text-white/50">{scan.method}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t('results.executive_intel')} subtitle={t('results.forensic_target_reasoning')} icon={Target} themeColor={themeColor}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mb-6 md:mb-10">
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-black/60 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-1 block" style={{ color: themeColor }}>{t('results.security_score')}</span>
                <div className="text-4xl md:text-6xl font-black text-white">{securityScore}<span className="text-sm md:text-xl text-white/20">/100</span></div>
              </div>
              <div className="p-4 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5" style={{ color: themeColor }}>
                <ShieldCheck className="w-8 h-8 md:w-12 md:h-12" />
              </div>
            </div>
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-black/60 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-1 block" style={{ color: LEVEL_COLORS.FAST }}>{t('results.audit_intensity')}</span>
                <div className="text-2xl md:text-4xl font-black text-white uppercase">{level}</div>
              </div>
              <div className="p-4 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5" style={{ color: LEVEL_COLORS.FAST }}>
                <Microscope className="w-8 h-8 md:w-12 md:h-12" />
              </div>
            </div>
            {missionDuration && (
              <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-black/60 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-1 block" style={{ color: '#00ff9d' }}>{t('results.mission_duration')}</span>
                  <div className="text-2xl md:text-4xl font-black text-white">{missionDuration.formatted}</div>
                  <div className="text-[9px] md:text-[11px] text-white/40 mt-1 font-mono">
                    {missionDuration.startTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })} - {missionDuration.endTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
                <div className="p-4 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5" style={{ color: '#00ff9d' }}>
                  <Timer className="w-8 h-8 md:w-12 md:h-12" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 md:space-y-8">
            <div className="p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <FileSearch size={16} style={{ color: themeColor }} />
                <div className="text-[10px] md:text-[12px] font-black text-white/20 uppercase tracking-widest">{t('results.neural_forensic_deduction')}</div>
              </div>
              <p className="text-sm md:text-lg font-mono text-white/70 leading-relaxed uppercase whitespace-pre-wrap">{targetIntelligence?.forensicAnalysis}</p>
            </div>

            <div className="glass-panel p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border bg-black/40 shadow-inner" style={{ borderColor: `${themeColor}33` }}>
              <div className="flex items-center gap-3 mb-6 md:mb-8">
                <Terminal size={16} style={{ color: themeColor }} />
                <div className="text-[10px] md:text-[12px] font-black uppercase tracking-widest" style={{ color: themeColor }}>{t('labels.forensic_logs')}</div>
              </div>
              <div className="space-y-3 font-mono text-[10px] md:text-[12px] uppercase max-h-[400px] overflow-y-auto terminal-scroll">
                {telemetry.length > 0 ? (
                  telemetry.map((log: TelemetryEntry, i: number) => {
                    const logColor =
                      log.type === 'error' ? '#ef4444' :
                        log.type === 'success' ? '#00ff9d' :
                          log.type === 'warn' ? '#f59e0b' :
                            log.type === 'probe' ? themeColor :
                              themeColor;
                    return (
                      <div key={i} className="flex gap-4" style={{
                        color: log.type === 'error' ? 'rgba(239, 68, 68, 0.6)' :
                          log.type === 'success' ? 'rgba(0, 255, 157, 0.8)' :
                            log.type === 'warn' ? 'rgba(245, 158, 11, 0.7)' :
                              'rgba(255, 255, 255, 0.5)'
                      }}>
                        <span style={{ color: logColor }}>[{log.timestamp}]</span>
                        <span className="flex-1">{log.msg}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex gap-4 text-white/30">
                    <span style={{ color: themeColor }}>[--:--:--]</span>
                    <span>{t('results.no_telemetry')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Business Logic Section */}
        <SectionCard
          title={t('results.business_logic')}
          subtitle={t('results.business_logic_subtitle')}
          icon={Braces}
          themeColor={themeColor}
        >
          <div className="space-y-6 md:space-y-8">
            {targetIntelligence?.purpose && targetIntelligence.purpose !== '---' && (
              <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <Target size={16} style={{ color: themeColor }} />
                  <div className="text-[10px] md:text-[12px] font-black text-white/20 uppercase tracking-widest">{t('results.purpose')}</div>
                </div>
                <p className="text-sm md:text-lg font-mono text-white/70 leading-relaxed uppercase whitespace-pre-wrap">{targetIntelligence.purpose}</p>
              </div>
            )}

            {targetIntelligence?.businessLogic && targetIntelligence.businessLogic !== '---' && (
              <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <Braces size={16} style={{ color: themeColor }} />
                  <div className="text-[10px] md:text-[12px] font-black text-white/20 uppercase tracking-widest">{t('results.business_logic')}</div>
                </div>
                <p className="text-sm md:text-lg font-mono text-white/70 leading-relaxed uppercase whitespace-pre-wrap">{targetIntelligence.businessLogic}</p>
              </div>
            )}

            {targetIntelligence?.attackSurfaceSummary && targetIntelligence.attackSurfaceSummary !== '---' && (
              <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <ShieldAlert size={16} style={{ color: themeColor }} />
                  <div className="text-[10px] md:text-[12px] font-black text-white/20 uppercase tracking-widest">{t('results.attack_surface')}</div>
                </div>
                <p className="text-sm md:text-lg font-mono text-white/70 leading-relaxed uppercase whitespace-pre-wrap">{targetIntelligence.attackSurfaceSummary}</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Probe Execution Details Section */}
        {dispatchedProbes && dispatchedProbes.length > 0 && (
          <SectionCard
            title={t('pdf.probe_execution_details')}
            subtitle={t('pdf.probe_execution_subtitle')}
            icon={Activity}
            themeColor={themeColor}
          >
            <div className="space-y-4 md:space-y-6">
              <div className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex gap-3">
                  <AlertCircle className="shrink-0 w-5 h-5 md:w-6 md:h-6 text-amber-500/80 mt-0.5" />
                  <div>
                    <div className="text-xs md:text-sm font-bold text-amber-200/90 uppercase tracking-wide mb-1">{t('pdf.probe_spa_disclaimer_title')}</div>
                    <p className="text-[11px] md:text-sm font-mono text-white/60 leading-relaxed">{t('pdf.probe_spa_disclaimer')}</p>
                  </div>
                </div>
              </div>
              {dispatchedProbes.map((probe: DispatchedProbe, i: number) => (
                <div key={i} className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-black/40 border border-white/5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10" style={{ color: themeColor }}>
                        <Terminal size={16} />
                      </div>
                      <div>
                        <div className="text-sm md:text-lg font-black text-white uppercase font-mono">
                          {probe.method} {probe.endpoint}
                        </div>
                        <div className="text-xs md:text-sm text-white/40 font-mono mt-1">
                          {probe.status || 'N/A'} | {probe.responseTime ? `${probe.responseTime}ms` : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {probe.vulnerable && (
                        <span className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 text-[10px] md:text-xs font-black uppercase border border-red-500/20">
                          {t('pdf.vulnerable')}
                        </span>
                      )}
                      {probe.corsBlocked && (
                        <span className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-500 text-[10px] md:text-xs font-black uppercase border border-orange-500/20">
                          {t('pdf.cors_blocked')}
                        </span>
                      )}
                    </div>
                  </div>

                  {probe.description && (
                    <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] md:text-[12px] font-black uppercase tracking-widest mb-2 text-white/40">
                        {t('pdf.description')}
                      </div>
                      <p className="text-xs md:text-sm font-mono text-white/70 leading-relaxed">{probe.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {findings.length > 0 && (
          <SectionCard title={t('results.vulnerability_ledger')} subtitle={t('results.verified_findings')} icon={ShieldAlert} themeColor={LEVEL_COLORS.DEEP}>
            <p className="text-[10px] md:text-[11px] font-mono text-white/40 uppercase tracking-wider mb-6 md:mb-8 px-1">{t('results.finding_origin_disclaimer')}</p>
            <div className="space-y-8 md:space-y-12">
              {findings.map((f: any, i: number) => (
                <div key={i} className="p-8 md:p-14 rounded-[2.5rem] md:rounded-[5rem] border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all relative overflow-hidden shadow-3xl">
                  <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-red-500 opacity-30 shadow-[0_0_20px_red]" />
                  <div className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-10 gap-6">
                    <div className="flex-1">
                      <h4 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-4 leading-tight">{f.title}</h4>
                      <div className="flex flex-wrap gap-2 md:gap-4 items-center">
                        <span className="px-3 md:px-5 py-1.5 md:py-2 rounded-xl md:rounded-2xl bg-red-500/10 text-red-500 text-[10px] md:text-[12px] font-black uppercase border border-red-500/20">{f.severity}{t('results.severity_severity')}</span>
                        <span className="px-3 md:px-5 py-1.5 md:py-2 rounded-xl md:rounded-2xl bg-white/5 text-white/40 text-[10px] md:text-[12px] font-mono uppercase border border-white/10">{f.cwe}</span>
                        <span className={`px-3 md:px-5 py-1.5 md:py-2 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase border ${(f.confidence === 'High') ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          {(f.confidence === 'High') ? t('results.confidence_confirmed') : t('results.confidence_potential')}
                        </span>
                        {f.verificationStatus && (
                          <span className={`px-3 md:px-5 py-1.5 md:py-2 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase border ${
                            f.verificationStatus === 'High' ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/20' :
                            f.verificationStatus === 'Potential' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                            'bg-white/5 text-white/40 border-white/10'
                          }`}>
                            {f.verificationStatus === 'High' ? t('results.verification_high') : f.verificationStatus === 'Potential' ? t('results.verification_potential') : t('results.verification_unknown')}
                          </span>
                        )}
                        <span className="px-3 md:px-5 py-1.5 md:py-2 rounded-xl md:rounded-2xl bg-orange-500/10 text-orange-500 text-[9px] md:text-[11px] font-black uppercase border border-orange-500/20">{t('results.chain_high')}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 shrink-0">
                      <AlertOctagon className="text-red-500 w-8 h-8 md:w-10 md:h-10" />
                    </div>
                  </div>

                  <p className="text-sm md:text-lg font-mono text-white/50 mb-8 md:mb-10 uppercase leading-relaxed max-w-4xl">{f.description}</p>

                  {f.evidenceLinks && f.evidenceLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="text-[9px] md:text-[11px] font-black uppercase text-white/40 tracking-widest mr-2">{t('results.evidence_links')}:</span>
                      {f.evidenceLinks.map((link: string, j: number) => (
                        <a key={j} href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] md:text-[11px] font-mono text-[#00ff9d]/90 hover:bg-[#00ff9d]/10 hover:border-[#00ff9d]/30 transition-colors">
                          <ExternalLink size={12} /> NIST/MITRE
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="bg-black/95 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 overflow-hidden mb-8 md:mb-12 shadow-4xl">
                    <div className="px-6 py-4 md:px-8 md:py-5 bg-white/5 border-b border-white/5 flex justify-between items-center">
                      <div className="flex items-center gap-2 md:gap-3">
                        <Terminal size={14} style={{ color: themeColor }} />
                        <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-white/40">{t('results.proof_of_concept_script')}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                      </div>
                    </div>
                    <div className="p-6 md:p-10 font-mono text-[11px] md:text-[14px] text-[#00ff9d]/80 overflow-x-auto terminal-scroll leading-relaxed">
                      <pre><code>{f.poc || t('results.payload_verification')}</code></pre>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-[#00ff9d]/5 border border-[#00ff9d]/10">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle2 size={16} className="text-[#00ff9d]" />
                        <div className="text-[9px] md:text-[11px] text-[#00ff9d] font-black uppercase tracking-widest">{t('results.remediation_directive')}</div>
                      </div>
                      <p className="text-[11px] md:text-[13px] font-mono text-white/80 uppercase leading-relaxed">{f.remediation}</p>
                    </div>
                    <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-orange-500/5 border border-orange-500/10">
                      <div className="flex items-center gap-3 mb-4">
                        <Zap size={16} className="text-orange-500" />
                        <div className="text-[9px] md:text-[11px] text-orange-500 font-black uppercase tracking-widest">{t('results.business_impact')}</div>
                      </div>
                      <p className="text-[11px] md:text-[13px] font-mono text-white/80 uppercase leading-relaxed">{f.businessImpact || t('results.high_risk_logic')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard title={t('results.technology_dna')} subtitle={t('results.detected_tech_stack')} icon={Fingerprint} themeColor={LEVEL_COLORS.STANDARD}>
          {technologyDNAByCategory.length === 0 ? (
            <p className="text-sm md:text-base font-mono text-white/50 uppercase">No technologies detected (e.g. DOM/headers blocked by CORS).</p>
          ) : (
          <div className="space-y-8 md:space-y-10">
            {technologyDNAByCategory.map(({ categoryKey, items }) => (
              <div key={categoryKey}>
                <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] mb-4 md:mb-6" style={{ color: themeColor }}>
                  {t(`results.${categoryKey}`)}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {items.map((tech: TechItem, i: number) => (
                    <div key={`${categoryKey}-${i}`} className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/5 bg-black/40 flex flex-col group hover:bg-white/[0.02] transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-1 min-w-0">
                          <h5 className="text-base md:text-lg font-black text-white uppercase tracking-tight truncate">{tech.name}</h5>
                          <div className="flex flex-wrap items-center gap-2 text-[9px] md:text-[10px] font-mono text-white/50">
                            <span>{t('results.tech_version_label')}: {tech.version || '—'}</span>
                            <span className="text-white/30">|</span>
                            <span>{t('results.tech_category_label')}: {tech.category}</span>
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${tech.status === 'Stable' ? 'bg-[#00ff9d]' : 'bg-orange-500'} animate-pulse`} title={tech.status} />
                      </div>
                      <div className="p-4 md:p-5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-2 mt-auto">
                        <div className="text-[8px] md:text-[9px] text-white/20 font-black uppercase tracking-[0.15em]">{t('results.tech_status_label')}</div>
                        <span className={`text-[9px] md:text-[10px] font-black uppercase ${tech.status === 'Stable' ? 'text-[#00ff9d]' : 'text-orange-500'}`}>{tech.status}</span>
                        {tech.actionPlan ? (
                          <>
                            <div className="text-[8px] md:text-[9px] text-white/20 font-black uppercase tracking-[0.15em] mt-1">{t('results.tech_action_plan_label')}</div>
                            <p className="text-[9px] md:text-[10px] font-mono text-white/50 uppercase leading-relaxed">{tech.actionPlan}</p>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          )}
        </SectionCard>
      </main>

      <footer className="fixed bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 glass-panel p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border border-white/10 bg-black/95 flex items-center gap-10 md:gap-20 z-50 shadow-4xl backdrop-blur-3xl" style={{ borderBottom: `4px solid ${themeColor}` }}>
        <div className="flex flex-col">
          <span className="text-[8px] md:text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Neural_Load</span>
          <span className="text-lg md:text-2xl font-black" style={{ color: themeColor }}>{usage.tokens.toLocaleString()} <span className="text-[10px] md:text-xs text-white/20">TOKENS</span></span>
        </div>
        <div className="w-[1px] h-10 md:h-16 bg-white/10" />
        <div className="flex flex-col">
          <span className="text-[8px] md:text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Est_Compute</span>
          <span className="text-lg md:text-2xl font-black text-[#00ff9d]">${usage.cost.toFixed(4)}</span>
        </div>
      </footer>
    </div>
  );
};
