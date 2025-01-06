import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('stravaToken');
    if (token) {
      setIsAuthenticated(true);
      setAthlete(JSON.parse(localStorage.getItem('stravaAthlete')));
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) throw new Error('Invalid credentials');

      // Redirect to Strava auth
      window.location.href = `https://www.strava.com/oauth/authorize?client_id=${credentials.clientId}&redirect_uri=${window.location.origin}/auth/callback&response_type=code&scope=activity:read_all`;
    } catch (error) {
      throw new Error(error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('stravaToken');
    localStorage.removeItem('stravaAthlete');
    setIsAuthenticated(false);
    setAthlete(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, athlete, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 