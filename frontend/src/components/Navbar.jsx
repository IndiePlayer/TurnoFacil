import React from 'react';
import { 
  Clock, 
  User, 
  Briefcase, 
  ShieldCheck, 
  Tv, 
  FileText, 
  Store, 
  LogOut, 
  LogIn, 
  Search,
  Sparkles,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';

export default function Navbar({
  activeRole,
  setActiveRole,
  user,
  onOpenAuth,
  onLogout,
  onOpenDoc,
  onOpenTrack
}) {
  return (
    <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-50 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Brand */}
          <div 
            className="flex items-center space-x-3 cursor-pointer select-none" 
            onClick={() => setActiveRole('marketplace')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Clock className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  TurnoFácil
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Mocoa
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Restaurantes & Barberías de Putumayo
              </p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            
            {/* Always accessible: Marketplace (Explorar) */}
            <button
              onClick={() => setActiveRole('marketplace')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeRole === 'marketplace'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>Explorar Locales</span>
            </button>

            {/* Quick Track Turno */}
            <button
              onClick={onOpenTrack}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeRole === 'consultar'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Rastrear Turno</span>
            </button>

            {/* ROLE-SPECIFIC BUTTONS SHOWN ONLY FOR LOGGED-IN USERS */}
            {user?.role === 'superadmin' && (
              <button
                onClick={() => setActiveRole('superadmin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeRole === 'superadmin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-2 ring-indigo-400'
                    : 'bg-indigo-950/70 text-indigo-300 hover:bg-indigo-900 border border-indigo-700/50'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                <span>HQ Super Admin (Ingresos)</span>
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveRole('admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeRole === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-indigo-300 hover:bg-slate-800 border border-indigo-500/30'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin Local</span>
              </button>
            )}

            {user?.role === 'empleado' && (
              <button
                onClick={() => setActiveRole('empleado')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeRole === 'empleado'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'text-amber-300 hover:bg-slate-800 border border-amber-500/30'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                <span>Panel de Atención</span>
              </button>
            )}

            {(user?.role === 'admin' || user?.role === 'empleado') && (
              <button
                onClick={() => setActiveRole('totem')}
                title="Pantalla Pública de Turnos (Modo TV Sala)"
                className="hidden lg:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Modo TV</span>
              </button>
            )}

            {/* Doc & UML Project Modal trigger */}
            <button
              onClick={onOpenDoc}
              title="Ver Documento y Diagramas UML del Proyecto ITP"
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
            </button>
          </nav>

          {/* Right Section: User Login / Profile */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-2 pl-3 border-l border-slate-700/60">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-white flex items-center justify-end space-x-1">
                    <span>{user.name.split(' ')[0]}</span>
                    {user.role === 'superadmin' && (
                      <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-black border border-amber-400/30">
                        SUPER
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-emerald-400 capitalize">
                    {user.role === 'superadmin' ? 'Dueño Plataforma' : user.role}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
