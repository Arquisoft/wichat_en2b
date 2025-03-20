const jwt = require('jsonwebtoken');

// I moved the middleware implemented in RouterGameInfo.js to this file
// because it is a general middleware that can be used in other routers
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token is required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'testing-secret');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = verifyToken;