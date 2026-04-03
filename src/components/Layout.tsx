import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  PlusCircle, 
  History, 
  BarChart3, 
  Truck, 
  Fuel,
  LogOut,
  Fingerprint,
  Activity,
  Droplets,
  Gauge
} from 'lucide-react';
import { cn } from '../lib/utils';
import { logOut, auth } from '../firebase';
import { LumiChat } from './LumiChat';
import { LumiAssistant } from './LumiAssistant';
import { subscribeToActiveShift, closeShift } from '../services/storage';
import { Shift } from '../types';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const userId = auth.currentUser?.uid;
  const [activeShift, setActiveShift] = useState<Shift | null>(null);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToActiveShift((shift) => {
      setActiveShift(shift);
    });
    return () => unsubscribe();
  }, [userId]);
  
  const navItems = [
    { path: '/', icon: Activity, label: 'Painel' },
    { path: '/registrar', icon: PlusCircle, label: 'Registrar' },
    { path: '/historico', icon: History, label: 'Histórico' },
    { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-orange-100 px-4 py-4 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-white shadow-md shadow-orange-100">
              <Fuel size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-orange-600 leading-none">CPLU</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mt-1">Controle de Frota</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button 
              onClick={logOut}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
              <Truck size={16} className="text-orange-500" />
            </div>
          </div>
        </div>

        {activeShift && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <div className="flex-shrink-0 bg-orange-50 px-3 py-2 rounded-2xl border border-orange-100 flex items-center gap-2">
              <Droplets size={14} className="text-orange-500" />
              <div>
                <div className="text-[8px] font-black text-orange-400 uppercase leading-none mb-0.5">Restante</div>
                <div className="text-xs font-black text-orange-600 leading-none">{activeShift.remainingLiters.toFixed(1)}L</div>
              </div>
            </div>
            <div className="flex-shrink-0 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
              <Gauge size={14} className="text-slate-400" />
              <div>
                <div className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Bomba</div>
                <div className="text-xs font-black text-slate-800 leading-none">{activeShift.initialPumpOdometer.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex-shrink-0 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
              <Activity size={14} className="text-slate-400" />
              <div>
                <div className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Turno</div>
                <div className="text-xs font-black text-slate-800 leading-none">{activeShift.shiftType}</div>
              </div>
            </div>
            <button 
              onClick={() => {
                if (window.confirm('Deseja realmente fechar o turno atual?')) {
                  closeShift(activeShift.id);
                }
              }}
              className="flex-shrink-0 bg-red-50 text-red-500 p-2 rounded-xl border border-red-100 active:scale-90 transition-all ml-auto"
              title="Fechar Turno"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto p-4">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-around items-center shadow-[0_-8px_20px_rgba(0,0,0,0.05)] z-50 rounded-t-[32px]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all duration-300",
                isActive ? "text-orange-600 scale-110" : "text-slate-300 hover:text-slate-500"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all",
                isActive ? "bg-orange-50" : "bg-transparent"
              )}>
                <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                isActive ? "opacity-100" : "opacity-0"
              )}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <LumiChat />
      <LumiAssistant activeShift={activeShift} />
    </div>
  );
};
