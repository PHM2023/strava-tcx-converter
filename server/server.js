const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection (from previous code)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/strava-converter';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Serve static files from React app
app.use(express.static('../client/build'));

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 