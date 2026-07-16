'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Loader2, ChevronLeft, ChevronRight, ListFilter, MoreVertical, Edit, Trash2, CheckSquare, Square, AlertTriangle, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import TransactionFilters, { FilterState } from '../../components/TransactionFilters';
import EditExpenseModal from '../../components/EditExpenseModal';
import TimeRangeDropdown from '../../components/TimeRangeDropdown';


export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const searchParams = useSearchParams();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  
  const [filters, setFilters] = useState<FilterState>(() => ({
    categories: searchParams.get('categories') ? searchParams.get('categories')!.split(',') : [],
    accounts: searchParams.get('accounts') ? searchParams.get('accounts')!.split(',') : [],
    source: (searchParams.get('source') as any) || 'ALL',
    range: searchParams.get('range') || 'all',
    search: searchParams.get('search') || '',
    customStartDate: searchParams.get('customStartDate') || '',
    customEndDate: searchParams.get('customEndDate') || '',
  }));

  const [searchInput, setSearchInput] = useState(filters.search);

  // Sync to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.categories.length) params.set('categories', filters.categories.join(','));
    if (filters.accounts.length) params.set('accounts', filters.accounts.join(','));
    if (filters.source !== 'ALL') params.set('source', filters.source);
    if (filters.range !== 'all') params.set('range', filters.range);
    if (filters.search) params.set('search', filters.search);
    if (filters.customStartDate) params.set('customStartDate', filters.customStartDate);
    if (filters.customEndDate) params.set('customEndDate', filters.customEndDate);
    
    const query = params.toString();
    const url = query ? `/transactions?${query}` : '/transactions';
    router.replace(url, { scroll: false });
  }, [filters, router]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters(prev => ({ ...prev, search: searchInput }));
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search]);

  // Fetch accounts list for filters
  useEffect(() => {
    if (user) {
      api.get('/api/accounts').then(res => setAccountsList(res.data.data.accounts)).catch(console.error);
    }
  }, [user]);
  
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editMode, setEditMode] = useState<'edit' | 'delete'>('edit');
  
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClick = (e: any) => {
      if (!e.target.closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
      
      const accountQuery = filters.accounts.length > 0 ? `&accountId=${filters.accounts.join(',')}` : (activeAccountId ? `&accountId=${activeAccountId}` : '');
      const catQuery = filters.categories.length > 0 ? `&category=${filters.categories.join(',')}` : '';
      const sourceQuery = filters.source !== 'ALL' ? `&source=${filters.source}` : '';
      const searchQuery = filters.search ? `&search=${encodeURIComponent(filters.search)}` : '';
      
      let dateQuery = '';
      if (filters.customStartDate || filters.customEndDate) {
        if (filters.customStartDate) dateQuery += `&startDate=${new Date(filters.customStartDate).toISOString()}`;
        if (filters.customEndDate) dateQuery += `&endDate=${new Date(filters.customEndDate + 'T23:59:59').toISOString()}`;
      } else if (filters.range !== 'all') {
        const now = new Date();
        let startDate = new Date();
        if (filters.range === '7d') startDate.setDate(now.getDate() - 7);
        else if (filters.range === '30d' || filters.range === '1m') startDate.setDate(now.getDate() - 30);
        else if (filters.range === '3m') startDate.setMonth(now.getMonth() - 3);
        else if (filters.range === '6m') startDate.setMonth(now.getMonth() - 6);
        else if (filters.range === '1y') startDate.setFullYear(now.getFullYear() - 1);
        
        dateQuery = `&startDate=${startDate.toISOString()}`;
      }
      
      const res = await api.get(`/api/expenses?page=${page}&limit=10${accountQuery}${catQuery}${sourceQuery}${searchQuery}${dateQuery}`);
      setExpenses(res.data.data.expenses);
      setTotalPages(res.data.data.totalPages);
      setTotalCount(res.data.data.total);
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedRows.length} transactions?`)) return;
    setIsDeletingBulk(true);
    try {
      await Promise.all(selectedRows.map(id => api.delete(`/api/expenses/${id}`)));
      setSelectedRows([]);
      fetchTransactions();
    } catch (err) {
      console.error('Failed to delete transactions', err);
      alert('Failed to delete some transactions');
    } finally {
      setIsDeletingBulk(false);
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
    <div className="max-w-7xl mx-auto w-full px-6 py-2 animate-in">
      <div className="flex flex-col justify-between items-start mb-4 gap-1">
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <p className="text-sm text-muted-foreground">A complete history of your spending.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="glass-panel p-6 rounded-2xl lg:col-span-3 min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">Recent Spending Trend (This Page)</h3>
            <TimeRangeDropdown value={filters.range} onChange={(val) => { setFilters({...filters, range: val}); setPage(1); }} />
          </div>
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
                  itemStyle={{ color: '#ef4444', fontWeight: 500 }}
                  labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                />
                <Bar 
                  dataKey="amount" 
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-panel border border-border rounded-xl overflow-visible animate-in" style={{ animationDelay: '100ms' }}>
        <div className="px-6 py-4 border-b border-border bg-input/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-foreground whitespace-nowrap">All Transactions <span className="text-muted-foreground font-normal ml-1">({totalCount})</span></h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Search vendors..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="bg-background border border-border text-foreground text-sm rounded-lg pl-9 pr-4 py-1.5 focus:outline-none focus:border-emerald-500 w-full sm:w-64 transition-colors"
              />
            </div>
          </div>
          <TransactionFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} compact={true} accounts={accountsList} />
        </div>
        
        {selectedRows.length > 0 && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-red-500">{selectedRows.length} selected</span>
            <button 
              onClick={handleBulkDelete} 
              disabled={isDeletingBulk}
              className="flex items-center gap-2 text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isDeletingBulk ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )}

        <div className="overflow-x-auto relative min-h-[300px]">
          {dataLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : null}
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-foreground font-bold uppercase bg-input/50">
              <tr>
                <th className="px-6 py-4 font-bold w-12">
                  <button 
                    onClick={() => {
                      if (selectedRows.length === expenses.length && expenses.length > 0) {
                        setSelectedRows([]);
                      } else {
                        setSelectedRows(expenses.map(e => e.id));
                      }
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {selectedRows.length === expenses.length && expenses.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold">Vendor</th>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 font-bold">Account</th>
                <th className="px-6 py-4 font-bold text-right">Amount</th>
                <th className="px-4 py-4 font-bold w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((exp) => (
                <tr key={exp.id} className={`transition-colors group ${selectedRows.includes(exp.id) ? 'bg-emerald-500/5' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'}`}>
                  <td className="px-6 py-4 w-12">
                    <button 
                      onClick={() => {
                        setSelectedRows(prev => prev.includes(exp.id) ? prev.filter(id => id !== exp.id) : [...prev, exp.id]);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {selectedRows.includes(exp.id) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>
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
                  <td className="px-6 py-4 text-right font-medium text-red-500 whitespace-nowrap">
                    -${parseFloat(exp.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right relative action-menu-container">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === exp.id ? null : exp.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-input text-muted-foreground hover:text-foreground transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {activeMenuId === exp.id && (
                      <div 
                        className="absolute right-8 top-1/2 -translate-y-1/2 w-32 glass-panel rounded-lg shadow-xl z-50 border border-border py-1 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setEditingExpense(exp);
                            setEditMode('edit');
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            setEditingExpense(exp);
                            setEditMode('delete');
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
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
          defaultDelete={editMode === 'delete'}
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
