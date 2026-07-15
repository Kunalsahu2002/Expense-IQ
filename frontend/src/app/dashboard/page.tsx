'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Sparkles, TrendingUp, TrendingDown, DollarSign, Loader2, AlertTriangle, ListFilter } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import { getCategoryDef, CATEGORY_COLORS, CATEGORIES } from '../../constants/categories';
import TimeRangeDropdown from '../../components/TimeRangeDropdown';
import TransactionFilters, { FilterState } from '../../components/TransactionFilters';
import EditExpenseModal from '../../components/EditExpenseModal';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#14b8a6', '#64748b'];

const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload } = props;
  const RADIAN = Math.PI / 180;
  // position outside the donut
  const radius = outerRadius + 25; 
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  const catDef = CATEGORIES.find(c => c.label === payload.name);
  if (!catDef) return null;
  const Icon = catDef.icon;

  const textAnchor = x > cx ? 'start' : 'end';
  const iconX = x > cx ? x + 5 : x - 25;
  const textX = x > cx ? x + 32 : x - 32;

  // Render a tiny foreignObject for the icon, and a text for the name
  return (
    <g>
      <text x={textX} y={y} fill="currentColor" className="text-xs font-medium text-muted-foreground" textAnchor={textAnchor} dominantBaseline="central">
        {payload.name}
      </text>
      <foreignObject x={iconX} y={y - 10} width={20} height={20}>
        <div className="w-full h-full flex items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: `${payload.color}15`, color: payload.color }}>
          <Icon className="w-3 h-3" />
        </div>
      </foreignObject>
    </g>
  );
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [insights, setInsights] = useState<any>(null);
  const [narrative, setNarrative] = useState<string>('');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<any[]>([]);
  const [isCoreDataLoading, setIsCoreDataLoading] = useState(true);
  const [isNarrativeLoading, setIsNarrativeLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1m');
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [activeAccountName, setActiveAccountName] = useState<string>('All Accounts');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    source: 'ALL',
    range: '1m', // Not used directly in fetchDashboardData yet, as timeRange drives the main query, but kept for state consistency
  });

  const [editingExpense, setEditingExpense] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const handleAccountChange = (e: any) => {
      if (e.detail) {
        setActiveAccountId(e.detail.accountId);
        setActiveAccountName(e.detail.accountName || 'All Accounts');
      }
    };
    window.addEventListener('account-changed', handleAccountChange);
    return () => window.removeEventListener('account-changed', handleAccountChange);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      setIsCoreDataLoading(true);
      setIsNarrativeLoading(true);

      try {
        // Fetch core data fast
        const accountQuery = activeAccountId ? `&accountId=${activeAccountId}` : '';
        const catQuery = filters.categories.length > 0 ? `&category=${filters.categories.join(',')}` : '';
        const sourceQuery = filters.source !== 'ALL' ? `&source=${filters.source}` : '';
        
        const [insightsRes, alertsRes, expensesRes, budgetRes] = await Promise.all([
          api.get(`/api/insights/summary?range=${timeRange}${accountQuery}`),
          api.get(`/api/budget/alerts?${accountQuery.substring(1)}`), // Need to update budget route to handle this later, safe to pass for now
          api.get(`/api/expenses?limit=10${accountQuery}${catQuery}${sourceQuery}`),
          api.get(`/api/budget/progress?${accountQuery.substring(1)}`)
        ]);

        const freshData = {
          insights: insightsRes.data.data,
          alerts: alertsRes.data.data.alerts,
          expenses: expensesRes.data.data.expenses,
          budgetProgress: budgetRes.data.data.progress || []
        };

        setInsights(freshData.insights);
        setAlerts(freshData.alerts);
        setExpenses(freshData.expenses);
        setBudgetProgress(freshData.budgetProgress);
      } catch (error) {
        console.error('Failed to fetch core dashboard data', error);
      } finally {
        setIsCoreDataLoading(false);
      }

      // Fetch slow AI narrative independently (don't block UI)
      try {
        const narrativeRes = await api.get(`/api/insights/narrative?range=${timeRange}${activeAccountId ? `&accountId=${activeAccountId}` : ''}`);
        const text = narrativeRes.data.data?.narrative || 'AI narrative could not be generated.';
        setNarrative(text);
      } catch (error) {
        setNarrative('AI insights are currently unavailable.');
      } finally {
        setIsNarrativeLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, timeRange, activeAccountId, filters, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Prepare chart data with all categories guaranteed
  const categoryData = CATEGORIES.map(cat => ({
    name: cat.label,
    color: cat.color,
    value: insights?.categoryBreakdown?.[cat.key] || 0
  })).filter(cat => cat.value > 0); // Only show categories with spending on the pie chart

  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-4 animate-in">
      <PageHeader 
        title={
          <div className="flex items-center gap-3">
            Overview
            <span className="text-xs font-medium bg-input text-muted-foreground px-2 py-1 rounded-md border border-border">
              Viewing: {activeAccountName}
            </span>
          </div>
        } 
        subtitle="Track and manage your expenses deterministically."
      >
        <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
          <button
            onClick={() => router.push('/add')}
            className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </PageHeader>

      {alerts.length > 0 && (
        <div className="mb-8 space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="glass-panel p-4 rounded-xl border-l-4 border-l-red-500 flex items-start gap-3 bg-red-500/5">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-medium text-sm">Budget Alert — {alert.category}</h3>
                <p className="text-zinc-300 text-sm mt-1">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Total Spend Card */}
        <Card className="relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Monthly Spend</p>
              {isCoreDataLoading ? (
                <div className="h-10 w-32 bg-input animate-pulse rounded-lg mt-2" />
              ) : (
                <h2 className="text-4xl font-bold text-foreground mt-2">${insights?.totalSpend?.toFixed(2) || '0.00'}</h2>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm">
            {isCoreDataLoading ? (
              <div className="h-6 w-40 bg-input animate-pulse rounded-md" />
            ) : (
              <>
                {insights?.monthOverMonthDeltaPercent > 0 ? (
                  <span className="text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-md">
                    <TrendingUp className="w-3 h-3" /> +{insights.monthOverMonthDeltaPercent.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md">
                    <TrendingDown className="w-3 h-3" /> {insights?.monthOverMonthDeltaPercent?.toFixed(1) || '0'}%
                  </span>
                )}
                <span className="text-zinc-500">vs last month</span>
              </>
            )}
          </div>
        </Card>

        {/* AI Narrative Card */}
        <Card className="md:col-span-1 relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            <h3 className="font-semibold text-foreground">AI Financial Insights</h3>
          </div>
          {isNarrativeLoading ? (
            <div className="space-y-2 mt-2">
              <div className="h-4 bg-input animate-pulse rounded w-full" />
              <div className="h-4 bg-input animate-pulse rounded w-5/6" />
              <div className="h-4 bg-input animate-pulse rounded w-4/6" />
            </div>
          ) : (
            <p className="text-muted-foreground leading-relaxed text-sm">
              {narrative}
            </p>
          )}
          <div className="absolute bottom-4 right-4 flex items-center gap-1 opacity-50">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Powered by Groq</span>
          </div>
        </Card>

        {/* Budget Progress Card */}
        <Card className="md:col-span-1 flex flex-col">
          <h3 className="font-semibold text-foreground mb-4">Budget Progress</h3>
          {isCoreDataLoading ? (
            <div className="space-y-4 flex-1">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <div className="h-3 bg-input animate-pulse rounded w-20" />
                    <div className="h-3 bg-input animate-pulse rounded w-16" />
                  </div>
                  <div className="w-full bg-input animate-pulse rounded-full h-2" />
                </div>
              ))}
            </div>
          ) : budgetProgress.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <p className="text-muted-foreground text-sm mb-3">No budgets set for this month.</p>
              <button onClick={() => router.push('/budget')} className="text-emerald-600 dark:text-emerald-400 text-sm hover:text-emerald-500 font-medium">
                Create a budget
              </button>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {budgetProgress.slice(0, 3).map((bp, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground font-medium">{bp.category}</span>
                    <span className="text-muted-foreground/70">${bp.spent.toFixed(0)} / ${bp.limit.toFixed(0)}</span>
                  </div>
                  <div className="w-full bg-input rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${bp.percentUsed >= 90 ? 'bg-red-500' : bp.percentUsed >= 75 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      style={{ width: `${bp.percentUsed}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2 min-h-[350px] flex flex-col">
          <h3 className="font-semibold text-foreground mb-4">Category Breakdown</h3>
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-6">
            {isCoreDataLoading ? (
              <div className="flex-1 flex items-center justify-center w-full min-h-[250px]">
                <Loader2 className="w-8 h-8 text-emerald-500/50 animate-spin" />
              </div>
            ) : categoryData.length > 0 ? (
              <>
                {/* Left Side: Category List */}
                <div className="w-full sm:w-1/2 flex flex-col gap-4">
                  {categoryData.sort((a,b) => b.value - a.value).map((entry, index) => {
                    const catDef = CATEGORIES.find(c => c.label === entry.name);
                    const Icon = catDef ? catDef.icon : null;
                    const percent = insights?.totalSpend ? Math.round((entry.value / insights.totalSpend) * 100) : 0;
                    
                    return (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${entry.color}20`, color: entry.color }}>
                            {Icon && <Icon className="w-4 h-4" />}
                          </div>
                          <span className="text-foreground font-medium flex items-center gap-2">
                            {entry.name} 
                            <span className="text-muted-foreground font-normal">{percent}%</span>
                          </span>
                        </div>
                        <span className="font-semibold text-foreground">${entry.value.toFixed(0)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Right Side: Donut Chart */}
                <div className="w-full sm:w-1/2 h-[280px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        label={renderCustomizedLabel}
                        labelLine={{ stroke: 'rgba(150, 150, 150, 0.3)', strokeWidth: 1 }}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number, name: string) => {
                          return [`$${value.toFixed(2)}`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Text (Total Spent) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Spent</span>
                    <span className="text-xl font-bold text-foreground mt-0.5">${insights?.totalSpend?.toFixed(0) || '0'}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full min-h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                No data for this month
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Transactions</h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/transactions')}
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
              >
                View All
              </button>
              <div className="hidden sm:block">
                <TransactionFilters filters={filters} onChange={setFilters} compact />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mt-2 pb-4">
            <div className="flex flex-col gap-4">
              {isCoreDataLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-input animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-input animate-pulse rounded w-24" />
                      <div className="h-3 bg-input animate-pulse rounded w-16" />
                    </div>
                    <div className="h-4 bg-input animate-pulse rounded w-12" />
                  </div>
                ))
              ) : expenses.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No recent transactions found.
                </div>
              ) : (
                expenses.slice(0, 5).map((exp) => {
                  const catDef = CATEGORIES.find(c => c.key === exp.category) || CATEGORIES[0];
                  const Icon = catDef.icon;
                  return (
                    <div key={exp.id} className="flex items-center gap-3 group relative cursor-pointer px-2 py-1 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors" onClick={() => router.push(`/transactions?id=${exp.id}`)}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${catDef.color}15`, color: catDef.color }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{exp.vendor}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(exp.date), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-foreground">-${parseFloat(exp.amount.toString()).toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      </div>
      
      {editingExpense && (
        <EditExpenseModal 
          expense={editingExpense} 
          onClose={() => setEditingExpense(null)} 
          onUpdated={() => {
            setEditingExpense(null);
            setRefreshTrigger(prev => prev + 1);
          }}
          onDeleted={() => {
            setEditingExpense(null);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
