import { useState, useEffect } from 'react';

const useStravaAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [athlete, setAthlete] = useState(null);
  const [needsCredentials, setNeedsCredentials] = useState(true);

  const clientId = process.env.REACT_APP_STRAVA_CLIENT_ID;
  const redirectUri = 'https://s2g.sunfishsystems.com/auth/callback';
  const scope = 'activity:read_all';

  const saveCredentials = async (clientSecret) => {
    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientSecret })
      });
      if (!response.ok) throw new Error('Failed to save credentials');
      setNeedsCredentials(false);
      return true;
    } catch (error) {
      console.error('Error saving credentials:', error);
      return false;
    }
  };

  const login = async (clientSecret) => {
    if (clientSecret) {
      const saved = await saveCredentials(clientSecret);
      if (!saved) return;
    }
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    window.location.href = authUrl;
  };

  useEffect(() => {
    // Check if we have a token in localStorage
    const token = localStorage.getItem('stravaToken');
    if (token) {
      setIsAuthenticated(true);
      setAthlete(JSON.parse(localStorage.getItem('stravaAthlete')));
    }
  }, []);

  useEffect(() => {
    // Check URL for token and athlete data
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const athleteData = urlParams.get('athlete');
    const error = urlParams.get('error');

    if (token && athleteData) {
      localStorage.setItem('stravaToken', token);
      localStorage.setItem('stravaAthlete', athleteData);
      setIsAuthenticated(true);
      setAthlete(JSON.parse(athleteData));
      // Clean up URL
      window.history.replaceState({}, document.title, '/');
    } else if (error) {
      console.error('Authentication failed');
      // Clean up URL
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('stravaToken');
    localStorage.removeItem('stravaAthlete');
    localStorage.removeItem('stravaClientSecret');
    setIsAuthenticated(false);
    setAthlete(null);
  };

  return {
    isAuthenticated,
    athlete,
    login,
    logout,
    needsCredentials
  };
};

export default useStravaAuth; 