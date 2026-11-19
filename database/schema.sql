-- =============================================================================
-- BidZone · Base de Datos Relacional MySQL 8.0+ (Tablas y columnas en español)
-- 6 tablas relacionadas · Reglas de Negocio: RN01 - RN08
-- =============================================================================

CREATE DATABASE IF NOT EXISTS bidzone_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bidzone_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notificaciones;
DROP TABLE IF EXISTS resenas;
DROP TABLE IF EXISTS reportes;
DROP TABLE IF EXISTS pujas;
DROP TABLE IF EXISTS subastas;
DROP TABLE IF EXISTS usuarios;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Tabla: usuarios
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  correo VARCHAR(160) NOT NULL,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  telefono VARCHAR(40) NOT NULL DEFAULT '',
  ciudad VARCHAR(120) NOT NULL DEFAULT '',
  estado ENUM('active', 'suspended', 'closed') NOT NULL DEFAULT 'active',
  reputacion DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_correo (correo),
  CONSTRAINT chk_usuarios_reputacion CHECK (reputacion >= 1.00 AND reputacion <= 5.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_usuarios_rol_estado ON usuarios (rol, estado);

-- -----------------------------------------------------------------------------
-- 2. Tabla: subastas
-- -----------------------------------------------------------------------------
CREATE TABLE subastas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(180) NOT NULL,
  descripcion TEXT NOT NULL,
  categoria VARCHAR(80) NOT NULL DEFAULT 'Tecnología',
  url_imagen VARCHAR(500) NOT NULL DEFAULT '',
  precio_base DECIMAL(12, 2) NOT NULL,
  precio_actual DECIMAL(12, 2) NOT NULL,
  incremento_minimo DECIMAL(12, 2) NOT NULL,
  vendedor_id INT UNSIGNED NOT NULL,
  ganador_id INT UNSIGNED NULL,
  estado ENUM('activa', 'finalizada', 'cancelada') NOT NULL DEFAULT 'activa',
  fecha_fin DATETIME NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_subastas_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_subastas_ganador FOREIGN KEY (ganador_id) REFERENCES usuarios(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_subastas_precios CHECK (
    precio_base > 0 AND precio_actual >= precio_base AND incremento_minimo > 0
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_subastas_estado_fin ON subastas (estado, fecha_fin);
CREATE INDEX idx_subastas_categoria ON subastas (categoria);
CREATE INDEX idx_subastas_vendedor ON subastas (vendedor_id);
CREATE INDEX idx_subastas_ganador ON subastas (ganador_id);

-- -----------------------------------------------------------------------------
-- 3. Tabla: pujas (RN01 - RN04)
-- -----------------------------------------------------------------------------
CREATE TABLE pujas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subasta_id INT UNSIGNED NOT NULL,
  postor_id INT UNSIGNED NOT NULL,
  monto DECIMAL(12, 2) NOT NULL,
  nota VARCHAR(300) NOT NULL DEFAULT '',
  compromiso_aceptado TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_pujas_subasta FOREIGN KEY (subasta_id) REFERENCES subastas(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pujas_postor FOREIGN KEY (postor_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_pujas_monto CHECK (monto > 0),
  CONSTRAINT chk_pujas_compromiso CHECK (compromiso_aceptado = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pujas_subasta_monto ON pujas (subasta_id, monto DESC);
CREATE INDEX idx_pujas_postor ON pujas (postor_id);

-- -----------------------------------------------------------------------------
-- 4. Tabla: reportes (RN06)
-- -----------------------------------------------------------------------------
CREATE TABLE reportes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subasta_id INT UNSIGNED NOT NULL,
  denunciante_id INT UNSIGNED NOT NULL,
  denunciado_id INT UNSIGNED NOT NULL,
  motivo VARCHAR(180) NOT NULL,
  descripcion TEXT NOT NULL,
  url_evidencia VARCHAR(500) NOT NULL DEFAULT '',
  estado ENUM('en_revision', 'resuelto_sancion', 'desestimado') NOT NULL DEFAULT 'en_revision',
  sancion_aplicada VARCHAR(255) NOT NULL DEFAULT 'Pendiente de evaluación',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_reportes_subasta FOREIGN KEY (subasta_id) REFERENCES subastas(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reportes_denunciante FOREIGN KEY (denunciante_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_reportes_denunciado FOREIGN KEY (denunciado_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_reportes_distintos CHECK (denunciante_id <> denunciado_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reportes_estado ON reportes (estado);
CREATE INDEX idx_reportes_subasta ON reportes (subasta_id);

-- -----------------------------------------------------------------------------
-- 5. Tabla: resenas (RN07)
-- -----------------------------------------------------------------------------
CREATE TABLE resenas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  subasta_id INT UNSIGNED NOT NULL,
  autor_id INT UNSIGNED NOT NULL,
  calificado_id INT UNSIGNED NOT NULL,
  puntaje TINYINT UNSIGNED NOT NULL,
  comentario TEXT NOT NULL,
  contexto_rol ENUM('comprador_a_vendedor', 'vendedor_a_comprador') NOT NULL DEFAULT 'comprador_a_vendedor',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_resenas_subasta_autor (subasta_id, autor_id),
  CONSTRAINT fk_resenas_subasta FOREIGN KEY (subasta_id) REFERENCES subastas(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_resenas_autor FOREIGN KEY (autor_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_resenas_calificado FOREIGN KEY (calificado_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_resenas_puntaje CHECK (puntaje BETWEEN 1 AND 5),
  CONSTRAINT chk_resenas_distintos CHECK (autor_id <> calificado_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_resenas_calificado ON resenas (calificado_id);

-- -----------------------------------------------------------------------------
-- 6. Tabla: notificaciones
-- -----------------------------------------------------------------------------
CREATE TABLE notificaciones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  subasta_id INT UNSIGNED NULL,
  titulo VARCHAR(180) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo ENUM('outbid', 'won', 'closed', 'report', 'system') NOT NULL DEFAULT 'system',
  leida TINYINT(1) NOT NULL DEFAULT 0,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notificaciones_subasta FOREIGN KEY (subasta_id) REFERENCES subastas(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_notificaciones_usuario_leida ON notificaciones (usuario_id, leida, creado_en);
