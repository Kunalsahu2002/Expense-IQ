'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  label: string | React.ReactNode;
  value: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  prefixIcon?: React.ReactNode;
}

export default function Select({ options, value, onChange, className = '', placeholder = 'Select...', prefixIcon }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current && dropdownRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const spaceBelow = viewportHeight - containerRect.bottom;
      const spaceAbove = containerRect.top;
      
      // If there isn't enough space below, but there is space above, render upwards
      if (spaceBelow < dropdownRect.height + 20 && spaceAbove > spaceBelow) {
        setDirection('up');
      } else {
        setDirection('down');
      }
    }
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between glass-input text-foreground rounded-lg px-3 py-2 text-sm bg-input border-border hover:border-emerald-500/30 transition-colors"
      >
        <span className="flex items-center gap-2 truncate">
          {prefixIcon && prefixIcon}
          {selectedOption ? selectedOption.label : <span className="text-muted-foreground">{placeholder}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute left-0 w-full glass-panel rounded-xl shadow-xl z-50 p-1.5 border-border max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-1 ${
            direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{ minWidth: 'max-content' }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left group ${
                value === opt.value ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground'
              }`}
            >
              <span className={`text-sm truncate ${value === opt.value ? 'font-medium' : 'group-hover:text-foreground'}`}>
                {opt.label}
              </span>
              {value === opt.value && <Check className="w-4 h-4 shrink-0 ml-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
