import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Store, 
  Activity, 
  Lock, 
  CheckCircle, 
  PauseCircle, 
  PlayCircle, 
  Plus, 
  Download, 
  FileSpreadsheet, 
  CreditCard,
  Building,
  ArrowUpRight,
  Eye,
  AlertCircle
} from 'lucide-react';

export default function SuperAdminView({
  user,
  onOpenStorefront
}) {
  const [data, setData] = useState({
    metrics: {},
    businesses: [],
    transactions: []
  });
  const [loading, setLoading] = useState(true);
  const [showNewBizModal, setShowNewBizModal] = useState(false);
  const [newBizForm, setNewBizForm] = useState({
    name: '',
    type: 'restaurante',
    category: 'Restaurante & Comidas',
    slogan: '',
    address: '',
    phone: '',
    subscription_plan: 'Plan Pro Empresarial',
    monthly_fee: 65000
  });
  const [toastMsg, setToastMsg] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching superadmin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Toggle business active/paused
  const handleToggleStatus = async (biz) => {
    const newStatus = biz.status === 'activo' ? 'pausado' : 'activo';
    try {
      const res = await fetch(`/api/superadmin/businesses/${biz.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Error al actualizar estado');
      fetchDashboard();
      showToast(`Estado de "${biz.name}" cambiado a ${newStatus}`);
    } catch (err) {
      alert(err.message);
    }
  };

  // Create new business
  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/superadmin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBizForm)
      });
      if (!res.ok) throw new Error('Error al afiliar negocio');
      setShowNewBizModal(false);
      setNewBizForm({
        name: '',
        type: 'restaurante',
        category: 'Restaurante & Comidas',
        slogan: '',
        address: '',
        phone: '',
        subscription_plan: 'Plan Pro Empresarial',
        monthly_fee: 65000
      });
      fetchDashboard();
      showToast('¡Nuevo establecimiento afiliado exitosamente a TurnoFácil Mocoa!');
    } catch (err) {
      alert(err.message);
    }
  };

  // Export Platform Revenue CSV
  const handleExportCSV = () => {
    if (!data.transactions || data.transactions.length === 0) {
      alert('No hay transacciones registradas');
      return;
    }

    const headers = ['ID_Transaccion', 'Negocio', 'Tipo', 'Concepto', 'Monto_COP', 'Fecha', 'Estado'];
    const rows = data.transactions.map(t => [
      t.id,
      `"${t.business_name}"`,
      t.type,
      `"${t.concept}"`,
      t.amount,
      t.date,
      t.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ingresos_Plataforma_TurnoFacil_Nanotec_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const m = data.metrics || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* Super Admin Top Header */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/40">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>HQ Plataforma Central • Super Admin</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Panel de Propietario del Desarrollo — TurnoFácil
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Bienvenido, <strong>{user?.name || 'Nanotec'}</strong>. Supervisión de flujo de la app web e ingresos generados en Mocoa, Putumayo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowNewBizModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Afiliar Nuevo Negocio</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Ingresos Plataforma</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* PRIVACY SHIELD BANNER (Cumplimiento de privacidad de las empresas) */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 text-xs text-slate-300 flex items-start space-x-3 shadow-sm">
        <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white text-sm block">
            🔒 Protocolo de Privacidad Financiera Activo
          </strong>
          <p className="text-slate-300 leading-relaxed">
            Las finanzas internas, ingresos brutos y contabilidad privada de cada empresa afiliada están estrictamente protegidas. Este panel de Super Admin visualiza con total transparencia el <strong>flujo operativo de la plataforma</strong> y los <strong>ingresos propios devengados por TurnoFácil</strong> (suscripciones SaaS mensuales y comisiones por volumen de turnos).
          </p>
        </div>
      </div>

      {/* FINANCIAL & FLOW KPI CARDS (Ingresos de la Plataforma) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Ingresos Totales Plataforma */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ingresos Totales Plataforma</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            ${(m.total_platform_income || 0).toLocaleString('es-CO')} <span className="text-xs font-semibold text-slate-400">COP</span>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-2 flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Membresías SaaS + Comisiones</span>
          </p>
        </div>

        {/* Card 2: MRR (Ingreso Mensual Recurrente) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">MRR Mensual Proyectado</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            ${(m.projected_mrr || 0).toLocaleString('es-CO')} <span className="text-xs font-semibold text-slate-400">COP/mes</span>
          </div>
          <p className="text-[11px] text-indigo-600 font-semibold mt-2">
            {m.active_businesses || 0} locales con membresía activa
          </p>
        </div>

        {/* Card 3: Comisiones de Turnos */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Comisiones de Reserva</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            ${(m.commissions_income || 0).toLocaleString('es-CO')} <span className="text-xs font-semibold text-slate-400">COP</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Recaudado por turnos procesados
          </p>
        </div>

        {/* Card 4: Flujo Total de Turnos en Mocoa */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Flujo de Turnos App</span>
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {m.total_tickets || 0} <span className="text-xs font-semibold text-slate-400">turnos</span>
          </div>
          <p className="text-[11px] text-teal-600 font-semibold mt-2">
            {m.completed_tickets || 0} completados exitosamente
          </p>
        </div>

      </div>

      {/* ESTABLECIMIENTOS AFILIADOS Y SU ESTADO */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <Building className="w-5 h-5 text-indigo-600" />
              <span>Establecimientos Afiliados en Mocoa ({data.businesses?.length || 0})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Supervisión de estado, planes de suscripción y volumen de turnos
            </p>
          </div>

          <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-xl font-semibold text-slate-700">
            Total Empresas: {data.businesses?.length || 0} | Activas: {data.businesses?.filter(b => b.status === 'activo').length || 0}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Establecimiento</th>
                <th className="py-3 px-4">Tipo & Categoría</th>
                <th className="py-3 px-4">Plan SaaS</th>
                <th className="py-3 px-4">Mensualidad Plataforma</th>
                <th className="py-3 px-4">Turnos Hoy / Total</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.businesses?.map(biz => {
                const isActive = biz.status === 'activo';
                return (
                  <tr key={biz.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{biz.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{biz.address}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="capitalize font-semibold text-slate-700">{biz.type}</span>
                      <div className="text-[10px] text-slate-400">{biz.category}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-indigo-700">
                      {biz.subscription_plan || 'Plan Pro'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ${(biz.monthly_fee || 65000).toLocaleString('es-CO')} COP/mes
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      <span className="text-emerald-600 font-bold">{biz.stats?.today_tickets || 0} hoy</span> / {biz.stats?.total_tickets || 0} tot
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isActive ? 'Activo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(biz)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isActive ? 'Pausar' : 'Activar'}
                      </button>

                      <button
                        onClick={() => onOpenStorefront && onOpenStorefront(biz.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        title="Ver cómo lo ven los clientes"
                      >
                        <Eye className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* HISTORIAL DE INGRESOS Y TRANSACCIONES DE LA PLATAFORMA */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Flujo de Ingresos Recaudados por la Plataforma</span>
            </h2>
            <p className="text-xs text-slate-500">
              Registro histórico de mensualidades y comisiones cobradas por TurnoFácil a los negocios de Mocoa
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5 self-start cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Reporte Financiero</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Establecimiento</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Monto COP</th>
                <th className="py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.transactions?.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">{tx.date}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{tx.business_name}</td>
                  <td className="py-3 px-4 text-slate-700">{tx.concept}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {tx.type === 'suscripcion_mensual' ? 'SaaS Mensual' : 'Comisión'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-black text-emerald-700">
                    +${tx.amount.toLocaleString('es-CO')}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: AFILIAR NUEVO ESTABLECIMIENTO */}
      {showNewBizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Afiliar Nuevo Negocio a TurnoFácil</h3>
            <p className="text-xs text-slate-500 mb-4">
              Registra un restaurante o barbería de Mocoa y fija su tarifa de membresía mensual SaaS
            </p>

            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Asadero & Parrilla Putumayo"
                  value={newBizForm.name}
                  onChange={e => setNewBizForm({ ...newBizForm, name: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Negocio</label>
                  <select
                    value={newBizForm.type}
                    onChange={e => setNewBizForm({ ...newBizForm, type: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="restaurante">Restaurante / Comidas</option>
                    <option value="barberia">Barbería / Spa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carnes & Asados"
                    value={newBizForm.category}
                    onChange={e => setNewBizForm({ ...newBizForm, category: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección en Mocoa</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Calle 10 # 5-20, Centro, Mocoa"
                  value={newBizForm.address}
                  onChange={e => setNewBizForm({ ...newBizForm, address: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Plan de Suscripción</label>
                  <select
                    value={newBizForm.subscription_plan}
                    onChange={e => setNewBizForm({ ...newBizForm, subscription_plan: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Plan Básico">Plan Básico ($45.000 COP/mes)</option>
                    <option value="Plan Pro Empresarial">Plan Pro Empresarial ($65.000 COP/mes)</option>
                    <option value="Plan Corporativo">Plan Corporativo ($85.000 COP/mes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mensualidad Cobrada (COP)</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={newBizForm.monthly_fee}
                    onChange={e => setNewBizForm({ ...newBizForm, monthly_fee: parseFloat(e.target.value) })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewBizModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  Afiliar Establecimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

