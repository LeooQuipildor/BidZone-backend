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
),
(
  5,
  'Sofía Herrera',
  'sofia@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 381 555-0404',
  'San Miguel de Tucumán',
  'active',
  4.90,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 28 DAY)
),
(
  6,
  'Tomás Pereyra',
  'tomas@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 381 555-0505',
  'Yerba Buena, Tucumán',
  'active',
  4.75,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 26 DAY)
),
(
  7,
  'Camila Rojas',
  'camila@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 351 555-0606',
  'Córdoba Capital',
  'active',
  4.85,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 DAY)
),
(
  8,
  'Mateo Benítez',
  'mateo@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 341 555-0707',
  'Rosario, Santa Fe',
  'active',
  4.65,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 DAY)
),
(
  9,
  'Julieta Sosa',
  'julieta@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 11 5555-0808',
  'Ciudad Autónoma de Buenos Aires',
  'active',
  4.95,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 DAY)
),
(
  10,
  'Nicolás Navarro',
  'nicolas@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 261 555-0909',
  'Mendoza Capital',
  'active',
  4.70,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 DAY)
),
(
  11,
  'Martina Giménez',
  'martina@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 387 555-1010',
  'Salta Capital',
  'active',
  4.80,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 DAY)
),
(
  12,
  'Santiago Morales',
  'santiago@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 381 555-1111',
  'San Miguel de Tucumán',
  'active',
  4.60,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 DAY)
),
(
  13,
  'Florencia Castro',
  'florencia@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 221 555-1212',
  'La Plata, Buenos Aires',
  'active',
  4.88,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 DAY)
),
(
  14,
  'Joaquín Romero',
  'joaquin@bidzone.com',
  '$2a$10$oSCPdeG00HPjyNG7zgGBbuHtAfFb6Tl651ORt/hitvJNjOWAYxJMm',
  'user',
  '+54 9 381 555-1313',
  'Yerba Buena, Tucumán',
  'active',
  4.72,
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY)
);

