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
  Loader2
} from 'lucide-react';
import { format, parseISO, startOfDay, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { FuelRecord, TruckAlert, AlertStatus, Shift } from '../types';
import { subscribeToRecordsByDate, getRecordsForCurrentWeek, getAllShifts, getRecordsByShift } from '../services/storage';
import { Logo } from './Logo';

export const ReportSummary = () => {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [alerts, setAlerts] = useState<TruckAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchShifts = async () => {
      const allShifts = await getAllShifts(100);
      const dateStr = format(selectedDate, 'dd/MM/yyyy');
      const filteredShifts = allShifts.filter(s => s.date === dateStr);
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
      doc.text(`HODÔMETRO FINAL DA BOMBA: ${finalPump.toLocaleString()}`, 14, 75);
      doc.text(`TOTAL ABASTECIDO NO TURNO: ${totalShiftLiters.toFixed(2)} L`, 14, 82);
      doc.text(`Total de Caminhões Atendidos: ${shiftRecords.length}`, 120, 75);

      // Table
      const tableData = shiftRecords.map(r => [
        r.plate,
        r.time,
        r.truckKm.toLocaleString(),
        r.horimeter?.toFixed(1) || '-',
        `${r.liters.toFixed(2)}L`,
        r.pumpOdometer.toLocaleString(),
        r.driverName
      ]);

      autoTable(doc, {
        startY: 90,
        head: [['PLACA / PREFIXO', 'HORÁRIO', 'KM', 'HORÍMETRO', 'LITROS', 'HODÔM. BOMBA (FINAL)', 'MOTORISTA']],
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
        'Placa / Prefixo': r.plate,
        'Horário': r.time || format(parseISO(r.timestamp), 'HH:mm'),
        'KM': r.truckKm,
        'Horímetro': r.horimeter,
        'Quantidade Abastecida (Litros)': r.liters,
        'Hodômetro Final da Bomba': r.pumpOdometer,
        'Nome do Motorista': r.driverName,
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 p-5 rounded-3xl text-left border border-slate-100">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Geral do Dia</div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-2xl font-black text-orange-600">{totalFuel.toFixed(1)}L</div>
                <div className="text-[10px] font-bold text-slate-400">{totalRecords} abastecimentos</div>
              </div>
              <BarChart3 size={24} className="text-orange-200" />
            </div>
          </div>

          {shifts.map(shift => {
            const shiftRecords = records.filter(r => r.shiftId === shift.id);
            const shiftTotal = shiftRecords.reduce((acc, r) => acc + r.liters, 0);
            const shiftFinalPump = shiftRecords.length > 0 ? shiftRecords[shiftRecords.length - 1].pumpOdometer : shift.initialPumpOdometer;
            
            return (
              <div key={shift.id} className="bg-orange-50/50 p-5 rounded-3xl text-left border border-orange-100">
                <div className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1">Turno: {shift.shiftType}</div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Total Abastecido:</span>
                    <span className="text-lg font-black text-orange-600">{shiftTotal.toFixed(1)}L</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Hodômetro Final:</span>
                    <span className="text-sm font-black text-slate-700">{shiftFinalPump.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button 
              onClick={() => generateShiftPDF('Manhã')}
              disabled={isGenerating !== null}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all active:scale-[0.96]"
            >
              {isGenerating === 'Manhã' ? <Loader2 size={22} className="animate-spin" /> : <FileText size={22} />}
              GERAR PDF - MANHÃ
            </button>

            <button 
              onClick={() => generateShiftPDF('Tarde')}
              disabled={isGenerating !== null}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all active:scale-[0.96]"
            >
              {isGenerating === 'Tarde' ? <Loader2 size={22} className="animate-spin" /> : <FileText size={22} />}
              GERAR PDF - TARDE
            </button>
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
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
          <History size={14} />
          Lançamentos do Dia
        </h3>
        <div className="space-y-4">
          {records.slice().reverse().map(r => (
            <div key={r.id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
              <div>
                <div className="font-black text-slate-700">{r.plate}</div>
                <div className="text-[10px] font-bold text-slate-400">{format(parseISO(r.timestamp), 'HH:mm')} - {r.shiftType}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-orange-600">{r.liters}L</div>
                <div className="text-[10px] font-bold text-slate-500">{r.consumption ? `${r.consumption.toFixed(2)} KM/L` : '-'}</div>
                <div className="text-[10px] font-bold text-slate-400">{(r.truckKm || 0).toLocaleString()} KM</div>
              </div>
            </div>
          ))}
          {records.length === 0 && <p className="text-xs text-slate-300 italic text-center py-4">Nenhum dado para esta data.</p>}
        </div>
      </div>
    </motion.div>
  );
};
