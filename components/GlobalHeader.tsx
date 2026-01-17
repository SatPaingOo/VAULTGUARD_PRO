import React, { useState, useEffect } from 'react';
import { Activity, CpuIcon, Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSecurity } from '../contexts/SecurityContext';

interface GlobalHeaderProps {
  onOpenAuth: () => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({ onOpenAuth }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const { language, setLanguage, t } = useLanguage();
  const { isEngineLinked } = useSecurity();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full px-4 py-3 md:px-12 md:py-8 flex flex-wrap gap-2 md:gap-4 justify-between items-center z-[500] pointer-events-none">
      <div className="flex items-center gap-2 md:gap-4 pointer-events-auto flex-wrap">
        {/* Logo */}
        <div className="glass-panel px-2 py-1.5 md:px-3 md:py-2 flex items-center justify-center border-l-2 border-[#00d4ff] bg-black/90 shadow-2xl rounded-lg md:rounded-xl">
          <img 
            src="/assets/images/LOGO.png" 
            alt="VaultGuard Pro Logo" 
            className="w-6 h-6 md:w-8 md:h-8 object-contain shrink-0"
          />
        </div>
        
        <div className="glass-panel px-3 py-1.5 md:px-6 md:py-3 flex items-center gap-2 md:gap-4 border-l-2 border-[#00d4ff] bg-black/90 shadow-2xl rounded-lg md:rounded-xl">
           <Activity className="w-3.5 h-3.5 md:w-5 md:h-5 text-[#00d4ff] animate-pulse shrink-0" />
           <div className="flex flex-col min-w-0">
              <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-white/90">VAULT_READY</span>
              <span className="text-[8px] md:text-[9px] font-mono text-white/30 tracking-widest hidden sm:block">{currentTime}</span>
           </div>
        </div>
        
        <div 
          onClick={onOpenAuth}
          className={`glass-panel px-3 py-1.5 md:px-6 md:py-3 rounded-lg md:rounded-xl flex items-center gap-2 md:gap-3 border-l-2 ${isEngineLinked ? 'border-[#00ff9d]' : 'border-red-500 cursor-pointer hover:bg-red-500/10'} bg-black/90 shadow-2xl transition-all duration-500 pointer-events-auto group`}
        >
          <CpuIcon size={14} className={`${isEngineLinked ? 'text-[#00ff9d]' : 'text-red-500 animate-pulse'} shrink-0 md:w-[18px] md:h-[18px]`} />
          <div className="flex flex-col items-start leading-tight">
             <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${isEngineLinked ? 'text-[#00ff9d]' : 'text-red-500 group-hover:text-red-400'}`}>
                {isEngineLinked ? 'ENGINE_ACTIVE' : 'LINK_ENGINE'}
             </span>
             <span className="text-[8px] md:text-[9px] font-mono text-white/20 uppercase">SYS_CORE</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4 pointer-events-auto">
        <div className="glass-panel px-3 py-1.5 md:px-5 md:py-3 rounded-lg md:rounded-xl border border-white/10 bg-black/90 flex items-center gap-2 md:gap-3 shadow-2xl">
          <Languages size={14} className="text-[#00d4ff] shrink-0 md:w-[18px] md:h-[18px]" />
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'mm')}
            className="bg-transparent text-[10px] md:text-[11px] font-black uppercase text-white outline-none cursor-pointer"
          >
            <option value="en" className="bg-black text-white">EN</option>
            <option value="mm" className="bg-black text-white">MM</option>
          </select>
        </div>
      </div>
    </div>
  );
};
