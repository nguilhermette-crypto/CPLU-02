import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageCircle, Sparkles, Send, HelpCircle, Info } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  text: string;
  sender: 'lumi' | 'user';
  timestamp: Date;
}

// Improved default avatar using a more modern style
const DEFAULT_LUMI_AVATAR = "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Lumi&backgroundColor=f97316&eyes=eyes10&mouth=smile01";

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
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return;

        const ai = new GoogleGenAI({ apiKey });
        // Refined prompt for a "cooler" look - modern 3D-style 2D illustration
        const prompt = `High-quality digital character portrait of a friendly female assistant named Lumi. 
        Style: Modern 3D-style 2D vector illustration, clean lines, vibrant colors, professional but approachable. 
        Features: Brown hair styled professionally, warm friendly smile, large expressive eyes, wearing a sleek modern headset. 
        Clothing: Urban cleaning worker uniform, bright orange high-visibility reflective vest over a white shirt. 
        Details: Small white "CPLU" logo on the vest. 
        Lighting: Soft studio lighting, clean neutral light grey background. 
        Colors: Predominant vibrant orange and secondary clean white. NO BLUE. 
        Mood: Helpful, intelligent, and energetic.`;

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
          const parts = response.candidates[0].content.parts;
          for (const part of parts) {
            if (part.inlineData) {
              setLumiAvatar(`data:image/png;base64,${part.inlineData.data}`);
              break;
            }
          }
        }
      } catch (error) {
        console.error("Failed to generate custom avatar:", error);
        // Fallback to a nice dicebear avatar if generation fails
        if (isMounted) {
          setLumiAvatar(DEFAULT_LUMI_AVATAR);
        }
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
            text: 'Olá! Sou a Lumi, sua assistente CPLU. Como posso facilitar seu trabalho hoje? 🚛✨',
            sender: 'lumi',
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
        setShowOptions(true);
      }, 1200);
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

    const delay = 1500 + Math.random() * 1000;

    setTimeout(() => {
      let response = 'Entendi! Ainda estou aprendendo sobre alguns detalhes, mas posso te ajudar com as dúvidas mais comuns. O que acha de usar um dos botões abaixo?';
      
      const lowerText = text.toLowerCase();
      if (lowerText.includes('cancel') || lowerText.includes('rejeit')) {
        response = 'Um registro pode ser cancelado se o KM atual for menor que o anterior ou se o consumo estiver muito fora da média e você optar por não confirmar. Segurança em primeiro lugar! 🛡️';
      } else if (lowerText.includes('erro') || lowerText.includes('problema')) {
        response = 'Ops! Verifique se a placa, o KM e os litros estão corretos. O sistema bloqueia automaticamente se o KM atual for menor que o último registrado para evitar erros. 🛑';
      } else if (lowerText.includes('pdf') || lowerText.includes('relat')) {
        response = "Claro! Para gerar o relatório, vá até a aba 'Relatórios' no menu inferior e clique no botão laranja 'GERAR RELATÓRIO PDF'. Fácil, né? 📄✅";
      } else if (lowerText.includes('consumo')) {
        response = 'O cálculo do consumo é simples: pegamos os KM rodados e dividimos pelos litros abastecidos. Assim sabemos se o caminhão está operando com eficiência! ⛽📊';
      } else if (lowerText.includes('oi') || lowerText.includes('ola') || lowerText.includes('olá')) {
        response = 'Oi! Tudo bem por aí? Estou aqui para ajudar com qualquer dúvida sobre o sistema CPLU. 😊';
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
        className="fixed bottom-28 right-4 z-[100] w-16 h-16 rounded-full shadow-2xl shadow-orange-300/40 overflow-hidden border-4 border-white active:scale-90 transition-all hover:scale-110 bg-white group"
      >
        <div className="absolute inset-0 bg-orange-500 opacity-0 group-hover:opacity-10 transition-opacity" />
        <img 
          src={lumiAvatar} 
          alt="Lumi" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = DEFAULT_LUMI_AVATAR;
          }}
        />
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center animate-bounce">
            <Sparkles size={10} className="text-white" />
          </div>
        )}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className="fixed bottom-48 right-4 z-[100] w-[350px] max-w-[calc(100vw-32px)] h-[550px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white/20 backdrop-blur-sm border border-white/30 p-0.5">
                  <img 
                    src={lumiAvatar} 
                    alt="Lumi" 
                    className="w-full h-full object-cover rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm tracking-tight">Lumi CPLU</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                    <span className="text-orange-100 text-[10px] font-black uppercase tracking-widest">Sempre Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-2.5 ${msg.sender === 'lumi' ? 'justify-start' : 'justify-end'}`}>
                  {msg.sender === 'lumi' && (
                    <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mt-1 shadow-sm border border-slate-100">
                      <img src={lumiAvatar} alt="L" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`max-w-[85%] p-4 rounded-[24px] text-[13px] leading-relaxed font-bold shadow-sm ${
                      msg.sender === 'lumi'
                        ? 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                        : 'bg-orange-500 text-white rounded-tr-none shadow-orange-100'
                    }`}
                  >
                    {msg.text}
                  </motion.div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-start gap-2.5 justify-start">
                  <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mt-1 shadow-sm border border-slate-100">
                    <img src={lumiAvatar} alt="L" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-100 p-4 rounded-[24px] rounded-tl-none flex gap-1.5"
                  >
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-1.5 bg-orange-500/40 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1.5 h-1.5 bg-orange-500/40 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1.5 h-1.5 bg-orange-500/40 rounded-full" />
                  </motion.div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-5 bg-white border-t border-slate-100 space-y-4">
              <AnimatePresence>
                {showOptions && !isTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex flex-wrap gap-2"
                  >
                    {QUICK_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionClick(option)}
                        className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 text-[11px] font-black rounded-full border border-orange-100 transition-all active:scale-[0.95] flex items-center gap-1.5"
                      >
                        <HelpCircle size={12} />
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                    placeholder="Como posso ajudar?"
                    className="w-full bg-slate-50 border-2 border-transparent rounded-[20px] px-5 py-3.5 text-sm font-bold text-slate-700 focus:bg-white focus:border-orange-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
                <button 
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim()}
                  className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center hover:bg-orange-600 active:scale-90 transition-all shadow-xl shadow-orange-200 disabled:opacity-50 disabled:shadow-none"
                >
                  <Send size={20} />
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 opacity-40">
                <Info size={10} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Lumi Assistente Virtual CPLU
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
