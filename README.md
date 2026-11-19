# BidZone Backend (Node.js + Express + MySQL)

API REST sencilla, clara y organizada en capas en español para gestionar subastas en línea, pujas en vivo, usuarios, reportes, reseñas y notificaciones.

---

## Cómo funciona el flujo completo (de punta a punta)

Cuando el frontend (React) hace una petición HTTP (por ejemplo `POST /api/pujas`), el camino que recorre el código es siempre el mismo:

1. **`src/servidor.js`** — Arranca Express en el puerto configurado (por defecto `3000`) y comprueba la conexión con MySQL.
2. **`src/app.js`** — Configura CORS (para que React en `localhost:5173` pueda conectarse), habilita lectura de JSON y envía todo lo que empiece con `/api` a las rutas.
3. **`src/rutas/*.routes.js`** — Decide qué controlador atiende cada URL y qué middlewares se ejecutan antes (por ejemplo, `verificarToken` o `validarParametroId`).
4. **`src/middlewares/*.middleware.js`** — Son "filtros" previos:
   - `autenticacion.middleware.js`: verifica el token JWT y carga `peticion.usuario`.
   - `validar.middleware.js`: revisa campos obligatorios, IDs positivos, correos y valores permitidos.
   - `errores.middleware.js`: captura cualquier error y responde un JSON prolijo con el código HTTP correcto.
5. **`src/controladores/*.controller.js`** — Contiene las reglas de negocio (RN01 a RN08), valida permisos y decide qué guardar o devolver en `respuesta.status(...).json(...)`.
6. **`src/modelos/*.model.js`** — Ejecuta las consultas SQL contra MySQL usando `consultar()` y `ejecutarTransaccion()` de `src/config/baseDatos.js`.
7. **Respuesta JSON** — El controlador envía los datos al frontend y termina la petición.

---

## Estructura de carpetas

```text
backend/
├── database/
│   ├── schema.sql                    # Crea las 6 tablas en MySQL
│   └── seed.sql                      # Datos de prueba iniciales
├── src/
│   ├── servidor.js                   # Punto de entrada: conecta MySQL y levanta Express
│   ├── app.js                        # Configuración de Express, CORS, JSON y errores
│   ├── config/
│   │   ├── entorno.js                # Lee variables de .env
│   │   └── baseDatos.js              # Pool de MySQL, consultar() y ejecutarTransaccion()
│   ├── baseDatos/
│   │   ├── inicializarBd.js          # Script npm run db:init
│   │   └── sembrarBd.js              # Script npm run db:seed
│   ├── utilidades/
│   │   ├── fecha.js                  # Convierte fechas entre MySQL e ISO UTC
│   │   └── token.js                  # Crea y verifica tokens JWT
│   ├── middlewares/
│   │   ├── autenticacion.middleware.js
│   │   ├── validar.middleware.js
│   │   └── errores.middleware.js
│   ├── modelos/
│   │   ├── usuario.model.js
│   │   ├── subasta.model.js
│   │   ├── puja.model.js
│   │   ├── reporte.model.js
│   │   ├── resena.model.js
│   │   └── notificacion.model.js
│   ├── controladores/
│   │   ├── autenticacion.controller.js
│   │   ├── usuario.controller.js
│   │   ├── subasta.controller.js
│   │   ├── puja.controller.js
│   │   ├── reporte.controller.js
│   │   ├── resena.controller.js
│   │   └── notificacion.controller.js
│   └── rutas/
│       ├── index.js                  # Une todos los módulos bajo /api
│       ├── autenticacion.routes.js
│       ├── usuario.routes.js
│       ├── subasta.routes.js
│       ├── puja.routes.js
│       ├── reporte.routes.js
│       ├── resena.routes.js
│       └── notificacion.routes.js
└── tests/
    └── api.test.js                   # Pruebas automatizadas
```

---

## Endpoints principales (`/api`)

| Módulo | Ruta en Español | Alias en Inglés | Descripción |
| :--- | :--- | :--- | :--- |
| Salud | `GET /api/health` | — | Verifica que el servidor y MySQL respondan |
| Autenticación | `/api/autenticacion` | `/api/auth` | `POST /register`, `POST /login`, `GET /me` |
| Usuarios | `/api/usuarios` | `/api/users` | CRUD de cuentas y privacidad de contacto (RN05) |
| Subastas | `/api/subastas` | `/api/auctions` | Catálogo público, creación, edición y cierre automático |
| Pujas | `/api/pujas` | `/api/bids` | Ofertas en vivo dentro de transacción SQL (RN01–RN04) |
| Reportes | `/api/reportes` | `/api/reports` | Tickets de incumplimiento y sanciones disciplinarias (RN06) |
| Reseñas | `/api/resenas` | `/api/reviews` | Calificaciones 1–5 estrellas y recálculo de reputación (RN07) |
| Notificaciones | `/api/notificaciones` | `/api/notifications` | Avisos personales y marcado como leídas |

---

## Comandos para ejecutar

```bash
npm install        # Instala dependencias
npm run db:init    # Crea la base de datos y las tablas en MySQL
npm run db:seed    # Carga datos de prueba
npm run dev        # Inicia el servidor en modo desarrollo (recarga automática)
npm test           # Ejecuta las pruebas automatizadas
```
