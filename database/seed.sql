-- =============================================================================
-- BidZone · Datos de Prueba Iniciales (MySQL 8.0+)
-- Requisito 5 y 8: Datos de demostración suficientes con contraseñas en hash bcrypt
-- (Sin contraseñas en texto plano ni secretos en el repositorio)
-- =============================================================================

USE bidzone_db;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notifications;
TRUNCATE TABLE reviews;
TRUNCATE TABLE reports;
TRUNCATE TABLE bids;
TRUNCATE TABLE auctions;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Usuarios (roles admin/user y cuenta suspendida de prueba para RN06)
-- -----------------------------------------------------------------------------
INSERT INTO users (
  id, name, email, password_hash, role, phone, city, status, reputation, created_at
) VALUES
(
  1,
  'Leandro Quipildor',
  'admin@bidzone.com',
  '$2a$10$ozAJfMbplCg4W2tbRFEIhe3ViGSdwUSjVB.95.2ppaATR8eGB9Gm6',
  'admin',
  '+54 9 381 555-0101',
  'San Miguel de Tucumán',
  'active',
  4.90,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 DAY)
),
(
  2,
  'Mario Matías Moussa',
  'mario@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 381 555-0202',
  'Yerba Buena, Tucumán',
  'active',
  4.80,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 38 DAY)
),
(
  3,
  'Luciano Medina',
  'luciano@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 381 555-0303',
  'San Miguel de Tucumán',
  'active',
  4.70,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 35 DAY)
),
(
  4,
  'Valentina Torres',
  'valentina@correo.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 11 4444-8899',
  'Córdoba Capital',
  'suspended',
  2.10,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
);

ALTER TABLE users AUTO_INCREMENT = 5;

-- -----------------------------------------------------------------------------
-- 2. Subastas (activas con cierre futuro y finalizadas con ganador asignado)
-- -----------------------------------------------------------------------------
INSERT INTO auctions (
  id, title, description, category, image_url,
  base_price, current_price, min_increment,
  seller_id, winner_id, status, end_time, created_at
) VALUES
(
  101,
  'MacBook Pro M3 Pro 14" 18GB RAM 512GB SSD',
  'Equipo en estado impecable con caja original, cargador MagSafe de 70W y solo 18 ciclos de batería. Ideal para desarrollo de software y diseño.',
  'Tecnología',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
  1200000.00,
  1450000.00,
  50000.00,
  2,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 18 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)
),
(
  102,
  'Consola PlayStation 5 Slim Digital + 2 Joysticks DualSense',
  'Consola PS5 edición Slim de 1TB con dos controles originales blancos sin drift y base de carga original.',
  'Gaming',
  'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80',
  650000.00,
  740000.00,
  25000.00,
  3,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)
),
(
  103,
  'Silla Ergonómica Herman Miller Aeron Talle B',
  'Silla de oficina premium con soporte lumbar PostureFit SL, apoyabrazos 3D y malla Pellicle transpirable.',
  'Hogar y Oficina',
  'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=80',
  800000.00,
  920000.00,
  30000.00,
  2,
  3,
  'finalizada',
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 72 HOUR)
),
(
  104,
  'Bicicleta Mountain Bike Trek Marlin 7 Rodado 29',
  'Transmisión Shimano Deore 1x10, frenos a disco hidráulicos y horquilla RockShox Judy. Lista para rodar.',
  'Deportes',
  'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=900&q=80',
  700000.00,
  700000.00,
  20000.00,
  1,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 36 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)
),
(
  105,
  'Cámara Mirrorless Sony Alpha a7 III + Lente 28-70mm',
  'Sensor Full Frame de 24.2MP, grabación 4K HDR, estabilización de 5 ejes. Incluye bolso de transporte y tarjeta SD 128GB.',
  'Fotografía',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
  1100000.00,
  1250000.00,
  50000.00,
  3,
  2,
  'finalizada',
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 96 HOUR)
);

ALTER TABLE auctions AUTO_INCREMENT = 106;

