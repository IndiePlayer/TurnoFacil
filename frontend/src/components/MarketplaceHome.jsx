import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Utensils, 
  Scissors, 
  Flame, 
  Coffee, 
  Sparkles, 
  Star, 
  MapPin, 
  Clock, 
  ChevronRight, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Tag, 
  Heart,
  TrendingUp,
  Store
} from 'lucide-react';

export default function MarketplaceHome({
  onSelectBusiness,
  onTrackTurno,
  onOpenBookingModal,
  onOpenDoc
}) {
  const [marketplaceData, setMarketplaceData] = useState({
    businesses: [],
    popular_dishes: [],
    categories: []
  });
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Quick track input in hero
  const [quickCode, setQuickCode] = useState('');

  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'todos') {
        if (['restaurante', 'barberia'].includes(selectedCategory)) {
          params.append('type', selectedCategory);
        } else {
          params.append('category', selectedCategory);
        }
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`/api/marketplace?${params.toString()}`);
      const data = await res.json();
      setMarketplaceData(data);
    } catch (err) {
      console.error('Error fetching marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplace();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMarketplace();
  };

  return (
    <div className="space-y-10 pb-16">
      
      {/* HERO BANNER (Estilo Rappi Discovery para Mocoa) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl mx-4 sm:mx-6 lg:mx-8 mt-4 border border-emerald-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mocoa, Putumayo • Plataforma de Turnos & Gastronomía</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            ¿Qué deseas pedir o reservar hoy en <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">Mocoa</span>?
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Explora menús de restaurantes amazónicos, parrilladas y barberías reconocidas de la ciudad. Pide tu turno o reserva mesa al instante <strong>sin necesidad de iniciar sesión</strong>.
          </p>

          {/* Interactive Search Bar (Rappi Style) */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Busca comida (cachama, sancocho, asado) o cortes de barbería..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-slate-900 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/40 shadow-xl"
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/40 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Buscar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Track Turno Input */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>¿Ya tienes un turno asignado?</span>
            <div className="inline-flex items-center bg-slate-900/80 border border-slate-700 rounded-xl p-1">
              <input
                type="text"
                placeholder="Código ej. TF-B02"
                value={quickCode}
                onChange={e => setQuickCode(e.target.value.toUpperCase())}
                className="bg-transparent text-white uppercase font-bold text-xs px-2.5 py-1 focus:outline-none w-32"
              />
              <button
                type="button"
                onClick={() => quickCode && onTrackTurno(quickCode)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Rastrear
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* CATEGORY PILLS (Estilo Rappi Filters) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'todos', label: 'Todos los locales', icon: Sparkles },
            { id: 'restaurante', label: 'Restaurantes', icon: Utensils },
            { id: 'barberia', label: 'Barberías & Spa', icon: Scissors },
            { id: 'asados', label: 'Carnes & Parrilla', icon: Flame },
            { id: 'amazonica', label: 'Amazónica & Típica', icon: Sparkles },
            { id: 'cafe', label: 'Café & Mirador', icon: Coffee }
          ].map(cat => {
            const isSel = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSel
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-600'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSel ? 'text-white' : 'text-emerald-600'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* POPULAR DISHES & SPECIALTIES (Rappi Carousel Style) */}
      {marketplaceData.popular_dishes?.length > 0 && selectedCategory === 'todos' && !searchQuery && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Platos y Especialidades Populares en Mocoa
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Los platos y tratamientos más solicitados por los clientes en la ciudad
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {marketplaceData.popular_dishes.slice(0, 4).map(dish => (
              <div
                key={dish.id}
                onClick={() => onSelectBusiness(dish.business_id)}
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      {dish.category}
                    </span>
                    <span className="text-slate-400 font-semibold">{dish.business_name}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                    {dish.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {dish.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">
                    ${dish.price.toLocaleString('es-CO')} COP
                  </span>
                  <span className="text-xs text-emerald-600 font-bold flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                    <span>Ver Local</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ESTABLECIMIENTOS AFILIADOS EN MOCOA (Grid de Negocios Estilo Rappi) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Store className="w-6 h-6 text-emerald-600" />
              <span>Restaurantes y Barberías en Mocoa</span>
            </h2>
            <p className="text-xs text-slate-500">
              {marketplaceData.businesses.length} locales disponibles para turnos y reservas
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Cargando opciones en Mocoa...
          </div>
        ) : marketplaceData.businesses.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 p-8">
            <p className="text-sm font-semibold">No se encontraron establecimientos con ese criterio de búsqueda.</p>
            <button
              onClick={() => { setSelectedCategory('todos'); setSearchQuery(''); }}
              className="mt-3 text-xs text-emerald-600 font-bold hover:underline"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketplaceData.businesses.map(b => {
              const isBarber = b.type === 'barberia';
              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBusiness(b.id)}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-emerald-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
                >
                  {/* Card Header with Category Gradient */}
                  <div className={`p-6 bg-gradient-to-r ${b.cover_gradient || 'from-slate-900 to-emerald-950'} text-white relative`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 flex items-center space-x-1.5">
                        {isBarber ? <Scissors className="w-3 h-3" /> : <Utensils className="w-3 h-3" />}
                        <span>{b.category}</span>
                      </span>

                      <div className="flex items-center space-x-1 bg-amber-400/90 text-slate-950 px-2 py-0.5 rounded-lg text-xs font-black">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{b.rating || 4.9}</span>
                        <span className="text-[10px] text-slate-800">({b.review_count || 45})</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
                      {b.name}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                      {b.slogan || 'Atención de calidad en Mocoa, Putumayo'}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-[11px] text-slate-300 border-t border-white/10 pt-3">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>{b.open_time} - {b.close_time}</span>
                      </span>
                      <span>{b.delivery_or_wait || 'Espera: 15 min'}</span>
                    </div>
                  </div>

                  {/* Card Body: Highlights of Services / Menu */}
                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {isBarber ? 'Servicios Destacados:' : 'Menú y Reservas:'}
                      </div>

                      <div className="space-y-1.5">
                        {b.services?.slice(0, 3).map(s => (
                          <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                            <span className="text-slate-800 font-medium truncate max-w-[200px]">{s.name}</span>
                            <span className="text-emerald-700 font-bold shrink-0">
                              {s.price > 0 ? `$${s.price.toLocaleString('es-CO')}` : 'Sin costo'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-slate-500 mt-3 line-clamp-2">
                        {b.description}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400">
                        📍 {b.address?.split(',')[0]}
                      </div>
                      <button
                        type="button"
                        className="bg-emerald-600 group-hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
                      >
                        <span>{isBarber ? 'Pedir Turno' : 'Reservar Mesa'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* BANNER PROYECTO ACADÉMICO ITP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Proyecto de Software 1 • ITP Mocoa
            </span>
            <h3 className="text-xl font-black text-white">
              TurnoFácil: Viabilidad y Arquitectura del Sistema
            </h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Helen Solarte, Enid, Marbell Urrutia, Estefania Perenguez • Docente: Luis Jurado.
            </p>
          </div>
          <button
            onClick={onOpenDoc}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors shrink-0 cursor-pointer"
          >
            Ver Requerimientos y Diagramas UML
          </button>
        </div>
      </section>

    </div>
  );
}

