import React from 'react';

interface StepProgressProps {
  step: number;
  label1: string;
  label2: string;
}

export default function StepProgress({ step, label1, label2 }: StepProgressProps) {
  return (
    <div className="flex items-center justify-center mb-10 max-w-md mx-auto">
      <div className={`flex flex-col items-center gap-2 ${step >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-input border border-border'}`}>
          1
        </div>
        <span className="text-sm font-medium">{label1}</span>
      </div>
      <div className={`w-24 h-px mx-4 ${step >= 2 ? 'bg-emerald-500/50' : 'bg-border'}`} />
      <div className={`flex flex-col items-center gap-2 ${step >= 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-input border border-border'}`}>
          2
        </div>
        <span className="text-sm font-medium">{label2}</span>
      </div>
    </div>
  );
}
