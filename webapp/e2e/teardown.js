module.exports = async () => {
    global.gameservice.close();

    global.gatewayservice.close();

    global.llmservice.close();

    global.authservice.server.close();

    global.userservice.close();

    global.mongoserver.stop();
}