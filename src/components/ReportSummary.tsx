import React, { useState, useEffect } from 'react';
import { 
  BarChart3,
  FileText,
  Printer,
  History
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import { FuelRecord } from '../types';
import { subscribeToRecords } from '../services/storage';

export const ReportSummary = () => {
  const [records, setRecords] = useState<FuelRecord[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToRecords((newRecords) => {
      setRecords([...newRecords].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    });
    return () => unsubscribe();
  }, []);

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
      const reportDate = format(new Date(), 'dd/MM/yyyy HH:mm');
      
      doc.setFontSize(22);
      doc.setTextColor(249, 115, 22);
      doc.text('CPLU - Relatório de Abastecimento', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Data do Relatório: ${reportDate}`, 14, 28);
      
      const shifts = ['Manhã', 'Tarde'] as const;
      let currentY = 35;

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
            r.mileage.toLocaleString(),
            `${r.amount}L`,
            r.fuelType,
            format(parseISO(r.timestamp), 'dd/MM/yyyy HH:mm'),
            r.consumption ? `${r.consumption.toFixed(2)} KM/L` : '-'
          ]);

          autoTable(doc, {
            startY: currentY,
            head: [['Placa', 'Motorista', 'Matr.', 'KM', 'Litros', 'Comb.', 'Data/Hora', 'Consumo']],
            body: tableData,
            headStyles: { fillColor: [249, 115, 22] },
            styles: { fontSize: 7 },
            margin: { left: 14, right: 14 }
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

      doc.save(`relatorio_cplu_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar o PDF. Por favor, tente novamente.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 text-center">
        <div className="w-20 h-20 bg-orange-50 rounded-[32px] flex items-center justify-center text-orange-500 mx-auto mb-6">
          <BarChart3 size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Relatório Consolidado</h2>
        <p className="text-slate-400 text-sm font-medium mb-8">Resumo de todas as atividades da frota CPLU.</p>
        
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

        <div className="flex flex-col gap-3">
          <button 
            onClick={generatePDF}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all active:scale-[0.96]"
          >
            <FileText size={22} />
            GERAR RELATÓRIO PDF
          </button>
          
          <button 
            onClick={handlePrint}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-5 rounded-[24px] flex items-center justify-center gap-3 transition-all active:scale-[0.96]"
          >
            <Printer size={22} />
            IMPRIMIR
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
          <History size={14} />
          Últimos Lançamentos
        </h3>
        <div className="space-y-4">
          {records.slice(-5).reverse().map(r => (
            <div key={r.id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
              <div>
                <div className="font-black text-slate-700">{r.plate}</div>
                <div className="text-[10px] font-bold text-slate-400">{format(parseISO(r.timestamp), 'dd/MM HH:mm')}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-orange-600">{r.amount}L</div>
                <div className="text-[10px] font-bold text-slate-400">{r.mileage.toLocaleString()} KM</div>
              </div>
            </div>
          ))}
          {records.length === 0 && <p className="text-xs text-slate-300 italic text-center py-4">Nenhum dado disponível.</p>}
        </div>
      </div>
    </motion.div>
  );
};
