import { Router } from 'express';
import { registrar, iniciarSesion, perfilActual } from '../controladores/autenticacion.controller.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';

const rutas = Router();

rutas.post('/register', registrar);
rutas.post('/login', iniciarSesion);
rutas.get('/me', verificarToken, perfilActual);

export default rutas;
