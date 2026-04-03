import React, { useState, useEffect } from 'react';
import { 
  Search,
  Calendar,
  BarChart3,
  Truck,
  User,
  Trash2,
  AlertCircle,
  History,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { FuelRecord } from '../types';
import { subscribeToRecords, removeRecord } from '../services/storage';

export const HistoryList = () => {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [limitCount, setLimitCount] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    search: '',
    date: '',
    shift: ''
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToRecords((newRecords) => {
      setRecords(newRecords);
      setIsLoading(false);
    }, limitCount);
    return () => unsubscribe();
  }, [limitCount]);

  const truckRecords = selectedTruck 
    ? records.filter(r => r.plate === selectedTruck)
    : [];

  const truckLastKm = truckRecords.length > 0
    ? Math.max(...truckRecords.map(r => r.truckKm || 0))
    : 0;

  const truckTotalLiters = truckRecords.reduce((acc, r) => acc + (r.liters || 0), 0);

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

      <div className="bg-white rounded-[28px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Placa</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Motorista</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Hora</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">KM Caminhão</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Horímetro</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Litros</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Bomba</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-300">
                    <Loader2 size={48} className="mx-auto mb-4 animate-spin opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">Carregando histórico...</p>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-300">
                    <History size={64} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold uppercase tracking-widest text-xs">Nenhum registro</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedTruck(record.plate)}
                        className="font-black text-slate-800 hover:text-orange-500 transition-colors"
                      >
                        {record.plate}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-600">{record.driverName}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-xs font-bold text-slate-400">{record.time || format(parseISO(record.timestamp), 'HH:mm')}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-black text-slate-700">{(record.truckKm || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-bold text-slate-500">{(record.horimeter || 0).toFixed(1)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-black text-orange-600">{record.liters}L</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-bold text-slate-800">{(record.pumpOdometer || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setDeletingId(record.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {records.length >= limitCount && (
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <button 
              onClick={() => setLimitCount(prev => prev + 20)}
              className="w-full py-3 bg-white border border-slate-200 rounded-xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <ChevronDown size={14} />
                  Carregar Mais
                </>
              )}
            </button>
          </div>
        )}
      </div>


      <AnimatePresence>
        {selectedTruck && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="bg-orange-500 p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{selectedTruck}</h3>
                  <p className="text-orange-100 text-[10px] font-bold uppercase tracking-widest">Histórico do Veículo</p>
                </div>
                <button 
                  onClick={() => setSelectedTruck(null)}
                  className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
                >
                  <History size={20} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4 border-b border-slate-100">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Abastecido</div>
                  <div className="text-lg font-black text-orange-600">{truckTotalLiters.toFixed(2)} L</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Último KM</div>
                  <div className="text-lg font-black text-slate-800">{truckLastKm.toLocaleString()} KM</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {truckRecords.map(r => (
                  <div key={r.id} className="border-l-4 border-orange-500 pl-4 py-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-black text-slate-700">{format(parseISO(r.timestamp), 'dd/MM/yyyy')} {r.time}</div>
                        <div className="text-[10px] font-bold text-slate-400">{r.driverName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-orange-600">{r.liters}L</div>
                        <div className="text-[9px] font-bold text-slate-400">{r.truckKm.toLocaleString()} KM</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-slate-50">
                <button 
                  onClick={() => setSelectedTruck(null)}
                  className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all"
                >
                  FECHAR
                </button>
              </div>
            </motion.div>
          </div>
        )}

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
