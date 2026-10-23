import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import DocInfoModal from './components/DocInfoModal';
import MarketplaceHome from './components/MarketplaceHome';
import SuperAdminView from './components/SuperAdminView';
import ClientView from './components/ClientView';
import EmployeeView from './components/EmployeeView';
import AdminView from './components/AdminView';
import TvTotemView from './components/TvTotemView';
import { playQueueChime, speakTurn } from './utils/sound';

export default function App() {
  // Default is 'marketplace' (Rappi style discovery without login!)
  const [activeRole, setActiveRole] = useState('marketplace'); 
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('turnofacil_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [initialTrackCode, setInitialTrackCode] = useState('');

  // Fetch businesses
  const fetchBusinesses = async () => {
    try {
      const res = await fetch('/api/businesses');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setBusinesses(data);
        if (!selectedBusinessId) {
          setSelectedBusinessId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching businesses:', err);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  // Listen to Server-Sent Events (SSE) for real-time updates across the app
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('ticket_status_changed', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.new_status === 'atendiendo' && payload.ticket) {
          playQueueChime();
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    });

    eventSource.addEventListener('settings_updated', () => {
      fetchBusinesses();
    });

    return () => {
      eventSource.close();
    };
  }, []);

  // Handle URL query parameters for QR code direct landing (RF1, RNF Usabilidad)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bizParam = params.get('biz');
    const ticketParam = params.get('ticket');
    if (bizParam) {
      setSelectedBusinessId(bizParam);
      setActiveRole('storefront');
    }
    if (ticketParam) {
      setInitialTrackCode(ticketParam);
      setActiveRole('consultar');
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('turnofacil_user', JSON.stringify(userData));
    
    // Automatically switch to the appropriate view based on role
    if (userData.role === 'superadmin') {
      setActiveRole('superadmin');
    } else if (userData.role === 'admin') {
      setActiveRole('admin');
      if (userData.business_id) setSelectedBusinessId(userData.business_id);
    } else if (userData.role === 'empleado') {
      setActiveRole('empleado');
      if (userData.business_id) setSelectedBusinessId(userData.business_id);
    } else {
      setActiveRole('marketplace');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('turnofacil_user');
    setActiveRole('marketplace');
  };

  // When a user in the marketplace clicks a business card to view its menu & book
  const handleSelectBusinessFromMarketplace = (bizId) => {
    setSelectedBusinessId(bizId);
    setActiveRole('storefront');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Quick track turno from hero or navbar
  const handleOpenTrackTurno = (code = '') => {
    if (code) setInitialTrackCode(code);
    setActiveRole('consultar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If in TV Totem mode, show fullscreen screen view
  if (activeRole === 'totem') {
    return (
      <TvTotemView
        businessId={selectedBusinessId}
        businesses={businesses}
        onExit={() => setActiveRole('admin')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      
      <div>
        {/* Clean Navigation Bar */}
        <Navbar
          activeRole={activeRole}
          setActiveRole={setActiveRole}
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
          onOpenDoc={() => setIsDocOpen(true)}
          onOpenTrack={() => handleOpenTrackTurno()}
        />

        {/* Main Content Router */}
        <main className="pb-12">
          
          {/* 1. PUBLIC MARKETPLACE (Estilo Rappi - No Login Required) */}
          {activeRole === 'marketplace' && (
            <MarketplaceHome
              onSelectBusiness={handleSelectBusinessFromMarketplace}
              onTrackTurno={handleOpenTrackTurno}
              onOpenDoc={() => setIsDocOpen(true)}
            />
          )}

          {/* 2. STOREFRONT & BOOKING (Cliente pide turno o reserva sin login) */}
          {activeRole === 'storefront' && (
            <ClientView
              businesses={businesses}
              selectedBusinessId={selectedBusinessId}
              setSelectedBusinessId={setSelectedBusinessId}
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              onBackToMarketplace={() => setActiveRole('marketplace')}
            />
          )}

          {/* 3. TRACKING VIEW (Consultar turno con código) */}
          {activeRole === 'consultar' && (
            <ClientView
              businesses={businesses}
              selectedBusinessId={selectedBusinessId}
              setSelectedBusinessId={setSelectedBusinessId}
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              onBackToMarketplace={() => setActiveRole('marketplace')}
            />
          )}

          {/* 4. SUPER ADMIN DASHBOARD (Nanotec - Dueño de la Plataforma) */}
          {activeRole === 'superadmin' && (
            <SuperAdminView
              user={user}
              onOpenStorefront={(bizId) => {
                setSelectedBusinessId(bizId);
                setActiveRole('storefront');
              }}
            />
          )}

          {/* 5. LOCAL BUSINESS ADMIN (Dueño de Barbería o Restaurante) */}
          {activeRole === 'admin' && (
            <AdminView
              businessId={selectedBusinessId}
              businesses={businesses}
              user={user}
            />
          )}

          {/* 6. EMPLOYEE QUEUE (Mesero o Barbero atendiendo fila) */}
          {activeRole === 'empleado' && (
            <EmployeeView
              businessId={selectedBusinessId}
              businesses={businesses}
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          )}

        </main>
      </div>

      {/* Footer with ITP and Project Credits */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className="font-bold text-white text-sm">TurnoFácil</span>
              <span>—</span>
              <span>Mocoa, Putumayo</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Plataforma web para restaurantes y barberías reconocidas de Mocoa. Desarrollado por Nanotec.
            </p>
          </div>

          <div className="text-center sm:text-right space-y-1">
            <div className="text-slate-300 font-semibold">
              Institución Universitaria del Putumayo (ITP)
            </div>
            <p className="text-[11px] text-slate-500">
              Proyecto de Software 1 • Helen Solarte, Enid, Marbell Urrutia, Estefania Perenguez • Prof. Luis Jurado
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <DocInfoModal
        isOpen={isDocOpen}
        onClose={() => setIsDocOpen(false)}
      />

    </div>
  );
}
