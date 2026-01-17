
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Binary, ChevronRight, Terminal, Cpu } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ScanLevel } from '../services/geminiService';

interface AttackerCodeProps {
  commands: string[];
  level?: ScanLevel;
  targetUrl?: string;
  minimal?: boolean;
}

const GENERIC_COMMANDS = [
  "nmap -sV -sC -T4 [TARGET]",
  "gobuster dir -u [TARGET] -w common.txt",
  "nikto -h [TARGET] -ssl",
  "ffuf -u [TARGET]/FUZZ -w wordlist.txt",
  "sqlmap -u [TARGET] --batch --banner",
  "subfinder -d [DOMAIN] -silent",
  "nuclei -t vulnerabilities/ -u [TARGET]"
];

const TypewriterText = ({ text, speed = 15 }: { text: string; speed?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    setDisplayedText("");
    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return <span>{displayedText}</span>;
};

export const AttackerCode = ({ commands, level = 'STANDARD', targetUrl = '', minimal = false }: AttackerCodeProps) => {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const domain = useMemo(() => {
    try {
      return new URL(targetUrl).hostname;
    } catch {
      return targetUrl;
    }
  }, [targetUrl]);

  const activeCommands = useMemo(() => {
    const rawList = commands.length > 0 ? commands : GENERIC_COMMANDS;
    return rawList.map(cmd => 
      cmd.replace(/\[TARGET\]|target_url|target_ip/gi, targetUrl || 'localhost')
         .replace(/\[DOMAIN\]|target_domain/gi, domain || 'local.host')
    );
  }, [commands, targetUrl, domain]);

  const cycleSpeed = useMemo(() => {
    if (level === 'FAST') return 2500;
    if (level === 'DEEP') return 6500;
    return 4500;
  }, [level]);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextCmd = activeCommands[currentIndex];
      if (nextCmd) {
        setHistory(prev => [...prev.slice(-6), nextCmd]);
      }
      setCurrentIndex(prev => (prev + 1) % activeCommands.length);
    }, cycleSpeed);
    return () => clearInterval(interval);
  }, [activeCommands, currentIndex, cycleSpeed]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const currentCommand = activeCommands[currentIndex] || "AWAITING_MISSION_PAYLOAD...";

  return (
    <div className={`relative bg-black/60 border border-white/5 rounded-lg sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full backdrop-blur-md ${minimal ? 'p-0' : 'p-4 sm:p-6'}`}>
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className={`flex justify-between items-center border-b border-white/5 ${minimal ? 'p-1.5 sm:p-3 px-3 sm:px-4 bg-white/5' : 'mb-4 sm:mb-6 pb-2 sm:pb-4'}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <Terminal size={10} className="text-red-500 sm:w-3 sm:h-3" />
            <div className="flex flex-col">
               <span className="text-[9px] sm:text-[11px] font-black text-white/50 uppercase tracking-widest">{t('labels.command_buffer')}</span>
            </div>
          </div>
          <motion.div 
            animate={{ opacity: [1, 0.4, 1] }} 
            transition={{ duration: 1, repeat: Infinity }}
            className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" 
          />
        </div>

        {/* Console Buffer */}
        <div 
          ref={scrollRef}
          className={`flex-1 font-mono terminal-scroll overflow-y-auto space-y-1 sm:space-y-2 pr-1 sm:pr-2 py-1.5 sm:py-2 ${minimal ? 'px-3 sm:px-4' : ''}`}
        >
          <AnimatePresence>
            {history.map((cmd, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 0.2, x: 0 }}
                key={`cmd-${idx}`}
                className="flex gap-1.5 sm:gap-2 text-white/50 text-[9px] sm:text-[11px] leading-tight"
              >
                <span className="text-red-500 opacity-40 font-black">$</span>
                <span className="truncate">{cmd}</span>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <div className="flex gap-2 sm:gap-3 text-red-500/80 font-bold bg-red-500/5 p-2 sm:p-4 rounded-lg sm:rounded-xl border border-red-500/10 mt-1 sm:mt-2">
            <ChevronRight size={10} className="flex-shrink-0 mt-0.5 sm:w-3 sm:h-3" />
            <div className="flex-1 break-all text-[9px] sm:text-[11px] uppercase font-black tracking-tight leading-snug">
              <TypewriterText text={currentCommand} speed={25} />
              <motion.span 
                animate={{ opacity: [1, 0, 1] }} 
                transition={{ duration: 0.6, repeat: Infinity }}
                className="inline-block w-1 sm:w-1.5 h-2 sm:h-3 bg-red-500 ml-0.5 sm:ml-1 translate-y-0.5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
