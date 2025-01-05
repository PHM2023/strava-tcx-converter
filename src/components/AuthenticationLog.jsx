import React from 'react';
import './AuthenticationLog.css';

function AuthenticationLog({ logs }) {
  return (
    <div className="log-section">
      <h3>Authentication Log</h3>
      <div id="log-entries">
        {logs.map((log, index) => (
          <div 
            key={`${log.id}-${index}`} 
            className={`log-entry log-${log.type}`}
          >
            [{log.timestamp}] {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AuthenticationLog; 