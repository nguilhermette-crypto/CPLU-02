import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageCircle, Sparkles, Send, HelpCircle, Info, MessageSquare } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  text: string;
  sender: 'lumi' | 'user';
  timestamp: Date;
}

const QUICK_OPTIONS = [
  { id: 'error', label: 'Erro no abastecimento', response: 'Verifique se o KM atual é maior que o anterior e se todos os campos obrigatórios estão preenchidos. O sistema bloqueia valores inconsistentes para sua segurança! 🛑' },
  { id: 'pdf', label: 'Gerar PDF', response: 'Para gerar o relatório, vá na aba "Relatórios" e clique no botão "GERAR RELATÓRIO PDF". O arquivo será baixado automaticamente. 📄' },
  { id: 'critical', label: 'Caminhão crítico', response: 'Um caminhão entra em estado crítico quando seu consumo varia mais de 30% em relação à média semanal. Fique atento a esses veículos! ⚠️' },
  { id: 'consumption', label: 'Consumo', response: 'O consumo é calculado dividindo a diferença de KM pelo total de litros abastecidos. É o melhor indicador de eficiência da frota! ⛽' },
  { id: 'others', label: 'Outras dúvidas', response: 'Estou aqui para ajudar! Você pode me perguntar sobre turnos, registros ou como usar o painel. O que mais você gostaria de saber? 😊' },
];

