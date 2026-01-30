const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema(
    {
        title: String,
        content: String,
        editedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const noteSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'El título es obligatorio'],
            trim: true,
            minlength: [3, 'El título debe tener al menos 3 caracteres'],
            maxlength: [100, 'El título no puede superar los 100 caracteres'],
        },

        content: {
            type: String,
            required: [true, 'El contenido es obligatorio'],
            trim: true,
            minlength: [1, 'El contenido no puede estar vacío'],
        },

        // 🗑️ Soft delete
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },

        deletedAt: {
            type: Date,
            default: null,
        },

        // ↩️ UNDO (stack)
        versions: [snapshotSchema],

        // ↪️ REDO (stack)
        redoStack: [snapshotSchema],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Note', noteSchema);
