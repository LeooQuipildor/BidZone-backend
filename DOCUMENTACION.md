# Guía de Estudio del Backend de BidZone (Node.js + Express + MySQL)

Esta guía explica **desde cero** cómo funciona todo el backend de BidZone: qué hace cada archivo, cómo se conecta con React y con MySQL, y qué significan los conceptos clave de programación que aparecen en el código.

---

## 1. ¿Qué es este proyecto y para qué sirve?

El **backend** es el programa que corre en un servidor (en tu computadora en `http://localhost:3000`) y hace de puente seguro entre:
- **El Frontend (React)**, que es lo que ve el usuario en el navegador.
- **La Base de Datos (MySQL)**, donde se guardan de forma permanente los usuarios, subastas, pujas, reportes, reseñas y notificaciones.

El frontend **nunca** se conecta directo a MySQL porque cualquier persona podría ver la contraseña de la base de datos o borrar tablas. En cambio, el frontend le pide cosas al backend por **HTTP** (peticiones `GET`, `POST`, `PUT`, `PATCH`, `DELETE`), el backend verifica permisos y reglas de negocio, y solo si todo es válido guarda o lee datos en MySQL.

---

## 2. Recorrido completo de una petición HTTP

Imagina que un usuario hace clic en **"Ofertar $500.000"** en React. Este es el viaje exacto que hace esa petición:

```mermaid
flowchart LR
    React["Frontend React (localhost:5173)"] -->|POST /api/pujas + Token JWT| App["src/app.js (CORS + JSON)"]
    App --> Rutas["src/rutas/index.js -> puja.routes.js"]
    Rutas --> Mw["Middlewares (verificarToken + validar)"]
    Mw --> Ctrl["src/controladores/puja.controller.js (Reglas RN01-RN04)"]
    Ctrl --> Mod["src/modelos/puja.model.js (Consultas SQL)"]
    Mod --> BD[("MySQL (baseDatos.js)")]
    BD -->|Filas guardadas| Mod
    Mod -->|Objeto JSON en español| Ctrl
    Ctrl -->|res.status(201).json(...)| React
```

1. **`src/servidor.js`**: Arranca el servidor al iniciar `npm run dev` y comprueba que MySQL responda.
2. **`src/app.js`**: Recibe la petición, verifica CORS (permite que React se conecte) y convierte el texto JSON que vino en la petición en un objeto de JavaScript (`req.body`).
3. **`src/rutas/*.routes.js`**: Actúa como recepcionista: mira la URL (`/api/pujas`) y el método (`POST`), y la deriva a los middlewares y al controlador correcto.
4. **`src/middlewares/*.middleware.js`**: Son controles de seguridad previos:
   - `verificarToken`: revisa la cabecera `Authorization: Bearer <token>`, comprueba que el token JWT sea real y carga el usuario en `req.usuario`.
   - `validarParametroId`: revisa que el `:id` de la URL sea un número positivo.
   - `exigirRol('admin')`: bloquea el paso si el usuario no es administrador.
5. **`src/controladores/*.controller.js`**: Es el cerebro. Aplica las reglas de negocio (RN01–RN08) y decide qué código HTTP responder.
6. **`src/modelos/*.model.js`**: Es el traductor hacia SQL. Arma las consultas `SELECT`, `INSERT`, `UPDATE`, `DELETE` y convierte las filas de MySQL en objetos JavaScript prolijos.
7. **`src/middlewares/errores.middleware.js`**: Si en cualquier paso anterior ocurre un error (`throw new ErrorApi(...)`), este archivo lo atrapa y devuelve una respuesta JSON ordenada en vez de colgar el servidor.

---

## 3. Conceptos básicos que vas a ver en todo el código

