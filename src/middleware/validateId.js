// src/middleware/validateId.js

const mongoose = require('mongoose');

/**
 * Middleware para validar que el ID sea un ObjectId válido de MongoDB
 */
function validateMongoId(req, res, next) {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            error: 'Invalid ID format'
        });
    }

    next();
}

module.exports = validateMongoId;