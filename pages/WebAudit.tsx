
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Activity, Server, Terminal, Cpu, Zap, ChevronUp, ChevronDown, 
  Send, Globe, HardDrive, Network, ChevronRight
} from 'lucide-react';
import { ScanStatus, TelemetryEntry, DispatchedProbe } from '../hooks/useScanner';
import { MissionReport, ScanLevel, VulnerabilityFinding } from '../services/geminiService';
import { VirtualHUD } from '../components/VirtualHUD';
import { useLanguage } from '../contexts/LanguageContext';

const LEVEL_COLORS: Record<ScanLevel, string> = {
  FAST: '#4ade80',
  STANDARD: '#00d4ff',
  DEEP: '#ef4444'
};

interface WebAuditProps {
  phase: ScanStatus;
  progress: number;
  telemetry: TelemetryEntry[];
  targetUrl: string;
  report: MissionReport;
  level: ScanLevel;
  recentFindings?: VulnerabilityFinding[];
  dispatchedProbes?: DispatchedProbe[];
}

const GENERIC_COMMANDS = [
  "nmap -sV -sC -T4 [TARGET]",
  "gobuster dir -u [TARGET] -w common.txt",
  "nikto -h [TARGET] -ssl",
  "ffuf -u [TARGET]/FUZZ -w wordlist.txt",
  "sqlmap -u [TARGET] --batch --banner",
  "subfinder -d [DOMAIN] -silent",
  "nuclei -t vulnerabilities/ -u [TARGET]"
];

// Parse telemetry to determine current activity and relevant commands
const getCurrentActivity = (telemetry: TelemetryEntry[], targetUrl: string, domain: string): {
  phase: string;
  commands: string[];
} => {
  if (telemetry.length === 0) {
    return { phase: 'idle', commands: [] };
  }

  const lastLog = telemetry[telemetry.length - 1];
  const msg = lastLog.msg.toLowerCase();

  // Preflight/Validation Phase
  if (msg.includes('[preflight]') || msg.includes('validating') || msg.includes('connectivity')) {
    return {
      phase: 'preflight',
      commands: [
        `ping -c 4 ${domain}`,
        `nslookup ${domain}`
      ]
    };
  }

  // Network Discovery Phase
  if (msg.includes('[network]') && (msg.includes('collecting') || msg.includes('target'))) {
    return {
      phase: 'network_discovery',
      commands: [
        `nmap -sV -sC -T4 ${targetUrl}`,
        `subfinder -d ${domain} -silent`,
        `dig ${domain} +short`
      ]
    };
  }

  // OSINT Phase
  if (msg.includes('[osint]') || msg.includes('grounding') || msg.includes('cve data')) {
    return {
      phase: 'osint',
      commands: [
        `subfinder -d ${domain} -silent`,
        `whois ${domain}`,
        `dig ${domain} ANY +noall +answer`
      ]
    };
  }

  // SSL/TLS Analysis
  if (msg.includes('ssl') || msg.includes('tls') || msg.includes('certificate') || msg.includes('ssl grade')) {
    return {
      phase: 'ssl_analysis',
      commands: [
        `nmap --script ssl-enum-ciphers -p 443 ${targetUrl}`,
        `sslscan ${targetUrl}`
      ]
    };
  }

  // DNS Analysis
  if (msg.includes('dns') || msg.includes('resolved ip') || msg.includes('ip address')) {
    return {
      phase: 'dns_analysis',
      commands: [
        `dig ${domain} +short`,
        `nslookup ${domain}`,
        `host ${domain}`
      ]
    };
  }

  // Security Headers Analysis
  if (msg.includes('header') || msg.includes('security headers') || msg.includes('missing headers')) {
    return {
      phase: 'headers_analysis',
      commands: [
        `curl -I ${targetUrl}`,
        `nmap --script http-headers ${targetUrl}`
      ]
    };
  }

  // AI/Neural Analysis Phase
  if (msg.includes('[ai]') || msg.includes('[neural]') || msg.includes('reasoning') || msg.includes('analyzing technology')) {
    return {
      phase: 'ai_analysis',
      commands: [
        `nuclei -t vulnerabilities/ -u ${targetUrl}`,
        `nuclei -t ai-analysis/ -u ${targetUrl}`
      ]
    };
  }

  // AI Compensation Mode
  if (msg.includes('ai_compensation') || msg.includes('compensation') || msg.includes('cors restriction')) {
    return {
      phase: 'ai_compensation',
      commands: [
        `nuclei -t ai-reasoning/ -u ${targetUrl}`,
        `nmap --script vuln ${targetUrl}`
      ]
    };
  }

  // Probe Execution Phase
  if (msg.includes('[probe]') || msg.includes('executing') || msg.includes('http probe') || msg.includes('tactical')) {
    return {
      phase: 'probing',
      commands: [
        `gobuster dir -u ${targetUrl} -w common.txt`,
        `ffuf -u ${targetUrl}/FUZZ -w wordlist.txt`,
        `nikto -h ${targetUrl} -ssl`
      ]
    };
  }

  // Vulnerability Detection
  if (msg.includes('[vuln]') || msg.includes('vulnerability') || msg.includes('detected') || msg.includes('finding')) {
    return {
      phase: 'vulnerability_scan',
      commands: [
        `sqlmap -u ${targetUrl} --batch --banner`,
        `nuclei -t vulnerabilities/ -u ${targetUrl}`,
        `nmap --script vuln ${targetUrl}`
      ]
    };
  }

  // Technology DNA Analysis
  if (msg.includes('technology') || msg.includes('dna') || msg.includes('infrastructure') || msg.includes('tech stack')) {
    return {
      phase: 'tech_dna',
      commands: [
        `nmap -sV ${targetUrl}`,
        `whatweb ${targetUrl}`,
        `wappalyzer ${targetUrl}`
      ]
    };
  }

  // Sandbox/Simulation Phase
  if (msg.includes('[sandbox]') || msg.includes('heuristic') || msg.includes('simulation')) {
    return {
      phase: 'sandbox',
      commands: [
        `nuclei -t vulnerabilities/ -u ${targetUrl}`,
        `nmap --script vuln ${targetUrl}`
      ]
    };
  }

  // Data Quality Assessment
  if (msg.includes('data_quality') || msg.includes('trust score') || msg.includes('limitations')) {
    return {
      phase: 'data_quality',
      commands: [
        `nmap -sV -sC ${targetUrl}`,
        `nikto -h ${targetUrl} -ssl`
      ]
    };
  }

  // Default/General Phase
  return {
    phase: 'general',
    commands: [`nmap -sV -sC -T4 ${targetUrl}`]
  };
};

