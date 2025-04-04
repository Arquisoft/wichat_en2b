module.exports = async () => {
    global.gameservice.close();

    global.gatewayservice.close();

    global.llmservice.close();

    global.authservice.server.close();

    global.userservice.close();
    
    await global.mongoserver.stop();
    console.log("🛑 MongoMemoryServer stopped and mongoose disconnected");
}