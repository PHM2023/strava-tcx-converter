import { useState, useEffect } from 'react';
import { Utils, Stream, Decoder } from '@garmin/fitsdk';

export function useStravaAuth(addLog) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [athleteData, setAthleteData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const initiateAuth = async ({ clientId, clientSecret }) => {
    try {
      localStorage.setItem('stravaCredentials', JSON.stringify({ clientId, clientSecret }));
      addLog(`Initializing Strava authentication with Client ID: ${clientId}`);
      
      const redirectUri = encodeURIComponent('http://localhost:3000');
      const scope = 'read,activity:read,activity:read_all';
      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
      
      addLog(`Redirecting to Strava authorization page: ${authUrl}`);
      window.location.href = authUrl;
    } catch (err) {
      setError(err.message);
      addLog(`Authentication error: ${err.message}`, 'error');
    }
  };

  const handleAuthCallback = async (code) => {
    try {
      const credentialsStr = localStorage.getItem('stravaCredentials');
      if (!credentialsStr) {
        throw new Error('Missing credentials. Please try again.');
      }

      const credentials = JSON.parse(credentialsStr);
      addLog('Exchanging authorization code for access token...');
      
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenResponse.json();
      
      if (tokenData.access_token) {
        addLog('Successfully received access token', 'success');
        setAccessToken(tokenData.access_token);
        await fetchAthleteData(tokenData.access_token);
        await fetchActivities(tokenData.access_token);
        setIsAuthenticated(true);
        
        localStorage.removeItem('stravaCredentials');
      } else {
        throw new Error(tokenData.message || 'Failed to get access token');
      }
    } catch (err) {
      setError(err.message);
      addLog(`Authentication error: ${err.message}`, 'error');
    }
  };

  const fetchAthleteData = async (accessToken) => {
    const token = accessToken || sessionStorage.getItem('stravaAccessToken');
    if (!token) {
      throw new Error('No access token available');
    }

    addLog('Fetching athlete data...');
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setAthleteData(data);
    addLog('Successfully retrieved athlete data', 'success');
  };

  const fetchActivities = async (accessToken) => {
    const token = accessToken || sessionStorage.getItem('stravaAccessToken');
    if (!token) {
      throw new Error('No access token available');
    }

    addLog('Fetching recent activities...');
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=5', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setActivities(data);
    addLog('Successfully retrieved activities', 'success');
  };

  const downloadActivity = async (activityId, activityName) => {
    try {
      if (!accessToken) {
        throw new Error('No access token available');
      }

      addLog(`Fetching detailed data for activity: ${activityName}`);
      
      // Get detailed activity data
      const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=true`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch activity data: ${response.status}`);
      }

      const activityData = await response.json();

      // Get streams data
      const streamsResponse = await fetch(
        `https://www.strava.com/api/v3/activities/${activityId}/streams?` + 
        'keys=time,distance,latlng,altitude,velocity_smooth,heartrate,cadence,watts,temp,moving,grade_smooth&' +
        'key_by_type=true', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
      });

      if (!streamsResponse.ok) {
        throw new Error(`Failed to fetch streams data: ${streamsResponse.status}`);
      }

      const streamsData = await streamsResponse.json();

      // Combine all data
      const fullActivityData = {
        activity: activityData,
        streams: streamsData
      };

      // Create and download JSON file
      const jsonBlob = new Blob([JSON.stringify(fullActivityData, null, 2)], 
        { type: 'application/json' });
      const url = window.URL.createObjectURL(jsonBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activityName.replace(/[^a-z0-9]/gi, '_')}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addLog(`Successfully downloaded JSON data for: ${activityName}`, 'success');
    } catch (err) {
      setError(err.message);
      addLog(`Error downloading activity data: ${err.message}`, 'error');
    }
  };

  // Helper function to map Strava activity types to FIT sport types
  function mapStravaTypeToFitSport(stravaType) {
    const mapping = {
      'Run': 'running',
      'Ride': 'cycling',
      'Swim': 'swimming',
      'Hike': 'hiking',
      'Walk': 'walking',
      // Add more mappings as needed
    };
    return mapping[stravaType] || 'generic';
  }

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      handleAuthCallback(code);
    }
  }, []);

  return {
    isAuthenticated,
    athleteData,
    activities,
    initiateAuth,
    downloadActivity,
    error
  };
} 