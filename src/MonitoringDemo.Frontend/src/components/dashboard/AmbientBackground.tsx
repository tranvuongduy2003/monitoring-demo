import React from 'react';
import { cn } from '@/lib/utils';

interface AmbientBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ children, className }) => {
  return (
    <div className={cn("relative min-h-screen w-full bg-[#f4f7fc] text-ink overflow-hidden", className)}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-[32rem] h-[32rem] bg-brand-200/40 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-0 right-0 w-[28rem] h-[28rem] bg-brand-100/50 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3" />
        <div className="absolute top-1/2 right-1/4 w-[24rem] h-[24rem] bg-purple-200/25 rounded-full blur-[100px] animate-pulse-soft -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-[#dbeafe]/40 rounded-full blur-[110px] -translate-x-1/4 translate-y-1/4" />
      </div>

      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(203, 213, 225, 0.4) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>
    </div>
  );
};
