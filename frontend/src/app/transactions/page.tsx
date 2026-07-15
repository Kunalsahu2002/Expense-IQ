'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Loader2, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import TransactionFilters, { FilterState } from '../../components/TransactionFilters';
import EditExpenseModal from '../../components/EditExpenseModal';

export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    source: 'ALL',
    range: 'all',
  });
  
  const [editingExpense, setEditingExpense] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/landing');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const handleAccountChange = (e: any) => {
      if (e.detail) {
        setActiveAccountId(e.detail.accountId);
        setPage(1);
      }
    };
    window.addEventListener('account-changed', handleAccountChange);
    return () => window.removeEventListener('account-changed', handleAccountChange);
  }, []);

  const fetchTransactions = async () => {
    try {
      setDataLoading(true);
      
      const accountQuery = activeAccountId ? `&accountId=${activeAccountId}` : '';
      const catQuery = filters.categories.length > 0 ? `&category=${filters.categories.join(',')}` : '';
      const sourceQuery = filters.source !== 'ALL' ? `&source=${filters.source}` : '';
      
      let dateQuery = '';
      if (filters.range !== 'all') {
        const now = new Date();
        let startDate = new Date();
        if (filters.range === '7d') startDate.setDate(now.getDate() - 7);
        else if (filters.range === '30d' || filters.range === '1m') startDate.setDate(now.getDate() - 30);
        else if (filters.range === '3m') startDate.setMonth(now.getMonth() - 3);
        else if (filters.range === '6m') startDate.setMonth(now.getMonth() - 6);
        else if (filters.range === '1y') startDate.setFullYear(now.getFullYear() - 1);
        
        dateQuery = `&startDate=${startDate.toISOString()}`;
      }
      
      const res = await api.get(`/api/expenses?page=${page}&limit=10${accountQuery}${catQuery}${sourceQuery}${dateQuery}`);
      setExpenses(res.data.data.expenses);
      setTotalPages(res.data.data.totalPages);
      setTotalCount(res.data.data.total);
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchTransactions();
  }, [user, page, activeAccountId, filters]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Group expenses by date for the bar chart
  const chartData = [...expenses].reverse().reduce((acc: any[], exp) => {
    const date = format(new Date(exp.date), 'MMM dd');
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.amount += parseFloat(exp.amount);
    } else {
      acc.push({ date, amount: parseFloat(exp.amount) });
    }
    return acc;
  }, []).slice(-7);

  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-8 animate-in">
      <PageHeader 
        title="Transactions" 
        subtitle="A complete history of your spending."
      />

      <TransactionFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-2xl lg:col-span-3 min-h-[300px] flex flex-col">
          <h3 className="font-semibold text-foreground mb-6">Recent Spending Trend (This Page)</h3>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#a1a1aa" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#a1a1aa" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981', fontWeight: 500 }}
                  labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-panel border border-border rounded-xl overflow-hidden animate-in" style={{ animationDelay: '100ms' }}>
        <div className="px-6 py-4 border-b border-border bg-input/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">All Transactions <span className="text-muted-foreground font-normal ml-1">({totalCount})</span></h2>
        </div>
        
        <div className="overflow-x-auto relative min-h-[300px]">
          {dataLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : null}
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-input/50">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Vendor</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Account</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-4 py-4 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    {format(new Date(exp.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">{exp.vendor}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge type="category" value={exp.category} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {exp.account?.name || 'Personal'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-foreground whitespace-nowrap">
                    ${parseFloat(exp.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button 
                      onClick={() => setEditingExpense(exp)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-input text-muted-foreground hover:text-foreground transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium bg-input px-3 py-1 rounded-md">
            Page {page} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-input hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-2 rounded-lg bg-input hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-muted-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {editingExpense && (
        <EditExpenseModal 
          expense={editingExpense} 
          onClose={() => setEditingExpense(null)} 
          onUpdated={() => {
            setEditingExpense(null);
            fetchTransactions();
          }}
          onDeleted={() => {
            setEditingExpense(null);
            fetchTransactions();
          }}
        />
      )}
    </div>
  );
}
