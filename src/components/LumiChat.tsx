import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageCircle, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  text: string;
  sender: 'lumi' | 'user';
  timestamp: Date;
}

// Initial placeholder, will be updated by the generation logic if needed or kept as a fallback
const DEFAULT_LUMI_AVATAR = "https://images.unsplash.com/photo-1624561172888-ac93c696e10c?q=80&w=1000&auto=format&fit=crop";

const QUICK_OPTIONS = [
  { id: 'cancelled', label: 'Por que foi cancelada?', response: 'Um registro pode ser cancelado se o KM atual for menor que o anterior ou se o consumo estiver muito fora da média e você optar por não confirmar.' },
  { id: 'error', label: 'Erro no abastecimento', response: 'Verifique KM, litros e placa. O sistema bloqueia se o KM atual for menor que o último registrado.' },
  { id: 'pdf', label: 'Gerar PDF', response: "Vá até a tela de relatório e clique em 'Gerar PDF'." },
  { id: 'critical', label: 'Caminhão crítico ou normal', response: 'Um caminhão é crítico quando o consumo está fora da média semanal.' },
  { id: 'consumption', label: 'Consumo', response: 'O cálculo é feito com base no KM rodado dividido pelos litros abastecidos.' },
];

export const LumiChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const [lumiAvatar, setLumiAvatar] = useState(DEFAULT_LUMI_AVATAR);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const generateAvatar = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        const prompt = `Digital female character, 2D clean illustration style, professional and friendly. 
        Features: brown hair, friendly expression with a slight smile, large friendly eyes, wearing a professional headset. 
        Clothing: Urban cleaning uniform with a bright orange reflective vest. 
        Colors: Predominant orange and secondary white. NO BLUE. 
        Details: The text "CPLU" written in white on the vest or uniform. 
        Background: Simple, clean, neutral.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1"
            }
          }
        });

        if (isMounted && response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              setLumiAvatar(`data:image/png;base64,${part.inlineData.data}`);
              break;
            }
          }
        }
      } catch (error) {
        console.error("Failed to generate custom avatar:", error);
      }
    };

    generateAvatar();
    return () => { isMounted = false; };
  }, []);

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

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    setShowOptions(false);
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setInputValue('');

    const delay = 2000 + Math.random() * 1000;

    setTimeout(() => {
      let response = 'Ainda estou aprendendo sobre isso. Pode tentar uma das opções rápidas?';
      
      const lowerText = text.toLowerCase();
      if (lowerText.includes('cancel') || lowerText.includes('rejeit')) {
        response = 'Um registro pode ser cancelado se o KM atual for menor que o anterior ou se o consumo estiver muito fora da média e você optar por não confirmar.';
      } else if (lowerText.includes('erro') || lowerText.includes('problema')) {
        response = 'Verifique KM, litros e placa. O sistema bloqueia se o KM atual for menor que o último registrado.';
      } else if (lowerText.includes('pdf') || lowerText.includes('relat')) {
        response = "Vá até a tela de relatório e clique em 'Gerar PDF'.";
      } else if (lowerText.includes('consumo')) {
        response = 'O cálculo é feito com base no KM rodado dividido pelos litros abastecidos.';
      }

      const lumiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'lumi',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, lumiMessage]);
      setIsTyping(false);
      setTimeout(() => setShowOptions(true), 500);
    }, delay);
  };

  const handleOptionClick = (option: typeof QUICK_OPTIONS[0]) => {
    handleSendMessage(option.label);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-xl shadow-orange-200 overflow-hidden border-2 border-white active:scale-90 transition-all hover:scale-110 bg-white"
      >
        <img 
          src={lumiAvatar} 
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
            className="fixed bottom-40 right-4 z-50 w-[320px] max-w-[calc(100vw-32px)] h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="bg-white border-b border-slate-50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-orange-50">
                  <img 
                    src={lumiAvatar} 
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
                      <img src={lumiAvatar} alt="L" className="w-full h-full object-cover" />
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
                    <img src={lumiAvatar} alt="L" className="w-full h-full object-cover" />
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

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-50 space-y-3">
              <AnimatePresence>
                {showOptions && !isTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex flex-wrap gap-2 mb-2"
                  >
                    {QUICK_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionClick(option)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-600 text-[10px] font-bold rounded-lg border border-slate-100 hover:border-orange-200 transition-all active:scale-[0.98]"
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                  placeholder="Digite sua dúvida..."
                  className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
                <button 
                  onClick={() => handleSendMessage(inputValue)}
                  className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-100"
                >
                  <Sparkles size={18} />
                </button>
              </div>

              {isTyping && (
                <div className="text-center">
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
