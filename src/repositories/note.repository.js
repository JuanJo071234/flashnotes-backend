// src/repositories/note.repository.js

const Note = require('../models/Note');

class NoteRepository {
    /**
     * Buscar nota activa por ID
     */
    async findActiveById(id) {
        return await Note.findOne({ _id: id, isDeleted: false });
    }

    /**
     * Buscar nota eliminada por ID
     */
    async findDeletedById(id) {
        return await Note.findOne({ _id: id, isDeleted: true });
    }

    /**
     * Buscar cualquier nota por ID (activa o eliminada)
     */
    async findById(id) {
        return await Note.findById(id);
    }

    /**
     * Listar notas activas
     */
    async findAllActive() {
        return await Note.find({ isDeleted: false })
            .sort({ createdAt: -1 })
            .select('-__v');
    }

    /**
     * Listar notas en papelera
     */
    async findAllDeleted() {
        return await Note.find({ isDeleted: true })
            .sort({ deletedAt: -1 })
            .select('-__v');
    }

    /**
     * Crear nota
     */
    async create(data) {
        const note = new Note(data);
        return await note.save();
    }

    /**
     * Guardar cambios en nota existente
     */
    async save(note) {
        return await note.save();
    }

    /**
     * Eliminar permanentemente
     */
    async deletePermanently(id) {
        return await Note.findByIdAndDelete(id);
    }

    /**
     * Contar notas activas
     */
    async countActive() {
        return await Note.countDocuments({ isDeleted: false });
    }

    /**
     * Contar notas eliminadas
     */
    async countDeleted() {
        return await Note.countDocuments({ isDeleted: true });
    }
}

module.exports = new NoteRepository();