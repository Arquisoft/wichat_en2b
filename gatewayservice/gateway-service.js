const express = require('express');
const axios = require('axios');
const cors = require('cors');
const promBundle = require('express-prom-bundle');
//libraries required for OpenAPI-Swagger
const swaggerUi = require('swagger-ui-express'); 
const fs = require("fs")
const YAML = require('yaml')
//libraries for proxy
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const port = 8000;

const llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://localhost:8003';
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:8002';
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:8001';
const gameServiceUrl = process.env.GAME_SERVICE_URL || 'http://localhost:8004';

// Function to generalize the handling of statistics requests
const handleStatisticsRequest = async (endpoint, req, res, errorMessage) => {
  try {
    const response = await fetch(`${gameServiceUrl}${endpoint}`, {
      headers: {
        'Authorization': req.headers.authorization,
        'Origin': 'http://localhost:8000'
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching ${errorMessage}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error(`Error getting ${errorMessage}:`, err);
    return res.status(500).json({ error: `Error retrieving ${errorMessage}` });
  }
};

app.use(cors())
app.use(express.json());

//Prometheus configuration
const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.post('/login', async (req, res) => {
  try {
    // Forward the login request to the authentication service
    const authResponse = await axios.post(authServiceUrl+'/login', req.body);
    res.json(authResponse.data);
  } catch (error) {
    res.status(error.response.status).json({ error: error.response.data.error });
  }
});

app.post('/register', async (req, res) => {
  try {
    // Forward the add user request to the user service
    const authResponse = await axios.post(authServiceUrl+'/register', req.body);
    res.json(authResponse.data);
  } catch (error) {
    res.status(error.response.status).json({ error: error.response.data.error });
  }
});

app.post('/askllm', async (req, res) => {
  try {
    // Forward the question to the llm service
    const llmResponse = await axios.post(llmServiceUrl+'/askllm', req.body);
    res.json(llmResponse.data);
  } catch (error) {
    res.status(error.response.status).json({ error: error.response.data.error });
  }
});

app.get('/game/:subject/:totalQuestions/:numberOptions', async (req, res) => {
  const { subject, totalQuestions, numberOptions } = req.params;

  try {
    const response = await fetch(`${gameServiceUrl}/game/${subject}/${totalQuestions}/${numberOptions}`, {
      headers: {
        'Origin': 'http://localhost:8000'
      }});
      
    if (!response.ok) {
      throw new Error('Error al hacer la solicitud al backend');
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Error al obtener preguntas:', err);
    return res.status(500).json({ error: 'Hubo un problema al obtener las preguntas' });
  }
});

app.get('/statistics/subject/:subject', async (req, res) => {
  const { subject } = req.params;
  await handleStatisticsRequest(
      `/statistics/subject/${subject}`,
      req,
      res,
      'subject statistics'
  );
});

app.get('/statistics/global', async (req, res) => {
  await handleStatisticsRequest(
      '/statistics/global',
      req,
      res,
      'global statistics'
  );
});

app.get('/leaderboard', async (req, res) => {
  await handleStatisticsRequest(
      '/leaderboard',
      req,
      res,
      'leaderboard'
  );
});

app.post('/users', async (req, res) => {
  try {
    const userResponse = await axios.post(`${userServiceUrl}/users`, req.body);
    res.status(201).json(userResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data.error || 'Failed to create user' });
  }
});

app.get('/users', async (req, res) => {
  try {
    const { id } = req.query; // Forward query params (e.g., ?id=username)
    const url = id ? `${userServiceUrl}/users?id=${id}` : `${userServiceUrl}/users`;
    const userResponse = await axios.get(url);
    res.status(200).json(userResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data.error || 'Failed to fetch users' });
  }
});

app.get('/users/:username', async (req, res) => {
  try {
    const userResponse = await axios.get(`${userServiceUrl}/users/${req.params.username}`);
    res.status(200).json(userResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data.error || 'Failed to fetch user' });
  }
});

app.patch('/users/:username', async (req, res) => {
  try {
    const userResponse = await axios.patch(`${userServiceUrl}/users/${req.params.username}`, req.body);
    res.status(200).json(userResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data.error || 'Failed to update user' });
  }
});

app.delete('/users/:username', async (req, res) => {
  try {
    const userResponse = await axios.delete(`${userServiceUrl}/users/${req.params.username}`);
    res.status(200).json(userResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data.error || 'Failed to delete user' });
  }
});

// Proxy for images requests
app.get('/images/:image', createProxyMiddleware({
  target: gameServiceUrl,
  changeOrigin: true
}));

// Read the OpenAPI YAML file synchronously
openapiPath='./openapi.yaml'
if (fs.existsSync(openapiPath)) {
  const file = fs.readFileSync(openapiPath, 'utf8');

  // Parse the YAML content into a JavaScript object representing the Swagger document
  const swaggerDocument = YAML.parse(file);

  // Serve the Swagger UI documentation at the '/api-doc' endpoint
  // This middleware serves the Swagger UI files and sets up the Swagger UI page
  // It takes the parsed Swagger document as input
  app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} else {
  console.log("Not configuring OpenAPI. Configuration file not present.")
}


// Start the gateway service
const server = app.listen(port, () => {
  console.log(`Gateway Service listening at http://localhost:${port}`);
});

module.exports = server
