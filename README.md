# BidZone — Backend REST API & Base de Datos MySQL

API REST modular y orientada a objetos desarrollada en **Node.js + Express** con persistencia en **MySQL 8.0+** (`mysql2/promise`). Este backend implementa de forma estricta las reglas de negocio de subastas en vivo (**RN01 a RN08**), autenticación sin estado mediante **JWT**, control de acceso basado en roles (**RBAC**), transacciones ACID para operaciones financieras y un sistema integral de moderación disciplinaria.

---

## 📋 Tabla de Contenidos

1. [¿Cómo Funciona el Backend? (Guía para Principiantes)](#-1-cómo-funciona-el-backend-guía-para-principiantes)
2. [Arquitectura y Ciclo de una Petición HTTP](#-2-arquitectura-y-ciclo-de-una-petición-http)
3. [Estructura del Proyecto](#-3-estructura-del-proyecto)
4. [Reglas de Negocio en el Backend (RN01 – RN08)](#-4-reglas-de-negocio-en-el-backend-rn01--rn08)
5. [Catálogo Completo de Endpoints REST](#-5-catálogo-completo-de-endpoints-rest)
6. [Códigos de Respuesta HTTP](#-6-códigos-de-respuesta-http)
7. [Base de Datos Relacional (MySQL 8.0+)](#-7-base-de-datos-relacional-mysql-80)
8. [Instalación y Puesta en Marcha Paso a Paso](#-8-instalación-y-puesta-en-marcha-paso-a-paso)
9. [Cuentas de Prueba (Datos Semilla)](#-9-cuentas-de-prueba-datos-semilla)
10. [Comandos y Scripts NPM](#-10-comandos-y-scripts-npm)

---

## 📖 1. ¿Cómo Funciona el Backend? (Guía para Principiantes)

Si eres nuevo en desarrollo backend o estás aprendiendo Node.js, este proyecto está diseñado para que puedas leerlo y explicarlo fácilmente:

1. **El cliente (Frontend React) hace una petición:** Por ejemplo, un usuario quiere ofertar $50.000 en una subasta. Envía una petición `POST /api/subastas` con su token de autenticación.
2. **Los Middlewares actúan como "porteros":**
   * Verifican que el token JWT sea válido (`verifyToken`).
   * Comprueban que la cuenta no esté suspendida o sancionada (**RN06**).
   * Verifican que los parámetros numéricos de la URL sean enteros positivos (`validateParamId`).
3. **El Controlador toma las decisiones:**
   * Verifica las reglas de negocio: ¿La subasta sigue activa? ¿El usuario es el vendedor (auto-puja prohibida **RN02**)? ¿El monto supera el precio actual más el incremento mínimo (**RN01**)?
4. **El Modelo habla con MySQL:**
   * Utiliza consultas SQL parametrizadas (`?`) con `mysql2/promise` para proteger contra inyecciones SQL.
   * Ejecuta transacciones SQL (`withTransaction`) para que el dinero y el estado se actualicen de manera atómica (todo se guarda o nada se guarda si hay un error).
5. **Se devuelve una respuesta JSON limpia:**
   * Códigos estándar: `200` (OK), `201` (Creado), `400` (Error de datos), `401` (Sin token), `403` (Prohibido), `404` (No encontrado), `409` (Conflicto de negocio).

---

## 🔄 2. Arquitectura y Ciclo de una Petición HTTP

```text
  [ Cliente Frontend (React) ]
              │  Petición HTTP (ej: POST /api/pujas) + Header "Authorization: Bearer <token>"
              ▼
  [ Express App (src/app.js) ]
              │  Middlewares Globales: CORS + express.json()
              ▼
  [ Enrutador Principal (src/routes/index.js) ]
              │  Deriva a /api/subastas, /api/pujas, /api/usuarios, etc.
              ▼
  [ Middlewares de Seguridad (src/middlewares/) ]
              │  1. verifyToken (valida JWT y estado 'active' del usuario)
              │  2. requireRole (valida permisos de rol 'user' o 'admin')
              │  3. validateParamId (valida parámetros numéricos como :id)
              ▼
  [ Controlador (src/controllers/) ]
              │  Ejecuta la lógica de negocio (RN01 - RN08)
              │  Valida montos, fechas futuras, inmutabilidad y permisos
              ▼
  [ Modelo (src/models/) ]
              │  Ejecuta consultas SQL parametrizadas ("SELECT ... WHERE id = ?")
              │  Gestiona transacciones ACID (BEGIN, COMMIT, ROLLBACK)
              ▼
  [ Base de Datos MySQL 8.0+ ]
              │  Aplica restricciones de integridad: PK, FK, UNIQUE, CHECK
              ▼
  [ Respuesta JSON al Cliente ] (ej: HTTP 201 Created con el objeto puja creado)
```

---

## 📁 3. Estructura del Proyecto

Todo el código fuente se organiza dentro de la carpeta `src/` con responsabilidades claramente separadas:

```text
backend/
├── src/
│   ├── config/
│   │   ├── db.js                 # Pool de conexiones MySQL y función withTransaction
│   │   └── env.js                # Lectura y validación estricta de variables de entorno (.env)
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js     # verifyToken, optionalAuth y requireRole
│   │   ├── validate.middleware.js # parsePositiveId, validateParamId, requireFields, assertPositiveNumber
│   │   └── error.middleware.js    # Clase AppError, asyncHandler y errorHandler centralizado
│   │
│   ├── routes/
│   │   ├── index.js               # Enrutador maestro con rutas en español y alias en inglés
│   │   ├── auth.routes.js         # Rutas de autenticación (/register, /login, /me)
│   │   ├── auction.routes.js      # Rutas de subastas (/api/subastas)
│   │   ├── bid.routes.js          # Rutas de ofertas (/api/pujas)
│   │   ├── report.routes.js       # Rutas de tickets de moderación (/api/reportes)
│   │   ├── review.routes.js       # Rutas de calificaciones post-cierre (/api/resenas)
│   │   ├── user.routes.js         # Rutas de usuarios y perfiles (/api/usuarios)
│   │   └── notification.routes.js # Rutas de avisos (/api/notificaciones)
│   │
│   ├── controllers/               # Lógica de negocio y orquestación HTTP (<= 180 líneas por archivo)
│   │   ├── auth.controller.js
│   │   ├── auction.controller.js
│   │   ├── bid.controller.js
│   │   ├── report.controller.js
│   │   ├── review.controller.js
│   │   ├── user.controller.js
│   │   └── notification.controller.js
│   │
│   ├── models/                    # Consultas SQL con mysql2/promise y mapeo de datos
│   │   ├── auction.model.js
│   │   ├── bid.model.js
│   │   ├── report.model.js
│   │   ├── review.model.js
│   │   ├── user.model.js
│   │   └── notification.model.js
│   │
│   ├── utils/
│   │   ├── date.js                # Conversiones consistentes de fechas a ISO y UTC MySQL
│   │   └── jwt.js                 # Firma y verificación de tokens JSON Web Token
│   │
│   ├── database/
│   │   ├── initDb.js              # Script ejecutable: npm run db:init (ejecuta schema.sql)
│   │   └── seedDb.js              # Script ejecutable: npm run db:seed (ejecuta seed.sql)
│   │
│   ├── app.js                     # Configuración de Express (CORS, JSON parser y rutas)
│   └── server.js                  # Arranque del servidor HTTP en el puerto 3000
│
├── tests/
│   └── api.test.js                # Suite de 8 pruebas automatizadas de integración y controladores
├── package.json
└── README.md
```

---

## ⚖️ 4. Reglas de Negocio en el Backend (RN01 – RN08)

El backend valida y garantiza la integridad de cada una de las 8 reglas del negocio:

| Código | Nombre de la Regla | Controlador y Modelo | Comportamiento en la API |
| :--- | :--- | :--- | :--- |
| **RN01** | **Incremento Mínimo** | `bid.controller.js` | `amount >= current_price + min_increment`. Si no cumple, responde `400 Bad Request`. |
| **RN02** | **Prohibición de Auto-puja** | `bid.controller.js` | `auction.seller_id !== user.id`. Si el vendedor intenta ofertar en su subasta, responde `403 Forbidden`. |
| **RN03** | **Vigencia Temporal** | `auction.model.js` (`syncExpiredAuctions`) | Solo se admiten ofertas si `status = 'activa'` y `end_time > now()`. Si venció, responde `409 Conflict`. Antes de cada listado o puja, `syncExpiredAuctions` cierra automáticamente las vencidas y asigna al ganador. |
| **RN04** | **Irrevocabilidad de Ofertas** | `bid.controller.js` | Exige `commitmentAccepted === true` al ofertar. Un postor no puede eliminar su puja ni reducir el monto (`PUT /api/pujas/:id` solo permite editar la nota de coordinación; si intenta cambiar el monto responde `403 Forbidden`). |
| **RN05** | **Liberación Condicional de Datos** | `auction.controller.js` y `user.controller.js` | En subastas activas, `email` y `phone` permanecen ocultos. Solo cuando la subasta está `finalizada` con ganador adjudicado, el vendedor y el ganador pueden ver mutuamente sus datos de contacto directo. |
| **RN06** | **Régimen de Infracciones** | `report.controller.js` y `auth.middleware.js` | Un usuario reportado puede ser advertido, suspendido o cerrado por un administrador. Si una cuenta tiene estado `'suspended'` o `'closed'`, los middlewares bloquean automáticamente su inicio de sesión o acciones con `403 Forbidden`. |
| **RN07** | **Calificación Mutua Única** | `review.controller.js` y `review.model.js` | Solo vendedor y ganador pueden calificarse tras el cierre formal con ganador. Se restringe a un máximo de **1 reseña por parte y subasta** (`409 Conflict` si ya calificó). Recalcula automáticamente el promedio en `users.reputation`. |
| **RN08** | **Inmutabilidad por Oferta** | `auction.controller.js` | Si la subasta ya tiene al menos una puja (`countBids > 0`), el vendedor no puede alterar el precio base, el incremento mínimo ni la fecha de cierre (`409 Conflict`). Tampoco puede eliminar la subasta (`409 Conflict`). |

---

## 🔌 5. Catálogo Completo de Endpoints REST

La API responde tanto en las rutas principales en **español** como en sus alias equivalentes en **inglés**:

### 1. Autenticación (`/api/autenticacion` o `/api/auth`)
* `POST /api/autenticacion/register` — Registra un nuevo usuario con rol `user` y hashea la contraseña con `bcrypt`. Devuelve `{ token, user }` (`201 Created`).
* `POST /api/autenticacion/login` — Verifica email y contraseña, comprueba estado activo y devuelve `{ token, user }` (`200 OK`).
* `GET /api/autenticacion/me` — *(Autenticado)* Retorna los datos del usuario en sesión (`200 OK`).

### 2. Subastas (`/api/subastas` o `/api/auctions`)
* `GET /api/subastas` — *(Público)* Lista subastas con filtros opcionales (`?category=Tecnología&status=activa&search=laptop&sortBy=endingSoon`).
* `GET /api/subastas/:id` — *(Público / Autenticado)* Obtiene el detalle de la subasta, historial de pujas y aplica la regla de liberación de contacto **RN05**.
* `POST /api/subastas` — *(Autenticado)* Publica una nueva subasta activa (`title`, `basePrice`, `minIncrement`, `endTime`).
* `PUT /api/subastas/:id` — *(Vendedor / Admin)* Modifica datos de la subasta respetando la inmutabilidad **RN08**.
* `DELETE /api/subastas/:id` — *(Vendedor / Admin)* Elimina una subasta si no tiene pujas comprometidas, o cancela si es moderador admin.

### 3. Pujas / Ofertas (`/api/pujas` o `/api/bids`)
* `GET /api/pujas` — *(Autenticado)* Lista ofertas registradas (admite filtros `?auctionId=1` o `?bidderId=2`).
* `GET /api/pujas/:id` — *(Autenticado)* Obtiene el detalle de una puja por ID.
* `POST /api/pujas` — *(Autenticado)* Registra una puja vinculante en transacción SQL, valida **RN01, RN02, RN03, RN04** y notifica al postor superado.
* `PUT /api/pujas/:id` — *(Postor Titular)* Actualiza la nota de coordinación de la puja.
* `DELETE /api/pujas/:id` — *(Solo Admin)* Da de baja una puja irregular y recalcula el precio actual de la subasta.

### 4. Tickets de Reporte (`/api/reportes` o `/api/reports`)
* `GET /api/reportes` — *(Autenticado)* Lista los reportes propios (o todos si quien consulta es admin).
* `GET /api/reportes/:id` — *(Autenticado)* Consulta el expediente de un reporte.
* `POST /api/reportes` — *(Autenticado)* Abre un reclamo formal sobre una operación (**RN06**).
* `PATCH /api/reportes/:id` — *(Denunciante / Admin)* El denunciante puede actualizar evidencia; el administrador resuelve el ticket y aplica sanciones (`suspend`, `close`, `activate`).
* `DELETE /api/reportes/:id` — *(Admin)* Elimina un expediente de reporte.

### 5. Calificaciones / Reseñas (`/api/resenas` o `/api/reviews`)
* `GET /api/resenas` — *(Autenticado)* Lista calificaciones registradas (`?auctionId=1`, `?targetUserId=2`).
* `GET /api/resenas/:id` — *(Autenticado)* Consulta una reseña individual.
* `POST /api/resenas` — *(Autenticado)* Registra calificación única (1 a 5 estrellas) tras el cierre formal (**RN07**) y recalcula la reputación.
* `PUT /api/resenas/:id` — *(Autor)* Modifica comentario o puntuación de una reseña propia.
* `DELETE /api/resenas/:id` — *(Autor / Admin)* Elimina una calificación y actualiza el promedio de reputación.

### 6. Usuarios (`/api/usuarios` o `/api/users`)
* `GET /api/usuarios` — *(Autenticado)* Lista usuarios (datos públicos para usuarios estándar; padrón completo para admin).
* `GET /api/usuarios/:id` — *(Autenticado)* Detalle de un usuario específico.
* `POST /api/usuarios` — *(Solo Admin)* Crea un usuario con rol y estado disciplinario personalizado.
* `PUT /api/usuarios/:id` — *(Dueño / Admin)* Actualiza información de contacto o rol/estado (solo admin).
* `DELETE /api/usuarios/:id` — *(Solo Admin)* Da de baja una cuenta.

### 7. Notificaciones (`/api/notificaciones` o `/api/notifications`)
* `GET /api/notificaciones` — *(Autenticado)* Bandeja personal de avisos (`?unread=true` para no leídas).
* `POST /api/notificaciones` — *(Solo Admin)* Emite una notificación oficial a un usuario.
* `PATCH /api/notificaciones/:id/read` — *(Autenticado)* Marca una notificación como leída.
* `PATCH /api/notificaciones/read-all` — *(Autenticado)* Marca todas las notificaciones del usuario como leídas.
* `DELETE /api/notificaciones/:id` — *(Autenticado)* Elimina una notificación de la bandeja.

### 8. Salud del Servidor
* `GET /api/health` — *(Público)* Verifica el estado del servidor Express y la conexión con MySQL.

---

## 🚦 6. Códigos de Respuesta HTTP

El backend utiliza códigos de estado semánticos estándar:

| Código | Significado | ¿Cuándo se utiliza? |
| :--- | :--- | :--- |
| `200 OK` | Operación exitosa | Consultas (`GET`), actualizaciones (`PUT`, `PATCH`) y eliminaciones confirmadas. |
| `201 Created` | Recurso creado | Registro de usuario, publicación de subasta, creación de puja, reporte o reseña. |
| `400 Bad Request` | Petición inválida | Faltan campos obligatorios (`requireFields`), email con formato incorrecto o ID no numérico. |
| `401 Unauthorized` | No autenticado | No se envió el header `Authorization: Bearer <token>` o el token JWT expiró. |
| `403 Forbidden` | Acceso denegado | Auto-puja prohibida (**RN02**), cuenta suspendida (**RN06**), o acción exclusiva de administrador. |
| `404 Not Found` | No encontrado | La subasta, puja, usuario o reporte solicitado no existe en la base de datos. |
| `409 Conflict` | Conflicto de estado | Subasta ya cerrada (**RN03**), reseña duplicada (**RN07**), alteración de condiciones bloqueadas (**RN08**). |
| `500 Server Error` | Error no controlado | Error de servidor o fallo no capturado (registrado en consola). |

---

## 🗄️ 7. Base de Datos Relacional (MySQL 8.0+)

El esquema de base de datos se encuentra definido en `../database/schema.sql` y normalizado en **3FN**:

1. **`users`**: Padrón de cuentas con hash bcrypt, rol (`'user' | 'admin'`), estado disciplinario (`'active' | 'warned' | 'suspended' | 'closed'`) y reputación promedio (`0.00` a `5.00`).
2. **`auctions`**: Publicaciones con precio base, precio actual, incremento mínimo, fecha/hora de cierre, estado (`'activa' | 'finalizada' | 'cancelada'`), vendedor (`seller_id`) y ganador adjudicado (`winner_id`).
3. **`bids`**: Registro histórico de ofertas vinculantes con monto, postor (`bidder_id`), subasta (`auction_id`) y aceptación de compromiso vinculante.
4. **`reports`**: Tickets de denuncia e infracción (**RN06**) entre participantes con motivo, descripción, url de evidencia y resolución administrativa con sanción.
5. **`reviews`**: Calificaciones mutuas post-cierre (**RN07**) con puntuación de 1 a 5 estrellas, comentario y restricción de unicidad `UNIQUE (auction_id, reviewer_id)`.
6. **`notifications`**: Bandeja de alertas del sistema (`outbid`, `won`, `closed`, `report`, `system`).

---

## ⚙️ 8. Instalación y Puesta en Marcha Paso a Paso

### Paso 1: Requisitos previos
- **Node.js** versión 18 o superior (`node -v`).
- **MySQL Server** 8.0 o superior ejecutándose en tu equipo (`localhost:3306`).

### Paso 2: Instalar dependencias
Desde la carpeta `backend`:
```bash
npm install
```

### Paso 3: Configurar variables de entorno
Crea un archivo llamado `.env` en la raíz de `backend` tomando como guía `.env.example`:
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contrasena_de_mysql
DB_NAME=bidzone_db
JWT_SECRET=clave_secreta_super_segura_de_al_menos_32_caracteres_bidzone
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```
*(Nota: Si la base de datos `bidzone_db` aún no existe en MySQL, puedes crearla ejecutando `CREATE DATABASE IF NOT EXISTS bidzone_db;`).*

### Paso 4: Inicializar la base de datos y cargar datos semilla
Ejecuta los dos scripts automatizados:
```bash
# Crea las 6 tablas con sus claves foráneas e índices:
npm run db:init

# Carga los 15 usuarios, 40 subastas, pujas, reportes y calificaciones de prueba:
npm run db:seed
```

### Paso 5: Iniciar el servidor
```bash
# Modo desarrollo con recarga automática al guardar cambios:
npm run dev

# O modo estándar de producción:
npm start
```
El servidor quedará disponible en `http://localhost:3000`. Puedes verificar que está funcionando abriendo en el navegador:
`http://localhost:3000/api/health`

### Paso 6: Ejecutar las pruebas automatizadas
Para comprobar que todos los controladores y reglas de negocio funcionan al 100%:
```bash
npm test
```
*(Ejecuta la suite nativa de Node.js con 8 pruebas de integración).*

---

## 👥 9. Cuentas de Prueba (Datos Semilla)

Al ejecutar `npm run db:seed`, se insertan usuarios de demostración con contraseñas cifradas en bcrypt:

| Rol | Nombre | Correo Electrónico | Contraseña |
| :--- | :--- | :--- | :--- |
| **Administrador** | AdminModerador | `admin@bidzone.com` | `admin123` |
| **Usuario** | Martín Gómez | `martin.gomez@email.com` | `user123` |
| **Usuario** | Lucía Fernández | `lucia.fernandez@email.com` | `user123` |
| **Usuario** | Carlos Ruiz | `carlos.ruiz@email.com` | `user123` |
| **Usuario** | Ana Martínez | `ana.martinez@email.com` | `user123` |
| **Usuarios adicionales (x10)** | Sofía, Mateo, Valentina, Lucas, Camila, Nicolás, Julieta, Tomás, Florencia, Joaquín | `sofia@bidzone.com`, `mateo@bidzone.com`, etc. | `user123` |

---

## 📜 10. Comandos y Scripts NPM

| Comando | Acción |
| :--- | :--- |
| `npm run dev` | Inicia la API con recarga automática en desarrollo (`node --watch src/server.js`). |
| `npm start` | Inicia el servidor en modo producción (`node src/server.js`). |
| `npm run db:init` | Lee `../database/schema.sql` y crea las 6 tablas en MySQL. |
| `npm run db:seed` | Lee `../database/seed.sql` e inserta los datos de prueba iniciales. |
| `npm test` | Ejecuta las pruebas automatizadas unitarias y de integración (`node --test tests/api.test.js`). |
