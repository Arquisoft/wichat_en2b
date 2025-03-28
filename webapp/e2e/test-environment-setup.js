const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {

  global.mongoserver = await MongoMemoryServer.create();
  process.env.MONGODB_URI = global.mongoserver.getUri();

  global.userservice = require("../../users/userservice/user-service");
  global.authservice = require("../../users/authservice/auth-service");
  global.llmservice = require("../../llmservice/llm-service");
  global.gatewayservice = require("../../gatewayservice/gateway-service");
  global.gameservice = require("../../gameservice/gameserver");
};
