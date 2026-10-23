import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error');
      }
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (email, password) => {
    setFormData({ ...formData, email, password });
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          onLoginSuccess(data.user);
          onClose();
        } else {
          setError(data.error || 'Error al iniciar sesión');
        }
      })
      .catch(err => setError(err.message));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-bold">
            {isRegister ? 'Crear Cuenta en TurnoFácil' : 'Acceso al Sistema TurnoFácil'}
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            {isRegister 
              ? 'Regístrate para solicitar y consultar tus turnos con mayor facilidad'
              : 'Ingresa según tu rol: Cliente, Empleado o Administrador'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Helen Solarte"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      placeholder="Ej. +57 312 345 6789"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Procesando...' : (isRegister ? 'Completar Registro' : 'Iniciar Sesión')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              {isRegister ? '¿Ya tienes una cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>

          {import.meta.env.DEV && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Accesos rápidos de demostración:</span>
            </div>
            <div className="space-y-2 text-xs">
              {/* Highlighted Super Admin for Development Owner */}
              <button
                type="button"
                onClick={() => handleQuickLogin('superadmin@turnofacil.com', 'superadmin123')}
                className="w-full p-2.5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl text-left transition-all font-medium border border-indigo-500/40 shadow-sm cursor-pointer hover:border-indigo-400"
              >
                <div className="flex items-center justify-between">
                  <div className="font-black text-amber-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>👑 SUPER ADMIN (Nanotec - Dueño Plataforma)</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200">Acceso Total</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">superadmin@turnofacil.com • Ver flujo e ingresos de la plataforma</div>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@turnofacil.com', 'admin123')}
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-left transition-colors font-medium border border-indigo-100 cursor-pointer"
                >
                  <div className="font-bold">🏢 Admin Barbería</div>
                  <div className="text-[10px] text-indigo-600 truncate">admin@turnofacil.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin.restaurante@turnofacil.com', 'admin123')}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-left transition-colors font-medium border border-emerald-100 cursor-pointer"
                >
                  <div className="font-bold">🍽️ Admin Restaurante</div>
                  <div className="text-[10px] text-emerald-600 truncate">admin.restaurante@...</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('barbero@turnofacil.com', 'empleado123')}
                  className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-left transition-colors font-medium border border-amber-100 cursor-pointer"
                >
                  <div className="font-bold">✂️ Empleado Barbero</div>
                  <div className="text-[10px] text-amber-600 truncate">barbero@turnofacil.com</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('helen@gmail.com', 'cliente123')}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-left transition-colors font-medium border border-slate-200 cursor-pointer"
                >
                  <div className="font-bold">🙋‍♀️ Cliente (Helen)</div>
                  <div className="text-[10px] text-slate-600 truncate">helen@gmail.com</div>
                </button>
              </div>
            </div>
          </div>
          )}

        </div>

      </div>
    </div>
  );
}
