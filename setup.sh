#!/bin/bash

echo "Checking required packages..."
REQUIRED_PACKAGES="nginx certbot python3-certbot-nginx"
for package in $REQUIRED_PACKAGES; do
    if ! dpkg -l | grep -q "^ii  $package "; then
        echo "Installing $package..."
        apt-get install -y $package
    fi
done

echo "Setting up Strava TCX Converter..."

# Ensure we're in the correct directory
cd /root/strava-tcx-converter

# Clean up any previous build and logs
echo "Cleaning up previous build and logs..."
rm -rf build
rm -rf node_modules
sudo truncate -s 0 /var/log/nginx/error.log
sudo truncate -s 0 /var/log/nginx/access.log

# Create necessary files
echo "Creating configuration files..."

# Create webpack.config.js
cat > webpack.config.js << 'EOL'
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Load environment variables
const env = dotenv.config().parsed || {};
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new webpack.DefinePlugin(envKeys)
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
EOL

# Create .babelrc
cat > .babelrc << 'EOL'
{
  "presets": ["@babel/preset-env", "@babel/preset-react"]
}
EOL

# Create React files
echo "Creating React files..."
mkdir -p src
mkdir -p src/hooks

# Create src/index.js
cat > src/index.js << 'EOL'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOL

# Create src/index.css
cat > src/index.css << 'EOL'
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
EOL

# Create src/hooks/useStravaAuth.js
cat > src/hooks/useStravaAuth.js << 'EOL'
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

  useEffect(() => {
    // Check if we have a token in localStorage
    const token = localStorage.getItem('stravaToken');
    if (token) {
      setIsAuthenticated(true);
      setAthlete(JSON.parse(localStorage.getItem('stravaAthlete')));
    }
  }, []);

  useEffect(() => {
    // Check for auth code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // Handle the auth code
      console.log('Auth code received:', code);
      // TODO: Exchange code for token
    }
  }, []);

  const login = () => {
    console.log('Login clicked, clientId:', clientId);
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    console.log('Auth URL:', authUrl);
    window.location.href = authUrl;
  };

  const logout = () => {
    localStorage.removeItem('stravaToken');
    localStorage.removeItem('stravaAthlete');
    setIsAuthenticated(false);
    setAthlete(null);
  };

  return {
    isAuthenticated,
    athlete,
    login,
    logout
  };
};

export default useStravaAuth;
EOL

# Create src/App.js with Strava auth
cat > src/App.js << 'EOL'
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
          <button onClick={login} className="strava-btn">
            Connect with Strava
          </button>
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
EOL

# Create src/App.css with Strava button styling
cat > src/App.css << 'EOL'
.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

.strava-btn {
  background-color: #fc4c02;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.strava-btn:hover {
  background-color: #e34402;
}
EOL

# Create .env file with actual Strava client ID
cat > .env << 'EOL'
REACT_APP_STRAVA_CLIENT_ID=144379
EOL

# Create public/index.html
mkdir -p public
cat > public/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Strava TCX Converter</title>
</head>
<body>
    <div id="root"></div>
    <script src="/bundle.js"></script>
</body>
</html>
EOL

# Create package.json
cat > package.json << 'EOL'
{
  "name": "strava-tcx-converter",
  "version": "1.0.0",
  "scripts": {
    "start": "webpack serve --mode development --open",
    "build": "webpack --mode production"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@babel/core": "^7.15.0",
    "@babel/preset-env": "^7.15.0",
    "@babel/preset-react": "^7.14.5",
    "babel-loader": "^8.2.2",
    "css-loader": "^6.2.0",
    "html-webpack-plugin": "^5.5.3",
    "style-loader": "^3.2.1",
    "webpack": "^5.50.0",
    "webpack-cli": "^4.8.0",
    "webpack-dev-server": "^4.0.0",
    "dotenv": "^16.0.0"
  }
}
EOL

# Install dependencies and build React app
echo "Installing dependencies..."
npm install

echo "Building React application..."
npm run build

# Verify build directory exists
if [ ! -d "build" ]; then
    echo "Error: Build directory was not created!"
    exit 1
fi

# Create server files
echo "Creating server files..."

# Update server.js
cat > server/server.js << 'EOL'
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const axios = require('axios');

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

// Add Credentials model
const Credentials = mongoose.model('Credentials', {
  clientId: String,
  clientSecret: String,
  createdAt: Date
});

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