export const LumiChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [lumiImage, setLumiImage] = useState<string | null>(null);
  const [systemAlert, setSystemAlert] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Image generation logic
  useEffect(() => {
    const generateLumiImage = async () => {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return;

        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Modern 2D corporate illustration of a friendly and professional female character named Lumi. 
        She is wearing a full safety uniform: orange and white reflective vest, safety boots, safety belt, and a safety helmet. 
        The style is clean, minimalist, and corporate. 
        Expression: light and friendly. 
        Colors: predominantly orange and white (CPLU brand colors). 
        Background: transparent or neutral light gray. 
        Full body or upper body shot.`;

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

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData) {
          setLumiImage(`data:image/png;base64,${part.inlineData.data}`);
        }
      } catch (error) {
        console.error("Failed to generate Lumi image:", error);
      }
    };

    generateLumiImage();
  }, []);

  // 20-minute alert logic
  useEffect(() => {
    const alertInterval = setInterval(() => {
      setSystemAlert("Atenção! Confira os dados antes de salvar. 📝");
      // Hide after 8 seconds
      setTimeout(() => setSystemAlert(null), 8000);
    }, 20 * 60 * 1000); // 20 minutes

    return () => clearInterval(alertInterval);
  }, []);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: '1',
          text: 'Olá! Sou a Lumi, sua assistente CPLU. Como posso facilitar seu trabalho hoje? 🚛✨',
          sender: 'lumi',
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = (text: string, responseText?: string) => {
    if (!text.trim()) return;

    // Clear previous messages to keep it clean as requested ("Mostrar apenas a pergunta selecionada")
    setMessages([]);
    setShowOptions(false);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([userMessage]);
    setIsTyping(true);
    setInputValue('');

    // 2-3 seconds delay as requested
    const delay = 2500; 

    setTimeout(() => {
      let response = responseText || 'Entendi! Ainda estou aprendendo sobre alguns detalhes, mas posso te ajudar com as dúvidas mais comuns. O que acha de usar um dos botões abaixo?';
      
      if (!responseText) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('erro') || lowerText.includes('problema')) {
          response = QUICK_OPTIONS.find(o => o.id === 'error')?.response || response;
        } else if (lowerText.includes('pdf') || lowerText.includes('relat')) {
          response = QUICK_OPTIONS.find(o => o.id === 'pdf')?.response || response;
        } else if (lowerText.includes('consumo')) {
          response = QUICK_OPTIONS.find(o => o.id === 'consumption')?.response || response;
        } else if (lowerText.includes('oi') || lowerText.includes('ola') || lowerText.includes('olá')) {
          response = 'Oi! Tudo bem por aí? Estou aqui para ajudar com qualquer dúvida sobre o sistema CPLU. 😊';
        }
      }

      const lumiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'lumi',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, lumiMessage]);
      setIsTyping(false);
      
      // DO NOT show options automatically after response
    }, delay);
  };

  const handleOptionClick = (option: typeof QUICK_OPTIONS[0]) => {
    handleSendMessage(option.label, option.response);
  };

  const LumiAvatar = ({ size = 40 }: { size?: number }) => (
    <div className="relative flex items-center justify-center overflow-hidden rounded-full bg-orange-50 border border-orange-100" style={{ width: size, height: size }}>
      {lumiImage ? (
        <img src={lumiImage} alt="Lumi" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-500">
          <MessageCircle size={size * 0.6} />
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Floating Alert Bubble (from LumiAssistant logic) */}
      <AnimatePresence>
        {systemAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
            className="fixed bottom-44 right-4 z-[110] p-4 bg-orange-500 text-white rounded-[24px] rounded-br-none shadow-2xl border border-orange-400 max-w-[200px] pointer-events-auto"
          >
            <button 
              onClick={() => setSystemAlert(null)}
              className="absolute -top-2 -right-2 p-1 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors"
            >
              <X size={10} />
            </button>
            <p className="text-[11px] font-bold leading-relaxed">
              {systemAlert}
            </p>
            <div className="absolute -bottom-2 right-0 w-4 h-4 bg-orange-500 border-r border-b border-orange-400 transform rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-28 right-4 z-[100] w-16 h-16 rounded-full shadow-2xl shadow-orange-300/40 flex items-center justify-center border-4 border-white active:scale-90 transition-all hover:scale-110 bg-white group"
      >
        <div className="absolute inset-0 bg-orange-500 opacity-0 group-hover:opacity-10 transition-opacity" />
        <LumiAvatar size={48} />
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
            className="fixed bottom-48 right-4 z-[100] w-[350px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-220px)] h-[550px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="bg-white p-5 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl overflow-hidden bg-orange-50 flex items-center justify-center border border-orange-100">
                  <LumiAvatar size={32} />
                </div>
                <div>
                  <h3 className="text-slate-800 font-black text-sm tracking-tight">Lumi CPLU</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white custom-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-start gap-2.5 ${msg.sender === 'lumi' ? 'justify-start' : 'justify-end'}`}>
                  {msg.sender === 'lumi' && (
                    <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mt-1 bg-orange-50 flex items-center justify-center border border-orange-100">
                      <LumiAvatar size={24} />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`max-w-[85%] p-4 rounded-[24px] text-[13px] leading-relaxed font-bold shadow-sm ${
                      msg.sender === 'lumi'
                        ? 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'
                        : 'bg-orange-500 text-white rounded-tr-none shadow-orange-100'
                    }`}
                  >
                    {msg.text}
                  </motion.div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-start gap-2.5 justify-start">
                  <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mt-1 bg-orange-50 flex items-center justify-center border border-orange-100">
                    <LumiAvatar size={24} />
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-50 border border-slate-100 p-4 rounded-[24px] rounded-tl-none flex flex-col gap-1"
                  >
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Lumi está digitando...</span>
                    <div className="flex gap-1.5">
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 h-1.5 bg-orange-500/40 rounded-full" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1.5 h-1.5 bg-orange-500/40 rounded-full" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1.5 h-1.5 bg-orange-500/40 rounded-full" />
                    </div>
                  </motion.div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-5 bg-white border-t border-slate-50 space-y-4">
              <AnimatePresence>
                {showOptions && !isTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex flex-col gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 relative"
                  >
                    <button 
                      onClick={() => setShowOptions(false)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <MessageSquare size={14} className="text-orange-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sugestões</span>
                    </div>
                    <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {QUICK_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => handleOptionClick(option)}
                          className="w-full px-4 py-3 bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-600 text-[11px] font-black rounded-xl border border-slate-100 hover:border-orange-100 transition-all active:scale-[0.98] flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <HelpCircle size={14} className="text-slate-300 group-hover:text-orange-400" />
                            {option.label}
                          </div>
                          <Sparkles size={12} className="text-slate-200 group-hover:text-orange-300" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setShowOptions(true)}
                    onClick={() => setShowOptions(true)}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
