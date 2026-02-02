// tests/unit/services/note.service.test.js

const noteService = require('../../../src/services/note.service');
const noteRepository = require('../../../src/repositories/note.repository');
const NoteHistoryDomain = require('../../../src/domain/noteHistory');

// Mock del repository
jest.mock('../../../src/repositories/note.repository');

describe('NoteService - Casos de Uso', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ============================================
    // TESTS: createNote
    // ============================================

    describe('createNote()', () => {
        test('debe crear nota con datos válidos', async () => {
            const mockNote = {
                _id: '507f1f77bcf86cd799439011',
                title: 'Test',
                content: 'Content',
                versions: [],
                redoStack: []
            };

            noteRepository.create.mockResolvedValue(mockNote);

            const result = await noteService.createNote({
                title: 'Test',
                content: 'Content'
            });

            expect(noteRepository.create).toHaveBeenCalledWith({
                title: 'Test',
                content: 'Content'
            });
            expect(result).toEqual(mockNote);
        });
    });

    // ============================================
    // TESTS: updateNote - Conflicto Optimista
    // ============================================

    describe('updateNote() - Protección Optimista', () => {
        test('debe lanzar CONFLICT si timestamps no coinciden', async () => {
            const mockNote = {
                _id: '507f1f77bcf86cd799439011',
                title: 'Current',
                content: 'Content',
                editedAt: new Date('2024-01-01T10:00:00Z'),
                versions: [],
                redoStack: []
            };

            noteRepository.findActiveById.mockResolvedValue(mockNote);

            await expect(
                noteService.updateNote('507f1f77bcf86cd799439011', {
                    title: 'New',
                    lastKnownUpdate: '2024-01-01T09:00:00Z' // Timestamp antiguo
                })
            ).rejects.toThrow('CONFLICT: Note was modified by another session');
        });

        test('debe actualizar si timestamps coinciden', async () => {
            const editedAt = new Date('2024-01-01T10:00:00Z');
            const mockNote = {
                _id: '507f1f77bcf86cd799439011',
                title: 'Current',
                content: 'Content',
                editedAt,
                versions: [],
                redoStack: [],
                save: jest.fn().mockResolvedValue(true)
            };

            noteRepository.findActiveById.mockResolvedValue(mockNote);
            noteRepository.save.mockResolvedValue(mockNote);

            await noteService.updateNote('507f1f77bcf86cd799439011', {
                title: 'Updated',
                lastKnownUpdate: editedAt.toISOString()
            });

            expect(noteRepository.save).toHaveBeenCalled();
        });

        test('debe actualizar sin validación si no se envía lastKnownUpdate', async () => {
            const mockNote = {
                _id: '507f1f77bcf86cd799439011',
                title: 'Current',
                content: 'Content',
                editedAt: new Date(),
                versions: [],
                redoStack: []
            };

            noteRepository.findActiveById.mockResolvedValue(mockNote);
            noteRepository.save.mockResolvedValue(mockNote);

            await noteService.updateNote('507f1f77bcf86cd799439011', {
                title: 'Updated'
            });

            expect(noteRepository.save).toHaveBeenCalled();
        });
    });

    // ============================================
    // TESTS: updateNote - Edición Parcial
    // ============================================

    describe('updateNote() - Edición Parcial', () => {
        test('debe actualizar solo title', async () => {
            const mockNote = {
                title: 'Old Title',
                content: 'Original Content',
                versions: [],
                redoStack: [],
                editedAt: new Date()
            };

            noteRepository.findActiveById.mockResolvedValue(mockNote);
            noteRepository.save.mockImplementation(note => Promise.resolve(note));

            const result = await noteService.updateNote('123', {
                title: 'New Title'
            });

            expect(result.title).toBe('New Title');
            expect(result.content).toBe('Original Content');
        });

        test('debe actualizar solo content', async () => {
            const mockNote = {
                title: 'Original Title',
                content: 'Old Content',
                versions: [],
                redoStack: [],
                editedAt: new Date()
            };

            noteRepository.findActiveById.mockResolvedValue(mockNote);
            noteRepository.save.mockImplementation(note => Promise.resolve(note));

            const result = await noteService.updateNote('123', {
                content: 'New Content'
            });

            expect(result.title).toBe('Original Title');
            expect(result.content).toBe('New Content');
        });
    });

    // ============================================
    // TESTS: undoNote
    // ============================================

    describe('undoNote()', () => {
        test('debe lanzar NOTE_NOT_FOUND si nota no existe', async () => {
            noteRepository.findActiveById.mockResolvedValue(null);

            await expect(
                noteService.undoNote('507f1f77bcf86cd799439011')
            ).rejects.toThrow('NOTE_NOT_FOUND');
        });

        test('debe lanzar error si no hay historial', async () => {
            const mockNote = {
                title: 'Current',
                content: 'Content',
                versions: [],
                redoStack: [],
                editedAt: new Date()
            };

            noteRepository.findActiveById.mockResolvedValue(mockNote);

            await expect(
                noteService.undoNote('507f1f77bcf86cd799439011')
            ).rejects.toThrow('No history available to undo');
        });

        test('debe ejecutar undo correctamente', async () => {
            const mockNote = {
                title: 'Current',
                content: 'Current',
                versions: [
                    { title: 'Previous', content: 'Previous', editedAt: new Date() }
                ],
                redoStack: [],
                editedAt: new Date()
            };

            noteRepository.findActiveById.mockResolvedValue(mockNote);
            noteRepository.save.mockImplementation(note => Promise.resolve(note));

            const result = await noteService.undoNote('123');

            expect(result.title).toBe('Previous');
            expect(result.redoStack).toHaveLength(1);
        });
    });

    // ============================================
    // TESTS: redoNote
    // ============================================

    describe('redoNote()', () => {
        test('debe lanzar error si no hay acciones para rehacer', async () => {
            const mockNote = {
                title: 'Current',
                content: 'Content',
                versions: [],
                redoStack: [],
                editedAt: new Date()
            };

            noteRepository.findActiveById.mockResolvedValue(mockNote);

            await expect(
                noteService.redoNote('507f1f77bcf86cd799439011')
            ).rejects.toThrow('No actions available to redo');
        });

        test('debe ejecutar redo correctamente', async () => {
            const mockNote = {
                title: 'Current',
                content: 'Current',
                versions: [],
                redoStack: [
                    { title: 'Redone', content: 'Redone', editedAt: new Date() }
                ],
                editedAt: new Date()
            };

            noteRepository.findActiveById.mockResolvedValue(mockNote);
            noteRepository.save.mockImplementation(note => Promise.resolve(note));

            const result = await noteService.redoNote('123');

            expect(result.title).toBe('Redone');
            expect(result.redoStack).toHaveLength(0);
        });
    });

    // ============================================
    // TESTS: Papelera
    // ============================================

    describe('moveToTrash()', () => {
        test('debe mover nota a papelera', async () => {
            const mockNote = {
                _id: '123',
                title: 'Note',
                content: 'Content',
                isDeleted: false,
                deletedAt: null
            };

            noteRepository.findActiveById.mockResolvedValue(mockNote);
            noteRepository.save.mockImplementation(note => Promise.resolve(note));

            const result = await noteService.moveToTrash('123');

            expect(result.isDeleted).toBe(true);
            expect(result.deletedAt).toBeInstanceOf(Date);
        });

        test('debe lanzar error si nota no existe', async () => {
            noteRepository.findActiveById.mockResolvedValue(null);

            await expect(
                noteService.moveToTrash('123')
            ).rejects.toThrow('NOTE_NOT_FOUND');
        });
    });

    describe('restoreFromTrash()', () => {
        test('debe restaurar nota de papelera', async () => {
            const mockNote = {
                _id: '123',
                title: 'Note',
                content: 'Content',
                isDeleted: true,
                deletedAt: new Date()
            };

            noteRepository.findDeletedById.mockResolvedValue(mockNote);
            noteRepository.save.mockImplementation(note => Promise.resolve(note));

            const result = await noteService.restoreFromTrash('123');

            expect(result.isDeleted).toBe(false);
            expect(result.deletedAt).toBe(null);
        });

        test('debe lanzar error si nota no está en papelera', async () => {
            noteRepository.findDeletedById.mockResolvedValue(null);

            await expect(
                noteService.restoreFromTrash('123')
            ).rejects.toThrow('NOTE_NOT_IN_TRASH');
        });
    });

    describe('deletePermanently()', () => {
        test('debe eliminar permanentemente solo de papelera', async () => {
            const mockNote = {
                _id: '123',
                isDeleted: true
            };

            noteRepository.findDeletedById.mockResolvedValue(mockNote);
            noteRepository.deletePermanently.mockResolvedValue(true);

            await noteService.deletePermanently('123');

            expect(noteRepository.deletePermanently).toHaveBeenCalledWith('123');
        });

        test('debe lanzar error si nota no está en papelera', async () => {
            noteRepository.findDeletedById.mockResolvedValue(null);

            await expect(
                noteService.deletePermanently('123')
            ).rejects.toThrow('NOTE_NOT_IN_TRASH');
        });
    });

    // ============================================
    // TESTS: Flujo undo → edit → redo
    // ============================================

    describe('Flujo completo: undo → edit → redo', () => {
        test('undo seguido de edit debe invalidar redo', async () => {
            // Estado inicial
            let mockNote = {
                title: 'V2',
                content: 'C2',
                versions: [
                    { title: 'V1', content: 'C1', editedAt: new Date() }
                ],
                redoStack: [],
                editedAt: new Date()
            };

            // Simular undo
            noteRepository.findActiveById.mockResolvedValue(mockNote);
            noteRepository.save.mockImplementation(note => Promise.resolve(note));

            let result = await noteService.undoNote('123');
            expect(result.redoStack).toHaveLength(1);

            // Simular edit (esto debe invalidar redo)
            mockNote = result;
            noteRepository.findActiveById.mockResolvedValue(mockNote);

            result = await noteService.updateNote('123', { title: 'V3' });
            expect(result.redoStack).toHaveLength(0);
        });
    });

});