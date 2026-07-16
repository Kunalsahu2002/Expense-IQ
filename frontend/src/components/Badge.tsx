import React from 'react';
import { Sparkles, User } from 'lucide-react';
import { getCategoryDef } from '../constants/categories';

interface BadgeProps {
  type: 'category' | 'source';
  value: string;
}

export default function Badge({ type, value }: BadgeProps) {
  if (type === 'source') {
    return value === 'AI' ? (
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium w-fit">
        <Sparkles className="w-3 h-3" /> AI Scanned
      </span>
    ) : (
      <span className="text-muted-foreground text-xs w-fit">Manual Entry</span>
    );
  }

  // Category badge with per-category icon and color
  const cat = getCategoryDef(value);
  const Icon = cat.icon;

  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-semibold w-fit"
      style={{ 
        backgroundColor: cat.color, 
        color: '#ffffff' 
      }}
    >
      <Icon className="w-3 h-3" />
      {cat.label}
    </span>
  );
}
