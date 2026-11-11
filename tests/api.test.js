import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

process.env.JWT_SECRET = 'test_secret_key_bidzone_minimum_32_chars';
process.env.NODE_ENV = 'test';

import { signToken } from '../src/utils/jwt.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.middleware.js';
import { validateParamId } from '../src/middlewares/validate.middleware.js';
import {
  AppError,
  errorHandler,
  notFoundHandler,
} from '../src/middlewares/error.middleware.js';
import { createAuthController } from '../src/controllers/auth.controller.js';
import { createAuctionController } from '../src/controllers/auction.controller.js';
import { createBidController } from '../src/controllers/bid.controller.js';
import { createReviewController } from '../src/controllers/review.controller.js';
import { createReportController } from '../src/controllers/report.controller.js';
import { mapUserRow } from '../src/models/user.model.js';
import { createApp } from '../src/app.js';
import { formatDatabaseError } from '../src/config/db.js';
import { validateEnv } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function withServer(setupFn, runFn) {
  const app = express();
  app.use(express.json());
  setupFn(app);
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await runFn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('Esquema y datos semilla SQL cumplen mínimo de 5 tablas relacionadas y hashes bcrypt', () => {
  const schemaPath = path.resolve(__dirname, '../database/schema.sql');
  const seedPath = path.resolve(__dirname, '../database/seed.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const seed = fs.readFileSync(seedPath, 'utf8');

  const tables = schema.match(/CREATE TABLE\s+\w+/gi) || [];
  const fks = schema.match(/FOREIGN KEY\s*\(/gi) || [];
  assert.ok(tables.length >= 5, `Esperadas >= 5 tablas, encontradas: ${tables.length}`);
  assert.ok(fks.length >= 6, `Esperadas relaciones FK entre tablas, encontradas: ${fks.length}`);

  for (const table of ['users', 'auctions', 'bids', 'reports', 'reviews', 'notifications']) {
    assert.ok(
      seed.includes(`INSERT INTO ${table}`),
      `El seed SQL debe poblar la tabla ${table}`
    );
  }
  const bcryptMatches = seed.match(/\$2[ab]\$10\$[./A-Za-z0-9]{53}/g) || [];
  assert.ok(bcryptMatches.length >= 4, 'Todos los usuarios semilla deben usar hash bcrypt válido');
});

test('mapUserRow nunca expone password_hash', () => {
  const mapped = mapUserRow({
    id: 1,
    name: 'Admin',
    email: 'admin@bidzone.com',
    password_hash: '$2a$10$secrethashshouldneverleak',
    role: 'admin',
    phone: '123',
    city: 'Tucumán',
    status: 'active',
    reputation: '4.90',
    created_at: '2026-10-01 10:00:00',
    updated_at: '2026-10-01 10:00:00',
  });
  assert.equal('password_hash' in mapped, false);
  assert.equal('passwordHash' in mapped, false);
  assert.equal(mapped.reputation, 4.9);
});

test('Middlewares de autenticación, roles (RN06) y validación de :id', async () => {
  const usersById = new Map([
    [1, { id: 1, email: 'admin@bidzone.com', role: 'admin', status: 'active' }],
    [2, { id: 2, email: 'mario@bidzone.com', role: 'user', status: 'active' }],
    [4, { id: 4, email: 'val@correo.com', role: 'user', status: 'suspended' }],
  ]);

  const { verifyToken, requireRole } = createAuthMiddlewares({
    findUserById: async (id) => usersById.get(Number(id)) || null,
  });

  await withServer(
    (app) => {
      app.get('/private', verifyToken, (req, res) => res.json({ user: req.user }));
      app.get('/admin-only', verifyToken, requireRole('admin'), (_req, res) =>
        res.json({ ok: true })
      );
      app.get('/items/:id', validateParamId('id'), (req, res) =>
        res.json({ id: req.params.id })
      );
    },
    async (baseUrl) => {
      // Sin token -> 401
      const resNoAuth = await fetch(`${baseUrl}/private`);
      assert.equal(resNoAuth.status, 401);

      // Token usuario suspendido -> 403 (RN06)
      const suspendedToken = signToken(usersById.get(4));
      const resSuspended = await fetch(`${baseUrl}/private`, {
        headers: { Authorization: `Bearer ${suspendedToken}` },
      });
      assert.equal(resSuspended.status, 403);

      // Usuario común a ruta admin -> 403
      const userToken = signToken(usersById.get(2));
      const resForbidden = await fetch(`${baseUrl}/admin-only`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.equal(resForbidden.status, 403);

      // Admin autorizado -> 200
      const adminToken = signToken(usersById.get(1));
      const resAdmin = await fetch(`${baseUrl}/admin-only`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(resAdmin.status, 200);

      // ID inválido -> 400
      const resBadId = await fetch(`${baseUrl}/items/abc`);
      assert.equal(resBadId.status, 400);

      // Ruta inexistente -> 404
      const resNotFound = await fetch(`${baseUrl}/no-existe`);
      assert.equal(resNotFound.status, 404);
    }
  );
});

test('errorHandler mapea errores MySQL y JSON malformado correctamente', async () => {
  await withServer(
    (app) => {
      app.post('/echo', (req, res) => res.json(req.body));
      app.get('/dup', () => {
        const err = new Error('Duplicate');
        err.code = 'ER_DUP_ENTRY';
        throw err;
      });
      app.get('/fk-ref', () => {
        const err = new Error('Referenced');
        err.code = 'ER_ROW_IS_REFERENCED_2';
        throw err;
      });
      app.get('/app-err', () => {
        throw new AppError(409, 'Conflicto de negocio');
      });
    },
    async (baseUrl) => {
      const badJson = await fetch(`${baseUrl}/echo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad',
      });
      assert.equal(badJson.status, 400);

      const dupRes = await fetch(`${baseUrl}/dup`);
      assert.equal(dupRes.status, 409);

      const fkRes = await fetch(`${baseUrl}/fk-ref`);
      assert.equal(fkRes.status, 409);

      const appRes = await fetch(`${baseUrl}/app-err`);
      assert.equal(appRes.status, 409);
    }
  );
});

test('Auth controller: registro fuerza rol user y login bloquea cuentas suspendidas', async () => {
  const authCtrl = createAuthController({
    userModel: {
      existsByEmail: async () => false,
      create: async (data) => ({ id: 10, ...data }),
      findAuthByEmail: async (email) =>
        email === 'suspended@bidzone.com'
          ? {
              id: 4,
              name: 'Suspended',
              email,
              role: 'user',
              status: 'suspended',
              passwordHash: 'hashed',
            }
          : null,
    },
    hash: async (pw) => `hashed:${pw}`,
    compare: async () => true,
  });

  await withServer(
    (app) => {
      app.post('/auth/register', authCtrl.register);
      app.post('/auth/login', authCtrl.login);
    },
    async (baseUrl) => {
      // Intento de escalación enviando role: 'admin' debe ser ignorado
      const regRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Nuevo Socio',
          email: 'socio@bidzone.com',
          password: 'password123',
          role: 'admin',
        }),
      });
      assert.equal(regRes.status, 201);
      const regData = await regRes.json();
      assert.equal(regData.user.role, 'user');
      assert.ok(regData.token);

      const suspendedLogin = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'suspended@bidzone.com',
          password: 'password123',
        }),
      });
      assert.equal(suspendedLogin.status, 403);
    }
  );
});

test('Reglas de negocio RN01-RN08 en subastas, pujas, reseñas y reportes', async () => {
  const futureIso = new Date(Date.now() + 3600 * 1000).toISOString();
  const mockUsers = {
    1: { id: 1, role: 'admin', status: 'active' },
    2: { id: 2, role: 'user', status: 'active' },
    3: { id: 3, role: 'user', status: 'active' },
    5: { id: 5, role: 'user', status: 'active' },
  };
  const { verifyToken, optionalAuth } = createAuthMiddlewares({
    findUserById: async (id) => mockUsers[Number(id)] || null,
  });

  const notifications = [];
  const fakeAuctionRaw = {
    id: 103,
    title: 'Silla Herman Miller',
    description: 'Excelente',
    category: 'Hogar',
    image_url: '',
    base_price: 800000,
    current_price: 920000,
    min_increment: 30000,
    seller_id: 2,
    winner_id: 3,
    status: 'finalizada',
    end_time: '2026-10-01 10:00:00',
    created_at: '2026-09-29 10:00:00',
    updated_at: '2026-10-01 10:00:00',
    seller_name: 'Mario',
    seller_email: 'mario@bidzone.com',
    seller_phone: '+54 9 381 555-0202',
    seller_city: 'Tucumán',
    seller_reputation: 4.8,
    winner_name: 'Luciano',
    winner_email: 'luciano@bidzone.com',
    winner_phone: '+54 9 381 555-0303',
    winner_city: 'Tucumán',
    winner_reputation: 4.7,
    bid_count: 1,
  };

  const auctionCtrl = createAuctionController({
    auctionModel: {
      syncExpiredAuctions: async () => 0,
      findByIdRaw: async () => fakeAuctionRaw,
      mapAuctionRow: (r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        sellerId: r.seller_id,
        winnerId: r.winner_id,
        basePrice: r.base_price,
        currentPrice: r.current_price,
        minIncrement: r.min_increment,
        endTime: r.end_time,
      }),
      findById: async () => ({
        id: 101,
        sellerId: 2,
        basePrice: 1000,
        minIncrement: 100,
        endTime: futureIso,
        status: 'activa',
      }),
      countBids: async () => 2,
      create: async (data) => ({ id: 109, ...data }),
      update: async (_id, updates) => ({ id: 101, ...updates }),
    },
    bidModel: {
      findAll: async () => [],
    },
  });

  let recalculatedPriceAuctionId = null;
  const bidCtrl = createBidController({
    auctionModel: {
      syncExpiredAuctions: async () => 0,
      findByIdForUpdate: async () => ({
        id: 101,
        title: 'MacBook',
        seller_id: 2,
        status: 'activa',
        current_price: 1000,
        min_increment: 100,
        end_time: futureIso,
      }),
    },
    bidModel: {
      findTopBidByAuction: async () => ({ bidderId: 5, amount: 1000 }),
      create: async (_conn, data) => ({ id: 501, ...data }),
      findById: async (id) =>
        id === 501
          ? { id: 501, auctionId: 101, bidderId: 3, amount: 1100, note: 'Original' }
          : null,
      update: async (_conn, id, updates) => ({
        id,
        auctionId: 101,
        bidderId: 3,
        amount: updates.amount ?? 1100,
        note: updates.note ?? 'Original',
      }),
      recalculateAuctionPrice: async (_conn, auctionId) => {
        recalculatedPriceAuctionId = auctionId;
      },
    },
    withTransaction: async (cb) => cb({}),
    query: async (sql, params) => {
      if (sql.includes('INSERT INTO notifications')) notifications.push(params);
      return [];
    },
  });

  const reviewCtrl = createReviewController({
    auctionModel: {
      findById: async (id) =>
        id === 103
          ? { id: 103, status: 'finalizada', sellerId: 2, winnerId: 3 }
          : { id: 101, status: 'activa', sellerId: 2, winnerId: null },
    },
    reviewModel: {
      existsByAuctionAndReviewer: async () => false,
      create: async (_c, data) => ({ id: 901, ...data }),
      recalculateUserReputation: async () => 4.9,
    },
    withTransaction: async (cb) => cb({}),
  });

  const reportCtrl = createReportController({
    reportModel: {
      findById: async (id) =>
        id === 801
          ? {
              id: 801,
              auctionId: 103,
              reporterId: 2,
              reportedUserId: 5,
              status: 'en_revision',
              sanctionApplied: 'Pendiente de evaluación',
              reason: 'Incumplimiento',
              description: 'Detalle inicial',
            }
          : null,
      update: async (_c, id, updates) => ({
        id,
        auctionId: 103,
        reporterId: 2,
        reportedUserId: 5,
        status: updates.status || 'en_revision',
        sanctionApplied: updates.sanctionApplied || 'Pendiente de evaluación',
        description: updates.description || 'Detalle inicial',
      }),
    },
    withTransaction: async (cb) => cb({}),
    query: async () => [],
  });

  await withServer(
    (app) => {
      app.get('/auctions/:id', validateParamId('id'), optionalAuth, auctionCtrl.getAuctionById);
      app.post('/auctions', verifyToken, auctionCtrl.createAuction);
      app.put('/auctions/:id', validateParamId('id'), verifyToken, auctionCtrl.updateAuction);
      app.post('/bids', verifyToken, bidCtrl.createBid);
      app.put('/bids/:id', validateParamId('id'), verifyToken, bidCtrl.updateBid);
      app.post('/reviews', verifyToken, reviewCtrl.createReview);
      app.patch('/reports/:id', validateParamId('id'), verifyToken, reportCtrl.updateReport);
    },
    async (baseUrl) => {
      const sellerToken = signToken(mockUsers[2]);
      const winnerToken = signToken(mockUsers[3]);
      const thirdPartyToken = signToken(mockUsers[5]);
      const adminToken = signToken(mockUsers[1]);

      // RN05: Anónimo o tercero no ven teléfono/email aunque esté finalizada
      const pubDetail = await (await fetch(`${baseUrl}/auctions/103`)).json();
      assert.equal(pubDetail.contactUnlocked, false);
      assert.equal(pubDetail.seller.phone, undefined);

      // RN05: Ganador sí ve datos de contacto liberados
      const winDetail = await (
        await fetch(`${baseUrl}/auctions/103`, {
          headers: { Authorization: `Bearer ${winnerToken}` },
        })
      ).json();
      assert.equal(winDetail.contactUnlocked, true);
      assert.equal(winDetail.seller.phone, '+54 9 381 555-0202');

      // RN04: Falta commitmentAccepted -> 400
      const bidNoCommit = await fetch(`${baseUrl}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${winnerToken}`,
        },
        body: JSON.stringify({ auctionId: 101, amount: 1100, commitmentAccepted: false }),
      });
      assert.equal(bidNoCommit.status, 400);

      // RN02: Auto-puja prohibida -> 403
      const selfBid = await fetch(`${baseUrl}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sellerToken}`,
        },
        body: JSON.stringify({ auctionId: 101, amount: 1200, commitmentAccepted: true }),
      });
      assert.equal(selfBid.status, 403);

      // RN01: Incremento insuficiente -> 400
      const lowBid = await fetch(`${baseUrl}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${winnerToken}`,
        },
        body: JSON.stringify({ auctionId: 101, amount: 1050, commitmentAccepted: true }),
      });
      assert.equal(lowBid.status, 400);

      // Puja válida -> 201 + genera notificación outbid al líder previo
      const okBid = await fetch(`${baseUrl}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${winnerToken}`,
        },
        body: JSON.stringify({ auctionId: 101, amount: 1100, commitmentAccepted: true }),
      });
      assert.equal(okBid.status, 201);
      assert.equal(notifications.length, 1);

      // Postor propietario puede editar su nota (200), pero no su importe (403 RN04)
      const bidNoteOk = await fetch(`${baseUrl}/bids/501`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${winnerToken}`,
        },
        body: JSON.stringify({ amount: 1100, note: 'Retiro a las 18hs' }),
      });
      assert.equal(bidNoteOk.status, 200);
      assert.equal((await bidNoteOk.json()).note, 'Retiro a las 18hs');

      const bidAmountOwnerDenied = await fetch(`${baseUrl}/bids/501`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${winnerToken}`,
        },
        body: JSON.stringify({ amount: 1500, note: 'Intento cambio' }),
      });
      assert.equal(bidAmountOwnerDenied.status, 403);

      const bidThirdPartyDenied = await fetch(`${baseUrl}/bids/501`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${thirdPartyToken}`,
        },
        body: JSON.stringify({ note: 'Ajeno' }),
      });
      assert.equal(bidThirdPartyDenied.status, 403);

      const bidAdminOk = await fetch(`${baseUrl}/bids/501`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ amount: 1200, note: 'Ajuste admin' }),
      });
      assert.equal(bidAdminOk.status, 200);
      assert.equal(recalculatedPriceAuctionId, 101);

      // Subasta sin imageUrl asigna imagen por defecto
      const auctionDefaultImg = await fetch(`${baseUrl}/auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sellerToken}`,
        },
        body: JSON.stringify({
          title: 'Producto sin foto',
          basePrice: 50000,
          minIncrement: 5000,
          endTime: futureIso,
          imageUrl: '   ',
        }),
      });
      assert.equal(auctionDefaultImg.status, 201);
      const createdAuctionJson = await auctionDefaultImg.json();
      assert.ok(createdAuctionJson.imageUrl.startsWith('https://'));

      // RN08: Vendedor no puede cambiar basePrice con pujas -> 409
      const lockBase = await fetch(`${baseUrl}/auctions/101`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sellerToken}`,
        },
        body: JSON.stringify({ basePrice: 9999 }),
      });
      assert.equal(lockBase.status, 409);

      // RN07: No se puede calificar subasta activa -> 409
      const revActive = await fetch(`${baseUrl}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${winnerToken}`,
        },
        body: JSON.stringify({ auctionId: 101, rating: 5, comment: 'Bien' }),
      });
      assert.equal(revActive.status, 409);

      // RN07: Tercero ajeno no puede calificar -> 403
      const revThird = await fetch(`${baseUrl}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${thirdPartyToken}`,
        },
        body: JSON.stringify({ auctionId: 103, rating: 4, comment: 'Ok' }),
      });
      assert.equal(revThird.status, 403);

      // RN07: Ganador califica al vendedor -> 201
      const revOk = await fetch(`${baseUrl}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${winnerToken}`,
        },
        body: JSON.stringify({ auctionId: 103, rating: 5, comment: 'Impecable' }),
      });
      assert.equal(revOk.status, 201);

      // RN06: Denunciante puede editar detalle en revisión con accountAction:'none', no resolver; tercero 403; admin 200
      const repReporterDescOk = await fetch(`${baseUrl}/reports/801`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sellerToken}`,
        },
        body: JSON.stringify({
          description: 'Actualización de evidencia mientras sigue en revisión.',
          accountAction: 'none',
        }),
      });
      assert.equal(repReporterDescOk.status, 200);

      const repReporterStatusDenied = await fetch(`${baseUrl}/reports/801`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sellerToken}`,
        },
        body: JSON.stringify({ status: 'resuelto_sancion', accountAction: 'none' }),
      });
      assert.equal(repReporterStatusDenied.status, 403);

      const repUser = await fetch(`${baseUrl}/reports/801`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${winnerToken}`,
        },
        body: JSON.stringify({ description: 'Intento tercero', accountAction: 'none' }),
      });
      assert.equal(repUser.status, 403);

      const repAdmin = await fetch(`${baseUrl}/reports/801`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'resuelto_sancion', accountAction: 'suspend' }),
      });
      assert.equal(repAdmin.status, 200);
    }
  );
});

