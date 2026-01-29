import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, CpuIcon, Languages, BookOpen, ArrowLeft, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSecurity } from '../contexts/SecurityContext';

interface GlobalHeaderProps {
  onOpenAuth: () => void;
}

const LANG_OPTIONS: { value: 'en' | 'mm'; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'mm', label: 'မြန်မာ' },
];

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({ onOpenAuth }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage, t } = useLanguage();
  const { isEngineLinked } = useSecurity();
  const navigate = useNavigate();
  const location = useLocation();

  const isAcademyPage = location.pathname === '/academy';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full px-2 sm:px-4 md:px-8 lg:px-12 py-2 sm:py-3 md:py-6 lg:py-8 flex flex-row gap-1.5 sm:gap-2 md:gap-4 justify-between items-center z-[500] pointer-events-none bg-[#020408]/95 backdrop-blur-sm border-b border-white/5">
      {/* Left Section - Main Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-4 pointer-events-auto flex-nowrap min-w-0 flex-1 overflow-x-auto overflow-y-visible scrollbar-hide">
        {/* Logo */}
        <div className="glass-panel px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 flex items-center justify-center border-l-2 border-[#00d4ff] bg-black/90 shadow-2xl rounded-lg md:rounded-xl shrink-0">
          <img
            src="/assets/images/LOGO.png"
            alt="VaultGuard Pro Logo"
            className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 object-contain shrink-0"
          />
        </div>

        {/* Vault Ready Status */}
        <div className="glass-panel px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-4 md:py-2 lg:px-6 lg:py-3 flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-4 border-l-2 border-[#00d4ff] bg-black/90 shadow-2xl rounded-lg md:rounded-xl shrink-0 min-w-0">
          <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-[#00d4ff] animate-pulse shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[11px] font-black uppercase tracking-[0.08em] sm:tracking-[0.1em] md:tracking-[0.15em] lg:tracking-[0.2em] text-white/90 whitespace-nowrap">{t('header.vault_ready')}</span>
            <span className="text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] font-mono text-white/30 tracking-widest hidden sm:block">{currentTime}</span>
          </div>
        </div>

        {/* Engine Status */}
        <div
          onClick={onOpenAuth}
          className={`glass-panel px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-4 md:py-2 lg:px-6 lg:py-3 rounded-lg md:rounded-xl flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 border-l-2 ${isEngineLinked ? 'border-[#00ff9d]' : 'border-red-500 cursor-pointer hover:bg-red-500/10'} bg-black/90 shadow-2xl transition-all duration-500 pointer-events-auto group shrink-0 min-w-0`}
        >
          <CpuIcon size={11} className={`${isEngineLinked ? 'text-[#00ff9d]' : 'text-red-500 animate-pulse'} shrink-0 sm:w-[12px] sm:h-[12px] md:w-[14px] md:h-[14px] lg:w-[18px] lg:h-[18px]`} />
          <div className="flex flex-col items-start leading-tight min-w-0">
            <span className={`text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black uppercase tracking-widest truncate max-w-[70px] sm:max-w-[85px] md:max-w-none ${isEngineLinked ? 'text-[#00ff9d]' : 'text-red-500 group-hover:text-red-400'}`}>
              {isEngineLinked ? t('header.engine_active') : t('header.link_engine')}
            </span>
            <span className="text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] font-mono text-white/20 uppercase hidden sm:block">{t('header.sys_core')}</span>
          </div>
        </div>

        {/* Vault Academy Button */}
        {!isAcademyPage && (
          <button
            onClick={() => navigate('/academy')}
            className="glass-panel px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-4 md:py-2 lg:px-6 lg:py-3 rounded-lg md:rounded-xl flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 border-l-2 border-[#00d4ff] bg-black/90 shadow-2xl transition-all duration-500 hover:bg-[#00d4ff]/10 cursor-pointer pointer-events-auto shrink-0 whitespace-nowrap"
            title={t('header.vault_academy_title')}
          >
            <BookOpen size={11} className="text-[#00d4ff] shrink-0 sm:w-[12px] sm:h-[12px] md:w-[14px] md:h-[14px] lg:w-[18px] lg:h-[18px]" />
            <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-[#00d4ff] whitespace-nowrap">
              <span className="inline sm:hidden">{t('header.academy')}</span>
              <span className="hidden sm:inline md:hidden">{t('header.academy')}</span>
              <span className="hidden md:inline">{t('header.vault_academy')}</span>
            </span>
          </button>
        )}

        {/* Back to Scanner Button (on Academy page) */}
        {isAcademyPage && (
          <button
            onClick={() => navigate('/')}
            className="glass-panel px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-4 md:py-2 lg:px-6 lg:py-3 rounded-lg md:rounded-xl flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 border-l-2 border-[#00d4ff] bg-black/90 shadow-2xl transition-all duration-500 hover:bg-[#00d4ff]/10 cursor-pointer pointer-events-auto shrink-0 whitespace-nowrap"
            title={t('header.back_to_scanner_title')}
          >
            <ArrowLeft size={11} className="text-[#00d4ff] shrink-0 sm:w-[12px] sm:h-[12px] md:w-[14px] md:h-[14px] lg:w-[18px] lg:h-[18px]" />
            <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-[#00d4ff] whitespace-nowrap">
              <span className="inline sm:hidden">{t('header.back')}</span>
              <span className="hidden sm:inline md:hidden">{t('header.back_short')}</span>
              <span className="hidden md:inline">{t('header.back_to_scanner')}</span>
            </span>
          </button>
        )}
      </div>

      {/* Right Section - Language Selector */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 pointer-events-auto justify-end shrink-0 flex-shrink-0 ml-1.5 sm:ml-2 md:ml-4" ref={langRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((o) => !o)}
            className="glass-panel px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 lg:px-5 lg:py-3 rounded-xl md:rounded-2xl border border-white/10 bg-black/90 hover:bg-white/5 hover:border-[#00d4ff]/30 focus:outline-none focus:ring-1 focus:ring-[#00d4ff]/50 focus:border-[#00d4ff]/40 transition-all duration-200 flex items-center gap-2 sm:gap-2.5 shadow-2xl shrink-0 whitespace-nowrap cursor-pointer"
            aria-haspopup="listbox"
            aria-expanded={langOpen}
            aria-label="Select language"
          >
            <Languages size={14} className="text-[#00d4ff] shrink-0 sm:w-[15px] sm:h-[15px] md:w-[16px] md:h-[16px] lg:w-[18px] lg:h-[18px]" />
            <span className="text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs font-bold uppercase tracking-wider text-white">
              {language === 'en' ? 'EN' : 'MM'}
            </span>
            <ChevronDown size={12} className={`text-white/50 shrink-0 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
          </button>
          {langOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 min-w-[140px] py-1 rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-[600] opacity-100 transition-opacity duration-150"
              role="listbox"
            >
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={language === opt.value}
                  onClick={() => {
                    setLanguage(opt.value);
                    setLangOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-colors duration-150 first:rounded-t-[10px] last:rounded-b-[10px] ${
                    language === opt.value
                      ? 'bg-[#00d4ff]/15 text-[#00d4ff] border-l-2 border-[#00d4ff]'
                      : 'text-white/80 hover:bg-white/10 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
