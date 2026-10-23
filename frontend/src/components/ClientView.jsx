import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Scissors, 
  Utensils, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  RefreshCw, 
  Share2, 
  Clock3, 
  Users, 
  ArrowLeft,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { playQueueChime } from '../utils/sound';

export default function ClientView({
  businesses,
  selectedBusinessId,
  setSelectedBusinessId,
  user,
  onOpenAuth,
  onBackToMarketplace
}) {
  const [activeTab, setActiveTab] = useState('solicitar'); // 'solicitar' | 'consultar'
  
  // Wizard state for Request Turn
  const [step, setStep] = useState(1); // 1: Service, 2: Date & Slot, 3: Client Details, 4: Confirmed
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotReason, setSlotReason] = useState('');

  // Client form
  const [clientName, setClientName] = useState(user?.name || '');
  const [clientPhone, setClientPhone] = useState(user?.phone || '');
  const [clientEmail, setClientEmail] = useState(user?.email || '');
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [confirmedTicket, setConfirmedTicket] = useState(null);

  // Tracking state
  const [trackCode, setTrackCode] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  // Modals for Aplazar / Cancelar
  const [showAplazarModal, setShowAplazarModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [postponeLoading, setPostponeLoading] = useState(false);

  const currentBusiness = businesses.find(b => b.id === selectedBusinessId) || businesses[0];

  // Update client form if user changes
  useEffect(() => {
    if (user) {
      if (!clientName) setClientName(user.name);
      if (!clientPhone) setClientPhone(user.phone || '');
      if (!clientEmail) setClientEmail(user.email);
    }
  }, [user]);

  // Load services for current business
  useEffect(() => {
    if (!currentBusiness?.id) return;
    fetch(`/api/businesses/${currentBusiness.id}/services`)
      .then(res => res.json())
      .then(data => {
        setServices(Array.isArray(data) ? data : []);
        if (data.length > 0 && !selectedService) {
          setSelectedService(data[0]);
        }
      })
      .catch(console.error);
  }, [currentBusiness?.id]);

  // Load available slots whenever date, service, or business changes
  useEffect(() => {
    if (!currentBusiness?.id || !selectedDate) return;
    setLoadingSlots(true);
    setSlotReason('');

    const srvParam = selectedService ? `&serviceId=${selectedService.id}` : '';
    fetch(`/api/businesses/${currentBusiness.id}/available-slots?date=${selectedDate}${srvParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.available === false) {
          setAvailableSlots([]);
          setSlotReason(data.reason || 'No hay atención este día');
        } else {
          setAvailableSlots(data.slots || []);
          setSlotReason('');
        }
      })
      .catch(err => {
        console.error('Error fetching slots:', err);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [currentBusiness?.id, selectedDate, selectedService?.id]);

  // Handle URL query parameters for QR code direct landing (RF1, RNF Usabilidad)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bizParam = params.get('biz');
    const ticketParam = params.get('ticket');
    if (bizParam && businesses.some(b => b.id === bizParam)) {
      setSelectedBusinessId(bizParam);
    }
    if (ticketParam) {
      setTrackCode(ticketParam);
      setActiveTab('consultar');
      handleTrackTicket(ticketParam);
    }
  }, [businesses]);

  // Submit Booking
  const handleBookTicket = async (e) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot) return;

    setBookingLoading(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: currentBusiness.id,
          service_id: selectedService.id,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail,
          user_id: user?.id || null,
          party_size: partySize,
          notes,
          date: selectedDate,
          time_slot: selectedSlot
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al agendar turno');
      }

      setConfirmedTicket(data);
      setStep(4);
      playQueueChime();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      // Save to localStorage so client can track easily
      localStorage.setItem('turnofacil_last_ticket', data.ticket_code);
    } catch (err) {
      alert(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  // Search / Track Ticket
  const handleTrackTicket = async (codeToSearch) => {
    const code = codeToSearch || trackCode;
    if (!code) return;

    setTrackLoading(true);
    setTrackError('');
    try {
      const res = await fetch(`/api/tickets/track/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se encontró el turno');
      }
      setTrackingResult(data);
    } catch (err) {
      setTrackError(err.message);
      setTrackingResult(null);
    } finally {
      setTrackLoading(false);
    }
  };

  // Aplazar Turno
  const handlePostponeTicket = async () => {
    if (!trackingResult) return;
    setPostponeLoading(true);
    try {
      const res = await fetch(`/api/tickets/${trackingResult.id}/aplazado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo aplazar');
      setShowAplazarModal(false);
      handleTrackTicket(trackingResult.ticket_code);
      alert('¡Turno aplazado exitosamente! Tu nuevo horario ha sido recalculado.');
    } catch (e) {
      alert(e.message);
    } finally {
      setPostponeLoading(false);
    }
  };

  // Cancelar Turno
  const handleCancelTicket = async () => {
    if (!trackingResult) return;
    setPostponeLoading(true);
    try {
      const res = await fetch(`/api/tickets/${trackingResult.id}/cancel`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cancelar');
      setShowCancelModal(false);
      handleTrackTicket(trackingResult.ticket_code);
      alert('Turno cancelado exitosamente.');
    } catch (e) {
      alert(e.message);
    } finally {
      setPostponeLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      
      {/* Back to Marketplace button */}
      {onBackToMarketplace && (
        <div className="mb-6">
          <button
            onClick={onBackToMarketplace}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-white hover:bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>← Volver a Explorar Locales en Mocoa (Marketplace)</span>
          </button>
        </div>
      )}

      {/* Hero Banner for Business */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              {currentBusiness?.type === 'barberia' ? <Scissors className="w-3.5 h-3.5" /> : <Utensils className="w-3.5 h-3.5" />}
              <span className="capitalize">{currentBusiness?.type}</span>
              <span>•</span>
              <span>{currentBusiness?.city || 'Mocoa, Putumayo'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {currentBusiness?.name}
            </h1>
            <p className="text-sm text-slate-300">
              {currentBusiness?.slogan || 'Reserva tu turno en línea sin filas físicas en Mocoa'}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Horario: {currentBusiness?.open_time} - {currentBusiness?.close_time}</span>
              </span>
              <span>📍 {currentBusiness?.address}</span>
            </div>
          </div>

          {/* Business Switcher Pills for Mobile */}
          <div className="flex md:hidden bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {businesses.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBusinessId(b.id)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  b.id === selectedBusinessId ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                {b.type === 'barberia' ? 'Barbería' : 'Restaurante'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tabs: Solicitar vs Consultar */}
      <div className="flex border-b border-slate-200 mb-8 bg-white rounded-2xl p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('solicitar')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'solicitar'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Solicitar Turno / Reserva</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('consultar');
            const saved = localStorage.getItem('turnofacil_last_ticket');
            if (saved && !trackCode) {
              setTrackCode(saved);
              handleTrackTicket(saved);
            }
          }}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'consultar'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Consultar mi Turno</span>
        </button>
      </div>

      {/* TAB 1: SOLICITAR TURNO */}
      {activeTab === 'solicitar' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          
          {/* Wizard Steps Indicator */}
          {step < 4 && (
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>1</span>
                <span className={`text-xs font-semibold ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Servicio
                </span>
              </div>
              <div className="h-0.5 w-12 bg-slate-200"></div>
              <div className="flex items-center space-x-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>2</span>
                <span className={`text-xs font-semibold ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Fecha y Hora
                </span>
              </div>
              <div className="h-0.5 w-12 bg-slate-200"></div>
              <div className="flex items-center space-x-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>3</span>
                <span className={`text-xs font-semibold ${step >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Tus Datos
                </span>
              </div>
            </div>
          )}

          {/* STEP 1: SELECT SERVICE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">1. Selecciona el servicio deseado</h3>
                <p className="text-xs text-slate-500">
                  {currentBusiness?.type === 'barberia' 
                    ? 'Elige el corte o tratamiento que deseas realizarte hoy en Mocoa'
                    : 'Selecciona el tipo de mesa o experiencia gastronómica en Putumayo'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map(srv => {
                  const isSel = selectedService?.id === srv.id;
                  return (
                    <div
                      key={srv.id}
                      onClick={() => setSelectedService(srv)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSel
                          ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 rounded-md text-slate-600">
                            {srv.category}
                          </span>
                          <span className="text-xs font-semibold text-emerald-700 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{srv.duration} min</span>
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-base">{srv.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">{srv.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">
                          {srv.price > 0 ? `$${srv.price.toLocaleString('es-CO')} COP` : 'Sin costo de reserva'}
                        </span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSel ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                        }`}>
                          {isSel && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={!selectedService}
                  onClick={() => setStep(2)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <span>Continuar a Fecha y Hora</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT DATE & TIME SLOT (RF47, RF49, RF50) */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">2. Elige la Fecha y Turno Disponible</h3>
                  <p className="text-xs text-slate-500">
                    Solo se muestran intervalos libres según el horario configurado por el negocio en Mocoa
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cambiar servicio</span>
                </button>
              </div>

              {/* Service selected summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Servicio: {selectedService?.name}</span>
                <span className="text-emerald-700 font-bold">{selectedService?.duration} minutos</span>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fecha de atención
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={e => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot('');
                  }}
                  className="w-full sm:w-64 p-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Available Slots Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Intervalos disponibles para esta fecha
                  </label>
                  {loadingSlots && <span className="text-xs text-emerald-600 animate-pulse">Cargando cupos...</span>}
                </div>

                {slotReason ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>{slotReason}</span>
                  </div>
                ) : availableSlots.length === 0 && !loadingSlots ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs text-center">
                    No quedan intervalos disponibles para esta fecha. Intenta seleccionando otro día laboral.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {availableSlots.map(slot => {
                      const isSel = selectedSlot === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center ${
                            !slot.available
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                              : isSel
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-600 ring-offset-2'
                              : 'bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <span>{slot.display}</span>
                          <span className="text-[10px] font-normal opacity-75">
                            {slot.available ? 'Libre' : 'Ocupado'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => setStep(3)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <span>Continuar a Mis Datos</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CLIENT DETAILS (Usabilidad: inmediato sin pasos redundantes) */}
          {step === 3 && (
            <form onSubmit={handleBookTicket} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">3. Datos de Contacto para el Turno</h3>
                  <p className="text-xs text-slate-500">
                    Ingresa tus datos para identificarte en la cola de atención
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Modificar horario</span>
                </button>
              </div>

              {/* Booking Summary Box */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 text-xs space-y-1 text-slate-800">
                <div className="font-bold text-emerald-950 text-sm">{currentBusiness?.name}</div>
                <div><strong>Servicio:</strong> {selectedService?.name} ({selectedService?.duration} min)</div>
                <div><strong>Fecha:</strong> {selectedDate} | <strong>Hora:</strong> {selectedSlot}</div>
                <div><strong>Valor:</strong> {selectedService?.price > 0 ? `$${selectedService.price.toLocaleString('es-CO')} COP` : 'Gratuito'}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre completo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Tu nombre y apellido"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="+57 312 345 6789"
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo electrónico (opcional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {currentBusiness?.type === 'restaurante' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número de comensales / personas
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={partySize}
                        onChange={e => setPartySize(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas o requerimientos especiales
                </label>
                <textarea
                  rows="2"
                  placeholder="Ej. Si deseas barbero específico, mesa exterior, preferencias..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {bookingLoading ? 'Generando Turno...' : '¡Confirmar y Solicitar Turno!'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: CONFIRMATION CARD */}
          {step === 4 && confirmedTicket && (
            <div className="text-center space-y-6 py-4 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  ¡Turno Reservado con Éxito!
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {confirmedTicket.business_name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Guarda tu código de turno para ser llamado</p>
              </div>

              {/* Giant Ticket Card */}
              <div className="max-w-sm mx-auto bg-gradient-to-b from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-2xl border-2 border-emerald-500/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>

                <div className="text-xs text-emerald-400 font-bold tracking-widest uppercase">
                  Código de Atención
                </div>
                <div className="text-5xl font-black tracking-tight text-white my-3">
                  {confirmedTicket.ticket_code}
                </div>

                <div className="space-y-2 text-xs border-t border-slate-700/80 pt-4 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cliente:</span>
                    <span className="font-semibold text-white">{confirmedTicket.client_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Servicio:</span>
                    <span className="font-semibold text-white">{confirmedTicket.service_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fecha y Hora:</span>
                    <span className="font-semibold text-white">{confirmedTicket.date} a las {confirmedTicket.time_slot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Personas antes de ti:</span>
                    <span className="font-bold text-amber-400">{confirmedTicket.people_ahead} en fila</span>
                  </div>
                </div>

                <div className="mt-5 p-2.5 bg-slate-800/90 rounded-xl border border-slate-700 text-[11px] text-emerald-300 flex items-center justify-center space-x-1.5">
                  <Clock3 className="w-3.5 h-3.5" />
                  <span>Espera estimada: ~{confirmedTicket.estimated_wait_minutes} min</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTrackCode(confirmedTicket.ticket_code);
                    setActiveTab('consultar');
                    handleTrackTicket(confirmedTicket.ticket_code);
                  }}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Hacer seguimiento en vivo a mi turno</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setSelectedSlot('');
                    setConfirmedTicket(null);
                  }}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-xs transition-colors"
                >
                  Solicitar otro turno
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 2: CONSULTAR / RASTREAR TURNO (Image 2 Use Case: Consultar, Cancelar, Aplazar) */}
      {activeTab === 'consultar' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Consulta y Seguimiento de tu Turno</h3>
            <p className="text-xs text-slate-500">
              Ingresa el código que te fue asignado (por ejemplo, <span className="font-mono font-bold text-emerald-600">TF-B02</span> o <span className="font-mono font-bold text-emerald-600">TF-R01</span>)
            </p>
          </div>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Código de turno (ej. TF-B02)"
                value={trackCode}
                onChange={e => setTrackCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTrackTicket()}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={() => handleTrackTicket()}
              disabled={trackLoading || !trackCode}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${trackLoading ? 'animate-spin' : ''}`} />
              <span>Consultar</span>
            </button>
          </div>

          {trackError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{trackError}</span>
            </div>
          )}

          {/* Tracking Result View */}
          {trackingResult && (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-6 animate-fade-in">
              
              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {trackingResult.business_name}
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                    <span>{trackingResult.ticket_code}</span>
                    <span className="text-sm font-normal text-slate-500">({trackingResult.service_name})</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {trackingResult.status === 'espera' && (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                      <Clock3 className="w-3.5 h-3.5" />
                      <span>En espera de atención</span>
                    </span>
                  )}
                  {trackingResult.status === 'atendiendo' && (
                    <span className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-500/30 animate-pulse">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>¡ES TU TURNO! ACÉRCATE AHORA</span>
                    </span>
                  )}
                  {trackingResult.status === 'atendido' && (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Atendido satisfactoriamente</span>
                    </span>
                  )}
                  {trackingResult.status === 'aplazado' && (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold border border-purple-300">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Turno aplazado</span>
                    </span>
                  )}
                  {trackingResult.status === 'cancelado' && (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Turno cancelado</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Waiting Stats if in espera */}
              {trackingResult.status === 'espera' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg">
                      {trackingResult.people_ahead}
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Personas delante de ti</div>
                      <div className="text-sm font-bold text-slate-900">
                        {trackingResult.people_ahead === 0 ? '¡Eres el siguiente!' : `${trackingResult.people_ahead} clientes en espera`}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                      ~{trackingResult.estimated_wait_minutes}m
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 font-medium">Tiempo de espera aprox.</div>
                      <div className="text-sm font-bold text-slate-900">
                        {trackingResult.estimated_wait_minutes === 0 ? 'Inmediato' : `${trackingResult.estimated_wait_minutes} minutos`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Details List */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block">Titular</span>
                  <span className="font-semibold text-slate-800">{trackingResult.client_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Fecha Agendada</span>
                  <span className="font-semibold text-slate-800">{trackingResult.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Hora Turno</span>
                  <span className="font-semibold text-slate-800">{trackingResult.time_slot}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Duración</span>
                  <span className="font-semibold text-slate-800">{trackingResult.duration} min</span>
                </div>
              </div>

              {/* Actions: Aplazar & Cancelar (Image 2: «extend» Aplazar turno, «extend» Cancelar turno) */}
              {trackingResult.status === 'espera' && (
                <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAplazarModal(true)}
                    className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors flex items-center space-x-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Aplazar Turno</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors flex items-center space-x-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancelar Turno</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* MODAL: APLAZAR TURNO (Image 2) */}
      {showAplazarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-base">¿Deseas aplazar tu turno?</h4>
            <p className="text-xs text-slate-600">
              Si estás llegando con retraso a tu cita en Mocoa, puedes aplazar tu turno para no perder tu cupo. El sistema reprogramará tu posición automáticamente.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowAplazarModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Volver
              </button>
              <button
                onClick={handlePostponeTicket}
                disabled={postponeLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
              >
                {postponeLoading ? 'Aplazando...' : 'Confirmar Aplazamiento (+30 min)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCELAR TURNO (Image 2) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-base text-rose-700">¿Cancelar tu turno?</h4>
            <p className="text-xs text-slate-600">
              Esta acción liberará el espacio en la fila para que otro cliente de Mocoa pueda ser atendido. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                No, mantener turno
              </button>
              <button
                onClick={handleCancelTicket}
                disabled={postponeLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                {postponeLoading ? 'Cancelando...' : 'Sí, Cancelar Turno'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