test('App principal monta rutas REST bajo /api y protege endpoints privados con JWT', async () => {
  const realApp = createApp();
  const server = realApp.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const rootRes = await fetch(`${baseUrl}/`);
    assert.equal(rootRes.status, 200);
    const rootJson = await rootRes.json();
    assert.equal(rootJson.name, 'BidZone REST API');

    // Endpoints privados sin token deben responder 401 desde verifyToken real
    for (const protectedPath of [
      '/api/auth/me',
      '/api/users',
      '/api/bids',
      '/api/reports',
      '/api/reviews',
      '/api/notifications',
    ]) {
      const res = await fetch(`${baseUrl}${protectedPath}`);
      assert.equal(
        res.status,
        401,
        `Esperado 401 sin token en ${protectedPath}, obtenido ${res.status}`
      );
    }

    const postAuctionNoAuth = await fetch(`${baseUrl}/api/auctions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Sin token' }),
    });
    assert.equal(postAuctionNoAuth.status, 401);

    const notFoundRes = await fetch(`${baseUrl}/api/inexistente`);
    assert.equal(notFoundRes.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('formatDatabaseError y validateEnv detectan AggregateError y placeholders de .env', () => {
  const aggErr = new AggregateError([new Error('connect ECONNREFUSED')], '');
  aggErr.code = 'ECONNREFUSED';
  const formatted = formatDatabaseError(aggErr, {
    host: 'localhost',
    port: 3306,
    user: 'root',
    database: 'bidzone_db',
  });
  assert.match(formatted, /localhost:3306/);
  assert.match(formatted, /ECONNREFUSED/);

  const prevUser = process.env.DB_USER;
  const prevSecret = process.env.JWT_SECRET;
  try {
    process.env.DB_USER = 'tu_usuario_mysql';
    process.env.JWT_SECRET = 'reemplazar_con_clave_secreta_larga_y_unica';
    assert.throws(() => validateEnv(), /valores de ejemplo en backend\/\.env/);
  } finally {
    process.env.DB_USER = prevUser;
    process.env.JWT_SECRET = prevSecret;
  }
});
