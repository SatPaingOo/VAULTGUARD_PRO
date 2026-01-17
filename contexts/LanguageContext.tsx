
import React, { createContext, useContext, useState, ReactNode } from 'react';
import en from '../locales/en.ts';
import mm from '../locales/mm.ts';

type Language = 'en' | 'mm';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => any;
  currentLanguageName: string;
}

const translations: Record<Language, any> = { en, mm };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children?: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (path: string) => {
    return path.split('.').reduce((obj, key) => obj?.[key], translations[language]) || path;
  };

  const currentLanguageName = language === 'en' ? 'English' : 'Myanmar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, currentLanguageName }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
