import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  History, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Fuel,
  Clock,
  Navigation,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FuelRecord, Shift } from '../types';
import { 
  saveRecord, 
  getLastRecordForPlate, 
  subscribeToActiveShift,
  startShift,
  closeShift
} from '../services/storage';
import { auth } from '../firebase';

export const RegisterForm = () => {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isLoadingShift, setIsLoadingShift] = useState(true);
  
  const [shiftFormData, setShiftFormData] = useState({
    initialPumpOdometer: '',
    initialLiters: '',
    shiftType: 'Manhã' as 'Manhã' | 'Tarde'
  });

  const [fuelFormData, setFuelFormData] = useState({
    plate: '',
    driverName: '',
    truckKm: '',
    horimeter: '',
    liters: '',
    pumpOdometer: ''
  });

  const [lastRecord, setLastRecord] = useState<FuelRecord | null>(null);
  const [isLoadingLast, setIsLoadingLast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) {
      setIsLoadingShift(false);
      return;
    }

    const unsubscribe = subscribeToActiveShift((shift) => {
      setActiveShift(shift);
      setIsLoadingShift(false);
      
      // Auto-set shift type based on time if starting new
      if (!shift) {
        const hour = new Date().getHours();
        setShiftFormData(prev => ({ ...prev, shiftType: hour < 12 ? 'Manhã' : 'Tarde' }));
      }
    });

    // Add a safety timeout to stop loading if something goes wrong
    const timeout = setTimeout(() => {
      setIsLoadingShift(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const fetchLast = async () => {
      if (fuelFormData.plate.length >= 3) {
        setIsLoadingLast(true);
        try {
          const last = await getLastRecordForPlate(fuelFormData.plate);
          setLastRecord(last);
        } catch (err) {
          console.error('Error fetching last record:', err);
        } finally {
          setIsLoadingLast(false);
        }
      } else {
        setLastRecord(null);
      }
    };

    const timer = setTimeout(fetchLast, 500);
    return () => clearTimeout(timer);
  }, [fuelFormData.plate]);

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!shiftFormData.initialPumpOdometer || !shiftFormData.initialLiters) {
      setError('Preencha todos os campos da abertura de turno.');
      setIsSubmitting(false);
      return;
    }

    try {
      const now = new Date();
      await startShift({
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        shiftType: shiftFormData.shiftType as 'Manhã' | 'Tarde',
        initialPumpOdometer: Number(shiftFormData.initialPumpOdometer),
        initialLiters: Number(shiftFormData.initialLiters)
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError('Erro ao iniciar turno.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!activeShift) {
      setError('Nenhum turno ativo encontrado.');
      return;
    }

    const { plate, driverName, truckKm, horimeter, liters, pumpOdometer } = fuelFormData;

    if (!plate || !driverName || !truckKm || !horimeter || !liters || !pumpOdometer) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const nLiters = Number(liters) || 0;
    const nPumpOdometer = Number(pumpOdometer) || 0;
    const nTruckKm = Number(truckKm) || 0;
    const nHorimeter = Number(horimeter) || 0;

    if (nLiters <= 0) {
      setError('A quantidade de litros deve ser maior que zero.');
      return;
    }

    if (nTruckKm <= 0) {
      setError('O KM do caminhão deve ser maior que zero.');
      return;
    }

    if (nHorimeter < 0) {
      setError('O horímetro não pode ser negativo.');
      return;
    }

    // Pump odometer must be increasing
    const lastPumpValue = activeShift.initialPumpOdometer || 0; 
    if (nPumpOdometer <= lastPumpValue) {
      setError(`O hodômetro da bomba deve ser maior que o inicial (${lastPumpValue.toLocaleString()}).`);
      return;
    }

    if (nLiters > (activeShift.remainingLiters || 0)) {
      setError(`Quantidade de litros excede o disponível na bomba (${(activeShift.remainingLiters || 0).toFixed(2)}L).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const newRecord: Omit<FuelRecord, 'id'> = {
        plate: (plate || '').toUpperCase().trim(),
        driverName: (driverName || '').trim(),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        truckKm: nTruckKm,
        horimeter: nHorimeter,
        liters: nLiters,
        pumpOdometer: nPumpOdometer,
        timestamp: now.toISOString(),
        userId: auth.currentUser?.uid || 'anonymous',
        shiftId: activeShift.id || '',
        shiftType: activeShift.shiftType
      };

      await saveRecord(newRecord, activeShift);
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
        setFuelFormData({
          plate: '',
          driverName: '',
          truckKm: '',
          horimeter: '',
          liters: '',
          pumpOdometer: ''
        });
        setLastRecord(null);
      }, 2000);
    } catch (err) {
      setError('Erro ao salvar o registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingShift) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-300">
        <Loader2 size={48} className="animate-spin mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-[10px]">Verificando turno...</p>
      </div>
    );
  }

  if (!activeShift) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
          <div className="w-16 h-16 bg-orange-500 rounded-[24px] flex items-center justify-center text-white shadow-lg shadow-orange-200 mb-6 mx-auto">
            <Clock size={32} />
          </div>
          <h2 className="text-2xl font-black text-center text-slate-800 mb-2">Iniciar Turno</h2>
          <p className="text-slate-400 text-center text-sm font-medium mb-8">Abertura obrigatória para abastecimento.</p>

          <form onSubmit={handleStartShift} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Turno</label>
              <div className="flex bg-slate-50 rounded-2xl p-1 border-2 border-slate-50">
                <button
                  type="button"
                  onClick={() => setShiftFormData({...shiftFormData, shiftType: 'Manhã'})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    shiftFormData.shiftType === 'Manhã' 
                      ? 'bg-white text-orange-600 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Manhã
                </button>
                <button
                  type="button"
                  onClick={() => setShiftFormData({...shiftFormData, shiftType: 'Tarde'})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    shiftFormData.shiftType === 'Tarde' 
                      ? 'bg-white text-orange-600 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Tarde
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Hodômetro Inicial da Bomba</label>
              <input 
                type="number" 
                placeholder="0"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={shiftFormData.initialPumpOdometer}
                onChange={e => setShiftFormData({...shiftFormData, initialPumpOdometer: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Quantidade de Litros Inicial</label>
              <input 
                type="number" 
                placeholder="Ex: 8000"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={shiftFormData.initialLiters}
                onChange={e => setShiftFormData({...shiftFormData, initialLiters: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Data</span>
                <span className="text-sm font-bold text-slate-600">{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Hora</span>
                <span className="text-sm font-bold text-slate-600">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-red-100">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-200 transition-all active:scale-[0.96] mt-4 text-lg tracking-widest flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : 'INICIAR TURNO'}
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-white">
        <h2 className="text-xl font-black mb-8 text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <PlusCircle size={24} />
          </div>
          Novo Abastecimento
        </h2>

        <form onSubmit={handleFuelSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Placa do Caminhão</label>
              <input 
                type="text" 
                placeholder="ABC-1234"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all uppercase font-bold text-slate-700"
                value={fuelFormData.plate}
                onChange={e => setFuelFormData({...fuelFormData, plate: e.target.value})}
              />
              {isLoadingLast ? (
                <div className="text-[10px] font-bold text-slate-400 ml-1 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  Buscando...
                </div>
              ) : lastRecord && (
                <div className="text-[10px] font-bold text-orange-500 ml-1 flex items-center gap-1">
                  <History size={12} />
                  Último KM: {(lastRecord.truckKm || 0).toLocaleString()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome do Motorista</label>
              <input 
                type="text" 
                placeholder="Nome completo"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={fuelFormData.driverName}
                onChange={e => setFuelFormData({...fuelFormData, driverName: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1">
                <Navigation size={12} /> KM Atual
              </label>
              <input 
                type="number" 
                placeholder="0"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={fuelFormData.truckKm}
                onChange={e => setFuelFormData({...fuelFormData, truckKm: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1">
                <Clock size={12} /> Horímetro
              </label>
              <input 
                type="number" 
                step="0.1"
                placeholder="0.0"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={fuelFormData.horimeter}
                onChange={e => setFuelFormData({...fuelFormData, horimeter: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1">
                <Fuel size={12} /> Litros Abastecidos
              </label>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={fuelFormData.liters}
                onChange={e => setFuelFormData({...fuelFormData, liters: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Hodômetro Bomba (Atual)</label>
              <input 
                type="number" 
                placeholder="Valor após abastecer"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                value={fuelFormData.pumpOdometer}
                onChange={e => setFuelFormData({...fuelFormData, pumpOdometer: e.target.value})}
              />
            </div>
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
              Abastecimento registrado!
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-200 transition-all active:scale-[0.96] mt-4 text-lg tracking-widest flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : 'SALVAR REGISTRO'}
          </button>
        </form>
      </div>
    </div>
  );
};
