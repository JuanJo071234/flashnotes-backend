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
        stack.shift();   // elimina el más antiguo
    }
}

function applyUpdate(note, updates) {

    const hasTitleChange =
        updates.title !== undefined &&
        updates.title.trim() !== note.title;

    const hasContentChange =
        updates.content !== undefined &&
        updates.content.trim() !== note.content;

    // 🔥 CLAVE:
    // Si es la primera edición REAL de la nota,
    // debemos crear snapshot inicial sí o sí
    const isFirstEdit = note.versions.length === 0;

    // Si no hay cambios reales y no es primera edición → no hacemos nada
    if (!hasTitleChange && !hasContentChange && !isFirstEdit) {
        return;
    }

    // 👉 Guardar estado ACTUAL para poder hacer UNDO
    note.versions.push(createSnapshot(note));
    limitStack(note.versions);

    // 👉 Nueva edición invalida completamente el REDO
    note.redoStack = [];

    if (hasTitleChange) {
        note.title = updates.title.trim();
    }

    if (hasContentChange) {
        note.content = updates.content.trim();
    }
}

function undo(note) {
    if (note.versions.length === 0) {
        throw new Error('No hay cambios para deshacer');
    }

    // 👉 Guardar estado actual para REDO
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
