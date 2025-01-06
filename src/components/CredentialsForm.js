import React, { useState } from 'react';
import './CredentialsForm.css';

const CredentialsForm = ({ onSubmit, error }) => {
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSubmit(credentials);
  };

  return (
    <div className="credentials-form">
      <h2>Strava API Credentials</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Client ID:</label>
          <input
            type="text"
            value={credentials.clientId}
            onChange={(e) => setCredentials(prev => ({ ...prev, clientId: e.target.value }))}
            required
          />
        </div>
        <div className="form-group">
          <label>Client Secret:</label>
          <input
            type="password"
            value={credentials.clientSecret}
            onChange={(e) => setCredentials(prev => ({ ...prev, clientSecret: e.target.value }))}
            required
          />
        </div>
        <button type="submit" className="strava-btn">Connect with Strava</button>
      </form>
    </div>
  );
};

export default CredentialsForm; 