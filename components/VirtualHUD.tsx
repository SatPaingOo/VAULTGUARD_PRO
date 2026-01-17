
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Globe, Map as MapIcon, Layers, AlertCircle, Info } from 'lucide-react';
import { ScanLevel, MissionReport } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

const LEVEL_COLORS: Record<ScanLevel, string> = {
  FAST: '#4ade80',
  STANDARD: '#00d4ff',
  DEEP: '#ef4444'
};

interface ThreatAlertProps {
  finding: { title: string; description: string };
}

const ThreatAlert: React.FC<ThreatAlertProps> = ({ finding }) => {
  const { t } = useLanguage();
  return (
    <motion.div 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -100, opacity: 0 }}
      className="bg-red-500/10 border border-red-500/30 backdrop-blur-xl p-3 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col gap-1.5 sm:gap-2 w-[220px] sm:w-[280px] shadow-2xl"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <AlertCircle className="text-red-500 w-4 h-4 sm:w-5 sm:h-5" />
        <span className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-widest">{t('virtualhud.neural_threat')}</span>
      </div>
    <div className="w-full h-[1px] bg-red-500/20" />
    <h5 className="text-[10px] sm:text-[12px] font-black text-white uppercase truncate">{finding.title}</h5>
      <p className="text-[10px] font-mono text-white/50 leading-tight uppercase truncate">{finding.description}</p>
    </motion.div>
  );
};

const NeuralBlueprint = ({ color }: { color: string }) => {
  const { t } = useLanguage();
  return (
    <div className="w-full h-full bg-[#020408] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] sm:bg-[size:30px_30px]" />
      <div className="relative z-10 flex flex-col items-center gap-4 md:gap-8 px-4">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-24 h-24 sm:w-48 sm:h-48 md:w-96 md:h-96 border rounded-full flex items-center justify-center"
          style={{ borderColor: `${color}33` }}
        >
          <div className="w-16 h-16 sm:w-32 sm:h-32 md:w-64 md:h-64 border rounded-full flex items-center justify-center animate-radar" style={{ borderColor: `${color}1a` }}>
             <div className="w-full h-0.5 sm:h-1 origin-left" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />
          </div>
        </motion.div>
        <div className="text-center">
          <h4 className="text-[10px] sm:text-[12px] font-black uppercase tracking-[0.2em] sm:tracking-[0.6em] mb-1 sm:mb-2" style={{ color }}>{t('virtualhud.neural_blueprint')}</h4>
          <p className="text-[9px] sm:text-[10px] font-mono text-white/30 uppercase tracking-[0.1em] max-w-[140px] mx-auto sm:max-w-none">{t('virtualhud.target_reconstruction')}</p>
        </div>
      </div>
    </div>
  );
};

