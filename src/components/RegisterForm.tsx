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
import { Logo } from './Logo';
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
        let detectedShift: 'Manhã' | 'Tarde' = 'Manhã';
        if (hour >= 12) detectedShift = 'Tarde';
        
        setShiftFormData(prev => ({ ...prev, shiftType: detectedShift }));
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
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <PlusCircle size={24} />
            </div>
            Novo Abastecimento
          </h2>
          <div className="bg-orange-50 px-4 py-2 rounded-full border border-orange-100">
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
              Turno: {activeShift.shiftType}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Fuel Pump Visual */}
          <div className="lg:w-1/3 flex flex-col items-center justify-center">
            <div className="relative w-48 h-72 bg-slate-100 rounded-[32px] border-4 border-slate-200 shadow-inner flex flex-col items-center pt-8">
              {/* Pump Display */}
              <div className="w-32 h-16 bg-slate-800 rounded-xl border-4 border-slate-300 flex flex-col items-center justify-center mb-8">
                <div className="text-green-400 font-mono text-xl font-black">
                  {fuelFormData.liters || '0.00'}
                </div>
                <div className="text-[8px] text-green-400/50 uppercase font-bold">Litros</div>
              </div>

              {/* Logo on Pump */}
              <Logo size="md" showText={false} className="scale-125 mb-8" />

              {/* Pump Handle Slot */}
              <div className="absolute -right-4 top-1/2 w-4 h-16 bg-slate-300 rounded-r-lg border-r-4 border-slate-400" />
              
              {/* Base */}
              <div className="absolute bottom-0 w-full h-8 bg-slate-300 rounded-b-[28px]" />
            </div>
            <div className="mt-4 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bomba de Abastecimento</p>
              <p className="text-xs font-bold text-slate-600">CPLU - Unidade Operacional</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleFuelSubmit} className="flex-1 space-y-5">
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
  </div>
);
};
