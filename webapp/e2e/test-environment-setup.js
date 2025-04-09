const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {

  global.mongoserver = await MongoMemoryServer.create(
      { instance: { dbName: 'userdb', port:5151 } }
  );
  process.env.MONGODB_URI = global.mongoserver.getUri();
  process.env.GATEWAY_SERVICE_URL = 'http://localhost:8000';

  console.log('\n🗣️🗣️MONGODB_URI: '+process.env.MONGODB_URI)

  global.userserviceModule = await import("../../users/userservice/user-service.mjs");
  global.userservice = userserviceModule.default
  global.authservice = require("../../users/authservice/auth-service");
  global.llmservice = require("../../llmservice/llm-service");
  global.gatewayservice = require("../../gatewayservice/gateway-service");
  global.gameservice = require("../../gameservice/gameserver");

};
