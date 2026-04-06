import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3,
  FileText,
  History,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Play,
  AlertTriangle,
  Truck,
  TrendingUp,
  TrendingDown,
  Loader2,
  Pencil,
  X,
  Save,
  Filter
} from 'lucide-react';
import { format, parseISO, startOfDay, addDays, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { FuelRecord, TruckAlert, AlertStatus, Shift } from '../types';
import { subscribeToRecordsByDate, getRecordsForCurrentWeek, getAllShifts, getRecordsByShift, getShiftsByDate, updateRecord, subscribeToActiveShift } from '../services/storage';
import { Logo } from './Logo';

export const ReportSummary = () => {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [alerts, setAlerts] = useState<TruckAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null);
  const [filterType, setFilterType] = useState<'Todos' | 'Manhã' | 'Tarde'>('Todos');
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToActiveShift(setActiveShift);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Set default filter based on current shift if it's today
    if (isSameDay(selectedDate, new Date())) {
      const hour = new Date().getHours();
      setFilterType(hour >= 12 ? 'Tarde' : 'Manhã');
    } else {
      setFilterType('Todos');
    }
  }, [selectedDate]);

  useEffect(() => {
    const fetchShifts = async () => {
      const dateStr = format(selectedDate, 'dd/MM/yyyy');
      const filteredShifts = await getShiftsByDate(dateStr);
      setShifts(filteredShifts);
    };
    fetchShifts();
  }, [selectedDate]);

  useEffect(() => {
    if (isDemoMode) {
      // Generate demo records for the selected date
      const demoPlates = ['ABC-1234', 'XYZ-5678', 'KJH-9012', 'PLM-3456', 'QWE-7890'];
      const demoRecords: FuelRecord[] = demoPlates.map((plate, idx) => ({
        id: `demo-${idx}`,
        plate,
        driverName: `Motorista Demo ${idx + 1}`,
        time: idx % 2 === 0 ? '08:30' : '14:45',
        truckKm: 10000 + idx * 500,
        horimeter: 1200.5 + idx * 10,
        liters: 40 + Math.random() * 20,
        pumpOdometer: 50000 + idx * 100,
        timestamp: selectedDate.toISOString(),
        userId: 'demo',
        shiftId: 'demo-shift',
        shiftType: idx % 2 === 0 ? 'Manhã' : 'Tarde'
      }));
      setRecords(demoRecords);

      // Generate demo alerts
      const demoAlerts: TruckAlert[] = demoPlates.map(plate => {
        const baseAvg = 3.0;
        const current = 2.5 + Math.random() * 1.5;
        const variation = ((current - baseAvg) / baseAvg) * 100;
        const absVariation = Math.abs(variation);
        let status: AlertStatus = 'Normal';
        if (absVariation > 30) status = 'Crítico';
        else if (absVariation > 15) status = 'Atenção';
        return { plate, currentConsumption: current, weeklyAvg: baseAvg, variation, status };
      });
      setAlerts(demoAlerts);
    } else {
      const unsubscribe = subscribeToRecordsByDate(selectedDate, (newRecords) => {
        setRecords([...newRecords].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
      });

      // Fetch weekly records for real data
      getRecordsForCurrentWeek().then(weeklyRecords => {
        // Just for logging or future use, not displaying alerts here anymore
      });

      return () => unsubscribe();
    }
  }, [selectedDate, isDemoMode]);

  const totalFuel = records.reduce((acc, r) => acc + (r.liters || 0), 0);
  const totalRecords = records.length;

  const generateShiftPDF = async (shiftType: 'Manhã' | 'Tarde') => {
    const shift = shifts.find(s => s.shiftType === shiftType);
    if (!shift) {
      setError(`Nenhum turno de ${shiftType} encontrado para esta data.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsGenerating(shiftType);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const shiftRecords = await getRecordsByShift(shift.id);
      const doc = new jsPDF();
      
      // Header with Logo
      doc.setFillColor(249, 115, 22); // Orange
      doc.rect(0, 0, 210, 50, 'F');
      
      // Draw Logo Circle in PDF
      doc.setFillColor(255, 255, 255);
      doc.circle(30, 25, 15, 'F');
      doc.setTextColor(249, 115, 22);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('cplu', 30, 27, { align: 'center' });
      
      // Green Curve below logo in PDF
      doc.setFillColor(34, 197, 94);
      doc.ellipse(30, 38, 18, 5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('CPLU', 60, 22);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ABASTECIMENTO INTERNO', 60, 30);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Consórcio Paulista de Limpeza Urbana', 60, 36);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`TURNO: ${shift.shiftType.toUpperCase()}`, 140, 22);
      doc.text(`DATA: ${shift.date}`, 140, 29);

      // Summary Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO DO TURNO', 14, 65);
      
      const finalPump = shiftRecords.length > 0 ? shiftRecords[shiftRecords.length - 1].pumpOdometer : shift.initialPumpOdometer;
      const totalShiftLiters = shiftRecords.reduce((acc, r) => acc + r.liters, 0);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`HODÔMETRO INICIAL DA BOMBA: ${shift.initialPumpOdometer.toLocaleString()}`, 14, 75);
      doc.text(`HODÔMETRO FINAL DA BOMBA: ${finalPump.toLocaleString()}`, 14, 82);
      doc.text(`QUANTIDADE DE LITROS INICIAL DA BOMBA: ${shift.initialLiters.toLocaleString()} L`, 14, 89);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL DE LITROS ABASTECIDOS NO TURNO: ${totalShiftLiters.toFixed(2)} L`, 14, 96);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Caminhões Atendidos: ${shiftRecords.length}`, 120, 75);

      // Table
      const tableData = shiftRecords.map(r => [
        r.plate,
        r.driverName,
        r.truckKm.toLocaleString(),
        r.horimeter?.toFixed(1) || '-',
        `${r.liters.toFixed(2)}L`,
        r.pumpOdometer.toLocaleString(),
        r.consumption && r.consumption > 0 ? `${r.consumption.toFixed(2)}` : '--'
      ]);

      autoTable(doc, {
        startY: 105,
        head: [['PLACA', 'MOTORISTA', 'KM', 'HORÍMETRO', 'LITROS', 'HODÔMETRO FINAL', 'CONS. (km/l)']],
        body: tableData,
        headStyles: { 
          fillColor: [249, 115, 22],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 9,
          halign: 'center',
          textColor: [50, 50, 50]
        },
        alternateRowStyles: {
          fillColor: [252, 252, 252]
        },
        margin: { top: 50 }
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - CPLU Sistema de Gestão de Frota`, 105, 285, { align: 'center' });
      }

      doc.save(`CPLU_Relatorio_${shift.shiftType}_${shift.date.replace(/\//g, '-')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Erro ao gerar o PDF do turno.');
    } finally {
      setIsGenerating(null);
    }
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Main Data
      const mainData = records.map(r => ({
        'Placa': r.plate,
        'Motorista': r.driverName,
        'Hora': r.time || format(parseISO(r.timestamp), 'HH:mm'),
        'KM': r.truckKm,
        'Horímetro': r.horimeter,
        'Litros': r.liters,
        'Consumo (km/l)': r.consumption && r.consumption > 0 ? r.consumption.toFixed(2) : '--',
        'Hodômetro Final da Bomba': r.pumpOdometer,
        'Data': format(parseISO(r.timestamp), 'dd/MM/yyyy'),
        'Turno': r.shiftType
      }));

      // Alerts Data
      const alertsData = alerts.map(a => ({
        'Placa': a.plate,
        'Consumo Atual': a.currentConsumption,
        'Média Semanal': a.weeklyAvg,
        'Variação (%)': a.variation,
        'Status': a.status
      }));

      const wb = XLSX.utils.book_new();
      const wsMain = XLSX.utils.json_to_sheet(mainData);
      const wsAlerts = XLSX.utils.json_to_sheet(alertsData);

      XLSX.utils.book_append_sheet(wb, wsMain, 'Abastecimentos');
      XLSX.utils.book_append_sheet(wb, wsAlerts, 'Alertas');

      XLSX.writeFile(wb, `relatorio_cplu_${format(selectedDate, 'yyyy-MM-dd')}.xlsx`);
    } catch (err) {
      console.error('Error exporting Excel:', err);
      setError('Erro ao exportar Excel.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? parseISO(e.target.value) : new Date();
    setSelectedDate(startOfDay(date));
  };

  const nextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const prevDay = () => setSelectedDate(prev => subDays(prev, 1));

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      const updates = {
        truckKm: Number(editingRecord.truckKm),
        horimeter: Number(editingRecord.horimeter),
        liters: Number(editingRecord.liters),
        pumpOdometer: Number(editingRecord.pumpOdometer),
        driverName: editingRecord.driverName
      };

      await updateRecord(editingRecord.id, updates, activeShift || undefined);
      setEditingRecord(null);
    } catch (err) {
      console.error('Error updating record:', err);
      setError('Erro ao atualizar o registro.');
    }
  };

  const filteredRecords = records.filter(r => {
    if (filterType === 'Todos') return true;
    return r.shiftType === filterType;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 text-center">
        <div className="flex justify-end mb-4">
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

        <div className="w-20 h-20 bg-orange-50 rounded-[32px] flex items-center justify-center text-orange-500 mx-auto mb-6">
          <BarChart3 size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Relatório Diário</h2>
        <p className="text-slate-400 text-sm font-medium mb-6">
          Exibindo dados de: <span className="text-orange-500 font-black">{format(selectedDate, 'dd/MM/yyyy')}</span>
        </p>
        
        {/* Date Selector */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Selecionar Data</label>
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={prevDay}
              className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-all active:scale-90"
              title="Dia Anterior"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => dateInputRef.current?.showPicker()}
                className="bg-orange-500 text-white px-8 py-4 rounded-[24px] flex items-center gap-3 shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all group active:scale-95"
              >
                <Calendar size={20} className="group-hover:scale-110 transition-transform" />
                <span className="font-black uppercase tracking-tight text-sm">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </span>
              </button>
              <input 
                ref={dateInputRef}
                type="date" 
                className="absolute inset-0 opacity-0 pointer-events-none"
                onChange={handleDateChange}
                value={format(selectedDate, 'yyyy-MM-dd')}
              />
            </div>

            <button 
              onClick={nextDay}
              className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-all active:scale-90"
              title="Próximo Dia"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-100 flex items-center gap-2"
            >
              <AlertTriangle size={16} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowShiftModal(true)}
              disabled={isGenerating !== null}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all active:scale-[0.96]"
            >
              {isGenerating !== null ? <Loader2 size={22} className="animate-spin" /> : <FileText size={22} />}
              GERAR PDF
            </button>

            <AnimatePresence>
              {showShiftModal && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowShiftModal(false)}
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white p-8 rounded-[32px] shadow-2xl z-[70] border border-slate-100"
                  >
                    <h3 className="text-xl font-black text-slate-800 mb-6 text-center">Selecione o Turno</h3>
                    <div className="space-y-3">
                      <button 
                        onClick={() => {
                          generateShiftPDF('Manhã');
                          setShowShiftModal(false);
                        }}
                        className="w-full bg-slate-50 hover:bg-orange-500 hover:text-white text-slate-700 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 group"
                      >
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-500 group-hover:bg-orange-400 group-hover:text-white transition-colors">
                          <Play size={18} />
                        </div>
                        TURNO MANHÃ
                      </button>
                      <button 
                        onClick={() => {
                          generateShiftPDF('Tarde');
                          setShowShiftModal(false);
                        }}
                        className="w-full bg-slate-50 hover:bg-orange-500 hover:text-white text-slate-700 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 group"
                      >
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-500 group-hover:bg-orange-400 group-hover:text-white transition-colors">
                          <Play size={18} />
                        </div>
                        TURNO TARDE
                      </button>
                    </div>
                    <button 
                      onClick={() => setShowShiftModal(false)}
                      className="w-full mt-6 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                      Cancelar
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={exportExcel}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 transition-all active:scale-[0.96] shadow-xl shadow-slate-100"
          >
            <Download size={22} />
            EXPORTAR EXCEL PARA AUDITORIA
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <History size={14} />
            Lançamentos do Dia
          </h3>
          <div className="flex bg-slate-50 p-1 rounded-xl">
            {(['Todos', 'Manhã', 'Tarde'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterType === type 
                    ? 'bg-white text-orange-500 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredRecords.slice().reverse().map(r => (
            <div key={r.id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0 group">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setEditingRecord(r)}
                  className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Pencil size={14} />
                </button>
                <div>
                  <div className="font-black text-slate-700">{r.plate}</div>
                  <div className="text-[10px] font-bold text-slate-400">{format(parseISO(r.timestamp), 'HH:mm')} - {r.shiftType}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-orange-600">{r.liters}L</div>
                <div className="text-[10px] font-bold text-slate-500">{r.consumption && r.consumption > 0 ? `${r.consumption.toFixed(2)} KM/L` : '--'}</div>
                <div className="text-[10px] font-bold text-slate-400">{(r.truckKm || 0).toLocaleString()} KM</div>
              </div>
            </div>
          ))}
          {filteredRecords.length === 0 && <p className="text-xs text-slate-300 italic text-center py-4">Nenhum dado para este filtro.</p>}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingRecord && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingRecord(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-white p-8 rounded-[32px] shadow-2xl z-[110] border border-slate-100 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">Editar Registro</h3>
                <button onClick={() => setEditingRecord(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateRecord} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Placa (Não editável)</label>
                    <input 
                      type="text"
                      value={editingRecord.plate}
                      disabled
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-400 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">KM Atual</label>
                    <input 
                      type="number"
                      value={editingRecord.truckKm}
                      onChange={(e) => setEditingRecord({...editingRecord, truckKm: Number(e.target.value)})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Horímetro</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={editingRecord.horimeter}
                      onChange={(e) => setEditingRecord({...editingRecord, horimeter: Number(e.target.value)})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Litros</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editingRecord.liters}
                      onChange={(e) => setEditingRecord({...editingRecord, liters: Number(e.target.value)})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Bomba Final</label>
                    <input 
                      type="number"
                      value={editingRecord.pumpOdometer}
                      onChange={(e) => setEditingRecord({...editingRecord, pumpOdometer: Number(e.target.value)})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Motorista</label>
                    <input 
                      type="text"
                      value={editingRecord.driverName}
                      onChange={(e) => setEditingRecord({...editingRecord, driverName: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all active:scale-[0.96] mt-4"
                >
                  <Save size={22} />
                  SALVAR ALTERAÇÕES
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
