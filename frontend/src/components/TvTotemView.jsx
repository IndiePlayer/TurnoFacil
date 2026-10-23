import React, { useState, useEffect } from 'react';
import { Volume2, Maximize2, Minimize2, ArrowLeft, Clock, Users, Scissors, Utensils } from 'lucide-react';
import { playQueueChime, speakTurn } from '../utils/sound';

export default function TvTotemView({
  businessId,
  businesses,
  onExit
}) {
  const [queue, setQueue] = useState({
    currently_attending: null,
    waiting_list: [],
    recently_attended: []
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const currentBusiness = businesses.find(b => b.id === businessId) || businesses[0];

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch queue data
  const fetchQueue = async () => {
    if (!currentBusiness?.id) return;
    try {
      const res = await fetch(`/api/businesses/${currentBusiness.id}/queue`);
      const data = await res.json();
      setQueue(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3500);
    return () => clearInterval(interval);
  }, [currentBusiness?.id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      
      {/* Top Banner / TV Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
            {currentBusiness?.type === 'barberia' ? <Scissors className="w-7 h-7" /> : <Utensils className="w-7 h-7" />}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>{currentBusiness?.name}</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                Mocoa, Putumayo
              </span>
            </h1>
            <p className="text-xs text-slate-400">Pantalla Pública de Turnos en Sala de Espera</p>
          </div>
        </div>

        {/* Live Clock & Controls */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-emerald-400">
              {currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-slate-400 capitalize">
              {currentTime.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={onExit}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>
        </div>
      </div>

      {/* Main Screen Layout: 2 Columns */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        
        {/* Left Column (Huge Call Box - 7 Cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-900/90 rounded-3xl p-8 border-2 border-emerald-500/50 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/30 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>TURNO ACTUAL EN ATENCIÓN</span>
              </span>
              <Volume2 className="w-6 h-6 text-emerald-400 animate-bounce" />
            </div>

            {queue.currently_attending ? (
              <div className="my-auto text-center py-6">
                <div className="text-8xl sm:text-9xl font-black text-white tracking-tighter drop-shadow-[0_10px_20px_rgba(16,185,129,0.3)] animate-call">
                  {queue.currently_attending.ticket_code}
                </div>

                <div className="text-3xl sm:text-4xl font-extrabold text-slate-100 mt-4">
                  {queue.currently_attending.client_name}
                </div>

                <div className="text-lg text-emerald-400 font-semibold mt-2">
                  Servicio: {queue.currently_attending.service_name}
                </div>

                <div className="inline-block mt-6 px-6 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 text-sm text-slate-300">
                  Favor acercarse a la estación de atención
                </div>
              </div>
            ) : (
              <div className="my-auto text-center py-12 text-slate-500">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <div className="text-2xl font-bold">En breve se llamará el próximo turno</div>
                <p className="text-sm mt-1">Por favor permanezca atento a la pantalla</p>
              </div>
            )}

            {/* Bottom mini ticker */}
            <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/80 pt-4">
              <span>TurnoFácil Mocoa • Software de Atención al Cliente</span>
              <span className="text-emerald-400">● Sistema En Vivo</span>
            </div>

          </div>
        </div>

        {/* Right Column (Upcoming Queue - 5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="flex-1 bg-slate-900 rounded-3xl p-6 border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>SIGUIENTES EN FILA</span>
              </h3>
              <span className="text-xs bg-slate-800 text-amber-400 font-bold px-3 py-1 rounded-full border border-slate-700">
                {queue.waiting_list.length} en espera
              </span>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-3">
              {queue.waiting_list.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                  No hay más clientes en espera en este momento
                </div>
              ) : (
                queue.waiting_list.slice(0, 6).map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-700 text-amber-400 flex items-center justify-center font-bold text-xs">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="text-xl font-black text-white">{ticket.ticket_code}</div>
                        <div className="text-xs text-slate-300 font-medium">{ticket.client_name}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">{ticket.time_slot}</div>
                      <div className="text-[11px] text-emerald-400 font-semibold">{ticket.service_name}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recently Attended footer */}
            {queue.recently_attended.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                  Atendidos recientemente:
                </div>
                <div className="flex flex-wrap gap-2">
                  {queue.recently_attended.slice(0, 4).map(t => (
                    <span key={t.id} className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                      {t.ticket_code} ({t.completed_at || 'Listo'})
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}

