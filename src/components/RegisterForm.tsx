import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  History, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  TrendingDown,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FuelRecord } from '../types';
import { 
  saveRecord, 
  getLastRecordForPlate, 
  getMorningRecordForPlateOnDay,
  getWeeklyRecordsForPlate 
} from '../services/storage';
import { auth } from '../firebase';

export const RegisterForm = () => {
  const [formData, setFormData] = useState({
    plate: '',
    driverName: '',
    driverId: '',
    shift: 'Manhã' as 'Manhã' | 'Tarde',
    mileage: '',
    amount: '',
    fuelType: 'Diesel S10',
    observation: ''
  });
  const [lastMileage, setLastMileage] = useState<number | null>(null);
  const [lastRecord, setLastRecord] = useState<FuelRecord | null>(null);
  const [isLoadingLast, setIsLoadingLast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weeklyAvg, setWeeklyAvg] = useState<number | null>(null);

  useEffect(() => {
    const fetchLast = async () => {
      if (formData.plate.length >= 3) {
        setIsLoadingLast(true);
        try {
          const last = await getLastRecordForPlate(formData.plate);
          setLastRecord(last);
          setLastMileage(last ? last.mileage : null);

          // Fetch weekly average for alerts
          const weeklyRecords = await getWeeklyRecordsForPlate(formData.plate);
          const recordsWithConsumption = weeklyRecords.filter(r => r.consumption !== undefined);
          if (recordsWithConsumption.length > 0) {
            const avg = recordsWithConsumption.reduce((acc, r) => acc + (r.consumption || 0), 0) / recordsWithConsumption.length;
            setWeeklyAvg(avg);
          } else {
            setWeeklyAvg(null);
          }
        } catch (err) {
          console.error('Error fetching last record:', err);
        } finally {
          setIsLoadingLast(false);
        }
      } else {
        setLastRecord(null);
        setLastMileage(null);
        setWeeklyAvg(null);
      }
    };

    const timer = setTimeout(fetchLast, 500);
    return () => clearTimeout(timer);
  }, [formData.plate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.plate || !formData.driverName || !formData.mileage || !formData.amount || !formData.shift) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const currentMileage = Number(formData.mileage);
    const currentAmount = Number(formData.amount);

    // KM Consistency Check
    if (lastMileage !== null && currentMileage <= lastMileage) {
      setError('Verificar quilometragem: O KM atual deve ser maior que o anterior.');
      return;
    }

    setIsSubmitting(true);
    try {
      let consumption: number | undefined = undefined;
      
      // NEW LOGIC: Only calculate consumption in the afternoon shift
      if (formData.shift === 'Tarde') {
        const morningRecord = await getMorningRecordForPlateOnDay(formData.plate, new Date());
        if (morningRecord) {
          const distance = currentMileage - morningRecord.mileage;
          if (distance > 0) {
            // Formula: (KM tarde - KM manhã) / litros da manhã
            consumption = distance / morningRecord.amount;
          }
        }
      }

      // Weekly Average Alert
      if (consumption !== undefined && weeklyAvg !== null) {
        const diff = Math.abs(consumption - weeklyAvg) / weeklyAvg;
        if (diff > 0.20) { // 20% deviation
          const message = consumption > weeklyAvg 
            ? `Consumo (${consumption.toFixed(2)}) está MUITO ACIMA da média semanal (${weeklyAvg.toFixed(2)}). Deseja registrar?`
            : `Consumo (${consumption.toFixed(2)}) está MUITO ABAIXO da média semanal (${weeklyAvg.toFixed(2)}). Deseja registrar?`;
          
          if (!window.confirm(message)) {
            setIsSubmitting(false);
            return;
          }
        }
      }

      const newRecord: Omit<FuelRecord, 'id'> = {
        plate: formData.plate.toUpperCase(),
        driverName: formData.driverName,
        shift: formData.shift,
        mileage: currentMileage,
        amount: currentAmount,
        fuelType: formData.fuelType,
        timestamp: new Date().toISOString(),
        observation: formData.observation,
        userId: auth.currentUser?.uid || 'anonymous',
        responsibleName: auth.currentUser?.displayName || auth.currentUser?.email || 'Sistema'
      };

      if (formData.driverId) {
        newRecord.driverId = formData.driverId;
      }

      if (consumption !== undefined) {
        newRecord.consumption = consumption;
      }

      await saveRecord(newRecord);
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          plate: '',
          driverName: '',
          driverId: '',
          shift: 'Manhã',
          mileage: '',
          amount: '',
          fuelType: 'Diesel S10',
          observation: ''
        });
        setLastMileage(null);
        setLastRecord(null);
        setWeeklyAvg(null);
      }, 2000);
    } catch (err) {
      setError('Erro ao salvar o registro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
        <h2 className="text-xl font-black mb-8 text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <PlusCircle size={24} />
          </div>
          Novo Registro
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Placa do Caminhão</label>
            <input 
              type="text" 
              placeholder="ABC-1234"
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all uppercase font-bold text-slate-700"
              value={formData.plate}
              onChange={e => setFormData({...formData, plate: e.target.value})}
            />
            {isLoadingLast ? (
              <div className="text-[10px] font-bold text-slate-400 ml-1 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" />
                Buscando último KM...
              </div>
            ) : lastMileage !== null && (
              <div className="text-[10px] font-bold text-orange-500 ml-1 flex items-center gap-1">
                <History size={12} />
                Último KM registrado: {lastMileage.toLocaleString()} KM
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome do Motorista</label>
            <input 
              type="text" 
              placeholder="Nome completo"
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
              value={formData.driverName}
              onChange={e => setFormData({...formData, driverName: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Matrícula (Opcional)</label>
              <input 
                type="text" 
                placeholder="0000"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={formData.driverId}
                onChange={e => setFormData({...formData, driverId: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Turno</label>
              <select 
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
                value={formData.shift}
                onChange={e => setFormData({...formData, shift: e.target.value as 'Manhã' | 'Tarde'})}
              >
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Quilometragem</label>
              <input 
                type="number" 
                placeholder="0"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={formData.mileage}
                onChange={e => setFormData({...formData, mileage: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Litros</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo de Combustível</label>
            <select 
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
              value={formData.fuelType}
              onChange={e => setFormData({...formData, fuelType: e.target.value})}
            >
              <option>Diesel S10</option>
              <option>Diesel S500</option>
              <option>Arla 32</option>
              <option>Gasolina</option>
              <option>Etanol</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Observação</label>
            <textarea 
              rows={2}
              placeholder="Opcional..."
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
              value={formData.observation}
              onChange={e => setFormData({...formData, observation: e.target.value})}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-red-100"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-green-50 text-green-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-green-100"
              >
                <CheckCircle2 size={18} />
                Salvo com sucesso!
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-200 transition-all active:scale-[0.96] mt-4 text-lg tracking-widest flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : 'REGISTRAR'}
          </button>
        </form>
      </div>
    </motion.div>
  );
};
