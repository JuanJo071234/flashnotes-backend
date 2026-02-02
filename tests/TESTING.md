# 🧪 Testing

## 🚀 Comandos para ejecutar

### Ejecutar todos los tests
```bash
npm test
```

### Solo tests unitarios
```bash
npm run test:unit
```

### Solo tests de integración
```bash
npm run test:integration
```

### Generar coverage
```bash
npm run test:coverage
```

### Watch mode (desarrollo)
```bash
npm run test:watch
```

---

## 📊 Estructura de Tests

```text
tests/
├── setup.js                              ← Configuración global
├── unit/
│   ├── domain/
│   │   └── noteHistory.test.js          ← Tests de lógica pura
│   └── services/
│       └── note.service.test.js         ← Tests con mocks
└── integration/
    └── note.integration.test.js         ← Tests end-to-end
```

---

## ✅ Checklist de Cobertura

### Tests de Dominio ✅
- [x] hasRealChanges - todos los casos
- [x] createSnapshot - inmutabilidad
- [x] applyUpdate - primera edición
- [x] applyUpdate - cambios subsecuentes
- [x] applyUpdate - límite de 20
- [x] applyUpdate - sin cambios reales
- [x] undo - éxito y error
- [x] redo - éxito y error
- [x] Flujo undo → redo completo

### Tests de Servicio ✅
- [x] createNote
- [x] updateNote - conflicto optimista 409
- [x] updateNote - edición parcial
- [x] undoNote - con y sin historial
- [x] redoNote - con y sin redo
- [x] moveToTrash
- [x] restoreFromTrash
- [x] deletePermanently
- [x] Flujo undo → edit → redo

### Tests de Integración ✅
- [x] POST /api/notes - 201, 400
- [x] GET /api/notes
- [x] GET /api/notes/trash
- [x] PATCH /api/notes/:id - 200, 404, 400, 409
- [x] POST /api/notes/:id/undo - 200, 400, 404
- [x] POST /api/notes/:id/redo - 200, 400
- [x] PATCH /api/notes/:id/trash
- [x] PATCH /api/notes/:id/restore
- [x] DELETE /api/notes/:id/permanent
- [x] Flujos complejos
- [x] Tests de seguridad

---

## 🎯 Resultado Esperado

Al ejecutar:

```bash
npm test
```

Deberías obtener algo similar a:

```text
PASS tests/unit/domain/noteHistory.test.js
PASS tests/unit/services/note.service.test.js
PASS tests/integration/note.integration.test.js

Test Suites: 3 passed, 3 total
Tests:       70+ passed, 70+ total
Snapshots:   0 total
Time:        8.5s

Coverage:
  domain/noteHistory.js            100%
  services/note.service.js         95%+
  repositories/note.repository.js  90%+
  controllers/note.controller.js   90%+
```
