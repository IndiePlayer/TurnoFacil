import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import pg from 'pg';
import { hashPassword } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'turnofacil.db');

const usePostgres = Boolean(process.env.SUPABASE_DB_URL);
if (process.env.VERCEL && !usePostgres) {
  throw new Error('SUPABASE_DB_URL must be configured before deploying the API to Vercel.');
}
let sqlite;
let pool;

if (usePostgres) {
  const { Pool, types } = pg;
  types.setTypeParser(20, Number);
  types.setTypeParser(1700, Number);
  pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    max: 1
  });
} else {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  sqlite = new DatabaseSync(dbPath);
  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA foreign_keys = ON;');
}

export const db = {
  exec(statement) {
    if (usePostgres) return pool.query(statement);
    return sqlite.exec(statement);
  },
  prepare(statement) {
    if (usePostgres) {
      let parameterIndex = 0;
      const query = statement.replace(/\?/g, () => `$${++parameterIndex}`);
      return {
        async get(...params) {
          const result = await pool.query(query, params);
          return result.rows[0];
        },
        async all(...params) {
          const result = await pool.query(query, params);
          return result.rows;
        },
        async run(...params) {
          return pool.query(query, params);
        }
      };
    }

    return sqlite.prepare(statement);
  }
};

export async function initDatabase() {
  // Businesses table (Enhanced with marketplace fields, images, ratings, plan, and platform fees)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'barberia' | 'restaurante' | 'cafe'
      category TEXT NOT NULL,
      slogan TEXT,
      description TEXT,
      address TEXT NOT NULL,
      phone TEXT,
      city TEXT DEFAULT 'Mocoa, Putumayo',
      rating REAL DEFAULT 4.9,
      review_count INTEGER DEFAULT 35,
      delivery_or_wait TEXT DEFAULT '15-30 min',
      image_url TEXT,
      cover_gradient TEXT DEFAULT 'from-emerald-900 to-slate-900',
      open_time TEXT DEFAULT '08:00',
      close_time TEXT DEFAULT '20:00',
      working_days TEXT DEFAULT '["lunes","martes","miercoles","jueves","viernes","sabado"]',
      slot_duration_default INTEGER DEFAULT 30,
      status TEXT DEFAULT 'activo', -- 'activo' | 'pausado'
      subscription_plan TEXT DEFAULT 'Plan Pro Empresarial',
      monthly_fee REAL DEFAULT 65000, -- COP per month for TurnoFácil platform
      commission_per_turn REAL DEFAULT 1000, -- COP per turn processed
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Services table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      duration INTEGER NOT NULL, -- minutes
      price REAL NOT NULL,
      description TEXT,
      badge TEXT,
      active INTEGER DEFAULT 1,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  // Users table (Roles: 'superadmin', 'admin', 'empleado', 'cliente')
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      role TEXT NOT NULL, -- 'superadmin' | 'admin' | 'empleado' | 'cliente'
      business_id TEXT,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
    );
  `);

  // Tickets / Appointments
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_code TEXT NOT NULL,
      ticket_seq INTEGER NOT NULL,
      business_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_phone TEXT,
      client_email TEXT,
      user_id TEXT,
      party_size INTEGER DEFAULT 1,
      notes TEXT,
      date TEXT NOT NULL, -- YYYY-MM-DD
      time_slot TEXT NOT NULL, -- HH:MM
      estimated_duration INTEGER NOT NULL,
      status TEXT DEFAULT 'espera', -- 'espera', 'atendiendo', 'atendido', 'cancelado', 'aplazado'
      platform_fee_collected REAL DEFAULT 1000, -- TurnoFacil commission fee
      assigned_employee_id TEXT,
      called_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );
  `);

  // Inventory / Dishes / Menu items (Rappi-style food catalog + barber inventory)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      unit TEXT DEFAULT 'porción',
      min_stock INTEGER DEFAULT 5,
      description TEXT,
      popular INTEGER DEFAULT 0,
      image_tag TEXT,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  // Platform financial transactions (For Super Admin to track platform revenues & SaaS flow)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS platform_transactions (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'suscripcion_mensual' | 'comision_turno' | 'alta_plataforma'
      concept TEXT NOT NULL,
      amount REAL NOT NULL, -- COP
      status TEXT DEFAULT 'completado',
      date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  // Ticket history audit
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ticket_history (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      status TEXT NOT NULL,
      changed_by TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      note TEXT,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );
  `);

  await db.exec(usePostgres
    ? `CREATE TABLE IF NOT EXISTS app_events (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`
    : `CREATE TABLE IF NOT EXISTS app_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);

  if (usePostgres) await db.exec('SELECT pg_advisory_lock(706142035)');
  try {
    await seedDefaultData();
  } finally {
    if (usePostgres) await db.exec('SELECT pg_advisory_unlock(706142035)');
  }
}

function getTodayDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

async function seedDefaultData() {
  const existing = await db.prepare('SELECT COUNT(*) as count FROM businesses').get();
  // If already seeded with 5 businesses and superadmin, skip
  if (existing.count >= 4 || (usePostgres && existing.count > 0)) {
    await ensureSuperAdmin();
    return;
  }

  console.log('[TurnoFácil DB] Seeding rich Marketplace and Super Admin data for Mocoa...');

  // Clear previous tables to ensure clean schema update
  await db.exec(`
    DELETE FROM ticket_history;
    DELETE FROM tickets;
    DELETE FROM inventory;
    DELETE FROM services;
    DELETE FROM platform_transactions;
    DELETE FROM users;
    DELETE FROM businesses;
  `);

  // 1. BUSINESSES (Marketplace like Rappi in Mocoa, Putumayo)
  const insertBiz = db.prepare(`
    INSERT INTO businesses (
      id, name, type, category, slogan, description, address, phone, city,
      rating, review_count, delivery_or_wait, cover_gradient, open_time, close_time,
      working_days, slot_duration_default, status, subscription_plan, monthly_fee, commission_per_turn
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await insertBiz.run(
    'biz_barberia_1',
    'Barbería Don Mocoa & Spa',
    'barberia',
    'Barbería Clásica & Spa Masculino',
    'Estilo, precisión y tradición en Mocoa',
    'Barbería de alta gama con sillones hidráulicos vintage, toallas calientes, vapor de ozono y especialistas en degradados modernos y cuidado de barba.',
    'Calle 8 # 6-25, Barrio San Agustín, Mocoa',
    '+57 312 456 7890',
    'Mocoa, Putumayo',
    4.9,
    142,
    'Espera media: 15 min',
    'from-slate-900 via-amber-950 to-slate-900',
    '08:00',
    '19:30',
    JSON.stringify(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']),
    30,
    'activo',
    'Plan Pro Anual',
    65000,
    1000
  );

  await insertBiz.run(
    'biz_restaurante_1',
    'Restaurante Sabor Putumayense',
    'restaurante',
    'Gastronomía Amazónica & Típica',
    'La mejor gastronomía amazónica y almuerzos ejecutivos',
    'Platos autóctonos preparados con ingredientes frescos de la selva del Putumayo: cachama frita, pirarucú, sancocho campesino y refrescantes jugos naturales de copoazú y arazá.',
    'Avenida Colombia # 12-40, Centro, Mocoa',
    '+57 320 987 6543',
    'Mocoa, Putumayo',
    4.8,
    268,
    'Mesas & Turnos',
    'from-emerald-950 via-teal-950 to-slate-900',
    '11:00',
    '21:00',
    JSON.stringify(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
    45,
    'activo',
    'Plan Pro Anual',
    65000,
    1500
  );

  await insertBiz.run(
    'biz_parrilla_mocoa',
    'La Parrilla del Río Mocoa',
    'restaurante',
    'Carnes a la Brasa & Asados',
    'Cortes premium al carbón y ambiente campestre',
    'Especialistas en cortes jugosos a la parrilla de leña, costillas BBQ de cocción lenta y parrilladas familiares con vista panorámica cerca al río.',
    'Carrera 6 # 9-30, Sector La Esmeralda, Mocoa',
    '+57 311 876 5432',
    'Mocoa, Putumayo',
    4.9,
    195,
    'Mesas & Reservas',
    'from-rose-950 via-slate-900 to-amber-950',
    '12:00',
    '22:00',
    JSON.stringify(['martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
    60,
    'activo',
    'Plan Empresarial',
    85000,
    2000
  );

  await insertBiz.run(
    'biz_barber_andes',
    'Barber Club Los Andes',
    'barberia',
    'Fade Studio & Barbería Urbana',
    'Degradados milimétricos, diseños freestyle y estilo juvenil',
    'Ambiente moderno con música urbana, consolas de videojuegos en sala de espera y maestros barberos con certificaciones en fades, tinturas platinadas y perfilado con navaja japonesa.',
    'Calle 7 # 8-15, Barrio El Jardín, Mocoa',
    '+57 314 321 0987',
    'Mocoa, Putumayo',
    4.8,
    110,
    'Espera media: 20 min',
    'from-indigo-950 via-slate-900 to-blue-950',
    '09:00',
    '20:00',
    JSON.stringify(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']),
    30,
    'activo',
    'Plan Básico',
    45000,
    1000
  );

  await insertBiz.run(
    'biz_cafe_mirador',
    'Café & Mirador Amazónico',
    'restaurante',
    'Café de Origen, Postres & Cenas',
    'Café especial cultivado en Putumayo y vista espectacular de Mocoa',
    'El rincón favorito de Mocoa para compartir una tarde de café suave lavado, postres artesanales de frutos amazónicos, crepes salados y copas de vino al atardecer.',
    'Vía Caliyaco Km 2, Vereda Rumiyaco, Mocoa',
    '+57 315 654 3210',
    'Mocoa, Putumayo',
    4.9,
    215,
    'Mesas con Vista',
    'from-amber-950 via-stone-900 to-slate-900',
    '14:00',
    '22:00',
    JSON.stringify(['miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
    45,
    'activo',
    'Plan Pro Anual',
    65000,
    1200
  );

  // 2. SERVICES & MENU FOR RESERVATIONS
  const insertSrv = db.prepare(`
    INSERT INTO services (id, business_id, name, category, duration, price, description, badge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Barbería Don Mocoa
  await insertSrv.run('srv_b1', 'biz_barberia_1', 'Corte Clásico & Degradado', 'Cortes', 30, 18000, 'Degradado moderno con tijera y máquina, lavado capilar y peinado con cera mate', 'Popular');
  await insertSrv.run('srv_b2', 'biz_barberia_1', 'Perfilado & Ritual de Barba', 'Barba', 25, 14000, 'Vapor de ozono, toalla caliente y aceites hidratantes amazónicos', null);
  await insertSrv.run('srv_b3', 'biz_barberia_1', 'Combo VIP: Corte + Barba + Mascarilla', 'Combos', 50, 32000, 'Servicio completo con mascarilla de carbón y masaje facial relajante', 'Recomendado');
  await insertSrv.run('srv_b4', 'biz_barberia_1', 'Corte Infantil Juvenil', 'Cortes', 25, 15000, 'Corte personalizado con acabado detallado para niños y jóvenes', null);

  // Restaurante Sabor Putumayense
  await insertSrv.run('srv_r1', 'biz_restaurante_1', 'Almuerzo Ejecutivo del Día', 'Almuerzos', 35, 16000, 'Mesa rápida con sopa de sancocho, cachama o pollo, seco y jugo natural de fruta silvestre', 'Más Pedido');
  await insertSrv.run('srv_r2', 'biz_restaurante_1', 'Reserva Mesa Familiar (3-6 personas)', 'Reservas', 60, 0, 'Mesa amplia para grupos y familias, atención prioritaria de la carta', null);
  await insertSrv.run('srv_r3', 'biz_restaurante_1', 'Cena Especial Romántica Putumayo', 'Cenas', 75, 45000, 'Mesa reservada con decoración, vino de la casa y menú degustación amazónico', 'Exclusivo');
  await insertSrv.run('srv_r4', 'biz_restaurante_1', 'Reserva Cumpleaños & Eventos (7-15 pers)', 'Eventos', 90, 0, 'Espacio reservado amplio con acompañamiento de mesero dedicado', null);

  // Parrilla del Río Mocoa
  await insertSrv.run('srv_p1', 'biz_parrilla_mocoa', 'Mesa Parrillera Almuerzo / Cena (1-4 pers)', 'Parrilla', 45, 0, 'Mesa cercana a la parrilla con servicio a la mesa de asados al carbón', 'Popular');
  await insertSrv.run('srv_p2', 'biz_parrilla_mocoa', 'Mesa Terraza con Vista al Río (4-8 pers)', 'Especial', 60, 0, 'La mejor ubicación del restaurante con brisa natural y ambiente relajado', 'Recomendado');
  await insertSrv.run('srv_p3', 'biz_parrilla_mocoa', 'Parrillada Gourmet Mixta Especial', 'Plato Especial', 60, 68000, 'Churrasco, costillas ahumadas, morcilla campesina, papas al vapor y arepas', null);

  // Barber Club Los Andes
  await insertSrv.run('srv_ba1', 'biz_barber_andes', 'Skin Fade Freestyle + Diseño', 'Urbano', 35, 20000, 'Degradado al cero milimétrico con navaja y líneas o diseño en patilla', 'Trending');
  await insertSrv.run('srv_ba2', 'biz_barber_andes', 'Corte Urbano + Perfilado de Cejas', 'Cortes', 30, 16000, 'Estilo limpio y moderno con perfilado a navaja', null);
  await insertSrv.run('srv_ba3', 'biz_barber_andes', 'Tinturado / Platinado Global', 'Colorimetría', 90, 60000, 'Decoloración profesional y matizado cenizo o plata de alta duración', null);

  // Café Mirador
  await insertSrv.run('srv_cm1', 'biz_cafe_mirador', 'Tarde de Café & Tertulia (1-2 pers)', 'Café', 40, 0, 'Mesa en terraza mirador para disfrutar métodos filtrados de café del Putumayo', 'Favorito');
  await insertSrv.run('srv_cm2', 'biz_cafe_mirador', 'Mesa Romántica Atardecer Mocoa', 'Romántico', 60, 25000, 'Mesa con velitas, cócteles de bienvenida y vista panorámica', 'Recomendado');

  // 3. INVENTORY & FOOD DISHES (Rappi style food catalog)
  const insertInv = db.prepare(`
    INSERT INTO inventory (id, business_id, name, category, price, stock, unit, min_stock, description, popular, image_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Sabor Putumayense Menu
  await insertInv.run('inv_sp1', 'biz_restaurante_1', 'Cachama Frita con Patacones & Ensalada', 'Platos Fuertes', 32000, 24, 'plato', 5, 'Pescado fresco de río crocante por fuera y jugoso por dentro, servido con arroz y patacón gigante.', 1, 'fish');
  await insertInv.run('inv_sp2', 'biz_restaurante_1', 'Sancocho de Gallina Criolla Ahumada', 'Platos Fuertes', 24000, 30, 'plato', 6, 'Tradicional sopa espesa con yuca, plátano, mazorca y presa campesina tierna.', 1, 'soup');
  await insertInv.run('inv_sp3', 'biz_restaurante_1', 'Jugo Natural de Copoazú Helado', 'Bebidas Amazónicas', 8000, 45, 'vaso', 10, 'Fruta exótica amazónica con notas cítricas y textura cremosa.', 1, 'drink');
  await insertInv.run('inv_sp4', 'biz_restaurante_1', 'Jugo Silvestre de Arazá', 'Bebidas Amazónicas', 8000, 38, 'vaso', 10, 'Aroma intenso y sabor dulce-ácido típico de los bosques del Putumayo.', 0, 'drink');
  await insertInv.run('inv_sp5', 'biz_restaurante_1', 'Filete de Pirarucú en Salsa de Cocona', 'Especialidades', 38000, 16, 'plato', 4, 'El gigante del Amazonas con reducción agridulce de cocona fresca.', 1, 'fish');

  // La Parrilla del Río Menu
  await insertInv.run('inv_pr1', 'biz_parrilla_mocoa', 'Churrasco Parrillero 400g', 'Cortes de Carne', 36000, 20, 'corte', 5, 'Corte grueso madurado a la parrilla de carbón, chimichurri artesanal y papa salada.', 1, 'meat');
  await insertInv.run('inv_pr2', 'biz_parrilla_mocoa', 'Costillitas Ahumadas BBQ Mocoa', 'Cortes de Carne', 34000, 18, 'costillar', 4, 'Bañadas en salsa barbacoa de panela y especias de la región.', 1, 'meat');
  await insertInv.run('inv_pr3', 'biz_parrilla_mocoa', 'Picada Mixta Familiar (4 personas)', 'Para Compartir', 65000, 14, 'fuente', 3, 'Carne de res, pechuga, chorizo campesino, morcilla, patacones y yuca frita.', 1, 'meat');
  await insertInv.run('inv_pr4', 'biz_parrilla_mocoa', 'Cerveza Artesanal Andino-Amazónica', 'Bebidas', 10000, 60, 'botella', 12, 'Elaborada localmente con agua pura de manantial de montaña.', 0, 'drink');

  // Café Mirador Menu
  await insertInv.run('inv_cm1', 'biz_cafe_mirador', 'Café Filtrado V60 de Altura Putumayo', 'Cafetería', 7000, 50, 'taza', 10, 'Notas a caramelo, panela y frutos rojos, preparado en mesa.', 1, 'coffee');
  await insertInv.run('inv_cm2', 'biz_cafe_mirador', 'Cheesecake de Frutos Silvestres Amazónicos', 'Repostería', 12000, 22, 'porción', 5, 'Base crocante con coulis de arazá y mora silvestre.', 1, 'cake');
  await insertInv.run('inv_cm3', 'biz_cafe_mirador', 'Crepe Salado Pollo & Champiñones', 'Comida Ligera', 18000, 25, 'crepe', 5, 'Masa suave rellena de pollo en bechamel y queso campesino gratinado.', 0, 'food');

  // Barber Insumos
  await insertInv.run('inv_b1', 'biz_barberia_1', 'Cera Modeladora Mate 100g BarberDon', 'Styling', 25000, 18, 'unidad', 5, 'Fijación fuerte sin brillo para peinados naturales.', 1, 'product');
  await insertInv.run('inv_b2', 'biz_barberia_1', 'Aceite para Barba Aroma Cedro & Menta', 'Cuidado', 28000, 12, 'frasco', 4, 'Suaviza el vello facial e hidrata la piel bajo la barba.', 0, 'product');
  await insertInv.run('inv_b3', 'biz_barberia_1', 'Aftershave Refrescante Eucalipto 200ml', 'Lociones', 22000, 9, 'frasco', 3, 'Cierra los poros y previene la irritación tras el afeitado.', 0, 'product');

  // 4. USERS (Super Admin, Business Admins, Employees, Clients)
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, phone, role, business_id, password)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  if (usePostgres) {
    await ensureSuperAdmin(insertUser);
  } else {
    await insertUser.run(
      'usr_superadmin',
      'Nanotec (Super Admin Plataforma)',
      'superadmin@turnofacil.com',
      '+57 300 999 8888',
      'superadmin',
      null,
      'superadmin123'
    );
    await insertUser.run('usr_admin_barber', 'Carlos Mendoza', 'admin@turnofacil.com', '+57 310 111 2233', 'admin', 'biz_barberia_1', 'admin123');
    await insertUser.run('usr_admin_rest', 'Gloria Pantoja', 'admin.restaurante@turnofacil.com', '+57 311 999 4444', 'admin', 'biz_restaurante_1', 'admin123');
    await insertUser.run('usr_emp_barbero', 'Mateo Gómez (Barbero)', 'barbero@turnofacil.com', '+57 311 222 3344', 'empleado', 'biz_barberia_1', 'empleado123');
    await insertUser.run('usr_emp_mesera', 'Valentina Ruiz (Capitana Sala)', 'mesera@turnofacil.com', '+57 313 444 5566', 'empleado', 'biz_restaurante_1', 'empleado123');
    await insertUser.run('usr_cliente_1', 'Helen Solarte', 'helen@gmail.com', '+57 314 555 6677', 'cliente', null, 'cliente123');
    await insertUser.run('usr_cliente_2', 'Luis Jurado', 'luis.jurado@gmail.com', '+57 315 777 8899', 'cliente', null, 'cliente123');
  }

  // 5. PLATFORM TRANSACTIONS (Revenues perceived by Super Admin / TurnoFácil)
  const insertTx = db.prepare(`
    INSERT INTO platform_transactions (id, business_id, business_name, type, concept, amount, status, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = getTodayDateString(0);
  const yesterday = getTodayDateString(-1);
  const lastWeek = getTodayDateString(-7);

  if (!usePostgres) {
    await insertTx.run('tx_01', 'biz_barberia_1', 'Barbería Don Mocoa & Spa', 'suscripcion_mensual', 'Membresía Mensual SaaS Plan Pro', 65000, 'completado', today);
    await insertTx.run('tx_02', 'biz_restaurante_1', 'Restaurante Sabor Putumayense', 'suscripcion_mensual', 'Membresía Mensual SaaS Plan Pro', 65000, 'completado', today);
    await insertTx.run('tx_03', 'biz_parrilla_mocoa', 'La Parrilla del Río Mocoa', 'suscripcion_mensual', 'Membresía Mensual SaaS Plan Empresarial', 85000, 'completado', yesterday);
    await insertTx.run('tx_04', 'biz_barber_andes', 'Barber Club Los Andes', 'suscripcion_mensual', 'Membresía Mensual SaaS Plan Básico', 45000, 'completado', lastWeek);
    await insertTx.run('tx_05', 'biz_cafe_mirador', 'Café & Mirador Amazónico', 'suscripcion_mensual', 'Membresía Mensual SaaS Plan Pro', 65000, 'completado', lastWeek);
    await insertTx.run('tx_06', 'biz_barberia_1', 'Barbería Don Mocoa & Spa', 'comision_turno', 'Comisión acumulada 25 turnos procesados', 25000, 'completado', today);
    await insertTx.run('tx_07', 'biz_restaurante_1', 'Restaurante Sabor Putumayense', 'comision_turno', 'Comisión acumulada 30 reservas procesados', 45000, 'completado', today);
  }

  // 6. INITIAL TICKETS FOR TODAY
  const insertTicket = db.prepare(`
    INSERT INTO tickets (
      id, ticket_code, ticket_seq, business_id, service_id,
      client_name, client_phone, client_email, user_id, party_size, notes,
      date, time_slot, estimated_duration, status, assigned_employee_id, called_at, completed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  if (!usePostgres) {
  await insertTicket.run(
    'tkt_001', 'TF-B01', 1, 'biz_barberia_1', 'srv_b1',
    'Andrés Martínez', '+57 312 999 1111', 'andres@gmail.com', null, 1, 'Cliente puntual',
    today, '08:30', 30, 'atendido', 'usr_emp_barbero', '08:32', '09:01', today + ' 08:15:00'
  );

  await insertTicket.run(
    'tkt_002', 'TF-B02', 2, 'biz_barberia_1', 'srv_b3',
    'Marbell Urrutia', '+57 313 888 2222', 'marbell@gmail.com', null, 1, 'Combo VIP solicitado',
    today, '09:30', 50, 'atendiendo', 'usr_emp_barbero', '09:32', null, today + ' 09:10:00'
  );

  await insertTicket.run(
    'tkt_003', 'TF-B03', 3, 'biz_barberia_1', 'srv_b2',
    'Estefania Perenguez', '+57 314 777 3333', 'estefania@gmail.com', null, 1, 'Perfilado de barba',
    today, '10:30', 25, 'espera', null, null, null, today + ' 09:40:00'
  );

  await insertTicket.run(
    'tkt_004', 'TF-B04', 4, 'biz_barberia_1', 'srv_b1',
    'Luis Jurado', '+57 315 777 8899', 'luis.jurado@gmail.com', 'usr_cliente_2', 1, 'Corte clásico',
    today, '11:00', 30, 'espera', null, null, null, today + ' 09:55:00'
  );

  await insertTicket.run(
    'tkt_005', 'TF-R01', 1, 'biz_restaurante_1', 'srv_r2',
    'Familia Narváez', '+57 316 666 4444', 'narvaez@gmail.com', null, 5, 'Celebración familiar, mesa cerca a la ventana',
    today, '12:30', 60, 'espera', null, null, null, today + ' 10:00:00'
  );

  await insertTicket.run(
    'tkt_006', 'TF-R02', 2, 'biz_restaurante_1', 'srv_r1',
    'Camilo Rojas', '+57 318 123 4567', 'camilo@gmail.com', null, 2, 'Almuerzo ejecutivo rápido',
    today, '13:00', 35, 'espera', null, null, null, today + ' 10:30:00'
  );
  }

  console.log('[TurnoFácil DB] Seeding completed with 5 establishments, marketplace menu items and Super Admin revenue!');
}

async function ensureSuperAdmin(insertUser = db.prepare(`
  INSERT INTO users (id, name, email, phone, role, business_id, password)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)) {
  const existing = await db.prepare("SELECT id FROM users WHERE role = 'superadmin'").get();
  if (existing) return;

  const email = process.env.INITIAL_SUPERADMIN_EMAIL || 'superadmin@turnofacil.com';
  const password = usePostgres ? process.env.INITIAL_SUPERADMIN_PASSWORD : 'superadmin123';
  if (!password) {
    throw new Error('Set INITIAL_SUPERADMIN_PASSWORD in Vercel before the first database initialization.');
  }

  await insertUser.run(
    'usr_superadmin',
    'Nanotec (Super Admin Plataforma)',
    email,
    '',
    'superadmin',
    null,
    usePostgres ? hashPassword(password) : password
  );
}
