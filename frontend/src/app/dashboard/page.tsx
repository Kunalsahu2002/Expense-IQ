'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Sparkles, TrendingUp, TrendingDown, DollarSign, Loader2, AlertTriangle, ListFilter, Plus } from 'lucide-react';
import { format } from 'date-fns';
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

const renderCustomizedLabel = (props: any, hoveredCategory: string | null, setHoveredCategory: (name: string | null) => void) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, payload } = props;
  const RADIAN = Math.PI / 180;
  
  const catDef = CATEGORIES.find(c => c.label === payload.name);
  if (!catDef) return null;
  const Icon = catDef.icon;

  const isHovered = hoveredCategory === payload.name;

  let insideIcon = null;
  if (percent > 0.08) {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const innerX = cx + radius * Math.cos(-midAngle * RADIAN);
    const innerY = cy + radius * Math.sin(-midAngle * RADIAN);
    insideIcon = (
      <foreignObject x={innerX - 10} y={innerY - 10} width={20} height={20} style={{ pointerEvents: 'none' }}>
        <div className={`w-full h-full flex items-center justify-center rounded-full bg-black/20 text-white shadow-sm transition-transform ${isHovered ? 'scale-125' : ''}`}>
          <Icon className="w-3 h-3" />
        </div>
      </foreignObject>
    );
  }

  // Outside the donut slice with a leader line
  const outRadius = outerRadius + 25; 
  const x = cx + outRadius * Math.cos(-midAngle * RADIAN);
  const y = cy + outRadius * Math.sin(-midAngle * RADIAN);
  const isRight = x > cx;
  const iconX = isRight ? x + 5 : x - 25;
  const foreignX = isRight ? x + 30 : x - 130;

  return (
    <g 
      onMouseEnter={() => setHoveredCategory(payload.name)} 
      onMouseLeave={() => setHoveredCategory(null)}
      style={{ cursor: 'pointer' }}
    >
      {insideIcon}
      <foreignObject x={foreignX} y={y - 20} width={100} height={40}>
        <div 
          className={`flex h-full items-center text-xs ${isHovered ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'} ${isRight ? 'justify-start text-left' : 'justify-end text-right'}`}
          style={{ lineHeight: '1.2', transition: 'all 0.2s' }}
        >
          {payload.name}
        </div>
      </foreignObject>
      <foreignObject x={iconX} y={y - 10} width={20} height={20}>
        <div className={`w-full h-full flex items-center justify-center rounded-full shadow-sm transition-transform ${isHovered ? 'scale-125 ring-2 ring-emerald-500/50' : ''}`} style={{ backgroundColor: `${payload.color}15`, color: payload.color }}>
          <Icon className="w-3 h-3" />
        </div>
      </foreignObject>
    </g>
  );
};

