
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, RotateCcw, ShieldAlert, X, Activity, Target, Cpu, ExternalLink,
  Link2, CheckSquare, Square, Filter, AlertTriangle, Shield, CheckCircle2,
  Lock, Terminal, Code, Settings, ChevronRight, MessageSquare, Send, User, Bot, Search,
  Fingerprint, Database, Zap, Waypoints, Box, ShieldEllipsis, AlertCircle, FileSearch,
  Microscope, Braces, Globe, ShieldCheck, AlertOctagon, CheckCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ScanLevel, MissionReport } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import en from '../locales/en.ts';

const LEVEL_COLORS: Record<ScanLevel, string> = {
  FAST: '#4ade80',
  STANDARD: '#00d4ff',
  DEEP: '#ef4444'
};

const SectionCard = ({ title, subtitle, icon: Icon, children, themeColor }: any) => {
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

export const ResultsPage = ({ missionReport, usage, targetUrl, level, onReset, telemetry = [], dispatchedProbes = [] }: any) => {
  const { t } = useLanguage();
  const { targetIntelligence, technologyDNA = [], findings = [], activeProbes = [], securityScore = 0, dataQuality } = missionReport;

  const themeColor = useMemo(() => LEVEL_COLORS[level as ScanLevel] || '#00d4ff', [level]);

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 212, 255]; // Fallback to Vault Blue
  };

  // English-only translation function for PDF (always uses English regardless of UI language)
  const tEn = (path: string) => {
    return path.split('.').reduce((obj: any, key: string) => obj?.[key], en) || path;
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString();
      let hostname = "target";
      try {
        hostname = new URL(targetUrl).hostname;
      } catch(e) {}
      
      const rgb = hexToRgb(themeColor);
      
      // Header Styling
      doc.setFillColor(2, 4, 8); // Deep Navy
      doc.rect(0, 0, 210, 45, 'F');
      
      // Title
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.setFont("courier", "bold");
      doc.setFontSize(24);
      doc.text(tEn('pdf.title'), 15, 20);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(tEn('pdf.subtitle'), 15, 28);
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`${tEn('pdf.target_ident')}: ${targetUrl}`, 15, 38);
      doc.text(`${tEn('pdf.timestamp')}: ${timestamp}`, 140, 38);

      // Body Sections
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(tEn('pdf.executive_intelligence'), 15, 60);
      
      doc.setFontSize(10);
      doc.text(`${tEn('pdf.risk_score')}: ${securityScore}/100`, 15, 70);
      doc.text(`${tEn('pdf.mission_intensity')}: ${level}`, 15, 75);
      doc.text(`${tEn('pdf.neural_load')}: ${usage.tokens.toLocaleString()} ${tEn('pdf.tokens')}`, 15, 80);
      
      // Data Quality Section
      if (dataQuality) {
        let yPos = 95;
        
        // AI Compensation Mode Section
        if (dataQuality.corsCompensation) {
          doc.setFillColor(128, 0, 128); // Purple background
          doc.rect(15, yPos, 180, 25, 'F');
          
          doc.setTextColor(255, 255, 255);
          doc.setFont("courier", "bold");
          doc.setFontSize(12);
          doc.text("AI INTELLIGENCE COMPENSATION MODE", 20, yPos + 8);
          
          doc.setFontSize(9);
          doc.setFont("courier", "normal");
          doc.text("Direct scan blocked by CORS. AI compensated using:", 20, yPos + 15);
          doc.text("- Advanced reasoning on SSL, DNS, OSINT data", 20, yPos + 20);
          
          yPos += 30;
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
        yPos += 10;
        
        if (dataQuality.limitations.length > 0) {
          doc.setFontSize(9);
          doc.setTextColor(200, 100, 0);
          doc.text(`${tEn('pdf.limitations')}:`, 15, yPos);
          yPos += 7;
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          dataQuality.limitations.forEach((lim: string) => {
            doc.text(`• ${lim}`, 20, yPos);
            yPos += 6;
          });
          yPos += 5;
        }
      }

      let yPos = dataQuality ? 140 : 90;

      // Forensic Analysis
      const splitAnalysis = doc.splitTextToSize(`${tEn('pdf.forensic_deduction')}: ${targetIntelligence?.forensicAnalysis || tEn('pdf.no_analysis')}`, 180);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      splitAnalysis.forEach((line: string) => {
        doc.text(line, 15, yPos);
        yPos += 5;
      });
      yPos += 10;

      // Technology DNA Section
      if (technologyDNA && technologyDNA.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(tEn('pdf.technology_dna'), 15, yPos);
        yPos += 8;
        
        doc.setFontSize(8);
        technologyDNA.forEach((tech: any) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.setTextColor(0, 0, 0);
          doc.setFont("courier", "bold");
          doc.text(`${tech.name} ${tech.version}`, 15, yPos);
          yPos += 5;
          doc.setFont("courier", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(`${tEn('pdf.category')}: ${tech.category} | ${tEn('pdf.status')}: ${tech.status}`, 15, yPos);
          yPos += 5;
          const actionPlan = doc.splitTextToSize(`${tEn('pdf.action')}: ${tech.actionPlan}`, 180);
          actionPlan.forEach((line: string) => {
            doc.text(line, 20, yPos);
            yPos += 4;
          });
          yPos += 5;
        });
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
        
        doc.setFontSize(8);
        dispatchedProbes.forEach((probe: any) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.setTextColor(0, 0, 0);
          doc.setFont("courier", "bold");
          doc.text(`${probe.method} ${probe.endpoint}`, 15, yPos);
          yPos += 5;
          doc.setFont("courier", "normal");
          doc.setTextColor(100, 100, 100);
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
            const desc = doc.splitTextToSize(`${tEn('pdf.description')}: ${probe.description}`, 180);
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

        findings.forEach((f: any, index: number) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          
          // Title
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont("courier", "bold");
          const title = doc.splitTextToSize(`${index + 1}. ${f.title}`, 180);
          title.forEach((line: string) => {
            doc.text(line, 15, yPos);
            yPos += 5;
          });
          yPos += 2;

          // Severity, CWE, and Confidence
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.setFont("courier", "normal");
          const confidenceText = f.confidence ? ` | ${tEn('pdf.confidence')}: ${f.confidence.toUpperCase()}` : '';
          doc.text(`${tEn('pdf.severity')}: ${f.severity.toUpperCase()} | ${tEn('pdf.cwe')}: ${f.cwe || 'N/A'}${confidenceText}`, 15, yPos);
          yPos += 5;
          
          // Evidence Sources (if available)
          if (f.evidence && Array.isArray(f.evidence) && f.evidence.length > 0) {
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`${tEn('pdf.evidence_sources')}: ${f.evidence.join(', ')}`, 15, yPos);
            yPos += 4;
          }

          // Full Description
          doc.setTextColor(0, 0, 0);
          const description = doc.splitTextToSize(`${tEn('pdf.description')}: ${f.description || tEn('pdf.no_description')}`, 180);
          description.forEach((line: string) => {
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
          const remediation = doc.splitTextToSize(f.remediation || tEn('pdf.no_remediation'), 180);
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
            const impact = doc.splitTextToSize(f.businessImpact, 180);
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
            const poc = doc.splitTextToSize(f.poc, 180);
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
        doc.setTextColor(100, 100, 100);
        doc.text(tEn('pdf.no_vulnerabilities'), 15, yPos);
      }

      doc.save(`VaultGuard_Debrief_${hostname}.pdf`);
    } catch (error: any) {
      console.error("PDF Generation Error:", error);
      const errorMessage = error?.message || 'Unknown error occurred during PDF generation';
      alert(`${t('pdf.error_generating')}\n\nError: ${errorMessage}`);
    }
  };

  const topology = useMemo(() => {
    const counts = { logic: 0, config: 0, injection: 0, network: 0 };
    findings.forEach((f: any) => {
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
            onClick={generatePDF}
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
                </div>
              </div>
              
              {dataQuality.limitations.length > 0 && (
                <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                  <div className="text-xs md:text-sm font-black text-yellow-500 uppercase mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {t('results.limitations')}
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
            </div>
          </SectionCard>
        )}
        
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
                      telemetry.map((log: any, i: number) => {
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

        {findings.length > 0 && (
          <SectionCard title={t('results.vulnerability_ledger')} subtitle={t('results.verified_findings')} icon={ShieldAlert} themeColor={LEVEL_COLORS.DEEP}>
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
                           <span className="px-3 md:px-5 py-1.5 md:py-2 rounded-xl md:rounded-2xl bg-orange-500/10 text-orange-500 text-[9px] md:text-[11px] font-black uppercase border border-orange-500/20">{t('results.chain_high')}</span>
                        </div>
                     </div>
                     <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 shrink-0">
                        <AlertOctagon className="text-red-500 w-8 h-8 md:w-10 md:h-10" />
                     </div>
                  </div>
                  
                  <p className="text-sm md:text-lg font-mono text-white/50 mb-8 md:mb-10 uppercase leading-relaxed max-w-4xl">{f.description}</p>
                  
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
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              {technologyDNA.map((tech: any, i: number) => (
                <div key={i} className="p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/5 bg-black/40 flex flex-col group hover:bg-white/[0.02] transition-all">
                   <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                         <h5 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">{tech.name}</h5>
                         <div className="text-[9px] md:text-[11px] font-black uppercase tracking-widest" style={{ color: themeColor }}>{tech.category}</div>
                      </div>
                      <span className="text-[9px] md:text-[11px] font-mono px-3 md:px-4 py-1 rounded-xl bg-white/5 border border-white/10 text-white/40 group-hover:text-[#00ff9d] transition-colors">{tech.version}</span>
                   </div>
                   <div className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3 md:gap-4 mt-auto">
                      <div className="text-[8px] md:text-[9px] text-white/20 font-black uppercase tracking-[0.2em]">Neural_Security_Status</div>
                      <div className="flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full ${tech.status === 'Stable' ? 'bg-[#00ff9d]' : 'bg-orange-500'} animate-pulse`} />
                         <span className={`text-[10px] md:text-[11px] font-black uppercase ${tech.status === 'Stable' ? 'text-[#00ff9d]' : 'text-orange-500'}`}>{tech.status}</span>
                      </div>
                      <p className="text-[10px] md:text-[12px] font-mono text-white/60 uppercase leading-relaxed">{tech.actionPlan}</p>
                   </div>
                </div>
              ))}
           </div>
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
