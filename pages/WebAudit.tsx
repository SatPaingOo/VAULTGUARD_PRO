
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Activity, Server, Terminal, Cpu, Zap, ChevronUp, ChevronDown, 
  Send, Globe, HardDrive, Network
} from 'lucide-react';
import { ScanStatus, TelemetryEntry } from '../hooks/useScanner';
import { MissionReport, ScanLevel } from '../services/geminiService';
import { VirtualHUD } from '../components/VirtualHUD';
import { AttackerCode } from '../components/AttackerCode';
import { useLanguage } from '../contexts/LanguageContext';

const LEVEL_COLORS: Record<ScanLevel, string> = {
  FAST: '#4ade80',
  STANDARD: '#00d4ff',
  DEEP: '#ef4444'
};

export const WebAudit = ({ phase, progress, telemetry, targetUrl, report, level, recentFindings = [], dispatchedProbes = [] }: any) => {
  const { t } = useLanguage();
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const probeScrollRef = useRef<HTMLDivElement>(null);

  const themeColor = useMemo(() => LEVEL_COLORS[level as ScanLevel] || '#00d4ff', [level]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [telemetry]);

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
            className="absolute top-32 right-8 w-80 z-50 glass-panel rounded-3xl bg-black/80 overflow-hidden shadow-4xl flex flex-col max-h-[400px] border transition-colors duration-500"
            style={{ borderColor: `${themeColor}4d` }}
          >
            <div className="p-4 border-b border-white/10 flex items-center gap-3" style={{ backgroundColor: `${themeColor}1a` }}>
              <Send size={16} className="animate-bounce" style={{ color: themeColor }} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{t('webaudit.tactical_dispatcher')}</span>
            </div>
            <div ref={probeScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 terminal-scroll">
              {dispatchedProbes.map((p: any, i: number) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 text-[9px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black" style={{ color: themeColor }}>{p.method}</span>
                    <span className={`font-mono ${p.status === 200 ? 'text-green-500' : p.status === 403 ? 'text-orange-500' : 'text-white/20'}`}>[{p.status}]</span>
                  </div>
                  <div className="truncate text-white/60 mb-2">{p.endpoint}</div>
                  <div className="text-[8px] text-white/20 italic">{p.description}</div>
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

        <div className="flex-1 flex p-5 gap-6 overflow-hidden">
           <div className="flex-1 flex flex-col glass-panel rounded-2xl bg-black/40 border border-white/5 overflow-hidden">
              <div className="px-4 py-2 border-b border-white/5 text-[9px] font-black text-white/20 uppercase tracking-widest bg-white/[0.01]">{t('webaudit.telemetry_log')}</div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 terminal-scroll">
                {telemetry.map((log: any, i: number) => (
                  <div key={i} className="flex gap-4 text-[10px] font-mono leading-tight">
                    <span className="text-white/10">[{log.timestamp.split(':').slice(1).join(':')}]</span>
                    <span className={
                      log.type === 'error' ? 'text-red-500' : 
                      log.type === 'success' ? 'text-[#00ff9d]' : 
                      log.type === 'warn' ? 'text-orange-400' : 
                      log.type === 'probe' ? themeColor : 'text-white/50'
                    }>
                      {log.msg}
                    </span>
                  </div>
                ))}
              </div>
           </div>
           <div className="w-full lg:w-[450px] h-full flex-shrink-0">
              <AttackerCode commands={[]} level={level} targetUrl={targetUrl} minimal={true} />
           </div>
        </div>
      </motion.section>
    </div>
  );
};
