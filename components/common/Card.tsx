import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', id }) => {
  return (
    <div id={id} className={`bg-white/80 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 hover:shadow-[0_12px_40px_rgb(20,160,144,0.12)] transition-all duration-500 hover:-translate-y-1 ${className}`}>
      <div className="p-6 md:p-8 relative z-10 w-full">
        {/* Subtle inner top highlight for glassmorphism */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>
        {children}
      </div>
    </div>
  );
};

export default Card;