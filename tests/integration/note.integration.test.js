// tests/integration/note.integration.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Note = require('../../src/models/Note');

describe('Notes API - Integration Tests', () => {

    // ============================================
    // TESTS: POST /api/notes (Crear)
    // ============================================

    describe('POST /api/notes', () => {
        test('debe crear nota con 201', async () => {
            const response = await request(app)
                .post('/api/notes')
                .send({
                    title: 'Test Note',
                    content: 'Test Content'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body.title).toBe('Test Note');
            expect(response.body.content).toBe('Test Content');
            expect(response.body.versions).toEqual([]);
            expect(response.body.isDeleted).toBe(false);
        });

        test('debe retornar 400 sin title', async () => {
            const response = await request(app)
                .post('/api/notes')
                .send({ content: 'Content only' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        test('debe retornar 400 sin content', async () => {
            const response = await request(app)
                .post('/api/notes')
                .send({ title: 'Title only' });

            expect(response.status).toBe(400);
        });

        test('debe retornar 400 con title vacío', async () => {
            const response = await request(app)
                .post('/api/notes')
                .send({ title: '   ', content: 'Content' });

            expect(response.status).toBe(400);
        });

        test('debe retornar 400 con content vacío', async () => {
            const response = await request(app)
                .post('/api/notes')
                .send({ title: 'Title', content: '   ' });

            expect(response.status).toBe(400);
        });

        test('debe hacer trim de espacios', async () => {
            const response = await request(app)
                .post('/api/notes')
                .send({
                    title: '  Trimmed  ',
                    content: '  Content  '
                });

            expect(response.status).toBe(201);
            expect(response.body.title).toBe('Trimmed');
            expect(response.body.content).toBe('Content');
        });
    });

    // ============================================
    // TESTS: GET /api/notes (Listar)
    // ============================================

    describe('GET /api/notes', () => {
        test('debe listar notas activas', async () => {
            // Crear notas de prueba
            await Note.create({ title: 'Note 1', content: 'Content 1' });
            await Note.create({ title: 'Note 2', content: 'Content 2' });
            await Note.create({ title: 'Deleted', content: 'Content', isDeleted: true });

            const response = await request(app).get('/api/notes');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].title).toBeDefined();
        });

        test('debe retornar array vacío si no hay notas', async () => {
            const response = await request(app).get('/api/notes');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    // ============================================
    // TESTS: GET /api/notes/trash (Papelera)
    // ============================================

    describe('GET /api/notes/trash', () => {
        test('debe listar solo notas eliminadas', async () => {
            await Note.create({ title: 'Active', content: 'Content' });
            await Note.create({
                title: 'Deleted 1',
                content: 'Content',
                isDeleted: true,
                deletedAt: new Date()
            });
            await Note.create({
                title: 'Deleted 2',
                content: 'Content',
                isDeleted: true,
                deletedAt: new Date()
            });

            const response = await request(app).get('/api/notes/trash');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body.every(n => n.isDeleted)).toBe(true);
        });
    });

    // ============================================
    // TESTS: PATCH /api/notes/:id (Actualizar)
    // ============================================

    describe('PATCH /api/notes/:id', () => {
        test('debe actualizar nota correctamente', async () => {
            const note = await Note.create({
                title: 'Original',
                content: 'Original'
            });

            const response = await request(app)
                .patch(`/api/notes/${note._id}`)
                .send({ title: 'Updated' });

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Updated');
            expect(response.body.content).toBe('Original');
            expect(response.body.versions).toHaveLength(2);
        });

        test('debe retornar 404 con ID inexistente', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .patch(`/api/notes/${fakeId}`)
                .send({ title: 'Updated' });

            expect(response.status).toBe(404);
        });

        test('debe retornar 400 con ID inválido', async () => {
            const response = await request(app)
                .patch('/api/notes/invalid-id')
                .send({ title: 'Updated' });

            expect(response.status).toBe(400);
        });

        test('debe retornar 409 en conflicto de concurrencia', async () => {
            const note = await Note.create({
                title: 'Original Title',
                content: 'Original Content'
            });

            // Esperar un momento para asegurar que editedAt está definido
            await new Promise(resolve => setTimeout(resolve, 10));

            const freshNote = await Note.findById(note._id);
            const oldTimestamp = new Date(freshNote.editedAt.getTime() - 1000);

            const response = await request(app)
                .patch(`/api/notes/${note._id}`)
                .send({
                    title: 'Updated',
                    lastKnownUpdate: oldTimestamp.toISOString()
                });

            expect(response.status).toBe(409);
            expect(response.body.error).toBe('Conflict detected');
        });

        test('NO debe crear versión si no hay cambios reales', async () => {
            const note = await Note.create({
                title: 'Same',
                content: 'Same'
            });

            const response = await request(app)
                .patch(`/api/notes/${note._id}`)
                .send({ title: 'Same', content: 'Same' });

            expect(response.status).toBe(200);
            expect(response.body.versions).toHaveLength(0);
        });
    });

    // ============================================
    // TESTS: POST /api/notes/:id/undo
    // ============================================

    describe('POST /api/notes/:id/undo', () => {
        test('debe deshacer cambios correctamente', async () => {
            const note = await Note.create({
                title: 'Version 1',
                content: 'Content 1'
            });

            // Hacer un cambio
            await request(app)
                .patch(`/api/notes/${note._id}`)
                .send({ title: 'Version 2' });

            // Undo
            const response = await request(app)
                .post(`/api/notes/${note._id}/undo`);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Version 1');
            expect(response.body.redoStack).toHaveLength(1);
        });

        test('debe retornar 400 si no hay historial', async () => {
            const note = await Note.create({
                title: 'New',
                content: 'Content'
            });

            const response = await request(app)
                .post(`/api/notes/${note._id}/undo`);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('No history');
        });

        test('debe retornar 404 con ID inexistente', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .post(`/api/notes/${fakeId}/undo`);

            expect(response.status).toBe(404);
        });
    });

    // ============================================
    // TESTS: POST /api/notes/:id/redo
    // ============================================

    describe('POST /api/notes/:id/redo', () => {
        test('debe rehacer cambios correctamente', async () => {
            const note = await Note.create({
                title: 'Version 1',
                content: 'Content 1'
            });

            // Cambio
            await request(app)
                .patch(`/api/notes/${note._id}`)
                .send({ title: 'Version 2' });

            // Undo
            await request(app).post(`/api/notes/${note._id}/undo`);

            // Redo
            const response = await request(app)
                .post(`/api/notes/${note._id}/redo`);

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Version 2');
            expect(response.body.redoStack).toHaveLength(0);
        });

        test('debe retornar 400 si no hay acciones para rehacer', async () => {
            const note = await Note.create({
                title: 'Note',
                content: 'Content'
            });

            const response = await request(app)
                .post(`/api/notes/${note._id}/redo`);

            expect(response.status).toBe(400);
        });
    });

    // ============================================
    // TESTS: PATCH /api/notes/:id/trash
    // ============================================

    describe('PATCH /api/notes/:id/trash', () => {
        test('debe mover nota a papelera', async () => {
            const note = await Note.create({
                title: 'Note',
                content: 'Content'
            });

            const response = await request(app)
                .patch(`/api/notes/${note._id}/trash`);

            expect(response.status).toBe(200);
            expect(response.body.isDeleted).toBe(true);
            expect(response.body.deletedAt).toBeDefined();
        });

        test('debe retornar 404 si nota no existe', async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .patch(`/api/notes/${fakeId}/trash`);

            expect(response.status).toBe(404);
        });
    });

    // ============================================
    // TESTS: PATCH /api/notes/:id/restore
    // ============================================

    describe('PATCH /api/notes/:id/restore', () => {
        test('debe restaurar nota de papelera', async () => {
            const note = await Note.create({
                title: 'Note',
                content: 'Content',
                isDeleted: true,
                deletedAt: new Date()
            });

            const response = await request(app)
                .patch(`/api/notes/${note._id}/restore`);

            expect(response.status).toBe(200);
            expect(response.body.isDeleted).toBe(false);
            expect(response.body.deletedAt).toBe(null);
        });

        test('debe retornar 404 si nota no está en papelera', async () => {
            const note = await Note.create({
                title: 'Active',
                content: 'Content'
            });

            const response = await request(app)
                .patch(`/api/notes/${note._id}/restore`);

            expect(response.status).toBe(404);
        });
    });

    // ============================================
    // TESTS: DELETE /api/notes/:id/permanent
    // ============================================

    describe('DELETE /api/notes/:id/permanent', () => {
        test('debe eliminar permanentemente nota en papelera', async () => {
            const note = await Note.create({
                title: 'Note',
                content: 'Content',
                isDeleted: true,
                deletedAt: new Date()
            });

            const response = await request(app)
                .delete(`/api/notes/${note._id}/permanent`);

            expect(response.status).toBe(204);

            const deleted = await Note.findById(note._id);
            expect(deleted).toBe(null);
        });

        test('debe retornar 404 si nota no está en papelera', async () => {
            const note = await Note.create({
                title: 'Active',
                content: 'Content'
            });

            const response = await request(app)
                .delete(`/api/notes/${note._id}/permanent`);

            expect(response.status).toBe(404);
        });
    });

    // ============================================
    // TESTS: Flujos Complejos
    // ============================================

    describe('Flujos complejos', () => {
        test('flujo completo: crear → editar → undo → redo', async () => {
            // Crear
            let response = await request(app)
                .post('/api/notes')
                .send({ title: 'Version 1', content: 'Content 1' });

            const noteId = response.body._id;
            expect(response.status).toBe(201);

            // Editar
            response = await request(app)
                .patch(`/api/notes/${noteId}`)
                .send({ title: 'Version 2' });
            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Version 2');

            // Undo
            response = await request(app)
                .post(`/api/notes/${noteId}/undo`);
            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Version 1');

            // Redo
            response = await request(app)
                .post(`/api/notes/${noteId}/redo`);
            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Version 2');
        });

        test('flujo: crear → editar → papelera → restaurar → eliminar permanente', async () => {
            // Crear
            let response = await request(app)
                .post('/api/notes')
                .send({ title: 'Note', content: 'Content' });

            const noteId = response.body._id;

            // A papelera
            await request(app).patch(`/api/notes/${noteId}/trash`);

            // Restaurar
            response = await request(app)
                .patch(`/api/notes/${noteId}/restore`);
            expect(response.body.isDeleted).toBe(false);

            // Volver a papelera
            await request(app).patch(`/api/notes/${noteId}/trash`);

            // Eliminar permanente
            response = await request(app)
                .delete(`/api/notes/${noteId}/permanent`);
            expect(response.status).toBe(204);

            // Verificar que ya no existe
            const note = await Note.findById(noteId);
            expect(note).toBe(null);
        });

        test('undo después de edición debe invalidar redo', async () => {
            let response = await request(app)
                .post('/api/notes')
                .send({ title: 'Version 1', content: 'Content 1' });

            const noteId = response.body._id;

            // Edit 1
            await request(app)
                .patch(`/api/notes/${noteId}`)
                .send({ title: 'Version 2' });

            // Undo
            await request(app).post(`/api/notes/${noteId}/undo`);

            // Edit 2 (esto invalida redo)
            await request(app)
                .patch(`/api/notes/${noteId}`)
                .send({ title: 'Version 3' });

            // Intentar redo debe fallar
            response = await request(app)
                .post(`/api/notes/${noteId}/redo`);
            expect(response.status).toBe(400);
        });
    });

    // ============================================
    // TESTS: Seguridad
    // ============================================

    describe('Tests de Seguridad', () => {
        test('debe rechazar title muy largo', async () => {
            const longTitle = 'a'.repeat(201);

            const response = await request(app)
                .post('/api/notes')
                .send({ title: longTitle, content: 'Content' });

            expect(response.status).toBe(400);
        });

        test('debe rechazar content muy largo', async () => {
            const longContent = 'a'.repeat(10001);

            const response = await request(app)
                .post('/api/notes')
                .send({ title: 'Title', content: longContent });

            expect(response.status).toBe(400);
        });

        test('debe sanitizar entrada con espacios', async () => {
            const response = await request(app)
                .post('/api/notes')
                .send({
                    title: '  Spaces  ',
                    content: '  Content  ',
                    extraField: 'ignored'
                });

            expect(response.status).toBe(201);
            expect(response.body.title).toBe('Spaces');
            expect(response.body.content).toBe('Content');
            expect(response.body.extraField).toBeUndefined();
        });

        test('debe manejar caracteres especiales correctamente', async () => {
            const response = await request(app)
                .post('/api/notes')
                .send({
                    title: '<script>alert("xss")</script>',
                    content: 'Content & < >'
                });

            expect(response.status).toBe(201);
            expect(response.body.title).toBe('<script>alert("xss")</script>');
        });
    });

});