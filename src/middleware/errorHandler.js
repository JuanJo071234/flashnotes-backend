// src/middleware/errorHandler.js

/**
 * Middleware global de manejo de errores
 * Debe ir al final de todas las rutas en app.js
 */
function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Error de validación de Mongoose
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            details: Object.values(err.errors).map(e => e.message)
        });
    }

    // Error de casteo (ID inválido)
    if (err.name === 'CastError') {
        return res.status(400).json({
            error: 'Invalid ID format'
        });
    }

    // Error por defecto
    res.status(500).json({
        error: 'Internal server error'
    });
}

module.exports = errorHandler;