// tests/unit/domain/noteHistory.test.js

const NoteHistoryDomain = require('../../../src/domain/noteHistory');

describe('NoteHistoryDomain - Lógica Pura', () => {

    // ============================================
    // TESTS: hasRealChanges
    // ============================================

    describe('hasRealChanges()', () => {
        test('debe detectar cambio en title', () => {
            const current = { title: 'Old', content: 'Text' };
            const update = { title: 'New' };

            expect(NoteHistoryDomain.hasRealChanges(current, update)).toBe(true);
        });

        test('debe detectar cambio en content', () => {
            const current = { title: 'Title', content: 'Old content' };
            const update = { content: 'New content' };

            expect(NoteHistoryDomain.hasRealChanges(current, update)).toBe(true);
        });

        test('debe detectar cambio en ambos campos', () => {
            const current = { title: 'Old', content: 'Old content' };
            const update = { title: 'New', content: 'New content' };

            expect(NoteHistoryDomain.hasRealChanges(current, update)).toBe(true);
        });

        test('NO debe detectar cambios si title es igual', () => {
            const current = { title: 'Same', content: 'Text' };
            const update = { title: 'Same' };

            expect(NoteHistoryDomain.hasRealChanges(current, update)).toBe(false);
        });

        test('NO debe detectar cambios si content es igual', () => {
            const current = { title: 'Title', content: 'Same text' };
            const update = { content: 'Same text' };

            expect(NoteHistoryDomain.hasRealChanges(current, update)).toBe(false);
        });

        test('NO debe detectar cambios si update está vacío', () => {
            const current = { title: 'Title', content: 'Content' };
            const update = {};

            expect(NoteHistoryDomain.hasRealChanges(current, update)).toBe(false);
        });
    });

    // ============================================
    // TESTS: createSnapshot
    // ============================================

    describe('createSnapshot()', () => {
        test('debe crear snapshot con title, content y editedAt', () => {
            const note = {
                title: 'Test Title',
                content: 'Test Content',
                versions: []
            };

            const snapshot = NoteHistoryDomain.createSnapshot(note);

            expect(snapshot).toHaveProperty('title', 'Test Title');
            expect(snapshot).toHaveProperty('content', 'Test Content');
            expect(snapshot).toHaveProperty('editedAt');
            expect(snapshot.editedAt).toBeInstanceOf(Date);
        });

        test('debe crear snapshot sin modificar nota original', () => {
            const note = {
                title: 'Original',
                content: 'Original',
                versions: []
            };

            const snapshot = NoteHistoryDomain.createSnapshot(note);
            snapshot.title = 'Modified';

            expect(note.title).toBe('Original');
        });
    });

    // ============================================
    // TESTS: applyUpdate - Primera Edición
    // ============================================

    describe('applyUpdate() - Primera Edición', () => {
        test('debe guardar estado original en primera edición', () => {
            const note = {
                title: 'Original',
                content: 'Original content',
                versions: [],
                redoStack: [],
                editedAt: new Date('2024-01-01')
            };

            const result = NoteHistoryDomain.applyUpdate(note, {
                title: 'Updated'
            });

            expect(result.modified).toBe(true);
            expect(result.note.versions).toHaveLength(2);

            // Primer snapshot = estado original
            expect(result.note.versions[0].title).toBe('Original');
            expect(result.note.versions[0].content).toBe('Original content');

            // Segundo snapshot = antes de aplicar cambio
            expect(result.note.versions[1].title).toBe('Original');
        });
    });

    // ============================================
    // TESTS: applyUpdate - Cambios Subsecuentes
    // ============================================

    describe('applyUpdate() - Cambios Normales', () => {
        test('debe aplicar cambio en title', () => {
            const note = {
                title: 'Old',
                content: 'Content',
                versions: [{ title: 'Original', content: 'Content', editedAt: new Date() }],
                redoStack: [],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.applyUpdate(note, { title: 'New' });

            expect(result.modified).toBe(true);
            expect(result.note.title).toBe('New');
            expect(result.note.content).toBe('Content');
        });

        test('debe aplicar cambio en content', () => {
            const note = {
                title: 'Title',
                content: 'Old',
                versions: [{ title: 'Title', content: 'Original', editedAt: new Date() }],
                redoStack: [],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.applyUpdate(note, { content: 'New' });

            expect(result.modified).toBe(true);
            expect(result.note.content).toBe('New');
        });

        test('debe invalidar redoStack al hacer cambio', () => {
            const note = {
                title: 'Title',
                content: 'Content',
                versions: [{ title: 'V1', content: 'C1', editedAt: new Date() }],
                redoStack: [
                    { title: 'Redo1', content: 'RedoC1', editedAt: new Date() }
                ],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.applyUpdate(note, { title: 'Changed' });

            expect(result.note.redoStack).toEqual([]);
        });

        test('NO debe modificar si no hay cambios reales', () => {
            const note = {
                title: 'Same',
                content: 'Same',
                versions: [],
                redoStack: [],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.applyUpdate(note, {
                title: 'Same',
                content: 'Same'
            });

            expect(result.modified).toBe(false);
            expect(result.note.versions).toHaveLength(0);
        });
    });

    // ============================================
    // TESTS: applyUpdate - Límite de 20
    // ============================================

    describe('applyUpdate() - Límite de Historial', () => {
        test('debe mantener máximo 20 versiones', () => {
            // Crear nota con 20 versiones
            const versions = Array(20).fill(null).map((_, i) => ({
                title: `Version ${i}`,
                content: `Content ${i}`,
                editedAt: new Date()
            }));

            const note = {
                title: 'Current',
                content: 'Current',
                versions,
                redoStack: [],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.applyUpdate(note, { title: 'New' });

            expect(result.note.versions).toHaveLength(20);
            // Debe eliminar la más antigua (Version 0)
            expect(result.note.versions[0].title).toBe('Version 1');
        });

        test('debe eliminar versiones antiguas cuando excede límite', () => {
            const versions = Array(19).fill(null).map((_, i) => ({
                title: `V${i}`,
                content: `C${i}`,
                editedAt: new Date()
            }));

            const note = {
                title: 'Current',
                content: 'Current',
                versions,
                redoStack: [],
                editedAt: new Date()
            };

            // Hacer dos cambios consecutivos
            let result = NoteHistoryDomain.applyUpdate(note, { title: 'Change1' });
            result = NoteHistoryDomain.applyUpdate(result.note, { title: 'Change2' });

            expect(result.note.versions).toHaveLength(20);
        });
    });

    // ============================================
    // TESTS: undo
    // ============================================

    describe('undo()', () => {
        test('debe deshacer último cambio correctamente', () => {
            const note = {
                title: 'Current',
                content: 'Current content',
                versions: [
                    { title: 'Previous', content: 'Previous content', editedAt: new Date() }
                ],
                redoStack: [],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.undo(note);

            expect(result.success).toBe(true);
            expect(result.note.title).toBe('Previous');
            expect(result.note.content).toBe('Previous content');
        });

        test('debe guardar estado actual en redoStack', () => {
            const note = {
                title: 'Current',
                content: 'Current',
                versions: [
                    { title: 'Old', content: 'Old', editedAt: new Date() }
                ],
                redoStack: [],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.undo(note);

            expect(result.note.redoStack).toHaveLength(1);
            expect(result.note.redoStack[0].title).toBe('Current');
        });

        test('debe eliminar versión del historial', () => {
            const note = {
                title: 'Current',
                content: 'Current',
                versions: [
                    { title: 'V1', content: 'C1', editedAt: new Date() },
                    { title: 'V2', content: 'C2', editedAt: new Date() }
                ],
                redoStack: [],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.undo(note);

            expect(result.note.versions).toHaveLength(1);
        });

        test('debe fallar si no hay historial', () => {
            const note = {
                title: 'Current',
                content: 'Current',
                versions: [],
                redoStack: [],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.undo(note);

            expect(result.success).toBe(false);
            expect(result.error).toBe('NO_HISTORY');
        });

        test('debe mantener nota sin cambios si falla', () => {
            const note = {
                title: 'Current',
                content: 'Current',
                versions: [],
                redoStack: [],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.undo(note);

            expect(result.note.title).toBe('Current');
            expect(result.note.content).toBe('Current');
        });
    });

    // ============================================
    // TESTS: redo
    // ============================================

    describe('redo()', () => {
        test('debe rehacer último cambio deshecho', () => {
            const note = {
                title: 'Current',
                content: 'Current',
                versions: [
                    { title: 'V1', content: 'C1', editedAt: new Date() }
                ],
                redoStack: [
                    { title: 'Redone', content: 'Redone content', editedAt: new Date() }
                ],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.redo(note);

            expect(result.success).toBe(true);
            expect(result.note.title).toBe('Redone');
            expect(result.note.content).toBe('Redone content');
        });

        test('debe guardar estado actual en versions', () => {
            const note = {
                title: 'Current',
                content: 'Current',
                versions: [],
                redoStack: [
                    { title: 'Redo', content: 'Redo', editedAt: new Date() }
                ],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.redo(note);

            expect(result.note.versions).toHaveLength(1);
            expect(result.note.versions[0].title).toBe('Current');
        });

        test('debe eliminar del redoStack', () => {
            const note = {
                title: 'Current',
                content: 'Current',
                versions: [],
                redoStack: [
                    { title: 'R1', content: 'C1', editedAt: new Date() },
                    { title: 'R2', content: 'C2', editedAt: new Date() }
                ],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.redo(note);

            expect(result.note.redoStack).toHaveLength(1);
        });

        test('debe fallar si no hay redoStack', () => {
            const note = {
                title: 'Current',
                content: 'Current',
                versions: [],
                redoStack: [],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.redo(note);

            expect(result.success).toBe(false);
            expect(result.error).toBe('NO_REDO');
        });

        test('debe respetar límite de 20 en versions', () => {
            const versions = Array(20).fill(null).map((_, i) => ({
                title: `V${i}`,
                content: `C${i}`,
                editedAt: new Date()
            }));

            const note = {
                title: 'Current',
                content: 'Current',
                versions,
                redoStack: [
                    { title: 'Redo', content: 'Redo', editedAt: new Date() }
                ],
                editedAt: new Date()
            };

            const result = NoteHistoryDomain.redo(note);

            expect(result.note.versions).toHaveLength(20);
        });
    });

    // ============================================
    // TESTS: Flujo Completo undo → redo
    // ============================================

    describe('Flujo undo → redo', () => {
        test('debe permitir undo seguido de redo', () => {
            let note = {
                title: 'V2',
                content: 'C2',
                versions: [
                    { title: 'V1', content: 'C1', editedAt: new Date() }
                ],
                redoStack: [],
                editedAt: new Date()
            };

            // Undo
            let result = NoteHistoryDomain.undo(note);
            expect(result.note.title).toBe('V1');

            // Redo
            result = NoteHistoryDomain.redo(result.note);
            expect(result.note.title).toBe('V2');
        });

        test('debe mantener coherencia en múltiples undo/redo', () => {
            let note = {
                title: 'V3',
                content: 'C3',
                versions: [
                    { title: 'V1', content: 'C1', editedAt: new Date() },
                    { title: 'V2', content: 'C2', editedAt: new Date() }
                ],
                redoStack: [],
                editedAt: new Date()
            };

            // Undo x2
            note = NoteHistoryDomain.undo(note).note;
            note = NoteHistoryDomain.undo(note).note;
            expect(note.title).toBe('V1');
            expect(note.redoStack).toHaveLength(2);

            // Redo x2
            note = NoteHistoryDomain.redo(note).note;
            note = NoteHistoryDomain.redo(note).note;
            expect(note.title).toBe('V3');
            expect(note.redoStack).toHaveLength(0);
        });
    });

});