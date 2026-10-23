# TurnoFácil — Plataforma de Turnos & Marketplace de Mocoa

**Enfoque:** Marketplace y Sistema de Turnos / Reservas para Restaurantes y Barberías de **Mocoa, Putumayo**  
**Propietario / Super Admin del Desarrollo:** **Nanotec**  
**Institución Académica:** Institución Universitaria del Putumayo (**ITP**) — Programa en Desarrollo de Software  
**Proyecto de Software 1** (Docente: Luis Jurado)  
**Autores del Documento Base:** Helen Solarte – Enid – Marbell Urrutia – Estefania Perenguez  

---

## 🌟 Nueva Arquitectura: Marketplace estilo "Rappi" & Super Admin

Siguiendo tus requerimientos, la aplicación se ha rediseñado completamente con separación estricta de roles y una experiencia pública abierta:

### 1. 🛍️ Experiencia Pública (Estilo Rappi — Sin iniciar sesión)
- **Home de Descubrimiento:** Cualquier usuario puede entrar a la página y explorar los restaurantes y barberías de Mocoa sin necesidad de registrarse ni iniciar sesión.
- **Filtros por Categoría:** *Restaurantes*, *Barberías & Spa*, *Carnes & Parrilla*, *Amazónica & Típica*, *Café & Mirador*.
- **Buscador en Tiempo Real:** Búsqueda ágil de comidas (ej. *cachama frita*, *sancocho*, *churrasco*) o servicios de barbería (*degradados*, *corte fade*, *barba*).
- **Especialidades y Platos Populares:** Carrusel de comidas destacadas de Mocoa con precios en COP e información del local.
- **Perfil Completo del Local:** Al hacer clic en un restaurante o barbería, el cliente accede a su carta, platos, servicios y botón para **Pedir Turno** o **Reservar Mesa** inmediatamente.
- **Rastreador Rápido de Turnos:** Búsqueda directa con código de ticket (ej. `TF-B02`).

---

### 2. 👑 Módulo Super Admin (Nanotec — Dueño de la Plataforma)
Acceso exclusivo para el propietario del desarrollo con el usuario `superadmin@turnofacil.com`:
- **Flujo Global de la Plataforma:** Supervisión del número total de turnos procesados en Mocoa, tasa de finalización y usuarios registrados.
- **Métricas Financieras de la Plataforma:**
  - **Ingresos Totales TurnoFácil:** Total recaudado por membresías mensuales SaaS y comisiones de turnos ($395.000 COP).
  - **MRR (Ingreso Mensual Recurrente Proyectado):** Ingreso mensual fijo por suscripciones ($325.000 COP/mes).
  - **Comisiones por Turno:** Comisiones de plataforma por reservas procesadas ($70.000 COP).
- **🔒 Privacidad Empresarial Garantizada:** La contabilidad y ganancias privadas de cada restaurante o barbería se mantienen estrictamente confidenciales. El Super Admin supervisa los ingresos que le corresponden a la plataforma TurnoFácil y el volumen operativo.
- **Directorio y Gestión de Locales Afiliados:**
  - Listado de locales con su plan SaaS (*Plan Pro*, *Plan Empresarial*, *Plan Básico*) y valor de membresía.
  - Botón para **Pausar** o **Activar** locales en el marketplace.
  - Botón para **Afiliar Nuevo Negocio en Mocoa** fijando su plan y mensualidad.
- **Exportación de Reportes Financieros en CSV/Excel.**

---

### 3. 🏢 Módulos por Roles Autenticados
- **Admin de Negocio (Dueño del local):** Calendario centralizado (Día y Semana), configuración de horarios laborales, CRUD de servicios y generación del afiche con código QR descargable.
- **Empleado (Barbero / Mesero):** Panel de atención en vivo con llamado por voz en español y timbre de sala (Web Audio API), control de cola y gestión de inventario/stock.
- **Cliente:** Historial de turnos, opciones para **Aplazar turno** o **Cancelar turno**.

---

## 🔑 Credenciales de Acceso Rápido

| Rol | Correo | Contraseña | Perfil / Acceso |
| :--- | :--- | :--- | :--- |
| **👑 SUPER ADMIN (Nanotec)** | `superadmin@turnofacil.com` | `superadmin123` | **Control total del flujo e ingresos de la plataforma** |
| **🏢 Admin Barbería** | `admin@turnofacil.com` | `admin123` | Barbería Don Mocoa & Spa |
| **🍽️ Admin Restaurante** | `admin.restaurante@turnofacil.com` | `admin123` | Restaurante Sabor Putumayense |
| **✂️ Empleado Barbero** | `barbero@turnofacil.com` | `empleado123` | Mateo Gómez (Don Mocoa) |
| **🙋‍♀️ Cliente** | `helen@gmail.com` | `cliente123` | Helen Solarte |

---

## 🚀 Cómo Ejecutar la Aplicación

La aplicación está corriendo en segundo plano y lista para abrir en el navegador:

👉 **[http://localhost:3001](http://localhost:3001)**
