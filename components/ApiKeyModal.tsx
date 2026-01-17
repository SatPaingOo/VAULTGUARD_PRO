import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KeyRound, X, Search, Activity as ActivityIcon, 
  AlertCircle, ShieldCheck, Eye, EyeOff, Cpu as CpuChip, 
  Info as InfoIcon, ExternalLink, Shield, Zap
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSecurity } from '../contexts/SecurityContext';

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

  useEffect(() => {
    if (isOpen) {
      setInputKey('');
      setShowKey(false);
      setTestResult(null);
      setIsTesting(false);
    }
  }, [isOpen]);

  const handleTestKey = async () => {
    if (!inputKey.trim() || inputKey.length < 20) {
      setTestResult('error');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    
    const originalKey = activeKey;
    updateManualKey(inputKey);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const isValid = await testApiKey();
    
    if (isValid) {
      setTestResult('success');
    } else {
      setTestResult('error');
      if (originalKey) {
        updateManualKey(originalKey);
      }
    }
    
    setIsTesting(false);
  };

  const handleManualSave = async () => {
    if (!inputKey.trim() || inputKey.length < 20) {
      setTestResult('error');
      return;
    }

    setIsTesting(true);
    updateManualKey(inputKey);
    await new Promise(resolve => setTimeout(resolve, 200));
    const isValid = await testApiKey();
    
    if (isValid) {
      setTestResult('success');
      setTimeout(() => {
        onClose();
      }, 1000);
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
        alert('Google AI Studio browser extension is not installed.\n\nTo use Auto Link:\n1. Install Google AI Studio extension from Chrome Web Store\n2. Or use "Manual Token Input" to enter your API key directly\n\nGet API key: https://aistudio.google.com/apikey');
        setIsLinking(false);
      }
    } catch (e) {
      console.error("Neural core linking failed", e);
      alert('Auto Link failed. Please use "Manual Token Input" to enter your API key.\n\nGet API key: https://aistudio.google.com/apikey');
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
                    Neural_Core_Auth
                  </h3>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${isEngineLinked ? 'bg-[#00ff9d] shadow-[0_0_10px_rgba(0,255,157,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'} animate-pulse`} />
                    <span className="text-[10px] md:text-[12px] font-mono text-white/40 uppercase tracking-[0.3em]">
                      {isEngineLinked ? 'CORE_LINKED' : 'CORE_DISCONNECTED'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2.5 md:p-3 hover:bg-white/10 rounded-xl transition-all duration-200 group border border-transparent hover:border-white/10 z-20 relative"
                type="button"
                aria-label="Close modal"
              >
                <X size={20} className="md:w-6 md:h-6 text-white/30 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-8 md:px-12 pb-8 md:pb-12 space-y-6 md:space-y-8">
              <div className="space-y-3 md:space-y-4">
                <label className="text-[11px] md:text-[13px] font-black text-white/60 uppercase tracking-[0.4em] flex items-center gap-2.5">
                  <div className="w-1 h-4 bg-gradient-to-b from-[#00d4ff] to-[#00ff9d]" />
                  <span>Manual_Token_Input</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-r from-[#00d4ff]/10 via-[#00ff9d]/5 to-[#00d4ff]/10 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500" />
                  <div className="relative glass-panel rounded-xl md:rounded-2xl bg-black/60 border-2 border-white/10 overflow-hidden group-focus-within:border-[#00d4ff]/50 group-focus-within:shadow-[0_0_40px_rgba(0,212,255,0.3)] transition-all duration-300">
                    <input 
                      type={showKey ? "text" : "password"}
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className="w-full bg-transparent px-5 py-4 md:px-7 md:py-6 pr-14 md:pr-16 outline-none font-mono text-sm md:text-base text-white placeholder:text-white/25 placeholder:font-normal"
                      placeholder="AIzaSy..."
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
                  {inputKey.length > 0 && inputKey.length < 20 && (
                    <p className="text-[9px] md:text-[10px] font-mono text-red-400/80 uppercase tracking-wider px-2 flex items-center gap-2">
                      <AlertCircle size={12} className="shrink-0" />
                      {t('apikey.invalid_format')}
                    </p>
                  )}
                  {testResult === 'success' && (
                    <p className="text-[9px] md:text-[10px] font-mono text-[#00ff9d] uppercase tracking-wider px-2 flex items-center gap-2">
                      <ShieldCheck size={12} className="shrink-0" />
                      API key validated successfully
                    </p>
                  )}
                  {testResult === 'error' && inputKey.length >= 20 && apiKeyError && (
                    <div className="space-y-2 w-full bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <p className="text-[9px] md:text-[10px] font-mono text-red-400/80 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle size={12} className="shrink-0" />
                        {apiKeyError.message}
                      </p>
                      <div className="space-y-2 mt-2">
                        {/* Specific Error Details */}
                        {apiKeyError.type === 'missing_models' && apiKeyError.missingModels && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded p-2 space-y-1">
                            <p className="text-[8px] md:text-[9px] font-mono text-white/70 font-semibold">
                              Missing Models:
                            </p>
                            <ul className="text-[8px] md:text-[9px] font-mono text-white/50 ml-3 space-y-0.5 list-disc">
                              {apiKeyError.missingModels.map((model, idx) => (
                                <li key={idx}>
                                  <code className="text-[#00d4ff]">{model}</code>
                                  {model.includes('flash') && ' (required for FAST/STANDARD scans)'}
                                  {model.includes('pro') && ' (required for DEEP scans)'}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {apiKeyError.type === 'missing_billing' && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                            <p className="text-[8px] md:text-[9px] font-mono text-white/70 font-semibold mb-1">
                              Billing Issue Detected:
                            </p>
                            <p className="text-[8px] md:text-[9px] font-mono text-white/50">
                              Your Google Cloud Project needs active billing to use Gemini 3 models.
                            </p>
                          </div>
                        )}
                        
                        {apiKeyError.type === 'format_error' && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                            <p className="text-[8px] md:text-[9px] font-mono text-white/70 font-semibold mb-1">
                              Format Issue:
                            </p>
                            <p className="text-[8px] md:text-[9px] font-mono text-white/50">
                              API key should start with <code className="text-[#00d4ff]">AIzaSy...</code> and be at least 39 characters.
                            </p>
                          </div>
                        )}
                        
                        {apiKeyError.type === 'invalid_key' && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                            <p className="text-[8px] md:text-[9px] font-mono text-white/70 font-semibold mb-1">
                              Authentication Failed:
                            </p>
                            <p className="text-[8px] md:text-[9px] font-mono text-white/50">
                              The API key is invalid, expired, or has been revoked.
                            </p>
                          </div>
                        )}

                        {/* Actionable Suggestions */}
                        <div className="pt-2 mt-2 border-t border-red-500/10">
                          <p className="text-[8px] md:text-[9px] font-mono text-white/60 mb-1.5">
                            <strong className="text-white/70">What to do:</strong>
                          </p>
                          <ul className="space-y-1 text-[8px] md:text-[9px] font-mono text-white/50">
                            {apiKeyError.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-[#00d4ff] mt-0.5">→</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Fallback generic error if no specific error details */}
                  {testResult === 'error' && inputKey.length >= 20 && !apiKeyError && (
                    <div className="space-y-2 w-full bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <p className="text-[9px] md:text-[10px] font-mono text-red-400/80 uppercase tracking-wider flex items-center gap-2">
                        <AlertCircle size={12} className="shrink-0" />
                        Invalid or non-functional key
                      </p>
                      <div className="space-y-2 mt-2">
                        <p className="text-[8px] md:text-[9px] font-mono text-white/50 leading-relaxed">
                          <strong className="text-white/70">Check Required Services:</strong>
                        </p>
                        <ul className="space-y-1 text-[8px] md:text-[9px] font-mono text-white/50 ml-3 list-disc">
                          <li>Google AI Studio API Key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:text-[#00ff9d] underline">aistudio.google.com/apikey</a></li>
                          <li>Models: <code className="text-[#00d4ff]">gemini-3-flash-preview</code> & <code className="text-[#00d4ff]">gemini-3-pro-preview</code> enabled</li>
                          <li>Search Grounding feature enabled</li>
                          <li>Active billing on Google Cloud Project</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  {isTesting && (
                    <p className="text-[9px] md:text-[10px] font-mono text-[#00d4ff] uppercase tracking-wider px-2 flex items-center gap-2">
                      <ActivityIcon size={12} className="animate-spin shrink-0" />
                      Testing connectivity...
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <button 
                  onClick={handleTestKey}
                  disabled={!inputKey.trim() || inputKey.length < 20 || isTesting}
                  className="py-4 md:py-5 rounded-xl md:rounded-2xl bg-[#00d4ff]/10 text-[#00d4ff] border-2 border-[#00d4ff]/30 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-[#00d4ff]/20 hover:border-[#00d4ff]/50 hover:shadow-[0_0_25px_rgba(0,212,255,0.3)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#00d4ff]/10 disabled:hover:border-[#00d4ff]/30 disabled:hover:shadow-none flex items-center justify-center gap-2"
                >
                  {isTesting ? (
                    <>
                      <ActivityIcon size={14} className="md:w-4 md:h-4 animate-spin" />
                      <span>Testing</span>
                    </>
                  ) : (
                    <>
                      <Search size={14} className="md:w-4 md:h-4" />
                      <span>Test</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={handleManualSave}
                  disabled={!inputKey.trim() || inputKey.length < 20 || isTesting || testResult === 'error'}
                  className="py-4 md:py-5 rounded-xl md:rounded-2xl bg-gradient-to-r from-white via-white/95 to-white text-black font-black uppercase tracking-[0.2em] text-[10px] md:text-xs hover:from-white/95 hover:via-white/90 hover:to-white/95 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 col-span-1 sm:col-span-1"
                >
                  <KeyRound size={14} className="md:w-4 md:h-4" />
                  <span>Apply</span>
                </button>
                <button 
                  onClick={handleSystemLink}
                  disabled={isLinking}
                  className="py-4 md:py-5 rounded-xl md:rounded-2xl bg-[#00ff9d]/10 text-[#00ff9d] border-2 border-[#00ff9d]/30 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs hover:bg-[#00ff9d]/20 hover:border-[#00ff9d]/50 hover:shadow-[0_0_25px_rgba(0,255,157,0.3)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative group"
                  title={!window.aistudio?.openSelectKey ? "Requires Google AI Studio browser extension. Use Manual Token Input instead." : "Link API key from Google AI Studio extension"}
                >
                  {isLinking ? (
                    <>
                      <ActivityIcon size={14} className="md:w-4 md:h-4 animate-pulse" />
                      <span>Linking</span>
                    </>
                  ) : (
                    <>
                      <CpuChip size={14} className="md:w-4 md:h-4" />
                      <span>Auto_Link</span>
                      {!window.aistudio?.openSelectKey && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse border border-black" title="Extension not detected" />
                      )}
                    </>
                  )}
                  {/* Tooltip for extension requirement */}
                  {!window.aistudio?.openSelectKey && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                      <div className="bg-yellow-500/90 text-black text-[8px] px-2 py-1 rounded whitespace-nowrap font-mono shadow-lg">
                        Requires AI Studio Extension
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
                      Required API Configuration
                    </h4>
                  </div>
                  
                  <div className="space-y-3 text-[9px] md:text-[10px] font-mono">
                    <div className="bg-[#00d4ff]/5 border border-[#00d4ff]/10 rounded-lg p-3 space-y-2.5">
                      {/* Google AI Studio API Key */}
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-white/70 font-semibold mb-1">1. Google AI Studio API Key</p>
                          <p className="text-white/50 leading-relaxed mb-1">
                            Get your API key from{' '}
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
                      
                      {/* Required Models */}
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-white/70 font-semibold mb-1">2. Required Models Access</p>
                          <p className="text-white/50 leading-relaxed mb-1">
                            Your API key must have access to:
                          </p>
                          <ul className="list-none text-white/40 ml-2 mt-1 space-y-1">
                            <li className="flex items-center gap-2">
                              <span className="text-[#00d4ff]">•</span>
                              <code className="text-[#00d4ff] text-[8px] md:text-[9px]">gemini-3-flash-preview</code>
                              <span className="text-white/30 text-[8px]">(FAST/STANDARD scans)</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-[#00d4ff]">•</span>
                              <code className="text-[#00d4ff] text-[8px] md:text-[9px]">gemini-3-pro-preview</code>
                              <span className="text-white/30 text-[8px]">(DEEP scans)</span>
                            </li>
                          </ul>
                          <a 
                            href="https://console.cloud.google.com/apis/library" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#00d4ff] hover:text-[#00ff9d] text-[8px] underline inline-flex items-center gap-1 mt-1"
                          >
                            Enable in Google Cloud Console
                            <ExternalLink size={9} />
                          </a>
                        </div>
                      </div>
                      
                      {/* Search Grounding */}
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-white/70 font-semibold mb-1">3. Search Grounding Feature</p>
                          <p className="text-white/50 leading-relaxed mb-1">
                            Enable <strong className="text-white/70">Google Search Grounding</strong> in your Google Cloud Project.
                            Required for live CVE database cross-referencing.
                          </p>
                          <a 
                            href="https://console.cloud.google.com/apis/library" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#00d4ff] hover:text-[#00ff9d] text-[8px] underline inline-flex items-center gap-1"
                          >
                            Enable Search Grounding
                            <ExternalLink size={9} />
                          </a>
                        </div>
                      </div>
                      
                      {/* Billing */}
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-white/70 font-semibold mb-1">4. Active Billing Required</p>
                          <p className="text-white/50 leading-relaxed mb-1">
                            Gemini 3 models require active billing. Ensure your Google Cloud Project has billing enabled.
                          </p>
                          <a 
                            href="https://console.cloud.google.com/billing" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#00d4ff] hover:text-[#00ff9d] text-[8px] underline inline-flex items-center gap-1"
                          >
                            Setup Billing
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
                          Pro Tip: CORS Extension for Better Results
                        </p>
                        <p className="text-[9px] md:text-[10px] text-white/70 leading-relaxed mb-2">
                          For <strong className="text-blue-400">maximum scan accuracy</strong> (~95-100% vs ~60-70%), 
                          install a CORS extension before scanning. This enables full DOM access and complete security analysis.
                        </p>
                        
                        <div className="bg-black/30 p-2 rounded mb-2">
                          <p className="text-[9px] text-white/90 font-mono">
                            <strong className="text-blue-400">Recommended:</strong> "Allow CORS: Access-Control-Allow-Origin"
                          </p>
                          <p className="text-[8px] text-white/60 mt-0.5">
                            800,000+ users • 3.4/5 rating • Chrome & Firefox
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-2">
                          <a 
                            href="https://chromewebstore.google.com/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[8px] px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Install Extension
                          </a>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-blue-500/20">
                          <p className="text-[8px] text-yellow-400/80 font-mono">
                            ⚠️ Disable after scanning for security
                          </p>
                        </div>
                        
                        <p className="text-[8px] text-white/60 italic mt-2">
                          <strong>Note:</strong> Optional. VaultGuard Pro works without it using AI compensation.
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
                      <p className="text-[9px] md:text-[10px] font-mono text-white/50 leading-relaxed">
                        <span className="text-white/70 font-semibold">Gemini 3 Series</span> requires active billing. API key stored in React Context (in-memory only, cleared on page reload).
                      </p>
                    </div>
                  </div>
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-[#00d4ff] hover:text-[#00ff9d] transition-colors uppercase tracking-widest whitespace-nowrap bg-[#00d4ff]/5 px-4 py-2.5 rounded-full border border-[#00d4ff]/20 hover:border-[#00ff9d]/40 hover:bg-[#00d4ff]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.2)]"
                  >
                    Setup_Portal <ExternalLink size={11} className="md:w-3.5 md:h-3.5" />
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
