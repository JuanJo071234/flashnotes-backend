const mongoose = require('mongoose');

const MAX_HISTORY = 20;

/* ============================================================
   SNAPSHOT (INMUTABLE Y VALIDADO)
============================================================ */
const snapshotSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true,
            maxlength: 100,
        },

        content: {
            type: String,
            trim: true,
        },

        editedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        _id: false,
        versionKey: false,
    }
);

/* ============================================================
   NOTA PRINCIPAL
============================================================ */
const noteSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'El título es obligatorio'],
            trim: true,
            minlength: [3, 'El título debe tener al menos 3 caracteres'],
            maxlength: [100, 'El título no puede superar los 100 caracteres'],
            index: true,
        },

        content: {
            type: String,
            required: [true, 'El contenido es obligatorio'],
            trim: true,
            minlength: [1, 'El contenido no puede estar vacío'],
        },

        /* ========== SOFT DELETE ========== */

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },

        deletedAt: {
            type: Date,
            default: null,
        },

        /* ========== HISTORIAL UNDO / REDO ========== */

        versions: {
            type: [snapshotSchema],
            default: [],
            validate: {
                validator: v => v.length <= MAX_HISTORY,
                message: `El historial no puede superar ${MAX_HISTORY}`
            }
        },

        redoStack: {
            type: [snapshotSchema],
            default: [],
            validate: {
                validator: v => v.length <= MAX_HISTORY,
                message: `El redo no puede superar ${MAX_HISTORY}`
            }
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

/* ============================================================
   ÍNDICES OPTIMIZADOS
============================================================ */

// Listado de notas activas
noteSchema.index({ isDeleted: 1, createdAt: -1 });

// Listado de papelera
noteSchema.index({ isDeleted: 1, deletedAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
