const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Access token is required' });
    }

    try {
        // Call Gateway Service's /token/username endpoint to validate the token
        const gatewayServiceUrl = process.env.GATEWAY_SERVICE_URL || 'http://gatewayservice:8000';
        const response = await fetch(`${gatewayServiceUrl}/token/username`, {
            headers: {
                Authorization: authHeader
            }
        });

        if (!response.ok) {
            throw new Error('Invalid token');
        }

        // If we get here, the token is valid
        req.user = await response.json();
        next();
    } catch (error) {
        console.error('Token validation error:', error.message);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = verifyToken;