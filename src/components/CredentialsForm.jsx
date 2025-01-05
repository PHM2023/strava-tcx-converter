import { useState } from 'react';
import './CredentialsForm.css';

function CredentialsForm({ onSubmit }) {
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(credentials);
  };

  return (
    <form className="credentials-form" onSubmit={handleSubmit}>
      <h2>Connect with Strava</h2>
      <div className="input-group">
        <label htmlFor="client-id">Client ID:</label>
        <input
          type="text"
          id="client-id"
          value={credentials.clientId}
          onChange={(e) => setCredentials(prev => ({
            ...prev,
            clientId: e.target.value
          }))}
          placeholder="Enter your Strava Client ID"
          required
        />
      </div>
      <div className="input-group">
        <label htmlFor="client-secret">Client Secret:</label>
        <input
          type="password"
          id="client-secret"
          value={credentials.clientSecret}
          onChange={(e) => setCredentials(prev => ({
            ...prev,
            clientSecret: e.target.value
          }))}
          placeholder="Enter your Strava Client Secret"
          required
        />
      </div>
      <button type="submit">Connect to Strava</button>
    </form>
  );
}

export default CredentialsForm; 