const express = require('express');
const cors = require('cors');
const promBundle = require('express-prom-bundle');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const YAML = require('yaml');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');

const app = express();
const port = 8000;

// Service URLs
const serviceUrls = {
  llm: process.env.LLM_SERVICE_URL || 'http://localhost:8003',
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:8002',
  user: process.env.USER_SERVICE_URL || 'http://localhost:8001',
  game: process.env.GAME_SERVICE_URL || 'http://localhost:8004'
};

// CORS setup
const publicCors = cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'OPTIONS', 'DELETE', 'PUT'] });

app.use(express.json());
app.use(helmet.hidePoweredBy());
app.use(promBundle({ includeMethod: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Helper function for forwarding requests using fetch
const forwardRequest = async (service, endpoint, req, res) => {
  try {
    const response = await fetch(`${serviceUrls[service]}${endpoint}`, {
      method: req.method,
      headers: {
        Authorization: req.headers.authorization,
        'Content-Type': 'application/json',
        Origin: 'http://localhost:8000',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });
    // Get the response body (if any) and content type
    const contentType = response.headers.get('Content-Type');
    let responseBody;
    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }
    
    // Set the status code from the downstream service response
    res.status(response.status);
    // Send the response body as-is
    if (responseBody) {
      if (contentType?.includes('application/json')) {
        res.json(responseBody); // Send JSON (e.g., token or error message)
      } else {
        res.send(responseBody); // Send text if not JSON
      }
    } else {
      res.send(); // No body, just send the status
    }
  } catch (error) {
    console.log(`Error forwarding request to ${service}${endpoint}:`, error.message);
    res.status(500).json({ error: 'Hubo un problema al procesar la solicitud' });
  }
};

// Authentication
app.use('/login', publicCors);
app.post('/login', (req, res) => forwardRequest('auth', '/auth/login', req, res));

// User Management
app.use('/adduser', publicCors);
app.post('/adduser', (req, res) => forwardRequest('auth', '/auth/register', req, res));

app.use('/users', publicCors);
app.post('/users', (req, res) => forwardRequest('user', '/users', req, res));

app.get('/users', (req, res) => {
  const { id } = req.query;
  const endpoint = id ? `/users?id=${id}` : '/users';
  forwardRequest('user', endpoint, req, res);
});

app.get('/users/:username', (req, res) => {
  forwardRequest('user', `/users/${req.params.username}`, req, res);
});

app.patch('/users/:username', (req, res) => {
  forwardRequest('user', `/users/${req.params.username}`, req, res);
});

app.delete('/users/:username', (req, res) => {
  forwardRequest('user', `/users/${req.params.username}`, req, res);
});

// User Management
app.use('/setup2fa', publicCors);
app.post('/setup2fa', (req, res) => forwardRequest('auth', '/auth/setup2fa', req, res));

app.use('/verify2fa', publicCors);
app.post('/verify2fa', (req, res) => forwardRequest('auth', '/auth/verify2fa', req, res));

app.use('/check2fa', publicCors);
app.get('/check2fa', (req, res) => forwardRequest('auth', '/auth/check2fa', req, res));

// LLM Question Handling
app.use('/askllm', publicCors);
app.post('/askllm', (req, res) => forwardRequest('llm', '/askllm', req, res));

// Game Service Routes
app.use('/game', publicCors);
app.get('/game/:subject/:totalQuestions/:numberOptions', async (req, res) => {
  try {
    const response = await fetch(
        `${serviceUrls.game}/game/${req.params.subject}/${req.params.totalQuestions}/${req.params.numberOptions}`,
        {
          headers: { Origin: 'http://localhost:8000' },
        }
    );

    if (!response.ok) {
      return res.status(response.status === 404 ? 404 : 500).json({
        error: 'Hubo un problema al obtener las preguntas',
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Hubo un problema al obtener las preguntas' });
  }
});

// Statistics Routes
['/statistics/subject/:subject', '/statistics/global', '/leaderboard'].forEach(route => {
  app.use(route, publicCors);
  app.get(route, async (req, res) => {
    // Extract the error message before the try block
    let errorMessage;

    if (req.path.includes('/statistics/subject/')) {
      errorMessage = 'Error retrieving subject statistics';
    } else if (req.path.includes('/statistics/global')) {
      errorMessage = 'Error retrieving global statistics';
    } else if (req.path.includes('/leaderboard')) {
      errorMessage = 'Error retrieving leaderboard';
    }

    try {
      const response = await fetch(`${serviceUrls.game}${req.path}`, {
        headers: {
          Authorization: req.headers.authorization,
          Origin: 'http://localhost:8000',
        },
      });

      if (!response.ok) {
        return res.status(500).json({
          error: errorMessage,
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({
        error: errorMessage,
      });
    }
  });
});

// Username handling
app.use('/token/username', publicCors);

app.get('/token/username', async (req, res) => {
  try {
      const token = req.headers.authorization;
      if (!token) {
          return res.status(401).json({ error: "Unauthorized" });
      }

      const response = await fetch(`${serviceUrls.auth}/auth/token/username`, {
          headers: { 
            Authorization: token,
            Origin: 'http://localhost:8000',
          },
      });

      if (!response.ok) {
          return res.status(response.status).json(await response.json());
      }

      const userData = await response.json();
      res.json(userData);
  } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Middleware to handle CORS for the user and password change endpoint
app.use('/users/:username', publicCors);
app.use('/users/:username/password', publicCors);

// Change username
app.patch('/users/:username',  async (req, res) => {
    const { username } = req.params;
    const { newUsername } = req.body;

    if (req.user.username !== username) {
      return res.status(403).json({ error: 'You can only change your own username' });
    }

    try {
      const response = await fetch(`${serviceUrls.user}/users/${username}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${req.headers.authorization.split(' ')[1]}`,
          'Content-Type': 'application/json',
          Origin: 'http://localhost:8000'
        },
        body: JSON.stringify({ newUsername: newUsername }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update username');
      }

      const data = await response.json();
      const newToken = data.token;

      // Configure cookie with updated token (1h expiration)
      res.cookie('token', newToken, { httpOnly: true, path: '/', maxAge: 3600000 });

      // Send response with updated token
      res.json({ message: 'Username updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Change password
app.patch('/users/:username/password',  async (req, res) => {
    const { username } = req.params;
    const { token, currentPassword, newPassword } = req.body;

    try {
      const authResponse = await fetch(`${serviceUrls.auth}/auth/validatePassword`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Origin: 'http://localhost:8000'
        },
        body: JSON.stringify({ username: username, password: currentPassword }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        throw new Error(errorData.error || 'Invalid current password');
      }

      // Proceed to update the password in the user service if the current password is valid
      const userResponse = await fetch(`${serviceUrls.user}/users/${username}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:8000'
        },
        body: JSON.stringify({ newPassword : newPassword }),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.error || 'Failed to update password');
      }

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update game history when username changes
const corsOptions = {
  origin: serviceUrls.user,
  methods: ['PATCH'], 
  allowedHeaders: ['Content-Type', 'Origin'] 
};

app.use('/game/update/:oldUsername', cors(corsOptions));

app.patch('/game/update/:oldUsername', async (req, res) => {
  const { oldUsername } = req.params;
  const { newUsername } = req.body;

  try {
    const response = await fetch(`${serviceUrls.game}/game/update/${oldUsername}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:8000'
      },
      body: JSON.stringify({ newUsername : newUsername }),
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Error updating game history' });
    }

    const data = await response.json();
    console.log(data);
    res.json(data);
  } catch (error) {
    console.error('Error updating game history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Profile picture upload
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use('/user/profile/picture', publicCors);

app.post('/user/profile/picture', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const headers = {
    ...req.headers,
    'Content-Type': `multipart/form-data; boundary=${req.file.boundary}`,
    'Origin': 'http://localhost:8000',
  };

  const url = `${serviceUrls.user}/user/profile/picture`;

  try {
    const proxyRequest = fetch(url, {
        method: 'POST',
        headers: headers,
        body: req.file.stream, 
    });

      const response = await proxyRequest;
      const responseBody = await response.json();

      res.status(response.status).json(responseBody);
  } catch (error) {
      console.error('Error uploading profile picture:', error);
      res.status(500).json({ error: 'Error uploading profile picture' });
  }
});

// Proxy for images
app.get('/images/:image', createProxyMiddleware({
  target: serviceUrls.game,
  changeOrigin: true
}));

app.post('/game', (req, res) => {
  forwardRequest('game', '/game', req, res);
});

// OpenAPI Documentation
const openapiPath = './openapi.yaml';
if (fs.existsSync(openapiPath)) {
  const swaggerDocument = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));
  app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} else {
  console.log('OpenAPI documentation not configured. YAML file missing.');
}

// Start server
const server = app.listen(port, () => console.log(`Gateway running at http://localhost:${port}`));

module.exports = server;