import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Truck, 
  Activity,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { subscribeToRecords } from '../services/storage';
import { FuelRecord } from '../types';
import { subDays, isAfter, parseISO } from 'date-fns';
import { RegisterForm } from './RegisterForm';

interface TruckStat {
  plate: string;
  consumptions: number[];
  lastConsumption?: number;
  avgConsumption: number;
}

export const Dashboard = () => {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToRecords((newRecords) => {
      setRecords(newRecords);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Calculate weekly stats per truck
  const sevenDaysAgo = subDays(new Date(), 7);
  const weeklyRecords = records.filter(r => isAfter(parseISO(r.timestamp), sevenDaysAgo));
  
  const truckStats = weeklyRecords.reduce((acc, record) => {
    if (!acc[record.plate]) {
      acc[record.plate] = {
        plate: record.plate,
        consumptions: [],
        lastConsumption: undefined,
        avgConsumption: 0
      };
    }
    if (record.consumption !== undefined) {
      acc[record.plate].consumptions.push(record.consumption);
      // Since records are ordered by timestamp desc, the first one we find is the latest
      if (acc[record.plate].lastConsumption === undefined) {
        acc[record.plate].lastConsumption = record.consumption;
      }
    }
    return acc;
  }, {} as Record<string, TruckStat>);

  const truckStatsList: TruckStat[] = Object.values(truckStats);

  truckStatsList.forEach(stats => {
    if (stats.consumptions.length > 0) {
      stats.avgConsumption = stats.consumptions.reduce((a, b) => a + b, 0) / stats.consumptions.length;
    }
  });

  const alerts = truckStatsList.filter(stats => {
    if (stats.lastConsumption !== undefined && stats.avgConsumption > 0) {
      const diff = Math.abs(stats.lastConsumption - stats.avgConsumption) / stats.avgConsumption;
      return diff > 0.15; // 15% deviation for dashboard alerts
    }
    return false;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-300">
        <Loader2 size={48} className="animate-spin mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-[10px]">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-500" />
            Alertas de Consumo
          </h3>
          <div className="grid gap-3">
            {alerts.map(alert => {
              const isHigh = alert.lastConsumption! > alert.avgConsumption;
              return (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={alert.plate}
                  className="bg-white p-4 rounded-3xl shadow-sm border-l-4 border-orange-500 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                      <Truck size={20} />
                    </div>
                    <div>
                      <div className="font-black text-slate-800 leading-none mb-1">{alert.plate}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Consumo fora do padrão semanal
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-black flex items-center gap-1 justify-end ${isHigh ? 'text-red-500' : 'text-blue-500'}`}>
                      {isHigh ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {alert.lastConsumption?.toFixed(2)}
                    </div>
                    <div className="text-[9px] font-bold text-slate-300 uppercase">Média: {alert.avgConsumption.toFixed(2)}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Weekly Stats Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <Activity size={14} />
            Média Semanal por Veículo
          </h3>
        </div>
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-50 overflow-hidden">
          {truckStatsList.length === 0 ? (
            <div className="p-8 text-center text-slate-300 italic text-xs">Nenhum dado semanal disponível.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {truckStatsList.sort((a, b) => b.avgConsumption - a.avgConsumption).map(stats => (
                <div key={stats.plate} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <Truck size={16} />
                    </div>
                    <span className="font-bold text-slate-700">{stats.plate}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-800">{stats.avgConsumption.toFixed(2)} KM/L</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{stats.consumptions.length} registros</div>
                    </div>
                    <ChevronRight size={16} className="text-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Action */}
      {!showForm ? (
        <button 
          onClick={() => setShowForm(true)}
          className="w-full bg-orange-500 text-white p-6 rounded-[32px] shadow-xl shadow-orange-100 font-black flex items-center justify-between group active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <PlusCircle size={28} />
            </div>
            <div className="text-left">
              <div className="text-lg leading-none mb-1">Novo Abastecimento</div>
              <div className="text-[10px] font-bold text-orange-100 uppercase tracking-widest">Registrar agora</div>
            </div>
          </div>
          <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </button>
      ) : (
        <div className="relative">
          <button 
            onClick={() => setShowForm(false)}
            className="absolute -top-12 right-0 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-orange-500 transition-colors"
          >
            Fechar Formulário
          </button>
          <RegisterForm />
        </div>
      )}
    </div>
  );
};

const PlusCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);
