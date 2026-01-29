import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Zap, Target, Hexagon, Terminal, 
  Binary, ArrowRight, ShieldAlert, Zap as ZapIcon,
  Timer, Cpu as CpuChip, AlertCircle, AlertTriangle,
  ShieldCheck, KeyRound, Activity as ActivityIcon,
  Search, Brain, Eye, Waypoints, Info as InfoIcon, ExternalLink,
  DollarSign
} from 'lucide-react';
import { ScanLevel, LEVEL_COLORS } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { useSecurity } from '../contexts/SecurityContext';
import { API_KEY_CONSTANTS } from '../constants';
import { GlobalHeader } from '../components/GlobalHeader';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { SandboxVisualizer } from '../components/SandboxVisualizer';
import { ScanningLine } from '../components/ScanningLine';
import { validateUrlFormat, validateAndCheckUrl } from '../utils/urlValidation';

interface LandingPageProps {
  onInitiate: (url: string, level: ScanLevel, lang: string) => void | Promise<void>;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onInitiate }) => {
  const { t, currentLanguageName } = useLanguage();
  const { isEngineLinked, activeKey, apiKeyStatus } = useSecurity();
  const [url, setUrl] = useState('');
  const [level, setLevel] = useState<ScanLevel>('STANDARD');
  const [isFocused, setIsFocused] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; error?: string; isChecking?: boolean }>({ isValid: false });
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputContainerRef = React.useRef<HTMLDivElement>(null);

  const themeColor = LEVEL_COLORS[level];

  // Handle mobile keyboard with Visual Viewport API
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    
    const handleViewportChange = () => {
      if (isFocused && inputContainerRef.current && window.innerWidth < 640) {
        const viewport = window.visualViewport;
        if (viewport) {
          const rect = inputContainerRef.current.getBoundingClientRect();
          const viewportHeight = viewport.height;
          const inputBottom = rect.bottom;
          
          // If input is in the keyboard area, scroll it into view
          if (inputBottom > viewportHeight - 50) {
            inputContainerRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest' 
            });
          }
        }
      }
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, [isFocused]);

  // Basic format validation (synchronous)
  const isUrlFormatValid = useMemo(() => {
    if (!url.trim()) {
      setUrlValidation({ isValid: false });
      return false;
    }
    const formatCheck = validateUrlFormat(url.trim());
    if (!formatCheck.isValid) {
      setUrlValidation({ isValid: false, error: formatCheck.error });
      return false;
    }
    return true;
  }, [url]);

  // Real-time URL validation with debounce (checks if website exists)
  useEffect(() => {
    if (!url.trim() || !isUrlFormatValid) {
      setUrlValidation({ isValid: false });
      return;
    }

    // Debounce validation check (wait 1.5 seconds after user stops typing)
    const timeoutId = setTimeout(async () => {
      setIsValidating(true);
      setUrlValidation({ isValid: false, isChecking: true });
      
      try {
        const validation = await validateAndCheckUrl(url.trim());
        setUrlValidation({
          isValid: validation.isValid && validation.isReachable,
          error: validation.isValid && !validation.isReachable ? validation.error : undefined
        });
      } catch (error: any) {
        setUrlValidation({
          isValid: false,
          error: error.message || 'Failed to validate URL'
        });
      } finally {
        setIsValidating(false);
      }
    }, 1500); // 1.5 second debounce

    return () => clearTimeout(timeoutId);
  }, [url, isUrlFormatValid]);

  const isUrlValid = urlValidation.isValid && !isValidating;

  const levels = [
    { 
      id: 'FAST' as ScanLevel, 
      titleKey: 'scanning_levels.fast', 
      icon: Zap, 
      hex: LEVEL_COLORS.FAST,
      focus: 'Network Perimeter & SSL/TLS',
      tokens: '~8K - 10K',
      time: '~3m',
      cost: '~$0.004',
      useCase: 'Automated Hygiene check'
    },
    { 
      id: 'STANDARD' as ScanLevel, 
      titleKey: 'scanning_levels.standard', 
      icon: Shield, 
      hex: LEVEL_COLORS.STANDARD,
      focus: 'Software DNA & Dependency CVEs',
      tokens: '~25K - 35K',
      time: '~5m',
      cost: '~$0.013',
      useCase: 'DevSecOps Triage'
    },
    { 
      id: 'DEEP' as ScanLevel, 
      titleKey: 'scanning_levels.deep', 
      icon: Target, 
      hex: LEVEL_COLORS.DEEP,
      focus: 'Business Logic & Exploit Chaining',
      tokens: '~150K - 400K',
      time: '~10m',
      cost: '~$0.70',
      useCase: 'Red Team Forensic Triage'
    }
  ];

  const specsData = t('specs');

  const handleInitiate = async () => {
    // Final validation before initiating - block invalid URLs
    if (!url.trim()) {
      setUrlValidation({ isValid: false, error: 'Please enter a website URL' });
      return;
    }

    // Check format first
    const formatCheck = validateUrlFormat(url.trim());
    if (!formatCheck.isValid) {
      setUrlValidation({ isValid: false, error: formatCheck.error });
      return;
    }

    // Final check: Verify URL is reachable (block non-existent websites)
    setIsValidating(true);
    setUrlValidation({ isValid: false, isChecking: true });

    try {
      const validation = await validateAndCheckUrl(url.trim());
      
      if (!validation.isValid) {
        setUrlValidation({ isValid: false, error: validation.error || 'Invalid URL format' });
        setIsValidating(false);
        return; // Block scan
      }

      if (!validation.isReachable) {
        setUrlValidation({ isValid: false, error: validation.error || 'Website is not reachable' });
        setIsValidating(false);
        return; // Block scan - website doesn't exist or is unreachable
      }

      // URL is valid and reachable, proceed with API key check
      if (!isEngineLinked) {
        setIsAuthModalOpen(true);
        setIsValidating(false);
        return;
      }
      if (!activeKey || activeKey.length < API_KEY_CONSTANTS.MIN_KEY_LENGTH) {
        setIsAuthModalOpen(true);
        setIsValidating(false);
        return;
      }

      // All checks passed, initiate scan
      const finalUrl = formatCheck.normalizedUrl || (url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`);
      setIsValidating(false);
      onInitiate(finalUrl, level, currentLanguageName);
    } catch (error: any) {
      setUrlValidation({ isValid: false, error: error.message || 'Failed to validate URL. Please check the URL and try again.' });
      setIsValidating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto pt-28 sm:pt-32 md:pt-36 lg:pt-40 pb-20 sm:pb-0 px-4 sm:px-6 md:px-8 flex flex-col items-center gap-12 sm:gap-16 md:gap-20 lg:gap-32 min-h-screen relative overflow-x-hidden">
      <GlobalHeader onOpenAuth={() => setIsAuthModalOpen(true)} />
      
      <ApiKeyModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      <div className="text-center z-10 flex flex-col items-center gap-4 md:gap-8 w-full mt-8 md:mt-12">
        <div className="relative flex flex-col items-center gap-6 md:gap-8">
          <img 
            src="/assets/images/LOGO.png" 
            alt="VaultGuard Pro" 
            className="w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 object-contain drop-shadow-2xl"
          />
          <div className="relative">
            <Hexagon className="w-20 h-20 md:w-40 md:h-40 opacity-10 absolute -z-10 animate-radar left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 transition-colors duration-500" style={{ color: themeColor }} />
            <h1 className="text-[clamp(1.75rem,8vw,7rem)] font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/10 leading-none px-4">
              {t('app_title')}
            </h1>
          </div>
        </div>
        <p className="text-[10px] sm:text-[11px] md:text-[12px] lg:text-sm font-mono tracking-[0.3em] sm:tracking-[0.4em] md:tracking-[0.6em] uppercase max-w-4xl text-center px-4 sm:px-6 break-words transition-colors duration-500" style={{ color: `${themeColor}99` }}>
          {t('app_subtitle')}
        </p>
        <p className="text-[9px] sm:text-[10px] md:text-[11px] font-mono tracking-widest uppercase max-w-3xl text-center px-4 text-white/40 mt-2">
          {t('app_gemini_tagline')}
        </p>
        <span className="inline-block mt-3 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-white/50">
          {t('app_hackathon_badge')}
        </span>
      </div>

      <div className="w-full max-w-5xl z-20 px-2 sm:px-4 md:px-6 flex flex-col gap-6 sm:gap-8 md:gap-10 lg:gap-14">
        {/* API Key Error Message - Above Input Box */}
        {(!isEngineLinked || (isEngineLinked && apiKeyStatus === 'invalid')) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full flex flex-col items-center gap-2 mb-2"
          >
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 w-full max-w-2xl">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] md:text-[11px] font-black text-red-500 uppercase tracking-wider">
                  {!isEngineLinked ? t('apikey.api_key_missing') : t('apikey.not_working')}
                </p>
                <p className="text-[10px] md:text-[11px] text-white/60 font-mono mt-1">
                  {!isEngineLinked 
                    ? t('apikey.engine_not_configured')
                    : t('apikey.invalid_message')
                  }
                </p>
              </div>
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-red-500 text-black font-black text-[10px] md:text-[11px] uppercase tracking-wider hover:bg-red-400 transition-colors shadow-[0_2px_8px_rgba(239,68,68,0.3)] flex items-center gap-1.5 shrink-0"
              >
                <KeyRound size={12} />
                {!isEngineLinked ? 'LINK_KEY' : t('apikey.fix_button')}
              </button>
            </div>
          </motion.div>
        )}
        
        <div ref={inputContainerRef} className="relative glass-panel p-1.5 md:p-2 rounded-2xl md:rounded-3xl border bg-black/95 shadow-[0_24px_48px_rgba(0,0,0,0.6)] transition-all duration-500" style={{ borderColor: isFocused ? `${themeColor}4d` : (url.trim() ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.2)') }}>
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
            <div className="flex-1 flex items-center px-3 sm:px-5 md:px-6 py-2.5 sm:py-3 md:py-3.5 bg-white/[0.02] rounded-xl md:rounded-2xl min-h-[44px] sm:min-h-[48px]">
              <Terminal className={`w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 mr-2 sm:mr-3 md:mr-4 transition-colors shrink-0`} style={{ color: isFocused ? themeColor : (url.trim() ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.25)') }} />
              <input 
                ref={inputRef}
                type="text"
                value={url}
                onFocus={(e) => {
                  setIsFocused(true);
                  // Mobile keyboard handling - scroll after keyboard appears
                  if (window.innerWidth < 640) {
                    setTimeout(() => {
                      if (inputContainerRef.current) {
                        inputContainerRef.current.scrollIntoView({ 
                          behavior: 'smooth', 
                          block: 'center',
                          inline: 'nearest' 
                        });
                      }
                    }, 500); // Wait for keyboard animation
                  }
                }}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleInitiate(); }}
                className="w-full bg-transparent outline-none font-mono text-sm sm:text-base md:text-lg text-white placeholder:text-white/30"
                placeholder={t('target_url_placeholder')}
              />
            </div>
            
            <button 
              type="button"
              disabled={!isUrlValid}
              onClick={handleInitiate}
              className={`relative overflow-hidden px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-3.5 rounded-xl md:rounded-2xl font-black uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-all duration-300 flex items-center justify-center gap-2 text-[10px] sm:text-xs md:text-sm border-2 min-h-[44px] sm:min-h-[48px] self-center sm:self-stretch shrink-0
                ${!isUrlValid 
                  ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed' 
                  : isEngineLinked 
                    ? 'border-transparent text-black hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] cursor-pointer' 
                    : 'border-red-500/80 bg-red-500 text-black hover:bg-red-400 hover:border-red-400 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                }`}
              style={{ 
                backgroundColor: !isUrlValid ? undefined : (isEngineLinked ? themeColor : undefined),
                boxShadow: isUrlValid && isEngineLinked ? `0 0 24px ${themeColor}40, 0 4px 14px rgba(0,0,0,0.3)` : (!isUrlValid ? undefined : '0 4px 14px rgba(0,0,0,0.25)'),
                opacity: isUrlValid ? 1 : 0.6
              }}
            >
              {!isEngineLinked && isUrlValid ? <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 shrink-0" /> : <ZapIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 shrink-0" />}
              <span className="hidden sm:inline">{!isEngineLinked && isUrlValid ? t('apikey.init_core') : t('initiate_scan')}</span>
              <span className="sm:hidden">{!isEngineLinked && isUrlValid ? t('apikey.init_short') : t('apikey.scan_short')}</span>
            </button>
          </div>
        </div>
        
        {/* Mission Intensity Selection */}
        <div className="w-full flex flex-col gap-6 md:gap-10 mt-6 md:mt-8">
           <div className="flex items-center gap-3 md:gap-6 px-2 md:px-4 mb-4 md:mb-6">
              <div className="h-[2px] w-8 md:w-16 lg:w-24 transition-colors duration-500" style={{ backgroundColor: themeColor }} />
              <h3 className="text-xs md:text-sm lg:text-base font-black text-white uppercase tracking-[0.4em] md:tracking-[0.6em] lg:tracking-[0.8em] whitespace-nowrap">
                {t('labels.choose_intensity')}
              </h3>
              <div className="h-[2px] flex-1 transition-colors duration-500" style={{ backgroundColor: `${themeColor}4d` }} />
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 lg:gap-8 px-2 md:px-0">
            {levels.map(l => {
              const isSelected = level === l.id;
              return (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={`group relative glass-panel p-5 sm:p-6 md:p-7 lg:p-8 xl:p-10 rounded-2xl md:rounded-3xl lg:rounded-[2.5rem] border-2 transition-all duration-500 text-left overflow-hidden flex flex-col h-full ${
                  isSelected 
                    ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] scale-[1.02] shadow-2xl' 
                    : 'bg-black/40 border-white/5 opacity-70 hover:opacity-100 hover:scale-[1.01] hover:border-white/10'
                }`}
                style={{ 
                  borderColor: isSelected ? `${l.hex}80` : 'rgba(255,255,255,0.05)',
                  boxShadow: isSelected ? `0 0 60px ${l.hex}33, 0 8px 32px rgba(0,0,0,0.4)` : '0 4px 16px rgba(0,0,0,0.2)'
                }}
              >
                {isSelected && (
                  <>
                    <div className="absolute inset-0 rounded-2xl md:rounded-3xl lg:rounded-[2.5rem] opacity-50" style={{ 
                      background: `linear-gradient(135deg, ${l.hex}20, transparent, ${l.hex}20)`,
                      animation: 'pulse 3s ease-in-out infinite'
                    }} />
                    <ScanningLine color={l.hex} />
                  </>
                )}
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4 sm:mb-5 md:mb-6 gap-3">
                    <div 
                      className="p-3 sm:p-3.5 md:p-4 lg:p-5 rounded-xl md:rounded-2xl border transition-all duration-500 shadow-lg shrink-0"
                      style={{ 
                        color: isSelected ? l.hex : 'rgba(255,255,255,0.4)',
                        backgroundColor: isSelected ? `${l.hex}20` : 'rgba(255,255,255,0.03)',
                        borderColor: isSelected ? `${l.hex}40` : 'rgba(255,255,255,0.1)',
                        boxShadow: isSelected ? `0 0 20px ${l.hex}40` : 'none'
                      }}
                    >
                      <l.icon size={20} className="sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" />
                    </div>
                    <div 
                      className="text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs font-black uppercase tracking-[0.15em] md:tracking-[0.2em] px-3 sm:px-3.5 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-full border transition-all shrink-0"
                      style={{
                        color: isSelected ? l.hex : 'rgba(255,255,255,0.3)',
                        backgroundColor: isSelected ? `${l.hex}15` : 'rgba(255,255,255,0.05)',
                        borderColor: isSelected ? `${l.hex}30` : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      {l.time}
                    </div>
                  </div>
                  
                  <h4 
                    className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-black uppercase tracking-tight mb-2 sm:mb-2.5 md:mb-3 leading-tight transition-colors duration-500 break-words"
                    style={{ color: isSelected ? l.hex : 'white' }}
                  >
                    {t(l.titleKey)}
                  </h4>
                  
                  <p className="text-[10px] sm:text-[11px] md:text-[12px] lg:text-[13px] text-white/50 leading-relaxed font-mono uppercase mb-4 sm:mb-5 md:mb-6 line-clamp-3 break-words">
                    {t(`level_descriptions.${l.id.toLowerCase()}`)}
                  </p>

                  <div className="mt-auto space-y-3 sm:space-y-3.5 mb-4 sm:mb-5 md:mb-6 pt-4 sm:pt-5 md:pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] md:text-[12px] lg:text-xs font-black uppercase tracking-wider">
                      <span className="text-white/30 shrink-0 flex items-center gap-2">
                        <Timer size={12} className="sm:w-3 sm:h-3 md:w-4 md:h-4" />
                        EST_TIME:
                      </span>
                      <span 
                        className="text-right font-mono text-[10px] sm:text-[11px] md:text-[12px] font-black"
                        style={{ color: isSelected ? l.hex : 'rgba(255,255,255,0.7)' }}
                      >
                        {l.time}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] md:text-[12px] lg:text-xs font-black uppercase tracking-wider">
                      <span className="text-white/30 shrink-0 flex items-center gap-2">
                        <CpuChip size={12} className="sm:w-3 sm:h-3 md:w-4 md:h-4" />
                        TOKENS:
                      </span>
                      <span 
                        className="text-right font-mono text-[9px] sm:text-[10px] md:text-[11px]"
                        style={{ color: isSelected ? l.hex : 'rgba(255,255,255,0.6)' }}
                      >
                        {l.tokens}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] md:text-[12px] lg:text-xs font-black uppercase tracking-wider">
                      <span className="text-white/30 shrink-0 flex items-center gap-2">
                        <DollarSign size={12} className="sm:w-3 sm:h-3 md:w-4 md:h-4" />
                        COST:
                      </span>
                      <span 
                        className="text-right font-mono text-[9px] sm:text-[10px] md:text-[11px]"
                        style={{ color: isSelected ? l.hex : 'rgba(255,255,255,0.6)' }}
                      >
                        {l.cost}
                      </span>
                    </div>
                    
                    <div className="flex items-start justify-between gap-2 text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs font-black uppercase tracking-wider">
                      <span className="text-white/30 shrink-0 flex items-center gap-2">
                        <Target size={12} className="sm:w-3 sm:h-3 md:w-4 md:h-4 shrink-0 mt-0.5" />
                        FOCUS:
                      </span>
                      <span 
                        className="text-right font-mono text-[10px] sm:text-[11px] md:text-[12px] max-w-[65%] sm:max-w-[60%] text-end leading-tight break-words"
                        style={{ color: isSelected ? l.hex : 'rgba(255,255,255,0.6)' }}
                      >
                        {l.focus}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 sm:pt-3.5 md:pt-4 border-t border-white/5 flex justify-between items-center gap-2">
                    <span 
                      className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] md:text-[12px] lg:text-xs font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] transition-colors"
                      style={{ color: isSelected ? l.hex : 'rgba(255,255,255,0.2)' }}
                    >
                      <Binary size={10} className="sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 shrink-0" />
                      <span className="hidden sm:inline">{t(`labels.protocol_${l.id.toLowerCase()}`)}</span>
                      <span className="sm:hidden">{l.id}</span>
                    </span>
                    <ArrowRight 
                      size={12} 
                      className={`transition-all shrink-0 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 ${
                        isSelected ? 'translate-x-1' : 'group-hover:translate-x-2'
                      }`}
                      style={{ color: isSelected ? l.hex : 'rgba(255,255,255,0.3)' }}
                    />
                  </div>
                </div>
              </button>
            )})}
           </div>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-center gap-6 py-6 px-6 md:px-10">
           {isEngineLinked && apiKeyStatus === 'testing' && (
             <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] md:text-[12px] font-black text-[#00d4ff] uppercase tracking-widest animate-pulse flex items-center gap-2 bg-[#00d4ff]/5 px-6 py-2.5 rounded-full border border-[#00d4ff]/20">
                   <ActivityIcon size={14} className="animate-spin"/> {t('apikey.testing_api_key')}
                </p>
                <p className="text-[10px] md:text-[11px] text-white/30 uppercase text-center max-w-xs leading-relaxed">{t('apikey.validating_connectivity')}</p>
             </div>
           )}
           {isEngineLinked && (!activeKey || activeKey.length < API_KEY_CONSTANTS.MIN_KEY_LENGTH) && apiKeyStatus !== 'invalid' && apiKeyStatus !== 'testing' && (
             <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] md:text-[12px] font-black text-yellow-500 uppercase tracking-widest animate-pulse flex items-center gap-2 bg-yellow-500/5 px-6 py-2.5 rounded-full border border-yellow-500/20">
                   <AlertTriangle size={14}/> API_KEY_INVALID
                </p>
                <p className="text-[10px] md:text-[11px] text-white/30 uppercase text-center max-w-xs leading-relaxed">{t('apikey.invalid_too_short')}</p>
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="mt-2 px-6 py-2.5 rounded-full bg-yellow-500 text-black font-black text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-colors shadow-[0_5px_15px_rgba(234,179,8,0.2)] flex items-center gap-2"
                >
                  <KeyRound size={14} />
                  RECONFIGURE_KEY
                </button>
             </div>
           )}
           {isEngineLinked && activeKey && activeKey.length >= API_KEY_CONSTANTS.MIN_KEY_LENGTH && apiKeyStatus === 'valid' && (
             <div className="px-6 py-3.5 rounded-2xl bg-[#00ff9d]/5 border border-[#00ff9d]/10 flex items-center gap-3 md:gap-5">
                <ShieldCheck size={18} className="text-[#00ff9d]" />
                <span className="text-[10px] md:text-[12px] font-black text-[#00ff9d] uppercase tracking-[0.3em] md:tracking-[0.4em]">SYSTEM_CORE_ENGAGED</span>
             </div>
           )}
           {isEngineLinked && activeKey && activeKey.length >= API_KEY_CONSTANTS.MIN_KEY_LENGTH && apiKeyStatus !== 'valid' && apiKeyStatus !== 'invalid' && apiKeyStatus !== 'testing' && (
             <div className="px-6 py-3.5 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 flex items-center gap-3 md:gap-5">
                <AlertTriangle size={18} className="text-yellow-500" />
                <span className="text-[10px] md:text-[12px] font-black text-yellow-500 uppercase tracking-[0.3em] md:tracking-[0.4em]">KEY_STATUS_UNKNOWN</span>
             </div>
           )}
           {/* URL Validation Status - Only show if there's an error and URL is entered */}
           {url.trim() && urlValidation.error && !isValidating && (
             <div className="flex flex-col items-center gap-2">
               <p className="text-[10px] md:text-[12px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 bg-red-500/5 px-6 py-2.5 rounded-full border border-red-500/20">
                 <AlertCircle size={14}/> {urlValidation.error.includes('DNS') || urlValidation.error.includes('not exist') ? 'WEBSITE_NOT_FOUND' : urlValidation.error.includes('timeout') ? 'CONNECTION_TIMEOUT' : 'INVALID_URL'}
               </p>
               <p className="text-[10px] md:text-[11px] text-white/40 uppercase text-center max-w-md leading-relaxed px-4">
                 {urlValidation.error}
               </p>
             </div>
           )}
        </div>
      </div>

      <div className="w-full max-w-6xl px-4 flex flex-col gap-10 md:gap-16 mt-8 md:mt-12">
         {/* Level Comparison Table: FAST vs STANDARD vs DEEP */}
         <div className="flex items-center gap-2 sm:gap-3 md:gap-6 px-2 md:px-4 mb-4 md:mb-6">
            <div className="h-[2px] w-6 sm:w-8 md:w-16 lg:w-24 transition-colors duration-500 shrink-0" style={{ backgroundColor: themeColor }} />
            <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] lg:tracking-[0.6em] whitespace-nowrap shrink-0">
              {t('labels.level_comparison')}
            </h3>
            <div className="h-[2px] flex-1 transition-colors duration-500 min-w-0" style={{ backgroundColor: `${themeColor}4d` }} />
         </div>
         <div className="glass-panel rounded-[3rem] md:rounded-[4.5rem] border border-white/10 bg-black/40 overflow-hidden shadow-3xl mb-6 md:mb-8">
            <div className="block md:hidden">
              {(() => {
                const fastComp = t(`level_comparison.fast`) as any;
                const standardComp = t(`level_comparison.standard`) as any;
                const deepComp = t(`level_comparison.deep`) as any;
                return [
                  { key: 'grounding', label: specsData?.grounding?.[0], fast: fastComp?.grounding?.[1], standard: standardComp?.grounding?.[1], deep: deepComp?.grounding?.[1], icon: Search },
                  { key: 'context', label: specsData?.context?.[0], fast: fastComp?.context?.[1], standard: standardComp?.context?.[1], deep: deepComp?.context?.[1], icon: Eye },
                  { key: 'reasoning', label: specsData?.reasoning?.[0], fast: fastComp?.reasoning?.[1], standard: standardComp?.reasoning?.[1], deep: deepComp?.reasoning?.[1], icon: Brain },
                  { key: 'thinking', label: specsData?.thinking?.[0] || 'THINKING_CAPACITY', fast: fastComp?.thinking?.[1], standard: standardComp?.thinking?.[1], deep: deepComp?.thinking?.[1], icon: CpuChip },
                  { key: 'chaining', label: specsData?.chaining?.[0] || 'VULN_CHAINING', fast: fastComp?.chaining?.[1], standard: standardComp?.chaining?.[1], deep: deepComp?.chaining?.[1], icon: Waypoints },
                  { key: 'latency', label: specsData?.latency?.[0], fast: fastComp?.latency?.[1], standard: standardComp?.latency?.[1], deep: deepComp?.latency?.[1], icon: Zap },
                  { key: 'cost', label: t('labels.est_cost'), fast: t('labels.cost_fast'), standard: t('labels.cost_standard'), deep: t('labels.cost_deep'), icon: DollarSign }
                ];
              })().map((item, i) => (
                <div key={i} className="p-6 border-b border-white/5 last:border-b-0">
                  <div className="flex items-center gap-3 mb-4">
                    <item.icon size={16} className="text-white/60 shrink-0" />
                    <div className="text-[10px] font-black text-white/70 uppercase tracking-widest">{item.label}</div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] font-black uppercase mb-1" style={{ color: LEVEL_COLORS.FAST }}>FAST</div>
                      <div className="text-[11px] font-mono uppercase" style={{ color: LEVEL_COLORS.FAST }}>{item.fast}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase mb-1" style={{ color: LEVEL_COLORS.STANDARD }}>STANDARD</div>
                      <div className="text-[11px] font-mono uppercase" style={{ color: LEVEL_COLORS.STANDARD }}>{item.standard}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase mb-1" style={{ color: LEVEL_COLORS.DEEP }}>DEEP</div>
                      <div className="text-[11px] font-mono uppercase" style={{ color: LEVEL_COLORS.DEEP }}>{item.deep}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="hidden md:block overflow-x-auto -mx-4 px-4">
               <div className="min-w-full inline-block">
                 <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                       <tr className="bg-white/5 border-b border-white/10">
                          <th className="p-4 md:p-6 lg:p-8 text-[9px] md:text-[10px] lg:text-[11px] font-black text-white/70 uppercase tracking-wider whitespace-nowrap">{specsData?.detection?.[0] || t('labels.parameter')}</th>
                          <th className="p-4 md:p-6 lg:p-8 text-[9px] md:text-[10px] lg:text-[11px] font-black uppercase tracking-wider whitespace-nowrap" style={{ color: LEVEL_COLORS.FAST, backgroundColor: `${LEVEL_COLORS.FAST}10` }}>{t('scanning_levels.fast')}</th>
                          <th className="p-4 md:p-6 lg:p-8 text-[9px] md:text-[10px] lg:text-[11px] font-black uppercase tracking-wider whitespace-nowrap" style={{ color: LEVEL_COLORS.STANDARD, backgroundColor: `${LEVEL_COLORS.STANDARD}10` }}>{t('scanning_levels.standard')}</th>
                          <th className="p-4 md:p-6 lg:p-8 text-[9px] md:text-[10px] lg:text-[11px] font-black uppercase tracking-wider whitespace-nowrap" style={{ color: LEVEL_COLORS.DEEP, backgroundColor: `${LEVEL_COLORS.DEEP}10` }}>{t('scanning_levels.deep')}</th>
                       </tr>
                    </thead>
                    <tbody className="text-[9px] md:text-[10px] lg:text-[11px] xl:text-[12px] font-mono uppercase text-white/85">
                       {(() => {
                         const fastComp = t(`level_comparison.fast`) as any;
                         const standardComp = t(`level_comparison.standard`) as any;
                         const deepComp = t(`level_comparison.deep`) as any;
                         return [
                           { key: 'grounding', label: specsData?.grounding?.[0], fast: fastComp?.grounding?.[1], standard: standardComp?.grounding?.[1], deep: deepComp?.grounding?.[1], icon: Search },
                           { key: 'context', label: specsData?.context?.[0], fast: fastComp?.context?.[1], standard: standardComp?.context?.[1], deep: deepComp?.context?.[1], icon: Eye },
                           { key: 'reasoning', label: specsData?.reasoning?.[0], fast: fastComp?.reasoning?.[1], standard: standardComp?.reasoning?.[1], deep: deepComp?.reasoning?.[1], icon: Brain },
                           { key: 'thinking', label: specsData?.thinking?.[0] || 'THINKING_CAPACITY', fast: fastComp?.thinking?.[1], standard: standardComp?.thinking?.[1], deep: deepComp?.thinking?.[1], icon: CpuChip },
                           { key: 'chaining', label: specsData?.chaining?.[0] || 'VULN_CHAINING', fast: fastComp?.chaining?.[1], standard: standardComp?.chaining?.[1], deep: deepComp?.chaining?.[1], icon: Waypoints },
                           { key: 'latency', label: specsData?.latency?.[0], fast: fastComp?.latency?.[1], standard: standardComp?.latency?.[1], deep: deepComp?.latency?.[1], icon: Zap },
                           { key: 'cost', label: t('labels.est_cost'), fast: t('labels.cost_fast'), standard: t('labels.cost_standard'), deep: t('labels.cost_deep'), icon: DollarSign }
                         ];
                       })().map((item, i) => (
                         <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 md:p-6 lg:p-8 font-black text-white/70 flex items-center gap-2 md:gap-3 lg:gap-4 whitespace-nowrap">
                              <item.icon size={12} className="md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </td>
                            <td className="p-4 md:p-6 lg:p-8 font-black break-words max-w-[200px] lg:max-w-[250px]" style={{ color: LEVEL_COLORS.FAST, backgroundColor: `${LEVEL_COLORS.FAST}08` }}>{item.fast}</td>
                            <td className="p-4 md:p-6 lg:p-8 font-black break-words max-w-[200px] lg:max-w-[250px]" style={{ color: LEVEL_COLORS.STANDARD, backgroundColor: `${LEVEL_COLORS.STANDARD}08` }}>{item.standard}</td>
                            <td className="p-4 md:p-6 lg:p-8 font-black break-words max-w-[200px] lg:max-w-[250px]" style={{ color: LEVEL_COLORS.DEEP, backgroundColor: `${LEVEL_COLORS.DEEP}08` }}>{item.deep}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
         </div>

         {/* NEURAL_LOGIC vs LEGACY_SIGS */}
         <div className="flex items-center gap-2 sm:gap-3 md:gap-6 px-2 md:px-4 mb-4 md:mb-6 mt-8 md:mt-12">
            <div className="h-[2px] w-6 sm:w-8 md:w-16 lg:w-24 transition-colors duration-500 shrink-0" style={{ backgroundColor: themeColor }} />
            <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] lg:tracking-[0.6em] whitespace-nowrap shrink-0">
              {t('labels.neural_vs_legacy')}
            </h3>
            <div className="h-[2px] flex-1 transition-colors duration-500 min-w-0" style={{ backgroundColor: `${themeColor}4d` }} />
         </div>
         <div className="glass-panel rounded-[3rem] md:rounded-[4.5rem] border border-white/10 bg-black/40 overflow-hidden shadow-3xl">
            <div className="block md:hidden">
              {['grounding', 'context', 'reasoning', 'thinking', 'chaining', 'latency'].map((key, i) => {
                const row = t(`neural_legacy.${key}`) as any;
                const labelKey = key as keyof typeof specsData;
                const label = specsData?.[labelKey]?.[0];
                const item = { key, label, val1: row?.val1, val2: row?.val2, benefit: row?.benefit, icon: [Search, Eye, Brain, CpuChip, Waypoints, Zap][i] as React.ComponentType<any> };
                return (
                <div key={i} className="p-6 border-b border-white/5 last:border-b-0">
                  <div className="flex items-center gap-3 mb-3">
                    <item.icon size={16} className="text-white/60 shrink-0" />
                    <div className="text-[10px] font-black text-white/70 uppercase tracking-widest">{item.label}</div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="text-[10px] text-white/70 font-mono uppercase">{item.val1}</div>
                    <div className="text-[10px] font-black uppercase transition-colors duration-500" style={{ color: themeColor }}>{item.val2}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 rounded-full border border-white/15 bg-white/10 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/70">{item.benefit}</span>
                  </div>
                </div>
              );})}
            </div>
            
            <div className="hidden md:block overflow-x-auto -mx-4 px-4">
               <div className="min-w-full inline-block">
                 <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                       <tr className="bg-white/5 border-b border-white/10">
                          <th className="p-4 md:p-6 lg:p-8 text-[9px] md:text-[10px] lg:text-[11px] font-black text-white/70 uppercase tracking-wider whitespace-nowrap">{specsData?.detection?.[0] || t('labels.parameter')}</th>
                          <th className="p-4 md:p-6 lg:p-8 text-[9px] md:text-[10px] lg:text-[11px] font-black text-white/60 uppercase tracking-wider whitespace-nowrap">{t('labels.legacy_scanners')}</th>
                          <th className="p-4 md:p-6 lg:p-8 text-[9px] md:text-[10px] lg:text-[11px] font-black uppercase tracking-wider transition-colors duration-500 whitespace-nowrap" style={{ color: themeColor }}>{t('labels.vaultguard_neural')}</th>
                          <th className="p-4 md:p-6 lg:p-8 text-[9px] md:text-[10px] lg:text-[11px] font-black text-white/60 uppercase tracking-wider text-right whitespace-nowrap">{t('neural_legacy.benefit')}</th>
                       </tr>
                    </thead>
                    <tbody className="text-[9px] md:text-[10px] lg:text-[11px] xl:text-[12px] font-mono uppercase text-white/85">
                       {['grounding', 'context', 'reasoning', 'thinking', 'chaining', 'latency'].map((key, i) => {
                         const row = t(`neural_legacy.${key}`) as any;
                         const labelKey = key as keyof typeof specsData;
                         const label = specsData?.[labelKey]?.[0];
                         const Icon = [Search, Eye, Brain, CpuChip, Waypoints, Zap][i];
                         return (
                         <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 md:p-6 lg:p-8 font-black text-white/70 flex items-center gap-2 md:gap-3 lg:gap-4 whitespace-nowrap">
                              <Icon size={12} className="md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 shrink-0" />
                              <span className="truncate">{label}</span>
                            </td>
                            <td className="p-4 md:p-6 lg:p-8 text-white/70 break-words max-w-[200px] lg:max-w-[250px]">{row?.val1}</td>
                            <td className="p-4 md:p-6 lg:p-8 font-black transition-colors duration-500 break-words max-w-[200px] lg:max-w-[250px]" style={{ color: themeColor, backgroundColor: `${themeColor}08` }}>{row?.val2}</td>
                            <td className="p-4 md:p-6 lg:p-8 text-right">
                               <span className="inline-block px-2 md:px-3 py-1 rounded-full border border-white/15 bg-white/10 text-[7px] md:text-[8px] lg:text-[9px] font-black uppercase tracking-wider text-white/70 whitespace-nowrap">{row?.benefit}</span>
                            </td>
                         </tr>
                       );})}
                    </tbody>
                 </table>
               </div>
            </div>
         </div>
      </div>

      <SandboxVisualizer />

      {/* Capabilities & Limitations Section */}
      <div className="w-full max-w-6xl px-4 flex flex-col gap-10 md:gap-16 mt-8 md:mt-12">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-6 px-2 md:px-4 mb-4 md:mb-6">
          <div className="h-[2px] w-6 sm:w-8 md:w-16 lg:w-24 transition-colors duration-500 shrink-0" style={{ backgroundColor: themeColor }} />
          <h3 className="text-[10px] sm:text-xs md:text-sm lg:text-base font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.4em] lg:tracking-[0.6em] whitespace-nowrap shrink-0">
            {t('labels.capabilities_limitations')}
          </h3>
          <div className="h-[2px] flex-1 transition-colors duration-500 min-w-0" style={{ backgroundColor: `${themeColor}4d` }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* What CAN Be Tested */}
          <div className="glass-panel p-6 md:p-8 rounded-2xl md:rounded-3xl border border-green-500/20 bg-green-500/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-50" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck size={20} className="text-green-500 shrink-0" />
                <h4 className="text-sm md:text-base font-black text-green-500 uppercase tracking-wider">
                  {t('labels.can_test')}
                </h4>
              </div>
              <ul className="space-y-2.5 md:space-y-3 text-xs md:text-sm text-white/70 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1 font-black">✓</span>
                  <span><strong className="text-green-400">{t('capabilities.security_headers')}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1 font-black">✓</span>
                  <span><strong className="text-green-400">{t('capabilities.ssl_tls')}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1 font-black">✓</span>
                  <span><strong className="text-green-400">{t('capabilities.client_vulns')}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1 font-black">✓</span>
                  <span><strong className="text-green-400">{t('capabilities.tech_stack')}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1 font-black">✓</span>
                  <span><strong className="text-green-400">{t('capabilities.dns_info')}</strong></span>
                </li>
              </ul>
              <div className="pt-4 border-t border-green-500/20">
                <p className="text-[10px] md:text-xs text-white/50 italic leading-relaxed">
                  <strong className="text-green-400">{t('labels.why')}</strong> {t('labels.why_can_test')}
                </p>
              </div>
            </div>
          </div>

          {/* What CANNOT Be Tested */}
          <div className="glass-panel p-6 md:p-8 rounded-2xl md:rounded-3xl border border-red-500/20 bg-red-500/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-50" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={20} className="text-red-500 shrink-0" />
                <h4 className="text-sm md:text-base font-black text-red-500 uppercase tracking-wider">
                  {t('labels.cannot_test')}
                </h4>
              </div>
              <ul className="space-y-2.5 md:space-y-3 text-xs md:text-sm text-white/70 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1 font-black">✗</span>
                  <span><strong className="text-red-400">{t('limitations.sql_injection')}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1 font-black">✗</span>
                  <span><strong className="text-red-400">{t('limitations.server_side')}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1 font-black">✗</span>
                  <span><strong className="text-red-400">{t('limitations.port_scanning')}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1 font-black">✗</span>
                  <span><strong className="text-red-400">{t('limitations.file_system')}</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1 font-black">✗</span>
                  <span>
                    <strong className="text-red-400">{t('limitations.cors_blocked')}</strong>
                    <span className="text-white/50 text-[10px] ml-2">
                      {t('limitations.cors_workaround')}
                    </span>
                  </span>
                </li>
              </ul>
              
              {/* Proactive CORS Extension Suggestion */}
              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-black text-blue-400 uppercase mb-2 flex items-center gap-2">
                      <Zap className="w-3 h-3" />
                      {t('cors_extension.pro_tip_title')}
                    </p>
                    <p className="text-[10px] md:text-xs text-white/80 leading-relaxed mb-3">
                      {t('cors_extension.pro_tip_desc')}
                    </p>
                    
                    <div className="bg-black/30 p-2 rounded mb-2">
                      <p className="text-[10px] text-white/90 font-mono mb-1">
                        <strong className="text-blue-400">{t('cors_extension.recommended')}</strong> "{t('cors_extension.extension_name')}"
                      </p>
                      <p className="text-[10px] text-white/60">
                        {t('cors_extension.extension_stats')}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      <a 
                        href="https://chromewebstore.google.com/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] px-2 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t('cors_extension.install_button')}
                      </a>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-blue-500/20">
                      <p className="text-[10px] text-yellow-400/80 font-mono">
                        {t('cors_extension.security_warning')}
                      </p>
                    </div>
                    
                    <p className="text-[10px] text-white/60 italic mt-2">
                      {t('cors_extension.optional_note')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-red-500/20">
                <p className="text-[10px] md:text-xs text-white/50 italic leading-relaxed">
                  <strong className="text-red-400">{t('labels.why')}</strong> {t('labels.why_cannot_test')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ethical Warning Section */}
      <div className="w-full max-w-6xl px-4 flex flex-col gap-6 md:gap-8 mt-8 md:mt-12">
        <div className="glass-panel p-6 md:p-8 rounded-2xl md:rounded-3xl border-2 border-yellow-500/30 bg-yellow-500/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <AlertTriangle size={24} className="text-yellow-500 animate-pulse shrink-0" />
              <h4 className="text-base md:text-lg font-black text-yellow-500 uppercase tracking-wider">
                {t('labels.ethical_warning')}
              </h4>
            </div>
            
            <div className="space-y-4 md:space-y-5 text-xs md:text-sm text-white/80">
              <div>
                <p className="font-black text-green-400 uppercase mb-2 md:mb-3 text-xs md:text-sm">
                  {t('labels.who_should_use')}
                </p>
                <ul className="space-y-1.5 md:space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1 font-black">✓</span>
                    <span><strong className="text-green-400">{t('who_can_use.website_owners')}</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1 font-black">✓</span>
                    <span><strong className="text-green-400">{t('who_can_use.authorized_teams')}</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1 font-black">✓</span>
                    <span><strong className="text-green-400">{t('who_can_use.bug_bounty')}</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1 font-black">✓</span>
                    <span><strong className="text-green-400">{t('who_can_use.auditors')}</strong></span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 md:pt-5 border-t border-yellow-500/20">
                <p className="font-black text-red-400 uppercase mb-2 md:mb-3 text-xs md:text-sm">
                  {t('labels.prohibited_use')}
                </p>
                <ul className="space-y-1.5 md:space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1 font-black">✗</span>
                    <span><strong className="text-red-400">{t('prohibited.unauthorized')}</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1 font-black">✗</span>
                    <span><strong className="text-red-400">{t('prohibited.malicious')}</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1 font-black">✗</span>
                    <span><strong className="text-red-400">{t('prohibited.privacy')}</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1 font-black">✗</span>
                    <span><strong className="text-red-400">{t('prohibited.illegal')}</strong></span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 md:pt-5 border-t border-yellow-500/20 bg-black/20 p-4 md:p-5 rounded-xl">
                <p className="text-xs md:text-sm text-white/90 leading-relaxed">
                  {t('labels.legal_notice')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full mt-auto pt-8 sm:pt-12 md:pt-16 pb-6 sm:pb-8 md:pb-10 border-t border-white/10 text-center bg-black/70 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
           <div className="flex flex-col gap-3 sm:gap-4 md:gap-5">
             <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-[11px] md:text-[12px] lg:text-xs font-mono text-white/60 uppercase tracking-wider">
               <span className="px-2 sm:px-3 py-1 rounded border border-white/20 bg-white/10 text-white/70 whitespace-nowrap">{t('footer.version_badge')}</span>
               <span className="text-white/40 hidden sm:inline">|</span>
               <span className="px-2 sm:px-3 py-1 rounded border border-white/20 bg-white/10 text-white/70 whitespace-nowrap">{t('footer.neural_engine')}</span>
               <span className="text-white/40 hidden sm:inline">|</span>
               <span className="px-2 sm:px-3 py-1 rounded border border-white/20 bg-white/10 text-white/70 whitespace-nowrap">{t('footer.frontend_only')}</span>
               <span className="text-white/40 hidden sm:inline">|</span>
               <span className="px-2 sm:px-3 py-1 rounded border border-white/20 bg-white/10 text-white/70 whitespace-nowrap">{t('footer.real_time_ai')}</span>
             </div>
             <p className="text-[9px] sm:text-[10px] md:text-[11px] lg:text-[12px] font-mono text-white/50 uppercase tracking-wider px-2 break-words">
               {t('footer.tagline')}
             </p>
             {/* Developer Credit */}
             <div className="pt-2 sm:pt-3 border-t border-white/10">
               <p className="text-[9px] sm:text-[10px] md:text-[11px] font-mono text-white/50 uppercase tracking-wider">
                 {t('footer.developed_by')}{' '}
                 <a 
                   href="https://satpaingoo.github.io/portfolio"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-white/70 hover:text-[#00d4ff] transition-colors duration-200 underline decoration-white/30 hover:decoration-[#00d4ff]/50 cursor-pointer"
                   title={t('footer.visit_portfolio')}
                 >
                   {t('footer.developer_name')}
                 </a>
               </p>
               <p className="text-[8px] sm:text-[9px] md:text-[10px] font-mono text-white/40 mt-1">
                 {t('footer.built_with')}
               </p>
               <p className="text-[8px] sm:text-[9px] md:text-[10px] font-mono text-white/40 mt-2">
                 {t('footer.licensed_under')}{' '}
                 <a 
                   href="https://www.gnu.org/licenses/gpl-3.0.html"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-white/60 hover:text-[#00d4ff] transition-colors duration-200 underline decoration-white/30 hover:decoration-[#00d4ff]/50 cursor-pointer"
                   title={t('footer.gpl_title')}
                 >
                   {t('footer.gpl')}
                 </a>
               </p>
             </div>
           </div>
        </div>
      </footer>
    </motion.div>
  );
};
