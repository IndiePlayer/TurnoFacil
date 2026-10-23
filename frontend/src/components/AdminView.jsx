import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Settings, 
  QrCode, 
  History, 
  Plus, 
  Clock, 
  Save, 
  Download, 
  Printer, 
  CheckCircle, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Trash2,
  FileSpreadsheet,
  Users
} from 'lucide-react';

export default function AdminView({
  businessId,
  businesses,
  user
}) {
  const [activeTab, setActiveTab] = useState('calendario'); // 'calendario' | 'horarios' | 'servicios' | 'qr' | 'historial'
  
  // Settings Form state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    slogan: '',
    address: '',
    phone: '',
    open_time: '08:00',
    close_time: '19:00',
    working_days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
    slot_duration_default: 30
  });

  // Calendar state (RF 48: por día y por semana)
  const [calendarView, setCalendarView] = useState('dia'); // 'dia' | 'semana'
  const [calendarDate, setCalendarDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [calendarTickets, setCalendarTickets] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // QR Code state (RF 46)
  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);

  // Services list
  const [servicesList, setServicesList] = useState([]);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    category: 'General',
    duration: 30,
    price: 15000,
    description: ''
  });

  // History & Reports (RF 53)
  const [historyData, setHistoryData] = useState({ metrics: {}, records: [] });
  const [historyFilter, setHistoryFilter] = useState({
    status: 'todos',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [toastMsg, setToastMsg] = useState('');

  const currentBusiness = businesses.find(b => b.id === businessId) || businesses[0];

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Sync settings when business changes
  useEffect(() => {
    if (!currentBusiness) return;
    setSettingsForm({
      name: currentBusiness.name || '',
      slogan: currentBusiness.slogan || '',
      address: currentBusiness.address || '',
      phone: currentBusiness.phone || '',
      open_time: currentBusiness.open_time || '08:00',
      close_time: currentBusiness.close_time || '19:00',
      working_days: Array.isArray(currentBusiness.working_days) 
        ? currentBusiness.working_days 
        : ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
      slot_duration_default: currentBusiness.slot_duration_default || 30
    });
    fetchServices();
    fetchQrCode();
  }, [currentBusiness?.id]);

  // Fetch Calendar Data
  const fetchCalendar = async () => {
    if (!currentBusiness?.id) return;
    setLoadingCalendar(true);

    let start = calendarDate;
    let end = calendarDate;

    if (calendarView === 'semana') {
      const d = new Date(calendarDate + 'T00:00:00');
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      start = monday.toISOString().split('T')[0];
      end = sunday.toISOString().split('T')[0];
    }

    try {
      const res = await fetch(`/api/businesses/${currentBusiness.id}/calendar?start=${start}&end=${end}`);
      const data = await res.json();
      setCalendarTickets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [currentBusiness?.id, calendarDate, calendarView]);

  // Fetch Services
  const fetchServices = async () => {
    if (!currentBusiness?.id) return;
    try {
      const res = await fetch(`/api/businesses/${currentBusiness.id}/services`);
      const data = await res.json();
      setServicesList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch QR Code (RF 46)
  const fetchQrCode = async () => {
    if (!currentBusiness?.id) return;
    setLoadingQr(true);
    try {
      const res = await fetch(`/api/businesses/${currentBusiness.id}/qr`);
      const data = await res.json();
      setQrData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQr(false);
    }
  };

  // Fetch History (RF 53)
  const fetchHistory = async () => {
    if (!currentBusiness?.id) return;
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams({
        status: historyFilter.status,
        dateFrom: historyFilter.dateFrom,
        dateTo: historyFilter.dateTo,
        search: historyFilter.search
      });
      const res = await fetch(`/api/businesses/${currentBusiness.id}/history?${params.toString()}`);
      const data = await res.json();
      setHistoryData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchHistory();
    }
  }, [activeTab, currentBusiness?.id, historyFilter.status]);

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/businesses/${currentBusiness.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      });
      if (!res.ok) throw new Error('Error al guardar configuración');
      showToast('Configuración del establecimiento guardada con éxito.');
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Working Day
  const handleToggleDay = (day) => {
    const exists = settingsForm.working_days.includes(day);
    const updated = exists
      ? settingsForm.working_days.filter(d => d !== day)
      : [...settingsForm.working_days, day];
    setSettingsForm({ ...settingsForm, working_days: updated });
  };

  // Add Service
  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/businesses/${currentBusiness.id}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService)
      });
      if (!res.ok) throw new Error('Error al crear servicio');
      setShowAddServiceModal(false);
      setNewService({ name: '', category: 'General', duration: 30, price: 15000, description: '' });
      fetchServices();
      showToast('Servicio agregado exitosamente');
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Service Active
  const handleToggleServiceActive = async (srv) => {
    try {
      await fetch(`/api/services/${srv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: srv.active ? 0 : 1 })
      });
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Service
  const handleDeleteService = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este servicio?')) return;
    try {
      await fetch(`/api/services/${id}`, { method: 'DELETE' });
      fetchServices();
      showToast('Servicio eliminado');
    } catch (e) {
      console.error(e);
    }
  };

  // Export History to CSV
  const handleExportCSV = () => {
    if (!historyData.records || historyData.records.length === 0) {
      alert('No hay registros para exportar');
      return;
    }

    const headers = ['Codigo', 'Cliente', 'Telefono', 'Servicio', 'Fecha', 'Hora', 'Estado', 'AtendidoPor'];
    const rows = historyData.records.map(r => [
      r.ticket_code,
      `"${r.client_name}"`,
      r.client_phone || '',
      `"${r.service_name || ''}"`,
      r.date,
      r.time_slot,
      r.status,
      `"${r.employee_name || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TurnoFacil_Historial_${currentBusiness?.name || 'Mocoa'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Poster
  const handlePrintPoster = () => {
    window.print();
  };

  const daysList = [
    { key: 'lunes', label: 'Lunes' },
    { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      
      {/* Admin Top Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-1">
            <span>Módulo de Administración</span>
            <span>•</span>
            <span>{currentBusiness?.name}</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Panel de Control y Supervisión General
          </h2>
          <p className="text-xs text-slate-300">
            Administrador: {user ? user.name : 'Supervisión'} • Mocoa, Putumayo
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 bg-slate-800 p-1 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab('calendario')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'calendario' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendario</span>
          </button>

          <button
            onClick={() => setActiveTab('horarios')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'horarios' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Horarios & Días</span>
          </button>

          <button
            onClick={() => setActiveTab('servicios')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'servicios' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Servicios</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'qr' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Código QR</span>
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'historial' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TAB 1: CALENDARIO CENTRALIZADO (RF 48) */}
      {activeTab === 'calendario' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Calendario Centralizado de Turnos</h3>
              <p className="text-xs text-slate-500">
                Visualización integral de reservas y turnos agendados en Mocoa
              </p>
            </div>

            {/* View switcher: Day vs Week */}
            <div className="flex items-center space-x-3">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setCalendarView('dia')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    calendarView === 'dia' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Día
                </button>
                <button
                  onClick={() => setCalendarView('semana')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    calendarView === 'semana' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Semana
                </button>
              </div>

              {/* Date Selector */}
              <input
                type="date"
                value={calendarDate}
                onChange={e => setCalendarDate(e.target.value)}
                className="p-1.5 text-xs font-semibold rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Calendar Grid / Cards */}
          {loadingCalendar ? (
            <div className="py-12 text-center text-xs text-slate-400">Cargando agenda...</div>
          ) : calendarTickets.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              No hay turnos agendados para este período ({calendarDate}).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calendarTickets.map(t => {
                const isWait = t.status === 'espera';
                const isAttending = t.status === 'atendiendo';
                const isCompleted = t.status === 'atendido';
                const isCancelled = t.status === 'cancelado';

                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isAttending
                        ? 'border-amber-400 bg-amber-50/50 shadow-sm'
                        : isCompleted
                        ? 'border-blue-200 bg-blue-50/20'
                        : isCancelled
                        ? 'border-rose-200 bg-rose-50/20 opacity-60'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-900">{t.ticket_code}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAttending ? 'bg-amber-100 text-amber-800' :
                        isCompleted ? 'bg-blue-100 text-blue-800' :
                        isCancelled ? 'bg-rose-100 text-rose-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-800">{t.client_name}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{t.service_name}</div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{t.date} • {t.time_slot}</span>
                      </span>
                      <span>{t.client_phone || 'Sin tel'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONFIGURACIÓN DE HORARIOS Y DÍAS (RF 49, RF 50, RF 59) */}
      {activeTab === 'horarios' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Configuración de Horarios y Días Laborales</h3>
            <p className="text-xs text-slate-500">
              Define los horarios de apertura, cierre y días habilitados. El sistema calculará automáticamente los turnos disponibles para los clientes sin solapamientos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Establecimiento</label>
              <input
                type="text"
                required
                value={settingsForm.name}
                onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección en Mocoa</label>
              <input
                type="text"
                required
                value={settingsForm.address}
                onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hora de Apertura</label>
              <input
                type="time"
                required
                value={settingsForm.open_time}
                onChange={e => setSettingsForm({ ...settingsForm, open_time: e.target.value })}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hora de Cierre</label>
              <input
                type="time"
                required
                value={settingsForm.close_time}
                onChange={e => setSettingsForm({ ...settingsForm, close_time: e.target.value })}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duración base por defecto (minutos)</label>
              <select
                value={settingsForm.slot_duration_default}
                onChange={e => setSettingsForm({ ...settingsForm, slot_duration_default: parseInt(e.target.value) })}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value={15}>15 minutos</option>
                <option value={20}>20 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono de Atención / WhatsApp</label>
              <input
                type="text"
                value={settingsForm.phone}
                onChange={e => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Días Laborales Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Días laborales habilitados para reservas
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {daysList.map(d => {
                const isSelected = settingsForm.working_days.includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => handleToggleDay(d.key)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              * Los clientes no podrán solicitar turnos en días desmarcados (RF50).
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración de Atención</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: SERVICIOS CRUD (RF 49) */}
      {activeTab === 'servicios' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Catálogo de Servicios Ofrecidos</h3>
              <p className="text-xs text-slate-500">Configura la duración, precio y descripción de cada servicio</p>
            </div>

            <button
              onClick={() => setShowAddServiceModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5 self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Servicio</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Servicio</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Duración</th>
                  <th className="py-3 px-4">Precio COP</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {servicesList.map(srv => (
                  <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{srv.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{srv.description}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {srv.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">
                      {srv.duration} min
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {srv.price > 0 ? `$${srv.price.toLocaleString('es-CO')}` : 'Sin costo'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleServiceActive(srv)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          srv.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {srv.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteService(srv.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Eliminar servicio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CÓDIGO QR DESCARGABLE (RF 46 & RF 55) */}
      {activeTab === 'qr' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Código QR Descargable e Imprimible</h3>
            <p className="text-xs text-slate-500">
              Coloca este código QR en la entrada o mostrador del negocio en Mocoa para que los clientes reserven turno al instante desde su celular.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            {/* Visual Poster Template */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white rounded-3xl p-8 text-center shadow-xl border-4 border-emerald-500/30 relative">
              <div className="text-emerald-400 font-extrabold text-xs tracking-widest uppercase mb-1">
                TurnoFácil Mocoa
              </div>
              <h4 className="text-xl font-black text-white">{currentBusiness?.name}</h4>
              <p className="text-xs text-slate-300 mt-1">¡Pide tu turno sin filas físicas!</p>

              {/* QR Image */}
              <div className="my-6 inline-block p-4 bg-white rounded-2xl shadow-2xl">
                {qrData?.qr_data_url ? (
                  <img src={qrData.qr_data_url} alt="QR TurnoFacil" className="w-56 h-56 mx-auto" />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                    Generando código...
                  </div>
                )}
              </div>

              <p className="text-xs text-emerald-300 font-semibold">
                Escanea con la cámara de tu celular
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {qrData?.direct_url || 'http://localhost:5173'}
              </p>
            </div>

            {/* Actions & Instructions */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-700">
                <h5 className="font-bold text-slate-900 text-sm">Cómo funciona:</h5>
                <p>1. El cliente llega al restaurante o barbería y apunta su cámara al código QR.</p>
                <p>2. Se abre automáticamente el formulario de solicitud de turno sin pasos intermedios (RNF Usabilidad).</p>
                <p>3. El cliente ve su puesto en fila y tiempo estimado de atención.</p>
              </div>

              <div className="space-y-2 pt-2">
                {qrData?.qr_data_url && (
                  <a
                    href={qrData.qr_data_url}
                    download={`QR_TurnoFacil_${currentBusiness?.name || 'Mocoa'}.png`}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Imagen QR (PNG de Alta Resolución)</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handlePrintPoster}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Afiche Publicitario para el Local</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 5: HISTORIAL Y REPORTES (RF 53) */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Historial de Atención y Métricas</h3>
              <p className="text-xs text-slate-500">Consulta los turnos completados, tiempos y efectividad</p>
            </div>

            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5 self-start"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar Reporte Excel / CSV</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Total Turnos</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {historyData.metrics?.total_records || 0}
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
              <span className="text-xs text-emerald-700 font-medium">Atendidos con Éxito</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {historyData.metrics?.total_attended || 0}
              </div>
            </div>

            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200">
              <span className="text-xs text-rose-700 font-medium">Cancelados / Ausentes</span>
              <div className="text-2xl font-black text-rose-800 mt-1">
                {historyData.metrics?.total_cancelled || 0}
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200">
              <span className="text-xs text-indigo-700 font-medium">Tasa de Efectividad</span>
              <div className="text-2xl font-black text-indigo-800 mt-1">
                {historyData.metrics?.completion_rate || 0}%
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap gap-3 items-center pt-2">
            <select
              value={historyFilter.status}
              onChange={e => setHistoryFilter({ ...historyFilter, status: e.target.value })}
              className="p-2 text-xs rounded-xl border border-slate-300 font-medium"
            >
              <option value="todos">Todos los estados</option>
              <option value="atendido">Solo Atendidos</option>
              <option value="espera">Solo en Espera</option>
              <option value="cancelado">Solo Cancelados</option>
            </select>

            <input
              type="text"
              placeholder="Buscar por cliente o código..."
              value={historyFilter.search}
              onChange={e => setHistoryFilter({ ...historyFilter, search: e.target.value })}
              className="p-2 text-xs rounded-xl border border-slate-300 font-medium flex-1 min-w-[180px]"
            />

            <button
              onClick={fetchHistory}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
            >
              Filtrar
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Servicio</th>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Atendido Por</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyData.records?.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-black text-slate-900">{r.ticket_code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{r.client_name}</td>
                    <td className="py-3 px-4 text-slate-600">{r.service_name}</td>
                    <td className="py-3 px-4 text-slate-600">{r.date} • {r.time_slot}</td>
                    <td className="py-3 px-4 text-slate-500">{r.employee_name || 'Personal'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'atendido' ? 'bg-blue-100 text-blue-800' :
                        r.status === 'cancelado' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERVICE */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-base mb-4">Agregar Nuevo Servicio</h4>
            <form onSubmit={handleCreateService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Servicio</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Corte Fade Personalizado"
                  value={newService.name}
                  onChange={e => setNewService({ ...newService, name: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cortes, Reservas"
                    value={newService.category}
                    onChange={e => setNewService({ ...newService, category: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duración (min)</label>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    required
                    value={newService.duration}
                    onChange={e => setNewService({ ...newService, duration: parseInt(e.target.value) })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Precio COP</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={newService.price}
                  onChange={e => setNewService({ ...newService, price: parseFloat(e.target.value) })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows="2"
                  value={newService.description}
                  onChange={e => setNewService({ ...newService, description: e.target.value })}
                  className="w-full p-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm"
                >
                  Crear Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

