import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import QRCode from 'qrcode';
import { randomUUID } from 'node:crypto';
import { db, initDatabase } from './db.js';
import { createSessionToken, hashPassword, requireRoles, verifyPassword, verifySessionToken } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../frontend/dist');

// Initialize the database before accepting requests.
await initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use((req, res, next) => {
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  const cookieToken = req.headers.cookie
    ?.split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith('turnofacil_session='))
    ?.slice('turnofacil_session='.length);
  req.user = verifySessionToken(bearer || cookieToken || '');
  next();
});

function requireBusinessAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión' });
  if (req.user.role === 'superadmin') return next();
  if (['admin', 'empleado'].includes(req.user.role) && req.user.business_id === req.params.id) return next();
  return res.status(403).json({ error: 'No tienes permiso para este establecimiento' });
}

function requireBusinessAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión' });
  if (req.user.role === 'superadmin') return next();
  if (req.user.role === 'admin' && req.user.business_id === req.params.id) return next();
  return res.status(403).json({ error: 'Se requiere ser administrador del establecimiento' });
}

async function requireTicketBusinessAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión' });
  if (req.user.role === 'superadmin') return next();
  try {
    const ticket = await db.prepare('SELECT business_id FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Turno no encontrado' });
    if (['admin', 'empleado'].includes(req.user.role) && req.user.business_id === ticket.business_id) return next();
    return res.status(403).json({ error: 'No tienes permiso para este turno' });
  } catch (err) {
    return next(err);
  }
}

async function requireServiceBusinessAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión' });
  if (req.user.role === 'superadmin') return next();
  try {
    const service = await db.prepare('SELECT business_id FROM services WHERE id = ?').get(req.params.id);
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });
    if (req.user.role === 'admin' && req.user.business_id === service.business_id) return next();
    return res.status(403).json({ error: 'No tienes permiso para este servicio' });
  } catch (err) {
    return next(err);
  }
}

async function requireInventoryBusinessAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión' });
  if (req.user.role === 'superadmin') return next();
  try {
    const item = await db.prepare('SELECT business_id FROM inventory WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Artículo no encontrado' });
    if (['admin', 'empleado'].includes(req.user.role) && req.user.business_id === item.business_id) return next();
    return res.status(403).json({ error: 'No tienes permiso para este artículo' });
  } catch (err) {
    return next(err);
  }
}

function setSessionCookie(res, user) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `turnofacil_session=${createSessionToken(user)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure}`);
}

async function broadcastEvent(type, data) {
  const safeData = type === 'ticket_status_changed'
    ? { business_id: data.business_id, new_status: data.new_status, ticket: data.ticket ? { id: data.ticket.id } : null }
    : type === 'settings_updated'
      ? { businessId: data.businessId }
      : { business_id: data.business_id };
  await db.prepare('INSERT INTO app_events (type, payload) VALUES (?, ?)').run(type, JSON.stringify(safeData));
  await db.prepare('DELETE FROM app_events WHERE id < (SELECT COALESCE(MAX(id), 0) - 1000 FROM app_events)').run();
}

app.get('/api/events', async (req, res) => {
  try {
    const hasCursor = Object.hasOwn(req.query, 'since');
    const cursor = Number.parseInt(req.query.since, 10);
    const latest = await db.prepare('SELECT COALESCE(MAX(id), 0) as id FROM app_events').get();
    const events = hasCursor && Number.isSafeInteger(cursor) && cursor >= 0
      ? await db.prepare('SELECT id, type, payload FROM app_events WHERE id > ? ORDER BY id ASC LIMIT 100').all(cursor)
      : [];
    res.json({ events, cursor: events.at(-1)?.id ?? latest.id });
  } catch (err) {
    console.error('Error fetching application events:', err);
    res.status(500).json({ error: 'Error al consultar actualizaciones' });
  }
});

// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const user = await db.prepare('SELECT id, name, email, phone, role, business_id, password FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu email y contraseña.' });
    }

    if (!user.password.startsWith('scrypt$')) {
      await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(password), user.id);
    }

    let business = null;
    if (user.business_id) {
      business = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(user.business_id);
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      business_id: user.business_id,
      business
    };

    setSessionCookie(res, user);
    res.json({ user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error en el servidor al iniciar sesión' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !name.trim() || !email.trim() || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const existing = await db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un usuario registrado con este correo' });
    }

    const userId = 'usr_' + randomUUID();
    await db.prepare(`
      INSERT INTO users (id, name, email, phone, role, business_id, password)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, name, email, phone || '', 'cliente', null, hashPassword(password));

    const newUser = { id: userId, name, email, phone, role: 'cliente', business_id: null };
    setSessionCookie(res, newUser);
    res.status(201).json({ user: newUser });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const secure = process.env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `turnofacil_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
  res.json({ success: true });
});

