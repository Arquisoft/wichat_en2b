module.exports = async () => {
    try {
        // First close all services
        await Promise.all([
            global.gameservice.close(),
            global.gatewayservice.close(),
            global.llmservice.close(),
            global.authservice.server.close(),
            global.userservice.close(),
            global.userserviceModule.default.close(),
        ]);

        // Stop mongo memory server last
        if (global.mongoserver) {
            await global.mongoserver.stop();
        }

        // Clear all remaining handles
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log("🛑 All services stopped and connections closed");
    } catch (error) {
        console.error("Error during teardown:", error);
        process.exit(1); // Force exit on error
    }

    // Force exit if still hanging
    setTimeout(() => {
        console.log("⚠️ Forcing exit after timeout");
        process.exit(0);
    }, 1000);
};