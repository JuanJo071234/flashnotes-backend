const MAX_HISTORY = 20;

function createSnapshot(note) {
    return {
        title: note.title,
        content: note.content,
        editedAt: new Date(),
    };
}

function limitStack(stack) {
    if (stack.length > MAX_HISTORY) {
        stack.shift(); // FIFO: elimina el más antiguo
    }
}

function applyUpdate(note, updates) {
    const hasTitleChange =
        updates.title !== undefined &&
        updates.title.trim() !== note.title;

    const hasContentChange =
        updates.content !== undefined &&
        updates.content.trim() !== note.content;

    // Si no hay cambios reales → NO versionamos
    if (!hasTitleChange && !hasContentChange) {
        return false;
    }

    // Guardar estado actual para UNDO
    note.versions.push(createSnapshot(note));
    limitStack(note.versions);

    // Nueva edición invalida REDO
    note.redoStack = [];

    if (hasTitleChange) {
        note.title = updates.title.trim();
    }

    if (hasContentChange) {
        note.content = updates.content.trim();
    }

    return true;
}

function undo(note) {
    if (note.versions.length === 0) {
        throw new Error('No hay cambios para deshacer');
    }

    // Guardar estado actual para REDO
    note.redoStack.push(createSnapshot(note));
    limitStack(note.redoStack);

    const previous = note.versions.pop();

    note.title = previous.title;
    note.content = previous.content;
}

function redo(note) {
    if (note.redoStack.length === 0) {
        throw new Error('No hay cambios para rehacer');
    }

    // Guardar estado actual para UNDO
    note.versions.push(createSnapshot(note));
    limitStack(note.versions);

    const next = note.redoStack.pop();

    note.title = next.title;
    note.content = next.content;
}

module.exports = {
    applyUpdate,
    undo,
    redo,
};
