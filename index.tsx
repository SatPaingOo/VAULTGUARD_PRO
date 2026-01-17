import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { setupGlobalErrorHandlers } from './utils/errorSuppression';
import { AnimatePresence } from 'framer-motion';
import { useScanner } from './hooks/useScanner';
import { WebAudit } from './pages/WebAudit';
import { ResultsPage } from './pages/Results';
import { LandingPage } from './pages/LandingPage';
import { LanguageProvider } from './contexts/LanguageContext';
import { SecurityProvider } from './contexts/SecurityContext';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ErrorModal } from './components/ErrorModal';
import { ErrorBoundary } from './components/ErrorBoundary';

const AppContent = () => {
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
            key="audit" phase={scanStatus} progress={progress} telemetry={telemetry} 
            targetUrl={targetUrl} report={missionReport} level={currentLevel} 
            recentFindings={recentFindings}
            dispatchedProbes={dispatchedProbes}
          />
        )}
        {missionPhase === 'Debriefing' && (
          <ResultsPage 
            key="results" missionReport={missionReport} usage={usage} 
            targetUrl={targetUrl} level={currentLevel} onReset={resetMission}
            telemetry={telemetry} dispatchedProbes={dispatchedProbes}
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

const App = () => {
  useEffect(() => {
    const cleanup = setupGlobalErrorHandlers();
    return cleanup;
  }, []);
  
  return (
    <ErrorBoundary>
  <SecurityProvider>
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  </SecurityProvider>
    </ErrorBoundary>
);
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