ALTER TABLE users AUTO_INCREMENT = 15;

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
),
(
  106,
  'iPad Mini 6ta Gen 256GB Wi-Fi Starlight',
  'Tablet compacta con pantalla Liquid Retina de 8.3", chip A15 Bionic, caja sellada de fábrica y compatible con Apple Pencil 2.',
  'Tecnología',
  'https://cdn.dummyjson.com/product-images/tablets/ipad-mini-2021-starlight/1.webp',
  480000.00,
  520000.00,
  20000.00,
  5,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)
),
(
  107,
  'Auriculares Apple AirPods Max Silver',
  'Auriculares over-ear de alta fidelidad con cancelación activa de ruido, audio espacial y funda Smart Case original.',
  'Tecnología',
  'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/1.webp',
  540000.00,
  540000.00,
  20000.00,
  6,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 HOUR)
),
(
  108,
  'Notebook Asus Zenbook Pro Dual Screen 32GB RAM',
  'Ultrabook profesional con doble pantalla táctil OLED 4K, procesador Intel Core i9 y SSD NVMe de 1TB para edición avanzada.',
  'Tecnología',
  'https://cdn.dummyjson.com/product-images/laptops/asus-zenbook-pro-dual-screen-laptop/1.webp',
  1650000.00,
  1750000.00,
  50000.00,
  7,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 4 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR)
),
(
  109,
  'Notebook Dell XPS 13 9300 Core i7 16GB SSD',
  'Laptop ultradelgada de aluminio mecanizado, pantalla InfinityEdge FHD+ y batería con autonomía superior a 10 horas.',
  'Tecnología',
  'https://cdn.dummyjson.com/product-images/laptops/new-dell-xps-13-9300-laptop/1.webp',
  920000.00,
  920000.00,
  30000.00,
  8,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 28 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)
),
(
  110,
  'Tablet Samsung Galaxy Tab S8 Plus 12.4" S-Pen',
  'Pantalla Super AMOLED de 120Hz, 128GB de almacenamiento expandible e incluye S-Pen magnético y funda teclado original.',
  'Tecnología',
  'https://cdn.dummyjson.com/product-images/tablets/samsung-galaxy-tab-s8-plus-grey/1.webp',
  690000.00,
  750000.00,
  25000.00,
  9,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 HOUR)
),
(
  111,
  'Consola Nintendo Switch + Joy-Con Neon y Dock',
  'Edición completa con dock HDMI original, par de controles Joy-Con sin drift y estuche rígido de viaje.',
  'Gaming',
  'https://images.unsplash.com/photo-1576057121724-6f505058a21e?auto=format&fit=crop&w=900&q=80',
  410000.00,
  450000.00,
  15000.00,
  10,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 4 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 HOUR)
),
(
  112,
  'Control Inalámbrico Xbox Series Carbon + Base Doble',
  'Joystick inalámbrico con textura antideslizante, adaptador USB-C y estación de carga magnética con 2 baterías recargables.',
  'Gaming',
  'https://images.unsplash.com/photo-1644571580646-7048372c491a?auto=format&fit=crop&w=900&q=80',
  115000.00,
  115000.00,
  5000.00,
  11,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 42 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR)
),
(
  113,
  'PC Gamer Tower Ryzen 9 RTX 4070 Ti 32GB DDR5',
  'Equipo armado con refrigeración líquida de 240mm, fuente modular 850W 80+ Gold y gabinete con vidrio templado.',
  'Gaming',
  'https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=900&q=80',
  1850000.00,
  1950000.00,
  50000.00,
  12,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 6 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 HOUR)
),
(
  114,
  'Setup Dual Monitor Gamer 27" QHD 165Hz IPS',
  'Dos monitores curvos de 1ms de respuesta montados en brazo articulado doble, cero píxeles muertos y cables DisplayPort incluidos.',
  'Gaming',
  'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=900&q=80',
  780000.00,
  840000.00,
  30000.00,
  13,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 11 HOUR)
),
(
  115,
  'Consola Portátil Retro Steam Deck 512GB NVMe',
  'Versión con pantalla antirreflejo grabada, funda protectora original y dock USB-C para conectar al televisor.',
  'Gaming',
  'https://images.unsplash.com/photo-1754327543497-e8ca6ef65862?auto=format&fit=crop&w=900&q=80',
  680000.00,
  720000.00,
  20000.00,
  14,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 54 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR)
),
(
  116,
  'Sillón Ejecutivo Knoll Saarinen Cuero Negro',
  'Sillón gerencial de diseño clásico con estructura de acero cromado, tapizado en cuero genuino y base giratoria de cinco apoyos.',
  'Hogar y Oficina',
  'https://cdn.dummyjson.com/product-images/furniture/knoll-saarinen-executive-conference-chair/1.webp',
  590000.00,
  620000.00,
  20000.00,
  5,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 HOUR)
),
(
  117,
  'Sofá Tres Cuerpos Annibale Colombo Tapizado',
  'Sofá de living de diseño italiano, estructura en madera maciza y almohadones de espuma de alta densidad desenfundables.',
  'Hogar y Oficina',
  'https://cdn.dummyjson.com/product-images/furniture/annibale-colombo-sofa/1.webp',
  1150000.00,
  1150000.00,
  40000.00,
  6,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 19 HOUR)
),
(
  118,
  'Lámpara de Escritorio Minimalista Cristal y Bronce',
  'Luminaria de mesa con regulador de intensidad táctil y bombilla LED cálida incluida, ideal para estudio u oficina.',
  'Hogar y Oficina',
  'https://cdn.dummyjson.com/product-images/home-decoration/table-lamp/1.webp',
  85000.00,
  95000.00,
  5000.00,
  7,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 6 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)
),
(
  119,
  'Mesa Auxiliar Madera Cherry Nórdica',
  'Mesa lateral con cajón corredizo oculto y terminación en laca mate natural, sin marcas ni rayaduras.',
  'Hogar y Oficina',
  'https://cdn.dummyjson.com/product-images/furniture/bedside-table-african-cherry/1.webp',
  195000.00,
  210000.00,
  10000.00,
  8,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 4 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 13 HOUR)
),
(
  120,
  'Parlante Inteligente Apple HomePod Mini Space Grey',
  'Audio computacional de 360 grados con integración Siri y HomeKit. Incluye caja y adaptador USB-C de 20W.',
  'Hogar y Oficina',
  'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-homepod-mini-cosmic-grey/1.webp',
  135000.00,
  155000.00,
  10000.00,
  9,
  5,
  'finalizada',
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 HOUR)
),
(
  121,
  'Bicicleta de Ruta Carbono Shimano 105 R7000',
  'Cuadro talla 54 ultraliviano de fibra de carbono, grupo completo de 22 velocidades y ruedas perfil medio.',
  'Deportes',
  'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80',
  1320000.00,
  1400000.00,
  40000.00,
  10,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 17 HOUR)
),
(
  122,
  'Raqueta de Tenis Profesional Wilson Blade 98 v8',
  'Grip L3 con encordado Luxilon ALU Power recién colocado y funda térmica oficial para dos raquetas.',
  'Deportes',
  'https://cdn.dummyjson.com/product-images/sports-accessories/tennis-racket/1.webp',
  240000.00,
  260000.00,
  10000.00,
  11,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 32 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)
),
(
  123,
  'Set Completo de Golf Hierros + Bolso Stand',
  'Juego de palos del 5 al PW con varillas de acero regular, putter incluido y bolso impermeable con trípode.',
  'Deportes',
  'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=900&q=80',
  760000.00,
  760000.00,
  25000.00,
  12,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 21 HOUR)
),
(
  124,
  'Set de Mancuernas Ajustables Pro 2x24kg + Rack',
  'Par de mancuernas con selector rápido de peso de 2.5kg a 24kg por lado y base antideslizante para entrenamiento en casa.',
  'Deportes',
  'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=900&q=80',
  340000.00,
  380000.00,
  15000.00,
  13,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 46 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)
),
(
  125,
  'Kayak Travesía Monoplaza con Remo de Aluminio',
  'Casco de polietileno rotomoldeado de 3.2 metros con tambucho estanco, asiento anatómico acolchado y chaleco salvavidas.',
  'Deportes',
  'https://images.unsplash.com/photo-1498174000079-5f6c40e5b453?auto=format&fit=crop&w=900&q=80',
  490000.00,
  510000.00,
  20000.00,
  14,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 6 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)
),
(
  126,
  'Pedestal y Cabezal Fluido para Cámara de Estudio',
  'Soporte profesional con columna neumática, ruedas con freno y zapata rápida compatible con cámaras de cine y DSLR.',
  'Fotografía',
  'https://cdn.dummyjson.com/product-images/mobile-accessories/tv-studio-camera-pedestal/1.webp',
  430000.00,
  430000.00,
  15000.00,
  5,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)
),
(
  127,
  'Cámara Mirrorless Fujifilm X-T4 Negra + 18-55mm',
  'Estabilización en cuerpo IBIS, grabación 4K a 60fps y simulaciones de película clásicas. Menos de 4.000 disparos.',
  'Fotografía',
  'https://images.unsplash.com/photo-1616353071588-708dcff912e2?auto=format&fit=crop&w=900&q=80',
  1280000.00,
  1350000.00,
  50000.00,
  6,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 26 HOUR)
),
(
  128,
  'Aro de Luz LED Bicolor 18" + Trípode Fotográfico',
  'Kit completo para retrato y streaming con control remoto Bluetooth, soporte para smartphone y bolso acolchado.',
  'Fotografía',
  'https://cdn.dummyjson.com/product-images/mobile-accessories/selfie-lamp-with-iphone/1.webp',
  78000.00,
  86000.00,
  4000.00,
  7,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 9 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR)
),
(
  129,
  'Cámara de Acción GoPro Hero 12 Black + Kit Sumergible',
  'Video HDR 5.3K, estabilización HyperSmooth 6.0, carcasa acuática 60m, 2 baterías Enduro y flotador de mano.',
  'Fotografía',
  'https://images.unsplash.com/photo-1484506399805-c273b8e91dce?auto=format&fit=crop&w=900&q=80',
  440000.00,
  480000.00,
  20000.00,
  8,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 HOUR)
),
(
  130,
  'Cámara DSLR Canon EOS 6D Mark II + Lente 50mm f/1.4',
  'Cuerpo Full Frame con pantalla abatible táctil y lente luminoso ideal para retratos. Sin hongos ni rayaduras en el cristal.',
  'Fotografía',
  'https://images.unsplash.com/photo-1547043884-975a4f9ea025?auto=format&fit=crop&w=900&q=80',
  990000.00,
  1090000.00,
  30000.00,
  9,
  7,
  'finalizada',
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 80 HOUR)
),
(
  131,
  'Moto Naked Kawasaki Z800 ABS Año 2021',
  'Motor tetracilíndrico de 806cc, solo 11.400 km reales, cubiertas Pirelli Diablo Rosso III nuevas y papeles al día.',
  'Vehículos',
  'https://cdn.dummyjson.com/product-images/motorcycle/kawasaki-z800/1.webp',
  8900000.00,
  9300000.00,
  200000.00,
  10,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 11 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 25 HOUR)
),
(
  132,
  'Scooter Vespa Primavera 150cc Edición Amarillo',
  'Scooter urbano automático 4 tiempos con inyección electrónica, baúl trasero original y dos juegos de llaves.',
  'Vehículos',
  'https://images.unsplash.com/photo-1603799078290-ccc7f07412ca?auto=format&fit=crop&w=900&q=80',
  3600000.00,
  3600000.00,
  100000.00,
  11,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 12 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)
),
(
  133,
  'Moto Deportiva Supersport 600cc Carena Original',
  'Lista para transferir con VTV vigente, escape deportivo homologado y service completo recién realizado.',
  'Vehículos',
  'https://cdn.dummyjson.com/product-images/motorcycle/sportbike-motorcycle/1.webp',
  7400000.00,
  7800000.00,
  200000.00,
  12,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 HOUR)
),
(
  134,
  'Moto Scrambler Café Racer + Casco Integral Carbono',
  'Proyecto custom homologado con freno a disco en ambas ruedas, tablero digital y casco talle L incluido.',
  'Vehículos',
  'https://images.unsplash.com/photo-1662199513774-6c6c1e7e2c3e?auto=format&fit=crop&w=900&q=80',
  4200000.00,
  4500000.00,
  150000.00,
  13,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 14 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 HOUR)
),
(
  135,
  'Auto Sedán Dodge Charger SXT RWD Automático',
  'Motor V6 3.6L, caja automática de 8 velocidades, tapizado de cuero, pantalla táctil Uconnect y 58.000 km comprobables.',
  'Vehículos',
  'https://cdn.dummyjson.com/product-images/vehicle/charger-sxt-rwd/1.webp',
  18500000.00,
  19200000.00,
  500000.00,
  14,
  NULL,
  'activa',
  DATE_ADD(UTC_TIMESTAMP(), INTERVAL 13 DAY),
  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 HOUR)
);

ALTER TABLE auctions AUTO_INCREMENT = 136;

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

