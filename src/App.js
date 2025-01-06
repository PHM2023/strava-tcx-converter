import React, { useState } from 'react';
import useStravaAuth from './hooks/useStravaAuth';
import CredentialsForm from './components/CredentialsForm';
import './App.css';

function App() {
  const [clientSecret, setClientSecret] = useState('');
  const { isAuthenticated, athlete, login, logout, needsCredentials } = useStravaAuth();

  const handleCredentials = ({ clientSecret }) => {
    setClientSecret(clientSecret);
    login(clientSecret);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Strava TCX Converter</h1>
        {!isAuthenticated ? (
          needsCredentials ? (
            <CredentialsForm 
              onSubmit={handleCredentials}
              clientId={process.env.REACT_APP_STRAVA_CLIENT_ID} 
            />
          ) : (
            <div>Authenticating...</div>
          )
        ) : (
          <div>
            <p>Welcome, {athlete?.firstname}</p>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App; 