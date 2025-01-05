import React, { useState } from 'react';
import CredentialsForm from './components/CredentialsForm';
import AuthenticationLog from './components/AuthenticationLog';
import AthleteInfo from './components/AthleteInfo';
import JsonToFitConverter from './components/JsonToFitConverter';
import { useStravaAuth } from './hooks/useStravaAuth';
import './App.css';

function App() {
  const [logs, setLogs] = useState([]);
  const [showConverter, setShowConverter] = useState(false);
  const { 
    isAuthenticated,
    athleteData,
    activities,
    initiateAuth,
    downloadActivity,
    error
  } = useStravaAuth(addLog);

  function addLog(message, type = 'info') {
    setLogs(prev => [{
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }, ...prev]);
  }

  return (
    <div className="app-container">
      <nav className="app-nav">
        <button 
          className="nav-button"
          onClick={() => setShowConverter(!showConverter)}
        >
          {showConverter ? 'Back to Activities' : 'JSON to TCX Converter'}
        </button>
      </nav>

      <main className="main-content">
        {showConverter ? (
          <JsonToFitConverter />
        ) : (
          <>
            {!isAuthenticated && <CredentialsForm onSubmit={initiateAuth} />}
            {isAuthenticated && athleteData && (
              <AthleteInfo 
                athlete={athleteData}
                activities={activities}
                onDownloadActivity={downloadActivity}
              />
            )}
          </>
        )}
      </main>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <footer className="app-footer">
        <AuthenticationLog logs={logs} />
      </footer>
    </div>
  );
}

export default App; 