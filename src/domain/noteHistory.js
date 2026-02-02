// src/domain/noteHistory.js

/**
 * Dominio puro: lógica de undo/redo sin dependencias externas
 */

const MAX_HISTORY = 20;

class NoteHistoryDomain {
    /**
     * Determina si hay cambios reales entre dos estados
     */
    static hasRealChanges(current, update) {
        const titleChanged = update.title !== undefined && update.title !== current.title;
        const contentChanged = update.content !== undefined && update.content !== current.content;
        return titleChanged || contentChanged;
    }

    /**
     * Crea un snapshot del estado actual
     */
    static createSnapshot(note) {
        return {
            title: note.title,
            content: note.content,
            editedAt: new Date()
        };
    }

    /**
     * Aplica una actualización al historial
     * Retorna el estado modificado (inmutable)
     */
    static applyUpdate(note, update) {
        // Si no hay cambios reales, retorna sin modificar
        if (!this.hasRealChanges(note, update)) {
            return {
                modified: false,
                note: note
            };
        }

        const newVersions = [...note.versions];
        const isFirstEdit = newVersions.length === 0;

        // Primera edición: guardar estado original
        if (isFirstEdit) {
            newVersions.push(this.createSnapshot(note));
        }

        // Guardar estado antes del cambio
        newVersions.push(this.createSnapshot(note));

        // Limitar historial
        if (newVersions.length > MAX_HISTORY) {
            newVersions.shift();
        }

        return {
            modified: true,
            note: {
                ...note,
                title: update.title ?? note.title,
                content: update.content ?? note.content,
                versions: newVersions,
                redoStack: [], // invalidar redo
                editedAt: new Date()
            }
        };
    }

    /**
     * Ejecuta undo
     */
    static undo(note) {
        if (!note.versions || note.versions.length === 0) {
            return {
                success: false,
                error: 'NO_HISTORY',
                note: note
            };
        }

        const newVersions = [...note.versions];
        const newRedoStack = [...(note.redoStack || [])];

        // Guardar estado actual en redo
        newRedoStack.push(this.createSnapshot(note));

        // Recuperar última versión
        const restored = newVersions.pop();

        return {
            success: true,
            note: {
                ...note,
                title: restored.title,
                content: restored.content,
                versions: newVersions,
                redoStack: newRedoStack,
                editedAt: new Date()
            }
        };
    }

    /**
     * Ejecuta redo
     */
    static redo(note) {
        if (!note.redoStack || note.redoStack.length === 0) {
            return {
                success: false,
                error: 'NO_REDO',
                note: note
            };
        }

        const newVersions = [...note.versions];
        const newRedoStack = [...note.redoStack];

        // Guardar estado actual en versiones
        newVersions.push(this.createSnapshot(note));

        // Recuperar de redo
        const restored = newRedoStack.pop();

        // Limitar historial
        if (newVersions.length > MAX_HISTORY) {
            newVersions.shift();
        }

        return {
            success: true,
            note: {
                ...note,
                title: restored.title,
                content: restored.content,
                versions: newVersions,
                redoStack: newRedoStack,
                editedAt: new Date()
            }
        };
    }
}

module.exports = NoteHistoryDomain;