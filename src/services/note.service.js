// src/services/note.service.js

const noteRepository = require('../repositories/note.repository');
const NoteHistoryDomain = require('../domain/noteHistory');

class NoteService {
    /**
     * Crear nueva nota
     * NOTA: La validación ya se hizo en el controller con DTO
     */
    async createNote({ title, content }) {
        return await noteRepository.create({
            title,
            content
        });
    }

    /**
     * Listar notas activas
     */
    async listActiveNotes() {
        return await noteRepository.findAllActive();
    }

    /**
     * Listar papelera
     */
    async listTrash() {
        return await noteRepository.findAllDeleted();
    }

    /**
     * Actualizar nota con protección optimista
     */
    async updateNote(id, { title, content, lastKnownUpdate }) {
        const note = await noteRepository.findActiveById(id);

        if (!note) {
            throw new Error('NOTE_NOT_FOUND');
        }

        // Protección optimista contra concurrencia
        if (lastKnownUpdate) {
            const clientTime = new Date(lastKnownUpdate);
            const serverTime = new Date(note.editedAt);

            if (clientTime.getTime() !== serverTime.getTime()) {
                const error = new Error('CONFLICT: Note was modified by another session');
                error.code = 'CONFLICT';
                throw error;
            }
        }

        // Aplicar lógica de dominio
        const result = NoteHistoryDomain.applyUpdate(note, { title, content });

        if (!result.modified) {
            return note; // sin cambios reales
        }

        // Actualizar campos
        note.title = result.note.title;
        note.content = result.note.content;
        note.versions = result.note.versions;
        note.redoStack = result.note.redoStack;
        note.editedAt = result.note.editedAt;

        return await noteRepository.save(note);
    }

    /**
     * Deshacer cambios
     */
    async undoNote(id) {
        const note = await noteRepository.findActiveById(id);

        if (!note) {
            throw new Error('NOTE_NOT_FOUND');
        }

        const result = NoteHistoryDomain.undo(note);

        if (!result.success) {
            const error = new Error('No history available to undo');
            error.code = 'NO_HISTORY';
            throw error;
        }

        // Aplicar cambios
        note.title = result.note.title;
        note.content = result.note.content;
        note.versions = result.note.versions;
        note.redoStack = result.note.redoStack;
        note.editedAt = result.note.editedAt;

        return await noteRepository.save(note);
    }

    /**
     * Rehacer cambios
     */
    async redoNote(id) {
        const note = await noteRepository.findActiveById(id);

        if (!note) {
            throw new Error('NOTE_NOT_FOUND');
        }

        const result = NoteHistoryDomain.redo(note);

        if (!result.success) {
            const error = new Error('No actions available to redo');
            error.code = 'NO_REDO';
            throw error;
        }

        // Aplicar cambios
        note.title = result.note.title;
        note.content = result.note.content;
        note.versions = result.note.versions;
        note.redoStack = result.note.redoStack;
        note.editedAt = result.note.editedAt;

        return await noteRepository.save(note);
    }

    /**
     * Mover a papelera (soft delete)
     */
    async moveToTrash(id) {
        const note = await noteRepository.findActiveById(id);

        if (!note) {
            throw new Error('NOTE_NOT_FOUND');
        }

        note.isDeleted = true;
        note.deletedAt = new Date();

        return await noteRepository.save(note);
    }

    /**
     * Restaurar de papelera
     */
    async restoreFromTrash(id) {
        const note = await noteRepository.findDeletedById(id);

        if (!note) {
            throw new Error('NOTE_NOT_IN_TRASH');
        }

        note.isDeleted = false;
        note.deletedAt = null;

        return await noteRepository.save(note);
    }

    /**
     * Eliminar permanentemente
     */
    async deletePermanently(id) {
        const note = await noteRepository.findDeletedById(id);

        if (!note) {
            throw new Error('NOTE_NOT_IN_TRASH');
        }

        return await noteRepository.deletePermanently(id);
    }
}

module.exports = new NoteService();
