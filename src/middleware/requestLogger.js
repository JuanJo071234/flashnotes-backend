// src/middleware/requestLogger.js

/**
 * Middleware para logging de requests (opcional)
 */
function requestLogger(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });

    next();
}

module.exports = requestLogger;