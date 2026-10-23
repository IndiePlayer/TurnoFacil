import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  Volume2, 
  AlertCircle, 
  Package, 
  Calendar, 
  Play, 
  XSquare, 
  RefreshCw, 
  Search, 
  Layers, 
  Plus, 
  Minus,
  Sparkles
} from 'lucide-react';
import { speakTurn, playQueueChime } from '../utils/sound';

export default function EmployeeView({
  businessId,
  businesses,
  user,
  onOpenAuth
}) {
  const [activeTab, setActiveTab] = useState('cola'); // 'cola' | 'agenda' | 'inventario'
  const [queueData, setQueueData] = useState({
    currently_attending: null,
    waiting_list: [],
    recently_attended: [],
    stats: { waiting_count: 0, attending_count: 0, completed_count: 0 }
  });
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const currentBusiness = businesses.find(b => b.id === businessId) || businesses[0];

  const fetchQueue = async () => {
    if (!currentBusiness?.id) return;
    try {
      const res = await fetch(`/api/businesses/${currentBusiness.id}/queue`);
      const data = await res.json();
      setQueueData(data);
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  };

  const fetchInventory = async () => {
    if (!currentBusiness?.id) return;
    try {
      const res = await fetch(`/api/businesses/${currentBusiness.id}/inventory`);
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchInventory();
    const interval = setInterval(fetchQueue, 5000); // Polling backup + SSE
    return () => clearInterval(interval);
  }, [currentBusiness?.id]);

  // Call Next Turn
  const handleCallNext = async () => {
    if (queueData.waiting_list.length === 0) {
      alert('No hay clientes esperando en la cola actualmente.');
      return;
    }

    const nextTicket = queueData.waiting_list[0];
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${nextTicket.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'atendiendo',
          employee_id: user?.id || 'usr_emp_general',
          employee_name: user?.name || 'Personal en Turno'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Auditory chime and speech
      speakTurn(data.ticket_code, data.client_name);
      setStatusMessage(`Llamando turno ${data.ticket_code}: ${data.client_name}`);
      fetchQueue();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Call Specific Turn
  const handleCallSpecific = async (ticket) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'atendiendo',
          employee_id: user?.id || 'usr_emp_general',
          employee_name: user?.name || 'Personal en Turno'
        })
      });
      const data = await res.json();
      speakTurn(data.ticket_code, data.client_name);
      setStatusMessage(`Llamando turno ${data.ticket_code}: ${data.client_name}`);
      fetchQueue();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Repeat announcement for current ticket
  const handleRepeatCall = () => {
    if (queueData.currently_attending) {
      speakTurn(queueData.currently_attending.ticket_code, queueData.currently_attending.client_name);
      setStatusMessage(`Re-anunciando turno ${queueData.currently_attending.ticket_code}`);
    }
  };

  // Finish Attendance
  const handleFinishAttendance = async () => {
    if (!queueData.currently_attending) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${queueData.currently_attending.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'atendido',
          employee_id: user?.id || 'usr_emp_general',
          employee_name: user?.name || 'Personal'
        })
      });
      if (!res.ok) throw new Error('Error al finalizar turno');
      playQueueChime();
      setStatusMessage('Turno finalizado con éxito.');
      fetchQueue();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel / Absent
  const handleMarkAbsent = async (ticketId) => {
    const idToCancel = ticketId || queueData.currently_attending?.id;
    if (!idToCancel) return;
    if (!confirm('¿Deseas marcar como ausente/cancelado este turno?')) return;

    try {
      await fetch(`/api/tickets/${idToCancel}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelado' })
      });
      setStatusMessage('Turno cancelado.');
      fetchQueue();
    } catch (e) {
      alert(e.message);
    }
  };

  // Quick Stock Adjustment
  const handleUpdateStock = async (item, delta) => {
    const newStock = Math.max(0, item.stock + delta);
    try {
      await fetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      fetchInventory();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      
      {/* Employee Top Header Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 mb-1">
            <span>Módulo de Empleado</span>
            <span>•</span>
            <span>{currentBusiness?.name}</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Panel de Operación y Atención al Cliente
          </h2>
          <p className="text-xs text-slate-300">
            Atención: {user ? user.name : 'Personal de Atención'} • Mocoa, Putumayo
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab('cola')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'cola' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cola de Turnos ({queueData.waiting_list.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventario')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inventario' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Catálogo & Inventario</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-fade-in">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-emerald-600 font-bold">×</button>
        </div>
      )}

      {/* VIEW 1: COLA DE ATENCIÓN (Image 3) */}
      {activeTab === 'cola' && (
        <div className="space-y-6">
          
          {/* Active Turn in Service Card */}
          <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 rounded-3xl p-6 border-2 border-amber-500/40 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  ⚡ Turno en Atención Actual
                </span>

                {queueData.currently_attending ? (
                  <div className="mt-3">
                    <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                      {queueData.currently_attending.ticket_code}
                    </div>
                    <div className="text-sm font-bold text-slate-800 mt-1">
                      Cliente: {queueData.currently_attending.client_name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Servicio: <strong>{queueData.currently_attending.service_name}</strong> • Hora: {queueData.currently_attending.time_slot} • Llamado a las: {queueData.currently_attending.called_at || 'Hace poco'}
                    </div>
                    {queueData.currently_attending.notes && (
                      <div className="text-xs bg-amber-100/70 text-amber-900 p-2 rounded-lg mt-2 inline-block">
                        Nota: {queueData.currently_attending.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 text-slate-500 text-sm italic">
                    Ningún turno en atención en este momento. Llama al siguiente cliente de la cola.
                  </div>
                )}
              </div>

              {/* Action Buttons for Attending Turn */}
              <div className="flex flex-wrap items-center gap-3">
                {queueData.currently_attending ? (
                  <>
                    <button
                      onClick={handleRepeatCall}
                      title="Repetir llamado por voz y timbre"
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors font-semibold text-xs flex items-center space-x-1.5"
                    >
                      <Volume2 className="w-4 h-4 text-slate-600" />
                      <span>Re-llamar</span>
                    </button>

                    <button
                      onClick={handleFinishAttendance}
                      disabled={loading}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Finalizar Atención</span>
                    </button>

                    <button
                      onClick={() => handleMarkAbsent()}
                      disabled={loading}
                      className="px-3 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl font-semibold text-xs transition-colors"
                    >
                      Ausente / Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCallNext}
                    disabled={loading || queueData.waiting_list.length === 0}
                    className="px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-base shadow-lg shadow-amber-600/30 transition-all flex items-center space-x-3 disabled:opacity-50"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>¡Llamar Siguiente Turno!</span>
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Waiting Queue List (Image 3: observar clientes pendientes) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <span>Clientes Pendientes en Fila</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                    {queueData.waiting_list.length} en espera
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Orden de atención por orden de llegada / hora agendada</p>
              </div>

              {queueData.currently_attending && (
                <button
                  onClick={handleCallNext}
                  disabled={loading || queueData.waiting_list.length === 0}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center space-x-1.5 self-start disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Llamar siguiente de todas formas</span>
                </button>
              )}
            </div>

            {queueData.waiting_list.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No hay clientes esperando en la cola. La fila está al día.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Posición</th>
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Servicio</th>
                      <th className="py-3 px-4">Hora</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {queueData.waiting_list.map((ticket, idx) => (
                      <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-400">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-700 text-sm">
                          {ticket.ticket_code}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div>{ticket.client_name}</div>
                          {ticket.client_phone && (
                            <div className="text-[10px] text-slate-400 font-normal">{ticket.client_phone}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {ticket.service_name}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-600">
                          {ticket.time_slot}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleCallSpecific(ticket)}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 transition-colors"
                          >
                            Llamar
                          </button>
                          <button
                            onClick={() => handleMarkAbsent(ticket.id)}
                            className="px-2 py-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Marcar ausente"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recently Attended Today */}
          {queueData.recently_attended.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400 mb-3">
                Últimos turnos atendidos hoy
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                {queueData.recently_attended.map(t => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-800 block">{t.ticket_code}</span>
                    <span className="text-[11px] text-slate-500 truncate block">{t.client_name}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">{t.completed_at || 'Atendido'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* VIEW 2: CATÁLOGO & INVENTARIO (Image 3: Catalogo & Gestionar inventario) */}
      {activeTab === 'inventario' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Catálogo e Inventario de Productos</h3>
              <p className="text-xs text-slate-500">
                Consulta y actualiza las existencias de productos de barbería o platos del día en Putumayo
              </p>
            </div>
            
            <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-xl font-semibold text-slate-700">
              {inventory.length} artículos registrados
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inventory.map(item => {
              const isLowStock = item.stock <= (item.min_stock || 5);
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                        {item.category}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{item.name}</h4>
                      <div className="text-xs font-semibold text-slate-700 mt-0.5">
                        ${item.price.toLocaleString('es-CO')} COP / {item.unit}
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isLowStock ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isLowStock ? 'Stock Bajo' : 'En Stock'}
                    </span>
                  </div>

                  {/* Stock counter controls */}
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Disponibles: <strong className="text-slate-900 text-sm">{item.stock}</strong> {item.unit}s
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdateStock(item, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleUpdateStock(item, 1)}
                        className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

