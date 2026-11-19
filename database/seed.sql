-- =============================================================================
-- BidZone · Datos de Prueba Iniciales (MySQL 8.0+ · Tablas en español)
-- 25 usuarios · 50 subastas · pujas, reportes, reseñas y notificaciones
-- =============================================================================

USE bidzone_db;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notificaciones;
TRUNCATE TABLE resenas;
TRUNCATE TABLE reportes;
TRUNCATE TABLE pujas;
TRUNCATE TABLE subastas;
TRUNCATE TABLE usuarios;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Usuarios (25 cuentas: 1 admin, 22 socios activos, 1 suspendida, 1 cerrada)
-- -----------------------------------------------------------------------------
INSERT INTO usuarios (
  id, nombre, correo, contrasena_hash, rol, telefono, ciudad, estado, reputacion, creado_en
) VALUES
(1,  'Leandro Quipildor',   'admin@bidzone.com',      '$2a$10$ozAJfMbplCg4W2tbRFEIhe3ViGSdwUSjVB.95.2ppaATR8eGB9Gm6', 'admin',   '+54 9 381 555-0101', 'San Miguel de Tucumán', 'activa',     4.90, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 DAY)),
(2,  'Mario Matías Moussa', 'mario@bidzone.com',      '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 381 555-0202', 'Yerba Buena, Tucumán',  'activa',     4.85, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 55 DAY)),
(3,  'Luciano Medina',      'luciano@bidzone.com',    '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 381 555-0303', 'San Miguel de Tucumán', 'activa',     4.80, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 52 DAY)),
(4,  'Valentina Torres',    'valentina@correo.com',   '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 11 4444-8899', 'Córdoba Capital',       'suspendida', 2.10, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 50 DAY)),
(5,  'Sofía Herrera',       'sofia@bidzone.com',      '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 381 555-0404', 'San Miguel de Tucumán', 'activa',     4.90, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 48 DAY)),
(6,  'Tomás Pereyra',       'tomas@bidzone.com',      '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 381 555-0505', 'Yerba Buena, Tucumán',  'activa',     4.75, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 46 DAY)),
(7,  'Camila Rojas',        'camila@bidzone.com',     '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 351 555-0606', 'Córdoba Capital',       'activa',     4.85, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 44 DAY)),
(8,  'Mateo Benítez',       'mateo@bidzone.com',      '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 341 555-0707', 'Rosario, Santa Fe',     'activa',     4.65, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 42 DAY)),
(9,  'Julieta Sosa',        'julieta@bidzone.com',    '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 11 5555-0808', 'CABA, Buenos Aires',    'activa',     4.95, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 DAY)),
(10, 'Nicolás Navarro',     'nicolas@bidzone.com',    '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 261 555-0909', 'Mendoza Capital',       'activa',     4.70, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 38 DAY)),
(11, 'Martina Giménez',     'martina@bidzone.com',    '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 387 555-1010', 'Salta Capital',         'activa',     4.80, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 36 DAY)),
(12, 'Santiago Morales',    'santiago@bidzone.com',   '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 381 555-1111', 'San Miguel de Tucumán', 'activa',     4.60, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 34 DAY)),
(13, 'Florencia Castro',    'florencia@bidzone.com',  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 221 555-1212', 'La Plata, Buenos Aires','activa',     4.88, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 32 DAY)),
(14, 'Joaquín Romero',      'joaquin@bidzone.com',    '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 381 555-1313', 'Yerba Buena, Tucumán',  'activa',     4.72, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)),
(15, 'Agustina Díaz',       'agustina@bidzone.com',   '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 351 555-1414', 'Villa Carlos Paz',      'activa',     4.92, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 28 DAY)),
(16, 'Facundo Álvarez',     'facundo@bidzone.com',    '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 388 555-1515', 'San Salvador de Jujuy', 'activa',     4.68, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 26 DAY)),
(17, 'Milagros Vega',       'milagros@bidzone.com',   '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 385 555-1616', 'Santiago del Estero',   'activa',     4.84, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 DAY)),
(18, 'Lucas Fernández',     'lucas@bidzone.com',      '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 223 555-1717', 'Mar del Plata',         'activa',     4.77, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 DAY)),
(19, 'Victoria Paz',        'victoria@bidzone.com',   '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 299 555-1818', 'Neuquén Capital',       'activa',     4.91, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 DAY)),
(20, 'Ignacio Molina',      'ignacio@bidzone.com',    '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 280 555-1919', 'Puerto Madryn, Chubut', 'activa',     4.63, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 DAY)),
(21, 'Antonella Quiroga',   'antonella@bidzone.com',  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 264 555-2020', 'San Juan Capital',      'activa',     4.89, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 DAY)),
(22, 'Ezequiel Suárez',     'ezequiel@bidzone.com',   '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 342 555-2121', 'Santa Fe Capital',      'activa',     4.74, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 DAY)),
(23, 'Belén Ledesma',       'belen@bidzone.com',      '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 379 555-2222', 'Corrientes Capital',    'activa',     4.86, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 DAY)),
(24, 'Ramiro Acuña',        'ramiro@bidzone.com',     '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 381 555-2323', 'Tafí Viejo, Tucumán',   'activa',     4.79, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY)),
(25, 'Damián Ortega',       'damian@correo.com',      '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm', 'usuario', '+54 9 11 5555-2424', 'Avellaneda, Bs. As.',   'cerrada',    1.80, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY));