const renderLabelLine = (props: any, hoveredCategory: string | null) => {
  const { points, payload } = props;
  if (!points || points.length === 0) return <></>;
  const isHovered = hoveredCategory === payload.name;
  return <polyline points={points.map((p: any) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={isHovered ? payload.color : "rgba(150, 150, 150, 0.3)"} strokeWidth={isHovered ? 2 : 1} style={{ transition: 'all 0.2s', pointerEvents: 'none' }} />;
};

const PieLabel = (props: any) => renderCustomizedLabel(props, props.hoveredCategory, props.setHoveredCategory);
const PieLabelLine = (props: any) => renderLabelLine(props, props.hoveredCategory);

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [insights, setInsights] = useState<any>(null);
  const [narrative, setNarrative] = useState<string>('');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<any[]>([]);
  const [totalBudgetProgress, setTotalBudgetProgress] = useState<any>(null);
  const [isCoreDataLoading, setIsCoreDataLoading] = useState(true);
  const [isNarrativeLoading, setIsNarrativeLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1m');
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [activeAccountName, setActiveAccountName] = useState<string>('All Accounts');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  
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
    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

    window.addEventListener('account-changed', handleAccountChange);
    window.addEventListener('accounts-updated', handleRefresh);
    window.addEventListener('budgets-updated', handleRefresh);

    return () => {
      window.removeEventListener('account-changed', handleAccountChange);
      window.removeEventListener('accounts-updated', handleRefresh);
      window.removeEventListener('budgets-updated', handleRefresh);
    };
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
          budgetProgress: budgetRes.data.data.progress || [],
          totalBudgetProgress: budgetRes.data.data.totalProgress || null
        };

        setInsights(freshData.insights);
        setAlerts(freshData.alerts);
        setExpenses(freshData.expenses);
        setBudgetProgress(freshData.budgetProgress);
        setTotalBudgetProgress(freshData.totalBudgetProgress);
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

  // Prepare chart data with all categories guaranteed
  const categoryData = useMemo(() => {
    return CATEGORIES.map(cat => ({
      name: cat.label,
      color: cat.color,
      value: insights?.categoryBreakdown?.[cat.key] || 0
    })).filter(cat => cat.value > 0);
  }, [insights]); // Only show categories with spending on the pie chart

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Sort budgetProgress by recent transaction categories sequence, with fallback to default sorting
  const recentCategories: string[] = [];
  expenses.forEach(exp => {
    if (exp.category && !recentCategories.includes(exp.category)) {
      recentCategories.push(exp.category);
    }
  });

  const sequencedBudgets = [...budgetProgress].sort((a, b) => {
    const indexA = recentCategories.indexOf(a.category);
    const indexB = recentCategories.indexOf(b.category);
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return b.percentUsed - a.percentUsed;
  });

  return (
    <div className="max-w-7xl mx-auto w-full animate-in pb-4">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
              Overview
              <span className="text-xs font-medium bg-input text-muted-foreground px-2 py-1 rounded-md border border-border">
                Viewing: {activeAccountName}
              </span>
            </h1>
            <p className="text-muted-foreground">Your financial overview and AI insights.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
          </div>
        </div>
      </div>

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
                <div className="mt-2">
                  <h2 className="text-4xl font-bold text-foreground flex items-baseline gap-2">
                    ${insights?.totalSpend?.toFixed(2) || '0.00'}
                    {totalBudgetProgress && (
                      <span className="text-xl font-medium text-muted-foreground/70">/ ${totalBudgetProgress.limit.toFixed(0)}</span>
                    )}
                  </h2>
                  {totalBudgetProgress && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Spent: <span className="font-medium text-foreground">${insights?.totalSpend?.toFixed(2) || '0.00'}</span> • 
                      Remaining: <span className="font-medium text-foreground">${Math.max(0, totalBudgetProgress.limit - (insights?.totalSpend || 0)).toFixed(2)}</span>
                    </p>
                  )}
                </div>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Budget Progress</h3>
            <button 
              onClick={() => router.push('/budget')}
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View All
            </button>
          </div>
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
              {sequencedBudgets.slice(0, 3).map((bp, i) => (
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
        <Card className="lg:col-span-2 min-h-[350px] flex flex-col overflow-hidden">
          <h3 className="font-semibold text-foreground mb-4">Category Breakdown</h3>
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-6">
            {isCoreDataLoading ? (
              <div className="flex-1 flex items-center justify-center w-full min-h-[250px]">
                <Loader2 className="w-8 h-8 text-emerald-500/50 animate-spin" />
              </div>
            ) : categoryData.length > 0 ? (
              <>
                {/* Left Side: Category List */}
                <div className="w-full sm:w-2/5 flex flex-col gap-4">
                  {categoryData.sort((a,b) => b.value - a.value).map((entry, index) => {
                    const catDef = CATEGORIES.find(c => c.label === entry.name);
                    const Icon = catDef ? catDef.icon : null;
                    const percent = insights?.totalSpend ? Math.round((entry.value / insights.totalSpend) * 100) : 0;
                    
                    return (
                      <div 
                        key={index} 
                        className="flex items-center text-sm w-full cursor-pointer transition-opacity hover:opacity-80"
                        onMouseEnter={() => setHoveredCategory(entry.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mr-3" style={{ backgroundColor: `${entry.color}20`, color: entry.color }}>
                          {Icon && <Icon className="w-4 h-4" />}
                        </div>
                        <span className={`truncate flex-1 min-w-0 mr-2 text-foreground transition-all ${hoveredCategory === entry.name ? 'font-bold' : 'font-medium'}`}>
                          {entry.name}
                        </span>
                        <span className="opacity-70 shrink-0 text-foreground w-10 text-right mr-3">
                          {percent}%
                        </span>
                        <span className={`text-foreground shrink-0 text-right w-12 transition-all ${hoveredCategory === entry.name ? 'font-bold' : 'font-semibold'}`}>
                          ${entry.value.toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Right Side: Donut Chart */}
                <div className="w-full sm:w-3/5 h-[340px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={95}
                        outerRadius={125}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={false}
                        label={<PieLabel hoveredCategory={hoveredCategory} setHoveredCategory={setHoveredCategory} />}
                        labelLine={<PieLabelLine hoveredCategory={hoveredCategory} />}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            opacity={hoveredCategory && hoveredCategory !== entry.name ? 0.3 : 1}
                            style={{ transition: 'opacity 0.2s', outline: 'none', cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredCategory(entry.name)}
                            onMouseLeave={() => setHoveredCategory(null)}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Text (Total Spent or Hovered Category) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {hoveredCategory ? (
                      <>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate px-4 text-center max-w-[120px]">
                          {hoveredCategory}
                        </span>
                        <span className="text-2xl font-bold mt-0.5" style={{ color: categoryData.find(c => c.name === hoveredCategory)?.color }}>
                          ${categoryData.find(c => c.name === hoveredCategory)?.value.toFixed(0) || '0'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Spent</span>
                        <span className="text-xl font-bold text-foreground mt-0.5">${insights?.totalSpend?.toFixed(0) || '0'}</span>
                      </>
                    )}
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
            <button 
              onClick={() => router.push('/transactions')}
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              View All
            </button>
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
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(exp.date), 'MMM dd, yyyy')} • {exp.account?.name || 'Personal'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-red-500">-${parseFloat(exp.amount.toString()).toFixed(2)}</p>
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
