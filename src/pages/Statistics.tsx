import { useState, useMemo, useRef } from 'react';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, addWeeks, addMonths, subWeeks, subMonths,
  parseISO,
} from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, ChevronDown,
  CalendarClock, Plus, Pencil, Trash2, ArrowUp, ArrowDown, RefreshCw,
  ChevronRight as ChevronRightSm,
} from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../translations';
import { formatAmount, isOccurrence } from '../utils';
import Modal from '../components/Modal';
import CategoryPicker from '../components/CategoryPicker';
import BalanceForecast from '../components/BalanceForecast';
import { Budget, PlannedExpense, Transaction } from '../types';
import ProGate from '../components/ProGate';
import { usePlan } from '../plan';

type Period = 'week' | 'month';
type View = 'stats' | 'budgets';

type DrillDown = {
  title: string;
  color: string;
  filterType: 'income' | 'expense';
  categoryId?: string;
};

type DrillItem =
  | { kind: 'tx'; id: string; amount: number; date: string; description: string; categoryId: string; tx: Transaction }
  | { kind: 'planned'; id: string; amount: number; date: string; description: string; categoryId: string; pe: PlannedExpense };

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function Statistics() {
  const {
    language, transactions, plannedExpenses, categories,
    defaultCurrency, budgets, addBudget, updateBudget, deleteBudget, debts, accounts,
  } = useStore();
  const t = translations[language];
  const dc = defaultCurrency as any;

  const { canViewStatistics } = usePlan();

  const [view, setView] = useState<View>('stats');
  const [period, setPeriod] = useState<Period>('month');
  const [offset, setOffset] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Refresh state
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Drill-down modal
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);

  // Collapsed sections state
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleSection = (key: string) =>
    setCollapsed((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const isCollapsed = (key: string) => collapsed.has(key);

  // Budget modal state
  const [showAdd, setShowAdd] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [selectedCat, setSelectedCat] = useState('');
  const [limit, setLimit] = useState('');
  const [pickerError, setPickerError] = useState('');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setOffset(0);
    setPeriod('month');
    setView('stats');
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const openDrill = (filterType: 'income' | 'expense', title: string, color: string, categoryId?: string) => {
    setDrillDown({ filterType, title, color, categoryId });
  };

  const navigate = (delta: number) => {
    setSlideDir(delta > 0 ? 'left' : 'right');
    setOffset((o) => o + delta);
    setTimeout(() => setSlideDir(null), 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) navigate(delta > 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const now = new Date();

  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    if (period === 'week') {
      const base = offset >= 0
        ? addWeeks(startOfWeek(now, { weekStartsOn: 1 }), offset)
        : subWeeks(startOfWeek(now, { weekStartsOn: 1 }), -offset);
      const start = base;
      const end = endOfWeek(base, { weekStartsOn: 1 });
      const label = `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}`;
      return { periodStart: start, periodEnd: end, periodLabel: label };
    } else {
      const base = offset >= 0
        ? addMonths(startOfMonth(now), offset)
        : subMonths(startOfMonth(now), -offset);
      const start = base;
      const end = endOfMonth(base);
      const label = `${t.months[start.getMonth()]} ${start.getFullYear()}`;
      return { periodStart: start, periodEnd: end, periodLabel: label };
    }
  }, [period, offset, language]);

  const isCurrentPeriod = offset === 0;
  const periodDays = eachDayOfInterval({ start: periodStart, end: periodEnd });
  const periodStartStr = format(periodStart, 'yyyy-MM-dd');
  const periodEndStr = format(periodEnd, 'yyyy-MM-dd');

  // Date-indexed maps for O(1) per-day lookup (avoids O(n*m) filter loops)
  const txByDate = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const tx of transactions) {
      if (tx.type === 'transfer') continue;
      const entry = map.get(tx.date) ?? { income: 0, expense: 0 };
      if (tx.type === 'income') entry.income += tx.amount;
      else entry.expense += tx.amount;
      map.set(tx.date, entry);
    }
    return map;
  }, [transactions]);

  const plannedByDate = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const pe of plannedExpenses) {
      for (const ds of pe.completedDates) {
        const entry = map.get(ds) ?? { income: 0, expense: 0 };
        if (pe.type === 'income') entry.income += pe.amount;
        else entry.expense += pe.amount;
        map.set(ds, entry);
      }
    }
    return map;
  }, [plannedExpenses]);

  // ── Drill-down items (transactions + completed planned) ─────────────────────
  const drillItems = useMemo((): DrillItem[] => {
    if (!drillDown) return [];
    const items: DrillItem[] = [];

    // Regular transactions
    transactions
      .filter((tx) => {
        if (tx.type !== drillDown.filterType) return false;
        if (drillDown.categoryId && tx.categoryId !== drillDown.categoryId) return false;
        return tx.date >= periodStartStr && tx.date <= periodEndStr;
      })
      .forEach((tx) => items.push({
        kind: 'tx', id: tx.id, amount: tx.amount, date: tx.date,
        description: tx.description, categoryId: tx.categoryId, tx,
      }));

    // Completed planned expenses/incomes
    plannedExpenses
      .filter((pe) => {
        if ((pe.type ?? 'expense') !== drillDown.filterType) return false;
        if (drillDown.categoryId && pe.categoryId !== drillDown.categoryId) return false;
        return true;
      })
      .forEach((pe) => {
        pe.completedDates
          .filter((ds) => ds >= periodStartStr && ds <= periodEndStr)
          .forEach((ds) => {
            items.push({
              kind: 'planned', id: `${pe.id}-${ds}`, amount: pe.amount, date: ds,
              description: pe.description, categoryId: pe.categoryId, pe,
            });
          });
      });

    return items.sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date));
  }, [drillDown, periodStartStr, periodEndStr, transactions, plannedExpenses]);

  const drillTotal = drillItems.reduce((s, item) => s + item.amount, 0);

  // ── Stats computations ───────────────────────────────────────────────────────

  const barData = useMemo(() => {
    const dayTotals = (ds: string) => {
      const tx = txByDate.get(ds) ?? { income: 0, expense: 0 };
      const pl = plannedByDate.get(ds) ?? { income: 0, expense: 0 };
      return { income: tx.income + pl.income, expense: tx.expense + pl.expense };
    };

    if (period === 'week') {
      return periodDays.map((day) => {
        const ds = format(day, 'yyyy-MM-dd');
        const { income, expense } = dayTotals(ds);
        return { label: t.weekdays[(day.getDay() + 6) % 7], income, expense };
      });
    } else {
      const weeks: { label: string; income: number; expense: number }[] = [];
      let wStart = periodStart;
      let wIdx = 1;
      while (wStart <= periodEnd) {
        const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
        const actualEnd = wEnd > periodEnd ? periodEnd : wEnd;
        const wDays = eachDayOfInterval({ start: wStart, end: actualEnd });
        let income = 0, expense = 0;
        for (const day of wDays) {
          const t2 = dayTotals(format(day, 'yyyy-MM-dd'));
          income += t2.income;
          expense += t2.expense;
        }
        weeks.push({ label: `${language === 'ru' ? 'Нед' : 'W'}${wIdx}`, income, expense });
        wStart = addDays(actualEnd, 1);
        wIdx++;
      }
      return weeks;
    }
  }, [period, periodStart, periodEnd, txByDate, plannedByDate, language, periodDays]);

  // Per-account balance trend — shows each account as its own line starting from initial balance
  const accountTrendData = useMemo(() => {
    if (period !== 'month') return { data: [], accountList: [] };

    // Build per-account per-day delta maps
    const acctDayDelta = new Map<string, Map<string, number>>();
    const periodDelta: Record<string, number> = {};
    accounts.forEach(a => {
      acctDayDelta.set(a.id, new Map());
      periodDelta[a.id] = 0;
    });

    const applyDelta = (accountId: string, ds: string, delta: number) => {
      const dayMap = acctDayDelta.get(accountId);
      if (!dayMap) return;
      dayMap.set(ds, (dayMap.get(ds) ?? 0) + delta);
      periodDelta[accountId] = (periodDelta[accountId] ?? 0) + delta;
    };

    for (const tx of transactions) {
      if (tx.date < periodStartStr || tx.date > periodEndStr) continue;
      if (tx.type === 'income') applyDelta(tx.accountId, tx.date, tx.amount);
      else if (tx.type === 'expense') applyDelta(tx.accountId, tx.date, -tx.amount);
      else if (tx.type === 'transfer') {
        if (tx.transferRole === 'out') applyDelta(tx.accountId, tx.date, -tx.amount);
        else if (tx.transferRole === 'in') applyDelta(tx.accountId, tx.date, tx.amount);
      }
    }

    for (const pe of plannedExpenses) {
      if (!pe.accountId) continue;
      for (const ds of pe.completedDates) {
        if (ds < periodStartStr || ds > periodEndStr) continue;
        applyDelta(pe.accountId, ds, pe.type === 'income' ? pe.amount : -pe.amount);
      }
    }

    // Starting balance = current balance minus what happened during the period
    const running: Record<string, number> = {};
    accounts.forEach(a => { running[a.id] = a.balance - (periodDelta[a.id] ?? 0); });

    const data = periodDays.map(day => {
      const ds = format(day, 'yyyy-MM-dd');
      const point: Record<string, any> = { day: day.getDate() };
      accounts.forEach(a => {
        running[a.id] = (running[a.id] ?? 0) + (acctDayDelta.get(a.id)?.get(ds) ?? 0);
        point[a.id] = running[a.id];
      });
      return point;
    });

    return { data, accountList: accounts };
  }, [period, periodDays, periodStartStr, periodEndStr, accounts, transactions, plannedExpenses]);

  const { catMap, pieData } = useMemo(() => {
    const map: Record<string, number> = {};
    // Use direct transaction iteration filtered by date range — O(transactions) total
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      if (tx.date < periodStartStr || tx.date > periodEndStr) continue;
      map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount;
    }
    for (const pe of plannedExpenses) {
      if (pe.type === 'income') continue;
      for (const ds of pe.completedDates) {
        if (ds >= periodStartStr && ds <= periodEndStr) {
          map[pe.categoryId] = (map[pe.categoryId] || 0) + pe.amount;
        }
      }
    }
    const catLookup = new Map(categories.map((c) => [c.id, c]));
    const pie = Object.entries(map)
      .map(([catId, value]) => {
        const cat = catLookup.get(catId);
        return {
          catId,
          name: language === 'ru' ? (cat?.name ?? catId) : (cat?.nameEn ?? catId),
          value,
          color: cat?.color ?? '#94A3B8',
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    return { catMap: map, pieData: pie };
  }, [periodStartStr, periodEndStr, transactions, plannedExpenses, categories, language]);

  const {
    expPlannedTotal, expPlannedCompleted, expPlannedPending, expPlannedByCategory,
    incPlannedTotal, incPlannedCompleted, incPlannedPending, incPlannedByCategory,
  } = useMemo(() => {
    let expTotal = 0, expDone = 0, expPend = 0;
    let incTotal = 0, incDone = 0, incPend = 0;
    const expByCat: Record<string, { total: number; done: number }> = {};
    const incByCat: Record<string, { total: number; done: number }> = {};

    for (const day of periodDays) {
      const ds = format(day, 'yyyy-MM-dd');
      for (const pe of plannedExpenses) {
        if (!isOccurrence(pe, ds)) continue;
        const isDone = pe.completedDates.includes(ds);
        const isIncome = pe.type === 'income';
        if (isIncome) {
          incTotal += pe.amount;
          if (isDone) incDone += pe.amount; else incPend += pe.amount;
          if (!incByCat[pe.categoryId]) incByCat[pe.categoryId] = { total: 0, done: 0 };
          incByCat[pe.categoryId].total += pe.amount;
          if (isDone) incByCat[pe.categoryId].done += pe.amount;
        } else {
          expTotal += pe.amount;
          if (isDone) expDone += pe.amount; else expPend += pe.amount;
          if (!expByCat[pe.categoryId]) expByCat[pe.categoryId] = { total: 0, done: 0 };
          expByCat[pe.categoryId].total += pe.amount;
          if (isDone) expByCat[pe.categoryId].done += pe.amount;
        }
      }
    }

    // Add borrowed debt payments as planned expenses
    for (const debt of debts) {
      if (debt.direction !== 'borrowed') continue;
      // Scheduled (pending) payments with dueDate in period
      for (const sp of debt.scheduledPayments) {
        if (sp.dueDate >= periodStartStr && sp.dueDate <= periodEndStr) {
          expTotal += sp.amount;
          expPend += sp.amount;
          if (!expByCat['__debt__']) expByCat['__debt__'] = { total: 0, done: 0 };
          expByCat['__debt__'].total += sp.amount;
        }
      }
      // Actual payments made in period (completed)
      for (const p of debt.payments) {
        if (p.date >= periodStartStr && p.date <= periodEndStr) {
          expTotal += p.amount;
          expDone += p.amount;
          if (!expByCat['__debt__']) expByCat['__debt__'] = { total: 0, done: 0 };
          expByCat['__debt__'].total += p.amount;
          expByCat['__debt__'].done += p.amount;
        }
      }
    }

    const makeList = (byCat: Record<string, { total: number; done: number }>) =>
      Object.entries(byCat)
        .map(([catId, v]) => {
          if (catId === '__debt__') {
            return {
              catId,
              name: language === 'ru' ? 'Выплаты по долгам' : 'Debt Payments',
              icon: '💳',
              color: '#8B5CF6',
              ...v,
            };
          }
          const cat = categories.find((c) => c.id === catId);
          return { catId, name: language === 'ru' ? (cat?.name ?? '') : (cat?.nameEn ?? ''), icon: cat?.icon ?? '📌', color: cat?.color ?? '#94A3B8', ...v };
        })
        .sort((a, b) => b.total - a.total);

    return {
      expPlannedTotal: expTotal, expPlannedCompleted: expDone, expPlannedPending: expPend,
      expPlannedByCategory: makeList(expByCat),
      incPlannedTotal: incTotal, incPlannedCompleted: incDone, incPlannedPending: incPend,
      incPlannedByCategory: makeList(incByCat),
    };
  }, [periodDays, periodStartStr, periodEndStr, plannedExpenses, debts, categories, language]);

  const plannedTotal = expPlannedTotal + incPlannedTotal;

  const totalIncome = barData.reduce((s, d) => s + d.income, 0);
  const totalExpense = barData.reduce((s, d) => s + d.expense, 0);
  const net = totalIncome - totalExpense;
  const hasData = totalIncome > 0 || totalExpense > 0;

  // ── Previous period comparison ───────────────────────────────────────────────
  const prevPeriodTotals = useMemo(() => {
    const prevOffset = offset - 1;
    let prevStart: Date, prevEnd: Date;
    if (period === 'week') {
      const base = prevOffset >= 0
        ? addWeeks(startOfWeek(now, { weekStartsOn: 1 }), prevOffset)
        : subWeeks(startOfWeek(now, { weekStartsOn: 1 }), -prevOffset);
      prevStart = base;
      prevEnd = endOfWeek(base, { weekStartsOn: 1 });
    } else {
      const base = prevOffset >= 0
        ? addMonths(startOfMonth(now), prevOffset)
        : subMonths(startOfMonth(now), -prevOffset);
      prevStart = base;
      prevEnd = endOfMonth(base);
    }
    const prevStartStr = format(prevStart, 'yyyy-MM-dd');
    const prevEndStr = format(prevEnd, 'yyyy-MM-dd');
    let prevIncome = 0, prevExpense = 0;
    // O(transactions) single pass using date string comparison
    for (const tx of transactions) {
      if (tx.type === 'transfer') continue;
      if (tx.date < prevStartStr || tx.date > prevEndStr) continue;
      if (tx.type === 'income') prevIncome += tx.amount;
      else prevExpense += tx.amount;
    }
    for (const pe of plannedExpenses) {
      for (const ds of pe.completedDates) {
        if (ds >= prevStartStr && ds <= prevEndStr) {
          if (pe.type === 'income') prevIncome += pe.amount;
          else prevExpense += pe.amount;
        }
      }
    }
    return { prevIncome, prevExpense };
  }, [period, offset, transactions, plannedExpenses]);

  // ── Top expenses ─────────────────────────────────────────────────────────────
  const topExpenses = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'expense' && tx.date >= periodStartStr && tx.date <= periodEndStr)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [periodStartStr, periodEndStr, transactions]);

  // ── Trend helpers ────────────────────────────────────────────────────────────
  const calcPct = (curr: number, prev: number): number | null =>
    prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);

  const incomePct = calcPct(totalIncome, prevPeriodTotals.prevIncome);
  const expensePct = calcPct(totalExpense, prevPeriodTotals.prevExpense);
  const prevNet = prevPeriodTotals.prevIncome - prevPeriodTotals.prevExpense;
  const netPct = prevNet === 0 ? null : Math.round(((net - prevNet) / Math.abs(prevNet)) * 100);
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : null;
  const hasBalance = accountTrendData.accountList.length > 0;

  // ── Budget computations ──────────────────────────────────────────────────────
  const budgetProgress = useMemo(() => {
    const daysInPeriod = periodDays.length;
    const today = format(new Date(), 'yyyy-MM-dd');
    const daysElapsed = Math.max(1, periodDays.filter(d => format(d, 'yyyy-MM-dd') <= today).length);
    const daysLeft = Math.max(0, periodDays.filter(d => format(d, 'yyyy-MM-dd') > today).length);

    return budgets.map((b) => {
      // Regular expense transactions
      const periodTx = transactions.filter((tx) => {
        if (tx.type !== 'expense' || tx.categoryId !== b.categoryId) return false;
        const d = parseISO(tx.date);
        return d >= periodStart && d <= periodEnd;
      });
      const txSpent = periodTx.reduce((s, tx) => s + tx.amount, 0);

      // Completed planned expenses in period (BUG FIX)
      let plannedSpent = 0;
      for (const pe of plannedExpenses) {
        if (pe.categoryId !== b.categoryId) continue;
        if (pe.type === 'income') continue;
        for (const ds of pe.completedDates) {
          if (ds >= periodStartStr && ds <= periodEndStr) {
            plannedSpent += pe.amount;
          }
        }
      }

      const catSpent = txSpent + plannedSpent;
      const pct = b.limit > 0 ? Math.round((catSpent / b.limit) * 100) : 0;
      const remaining = b.limit - catSpent;
      const isOver = remaining < 0;
      const isWarning = !isOver && pct >= 80;

      // Projected spend (only for current period)
      const dailyRate = daysElapsed > 0 ? catSpent / daysElapsed : 0;
      const projectedSpent = isCurrentPeriod ? Math.round(dailyRate * daysInPeriod) : null;
      const safeDaily = (isCurrentPeriod && daysLeft > 0 && !isOver) ? Math.floor(remaining / daysLeft) : null;

      // Weekly spending mini-chart (group by week within period)
      const weeklyData: { label: string; amount: number }[] = [];
      let wStart = periodStart;
      let wIdx = 1;
      while (wStart <= periodEnd) {
        const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
        const actualEnd = wEnd > periodEnd ? periodEnd : wEnd;
        const wStartStr = format(wStart, 'yyyy-MM-dd');
        const wEndStr = format(actualEnd, 'yyyy-MM-dd');
        let wAmount = 0;
        transactions.forEach((tx) => {
          if (tx.type === 'expense' && tx.categoryId === b.categoryId && tx.date >= wStartStr && tx.date <= wEndStr) {
            wAmount += tx.amount;
          }
        });
        plannedExpenses.forEach((pe) => {
          if (pe.categoryId === b.categoryId && (pe.type ?? 'expense') === 'expense') {
            pe.completedDates.forEach((ds) => {
              if (ds >= wStartStr && ds <= wEndStr) wAmount += pe.amount;
            });
          }
        });
        weeklyData.push({ label: `${language === 'ru' ? 'Нед' : 'W'}${wIdx}`, amount: wAmount });
        wStart = addDays(actualEnd, 1);
        wIdx++;
      }

      return { ...b, spent: catSpent, txSpent, plannedSpent, pct, remaining, isOver, isWarning, projectedSpent, safeDaily, daysLeft, weeklyData };
    }).sort((a, b) => {
      if (a.isOver && !b.isOver) return -1;
      if (!a.isOver && b.isOver) return 1;
      if (a.isWarning && !b.isWarning) return -1;
      if (!a.isWarning && b.isWarning) return 1;
      return b.pct - a.pct;
    });
  }, [budgets, transactions, plannedExpenses, periodStart, periodEnd, periodDays, periodStartStr, periodEndStr, isCurrentPeriod]);

  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpentBudget = budgetProgress.reduce((s, b) => s + b.spent, 0);
  const overallPct = totalBudget > 0 ? Math.round((totalSpentBudget / totalBudget) * 100) : 0;

  const getCat = (id: string) => categories.find((c) => c.id === id);
  const getColor = (b: typeof budgetProgress[0]) =>
    b.isOver ? '#EF4444' : b.isWarning ? '#F59E0B' : '#10B981';

  // ── Budget form ──────────────────────────────────────────────────────────────
  const openAdd = () => { setSelectedCat(''); setLimit(''); setPickerError(''); setShowAdd(true); };
  const openEdit = (b: Budget) => { setSelectedCat(b.categoryId); setLimit(String(b.limit)); setPickerError(''); setEditingBudget(b); };

  const validateBudget = () => {
    if (!selectedCat) { setPickerError(t.categoryRequired); return false; }
    if (!limit || parseFloat(limit) <= 0) { setPickerError(t.amountRequired); return false; }
    return true;
  };

  const handleSaveBudget = () => {
    if (!validateBudget()) return;
    const data = { categoryId: selectedCat, limit: parseFloat(limit.replace(',', '.')), period: 'monthly' as const, currency: dc };
    if (editingBudget) { updateBudget(editingBudget.id, data); setEditingBudget(null); }
    else { addBudget(data); setShowAdd(false); setSelectedCat(''); setLimit(''); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const slideStyle: React.CSSProperties = slideDir
    ? { animation: `slideIn${slideDir === 'left' ? 'Left' : 'Right'} 0.25s ease` }
    : {};

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3 text-xs" style={{ background: '#1A1A32', border: '1px solid #1E2A40' }}>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.fill }}>
            {p.name === 'income' ? t.incomeLabel : t.expenseLabel}: {p.value.toLocaleString('ru-RU')}
          </div>
        ))}
      </div>
    );
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    return (
      <div className="rounded-xl p-2.5 text-xs" style={{ background: '#1A1A32', border: '1px solid #1E2A40' }}>
        <p style={{ color: item.color }} className="font-semibold mb-0.5">{item.name}</p>
        <p className="text-slate-300">{formatAmount(item.value, dc)}</p>
      </div>
    );
  };

  const mainContent = (
    <div className="page-enter pb-32" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">{t.statistics}</h1>
        <button
          onClick={handleRefresh}
          className="w-8 h-8 rounded-xl flex items-center justify-center active-scale"
          style={{ background: '#1E1E38' }}
          title={language === 'ru' ? 'Обновить' : 'Refresh'}
        >
          <RefreshCw
            size={14}
            className="text-slate-400"
            style={isRefreshing ? { animation: 'spinOnce 0.7s linear' } : {}}
          />
        </button>
      </div>

      {/* View toggle */}
      <div className="mx-5 mb-4 flex rounded-2xl p-1 gap-1" style={{ background: '#131325' }}>
        {([['stats', t.statistics], ['budgets', t.budgetsTitle]] as [View, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => { setView(v); setOffset(0); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active-scale"
            style={{
              background: view === v
                ? v === 'stats'
                  ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                  : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
                : 'transparent',
              color: view === v ? 'white' : '#64748B',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Period navigator */}
      <div className="mx-5 mb-4 flex items-center justify-between px-1">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active-scale" style={{ background: '#1E1E38' }}>
          <ChevronLeft size={18} className="text-slate-300" />
        </button>
        <div className="flex items-center gap-2">
          <p className="text-base font-semibold text-slate-100">{periodLabel}</p>
          {!isCurrentPeriod && (
            <button
              onClick={() => { setOffset(0); setSlideDir(null); }}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium active-scale"
              style={{ background: 'rgba(59,130,246,0.2)', color: '#60A5FA' }}
            >
              {language === 'ru' ? 'Сейчас' : 'Now'}
            </button>
          )}
        </div>
        <button onClick={() => navigate(1)} className="w-9 h-9 rounded-xl flex items-center justify-center active-scale" style={{ background: '#1E1E38' }}>
          <ChevronRight size={18} className="text-slate-300" />
        </button>
      </div>

      <div key={`${view}-${period}-${offset}-${refreshKey}`} style={slideStyle}>

        {/* ════════════════════════════════════════════════════════ */}
        {/* STATS VIEW                                              */}
        {/* ════════════════════════════════════════════════════════ */}
        {view === 'stats' && (
          <>
            {/* Period toggle */}
            <div className="mx-5 mb-4 flex rounded-2xl p-1 gap-1" style={{ background: '#131325' }}>
              {([['week', t.week], ['month', t.month]] as [Period, string][]).map(([p, label]) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setOffset(0); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active-scale"
                  style={{ background: period === p ? '#3B82F6' : 'transparent', color: period === p ? 'white' : '#64748B' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Summary Cards — clickable */}
            <div className="px-5 grid grid-cols-3 gap-2 mb-2">
              <SummaryCard
                label={t.incomeLabel}
                value={formatAmount(totalIncome, dc)}
                color="#10B981"
                icon={<TrendingUp size={13} />}
                trend={{ pct: incomePct, higherIsBetter: true }}
                onClick={() => openDrill('income', t.incomeLabel, '#10B981')}
              />
              <SummaryCard
                label={t.expenseLabel}
                value={formatAmount(totalExpense, dc)}
                color="#EF4444"
                icon={<TrendingDown size={13} />}
                trend={{ pct: expensePct, higherIsBetter: false }}
                onClick={() => openDrill('expense', t.expenseLabel, '#EF4444')}
              />
              <SummaryCard
                label={t.netChange}
                value={(net >= 0 ? '+' : '') + formatAmount(net, dc)}
                color={net >= 0 ? '#3B82F6' : '#F59E0B'}
                icon={<Minus size={13} />}
                trend={{ pct: netPct, higherIsBetter: true }}
              />
            </div>

            {/* Savings rate — always shown */}
            <div className="px-5 mb-4">
              <span className="text-[11px] text-slate-500">
                {language === 'ru' ? 'Норма сбережений:' : 'Savings rate:'}
              </span>
              {' '}
              <span className="text-[11px] font-semibold" style={{ color: savingsRate !== null ? (savingsRate >= 0 ? '#10B981' : '#EF4444') : '#64748B' }}>
                {savingsRate !== null ? `${savingsRate}%` : '—'}
              </span>
            </div>

            {/* Planned Expenses block */}
            <PlannedBlock
              title={language === 'ru' ? 'Запланированные расходы' : 'Planned Expenses'}
              accentColor="#EF4444"
              total={expPlannedTotal}
              completed={expPlannedCompleted}
              pending={expPlannedPending}
              byCategory={expPlannedByCategory}
              filterType="expense"
              dc={dc}
              language={language}
              onCategoryClick={(name, color, catId) => openDrill('expense', name, color, catId)}
              formatAmount={formatAmount}
              isCollapsed={isCollapsed('planned-exp')}
              onToggle={() => toggleSection('planned-exp')}
            />

            {/* Planned Income block */}
            <PlannedBlock
              title={language === 'ru' ? 'Запланированные доходы' : 'Planned Income'}
              accentColor="#10B981"
              total={incPlannedTotal}
              completed={incPlannedCompleted}
              pending={incPlannedPending}
              byCategory={incPlannedByCategory}
              filterType="income"
              dc={dc}
              language={language}
              onCategoryClick={(name, color, catId) => openDrill('income', name, color, catId)}
              formatAmount={formatAmount}
              isCollapsed={isCollapsed('planned-inc')}
              onToggle={() => toggleSection('planned-inc')}
            />

            {/* Balance Forecast */}
            <BalanceForecast />

            {/* Bar chart */}
            <div className="mx-5 mb-5 rounded-2xl overflow-hidden" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
              <button
                onClick={() => toggleSection('bar')}
                className="w-full flex items-center justify-between px-4 py-3 active-scale"
              >
                <h3 className="text-sm font-semibold text-slate-300">{t.incomeLabel} / {t.expenseLabel}</h3>
                <div className="flex items-center gap-2">
                  {!hasData && !isCollapsed('bar') && <span className="text-sm text-slate-500">—</span>}
                  <ChevronDown size={15} className="text-slate-500 transition-transform" style={{ transform: isCollapsed('bar') ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                </div>
              </button>
              {!isCollapsed('bar') && hasData && (
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-end gap-3 mb-3">
                    <button onClick={() => openDrill('income', t.incomeLabel, '#10B981')} className="flex items-center gap-1 text-[10px] text-emerald-400 active-scale">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{t.incomeLabel}
                    </button>
                    <button onClick={() => openDrill('expense', t.expenseLabel, '#EF4444')} className="flex items-center gap-1 text-[10px] text-red-400 active-scale">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />{t.expenseLabel}
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} barGap={2} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2A40" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={35} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="income" />
                      <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="expense" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Balance trend — month view */}
            {period === 'month' && (
              <div className="mx-5 mb-5 rounded-2xl overflow-hidden" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
                <button
                  onClick={() => toggleSection('trend')}
                  className="w-full flex items-center justify-between px-4 py-3 active-scale"
                >
                  <h3 className="text-sm font-semibold text-slate-300">{t.balanceTrend}</h3>
                  <div className="flex items-center gap-2">
                    {!hasBalance && !isCollapsed('trend') && <span className="text-sm text-slate-500">—</span>}
                    <ChevronDown size={15} className="text-slate-500 transition-transform" style={{ transform: isCollapsed('trend') ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                  </div>
                </button>
                {!isCollapsed('trend') && hasBalance && (
                  <div className="px-4 pb-4">
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={accountTrendData.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E2A40" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} width={40}
                          tickFormatter={(v) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                        <Tooltip content={({ active, payload }: any) =>
                          active && payload?.length ? (
                            <div className="rounded-xl p-2 text-xs space-y-1" style={{ background: '#1A1A32', border: '1px solid #1E2A40' }}>
                              {payload.map((p: any) => (
                                <div key={p.dataKey} className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                                  <span style={{ color: p.color }}>{p.name}: {p.value.toLocaleString('ru-RU')}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        />
                        {accountTrendData.accountList.map(account => (
                          <Line
                            key={account.id}
                            type="monotone"
                            dataKey={account.id}
                            name={account.name}
                            stroke={account.color}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    {/* Account legend */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
                      {accountTrendData.accountList.map(account => (
                        <div key={account.id} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: account.color }} />
                          <span className="text-[11px] text-slate-400">{account.name}</span>
                          <span className="text-[11px] font-semibold" style={{ color: account.color }}>
                            {formatAmount(account.balance, dc)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pie chart */}
            <div className="mx-5 mb-5 rounded-2xl overflow-hidden" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
              <button
                onClick={() => toggleSection('pie')}
                className="w-full flex items-center justify-between px-4 py-3 active-scale"
              >
                <h3 className="text-sm font-semibold text-slate-300">{t.byCategory}</h3>
                <div className="flex items-center gap-2">
                  {pieData.length === 0 && !isCollapsed('pie') && <span className="text-sm text-slate-500">—</span>}
                  <ChevronDown size={15} className="text-slate-500 transition-transform" style={{ transform: isCollapsed('pie') ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                </div>
              </button>
              {!isCollapsed('pie') && pieData.length > 0 && (
                <div className="px-4 pb-4 flex items-center gap-4">
                  <div style={{ cursor: 'pointer' }}>
                    <PieChart width={140} height={140}>
                      <Pie
                        data={pieData}
                        cx={65} cy={65}
                        innerRadius={40} outerRadius={65}
                        dataKey="value"
                        paddingAngle={2}
                        onClick={(data: any) => {
                          const entry = pieData.find((d) => d.catId === data.catId);
                          if (entry) openDrill('expense', entry.name, entry.color, entry.catId);
                        }}
                      >
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={pieData[idx].color} style={{ cursor: 'pointer', outline: 'none' }} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    {pieData.map((item, idx) => {
                      const pct = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0;
                      return (
                        <button
                          key={idx}
                          onClick={() => openDrill('expense', item.name, item.color, item.catId)}
                          className="w-full flex items-center gap-2 active-scale text-left"
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                          <span className="text-xs text-slate-400 flex-1 truncate">{item.name}</span>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-semibold text-slate-300">{pct}%</p>
                            <p className="text-[10px] text-slate-500">{formatAmount(item.value, dc)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Top expenses */}
            <div className="mx-5 mb-5 rounded-2xl overflow-hidden" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
              <button
                onClick={() => toggleSection('top')}
                className="w-full flex items-center justify-between px-4 py-3 active-scale"
              >
                <h3 className="text-sm font-semibold text-slate-300">
                  {language === 'ru' ? 'Крупные расходы' : 'Top Expenses'}
                </h3>
                <div className="flex items-center gap-2">
                  {topExpenses.length === 0 && !isCollapsed('top') && <span className="text-sm text-slate-500">—</span>}
                  <ChevronDown size={15} className="text-slate-500 transition-transform" style={{ transform: isCollapsed('top') ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
                </div>
              </button>
              {!isCollapsed('top') && topExpenses.map((tx, idx) => {
                const cat = categories.find((c) => c.id === tx.categoryId);
                const catName = language === 'ru' ? cat?.name : cat?.nameEn;
                return (
                  <button
                    key={tx.id}
                    onClick={() => openDrill('expense', catName ?? '—', cat?.color ?? '#94A3B8', tx.categoryId)}
                    className="w-full flex items-center gap-3 px-4 py-3 active-scale text-left"
                    style={{ borderTop: '1px solid #1E2A40' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cat?.color ?? '#94A3B8'}20` }}>
                      <span className="text-sm">{cat?.icon ?? '📌'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">
                        {tx.description || catName || '—'}
                      </p>
                      <p className="text-[10px] text-slate-500">{tx.date}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-bold" style={{ color: '#EF4444' }}>
                        -{formatAmount(tx.amount, dc)}
                      </span>
                      <ChevronRightSm size={12} className="text-slate-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* BUDGETS VIEW                                            */}
        {/* ════════════════════════════════════════════════════════ */}
        {view === 'budgets' && (
          <>
            <div className="mx-5 mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-400">{language === 'ru' ? 'Лимиты на месяц' : 'Monthly limits'}</p>
              <button onClick={openAdd} className="w-9 h-9 rounded-full flex items-center justify-center active-scale" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                <Plus size={18} color="white" />
              </button>
            </div>

            {budgets.length > 0 && (() => {
              const overCount = budgetProgress.filter(b => b.isOver).length;
              const warnCount = budgetProgress.filter(b => b.isWarning).length;
              const okCount = budgetProgress.filter(b => !b.isOver && !b.isWarning).length;
              const overallColor = overCount > 0 ? '#EF4444' : warnCount > 0 ? '#F59E0B' : '#10B981';
              return (
                <div className="mx-5 mb-4 rounded-2xl p-4" style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-300">{language === 'ru' ? 'Общий бюджет' : 'Total budget'}</span>
                    <span className="text-sm font-bold" style={{ color: overallColor }}>{overallPct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: '#1E2A40' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(overallPct, 100)}%`, background: overallColor }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mb-3">
                    <span>{formatAmount(totalSpentBudget, dc)} {language === 'ru' ? 'потрачено' : 'spent'}</span>
                    <span>{formatAmount(Math.max(0, totalBudget - totalSpentBudget), dc)} {language === 'ru' ? 'осталось' : 'left'}</span>
                  </div>
                  {/* Status summary */}
                  <div className="flex gap-2">
                    {overCount > 0 && (
                      <div className="flex-1 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5" style={{ background: 'rgba(239,68,68,0.12)' }}>
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[11px] text-red-400 font-medium">{overCount} {language === 'ru' ? 'превышен' : 'over'}</span>
                      </div>
                    )}
                    {warnCount > 0 && (
                      <div className="flex-1 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5" style={{ background: 'rgba(245,158,11,0.12)' }}>
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-[11px] text-amber-400 font-medium">{warnCount} {language === 'ru' ? 'внимание' : 'warning'}</span>
                      </div>
                    )}
                    {okCount > 0 && (
                      <div className="flex-1 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5" style={{ background: 'rgba(16,185,129,0.12)' }}>
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[11px] text-emerald-400 font-medium">{okCount} {language === 'ru' ? 'в норме' : 'on track'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {budgetProgress.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-slate-300 mb-2">{t.noBudgets}</h3>
                <p className="text-slate-500 text-sm mb-6">{language === 'ru' ? 'Установите лимиты на категории, чтобы контролировать траты' : 'Set spending limits per category to track expenses'}</p>
                <button onClick={openAdd} className="px-6 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>{t.addBudget}</button>
              </div>
            ) : (
              <div className="mx-5 space-y-3 pb-4">
                {budgetProgress.map((b) => {
                  const cat = getCat(b.categoryId);
                  const color = getColor(b);
                  const catName = language === 'ru' ? cat?.name : cat?.nameEn;
                  const hasBothSources = b.txSpent > 0 && b.plannedSpent > 0;
                  return (
                    <div key={b.id} className="rounded-2xl overflow-hidden" style={{ background: '#0E0E1C', border: `1px solid ${b.isOver ? 'rgba(239,68,68,0.35)' : b.isWarning ? 'rgba(245,158,11,0.25)' : '#1E2A40'}` }}>
                      <div className="p-4">
                        {/* Header row */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cat?.color ?? '#94A3B8'}22` }}>
                            <span className="text-lg">{cat?.icon ?? '📌'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-200 truncate">{catName}</p>
                              {b.isOver && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0" style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>⚠ {t.overBudget}</span>
                              )}
                              {b.isWarning && !b.isOver && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>~ {language === 'ru' ? 'Внимание' : 'Warning'}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{language === 'ru' ? 'Лимит: ' : 'Limit: '}{formatAmount(b.limit, dc)}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => openEdit(b)} className="w-7 h-7 rounded-lg flex items-center justify-center active-scale" style={{ background: '#1E1E38' }}><Pencil size={12} className="text-slate-400" /></button>
                            <button onClick={() => setDeletingBudget(b)} className="w-7 h-7 rounded-lg flex items-center justify-center active-scale" style={{ background: '#1E1E38' }}><Trash2 size={12} color="#EF4444" /></button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span style={{ color }}>{formatAmount(b.spent, dc)} {language === 'ru' ? 'потрачено' : 'spent'}</span>
                            <span className={b.remaining < 0 ? 'text-red-400' : 'text-slate-400'}>
                              {b.remaining >= 0
                                ? `${formatAmount(b.remaining, dc)} ${language === 'ru' ? 'осталось' : 'left'}`
                                : `${language === 'ru' ? 'Перерасход ' : 'Over '}${formatAmount(Math.abs(b.remaining), dc)}`}
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#1E2A40' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(b.pct, 100)}%`, background: color }} />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-slate-600">{b.pct}% {language === 'ru' ? 'использовано' : 'used'}</span>
                            {b.projectedSpent !== null && b.projectedSpent > b.limit && !b.isOver && (
                              <span className="text-[10px]" style={{ color: '#F59E0B' }}>
                                {language === 'ru' ? `Прогноз: ${formatAmount(b.projectedSpent, dc)}` : `Projected: ${formatAmount(b.projectedSpent, dc)}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Breakdown: planned vs regular */}
                        {hasBothSources && (
                          <div className="mt-3 flex gap-3 pt-3" style={{ borderTop: '1px solid #1E2A40' }}>
                            <div className="flex-1 text-center">
                              <p className="text-[10px] text-slate-500 mb-0.5">{language === 'ru' ? 'Обычные' : 'Regular'}</p>
                              <p className="text-xs font-semibold text-slate-300">{formatAmount(b.txSpent, dc)}</p>
                            </div>
                            <div className="w-px" style={{ background: '#1E2A40' }} />
                            <div className="flex-1 text-center">
                              <p className="text-[10px] text-slate-500 mb-0.5">{language === 'ru' ? 'Плановые' : 'Planned'}</p>
                              <p className="text-xs font-semibold" style={{ color: '#8B5CF6' }}>{formatAmount(b.plannedSpent, dc)}</p>
                            </div>
                            {b.safeDaily !== null && b.safeDaily >= 0 && (
                              <>
                                <div className="w-px" style={{ background: '#1E2A40' }} />
                                <div className="flex-1 text-center">
                                  <p className="text-[10px] text-slate-500 mb-0.5">{language === 'ru' ? 'В день' : 'Per day'}</p>
                                  <p className="text-xs font-semibold text-emerald-400">{formatAmount(b.safeDaily, dc)}</p>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Safe daily spend (if no breakdown shown) */}
                        {!hasBothSources && b.safeDaily !== null && b.safeDaily >= 0 && b.spent > 0 && (
                          <div className="mt-2.5 flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500">{language === 'ru' ? 'Можно тратить в день:' : 'Safe to spend daily:'}</span>
                            <span className="text-[11px] font-semibold text-emerald-400">{formatAmount(b.safeDaily, dc)}</span>
                          </div>
                        )}

                        {/* Mini weekly bar chart */}
                        {b.weeklyData.length > 1 && b.spent > 0 && (() => {
                          const chartKey = `chart-${b.id}`;
                          const chartCollapsed = isCollapsed(chartKey);
                          const maxAmt = Math.max(...b.weeklyData.map(w => w.amount), 1);
                          const weeklyLimit = b.limit / b.weeklyData.length;
                          return (
                            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #1E2A40' }}>
                              <button
                                onClick={() => toggleSection(chartKey)}
                                className="w-full flex items-center justify-between mb-2 active-scale"
                              >
                                <p className="text-[10px] text-slate-500">{language === 'ru' ? 'По неделям' : 'By week'}</p>
                                <ChevronDown
                                  size={12}
                                  className="text-slate-600 transition-transform"
                                  style={{ transform: chartCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                                />
                              </button>
                              {!chartCollapsed && (
                                <div className="flex items-end gap-1 h-10">
                                  {b.weeklyData.map((w, wi) => {
                                    const barH = maxAmt > 0 ? Math.round((w.amount / maxAmt) * 100) : 0;
                                    const barColor = w.amount > weeklyLimit ? '#EF4444' : w.amount > weeklyLimit * 0.8 ? '#F59E0B' : color;
                                    return (
                                      <div key={wi} className="flex-1 flex flex-col items-center gap-0.5">
                                        <div className="w-full rounded-t-sm" style={{ height: `${Math.max(barH, 4)}%`, background: barColor, minHeight: w.amount > 0 ? 3 : 0, maxHeight: '100%' }} />
                                        <span className="text-[9px] text-slate-600">{w.label}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* View transactions link */}
                      {b.spent > 0 && (
                        <button
                          onClick={() => openDrill('expense', catName ?? '—', cat?.color ?? '#94A3B8', b.categoryId)}
                          className="w-full flex items-center justify-between px-4 py-2.5 active-scale"
                          style={{ borderTop: '1px solid #1E2A40', background: '#0A0A18' }}
                        >
                          <span className="text-xs text-slate-500">
                            {language === 'ru' ? 'Посмотреть операции' : 'View transactions'}
                          </span>
                          <ChevronRightSm size={12} className="text-slate-600" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spinOnce { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Drill-down modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!drillDown}
        onClose={() => setDrillDown(null)}
        title={drillDown?.title ?? ''}
      >
        <div className="px-5 pb-8">
          {/* Summary row */}
          <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid #1E2A40' }}>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{periodLabel}</p>
              <p className="text-xs text-slate-500">
                {drillItems.length}{' '}
                {language === 'ru'
                  ? drillItems.length === 1 ? 'операция' : drillItems.length < 5 ? 'операции' : 'операций'
                  : drillItems.length === 1 ? 'transaction' : 'transactions'}
              </p>
            </div>
            <p className="text-xl font-bold" style={{ color: drillDown?.color }}>
              {drillDown?.filterType === 'expense' ? '-' : '+'}{formatAmount(drillTotal, dc)}
            </p>
          </div>

          {drillItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-slate-500 text-sm">{t.noData}</p>
            </div>
          ) : (
            <div>
              {drillItems.map((item, idx) => {
                const cat = categories.find((c) => c.id === item.categoryId);
                const catName = language === 'ru' ? cat?.name : cat?.nameEn;
                const isPlanned = item.kind === 'planned';
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-3"
                    style={{ borderTop: idx > 0 ? '1px solid #1E2A40' : 'none' }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative" style={{ background: `${cat?.color ?? '#94A3B8'}20` }}>
                      <span className="text-base">{cat?.icon ?? '📌'}</span>
                      {isPlanned && (
                        <span className="absolute -top-1 -right-1 text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: '#8B5CF6' }}>📅</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {item.description || catName || '—'}
                        </p>
                        {isPlanned && (
                          <span className="text-[9px] px-1 py-0.5 rounded shrink-0 font-medium" style={{ background: 'rgba(139,92,246,0.2)', color: '#A78BFA' }}>
                            {language === 'ru' ? 'план' : 'plan'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {item.date}
                        {item.description && catName && ` · ${catName}`}
                      </p>
                    </div>
                    <span
                      className="text-sm font-bold flex-shrink-0"
                      style={{ color: drillDown?.color }}
                    >
                      {drillDown?.filterType === 'expense' ? '-' : '+'}{formatAmount(item.amount, dc)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Add/Edit Budget Modal */}
      <Modal isOpen={showAdd || !!editingBudget} onClose={() => { setShowAdd(false); setEditingBudget(null); }} title={editingBudget ? t.editBudget : t.addBudget}>
        <div className="px-5 pb-8 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.budgetCategory}</label>
            <CategoryPicker selectedId={selectedCat} onChange={(id) => { setSelectedCat(id); setPickerError(''); }} type="expense" error={pickerError} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{t.budgetLimit} ({dc})</label>
            <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0" className="w-full px-4 py-3 text-2xl font-bold" style={{ background: '#1E1E38', border: '1px solid #1E2A40', borderRadius: 12, color: '#EF4444' }} autoFocus />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowAdd(false); setEditingBudget(null); }} className="flex-1 py-3.5 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>{t.cancel}</button>
            <button onClick={handleSaveBudget} className="flex-1 py-3.5 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>{t.save}</button>
          </div>
        </div>
      </Modal>

      {/* Delete Budget */}
      <Modal isOpen={!!deletingBudget} onClose={() => setDeletingBudget(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">{language === 'ru' ? 'Лимит бюджета будет удалён безвозвратно.' : 'Budget limit will be permanently removed.'}</p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingBudget(null)} className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale" style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>{t.cancel}</button>
            <button onClick={() => { if (deletingBudget) { deleteBudget(deletingBudget.id); setDeletingBudget(null); } }} className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>{t.delete}</button>
          </div>
        </div>
      </Modal>
    </div>
  );

  if (!canViewStatistics) {
    return <ProGate feature="Статистика" featureEn="Statistics">{mainContent}</ProGate>;
  }
  return mainContent;
}

// ── PlannedBlock ─────────────────────────────────────────────────────────────

type PlannedItem = { catId: string; name: string; icon: string; color: string; total: number; done: number };

function PlannedBlock({
  title, accentColor, total, completed, pending, byCategory,
  filterType, dc, language, onCategoryClick, formatAmount: fmt,
  isCollapsed: collapsed, onToggle,
}: {
  title: string;
  accentColor: string;
  total: number;
  completed: number;
  pending: number;
  byCategory: PlannedItem[];
  filterType: 'income' | 'expense';
  dc: any;
  language: string;
  onCategoryClick: (name: string, color: string, catId: string) => void;
  formatAmount: (amount: number, currency: any) => string;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="mx-5 mb-3 rounded-2xl overflow-hidden" style={{ border: `1px solid ${accentColor}18` }}>
        <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between active-scale" style={{ background: '#0E0E1C' }}>
          <div className="flex items-center gap-2">
            <CalendarClock size={15} color={accentColor} style={{ opacity: 0.45 }} />
            <span className="text-sm font-semibold text-slate-500">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">—</span>
            <ChevronDown size={15} className="text-slate-600 transition-transform" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-5 rounded-2xl overflow-hidden" style={{ border: `1px solid ${accentColor}30` }}>
      {/* Header — clickable to collapse */}
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between active-scale" style={{ background: '#0E0E1C' }}>
        <div className="flex items-center gap-2">
          <CalendarClock size={15} color={accentColor} />
          <span className="text-sm font-semibold text-slate-200">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: accentColor }}>{fmt(total, dc)}</span>
          <ChevronDown size={15} className="text-slate-500 transition-transform" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
        </div>
      </button>
      {/* Body — hidden when collapsed */}
      {!collapsed && (
        <>
          {/* Progress */}
          <div className="px-4 py-3" style={{ background: '#0A0A18', borderTop: `1px solid ${accentColor}20` }}>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">{language === 'ru' ? 'Запланировано' : 'Planned'}: {fmt(total, dc)}</span>
              <span className="text-slate-400">{language === 'ru' ? 'Осталось' : 'Remaining'}: {fmt(pending, dc)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1E2A40' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: '#10B981' }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 text-right">
              {pct}% {language === 'ru' ? 'выполнено' : 'completed'}
            </p>
          </div>
          {/* Categories */}
          {byCategory.length > 0 && (
            <div style={{ borderTop: `1px solid ${accentColor}20` }}>
              {byCategory.slice(0, 4).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onCategoryClick(item.name, item.color, item.catId)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 active-scale text-left"
                  style={{ background: '#0E0E1C', borderTop: idx > 0 ? '1px solid #1E2A40' : 'none' }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}20` }}>
                    <span className="text-sm">{item.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{item.name}</p>
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: '#1E2A40' }}>
                      <div className="h-full rounded-full" style={{ width: item.total > 0 ? `${Math.round((item.done / item.total) * 100)}%` : '0%', background: item.color }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold" style={{ color: item.color }}>{fmt(item.total, dc)}</p>
                    <p className="text-[10px] text-slate-500">
                      {item.done > 0 ? `✓ ${fmt(item.done, dc)}` : language === 'ru' ? 'не выполнено' : 'pending'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── SummaryCard ──────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, color, icon, trend, onClick,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
  trend?: { pct: number | null; higherIsBetter?: boolean };
  onClick?: () => void;
}) {
  const trendColor = trend?.pct == null
    ? null
    : trend.higherIsBetter
      ? (trend.pct >= 0 ? '#10B981' : '#EF4444')
      : (trend.pct <= 0 ? '#10B981' : '#EF4444');

  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-3 text-left w-full"
      style={{
        background: '#0E0E1C',
        border: '1px solid #1E2A40',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-center gap-1 mb-1.5" style={{ color }}>
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xs font-bold text-slate-200 leading-tight break-all">{value}</p>
      {trend?.pct != null && (
        <div className="flex items-center gap-0.5 mt-1">
          {trend.pct >= 0
            ? <ArrowUp size={9} color={trendColor!} />
            : <ArrowDown size={9} color={trendColor!} />}
          <span className="text-[9px] font-medium" style={{ color: trendColor! }}>
            {Math.abs(trend.pct)}%
          </span>
        </div>
      )}
    </button>
  );
}
