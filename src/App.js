import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import CredentialsForm from './components/CredentialsForm';
import './App.css';

function App() {
  const [error, setError] = useState(null);
  const { isAuthenticated, athlete, login, logout, loading } = useAuth();

  const handleCredentials = async (credentials) => {
    try {
      await login(credentials);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Strava TCX Converter</h1>
        {!isAuthenticated ? (
          <CredentialsForm onSubmit={handleCredentials} error={error} />
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