export const WebAudit = ({ phase, progress, telemetry, targetUrl, report, level, recentFindings = [], dispatchedProbes = [] }: WebAuditProps) => {
  const { t } = useLanguage();
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const probeScrollRef = useRef<HTMLDivElement>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [currentCommandIndex, setCurrentCommandIndex] = useState(0);

  const themeColor = useMemo(() => LEVEL_COLORS[level as ScanLevel] || '#00d4ff', [level]);

  const domain = useMemo(() => {
    try {
      return new URL(targetUrl).hostname;
    } catch {
      return targetUrl;
    }
  }, [targetUrl]);

  // Get context-aware commands based on telemetry
  const currentActivity = useMemo(() => {
    return getCurrentActivity(telemetry, targetUrl, domain);
  }, [telemetry, targetUrl, domain]);

  // Use context commands, fallback to generic if no context
  const activeCommands = useMemo(() => {
    const commands = currentActivity.commands.length > 0 
      ? currentActivity.commands 
      : GENERIC_COMMANDS;
    
    return commands.map(cmd => 
      cmd.replace(/\[TARGET\]|target_url|target_ip/gi, targetUrl || 'localhost')
         .replace(/\[DOMAIN\]|target_domain/gi, domain || 'local.host')
    );
  }, [currentActivity, targetUrl, domain]);

  // Update command history when telemetry changes (phase changes)
  useEffect(() => {
    if (currentActivity.commands.length > 0 && telemetry.length > 0) {
      const newCommand = activeCommands[0]; // Use first command from current phase
      
      setCommandHistory(prev => {
        // Only add if it's different from the last command (avoid duplicates)
        if (prev.length === 0 || prev[prev.length - 1] !== newCommand) {
          return [...prev.slice(-6), newCommand]; // Keep last 6 commands
        }
        return prev;
      });
    }
  }, [currentActivity.phase, activeCommands, telemetry.length]);

  // Cycle through commands in current phase (slower, more realistic)
  const cycleSpeed = useMemo(() => {
    if (level === 'FAST') return 3000;
    if (level === 'DEEP') return 7000;
    return 5000;
  }, [level]);

  // Optional: Cycle through commands in current phase
  useEffect(() => {
    if (activeCommands.length <= 1) return; // Don't cycle if only one command
    
    const interval = setInterval(() => {
      setCurrentCommandIndex(prev => (prev + 1) % activeCommands.length);
    }, cycleSpeed);
    
    return () => clearInterval(interval);
  }, [activeCommands, cycleSpeed]);

  // Merged log entries: combine telemetry and commands
  const mergedLogs = useMemo(() => {
    const logs: Array<{ type: 'telemetry' | 'command'; timestamp: string; content: string; logType?: string; isAiCompensation?: boolean }> = [];
    
    // Add telemetry entries
    telemetry.forEach((log: TelemetryEntry) => {
      logs.push({
        type: 'telemetry',
        timestamp: log.timestamp,
        content: log.msg,
        logType: log.type,
        isAiCompensation: log.msg?.includes('AI_COMPENSATION') || log.msg?.includes('AI Compensation') || log.msg?.includes('AI intelligence compensation')
      });
    });

    // Add command entries - sync with telemetry timestamps
    commandHistory.forEach((cmd, idx) => {
      // Try to match command with telemetry timestamp
      // Use telemetry timestamp if available, otherwise estimate
      const telemetryIndex = Math.min(idx, telemetry.length - 1);
      const cmdTimestamp = telemetryIndex >= 0 && telemetry[telemetryIndex]
        ? telemetry[telemetryIndex].timestamp
        : new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      logs.push({
        type: 'command',
        timestamp: cmdTimestamp,
        content: cmd
      });
    });

    // Sort by timestamp
    return logs.sort((a, b) => {
      const timeA = a.timestamp.split(':').map(Number);
      const timeB = b.timestamp.split(':').map(Number);
      const secondsA = timeA[0] * 3600 + timeA[1] * 60 + timeA[2];
      const secondsB = timeB[0] * 3600 + timeB[1] * 60 + timeB[2];
      return secondsA - secondsB;
    });
  }, [telemetry, commandHistory, cycleSpeed]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [mergedLogs]);

  useEffect(() => {
    if (probeScrollRef.current) probeScrollRef.current.scrollTo({ top: probeScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [dispatchedProbes]);

  return (
    <div className="fixed inset-0 bg-[#020408] overflow-hidden flex flex-col font-mono text-white select-none">
      <VirtualHUD phase={phase} report={report} targetUrl={targetUrl} recentFindings={recentFindings} level={level} />

      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-50 p-4 sm:p-8 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <img 
            src="/assets/images/LOGO.png" 
            alt="VaultGuard Pro" 
            className="w-10 h-10 md:w-12 md:h-12 object-contain shrink-0"
          />
          <div className="p-3 bg-black/60 border rounded-xl backdrop-blur-md shadow-2xl transition-colors duration-500" style={{ borderColor: `${themeColor}33` }}>
            <Shield className="w-6 h-6" style={{ color: themeColor }} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest uppercase text-white/90 drop-shadow-lg leading-none">{t('app_title')}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black uppercase" style={{ color: themeColor }}>{t('webaudit.mission_active')}_{level}</span>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
            </div>
          </div>
        </div>
        <div className="bg-black/60 p-3 rounded-xl border border-white/5 backdrop-blur-md pointer-events-auto">
          <span className="text-[10px] font-black text-white/30 uppercase mr-3">{t('webaudit.progress')}</span>
          <span className="text-xl font-black text-white" style={{ color: themeColor }}>{progress}%</span>
        </div>
      </header>

      {/* Active Payload Dispatcher */}
      <AnimatePresence>
        {phase === 'Probing' && (
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute top-32 right-2 sm:right-4 md:right-8 w-[calc(100%-1rem)] sm:w-80 max-w-sm md:max-w-none z-50 glass-panel rounded-3xl bg-black/80 overflow-hidden shadow-4xl flex flex-col max-h-[400px] border transition-colors duration-500"
            style={{ borderColor: `${themeColor}4d` }}
          >
            <div className="p-4 border-b border-white/10 flex items-center gap-3" style={{ backgroundColor: `${themeColor}1a` }}>
              <Send size={16} className="animate-bounce" style={{ color: themeColor }} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{t('webaudit.tactical_dispatcher')}</span>
            </div>
            <div ref={probeScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 terminal-scroll">
              {dispatchedProbes.map((p: any, i: number) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] sm:text-[11px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black" style={{ color: themeColor }}>{p.method}</span>
                    <span className={`font-mono ${p.status === 200 ? 'text-green-500' : p.status === 403 ? 'text-orange-500' : 'text-white/20'}`}>[{p.status}]</span>
                  </div>
                  <div className="truncate text-white/60 mb-2">{p.endpoint}</div>
                  <div className="text-[9px] sm:text-[10px] text-white/20 italic">{p.description}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />

      {/* Console Overlay */}
      <motion.section 
        animate={{ height: isConsoleExpanded ? '320px' : '45px' }}
        className="relative z-[60] bg-[#020408]/98 backdrop-blur-3xl border-t border-white/10 shadow-4xl flex flex-col overflow-hidden"
      >
        <div onClick={() => setIsConsoleExpanded(!isConsoleExpanded)} className="h-[45px] flex-shrink-0 flex justify-between items-center px-8 border-b border-white/5 cursor-pointer hover:bg-white/5">
          <div className="flex items-center gap-4">
             <Activity size={14} className="animate-pulse" style={{ color: themeColor }} />
             <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('webaudit.live_mission_telemetry')}</span>
          </div>
          {isConsoleExpanded ? <ChevronDown size={16} className="text-white/20" /> : <ChevronUp size={16} className="text-white/20" />}
        </div>

        <div className="flex-1 flex p-5 overflow-hidden">
           <div className="flex-1 flex flex-col glass-panel rounded-2xl bg-black/40 border border-white/5 overflow-hidden">
              <div className="px-4 py-2 border-b border-white/5 text-[9px] font-black text-white/20 uppercase tracking-widest bg-white/[0.01] flex items-center justify-between">
                <span>{t('webaudit.telemetry_log')} & {t('labels.command_buffer')}</span>
                <div className="flex items-center gap-2">
                  <motion.div 
                    animate={{ opacity: [1, 0.4, 1] }} 
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_4px_#ef4444]" 
                  />
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1.5 terminal-scroll">
                {mergedLogs.length > 0 ? (
                  mergedLogs.map((entry, i) => {
                    if (entry.type === 'telemetry') {
                      // Telemetry log entry
                      return (
                        <div key={`telemetry-${i}`} className="flex gap-4 text-[10px] font-mono leading-tight">
                          <span className="text-white/10 shrink-0">[{entry.timestamp.split(':').slice(1).join(':')}]</span>
                          <span className={
                            entry.isAiCompensation ? 'text-purple-400 font-bold' :
                            entry.logType === 'error' ? 'text-red-500' : 
                            entry.logType === 'success' ? 'text-[#00ff9d]' : 
                            entry.logType === 'warn' ? 'text-orange-400' : 
                            entry.logType === 'probe' ? themeColor : 'text-white/50'
                          }>
                            {entry.isAiCompensation && <Cpu className="inline w-3 h-3 mr-1" />}
                            {entry.content}
                          </span>
                        </div>
                      );
                    } else {
                      // Command buffer entry
                      return (
                        <div key={`command-${i}`} className="flex gap-2 text-[10px] font-mono leading-tight opacity-40">
                          <span className="text-white/10 shrink-0">[{entry.timestamp.split(':').slice(1).join(':')}]</span>
                          <span className="text-red-500/60 font-black shrink-0">$</span>
                          <span className="text-white/30 truncate">{entry.content}</span>
                        </div>
                      );
                    }
                  })
                ) : (
                  <div className="flex gap-4 text-[10px] font-mono text-white/20">
                    <span>[--:--:--]</span>
                    <span>Awaiting mission data...</span>
                  </div>
                )}
                
                {/* Current executing command */}
                {activeCommands[currentCommandIndex] && (
                  <div className="flex gap-2 text-[10px] font-mono leading-tight mt-2 pt-2 border-t border-white/5">
                    <span className="text-white/10 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).split(':').slice(1).join(':')}]</span>
                    <div className="flex gap-2 items-center flex-1 bg-red-500/5 p-2 rounded border border-red-500/10">
                      <ChevronRight size={10} className="text-red-500/80 shrink-0" />
                      <span className="text-red-500/80 font-black uppercase tracking-tight break-all">
                        {activeCommands[currentCommandIndex]}
                        <motion.span 
                          animate={{ opacity: [1, 0, 1] }} 
                          transition={{ duration: 0.6, repeat: Infinity }}
                          className="inline-block w-1 h-3 bg-red-500 ml-1 translate-y-0.5"
                        />
                      </span>
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      </motion.section>
    </div>
  );
};
