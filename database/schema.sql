-- =============================================================================
-- BidZone · Script de Base de Datos Relacional MySQL 8.0+
-- Requisito 5: Mínimo 5 tablas relacionadas (implementadas 6 tablas en 3FN)
-- Reglas de Negocio soportadas: RN01 - RN08
-- =============================================================================

CREATE DATABASE IF NOT EXISTS bidzone_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bidzone_db;

-- Eliminar tablas en orden inverso a sus dependencias si se reinicializa el esquema
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS bids;
DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Tabla: users
-- Cuentas de socios y administradores, credenciales hasheadas (bcrypt),
-- datos de contacto para trato directo (RN05) y estado disciplinario (RN06).
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL DEFAULT '',
  status ENUM('active', 'suspended', 'closed') NOT NULL DEFAULT 'active',
  reputation DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT pk_users PRIMARY KEY (id),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_reputation CHECK (reputation >= 1.00 AND reputation <= 5.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_role_status ON users (role, status);

-- -----------------------------------------------------------------------------
-- 2. Tabla: auctions
-- Publicaciones/lotes en subasta. Referencia al vendedor (obligatorio) y al
-- postor ganador al finalizar el reloj (opcional hasta su adjudicación).
-- -----------------------------------------------------------------------------
CREATE TABLE auctions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Tecnología',
  image_url VARCHAR(500) NOT NULL DEFAULT '',
  base_price DECIMAL(12, 2) NOT NULL,
  current_price DECIMAL(12, 2) NOT NULL,
  min_increment DECIMAL(12, 2) NOT NULL,
  seller_id INT UNSIGNED NOT NULL,
  winner_id INT UNSIGNED NULL,
  status ENUM('activa', 'finalizada', 'cancelada') NOT NULL DEFAULT 'activa',
  end_time DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT pk_auctions PRIMARY KEY (id),
  CONSTRAINT fk_auctions_seller
    FOREIGN KEY (seller_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_auctions_winner
    FOREIGN KEY (winner_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_auctions_prices CHECK (
    base_price > 0 AND current_price >= base_price AND min_increment > 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_auctions_status_end ON auctions (status, end_time);
CREATE INDEX idx_auctions_category ON auctions (category);
CREATE INDEX idx_auctions_seller ON auctions (seller_id);
CREATE INDEX idx_auctions_winner ON auctions (winner_id);

-- -----------------------------------------------------------------------------
-- 3. Tabla: bids
-- Historial auditable e irrevocable de ofertas vinculantes (RN01 - RN04).
-- -----------------------------------------------------------------------------
CREATE TABLE bids (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  auction_id INT UNSIGNED NOT NULL,
  bidder_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  note VARCHAR(300) NOT NULL DEFAULT '',
  commitment_accepted TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_bids PRIMARY KEY (id),
  CONSTRAINT fk_bids_auction
    FOREIGN KEY (auction_id) REFERENCES auctions(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bids_bidder
    FOREIGN KEY (bidder_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_bids_amount CHECK (amount > 0),
  CONSTRAINT chk_bids_commitment CHECK (commitment_accepted = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_bids_auction_amount ON bids (auction_id, amount DESC);
CREATE INDEX idx_bids_bidder ON bids (bidder_id);

-- -----------------------------------------------------------------------------
-- 4. Tabla: reports
-- Expedientes de mediación por incumplimiento de pago o entrega (RN06).
-- -----------------------------------------------------------------------------
CREATE TABLE reports (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  auction_id INT UNSIGNED NOT NULL,
  reporter_id INT UNSIGNED NOT NULL,
  reported_user_id INT UNSIGNED NOT NULL,
  reason VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  evidence_url VARCHAR(500) NOT NULL DEFAULT '',
  status ENUM('en_revision', 'resuelto_sancion', 'desestimado') NOT NULL DEFAULT 'en_revision',
  sanction_applied VARCHAR(255) NOT NULL DEFAULT 'Pendiente de evaluación',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT pk_reports PRIMARY KEY (id),
  CONSTRAINT fk_reports_auction
    FOREIGN KEY (auction_id) REFERENCES auctions(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reports_reporter
    FOREIGN KEY (reporter_id) REFERENCES users(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_reports_reported_user
    FOREIGN KEY (reported_user_id) REFERENCES users(id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_reports_distinct_users CHECK (reporter_id <> reported_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reports_status ON reports (status);
CREATE INDEX idx_reports_auction ON reports (auction_id);

-- -----------------------------------------------------------------------------
-- 5. Tabla: reviews
-- Calificaciones mutuas de 1 a 5 estrellas tras el cierre formal (RN07).
-- Garantiza una única reseña por usuario y subasta mediante clave única.
-- -----------------------------------------------------------------------------
CREATE TABLE reviews (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  auction_id INT UNSIGNED NOT NULL,
  reviewer_id INT UNSIGNED NOT NULL,
  target_user_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  role_context ENUM('comprador_a_vendedor', 'vendedor_a_comprador') NOT NULL DEFAULT 'comprador_a_vendedor',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT pk_reviews PRIMARY KEY (id),
  CONSTRAINT uq_reviews_auction_reviewer UNIQUE (auction_id, reviewer_id),
  CONSTRAINT fk_reviews_auction
    FOREIGN KEY (auction_id) REFERENCES auctions(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_reviewer
    FOREIGN KEY (reviewer_id) REFERENCES users(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_reviews_target
    FOREIGN KEY (target_user_id) REFERENCES users(id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_reviews_distinct_users CHECK (reviewer_id <> target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reviews_target ON reviews (target_user_id);

-- -----------------------------------------------------------------------------
-- 6. Tabla: notifications
-- Alertas generadas al superar pujas, ganar una subasta o recibir un reporte.
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  auction_id INT UNSIGNED NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('outbid', 'won', 'closed', 'report', 'system') NOT NULL DEFAULT 'system',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_notifications PRIMARY KEY (id),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notifications_auction
    FOREIGN KEY (auction_id) REFERENCES auctions(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read, created_at);

