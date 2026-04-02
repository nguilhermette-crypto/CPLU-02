import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageCircle, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'lumi' | 'user';
  timestamp: Date;
}

const LUMI_AVATAR = "https://storage.googleapis.com/firebasestorage.v0.appspot.com/o/6xwb2knq3vqouvvxuy36n3%2F7f938090-410e-4361-912b-36656730076a?alt=media&token=7f938090-410e-4361-912b-36656730076a";

const QUICK_OPTIONS = [
  { id: 'error', label: 'Erro no abastecimento', response: 'Verifique KM, litros e placa. Confirme se os dados estão corretos.' },
  { id: 'pdf', label: 'Gerar PDF', response: "Vá até a tela de relatório e clique em 'Gerar PDF'." },
  { id: 'critical', label: 'Caminhão crítico ou normal', response: 'Um caminhão é crítico quando o consumo está fora da média semanal.' },
  { id: 'consumption', label: 'Consumo', response: 'O cálculo é feito com base no KM rodado dividido pelos litros abastecidos.' },
  { id: 'others', label: 'Outras dúvidas', response: 'Em breve terei mais respostas inteligentes para te ajudar.' },
];

export const LumiChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([
          {
            id: '1',
            text: 'Olá! Como posso te ajudar?',
            sender: 'lumi',
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
        setShowOptions(true);
      }, 1000);
    }
  }, [isOpen, messages.length]);

  const handleOptionClick = (option: typeof QUICK_OPTIONS[0]) => {
    setShowOptions(false);
    const userMessage: Message = {
      id: Date.now().toString(),
      text: option.label,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Typing delay between 2 and 3 seconds
    const delay = 2000 + Math.random() * 1000;

    setTimeout(() => {
      const lumiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: option.response,
        sender: 'lumi',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, lumiMessage]);
      setIsTyping(false);
      
      // Show options again after a small delay
      setTimeout(() => setShowOptions(true), 500);
    }, delay);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-xl shadow-orange-200 overflow-hidden border-2 border-white active:scale-90 transition-all hover:scale-110 bg-white"
      >
        <img 
          src={LUMI_AVATAR} 
          alt="Lumi" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-40 right-4 z-50 w-[320px] max-w-[calc(100vw-32px)] h-[450px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="bg-white border-b border-slate-50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-50">
                  <img 
                    src={LUMI_AVATAR} 
                    alt="Lumi" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="text-slate-800 font-black text-xs leading-none">Lumi CPLU</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'lumi' ? 'justify-start' : 'justify-end'}`}>
                  {msg.sender === 'lumi' && (
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mb-1">
                      <img src={LUMI_AVATAR} alt="L" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium shadow-sm ${
                      msg.sender === 'lumi'
                        ? 'bg-orange-500 text-white rounded-bl-none'
                        : 'bg-white text-slate-700 rounded-br-none border border-slate-100'
                    }`}
                  >
                    {msg.text}
                  </motion.div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-end gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 mb-1">
                    <img src={LUMI_AVATAR} alt="L" className="w-full h-full object-cover" />
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-orange-500 text-white p-3 rounded-2xl rounded-bl-none flex gap-1"
                  >
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-white rounded-full" />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-white rounded-full" />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-white rounded-full" />
                  </motion.div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Options Area */}
            <div className="p-4 bg-white border-t border-slate-50">
              <AnimatePresence>
                {showOptions && !isTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex flex-col gap-2"
                  >
                    {QUICK_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionClick(option)}
                        className="w-full text-left px-4 py-2.5 bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-600 text-[11px] font-bold rounded-xl border border-slate-100 hover:border-orange-200 transition-all active:scale-[0.98]"
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!showOptions && isTyping && (
                <div className="py-2 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 animate-pulse">
                    Lumi está digitando...
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
