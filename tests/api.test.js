import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.JWT_SECRET = 'clave_de_pruebas_bidzone_segura_32_caracteres';
process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import { formatearUsuario } from '../src/modelos/usuario.model.js';
import { aFechaIso, aFechaMySql } from '../src/utilidades/fecha.js';
import { crearToken, verificarJwt } from '../src/utilidades/token.js';
import { esCorreoValido, leerIdPositivo } from '../src/middlewares/validar.middleware.js';

const carpetaActual = path.dirname(fileURLToPath(import.meta.url));

async function conServidor(ejecutarPruebas) {
  const servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  const { port } = servidor.address();
  const urlBase = `http://127.0.0.1:${port}`;

  try {
    await ejecutarPruebas(urlBase);
  } finally {
    await new Promise((resolver) => servidor.close(resolver));
  }
}

test('El esquema SQL en español tiene 6 tablas y la semilla carga 25 usuarios y 50 subastas', () => {
  const esquema = fs.readFileSync(path.resolve(carpetaActual, '../database/schema.sql'), 'utf8');
  const semilla = fs.readFileSync(path.resolve(carpetaActual, '../database/seed.sql'), 'utf8');

  for (const tabla of ['usuarios', 'subastas', 'pujas', 'reportes', 'resenas', 'notificaciones']) {
    assert.ok(esquema.includes(`CREATE TABLE ${tabla}`), `Falta tabla ${tabla}`);
    assert.ok(semilla.includes(`INSERT INTO ${tabla}`), `Falta seed para ${tabla}`);
  }

  const hashes = semilla.match(/\$2[ab]\$10\$[./A-Za-z0-9]{53}/g) || [];
  assert.equal(hashes.length, 25, 'La semilla debe tener 25 usuarios con bcrypt');

  const subastasSeed = semilla.match(/^\(1[0-5]\d,/gm) || [];
  assert.equal(subastasSeed.length, 50, 'La semilla debe tener exactamente 50 subastas (101 a 150)');
});

test('formatearUsuario devuelve claves en español y nunca expone contrasena_hash', () => {
  const usuario = formatearUsuario({
    id: 1,
    nombre: 'Admin',
    correo: 'admin@bidzone.com',
    contrasena_hash: '$2a$10$secreto',
    rol: 'admin',
    telefono: '123',
    ciudad: 'Tucumán',
    estado: 'activa',
    reputacion: '4.90',
    creado_en: '2026-10-01 10:00:00',
    actualizado_en: '2026-10-01 10:00:00',
  });

  assert.equal('contrasena_hash' in usuario, false);
  assert.equal('contrasenaHash' in usuario, false);
  assert.equal(usuario.nombre, 'Admin');
  assert.equal(usuario.reputacion, 4.9);
});

test('Utilidades de fecha, token y validación funcionan correctamente', () => {
  assert.equal(aFechaMySql('2026-10-01T10:00:00.000Z'), '2026-10-01 10:00:00');
  assert.equal(aFechaIso('2026-10-01 10:00:00'), '2026-10-01T10:00:00.000Z');
  assert.equal(esCorreoValido('socio@bidzone.com'), true);
  assert.equal(esCorreoValido('correo-invalido'), false);
  assert.equal(leerIdPositivo('15'), 15);
  assert.equal(leerIdPositivo('abc'), null);

  const token = crearToken({ id: 7, rol: 'usuario', correo: 'socio@bidzone.com' });
  const datos = verificarJwt(token);
  assert.equal(datos.id, 7);
  assert.equal(datos.rol, 'usuario');
});

test('La API responde correctamente a raíz, rutas privadas sin token, JSON inválido y 404', async () => {
  await conServidor(async (urlBase) => {
    const resRaiz = await fetch(`${urlBase}/`);
    assert.equal(resRaiz.status, 200);

    const resPrivada = await fetch(`${urlBase}/api/usuarios`);
    assert.equal(resPrivada.status, 401);

    const resIdMalo = await fetch(`${urlBase}/api/subastas/abc`);
    assert.equal(resIdMalo.status, 400);

    const resJsonMalo = await fetch(`${urlBase}/api/autenticacion/iniciar-sesion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"correo": roto',
    });
    assert.equal(resJsonMalo.status, 400);

    const resNoExiste = await fetch(`${urlBase}/api/ruta-que-no-existe`);
    assert.equal(resNoExiste.status, 404);
  });
});
