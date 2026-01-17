
import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode, useCallback } from 'react';

export interface ApiKeyErrorDetails {
  type: 'invalid_key' | 'missing_models' | 'missing_billing' | 'missing_grounding' | 'format_error' | 'unknown';
  missingModels?: string[];
  message: string;
  suggestions: string[];
}

interface SecurityContextType {
  isEngineLinked: boolean;
  activeKey: string;
  apiKeyStatus: 'none' | 'valid' | 'invalid' | 'testing';
  apiKeyError?: ApiKeyErrorDetails;
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
  const [apiKeyError, setApiKeyError] = useState<ApiKeyErrorDetails | undefined>(undefined);

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

  // Test API key by making a simple API call and checking required models
  const testApiKey = useCallback(async (): Promise<boolean> => {
    if (!activeKey || activeKey.length < 20) {
      setApiKeyStatus('invalid');
      setApiKeyError({
        type: 'format_error',
        message: 'API key format is incorrect',
        suggestions: [
          'API key should start with "AIzaSy..."',
          'API key should be at least 39 characters long',
          'Get your API key from https://aistudio.google.com/apikey'
        ]
      });
      return false;
    }

    // Check format
    if (!activeKey.startsWith('AIzaSy')) {
      setApiKeyStatus('invalid');
      setApiKeyError({
        type: 'format_error',
        message: 'API key format is incorrect',
        suggestions: [
          'API key should start with "AIzaSy..."',
          'Verify you copied the complete API key',
          'Get a new API key from https://aistudio.google.com/apikey'
        ]
      });
      return false;
    }

    setApiKeyStatus('testing');
    setApiKeyError(undefined);

    try {
      // Test 1: Check if API key is valid (list models)
      const modelsResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${activeKey}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!modelsResponse.ok) {
        const errorData = await modelsResponse.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || '';
        
        if (modelsResponse.status === 401 || modelsResponse.status === 403) {
          setApiKeyStatus('invalid');
          setApiKeyError({
            type: 'invalid_key',
            message: 'API key is invalid or expired',
            suggestions: [
              'Verify the API key is correct',
              'Check if the API key has been revoked',
              'Get a new API key from https://aistudio.google.com/apikey',
              'Ensure billing is enabled on your Google Cloud Project'
            ]
          });
          return false;
        }
        
        setApiKeyStatus('invalid');
        setApiKeyError({
          type: 'unknown',
          message: `API request failed: ${errorMessage || 'Unknown error'}`,
          suggestions: [
            'Check your internet connection',
            'Verify the API key is correct',
            'Try again in a few moments'
          ]
        });
        return false;
      }

      const modelsData = await modelsResponse.json();
      const availableModels = modelsData.models?.map((m: any) => m.name) || [];
      
      // Test 2: Check if required models are available
      const requiredModels = [
        'gemini-3-flash-preview',
        'gemini-3-pro-preview'
      ];
      
      const missingModels: string[] = [];
      requiredModels.forEach(modelName => {
        const hasModel = availableModels.some((name: string) => 
          name.includes(modelName)
        );
        if (!hasModel) {
          missingModels.push(modelName);
        }
      });
      
      if (missingModels.length > 0) {
        setApiKeyStatus('invalid');
        setApiKeyError({
          type: 'missing_models',
          message: `Required models are not available: ${missingModels.join(', ')}`,
          missingModels,
          suggestions: [
            'Enable Generative Language API in Google Cloud Console',
            `Enable these models: ${missingModels.join(', ')}`,
            'Go to: https://console.cloud.google.com/apis/library',
            'Search for "Generative Language API" and enable it'
          ]
        });
        return false;
      }
      
      // Test 3: Try generateContent to check billing and grounding
      try {
        const testResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${activeKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'test' }] }]
            })
          }
        );

        const responseData = await testResponse.json().catch(() => ({}));
        const errorMessage = responseData.error?.message || '';

        if (testResponse.ok || testResponse.status === 400) {
          // 400 might be request format issue, but key works
          setApiKeyStatus('valid');
          setApiKeyError(undefined);
          return true;
        } else if (testResponse.status === 401 || testResponse.status === 403) {
          setApiKeyStatus('invalid');
          setApiKeyError({
            type: 'invalid_key',
            message: 'API key is invalid or lacks permissions',
            suggestions: [
              'Verify the API key is correct',
              'Check API key permissions in Google Cloud Console',
              'Ensure the API key has access to Gemini API'
            ]
          });
          return false;
        } else if (testResponse.status === 402 || errorMessage.toLowerCase().includes('billing') || errorMessage.toLowerCase().includes('quota')) {
          setApiKeyStatus('invalid');
          setApiKeyError({
            type: 'missing_billing',
            message: 'Billing is not enabled or quota exceeded',
            suggestions: [
              'Enable billing on your Google Cloud Project',
              'Go to: https://console.cloud.google.com/billing',
              'Link a billing account to your project',
              'Check if you have exceeded your quota limits'
            ]
          });
          return false;
        } else {
          setApiKeyStatus('invalid');
          setApiKeyError({
            type: 'unknown',
            message: `API call failed: ${errorMessage || 'Unknown error'}`,
            suggestions: [
              'Check your internet connection',
              'Verify all required services are enabled',
              'Try again in a few moments'
            ]
          });
          return false;
        }
      } catch (testError: any) {
        // Network or other errors
        setApiKeyStatus('invalid');
        setApiKeyError({
          type: 'unknown',
          message: `Connection error: ${testError.message || 'Failed to connect'}`,
          suggestions: [
            'Check your internet connection',
            'Verify the API key is correct',
            'Try again in a few moments'
          ]
        });
        return false;
      }
    } catch (error: any) {
      setApiKeyStatus('invalid');
      setApiKeyError({
        type: 'unknown',
        message: `Error: ${error.message || 'Unknown error occurred'}`,
        suggestions: [
          'Check your internet connection',
          'Verify the API key is correct',
          'Try again in a few moments'
        ]
      });
      return false;
    }
  }, [activeKey]);

  const updateManualKey = useCallback((key: string) => {
    const trimmed = key.trim();
    setManualKey(trimmed);
    // Reset status when key changes
    setApiKeyStatus(trimmed.length >= 20 ? 'none' : 'invalid');
    setApiKeyError(undefined);
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
      apiKeyError,
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