// ----------------------------------------------------
// BUSINESSES & SETTINGS
// ----------------------------------------------------
app.get('/api/businesses', async (req, res) => {
  try {
    const businesses = await db.prepare('SELECT * FROM businesses ORDER BY name ASC').all();
    const parsed = businesses.map(b => ({
      ...b,
      working_days: typeof b.working_days === 'string' ? JSON.parse(b.working_days) : b.working_days
    }));
    res.json(parsed);
  } catch (err) {
    console.error('Error fetching businesses:', err);
    res.status(500).json({ error: 'Error al obtener negocios' });
  }
});

app.get('/api/businesses/:id', async (req, res) => {
  try {
    const business = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
    if (!business) {
      return res.status(404).json({ error: 'Establecimiento no encontrado' });
    }

    business.working_days = typeof business.working_days === 'string' ? JSON.parse(business.working_days) : business.working_days;

    const services = await db.prepare('SELECT * FROM services WHERE business_id = ? AND active = 1 ORDER BY name ASC').all(req.params.id);
    res.json({ ...business, services });
  } catch (err) {
    console.error('Error fetching business:', err);
    res.status(500).json({ error: 'Error al obtener el negocio' });
  }
});

app.put('/api/businesses/:id/settings', requireBusinessAdmin, async (req, res) => {
  try {
    const { name, slogan, address, phone, open_time, close_time, working_days, slot_duration_default } = req.body;
    
    await db.prepare(`
      UPDATE businesses
      SET name = COALESCE(?, name),
          slogan = COALESCE(?, slogan),
          address = COALESCE(?, address),
          phone = COALESCE(?, phone),
          open_time = COALESCE(?, open_time),
          close_time = COALESCE(?, close_time),
          working_days = COALESCE(?, working_days),
          slot_duration_default = COALESCE(?, slot_duration_default)
      WHERE id = ?
    `).run(
      name,
      slogan,
      address,
      phone,
      open_time,
      close_time,
      typeof working_days === 'object' ? JSON.stringify(working_days) : working_days,
      slot_duration_default,
      req.params.id
    );

    const updated = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
    updated.working_days = JSON.parse(updated.working_days);
    
    await broadcastEvent('settings_updated', { businessId: req.params.id });
    res.json(updated);
  } catch (err) {
    console.error('Error updating business settings:', err);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

// ----------------------------------------------------
// QR CODE GENERATOR (Downloadable QR requirement)
// ----------------------------------------------------
app.get('/api/businesses/:id/qr', async (req, res) => {
  try {
    const business = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
    if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

    // Host URL or frontend direct link to turn registration
    const host = req.headers.host || 'localhost:5173';
    const protocol = req.protocol || 'http';
    // Link directly to booking page with business id preselected
    const directUrl = `${protocol}://${host}/?biz=${business.id}&action=reservar`;

    const qrDataUrl = await QRCode.toDataURL(directUrl, {
      width: 450,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    res.json({
      business_id: business.id,
      business_name: business.name,
      direct_url: directUrl,
      qr_data_url: qrDataUrl
    });
  } catch (err) {
    console.error('Error generating QR:', err);
    res.status(500).json({ error: 'Error al generar código QR' });
  }
});

// ----------------------------------------------------
// SERVICES CRUD
// ----------------------------------------------------
app.get('/api/businesses/:id/services', async (req, res) => {
  try {
    const services = await db.prepare('SELECT * FROM services WHERE business_id = ? ORDER BY active DESC, name ASC').all(req.params.id);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar servicios' });
  }
});

app.post('/api/businesses/:id/services', requireBusinessAdmin, async (req, res) => {
  try {
    const { name, category, duration, price, description } = req.body;
    if (!name || !duration || price === undefined) {
      return res.status(400).json({ error: 'Nombre, duración y precio son requeridos' });
    }

    const id = 'srv_' + randomUUID();
    await db.prepare(`
      INSERT INTO services (id, business_id, name, category, duration, price, description, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, req.params.id, name, category || 'General', parseInt(duration), parseFloat(price), description || '');

    const created = await db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating service:', err);
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

app.put('/api/services/:id', requireServiceBusinessAdmin, async (req, res) => {
  try {
    const { name, category, duration, price, description, active } = req.body;
    await db.prepare(`
      UPDATE services
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          duration = COALESCE(?, duration),
          price = COALESCE(?, price),
          description = COALESCE(?, description),
          active = COALESCE(?, active)
      WHERE id = ?
    `).run(name, category, duration, price, description, active, req.params.id);

    const updated = await db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

app.delete('/api/services/:id', requireServiceBusinessAdmin, async (req, res) => {
  try {
    await db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Servicio eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

// ----------------------------------------------------
// AVAILABLE TIME SLOTS GENERATOR (Requirements 47, 49, 50)
// Prevents overlap and strictly follows business open/close hours and working days
// ----------------------------------------------------
app.get('/api/businesses/:id/available-slots', async (req, res) => {
  try {
    const { date, serviceId } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'La fecha es obligatoria (YYYY-MM-DD)' });
    }

    const business = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
    if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

    const workingDays = JSON.parse(business.working_days);
    
    // Parse requested date day of week (in local Putumayo time)
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayOfWeek = dayNames[dateObj.getDay()];

    if (!workingDays.includes(dayOfWeek)) {
      return res.json({
        available: false,
        reason: `El establecimiento no labora los días ${dayOfWeek}. Días de atención: ${workingDays.join(', ')}.`,
        slots: []
      });
    }

    // Get service duration
    let duration = business.slot_duration_default || 30;
    if (serviceId) {
      const srv = await db.prepare('SELECT duration FROM services WHERE id = ?').get(serviceId);
      if (srv && srv.duration) duration = srv.duration;
    }

    // Parse business hours (e.g. "08:00" to "19:00")
    const [openH, openM] = business.open_time.split(':').map(Number);
    const [closeH, closeM] = business.close_time.split(':').map(Number);
    const openTotalMin = openH * 60 + openM;
    const closeTotalMin = closeH * 60 + closeM;

    // Get existing booked tickets for that date
    const bookedTickets = await db.prepare(`
      SELECT time_slot, estimated_duration, status
      FROM tickets
      WHERE business_id = ? AND date = ? AND status NOT IN ('cancelado')
    `).all(req.params.id, date);

    // Compute booked intervals [startMin, endMin]
    const bookedIntervals = bookedTickets.map(t => {
      const [h, m] = t.time_slot.split(':').map(Number);
      const start = h * 60 + m;
      return {
        start,
        end: start + (t.estimated_duration || duration)
      };
    });

    // Check if selected date is today to filter out already passed time slots
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const isToday = (date === todayStr);
    const currentMinToday = now.getHours() * 60 + now.getMinutes();

    // Generate candidate slots in step of duration or 15 mins
    const stepMin = duration <= 30 ? 30 : 30;
    const slots = [];

    for (let cur = openTotalMin; cur + duration <= closeTotalMin; cur += stepMin) {
      const slotEnd = cur + duration;

      // If today, slot must be in the future (or at least 10 minutes ahead)
      if (isToday && cur < currentMinToday + 5) {
        continue;
      }

      // Check collision with any existing booked interval
      const hasConflict = bookedIntervals.some(b => {
        return (cur < b.end && slotEnd > b.start);
      });

      const slotHours = Math.floor(cur / 60).toString().padStart(2, '0');
      const slotMins = (cur % 60).toString().padStart(2, '0');
      const timeFormatted = `${slotHours}:${slotMins}`;

      // 12-hour display format e.g. "09:30 AM"
      const period = cur < 720 ? 'AM' : 'PM';
      let h12 = Math.floor(cur / 60) % 12;
      if (h12 === 0) h12 = 12;
      const display12 = `${h12}:${slotMins} ${period}`;

      slots.push({
        time: timeFormatted,
        display: display12,
        available: !hasConflict,
        duration
      });
    }

    res.json({
      available: true,
      business_name: business.name,
      business_hours: `${business.open_time} - ${business.close_time}`,
      date,
      day_of_week: dayOfWeek,
      duration,
      slots
    });
  } catch (err) {
    console.error('Error generating slots:', err);
    res.status(500).json({ error: 'Error al calcular horarios disponibles' });
  }
});

// ----------------------------------------------------
// TICKETS / QUEUE MANAGEMENT
// ----------------------------------------------------

// Get live queue for a business (for customer tracking, employee dashboard, or public waiting room TV)
app.get('/api/businesses/:id/queue', requireRoles('admin', 'empleado', 'superadmin'), requireBusinessAccess, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Active ticket being attended right now
    const currentlyAttending = await db.prepare(`
      SELECT t.*, s.name as service_name, s.category as service_category, u.name as employee_name
      FROM tickets t
      LEFT JOIN services s ON t.service_id = s.id
      LEFT JOIN users u ON t.assigned_employee_id = u.id
      WHERE t.business_id = ? AND t.date = ? AND t.status = 'atendiendo'
      ORDER BY t.called_at DESC
      LIMIT 1
    `).get(req.params.id, today);

    // Waiting queue
    const waitingList = await db.prepare(`
      SELECT t.*, s.name as service_name, s.category as service_category, s.duration
      FROM tickets t
      LEFT JOIN services s ON t.service_id = s.id
      WHERE t.business_id = ? AND t.date = ? AND t.status = 'espera'
      ORDER BY t.time_slot ASC, t.ticket_seq ASC
    `).all(req.params.id, today);

    // Recently attended today
    const recentlyAttended = await db.prepare(`
      SELECT t.*, s.name as service_name
      FROM tickets t
      LEFT JOIN services s ON t.service_id = s.id
      WHERE t.business_id = ? AND t.date = ? AND t.status = 'atendido'
      ORDER BY t.completed_at DESC
      LIMIT 6
    `).all(req.params.id, today);

    // Summary counters
    const stats = {
      total_today: (await db.prepare('SELECT COUNT(*) as count FROM tickets WHERE business_id = ? AND date = ?').get(req.params.id, today)).count,
      waiting_count: waitingList.length,
      attending_count: currentlyAttending ? 1 : 0,
      completed_count: (await db.prepare("SELECT COUNT(*) as count FROM tickets WHERE business_id = ? AND date = ? AND status = 'atendido'").get(req.params.id, today)).count,
    };

    res.json({
      currently_attending: currentlyAttending || null,
      waiting_list: waitingList,
      recently_attended: recentlyAttended,
      stats
    });
  } catch (err) {
    console.error('Error fetching queue:', err);
    res.status(500).json({ error: 'Error al consultar la cola de turnos' });
  }
});

// Create new ticket / reservation
app.post('/api/tickets', async (req, res) => {
  try {
    const {
      business_id,
      service_id,
      client_name,
      client_phone,
      client_email,
      party_size = 1,
      notes = '',
      date,
      time_slot
    } = req.body;

    if (!business_id || !service_id || !client_name || !date || !time_slot) {
      return res.status(400).json({ error: 'Datos incompletos para solicitar el turno' });
    }

    const business = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(business_id);
    if (!business) return res.status(404).json({ error: 'Negocio no válido' });

    const service = await db.prepare('SELECT * FROM services WHERE id = ?').get(service_id);
    if (!service) return res.status(404).json({ error: 'Servicio no válido' });

    // Verify slot is not already taken by an active ticket
    const conflict = await db.prepare(`
      SELECT id FROM tickets
      WHERE business_id = ? AND date = ? AND time_slot = ? AND status NOT IN ('cancelado')
    `).get(business_id, date, time_slot);

    if (conflict) {
      return res.status(409).json({ error: 'El horario seleccionado ya fue reservado por otro cliente. Por favor elige otro intervalo disponible.' });
    }

    // Use sequential codes locally; public deployments use unguessable codes for ticket privacy.
    const countToday = (await db.prepare('SELECT COUNT(*) as count FROM tickets WHERE business_id = ? AND date = ?').get(business_id, date)).count;
    const seq = countToday + 1;
    const prefix = business.type === 'barberia' ? 'TF-B' : 'TF-R';
    const ticketCode = process.env.SUPABASE_DB_URL
      ? `${prefix}-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`
      : `${prefix}${seq.toString().padStart(2, '0')}`;
    const ticketId = randomUUID();
    const user_id = req.user?.role === 'cliente' ? req.user.sub : null;

    const insert = db.prepare(`
      INSERT INTO tickets (
        id, ticket_code, ticket_seq, business_id, service_id,
        client_name, client_phone, client_email, user_id, party_size, notes,
        date, time_slot, estimated_duration, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'espera')
    `);

    await insert.run(
      ticketId,
      ticketCode,
      seq,
      business_id,
      service_id,
      client_name,
      client_phone || '',
      client_email || '',
      user_id,
      parseInt(party_size) || 1,
      notes || '',
      date,
      time_slot,
      service.duration || 30
    );

    // Insert history record
    await db.prepare(`
      INSERT INTO ticket_history (id, ticket_id, status, changed_by, note)
      VALUES (?, ?, 'espera', ?, 'Turno solicitado')
    `).run('hist_' + randomUUID(), ticketId, client_name);

    // Calculate queue position: how many people ahead
    const ahead = (await db.prepare(`
      SELECT COUNT(*) as count FROM tickets
      WHERE business_id = ? AND date = ? AND status = 'espera' AND id != ? AND (time_slot < ? OR (time_slot = ? AND ticket_seq < ?))
    `).get(business_id, date, ticketId, time_slot, time_slot, seq)).count;

    const fullTicket = await db.prepare(`
      SELECT t.*, s.name as service_name, s.price as service_price, b.name as business_name, b.address as business_address
      FROM tickets t
      LEFT JOIN services s ON t.service_id = s.id
      LEFT JOIN businesses b ON t.business_id = b.id
      WHERE t.id = ?
    `).get(ticketId);

    // Notify clients in real-time
    await broadcastEvent('new_ticket', { business_id, ticket: fullTicket });

    res.status(201).json({
      ...fullTicket,
      people_ahead: ahead,
      estimated_wait_minutes: ahead * (service.duration || 30)
    });
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ error: 'Error al registrar turno' });
  }
});

// Track ticket by code or ID
app.get('/api/tickets/track/:code', async (req, res) => {
  try {
    const code = req.params.code.trim();
    const ticket = await db.prepare(`
      SELECT t.*, s.name as service_name, s.price as service_price, s.duration,
             b.name as business_name, b.type as business_type, b.address as business_address, b.phone as business_phone,
             u.name as employee_name
      FROM tickets t
      LEFT JOIN services s ON t.service_id = s.id
      LEFT JOIN businesses b ON t.business_id = b.id
      LEFT JOIN users u ON t.assigned_employee_id = u.id
      WHERE UPPER(t.ticket_code) = UPPER(?) OR t.id = ?
      ORDER BY t.created_at DESC
      LIMIT 1
    `).get(code, code);

    if (!ticket) {
      return res.status(404).json({ error: `No se encontró ningún turno con el código "${code}"` });
    }

    // Compute people ahead if status is 'espera'
    let peopleAhead = 0;
    if (ticket.status === 'espera') {
      peopleAhead = (await db.prepare(`
        SELECT COUNT(*) as count FROM tickets
        WHERE business_id = ? AND date = ? AND status = 'espera' AND id != ?
          AND (time_slot < ? OR (time_slot = ? AND ticket_seq < ?))
      `).get(ticket.business_id, ticket.date, ticket.id, ticket.time_slot, ticket.time_slot, ticket.ticket_seq)).count;
    }

    const { client_phone, client_email, ...publicTicket } = ticket;
    res.json({
      ...publicTicket,
      people_ahead: peopleAhead,
      estimated_wait_minutes: peopleAhead * (ticket.duration || 30)
    });
  } catch (err) {
    console.error('Error tracking ticket:', err);
    res.status(500).json({ error: 'Error al consultar turno' });
  }
});

// Update ticket status (Called / Next / Attending / Completed / Cancelled)
app.put('/api/tickets/:id/status', requireRoles('admin', 'empleado', 'superadmin'), requireTicketBusinessAccess, async (req, res) => {
  try {
    const { status, employee_id = null, employee_name = 'Personal' } = req.body;
    const validStatuses = ['espera', 'atendiendo', 'atendido', 'cancelado', 'aplazado'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado de turno no válido' });
    }

    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Turno no encontrado' });

    const nowTime = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

    let updateQuery = 'UPDATE tickets SET status = ?';
    const params = [status];

    if (status === 'atendiendo') {
      updateQuery += ', called_at = ?, assigned_employee_id = COALESCE(?, assigned_employee_id)';
      params.push(nowTime, employee_id);
    } else if (status === 'atendido') {
      updateQuery += ', completed_at = ?';
      params.push(nowTime);
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.params.id);

    await db.prepare(updateQuery).run(...params);

    // Record in history
    await db.prepare(`
      INSERT INTO ticket_history (id, ticket_id, status, changed_by, note)
      VALUES (?, ?, ?, ?, ?)
    `).run('hist_' + randomUUID(), req.params.id, status, employee_name, `Estado cambiado a ${status}`);

    const updated = await db.prepare(`
      SELECT t.*, s.name as service_name, b.name as business_name
      FROM tickets t
      LEFT JOIN services s ON t.service_id = s.id
      LEFT JOIN businesses b ON t.business_id = b.id
      WHERE t.id = ?
    `).get(req.params.id);

    await broadcastEvent('ticket_status_changed', {
      business_id: ticket.business_id,
      ticket: updated,
      new_status: status
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating ticket status:', err);
    res.status(500).json({ error: 'Error al actualizar estado del turno' });
  }
});

// Postpone turn (Aplazar turno - Image 2 use case)
app.put('/api/tickets/:id/aplazado', async (req, res) => {
  try {
    const { new_time_slot, new_date } = req.body;
    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Turno no encontrado' });

    if (ticket.status !== 'espera') {
      return res.status(400).json({ error: 'Solo se pueden aplazar turnos en estado de espera' });
    }

    const targetDate = new_date || ticket.date;
    let targetTime = new_time_slot;

    // If no specific slot passed, push it back by 30 mins
    if (!targetTime) {
      const [h, m] = ticket.time_slot.split(':').map(Number);
      const total = h * 60 + m + 30;
      targetTime = `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
    }

    await db.prepare(`
      UPDATE tickets
      SET status = 'espera', time_slot = ?, date = ?, notes = notes || ' [Turno aplazado]'
      WHERE id = ?
    `).run(targetTime, targetDate, req.params.id);

    await db.prepare(`
      INSERT INTO ticket_history (id, ticket_id, status, changed_by, note)
      VALUES (?, ?, 'aplazado', 'Cliente', ?)
    `).run('hist_' + randomUUID(), req.params.id, `Turno aplazado para las ${targetTime}`);

    const updated = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    await broadcastEvent('ticket_status_changed', {
      business_id: ticket.business_id,
      ticket: updated,
      new_status: 'aplazado'
    });

    res.json(updated);
  } catch (err) {
    console.error('Error postponing ticket:', err);
    res.status(500).json({ error: 'Error al aplazar el turno' });
  }
});

// Cancel turn (Cancelar turno - Image 2 use case)
app.put('/api/tickets/:id/cancel', async (req, res) => {
  try {
    const ticket = await db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Turno no encontrado' });

    await db.prepare("UPDATE tickets SET status = 'cancelado' WHERE id = ?").run(req.params.id);

    await db.prepare(`
      INSERT INTO ticket_history (id, ticket_id, status, changed_by, note)
      VALUES (?, ?, 'cancelado', 'Cliente', 'Turno cancelado por el usuario')
    `).run('hist_' + randomUUID(), req.params.id);

    await broadcastEvent('ticket_status_changed', {
      business_id: ticket.business_id,
      ticketId: req.params.id,
      new_status: 'cancelado'
    });

    res.json({ success: true, message: 'Turno cancelado satisfactoriamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar turno' });
  }
});

// ----------------------------------------------------
// ADMIN CALENDAR (Requirement 48: "calendario centralizado con los turnos agendados por día y por semana")
// ----------------------------------------------------
app.get('/api/businesses/:id/calendar', requireBusinessAccess, async (req, res) => {
  try {
    const { start, end } = req.query;
    let query = `
      SELECT t.*, s.name as service_name, s.category as service_category, s.price as service_price,
             u.name as employee_name
      FROM tickets t
      LEFT JOIN services s ON t.service_id = s.id
      LEFT JOIN users u ON t.assigned_employee_id = u.id
      WHERE t.business_id = ?
    `;
    const params = [req.params.id];

    if (start && end) {
      query += ' AND t.date >= ? AND t.date <= ?';
      params.push(start, end);
    } else if (start) {
      query += ' AND t.date = ?';
      params.push(start);
    }

    query += ' ORDER BY t.date ASC, t.time_slot ASC';
    const tickets = await db.prepare(query).all(...params);

    res.json(tickets);
  } catch (err) {
    console.error('Error fetching calendar:', err);
    res.status(500).json({ error: 'Error al consultar calendario de turnos' });
  }
});

// ----------------------------------------------------
// ATTENTION HISTORY & AUDIT (Requirement 53: "consultar el historial de atención de los turnos gestionados")
// ----------------------------------------------------
app.get('/api/businesses/:id/history', requireBusinessAdmin, async (req, res) => {
  try {
    const { status, dateFrom, dateTo, search } = req.query;
    let query = `
      SELECT t.*, s.name as service_name, s.price as service_price, u.name as employee_name
      FROM tickets t
      LEFT JOIN services s ON t.service_id = s.id
      LEFT JOIN users u ON t.assigned_employee_id = u.id
      WHERE t.business_id = ?
    `;
    const params = [req.params.id];

    if (status && status !== 'todos') {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (dateFrom) {
      query += ' AND t.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND t.date <= ?';
      params.push(dateTo);
    }
    if (search) {
      query += ' AND (t.client_name LIKE ? OR t.ticket_code LIKE ? OR t.client_phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY t.date DESC, t.time_slot DESC';
    const list = await db.prepare(query).all(...params);

    // Compute metrics
    const totalAttended = list.filter(t => t.status === 'atendido').length;
    const totalCancelled = list.filter(t => t.status === 'cancelado').length;
    const totalWaiting = list.filter(t => t.status === 'espera').length;

    res.json({
      metrics: {
        total_records: list.length,
        total_attended: totalAttended,
        total_cancelled: totalCancelled,
        total_waiting: totalWaiting,
        completion_rate: list.length > 0 ? Math.round((totalAttended / list.length) * 100) : 0
      },
      records: list
    });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Error al consultar el historial de atención' });
  }
});

// ----------------------------------------------------
// INVENTORY & CATALOG (Image 3: "Catalogo", "Gestionar inventario")
// ----------------------------------------------------
app.get('/api/businesses/:id/inventory', requireBusinessAccess, async (req, res) => {
  try {
    const items = await db.prepare('SELECT * FROM inventory WHERE business_id = ? ORDER BY category ASC, name ASC').all(req.params.id);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
});

app.post('/api/businesses/:id/inventory', requireBusinessAccess, async (req, res) => {
  try {
    const { name, category, price, stock, unit = 'unidad', min_stock = 5 } = req.body;
    if (!name || stock === undefined || price === undefined) {
      return res.status(400).json({ error: 'Nombre, precio y stock son obligatorios' });
    }

    const id = 'inv_' + randomUUID();
    await db.prepare(`
      INSERT INTO inventory (id, business_id, name, category, price, stock, unit, min_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, name, category || 'General', parseFloat(price), parseInt(stock), unit, parseInt(min_stock));

    const item = await db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar artículo en inventario' });
  }
});

app.put('/api/inventory/:id', requireInventoryBusinessAccess, async (req, res) => {
  try {
    const { name, category, price, stock, unit, min_stock } = req.body;
    await db.prepare(`
      UPDATE inventory
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          price = COALESCE(?, price),
          stock = COALESCE(?, stock),
          unit = COALESCE(?, unit),
          min_stock = COALESCE(?, min_stock)
      WHERE id = ?
    `).run(name, category, price, stock, unit, min_stock, req.params.id);

    const updated = await db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar artículo' });
  }
});

// ----------------------------------------------------
// USERS LIST FOR ADMIN
// ----------------------------------------------------
app.get('/api/businesses/:id/staff', requireBusinessAdmin, async (req, res) => {
  try {
    const staff = await db.prepare(`
      SELECT id, name, email, phone, role, business_id, created_at
      FROM users
      WHERE business_id = ? OR role = 'admin'
      ORDER BY role ASC, name ASC
    `).all(req.params.id);
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar personal' });
  }
});

// ----------------------------------------------------
// MARKETPLACE (Rappi-style discovery without login)
// ----------------------------------------------------
app.get('/api/marketplace', async (req, res) => {
  try {
    const { category, type, search } = req.query;
    let query = 'SELECT * FROM businesses WHERE status = ?';
    const params = ['activo'];

    if (type && type !== 'todos') {
      query += ' AND type = ?';
      params.push(type);
    }
    if (category && category !== 'todos') {
      query += ' AND (category LIKE ? OR name LIKE ?)';
      params.push(`%${category}%`, `%${category}%`);
    }
    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ? OR slogan LIKE ? OR address LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY rating DESC, review_count DESC';
    const businesses = await db.prepare(query).all(...params);

    const fullBusinesses = await Promise.all(businesses.map(async b => {
      const services = await db.prepare('SELECT * FROM services WHERE business_id = ? AND active = 1 ORDER BY price ASC').all(b.id);
      const items = await db.prepare('SELECT * FROM inventory WHERE business_id = ? ORDER BY popular DESC, price ASC LIMIT 6').all(b.id);
      return {
        ...b,
        working_days: typeof b.working_days === 'string' ? JSON.parse(b.working_days) : b.working_days,
        services,
        items
      };
    }));

    // Popular food dishes / services across Mocoa
    const popularDishes = await db.prepare(`
      SELECT i.*, b.name as business_name, b.type as business_type, b.rating as business_rating
      FROM inventory i
      JOIN businesses b ON i.business_id = b.id
      WHERE b.status = 'activo' AND i.popular = 1
      ORDER BY i.price ASC
      LIMIT 10
    `).all();

    res.json({
      businesses: fullBusinesses,
      popular_dishes: popularDishes,
      categories: [
        { id: 'todos', label: 'Todos los locales', icon: 'Sparkles' },
        { id: 'restaurante', label: 'Restaurantes', icon: 'Utensils' },
        { id: 'barberia', label: 'Barberías & Spa', icon: 'Scissors' },
        { id: 'asados', label: 'Carnes & Parrilla', icon: 'Flame' },
        { id: 'amazonica', label: 'Amazónica & Típica', icon: 'Leaf' },
        { id: 'cafe', label: 'Café & Mirador', icon: 'Coffee' }
      ]
    });
  } catch (err) {
    console.error('Error fetching marketplace:', err);
    res.status(500).json({ error: 'Error al consultar el marketplace' });
  }
});

// ----------------------------------------------------
// SUPER ADMIN DASHBOARD & PLATFORM MANAGEMENT
// ----------------------------------------------------
app.get('/api/superadmin/dashboard', requireRoles('superadmin'), async (req, res) => {
  try {
    const totalBusinesses = (await db.prepare('SELECT COUNT(*) as count FROM businesses').get()).count;
    const activeBusinesses = (await db.prepare("SELECT COUNT(*) as count FROM businesses WHERE status = 'activo'").get()).count;
    const totalUsers = (await db.prepare('SELECT COUNT(*) as count FROM users').get()).count;
    const totalTickets = (await db.prepare('SELECT COUNT(*) as count FROM tickets').get()).count;
    const completedTickets = (await db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'atendido'").get()).count;

    // Platform Financials (Platform earnings, keeping companies' internal ledgers private)
    const txTotal = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM platform_transactions WHERE status = 'completado'").get()).total;
    const subTotal = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM platform_transactions WHERE type = 'suscripcion_mensual' AND status = 'completado'").get()).total;
    const commTotal = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM platform_transactions WHERE type = 'comision_turno' AND status = 'completado'").get()).total;

    // Monthly Recurring Revenue (MRR) from active business subscriptions
    const projectedMrr = (await db.prepare("SELECT COALESCE(SUM(monthly_fee), 0) as mrr FROM businesses WHERE status = 'activo'").get()).mrr;

    // All businesses with summary metrics for superadmin
    const businesses = await db.prepare('SELECT * FROM businesses ORDER BY created_at DESC').all();
    const enrichedBusinesses = await Promise.all(businesses.map(async b => {
      const ticketsCount = (await db.prepare('SELECT COUNT(*) as count FROM tickets WHERE business_id = ?').get(b.id)).count;
      const staffCount = (await db.prepare('SELECT COUNT(*) as count FROM users WHERE business_id = ?').get(b.id)).count;
      const today = new Date().toISOString().split('T')[0];
      const todayTickets = (await db.prepare('SELECT COUNT(*) as count FROM tickets WHERE business_id = ? AND date = ?').get(b.id, today)).count;

      return {
        ...b,
        working_days: typeof b.working_days === 'string' ? JSON.parse(b.working_days) : b.working_days,
        stats: {
          total_tickets: ticketsCount,
          today_tickets: todayTickets,
          staff_count: staffCount
        }
      };
    }));

    // Recent platform transactions
    const recentTx = await db.prepare('SELECT * FROM platform_transactions ORDER BY date DESC, created_at DESC LIMIT 15').all();

    res.json({
      metrics: {
        total_businesses: totalBusinesses,
        active_businesses: activeBusinesses,
        total_users: totalUsers,
        total_tickets: totalTickets,
        completed_tickets: completedTickets,
        total_platform_income: txTotal,
        subscriptions_income: subTotal,
        commissions_income: commTotal,
        projected_mrr: projectedMrr
      },
      businesses: enrichedBusinesses,
      transactions: recentTx
    });
  } catch (err) {
    console.error('Error in superadmin dashboard:', err);
    res.status(500).json({ error: 'Error al obtener datos de superadmin' });
  }
});

// Toggle business status by Super Admin
app.put('/api/superadmin/businesses/:id/status', requireRoles('superadmin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['activo', 'pausado'].includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    await db.prepare('UPDATE businesses SET status = ? WHERE id = ?').run(status, req.params.id);
    const updated = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
    await broadcastEvent('settings_updated', { businessId: req.params.id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar estado del negocio' });
  }
});

// Super Admin creates a new business on the platform
app.post('/api/superadmin/businesses', requireRoles('superadmin'), async (req, res) => {
  try {
    const {
      name,
      type,
      category,
      slogan,
      description,
      address,
      phone,
      subscription_plan = 'Plan Pro Empresarial',
      monthly_fee = 65000
    } = req.body;

    if (!name || !type || !address) {
      return res.status(400).json({ error: 'Nombre, tipo y dirección son requeridos' });
    }

    const id = 'biz_' + randomUUID();
    await db.prepare(`
      INSERT INTO businesses (
        id, name, type, category, slogan, description, address, phone,
        subscription_plan, monthly_fee, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')
    `).run(
      id,
      name,
      type,
      category || (type === 'barberia' ? 'Barbería & Spa' : 'Restaurante & Comidas'),
      slogan || '',
      description || '',
      address,
      phone || '',
      subscription_plan,
      parseFloat(monthly_fee) || 65000
    );

    // Record registration fee transaction for platform revenue
    await db.prepare(`
      INSERT INTO platform_transactions (id, business_id, business_name, type, concept, amount, status, date)
      VALUES (?, ?, ?, 'suscripcion_mensual', 'Alta inicial de membresía SaaS', ?, 'completado', ?)
    `).run('tx_' + randomUUID(), id, name, parseFloat(monthly_fee) || 65000, new Date().toISOString().split('T')[0]);

    const created = await db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
    await broadcastEvent('settings_updated', { businessId: id });
    res.status(201).json(created);
  } catch (err) {
    console.error('Error registering business:', err);
    res.status(500).json({ error: 'Error al registrar establecimiento' });
  }
});

// Serve frontend dist statically
app.use(express.static(distPath));

// Fallback to index.html for SPA routing (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  next();
});

if (process.env.VERCEL) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.status(404).end();
  });
}

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`TurnoFacil API Server running on port ${PORT}`);
    console.log(`Mocoa, Putumayo - Sistema de Gestion de Turnos`);
    console.log(`===============================================`);
  });
}
