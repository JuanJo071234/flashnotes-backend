// tests/setup.js

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Antes de TODOS los tests
beforeAll(async () => {
    // Crear servidor MongoDB en memoria
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Conectar mongoose
    await mongoose.connect(mongoUri);
});

// Después de CADA test
afterEach(async () => {
    // Limpiar todas las colecciones
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});

// Después de TODOS los tests
afterAll(async () => {
    // Cerrar conexiones
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

// Configuración global de Jest
jest.setTimeout(30000);