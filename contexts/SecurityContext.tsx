
import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode, useCallback } from 'react';

interface SecurityContextType {
  isEngineLinked: boolean;
  activeKey: string;
  apiKeyStatus: 'none' | 'valid' | 'invalid' | 'testing';
  updateManualKey: (key: string) => void;
  refreshSecurity: () => void;
  testApiKey: () => Promise<boolean>;
  setApiKeyStatus: (status: 'none' | 'valid' | 'invalid' | 'testing') => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider = ({ children }: { children?: ReactNode }) => {
  const [keySelectionTimestamp, setKeySelectionTimestamp] = useState(Date.now());
  const [isSystemLinked, setIsSystemLinked] = useState(false);
  // API key stored only in React Context (in-memory), NOT in localStorage
  const [manualKey, setManualKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'none' | 'valid' | 'invalid' | 'testing'>('none');

  // Re-check system link whenever timestamp updates
  useEffect(() => {
    const checkStatus = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsSystemLinked(hasKey);
      } else {
        // Fallback check
        setIsSystemLinked(!!process.env.API_KEY && process.env.API_KEY.length > 10);
      }
    };
    checkStatus();
  }, [keySelectionTimestamp]);

  const activeKey = useMemo(() => {
    if (manualKey.length > 10) return manualKey;
    try {
      return process.env.API_KEY || "";
    } catch {
      return "";
    }
  }, [keySelectionTimestamp, manualKey]);

  const isEngineLinked = useMemo(() => {
    return isSystemLinked || activeKey.length > 10;
  }, [isSystemLinked, activeKey]);

  // Test API key by making a simple API call
  const testApiKey = useCallback(async (): Promise<boolean> => {
    if (!activeKey || activeKey.length < 20) {
      setApiKeyStatus('invalid');
      return false;
    }

    setApiKeyStatus('testing');
    try {
      // Test with a simple API call to verify key works
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${activeKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setApiKeyStatus('valid');
        return true;
      } else if (response.status === 401 || response.status === 403) {
        setApiKeyStatus('invalid');
        return false;
      } else {
        // Other errors might be temporary, but mark as invalid for now
        setApiKeyStatus('invalid');
        return false;
      }
    } catch (error: any) {
      setApiKeyStatus('invalid');
      return false;
    }
  }, [activeKey]);

  const updateManualKey = useCallback((key: string) => {
    const trimmed = key.trim();
    setManualKey(trimmed);
    // Reset status when key changes
    setApiKeyStatus(trimmed.length >= 20 ? 'none' : 'invalid');
    // No longer saving to localStorage - only React Context (in-memory)
    setKeySelectionTimestamp(Date.now());
  }, []);

  const refreshSecurity = useCallback(() => {
    setKeySelectionTimestamp(Date.now());
  }, []);

  // Auto-test API key when it changes (if it's long enough)
  useEffect(() => {
    if (activeKey && activeKey.length >= 20 && apiKeyStatus === 'none') {
      testApiKey();
    } else if (!activeKey || activeKey.length < 20) {
      setApiKeyStatus('none');
    }
  }, [activeKey, apiKeyStatus, testApiKey]);

  return (
    <SecurityContext.Provider value={{ 
      isEngineLinked,
      activeKey,
      apiKeyStatus,
      updateManualKey,
      refreshSecurity,
      testApiKey,
      setApiKeyStatus
    }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) throw new Error('useSecurity must be used within a SecurityProvider');
  return context;
};
