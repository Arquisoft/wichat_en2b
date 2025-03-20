const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoserver;
let userservice;
let authservice;
let llmservice;
let gatewayservice;

module.exports = async () => {
  console.log('Starting MongoDB memory server...');
  
  // Crear el servidor MongoDB en memoria
  mongoserver = await MongoMemoryServer.create();
  const mongoUri = mongoserver.getUri();
  
  // Establecer variable de entorno
  process.env.MONGODB_URI = mongoUri;
  
  // Importar los servicios después de establecer MONGODB_URI
  userservice = await require("../../users/userservice/user-service");
  authservice = await require("../../users/authservice/auth-service");
  llmservice = await require("../../llmservice/llm-service");
  gatewayservice = await require("../../gatewayservice/gateway-service");

  console.log('MongoDB memory server started and services loaded.');
};
