import React from 'react';
import { motion } from 'framer-motion';

interface ScanningLineProps {
  color: string;
}

export const ScanningLine: React.FC<ScanningLineProps> = ({ color }) => (
  <motion.div 
    initial={{ top: '-10%' }}
    animate={{ top: '110%' }}
    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    className="absolute left-0 w-full h-[2px] md:h-[3px] z-10 opacity-60 blur-sm"
    style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}` }}
  />
);
