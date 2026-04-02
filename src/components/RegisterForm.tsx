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
    mileageStart: '',
    mileageEnd: '',
    horimeterStart: '',
    horimeterEnd: '',
    amount: '',
    fuelType: 'Diesel S10',
    observation: ''
  });
  const [isManualShift, setIsManualShift] = useState(false);
  const [lastMileage, setLastMileage] = useState<number | null>(null);
  const [lastRecord, setLastRecord] = useState<FuelRecord | null>(null);
  const [isLoadingLast, setIsLoadingLast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weeklyAvg, setWeeklyAvg] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');

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

  // Automatic Shift Logic
  useEffect(() => {
    if (!isManualShift) {
      const now = new Date();
      const hour = now.getHours();
      const autoShift = hour < 12 ? 'Manhã' : 'Tarde';
      setFormData(prev => ({ ...prev, shift: autoShift }));
    }
  }, [isManualShift]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.plate || !formData.driverName || !formData.mileage || !formData.amount || !formData.shift || 
        !formData.mileageStart || !formData.mileageEnd || !formData.horimeterStart || !formData.horimeterEnd) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const currentMileage = Number(formData.mileage);
    const currentAmount = Number(formData.amount);
    const mStart = Number(formData.mileageStart);
    const mEnd = Number(formData.mileageEnd);
    const hStart = Number(formData.horimeterStart);
    const hEnd = Number(formData.horimeterEnd);

    // Validations
    if (mEnd < mStart) {
      setError('Hodômetro final não pode ser menor que o inicial.');
      return;
    }
    if (hEnd < hStart) {
      setError('Horímetro final não pode ser menor que o inicial.');
      return;
    }

    // KM Consistency Check (mileage is the final odometer for the record)
    if (lastMileage !== null && currentMileage <= lastMileage) {
      setError('Verificar quilometragem: O KM atual deve ser maior que o anterior.');
      return;
    }
    
    // Ensure mileage matches mileageEnd for consistency
    if (currentMileage !== mEnd) {
      setError('A quilometragem principal deve ser igual ao hodômetro final.');
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
          
          setConfirmMessage(message);
          setShowConfirmModal(true);
          setIsSubmitting(false);
          return;
        }
      }

      await executeSave(consumption);
    } catch (err) {
      setError('Erro ao salvar o registro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeSave = async (consumption?: number) => {
    try {
      setIsSubmitting(true);
      const currentMileage = Number(formData.mileage);
      const currentAmount = Number(formData.amount);
      const mStart = Number(formData.mileageStart);
      const mEnd = Number(formData.mileageEnd);
      const hStart = Number(formData.horimeterStart);
      const hEnd = Number(formData.horimeterEnd);

      const newRecord: Omit<FuelRecord, 'id'> = {
        plate: formData.plate.toUpperCase(),
        driverName: formData.driverName,
        shift: formData.shift,
        mileage: currentMileage,
        mileageStart: mStart,
        mileageEnd: mEnd,
        horimeterStart: hStart,
        horimeterEnd: hEnd,
        mileageDiff: mEnd - mStart,
        horimeterDiff: hEnd - hStart,
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
          shift: new Date().getHours() < 12 ? 'Manhã' : 'Tarde',
          mileage: '',
          mileageStart: '',
          mileageEnd: '',
          horimeterStart: '',
          horimeterEnd: '',
          amount: '',
          fuelType: 'Diesel S10',
          observation: ''
        });
        setIsManualShift(false);
        setLastMileage(null);
        setLastRecord(null);
        setWeeklyAvg(null);
      }, 2000);
    } catch (err) {
      setError('Erro ao salvar o registro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Atenção ao Consumo</h3>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
              {confirmMessage}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  const currentMileage = Number(formData.mileage);
                  const currentAmount = Number(formData.amount);
                  // Recalculate consumption for executeSave
                  getMorningRecordForPlateOnDay(formData.plate, new Date()).then(morningRecord => {
                    let consumption: number | undefined = undefined;
                    if (morningRecord) {
                      const distance = currentMileage - morningRecord.mileage;
                      if (distance > 0) consumption = distance / morningRecord.amount;
                    }
                    executeSave(consumption);
                  });
                }}
                className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-100 active:scale-95 transition-all"
              >
                SIM, REGISTRAR
              </button>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-2xl active:scale-95 transition-all"
              >
                NÃO, VOLTAR
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="flex bg-slate-50 rounded-2xl p-1 border-2 border-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, shift: 'Manhã'});
                    setIsManualShift(true);
                  }}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.shift === 'Manhã' 
                      ? 'bg-white text-orange-600 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Manhã
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, shift: 'Tarde'});
                    setIsManualShift(true);
                  }}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.shift === 'Tarde' 
                      ? 'bg-white text-orange-600 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Tarde
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Hodômetro Inicial</label>
              <input 
                type="number" 
                placeholder="0"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={formData.mileageStart}
                onChange={e => setFormData({...formData, mileageStart: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Hodômetro Final</label>
              <input 
                type="number" 
                placeholder="0"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={formData.mileageEnd}
                onChange={e => {
                  setFormData({...formData, mileageEnd: e.target.value, mileage: e.target.value});
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Horímetro Inicial</label>
              <input 
                type="number" 
                step="0.1"
                placeholder="0.0"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={formData.horimeterStart}
                onChange={e => setFormData({...formData, horimeterStart: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Horímetro Final</label>
              <input 
                type="number" 
                step="0.1"
                placeholder="0.0"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={formData.horimeterEnd}
                onChange={e => setFormData({...formData, horimeterEnd: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Quilometragem (Geral)</label>
              <input 
                type="number" 
                placeholder="0"
                readOnly
                className="w-full bg-slate-100 border-2 border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold text-slate-400 cursor-not-allowed"
                value={formData.mileage}
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

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-red-100">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-green-100">
              <CheckCircle2 size={18} />
              Salvo com sucesso!
            </div>
          )}

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
    </div>
  );
};
