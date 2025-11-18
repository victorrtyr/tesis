# ⚡ Backend - Referencia Rápida

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Producción
npm start
```

## 📋 Estructura de un Módulo

```
modules/MiModulo/
├── controllers/  → Lógica de negocio
├── models/      → Acceso a BD (Repository Pattern)
├── routes/      → Definición de endpoints
└── validations/ → Validaciones express-validator
```

## 🔐 Autenticación

### Middleware
```javascript
import { authMiddleware } from '../../../middlewares/auth.middleware.js';

router.get('/protected', authMiddleware, controller);
```

### Obtener usuario autenticado
```javascript
const userId = req.user?.sub;
const isAdmin = req.user?.isAdmin;
const roles = req.user?.roles;
```

## 🛡️ Autorización

```javascript
// Por entidad (verifica ownership)
canManageEntity('tabla', 'id_columna')

// Por permisos
authorize('create:entity', 'update:entity')

// Por roles
authorizeWhitRol('Admin', 'Manager')
```

## 📝 Modelo (Repository Pattern)

```javascript
export const Entity = {
  create: async (data, connection = pool) => {
    const [result] = await connection.execute(
      'INSERT INTO entity (...) VALUES (...)',
      [values]
    );
    return result.insertId;
  },

  findById: async (id, connection = pool) => {
    const [rows] = await connection.execute(
      'SELECT * FROM entity WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  getAll: async (connection = pool) => {
    const [rows] = await connection.execute(
      'SELECT * FROM entity WHERE deleted_at IS NULL'
    );
    return rows;
  },

  update: async (id, fields, connection = pool) => {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    await connection.execute(
      `UPDATE entity SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );
  },

  softDelete: async (id, connection = pool) => {
    await connection.execute(
      'UPDATE entity SET deleted_at = NOW() WHERE id = ?',
      [id]
    );
  }
};
```

## ✅ Validaciones

```javascript
import { body } from 'express-validator';

export const createValidation = [
  body('name')
    .isString()
    .notEmpty()
    .withMessage('name es obligatorio'),
  body('email')
    .isEmail()
    .withMessage('email inválido')
];

// En rutas
router.post('/', createValidation, validateResults, controller);
```

## 🎮 Controlador

```javascript
export const createEntity = async (req, res, next) => {
    try {
        const { campo1, campo2 } = req.body;
        const created_by = req.user?.sub ?? null;

        const id = await Entity.create({ campo1, campo2, created_by });
        const entity = await Entity.findById(id);

        logger.info(`Controller:createEntity Created id=${id}`);
        res.status(201).json({ data: entity });
    } catch (error) {
        logger.error(`Controller:createEntity Error: ${error.message}`, { 
          stack: error.stack 
        });
        next(error);
    }
};
```

## 🛣️ Rutas

```javascript
import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { validateResults } from '../../../middlewares/validationResult.js';
import { idParamValidation } from '../../../validations/validations.js';

const router = Router();

// Público
router.get('/', getAllController);

// Protegido
router.post('/', authMiddleware, validation, validateResults, createController);
router.get('/:id', idParamValidation, validateResults, getController);
router.put('/:id', authMiddleware, validation, validateResults, updateController);
router.delete('/:id', authMiddleware, idParamValidation, validateResults, deleteController);

export default router;
```

## 🔌 WebSockets

```javascript
// En controlador
if (req.io) {
    req.io.emit('evento:nombre', data);
}

// Módulo de sockets
export default function miSocket(io, socket) {
    socket.on('evento:nombre', async (data) => {
        // Lógica...
        io.emit('evento:respuesta', result);
    });
}
```

## 📊 Respuestas Estándar

```javascript
// Éxito
res.json({ data: entity });
res.status(201).json({ data: entity });

// Error
res.status(404).json({ error: 'Not found' });
res.status(403).json({ error: 'Forbidden' });
res.status(422).json({ statusCode: 422, error: [...] });
```

## 🗄️ Queries Comunes

```javascript
// Con parámetros
const [rows] = await pool.execute(
  'SELECT * FROM table WHERE id = ? AND status = ?',
  [id, status]
);

// Transacciones
const connection = await pool.getConnection();
await connection.beginTransaction();
try {
    await Entity.create(data, connection);
    await connection.commit();
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    connection.release();
}
```

## 📝 Logging

```javascript
import logger from '../utils/logger.js';

logger.info('Mensaje', { contexto: 'data' });
logger.warn('Advertencia', { data });
logger.error('Error', { stack: error.stack });
```

## 🔄 Convenciones

- **Soft Delete**: Siempre usar `deleted_at IS NULL`
- **Auditoría**: Incluir `created_by`, `updated_by`
- **Timestamps**: `created_at`, `updated_at` automáticos
- **Nombres**: camelCase para código, kebab-case para URLs

## 🎯 Checklist para Nuevo Módulo

- [ ] Crear estructura de carpetas
- [ ] Implementar Model (create, findById, getAll, update, softDelete)
- [ ] Crear Validations (create y update)
- [ ] Implementar Controllers (CRUD completo)
- [ ] Definir Routes con middlewares apropiados
- [ ] Registrar en `routes/routes.js`
- [ ] Probar endpoints

## 🔗 Endpoints de Autenticación

```
POST   /api/auth/login      → { email, password }
POST   /api/auth/refresh    → { refresh_token }
POST   /api/auth/logout     → { refresh_token }
```

## 📦 Variables de Entorno

```env
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=medlearn
JWT_SECRET=secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

**Ver documentación completa**: `BACKEND_ARCHITECTURE.md`

