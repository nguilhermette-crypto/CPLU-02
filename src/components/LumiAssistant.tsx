import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Sparkles, AlertTriangle, Fuel, Activity } from 'lucide-react';
import { Shift } from '../types';

interface LumiAssistantProps {
  activeShift: Shift | null;
}

export const LumiAssistant = ({ activeShift }: LumiAssistantProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [tip, setTip] = useState<string | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    const generateTip = () => {
      if (!activeShift) {
        setTip("Olá! Lembre-se de iniciar o turno para começar os abastecimentos. 🚛");
      } else if (activeShift.remainingLiters < 500) {
        setTip("Atenção! O nível de combustível na bomba está baixo. Verifique o estoque! 🛢️");
      } else {
        const tips = [
          "Sempre confira o KM do caminhão antes de salvar!",
          "O horímetro é essencial para o controle de manutenção.",
          "Mantenha o hodômetro da bomba sempre atualizado.",
          "Verifique o consumo médio para identificar anomalias.",
          "Bom trabalho! A frota agradece o cuidado. ✨"
        ];
        setTip(tips[Math.floor(Math.random() * tips.length)]);
      }
    };

    generateTip();
    const tipInterval = setInterval(generateTip, 15000);
    return () => clearInterval(tipInterval);
  }, [activeShift]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {tip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="bg-white p-4 rounded-[24px] rounded-br-none shadow-xl border border-orange-100 max-w-[200px] pointer-events-auto relative"
          >
            <button 
              onClick={() => setTip(null)}
              className="absolute -top-2 -right-2 bg-slate-100 text-slate-400 p-1 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X size={10} />
            </button>
            <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
              {tip}
            </p>
            <div className="absolute -bottom-2 right-0 w-4 h-4 bg-white border-r border-b border-orange-100 transform rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative group pointer-events-auto cursor-pointer"
        onClick={() => setIsVisible(false)}
        title="Clique para ocultar a Lumi"
      >
        {/* Lumi character SVG */}
        <svg width="80" height="100" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
          {/* Body/Suit */}
          <rect x="25" y="45" width="30" height="40" rx="8" fill="white" />
          <rect x="25" y="45" width="30" height="40" rx="8" stroke="#F97316" strokeWidth="2" />
          
          {/* Safety Vest */}
          <path d="M25 55C25 50 30 45 40 45C50 45 55 50 55 55V75H25V55Z" fill="#F97316" />
          <rect x="30" y="55" width="20" height="2" fill="white" opacity="0.5" />
          <rect x="30" y="65" width="20" height="2" fill="white" opacity="0.5" />
          
          {/* Arms */}
          <rect x="18" y="50" width="8" height="25" rx="4" fill="white" stroke="#F97316" strokeWidth="1.5" />
          <rect x="54" y="50" width="8" height="25" rx="4" fill="white" stroke="#F97316" strokeWidth="1.5" />
          
          {/* Gloves */}
          <rect x="18" y="70" width="8" height="10" rx="2" fill="#F97316" />
          <rect x="54" y="70" width="8" height="10" rx="2" fill="#F97316" />
          
          {/* Legs */}
          <rect x="28" y="80" width="10" height="15" rx="2" fill="white" stroke="#F97316" strokeWidth="1.5" />
          <rect x="42" y="80" width="10" height="15" rx="2" fill="white" stroke="#F97316" strokeWidth="1.5" />
          
          {/* Boots */}
          <rect x="26" y="90" width="12" height="8" rx="2" fill="#F97316" />
          <rect x="42" y="90" width="12" height="8" rx="2" fill="#F97316" />
          
          {/* Head */}
          <circle cx="40" cy="30" r="18" fill="white" stroke="#F97316" strokeWidth="2" />
          
          {/* Face */}
          <circle cx="33" cy="28" r="2" fill="#F97316" />
          <circle cx="47" cy="28" r="2" fill="#F97316" />
          
          {/* Blinking eyes */}
          {isBlinking && (
            <>
              <rect x="31" y="27" width="4" height="2" fill="white" />
              <rect x="45" y="27" width="4" height="2" fill="white" />
            </>
          )}
          
          {/* Smile */}
          <path d="M35 35C35 35 37 38 40 38C43 38 45 35 45 35" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
          
          {/* Helmet */}
          <path d="M22 25C22 15 30 8 40 8C50 8 58 15 58 25H22Z" fill="#F97316" />
          <rect x="38" y="5" width="4" height="10" rx="2" fill="#F97316" />
          
          {/* Logo on Helmet */}
          <text x="40" y="20" fontSize="6" fontWeight="black" fill="white" textAnchor="middle">CPLU</text>
        </svg>

        {/* Floating effect */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="absolute -top-2 -right-2"
        >
          <Sparkles size={16} className="text-orange-400 opacity-50" />
        </motion.div>
      </motion.div>
    </div>
  );
};
