import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  textColor?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  showText = true, 
  size = 'md',
  textColor = 'text-slate-800'
}) => {
  const sizes = {
    sm: { circle: 'w-8 h-8', font: 'text-[10px]', text: 'text-[10px]' },
    md: { circle: 'w-12 h-12', font: 'text-[14px]', text: 'text-xs' },
    lg: { circle: 'w-20 h-20', font: 'text-[24px]', text: 'text-sm' },
    xl: { circle: 'w-32 h-32', font: 'text-[38px]', text: 'text-lg' }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative flex flex-col items-center">
        {/* Main Circle */}
        <div className={`${currentSize.circle} bg-[#F97316] rounded-full flex items-center justify-center shadow-lg z-10`}>
          <span className={`${currentSize.font} font-black text-white lowercase tracking-tighter`}>
            cplu
          </span>
        </div>
        
        {/* Green Curve below */}
        <div 
          className="absolute -bottom-1 w-[110%] h-1/3 bg-[#22C55E] rounded-[100%] z-0"
          style={{ clipPath: 'ellipse(50% 50% at 50% 100%)' }}
        />
      </div>
      
      {showText && (
        <div className={`mt-3 font-black uppercase tracking-widest text-center leading-tight ${currentSize.text} ${textColor}`}>
          Consórcio Paulista<br />de Limpeza Urbana
        </div>
      )}
    </div>
  );
};
