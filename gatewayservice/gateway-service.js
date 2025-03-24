const express = require('express');
const axios = require('axios');
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
const publicCors = cors({ origin: '*', methods: ['GET', 'POST'] });
const restrictedCors = cors({ origin: 'http://localhost:3000', methods: ['GET', 'POST'] });

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
    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }
    
    // Set the status code from the downstream service response
    res.status(response.status);
    // Send the response body as-is
    if (responseBody) {
      if (contentType && contentType.includes('application/json')) {
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
app.use('/login', restrictedCors);
app.post('/login', (req, res) => forwardRequest('auth', '/auth/login', req, res));

// User Management
app.use('/adduser', restrictedCors);
app.post('/adduser', (req, res) => forwardRequest('auth', '/auth/register', req, res));

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

// LLM Question Handling
app.use('/askllm', restrictedCors);
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
  app.use(route, restrictedCors);
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

// Proxy for images
app.get('/images/:image', createProxyMiddleware({
  target: serviceUrls.game,
  changeOrigin: true
}));

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