'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import Select from './Select';

interface TimeRangeDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const OPTIONS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '1m', label: 'Last 30 Days' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

export default function TimeRangeDropdown({ value, onChange }: TimeRangeDropdownProps) {
  return (
    <div className="w-48">
      <Select
        options={OPTIONS}
        value={value}
        onChange={onChange}
        prefixIcon={<Calendar className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
      />
    </div>
  );
}