-- -----------------------------------------------------------------------------
-- 3. Pujas (RN01 - RN04)
-- -----------------------------------------------------------------------------
INSERT INTO bids (
  id, auction_id, bidder_id, amount, note, commitment_accepted, created_at
) VALUES
(
  501,
  101,
  3,
  1350000.00,
  'Retiro inmediato por el centro.',
  1,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR)
),
(
  502,
  101,
  1,
  1450000.00,
  'Pago por transferencia inmediata al cerrar.',
  1,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)
),
(
  503,
  102,
  2,
  740000.00,
  'Coordino retiro en el día.',
  1,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)
),
(
  504,
  103,
  3,
  920000.00,
  'Oferta final ganadora.',
  1,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)
),
(
  505,
  105,
  2,
  1250000.00,
  'Excelente estado, coordino por WhatsApp.',
  1,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 25 HOUR)
);

ALTER TABLE bids AUTO_INCREMENT = 506;

-- -----------------------------------------------------------------------------
-- 4. Reportes de Incumplimiento (RN06)
-- -----------------------------------------------------------------------------
INSERT INTO reports (
  id, auction_id, reporter_id, reported_user_id, reason, description,
  evidence_url, status, sanction_applied, created_at
) VALUES
(
  801,
  103,
  2,
  4,
  'Incumplimiento de pago en plazo acordado',
  'El usuario ganó una subasta anterior y no respondió los mensajes de WhatsApp ni llamadas tras 48 horas de liberados los datos de contacto.',
  'https://evidencia.bidzone.com/captura-chat-801',
  'resuelto_sancion',
  'Suspensión de cuenta e inhabilitación para pujar',
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 48 HOUR)
),
(
  802,
  105,
  3,
  2,
  'Demora en coordinación de entrega',
  'Se solicitó reprogramar el horario de entrega para el día siguiente. Situación en vía de resolución amistosa.',
  '',
  'en_revision',
  'Sin sanción (en mediación)',
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)
);

ALTER TABLE reports AUTO_INCREMENT = 803;

-- -----------------------------------------------------------------------------
-- 5. Calificaciones y Reputación Post-Cierre (RN07)
-- -----------------------------------------------------------------------------
INSERT INTO reviews (
  id, auction_id, reviewer_id, target_user_id, rating, comment, role_context, created_at
) VALUES
(
  901,
  103,
  3,
  2,
  5,
  'Excelente vendedor. Apenas finalizó la subasta nos pusimos en contacto por teléfono y retiré la silla tal cual la descripción.',
  'comprador_a_vendedor',
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)
),
(
  902,
  105,
  2,
  3,
  5,
  'La cámara Sony estaba impecable. Coordinamos transferencia y entrega en un café céntrico sin ningún inconveniente.',
  'comprador_a_vendedor',
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 HOUR)
);

ALTER TABLE reviews AUTO_INCREMENT = 903;

-- -----------------------------------------------------------------------------
-- 6. Notificaciones
-- -----------------------------------------------------------------------------
INSERT INTO notifications (
  id, user_id, auction_id, title, message, type, is_read, created_at
) VALUES
(
  1001,
  3,
  101,
  '¡Oferta superada!',
  'Tu oferta en "MacBook Pro M3 Pro 14"" fue superada con una puja de $1.450.000.',
  'outbid',
  0,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)
),
(
  1002,
  3,
  103,
  '¡Ganaste la subasta! Datos de contacto liberados',
  'Te adjudicaste "Silla Ergonómica Herman Miller Aeron". Ya puedes ver el teléfono y correo del vendedor para coordinar el pago.',
  'won',
  0,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)
),
(
  1003,
  2,
  103,
  'Subasta finalizada con ganador',
  'Tu subasta "Silla Ergonómica Herman Miller Aeron" cerró en $920.000. Revisa los datos de contacto del comprador.',
  'closed',
  1,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)
);

ALTER TABLE notifications AUTO_INCREMENT = 1004;

