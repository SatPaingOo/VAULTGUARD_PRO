import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, X, AlertCircle, KeyRound } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ErrorModalProps {
  error: { message: string; type: 'api_key' | 'network' | 'rate_limit' | 'service_busy' | 'unknown' };
  onClose: () => void;
  onFixApiKey: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ error, onClose, onFixApiKey }) => {
  const { t } = useLanguage();
  const isApiKeyError = error.type === 'api_key';
  const em = (key: string) => t(`error_modal.${key}`);
  const labels = {
    title: em(`${error.type}_title`),
    subtitle: em(`${error.type}_subtitle`),
  };

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
                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">{em('mission_error')}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] md:text-[11px] font-mono text-white/30 uppercase tracking-[0.2em]">
                    {labels.subtitle}
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
                    {labels.title}
                  </h4>
                  <p className="text-sm md:text-base font-mono text-white/70 leading-relaxed mb-4">
                    {error.message}
                  </p>
                  {isApiKeyError && (
                    <div className="mt-4 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                      <p className="text-xs md:text-sm font-mono text-yellow-400/80 leading-relaxed">
                        <strong>{em('possible_causes')}</strong><br />
                        • {em('api_key_cause_1')}<br />
                        • {em('api_key_cause_2')}<br />
                        • {em('api_key_cause_3')}<br />
                        • {em('api_key_cause_4')}
                      </p>
                    </div>
                  )}
                  {error.type === 'service_busy' && (
                    <div className="mt-4 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <p className="text-xs md:text-sm font-mono text-amber-400/80 leading-relaxed">
                        <strong>{em('what_to_do')}</strong><br />
                        • {em('service_busy_do_1')}<br />
                        • {em('service_busy_do_2')}
                      </p>
                    </div>
                  )}
                  {error.type === 'rate_limit' && (
                    <div className="mt-4 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <p className="text-xs md:text-sm font-mono text-amber-400/80 leading-relaxed">
                        <strong>{em('what_to_do')}</strong><br />
                        • {em('rate_limit_do_1')}<br />
                        • {em('rate_limit_do_2')}
                      </p>
                    </div>
                  )}
                  {error.type === 'network' && (
                    <div className="mt-4 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                      <p className="text-xs md:text-sm font-mono text-yellow-400/80 leading-relaxed">
                        <strong>{em('what_to_check')}</strong><br />
                        • {em('network_check_1')}<br />
                        • {em('network_check_2')}<br />
                        • {em('network_check_3')}<br />
                        • {em('network_check_4')}
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
                  {em('fix_api_key')}
                </button>
              )}
              <button 
                onClick={onClose}
                className="flex-1 py-5 md:py-7 rounded-xl md:rounded-2xl bg-white/10 text-white border-2 border-white/20 font-black uppercase tracking-[0.25em] text-xs md:text-sm hover:bg-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <X size={16} className="md:w-5 md:h-5" />
                {em('close')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
