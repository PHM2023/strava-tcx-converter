const mongoose = require('mongoose');

const CredentialsSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true
  },
  clientSecret: {
    type: String,
    required: true
  },
  accessToken: String,
  refreshToken: String,
  tokenExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Credentials', CredentialsSchema); 