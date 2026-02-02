// src/routes/notes.routes.js

const express = require('express');
const router = express.Router();

const noteController = require('../controllers/note.controller');
const validateMongoId = require('../middleware/validateId');


// ======================================================
//  CREACIÓN Y LISTADOS (no requieren validación de ID)
// ======================================================

// Crear una nueva nota
router.post('/', (req, res) =>
    noteController.create(req, res)
);

// Obtener todas las notas activas
router.get('/', (req, res) =>
    noteController.listActive(req, res)
);

// Obtener notas que están en la papelera
router.get('/trash', (req, res) =>
    noteController.listTrash(req, res)
);


// ======================================================
//  OPERACIONES SOBRE UNA NOTA ESPECÍFICA (:id)
//  → Todas pasan por validateMongoId
// ======================================================

// Actualizar contenido de una nota
router.patch('/:id',
    validateMongoId,
    (req, res) => noteController.update(req, res)
);

// Deshacer último cambio (undo)
router.post('/:id/undo',
    validateMongoId,
    (req, res) => noteController.undo(req, res)
);

// Rehacer cambio deshecho (redo)
router.post('/:id/redo',
    validateMongoId,
    (req, res) => noteController.redo(req, res)
);

// Enviar nota a la papelera
router.patch('/:id/trash',
    validateMongoId,
    (req, res) => noteController.moveToTrash(req, res)
);

// Restaurar nota desde la papelera
router.patch('/:id/restore',
    validateMongoId,
    (req, res) => noteController.restore(req, res)
);

// Eliminar nota de forma permanente
router.delete('/:id/permanent',
    validateMongoId,
    (req, res) => noteController.deletePermanently(req, res)
);


module.exports = router;