const TacticalMap = ({ lat, lng, color }: { lat: number; lng: number, color: string }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  useEffect(() => {
    if (mapRef.current && !leafletMap.current && (window as any).L) {
      const L = (window as any).L;
      leafletMap.current = L.map(mapRef.current, {
        center: [lat || 0, lng || 0],
        zoom: 3,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(leafletMap.current);
      
      if (lat !== 0 && lng !== 0) {
        L.circleMarker([lat, lng], {
          radius: 6,
          fillColor: color,
          color: "#fff",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(leafletMap.current);
        
        leafletMap.current.setView([lat, lng], 5);
      }
    }
    
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [lat, lng, color]);

  return <div ref={mapRef} className="w-full h-full rounded-xl sm:rounded-2xl md:rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl bg-black" />;
};

interface VirtualHUDProps {
  phase?: string;
  report?: MissionReport;
  onSelectNode?: (node: unknown) => void;
  targetUrl: string;
  recentFindings?: Array<{ title: string; description: string }>;
  level: ScanLevel;
}

export const VirtualHUD = ({ phase, report, onSelectNode, targetUrl, recentFindings = [], level }: VirtualHUDProps) => {
  const { t } = useLanguage();
  const [view, setView] = useState<'VISUAL' | 'MAP' | 'BLUEPRINT'>('VISUAL');
  const [iframeError, setIframeError] = useState(false);

  const themeColor = useMemo(() => LEVEL_COLORS[level as ScanLevel] || '#00d4ff', [level]);

  const lat = report?.targetIntelligence?.hosting?.latitude || 0;
  const lng = report?.targetIntelligence?.hosting?.longitude || 0;

  const nodes = useMemo(() => {
    if (!report?.findings) return [];
    return report.findings.map((f: any, i: number) => ({
      id: `F_${i}`, 
      label: f.title, 
      x: 10 + (Math.sin(i * 1.5) * 35 + 40), 
      y: 10 + (Math.cos(i * 2.1) * 35 + 40), 
      severity: f.severity 
    }));
  }, [report]);

  return (
    <div className="absolute inset-0 bg-[#020408] flex flex-col overflow-hidden">
      {/* Background Frame Container */}
      <div className="flex-1 relative p-2 sm:p-5 md:p-10 lg:p-14 overflow-hidden h-full">
        <div className="w-full h-full rounded-xl sm:rounded-3xl md:rounded-[4rem] border border-white/5 bg-black/20 overflow-hidden relative shadow-inner">
           {view === 'VISUAL' && !iframeError && (
             <iframe 
               src={targetUrl} 
               className="w-full h-full border-none brightness-[0.5] opacity-50 pointer-events-none transition-all duration-700"
               onError={() => setIframeError(true)}
               title={t('virtualhud.target_reconnaissance')}
             />
           )}
           {(view === 'BLUEPRINT' || iframeError) && view !== 'MAP' && <NeuralBlueprint color={themeColor} />}
           {view === 'MAP' && <TacticalMap lat={lat} lng={lng} color={themeColor} />}
           
           <div className="absolute inset-0 pointer-events-none hud-grid-bg opacity-10 md:opacity-20" />
           <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#020408] via-transparent to-[#020408]/40 opacity-70" />
        </div>

        {/* Evidence Linking: Real-time Alert Popups */}
        <div className="absolute top-20 sm:top-24 left-4 sm:left-10 z-[100] flex flex-col gap-2 sm:gap-4">
           <AnimatePresence>
             {recentFindings.map((finding: any, i: number) => (
               <ThreatAlert key={`alert-${i}`} finding={finding} />
             ))}
           </AnimatePresence>
        </div>

        {/* Responsive Finding Nodes */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <AnimatePresence>
            {nodes.map((node: any) => (
              <motion.div
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, left: `${node.x}%`, top: `${node.y}%` }}
                exit={{ scale: 0, opacity: 0 }}
                className={`absolute p-1 sm:p-2 rounded-lg border pointer-events-auto cursor-pointer shadow-xl backdrop-blur-md transition-all hover:scale-125 hover:z-50 ${
                  node.severity === 'Critical' 
                    ? 'border-red-500 bg-red-500/20 shadow-red-500/10' 
                    : 'border-white/20 bg-black/60 shadow-white/10'
                }`}
                style={{ 
                  transform: 'translate(-50%, -50%)',
                  borderColor: node.severity !== 'Critical' ? `${themeColor}4d` : undefined,
                  backgroundColor: node.severity !== 'Critical' ? `${themeColor}1a` : undefined
                }}
                onClick={() => onSelectNode && onSelectNode(node.id)}
              >
                {node.severity === 'Critical' 
                  ? <ShieldAlert className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-red-500" /> 
                  : <Zap className="w-2.5 h-2.5 sm:w-4 sm:h-4" style={{ color: themeColor }} />
                }
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Adaptive HUD Controls */}
      <div className="absolute top-20 sm:top-28 md:top-36 right-3 sm:right-8 md:right-16 z-40 flex flex-col gap-2 sm:gap-4 pointer-events-auto">
         {[
           { id: 'VISUAL', icon: Globe, label: t('virtualhud.visual') },
           { id: 'MAP', icon: MapIcon, label: t('virtualhud.geo') },
           { id: 'BLUEPRINT', icon: Layers, label: t('virtualhud.logic') }
         ].map(btn => (
           <button 
             key={btn.id}
             onClick={() => setView(btn.id as any)}
             className={`w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl md:rounded-2xl flex flex-col items-center justify-center transition-all group overflow-hidden border ${
               view === btn.id 
               ? 'text-black shadow-[0_0_15px_rgba(0,0,0,0.4)]' 
               : 'bg-black/40 sm:bg-black/80 text-white/40 border-white/10 hover:text-white hover:border-white/20'
             }`}
             style={{ 
               backgroundColor: view === btn.id ? themeColor : undefined,
               borderColor: view === btn.id ? themeColor : undefined
             }}
           >
             <btn.icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-[18px] md:h-[18px]" />
             <span className="text-[5px] font-black uppercase mt-1 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">{btn.label}</span>
           </button>
         ))}
      </div>
    </div>
  );
};
