import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KeyRound, X, Search, Activity as ActivityIcon, 
  AlertCircle, ShieldCheck, Eye, EyeOff, Cpu as CpuChip, 
  Link2, Info as InfoIcon, ExternalLink, Shield, Zap
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSecurity } from '../contexts/SecurityContext';
import { API_KEY_CONSTANTS } from '../constants';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { isEngineLinked, activeKey, updateManualKey, refreshSecurity, testApiKey, apiKeyStatus, setApiKeyStatus, apiKeyError } = useSecurity();
  const [inputKey, setInputKey] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showKey, setShowKey] = useState(false);
  
  // OPTIMIZATION: Debounce timer for API key validation
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Only reset state when modal opens; do NOT depend on activeKey so Test success is not wiped
  useEffect(() => {
    if (isOpen) {
      setInputKey(activeKey || '');
      setShowKey(false);
      setTestResult(null);
      setIsTesting(false);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isOpen]);

  // Test key directly (pass key to avoid state-timing issues)
  const handleTestKey = async () => {
    if (!inputKey.trim() || inputKey.length < API_KEY_CONSTANTS.MIN_KEY_LENGTH) {
      setTestResult('error');
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setIsTesting(true);
    setTestResult(null);

    const keyToTest = inputKey.trim();
    const isValid = await testApiKey(keyToTest);

    if (isValid) {
      updateManualKey(keyToTest);
      setTestResult('success');
    } else {
      setTestResult('error');
    }
    setIsTesting(false);
  };

  // Save key: validate the key in input directly, then update context.
  // Skip re-validation if key already validated (Test success) or same key already valid in context.
  const handleManualSave = async () => {
    if (!inputKey.trim() || inputKey.length < API_KEY_CONSTANTS.MIN_KEY_LENGTH) {
      setTestResult('error');
      return;
    }

    const keyToTest = inputKey.trim();
    const alreadyValidInContext = keyToTest === activeKey && apiKeyStatus === 'valid';
    const alreadyValidatedByTest = testResult === 'success';

    if (alreadyValidInContext || alreadyValidatedByTest) {
      updateManualKey(keyToTest);
      setTestResult('success');
      setTimeout(() => onClose(), 1000);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setIsTesting(true);
    const isValid = await testApiKey(keyToTest);

    if (isValid) {
      updateManualKey(keyToTest);
      setTestResult('success');
      setTimeout(() => onClose(), 1000);
    } else {
      setTestResult('error');
      setApiKeyStatus('invalid');
    }
    setIsTesting(false);
  };

  const handleSystemLink = async () => {
    setIsLinking(true);
    try {
      // Check if AI Studio extension is available
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
        // Wait a bit for extension to process
        await new Promise(resolve => setTimeout(resolve, 500));
        refreshSecurity();
        onClose();
      } else {
        // Extension not available - show helpful message to user
        alert(t('apikey.extension_alert'));
        setIsLinking(false);
      }
    } catch (e) {
      console.error("Neural core linking failed", e);
      alert(t('apikey.auto_link_failed'));
      setIsLinking(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div 
          key="api-key-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[90vh] glass-panel rounded-[2rem] md:rounded-[4rem] border border-[#00d4ff]/20 bg-black/50 shadow-4xl overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00d4ff] via-[#00ff9d] to-[#00d4ff] opacity-80 z-10" />
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
            
            {/* Header - Fixed */}
            <div className="flex justify-between items-start mb-6 md:mb-8 p-8 md:p-12 pb-4 md:pb-6 flex-shrink-0">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="relative">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff]/20 to-[#00d4ff]/5 border-2 border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] shadow-[0_0_40px_rgba(0,212,255,0.3)]">
                    <KeyRound size={28} className="md:w-8 md:h-8" />
                  </div>
                  <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${isEngineLinked ? 'bg-[#00ff9d] animate-pulse' : 'bg-red-500 animate-pulse'}`} />
                </div>
                <div>
                  <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2">
                    {t('apikey.modal_title')}
                  </h3>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${isEngineLinked ? 'bg-[#00ff9d] shadow-[0_0_10px_rgba(0,255,157,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'} animate-pulse`} />
                    <span className="text-[10px] md:text-[12px] font-mono text-white/40 uppercase tracking-[0.3em]">
                      {isEngineLinked ? t('apikey.core_linked') : t('apikey.core_disconnected')}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2.5 md:p-3 hover:bg-white/10 rounded-xl transition-all duration-200 group border border-transparent hover:border-white/10 z-20 relative"
                type="button"
                aria-label={t('apikey.close_modal')}
              >
                <X size={20} className="md:w-6 md:h-6 text-white/30 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-8 md:px-12 pb-8 md:pb-12 space-y-6 md:space-y-8">
              <div className="space-y-3 md:space-y-4">
                <label className="text-[11px] md:text-[13px] font-black text-white/60 uppercase tracking-[0.4em] flex items-center gap-2.5">
                  <div className="w-1 h-4 bg-gradient-to-b from-[#00d4ff] to-[#00ff9d]" />
                  <span>{t('apikey.manual_token_input')}</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-r from-[#00d4ff]/10 via-[#00ff9d]/5 to-[#00d4ff]/10 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500" />
                  <div className="relative glass-panel rounded-xl md:rounded-2xl bg-black/60 border-2 border-white/10 overflow-hidden group-focus-within:border-[#00d4ff]/50 group-focus-within:shadow-[0_0_40px_rgba(0,212,255,0.3)] transition-all duration-300">
                    <input 
                      type={showKey ? "text" : "password"}
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className="w-full bg-transparent px-5 py-4 md:px-7 md:py-6 pr-14 md:pr-16 outline-none font-mono text-sm md:text-base text-white placeholder:text-white/25 placeholder:font-normal"
                      placeholder={t('apikey.placeholder')}
                      autoFocus
                    />
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                      title={showKey ? t('apikey.hide_token') : t('apikey.show_token')}
                      type="button"
                    >
                      {showKey ? <EyeOff size={18} className="md:w-5 md:h-5" /> : <Eye size={18} className="md:w-5 md:h-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="min-h-[20px] flex items-start">
                  {inputKey.length > 0 && inputKey.length < API_KEY_CONSTANTS.MIN_KEY_LENGTH && (
                    <p className="text-[10px] md:text-[11px] font-mono text-red-400/80 uppercase tracking-wider px-2 flex items-center gap-2">
                      <AlertCircle size={12} className="shrink-0" />
                      {t('apikey.invalid_format')}
                    </p>
                  )}
                  {testResult === 'success' && (
                    <p className="text-[9px] md:text-[10px] font-mono text-[#00ff9d] uppercase tracking-wider px-2 flex items-center gap-2">
                      <ShieldCheck size={12} className="shrink-0" />
                      {t('apikey.validated_success')}
                    </p>
                  )}
                  {testResult === 'error' && inputKey.length >= API_KEY_CONSTANTS.MIN_KEY_LENGTH && apiKeyError && (() => {
                        const type = apiKeyError.type;
                        const msgKey = `apikey.error_${type}_message`;
                        const displayMessage = type === 'unknown'
                          ? `${t('apikey.error_unknown_message')}${apiKeyError.message ? `: ${apiKeyError.message}` : ''}`
                          : (t(msgKey) !== msgKey ? t(msgKey) : apiKeyError.message);
                        let displaySuggestions: string[] = [];
                        if (type === 'missing_models' && apiKeyError.missingModels?.length) {
                          const arr = t('apikey.error_missing_models_suggestions');
                          const base = Array.isArray(arr) ? arr : [];
                          displaySuggestions = [
                            base[0] || '',
                            `${t('apikey.error_missing_models_enable_models')} ${apiKeyError.missingModels.join(', ')}`,
                            base[1] || '',
                            base[2] || ''
                          ].filter(Boolean);
                        } else {
                          const sug = t(`apikey.error_${type}_suggestions`);
                          displaySuggestions = Array.isArray(sug) ? sug : apiKeyError.suggestions;
                        }
                        return (
                    <div className="space-y-2 w-full bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <p className="text-[9px] md:text-[10px] font-mono text-red-400/80 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle size={12} className="shrink-0" />
                        {displayMessage}
                      </p>
                      <div className="space-y-2 mt-2">
                        {/* Specific Error Details */}
                        {apiKeyError.type === 'missing_models' && apiKeyError.missingModels && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded p-2 space-y-1">
                            <p className="text-[10px] md:text-[11px] font-mono text-white/70 font-semibold">
                              {t('apikey.missing_models')}
                            </p>
                            <ul className="text-[10px] md:text-[11px] font-mono text-white/50 ml-3 space-y-0.5 list-disc">
                              {apiKeyError.missingModels.map((model, idx) => (
                                <li key={idx}>
                                  <code className="text-[#00d4ff]">{model}</code>
                                  {model.includes('flash') && t('apikey.model_required_fast')}
                                  {model.includes('pro') && t('apikey.model_required_deep')}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {apiKeyError.type === 'missing_billing' && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                            <p className="text-[10px] md:text-[11px] font-mono text-white/70 font-semibold mb-1">
                              {t('apikey.billing_issue')}
                            </p>
                            <p className="text-[10px] md:text-[11px] font-mono text-white/50">
                              {t('apikey.billing_message')}
                            </p>
                          </div>
                        )}
                        
                        {apiKeyError.type === 'format_error' && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                            <p className="text-[10px] md:text-[11px] font-mono text-white/70 font-semibold mb-1">
                              {t('apikey.format_issue')}
                            </p>
                            <p className="text-[10px] md:text-[11px] font-mono text-white/50">
                              {t('apikey.format_message')}
                            </p>
                          </div>
                        )}
                        
                        {apiKeyError.type === 'invalid_key' && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                            <p className="text-[10px] md:text-[11px] font-mono text-white/70 font-semibold mb-1">
                              {t('apikey.auth_failed')}
                            </p>
                            <p className="text-[10px] md:text-[11px] font-mono text-white/50">
                              {t('apikey.auth_failed_message')}
                            </p>
                          </div>
                        )}

                        {/* Actionable Suggestions */}
                        <div className="pt-2 mt-2 border-t border-red-500/10">
                          <p className="text-[10px] md:text-[11px] font-mono text-white/60 mb-1.5">
                            <strong className="text-white/70">{t('apikey.what_to_do')}</strong>
                          </p>
                          <ul className="space-y-1 text-[10px] md:text-[11px] font-mono text-white/50">
                            {displaySuggestions.map((suggestion, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-[#00d4ff] mt-0.5">→</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                        );
                  })()}
                  
                  {/* Fallback generic error if no specific error details */}
                  {testResult === 'error' && inputKey.length >= API_KEY_CONSTANTS.MIN_KEY_LENGTH && !apiKeyError && (
                    <div className="space-y-2 w-full bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                        <p className="text-[9px] md:text-[10px] font-mono text-red-400/80 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle size={12} className="shrink-0" />
                        {t('apikey.invalid_key_generic')}
                      </p>
                      <div className="space-y-2 mt-2">
                        <p className="text-[10px] md:text-[11px] font-mono text-white/50 leading-relaxed">
                          <strong className="text-white/70">{t('apikey.check_required_services')}</strong>
                        </p>
                        <ul className="space-y-1 text-[10px] md:text-[11px] font-mono text-white/50 ml-3 list-disc">
                          <li>{t('apikey.service_1')} <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:text-[#00ff9d] underline">aistudio.google.com/apikey</a></li>
                          <li>{t('apikey.service_2')}</li>
                          <li>{t('apikey.service_3')}</li>
                          <li>{t('apikey.service_4')}</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  {isTesting && (
                    <p className="text-[9px] md:text-[10px] font-mono text-[#00d4ff] uppercase tracking-wider px-2 flex items-center gap-2">
                      <ActivityIcon size={12} className="animate-spin shrink-0" />
                      {t('apikey.testing_connectivity')}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <button 
                  onClick={handleTestKey}
                  disabled={!inputKey.trim() || inputKey.length < API_KEY_CONSTANTS.MIN_KEY_LENGTH || isTesting}
                  className="py-4 md:py-5 rounded-xl md:rounded-2xl bg-[#00d4ff]/10 text-[#00d4ff] border-2 border-[#00d4ff]/30 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-[#00d4ff]/20 hover:border-[#00d4ff]/50 hover:shadow-[0_0_25px_rgba(0,212,255,0.3)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#00d4ff]/10 disabled:hover:border-[#00d4ff]/30 disabled:hover:shadow-none flex items-center justify-center gap-2"
                >
                  {isTesting ? (
                    <>
                      <ActivityIcon size={14} className="md:w-4 md:h-4 animate-spin" />
                      <span>{t('apikey.testing')}</span>
                    </>
                  ) : (
                    <>
                      <Search size={14} className="md:w-4 md:h-4" />
                      <span>{t('apikey.testing')}</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={handleManualSave}
                  disabled={!inputKey.trim() || inputKey.length < API_KEY_CONSTANTS.MIN_KEY_LENGTH || isTesting || testResult === 'error'}
                  className="py-4 md:py-5 rounded-xl md:rounded-2xl bg-gradient-to-r from-white via-white/95 to-white text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-xs hover:from-white/95 hover:via-white/90 hover:to-white/95 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 col-span-1 sm:col-span-1"
                >
                  <KeyRound size={14} className="md:w-4 md:h-4" />
                  <span>{t('apikey.apply')}</span>
                </button>
                <button 
                  onClick={handleSystemLink}
                  disabled={isLinking}
                  className="py-4 md:py-5 rounded-xl md:rounded-2xl bg-[#00ff9d]/10 text-[#00ff9d] border-2 border-[#00ff9d]/30 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-[#00ff9d]/20 hover:border-[#00ff9d]/50 hover:shadow-[0_0_25px_rgba(0,255,157,0.3)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative group"
                  title={!window.aistudio?.openSelectKey ? t('apikey.extension_required_tooltip') : t('apikey.extension_detected_tooltip')}
                >
                  {isLinking ? (
                    <>
                      <ActivityIcon size={14} className="md:w-4 md:h-4 animate-pulse" />
                      <span>{t('apikey.linking')}</span>
                    </>
                  ) : (
                    <>
                      <Link2 size={14} className="md:w-4 md:h-4 shrink-0" />
                      <span className="truncate max-w-[140px] sm:max-w-none">{t('apikey.auto_link')}</span>
                      {!window.aistudio?.openSelectKey && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse border border-black" title={t('apikey.extension_not_detected')} />
                      )}
                    </>
                  )}
                  {/* Tooltip for extension requirement */}
                  {!window.aistudio?.openSelectKey && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                      <div className="bg-yellow-500/90 text-black text-[10px] px-2 py-1 rounded whitespace-nowrap font-mono shadow-lg">
                        {t('apikey.requires_extension_tooltip')}
                      </div>
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-yellow-500/90 mx-auto"></div>
                    </div>
                  )}
                </button>
              </div>

              {/* Required Services/Features Guide */}
              <div className="pt-4 md:pt-6 border-t border-white/5">
                <div className="mb-6 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CpuChip size={16} className="text-[#00d4ff]" />
                    <h4 className="text-xs md:text-sm font-black text-white/80 uppercase tracking-wider">
                      {t('apikey.required_config_title')}
                    </h4>
                  </div>
                  
                  <div className="space-y-3 text-[10px] md:text-[11px] font-mono">
                    <div className="bg-[#00d4ff]/5 border border-[#00d4ff]/10 rounded-lg p-3 space-y-2.5">
                      {/* Google AI Studio API Key */}
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-white/70 font-semibold mb-1">{t('apikey.step1_title')}</p>
                          <p className="text-white/50 leading-relaxed mb-1">
                            {t('apikey.get_key_from')}{' '}
                            <a 
                              href="https://aistudio.google.com/apikey" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[#00d4ff] hover:text-[#00ff9d] underline inline-flex items-center gap-1"
                            >
                              aistudio.google.com/apikey
                              <ExternalLink size={10} />
                            </a>
                          </p>
                        </div>
                      </div>
                      
                      {/* Required APIs */}
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-white/70 font-semibold mb-1">{t('apikey.step2_title')}</p>
                          <p className="text-white/50 leading-relaxed mb-1">
                            {t('apikey.enable_service_hint')}
                          </p>
                          <ul className="list-none text-white/40 ml-2 mt-1 space-y-1.5">
                            <li className="flex items-start gap-2">
                              <span className="text-[#00d4ff] mt-0.5">•</span>
                              <div className="flex-1">
                                <span className="text-white/60 font-semibold">{t('apikey.gen_lang_api')}</span>
                                <span className="text-white/30 text-[10px] ml-1">{t('apikey.required_gemini')}</span>
                                <p className="text-white/40 text-[9px] mt-0.5">
                                  {t('apikey.go_enable_gen_lang')}
                                </p>
                              </div>
                            </li>
                          </ul>
                          <div className="mt-2 space-y-1">
                            <p className="text-white/50 leading-relaxed text-[10px]">
                              <strong className="text-white/70">{t('apikey.required_models')}</strong>
                            </p>
                            <ul className="list-none text-white/40 ml-2 space-y-1">
                              <li className="flex items-center gap-2">
                                <span className="text-[#00d4ff]">•</span>
                                <code className="text-[#00d4ff] text-[10px] md:text-[11px]">gemini-3-flash-preview</code>
                                <span className="text-white/30 text-[10px]">{t('apikey.for_fast_standard')}</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="text-[#00d4ff]">•</span>
                                <code className="text-[#00d4ff] text-[10px] md:text-[11px]">gemini-3-pro-preview</code>
                                <span className="text-white/30 text-[10px]">{t('apikey.for_deep')}</span>
                              </li>
                            </ul>
                          </div>
                          <a 
                            href="https://console.cloud.google.com/apis/library" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#00d4ff] hover:text-[#00ff9d] text-[10px] underline inline-flex items-center gap-1 mt-2"
                          >
                            {t('apikey.open_api_library')}
                            <ExternalLink size={9} />
                          </a>
                        </div>
                      </div>
                      
                      {/* Search Grounding – uses same AI Studio key & Generative Language API/Gemini API, no Vertex AI */}
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-white/70 font-semibold mb-1">{t('apikey.step3_title')}</p>
                          <p className="text-white/50 leading-relaxed mb-1">
                            {t('apikey.step3_desc')}
                          </p>
                          <p className="text-white/40 text-[10px] mt-1.5 leading-relaxed">
                            {t('apikey.step3_same_api')}
                          </p>
                          <a 
                            href="https://ai.google.dev/gemini-api/docs/grounding" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#00d4ff] hover:text-[#00ff9d] text-[8px] underline inline-flex items-center gap-1 mt-2"
                          >
                            {t('apikey.learn_search_grounding')}
                            <ExternalLink size={9} />
                          </a>
                        </div>
                      </div>
                      
                      {/* Billing */}
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-white/70 font-semibold mb-1">{t('apikey.step4_title')}</p>
                          <p className="text-white/50 leading-relaxed mb-1">
                            {t('apikey.step4_desc')}
                          </p>
                          <a 
                            href="https://console.cloud.google.com/billing" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#00d4ff] hover:text-[#00ff9d] text-[8px] underline inline-flex items-center gap-1"
                          >
                            {t('apikey.setup_billing')}
                            <ExternalLink size={9} />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CORS Extension Suggestion - Compact Version */}
                <div className="pt-4 md:pt-6 border-t border-white/5">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[10px] md:text-[11px] font-black text-blue-400 uppercase mb-2 flex items-center gap-2">
                          <Zap className="w-3 h-3" />
                          {t('cors_extension.pro_tip_title')}
                        </p>
                        <p className="text-[10px] md:text-[11px] text-white/70 leading-relaxed mb-2">
                          {t('cors_extension.pro_tip_desc')}
                        </p>
                        
                        <div className="bg-black/30 p-2 rounded mb-2">
                          <p className="text-[10px] text-white/90 font-mono">
                            <strong className="text-blue-400">{t('cors_extension.recommended')}</strong> "{t('cors_extension.extension_name')}"
                          </p>
                          <p className="text-[10px] text-white/60 mt-0.5">
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
                </div>

                {/* Existing info section */}
                <div className="pt-4 md:pt-6 mt-4 md:mt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-[#00d4ff]/5 border border-[#00d4ff]/10 shrink-0">
                      <InfoIcon size={14} className="text-[#00d4ff]/70" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-[11px] font-mono text-white/50 leading-relaxed">
                        {t('apikey.gemini_billing_note')}
                      </p>
                    </div>
                  </div>
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[10px] md:text-[11px] font-black text-[#00d4ff] hover:text-[#00ff9d] transition-colors uppercase tracking-widest whitespace-nowrap bg-[#00d4ff]/5 px-4 py-2.5 rounded-full border border-[#00d4ff]/20 hover:border-[#00ff9d]/40 hover:bg-[#00d4ff]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.2)]"
                  >
                    {t('apikey.setup_portal')} <ExternalLink size={11} className="md:w-3.5 md:h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
