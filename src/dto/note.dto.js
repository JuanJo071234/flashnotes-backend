// src/dto/note.dto.js

/**
 * DTO para validar y sanitizar entrada de notas
 */

class NoteDTO {
    /**
     * Valida datos para crear nota
     */
    static validateCreate(data) {
        const errors = [];

        if (!data.title || typeof data.title !== 'string') {
            errors.push('title is required and must be a string');
        } else if (data.title.trim().length === 0) {
            errors.push('title cannot be empty');
        } else if (data.title.length > 200) {
            errors.push('title cannot exceed 200 characters');
        }

        if (!data.content || typeof data.content !== 'string') {
            errors.push('content is required and must be a string');
        } else if (data.content.trim().length === 0) {
            errors.push('content cannot be empty');
        } else if (data.content.length > 10000) {
            errors.push('content cannot exceed 10000 characters');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Valida datos para actualizar nota
     */
    static validateUpdate(data) {
        const errors = [];

        // Title es opcional en update, pero si viene debe ser válido
        if (data.title !== undefined) {
            if (typeof data.title !== 'string') {
                errors.push('title must be a string');
            } else if (data.title.trim().length === 0) {
                errors.push('title cannot be empty');
            } else if (data.title.length > 200) {
                errors.push('title cannot exceed 200 characters');
            }
        }

        // Content es opcional en update
        if (data.content !== undefined) {
            if (typeof data.content !== 'string') {
                errors.push('content must be a string');
            } else if (data.content.trim().length === 0) {
                errors.push('content cannot be empty');
            } else if (data.content.length > 10000) {
                errors.push('content cannot exceed 10000 characters');
            }
        }

        // Al menos uno debe estar presente
        if (data.title === undefined && data.content === undefined) {
            errors.push('at least title or content must be provided');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Sanitiza entrada (whitelist + trim)
     */
    static sanitizeCreate(data) {
        return {
            title: data.title?.trim(),
            content: data.content?.trim()
        };
    }

    /**
     * Sanitiza actualización
     */
    static sanitizeUpdate(data) {
        const sanitized = {};

        if (data.title !== undefined) {
            sanitized.title = data.title.trim();
        }

        if (data.content !== undefined) {
            sanitized.content = data.content.trim();
        }

        if (data.lastKnownUpdate !== undefined) {
            sanitized.lastKnownUpdate = data.lastKnownUpdate;
        }

        return sanitized;
    }
}

module.exports = NoteDTO;