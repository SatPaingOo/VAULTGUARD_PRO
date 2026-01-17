import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, CpuIcon, Languages, BookOpen } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSecurity } from '../contexts/SecurityContext';

interface GlobalHeaderProps {
  onOpenAuth: () => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({ onOpenAuth }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const { language, setLanguage, t } = useLanguage();
  const { isEngineLinked } = useSecurity();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isAcademyPage = location.pathname === '/academy';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full px-2 sm:px-4 md:px-12 py-2 sm:py-3 md:py-8 flex flex-col sm:flex-row flex-wrap gap-1.5 sm:gap-2 md:gap-4 justify-between items-start sm:items-center z-[500] pointer-events-none bg-[#020408]/95 backdrop-blur-sm">
      {/* Left Section - Main Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 pointer-events-auto flex-wrap w-full sm:w-auto">
        {/* Logo */}
        <div className="glass-panel px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 flex items-center justify-center border-l-2 border-[#00d4ff] bg-black/90 shadow-2xl rounded-lg md:rounded-xl shrink-0">
          <img 
            src="/assets/images/LOGO.png" 
            alt="VaultGuard Pro Logo" 
            className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 object-contain shrink-0"
          />
        </div>
        
        {/* Vault Ready Status */}
        <div className="glass-panel px-2 py-1 sm:px-3 sm:py-1.5 md:px-6 md:py-3 flex items-center gap-1.5 sm:gap-2 md:gap-4 border-l-2 border-[#00d4ff] bg-black/90 shadow-2xl rounded-lg md:rounded-xl shrink-0">
           <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-5 md:h-5 text-[#00d4ff] animate-pulse shrink-0" />
           <div className="flex flex-col min-w-0">
              <span className="text-[8px] sm:text-[9px] md:text-[11px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] md:tracking-[0.2em] text-white/90 whitespace-nowrap">VAULT_READY</span>
              <span className="text-[7px] sm:text-[8px] md:text-[9px] font-mono text-white/30 tracking-widest hidden sm:block">{currentTime}</span>
           </div>
        </div>
        
        {/* Engine Status */}
        <div 
          onClick={onOpenAuth}
          className={`glass-panel px-2 py-1 sm:px-3 sm:py-1.5 md:px-6 md:py-3 rounded-lg md:rounded-xl flex items-center gap-1.5 sm:gap-2 md:gap-3 border-l-2 ${isEngineLinked ? 'border-[#00ff9d]' : 'border-red-500 cursor-pointer hover:bg-red-500/10'} bg-black/90 shadow-2xl transition-all duration-500 pointer-events-auto group shrink-0`}
        >
          <CpuIcon size={12} className={`${isEngineLinked ? 'text-[#00ff9d]' : 'text-red-500 animate-pulse'} shrink-0 sm:w-[14px] sm:h-[14px] md:w-[18px] md:h-[18px]`} />
          <div className="flex flex-col items-start leading-tight min-w-0">
             <span className={`text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate max-w-[80px] sm:max-w-none ${isEngineLinked ? 'text-[#00ff9d]' : 'text-red-500 group-hover:text-red-400'}`}>
                {isEngineLinked ? 'ENGINE_ACTIVE' : 'LINK_ENGINE'}
             </span>
             <span className="text-[7px] sm:text-[8px] md:text-[9px] font-mono text-white/20 uppercase hidden sm:block">SYS_CORE</span>
          </div>
        </div>
        
        {/* Vault Academy Button */}
        {!isAcademyPage && (
          <button
            onClick={() => navigate('/academy')}
            className="glass-panel px-2 py-1 sm:px-3 sm:py-1.5 md:px-6 md:py-3 rounded-lg md:rounded-xl flex items-center gap-1.5 sm:gap-2 md:gap-3 border-l-2 border-[#00d4ff] bg-black/90 shadow-2xl transition-all duration-500 hover:bg-[#00d4ff]/10 cursor-pointer pointer-events-auto shrink-0"
            title="Vault Academy"
          >
            <BookOpen size={12} className="text-[#00d4ff] shrink-0 sm:w-[14px] sm:h-[14px] md:w-[18px] md:h-[18px]" />
            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#00d4ff]">
              <span className="hidden sm:inline">VAULT_ACADEMY</span>
              <span className="sm:hidden">ACADEMY</span>
            </span>
          </button>
        )}
        
        {/* Back to Scanner Button (on Academy page) */}
        {isAcademyPage && (
          <button
            onClick={() => navigate('/')}
            className="glass-panel px-2 py-1 sm:px-3 sm:py-1.5 md:px-6 md:py-3 rounded-lg md:rounded-xl flex items-center gap-1.5 sm:gap-2 md:gap-3 border-l-2 border-[#00d4ff] bg-black/90 shadow-2xl transition-all duration-500 hover:bg-[#00d4ff]/10 cursor-pointer pointer-events-auto shrink-0"
            title="Back to Scanner"
          >
            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#00d4ff]">
              <span className="hidden sm:inline">← BACK_TO_SCANNER</span>
              <span className="sm:hidden">← BACK</span>
            </span>
          </button>
        )}
      </div>
      
      {/* Right Section - Language Selector */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 pointer-events-auto w-full sm:w-auto justify-end sm:justify-start">
        <div className="glass-panel px-2 py-1 sm:px-3 sm:py-1.5 md:px-5 md:py-3 rounded-lg md:rounded-xl border border-white/10 bg-black/90 flex items-center gap-1.5 sm:gap-2 md:gap-3 shadow-2xl shrink-0">
          <Languages size={12} className="text-[#00d4ff] shrink-0 sm:w-[14px] sm:h-[14px] md:w-[18px] md:h-[18px]" />
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'mm')}
            className="bg-transparent text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase text-white outline-none cursor-pointer appearance-none pr-4"
          >
            <option value="en" className="bg-black text-white">EN</option>
            <option value="mm" className="bg-black text-white">MM</option>
          </select>
        </div>
      </div>
    </div>
  );
};
