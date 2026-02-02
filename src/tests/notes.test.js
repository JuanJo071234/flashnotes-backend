const request = require('supertest');
const app = require('../app');
const db = require('./setup');

/* ============================================================
   HELPERS
============================================================ */

async function createNote(title = 'T', content = 'C') {
    return request(app)
        .post('/api/notes')
        .send({ title, content });
}

async function update(id, data) {
    return request(app)
        .patch(`/api/notes/${id}`)
        .send(data);
}

async function undo(id) {
    return request(app).patch(`/api/notes/${id}/undo`);
}

async function redo(id) {
    return request(app).patch(`/api/notes/${id}/redo`);
}

async function history(id) {
    return request(app).get(`/api/notes/${id}/history`);
}

/* ============================================================
   🧪 CICLO DE VIDA
============================================================ */

beforeAll(async () => {
    await db.connect();
});

afterEach(async () => {
    await db.clearDatabase();
});

afterAll(async () => {
    await db.closeDatabase();
});

/* ============================================================
   🧪 TESTS REALES
============================================================ */

describe('Core CRUD', () => {

    test('Crear nota válida', async () => {
        const res = await createNote('Hola', 'Mundo');

        expect(res.status).toBe(201);
        expect(res.body.title).toBe('Hola');
        expect(res.body.content).toBe('Mundo');
    });

    test('Validaciones básicas', async () => {
        const res = await createNote('', '');

        expect(res.status).toBe(400);
    });

});

describe('↩UNDO / REDO', () => {

    test('Flujo básico undo → redo', async () => {
        const created = await createNote('A', '1');
        const id = created.body._id;

        await update(id, { title: 'B' });

        const u = await undo(id);
        expect(u.status).toBe(200);
        expect(u.body.title).toBe('A');

        const r = await redo(id);
        expect(r.status).toBe(200);
        expect(r.body.title).toBe('B');
    });

    test('Multiples undo en cadena', async () => {
        const { body } = await createNote('v1', 'c1');
        const id = body._id;

        await update(id, { title: 'v2' });
        await update(id, { title: 'v3' });
        await update(id, { title: 'v4' });

        await undo(id); // → v3
        await undo(id); // → v2

        // 👇 Traemos directamente la nota por ID, no por listado
        const note = await request(app).get(`/api/notes/${id}/history`);
        expect(note.body.canUndo).toBe(true);
        expect(note.body.undoCount).toBe(1);
    });

    test('Redo se limpia tras nueva edición', async () => {
        const { body } = await createNote('x', '1');
        const id = body._id;

        await update(id, { title: 'y' });
        await undo(id);

        // Nueva edición → debe matar redo
        await update(id, { title: 'z' });

        const r = await redo(id);
        expect(r.status).toBe(400);
    });

});

describe('Límite de historial', () => {

    test('No supera MAX_HISTORY', async () => {
        const { body } = await createNote('init', 'c');
        const id = body._id;

        for (let i = 0; i < 25; i++) {
            await update(id, { title: `t${i}` });
        }

        const h = await history(id);

        expect(h.body.undoCount).toBeLessThanOrEqual(20);
    });

});

describe('Conflicto optimista', () => {

    test('Debe rechazar edición con lastKnownUpdate viejo', async () => {
        const { body } = await createNote('a', 'b');
        const id = body._id;

        const oldDate = body.updatedAt;

        await update(id, { title: 'nuevo' });

        const conflict = await update(id, {
            title: 'intento',
            lastKnownUpdate: oldDate
        });

        expect(conflict.status).toBe(409);
    });

});

describe('Papelera', () => {

    test('Trash → restore', async () => {
        const { body } = await createNote('basura', '1');
        const id = body._id;

        await request(app).patch(`/api/notes/${id}/trash`);

        const list = await request(app).get('/api/notes');
        expect(list.body.length).toBe(0);

        await request(app).patch(`/api/notes/${id}/restore`);

        const list2 = await request(app).get('/api/notes');
        expect(list2.body.length).toBe(1);
    });

});

describe('🧪 Casos de error', () => {

    test('Undo sin historial', async () => {
        const { body } = await createNote('solo', '1');

        const res = await undo(body._id);
        expect(res.status).toBe(400);
    });

    test('ID inválido', async () => {
        const res = await request(app)
            .patch('/api/notes/123/undo');

        expect(res.status).toBe(400);
    });

});
