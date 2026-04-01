import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  History, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { FuelRecord } from '../types';
import { saveRecord, subscribeToRecords } from '../services/storage';
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
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [lastMileage, setLastMileage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToRecords(setRecords);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (formData.plate.length >= 3) {
      const last = records
        .filter(r => r.plate.toUpperCase() === formData.plate.toUpperCase())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      setLastMileage(last ? last.mileage : null);
    } else {
      setLastMileage(null);
    }
  }, [formData.plate, records]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.plate || !formData.driverName || !formData.mileage || !formData.amount || !formData.shift) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const today = new Date();
      const lastRecordToday = records
        .filter(r => 
          r.plate.toUpperCase() === formData.plate.toUpperCase() && 
          isSameDay(parseISO(r.timestamp), today)
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      let consumption: number | undefined = undefined;
      if (lastRecordToday) {
        const distance = Number(formData.mileage) - lastRecordToday.mileage;
        if (distance > 0) {
          consumption = distance / Number(formData.amount);
        }
      }

      const newRecord: Omit<FuelRecord, 'id'> = {
        plate: formData.plate.toUpperCase(),
        driverName: formData.driverName,
        driverId: formData.driverId || undefined,
        shift: formData.shift,
        mileage: Number(formData.mileage),
        amount: Number(formData.amount),
        fuelType: formData.fuelType,
        timestamp: new Date().toISOString(),
        consumption: consumption,
        observation: formData.observation,
        userId: auth.currentUser?.uid || 'anonymous'
      };

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
            {lastMileage !== null && (
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
