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

export const AlertsPanel = () => {
  const [alerts, setAlerts] = useState<TruckAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const calculateAlerts = (records: FuelRecord[]) => {
    const truckData: Record<string, { plate: string, consumptions: number[], lastConsumption?: number }> = {};

    records.forEach(record => {
      if (!truckData[record.plate]) {
        truckData[record.plate] = { plate: record.plate, consumptions: [] };
      }
      if (record.consumption !== undefined) {
        truckData[record.plate].consumptions.push(record.consumption);
        // Records are ordered by timestamp desc, so the first one we find is the latest
        if (truckData[record.plate].lastConsumption === undefined) {
          truckData[record.plate].lastConsumption = record.consumption;
        }
      }
    });

    const calculatedAlerts: TruckAlert[] = Object.values(truckData)
      .filter(data => data.consumptions.length > 0 && data.lastConsumption !== undefined)
      .map(data => {
        const weeklyAvg = data.consumptions.reduce((a, b) => a + b, 0) / data.consumptions.length;
        const variation = ((data.lastConsumption! - weeklyAvg) / weeklyAvg) * 100;
        const absVariation = Math.abs(variation);

        let status: AlertStatus = 'Normal';
        if (absVariation > 30) status = 'Crítico';
        else if (absVariation > 15) status = 'Atenção';

        return {
          plate: data.plate,
          currentConsumption: data.lastConsumption!,
          weeklyAvg,
          variation,
          status
        };
      });

    setAlerts(calculatedAlerts);
  };

  const generateDemoData = () => {
    const demoTrucks = [
      'ABC-1234', 'XYZ-5678', 'KJH-9012', 'PLM-3456', 'QWE-7890',
      'RTY-1122', 'UIO-3344', 'PAS-5566', 'DFG-7788', 'HJK-9900',
      'LZX-2233', 'CVB-4455', 'BNM-6677', 'WER-8899', 'TYU-0011',
      'IOP-2244', 'ASD-6688', 'FGH-1133', 'JKL-5577', 'ZXC-9911'
    ];

    const demoAlerts: TruckAlert[] = demoTrucks.map(plate => {
      const baseAvg = 2.5 + Math.random() * 2; // 2.5 to 4.5 KM/L
      const randomFactor = Math.random();
      let current;
      
      if (randomFactor > 0.85) {
        // Critical (Low or High)
        current = Math.random() > 0.5 ? baseAvg * 1.4 : baseAvg * 0.6;
      } else if (randomFactor > 0.7) {
        // Attention
        current = Math.random() > 0.5 ? baseAvg * 1.2 : baseAvg * 0.8;
      } else {
        // Normal
        current = baseAvg * (0.95 + Math.random() * 0.1);
      }

      const variation = ((current - baseAvg) / baseAvg) * 100;
      const absVariation = Math.abs(variation);

      let status: AlertStatus = 'Normal';
      if (absVariation > 30) status = 'Crítico';
      else if (absVariation > 15) status = 'Atenção';

      return {
        plate,
        currentConsumption: current,
        weeklyAvg: baseAvg,
        variation,
        status
      };
    });

    setAlerts(demoAlerts);
    setLoading(false);
  };

  useEffect(() => {
    if (isDemoMode) {
      generateDemoData();
    } else {
      setLoading(true);
      getRecordsForCurrentWeek().then(records => {
        calculateAlerts(records);
        setLoading(false);
      });
    }
  }, [isDemoMode]);

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.status === 'Crítico').length,
    attention: alerts.filter(a => a.status === 'Atenção').length,
    normal: alerts.filter(a => a.status === 'Normal').length
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
      {/* Demo Mode Toggle */}
      <div className="flex justify-end">
        <button 
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            isDemoMode ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <Play size={14} fill={isDemoMode ? 'white' : 'none'} />
          {isDemoMode ? 'Modo Demonstração Ativo' : 'Ativar Modo Demonstração'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-50">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Frota</div>
          <div className="text-2xl font-black text-slate-800">{stats.total}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-3xl border border-red-100">
          <div className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Críticos</div>
          <div className="text-2xl font-black text-red-600">{stats.critical}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100">
          <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Atenção</div>
          <div className="text-2xl font-black text-amber-600">{stats.attention}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-3xl border border-green-100">
          <div className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-1">Normal</div>
          <div className="text-2xl font-black text-green-600">{stats.normal}</div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
          <Activity size={14} />
          Monitoramento em Tempo Real
        </h3>
        
        <div className="grid gap-3">
          {alerts.sort((a, b) => {
            const priority = { 'Crítico': 0, 'Atenção': 1, 'Normal': 2 };
            return priority[a.status] - priority[b.status];
          }).map((alert, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={alert.plate}
              className="bg-white p-4 rounded-[28px] shadow-sm border border-slate-50 flex items-center justify-between group hover:border-orange-100 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  alert.status === 'Crítico' ? 'bg-red-50 text-red-500' :
                  alert.status === 'Atenção' ? 'bg-amber-50 text-amber-500' :
                  'bg-green-50 text-green-500'
                }`}>
                  <Truck size={24} />
                </div>
                <div>
                  <div className="font-black text-slate-800 text-lg leading-none mb-1">{alert.plate}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      alert.status === 'Crítico' ? 'bg-red-100 text-red-600' :
                      alert.status === 'Atenção' ? 'bg-amber-100 text-amber-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {alert.status}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Média: {alert.weeklyAvg.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-black text-slate-800 leading-none mb-1">
                  {alert.currentConsumption.toFixed(2)}
                  <span className="text-[10px] text-slate-400 ml-1">KM/L</span>
                </div>
                <div className={`text-[10px] font-black flex items-center gap-1 justify-end ${
                  alert.variation > 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {alert.variation > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(alert.variation).toFixed(1)}%
                </div>
              </div>
            </motion.div>
          ))}
          
          {alerts.length === 0 && (
            <div className="bg-white p-12 rounded-[32px] text-center border border-dashed border-slate-200">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-slate-100" />
              <p className="text-slate-400 font-bold text-sm">Nenhum alerta detectado na frota.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
