
import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode, useCallback, useRef } from 'react';
import { API_KEY_CONSTANTS } from '../constants';

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
  testApiKey: (keyOverride?: string) => Promise<boolean>;
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
  
  // OPTIMIZATION: Cache for API key validation results (5 minutes TTL)
  const validationCache = useRef<Map<string, { 
    isValid: boolean; 
    timestamp: number; 
    ttl: number;
    status: 'valid' | 'invalid';
    error?: ApiKeyErrorDetails;
  }>>(new Map());
  
  const VALIDATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Re-check system link whenever timestamp updates
  useEffect(() => {
    const checkStatus = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsSystemLinked(hasKey);
      } else {
        // Fallback check
        setIsSystemLinked(!!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > API_KEY_CONSTANTS.MIN_KEY_LENGTH_BASIC);
      }
    };
    checkStatus();
  }, [keySelectionTimestamp]);

  const activeKey = useMemo(() => {
    if (manualKey.length > API_KEY_CONSTANTS.MIN_KEY_LENGTH_BASIC) return manualKey;
    try {
      return process.env.GEMINI_API_KEY || "";
    } catch {
      return "";
    }
  }, [keySelectionTimestamp, manualKey]);

  const isEngineLinked = useMemo(() => {
    return isSystemLinked || activeKey.length > API_KEY_CONSTANTS.MIN_KEY_LENGTH_BASIC;
  }, [isSystemLinked, activeKey]);

  // OPTIMIZED: Test API key with caching and reduced API calls
  // Only uses 1 API call (list models) instead of 2 (list + generateContent test)
  // When keyOverride is provided, validates that key directly (avoids state-timing issues in modal).
  const testApiKey = useCallback(async (keyOverride?: string): Promise<boolean> => {
    const keyToValidate = (keyOverride !== undefined && keyOverride !== '' ? keyOverride.trim() : activeKey) || '';
    if (!keyToValidate || keyToValidate.length < API_KEY_CONSTANTS.MIN_KEY_LENGTH) {
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
    if (!keyToValidate.startsWith('AIzaSy')) {
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

    // OPTIMIZATION: Check cache first
    const cacheKey = keyToValidate.substring(0, 20); // Use first 20 chars as cache key
    const cached = validationCache.current.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      // Use cached result
      setApiKeyStatus(cached.status);
      setApiKeyError(cached.error);
      return cached.isValid;
    }

    setApiKeyStatus('testing');
    setApiKeyError(undefined);

    try {
      // OPTIMIZED: Only check models list (1 API call instead of 2)
      // Skip generateContent test to save API quota
      const modelsResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${keyToValidate}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!modelsResponse.ok) {
        const errorData = await modelsResponse.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || '';
        
        let errorDetails: ApiKeyErrorDetails;
        
        if (modelsResponse.status === 401 || modelsResponse.status === 403) {
          errorDetails = {
            type: 'invalid_key',
            message: 'API key is invalid or expired',
            suggestions: [
              'Verify the API key is correct',
              'Check if the API key has been revoked',
              'Get a new API key from https://aistudio.google.com/apikey',
              'Ensure billing is enabled on your Google Cloud Project'
            ]
          };
        } else if (modelsResponse.status === 402 || errorMessage.toLowerCase().includes('billing') || errorMessage.toLowerCase().includes('quota')) {
          errorDetails = {
            type: 'missing_billing',
            message: 'Billing is not enabled or quota exceeded',
            suggestions: [
              'Enable billing on your Google Cloud Project',
              'Go to: https://console.cloud.google.com/billing',
              'Link a billing account to your project',
              'Check if you have exceeded your quota limits'
            ]
          };
        } else {
          errorDetails = {
            type: 'unknown',
            message: `API request failed: ${errorMessage || 'Unknown error'}`,
            suggestions: [
              'Check your internet connection',
              'Verify the API key is correct',
              'Try again in a few moments'
            ]
          };
        }
        
        setApiKeyStatus('invalid');
        setApiKeyError(errorDetails);
        
        // Cache invalid result
        validationCache.current.set(cacheKey, {
          isValid: false,
          timestamp: Date.now(),
          ttl: VALIDATION_CACHE_TTL,
          status: 'invalid',
          error: errorDetails
        });
        
        return false;
      }

      const modelsData = await modelsResponse.json();
      const availableModels = modelsData.models?.map((m: any) => m.name) || [];
      
      // Check if required models are available
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
        const errorDetails: ApiKeyErrorDetails = {
          type: 'missing_models',
          message: `Required models are not available: ${missingModels.join(', ')}`,
          missingModels,
          suggestions: [
            'Enable Generative Language API/Gemini API in Google Cloud Console',
            `Enable these models: ${missingModels.join(', ')}`,
            'Go to: https://console.cloud.google.com/apis/library',
            'Search for "Generative Language API/Gemini API" and enable it'
          ]
        };
        
        setApiKeyStatus('invalid');
        setApiKeyError(errorDetails);
        
        // Cache invalid result
        validationCache.current.set(cacheKey, {
          isValid: false,
          timestamp: Date.now(),
          ttl: VALIDATION_CACHE_TTL,
          status: 'invalid',
          error: errorDetails
        });
        
        return false;
      }
      
      // OPTIMIZED: Skip generateContent test - models list check is sufficient
      // This saves 1 API call per validation (50% reduction)
      setApiKeyStatus('valid');
      setApiKeyError(undefined);
      
      // Cache valid result
      validationCache.current.set(cacheKey, {
        isValid: true,
        timestamp: Date.now(),
        ttl: VALIDATION_CACHE_TTL,
        status: 'valid'
      });
      
      return true;
    } catch (error: any) {
      const errorDetails: ApiKeyErrorDetails = {
        type: 'unknown',
        message: `Error: ${error.message || 'Unknown error occurred'}`,
        suggestions: [
          'Check your internet connection',
          'Verify the API key is correct',
          'Try again in a few moments'
        ]
      };
      
      setApiKeyStatus('invalid');
      setApiKeyError(errorDetails);
      
      // Cache invalid result
      validationCache.current.set(cacheKey, {
        isValid: false,
        timestamp: Date.now(),
        ttl: VALIDATION_CACHE_TTL,
        status: 'invalid',
        error: errorDetails
      });
      
      return false;
    }
  }, [activeKey]);

  const updateManualKey = useCallback((key: string) => {
    const trimmed = key.trim();
    setManualKey(trimmed);
    // Reset status when key changes
    setApiKeyStatus(trimmed.length >= API_KEY_CONSTANTS.MIN_KEY_LENGTH ? 'none' : 'invalid');
    setApiKeyError(undefined);
    // No longer saving to localStorage - only React Context (in-memory)
    setKeySelectionTimestamp(Date.now());
  }, []);

  const refreshSecurity = useCallback(() => {
    setKeySelectionTimestamp(Date.now());
  }, []);

  // OPTIMIZATION: Auto-test disabled to save API quota
  // User must manually test via "Test" button in ApiKeyModal
  // This prevents unnecessary API calls when key changes
  useEffect(() => {
    // Only reset status if key is too short, don't auto-test
    if (!activeKey || activeKey.length < API_KEY_CONSTANTS.MIN_KEY_LENGTH) {
      setApiKeyStatus('none');
    }
    // Removed auto-test to save API quota - user must manually test
  }, [activeKey]);

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
