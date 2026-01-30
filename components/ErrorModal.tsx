import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, X, KeyRound, Lightbulb } from 'lucide-react';
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

  const hasTips = ['api_key', 'rate_limit', 'service_busy', 'network'].includes(error.type);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="error-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#020408]/95 backdrop-blur-2xl"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg glass-panel rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_48px_rgba(0,0,0,0.5),0_0_80px_rgba(239,68,68,0.08)]"
        >
          {/* Left edge accent — tactical style */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--accent-red)]/90 via-[var(--accent-red)]/50 to-transparent" />

          <div className="relative p-6 md:p-8 pl-7 md:pl-9">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-4 min-w-0">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/25 flex items-center justify-center shadow-[0_0_20px_rgba(255,77,77,0.15)]">
                  <AlertOctagon size={22} className="text-[var(--accent-red)]" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-black text-white tracking-tight">
                    {em('mission_error')}
                  </h3>
                  <p className="text-[10px] md:text-xs font-mono text-white/35 uppercase tracking-[0.2em] mt-1">
                    {labels.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-2.5 rounded-xl text-white/35 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Message block */}
            <div className="rounded-xl md:rounded-2xl bg-black/40 border border-white/5 p-4 md:p-5 mb-4">
              <h4 className="text-xs font-bold text-[var(--accent-red)]/95 uppercase tracking-wider mb-2">
                {labels.title}
              </h4>
              <p className="text-[13px] md:text-sm font-mono text-white/85 leading-relaxed whitespace-pre-line break-words">
                {error.message}
              </p>
            </div>

            {/* Tips block */}
            {hasTips && (
              <div className="rounded-xl md:rounded-2xl bg-[var(--accent-blue)]/5 border border-[var(--accent-blue)]/10 p-4 md:p-5 mb-6">
                <div className="flex items-center gap-2 mb-2.5">
                  <Lightbulb size={14} className="text-[var(--accent-blue)] shrink-0" strokeWidth={2} />
                  <span className="text-[10px] md:text-xs font-bold text-[var(--accent-blue)] uppercase tracking-[0.15em]">
                    {isApiKeyError ? em('possible_causes') : em('what_to_do')}
                  </span>
                </div>
                <ul className="space-y-1 text-[12px] md:text-sm font-mono text-white/65 leading-relaxed">
                  {isApiKeyError && (
                    <>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('api_key_cause_1')}</li>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('api_key_cause_2')}</li>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('api_key_cause_3')}</li>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('api_key_cause_4')}</li>
                    </>
                  )}
                  {error.type === 'service_busy' && (
                    <>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('service_busy_do_1')}</li>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('service_busy_do_2')}</li>
                    </>
                  )}
                  {error.type === 'rate_limit' && (
                    <>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('rate_limit_do_1')}</li>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('rate_limit_do_2')}</li>
                    </>
                  )}
                  {error.type === 'network' && (
                    <>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('network_check_1')}</li>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('network_check_2')}</li>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('network_check_3')}</li>
                      <li className="flex gap-2"><span className="text-white/25">—</span>{em('network_check_4')}</li>
                    </>
                  )}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 md:py-4 rounded-xl border border-white/10 bg-white/5 text-white/90 font-bold text-[10px] md:text-xs uppercase tracking-widest hover:bg-white/10 hover:border-white/15 transition-all flex items-center justify-center gap-2"
              >
                <X size={16} strokeWidth={2} />
                {em('close')}
              </button>
              {isApiKeyError && (
                <button
                  onClick={() => { onFixApiKey(); onClose(); }}
                  className="flex-1 py-3.5 md:py-4 rounded-xl bg-[var(--accent-red)] text-white font-bold text-[10px] md:text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,77,77,0.25)]"
                >
                  <KeyRound size={16} strokeWidth={2} />
                  {em('fix_api_key')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