// Add this route before the catch-all route
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  console.log('Received auth code:', code);
  // TODO: Exchange code for token
  res.redirect('/');
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
EOL

# Add server dependencies installation
echo "Installing server dependencies..."
cd server
cat > package.json << 'EOL'
{
  "dependencies": {
    "express": "^4.17.1",
    "mongoose": "^6.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "axios": "^1.6.0"
  }
}
EOL
npm install
cd ..

# Add server environment variables
cat > server/.env << 'EOL'
MONGODB_URI=mongodb://127.0.0.1:27017/strava-tcx-converter
PORT=5000
STRAVA_CLIENT_ID=144379
EOL

# Set up web directory and permissions
echo "Setting up web directory..."
sudo mkdir -p /var/www/strava-tcx-converter
sudo cp -r build/* /var/www/strava-tcx-converter/
sudo chown -R www-data:www-data /var/www/strava-tcx-converter
sudo chmod -R 755 /var/www/strava-tcx-converter

# Update Nginx configuration
cat > /etc/nginx/sites-available/s2g.sunfishsystems.com << 'EOL'
server {
    listen 80;
    server_name s2g.sunfishsystems.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name s2g.sunfishsystems.com;

    # Enhanced SSL configuration
    ssl_certificate /etc/letsencrypt/live/s2g.sunfishsystems.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/s2g.sunfishsystems.com/privkey.pem;
    
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # HSTS (uncomment if you're sure)
    # add_header Strict-Transport-Security "max-age=63072000" always;
    
    root /var/www/strava-tcx-converter;
    index index.html;

    # Handle favicon requests
    location = /favicon.ico {
        access_log off;
        log_not_found off;
        return 404;
    }

    # Route /auth/callback to Node.js server
    location /auth/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API routes
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Handle all other routes
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
EOL

# Check and configure SSL
echo "Checking SSL certificate..."
if ! [ -f "/etc/letsencrypt/live/s2g.sunfishsystems.com/fullchain.pem" ]; then
    echo "Obtaining SSL certificate..."
    certbot --nginx -d s2g.sunfishsystems.com --non-interactive --agree-tos --email your-email@domain.com
fi

# Add automatic renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Configure PM2 with error handling
echo "Configuring PM2..."
pm2 flush
pm2 delete strava-tcx-converter 2>/dev/null || true
pm2 start server/server.js \
    --name strava-tcx-converter \
    --max-memory-restart 200M \
    --restart-delay 3000 \
    --max-restarts 10

# Configure PM2 log rotation
echo "Setting up PM2 log rotation..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 5
pm2 set pm2-logrotate:compress true

pm2 save

# Restart Nginx with new configuration
echo "Restarting Nginx..."
sudo nginx -t && sudo systemctl restart nginx

echo "Setup complete! Please check the application at https://s2g.sunfishsystems.com" 

# Create src/components directory and CredentialsForm
mkdir -p src/components
cat > src/components/CredentialsForm.js << 'EOL'
import React, { useState } from 'react';
import './CredentialsForm.css';

const CredentialsForm = ({ onSubmit, clientId }) => {
  const [clientSecret, setClientSecret] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ clientSecret });
  };

  return (
    <div className="credentials-form">
      <h2>Strava API Credentials</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Client ID:</label>
          <input type="text" value={clientId} disabled />
        </div>
        <div className="form-group">
          <label>Client Secret:</label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="strava-btn">Connect with Strava</button>
      </form>
    </div>
  );
};

export default CredentialsForm;
EOL

# Create CredentialsForm.css
cat > src/components/CredentialsForm.css << 'EOL'
.credentials-form {
  background: rgba(255, 255, 255, 0.1);
  padding: 2rem;
  border-radius: 8px;
  max-width: 400px;
  width: 100%;
}

.form-group {
  margin-bottom: 1rem;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
}

.form-group input:disabled {
  background: rgba(255, 255, 255, 0.5);
}
EOL

# Update .env to remove client secret
cat > .env << 'EOL'
REACT_APP_STRAVA_CLIENT_ID=144379
EOL

# Update server/.env to remove client secret
cat > server/.env << 'EOL'
MONGODB_URI=mongodb://127.0.0.1:27017/strava-tcx-converter
PORT=5000
STRAVA_CLIENT_ID=144379
EOL 