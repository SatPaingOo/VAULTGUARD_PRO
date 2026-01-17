import React from 'react';
import { Scan, Lock as LockIcon, Cpu as CpuChip, CheckCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const SandboxVisualizer: React.FC = () => {
  const { t } = useLanguage();
  const steps = ['s1', 's2', 's3', 's4'];
  const icons = [Scan, LockIcon, CpuChip, CheckCircle];

  return (
    <div className="w-full max-w-6xl px-4 flex flex-col gap-8 md:gap-12">
      <div className="flex flex-col items-center text-center gap-3 md:gap-4 mb-4 md:mb-8">
        <div className="px-4 py-1.5 md:px-6 md:py-2 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[10px] md:text-[12px] font-black text-[#00d4ff] uppercase tracking-[0.4em]">
           {t('labels.sandbox_title')}
        </div>
        <h2 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter">{t('labels.sandbox_desc')}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative">
        <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#00d4ff]/20 to-transparent -translate-y-1/2 z-0" />
        {steps.map((s, i) => {
          const Icon = icons[i];
          return (
            <div key={s} className="glass-panel p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-white/5 bg-black/40 relative z-10 flex flex-col gap-4 md:gap-6 group hover:bg-white/[0.02] transition-all">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-[#00d4ff]/10 flex items-center justify-center text-[#00d4ff] border border-[#00d4ff]/20 group-hover:scale-110 transition-transform">
                 <Icon className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div className="space-y-1 md:space-y-2">
                 <div className="text-[10px] md:text-[11px] font-black text-[#00d4ff] uppercase tracking-widest">{t(`sandbox_steps.${s}`)?.[0]}</div>
                 <p className="text-[11px] md:text-[12px] font-mono text-white/40 leading-relaxed uppercase">{t(`sandbox_steps.${s}`)?.[1]}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