| Concepto | ¿Qué significa en palabras simples? | Ejemplo en BidZone |
| :--- | :--- | :--- |
| **`req`** (Request) | Todo lo que **envía** el frontend al servidor. | `req.body` (datos de formulario), `req.params.id` (`:id` en la URL), `req.query` (`?categoria=Gaming`), `req.headers.authorization` (token JWT), `req.usuario` (usuario logueado). |
| **`res`** (Response) | Lo que el servidor le **responde** al frontend. | `res.status(200).json(subastas)` o `res.status(201).json(creada)`. |
| **`next`** | Función que le dice a Express: *"ya terminé con este middleware, pasá al siguiente"* (o *"hubo un error, andá al manejador de errores"*). | `return next()` o `return next(new ErrorApi(401, '...'))`. |
| **`async / await`** | Sirve para esperar operaciones lentas (como consultar MySQL o encriptar con bcrypt) sin trabar el servidor. | `const usuarios = await modeloUsuario.listarTodos();` |
| **Códigos HTTP** | Números estándar que indican cómo salió la petición. | `200` OK, `201` Creado, `400` Datos inválidos, `401` Sin sesión, `403` Sin permiso, `404` No encontrado, `409` Conflicto/regla de negocio, `500` Error interno. |
| **JWT (Token)** | Credencial firmada digitalmente que el backend entrega al iniciar sesión. El frontend la reenvía en cada petición para demostrar quién es. | `Authorization: Bearer eyJhbGci...` |
| **`bcrypt`** | Encripta contraseñas de forma irreversible antes de guardarlas en MySQL. Al hacer login compara la contraseña ingresada contra el hash guardado. | `bcrypt.hash(contrasena, 10)` y `bcrypt.compare(...)`. |
| **Placeholders `?`** | Signos de pregunta en las consultas SQL. Evitan ataques de **Inyección SQL** porque MySQL separa el código SQL de los datos del usuario. | `SELECT * FROM usuarios WHERE id = ?` |
| **Transacción SQL** | Agrupa varias consultas como un "todo o nada". Si falla la última, MySQL deshace todas las anteriores (`ROLLBACK`). | Al crear una puja: inserta la puja, actualiza el precio de la subasta y crea la notificación en un solo bloque seguro. |

---

## 4. Estructura de carpetas y función de cada archivo

- **`src/servidor.js`**: Punto de entrada. Valida `.env`, prueba MySQL y abre el puerto `3000`.
- **`src/app.js`**: Configura Express (`cors`, `express.json`, rutas `/api` y manejo de errores).
- **`src/config/`**:
  - `entorno.js`: Lee las variables secretas del archivo `.env`.
  - `baseDatos.js`: Crea el pool de conexiones MySQL y exporta `consultar()`, `ejecutarTransaccion()` y `probarConexionBd()`.
- **`src/utilidades/`**:
  - `fecha.js`: Convierte fechas entre el formato de MySQL (`YYYY-MM-DD HH:MM:SS`) y el formato ISO UTC que entiende React.
  - `token.js`: Crea y verifica tokens JWT.
- **`src/middlewares/`**:
  - `autenticacion.middleware.js`: `verificarToken`, `autenticacionOpcional`, `exigirRol`.
  - `validar.middleware.js`: Helpers para validar IDs, correos, campos obligatorios y valores permitidos.
  - `errores.middleware.js`: `ErrorApi`, `atraparErrores`, `rutaNoEncontrada`, `manejarErrores`.
- **`src/modelos/`** (6 archivos): Uno por cada tabla de MySQL (`usuario`, `subasta`, `puja`, `reporte`, `resena`, `notificacion`).
- **`src/controladores/`** (7 archivos): Lógica de negocio de `autenticacion`, `usuario`, `subasta`, `puja`, `reporte`, `resena` y `notificacion`.
- **`src/rutas/`** (8 archivos): `index.js` une los 7 módulos bajo `/api`.
- **`src/baseDatos/`**: Scripts de consola para crear tablas (`npm run db:init`) y cargar 25 usuarios + 50 subastas (`npm run db:seed`).

---

## 5. Reglas de negocio implementadas (RN01 a RN08)

- **RN01**: Toda puja debe ser mayor o igual a `precioActual + incrementoMinimo`.
- **RN02**: El vendedor no puede pujar en su propia subasta.
- **RN03**: No se aceptan pujas si la subasta venció; al vencerse se cierra automáticamente y se asigna ganador.
- **RN04**: Las pujas son vinculantes e irrevocables (el postor acepta el compromiso y luego solo puede editar su nota, nunca el monto ni borrarla).
- **RN05**: El correo y teléfono de los usuarios están ocultos hasta que finalice una subasta donde ambos son vendedor y ganador.
- **RN06**: Los reportes de incumplimiento permiten al administrador suspender o cerrar cuentas infractoras, bloqueando su acceso de inmediato.
- **RN07**: Solo vendedor y ganador pueden calificarse (1 a 5 estrellas) una única vez por subasta finalizada, recalculando automáticamente la reputación promedio.
- **RN08**: Si una subasta ya recibió pujas, el vendedor no puede cambiar precio base, incremento, fecha de cierre ni eliminarla.
