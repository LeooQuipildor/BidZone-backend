import { Router } from 'express';
import { registrar, iniciarSesion, perfilActual } from '../controladores/autenticacion.controller.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';

const rutas = Router();

rutas.post('/registrar', registrar);
rutas.post('/iniciar-sesion', iniciarSesion);
rutas.get('/perfil', verificarToken, perfilActual);

export default rutas;
