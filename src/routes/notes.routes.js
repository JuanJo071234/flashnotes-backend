const express = require('express');
const Note = require('../models/Note');
const noteHistory = require('../services/noteHistory.service');

const router = express.Router();

/**
 * GET /api/notes
 * Obtener todas las notas ACTIVAS
 */
router.get('/', async (req, res) => {
    try {
        const notes = await Note.find({ isDeleted: false })
            .sort({ createdAt: -1 });

        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las notas' });
    }
});

/**
 * GET /api/notes/trash
 * Obtener notas en la papelera
 */
router.get('/trash', async (req, res) => {
    try {
        const notes = await Note.find({ isDeleted: true })
            .sort({ deletedAt: -1 });

        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la papelera' });
    }
});

/**
 * GET /api/notes/:id/history
 * Estado del historial UNDO / REDO
 */
router.get('/:id/history', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id)
            .select('versions redoStack updatedAt isDeleted');

        if (!note || note.isDeleted) {
            return res.status(404).json({ message: 'Nota no encontrada' });
        }

        res.json({
            canUndo: note.versions.length > 0,
            canRedo: note.redoStack.length > 0,
            undoCount: note.versions.length,
            redoCount: note.redoStack.length,
            lastEditedAt: note.updatedAt,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener historial' });
    }
});

/**
 * POST /api/notes
 * Crear una nueva nota
 */
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
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la nota' });
    }
});

/**
 * PATCH /api/notes/:id
 * Editar nota (UNDO + REDO + protección optimista opcional)
 */
router.patch('/:id', async (req, res) => {
    try {
        const { title, content, lastKnownUpdate } = req.body;

        if (title === undefined && content === undefined) {
            return res.status(400).json({
                message: 'No se enviaron campos para actualizar',
            });
        }

        const note = await Note.findById(req.params.id);

        if (!note || note.isDeleted) {
            return res.status(404).json({ message: 'Nota no encontrada' });
        }

        // 🔐 Protección optimista (opcional)
        if (
            lastKnownUpdate &&
            new Date(lastKnownUpdate).getTime() !== note.updatedAt.getTime()
        ) {
            return res.status(409).json({
                message: 'La nota fue modificada previamente, recarga antes de editar',
            });
        }

        if (title !== undefined && !title.trim()) {
            return res.status(400).json({ message: 'El título no puede estar vacío' });
        }

        if (content !== undefined && !content.trim()) {
            return res.status(400).json({ message: 'El contenido no puede estar vacío' });
        }

        noteHistory.applyUpdate(note, { title, content });
        await note.save();

        res.json(note);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * PATCH /api/notes/:id/undo
 */
router.patch('/:id/undo', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note || note.isDeleted) {
            return res.status(404).json({ message: 'Nota no encontrada' });
        }

        noteHistory.undo(note);
        await note.save();

        res.json(note);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * PATCH /api/notes/:id/redo
 */
router.patch('/:id/redo', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note || note.isDeleted) {
            return res.status(404).json({ message: 'Nota no encontrada' });
        }

        noteHistory.redo(note);
        await note.save();

        res.json(note);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * PATCH /api/notes/:id/trash
 * Soft delete
 */
router.patch('/:id/trash', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note || note.isDeleted) {
            return res.status(404).json({ message: 'Nota no encontrada' });
        }

        note.isDeleted = true;
        note.deletedAt = new Date();

        await note.save();

        res.json({ message: 'Nota enviada a la papelera' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la nota' });
    }
});

/**
 * PATCH /api/notes/:id/restore
 */
router.patch('/:id/restore', async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);

        if (!note || !note.isDeleted) {
            return res.status(404).json({ message: 'Nota no encontrada en la papelera' });
        }

        note.isDeleted = false;
        note.deletedAt = null;

        await note.save();

        res.json(note);
    } catch (error) {
        res.status(500).json({ message: 'Error al restaurar la nota' });
    }
});

/**
 * DELETE /api/notes/:id/permanent
 */
router.delete('/:id/permanent', async (req, res) => {
    try {
        const note = await Note.findByIdAndDelete(req.params.id);

        if (!note) {
            return res.status(404).json({ message: 'Nota no encontrada' });
        }

        res.json({ message: 'Nota eliminada permanentemente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar definitivamente' });
    }
});

module.exports = router;
