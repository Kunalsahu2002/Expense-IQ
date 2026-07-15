'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown, Check, X, Sparkles } from 'lucide-react';
import { CATEGORIES } from '../constants/categories';
import Select from './Select';

export interface FilterState {
  categories: string[];
  source: 'ALL' | 'AI' | 'MANUAL';
  range: string;
}

interface TransactionFiltersProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  compact?: boolean;
}

export default function TransactionFilters({ filters, onChange, compact = false }: TransactionFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCategory = (catKey: string) => {
    const newCategories = filters.categories.includes(catKey)
      ? filters.categories.filter(c => c !== catKey)
      : [...filters.categories, catKey];
    onChange({ ...filters, categories: newCategories });
  };

  const activeCount = filters.categories.length + (filters.source !== 'ALL' ? 1 : 0);

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1.5 rounded-md transition-colors relative ${isOpen || activeCount > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-input hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground'}`}
        >
          <Filter className="w-4 h-4" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 text-[8px] text-white flex items-center justify-center rounded-full font-bold">
              {activeCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 glass-panel rounded-xl shadow-xl z-50 p-4 border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3">Filter Transactions</h4>
            
            {/* Source Filter */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground font-medium mb-2 block">Source</label>
              <Select
                options={[
                  { label: 'All Sources', value: 'ALL' },
                  { label: 'AI Scanned', value: 'AI' },
                  { label: 'Manual Entry', value: 'MANUAL' }
                ]}
                value={filters.source}
                onChange={(val) => onChange({ ...filters, source: val as any })}
                prefixIcon={filters.source === 'AI' ? <Sparkles className="w-3 h-3 text-emerald-500" /> : undefined}
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-2 block">Categories</label>
              <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                {CATEGORIES.map(cat => (
                  <label key={cat.key} onClick={() => toggleCategory(cat.key)} className="flex items-center gap-2 px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md cursor-pointer transition-colors">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${filters.categories.includes(cat.key) ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                      {filters.categories.includes(cat.key) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <cat.icon className="w-3 h-3" style={{ color: cat.color }} />
                    <span className="text-sm text-foreground">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {activeCount > 0 && (
              <button 
                onClick={() => onChange({ ...filters, categories: [], source: 'ALL' })}
                className="w-full mt-3 text-xs text-red-500 hover:text-red-400 py-1.5"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full expanded mode (for Transactions page)
  return (
    <div className="glass-panel p-4 rounded-xl mb-6 flex flex-wrap items-center gap-4 border-border">
      <div className="flex items-center gap-2 text-foreground font-medium">
        <Filter className="w-4 h-4" /> Filters
      </div>
      
      {/* Date Range Dropdown */}
      <div className="w-40">
        <Select
          options={[
            { label: 'Last 7 Days', value: '7d' },
            { label: 'Last 30 Days', value: '30d' },
            { label: 'Last 3 Months', value: '3m' },
            { label: 'Last 6 Months', value: '6m' },
            { label: 'Last Year', value: '1y' },
            { label: 'All Time', value: 'all' }
          ]}
          value={filters.range}
          onChange={(val) => onChange({ ...filters, range: val })}
        />
      </div>

      {/* Source Dropdown */}
      <div className="w-40">
        <Select
          options={[
            { label: 'All Sources', value: 'ALL' },
            { label: 'AI Scanned', value: 'AI' },
            { label: 'Manual Entry', value: 'MANUAL' }
          ]}
          value={filters.source}
          onChange={(val) => onChange({ ...filters, source: val as any })}
          prefixIcon={filters.source === 'AI' ? <Sparkles className="w-3 h-3 text-emerald-500" /> : undefined}
        />
      </div>

      {/* Categories Multi-Select Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${filters.categories.length > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-input text-foreground border-border hover:border-emerald-500/30'}`}
        >
          Categories {filters.categories.length > 0 && `(${filters.categories.length})`}
          <ChevronDown className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-64 glass-panel rounded-xl shadow-xl z-50 p-2 border-border max-h-64 overflow-y-auto custom-scrollbar">
            {CATEGORIES.map(cat => (
              <label key={cat.key} onClick={() => toggleCategory(cat.key)} className="flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${filters.categories.includes(cat.key) ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                  {filters.categories.includes(cat.key) && <Check className="w-3 h-3 text-white" />}
                </div>
                <cat.icon className="w-4 h-4 shrink-0" style={{ color: cat.color }} />
                <span className="text-sm text-foreground truncate">{cat.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {activeCount > 0 && (
        <button 
          onClick={() => onChange({ ...filters, categories: [], source: 'ALL' })}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-500 transition-colors ml-auto px-2"
        >
          <X className="w-4 h-4" /> Clear All
        </button>
      )}
    </div>
  );
}
