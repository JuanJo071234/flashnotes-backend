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
   CICLO DE VIDA
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
   TESTS
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

/* ============================================================
   UNDO / REDO
============================================================ */

describe('↩ UNDO / REDO', () => {

    test('Flujo básico undo → redo', async () => {
        const created = await createNote('A', '1');
        const id = created.body._id;

        await update(id, { title: 'B', content: '1' });

        // UNDO → debe volver a A
        const u = await undo(id);
        expect(u.status).toBe(200);
        expect(u.body.title).toBe('A');

        // REDO → debe volver a B
        const r = await redo(id);
        expect(r.status).toBe(200);
        expect(r.body.title).toBe('B');
    });

    test('Multiples undo en cadena respetan el stack real', async () => {
        const { body } = await createNote('v1', 'c1');
        const id = body._id;

        await update(id, { title: 'v2', content: 'c1' });
        await update(id, { title: 'v3', content: 'c1' });
        await update(id, { title: 'v4', content: 'c1' });

        await undo(id); // → v3
        await undo(id); // → v2

        const h = await history(id);

        expect(h.status).toBe(200);

        // Queda 1 paso atrás posible (v1)
        expect(h.body.undoCount).toBe(1);
        expect(h.body.canUndo).toBe(true);

        // Hay 2 redos posibles (v3, v4)
        expect(h.body.canRedo).toBe(true);
        expect(h.body.redoCount).toBe(2);
    });

    test('Redo se limpia tras nueva edición', async () => {
        const { body } = await createNote('x', '1');
        const id = body._id;

        await update(id, { title: 'y', content: '1' });
        await undo(id);

        // Nueva edición → debe eliminar el redoStack
        await update(id, { title: 'z', content: '1' });

        const r = await redo(id);

        expect(r.status).toBe(400);
        expect(r.body.message).toMatch(/rehacer/);
    });

});

/* ============================================================
   LÍMITE DE HISTORIAL
============================================================ */

describe('Límite de historial', () => {

    test('No supera MAX_HISTORY', async () => {
        const { body } = await createNote('init', 'c');
        const id = body._id;

        for (let i = 0; i < 25; i++) {
            await update(id, { title: `t${i}`, content: 'c' });
        }

        const h = await history(id);

        expect(h.body.undoCount).toBeLessThanOrEqual(20);
    });

});

/* ============================================================
   CONFLICTO OPTIMISTA
============================================================ */

describe('Conflicto optimista', () => {

    test('Debe rechazar edición con lastKnownUpdate viejo', async () => {
        const { body } = await createNote('a', 'b');
        const id = body._id;

        const oldDate = body.updatedAt;

        // Otra edición primero
        await update(id, { title: 'nuevo', content: 'b' });

        const conflict = await update(id, {
            title: 'intento',
            content: 'b',
            lastKnownUpdate: oldDate
        });

        expect(conflict.status).toBe(409);
    });

});

/* ============================================================
   PAPELERA
============================================================ */

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

/* ============================================================
   CASOS DE ERROR
============================================================ */

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
