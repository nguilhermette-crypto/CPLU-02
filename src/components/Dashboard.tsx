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
    mediaConsumo: records.length > 0 
      ? records.reduce((acc, r) => acc + (r.consumption || 0), 0) / records.filter(r => r.consumption).length || 0
      : 0
  };

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
        <div className="w-20 h-20 bg-orange-50 rounded-[32px] flex items-center justify-center text-orange-500 mx-auto mb-6">
          <Activity size={40} />
        </div>
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
    </div>
  );
};
