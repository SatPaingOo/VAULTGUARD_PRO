import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { setupGlobalErrorHandlers } from './utils/errorSuppression';
import { AnimatePresence } from 'framer-motion';
import { useScanner } from './hooks/useScanner';
import { WebAudit } from './pages/WebAudit';
import { ResultsPage } from './pages/Results';
import { LandingPage } from './pages/LandingPage';
import { VaultAcademy } from './pages/VaultAcademy';
import { LanguageProvider } from './contexts/LanguageContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ErrorModal } from './components/ErrorModal';
import { ErrorBoundary } from './components/ErrorBoundary';

const ScannerApp = () => {
  const { 
    missionPhase, scanStatus, progress, telemetry, usage, 
    targetUrl, currentLevel, missionReport,
    recentFindings, dispatchedProbes, error, runMission, resetMission, clearError
  } = useScanner();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#020408] text-slate-100 font-['Fira_Code'] relative">
      <AnimatePresence mode="wait">
        {missionPhase === 'Briefing' && (
          <LandingPage 
            key="landing" 
            onInitiate={runMission} 
          />
        )}
        {missionPhase === 'Simulation' && (
          <WebAudit 
            phase={scanStatus} progress={progress} telemetry={telemetry} 
            targetUrl={targetUrl} report={missionReport} level={currentLevel} 
            recentFindings={recentFindings}
            dispatchedProbes={dispatchedProbes}
          />
        )}
        {missionPhase === 'Debriefing' && (
          <ResultsPage 
            missionReport={missionReport} usage={usage} 
            targetUrl={targetUrl} level={currentLevel} onReset={resetMission}
            telemetry={telemetry} dispatchedProbes={dispatchedProbes}
            missionDuration={missionDuration}
          />
        )}
      </AnimatePresence>
      
      {/* Error Modal */}
      {error && (
        <ErrorModal 
          error={error} 
          onClose={clearError}
          onFixApiKey={() => setIsAuthModalOpen(true)}
        />
      )}
      
      {/* API Key Modal */}
      <ApiKeyModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
};

const AppContent = () => {
  return (
    <Routes>
      {/* Vault Academy Route */}
      <Route path="/academy" element={<VaultAcademy />} />
      
      {/* Main Scanner Routes */}
      <Route path="/" element={<ScannerApp />} />
      
      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  useEffect(() => {
    const cleanup = setupGlobalErrorHandlers();
    return cleanup;
  }, []);
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SecurityProvider>
          <LanguageProvider>
            <AppContent />
          </LanguageProvider>
        </SecurityProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
