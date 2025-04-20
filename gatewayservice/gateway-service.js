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
  game: process.env.GAME_SERVICE_URL || 'http://localhost:8004',
  group: process.env.GROUP_SERVICE_URL || 'http://localhost:8005',
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
  const endpoint = id && typeof id === 'string' ? `/users?id=${id}` : '/users';
  forwardRequest('user', endpoint, req, res);
});

app.get('/users/:username', (req, res) => {
  forwardRequest('user', `/users/${req.params.username}`, req, res);
});

app.patch('/users', (req, res) => {
  forwardRequest('user', `/users`, req, res);
});

app.delete('/users', (req, res) => {
  forwardRequest('user', `/users`, req, res);
});

app.post('/users/by-ids', (req, res) => {
  forwardRequest('user', `/users/by-ids`, req, res);
});

app.get('/users/id/:id', (req, res) => {
  forwardRequest('user', `/users/id/${req.params.id}`, req, res);
});

// Group Management
app.use('/groups', publicCors);
app.get('/groups', (req, res) => {
  forwardRequest('group', '/groups', req, res);
});

app.use('/groups/joined', publicCors);
app.get('/groups/joined', (req, res) => {
  forwardRequest('group', '/groups/joined', req, res);
});

app.use('/groups/:name', publicCors);
app.get('/groups/:name', (req, res) => {
  forwardRequest('group', `/groups/${req.params.name}`, req, res);
});

app.use('/groups', publicCors);
app.post('/groups', (req, res) => {
  forwardRequest('group', '/groups', req, res);
});

app.use('/groups', publicCors);
app.patch('/groups', (req, res) => {
  forwardRequest('group', `/groups`, req, res);
});

app.use('/groups', publicCors);
app.delete('/groups', (req, res) => {
  forwardRequest('group', `/groups`, req, res);
});

app.use('/groups/join', publicCors);
app.post('/groups/join', (req, res) => {
  forwardRequest('group', `/groups/join`, req, res);
});

app.use('/groups/leave', publicCors);
app.post('/groups/leave', (req, res) => {
  forwardRequest('group', `/groups/leave`, req, res);
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
app.use('/quiz/allTopics', publicCors);
app.get('/quiz/allTopics', (req, res) => forwardRequest('game', '/quiz/allTopics', req, res));

// Game Service Routes
app.use('/quiz', publicCors);
app.get('/quiz/:topic', (req, res) => {
  const topic = req.params.topic;
  forwardRequest('game', `/quiz/${topic}`, req, res);
});
app.get('/quiz', (req, res) => forwardRequest('game', '/quiz', req, res));
app.post('/quiz', (req, res) => forwardRequest('game', '/quiz', req, res));

app.use('/game', publicCors);
app.use('/question/validate', publicCors);
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
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Hubo un problema al obtener las preguntas' });
  }
});
app.post('/question/validate', (req, res) => forwardRequest('game', '/question/validate', req, res));

app.use('/question/internal/:id', cors({
  origin: serviceUrls.llm,
  methods: ['GET']
}));

app.get('/question/internal/:id', (req, res) =>
    forwardRequest('game', `/question/internal/${req.params.id}`, req, res)
);
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
      console.error(`${errorMessage}: ${error.message}`, error);
      res.status(500).json({
        error: errorMessage,
      });
    }
  });
});

app.use('/leaderboard/group', publicCors);
app.post('/leaderboard/group', (req, res) => {
  forwardRequest('game', '/leaderboard/group', req, res);
});

// Username handling
app.use('/token/username', publicCors);

app.get('/token/username', async (req, res) => {
  forwardRequest("auth", "/auth/token/username", req, res);
});

// Middleware to handle CORS for the user and password change endpoint
app.use('/users/:username', publicCors);
app.use('/users/:username/password', publicCors);

// Change username
app.patch('/users/:username',  async (req, res) => {
  forwardRequest("user", `/users/${req.params.username}`, req, res);
});

// Profile picture upload
app.use('/user/profile/picture', publicCors);

app.post('/user/profile/picture', async (req, res) => {
    forwardRequest("user", "/user/profile/picture", req, res);
});

// Profile picture retrieval
app.use('/user/profile/picture/:id', publicCors);

app.get('/user/profile/picture/:id', async (req, res) => {
    forwardRequest("user", `/user/profile/picture/${req.params.id}`, req, res);
});

// Proxy for images
app.get('/images/:image', (req, res, next) => {
  const { image } = req.params;
  console.log(`Image requested: ${image}`);

  if (image.includes('_profile_picture')) {
    createProxyMiddleware({
      target: serviceUrls.user,
      changeOrigin: true,
    })(req, res, next);

  } else {
    createProxyMiddleware({
      target: serviceUrls.game,
      changeOrigin: true,
    })(req, res, next);
  }
});

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