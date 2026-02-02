const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/Note');
const noteHistory = require('../services/noteHistory.service');

const router = express.Router();

/* ============================================================
   MIDDLEWARES
============================================================ */

function validateObjectId(req, res, next) {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            message: 'ID inválido'
        });
    }

    next();
}

async function loadNote(req, res, next) {
    try {
        const note = await Note.findById(req.params.id);

        if (!note || note.isDeleted) {
            return res.status(404).json({
                message: 'Nota no encontrada'
            });
        }

        req.note = note;
        next();
    } catch (error) {
        res.status(500).json({
            message: 'Error al cargar la nota'
        });
    }
}

/* ============================================================
   LISTADOS
============================================================ */

router.get('/', async (req, res) => {
    try {
        const notes = await Note.find({ isDeleted: false })
            .sort({ createdAt: -1 });

        res.json(notes);
    } catch {
        res.status(500).json({
            message: 'Error al obtener las notas'
        });
    }
});

router.get('/trash', async (req, res) => {
    try {
        const notes = await Note.find({ isDeleted: true })
            .sort({ deletedAt: -1 });

        res.json(notes);
    } catch {
        res.status(500).json({
            message: 'Error al obtener la papelera'
        });
    }
});

/* ============================================================
   HISTORIAL
============================================================ */

router.get(
    '/:id/history',
    validateObjectId,
    loadNote,
    (req, res) => {
        const note = req.note;

        res.json({
            canUndo: note.versions.length > 0,
            canRedo: note.redoStack.length > 0,
            undoCount: note.versions.length,
            redoCount: note.redoStack.length,
            lastEditedAt: note.updatedAt,
        });
    }
);

/* ============================================================
   CREAR
============================================================ */

router.post('/', async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title?.trim() || !content?.trim()) {
            return res.status(400).json({
                message: 'Título y contenido son obligatorios',
            });
        }

        const note = await Note.create({
            title: title.trim(),
            content: content.trim(),
        });

        res.status(201).json(note);
    } catch {
        res.status(500).json({
            message: 'Error al crear la nota'
        });
    }
});

/* ============================================================
   EDITAR (CON UNDO/REDO + OPTIMISTA)
============================================================ */

router.patch(
    '/:id',
    validateObjectId,
    loadNote,
    async (req, res) => {
        try {
            const { title, content, lastKnownUpdate } = req.body;
            const note = req.note;

            if (title === undefined && content === undefined) {
                return res.status(400).json({
                    message: 'No se enviaron campos para actualizar',
                });
            }

            // 🔐 Protección optimista
            if (
                lastKnownUpdate &&
                new Date(lastKnownUpdate).getTime() !== note.updatedAt.getTime()
            ) {
                return res.status(409).json({
                    message: 'La nota fue modificada previamente, recarga antes de editar',
                });
            }

            if (title !== undefined && !title.trim()) {
                return res.status(400).json({
                    message: 'El título no puede estar vacío'
                });
            }

            if (content !== undefined && !content.trim()) {
                return res.status(400).json({
                    message: 'El contenido no puede estar vacío'
                });
            }

            noteHistory.applyUpdate(note, { title, content });
            await note.save();

            // 👇 ESTADO FRESCO REAL DESDE MONGO
            const updated = await Note.findById(note.id);
            res.json(updated);

        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);

/* ============================================================
   UNDO / REDO
============================================================ */

router.patch(
    '/:id/undo',
    validateObjectId,
    loadNote,
    async (req, res) => {
        try {
            noteHistory.undo(req.note);
            await req.note.save();

            const fresh = await Note.findById(req.note.id);
            res.json(fresh);

        } catch (error) {
            res.status(400).json({
                message: error.message
            });
        }
    }
);

router.patch(
    '/:id/redo',
    validateObjectId,
    loadNote,
    async (req, res) => {
        try {
            noteHistory.redo(req.note);
            await req.note.save();

            const fresh = await Note.findById(req.note.id);
            res.json(fresh);

        } catch (error) {
            res.status(400).json({
                message: error.message
            });
        }
    }
);

/* ============================================================
   PAPELERA
============================================================ */

router.patch(
    '/:id/trash',
    validateObjectId,
    loadNote,
    async (req, res) => {
        try {
            req.note.isDeleted = true;
            req.note.deletedAt = new Date();

            await req.note.save();

            res.json({
                message: 'Nota enviada a la papelera'
            });
        } catch {
            res.status(500).json({
                message: 'Error al eliminar la nota'
            });
        }
    }
);

router.patch(
    '/:id/restore',
    validateObjectId,
    async (req, res) => {
        try {
            const note = await Note.findById(req.params.id);

            if (!note || !note.isDeleted) {
                return res.status(404).json({
                    message: 'Nota no encontrada en la papelera'
                });
            }

            note.isDeleted = false;
            note.deletedAt = null;

            await note.save();

            res.json(note);
        } catch {
            res.status(500).json({
                message: 'Error al restaurar la nota'
            });
        }
    }
);

/* ============================================================
   ELIMINADO PERMANENTE
============================================================ */

router.delete(
    '/:id/permanent',
    validateObjectId,
    async (req, res) => {
        try {
            const note = await Note.findByIdAndDelete(req.params.id);

            if (!note) {
                return res.status(404).json({
                    message: 'Nota no encontrada'
                });
            }

            res.json({
                message: 'Nota eliminada permanentemente'
            });
        } catch {
            res.status(500).json({
                message: 'Error al eliminar definitivamente'
            });
        }
    }
);

module.exports = router;