ALTER TABLE usuarios AUTO_INCREMENT = 26;

-- -----------------------------------------------------------------------------
-- 2. Subastas (50 lotes en total: IDs 101 a 150)
-- -----------------------------------------------------------------------------
INSERT INTO subastas (
  id, titulo, descripcion, categoria, url_imagen,
  precio_base, precio_actual, incremento_minimo,
  vendedor_id, ganador_id, estado, fecha_fin, creado_en
) VALUES
(101, 'MacBook Pro M3 Pro 14" 18GB RAM 512GB SSD', 'Equipo impecable con caja original, cargador MagSafe 70W y solo 18 ciclos de batería.', 'Tecnología', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80', 1200000.00, 1450000.00, 50000.00, 2, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 18 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)),
(102, 'Consola PlayStation 5 Slim Digital + 2 DualSense', 'Consola PS5 edición Slim 1TB con dos joysticks originales sin drift y base de carga.', 'Gaming', 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80', 650000.00, 740000.00, 25000.00, 3, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
(103, 'Silla Ergonómica Herman Miller Aeron Talle B', 'Soporte lumbar PostureFit SL, apoyabrazos 3D y malla transpirable original.', 'Hogar y Oficina', 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=80', 800000.00, 920000.00, 30000.00, 2, 3, 'finalizada', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 72 HOUR)),
(104, 'Bicicleta MTB Trek Marlin 7 Rodado 29', 'Transmisión Shimano Deore 1x10, frenos hidráulicos y horquilla RockShox Judy.', 'Deportes', 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=900&q=80', 700000.00, 700000.00, 20000.00, 1, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 36 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
(105, 'Cámara Mirrorless Sony Alpha a7 III + 28-70mm', 'Sensor Full Frame 24.2MP, 4K HDR, estabilización 5 ejes, bolso y SD 128GB.', 'Fotografía', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80', 1100000.00, 1250000.00, 50000.00, 3, 2, 'finalizada', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 96 HOUR)),
(106, 'iPad Mini 6ta Gen 256GB Wi-Fi Starlight', 'Pantalla Liquid Retina 8.3", chip A15 Bionic, caja sellada de fábrica.', 'Tecnología', 'https://cdn.dummyjson.com/product-images/tablets/ipad-mini-2021-starlight/1.webp', 480000.00, 520000.00, 20000.00, 5, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)),
(107, 'Auriculares Apple AirPods Max Silver', 'Cancelación activa de ruido, audio espacial y funda Smart Case original.', 'Tecnología', 'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/1.webp', 540000.00, 540000.00, 20000.00, 6, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 HOUR)),
(108, 'iPhone 15 Pro 256GB Titanio Natural', 'Batería al 97%, libre de fábrica, incluye funda MagSafe original y vidrio templado.', 'Tecnología', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80', 1150000.00, 1250000.00, 30000.00, 7, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 14 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 HOUR)),
(109, 'Monitor Gamer LG UltraGear 27" QHD 165Hz', 'Panel IPS 1ms, HDR10, compatible con G-Sync y FreeSync. Sin píxeles muertos.', 'Gaming', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80', 380000.00, 410000.00, 15000.00, 8, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR)),
(110, 'Teclado Mecánico Keychron Q1 Pro Inalámbrico', 'Chasis de aluminio CNC, switches Gateron Jupiter Brown, Bluetooth y cable USB-C.', 'Gaming', 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=900&q=80', 220000.00, 220000.00, 10000.00, 9, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 4 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
(111, 'Cafetera Espresso Breville Barista Express', 'Molinillo cónico integrado, lanza de vapor profesional y accesorios de acero.', 'Hogar y Oficina', 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=900&q=80', 890000.00, 950000.00, 30000.00, 10, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 HOUR)),
(112, 'Guitarra Eléctrica Fender Stratocaster Player', 'Color Sunburst, mástil de arce, funda rígida incluida. Calibrada por luthier.', 'Música', 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?auto=format&fit=crop&w=900&q=80', 980000.00, 1020000.00, 40000.00, 11, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 HOUR)),
(113, 'Reloj Automático Seiko Presage Cocktail Time', 'Caja de acero 40.5mm, cristal Hardlex abombado y correa de cuero genuino.', 'Coleccionables', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80', 520000.00, 560000.00, 20000.00, 12, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 6 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 HOUR)),
(114, 'Drone DJI Mini 4 Pro Fly More Combo', '3 baterías, control con pantalla RC 2, grabación 4K 60fps vertical y bolso original.', 'Fotografía', 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=900&q=80', 1350000.00, 1450000.00, 50000.00, 13, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 4 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 19 HOUR)),
(115, 'Escritorio Elevable Eléctrico 140x70 Roble', 'Doble motor silencioso, 4 memorias de altura y pasacables integrado.', 'Hogar y Oficina', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80', 460000.00, 460000.00, 20000.00, 14, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 11 HOUR)),
(116, 'Nintendo Switch OLED Edición Zelda + 3 Juegos', 'Edición Tears of the Kingdom con caja, dock y 3 cartuchos físicos originales.', 'Gaming', 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=900&q=80', 490000.00, 530000.00, 20000.00, 15, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 HOUR)),
(117, 'Notebook Lenovo ThinkPad X1 Carbon Gen 11', 'Intel Core i7 13va Gen, 16GB RAM, 1TB NVMe, chasis fibra de carbono ultraliviano.', 'Tecnología', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80', 1420000.00, 1420000.00, 50000.00, 16, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR)),
(118, 'Placa de Video NVIDIA RTX 4070 Super 12GB', 'Marca ASUS Dual OC, 6 meses de uso solo en gaming, nunca minería, con caja.', 'Gaming', 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=900&q=80', 780000.00, 840000.00, 30000.00, 17, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 25 HOUR)),
(119, 'Lente Canon RF 50mm f/1.8 STM', 'Objetivo luminoso ideal para retratos y video, con parasol y filtro UV.', 'Fotografía', 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=900&q=80', 260000.00, 260000.00, 10000.00, 18, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 6 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR)),
(120, 'Parlante Portátil Marshall Stanmore III', 'Sonido estéreo potente con Bluetooth 5.2, entrada RCA y diseño vintage negro.', 'Música', 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80', 440000.00, 480000.00, 20000.00, 19, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 4 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 17 HOUR)),
(121, 'Smartwatch Garmin Fenix 7 Pro Solar', 'GPS multibanda, linterna LED, mapas topográficos y batería hasta 22 días.', 'Deportes', 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=900&q=80', 890000.00, 920000.00, 30000.00, 20, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 21 HOUR)),
(122, 'Taladro Percutor Inalámbrico DeWalt 20V Brushless', 'Incluye maletín rígido, 2 baterías de 4Ah y cargador rápido original.', 'Herramientas', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80', 310000.00, 310000.00, 15000.00, 21, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
(123, 'Tocadiscos Audio-Technica AT-LP120XUSB', 'Tracción directa, preamplificador phono incorporado y salida USB para digitalizar vinilos.', 'Música', 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=900&q=80', 510000.00, 550000.00, 20000.00, 22, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 28 HOUR)),
(124, 'Tabla de Paddle Surf Inflable 10.6" + Remo Carbono', 'Kit completo con inflador doble acción, leash, mochila y quillas desmontables.', 'Deportes', 'https://images.unsplash.com/photo-1526188717906-ab4a2f949f78?auto=format&fit=crop&w=900&q=80', 420000.00, 420000.00, 15000.00, 23, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
(125, 'Consola Xbox Series X 1TB + Game Pass 3 Meses', 'Como nueva, con caja original, cables HDMI 2.1 y control negro.', 'Gaming', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=900&q=80', 670000.00, 720000.00, 25000.00, 24, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 23 HOUR)),
(126, 'Colección Completa Libros Harry Potter Tapa Dura', 'Edición especial ilustrada en español, los 7 tomos en estuche rígido impecable.', 'Coleccionables', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80', 190000.00, 210000.00, 10000.00, 5, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 6 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 HOUR)),
(127, 'Proyector Portátil Samsung The Freestyle 2da Gen', 'Full HD hasta 100 pulgadas, enfoque automático, Smart TV integrado y funda.', 'Tecnología', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80', 760000.00, 760000.00, 25000.00, 6, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 13 HOUR)),
(128, 'Aspiradora Robot Roborock S7 MaxV con Base', 'Mapeo láser LiDAR, fregado sónico y vaciado automático de polvo.', 'Hogar y Oficina', 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=900&q=80', 690000.00, 730000.00, 20000.00, 7, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 4 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 HOUR)),
(129, 'Impresora 3D Bambu Lab A1 Mini con AMS Lite', 'Impresión multicolor de alta velocidad, nivelación automática, incluye 4 filamentos.', 'Tecnología', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80', 620000.00, 680000.00, 20000.00, 8, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 26 HOUR)),
(130, 'Teclado Sintetizador Roland Juno-DS61', '61 teclas sensibles, más de 1200 sonidos profesionales, funda acolchada y pedal sustain.', 'Música', 'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&w=900&q=80', 950000.00, 950000.00, 30000.00, 9, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
(131, 'Cámara Instantánea Fujifilm Instax Mini Evo', 'Híbrida digital + impresión instantánea, 100 efectos creativos y 2 packs de película.', 'Fotografía', 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=80', 290000.00, 320000.00, 15000.00, 10, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)),
(132, 'Monopatín Eléctrico Xiaomi Scooter 4 Pro', 'Autonomía 55km, motor 700W, neumáticos autosellantes 10" y cargador magnético.', 'Vehículos', 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80', 790000.00, 850000.00, 30000.00, 11, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 6 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 29 HOUR)),
(133, 'Set de Pesas Ajustables Bowflex SelectTech 24kg', 'Par de mancuernas regulables de 2.5 a 24kg con bases originales.', 'Deportes', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=80', 340000.00, 340000.00, 15000.00, 12, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 HOUR)),
(134, 'Moto Scrambler Café Racer + Casco Carbono', 'Proyecto custom homologado, freno a disco doble, tablero digital y casco talle L.', 'Vehículos', 'https://images.unsplash.com/photo-1662199513774-6c6c1e7e2c3e?auto=format&fit=crop&w=900&q=80', 4200000.00, 4500000.00, 150000.00, 13, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 14 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 HOUR)),
(135, 'Auto Sedán Dodge Charger SXT RWD Automático', 'Motor V6 3.6L, caja automática 8 velocidades, cuero, pantalla Uconnect y 58.000 km.', 'Vehículos', 'https://cdn.dummyjson.com/product-images/vehicle/charger-sxt-rwd/1.webp', 18500000.00, 19200000.00, 500000.00, 14, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 13 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 HOUR)),
(136, 'Camiseta Argentina Campeón 2022 Firmada + Certificado', 'Talle L oficial con 3 estrellas, enmarcada en vidrio antirreflejo.', 'Coleccionables', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=80', 450000.00, 510000.00, 20000.00, 15, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 HOUR)),
(137, 'Tablet Samsung Galaxy Tab S9 11" + S Pen', 'Pantalla AMOLED 120Hz, resistencia al agua IP68, 128GB y teclado magnético.', 'Tecnología', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80', 740000.00, 740000.00, 25000.00, 16, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR)),
(138, 'Volante Simulador Logitech G923 + Palanca', 'Force Feedback Trueforce, pedales metálicos con freno progresivo para PC y PS5.', 'Gaming', 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=900&q=80', 430000.00, 470000.00, 20000.00, 17, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 19 HOUR)),
(139, 'Carpa Doite Himalaya 4 Personas Alta Montaña', 'Varillas de duraluminio, doble techo 4000mm columna de agua, usada 2 veces.', 'Deportes', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80', 380000.00, 380000.00, 15000.00, 18, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 11 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR)),
(140, 'Interfaz de Audio Focusrite Scarlett 4i4 4ta Gen', 'Preamps de estudio, modo Air, ideal para home studio y podcasts. En caja.', 'Música', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=80', 270000.00, 290000.00, 10000.00, 19, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 4 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 21 HOUR)),
(141, 'Soldadora Inverter Lusqtoff Iron 250 + Máscara', 'Tecnología IGBT, suelda electrodo hasta 4mm, incluye máscara fotosensible.', 'Herramientas', 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=900&q=80', 210000.00, 210000.00, 10000.00, 20, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 11 HOUR)),
(142, 'Sillón Reclinable Cuero Ecológico Negro 1 Cuerpo', 'Estructura reforzada con apoyapiés extensible, ideal para sala de cine o lectura.', 'Hogar y Oficina', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80', 360000.00, 390000.00, 15000.00, 21, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 6 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 25 HOUR)),
(143, 'Cámara Deportiva GoPro Hero 12 Black + Accesorios', 'Video 5.3K60, estabilización HyperSmooth 6.0, 2 baterías Enduro y trípode.', 'Fotografía', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=80', 490000.00, 520000.00, 15000.00, 22, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 17 HOUR)),
(144, 'Figura Coleccionable Hot Toys Iron Man Mark 85', 'Escala 1/6 die-cast metálica con luces LED, accesorios completos y caja arte.', 'Coleccionables', 'https://images.unsplash.com/photo-1608889476561-6242cfdbf622?auto=format&fit=crop&w=900&q=80', 580000.00, 620000.00, 20000.00, 23, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 HOUR)),
(145, 'Lote 12 Vinilos Rock Nacional Clásico 70s/80s', 'Soda Stereo, Charly García, Spinetta y Sumo. Ediciones de época en estado VG+.', 'Coleccionables', 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=900&q=80', 280000.00, 330000.00, 15000.00, 24, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 32 HOUR)),
(146, 'Bicicleta Ruta Venzo Phoenix Carbono Talle 54', 'Grupo Shimano 105 2x11, ruedas perfil 35mm y peso total 8.4kg.', 'Deportes', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80', 1480000.00, 1540000.00, 40000.00, 5, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 12 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)),
(147, 'Kit Iluminación Estudio Godox SL60W x2 + Softbox', 'Dos reflectores LED continuos 60W con trípodes 2.4m y softboxes octogonales.', 'Fotografía', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80', 330000.00, 330000.00, 15000.00, 6, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
(148, 'Hidrolavadora Karcher K5 Full Control 2100W', 'Presión 145 bar, manguera 8 metros, lanza regulable y depósito detergente.', 'Herramientas', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80', 410000.00, 440000.00, 15000.00, 7, NULL, 'activa', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 6 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 HOUR)),
(149, 'Auriculares Sony WH-1000XM5 Negros', 'Cancelación de ruido líder, 30 horas de batería y estuche rígido original.', 'Tecnología', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', 390000.00, 450000.00, 20000.00, 8, 9, 'finalizada', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 80 HOUR)),
(150, 'Steam Deck OLED 512GB + Estuche y Dock', 'Consola portátil PC con pantalla HDR 90Hz, estado impecable con garantía.', 'Gaming', 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=900&q=80', 880000.00, 960000.00, 30000.00, 10, 11, 'finalizada', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 HOUR));

ALTER TABLE subastas AUTO_INCREMENT = 151;

-- -----------------------------------------------------------------------------
-- 3. Pujas iniciales (RN01 - RN04)
-- -----------------------------------------------------------------------------
INSERT INTO pujas (id, subasta_id, postor_id, monto, nota, compromiso_aceptado, creado_en) VALUES
(501, 101, 3,  1350000.00, 'Retiro inmediato por el centro.', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR)),
(502, 101, 1,  1450000.00, 'Pago por transferencia inmediata al cerrar.', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
(503, 102, 2,  740000.00,  'Coordino retiro en el día.', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
(504, 103, 3,  920000.00,  'Oferta final ganadora.', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
(505, 105, 2,  1250000.00, 'Excelente estado, coordino por WhatsApp.', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 25 HOUR)),
(506, 106, 8,  520000.00,  'Pago al contado o transferencia.', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
(507, 108, 12, 1250000.00, 'Lo retiro personalmente si gano.', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
(508, 118, 14, 840000.00,  'Envío a Tucumán a mi cargo.', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
(509, 149, 9,  450000.00,  'Retiro en CABA hoy mismo.', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 HOUR)),
(510, 150, 11, 960000.00,  'Oferta ganadora, coordino envío.', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR));

ALTER TABLE pujas AUTO_INCREMENT = 511;

-- -----------------------------------------------------------------------------
-- 4. Reportes de Incumplimiento (RN06)
-- -----------------------------------------------------------------------------
INSERT INTO reportes (
  id, subasta_id, denunciante_id, denunciado_id, motivo, descripcion,
  url_evidencia, estado, sancion_aplicada, creado_en
) VALUES
(801, 103, 2, 4, 'Incumplimiento de pago en plazo acordado', 'El usuario ganó una subasta anterior y no respondió los mensajes ni llamadas tras 48 horas.', 'https://evidencia.bidzone.com/captura-chat-801', 'resuelto_sancion', 'Suspensión de cuenta e inhabilitación para pujar', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 48 HOUR)),
(802, 105, 3, 2, 'Demora en coordinación de entrega', 'Se solicitó reprogramar el horario de entrega para el día siguiente. En resolución amistosa.', '', 'en_revision', 'Sin sanción (en mediación)', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
(803, 149, 8, 25, 'Oferta falsa reiterada', 'Se detectaron ofertas sin intención de compra en múltiples lotes.', 'https://evidencia.bidzone.com/ticket-803', 'resuelto_sancion', 'Cierre definitivo de cuenta', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 72 HOUR));

ALTER TABLE reportes AUTO_INCREMENT = 804;

-- -----------------------------------------------------------------------------
-- 5. Calificaciones Post-Cierre (RN07)
-- -----------------------------------------------------------------------------
INSERT INTO resenas (
  id, subasta_id, autor_id, calificado_id, puntaje, comentario, contexto_rol, creado_en
) VALUES
(901, 103, 3,  2,  5, 'Excelente vendedor. Apenas finalizó la subasta coordinamos por teléfono y retiré la silla impecable.', 'comprador_a_vendedor', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
(902, 105, 2,  3,  5, 'La cámara Sony estaba perfecta. Coordinamos transferencia y entrega sin ningún problema.', 'comprador_a_vendedor', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 HOUR)),
(903, 149, 9,  8,  5, 'Auriculares en caja original como nuevos, trato súper amable.', 'comprador_a_vendedor', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
(904, 150, 11, 10, 5, 'Despachó la Steam Deck el mismo día y llegó perfectamente embalada.', 'comprador_a_vendedor', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR));

ALTER TABLE resenas AUTO_INCREMENT = 905;

-- -----------------------------------------------------------------------------
-- 6. Notificaciones
-- -----------------------------------------------------------------------------
INSERT INTO notificaciones (id, usuario_id, subasta_id, titulo, mensaje, tipo, leida, creado_en) VALUES
(1001, 3,  101, '¡Oferta superada!', 'Tu oferta en "MacBook Pro M3 Pro 14"" fue superada con $1.450.000.', 'superada', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
(1002, 3,  103, '¡Ganaste la subasta! Contacto liberado', 'Ganaste "Silla Ergonómica Herman Miller Aeron". Ya puedes ver el teléfono y correo del vendedor.', 'ganada', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
(1003, 2,  103, 'Subasta finalizada con ganador', 'Tu subasta "Silla Ergonómica Herman Miller Aeron" cerró en $920.000.', 'cerrada', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
(1004, 9,  149, '¡Ganaste la subasta! Contacto liberado', 'Ganaste "Auriculares Sony WH-1000XM5 Negros" en $450.000.', 'ganada', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
(1005, 11, 150, '¡Ganaste la subasta! Contacto liberado', 'Ganaste "Steam Deck OLED 512GB" en $960.000.', 'ganada', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 HOUR));

ALTER TABLE notificaciones AUTO_INCREMENT = 1006;
