import { useState, useMemo } from 'react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { TrendingUp, TrendingDown, Settings, Trash2, ChevronRight, ArrowLeftRight, Pencil, RefreshCw, RotateCcw } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../translations';
import { formatAmount, getUpcomingExpenses } from '../utils';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';
import TransferForm from '../components/TransferForm';
import EditDebtPaymentForm from '../components/EditDebtPaymentForm';
import PlannedExpenseForm from '../components/PlannedExpenseForm';
import UpcomingRow from '../components/UpcomingRow';
import { Transaction, Debt, DebtPayment, PlannedExpense, ScheduledPayment, Category, Account } from '../types';
import { useNavigate } from 'react-router-dom';

export default function DashboardMobile() {
  const { language, accounts, transactions, categories, plannedExpenses, defaultCurrency, deleteTransaction, addTransaction, deletePlannedExpense, budgets, debts, deleteDebtPayment, revertDebtPaymentToScheduled, togglePlannedCompleted, markPlannedCompletedNoDeduction, markScheduledCompletedNoDeduction, unmarkScheduledCompleted, markScheduledAsPaid } = useStore();
  const t = translations[language];
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transaction | null>(null);
  const [editingPe, setEditingPe] = useState<PlannedExpense | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [editingDebtPayment, setEditingDebtPayment] = useState<{ payment: DebtPayment; debt: Debt } | null>(null);
  const [deletingDebtPayment, setDeletingDebtPayment] = useState<{ debtId: string; paymentId: string } | null>(null);
  const [showAllPlanned, setShowAllPlanned] = useState(false);
  const [reversingTx, setReversingTx] = useState<Transaction | null>(null);
  const [deletingPe, setDeletingPe] = useState<{ id: string; date: string } | null>(null);
  const [revertingDebtPayment, setRevertingDebtPayment] = useState<{ debtId: string; paymentId: string } | null>(null);

  const now = useMemo(() => new Date(), []);
  const { monthStart, monthEnd, monthStartStr, monthEndStr } = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      monthStart: start,
      monthEnd: end,
      monthStartStr: format(start, 'yyyy-MM-dd'),
      monthEndStr: format(end, 'yyyy-MM-dd'),
    };
  }, [now]);

  const { monthIncome, monthExpense } = useMemo(() => {
    let income = 0, expense = 0;
    for (const tx of transactions) {
      if (tx.date < monthStartStr || tx.date > monthEndStr) continue;
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    }
    return { monthIncome: income, monthExpense: expense };
  }, [transactions, monthStartStr, monthEndStr]);

  const { completedExpenseAmt, completedIncomeAmt } = useMemo(() => {
    let expAmt = 0, incAmt = 0;
    for (const pe of plannedExpenses) {
      const isIncome = pe.type === 'income';
      for (const d of pe.completedDates) {
        if (d >= monthStartStr && d <= monthEndStr) {
          if (isIncome) incAmt += pe.amount;
          else expAmt += pe.amount;
        }
      }
    }
    return { completedExpenseAmt: expAmt, completedIncomeAmt: incAmt };
  }, [plannedExpenses, monthStartStr, monthEndStr]);

  const totalMonthExpense = monthExpense + completedExpenseAmt;
  const totalMonthIncome = monthIncome + completedIncomeAmt;

  const upcomingPlanned = useMemo(() => getUpcomingExpenses(plannedExpenses, 30), [plannedExpenses]);

  const todayStr = format(now, 'yyyy-MM-dd');
  const upcomingDebtPayments = useMemo(() => {
    return debts
      .filter((d) => d.status === 'active')
      .flatMap((d) =>
        d.scheduledPayments
          .filter((sp) => sp.dueDate >= todayStr && !sp.paidDate && !sp.completedDates?.includes(sp.dueDate))
          .map((sp) => ({ debt: d, payment: sp }))
      )
      .sort((a, b) => a.payment.dueDate.localeCompare(b.payment.dueDate));
  }, [debts, todayStr]);

  type UpcomingItem =
    | { kind: 'planned'; expense: ReturnType<typeof getUpcomingExpenses>[0]['expense']; date: string }
    | { kind: 'debt'; payment: typeof upcomingDebtPayments[0]['payment']; debt: typeof upcomingDebtPayments[0]['debt']; date: string };

  const upcoming = useMemo<UpcomingItem[]>(() => {
    const items: UpcomingItem[] = [
      ...upcomingPlanned.map((u) => ({ kind: 'planned' as const, expense: u.expense, date: u.date })),
      ...upcomingDebtPayments.map((u) => ({ kind: 'debt' as const, payment: u.payment, debt: u.debt, date: u.payment.dueDate })),
    ];
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [upcomingPlanned, upcomingDebtPayments]);

  const budgetAlerts = useMemo(() => {
    return budgets
      .map((b) => {
        const spent = transactions
          .filter((tx) => tx.type === 'expense' && tx.categoryId === b.categoryId)
          .filter((tx) => {
            const d = parseISO(tx.date);
            return d >= monthStart && d <= monthEnd;
          })
          .reduce((s, tx) => s + tx.amount, 0);
        const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
        const cat = categories.find((c) => c.id === b.categoryId);
        return { ...b, spent, pct, cat };
      })
      .filter((b) => b.pct >= 80)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, transactions, monthStart, monthEnd, categories]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const getCat = (id: string) => catMap.get(id);
  const getAcc = (id: string) => accMap.get(id);

  const sortedTx = useMemo(() => {
    return [...transactions]
      .filter((tx) => {
        if (tx.type === 'transfer' && tx.transferPeerId) {
          if (tx.transferRole === 'in') return false;
          if (tx.transferRole === 'out') return true;
          const peer = transactions.find((t) => t.id === tx.transferPeerId);
          if (!peer) return true;
          if (peer.createdAt !== tx.createdAt) return tx.createdAt > peer.createdAt;
          if (tx.description.startsWith('←')) return false;
          if (peer.description.startsWith('←')) return true;
          return tx.id > peer.id;
        }
        return true;
      })
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [transactions]);

  const allDebtPayments = useMemo(() =>
    debts.flatMap((debt) => debt.payments.map((p) => ({ payment: p, debt }))),
    [debts]
  );

  const allPlannedCompleted = useMemo(() =>
    plannedExpenses.flatMap((pe) =>
      pe.completedDates.map((d) => ({ expense: pe, date: d }))
    ),
    [plannedExpenses]
  );

  type UnifiedItem =
    | { kind: 'tx'; tx: Transaction; date: string; sortKey: string }
    | { kind: 'dp'; payment: DebtPayment; debt: Debt; date: string; sortKey: string }
    | { kind: 'pe'; expense: PlannedExpense; date: string; sortKey: string };

  const unifiedSorted = useMemo<UnifiedItem[]>(() => {
    const txItems: UnifiedItem[] = sortedTx.map((tx) => ({
      kind: 'tx', tx, date: tx.date, sortKey: tx.date + tx.createdAt,
    }));
    const dpItems: UnifiedItem[] = allDebtPayments.map(({ payment, debt }) => ({
      kind: 'dp', payment, debt, date: payment.date, sortKey: payment.date + payment.id,
    }));
    const peItems: UnifiedItem[] = allPlannedCompleted.map(({ expense, date }) => ({
      kind: 'pe', expense, date, sortKey: date + expense.id,
    }));
    return [...txItems, ...dpItems, ...peItems].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [sortedTx, allDebtPayments, allPlannedCompleted]);

  const accountItems = useMemo<UnifiedItem[]>(() => {
    if (!selectedAccountId) return [];
    const txItems: UnifiedItem[] = transactions
      .filter((tx) => tx.accountId === selectedAccountId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .map((tx) => ({ kind: 'tx', tx, date: tx.date, sortKey: tx.date + tx.createdAt }));
    const dpItems: UnifiedItem[] = allDebtPayments
      .filter(({ payment }) => payment.accountId === selectedAccountId)
      .map(({ payment, debt }) => ({ kind: 'dp', payment, debt, date: payment.date, sortKey: payment.date + payment.id }));
    const peItems: UnifiedItem[] = allPlannedCompleted
      .filter(({ expense }) => expense.accountId === selectedAccountId)
      .map(({ expense, date }) => ({ kind: 'pe', expense, date, sortKey: date + expense.id }));
    return [...txItems, ...dpItems, ...peItems].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [selectedAccountId, transactions, allDebtPayments, allPlannedCompleted]);

  const accountGrouped = useMemo(() => {
    const map = new Map<string, UnifiedItem[]>();
    for (const item of accountItems) {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date)!.push(item);
    }
    return Array.from(map.entries());
  }, [accountItems]);

  const LIMIT = 15;
  const displayItems = showAll ? unifiedSorted : unifiedSorted.slice(0, LIMIT);

  const grouped = useMemo(() => {
    const map = new Map<string, UnifiedItem[]>();
    for (const item of displayItems) {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date)!.push(item);
    }
    return Array.from(map.entries());
  }, [displayItems]);

  const formatDateLabel = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return t.today;
    if (isYesterday(d)) return language === 'ru' ? 'Вчера' : 'Yesterday';
    return format(d, language === 'ru' ? 'd MMM yyyy' : 'MMM d, yyyy');
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (language === 'ru') {
      if (h < 6) return 'Доброй ночи';
      if (h < 12) return 'Доброе утро';
      if (h < 18) return 'Добрый день';
      return 'Добрый вечер';
    }
    if (h < 6) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page-enter pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <p className="text-slate-400 text-sm">{greeting()} 👋</p>
          <h1 className="text-xl font-bold text-slate-100">{t.totalBalance}</h1>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 rounded-full flex items-center justify-center active-scale"
          style={{ background: '#1E1E38' }}
        >
          <Settings size={18} className="text-slate-400" />
        </button>
      </div>

      {/* Balance Hero */}
      <div className="mx-5 mb-5 p-5 rounded-3xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1A2744 0%, #0E1929 100%)',
          border: '1px solid #1E3A5F',
        }}>
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }} />
        <div className="absolute right-8 bottom-4 w-20 h-20 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #60A5FA, transparent)' }} />

        {totalMonthIncome - totalMonthExpense < 0 && (
          <div className="absolute top-5 right-5 z-10 text-right leading-snug">
            <p className="text-xs font-bold tracking-wide uppercase text-red-400">{t.fundsRunningLowLine1}</p>
            <p className="text-xs font-bold tracking-wide uppercase text-red-400">{t.fundsRunningLowLine2}</p>
          </div>
        )}

        <p className="text-slate-400 text-sm mb-1 relative z-10">{t.totalBalance}</p>
        <p className="text-4xl font-bold text-white mb-4 relative z-10">
          {formatAmount(accounts.reduce((s, a) => s + a.balance, 0), defaultCurrency as any)}
        </p>

        <div className="flex gap-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
              <TrendingUp size={16} color="#10B981" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">{t.income}</p>
              <p className="text-sm font-bold text-emerald-400">+{formatAmount(totalMonthIncome, defaultCurrency as any)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}>
              <TrendingDown size={16} color="#EF4444" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500">{t.expenses}</p>
              <p className="text-sm font-bold text-red-400">-{formatAmount(totalMonthExpense, defaultCurrency as any)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: totalMonthIncome - totalMonthExpense >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}>
              {totalMonthIncome - totalMonthExpense >= 0
                ? <TrendingUp size={16} color="#10B981" />
                : <TrendingDown size={16} color="#EF4444" />}
            </div>
            <div>
              <p className="text-[11px] text-slate-500">{language === 'ru' ? 'Итого' : 'Total'}</p>
              <p className={`text-sm font-bold ${totalMonthIncome - totalMonthExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalMonthIncome - totalMonthExpense >= 0 ? '+' : '-'}
                {formatAmount(Math.abs(totalMonthIncome - totalMonthExpense), defaultCurrency as any)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Quick View */}
      {accounts.length > 0 ? (
        <div className="mb-5">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">{t.accounts}</h2>
            <button onClick={() => navigate('/accounts')} className="text-blue-400 text-xs font-medium flex items-center gap-0.5">
              {t.seeAll} <ChevronRight size={13} />
            </button>
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto pb-1">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className="flex-shrink-0 rounded-2xl p-4 min-w-[150px] text-left active-scale"
                style={{
                  background: `linear-gradient(135deg, ${acc.color}20 0%, ${acc.color}08 100%)`,
                  border: `1px solid ${acc.color}30`,
                }}
              >
                <div className="text-2xl mb-2">{acc.icon}</div>
                <p className="text-[11px] text-slate-400">{acc.name}</p>
                <p className="text-base font-bold mt-0.5" style={{ color: acc.balance >= 0 ? '#F1F5F9' : '#EF4444' }}>
                  {formatAmount(acc.balance, acc.currency)}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-5 mb-5">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">{t.accounts}</h2>
            <button onClick={() => navigate('/accounts')} className="text-blue-400 text-xs font-medium flex items-center gap-0.5">
              {t.seeAll} <ChevronRight size={13} />
            </button>
          </div>
          <button
            onClick={() => navigate('/accounts')}
            className="w-full rounded-2xl p-5 flex items-center gap-4 active-scale"
            style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#1E1E38' }}>
              <span className="text-2xl">+</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-slate-200">
                {language === 'ru' ? 'Добавить счёт' : 'Add account'}
              </p>
              <p className="text-xs text-slate-500">
                {language === 'ru' ? 'Начните с создания счёта' : 'Start by creating an account'}
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-500 ml-auto" />
          </button>
        </div>
      )}

      {/* Upcoming Planned Payments */}
      <div className="mx-5 mb-5">
        <button
          className="flex items-center justify-between w-full mb-3 active-scale"
          onClick={() => setShowAllPlanned(true)}
        >
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            {language === 'ru' ? 'Ближайшие платежи' : 'Upcoming Payments'}
          </h2>
          {upcoming.length > 0 && (
            <span className="text-blue-400 text-xs font-medium flex items-center gap-0.5">
              {language === 'ru' ? `Все (${upcoming.length})` : `All (${upcoming.length})`}
              <ChevronRight size={13} />
            </span>
          )}
        </button>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl px-4 py-5 flex items-center gap-3"
            style={{ background: '#0E0E1C', border: '1px solid #1E2A40' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#1E2A4066' }}>
              <span className="text-lg">📅</span>
            </div>
            <p className="text-sm text-slate-500">
              {language === 'ru' ? 'Нет предстоящих платежей' : 'No upcoming payments'}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2A40' }}>
            {upcoming.slice(0, 2).map((item, idx) => (
              <UpcomingRow
                key={item.kind === 'planned' ? `p-${item.expense.id}-${item.date}` : `d-${item.payment.id}`}
                item={item as any}
                idx={idx}
                total={Math.min(upcoming.length, 2)}
                getCat={getCat as any}
                getAcc={getAcc as any}
                language={language}
                today={t.today}
                onMarkNoDeduction={item.kind === 'planned' ? (id: string, date: string) => markPlannedCompletedNoDeduction(id, date) : undefined}
                onTogglePlanned={item.kind === 'planned' ? (id: string, date: string) => togglePlannedCompleted(id, date) : undefined}
                onEditPlanned={item.kind === 'planned' ? (expense: PlannedExpense) => setEditingPe(expense) : undefined}
                onDeletePlanned={item.kind === 'planned' ? (id: string, date: string) => setDeletingPe({ id, date }) : undefined}
                onToggleDebtScheduled={item.kind === 'debt' ? (debtId: string, scheduledId: string, date: string) => {
                  const sp = item.payment;
                  if (sp.completedDates?.includes(date)) {
                    unmarkScheduledCompleted(debtId, scheduledId, date);
                  } else {
                    markScheduledCompletedNoDeduction(debtId, scheduledId, date);
                  }
                } : undefined}
                accounts={accounts}
                onPayDebtScheduled={item.kind === 'debt' ? (debtId: string, scheduledId: string, accountId: string) => markScheduledAsPaid(debtId, scheduledId, accountId) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <div className="mx-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              {language === 'ru' ? 'Бюджет' : 'Budget'}
            </h2>
            <button onClick={() => navigate('/budgets')} className="text-blue-400 text-xs font-medium flex items-center gap-0.5">
              {t.seeAll} <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-2">
            {budgetAlerts.slice(0, 3).map((b) => {
              const color = b.pct >= 100 ? '#EF4444' : b.pct >= 90 ? '#F59E0B' : '#3B82F6';
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer active-scale"
                  style={{ background: '#0E0E1C', border: `1px solid ${color}30` }}
                  onClick={() => navigate('/budgets')}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${b.cat?.color ?? '#94A3B8'}22` }}>
                    <span className="text-lg">{b.cat?.icon ?? '📊'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {language === 'ru' ? b.cat?.name : b.cat?.nameEn}
                      </p>
                      <span className="text-xs font-bold flex-shrink-0 ml-2" style={{ color }}>
                        {b.pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2A40' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(b.pct, 100)}%`, background: color }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {formatAmount(b.spent, defaultCurrency as any)} / {formatAmount(b.limit, defaultCurrency as any)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="mx-5">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">{t.recentTransactions}</h2>
        {unifiedSorted.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm">{t.noTransactions}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([dateStr, items]) => (
              <div key={dateStr}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
                  {formatDateLabel(dateStr)}
                </p>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2A40' }}>
                  {items.map((item, idx) => {
                    const borderBottom = idx < items.length - 1 ? '1px solid #1E2A40' : 'none';

                    if (item.kind === 'dp') {
                      const { payment, debt } = item;
                      const isLent = debt.direction === 'lent';
                      const acc = getAcc(payment.accountId);
                      const dpColor = isLent ? '#10B981' : '#EF4444';
                      return (
                        <div key={`dp-${payment.id}`} className="flex items-center gap-3 px-4 py-3"
                          style={{ background: '#0E0E1C', borderBottom }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: isLent ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
                            <span className="text-lg">{isLent ? '💸' : '🤝'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{debt.personName}</p>
                            <p className="text-xs text-slate-500">
                              {language === 'ru' ? 'Долг' : 'Debt'}
                              {payment.note ? ` · ${payment.note}` : ''}
                              {acc ? ` · ${acc.name}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-sm font-semibold" style={{ color: dpColor }}>
                              {isLent ? '+' : '-'}{formatAmount(payment.amount, debt.currency)}
                            </span>
                            <button onClick={() => setRevertingDebtPayment({ debtId: debt.id, paymentId: payment.id })}
                              className="w-11 h-11 rounded-xl flex items-center justify-center active-scale"
                              style={{ background: '#1E1E38' }}>
                              <RotateCcw size={14} color="#F59E0B" />
                            </button>
                            <button onClick={() => setEditingDebtPayment({ payment, debt })}
                              className="w-11 h-11 rounded-xl flex items-center justify-center active-scale"
                              style={{ background: '#1E1E38' }}>
                              <Pencil size={14} color="#94A3B8" />
                            </button>
                            <button onClick={() => setDeletingDebtPayment({ debtId: debt.id, paymentId: payment.id })}
                              className="w-11 h-11 rounded-xl flex items-center justify-center active-scale"
                              style={{ background: '#1E1E38' }}>
                              <Trash2 size={14} color="#EF4444" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (item.kind === 'pe') {
                      const { expense: pe } = item;
                      const isIncome = pe.type === 'income';
                      const cat = getCat(pe.categoryId);
                      const acc = getAcc(pe.accountId);
                      const peColor = isIncome ? '#10B981' : '#EF4444';
                      return (
                        <div key={`pe-${pe.id}-${item.date}`} className="flex items-center gap-3 px-4 py-3"
                          style={{ background: '#0E0E1C', borderBottom }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${cat?.color ?? '#94A3B8'}22` }}>
                            <span className="text-lg">{cat?.icon ?? '🔁'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">
                              {pe.description || (language === 'ru' ? cat?.name : cat?.nameEn) || '—'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {acc?.name}{pe.recurring ? ` · 🔁 ${language === 'ru' ? 'повтор' : 'recurring'}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-sm font-semibold" style={{ color: peColor }}>
                              {isIncome ? '+' : '-'}{formatAmount(pe.amount, pe.currency)}
                            </span>
                            <button onClick={() => togglePlannedCompleted(pe.id, item.date)}
                              className="w-11 h-11 rounded-xl flex items-center justify-center active-scale opacity-80"
                              style={{ background: '#1E1E38' }}>
                              <RotateCcw size={14} color="#F59E0B" />
                            </button>
                            <button onClick={() => setEditingPe(pe)}
                              className="w-11 h-11 rounded-xl flex items-center justify-center active-scale opacity-80"
                              style={{ background: '#1E1E38' }}>
                              <Pencil size={14} color="#94A3B8" />
                            </button>
                            <button onClick={() => setDeletingPe({ id: pe.id, date: item.date })}
                              className="w-11 h-11 rounded-xl flex items-center justify-center active-scale opacity-80"
                              style={{ background: '#1E1E38' }}>
                              <Trash2 size={14} color="#EF4444" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const { tx } = item;
                    const isTransfer = tx.type === 'transfer';
                    const cat = getCat(tx.categoryId);
                    const acc = getAcc(tx.accountId);
                    const peerAcc = isTransfer && tx.transferPeerAccountId ? getAcc(tx.transferPeerAccountId) : null;
                    const txColor = isTransfer ? '#3B82F6' : tx.type === 'income' ? '#10B981' : '#EF4444';
                    const peerTx = isTransfer ? transactions.find((t) => t.id === tx.transferPeerId) : null;
                    return (
                      <div key={`tx-${tx.id}`} className="flex items-center gap-3 px-4 py-3"
                        style={{ background: '#0E0E1C', borderBottom }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: isTransfer ? 'rgba(59,130,246,0.15)' : `${cat?.color ?? '#94A3B8'}22` }}>
                          {isTransfer
                            ? <ArrowLeftRight size={16} color="#3B82F6" />
                            : <span className="text-lg">{cat?.icon ?? '📌'}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">
                            {isTransfer
                              ? `${acc?.name ?? '?'} → ${peerAcc?.name ?? '?'}`
                              : (tx.description || (language === 'ru' ? cat?.name : cat?.nameEn) || '—')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {isTransfer
                              ? (tx.description || (language === 'ru' ? 'Перевод' : 'Transfer'))
                              : acc?.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isTransfer ? (
                            <div className="text-right">
                              <p className="text-sm font-semibold" style={{ color: txColor }}>
                                -{formatAmount(tx.amount, tx.currency)}
                              </p>
                              {peerTx && peerTx.currency !== tx.currency && (
                                <p className="text-[10px] text-slate-500">+{formatAmount(peerTx.amount, peerTx.currency)}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm font-semibold" style={{ color: txColor }}>
                              {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, tx.currency)}
                            </span>
                          )}
                          {!isTransfer && (
                            <button onClick={() => setReversingTx(tx)}
                              className="w-11 h-11 rounded-xl flex items-center justify-center active-scale"
                              style={{ background: '#1E1E38' }}>
                              <RotateCcw size={14} color="#F59E0B" />
                            </button>
                          )}
                          <button onClick={() => isTransfer ? setEditingTransfer(tx) : setEditingTx(tx)}
                            className="w-11 h-11 rounded-xl flex items-center justify-center active-scale"
                            style={{ background: '#1E1E38' }}>
                            <Pencil size={14} color="#94A3B8" />
                          </button>
                          <button onClick={() => setDeletingId(tx.id)}
                            className="w-11 h-11 rounded-xl flex items-center justify-center active-scale"
                            style={{ background: '#1E1E38' }}>
                            <Trash2 size={14} color="#EF4444" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {unifiedSorted.length > LIMIT && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="w-full py-3 rounded-2xl text-sm font-medium text-blue-400 active-scale"
                style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
              >
                {showAll
                  ? (language === 'ru' ? 'Свернуть' : 'Show less')
                  : (language === 'ru' ? `Показать все (${unifiedSorted.length})` : `Show all (${unifiedSorted.length})`)}
              </button>
            )}
          </div>
        )}
      </div>

      {/* All Planned Payments Modal */}
      <Modal isOpen={showAllPlanned} onClose={() => setShowAllPlanned(false)}
        title={language === 'ru' ? 'Запланированные платежи' : 'Planned Payments'} fullHeight>
        <div className="px-5 pb-6">
          {upcoming.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-sm">{language === 'ru' ? 'Нет предстоящих платежей' : 'No upcoming payments'}</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2A40' }}>
              {upcoming.map((item, idx) => (
                <UpcomingRow
                  key={item.kind === 'planned' ? `pm-${item.expense.id}-${item.date}` : `dm-${item.payment.id}`}
                  item={item as any}
                  idx={idx}
                  total={upcoming.length}
                  getCat={getCat as any}
                  getAcc={getAcc as any}
                  language={language}
                  today={t.today}
                  showDaysUntil
                  onMarkNoDeduction={item.kind === 'planned' ? (id: string, date: string) => markPlannedCompletedNoDeduction(id, date) : undefined}
                  onTogglePlanned={item.kind === 'planned' ? (id: string, date: string) => togglePlannedCompleted(id, date) : undefined}
                  onEditPlanned={item.kind === 'planned' ? (expense: PlannedExpense) => { setEditingPe(expense); setShowAllPlanned(false); } : undefined}
                  onDeletePlanned={item.kind === 'planned' ? (id: string, date: string) => setDeletingPe({ id, date }) : undefined}
                  onToggleDebtScheduled={item.kind === 'debt' ? (debtId: string, scheduledId: string, date: string) => {
                    const sp = item.payment;
                    if (sp.completedDates?.includes(date)) {
                      unmarkScheduledCompleted(debtId, scheduledId, date);
                    } else {
                      markScheduledCompletedNoDeduction(debtId, scheduledId, date);
                    }
                  } : undefined}
                  accounts={accounts}
                  onPayDebtScheduled={item.kind === 'debt' ? (debtId: string, scheduledId: string, accountId: string) => markScheduledAsPaid(debtId, scheduledId, accountId) : undefined}
                />
              ))}
            </div>
          )}
          <button
            onClick={() => { setShowAllPlanned(false); navigate('/calendar'); }}
            className="w-full mt-4 py-3 rounded-2xl font-medium text-slate-300 active-scale text-sm"
            style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}
          >
            {language === 'ru' ? 'Открыть календарь' : 'Open Calendar'}
          </button>
        </div>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal isOpen={!!editingTx} onClose={() => setEditingTx(null)}
        title={language === 'ru' ? 'Редактировать операцию' : 'Edit Transaction'} fullHeight>
        {editingTx && <TransactionForm key={editingTx.id} editingTx={editingTx} onClose={() => setEditingTx(null)} />}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru'
              ? 'Транзакция будет удалена, а баланс счёта пересчитан.'
              : 'Transaction will be deleted and account balance recalculated.'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingId(null)}
              className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
              {t.cancel}
            </button>
            <button
              onClick={() => { if (deletingId) { deleteTransaction(deletingId); setDeletingId(null); } }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Debt Payment Modal */}
      <Modal isOpen={!!editingDebtPayment} onClose={() => setEditingDebtPayment(null)}
        title={language === 'ru' ? 'Редактировать платёж' : 'Edit Payment'} fullHeight>
        {editingDebtPayment && (
          <EditDebtPaymentForm debt={editingDebtPayment.debt} payment={editingDebtPayment.payment}
            onClose={() => setEditingDebtPayment(null)} />
        )}
      </Modal>

      {/* Revert Debt Payment */}
      {(() => {
        const dp = revertingDebtPayment
          ? debts.find((d) => d.id === revertingDebtPayment.debtId)?.payments.find((p) => p.id === revertingDebtPayment.paymentId)
          : null;
        const hasScheduled = !!dp?.scheduledPaymentDueDate;
        return (
          <Modal isOpen={!!revertingDebtPayment} onClose={() => setRevertingDebtPayment(null)}
            title={language === 'ru' ? 'Отметить невыполненным?' : 'Mark as not completed?'}>
            <div className="px-5 pb-6">
              <p className="text-slate-400 text-sm mb-5">
                {language === 'ru'
                  ? hasScheduled
                    ? 'Платёж будет отмечен как невыполненный, баланс восстановлен, а запланированный платёж вернётся в календарь.'
                    : 'Платёж будет отмечен как невыполненный, баланс счёта будет восстановлен.'
                  : hasScheduled
                    ? 'The payment will be marked as not completed, balance restored, and the scheduled payment will return to the calendar.'
                    : 'The payment will be marked as not completed and the account balance will be restored.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRevertingDebtPayment(null)}
                  className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
                  style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
                  {t.cancel}
                </button>
                <button
                  onClick={() => {
                    if (revertingDebtPayment) {
                      revertDebtPaymentToScheduled(revertingDebtPayment.debtId, revertingDebtPayment.paymentId);
                      setRevertingDebtPayment(null);
                    }
                  }}
                  className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
                  style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                  {language === 'ru' ? 'Вернуть' : 'Return'}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Delete Debt Payment */}
      <Modal isOpen={!!deletingDebtPayment} onClose={() => setDeletingDebtPayment(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru'
              ? 'Платёж будет удалён, а баланс счёта пересчитан.'
              : 'Payment will be deleted and account balance recalculated.'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingDebtPayment(null)}
              className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
              {t.cancel}
            </button>
            <button
              onClick={() => {
                if (deletingDebtPayment) {
                  deleteDebtPayment(deletingDebtPayment.debtId, deletingDebtPayment.paymentId);
                  setDeletingDebtPayment(null);
                }
              }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>

      {/* Account Detail Modal */}
      {(() => {
        const acc = accounts.find((a) => a.id === selectedAccountId);
        if (!acc) return null;
        return (
          <Modal isOpen={!!selectedAccountId} onClose={() => setSelectedAccountId(null)}
            title={`${acc.icon} ${acc.name}`} fullHeight>
            <div className="px-5 pb-8">
              <div className="rounded-2xl p-4 mb-5 flex items-center gap-4"
                style={{
                  background: `linear-gradient(135deg, ${acc.color}18 0%, ${acc.color}08 100%)`,
                  border: `1px solid ${acc.color}30`,
                }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${acc.color}25` }}>
                  <span className="text-2xl">{acc.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">{language === 'ru' ? 'Баланс' : 'Balance'}</p>
                  <p className="text-2xl font-bold" style={{ color: acc.balance >= 0 ? '#F1F5F9' : '#EF4444' }}>
                    {formatAmount(acc.balance, acc.currency)}
                  </p>
                </div>
              </div>
              {accountItems.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-sm">{t.noTransactions}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accountGrouped.map(([dateStr, items]) => (
                    <div key={dateStr}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
                        {formatDateLabel(dateStr)}
                      </p>
                      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2A40' }}>
                        {items.map((item, idx) => {
                          const borderBottom = idx < items.length - 1 ? '1px solid #1E2A40' : 'none';
                          if (item.kind === 'dp') {
                            const { payment, debt } = item;
                            const isLent = debt.direction === 'lent';
                            return (
                              <div key={`dp-${payment.id}`} className="flex items-center gap-3 px-4 py-3"
                                style={{ background: '#0E0E1C', borderBottom }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: isLent ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
                                  <span className="text-lg">{isLent ? '💸' : '🤝'}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-200 truncate">{debt.personName}</p>
                                  <p className="text-xs text-slate-500">{language === 'ru' ? 'Долг' : 'Debt'}{payment.note ? ` · ${payment.note}` : ''}</p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="text-sm font-semibold" style={{ color: isLent ? '#10B981' : '#EF4444' }}>
                                    {isLent ? '+' : '-'}{formatAmount(payment.amount, debt.currency)}
                                  </span>
                                  <button onClick={() => setEditingDebtPayment({ payment, debt })}
                                    className="w-11 h-11 rounded-xl flex items-center justify-center active-scale opacity-80"
                                    style={{ background: '#1E1E38' }}>
                                    <Pencil size={14} color="#94A3B8" />
                                  </button>
                                  <button onClick={() => setDeletingDebtPayment({ debtId: debt.id, paymentId: payment.id })}
                                    className="w-11 h-11 rounded-xl flex items-center justify-center active-scale opacity-80"
                                    style={{ background: '#1E1E38' }}>
                                    <Trash2 size={14} color="#EF4444" />
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          if (item.kind === 'pe') {
                            const { expense: pe } = item;
                            const isIncome = pe.type === 'income';
                            const cat = getCat(pe.categoryId);
                            return (
                              <div key={`pe-${pe.id}-${item.date}`} className="flex items-center gap-3 px-4 py-3"
                                style={{ background: '#0E0E1C', borderBottom }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: `${cat?.color ?? '#94A3B8'}22` }}>
                                  <span className="text-lg">{cat?.icon ?? '🔁'}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-200 truncate">{pe.description || (language === 'ru' ? cat?.name : cat?.nameEn) || '—'}</p>
                                  <p className="text-xs text-slate-500">{pe.recurring ? `🔁 ${language === 'ru' ? 'повтор' : 'recurring'}` : (language === 'ru' ? 'Запланировано' : 'Planned')}</p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="text-sm font-semibold" style={{ color: isIncome ? '#10B981' : '#EF4444' }}>
                                    {isIncome ? '+' : '-'}{formatAmount(pe.amount, pe.currency)}
                                  </span>
                                  <button onClick={() => setEditingPe(pe)}
                                    className="w-11 h-11 rounded-lg flex items-center justify-center active-scale opacity-80"
                                    style={{ background: '#1E1E38' }}>
                                    <Pencil size={14} color="#94A3B8" />
                                  </button>
                                  <button onClick={() => togglePlannedCompleted(pe.id, item.date)}
                                    className="w-11 h-11 rounded-lg flex items-center justify-center active-scale opacity-80"
                                    style={{ background: '#1E1E38' }}>
                                    <RefreshCw size={14} color="#F59E0B" />
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          const { tx } = item;
                          const isTransfer = tx.type === 'transfer';
                          const cat = getCat(tx.categoryId);
                          const isIncoming = isTransfer && tx.transferRole === 'in';
                          const peerAccId = tx.transferPeerAccountId;
                          const peerAcc = peerAccId ? getAcc(peerAccId) : null;
                          const txColor = isTransfer ? (isIncoming ? '#10B981' : '#3B82F6') : tx.type === 'income' ? '#10B981' : '#EF4444';
                          const peerTxForAcc = isTransfer ? transactions.find((t) => t.id === tx.transferPeerId) : null;
                          return (
                            <div key={`tx-${tx.id}`} className="flex items-center gap-3 px-4 py-3"
                              style={{ background: '#0E0E1C', borderBottom }}>
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: isTransfer ? 'rgba(59,130,246,0.15)' : `${cat?.color ?? '#94A3B8'}22` }}>
                                {isTransfer ? <ArrowLeftRight size={16} color={isIncoming ? '#10B981' : '#3B82F6'} /> : <span className="text-lg">{cat?.icon ?? '📌'}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate">
                                  {isTransfer ? (isIncoming ? `← ${peerAcc?.name ?? '?'}` : `→ ${peerAcc?.name ?? '?'}`) : (tx.description || (language === 'ru' ? cat?.name : cat?.nameEn) || '—')}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {isTransfer ? ((tx.description.startsWith('→') || tx.description.startsWith('←') ? '' : tx.description) || (language === 'ru' ? 'Перевод' : 'Transfer')) : acc.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isTransfer ? (
                                  <div className="text-right">
                                    <p className="text-sm font-semibold" style={{ color: txColor }}>
                                      {isIncoming ? '+' : '-'}{formatAmount(tx.amount, tx.currency)}
                                    </p>
                                    {peerTxForAcc && peerTxForAcc.currency !== tx.currency && (
                                      <p className="text-[10px] text-slate-500">
                                        {isIncoming ? '-' : '+'}{formatAmount(peerTxForAcc.amount, peerTxForAcc.currency)}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm font-semibold" style={{ color: txColor }}>
                                    {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount, tx.currency)}
                                  </span>
                                )}
                                <button
                                  onClick={() => isTransfer ? setEditingTransfer(isIncoming ? (peerTxForAcc ?? tx) : tx) : setEditingTx(tx)}
                                  className="w-11 h-11 rounded-lg flex items-center justify-center active-scale opacity-80"
                                  style={{ background: '#1E1E38' }}>
                                  <Pencil size={14} color="#94A3B8" />
                                </button>
                                <button
                                  onClick={() => {
                                    const delId = isTransfer && isIncoming && peerTxForAcc ? peerTxForAcc.id : tx.id;
                                    setDeletingId(delId);
                                  }}
                                  className="w-11 h-11 rounded-lg flex items-center justify-center active-scale opacity-80"
                                  style={{ background: '#1E1E38' }}>
                                  <Trash2 size={14} color="#EF4444" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* Edit Transfer Modal */}
      <Modal isOpen={!!editingTransfer} onClose={() => setEditingTransfer(null)}
        title={language === 'ru' ? 'Редактировать перевод' : 'Edit Transfer'} fullHeight>
        {editingTransfer && <TransferForm key={editingTransfer.id} editingTx={editingTransfer} onClose={() => setEditingTransfer(null)} />}
      </Modal>

      {/* Edit Planned Expense Modal */}
      <Modal isOpen={!!editingPe} onClose={() => setEditingPe(null)}
        title={language === 'ru' ? 'Редактировать шаблон' : 'Edit Template'} fullHeight>
        {editingPe && <PlannedExpenseForm key={editingPe.id} expense={editingPe} onClose={() => setEditingPe(null)} />}
      </Modal>

      {/* Reversal Confirm */}
      <Modal isOpen={!!reversingTx} onClose={() => setReversingTx(null)}
        title={language === 'ru' ? 'Создать возврат?' : 'Create Reversal?'}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru'
              ? `Будет создана обратная транзакция: ${reversingTx?.type === 'income' ? 'расход' : 'доход'} ${reversingTx ? formatAmount(reversingTx.amount, reversingTx.currency) : ''}`
              : `A reverse transaction will be created: ${reversingTx?.type === 'income' ? 'expense' : 'income'} ${reversingTx ? formatAmount(reversingTx.amount, reversingTx.currency) : ''}`}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setReversingTx(null)}
              className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
              {t.cancel}
            </button>
            <button
              onClick={() => {
                if (reversingTx) {
                  addTransaction({
                    accountId: reversingTx.accountId,
                    type: reversingTx.type === 'income' ? 'expense' : 'income',
                    amount: reversingTx.amount,
                    currency: reversingTx.currency,
                    categoryId: reversingTx.categoryId,
                    description: (language === 'ru' ? 'Возврат: ' : 'Return: ') + reversingTx.description,
                    date: format(new Date(), 'yyyy-MM-dd'),
                  });
                  setReversingTx(null);
                }
              }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
              {language === 'ru' ? 'Создать возврат' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Planned Expense */}
      <Modal isOpen={!!deletingPe} onClose={() => setDeletingPe(null)} title={t.areYouSure}>
        <div className="px-5 pb-6">
          <p className="text-slate-400 text-sm mb-5">
            {language === 'ru'
              ? 'Плановая операция и все её повторения будут удалены.'
              : 'The planned operation and all its recurrences will be deleted.'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeletingPe(null)}
              className="flex-1 py-3 rounded-2xl font-medium text-slate-300 active-scale"
              style={{ background: '#1E1E38', border: '1px solid #1E2A40' }}>
              {t.cancel}
            </button>
            <button
              onClick={() => { if (deletingPe) { deletePlannedExpense(deletingPe.id); setDeletingPe(null); } }}
              className="flex-1 py-3 rounded-2xl font-semibold text-white active-scale"
              style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
              {t.delete}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
