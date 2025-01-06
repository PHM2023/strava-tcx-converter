const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const axios = require('axios');
const Credentials = require('./models/credentials');

// Add this line to handle the deprecation warning
mongoose.set('strictQuery', false);
mongoose.set('debug', false);  // Disable debug logging
mongoose.set('strictPopulate', false);

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/strava-tcx-converter';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Define Conversion model
const Conversion = mongoose.model('Conversion', {
  userId: String,
  athleteName: String,
  activityId: String,
  activityName: String,
  convertedAt: Date,
  format: String
});

// Add after Conversion model definition
Conversion.collection.createIndex({ userId: 1, convertedAt: -1 });

// API Routes
app.post('/api/conversions', async (req, res) => {
  try {
    const conversion = new Conversion({
      ...req.body,
      convertedAt: new Date()
    });
    await conversion.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/conversions/:userId', async (req, res) => {
  try {
    const conversions = await Conversion.find({ 
      userId: req.params.userId 
    }).sort('-convertedAt');
    res.json(conversions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save credentials
app.post('/api/credentials', async (req, res) => {
  try {
    const { clientId, clientSecret } = req.body;
    
    // Validate with Strava before saving
    const authResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    });

    if (authResponse.data) {
      const credentials = new Credentials({
        clientId,
        clientSecret
      });
      await credentials.save();
      res.json({ success: true });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Handle Strava OAuth callback
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const credentials = await Credentials.findOne().sort('-createdAt');
    if (!credentials) {
      throw new Error('No credentials found');
    }

    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
      grant_type: 'authorization_code'
    });

    // Save tokens
    credentials.accessToken = tokenResponse.data.access_token;
    credentials.refreshToken = tokenResponse.data.refresh_token;
    credentials.tokenExpires = new Date(Date.now() + tokenResponse.data.expires_in * 1000);
    await credentials.save();

    res.redirect(`/?token=${tokenResponse.data.access_token}&athlete=${JSON.stringify(tokenResponse.data.athlete)}`);
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.redirect('/?error=auth_failed');
  }
});

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 