import React, { useState } from 'react';
import { X, BookOpen, Users, CheckCircle, Shield, Award, Layers } from 'lucide-react';

export default function DocInfoModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('resumen');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-6 relative flex items-start justify-between">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 mb-2">
              <Award className="w-3.5 h-3.5" />
              <span>Institución Universitaria del Putumayo (ITP)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              TurnoFácil — Viabilidad y Arquitectura del Proyecto
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
              Desarrollo de Software • Proyecto de Software 1 • Mocoa, Putumayo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="bg-slate-100 px-6 border-b border-slate-200 flex space-x-4">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'resumen'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Resumen & Equipo
          </button>
          <button
            onClick={() => setActiveTab('uml')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'uml'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Diagramas UML
          </button>
          <button
            onClick={() => setActiveTab('requerimientos')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'requerimientos'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Requerimientos (RF & RNF)
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {activeTab === 'resumen' && (
            <div className="space-y-5">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                <h4 className="font-bold text-emerald-900 text-base mb-1">Problemática y Justificación</h4>
                <p className="text-emerald-950 text-xs sm:text-sm leading-relaxed">
                  En restaurantes y barberías reconocidas de <strong>Mocoa, Putumayo</strong>, la asignación de turnos suele hacerse de forma manual: filas presenciales, cuadernos o mensajes de texto. Esto genera desorganización y tiempos de espera prolongados, y el cliente no sabe con claridad cuánto falta para ser atendido. TurnoFácil aporta centralizando el proceso en una plataforma web intuitiva y accesible.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold mb-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Equipo de Desarrollo</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-600">
                    <li>• Helen Solarte</li>
                    <li>• Enid</li>
                    <li>• Marbell Urrutia</li>
                    <li>• Estefania Perenguez</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold mb-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Dirección Académica</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong>Docente:</strong> Luis Jurado<br />
                    <strong>Materia:</strong> Proyecto de Software 1<br />
                    <strong>Fecha:</strong> 15 de agosto de 2026<br />
                    <strong>Sede:</strong> Mocoa, Putumayo
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-900 mb-2">Población Objetivo</h4>
                <p className="text-xs sm:text-sm text-slate-600">
                  Personal administrativo y de atención (meseros, barberos) de restaurantes y barberías reconocidas de Mocoa, Putumayo, así como los clientes que solicitan sus servicios.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'uml' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Diagrama de Casos de Uso: Módulo de Clientes — Solicitud Turnos</span>
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Incluye: Gestionar turno, Observar Agenda, Iniciar sesión o registrarse, Solicitar reserva (Restaurante), Consultar turno, Cancelar turno y Aplazar turno.
                </p>
                <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex justify-center">
                  <img src="/image2.png" alt="Módulo de Clientes" className="max-h-72 object-contain rounded-lg" />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Diagrama de Casos de Uso: Módulo de Empleado</span>
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Incluye: Gestionar Operación, Iniciar sesión, Catálogo, Gestionar inventario, Observar agenda, Gestionar turnos (ver pedidos/reservas y clientes pendientes).
                </p>
                <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 flex justify-center">
                  <img src="/image3.png" alt="Módulo de Empleado" className="max-h-72 object-contain rounded-lg" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requerimientos' && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-3">Requerimientos Funcionales (RF)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-emerald-700">RF1. Código QR Descargable:</strong> Generar un QR descargable para acceder directamente al registro de turno.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-emerald-700">RF2. Agendamiento Web:</strong> Permitir al cliente seleccionar servicio, fecha y hora disponible.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-emerald-700">RF3. Calendario Centralizado:</strong> Calendario para el admin con turnos por día y semana.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-emerald-700">RF4. Configuración del Negocio:</strong> Configurar duración de servicio, horarios de atención y días laborales.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-emerald-700">RF5. Intervalos Disponibles:</strong> Mostrar solo intervalos libres evitando duplicidades fuera de horario.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-emerald-700">RF6. Registro y Roles:</strong> Autenticación diferenciada para Cliente, Empleado y Administrador.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-emerald-700">RF7. Cola de Turnos:</strong> Empleado visualiza la cola y actualiza el estado de cada turno.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-emerald-700">RF8. Historial de Atención:</strong> Consulta de turnos gestionados y métricas.
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-3">Requerimientos No Funcionales (RNF)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-indigo-700">Usabilidad:</strong> Acceso inmediato desde QR sin pasos redundantes.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-indigo-700">Disponibilidad:</strong> Disponible 24/7 para solicitud remota.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-indigo-700">Rendimiento:</strong> Respuestas ágiles en cálculo de cupos.
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <strong className="text-indigo-700">Confiabilidad & Seguridad:</strong> Consistencia de calendario y protección de datos personales.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}

