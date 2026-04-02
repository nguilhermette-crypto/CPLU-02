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
  TrendingDown
} from 'lucide-react';
import { format, parseISO, startOfDay, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { FuelRecord, TruckAlert, AlertStatus } from '../types';
import { subscribeToRecordsByDate, getRecordsForCurrentWeek } from '../services/storage';

export const ReportSummary = () => {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [alerts, setAlerts] = useState<TruckAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDemoMode) {
      // Generate demo records for the selected date
      const demoPlates = ['ABC-1234', 'XYZ-5678', 'KJH-9012', 'PLM-3456', 'QWE-7890'];
      const demoRecords: FuelRecord[] = demoPlates.map((plate, idx) => ({
        id: `demo-${idx}`,
        plate,
        driverName: `Motorista Demo ${idx + 1}`,
        shift: idx % 2 === 0 ? 'Manhã' : 'Tarde',
        mileage: 10000 + idx * 500,
        amount: 40 + Math.random() * 20,
        fuelType: 'Diesel S10',
        timestamp: selectedDate.toISOString(),
        consumption: 2.5 + Math.random() * 2,
        userId: 'demo',
        responsibleName: 'Sistema Demo'
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

      // Fetch weekly alerts for real data
      getRecordsForCurrentWeek().then(weeklyRecords => {
        const truckData: Record<string, { plate: string, consumptions: number[], lastConsumption?: number }> = {};
        weeklyRecords.forEach(record => {
          if (!truckData[record.plate]) truckData[record.plate] = { plate: record.plate, consumptions: [] };
          if (record.consumption !== undefined) {
            truckData[record.plate].consumptions.push(record.consumption);
            if (truckData[record.plate].lastConsumption === undefined) truckData[record.plate].lastConsumption = record.consumption;
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
            return { plate: data.plate, currentConsumption: data.lastConsumption!, weeklyAvg, variation, status };
          });
        setAlerts(calculatedAlerts);
      });

      return () => unsubscribe();
    }
  }, [selectedDate, isDemoMode]);

  const totalFuel = records.reduce((acc, r) => acc + r.amount, 0);
  const totalRecords = records.length;
  
  const recordsWithConsumption = records.filter(r => r.consumption !== undefined);
  const avgConsumption = recordsWithConsumption.length > 0 
    ? recordsWithConsumption.reduce((acc, r) => acc + (r.consumption || 0), 0) / recordsWithConsumption.length 
    : 0;

  const generatePDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      const reportDate = format(selectedDate, 'dd/MM/yyyy');
      const generationTime = format(new Date(), 'HH:mm');
      
      doc.setFontSize(22);
      doc.setTextColor(249, 115, 22);
      doc.text('CPLU - Relatório de Abastecimento', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Data do Relatório: ${reportDate}`, 14, 28);
      doc.text(`Gerado em: ${generationTime}`, 14, 33);
      if (isDemoMode) doc.text('MODO DEMONSTRAÇÃO ATIVO', 14, 38);
      
      const shifts = ['Manhã', 'Tarde'] as const;
      let currentY = isDemoMode ? 45 : 40;

      shifts.forEach((shift) => {
        const shiftRecords = records.filter(r => r.shift === shift);
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`TURNO: ${shift.toUpperCase()}`, 14, currentY);
        currentY += 5;
        doc.setDrawColor(200);
        doc.line(14, currentY, 196, currentY);
        currentY += 5;

        if (shiftRecords.length === 0) {
          doc.setFontSize(10);
          doc.setTextColor(150);
          doc.text('Nenhum registro para este turno.', 14, currentY);
          currentY += 15;
        } else {
          const tableData = shiftRecords.map(r => [
            r.plate,
            r.driverName,
            r.driverId || '-',
            r.mileageStart?.toLocaleString() || '-',
            r.mileageEnd?.toLocaleString() || '-',
            r.mileageDiff?.toLocaleString() || '-',
            r.horimeterDiff?.toFixed(1) || '-',
            `${r.amount}L`,
            r.fuelType,
            format(parseISO(r.timestamp), 'HH:mm'),
            r.consumption ? `${r.consumption.toFixed(2)} KM/L` : '-'
          ]);

          autoTable(doc, {
            startY: currentY,
            head: [['Placa', 'Motorista', 'Matr.', 'KM Inic.', 'KM Final', 'Δ KM', 'Δ HR', 'Litros', 'Comb.', 'Hora', 'Consumo']],
            body: tableData,
            headStyles: { fillColor: [249, 115, 22] },
            styles: { fontSize: 6 },
            margin: { left: 10, right: 10 }
          });

          currentY = (doc as any).lastAutoTable.finalY + 10;
          
          const shiftTotalLiters = shiftRecords.reduce((acc, r) => acc + r.amount, 0);
          doc.setFontSize(10);
          doc.setTextColor(0);
          doc.text(`Subtotal do turno ${shift}:`, 14, currentY);
          doc.text(`- Total de abastecimentos: ${shiftRecords.length}`, 14, currentY + 5);
          doc.text(`- Total de litros: ${shiftTotalLiters.toFixed(2)}L`, 14, currentY + 10);
          currentY += 25;
        }

        if (currentY > 250 && shift === 'Manhã') {
          doc.addPage();
          currentY = 20;
        }
      });

      // Alerts Section in PDF
      if (alerts.length > 0) {
        if (currentY > 200) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFontSize(16);
        doc.setTextColor(249, 115, 22);
        doc.text('RESUMO DE ALERTAS DA FROTA', 14, currentY);
        currentY += 10;

        const alertTableData = alerts.map(a => [
          a.plate,
          `${a.currentConsumption.toFixed(2)} KM/L`,
          `${a.weeklyAvg.toFixed(2)} KM/L`,
          `${a.variation > 0 ? '+' : ''}${a.variation.toFixed(1)}%`,
          a.status
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Placa', 'Consumo Atual', 'Média Semanal', 'Variação', 'Status']],
          body: alertTableData,
          headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(249, 115, 22);
      doc.text('RESUMO FINAL', 14, currentY);
      currentY += 10;
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total geral de abastecimentos: ${totalRecords}`, 14, currentY);
      doc.text(`Total geral de litros: ${totalFuel.toFixed(2)}L`, 14, currentY + 7);
      if (avgConsumption > 0) {
        doc.text(`Média de consumo geral: ${avgConsumption.toFixed(2)} KM/L`, 14, currentY + 14);
      }

      doc.save(`relatorio_cplu_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Erro ao gerar o PDF. Por favor, tente novamente.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Main Data
      const mainData = records.map(r => ({
        'Placa': r.plate,
        'Motorista': r.driverName,
        'Matrícula': r.driverId || '',
        'Turno': r.shift,
        'Hodômetro Inicial': r.mileageStart || '',
        'Hodômetro Final': r.mileageEnd || '',
        'Diferença KM': r.mileageDiff || '',
        'Horímetro Inicial': r.horimeterStart || '',
        'Horímetro Final': r.horimeterEnd || '',
        'Diferença HR': r.horimeterDiff || '',
        'Litros': r.amount,
        'Combustível': r.fuelType,
        'Data/Hora': format(parseISO(r.timestamp), 'dd/MM/yyyy HH:mm'),
        'Consumo (KM/L)': r.consumption || ''
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

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 p-5 rounded-3xl text-left">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Litros</div>
            <div className="text-2xl font-black text-orange-600">{totalFuel.toFixed(1)}L</div>
          </div>
          <div className="bg-slate-50 p-5 rounded-3xl text-left">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Registros</div>
            <div className="text-2xl font-black text-slate-800">{totalRecords}</div>
          </div>
        </div>

        {avgConsumption > 0 && (
          <div className="bg-green-50 p-5 rounded-3xl text-left mb-8 border border-green-100">
            <div className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1">Média Consumo Geral</div>
            <div className="text-2xl font-black text-green-700">{avgConsumption.toFixed(2)} KM/L</div>
          </div>
        )}

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
          <button 
            onClick={generatePDF}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all active:scale-[0.96]"
          >
            <FileText size={22} />
            GERAR RELATÓRIO PDF
          </button>
          
          <button 
            onClick={exportExcel}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 transition-all active:scale-[0.96] shadow-xl shadow-slate-100"
          >
            <Download size={22} />
            EXPORTAR EXCEL
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-500" />
            Alertas de Consumo
          </h3>
          <div className="space-y-3">
            {alerts.filter(a => a.status !== 'Normal').map(alert => (
              <div key={alert.plate} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    alert.status === 'Crítico' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    <Truck size={16} />
                  </div>
                  <div>
                    <div className="font-black text-slate-800 text-xs">{alert.plate}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">{alert.status}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-slate-800">{alert.currentConsumption.toFixed(2)} KM/L</div>
                  <div className={`text-[9px] font-black flex items-center gap-1 justify-end ${
                    alert.variation > 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {alert.variation > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(alert.variation).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <div className="text-[10px] font-bold text-slate-400">{format(parseISO(r.timestamp), 'HH:mm')} - {r.shift}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-orange-600">{r.amount}L</div>
                <div className="text-[10px] font-bold text-slate-400">{r.mileage.toLocaleString()} KM</div>
              </div>
            </div>
          ))}
          {records.length === 0 && <p className="text-xs text-slate-300 italic text-center py-4">Nenhum dado para esta data.</p>}
        </div>
      </div>
    </motion.div>
  );
};
