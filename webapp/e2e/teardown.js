module.exports = async () => {
    try {
        // Close services in reverse order of initialization with proper error handling
        if (global.gameservice) await global.gameservice.close();
        if (global.gatewayservice) await global.gatewayservice.close();
        if (global.llmservice) await global.llmservice.close();
        if (global.authservice && global.authservice.server) await global.authservice.server.close();
        if (global.userservice) await global.userservice.close();
        if (global.userserviceModule && global.userserviceModule.default)
            await global.userserviceModule.default.close();
        if (global.mongoserver) await global.mongoserver.stop();

        console.log("✅ All services successfully closed");
    } catch (error) {
        console.error("❌ Error during teardown:", error);
        throw error; // Rethrow to make Jest aware of the failure
    }
};