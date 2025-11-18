# 🏗️ Arquitectura del Backend - Documentación Completa

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Configuración Inicial](#configuración-inicial)
4. [Arquitectura Modular](#arquitectura-modular)
5. [Patrones y Convenciones](#patrones-y-convenciones)
6. [Autenticación y Autorización](#autenticación-y-autorización)
7. [Base de Datos](#base-de-datos)
8. [Validación de Datos](#validación-de-datos)
9. [Manejo de Errores](#manejo-de-errores)
10. [Logging](#logging)
11. [WebSockets](#websockets)
12. [Crear un Nuevo Módulo](#crear-un-nuevo-módulo)
13. [Ejemplos Completos](#ejemplos-completos)
14. [Mejores Prácticas](#mejores-prácticas)

---

## 🎯 Visión General

Este backend está construido con **Node.js**, **Express**, **MySQL** y **Socket.io**, siguiendo una arquitectura modular y escalable. Utiliza:

- **ES6 Modules** (import/export)
- **JWT** para autenticación con refresh tokens
- **RBAC** (Role-Based Access Control) para autorización
- **Soft Delete** para todas las entidades
- **Auditoría** con tracking de `created_by` y `updated_by`
- **Validación centralizada** con express-validator
- **Logging estructurado** con Winston
- **WebSockets** para comunicación en tiempo real

---

## 📁 Estructura del Proyecto

```
server/
├── app.js                          # Punto de entrada principal
├── package.json                    # Dependencias
├── .env                            # Variables de entorno (no incluido en repo)
│
└── src/
    ├── config/
    │   └── db.js                   # Configuración del pool de MySQL
    │
    ├── middlewares/
    │   ├── auth.middleware.js      # Verificación de JWT
    │   ├── authorize.middleware.js # Autorización por roles/permisos
    │   ├── errorHandler.js         # Manejo global de errores
    │   └── validationResult.js     # Validación de express-validator
    │
    ├── modules/                     # Módulos de negocio
    │   ├── Users-Auth/             # Autenticación y usuarios
    │   ├── vehicles/                # Gestión de vehículos
    │   ├── Travels/                # Viajes
    │   └── [Otros módulos...]
    │       ├── controllers/        # Lógica de negocio
    │       ├── models/             # Acceso a base de datos
    │       ├── routes/             # Definición de rutas
    │       ├── validations/        # Validaciones de entrada
    │       └── sockets/            # WebSockets (opcional)
    │
    ├── routes/
    │   └── routes.js               # Router principal que monta todos los módulos
    │
    ├── sockets/
    │   └── sockets.js              # Configuración de Socket.io
    │
    ├── utils/
    │   ├── logger.js               # Configuración de Winston
    │   ├── token.js                # Generación de JWT
    │   └── password.js             # Hashing de contraseñas
    │
    └── validations/
        └── validations.js          # Validaciones genéricas (ej: idParam)
```

---

## ⚙️ Configuración Inicial

### Variables de Entorno (.env)

```env
# Servidor
PORT=4000

# Base de Datos MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=medlearn
DB_PORT=3306

# JWT
JWT_SECRET=tu_secreto_super_seguro
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_SESSION_MAX_AGE=30d
MAX_REFRESH_COUNT=10
```

### Dependencias Principales

```json
{
  "express": "^4.21.2",
  "mysql2": "^3.11.5",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "express-validator": "^7.2.1",
  "socket.io": "^4.8.1",
  "winston": "^3.17.0",
  "dotenv": "^16.4.7",
  "cors": "^2.8.5"
}
```

---

## 🧩 Arquitectura Modular

Cada módulo sigue la estructura **MVC** (Model-View-Controller) adaptada:

- **Models**: Acceso a base de datos (Repository Pattern)
- **Controllers**: Lógica de negocio y manejo de requests
- **Routes**: Definición de endpoints y middlewares
- **Validations**: Reglas de validación con express-validator

### Flujo de una Petición

```
Request
  ↓
CORS Middleware
  ↓
Express JSON Parser
  ↓
Auth Middleware (si requiere autenticación)
  ↓
Validation Middleware
  ↓
Validation Results Check
  ↓
Controller
  ↓
Model (DB Query)
  ↓
Response / Error Handler
```

---

## 🔐 Autenticación y Autorización

### Sistema de Autenticación

**JWT con Refresh Tokens:**

1. **Login**: Usuario recibe `access_token` (15min) y `refresh_token` (UUID almacenado en BD)
2. **Refresh**: El `refresh_token` se rota cada vez que se usa
3. **Límites**: Máximo 10 renovaciones por sesión, sesión máxima de 30 días
4. **Logout**: Revoca el `refresh_token` en la base de datos

### Estructura del Token JWT

```javascript
{
  sub: user_id,           // ID del usuario
  roles: [{               // Roles del usuario
    role_id: 1,
    name: "Admin"
  }],
  isAdmin: true           // Flag de superadmin
}
```

### Middlewares de Autorización

#### 1. `authMiddleware`
Verifica que el token JWT sea válido y lo decodifica en `req.user`

```javascript
// Uso en rutas
router.get('/protected', authMiddleware, controller);
```

#### 2. `canManageEntity(entity, nameId)`
Verifica si el usuario puede gestionar una entidad específica:
- SuperAdmin puede todo
- Usuario que creó la entidad puede modificarla
- Subusuarios del creador pueden modificarla

```javascript
// Uso
router.put('/:id', 
  authMiddleware, 
  canManageEntity('vehiculo', 'idvehiculo'), 
  updateController
);
```

#### 3. `authorize(...permissions)`
Verifica permisos específicos (RBAC)

```javascript
router.post('/', 
  authMiddleware, 
  authorize('create:vehiculo'), 
  createController
);
```

#### 4. `authorizeWhitRol(...roles)`
Verifica roles específicos

```javascript
router.delete('/:id', 
  authMiddleware, 
  authorizeWhitRol('Admin'), 
  deleteController
);
```

---

## 🗄️ Base de Datos

### Pool de Conexiones

```javascript
// config/db.js
import { createPool } from 'mysql2/promise';

export const pool = new createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
```

### Patrón Repository (Models)

Todos los modelos siguen este patrón:

```javascript
export const Entity = {
  // CREATE
  create: async (data, connection = pool) => {
    const [result] = await connection.execute(
      'INSERT INTO entity (...) VALUES (...)',
      [values]
    );
    return result.insertId;
  },

  // READ
  findById: async (id, connection = pool) => {
    const [rows] = await connection.execute(
      'SELECT * FROM entity WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  // UPDATE
  update: async (id, fields, connection = pool) => {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    
    await connection.execute(
      `UPDATE entity SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );
  },

  // SOFT DELETE
  softDelete: async (id, connection = pool) => {
    await connection.execute(
      'UPDATE entity SET deleted_at = NOW() WHERE id = ?',
      [id]
    );
  },

  // GET ALL
  getAll: async (connection = pool) => {
    const [rows] = await connection.execute(
      'SELECT * FROM entity WHERE deleted_at IS NULL'
    );
    return rows;
  }
};
```

### Convenciones de Base de Datos

- **Soft Delete**: Todas las tablas tienen `deleted_at` (NULL = activo)
- **Auditoría**: `created_at`, `updated_at`, `created_by`, `updated_by`
- **Zona Horaria**: Configurada a `-05:00` en el pool

---

## ✅ Validación de Datos

### Express-Validator

Todas las validaciones usan `express-validator`:

```javascript
// validations/entity.validation.js
import { body } from 'express-validator';

export const createEntityValidation = [
  body('name')
    .isString()
    .notEmpty()
    .withMessage('name es obligatorio'),
  body('email')
    .isEmail()
    .withMessage('email debe ser válido'),
  body('age')
    .optional()
    .isInt({ min: 0 })
    .withMessage('age debe ser un entero positivo')
];

export const updateEntityValidation = [
  body('name')
    .optional()
    .isString()
    .notEmpty(),
  // ... otros campos opcionales
];
```

### Uso en Rutas

```javascript
import { validateResults } from '../../../middlewares/validationResult.js';

router.post('/', 
  createEntityValidation, 
  validateResults, 
  createController
);
```

### Validaciones Genéricas

```javascript
// validations/validations.js
import { param } from 'express-validator';

export const idParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID debe ser un entero positivo')
];
```

---

## 🚨 Manejo de Errores

### Middleware Global

```javascript
// middlewares/errorHandler.js
export const errorHandler = (err, req, res, next) => {
    logger.error(`ErrorHandler: ${err.message}`, { 
      stack: err.stack, 
      route: req.originalUrl 
    });
    res.status(500).json({ error: 'Internal Server Error' });
};
```

### En Controladores

```javascript
export const createEntity = async (req, res, next) => {
    try {
        // Lógica...
        res.status(201).json({ data: entity });
    } catch (error) {
        logger.error(`Controller:createEntity Error: ${error.message}`, { 
          stack: error.stack 
        });
        next(error); // Pasa al errorHandler
    }
};
```

### Respuestas Estándar

- **Éxito**: `{ data: ... }`
- **Error de validación**: `{ statusCode: 422, error: [...] }`
- **Error de autenticación**: `{ error: '...' }` (401)
- **Error de autorización**: `{ error: '...' }` (403)
- **Error del servidor**: `{ error: 'Internal Server Error' }` (500)

---

## 📝 Logging

### Configuración Winston

```javascript
// utils/logger.js
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new DailyRotateFile({
            dirname: 'logs',
            filename: 'application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        })
    ]
});
```

### Uso

```javascript
import logger from '../utils/logger.js';

logger.info('Operación exitosa', { userId: 123 });
logger.warn('Advertencia', { data: '...' });
logger.error('Error', { stack: error.stack });
```

---

## 🔌 WebSockets

### Configuración

```javascript
// app.js
import { createServer } from "http";
import { Server } from "socket.io";

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true
    }
});

// Inyectar io en req para uso en controladores
app.use('/api/', (req, res, next) => {
    req.io = io;
    next();
}, routes);
```

### Módulo de Sockets

```javascript
// modules/vehicles/sockets/reserva.sockets.js
export default function reservaSocket(io, socket) {
    socket.on('reserva:create', async (data) => {
        // Lógica...
        io.emit('reserva:created', newReserva);
    });
}
```

### Registro en sockets.js

```javascript
// sockets/sockets.js
import reservaSocket from "../modules/vehicles/sockets/reserva.sockets.js";

export default function socketManager(io) {
    io.on("connection", (socket) => {
        reservaSocket(io, socket);
        // Otros módulos...
    });
}
```

---

## 🆕 Crear un Nuevo Módulo

### Paso 1: Estructura de Carpetas

```
modules/MiModulo/
├── controllers/
│   └── miModulo.controller.js
├── models/
│   └── miModulo.model.js
├── routes/
│   └── miModulo.routes.js
└── validations/
    └── miModulo.validation.js
```

### Paso 2: Modelo

```javascript
// models/miModulo.model.js
import pool from '../../../config/db.js';
import logger from '../../../utils/logger.js';

export const MiModulo = {
  create: async (data, connection = pool) => {
    try {
      const [result] = await connection.execute(
        'INSERT INTO mi_tabla (campo1, campo2, created_at, created_by) VALUES (?, ?, NOW(), ?)',
        [data.campo1, data.campo2, data.created_by]
      );
      return result.insertId;
    } catch (error) {
      logger.error(`[Model]:MiModulo:create Error: ${error.message}`, { stack: error.stack });
      throw error;
    }
  },

  findById: async (id, connection = pool) => {
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM mi_tabla WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      logger.error(`[Model]:MiModulo:findById Error: ${error.message}`, { stack: error.stack });
      throw error;
    }
  },

  getAll: async (connection = pool) => {
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM mi_tabla WHERE deleted_at IS NULL'
      );
      return rows;
    } catch (error) {
      logger.error(`[Model]:MiModulo:getAll Error: ${error.message}`, { stack: error.stack });
      throw error;
    }
  },

  update: async (id, fields, connection = pool) => {
    try {
      const keys = Object.keys(fields);
      const values = Object.values(fields);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      values.push(id);

      await connection.execute(
        `UPDATE mi_tabla SET ${setClause}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        values
      );
    } catch (error) {
      logger.error(`[Model]:MiModulo:update Error: ${error.message}`, { stack: error.stack });
      throw error;
    }
  },

  softDelete: async (id, connection = pool) => {
    try {
      await connection.execute(
        'UPDATE mi_tabla SET deleted_at = NOW() WHERE id = ?',
        [id]
      );
    } catch (error) {
      logger.error(`[Model]:MiModulo:softDelete Error: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }
};
```

### Paso 3: Validaciones

```javascript
// validations/miModulo.validation.js
import { body, param } from 'express-validator';

export const createMiModuloValidation = [
  body('campo1')
    .isString()
    .notEmpty()
    .withMessage('campo1 es obligatorio'),
  body('campo2')
    .isInt({ min: 1 })
    .withMessage('campo2 debe ser un entero positivo')
];

export const updateMiModuloValidation = [
  body('campo1')
    .optional()
    .isString()
    .notEmpty(),
  body('campo2')
    .optional()
    .isInt({ min: 1 })
];
```

### Paso 4: Controlador

```javascript
// controllers/miModulo.controller.js
import { MiModulo } from '../models/miModulo.model.js';
import logger from '../../../utils/logger.js';

export const createMiModulo = async (req, res, next) => {
    try {
        const { campo1, campo2 } = req.body;
        const created_by = req.user?.sub ?? null;

        const id = await MiModulo.create({
            campo1,
            campo2,
            created_by
        });

        const entity = await MiModulo.findById(id);

        logger.info(`MiModuloController:createMiModulo Created id=${id}`);
        res.status(201).json({ data: entity });
    } catch (error) {
        logger.error(`MiModuloController:createMiModulo Error: ${error.message}`, { 
          stack: error.stack 
        });
        next(error);
    }
};

export const getAllMiModulo = async (req, res, next) => {
    try {
        const entities = await MiModulo.getAll();
        logger.info(`MiModuloController:getAllMiModulo Retrieved ${entities.length} entities`);
        res.json({ data: entities });
    } catch (error) {
        logger.error(`MiModuloController:getAllMiModulo Error: ${error.message}`, { 
          stack: error.stack 
        });
        next(error);
    }
};

export const getMiModulo = async (req, res, next) => {
    try {
        const entity = await MiModulo.findById(req.params.id);
        if (!entity) {
            return res.status(404).json({ error: 'Entity not found' });
        }
        res.json({ data: entity });
    } catch (error) {
        logger.error(`MiModuloController:getMiModulo Error: ${error.message}`, { 
          stack: error.stack 
        });
        next(error);
    }
};

export const updateMiModulo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const fields = req.body;

        await MiModulo.update(id, fields);
        const entity = await MiModulo.findById(id);

        logger.info(`MiModuloController:updateMiModulo Updated id=${id}`);
        res.json({ data: entity });
    } catch (error) {
        logger.error(`MiModuloController:updateMiModulo Error: ${error.message}`, { 
          stack: error.stack 
        });
        next(error);
    }
};

export const deleteMiModulo = async (req, res, next) => {
    try {
        await MiModulo.softDelete(req.params.id);
        logger.info(`MiModuloController:deleteMiModulo Deleted id=${req.params.id}`);
        res.status(204).json();
    } catch (error) {
        logger.error(`MiModuloController:deleteMiModulo Error: ${error.message}`, { 
          stack: error.stack 
        });
        next(error);
    }
};
```

### Paso 5: Rutas

```javascript
// routes/miModulo.routes.js
import { Router } from 'express';
import {
    createMiModulo,
    getAllMiModulo,
    getMiModulo,
    updateMiModulo,
    deleteMiModulo
} from '../controllers/miModulo.controller.js';
import { 
    createMiModuloValidation, 
    updateMiModuloValidation 
} from '../validations/miModulo.validation.js';
import { validateResults } from '../../../middlewares/validationResult.js';
import { idParamValidation } from '../../../validations/validations.js';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { canManageEntity } from '../../../middlewares/authorize.middleware.js';

const router = Router();

// Público
router.get('/', getAllMiModulo);

// Protegido
router.post('/', 
    authMiddleware, 
    createMiModuloValidation, 
    validateResults, 
    createMiModulo
);

router.get('/:id', 
    idParamValidation, 
    validateResults, 
    getMiModulo
);

router.put('/:id', 
    authMiddleware, 
    idParamValidation, 
    updateMiModuloValidation, 
    validateResults, 
    canManageEntity('mi_tabla', 'id'), 
    updateMiModulo
);

router.delete('/:id', 
    authMiddleware, 
    idParamValidation, 
    validateResults, 
    canManageEntity('mi_tabla', 'id'), 
    deleteMiModulo
);

export default router;
```

### Paso 6: Registrar en routes.js

```javascript
// routes/routes.js
import miModuloRoutes from "../modules/MiModulo/routes/miModulo.routes.js";

const router = Router();

router.use("/mi-modulo", miModuloRoutes); // /api/mi-modulo

export default router;
```

---

## 📚 Ejemplos Completos

### Ejemplo: Endpoint con WebSocket

```javascript
// controller
export const createReserva = async (req, res, next) => {
    try {
        const reserva = await Reserva.create(req.body);
        
        // Emitir evento WebSocket
        if (req.io) {
            req.io.emit('reserva:created', reserva);
        }
        
        res.status(201).json({ data: reserva });
    } catch (error) {
        next(error);
    }
};
```

### Ejemplo: Endpoint con Filtros

```javascript
// controller
export const getVehiculos = async (req, res, next) => {
    try {
        const { estado, marca } = req.query;
        let query = 'SELECT * FROM vehiculo WHERE deleted_at IS NULL';
        const params = [];

        if (estado) {
            query += ' AND estado = ?';
            params.push(estado);
        }
        if (marca) {
            query += ' AND id_marca = ?';
            params.push(marca);
        }

        const [rows] = await pool.execute(query, params);
        res.json({ data: rows });
    } catch (error) {
        next(error);
    }
};
```

### Ejemplo: Transacciones

```javascript
// controller
export const createOrder = async (req, res, next) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        const orderId = await Order.create(data, connection);
        await OrderItem.create({ order_id: orderId, ...item }, connection);
        
        await connection.commit();
        res.status(201).json({ data: { id: orderId } });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
```

---

## ✨ Mejores Prácticas

### 1. **Nomenclatura**
- **Modelos**: PascalCase (`Vehiculo`, `User`)
- **Controladores**: camelCase (`createVehiculo`, `getAllUsers`)
- **Rutas**: kebab-case en URLs (`/mi-modulo`, `/user-roles`)
- **Archivos**: camelCase con tipo (`vehiculo.controller.js`)

### 2. **Manejo de Errores**
- Siempre usar `try-catch` en controladores
- Pasar errores con `next(error)`
- Loggear todos los errores con contexto

### 3. **Validaciones**
- Validar siempre en la entrada
- Usar `optional()` para campos opcionales en updates
- Mensajes de error claros y descriptivos

### 4. **Logging**
- Loggear operaciones importantes (create, update, delete)
- Incluir contexto relevante (user_id, entity_id)
- Usar niveles apropiados (info, warn, error)

### 5. **Seguridad**
- Nunca exponer contraseñas en respuestas
- Validar permisos antes de operaciones sensibles
- Usar parámetros preparados en queries SQL (prevenir SQL injection)

### 6. **Performance**
- Usar índices en columnas frecuentemente consultadas
- Implementar paginación para listados grandes
- Considerar caché para datos que no cambian frecuentemente

### 7. **Código Limpio**
- Funciones pequeñas y con responsabilidad única
- Evitar código duplicado
- Comentar lógica compleja
- Usar nombres descriptivos

---

## 🔄 Flujo Completo de Autenticación

### 1. Login

```javascript
POST /api/auth/login
Body: { email, password }

Response: {
  access_token: "eyJhbGc...",
  refresh_token: "uuid-v4"
}
```

### 2. Usar Access Token

```javascript
GET /api/protected-route
Headers: { Authorization: "Bearer eyJhbGc..." }
```

### 3. Refresh Token

```javascript
POST /api/auth/refresh
Body: { refresh_token: "uuid-v4" }

Response: {
  access_token: "nuevo-token...",
  refresh_token: "nuevo-uuid-v4"
}
```

### 4. Logout

```javascript
POST /api/auth/logout
Body: { refresh_token: "uuid-v4" }

Response: 204 No Content
```

---

## 📊 Sistema RBAC (Role-Based Access Control)

### Estructura

```
USER
  ↓
USER_ROLE (muchos a muchos)
  ↓
ROLE
  ↓
ROLE_MODULE (muchos a muchos)
  ↓
MODULE
  ↓
MODULE_PERMISSION (muchos a muchos)
  ↓
PERMISSION
  ↓
ROLE_MODULE_PERMISSION (asigna permisos específicos a roles en módulos)
```

### Uso

```javascript
// Verificar si usuario tiene permiso
const hasPermission = await RoleModulePermission.getByUserAndModule({
    userId: req.user.sub,
    moduleId: 1
});

// Verificar si usuario tiene rol
const roles = await UserRole.getRolesByUser(req.user.sub);
const isAdmin = roles.some(r => r.role_id === 1);
```

---

## 🎓 Resumen Rápido

1. **Estructura**: Modular con Models, Controllers, Routes, Validations
2. **Auth**: JWT con refresh tokens rotativos
3. **DB**: MySQL con pool, soft delete, auditoría
4. **Validación**: express-validator centralizado
5. **Errores**: Middleware global + try-catch
6. **Logging**: Winston con rotación diaria
7. **WebSockets**: Socket.io integrado
8. **RBAC**: Sistema completo de roles y permisos

---

## 📝 Notas Finales

- Este backend está diseñado para ser **escalable** y **mantenible**
- Cada módulo es **independiente** y puede desarrollarse por separado
- La arquitectura permite **fácil testing** y **refactoring**
- Sigue **principios SOLID** y **mejores prácticas** de Node.js

---

**Última actualización**: 2024
**Versión**: 1.0.0

