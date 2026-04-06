import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Truck, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play
} from 'lucide-react';
import { motion } from 'motion/react';
import { FuelRecord, TruckAlert, AlertStatus } from '../types';
import { getRecordsForCurrentWeek } from '../services/storage';
import { Logo } from './Logo';

export const Dashboard = () => {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRecordsForCurrentWeek().then(recs => {
      setRecords(recs);
      setLoading(false);
    });
  }, []);

  const stats = {
    totalLitros: records.reduce((acc, r) => acc + (r.liters || 0), 0),
    totalAbastecimentos: records.length,
    mediaConsumo: records.filter(r => r.consumption && r.consumption > 0).length > 0 
      ? records.reduce((acc, r) => acc + (r.consumption || 0), 0) / records.filter(r => r.consumption && r.consumption > 0).length
      : 0
  };

  const truckStatus = Object.entries(
    records.reduce((acc: Record<string, number[]>, r) => {
      if (!acc[r.plate]) acc[r.plate] = [];
      if (r.consumption && r.consumption > 0) acc[r.plate].push(r.consumption);
      return acc;
    }, {})
  ).map(([plate, consumptions]) => {
    const cons = consumptions as number[];
    const avg = cons.length > 0 ? cons.reduce((a, b) => a + b, 0) / cons.length : 0;
    const latest = cons[0] || 0; // records are sorted desc
    const variation = avg > 0 ? ((latest - avg) / avg) * 100 : 0;
    
    let status: 'ECONÔMICO' | 'NORMAL' | 'CRÍTICO' = 'NORMAL';
    if (latest > avg * 1.05) status = 'ECONÔMICO';
    else if (latest < avg * 0.95) status = 'CRÍTICO';
    
    return { plate, latest, avg, status, variation };
  }).sort((a, b) => a.plate.localeCompare(b.plate));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-300">
        <Loader2 size={48} className="animate-spin mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-[10px]">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white text-center">
        <Logo size="lg" className="mb-6" />
        <h2 className="text-2xl font-black text-slate-800 mb-2">Bem-vindo ao CPLU</h2>
        <p className="text-slate-400 text-sm font-medium mb-8">Resumo da operação semanal.</p>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-slate-50 p-6 rounded-3xl text-left border border-slate-100">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Litros (Semana)</div>
            <div className="text-3xl font-black text-orange-600">{stats.totalLitros.toFixed(1)}L</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-6 rounded-3xl text-left border border-slate-100">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Abastecimentos</div>
              <div className="text-2xl font-black text-slate-800">{stats.totalAbastecimentos}</div>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl text-left border border-slate-100">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Média KM/L</div>
              <div className="text-2xl font-black text-slate-800">{stats.mediaConsumo.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-orange-50 rounded-[32px] border border-orange-100">
          <p className="text-xs font-bold text-orange-700 leading-relaxed">
            "Olá! Eu sou a Lumi. Estou aqui para ajudar no controle da frota. 
            Confira os dados com atenção antes de salvar!"
          </p>
        </div>
      </div>

      {truckStatus.length > 0 && (
        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white">
              <Truck size={20} />
            </div>
            Status da Frota
          </h3>
          
          <div className="space-y-4">
            {truckStatus.map((truck) => (
              <div key={truck.plate} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-sm font-black text-slate-800">{truck.plate}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    Consumo: {truck.latest.toFixed(2)} KM/L
                    <span className={`flex items-center gap-0.5 ${truck.variation > 0 ? 'text-green-500' : truck.variation < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {truck.variation > 0 ? <TrendingUp size={10} /> : truck.variation < 0 ? <TrendingDown size={10} /> : null}
                      {Math.abs(truck.variation).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                  truck.status === 'ECONÔMICO' 
                    ? 'bg-green-50 text-green-600 border-green-100' 
                    : truck.status === 'CRÍTICO'
                    ? 'bg-red-50 text-red-600 border-red-100'
                    : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                  {truck.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
