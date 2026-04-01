import React, { useState, useEffect } from 'react';
import { 
  Search,
  Calendar,
  BarChart3,
  Truck,
  User,
  Trash2,
  AlertCircle,
  History
} from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { FuelRecord } from '../types';
import { subscribeToRecords, removeRecord } from '../services/storage';

export const HistoryList = () => {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [filter, setFilter] = useState({
    search: '',
    date: '',
    shift: ''
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToRecords(setRecords);
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await removeRecord(id);
      setDeletingId(null);
    } catch (err) {
      console.error('Erro ao deletar:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.plate.toLowerCase().includes(filter.search.toLowerCase()) || 
      r.driverName.toLowerCase().includes(filter.search.toLowerCase()) ||
      (r.driverId && r.driverId.toLowerCase().includes(filter.search.toLowerCase()));
    
    const matchesDate = filter.date ? isSameDay(parseISO(r.timestamp), parseISO(filter.date)) : true;
    const matchesShift = filter.shift ? r.shift === filter.shift : true;
    
    return matchesSearch && matchesDate && matchesShift;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="Placa, Motorista ou Matrícula..."
            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-bold"
            value={filter.search}
            onChange={e => setFilter({...filter, search: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="date" 
              className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-bold"
              value={filter.date}
              onChange={e => setFilter({...filter, date: e.target.value})}
            />
          </div>
          <div className="relative">
            <BarChart3 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <select 
              className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-bold appearance-none"
              value={filter.shift}
              onChange={e => setFilter({...filter, shift: e.target.value})}
            >
              <option value="">Todos Turnos</option>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-16 text-slate-300">
            <History size={64} className="mx-auto mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">Nenhum registro</p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-50 flex flex-col gap-3 active:bg-orange-50 transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-active:bg-white transition-colors">
                    <Truck size={28} />
                  </div>
                  <div>
                    <div className="font-black text-slate-800 text-lg tracking-tight">{record.plate}</div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                        <User size={12} />
                        <span>{record.driverName} {record.driverId ? `(${record.driverId})` : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-orange-500">
                        <Calendar size={10} />
                        <span>{record.shift}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-orange-600 leading-none">{record.amount}L</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase mt-1.5 tracking-wider">{record.fuelType}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div className="flex flex-col">
                  <div className="text-[10px] font-bold text-slate-300">
                    {format(parseISO(record.timestamp), 'dd/MM/yyyy HH:mm')}
                  </div>
                  <div className="text-[11px] font-black text-slate-800">{record.mileage.toLocaleString()} KM</div>
                  {record.consumption && (
                    <div className="text-[10px] font-black text-green-600 uppercase tracking-tighter">
                      {record.consumption.toFixed(2)} KM/L
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setDeletingId(record.id)}
                  className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 text-center mb-2">Apagar Registro?</h3>
              <p className="text-slate-400 text-sm text-center mb-8 font-medium">Esta ação não pode ser desfeita. Deseja continuar?</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDelete(deletingId)}
                  disabled={isDeleting}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : 'SIM, APAGAR'}
                </button>
                <button 
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                  className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
