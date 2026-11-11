# BidZone · Backend (Node.js + Express) & Base de Datos (MySQL)

Este directorio contiene la API REST de **BidZone** (Requisito 3 y soporte al Requisito 4), independiente del repositorio del frontend React. Las definiciones SQL y el DER de MySQL (Requisito 5) se encuentran en `database/`.

## Estructura de Carpetas

- `database/schema.sql`: Script DDL que crea la base `bidzone_db` y sus 6 tablas relacionadas (`users`, `auctions`, `bids`, `reports`, `reviews`, `notifications`) con claves primarias, foráneas, `CHECK`, `UNIQUE` e índices.
- `database/seed.sql`: Datos de prueba con contraseñas cifradas mediante bcrypt (sin contraseñas en texto plano).
- `database/DER.md`: Diagrama Entidad–Relación y diccionario de reglas de integridad referencial.
- `src/config/`: Lectura de variables de entorno (`env.js`) y pool de conexiones MySQL con transacciones (`db.js`).
- `src/middlewares/`: Autenticación JWT (`auth.middleware.js`), validaciones de entrada (`validate.middleware.js`) y manejo centralizado de errores (`error.middleware.js`).
- `src/models/`: Consultas SQL parametrizadas con `mysql2/promise` y mapeo de snake_case a JSON camelCase.
- `src/controllers/`: Lógica de negocio (incluyendo reglas `RN01`–`RN08`) y respuestas HTTP coherentes (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`).
- `src/routes/`: Enrutamiento REST por recurso bajo el prefijo `/api`.

## Configuración e Instalación

1. Instalar dependencias del backend:

```bash
npm install
```

2. Crear el archivo `.env` a partir de `.env.example` con tus credenciales locales de MySQL y una clave `JWT_SECRET` segura (nunca subir `.env` al repositorio):

```bash
cp .env.example .env
```

3. Inicializar la base de datos MySQL y cargar los datos de prueba:

```bash
npm run db:init
npm run db:seed
```

4. Iniciar el servidor de desarrollo o producción:

```bash
npm run dev
# o en producción:
npm start
```

5. Ejecutar pruebas automatizadas:

```bash
npm test
```

## Endpoints Principales (`/api`)

- `GET /api/health` — Estado de la API y conexión MySQL.
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` — Autenticación con bcrypt + JWT.
- `GET/POST/PUT/PATCH/DELETE /api/users` — Gestión de usuarios, roles y privacidad de contacto (`RN05`, `RN06`).
- `GET/POST/PUT/PATCH/DELETE /api/auctions` y `POST /api/auctions/:id/close` — Catálogo público, cierre automático y regla de inmutabilidad (`RN03`, `RN05`, `RN08`).
- `GET/POST/PUT/PATCH/DELETE /api/bids` — Pujas vinculantes con transacción SQL y prevención de auto-puja (`RN01`–`RN04`).
- `GET/POST/PUT/PATCH/DELETE /api/reports` — Expedientes de mediación y sanciones administrativas (`RN06`).
- `GET/POST/PUT/PATCH/DELETE /api/reviews` — Reseñas post-cierre y recálculo automático de reputación (`RN07`).
- `GET/POST/PATCH/DELETE /api/notifications` — Bandeja de alertas de sobrepuja, adjudicación y reportes.

