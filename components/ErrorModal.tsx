import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, X, AlertCircle, KeyRound } from 'lucide-react';

interface ErrorModalProps {
  error: { message: string; type: 'api_key' | 'network' | 'unknown' };
  onClose: () => void;
  onFixApiKey: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ error, onClose, onFixApiKey }) => {
  const isApiKeyError = error.type === 'api_key';
  
  return (
    <AnimatePresence mode="wait">
      <motion.div 
        key="error-modal"
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
          className="relative w-full max-w-xl glass-panel p-8 md:p-14 rounded-[3rem] md:rounded-[5rem] border border-red-500/30 bg-black/40 shadow-4xl overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-red-400 to-red-500" />
          
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <AlertOctagon size={32} />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">MISSION_ERROR</h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] md:text-[11px] font-mono text-white/30 uppercase tracking-[0.2em]">
                    {isApiKeyError ? 'API_KEY_FAILURE' : 'SCAN_FAILED'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-colors group">
              <X size={24} className="text-white/20 group-hover:text-white" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="glass-panel rounded-xl md:rounded-2xl bg-red-500/5 border border-red-500/20 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <AlertCircle size={24} className="text-red-500 shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="text-lg md:text-xl font-black text-red-400 uppercase tracking-wider mb-3">
                    {isApiKeyError ? 'API Key Error' : 'Scan Error'}
                  </h4>
                  <p className="text-sm md:text-base font-mono text-white/70 leading-relaxed mb-4">
                    {error.message}
                  </p>
                  {isApiKeyError && (
                    <div className="mt-4 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                      <p className="text-xs md:text-sm font-mono text-yellow-400/80 leading-relaxed">
                        <strong>Possible causes:</strong><br />
                        • API key is invalid or expired<br />
                        • API key lacks required permissions<br />
                        • Billing not enabled for Gemini API<br />
                        • API quota exceeded
                      </p>
                    </div>
                  )}
                  {!isApiKeyError && error.type === 'network' && (
                    <div className="mt-4 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                      <p className="text-xs md:text-sm font-mono text-yellow-400/80 leading-relaxed">
                        <strong>What to check:</strong><br />
                        • Verify the URL is correct and includes the protocol (http:// or https://)<br />
                        • Check if the website is accessible in your browser<br />
                        • Ensure the domain exists and DNS can resolve it<br />
                        • The website may be down or blocking connections
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              {isApiKeyError && (
                <button 
                  onClick={() => { onFixApiKey(); onClose(); }}
                  className="flex-1 py-5 md:py-7 rounded-xl md:rounded-2xl bg-red-500 text-black font-black uppercase tracking-[0.25em] text-xs md:text-sm hover:bg-red-400 transition-all active:scale-[0.98] shadow-[0_8px_25px_rgba(239,68,68,0.2)] flex items-center justify-center gap-2"
                >
                  <KeyRound size={16} className="md:w-5 md:h-5" />
                  Fix_API_Key
                </button>
              )}
              <button 
                onClick={onClose}
                className="flex-1 py-5 md:py-7 rounded-xl md:rounded-2xl bg-white/10 text-white border-2 border-white/20 font-black uppercase tracking-[0.25em] text-xs md:text-sm hover:bg-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <X size={16} className="md:w-5 md:h-5" />
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
