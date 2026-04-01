import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  PlusCircle, 
  History, 
  BarChart3, 
  Truck, 
  Fuel,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { logOut } from '../firebase';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: PlusCircle, label: 'Registrar' },
    { path: '/historico', icon: History, label: 'Histórico' },
    { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <header className="sticky top-0 z-10 bg-white border-b border-orange-100 px-4 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-xl text-white shadow-md shadow-orange-100">
            <Fuel size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-orange-600 leading-none">CPLU</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mt-1">Controle de Frota</p>
          </div>
        </div>
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
    </div>
  );
};
